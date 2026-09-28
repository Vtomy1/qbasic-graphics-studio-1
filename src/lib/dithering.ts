import { RGBColor, BitDepth, DitherAlgorithm, ImageAdjustments } from '../types/graphics';

// Find nearest color in palette using Euclidean distance with perceptual weighting
export function findNearestColorIndex(
  r: number,
  g: number,
  b: number,
  palette: RGBColor[]
): number {
  let minDistance = Infinity;
  let bestIndex = 0;

  // Pre-clamp
  const cr = Math.min(255, Math.max(0, r));
  const cg = Math.min(255, Math.max(0, g));
  const cb = Math.min(255, Math.max(0, b));

  for (let i = 0; i < palette.length; i++) {
    const pal = palette[i];
    const dr = cr - pal.r;
    const dg = cg - pal.g;
    const db = cb - pal.b;

    // Perceptual distance formula (Redmean metric)
    const rmean = (cr + pal.r) / 2;
    const dist =
      (2 + rmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rmean) / 256) * db * db;

    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
    }
  }

  return bestIndex;
}

// Bayer 2x2 matrix normalized 0-1
const BAYER_2X2 = [
  [0 / 4, 2 / 4],
  [3 / 4, 1 / 4]
];

// Bayer 4x4 matrix normalized 0-1
const BAYER_4X4 = [
  [ 0/16,  8/16,  2/16, 10/16],
  [12/16,  4/16, 14/16,  6/16],
  [ 3/16, 11/16,  1/16,  9/16],
  [15/16,  7/16, 13/16,  5/16]
];

// Bayer 8x8 matrix normalized 0-1
const BAYER_8X8 = [
  [ 0/64, 32/64,  8/64, 40/64,  2/64, 34/64, 10/64, 42/64],
  [48/64, 16/64, 56/64, 24/64, 50/64, 18/64, 58/64, 26/64],
  [12/64, 44/64,  4/64, 36/64, 14/64, 46/64,  6/64, 38/64],
  [60/64, 28/64, 52/64, 20/64, 62/64, 30/64, 54/64, 22/64],
  [ 3/64, 35/64, 11/64, 43/64,  1/64, 33/64,  9/64, 41/64],
  [51/64, 19/64, 59/64, 27/64, 49/64, 17/64, 57/64, 25/64],
  [15/64, 47/64,  7/64, 39/64, 13/64, 45/64,  5/64, 37/64],
  [63/64, 31/64, 55/64, 23/64, 61/64, 29/64, 53/64, 21/64]
];

// Apply image adjustments (brightness, contrast, gamma, invert)
export function applyAdjustments(
  sourceData: ImageData,
  adjustments: ImageAdjustments
): Float32Array {
  const { brightness, contrast, gamma, invert } = adjustments;
  const len = sourceData.width * sourceData.height;
  const rgbBuffer = new Float32Array(len * 3);
  const src = sourceData.data;

  // Contrast factor: -100 to 100 -> factor
  const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const invGamma = 1 / Math.max(0.1, gamma);

  for (let i = 0; i < len; i++) {
    const srcIdx = i * 4;
    let r = src[srcIdx];
    let g = src[srcIdx + 1];
    let b = src[srcIdx + 2];

    // Invert
    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // Brightness (-100..100)
    r += brightness * 1.5;
    g += brightness * 1.5;
    b += brightness * 1.5;

    // Contrast
    r = cFactor * (r - 128) + 128;
    g = cFactor * (g - 128) + 128;
    b = cFactor * (b - 128) + 128;

    // Clamp 0..255 before gamma
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    // Gamma correction
    if (gamma !== 1.0) {
      r = Math.pow(r / 255, invGamma) * 255;
      g = Math.pow(g / 255, invGamma) * 255;
      b = Math.pow(b / 255, invGamma) * 255;
    }

    const dstIdx = i * 3;
    rgbBuffer[dstIdx] = r;
    rgbBuffer[dstIdx + 1] = g;
    rgbBuffer[dstIdx + 2] = b;
  }

  return rgbBuffer;
}

// Core Quantization and Dithering Pipeline
export function quantizeImage(
  sourceData: ImageData,
  palette: RGBColor[],
  algorithm: DitherAlgorithm,
  adjustments: ImageAdjustments,
  bitDepth: BitDepth
): {
  pixelIndices: Uint8Array;
  packedBinaryBytes: Uint8Array;
  quantizedRgba: ImageData;
} {
  const width = sourceData.width;
  const height = sourceData.height;
  const totalPixels = width * height;
  const rgbBuffer = applyAdjustments(sourceData, adjustments);

  const pixelIndices = new Uint8Array(totalPixels);
  const outputImgData = new ImageData(width, height);
  const outData = outputImgData.data;

  const strength = adjustments.ditherStrength;

  if (algorithm === 'none' || strength === 0) {
    // Nearest neighbor
    for (let i = 0; i < totalPixels; i++) {
      const bIdx = i * 3;
      const r = rgbBuffer[bIdx];
      const g = rgbBuffer[bIdx + 1];
      const b = rgbBuffer[bIdx + 2];

      const bestIdx = findNearestColorIndex(r, g, b, palette);
      pixelIndices[i] = bestIdx;

      const palColor = palette[bestIdx];
      const oIdx = i * 4;
      outData[oIdx] = palColor.r;
      outData[oIdx + 1] = palColor.g;
      outData[oIdx + 2] = palColor.b;
      outData[oIdx + 3] = 255;
    }
  } else if (
    algorithm === 'bayer-2x2' ||
    algorithm === 'bayer-4x4' ||
    algorithm === 'bayer-8x8'
  ) {
    // Ordered Bayer dithering
    const matrix =
      algorithm === 'bayer-2x2'
        ? BAYER_2X2
        : algorithm === 'bayer-4x4'
        ? BAYER_4X4
        : BAYER_8X8;
    const mSize = matrix.length;
    const spread = (255 / (palette.length > 16 ? 16 : 8)) * strength;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const mRow = matrix[y % mSize];

      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        const bIdx = i * 3;
        const threshold = mRow[x % mSize] - 0.5;
        const offset = threshold * spread;

        const r = rgbBuffer[bIdx] + offset;
        const g = rgbBuffer[bIdx + 1] + offset;
        const b = rgbBuffer[bIdx + 2] + offset;

        const bestIdx = findNearestColorIndex(r, g, b, palette);
        pixelIndices[i] = bestIdx;

        const palColor = palette[bestIdx];
        const oIdx = i * 4;
        outData[oIdx] = palColor.r;
        outData[oIdx + 1] = palColor.g;
        outData[oIdx + 2] = palColor.b;
        outData[oIdx + 3] = 255;
      }
    }
  } else {
    // Error diffusion algorithms (Floyd-Steinberg, Atkinson, Burkes, Sierra-Lite)
    // We clone the rgbBuffer so we can modify errors in place
    const workingBuffer = new Float32Array(rgbBuffer);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const bIdx = i * 3;

        const oldR = workingBuffer[bIdx];
        const oldG = workingBuffer[bIdx + 1];
        const oldB = workingBuffer[bIdx + 2];

        const bestIdx = findNearestColorIndex(oldR, oldG, oldB, palette);
        pixelIndices[i] = bestIdx;

        const palColor = palette[bestIdx];
        const oIdx = i * 4;
        outData[oIdx] = palColor.r;
        outData[oIdx + 1] = palColor.g;
        outData[oIdx + 2] = palColor.b;
        outData[oIdx + 3] = 255;

        // Error
        const errR = (oldR - palColor.r) * strength;
        const errG = (oldG - palColor.g) * strength;
        const errB = (oldB - palColor.b) * strength;

        function distribute(dx: number, dy: number, factor: number) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const targetIdx = (ny * width + nx) * 3;
            workingBuffer[targetIdx] += errR * factor;
            workingBuffer[targetIdx + 1] += errG * factor;
            workingBuffer[targetIdx + 2] += errB * factor;
          }
        }

        if (algorithm === 'floyd-steinberg') {
          distribute(1, 0, 7 / 16);
          distribute(-1, 1, 3 / 16);
          distribute(0, 1, 5 / 16);
          distribute(1, 1, 1 / 16);
        } else if (algorithm === 'atkinson') {
          // Atkinson distributes 1/8 to 6 neighbors (retains 25% error for crisp Mac look)
          distribute(1, 0, 1 / 8);
          distribute(2, 0, 1 / 8);
          distribute(-1, 1, 1 / 8);
          distribute(0, 1, 1 / 8);
          distribute(1, 1, 1 / 8);
          distribute(0, 2, 1 / 8);
        } else if (algorithm === 'burkes') {
          // Burkes filter / 32
          distribute(1, 0, 8 / 32);
          distribute(2, 0, 4 / 32);
          distribute(-2, 1, 2 / 32);
          distribute(-1, 1, 4 / 32);
          distribute(0, 1, 8 / 32);
          distribute(1, 1, 4 / 32);
          distribute(2, 1, 2 / 32);
        } else if (algorithm === 'sierra-lite') {
          // Sierra-2-4A (Sierra Lite) / 4
          distribute(1, 0, 2 / 4);
          distribute(-1, 1, 1 / 4);
          distribute(0, 1, 1 / 4);
        }
      }
    }
  }

  // Pack binary bytes according to bitDepth
  const packedBinaryBytes = packPixels(pixelIndices, width, height, bitDepth);

  return {
    pixelIndices,
    packedBinaryBytes,
    quantizedRgba: outputImgData
  };
}

// Pack pixel indices into raw bytes:
// 1-bit: 8 pixels per byte (MSB leftmost)
// 4-bit: 2 pixels per byte (High nibble leftmost)
// 8-bit: 1 pixel per byte
export function packPixels(
  pixelIndices: Uint8Array,
  width: number,
  height: number,
  bitDepth: BitDepth
): Uint8Array {
  if (bitDepth === 8) {
    return new Uint8Array(pixelIndices);
  }

  if (bitDepth === 4) {
    const totalBytes = Math.ceil((width * height) / 2);
    const packed = new Uint8Array(totalBytes);
    let byteIdx = 0;

    for (let i = 0; i < pixelIndices.length; i += 2) {
      const p1 = pixelIndices[i] & 0x0f;
      const p2 = i + 1 < pixelIndices.length ? pixelIndices[i + 1] & 0x0f : 0;
      packed[byteIdx++] = (p1 << 4) | p2;
    }
    return packed;
  }

  // bitDepth === 1
  const totalBytes = Math.ceil((width * height) / 8);
  const packed = new Uint8Array(totalBytes);
  let byteIdx = 0;

  for (let i = 0; i < pixelIndices.length; i += 8) {
    let b = 0;
    for (let bit = 0; bit < 8; bit++) {
      const pIdx = i + bit;
      if (pIdx < pixelIndices.length) {
        if (pixelIndices[pIdx] > 0) {
          b |= (1 << (7 - bit));
        }
      }
    }
    packed[byteIdx++] = b;
  }

  return packed;
}
