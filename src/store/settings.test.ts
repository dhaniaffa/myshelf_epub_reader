import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from './settings';

describe('Settings Store (src/store/settings.ts)', () => {
  beforeEach(() => {
    // Reset all settings to defaults before each test
    useSettingsStore.getState().resetSettings();
  });

  describe('Value Clamping', () => {
    it('clamps font size between 14px and 32px', () => {
      const { setFontSize } = useSettingsStore.getState();

      setFontSize(10);
      expect(useSettingsStore.getState().fontSize).toBe(14);

      setFontSize(40);
      expect(useSettingsStore.getState().fontSize).toBe(32);

      setFontSize(22);
      expect(useSettingsStore.getState().fontSize).toBe(22);
    });

    it('clamps line height between 1.3 and 2.2', () => {
      const { setLineHeight } = useSettingsStore.getState();

      setLineHeight(1.0);
      expect(useSettingsStore.getState().lineHeight).toBe(1.3);

      setLineHeight(3.0);
      expect(useSettingsStore.getState().lineHeight).toBe(2.2);

      setLineHeight(1.8);
      expect(useSettingsStore.getState().lineHeight).toBe(1.8);
    });

    it('clamps daily goal minutes between 5 and 180', () => {
      const { setDailyGoalMinutes } = useSettingsStore.getState();

      setDailyGoalMinutes(2);
      expect(useSettingsStore.getState().dailyGoalMinutes).toBe(5);

      setDailyGoalMinutes(300);
      expect(useSettingsStore.getState().dailyGoalMinutes).toBe(180);

      setDailyGoalMinutes(45);
      expect(useSettingsStore.getState().dailyGoalMinutes).toBe(45);
    });

    it('clamps reading speed between 50 and 600 wpm', () => {
      const { setReadingSpeedWpm } = useSettingsStore.getState();

      setReadingSpeedWpm(20);
      expect(useSettingsStore.getState().readingSpeedWpm).toBe(50);

      setReadingSpeedWpm(900);
      expect(useSettingsStore.getState().readingSpeedWpm).toBe(600);

      setReadingSpeedWpm(250);
      expect(useSettingsStore.getState().readingSpeedWpm).toBe(250);
    });

    it('clamps PDF zoom scale between 0.5 and 3.0', () => {
      const { setPdfScale } = useSettingsStore.getState();

      setPdfScale(0.2);
      expect(useSettingsStore.getState().pdfScale).toBe(0.5);

      setPdfScale(5.0);
      expect(useSettingsStore.getState().pdfScale).toBe(3.0);

      setPdfScale(1.5);
      expect(useSettingsStore.getState().pdfScale).toBe(1.5);
    });

    it('clamps tts rate between 0.5 and 3.0', () => {
      const { setTtsRate } = useSettingsStore.getState();

      setTtsRate(0.2);
      expect(useSettingsStore.getState().ttsRate).toBe(0.5);

      setTtsRate(5.0);
      expect(useSettingsStore.getState().ttsRate).toBe(3.0);

      setTtsRate(1.5);
      expect(useSettingsStore.getState().ttsRate).toBe(1.5);
    });

    it('updates tts voice language and library view mode cleanly', () => {
      const { setTtsVoiceLang, setLibraryViewMode } = useSettingsStore.getState();

      setTtsVoiceLang('en');
      expect(useSettingsStore.getState().ttsVoiceLang).toBe('en');

      setLibraryViewMode('cover-only');
      expect(useSettingsStore.getState().libraryViewMode).toBe('cover-only');

      setLibraryViewMode('list');
      expect(useSettingsStore.getState().libraryViewMode).toBe('list');
    });
  });

  describe('Isolated Reset Functions', () => {
    it('resetEpubSettings only restores EPUB typography without modifying PDF or Theme', () => {
      const {
        setFontSize,
        setLineHeight,
        setPdfScale,
        setPdfScrollMode,
        setTheme,
        resetEpubSettings,
      } = useSettingsStore.getState();

      // Modify both EPUB and PDF and Theme
      setFontSize(28);
      setLineHeight(2.1);
      setPdfScale(2.5);
      setPdfScrollMode('single');
      setTheme('charcoal');

      // Reset only EPUB
      resetEpubSettings();

      const current = useSettingsStore.getState();
      // EPUB reset to defaults
      expect(current.fontSize).toBe(18);
      expect(current.lineHeight).toBe(1.6);
      // PDF and Theme remain untouched
      expect(current.pdfScale).toBe(2.5);
      expect(current.pdfScrollMode).toBe('single');
      expect(current.theme).toBe('charcoal');
    });

    it('resetPdfSettings only restores PDF layout without modifying EPUB typography', () => {
      const { setFontSize, setPdfScale, setPdfScrollMode, setPdfPageColor, resetPdfSettings } =
        useSettingsStore.getState();

      setFontSize(26);
      setPdfScale(2.0);
      setPdfScrollMode('single');
      setPdfPageColor('sepia');

      // Reset only PDF
      resetPdfSettings();

      const current = useSettingsStore.getState();
      // PDF reset to defaults
      expect(current.pdfScale).toBe(1.0);
      expect(current.pdfScrollMode).toBe('vertical');
      expect(current.pdfPageColor).toBe('auto');
      // EPUB remains untouched
      expect(current.fontSize).toBe(26);
    });

    it('resetSettings restores every single setting to factory defaults', () => {
      const state = useSettingsStore.getState();
      state.setFontSize(28);
      state.setTheme('oled');
      state.setEinkMode(true);
      state.setPdfScale(2.5);

      state.resetSettings();

      const resetState = useSettingsStore.getState();
      expect(resetState.fontSize).toBe(18);
      expect(resetState.theme).toBe('auto');
      expect(resetState.einkMode).toBe(false);
      expect(resetState.pdfScale).toBe(1.0);
    });
  });
});
