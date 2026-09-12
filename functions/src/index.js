"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupRestoreJob = exports.executeRestoreJob = exports.initiateRestoreUpload = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
const EXPECTED_SUPER_ADMIN_EMAIL = 'abdallahshareif11al@gmail.com';
function isSuperAdmin(context) {
    if (!context.auth)
        return false;
    if (context.auth.token.email !== EXPECTED_SUPER_ADMIN_EMAIL)
        return false;
    if (context.auth.token.email_verified !== true)
        return false;
    return true;
}
exports.initiateRestoreUpload = functions.https.onCall(async (data, context) => {
    if (!isSuperAdmin(context)) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
    }
    const jobId = `job-${Date.now()}`;
    const bucket = storage.bucket();
    const file = bucket.file(`restore_uploads/${jobId}.zip`);
    const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: 'application/zip',
    });
    await db.collection('restoreJobs').doc(jobId).set({
        jobId,
        status: 'UPLOADING',
        requestedByUid: context.auth.uid,
        storageUri: `gs://${bucket.name}/restore_uploads/${jobId}.zip`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { jobId, uploadUrl: url };
});
exports.executeRestoreJob = functions.https.onCall(async (data, context) => {
    if (!isSuperAdmin(context)) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
    }
    const { jobId } = data;
    if (!jobId)
        throw new functions.https.HttpsError('invalid-argument', 'jobId required');
    const jobRef = db.collection('restoreJobs').doc(jobId);
    await jobRef.update({ status: 'VALIDATING' });
    // Minimal mock implementation for the controlled test setup.
    // In reality, this reads the ZIP, extracts, validates size/chunks, and writes to recoveryShops.
    await jobRef.update({ status: 'COMPLETED' });
    return { success: true };
});
exports.cleanupRestoreJob = functions.https.onCall(async (data, context) => {
    if (!isSuperAdmin(context)) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
    }
    const { jobId } = data;
    if (!jobId)
        throw new functions.https.HttpsError('invalid-argument', 'jobId required');
    const recoveryRef = db.collection('recoveryShops').doc(jobId);
    const collections = ['recoveredStaff', 'recoveredCustomers', 'recoveredMeasurements', 'recoveredOrders', 'recoveredPayments', 'recoveredRefunds'];
    // Bulk delete subcollections
    for (const col of collections) {
        const snaps = await recoveryRef.collection(col).get();
        const batch = db.batch();
        snaps.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
    await recoveryRef.delete();
    await db.collection('restoreJobs').doc(jobId).delete();
    try {
        const bucket = storage.bucket();
        await bucket.file(`restore_uploads/${jobId}.zip`).delete();
    }
    catch (e) {
        // ignore if already deleted
    }
    return { success: true };
});
//# sourceMappingURL=index.js.map