#!/system/bin/sh
# Fontify - restore_emoji.sh
# Safely reverts emoji overlays and restores original stock system emojis

if [ -d "/data/adb/modules/fontify" ]; then
    MODDIR="/data/adb/modules/fontify"
elif [ -d "/data/adb/modules/custom_font_installer" ]; then
    MODDIR="/data/adb/modules/custom_font_installer"
else
    MODDIR="${0%/*}/.."
fi

DATA_DIR="$MODDIR/data"

# 1. Clean custom emoji active files
rm -f "$DATA_DIR/current_emoji.json" "$DATA_DIR/custom_emoji.ttf" 2>/dev/null
rm -f /data/local/tmp/fontify_emoji_* 2>/dev/null

# 2. Remove overlaid emoji font files
rm -f "$MODDIR/system/fonts/NotoColorEmoji*.ttf" 2>/dev/null
rm -f "$MODDIR/system/product/fonts/NotoColorEmoji*.ttf" 2>/dev/null
rm -f "$MODDIR/product/fonts/NotoColorEmoji*.ttf" 2>/dev/null

# If no custom text font is active either, completely clean module overlay directories
if [ ! -f "$DATA_DIR/custom_font.ttf" ] || [ ! -s "$DATA_DIR/custom_font.ttf" ]; then
    rm -rf "$MODDIR/system" 2>/dev/null
    rm -rf "$MODDIR/product" 2>/dev/null
fi

# 3. Clean NoMount VFS redirection rules for emojis
if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
    sh "$MODDIR/bin/nomount_sync.sh" del_emoji 2>/dev/null
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

echo '{"success": true, "message": "Custom emoji removed and stock emoji restored. Please reboot to apply."}'
exit 0
