import React from 'react';
import { Clock, Gauge, Sliders } from 'lucide-react';

import { useSettingsStore } from '@/store/settings';

const GOAL_PRESETS = [10, 15, 20, 30, 45, 60];

export const ReadingGoalsSection: React.FC = () => {
  const { dailyGoalMinutes, setDailyGoalMinutes, readingSpeedWpm, setReadingSpeedWpm } =
    useSettingsStore();

  return (
    <section className="bg-surface-container border-outline-variant/30 space-y-6 rounded-3xl border p-6 shadow-xs sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <Sliders size={20} />
        </div>
        <div>
          <h2 className="text-on-surface text-base font-bold">Preferensi Membaca</h2>
          <p className="text-on-surface-variant text-xs">
            Sesuaikan target konsistensi harian dan kecepatan kalkulasi estimasi waktu membaca.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-1 md:grid-cols-2">
        {/* Target Harian */}
        <div className="bg-surface-container-high border-outline-variant/20 space-y-3 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <span className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
              <Clock size={16} className="text-primary" /> Target Membaca Harian
            </span>
            <span className="text-primary font-mono text-xs font-bold">
              {dailyGoalMinutes || 20} mnt/hari
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {GOAL_PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDailyGoalMinutes(mins)}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  (dailyGoalMinutes || 20) === mins
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-highest text-on-surface hover:opacity-80'
                }`}
              >
                {mins} mnt
              </button>
            ))}
          </div>
        </div>

        {/* Reading Speed (WPM) */}
        <div className="bg-surface-container-high border-outline-variant/20 space-y-3 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <span className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
              <Gauge size={16} className="text-primary" /> Kecepatan Membaca (WPM)
            </span>
            <span className="text-primary font-mono text-xs font-bold">
              {readingSpeedWpm || 220} wpm
            </span>
          </div>
          <div className="space-y-1">
            <input
              type="range"
              min={100}
              max={450}
              step={10}
              value={readingSpeedWpm || 220}
              onChange={(e) => setReadingSpeedWpm(parseInt(e.target.value, 10))}
              className="accent-primary bg-surface-container-highest h-2 w-full cursor-pointer rounded-lg"
              aria-label="Kecepatan Membaca WPM"
            />
            <div className="text-on-surface-variant flex justify-between text-[10px] font-medium">
              <span>100 Santai</span>
              <span>220 Normal</span>
              <span>450 Cepat</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
