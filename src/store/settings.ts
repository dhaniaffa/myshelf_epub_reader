import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { APP_CONFIG } from '@/config';

import type { ReaderSettings } from '@/types';

interface SettingsState extends ReaderSettings {
  setTheme: (theme: ReaderSettings['theme']) => void;
  setFontFamily: (fontFamily: ReaderSettings['fontFamily']) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setTextAlign: (textAlign: ReaderSettings['textAlign']) => void;
  setFlowMode: (flowMode: ReaderSettings['flowMode']) => void;
  setPageMargin: (pageMargin: ReaderSettings['pageMargin']) => void;
  setSpreadMode: (spreadMode: NonNullable<ReaderSettings['spreadMode']>) => void;
  setEinkMode: (einkMode: boolean) => void;
  setVolumeKeysNavigation: (volumeKeysNavigation: boolean) => void;
  setTextContrast: (textContrast: NonNullable<ReaderSettings['textContrast']>) => void;
  setDailyGoalMinutes: (minutes: number) => void;
  setReadingSpeedWpm: (wpm: number) => void;
  setAutoUpdateEnabled: (autoUpdateEnabled: boolean) => void;
  setPdfScrollMode: (pdfScrollMode: NonNullable<ReaderSettings['pdfScrollMode']>) => void;
  setPdfFitMode: (pdfFitMode: NonNullable<ReaderSettings['pdfFitMode']>) => void;
  setPdfScale: (pdfScale: number) => void;
  setPdfPageColor: (pdfPageColor: NonNullable<ReaderSettings['pdfPageColor']>) => void;
  setLibraryViewMode: (libraryViewMode: NonNullable<ReaderSettings['libraryViewMode']>) => void;
  setTtsRate: (ttsRate: number) => void;
  setTtsVoiceLang: (ttsVoiceLang: NonNullable<ReaderSettings['ttsVoiceLang']>) => void;
  resetEpubSettings: () => void;
  resetPdfSettings: () => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'auto',
  fontFamily: 'sans',
  fontSize: 18,
  lineHeight: 1.6,
  textAlign: 'left',
  flowMode: 'paginated',
  pageMargin: 'normal',
  spreadMode: 'auto',
  einkMode: false,
  volumeKeysNavigation: true,
  textContrast: 'normal',
  dailyGoalMinutes: 20,
  readingSpeedWpm: 220,
  autoUpdateEnabled: true,
  pdfScrollMode: 'vertical',
  pdfFitMode: 'width',
  pdfScale: 1.0,
  pdfPageColor: 'auto',
  libraryViewMode: 'comfortable',
  ttsRate: 1.0,
  ttsVoiceLang: 'id',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize: Math.min(32, Math.max(14, fontSize)) }),
      setLineHeight: (lineHeight) => set({ lineHeight: Math.min(2.2, Math.max(1.3, lineHeight)) }),
      setTextAlign: (textAlign) => set({ textAlign }),
      setFlowMode: (flowMode) => set({ flowMode }),
      setPageMargin: (pageMargin) => set({ pageMargin }),
      setSpreadMode: (spreadMode) => set({ spreadMode }),
      setEinkMode: (einkMode) => set({ einkMode }),
      setVolumeKeysNavigation: (volumeKeysNavigation) => set({ volumeKeysNavigation }),
      setTextContrast: (textContrast) => set({ textContrast }),
      setDailyGoalMinutes: (dailyGoalMinutes) =>
        set({ dailyGoalMinutes: Math.max(5, Math.min(180, dailyGoalMinutes)) }),
      setReadingSpeedWpm: (readingSpeedWpm) =>
        set({ readingSpeedWpm: Math.max(50, Math.min(600, readingSpeedWpm)) }),
      setAutoUpdateEnabled: (autoUpdateEnabled) => set({ autoUpdateEnabled }),
      setPdfScrollMode: (pdfScrollMode) => set({ pdfScrollMode }),
      setPdfFitMode: (pdfFitMode) => set({ pdfFitMode }),
      setPdfScale: (pdfScale) => set({ pdfScale: Math.max(0.5, Math.min(3.0, pdfScale)) }),
      setPdfPageColor: (pdfPageColor) => set({ pdfPageColor }),
      setLibraryViewMode: (libraryViewMode) => set({ libraryViewMode }),
      setTtsRate: (ttsRate) => set({ ttsRate: Math.max(0.5, Math.min(3.0, ttsRate)) }),
      setTtsVoiceLang: (ttsVoiceLang) => set({ ttsVoiceLang }),
      resetEpubSettings: () =>
        set({
          fontFamily: DEFAULT_SETTINGS.fontFamily,
          fontSize: DEFAULT_SETTINGS.fontSize,
          lineHeight: DEFAULT_SETTINGS.lineHeight,
          textAlign: DEFAULT_SETTINGS.textAlign,
          flowMode: DEFAULT_SETTINGS.flowMode,
          pageMargin: DEFAULT_SETTINGS.pageMargin,
          spreadMode: DEFAULT_SETTINGS.spreadMode,
          textContrast: DEFAULT_SETTINGS.textContrast,
        }),
      resetPdfSettings: () =>
        set({
          pdfScrollMode: DEFAULT_SETTINGS.pdfScrollMode,
          pdfFitMode: DEFAULT_SETTINGS.pdfFitMode,
          pdfScale: DEFAULT_SETTINGS.pdfScale,
          pdfPageColor: DEFAULT_SETTINGS.pdfPageColor,
        }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: APP_CONFIG.storageKeys.settings,
    }
  )
);
