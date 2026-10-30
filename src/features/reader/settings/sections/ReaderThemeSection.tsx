import React from 'react';

import { ThemeSegmented } from '@/components/ThemeSegmented';
import { useSettingsStore } from '@/store/settings';
import { THEME_LABELS } from '../constants';

export interface ReaderThemeSectionProps {
  label?: string;
  description?: string;
}

export const ReaderThemeSection: React.FC<ReaderThemeSectionProps> = ({
  label = 'Tema Tampilan',
  description,
}) => {
  const settings = useSettingsStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-on-surface text-xs font-semibold tracking-wider uppercase">
          {label}
        </label>
        <span className="text-on-surface-variant text-[10px] font-medium">
          {THEME_LABELS[settings.theme] || settings.theme}
        </span>
      </div>
      {description && <p className="text-on-surface-variant text-[11px]">{description}</p>}
      <ThemeSegmented theme={settings.theme} onChange={settings.setTheme} compact />
    </div>
  );
};
