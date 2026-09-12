import JSZip from 'jszip';
import { computeSha256 } from './storeBackupService';
import { Customer, MeasurementRecord, Order, Payment, Refund, UserProfile, Shop } from '../types';

export interface ValidationReport {
  isValid: boolean;
  isComplete: boolean;
  isShopMatch: boolean;
  isHashValid: boolean;
  isRelationsValid: boolean;
  
  shopId: string;
  shopName: string;
  exportedAt: string;
  
  counts: {
    customers: number;
    measurements: number;
    orders: number;
    payments: number;
    refunds: number;
    staff: number;
  };
  
  errors: string[];
}

export async function validateThobiBackupZip(file: File, expectedShopId: string): Promise<ValidationReport> {
  const report: ValidationReport = {
    isValid: false,
    isComplete: false,
    isShopMatch: false,
    isHashValid: false,
    isRelationsValid: false,
    shopId: '',
    shopName: '',
    exportedAt: '',
    counts: {
      customers: 0,
      measurements: 0,
      orders: 0,
      payments: 0,
      refunds: 0,
      staff: 0,
    },
    errors: [],
  };

  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // Check if manifest exists
    const manifestFile = contents.file('manifest.json');
    if (!manifestFile) {
      report.errors.push('النسخة غير مكتملة: ملف manifest.json مفقود');
      return report;
    }
    
    const manifestText = await manifestFile.async('text');
    let manifest: any;
    try {
      manifest = JSON.parse(manifestText);
    } catch (e) {
      report.errors.push('ملف manifest.json تالف أو غير صالح');
      return report;
    }

    if (manifest.format !== 'THOBI_BACKUP') {
      report.errors.push('النسخة الاحتياطية ليست بتنسيق متوافق مع ثوبي');
      return report;
    }

    report.shopId = manifest.shopId || '';
    report.shopName = manifest.shopName || '';
    report.exportedAt = manifest.exportedAt || '';

    // Check shop match
    if (manifest.shopId !== expectedShopId) {
      report.errors.push('تحتوي النسخة على بيانات لا تخص هذا المتجر');
      // We don't mark as complete because it's the wrong shop
      return report;
    }
    report.isShopMatch = true;

    // Load JSON files
    const jsonFiles = [
      'shop_profile.json',
      'customers.json',
      'measurements.json',
      'orders.json',
      'payments.json',
      'refunds.json',
      'staff.json'
    ];

    const data: Record<string, any> = {};

    for (const filename of jsonFiles) {
      const f = contents.file(filename);
      if (!f) {
        report.errors.push(`النسخة غير مكتملة: ملف ${filename} مفقود`);
        return report;
      }
      try {
        const text = await f.async('text');
        data[filename] = JSON.parse(text);
      } catch (e) {
        report.errors.push(`ملف ${filename} تالف أو غير صالح`);
        return report;
      }
    }
    report.isComplete = true;

    // Check counts
    report.counts = {
      customers: data['customers.json'].length,
      measurements: data['measurements.json'].length,
      orders: data['orders.json'].length,
      payments: data['payments.json'].length,
      refunds: data['refunds.json'].length,
      staff: data['staff.json'].length,
    };

    if (
      manifest.recordCounts?.customers !== report.counts.customers ||
      manifest.recordCounts?.orders !== report.counts.orders ||
      manifest.recordCounts?.payments !== report.counts.payments ||
      manifest.recordCounts?.refunds !== report.counts.refunds
    ) {
      report.errors.push('يوجد عدم تطابق بين عدد السجلات الفعلي والعدد المسجل في ملف الوصف');
    }

    // Verify Hash
    const combinedPayloadForHash = JSON.stringify({
      shop: data['shop_profile.json'],
      customers: data['customers.json'],
      measurements: data['measurements.json'],
      orders: data['orders.json'],
      payments: data['payments.json'],
      refunds: data['refunds.json'],
      staff: data['staff.json'],
    });
    
    const computedHash = await computeSha256(combinedPayloadForHash);
    if (computedHash !== manifest.integrityHash) {
      report.errors.push('فشل التحقق من سلامة النسخة: التوقيع الرقمي غير متطابق (قد تكون معدلة أو تالفة)');
    } else {
      report.isHashValid = true;
    }

    // Verify IDs & Shop Isolation & Relationships
    let relationsValid = true;
    const customerIds = new Set<string>();
    const orderIds = new Set<string>();

    // 1. Customers
    const docIds = new Set<string>();
    for (const c of data['customers.json']) {
      if (c.shopId && c.shopId !== expectedShopId) {
        report.errors.push('سجل عميل لا يتبع لهذا المتجر');
        relationsValid = false;
        break;
      }
      if (docIds.has(c.customerId)) {
        report.errors.push('معرف عميل مكرر');
        relationsValid = false;
        break;
      }
      docIds.add(c.customerId);
      customerIds.add(c.customerId);
    }

    // 2. Orders
    const oIds = new Set<string>();
    for (const o of data['orders.json']) {
      if (o.shopId && o.shopId !== expectedShopId) {
        report.errors.push('سجل طلب لا يتبع لهذا المتجر');
        relationsValid = false;
        break;
      }
      if (oIds.has(o.orderId)) {
        report.errors.push('معرف طلب مكرر');
        relationsValid = false;
        break;
      }
      oIds.add(o.orderId);
      orderIds.add(o.orderId);
      
      if (!customerIds.has(o.customerId)) {
        report.errors.push('يوجد طلب مرتبط بعميل غير موجود في النسخة');
        relationsValid = false;
        break;
      }
    }

    // 3. Measurements
    for (const m of data['measurements.json']) {
      if (m.shopId && m.shopId !== expectedShopId) {
        report.errors.push('سجل مقاس لا يتبع لهذا المتجر');
        relationsValid = false;
        break;
      }
      if (!customerIds.has(m.customerId)) {
        report.errors.push('يوجد مقاس مرتبط بعميل غير موجود في النسخة');
        relationsValid = false;
        break;
      }
    }

    // 4. Payments
    for (const p of data['payments.json']) {
      if (p.shopId && p.shopId !== expectedShopId) {
        report.errors.push('سجل دفعة لا يتبع لهذا المتجر');
        relationsValid = false;
        break;
      }
      if (!orderIds.has(p.orderId)) {
        report.errors.push('يوجد دفعة مرتبطة بطلب غير موجود في النسخة');
        relationsValid = false;
        break;
      }
    }

    // 5. Refunds
    for (const r of data['refunds.json']) {
      if (r.shopId && r.shopId !== expectedShopId) {
        report.errors.push('سجل استرداد لا يتبع لهذا المتجر');
        relationsValid = false;
        break;
      }
      if (!orderIds.has(r.orderId)) {
        report.errors.push('يوجد استرداد مرتبط بطلب غير موجود في النسخة');
        relationsValid = false;
        break;
      }
    }

    report.isRelationsValid = relationsValid;

    if (report.errors.length === 0) {
      report.isValid = true;
    }

  } catch (error: any) {
    report.errors.push('حدث خطأ أثناء قراءة الملف: ' + (error.message || ''));
  }

  return report;
}
