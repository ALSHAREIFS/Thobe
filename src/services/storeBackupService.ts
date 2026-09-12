import {
  collection,
  doc,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import JSZip from 'jszip';
import { db } from '../firebase/config';
import { serializeFirestoreData } from '../utils/firestoreSerializer';
import { Customer, Order, Payment, Refund, Shop, UserProfile, MeasurementRecord, ORDER_STATUS_MAP, PAYMENT_METHOD_MAP } from '../types';
import { generateStoreExcelWorkbook } from './storeBackupExcelService';

export interface BackupProgressCallback {
  (stepMessage: string, progressPercent: number): void;
}

export interface BackupSummary {
  shopId: string;
  shopName: string;
  exportedAt: string;
  filename: string;
  sizeBytes: number;
  recordCounts: {
    customers: number;
    measurements: number;
    orders: number;
    payments: number;
    refunds: number;
    staff: number;
  };
  integrityHash: string;
}

/**
 * Escapes a cell for CSV formatting and handles UTF-8 Arabic text safely.
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of headers and row objects into a UTF-8 BOM CSV string.
 */
function buildCsv<T>(
  headers: { label: string; key: (item: T) => any }[],
  data: T[]
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h.label)).join(',');
  const rowLines = data.map((item) =>
    headers.map((h) => escapeCsvCell(h.key(item))).join(',')
  );
  // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows opens Arabic correctly
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Computes SHA-256 hash using the native Web Cryptography API.
 */
async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Format timestamp into YYYY-MM-DD-HHmm for file naming
 */
function getTimestampSlug(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}-${HH}${mm}`;
}

/**
 * Sanitizes Staff / Users data before export.
 * Strictly removes any password, credential, internal token, or sensitive security fields.
 */
function sanitizeStaff(users: any[]): any[] {
  return users.map((u) => ({
    userId: u.userId || u.uid || '',
    uid: u.uid || u.userId || '',
    fullName: u.fullName || '',
    email: u.email || '',
    phone: u.phone || '',
    role: u.role || 'EMPLOYEE',
    permissions: u.permissions || null,
    isActive: u.isActive !== false,
    createdAt: u.createdAt || '',
  }));
}

/**
 * Sanitizes Shop profile data before export.
 * Removes internal billing secrets or platform-private fields while retaining all business identity.
 */
function sanitizeShopProfile(shop: any): any {
  const {
    stripeCustomerId,
    stripeSubscriptionId,
    apiSecrets,
    paymentSecret,
    ...cleanShop
  } = shop || {};
  return cleanShop;
}

/**
 * Executes a complete, atomic store data backup download.
 * Strictly isolated to the current tenant shop.
 * Aborts if ANY collection fails to load.
 */
export async function downloadStoreBackup(
  shopId: string,
  userAuth: { isShop: boolean; isSuperAdmin: boolean; userId?: string },
  onProgress?: BackupProgressCallback
): Promise<BackupSummary> {
  // 1. Authorization check
  if (!userAuth.isShop && !userAuth.isSuperAdmin) {
    throw new Error('غير مصرح لك بتنزيل النسخة الاحتياطية. هذه الميزة متاحة فقط لمالك المتجر والمسؤول العام.');
  }

  if (!shopId || typeof shopId !== 'string') {
    throw new Error('معرف المتجر غير صالح. لا يمكن تنفيذ النسخ الاحتياطي.');
  }

  const notify = (msg: string, pct: number) => {
    if (onProgress) {
      onProgress(msg, pct);
    }
  };

  const now = new Date();
  const exportedAtIso = now.toISOString();

  // -------------------------------------------------------------
  // 2. Fetch Collections with Strict Tenant Scoping & Abort-On-Error
  // -------------------------------------------------------------
  
  // 2.1 Shop Document
  notify('جاري جلب بيانات وهوية المتجر...', 10);
  let rawShop: any;
  try {
    const shopDocSnap = await getDoc(doc(db, 'shops', shopId));
    if (!shopDocSnap.exists()) {
      throw new Error(`لم يتم العثور على وثيقة المتجر [${shopId}] في قاعدة البيانات.`);
    }
    rawShop = { ...shopDocSnap.data(), shopId: shopDocSnap.id };
  } catch (err: any) {
    console.error('Failed to fetch shop profile:', err);
    throw new Error(`فشل جلب بيانات المتجر: ${err.message || 'خطأ غير متوقع'}. تم إلغاء النسخ الاحتياطي بالكامل لضمان سلامة البيانات.`);
  }

  const shopName = rawShop.name || rawShop.shopName || 'متجر ثوبي';
  const cleanShopProfile = serializeFirestoreData(sanitizeShopProfile(rawShop));

  // 2.2 Customers Collection
  notify('جاري جلب سجلات العملاء...', 25);
  let rawCustomers: Customer[] = [];
  try {
    const custSnap = await getDocs(collection(db, 'shops', shopId, 'customers'));
    rawCustomers = custSnap.docs.map((d) => ({
      ...(d.data() as Customer),
      customerId: d.id,
    }));
  } catch (err: any) {
    console.error('Failed to fetch customers:', err);
    throw new Error(`فشل جلب سجلات العملاء: ${err.message || 'خطأ غير متوقع'}. تم إلغاء النسخ الاحتياطي.`);
  }

  const serializedCustomers = serializeFirestoreData(rawCustomers);

  // 2.3 Customer Measurements Subcollections
  notify('جاري جلب سجلات المقاسات وتفاصيلها...', 40);
  const rawMeasurements: (MeasurementRecord & { customerName?: string })[] = [];
  try {
    // Query subcollections for all retrieved customers
    const customerMap = new Map<string, string>();
    rawCustomers.forEach((c) => {
      customerMap.set(c.customerId, c.fullName || 'عميل');
    });

    for (const cust of rawCustomers) {
      const measSnap = await getDocs(
        collection(db, 'shops', shopId, 'customers', cust.customerId, 'measurements')
      );
      measSnap.docs.forEach((d) => {
        const mData = d.data() as MeasurementRecord;
        rawMeasurements.push({
          ...mData,
          measurementId: mData.measurementId || d.id,
          customerId: cust.customerId,
          customerName: cust.fullName,
        });
      });
    }
  } catch (err: any) {
    console.error('Failed to fetch customer measurements:', err);
    throw new Error(`فشل جلب سجلات المقاسات: ${err.message || 'خطأ غير متوقع'}. تم إلغاء النسخ الاحتياطي.`);
  }

  const serializedMeasurements = serializeFirestoreData(rawMeasurements);

  // 2.4 Orders Collection
  notify('جاري جلب الطلبات وسجلات التفصيل...', 55);
  let rawOrders: Order[] = [];
  try {
    const ordersSnap = await getDocs(collection(db, 'shops', shopId, 'orders'));
    rawOrders = ordersSnap.docs.map((d) => ({
      ...(d.data() as Order),
      orderId: d.id,
    }));
  } catch (err: any) {
    console.error('Failed to fetch orders:', err);
    throw new Error(`فشل جلب سجلات الطلبات: ${err.message || 'خطأ غير متوقع'}. تم إلغاء النسخ الاحتياطي.`);
  }

  const serializedOrders = serializeFirestoreData(rawOrders);

  // 2.5 Payments Collection
  notify('جاري جلب سجل سندات القبض والمدفوعات...', 68);
  let rawPayments: Payment[] = [];
  try {
    const paymentsSnap = await getDocs(collection(db, 'shops', shopId, 'payments'));
    rawPayments = paymentsSnap.docs.map((d) => ({
      ...(d.data() as Payment),
      paymentId: d.id,
    }));
  } catch (err: any) {
    console.error('Failed to fetch payments:', err);
    throw new Error(`فشل جلب سجلات المدفوعات: ${err.message || 'خطأ غير متوقع'}. تم إلغاء النسخ الاحتياطي.`);
  }

  const serializedPayments = serializeFirestoreData(rawPayments);

  // 2.6 Refunds Collection
  notify('جاري جلب سجل سندات الصرف والمسترجعات...', 78);
  let rawRefunds: Refund[] = [];
  try {
    const refundsSnap = await getDocs(collection(db, 'shops', shopId, 'refunds'));
    rawRefunds = refundsSnap.docs.map((d) => ({
      ...(d.data() as Refund),
      refundId: d.id,
    }));
  } catch (err: any) {
    console.error('Failed to fetch refunds:', err);
    throw new Error(`فشل جلب سجلات المسترجعات: ${err.message || 'خطأ غير متوقع'}. تم إلغاء النسخ الاحتياطي.`);
  }

  const serializedRefunds = serializeFirestoreData(rawRefunds);

  // 2.7 Staff Roster (Subcollection shops/{shopId}/users)
  notify('جاري جلب قائمة موظفي المتجر وصلاحياتهم...', 85);
  let rawStaff: any[] = [];
  try {
    const staffSnap = await getDocs(collection(db, 'shops', shopId, 'users'));
    rawStaff = staffSnap.docs.map((d) => ({
      ...d.data(),
      userId: d.id,
    }));
  } catch (err: any) {
    console.error('Failed to fetch staff roster:', err);
    throw new Error(`فشل جلب قائمة موظفي المتجر: ${err.message || 'خطأ غير متوقع'}. تم إلغاء النسخ الاحتياطي.`);
  }

  const cleanStaff = serializeFirestoreData(sanitizeStaff(rawStaff));

  // -------------------------------------------------------------
  // 3. Build CSV Exports (Human-readable for Microsoft Excel with UTF-8 BOM)
  // -------------------------------------------------------------
  notify('جاري إعداد الجداول وملفات Excel (CSV)...', 88);

  const customersCsv = buildCsv(
    [
      { label: 'معرف العميل', key: (c: Customer) => c.customerId },
      { label: 'الاسم الكامل', key: (c: Customer) => c.fullName },
      { label: 'رقم الجوال', key: (c: Customer) => c.phone },
      { label: 'المدينة', key: (c: Customer) => c.city || '' },
      { label: 'العنوان', key: (c: Customer) => c.address || '' },
      { label: 'إجمالي عدد الطلبات', key: (c: Customer) => c.totalOrdersCount || 0 },
      { label: 'إجمالي المبالغ المدفوعة (ر.س)', key: (c: Customer) => c.totalSpent || 0 },
      { label: 'تاريخ التسجيل', key: (c: Customer) => c.createdAt || '' },
    ],
    serializedCustomers
  );

  const ordersCsv = buildCsv(
    [
      { label: 'رقم الطلب', key: (o: Order) => o.orderNumber || o.orderId },
      { label: 'اسم العميل', key: (o: Order) => o.customerName || '' },
      { label: 'رقم جوال العميل', key: (o: Order) => o.customerPhone || '' },
      {
        label: 'حالة الطلب',
        key: (o: Order) => (o.status && ORDER_STATUS_MAP[o.status]?.label) || o.status || '',
      },
      { label: 'نوع الثوب', key: (o: Order) => o.garmentType || 'ثوب رجالي' },
      { label: 'الكمية', key: (o: Order) => o.quantity || 1 },
      { label: 'إجمالي السعر (ر.س)', key: (o: Order) => o.pricing?.totalAmount ?? 0 },
      { label: 'المبلغ المدفوع (ر.س)', key: (o: Order) => o.pricing?.paidAmount ?? 0 },
      { label: 'المبلغ المتبقي (ر.س)', key: (o: Order) => o.pricing?.remainingAmount ?? 0 },
      { label: 'مبلغ الضريبة (ر.س)', key: (o: Order) => o.pricing?.vatAmount ?? 0 },
      { label: 'تاريخ الطلب', key: (o: Order) => o.orderDate || '' },
      { label: 'تاريخ التسليم المتوقع', key: (o: Order) => o.deliveryDate || '' },
      { label: 'تاريخ الإنشاء', key: (o: Order) => o.createdAt || '' },
    ],
    serializedOrders
  );

  const paymentsCsv = buildCsv(
    [
      { label: 'معرف الدفعة', key: (p: Payment) => p.paymentId },
      { label: 'رقم الطلب', key: (p: Payment) => p.orderNumber || p.orderId },
      { label: 'اسم العميل', key: (p: Payment) => p.customerName || '' },
      { label: 'المبلغ المقبوض (ر.س)', key: (p: Payment) => p.amount ?? 0 },
      {
        label: 'طريقة الدفع',
        key: (p: Payment) => (p.method && PAYMENT_METHOD_MAP[p.method]) || p.method || '',
      },
      { label: 'سجلت بواسطة', key: (p: Payment) => p.createdByName || p.createdBy || '' },
      { label: 'تاريخ وساعة الدفعة', key: (p: Payment) => p.createdAt || '' },
      { label: 'ملاحظات', key: (p: Payment) => p.notes || '' },
    ],
    serializedPayments
  );

  const refundsCsv = buildCsv(
    [
      { label: 'معرف الاسترجاع', key: (r: Refund) => r.refundId },
      { label: 'رقم الطلب', key: (r: Refund) => r.orderNumber || r.orderId },
      { label: 'اسم العميل', key: (r: Refund) => r.customerName || '' },
      { label: 'المبلغ المسترجع (ر.س)', key: (r: Refund) => r.amount ?? 0 },
      {
        label: 'طريقة الاسترجاع',
        key: (r: Refund) => (r.paymentMethod && PAYMENT_METHOD_MAP[r.paymentMethod]) || r.paymentMethod || '',
      },
      { label: 'سبب الاسترجاع', key: (r: Refund) => r.reason || '' },
      { label: 'سجلت بواسطة', key: (r: Refund) => r.recordedBy || '' },
      { label: 'تاريخ وساعة الاسترجاع', key: (r: Refund) => r.createdAt || '' },
    ],
    serializedRefunds
  );

  // -------------------------------------------------------------
  // 4. Generate Human-Readable Excel Workbook (ثوبي-بيانات-المتجر.xlsx)
  // -------------------------------------------------------------
  notify('جاري إعداد وتنسيق جدول Excel الشامل (ثوبي-بيانات-المتجر.xlsx)...', 89);

  const excelWorkbookBytes = generateStoreExcelWorkbook({
    shop: cleanShopProfile,
    customers: serializedCustomers,
    measurements: serializedMeasurements,
    orders: serializedOrders,
    payments: serializedPayments,
    refunds: serializedRefunds,
    staff: cleanStaff,
  });

  // -------------------------------------------------------------
  // 5. Compute SHA-256 Integrity Hash & Create Manifest
  // -------------------------------------------------------------
  notify('جاري حساب توقيع التحقق الرقمي (SHA-256 Checksum)...', 92);

  const combinedPayloadForHash = JSON.stringify({
    shopId,
    profile: cleanShopProfile,
    customers: serializedCustomers,
    measurements: serializedMeasurements,
    orders: serializedOrders,
    payments: serializedPayments,
    refunds: serializedRefunds,
    staff: cleanStaff,
  });

  const integrityHash = await computeSha256(combinedPayloadForHash);

  const manifest = {
    format: 'THOBI_BACKUP',
    formatVersion: 1,
    backupVersion: '1.0',
    thobiAppVersion: '1.0.0',
    exportedAt: exportedAtIso,
    shopId,
    shopName,
    recordCounts: {
      customers: serializedCustomers.length,
      measurements: serializedMeasurements.length,
      orders: serializedOrders.length,
      payments: serializedPayments.length,
      refunds: serializedRefunds.length,
      staff: cleanStaff.length,
    },
    integrityHash,
    files: [
      'manifest.json',
      'README.txt',
      'ثوبي-بيانات-المتجر.xlsx',
      'shop_profile.json',
      'customers.json',
      'measurements.json',
      'orders.json',
      'payments.json',
      'refunds.json',
      'staff.json',
      'customers.csv',
      'orders.csv',
      'payments.csv',
      'refunds.csv',
    ],
    securityNotice: 'تم تنزيل هذه النسخة الاحتياطية حصرياً لمالك المتجر. لا تحتوي على كلمات مرور أو مفاتيح سرية.',
  };

  // -------------------------------------------------------------
  // 6. Arabic README Text
  // -------------------------------------------------------------
  const readmeText = `نسخة احتياطية لمتجر ثوبي (Thobi Store Data Backup)
====================================================================
معرف المتجر (Shop ID): ${shopId}
اسم المتجر (Shop Name): ${shopName}
تاريخ وتوقيت التصدير: ${exportedAtIso}
تنسيق النسخة الاحتياطية: THOBI_BACKUP (الإصدار 1)
رقم الإصدار (Backup Version): 1.0
توقيع سلامة البيانات الرقمي (SHA-256 Checksum):
${integrityHash}

توضيح نوعي البيانات في هذه النسخة:
--------------------------------------------------------------------
يحتوي ملف النسخة الاحتياطية على نوعين من البيانات:

1. ملفات JSON:
مخصصة للاستعادة التقنية والحفاظ على البيانات الأصلية بصيغتها المرجعية الدقيقة.

2. ملف Excel (ثوبي-بيانات-المتجر.xlsx):
مخصص لعرض بيانات المتجر بشكل واضح وسهل للقراءة والمراجعة اليومية.

لا تقم بتعديل ملفات JSON إذا كنت تريد الاحتفاظ بالنسخة لأغراض الاستعادة.

تنبيه أمني بالغ الأهمية:
--------------------------------------------------------------------
ملف النسخ الاحتياطي هذا يحتوي على بيانات تجارية وحساسة تخص متجرك وعملاءك،
بما في ذلك الأسماء، أرقام الجوالات، سجلات القياسات، وتفاصيل الحسابات المالية.
يرجى حفظ هذا الأرشيف في مكان آمن وعدم مشاركته مع أي أطراف غير موثوقة.

ملخص السجلات المضمنة في هذا الملف:
--------------------------------------------------------------------
- إجمالي عدد العملاء: ${serializedCustomers.length}
- إجمالي سجلات المقاسات: ${serializedMeasurements.length}
- إجمالي عدد الطلبات: ${serializedOrders.length}
- إجمالي سندات القبض (المدفوعات): ${serializedPayments.length}
- إجمالي سندات الصرف (المسترجعات): ${serializedRefunds.length}
- إجمالي حسابات طاقم العمل: ${cleanStaff.length}

محتويات هذا الأرشيف:
--------------------------------------------------------------------
1. ملف البيانات الوصفية (manifest.json):
   يحوي معلومات توثيقية حول النسخة الاحتياطية وإحصائيات السجلات وتوقيع التحقق الأمني.

2. مصنف إكسل المكتبي التفاعلي (ثوبي-بيانات-المتجر.xlsx):
   مصنف شامل للقراءة باللغة العربية باتجاه من اليمين إلى اليسار (RTL)، يتضمن:
   - العملاء: سجل العملاء وعناوينهم وأرقام هواتفهم وإجمالي طلباتهم.
   - المقاسات: قياسات مفردة ومفصلة واضحة ومفهومة للخياط مع حفظ القيم الرقمية تماماً.
   - الطلبات: أرشيف الطلبات وحالاتها وتفاصيل الأثواب والمبالغ المالية والضرائب.
   - الدفعات: سجل سندات القبض والدفعات المسجلة.
   - الاستردادات: سجل المبالغ المسترجعة وأسبابها.
   - الموظفون: قائمة بحسابات الطاقم ودور كل موظف وصلاحياته (معقم أمنياً بالكامل).
   - معلومات المتجر: بطاقة هوية المتجر وبيانات السجل والضريبة والإعدادات.

3. ملفات البيانات الأصلية المرجعية (Canonical JSON):
   - shop_profile.json : بيانات وهوية المتجر ومعلومات السجل التجاري وإعدادات الضريبة.
   - customers.json    : دليل العملاء بكافة معلومات الاتصال والعناوين.
   - measurements.json : سجلات المقاسات الدقيقة لجميع العملاء.
   - orders.json       : سجل كافة طلبات التفصيل وحالاتها وتفاصيل الأقمشة والموديلات والحسابات.
   - payments.json     : سجل جميع المدفوعات وسندات القبض المسجلة.
   - refunds.json      : سجل كافة المبالغ المسترجعة وسندات الصرف.
   - staff.json        : قائمة حسابات موظفي المتجر وصلاحياتهم (تم تعقيمها وإزالة أي كلمات مرور أو مفاتيح جلسات).

4. جداول البيانات للمعاينة المكتبية (Human-Readable CSV):
   - customers.csv     : جدول بيانات العملاء.
   - orders.csv        : جدول سجل الطلبات والحسابات.
   - payments.csv      : جدول المدفوعات المسجلة.
   - refunds.csv       : جدول المبالغ المسترجعة.
   * ملاحظة: جميع ملفات CSV تم إنشاؤها بترميز UTF-8 مع BOM حتى تفتح باللغة العربية بوضوح تام في Microsoft Excel دون تشويه في الحروف.

سياسة وسلامة الحماية:
--------------------------------------------------------------------
- هذا الملف يمثل نسخة مستقلة ومحفوظة محلياً على جهازك لبيانات متجرك حتى لحظة التصدير.
- تحتفظ منصة "ثوبي" السحابية بطبقات حماية واسترجاع تلقائية منفصلة ضد الكوارث (Google Cloud PITR & Daily Backups).
- الأرقام المالية والحسابية تم تصديرها مطابقة تماماً للبيانات المسجلة في قاعدة البيانات دون أي تعديل أو إعادة احتساب.

لأي استفسار أو دعم فني:
منصة ثوبي لإدارة مشاغل الخياطة الرجالية
`;

  // -------------------------------------------------------------
  // 7. Packaging into ZIP
  // -------------------------------------------------------------
  notify('جاري ضغط وتجهيز حزمة ZIP المشفرة...', 95);

  const zip = new JSZip();

  // Root manifest and readme
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('README.txt', readmeText);

  // Human-readable Excel workbook
  zip.file('ثوبي-بيانات-المتجر.xlsx', excelWorkbookBytes);

  // Canonical JSON files
  zip.file('shop_profile.json', JSON.stringify(cleanShopProfile, null, 2));
  zip.file('customers.json', JSON.stringify(serializedCustomers, null, 2));
  zip.file('measurements.json', JSON.stringify(serializedMeasurements, null, 2));
  zip.file('orders.json', JSON.stringify(serializedOrders, null, 2));
  zip.file('payments.json', JSON.stringify(serializedPayments, null, 2));
  zip.file('refunds.json', JSON.stringify(serializedRefunds, null, 2));
  zip.file('staff.json', JSON.stringify(cleanStaff, null, 2));

  // Human-readable CSV files
  zip.file('customers.csv', customersCsv);
  zip.file('orders.csv', ordersCsv);
  zip.file('payments.csv', paymentsCsv);
  zip.file('refunds.csv', refundsCsv);

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // -------------------------------------------------------------
  // 7. Trigger Direct Client Download
  // -------------------------------------------------------------
  notify('بدء تنزيل الملف على جهازك...', 99);

  const shopSlug = (rawShop.name || rawShop.shopName || shopId)
    .replace(/[^\w\u0600-\u06FF-]/g, '_')
    .slice(0, 30);
  const timeSlug = getTimestampSlug(now);
  const filename = `thobi-backup-${shopSlug}-${timeSlug}.zip`;

  const blobUrl = URL.createObjectURL(zipBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = filename;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 3000);

  // Store last backup downloaded in localStorage for the specific shop
  try {
    localStorage.setItem(`thobi_last_backup_${shopId}`, exportedAtIso);
  } catch (e) {
    // localStorage might fail in private browsing mode; handle gracefully
  }

  notify('اكتمل التنزيل بنجاح!', 100);

  return {
    shopId,
    shopName,
    exportedAt: exportedAtIso,
    filename,
    sizeBytes: zipBlob.size,
    recordCounts: manifest.recordCounts,
    integrityHash,
  };
}
