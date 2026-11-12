import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedEmoji,
  saveCachedEmoji,
  removeCachedEmoji,
  listCachedEmojiIds,
  clearAllEmojiCache,
  getEmojiCacheSummary
} from '../src/state/emojiCache';

describe('Emoji Cache Layer (IndexedDB / Memory Fallback)', () => {
  beforeEach(async () => {
    await clearAllEmojiCache();
  });

  it('saves and retrieves cached emoji ArrayBuffer', async () => {
    const dummyBuffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    await saveCachedEmoji('test-ios', 'iOS 26 Test', dummyBuffer);

    const retrieved = await getCachedEmoji('test-ios');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.byteLength).toBe(5);

    const ids = await listCachedEmojiIds();
    expect(ids).toContain('test-ios');
  });

  it('removes single emoji from cache', async () => {
    const buf = new Uint8Array([10, 20]).buffer;
    await saveCachedEmoji('pack-a', 'Pack A', buf);
    expect(await getCachedEmoji('pack-a')).not.toBeNull();

    await removeCachedEmoji('pack-a');
    expect(await getCachedEmoji('pack-a')).toBeNull();
  });

  it('calculates cache summary accurately', async () => {
    const buf1 = new Uint8Array([1, 2, 3]).buffer;
    const buf2 = new Uint8Array([4, 5, 6, 7]).buffer;

    await saveCachedEmoji('p1', 'P1', buf1);
    await saveCachedEmoji('p2', 'P2', buf2);

    const summary = await getEmojiCacheSummary();
    expect(summary.count).toBe(2);
    expect(summary.totalBytes).toBe(7);

    await clearAllEmojiCache();
    const clearedSummary = await getEmojiCacheSummary();
    expect(clearedSummary.count).toBe(0);
    expect(clearedSummary.totalBytes).toBe(0);
  });
});
