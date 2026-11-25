#!/system/bin/sh
# Fontify - service.sh
# Runs at late_start service

MODDIR=${0%/*}
[ -f "$MODDIR/bin/lib_overlay.sh" ] && . "$MODDIR/bin/lib_overlay.sh"

# Wait for boot completion
until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

# Ensure SELinux context on system overlay is intact
[ -d "$MODDIR/system" ] && chcon -R u:object_r:system_file:s0 "$MODDIR/system" 2>/dev/null

# Clean updatable font overrides and clear FontManagerService runtime table
if command -v clear_android_font_caches >/dev/null 2>&1; then
    clear_android_font_caches
else
    cmd font clear 2>/dev/null || true
fi
