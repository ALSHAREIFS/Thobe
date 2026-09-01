import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, Payment, PAYMENT_METHOD_MAP } from '../../types';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { TailorService } from '../../services/firebaseService';
import { ORDER_STATUS_LABELS } from '../../utils/presets';
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
} from 'lucide-react';
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
  const { updateOrderStatus, addPayment, deleteOrder, payments: contextPayments } = useShop();
  const { currentUser, currentShop, isOwner, isManager } = useAuth();

  const [statusNote, setStatusNote] = useState('');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(order.pricing.remainingAmount || 0);
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'stc_pay'>('cash');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteBlockedModal, setShowDeleteBlockedModal] = useState(false);
  const [showCancelWarningModal, setShowCancelWarningModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [directPayments, setDirectPayments] = useState<Payment[]>([]);

  const m = order.measurements;
  const td = order.tailoringDetails;
  const p = order.pricing;

  // Direct load of payment documents from Firestore for this order
  useEffect(() => {
    const shopId = currentShop?.shopId || order.shopId;
    if (!shopId || !order.orderId) return;

    let isMounted = true;
    TailorService.getPayments(shopId, order.orderId)
      .then((pays) => {
        if (isMounted) {
          setDirectPayments(pays);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch direct payments for order details:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentShop?.shopId, order.shopId, order.orderId]);

  // Combine real-time context payments and direct Firestore query with deduplication
  const allCandidatePayments = [...directPayments, ...(contextPayments || []).filter(
    (pay) => pay.orderId === order.orderId || (pay.orderNumber && pay.orderNumber === order.orderNumber)
  )];

  const orderPaymentsMap = new Map<string, Payment>();
  allCandidatePayments.forEach((pay) => {
    if (pay.paymentId) {
      orderPaymentsMap.set(pay.paymentId, pay);
    }
  });

  const orderPayments = Array.from(orderPaymentsMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const firstPaymentMethod = orderPayments[0]?.method;
  const paymentMethodsSummary = orderPayments.length > 0
    ? Array.from(new Set(orderPayments.map((pay) => PAYMENT_METHOD_MAP[pay.method] || pay.method))).join(' + ')
    : '';

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === 'CANCELLED') {
      const paid = order.pricing?.paidAmount || 0;
      if (paid > 0 || orderPayments.length > 0) {
        setShowCancelWarningModal(true);
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
      await updateOrderStatus(order.orderId, 'CANCELLED', statusNote || 'إلغاء الطلب مع وجود دفعات مسجلة سابقة');
      setStatusNote('');
      setShowCancelWarningModal(false);
    } catch (err: any) {
      console.error('Error cancelling order:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteClick = () => {
    const paid = order.pricing?.paidAmount || 0;
    const hasPayments = orderPayments.length > 0;
    if (paid > 0 || hasPayments) {
      setShowDeleteBlockedModal(true);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteOrder(order.orderId);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      console.error('Error deleting order:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    await addPayment({
      orderId: order.orderId,
      customerId: order.customerId,
      amount: payAmount,
      method: payMethod,
      type: payAmount >= p.remainingAmount ? 'FULL' : 'REMAINING',
      notes: 'سداد من شاشة تفاصيل الطلب',
      receivedBy: currentUser.userId,
      receivedByName: currentUser.fullName,
    });
    setShowPaymentInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-800 flex items-center justify-center font-mono font-black text-sm text-white">
              {order.orderNumber.slice(-4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black font-mono">{order.orderNumber}</h2>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: ORDER_STATUS_LABELS[order.status].bg,
                    color: ORDER_STATUS_LABELS[order.status].color,
                  }}
                >
                  {ORDER_STATUS_LABELS[order.status].label}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                العميل: {order.customerName} ({order.customerPhone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={handleDeleteClick}
              className="flex items-center gap-1 px-3 py-2 bg-stone-800 hover:bg-rose-900/60 text-stone-300 hover:text-rose-200 text-xs font-bold rounded-xl border border-stone-700 hover:border-rose-700 transition-all cursor-pointer"
              title="حذف الطلب"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">حذف</span>
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
              {(['NEW', 'CUTTING', 'SEWING', 'FITTING', 'READY', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).map((st) => {
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
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 mb-3">
              <Scissors className="w-4 h-4 text-amber-700" />
              المقاسات المسجلة لهذا الطلب (سم)
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-900 font-bold block">الطول الكامل</span>
                <span className="font-black text-base text-amber-950">{m.length} سم</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الكتف</span>
                <span className="font-black text-sm text-stone-900">{m.shoulder}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الصدر</span>
                <span className="font-black text-sm text-stone-900">{m.chest}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">طول الكم</span>
                <span className="font-black text-sm text-stone-900">{m.sleeveLength}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الرقبة</span>
                <span className="font-black text-sm text-stone-900">{m.neck}</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block">الكبك</span>
                <span className="font-black text-sm text-stone-900">{m.wrist}</span>
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
                <div className="font-black text-stone-900 text-sm">{td.fabric.name || 'غير محدد'}</div>
                <div className="text-stone-600">
                  {td.fabric.color || 'غير محدد'} {td.fabric.colorCode ? `(${td.fabric.colorCode})` : ''} {td.fabric.type ? `(${td.fabric.type})` : ''}
                </div>
                {td.fabric.notes && (
                  <div className="text-[11px] text-amber-900 font-bold mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ملاحظة القماش: {td.fabric.notes}
                  </div>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-stone-400 block text-[11px]">الياقة والكم:</span>
                <div className="font-bold text-stone-900">{td.collar.name || 'غير محدد'} {td.collar.stiffness ? `(${td.collar.stiffness === 'stiff' ? 'قاسية' : td.collar.stiffness === 'medium' ? 'وسط' : 'طرية'})` : ''}</div>
                <div className="text-stone-600">{td.sleeves.name || 'غير محدد'} {td.sleeves.cuffWidth ? `(${td.sleeves.cuffWidth} سم)` : ''}</div>
                {(td.collar.notes || td.sleeves.notes) && (
                  <div className="text-[11px] text-stone-700 font-medium mt-1">
                    {td.collar.notes && <div>• ياقة: {td.collar.notes}</div>}
                    {td.sleeves.notes && <div>• أكمام: {td.sleeves.notes}</div>}
                  </div>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="text-stone-400 block text-[11px]">الصدر والجيوب:</span>
                <div className="font-bold text-stone-900">{td.chest.name || 'غير محدد'}</div>
                <div className="text-stone-600">{td.pockets.chestPocketType === 'chamfered' ? 'جيب مشطوف' : td.pockets.chestPocketType === 'regular' ? 'جيب مربع' : td.pockets.chestPocketType === 'square_flap' ? 'جيب مع غطاء' : td.pockets.chestPocketType === 'hidden' ? 'جيب مخفي' : td.pockets.chestPocketType === 'none' ? 'بدون جيب' : 'غير محدد'}</div>
                {(td.chest.notes || td.pockets.notes) && (
                  <div className="text-[11px] text-stone-700 font-medium mt-1">
                    {td.chest.notes && <div>• صدر: {td.chest.notes}</div>}
                    {td.pockets.notes && <div>• جيوب: {td.pockets.notes}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* General & Additional Branch Notes */}
            {(td.garmentNotes ||
              td.buttons.notes ||
              td.bottom.notes ||
              td.embroidery?.notes ||
              td.generalNotes ||
              order.notes) && (
              <div className="mt-3 p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs">
                <span className="font-black text-amber-950 block mb-1">الملاحظات المكتوبة للتفصيل:</span>
                <div className="space-y-0.5 text-stone-800">
                  {td.garmentNotes && <div>• <b>قصة الثوب:</b> {td.garmentNotes}</div>}
                  {td.buttons.notes && <div>• <b>الأزرار:</b> {td.buttons.notes}</div>}
                  {td.bottom.notes && <div>• <b>أسفل الثوب:</b> {td.bottom.notes}</div>}
                  {td.embroidery?.notes && <div>• <b>التطريز:</b> {td.embroidery.notes}</div>}
                  {td.generalNotes && <div>• <b>ملاحظات عامة:</b> {td.generalNotes}</div>}
                  {order.notes && <div>• <b>ملاحظات الطلب:</b> {order.notes}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Financial Breakdown & Add Payment */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-700" />
                الحالة المالية وسندات القبض
              </h3>
              {p.remainingAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPaymentInput(!showPaymentInput)}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  + تسجيل سند قبض / دفعة
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div className="bg-white p-3 rounded-xl border border-stone-200 flex flex-col justify-center">
                <span className="text-xs text-stone-400 font-semibold block">إجمالي المبلغ</span>
                <span className="text-lg font-black text-stone-900">{p.totalAmount} ر.س</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/20 flex flex-col justify-center">
                <span className="text-xs text-emerald-700 font-semibold block">المدفوع (العربون)</span>
                <span className="text-lg font-black text-emerald-700">{p.paidAmount} ر.س</span>
                {p.paidAmount > 0 && (
                  <span className="text-[11px] font-bold text-emerald-800 mt-1 bg-emerald-100/80 px-2 py-0.5 rounded-md self-center border border-emerald-200/60">
                    طريقة الدفع: {orderPayments.length === 1 && orderPayments[0] ? (PAYMENT_METHOD_MAP[orderPayments[0].method] || orderPayments[0].method) : (paymentMethodsSummary || 'نقدي')}
                  </span>
                )}
              </div>
              <div className="bg-white p-3 rounded-xl border border-stone-200 flex flex-col justify-center">
                <span className="text-xs text-amber-800 font-semibold block">المتبقي</span>
                <span className="text-lg font-black text-amber-800">{p.remainingAmount} ر.س</span>
              </div>
            </div>

            {/* List of Registered Payments and Payment Methods */}
            {orderPayments.length > 0 && (
              <div className="mt-3 bg-white rounded-xl border border-stone-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-stone-800 border-b border-stone-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                    سندات القبض والدفعات المسجلة ({orderPayments.length})
                  </span>
                  <span className="text-[11px] text-stone-500 font-semibold">
                    المسدد فعلياً: <b className="text-emerald-700 font-black">{orderPayments.reduce((acc, pay) => acc + (pay.amount || 0), 0)} ر.س</b>
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
                          سند قبض ✓
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inline Payment Submission */}
            {showPaymentInput && (
              <form onSubmit={handleAddPayment} className="p-3 bg-white rounded-xl border border-stone-300 space-y-3 mt-3">
                <h4 className="font-bold text-xs text-stone-800">تسجيل دفعة نقدية أو شبكة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">المبلغ (ر.س):</label>
                    <input
                      type="number"
                      max={p.remainingAmount}
                      value={payAmount}
                      onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-sm font-bold bg-stone-50 rounded-lg border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">طريقة الدفع:</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-sm font-bold bg-stone-50 rounded-lg border border-stone-300"
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
                      className="w-full py-2 bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
                    >
                      حفظ السند
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order with Payments Warning Modal */}
      {showCancelWarningModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-amber-800 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                تأكيد إلغاء أمر التفصيل
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
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed font-semibold">
                هذا الطلب يحتوي على مبلغ مدفوع قدره <b className="font-black text-amber-900 text-sm">{order.pricing?.paidAmount || 0} ر.س</b>. إلغاء الطلب لن يحذف أو يعكس سندات القبض المسجلة. يجب تسوية/رد المبلغ بشكل منفصل.
              </div>

              <p className="text-xs text-stone-600 font-medium leading-relaxed">
                عند تأكيد الإلغاء، ستتغير حالة الطلب إلى (ملغي)، ويُستبعد من إجمالي مبيعات وطلبات المتجر في لوحة التحكم والتقارير.
              </p>

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

      {/* Delete Blocked Modal when payments exist */}
      {showDeleteBlockedModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
                تعذر الحذف النهائي للطلب
              </h3>
              <button
                onClick={() => setShowDeleteBlockedModal(false)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-stone-900">
                لا يمكن حذف الطلب رقم <span className="text-rose-700 font-mono">({order.orderNumber})</span> نهائياً.
              </p>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2">
                <p className="font-bold">
                  يحتوي هذا الطلب على دفعات مسجلة بقيمة <span className="font-black text-rose-950">{order.pricing?.paidAmount || 0} ر.س</span> ({orderPayments.length} سند قبض).
                </p>
                <p className="text-rose-700 text-[11px] leading-relaxed">
                  حذف هذا الطلب سيتسبب في وجود سندات قبض يتيمة وتشويه السجلات المحاسبية للمتجر. يرجى إلغاء الطلب بدلاً من حذفه.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteBlockedModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteBlockedModal(false);
                    handleStatusChange('CANCELLED');
                  }}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  إلغاء الطلب بدلاً من حذفه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal (only for zero paidAmount) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
                تأكيد حذف أمر التفصيل
              </h3>
              <button
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="text-rose-200 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-stone-800">
                هل أنت متأكد من حذف الطلب رقم <span className="text-rose-700 font-mono underline underline-offset-4">({order.orderNumber})</span> للعميل <span className="font-black">{order.customerName}</span>؟
              </p>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 space-y-1">
                <div className="flex justify-between">
                  <span>نوع الثوب:</span>
                  <span className="font-bold text-stone-800">{order.garmentType} ({order.quantity} ثياب)</span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي المبلغ:</span>
                  <span className="font-bold text-stone-800">{order.pricing?.totalAmount} ر.س</span>
                </div>
              </div>

              <p className="text-xs text-rose-600 font-semibold leading-relaxed">
                ⚠️ تحذير: سيتم حذف أمر التفصيل ومقاساته المخصصة نهائياً من سجلات المتجر وتحديث الإحصائيات مباشرة.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الطلب</span>
                    </>
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
