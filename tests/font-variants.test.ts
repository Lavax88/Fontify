import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getWeightLabel,
  isVariableItem,
  getVariableVariant,
  getStaticVariants,
  resolveVariant,
  deriveCustomizeSelection,
  buildStylePresets,
  resolveAppliedFontName
} from '../src/font/variants';
import { FontEngine } from '../src/font/engine';
import type { BrowseItem } from '../src/browse/types';
import type { FontInfo } from '../src/font/types';

describe('Font Variants, Presets & FontEngine Slots', () => {
  const originalDocument = globalThis.document;
  const originalFontFace = globalThis.FontFace;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    FontEngine.unloadActiveFont();
    globalThis.document = originalDocument;
    globalThis.FontFace = originalFontFace;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('maps canonical weights and derives Customize axis/preset state', () => {
    expect(getWeightLabel(200)).toBe('ExtraLight');
    expect(getWeightLabel(600)).toBe('SemiBold');
    expect(getWeightLabel(450)).toBe('Weight 450');

    const varFontInfo: FontInfo = {
      valid: true,
      isVariable: true,
      isCollection: false,
      format: 'TrueType',
      familyName: 'Inter',
      subfamilyName: 'Regular',
      fullName: 'Inter Regular',
      postscriptName: 'Inter-Regular',
      version: '4.0',
      axes: [
        { tag: 'wght', name: 'Weight', min: 100, default: 400, max: 900, current: 400 },
        { tag: 'ital', name: 'Italic', min: 0, default: 0, max: 1, current: 0 }
      ],
      instances: [],
      numGlyphs: 1200,
      unitsPerEm: 1000
    };

    expect(resolveAppliedFontName(varFontInfo)).toBe('Inter');
    expect(deriveCustomizeSelection(varFontInfo, { name: 'Bold 700', weight: 700, url: '' })).toEqual({
      axisValues: { wght: 700 },
      selectedPreset: 'Bold (700)',
      weightMode: 'custom',
      targetWeight: 700,
      isVarSelected: false
    });
    expect(deriveCustomizeSelection(varFontInfo, { name: 'Variable (100–900)', weight: '100-900', url: '', isVariable: true })).toEqual({
      axisValues: { wght: 400 },
      selectedPreset: 'Auto (Stock)',
      weightMode: 'auto',
      targetWeight: 100,
      isVarSelected: true
    });
    expect(buildStylePresets(varFontInfo)).toEqual([
      { name: 'Roman', values: { ital: 0 } },
      { name: 'Italic', values: { ital: 1 } }
    ]);
  });

  it('resolves static and variable variants consistently', () => {
    const item: BrowseItem = {
      id: 'gf-inter',
      name: 'Inter',
      type: 'font',
      source: 'google',
      category: 'Sans Serif',
      isVariable: true,
      variableUrl: 'https://example.com/Inter[wght].ttf',
      availableWeights: [100, 400, 700],
      variants: [
        { name: 'Variable (100–900)', weight: '100-900', url: 'https://example.com/Inter[wght].ttf', isVariable: true },
        { name: 'Regular 400', weight: 400, url: 'https://example.com/400.ttf' },
        { name: 'Bold 700', weight: 700, url: 'https://example.com/700.ttf' }
      ]
    };

    expect(isVariableItem(item)).toBe(true);
    expect(getVariableVariant(item)?.weight).toBe('100-900');
    expect(getStaticVariants(item).map(v => v.weight)).toEqual([400, 700]);
    expect(resolveVariant(item, 500).axisValues?.wght).toBe(500);
  });

  it('manages independent FontEngine slots and revokes old Blob URLs on reload', async () => {
    const added = new Set<any>();
    const deleted = new Set<any>();
    const revoked: string[] = [];
    let urlCounter = 0;

    globalThis.document = {
      fonts: {
        add: (face: any) => added.add(face),
        delete: (face: any) => deleted.add(face)
      }
    } as any;

    globalThis.FontFace = class MockFontFace {
      constructor(public family: string, public source: string) {}
      async load() {
        return this;
      }
    } as any;

    URL.createObjectURL = vi.fn(() => `blob:mock-${++urlCounter}`);
    URL.revokeObjectURL = vi.fn((u: string) => {
      revoked.push(u);
    });

    const face1 = await FontEngine.loadFontFace('CustomImportedFont', new ArrayBuffer(8));
    const emojiFace = await FontEngine.loadFontFace('CustomEmojiPreview', new ArrayBuffer(8));
    expect(added.has(face1)).toBe(true);
    expect(added.has(emojiFace)).toBe(true);
    expect(revoked).toEqual([]);

    // Reloading CustomImportedFont cleans up only CustomImportedFont, leaving CustomEmojiPreview intact
    await FontEngine.loadFontFace('CustomImportedFont', new ArrayBuffer(8));
    expect(deleted.has(face1)).toBe(true);
    expect(deleted.has(emojiFace)).toBe(false);
    expect(revoked).toEqual(['blob:mock-1']);

    FontEngine.unloadActiveFont();
    expect(revoked).toEqual(['blob:mock-1', 'blob:mock-2', 'blob:mock-3']);
  });
});
