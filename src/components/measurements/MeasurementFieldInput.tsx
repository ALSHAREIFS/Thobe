import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  NumeralSystem,
  normalizeNumeralInput,
  parseMeasurementNumber,
  formatMeasurementDisplay,
} from '../../utils/measurementNormalization';

interface MeasurementFieldInputProps {
  label: string;
  fieldKey: string;
  value: number | undefined | null;
  unit: 'cm' | 'inch';
  limits: { min: number; max: number; step: number; defaultVal: number };
  numeralSystem: NumeralSystem;
  isSelected: boolean;
  description?: string;
  onChange: (val: number) => void;
  onSelect: () => void;
}

export const MeasurementFieldInput: React.FC<MeasurementFieldInputProps> = ({
  label,
  value,
  unit,
  limits,
  numeralSystem,
  isSelected,
  description,
  onChange,
  onSelect,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localText, setLocalText] = useState<string>('');

  const numericValue = typeof value === 'number' && !isNaN(value) && value > 0 ? value : 0;
  const hasValue = numericValue > 0;

  // Synchronize display text when numericValue or numeralSystem changes from outside and not focused
  useEffect(() => {
    if (!isFocused) {
      if (hasValue) {
        setLocalText(formatMeasurementDisplay(numericValue, { numeralSystem, allowEmpty: true }));
      } else {
        setLocalText('');
      }
    }
  }, [numericValue, numeralSystem, isFocused, hasValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalText(raw);

    // Normalize numeral representation (Arabic/Persian/Latin digits & Arabic commas)
    const normalized = normalizeNumeralInput(raw);

    if (!normalized) {
      onChange(0);
      return;
    }

    // If user is currently typing a trailing decimal point (e.g. "67." or "٦٧٫"),
    // don't commit incomplete float yet so they can type the decimal portion smoothly
    if (normalized.endsWith('.')) {
      return;
    }

    const parsed = parseMeasurementNumber(normalized);
    onChange(parsed);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = normalizeNumeralInput(localText);
    const parsed = parseMeasurementNumber(normalized);

    // Commit final parsed canonical number
    onChange(parsed);

    // Format local text according to current numeral preference
    if (parsed > 0) {
      setLocalText(formatMeasurementDisplay(parsed, { numeralSystem, allowEmpty: true }));
    } else {
      setLocalText('');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onSelect();
    // On focus, if there is a value, display normalized string so user can edit cleanly
    if (hasValue) {
      if (numeralSystem === 'arabic') {
        setLocalText(formatMeasurementDisplay(numericValue, { numeralSystem: 'arabic' }));
      } else {
        setLocalText(numericValue.toString());
      }
    }
  };

  const handleStepMinus = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    if (numericValue <= 0) {
      return;
    }
    const nextVal = Math.max(0, Math.round((numericValue - limits.step) * 100) / 100);
    onChange(nextVal);
  };

  const handleStepPlus = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    if (numericValue <= 0) {
      // If empty, initialize to standard default value for this field
      onChange(limits.defaultVal);
    } else {
      const nextVal = Math.round((numericValue + limits.step) * 100) / 100;
      onChange(nextVal);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-xl border-2 transition-all bg-white cursor-pointer select-none ${
        isSelected
          ? 'border-amber-700 ring-2 ring-amber-700/15 shadow-xs'
          : hasValue
          ? 'border-stone-200 hover:border-stone-300'
          : 'border-dashed border-stone-300 bg-stone-50/50 hover:border-stone-400'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5 cursor-pointer">
          <span
            className={`w-2 h-2 rounded-full ${
              isSelected
                ? 'bg-amber-600'
                : hasValue
                ? 'bg-emerald-500'
                : 'bg-stone-300'
            }`}
          />
          {label}
        </label>
        <span className="text-[11px] font-semibold text-stone-400">
          {unit === 'cm' ? 'سم' : 'إنش'}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleStepMinus}
          disabled={!hasValue}
          aria-label={`تقليل ${label}`}
          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Universal Multilingual Decimal Input */}
        <input
          type="text"
          inputMode="decimal"
          value={localText}
          placeholder="--"
          onClick={(e) => e.stopPropagation()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleInputChange}
          className="w-full text-center font-black text-lg py-1 px-2 bg-stone-50 rounded-lg border border-stone-200 text-stone-900 focus:bg-white focus:border-amber-700 focus:ring-1 focus:ring-amber-700/20 focus:outline-none placeholder:text-stone-300 placeholder:font-normal transition-colors"
        />

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleStepPlus}
          aria-label={`زيادة ${label}`}
          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {description && (
        <div className="text-[11px] text-stone-500 mt-1 line-clamp-1">{description}</div>
      )}
    </div>
  );
};
