import React, { useState, useEffect } from 'react';
import {
  CollarRegularIcon,
  CollarMandarinIcon,
  CollarRoyalIcon,
  CollarKuwaitiIcon,
  CollarRoundIcon,
  CuffChamferedIcon,
  CuffSquareIcon,
  CuffRoundIcon,
  SleevePlainIcon,
  SleeveElasticIcon,
  PocketChamferedIcon,
  PocketSquareIcon,
  PocketFlapIcon,
  PlacketVisibleIcon,
  PlacketHiddenIcon,
  BottomWideHemIcon,
  BottomSlitsIcon,
} from './OptionIcons';
import {
  COLLAR_OPTIONS_PRESET,
  SLEEVE_OPTIONS_PRESET,
  POCKET_OPTIONS_PRESET,
  CHEST_OPTIONS_PRESET,
  BOTTOM_OPTIONS_PRESET,
  BUTTON_OPTIONS_PRESET,
  GARMENT_TYPES_PRESET,
  DEFAULT_TAILORING_DETAILS,
  EMPTY_TAILORING_DETAILS,
  validateTailoringDetails,
} from '../../utils/presets';
import { TailoringDetails } from '../../types';
import { Check, FileText, Sparkles, RotateCcw, AlertCircle, CheckCircle2, Scissors } from 'lucide-react';

interface VisualOptionSelectorProps {
  tailoringDetails: TailoringDetails;
  onChange: (updated: TailoringDetails) => void;
}

export const VisualOptionSelector: React.FC<VisualOptionSelectorProps> = ({
  tailoringDetails,
  onChange,
}) => {
  const isPresetGarment = GARMENT_TYPES_PRESET.some((g) => g.name === tailoringDetails.garmentType);
  const hasCustomGarment = Boolean(tailoringDetails.garmentType && !isPresetGarment);
  const [customGarmentActive, setCustomGarmentActive] = useState(() => hasCustomGarment);

  useEffect(() => {
    if (isPresetGarment) {
      setCustomGarmentActive(false);
    } else if (hasCustomGarment) {
      setCustomGarmentActive(true);
    }
  }, [tailoringDetails.garmentType, isPresetGarment, hasCustomGarment]);

  const isCustomGarment = customGarmentActive || hasCustomGarment;

  const isPresetCollar = COLLAR_OPTIONS_PRESET.some((c) => c.id === tailoringDetails.collar.type);
  const isPresetCollarName = COLLAR_OPTIONS_PRESET.some((c) => c.name === tailoringDetails.collar.name);
  const isCustomCollar =
    tailoringDetails.collar.type === 'custom' ||
    tailoringDetails.collar.type === 'other' ||
    Boolean(tailoringDetails.collar.type && !isPresetCollar) ||
    Boolean(tailoringDetails.collar.name && !isPresetCollarName && tailoringDetails.collar.name !== 'غير محدد');

  const isPresetSleeve = SLEEVE_OPTIONS_PRESET.some((s) => s.id === tailoringDetails.sleeves.type);
  const isPresetSleeveName = SLEEVE_OPTIONS_PRESET.some((s) => s.name === tailoringDetails.sleeves.name);
  const isCustomSleeve =
    tailoringDetails.sleeves.type === 'custom' ||
    tailoringDetails.sleeves.type === 'other' ||
    Boolean(tailoringDetails.sleeves.type && !isPresetSleeve) ||
    Boolean(tailoringDetails.sleeves.name && !isPresetSleeveName && tailoringDetails.sleeves.name !== 'غير محدد');

  const isPresetPocket = POCKET_OPTIONS_PRESET.some((p) => p.id === tailoringDetails.pockets.chestPocketType);
  const isPresetPocketName = POCKET_OPTIONS_PRESET.some((p) => p.name === tailoringDetails.pockets.name);
  const isCustomPocket =
    tailoringDetails.pockets.chestPocketType === 'custom' ||
    Boolean(tailoringDetails.pockets.chestPocketType && !isPresetPocket) ||
    Boolean(tailoringDetails.pockets.name && !isPresetPocketName && tailoringDetails.pockets.name !== 'غير محدد');

  const isPresetChest = CHEST_OPTIONS_PRESET.some((ch) => ch.id === tailoringDetails.chest.placketType);
  const isPresetChestName = CHEST_OPTIONS_PRESET.some((ch) => ch.name === tailoringDetails.chest.name);
  const isCustomChest =
    tailoringDetails.chest.placketType === 'custom' ||
    Boolean(tailoringDetails.chest.placketType && !isPresetChest) ||
    Boolean(tailoringDetails.chest.name && !isPresetChestName && tailoringDetails.chest.name !== 'غير محدد');

  const isPresetButton = BUTTON_OPTIONS_PRESET.some((b) => b.id === tailoringDetails.buttons.type);
  const isPresetButtonName = BUTTON_OPTIONS_PRESET.some((b) => b.name === tailoringDetails.buttons.name);
  const isCustomButton =
    tailoringDetails.buttons.type === 'custom' ||
    Boolean(tailoringDetails.buttons.type && !isPresetButton) ||
    Boolean(tailoringDetails.buttons.name && !isPresetButtonName && tailoringDetails.buttons.name !== 'غير محدد');

  const isPresetBottom = BOTTOM_OPTIONS_PRESET.some((b) => b.id === tailoringDetails.bottom.finishType);
  const isPresetBottomName = BOTTOM_OPTIONS_PRESET.some((b) => b.name === tailoringDetails.bottom.name);
  const isCustomBottom =
    tailoringDetails.bottom.finishType === 'custom' ||
    Boolean(tailoringDetails.bottom.finishType && !isPresetBottom) ||
    Boolean(tailoringDetails.bottom.name && !isPresetBottomName && tailoringDetails.bottom.name !== 'غير محدد');

  const validation = validateTailoringDetails(tailoringDetails);
  const totalRequired = 7;
  const completedCount = totalRequired - validation.missingFields.length;

  return (
    <div className="space-y-8">
      {/* Quick Templates Bar */}
      <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>خيارات التعبئة السريعة:</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">يمكنك تطبيق قالب الثوب السعودي الرسمي الجاهز بضغطة زر أو تفصيل كل خيار بشكل يدوي ومخصص</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => {
              setCustomGarmentActive(false);
              onChange(DEFAULT_TAILORING_DETAILS);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            تطبيق قالب الثوب السعودي الرسمي
          </button>
          {tailoringDetails.garmentType && (
            <button
              type="button"
              onClick={() => {
                setCustomGarmentActive(false);
                onChange(EMPTY_TAILORING_DETAILS);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 rounded-xl text-xs font-medium transition-all cursor-pointer"
              title="تفريغ الخيارات"
            >
              <RotateCcw className="w-3 h-3" />
              تفريغ
            </button>
          )}
        </div>
      </div>

      {/* Validation Status Indicator */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
          validation.isValid
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {validation.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <div className="text-xs font-bold">
              {validation.isValid
                ? 'اكتملت جميع مواصفات التفصيل الـ 7 بنجاح'
                : `تم تحديد (${completedCount} من ${totalRequired}) مواصفات تفصيل`}
            </div>
            {!validation.isValid && (
              <div className="text-[11px] text-amber-800 mt-0.5">
                المتبقي لتأكيد الطلب: {validation.missingFields.join(' • ')}
              </div>
            )}
          </div>
        </div>
        <div className="text-left shrink-0">
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-full border ${
              validation.isValid
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            {completedCount}/{totalRequired}
          </span>
        </div>
      </div>

      {/* 1. GARMENT TYPE */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">1</span>
              نوع الثوب والقصة
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">اختر الستايل العام ونمط التفصيل أو اكتب قصة مخصصة</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.garmentType && tailoringDetails.garmentType !== 'أخرى' && tailoringDetails.garmentType !== 'قصة مخصصة'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.garmentType && tailoringDetails.garmentType !== 'أخرى' && tailoringDetails.garmentType !== 'قصة مخصصة'
              ? isCustomGarment
                ? `مخصص: ${tailoringDetails.garmentType}`
                : tailoringDetails.garmentType
              : 'نوع القصة مطلوب'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {GARMENT_TYPES_PRESET.map((g) => {
            const isSelected = tailoringDetails.garmentType === g.name;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setCustomGarmentActive(false);
                  onChange({ ...tailoringDetails, garmentType: g.name });
                }}
                className={`text-right p-3.5 rounded-xl border-2 transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/70 shadow-xs ring-2 ring-amber-700/10'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
                <div>
                  <div className="font-bold text-sm text-stone-900">{g.name}</div>
                  <div className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{g.description}</div>
                </div>
                {g.popular && (
                  <span className="self-start mt-2 text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                    شائع
                  </span>
                )}
              </button>
            );
          })}

          {/* Dedicated Custom Garment Card */}
          <button
            type="button"
            onClick={() => {
              setCustomGarmentActive(true);
              if (isPresetGarment) {
                onChange({ ...tailoringDetails, garmentType: '' });
              }
            }}
            className={`text-right p-3.5 rounded-xl border-2 border-dashed transition-all relative flex flex-col justify-between cursor-pointer ${
              isCustomGarment
                ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                : 'border-stone-300 bg-stone-50/70 hover:border-amber-600 hover:bg-stone-100'
            }`}
          >
            {isCustomGarment && (
              <span className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
            <div>
              <div className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-amber-700" />
                قصة مخصصة / نوع آخر
              </div>
              <div className="text-xs text-stone-600 mt-1 leading-relaxed">
                إدخال نمط أو قصة خاصة غير مدرجة في الخيارات الجاهزة
              </div>
            </div>
            <span className="self-start mt-2 text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
              تخصيص حر ✍️
            </span>
          </button>
        </div>

        {/* Custom Garment Input */}
        {isCustomGarment && (
          <div className="mb-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-300 transition-all animate-in fade-in">
            <label className="block text-xs font-black text-amber-950 mb-1.5">
              اسم قصة أو نوع الثوب المخصص * (اكتب الاسم الفعلي للقصة)
            </label>
            <input
              type="text"
              autoFocus
              value={tailoringDetails.garmentType}
              onChange={(e) => onChange({ ...tailoringDetails, garmentType: e.target.value })}
              placeholder="اكتب نوع أو قصة الثوب (مثال: ثوب مغربي رسمي، دقلة، سديري تراثي، ثوب بحريني مخصر...)"
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-amber-400 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
          </div>
        )}

        {/* Branch 1 Notes */}
        <div className="pt-3 border-t border-stone-200">
          <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            ملاحظات وتخصيص قصة ونوع الثوب:
          </label>
          <input
            type="text"
            value={tailoringDetails.garmentNotes || ''}
            onChange={(e) => onChange({ ...tailoringDetails, garmentNotes: e.target.value })}
            placeholder="اكتب ملاحظات القصة (مثال: قصة مخصرة قليلاً، وسع إضافي لراحة الجلوس، ربع كلوش...)"
            className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </section>

      {/* 2. COLLAR / الياقة */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">2</span>
              تصميم الياقة (القلاب)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">اختر شكل الياقة ومستوى قساوة الحشوة أو أدخل تصميماً مخصصاً</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.collar.type && tailoringDetails.collar.name && tailoringDetails.collar.name !== 'غير محدد'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.collar.name && tailoringDetails.collar.name !== 'غير محدد'
              ? isCustomCollar
                ? `مخصص: ${tailoringDetails.collar.name}`
                : tailoringDetails.collar.name
              : 'تصميم الياقة مطلوب'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
          {COLLAR_OPTIONS_PRESET.map((c) => {
            const isSelected = tailoringDetails.collar.type === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...tailoringDetails,
                    collar: {
                      ...tailoringDetails.collar,
                      type: c.id,
                      name: c.name,
                      buttonsCount: c.buttons,
                      height: c.height,
                    },
                  })
                }
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <div className="w-16 h-16 my-1 flex items-center justify-center">
                  {c.id === 'regular' && <CollarRegularIcon selected={isSelected} />}
                  {c.id === 'mandarin' && <CollarMandarinIcon selected={isSelected} />}
                  {c.id === 'royal' && <CollarRoyalIcon selected={isSelected} />}
                  {c.id === 'kuwaiti' && <CollarKuwaitiIcon selected={isSelected} />}
                  {c.id === 'buttoned' && <CollarRegularIcon selected={isSelected} />}
                  {c.id === 'round' && <CollarRoundIcon selected={isSelected} />}
                </div>
                <div className="font-bold text-xs text-stone-900 mt-2">{c.name}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">{c.sub}</div>
              </button>
            );
          })}

          {/* Dedicated Custom Collar Card */}
          <button
            type="button"
            onClick={() => {
              onChange({
                ...tailoringDetails,
                collar: {
                  ...tailoringDetails.collar,
                  type: 'custom',
                  name: isCustomCollar && tailoringDetails.collar.name !== 'غير محدد' ? tailoringDetails.collar.name : '',
                },
              });
            }}
            className={`p-3 rounded-xl border-2 border-dashed transition-all flex flex-col items-center text-center relative cursor-pointer ${
              isCustomCollar
                ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                : 'border-stone-300 bg-stone-50/70 hover:border-amber-600 hover:bg-stone-100'
            }`}
          >
            {isCustomCollar && (
              <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
            <div className="w-16 h-16 my-1 flex items-center justify-center text-amber-700">
              <Scissors className="w-8 h-8" />
            </div>
            <div className="font-bold text-xs text-amber-950 mt-2">ياقة مخصصة / أخرى</div>
            <div className="text-[11px] text-stone-500 mt-0.5">تصميم يدوي خاص</div>
          </button>
        </div>

        {/* Custom Collar Input */}
        {isCustomCollar && (
          <div className="mb-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-300 transition-all animate-in fade-in">
            <label className="block text-xs font-black text-amber-950 mb-1.5">
              اسم أو وصف تصميم الياقة المخصص * (اكتب التصميم الفعلي للياقة)
            </label>
            <input
              type="text"
              autoFocus
              value={tailoringDetails.collar.name}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  collar: { ...tailoringDetails.collar, name: e.target.value },
                })
              }
              placeholder="اكتب تصميم الياقة (مثال: قلاب إيطالي مقلوب، ياقة صينية مدببة، ياقة دائرية بدون أزرار...)"
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-amber-400 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
          </div>
        )}

        {/* Collar Controls (Stiffness & Height) */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">حشوة وقساوة الياقة</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['stiff', 'medium', 'soft'] as const).map((stiff) => (
                <button
                  key={stiff}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...tailoringDetails,
                      collar: { ...tailoringDetails.collar, stiffness: stiff },
                    })
                  }
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    tailoringDetails.collar.stiffness === stiff
                      ? 'bg-amber-800 text-white border-amber-800'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {stiff === 'stiff' ? 'قاسية (واقفة)' : stiff === 'medium' ? 'وسط' : 'طرية'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">ارتفاع الياقة (سم)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.25"
                min="1.5"
                max="6"
                value={tailoringDetails.collar.height ? tailoringDetails.collar.height : ''}
                placeholder="3.5"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChange({
                    ...tailoringDetails,
                    collar: { ...tailoringDetails.collar, height: isNaN(val) ? 0 : val },
                  });
                }}
                className="w-full px-3 py-1.5 text-sm font-bold bg-white rounded-lg border border-stone-300 text-stone-800 text-center placeholder:text-stone-300 placeholder:font-normal"
              />
              <span className="text-xs text-stone-500">سم</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">عدد أزرار الياقة</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...tailoringDetails,
                      collar: { ...tailoringDetails.collar, buttonsCount: cnt },
                    })
                  }
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    tailoringDetails.collar.buttonsCount === cnt && (tailoringDetails.collar.type !== '' || cnt > 0)
                      ? 'bg-amber-800 text-white border-amber-800'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {cnt === 0 ? 'بدون' : cnt === 1 ? 'زرار 1' : 'زرارين (2)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Branch 2 Notes */}
        <div className="pt-3 border-t border-stone-200">
          <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            ملاحظات وتخصيص الياقة والقلاب:
          </label>
          <input
            type="text"
            value={tailoringDetails.collar.notes || ''}
            onChange={(e) =>
              onChange({
                ...tailoringDetails,
                collar: { ...tailoringDetails.collar, notes: e.target.value },
              })
            }
            placeholder="اكتب ملاحظات الياقة (مثال: فتحة خفيفة من الأمام، ميلان زاوي 1 سم، حشوة يابانية واقفة...)"
            className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </section>

      {/* 3. SLEEVES / الأكمام */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">3</span>
              تصميم الأكمام والكبك
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">حدد شكل نهاية الكم ونوع القفل أو أدخل تصميماً مخصصاً</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.sleeves.type && tailoringDetails.sleeves.name && tailoringDetails.sleeves.name !== 'غير محدد'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.sleeves.name && tailoringDetails.sleeves.name !== 'غير محدد'
              ? isCustomSleeve
                ? `مخصص: ${tailoringDetails.sleeves.name}`
                : tailoringDetails.sleeves.name
              : 'تصميم الكم مطلوب'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3 mb-4">
          {SLEEVE_OPTIONS_PRESET.map((s) => {
            const isSelected = tailoringDetails.sleeves.type === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...tailoringDetails,
                    sleeves: {
                      ...tailoringDetails.sleeves,
                      type: s.id,
                      name: s.name,
                    },
                  })
                }
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <div className="w-16 h-16 my-1 flex items-center justify-center">
                  {s.id === 'cuff_chamfered' && <CuffChamferedIcon selected={isSelected} />}
                  {s.id === 'cuff_square' && <CuffSquareIcon selected={isSelected} />}
                  {s.id === 'cuff_round' && <CuffRoundIcon selected={isSelected} />}
                  {s.id === 'plain' && <SleevePlainIcon selected={isSelected} />}
                  {s.id === 'hidden_button' && <SleevePlainIcon selected={isSelected} />}
                  {s.id === 'elastic' && <SleeveElasticIcon selected={isSelected} />}
                  {s.id === 'qatari' && <CuffChamferedIcon selected={isSelected} />}
                </div>
                <div className="font-bold text-xs text-stone-900 mt-2">{s.name}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">{s.sub}</div>
              </button>
            );
          })}

          {/* Dedicated Custom Sleeve Card */}
          <button
            type="button"
            onClick={() => {
              onChange({
                ...tailoringDetails,
                sleeves: {
                  ...tailoringDetails.sleeves,
                  type: 'custom',
                  name: isCustomSleeve && tailoringDetails.sleeves.name !== 'غير محدد' ? tailoringDetails.sleeves.name : '',
                },
              });
            }}
            className={`p-3 rounded-xl border-2 border-dashed transition-all flex flex-col items-center text-center relative cursor-pointer ${
              isCustomSleeve
                ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                : 'border-stone-300 bg-stone-50/70 hover:border-amber-600 hover:bg-stone-100'
            }`}
          >
            {isCustomSleeve && (
              <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
            <div className="w-16 h-16 my-1 flex items-center justify-center text-amber-700">
              <Scissors className="w-8 h-8" />
            </div>
            <div className="font-bold text-xs text-amber-950 mt-2">كم مخصص / آخر</div>
            <div className="text-[11px] text-stone-500 mt-0.5">شكل كبك أو كم خاص</div>
          </button>
        </div>

        {/* Custom Sleeve Input */}
        {isCustomSleeve && (
          <div className="mb-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-300 transition-all animate-in fade-in">
            <label className="block text-xs font-black text-amber-950 mb-1.5">
              اسم أو وصف تصميم الكم المخصص * (اكتب الشكل الفعلي للكم)
            </label>
            <input
              type="text"
              autoFocus
              value={tailoringDetails.sleeves.name}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  sleeves: { ...tailoringDetails.sleeves, name: e.target.value },
                })
              }
              placeholder="اكتب شكل الكم (مثال: كم فرنسي مزدوج دبل كبك، كبك مقوس مائل، كم وسيع بكفة مخفية...)"
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-amber-400 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
          </div>
        )}

        {/* Sleeves controls */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">حشوة الكبك</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['stiff', 'medium', 'soft'] as const).map((stiff) => (
                <button
                  key={stiff}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...tailoringDetails,
                      sleeves: { ...tailoringDetails.sleeves, cuffStiffness: stiff },
                    })
                  }
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    tailoringDetails.sleeves.cuffStiffness === stiff
                      ? 'bg-amber-800 text-white border-amber-800'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {stiff === 'stiff' ? 'قاسية' : stiff === 'medium' ? 'وسط' : 'طرية'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">عرض الكبك (سم)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="4"
                max="10"
                value={tailoringDetails.sleeves.cuffWidth ? tailoringDetails.sleeves.cuffWidth : ''}
                placeholder="6.5"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChange({
                    ...tailoringDetails,
                    sleeves: { ...tailoringDetails.sleeves, cuffWidth: isNaN(val) ? 0 : val },
                  });
                }}
                className="w-full px-3 py-1.5 text-sm font-bold bg-white rounded-lg border border-stone-300 text-stone-800 text-center placeholder:text-stone-300 placeholder:font-normal"
              />
              <span className="text-xs text-stone-500">سم</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">نوع قفل الكم</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'stud', label: 'كبك حر' },
                { id: 'visible', label: 'زرار ظاهر' },
                { id: 'hidden', label: 'زرار مخفي' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...tailoringDetails,
                      sleeves: { ...tailoringDetails.sleeves, buttonStyle: item.id as any },
                    })
                  }
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    tailoringDetails.sleeves.buttonStyle === item.id
                      ? 'bg-amber-800 text-white border-amber-800'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Branch 3 Notes */}
        <div className="pt-3 border-t border-stone-200">
          <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            ملاحظات وتخصيص الأكمام والكبك:
          </label>
          <input
            type="text"
            value={tailoringDetails.sleeves.notes || ''}
            onChange={(e) =>
              onChange({
                ...tailoringDetails,
                sleeves: { ...tailoringDetails.sleeves, notes: e.target.value },
              })
            }
            placeholder="اكتب ملاحظات الأكمام (مثال: فتحة زرار كبك مزدوجة، كبك مائل مع درزة رقيقة، كفة كم 3 سم...)"
            className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </section>

      {/* 4. POCKETS / الجيوب */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">4</span>
              الجيوب (الصدر والجوانب)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">تحديد شكل جيب الصدر وجيوب الجوانب ومخبأ الجوال أو تصميم مخصص</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.pockets.chestPocketType
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.pockets.chestPocketType
              ? tailoringDetails.pockets.chestPocketType === 'none'
                ? 'بدون جيب صدر'
                : isCustomPocket
                ? tailoringDetails.pockets.name
                  ? `مخصص: ${tailoringDetails.pockets.name}`
                  : 'جيب مخصص'
                : POCKET_OPTIONS_PRESET.find((p) => p.id === tailoringDetails.pockets.chestPocketType)?.name || 'محدد'
              : 'تصميم الجيوب مطلوب'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {POCKET_OPTIONS_PRESET.map((p) => {
            const isSelected = tailoringDetails.pockets.chestPocketType === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...tailoringDetails,
                    pockets: {
                      ...tailoringDetails.pockets,
                      hasChestPocket: p.id !== 'none',
                      chestPocketType: p.id as any,
                      name: p.name,
                    },
                  })
                }
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <div className="w-16 h-16 my-1 flex items-center justify-center">
                  {p.id === 'chamfered' && <PocketChamferedIcon selected={isSelected} />}
                  {p.id === 'regular' && <PocketSquareIcon selected={isSelected} />}
                  {p.id === 'square_flap' && <PocketFlapIcon selected={isSelected} />}
                  {p.id === 'hidden' && <PocketSquareIcon selected={isSelected} />}
                  {p.id === 'none' && <span className="text-xs font-bold text-stone-400">بدون جيب</span>}
                </div>
                <div className="font-bold text-xs text-stone-900 mt-2">{p.name}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">{p.sub}</div>
              </button>
            );
          })}

          {/* Dedicated Custom Pocket Card */}
          <button
            type="button"
            onClick={() => {
              onChange({
                ...tailoringDetails,
                pockets: {
                  ...tailoringDetails.pockets,
                  hasChestPocket: true,
                  chestPocketType: 'custom',
                  name: isCustomPocket ? (tailoringDetails.pockets.name || '') : '',
                },
              });
            }}
            className={`p-3 rounded-xl border-2 border-dashed transition-all flex flex-col items-center text-center relative cursor-pointer ${
              isCustomPocket
                ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                : 'border-stone-300 bg-stone-50/70 hover:border-amber-600 hover:bg-stone-100'
            }`}
          >
            {isCustomPocket && (
              <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
            <div className="w-16 h-16 my-1 flex items-center justify-center text-amber-700">
              <Scissors className="w-8 h-8" />
            </div>
            <div className="font-bold text-xs text-amber-950 mt-2">جيب مخصص / آخر</div>
            <div className="text-[11px] text-stone-500 mt-0.5">تصميم جيب فريد</div>
          </button>
        </div>

        {/* Custom Pocket Input */}
        {isCustomPocket && (
          <div className="mb-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-300 transition-all animate-in fade-in">
            <label className="block text-xs font-black text-amber-950 mb-1.5">
              اسم وتصميم جيب الصدر المخصص *
            </label>
            <input
              type="text"
              autoFocus
              value={tailoringDetails.pockets.name || ''}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  pockets: { ...tailoringDetails.pockets, name: e.target.value },
                })
              }
              placeholder="اكتب شكل وتصميم الجيب (مثال: جيب دائري مقوس، جيب بسحاب مخفي، جيب قلاب مائل، جيب مزدوج...)"
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-amber-400 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
          </div>
        )}

        {/* Pocket Accessories Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-100/70">
            <input
              type="checkbox"
              checked={tailoringDetails.pockets.hasPenPocket}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  pockets: { ...tailoringDetails.pockets, hasPenPocket: e.target.checked },
                })
              }
              className="w-4 h-4 text-amber-700 rounded focus:ring-amber-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-800">مخبأ قلم بجيب الصدر</div>
              <div className="text-[11px] text-stone-500">فتحة مخصصة لقلم الحبر</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-100/70">
            <input
              type="checkbox"
              checked={tailoringDetails.pockets.hasMobileInnerPocket}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  pockets: { ...tailoringDetails.pockets, hasMobileInnerPocket: e.target.checked },
                })
              }
              className="w-4 h-4 text-amber-700 rounded focus:ring-amber-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-800">مخبأ جوال سري داخلي</div>
              <div className="text-[11px] text-stone-500">جيب داخلي عميق للجوال</div>
            </div>
          </label>

          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs font-bold text-stone-800">جيوب الجوانب:</span>
            <div className="flex gap-1.5">
              {[1, 2].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...tailoringDetails,
                      pockets: { ...tailoringDetails.pockets, sidePocketsCount: num },
                    })
                  }
                  className={`px-3 py-1 text-xs font-bold rounded-lg border cursor-pointer ${
                    tailoringDetails.pockets.sidePocketsCount === num
                      ? 'bg-amber-800 text-white border-amber-800'
                      : 'bg-white text-stone-700 border-stone-300'
                  }`}
                >
                  {num === 1 ? 'جيب واحد' : 'جيبين (2)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Branch 4 Notes */}
        <div className="pt-3 border-t border-stone-200">
          <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            ملاحظات وتخصيص الجيوب (الصدر، الجوانب، مخبأ الجوال):
          </label>
          <input
            type="text"
            value={tailoringDetails.pockets.notes || ''}
            onChange={(e) =>
              onChange({
                ...tailoringDetails,
                pockets: { ...tailoringDetails.pockets, notes: e.target.value },
              })
            }
            placeholder="اكتب ملاحظات الجيوب (مثال: جيب الجوال في اليمين عميق 18 سم، غطاء مقوى لجيب الصدر، جيب داخلي بسحاب...)"
            className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </section>

      {/* 5. CHEST / PLACKET / الصدر والجبزور */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">5</span>
              الصدر والصنجار (الجبزور)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">اختر شكل فتحة الصدر ونوع الصنجار أو اكتب تصميماً مخصصاً</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.chest.placketType && tailoringDetails.chest.name && tailoringDetails.chest.name !== 'غير محدد'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.chest.name && tailoringDetails.chest.name !== 'غير محدد'
              ? isCustomChest
                ? `مخصص: ${tailoringDetails.chest.name}`
                : tailoringDetails.chest.name
              : 'تصميم الصدر مطلوب'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {CHEST_OPTIONS_PRESET.map((ch) => {
            const isSelected = tailoringDetails.chest.placketType === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...tailoringDetails,
                    chest: {
                      ...tailoringDetails.chest,
                      placketType: ch.id as any,
                      name: ch.name,
                    },
                  })
                }
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <div className="w-16 h-16 my-1 flex items-center justify-center">
                  {ch.id === 'visible' && <PlacketVisibleIcon selected={isSelected} />}
                  {ch.id === 'hidden' && <PlacketHiddenIcon selected={isSelected} />}
                  {ch.id === 'wide' && <PlacketVisibleIcon selected={isSelected} />}
                  {ch.id === 'narrow' && <PlacketVisibleIcon selected={isSelected} />}
                  {ch.id === 'embroidered' && <PlacketHiddenIcon selected={isSelected} />}
                </div>
                <div className="font-bold text-xs text-stone-900 mt-2">{ch.name}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">{ch.sub}</div>
              </button>
            );
          })}

          {/* Dedicated Custom Chest Card */}
          <button
            type="button"
            onClick={() => {
              onChange({
                ...tailoringDetails,
                chest: {
                  ...tailoringDetails.chest,
                  placketType: 'custom',
                  name: isCustomChest && tailoringDetails.chest.name !== 'غير محدد' ? tailoringDetails.chest.name : '',
                },
              });
            }}
            className={`p-3 rounded-xl border-2 border-dashed transition-all flex flex-col items-center text-center relative cursor-pointer ${
              isCustomChest
                ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                : 'border-stone-300 bg-stone-50/70 hover:border-amber-600 hover:bg-stone-100'
            }`}
          >
            {isCustomChest && (
              <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
            <div className="w-16 h-16 my-1 flex items-center justify-center text-amber-700">
              <Scissors className="w-8 h-8" />
            </div>
            <div className="font-bold text-xs text-amber-950 mt-2">صدر مخصص / آخر</div>
            <div className="text-[11px] text-stone-500 mt-0.5">شكل جبزور خاص</div>
          </button>
        </div>

        {/* Custom Chest Input */}
        {isCustomChest && (
          <div className="mb-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-300 transition-all animate-in fade-in">
            <label className="block text-xs font-black text-amber-950 mb-1.5">
              اسم وتصميم فتحة الصدر / الجبزور المخصص *
            </label>
            <input
              type="text"
              autoFocus
              value={tailoringDetails.chest.name}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  chest: { ...tailoringDetails.chest, name: e.target.value },
                })
              }
              placeholder="اكتب تصميم الصدر (مثال: جبزور مائل، جبزور مقفل بسحاب نحاسي مخفي، صنجار مغربي مقصب...)"
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-amber-400 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
          </div>
        )}

        {/* Branch 5 Notes */}
        <div className="pt-3 border-t border-stone-200">
          <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            ملاحظات وتخصيص الصدر والصنجار (الجبزور):
          </label>
          <input
            type="text"
            value={tailoringDetails.chest.notes || ''}
            onChange={(e) =>
              onChange({
                ...tailoringDetails,
                chest: { ...tailoringDetails.chest, notes: e.target.value },
              })
            }
            placeholder="اكتب ملاحظات الصدر (مثال: عرض الجبزور 3.5 سم، درزة سفلية مثلثة، كبس سري، تقوية طرف الفتحة...)"
            className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </section>

      {/* 6. BUTTONS / الأزرار */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">6</span>
              الأزرار ونوعيتها
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">اختر خامة الأزرار ولونها أو حدد نوعية خاصة</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.buttons.type && tailoringDetails.buttons.name && tailoringDetails.buttons.name !== 'غير محدد'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.buttons.name && tailoringDetails.buttons.name !== 'غير محدد'
              ? isCustomButton
                ? `مخصص: ${tailoringDetails.buttons.name}`
                : tailoringDetails.buttons.name
              : 'نوع الأزرار مطلوب'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-4">
          {BUTTON_OPTIONS_PRESET.map((btn) => {
            const isSelected = tailoringDetails.buttons.type === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...tailoringDetails,
                    buttons: {
                      ...tailoringDetails.buttons,
                      type: btn.id,
                      name: btn.name,
                      count: btn.count,
                    },
                  })
                }
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                {/* Visual Button Circle */}
                {btn.id === 'none' ? (
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-stone-400 bg-stone-100 flex items-center justify-center my-2 text-stone-600 font-bold text-xs">
                    بدون
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-full border-2 border-stone-300 shadow-sm flex items-center justify-center my-2"
                    style={{ backgroundColor: btn.color }}
                  >
                    <div className="grid grid-cols-2 gap-1">
                      <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                      <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                      <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                      <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                    </div>
                  </div>
                )}
                <div className="font-bold text-xs text-stone-900 mt-1">{btn.name}</div>
              </button>
            );
          })}

          {/* Dedicated Custom Buttons Card */}
          <button
            type="button"
            onClick={() => {
              onChange({
                ...tailoringDetails,
                buttons: {
                  ...tailoringDetails.buttons,
                  type: 'custom',
                  name: isCustomButton && tailoringDetails.buttons.name !== 'غير محدد' ? tailoringDetails.buttons.name : '',
                },
              });
            }}
            className={`p-3 rounded-xl border-2 border-dashed transition-all flex flex-col items-center text-center relative cursor-pointer ${
              isCustomButton
                ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                : 'border-stone-300 bg-stone-50/70 hover:border-amber-600 hover:bg-stone-100'
            }`}
          >
            {isCustomButton && (
              <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-600 bg-amber-100/60 flex items-center justify-center my-2 text-amber-800">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="font-bold text-xs text-amber-950 mt-1">أزرار مخصصة / أخرى</div>
          </button>
        </div>

        {/* Custom Button Input */}
        {isCustomButton && (
          <div className="mb-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-300 transition-all animate-in fade-in">
            <label className="block text-xs font-black text-amber-950 mb-1.5">
              نوع أو خامة ولون الأزرار المخصصة *
            </label>
            <input
              type="text"
              autoFocus
              value={tailoringDetails.buttons.name}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  buttons: { ...tailoringDetails.buttons, name: e.target.value },
                })
              }
              placeholder="اكتب نوع الأزرار (مثال: صدفي طبيعي محفور بالليزر، عاجي ملكي مذهب، خشبي إيطالي...)"
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-amber-400 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
          </div>
        )}

        {/* Branch 6 Notes & Details */}
        <div className="pt-3 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              ملاحظات وتخصيص الأزرار:
            </label>
            <input
              type="text"
              value={tailoringDetails.buttons.notes || ''}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  buttons: { ...tailoringDetails.buttons, notes: e.target.value },
                })
              }
              placeholder="اكتب ملاحظات الأزرار (مثال: خياطة متينة X، وضع زرارين إضافيين في الجيب...)"
              className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 mb-1.5 block">
              لون خيط تثبيت الأزرار:
            </label>
            <input
              type="text"
              value={tailoringDetails.buttons.stitchColor || ''}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  buttons: { ...tailoringDetails.buttons, stitchColor: e.target.value },
                })
              }
              placeholder="نفس لون القماش / أبيض / صدفي..."
              className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
            />
          </div>
        </div>
      </section>

      {/* 7. BOTTOM & HEM / أسفل الثوب والتشطيب */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">7</span>
              أسفل الثوب (الكف والفتحات)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">تشطيب الداير والفتحات الجانبية أو تشطيب مخصص</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.bottom.finishType && tailoringDetails.bottom.name && tailoringDetails.bottom.name !== 'غير محدد'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.bottom.name && tailoringDetails.bottom.name !== 'غير محدد'
              ? isCustomBottom
                ? `مخصص: ${tailoringDetails.bottom.name}`
                : tailoringDetails.bottom.name
              : 'تشطيب أسفل الثوب مطلوب'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {BOTTOM_OPTIONS_PRESET.map((b) => {
            const isSelected = tailoringDetails.bottom.finishType === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...tailoringDetails,
                    bottom: {
                      ...tailoringDetails.bottom,
                      finishType: b.id as any,
                      name: b.name,
                    },
                  })
                }
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <div className="w-16 h-16 my-1 flex items-center justify-center">
                  {b.id === 'wide_hem' && <BottomWideHemIcon selected={isSelected} />}
                  {b.id === 'narrow_hem' && <BottomWideHemIcon selected={isSelected} />}
                  {b.id === 'curved' && <BottomWideHemIcon selected={isSelected} />}
                  {b.id === 'side_slits' && <BottomSlitsIcon selected={isSelected} />}
                </div>
                <div className="font-bold text-xs text-stone-900 mt-2">{b.name}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">{b.sub}</div>
              </button>
            );
          })}

          {/* Dedicated Custom Bottom Card */}
          <button
            type="button"
            onClick={() => {
              onChange({
                ...tailoringDetails,
                bottom: {
                  ...tailoringDetails.bottom,
                  finishType: 'custom',
                  name: isCustomBottom && tailoringDetails.bottom.name !== 'غير محدد' ? tailoringDetails.bottom.name : '',
                },
              });
            }}
            className={`p-3 rounded-xl border-2 border-dashed transition-all flex flex-col items-center text-center relative cursor-pointer ${
              isCustomBottom
                ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/10'
                : 'border-stone-300 bg-stone-50/70 hover:border-amber-600 hover:bg-stone-100'
            }`}
          >
            {isCustomBottom && (
              <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
            <div className="w-16 h-16 my-1 flex items-center justify-center text-amber-700">
              <Scissors className="w-8 h-8" />
            </div>
            <div className="font-bold text-xs text-amber-950 mt-2">تشطيب مخصص / آخر</div>
            <div className="text-[11px] text-stone-500 mt-0.5">تفصيل داير خاص</div>
          </button>
        </div>

        {/* Custom Bottom Input */}
        {isCustomBottom && (
          <div className="mb-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-300 transition-all animate-in fade-in">
            <label className="block text-xs font-black text-amber-950 mb-1.5">
              اسم أو وصف تشطيب أسفل الثوب المخصص *
            </label>
            <input
              type="text"
              autoFocus
              value={tailoringDetails.bottom.name}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  bottom: { ...tailoringDetails.bottom, name: e.target.value },
                })
              }
              placeholder="اكتب تفاصيل أسفل الثوب (مثال: كف داخلي عريض 5 سم مخفي، كلوش واسع جداً، دبل درزة سفلية...)"
              className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-amber-400 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
          </div>
        )}

        {/* Branch 7 Notes */}
        <div className="pt-3 border-t border-stone-200">
          <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            ملاحظات وتخصيص أسفل الثوب والداير والفتحات:
          </label>
          <input
            type="text"
            value={tailoringDetails.bottom.notes || ''}
            onChange={(e) =>
              onChange({
                ...tailoringDetails,
                bottom: { ...tailoringDetails.bottom, notes: e.target.value },
              })
            }
            placeholder="اكتب ملاحظات أسفل الثوب (مثال: كف داخلي عريض 4 سم، تطريز مخفي، فتحة جانبية بطول 5 سم...)"
            className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </section>

      {/* 8. EMBROIDERY & SPECIAL OPTIONS / التطريز والإضافات */}
      <section className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">8</span>
              التطريز والإضافات الخاصة
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">درزات مزدوجة، لون خيط الخياطة، بطانات إضافية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <label className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-100">
            <input
              type="checkbox"
              checked={tailoringDetails.specialOptions?.doubleStitching || false}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  specialOptions: { ...tailoringDetails.specialOptions, doubleStitching: e.target.checked },
                })
              }
              className="w-4 h-4 text-amber-700 rounded focus:ring-amber-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-900">درزة مزدوجة (دبل درزة)</div>
              <div className="text-[11px] text-stone-500">خياطة خطين متوازيين للتميز</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-100">
            <input
              type="checkbox"
              checked={tailoringDetails.specialOptions?.extraLining || false}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  specialOptions: { ...tailoringDetails.specialOptions, extraLining: e.target.checked },
                })
              }
              className="w-4 h-4 text-amber-700 rounded focus:ring-amber-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-900">بطانة داخلية إضافية</div>
              <div className="text-[11px] text-stone-500">حماية وثبات لمنطقة الصدر والأكتاف</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-100">
            <input
              type="checkbox"
              checked={tailoringDetails.embroidery.hasEmbroidery}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  embroidery: { ...tailoringDetails.embroidery, hasEmbroidery: e.target.checked },
                })
              }
              className="w-4 h-4 text-amber-700 rounded focus:ring-amber-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-900">تطريز ونقش خاص</div>
              <div className="text-[11px] text-stone-500">نقش كمبيوتر أو يدوي على الياقة/الكبك</div>
            </div>
          </label>
        </div>

        {/* Branch 8 Notes (Embroidery & Special Options) */}
        <div className="pt-3 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              ملاحظات التطريز والنقش:
            </label>
            <input
              type="text"
              value={tailoringDetails.embroidery.notes || ''}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  embroidery: { ...tailoringDetails.embroidery, notes: e.target.value },
                })
              }
              placeholder="اكتب تفاصيل التطريز (مثال: تطريز الاسم بالذهب الناعم، نقش مثلثات على الكبك...)"
              className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              ملاحظات الإضافات والدرزات الخاصة:
            </label>
            <input
              type="text"
              value={tailoringDetails.specialOptions?.customNotes || ''}
              onChange={(e) =>
                onChange({
                  ...tailoringDetails,
                  specialOptions: { ...tailoringDetails.specialOptions, customNotes: e.target.value },
                })
              }
              placeholder="اكتب أي طلبات خاصة (مثال: تقوية الصدر بحشوة فرنسية، خيط بريطاني...)"
              className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* General Tailoring Instructions Notes */}
        <div className="pt-3 border-t border-stone-200">
          <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-800" />
            ملاحظات وتعليمات الخياطة العامة لأمر التفصيل:
          </label>
          <textarea
            rows={2}
            value={tailoringDetails.generalNotes || ''}
            onChange={(e) => onChange({ ...tailoringDetails, generalNotes: e.target.value })}
            placeholder="اكتب تعليمات شاملة للخياط والمعلم (مثال: يرجى شد الخياطة جيداً، كوي على البخار قبل التسليم، تجهيز كرتون حفظ للياقة، تسليم مبكر...)"
            className="w-full px-3.5 py-2 text-xs bg-amber-50/50 rounded-xl border border-amber-300/80 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </section>
    </div>
  );
};

