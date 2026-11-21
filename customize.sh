#!/sbin/sh
# Fontify - customize.sh
# Author: Lava

SKIPUNZIP=0

# Define Paths
MODID="fontify"
DATA_ADB="/data/adb"
MODULE_DIR="${DATA_ADB}/modules/${MODID}"
OLD_MODULE_DIR="${DATA_ADB}/modules/custom_font_installer"

# 1. Prepare module directories
ui_print "- Setting up directory structure..."
mkdir -p "$MODPATH/bin"
mkdir -p "$MODPATH/webroot"
mkdir -p "$MODPATH/data"

# 2. Preserve existing user font/emoji data & regenerate overlays across updates
if [ -d "$MODULE_DIR/data" ] && [ "$(ls -A "$MODULE_DIR/data" 2>/dev/null)" ]; then
    ui_print "- Preserving existing font and emoji configuration..."
    cp -af "$MODULE_DIR/data/." "$MODPATH/data/" 2>/dev/null

    # Regenerate font overlay from preserved custom_font.ttf
    if [ -f "$MODPATH/data/custom_font.ttf" ] && [ -s "$MODPATH/data/custom_font.ttf" ]; then
        ui_print "- Restoring active custom font overlay..."
        mkdir -p "$MODPATH/system/fonts" "$MODPATH/product/fonts" "$MODPATH/system/product/fonts" 2>/dev/null
        CUSTOM_FONT="$MODPATH/data/custom_font.ttf"
        cp -af "$CUSTOM_FONT" "$MODPATH/system/fonts/Roboto-Regular.ttf" 2>/dev/null
        cp -af "$CUSTOM_FONT" "$MODPATH/system/fonts/RobotoFlex-Regular.ttf" 2>/dev/null
        cp -af "$CUSTOM_FONT" "$MODPATH/system/fonts/RobotoStatic-Regular.ttf" 2>/dev/null
        cp -af "$CUSTOM_FONT" "$MODPATH/system/fonts/DroidSans.ttf" 2>/dev/null
        cp -af "$CUSTOM_FONT" "$MODPATH/system/fonts/DroidSans-Bold.ttf" 2>/dev/null
        for target in Roboto-Bold.ttf Roboto-Italic.ttf Roboto-BoldItalic.ttf Roboto-Medium.ttf Roboto-MediumItalic.ttf Roboto-Light.ttf Roboto-LightItalic.ttf Roboto-Thin.ttf Roboto-ThinItalic.ttf Roboto-Black.ttf Roboto-BlackItalic.ttf SourceSansPro-Regular.ttf SourceSansPro-Bold.ttf SourceSansPro-SemiBold.ttf SourceSansPro-Italic.ttf SourceSansPro-BoldItalic.ttf SourceSansPro-SemiBoldItalic.ttf; do
            cp -af "$CUSTOM_FONT" "$MODPATH/system/fonts/$target" 2>/dev/null
        done
        if [ -d /product/fonts ]; then
            for pf in /product/fonts/GoogleSans*.ttf /product/fonts/GoogleSansFlex*.ttf /product/fonts/GoogleSansText*.ttf; do
                [ -f "$pf" ] || continue
                case "$pf" in
                    *Clock*) continue ;;
                    *)
                        base="$(basename "$pf")"
                        cp -af "$CUSTOM_FONT" "$MODPATH/product/fonts/$base" 2>/dev/null
                        cp -af "$CUSTOM_FONT" "$MODPATH/system/product/fonts/$base" 2>/dev/null
                        ;;
                esac
            done
        fi
    fi

    # Regenerate emoji overlay from preserved custom_emoji.ttf
    if [ -f "$MODPATH/data/custom_emoji.ttf" ] && [ -s "$MODPATH/data/custom_emoji.ttf" ]; then
        ui_print "- Restoring active custom emoji overlay..."
        mkdir -p "$MODPATH/system/fonts" "$MODPATH/product/fonts" "$MODPATH/system/product/fonts" 2>/dev/null
        CUSTOM_EMOJI="$MODPATH/data/custom_emoji.ttf"
        cp -af "$CUSTOM_EMOJI" "$MODPATH/system/fonts/NotoColorEmoji.ttf" 2>/dev/null
        cp -af "$CUSTOM_EMOJI" "$MODPATH/product/fonts/NotoColorEmoji.ttf" 2>/dev/null
        cp -af "$CUSTOM_EMOJI" "$MODPATH/system/product/fonts/NotoColorEmoji.ttf" 2>/dev/null
        # Keep stock NotoColorEmojiFlags.ttf intact so all regional country flags render
        rm -f "$MODPATH/system/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null
        rm -f "$MODPATH/product/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null
    fi
fi

# 3. Comprehensive Stock Font Backup Protection
BACKUP_DIR="${DATA_ADB}/custom_font_backup"
if [ ! -f "$BACKUP_DIR/backup_info.json" ]; then
    # Only create stock backup if NO custom font is active to prevent backing up custom font as stock
    if [ ! -f "$MODULE_DIR/data/custom_font.ttf" ] && [ ! -f "$MODPATH/data/custom_font.ttf" ]; then
        ui_print "- Creating pristine stock system font backup..."
        mkdir -p "$BACKUP_DIR/system_fonts" "$BACKUP_DIR/etc" 2>/dev/null
        for f in /system/fonts/*; do
            [ -f "$f" ] && cp -af "$f" "$BACKUP_DIR/system_fonts/" 2>/dev/null
        done
        [ -f /system/etc/fonts.xml ] && cp -af /system/etc/fonts.xml "$BACKUP_DIR/etc/fonts.xml" 2>/dev/null
        cat <<EOF > "$BACKUP_DIR/backup_info.json"
{
  "timestamp": "$(date +%s 2>/dev/null || echo 0)",
  "android_version": "$(getprop ro.build.version.release 2>/dev/null || echo unknown)",
  "sdk_version": "$(getprop ro.build.version.sdk 2>/dev/null || echo unknown)",
  "rom": "$(getprop ro.lineage.version 2>/dev/null || getprop ro.build.display.id 2>/dev/null || echo stock)",
  "backed_up": true
}
EOF
        ui_print "- Stock font backup protected in ${BACKUP_DIR}"
    else
        ui_print "- Custom font is active; skipping backup creation to preserve stock integrity."
    fi
else
    # Existing backup exists: verify it was not contaminated with a custom font
    if [ -f "$MODPATH/data/custom_font.ttf" ] && [ -f "$BACKUP_DIR/system_fonts/Roboto-Regular.ttf" ]; then
        CUST_SZ=$(wc -c < "$MODPATH/data/custom_font.ttf" 2>/dev/null || echo 1)
        BK_SZ=$(wc -c < "$BACKUP_DIR/system_fonts/Roboto-Regular.ttf" 2>/dev/null || echo 2)
        if [ "$CUST_SZ" -eq "$BK_SZ" ]; then
            ui_print "! Warning: Detected corrupted backup containing custom font. Purging corrupted backup..."
            rm -rf "$BACKUP_DIR" 2>/dev/null
        fi
    fi
fi

# 4. Clean legacy installation & temp files
ui_print "- Cleaning up legacy installation files..."
if [ -d "$OLD_MODULE_DIR" ]; then
    rm -rf "$OLD_MODULE_DIR/system" 2>/dev/null
    rm -rf "$OLD_MODULE_DIR/product" 2>/dev/null
    rm -rf "$OLD_MODULE_DIR/bin" 2>/dev/null
    rm -rf "$OLD_MODULE_DIR/webroot" 2>/dev/null
    rm -f "$OLD_MODULE_DIR"/*.sh 2>/dev/null
    rm -f "$OLD_MODULE_DIR/module.prop" 2>/dev/null
fi
rm -f /data/local/tmp/fontify_custom_font.ttf 2>/dev/null
rm -f /data/local/tmp/fontify_emoji_*.ttf 2>/dev/null
rm -rf "$MODPATH/product/product" 2>/dev/null

# 5. Set permissions
ui_print "- Setting permissions..."
set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm_recursive "$MODPATH/bin" 0 0 0755 0755
[ -f "$MODPATH/service.sh" ] && set_perm "$MODPATH/service.sh" 0 0 0755
[ -f "$MODPATH/post-fs-data.sh" ] && set_perm "$MODPATH/post-fs-data.sh" 0 0 0755
[ -f "$MODPATH/uninstall.sh" ] && set_perm "$MODPATH/uninstall.sh" 0 0 0755
[ -f "$MODPATH/hotinstall.sh" ] && set_perm "$MODPATH/hotinstall.sh" 0 0 0755

ui_print "- Installation complete. Please reboot your device to load updated font configuration."
