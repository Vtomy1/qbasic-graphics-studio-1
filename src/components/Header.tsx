import React from 'react';
import { Terminal, Download, Sparkles, Monitor } from 'lucide-react';

interface HeaderProps {
  activeTab: 'converter' | 'gif-header' | 'code-samples' | 'palette';
  setActiveTab: (tab: 'converter' | 'gif-header' | 'code-samples' | 'palette') => void;
  onOpenExportModal: () => void;
  onLoadRandomSample: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenExportModal,
  onLoadRandomSample
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Terminal className="w-4 h-4" />
        </div>
        <a href="/" className="text-base font-bold tracking-tight text-white flex items-center gap-2">
          <span>QBasic Graphics Studio</span>
          <span className="text-xs text-amber-400 font-mono font-normal">v1.0</span>
        </a>
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('converter')}
          className={`transition-colors text-xs uppercase tracking-wider font-mono ${
            activeTab === 'converter' ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Image Converter
        </button>
        <button
          onClick={() => setActiveTab('gif-header')}
          className={`transition-colors text-xs uppercase tracking-wider font-mono ${
            activeTab === 'gif-header' ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          GIF Header Inspector
        </button>
        <button
          onClick={() => setActiveTab('code-samples')}
          className={`transition-colors text-xs uppercase tracking-wider font-mono ${
            activeTab === 'code-samples' ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          QBasic Saver & Loader
        </button>
        <button
          onClick={() => setActiveTab('palette')}
          className={`transition-colors text-xs uppercase tracking-wider font-mono ${
            activeTab === 'palette' ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Palette Cycling & DAC
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onLoadRandomSample}
          className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap"
          title="Load a retro sample test pattern"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Sample Scene</span>
        </button>
        <button
          onClick={onOpenExportModal}
          className="px-3.5 py-1.5 text-xs font-mono font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-400/20 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Code & Files</span>
        </button>
      </div>
    </header>
  );
};
