import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TAB_ORDER,
  getTabOffset,
  initNavigation,
  navigateToTab
} from '../src/ui/navigation';
import { store } from '../src/state/store';

describe('Navigation & Chrome Coordinator', () => {
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

  it('defines 4 tabs in order and calculates ViewPager offsets', () => {
    expect(TAB_ORDER).toEqual(['overview', 'browse', 'customize', 'emoji']);
    expect(getTabOffset('overview', 360)).toBe(0);
    expect(getTabOffset('browse', 360)).toBe(-360);
    expect(getTabOffset('customize', 360)).toBe(-720);
    expect(getTabOffset('emoji', 360)).toBe(-1080);
  });

  it('gracefully handles missing DOM elements without throwing', () => {
    globalThis.document = {
      getElementById: () => null,
      querySelectorAll: () => []
    } as any;

    const controller = initNavigation();
    expect(() => navigateToTab('browse')).not.toThrow();
    expect(() => controller.destroy()).not.toThrow();
  });

  it('coordinates tab switching, swipe gestures, width-only resize, and FAB cluster state', () => {
    const swipeListeners: Record<string, any> = {};
    const windowListeners: Record<string, any> = {};
    const clusterClasses = new Set<string>(['hidden']);

    const mockTrack: any = { id: 'viewpager-track', style: {} };
    const mockContainer: any = { id: 'viewpager-container', offsetWidth: 360 };
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

    const mockCluster: any = {
      classList: {
        add: (cls: string) => clusterClasses.add(cls),
        remove: (cls: string) => clusterClasses.delete(cls),
        contains: (cls: string) => clusterClasses.has(cls)
      }
    };
    const mockFabReset: any = {
      disabled: true,
      attributes: {} as Record<string, string>,
      setAttribute: (k: string, v: string) => { mockFabReset.attributes[k] = v; },
      removeAttribute: (k: string) => { delete mockFabReset.attributes[k]; },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const mockFabApply: any = {
      disabled: true,
      attributes: {} as Record<string, string>,
      setAttribute: (k: string, v: string) => { mockFabApply.attributes[k] = v; },
      removeAttribute: (k: string) => { delete mockFabApply.attributes[k]; },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const mockFabApplyLabel: any = { textContent: '' };

    globalThis.document = {
      getElementById: (id: string) => {
        if (id === 'viewpager-container') return mockContainer;
        if (id === 'viewpager-track') return mockTrack;
        if (id === 'viewpager-swipe') return mockSwipeEl;
        if (id === 'floating-action-cluster') return mockCluster;
        if (id === 'fab-reset') return mockFabReset;
        if (id === 'fab-apply') return mockFabApply;
        if (id === 'fab-apply-label') return mockFabApplyLabel;
        return null;
      },
      querySelectorAll: () => []
    } as any;

    globalThis.window = {
      addEventListener: vi.fn((event: string, fn: any) => {
        windowListeners[event] = fn;
      }),
      removeEventListener: vi.fn((event: string) => {
        delete windowListeners[event];
      })
    } as any;

    store.setState({
      currentTab: 'overview',
      fontBuffer: null,
      fontData: null,
      emojiBuffer: null,
      status: { ...store.getState().status, active: false, emoji_active: false }
    });

    const controller = initNavigation();

    // Initial alignment
    expect(mockTrack.style.transform).toBe('translate3d(0px, 0, 0)');
    expect(mockCluster.classList.contains('hidden')).toBe(true);

    // inputFilter excludes interactive M3E controls
    const sliderTarget = { closest: (sel: string) => (sel.includes('m3e-slider') ? {} : null) };
    const normalTarget = { closest: () => null };
    expect(mockSwipeEl.inputFilter({ target: sliderTarget })).toBe(false);
    expect(mockSwipeEl.inputFilter({ target: normalTarget })).toBe(true);

    // Swipe gesture settles on browse
    const gestureHandler = swipeListeners['gesture'];
    gestureHandler({ detail: { phase: 'start', axis: 'x', translationX: 0 } });
    gestureHandler({ detail: { phase: 'move', axis: 'x', translationX: -120 } });
    expect(mockTrack.style.transform).toBe('translate3d(-120px, 0, 0)');

    gestureHandler({ detail: { phase: 'end', direction: 'left', axis: 'x', translationX: -150, velocityX: -0.5 } });
    expect(store.getState().currentTab).toBe('browse');
    expect(mockTrack.style.transform).toBe('translate3d(-360px, 0, 0)');
    expect(mockCluster.classList.contains('hidden')).toBe(true);

    // Navigate to customize -> shows FAB cluster & updates labels/disabled states
    navigateToTab('customize');
    expect(mockTrack.style.transform).toBe('translate3d(-720px, 0, 0)');
    expect(mockCluster.classList.contains('hidden')).toBe(false);
    expect(mockFabApplyLabel.textContent).toBe('Apply Font');
    expect(mockFabApply.disabled).toBe(true);
    expect(mockFabReset.disabled).toBe(true);

    store.setState({
      fontBuffer: new ArrayBuffer(8),
      fontData: { fullName: 'Inter', isVariable: false } as any,
      status: { ...store.getState().status, active: true }
    });
    expect(mockFabApply.disabled).toBe(false);
    expect(mockFabReset.disabled).toBe(false);

    // Navigate to emoji -> shows Apply Emoji label
    navigateToTab('emoji');
    expect(mockTrack.style.transform).toBe('translate3d(-1080px, 0, 0)');
    expect(mockFabApplyLabel.textContent).toBe('Apply Emoji');
    expect(mockFabApply.disabled).toBe(true);

    store.setState({ emojiBuffer: new ArrayBuffer(8) });
    expect(mockFabApply.disabled).toBe(false);

    // Width-only resize guard
    const resizeHandler = windowListeners['resize'];
    mockTrack.style.transform = 'sentinel';
    resizeHandler();
    expect(mockTrack.style.transform).toBe('sentinel');

    mockContainer.offsetWidth = 400;
    resizeHandler();
    expect(mockTrack.style.transform).toBe('translate3d(-1200px, 0, 0)');

    controller.destroy();
    expect(mockSwipeEl.removeEventListener).toHaveBeenCalledWith('gesture', expect.any(Function));
  });
});
