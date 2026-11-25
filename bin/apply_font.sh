#!/system/bin/sh
# Fontify - apply_font.sh
# Author: Lava
# Usage: ./apply_font.sh <font_path> <config_json_path>

. "${0%/*}/lib_overlay.sh"
MODDIR="$(resolve_moddir "$0")"

DATA_DIR="$MODDIR/data"
SRC_FONT="$1"
CONFIG_SRC="$2"

if [ -z "$SRC_FONT" ] || [ ! -f "$SRC_FONT" ]; then
    echo '{"success": false, "error": "Font file not found"}'
    exit 1
fi

FONT_SIZE=$(wc -c < "$SRC_FONT" 2>/dev/null || stat -c%s "$SRC_FONT" 2>/dev/null || echo 0)
if [ "$FONT_SIZE" -lt 1000 ]; then
    echo '{"success": false, "error": "Font file is corrupted or too small"}'
    exit 1
fi

# Clean up legacy temp files and ensure overlay directories exist
rm -f /data/local/tmp/fontify_custom_font.ttf 2>/dev/null

# Remove any legacy XML overrides so Android's native FontManagerService uses its stock valid XML schema
rm -rf "$MODDIR/system/etc" 2>/dev/null
rm -rf "$MODDIR/system/product/etc" 2>/dev/null
rm -rf "$MODDIR/product/etc" 2>/dev/null

mkdir -p "$DATA_DIR"
mkdir -p "$MODDIR/system/fonts"
mkdir -p "$MODDIR/product/fonts"
mkdir -p "$MODDIR/system/product/fonts"

# 1. Save imported custom font
DEST_CUSTOM="$DATA_DIR/custom_font.ttf"
cp -af "$SRC_FONT" "$DEST_CUSTOM"
chmod 644 "$DEST_CUSTOM"

# 2. Save configuration JSON
CONFIG_FILE="$DATA_DIR/current_font.json"
if [ -f "$CONFIG_SRC" ]; then
    cp -af "$CONFIG_SRC" "$CONFIG_FILE"
elif [ -n "$CONFIG_SRC" ]; then
    echo "$CONFIG_SRC" > "$CONFIG_FILE"
else
    cat <<EOF > "$CONFIG_FILE"
{
  "font_name": "Custom Font",
  "is_variable": false,
  "weight_mode": "auto",
  "applied_at": "$(date +%s 2>/dev/null || echo 0)"
}
EOF
fi
chmod 644 "$CONFIG_FILE"

# 3. Mark pending font staging for boot deployment and clear full reboot requirement
touch "$DATA_DIR/.staged_font_pending"
rm -f "$DATA_DIR/.full_reboot_required" 2>/dev/null

# 4. Check if device is currently booted and font overlay is active
# If the system is booted (sys.boot_completed=1) and Roboto-Regular.ttf exists,
# running processes (SystemUI, Zygote, WebUI Chromium) have that file memory-mapped.
# Mutating an mmap'd font in-place while booted raises SIGBUS and crashes SystemUI/WebUI.
# We defer populating $MODDIR/system and $MODDIR/product to early boot in post-fs-data.sh.
IS_BOOTED="$(getprop sys.boot_completed 2>/dev/null || echo 0)"
if [ "$IS_BOOTED" = "1" ] && [ -f "$MODDIR/system/fonts/Roboto-Regular.ttf" ]; then
    echo '{"success": true, "message": "Font staged successfully! Please reboot your device to load new fonts."}'
    exit 0
fi

# 5. Populate module overlay trees (only when unpopulated or prior to initial boot)
populate_font_overlay "$MODDIR" "$DEST_CUSTOM"

# 6. Preserve custom emoji overlays if custom emoji is active
if [ -f "$DATA_DIR/custom_emoji.ttf" ] && [ -s "$DATA_DIR/custom_emoji.ttf" ]; then
    populate_emoji_overlay "$MODDIR" "$DATA_DIR/custom_emoji.ttf"
fi

# 7. Set permissions and SELinux contexts for both system and product overlay trees
apply_overlay_permissions "$MODDIR"

# 7. Staging complete: NoMount VFS redirection rules and font caches are safely synchronized
# at boot by post-fs-data.sh. Live kernel VFS hot-swapping and live font clearing must NOT
# run while booted to prevent WebUI/Zygote crashes from swapped font inodes.

echo '{"success": true, "message": "Font applied successfully! Please reboot your device to load new fonts."}'
exit 0
