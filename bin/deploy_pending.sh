#!/system/bin/sh
# Fontify - deploy_pending.sh
# Author: Lava
# Deploys staged fonts & emojis immediately before soft reboot or system reboot

. "${0%/*}/lib_overlay.sh"
MODDIR="$(resolve_moddir "$0")"

DATA_DIR="$MODDIR/data"
CUSTOM_FONT="$DATA_DIR/custom_font.ttf"
CUSTOM_EMOJI="$DATA_DIR/custom_emoji.ttf"

# 0. Safety check: If reverting to stock or full reboot required, soft reboot causes a boot loop
# because live Magisk/KernelSU mount namespace cannot be torn down without a kernel reboot.
# Upgrade soft reboot to full hardware reboot to prevent device from bootlooping!
if [ -f "$DATA_DIR/.full_reboot_required" ] || { [ ! -f "$CUSTOM_FONT" ] && [ ! -f "$CUSTOM_EMOJI" ]; }; then
    rm -f "$DATA_DIR/.full_reboot_required" 2>/dev/null
    /system/bin/svc power reboot || /system/bin/setprop sys.powerctl reboot || /system/bin/reboot || reboot
    exit 2
fi

# 1. Deploy custom font if staged or modified
if [ -f "$CUSTOM_FONT" ] && [ -s "$CUSTOM_FONT" ]; then
    populate_font_overlay "$MODDIR" "$CUSTOM_FONT"
    rm -f "$DATA_DIR/.staged_font_pending" 2>/dev/null
fi

# 2. Deploy custom emoji if staged or modified
if [ -f "$CUSTOM_EMOJI" ] && [ -s "$CUSTOM_EMOJI" ]; then
    populate_emoji_overlay "$MODDIR" "$CUSTOM_EMOJI"
    rm -f "$DATA_DIR/.staged_emoji_pending" 2>/dev/null
fi

# 3. Ensure correct permissions and SELinux contexts
apply_overlay_permissions "$MODDIR"

# 4. Synchronize NoMount VFS redirection rules if NoMount metamodule is present
if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
    sh "$MODDIR/bin/nomount_sync.sh" sync 2>/dev/null
fi

# 5. Clear Android font caches and updatable font overrides
clear_android_font_caches

exit 0
