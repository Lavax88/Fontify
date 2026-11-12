import { describe, it, expect } from 'vitest';
import { B64_CHUNK_SIZE, streamFontToDevice } from '../src/bridge/transfer';

describe('Data Pipeline & Transfer Safety (Deep Module)', () => {
  it('B64_CHUNK_SIZE is safe from Linux kernel MAX_ARG_STRLEN (131072)', () => {
    // MAX_ARG_STRLEN on Linux / Android kernel is 131,072 bytes.
    // Chunk size must leave ample headroom for printf formatting and shell wrapping.
    expect(B64_CHUNK_SIZE).toBeLessThanOrEqual(98304);
    expect(B64_CHUNK_SIZE).toBeGreaterThanOrEqual(16384);
  });

  it('streamFontToDevice streams payload and writes config safely', async () => {
    const dummyBuffer = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]).buffer;
    const dummyConfig = JSON.stringify({ emoji_name: 'Test Emoji', source: 'preset' });
    let progressUpdates: number[] = [];

    const { ttfPath, configPath } = await streamFontToDevice(
      dummyBuffer,
      null,
      dummyConfig,
      (pct) => progressUpdates.push(pct),
      undefined,
      undefined
    );

    expect(ttfPath).toBe('/data/local/tmp/font_tmp.ttf');
    expect(configPath).toBe('/data/local/tmp/config_tmp.json');
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });
});
