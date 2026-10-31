import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { cleanWord, lookupWord } from './dictionary';

import type { DictionaryCacheItem } from '@/types';

describe('Dictionary Utility (src/lib/dictionary.ts)', () => {
  describe('cleanWord', () => {
    it('strips surrounding punctuation, quotes, and brackets', () => {
      expect(cleanWord('“Hello!”')).toBe('hello');
      expect(cleanWord('(world)')).toBe('world');
      expect(cleanWord('—reading—')).toBe('reading');
      expect(cleanWord('"fantastic,"')).toBe('fantastic');
    });

    it('converts uppercase characters to lowercase', () => {
      expect(cleanWord('LITERATURE')).toBe('literature');
      expect(cleanWord('MyShelf')).toBe('myshelf');
    });

    it('preserves internal hyphens and accented characters', () => {
      expect(cleanWord('well-known')).toBe('well-known');
      expect(cleanWord('café')).toBe('café');
      expect(cleanWord('naïve')).toBe('naïve');
    });

    it('returns empty string for purely symbol or whitespace input', () => {
      expect(cleanWord('...')).toBe('');
      expect(cleanWord('   ')).toBe('');
      expect(cleanWord('—!?,.;')).toBe('');
    });
  });

  describe('lookupWord', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('throws error when word is empty or invalid', async () => {
      await expect(lookupWord('   ')).rejects.toThrow('Kata yang dipilih tidak valid.');
      await expect(lookupWord('?!@#')).rejects.toThrow('Kata yang dipilih tidak valid.');
    });

    it('returns cached dictionary result if available in offline cache', async () => {
      const mockCachedItem: DictionaryCacheItem = {
        word: 'knowledge',
        lang: 'en',
        phonetic: '/ˈnɑː.lɪdʒ/',
        audioUrl: 'https://audio.example.com/knowledge.mp3',
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [{ definition: 'Information and skills acquired through experience.' }],
          },
        ],
        translation: 'pengetahuan',
        cachedAt: Date.now(),
      };

      vi.spyOn(db.dictionary_cache, 'get').mockResolvedValue(mockCachedItem);

      const result = await lookupWord('“Knowledge”');

      expect(result.word).toBe('knowledge');
      expect(result.phonetic).toBe('/ˈnɑː.lɪdʒ/');
      expect(result.translation).toBe('pengetahuan');
      expect(result.isOffline).toBe(true);
    });

    it('throws specific offline error if not in cache and navigator is offline', async () => {
      vi.spyOn(db.dictionary_cache, 'get').mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      await expect(lookupWord('philosophy')).rejects.toThrow(/belum tersimpan di cache offline/i);
    });

    it('fetches online definition and translation, then saves to cache', async () => {
      vi.spyOn(db.dictionary_cache, 'get').mockResolvedValue(undefined);
      const putSpy = vi.spyOn(db.dictionary_cache, 'put').mockResolvedValue('read');

      const mockDictionaryApiResponse = [
        {
          word: 'read',
          phonetic: '/riːd/',
          phonetics: [{ audio: 'https://api.example.com/audio/read.mp3' }],
          meanings: [
            {
              partOfSpeech: 'verb',
              definitions: [{ definition: 'Look at and comprehend the meaning of written words.' }],
            },
          ],
        },
      ];

      const mockTranslationResponse = {
        responseData: {
          translatedText: 'membaca',
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('dictionaryapi.dev')) {
          return {
            ok: true,
            json: async () => mockDictionaryApiResponse,
          } as Response;
        }
        if (url.includes('mymemory.translated.net')) {
          return {
            ok: true,
            json: async () => mockTranslationResponse,
          } as Response;
        }
        return { ok: false } as Response;
      });

      const result = await lookupWord('Read');

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.word).toBe('read');
      expect(result.phonetic).toBe('/riːd/');
      expect(result.translation).toBe('membaca');
      expect(result.isOffline).toBe(false);
      expect(putSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'read',
          translation: 'membaca',
        })
      );
    });

    it('throws error when neither dictionary nor translation returns results', async () => {
      vi.spyOn(db.dictionary_cache, 'get').mockResolvedValue(undefined);
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
      } as Response);

      await expect(lookupWord('xyznonexistentword123')).rejects.toThrow(
        /tidak ditemukan definisi atau terjemahan/i
      );
    });
  });
});
