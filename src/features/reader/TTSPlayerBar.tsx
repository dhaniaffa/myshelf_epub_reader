import React from 'react';
import { Headphones, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';

import type { UseTTSReturn } from '@/features/reader/useTTS';

interface TTSPlayerBarProps {
  tts: UseTTSReturn;
  onPlay?: () => void;
  onClose: () => void;
}

const RATES = [0.75, 1.0, 1.25, 1.5, 2.0];

export const TTSPlayerBar: React.FC<TTSPlayerBarProps> = ({ tts, onPlay, onClose }) => {
  const handleCycleRate = () => {
    const currentIdx = RATES.indexOf(tts.rate);
    const nextIdx = currentIdx === -1 || currentIdx === RATES.length - 1 ? 0 : currentIdx + 1;
    tts.setRate(RATES[nextIdx]);
  };

  const isReading = tts.isPlaying && !tts.isPaused;

  return (
    <aside
      aria-label="Pemutar Audio Text-to-Speech"
      className="tts-player-bar-container fixed inset-x-2 bottom-3 z-40 mx-auto max-w-xl transition-all duration-300 sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:w-[540px] sm:-translate-x-1/2"
    >
      <div className="bg-surface-container-highest/95 text-on-surface border-outline-variant/30 flex flex-col gap-1.5 rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur-xl transition-all sm:rounded-full sm:px-4 sm:py-2">
        {/* Main Row: Status, Sentence Preview, Controls & Quick Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Indicator & Progress */}
          <div className="flex shrink-0 items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isReading
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container text-primary'
              }`}
            >
              <Headphones size={15} className={isReading ? 'animate-pulse' : ''} />
            </div>

            {tts.totalSentences > 0 && (
              <span className="bg-surface-container text-on-surface-variant rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium">
                {tts.currentIndex + 1}/{tts.totalSentences}
              </span>
            )}
          </div>

          {/* Center: Truncated Sentence Preview */}
          <div className="flex min-w-0 flex-1 items-center px-1">
            <p className="text-on-surface/85 truncate font-serif text-xs italic">
              {tts.currentSentence ? `"${tts.currentSentence}"` : 'Memutar audio...'}
            </p>
          </div>

          {/* Center-Right: Playback Controls */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={tts.prevSentence}
              disabled={tts.currentIndex === 0}
              className="hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              title="Kalimat Sebelumnya"
              aria-label="Kalimat Sebelumnya"
            >
              <SkipBack size={16} />
            </button>

            {isReading ? (
              <button
                type="button"
                onClick={tts.pause}
                className="bg-primary text-on-primary flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
                title="Jeda"
                aria-label="Jeda"
              >
                <Pause size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onPlay) {
                    onPlay();
                  } else if (tts.isPaused) {
                    tts.resume();
                  } else {
                    tts.start();
                  }
                }}
                className="bg-primary text-on-primary flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
                title="Putar"
                aria-label="Putar"
              >
                <Play size={16} className="ml-0.5" />
              </button>
            )}

            <button
              type="button"
              onClick={tts.nextSentence}
              disabled={tts.currentIndex >= tts.totalSentences - 1}
              className="hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              title="Kalimat Berikutnya"
              aria-label="Kalimat Berikutnya"
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* Divider */}
          <div className="bg-outline-variant/30 h-4 w-px shrink-0" />

          {/* Right: Quick Settings (Language, Rate Cycle, Close) */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Language Toggle: ID / EN */}
            <button
              type="button"
              onClick={() => tts.setLanguage(tts.language === 'id' ? 'en' : 'id')}
              className="bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold uppercase transition-colors"
              title={`Ganti Bahasa (Saat ini: ${tts.language.toUpperCase()})`}
              aria-label="Ganti Bahasa"
            >
              {tts.language === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
            </button>

            {/* Speed Cycle Button: 1.0x -> 1.25x -> ... */}
            <button
              type="button"
              onClick={handleCycleRate}
              className="bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface min-w-[34px] cursor-pointer rounded-md px-1.5 py-1 text-center font-mono text-[10px] font-bold transition-colors"
              title="Kecepatan Suara (Klik untuk Mengubah)"
              aria-label="Kecepatan Suara"
            >
              {tts.rate}x
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                tts.stop();
                onClose();
              }}
              className="hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-1.5 transition-colors"
              title="Tutup Pemutar Audio"
              aria-label="Tutup"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
