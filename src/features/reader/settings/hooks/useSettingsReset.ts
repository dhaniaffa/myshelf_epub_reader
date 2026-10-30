import { useSettingsStore } from '@/store/settings';
import { toast } from '@/store/toast';

export interface UseSettingsResetOptions {
  format?: 'epub' | 'pdf';
  onPdfResetZoom?: () => void;
  onPdfFitModeChange?: (mode: 'width' | 'page') => void;
  onPdfScrollModeChange?: (mode: 'vertical' | 'single') => void;
}

export function useSettingsReset({
  format = 'epub',
  onPdfResetZoom,
  onPdfFitModeChange,
  onPdfScrollModeChange,
}: UseSettingsResetOptions) {
  const settings = useSettingsStore();
  const isPdf = format === 'pdf';

  const handleResetSettings = () => {
    if (!isPdf) {
      settings.resetEpubSettings();
      toast.info('Pengaturan EPUB dikembalikan ke bawaan');
    } else {
      settings.resetPdfSettings();
      onPdfResetZoom?.();
      onPdfFitModeChange?.('width');
      onPdfScrollModeChange?.('vertical');
      toast.info('Pengaturan PDF dikembalikan ke bawaan');
    }
  };

  return { handleResetSettings };
}
