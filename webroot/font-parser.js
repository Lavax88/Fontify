/**
 * Custom Font Installer - font-parser.js
 * High-performance, zero-dependency OpenType / TrueType binary parser.
 * Supports detection of variable font tables ('fvar', 'STAT'), axis extraction,
 * named instances, font metadata, and metrics.
 *
 * Author: Lava
 */

class FontParser {
    static parse(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const result = {
            valid: false,
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

        try {
            if (arrayBuffer.byteLength < 12) {
                return result;
            }

            const magic = this._readTag(view, 0);
            let firstFontOffset = 0;

            if (magic === 'ttcf') {
                result.isCollection = true;
                result.format = 'TTC / OTC (Font Collection)';
                const numFonts = view.getUint32(8);
                if (numFonts > 0) {
                    firstFontOffset = view.getUint32(12);
                } else {
                    return result;
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

            const sfntVersion = this._readTag(view, firstFontOffset);
            if (sfntVersion !== 'OTTO' && sfntVersion !== '\x00\x01\x00\x00' && sfntVersion !== 'true' && sfntVersion !== 'typ1') {
                if (!result.isCollection) return result;
            }

            result.valid = true;
            const numTables = view.getUint16(firstFontOffset + 4);
            const tables = {};

            let tableRecordOffset = firstFontOffset + 12;
            for (let i = 0; i < numTables; i++) {
                const tag = this._readTag(view, tableRecordOffset);
                const checkSum = view.getUint32(tableRecordOffset + 4);
                const offset = view.getUint32(tableRecordOffset + 8);
                const length = view.getUint32(tableRecordOffset + 12);
                tables[tag] = { tag, checkSum, offset, length };
                tableRecordOffset += 16;
            }

            // Parse 'head' table for unitsPerEm
            if (tables['head']) {
                const headOffset = tables['head'].offset;
                result.unitsPerEm = view.getUint16(headOffset + 18);
            }

            // Parse 'maxp' table for glyph count
            if (tables['maxp']) {
                const maxpOffset = tables['maxp'].offset;
                result.numGlyphs = view.getUint16(maxpOffset + 4);
            }

            // Parse 'name' table for font strings
            const nameStrings = {};
            if (tables['name']) {
                this._parseNameTable(view, tables['name'].offset, nameStrings, result);
            }

            // Parse 'fvar' table for Variable Font Axes
            if (tables['fvar']) {
                result.isVariable = true;
                this._parseFvarTable(view, tables['fvar'].offset, nameStrings, result);
            }

            // Fallback Friendly Axis Names
            const friendlyTags = {
                'wght': 'Weight',
                'wdth': 'Width',
                'opsz': 'Optical Size',
                'slnt': 'Slant',
                'ital': 'Italic',
                'GRAD': 'Grade',
                'XTRA': 'Parametric Extra Counter',
                'XOPQ': 'Parametric Thick Stroke',
                'YOPQ': 'Parametric Thin Stroke',
                'YTLC': 'Parametric Lowercase Height',
                'YTUC': 'Parametric Uppercase Height',
                'YTAS': 'Parametric Ascender',
                'YTDE': 'Parametric Descender',
                'YTFI': 'Parametric Figure Height',
                'ROND': 'Roundness'
            };

            result.axes.forEach(axis => {
                if (!axis.name || axis.name === axis.tag) {
                    axis.name = friendlyTags[axis.tag] || axis.tag;
                }
            });

            return result;
        } catch (e) {
            console.error('Error parsing font:', e);
            result.valid = false;
            return result;
        }
    }

    static _readTag(view, offset) {
        let tag = '';
        for (let i = 0; i < 4; i++) {
            tag += String.fromCharCode(view.getUint8(offset + i));
        }
        return tag;
    }

    static _readFixed1616(view, offset) {
        const fixed = view.getInt32(offset) / 65536.0;
        return parseFloat(fixed.toFixed(4));
    }

    static _parseNameTable(view, offset, nameStrings, result) {
        const count = view.getUint16(offset + 2);
        const stringOffset = offset + view.getUint16(offset + 4);
        let recordOffset = offset + 6;

        for (let i = 0; i < count; i++) {
            const platformID = view.getUint16(recordOffset);
            const encodingID = view.getUint16(recordOffset + 2);
            const languageID = view.getUint16(recordOffset + 4);
            const nameID = view.getUint16(recordOffset + 6);
            const length = view.getUint16(recordOffset + 8);
            const strOffset = stringOffset + view.getUint16(recordOffset + 10);

            let str = '';
            // UTF-16BE (e.g. Windows or Mac Unicode)
            if (platformID === 3 || platformID === 0 || (platformID === 2 && encodingID === 1)) {
                for (let j = 0; j < length; j += 2) {
                    if (strOffset + j + 1 < view.byteLength) {
                        str += String.fromCharCode(view.getUint16(strOffset + j));
                    }
                }
            } else {
                // Latin / ASCII
                for (let j = 0; j < length; j++) {
                    if (strOffset + j < view.byteLength) {
                        str += String.fromCharCode(view.getUint8(strOffset + j));
                    }
                }
            }

            str = str.replace(/\0/g, '').trim();
            if (str && !nameStrings[nameID]) {
                nameStrings[nameID] = str;
            }

            recordOffset += 12;
        }

        if (nameStrings[16]) result.familyName = nameStrings[16];
        else if (nameStrings[1]) result.familyName = nameStrings[1];

        if (nameStrings[17]) result.subfamilyName = nameStrings[17];
        else if (nameStrings[2]) result.subfamilyName = nameStrings[2];

        if (nameStrings[4]) result.fullName = nameStrings[4];
        else result.fullName = `${result.familyName} ${result.subfamilyName}`.trim();

        if (nameStrings[6]) result.postscriptName = nameStrings[6];
        if (nameStrings[5]) result.version = nameStrings[5];
    }

    static _parseFvarTable(view, offset, nameStrings, result) {
        const axesArrayOffset = offset + view.getUint16(offset + 4);
        const axisCount = view.getUint16(offset + 8);
        const axisSize = view.getUint16(offset + 10);
        const instanceCount = view.getUint16(offset + 12);
        const instanceSize = view.getUint16(offset + 14);

        let axisOffset = axesArrayOffset;
        for (let i = 0; i < axisCount; i++) {
            const axisTag = this._readTag(view, axisOffset);
            const minValue = this._readFixed1616(view, axisOffset + 4);
            const defaultValue = this._readFixed1616(view, axisOffset + 8);
            const maxValue = this._readFixed1616(view, axisOffset + 12);
            const axisNameID = view.getUint16(axisOffset + 18);

            result.axes.push({
                tag: axisTag,
                name: nameStrings[axisNameID] || axisTag,
                min: minValue,
                default: defaultValue,
                max: maxValue,
                current: defaultValue
            });

            axisOffset += axisSize;
        }

        let instOffset = axesArrayOffset + (axisCount * axisSize);
        for (let i = 0; i < instanceCount; i++) {
            const nameID = view.getUint16(instOffset);
            const instName = nameStrings[nameID] || `Style ${i + 1}`;
            const values = {};

            for (let a = 0; a < axisCount; a++) {
                const tag = result.axes[a].tag;
                values[tag] = this._readFixed1616(view, instOffset + 4 + (a * 4));
            }

            result.instances.push({
                name: instName,
                values: values
            });

            instOffset += instanceSize;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontParser;
}
