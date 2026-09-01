import React from 'react';
import { MeasurementData } from '../../types';

interface ThobeMeasurementFigureProps {
  measurements: MeasurementData;
  selectedField: keyof MeasurementData | null;
  onSelectField: (field: keyof MeasurementData) => void;
  unit?: string;
  readOnly?: boolean;
}

export const ThobeMeasurementFigure: React.FC<ThobeMeasurementFigureProps> = ({
  measurements,
  selectedField,
  onSelectField,
  unit = 'سم',
}) => {
  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4 rounded-2xl border border-slate-800 text-slate-100 shadow-xl select-none">
      <div className="w-full flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-wider text-slate-300">مخطط المقاسات التفاعلي</span>
        </div>
        <span className="text-[11px] bg-slate-800/90 px-2 py-0.5 rounded text-slate-400 border border-slate-700">انقر على النقطة للتعديل</span>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[1/1.6] max-h-[460px] flex items-center justify-center">
        <svg
          viewBox="0 0 300 480"
          className="w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Grid Background */}
          <line x1="150" y1="20" x2="150" y2="460" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
          <line x1="30" y1="95" x2="270" y2="95" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 4" />
          <line x1="30" y1="160" x2="270" y2="160" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 4" />
          <line x1="30" y1="230" x2="270" y2="230" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 4" />

          {/* Head & Neck silhouette */}
          <circle cx="150" cy="40" r="18" fill="#334155" opacity="0.4" />
          <path d="M142 58 L142 75 L158 75 L158 58" fill="#475569" opacity="0.6" />

          {/* Thobe Main Body Outline */}
          {/* Shoulder -> Sleeves -> Underarm -> Waist -> Flare to Bottom */}
          <path
            d="
              M 132 75
              L 75 92
              L 35 220
              L 55 228
              L 90 140
              L 100 210
              L 95 300
              L 70 450
              L 230 450
              L 205 300
              L 200 210
              L 210 140
              L 245 228
              L 265 220
              L 225 92
              L 168 75
              Z
            "
            fill={selectedField === 'length' ? '#1e293b' : '#0f172a'}
            stroke={selectedField === 'length' ? '#3b82f6' : '#64748b'}
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-colors duration-300"
          />

          {/* Chest Placket (الجبزور) */}
          <rect
            x="144"
            y="75"
            width="12"
            height="110"
            rx="1"
            fill={selectedField === 'placketLength' ? '#3b82f6' : '#334155'}
            stroke={selectedField === 'placketLength' ? '#60a5fa' : '#64748b'}
            strokeWidth="1.5"
          />
          {/* Buttons on Placket */}
          <circle cx="150" cy="95" r="2" fill="#e2e8f0" />
          <circle cx="150" cy="115" r="2" fill="#e2e8f0" />
          <circle cx="150" cy="135" r="2" fill="#e2e8f0" />
          <circle cx="150" cy="155" r="2" fill="#e2e8f0" />
          <circle cx="150" cy="175" r="2" fill="#e2e8f0" />

          {/* Chest Pocket */}
          <path
            d="M 172 130 L 194 130 L 194 158 L 183 165 L 172 158 Z"
            fill={selectedField === 'pocketLength' || selectedField === 'pocketPlacement' ? '#1e3a8a' : '#334155'}
            stroke={selectedField === 'pocketLength' ? '#3b82f6' : '#64748b'}
            strokeWidth="1.5"
          />

          {/* Side Pocket Slits */}
          <line x1="97" y1="250" x2="94" y2="295" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="3 3" />
          <line x1="203" y1="250" x2="206" y2="295" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="3 3" />

          {/* Measurement Highlight Guides */}
          {/* 1. Shoulder Guide */}
          {selectedField === 'shoulder' && (
            <g>
              <line x1="75" y1="86" x2="225" y2="86" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="75" cy="86" r="4" fill="#3b82f6" />
              <circle cx="225" cy="86" r="4" fill="#3b82f6" />
            </g>
          )}

          {/* 2. Sleeve Length Guide */}
          {selectedField === 'sleeveLength' && (
            <g>
              <line x1="75" y1="92" x2="45" y2="224" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 2" />
              <circle cx="75" cy="92" r="4" fill="#3b82f6" />
              <circle cx="45" cy="224" r="4" fill="#3b82f6" />
            </g>
          )}

          {/* 3. Full Length Guide */}
          {selectedField === 'length' && (
            <g>
              <line x1="130" y1="75" x2="130" y2="450" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 2" />
              <circle cx="130" cy="75" r="4" fill="#3b82f6" />
              <circle cx="130" cy="450" r="4" fill="#3b82f6" />
            </g>
          )}

          {/* 4. Chest Guide */}
          {selectedField === 'chest' && (
            <g>
              <line x1="90" y1="160" x2="210" y2="160" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="90" cy="160" r="4" fill="#3b82f6" />
              <circle cx="210" cy="160" r="4" fill="#3b82f6" />
            </g>
          )}

          {/* 5. Waist Guide */}
          {selectedField === 'waist' && (
            <g>
              <line x1="100" y1="210" x2="200" y2="210" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="100" cy="210" r="4" fill="#3b82f6" />
              <circle cx="200" cy="210" r="4" fill="#3b82f6" />
            </g>
          )}

          {/* 6. Bottom Width (الداير) Guide */}
          {selectedField === 'bottomWidth' && (
            <g>
              <line x1="70" y1="452" x2="230" y2="452" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 2" />
              <circle cx="70" cy="452" r="4" fill="#3b82f6" />
              <circle cx="230" cy="452" r="4" fill="#3b82f6" />
            </g>
          )}
        </svg>

        {/* INTERACTIVE HOTSPOT BUTTONS OVERLAY */}
        {/* 1. Neck / الرقبة */}
        <button
          type="button"
          onClick={() => onSelectField('neck')}
          className={`absolute top-[13%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold transition-all shadow-md ${
            selectedField === 'neck'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/30 scale-110 z-20'
              : 'bg-slate-800/90 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          الرقبة: {measurements.neck || '--'} {unit}
        </button>

        {/* 2. Shoulder / الكتف */}
        <button
          type="button"
          onClick={() => onSelectField('shoulder')}
          className={`absolute top-[18%] left-[72%] -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold transition-all shadow-md ${
            selectedField === 'shoulder'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/30 scale-110 z-20'
              : 'bg-slate-800/90 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          الكتف: {measurements.shoulder || '--'} {unit}
        </button>

        {/* 3. Armhole / الجيرو */}
        <button
          type="button"
          onClick={() => onSelectField('armhole')}
          className={`absolute top-[28%] right-[16%] px-1.5 py-0.5 rounded-full text-[11px] font-semibold transition-all shadow-md ${
            selectedField === 'armhole'
              ? 'bg-blue-500 text-white ring-2 ring-blue-500/30 z-20'
              : 'bg-slate-800/80 text-slate-300 hover:bg-blue-700 hover:text-white border border-slate-700'
          }`}
        >
          الجيرو: {measurements.armhole || '--'}
        </button>

        {/* 4. Sleeve Length / طول الكم */}
        <button
          type="button"
          onClick={() => onSelectField('sleeveLength')}
          className={`absolute top-[35%] left-[2%] px-2 py-0.5 rounded-full text-xs font-bold transition-all shadow-md ${
            selectedField === 'sleeveLength'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/30 scale-110 z-20'
              : 'bg-slate-800/90 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          طول الكم: {measurements.sleeveLength || '--'} {unit}
        </button>

        {/* 5. Wrist / الكبك / المعصم */}
        <button
          type="button"
          onClick={() => onSelectField('wrist')}
          className={`absolute top-[48%] left-[2%] px-1.5 py-0.5 rounded-full text-xs font-bold transition-all shadow-md ${
            selectedField === 'wrist'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/30 scale-110 z-20'
              : 'bg-slate-800/90 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          الكبك: {measurements.wrist || '--'}
        </button>

        {/* 6. Chest / الصدر */}
        <button
          type="button"
          onClick={() => onSelectField('chest')}
          className={`absolute top-[34%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold transition-all shadow-md ${
            selectedField === 'chest'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/30 scale-110 z-20'
              : 'bg-slate-800/90 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          الصدر: {measurements.chest || '--'} {unit}
        </button>

        {/* 7. Waist / الخصر */}
        <button
          type="button"
          onClick={() => onSelectField('waist')}
          className={`absolute top-[45%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold transition-all shadow-md ${
            selectedField === 'waist'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/30 scale-110 z-20'
              : 'bg-slate-800/90 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          الخصر: {measurements.waist || '--'} {unit}
        </button>

        {/* 8. Hips / الوسط */}
        <button
          type="button"
          onClick={() => onSelectField('hips')}
          className={`absolute top-[57%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold transition-all shadow-md ${
            selectedField === 'hips'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/30 scale-110 z-20'
              : 'bg-slate-800/90 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          الوسط/الأرداف: {measurements.hips || '--'}
        </button>

        {/* 9. Full Length / طول الثوب */}
        <button
          type="button"
          onClick={() => onSelectField('length')}
          className={`absolute bottom-[16%] right-[8%] px-2.5 py-1 rounded-full text-xs font-black transition-all shadow-lg ${
            selectedField === 'length'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/40 scale-110 z-20'
              : 'bg-slate-800/90 text-blue-300 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          طول الثوب: {measurements.length || '--'} {unit}
        </button>

        {/* 10. Bottom Width / وسع الداير */}
        <button
          type="button"
          onClick={() => onSelectField('bottomWidth')}
          className={`absolute bottom-[2%] left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all shadow-md ${
            selectedField === 'bottomWidth'
              ? 'bg-blue-500 text-white ring-4 ring-blue-500/30 scale-110 z-20'
              : 'bg-slate-800/90 text-slate-200 hover:bg-blue-600 hover:text-white border border-slate-700'
          }`}
        >
          وسع أسفل الثوب (الداير): {measurements.bottomWidth || '--'} {unit}
        </button>
      </div>

      {/* Selected Indicator Bar */}
      <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span>العنصر المحدد:</span>
        <span className="font-bold text-blue-400">
          {selectedField ? (
            selectedField === 'length' ? 'طول الثوب الكامل' :
            selectedField === 'shoulder' ? 'عرض الكتف' :
            selectedField === 'chest' ? 'محيط الصدر' :
            selectedField === 'waist' ? 'محيط الخصر' :
            selectedField === 'hips' ? 'محيط الأرداف' :
            selectedField === 'sleeveLength' ? 'طول الكم' :
            selectedField === 'wrist' ? 'محيط المعصم/الكبك' :
            selectedField === 'neck' ? 'محيط الرقبة/الياقة' :
            selectedField === 'bottomWidth' ? 'وسع الداير السفلي' :
            selectedField === 'armhole' ? 'فتحة الإبط / الجيرو' : selectedField
          ) : 'انقر على أي قياس لعرضه'}
        </span>
      </div>
    </div>
  );
};
