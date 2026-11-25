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
[ -f "$MODPATH/bin/lib_overlay.sh" ] && . "$MODPATH/bin/lib_overlay.sh"
if [ -d "$MODULE_DIR/data" ] && [ "$(ls -A "$MODULE_DIR/data" 2>/dev/null)" ]; then
    ui_print "- Preserving existing font and emoji configuration..."
    cp -af "$MODULE_DIR/data/." "$MODPATH/data/" 2>/dev/null

    # Regenerate font overlay from preserved custom_font.ttf
    if [ -f "$MODPATH/data/custom_font.ttf" ] && [ -s "$MODPATH/data/custom_font.ttf" ]; then
        ui_print "- Restoring active custom font overlay..."
        populate_font_overlay "$MODPATH" "$MODPATH/data/custom_font.ttf"
    fi

    # Regenerate emoji overlay from preserved custom_emoji.ttf
    if [ -f "$MODPATH/data/custom_emoji.ttf" ] && [ -s "$MODPATH/data/custom_emoji.ttf" ]; then
        ui_print "- Restoring active custom emoji overlay..."
        populate_emoji_overlay "$MODPATH" "$MODPATH/data/custom_emoji.ttf"
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
