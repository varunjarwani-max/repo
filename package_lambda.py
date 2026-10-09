from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent
output = root / '.aws-build' / 'lambda.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as package:
    package.write(root / 'lambda_function.py', 'lambda_function.py')
print(f'Packaged Lambda handler: {output}')
