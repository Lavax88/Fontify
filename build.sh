#!/bin/bash
# Fontify - Package Build Script
# Author: Lava

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODULE_NAME="Fontify"
VERSION="v1.0.0"
OUTPUT_ZIP="${MODULE_NAME}-${VERSION}.zip"

echo "======================================"
echo " Building ${OUTPUT_ZIP} "
echo " Author: Lava "
echo "======================================"

# Ensure permissions
chmod +x customize.sh uninstall.sh service.sh post-fs-data.sh 2>/dev/null || true
chmod +x bin/*.sh 2>/dev/null || true

# Remove old zip
rm -f "${OUTPUT_ZIP}" Fontify-*.zip

# Create zip archive
zip -r9 "${OUTPUT_ZIP}" \
    module.prop \
    customize.sh \
    uninstall.sh \
    service.sh \
    post-fs-data.sh \
    bin \
    webroot \
    -x "*.git*" -x "*build.sh*" -x "*.DS_Store*"

echo ""
echo " Build Complete: ${OUTPUT_ZIP}"
ls -lh "${OUTPUT_ZIP}"
