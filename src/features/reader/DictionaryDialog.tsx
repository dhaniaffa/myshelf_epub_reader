import React, { useEffect, useState } from 'react';
import { AlertCircle, BookA, Cloud, Database, Loader2, Volume2 } from 'lucide-react';

import { Button, Dialog } from '@/components/ui';
import { lookupWord } from '@/lib/dictionary';

import type { DictionaryResult } from '@/types';

interface DictionaryDialogProps {
  word: string | null;
  onClose: () => void;
}

const DictionaryModal: React.FC<{ word: string; onClose: () => void }> = ({ word, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DictionaryResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    lookupWord(word)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Gagal memuat definisi');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [word]);

  const handlePlayAudio = () => {
    if (data?.audioUrl) {
      const audio = new Audio(data.audioUrl);
      audio.play().catch(() => {
        speakFallback();
      });
    } else {
      speakFallback();
    }
  };

  const speakFallback = () => {
    if (word && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = 'en-US';
      window.speechSynthesis.speak(utter);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={
        <div className="text-primary flex items-center gap-2 font-semibold">
          <BookA size={20} className="shrink-0" />
          <span>Kamus & Terjemahan</span>
        </div>
      }
      actions={
        <Button variant="filled" size="sm" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-4 py-1 select-text">
        {loading && (
          <div className="text-on-surface-variant flex flex-col items-center justify-center gap-2 py-8">
            <Loader2 size={24} className="text-primary animate-spin" />
            <p className="text-xs">Mencari definisi "{word}"...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-on-surface-variant flex flex-col items-center gap-2 py-6 text-center">
            <AlertCircle size={28} className="text-error/80" />
            <p className="text-on-surface text-xs">{error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Word & Pronunciation Header */}
            <div className="border-outline-variant/30 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-on-surface text-lg font-bold capitalize">{data.word}</h3>
                {data.phonetic && (
                  <span className="text-on-surface-variant bg-surface-container rounded-full px-2 py-0.5 font-mono text-xs">
                    {data.phonetic}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer rounded-full p-1.5 transition-colors"
                  title="Dengarkan Pelafalan"
                  aria-label="Dengarkan Pelafalan"
                >
                  <Volume2 size={16} />
                </button>
              </div>

              {/* Source Status Badge */}
              <div
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  data.isOffline
                    ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                    : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                }`}
              >
                {data.isOffline ? (
                  <>
                    <Database size={11} />
                    <span>Tersimpan Offline</span>
                  </>
                ) : (
                  <>
                    <Cloud size={11} />
                    <span>Daring (Tersimpan)</span>
                  </>
                )}
              </div>
            </div>

            {/* Bagian Terjemahan Bahasa Indonesia */}
            {data.translation && (
              <div className="bg-primary-container/40 border-primary/20 space-y-1 rounded-2xl border p-3">
                <span className="text-primary text-[10px] font-bold tracking-wider uppercase">
                  Terjemahan (Bahasa Indonesia)
                </span>
                <p className="text-on-surface text-sm font-semibold">{data.translation}</p>
              </div>
            )}

            {/* Bagian Definisi Bahasa Inggris */}
            {data.meanings && data.meanings.length > 0 && (
              <div className="space-y-3">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-wider uppercase">
                  Definisi
                </span>
                <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                  {data.meanings.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="bg-surface-container-low border-outline-variant/20 space-y-2 rounded-2xl border p-3"
                    >
                      <span className="text-primary text-xs font-bold tracking-wider uppercase italic">
                        {m.partOfSpeech}
                      </span>
                      <ol className="text-on-surface list-inside list-decimal space-y-1.5 text-xs">
                        {m.definitions.map((d, dIdx) => (
                          <li key={dIdx} className="leading-relaxed">
                            <span className="text-on-surface">{d.definition}</span>
                            {d.example && (
                              <p className="text-on-surface-variant mt-0.5 pl-4 text-[11px] italic">
                                "{d.example}"
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export const DictionaryDialog: React.FC<DictionaryDialogProps> = ({ word, onClose }) => {
  if (!word) return null;
  return <DictionaryModal key={word} word={word} onClose={onClose} />;
};
