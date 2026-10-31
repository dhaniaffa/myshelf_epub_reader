import { describe, expect, it } from 'vitest';

import { getLocalDateString } from './db';
import {
  calculateStreak,
  evaluateBadges,
  formatDuration,
  formatDurationShort,
  getLast7DaysActivity,
  getLast30DaysHeatmap,
} from './statistics';

import type { ReadingLog } from '@/types';

describe('Statistics Calculations (src/lib/statistics.ts)', () => {
  describe('formatDuration', () => {
    it('formats seconds when under a minute', () => {
      expect(formatDuration(45)).toBe('45 dtk');
      expect(formatDuration(0)).toBe('0 dtk');
    });

    it('formats minutes when under an hour', () => {
      expect(formatDuration(180)).toBe('3 mnt');
      expect(formatDuration(3540)).toBe('59 mnt');
    });

    it('formats hours and remaining minutes', () => {
      expect(formatDuration(3600)).toBe('1 jam');
      expect(formatDuration(5400)).toBe('1 jam 30 mnt');
      expect(formatDuration(7200)).toBe('2 jam');
      expect(formatDuration(7500)).toBe('2 jam 5 mnt');
    });
  });

  describe('formatDurationShort', () => {
    it('returns minutes for small durations', () => {
      expect(formatDurationShort(1200)).toBe('20 mnt');
    });

    it('returns decimal hours for 1 hour or more', () => {
      expect(formatDurationShort(3600)).toBe('1.0 jam');
      expect(formatDurationShort(5400)).toBe('1.5 jam');
    });
  });

  describe('calculateStreak', () => {
    it('returns 0 streak for empty logs', () => {
      const result = calculateStreak([]);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.activeToday).toBe(false);
    });

    it('calculates current streak when active today', () => {
      const today = getLocalDateString();
      const yesterday = getLocalDateString(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = getLocalDateString(Date.now() - 48 * 60 * 60 * 1000);

      const logs: ReadingLog[] = [
        {
          id: 'log1',
          bookId: 'b1',
          date: twoDaysAgo,
          durationSeconds: 600,
          createdAt: Date.now() - 48 * 60 * 60 * 1000,
          updatedAt: Date.now() - 48 * 60 * 60 * 1000,
        },
        {
          id: 'log2',
          bookId: 'b1',
          date: yesterday,
          durationSeconds: 1200,
          createdAt: Date.now() - 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 24 * 60 * 60 * 1000,
        },
        {
          id: 'log3',
          bookId: 'b1',
          date: today,
          durationSeconds: 900,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const result = calculateStreak(logs);
      expect(result.activeToday).toBe(true);
      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it('calculates longest streak correctly with past gaps', () => {
      const logs: ReadingLog[] = [
        // 3 consecutive days in past
        {
          id: '1',
          bookId: 'b1',
          date: '2026-01-01',
          durationSeconds: 500,
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: '2',
          bookId: 'b1',
          date: '2026-01-02',
          durationSeconds: 500,
          createdAt: 2,
          updatedAt: 2,
        },
        {
          id: '3',
          bookId: 'b1',
          date: '2026-01-03',
          durationSeconds: 500,
          createdAt: 3,
          updatedAt: 3,
        },
        // gap
        {
          id: '4',
          bookId: 'b1',
          date: '2026-01-10',
          durationSeconds: 500,
          createdAt: 4,
          updatedAt: 4,
        },
        {
          id: '5',
          bookId: 'b1',
          date: '2026-01-11',
          durationSeconds: 500,
          createdAt: 5,
          updatedAt: 5,
        },
      ];

      const result = calculateStreak(logs);
      expect(result.longestStreak).toBe(3);
    });
  });

  describe('getLast7DaysActivity & getLast30DaysHeatmap', () => {
    it('returns exactly 7 day slots ending today', () => {
      const activity = getLast7DaysActivity([]);
      expect(activity).toHaveLength(7);
      expect(activity[6].isToday).toBe(true);
      expect(activity[0].durationSeconds).toBe(0);
    });

    it('returns 35 day slots aligned to 5 weeks ending today', () => {
      const heatmap = getLast30DaysHeatmap([]);
      expect(heatmap).toHaveLength(35);
      expect(heatmap[34].isToday).toBe(true);
    });
  });

  describe('evaluateBadges', () => {
    it('awards starter badge when books are in progress or minutes read', () => {
      const books = [
        {
          id: '1',
          title: 'Buku',
          author: 'A',
          cover: null,
          progress: 0.5,
          lastCfi: null,
          readingTimeSeconds: 300,
          format: 'epub' as const,
          addedAt: Date.now(),
          lastReadAt: Date.now(),
          totalLocations: 100,
          status: 'reading' as const,
        },
      ];
      const badges = evaluateBadges(books, [], [], []);

      expect(badges.length).toBeGreaterThan(0);
      const firstStepBadge = badges.find((b) => b.id === 'first-step');
      expect(firstStepBadge?.unlocked).toBe(true);
    });
  });
});
