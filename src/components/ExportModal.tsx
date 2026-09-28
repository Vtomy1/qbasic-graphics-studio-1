import React from 'react';
import { X, Download, FileCode, Package, Terminal, Sparkles } from 'lucide-react';
import { RGBColor, BitDepth } from '../types/graphics';
import { generateBsvFile, generateBloadLoaderCode, generateBsaveSaverCode } from '../lib/qbasicGenerators';
import { createValidGifFile } from '../lib/gifHeader';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  height: number;
  palette: RGBColor[];
  pixelIndices: Uint8Array | null;
  packedBinaryBytes: Uint8Array | null;
  bitDepth: BitDepth;
  quantizedCanvas: HTMLCanvasElement | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  width,
  height,
  palette,
  pixelIndices,
  packedBinaryBytes,
  bitDepth,
  quantizedCanvas
}) => {
  if (!isOpen) return null;

  const downloadFile = (data: BlobPart, filename: string, mime: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBsv = () => {
    if (!pixelIndices) return;
    const bsv = generateBsvFile(width, height, pixelIndices, bitDepth);
    downloadFile(bsv as unknown as BlobPart, 'IMAGE.BSV', 'application/octet-stream');
  };

  const handleDownloadBas = () => {
    const code = generateBloadLoaderCode(width, height, palette, bitDepth);
    downloadFile(code, 'BLOAD_LOADER.BAS', 'text/plain;charset=utf-8');
  };

  const handleDownloadGif = () => {
    if (!pixelIndices) return;
    const gif = createValidGifFile(width, height, palette, pixelIndices, bitDepth);
    downloadFile(gif as unknown as BlobPart, 'EXPORTED.GIF', 'image/gif');
  };

  const handleDownloadPng = () => {
    if (!quantizedCanvas) return;
    quantizedCanvas.toBlob((blob) => {
      if (blob) downloadFile(blob, 'QUANTIZED_PREVIEW.PNG', 'image/png');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-lg p-6 shadow-2xl font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span className="font-sans font-bold text-white text-sm">Export QBasic Assets</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 flex flex-col gap-3 font-sans">
          <p className="text-slate-300 text-xs leading-relaxed">
            Download production-ready DOS assets compiled for{' '}
            <strong className="text-amber-400 font-mono">
              {width}x{height} · {bitDepth}-bit ({1 << (bitDepth === 1 ? 1 : bitDepth === 4 ? 4 : 8)} colors)
            </strong>
            :
          </p>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              onClick={handleDownloadBsv}
              className="flex items-center justify-between p-3 rounded bg-slate-900 border border-slate-800 hover:border-amber-400 hover:bg-slate-850 transition-all text-left group"
            >
              <div>
                <div className="font-semibold text-amber-300 font-mono">IMAGE.BSV (Native BSAVE Binary)</div>
                <div className="text-[11px] text-slate-400">Load immediately in QBasic with BLOAD "IMAGE.BSV"</div>
              </div>
              <Download className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
            </button>

            <button
              onClick={handleDownloadBas}
              className="flex items-center justify-between p-3 rounded bg-slate-900 border border-slate-800 hover:border-blue-400 hover:bg-slate-850 transition-all text-left group"
            >
              <div>
                <div className="font-semibold text-blue-300 font-mono">BLOAD_LOADER.BAS (QBasic Source)</div>
                <div className="text-[11px] text-slate-400">Complete runnable program with screen & DAC setup</div>
              </div>
              <Download className="w-4 h-4 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
            </button>

            <button
              onClick={handleDownloadGif}
              className="flex items-center justify-between p-3 rounded bg-slate-900 border border-slate-800 hover:border-emerald-400 hover:bg-slate-850 transition-all text-left group"
            >
              <div>
                <div className="font-semibold text-emerald-300 font-mono">EXPORTED.GIF (Standard GIF89a)</div>
                <div className="text-[11px] text-slate-400">Includes 13-byte header and color table</div>
              </div>
              <Download className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
            </button>

            <button
              onClick={handleDownloadPng}
              className="flex items-center justify-between p-3 rounded bg-slate-900 border border-slate-800 hover:border-purple-400 hover:bg-slate-850 transition-all text-left group"
            >
              <div>
                <div className="font-semibold text-purple-300 font-mono">QUANTIZED_PREVIEW.PNG</div>
                <div className="text-[11px] text-slate-400">Crisp retro pixel art image for web and documentation</div>
              </div>
              <Download className="w-4 h-4 text-purple-400 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-sans text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
