/**
 * Fontify - Font Engine
 * Manages keyed FontFace registrations, Blob URL lifecycles, and requestAnimationFrame-debounced
 * live variation settings.
 */

interface LoadedFontSlot {
  face: FontFace;
  blobUrl: string;
}

export class FontEngine {
  private static loadedSlots: Map<string, LoadedFontSlot> = new Map();
  private static pendingRaf: number | null = null;

  /**
   * Registers a new FontFace from an ArrayBuffer under a named family slot,
   * revoking any prior Blob URL and removing any prior FontFace for that slot.
   */
  public static async loadFontFace(
    familyName: string,
    buffer: ArrayBuffer
  ): Promise<FontFace> {
    this.unloadActiveFont(familyName);

    if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) {
      return {} as FontFace;
    }

    const blob = new Blob([buffer], { type: 'font/ttf' });
    const blobUrl = URL.createObjectURL(blob);

    const fontFace = new FontFace(familyName, `url(${blobUrl})`);
    const loadedFace = await fontFace.load();

    document.fonts.add(loadedFace);
    this.loadedSlots.set(familyName, { face: loadedFace, blobUrl });

    return loadedFace;
  }

  /**
   * Cleans up loaded font resources for a specific family slot, or all slots if omitted.
   */
  public static unloadActiveFont(familyName?: string): void {
    const slotsToClean = familyName
      ? (this.loadedSlots.has(familyName) ? [[familyName, this.loadedSlots.get(familyName)!] as const] : [])
      : Array.from(this.loadedSlots.entries());

    for (const [key, slot] of slotsToClean) {
      try {
        if (typeof document !== 'undefined' && document.fonts) {
          document.fonts.delete(slot.face);
        }
      } catch (_) {
        // Ignored if document.fonts.delete is unsupported in older WebViews
      }
      try {
        URL.revokeObjectURL(slot.blobUrl);
      } catch (_) {}
      this.loadedSlots.delete(key);
    }
  }

  /**
   * Converts an axis key-value map into a valid CSS font-variation-settings string.
   */
  public static formatVariationSettings(axisValues: Record<string, number>): string {
    const entries = Object.entries(axisValues);
    if (entries.length === 0) {
      return 'normal';
    }
    return entries.map(([tag, val]) => `"${tag}" ${val}`).join(', ');
  }

  /**
   * Schedules an update to element font-variation-settings synchronized to requestAnimationFrame.
   * Cancels any pending frame so rapid slider scrub is 100% fluid.
   */
  public static scheduleVariationUpdate(
    elements: (HTMLElement | null)[],
    axisValues: Record<string, number>,
    fontFamily = "'CustomImportedFont', sans-serif"
  ): void {
    if (this.pendingRaf !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.pendingRaf);
    }

    const applyUpdate = () => {
      this.pendingRaf = null;
      const settings = this.formatVariationSettings(axisValues);

      for (const el of elements) {
        if (!el) continue;
        el.style.fontFamily = fontFamily;
        el.style.fontVariationSettings = settings;
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      this.pendingRaf = requestAnimationFrame(applyUpdate);
    } else {
      applyUpdate();
    }
  }
}
