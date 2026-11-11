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

# Clean up legacy paths and prepare module directory structure
rm -rf "$MODDIR/product" 2>/dev/null
rm -f /data/local/tmp/fontify_custom_font.ttf 2>/dev/null

mkdir -p "$DATA_DIR"
mkdir -p "$MODDIR/system/fonts"
mkdir -p "$MODDIR/system/etc"
mkdir -p "$MODDIR/system/product/fonts"
mkdir -p "$MODDIR/system/product/etc"

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

# 3. Detect if font is variable font (has 'fvar' table in sfnt directory)
IS_VARIABLE=false
if grep -q '"is_variable": *true' "$CONFIG_FILE" 2>/dev/null || head -c 2048 "$DEST_CUSTOM" 2>/dev/null | grep -q -a "fvar"; then
    IS_VARIABLE=true
fi

# 4. Populate module overlay trees
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

# Product partition Google Sans targets (placed under $MODDIR/system/product/fonts)
# Note: Clock fonts (GoogleSansClock, GoogleSansFlexClock) are preserved to prevent lockscreen clock breakage
if [ -d /product/fonts ]; then
    for pf in /product/fonts/GoogleSans*.ttf /product/fonts/GoogleSansFlex*.ttf /product/fonts/GoogleSansText*.ttf; do
        [ -f "$pf" ] || continue
        case "$pf" in
            *Clock*) continue ;; # Preserve lockscreen clock fonts
            *)
                base="$(basename "$pf")"
                cp -af "$DEST_CUSTOM" "$MODDIR/system/product/fonts/$base"
                ;;
        esac
    done
fi

# 5. Handle font XML configurations
# For static fonts: Strip all <axis .../> elements to prevent FontManagerService IllegalArgumentException on boot
# For variable fonts: Strip non-standard proprietary Google axes (GRAD, ROND) from fonts_customization.xml
if [ -f /system/etc/fonts.xml ]; then
    cp -af /system/etc/fonts.xml "$MODDIR/system/etc/fonts.xml"
    if [ "$IS_VARIABLE" = "false" ]; then
        sed -i '/<axis/d' "$MODDIR/system/etc/fonts.xml" 2>/dev/null
    fi
fi

if [ -f /product/etc/fonts_customization.xml ]; then
    cp -af /product/etc/fonts_customization.xml "$MODDIR/system/product/etc/fonts_customization.xml"
    if [ "$IS_VARIABLE" = "false" ]; then
        sed -i '/<axis/d' "$MODDIR/system/product/etc/fonts_customization.xml" 2>/dev/null
    else
        sed -i '/tag="GRAD"/d; /tag="ROND"/d' "$MODDIR/system/product/etc/fonts_customization.xml" 2>/dev/null
    fi
fi

# 6. Set permissions and SELinux contexts
chown -R 0:0 "$MODDIR/system" 2>/dev/null
chmod -R 755 "$MODDIR/system" 2>/dev/null
find "$MODDIR/system" -type f -exec chmod 644 {} + 2>/dev/null
chcon -R u:object_r:system_file:s0 "$MODDIR/system" 2>/dev/null

# 7. Clear Android font caches and updatable system font overrides
rm -rf /data/fonts/files/* 2>/dev/null
rm -rf /data/fonts/config/* 2>/dev/null
rm -rf /data/system/font_cache/* 2>/dev/null
cmd font clear 2>/dev/null || true

echo '{"success": true, "message": "Font applied successfully! Please reboot your device to load new fonts."}'
exit 0
