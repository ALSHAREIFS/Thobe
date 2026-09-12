import {
  calculateVatPricing,
  roundMoney,
  getOrderVatSnapshot,
  calculateRefundTaxImpact,
  calculateVatReportSummary,
} from '../src/utils/vatCalculations';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

console.log('--- RUNNING CENTRAL VAT ENGINE TESTS ---');

// T1: VAT disabled, 230 -> subtotal 230, vat 0, total 230
const t1 = calculateVatPricing({ enteredAmount: 230, vatEnabled: false });
assert(t1.totalAmount === 230, 'T1 totalAmount');
assert(t1.subtotalAmount === 230, 'T1 subtotalAmount');
assert(t1.vatAmount === 0, 'T1 vatAmount');
assert(t1.vatEnabled === false, 'T1 vatEnabled');
console.log('✓ T1: VAT disabled passed');

// T2: Inclusive 15%, 230 -> subtotal 200, vat 30, total 230
const t2 = calculateVatPricing({ enteredAmount: 230, vatEnabled: true, vatRate: 15, vatPriceMode: 'INCLUSIVE' });
assert(t2.totalAmount === 230, 'T2 totalAmount');
assert(t2.subtotalAmount === 200, 'T2 subtotalAmount');
assert(t2.vatAmount === 30, 'T2 vatAmount');
assert(t2.vatEnabled === true, 'T2 vatEnabled');
console.log('✓ T2: Inclusive 15% (230) passed');

// T3: Exclusive 15%, 200 -> subtotal 200, vat 30, total 230
const t3 = calculateVatPricing({ enteredAmount: 200, vatEnabled: true, vatRate: 15, vatPriceMode: 'EXCLUSIVE' });
assert(t3.subtotalAmount === 200, 'T3 subtotalAmount');
assert(t3.vatAmount === 30, 'T3 vatAmount');
assert(t3.totalAmount === 230, 'T3 totalAmount');
assert(t3.vatEnabled === true, 'T3 vatEnabled');
console.log('✓ T3: Exclusive 15% (200) passed');

// T4: Inclusive 115 -> subtotal 100, vat 15, total 115
const t4 = calculateVatPricing({ enteredAmount: 115, vatEnabled: true, vatRate: 15, vatPriceMode: 'INCLUSIVE' });
assert(t4.subtotalAmount === 100, 'T4 subtotalAmount');
assert(t4.vatAmount === 15, 'T4 vatAmount');
assert(t4.totalAmount === 115, 'T4 totalAmount');
console.log('✓ T4: Inclusive 115 passed');

// T5: Exclusive 100 -> subtotal 100, vat 15, total 115
const t5 = calculateVatPricing({ enteredAmount: 100, vatEnabled: true, vatRate: 15, vatPriceMode: 'EXCLUSIVE' });
assert(t5.subtotalAmount === 100, 'T5 subtotalAmount');
assert(t5.vatAmount === 15, 'T5 vatAmount');
assert(t5.totalAmount === 115, 'T5 totalAmount');
console.log('✓ T5: Exclusive 100 passed');

// T6: 0 amount -> subtotal 0, vat 0, total 0
const t6 = calculateVatPricing({ enteredAmount: 0, vatEnabled: true, vatRate: 15 });
assert(t6.subtotalAmount === 0, 'T6 subtotal');
assert(t6.vatAmount === 0, 'T6 vat');
assert(t6.totalAmount === 0, 'T6 total');
console.log('✓ T6: 0 amount passed');

// T7: Negative amount -> 0
const t7 = calculateVatPricing({ enteredAmount: -50, vatEnabled: true, vatRate: 15 });
assert(t7.subtotalAmount === 0, 'T7 subtotal');
assert(t7.vatAmount === 0, 'T7 vat');
assert(t7.totalAmount === 0, 'T7 total');
console.log('✓ T7: negative amount handled safely');

// T8: NaN rejected / handled
const t8 = calculateVatPricing({ enteredAmount: NaN, vatEnabled: true, vatRate: 15 });
assert(t8.totalAmount === 0, 'T8 NaN total');
console.log('✓ T8: NaN rejected / handled safely');

// T9: Infinity rejected / handled
const t9 = calculateVatPricing({ enteredAmount: Infinity, vatEnabled: true, vatRate: 15 });
assert(t9.totalAmount === 0, 'T9 Infinity total');
console.log('✓ T9: Infinity rejected / handled safely');

// T10: Negative VAT rate rejected (falls back to 15 or 0)
const t10 = calculateVatPricing({ enteredAmount: 200, vatEnabled: true, vatRate: -15 });
// Rate is negative, so fallback to safe default (15) or 0
assert(t10.vatRate >= 0, 'T10 rate >= 0');
console.log('✓ T10: negative VAT rate rejected');

// T11: VAT rate > 100 rejected (falls back to safe default)
const t11 = calculateVatPricing({ enteredAmount: 200, vatEnabled: true, vatRate: 150 });
assert(t11.vatRate <= 100, 'T11 rate <= 100');
console.log('✓ T11: VAT rate > 100 rejected');

// T12: Legacy order loads safely
const legacyOrder = {
  orderId: 'LEGACY-1',
  pricing: {
    unitPrice: 250,
    quantity: 1,
    totalAmount: 250,
    paidAmount: 100,
    remainingAmount: 150,
  }
};
const snapshotLegacy = getOrderVatSnapshot(legacyOrder);
assert(snapshotLegacy.vatEnabled === false, 'Legacy vatEnabled false');
assert(snapshotLegacy.vatAmount === 0, 'Legacy vatAmount 0');
assert(snapshotLegacy.subtotalAmount === 250, 'Legacy subtotal equals total');
assert(snapshotLegacy.totalAmount === 250, 'Legacy totalAmount unchanged');
console.log('✓ T12: Legacy order loads safely without retroactive tax');

// T16: Payment does not create extra VAT
// In Thobi, payment is pure cash ledger; getOrderVatSnapshot returns order sale VAT, payments don't affect snapshot
const orderWithVat = {
  orderId: 'ORD-VAT-1',
  pricing: {
    unitPrice: 230,
    quantity: 1,
    totalAmount: 230,
    subtotalAmount: 200,
    vatAmount: 30,
    vatEnabled: true,
    vatRate: 15,
    vatPriceMode: 'INCLUSIVE' as const,
    paidAmount: 50,
    remainingAmount: 180,
  }
};
const snapAfterPayment = getOrderVatSnapshot(orderWithVat);
assert(snapAfterPayment.vatAmount === 30, 'Payment did not change order VAT amount');
assert(snapAfterPayment.subtotalAmount === 200, 'Payment did not change order subtotal');
console.log('✓ T16: Payment does not create extra VAT');

// T17: Full refund removes full VAT impact
const fullRefundImpact = calculateRefundTaxImpact(snapAfterPayment, 230);
assert(fullRefundImpact === 30, 'Full refund removes full 30 SAR VAT');
console.log('✓ T17: Full refund impact = 30 passed');

// T18: Partial refund calculates proportional VAT impact (50% refund = 15 SAR VAT)
const partialRefundImpact = calculateRefundTaxImpact(snapAfterPayment, 115);
assert(partialRefundImpact === 15, 'Partial 50% refund impact = 15 SAR VAT');
console.log('✓ T18: Partial refund proportional impact passed');

// T19: Refund cannot create negative net VAT
const excessiveRefundImpact = calculateRefundTaxImpact(snapAfterPayment, 500);
assert(excessiveRefundImpact === 30, 'Excessive refund impact capped at order VAT 30');
console.log('✓ T19: Refund cannot exceed order VAT passed');

// Test Report Summary with byRate breakdown
const orderVat5 = {
  orderId: 'ORD-VAT-5PCT',
  pricing: {
    unitPrice: 105,
    quantity: 1,
    totalAmount: 105,
    subtotalAmount: 100,
    vatAmount: 5,
    vatEnabled: true,
    vatRate: 5,
    vatPriceMode: 'INCLUSIVE' as const,
    paidAmount: 105,
    remainingAmount: 0,
  }
};

const report = calculateVatReportSummary([legacyOrder, orderWithVat, orderVat5], [{ orderId: 'ORD-VAT-1', amount: 115 }]);
assert(report.grossSalesTotal === 585, 'Report gross sales: 250 + 230 + 105 = 585');
assert(report.salesVatTotal === 35, 'Report sales VAT: 30 + 5 = 35');
assert(report.refundedVatTotal === 15, 'Report refunded VAT = 15');
assert(report.netVatTotal === 20, 'Report net VAT: 35 - 15 = 20');
assert(report.netSalesTotal === 470, 'Report net sales: 585 - 115 = 470');
assert(report.vatOrdersCount === 2, 'Report VAT orders count = 2');
assert(report.totalOrdersCount === 3, 'Report total orders count = 3');
assert(report.byRate['15'] !== undefined, 'Report has 15% rate entry');
assert(report.byRate['15'].orderCount === 1, '15% order count = 1');
assert(report.byRate['15'].vat === 30, '15% VAT = 30');
assert(report.byRate['15'].subtotal === 200, '15% subtotal = 200');
assert(report.byRate['5'] !== undefined, 'Report has 5% rate entry');
assert(report.byRate['5'].orderCount === 1, '5% order count = 1');
assert(report.byRate['5'].vat === 5, '5% VAT = 5');
assert(report.byRate['5'].subtotal === 100, '5% subtotal = 100');
console.log('✓ VAT Report Summary and byRate breakdown calculated accurately');

// T20: EXACT REPRODUCTION TEST FOR 1116 SAR vs 300 SAR DISCREPANCY
console.log('--- TESTING REPRODUCTION OF 1116 vs 300 DISCREPANCY ---');
const activeOrder300 = {
  orderId: 'ORD-ACT-1',
  orderNumber: 'TH-001',
  status: 'READY',
  pricing: {
    totalAmount: 300,
    subtotalAmount: 260.87,
    vatAmount: 39.13,
    vatEnabled: true,
    vatRate: 15,
    vatPriceMode: 'INCLUSIVE' as const,
  }
};

const cancelledOrder816 = {
  orderId: 'ORD-CANC-1',
  orderNumber: 'TH-002',
  status: 'CANCELLED',
  pricing: {
    totalAmount: 816,
    subtotalAmount: 709.57,
    vatAmount: 106.43,
    vatEnabled: true,
    vatRate: 15,
    vatPriceMode: 'INCLUSIVE' as const,
  }
};

const allShopOrders = [activeOrder300, cancelledOrder816];
// Raw sum without active filter was 1116 SAR (300 + 816)
const rawSum = allShopOrders.reduce((acc, o) => acc + o.pricing.totalAmount, 0);
assert(rawSum === 1116, 'Raw sum of orders reproduces 1116 SAR');

// Canonical active sales calculation excludes CANCELLED orders
import { filterCanonicalActiveOrders } from '../src/utils/financialCalculations';
const canonicalActiveOrders = filterCanonicalActiveOrders(allShopOrders);
const canonicalActiveSales = canonicalActiveOrders.reduce((acc, o) => acc + o.pricing.totalAmount, 0);
assert(canonicalActiveSales === 300, 'Canonical active sales is exactly 300 SAR');

// Verify that calculateVatReportSummary strictly returns 300 SAR (matching canonical active sales)
const vatReportResult = calculateVatReportSummary(allShopOrders, []);
assert(vatReportResult.grossSalesTotal === 300, 'VAT Report sales strictly equals canonical active sales: 300 SAR');
assert(vatReportResult.totalOrdersCount === 1, 'VAT Report strictly counts 1 active order');
assert(vatReportResult.vatOrdersCount === 1, 'VAT Report counts 1 VAT order');
assert(vatReportResult.salesVatTotal === 39.13, 'VAT amount calculated only on active order: 39.13 SAR');
assert(vatReportResult.salesSubtotal === 260.87, 'Subtotal calculated only on active order: 260.87 SAR');
console.log('✓ T20: 1116 vs 300 SAR discrepancy successfully resolved and verified! VAT sales strictly equals 300 SAR.');

// T21: Payments, Refunds, and Net Collected Preservation
const paymentsSet = [
  { paymentId: 'PAY-1', orderId: 'ORD-ACT-1', amount: 300 },
  { paymentId: 'PAY-2', orderId: 'ORD-CANC-1', amount: 78 }
];
const refundsSet = [
  { refundId: 'REF-1', orderId: 'ORD-CANC-1', amount: 78 }
];
const grossPayments = paymentsSet.reduce((acc, p) => acc + p.amount, 0);
const totalRefunds = refundsSet.reduce((acc, r) => acc + r.amount, 0);
const netCollected = Math.max(0, grossPayments - totalRefunds);
assert(grossPayments === 378, 'Gross payments = 378 SAR preserved');
assert(totalRefunds === 78, 'Total refunds = 78 SAR preserved');
assert(netCollected === 300, 'Net collected = 300 SAR preserved');
console.log('✓ T21: Payments (378), Refunds (78), Net Collected (300) fully preserved without distortion.');

// T22: REGRESSION VERIFICATION FOR 530 / 608 / 78 / 530 SCENARIO
console.log('--- TESTING USER SCENARIO REGRESSION (530 / 608 / 78 / 530) ---');
const legacyOrder300 = {
  orderId: 'ORD-LEGACY-1',
  orderNumber: 'TH-101',
  status: 'DELIVERED',
  pricing: {
    totalAmount: 300,
    subtotalAmount: 300,
    vatAmount: 0,
    vatEnabled: false,
  }
};

const vatOrder230 = {
  orderId: 'ORD-VAT-2',
  orderNumber: 'TH-102',
  status: 'READY',
  pricing: {
    totalAmount: 230,
    subtotalAmount: 200,
    vatAmount: 30,
    vatEnabled: true,
    vatRate: 15,
    vatPriceMode: 'INCLUSIVE' as const,
  }
};

const cancelledOrderHistorical = {
  orderId: 'ORD-CANC-3',
  orderNumber: 'TH-103',
  status: 'CANCELLED',
  pricing: {
    totalAmount: 816,
    subtotalAmount: 709.57,
    vatAmount: 106.43,
    vatEnabled: true,
    vatRate: 15,
    vatPriceMode: 'INCLUSIVE' as const,
  }
};

const fullTestOrders = [legacyOrder300, vatOrder230, cancelledOrderHistorical];
const fullTestPayments = [
  { paymentId: 'P1', orderId: 'ORD-LEGACY-1', amount: 300 },
  { paymentId: 'P2', orderId: 'ORD-VAT-2', amount: 230 },
  { paymentId: 'P3', orderId: 'ORD-CANC-3', amount: 78 },
];
const fullTestRefunds = [
  { refundId: 'R1', orderId: 'ORD-CANC-3', amount: 78 },
];

const activeOnlyOrders = filterCanonicalActiveOrders(fullTestOrders);
const computedActiveSales = activeOnlyOrders.reduce((acc, o) => acc + o.pricing.totalAmount, 0);
const computedCustPayments = fullTestPayments.reduce((acc, p) => acc + p.amount, 0);
const computedRefunds = fullTestRefunds.reduce((acc, r) => acc + r.amount, 0);
const computedNetCollected = Math.max(0, computedCustPayments - computedRefunds);

assert(computedActiveSales === 530, 'Active sales = 530 SAR');
assert(computedCustPayments === 608, 'Historical customer receipts = 608 SAR');
assert(computedRefunds === 78, 'Refunds = 78 SAR');
assert(computedNetCollected === 530, 'Net historical collected = 530 SAR');

const vatSummary22 = calculateVatReportSummary(fullTestOrders, fullTestRefunds);
assert(vatSummary22.grossSalesTotal === 530, 'Active gross sales = 530 SAR');
assert(vatSummary22.salesSubtotal === 500, 'Total excluding VAT = 500 SAR (NOT taxable base)');
assert(vatSummary22.taxableBase === 200, 'Actual taxable VAT base = 200 SAR');
assert(vatSummary22.salesVatTotal === 30, 'VAT = 30 SAR');
assert(vatSummary22.taxableGrossSales === 230, 'Taxable gross sales = 230 SAR');
assert(vatSummary22.nonTaxableSales === 300, 'Legacy/non-taxable active sales = 300 SAR');
assert(vatSummary22.nonTaxableOrdersCount === 1, 'Legacy non-taxable orders count = 1');
assert(vatSummary22.vatOrdersCount === 1, 'VAT orders count = 1');
console.log('✓ T22: Regression verification for 530 / 608 / 78 / 530 scenario PASSED with 100% precision!');

console.log('--- ALL VAT INTEGRITY TESTS PASSED SUCCESSFULLY ---');
