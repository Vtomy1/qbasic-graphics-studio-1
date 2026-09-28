import React, { useState } from 'react';
import { FileCode, Upload, Info, Check, Copy, Layers } from 'lucide-react';
import { RGBColor, BitDepth, GifHeaderData } from '../types/graphics';
import { getAnnotatedGifHeader, parseGifHeader, buildGifHeaderBytes } from '../lib/gifHeader';

interface GifHeaderInspectorProps {
  width: number;
  height: number;
  palette: RGBColor[];
  bitDepth: BitDepth;
}

export const GifHeaderInspector: React.FC<GifHeaderInspectorProps> = ({
  width,
  height,
  palette,
  bitDepth
}) => {
  const [inspectedFileHeader, setInspectedFileHeader] = useState<GifHeaderData | null>(null);
  const [selectedOffset, setSelectedOffset] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate annotated bytes for current conversion
  const currentAnnotatedBytes = getAnnotatedGifHeader(width, height, palette, bitDepth);
  const selectedByte = currentAnnotatedBytes.find((b) => b.offset === selectedOffset) || currentAnnotatedBytes[0];

  const handleGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          const bytes = new Uint8Array(event.target.result);
          const parsed = parseGifHeader(bytes);
          if (parsed) {
            setInspectedFileHeader(parsed);
          } else {
            alert('File is not a valid GIF87a or GIF89a file.');
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const copyHeaderHex = () => {
    const hexDump = currentAnnotatedBytes.map((b) => b.hex).join(' ');
    navigator.clipboard.writeText(hexDump);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gctExp = bitDepth === 1 ? 0 : bitDepth === 4 ? 3 : 7;
  const gctSize = 1 << (gctExp + 1);

  return (
    <div className="flex flex-col gap-6 p-5 bg-slate-900/60 border border-slate-800 rounded-lg font-mono">
      {/* Header Title */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-sans">
            <FileCode className="w-4 h-4 text-amber-400" />
            <span>GIF Specification Header & Logical Screen Descriptor Inspector</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            13-byte standard GIF89a header specification used by QBasic binary file loaders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 hover:text-white cursor-pointer transition-colors flex items-center gap-1.5 font-sans">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload External .GIF to Inspect</span>
            <input type="file" accept=".gif" className="hidden" onChange={handleGifUpload} />
          </label>
          <button
            onClick={copyHeaderHex}
            className="px-3 py-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded hover:bg-amber-400/20 transition-colors flex items-center gap-1.5 font-sans"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Hex' : 'Copy Hex Dump'}</span>
          </button>
        </div>
      </div>

      {/* Logical Screen Descriptor Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        <div className="p-3 bg-slate-950 rounded border border-slate-800">
          <div className="text-slate-500 text-[10px] uppercase">Signature & Ver</div>
          <div className="text-emerald-400 font-bold text-sm mt-1">GIF89a</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bytes 0x00 - 0x05</div>
        </div>

        <div className="p-3 bg-slate-950 rounded border border-slate-800">
          <div className="text-slate-500 text-[10px] uppercase">Logical Width</div>
          <div className="text-blue-400 font-bold text-sm mt-1 tabular-nums">{width} px</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bytes 0x06 - 0x07 (16-bit LE)</div>
        </div>

        <div className="p-3 bg-slate-950 rounded border border-slate-800">
          <div className="text-slate-500 text-[10px] uppercase">Logical Height</div>
          <div className="text-sky-400 font-bold text-sm mt-1 tabular-nums">{height} px</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bytes 0x08 - 0x09 (16-bit LE)</div>
        </div>

        <div className="p-3 bg-slate-950 rounded border border-slate-800">
          <div className="text-slate-500 text-[10px] uppercase">Global Color Table</div>
          <div className="text-amber-400 font-bold text-sm mt-1">
            {gctSize} Colors
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bit 7 = 1 (2^{gctExp + 1})</div>
        </div>

        <div className="p-3 bg-slate-950 rounded border border-slate-800">
          <div className="text-slate-500 text-[10px] uppercase">Color Resolution</div>
          <div className="text-purple-400 font-bold text-sm mt-1">{bitDepth} Bits/Channel</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Packed Bits 4-6</div>
        </div>

        <div className="p-3 bg-slate-950 rounded border border-slate-800">
          <div className="text-slate-500 text-[10px] uppercase">GCT Byte Length</div>
          <div className="text-pink-400 font-bold text-sm mt-1 tabular-nums">{gctSize * 3} Bytes</div>
          <div className="text-[10px] text-slate-400 mt-0.5">3 x {gctSize} RGB Triples</div>
        </div>
      </div>

      {/* Interactive Byte Inspector & Bitfield Decomposition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Byte Grid */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="text-xs text-slate-400 flex items-center justify-between font-sans">
            <span>Hex / ASCII Byte Map (Click any byte to inspect field)</span>
            <span className="text-[11px] text-slate-500">Offset: 0x{selectedOffset.toString(16).padStart(2, '0').toUpperCase()}</span>
          </div>

          <div className="p-4 bg-slate-950 rounded border border-slate-800 overflow-x-auto">
            <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-13 gap-2">
              {currentAnnotatedBytes.slice(0, 13).map((b) => (
                <button
                  key={b.offset}
                  onClick={() => setSelectedOffset(b.offset)}
                  className={`flex flex-col items-center justify-center p-2 rounded border text-center transition-all ${
                    selectedOffset === b.offset
                      ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105 bg-slate-900'
                      : 'border-slate-800 hover:border-slate-600 bg-slate-950'
                  }`}
                >
                  <span className="text-[9px] text-slate-500 tabular-nums">0x{b.offset.toString(16).padStart(2, '0').toUpperCase()}</span>
                  <span className="font-bold text-xs text-amber-300 mt-0.5">{b.hex}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-sans font-medium">{b.ascii}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-900">
              <div className="text-[11px] text-slate-500 mb-2 font-sans">
                Global Color Table Preview (First 8 RGB Entries):
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-12 gap-1.5">
                {currentAnnotatedBytes.slice(13, 13 + 24).map((b) => (
                  <button
                    key={b.offset}
                    onClick={() => setSelectedOffset(b.offset)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded border text-center transition-all ${
                      selectedOffset === b.offset
                        ? 'border-pink-400 ring-2 ring-pink-400/50 scale-105 bg-slate-900'
                        : 'border-slate-800/80 hover:border-slate-700 bg-slate-950'
                    }`}
                  >
                    <span className="text-[9px] text-slate-600 tabular-nums">{b.offset}</span>
                    <span className="font-bold text-[11px] text-pink-300">{b.hex}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Selected Byte Breakdown & Bit Decomposition */}
        <div className="flex flex-col gap-4 p-4 bg-slate-950 rounded border border-slate-800 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-sans font-semibold text-white">Byte Field Inspector</span>
            <span className="px-2 py-0.5 bg-amber-400/10 text-amber-400 rounded text-[11px]">
              Offset 0x{selectedByte.offset.toString(16).padStart(2, '0').toUpperCase()} ({selectedByte.offset})
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-slate-400 text-[11px]">Field Name:</div>
            <div className="text-amber-300 font-bold text-sm">{selectedByte.field}</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">Hex Value</div>
              <div className="text-white font-bold mt-0.5">0x{selectedByte.hex}</div>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">Decimal</div>
              <div className="text-white font-bold mt-0.5 tabular-nums">{selectedByte.decimal}</div>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">ASCII</div>
              <div className="text-white font-bold mt-0.5">'{selectedByte.ascii}'</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-slate-400 text-[11px]">8-Bit Binary Representation:</div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-center gap-1 font-mono text-xs">
              {selectedByte.binary.split('').map((bit, idx) => (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    bit === '1' ? 'bg-amber-400/20 text-amber-300' : 'text-slate-600'
                  }`}
                >
                  {bit}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-slate-400 text-[11px]">Description & QBasic Role:</div>
            <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-sans">
              {selectedByte.description}
            </div>
          </div>

          {/* QBasic GET Statement Example */}
          <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-[10px] text-emerald-400">
            <code>
              {selectedByte.offset < 6
                ? `' Read Signature: GET #1, 1, Sig$ (Sig$ = "GIF89a")`
                : selectedByte.offset < 10
                ? `' Read Dim: GET #1, 7, ScrWidth%: GET #1, 9, ScrHeight%`
                : selectedByte.offset === 10
                ? `' Unpack Flags: packed% = ASC(b$): hasGCT% = (packed% AND 128) \\ 128`
                : `' Read Color Table: GET #1, , r$: OUT &H3C9, ASC(r$) \\ 4`}
            </code>
          </div>
        </div>
      </div>

      {/* External Inspected GIF details (if user uploaded one) */}
      {inspectedFileHeader && (
        <div className="p-4 bg-slate-950 rounded border border-emerald-500/40 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2 font-sans">
            <Check className="w-4 h-4" />
            <span>Uploaded External GIF Decoded Successfully:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-300 text-[11px]">
            <div>Signature: <strong className="text-white">{inspectedFileHeader.signature}{inspectedFileHeader.version}</strong></div>
            <div>Dimensions: <strong className="text-white">{inspectedFileHeader.width}x{inspectedFileHeader.height}</strong></div>
            <div>GCT Present: <strong className="text-white">{inspectedFileHeader.globalColorTableFlag ? 'Yes' : 'No'}</strong></div>
            <div>Color Count: <strong className="text-white">{inspectedFileHeader.globalColorTableSize} colors</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};
