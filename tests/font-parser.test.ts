import { describe, it, expect } from 'vitest';
import { FontParser } from '../src/font/parser';

describe('FontParser', () => {
  it('handles empty or truncated buffers without throwing', () => {
    const emptyBuf = new ArrayBuffer(0);
    const resEmpty = FontParser.parse(emptyBuf);
    expect(resEmpty.valid).toBe(false);

    const smallBuf = new ArrayBuffer(8);
    const resSmall = FontParser.parse(smallBuf);
    expect(resSmall.valid).toBe(false);

    const corruptBuf = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]).buffer;
    const resCorrupt = FontParser.parse(corruptBuf);
    expect(resCorrupt.valid).toBe(false);
  });

  it('parses a synthetic TrueType font with head and maxp', () => {
    // Build a minimal synthetic TTF buffer
    // 12 bytes SFNT header + 2 table records (16 bytes each) = 44 bytes
    // Table 1: 'head' at offset 44 (length 20)
    // Table 2: 'maxp' at offset 64 (length 6)
    const totalSize = 72;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // SFNT Header
    // sfntVersion = 0x00010000 ('\x00\x01\x00\x00')
    view.setUint32(0, 0x00010000);
    // numTables = 2
    view.setUint16(4, 2);
    view.setUint16(6, 32); // searchRange
    view.setUint16(8, 1);  // entrySelector
    view.setUint16(10, 0); // rangeShift

    // Table 1: 'head'
    const setTag = (offset: number, tag: string) => {
      for (let i = 0; i < 4; i++) {
        view.setUint8(offset + i, tag.charCodeAt(i));
      }
    };
    setTag(12, 'head');
    view.setUint32(16, 0);  // checkSum
    view.setUint32(20, 44); // offset
    view.setUint32(24, 20); // length

    // Table 2: 'maxp'
    setTag(28, 'maxp');
    view.setUint32(32, 0);  // checkSum
    view.setUint32(36, 64); // offset
    view.setUint32(40, 6);  // length

    // 'head' table data: unitsPerEm at head + 18
    view.setUint16(44 + 18, 2048);

    // 'maxp' table data: numGlyphs at maxp + 4
    view.setUint16(64 + 4, 850);

    const info = FontParser.parse(buffer);
    expect(info.valid).toBe(true);
    expect(info.format).toBe('TrueType');
    expect(info.unitsPerEm).toBe(2048);
    expect(info.numGlyphs).toBe(850);
    expect(info.isVariable).toBe(false);
  });

  it('detects and parses variable font fvar table', () => {
    // 12 byte header + 1 table record ('fvar' at offset 28)
    const fvarOffset = 28;
    const totalSize = fvarOffset + 40;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    view.setUint32(0, 0x00010000); // TrueType
    view.setUint16(4, 1);          // numTables = 1

    const setTag = (offset: number, tag: string) => {
      for (let i = 0; i < 4; i++) {
        view.setUint8(offset + i, tag.charCodeAt(i));
      }
    };
    setTag(12, 'fvar');
    view.setUint32(16, 0);
    view.setUint32(20, fvarOffset);
    view.setUint32(24, 40);

    // fvar table layout:
    // version = 0x00010000 (offset 0)
    // axesArrayOffset = 16 (offset 4)
    // reserved = 2 (offset 6)
    // axisCount = 1 (offset 8)
    // axisSize = 20 (offset 10)
    // instanceCount = 0 (offset 12)
    // instanceSize = 0 (offset 14)
    view.setUint32(fvarOffset + 0, 0x00010000);
    view.setUint16(fvarOffset + 4, 16);
    view.setUint16(fvarOffset + 8, 1);
    view.setUint16(fvarOffset + 10, 20);
    view.setUint16(fvarOffset + 12, 0);
    view.setUint16(fvarOffset + 14, 0);

    // Axis 0 at fvarOffset + 16:
    // tag = 'wght'
    setTag(fvarOffset + 16, 'wght');
    // min = 100.0 (100 * 65536)
    view.setInt32(fvarOffset + 20, 100 * 65536);
    // default = 400.0 (400 * 65536)
    view.setInt32(fvarOffset + 24, 400 * 65536);
    // max = 900.0 (900 * 65536)
    view.setInt32(fvarOffset + 28, 900 * 65536);
    // flags = 0
    view.setUint16(fvarOffset + 32, 0);
    // nameID = 0
    view.setUint16(fvarOffset + 34, 0);

    const info = FontParser.parse(buffer);
    expect(info.valid).toBe(true);
    expect(info.isVariable).toBe(true);
    expect(info.axes.length).toBe(1);
    expect(info.axes[0].tag).toBe('wght');
    expect(info.axes[0].name).toBe('Weight');
    expect(info.axes[0].min).toBe(100);
    expect(info.axes[0].default).toBe(400);
    expect(info.axes[0].max).toBe(900);
  });

  it('detects font collection format (ttcf)', () => {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    const setTag = (offset: number, tag: string) => {
      for (let i = 0; i < 4; i++) {
        view.setUint8(offset + i, tag.charCodeAt(i));
      }
    };
    setTag(0, 'ttcf');
    view.setUint32(4, 0x00010000); // version 1.0
    view.setUint32(8, 1);          // numFonts = 1
    view.setUint32(12, 16);        // first font offset = 16

    // First font sfntVersion = 'OTTO'
    setTag(16, 'OTTO');
    view.setUint16(20, 0); // 0 tables

    const info = FontParser.parse(buffer);
    expect(info.isCollection).toBe(true);
    expect(info.format).toContain('Collection');
  });
});
