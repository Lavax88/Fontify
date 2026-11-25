/**
 * Fontify - Deep Theme & Window Insets Manager
 * Coordinates <m3e-theme> with KernelSU/MMRL Android Monet colors,
 * dark/light system mode detection, status bar tinting, and user custom CSS.
 */

export const DEFAULT_SEED_COLOR = '#386a20';

function isHexColor(val: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val.trim());
}

export class ThemeManager {
  private mediaQuery: MediaQueryList | null = null;
  private changeListener: (() => void) | null = null;

  public init(): void {
    this.setupThemeWatcher();
    this.injectUserStyles();
    this.syncM3eTheme();
    this.updateDecor();
  }

  public isDark(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Reads KernelSU/MMRL host Monet `--primary` when available and syncs it
   * into `<m3e-theme id="app-theme">`, falling back to Fontify's sage green.
   */
  public syncM3eTheme(): void {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return;

    const appTheme = document.getElementById('app-theme');
    if (!appTheme) return;

    try {
      const rootStyles = getComputedStyle(document.documentElement);
      const hostPrimary = rootStyles.getPropertyValue('--primary').trim();

      if (hostPrimary && isHexColor(hostPrimary)) {
        appTheme.setAttribute('color', hostPrimary);
        appTheme.classList.add('ksu-monet');
      } else {
        appTheme.setAttribute('color', DEFAULT_SEED_COLOR);
        appTheme.classList.remove('ksu-monet');
      }
    } catch (_) {
      appTheme.setAttribute('color', DEFAULT_SEED_COLOR);
    }
  }

  public updateDecor(): void {
    if (typeof document === 'undefined') return;

    const dark = this.isDark();
    let themeColor = dark ? '#11140e' : '#f8faf0';

    try {
      if (typeof getComputedStyle === 'function') {
        const appTheme = document.getElementById('app-theme') ?? document.documentElement;
        const computedSurface = getComputedStyle(appTheme).getPropertyValue('--md-sys-color-surface').trim();
        if (computedSurface && isHexColor(computedSurface)) {
          themeColor = computedSurface;
        }
      }
    } catch (_) {}

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
      this.changeListener = () => {
        this.syncM3eTheme();
        this.updateDecor();
      };

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
