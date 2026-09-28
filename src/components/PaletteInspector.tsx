import React, { useState } from 'react';
import { Palette, Copy, Check, Terminal } from 'lucide-react';
import { RGBColor, BitDepth } from '../types/graphics';
import { rgbToVgaDac, rgbToHex } from '../lib/palettes';

interface PaletteInspectorProps {
  palette: RGBColor[];
  bitDepth: BitDepth;
}

export const PaletteInspector: React.FC<PaletteInspectorProps> = ({ palette, bitDepth }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const activeColor = palette[selectedIndex] || palette[0] || { r: 0, g: 0, b: 0 };
  const dacR = rgbToVgaDac(activeColor.r);
  const dacG = rgbToVgaDac(activeColor.g);
  const dacB = rgbToVgaDac(activeColor.b);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const qbasicSingleDac = `OUT &H3C8, ${selectedIndex}
OUT &H3C9, ${dacR}  ' Red (0-63)
OUT &H3C9, ${dacG}  ' Green (0-63)
OUT &H3C9, ${dacB}  ' Blue (0-63)`;

  const qbasicAllDac = `' Program all ${palette.length} VGA DAC palette registers
OUT &H3C8, 0
${palette
  .map(
    (c, idx) =>
      `OUT &H3C9, ${rgbToVgaDac(c.r)}: OUT &H3C9, ${rgbToVgaDac(c.g)}: OUT &H3C9, ${rgbToVgaDac(c.b)} ' #${idx}`
  )
  .slice(0, 32)
  .join('\n')}
${palette.length > 32 ? `' ... and ${palette.length - 32} more colors` : ''}`;

  return (
    <div className="flex flex-col gap-5 p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <span>VGA Hardware DAC Palette Inspector</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            6-bit DAC register values (0-63) for QBasic Mode 13h / EGA hardware registers.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Total Entries:</span>
          <span className="px-2 py-0.5 bg-slate-800 text-amber-300 font-bold rounded">
            {palette.length} Colors ({bitDepth}-bit)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Swatch Matrix */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Color Swatches (Click to select & inspect)</span>
            <span className="text-[11px] text-slate-500">Selected: #{selectedIndex}</span>
          </div>

          <div
            className={`grid gap-1 p-3 bg-slate-950 rounded border border-slate-800 max-h-[360px] overflow-y-auto ${
              bitDepth === 1
                ? 'grid-cols-2'
                : bitDepth === 4
                ? 'grid-cols-8'
                : 'grid-cols-16 sm:grid-cols-16'
            }`}
            style={{
              gridTemplateColumns:
                bitDepth === 8 ? 'repeat(auto-fill, minmax(24px, 1fr))' : undefined
            }}
          >
            {palette.map((color, idx) => {
              const hex = rgbToHex(color);
              const isSelected = selectedIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`group relative aspect-square rounded-xs border transition-all ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/50 scale-110 z-10'
                      : 'border-white/10 hover:border-white/40 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={`Color #${idx}: ${hex} | DAC (${rgbToVgaDac(color.r)}, ${rgbToVgaDac(color.g)}, ${rgbToVgaDac(color.b)})`}
                >
                  {bitDepth <= 4 && (
                    <span
                      className={`absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold ${
                        (color.r * 299 + color.g * 587 + color.b * 114) / 1000 > 128
                          ? 'text-slate-900'
                          : 'text-white'
                      }`}
                    >
                      {idx}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Col: Selected Color Details & QBasic Snippets */}
        <div className="flex flex-col gap-4 p-4 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div
              className="w-12 h-12 rounded border border-slate-700 shadow-inner shrink-0"
              style={{ backgroundColor: rgbToHex(activeColor) }}
            />
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">
                Color #{selectedIndex} {activeColor.name ? `· ${activeColor.name}` : ''}
              </span>
              <span className="text-amber-400 font-semibold">{rgbToHex(activeColor)}</span>
            </div>
          </div>

          {/* Color Breakdown Table */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400">8-bit RGB (0-255)</div>
              <div className="text-slate-200 font-semibold mt-0.5">
                R:{activeColor.r} G:{activeColor.g} B:{activeColor.b}
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400">VGA 6-bit DAC (0-63)</div>
              <div className="text-emerald-400 font-semibold mt-0.5">
                R:{dacR} G:{dacG} B:{dacB}
              </div>
            </div>
          </div>

          {/* QBasic Single DAC Code */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-amber-400" />
                Single Color OUT Routine
              </span>
              <button
                onClick={() => copyToClipboard(qbasicSingleDac, 'single')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedType === 'single' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'single' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-amber-300 overflow-x-auto">
              <code>{qbasicSingleDac}</code>
            </pre>
          </div>

          {/* QBasic Full Palette Code */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Batch Palette OUT</span>
              <button
                onClick={() => copyToClipboard(qbasicAllDac, 'all')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedType === 'all' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'all' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-[10px] text-slate-300 overflow-x-auto max-h-[120px]">
              <code>{qbasicAllDac}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
