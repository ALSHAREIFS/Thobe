import React, { useState } from 'react';
import { MeasurementData, MeasurementUnit } from '../../types';
import { MEASUREMENT_FIELDS_CONFIG } from '../../utils/presets';
import { getFieldLimitsForUnit } from '../../utils/measurementConversion';
import {
  NumeralSystem,
  getMeasurementNumeralPreference,
  setMeasurementNumeralPreference,
  parseMeasurementNumber,
} from '../../utils/measurementNormalization';
import { ThobeMeasurementFigure } from '../visuals/ThobeMeasurementFigure';
import { MeasurementFieldInput } from './MeasurementFieldInput';
import { Ruler, Sparkles, Languages } from 'lucide-react';

interface MeasurementFormProps {
  measurements: MeasurementData;
  onChange: (updated: MeasurementData) => void;
  unit?: MeasurementUnit;
  onUnitChange?: (unit: MeasurementUnit) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

export const MeasurementForm: React.FC<MeasurementFormProps> = ({
  measurements,
  onChange,
  unit = 'cm',
  onUnitChange,
  notes,
  onNotesChange,
}) => {
  const [selectedField, setSelectedField] = useState<keyof MeasurementData | null>('length');
  const [activeTab, setActiveTab] = useState<'all' | 'main' | 'upper' | 'sleeves' | 'details'>('all');
  const [numeralSystem, setNumeralSystem] = useState<NumeralSystem>(() => getMeasurementNumeralPreference());

  const handleToggleNumeralSystem = (newSystem: NumeralSystem) => {
    setNumeralSystem(newSystem);
    setMeasurementNumeralPreference(newSystem);
  };

  const handleValueChange = (key: keyof MeasurementData, val: number) => {
    const canonical = typeof val === 'number' ? Math.max(0, Math.round((val + Number.EPSILON) * 100) / 100) : parseMeasurementNumber(val);
    onChange({
      ...measurements,
      [key]: canonical,
    });
  };

  // Quick Preset sizes (52 to 62)
  const applySizePreset = (sizeNum: number) => {
    // Standard Saudi thobe size mappings based on standard height in inches
    const lengthVal = unit === 'inch' ? sizeNum : Math.round(sizeNum * 2.54);
    const shoulderVal = unit === 'inch' ? (sizeNum >= 58 ? 18.9 : sizeNum >= 56 ? 18.1 : 17.3) : (sizeNum >= 58 ? 48 : sizeNum >= 56 ? 46 : 44);
    const chestVal = unit === 'inch' ? (sizeNum >= 58 ? 26 : sizeNum >= 56 ? 24.4 : 22.8) : (sizeNum >= 58 ? 66 : sizeNum >= 56 ? 62 : 58);
    const waistVal = unit === 'inch' ? (sizeNum >= 58 ? 25.2 : sizeNum >= 56 ? 23.6 : 22) : (sizeNum >= 58 ? 64 : sizeNum >= 56 ? 60 : 56);
    const sleeveVal = unit === 'inch' ? Math.round((lengthVal * 0.42) * 10) / 10 : Math.round(lengthVal * 0.42);
    const neckVal = unit === 'inch' ? (sizeNum >= 58 ? 16.5 : 15.7) : (sizeNum >= 58 ? 42 : 40);

    onChange({
      ...measurements,
      length: lengthVal,
      shoulder: shoulderVal,
      chest: chestVal,
      waist: waistVal,
      sleeveLength: sleeveVal,
      neck: neckVal,
    });
  };

  const filteredFields =
    activeTab === 'all'
      ? MEASUREMENT_FIELDS_CONFIG
      : MEASUREMENT_FIELDS_CONFIG.filter((f) => f.category === activeTab);

  return (
    <div className="space-y-6">
      {/* Top Bar with Unit, Numeral Display & Preset Size shortcuts */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm text-stone-900">جدول أخذ المقاسات الدقيق</h4>
            <p className="text-xs text-stone-500">سجل قياسات الثوب بدقة مع المعاينة التفاعلية المباشرة</p>
          </div>
        </div>

        {/* Quick Sizes, Numeral Format & Unit Toggle */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-stone-500 px-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> مقاسات جاهزة:
            </span>
            {[54, 56, 58, 60, 62].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applySizePreset(s)}
                className="px-2 py-1 text-xs font-bold bg-white text-stone-700 hover:bg-amber-700 hover:text-white rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                {numeralSystem === 'arabic' ? (s === 54 ? '٥٤' : s === 56 ? '٥٦' : s === 58 ? '٥٨' : s === 60 ? '٦٠' : '٦٢') : s}
              </button>
            ))}
          </div>

          {/* Numeral System Toggle: Latin vs Arabic digits */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => handleToggleNumeralSystem('latin')}
              title="عرض الأرقام بالإنجليزية (67)"
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                numeralSystem === 'latin'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              123
            </button>
            <button
              type="button"
              onClick={() => handleToggleNumeralSystem('arabic')}
              title="عرض الأرقام بالعربية (٦٧)"
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                numeralSystem === 'arabic'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ١٢٣
            </button>
          </div>

          {/* Unit Toggle: CM vs INCH */}
          {onUnitChange && (
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => onUnitChange('cm')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  unit === 'cm' ? 'bg-amber-800 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                سم (CM)
              </button>
              <button
                type="button"
                onClick={() => onUnitChange('inch')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  unit === 'inch' ? 'bg-amber-800 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                إنش (IN)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Banner when no real measurements exist yet */}
      {(!measurements.length || measurements.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-3 text-amber-900">
          <div className="w-8 h-8 rounded-xl bg-amber-200/80 flex items-center justify-center font-bold text-amber-900 shrink-0">
            !
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-black block">لم تُسجل مقاسات حقيقية لهذا العميل بعد</span>
            <span>الحقول فارغة بانتظار أخذ القياسات يدوياً، أو يمكنك الضغط على أحد <b>المقاسات الجاهزة</b> بالأعلى لملء الحقول وتعديلها.</span>
          </div>
        </div>
      )}

      {/* Main Layout: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Silhouette Vector */}
        <div className="lg:col-span-5 order-2 lg:order-1 sticky top-6">
          <ThobeMeasurementFigure
            measurements={measurements}
            selectedField={selectedField}
            onSelectField={(f) => setSelectedField(f)}
            unit={unit === 'cm' ? 'سم' : 'إنش'}
            numeralSystem={numeralSystem}
          />
        </div>

        {/* Right Column: Numeric Inputs and Categories */}
        <div className="lg:col-span-7 order-1 lg:order-2 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'جميع المقاسات' },
              { id: 'main', label: 'الطول والوسع العام' },
              { id: 'upper', label: 'الكتف والصدر والرقبة' },
              { id: 'sleeves', label: 'الأكمام والكبك' },
              { id: 'details', label: 'تفاصيل الجيب والجبزور' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredFields.map((field) => {
              const currentVal = measurements[field.key];
              const isSelected = selectedField === field.key;
              const limits = getFieldLimitsForUnit(field.min, field.max, field.step, field.defaultVal, unit);

              return (
                <MeasurementFieldInput
                  key={field.key}
                  label={field.label}
                  fieldKey={field.key}
                  value={currentVal}
                  unit={unit}
                  limits={limits}
                  numeralSystem={numeralSystem}
                  isSelected={isSelected}
                  description={field.description}
                  onChange={(val) => handleValueChange(field.key, val)}
                  onSelect={() => setSelectedField(field.key)}
                />
              );
            })}
          </div>

          {/* Measurements Notes */}
          {onNotesChange && (
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                ملاحظات خاصة بالمقاسات وتفاصيل الجسد (انحناء الكتف، بروز البطن، إلخ)
              </label>
              <textarea
                rows={2}
                value={notes || ''}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="مثال: كتف أيمن مائل قليلاً بمقدار 1 سم، زيادة وسع الصدر لحرية الحركة أثناء الجلوس..."
                className="w-full px-3 py-2 text-sm bg-stone-50 rounded-lg border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
