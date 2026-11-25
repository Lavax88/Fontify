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
    if [ -f "$MODDIR/bin/lib_overlay.sh" ]; then
        . "$MODDIR/bin/lib_overlay.sh"
        apply_overlay_permissions "$MODDIR"
    fi
fi

# Do not live-swap font inodes or clear font caches while booted to prevent
# SIGBUS crashes in WebView/Zygote. Changes will activate cleanly upon device restart.

exit 0
