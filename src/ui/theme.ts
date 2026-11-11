/**
 * Fontify - Deep Theme & Window Insets Manager
 * Encapsulates dark/light system mode detection, media queries,
 * KernelSU/MMRL status bar tinting, and user custom stylesheets.
 */

export class ThemeManager {
  private mediaQuery: MediaQueryList | null = null;
  private changeListener: (() => void) | null = null;

  public init(): void {
    this.setupThemeWatcher();
    this.injectUserStyles();
    this.updateDecor();
  }

  public isDark(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  public updateDecor(): void {
    if (typeof document === 'undefined') return;

    const dark = this.isDark();
    const themeColor = dark ? '#11140e' : '#f8faf0';

    // 1. Meta theme-color
    let metaTheme = document.getElementById('meta-theme-color') as HTMLMetaElement | null;
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.id = 'meta-theme-color';
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', themeColor);

    // 2. Synchronize host root manager status bar
    try {
      if (typeof window.$fontify !== 'undefined' && typeof window.$fontify.setLightStatusBars === 'function') {
        window.$fontify.setLightStatusBars(!dark);
      }
      if (typeof window.ksu !== 'undefined' && typeof window.ksu.setWindowDecor === 'function') {
        window.ksu.setWindowDecor(themeColor, !dark);
      }
    } catch (_) {}
  }

  public injectUserStyles(): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('fontify-custom-css');
    if (!existing) {
      const link = document.createElement('link');
      link.id = 'fontify-custom-css';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = 'custom.css';
      link.onerror = () => link.remove();
      document.head.appendChild(link);
    }
  }

  private setupThemeWatcher(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    try {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.changeListener = () => this.updateDecor();

      if (typeof this.mediaQuery.addEventListener === 'function') {
        this.mediaQuery.addEventListener('change', this.changeListener);
      } else if ('addListener' in this.mediaQuery) {
        (this.mediaQuery as { addListener: (listener: () => void) => void }).addListener(this.changeListener);
      }
    } catch (_) {}
  }

  public destroy(): void {
    if (this.mediaQuery && this.changeListener) {
      try {
        if (typeof this.mediaQuery.removeEventListener === 'function') {
          this.mediaQuery.removeEventListener('change', this.changeListener);
        } else if ('removeListener' in this.mediaQuery) {
          (this.mediaQuery as { removeListener: (listener: () => void) => void }).removeListener(this.changeListener);
        }
      } catch (_) {}
      this.mediaQuery = null;
      this.changeListener = null;
    }
  }
}

export const themeManager = new ThemeManager();

// Maintain backward compatibility for insets-theme.ts exports if any
export function setupTheming(): void {
  themeManager.init();
}

export function setupUserCustomization(): void {
  themeManager.injectUserStyles();
}
