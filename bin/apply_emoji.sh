#!/system/bin/sh
# Fontify - apply_emoji.sh
# Author: Lava
# Usage: ./apply_emoji.sh <emoji_font_path> <config_json_path>

if [ -d "/data/adb/modules/fontify" ]; then
    MODDIR="/data/adb/modules/fontify"
elif [ -d "/data/adb/modules/custom_font_installer" ]; then
    MODDIR="/data/adb/modules/custom_font_installer"
else
    MODDIR="${0%/*}/.."
fi

DATA_DIR="$MODDIR/data"
SRC_EMOJI="$1"
CONFIG_SRC="$2"

if [ -z "$SRC_EMOJI" ] || [ ! -f "$SRC_EMOJI" ]; then
    echo '{"success": false, "error": "Emoji font file not found"}'
    exit 1
fi

RAW_SIZE=$(wc -c < "$SRC_EMOJI" 2>/dev/null || stat -c%s "$SRC_EMOJI" 2>/dev/null || echo 0)
FONT_SIZE=$(echo "$RAW_SIZE" | tr -cd '0-9')
if [ -z "$FONT_SIZE" ] || [ "$FONT_SIZE" -lt 1000 ]; then
    echo '{"success": false, "error": "Emoji font file is corrupted or too small"}'
    exit 1
fi

mkdir -p "$DATA_DIR"
mkdir -p "$MODDIR/system/fonts"
mkdir -p "$MODDIR/product/fonts"
mkdir -p "$MODDIR/system/product/fonts"

# Remove any legacy XML overrides
rm -rf "$MODDIR/system/etc" 2>/dev/null
rm -rf "$MODDIR/system/product/etc" 2>/dev/null
rm -rf "$MODDIR/product/etc" 2>/dev/null

# 1. Save imported custom emoji font
DEST_EMOJI="$DATA_DIR/custom_emoji.ttf"
cp -af "$SRC_EMOJI" "$DEST_EMOJI"
chmod 644 "$DEST_EMOJI"

# 2. Save emoji configuration JSON
CONFIG_FILE="$DATA_DIR/current_emoji.json"
if [ -f "$CONFIG_SRC" ]; then
    cp -af "$CONFIG_SRC" "$CONFIG_FILE"
elif [ -n "$CONFIG_SRC" ]; then
    echo "$CONFIG_SRC" > "$CONFIG_FILE"
else
    cat <<EOF > "$CONFIG_FILE"
{
  "emoji_name": "Custom Emoji",
  "source": "custom",
  "applied_at": "$(date +%s 2>/dev/null || echo 0)"
}
EOF
fi
chmod 644 "$CONFIG_FILE"

# 3. Populate module overlay trees for emojis
cp -af "$DEST_EMOJI" "$MODDIR/system/fonts/NotoColorEmoji.ttf"
cp -af "$DEST_EMOJI" "$MODDIR/system/fonts/NotoColorEmojiFlags.ttf"

# Legacy / vendor fallbacks if present in /system/fonts or /product/fonts
if [ -f /system/fonts/NotoColorEmojiLegacy.ttf ]; then
    cp -af "$DEST_EMOJI" "$MODDIR/system/fonts/NotoColorEmojiLegacy.ttf"
fi

cp -af "$DEST_EMOJI" "$MODDIR/system/product/fonts/NotoColorEmoji.ttf"
cp -af "$DEST_EMOJI" "$MODDIR/product/fonts/NotoColorEmoji.ttf"

# 4. Set permissions and SELinux contexts for both system and product overlays
for dir in "$MODDIR/system" "$MODDIR/product"; do
    if [ -d "$dir" ]; then
        chown -R 0:0 "$dir" 2>/dev/null
        chmod -R 755 "$dir" 2>/dev/null
        find "$dir" -type f -exec chmod 644 {} + 2>/dev/null
        chcon -R u:object_r:system_file:s0 "$dir" 2>/dev/null
    fi
done

# 5. Sync NoMount VFS redirection rules if NoMount metamodule is present
if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
    sh "$MODDIR/bin/nomount_sync.sh" sync 2>/dev/null
fi

# 6. Clear Android font caches and GMS updatable font overrides
if [ -f "$MODDIR/bin/clear_font_cache.sh" ]; then
    sh "$MODDIR/bin/clear_font_cache.sh" 2>/dev/null
else
    rm -rf /data/fonts/files/* 2>/dev/null
    rm -rf /data/fonts/config/* 2>/dev/null
    rm -rf /data/system/font_cache/* 2>/dev/null
    cmd font clear 2>/dev/null || true
fi

echo '{"success": true, "message": "Emoji font applied successfully! Please reboot your device to load new emojis."}'
exit 0
