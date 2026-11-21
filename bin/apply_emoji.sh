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

# 3. Mark pending emoji staging for boot deployment and clear full reboot requirement
touch "$DATA_DIR/.staged_emoji_pending"
rm -f "$DATA_DIR/.full_reboot_required" 2>/dev/null

# 4. Check if device is currently booted and emoji overlay is active
# If the system is booted (sys.boot_completed=1) and NotoColorEmoji.ttf exists,
# running processes have that file memory-mapped.
# Mutating an mmap'd font in-place while booted raises SIGBUS and crashes SystemUI/WebUI.
# We defer populating $MODDIR/system and $MODDIR/product to early boot in post-fs-data.sh.
IS_BOOTED="$(getprop sys.boot_completed 2>/dev/null || echo 0)"
if [ "$IS_BOOTED" = "1" ] && [ -f "$MODDIR/system/fonts/NotoColorEmoji.ttf" ]; then
    echo '{"success": true, "message": "Emoji font staged successfully! Please reboot your device to load new emojis."}'
    exit 0
fi

# 5. Populate module overlay trees for emojis (only when unpopulated or prior to initial boot)
cp -af "$DEST_EMOJI" "$MODDIR/system/fonts/NotoColorEmoji.ttf"
cp -af "$DEST_EMOJI" "$MODDIR/system/product/fonts/NotoColorEmoji.ttf"
cp -af "$DEST_EMOJI" "$MODDIR/product/fonts/NotoColorEmoji.ttf"

# Preserve system NotoColorEmojiFlags.ttf so national flag emojis (US, GB, IN, JP...)
# always render correctly even if custom emoji pack does not contain flag glyphs.
# Only replace NotoColorEmojiFlags.ttf if stock does not exist or custom pack has flag tables.
rm -f "$MODDIR/system/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null
rm -f "$MODDIR/product/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null

# Legacy / vendor fallbacks if present in /system/fonts or /product/fonts
if [ -f /system/fonts/NotoColorEmojiLegacy.ttf ]; then
    cp -af "$DEST_EMOJI" "$MODDIR/system/fonts/NotoColorEmojiLegacy.ttf"
fi

# 4. Set permissions and SELinux contexts for both system and product overlays
for dir in "$MODDIR/system" "$MODDIR/product"; do
    if [ -d "$dir" ]; then
        chown -R 0:0 "$dir" 2>/dev/null
        chmod -R 755 "$dir" 2>/dev/null
        find "$dir" -type f -exec chmod 644 {} + 2>/dev/null
        chcon -R u:object_r:system_file:s0 "$dir" 2>/dev/null
    fi
done

# 5. Staging complete: NoMount VFS redirection rules and font caches are safely synchronized
# at boot by post-fs-data.sh. Live kernel VFS hot-swapping and live font clearing must NOT
# run while booted to prevent WebUI/Zygote crashes from swapped font inodes.

echo '{"success": true, "message": "Emoji font applied successfully! Please reboot your device to load new emojis."}'
exit 0
