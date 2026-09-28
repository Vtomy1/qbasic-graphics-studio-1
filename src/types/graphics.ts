export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a?: number;
  name?: string;
}

export type BitDepth = 1 | 4 | 8;

export type DitherAlgorithm =
  | 'none'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'bayer-2x2'
  | 'bayer-4x4'
  | 'bayer-8x8'
  | 'burkes'
  | 'sierra-lite';

export interface ScreenPreset {
  id: string;
  name: string;
  qbasicScreen: number; // e.g. 13, 12, 9, 7, 11, 2
  width: number;
  height: number;
  defaultBitDepth: BitDepth;
  colors: number;
  description: string;
}

export interface GifHeaderData {
  signature: string; // "GIF"
  version: '87a' | '89a';
  width: number;
  height: number;
  globalColorTableFlag: boolean;
  colorResolution: number; // 0-7, represents bits per color - 1
  sortFlag: boolean;
  globalColorTableSizeExp: number; // 0-7, size = 2^(N+1)
  globalColorTableSize: number; // 2, 4, 8, 16, 32, 64, 128, 256
  backgroundColorIndex: number;
  pixelAspectRatio: number;
  globalColorTable: RGBColor[];
  rawHeaderBytes: Uint8Array;
}

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  gamma: number;      // 0.2 to 3.0
  ditherStrength: number; // 0.0 to 1.5
  invert: boolean;
}

export interface QuantizedResult {
  width: number;
  height: number;
  bitDepth: BitDepth;
  palette: RGBColor[];
  pixelIndices: Uint8Array;
  packedBinaryBytes: Uint8Array;
  bsaveBytes: Uint8Array;
  gifBytes: Uint8Array;
  processTimeMs: number;
}
