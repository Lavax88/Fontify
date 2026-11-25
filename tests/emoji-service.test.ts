import { describe, it, expect, beforeEach } from 'vitest';
import { SystemFontService } from '../src/bridge/service';
import { Store } from '../src/state/store';
import { setMockFailure } from '../src/bridge/mock';
import { EMOJI_PRESETS, FLAGSHIP_PRESETS, EMOJI_CATEGORIES } from '../src/ui/emoji';

describe('Emoji Service & Management (Deep Module)', () => {
  let testStore: Store;
  let service: SystemFontService;

  beforeEach(() => {
    testStore = new Store();
    service = new SystemFontService(testStore);
    setMockFailure(false);
  });

  it('validates preset definitions and emoji categories integrity', () => {
    expect(EMOJI_PRESETS.length).toBeGreaterThanOrEqual(8);
    const ids = EMOJI_PRESETS.map(p => p.id);
    expect(ids).toContain('ios');
    expect(ids).toContain('ios-26');
    expect(ids).toContain('samsung');
    expect(ids).toContain('fluent');
    expect(ids).toContain('twemoji');
    expect(ids).toContain('whatsapp');
    expect(ids).toContain('facebook');
    expect(ids).toContain('joypixels');
    expect(ids).toContain('noto');

    const ios26 = FLAGSHIP_PRESETS.find(p => p.id === 'ios-26');
    expect(ios26).toBeDefined();
    expect(ios26?.url).toContain('iOS%2026.4%20(Unicode%2017).ttf');
    expect(ios26?.category).toBe('apple');

    expect(EMOJI_CATEGORIES['smileys']?.glyphs.length).toBeGreaterThan(10);
    expect(EMOJI_CATEGORIES['animals']?.glyphs.length).toBeGreaterThan(10);
  });

  it('applyEmoji() streams emoji payload, updates store status upon success', async () => {
    const syntheticBuffer = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00]).buffer;
    let reportedProgress = 0;

    const result = await service.applyEmoji({
      emojiBuffer: syntheticBuffer,
      emojiName: 'iOS 18 (Apple)',
      emojiSource: 'preset',
      onProgress: (pct) => {
        reportedProgress = pct;
      }
    });

    expect(result.success).toBe(true);
    expect(reportedProgress).toBe(100);
    expect(testStore.getState().isApplyingEmoji).toBe(false);
    expect(testStore.getState().status.emoji_active).toBe(true);
    expect(testStore.getState().status.active_emoji_name).toBe('iOS 18 (Apple)');
  });

  it('restoreEmojiStock() restores stock emojis without altering active typeface font', async () => {
    // Stage custom font active and custom emoji active
    testStore.setState({
      status: {
        ...testStore.getState().status,
        active: true,
        active_font_name: 'Inter Variable',
        emoji_active: true,
        active_emoji_name: 'Fluent 3D'
      }
    });

    const result = await service.restoreEmojiStock();
    expect(result.success).toBe(true);
    expect(testStore.getState().isRestoringEmoji).toBe(false);

    const updated = testStore.getState().status;
    expect(updated.emoji_active).toBe(false);
    expect(updated.active_emoji_name).toBe('Stock (Google)');

    // Text font overlay remains completely untouched
    expect(updated.active).toBe(true);
    expect(updated.active_font_name).toBe('Inter Variable');
  });

  it('propagates failure and records lastError when execution fails', async () => {
    setMockFailure(true);
    const syntheticBuffer = new Uint8Array([0x00, 0x01, 0x00, 0x00]).buffer;

    await expect(
      service.applyEmoji({
        emojiBuffer: syntheticBuffer,
        emojiName: 'Faulty Pack',
        emojiSource: 'custom'
      })
    ).rejects.toThrow();

    expect(testStore.getState().isApplyingEmoji).toBe(false);
    expect(testStore.getState().lastError).toBeTruthy();
  });

  it('tracks pendingEmoji and rebootRequired atomically across applyEmojiWithPrompt and cancelPendingWithPrompt', async () => {
    const notifications: string[] = [];
    const promptAdapter = {
      confirm: async () => true,
      runApply: async (opts: any) => {
        await opts.onApply(() => {});
        opts.onCancelReboot?.();
        return true;
      },
      notify: (msg: string) => notifications.push(msg)
    };

    const promptedService = new SystemFontService(testStore, promptAdapter);
    const syntheticBuffer = new Uint8Array([0x00, 0x01, 0x00, 0x00]).buffer;

    await promptedService.applyEmojiWithPrompt(
      {
        emojiBuffer: syntheticBuffer,
        emojiName: 'iOS 26',
        emojiSource: 'preset'
      },
      { body: 'Install iOS 26?' }
    );

    expect(testStore.getState().rebootRequired).toBe(true);
    expect(testStore.getState().rebootType).toBe('soft');
    expect(testStore.getState().pendingEmoji).toBe(true);
    expect(notifications.some(n => n.includes('postponed'))).toBe(true);

    const cancelled = await promptedService.cancelPendingWithPrompt();
    expect(cancelled).toBe(true);
    expect(testStore.getState().rebootRequired).toBe(false);
    expect(testStore.getState().pendingEmoji).toBe(false);
    expect(testStore.getState().status.emoji_active).toBe(false);
  });
});
