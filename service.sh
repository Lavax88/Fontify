#!/system/bin/sh
# Fontify - service.sh
# Runs at late_start service

MODDIR=${0%/*}

# Wait for boot completion
until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

# Ensure SELinux context on system overlay is intact
[ -d "$MODDIR/system" ] && chcon -R u:object_r:system_file:s0 "$MODDIR/system" 2>/dev/null

# If custom font is active, ensure runtime FontManagerService is cleared of any leftover system font overrides
if [ -f "$MODDIR/data/custom_font.ttf" ]; then
    cmd font clear 2>/dev/null || true
fi
