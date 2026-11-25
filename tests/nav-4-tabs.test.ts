import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TAB_ORDER,
  getTabOffset,
  initPageSwipe,
  slideToTab
} from '../src/ui/components/pageSwipe';
import { store } from '../src/state/store';

describe('4-Tab Navigation & ViewPager Mechanics (M3E)', () => {
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

  it('defines 4 tabs in correct order', () => {
    expect(TAB_ORDER).toEqual(['overview', 'browse', 'customize', 'emoji']);
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
      onSettle: vi.fn()
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

  it('hides floating actions cluster when switched to browse or overview tab', async () => {
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
      removeAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const mockFabApply: any = {
      disabled: true,
      attributes: {} as Record<string, string>,
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
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

    store.setState({ currentTab: 'customize' });
    expect(mockCluster.classList.contains('hidden')).toBe(false);

    store.setState({ currentTab: 'browse' });
    expect(mockCluster.classList.contains('hidden')).toBe(true);

    store.setState({ currentTab: 'emoji' });
    expect(mockCluster.classList.contains('hidden')).toBe(false);

    store.setState({ currentTab: 'overview' });
    expect(mockCluster.classList.contains('hidden')).toBe(true);

    controller.destroy();
  });

  it('handles m3e-bottom-sheet preview open and close lifecycles', async () => {
    const mockSheet: any = {
      show: vi.fn(),
      hide: vi.fn(),
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
    expect(mockSheet.show).toHaveBeenCalledWith(1);
    expect(mockContainer.innerHTML).toContain('Inter');
    expect(mockContainer.innerHTML).toContain('Rasmus Andersson');
    expect(mockContainer.innerHTML).toContain('Apply Directly');
    expect(mockContainer.innerHTML).toContain('Open in Customize');

    closePreviewSheet();
    expect(mockSheet.hide).toHaveBeenCalled();
  });
});
