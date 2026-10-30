import React from 'react';
import {
  AlignJustify,
  AlignLeft,
  Check,
  ChevronsUpDown,
  FoldVertical,
  Sparkles,
  UnfoldVertical,
} from 'lucide-react';

import { FONT_FAMILIES } from '@/lib/theme';
import { useSettingsStore } from '@/store/settings';
import { FONT_OPTIONS, LINE_HEIGHT_OPTIONS, TEXT_ALIGN_OPTIONS } from '../constants';

import type { ReaderTextAlign } from '@/types';

const LINE_HEIGHT_ICONS: Record<number, React.ReactNode> = {
  1.4: <FoldVertical size={13} />,
  1.6: <UnfoldVertical size={13} />,
  1.9: <ChevronsUpDown size={13} />,
};

const TEXT_ALIGN_ICONS: Record<ReaderTextAlign, React.ReactNode> = {
  left: <AlignLeft size={16} />,
  justify: <AlignJustify size={16} />,
};

export const EpubTypographySection: React.FC = () => {
  const settings = useSettingsStore();

  return (
    <>
      {/* JENIS HURUF */}
      <div className="space-y-2">
        <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
          Jenis Huruf
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((f, idx) => {
            const isSelected = settings.fontFamily === f.id;
            const isLastOdd = idx === FONT_OPTIONS.length - 1 && FONT_OPTIONS.length % 2 !== 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => settings.setFontFamily(f.id)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all ${
                  isLastOdd ? 'col-span-2' : ''
                } ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container border-primary ring-primary font-semibold shadow-xs ring-1'
                    : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
                }`}
              >
                <span className={`w-7 shrink-0 text-center text-lg font-bold ${f.fontClass}`}>
                  Aa
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs leading-tight font-bold">{f.name}</div>
                  <div
                    className={`mt-0.5 text-[10px] leading-tight ${
                      isSelected ? 'text-on-primary-container/80' : 'text-on-surface-variant'
                    }`}
                  >
                    {f.sub}
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-primary shrink-0 font-bold" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* FONT SIZE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="text-on-surface font-semibold tracking-wider uppercase">
            Ukuran Huruf
          </label>
          <span className="text-primary bg-primary/10 rounded-full px-2.5 py-0.5 text-xs font-bold">
            {settings.fontSize} px
          </span>
        </div>

        <div className="bg-surface-container-low border-outline-variant/30 flex items-center gap-3 rounded-2xl border p-2">
          <button
            type="button"
            onClick={() => settings.setFontSize(settings.fontSize - 1)}
            disabled={settings.fontSize <= 14}
            className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Perkecil Ukuran"
          >
            A-
          </button>
          <input
            type="range"
            min={14}
            max={32}
            step={1}
            value={settings.fontSize}
            onChange={(e) => settings.setFontSize(parseInt(e.target.value))}
            className="accent-primary bg-surface-container-highest h-2 flex-1 cursor-pointer appearance-none rounded-lg"
          />
          <button
            type="button"
            onClick={() => settings.setFontSize(settings.fontSize + 1)}
            disabled={settings.fontSize >= 32}
            className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Perbesar Ukuran"
          >
            A+
          </button>
        </div>
      </div>

      {/* LINE SPACING & TEXT ALIGNMENT */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Jarak Baris */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="text-on-surface font-semibold tracking-wider uppercase">
              Jarak Baris
            </label>
            <span className="text-primary text-[10px] font-bold">
              {settings.lineHeight.toFixed(1)}x
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {LINE_HEIGHT_OPTIONS.map((lh) => {
              const isSelected = Math.abs(settings.lineHeight - lh.val) < 0.1;
              return (
                <button
                  key={lh.val}
                  type="button"
                  onClick={() => settings.setLineHeight(lh.val)}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all ${
                    isSelected
                      ? 'bg-secondary-container text-on-secondary-container border-secondary font-bold shadow-2xs'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                  }`}
                >
                  {LINE_HEIGHT_ICONS[lh.val]}
                  <span className="text-[10px]">{lh.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alignment */}
        <div className="space-y-2">
          <label className="text-on-surface block text-xs font-semibold tracking-wider uppercase">
            Rata Paragraf
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {TEXT_ALIGN_OPTIONS.map((align) => {
              const isSelected = settings.textAlign === align.val;
              return (
                <button
                  key={align.val}
                  type="button"
                  onClick={() => settings.setTextAlign(align.val)}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-all ${
                    isSelected
                      ? 'bg-secondary-container text-on-secondary-container border-secondary font-bold shadow-2xs'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                  }`}
                >
                  {TEXT_ALIGN_ICONS[align.val]}
                  <span className="text-[10px] font-semibold">{align.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KOTAK PRATINJAU LANGSUNG */}
      <div className="bg-surface-container border-outline-variant/30 space-y-1.5 rounded-2xl border p-3.5">
        <div className="text-primary flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
          <Sparkles size={12} /> Pratinjau Tampilan EPUB
        </div>
        <p
          className="text-on-surface leading-relaxed transition-all"
          style={{
            fontSize: `${Math.min(22, Math.max(13, settings.fontSize * 0.9))}px`,
            lineHeight: settings.lineHeight,
            textAlign: settings.textAlign,
            fontFamily: FONT_FAMILIES[settings.fontFamily] || 'sans-serif',
          }}
        >
          "Membaca buku membuka jendela imajinasi dan memperluas pengetahuan tanpa batas."
        </p>
      </div>
    </>
  );
};
