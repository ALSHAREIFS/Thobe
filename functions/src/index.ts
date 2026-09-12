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
