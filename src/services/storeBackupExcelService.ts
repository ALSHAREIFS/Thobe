import * as XLSX from 'xlsx';
import { Customer, Order, Payment, Refund, MeasurementRecord, ORDER_STATUS_MAP, PAYMENT_METHOD_MAP } from '../types';

export interface StoreExcelData {
  shop: any;
  customers: Customer[];
  measurements: (MeasurementRecord & { customerName?: string; customerPhone?: string })[];
  orders: Order[];
  payments: Payment[];
  refunds: Refund[];
  staff: any[];
}

/**
 * Formats a phone number strictly as text to prevent Excel from converting
 * it to scientific notation (e.g. 5.01E+08) or stripping leading zeroes.
 */
function formatPhoneCell(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  return String(val).trim();
}

/**
 * Formats ISO or stored date strings into clean, readable date-time strings for humans.
 */
function formatReadableDate(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str.includes('T')) {
    const [datePart, timePart] = str.split('T');
    const cleanTime = timePart ? timePart.slice(0, 5) : '';
    return cleanTime ? `${datePart} ${cleanTime}` : datePart;
  }
  return str;
}

/**
 * Safely extracts a numeric measurement value, preserving exact numbers (e.g. 157, 66, 64).
 * Returns empty string if undefined or null, ensuring no distorted numbers.
 */
function getNumericMeasurement(val: any): number | string {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  return isNaN(num) ? '' : num;
}

/**
 * Translates order status code into human-friendly Arabic labels.
 * Strictly translates CANCELLED -> 'ملغى'.
 */
function translateOrderStatus(status: string): string {
  switch (status) {
    case 'NEW':
      return 'جديد';
    case 'MEASURED':
      return 'تم أخذ المقاس';
    case 'CUTTING':
      return 'قص';
    case 'SEWING':
      return 'خياطة';
    case 'READY':
      return 'جاهز';
    case 'DELIVERED':
      return 'تم التسليم';
    case 'CANCELLED':
      return 'ملغى';
    default:
      return (ORDER_STATUS_MAP as any)[status]?.label || status || '';
  }
}

/**
 * Translates payment method code into Arabic.
 */
function translatePaymentMethod(method: string): string {
  return PAYMENT_METHOD_MAP[method] || method || '';
}

/**
 * Summarizes employee permissions safely into a human-readable Arabic string.
 */
function summarizePermissions(perms: any): string {
  if (!perms || typeof perms !== 'object') return 'افتراضية';
  const labels: string[] = [];
  if (perms.customers) labels.push('العملاء');
  if (perms.measurements) labels.push('المقاسات');
  if (perms.orders) labels.push('الطلبات');
  if (perms.payments) labels.push('المدفوعات');
  if (perms.reports) labels.push('التقارير');
  return labels.length > 0 ? labels.join('، ') : 'بدون صلاحيات إضافية';
}

/**
 * Calculates adaptive column widths for comfortable reading.
 */
function calculateColumnWidths(rows: any[][]): { wch: number }[] {
  if (!rows || rows.length === 0 || !rows[0]) return [];
  const colCount = rows[0].length;
  const widths: { wch: number }[] = [];

  for (let c = 0; c < colCount; c++) {
    let maxLen = String(rows[0][c] || '').length;
    const sampleLimit = Math.min(rows.length, 120);
    for (let r = 1; r < sampleLimit; r++) {
      const val = rows[r][c];
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    }
    // Arabic characters take visual width; add padding
    widths.push({ wch: Math.min(Math.max(maxLen + 4, 12), 40) });
  }

  return widths;
}

// --- Tailoring Translation Helpers ---
function trStiffness(val: any): string {
  if (val === 'soft') return 'طرية';
  if (val === 'medium') return 'وسط';
  if (val === 'stiff') return 'قاسية (واقفة)';
  return val || '';
}

function trBoolean(val: any): string {
  return val ? 'نعم' : 'لا';
}

function trButtonSleeve(val: any): string {
  if (val === 'visible') return 'أزرار ظاهرة';
  if (val === 'hidden') return 'مخفية';
  if (val === 'stud') return 'كبك';
  return val || '';
}

function trStitching(val: any): string {
  if (val === 'single') return 'مفردة';
  if (val === 'double') return 'مزدوجة';
  if (val === 'hidden') return 'مخفية';
  return val || '';
}

function trSidePocket(val: any): string {
  if (val === 'regular') return 'عادي';
  if (val === 'zipper') return 'سحاب';
  if (val === 'hidden_inside') return 'مخفي (داخلي)';
  return val || '';
}

function getTailoringSummary(details: any): string {
  if (!details) return '';
  const parts = [];
  if (details.collar?.name && details.collar.name !== 'غير محدد') {
    parts.push(`ياقة: ${details.collar.name}`);
  }
  if (details.sleeves?.name && details.sleeves.name !== 'غير محدد') {
    parts.push(`كم: ${details.sleeves.name}`);
  }
  if (details.buttons?.count > 0) {
    parts.push(`${details.buttons.count} أزرار`);
  }
  if (details.pockets?.hasChestPocket) {
    parts.push('جيب صدر');
  }
  return parts.join(' - ');
}
// --------------------------------------

/**
 * Generates the human-readable Excel workbook "ثوبي-بيانات-المتجر.xlsx"
 * containing 7 detailed, right-to-left Arabic worksheets.
 * 
 * IMPORTANT: This is a VIEW of the backup and does NOT mutate source objects.
 */
export function generateStoreExcelWorkbook(data: StoreExcelData): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Create fast lookup maps for customer and order resolution
  const customerMap = new Map<string, Customer>();
  data.customers.forEach((c) => {
    if (c.customerId) customerMap.set(c.customerId, c);
  });

  const orderMap = new Map<string, Order>();
  data.orders.forEach((o) => {
    if (o.orderId) orderMap.set(o.orderId, o);
    if (o.orderNumber) orderMap.set(o.orderNumber, o);
  });

  // =============================================================
  // SHEET 1: العملاء (Customers)
  // =============================================================
  const customersHeaders = [
    'اسم العميل',
    'رقم الجوال',
    'جوال إضافي',
    'المدينة',
    'العنوان',
    'إجمالي عدد الطلبات',
    'إجمالي المدفوعات (ر.س)',
    'تاريخ التسجيل',
    'ملاحظات',
    'معرف العميل',
  ];

  const customersRows: any[][] = [customersHeaders];
  data.customers.forEach((c) => {
    customersRows.push([
      c.fullName || '',
      formatPhoneCell(c.phone),
      formatPhoneCell(c.alternatePhone),
      c.city || '',
      c.address || '',
      Number(c.totalOrdersCount) || 0,
      Number(c.totalSpent) || 0,
      formatReadableDate(c.createdAt),
      c.notes || '',
      c.customerId || '',
    ]);
  });

  const wsCustomers = XLSX.utils.aoa_to_sheet(customersRows);
  wsCustomers['!views'] = [{ rightToLeft: true, RTL: true }];
  wsCustomers['!cols'] = calculateColumnWidths(customersRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'العملاء');

  // =============================================================
  // SHEET 2: المقاسات (Measurements) - Flattened & tailor-friendly
  // =============================================================
  const measurementsHeaders = [
    'اسم العميل',
    'رقم جوال العميل',
    'وحدة القياس',
    'الطول',
    'الصدر',
    'الخصر',
    'الورك',
    'الكتف',
    'عرض الظهر',
    'عرض الصدر',
    'طول الكم',
    'فتحة الكم',
    'الإبط',
    'المعصم',
    'الرقبة',
    'ارتفاع الياقة',
    'عرض الأسفل',
    'طول الجيب',
    'موضع الجيب',
    'طول المرد',
    'ملاحظات',
    'أخذ المقاس بواسطة',
    'تاريخ القياس',
    'معرف العميل',
    'معرف المقاس',
  ];

  const measurementsRows: any[][] = [measurementsHeaders];
  data.measurements.forEach((m) => {
    const cust = customerMap.get(m.customerId);
    const resolvedName = m.customerName || cust?.fullName || 'عميل';
    const resolvedPhone = formatPhoneCell(m.customerPhone || cust?.phone);
    const meas = m.measurements || ({} as any);

    measurementsRows.push([
      resolvedName,
      resolvedPhone,
      m.unit || 'cm',
      getNumericMeasurement(meas.length),
      getNumericMeasurement(meas.chest),
      getNumericMeasurement(meas.waist),
      getNumericMeasurement(meas.hips),
      getNumericMeasurement(meas.shoulder),
      getNumericMeasurement(meas.backWidth),
      getNumericMeasurement(meas.chestWidth),
      getNumericMeasurement(meas.sleeveLength),
      getNumericMeasurement(meas.sleeveOpening),
      getNumericMeasurement(meas.armhole),
      getNumericMeasurement(meas.wrist),
      getNumericMeasurement(meas.neck),
      getNumericMeasurement(meas.collarHeight),
      getNumericMeasurement(meas.bottomWidth),
      getNumericMeasurement(meas.pocketLength),
      getNumericMeasurement(meas.pocketPlacement),
      getNumericMeasurement(meas.placketLength),
      m.notes || '',
      m.measuredByName || m.measuredBy || '',
      formatReadableDate(m.createdAt || m.date),
      m.customerId || '',
      m.measurementId || (m as any).id || '',
    ]);
  });

  const wsMeasurements = XLSX.utils.aoa_to_sheet(measurementsRows);
  wsMeasurements['!views'] = [{ rightToLeft: true, RTL: true }];
  wsMeasurements['!cols'] = calculateColumnWidths(measurementsRows);
  XLSX.utils.book_append_sheet(wb, wsMeasurements, 'المقاسات');

  // =============================================================
  // SHEET 3: الطلبات (Orders)
  // =============================================================
  const ordersHeaders = [
    'رقم الطلب',
    'اسم العميل',
    'رقم جوال العميل',
    'حالة الطلب',
    'نوع الثوب',
    'الكمية',
    'ملخص التفصيل',
    'إجمالي السعر (ر.س)',
    'المبلغ المدفوع (ر.س)',
    'المبلغ المتبقي (ر.س)',
    'مبلغ الضريبة (ر.س)',
    'وحدة القياس',
    'تاريخ الطلب',
    'موعد التسليم المتوقع',
    'تاريخ التسليم الفعلي',
    'ملاحظات',
    'معرف الطلب',
    'معرف العميل',
  ];

  const ordersRows: any[][] = [ordersHeaders];
  data.orders.forEach((o) => {
    const pricing = o.pricing || ({} as any);
    const tailoringDetails = o.tailoringDetails || ({} as any);
    
    ordersRows.push([
      o.orderNumber || o.orderId || '',
      o.customerName || '',
      formatPhoneCell(o.customerPhone),
      translateOrderStatus(o.status),
      o.garmentType || 'ثوب رجالي',
      Number(o.quantity) || 1,
      getTailoringSummary(tailoringDetails),
      Number(pricing.totalAmount) || 0,
      Number(pricing.paidAmount) || 0,
      Number(pricing.remainingAmount) || 0,
      Number(pricing.vatAmount) || 0,
      o.measurementUnit || 'cm',
      formatReadableDate(o.orderDate),
      formatReadableDate(o.deliveryDate),
      formatReadableDate(o.actualDeliveryDate),
      o.notes || '',
      o.orderId || '',
      o.customerId || '',
    ]);
  });

  const wsOrders = XLSX.utils.aoa_to_sheet(ordersRows);
  wsOrders['!views'] = [{ rightToLeft: true, RTL: true }];
  wsOrders['!cols'] = calculateColumnWidths(ordersRows);
  XLSX.utils.book_append_sheet(wb, wsOrders, 'الطلبات');

  // =============================================================
  // SHEET 3.1: تفاصيل التفصيل (Tailoring Details)
  // =============================================================
  const tailoringHeaders = [
    'رقم الطلب',
    'اسم العميل',
    'رقم الجوال',
    'نوع الثوب',
    'الكمية',
    'القماش',
    'لون القماش',
    'مصدر القماش',
    'شكل الياقة',
    'قساوة الياقة',
    'أزرار الياقة',
    'شكل الكم / الكفة',
    'عرض الكفة (سم)',
    'قساوة الكفة',
    'أزرار الكم',
    'شكل المرد (الصدر)',
    'خياطة المرد',
    'أزرار الصدر',
    'جيب الصدر',
    'جيب القلم',
    'عدد الجيوب الجانبية',
    'نوع الجيوب الجانبية',
    'جيب جوال داخلي',
    'نوع خياطة الجيوب',
    'شكل أسفل الثوب',
    'تفاصيل التطريز',
    'ملاحظات الياقة',
    'ملاحظات الكم',
    'ملاحظات الجيوب',
    'ملاحظات الأقمشة',
    'خيارات مخصصة / أخرى',
    'ملاحظات التفصيل العامة',
  ];

  const tailoringRows: any[][] = [tailoringHeaders];
  data.orders.forEach((o) => {
    const t = o.tailoringDetails || ({} as any);
    const fabric = t.fabric || {};
    const collar = t.collar || {};
    const sleeves = t.sleeves || {};
    const chest = t.chest || {};
    const pockets = t.pockets || {};
    const bottom = t.bottom || {};
    const embroidery = t.embroidery || {};
    const buttons = t.buttons || {};
    const special = t.specialOptions || {};

    const embroideryDetails = embroidery.hasEmbroidery 
      ? `نعم - المواضع: ${(embroidery.placement || []).join('، ')} ${embroidery.notes ? '- ' + embroidery.notes : ''}`
      : 'لا';

    tailoringRows.push([
      o.orderNumber || o.orderId || '',
      o.customerName || '',
      formatPhoneCell(o.customerPhone),
      o.garmentType || 'ثوب رجالي',
      Number(o.quantity) || 1,
      fabric.name || 'غير محدد',
      fabric.color || '',
      fabric.supplier || '',
      collar.name || 'غير محدد',
      trStiffness(collar.stiffness),
      collar.buttonsCount ?? '',
      sleeves.name || 'غير محدد',
      sleeves.cuffWidth ?? '',
      trStiffness(sleeves.cuffStiffness),
      trButtonSleeve(sleeves.buttonStyle),
      chest.name || 'غير محدد',
      trStitching(chest.placketStitching),
      buttons.count ?? '',
      pockets.hasChestPocket ? (pockets.chestPocketType === 'custom' && pockets.name ? pockets.name : 'نعم') : 'لا',
      trBoolean(pockets.hasPenPocket),
      pockets.sidePocketsCount ?? 0,
      trSidePocket(pockets.sidePocketType),
      trBoolean(pockets.hasMobileInnerPocket),
      trStitching(pockets.stitchingType),
      bottom.name || 'غير محدد',
      embroideryDetails,
      collar.notes || '',
      sleeves.notes || '',
      pockets.notes || '',
      fabric.notes || '',
      special.customNotes || '',
      t.generalNotes || o.notes || '',
    ]);
  });

  const wsTailoring = XLSX.utils.aoa_to_sheet(tailoringRows);
  wsTailoring['!views'] = [{ rightToLeft: true, RTL: true }];
  wsTailoring['!cols'] = calculateColumnWidths(tailoringRows);
  XLSX.utils.book_append_sheet(wb, wsTailoring, 'تفاصيل التفصيل');

  // =============================================================
  // SHEET 4: الدفعات (Payments)
  // =============================================================
  const paymentsHeaders = [
    'معرف الدفعة',
    'رقم الطلب',
    'اسم العميل',
    'المبلغ (ر.س)',
    'طريقة الدفع',
    'رقم الإيصال / السند',
    'سجلت بواسطة',
    'تاريخ وساعة الدفعة',
    'ملاحظات',
    'معرف الطلب',
  ];

  const paymentsRows: any[][] = [paymentsHeaders];
  data.payments.forEach((p) => {
    const cust = customerMap.get(p.customerId);
    const order = orderMap.get(p.orderId) || orderMap.get(p.orderNumber);
    const resolvedCustName = p.customerName || cust?.fullName || order?.customerName || '';
    const resolvedOrderNumber = p.orderNumber || order?.orderNumber || p.orderId || '';

    paymentsRows.push([
      p.paymentId || '',
      resolvedOrderNumber,
      resolvedCustName,
      Number(p.amount) || 0,
      translatePaymentMethod(p.method),
      p.receiptNumber || '',
      p.createdByName || p.createdBy || '',
      formatReadableDate(p.createdAt),
      p.notes || '',
      p.orderId || '',
    ]);
  });

  const wsPayments = XLSX.utils.aoa_to_sheet(paymentsRows);
  wsPayments['!views'] = [{ rightToLeft: true, RTL: true }];
  wsPayments['!cols'] = calculateColumnWidths(paymentsRows);
  XLSX.utils.book_append_sheet(wb, wsPayments, 'الدفعات');

  // =============================================================
  // SHEET 5: الاستردادات (Refunds)
  // =============================================================
  const refundsHeaders = [
    'معرف الاسترداد',
    'رقم الطلب',
    'اسم العميل',
    'المبلغ المسترد (ر.س)',
    'طريقة الاسترداد',
    'سبب الاسترداد',
    'سجلت بواسطة',
    'تاريخ وساعة الاسترداد',
    'معرف الطلب',
  ];

  const refundsRows: any[][] = [refundsHeaders];
  data.refunds.forEach((r) => {
    const cust = customerMap.get(r.customerId);
    const order = orderMap.get(r.orderId) || orderMap.get(r.orderNumber);
    const resolvedCustName = r.customerName || cust?.fullName || order?.customerName || '';
    const resolvedOrderNumber = r.orderNumber || order?.orderNumber || r.orderId || '';

    refundsRows.push([
      r.refundId || '',
      resolvedOrderNumber,
      resolvedCustName,
      Number(r.amount) || 0,
      translatePaymentMethod(r.paymentMethod),
      r.reason || '',
      r.recordedBy || '',
      formatReadableDate(r.createdAt),
      r.orderId || '',
    ]);
  });

  const wsRefunds = XLSX.utils.aoa_to_sheet(refundsRows);
  wsRefunds['!views'] = [{ rightToLeft: true, RTL: true }];
  wsRefunds['!cols'] = calculateColumnWidths(refundsRows);
  XLSX.utils.book_append_sheet(wb, wsRefunds, 'الاستردادات');

  // =============================================================
  // SHEET 6: الموظفون (Staff) - Strictly sanitized
  // =============================================================
  const staffHeaders = [
    'اسم الموظف',
    'البريد الإلكتروني',
    'رقم الجوال',
    'الدور',
    'الحالة',
    'الصلاحيات الممنوحة',
    'تاريخ الإضافة',
    'معرف الموظف',
  ];

  const staffRows: any[][] = [staffHeaders];
  data.staff.forEach((s) => {
    const roleLabel =
      s.role === 'SHOP'
        ? 'مالك المتجر'
        : s.role === 'SUPER_ADMIN'
        ? 'مسؤول النظام العام'
        : 'موظف';
    const statusLabel = s.isActive !== false ? 'نشط' : 'معطل';

    staffRows.push([
      s.fullName || '',
      s.email || '',
      formatPhoneCell(s.phone),
      roleLabel,
      statusLabel,
      summarizePermissions(s.permissions),
      formatReadableDate(s.createdAt),
      s.userId || s.uid || '',
    ]);
  });

  const wsStaff = XLSX.utils.aoa_to_sheet(staffRows);
  wsStaff['!views'] = [{ rightToLeft: true, RTL: true }];
  wsStaff['!cols'] = calculateColumnWidths(staffRows);
  XLSX.utils.book_append_sheet(wb, wsStaff, 'الموظفون');

  // =============================================================
  // SHEET 7: معلومات المتجر (Store Information)
  // =============================================================
  const shop = data.shop || {};
  const vatModeLabel =
    shop.vatPriceMode === 'INCLUSIVE'
      ? 'الأسعار شاملة الضريبة'
      : shop.vatPriceMode === 'EXCLUSIVE'
      ? 'الأسعار غير شاملة الضريبة'
      : 'غير محدد';

  const storeInfoHeaders = ['بيان الإعداد / المعلومة', 'القيمة'];
  const storeInfoRows: any[][] = [
    storeInfoHeaders,
    ['اسم المتجر', shop.name || shop.shopName || 'متجر ثوبي'],
    ['المدينة', shop.city || '-'],
    ['العنوان', shop.address || '-'],
    ['رقم التواصل الرئيسي', formatPhoneCell(shop.phone)],
    ['هاتف بديل للتواصل', formatPhoneCell(shop.alternatePhone)],
    ['رقم السجل التجاري (CR)', shop.crNumber || '-'],
    ['الرقم الضريبي للمنشأة', shop.taxNumber || shop.vatRegistrationNumber || shop.vatNumber || '-'],
    ['حالة ضريبة القيمة المضافة', shop.vatEnabled ? 'مفعلة' : 'غير مفعلة'],
    ['نسبة ضريبة القيمة المضافة', shop.vatRate ? `${shop.vatRate}%` : '15%'],
    ['طريقة إدخال الأسعار', vatModeLabel],
    ['العملة المعتمدة', shop.currency || 'SAR'],
    ['مدة التفصيل والتسليم الافتراضية (أيام)', shop.defaultDeliveryDays ? `${shop.defaultDeliveryDays} أيام` : '7 أيام'],
    ['معرف المتجر في النظام', shop.shopId || '-'],
  ];

  const wsStoreInfo = XLSX.utils.aoa_to_sheet(storeInfoRows);
  wsStoreInfo['!cols'] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsStoreInfo, 'معلومات المتجر');

  // Set Right-to-Left (RTL) workbook view so all Arabic sheets open natively RTL in Excel
  wb.Workbook = {
    Views: [{ RTL: true }],
  };

  // Write workbook to binary Uint8Array
  const excelArray = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Uint8Array(excelArray);
}
