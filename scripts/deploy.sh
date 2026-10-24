#!/bin/sh
# Builds and deploys one environment: the API as a Lambda zip, the site to S3.
# Usage: scripts/deploy.sh <lambda-function> <site-bucket> <distribution-id>
# Infrastructure changes are applied by hand with Terraform, not here.
set -eu
export AWS_REGION="${AWS_REGION:-eu-central-1}"
function=$1 bucket=$2 distribution=$3
root=$(cd "$(dirname "$0")/.." && pwd)
build=$(mktemp -d)
trap 'rm -rf "$build"' EXIT

# API: Linux arm64 wheels for Lambda's Python 3.12, the app, its start script.
(cd "$root/api" && uv export --frozen --no-dev --no-emit-project --format requirements-txt) > "$build/requirements.txt"
uv pip install --quiet --target "$build/api" --python-platform aarch64-manylinux_2_28 \
  --python-version 3.12 --only-binary :all: -r "$build/requirements.txt"
cp -R "$root/api/app" "$root/api/run.sh" "$build/api/"
# boto3 ships with Lambda's Python runtime; leaving it out keeps the zip under
# the 50 MB direct-upload limit.
(cd "$build/api" && zip -qr "$build/api.zip" . -x '*__pycache__*' \
  'boto3/*' 'boto3-*' 'botocore/*' 'botocore-*' 's3transfer/*' 's3transfer-*')
echo "api.zip: $(du -h "$build/api.zip" | cut -f1)"
aws lambda update-function-code --function-name "$function" --zip-file "fileb://$build/api.zip" >/dev/null
aws lambda wait function-updated-v2 --function-name "$function"

# Site: prerendered pages to S3, then drop CloudFront's cached copies. Hashed bundles never
# change; pages revalidate; the models go up brotli-compressed and keep for a day.
(cd "$root/web" && pnpm build && node --experimental-strip-types --no-warnings scripts/compress-models.ts)
site="$root/web/dist/client"
aws s3 sync "$site" "s3://$bucket" --delete --exclude 'assets/*' --exclude 'models/*' \
  --cache-control 'no-cache'
aws s3 sync "$site/assets" "s3://$bucket/assets" --delete \
  --cache-control 'public, max-age=31536000, immutable'
aws s3 sync "$site/models" "s3://$bucket/models" --delete --content-encoding br \
  --content-type model/gltf-binary --cache-control 'public, max-age=86400'
aws cloudfront create-invalidation --distribution-id "$distribution" --paths '/*' >/dev/null
echo "deployed $function"
