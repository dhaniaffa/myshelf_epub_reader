import React from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueDisplay?: string | number;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  valueDisplay,
  onChange,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="text-on-surface-variant flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-on-surface font-semibold">{valueDisplay ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="accent-primary bg-surface-container-highest h-1.5 w-full cursor-pointer appearance-none rounded-lg"
      />
    </div>
  );
};
