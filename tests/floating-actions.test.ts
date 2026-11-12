import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initFloatingActions } from '../src/ui/floatingActions';
import { store } from '../src/state/store';

describe('Dual Floating Action Cluster (M3 Expressive)', () => {
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

  it('gracefully handles missing DOM elements without throwing', () => {
    globalThis.document = {
      getElementById: () => null
    } as any;

    const controller = initFloatingActions();
    expect(typeof controller.destroy).toBe('function');
    expect(() => controller.destroy()).not.toThrow();
  });

  it('toggles visibility and labels dynamically based on currentTab and buffers', () => {
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
      setAttribute: (k: string, v: string) => { mockFabReset.attributes[k] = v; },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    const mockFabApply: any = {
      disabled: true,
      attributes: {} as Record<string, string>,
      setAttribute: (k: string, v: string) => { mockFabApply.attributes[k] = v; },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    const mockFabApplyLabel: any = {
      textContent: ''
    };

    globalThis.document = {
      getElementById: (id: string) => {
        if (id === 'floating-action-cluster') return mockCluster;
        if (id === 'fab-reset') return mockFabReset;
        if (id === 'fab-apply') return mockFabApply;
        if (id === 'fab-apply-label') return mockFabApplyLabel;
        return null;
      }
    } as any;

    // Start on overview tab
    store.setState({ currentTab: 'overview', fontBuffer: null, emojiBuffer: null });
    const controller = initFloatingActions();

    expect(mockCluster.classList.contains('hidden')).toBe(true);

    // Switch to customize tab without fontBuffer
    store.setState({ currentTab: 'customize' });
    expect(mockCluster.classList.contains('hidden')).toBe(false);
    expect(mockFabApplyLabel.textContent).toBe('Apply Font');
    expect(mockFabApply.disabled).toBe(true);

    // Provide fontBuffer & fontData
    store.setState({
      fontBuffer: new ArrayBuffer(8),
      fontData: { fullName: 'Inter', isVariable: false } as any
    });
    expect(mockFabApply.disabled).toBe(false);

    // Switch to emoji tab without emojiBuffer
    store.setState({ currentTab: 'emoji' });
    expect(mockCluster.classList.contains('hidden')).toBe(false);
    expect(mockFabApplyLabel.textContent).toBe('Apply Emoji');
    expect(mockFabApply.disabled).toBe(true);

    // Provide emojiBuffer
    store.setState({ emojiBuffer: new ArrayBuffer(8) });
    expect(mockFabApply.disabled).toBe(false);

    // Switch back to overview
    store.setState({ currentTab: 'overview' });
    expect(mockCluster.classList.contains('hidden')).toBe(true);

    controller.destroy();
  });
});
