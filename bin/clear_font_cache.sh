#!/system/bin/sh
# Fontify - clear_font_cache.sh
# Author: Lava
# Purges updatable font overrides from /data/fonts and clears Android FontManagerService caches from storage

rm -rf /data/fonts/files/* 2>/dev/null
rm -rf /data/fonts/config/* 2>/dev/null
rm -rf /data/system/font_cache/* 2>/dev/null
exit 0
