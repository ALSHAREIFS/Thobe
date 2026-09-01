import React from 'react';
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
import { Check, FileText, Sparkles, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VisualOptionSelectorProps {
  tailoringDetails: TailoringDetails;
  onChange: (updated: TailoringDetails) => void;
}

export const VisualOptionSelector: React.FC<VisualOptionSelectorProps> = ({
  tailoringDetails,
  onChange,
}) => {
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
            onClick={() => onChange(DEFAULT_TAILORING_DETAILS)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            تطبيق قالب الثوب السعودي الرسمي
          </button>
          {tailoringDetails.garmentType && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_TAILORING_DETAILS)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 rounded-xl text-xs font-medium transition-all"
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
                ? 'اكتملت جميع خيارات التفصيل الأساسية (7/7)'
                : `خيارات التفصيل الأساسية المطلوبة (${completedCount}/${totalRequired}):`}
            </div>
            {!validation.isValid && (
              <div className="text-[11px] text-amber-800 mt-0.5">
                يرجى تحديد: {validation.missingFields.join(' • ')}
              </div>
            )}
          </div>
        </div>
        <div
          className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
            validation.isValid
              ? 'bg-emerald-200/60 text-emerald-900'
              : 'bg-amber-200/60 text-amber-900'
          }`}
        >
          {completedCount} من {totalRequired} مكتمل
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
            <p className="text-xs text-stone-500 mt-0.5">اختر الستايل العام ونمط التفصيل</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.garmentType
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.garmentType || 'غير محدد (مطلوب)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {GARMENT_TYPES_PRESET.map((g) => {
            const isSelected = tailoringDetails.garmentType === g.name;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onChange({ ...tailoringDetails, garmentType: g.name })}
                className={`text-right p-3.5 rounded-xl border-2 transition-all relative flex flex-col justify-between ${
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
        </div>

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
            <p className="text-xs text-stone-500 mt-0.5">اختر شكل الياقة ومستوى قساوة الحشوة</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.collar.type
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.collar.name || 'غير محدد (مطلوب)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
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
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative ${
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
        </div>

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
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
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
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
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
            <p className="text-xs text-stone-500 mt-0.5">حدد شكل نهاية الكم ونوع القفل</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.sleeves.type
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.sleeves.name || 'غير محدد (مطلوب)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
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
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative ${
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
        </div>

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
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
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
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
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
            <p className="text-xs text-stone-500 mt-0.5">تحديد شكل جيب الصدر وجيوب الجوانب ومخبأ الجوال</p>
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
                : POCKET_OPTIONS_PRESET.find((p) => p.id === tailoringDetails.pockets.chestPocketType)?.name || 'محدد'
              : 'غير محدد (مطلوب)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
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
                    },
                  })
                }
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative ${
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
        </div>

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
                  className={`px-3 py-1 text-xs font-bold rounded-lg border ${
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
            <p className="text-xs text-stone-500 mt-0.5">اختر شكل فتحة الصدر ونوع الصنجار</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.chest.placketType
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.chest.name || 'غير محدد (مطلوب)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
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
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative ${
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
        </div>

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
            <p className="text-xs text-stone-500 mt-0.5">اختر خامة الأزرار ولونها</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.buttons.type
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.buttons.name || 'غير محدد (مطلوب)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
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
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative ${
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
        </div>

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
            <p className="text-xs text-stone-500 mt-0.5">تشطيب الداير والفتحات الجانبية</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              tailoringDetails.bottom.finishType
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {tailoringDetails.bottom.name || 'غير محدد (مطلوب)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center relative ${
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
        </div>

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

