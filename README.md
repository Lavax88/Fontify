<div align="center">
  <h1>Fontify</h1>
  <p>Customize Android system fonts seamlessly using a built-in Material 3 Expressive WebUI.</p>
</div>

Fontify allows you to apply any custom `.ttf`, `.otf`, or `.ttc` font across SystemUI, Settings, Launchers, and third-party apps without permanently modifying read-only system partitions.

---

## Features

- **Material 3 Expressive WebUI**: Dynamic wallpaper Monet palette theming, interactive live font playground, and real-time preview.
- **Variable Font (`fvar`) Engine**: Live tuning of variation axes (`wght`, `wdth`, `opsz`, `slnt`, etc.) with instant presets.
- **1-Click Revert**: Instantly restore original stock system fonts with clean fallback.

---

## Compatibility

- **Tested on:** LineageOS 23.2 (Android 16)
- **Root Solutions:** KernelSU, KernelSU Next, APatch, Magisk
- **Android Versions:** Android 12 through Android 16+

---

## Installation

1. Ensure you have a **meta-module** installed (such as Magic Mount, OverlayFS, Mountify, etc.).
2. Download the latest Fontify release.
3. Flash the zip in your root manager (KernelSU / APatch / Magisk).
4. Open the module WebUI from your manager, import your font, customize styles, and tap **Apply Font**.
5. Reboot to reload system fonts.

---

## Building from Source

```bash
chmod +x build.sh
./build.sh
```

---

## Issues & Support

If you encounter any issues or the font does not reflect on your device, please open an issue on GitHub with your device model, ROM version, and root manager details.
