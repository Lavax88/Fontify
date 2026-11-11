#!/system/bin/sh
# Fontify - restore_stock.sh
# Safely reverts all font overlays and restores original stock system fonts

if [ -d "/data/adb/modules/fontify" ]; then
    MODDIR="/data/adb/modules/fontify"
elif [ -d "/data/adb/modules/custom_font_installer" ]; then
    MODDIR="/data/adb/modules/custom_font_installer"
else
    MODDIR="${0%/*}/.."
fi

DATA_DIR="$MODDIR/data"

# 1. Clean custom font active files
rm -f "$DATA_DIR/current_font.json" "$DATA_DIR/custom_font.ttf" 2>/dev/null
rm -f /data/local/tmp/fontify_* 2>/dev/null

# 2. Completely delete module overlay directories so nothing is overlaid
rm -rf "$MODDIR/system" 2>/dev/null
rm -rf "$MODDIR/product" 2>/dev/null

# 3. Clear font caches and updatable font overrides
if [ -f "$MODDIR/bin/clear_font_cache.sh" ]; then
    sh "$MODDIR/bin/clear_font_cache.sh" 2>/dev/null
else
    rm -rf /data/fonts/files/* 2>/dev/null
    rm -rf /data/fonts/config/* 2>/dev/null
    rm -rf /data/system/font_cache/* 2>/dev/null
    cmd font clear 2>/dev/null || true
fi

echo '{"success": true, "message": "Custom font removed and stock font restored. Please reboot to apply."}'
exit 0
