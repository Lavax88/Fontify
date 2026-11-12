#!/system/bin/sh
# Fontify - hotinstall.sh
# Executed immediately after KernelSU/SukiSU hot-installs the module without reboot

MODDIR=${0%/*}
DATA_DIR="$MODDIR/data"
CUSTOM_FONT="$DATA_DIR/custom_font.ttf"
CUSTOM_EMOJI="$DATA_DIR/custom_emoji.ttf"

# Ensure helper scripts remain executable
chmod 755 "$MODDIR/bin"/*.sh 2>/dev/null

# Preserve permissions and SELinux contexts if a custom font or emoji overlay is present
if { [ -f "$CUSTOM_FONT" ] && [ -s "$CUSTOM_FONT" ]; } || { [ -f "$CUSTOM_EMOJI" ] && [ -s "$CUSTOM_EMOJI" ]; }; then
    for dir in "$MODDIR/system" "$MODDIR/product"; do
        if [ -d "$dir" ]; then
            chown -R 0:0 "$dir" 2>/dev/null
            chmod -R 755 "$dir" 2>/dev/null
            find "$dir" -type f -exec chmod 644 {} + 2>/dev/null
            chcon -R u:object_r:system_file:s0 "$dir" 2>/dev/null
        fi
    done
fi

# Re-synchronize NoMount VFS redirection rules with new module inodes
if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
    sh "$MODDIR/bin/nomount_sync.sh" sync 2>/dev/null
fi

# Refresh font caches if system is already booted
if [ -f "$MODDIR/bin/clear_font_cache.sh" ]; then
    sh "$MODDIR/bin/clear_font_cache.sh" 2>/dev/null
else
    cmd font clear 2>/dev/null || true
fi

exit 0
