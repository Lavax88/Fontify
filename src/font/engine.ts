/**
 * Fontify - Font Engine
 * Manages FontFace registration, Blob URL lifecycles, and requestAnimationFrame-debounced
 * live variation settings.
 */

export class FontEngine {
  private static activeBlobUrl: string | null = null;
  private static activeFontFace: FontFace | null = null;
  private static pendingRaf: number | null = null;

  /**
   * Registers a new FontFace from an ArrayBuffer, revoking any prior font Blob URL.
   */
  public static async loadFontFace(
    familyName: string,
    buffer: ArrayBuffer
  ): Promise<FontFace> {
    this.unloadActiveFont();

    const blob = new Blob([buffer], { type: 'font/ttf' });
    this.activeBlobUrl = URL.createObjectURL(blob);

    const fontFace = new FontFace(familyName, `url(${this.activeBlobUrl})`);
    const loadedFace = await fontFace.load();

    document.fonts.add(loadedFace);
    this.activeFontFace = loadedFace;

    return loadedFace;
  }

  /**
   * Cleans up currently loaded font resources.
   */
  public static unloadActiveFont(): void {
    if (this.activeFontFace) {
      try {
        document.fonts.delete(this.activeFontFace);
      } catch (_) {
        // Ignored if document.fonts.delete is unsupported in older WebViews
      }
      this.activeFontFace = null;
    }

    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
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
    if (this.pendingRaf !== null) {
      cancelAnimationFrame(this.pendingRaf);
    }

    this.pendingRaf = requestAnimationFrame(() => {
      this.pendingRaf = null;
      const settings = this.formatVariationSettings(axisValues);

      for (const el of elements) {
        if (!el) continue;
        el.style.fontFamily = fontFamily;
        el.style.fontVariationSettings = settings;
      }
    });
  }
}
