#!/system/bin/sh
# Fontify - post-fs-data.sh
# Runs at early post-fs-data mode

MODDIR=${0%/*}
DATA_DIR="$MODDIR/data"
CUSTOM_FONT="$DATA_DIR/custom_font.ttf"
CUSTOM_EMOJI="$DATA_DIR/custom_emoji.ttf"

# Clean legacy external temp files and any legacy XML overrides
rm -f /data/local/tmp/fontify_custom_font.ttf 2>/dev/null
rm -f /data/local/tmp/fontify_emoji_*.ttf 2>/dev/null
rm -rf "$MODDIR/system/etc" "$MODDIR/product/etc" "$MODDIR/system/product/etc" 2>/dev/null

# Self-healing: if custom font exists but overlay is missing or corrupted, regenerate
if [ -f "$CUSTOM_FONT" ] && [ -s "$CUSTOM_FONT" ]; then
    CURRENT_ROBOTO_SZ=$(wc -c < "$MODDIR/system/fonts/Roboto-Regular.ttf" 2>/dev/null || echo 0)
    if [ ! -f "$MODDIR/system/fonts/Roboto-Regular.ttf" ] || [ "$CURRENT_ROBOTO_SZ" -lt 1000 ]; then
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
    fi
fi

# Self-healing: if custom emoji exists but overlay is missing or corrupted, regenerate
if [ -f "$CUSTOM_EMOJI" ] && [ -s "$CUSTOM_EMOJI" ]; then
    CURRENT_EMOJI_SZ=$(wc -c < "$MODDIR/system/fonts/NotoColorEmoji.ttf" 2>/dev/null || echo 0)
    if [ ! -f "$MODDIR/system/fonts/NotoColorEmoji.ttf" ] || [ "$CURRENT_EMOJI_SZ" -lt 1000 ]; then
        mkdir -p "$MODDIR/system/fonts" "$MODDIR/product/fonts" "$MODDIR/system/product/fonts" 2>/dev/null
        cp -af "$CUSTOM_EMOJI" "$MODDIR/system/fonts/NotoColorEmoji.ttf" 2>/dev/null
        cp -af "$CUSTOM_EMOJI" "$MODDIR/system/fonts/NotoColorEmojiFlags.ttf" 2>/dev/null
        cp -af "$CUSTOM_EMOJI" "$MODDIR/product/fonts/NotoColorEmoji.ttf" 2>/dev/null
        cp -af "$CUSTOM_EMOJI" "$MODDIR/system/product/fonts/NotoColorEmoji.ttf" 2>/dev/null
    fi
fi

if { [ -f "$CUSTOM_FONT" ] && [ -s "$CUSTOM_FONT" ]; } || { [ -f "$CUSTOM_EMOJI" ] && [ -s "$CUSTOM_EMOJI" ]; }; then
    # Ensure correct permissions and SELinux contexts for overlaid system files
    for dir in "$MODDIR/system" "$MODDIR/product"; do
        if [ -d "$dir" ]; then
            chown -R 0:0 "$dir" 2>/dev/null
            chmod -R 755 "$dir" 2>/dev/null
            find "$dir" -type f -exec chmod 644 {} + 2>/dev/null
            chcon -R u:object_r:system_file:s0 "$dir" 2>/dev/null
        fi
    done

    # Sync NoMount VFS redirection rules if NoMount metamodule is present
    if [ -f "$MODDIR/bin/nomount_sync.sh" ]; then
        sh "$MODDIR/bin/nomount_sync.sh" sync 2>/dev/null
    fi
else
    # Stock font & emoji mode - clean overlay tree so stock system fonts are used
    rm -rf "$MODDIR/system" 2>/dev/null
    rm -rf "$MODDIR/product" 2>/dev/null
fi

# Clean Android updatable font overrides and caches so font bypass is prevented in both custom and stock modes
if [ -f "$MODDIR/bin/clear_font_cache.sh" ]; then
    sh "$MODDIR/bin/clear_font_cache.sh" 2>/dev/null
else
    rm -rf /data/fonts/files/* 2>/dev/null
    rm -rf /data/fonts/config/* 2>/dev/null
    rm -rf /data/system/font_cache/* 2>/dev/null
fi
