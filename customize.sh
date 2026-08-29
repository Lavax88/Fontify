#!/sbin/sh
# Fontify - customize.sh
# Author: Lava

SKIPUNZIP=0

# Define Paths
MODID="fontify"
DATA_ADB="/data/adb"
MODULE_DIR="${DATA_ADB}/modules/${MODID}"
OLD_MODULE_DIR="${DATA_ADB}/modules/custom_font_installer"

# 1. Clean previous installations
ui_print "- Cleaning up previous installation files..."
for dir in "$MODULE_DIR" "$OLD_MODULE_DIR"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir/system" 2>/dev/null
        rm -rf "$dir/bin" 2>/dev/null
        rm -rf "$dir/webroot" 2>/dev/null
        rm -f "$dir"/*.sh 2>/dev/null
        rm -f "$dir/module.prop" 2>/dev/null
    fi
done

# 2. Prepare module directories
ui_print "- Setting up directory structure..."
mkdir -p "$MODPATH/bin"
mkdir -p "$MODPATH/webroot"
mkdir -p "$MODPATH/data"

# 3. Set permissions
ui_print "- Setting permissions..."
set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm_recursive "$MODPATH/bin" 0 0 0755 0755
[ -f "$MODPATH/service.sh" ] && set_perm "$MODPATH/service.sh" 0 0 0755
[ -f "$MODPATH/post-fs-data.sh" ] && set_perm "$MODPATH/post-fs-data.sh" 0 0 0755
[ -f "$MODPATH/uninstall.sh" ] && set_perm "$MODPATH/uninstall.sh" 0 0 0755

ui_print "- Installation complete. Open WebUI to customize fonts."
