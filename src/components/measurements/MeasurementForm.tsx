import React, { useState } from 'react';
import { MeasurementData } from '../../types';
import { MEASUREMENT_FIELDS_CONFIG } from '../../utils/presets';
import { ThobeMeasurementFigure } from '../visuals/ThobeMeasurementFigure';
import { Ruler, Sparkles, Plus, Minus } from 'lucide-react';

interface MeasurementFormProps {
  measurements: MeasurementData;
  onChange: (updated: MeasurementData) => void;
  unit?: 'cm' | 'inch';
  onUnitChange?: (unit: 'cm' | 'inch') => void;
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

  const handleValueChange = (key: keyof MeasurementData, val: number) => {
    onChange({
      ...measurements,
      [key]: Math.max(0, parseFloat(val.toFixed(2)) || 0),
    });
  };

  const handleStep = (key: keyof MeasurementData, delta: number) => {
    const current = measurements[key] || 0;
    handleValueChange(key, current + delta);
  };

  // Quick Preset sizes (52 to 62)
  const applySizePreset = (sizeNum: number) => {
    // Standard Saudi thobe size mappings based on standard height in inches
    const lengthCm = Math.round(sizeNum * 2.54);
    onChange({
      ...measurements,
      length: lengthCm,
      shoulder: sizeNum >= 58 ? 48 : sizeNum >= 56 ? 46 : 44,
      chest: sizeNum >= 58 ? 66 : sizeNum >= 56 ? 62 : 58,
      waist: sizeNum >= 58 ? 64 : sizeNum >= 56 ? 60 : 56,
      sleeveLength: Math.round(lengthCm * 0.42),
      neck: sizeNum >= 58 ? 42 : 40,
    });
  };

  const filteredFields =
    activeTab === 'all'
      ? MEASUREMENT_FIELDS_CONFIG
      : MEASUREMENT_FIELDS_CONFIG.filter((f) => f.category === activeTab);

  return (
    <div className="space-y-6">
      {/* Top Bar with Unit & Preset Size shortcuts */}
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

        {/* Quick Sizes & Unit Toggle */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-stone-500 px-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> مقاسات جاهزة:
            </span>
            {[54, 56, 58, 60, 62].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applySizePreset(s)}
                className="px-2 py-1 text-xs font-bold bg-white text-stone-700 hover:bg-amber-700 hover:text-white rounded-lg shadow-2xs transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          {onUnitChange && (
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => onUnitChange('cm')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  unit === 'cm' ? 'bg-amber-800 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                سم (CM)
              </button>
              <button
                type="button"
                onClick={() => onUnitChange('inch')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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
              const hasValue = currentVal !== undefined && currentVal !== null && currentVal > 0;
              const isSelected = selectedField === field.key;

              return (
                <div
                  key={field.key}
                  onClick={() => setSelectedField(field.key)}
                  className={`p-3 rounded-xl border-2 transition-all bg-white cursor-pointer ${
                    isSelected
                      ? 'border-amber-700 ring-2 ring-amber-700/10 shadow-xs'
                      : hasValue
                      ? 'border-stone-200 hover:border-stone-300'
                      : 'border-dashed border-stone-300 bg-stone-50/50 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected
                            ? 'bg-amber-600'
                            : hasValue
                            ? 'bg-emerald-500'
                            : 'bg-stone-300'
                        }`}
                      />
                      {field.label}
                    </label>
                    <span className="text-[11px] font-semibold text-stone-400">
                      {unit === 'cm' ? 'سم' : 'إنش'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const baseVal = (measurements[field.key] || field.defaultVal);
                        handleValueChange(field.key, Math.max(0, baseVal - field.step));
                      }}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="number"
                      step={field.step}
                      min={field.min}
                      max={field.max}
                      value={hasValue ? currentVal : ''}
                      placeholder={`--`}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={() => setSelectedField(field.key)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        handleValueChange(field.key, raw === '' ? 0 : (parseFloat(raw) || 0));
                      }}
                      className="w-full text-center font-black text-lg py-1 px-2 bg-stone-50 rounded-lg border border-stone-200 text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none placeholder:text-stone-300 placeholder:font-normal"
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const baseVal = (measurements[field.key] || field.defaultVal - field.step);
                        handleValueChange(field.key, baseVal + field.step);
                      }}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-[11px] text-stone-500 mt-1 line-clamp-1">{field.description}</div>
                </div>
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
