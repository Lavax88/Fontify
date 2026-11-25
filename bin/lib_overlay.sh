#!/system/bin/sh
# Fontify - lib_overlay.sh
# Shared POSIX shell module for MODDIR resolution, font/emoji overlay population,
# SELinux permissions, and Android font cache cleanup.

resolve_moddir() {
    _script_path="$1"
    if [ -d "/data/adb/modules/fontify" ]; then
        printf '%s\n' "/data/adb/modules/fontify"
    elif [ -d "/data/adb/modules/custom_font_installer" ]; then
        printf '%s\n' "/data/adb/modules/custom_font_installer"
    else
        printf '%s\n' "${_script_path%/*}/.."
    fi
}

populate_font_overlay() {
    _ov_moddir="$1"
    _ov_src="$2"
    [ -f "$_ov_src" ] && [ -s "$_ov_src" ] || return 1

    mkdir -p "$_ov_moddir/system/fonts" "$_ov_moddir/product/fonts" "$_ov_moddir/system/product/fonts" 2>/dev/null

    cp -af "$_ov_src" "$_ov_moddir/system/fonts/Roboto-Regular.ttf" 2>/dev/null
    cp -af "$_ov_src" "$_ov_moddir/system/fonts/RobotoFlex-Regular.ttf" 2>/dev/null
    cp -af "$_ov_src" "$_ov_moddir/system/fonts/RobotoStatic-Regular.ttf" 2>/dev/null
    cp -af "$_ov_src" "$_ov_moddir/system/fonts/DroidSans.ttf" 2>/dev/null
    cp -af "$_ov_src" "$_ov_moddir/system/fonts/DroidSans-Bold.ttf" 2>/dev/null

    for _target in Roboto-Bold.ttf Roboto-Italic.ttf Roboto-BoldItalic.ttf Roboto-Medium.ttf Roboto-MediumItalic.ttf Roboto-Light.ttf Roboto-LightItalic.ttf Roboto-Thin.ttf Roboto-ThinItalic.ttf Roboto-Black.ttf Roboto-BlackItalic.ttf SourceSansPro-Regular.ttf SourceSansPro-Bold.ttf SourceSansPro-SemiBold.ttf SourceSansPro-Italic.ttf SourceSansPro-BoldItalic.ttf SourceSansPro-SemiBoldItalic.ttf; do
        cp -af "$_ov_src" "$_ov_moddir/system/fonts/$_target" 2>/dev/null
    done

    if [ -d /product/fonts ]; then
        for _pf in /product/fonts/GoogleSans*.ttf /product/fonts/GoogleSansFlex*.ttf /product/fonts/GoogleSansText*.ttf; do
            [ -f "$_pf" ] || continue
            case "$_pf" in
                *Clock*) continue ;; # Preserve lockscreen clock fonts
                *)
                    _base="$(basename "$_pf")"
                    cp -af "$_ov_src" "$_ov_moddir/product/fonts/$_base" 2>/dev/null
                    cp -af "$_ov_src" "$_ov_moddir/system/product/fonts/$_base" 2>/dev/null
                    ;;
            esac
        done
    fi
}

populate_emoji_overlay() {
    _ov_moddir="$1"
    _ov_src="$2"
    [ -f "$_ov_src" ] && [ -s "$_ov_src" ] || return 1

    mkdir -p "$_ov_moddir/system/fonts" "$_ov_moddir/product/fonts" "$_ov_moddir/system/product/fonts" 2>/dev/null

    cp -af "$_ov_src" "$_ov_moddir/system/fonts/NotoColorEmoji.ttf" 2>/dev/null
    cp -af "$_ov_src" "$_ov_moddir/product/fonts/NotoColorEmoji.ttf" 2>/dev/null
    cp -af "$_ov_src" "$_ov_moddir/system/product/fonts/NotoColorEmoji.ttf" 2>/dev/null

    # Preserve stock NotoColorEmojiFlags.ttf so regional country flags always render
    rm -f "$_ov_moddir/system/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null
    rm -f "$_ov_moddir/product/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null

    if [ -f /system/fonts/NotoColorEmojiLegacy.ttf ]; then
        cp -af "$_ov_src" "$_ov_moddir/system/fonts/NotoColorEmojiLegacy.ttf" 2>/dev/null
    fi
}

apply_overlay_permissions() {
    _ov_moddir="$1"
    for _dir in "$_ov_moddir/system" "$_ov_moddir/product"; do
        if [ -d "$_dir" ]; then
            chown -R 0:0 "$_dir" 2>/dev/null
            chmod -R 755 "$_dir" 2>/dev/null
            find "$_dir" -type f -exec chmod 644 {} + 2>/dev/null
            chcon -R u:object_r:system_file:s0 "$_dir" 2>/dev/null
        fi
    done
}

clear_android_font_caches() {
    rm -rf /data/fonts/files/* 2>/dev/null
    rm -rf /data/fonts/config/* 2>/dev/null
    rm -rf /data/system/font_cache/* 2>/dev/null
}
