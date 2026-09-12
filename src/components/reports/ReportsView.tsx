import React, { useState, useMemo, useRef } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { ORDER_STATUS_LABELS } from '../../utils/presets';
import { Order, Payment, Refund, PAYMENT_METHOD_MAP } from '../../types';
import {
  calculateOrderFinancials,
  isCanonicalActiveSalesOrder,
  filterCanonicalActiveOrders,
} from '../../utils/financialCalculations';
import { calculateVatReportSummary, getOrderVatSnapshot } from '../../utils/vatCalculations';
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
  Info,
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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED' | 'UNSETTLED' | 'VAT_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [showVatDetails, setShowVatDetails] = useState<boolean>(false);
  const [showVatDisclaimerInfo, setShowVatDisclaimerInfo] = useState<boolean>(false);
  const [showCashFlowDetails, setShowCashFlowDetails] = useState<boolean>(false);

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

  // Canonical Active Sales Orders (Strictly excludes CANCELLED/voided orders)
  const validOrders = useMemo(() => filterCanonicalActiveOrders(safeOrders), [safeOrders]);
  const totalRevenue = useMemo(
    () => validOrders.reduce((acc, o) => acc + (Number(o?.pricing?.totalAmount) || 0), 0),
    [validOrders]
  );
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

  // VAT Report Summary (aligned with canonical active sales population)
  const vatReport = useMemo(() => {
    return calculateVatReportSummary(validOrders, safeRefunds);
  }, [validOrders, safeRefunds]);

  // Filtered Orders for Table
  const filteredOrderLedgers = useMemo(() => {
    return orderLedgers.filter((l) => {
      // Status Filter
      if (filterStatus === 'ACTIVE' && (l.isCancelled || l.isDelivered)) return false;
      if (filterStatus === 'DELIVERED' && !l.isDelivered) return false;
      if (filterStatus === 'CANCELLED' && !l.isCancelled) return false;
      if (filterStatus === 'UNSETTLED' && l.isFullySettled) return false;
      if (filterStatus === 'VAT_ONLY') {
        if (l.isCancelled) return false;
        const snap = getOrderVatSnapshot(l.order);
        if (!snap.vatEnabled) return false;
      }

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
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-[#1A365D]" />
              التقارير والمبيعات
            </h2>
            <p className="text-xs text-stone-500 mt-1 font-medium">
              نظرة واضحة على مبيعات المحل والتحصيل
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 bg-stone-50 text-stone-700 rounded-xl border border-stone-200">
              {validOrders.length} طلب نشط • {safePayments.length} دفعة • {safeRefunds.length} استرداد
            </span>
          </div>
        </div>
      </div>

      {/* 3 Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* 1. Total Revenue */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">إجمالي المبيعات</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[#1A365D]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-stone-900 tracking-tight">
              {totalRevenue} <span className="text-sm font-bold text-stone-400">ر.س</span>
            </div>
            <p className="text-xs text-stone-500 mt-1 font-medium">
              قيمة الطلبات النشطة
            </p>
          </div>
        </div>

        {/* 2. Total Refunds */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">المبالغ المستردة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-stone-900 tracking-tight">
              {totalRefunds} <span className="text-sm font-bold text-stone-400">ر.س</span>
            </div>
            <p className="text-xs text-rose-600/90 mt-1 font-medium">
              {safeRefunds.length} {safeRefunds.length === 1 ? 'عملية استرداد' : safeRefunds.length === 2 ? 'عمليتا استرداد' : 'عمليات استرداد'}
            </p>
          </div>
        </div>

        {/* 3. Remaining */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">المتبقي للتحصيل</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-stone-900 tracking-tight">
              {totalRemaining} <span className="text-sm font-bold text-stone-400">ر.س</span>
            </div>
            <p className="text-xs text-amber-700/90 mt-1 font-medium">
              للطلبات النشطة
            </p>
          </div>
        </div>
      </div>

      {/* Compact VAT Summary Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#1A365D]">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm text-stone-900">
                  ملخص ضريبة القيمة المضافة
                </h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  currentShop?.vatEnabled
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                    : 'bg-stone-100 text-stone-600'
                }`}>
                  {currentShop?.vatEnabled ? `${currentShop?.vatRate || 15}% مفعلة` : 'غير مفعلة'}
                </span>
                {currentShop?.vatRegistrationNumber && (
                  <span className="text-[11px] font-mono text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200">
                    الرقم الضريبي: {currentShop.vatRegistrationNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowVatDetails(!showVatDetails)}
            className="px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold border border-stone-200/80 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {showVatDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showVatDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل الضريبية'}</span>
          </button>
        </div>

        {/* 3 Primary VAT Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/70">
            <span className="text-xs text-stone-500 font-semibold block">المبيعات شامل الضريبة</span>
            <div className="text-xl font-black text-stone-900 mt-1">{vatReport.grossSalesTotal} ر.س</div>
            <span className="text-[11px] text-stone-400 mt-0.5 block">إجمالي المبيعات النشطة</span>
          </div>

          <div className="bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/70">
            <span className="text-xs text-stone-500 font-semibold block">المبيعات قبل الضريبة</span>
            <div className="text-xl font-black text-stone-900 mt-1">{vatReport.salesSubtotal} ر.س</div>
            <span className="text-[11px] text-stone-400 mt-0.5 block">بدون الضريبة</span>
          </div>

          <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/60">
            <span className="text-xs text-[#1A365D] font-bold block">ضريبة القيمة المضافة</span>
            <div className="text-xl font-black text-[#1A365D] mt-1">{vatReport.salesVatTotal} ر.س</div>
            <span className="text-[11px] text-blue-700/80 mt-0.5 block">
              {vatReport.refundedVatTotal > 0
                ? `الصافي بعد الاسترداد: ${vatReport.netVatTotal} ر.س`
                : 'المحصلة على المبيعات'}
            </span>
          </div>
        </div>

        {/* Secondary Contextual Line & Subtle Disclaimer */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-stone-500 border-t border-stone-100">
          <div className="font-medium">
            {vatReport.nonTaxableOrdersCount > 0 ? (
              <span>
                منها <strong className="text-stone-700 font-black">{vatReport.taxableGrossSales} ر.س</strong> مبيعات خاضعة للضريبة ·{' '}
                {vatReport.nonTaxableOrdersCount === 1
                  ? 'طلب سابق غير خاضع'
                  : vatReport.nonTaxableOrdersCount === 2
                  ? 'طلبان سابقان غير خاضعين'
                  : `${vatReport.nonTaxableOrdersCount} طلبات سابقة غير خاضعة`} ({vatReport.nonTaxableSales} ر.س)
              </span>
            ) : (
              <span>جميع الطلبات النشطة ({vatReport.vatOrdersCount}) خاضعة لضريبة القيمة المضافة</span>
            )}
          </div>

          {/* Discreet Disclaimer Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVatDisclaimerInfo(!showVatDisclaimerInfo)}
              className="text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-1 cursor-pointer transition-colors"
              title="معلومات الاستخدام الإداري"
            >
              <Info className="w-3.5 h-3.5" />
              <span>للاستخدام الإداري والمتابعة الداخلية</span>
            </button>
            {showVatDisclaimerInfo && (
              <div className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 p-3 bg-stone-900 text-stone-100 text-xs rounded-xl shadow-xl z-20 leading-relaxed text-right">
                هذا الملخص مخصص للإدارة والمتابعة الداخلية، ولا يمثل إقرارًا ضريبيًا رسميًا لدى هيئة الزكاة والضريبة والجمارك (ZATCA).
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Expanded Details */}
        {showVatDetails && (
          <div className="pt-3 border-t border-stone-200/80 space-y-3">
            <div className="text-xs font-bold text-stone-700">التفاصيل الضريبية والأساس المحاسبي:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-stone-500 block text-[11px]">المبيعات الخاضعة شامل الضريبة</span>
                <span className="font-black text-stone-900 text-sm mt-0.5 block">{vatReport.taxableGrossSales} ر.س</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-stone-500 block text-[11px]">الأساس الخاضع للضريبة</span>
                <span className="font-black text-stone-900 text-sm mt-0.5 block">{vatReport.taxableBase} ر.س</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-stone-500 block text-[11px]">ضريبة المبيعات</span>
                <span className="font-black text-[#1A365D] text-sm mt-0.5 block">{vatReport.salesVatTotal} ر.س</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-stone-500 block text-[11px]">مبيعات غير خاضعة / سابقة</span>
                <span className="font-black text-stone-900 text-sm mt-0.5 block">{vatReport.nonTaxableSales} ر.س</span>
                <span className="text-[10px] text-stone-400">({vatReport.nonTaxableOrdersCount} طلب)</span>
              </div>
            </div>

            {/* Impact of refunds if applicable */}
            {vatReport.refundedVatTotal > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-rose-50/60 rounded-xl border border-rose-200/60 text-xs">
                <span className="text-rose-900 font-medium">أثر الاستردادات على الضريبة المحصلة:</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-rose-700">-{vatReport.refundedVatTotal} ر.س</span>
                  <span className="text-stone-400">|</span>
                  <span className="font-black text-stone-900">صافي الضريبة المستحقة: {vatReport.netVatTotal} ر.س</span>
                </div>
              </div>
            )}

            {/* Multi-rate breakdown: ONLY show if Object.keys(vatReport.byRate).length > 1 */}
            {Object.keys(vatReport.byRate).length > 1 && (
              <div className="pt-2">
                <span className="font-bold text-xs text-stone-700 block mb-2">تفصيل الضرائب حسب النسبة المطبقة:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(vatReport.byRate).map(([rateStr, data]: [string, { orderCount: number; subtotal: number; vat: number; total: number }]) => (
                    <div
                      key={rateStr}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#1A365D] text-white rounded-lg font-black text-xs">
                          %{rateStr}
                        </span>
                        <div>
                          <div className="font-bold text-stone-900">{data.orderCount} طلبات</div>
                          <div className="text-[11px] text-stone-500">الأساس: {data.subtotal} ر.س</div>
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <div className="text-[#1A365D] font-black">{data.vat} ر.س ضريبة</div>
                        <div className="text-stone-500 text-[11px]">الإجمالي: {data.total} ر.س</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Financial Movement Details Section (Collapsible) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs transition-all">
        <button
          type="button"
          onClick={() => setShowCashFlowDetails(!showCashFlowDetails)}
          className="w-full flex items-center justify-between flex-wrap gap-3 text-right cursor-pointer group"
          aria-expanded={showCashFlowDetails}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-[#1A365D] shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-stone-900">
                تفاصيل الحركة المالية
              </h3>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
                ملخص المبالغ التي دخلت وخرجت فعليًا من المتجر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 group-hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold border border-stone-200/80 transition-colors">
            {showCashFlowDetails ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>إخفاء التفاصيل</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>عرض التفاصيل</span>
              </>
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {showCashFlowDetails && (
          <div className="pt-4 mt-3 border-t border-stone-100 space-y-4">
            {/* 3 Small & Equal Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              {/* 1. Gross Paid: Neutral Styling */}
              <div className="bg-stone-50/70 p-3.5 sm:p-4 rounded-xl border border-stone-200/70 flex flex-col justify-center">
                <span className="text-xs text-stone-600 font-semibold block">إجمالي المقبوض</span>
                <div className="text-2xl font-black text-stone-900 mt-1">
                  {totalGrossPaid} <span className="text-xs font-bold text-stone-400">ر.س</span>
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  {safePayments.length} {safePayments.length === 1 ? 'دفعة مسجلة' : safePayments.length === 2 ? 'دفعتان مسجلتان' : 'دفعات مسجلة'}
                </span>
              </div>

              {/* 2. Total Refunds: Calm Soft Red */}
              <div className="bg-rose-50/50 p-3.5 sm:p-4 rounded-xl border border-rose-200/60 flex flex-col justify-center">
                <span className="text-xs text-rose-800 font-semibold block">إجمالي المسترد</span>
                <div className="text-2xl font-black text-rose-950 mt-1">
                  {totalRefunds} <span className="text-xs font-bold text-rose-700/80">ر.س</span>
                </div>
                <span className="text-[11px] text-rose-700/80 mt-1 block">
                  {safeRefunds.length} {safeRefunds.length === 1 ? 'مبلغ معاد' : safeRefunds.length === 2 ? 'مبلغان معـادان' : 'مبالغ معادة'}
                </span>
              </div>

              {/* 3. Net Paid: Calm Soft Green */}
              <div className="bg-emerald-50/50 p-3.5 sm:p-4 rounded-xl border border-emerald-200/60 flex flex-col justify-center">
                <span className="text-xs text-emerald-800 font-semibold block">صافي المقبوض بعد الاسترداد</span>
                <div className="text-2xl font-black text-emerald-800 mt-1">
                  {totalNetPaid} <span className="text-xs font-bold text-emerald-600">ر.س</span>
                </div>
                <span className="text-[11px] text-emerald-700/80 mt-1 block">
                  الرصيد الفعلي بعد الاسترداد
                </span>
              </div>
            </div>

            {/* Note Below Values */}
            <div className="pt-2 border-t border-stone-100 flex items-start sm:items-center gap-2 text-xs text-stone-500 font-medium">
              <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                تشمل الحركة المالية جميع المبالغ المستلمة والمستردة فعليًا، بما في ذلك الحركات المرتبطة بطلبات أُلغيت لاحقًا.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Warning Box: Unlinked / Orphan Payments needing review */}
      {netUnlinked > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl shadow-2xs space-y-3">
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
        <div className="bg-rose-50 border border-rose-200 p-4 sm:p-5 rounded-2xl shadow-2xs">
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

      {/* Orders Table with Search & Filters */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#1A365D]" />
              حسابات الطلبات ({orderLedgers.length})
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 font-medium">
              متابعة المدفوع والمسترد والمتبقي لكل طلب
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث برقم الطلب أو اسم العميل أو رقم الجوال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#1A365D] focus:bg-white transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-stone-100/90 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'ACTIVE', label: 'السارية' },
                { id: 'DELIVERED', label: 'المستلمة' },
                { id: 'CANCELLED', label: 'الملغاة' },
                { id: 'UNSETTLED', label: 'تحتاج مراجعة ⚠️' },
                { id: 'VAT_ONLY', label: 'الطلبات الضريبية' },
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
                          <div>{l.totalAmount} ر.س</div>
                          {(() => {
                            const snap = getOrderVatSnapshot(l.order);
                            if (snap.vatEnabled) {
                              return (
                                <span className="text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold inline-block mt-0.5">
                                  ضريبة: {snap.vatAmount} ر.س
                                </span>
                              );
                            }
                            return null;
                          })()}
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

                      {/* Expandable Breakdown of Payments, Refunds and VAT */}
                      {isExpanded && (() => {
                        const snap = getOrderVatSnapshot(l.order);
                        return (
                          <tr className="bg-stone-50/80">
                            <td colSpan={8} className="p-3 text-xs">
                              <div className={`grid grid-cols-1 ${snap.vatEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-2xs`}>
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

                                {/* VAT Snapshot Breakdown if enabled */}
                                {snap.vatEnabled && (
                                  <div>
                                    <span className="font-bold text-blue-900 flex items-center gap-1 mb-2">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      بيانات الضريبة المعتمدة للطلب:
                                    </span>
                                    <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 text-[11px] space-y-1.5 text-slate-800">
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">قبل الضريبة:</span>
                                        <span className="font-bold">{snap.subtotalAmount} ر.س</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">مبلغ الضريبة ({snap.vatRate}%):</span>
                                        <span className="font-black text-blue-900">{snap.vatAmount} ر.س</span>
                                      </div>
                                      <div className="flex justify-between pt-1 border-t border-blue-200">
                                        <span className="text-slate-700 font-bold">الإجمالي شامل الضريبة:</span>
                                        <span className="font-black text-slate-950">{snap.totalAmount} ر.س</span>
                                      </div>
                                      {snap.vatRegistrationNumber && (
                                        <div className="pt-1 text-[10px] text-slate-500 font-mono">
                                          الرقم الضريبي: {snap.vatRegistrationNumber}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
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
