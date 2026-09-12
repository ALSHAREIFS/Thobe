/**
 * Firestore Data Serialization Utility
 * 
 * Safely serializes Firestore types (Timestamps, DocumentReferences, GeoPoints, Bytes)
 * into canonical, JSON-safe primitives with zero data loss.
 */

/**
 * Checks if a value is a Firestore Timestamp
 */
function isFirestoreTimestamp(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  return (
    typeof val.toDate === 'function' ||
    (typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') ||
    (typeof val._seconds === 'number' && typeof val._nanoseconds === 'number')
  );
}

/**
 * Converts a Firestore Timestamp to an ISO 8601 string
 */
function convertTimestampToIso(val: any): string {
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  const seconds = typeof val.seconds === 'number' ? val.seconds : val._seconds;
  const nanoseconds = typeof val.nanoseconds === 'number' ? val.nanoseconds : (val._nanoseconds || 0);
  const millis = seconds * 1000 + Math.floor(nanoseconds / 1000000);
  return new Date(millis).toISOString();
}

/**
 * Checks if a value is a Firestore DocumentReference
 */
function isFirestoreDocRef(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  return typeof val.path === 'string' && (val.firestore !== undefined || val.id !== undefined);
}

/**
 * Checks if a value is a Firestore GeoPoint
 */
function isFirestoreGeoPoint(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  return typeof val.latitude === 'number' && typeof val.longitude === 'number';
}

/**
 * Recursively serializes Firestore data to standard, clean JSON-safe primitives.
 * Handles Timestamps -> ISO 8601 strings
 * Handles DocumentReferences -> path strings
 * Handles GeoPoints -> { latitude, longitude }
 * Handles Blobs / Uint8Array -> base64 string
 * Converts undefined -> null
 */
export function serializeFirestoreData(obj: any, seen = new WeakSet()): any {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    if (obj === undefined) {
      return null;
    }
    return obj;
  }

  // Handle native Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle Firestore Timestamp
  if (isFirestoreTimestamp(obj)) {
    return convertTimestampToIso(obj);
  }

  // Handle Firestore DocumentReference
  if (isFirestoreDocRef(obj)) {
    return obj.path;
  }

  // Handle Firestore GeoPoint
  if (isFirestoreGeoPoint(obj)) {
    return {
      latitude: obj.latitude,
      longitude: obj.longitude,
    };
  }

  // Handle Uint8Array / Bytes / Blobs
  if (typeof obj.toBase64 === 'function') {
    return obj.toBase64();
  }
  if (obj instanceof Uint8Array) {
    let binary = '';
    const bytes = new Uint8Array(obj);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Circular reference protection
  if (seen.has(obj)) {
    return '[Circular Reference]';
  }
  seen.add(obj);

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeFirestoreData(item, seen));
  }

  // Handle Plain Objects
  const serialized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      serialized[key] = null;
    } else {
      serialized[key] = serializeFirestoreData(value, seen);
    }
  }

  return serialized;
}
