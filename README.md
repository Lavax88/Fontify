<div align="center">
  <h1>Fontify</h1>
  <p>Customize Android system fonts seamlessly using a built-in Material 3 Expressive WebUI.</p>
</div>

Fontify allows you to apply any custom `.ttf`, `.otf`, or `.ttc` font across SystemUI, Settings, Launchers, and third-party apps without permanently modifying read-only system partitions.

---

## Features

- **Material 3 Expressive WebUI**: Dynamic wallpaper Monet palette theming, interactive live font playground, and real-time preview built with strict TypeScript and Vite.
- **Online Font & Emoji Catalog (Browse)**: Discover, search, and 1-tap download curated fonts and emojis powered by zFont, Google Fonts, and Fontsource. Filter across content types (Fonts & Emojis), sources, and typeface categories (Sans Serif, Serif, Display, Handwriting, Monospace, Stylish, Color) with instant specimen preview, variant selection, and offline IndexedDB binary caching.
- **Variable Font (`fvar`) Engine**: Zero-dependency binary SFNT/OpenType parser with live tuning of variation axes (`wght`, `wdth`, `opsz`, `slnt`, etc.) and instant presets.
- **Curated Emoji Customizer**: Built-in 1-tap emoji replacement featuring top curated styles (iOS 26 Unicode 17, iOS 18, Microsoft Fluent 3D, Samsung One UI, Twemoji, and Google Noto Color), custom `.ttf` emoji importing, and offline IndexedDB binary caching.
- **Universal Root Bridge & NoMount LKM Sync**: Native support for KernelSU, KernelSU Next, APatch, and MMRL WebUI environments with automatic timeout guards and dynamic rule synchronization for `nomount.ko` kernel drivers.
- **Optimized Data Pipeline**: 128 KB chunked streaming to `/data/local/tmp` with integrity verification and guaranteed cleanup.
- **1-Click Revert**: Instantly restore original stock system fonts or stock Google emojis with clean overlay removal.

---

## Compatibility

- **Tested Hardware:** POCO F7 (`25053PC47I`) running Android 17; LineageOS 23.2 (Android 16)
- **Root Solutions:** KernelSU, KernelSU Next, APatch, Magisk (via MMRL / WebUI host)
- **Android Versions:** Android 12 through Android 17+

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
- Windows (PowerShell) or Linux / macOS / WSL
- Node.js (current LTS, v20+ or v22+) & npm
- `zip` (on Linux) or built-in `tar` / `7z` (on Windows)

### Build Flashable Module

**On Windows (PowerShell):**
```powershell
.\build.ps1
```

**On Linux / macOS / WSL:**
```bash
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

## AI Disclosure & Hardware Verification

This project was developed through an AI-assisted "vibe-coding" workflow—conceived, architected, and continuously refined alongside advanced AI agentic pair programmers.

However, because root modules operate directly at the system partition, init script, and font cache layers, **real-world reliability and safety were not left to hallucination**:
- **Hardware Validated:** Every shell routine, file-streaming bridge, and cache cleanup pipeline has been deployed and thoroughly validated on bare metal (specifically tested and confirmed functional on a physical **POCO F7** running **Android 17** with KernelSU/APatch).
- **Type-Safe & Tested:** The WebUI and binary OpenType/TTF parser are engineered in strict TypeScript (`strict: true`, `noImplicitAny`) and backed by automated unit tests (`vitest`) for SFNT parsing, shell escaping, and state transitions.
- **Fail-Safe Recovery:** Revert mechanisms directly scrub overlay directories and clear `/data/fonts` caches, ensuring stock system fonts can always be cleanly restored without bootloop risks.

---

## Credits & Acknowledgments

- **[zFont](https://github.com/zFont/Host)** & **[Khun Htetz Naing](https://zfont.app)**: Huge thanks to Khun Htetz Naing and the zFont project ([zFont GitHub](https://github.com/zFont), [zFont App](https://zfont.app), [zFont Host](https://github.com/zFont/Host)) for pioneering Android font and emoji packages, hosting, and curation.
- **[MFFM Emoji](https://t.me/mffmemojis)** (`@mffmemojis`): For custom iOS, Samsung, and stylish vendor emoji packages and porting.
- **RickyBush_** (`@EmojiReplacer`): Creator of Emoji Replacer and maintainer of curated Unicode emoji packages.
- **[Fontsource](https://fontsource.org)**: For providing open-source font packages and distributions.
- **[Google Fonts](https://fonts.google.com)**: For the extensive library of high-quality open-source typefaces (Roboto, Google Sans, Inter, Poppins, Montserrat, JetBrains Mono, etc.).
- **Vendor Font & Emoji Creators**: Apple, Microsoft, Samsung, Twemoji (X / Twitter), Google (Noto Color Emoji), and independent type designers for their respective font and emoji designs.
- **KernelSU & NoMount**: Thanks to the KernelSU, KernelSU Next, APatch, and NoMount teams for modern root mount and kernel redirection frameworks.

---

## License

Fontify is open-source software licensed under the **[GNU General Public License v3.0 (GPL-3.0)](LICENSE)**.

You are free to use, inspect, modify, and distribute this software under the terms of the GPL-3.0 license. Any derivative works or distributions must remain open source under the same license terms.

---

## Issues & Support

If you encounter any issues or the font does not reflect on your device, please open an issue on GitHub with your device model, ROM version, and root manager details.
