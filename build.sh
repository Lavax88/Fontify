#!/bin/bash
# Fontify - Package Build Script
# Author: Lava

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODULE_NAME="Fontify"
VERSION=$(grep '^version=' module.prop 2>/dev/null | cut -d= -f2 | tr -d '\r')
if [ -z "$VERSION" ]; then
    VERSION="v1.0.0"
fi
OUTPUT_ZIP="${MODULE_NAME}-${VERSION}.zip"

echo "======================================"
echo " Building ${OUTPUT_ZIP} "
echo " Author: Lava "
echo "======================================"

# 1. Build TypeScript WebUI with Vite
echo ">> Compiling WebUI (TypeScript + Vite)..."
if command -v npm >/dev/null 2>&1; then
    if [ -f "package-lock.json" ]; then
        npm ci || npm install
    else
        npm install
    fi
    npm run build
else
    echo "ERROR: npm is not installed. Please install Node.js (LTS) to build Fontify." >&2
    exit 1
fi

# Ensure webroot output exists
if [ ! -f "webroot/index.html" ]; then
    echo "ERROR: webroot/index.html not found after build!" >&2
    exit 1
fi

# Report built WebUI size
WEBROOT_SIZE=$(du -sh webroot | cut -f1)
echo ">> Built WebUI size: ${WEBROOT_SIZE}"

# 2. Ensure script permissions
chmod +x customize.sh hotinstall.sh uninstall.sh service.sh post-fs-data.sh 2>/dev/null || true
chmod +x bin/*.sh 2>/dev/null || true

# 3. Clean up previous archives
rm -f "${OUTPUT_ZIP}" Fontify-*.zip

# 4. Package flashable module zip
echo ">> Packaging flashable module zip..."
zip -r9 "${OUTPUT_ZIP}" \
    module.prop \
    customize.sh \
    hotinstall.sh \
    uninstall.sh \
    service.sh \
    post-fs-data.sh \
    bin \
    webroot \
    -x "*.git*" -x "*build.sh*" -x "*.DS_Store*" -x "*node_modules*" -x "*src*" -x "*tests*"

echo ""
echo "======================================"
echo " Build Complete: ${OUTPUT_ZIP}"
echo "======================================"
ls -lh "${OUTPUT_ZIP}"
unzip -l "${OUTPUT_ZIP}"
