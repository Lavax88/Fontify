import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { store } from '../src/state/store';
import { setupCustomizeTab } from '../src/ui/customize';
import type { FontInfo } from '../src/font/types';

describe('Customize Reactive UI & Direct Apply Fixes', () => {
  let originalDocument: any;
  let originalWindow: any;

  beforeEach(() => {
    originalDocument = globalThis.document;
    originalWindow = globalThis.window;
    store.setState({
      fontFile: null,
      fontBuffer: null,
      fontData: null,
      axisValues: {},
      selectedPreset: '',
      weightMode: 'auto',
      currentTab: 'overview'
    });
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  it('automatically opens variable controls, presets, and sliders when fontData is set in store', async () => {
    // DOM mocks
    const mockDropzone: any = { addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } };
    const mockFileInput: any = { addEventListener: vi.fn(), click: vi.fn() };
    const mockBtnSelectFile: any = { addEventListener: vi.fn() };
    const mockPickerTitle: any = { textContent: 'Import Font File' };
    const mockPickerSubtitle: any = { textContent: 'Tap to select or drop any .ttf or .otf font' };

    const mockFontInfoRow: any = { style: { display: 'none' } };
    const mockFontName: any = { textContent: '' };
    const mockFontFormat: any = { textContent: '' };
    const mockFontTypeBadge: any = { textContent: '' };
    const mockVariableControlsGroup: any = { style: { display: 'none' } };
    const mockSlidersContainer: any = { innerHTML: '', appendChild: vi.fn((el) => mockSlidersContainer.children.push(el)), children: [] };
    const mockPresetsContainer: any = {
      innerHTML: '',
      appendChild: vi.fn((el) => mockPresetsContainer.children.push(el)),
      children: [],
      querySelectorAll: vi.fn(() => mockPresetsContainer.children)
    };

    const mockBtnApply: any = { disabled: true, addEventListener: vi.fn() };
    const mockBtnRestore: any = { addEventListener: vi.fn() };
    const mockBtnSoftReboot: any = { addEventListener: vi.fn() };
    const mockPreviewText: any = { style: {} };

    const elements: Record<string, any> = {
      'dropzone': mockDropzone,
      'file-input': mockFileInput,
      'btn-select-file': mockBtnSelectFile,
      'picker-title': mockPickerTitle,
      'picker-subtitle': mockPickerSubtitle,
      'font-info-row': mockFontInfoRow,
      'font-name': mockFontName,
      'font-format': mockFontFormat,
      'font-type-badge': mockFontTypeBadge,
      'variable-controls-group': mockVariableControlsGroup,
      'sliders-container': mockSlidersContainer,
      'presets-container': mockPresetsContainer,
      'btn-apply': mockBtnApply,
      'btn-restore': mockBtnRestore,
      'btn-soft-reboot': mockBtnSoftReboot
    };

    globalThis.document = {
      createElement: vi.fn((tag: string) => {
        const el: any = {
          tagName: tag.toUpperCase(),
          className: '',
          textContent: '',
          style: {},
          children: [],
          classList: {
            add: vi.fn((c: string) => { el.className += ` ${c}`; }),
            remove: vi.fn((c: string) => { el.className = el.className.replace(c, '').trim(); }),
            toggle: vi.fn((c: string, force?: boolean) => {
              if (force) el.className += ` ${c}`;
            })
          },
          setAttribute: vi.fn(),
          getAttribute: vi.fn(),
          addEventListener: vi.fn(),
          querySelector: vi.fn(() => ({
            addEventListener: vi.fn(),
            setAttribute: vi.fn()
          })),
          appendChild: vi.fn((child: any) => el.children.push(child))
        };
        return el;
      }),
      getElementById: (id: string) => elements[id] || null,
      querySelectorAll: (sel: string) => {
        if (sel === '.preview-text') return [mockPreviewText];
        return [];
      }
    } as any;

    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any;

    // Initialize customize tab
    setupCustomizeTab();

    // Verify initial idle state
    expect(mockFontInfoRow.style.display).toBe('none');
    expect(mockVariableControlsGroup.style.display).toBe('none');
    expect(mockPickerTitle.textContent).toBe('Import Font File');

    // Simulate "Open in Customize" from Browse tab:
    // A variable font with target weight 700 is set into store
    const sampleVariableFont: FontInfo = {
      valid: true,
      format: 'TrueType Variable Font',
      fullName: 'Roboto Flex',
      familyName: 'Roboto Flex',
      subfamilyName: 'Regular',
      postscriptName: 'RobotoFlex-Regular',
      isVariable: true,
      isCollection: false,
      numGlyphs: 1200,
      unitsPerEm: 1000,
      version: 'v2.0',
      axes: [
        { tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400, current: 400 }
      ],
      instances: []
    };

    store.setState({
      fontData: sampleVariableFont,
      fontBuffer: new Uint8Array([1, 2, 3, 4]).buffer,
      axisValues: { wght: 700 },
      selectedPreset: 'Bold (700)',
      weightMode: 'custom',
      currentTab: 'customize'
    });

    // Reactive subscription should automatically populate UI:
    expect(mockPickerTitle.textContent).toBe('Roboto Flex');
    expect(mockPickerSubtitle.textContent).toContain('1200 glyphs');
    expect(mockFontInfoRow.style.display).toBe('flex');
    expect(mockFontName.textContent).toBe('Roboto Flex');
    expect(mockFontTypeBadge.textContent).toBe('Variable');

    // Variable controls group must automatically open
    expect(mockVariableControlsGroup.style.display).toBe('block');

    // Presets must have the Bold (700) m3e-filter-chip selected inside m3e-filter-chip-set
    const chipSet = mockPresetsContainer.children[0];
    expect(chipSet).toBeDefined();
    const boldChip = chipSet.children.find((c: any) => c.textContent === 'Bold (700)');
    expect(boldChip).toBeDefined();
    expect(boldChip.selected).toBe(true);
  });

  it('handleOpenInCustomize configures matching variant preset and switches tab', async () => {
    const { handleOpenInCustomize } = await import('../src/ui/browse');
    const { FontParser } = await import('../src/font/parser');
    const catalogService = await import('../src/browse/catalogService');

    // Mock download and cache
    vi.spyOn(catalogService, 'downloadAndCacheFont').mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer);

    // Mock FontParser
    const mockFontInfo: FontInfo = {
      valid: true,
      format: 'TrueType Variable Font',
      fullName: 'Inter Variable',
      familyName: 'Inter',
      subfamilyName: 'Regular',
      postscriptName: 'Inter-Variable',
      isVariable: true,
      isCollection: false,
      numGlyphs: 1500,
      unitsPerEm: 1000,
      version: 'v1.0',
      axes: [{ tag: 'wght', name: 'Weight', min: 100, max: 900, default: 400, current: 400 }],
      instances: []
    };
    vi.spyOn(FontParser, 'parse').mockReturnValue(mockFontInfo);

    // Mock window and document
    globalThis.window = {} as any;

    globalThis.document = {
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ appendChild: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } })),
      querySelectorAll: vi.fn(() => [])
    } as any;

    const sampleItem: any = {
      id: 'google-inter',
      name: 'Inter',
      type: 'font',
      source: 'google',
      isVariable: true,
      url: 'https://fonts.gstatic.com/s/inter/inter.ttf',
      variants: [
        { name: 'Regular 400', weight: 400, url: 'https://fonts.gstatic.com/s/inter/inter-400.ttf' },
        { name: 'Bold 700', weight: 700, url: 'https://fonts.gstatic.com/s/inter/inter-700.ttf' }
      ]
    };

    const boldVariant = sampleItem.variants[1];
    await handleOpenInCustomize(sampleItem, boldVariant);

    const state = store.getState();
    expect(state.fontData).toBeDefined();
    expect(state.fontData?.fullName).toBe('Inter Variable');
    expect(state.axisValues['wght']).toBe(700);
    expect(state.selectedPreset).toBe('Bold (700)');
    expect(state.weightMode).toBe('custom');
    expect(state.currentTab).toBe('customize');
  });

  it('guarantees bundled Google variable fonts have authentic variableUrl and Variable variant', async () => {
    const { BUNDLED_GOOGLE_FONTS } = await import('../src/browse/bundledCatalog');
    const inter = BUNDLED_GOOGLE_FONTS.find(f => f.name === 'Inter');
    expect(inter).toBeDefined();
    expect(inter?.isVariable).toBe(true);
    expect(inter?.variableUrl).toBeDefined();
    expect(inter?.variableUrl).toContain('cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/Inter');
    expect(inter?.url).toBe(inter?.variableUrl);

    const varVariant = inter?.variants.find(v => v.name === 'Variable (100–900)');
    expect(varVariant).toBeDefined();
    expect(varVariant?.isVariable).toBe(true);
    expect(varVariant?.url).toBe(inter?.variableUrl);
  });

  it('detects fvar table accurately in binary buffers and invalidates stale static caches', async () => {
    const { FontParser } = await import('../src/font/parser');
    const { getGoogleVariableFontUrl } = await import('../src/browse/variableFonts');
    expect(getGoogleVariableFontUrl('inter')).toContain('Inter%5Bopsz%2Cwght%5D.ttf');
    expect(getGoogleVariableFontUrl('montserrat')).toContain('Montserrat%5Bwght%5D.ttf');
    expect(getGoogleVariableFontUrl('non-existent-font-slug-xyz')).toBeUndefined();

    // Buffer without fvar
    const emptyBuf = new ArrayBuffer(50);
    expect(FontParser.hasFvarTable(emptyBuf)).toBe(false);

    // Synthesize minimal OpenType header with fvar table entry
    const sfntBuf = new ArrayBuffer(64);
    const view = new DataView(sfntBuf);
    view.setUint32(0, 0x00010000); // sfntVersion
    view.setUint16(4, 1); // numTables = 1
    // Write tag 'fvar' at offset 12
    view.setUint8(12, 102); // 'f'
    view.setUint8(13, 118); // 'v'
    view.setUint8(14, 97);  // 'a'
    view.setUint8(15, 114); // 'r'
    expect(FontParser.hasFvarTable(sfntBuf)).toBe(true);
  });

  it('displays download progress directly inside the preview modal during direct apply', async () => {
    const { handleApplyDirectly } = await import('../src/ui/browse');

    const mockModalBox: any = { style: { display: 'none' } };
    const mockModalFill: any = { style: { width: '0%' } };
    const mockModalText: any = { textContent: '' };
    const mockModalPct: any = { textContent: '' };
    const mockApplyBtn: any = { disabled: false, innerHTML: 'Apply Directly' };
    const mockBackdrop: any = { style: { display: 'flex' }, classList: { remove: vi.fn() }, setAttribute: vi.fn() };

    const domMap: Record<string, any> = {
      'modal-download-progress-box': mockModalBox,
      'modal-download-progress-fill': mockModalFill,
      'modal-download-progress-text': mockModalText,
      'modal-download-progress-pct': mockModalPct,
      'btn-preview-apply': mockApplyBtn,
      'browse-preview-backdrop': mockBackdrop
    };

    globalThis.document = {
      getElementById: (id: string) => domMap[id] || null,
      querySelectorAll: () => []
    } as any;

    const dummyEmojiItem: any = {
      id: 'emoji-ios-26',
      name: 'iOS 26.4 (Unicode 17)',
      type: 'emoji',
      source: 'zfont',
      url: 'https://example.com/ios26.ttf',
      variants: [{ name: 'Default', weight: 400, url: 'https://example.com/ios26.ttf' }]
    };

    // Spy on downloadAndCacheFont to simulate streaming progress
    vi.spyOn(await import('../src/browse/catalogService'), 'downloadAndCacheFont').mockImplementation(async (_item, _variant, onProgress) => {
      onProgress?.(45, 'Downloading iOS 26.4... 45% (15.2/33.7 MB)');
      return new Uint8Array([1, 2, 3, 4]).buffer;
    });

    // Mock dialog runApplyWorkflow so it resolves cleanly
    vi.spyOn(await import('../src/ui/components/dialog'), 'runApplyWorkflow').mockResolvedValue(true as any);

    // Run direct apply
    await handleApplyDirectly(dummyEmojiItem);

    // Verify progress elements inside modal were updated during streaming
    expect(mockModalFill.value).toBe(100);
    expect(mockModalText.textContent).toBe('Verifying package payload...');
    expect(mockModalPct.textContent).toBe('100%');
  });

  it('downloads and applies the static variant when a specific weight is selected for a variable font', async () => {
    const { handleApplyDirectly } = await import('../src/ui/browse');

    const domMap: Record<string, any> = {
      'modal-download-progress-box': { style: { display: 'none' } },
      'modal-download-progress-fill': { value: 0, setAttribute: vi.fn(), style: { width: '0%' } },
      'modal-download-progress-text': { textContent: '' },
      'modal-download-progress-pct': { textContent: '' },
      'btn-preview-apply': { disabled: false, innerHTML: 'Apply Directly' },
      'browse-preview-sheet': { hide: vi.fn(), style: { display: 'block' }, setAttribute: vi.fn() }
    };

    globalThis.document = {
      getElementById: (id: string) => domMap[id] || null,
      querySelectorAll: () => []
    } as any;

    const dummyVariableItem: any = {
      id: 'gf-outfit',
      name: 'Outfit',
      type: 'font',
      source: 'google',
      isVariable: true,
      url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/Outfit[wght].ttf',
      variants: [
        {
          name: 'Variable (100–900)',
          weight: '100-900',
          url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/Outfit[wght].ttf',
          isVariable: true
        },
        {
          name: 'Regular',
          weight: 400,
          url: 'https://cdn.jsdelivr.net/fontsource/fonts/outfit@latest/latin-400-normal.ttf',
          isVariable: false
        }
      ]
    };

    const regularVariant = dummyVariableItem.variants[1];
    let downloadedTargetVariant: any = null;

    vi.spyOn(await import('../src/browse/catalogService'), 'downloadAndCacheFont').mockImplementation(async (_item, variant) => {
      downloadedTargetVariant = variant;
      return new Uint8Array([1, 2, 3, 4]).buffer;
    });

    let appliedOptions: any = null;
    vi.spyOn(await import('../src/bridge/service'), 'fontService', 'get').mockReturnValue({
      applyFont: vi.fn(async (opts) => {
        appliedOptions = opts;
      }),
      checkLocalDownload: vi.fn().mockResolvedValue(null)
    } as any);

    vi.spyOn(await import('../src/font/parser'), 'FontParser', 'get').mockReturnValue({
      parse: vi.fn(() => ({
        valid: true,
        fullName: 'Outfit Regular',
        family: 'Outfit',
        weight: 400,
        isVariable: false
      }))
    } as any);

    vi.spyOn(await import('../src/ui/components/dialog'), 'runApplyWorkflow').mockImplementation(async (opts: any) => {
      await opts.onApply();
      return true;
    });

    await handleApplyDirectly(dummyVariableItem, regularVariant);

    // downloadTarget should be the selected Regular static variant, NOT the variable variant!
    expect(downloadedTargetVariant.name).toBe('Regular');
    expect(downloadedTargetVariant.weight).toBe(400);
    expect(downloadedTargetVariant.url).toContain('latin-400-normal.ttf');

    // Applied options should register using the font family name only
    expect(appliedOptions.fontName).toBe('Outfit');
    expect(appliedOptions.isVariable).toBe(false);
  });

  it('resolves active font name to the family name without weight or style suffix', async () => {
    const { resolveAppliedFontName } = await import('../src/ui/customize');

    const variableThinDefault: FontInfo = {
      valid: true,
      format: 'TrueType Variable Font',
      fullName: 'Inter Thin',
      familyName: 'Inter',
      subfamilyName: 'Thin',
      postscriptName: 'Inter-Thin',
      version: '4.0',
      isVariable: true,
      isCollection: false,
      numGlyphs: 1200,
      unitsPerEm: 1000,
      axes: [{ tag: 'wght', name: 'Weight', min: 100, default: 100, max: 900, current: 400 }],
      instances: [{ name: 'Regular', values: { wght: 400 } }]
    };

    expect(resolveAppliedFontName(variableThinDefault, 'Regular', 'custom', { wght: 400 })).toBe('Inter');
    expect(resolveAppliedFontName(variableThinDefault, 'SemiBold (600)', 'custom', { wght: 600 })).toBe('Inter');
    expect(resolveAppliedFontName(variableThinDefault, 'Auto (Stock)', 'auto', { wght: 100 })).toBe('Inter');
    expect(resolveAppliedFontName(variableThinDefault, 'Custom', 'custom', { wght: 550 })).toBe('Inter');
  });
});
