#!/system/bin/sh
# Fontify - get_status.sh
# Author: Lava
# Outputs JSON status for the WebUI

if [ -d "/data/adb/modules/fontify" ]; then
    MODDIR="/data/adb/modules/fontify"
elif [ -d "/data/adb/modules/custom_font_installer" ]; then
    MODDIR="/data/adb/modules/custom_font_installer"
else
    MODDIR="${0%/*}/.."
fi

DATA_DIR="$MODDIR/data"
BACKUP_DIR="/data/adb/custom_font_backup"

CUSTOM_ACTIVE=false
ACTIVE_FONT_NAME="Roboto / Google Sans"

if [ -f "$DATA_DIR/custom_font.ttf" ] && [ -s "$DATA_DIR/custom_font.ttf" ] && [ -f "$DATA_DIR/current_font.json" ]; then
    CUSTOM_ACTIVE=true
    PARSED_NAME=$(grep -o '"font_name": *"[^"]*"' "$DATA_DIR/current_font.json" 2>/dev/null | head -n 1 | sed 's/.*"font_name": *"//;s/"//g')
    if [ -n "$PARSED_NAME" ]; then
        ACTIVE_FONT_NAME="$PARSED_NAME"
    else
        ACTIVE_FONT_NAME="Custom Font"
    fi
fi

EMOJI_ACTIVE=false
ACTIVE_EMOJI_NAME="Stock (Google)"

if [ -f "$DATA_DIR/custom_emoji.ttf" ] && [ -s "$DATA_DIR/custom_emoji.ttf" ] && [ -f "$DATA_DIR/current_emoji.json" ]; then
    EMOJI_ACTIVE=true
    PARSED_EMOJI=$(grep -o '"emoji_name": *"[^"]*"' "$DATA_DIR/current_emoji.json" 2>/dev/null | head -n 1 | sed 's/.*"emoji_name": *"//;s/"//g')
    if [ -n "$PARSED_EMOJI" ]; then
        ACTIVE_EMOJI_NAME="$PARSED_EMOJI"
    else
        ACTIVE_EMOJI_NAME="Custom Emoji"
    fi
fi

BACKUP_EXISTS=false
if [ -f "$BACKUP_DIR/backup_info.json" ]; then
    BACKUP_EXISTS=true
fi

CURRENT_CONFIG="{}"
if [ -f "$DATA_DIR/current_font.json" ]; then
    CURRENT_CONFIG=$(cat "$DATA_DIR/current_font.json" 2>/dev/null || echo "{}")
fi

CURRENT_EMOJI_CONFIG="{}"
if [ -f "$DATA_DIR/current_emoji.json" ]; then
    CURRENT_EMOJI_CONFIG=$(cat "$DATA_DIR/current_emoji.json" 2>/dev/null || echo "{}")
fi

BACKUP_INFO="{}"
if [ -f "$BACKUP_DIR/backup_info.json" ]; then
    BACKUP_INFO=$(cat "$BACKUP_DIR/backup_info.json" 2>/dev/null || echo "{}")
fi

AND_VER=$(getprop ro.build.version.release 2>/dev/null || echo "16")
SDK_VER=$(getprop ro.build.version.sdk 2>/dev/null || echo "36")
DEV_MODEL=$(getprop ro.product.model 2>/dev/null || getprop ro.product.name 2>/dev/null || echo "POCO F7")
DEV_DEVICE=$(getprop ro.product.device 2>/dev/null || echo "onyx")
DEV_ABI=$(getprop ro.product.cpu.abi 2>/dev/null || echo "arm64-v8a")
ROM_VER=$(getprop ro.lineage.version 2>/dev/null || getprop ro.build.display.id 2>/dev/null || echo "LineageOS")

cat <<EOF
{
  "active": $CUSTOM_ACTIVE,
  "active_font_name": "$ACTIVE_FONT_NAME",
  "emoji_active": $EMOJI_ACTIVE,
  "active_emoji_name": "$ACTIVE_EMOJI_NAME",
  "backup_exists": $BACKUP_EXISTS,
  "config": $CURRENT_CONFIG,
  "emoji_config": $CURRENT_EMOJI_CONFIG,
  "backup_info": $BACKUP_INFO,
  "device": {
    "model": "$DEV_MODEL",
    "device": "$DEV_DEVICE",
    "abi": "$DEV_ABI",
    "android_version": "$AND_VER",
    "sdk_version": "$SDK_VER",
    "rom": "$ROM_VER"
  }
}
EOF
