#!/system/bin/sh
# Fontify - restore_stock.sh
# Safely reverts all font overlays and restores original stock system fonts across all namespaces

if [ -d "/data/adb/modules/fontify" ]; then
    MODDIR="/data/adb/modules/fontify"
elif [ -d "/data/adb/modules/custom_font_installer" ]; then
    MODDIR="/data/adb/modules/custom_font_installer"
else
    MODDIR="${0%/*}/.."
fi

DATA_DIR="$MODDIR/data"
BACKUP_DIR="/data/adb/custom_font_backup"
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

# 1. Unmount across current namespace, master PID 1 namespace, and su -M global namespace
for target in $TARGET_FONTS; do
    umount -l "$target" 2>/dev/null
    if command -v nsenter >/dev/null 2>&1; then
        nsenter -t 1 -m -- umount -l "$target" 2>/dev/null
    fi
    if command -v su >/dev/null 2>&1; then
        su -M -c "umount -l $target" 2>/dev/null
    fi
done

# Clean any dynamically listed fontify mounts in /proc/mounts
for mp in $(grep -F "fontify_custom_font" /proc/mounts 2>/dev/null | awk '{print $2}'); do
    umount -l "$mp" 2>/dev/null
done
if command -v nsenter >/dev/null 2>&1; then
    for mp in $(nsenter -t 1 -m grep -F "fontify_custom_font" /proc/mounts 2>/dev/null | awk '{print $2}'); do
        nsenter -t 1 -m -- umount -l "$mp" 2>/dev/null
    done
fi

# 2. Clean custom font active files
rm -f "$DATA_DIR/current_font.json" "$DATA_DIR/custom_font.ttf" 2>/dev/null
rm -f "$BACKUP_DIR/current_font.json" "$BACKUP_DIR/custom_font.ttf" 2>/dev/null
rm -f "$EXTERNAL_FONT" 2>/dev/null
rm -rf /data/fonts/files/* 2>/dev/null
rm -rf /data/fonts/config/* 2>/dev/null

# 3. Completely delete module overlay directories so nothing is overlaid
rm -rf "$MODDIR/system" 2>/dev/null
rm -rf "$MODDIR/product" 2>/dev/null

# 4. Clear font caches
rm -rf /data/system/font_cache/* 2>/dev/null

echo '{"success": true, "message": "Custom font removed and stock font restored. Please reboot to apply."}'
exit 0
