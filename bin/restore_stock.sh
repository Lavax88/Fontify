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
rm -f /data/local/tmp/fontify_custom_font.ttf 2>/dev/null

# 2. Revert text font overlays while preserving custom emoji if active
if [ -f "$DATA_DIR/custom_emoji.ttf" ] && [ -s "$DATA_DIR/custom_emoji.ttf" ]; then
    # Emoji overlay is still active - remove only typeface fonts and etc configs
    find "$MODDIR/system/fonts" -maxdepth 1 -type f ! -name "NotoColorEmoji*" -exec rm -f {} + 2>/dev/null
    find "$MODDIR/product/fonts" -maxdepth 1 -type f ! -name "NotoColorEmoji*" -exec rm -f {} + 2>/dev/null
    find "$MODDIR/system/product/fonts" -maxdepth 1 -type f ! -name "NotoColorEmoji*" -exec rm -f {} + 2>/dev/null
    rm -rf "$MODDIR/system/etc" 2>/dev/null
    rm -rf "$MODDIR/system/product/etc" 2>/dev/null
    rm -rf "$MODDIR/product/etc" 2>/dev/null
else
    # Neither font nor emoji active - wipe overlay tree
    rm -rf "$MODDIR/system" 2>/dev/null
    rm -rf "$MODDIR/product" 2>/dev/null
fi

# 3. Clean NoMount VFS redirection rules for removed fonts
if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
    sh "$MODDIR/bin/nomount_sync.sh" del_fonts 2>/dev/null
    sh "$MODDIR/bin/nomount_sync.sh" sync 2>/dev/null
fi

# 4. Clear font caches and updatable font overrides
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
