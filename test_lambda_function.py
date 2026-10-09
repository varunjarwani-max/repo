import importlib
import io
import json
import os
import struct
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

# The sandbox has no AWS SDK; tests replace transport only, never the handler logic.
try:
    import boto3
except ModuleNotFoundError:
    sys.modules['boto3'] = types.SimpleNamespace(client=MagicMock())
    sys.modules['botocore'] = types.ModuleType('botocore')
    sys.modules['botocore.config'] = types.SimpleNamespace(Config=lambda **kwargs: kwargs)
    class ClientError(Exception):
        def __init__(self, response, operation):
            self.response = response
            super().__init__(operation)
    sys.modules['botocore.exceptions'] = types.SimpleNamespace(ClientError=ClientError)

handler = importlib.import_module('lambda_function')


class ScanTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'UPLOAD_BUCKET': 'test-private-bucket', 'ALLOWED_ORIGIN': 'https://demo.example', 'BEDROCK_MODEL_ID': 'amazon.nova-lite-v1:0'})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.s3, self.bedrock = MagicMock(), MagicMock()
        self.clients = patch.object(handler, 'aws_client', side_effect=lambda service: self.s3 if service == 's3' else self.bedrock)
        self.clients.start()
        self.addCleanup(self.clients.stop)
        self.key = 'uploads/' + 'a' * 32 + '.jpg'
        self.raw_item = {'label': 'Bottle', 'material': 'PET', 'category': 'recyclable', 'confidence': 0.54, 'weightGrams': 25, 'estimatedValueInr': {'min': 1, 'max': 2}, 'bbox': [100, 200, 400, 800], 'whyReason': 'Visible bottle shape', 'actionRequired': 'Confirm local recycling acceptance'}
        self.jpeg = b'\xff\xd8\xff\xc0' + struct.pack('>H', 8) + b'\x08' + struct.pack('>HH', 600, 400) + b'\x03'

    def event(self, path, body, origin='https://demo.example'):
        return {'rawPath': path, 'requestContext': {'http': {'method': 'POST'}}, 'headers': {'origin': origin}, 'body': json.dumps(body)}

    def prepare_scan(self, output=None):
        missing = handler.ClientError({'Error': {'Code': 'NoSuchKey'}}, 'GetObject')
        self.s3.get_object.side_effect = [missing, {'Body': io.BytesIO(self.jpeg)}]
        self.s3.head_object.return_value = {'ContentLength': len(self.jpeg), 'ContentType': 'image/jpeg'}
        self.bedrock.converse.return_value = {'stopReason': 'end_turn', 'output': {'message': {'content': [{'text': json.dumps(output if output is not None else {'items': [self.raw_item]})}]}}}

    def test_upload_policy_is_private_bounded_and_expiring(self):
        self.s3.generate_presigned_post.return_value = {'url': 'https://s3.example', 'fields': {}}
        result = handler.lambda_handler(self.event('/upload', {'contentType': 'image/jpeg', 'size': 200}), None)
        self.assertEqual(result['statusCode'], 200)
        arguments = self.s3.generate_presigned_post.call_args.kwargs
        self.assertEqual(arguments['ExpiresIn'], 300)
        self.assertIn(['content-length-range', 200, 200], arguments['Conditions'])
        self.assertRegex(arguments['Key'], r'^uploads/[a-f0-9]{32}\.jpg$')

    def test_scan_reads_photo_calls_vision_and_returns_ui_contract(self):
        self.prepare_scan()
        result = handler.lambda_handler(self.event('/scan', {'imageKey': self.key}), None)
        self.assertEqual(result['statusCode'], 200)
        scan = json.loads(result['body'])
        self.assertEqual(scan['source'], 'live')
        self.assertEqual((scan['imageWidth'], scan['imageHeight']), (400, 600))
        self.assertEqual(scan['imageKey'], self.key)
        self.assertAlmostEqual(scan['items'][0]['bbox']['height'], 0.6)
        self.assertEqual(self.bedrock.converse.call_args.kwargs['messages'][0]['content'][0]['image']['source']['bytes'], self.jpeg)
        self.s3.put_object.assert_called_once()

    def test_cached_scan_does_not_repeat_model_call(self):
        self.s3.get_object.return_value = {'Body': io.BytesIO(json.dumps({'source': 'live', 'imageKey': self.key}).encode())}
        self.assertEqual(handler.lambda_handler(self.event('/scan', {'imageKey': self.key}), None)['statusCode'], 200)
        self.bedrock.converse.assert_not_called()

    def test_invalid_key_and_origin_are_rejected(self):
        self.assertEqual(handler.lambda_handler(self.event('/scan', {'imageKey': '../../secret'}), None)['statusCode'], 422)
        self.assertEqual(handler.lambda_handler(self.event('/upload', {}, 'https://other.example'), None)['statusCode'], 403)
        self.bedrock.converse.assert_not_called()

    def test_invalid_model_geometry_does_not_become_live_data(self):
        self.raw_item['bbox'] = [500, 200, 100, 300]
        self.prepare_scan()
        self.assertEqual(handler.lambda_handler(self.event('/scan', {'imageKey': self.key}), None)['statusCode'], 422)
        self.s3.put_object.assert_not_called()

    def test_empty_detection_is_a_valid_live_scan(self):
        self.prepare_scan({'items': []})
        result = handler.lambda_handler(self.event('/scan', {'imageKey': self.key}), None)
        self.assertEqual(result['statusCode'], 200)
        self.assertEqual(json.loads(result['body'])['items'], [])

    def test_model_failure_is_safe_and_retryable(self):
        self.prepare_scan()
        self.bedrock.converse.side_effect = RuntimeError('private provider detail')
        result = handler.lambda_handler(self.event('/scan', {'imageKey': self.key}), None)
        self.assertEqual(result['statusCode'], 503)
        self.assertNotIn('private provider detail', result['body'])

    def test_hazards_have_no_value_and_no_model_invented_procedure(self):
        self.raw_item['category'] = 'hazardous'
        self.raw_item['actionRequired'] = 'Invented safety procedure'
        item = handler.normalize_items({'items': [self.raw_item]}, 'scan')[0]
        self.assertTrue(item['isHazardous'])
        self.assertIsNone(item['estimatedValueInr'])
        self.assertNotIn('Invented', item['actionRequired'])

    def test_nonfinite_numbers_and_invalid_jpeg_are_rejected(self):
        self.raw_item['confidence'] = float('nan')
        with self.assertRaises(ValueError):
            handler.normalize_items({'items': [self.raw_item]}, 'scan')
        with self.assertRaises(ValueError):
            handler.jpeg_dimensions(b'not an image')


if __name__ == '__main__':
    unittest.main()
