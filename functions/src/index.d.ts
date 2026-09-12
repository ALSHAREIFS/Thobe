import * as functions from 'firebase-functions';
export declare const initiateRestoreUpload: functions.https.CallableFunction<any, Promise<{
    jobId: string;
    uploadUrl: any;
}>, unknown>;
export declare const executeRestoreJob: functions.https.CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
export declare const cleanupRestoreJob: functions.https.CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
//# sourceMappingURL=index.d.ts.map