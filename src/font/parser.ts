/**
 * Fontify - SFNT / OpenType Binary Parser
 * Zero dependencies. Fully typed. Safe bounds-checked parser for TTF, OTF, TTC, WOFF.
 */

import type { FontInfo, ParseResult, VariationAxis, NamedInstance } from './types';

const FRIENDLY_AXIS_NAMES: Record<string, string> = {
  wght: 'Weight',
  wdth: 'Width',
  opsz: 'Optical Size',
  slnt: 'Slant',
  ital: 'Italic',
  GRAD: 'Grade',
  XTRA: 'Parametric Extra Counter',
  XOPQ: 'Parametric Thick Stroke',
  YOPQ: 'Parametric Thin Stroke',
  YTLC: 'Parametric Lowercase Height',
  YTUC: 'Parametric Uppercase Height',
  YTAS: 'Parametric Ascender',
  YTDE: 'Parametric Descender',
  YTFI: 'Parametric Figure Height',
  ROND: 'Roundness'
};

function createEmptyFontInfo(error?: string): FontInfo {
  return {
    valid: false,
    error,
    isVariable: false,
    isCollection: false,
    format: 'Unknown',
    familyName: 'Custom Font',
    subfamilyName: 'Regular',
    fullName: 'Custom Font Regular',
    postscriptName: '',
    version: '1.0',
    axes: [],
    instances: [],
    numGlyphs: 0,
    unitsPerEm: 1000
  };
}

export class FontParser {
  /**
   * Safely parses an ArrayBuffer into FontInfo.
   * Never throws; returns a FontInfo with valid=false and error on failure.
   */
  public static parse(arrayBuffer: ArrayBuffer): FontInfo {
    const result = this.parseSafe(arrayBuffer);
    return result.font;
  }

  /**
   * Strict Result-type parsing method.
   */
  public static parseSafe(arrayBuffer: ArrayBuffer): ParseResult {
    const result = createEmptyFontInfo();

    try {
      if (!arrayBuffer || arrayBuffer.byteLength < 12) {
        result.error = 'Buffer too small or empty';
        return { success: false, error: result.error, font: result };
      }

      const view = new DataView(arrayBuffer);
      const magic = this.readTag(view, 0);
      let firstFontOffset = 0;

      if (magic === 'ttcf') {
        result.isCollection = true;
        result.format = 'TTC / OTC (Font Collection)';
        if (view.byteLength < 16) {
          result.error = 'Truncated TTC header';
          return { success: false, error: result.error, font: result };
        }
        const numFonts = view.getUint32(8);
        if (numFonts > 0) {
          firstFontOffset = view.getUint32(12);
        } else {
          result.error = 'Empty font collection';
          return { success: false, error: result.error, font: result };
        }
      } else if (magic === 'OTTO') {
        result.format = 'OpenType (CFF / PostScript)';
      } else if (magic === '\x00\x01\x00\x00' || magic === 'true' || magic === 'typ1') {
        result.format = 'TrueType';
      } else if (magic === 'wOFF') {
        result.format = 'WOFF';
      } else if (magic === 'wOF2') {
        result.format = 'WOFF2';
      }

      if (firstFontOffset + 12 > view.byteLength) {
        result.error = 'Offset outside buffer bounds';
        return { success: false, error: result.error, font: result };
      }

      const sfntVersion = this.readTag(view, firstFontOffset);
      if (
        sfntVersion !== 'OTTO' &&
        sfntVersion !== '\x00\x01\x00\x00' &&
        sfntVersion !== 'true' &&
        sfntVersion !== 'typ1'
      ) {
        if (!result.isCollection) {
          result.error = `Unsupported SFNT version: ${sfntVersion}`;
          return { success: false, error: result.error, font: result };
        }
      }

      const numTables = view.getUint16(firstFontOffset + 4);
      if (firstFontOffset + 12 + numTables * 16 > view.byteLength) {
        result.error = 'Corrupt table directory';
        return { success: false, error: result.error, font: result };
      }

      const tables: Record<string, { tag: string; checkSum: number; offset: number; length: number }> = {};
      let tableRecordOffset = firstFontOffset + 12;

      for (let i = 0; i < numTables; i++) {
        const tag = this.readTag(view, tableRecordOffset);
        const checkSum = view.getUint32(tableRecordOffset + 4);
        const offset = view.getUint32(tableRecordOffset + 8);
        const length = view.getUint32(tableRecordOffset + 12);
        tables[tag] = { tag, checkSum, offset, length };
        tableRecordOffset += 16;
      }

      result.valid = true;

      // Parse 'head' table for unitsPerEm
      if (tables['head'] && tables['head'].offset + 20 <= view.byteLength) {
        result.unitsPerEm = view.getUint16(tables['head'].offset + 18);
      }

      // Parse 'maxp' table for glyph count
      if (tables['maxp'] && tables['maxp'].offset + 6 <= view.byteLength) {
        result.numGlyphs = view.getUint16(tables['maxp'].offset + 4);
      }

      // Parse 'name' table for font strings
      const nameStrings: Record<number, string> = {};
      if (tables['name'] && tables['name'].offset + 6 <= view.byteLength) {
        this.parseNameTable(view, tables['name'].offset, tables['name'].length, nameStrings, result);
      }

      // Parse 'fvar' table for Variable Font Axes
      if (tables['fvar'] && tables['fvar'].offset + 16 <= view.byteLength) {
        result.isVariable = true;
        this.parseFvarTable(view, tables['fvar'].offset, tables['fvar'].length, nameStrings, result);
      }

      // Apply friendly axis names
      for (const axis of result.axes) {
        if (!axis.name || axis.name === axis.tag) {
          axis.name = FRIENDLY_AXIS_NAMES[axis.tag] || axis.tag;
        }
      }

      return { success: true, font: result };
    } catch (e) {
      result.valid = false;
      result.error = e instanceof Error ? e.message : String(e);
      return { success: false, error: result.error, font: result };
    }
  }

  private static readTag(view: DataView, offset: number): string {
    if (offset + 4 > view.byteLength) {
      return '';
    }
    let tag = '';
    for (let i = 0; i < 4; i++) {
      tag += String.fromCharCode(view.getUint8(offset + i));
    }
    return tag;
  }

  private static readFixed1616(view: DataView, offset: number): number {
    if (offset + 4 > view.byteLength) {
      return 0;
    }
    const fixed = view.getInt32(offset) / 65536.0;
    return parseFloat(fixed.toFixed(4));
  }

  private static parseNameTable(
    view: DataView,
    offset: number,
    tableLength: number,
    nameStrings: Record<number, string>,
    result: FontInfo
  ): void {
    if (offset + 6 > view.byteLength) return;

    const count = view.getUint16(offset + 2);
    const stringOffsetRel = view.getUint16(offset + 4);
    const stringOffset = offset + stringOffsetRel;

    if (stringOffset > view.byteLength) return;

    let recordOffset = offset + 6;
    const tableEnd = offset + tableLength;

    for (let i = 0; i < count; i++) {
      if (recordOffset + 12 > view.byteLength || recordOffset + 12 > tableEnd) {
        break;
      }

      const platformID = view.getUint16(recordOffset);
      const encodingID = view.getUint16(recordOffset + 2);
      // languageID at recordOffset + 4
      const nameID = view.getUint16(recordOffset + 6);
      const length = view.getUint16(recordOffset + 8);
      const strOffsetInString = view.getUint16(recordOffset + 10);
      const strOffset = stringOffset + strOffsetInString;

      if (strOffset + length <= view.byteLength) {
        let str = '';
        // UTF-16BE encoding (Windows platform 3, Unicode platform 0, or platform 2 encoding 1)
        if (platformID === 3 || platformID === 0 || (platformID === 2 && encodingID === 1)) {
          for (let j = 0; j < length; j += 2) {
            if (strOffset + j + 1 < view.byteLength) {
              str += String.fromCharCode(view.getUint16(strOffset + j));
            }
          }
        } else {
          // Latin-1 / ASCII
          for (let j = 0; j < length; j++) {
            if (strOffset + j < view.byteLength) {
              str += String.fromCharCode(view.getUint8(strOffset + j));
            }
          }
        }

        // Clean control characters and trim
        str = str.replace(/\0/g, '').trim();
        if (str && !nameStrings[nameID]) {
          nameStrings[nameID] = str;
        }
      }

      recordOffset += 12;
    }

    if (nameStrings[16]) result.familyName = nameStrings[16];
    else if (nameStrings[1]) result.familyName = nameStrings[1];

    if (nameStrings[17]) result.subfamilyName = nameStrings[17];
    else if (nameStrings[2]) result.subfamilyName = nameStrings[2];

    if (nameStrings[4]) {
      result.fullName = nameStrings[4];
    } else {
      result.fullName = `${result.familyName} ${result.subfamilyName}`.trim();
    }

    if (nameStrings[6]) result.postscriptName = nameStrings[6];
    if (nameStrings[5]) result.version = nameStrings[5];
  }

  private static parseFvarTable(
    view: DataView,
    offset: number,
    tableLength: number,
    nameStrings: Record<number, string>,
    result: FontInfo
  ): void {
    if (offset + 16 > view.byteLength) return;

    const axesArrayOffsetRel = view.getUint16(offset + 4);
    const axesArrayOffset = offset + axesArrayOffsetRel;
    const axisCount = view.getUint16(offset + 8);
    const axisSize = view.getUint16(offset + 10);
    const instanceCount = view.getUint16(offset + 12);
    const instanceSize = view.getUint16(offset + 14);

    if (axisSize < 20 || axesArrayOffset > view.byteLength) return;

    let axisOffset = axesArrayOffset;
    for (let i = 0; i < axisCount; i++) {
      if (axisOffset + axisSize > view.byteLength || axisOffset + axisSize > offset + tableLength) {
        break;
      }

      const axisTag = this.readTag(view, axisOffset);
      const minValue = this.readFixed1616(view, axisOffset + 4);
      const defaultValue = this.readFixed1616(view, axisOffset + 8);
      const maxValue = this.readFixed1616(view, axisOffset + 12);
      const axisNameID = view.getUint16(axisOffset + 18);

      const axis: VariationAxis = {
        tag: axisTag,
        name: nameStrings[axisNameID] || axisTag,
        min: minValue,
        default: defaultValue,
        max: maxValue,
        current: defaultValue
      };

      result.axes.push(axis);
      axisOffset += axisSize;
    }

    let instOffset = axesArrayOffset + axisCount * axisSize;
    for (let i = 0; i < instanceCount; i++) {
      if (instOffset + instanceSize > view.byteLength || instOffset + instanceSize > offset + tableLength) {
        break;
      }

      const nameID = view.getUint16(instOffset);
      const instName = nameStrings[nameID] || `Style ${i + 1}`;
      const values: Record<string, number> = {};

      for (let a = 0; a < result.axes.length; a++) {
        const valOffset = instOffset + 4 + a * 4;
        if (valOffset + 4 <= view.byteLength) {
          const axisTag = result.axes[a].tag;
          values[axisTag] = this.readFixed1616(view, valOffset);
        }
      }

      const instance: NamedInstance = {
        name: instName,
        values
      };

      result.instances.push(instance);
      instOffset += instanceSize;
    }
  }
}
