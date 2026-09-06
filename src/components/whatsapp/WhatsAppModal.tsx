import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  RotateCcw,
  User,
  Phone,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import {
  normalizeWhatsAppNumber,
  buildWhatsAppUrl,
  buildOrderWhatsAppMessage,
  buildCustomerWhatsAppMessage,
} from '../../utils/whatsapp';
import { ORDER_STATUS_LABELS } from '../../utils/presets';
import { useShop } from '../../context/ShopContext';
import { OrderStatus } from '../../types';

export interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  phone: string;
  orderNumber?: string;
  orderStatus?: OrderStatus | string;
  shopName?: string;
  defaultMessage?: string;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  customerName,
  phone,
  orderNumber,
  orderStatus,
  shopName,
  defaultMessage,
}) => {
  const { showToast } = useShop();

  // Compute the initial message
  const computeDefaultMessage = () => {
    if (defaultMessage) return defaultMessage;
    if (orderNumber || orderStatus) {
      return buildOrderWhatsAppMessage({
        customerName,
        orderNumber,
        status: orderStatus,
        shopName,
      });
    }
    return buildCustomerWhatsAppMessage({
      customerName,
      shopName,
    });
  };

  const [message, setMessage] = useState<string>('');
  const [isOpening, setIsOpening] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null);

  // Normalize phone number
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  const isValidPhone = Boolean(normalizedPhone);

  // Reset or initialize message when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setMessage(computeDefaultMessage());
      setIsOpening(false);
      setIsCopied(false);
      setPopupBlockedUrl(null);
    }
  }, [isOpen, customerName, phone, orderNumber, orderStatus, shopName, defaultMessage]);

  if (!isOpen) return null;

  const handleReset = () => {
    setMessage(computeDefaultMessage());
    setPopupBlockedUrl(null);
  };

  const handleCopyMessage = async () => {
    if (!message.trim()) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const el = document.createElement('textarea');
        el.value = message;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setIsCopied(true);
      showToast('تم نسخ نص الرسالة إلى الحافظة', 'success');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast('تعذر نسخ نص الرسالة', 'error');
    }
  };

  const handleSelectTemplate = (templateStatus: OrderStatus | 'GENERAL') => {
    setPopupBlockedUrl(null);
    if (templateStatus === 'GENERAL') {
      setMessage(buildCustomerWhatsAppMessage({ customerName, shopName }));
    } else {
      setMessage(
        buildOrderWhatsAppMessage({
          customerName,
          orderNumber,
          status: templateStatus,
          shopName,
        })
      );
    }
  };

  const handleOpenWhatsApp = () => {
    if (isOpening) return;

    if (!isValidPhone || !normalizedPhone) {
      showToast('رقم هاتف العميل غير صالح لواتساب', 'error');
      return;
    }

    if (!message.trim()) {
      showToast('يرجى كتابة نص الرسالة قبل فتح واتساب', 'error');
      return;
    }

    setIsOpening(true);
    setPopupBlockedUrl(null);

    try {
      const url = buildWhatsAppUrl(normalizedPhone, message);
      if (!url) {
        showToast('رقم هاتف العميل غير صالح لواتساب', 'error');
        setIsOpening(false);
        return;
      }

      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        setPopupBlockedUrl(url);
        showToast('حظر المتصفح النافذة المنبثقة. يمكنك الضغط على الرابط المباشر أدناه.', 'error');
        setIsOpening(false);
        return;
      }

      // Success notification (as required: "تم فتح واتساب" rather than "تم إرسال الرسالة")
      showToast('تم فتح واتساب بنجاح', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to open WhatsApp URL:', err);
      const url = buildWhatsAppUrl(normalizedPhone, message);
      if (url) {
        setPopupBlockedUrl(url);
      }
      showToast('حدث خطأ أثناء محاولة فتح واتساب. استخدم الرابط المباشر.', 'error');
    } finally {
      setIsOpening(false);
    }
  };

  const statusConfig = orderStatus ? ORDER_STATUS_LABELS[orderStatus] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                مراسلة العميل عبر واتساب
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                تجهيز ومراجعة الرسالة قبل الانتقال إلى WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recipient Information Strip */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-stone-900">
              <User className="w-4 h-4 text-amber-700" />
              <span>{customerName || 'عميل بدون اسم'}</span>
            </div>

            {orderNumber && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-mono font-bold bg-white px-2.5 py-0.5 rounded-lg border border-stone-200 text-stone-700">
                  <ShoppingBag className="w-3.5 h-3.5 text-stone-500" />
                  {orderNumber}
                </span>

                {statusConfig && (
                  <span
                    className="font-bold px-2 py-0.5 rounded-full text-[11px]"
                    style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200/60">
            <span className="text-stone-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              رقم الجوال:
            </span>

            <div className="flex items-center gap-2">
              <span dir="ltr" className="font-mono font-bold text-stone-800">
                {phone || 'لا يوجد رقم'}
              </span>

              {isValidPhone ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  صالح ({normalizedPhone})
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  رقم غير صالح لواتساب
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Message Editor Body */}
        <div className="p-5 space-y-3">
          {/* Quick Preset Buttons (if order context exists) */}
          {orderNumber && (
            <div>
              <span className="text-[11px] font-bold text-stone-500 block mb-1.5">
                قوالب رسائل سريعة:
              </span>
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('READY')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  جاهز للاستلام 🌷
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('SEWING')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  قيد الخياطة
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('MEASURED')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  اعتماد المقاسات
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('DELIVERED')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  شكر وتقييم
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('GENERAL')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  محادثة عامة
                </button>
              </div>
            </div>
          )}

          {/* Editable Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label htmlFor="whatsapp-message-input" className="text-xs font-bold text-stone-800">
                نص الرسالة (يمكنك التعديل أو إضافة ملاحظات):
              </label>
              <div className="flex items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className={`font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    isCopied ? 'text-emerald-700' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="نسخ نص الرسالة إلى الحافظة"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ النص</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer transition-colors"
                  title="إعادة تعيين إلى الرسالة الافتراضية"
                >
                  <RotateCcw className="w-3 h-3" />
                  استعادة النص الأصلي
                </button>
              </div>
            </div>

            <textarea
              id="whatsapp-message-input"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك للعميل هنا..."
              className="w-full p-3.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-2xl text-stone-900 focus:bg-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] focus:outline-none transition-all resize-none font-sans leading-relaxed"
            />

            <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1">
              <span>سيتم تجهيز هذه الرسالة تلقائيًا داخل المحادثة</span>
              <span>{message.length} حرف</span>
            </div>
          </div>

          {/* Popup Blocker Direct Link Fallback (TEST 10) */}
          {popupBlockedUrl && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-start gap-2 text-rose-800 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>حظر المتصفح فتح النافذة تلقائيًا</span>
              </div>
              <p className="text-stone-600 text-[11px]">
                انقر على الزر المباشر أدناه لفتح محادثة واتساب بدون انتظار:
              </p>
              <a
                href={popupBlockedUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  showToast('تم فتح واتساب بنجاح', 'success');
                  onClose();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>فتح الرابط المباشر الآن</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Instructions note */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-[11px] text-amber-950 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <p className="leading-relaxed">
              عند الضغط على <strong>فتح واتساب</strong>، ستفتح المحادثة الرسمية مع النص المجهز. يمكنك مراجعتها ثم الضغط على زر الإرسال بنفسك داخل WhatsApp.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
            title="نسخ نص الرسالة إلى الحافظة"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
            <span>{isCopied ? 'تم النسخ' : 'نسخ النص'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={!isValidPhone || !message.trim() || isOpening}
              onClick={handleOpenWhatsApp}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all cursor-pointer ${
                isValidPhone && message.trim() && !isOpening
                  ? 'bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98]'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>فتح واتساب</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
