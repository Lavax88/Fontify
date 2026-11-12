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

# 2. Preserve existing user font/emoji data & overlay across updates / hot installs
if [ -d "$MODULE_DIR/data" ] && [ "$(ls -A "$MODULE_DIR/data" 2>/dev/null)" ]; then
    ui_print "- Preserving existing font and emoji configuration..."
    cp -af "$MODULE_DIR/data/." "$MODPATH/data/" 2>/dev/null
    if { [ -f "$MODPATH/data/custom_font.ttf" ] && [ -s "$MODPATH/data/custom_font.ttf" ]; } || { [ -f "$MODPATH/data/custom_emoji.ttf" ] && [ -s "$MODPATH/data/custom_emoji.ttf" ]; }; then
        if [ -d "$MODULE_DIR/system" ]; then
            cp -af "$MODULE_DIR/system" "$MODPATH/" 2>/dev/null
        fi
        if [ -d "$MODULE_DIR/product" ]; then
            cp -af "$MODULE_DIR/product" "$MODPATH/" 2>/dev/null
        fi
    fi
fi

# 3. Clean legacy installation & temp files
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

# 4. Set permissions
ui_print "- Setting permissions..."
set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm_recursive "$MODPATH/bin" 0 0 0755 0755
[ -f "$MODPATH/service.sh" ] && set_perm "$MODPATH/service.sh" 0 0 0755
[ -f "$MODPATH/post-fs-data.sh" ] && set_perm "$MODPATH/post-fs-data.sh" 0 0 0755
[ -f "$MODPATH/uninstall.sh" ] && set_perm "$MODPATH/uninstall.sh" 0 0 0755
[ -f "$MODPATH/hotinstall.sh" ] && set_perm "$MODPATH/hotinstall.sh" 0 0 0755

# 5. Request Hot Install (no reboot required on supported KernelSU/SukiSU managers)
export MODULE_HOT_INSTALL_REQUEST=true
export MODULE_HOT_RUN_SCRIPT=hotinstall.sh

if [ "$KSU_HAS_HOT_INSTALL" = "true" ]; then
    ui_print "- Hot install supported! Activating module without reboot..."
else
    ui_print "- Installation complete. Open WebUI to customize fonts."
fi
