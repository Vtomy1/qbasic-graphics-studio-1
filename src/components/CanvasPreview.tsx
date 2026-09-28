import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Tv, SplitSquareVertical, Eye, Crosshair } from 'lucide-react';
import { RGBColor, BitDepth } from '../types/graphics';
import { rgbToVgaDac, rgbToHex } from '../lib/palettes';

interface CanvasPreviewProps {
  originalCanvas: HTMLCanvasElement | null;
  quantizedImageData: ImageData | null;
  palette: RGBColor[];
  pixelIndices: Uint8Array | null;
  width: number;
  height: number;
  bitDepth: BitDepth;
  processTimeMs: number;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  originalCanvas,
  quantizedImageData,
  palette,
  pixelIndices,
  width,
  height,
  bitDepth,
  processTimeMs
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(2);
  const [viewMode, setViewMode] = useState<'quantized' | 'split' | 'side-by-side'>('quantized');
  const [splitPos, setSplitPos] = useState<number>(50); // 0-100%
  const [enableCrt, setEnableCrt] = useState<boolean>(true);
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
    index: number;
    color: RGBColor;
  } | null>(null);

  // Redraw canvas whenever quantized image data or split mode changes
  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas || !quantizedImageData) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (viewMode === 'quantized' || !originalCanvas) {
      ctx.putImageData(quantizedImageData, 0, 0);
    } else if (viewMode === 'split' && originalCanvas) {
      // Draw split: left side original, right side quantized
      const splitX = Math.floor((splitPos / 100) * width);

      // Draw quantized full
      ctx.putImageData(quantizedImageData, 0, 0);

      // Draw left clip of original
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, height);
      ctx.clip();
      ctx.drawImage(originalCanvas, 0, 0, width, height);

      // Draw divider line
      ctx.restore();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(splitX + 0.5, 0);
      ctx.lineTo(splitX + 0.5, height);
      ctx.stroke();
    }
  }, [quantizedImageData, originalCanvas, viewMode, splitPos, width, height]);

  // Handle mouse move for pixel inspector
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas || !pixelIndices || width <= 0 || height <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = pixelIndices[y * width + x];
      const color = palette[idx] || { r: 0, g: 0, b: 0 };
      setHoverPixel({ x, y, index: idx, color });
    } else {
      setHoverPixel(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  // Calculate packed size
  const packedBytes =
    bitDepth === 8
      ? width * height
      : bitDepth === 4
      ? Math.ceil((width * height) / 2)
      : Math.ceil((width * height) / 8);

  return (
    <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="font-semibold text-white">Preview</span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-400 tabular-nums">{width}x{height}</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400">{bitDepth}-bit ({1 << (bitDepth === 1 ? 1 : bitDepth === 4 ? 4 : 8)} colors)</span>
          </div>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-3">
          {/* View Modes */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            <button
              onClick={() => setViewMode('quantized')}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                viewMode === 'quantized'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Quantized
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 rounded transition-colors text-[11px] flex items-center gap-1 ${
                viewMode === 'split'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-3 h-3" />
              Split
            </button>
          </div>

          {/* CRT scanlines toggle */}
          <button
            onClick={() => setEnableCrt(!enableCrt)}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors text-[11px] ${
              enableCrt
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle retro CRT scanlines and phosphor simulation"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>CRT Filter</span>
          </button>

          {/* Zoom Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            {[1, 2, 4].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-2 py-1 rounded text-[11px] ${
                  zoom === z
                    ? 'bg-slate-800 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center p-6 bg-slate-950 overflow-auto min-h-[360px] max-h-[560px]"
      >
        <div
          className="relative shadow-2xl rounded-sm transition-all"
          style={{
            width: width * zoom,
            height: height * zoom,
            boxShadow: '0 0 35px rgba(0, 0, 0, 0.9)'
          }}
        >
          {/* Main Canvas */}
          <canvas
            ref={displayCanvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full h-full image-rendering-pixelated cursor-crosshair border border-slate-800"
            style={{
              imageRendering: 'pixelated'
            }}
          />

          {/* CRT Scanline and Phosphor Overlay */}
          {enableCrt && (
            <div className="absolute inset-0 crt-scanlines rounded-sm pointer-events-none" />
          )}

          {/* Split Mode Interactive Drag Handle */}
          {viewMode === 'split' && (
            <div
              className="absolute top-0 bottom-0 pointer-events-auto"
              style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-4 h-full flex items-center justify-center cursor-ew-resize group">
                <div className="w-1 h-full bg-amber-400/90 shadow-sm" />
                <div className="absolute w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                  <SplitSquareVertical className="w-3 h-3" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Split Slider Bar (when in split mode) */}
      {viewMode === 'split' && (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Original Image</span>
          <input
            type="range"
            min="0"
            max="100"
            value={splitPos}
            onChange={(e) => setSplitPos(parseInt(e.target.value, 10))}
            className="flex-1 accent-amber-400 cursor-ew-resize h-1.5 bg-slate-800 rounded"
          />
          <span className="text-amber-400 text-[11px]">QBasic Mode ({splitPos}%)</span>
        </div>
      )}

      {/* Interactive Pixel Inspector & Status Footer */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-950/90 border-t border-slate-800 text-xs font-mono">
        {/* Pixel Inspector Coordinates */}
        <div className="flex items-center gap-3">
          <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          {hoverPixel ? (
            <div className="flex items-center gap-2.5 text-[11px] text-slate-300">
              <span className="text-amber-400 font-semibold tabular-nums">
                X:{hoverPixel.x} Y:{hoverPixel.y}
              </span>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-xs border border-white/20 inline-block shrink-0"
                  style={{ backgroundColor: rgbToHex(hoverPixel.color) }}
                />
                <span className="font-semibold text-white">Color #{hoverPixel.index}</span>
                <span className="text-slate-400">({rgbToHex(hoverPixel.color)})</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-sky-300">
                VGA DAC: ({rgbToVgaDac(hoverPixel.color.r)}, {rgbToVgaDac(hoverPixel.color.g)}, {rgbToVgaDac(hoverPixel.color.b)})
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400">
                PSET ({hoverPixel.x}, {hoverPixel.y}), {hoverPixel.index}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 text-[11px]">
              Hover over image to inspect pixel color, coordinates, and QBasic VGA DAC values.
            </span>
          )}
        </div>

        {/* Quantization Metrics */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>
            Packed: <strong className="text-slate-200 tabular-nums">{packedBytes.toLocaleString()}</strong> bytes
          </span>
          <span className="text-slate-600">·</span>
          <span>
            Process: <strong className="text-slate-200 tabular-nums">{processTimeMs}ms</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
