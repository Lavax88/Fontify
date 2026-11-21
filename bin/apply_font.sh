#!/system/bin/sh
# Fontify - apply_font.sh
# Author: Lava
# Usage: ./apply_font.sh <font_path> <config_json_path>

if [ -d "/data/adb/modules/fontify" ]; then
    MODDIR="/data/adb/modules/fontify"
elif [ -d "/data/adb/modules/custom_font_installer" ]; then
    MODDIR="/data/adb/modules/custom_font_installer"
else
    MODDIR="${0%/*}/.."
fi

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
# Core system Roboto targets
cp -af "$DEST_CUSTOM" "$MODDIR/system/fonts/Roboto-Regular.ttf"
cp -af "$DEST_CUSTOM" "$MODDIR/system/fonts/RobotoFlex-Regular.ttf"
cp -af "$DEST_CUSTOM" "$MODDIR/system/fonts/RobotoStatic-Regular.ttf"
cp -af "$DEST_CUSTOM" "$MODDIR/system/fonts/DroidSans.ttf"
cp -af "$DEST_CUSTOM" "$MODDIR/system/fonts/DroidSans-Bold.ttf"

# Legacy static Roboto and sans fallbacks
for target in Roboto-Bold.ttf Roboto-Italic.ttf Roboto-BoldItalic.ttf Roboto-Medium.ttf Roboto-MediumItalic.ttf Roboto-Light.ttf Roboto-LightItalic.ttf Roboto-Thin.ttf Roboto-ThinItalic.ttf Roboto-Black.ttf Roboto-BlackItalic.ttf SourceSansPro-Regular.ttf SourceSansPro-Bold.ttf SourceSansPro-SemiBold.ttf SourceSansPro-Italic.ttf SourceSansPro-BoldItalic.ttf SourceSansPro-SemiBoldItalic.ttf; do
    cp -af "$DEST_CUSTOM" "$MODDIR/system/fonts/$target"
done

# Product partition Google Sans targets (populated in BOTH $MODDIR/product/fonts and $MODDIR/system/product/fonts)
# Note: Clock fonts (GoogleSansClock, GoogleSansFlexClock) are preserved to prevent lockscreen clock breakage
if [ -d /product/fonts ]; then
    for pf in /product/fonts/GoogleSans*.ttf /product/fonts/GoogleSansFlex*.ttf /product/fonts/GoogleSansText*.ttf; do
        [ -f "$pf" ] || continue
        case "$pf" in
            *Clock*) continue ;; # Preserve lockscreen clock fonts
            *)
                base="$(basename "$pf")"
                cp -af "$DEST_CUSTOM" "$MODDIR/product/fonts/$base"
                cp -af "$DEST_CUSTOM" "$MODDIR/system/product/fonts/$base"
                ;;
        esac
    done
fi

# 5. Preserve custom emoji overlays if custom emoji is active
if [ -f "$DATA_DIR/custom_emoji.ttf" ] && [ -s "$DATA_DIR/custom_emoji.ttf" ]; then
    cp -af "$DATA_DIR/custom_emoji.ttf" "$MODDIR/system/fonts/NotoColorEmoji.ttf"
    cp -af "$DATA_DIR/custom_emoji.ttf" "$MODDIR/product/fonts/NotoColorEmoji.ttf"
    cp -af "$DATA_DIR/custom_emoji.ttf" "$MODDIR/system/product/fonts/NotoColorEmoji.ttf"
fi

# 6. Set permissions and SELinux contexts for both system and product overlay trees
for dir in "$MODDIR/system" "$MODDIR/product"; do
    if [ -d "$dir" ]; then
        chown -R 0:0 "$dir" 2>/dev/null
        chmod -R 755 "$dir" 2>/dev/null
        find "$dir" -type f -exec chmod 644 {} + 2>/dev/null
        chcon -R u:object_r:system_file:s0 "$dir" 2>/dev/null
    fi
done

# 7. Staging complete: NoMount VFS redirection rules and font caches are safely synchronized
# at boot by post-fs-data.sh. Live kernel VFS hot-swapping and live font clearing must NOT
# run while booted to prevent WebUI/Zygote crashes from swapped font inodes.

echo '{"success": true, "message": "Font applied successfully! Please reboot your device to load new fonts."}'
exit 0
