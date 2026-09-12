import JSZip from 'jszip';
import { canonicalStringify } from '../utils/canonicalJson';

// Web Crypto API wrapper for SHA-256
async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface RestoreJob {
  jobId: string;
  status: 'UPLOADING' | 'VALIDATING' | 'RESTORING' | 'VERIFYING' | 'COMPLETED' | 'FAILED';
  sourceShopId: string;
  requestedByUid: string;
  storageUri: string;
  integrityHash?: string;
  error?: string;
  chunks: Record<string, string>;
}

export interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
}

const EXPECTED_SUPER_ADMIN_UID = 'real_super_admin_uid_here'; // Replace with real one in production
const EXPECTED_SUPER_ADMIN_EMAIL = 'abdallahshareif11al@gmail.com';

export function verifySuperAdmin(auth: AuthContext | null): boolean {
  if (!auth) return false;
  if (auth.email !== EXPECTED_SUPER_ADMIN_EMAIL) return false;
  if (auth.email_verified !== true) return false;
  // If we had the exact UID we would check it: 
  // if (auth.uid !== EXPECTED_SUPER_ADMIN_UID) return false;
  return true;
}

const MAX_FILES = 50;
const MAX_UNCOMPRESSED_TOTAL = 500 * 1024 * 1024; // 500MB
const MAX_UNCOMPRESSED_FILE = 100 * 1024 * 1024; // 100MB
const MAX_COMPRESSION_RATIO = 20;

export async function validateAndExtractZipBytes(zipBuffer: ArrayBuffer, expectedShopId: string): Promise<{ data: Record<string, any>, manifest: any }> {
  // Enforce server-side file size (simulated here, typically done via Storage metadata before downloading)
  if (zipBuffer.byteLength > 50 * 1024 * 1024) {
    throw new Error('Upload size exceeds maximum allowed limit of 50MB');
  }

  // Check magic bytes (PK\\x03\\x04)
  const view = new Uint8Array(zipBuffer);
  if (view.length < 4 || view[0] !== 0x50 || view[1] !== 0x4B || view[2] !== 0x03 || view[3] !== 0x04) {
    throw new Error('Invalid ZIP file signature');
  }

  const zip = new JSZip();
  const contents = await zip.loadAsync(zipBuffer);
  
  const files = Object.keys(contents.files);
  if (files.length > MAX_FILES) {
    throw new Error('Archive contains too many files');
  }

  const extractedData: Record<string, any> = {};
  let totalUncompressedSize = 0;

  for (const filename of files) {
    // Path traversal protections
    if (filename.includes('../') || filename.includes('..\\') || filename.startsWith('/')) {
      throw new Error('Path traversal detected in archive');
    }

    // Only process allowed json files
    if (!filename.endsWith('.json')) {
      continue;
    }

    const fileObj = contents.files[filename];
    if (fileObj.dir) continue;

    // JSZip doesn't easily expose uncompressed size before extraction in all environments,
    // but we can decode incrementally or check the ZIP header if we parse it manually.
    // For JSZip, we'll extract as Uint8Array to measure exactly.
    const fileBytes = await fileObj.async('uint8array');
    totalUncompressedSize += fileBytes.length;

    if (fileBytes.length > MAX_UNCOMPRESSED_FILE) {
      throw new Error(`File ${filename} exceeds maximum allowed uncompressed size`);
    }
    
    if (totalUncompressedSize > MAX_UNCOMPRESSED_TOTAL) {
      throw new Error('Archive exceeds total maximum uncompressed size');
    }

    const ratio = fileBytes.length / (fileObj as any)._data.compressedSize;
    if (ratio > MAX_COMPRESSION_RATIO) {
       throw new Error('Suspicious compression ratio detected (ZIP Bomb protection)');
    }

    const text = new TextDecoder().decode(fileBytes);
    try {
      extractedData[filename] = JSON.parse(text);
    } catch(e) {
      throw new Error(`File ${filename} contains invalid JSON`);
    }
  }

  if (!extractedData['manifest.json']) {
    throw new Error('manifest.json is missing');
  }

  const manifest = extractedData['manifest.json'];
  if (manifest.shopId && manifest.shopId !== expectedShopId) {
    throw new Error('Cross-tenant backup detected: shopId mismatch');
  }

  return { data: extractedData, manifest };
}

export async function computeCanonicalHash(data: Record<string, any>): Promise<string> {
  const combinedPayloadForHash = {
    shop: data['shop_profile.json'],
    customers: data['customers.json'],
    measurements: data['measurements.json'],
    orders: data['orders.json'],
    payments: data['payments.json'],
    refunds: data['refunds.json'],
    staff: data['staff.json'],
  };
  
  const canonicalStr = canonicalStringify(combinedPayloadForHash);
  return await computeSha256(canonicalStr);
}

export async function computeLegacyHash(data: Record<string, any>): Promise<string> {
  // Legacy JSON.stringify hash
  const combinedPayloadForHash = {
    shop: data['shop_profile.json'],
    customers: data['customers.json'],
    measurements: data['measurements.json'],
    orders: data['orders.json'],
    payments: data['payments.json'],
    refunds: data['refunds.json'],
    staff: data['staff.json'],
  };
  return await computeSha256(JSON.stringify(combinedPayloadForHash));
}

// Validation of relationship integrity
export function validateRelationships(data: Record<string, any>, expectedShopId: string) {
  const customerIds = new Set<string>();
  const orderIds = new Set<string>();
  
  const ensureShopId = (record: any) => {
    if (record.shopId && record.shopId !== expectedShopId) {
      throw new Error('Foreign shopId found in record');
    }
  };

  for (const c of data['customers.json'] || []) {
    ensureShopId(c);
    if (customerIds.has(c.customerId)) throw new Error('Duplicate customer ID');
    customerIds.add(c.customerId);
  }

  for (const o of data['orders.json'] || []) {
    ensureShopId(o);
    if (orderIds.has(o.orderId)) throw new Error('Duplicate order ID');
    if (!customerIds.has(o.customerId)) throw new Error('Order references missing customer');
    orderIds.add(o.orderId);
  }

  for (const m of data['measurements.json'] || []) {
    ensureShopId(m);
    if (!customerIds.has(m.customerId)) throw new Error('Measurement references missing customer');
  }

  for (const p of data['payments.json'] || []) {
    ensureShopId(p);
    if (!orderIds.has(p.orderId)) throw new Error('Payment references missing order');
  }

  for (const r of data['refunds.json'] || []) {
    ensureShopId(r);
    if (!orderIds.has(r.orderId)) throw new Error('Refund references missing order');
  }
}

export function computeFinancialSummaries(data: Record<string, any>) {
  let netCollected = 0;
  let totalPayments = 0;
  let totalRefunds = 0;
  let vatAmount = 0;
  let cancelledOrders = 0;

  for (const p of data['payments.json'] || []) {
    totalPayments += p.amount || 0;
  }
  for (const r of data['refunds.json'] || []) {
    totalRefunds += r.amount || 0;
  }
  netCollected = totalPayments - totalRefunds;

  for (const o of data['orders.json'] || []) {
    if (o.status === 'CANCELLED') cancelledOrders++;
    if (o.taxSnapshot?.vatAmount) vatAmount += o.taxSnapshot.vatAmount;
  }

  return {
    totalPayments,
    totalRefunds,
    netCollected,
    vatAmount,
    cancelledOrders,
    customersCount: (data['customers.json'] || []).length,
    ordersCount: (data['orders.json'] || []).length,
    paymentsCount: (data['payments.json'] || []).length,
    refundsCount: (data['refunds.json'] || []).length,
  };
}
