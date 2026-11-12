#!/system/bin/sh
# Fontify - nomount_sync.sh
# Author: Lava
# Synchronizes Kernel VFS path redirection rules when NoMount metamodule is active

if [ -d "/data/adb/modules/fontify" ]; then
    MODDIR="/data/adb/modules/fontify"
elif [ -d "/data/adb/modules/custom_font_installer" ]; then
    MODDIR="/data/adb/modules/custom_font_installer"
else
    MODDIR="${0%/*}/.."
fi

ACTION="$1"

NM_BIN=""
if [ -x "/data/adb/modules/nomount/bin/nm" ]; then
    NM_BIN="/data/adb/modules/nomount/bin/nm"
elif command -v nm >/dev/null 2>&1; then
    NM_BIN="nm"
fi

[ -n "$NM_BIN" ] || exit 0

# Check if NoMount kernel driver is actually loaded
"$NM_BIN" version >/dev/null 2>&1 || exit 0

sync_tree() {
    local target_dir="$1"
    local prefix="$2"
    [ -d "$target_dir" ] || return 0

    find "$target_dir" -type f 2>/dev/null | while IFS= read -r f; do
        rel="${f#"$target_dir"}"
        vpath="${prefix}${rel}"
        case "$vpath" in
            /system/product/*) vpath="/product/${vpath#/system/product/}" ;;
        esac
        "$NM_BIN" rule add "$vpath" "$f" 2>/dev/null || true
    done
}

case "$ACTION" in
    sync)
        sync_tree "$MODDIR/system" "/system"
        sync_tree "$MODDIR/product" "/product"
        ;;
    del_emoji)
        "$NM_BIN" rule del "/system/fonts/NotoColorEmoji.ttf" 2>/dev/null || true
        "$NM_BIN" rule del "/system/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null || true
        "$NM_BIN" rule del "/system/fonts/NotoColorEmojiLegacy.ttf" 2>/dev/null || true
        "$NM_BIN" rule del "/product/fonts/NotoColorEmoji.ttf" 2>/dev/null || true
        "$NM_BIN" rule del "/system/product/fonts/NotoColorEmoji.ttf" 2>/dev/null || true
        ;;
    del_fonts)
        for target in Roboto-Regular.ttf RobotoFlex-Regular.ttf RobotoStatic-Regular.ttf DroidSans.ttf DroidSans-Bold.ttf Roboto-Bold.ttf Roboto-Italic.ttf Roboto-BoldItalic.ttf Roboto-Medium.ttf Roboto-MediumItalic.ttf Roboto-Light.ttf Roboto-LightItalic.ttf Roboto-Thin.ttf Roboto-ThinItalic.ttf Roboto-Black.ttf Roboto-BlackItalic.ttf SourceSansPro-Regular.ttf SourceSansPro-Bold.ttf SourceSansPro-SemiBold.ttf SourceSansPro-Italic.ttf SourceSansPro-BoldItalic.ttf SourceSansPro-SemiBoldItalic.ttf; do
            "$NM_BIN" rule del "/system/fonts/$target" 2>/dev/null || true
        done
        if [ -d /product/fonts ]; then
            for pf in /product/fonts/GoogleSans*.ttf /product/fonts/GoogleSansFlex*.ttf /product/fonts/GoogleSansText*.ttf; do
                [ -f "$pf" ] || continue
                case "$pf" in
                    *Clock*) continue ;;
                    *)
                        base="$(basename "$pf")"
                        "$NM_BIN" rule del "/product/fonts/$base" 2>/dev/null || true
                        "$NM_BIN" rule del "/system/product/fonts/$base" 2>/dev/null || true
                        ;;
                esac
            done
        fi
        ;;
    del)
        if [ -n "$2" ]; then
            "$NM_BIN" rule del "$2" 2>/dev/null || true
        fi
        ;;
esac

exit 0
