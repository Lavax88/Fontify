#!/system/bin/sh
# Fontify - restore_emoji.sh
# Safely reverts emoji overlays and restores original stock system emojis

. "${0%/*}/lib_overlay.sh"
MODDIR="$(resolve_moddir "$0")"

DATA_DIR="$MODDIR/data"

# 1. Clean custom emoji active files
rm -f "$DATA_DIR/current_emoji.json" "$DATA_DIR/custom_emoji.ttf" 2>/dev/null
rm -f "$DATA_DIR/.staged_emoji_pending" 2>/dev/null
rm -f /data/local/tmp/fontify_emoji_* 2>/dev/null

# Mark full reboot requirement to prevent bootloops on soft reboot
touch "$DATA_DIR/.full_reboot_required" 2>/dev/null

# 2. Remove overlaid emoji font files
rm -f "$MODDIR/system/fonts"/NotoColorEmoji*.ttf 2>/dev/null
rm -f "$MODDIR/system/product/fonts"/NotoColorEmoji*.ttf 2>/dev/null
rm -f "$MODDIR/product/fonts"/NotoColorEmoji*.ttf 2>/dev/null
rm -f "$MODDIR/system/fonts/NotoColorEmoji.ttf" "$MODDIR/system/fonts/NotoColorEmojiFlags.ttf" "$MODDIR/system/fonts/NotoColorEmojiLegacy.ttf" 2>/dev/null
rm -f "$MODDIR/product/fonts/NotoColorEmoji.ttf" "$MODDIR/system/product/fonts/NotoColorEmoji.ttf" 2>/dev/null

# Clean up NoMount VFS redirection rules for emojis immediately so no dangling deleted inodes remain
if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
    sh "$MODDIR/bin/nomount_sync.sh" del_emoji 2>/dev/null
fi

# If no custom text font is active either, completely clean module overlay directories
if [ ! -f "$DATA_DIR/custom_font.ttf" ] || [ ! -s "$DATA_DIR/custom_font.ttf" ]; then
    rm -rf "$MODDIR/system" 2>/dev/null
    rm -rf "$MODDIR/product" 2>/dev/null
    if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
        sh "$MODDIR/bin/nomount_sync.sh" del_all 2>/dev/null
    fi
fi

# 3. Clean font caches and updatable font overrides from storage.
# NoMount VFS rules are safely synchronized on next boot by post-fs-data.sh.
clear_android_font_caches

echo '{"success": true, "message": "Custom emoji removed and stock emoji restored. Please reboot to apply."}'
exit 0
