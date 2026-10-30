import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart2, CheckCircle2, Compass, Flame, Library, Settings } from 'lucide-react';

import { AppLogo } from '@/components/icons/AppLogo';
import { APP_NAME, APP_SUBTITLE, APP_VERSION } from '@/config';
import { db, getLocalDateString } from '@/lib/db';
import { navigate } from '@/lib/route';
import { calculateStreak } from '@/lib/statistics';
import { useSettingsStore } from '@/store/settings';

interface AppShellProps {
  currentRoute: 'library' | 'catalog' | 'stats' | 'settings';
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ currentRoute, children }) => {
  const { dailyGoalMinutes } = useSettingsStore();

  // Fetch reading logs for goal & streak widgets in sidebar
  const allLogs = useLiveQuery(() => db.reading_logs.toArray(), []);
  const todayStr = getLocalDateString();

  const { todayMinutes, streakCount, goalPercent } = useMemo(() => {
    if (!allLogs) return { todayMinutes: 0, streakCount: 0, goalPercent: 0 };
    const { currentStreak, longestStreak } = calculateStreak(allLogs);
    const todayLogs = allLogs.filter((l) => l.date === todayStr);
    const todaySeconds = todayLogs.reduce((acc, l) => acc + l.durationSeconds, 0);
    const todayMins = Math.round(todaySeconds / 60);
    const goal = dailyGoalMinutes || 20;
    const percent = Math.min(100, Math.round((todayMins / goal) * 100));

    return {
      todayMinutes: todayMins,
      streakCount: Math.max(
        currentStreak,
        longestStreak > 0 && currentStreak === 0 ? 0 : currentStreak
      ),
      goalPercent: percent,
    };
  }, [allLogs, todayStr, dailyGoalMinutes]);

  const navItems: NavItem[] = [
    {
      id: 'library' as const,
      label: 'Rak Buku',
      icon: <Library size={20} />,
      onClick: () => navigate(''),
      active: currentRoute === 'library',
    },
    {
      id: 'catalog' as const,
      label: 'Katalog Buku',
      icon: <Compass size={20} />,
      onClick: () => navigate('catalog'),
      active: currentRoute === 'catalog',
    },
    {
      id: 'stats' as const,
      label: 'Statistik',
      icon: <BarChart2 size={20} />,
      onClick: () => navigate('stats'),
      active: currentRoute === 'stats',
    },
    {
      id: 'settings' as const,
      label: 'Pengaturan',
      icon: <Settings size={20} />,
      onClick: () => navigate('settings'),
      active: currentRoute === 'settings',
    },
  ];

  return (
    <div className="bg-surface text-on-surface flex min-h-screen flex-col lg:flex-row">
      {/* DESKTOP SIDEBAR (>= 1024px) */}
      <aside className="bg-surface-container border-outline-variant/30 fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r select-none lg:flex">
        {/* Header / Brand */}
        <div className="border-outline-variant/20 flex items-center gap-3 border-b p-6 pb-5">
          <div className="bg-primary text-on-primary flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm">
            <AppLogo size={24} className="text-on-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface truncate text-base font-bold tracking-tight">
                {APP_NAME}
              </span>
              <span className="text-on-surface-variant bg-surface-container-highest rounded-md px-1.5 py-0.5 font-mono text-[10px]">
                v{APP_VERSION}
              </span>
            </div>
            <p className="text-on-surface-variant truncate text-xs">{APP_SUBTITLE}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`flex w-full cursor-pointer items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                item.active
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className={item.active ? 'text-on-primary' : 'text-on-surface-variant'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Daily Goal & Streak Card Widget */}
        <div className="bg-surface-container-high border-outline-variant/30 mx-3 mb-4 flex flex-col gap-3 rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-on-surface flex items-center gap-1.5 text-xs font-semibold">
              <Flame
                size={16}
                className={streakCount > 0 ? 'fill-amber-500 text-amber-500' : 'text-outline'}
              />
              <span>{streakCount} Hari Streak</span>
            </div>
            <span className="text-primary font-mono text-[11px] font-medium">{goalPercent}%</span>
          </div>

          {/* Goal Progress Bar */}
          <div className="space-y-1">
            <div className="bg-surface-container-highest h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <div className="text-on-surface-variant flex items-center justify-between text-[10px]">
              <span>{todayMinutes} mnt hari ini</span>
              <span>Target {dailyGoalMinutes} mnt</span>
            </div>
          </div>

          {goalPercent >= 100 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              <span>Target harian tercapai! 🎉</span>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0 lg:pl-64">{children}</div>

      {/* MOBILE BOTTOM NAVIGATION BAR (< 1024px) */}
      <nav
        style={{
          height: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        className="bg-surface-container/95 border-outline-variant/30 fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t px-2 backdrop-blur-lg select-none lg:hidden"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`flex h-full flex-1 cursor-pointer flex-col items-center justify-center py-1 text-[11px] font-medium transition-colors ${
              item.active
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div
              className={`rounded-xl p-1 transition-all ${
                item.active ? 'bg-primary-container text-on-primary-container scale-105' : ''
              }`}
            >
              {item.icon}
            </div>
            <span className="mt-0.5">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
