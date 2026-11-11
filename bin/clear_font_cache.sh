#!/system/bin/sh
# Fontify - clear_font_cache.sh
# Author: Lava
# Purges updatable font overrides from /data/fonts and clears Android FontManagerService caches

rm -rf /data/fonts/files/* 2>/dev/null
rm -rf /data/fonts/config/* 2>/dev/null
rm -rf /data/system/font_cache/* 2>/dev/null

if [ "$(getprop sys.boot_completed 2>/dev/null)" = "1" ]; then
    cmd font clear 2>/dev/null || true
fi
