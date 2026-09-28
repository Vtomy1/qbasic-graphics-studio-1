import React, { useState } from 'react';
import { Copy, Check, Download, Terminal, FileCode, Package, Play, Layers } from 'lucide-react';
import { RGBColor, BitDepth } from '../types/graphics';
import {
  generateBloadLoaderCode,
  generateBsaveSaverCode,
  generateGifHeaderLoaderCode,
  generateSelfContainedDataBas,
  generateBinaryLoaderSaverCode,
  generateVramPokeCode,
  generatePaletteCyclingCode,
  generateBsvFile
} from '../lib/qbasicGenerators';
import { createValidGifFile } from '../lib/gifHeader';

interface CodeExportViewerProps {
  width: number;
  height: number;
  palette: RGBColor[];
  pixelIndices: Uint8Array | null;
  packedBinaryBytes: Uint8Array | null;
  bitDepth: BitDepth;
  quantizedCanvas: HTMLCanvasElement | null;
}

export const CodeExportViewer: React.FC<CodeExportViewerProps> = ({
  width,
  height,
  palette,
  pixelIndices,
  packedBinaryBytes,
  bitDepth,
  quantizedCanvas
}) => {
  const [activeTab, setActiveTab] = useState<
    'bload-loader' | 'bsave-saver' | 'gif-loader' | 'data-bas' | 'packed-binary' | 'vram-blit' | 'palette-cycling'
  >('bload-loader');

  const [copied, setCopied] = useState<boolean>(false);

  // Generate code strings
  const bloadCode = generateBloadLoaderCode(width, height, palette, bitDepth);
  const bsaveCode = generateBsaveSaverCode(width, height, bitDepth);
  const gifLoaderCode = generateGifHeaderLoaderCode(width, height, bitDepth);
  const dataBasCode = pixelIndices
    ? generateSelfContainedDataBas(width, height, palette, pixelIndices, bitDepth)
    : `' Quantize an image to generate DATA statements`;
  const binaryCode = generateBinaryLoaderSaverCode(width, height, bitDepth);
  const vramCode = generateVramPokeCode(width, height);
  const paletteCyclingCode = generatePaletteCyclingCode(
    width,
    height,
    bitDepth,
    0,
    Math.min(15, palette.length - 1)
  );

  const getActiveCode = () => {
    switch (activeTab) {
      case 'bload-loader':
        return bloadCode;
      case 'bsave-saver':
        return bsaveCode;
      case 'gif-loader':
        return gifLoaderCode;
      case 'data-bas':
        return dataBasCode;
      case 'packed-binary':
        return binaryCode;
      case 'vram-blit':
        return vramCode;
      case 'palette-cycling':
        return paletteCyclingCode;
      default:
        return bloadCode;
    }
  };

  const getActiveFilename = () => {
    switch (activeTab) {
      case 'bload-loader':
        return 'BLOAD_LOADER.BAS';
      case 'bsave-saver':
        return 'BSAVE_SAVER.BAS';
      case 'gif-loader':
        return 'GIF_HEADER_LOADER.BAS';
      case 'data-bas':
        return 'STANDALONE_IMAGE.BAS';
      case 'packed-binary':
        return 'PACKED_SAVER_LOADER.BAS';
      case 'vram-blit':
        return 'VRAM_BLASTER.BAS';
      case 'palette-cycling':
        return 'PALETTE_CYCLING.BAS';
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download code as .BAS
  const downloadBasFile = () => {
    const code = getActiveCode();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getActiveFilename();
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download .BSV (QBasic BSAVE binary)
  const downloadBsvFile = () => {
    if (!pixelIndices) return;
    const bsvBytes = generateBsvFile(width, height, pixelIndices, bitDepth);
    const blob = new Blob([bsvBytes as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'IMAGE.BSV';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download .BIN (Packed binary)
  const downloadBinFile = () => {
    if (!packedBinaryBytes) return;
    // Magic: "QBGRPH" + bitDepth (2) + width (2) + height (2) + data
    const header = new Uint8Array(12 + packedBinaryBytes.length);
    header[0] = 0x51; // Q
    header[1] = 0x42; // B
    header[2] = 0x47; // G
    header[3] = 0x52; // R
    header[4] = 0x50; // P
    header[5] = 0x48; // H
    header[6] = bitDepth & 0xff;
    header[7] = (bitDepth >> 8) & 0xff;
    header[8] = width & 0xff;
    header[9] = (width >> 8) & 0xff;
    header[10] = height & 0xff;
    header[11] = (height >> 8) & 0xff;
    header.set(packedBinaryBytes, 12);

    const blob = new Blob([header as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'IMAGE.BIN';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download genuine valid .GIF file
  const downloadGifFile = () => {
    if (!pixelIndices) return;
    const gifBytes = createValidGifFile(width, height, palette, pixelIndices, bitDepth);
    const blob = new Blob([gifBytes as unknown as BlobPart], { type: 'image/gif' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qbasic_export_${bitDepth}bit.gif`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download quantized PNG
  const downloadPngFile = () => {
    if (!quantizedCanvas) return;
    quantizedCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qbasic_rendered_${bitDepth}bit.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-col gap-5 p-5 bg-slate-900/60 border border-slate-800 rounded-lg font-mono">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-sans">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>QBasic / QuickBASIC / QB64 Saver & Loader Code Suite</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Complete, runnable MS-DOS programs with 1-bit, 4-bit, and 8-bit saver & loader routines.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="px-3 py-1.5 text-xs text-slate-200 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5 font-sans"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={downloadBasFile}
            className="px-3.5 py-1.5 text-xs text-slate-950 font-medium bg-amber-400 hover:bg-amber-300 rounded transition-colors flex items-center gap-1.5 font-sans shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .BAS</span>
          </button>
        </div>
      </div>

      {/* Code Sample Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-950 rounded border border-slate-800 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('bload-loader')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap font-sans ${
            activeTab === 'bload-loader'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          1. BLOAD Loader (.BSV)
        </button>

        <button
          onClick={() => setActiveTab('bsave-saver')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap font-sans ${
            activeTab === 'bsave-saver'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          2. BSAVE Saver (.BSV)
        </button>

        <button
          onClick={() => setActiveTab('gif-loader')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap font-sans ${
            activeTab === 'gif-loader'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          3. GIF Header Loader
        </button>

        <button
          onClick={() => setActiveTab('data-bas')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap font-sans ${
            activeTab === 'data-bas'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          4. Self-Contained DATA/READ
        </button>

        <button
          onClick={() => setActiveTab('packed-binary')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap font-sans ${
            activeTab === 'packed-binary'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          5. 1/4/8-Bit Binary Saver & Loader
        </button>

        <button
          onClick={() => setActiveTab('vram-blit')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap font-sans ${
            activeTab === 'vram-blit'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          6. VRAM Mode 13h POKE
        </button>

        <button
          onClick={() => setActiveTab('palette-cycling')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap font-sans flex items-center gap-1.5 ${
            activeTab === 'palette-cycling'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>7. Palette Cycling SUB</span>
        </button>
      </div>

      {/* Code Editor Frame */}
      <div className="relative rounded border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="text-slate-200 font-semibold">{getActiveFilename()}</span>
          </div>
          <span className="text-slate-500">QuickBASIC 4.5 / QBASIC 1.1 / QB64 Compliant</span>
        </div>

        <pre className="p-4 text-xs font-fira text-emerald-300 leading-relaxed overflow-x-auto max-h-[460px] select-all">
          <code>{getActiveCode()}</code>
        </pre>
      </div>

      {/* Direct Asset Download Suite */}
      <div className="flex flex-col gap-2 p-4 bg-slate-950 rounded border border-slate-800">
        <div className="text-xs font-semibold text-white font-sans flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-amber-400" />
          <span>Direct Binary & Graphic Export Downloads:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-sans text-xs">
          <button
            onClick={downloadBsvFile}
            className="p-2.5 rounded bg-slate-900 border border-slate-800 hover:border-amber-400/60 hover:bg-slate-800 text-left transition-colors"
          >
            <div className="font-semibold text-amber-300">Download .BSV</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Ready for BLOAD in DOS</div>
          </button>

          <button
            onClick={downloadBinFile}
            className="p-2.5 rounded bg-slate-900 border border-slate-800 hover:border-amber-400/60 hover:bg-slate-800 text-left transition-colors"
          >
            <div className="font-semibold text-sky-300">Download .BIN</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Packed 1/4/8-bit raster</div>
          </button>

          <button
            onClick={downloadGifFile}
            className="p-2.5 rounded bg-slate-900 border border-slate-800 hover:border-amber-400/60 hover:bg-slate-800 text-left transition-colors"
          >
            <div className="font-semibold text-emerald-300">Download .GIF</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Valid GIF89a file</div>
          </button>

          <button
            onClick={downloadPngFile}
            className="p-2.5 rounded bg-slate-900 border border-slate-800 hover:border-amber-400/60 hover:bg-slate-800 text-left transition-colors"
          >
            <div className="font-semibold text-purple-300">Download .PNG</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Dithered pixel art</div>
          </button>
        </div>
      </div>
    </div>
  );
};
