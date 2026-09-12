import React, { useState, useEffect } from 'react';
import {
  Download,
  ShieldCheck,
  AlertTriangle,
  FileArchive,
  Database,
  CheckCircle2,
  Clock,
  Layers,
  FileSpreadsheet,
  FileCode,
  Info,
  RefreshCw,
  HardDrive,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadStoreBackup, BackupSummary } from '../../services/storeBackupService';

export const DataBackupSection: React.FC = () => {
  const { currentShop, currentUser, isSuperAdmin, isShop } = useAuth();
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStep, setExportStep] = useState<string>('');
  const [exportPercent, setExportPercent] = useState<number>(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<BackupSummary | null>(null);

  const shopId = currentShop?.shopId;
  const canExport = Boolean(shopId && (isShop || isSuperAdmin));

  // Load last backup time from localStorage on mount or shop change
  useEffect(() => {
    if (!shopId) return;
    try {
      const stored = localStorage.getItem(`thobi_last_backup_${shopId}`);
      setLastBackupTime(stored);
    } catch {
      setLastBackupTime(null);
    }
  }, [shopId]);

  // If user is a regular employee, DO NOT render this section at all
  if (!canExport) {
    return null;
  }

  const formatBackupDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ar-SA', {
        dateStyle: 'full',
        timeStyle: 'medium',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const handleStartExport = async () => {
    if (!shopId || isExporting) return;
    setShowConfirmModal(false);
    setIsExporting(true);
    setExportError(null);
    setExportStep('جاري بدء عملية النسخ الاحتياطي...');
    setExportPercent(5);

    try {
      const summary = await downloadStoreBackup(
        shopId,
        {
          isShop,
          isSuperAdmin,
          userId: currentUser?.userId,
        },
        (stepMessage, progressPercent) => {
          setExportStep(stepMessage);
          setExportPercent(progressPercent);
        }
      );

      setLastSummary(summary);
      setLastBackupTime(summary.exportedAt);
    } catch (err: any) {
      console.error('Backup error:', err);
      setExportError(err.message || 'تعذر استكمال النسخ الاحتياطي. يرجى المحاولة لاحقاً.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="data-backup-section" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-[#1A365D]">
              <HardDrive className="w-5 h-5" />
            </span>
            <h3 className="font-black text-base text-slate-900">
              حماية البيانات والنسخ الاحتياطي
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            يمكنك الاحتفاظ بنسخة مستقلة من بيانات متجرك على جهازك الشخصي في أي وقت. يتضمن ملف النسخ الاحتياطي سجلات العملاء، المقاسات، الطلبات، والمدفوعات.
          </p>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ميزة حصرية لمالك المتجر
          </span>
        </div>
      </div>

      {/* Prominent Security Warning */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-black text-amber-950 mb-0.5">تنبيه أمني هام لحماية خصوصية متجرك:</p>
          <p>
            ملف النسخ الاحتياطي يحتوي على معلومات حساسة تخص متجرك وعملاءك. يرجى حفظه في مكان آمن وعدم مشاركته مع أطراف غير موثوقة.
          </p>
        </div>
      </div>

      {/* Info & Scope Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* Included Data Card */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2 font-black text-slate-800 border-b border-slate-200 pb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>ما يتضمنه ملف النسخ الاحتياطي:</span>
          </div>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              مصنف Excel شامل للقراءة والمراجعة (ثوبي-بيانات-المتجر.xlsx) بـ 7 أوراق عمل مفصلة
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              سجلات المقاسات المفصلة والمفردة للخياطين بالقيم الرقمية الدقيقة (JSON + Excel)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              بيانات وهوية المتجر والسجل التجاري وإعدادات الضريبة (JSON + Excel)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              سجلات العملاء الكاملة وأرقام التواصل والعناوين (JSON + CSV + Excel)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              أرشيف الطلبات وتفاصيل الأثواب والحسابات (JSON + CSV + Excel)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              سندات القبض والمدفوعات والمسترجعات المالية (JSON + CSV + Excel)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              سجل حسابات طاقم العمل وصلاحياتهم (معقم أمنياً بالكامل)
            </li>
          </ul>
        </div>

        {/* Security & Exclusions Card */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2 font-black text-slate-800 border-b border-slate-200 pb-2">
            <Lock className="w-4 h-4 text-[#1A365D]" />
            <span>ضوابط الحماية وما لا يتم تضمينه:</span>
          </div>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              لا يتضمن أي كلمات مرور أو مفاتيح سرية أو جلسات مصادقة
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              عزل تام ومطلق لبيانات متجرك (لن تتضمن الحزمة بيانات أي متجر آخر)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              جداول CSV مجهزة بترميز UTF-8 مع BOM لفتح العربية في Excel دون تشويه
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              توقيع رقمي SHA-256 Checksum لضمان عدم تعرض البيانات لأي تلاعب
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              لا يتم رفع الملفات إلى أي خادم خارجي (تنزيل محلي مباشر إلى جهازك)
            </li>
          </ul>
        </div>
      </div>

      {/* Cloud & Multi-layer Backup Context */}
      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3 text-xs text-slate-700">
        <Layers className="w-4 h-4 text-[#1A365D] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-[#1A365D] block mb-0.5">
            طبقة الحماية المستقلة (الطبقة الرابعة):
          </span>
          تعتمد منصة "ثوبي" على نسخ احتياطية سحابية تلقائية منفصلة (PITR والنسخ اليومي)، وتمنحك هذه الأداة حق الملكية والسيادة الكاملة على بياناتك بتنزيل نسخة احتياطية مستقلة بصيغة ZIP وحفظها على حاسوبك الشخصي أو وحدات التخزين الخاصة بك.
        </div>
      </div>

      {/* Last Download Time & Action Button Bar */}
      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>آخر نسخة تم تنزيلها من هذا الجهاز:</span>
          <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
            {lastBackupTime ? formatBackupDate(lastBackupTime) : 'لم يتم التنزيل من هذا الجهاز بعد'}
          </span>
        </div>

        <button
          type="button"
          id="btn-download-store-backup"
          disabled={isExporting}
          onClick={() => setShowConfirmModal(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1A365D] hover:bg-[#152C4D] active:scale-98 text-white font-black text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          {isExporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جاري التجهيز ({exportPercent}%)...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة احتياطية من بيانات المتجر</span>
            </>
          )}
        </button>
      </div>

      {/* Export Error Alert */}
      {exportError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-1">تعذر استكمال النسخ الاحتياطي:</span>
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Summary Banner */}
      {lastSummary && !isExporting && (
        <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم تنزيل النسخة الاحتياطية بنجاح وحفظها على جهازك!</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700">
              {(lastSummary.sizeBytes / 1024).toFixed(1)} KB
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
              <span className="text-slate-500 block text-[10px]">العملاء</span>
              <span className="font-black text-slate-800 text-sm">{lastSummary.recordCounts.customers}</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
              <span className="text-slate-500 block text-[10px]">المقاسات</span>
              <span className="font-black text-slate-800 text-sm">{lastSummary.recordCounts.measurements}</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
              <span className="text-slate-500 block text-[10px]">الطلبات</span>
              <span className="font-black text-slate-800 text-sm">{lastSummary.recordCounts.orders}</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
              <span className="text-slate-500 block text-[10px]">المدفوعات</span>
              <span className="font-black text-slate-800 text-sm">{lastSummary.recordCounts.payments}</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
              <span className="text-slate-500 block text-[10px]">المسترجعات</span>
              <span className="font-black text-slate-800 text-sm">{lastSummary.recordCounts.refunds}</span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
              <span className="text-slate-500 block text-[10px]">الموظفون</span>
              <span className="font-black text-slate-800 text-sm">{lastSummary.recordCounts.staff}</span>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100">
            <span>الملف: <code className="font-mono font-bold text-slate-700">{lastSummary.filename}</code></span>
            <span>بصمة الأمان (SHA-256): <code className="font-mono text-emerald-800">{lastSummary.integrityHash.slice(0, 16)}...</code></span>
          </div>
        </div>
      )}

      {/* MODAL 1: CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-[#1A365D]" />
                تأكيد تنزيل نسخة احتياطية من المتجر
              </h4>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              سيقوم النظام بجمع كافة بيانات المتجر المسجلة وتجهيز حزمة مضغوطة (<code className="font-bold text-slate-900">.ZIP</code>) تتضمن مصنف إكسل شامل (<code className="font-bold text-slate-900">ثوبي-بيانات-المتجر.xlsx</code>) وملفات البيانات الأصلية (<code className="font-bold text-slate-900">JSON</code>) وجداول (<code className="font-bold text-slate-900">CSV</code>) لتنزيلها مباشرة إلى جهازك الشخصي.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800 block">الملفات المضمنة في الأرشيف:</span>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> مصنف إكسل الشامل (XLSX)</span>
                <span className="flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5 text-blue-600" /> قياسات الخياطة المفردة</span>
                <span className="flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5 text-blue-600" /> بيانات المتجر والضريبة</span>
                <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> سجل العملاء والطلبات</span>
                <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> سجل المدفوعات والمسترجعات</span>
                <span className="flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5 text-blue-600" /> ملفات الحفظ الأصلية (JSON)</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>تذكير بالمسؤولية:</strong> يحتوي هذا الملف على أرقام جوالات وسجلات عملاء متجرك. حافظ عليه في وسيط تخزين آمن.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                id="btn-confirm-download-backup"
                onClick={handleStartExport}
                className="px-5 py-2 bg-[#1A365D] hover:bg-[#152C4D] text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تأكيد وبدء التنزيل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: IN-PROGRESS EXPORT MODAL */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1A365D] mx-auto flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1A365D]" />
            </div>

            <div>
              <h4 className="font-black text-base text-slate-900">
                جاري إعداد وتحميل النسخة الاحتياطية
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                يرجى الانتظار وعدم إغلاق المتصفح أثناء التجهيز
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A365D] transition-all duration-300 rounded-full"
                  style={{ width: `${exportPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{exportStep}</span>
                <span className="font-bold text-slate-700">{exportPercent}%</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 text-right space-y-1">
              <p>• الفحص والتحقق من صلاحية الحساب والبيانات السحابية</p>
              <p>• ترميز ملفات Excel بمعيار UTF-8 مع BOM لقراءة العربية بوضوح</p>
              <p>• حساب توقيع الأمان الرقمي SHA-256 قبل إنشاء ملف ZIP</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
