import React from 'react';
import { FabricDetails } from '../../types';
import { FABRICS_PRESET } from '../../utils/presets';
import { Check, Tag, Palette, FileText, UserCheck, Scissors, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FabricSelectorProps {
  fabric: FabricDetails;
  onChange: (fabric: FabricDetails) => void;
}

const COLOR_SWATCHES = [
  { name: 'أبيض ثلجي ناصع', code: '#FFFFFF', border: '#E2E8F0' },
  { name: 'أبيض طبيعي (سكر خفيف)', code: '#FAF9F6', border: '#E2E8F0' },
  { name: 'كريمي فاتح (زبدي)', code: '#FBF4E4', border: '#E5DCC5' },
  { name: 'بيج صحراوي راقي', code: '#E8D8C0', border: '#D0BF9F' },
  { name: 'رصاصي / فضي فاتح', code: '#E2E8F0', border: '#CBD5E1' },
  { name: 'رمادي غامق / فحمي', code: '#475569', border: '#334155' },
  { name: 'كحلي ملكي داكن', code: '#1E293B', border: '#0F172A' },
  { name: 'أسود داكن', code: '#0F172A', border: '#020617' },
  { name: 'زيتي شتوي', code: '#2D3A27', border: '#1C2618' },
  { name: 'بني عودي شتوي', code: '#3E2723', border: '#271714' },
];

export const FabricSelector: React.FC<FabricSelectorProps> = ({ fabric, onChange }) => {
  const isCustomerFabric = fabric.name === 'قماش تم إحضاره من العميل' || fabric.code === 'CUST-01';
  const isNoFabric = fabric.name === 'بدون تسجيل قماش (تفصيل فقط / قماش لاحق)' || fabric.code === 'NO-FABRIC';
  const isPresetFabric = FABRICS_PRESET.some((f) => f.name === fabric.name);
  const hasCustomFabricName = Boolean(fabric.name && !isPresetFabric && !isCustomerFabric && !isNoFabric);

  // Dedicated stable state for custom fabric mode
  const [isCustomFabricMode, setIsCustomFabricMode] = React.useState<boolean>(() => {
    return hasCustomFabricName || fabric.type === 'قماش مخصص';
  });

  // Dedicated stable state for custom color mode
  const isPresetColor = COLOR_SWATCHES.some((s) => s.name === fabric.color);
  const hasCustomColor = Boolean(fabric.color && !isPresetColor);
  const [isCustomColorMode, setIsCustomColorMode] = React.useState<boolean>(() => {
    return hasCustomColor;
  });

  // Sync state if preset or customer fabric is applied from props
  React.useEffect(() => {
    if (isPresetFabric || isCustomerFabric || isNoFabric) {
      setIsCustomFabricMode(false);
    } else if (hasCustomFabricName) {
      setIsCustomFabricMode(true);
    }
  }, [fabric.name, isPresetFabric, isCustomerFabric, isNoFabric, hasCustomFabricName]);

  React.useEffect(() => {
    if (isPresetColor) {
      setIsCustomColorMode(false);
    } else if (hasCustomColor) {
      setIsCustomColorMode(true);
    }
  }, [fabric.color, isPresetColor, hasCustomColor]);

  const isCustomFabricActive = isCustomFabricMode || hasCustomFabricName;
  const isCustomColorActive = isCustomColorMode || hasCustomColor;

  return (
    <div className="space-y-6">
      {/* Quick Choice / Special Source Badges */}
      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700">خيارات ومصدر القماش السريعة:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsCustomFabricMode(false);
              onChange({
                ...fabric,
                name: 'قماش تم إحضاره من العميل',
                code: 'CUST-01',
                type: 'قماش خارجي من العميل',
                color: fabric.color && fabric.color !== 'غير محدد' ? fabric.color : 'حسب قماش العميل',
                season: 'all',
                notes: fabric.notes || 'قماش مستلم مباشرة من العميل',
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isCustomerFabric
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>قماش تم إحضاره من العميل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCustomFabricMode(false);
              onChange({
                ...fabric,
                name: 'بدون تسجيل قماش (تفصيل فقط / قماش لاحق)',
                code: 'NO-FABRIC',
                type: 'تفصيل وخياطة فقط',
                color: 'غير محدد',
                season: 'all',
                notes: fabric.notes || 'تفصيل فقط بدون احتساب القماش من المحل',
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isNoFabric
                ? 'bg-stone-800 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>بدون تسجيل قماش (تفصيل فقط)</span>
          </button>
        </div>
      </div>

      {/* 1. Saved Preset Fabrics & Custom Fabric Option */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-700" />
              اختيار نوع القماش المتوفر أو كتابة قماش مخصص
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              الخيارات الجاهزة للاختيار السريع وليست إلزامية — يمكنك اختيار قماش جاهز وتعديله أو كتابة نوع مخصص تماماً
            </p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              fabric.name && fabric.name !== 'أخرى' && fabric.name !== 'قماش مخصص'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {fabric.name && fabric.name !== 'أخرى' && fabric.name !== 'قماش مخصص'
              ? isCustomFabricActive
                ? `مخصص: ${fabric.name}`
                : fabric.name
              : isCustomFabricActive
              ? 'اكتب نوع القماش'
              : 'نوع القماش مطلوب'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FABRICS_PRESET.map((f, i) => {
            const isSelected = fabric.name === f.name;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setIsCustomFabricMode(false);
                  onChange({
                    ...fabric,
                    name: f.name,
                    code: f.code,
                    season: f.season as any,
                    type: f.type,
                    color: fabric.color || f.color || '',
                  });
                }}
                className={`p-3.5 rounded-xl border-2 text-right transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/70 shadow-xs ring-2 ring-amber-700/10'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 left-3 w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
                <div>
                  <div className="font-bold text-sm text-stone-900">{f.name}</div>
                  <div className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                    <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">{f.type}</span>
                    <span>{f.season === 'summer' ? 'صيفي' : f.season === 'winter' ? 'شتوي' : 'طوال العام'}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span>الكود: {f.code}</span>
                  <span className="text-amber-800 font-bold">اختيار</span>
                </div>
              </button>
            );
          })}

          {/* Dedicated Custom Fabric Card */}
          <button
            type="button"
            onClick={() => {
              setIsCustomFabricMode(true);
              const currentIsPresetOrSpecial = isPresetFabric || isCustomerFabric || isNoFabric;
              onChange({
                ...fabric,
                name: currentIsPresetOrSpecial ? '' : fabric.name,
                code: currentIsPresetOrSpecial ? 'CUSTOM-FAB' : (fabric.code || 'CUSTOM-FAB'),
                type: 'قماش مخصص',
              });
            }}
            className={`p-3.5 rounded-xl border-2 border-dashed text-right transition-all relative flex flex-col justify-between cursor-pointer ${
              isCustomFabricActive
                ? 'border-amber-700 bg-amber-50 shadow-xs ring-2 ring-amber-700/10'
                : 'border-stone-300 bg-stone-50/70 hover:bg-stone-100 hover:border-amber-600'
            }`}
          >
            {isCustomFabricActive && (
              <span className="absolute top-3 left-3 w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
            <div>
              <div className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-amber-700" />
                قماش مخصص / نوع آخر
              </div>
              <div className="text-xs text-stone-600 mt-1 leading-relaxed">
                كتابة اسم ونوع القماش غير المدرج في القائمة أعلاه
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-amber-800 font-bold">
              <span>{isCustomFabricActive ? 'محدد حالياً' : 'كتابة يدوية'}</span>
              <span>تحديد ✍️</span>
            </div>
          </button>
        </div>

        {/* Custom Fabric Name Highlighted Input - Guaranteed to stay visible while in custom mode */}
        {isCustomFabricActive && (
          <div className="mt-4 p-4 bg-amber-50/80 rounded-xl border border-amber-300 transition-all animate-in fade-in">
            <label className="block text-xs font-black text-amber-950 mb-1.5">
              اسم أو نوع القماش المخصص * (اكتب الاسم الفعلي للقماش)
            </label>
            <input
              type="text"
              autoFocus
              value={fabric.name}
              onChange={(e) => onChange({ ...fabric, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-amber-400 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
              placeholder="مثال: ياباني سوبر فاخر"
            />
            <p className="text-[11px] text-amber-800 mt-1">
              سيتم حفظ هذا الاسم كما كتبته تماماً في الطلب وكافة مستندات الطباعة.
            </p>
          </div>
        )}
      </div>

      {/* 2. Color Swatches & Custom Color / Code Input */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-700" />
              لون القماش والكود
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              الألوان الجاهزة للاختيار السريع — يمكنك اختيار لون جاهز أو كتابة أي درجة مخصصة بدقة
            </p>
          </div>
          {fabric.color && (
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <div
                className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-xs"
                style={{ backgroundColor: fabric.colorCode || '#FAF9F6' }}
              />
              <span className="text-xs font-bold text-amber-900">{fabric.color}</span>
              {fabric.colorCode && (
                <span className="text-[10px] text-stone-500 font-mono">({fabric.colorCode})</span>
              )}
            </div>
          )}
        </div>

        {/* Preset Color Swatches + Custom Color Button */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 my-3">
          {COLOR_SWATCHES.map((swatch, idx) => {
            const isSelected = fabric.color === swatch.name;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIsCustomColorMode(false);
                  onChange({ ...fabric, color: swatch.name, colorCode: swatch.code });
                }}
                className={`p-2 rounded-xl border-2 flex items-center gap-2 transition-all text-right cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50 ring-2 ring-amber-700/10 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full shrink-0 shadow-xs border"
                  style={{ backgroundColor: swatch.code, borderColor: swatch.border }}
                />
                <span className="text-xs font-bold text-stone-800 line-clamp-1">{swatch.name}</span>
              </button>
            );
          })}

          {/* Quick Custom Color Trigger Button */}
          <button
            type="button"
            onClick={() => {
              setIsCustomColorMode(true);
              if (isPresetColor) {
                onChange({ ...fabric, color: '', colorCode: '' });
              }
            }}
            className={`p-2 rounded-xl border-2 border-dashed flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isCustomColorActive
                ? 'border-amber-700 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-700/10 shadow-xs'
                : 'border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium'
            }`}
          >
            <Palette className="w-4 h-4 text-amber-700" />
            <span className="text-xs">لون مخصص / آخر</span>
          </button>
        </div>

        {/* Custom Color Name and Color Code Input Fields */}
        <div className={`mt-4 pt-4 border-t rounded-xl p-4 transition-all ${
          isCustomColorActive ? 'bg-amber-50/70 border-amber-300' : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="text-xs font-bold text-stone-800 mb-2 flex items-center justify-between">
            <span>كتابة أو تعديل لون القماش بدقة (يمكنك كتابة أي درجة أو كود صبغة):</span>
            <span className="text-[11px] text-stone-500 font-normal">اختيار لون جاهز يضعه هنا لتعديله بحرية</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-700 mb-1.5">اسم أو وصف اللون المطلوب *</label>
              <input
                type="text"
                value={fabric.color}
                onChange={(e) => onChange({ ...fabric, color: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-stone-300 font-bold text-stone-900 focus:border-amber-700 focus:outline-none"
                placeholder="مثال: أبيض مزرق، سكري رملي، رمادي دخاني..."
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-700 mb-1.5">كود أو رقم اللون / الصبغة</label>
              <input
                type="text"
                value={fabric.colorCode || ''}
                onChange={(e) => onChange({ ...fabric, colorCode: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none font-mono text-stone-800"
                placeholder="مثال: #FAF9F6 أو صبغة 204/C"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-700 mb-1.5">منتقي اللون البصري</label>
              <div className="flex items-center gap-2 h-[34px]">
                <input
                  type="color"
                  value={fabric.colorCode?.startsWith('#') && fabric.colorCode.length === 7 ? fabric.colorCode : '#FAF9F6'}
                  onChange={(e) => onChange({ ...fabric, colorCode: e.target.value })}
                  className="w-10 h-8 rounded-lg cursor-pointer border border-stone-300 p-0.5 bg-white"
                />
                <span className="text-xs text-stone-600">اختر الدرجة اللونية</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Custom Fabric Input / Details & Notes */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h4 className="font-black text-sm text-stone-900 mb-3">تخصيص بيانات القماش والمورد والملاحظات</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">اسم القماش / العلامة</label>
            <input
              type="text"
              value={fabric.name}
              onChange={(e) => onChange({ ...fabric, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-stone-50 rounded-xl border border-stone-300 font-bold focus:bg-white focus:border-amber-700 focus:outline-none"
              placeholder="مثال: ريتشي ياباني أصلي"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">رقم الطاقة / القطعة (الكود)</label>
            <input
              type="text"
              value={fabric.code || ''}
              onChange={(e) => onChange({ ...fabric, code: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none"
              placeholder="مثال: TA-4099"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">مورد القماش / المحل</label>
            <input
              type="text"
              value={fabric.supplier || ''}
              onChange={(e) => onChange({ ...fabric, supplier: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none"
              placeholder="مثال: شركة الجديعي للأقمشة"
            />
          </div>
        </div>

        {/* Fabric Branch Notes */}
        <div className="pt-3 border-t border-stone-200">
          <label className="text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            ملاحظات القماش والغسيل والقص:
          </label>
          <input
            type="text"
            value={fabric.notes || ''}
            onChange={(e) => onChange({ ...fabric, notes: e.target.value })}
            placeholder="اكتب ملاحظات القماش (مثال: قماش مسبق الغسيل، اتجاه النسيج طولي، يحتاج كي بالبخار فقط...)"
            className="w-full px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </div>
    </div>
  );
};

