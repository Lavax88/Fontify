#!/sbin/sh
# Fontify - uninstall.sh
# Author: Lava

DATA_ADB="/data/adb"
BACKUP_DIR="${DATA_ADB}/custom_font_backup"

# Clean up module directories and backups
rm -rf "${DATA_ADB}/modules/fontify" 2>/dev/null
rm -rf "${DATA_ADB}/modules/custom_font_installer" 2>/dev/null
rm -rf "$BACKUP_DIR" 2>/dev/null

# Clean up font caches if any
rm -rf /data/system/font_cache 2>/dev/null
rm -rf /data/fonts/files 2>/dev/null
