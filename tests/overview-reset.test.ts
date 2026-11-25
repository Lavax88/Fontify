import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { store } from '../src/state/store';
import { fontService } from '../src/bridge/service';
import * as dialogModule from '../src/ui/components/dialog';
import * as toastModule from '../src/ui/components/toast';
import { setupOverviewTab } from '../src/ui/overview';

function createMockElement(id: string) {
  const attrs: Record<string, string> = {};
  const listeners: Record<string, Array<(e?: any) => void>> = {};
  return {
    id,
    className: '',
    textContent: '',
    style: {} as Record<string, string>,
    setAttribute: vi.fn((k: string, v: string) => { attrs[k] = v; }),
    removeAttribute: vi.fn((k: string) => { delete attrs[k]; }),
    hasAttribute: (k: string) => k in attrs,
    getAttribute: (k: string) => attrs[k] ?? null,
    addEventListener: vi.fn((type: string, fn: (e?: any) => void) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }),
    trigger: async (type: string, event?: any) => {
      for (const fn of listeners[type] || []) {
        await fn(event);
      }
    }
  };
}

describe('Overview Active Card Tap-to-Reset', () => {
  let originalDocument: any;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    vi.restoreAllMocks();
  });

  it('sets actionable and triggers restoreStockFont/restoreStockEmoji only when active', async () => {
    const domMap: Record<string, any> = {
      'overview-banner': createMockElement('overview-banner'),
      'banner-title': createMockElement('banner-title'),
      'banner-subtitle': createMockElement('banner-subtitle'),
      'banner-badge': createMockElement('banner-badge'),
      'banner-icon': createMockElement('banner-icon'),
      'overview-emoji-banner': createMockElement('overview-emoji-banner'),
      'emoji-banner-title': createMockElement('emoji-banner-title'),
      'emoji-banner-subtitle': createMockElement('emoji-banner-subtitle'),
      'emoji-banner-badge': createMockElement('emoji-banner-badge'),
      'emoji-banner-icon': createMockElement('emoji-banner-icon')
    };

    globalThis.document = {
      getElementById: (id: string) => domMap[id] || null
    } as any;

    const restoreSpy = vi.spyOn(fontService, 'restoreWithPrompt').mockResolvedValue();

    store.setState({
      status: {
        ...store.getState().status,
        active: false,
        active_font_name: '',
        emoji_active: false,
        active_emoji_name: '',
        backup_exists: true
      }
    });

    setupOverviewTab();

    // Stock state: non-actionable, taps are no-op
    expect(domMap['overview-banner'].hasAttribute('actionable')).toBe(false);
    expect(domMap['overview-emoji-banner'].hasAttribute('actionable')).toBe(false);

    await domMap['overview-banner'].trigger('click');
    await domMap['overview-emoji-banner'].trigger('click');
    expect(restoreSpy).not.toHaveBeenCalled();

    // Active state: actionable, taps trigger stock restore
    store.setState({
      status: {
        ...store.getState().status,
        active: true,
        active_font_name: 'Inter',
        emoji_active: true,
        active_emoji_name: 'iOS 18',
        backup_exists: true
      }
    });

    expect(domMap['overview-banner'].hasAttribute('actionable')).toBe(true);
    expect(domMap['overview-emoji-banner'].hasAttribute('actionable')).toBe(true);

    await domMap['overview-banner'].trigger('click');
    await domMap['overview-emoji-banner'].trigger('click');
    expect(restoreSpy).toHaveBeenCalledWith('font');
    expect(restoreSpy).toHaveBeenCalledWith('emoji');
  });

  it('shows cancel pending button for soft reboot and cancels pending font/emoji', async () => {
    const domMap: Record<string, any> = {
      'reboot-reminder-banner': createMockElement('reboot-reminder-banner'),
      'reboot-reminder-subtitle': createMockElement('reboot-reminder-subtitle'),
      'btn-banner-reboot': createMockElement('btn-banner-reboot'),
      'btn-banner-cancel-pending': createMockElement('btn-banner-cancel-pending')
    };

    globalThis.document = {
      getElementById: (id: string) => domMap[id] || null
    } as any;

    const confirmSpy = vi.spyOn(dialogModule, 'showConfirmDialog').mockResolvedValue(true);
    const toastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => {});
    const restoreStockSpy = vi.spyOn(fontService, 'restoreStock').mockResolvedValue({ success: true });
    const restoreEmojiStockSpy = vi.spyOn(fontService, 'restoreEmojiStock').mockResolvedValue({ success: true });

    store.setState({
      rebootRequired: true,
      rebootType: 'full',
      pendingFont: false,
      pendingEmoji: false
    });

    setupOverviewTab();

    expect(domMap['reboot-reminder-banner'].style.display).toBe('block');
    expect(domMap['btn-banner-cancel-pending'].style.display).toBe('none');

    store.setState({
      rebootRequired: true,
      rebootType: 'soft',
      pendingFont: true,
      pendingEmoji: false
    });

    expect(domMap['btn-banner-cancel-pending'].style.display).toBe('');

    await domMap['btn-banner-cancel-pending'].trigger('click');

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(restoreStockSpy).toHaveBeenCalledTimes(1);
    expect(restoreEmojiStockSpy).not.toHaveBeenCalled();
    expect(store.getState().rebootRequired).toBe(false);
    expect(store.getState().pendingFont).toBe(false);
    expect(store.getState().pendingEmoji).toBe(false);
    expect(toastSpy).toHaveBeenCalledWith('Pending changes cancelled.');
  });
});
