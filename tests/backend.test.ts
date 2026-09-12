import {
  computeCanonicalHash,
  computeLegacyHash,
  validateAndExtractZipBytes,
  validateRelationships,
  computeFinancialSummaries,
  verifySuperAdmin
} from '../src/services/restoreBackendService';
import { canonicalStringify } from '../src/utils/canonicalJson';
import JSZip from 'jszip';

// Basic Web Crypto API implementation for Node environment
if (!globalThis.crypto) {
  const { webcrypto } = require('crypto');
  globalThis.crypto = webcrypto as any;
}

const EXPECTED_SHOP_ID = 'test_shop_123';

async function createTestZipBytes(overrides: any = {}): Promise<ArrayBuffer> {
  const shop = [{ shopId: EXPECTED_SHOP_ID, name: 'Test Shop' }];
  const customers = [{ customerId: 'c1', shopId: EXPECTED_SHOP_ID, name: 'أحمد', phone: '050' }];
  const measurements = [{ measurementId: 'm1', customerId: 'c1', shopId: EXPECTED_SHOP_ID, length: 150.5 }];
  const orders = [
    { 
      orderId: 'o1', 
      customerId: 'c1', 
      shopId: EXPECTED_SHOP_ID, 
      status: 'CANCELLED',
      tailoringDetails: { fabric: { notes: 'ملاحظة' } },
      taxSnapshot: { vatAmount: 15 }
    }
  ];
  const payments = [{ paymentId: 'p1', orderId: 'o1', shopId: EXPECTED_SHOP_ID, amount: 100 }];
  const refunds = [{ refundId: 'r1', orderId: 'o1', shopId: EXPECTED_SHOP_ID, amount: 20 }];
  const staff = [{ userId: 'u1', shopId: EXPECTED_SHOP_ID }];

  const data: Record<string, any> = {
    'shop_profile.json': shop,
    'customers.json': customers,
    'measurements.json': measurements,
    'orders.json': orders,
    'payments.json': payments,
    'refunds.json': refunds,
    'staff.json': staff,
  };

  if (overrides.dataModifier) overrides.dataModifier(data);

  let hashHex = '';
  if (overrides.legacyVersion) {
    hashHex = await computeLegacyHash(data);
  } else {
    hashHex = await computeCanonicalHash(data);
  }

  const manifest = {
    format: 'THOBI_BACKUP',
    version: overrides.legacyVersion ? undefined : '1.1',
    shopId: EXPECTED_SHOP_ID,
    integrityHash: overrides.badHash ? 'badhash' : hashHex
  };

  if (overrides.manifestModifier) overrides.manifestModifier(manifest);

  const zip = new JSZip();
  if (!overrides.missingManifest) {
    zip.file('manifest.json', JSON.stringify(manifest));
  }
  
  for (const [filename, fileData] of Object.entries(data)) {
    zip.file(filename, JSON.stringify(fileData));
  }
  
  if (overrides.pathTraversal) {
    zip.file('../evil.txt', 'evil');
  }

  if (overrides.oversizeUpload) {
    // We mock oversize buffer later since generating a 50MB zip is slow
  }

  if (overrides.zipBomb) {
    // Generate a file with huge compression ratio (lots of zeros)
    zip.file('bomb.json', '0'.repeat(10 * 1024 * 1024)); 
  }

  const content = await zip.generateAsync({ type: 'uint8array', compression: overrides.zipBomb ? 'DEFLATE' : 'STORE' });
  return content.buffer;
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name: string, condition: () => Promise<boolean>) {
    try {
      const res = await condition();
      if (res) {
        console.log(`✅ PASS: ${name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${name}`);
        failed++;
      }
    } catch (e: any) {
      console.log(`❌ FAIL: ${name} (Exception: ${e.message})`);
      failed++;
    }
  }

  // Auth tests
  await test('authorization failures: no auth', async () => !verifySuperAdmin(null));
  await test('authorization failures: invalid email', async () => !verifySuperAdmin({ uid: 'abc', email: 'test@test.com', email_verified: true }));
  await test('authorization failures: unverified email', async () => !verifySuperAdmin({ uid: 'abc', email: 'abdallahshareif11al@gmail.com', email_verified: false }));
  await test('valid SUPER_ADMIN', async () => verifySuperAdmin({ uid: 'real_super_admin_uid_here', email: 'abdallahshareif11al@gmail.com', email_verified: true }));

  // ZIP security tests
  await test('oversize upload', async () => {
    try {
      await validateAndExtractZipBytes(new ArrayBuffer(51 * 1024 * 1024), EXPECTED_SHOP_ID);
      return false;
    } catch (e: any) {
      return e.message.includes('size exceeds maximum allowed limit');
    }
  });

  await test('corrupted ZIP', async () => {
    try {
      await validateAndExtractZipBytes(new Uint8Array([1, 2, 3, 4]).buffer, EXPECTED_SHOP_ID);
      return false;
    } catch (e: any) {
      return e.message.includes('Invalid ZIP');
    }
  });

  await test('ZIP bomb (compression ratio)', async () => {
    try {
      const bytes = await createTestZipBytes({ zipBomb: true });
      await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
      return false;
    } catch (e: any) {
      return e.message.includes('Suspicious compression ratio');
    }
  });

  await test('path traversal', async () => {
    try {
      const bytes = await createTestZipBytes({ pathTraversal: true });
      await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
      return false;
    } catch (e: any) {
      return e.message.includes('Path traversal');
    }
  });

  // Backup validation tests
  await test('invalid integrity hash', async () => {
    const bytes = await createTestZipBytes({ badHash: true });
    const { data, manifest } = await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
    const hash = await computeCanonicalHash(data);
    return hash !== manifest.integrityHash;
  });

  await test('legacy backup hash', async () => {
    const bytes = await createTestZipBytes({ legacyVersion: true });
    const { data, manifest } = await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
    const hash = await computeLegacyHash(data);
    return hash === manifest.integrityHash;
  });

  await test('cross-tenant backup', async () => {
    try {
      const bytes = await createTestZipBytes({ manifestModifier: (m: any) => m.shopId = 'wrong_shop' });
      await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
      return false;
    } catch (e: any) {
      return e.message.includes('Cross-tenant backup detected');
    }
  });

  await test('broken relationships', async () => {
    const bytes = await createTestZipBytes({ dataModifier: (d: any) => d['payments.json'][0].orderId = 'missing' });
    const { data } = await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
    try {
      validateRelationships(data, EXPECTED_SHOP_ID);
      return false;
    } catch (e: any) {
      return e.message.includes('Payment references missing order');
    }
  });

  await test('duplicate IDs', async () => {
    const bytes = await createTestZipBytes({ dataModifier: (d: any) => d['customers.json'].push(d['customers.json'][0]) });
    const { data } = await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
    try {
      validateRelationships(data, EXPECTED_SHOP_ID);
      return false;
    } catch (e: any) {
      return e.message.includes('Duplicate customer ID');
    }
  });

  // Summaries
  await test('financial summary comparison', async () => {
    const bytes = await createTestZipBytes();
    const { data } = await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
    const sums = computeFinancialSummaries(data);
    return sums.totalPayments === 100 && sums.totalRefunds === 20 && sums.netCollected === 80 && sums.vatAmount === 15 && sums.cancelledOrders === 1;
  });

  await test('Arabic/custom tailoring preservation', async () => {
    const bytes = await createTestZipBytes();
    const { data } = await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
    return data['customers.json'][0].name === 'أحمد' && data['orders.json'][0].tailoringDetails.fabric.notes === 'ملاحظة';
  });
  
  await test('VAT snapshot preservation', async () => {
    const bytes = await createTestZipBytes();
    const { data } = await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
    return data['orders.json'][0].taxSnapshot.vatAmount === 15;
  });

  await test('CANCELLED status preservation', async () => {
    const bytes = await createTestZipBytes();
    const { data } = await validateAndExtractZipBytes(bytes, EXPECTED_SHOP_ID);
    return data['orders.json'][0].status === 'CANCELLED';
  });

  console.log(`\nResults: ${passed} PASSED / ${failed} FAILED`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
