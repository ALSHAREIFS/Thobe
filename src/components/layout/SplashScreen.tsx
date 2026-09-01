import React, { useEffect, useState } from 'react';
import { Scissors, Sparkles, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';

interface SplashScreenProps {
  shopName?: string;
  tagline?: string;
  onFinish: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  shopName = 'المقص الذهبي للخياطة الرجالية',
  tagline = 'نظام إدارة الخياطة الرجالية والأثواب الفاخرة',
  onFinish,
  duration = 2200,
}) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fading out smoothly before onFinish
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, Math.max(duration - 500, 1200));

    const finishTimer = setTimeout(() => {
      onFinish();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0F172A] flex flex-col items-center justify-center text-slate-100 px-4 select-none transition-all duration-500 ${
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      dir="rtl"
    >
      {/* Background Decorative Theme Glows matching the App */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full border border-blue-500/10 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
        <div className="w-[340px] h-[340px] rounded-full border border-blue-400/15 animate-pulse" />
        <div className="absolute w-80 h-80 bg-[#1A365D]/30 rounded-full blur-3xl" />
        <div className="absolute w-64 h-64 bg-blue-600/10 rounded-full blur-2xl" />
      </div>

      {/* Main Logo & Identity Box */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
        {/* Animated Brand Emblem matching Website Logo ("ث" + Scissors) */}
        <div className="relative mb-6">
          <div className="w-22 h-22 rounded-2xl bg-[#1A365D] border-2 border-blue-400/40 text-white flex items-center justify-center font-black text-4xl shadow-2xl shadow-blue-950/60 relative overflow-hidden transform transition-transform duration-700 animate-bounce" style={{ animationDuration: '2s' }}>
            {/* Shimmer light pass */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            <span className="drop-shadow-md select-none">ث</span>
          </div>

          <div className="absolute -bottom-2 -left-2 bg-blue-600 text-white p-1.5 rounded-xl shadow-lg border-2 border-[#0F172A]">
            <Scissors className="w-3.5 h-3.5 transform -rotate-45" />
          </div>
        </div>

        {/* System & Shop Name */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[11px] font-bold mb-2.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>نظام ثوبي v2.0</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2 drop-shadow-sm">
          {shopName}
        </h1>

        {/* Tagline */}
        <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xs leading-relaxed mb-7">
          {tagline}
        </p>

        {/* Loading Progress Bar in Theme Royal Blue (#1A365D & #2563EB) */}
        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 relative shadow-inner">
          <div className="h-full bg-gradient-to-r from-[#1A365D] via-blue-600 to-blue-400 rounded-full w-full origin-left animate-[loading_2s_ease-in-out_forwards]" />
        </div>

        {/* Quick Highlights in Website Colors */}
        <div className="mt-6 flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            دفتر تفصيل معتمد
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            دقة المقاسات وقص A4
          </span>
        </div>
      </div>
    </div>
  );
};
