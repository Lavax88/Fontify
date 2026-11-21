#!/system/bin/sh
# Fontify - deploy_pending.sh
# Author: Lava
# Deploys staged fonts & emojis immediately before soft reboot or system reboot

if [ -d "/data/adb/modules/fontify" ]; then
    MODDIR="/data/adb/modules/fontify"
elif [ -d "/data/adb/modules/custom_font_installer" ]; then
    MODDIR="/data/adb/modules/custom_font_installer"
else
    MODDIR="${0%/*}/.."
fi

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
    mkdir -p "$MODDIR/system/fonts" "$MODDIR/product/fonts" "$MODDIR/system/product/fonts" 2>/dev/null
    cp -af "$CUSTOM_FONT" "$MODDIR/system/fonts/Roboto-Regular.ttf" 2>/dev/null
    cp -af "$CUSTOM_FONT" "$MODDIR/system/fonts/RobotoFlex-Regular.ttf" 2>/dev/null
    cp -af "$CUSTOM_FONT" "$MODDIR/system/fonts/RobotoStatic-Regular.ttf" 2>/dev/null
    cp -af "$CUSTOM_FONT" "$MODDIR/system/fonts/DroidSans.ttf" 2>/dev/null
    cp -af "$CUSTOM_FONT" "$MODDIR/system/fonts/DroidSans-Bold.ttf" 2>/dev/null
    for target in Roboto-Bold.ttf Roboto-Italic.ttf Roboto-BoldItalic.ttf Roboto-Medium.ttf Roboto-MediumItalic.ttf Roboto-Light.ttf Roboto-LightItalic.ttf Roboto-Thin.ttf Roboto-ThinItalic.ttf Roboto-Black.ttf Roboto-BlackItalic.ttf SourceSansPro-Regular.ttf SourceSansPro-Bold.ttf SourceSansPro-SemiBold.ttf SourceSansPro-Italic.ttf SourceSansPro-BoldItalic.ttf SourceSansPro-SemiBoldItalic.ttf; do
        cp -af "$CUSTOM_FONT" "$MODDIR/system/fonts/$target" 2>/dev/null
    done
    if [ -d /product/fonts ]; then
        for pf in /product/fonts/GoogleSans*.ttf /product/fonts/GoogleSansFlex*.ttf /product/fonts/GoogleSansText*.ttf; do
            [ -f "$pf" ] || continue
            case "$pf" in
                *Clock*) continue ;;
                *)
                    base="$(basename "$pf")"
                    cp -af "$CUSTOM_FONT" "$MODDIR/product/fonts/$base" 2>/dev/null
                    cp -af "$CUSTOM_FONT" "$MODDIR/system/product/fonts/$base" 2>/dev/null
                    ;;
            esac
        done
    fi
    rm -f "$DATA_DIR/.staged_font_pending" 2>/dev/null
fi

# 2. Deploy custom emoji if staged or modified
if [ -f "$CUSTOM_EMOJI" ] && [ -s "$CUSTOM_EMOJI" ]; then
    mkdir -p "$MODDIR/system/fonts" "$MODDIR/product/fonts" "$MODDIR/system/product/fonts" 2>/dev/null
    cp -af "$CUSTOM_EMOJI" "$MODDIR/system/fonts/NotoColorEmoji.ttf" 2>/dev/null
    cp -af "$CUSTOM_EMOJI" "$MODDIR/product/fonts/NotoColorEmoji.ttf" 2>/dev/null
    cp -af "$CUSTOM_EMOJI" "$MODDIR/system/product/fonts/NotoColorEmoji.ttf" 2>/dev/null
    rm -f "$MODDIR/system/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null
    rm -f "$MODDIR/product/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null
    rm -f "$DATA_DIR/.staged_emoji_pending" 2>/dev/null
fi

# 3. Ensure correct permissions and SELinux contexts
for dir in "$MODDIR/system" "$MODDIR/product"; do
    if [ -d "$dir" ]; then
        chown -R 0:0 "$dir" 2>/dev/null
        chmod -R 755 "$dir" 2>/dev/null
        find "$dir" -type f -exec chmod 644 {} + 2>/dev/null
        chcon -R u:object_r:system_file:s0 "$dir" 2>/dev/null
    fi
done

# 4. Synchronize NoMount VFS redirection rules if NoMount metamodule is present
if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
    sh "$MODDIR/bin/nomount_sync.sh" sync 2>/dev/null
fi

# 5. Clear Android font caches and updatable font overrides
if [ -f "$MODDIR/bin/clear_font_cache.sh" ]; then
    sh "$MODDIR/bin/clear_font_cache.sh" 2>/dev/null
else
    rm -rf /data/fonts/files/* 2>/dev/null
    rm -rf /data/fonts/config/* 2>/dev/null
    rm -rf /data/system/font_cache/* 2>/dev/null
fi

exit 0
