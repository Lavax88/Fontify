import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initPageSwipe, slideToTab } from '../src/ui/components/pageSwipe';
import { store } from '../src/state/store';

describe('Page Swipe ViewPager Mechanics (<m3e-swipe-gesture>)', () => {
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
    globalThis.document = {
      getElementById: () => null
    } as any;

    const cleanup = initPageSwipe({
      onSettle: vi.fn()
    });

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
    expect(() => slideToTab('browse')).not.toThrow();
  });

  it('configures m3e-swipe-gesture inputFilter, handles gesture phases, and guards resize', () => {
    const swipeListeners: Record<string, any> = {};
    const windowListeners: Record<string, any> = {};

    const mockTrack: any = {
      id: 'viewpager-track',
      style: {}
    };

    const mockContainer: any = {
      id: 'viewpager-container',
      offsetWidth: 360
    };

    const mockSwipeEl: any = {
      id: 'viewpager-swipe',
      inputFilter: undefined as any,
      addEventListener: vi.fn((event: string, fn: any) => {
        swipeListeners[event] = fn;
      }),
      removeEventListener: vi.fn((event: string) => {
        delete swipeListeners[event];
      })
    };

    globalThis.document = {
      getElementById: (id: string) => {
        if (id === 'viewpager-container') return mockContainer;
        if (id === 'viewpager-track') return mockTrack;
        if (id === 'viewpager-swipe') return mockSwipeEl;
        return null;
      }
    } as any;

    globalThis.window = {
      addEventListener: vi.fn((event: string, fn: any) => {
        windowListeners[event] = fn;
      }),
      removeEventListener: vi.fn((event: string) => {
        delete windowListeners[event];
      })
    } as any;

    store.setState({ currentTab: 'overview' });
    const onSettle = vi.fn();

    const cleanup = initPageSwipe({ onSettle });

    // 1. inputFilter excludes interactive M3E controls
    expect(typeof mockSwipeEl.inputFilter).toBe('function');
    const sliderTarget = { closest: (sel: string) => (sel.includes('m3e-slider') ? {} : null) };
    const normalTarget = { closest: () => null };
    expect(mockSwipeEl.inputFilter({ target: sliderTarget })).toBe(false);
    expect(mockSwipeEl.inputFilter({ target: normalTarget })).toBe(true);

    // 2. Gesture move & end settle from overview -> browse
    const gestureHandler = swipeListeners['gesture'];
    expect(gestureHandler).toBeDefined();

    gestureHandler({ detail: { phase: 'start', axis: 'x', translationX: 0 } });
    gestureHandler({ detail: { phase: 'move', axis: 'x', translationX: -120 } });
    expect(mockTrack.style.transform).toBe('translate3d(-120px, 0, 0)');

    gestureHandler({ detail: { phase: 'end', direction: 'left', axis: 'x', translationX: -150, velocityX: -0.5 } });
    expect(mockTrack.style.transform).toBe('translate3d(-360px, 0, 0)');
    expect(onSettle).toHaveBeenCalledWith('browse');

    // 3. Cancel snaps back to current tab
    store.setState({ currentTab: 'browse' });
    gestureHandler({ detail: { phase: 'cancel', axis: 'x', translationX: -40 } });
    expect(mockTrack.style.transform).toBe('translate3d(-360px, 0, 0)');

    // 4. Resize ignores height-only changes (keyboard) and updates on width change
    const resizeHandler = windowListeners['resize'];
    mockTrack.style.transform = 'sentinel';
    resizeHandler();
    expect(mockTrack.style.transform).toBe('sentinel');

    mockContainer.offsetWidth = 400;
    resizeHandler();
    expect(mockTrack.style.transform).toBe('translate3d(-400px, 0, 0)');

    cleanup();
    expect(mockSwipeEl.removeEventListener).toHaveBeenCalledWith('gesture', expect.any(Function));
    expect(mockWinRemoveCalled()).toBe(true);

    function mockWinRemoveCalled() {
      return (globalThis.window.removeEventListener as any).mock.calls.some(
        (c: any[]) => c[0] === 'resize'
      );
    }
  });
});
