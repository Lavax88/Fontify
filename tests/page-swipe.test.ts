import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initPageSwipe, slideToTab } from '../src/ui/components/pageSwipe';
import { store } from '../src/state/store';

describe('Page Swipe ViewPager Mechanics', () => {
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

  it('gracefully returns no-op cleanup when container or track elements are missing', () => {
    const cleanup = initPageSwipe({
      onSettle: vi.fn(),
      onAnimateHighlighter: vi.fn(),
      onProgress: vi.fn(),
      onOverscroll: vi.fn(),
      onResetSprings: vi.fn()
    });

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
    expect(() => slideToTab('customize')).not.toThrow();
  });

  it('attaches touch listeners, handles swipe gestures, exclusions, and tab navigation', () => {
    const containerListeners: Record<string, Function> = {};
    const windowListeners: Record<string, Function> = {};

    const mockTrack: any = {
      id: 'viewpager-track',
      style: {}
    };

    const mockContainer: any = {
      id: 'viewpager-container',
      offsetWidth: 360,
      addEventListener: vi.fn((event: string, handler: Function) => {
        containerListeners[event] = handler;
      }),
      removeEventListener: vi.fn()
    };

    const mockBottomNav: any = {
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      }
    };

    const mockDoc: any = {
      getElementById: vi.fn((id: string) => {
        if (id === 'viewpager-container') return mockContainer;
        if (id === 'viewpager-track') return mockTrack;
        return null;
      }),
      querySelector: vi.fn((sel: string) => {
        if (sel === '.bottom-nav') return mockBottomNav;
        return null;
      })
    };

    const mockWin: any = {
      addEventListener: vi.fn((event: string, handler: Function) => {
        windowListeners[event] = handler;
      }),
      removeEventListener: vi.fn()
    };

    globalThis.document = mockDoc;
    globalThis.window = mockWin;

    const onSettle = vi.fn();
    const onAnimateHighlighter = vi.fn();
    const onProgress = vi.fn();
    const onOverscroll = vi.fn();
    const onResetSprings = vi.fn();

    store.setState({ currentTab: 'overview' });

    const cleanup = initPageSwipe({
      onSettle,
      onAnimateHighlighter,
      onProgress,
      onOverscroll,
      onResetSprings
    });

    expect(containerListeners['touchstart']).toBeDefined();
    expect(containerListeners['touchmove']).toBeDefined();
    expect(containerListeners['touchend']).toBeDefined();
    expect(containerListeners['touchcancel']).toBeDefined();

    // 1. Test slideToTab programmatically
    slideToTab('customize', true);
    expect(mockTrack.style.transform).toBe('translate3d(-360px, 0, 0)');

    slideToTab('emoji', false);
    expect(mockTrack.style.transform).toBe('translate3d(-720px, 0, 0)');

    // Reset back to overview
    store.setState({ currentTab: 'overview' });

    // 2. Test touch start on excluded elements (range slider)
    const mockSliderTarget: any = {
      closest: vi.fn((sel: string) => sel.includes('input[type="range"]'))
    };

    containerListeners['touchstart']({
      touches: [{ clientX: 200, clientY: 300 }],
      target: mockSliderTarget
    });

    // Touchmove should be ignored because touchstart was excluded
    containerListeners['touchmove']({
      touches: [{ clientX: 100, clientY: 300 }],
      cancelable: true,
      preventDefault: vi.fn()
    });
    expect(onProgress).not.toHaveBeenCalled();

    // 3. Test touch gesture on normal content with vertical scroll dominance
    const mockContentTarget: any = {
      closest: vi.fn(() => null)
    };

    containerListeners['touchstart']({
      touches: [{ clientX: 200, clientY: 200 }],
      target: mockContentTarget
    });

    // Move vertically by 30px, horizontally by 5px -> vertical dominant
    containerListeners['touchmove']({
      touches: [{ clientX: 205, clientY: 230 }],
      cancelable: true,
      preventDefault: vi.fn()
    });
    expect(mockBottomNav.classList.add).not.toHaveBeenCalledWith('nav-swiping');

    // 4. Test horizontal swipe from overview towards customize (swipe left, dx < 0)
    containerListeners['touchstart']({
      touches: [{ clientX: 300, clientY: 200 }],
      target: mockContentTarget
    });

    const preventDefaultSpy = vi.fn();
    containerListeners['touchmove']({
      touches: [{ clientX: 150, clientY: 202 }],
      cancelable: true,
      preventDefault: preventDefaultSpy
    });

    expect(mockBottomNav.classList.add).toHaveBeenCalledWith('nav-swiping');
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith('overview', 'customize', expect.any(Number));

    // Release drag beyond distance threshold (>35% of 360 = 126px; dx is -150px)
    containerListeners['touchend']();

    expect(mockBottomNav.classList.remove).toHaveBeenCalledWith('nav-swiping');
    expect(onAnimateHighlighter).toHaveBeenCalledWith('customize');
    expect(onSettle).toHaveBeenCalledWith('customize');
    expect(onResetSprings).toHaveBeenCalled();

    // 5. Test boundary overscroll (pulling right at overview, dx > 0)
    store.setState({ currentTab: 'overview' });
    containerListeners['touchstart']({
      touches: [{ clientX: 50, clientY: 200 }],
      target: mockContentTarget
    });

    containerListeners['touchmove']({
      touches: [{ clientX: 120, clientY: 200 }],
      cancelable: true,
      preventDefault: vi.fn()
    });

    expect(onOverscroll).toHaveBeenCalledWith(expect.any(Number));

    // Cancel touch
    containerListeners['touchcancel']();
    expect(onResetSprings).toHaveBeenCalled();

    // 6. Test window resize handler
    const resizeHandler = windowListeners['resize'];
    expect(resizeHandler).toBeDefined();
    resizeHandler();

    // 7. Cleanup
    cleanup();
    expect(mockContainer.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(mockWin.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
