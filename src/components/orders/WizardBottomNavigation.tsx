import React from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, X } from 'lucide-react';

export interface WizardBottomNavigationProps {
  step: number;
  totalSteps: number;
  stepTitle?: string;
  canGoBack?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCancel?: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isSavedSuccessfully?: boolean;
  isEditingMode?: boolean;
  isTotalLessThanNetPaid?: boolean;
  summaryContent?: React.ReactNode;
}

export const WizardBottomNavigation: React.FC<WizardBottomNavigationProps> = ({
  step,
  totalSteps,
  stepTitle,
  canGoBack = true,
  onPrev,
  onNext,
  onCancel,
  onSubmit,
  isSubmitting = false,
  isSavedSuccessfully = false,
  isEditingMode = false,
  isTotalLessThanNetPaid = false,
  summaryContent,
}) => {
  const isFinalStep = step === totalSteps;

  return (
    <div
      className="mt-8 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 select-none"
      dir="rtl"
    >
      {/* Leading Side: Step Indicator or Summary Content */}
      <div className="flex items-center gap-3">
        {summaryContent ? (
          <div className="w-full sm:w-auto">{summaryContent}</div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-[#1A365D]" />
            <span className="font-bold text-slate-700">
              الخطوة {step} من {totalSteps}
            </span>
            {stepTitle && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">{stepTitle}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Trailing Side: Navigation Actions */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
        {/* Cancel Action (Available across all wizard steps) */}
        {onCancel && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50/70 active:bg-rose-100 border border-slate-200 hover:border-rose-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="إلغاء الطلب والعودة للوحة القيادة"
          >
            <X className="w-4 h-4" />
            <span>إلغاء</span>
          </button>
        )}

        {/* Back Button (For steps > 1) */}
        {canGoBack && step > 1 && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onPrev}
            className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="الرجوع للخطوة السابقة"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرجوع</span>
          </button>
        )}

        {/* Forward Action (Next or Submit) */}
        {!isFinalStep ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onNext}
            className="flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#1A365D] hover:bg-[#152C4D] active:bg-[#0F172A] rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="المتابعة للخطوة التالية"
          >
            <span>التالي</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting || isSavedSuccessfully || isTotalLessThanNetPaid}
            onClick={onSubmit}
            className="w-full sm:w-auto sm:flex-none min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label={isEditingMode ? 'حفظ وتحديث بيانات الطلب' : 'اعتماد وحفظ الطلب وطباعة الباركود'}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'جاري الحفظ...'
                : isEditingMode
                ? 'حفظ وتحديث بيانات الطلب'
                : 'اعتماد وحفظ الطلب وطباعة الباركود'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
