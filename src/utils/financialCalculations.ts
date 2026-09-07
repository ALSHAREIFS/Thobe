import { Order, Payment, Refund } from '../types';

export interface OrderFinancials {
  /** The total cost of the order (pricing.totalAmount) */
  totalAmount: number;
  /** Gross amount paid from valid linked payment documents */
  grossPaid: number;
  /** Gross amount refunded from valid linked refund documents */
  grossRefunded: number;
  /** Net paid amount: max(0, grossPaid - grossRefunded) */
  netPaid: number;
  /** Mathematical remaining balance: max(0, totalAmount - netPaid) */
  remaining: number;
  /** Active collectible remaining balance: 0 if order is CANCELLED, else remaining */
  activeRemaining: number;
  /** Unrefunded liability to the customer on a CANCELLED order: netPaid if CANCELLED, else 0 */
  unrefundedLiability: number;
  /** Maximum refundable amount: equal to netPaid */
  maxRefundable: number;
  /** Whether the order is cancelled */
  isCancelled: boolean;
  /** Whether there is a discrepancy between verified ledger and legacy/cached fields */
  hasFinancialMismatch: boolean;
  /** Human-readable explanation of financial mismatch if present */
  mismatchReason?: string;
  /** Number of linked payment receipts */
  paymentsCount: number;
  /** Number of linked refund receipts */
  refundsCount: number;
}

/**
 * Filter linked payments for an order by orderId or orderNumber with deduplication.
 */
export function getLinkedPayments(
  order: { orderId: string; orderNumber?: string },
  payments: Payment[] = []
): Payment[] {
  if (!order || !order.orderId || !Array.isArray(payments)) return [];
  const map = new Map<string, Payment>();
  for (const p of payments) {
    if (!p) continue;
    const matchesId = p.orderId && p.orderId === order.orderId;
    const matchesNumber = p.orderNumber && order.orderNumber && p.orderNumber === order.orderNumber;
    if (matchesId || matchesNumber) {
      const key = p.paymentId || `${p.orderId}_${p.receiptNumber || Math.random()}`;
      if (!map.has(key)) {
        map.set(key, p);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Filter linked refunds for an order by orderId or orderNumber with deduplication.
 */
export function getLinkedRefunds(
  order: { orderId: string; orderNumber?: string },
  refunds: Refund[] = []
): Refund[] {
  if (!order || !order.orderId || !Array.isArray(refunds)) return [];
  const map = new Map<string, Refund>();
  for (const r of refunds) {
    if (!r) continue;
    const matchesId = r.orderId && r.orderId === order.orderId;
    const matchesNumber = r.orderNumber && order.orderNumber && r.orderNumber === order.orderNumber;
    if (matchesId || matchesNumber) {
      const key = r.refundId || `${r.orderId}_${Math.random()}`;
      if (!map.has(key)) {
        map.set(key, r);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Centralized, deterministic, side-effect-free financial calculation for orders.
 * Enforces canonical financial invariants:
 * - grossPaid = sum(valid linked Payment documents)
 * - grossRefunded = sum(valid linked Refund documents)
 * - netPaid = max(0, grossPaid - grossRefunded)
 * - remaining = max(0, order.totalAmount - netPaid)
 * - For CANCELLED: activeRemaining = 0, unrefundedLiability = netPaid
 */
export function calculateOrderFinancials(
  order: Pick<Order, 'orderId' | 'status'> & {
    orderNumber?: string;
    pricing?: {
      totalAmount?: number;
      paidAmount?: number;
      remainingAmount?: number;
      refundedAmount?: number;
    };
  },
  payments: Payment[] = [],
  refunds: Refund[] = []
): OrderFinancials {
  const isCancelled = order.status === 'CANCELLED';
  const totalAmount = Math.round((Number(order.pricing?.totalAmount) || 0) * 100) / 100;

  // Link payments and refunds
  const linkedPayments = getLinkedPayments(order, payments);
  const linkedRefunds = getLinkedRefunds(order, refunds);

  const grossPaid = Math.round(
    linkedPayments.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0) * 100
  ) / 100;

  const grossRefunded = Math.round(
    linkedRefunds.reduce((sum, r) => sum + (Number(r?.amount) || 0), 0) * 100
  ) / 100;

  const netPaid = Math.max(0, Math.round((grossPaid - grossRefunded) * 100) / 100);
  const maxRefundable = netPaid;

  const remaining = Math.max(0, Math.round((totalAmount - netPaid) * 100) / 100);
  const activeRemaining = isCancelled ? 0 : remaining;
  const unrefundedLiability = isCancelled ? netPaid : 0;

  // Comparison with legacy cached fields inside order.pricing
  const legacyPaid = Math.round((Number(order.pricing?.paidAmount) || 0) * 100) / 100;
  const legacyRemaining = Math.round((Number(order.pricing?.remainingAmount) || 0) * 100) / 100;

  const paidMismatch = Math.abs(legacyPaid - grossPaid) > 0.01;
  const remainingMismatch = !isCancelled && Math.abs(legacyRemaining - remaining) > 0.01;
  const cancelledRemainingMismatch = isCancelled && legacyRemaining > 0;

  const hasFinancialMismatch = paidMismatch || remainingMismatch || cancelledRemainingMismatch;

  let mismatchReason: string | undefined;
  if (hasFinancialMismatch) {
    if (paidMismatch && grossPaid === 0 && legacyPaid > 0) {
      mismatchReason = `يوجد رصيد مسجل قديماً (${legacyPaid} ر.س) بدون سندات قبض مطابقة في السجل.`;
    } else if (paidMismatch) {
      mismatchReason = `سجل المقبوضات الفعلي (${grossPaid} ر.س) يختلف عن الرصيد المسجل بالطلب (${legacyPaid} ر.س).`;
    } else if (remainingMismatch) {
      mismatchReason = `المتبقي المحسوب (${remaining} ر.س) يختلف عن المتبقي المسجل بالطلب (${legacyRemaining} ر.س).`;
    } else if (cancelledRemainingMismatch) {
      mismatchReason = `طلب ملغي ما زال مسجلاً بمتبقي (${legacyRemaining} ر.س).`;
    }
  }

  return {
    totalAmount,
    grossPaid,
    grossRefunded,
    netPaid,
    remaining,
    activeRemaining,
    unrefundedLiability,
    maxRefundable,
    isCancelled,
    hasFinancialMismatch,
    mismatchReason,
    paymentsCount: linkedPayments.length,
    refundsCount: linkedRefunds.length,
  };
}
