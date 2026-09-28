import { RGBColor, BitDepth, GifHeaderData } from '../types/graphics';

// Parse a raw GIF header from a Uint8Array
export function parseGifHeader(bytes: Uint8Array): GifHeaderData | null {
  if (bytes.length < 13) return null;

  // Signature check
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  const ver = String.fromCharCode(bytes[3], bytes[4], bytes[5]);
  if (sig !== 'GIF' || (ver !== '87a' && ver !== '89a')) {
    return null;
  }

  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);

  const packed = bytes[10];
  const globalColorTableFlag = (packed & 0x80) !== 0;
  const colorResolution = (packed & 0x70) >> 4;
  const sortFlag = (packed & 0x08) !== 0;
  const globalColorTableSizeExp = packed & 0x07;
  const globalColorTableSize = 1 << (globalColorTableSizeExp + 1);

  const backgroundColorIndex = bytes[11];
  const pixelAspectRatio = bytes[12];

  const globalColorTable: RGBColor[] = [];
  if (globalColorTableFlag && bytes.length >= 13 + globalColorTableSize * 3) {
    let offset = 13;
    for (let i = 0; i < globalColorTableSize; i++) {
      globalColorTable.push({
        r: bytes[offset],
        g: bytes[offset + 1],
        b: bytes[offset + 2],
        name: `Color ${i}`
      });
      offset += 3;
    }
  }

  return {
    signature: sig,
    version: ver as '87a' | '89a',
    width,
    height,
    globalColorTableFlag,
    colorResolution,
    sortFlag,
    globalColorTableSizeExp,
    globalColorTableSize,
    backgroundColorIndex,
    pixelAspectRatio,
    globalColorTable,
    rawHeaderBytes: bytes.slice(0, 13)
  };
}

// Build standard GIF header bytes from image dimensions and palette
export function buildGifHeaderBytes(
  width: number,
  height: number,
  palette: RGBColor[],
  bitDepth: BitDepth
): Uint8Array {
  // Determine exponent for palette size: 2 -> exp 0 (2^1); 16 -> exp 3 (2^4); 256 -> exp 7 (2^8)
  const gctExp = bitDepth === 1 ? 0 : bitDepth === 4 ? 3 : 7;
  const gctSize = 1 << (gctExp + 1);
  const colorRes = bitDepth - 1; // 0, 3, or 7

  const packedFields = 0x80 | ((colorRes & 0x07) << 4) | (gctExp & 0x07);

  const header = new Uint8Array(13 + gctSize * 3);

  // 'GIF89a'
  header[0] = 0x47; // G
  header[1] = 0x49; // I
  header[2] = 0x46; // F
  header[3] = 0x38; // 8
  header[4] = 0x39; // 9
  header[5] = 0x61; // a

  // Width (16-bit LE)
  header[6] = width & 0xff;
  header[7] = (width >> 8) & 0xff;

  // Height (16-bit LE)
  header[8] = height & 0xff;
  header[9] = (height >> 8) & 0xff;

  // Packed Fields
  header[10] = packedFields;

  // Background Color Index
  header[11] = 0;

  // Pixel Aspect Ratio
  header[12] = 0;

  // Global Color Table
  let offset = 13;
  for (let i = 0; i < gctSize; i++) {
    const col = palette[i] || { r: 0, g: 0, b: 0 };
    header[offset++] = col.r;
    header[offset++] = col.g;
    header[offset++] = col.b;
  }

  return header;
}

// Annotated Byte Breakdown for GIF Header Inspector
export interface AnnotatedByte {
  offset: number;
  hex: string;
  ascii: string;
  decimal: number;
  binary: string;
  field: string;
  description: string;
  colorClass: string;
}

export function getAnnotatedGifHeader(
  width: number,
  height: number,
  palette: RGBColor[],
  bitDepth: BitDepth
): AnnotatedByte[] {
  const bytes = buildGifHeaderBytes(width, height, palette, bitDepth);
  const result: AnnotatedByte[] = [];

  const fieldDefs: {
    name: string;
    len: number;
    desc: (b: Uint8Array, offset: number) => string;
    color: string;
  }[] = [
    {
      name: 'Signature (Bytes 0-2)',
      len: 3,
      desc: () => 'GIF magic file format identifier',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    },
    {
      name: 'Version (Bytes 3-5)',
      len: 3,
      desc: () => 'Standard GIF89a format specification',
      color: 'bg-teal-500/10 text-teal-400 border-teal-500/30'
    },
    {
      name: 'Logical Screen Width (Bytes 6-7)',
      len: 2,
      desc: () => `Screen width in pixels: ${width} (little-endian 16-bit integer)`,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    },
    {
      name: 'Logical Screen Height (Bytes 8-9)',
      len: 2,
      desc: () => `Screen height in pixels: ${height} (little-endian 16-bit integer)`,
      color: 'bg-sky-500/10 text-sky-400 border-sky-500/30'
    },
    {
      name: 'Packed Fields (Byte 10)',
      len: 1,
      desc: (b, off) => {
        const p = b[off];
        const gct = (p & 0x80) ? 'GCT Flag: 1 (Enabled)' : 'GCT Flag: 0';
        const cr = `Color Res: ${((p >> 4) & 7) + 1} bits`;
        const sort = (p & 0x08) ? 'Sort: 1' : 'Sort: 0';
        const gctEntries = 1 << ((p & 7) + 1);
        return `${gct} | ${cr} | ${sort} | GCT Size: ${gctEntries} colors (2^${(p & 7) + 1})`;
      },
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    },
    {
      name: 'Background Color Index (Byte 11)',
      len: 1,
      desc: (b, off) => `Background palette index: ${b[off]} (Default 0)`,
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/30'
    },
    {
      name: 'Pixel Aspect Ratio (Byte 12)',
      len: 1,
      desc: (b, off) => `Aspect ratio: ${b[off]} (0 = no aspect ratio info given)`,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
    }
  ];

  let currOffset = 0;
  for (const def of fieldDefs) {
    for (let i = 0; i < def.len; i++) {
      const idx = currOffset + i;
      const b = bytes[idx];
      result.push({
        offset: idx,
        hex: b.toString(16).padStart(2, '0').toUpperCase(),
        ascii: (b >= 32 && b <= 126) ? String.fromCharCode(b) : '·',
        decimal: b,
        binary: b.toString(2).padStart(8, '0'),
        field: def.name,
        description: def.desc(bytes, currOffset),
        colorClass: def.color
      });
    }
    currOffset += def.len;
  }

  // Also include first few entries of Global Color Table (RGB Triples)
  const gctExp = bitDepth === 1 ? 0 : bitDepth === 4 ? 3 : 7;
  const gctEntries = Math.min(16, 1 << (gctExp + 1)); // Show up to first 16 colors in breakdown
  for (let c = 0; c < gctEntries; c++) {
    const col = palette[c] || { r: 0, g: 0, b: 0 };
    const rgbBytes = [col.r, col.g, col.b];
    const channelNames = ['Red', 'Green', 'Blue'];

    for (let ch = 0; ch < 3; ch++) {
      const idx = currOffset;
      const val = rgbBytes[ch];
      result.push({
        offset: idx,
        hex: val.toString(16).padStart(2, '0').toUpperCase(),
        ascii: (val >= 32 && val <= 126) ? String.fromCharCode(val) : '·',
        decimal: val,
        binary: val.toString(2).padStart(8, '0'),
        field: `Global Color Table #${c} (${channelNames[ch]})`,
        description: `Color #${c} ${channelNames[ch]} component: ${val} (VGA DAC: ${Math.floor(val / 4)})`,
        colorClass: 'bg-pink-500/10 text-pink-400 border-pink-500/30'
      });
      currOffset++;
    }
  }

  return result;
}

// Generate a valid, viewable GIF binary file (with uncompressed / LZW blocks)
// so the user can download a genuine .gif file created from their image!
export function createValidGifFile(
  width: number,
  height: number,
  palette: RGBColor[],
  pixelIndices: Uint8Array,
  bitDepth: BitDepth
): Uint8Array {
  const headerBytes = buildGifHeaderBytes(width, height, palette, bitDepth);
  const chunks: number[] = Array.from(headerBytes);

  // Image Descriptor Block
  chunks.push(0x2c); // ','
  chunks.push(0, 0); // Image Left (0)
  chunks.push(0, 0); // Image Top (0)
  chunks.push(width & 0xff, (width >> 8) & 0xff);   // Image Width
  chunks.push(height & 0xff, (height >> 8) & 0xff); // Image Height
  chunks.push(0x00); // Packed fields: No Local Color Table, not interlaced

  // LZW Minimum Code Size
  const minCodeSize = Math.max(2, bitDepth);
  chunks.push(minCodeSize);

  // Standard LZW Raster Data Compression
  const lzwBlocks = encodeGifLzw(pixelIndices, minCodeSize);
  for (let i = 0; i < lzwBlocks.length; i++) {
    chunks.push(lzwBlocks[i]);
  }

  // GIF Trailer Block (';')
  chunks.push(0x3b);

  return new Uint8Array(chunks);
}

// Minimal LZW Encoder for GIF raster data
function encodeGifLzw(pixelIndices: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const codeLimit = 1 << codeSize;

  const output: number[] = [];
  const subBlock: number[] = [];

  let curAccum = 0;
  let curBits = 0;

  function writeBits(code: number, nBits: number) {
    curAccum |= code << curBits;
    curBits += nBits;
    while (curBits >= 8) {
      subBlock.push(curAccum & 0xff);
      if (subBlock.length === 254) {
        output.push(subBlock.length);
        output.push(...subBlock);
        subBlock.length = 0;
      }
      curAccum >>= 8;
      curBits -= 8;
    }
  }

  // Emit Clear Code
  writeBits(clearCode, codeSize);

  // Build prefix table
  const dict: Record<string, number> = {};
  for (let i = 0; i < clearCode; i++) {
    dict[String(i)] = i;
  }

  let prefix = '';

  for (let i = 0; i < pixelIndices.length; i++) {
    const pixel = pixelIndices[i];
    const key = prefix === '' ? String(pixel) : `${prefix},${pixel}`;

    if (dict[key] !== undefined) {
      prefix = key;
    } else {
      writeBits(dict[prefix], codeSize);

      if (nextCode < 4096) {
        dict[key] = nextCode++;
        if (nextCode > codeLimit && codeSize < 12) {
          codeSize++;
        }
      } else {
        // Dictionary full, send clear code and reset
        writeBits(clearCode, codeSize);
        codeSize = minCodeSize + 1;
        nextCode = eoiCode + 1;
        for (const k in dict) delete dict[k];
        for (let j = 0; j < clearCode; j++) {
          dict[String(j)] = j;
        }
      }
      prefix = String(pixel);
    }
  }

  if (prefix !== '') {
    writeBits(dict[prefix], codeSize);
  }

  // Emit EOI Code
  writeBits(eoiCode, codeSize);

  // Flush remaining bits
  if (curBits > 0) {
    subBlock.push(curAccum & 0xff);
  }
  if (subBlock.length > 0) {
    output.push(subBlock.length);
    output.push(...subBlock);
    subBlock.length = 0;
  }

  // Block terminator: 0x00
  output.push(0x00);

  return output;
}
