import { useCallback, useEffect, useRef, useState } from 'react';

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
 * Splits paragraph text into distinct sentences
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!;:])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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

export function useTTS({ onPageNext }: UseTTSOptions = {}): UseTTSReturn {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

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

  // Sync refs with latest state inside effect (not during render)
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
    if (!isSupported) return;

    const updateVoices = () => {
      const vList = window.speechSynthesis.getVoices();
      setVoices(vList);

      // Find default voice matching active language
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
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  // Internal function to speak sentence at specified index
  const speakCurrentSentence = useCallback(
    (index: number) => {
      if (!isSupported) return;
      window.speechSynthesis.cancel();

      const list = sentencesRef.current;
      if (index >= list.length) {
        if (isSpeakingSelectionRef.current) {
          // Selection finished speaking; do not flip page
          setIsPlaying(false);
          setIsPaused(false);
          isSpeakingSelectionRef.current = false;
          setIsSpeakingSelection(false);
        } else if (onPageNext) {
          // Finished sentence batch on this page
          onPageNext();
        } else {
          setIsPlaying(false);
          setIsPaused(false);
        }
        return;
      }

      const textToSpeak = list[index];
      if (!textToSpeak) return;

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
        // If canceled intentionally, ignore
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        setIsPlaying(false);
        setIsPaused(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, onPageNext]
  );

  // Update ref for recursive onend callback
  useEffect(() => {
    speakCurrentSentenceRef.current = speakCurrentSentence;
  }, [speakCurrentSentence]);

  // Mulai memutar
  const start = useCallback(
    (customSentences?: string[], isSelection = false) => {
      if (!isSupported) return;
      window.speechSynthesis.cancel();

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
    [isSupported, speakCurrentSentence]
  );

  // Jeda
  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  // Lanjutkan
  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  // Hentikan
  const stop = useCallback(() => {
    if (!isSupported) return;
    isSpeakingSelectionRef.current = false;
    setIsSpeakingSelection(false);
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  }, [isSupported]);

  // Reset player and prepare new sentence list (e.g. when selection is closed)
  const reset = useCallback(
    (newSentences: string[] = []) => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
      isSpeakingSelectionRef.current = false;
      setIsSpeakingSelection(false);
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setSentences(newSentences);
      sentencesRef.current = newSentences;
    },
    [isSupported]
  );

  // Jump to next sentence
  const nextSentence = useCallback(() => {
    if (!isSupported) return;
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx < sentencesRef.current.length) {
      setCurrentIndex(nextIdx);
      speakCurrentSentence(nextIdx);
    }
  }, [isSupported, speakCurrentSentence]);

  // Jump to previous sentence
  const prevSentence = useCallback(() => {
    if (!isSupported) return;
    const prevIdx = Math.max(0, currentIndexRef.current - 1);
    setCurrentIndex(prevIdx);
    speakCurrentSentence(prevIdx);
  }, [isSupported, speakCurrentSentence]);

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
      if (isPlayingRef.current && !window.speechSynthesis.paused) {
        speakCurrentSentence(currentIndexRef.current);
      }
    },
    [speakCurrentSentence]
  );

  // Ganti bahasa (Indonesia / Inggris)
  const setLanguage = useCallback(
    (newLang: TTSLanguage) => {
      setLanguageState(newLang);
      languageRef.current = newLang;
      try {
        localStorage.setItem(TTS_LANG_KEY, newLang);
      } catch {
        // ignore
      }

      // Find matching voice for new language
      const vList = window.speechSynthesis.getVoices();
      const matched =
        newLang === 'id'
          ? vList.find(
              (v) => v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().startsWith('in')
            )
          : vList.find((v) => v.lang.toLowerCase().startsWith('en'));

      if (matched) {
        setSelectedVoice(matched);
        voiceRef.current = matched;
      } else {
        setSelectedVoice(null);
        voiceRef.current = null;
      }

      // If currently playing, refresh active sentence with new voice/language
      if (isPlayingRef.current && !window.speechSynthesis.paused) {
        speakCurrentSentence(currentIndexRef.current);
      }
    },
    [speakCurrentSentence]
  );

  // Set voice
  const setVoice = useCallback((v: SpeechSynthesisVoice | null) => {
    setSelectedVoice(v);
    voiceRef.current = v;
  }, []);

  // Speak single text snippet (e.g. from SelectionBar)
  const speakText = useCallback(
    (text: string) => {
      if (!isSupported) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const splitted = splitIntoSentences(trimmed);
      const sentenceList = splitted.length > 0 ? splitted : [trimmed];
      start(sentenceList, true);
    },
    [isSupported, start]
  );

  return {
    isSupported,
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
