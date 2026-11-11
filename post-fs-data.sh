#!/system/bin/sh
# Fontify - post-fs-data.sh
# Runs at early post-fs-data mode

MODDIR=${0%/*}
DATA_DIR="$MODDIR/data"
CUSTOM_FONT="$DATA_DIR/custom_font.ttf"

# Clean legacy external temp file and invalid top-level /product directory if present
rm -f /data/local/tmp/fontify_custom_font.ttf 2>/dev/null
rm -rf "$MODDIR/product" 2>/dev/null

if [ -f "$CUSTOM_FONT" ] && [ -s "$CUSTOM_FONT" ]; then
    # Ensure correct permissions and SELinux contexts for overlaid system files
    if [ -d "$MODDIR/system" ]; then
        chown -R 0:0 "$MODDIR/system" 2>/dev/null
        chmod -R 755 "$MODDIR/system" 2>/dev/null
        find "$MODDIR/system" -type f -exec chmod 644 {} + 2>/dev/null
        chcon -R u:object_r:system_file:s0 "$MODDIR/system" 2>/dev/null
    fi
else
    # Stock font mode - clean overlay tree so stock system fonts are used
    rm -rf "$MODDIR/system" 2>/dev/null
fi

# Clean Android updatable font overrides and caches so font bypass is prevented in both custom and stock modes
if [ -f "$MODDIR/bin/clear_font_cache.sh" ]; then
    sh "$MODDIR/bin/clear_font_cache.sh" 2>/dev/null
else
    rm -rf /data/fonts/files/* 2>/dev/null
    rm -rf /data/fonts/config/* 2>/dev/null
    rm -rf /data/system/font_cache/* 2>/dev/null
fi
