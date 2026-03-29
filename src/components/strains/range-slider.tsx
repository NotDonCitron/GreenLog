"use client";

import { useState } from "react";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
}

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatLabel = (v) => v.toString(),
}: RangeSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), localValue[1] - step);
    const newValue: [number, number] = [newMin, localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), localValue[0] + step);
    const newValue: [number, number] = [localValue[0], newMax];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const minPercent = ((localValue[0] - min) / (max - min)) * 100;
  const maxPercent = ((localValue[1] - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
        <span>{formatLabel(localValue[0])}</span>
        <span>{formatLabel(localValue[1])}</span>
      </div>
      <div className="relative h-2">
        {/* Track background */}
        <div className="absolute inset-0 bg-[var(--border)] rounded-full" />
        {/* Active track */}
        <div
          className="absolute h-full bg-[#2FF801] rounded-full"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />
        {/* Min handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={handleMinChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {/* Max handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        {/* Visual min thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-[#2FF801] pointer-events-none z-10"
          style={{ left: `calc(${minPercent}% - 8px)` }}
        />
        {/* Visual max thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-[#2FF801] pointer-events-none z-10"
          style={{ left: `calc(${maxPercent}% - 8px)` }}
        />
      </div>
    </div>
  );
}
