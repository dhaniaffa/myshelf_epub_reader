import { APP_NAME } from '@/config';
import { getLocalDateString } from '@/lib/db';

import type { AchievementBadge, Annotation, Book, Bookmark, ReadingLog } from '@/types';

/**
 * Formats seconds into human-readable string (e.g. "1 hr 20 min" or "45 min")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} dtk`;
  }
  const mins = Math.floor(seconds / 60);
  if (mins < 60) {
    return `${mins} mnt`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) {
    return `${hours} jam`;
  }
  return `${hours} jam ${remainingMins} mnt`;
}

/**
 * Formats seconds to minutes or decimal hours for short summaries
 */
export function formatDurationShort(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 1) {
    return `${hours.toFixed(1)} jam`;
  }
  const mins = Math.round(seconds / 60);
  return `${mins} mnt`;
}

/**
 * Computes consecutive active reading streaks (days with >0 seconds)
 * Returns currentStreak and longestStreak
 */
export function calculateStreak(logs: ReadingLog[]): {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
} {
  // Collect unique dates with reading duration > 0
  const activeDateSet = new Set<string>();
  for (const log of logs) {
    if (log.durationSeconds > 0) {
      activeDateSet.add(log.date);
    }
  }

  const todayStr = getLocalDateString();
  const activeToday = activeDateSet.has(todayStr);

  // Check current streak (from today, or yesterday if today is still in progress)
  let currentStreak = 0;
  const cursorDate = new Date();

  if (!activeToday) {
    // Check if active yesterday
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  while (true) {
    const dStr = getLocalDateString(cursorDate.getTime());
    if (activeDateSet.has(dStr)) {
      currentStreak++;
      cursorDate.setDate(cursorDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak by sorting dates
  const sortedDates = Array.from(activeDateSet).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);

    if (prevDate) {
      const diffDays = Math.round(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = currentDate;
  }

  return { currentStreak, longestStreak, activeToday };
}

export interface DayActivity {
  date: string;
  dayLabel: string; // misal "Sen", "Sel", "12 Okt"
  fullDateLabel: string;
  durationSeconds: number;
  minutes: number;
  isToday: boolean;
}

/**
 * Retrieves reading data for the last 7 days (6 days ago through today)
 */
export function getLast7DaysActivity(logs: ReadingLog[]): DayActivity[] {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const todayStr = getLocalDateString();

  // Akumulasikan durasi per tanggal
  const durationMap = new Map<string, number>();
  for (const log of logs) {
    const cur = durationMap.get(log.date) || 0;
    durationMap.set(log.date, cur + log.durationSeconds);
  }

  const result: DayActivity[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d.getTime());
    const duration = durationMap.get(dateStr) || 0;
    const dayName = dayNames[d.getDay()];

    result.push({
      date: dateStr,
      dayLabel: i === 0 ? 'Hari ini' : dayName,
      fullDateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      durationSeconds: duration,
      minutes: Math.round(duration / 60),
      isToday: dateStr === todayStr,
    });
  }

  return result;
}

/**
 * Retrieves reading data for the last 30/35 days for Calendar Heatmap/Grid
 */
export function getLast30DaysHeatmap(logs: ReadingLog[]): DayActivity[] {
  const todayStr = getLocalDateString();
  const durationMap = new Map<string, number>();
  for (const log of logs) {
    const cur = durationMap.get(log.date) || 0;
    durationMap.set(log.date, cur + log.durationSeconds);
  }

  const result: DayActivity[] = [];
  const totalDays = 35; // 5 weeks aligned for tidy grid
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d.getTime());
    const duration = durationMap.get(dateStr) || 0;

    result.push({
      date: dateStr,
      dayLabel: String(d.getDate()),
      fullDateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      durationSeconds: duration,
      minutes: Math.round(duration / 60),
      isToday: dateStr === todayStr,
    });
  }

  return result;
}

/**
 * Dynamically evaluates Achievement Badges from reader data
 */
export function evaluateBadges(
  books: Book[],
  logs: ReadingLog[],
  bookmarks: Bookmark[],
  annotations: Annotation[]
): AchievementBadge[] {
  const totalDurationSeconds = logs.reduce((acc, l) => acc + l.durationSeconds, 0);
  const totalMinutes = Math.floor(totalDurationSeconds / 60);
  const completedBooks = books.filter((b) => b.status === 'completed').length;
  const inProgressBooks = books.filter((b) => (b.progress || 0) > 0).length;
  const totalNotes = annotations.length;
  const totalBookmarks = bookmarks.length;
  const { currentStreak, longestStreak } = calculateStreak(logs);
  const maxStreak = Math.max(currentStreak, longestStreak);

  // Check if user read late at night (23:00 - 04:00) or early morning (05:00 - 08:00)
  const nightReaderUnlocked = logs.some((l) => {
    if (!l.createdAt) return false;
    const hour = new Date(l.createdAt).getHours();
    return hour >= 23 || hour <= 4;
  });

  const earlyBirdUnlocked = logs.some((l) => {
    if (!l.createdAt) return false;
    const hour = new Date(l.createdAt).getHours();
    return hour >= 5 && hour <= 8;
  });

  const allBadges: AchievementBadge[] = [
    {
      id: 'first-step',
      title: 'Langkah Pertama',
      description: `Membaca buku pertama Anda di ${APP_NAME}.`,
      icon: '🌱',
      category: 'starter',
      unlocked: inProgressBooks >= 1 || totalMinutes >= 1,
      progress: {
        current: Math.min(inProgressBooks, 1),
        target: 1,
        unit: 'buku',
      },
    },
    {
      id: 'bookworm-1',
      title: 'Kutu Buku Pemula',
      description: 'Selesaikan 1 buku bacaan hingga tuntas.',
      icon: '📖',
      category: 'books',
      unlocked: completedBooks >= 1,
      progress: {
        current: Math.min(completedBooks, 1),
        target: 1,
        unit: 'buku',
      },
    },
    {
      id: 'bookworm-5',
      title: 'Pembaca Setia',
      description: 'Selesaikan 5 buku bacaan dengan sukses.',
      icon: '📚',
      category: 'books',
      unlocked: completedBooks >= 5,
      progress: {
        current: Math.min(completedBooks, 5),
        target: 5,
        unit: 'buku',
      },
    },
    {
      id: 'streak-3',
      title: 'Konsisten 3 Hari',
      description: 'Pertahankan kebiasaan membaca 3 hari berturut-turut.',
      icon: '🔥',
      category: 'streak',
      unlocked: maxStreak >= 3,
      progress: {
        current: Math.min(maxStreak, 3),
        target: 3,
        unit: 'hari',
      },
    },
    {
      id: 'streak-7',
      title: 'Minggu Emas',
      description: 'Membaca setiap hari selama 7 hari berturut-turut.',
      icon: '⚡',
      category: 'streak',
      unlocked: maxStreak >= 7,
      progress: {
        current: Math.min(maxStreak, 7),
        target: 7,
        unit: 'hari',
      },
    },
    {
      id: 'time-10h',
      title: '10 Jam Menyelam',
      description: 'Capai total waktu membaca 10 jam (600 menit).',
      icon: '⏳',
      category: 'time',
      unlocked: totalMinutes >= 600,
      progress: {
        current: Math.min(totalMinutes, 600),
        target: 600,
        unit: 'mnt',
      },
    },
    {
      id: 'note-taker',
      title: 'Pencatat Cermat',
      description: 'Buat 5 catatan atau sorotan penting di buku.',
      icon: '✍️',
      category: 'notes',
      unlocked: totalNotes >= 5,
      progress: {
        current: Math.min(totalNotes, 5),
        target: 5,
        unit: 'catatan',
      },
    },
    {
      id: 'bookmark-collector',
      title: 'Penanda Jejak',
      description: 'Simpan minimal 3 bookmark halaman favorit.',
      icon: '🔖',
      category: 'notes',
      unlocked: totalBookmarks >= 3,
      progress: {
        current: Math.min(totalBookmarks, 3),
        target: 3,
        unit: 'bookmark',
      },
    },
    {
      id: 'night-owl',
      title: 'Kembara Malam',
      description: 'Membaca di keheningan larut malam (23:00 - 04:00).',
      icon: '🌙',
      category: 'habits',
      unlocked: nightReaderUnlocked,
    },
    {
      id: 'early-bird',
      title: 'Fajar Inspiratif',
      description: 'Membuka buku di pagi hari segar (05:00 - 08:00).',
      icon: '☀️',
      category: 'habits',
      unlocked: earlyBirdUnlocked,
    },
  ];

  return allBadges;
}
