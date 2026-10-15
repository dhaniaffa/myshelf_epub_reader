import { db } from '@/lib/db';

import type { DictionaryCacheItem, DictionaryMeaning, DictionaryResult } from '@/types';

/**
 * Normalize word: clean punctuation and convert to lowercase
 */
export function cleanWord(raw: string): string {
  return raw
    .trim()
    .replace(/^[^a-zA-Z0-9À-ž]+|[^a-zA-Z0-9À-ž]+$/g, '')
    .toLowerCase();
}

/**
 * Search word definitions and translations using hybrid strategy:
 * 1. Check IndexedDB cache first (offline-first).
 * 2. If missing and online, fetch from Dictionary API & MyMemory Translation.
 * 3. Save result to IndexedDB cache for offline availability in future.
 */
export async function lookupWord(rawText: string): Promise<DictionaryResult> {
  const word = cleanWord(rawText);
  if (!word) {
    throw new Error('Kata yang dipilih tidak valid.');
  }

  // 1. Check Local IndexedDB Cache
  try {
    const cached = await db.dictionary_cache.get(word);
    if (cached) {
      return {
        word: cached.word,
        phonetic: cached.phonetic,
        audioUrl: cached.audioUrl,
        meanings: cached.meanings,
        translation: cached.translation,
        isOffline: true,
      };
    }
  } catch {
    // Ignore cache read errors and proceed to online fetch
  }

  // 2. If offline and missing from cache
  if (!navigator.onLine) {
    throw new Error(
      `"${word}" belum tersimpan di cache offline. Sambungkan ke internet sekali untuk mengunduh definisinya.`
    );
  }

  // 3. Online Fetch: Dictionary API & Translation secara paralel
  let phonetic: string | undefined;
  let audioUrl: string | undefined;
  let meanings: DictionaryMeaning[] = [];
  let translation: string | undefined;

  // A. Panggil Free Dictionary API
  const dictPromise = (async () => {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const entry = data[0];
          phonetic =
            entry.phonetic || entry.phonetics?.find((p: { text?: string }) => p.text)?.text;

          // Cari audio mp3
          const audioObj = entry.phonetics?.find(
            (p: { audio?: string }) => p.audio && p.audio.endsWith('.mp3')
          );
          if (audioObj?.audio) {
            audioUrl = audioObj.audio.startsWith('http')
              ? audioObj.audio
              : `https:${audioObj.audio}`;
          }

          if (Array.isArray(entry.meanings)) {
            meanings = entry.meanings.map(
              (m: {
                partOfSpeech?: string;
                definitions?: { definition?: string; example?: string }[];
              }) => ({
                partOfSpeech: m.partOfSpeech || 'general',
                definitions: (m.definitions || []).slice(0, 3).map((d) => ({
                  definition: d.definition || '',
                  example: d.example,
                })),
              })
            );
          }
        }
      }
    } catch {
      // ignore network dictionary error
    }
  })();

  // B. Panggil MyMemory Translation API (EN -> ID)
  const transPromise = (async () => {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|id`
      );
      if (res.ok) {
        const data = await res.json();
        const translated = data?.responseData?.translatedText;
        if (translated && translated.toLowerCase() !== word) {
          translation = translated;
        }
      }
    } catch {
      // ignore translation error
    }
  })();

  await Promise.all([dictPromise, transPromise]);

  // If neither API returned any results
  if (meanings.length === 0 && !translation) {
    throw new Error(`Tidak ditemukan definisi atau terjemahan untuk kata "${word}".`);
  }

  const result: DictionaryResult = {
    word,
    phonetic,
    audioUrl,
    meanings,
    translation,
    isOffline: false,
  };

  // 4. Save to IndexedDB Cache
  try {
    const itemToCache: DictionaryCacheItem = {
      word,
      lang: 'en',
      phonetic,
      audioUrl,
      meanings,
      translation,
      cachedAt: Date.now(),
    };
    await db.dictionary_cache.put(itemToCache);
  } catch {
    // ignore cache write error
  }

  return result;
}
