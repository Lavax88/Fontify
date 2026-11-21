# Fontify Changelog

## v3.1.0 (versionCode 2002)

* **Instant 3-Second Soft Reboot**: Restored fast soft rebooting via system_server restart with a dedicated pre-reboot deployment hook (deploy_pending.sh) that populates overlays and clears font caches right before Zygote restarts.
* **Eliminated Live VFS SIGBUS Crashes**: Staged font and emoji overlays to data storage while booted to prevent memory-mapped inode mutation faults in Chromium WebUI and SystemUI.
* **Static Weight Variant Selection**: Fixed variable font families (e.g. Outfit, Inter) downloading variable binaries when a static weight variant (such as Regular 400) was chosen, which previously resulted in Android rendering Thin 100.
* **IndexedDB Cache Isolation**: Distinct cache keys for static weights and variable fonts to prevent variant cross-contamination.
* **Bootloop Guard on Stock Restore**: Reverting to stock fonts/emojis now prompts for a full device reboot to cleanly unmount kernel VFS overlays. Includes an automated safeguard in deploy_pending.sh that detects stock restoration and upgrades soft reboots to a full hardware reboot.
* **Module Update Stock Backup Protection**: Prevented module updates from overwriting stock font backups when a custom font is active; original stock fonts are now strictly preserved.
* **Country Flag Emoji Preservation**: Prevented custom emoji fonts from overwriting stock NotoColorEmojiFlags.ttf, ensuring national flag emojis render correctly across apps and notifications.
* **NoMount VFS Redirection Cleanup**: Fixed dangling deleted inodes by cleanly unmounting and synchronizing NoMount rules upon font/emoji removal.

## v3.0.0 (versionCode 2001)

* **Browse Tab & Google Fonts Catalog**: Introducing the new 4th Browse tab with fluid M3 Expressive morphing navigation and ViewPager swipe mechanics.
* **Extensive Online & Offline Catalog**: Full Google Fonts directory and curated emoji repository with instant search, category filters (Serif, Sans-serif, Display, Handwriting, Monospace, Emojis, Downloaded), and typographic weight name formatting.
* **In-Card Live Previews**: View real rendered font specimens directly inside catalog cards with viewport-aware batch rendering and zero-download Google Fonts CSS2 inspection.
* **Font Specimen Modal**: Interactive bottom sheet with editable sample text, weight variations, glyph previews, and metadata inspection.
* **Variable Font Customization**: Seamless integration with the Customize tab — opening any variable font from Browse automatically activates the Variable tab and generates live sliders for all fvar axes (Weight, Width, Slant, Optical Size, etc.).
* **Safe Direct Apply Workflow**: Direct 1-tap font and emoji application with staging and reboot confirmation, resolving live VFS race conditions and preventing system crashes.
* **15x Accelerated Downloads**: Multi-tier download acceleration pipeline utilizing global edge Anycast CDN mirrors (cdn.jsdelivr.net for Google Fonts, ghfast.top proxy mirror for GitHub emoji assets) with automatic fallback to raw.githubusercontent.com.
* **Zero-Latency Sideload Detection**: Automatic silent detection of existing font files in /sdcard/Download/ to import fonts instantly in 0ms without consuming mobile data.
* **Real-Time Progress & ETA**: Live throughput speed (MB/s) and dynamic time remaining (ETA) calculation displayed inside the preview modal and emoji download progress bars.
* **M3 Expressive Frosted Blur**: Premium aesthetic redesign featuring frosted backdrop blur on all transparent surfaces and elevated modal overlays.
* **Font Cache Management**: Full IndexedDB binary caching with the ability to delete downloaded fonts and reclaim storage directly from the Browse UI.

## v2.0.0 (versionCode 2000)

* **Curated Emoji Customizer**: Complete emoji management tab featuring top curated emoji packs (iOS 26 Unicode 17, iOS 18, Microsoft Fluent 3D, Samsung One UI, Twemoji, and Google Noto Color).
* **Custom Emoji Font Import**: Tap or drop custom `.ttf`/`.otf` emoji fonts with live `@font-face` specimen previews and category showcases.
* **Offline IndexedDB Binary Caching**: Instant 0ms previews for previously downloaded emoji fonts with live download progress streaming.
* **KernelSU NoMount LKM Dynamic Sync**: Real-time VFS redirection rule management (`nm rule add` / `nm rule del`) ensuring fonts and emojis apply reliably after reboot without stale kernel dentries.
* **Multi-Partition Overlay Resilience**: Full `/product` and `/system` partition font overlay preservation across module updates and boot scripts.
* **Material 3 Expressive Floating UI**: Floating bottom navigation pill (Overview, Font, Emoji) and bottom-right quick action cluster (Revert & Apply).
* **Credits**: Added credits to zFont and original platform designers.

## v1.0.0 (versionCode 1000)

* Initial Release
* Material 3 Expressive WebUI with dynamic wallpaper Monet palette theming
* Variable Font (fvar) engine with live weight and variation axis tuning
* Live font playground and real-time preview
* Universal external mount architecture (compatible with stealth unmount settings)
* 1-click safe stock font revert
