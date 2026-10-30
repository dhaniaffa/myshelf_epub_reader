import React from 'react';
import { BookOpen, Check, Columns2, FileText, Scroll, Sparkles } from 'lucide-react';

import { useSettingsStore } from '@/store/settings';
import { FLOW_OPTIONS, MARGIN_OPTIONS, SPREAD_OPTIONS } from '../constants';

import type { ReaderFlowMode, ReaderSpreadMode } from '@/types';

const SPREAD_ICONS: Record<ReaderSpreadMode, React.ReactNode> = {
  auto: <Sparkles size={15} />,
  single: <FileText size={15} />,
  double: <Columns2 size={15} />,
};

const FLOW_ICONS: Record<ReaderFlowMode, React.ReactNode> = {
  paginated: <BookOpen size={16} />,
  scrolled: <Scroll size={16} />,
};

export const EpubLayoutSection: React.FC = () => {
  const settings = useSettingsStore();

  return (
    <>
      {/* MODE MEMBACA */}
      <div className="space-y-2">
        <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
          Mode Membaca
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FLOW_OPTIONS.map((f) => {
            const isSelected = settings.flowMode === f.mode;
            return (
              <button
                key={f.mode}
                type="button"
                onClick={() => settings.setFlowMode(f.mode)}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                    : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                }`}
              >
                <div
                  className={`shrink-0 rounded-xl p-2 transition-colors ${
                    isSelected
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {FLOW_ICONS[f.mode]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs leading-tight font-bold">{f.title}</div>
                  <div
                    className={`mt-0.5 text-[10px] leading-tight ${
                      isSelected ? 'text-on-primary-container/80' : 'text-on-surface-variant'
                    }`}
                  >
                    {f.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* COLUMN LAYOUT (Paged mode only) */}
      {settings.flowMode === 'paginated' && (
        <div className="animate-fade-in space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
              Kolom Tampilan
            </label>
            <span className="text-on-surface-variant text-[10px] font-medium">
              {settings.spreadMode === 'double'
                ? 'Buku Terbuka'
                : settings.spreadMode === 'single'
                  ? '1 Halaman'
                  : 'Adaptif'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SPREAD_OPTIONS.map((s) => {
              const isSelected = (settings.spreadMode || 'auto') === s.mode;
              return (
                <button
                  key={s.mode}
                  type="button"
                  onClick={() => settings.setSpreadMode(s.mode)}
                  className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`shrink-0 rounded-lg p-1.5 ${
                        isSelected
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {SPREAD_ICONS[s.mode]}
                    </div>
                    {isSelected && <Check size={13} className="text-primary font-bold" />}
                  </div>
                  <div>
                    <div className="text-xs leading-tight font-bold">{s.title}</div>
                    <div
                      className={`mt-0.5 text-[9px] leading-tight ${
                        isSelected ? 'text-on-primary-container/80' : 'text-on-surface-variant'
                      }`}
                    >
                      {s.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BATAS TEPI (MARGIN) */}
      <div className="space-y-2">
        <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
          Batas Tepi (Margin)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MARGIN_OPTIONS.map((m) => {
            const isSelected = settings.pageMargin === m.val;
            return (
              <button
                key={m.val}
                type="button"
                onClick={() => settings.setPageMargin(m.val)}
                className={`cursor-pointer rounded-2xl border p-2.5 text-center transition-all ${
                  isSelected
                    ? 'bg-secondary-container text-on-secondary-container border-secondary font-bold shadow-2xs'
                    : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                }`}
              >
                <div className="text-xs leading-tight font-bold">{m.label}</div>
                <div className="text-on-surface-variant mt-0.5 text-[10px] opacity-80">{m.sub}</div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
