import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initFloatingNav } from '../src/ui/components/floatingNav';
import { store } from '../src/state/store';

describe('Floating Navigation Bar (M3 Expressive Pill)', () => {
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

  it('gracefully returns no-ops when DOM elements are missing', () => {
    const onSelect = vi.fn();
    const controller = initFloatingNav(onSelect);

    expect(typeof controller.updatePosition).toBe('function');
    expect(typeof controller.animateToTab).toBe('function');
    expect(typeof controller.triggerStretch).toBe('function');
    expect(typeof controller.setProgress).toBe('function');
    expect(typeof controller.setOverscroll).toBe('function');
    expect(typeof controller.resetCapsuleSpring).toBe('function');
    expect(typeof controller.destroy).toBe('function');
    expect(() => controller.updatePosition()).not.toThrow();
    expect(() => controller.animateToTab('overview')).not.toThrow();
    expect(() => controller.triggerStretch('left')).not.toThrow();
    expect(() => controller.setProgress('overview', 'customize', 0.5)).not.toThrow();
    expect(() => controller.setOverscroll(10)).not.toThrow();
    expect(() => controller.resetCapsuleSpring()).not.toThrow();
    expect(() => controller.destroy()).not.toThrow();
  });

  it('initializes and calculates 3-tab positions when DOM elements are present', () => {
    const listeners: Record<string, Function[]> = {};

    const mockHighlighter: any = {
      id: 'nav-highlighter',
      style: {},
    };

    const mockTabOverview: any = {
      classList: {
        contains: vi.fn((cls: string) => cls === 'active'),
        toggle: vi.fn(),
        add: vi.fn(),
        remove: vi.fn()
      },
      getAttribute: vi.fn((attr: string) => {
        if (attr === 'data-target' || attr === 'data-tab') return 'overview';
        return null;
      }),
      getBoundingClientRect: vi.fn(() => ({
        width: 114,
        height: 48,
        left: 6,
        right: 120,
        top: 6,
        bottom: 54
      }))
    };

    const mockTabCustomize: any = {
      classList: {
        contains: vi.fn((cls: string) => cls !== 'active'),
        toggle: vi.fn(),
        add: vi.fn(),
        remove: vi.fn()
      },
      getAttribute: vi.fn((attr: string) => {
        if (attr === 'data-target' || attr === 'data-tab') return 'customize';
        return null;
      }),
      getBoundingClientRect: vi.fn(() => ({
        width: 48,
        height: 48,
        left: 169,
        right: 217,
        top: 6,
        bottom: 54
      }))
    };

    const mockTabEmoji: any = {
      classList: {
        contains: vi.fn((cls: string) => cls !== 'active'),
        toggle: vi.fn(),
        add: vi.fn(),
        remove: vi.fn()
      },
      getAttribute: vi.fn((attr: string) => {
        if (attr === 'data-target' || attr === 'data-tab') return 'emoji';
        return null;
      }),
      getBoundingClientRect: vi.fn(() => ({
        width: 48,
        height: 48,
        left: 266,
        right: 314,
        top: 6,
        bottom: 54
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
        width: 320,
        height: 60,
        left: 40,
        right: 360,
        top: 600,
        bottom: 660
      })),
      querySelector: vi.fn((sel: string) => {
        if (sel.includes('overview')) return mockTabOverview;
        if (sel.includes('customize')) return mockTabCustomize;
        if (sel.includes('emoji')) return mockTabEmoji;
        return null;
      }),
      querySelectorAll: vi.fn((sel: string) => {
        if (sel.includes('nav-tab')) return [mockTabOverview, mockTabCustomize, mockTabEmoji];
        return [];
      }),
      addEventListener: vi.fn((event: string, handler: Function) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
      }),
      removeEventListener: vi.fn()
    };

    const mockDoc: any = {
      documentElement: {
        classList: {
          contains: vi.fn((cls: string) => cls === 'nav-floating')
        }
      },
      body: {
        classList: {
          contains: vi.fn((cls: string) => cls === 'nav-floating')
        }
      },
      querySelector: vi.fn((sel: string) => {
        if (sel.includes('bottom-nav')) return mockBottomNav;
        return null;
      }),
      getElementById: vi.fn((id: string) => {
        if (id === 'nav-highlighter') return mockHighlighter;
        return null;
      })
    };

    const windowListeners: Record<string, Function[]> = {};
    const mockWin: any = {
      innerWidth: 400,
      addEventListener: vi.fn((event: string, handler: Function) => {
        windowListeners[event] = windowListeners[event] || [];
        windowListeners[event].push(handler);
      }),
      removeEventListener: vi.fn()
    };

    globalThis.document = mockDoc;
    globalThis.window = mockWin;

    const onSelect = vi.fn();
    store.setState({ currentTab: 'overview' });

    const controller = initFloatingNav(onSelect);

    // Initial position for 'overview'
    controller.updatePosition(true);

    expect(mockHighlighter.style.width).toBe('114px');
    expect(mockHighlighter.style.transform).toContain('translate3d(6px, 0, 0)');

    // Test animateToTab
    controller.animateToTab('customize');
    expect(mockHighlighter.style.width).toBe('92px');

    // Test setProgress between overview and customize
    controller.setProgress('overview', 'customize', 0.5);
    expect(mockHighlighter.style.transition).toBe('none');

    // Test setOverscroll
    controller.setOverscroll(20);
    expect(mockBottomNav.style.transform).toContain('translateX');

    controller.setOverscroll(0);
    expect(mockBottomNav.style.transform).toBe('translateX(-50%) scale(1)');

    // Test triggerStretch
    controller.triggerStretch('left');
    expect(mockBottomNav.style.transform).toContain('translateX');

    // Switch tab in store to emoji and update
    store.setState({ currentTab: 'emoji' });
    mockTabOverview.classList.contains.mockImplementation(() => false);
    mockTabEmoji.classList.contains.mockImplementation(() => true);

    controller.updatePosition(true);
    expect(mockHighlighter.style.width).toBe('96px');
    expect(mockHighlighter.style.transform).toContain('translate3d(218px, 0, 0)');

    // Test drag interaction selecting customize tab
    const pointerDownHandler = listeners['pointerdown']?.[0];
    const pointerMoveHandler = windowListeners['pointermove']?.[0];
    const pointerUpHandler = windowListeners['pointerup']?.[0];

    expect(pointerDownHandler).toBeDefined();
    expect(pointerMoveHandler).toBeDefined();
    expect(pointerUpHandler).toBeDefined();

    // 1. Pointer down at x=20
    pointerDownHandler({
      button: 0,
      pointerType: 'touch',
      pointerId: 1,
      clientX: 20,
      clientY: 620,
      target: mockTabOverview
    });

    // 2. Pointer move towards center (x=200, over customize tab center)
    pointerMoveHandler({
      clientX: 200,
      clientY: 620,
      preventDefault: vi.fn()
    });

    expect(mockBottomNav.classList.add).toHaveBeenCalledWith('nav-dragging');

    // 3. Pointer up (release)
    pointerUpHandler({
      pointerId: 1,
      clientX: 200,
      clientY: 620
    });

    expect(onSelect).toHaveBeenCalled();

    // Test click capture swallowing
    const clickHandler = listeners['click']?.[0];
    expect(clickHandler).toBeDefined();
    const mockClickEvt = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    clickHandler(mockClickEvt);

    // Test resize listener
    const resizeHandler = windowListeners['resize']?.[0];
    expect(resizeHandler).toBeDefined();
    resizeHandler();

    // Verify cleanup
    controller.destroy();
    expect(mockBottomNav.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(mockWin.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
