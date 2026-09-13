import * as functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

initializeApp();
const db = getFirestore();
const storage = getStorage();

const EXPECTED_SUPER_ADMIN_EMAIL = 'abdallahshareif11al@gmail.com';

function isSuperAdmin(context: any) {
  if (!context.auth) return false;
  if (context.auth.token.email !== EXPECTED_SUPER_ADMIN_EMAIL) return false;
  if (context.auth.token.email_verified !== true) return false;
  return true;
}

export const initiateRestoreUpload = functions.https.onCall(async (data: any, context: any) => {
  if (!isSuperAdmin(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }
  
  const jobId = `job-${Date.now()}`;
  const bucket = storage.bucket();
  const file = bucket.file(`restore_uploads/${jobId}.zip`);
  
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType: 'application/zip',
  });
  
  await db.collection('restoreJobs').doc(jobId).set({
    jobId,
    status: 'UPLOADING',
    requestedByUid: context.auth!.uid,
    storageUri: `gs://${bucket.name}/restore_uploads/${jobId}.zip`,
    createdAt: FieldValue.serverTimestamp()
  });
  
  return { jobId, uploadUrl: url };
});

export const executeRestoreJob = functions.https.onCall(async (data: any, context: any) => {
  if (!isSuperAdmin(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }
  
  const { jobId } = data;
  if (!jobId) throw new functions.https.HttpsError('invalid-argument', 'jobId required');
  
  const jobRef = db.collection('restoreJobs').doc(jobId);
  await jobRef.update({ status: 'VALIDATING' });
  
  // Minimal mock implementation for the controlled test setup.
  await jobRef.update({ status: 'COMPLETED' });
  
  return { success: true };
});

export const cleanupRestoreJob = functions.https.onCall(async (data: any, context: any) => {
  if (!isSuperAdmin(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }
  
  const { jobId } = data;
  if (!jobId) throw new functions.https.HttpsError('invalid-argument', 'jobId required');
  
  const recoveryRef = db.collection('recoveryShops').doc(jobId);
  const collections = ['recoveredStaff', 'recoveredCustomers', 'recoveredMeasurements', 'recoveredOrders', 'recoveredPayments', 'recoveredRefunds'];
  
  for (const col of collections) {
    const snaps = await recoveryRef.collection(col).get();
    const batch = db.batch();
    snaps.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();
  }
  
  await recoveryRef.delete();
  await db.collection('restoreJobs').doc(jobId).delete();
  
  try {
    const bucket = storage.bucket();
    await bucket.file(`restore_uploads/${jobId}.zip`).delete();
  } catch (e) {
    // ignore if already deleted
  }
  
  return { success: true };
});
 


// ============================================================================
// CONCURRENCY-SAFE FINANCIAL FUNCTIONS
// ============================================================================

async function canAccessPayments(shopId: string, uid: string, context: any) {
  if (isSuperAdmin(context)) return true;
  if (!uid) return false;
  
  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (!shopDoc.exists) return false;
  const shopData = shopDoc.data();
  if (shopData?.status !== 'ACTIVE') return false;
  
  if (shopData?.ownerUid === uid) return true;
  
  const userDoc = await db.collection(`shops/${shopId}/users`).doc(uid).get();
  if (!userDoc.exists) return false;
  const userData = userDoc.data();
  
  if (userData?.role === 'SHOP' && userData?.isActive) return true;
  if (userData?.role === 'EMPLOYEE' && userData?.isActive && userData?.permissions?.payments === true) return true;
  
  return false;
}

export const addPayment = functions.https.onCall(async (data: any, context: any) => {
  const { shopId, paymentData } = data;
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  const uid = context.auth.uid;
  if (!shopId || !paymentData || !paymentData.orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
  }

  const hasAccess = await canAccessPayments(shopId, uid, context);
  if (!hasAccess) throw new functions.https.HttpsError('permission-denied', 'User lacks payment permissions for this shop.');

  if (typeof paymentData.amount !== 'number' || isNaN(paymentData.amount) || paymentData.amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Payment amount must be a positive number.');
  }

  const orderRef = db.collection(`shops/${shopId}/orders`).doc(paymentData.orderId);
  const payRef = db.collection(`shops/${shopId}/payments`).doc();

  const now = new Date().toISOString();
  const receiptNumber = paymentData.receiptNumber || `REC-${Math.floor(1000 + Math.random() * 9000)}`;

  const newPayment = {
    ...paymentData,
    paymentId: payRef.id,
    shopId,
    receiptNumber,
    createdAt: now,
  };

  try {
    await db.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found.');
      }
      const orderData = orderSnap.data();
      if (!orderData) throw new functions.https.HttpsError("not-found", "Order data is missing.");

      if (orderData.status === 'CANCELLED') {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot add payment to a cancelled order.');
      }

      const orderId = orderSnap.id;
      const orderNumber = orderData.orderNumber;

      const payments = new Map();
      const p1 = await transaction.get(db.collection(`shops/${shopId}/payments`).where('orderId', '==', orderId));
      p1.forEach(d => payments.set(d.id, d.data()));
      if (orderNumber) {
        const p2 = await transaction.get(db.collection(`shops/${shopId}/payments`).where('orderId', '==', orderNumber));
        p2.forEach(d => payments.set(d.id, d.data()));
        const p3 = await transaction.get(db.collection(`shops/${shopId}/payments`).where('orderNumber', '==', orderNumber));
        p3.forEach(d => payments.set(d.id, d.data()));
      }
      
      let grossPaid = 0;
      payments.forEach(p => { grossPaid += p.amount || 0; });
      
      const refunds = new Map();
      const r1 = await transaction.get(db.collection(`shops/${shopId}/refunds`).where('orderId', '==', orderId));
      r1.forEach(d => refunds.set(d.id, d.data()));
      if (orderNumber) {
        const r2 = await transaction.get(db.collection(`shops/${shopId}/refunds`).where('orderId', '==', orderNumber));
        r2.forEach(d => refunds.set(d.id, d.data()));
        const r3 = await transaction.get(db.collection(`shops/${shopId}/refunds`).where('orderNumber', '==', orderNumber));
        r3.forEach(d => refunds.set(d.id, d.data()));
      }
      
      let grossRefunded = 0;
      refunds.forEach(r => { grossRefunded += r.amount || 0; });

      const totalAmount = orderData.pricing?.totalAmount || 0;
      const netPaid = Math.max(0, Math.round((grossPaid - grossRefunded) * 100) / 100);
      const remaining = Math.max(0, Math.round((totalAmount - netPaid) * 100) / 100);

      if (paymentData.amount > remaining) {
        throw new functions.https.HttpsError('failed-precondition', `Payment amount (${paymentData.amount}) exceeds remaining amount (${remaining}).`);
      }

      const newGrossPaid = Math.round((grossPaid + paymentData.amount) * 100) / 100;
      const newNetPaid = Math.max(0, Math.round((newGrossPaid - grossRefunded) * 100) / 100);
      const newRemaining = Math.max(0, Math.round((totalAmount - newNetPaid) * 100) / 100);

      transaction.set(payRef, newPayment);

      transaction.update(orderRef, {
        'pricing.paidAmount': newGrossPaid,
        'pricing.remainingAmount': newRemaining,
        financialLocked: true,
        updatedAt: now,
        _financialVersion: FieldValue.increment(1)
      });
    });

    return newPayment;
  } catch (err: any) {
    if (err.errorInfo && err.errorInfo.code) throw err;
    throw new functions.https.HttpsError('internal', err.message || 'Unknown error');
  }
});

export const addRefund = functions.https.onCall(async (data: any, context: any) => {
  const { shopId, refundData } = data;
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  const uid = context.auth.uid;

  if (!shopId || !refundData || !refundData.orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
  }

  const hasAccess = await canAccessPayments(shopId, uid, context);
  if (!hasAccess) throw new functions.https.HttpsError('permission-denied', 'User lacks payment permissions for this shop.');

  if (typeof refundData.amount !== 'number' || isNaN(refundData.amount) || refundData.amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Refund amount must be a positive number.');
  }

  const refundId = refundData.refundId || db.collection(`shops/${shopId}/refunds`).doc().id;
  const orderRef = db.collection(`shops/${shopId}/orders`).doc(refundData.orderId);
  const refundRef = db.collection(`shops/${shopId}/refunds`).doc(refundId);

  const now = new Date().toISOString();

  const newRefund = {
    ...refundData,
    refundId,
    shopId,
    createdAt: now,
  };

  try {
    await db.runTransaction(async (transaction) => {
      const existingRefund = await transaction.get(refundRef);
      if (existingRefund.exists) {
         throw new functions.https.HttpsError('already-exists', 'Refund already processed.');
      }

      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found.');
      }
      const orderData = orderSnap.data();
      if (!orderData) throw new functions.https.HttpsError("not-found", "Order data is missing.");

      const orderId = orderSnap.id;
      const orderNumber = orderData.orderNumber;

      const payments = new Map();
      const p1 = await transaction.get(db.collection(`shops/${shopId}/payments`).where('orderId', '==', orderId));
      p1.forEach(d => payments.set(d.id, d.data()));
      if (orderNumber) {
        const p2 = await transaction.get(db.collection(`shops/${shopId}/payments`).where('orderId', '==', orderNumber));
        p2.forEach(d => payments.set(d.id, d.data()));
        const p3 = await transaction.get(db.collection(`shops/${shopId}/payments`).where('orderNumber', '==', orderNumber));
        p3.forEach(d => payments.set(d.id, d.data()));
      }
      
      let grossPaid = 0;
      payments.forEach(p => { grossPaid += p.amount || 0; });
      
      const refunds = new Map();
      const r1 = await transaction.get(db.collection(`shops/${shopId}/refunds`).where('orderId', '==', orderId));
      r1.forEach(d => refunds.set(d.id, d.data()));
      if (orderNumber) {
        const r2 = await transaction.get(db.collection(`shops/${shopId}/refunds`).where('orderId', '==', orderNumber));
        r2.forEach(d => refunds.set(d.id, d.data()));
        const r3 = await transaction.get(db.collection(`shops/${shopId}/refunds`).where('orderNumber', '==', orderNumber));
        r3.forEach(d => refunds.set(d.id, d.data()));
      }
      
      let grossRefunded = 0;
      refunds.forEach(r => { grossRefunded += r.amount || 0; });

      const netPaid = Math.max(0, Math.round((grossPaid - grossRefunded) * 100) / 100);
      const maxRefundable = netPaid;

      if (refundData.amount > maxRefundable) {
        throw new functions.https.HttpsError('failed-precondition', `Refund amount (${refundData.amount}) exceeds maximum refundable amount (${maxRefundable}).`);
      }

      const newGrossRefunded = Math.round((grossRefunded + refundData.amount) * 100) / 100;
      const newNetPaid = Math.max(0, Math.round((grossPaid - newGrossRefunded) * 100) / 100);
      const totalAmount = orderData.pricing?.totalAmount || 0;
      const newRemaining = Math.max(0, Math.round((totalAmount - newNetPaid) * 100) / 100);

      transaction.set(refundRef, newRefund);

      transaction.update(orderRef, {
        'pricing.refundedAmount': newGrossRefunded,
        'pricing.paidAmount': grossPaid,
        'pricing.remainingAmount': newRemaining,
        financialLocked: true,
        updatedAt: now,
        _financialVersion: FieldValue.increment(1)
      });
    });

    return newRefund;
  } catch (err: any) {
    if (err.errorInfo && err.errorInfo.code) throw err;
    throw new functions.https.HttpsError('internal', err.message || 'Unknown error');
  }
});
