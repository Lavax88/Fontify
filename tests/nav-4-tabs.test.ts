import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TAB_ORDER,
  TAB_METRICS,
  getTabMetrics,
  computeTabSlots,
  initFloatingNav
} from '../src/ui/components/floatingNav';
import {
  TAB_ORDER as SWIPE_TAB_ORDER,
  getTabOffset,
  initPageSwipe,
  slideToTab
} from '../src/ui/components/pageSwipe';
import { store } from '../src/state/store';

describe('4-Tab Navigation & ViewPager Mechanics', () => {
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

  it('defines 4 tabs in correct order with designated metrics', () => {
    expect(TAB_ORDER).toEqual(['overview', 'browse', 'customize', 'emoji']);
    expect(SWIPE_TAB_ORDER).toEqual(['overview', 'browse', 'customize', 'emoji']);

    expect(getTabMetrics('overview')).toBe(122);
    expect(getTabMetrics('browse')).toBe(106);
    expect(getTabMetrics('customize')).toBe(96);
    expect(getTabMetrics('emoji')).toBe(102);
  });

  it('computes correct slot geometry for each active tab in a 360px bottom nav', () => {
    const navWidth = 360;

    for (const activeTab of TAB_ORDER) {
      const { slots } = computeTabSlots(activeTab, navWidth);

      // Verify all 4 tabs have calculated slots
      for (const tab of TAB_ORDER) {
        expect(slots[tab]).toBeDefined();
        expect(slots[tab].width).toBeGreaterThan(0);
        expect(slots[tab].left).toBeGreaterThanOrEqual(6);
        expect(slots[tab].center).toBe(slots[tab].left + slots[tab].width / 2);
      }

      // First tab starts at left = 6
      expect(slots['overview'].left).toBe(6);

      // Active tab has its defined metric width, inactive tabs have standard 48px width
      expect(slots[activeTab].width).toBe(TAB_METRICS[activeTab]);

      for (const tab of TAB_ORDER) {
        if (tab !== activeTab) {
          expect(slots[tab].width).toBe(48);
        }
      }

      // Last tab ('emoji') is clamped at right edge: navWidth - 6 - width
      const expectedEmojiLeft = navWidth - 6 - slots['emoji'].width;
      expect(slots['emoji'].left).toBe(expectedEmojiLeft);

      // Tab centers must be strictly strictly increasing
      expect(slots['overview'].center).toBeLessThan(slots['browse'].center);
      expect(slots['browse'].center).toBeLessThan(slots['customize'].center);
      expect(slots['customize'].center).toBeLessThan(slots['emoji'].center);
    }
  });

  it('calculates exact 4-tab swipe offsets across the viewpager track', () => {
    const containerWidth = 400;

    expect(getTabOffset('overview', containerWidth)).toBe(0);
    expect(getTabOffset('browse', containerWidth)).toBe(-400);
    expect(getTabOffset('customize', containerWidth)).toBe(-800);
    expect(getTabOffset('emoji', containerWidth)).toBe(-1200);

    const mobileWidth = 360;
    expect(getTabOffset('overview', mobileWidth)).toBe(0);
    expect(getTabOffset('browse', mobileWidth)).toBe(-360);
    expect(getTabOffset('customize', mobileWidth)).toBe(-720);
    expect(getTabOffset('emoji', mobileWidth)).toBe(-1080);
  });

  it('navigates through all 4 tabs via slideToTab', () => {
    const mockTrack: any = {
      id: 'viewpager-track',
      style: {}
    };

    const mockContainer: any = {
      id: 'viewpager-container',
      offsetWidth: 360,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    const mockDoc: any = {
      getElementById: vi.fn((id: string) => {
        if (id === 'viewpager-container') return mockContainer;
        if (id === 'viewpager-track') return mockTrack;
        return null;
      }),
      querySelector: vi.fn(() => null)
    };

    const mockWin: any = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    globalThis.document = mockDoc;
    globalThis.window = mockWin;

    const cleanup = initPageSwipe({
      onSettle: vi.fn(),
      onAnimateHighlighter: vi.fn(),
      onProgress: vi.fn(),
      onOverscroll: vi.fn(),
      onResetSprings: vi.fn()
    });

    slideToTab('overview', true);
    expect(mockTrack.style.transform).toBe('translate3d(0px, 0, 0)');

    slideToTab('browse', true);
    expect(mockTrack.style.transform).toBe('translate3d(-360px, 0, 0)');

    slideToTab('customize', true);
    expect(mockTrack.style.transform).toBe('translate3d(-720px, 0, 0)');

    slideToTab('emoji', true);
    expect(mockTrack.style.transform).toBe('translate3d(-1080px, 0, 0)');

    cleanup();
  });

  it('animates floating nav highlighter to browse tab correctly', () => {
    const mockHighlighter: any = {
      id: 'nav-highlighter',
      style: {}
    };

    const mockTabOverview: any = {
      getAttribute: () => 'overview',
      classList: { contains: () => true, toggle: vi.fn() }
    };
    const mockTabBrowse: any = {
      getAttribute: () => 'browse',
      classList: { contains: () => false, toggle: vi.fn() }
    };
    const mockTabCustomize: any = {
      getAttribute: () => 'customize',
      classList: { contains: () => false, toggle: vi.fn() }
    };
    const mockTabEmoji: any = {
      getAttribute: () => 'emoji',
      classList: { contains: () => false, toggle: vi.fn() }
    };

    const mockBottomNav: any = {
      offsetWidth: 360,
      classList: { contains: () => true, add: vi.fn(), remove: vi.fn() },
      querySelectorAll: () => [mockTabOverview, mockTabBrowse, mockTabCustomize, mockTabEmoji],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    globalThis.document = {
      documentElement: { classList: { contains: () => true } },
      body: { classList: { contains: () => true } },
      querySelector: (sel: string) => sel.includes('bottom-nav') ? mockBottomNav : null,
      getElementById: (id: string) => id === 'nav-highlighter' ? mockHighlighter : null
    } as any;

    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any;

    const onSelect = vi.fn();
    store.setState({ currentTab: 'overview' });
    const controller = initFloatingNav(onSelect);

    controller.animateToTab('browse');
    expect(mockHighlighter.style.width).toBe('106px');

    controller.animateToTab('customize');
    expect(mockHighlighter.style.width).toBe('96px');

    controller.animateToTab('emoji');
    expect(mockHighlighter.style.width).toBe('102px');

    controller.destroy();
  });

  it('hides floating actions cluster when switched to browse tab', async () => {
    const classList = new Set<string>(['hidden']);
    const mockCluster: any = {
      classList: {
        add: (cls: string) => classList.add(cls),
        remove: (cls: string) => classList.delete(cls),
        contains: (cls: string) => classList.has(cls)
      }
    };
    const mockFabReset: any = {
      attributes: {} as Record<string, string>,
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const mockFabApply: any = {
      disabled: true,
      attributes: {} as Record<string, string>,
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const mockFabApplyLabel: any = { textContent: '' };

    globalThis.document = {
      getElementById: (id: string) => {
        if (id === 'floating-action-cluster') return mockCluster;
        if (id === 'fab-reset') return mockFabReset;
        if (id === 'fab-apply') return mockFabApply;
        if (id === 'fab-apply-label') return mockFabApplyLabel;
        return null;
      }
    } as any;

    const controller = (await import('../src/ui/floatingActions')).initFloatingActions();

    // On customize tab, cluster is visible
    store.setState({ currentTab: 'customize' });
    expect(mockCluster.classList.contains('hidden')).toBe(false);

    // On browse tab, cluster is hidden
    store.setState({ currentTab: 'browse' });
    expect(mockCluster.classList.contains('hidden')).toBe(true);

    // On emoji tab, cluster is visible
    store.setState({ currentTab: 'emoji' });
    expect(mockCluster.classList.contains('hidden')).toBe(false);

    // On overview tab, cluster is hidden
    store.setState({ currentTab: 'overview' });
    expect(mockCluster.classList.contains('hidden')).toBe(true);

    controller.destroy();
  });

  it('handles browse preview bottom sheet open and close lifecycles', async () => {
    const mockSheet: any = {
      style: { display: 'none' },
      setAttribute: vi.fn(),
      removeAttribute: vi.fn()
    };
    const mockContainer: any = {
      innerHTML: '',
      querySelectorAll: vi.fn(() => [])
    };

    globalThis.document = {
      getElementById: (id: string) => {
        if (id === 'browse-preview-sheet') return mockSheet;
        if (id === 'browse-preview-container') return mockContainer;
        return null;
      }
    } as any;

    const { openPreviewSheet, closePreviewSheet } = await import('../src/ui/browse');

    const sampleItem: any = {
      id: 'google-inter',
      name: 'Inter',
      type: 'font',
      source: 'google',
      category: 'Sans Serif',
      author: 'Rasmus Andersson',
      variants: [{ name: 'Regular', weight: 400, url: 'https://example.com/inter.ttf' }]
    };

    openPreviewSheet(sampleItem);
    expect(mockSheet.style.display).toBe('block');
    expect(mockSheet.removeAttribute).toHaveBeenCalledWith('aria-hidden');
    expect(mockContainer.innerHTML).toContain('Inter');
    expect(mockContainer.innerHTML).toContain('Rasmus Andersson');
    expect(mockContainer.innerHTML).toContain('Apply Directly');
    expect(mockContainer.innerHTML).toContain('Open in Customize');

    closePreviewSheet();
    expect(mockSheet.style.display).toBe('none');
    expect(mockSheet.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
  });
});
