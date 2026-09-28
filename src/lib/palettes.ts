import { RGBColor, ScreenPreset } from '../types/graphics';

export const SCREEN_PRESETS: ScreenPreset[] = [
  {
    id: 'screen-13',
    name: 'SCREEN 13 (VGA)',
    qbasicScreen: 13,
    width: 320,
    height: 200,
    defaultBitDepth: 8,
    colors: 256,
    description: 'Mode 13h (320x200 256 colors). The golden standard for DOS gaming & demoscene.'
  },
  {
    id: 'screen-12',
    name: 'SCREEN 12 (VGA Hi-Res)',
    qbasicScreen: 12,
    width: 640,
    height: 480,
    defaultBitDepth: 4,
    colors: 16,
    description: 'VGA High Resolution (640x480 16 colors). 4-bit planar graphics.'
  },
  {
    id: 'screen-9',
    name: 'SCREEN 9 (EGA Hi-Res)',
    qbasicScreen: 9,
    width: 640,
    height: 350,
    defaultBitDepth: 4,
    colors: 16,
    description: 'EGA High Resolution (640x350 16 colors). Classic DOS desktop & CAD mode.'
  },
  {
    id: 'screen-7',
    name: 'SCREEN 7 (EGA)',
    qbasicScreen: 7,
    width: 320,
    height: 200,
    defaultBitDepth: 4,
    colors: 16,
    description: 'EGA Low Resolution (320x200 16 colors) with multi-page support.'
  },
  {
    id: 'screen-11',
    name: 'SCREEN 11 (VGA Mono)',
    qbasicScreen: 11,
    width: 640,
    height: 480,
    defaultBitDepth: 1,
    colors: 2,
    description: '1-bit monochrome high-res (640x480). 8 pixels packed per byte.'
  },
  {
    id: 'screen-2',
    name: 'SCREEN 2 (CGA Mono)',
    qbasicScreen: 2,
    width: 640,
    height: 200,
    defaultBitDepth: 1,
    colors: 2,
    description: '1-bit CGA monochrome (640x200) with 8:5 aspect ratio.'
  },
  {
    id: 'sprite-64',
    name: 'Sprite 64x64',
    qbasicScreen: 13,
    width: 64,
    height: 64,
    defaultBitDepth: 8,
    colors: 256,
    description: 'Custom sprite dimension for QBasic GET / PUT array animations.'
  },
  {
    id: 'sprite-32',
    name: 'Sprite 32x32',
    qbasicScreen: 13,
    width: 32,
    height: 32,
    defaultBitDepth: 4,
    colors: 16,
    description: 'Classic 32x32 game tile / sprite for QBasic games.'
  }
];

// Standard IBM PC / EGA / VGA 16 Color Palette (IRGB)
export const IBM_16_PALETTE: RGBColor[] = [
  { r: 0,   g: 0,   b: 0,   name: '0: Black' },
  { r: 0,   g: 0,   b: 170, name: '1: Blue' },
  { r: 0,   g: 170, b: 0,   name: '2: Green' },
  { r: 0,   g: 170, b: 170, name: '3: Cyan' },
  { r: 170, g: 0,   b: 0,   name: '4: Red' },
  { r: 170, g: 0,   b: 170, name: '5: Magenta' },
  { r: 170, g: 85,  b: 0,   name: '6: Brown' },
  { r: 170, g: 170, b: 170, name: '7: Light Gray' },
  { r: 85,  g: 85,  b: 85,  name: '8: Dark Gray' },
  { r: 85,  g: 85,  b: 255, name: '9: Light Blue' },
  { r: 85,  g: 255, b: 85,  name: '10: Light Green' },
  { r: 85,  g: 255, b: 255, name: '11: Light Cyan' },
  { r: 255, g: 85,  b: 85,  name: '12: Light Red' },
  { r: 255, g: 85,  b: 255, name: '13: Light Magenta' },
  { r: 255, g: 255, b: 85,  name: '14: Yellow' },
  { r: 255, g: 255, b: 255, name: '15: Bright White' },
];

// Monochrome 1-bit Presets
export const MONO_PALETTES: Record<string, RGBColor[]> = {
  bw: [
    { r: 0, g: 0, b: 0, name: '0: Black' },
    { r: 255, g: 255, b: 255, name: '1: White' }
  ],
  green: [
    { r: 0, g: 0, b: 0, name: '0: Black' },
    { r: 51, g: 255, b: 51, name: '1: P1 Phosphor Green' }
  ],
  amber: [
    { r: 0, g: 0, b: 0, name: '0: Black' },
    { r: 255, g: 176, b: 0, name: '1: Amber CRT' }
  ],
  paperwhite: [
    { r: 16, g: 20, b: 28, name: '0: Deep Ink' },
    { r: 236, g: 242, b: 250, name: '1: Paper White' }
  ]
};

// Generate Default VGA 256 Color Mode 13h Palette
export function generateDefaultVga256Palette(): RGBColor[] {
  const palette: RGBColor[] = [];

  // Indices 0-15: Standard 16 colors
  for (let i = 0; i < 16; i++) {
    palette.push({ ...IBM_16_PALETTE[i] });
  }

  // Indices 16-31: 16 shades of gray (grayscale ramp)
  for (let i = 0; i < 16; i++) {
    const val = Math.round((i / 15) * 255);
    palette.push({ r: val, g: val, b: val, name: `${16 + i}: Gray ${i}` });
  }

  // Indices 32-247: 216 colors from 6x6x6 color cube
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        const rv = Math.round((r / 5) * 255);
        const gv = Math.round((g / 5) * 255);
        const bv = Math.round((b / 5) * 255);
        palette.push({
          r: rv,
          g: gv,
          b: bv,
          name: `${palette.length}: R${r}G${g}B${b}`
        });
      }
    }
  }

  // Indices 248-255: fill remaining 8 entries with dark tones
  for (let i = palette.length; i < 256; i++) {
    const val = Math.round(((i - 248) / 8) * 60);
    palette.push({ r: val, g: val, b: val, name: `${i}: Dark Reserve` });
  }

  return palette.slice(0, 256);
}

// Extract optimal palette from image using Median-Cut quantization
export function extractCustomPalette(
  imageData: ImageData,
  numColors: number
): RGBColor[] {
  const pixels: RGBColor[] = [];
  const data = imageData.data;
  const step = Math.max(1, Math.floor((data.length / 4) / 10000)); // Sample up to 10k pixels

  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] > 64) { // Only non-transparent
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }

  if (pixels.length === 0) {
    return numColors === 16 ? IBM_16_PALETTE : generateDefaultVga256Palette().slice(0, numColors);
  }

  interface ColorBox {
    colors: RGBColor[];
    minR: number; maxR: number;
    minG: number; maxG: number;
    minB: number; maxB: number;
  }

  function getBounds(boxColors: RGBColor[]): ColorBox {
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;
    for (const c of boxColors) {
      if (c.r < minR) minR = c.r;
      if (c.r > maxR) maxR = c.r;
      if (c.g < minG) minG = c.g;
      if (c.g > maxG) maxG = c.g;
      if (c.b < minB) minB = c.b;
      if (c.b > maxB) maxB = c.b;
    }
    return { colors: boxColors, minR, maxR, minG, maxG, minB, maxB };
  }

  let boxes: ColorBox[] = [getBounds(pixels)];

  while (boxes.length < numColors) {
    // Find box with greatest range along any channel
    let maxRange = -1;
    let splitIdx = -1;
    let splitChannel: 'r' | 'g' | 'b' = 'r';

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.colors.length <= 1) continue;
      const rRange = b.maxR - b.minR;
      const gRange = b.maxG - b.minG;
      const bRange = b.maxB - b.minB;
      const range = Math.max(rRange, gRange, bRange);

      if (range > maxRange) {
        maxRange = range;
        splitIdx = i;
        if (range === rRange) splitChannel = 'r';
        else if (range === gRange) splitChannel = 'g';
        else splitChannel = 'b';
      }
    }

    if (splitIdx === -1 || maxRange <= 0) break;

    const targetBox = boxes[splitIdx];
    targetBox.colors.sort((a, b) => a[splitChannel] - b[splitChannel]);
    const mid = Math.floor(targetBox.colors.length / 2);

    const box1 = getBounds(targetBox.colors.slice(0, mid));
    const box2 = getBounds(targetBox.colors.slice(mid));

    boxes.splice(splitIdx, 1, box1, box2);
  }

  const result: RGBColor[] = boxes.map((box, idx) => {
    let sumR = 0, sumG = 0, sumB = 0;
    for (const c of box.colors) {
      sumR += c.r;
      sumG += c.g;
      sumB += c.b;
    }
    const count = box.colors.length || 1;
    return {
      r: Math.round(sumR / count),
      g: Math.round(sumG / count),
      b: Math.round(sumB / count),
      name: `${idx}: Custom #${((1 << 24) + (Math.round(sumR / count) << 16) + (Math.round(sumG / count) << 8) + Math.round(sumB / count)).toString(16).slice(1).toUpperCase()}`
    };
  });

  // Pad to requested numColors if needed
  while (result.length < numColors) {
    result.push({ r: 0, g: 0, b: 0, name: `${result.length}: Padding Black` });
  }

  return result.slice(0, numColors);
}

// Convert 0-255 RGB to 6-bit VGA DAC (0-63)
export function rgbToVgaDac(val: number): number {
  return Math.min(63, Math.max(0, Math.floor(val / 4)));
}

// Convert 6-bit VGA DAC (0-63) to 0-255 RGB
export function vgaDacToRgb(dac: number): number {
  return Math.min(255, Math.max(0, Math.round((dac / 63) * 255)));
}

// Format RGB as Hex string
export function rgbToHex(c: RGBColor): string {
  const r = c.r.toString(16).padStart(2, '0');
  const g = c.g.toString(16).padStart(2, '0');
  const b = c.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}
