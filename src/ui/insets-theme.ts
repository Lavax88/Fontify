/**
 * Fontify - Insets & Theme Decor Controller
 * Synchronizes KernelSU/MMRL status bars, window decor, and user custom overrides.
 */

export function setupTheming(): void {
  const updateDecor = () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeColor = isDark ? '#11140e' : '#f8faf0';

    // Update meta theme-color tag
    let metaTheme = document.getElementById('meta-theme-color') as HTMLMetaElement | null;
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.id = 'meta-theme-color';
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', themeColor);

    // Synchronize window decor with root manager bridge
    try {
      if (typeof window.$fontify !== 'undefined' && typeof window.$fontify.setLightStatusBars === 'function') {
        window.$fontify.setLightStatusBars(!isDark);
      }
      if (typeof window.ksu !== 'undefined' && typeof window.ksu.setWindowDecor === 'function') {
        window.ksu.setWindowDecor(themeColor, !isDark);
      }
    } catch (_) {}
  };

  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateDecor);
    } else if ('addListener' in mediaQuery) {
      // Deprecated MediaQueryList.addListener fallback for Android 12 / older WebViews
      (mediaQuery as { addListener: (listener: () => void) => void }).addListener(updateDecor);
    }
  } catch (_) {}

  updateDecor();
}

/**
 * Ensures user-supplied custom.css is appended without caching issues.
 */
export function setupUserCustomization(): void {
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
