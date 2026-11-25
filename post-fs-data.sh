#!/system/bin/sh
# Fontify - post-fs-data.sh
# Runs at early post-fs-data mode

MODDIR=${0%/*}
DATA_DIR="$MODDIR/data"
CUSTOM_FONT="$DATA_DIR/custom_font.ttf"
CUSTOM_EMOJI="$DATA_DIR/custom_emoji.ttf"
[ -f "$MODDIR/bin/lib_overlay.sh" ] && . "$MODDIR/bin/lib_overlay.sh"

# Clean legacy external temp files and any legacy XML overrides
rm -f /data/local/tmp/fontify_custom_font.ttf 2>/dev/null
rm -f /data/local/tmp/fontify_emoji_*.ttf 2>/dev/null
rm -f "$DATA_DIR/.full_reboot_required" 2>/dev/null
rm -rf "$MODDIR/system/etc" "$MODDIR/product/etc" "$MODDIR/system/product/etc" 2>/dev/null

# Deploy staged or self-heal: if custom font exists, ensure overlay tree matches custom font
if [ -f "$CUSTOM_FONT" ] && [ -s "$CUSTOM_FONT" ]; then
    CURRENT_ROBOTO_SZ=$(wc -c < "$MODDIR/system/fonts/Roboto-Regular.ttf" 2>/dev/null || echo 0)
    if [ -f "$DATA_DIR/.staged_font_pending" ] || [ ! -f "$MODDIR/system/fonts/Roboto-Regular.ttf" ] || [ "$CURRENT_ROBOTO_SZ" -lt 1000 ] || ! cmp -s "$CUSTOM_FONT" "$MODDIR/system/fonts/Roboto-Regular.ttf" 2>/dev/null; then
        populate_font_overlay "$MODDIR" "$CUSTOM_FONT"
        rm -f "$DATA_DIR/.staged_font_pending" 2>/dev/null
    fi
fi

# Deploy staged or self-heal: if custom emoji exists, ensure overlay tree matches custom emoji
if [ -f "$CUSTOM_EMOJI" ] && [ -s "$CUSTOM_EMOJI" ]; then
    CURRENT_EMOJI_SZ=$(wc -c < "$MODDIR/system/fonts/NotoColorEmoji.ttf" 2>/dev/null || echo 0)
    if [ -f "$DATA_DIR/.staged_emoji_pending" ] || [ ! -f "$MODDIR/system/fonts/NotoColorEmoji.ttf" ] || [ "$CURRENT_EMOJI_SZ" -lt 1000 ] || ! cmp -s "$CUSTOM_EMOJI" "$MODDIR/system/fonts/NotoColorEmoji.ttf" 2>/dev/null; then
        populate_emoji_overlay "$MODDIR" "$CUSTOM_EMOJI"
        rm -f "$DATA_DIR/.staged_emoji_pending" 2>/dev/null
    fi
fi

if { [ -f "$CUSTOM_FONT" ] && [ -s "$CUSTOM_FONT" ]; } || { [ -f "$CUSTOM_EMOJI" ] && [ -s "$CUSTOM_EMOJI" ]; }; then
    # Ensure correct permissions and SELinux contexts for overlaid system files
    apply_overlay_permissions "$MODDIR"

    # Sync NoMount VFS redirection rules if NoMount metamodule is present
    if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
        sh "$MODDIR/bin/nomount_sync.sh" sync 2>/dev/null
    fi
else
    # Stock font & emoji mode - clean overlay tree so stock system fonts are used
    rm -rf "$MODDIR/system" 2>/dev/null
    rm -rf "$MODDIR/product" 2>/dev/null
    if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
        sh "$MODDIR/bin/nomount_sync.sh" del_all 2>/dev/null
    fi
fi

# Clean Android updatable font overrides and caches so font bypass is prevented in both custom and stock modes
clear_android_font_caches
