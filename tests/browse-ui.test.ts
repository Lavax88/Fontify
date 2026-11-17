import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Browse UI & Zero-Download Live Preview', () => {
  let originalDocument: any;
  let originalWindow: any;

  beforeEach(() => {
    originalDocument = globalThis.document;
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  it('renders prominent [Variable (100–900)] chip alongside static weights for variable font', async () => {
    const mockBackdrop: any = {
      style: { display: 'none' },
      classList: { add: vi.fn(), remove: vi.fn(), contains: () => false },
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      addEventListener: vi.fn()
    };
    const mockSheet: any = {
      style: { display: 'none' },
      removeAttribute: vi.fn(),
      setAttribute: vi.fn()
    };

    let innerHtmlContent = '';
    const mockContainer: any = {
      get innerHTML() {
        return innerHtmlContent;
      },
      set innerHTML(val: string) {
        innerHtmlContent = val;
      },
      querySelectorAll: vi.fn((sel: string) => {
        if (sel.includes('.browse-variant-chip')) {
          return [
            {
              classList: { add: vi.fn(), remove: vi.fn() },
              getAttribute: (attr: string) => {
                if (attr === 'data-variant-type') return 'variable';
                if (attr === 'data-variant-weight') return '100-900';
                if (attr === 'data-variant-name') return 'Variable (100–900)';
                return null;
              },
              addEventListener: vi.fn()
            },
            {
              classList: { add: vi.fn(), remove: vi.fn() },
              getAttribute: (attr: string) => {
                if (attr === 'data-variant-type') return 'static';
                if (attr === 'data-variant-weight') return '700';
                if (attr === 'data-variant-name') return 'Bold 700';
                return null;
              },
              addEventListener: vi.fn()
            }
          ];
        }
        return [];
      })
    };

    const mockHead: any = {
      appendChild: vi.fn()
    };

    const mockSpecimenBox: any = {
      style: {},
      addEventListener: vi.fn()
    };
    const mockStatusEl: any = {
      style: {},
      textContent: ''
    };

    const elements: Record<string, any> = {
      'browse-preview-backdrop': mockBackdrop,
      'browse-preview-sheet': mockSheet,
      'browse-preview-container': mockContainer,
      'preview-specimen-box': mockSpecimenBox,
      'preview-load-status': mockStatusEl
    };

    globalThis.document = {
      head: mockHead,
      createElement: vi.fn((tag: string) => ({
        tagName: tag.toUpperCase(),
        id: '',
        rel: '',
        href: '',
        style: {},
        addEventListener: vi.fn()
      })),
      getElementById: (id: string) => elements[id] || null,
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => [])
    } as any;

    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any;

    const { openPreviewSheet, closePreviewSheet } = await import('../src/ui/browse');

    const sampleVariableFont: any = {
      id: 'google-roboto',
      name: 'Roboto',
      type: 'font',
      source: 'google',
      category: 'Sans Serif',
      author: 'Christian Robertson',
      isVariable: true,
      url: 'https://fonts.gstatic.com/s/roboto/roboto-variable.ttf',
      variants: [
        { name: 'Light 300', weight: 300, url: 'https://fonts.gstatic.com/s/roboto/roboto-300.ttf' },
        { name: 'Regular 400', weight: 400, url: 'https://fonts.gstatic.com/s/roboto/roboto-400.ttf' },
        { name: 'Bold 700', weight: 700, url: 'https://fonts.gstatic.com/s/roboto/roboto-700.ttf' }
      ]
    };

    openPreviewSheet(sampleVariableFont);

    // Verify prominent Variable chip and static weights exist in bottom sheet
    expect(innerHtmlContent).toContain('Variable (100–900)');
    expect(innerHtmlContent).toContain('browse-variant-chip-variable');
    expect(innerHtmlContent).toContain('data-variant-type="variable"');
    expect(innerHtmlContent).toContain('data-variant-type="static"');
    expect(innerHtmlContent).toContain('300');
    expect(innerHtmlContent).toContain('400');
    expect(innerHtmlContent).toContain('700');
    expect(innerHtmlContent).toContain('Light');
    expect(innerHtmlContent).toContain('Regular');
    expect(innerHtmlContent).toContain('Bold');

    // Verify specimen box updated with font family and smooth styling
    expect(mockSpecimenBox.style.fontFamily).toBe('"Roboto", sans-serif');

    // Verify zero-download preview link was injected with Google Fonts CSS2 URL and subsetting text
    expect(mockHead.appendChild).toHaveBeenCalled();
    const injectedLink = mockHead.appendChild.mock.calls[0][0];
    expect(injectedLink.href).toContain('fonts.googleapis.com/css2?family=Roboto');
    expect(injectedLink.href).toContain('&text=');

    closePreviewSheet();
  });

  it('handles emoji pack preview without Google Fonts CSS2 network subsetting', async () => {
    const mockBackdrop: any = {
      style: { display: 'none' },
      classList: { add: vi.fn(), remove: vi.fn(), contains: () => false },
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      addEventListener: vi.fn()
    };
    const mockSheet: any = {
      style: { display: 'none' },
      removeAttribute: vi.fn(),
      setAttribute: vi.fn()
    };
    const mockContainer: any = {
      innerHTML: '',
      querySelectorAll: vi.fn(() => [])
    };
    const mockHead: any = {
      appendChild: vi.fn()
    };
    const mockSpecimenBox: any = {
      style: {},
      addEventListener: vi.fn()
    };
    const mockStatusEl: any = {
      style: {},
      textContent: ''
    };

    const elements: Record<string, any> = {
      'browse-preview-backdrop': mockBackdrop,
      'browse-preview-sheet': mockSheet,
      'browse-preview-container': mockContainer,
      'preview-specimen-box': mockSpecimenBox,
      'preview-load-status': mockStatusEl
    };

    globalThis.document = {
      head: mockHead,
      createElement: vi.fn(() => ({})),
      getElementById: (id: string) => elements[id] || null,
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => [])
    } as any;

    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any;

    const { openPreviewSheet, closePreviewSheet } = await import('../src/ui/browse');

    const sampleEmojiItem: any = {
      id: 'zfont-emoji-ios',
      name: 'iOS 17.4 Emojis',
      type: 'emoji',
      source: 'zfont',
      category: 'Emoji',
      author: 'Apple Inc.',
      variants: [{ name: 'Default', weight: 400, url: 'https://example.com/ios.ttf' }]
    };

    openPreviewSheet(sampleEmojiItem);

    // Emojis should not append a Google Fonts CSS2 link
    expect(mockHead.appendChild).not.toHaveBeenCalled();
    expect(mockSpecimenBox.style.fontFamily).toContain('CustomEmojiPreview');
    expect(mockStatusEl.textContent).toBe('Emoji pack preview');

    closePreviewSheet();
  });

  it('wires the filter bar click interactions according to spec', async () => {
    type Listener = (e: any) => void;
    const listeners: Record<string, Listener> = {};

    const mockChipAllFonts: any = {
      classList: {
        contains: (cls: string) => cls === 'active',
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn()
      },
      getAttribute: (attr: string) => attr === 'data-filter' ? 'all-fonts' : null,
      setAttribute: vi.fn()
    };

    const mockChipVariable: any = {
      classList: {
        contains: () => false,
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn()
      },
      getAttribute: (attr: string) => attr === 'data-filter' ? 'variable' : null,
      setAttribute: vi.fn()
    };

    const mockChipEmoji: any = {
      classList: {
        contains: () => false,
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn()
      },
      getAttribute: (attr: string) => attr === 'data-filter' ? 'emoji' : null,
      setAttribute: vi.fn()
    };

    const mockChipDownloaded: any = {
      classList: {
        contains: () => false,
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn()
      },
      getAttribute: (attr: string) => attr === 'data-filter' ? 'downloaded' : null,
      setAttribute: vi.fn()
    };

    const chips = [mockChipAllFonts, mockChipVariable, mockChipEmoji, mockChipDownloaded];

    const mockFilterBar: any = {
      addEventListener: (evt: string, cb: Listener) => {
        listeners[evt] = cb;
      },
      querySelectorAll: (sel: string) => {
        if (sel.includes(':not([data-filter="downloaded"])')) {
          return [mockChipAllFonts, mockChipVariable, mockChipEmoji];
        }
        return chips;
      }
    };

    const mockGrid: any = { innerHTML: '', appendChild: vi.fn(), addEventListener: vi.fn() };

    globalThis.document = {
      head: { appendChild: vi.fn() },
      createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn() })),
      getElementById: (id: string) => {
        if (id === 'browse-filter-bar') return mockFilterBar;
        if (id === 'browse-grid') return mockGrid;
        return null;
      },
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => [])
    } as any;

    const { setupBrowseTab } = await import('../src/ui/browse');
    setupBrowseTab();

    expect(listeners['click']).toBeDefined();

    // 1. Click variable filter
    listeners['click']({
      target: {
        closest: (sel: string) => sel.includes('.browse-chip') ? mockChipVariable : null
      }
    });
    expect(mockChipVariable.classList.add).toHaveBeenCalledWith('active');
    expect(mockChipVariable.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');

    // 2. Click emoji filter
    listeners['click']({
      target: {
        closest: (sel: string) => sel.includes('.browse-chip') ? mockChipEmoji : null
      }
    });
    expect(mockChipEmoji.classList.add).toHaveBeenCalledWith('active');
    expect(mockChipEmoji.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');

    // 3. Click all-fonts filter
    listeners['click']({
      target: {
        closest: (sel: string) => sel.includes('.browse-chip') ? mockChipAllFonts : null
      }
    });
    expect(mockChipAllFonts.classList.add).toHaveBeenCalledWith('active');
    expect(mockChipAllFonts.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');

    // 4. Click downloaded filter (toggle)
    listeners['click']({
      target: {
        closest: (sel: string) => sel.includes('.browse-chip') ? mockChipDownloaded : null
      }
    });
    expect(mockChipDownloaded.classList.toggle).toHaveBeenCalledWith('active', true);
    expect(mockChipDownloaded.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');
  });

  it('renders Delete Download button in preview sheet when font is cached and handles deletion', async () => {
    const { saveCachedFont, isFontCached } = await import('../src/browse/fontCache');
    const { openPreviewSheet, closePreviewSheet, handleDeleteCachedFont, refreshCatalogGrid } = await import('../src/ui/browse');

    const sampleItem: any = {
      id: 'gf-test-delete-font',
      name: 'Test Delete Font',
      type: 'font',
      source: 'google',
      category: 'Sans-Serif',
      author: 'Tester',
      variants: [{ name: 'Regular', weight: 400, url: 'https://example.com/test.ttf' }]
    };

    // Save font to cache
    const dummyBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    await saveCachedFont(sampleItem.id, sampleItem, dummyBuffer);
    expect(await isFontCached(sampleItem.id)).toBe(true);

    const mockGrid: any = { innerHTML: '', appendChild: vi.fn(), addEventListener: vi.fn() };
    const mockBackdrop: any = {
      style: { display: 'none' },
      classList: { add: vi.fn(), remove: vi.fn(), contains: () => false },
      removeAttribute: vi.fn(),
      setAttribute: vi.fn()
    };
    const mockSheet: any = {
      style: { display: 'none' },
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      querySelectorAll: vi.fn(() => [])
    };
    let innerHtmlContent = '';
    const mockContainer: any = {
      get innerHTML() {
        return innerHtmlContent;
      },
      set innerHTML(val: string) {
        innerHtmlContent = val;
      },
      querySelectorAll: vi.fn(() => [])
    };
    const mockStatusEl: any = { style: {}, textContent: '' };
    const mockSpecimenBox: any = { style: {}, addEventListener: vi.fn() };

    const mockToastContainer: any = { appendChild: vi.fn(), removeChild: vi.fn() };
    const elements: Record<string, any> = {
      'toast-container': mockToastContainer,
      'browse-grid': mockGrid,
      'browse-preview-backdrop': mockBackdrop,
      'browse-preview-sheet': mockSheet,
      'browse-preview-container': mockContainer,
      'preview-specimen-box': mockSpecimenBox,
      'preview-load-status': mockStatusEl
    };

    globalThis.document = {
      head: { appendChild: vi.fn() },
      createElement: vi.fn(() => ({ style: {} })),
      getElementById: (id: string) => elements[id] || null,
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => [])
    } as any;

    await refreshCatalogGrid();
    openPreviewSheet(sampleItem);

    // Verify Delete Download button is rendered in the preview sheet
    expect(innerHtmlContent).toContain('Delete Download');
    expect(innerHtmlContent).toContain('btn-preview-delete');

    // Execute deletion
    await handleDeleteCachedFont(sampleItem);
    expect(await isFontCached(sampleItem.id)).toBe(false);

    closePreviewSheet();
  });
});
