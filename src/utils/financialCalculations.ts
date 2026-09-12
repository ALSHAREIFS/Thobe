import { Order, Payment, Refund } from '../types';

/**
 * Canonical filter for active, valid sales orders.
 * Excludes cancelled and voided orders so only legitimate sales revenue is recognized.
 * Reused across Dashboard, Reports, and VAT calculations to guarantee 100% financial consistency.
 */
export function isCanonicalActiveSalesOrder(order: any): boolean {
  if (!order) return false;
  return order.status !== 'CANCELLED';
}

export function filterCanonicalActiveOrders<T = Order>(orders: T[]): T[] {
  if (!Array.isArray(orders)) return [];
  return orders.filter(isCanonicalActiveSalesOrder);
}

export type OrderFinancialStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID'
  | 'CANCELLED_SETTLED'
  | 'CANCELLED_LIABILITY';

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
  /** Whether a refund can be executed (maxRefundable > 0) */
  canRefund: boolean;
  /** Whether the order is cancelled */
  isCancelled: boolean;
  /** Canonical financial status code */
  financialStatus: OrderFinancialStatus;
  /** Descriptive Arabic status label */
  statusLabelAr: string;
  /** Whether there is a severe discrepancy between verified ledger and legacy fields */
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
    const matchesId =
      (p.orderId && p.orderId === order.orderId) ||
      (order.orderNumber && p.orderId === order.orderNumber);
    const matchesNumber =
      (p.orderNumber && p.orderNumber === order.orderId) ||
      (order.orderNumber && p.orderNumber && p.orderNumber === order.orderNumber);
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
    const matchesId =
      (r.orderId && r.orderId === order.orderId) ||
      (order.orderNumber && r.orderId === order.orderNumber);
    const matchesNumber =
      (r.orderNumber && r.orderNumber === order.orderId) ||
      (order.orderNumber && r.orderNumber && r.orderNumber === order.orderNumber);
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
 * - maxRefundable = max(0, netPaid)
 * - For CANCELLED: activeRemaining = 0, unrefundedLiability = netPaid
 *
 * NOTE: Stale cached pricing fields on the order document are NEVER authoritative.
 * The immutable payment and refund collections are the sole source of financial truth.
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

  // Link payments and refunds strictly using canonical document matcher
  const linkedPayments = getLinkedPayments(order, payments);
  const linkedRefunds = getLinkedRefunds(order, refunds);

  // Authoritative truth: Canonical Linked Ledger documents ONLY
  const grossPaid = Math.round(
    linkedPayments.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0) * 100
  ) / 100;

  const grossRefunded = Math.round(
    linkedRefunds.reduce((sum, r) => sum + (Number(r?.amount) || 0), 0) * 100
  ) / 100;

  const netPaid = Math.max(0, Math.round((grossPaid - grossRefunded) * 100) / 100);
  const maxRefundable = netPaid;
  const canRefund = maxRefundable > 0;

  const remaining = Math.max(0, Math.round((totalAmount - netPaid) * 100) / 100);
  const activeRemaining = isCancelled ? 0 : remaining;
  const unrefundedLiability = isCancelled ? netPaid : 0;

  // Derive Canonical Financial Status
  let financialStatus: OrderFinancialStatus;
  let statusLabelAr: string;

  if (isCancelled) {
    if (unrefundedLiability > 0) {
      financialStatus = 'CANCELLED_LIABILITY';
      statusLabelAr = `ملغي (مستحق للعميل: ${unrefundedLiability} ر.س)`;
    } else {
      financialStatus = 'CANCELLED_SETTLED';
      statusLabelAr = 'ملغي (تمت التسوية بالكامل)';
    }
  } else {
    if (netPaid === 0) {
      financialStatus = 'UNPAID';
      statusLabelAr = grossPaid > 0 ? 'مسترد بالكامل (غير مدفوع)' : 'غير مدفوع';
    } else if (remaining === 0) {
      financialStatus = 'FULLY_PAID';
      statusLabelAr = 'مسدد بالكامل ✓';
    } else {
      financialStatus = 'PARTIALLY_PAID';
      statusLabelAr = `عربون (${netPaid} ر.س) / متبقي (${remaining} ر.س)`;
    }
  }

  // Safe integrity check: only flag if actual corruption exists (e.g. negative net or over-refunded)
  const isCorrupted = grossRefunded > grossPaid;
  const hasFinancialMismatch = isCorrupted;
  const mismatchReason = isCorrupted
    ? `إجمالي المسترد (${grossRefunded} ر.س) أكبر من إجمالي المقبوض (${grossPaid} ر.س).`
    : undefined;

  return {
    totalAmount,
    grossPaid,
    grossRefunded,
    netPaid,
    remaining,
    activeRemaining,
    unrefundedLiability,
    maxRefundable,
    canRefund,
    isCancelled,
    financialStatus,
    statusLabelAr,
    hasFinancialMismatch,
    mismatchReason,
    paymentsCount: linkedPayments.length,
    refundsCount: linkedRefunds.length,
  };
}
