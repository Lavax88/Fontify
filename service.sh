#!/system/bin/sh
# Fontify - service.sh
# Runs at late_start service

MODDIR=${0%/*}

# Wait for boot completion
until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 2
done

# Ensure correct permissions and SELinux contexts for overlaid fonts
for dir in "$MODDIR/system" "$MODDIR/product"; do
    if [ -d "$dir" ]; then
        chmod -R 755 "$dir" 2>/dev/null
        find "$dir" -type f -exec chmod 644 {} + 2>/dev/null
        chown -R 0:0 "$dir" 2>/dev/null
        chcon -R u:object_r:system_file:s0 "$dir" 2>/dev/null
    fi
done
