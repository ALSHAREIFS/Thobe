/**
 * Centralized VAT Calculation & Money Utilities for Thobi SaaS
 * 
 * Invariants:
 * 1. Safe 2-decimal currency rounding across all calculations (roundMoney).
 * 2. Immutable order-level VAT snapshot: orders never re-calculate from shop's current settings.
 * 3. Exact mathematical consistency:
 *    - INCLUSIVE: subtotal = round(total / (1 + rate/100)), vat = round(total - subtotal), total = enteredAmount
 *    - EXCLUSIVE: subtotal = round(enteredAmount), vat = round(subtotal * (rate/100)), total = round(subtotal + vat)
 *    - DISABLED: subtotal = round(enteredAmount), vat = 0, total = round(enteredAmount)
 * 4. Proportional VAT refund impact calculation.
 * 5. Safe handling of legacy orders (defaults to vatEnabled: false, vatAmount: 0).
 */

import { isCanonicalActiveSalesOrder } from './financialCalculations';

export type VatPriceMode = 'INCLUSIVE' | 'EXCLUSIVE';

export interface ShopVatSettings {
  vatEnabled?: boolean;
  vatRegistrationNumber?: string;
  vatRate?: number; // e.g. 15 for 15%
  vatPriceMode?: VatPriceMode;
}

export interface OrderTaxSnapshot {
  vatEnabled: boolean;
  vatRate: number; // e.g. 15 for 15%
  vatPriceMode: VatPriceMode | null;
  vatRegistrationNumber?: string;
  subtotalAmount: number; // Pre-tax amount
  vatAmount: number;      // Tax amount
  totalAmount: number;    // Final gross amount
}

export interface VatCalculationInput {
  enteredAmount: number; // Unit price or total line item
  quantity?: number;
  vatEnabled?: boolean;
  vatRate?: number; // e.g. 15 for 15%
  vatPriceMode?: VatPriceMode | null;
  vatRegistrationNumber?: string;
}

export interface VatCalculationResult {
  unitPrice: number;
  quantity: number;
  subtotalAmount: number; // Pre-tax amount
  vatAmount: number;      // Tax amount
  totalAmount: number;    // Final gross total
  vatRate: number;        // Effective tax rate
  vatEnabled: boolean;    // Whether VAT was applied
  vatPriceMode: VatPriceMode | null;
  vatRegistrationNumber?: string;
}

/**
 * Standard, safe currency rounding to 2 decimal places.
 * Protects against floating-point drift (e.g. 29.99999999997 -> 30).
 */
export function roundMoney(amount: number): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || Number.isNaN(amount)) {
    return 0;
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Validate numeric parameters for financial and VAT calculations.
 */
export function validateFinancialNumber(
  value: any,
  fieldName: string,
  options: { allowZero?: boolean; min?: number; max?: number } = {}
): { isValid: boolean; error?: string } {
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value)) {
    return { isValid: false, error: `${fieldName} يجب أن يكون رقماً صحيحاً` };
  }
  const min = options.min !== undefined ? options.min : (options.allowZero ? 0 : 0.01);
  if (value < min) {
    return { isValid: false, error: `${fieldName} لا يمكن أن يكون أقل من ${min}` };
  }
  if (options.max !== undefined && value > options.max) {
    return { isValid: false, error: `${fieldName} لا يمكن أن يتجاوز ${options.max}` };
  }
  return { isValid: true };
}

/**
 * Centralized VAT Engine:
 * Deterministic calculation of subtotal, tax amount, and total.
 */
export function calculateVatPricing(input: VatCalculationInput): VatCalculationResult {
  const quantity = Math.max(1, Math.round(Number(input.quantity) || 1));
  const enteredAmount = roundMoney(Number(input.enteredAmount) || 0);
  const vatEnabled = Boolean(input.vatEnabled);
  const rawRate = Number(input.vatRate);
  const vatRate = vatEnabled && Number.isFinite(rawRate) && rawRate >= 0 && rawRate <= 100 ? rawRate : (vatEnabled ? 15 : 0);
  const vatPriceMode: VatPriceMode | null = vatEnabled ? (input.vatPriceMode === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'INCLUSIVE') : null;
  const vatRegistrationNumber = input.vatRegistrationNumber?.trim() || undefined;

  // Case 1: VAT is disabled or entered price is non-positive
  if (!vatEnabled || vatRate === 0 || enteredAmount <= 0) {
    const safeAmount = Math.max(0, enteredAmount);
    const lineTotal = roundMoney(safeAmount * quantity);
    const res: any = {
      unitPrice: safeAmount,
      quantity,
      subtotalAmount: lineTotal,
      vatAmount: 0,
      totalAmount: lineTotal,
      vatRate: 0,
      vatEnabled: false,
      vatPriceMode: null,
    };
    if (vatRegistrationNumber) res.vatRegistrationNumber = vatRegistrationNumber;
    return res as VatCalculationResult;
  }

  // Case 2: VAT is enabled
  if (vatPriceMode === 'EXCLUSIVE') {
    const subtotalAmount = roundMoney(enteredAmount * quantity);
    const vatAmount = roundMoney(subtotalAmount * (vatRate / 100));
    const totalAmount = roundMoney(subtotalAmount + vatAmount);

    const res: any = {
      unitPrice: enteredAmount,
      quantity,
      subtotalAmount,
      vatAmount,
      totalAmount,
      vatRate,
      vatEnabled: true,
      vatPriceMode: 'EXCLUSIVE',
    };
    if (vatRegistrationNumber) res.vatRegistrationNumber = vatRegistrationNumber;
    return res as VatCalculationResult;
  } else {
    const totalAmount = roundMoney(enteredAmount * quantity);
    const subtotalAmount = roundMoney(totalAmount / (1 + vatRate / 100));
    const vatAmount = roundMoney(totalAmount - subtotalAmount);

    const res: any = {
      unitPrice: enteredAmount,
      quantity,
      subtotalAmount,
      vatAmount,
      totalAmount,
      vatRate,
      vatEnabled: true,
      vatPriceMode: 'INCLUSIVE',
    };
    if (vatRegistrationNumber) res.vatRegistrationNumber = vatRegistrationNumber;
    return res as VatCalculationResult;
  }
}

/**
 * Extract canonical VAT breakdown from an order, with 100% backwards-compatibility for legacy orders.
 */
export function getOrderVatSnapshot(order?: {
  pricing?: {
    totalAmount?: number;
    subtotalAmount?: number;
    vatAmount?: number;
    vatEnabled?: boolean;
    vatRate?: number;
    vatPriceMode?: VatPriceMode | null;
    vatRegistrationNumber?: string;
  };
  taxSnapshot?: Partial<OrderTaxSnapshot>;
}): OrderTaxSnapshot {
  const total = roundMoney(Number(order?.pricing?.totalAmount) || 0);

  // Check order.pricing first, then order.taxSnapshot
  const p = order?.pricing;
  const s = order?.taxSnapshot;

  const isEnabled = Boolean(p?.vatEnabled ?? s?.vatEnabled ?? false);
  if (!isEnabled) {
    const fallbackObj: any = {
      vatEnabled: false,
      vatRate: 0,
      vatPriceMode: null,
      subtotalAmount: total,
      vatAmount: 0,
      totalAmount: total,
    };
    return fallbackObj as OrderTaxSnapshot;
  }

  const vatRate = Number(p?.vatRate ?? s?.vatRate ?? 15);
  const vatPriceMode: VatPriceMode = (p?.vatPriceMode ?? s?.vatPriceMode) === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'INCLUSIVE';
  const vatRegistrationNumber = p?.vatRegistrationNumber || s?.vatRegistrationNumber;

  let vatAmount = roundMoney(Number(p?.vatAmount ?? s?.vatAmount ?? 0));
  let subtotalAmount = roundMoney(Number(p?.subtotalAmount ?? s?.subtotalAmount ?? 0));

  // If subtotal + vat != total or subtotal <= 0, recompute from canonical formula using snapshotted parameters
  if (subtotalAmount <= 0 || roundMoney(subtotalAmount + vatAmount) !== total) {
    const recomputed = calculateVatPricing({
      enteredAmount: vatPriceMode === 'EXCLUSIVE' && subtotalAmount > 0 ? subtotalAmount : total,
      quantity: 1,
      vatEnabled: true,
      vatRate,
      vatPriceMode,
      vatRegistrationNumber,
    });
    subtotalAmount = recomputed.subtotalAmount;
    vatAmount = recomputed.vatAmount;
  }

  const result: any = {
    vatEnabled: true,
    vatRate,
    vatPriceMode,
    subtotalAmount,
    vatAmount,
    totalAmount: total,
  };
  if (vatRegistrationNumber) {
    result.vatRegistrationNumber = vatRegistrationNumber;
  }
  return result as OrderTaxSnapshot;
}

/**
 * Proportional Tax Impact of a Refund:
 * Calculates the portion of VAT returned to the customer when a refund is recorded.
 * 
 * Rules:
 * - If order has no VAT or total <= 0, impact is 0.
 * - If refund >= total, impact = full vatAmount.
 * - If partial refund, impact = round(vatAmount * (refund / total)).
 * - Capped strictly at order's vatAmount.
 */
export function calculateRefundTaxImpact(
  taxSnapshot: {
    vatEnabled?: boolean;
    vatAmount?: number;
    totalAmount?: number;
  } | undefined,
  refundAmount: number
): number {
  if (!taxSnapshot || !taxSnapshot.vatEnabled) return 0;
  const totalAmount = roundMoney(Number(taxSnapshot.totalAmount) || 0);
  const vatAmount = roundMoney(Number(taxSnapshot.vatAmount) || 0);
  const refund = roundMoney(Number(refundAmount) || 0);

  if (totalAmount <= 0 || vatAmount <= 0 || refund <= 0) return 0;

  if (refund >= totalAmount) {
    return vatAmount;
  }

  const proportionalVat = roundMoney(vatAmount * (refund / totalAmount));
  return Math.min(vatAmount, proportionalVat);
}

/**
 * Aggregate VAT Reporting Engine:
 * Computes sales, VAT, refund tax impact, and net VAT for a collection of orders and refunds.
 */
export interface VatReportSummary {
  /** Gross sales before refunds (subtotal + vat) */
  grossSalesTotal: number;
  /** Pre-tax sales amount */
  salesSubtotal: number;
  /** Gross VAT on sales */
  salesVatTotal: number;
  /** VAT returned via refunds */
  refundedVatTotal: number;
  /** Net VAT payable (gross VAT - refunded VAT) */
  netVatTotal: number;
  /** Net sales (gross sales - total refunds) */
  netSalesTotal: number;
  /** Count of VAT-enabled orders in the set */
  vatOrdersCount: number;
  /** Total count of orders analyzed */
  totalOrdersCount: number;
  /** Breakdown by VAT rate */
  byRate: Record<string, { orderCount: number; subtotal: number; vat: number; total: number }>;
  /** Gross sales of VAT-enabled orders (inclusive of tax) */
  taxableGrossSales: number;
  /** True taxable base (pre-tax subtotal of VAT-enabled orders only) */
  taxableBase: number;
  /** Non-taxable / legacy active orders sales */
  nonTaxableSales: number;
  /** Non-taxable / legacy active orders count */
  nonTaxableOrdersCount: number;
}

export function calculateVatReportSummary(
  orders: any[],
  refunds: any[] = []
): VatReportSummary {
  let grossSalesTotal = 0;
  let salesSubtotal = 0;
  let salesVatTotal = 0;
  let refundedVatTotal = 0;
  let totalRefundsAmount = 0;
  let vatOrdersCount = 0;
  let taxableGrossSales = 0;
  let taxableBase = 0;
  let nonTaxableSales = 0;
  let nonTaxableOrdersCount = 0;
  const byRate: Record<string, { orderCount: number; subtotal: number; vat: number; total: number }> = {};

  // Canonical Active Sales Population: strictly exclude cancelled/voided orders so VAT report aligns 100% with Active Sales
  const validOrders = Array.isArray(orders)
    ? orders.filter((o) => o && isCanonicalActiveSalesOrder(o))
    : [];

  for (const ord of validOrders) {
    const snapshot = getOrderVatSnapshot(ord);
    const orderTotal = snapshot.totalAmount;

    grossSalesTotal = roundMoney(grossSalesTotal + orderTotal);
    salesSubtotal = roundMoney(salesSubtotal + snapshot.subtotalAmount);
    salesVatTotal = roundMoney(salesVatTotal + snapshot.vatAmount);

    if (snapshot.vatEnabled) {
      vatOrdersCount++;
      taxableGrossSales = roundMoney(taxableGrossSales + snapshot.totalAmount);
      taxableBase = roundMoney(taxableBase + snapshot.subtotalAmount);
      const rateKey = String(snapshot.vatRate ?? 15);
      if (!byRate[rateKey]) {
        byRate[rateKey] = { orderCount: 0, subtotal: 0, vat: 0, total: 0 };
      }
      byRate[rateKey].orderCount++;
      byRate[rateKey].subtotal = roundMoney(byRate[rateKey].subtotal + snapshot.subtotalAmount);
      byRate[rateKey].vat = roundMoney(byRate[rateKey].vat + snapshot.vatAmount);
      byRate[rateKey].total = roundMoney(byRate[rateKey].total + snapshot.totalAmount);
    } else {
      nonTaxableOrdersCount++;
      nonTaxableSales = roundMoney(nonTaxableSales + snapshot.totalAmount);
    }

    // Match refunds for this order
    const orderRefunds = (Array.isArray(refunds) ? refunds : []).filter(
      (r) =>
        r &&
        ord?.orderId &&
        (r.orderId === ord.orderId || (ord.orderNumber && (r.orderNumber === ord.orderNumber || r.orderId === ord.orderNumber)))
    );

    const orderRefundTotal = orderRefunds.reduce((sum, r) => sum + (Number(r?.amount) || 0), 0);
    totalRefundsAmount = roundMoney(totalRefundsAmount + orderRefundTotal);

    if (snapshot.vatEnabled && orderRefundTotal > 0) {
      const refundVat = calculateRefundTaxImpact(snapshot, orderRefundTotal);
      refundedVatTotal = roundMoney(refundedVatTotal + refundVat);
    }
  }

  const netVatTotal = Math.max(0, roundMoney(salesVatTotal - refundedVatTotal));
  const netSalesTotal = Math.max(0, roundMoney(grossSalesTotal - totalRefundsAmount));

  return {
    grossSalesTotal,
    salesSubtotal,
    salesVatTotal,
    refundedVatTotal,
    netVatTotal,
    netSalesTotal,
    vatOrdersCount,
    totalOrdersCount: validOrders.length,
    byRate,
    taxableGrossSales,
    taxableBase,
    nonTaxableSales,
    nonTaxableOrdersCount,
  };
}

/**
 * Service-layer validation for order pricing and VAT snapshot parameters.
 * Strictly rejects NaN, Infinity, negative values, and out-of-range rates.
 */
export function validateOrderPricingInput(pricing?: any): { isValid: boolean; error?: string } {
  if (!pricing) return { isValid: true };

  const checkNumber = (val: any, name: string, allowNegative = false) => {
    if (val === undefined || val === null) return null;
    if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
      return `${name} يجب أن يكون رقماً صحيحاً`;
    }
    if (!allowNegative && val < 0) {
      return `${name} لا يمكن أن يكون سالباً`;
    }
    return null;
  };

  const unitErr = checkNumber(pricing.unitPrice, 'سعر الثوب');
  if (unitErr) return { isValid: false, error: unitErr };

  const totalErr = checkNumber(pricing.totalAmount, 'إجمالي الطلب');
  if (totalErr) return { isValid: false, error: totalErr };

  const paidErr = checkNumber(pricing.paidAmount, 'المبلغ المدفوع');
  if (paidErr) return { isValid: false, error: paidErr };

  const subtotalErr = checkNumber(pricing.subtotalAmount, 'المبلغ قبل الضريبة');
  if (subtotalErr) return { isValid: false, error: subtotalErr };

  const vatErr = checkNumber(pricing.vatAmount, 'قيمة الضريبة');
  if (vatErr) return { isValid: false, error: vatErr };

  if (pricing.vatEnabled) {
    if (pricing.vatRate !== undefined) {
      const rateErr = checkNumber(pricing.vatRate, 'نسبة الضريبة');
      if (rateErr) return { isValid: false, error: rateErr };
      if (pricing.vatRate < 0 || pricing.vatRate > 100) {
        return { isValid: false, error: 'نسبة الضريبة يجب أن تكون بين 0% و 100%' };
      }
    }
    if (pricing.vatPriceMode && !['INCLUSIVE', 'EXCLUSIVE'].includes(pricing.vatPriceMode)) {
      return { isValid: false, error: 'طريقة إدخال السعر غير صحيحة' };
    }
  }

  return { isValid: true };
}
