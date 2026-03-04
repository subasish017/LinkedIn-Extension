#!/usr/bin/env bash
set -euo pipefail

# Package the Chrome extension for Web Store upload
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXT_DIR="$PROJECT_ROOT/extension"
OUT_FILE="$PROJECT_ROOT/linkedin-profile-analyzer.zip"

if [ ! -d "$EXT_DIR" ]; then
  echo "Error: extension/ directory not found at $EXT_DIR"
  exit 1
fi

# Remove old zip if it exists
rm -f "$OUT_FILE"

cd "$EXT_DIR"
zip -r "$OUT_FILE" . \
  -x "*.DS_Store" \
  -x "__MACOSX/*" \
  -x "*.map" \
  -x ".git/*"

echo "Extension packaged: $OUT_FILE"
echo "Upload this file to the Chrome Web Store developer dashboard."
