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
if command -v zip >/dev/null 2>&1; then
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
else
    PYTHON_CMD=""
    if [ -x "/c/Python314/python.exe" ]; then
        PYTHON_CMD="/c/Python314/python.exe"
    elif command -v py >/dev/null 2>&1 && py -V >/dev/null 2>&1; then
        PYTHON_CMD="py"
    elif command -v python3 >/dev/null 2>&1 && python3 -V >/dev/null 2>&1; then
        PYTHON_CMD="python3"
    elif command -v python >/dev/null 2>&1 && python -V >/dev/null 2>&1; then
        PYTHON_CMD="python"
    fi

    if [ -n "$PYTHON_CMD" ]; then
        "$PYTHON_CMD" - <<EOF
import os, zipfile

output_zip = "${OUTPUT_ZIP}"
entries = [
    'module.prop',
    'customize.sh',
    'hotinstall.sh',
    'uninstall.sh',
    'service.sh',
    'post-fs-data.sh',
]
dirs = ['bin', 'webroot']

with zipfile.ZipFile(output_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for entry in entries:
        if os.path.isfile(entry):
            info = zipfile.ZipInfo(entry)
            info.external_attr = (0o755 | 0o100000) << 16 if entry.endswith('.sh') else (0o644 | 0o100000) << 16
            with open(entry, 'rb') as f:
                zf.writestr(info, f.read())
    for d in dirs:
        if os.path.isdir(d):
            for root, _, files in os.walk(d):
                for f in files:
                    full_path = os.path.join(root, f)
                    arcname = os.path.relpath(full_path, '.').replace('\\\\', '/')
                    info = zipfile.ZipInfo(arcname)
                    info.external_attr = (0o755 | 0o100000) << 16 if arcname.endswith('.sh') else (0o644 | 0o100000) << 16
                    with open(full_path, 'rb') as fp:
                        zf.writestr(info, fp.read())
EOF
    elif command -v 7z >/dev/null 2>&1; then
        7z a -tzip -mx=9 "${OUTPUT_ZIP}" \
            module.prop \
            customize.sh \
            hotinstall.sh \
            uninstall.sh \
            service.sh \
            post-fs-data.sh \
            bin \
            webroot
    else
        echo "ERROR: Neither zip, python, nor 7z was found to package the zip!" >&2
        exit 1
    fi
fi

echo ""
echo "======================================"
echo " Build Complete: ${OUTPUT_ZIP}"
echo "======================================"
ls -lh "${OUTPUT_ZIP}"
if command -v unzip >/dev/null 2>&1; then
    unzip -l "${OUTPUT_ZIP}"
fi
