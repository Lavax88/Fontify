<div align="center">
  <h1>Fontify</h1>
  <p>Customize Android system fonts seamlessly using a built-in Material 3 Expressive WebUI.</p>
</div>

Fontify allows you to apply any custom `.ttf`, `.otf`, or `.ttc` font across SystemUI, Settings, Launchers, and third-party apps without permanently modifying read-only system partitions.

---

## Features

- **Material 3 Expressive WebUI**: Dynamic wallpaper Monet palette theming, interactive live font playground, and real-time preview built with strict TypeScript and Vite.
- **Variable Font (`fvar`) Engine**: Zero-dependency binary SFNT/OpenType parser with live tuning of variation axes (`wght`, `wdth`, `opsz`, `slnt`, etc.) and instant presets.
- **Universal Root Bridge**: Native support for KernelSU, KernelSU Next, APatch, and MMRL WebUI environments with automatic timeout guards.
- **Optimized Data Pipeline**: 128 KB chunked streaming to `/data/local/tmp` with integrity verification and guaranteed cleanup.
- **1-Click Revert**: Instantly restore original stock system fonts with clean overlay removal.

---

## Compatibility

- **Tested on:** LineageOS 23.2 (Android 16)
- **Root Solutions:** KernelSU, KernelSU Next, APatch, Magisk (via MMRL / WebUI host)
- **Android Versions:** Android 12 through Android 16+

---

## Installation

1. Ensure you have a **meta-module** installed (such as Magic Mount, OverlayFS, Mountify, etc.).
2. Download the latest Fontify release (`Fontify-v*.zip`).
3. Flash the zip in your root manager (KernelSU / APatch / Magisk).
4. Open the module WebUI from your manager, import your font, customize styles, and tap **Apply Font**.
5. Reboot to reload system fonts.

---

## Building from Source

### Prerequisites
- Linux / macOS / WSL
- Node.js (current LTS, v20+ or v22+) & npm
- `zip` utility

### Build Flashable Module
```bash
# Install dependencies, compile WebUI, and package flashable zip
chmod +x build.sh
./build.sh
```

The output zip `Fontify-<version>.zip` will be generated in the root directory.

> [!NOTE]
> The pre-compiled `webroot/` directory is committed in the repository so that users can flash directly from git clones or zip downloads without requiring a Node.js development environment.

### Development Server
You can iterate on the WebUI locally on desktop using the included root bridge mock:
```bash
# Start local Vite development server
npm run dev

# Run strict type checking
npm run typecheck

# Run unit tests
npm test
```

---

## Issues & Support

If you encounter any issues or the font does not reflect on your device, please open an issue on GitHub with your device model, ROM version, and root manager details.
