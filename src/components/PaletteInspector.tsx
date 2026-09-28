import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Copy,
  Check,
  Terminal,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Waves,
  Zap,
  Sliders,
  Tv
} from 'lucide-react';
import { RGBColor, BitDepth } from '../types/graphics';
import { rgbToVgaDac, rgbToHex } from '../lib/palettes';

interface PaletteInspectorProps {
  palette: RGBColor[];
  bitDepth: BitDepth;
  pixelIndices: Uint8Array | null;
  width: number;
  height: number;
}

export type CyclingPreset = 'all' | 'custom-range' | 'water' | 'fire' | 'upper-half';

export const PaletteInspector: React.FC<PaletteInspectorProps> = ({
  palette,
  bitDepth,
  pixelIndices,
  width,
  height
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // --- Palette Cycling State ---
  const [isCycling, setIsCycling] = useState<boolean>(false);
  const [cyclingSpeedFps, setCyclingSpeedFps] = useState<number>(24); // 1 - 60 FPS
  const [cycleDirection, setCycleDirection] = useState<'forward' | 'reverse'>('forward');
  const [cycleRangeStart, setCycleRangeStart] = useState<number>(0);
  const [cycleRangeEnd, setCycleRangeEnd] = useState<number>(palette.length - 1);
  const [activeShiftOffset, setActiveShiftOffset] = useState<number>(0);
  const [enableCrtEffect, setEnableCrtEffect] = useState<boolean>(true);
  const [viewZoom, setViewZoom] = useState<number>(2);

  // Preview canvas for real-time cycled blitting
  const cycledCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Ensure cycle range boundaries stay valid if palette length changes
  useEffect(() => {
    setCycleRangeStart((prev) => Math.min(prev, Math.max(0, palette.length - 2)));
    setCycleRangeEnd((prev) => Math.min(Math.max(prev, 1), palette.length - 1));
  }, [palette.length]);

  // Compute the currently shifted / cycled palette
  const computeShiftedPalette = (shift: number): RGBColor[] => {
    if (shift === 0 || palette.length <= 1) return palette;

    const newPal = [...palette];
    const start = Math.max(0, Math.min(cycleRangeStart, palette.length - 1));
    const end = Math.max(start, Math.min(cycleRangeEnd, palette.length - 1));
    const rangeLen = end - start + 1;

    if (rangeLen <= 1) return palette;

    const sub = palette.slice(start, end + 1);
    const modShift = ((shift % rangeLen) + rangeLen) % rangeLen;

    for (let i = 0; i < rangeLen; i++) {
      let sourceIdx = (i - modShift + rangeLen) % rangeLen;
      newPal[start + i] = sub[sourceIdx];
    }

    return newPal;
  };

  const activePalette = computeShiftedPalette(activeShiftOffset);

  // Animation Loop for Palette Cycling
  useEffect(() => {
    if (!isCycling) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const intervalMs = 1000 / cyclingSpeedFps;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= intervalMs) {
        lastTimeRef.current = timestamp - (elapsed % intervalMs);
        setActiveShiftOffset((prev) => {
          const step = cycleDirection === 'forward' ? 1 : -1;
          const rangeLen = Math.max(1, cycleRangeEnd - cycleRangeStart + 1);
          return ((prev + step) % rangeLen + rangeLen) % rangeLen;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isCycling, cyclingSpeedFps, cycleDirection, cycleRangeStart, cycleRangeEnd]);

  // Render to canvas on activePalette or pixelIndices change
  useEffect(() => {
    const canvas = cycledCanvasRef.current;
    if (!canvas || !pixelIndices || width <= 0 || height <= 0) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    const totalPixels = width * height;

    for (let i = 0; i < totalPixels; i++) {
      const colIdx = pixelIndices[i];
      const color = activePalette[colIdx] || { r: 0, g: 0, b: 0 };
      const dIdx = i * 4;
      data[dIdx] = color.r;
      data[dIdx + 1] = color.g;
      data[dIdx + 2] = color.b;
      data[dIdx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [activePalette, pixelIndices, width, height]);

  // Selected Color Inspection
  const activeColor = activePalette[selectedIndex] || activePalette[0] || { r: 0, g: 0, b: 0 };
  const dacR = rgbToVgaDac(activeColor.r);
  const dacG = rgbToVgaDac(activeColor.g);
  const dacB = rgbToVgaDac(activeColor.b);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // QBasic Code for Single DAC
  const qbasicSingleDac = `OUT &H3C8, ${selectedIndex}
OUT &H3C9, ${dacR}  ' Red (0-63)
OUT &H3C9, ${dacG}  ' Green (0-63)
OUT &H3C9, ${dacB}  ' Blue (0-63)`;

  // QBasic Code for Palette Cycling Subroutine
  const qbasicPaletteCyclingSub = `' ====================================================================
' CLASSIC DOS HARDWARE VGA PALETTE ROTATION (PALETTE CYCLING)
' Creates flowing waterfall, plasma, fire, and liquid animations
' with ZERO CPU redraw overhead by directly rotating DAC hardware ports.
' ====================================================================

SUB CycleVgaPalette (firstCol%, lastCol%, dir%)
    count% = lastCol% - firstCol% + 1
    IF count% <= 1 THEN EXIT SUB

    ' Read existing DAC palette into local RGB arrays
    DIM r%(count%), g%(count%), b%(count%)
    OUT &H3C7, firstCol% ' DAC Read Index port
    FOR i% = 0 TO count% - 1
        r%(i%) = INP(&H3C9)
        g%(i%) = INP(&H3C9)
        b%(i%) = INP(&H3C9)
    NEXT i%

    ' Shift palette entries in memory
    DIM shiftedR%(count%), shiftedG%(count%), shiftedB%(count%)
    FOR i% = 0 TO count% - 1
        IF dir% >= 0 THEN
            src% = (i% - 1 + count%) MOD count%
        ELSE
            src% = (i% + 1) MOD count%
        END IF
        shiftedR%(i%) = r%(src%)
        shiftedG%(i%) = g%(src%)
        shiftedB%(i%) = b%(src%)
    NEXT i%

    ' Synchronize with CRT vertical retrace (&H3DA) to prevent screen tearing
    WAIT &H3DA, 8
    WAIT &H3DA, 8, 8

    ' Write rotated entries back to VGA DAC (&H3C8 / &H3C9)
    OUT &H3C8, firstCol% ' DAC Write Index port
    FOR i% = 0 TO count% - 1
        OUT &H3C9, shiftedR%(i%)
        OUT &H3C9, shiftedG%(i%)
        OUT &H3C9, shiftedB%(i%)
    NEXT i%
END SUB

' Main Animation Demo Loop:
' DO WHILE INKEY$ = ""
'     CALL CycleVgaPalette(${cycleRangeStart}, ${cycleRangeEnd}, ${cycleDirection === 'forward' ? 1 : -1})
' LOOP`;

  // Quick Preset Selection Helper
  const applyRangePreset = (preset: CyclingPreset) => {
    if (preset === 'all') {
      setCycleRangeStart(0);
      setCycleRangeEnd(palette.length - 1);
    } else if (preset === 'upper-half') {
      setCycleRangeStart(Math.floor(palette.length / 2));
      setCycleRangeEnd(palette.length - 1);
    } else if (preset === 'water') {
      // Typically index 1 to 7 or 16 to 31
      const start = Math.min(1, palette.length - 1);
      const end = Math.min(bitDepth === 8 ? 31 : 7, palette.length - 1);
      setCycleRangeStart(start);
      setCycleRangeEnd(end);
    } else if (preset === 'fire') {
      const start = Math.min(bitDepth === 8 ? 32 : 4, palette.length - 1);
      const end = Math.min(bitDepth === 8 ? 64 : 14, palette.length - 1);
      setCycleRangeStart(start);
      setCycleRangeEnd(end);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <span>VGA Hardware DAC & Palette Cycling Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulate classic DOS demoscene and LucasArts color index shifting (waterfalls, liquid, plasma, and neon).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Total Entries:</span>
            <span className="px-2 py-0.5 bg-slate-800 text-amber-300 font-bold rounded">
              {palette.length} Colors ({bitDepth}-bit)
            </span>
          </div>

          <button
            onClick={() => setIsCycling(!isCycling)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded flex items-center gap-1.5 transition-colors shadow-sm ${
              isCycling
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
            }`}
          >
            {isCycling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isCycling ? 'Pause Cycling' : 'Simulate Cycling'}</span>
          </button>
        </div>
      </div>

      {/* --- PALETTE CYCLING HERO SECTION --- */}
      <div className="p-4 bg-slate-950 rounded-lg border border-amber-500/30 shadow-lg flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Waves className="w-4 h-4 text-amber-400" />
            <span>Real-Time Index Shifting Live Monitor</span>
            {isCycling && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-400">Shift Offset:</span>
            <span className="text-amber-300 font-bold tabular-nums">+{activeShiftOffset}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Range:</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              [{cycleRangeStart} .. {cycleRangeEnd}] ({cycleRangeEnd - cycleRangeStart + 1} colors)
            </span>
          </div>
        </div>

        {/* Live Canvas Viewport with CRT Simulation & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Canvas Display (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <div className="relative flex items-center justify-center p-4 bg-slate-900/90 rounded border border-slate-800 overflow-auto min-h-[260px] max-h-[380px]">
              <div
                className="relative shadow-xl transition-all"
                style={{
                  width: width * viewZoom,
                  height: height * viewZoom,
                  boxShadow: '0 0 25px rgba(0,0,0,0.8)'
                }}
              >
                <canvas
                  ref={cycledCanvasRef}
                  className="w-full h-full image-rendering-pixelated border border-slate-700/60"
                  style={{ imageRendering: 'pixelated' }}
                />
                {enableCrtEffect && (
                  <div className="absolute inset-0 crt-scanlines rounded-xs pointer-events-none" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEnableCrtEffect(!enableCrtEffect)}
                  className={`flex items-center gap-1 hover:text-white transition-colors ${
                    enableCrtEffect ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  <span>CRT Phosphor</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500">Zoom:</span>
                {[1, 2, 3].map((z) => (
                  <button
                    key={z}
                    onClick={() => setViewZoom(z)}
                    className={`px-1.5 py-0.5 rounded ${
                      viewZoom === z ? 'bg-amber-400 text-slate-950 font-bold' : 'hover:text-white'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cycling Control Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 font-mono text-xs">
            {/* Speed & Direction Controls */}
            <div className="p-3 bg-slate-900 rounded border border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5 font-sans">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Animation Speed
                </span>
                <span className="text-amber-400 font-bold tabular-nums">{cyclingSpeedFps} FPS</span>
              </div>

              <input
                type="range"
                min="1"
                max="60"
                value={cyclingSpeedFps}
                onChange={(e) => setCyclingSpeedFps(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setCycleDirection('forward')}
                  className={`flex-1 py-1 rounded border text-center transition-colors text-[11px] ${
                    cycleDirection === 'forward'
                      ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Forward (Flow Down)
                </button>

                <button
                  onClick={() => setCycleDirection('reverse')}
                  className={`flex-1 py-1 rounded border text-center transition-colors text-[11px] ${
                    cycleDirection === 'reverse'
                      ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Reverse (Flow Up)
                </button>

                <button
                  onClick={() => setActiveShiftOffset(0)}
                  className="px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Reset shift to 0"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Index Range Selection */}
            <div className="p-3 bg-slate-900 rounded border border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5 font-sans">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  Palette Shift Range
                </span>
                <span className="text-blue-400 tabular-nums">
                  #{cycleRangeStart} to #{cycleRangeEnd}
                </span>
              </div>

              {/* Sliders for Start & End */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Start Index: {cycleRangeStart}</span>
                  <span>End Index: {cycleRangeEnd}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, cycleRangeEnd - 1)}
                    value={cycleRangeStart}
                    onChange={(e) => setCycleRangeStart(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                  <input
                    type="range"
                    min={cycleRangeStart + 1}
                    max={palette.length - 1}
                    value={cycleRangeEnd}
                    onChange={(e) => setCycleRangeEnd(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>
              </div>

              {/* Range Presets */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                <span className="text-[10px] text-slate-500 whitespace-nowrap">Presets:</span>
                <button
                  onClick={() => applyRangePreset('all')}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:text-white hover:border-amber-400"
                >
                  All Colors
                </button>
                <button
                  onClick={() => applyRangePreset('water')}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-sky-300 hover:text-white hover:border-sky-400"
                >
                  Water (0-7/31)
                </button>
                <button
                  onClick={() => applyRangePreset('fire')}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-orange-300 hover:text-white hover:border-orange-400"
                >
                  Fire / Neon
                </button>
                <button
                  onClick={() => applyRangePreset('upper-half')}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-purple-300 hover:text-white hover:border-purple-400"
                >
                  Upper Half
                </button>
              </div>
            </div>

            {/* Visual Cycle Band Bar */}
            <div className="flex flex-col gap-1 p-2 bg-slate-900 rounded border border-slate-800 text-[10px]">
              <span className="text-slate-400">Shifted Color Ring Preview:</span>
              <div className="flex h-5 w-full rounded overflow-hidden border border-slate-800">
                {activePalette.map((col, idx) => {
                  const isInRange = idx >= cycleRangeStart && idx <= cycleRangeEnd;
                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full transition-colors relative"
                      style={{
                        backgroundColor: rgbToHex(col),
                        opacity: isInRange ? 1 : 0.25
                      }}
                      title={`#${idx}: ${rgbToHex(col)} ${isInRange ? '(In cycling range)' : '(Stationary)'}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- STANDARD SWATCH MATRIX & SINGLE COLOR INSPECTOR --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Swatch Matrix */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Color Swatches (Reflects live cycled DAC state)</span>
            <span className="text-[11px] text-slate-500">Selected: #{selectedIndex}</span>
          </div>

          <div
            className={`grid gap-1 p-3 bg-slate-950 rounded border border-slate-800 max-h-[340px] overflow-y-auto ${
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
            {activePalette.map((color, idx) => {
              const hex = rgbToHex(color);
              const isSelected = selectedIndex === idx;
              const isInCycleRange = idx >= cycleRangeStart && idx <= cycleRangeEnd;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`group relative aspect-square rounded-xs border transition-all ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/50 scale-110 z-10'
                      : isInCycleRange && isCycling
                      ? 'border-amber-400/40 hover:border-white'
                      : 'border-white/10 hover:border-white/40 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={`Color #${idx}: ${hex} | DAC (${rgbToVgaDac(color.r)}, ${rgbToVgaDac(color.g)}, ${rgbToVgaDac(color.b)}) ${
                    isInCycleRange ? '[Active Cycle Range]' : ''
                  }`}
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
                  {isInCycleRange && isCycling && (
                    <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-400" />
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

          {/* QBasic Palette Cycling Subroutine Code */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Waves className="w-3 h-3 text-emerald-400" />
                QBasic Palette Cycling SUB
              </span>
              <button
                onClick={() => copyToClipboard(qbasicPaletteCyclingSub, 'cycling')}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copiedType === 'cycling' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'cycling' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-[10px] text-emerald-300/90 overflow-x-auto max-h-[160px]">
              <code>{qbasicPaletteCyclingSub}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
