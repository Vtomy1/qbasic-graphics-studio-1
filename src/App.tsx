import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ViewportControls } from './components/ViewportControls';
import { CanvasPreview } from './components/CanvasPreview';
import { PaletteInspector } from './components/PaletteInspector';
import { GifHeaderInspector } from './components/GifHeaderInspector';
import { CodeExportViewer } from './components/CodeExportViewer';
import { ExportModal } from './components/ExportModal';
import {
  BitDepth,
  DitherAlgorithm,
  ImageAdjustments,
  ScreenPreset,
  RGBColor,
  QuantizedResult
} from './types/graphics';
import {
  SCREEN_PRESETS,
  IBM_16_PALETTE,
  MONO_PALETTES,
  generateDefaultVga256Palette,
  extractCustomPalette
} from './lib/palettes';
import { quantizeImage } from './lib/dithering';
import { buildGifHeaderBytes, createValidGifFile } from './lib/gifHeader';
import { generateBsvFile } from './lib/qbasicGenerators';
import { SAMPLE_IMAGES } from './lib/sampleImages';
import { Terminal, Cpu, FileCode, Layers, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'gif-header' | 'code-samples' | 'palette'>('converter');
  const [currentPreset, setCurrentPreset] = useState<ScreenPreset>(SCREEN_PRESETS[0]); // SCREEN 13 (320x200 8-bit)
  const [bitDepth, setBitDepth] = useState<BitDepth>(8);
  const [ditherAlgorithm, setDitherAlgorithm] = useState<DitherAlgorithm>('floyd-steinberg');
  const [paletteMode, setPaletteMode] = useState<'default' | 'custom' | 'green' | 'amber' | 'paperwhite'>('default');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 0,
    gamma: 1.0,
    ditherStrength: 1.0,
    invert: false
  });
  const [activeSampleId, setActiveSampleId] = useState<string>('dos-city');
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  // Quantization result state
  const [quantizedResult, setQuantizedResult] = useState<QuantizedResult | null>(null);

  // References to offscreen canvases
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const quantizedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // When preset changes, automatically update bit depth to preset default
  const handleSelectPreset = (preset: ScreenPreset) => {
    setCurrentPreset(preset);
    setBitDepth(preset.defaultBitDepth);
  };

  // Switch to next random sample
  const handleLoadRandomSample = () => {
    const remaining = SAMPLE_IMAGES.filter((s) => s.id !== activeSampleId);
    const next = remaining[Math.floor(Math.random() * remaining.length)] || SAMPLE_IMAGES[0];
    setCustomImage(null);
    setActiveSampleId(next.id);
  };

  // Handle uploaded image file
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        const img = new Image();
        img.onload = () => {
          setCustomImage(img);
          setActiveSampleId('');
        };
        img.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Core Processing Routine
  const runConversion = useCallback(() => {
    setIsProcessing(true);
    const startTime = performance.now();

    const width = currentPreset.width;
    const height = currentPreset.height;

    // 1. Prepare original canvas
    if (!originalCanvasRef.current) {
      originalCanvasRef.current = document.createElement('canvas');
    }
    const origCanvas = originalCanvasRef.current;
    origCanvas.width = width;
    origCanvas.height = height;
    const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });
    if (!origCtx) return;

    if (customImage) {
      // Draw user image fitted with cover or center
      origCtx.drawImage(customImage, 0, 0, width, height);
    } else {
      // Draw selected built-in sample
      const sample = SAMPLE_IMAGES.find((s) => s.id === activeSampleId) || SAMPLE_IMAGES[0];
      sample.draw(origCtx, width, height);
    }

    const sourceData = origCtx.getImageData(0, 0, width, height);

    // 2. Select or generate palette
    let activePalette: RGBColor[];
    if (bitDepth === 1) {
      activePalette = MONO_PALETTES[paletteMode] || MONO_PALETTES.bw;
    } else if (bitDepth === 4) {
      if (paletteMode === 'custom') {
        activePalette = extractCustomPalette(sourceData, 16);
      } else {
        activePalette = IBM_16_PALETTE;
      }
    } else {
      // 8-bit (256 colors)
      if (paletteMode === 'custom') {
        activePalette = extractCustomPalette(sourceData, 256);
      } else {
        activePalette = generateDefaultVga256Palette();
      }
    }

    // 3. Quantize and Dither
    const { pixelIndices, packedBinaryBytes, quantizedRgba } = quantizeImage(
      sourceData,
      activePalette,
      ditherAlgorithm,
      adjustments,
      bitDepth
    );

    // 4. Update quantized canvas
    if (!quantizedCanvasRef.current) {
      quantizedCanvasRef.current = document.createElement('canvas');
    }
    const qCanvas = quantizedCanvasRef.current;
    qCanvas.width = width;
    qCanvas.height = height;
    const qCtx = qCanvas.getContext('2d');
    if (qCtx) {
      qCtx.putImageData(quantizedRgba, 0, 0);
    }

    // 5. Pre-generate binary headers & BSAVE buffer
    const bsaveBytes = generateBsvFile(width, height, pixelIndices, bitDepth);
    const gifBytes = createValidGifFile(width, height, activePalette, pixelIndices, bitDepth);

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    setQuantizedResult({
      width,
      height,
      bitDepth,
      palette: activePalette,
      pixelIndices,
      packedBinaryBytes,
      bsaveBytes,
      gifBytes,
      processTimeMs: durationMs
    });

    setIsProcessing(false);
  }, [
    currentPreset,
    bitDepth,
    ditherAlgorithm,
    paletteMode,
    adjustments,
    activeSampleId,
    customImage
  ]);

  // Trigger conversion when inputs change
  useEffect(() => {
    runConversion();
  }, [runConversion]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Header (3-zone Top Bar Contract) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExportModal={() => setExportModalOpen(true)}
        onLoadRandomSample={handleLoadRandomSample}
      />

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Navigation Sub-Strip for Mobile / Context Breadcrumbs */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">MS-DOS Target:</span>
            <span className="text-amber-400 font-semibold">{currentPreset.name}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 tabular-nums">
              {currentPreset.width}x{currentPreset.height}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400">{bitDepth}-bit Color Mode</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Dither:</span>
            <span className="text-purple-400 font-semibold">{ditherAlgorithm}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 tabular-nums">
              {quantizedResult ? `${quantizedResult.processTimeMs}ms` : 'Ready'}
            </span>
          </div>
        </div>

        {/* Tab 1: Image Converter & Interactive Canvas */}
        {activeTab === 'converter' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Control Column (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <ViewportControls
                currentPreset={currentPreset}
                onSelectPreset={handleSelectPreset}
                customWidth={currentPreset.width}
                customHeight={currentPreset.height}
                onUpdateCustomDimensions={(w, h) =>
                  setCurrentPreset({
                    id: 'custom',
                    name: `Custom (${w}x${h})`,
                    qbasicScreen: 13,
                    width: w,
                    height: h,
                    defaultBitDepth: bitDepth,
                    colors: 1 << bitDepth,
                    description: `Custom user resolution ${w}x${h}`
                  })
                }
                bitDepth={bitDepth}
                onChangeBitDepth={setBitDepth}
                ditherAlgorithm={ditherAlgorithm}
                onChangeDitherAlgorithm={setDitherAlgorithm}
                adjustments={adjustments}
                onChangeAdjustments={setAdjustments}
                paletteMode={paletteMode}
                onChangePaletteMode={setPaletteMode}
                onFileUpload={handleFileUpload}
                activeSampleId={activeSampleId}
                onSelectSample={(id) => {
                  setCustomImage(null);
                  setActiveSampleId(id);
                }}
                isProcessing={isProcessing}
              />
            </div>

            {/* Right Display Column (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              <CanvasPreview
                originalCanvas={originalCanvasRef.current}
                quantizedImageData={
                  quantizedCanvasRef.current
                    ? quantizedCanvasRef.current
                        .getContext('2d')
                        ?.getImageData(0, 0, currentPreset.width, currentPreset.height) || null
                    : null
                }
                palette={quantizedResult ? quantizedResult.palette : []}
                pixelIndices={quantizedResult ? quantizedResult.pixelIndices : null}
                width={currentPreset.width}
                height={currentPreset.height}
                bitDepth={bitDepth}
                processTimeMs={quantizedResult ? quantizedResult.processTimeMs : 0}
              />

              {/* Quick Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <button
                  onClick={() => setActiveTab('gif-header')}
                  className="p-3.5 rounded bg-slate-900/60 border border-slate-800 hover:border-amber-400/50 hover:bg-slate-900 transition-all text-left flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Inspect GIF Header</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      View 13-byte GIF89a header descriptor, packed color fields, and RGB global color table.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400/80 mt-3 group-hover:text-amber-300">
                    <span>Inspect Binary Header</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('code-samples')}
                  className="p-3.5 rounded bg-slate-900/60 border border-slate-800 hover:border-amber-400/50 hover:bg-slate-900 transition-all text-left flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>QBasic Saver & Loader</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      Get runnable BLOAD/BSAVE routines, GIF loader subroutines, and standalone DATA statements.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400/80 mt-3 group-hover:text-emerald-300">
                    <span>View QBasic Code</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('palette')}
                  className="p-3.5 rounded bg-slate-900/60 border border-slate-800 hover:border-amber-400/50 hover:bg-slate-900 transition-all text-left flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-purple-400 font-semibold mb-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>VGA DAC Hardware Registers</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      Inspect 6-bit DAC RGB registers (0-63) and copy OUT &amp;H3C8 / &amp;H3C9 statements.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-purple-400/80 mt-3 group-hover:text-purple-300">
                    <span>Inspect Palette</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: GIF Header Inspector */}
        {activeTab === 'gif-header' && (
          <GifHeaderInspector
            width={currentPreset.width}
            height={currentPreset.height}
            palette={quantizedResult ? quantizedResult.palette : []}
            bitDepth={bitDepth}
          />
        )}

        {/* Tab 3: QBasic Saver & Loader Code Samples */}
        {activeTab === 'code-samples' && (
          <CodeExportViewer
            width={currentPreset.width}
            height={currentPreset.height}
            palette={quantizedResult ? quantizedResult.palette : []}
            pixelIndices={quantizedResult ? quantizedResult.pixelIndices : null}
            packedBinaryBytes={quantizedResult ? quantizedResult.packedBinaryBytes : null}
            bitDepth={bitDepth}
            quantizedCanvas={quantizedCanvasRef.current}
          />
        )}

        {/* Tab 4: VGA Hardware DAC Palette Inspector */}
        {activeTab === 'palette' && (
          <PaletteInspector
            palette={quantizedResult ? quantizedResult.palette : []}
            bitDepth={bitDepth}
          />
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        width={currentPreset.width}
        height={currentPreset.height}
        palette={quantizedResult ? quantizedResult.palette : []}
        pixelIndices={quantizedResult ? quantizedResult.pixelIndices : null}
        packedBinaryBytes={quantizedResult ? quantizedResult.packedBinaryBytes : null}
        bitDepth={bitDepth}
        quantizedCanvas={quantizedCanvasRef.current}
      />
    </div>
  );
}
