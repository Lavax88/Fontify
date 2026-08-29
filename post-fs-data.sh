#!/system/bin/sh
# Fontify - post-fs-data.sh
# Runs at early post-fs-data mode

MODDIR=${0%/*}
DATA_DIR="$MODDIR/data"
BACKUP_DIR="/data/adb/custom_font_backup"
CUSTOM_FONT="$DATA_DIR/custom_font.ttf"
EXTERNAL_FONT="/data/local/tmp/fontify_custom_font.ttf"

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

unmount_all_namespaces() {
    for target in $TARGET_FONTS; do
        umount -l "$target" 2>/dev/null
        if command -v nsenter >/dev/null 2>&1; then
            nsenter -t 1 -m -- umount -l "$target" 2>/dev/null
        fi
        if command -v su >/dev/null 2>&1; then
            su -M -c "umount -l $target" 2>/dev/null
        fi
    done
}

if [ -f "$CUSTOM_FONT" ] && [ -s "$CUSTOM_FONT" ]; then
    # Custom font active - create overlay directory structure
    mkdir -p "$MODDIR/system/fonts"
    mkdir -p "$MODDIR/product/fonts"
    mkdir -p "$MODDIR/system/product/fonts"
    mkdir -p "$MODDIR/system/etc"
    mkdir -p "$MODDIR/product/etc"
    mkdir -p "$MODDIR/data"

    # Populate module overlay font targets
    for f in GoogleSansFlex-Regular.ttf GoogleSans-Regular.ttf; do
        cp -af "$CUSTOM_FONT" "$MODDIR/product/fonts/$f" 2>/dev/null
        cp -af "$CUSTOM_FONT" "$MODDIR/system/product/fonts/$f" 2>/dev/null
        cp -af "$CUSTOM_FONT" "$MODDIR/system/fonts/$f" 2>/dev/null
    done
    for f in Roboto-Regular.ttf RobotoFlex-Regular.ttf RobotoStatic-Regular.ttf DroidSans.ttf DroidSans-Bold.ttf SourceSansPro-Regular.ttf SourceSansPro-Bold.ttf SourceSansPro-SemiBold.ttf Roboto-Bold.ttf Roboto-Italic.ttf Roboto-BoldItalic.ttf Roboto-Medium.ttf Roboto-MediumItalic.ttf Roboto-Light.ttf Roboto-LightItalic.ttf Roboto-Thin.ttf Roboto-ThinItalic.ttf Roboto-Black.ttf Roboto-BlackItalic.ttf; do
        cp -af "$CUSTOM_FONT" "$MODDIR/system/fonts/$f" 2>/dev/null
    done

    # Ensure external font is accessible outside /data/adb
    cp -af "$CUSTOM_FONT" "$EXTERNAL_FONT" 2>/dev/null
    chmod 644 "$EXTERNAL_FONT" 2>/dev/null
    chcon u:object_r:system_file:s0 "$EXTERNAL_FONT" 2>/dev/null

    # Bind mount across master and current namespaces
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

    # Ensure correct permissions and SELinux contexts
    chmod -R 755 "$MODDIR/system" "$MODDIR/product" 2>/dev/null
    find "$MODDIR/system" "$MODDIR/product" -type f -exec chmod 644 {} + 2>/dev/null
    chcon -R u:object_r:system_file:s0 "$MODDIR/system" "$MODDIR/product" 2>/dev/null
else
    # Stock font mode - clean external mount and remove overlay trees completely
    unmount_all_namespaces
    rm -f "$EXTERNAL_FONT" 2>/dev/null
    rm -rf "$MODDIR/system" 2>/dev/null
    rm -rf "$MODDIR/product" 2>/dev/null
fi

# Clean cached font tables
rm -rf /data/system/font_cache/* 2>/dev/null
