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

mkdir -p "$DATA_DIR"
mkdir -p "$MODDIR/system/fonts"
mkdir -p "$MODDIR/system/etc"
mkdir -p "$MODDIR/system/product/fonts"
mkdir -p "$MODDIR/system/product/etc"
mkdir -p "$MODDIR/product/fonts"
mkdir -p "$MODDIR/product/etc"

# 1. Save imported custom font
DEST_CUSTOM="$DATA_DIR/custom_font.ttf"
cp -af "$SRC_FONT" "$DEST_CUSTOM"
chmod 644 "$DEST_CUSTOM"

# Save external font in /data/local/tmp (outside /data/adb to bypass KernelSU unmount rules)
EXTERNAL_FONT="/data/local/tmp/fontify_custom_font.ttf"
cp -af "$SRC_FONT" "$EXTERNAL_FONT"
chmod 644 "$EXTERNAL_FONT"
chcon u:object_r:system_file:s0 "$EXTERNAL_FONT" 2>/dev/null

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
  "is_variable": true,
  "weight_mode": "auto",
  "applied_at": "$(date +%s 2>/dev/null || echo 0)"
}
EOF
fi
chmod 644 "$CONFIG_FILE"

# 3. Populate module overlay trees
cp -af "$DEST_CUSTOM" "$MODDIR/product/fonts/GoogleSansFlex-Regular.ttf"
cp -af "$DEST_CUSTOM" "$MODDIR/system/product/fonts/GoogleSansFlex-Regular.ttf"
cp -af "$DEST_CUSTOM" "$MODDIR/system/fonts/GoogleSansFlex-Regular.ttf"
cp -af "$DEST_CUSTOM" "$MODDIR/product/fonts/GoogleSans-Regular.ttf" 2>/dev/null
cp -af "$DEST_CUSTOM" "$MODDIR/system/product/fonts/GoogleSans-Regular.ttf" 2>/dev/null

for target in Roboto-Regular.ttf RobotoFlex-Regular.ttf RobotoStatic-Regular.ttf DroidSans.ttf DroidSans-Bold.ttf SourceSansPro-Regular.ttf SourceSansPro-Bold.ttf SourceSansPro-SemiBold.ttf Roboto-Bold.ttf Roboto-Italic.ttf Roboto-BoldItalic.ttf Roboto-Medium.ttf Roboto-MediumItalic.ttf Roboto-Light.ttf Roboto-LightItalic.ttf Roboto-Thin.ttf Roboto-ThinItalic.ttf Roboto-Black.ttf Roboto-BlackItalic.ttf; do
    cp -af "$DEST_CUSTOM" "$MODDIR/system/fonts/$target"
done

# Copy font XMLs if present
[ -f /system/etc/fonts.xml ] && cp -af /system/etc/fonts.xml "$MODDIR/system/etc/fonts.xml"
if [ -f /product/etc/fonts_customization.xml ]; then
    cp -af /product/etc/fonts_customization.xml "$MODDIR/product/etc/fonts_customization.xml"
    cp -af /product/etc/fonts_customization.xml "$MODDIR/system/product/etc/fonts_customization.xml"
fi

# Set permissions and SELinux contexts
for dir in "$MODDIR/system" "$MODDIR/product"; do
    if [ -d "$dir" ]; then
        chmod -R 755 "$dir" 2>/dev/null
        find "$dir" -type f -exec chmod 644 {} + 2>/dev/null
        chown -R 0:0 "$dir" 2>/dev/null
        chcon -R u:object_r:system_file:s0 "$dir" 2>/dev/null
    fi
done

# Clear Android font caches
rm -rf /data/system/font_cache/* 2>/dev/null

# 4. Direct namespace bind mounts across current, PID 1, and global master namespaces
TARGET_FONTS="
/product/fonts/GoogleSansFlex-Regular.ttf
/product/fonts/GoogleSans-Regular.ttf
/system/product/fonts/GoogleSansFlex-Regular.ttf
/system/product/fonts/GoogleSans-Regular.ttf
/system/fonts/Roboto-Regular.ttf
/system/fonts/RobotoFlex-Regular.ttf
/system/fonts/RobotoStatic-Regular.ttf
/system/fonts/Roboto-Medium.ttf
/system/fonts/Roboto-Bold.ttf
/system/fonts/GoogleSansFlex-Regular.ttf
"

for target in $TARGET_FONTS; do
    if [ -f "$target" ]; then
        mount -o bind "$EXTERNAL_FONT" "$target" 2>/dev/null
        if command -v nsenter >/dev/null 2>&1; then
            nsenter -t 1 -m -- mount -o bind "$EXTERNAL_FONT" "$target" 2>/dev/null
        fi
        if command -v su >/dev/null 2>&1; then
            su -M -c "mount -o bind $EXTERNAL_FONT $target" 2>/dev/null
        fi
    fi
done

echo '{"success": true, "message": "Font applied successfully! Please reboot to reload fonts."}'
exit 0
