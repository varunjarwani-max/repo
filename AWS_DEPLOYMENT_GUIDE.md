# EcoScan AWS deployment and verification

## Status

The repository contains a working demo frontend and an AWS backend implementation. **It is not proof of deployment.** No AWS account credentials, running API endpoint or Amplify public URL were available during this phase. Offline contract tests replace AWS transport and do not count as real S3 uploads or model invocations.

## Current architecture

1. The browser decodes a JPG, PNG or WebP (input limit 10 MB), resizes it to at most 1568 pixels per side and converts it to JPEG (maximum 3.5 MB).
2. `POST /upload` returns an expiring, size-bound presigned S3 POST.
3. The browser uploads the prepared JPEG directly to a private S3 bucket.
4. `POST /scan` sends only the returned image key. Lambda validates the JPEG and reads its actual dimensions, calls Bedrock Converse with image bytes and validates the model output.
5. Lambda returns the active TypeScript `ScanResult` format and caches the result privately in S3. The frontend applies its canonical bin mapping and generates local photo crops.
6. Only a validated successful photo scan enables **Live backend**. Missing configuration, HTTP failures, model failures, malformed output and timeouts restore the illustrated demo pile with an explicit fallback notice.

There are no AWS credentials or provider keys in browser code. The existing Gemini/Node legacy files are not used by the active React scan pipeline. This Lambda replaces the old pipe-delimited Gemini response.

## Deployment resources

`template.yaml` defines the private encrypted S3 bucket, HTTPS-only bucket policy, API Gateway HTTP routes, exact-origin CORS, Lambda role, bounded concurrency/throttling and one-day object lifecycle. This is a public hackathon demo endpoint: Origin/CORS checks are **not authentication** and can be spoofed outside a browser. Monitor spend, set an AWS budget alert and disable the API when the demonstration ends. Add real authentication and per-user object ownership before production use. Cached retries avoid repeated calls after a completed result, but simultaneous requests can still duplicate inference.

The Lambda uses the Python runtime's bundled boto3; no npm or Python dependency installation was added. `package_lambda.py` creates `.aws-build/lambda.zip` containing only `lambda_function.py`, the archive referenced by SAM. Generated archives are ignored by Git.

To deploy from an AWS-enabled development environment, package the handler, then deploy `template.yaml` with AWS SAM using `CAPABILITY_IAM`. Use **us-east-1** and verify that the account can invoke the in-region `amazon.nova-lite-v1:0` vision model. The model is configurable only to the listed allowed value so IAM remains narrowly scoped. Do not deploy until account access and permission to create billable resources are confirmed.

### Amplify Console setup

1. Connect the GitHub repository and the desired branch through Amplify Hosting. `amplify.yml` builds the Vite frontend with `npm ci` and publishes `dist`.
2. Copy the resulting exact HTTPS origin (no path or trailing slash) into the backend's `AllowedOrigin` parameter. Deploy the backend.
3. Set the backend stack's `ApiUrl` output as **VITE_API_URL** in Amplify's frontend environment variables. This is a public API URL, not a secret. Rebuild the frontend after changing it.
4. In Amplify **Hosting → Rewrites and redirects**, paste the rules from `amplify-rewrites.json`. These rules preserve static asset requests while serving `/index.html` for SPA routes including `/audit`. Amplify does not read the Netlify-style `public/_redirects` file.
5. Keep Amplify, Lambda and bucket in the intended AWS region; verify exact-origin CORS from the deployed site rather than from a different preview origin.

## Acceptance evidence required before submission

- A public Amplify URL loads both `/scan` and a direct fresh visit to `/audit` without a 404.
- Upload one photo of **real waste**, then see **Live backend**, photo crops and correctly aligned numbered boxes. No fixture or demo scene counts as this test.
- In S3, confirm a private `uploads/…jpg` object. In Lambda/CloudWatch or Bedrock usage, confirm a successful model invocation; capture the returned scan ID/model version as evidence.
- Export audit CSV and inspect its source label, estimated weights, value range, hazardous count and item rows. PDF export uses the browser print dialog and Save as PDF.
- Disable the endpoint temporarily and repeat an upload: the app must show **Demo data — backend unavailable** and the illustrated demo scene, not mock boxes over the real photo.
- Test at 390px and verify item category/bin text, hazard warnings and the persistent visible-surface notice.

## Explicitly not included in this phase

DynamoDB history, persisted user corrections, live EcoBot/Bedrock chat, language switching, measured accuracy, comparison, real trend charts and shareable reports. Sites remains labelled demo history. JSON output is untested on robots; live masks and grasp points are derived from boxes. All image-based weights and monetary estimates remain unvalidated.

AWS references: [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html), [Nova Lite model](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-lite.html), [Amplify SPA rewrites](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html).
