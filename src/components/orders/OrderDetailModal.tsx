import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, Payment, Refund, PAYMENT_METHOD_MAP } from '../../types';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { TailorService } from '../../services/firebaseService';
import { ORDER_STATUS_LABELS } from '../../utils/presets';
import { calculateOrderFinancials, getLinkedPayments, getLinkedRefunds } from '../../utils/financialCalculations';
import { getOrderVatSnapshot } from '../../utils/vatCalculations';
import {
  X,
  Printer,
  Copy,
  Scissors,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Layers,
  Receipt,
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  AlertTriangle,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  Ban,
  MessageCircle,
} from 'lucide-react';
import { WhatsAppModal } from '../whatsapp/WhatsAppModal';
import { formatMeasurementDisplay, getMeasurementNumeralPreference } from '../../utils/measurementNormalization';
import { getUnitLabel } from '../../utils/measurementConversion';
import {
  CollarRegularIcon,
  CollarMandarinIcon,
  CollarRoyalIcon,
  CuffChamferedIcon,
  CuffSquareIcon,
  PocketChamferedIcon,
} from '../visuals/OptionIcons';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onPrint: () => void;
  onRepeat: () => void;
  onEdit?: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onPrint,
  onRepeat,
  onEdit,
}) => {
  const {
    updateOrderStatus,
    addPayment,
    addRefund,
    deleteOrder,
    payments: contextPayments,
    refunds: contextRefunds,
  } = useShop();
  const { currentUser, currentShop, hasPermission } = useAuth();

  const [statusNote, setStatusNote] = useState('');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'stc_pay'>('cash');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const isSubmittingPaymentLock = useRef<boolean>(false);
  
  // Refund States & Concurrency lock
  const [showRefundInput, setShowRefundInput] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'stc_pay'>('cash');
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const isSubmittingRefundLock = useRef<boolean>(false);
  const refundFormRef = useRef<HTMLFormElement | null>(null);
  const refundAmountInputRef = useRef<HTMLInputElement | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const [refundScrollTrigger, setRefundScrollTrigger] = useState(0);

  const [showCancelWarningModal, setShowCancelWarningModal] = useState(false);
  const [showCancelUnpaidModal, setShowCancelUnpaidModal] = useState(false);
  const [cancelRefundOption, setCancelRefundOption] = useState<'refund_now' | 'refund_later'>('refund_later');
  const [cancelRefundMethod, setCancelRefundMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'stc_pay'>('cash');
  const [isCancelling, setIsCancelling] = useState(false);
  const [directPayments, setDirectPayments] = useState<Payment[]>([]);
  const [directRefunds, setDirectRefunds] = useState<Refund[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const m = order?.measurements || {
    length: 0,
    shoulder: 0,
    chest: 0,
    waist: 0,
    sleeveLength: 0,
    neck: 0,
    wrist: 0,
    bottomWidth: 0,
  };
  const td = order?.tailoringDetails || {
    fabric: { name: 'غير محدد', color: '', colorCode: '', type: '', notes: '' },
    collar: { name: 'غير محدد', stiffness: 'medium', notes: '' },
    sleeves: { name: 'غير محدد', cuffWidth: 0, notes: '' },
    chest: { name: 'غير محدد', notes: '' },
    pockets: { chestPocketType: 'chamfered', notes: '' },
    buttons: { name: 'عادي', notes: '' },
    bottom: { name: 'عادي', notes: '' },
    embroidery: { notes: '' },
    generalNotes: '',
    garmentNotes: '',
  };
  const p = order?.pricing || {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  };

  const canAccessPayments = hasPermission('payments');

  // Direct load of payment and refund documents from Firestore for this order
  useEffect(() => {
    const shopId = currentShop?.shopId || order.shopId;
    if (!shopId || !order.orderId) return;

    let isMounted = true;
    Promise.all([
      TailorService.getPayments(shopId, order.orderId, order.orderNumber).catch(() => []),
      TailorService.getRefunds(shopId, order.orderId, order.orderNumber).catch(() => []),
    ]).then(([pays, refs]) => {
      if (isMounted) {
        setDirectPayments(pays);
        setDirectRefunds(refs);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentShop?.shopId, order.shopId, order.orderId, order.orderNumber]);

  // Combine real-time context payments and direct Firestore query with canonical linking and deduplication
  const orderPayments = getLinkedPayments(order, [
    ...directPayments,
    ...(contextPayments || []),
  ]).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Combine real-time context refunds and direct Firestore query with canonical linking and deduplication
  const orderRefunds = getLinkedRefunds(order, [
    ...directRefunds,
    ...(contextRefunds || []),
  ]).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Centralized Canonical Financial Calculations (Source of Truth: Payments and Refunds collections)
  const financials = calculateOrderFinancials(order, orderPayments, orderRefunds);
  const {
    grossPaid,
    grossRefunded: totalRefunds,
    netPaid,
    remaining,
    activeRemaining,
    unrefundedLiability,
    maxRefundable,
    isCancelled,
    hasFinancialMismatch,
    mismatchReason,
  } = financials;

  // Order-level immutable VAT snapshot (source of truth for this specific order)
  const vatSnapshot = getOrderVatSnapshot(order);

  // Synchronize payAmount with calculated active remaining balance
  useEffect(() => {
    if (!isCancelled && activeRemaining > 0) {
      setPayAmount(activeRemaining);
    } else {
      setPayAmount(0);
    }
  }, [activeRemaining, isCancelled]);

  const paymentMethodsSummary = orderPayments.length > 0
    ? Array.from(new Set(orderPayments.map((pay) => PAYMENT_METHOD_MAP[pay.method] || pay.method))).join(' + ')
    : '';

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === 'CANCELLED') {
      if (grossPaid > 0 || orderPayments.length > 0) {
        setCancelRefundOption('refund_later');
        setShowCancelWarningModal(true);
        return;
      } else {
        setShowCancelUnpaidModal(true);
        return;
      }
    }
    await updateOrderStatus(order.orderId, newStatus, statusNote);
    setStatusNote('');
  };

  const handleConfirmCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      const shopId = currentShop?.shopId || order.shopId;
      if (cancelRefundOption === 'refund_now' && netPaid > 0) {
        await addRefund({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          amount: netPaid,
          paymentMethod: cancelRefundMethod,
          reason: 'إلغاء الطلب وتسوية الحساب بالكامل للعميل',
          recordedBy: currentUser?.fullName || 'المستخدم',
          recordedByUid: currentUser?.userId || '',
        });
        const updatedRefs = await TailorService.getRefunds(shopId, order.orderId);
        setDirectRefunds(updatedRefs);
      }
      await updateOrderStatus(
        order.orderId,
        'CANCELLED',
        statusNote || (cancelRefundOption === 'refund_now' ? 'إلغاء الطلب وتسوية الرصيد بالكامل' : 'إلغاء الطلب وبانتظار تسليم المبلغ للعميل')
      );
      setStatusNote('');
      setShowCancelWarningModal(false);
    } catch (err: any) {
      console.error('Error cancelling order:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmCancelUnpaid = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await updateOrderStatus(order.orderId, 'CANCELLED', statusNote || 'إلغاء الطلب');
      setStatusNote('');
      setShowCancelUnpaidModal(false);
    } catch (err: any) {
      console.error('Error cancelling unpaid order:', err);
    } finally {
      setIsCancelling(false);
    }
  };



  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prohibit payment on CANCELLED order
    if (isCancelled) return;
    // Synchronous double-submission lock guard
    if (isSubmittingPaymentLock.current || isSubmittingPayment) return;
    if (payAmount <= 0 || isNaN(payAmount) || payAmount > activeRemaining) return;

    isSubmittingPaymentLock.current = true;
    setIsSubmittingPayment(true);

    try {
      await addPayment({
        orderId: order.orderId,
        customerId: order.customerId,
        amount: payAmount,
        method: payMethod,
        type: payAmount >= activeRemaining ? 'FULL' : 'REMAINING',
        notes: 'سداد من شاشة تفاصيل الطلب',
        receivedBy: currentUser?.userId || 'usr_unknown',
        receivedByName: currentUser?.fullName || 'المستخدم',
      });
      setShowPaymentInput(false);
    } catch (err: any) {
      console.error('Error adding payment:', err);
      // Release synchronous lock on error so the user can fix and retry safely
      isSubmittingPaymentLock.current = false;
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleOpenRefundModal = () => {
    setRefundAmount(maxRefundable);
    setRefundReason('');
    setRefundError(null);
    isSubmittingRefundLock.current = false;
    setShowPaymentInput(false);
    setShowRefundInput(true);
    setRefundScrollTrigger((prev) => prev + 1);
  };

  // Auto-scroll to refund panel with smooth animation when opened
  useEffect(() => {
    if (showRefundInput && refundFormRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (refundFormRef.current) {
            refundFormRef.current.scrollIntoView({
              behavior,
              block: 'start',
            });
            if (refundAmountInputRef.current) {
              refundAmountInputRef.current.focus({ preventScroll: true });
            }
          }
        });
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [showRefundInput, refundScrollTrigger]);

  const handleAddRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    // Synchronous double-submission lock
    if (isSubmittingRefundLock.current) return;
    setRefundError(null);

    if (refundAmount <= 0 || isNaN(refundAmount)) {
      setRefundError('يجب أن يكون مبلغ الاسترداد رقماً موجباً أكبر من الصفر.');
      return;
    }
    if (refundAmount > maxRefundable) {
      setRefundError(`المبلغ المطلوب (${refundAmount} ر.س) يتجاوز الحد الأقصى المتاح للاسترداد (${maxRefundable} ر.س).`);
      return;
    }

    isSubmittingRefundLock.current = true;
    setIsSubmittingRefund(true);

    try {
      const shopId = currentShop?.shopId || order.shopId;
      await addRefund({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        amount: refundAmount,
        paymentMethod: refundMethod,
        reason: refundReason.trim() || 'استرجاع دفعة للعميل',
        recordedBy: currentUser?.fullName || 'المستخدم',
        recordedByUid: currentUser?.userId || '',
      });

      // Update local direct list to reflect immediately
      const updatedRefunds = await TailorService.getRefunds(shopId, order.orderId);
      setDirectRefunds(updatedRefunds);

      setShowRefundInput(false);
      setRefundReason('');
    } catch (err: any) {
      console.error('Error submitting refund:', err);
      setRefundError(err.message || 'فشلت عملية الاسترداد');
      // Release lock on error so the user can fix and retry
      isSubmittingRefundLock.current = false;
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-amber-800 flex items-center justify-center font-mono font-black text-sm text-white tracking-wider">
              {order.orderNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: ORDER_STATUS_LABELS[order?.status]?.bg || '#f3f4f6',
                    color: ORDER_STATUS_LABELS[order?.status]?.color || '#374151',
                  }}
                >
                  {ORDER_STATUS_LABELS[order?.status]?.label || order?.status || 'غير محدد'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400 mt-1 flex-wrap">
                <span>العميل: {order.customerName}</span>
                <span>(<span dir="ltr">{order.customerPhone}</span>)</span>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 hover:text-white hover:bg-emerald-800 border border-emerald-700/60 text-[11px] font-bold transition-all cursor-pointer"
                  title="مراسلة العميل عبر واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>واتساب</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl border border-emerald-500 shadow-xs transition-all cursor-pointer"
              title="تواصل مع العميل عبر واتساب مباشرة"
            >
              <MessageCircle className="w-4 h-4 text-emerald-100" />
              <span className="hidden sm:inline">تواصل عبر واتساب</span>
              <span className="sm:hidden">واتساب</span>
            </button>
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold rounded-xl border border-stone-700 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              طباعة النموذج
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                تعديل الطلب
              </button>
            )}
            <button
              onClick={onRepeat}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-white text-xs font-black rounded-xl border border-stone-700 transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              تكرار الطلب
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Lifecycle Action Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              مراحل تقدم التفصيل والخياطة:
            </span>

            <div className="flex items-center flex-wrap gap-1.5">
              {(['NEW', 'CUTTING', 'SEWING', 'FITTING', 'READY', 'DELIVERED'] as OrderStatus[]).map((st) => {
                const isCurrent = order.status === st;
                const config = ORDER_STATUS_LABELS[st] || { label: st, bg: '#eee', color: '#333' };
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? st === 'CANCELLED'
                          ? 'bg-rose-800 text-white border-rose-800 shadow-xs'
                          : 'bg-amber-800 text-white border-amber-800 shadow-xs'
                        : st === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {config.label}
                  </button>
                );
              })}
              {order.status === 'CANCELLED' ? (
                <span className="px-3 py-1 text-xs font-bold rounded-xl border bg-rose-800 text-white border-rose-800 shadow-xs cursor-default flex items-center gap-1">
                  ملغى
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStatusChange('CANCELLED')}
                  className="px-4 py-1 text-xs font-black rounded-xl border transition-all cursor-pointer bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 flex items-center gap-1 ml-2"
                >
                  <Ban className="w-3.5 h-3.5" />
                  إلغاء الطلب
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ready Order Highlight Banner for WhatsApp */}
        {order.status === 'READY' && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950">
                  الثوب جاهز للاستلام! ✨
                </h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  يمكنك إشعار العميل {order.customerName} الآن عبر رسالة واتساب مباشرة لاستلام ثوبه.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>إبلاغ العميل عبر واتساب</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div ref={modalBodyRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order Info & Delivery Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <span className="text-stone-400 block font-semibold">نوع الثوب والعدد:</span>
              <span className="font-black text-stone-900 text-sm">{order.garmentType} ({order.quantity} ثياب)</span>
            </div>
            <div>
              <span className="text-stone-400 block font-semibold">تاريخ الطلب:</span>
              <span className="font-bold text-stone-800">{new Date(order.orderDate).toLocaleDateString('ar-SA')}</span>
            </div>
            <div>
              <span className="text-stone-400 block font-semibold">موعد التسليم المتوقع:</span>
              <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                {new Date(order.deliveryDate).toLocaleDateString('ar-SA')}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block font-semibold">الخياط المسؤول:</span>
              <span className="font-bold text-stone-800">{order.assignedTailor || 'معلم القص'}</span>
            </div>
          </div>

          {/* Measurements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-700" />
                المقاسات المسجلة لهذا الطلب ({getUnitLabel(order?.measurementUnit)})
              </h3>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                الوحدة: {getUnitLabel(order?.measurementUnit)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-900 font-bold block">الطول الكامل</span>
                <span className="font-black text-base text-amber-950">
                  {formatMeasurementDisplay(m.length, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الكتف</span>
                <span className="font-black text-sm text-stone-900">
                  {formatMeasurementDisplay(m.shoulder, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الصدر</span>
                <span className="font-black text-sm text-stone-900">
                  {formatMeasurementDisplay(m.chest, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-800 font-bold block">الخصر / البطن</span>
                <span className="font-black text-sm text-amber-950">
                  {formatMeasurementDisplay(m.waist, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الأرداف / الوسط</span>
                <span className="font-black text-sm text-stone-900">
                  {formatMeasurementDisplay(m.hips, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">طول الكم</span>
                <span className="font-black text-sm text-stone-900">
                  {formatMeasurementDisplay(m.sleeveLength, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الرقبة</span>
                <span className="font-black text-sm text-stone-900">
                  {formatMeasurementDisplay(m.neck, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الكبك</span>
                <span className="font-black text-sm text-stone-900">
                  {formatMeasurementDisplay(m.wrist, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">وسع الداير</span>
                <span className="font-black text-sm text-stone-900">
                  {formatMeasurementDisplay(m.bottomWidth, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الجيرو / الإبط</span>
                <span className="font-black text-sm text-stone-900">
                  {formatMeasurementDisplay(m.armhole, { numeralSystem: getMeasurementNumeralPreference() })} {getUnitLabel(order?.measurementUnit)}
                </span>
              </div>
            </div>
          </div>

          {/* Tailoring Specs */}
          <div>
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-amber-700" />
              مواصفات الخياطة ودفتر التفصيل
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-stone-400 block text-[11px]">القماش المختار:</span>
                <div className="font-black text-stone-900 text-sm">{td?.fabric?.name || 'غير محدد'}</div>
                <div className="text-stone-600">
                  {td?.fabric?.color || 'غير محدد'} {td?.fabric?.colorCode ? `(${td.fabric.colorCode})` : ''} {td?.fabric?.type ? `(${td.fabric.type})` : ''}
                </div>
                {td?.fabric?.notes && (
                  <div className="text-[11px] text-amber-900 font-bold mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ملاحظة القماش: {td.fabric.notes}
                  </div>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-stone-400 block text-[11px]">الياقة والكم:</span>
                <div className="font-bold text-stone-900">{td?.collar?.name || 'غير محدد'} {td?.collar?.stiffness ? `(${td.collar.stiffness === 'stiff' ? 'قاسية' : td.collar.stiffness === 'medium' ? 'وسط' : 'طرية'})` : ''}</div>
                <div className="text-stone-600">{td?.sleeves?.name || 'غير محدد'} {td?.sleeves?.cuffWidth ? `(${td.sleeves.cuffWidth} سم)` : ''}</div>
                {(td?.collar?.notes || td?.sleeves?.notes) && (
                  <div className="text-[11px] text-stone-700 font-medium mt-1">
                    {td?.collar?.notes && <div>• ياقة: {td.collar.notes}</div>}
                    {td?.sleeves?.notes && <div>• أكمام: {td.sleeves.notes}</div>}
                  </div>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-stone-400 block text-[11px]">الصدر والجيوب:</span>
                <div className="font-bold text-stone-900">{td?.chest?.name || 'غير محدد'}</div>
                <div className="text-stone-600">
                  {td?.pockets?.name ||
                    (td?.pockets?.chestPocketType === 'chamfered'
                      ? 'جيب مشطوف'
                      : td?.pockets?.chestPocketType === 'regular'
                      ? 'جيب مربع'
                      : td?.pockets?.chestPocketType === 'square_flap'
                      ? 'جيب مع غطاء'
                      : td?.pockets?.chestPocketType === 'hidden'
                      ? 'جيب مخفي'
                      : td?.pockets?.chestPocketType === 'none'
                      ? 'بدون جيب'
                      : 'غير محدد')}
                </div>
                {(td?.chest?.notes || td?.pockets?.notes) && (
                  <div className="text-[11px] text-stone-700 font-medium mt-1">
                    {td?.chest?.notes && <div>• صدر: {td.chest.notes}</div>}
                    {td?.pockets?.notes && <div>• جيوب: {td.pockets.notes}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* General & Additional Branch Notes */}
            {(td?.garmentNotes ||
              td?.buttons?.notes ||
              td?.bottom?.notes ||
              td?.embroidery?.notes ||
              td?.generalNotes ||
              order?.notes) && (
              <div className="mt-3 p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs">
                <span className="font-black text-amber-950 block mb-1">الملاحظات المكتوبة للتفصيل:</span>
                <div className="space-y-0.5 text-stone-800">
                  {td?.garmentNotes && <div>• <b>قصة الثوب:</b> {td.garmentNotes}</div>}
                  {td?.buttons?.notes && <div>• <b>الأزرار:</b> {td.buttons.notes}</div>}
                  {td?.bottom?.notes && <div>• <b>أسفل الثوب:</b> {td.bottom.notes}</div>}
                  {td?.embroidery?.notes && <div>• <b>التطريز:</b> {td.embroidery.notes}</div>}
                  {td?.generalNotes && <div>• <b>ملاحظات عامة:</b> {td.generalNotes}</div>}
                  {order?.notes && <div>• <b>ملاحظات الطلب:</b> {order.notes}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Financial Breakdown, Payments & Refunds */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-700" />
                الحالة المالية وسندات القبض والاسترداد
              </h3>
              <div className="flex items-center gap-2">
                {canAccessPayments && maxRefundable > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenRefundModal}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                    <span>سند استرداد ↩</span>
                  </button>
                )}
                {!isCancelled && activeRemaining > 0 && canAccessPayments && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentInput(!showPaymentInput);
                      setShowRefundInput(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ سند قبض / دفعة</span>
                  </button>
                )}
              </div>
            </div>

            {/* VAT Snapshot Badge & Details if enabled */}
            {vatSnapshot.vatEnabled && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#1A365D] text-white font-black text-[10px]">
                    فاتورة ضريبية مبسطة
                  </span>
                  <span className="text-slate-700 font-bold">
                    الضريبة مفعّلة ({vatSnapshot.vatRate}%)
                  </span>
                  {vatSnapshot.vatRegistrationNumber && (
                    <span className="text-slate-500 font-mono text-[11px]">
                      الرقم الضريبي: {vatSnapshot.vatRegistrationNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-slate-700 font-bold">
                  <span>قبل الضريبة: <b className="text-slate-900">{vatSnapshot.subtotalAmount}</b> ر.س</span>
                  <span className="text-blue-900">مبلغ الضريبة: <b>{vatSnapshot.vatAmount}</b> ر.س</span>
                  <span className="text-slate-900">الإجمالي: <b>{financials.totalAmount}</b> ر.س</span>
                </div>
              </div>
            )}

            {/* Financial Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 flex flex-col justify-center shadow-2xs">
                <span className="text-xs text-stone-500 font-semibold block">
                  {vatSnapshot.vatEnabled ? 'قيمة الطلب (شامل الضريبة)' : 'قيمة الطلب'}
                </span>
                <span className="text-lg font-black text-stone-900 mt-0.5">{financials.totalAmount} ر.س</span>
                <span className="text-[10px] text-stone-400 mt-0.5">
                  {vatSnapshot.vatEnabled
                    ? `قبل الضريبة: ${vatSnapshot.subtotalAmount} ر.س`
                    : 'سعر التفصيل الإجمالي'}
                </span>
              </div>
              
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 flex flex-col justify-center shadow-2xs">
                <span className="text-xs text-emerald-700 font-semibold block">المقبوض من العميل</span>
                <span className="text-lg font-black text-emerald-700 mt-0.5">{grossPaid} ر.س</span>
                <span className="text-[10px] text-emerald-600 mt-0.5">
                  {orderPayments.length} سند قبض
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 flex flex-col justify-center shadow-2xs">
                <span className="text-xs text-rose-700 font-semibold block">المعاد للعميل</span>
                <span className="text-lg font-black text-rose-700 mt-0.5">{totalRefunds} ر.س</span>
                <span className="text-[10px] text-rose-600 mt-0.5">
                  {orderRefunds.length} سند إرجاع
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 flex flex-col justify-center shadow-2xs">
                <span className="text-xs text-stone-600 font-semibold block">الصافي لدى المتجر</span>
                <span className="text-lg font-black text-stone-900 mt-0.5">{netPaid} ر.س</span>
                <span className="text-[10px] text-stone-500 mt-0.5">
                  {isCancelled ? 'أمانة مستحقة للعميل' : `المتاح للإرجاع: ${maxRefundable} ر.س`}
                </span>
              </div>
            </div>

            {/* Clear Financial Status Summary Banner */}
            <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
              isCancelled
                ? unrefundedLiability > 0
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : 'bg-stone-100 border-stone-300 text-stone-700'
                : activeRemaining === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/60 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center gap-2.5">
                {isCancelled ? (
                  unrefundedLiability > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-stone-600 shrink-0" />
                  )
                ) : activeRemaining === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <Receipt className="w-5 h-5 text-amber-700 shrink-0" />
                )}
                <div>
                  <div className="font-black text-sm">
                    {isCancelled
                      ? unrefundedLiability > 0
                        ? `الطلب ملغي — يوجد رصيد مستحق للعميل: ${unrefundedLiability} ر.س`
                        : 'الطلب ملغي — الحساب المالي مسوّى بالكامل'
                      : activeRemaining === 0
                      ? `تم سداد قيمة الطلب بالكامل (${financials.totalAmount} ر.س) ✓`
                      : `المتبقي للتحصيل عند التسليم: ${activeRemaining} ر.س`}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {isCancelled
                      ? unrefundedLiability > 0
                        ? 'تم إلغاء الطلب والمتبقي على العميل 0 ر.س، والرصيد المسدد محفوظ كأمانة لإرجاعه للعميل نقداً أو شبكة.'
                        : 'تم إلغاء الطلب ولا توجد أي مبالغ معلقة أو مطالبات مالية على العميل أو المتجر.'
                      : activeRemaining === 0
                      ? 'تم تحصيل كافة مستحقات هذا الطلب ولا يوجد أي متبقي.'
                      : `تم استلام عربون صافٍ قدره ${netPaid} ر.س، وسيتم تحصيل باقي المبلغ عند استلام الثوب.`}
                  </div>
                </div>
              </div>

              {isCancelled && unrefundedLiability > 0 && canAccessPayments && maxRefundable > 0 && (
                <button
                  type="button"
                  onClick={handleOpenRefundModal}
                  className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تسجيل إرجاع المبلغ للعميل ({unrefundedLiability} ر.س)</span>
                </button>
              )}
            </div>

            {/* Inline Payment Submission */}
            {showPaymentInput && !isCancelled && activeRemaining > 0 && (
              <form onSubmit={handleAddPayment} className="p-4 bg-white rounded-xl border border-emerald-300 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                    تسجيل سند قبض / استلام دفعة من العميل
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPaymentInput(false)}
                    className="text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Quick Amount Selection Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-stone-500 font-bold">تعبئة سريعة:</span>
                  <button
                    type="button"
                    onClick={() => setPayAmount(activeRemaining)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    كامل المتبقي ({activeRemaining} ر.س)
                  </button>
                  {activeRemaining > 50 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(Math.round(activeRemaining / 2))}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      نصف المتبقي ({Math.round(activeRemaining / 2)} ر.س)
                    </button>
                  )}
                  {activeRemaining > 100 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(100)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      100 ر.س
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">المبلغ (ر.س):</label>
                    <input
                      type="number"
                      max={activeRemaining}
                      min="1"
                      step="0.01"
                      disabled={isSubmittingPayment}
                      value={payAmount}
                      onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-sm font-bold bg-stone-50 rounded-lg border border-stone-300 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">طريقة الاستلام:</label>
                    <select
                      value={payMethod}
                      disabled={isSubmittingPayment}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-sm font-bold bg-stone-50 rounded-lg border border-stone-300 disabled:opacity-50"
                    >
                      <option value="cash">نقدي (كاش)</option>
                      <option value="card">شبكة / مدى</option>
                      <option value="stc_pay">STC Pay</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      disabled={isSubmittingPayment}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSubmittingPayment ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>جارٍ التسجيل...</span>
                        </>
                      ) : (
                        'حفظ سند القبض'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Inline Refund Submission */}
            {showRefundInput && (
              <form
                ref={refundFormRef}
                onSubmit={handleAddRefund}
                className="scroll-mt-6 p-4 bg-rose-50/50 rounded-xl border border-rose-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs">
                      <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-rose-950">إرجاع مبلغ للعميل</h4>
                      <span className="text-[10px] text-rose-700">
                        الحد الأقصى القابل للإرجاع: <b>{maxRefundable} ر.س</b>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRefundInput(false)}
                    className="text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {refundError && (
                  <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-lg text-xs text-rose-900 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>{refundError}</span>
                  </div>
                )}

                {/* Quick Refund Amount Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-stone-500 font-bold">تعبئة سريعة:</span>
                  <button
                    type="button"
                    onClick={() => setRefundAmount(maxRefundable)}
                    className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    كامل الرصيد القابل للإرجاع ({maxRefundable} ر.س)
                  </button>
                  {maxRefundable > 50 && (
                    <button
                      type="button"
                      onClick={() => setRefundAmount(Math.round(maxRefundable / 2))}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      نصف المبلغ ({Math.round(maxRefundable / 2)} ر.س)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      المبلغ المراد إرجاعه (ر.س): <span className="text-rose-600">*</span>
                    </label>
                    <input
                      ref={refundAmountInputRef}
                      type="number"
                      min="1"
                      max={maxRefundable}
                      step="any"
                      required
                      value={refundAmount || ''}
                      onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-sm font-bold bg-white rounded-lg border border-stone-300 focus:border-rose-500 focus:outline-hidden"
                      placeholder={`أقصى حد: ${maxRefundable}`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      طريقة الإرجاع:
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-sm font-bold bg-white rounded-lg border border-stone-300 focus:border-rose-500 focus:outline-hidden"
                    >
                      <option value="cash">نقدي (كاش)</option>
                      <option value="card">عكس عملية مدى / شبكة</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="stc_pay">STC Pay</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      سبب الإرجاع: <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="مثال: إلغاء الطلب، تعديل المقاس، استرجاع عربون"
                      className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-stone-300 focus:border-rose-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-stone-500">
                    يتم الحفظ في النظام وتوثيق اسم المسؤول وتاريخ العملية بدقة.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRefundInput(false)}
                      className="px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingRefund || refundAmount <= 0 || refundAmount > maxRefundable}
                      className="px-5 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {isSubmittingRefund ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>جارٍ الحفظ...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>تأكيد إرجاع المبلغ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List of Registered Payments */}
            {orderPayments.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-stone-800 border-b border-stone-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                    دفعات العميل المسجلة ({orderPayments.length})
                  </span>
                  <span className="text-[11px] text-stone-500 font-semibold">
                    إجمالي المدفوع: <b className="text-emerald-700 font-black">{grossPaid} ر.س</b>
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {orderPayments.map((pay) => {
                    const methodLabel = PAYMENT_METHOD_MAP[pay.method] || pay.method || 'نقدي';
                    return (
                      <div
                        key={pay.paymentId}
                        className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-emerald-50/40 rounded-xl border border-stone-200 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs shrink-0">
                            <CreditCard className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-black text-stone-900">{pay.amount} ر.س</span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
                                طريقة الدفع: {methodLabel}
                              </span>
                              {pay.receiptNumber && (
                                <span className="text-[10px] text-stone-400 font-mono">
                                  #{pay.receiptNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-2">
                              <span>{new Date(pay.createdAt).toLocaleDateString('ar-SA')}</span>
                              {pay.createdByName && <span>• المستلم: {pay.createdByName}</span>}
                              {pay.notes && <span>• {pay.notes}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-emerald-200 shrink-0">
                          تم الاستلام ✓
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List of Registered Refunds */}
            {orderRefunds.length > 0 && (
              <div className="bg-white rounded-xl border border-rose-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-rose-950 border-b border-rose-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                    المبالغ المعادة للعميل ({orderRefunds.length})
                  </span>
                  <span className="text-[11px] text-rose-800 font-semibold">
                    إجمالي المعاد: <b className="text-rose-700 font-black">{totalRefunds} ر.س</b>
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {orderRefunds.map((ref) => {
                    const methodLabel = PAYMENT_METHOD_MAP[ref.paymentMethod] || ref.paymentMethod || 'نقدي';
                    return (
                      <div
                        key={ref.refundId}
                        className="flex items-center justify-between p-2.5 bg-rose-50/50 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-900 flex items-center justify-center font-bold text-xs shrink-0">
                            <RotateCcw className="w-4 h-4 text-rose-700" />
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-black text-rose-900">{ref.amount} ر.س</span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200">
                                طريقة الإرجاع: {methodLabel}
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-2">
                              <span>{new Date(ref.createdAt).toLocaleDateString('ar-SA')}</span>
                              {ref.recordedBy && <span>• المسؤول: {ref.recordedBy}</span>}
                              {ref.reason && <span className="text-rose-900 font-medium">• السبب: {ref.reason}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-rose-700 bg-white px-2 py-1 rounded-lg border border-rose-200 shrink-0">
                          تم الإرجاع ↩
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order with Payments Modal */}
      {showCancelWarningModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-amber-800 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                تأكيد إلغاء أمر التفصيل #{order.orderNumber}
              </h3>
              <button
                disabled={isCancelling}
                onClick={() => setShowCancelWarningModal(false)}
                className="text-amber-200 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed font-semibold space-y-1.5">
                <div>
                  هذا الطلب يحتوي على دفعات مستلمة قدرها <b className="font-black text-amber-900 text-sm">{grossPaid} ر.س</b>
                  {totalRefunds > 0 && <span> (تم إرجاع {totalRefunds} ر.س منها سابقاً)</span>}.
                </div>
                {netPaid > 0 ? (
                  <div className="text-amber-900 bg-amber-100/60 p-2 rounded-xl border border-amber-300">
                    الصافي المحصل لدى المتجر حالياً: <b className="font-black text-base text-amber-950">{netPaid} ر.س</b>.
                  </div>
                ) : (
                  <div className="text-stone-700">
                    تمت تسوية كافة المبالغ المستلمة ولا يوجد رصيد معلق.
                  </div>
                )}
                <div className="text-[11px] text-amber-800">
                  عند تأكيد الإلغاء، سيصبح المبلغ المتبقي للتحصيل من العميل <b>0 ر.س</b> (طلب ملغي).
                </div>
              </div>

              {netPaid > 0 && canAccessPayments && (
                <div className="space-y-2.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                  <span className="text-xs font-black text-stone-900 block">
                    كيف ترغب في تسوية الرصيد المسدد ({netPaid} ر.س)؟
                  </span>
                  
                  <div className="space-y-2 text-xs">
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      cancelRefundOption === 'refund_now'
                        ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}>
                      <input
                        type="radio"
                        name="cancelRefundOption"
                        value="refund_now"
                        checked={cancelRefundOption === 'refund_now'}
                        onChange={() => setCancelRefundOption('refund_now')}
                        className="mt-0.5 text-rose-700 focus:ring-rose-500"
                      />
                      <div>
                        <div className="font-bold">إلغاء الطلب وتسجيل إرجاع كامل المبلغ ({netPaid} ر.س) للعميل الآن</div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          يقوم بإنشاء سند استرداد فوري وتسوية رصيد الطلب بالكامل.
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      cancelRefundOption === 'refund_later'
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}>
                      <input
                        type="radio"
                        name="cancelRefundOption"
                        value="refund_later"
                        checked={cancelRefundOption === 'refund_later'}
                        onChange={() => setCancelRefundOption('refund_later')}
                        className="mt-0.5 text-amber-700 focus:ring-amber-500"
                      />
                      <div>
                        <div className="font-bold">إلغاء الطلب فقط (إبقاء المبلغ كأمانة وتسجيل الإرجاع لاحقاً)</div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          يبقى المبلغ كأمانة مستحقة للعميل في تفاصيل الطلب لحين تسليمه فعلياً.
                        </div>
                      </div>
                    </label>
                  </div>

                  {cancelRefundOption === 'refund_now' && (
                    <div className="mt-2 pt-2 border-t border-rose-200 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-rose-950 shrink-0">طريقة تسليم الإرجاع:</span>
                      <select
                        value={cancelRefundMethod}
                        onChange={(e) => setCancelRefundMethod(e.target.value as any)}
                        className="w-full px-2.5 py-1 text-xs font-bold bg-white rounded-lg border border-rose-300 text-rose-950"
                      >
                        <option value="cash">نقدي (كاش)</option>
                        <option value="card">عكس عملية مدى / شبكة</option>
                        <option value="bank_transfer">تحويل بنكي</option>
                        <option value="stc_pay">STC Pay</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setShowCancelWarningModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancel}
                  className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isCancelling ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ الإلغاء...</span>
                    </>
                  ) : (
                    <span>تأكيد إلغاء الطلب</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Unpaid Order Confirmation Modal */}
      {showCancelUnpaidModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <Ban className="w-5 h-5 text-stone-300" />
                تأكيد إلغاء الطلب #{order.orderNumber}
              </h3>
              <button
                disabled={isCancelling}
                onClick={() => setShowCancelUnpaidModal(false)}
                className="text-stone-300 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-bold text-stone-800 leading-relaxed">
                هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟
              </p>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
                لم يتم تسجيل أي دفعات مالية على هذا الطلب. سيتم تعيين حالة الطلب إلى (ملغي) ولن يترتب عليه أي التزامات مالية.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setShowCancelUnpaidModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancelUnpaid}
                  className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isCancelling ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ الإلغاء...</span>
                    </>
                  ) : (
                    <span>تأكيد الإلغاء</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};
