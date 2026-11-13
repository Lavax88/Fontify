import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initFloatingNav } from '../src/ui/components/floatingNav';

describe('Floating Nav Highlight and Sizing Bounds Repro', () => {
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

  it('proves highlight bounds and smooth width monotonic interpolation across progress', () => {
    const mockHighlighter: any = {
      id: 'nav-highlighter',
      style: {}
    };

    // Simulate DOM tabs
    let overviewActive = true;
    let customizeActive = false;
    let emojiActive = false;

    const mockTabOverview: any = {
      classList: {
        contains: vi.fn((cls: string) => cls === 'active' && overviewActive),
        toggle: vi.fn((cls: string, active: boolean) => {
          if (cls === 'active') overviewActive = active;
        })
      },
      getAttribute: vi.fn(() => 'overview'),
      // In mid-transition, an active tab may have an arbitrary intermediate width if measured dynamically
      getBoundingClientRect: vi.fn(() => ({
        width: overviewActive ? 68 : 48
      }))
    };

    const mockTabCustomize: any = {
      classList: {
        contains: vi.fn((cls: string) => cls === 'active' && customizeActive),
        toggle: vi.fn((cls: string, active: boolean) => {
          if (cls === 'active') customizeActive = active;
        })
      },
      getAttribute: vi.fn(() => 'customize'),
      getBoundingClientRect: vi.fn(() => ({
        width: customizeActive ? 55 : 48
      }))
    };

    const mockTabEmoji: any = {
      classList: {
        contains: vi.fn((cls: string) => cls === 'active' && emojiActive),
        toggle: vi.fn((cls: string, active: boolean) => {
          if (cls === 'active') emojiActive = active;
        })
      },
      getAttribute: vi.fn(() => 'emoji'),
      getBoundingClientRect: vi.fn(() => ({
        width: emojiActive ? 60 : 48
      }))
    };

    const mockBottomNav: any = {
      classList: {
        contains: vi.fn((cls: string) => cls === 'bottom-nav'),
        add: vi.fn(),
        remove: vi.fn()
      },
      style: {},
      offsetWidth: 320,
      getBoundingClientRect: vi.fn(() => ({
        // During overscroll stretch or transform, getBoundingClientRect returns scaled width!
        width: 345,
        left: 20
      })),
      querySelector: vi.fn((sel: string) => {
        if (sel.includes('overview')) return mockTabOverview;
        if (sel.includes('customize')) return mockTabCustomize;
        if (sel.includes('emoji')) return mockTabEmoji;
        return null;
      }),
      querySelectorAll: vi.fn(() => [mockTabOverview, mockTabCustomize, mockTabEmoji]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    const mockDoc: any = {
      documentElement: {
        classList: { contains: vi.fn(() => true) }
      },
      body: {
        classList: { contains: vi.fn(() => true) }
      },
      querySelector: vi.fn(() => mockBottomNav),
      getElementById: vi.fn((id: string) => (id === 'nav-highlighter' ? mockHighlighter : null))
    };

    const mockWin: any = {
      innerWidth: 400,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    globalThis.document = mockDoc;
    globalThis.window = mockWin;

    const controller = initFloatingNav(vi.fn());

    // 1. Check progress interpolation from overview to customize
    // At progress 0.5 (before threshold), then 0.56 (after threshold where customize becomes preview active)
    controller.setProgress('overview', 'customize', 0.5);
    const widthAt50 = parseFloat(mockHighlighter.style.width);

    controller.setProgress('overview', 'customize', 0.56);
    const widthAt56 = parseFloat(mockHighlighter.style.width);

    // If getTabMetrics measures DOM dynamically mid-transition, widthAt56 drops or jumps erratically!
    // It should smoothly transition between overview and customize metrics without jumping backwards or collapsing!
    expect(widthAt56).toBeGreaterThanOrEqual(widthAt50 - 5);
    expect(widthAt56).toBeGreaterThan(80);

    // 2. Check that highlighter NEVER goes out of bounds on emoji (rightmost tab)
    controller.animateToTab('emoji');
    const transformStr = mockHighlighter.style.transform;
    const match = transformStr.match(/translate3d\(([^p]+)px/);
    const leftPx = match ? parseFloat(match[1]) : 0;
    const widthPx = parseFloat(mockHighlighter.style.width);

    // In a 320px nav with 6px padding on each side, the right edge of highlighter must be <= 314px (320 - 6)
    // and left must be >= 6px!
    expect(leftPx).toBeGreaterThanOrEqual(6);
    expect(leftPx + widthPx).toBeLessThanOrEqual(314);
  });
});
