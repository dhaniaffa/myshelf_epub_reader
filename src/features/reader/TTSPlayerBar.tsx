import React from 'react';
import { Headphones, Pause, Play, SkipBack, SkipForward, Square, X } from 'lucide-react';

import type { UseTTSReturn } from '@/features/reader/useTTS';

interface TTSPlayerBarProps {
  tts: UseTTSReturn;
  onPlay?: () => void;
  onClose: () => void;
}

const RATES = [0.75, 1.0, 1.25, 1.5, 2.0];

export const TTSPlayerBar: React.FC<TTSPlayerBarProps> = ({ tts, onPlay, onClose }) => {
  return (
    <div className="tts-player-bar-container animate-slide-up fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[94vw] sm:max-w-xl">
      <div className="bg-surface-container-highest/95 text-on-surface border-outline-variant/40 flex flex-col gap-2 rounded-3xl border px-4 py-3 shadow-2xl backdrop-blur-md">
        {/* Header Bar: Status & Sentence Snippet */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="text-primary flex items-center gap-2 font-semibold">
            <Headphones
              size={15}
              className={tts.isPlaying && !tts.isPaused ? 'animate-pulse' : ''}
            />
            <span>{tts.isSpeakingSelection ? 'Audio Seleksi' : 'Audio Buku (TTS)'}</span>
            {tts.totalSentences > 0 && (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-mono text-[10px]">
                {tts.currentIndex + 1} / {tts.totalSentences}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Switcher: 🇮🇩 ID / 🇬🇧 EN */}
            <div className="bg-surface-container border-outline-variant/30 flex items-center rounded-full border p-0.5">
              <button
                type="button"
                onClick={() => tts.setLanguage('id')}
                className={`flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  tts.language === 'id'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Bahasa Indonesia"
              >
                <span>🇮🇩</span>
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => tts.setLanguage('en')}
                className={`flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  tts.language === 'en'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="English"
              >
                <span>🇬🇧</span>
                <span>EN</span>
              </button>
            </div>

            {/* Speed / Rate Switcher */}
            <div className="bg-surface-container border-outline-variant/30 flex items-center rounded-full border p-0.5">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => tts.setRate(r)}
                  className={`cursor-pointer rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors sm:px-2 ${
                    tts.rate === r
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>

            {/* Close Player Button */}
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

        {/* Currently Read Sentence Text */}
        {tts.currentSentence && (
          <p className="text-on-surface/90 bg-surface-container-low/60 border-outline-variant/20 line-clamp-2 rounded-xl border p-1.5 px-1 text-xs italic">
            "{tts.currentSentence}"
          </p>
        )}

        {/* Controls: Skip Prev, Play/Pause, Skip Next, Stop */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            type="button"
            onClick={tts.prevSentence}
            disabled={tts.currentIndex === 0}
            className="hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Kalimat Sebelumnya"
          >
            <SkipBack size={18} />
          </button>

          {tts.isPlaying && !tts.isPaused ? (
            <button
              type="button"
              onClick={tts.pause}
              className="bg-primary text-on-primary flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
              title="Jeda"
            >
              <Pause size={20} />
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
              className="bg-primary text-on-primary flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
              title="Putar"
            >
              <Play size={20} className="ml-0.5" />
            </button>
          )}

          <button
            type="button"
            onClick={tts.nextSentence}
            disabled={tts.currentIndex >= tts.totalSentences - 1}
            className="hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Kalimat Berikutnya"
          >
            <SkipForward size={18} />
          </button>

          <button
            type="button"
            onClick={tts.stop}
            className="hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer rounded-full p-2 transition-colors"
            title="Berhenti"
          >
            <Square size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};
