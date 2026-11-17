import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getItems,
  getItemsSync,
  getItemById,
  getCategories,
  resolveVariant,
  searchGoogleFontsDirectory,
  normalizeGoogleFontDirectoryItem,
  syncOnlineCatalog,
  downloadAndCacheFont,
  resetCatalog
} from '../src/browse/catalogService';
import {
  getCachedFont,
  saveCachedFont,
  isFontCached,
  getAllCachedFontIds,
  deleteCachedFont,
  clearAllCachedFonts,
  getFontCacheSummary
} from '../src/browse/fontCache';
import {
  BUNDLED_CATALOG,
  BUNDLED_GOOGLE_FONTS,
  BUNDLED_ZFONT_FONTS,
  BUNDLED_ZFONT_EMOJIS
} from '../src/browse/bundledCatalog';
import {
  buildSubsetText,
  SUBSET_CHARS,
  isVariableItem,
  getVariableVariant,
  getStaticVariants,
  updateSpecimenWeight,
  loadPreviewFontFace
} from '../src/ui/browse';
import type { BrowseItem } from '../src/browse/types';

describe('Browse Catalog & Data Contracts', () => {
  beforeEach(async () => {
    resetCatalog();
    await clearAllCachedFonts();
    vi.restoreAllMocks();
  });

  describe('Bundled Snapshot Structure', () => {
    it('contains ~100-150 top Google Fonts families across all major categories', () => {
      expect(BUNDLED_GOOGLE_FONTS.length).toBeGreaterThanOrEqual(100);
      expect(BUNDLED_GOOGLE_FONTS.length).toBeLessThanOrEqual(150);

      // Verify category distribution
      const categories = new Set(BUNDLED_GOOGLE_FONTS.map((f) => f.category));
      expect(categories).toContain('Sans Serif');
      expect(categories).toContain('Serif');
      expect(categories).toContain('Monospace');
      expect(categories).toContain('Display');
      expect(categories).toContain('Handwriting');

      const inter = BUNDLED_GOOGLE_FONTS.find((f) => f.name === 'Inter');
      expect(inter).toBeDefined();
      expect(inter?.isVariable).toBe(true);
      expect(inter?.variableAxes).toContain('wght');
      expect(inter?.availableWeights?.length).toBeGreaterThanOrEqual(5);
      expect(inter?.variants.length).toBeGreaterThanOrEqual(5);

      const weights = inter?.variants.map((v) => Number(v.weight));
      expect(weights).toContain(400);
      expect(weights).toContain(700);

      const jetbrains = BUNDLED_GOOGLE_FONTS.find((f) => f.name === 'JetBrains Mono');
      expect(jetbrains).toBeDefined();
      expect(jetbrains?.category).toBe('Monospace');
      expect(jetbrains?.isVariable).toBe(false);
    });

    it('specifies all required metadata fields on every Google font entry', () => {
      for (const font of BUNDLED_GOOGLE_FONTS) {
        expect(font.id).toMatch(/^gf-[a-z0-9-]+$/);
        expect(font.name).toBeTruthy();
        expect(font.type).toBe('font');
        expect(font.source).toBe('google');
        expect(typeof font.isVariable).toBe('boolean');
        expect(Array.isArray(font.variableAxes)).toBe(true);
        expect(Array.isArray(font.availableWeights)).toBe(true);
        expect(font.availableWeights!.length).toBeGreaterThan(0);
        expect(font.url).toBeTruthy();
        expect(font.url).toContain('.ttf');
        expect(font.thumbnailUrl).toBeTruthy();
        expect(font.thumbnailUrl).toContain('data:image/svg+xml');
        expect(font.previewText).toBeTruthy();
        expect(font.description).toBeTruthy();
        expect(font.variants.length).toBeGreaterThan(0);
        for (const variant of font.variants) {
          expect(variant.url).toBeTruthy();
          expect(variant.url).toContain('.ttf');
          expect(variant.weight).toBeTruthy();
        }
      }
    });

    it('has zero zFont font entries in BUNDLED_CATALOG and empty BUNDLED_ZFONT_FONTS', () => {
      expect(BUNDLED_ZFONT_FONTS.length).toBe(0);

      const zFontFontsInCatalog = BUNDLED_CATALOG.filter(
        (item) => item.source === 'zfont' && item.type === 'font'
      );
      expect(zFontFontsInCatalog.length).toBe(0);

      // Every font in the catalog must be Google source
      const allFonts = BUNDLED_CATALOG.filter((item) => item.type === 'font');
      expect(allFonts.length).toBe(BUNDLED_GOOGLE_FONTS.length);
      expect(allFonts.every((f) => f.source === 'google')).toBe(true);

      // Every emoji in the catalog must be zFont source
      const allEmojis = BUNDLED_CATALOG.filter((item) => item.type === 'emoji');
      expect(allEmojis.length).toBe(BUNDLED_ZFONT_EMOJIS.length);
      expect(allEmojis.every((e) => e.source === 'zfont')).toBe(true);
    });

    it('verifies variable font coverage in the expanded Google Fonts catalog', () => {
      const variableFonts = BUNDLED_GOOGLE_FONTS.filter((f) => f.isVariable);
      expect(variableFonts.length).toBeGreaterThanOrEqual(25);

      const variableNames = variableFonts.map((f) => f.name);
      expect(variableNames).toContain('Inter');
      expect(variableNames).toContain('Open Sans');
      expect(variableNames).toContain('Montserrat');
      expect(variableNames).toContain('Nunito');
      expect(variableNames).toContain('Raleway');

      for (const vf of variableFonts) {
        expect(vf.variableAxes).toBeDefined();
        expect(vf.variableAxes).toContain('wght');
        expect(vf.availableWeights).toBeDefined();
        expect(vf.availableWeights!.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('links all zFont emojis with emoji type and default variant', () => {
      expect(BUNDLED_ZFONT_EMOJIS.length).toBe(88);

      const ios26 = BUNDLED_ZFONT_EMOJIS.find((e) => e.id === 'emoji-ios-26');
      expect(ios26).toBeDefined();
      expect(ios26?.type).toBe('emoji');
      expect(ios26?.source).toBe('zfont');
      expect(ios26?.variants[0]?.url).toContain('iOS%2026.4%20(Unicode%2017).ttf');
      expect(ios26?.thumbnailUrl).toContain('cdn.jsdelivr.net/gh/zFont/Host@main/Preview/');
      expect(ios26?.thumbnailUrl).toMatch(/\.png$/);

      for (const emoji of BUNDLED_ZFONT_EMOJIS) {
        expect(emoji.thumbnailUrl).toBeDefined();
        expect(emoji.thumbnailUrl).toContain('cdn.jsdelivr.net/gh/zFont/Host@main/Preview/');
      }
    });

    it('combines total catalog items without null or invalid fields', () => {
      expect(BUNDLED_CATALOG.length).toBe(
        BUNDLED_GOOGLE_FONTS.length + BUNDLED_ZFONT_EMOJIS.length
      );

      for (const item of BUNDLED_CATALOG) {
        expect(item.id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(['font', 'emoji']).toContain(item.type);
        expect(['google', 'zfont']).toContain(item.source);
        expect(item.category).toBeTruthy();
        expect(item.variants.length).toBeGreaterThan(0);
        expect(item.variants[0].url).toBeTruthy();
      }
    });
  });

  describe('Filtering by Search Query', () => {
    it('matches item name case-insensitively', async () => {
      const items = await getItems({ query: 'inter' });
      expect(items.some((i) => i.name === 'Inter')).toBe(true);
    });

    it('matches multi-word queries across multiple fields (e.g. google mono)', async () => {
      const items = await getItems({ query: 'google mono' });
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.source === 'google')).toBe(true);
      expect(items.some((i) => i.name === 'Roboto Mono')).toBe(true);
    });

    it('matches author name', async () => {
      const items = await getItems({ query: 'Rasmus Andersson' });
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Inter');
    });

    it('returns empty array when query does not match anything and remote fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      const items = await getItems({ query: 'xyznonexistentterm999' });
      expect(items).toEqual([]);
    });

    it('returns all items when query is whitespace or empty', async () => {
      const all = await getItems();
      const emptySearch = await getItems({ query: '   ' });
      expect(emptySearch.length).toBe(all.length);
    });

    it('supports synchronous item filtering via getItemsSync', () => {
      const all = getItemsSync();
      expect(all.length).toBe(BUNDLED_CATALOG.length);

      const monospace = getItemsSync({ category: 'Monospace' });
      expect(monospace.length).toBeGreaterThan(0);
      expect(monospace.every((i) => i.category === 'Monospace')).toBe(true);
    });
  });

  describe('Filtering by Type & Source', () => {
    it('filters strictly by font type', async () => {
      const fonts = await getItems({ type: 'font' });
      expect(fonts.length).toBe(BUNDLED_GOOGLE_FONTS.length);
      expect(fonts.every((item) => item.type === 'font')).toBe(true);
    });

    it('filters strictly by emoji type', async () => {
      const emojis = await getItems({ type: 'emoji' });
      expect(emojis.length).toBe(88);
      expect(emojis.every((item) => item.type === 'emoji')).toBe(true);
    });

    it('filters strictly by Google source', async () => {
      const googleItems = await getItems({ source: 'google' });
      expect(googleItems.length).toBe(BUNDLED_GOOGLE_FONTS.length);
      expect(googleItems.every((item) => item.source === 'google')).toBe(true);
    });

    it('filters strictly by zFont source (emojis only)', async () => {
      const zfontItems = await getItems({ source: 'zfont' });
      expect(zfontItems.length).toBe(BUNDLED_ZFONT_EMOJIS.length);
      expect(zfontItems.every((item) => item.source === 'zfont')).toBe(true);
      expect(zfontItems.every((item) => item.type === 'emoji')).toBe(true);
    });

    it('supports combining type and source filters (0 zFont fonts)', async () => {
      const zfontFonts = await getItems({ type: 'font', source: 'zfont' });
      expect(zfontFonts.length).toBe(0);
    });

    it('filters strictly by variable fonts using isVariable: true', async () => {
      const variableItems = await getItems({ isVariable: true });
      expect(variableItems.length).toBeGreaterThanOrEqual(25);
      expect(variableItems.every((item) => item.isVariable === true)).toBe(true);
      expect(variableItems.every((item) => item.type === 'font')).toBe(true);
      expect(variableItems.some((item) => item.name === 'Inter')).toBe(true);
      expect(variableItems.some((item) => item.name === 'Montserrat')).toBe(true);
    });

    it('filters strictly by static fonts using isVariable: false', async () => {
      const staticFonts = await getItems({ type: 'font', isVariable: false });
      expect(staticFonts.length).toBeGreaterThan(0);
      expect(staticFonts.every((item) => item.isVariable === false)).toBe(true);
      expect(staticFonts.some((item) => item.name === 'JetBrains Mono')).toBe(true);
      expect(staticFonts.some((item) => item.name === 'Roboto')).toBe(true);
    });

    it('supports combining isVariable with category and type filters', async () => {
      const variableSerif = await getItems({ type: 'font', category: 'Serif', isVariable: true });
      expect(variableSerif.length).toBeGreaterThan(0);
      expect(variableSerif.every((item) => item.category === 'Serif' && item.isVariable === true)).toBe(true);

      const staticMono = await getItems({ type: 'font', category: 'Monospace', isVariable: false });
      expect(staticMono.length).toBeGreaterThan(0);
      expect(staticMono.every((item) => item.category === 'Monospace' && item.isVariable === false)).toBe(true);
    });

    it('supports synchronous isVariable filtering via getItemsSync', () => {
      const variableSync = getItemsSync({ type: 'font', isVariable: true });
      const staticSync = getItemsSync({ type: 'font', isVariable: false });
      expect(variableSync.length).toBeGreaterThanOrEqual(25);
      expect(variableSync.every((item) => item.isVariable === true)).toBe(true);
      expect(staticSync.every((item) => item.isVariable === false)).toBe(true);
      expect(variableSync.length + staticSync.length).toBe(BUNDLED_GOOGLE_FONTS.length);
    });
  });

  describe('Filtering by Category & getCategories', () => {
    it('filters by category accurately', async () => {
      const monospace = await getItems({ category: 'Monospace' });
      expect(monospace.length).toBeGreaterThanOrEqual(10);
      expect(monospace.every((i) => i.category === 'Monospace')).toBe(true);

      const names = monospace.map((i) => i.name);
      expect(names).toContain('JetBrains Mono');
      expect(names).toContain('Fira Code');
      expect(names).toContain('Roboto Mono');
    });

    it('handles case-insensitive category matching', async () => {
      const lowercase = await getItems({ category: 'monospace' });
      const uppercase = await getItems({ category: 'MONOSPACE' });
      expect(lowercase.length).toBe(uppercase.length);
    });

    it('retrieves distinct sorted categories by content type', () => {
      const fontCategories = getCategories('font');
      expect(fontCategories).toContain('Sans Serif');
      expect(fontCategories).toContain('Monospace');
      expect(fontCategories).toContain('Serif');
      expect(fontCategories).toContain('Display');
      expect(fontCategories).toContain('Handwriting');
      expect(fontCategories).not.toContain('Stylish');
      expect(fontCategories).not.toContain('Color');

      const emojiCategories = getCategories('emoji');
      expect(emojiCategories).toContain('Emoji');
    });
  });

  describe('Variant Resolution (Variable wght Axis & Static Weights)', () => {
    it('resolves exact weight variant when available', () => {
      const inter = getItemById('gf-inter')!;
      expect(inter).toBeDefined();

      const v300 = resolveVariant(inter, 300);
      expect(v300.weight).toBe(300);
      expect(v300.name).toContain('300');
      expect(v300.isVariable).toBe(true);
      expect(v300.axisValues?.wght).toBe(300);

      const v700 = resolveVariant(inter, 700);
      expect(v700.weight).toBe(700);
      expect(v700.name).toContain('700');
    });

    it('resolves continuous wght axis dynamically for variable fonts', () => {
      const inter = getItemById('gf-inter')!;
      expect(inter.isVariable).toBe(true);

      // 550 is between 500 and 600, not an exact static variant
      const v550 = resolveVariant(inter, 550);
      expect(v550.weight).toBe(550);
      expect(v550.isVariable).toBe(true);
      expect(v550.axisValues?.wght).toBe(550);
      expect(v550.name).toContain('550');

      // Clamping: out-of-range weight 50 clamps to min 100
      const v50 = resolveVariant(inter, 50);
      expect(v50.weight).toBe(100);
      expect(v50.axisValues?.wght).toBe(100);
    });

    it('resolves string representation of weight', () => {
      const roboto = getItemById('gf-roboto')!;
      const v900 = resolveVariant(roboto, '900');
      expect(v900.weight).toBe(900);
    });

    it('resolves closest numeric weight for static fonts when exact weight is not in variants', () => {
      const jetbrains = getItemById('gf-jetbrains-mono')!; // static font with weights: 400, 500, 700
      expect(jetbrains.isVariable).toBe(false);

      const resolved = resolveVariant(jetbrains, 650);
      expect(resolved.weight).toBe(700);

      const resolvedLight = resolveVariant(jetbrains, 100);
      expect(resolvedLight.weight).toBe(400);
    });

    it('returns default variant when targetWeight is omitted or font is single-weight', () => {
      const anton = getItemById('gf-anton')!; // single-weight 400
      expect(anton).toBeDefined();
      const resolved = resolveVariant(anton);
      expect(resolved.name).toContain('400');
      expect(resolved.url).toBe(anton.variants[0].url);
    });
  });

  describe('Dynamic Search against Google Fonts Directory', () => {
    it('normalizes a Google Fonts API entry correctly', () => {
      const item = normalizeGoogleFontDirectoryItem({
        id: 'alegreya-sans',
        family: 'Alegreya Sans',
        category: 'sans-serif',
        variable: true,
        weights: [300, 400, 700]
      });

      expect(item.id).toBe('gf-alegreya-sans');
      expect(item.name).toBe('Alegreya Sans');
      expect(item.category).toBe('Sans Serif');
      expect(item.source).toBe('google');
      expect(item.type).toBe('font');
      expect(item.isVariable).toBe(true);
      expect(item.variableAxes).toContain('wght');
      expect(item.availableWeights).toEqual([300, 400, 700]);
      expect(item.variants.length).toBe(3);
      expect(item.variants[0].url).toContain('latin-300-normal.ttf');
      expect(item.thumbnailUrl).toContain('data:image/svg+xml');
    });

    it('dynamically queries Google Fonts directory when a query searches outside bundled snapshot', async () => {
      const mockFontData = {
        id: 'alegreya',
        family: 'Alegreya',
        category: 'serif',
        variable: true,
        weights: [400, 500, 700, 800, 900]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockFontData
      } as Response);

      const results = await getItems({ query: 'Alegreya' });
      expect(results.length).toBeGreaterThan(0);

      const alegreya = results.find((r) => r.name === 'Alegreya');
      expect(alegreya).toBeDefined();
      expect(alegreya?.source).toBe('google');
      expect(alegreya?.category).toBe('Serif');
      expect(alegreya?.isVariable).toBe(true);

      // Verify it was added to active catalog
      const cached = getItemById('gf-alegreya');
      expect(cached).toBeDefined();
    });

    it('directly invokes searchGoogleFontsDirectory returning normalized items', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-font',
          family: 'Test Font',
          category: 'sans-serif',
          variable: true,
          weights: [400]
        })
      } as Response);

      const items = await searchGoogleFontsDirectory('Test Font');
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Test Font');
    });

    it('handles network failure in dynamic search by falling back gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      const results = await getItems({ query: 'NonExistentFontFamily' });
      expect(results).toEqual([]);
    });
  });

  describe('FontCache Layer (IndexedDB / In-Memory Storage)', () => {
    const dummyItem: BrowseItem = {
      id: 'test-font-item',
      name: 'Test Font Item',
      type: 'font',
      source: 'google',
      category: 'Sans Serif',
      variants: [{ name: 'Regular', weight: 400, url: 'https://example.com/test.ttf' }]
    };

    it('manages saving, retrieving, checking and deleting cached fonts', async () => {
      expect(await isFontCached('test-font-item')).toBe(false);
      expect(await getCachedFont('test-font-item')).toBeNull();

      const dummyBuffer = new Uint8Array([0, 1, 0, 0, 7, 8, 9]).buffer;
      await saveCachedFont('test-font-item', dummyItem, dummyBuffer);

      expect(await isFontCached('test-font-item')).toBe(true);

      const cached = await getCachedFont('test-font-item');
      expect(cached).not.toBeNull();
      expect(cached?.id).toBe('test-font-item');
      expect(cached?.item.name).toBe('Test Font Item');
      expect(cached?.buffer.byteLength).toBe(7);

      const allIds = await getAllCachedFontIds();
      expect(allIds).toContain('test-font-item');

      const summary = await getFontCacheSummary();
      expect(summary.count).toBe(1);
      expect(summary.totalBytes).toBe(7);

      await deleteCachedFont('test-font-item');
      expect(await isFontCached('test-font-item')).toBe(false);
      expect(await getCachedFont('test-font-item')).toBeNull();
    });

    it('filters items by downloadedOnly status using cache', async () => {
      const inter = getItemById('gf-inter')!;
      const buf = new Uint8Array([1, 2, 3]).buffer;

      // Initially no items downloaded
      const initialDownloaded = await getItems({ downloadedOnly: true });
      expect(initialDownloaded).toEqual([]);

      // Cache Inter
      await saveCachedFont('gf-inter', inter, buf);

      const afterDownload = await getItems({ downloadedOnly: true });
      expect(afterDownload.length).toBe(1);
      expect(afterDownload[0].id).toBe('gf-inter');
    });
  });

  describe('Online Catalog Sync & Fallbacks', () => {
    it('merges new categories and fonts from online data.json response', async () => {
      const mockData = {
        categories: [
          {
            name: 'Myanmar',
            items: [
              {
                n: 'AkkhayarBrush-Regular',
                s: 98488,
                t: '/Preview/Language/Myanmar/2024/AkkhayarBrush-Regular.png',
                a: 'The Akkhayar',
                f: '/Font/Language/Myanmar/2024/AkkhayarBrush-Regular.ttf'
              }
            ]
          }
        ]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      } as Response);

      const updated = await syncOnlineCatalog('https://example.com/data.json');
      const syncedFont = updated.find((i) => i.id.includes('akkhayarbrush-regular'));

      expect(syncedFont).toBeDefined();
      expect(syncedFont?.name).toBe('AkkhayarBrush-Regular');
      expect(syncedFont?.category).toBe('Myanmar');
      expect(syncedFont?.url).toContain('https://raw.githubusercontent.com/zFont/Host/main/Font/');
    });

    it('gracefully keeps bundled catalog when fetch fails or network is offline', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const result = await syncOnlineCatalog('https://example.com/bad-url.json');
      expect(result.length).toBe(BUNDLED_CATALOG.length);
    });
  });

  describe('Download & Cache Integration', () => {
    it('downloads from URL and saves to cache upon first call, reuses cache on second', async () => {
      const item = getItemById('gf-inter')!;
      const dummyBinary = new Uint8Array([99, 88, 77, 66]).buffer;

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => dummyBinary
      } as unknown as Response);

      // 1st call: downloads and caches
      const buffer1 = await downloadAndCacheFont(item);
      expect(buffer1.byteLength).toBe(4);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(await isFontCached(item.id)).toBe(true);

      // 2nd call: should hit cache without calling fetch
      const buffer2 = await downloadAndCacheFont(item);
      expect(buffer2.byteLength).toBe(4);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // not called again
    });
  });

  describe('Zero-Download Live Preview Logic', () => {
    let originalDocument: any;
    let originalWindow: any;

    beforeEach(() => {
      originalDocument = globalThis.document;
      originalWindow = globalThis.window;
    });

    afterEach(() => {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
    });

    it('builds lightweight subset charset string containing alphanumeric, punctuation, and specimen text', () => {
      const inter = getItemById('gf-inter')!;
      const subset = buildSubsetText(inter);

      expect(subset).toContain('A');
      expect(subset).toContain('z');
      expect(subset).toContain('0');
      expect(subset).toContain('9');
      // All characters from font name and previewText must be present in the subset glyph set
      for (const char of inter.name) {
        expect(subset).toContain(char);
      }
      for (const char of inter.previewText || '') {
        if (char !== '\n' && char !== '\r') {
          expect(subset).toContain(char);
        }
      }
      expect(SUBSET_CHARS.length).toBeGreaterThan(50);
    });

    it('dynamically expands subset text when user types additional characters', () => {
      const inter = getItemById('gf-inter')!;
      const subsetWithCustomChars = buildSubsetText(inter, '€¥£ ñáéíóú');

      expect(subsetWithCustomChars).toContain('€');
      expect(subsetWithCustomChars).toContain('ñ');
      expect(subsetWithCustomChars).toContain('á');
    });

    it('correctly identifies variable vs static items', () => {
      const inter = getItemById('gf-inter')!;
      const jetbrains = getItemById('gf-jetbrains-mono')!;

      expect(isVariableItem(inter)).toBe(true);
      expect(isVariableItem(jetbrains)).toBe(false);

      const varVariant = getVariableVariant(inter);
      expect(varVariant).toBeDefined();
      expect(varVariant?.name).toContain('Variable');
      expect(varVariant?.weight).toBe('100-900');

      const statics = getStaticVariants(inter);
      expect(statics.length).toBeGreaterThan(0);
      expect(statics.every((s) => s.weight !== '100-900')).toBe(true);
    });

    it('constructs Google Fonts CSS2 subset link without downloading TTF font binary', async () => {
      const mockHead: any = { appendChild: vi.fn() };
      const mockSpecimenBox: any = { style: {} };
      const mockStatusEl: any = { style: {}, textContent: '' };

      const elements: Record<string, any> = {
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
        getElementById: (id: string) => elements[id] || null
      } as any;

      // Track any fetch calls to verify ZERO binary downloads
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const inter = getItemById('gf-inter')!;
      await loadPreviewFontFace(inter);

      // Verify zero binary downloads: fetch should NOT be called for full font files
      expect(fetchSpy).not.toHaveBeenCalled();

      // Verify CSS2 subset link was injected
      expect(mockHead.appendChild).toHaveBeenCalled();
      const injectedLink = mockHead.appendChild.mock.calls[0][0];
      expect(injectedLink.href).toContain('https://fonts.googleapis.com/css2?family=Inter:wght@100..900');
      expect(injectedLink.href).toContain('&display=swap');
      expect(injectedLink.href).toContain('&text=');

      // Verify specimen box font family set smoothly
      expect(mockSpecimenBox.style.fontFamily).toBe('"Inter", sans-serif');
    });

    it('handles emoji preview with system fallback without CSS2 stylesheet injection', async () => {
      const mockHead: any = { appendChild: vi.fn() };
      const mockSpecimenBox: any = { style: {} };
      const mockStatusEl: any = { style: {}, textContent: '' };

      const elements: Record<string, any> = {
        'preview-specimen-box': mockSpecimenBox,
        'preview-load-status': mockStatusEl
      };

      globalThis.document = {
        head: mockHead,
        createElement: vi.fn(() => ({})),
        getElementById: (id: string) => elements[id] || null
      } as any;

      const emoji = getItemById('emoji-ios-26')!;
      expect(emoji).toBeDefined();

      await loadPreviewFontFace(emoji);

      // Emojis must NOT inject Google Fonts CSS2 stylesheet
      expect(mockHead.appendChild).not.toHaveBeenCalled();
      expect(mockSpecimenBox.style.fontFamily).toContain('CustomEmojiPreview');
      expect(mockStatusEl.textContent).toBe('Emoji pack preview');
    });

    it('smoothly updates specimen font-weight and font-variation-settings on variant switch', () => {
      const mockSpecimenBox: any = { style: {} };
      globalThis.document = {
        getElementById: (id: string) => (id === 'preview-specimen-box' ? mockSpecimenBox : null)
      } as any;

      const inter = getItemById('gf-inter')!;

      // 1. Variable variant switch
      const varVariant = getVariableVariant(inter)!;
      updateSpecimenWeight(inter, varVariant);
      expect(mockSpecimenBox.style.fontWeight).toBe('400');
      expect(mockSpecimenBox.style.fontVariationSettings).toBe("'wght' 400");

      // 2. Static weight switch on variable font (e.g. 700)
      const boldVariant = { name: 'Bold 700', weight: 700, url: 'https://example.com/bold.ttf' };
      updateSpecimenWeight(inter, boldVariant);
      expect(mockSpecimenBox.style.fontWeight).toBe('700');
      expect(mockSpecimenBox.style.fontVariationSettings).toBe("'wght' 700");

      // 3. Static font (non-variable) switch
      const jetbrains = getItemById('gf-jetbrains-mono')!;
      const monoVariant = { name: 'Medium 500', weight: 500, url: 'https://example.com/mono.ttf' };
      updateSpecimenWeight(jetbrains, monoVariant);
      expect(mockSpecimenBox.style.fontWeight).toBe('500');
      expect(mockSpecimenBox.style.fontVariationSettings).toBe('');
    });
  });
});
