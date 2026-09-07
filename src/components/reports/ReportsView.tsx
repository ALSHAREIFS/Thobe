import React, { useState, useMemo, useRef } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { ORDER_STATUS_LABELS } from '../../utils/presets';
import { Order, Payment, Refund, PAYMENT_METHOD_MAP } from '../../types';
import { calculateOrderFinancials } from '../../utils/financialCalculations';
import { TailorService } from '../../services/firebaseService';
import {
  TrendingUp,
  CreditCard,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Receipt,
  Eye,
  FileCheck,
  ShieldCheck,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
  ArrowRight,
  User,
  Phone,
  Wallet,
  Coins,
  Check,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    orders = [],
    payments = [],
    refunds = [],
    addRefund,
    startEditOrder,
    startRepeatOrder,
    setOrderToPrint,
  } = useShop();

  const { currentUser, currentShop } = useAuth();

  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED' | 'UNSETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Modal for refunding unlinked payments or quick refunds
  const [unlinkedRefundTarget, setUnlinkedRefundTarget] = useState<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerId: string;
    maxRefundable: number;
    receiptNumber?: string;
  } | null>(null);
  const [modalRefundAmount, setModalRefundAmount] = useState<number>(0);
  const [modalRefundMethod, setModalRefundMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'stc_pay'>('cash');
  const [modalRefundReason, setModalRefundReason] = useState<string>('');
  const [isSubmittingModalRefund, setIsSubmittingModalRefund] = useState(false);
  const [modalRefundError, setModalRefundError] = useState<string | null>(null);
  const isSubmittingModalRefundLock = useRef(false);

  const safeOrders = useMemo(() => orders ?? [], [orders]);
  const safePayments = useMemo(() => payments ?? [], [payments]);
  const safeRefunds = useMemo(() => refunds ?? [], [refunds]);

  // Order ID Lookup Set
  const existingOrderMap = useMemo(() => {
    const map = new Map<string, Order>();
    safeOrders.forEach((o) => {
      if (o?.orderId) map.set(o.orderId, o);
    });
    return map;
  }, [safeOrders]);

  // Per-Order Ledger Mapping (Single source of truth: payments & refunds collections)
  const orderLedgers = useMemo(() => {
    return safeOrders.filter(Boolean).map((ord) => {
      const fin = calculateOrderFinancials(ord, safePayments, safeRefunds);
      const isDelivered = ord?.status === 'DELIVERED';
      const isFullySettled = fin.isCancelled ? fin.unrefundedLiability === 0 : fin.activeRemaining === 0;

      const ordPayments = safePayments.filter(
        (p) => p && ord?.orderId && (p.orderId === ord.orderId || (p.orderNumber && p.orderNumber === ord.orderNumber))
      );
      const ordRefunds = safeRefunds.filter(
        (r) => r && ord?.orderId && (r.orderId === ord.orderId || (r.orderNumber && r.orderNumber === ord.orderNumber))
      );

      return {
        order: ord,
        payments: ordPayments,
        refunds: ordRefunds,
        grossPaid: fin.grossPaid,
        totalRefunded: fin.grossRefunded,
        netPaid: fin.netPaid,
        activeRemaining: fin.activeRemaining,
        unrefundedCancelled: fin.unrefundedLiability,
        isCancelled: fin.isCancelled,
        isDelivered,
        totalAmount: fin.totalAmount,
        isFullySettled,
        hasFinancialMismatch: fin.hasFinancialMismatch,
        mismatchReason: fin.mismatchReason,
      };
    });
  }, [safeOrders, safePayments, safeRefunds]);

  // Identify Unlinked Payments & Refunds
  const linkedPaymentIds = useMemo(() => {
    const ids = new Set<string>();
    orderLedgers.forEach((l) => {
      l.payments.forEach((p) => {
        if (p.paymentId) ids.add(p.paymentId);
      });
    });
    return ids;
  }, [orderLedgers]);

  const linkedRefundIds = useMemo(() => {
    const ids = new Set<string>();
    orderLedgers.forEach((l) => {
      l.refunds.forEach((r) => {
        if (r.refundId) ids.add(r.refundId);
      });
    });
    return ids;
  }, [orderLedgers]);

  const unlinkedPayments = useMemo(() => {
    return safePayments.filter((p) => p && !linkedPaymentIds.has(p.paymentId));
  }, [safePayments, linkedPaymentIds]);

  const unlinkedRefunds = useMemo(() => {
    return safeRefunds.filter((r) => r && !linkedRefundIds.has(r.refundId));
  }, [safeRefunds, linkedRefundIds]);

  // Group unlinked payments by orderId / reference
  const unlinkedGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        orderId: string;
        orderNumber: string;
        customerName: string;
        customerId: string;
        payments: Payment[];
        refunds: Refund[];
        grossPaid: number;
        totalRefunded: number;
        netBalance: number;
      }
    >();

    unlinkedPayments.forEach((p) => {
      const key = p.orderId || p.orderNumber || p.paymentId;
      if (!map.has(key)) {
        map.set(key, {
          orderId: p.orderId || key,
          orderNumber: p.orderNumber || p.orderId || 'طلب سابق',
          customerName: p.customerName || 'عميل غير مسجل',
          customerId: p.customerId || '',
          payments: [],
          refunds: [],
          grossPaid: 0,
          totalRefunded: 0,
          netBalance: 0,
        });
      }
      const item = map.get(key)!;
      item.payments.push(p);
      item.grossPaid += Number(p.amount) || 0;
    });

    unlinkedRefunds.forEach((r) => {
      const key = r.orderId || r.orderNumber || r.refundId;
      if (map.has(key)) {
        const item = map.get(key)!;
        item.refunds.push(r);
        item.totalRefunded += Number(r.amount) || 0;
      }
    });

    map.forEach((item) => {
      item.netBalance = Math.max(0, item.grossPaid - item.totalRefunded);
    });

    return Array.from(map.values());
  }, [unlinkedPayments, unlinkedRefunds]);

  const totalUnlinkedPayments = unlinkedPayments.reduce((acc, p) => acc + (Number(p?.amount) || 0), 0);
  const totalUnlinkedRefunds = unlinkedRefunds.reduce((acc, r) => acc + (Number(r?.amount) || 0), 0);
  const netUnlinked = Math.max(0, totalUnlinkedPayments - totalUnlinkedRefunds);

  // Aggregate Master KPIs
  const validOrders = safeOrders.filter((o) => o && o.status !== 'CANCELLED');
  const totalRevenue = validOrders.reduce((acc, o) => acc + (Number(o?.pricing?.totalAmount) || 0), 0);
  const totalGrossPaid = safePayments.reduce((acc, p) => acc + (Number(p?.amount) || 0), 0);
  const totalRefunds = safeRefunds.reduce((acc, r) => acc + (Number(r?.amount) || 0), 0);
  const totalNetPaid = Math.max(0, totalGrossPaid - totalRefunds);
  const totalRemaining = orderLedgers.reduce((acc, l) => acc + l.activeRemaining, 0);
  const totalGarments = validOrders.reduce((acc, o) => acc + (Number(o?.quantity) || 1), 0);

  // Unrefunded balance on cancelled orders
  const unrefundedCancelledOrders = useMemo(() => {
    return orderLedgers.filter((l) => l.unrefundedCancelled > 0);
  }, [orderLedgers]);

  const totalUnrefundedCancelled = unrefundedCancelledOrders.reduce(
    (acc, l) => acc + l.unrefundedCancelled,
    0
  );

  // Filtered Orders for Table
  const filteredOrderLedgers = useMemo(() => {
    return orderLedgers.filter((l) => {
      // Status Filter
      if (filterStatus === 'ACTIVE' && (l.isCancelled || l.isDelivered)) return false;
      if (filterStatus === 'DELIVERED' && !l.isDelivered) return false;
      if (filterStatus === 'CANCELLED' && !l.isCancelled) return false;
      if (filterStatus === 'UNSETTLED' && l.isFullySettled) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orderNum = (l.order?.orderNumber || '').toLowerCase();
        const custName = (l.order?.customerName || '').toLowerCase();
        const custPhone = (l.order?.customerPhone || '').toLowerCase();
        const hasReceipt = l.payments.some((p) => (p.receiptNumber || '').toLowerCase().includes(q));
        if (!orderNum.includes(q) && !custName.includes(q) && !custPhone.includes(q) && !hasReceipt) {
          return false;
        }
      }

      return true;
    });
  }, [orderLedgers, filterStatus, searchQuery]);

  // Group by Garment Type
  const garmentTypeCounts: Record<string, number> = {};
  validOrders.forEach((o) => {
    const type = o?.garmentType || 'سعودي كلاسيك';
    const qty = Number(o?.quantity) || 1;
    garmentTypeCounts[type] = (garmentTypeCounts[type] || 0) + qty;
  });

  // Group by Payment Method
  const paymentMethodGross: Record<string, number> = {
    card: 0,
    cash: 0,
    stc_pay: 0,
    bank_transfer: 0,
  };
  safePayments.forEach((p) => {
    const m = (p?.method || (p as any)?.paymentMethod || 'cash') as string;
    const amt = Number(p?.amount) || 0;
    if (m in paymentMethodGross) {
      paymentMethodGross[m] = (paymentMethodGross[m] || 0) + amt;
    }
  });

  const refundMethodAmounts: Record<string, number> = {
    card: 0,
    cash: 0,
    stc_pay: 0,
    bank_transfer: 0,
  };
  safeRefunds.forEach((r) => {
    const m = (r?.paymentMethod || 'cash') as string;
    const amt = Number(r?.amount) || 0;
    if (m in refundMethodAmounts) {
      refundMethodAmounts[m] = (refundMethodAmounts[m] || 0) + amt;
    }
  });

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleOpenUnlinkedRefund = (item: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerId: string;
    netBalance: number;
    payments: Payment[];
  }) => {
    setUnlinkedRefundTarget({
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      customerName: item.customerName,
      customerId: item.customerId,
      maxRefundable: item.netBalance,
      receiptNumber: item.payments[0]?.receiptNumber,
    });
    setModalRefundAmount(item.netBalance);
    setModalRefundMethod('cash');
    setModalRefundReason('إرجاع دفعة لطلب سابق');
    setModalRefundError(null);
    isSubmittingModalRefundLock.current = false;
  };

  const handleConfirmModalRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingModalRefundLock.current || !unlinkedRefundTarget) return;

    if (modalRefundAmount <= 0 || isNaN(modalRefundAmount)) {
      setModalRefundError('يجب إدخال مبلغ استرداد صحيح أكبر من الصفر.');
      return;
    }

    if (modalRefundAmount > unlinkedRefundTarget.maxRefundable) {
      setModalRefundError(`المبلغ المطلوب يتجاوز الرصيد القابل للاسترداد (${unlinkedRefundTarget.maxRefundable} ر.س).`);
      return;
    }

    isSubmittingModalRefundLock.current = true;
    setIsSubmittingModalRefund(true);
    setModalRefundError(null);

    try {
      await addRefund({
        orderId: unlinkedRefundTarget.orderId,
        orderNumber: unlinkedRefundTarget.orderNumber,
        customerId: unlinkedRefundTarget.customerId || '',
        customerName: unlinkedRefundTarget.customerName || 'عميل غير مسجل',
        amount: modalRefundAmount,
        paymentMethod: modalRefundMethod,
        reason: modalRefundReason.trim() || 'إرجاع دفعة للعميل',
        recordedBy: currentUser?.fullName || 'المستخدم',
        recordedByUid: currentUser?.userId || '',
      });

      setUnlinkedRefundTarget(null);
    } catch (err: any) {
      console.error('Error recording refund:', err);
      setModalRefundError(err.message || 'فشلت عملية إرجاع المبلغ');
      isSubmittingModalRefundLock.current = false;
    } finally {
      setIsSubmittingModalRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-700" />
              التقارير وحركة مبيعات المتجر
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              متابعة دقيقة لدفعات العملاء والمبالغ المعادة، وصافي دخل المتجر وحساب كل طلب
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 bg-stone-100 text-stone-700 rounded-xl border border-stone-200">
              {safeOrders.length} طلب • {safePayments.length} دفعة مسجلة • {safeRefunds.length} مبلغ معاد
            </span>
          </div>
        </div>
      </div>

      {/* Warning Box: Unlinked / Orphan Payments needing review */}
      {netUnlinked > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-black text-amber-950">
                  ⚠️ مبلغ يحتاج مراجعة: يوجد مبلغ مقبوض بقيمة {netUnlinked} ر.س لطلب سابق غير موجود بالقائمة الحالية
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg">
                  {unlinkedGrouped.filter((g) => g.netBalance > 0).length} دفعة تحتاج مراجعة
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                تم تسجيل هذه الدفعة سابقاً في النظام، وحُفظت لضمان دقة الصندوق والحساب البنكي. يمكنك إرجاع المبلغ للعميل وتوثيق الإرجاع في النظام بضغطة زر:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {unlinkedGrouped
                  .filter((g) => g.netBalance > 0)
                  .map((item) => (
                    <div
                      key={item.orderId}
                      className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-500">العميل:</span>
                          <span className="font-black text-stone-900">{item.customerName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-500">المرجع / الطلب السابق:</span>
                          <span className="font-mono font-bold text-amber-900">{item.orderNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-500">المبلغ المدفوع:</span>
                          <span className="font-black text-emerald-700">{item.grossPaid} ر.س</span>
                        </div>
                        {item.totalRefunded > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-500">تم إرجاع سابقاً:</span>
                            <span className="font-black text-rose-700">{item.totalRefunded} ر.س</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                          <span className="font-bold text-stone-700">المتبقي للإرجاع:</span>
                          <span className="font-black text-base text-amber-900">{item.netBalance} ر.س</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenUnlinkedRefund(item)}
                          className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>تم إرجاع المبلغ للعميل</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Box: Unrefunded Cancelled Orders */}
      {totalUnrefundedCancelled > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 p-5 rounded-2xl shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-900 rounded-xl mt-0.5">
              <RotateCcw className="w-5 h-5 text-rose-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-black text-rose-950">
                  تنبيه: يوجد {totalUnrefundedCancelled} ر.س مدفوعة لطلبات ملغاة بانتظار إرجاعها للعميل
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-rose-200 text-rose-900 rounded-lg">
                  {unrefundedCancelledOrders.length} طلب ملغي
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                تم إلغاء هذه الطلبات ولكن لم يتم إرجاع كامل المبلغ للعميل حتى الآن.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {unrefundedCancelledOrders.map((l, idx) => (
                  <button
                    key={l.order?.orderId || `cancelled-${idx}`}
                    onClick={() => setSelectedOrderForModal(l.order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-950 rounded-xl border border-rose-300 text-xs font-black transition-all shadow-2xs cursor-pointer"
                  >
                    <span>#{l.order?.orderNumber} ({l.order?.customerName}): متبقي للإرجاع {l.unrefundedCancelled} ر.س</span>
                    <Eye className="w-3.5 h-3.5 text-rose-700" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5 Simplified Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 block">إجمالي المبيعات النشطة</span>
          <div className="text-2xl font-black text-stone-900 mt-2">{totalRevenue} ر.س</div>
          <span className="text-[11px] text-stone-400 mt-1 block">
            {validOrders.length} طلب ساري ({totalGarments} ثوب)
          </span>
        </div>

        {/* 2. Gross Collected */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 block">دفعات العملاء</span>
          <div className="text-2xl font-black text-emerald-800 mt-2">{totalGrossPaid} ر.س</div>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {safePayments.length} دفعة مسجلة
          </span>
        </div>

        {/* 3. Total Refunds */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-xs font-bold text-rose-800 block">المبالغ المعادة</span>
          <div className="text-2xl font-black text-rose-800 mt-2">{totalRefunds} ر.س</div>
          <span className="text-[11px] text-rose-600 mt-1 block">
            {safeRefunds.length} مبالغ معادة للعملاء
          </span>
        </div>

        {/* 4. Net Collected */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-700 block">الصافي المسجل بعد الاسترداد</span>
          <div className="text-2xl font-black text-stone-900 mt-2">{totalNetPaid} ر.س</div>
          <span className="text-[11px] text-stone-500 mt-1 block">
            المبلغ الفعلي بالصندوق والبنك
          </span>
        </div>

        {/* 5. Remaining */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-amber-800 block">المتبقي للتحصيل</span>
          <div className="text-2xl font-black text-amber-800 mt-2">{totalRemaining} ر.س</div>
          <span className="text-[11px] text-amber-600 mt-1 block">للطلبات النشطة عند الاستلام</span>
        </div>
      </div>

      {/* Orders Table with Search & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-700" />
              سجل حسابات طلبات التفصيل ({orderLedgers.length} طلب)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              متابعة حساب كل طلب مع المدفوع والمسترد والمتبقي
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث برقم الطلب أو اسم العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-hidden focus:border-amber-700"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'ACTIVE', label: 'السارية' },
                { id: 'DELIVERED', label: 'المستلمة' },
                { id: 'CANCELLED', label: 'الملغاة' },
                { id: 'UNSETTLED', label: 'تحتاج مراجعة ⚠️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as any)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterStatus === tab.id
                      ? 'bg-white text-stone-900 shadow-2xs font-black'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredOrderLedgers.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs font-bold bg-stone-50 rounded-xl">
            لا توجد طلبات تطابق معايير البحث والفلترة المحددة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 font-black">الطلب والعميل</th>
                  <th className="py-2.5 px-3 font-black">الحالة</th>
                  <th className="py-2.5 px-3 font-black text-center">إجمالي الطلب</th>
                  <th className="py-2.5 px-3 font-black text-center text-emerald-800">المدفوع</th>
                  <th className="py-2.5 px-3 font-black text-center text-rose-800">المسترد</th>
                  <th className="py-2.5 px-3 font-black text-center">الصافي</th>
                  <th className="py-2.5 px-3 font-black">حالة الحساب</th>
                  <th className="py-2.5 px-3 font-black text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrderLedgers.map((l, idx) => {
                  const isExpanded = expandedOrderIds.has(l.order.orderId);
                  const hasHistory = l.payments.length > 0 || l.refunds.length > 0;

                  return (
                    <React.Fragment key={l.order?.orderId || `order-${idx}`}>
                      <tr className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-stone-900">
                          <div className="flex items-center gap-1.5">
                            {hasHistory && (
                              <button
                                onClick={() => toggleExpandOrder(l.order.orderId)}
                                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
                                title="عرض حركة المبالغ"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <div>
                              <div>#{l.order?.orderNumber || '—'}</div>
                              <div className="text-[11px] font-normal text-stone-500">{l.order?.customerName || 'عميل غير محدد'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.isCancelled
                              ? 'bg-rose-100 text-rose-800'
                              : l.order?.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ORDER_STATUS_LABELS[l.order?.status]?.label || l.order?.status || 'غير محدد'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-stone-800 text-center">
                          {l.totalAmount} ر.س
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-700 text-center">
                          {l.grossPaid} ر.س
                          <span className="text-[10px] font-normal text-stone-400 block">({l.payments.length} دفعة)</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-rose-700 text-center">
                          {l.totalRefunded > 0 ? `${l.totalRefunded} ر.س` : '—'}
                          {l.totalRefunded > 0 && (
                            <span className="text-[10px] font-normal text-stone-400 block">({l.refunds.length} مبلغ معاد)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-black text-stone-900 text-center">
                          {l.netPaid} ر.س
                        </td>
                        <td className="py-3 px-3 font-bold text-xs">
                          {l.isCancelled ? (
                            l.unrefundedCancelled > 0 ? (
                              <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg inline-block text-[11px]">
                                ⚠️ متبقي للإرجاع ({l.unrefundedCancelled} ر.س)
                              </span>
                            ) : (
                              <span className="text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg inline-block text-[11px]">
                                ✅ تم إرجاع المبلغ بالكامل
                              </span>
                            )
                          ) : (
                            l.activeRemaining === 0 ? (
                              <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg inline-block text-[11px]">
                                ✅ مسدد بالكامل
                              </span>
                            ) : (
                              <span className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded-lg inline-block text-[11px]">
                                ⏳ متبقي {l.activeRemaining} ر.س
                              </span>
                            )
                          )}
                          {l.hasFinancialMismatch && (
                            <div className="mt-1">
                              <span
                                className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold inline-block"
                                title={l.mismatchReason}
                              >
                                ⚠️ يحتاج تدقيق مالي
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setSelectedOrderForModal(l.order)}
                            className="px-2.5 py-1 text-stone-700 hover:text-amber-900 bg-stone-100 hover:bg-amber-100 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-700" />
                            <span>تفاصيل</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Breakdown of Payments and Refunds */}
                      {isExpanded && (
                        <tr className="bg-stone-50/80">
                          <td colSpan={8} className="p-3 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                              {/* Payments */}
                              <div>
                                <span className="font-bold text-emerald-800 flex items-center gap-1 mb-2">
                                  <Receipt className="w-3.5 h-3.5" />
                                  دفعات العميل المسجلة ({l.payments.length}):
                                </span>
                                {l.payments.length === 0 ? (
                                  <span className="text-stone-400 text-[11px]">لا توجد دفعات مسجلة لهذا الطلب</span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {l.payments.map((p) => (
                                      <div key={p.paymentId} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg border border-stone-100 text-[11px]">
                                        <div>
                                          <span className="font-black text-stone-900">{p.amount} ر.س</span>
                                          <span className="text-stone-500 mr-2">({PAYMENT_METHOD_MAP[p.method] || p.method})</span>
                                          {p.receiptNumber && <span className="text-stone-400 font-mono mr-2">#{p.receiptNumber}</span>}
                                        </div>
                                        <span className="text-stone-400">{new Date(p.createdAt).toLocaleDateString('ar-SA')}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Refunds */}
                              <div>
                                <span className="font-bold text-rose-800 flex items-center gap-1 mb-2">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  المبالغ المعادة للعميل ({l.refunds.length}):
                                </span>
                                {l.refunds.length === 0 ? (
                                  <span className="text-stone-400 text-[11px]">لا توجد مبالغ معادة لهذا الطلب</span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {l.refunds.map((r) => (
                                      <div key={r.refundId} className="flex items-center justify-between p-2 bg-rose-50/50 rounded-lg border border-rose-100 text-[11px]">
                                        <div>
                                          <span className="font-black text-rose-900">{r.amount} ر.س</span>
                                          <span className="text-rose-700 mr-2">({PAYMENT_METHOD_MAP[r.paymentMethod] || r.paymentMethod})</span>
                                          {r.reason && <span className="text-stone-600 mr-2">• {r.reason}</span>}
                                        </div>
                                        <span className="text-stone-400">{new Date(r.createdAt).toLocaleDateString('ar-SA')}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Methods & Thobe Styles Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-700" />
            توزيع طرق الدفع وصافي العمليات
          </h3>
          <div className="space-y-4">
            {[
              { id: 'card', label: 'شبكة / مدى', gross: paymentMethodGross.card || 0, ref: refundMethodAmounts.card || 0, color: 'bg-emerald-700' },
              { id: 'cash', label: 'نقدي (كاش)', gross: paymentMethodGross.cash || 0, ref: refundMethodAmounts.cash || 0, color: 'bg-amber-800' },
              { id: 'stc_pay', label: 'STC Pay', gross: paymentMethodGross.stc_pay || 0, ref: refundMethodAmounts.stc_pay || 0, color: 'bg-purple-700' },
              { id: 'bank_transfer', label: 'تحويل بنكي', gross: paymentMethodGross.bank_transfer || 0, ref: refundMethodAmounts.bank_transfer || 0, color: 'bg-blue-700' },
            ].map((p) => {
              const net = Math.max(0, p.gross - p.ref);
              const pct = totalNetPaid > 0 ? Math.round((net / totalNetPaid) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                    <span>{p.label}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-emerald-700">مدفوع: {p.gross}</span>
                      {p.ref > 0 && <span className="text-rose-600">معاد: -{p.ref}</span>}
                      <span className="font-black text-stone-900">صافي: {net} ر.س ({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${p.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thobe Styles */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-700" />
            توزيع قصات الثياب (الطلبات النشطة)
          </h3>
          <div className="space-y-3">
            {Object.keys(garmentTypeCounts).length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400 font-bold bg-stone-50 rounded-xl">
                لا توجد ثياب نشطة سارية حالياً
              </div>
            ) : (
              Object.entries(garmentTypeCounts).map(([type, count]) => {
                const pct = totalGarments > 0 ? Math.round((count / totalGarments) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-1">
                      <span>{type}</span>
                      <span>{count} ثياب ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-800 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal for Unlinked Refund Submission */}
      {unlinkedRefundTarget && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-amber-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-300" />
                إرجاع مبلغ للعميل
              </h3>
              <button
                disabled={isSubmittingModalRefund}
                onClick={() => setUnlinkedRefundTarget(null)}
                className="text-amber-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmModalRefund} className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1.5 text-stone-800">
                <div className="flex justify-between">
                  <span className="text-stone-500">اسم العميل:</span>
                  <span className="font-black">{unlinkedRefundTarget.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">الطلب المرجعي:</span>
                  <span className="font-mono font-bold text-amber-900">{unlinkedRefundTarget.orderNumber}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-amber-200">
                  <span className="font-bold text-amber-950">المبلغ القابل للإرجاع:</span>
                  <span className="font-black text-emerald-800">{unlinkedRefundTarget.maxRefundable} ر.س</span>
                </div>
              </div>

              {modalRefundError && (
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{modalRefundError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    المبلغ المراد إرجاعه (ر.س): <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={unlinkedRefundTarget.maxRefundable}
                    step="any"
                    required
                    value={modalRefundAmount || ''}
                    onChange={(e) => setModalRefundAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-black bg-stone-50 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">طريقة الإرجاع:</label>
                  <select
                    value={modalRefundMethod}
                    onChange={(e) => setModalRefundMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold bg-stone-50 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-hidden"
                  >
                    <option value="cash">نقدي (كاش)</option>
                    <option value="card">عكس عملية مدى / شبكة</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="stc_pay">STC Pay</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">سبب الاسترداد:</label>
                  <input
                    type="text"
                    value={modalRefundReason}
                    onChange={(e) => setModalRefundReason(e.target.value)}
                    placeholder="مثال: إرجاع دفعة لطلب سابق"
                    className="w-full px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isSubmittingModalRefund}
                  onClick={() => setUnlinkedRefundTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModalRefund || modalRefundAmount <= 0}
                  className="px-6 py-2 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isSubmittingModalRefund ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تأكيد إرجاع المبلغ للعميل</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderForModal && (
        <OrderDetailModal
          order={selectedOrderForModal}
          onClose={() => setSelectedOrderForModal(null)}
          onPrint={() => {
            const ord = selectedOrderForModal;
            setSelectedOrderForModal(null);
            setOrderToPrint(ord);
          }}
          onRepeat={() => {
            const ord = selectedOrderForModal;
            setSelectedOrderForModal(null);
            startRepeatOrder(ord);
          }}
          onEdit={() => {
            const ord = selectedOrderForModal;
            setSelectedOrderForModal(null);
            startEditOrder(ord);
          }}
        />
      )}
    </div>
  );
};
