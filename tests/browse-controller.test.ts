import { describe, it, expect, beforeEach } from 'vitest';
import {
  BrowseController,
  PAGE_SIZE,
  buildGoogleFontsCssUrl,
  buildSubsetText
} from '../src/browse/browseController';
import { clearAllCachedFonts, saveCachedFont } from '../src/browse/fontCache';
import { resetCatalog } from '../src/browse/catalogService';

describe('BrowseController (Deep Module, Zero DOM Mocks)', () => {
  beforeEach(async () => {
    resetCatalog();
    await clearAllCachedFonts();
  });

  it('refreshes, filters by variable/emoji, and paginates via loadMore', async () => {
    const ctrl = new BrowseController();
    await ctrl.refresh(true);
    expect(ctrl.state.items.length).toBeGreaterThan(PAGE_SIZE);
    expect(ctrl.state.displayedCount).toBe(PAGE_SIZE);

    expect(ctrl.loadMore()).toBe(true);
    expect(ctrl.state.displayedCount).toBe(PAGE_SIZE * 2);

    ctrl.setCategoryFilter('variable');
    await ctrl.refresh(true);
    expect(ctrl.state.items.length).toBeGreaterThan(0);
    expect(ctrl.state.items.every(i => i.isVariable)).toBe(true);

    ctrl.setCategoryFilter('emoji');
    await ctrl.refresh(true);
    expect(ctrl.state.items.length).toBeGreaterThan(0);
    expect(ctrl.state.items.every(i => i.type === 'emoji')).toBe(true);
  });

  it('deletes cached items and updates downloadedOnly list without DOM queries', async () => {
    const ctrl = new BrowseController();
    const item = {
      id: 'gf-inter',
      name: 'Inter',
      type: 'font' as const,
      source: 'google' as const,
      category: 'Sans Serif',
      variants: [{ name: 'Regular', weight: 400, url: 'https://example.com/inter.ttf' }]
    };
    await saveCachedFont(item.id, item, new Uint8Array([1, 2, 3, 4]).buffer);

    ctrl.state.filters.downloadedOnly = true;
    await ctrl.refresh(true);
    expect(ctrl.state.items.some(i => i.id === 'gf-inter')).toBe(true);

    ctrl.openPreview(item);
    await ctrl.deleteCached('gf-inter');
    expect(ctrl.state.cachedIds.has('gf-inter')).toBe(false);
    expect(ctrl.state.items.some(i => i.id === 'gf-inter')).toBe(false);
    expect(ctrl.state.activeItem).toBeNull();
  });

  it('builds Google Fonts CSS2 primary and fallback URLs with deduplicated subset text', () => {
    const item = {
      id: 'gf-inter',
      name: 'Inter',
      type: 'font' as const,
      source: 'google' as const,
      category: 'Sans Serif',
      isVariable: true,
      availableWeights: [100, 400, 900],
      variants: []
    };

    const subset = buildSubsetText(item, 'Hello');
    expect(subset).toContain('H');
    expect(subset).not.toContain('\n');

    const urls = buildGoogleFontsCssUrl(item, 'Hello');
    expect(urls.primaryUrl).toContain('family=Inter:wght@100..900');
    expect(urls.primaryUrl).toContain('&text=');
    expect(urls.fallbackUrl).toBe('https://fonts.googleapis.com/css2?family=Inter&display=swap');
  });
});
