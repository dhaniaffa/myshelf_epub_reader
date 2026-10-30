import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Clock,
  Flame,
  Gauge,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

import { IconButton } from '@/components/ui';
import { db, getLocalDateString } from '@/lib/db';
import { navigate } from '@/lib/route';
import {
  calculateStreak,
  evaluateBadges,
  formatDuration,
  getLast7DaysActivity,
  getLast30DaysHeatmap,
} from '@/lib/statistics';
import { useSettingsStore } from '@/store/settings';

export const StatsPage: React.FC = () => {
  const { dailyGoalMinutes, readingSpeedWpm, setDailyGoalMinutes, setReadingSpeedWpm } =
    useSettingsStore();

  const rawBooks = useLiveQuery(() => db.books.toArray(), []);
  const rawLogs = useLiveQuery(() => db.reading_logs.toArray(), []);
  const rawBookmarks = useLiveQuery(() => db.bookmarks.toArray(), []);
  const rawAnnotations = useLiveQuery(() => db.annotations.toArray(), []);

  const books = useMemo(() => rawBooks || [], [rawBooks]);
  const logs = useMemo(() => rawLogs || [], [rawLogs]);
  const bookmarks = useMemo(() => rawBookmarks || [], [rawBookmarks]);
  const annotations = useMemo(() => rawAnnotations || [], [rawAnnotations]);

  // Streak & Today's Reading Time
  const todayStr = getLocalDateString();
  const { currentStreak, longestStreak } = useMemo(() => calculateStreak(logs), [logs]);

  const todayMinutes = useMemo(() => {
    const todayLogs = logs.filter((l) => l.date === todayStr);
    const secs = todayLogs.reduce((acc, l) => acc + l.durationSeconds, 0);
    return Math.round(secs / 60);
  }, [logs, todayStr]);

  const totalReadingSeconds = useMemo(() => {
    return logs.reduce((acc, l) => acc + l.durationSeconds, 0);
  }, [logs]);

  const completedBooksCount = useMemo(() => {
    return books.filter((b) => b.status === 'completed').length;
  }, [books]);

  // Data 7 hari terakhir
  const last7Days = useMemo(() => getLast7DaysActivity(logs), [logs]);
  const goalMinutes = dailyGoalMinutes || 20;
  const max7DaysMinutes = useMemo(() => {
    return Math.max(1, ...last7Days.map((d) => d.minutes), goalMinutes);
  }, [last7Days, goalMinutes]);

  // Data Heatmap 30 hari
  const heatmapDays = useMemo(() => getLast30DaysHeatmap(logs), [logs]);

  // Evaluasi Badges Gamifikasi
  const badges = useMemo(
    () => evaluateBadges(books, logs, bookmarks, annotations),
    [books, logs, bookmarks, annotations]
  );
  const unlockedBadgesCount = useMemo(() => badges.filter((b) => b.unlocked).length, [badges]);

  // Goal Progress (Ring SVG)
  const goalProgressPercent = Math.min(
    100,
    Math.round((todayMinutes / (dailyGoalMinutes || 20)) * 100)
  );
  const strokeDashoffset = 283 - (283 * goalProgressPercent) / 100;

  // Daily Target Minutes Presets
  const goalPresets = [10, 15, 20, 30, 45, 60];

  return (
    <div className="bg-surface text-on-surface flex min-h-screen flex-col">
      {/* 1. TOP APP BAR */}
      <header className="bg-surface/90 border-outline-variant/20 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Back to MyShelf button on mobile (< 1024px) */}
          <div className="lg:hidden">
            <IconButton
              size="sm"
              onClick={() => navigate('')}
              aria-label="Kembali ke MyShelf"
              title="Kembali ke MyShelf"
            >
              <ArrowLeft size={18} />
            </IconButton>
          </div>
          <div className="min-w-0">
            <h1 className="text-on-surface truncate text-base font-bold tracking-tight sm:text-lg">
              Statistik Membaca
            </h1>
            <p className="text-on-surface-variant hidden text-xs sm:block">
              Pantau konsistensi, kebiasaan, dan pencapaian literatur Anda
            </p>
          </div>
        </div>

        {/* Action / Badge in Top Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Flame size={14} className={currentStreak > 0 ? 'fill-amber-500' : ''} />
            <span>{currentStreak} Hari Streak</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-4 sm:p-8">
        {/* 4 Kartu Metrik Utama */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Streak */}
          <div className="bg-surface-container border-outline-variant/30 flex flex-col justify-between rounded-3xl border p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant text-xs font-semibold">Streak Membaca</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Flame size={18} className={currentStreak > 0 ? 'fill-amber-500' : ''} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-on-surface flex items-baseline gap-1.5 text-2xl font-black sm:text-3xl">
                <span>{currentStreak}</span>
                <span className="text-on-surface-variant text-xs font-medium">Hari</span>
              </div>
              <p className="text-on-surface-variant mt-0.5 text-[11px]">
                Rekor terpanjang:{' '}
                <span className="text-on-surface font-semibold">{longestStreak} hari</span>
              </p>
            </div>
          </div>

          {/* Total Time */}
          <div className="bg-surface-container border-outline-variant/30 flex flex-col justify-between rounded-3xl border p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant text-xs font-semibold">Total Waktu</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Clock size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-on-surface text-2xl font-black sm:text-3xl">
                {formatDuration(totalReadingSeconds)}
              </div>
              <p className="text-on-surface-variant mt-0.5 text-[11px]">
                Tercatat dari seluruh sesi membaca
              </p>
            </div>
          </div>

          {/* Completed Books */}
          <div className="bg-surface-container border-outline-variant/30 flex flex-col justify-between rounded-3xl border p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant text-xs font-semibold">Buku Selesai</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <BookOpen size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-on-surface flex items-baseline gap-1.5 text-2xl font-black sm:text-3xl">
                <span>{completedBooksCount}</span>
                <span className="text-on-surface-variant text-xs font-medium">
                  / {books.length} buku
                </span>
              </div>
              <p className="text-on-surface-variant mt-0.5 text-[11px]">
                Koleksi buku tersimpan di MyShelf
              </p>
            </div>
          </div>

          {/* Lencana Terbuka */}
          <div className="bg-surface-container border-outline-variant/30 flex flex-col justify-between rounded-3xl border p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant text-xs font-semibold">Lencana Diraih</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                <Award size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-on-surface flex items-baseline gap-1.5 text-2xl font-black sm:text-3xl">
                <span>{unlockedBadgesCount}</span>
                <span className="text-on-surface-variant text-xs font-medium">
                  / {badges.length} lencana
                </span>
              </div>
              <p className="text-on-surface-variant mt-0.5 text-[11px]">
                Pencapaian gamifikasi aktif
              </p>
            </div>
          </div>
        </div>

        {/* Target Membaca Harian & Circular Goal Ring */}
        <div className="bg-surface-container border-outline-variant/30 flex flex-col items-center gap-8 rounded-3xl border p-6 shadow-xs sm:p-8 md:flex-row">
          {/* Circular Progress Ring */}
          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                className="stroke-surface-container-highest"
                strokeWidth="9"
              />
              {/* Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                className="stroke-primary transition-all duration-700 ease-out"
                strokeWidth="9"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-on-surface text-2xl leading-none font-black">
                {goalProgressPercent}%
              </span>
              <span className="text-on-surface-variant mt-1 text-[10px] font-medium">
                {todayMinutes} / {dailyGoalMinutes} mnt
              </span>
            </div>
          </div>

          {/* Kontrol Target */}
          <div className="w-full flex-1 space-y-4 text-center md:text-left">
            <div>
              <div className="text-primary flex items-center justify-center gap-2 text-sm font-bold md:justify-start">
                <Target size={18} />
                <span>Target Membaca Harian</span>
              </div>
              <h3 className="text-on-surface mt-1 text-lg font-bold sm:text-xl">
                {goalProgressPercent >= 100
                  ? 'Luar biasa! Target membaca hari ini telah tercapai 🎉'
                  : `Tersisa ${Math.max(0, goalMinutes - todayMinutes)} menit lagi untuk menyelesaikan target hari ini`}
              </h3>
              <p className="text-on-surface-variant mt-1 text-xs">
                Membaca sedikit setiap hari melatih fokus dan membangun kebiasaan literasi
                berkelanjutan.
              </p>
            </div>

            {/* Quick Preset Selector */}
            <div>
              <span className="text-on-surface-variant mb-2 block text-xs font-semibold">
                Atur Target Harian (Menit):
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {goalPresets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDailyGoalMinutes(mins)}
                    className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      goalMinutes === mins
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    }`}
                  >
                    {mins} mnt
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visualisasi Grafik: 7 Hari & Heatmap 30 Hari */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 7-Day SVG Bar Chart */}
          <div className="bg-surface-container border-outline-variant/30 flex flex-col justify-between rounded-3xl border p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-primary" />
                <h3 className="text-on-surface text-base font-bold">Aktivitas 7 Hari Terakhir</h3>
              </div>
              <span className="text-on-surface-variant text-xs font-medium">Menit / Hari</span>
            </div>

            {/* SVG Bar Chart */}
            <div className="flex h-48 w-full items-end justify-between gap-2 px-2 pt-4">
              {last7Days.map((day) => {
                const heightPercent = Math.min(
                  100,
                  Math.round((day.minutes / max7DaysMinutes) * 100)
                );
                return (
                  <div
                    key={day.date}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    {/* Tooltip on hover */}
                    <span className="text-on-surface-variant font-mono text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                      {day.minutes}m
                    </span>
                    {/* Bar */}
                    <div className="bg-surface-container-highest flex h-32 w-full max-w-8 items-end overflow-hidden rounded-t-xl">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          day.isToday
                            ? 'bg-primary'
                            : day.minutes >= goalMinutes
                              ? 'bg-emerald-500'
                              : day.minutes > 0
                                ? 'bg-primary/60'
                                : 'bg-transparent'
                        }`}
                        style={{ height: `${Math.max(4, heightPercent)}%` }}
                      />
                    </div>
                    {/* Day Label */}
                    <span
                      className={`max-w-full truncate text-[11px] font-medium ${
                        day.isToday ? 'text-primary font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      {day.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-outline-variant/20 text-on-surface-variant mt-3 flex items-center justify-between border-t pt-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="bg-primary h-2.5 w-2.5 rounded-full" /> Hari ini
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Target Tercapai
              </span>
              <span>Target: {goalMinutes} mnt</span>
            </div>
          </div>

          {/* 30-Day Activity Heatmap Grid */}
          <div className="bg-surface-container border-outline-variant/30 flex flex-col justify-between rounded-3xl border p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                <h3 className="text-on-surface text-base font-bold">
                  Konsistensi 35 Hari Terakhir
                </h3>
              </div>
              <span className="text-on-surface-variant text-xs font-medium">Grid Kalender</span>
            </div>

            {/* 7 Columns Grid */}
            <div className="my-auto grid grid-cols-7 gap-2 py-2">
              {heatmapDays.map((day) => {
                // Level intensitas membaca
                let bgClass = 'bg-surface-container-highest text-on-surface-variant/60';
                if (day.minutes > 0) {
                  if (day.minutes < 15) {
                    bgClass = 'bg-primary/25 text-on-surface font-medium';
                  } else if (day.minutes < 30) {
                    bgClass = 'bg-primary/50 text-white font-medium';
                  } else if (day.minutes < 60) {
                    bgClass = 'bg-primary/80 text-white font-bold';
                  } else {
                    bgClass = 'bg-primary text-on-primary font-bold shadow-xs';
                  }
                }

                return (
                  <div
                    key={day.date}
                    title={`${day.fullDateLabel}: ${day.minutes} menit`}
                    className={`relative flex aspect-square cursor-default flex-col items-center justify-center rounded-xl text-[10px] transition-all hover:scale-105 ${bgClass} ${
                      day.isToday ? 'ring-primary ring-offset-surface ring-2 ring-offset-2' : ''
                    }`}
                  >
                    <span>{day.dayLabel}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-outline-variant/20 text-on-surface-variant mt-3 flex items-center justify-between border-t pt-3 text-[11px]">
              <span>Kurang</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-surface-container-highest h-3 w-3 rounded-md" />
                <span className="bg-primary/25 h-3 w-3 rounded-md" />
                <span className="bg-primary/50 h-3 w-3 rounded-md" />
                <span className="bg-primary/80 h-3 w-3 rounded-md" />
                <span className="bg-primary h-3 w-3 rounded-md" />
              </div>
              <span>Intensif</span>
            </div>
          </div>
        </div>

        {/* Reading Speed (WPM) & Estimation */}
        <div className="bg-surface-container border-outline-variant/30 flex flex-col items-center justify-between gap-6 rounded-3xl border p-6 shadow-xs sm:p-8 md:flex-row">
          <div className="space-y-1 text-center md:text-left">
            <div className="text-primary flex items-center justify-center gap-2 text-sm font-bold md:justify-start">
              <Gauge size={18} />
              <span>Kecepatan Membaca (Words Per Minute)</span>
            </div>
            <h3 className="text-on-surface text-lg font-bold">
              {readingSpeedWpm || 220} Kata Per Menit (WPM)
            </h3>
            <p className="text-on-surface-variant max-w-xl text-xs">
              Digunakan untuk menghitung estimasi waktu membaca halaman dan bab di dalam buku
              reader. Rata-rata orang dewasa membaca 200–250 kata per menit.
            </p>
          </div>

          <div className="flex w-full items-center gap-4 md:w-auto">
            <input
              type="range"
              min={100}
              max={450}
              step={10}
              value={readingSpeedWpm || 220}
              onChange={(e) => setReadingSpeedWpm(parseInt(e.target.value, 10))}
              className="accent-primary bg-surface-container-highest h-2 flex-1 cursor-pointer rounded-lg md:w-48"
              aria-label="Kecepatan Membaca WPM"
            />
            <span className="text-primary w-16 shrink-0 text-right font-mono text-sm font-bold">
              {readingSpeedWpm || 220} wpm
            </span>
          </div>
        </div>

        {/* Gamifikasi & Lencana Prestasi (Badges) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              <h2 className="text-on-surface text-xl font-extrabold">
                Lencana Prestasi & Gamifikasi
              </h2>
            </div>
            <span className="text-primary bg-primary/10 rounded-full px-3 py-1 text-xs font-semibold">
              {unlockedBadgesCount} dari {badges.length} Diraih
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-start gap-4 rounded-3xl border p-5 transition-all duration-300 ${
                  badge.unlocked
                    ? 'bg-surface-container border-primary/30 shadow-xs'
                    : 'bg-surface-container/40 border-outline-variant/20 opacity-60 grayscale-50'
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-xs ${
                    badge.unlocked ? 'bg-primary/15' : 'bg-surface-container-highest'
                  }`}
                >
                  <span>{badge.icon}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-on-surface truncate text-sm font-bold">{badge.title}</h4>
                    {badge.unlocked && (
                      <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Diraih
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
                    {badge.description}
                  </p>

                  {/* Progress bar if not yet unlocked and has progress */}
                  {!badge.unlocked && badge.progress && (
                    <div className="mt-3 space-y-1">
                      <div className="bg-surface-container-highest h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary/60 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round((badge.progress.current / badge.progress.target) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="text-on-surface-variant flex justify-between text-[10px]">
                        <span>Progres</span>
                        <span>
                          {badge.progress.current} / {badge.progress.target} {badge.progress.unit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
