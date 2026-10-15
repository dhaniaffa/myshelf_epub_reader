import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '@/store/toast';

export interface UseTTSOptions {
  onPageNext?: () => void;
  onPagePrev?: () => void;
}

export type TTSLanguage = 'id' | 'en';

export interface UseTTSReturn {
  isSupported: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentSentence: string;
  currentIndex: number;
  totalSentences: number;
  rate: number;
  language: TTSLanguage;
  isSpeakingSelection: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  start: (sentences?: string[], isSelection?: boolean) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: (newSentences?: string[]) => void;
  nextSentence: () => void;
  prevSentence: () => void;
  setRate: (rate: number) => void;
  setLanguage: (lang: TTSLanguage) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  speakText: (text: string) => void;
}

/**
 * Splits paragraph text into clean, natural sentences and sub-chunks long phrases (<140 chars).
 */
export function splitIntoSentences(text: string): string[] {
  const rawSentences = text
    .replace(/[\r\n]+/g, ' . ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!;:])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '.');

  const maxLen = 140;
  const result: string[] = [];

  for (const sentence of rawSentences) {
    if (sentence.length <= maxLen) {
      result.push(sentence);
      continue;
    }

    // Split long sentence by clauses or punctuation
    const clauses = sentence.split(/(?<=[,;:—-])\s+/);
    let currentClause = '';

    for (const clause of clauses) {
      if ((currentClause + ' ' + clause).trim().length <= maxLen) {
        currentClause = (currentClause + ' ' + clause).trim();
      } else {
        if (currentClause) {
          result.push(currentClause);
        }
        if (clause.length <= maxLen) {
          currentClause = clause;
        } else {
          // Fallback: split long clause by words
          const words = clause.split(/\s+/);
          let wordChunk = '';
          for (const w of words) {
            if ((wordChunk + ' ' + w).trim().length <= maxLen) {
              wordChunk = (wordChunk + ' ' + w).trim();
            } else {
              if (wordChunk) result.push(wordChunk);
              wordChunk = w;
            }
          }
          currentClause = wordChunk;
        }
      }
    }
    if (currentClause) {
      result.push(currentClause);
    }
  }

  return result;
}

const TTS_LANG_KEY = 'myshelf_tts_language';
const TTS_RATE_KEY = 'myshelf_tts_rate';

function getInitialLanguage(): TTSLanguage {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(TTS_LANG_KEY);
      if (saved === 'id' || saved === 'en') {
        return saved;
      }
    } catch {
      // ignore
    }
  }
  return 'id';
}

function getInitialRate(): number {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(TTS_RATE_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.5 && val <= 3.0) {
          return val;
        }
      }
    } catch {
      // ignore
    }
  }
  return 1.0;
}

/**
 * Builds universal fallback TTS audio stream URL
 */
function getAudioTtsUrl(text: string, lang: TTSLanguage): string {
  const langCode = lang === 'id' ? 'id' : 'en';
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(
    text
  )}`;
}

export function useTTS({ onPageNext }: UseTTSOptions = {}): UseTTSReturn {
  const hasWindow = typeof window !== 'undefined';
  const hasNativeSpeech = hasWindow && 'speechSynthesis' in window;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rate, setRateState] = useState(getInitialRate);
  const [language, setLanguageState] = useState<TTSLanguage>(getInitialLanguage);
  const [isSpeakingSelection, setIsSpeakingSelection] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const sentencesRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const rateRef = useRef(getInitialRate());
  const languageRef = useRef<TTSLanguage>(getInitialLanguage());
  const isSpeakingSelectionRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isPlayingRef = useRef(false);
  const speakCurrentSentenceRef = useRef<(index: number) => void>(() => {});

  // Audio Engine Fallback (for Android WebView & Linux WebKitGTK)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeEngineRef = useRef<'speechSynthesis' | 'audio'>('speechSynthesis');

  // Sync refs with latest state
  useEffect(() => {
    sentencesRef.current = sentences;
    currentIndexRef.current = currentIndex;
    rateRef.current = rate;
    languageRef.current = language;
    voiceRef.current = selectedVoice;
    isPlayingRef.current = isPlaying;
  }, [sentences, currentIndex, rate, language, selectedVoice, isPlaying]);

  // Load available browser / OS speech synthesis voices
  useEffect(() => {
    if (!hasNativeSpeech) return;

    const updateVoices = () => {
      try {
        const vList = window.speechSynthesis.getVoices();
        setVoices(vList);

        setSelectedVoice((prev) => {
          if (prev) return prev;
          if (vList.length === 0) return null;
          const currentLang = languageRef.current;
          const matched =
            currentLang === 'id'
              ? vList.find(
                  (v) =>
                    v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().startsWith('in')
                )
              : vList.find((v) => v.lang.toLowerCase().startsWith('en'));
          return (
            matched || vList.find((v) => v.lang.toLowerCase().startsWith('en')) || vList[0] || null
          );
        });
      } catch (err) {
        console.warn('Failed to load speechSynthesis voices:', err);
      }
    };

    updateVoices();
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (hasNativeSpeech) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [hasNativeSpeech]);

  // Internal function to stop audio playback
  const stopAllPlayback = useCallback(() => {
    if (hasNativeSpeech) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = '';
    }
  }, [hasNativeSpeech]);

  // Internal function to play using HTML5 Audio fallback
  const playWithAudioFallback = useCallback(
    (textToSpeak: string, index: number) => {
      activeEngineRef.current = 'audio';

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }

      const url = getAudioTtsUrl(textToSpeak, languageRef.current);
      const audio = new Audio(url);
      audio.playbackRate = rateRef.current;

      audio.onended = () => {
        if (!isPlayingRef.current) return;
        const nextIdx = index + 1;
        setCurrentIndex(nextIdx);
        currentIndexRef.current = nextIdx;
        speakCurrentSentenceRef.current(nextIdx);
      };

      audio.onerror = () => {
        if (!isPlayingRef.current) return;
        console.warn('Audio TTS fallback playback error');
        toast.info('Gagal memutar audio kalimat');
        setIsPlaying(false);
        setIsPaused(false);
      };

      audioRef.current = audio;
      audio.play().catch((err) => {
        console.warn('Audio play error:', err);
        setIsPlaying(false);
        setIsPaused(false);
      });

      // Preload next audio chunk for seamless playback
      const list = sentencesRef.current;
      if (index + 1 < list.length) {
        const nextUrl = getAudioTtsUrl(list[index + 1], languageRef.current);
        const preloader = new Audio();
        preloader.src = nextUrl;
        preloader.preload = 'auto';
        preloadAudioRef.current = preloader;
      }
    },
    []
  );

  // Internal function to speak sentence at specified index
  const speakCurrentSentence = useCallback(
    (index: number) => {
      stopAllPlayback();

      const list = sentencesRef.current;
      if (index >= list.length) {
        if (isSpeakingSelectionRef.current) {
          setIsPlaying(false);
          setIsPaused(false);
          isSpeakingSelectionRef.current = false;
          setIsSpeakingSelection(false);
        } else if (onPageNext) {
          onPageNext();
        } else {
          setIsPlaying(false);
          setIsPaused(false);
        }
        return;
      }

      const textToSpeak = list[index];
      if (!textToSpeak) return;

      // Check if native speechSynthesis has actual voices loaded
      const currentVoices = hasNativeSpeech ? window.speechSynthesis.getVoices() : [];
      const hasMatchingVoice =
        currentVoices.length > 0 &&
        currentVoices.some((v) =>
          languageRef.current === 'id'
            ? v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().startsWith('in')
            : v.lang.toLowerCase().startsWith('en')
        );

      // On Android WebView or WebKitGTK without daemon, voices list is empty -> use Audio fallback
      if (!hasNativeSpeech || !hasMatchingVoice) {
        playWithAudioFallback(textToSpeak, index);
        return;
      }

      // Try native SpeechSynthesis
      try {
        activeEngineRef.current = 'speechSynthesis';
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = rateRef.current;

        if (voiceRef.current) {
          utterance.voice = voiceRef.current;
          utterance.lang = voiceRef.current.lang;
        } else {
          utterance.lang = languageRef.current === 'id' ? 'id-ID' : 'en-US';
        }

        utterance.onend = () => {
          if (!isPlayingRef.current) return;
          const nextIdx = index + 1;
          setCurrentIndex(nextIdx);
          currentIndexRef.current = nextIdx;
          speakCurrentSentenceRef.current(nextIdx);
        };

        utterance.onerror = (e) => {
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          console.warn('Native speechSynthesis error, falling back to Audio:', e);
          // Seamlessly fallback to Audio engine if native fails
          playWithAudioFallback(textToSpeak, index);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Failed to start native SpeechSynthesis, using Audio fallback:', err);
        playWithAudioFallback(textToSpeak, index);
      }
    },
    [hasNativeSpeech, onPageNext, playWithAudioFallback, stopAllPlayback]
  );

  // Update ref for recursive onend callback
  useEffect(() => {
    speakCurrentSentenceRef.current = speakCurrentSentence;
  }, [speakCurrentSentence]);

  // Start playback
  const start = useCallback(
    (customSentences?: string[], isSelection = false) => {
      stopAllPlayback();

      const list = customSentences || sentencesRef.current;
      if (list.length === 0) return;

      isSpeakingSelectionRef.current = isSelection;
      setIsSpeakingSelection(isSelection);
      sentencesRef.current = list;
      currentIndexRef.current = 0;
      setSentences(list);
      setCurrentIndex(0);
      setIsPlaying(true);
      setIsPaused(false);
      speakCurrentSentence(0);
    },
    [speakCurrentSentence, stopAllPlayback]
  );

  // Pause playback
  const pause = useCallback(() => {
    if (activeEngineRef.current === 'speechSynthesis' && hasNativeSpeech) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // ignore
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPaused(true);
  }, [hasNativeSpeech]);

  // Resume playback
  const resume = useCallback(() => {
    if (activeEngineRef.current === 'speechSynthesis' && hasNativeSpeech) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
    } else if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    setIsPaused(false);
  }, [hasNativeSpeech]);

  // Stop playback
  const stop = useCallback(() => {
    isSpeakingSelectionRef.current = false;
    setIsSpeakingSelection(false);
    stopAllPlayback();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  }, [stopAllPlayback]);

  // Reset player and prepare new sentences
  const reset = useCallback(
    (newSentences: string[] = []) => {
      stopAllPlayback();
      isSpeakingSelectionRef.current = false;
      setIsSpeakingSelection(false);
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setSentences(newSentences);
      sentencesRef.current = newSentences;
    },
    [stopAllPlayback]
  );

  // Next sentence
  const nextSentence = useCallback(() => {
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx < sentencesRef.current.length) {
      setCurrentIndex(nextIdx);
      speakCurrentSentence(nextIdx);
    }
  }, [speakCurrentSentence]);

  // Prev sentence
  const prevSentence = useCallback(() => {
    const prevIdx = Math.max(0, currentIndexRef.current - 1);
    setCurrentIndex(prevIdx);
    speakCurrentSentence(prevIdx);
  }, [speakCurrentSentence]);

  // Set speed/rate
  const setRate = useCallback(
    (newRate: number) => {
      setRateState(newRate);
      rateRef.current = newRate;
      try {
        localStorage.setItem(TTS_RATE_KEY, newRate.toString());
      } catch {
        // ignore
      }
      if (audioRef.current) {
        audioRef.current.playbackRate = newRate;
      }
      if (isPlayingRef.current) {
        speakCurrentSentence(currentIndexRef.current);
      }
    },
    [speakCurrentSentence]
  );

  // Set language
  const setLanguage = useCallback(
    (newLang: TTSLanguage) => {
      setLanguageState(newLang);
      languageRef.current = newLang;
      try {
        localStorage.setItem(TTS_LANG_KEY, newLang);
      } catch {
        // ignore
      }

      if (hasNativeSpeech) {
        const vList = window.speechSynthesis.getVoices();
        const matched =
          newLang === 'id'
            ? vList.find(
                (v) =>
                  v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().startsWith('in')
              )
            : vList.find((v) => v.lang.toLowerCase().startsWith('en'));

        if (matched) {
          setSelectedVoice(matched);
          voiceRef.current = matched;
        } else {
          setSelectedVoice(null);
          voiceRef.current = null;
        }
      }

      if (isPlayingRef.current) {
        speakCurrentSentence(currentIndexRef.current);
      }
    },
    [hasNativeSpeech, speakCurrentSentence]
  );

  // Set voice
  const setVoice = useCallback((v: SpeechSynthesisVoice | null) => {
    setSelectedVoice(v);
    voiceRef.current = v;
  }, []);

  // Speak single text
  const speakText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const splitted = splitIntoSentences(trimmed);
      const sentenceList = splitted.length > 0 ? splitted : [trimmed];
      start(sentenceList, true);
    },
    [start]
  );

  return {
    isSupported: true, // Always supported via hybrid native + audio fallback
    isPlaying,
    isPaused,
    currentSentence: sentences[currentIndex] || '',
    currentIndex,
    totalSentences: sentences.length,
    rate,
    language,
    isSpeakingSelection,
    voices,
    selectedVoice,
    start,
    pause,
    resume,
    stop,
    reset,
    nextSentence,
    prevSentence,
    setRate,
    setLanguage,
    setVoice,
    speakText,
  };
}
