import React, { useRef } from 'react';
import { Upload, RefreshCw, Sliders, Palette, Layers, Monitor, Image as ImageIcon } from 'lucide-react';
import { BitDepth, DitherAlgorithm, ImageAdjustments, ScreenPreset } from '../types/graphics';
import { SCREEN_PRESETS } from '../lib/palettes';
import { SAMPLE_IMAGES } from '../lib/sampleImages';

interface ViewportControlsProps {
  currentPreset: ScreenPreset;
  onSelectPreset: (preset: ScreenPreset) => void;
  customWidth: number;
  customHeight: number;
  onUpdateCustomDimensions: (w: number, h: number) => void;
  bitDepth: BitDepth;
  onChangeBitDepth: (b: BitDepth) => void;
  ditherAlgorithm: DitherAlgorithm;
  onChangeDitherAlgorithm: (alg: DitherAlgorithm) => void;
  adjustments: ImageAdjustments;
  onChangeAdjustments: (adj: ImageAdjustments) => void;
  paletteMode: 'default' | 'custom' | 'green' | 'amber' | 'paperwhite';
  onChangePaletteMode: (mode: 'default' | 'custom' | 'green' | 'amber' | 'paperwhite') => void;
  onFileUpload: (file: File) => void;
  activeSampleId: string;
  onSelectSample: (id: string) => void;
  isProcessing: boolean;
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  currentPreset,
  onSelectPreset,
  customWidth,
  customHeight,
  onUpdateCustomDimensions,
  bitDepth,
  onChangeBitDepth,
  ditherAlgorithm,
  onChangeDitherAlgorithm,
  adjustments,
  onChangeAdjustments,
  paletteMode,
  onChangePaletteMode,
  onFileUpload,
  activeSampleId,
  onSelectSample,
  isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono">
      {/* 1. Image Source & Sample Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-slate-400 font-sans font-semibold text-xs tracking-wide uppercase">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            Image Source
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 normal-case font-mono font-normal"
          >
            <Upload className="w-3 h-3" />
            Upload File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.gif,.bmp,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample.id)}
              className={`px-2.5 py-1.5 rounded text-left border transition-colors truncate ${
                activeSampleId === sample.id
                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 font-semibold'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={sample.description}
            >
              <div className="truncate font-sans font-medium text-xs">{sample.name}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{sample.category}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      {/* 2. DOS Screen Preset & Dimensions */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-slate-400 font-sans font-semibold text-xs tracking-wide uppercase">
          <span className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-blue-400" />
            DOS Screen Mode
          </span>
          <span className="text-slate-400 tabular-nums">
            {currentPreset.width}x{currentPreset.height}
          </span>
        </div>

        <select
          value={currentPreset.id}
          onChange={(e) => {
            const found = SCREEN_PRESETS.find((p) => p.id === e.target.value);
            if (found) onSelectPreset(found);
          }}
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 focus:border-amber-400 focus:outline-none transition-colors"
        >
          {SCREEN_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} ({preset.width}x{preset.height} · {preset.colors}c)
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
          {currentPreset.description}
        </p>
      </div>

      <div className="h-px bg-slate-800" />

      {/* 3. Color Depth (1-bit, 4-bit, 8-bit) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-slate-400 font-sans font-semibold text-xs tracking-wide uppercase">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Bit Depth & Palette
          </span>
          <span className="text-emerald-400 font-mono">
            {bitDepth === 1 ? '2 Colors' : bitDepth === 4 ? '16 Colors' : '256 Colors'}
          </span>
        </div>

        {/* Segmented bitdepth buttons */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded border border-slate-800">
          <button
            onClick={() => onChangeBitDepth(1)}
            className={`py-1.5 px-2 text-center rounded transition-colors whitespace-nowrap ${
              bitDepth === 1
                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1-Bit Mono
          </button>
          <button
            onClick={() => onChangeBitDepth(4)}
            className={`py-1.5 px-2 text-center rounded transition-colors whitespace-nowrap ${
              bitDepth === 4
                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4-Bit (16c)
          </button>
          <button
            onClick={() => onChangeBitDepth(8)}
            className={`py-1.5 px-2 text-center rounded transition-colors whitespace-nowrap ${
              bitDepth === 8
                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            8-Bit (256c)
          </button>
        </div>

        {/* Palette Flavor */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="text-[11px] text-slate-400">Palette Configuration:</label>
          {bitDepth === 1 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'default', label: 'Black & White' },
                { id: 'green', label: 'P1 Green Phosphor' },
                { id: 'amber', label: 'Amber Monochrome' },
                { id: 'paperwhite', label: 'Paper White' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChangePaletteMode(m.id as any)}
                  className={`px-2 py-1 rounded text-left border transition-colors ${
                    paletteMode === m.id
                      ? 'bg-slate-800 border-amber-400/60 text-amber-300 font-semibold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onChangePaletteMode('default')}
                className={`px-2.5 py-1.5 rounded text-left border transition-colors ${
                  paletteMode === 'default'
                    ? 'bg-slate-800 border-amber-400/60 text-amber-300 font-semibold'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>Standard {bitDepth === 4 ? 'EGA/VGA 16' : 'Mode 13h 256'}</div>
                <div className="text-[10px] text-slate-400">Classic IBM BIOS</div>
              </button>
              <button
                onClick={() => onChangePaletteMode('custom')}
                className={`px-2.5 py-1.5 rounded text-left border transition-colors ${
                  paletteMode === 'custom'
                    ? 'bg-slate-800 border-amber-400/60 text-amber-300 font-semibold'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>Optimized Median-Cut</div>
                <div className="text-[10px] text-slate-400">Extracted from image</div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      {/* 4. Dithering Algorithms */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-slate-400 font-sans font-semibold text-xs tracking-wide uppercase">
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            Dithering Algorithm
          </span>
          <span className="text-purple-400 tabular-nums">
            {Math.round(adjustments.ditherStrength * 100)}%
          </span>
        </div>

        <select
          value={ditherAlgorithm}
          onChange={(e) => onChangeDitherAlgorithm(e.target.value as DitherAlgorithm)}
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 focus:border-amber-400 focus:outline-none transition-colors"
        >
          <option value="none">None (Nearest Color / Threshold)</option>
          <option value="floyd-steinberg">Floyd-Steinberg (Classic Diffusion)</option>
          <option value="atkinson">Atkinson (Vintage Mac / High Contrast)</option>
          <option value="bayer-2x2">Bayer Ordered 2x2</option>
          <option value="bayer-4x4">Bayer Ordered 4x4 (Retro Cross-Hatch)</option>
          <option value="bayer-8x8">Bayer Ordered 8x8 (Fine Matrix)</option>
          <option value="burkes">Burkes Diffusion</option>
          <option value="sierra-lite">Sierra Lite (Fast Diffusion)</option>
        </select>

        {/* Dither strength slider */}
        {ditherAlgorithm !== 'none' && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Dither Diffusion Strength</span>
              <span className="tabular-nums">{(adjustments.ditherStrength).toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.05"
              value={adjustments.ditherStrength}
              onChange={(e) =>
                onChangeAdjustments({
                  ...adjustments,
                  ditherStrength: parseFloat(e.target.value)
                })
              }
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>
        )}
      </div>

      <div className="h-px bg-slate-800" />

      {/* 5. Image Processing Adjustments */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-slate-400 font-sans font-semibold text-xs tracking-wide uppercase">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
            Image Adjustments
          </span>
          <button
            onClick={() =>
              onChangeAdjustments({
                brightness: 0,
                contrast: 0,
                gamma: 1.0,
                ditherStrength: 1.0,
                invert: false
              })
            }
            className="text-slate-400 hover:text-slate-200 transition-colors normal-case flex items-center gap-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Brightness */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Brightness</span>
            <span className="tabular-nums">{adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}</span>
          </div>
          <input
            type="range"
            min="-80"
            max="80"
            step="1"
            value={adjustments.brightness}
            onChange={(e) =>
              onChangeAdjustments({
                ...adjustments,
                brightness: parseInt(e.target.value, 10)
              })
            }
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded"
          />
        </div>

        {/* Contrast */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Contrast</span>
            <span className="tabular-nums">{adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}</span>
          </div>
          <input
            type="range"
            min="-80"
            max="80"
            step="1"
            value={adjustments.contrast}
            onChange={(e) =>
              onChangeAdjustments({
                ...adjustments,
                contrast: parseInt(e.target.value, 10)
              })
            }
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded"
          />
        </div>

        {/* Gamma */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Gamma Curve</span>
            <span className="tabular-nums">{adjustments.gamma.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="2.5"
            step="0.05"
            value={adjustments.gamma}
            onChange={(e) =>
              onChangeAdjustments({
                ...adjustments,
                gamma: parseFloat(e.target.value)
              })
            }
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded"
          />
        </div>

        {/* Invert */}
        <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-300">
          <input
            type="checkbox"
            checked={adjustments.invert}
            onChange={(e) =>
              onChangeAdjustments({
                ...adjustments,
                invert: e.target.checked
              })
            }
            className="accent-amber-400 w-3.5 h-3.5 rounded"
          />
          <span className="text-[11px]">Invert Negative Colors</span>
        </label>
      </div>
    </div>
  );
};
