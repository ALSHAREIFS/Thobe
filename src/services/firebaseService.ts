import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { initializeApp as initSecondaryApp, deleteApp } from 'firebase/app';
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { auth, db, firebaseConfig } from '../firebase/config';
import {
  Customer,
  MeasurementRecord,
  Order,
  OrderStatus,
  Payment,
  Refund,
  Shop,
  ShopStatus,
  ShopRequest,
  PlatformAdmin,
  UserProfile,
  MeasurementData,
  EmployeePermissions,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  DEFAULT_MAX_EMPLOYEES,
  MAX_SAFE_EMPLOYEES,
  EMPLOYEE_ERROR_CODES,
  EmployeeDomainError,
} from '../types';
import { validateMeasurements } from '../utils/presets';

// Helper to format Firestore errors clearly
export function parseFirebaseError(err: any): string {
  if (!err) return 'حدث خطأ غير متوقع';
  const msg = err.message || err.code || String(err);
  if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
    return 'تم رفض الإجراء: ليس لديك الصلاحية الأمنية الكافية أو أن المحل في حالة تعليق مؤقت (Permission Denied)';
  }
  if (msg.includes('unauthenticated') || msg.includes('UNAUTHENTICATED')) {
    return 'جلسة الدخول منتهية، يرجى تسجيل الدخول مرة أخرى';
  }
  if (msg.includes('not-found') || msg.includes('NOT_FOUND')) {
    return 'البيانات المطلوبة غير موجودة في الخادم';
  }
  if (msg.includes('unavailable') || msg.includes('UNAVAILABLE')) {
    return 'تعذر الاتصال بقاعدة بيانات Firestore السحابية، يرجى فحص الاتصال بالإنترنت';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'البريد الإلكتروني مسجل مسبقاً في النظام';
  }
  if (msg.includes('auth/weak-password')) {
    return 'كلمة المرور ضعيفة (يجب أن تكون 6 خانات على الأقل)';
  }
  if (msg.includes('auth/invalid-email')) {
    return 'صيغة البريد الإلكتروني غير صحيحة';
  }
  if (msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
    return 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور';
  }
  return msg;
}

// Tailor Multi-Tenant SaaS Service Layer
export const TailorService = {
  // -------------------------------------------------------------
  // 0. PLATFORM SUPER ADMIN & SHOP REQUESTS
  // -------------------------------------------------------------

  /**
   * Submit a new Shop registration request with direct Firebase Authentication.
   * Creates real user in Firebase Authentication with user's chosen password.
   * The password is NEVER saved to Firestore, logs, or storage.
   */
  async createShopRequestWithAuth(data: {
    ownerName: string;
    shopName: string;
    email: string;
    phone: string;
    city: string;
    password: string;
    notes?: string;
  }): Promise<ShopRequest> {
    try {
      const email = data.email.trim().toLowerCase();
      const password = data.password;

      if (!password || password.length < 6) {
        throw new Error('كلمة المرور يجب أن تكون ٦ خانات على الأقل');
      }

      // 1. Create real Auth user account in Firebase Authentication
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const authUser = userCred.user;
      const realUid = authUser.uid;

      // 2. Prepare PENDING shop registration request document in Firestore (STRICTLY NO PASSWORD)
      const docRef = doc(collection(db, 'shopRequests'));
      const requestId = docRef.id;
      const now = new Date().toISOString();

      const request: ShopRequest = {
        requestId,
        uid: realUid,
        ownerName: data.ownerName.trim(),
        shopName: data.shopName.trim(),
        email,
        phone: data.phone.trim(),
        city: data.city.trim(),
        notes: data.notes?.trim() || '',
        status: 'PENDING',
        createdAt: now,
      };

      await setDoc(docRef, request);

      // 3. Immediately sign out the new user so they do not enter an unauthorized active session
      await signOut(auth);

      return request;
    } catch (err: any) {
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (e) {
          // ignore cleanup error
        }
      }
      console.error('Error creating shop request with auth:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Submit a new Shop registration request (Legacy/Fallback)
   */
  async createShopRequest(data: {
    ownerName: string;
    shopName: string;
    email: string;
    phone: string;
    city: string;
    notes?: string;
  }): Promise<ShopRequest> {
    try {
      const docRef = doc(collection(db, 'shopRequests'));
      const requestId = docRef.id;
      const now = new Date().toISOString();

      const request: ShopRequest = {
        requestId,
        ownerName: data.ownerName.trim(),
        shopName: data.shopName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        city: data.city.trim(),
        notes: data.notes?.trim() || '',
        status: 'PENDING',
        createdAt: now,
      };

      await setDoc(docRef, request);
      return request;
    } catch (err: any) {
      console.error('Error creating shop request:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Get a shop request for a specific user (by UID or Email)
   */
  async getShopRequestByUser(uid: string, email?: string | null): Promise<ShopRequest | null> {
    try {
      // Query by UID
      if (uid) {
        const qUid = query(
          collection(db, 'shopRequests'),
          where('uid', '==', uid),
          limit(1)
        );
        const snapUid = await getDocs(qUid);
        if (!snapUid.empty) {
          return snapUid.docs[0].data() as ShopRequest;
        }
      }

      // Query by Email
      if (email) {
        const qEmail = query(
          collection(db, 'shopRequests'),
          where('email', '==', email.trim().toLowerCase()),
          limit(1)
        );
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          return snapEmail.docs[0].data() as ShopRequest;
        }
      }

      return null;
    } catch (err) {
      console.warn('Could not query shop request by user:', err);
      return null;
    }
  },

  /**
   * Super Admin approves a Shop Request using the user's existing Firebase Auth UID.
   * NO new password is created or needed.
   */
  async adminApproveShopRequest(
    request: ShopRequest,
    options?: {
      subscriptionPlan?: 'STARTER' | 'PRO' | 'ENTERPRISE';
      maxEmployees?: number;
    }
  ): Promise<{ shop: Shop; owner: UserProfile }> {
    try {
      if (!request.uid) {
        throw new Error('لا يوجد معرف مستخدم حقيقي (UID) مرتبط بهذا الطلب. تأكد من تقديم الطلب بالنموذج الحديث.');
      }

      const now = new Date().toISOString();
      const shopRef = doc(collection(db, 'shops'));
      const shopId = shopRef.id;
      const ownerUid = request.uid;

      // 1. Prepare Shop Record
      const newShop: Shop = {
        shopId,
        name: request.shopName.trim(),
        shopName: request.shopName.trim(),
        phone: request.phone.trim(),
        city: request.city.trim(),
        address: '',
        crNumber: '',
        taxNumber: '',
        vatNumber: '',
        currency: 'SAR',
        defaultDeliveryDays: 5,
        termsAndConditions: '١. البروفة شرط أساسي قبل الاستلام النهائي.\n٢. المحل غير مسؤول عن الثياب بعد مرور ٣٠ يوماً من تاريخ الجاهزية.',
        status: 'ACTIVE',
        ownerUid,
        ownerEmail: request.email.trim().toLowerCase(),
        ownerName: request.ownerName.trim(),
        maxEmployees: typeof options?.maxEmployees === 'number' && options.maxEmployees >= 0 ? options.maxEmployees : DEFAULT_MAX_EMPLOYEES,
        employeeCount: 0,
        subscriptionPlan: options?.subscriptionPlan || 'STARTER',
        subscriptionStatus: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };

      // 2. Prepare Shop Account Profile Record (Strictly SHOP role)
      const newOwner: UserProfile = {
        userId: ownerUid,
        uid: ownerUid,
        shopId,
        fullName: request.ownerName.trim(),
        email: request.email.trim().toLowerCase(),
        role: 'SHOP',
        phone: request.phone.trim(),
        isActive: true,
        createdAt: now,
        lastLoginAt: now,
      };

      // 3. Persist to Firestore: users, shops, and shops/{shopId}/users
      await setDoc(doc(db, 'users', ownerUid), newOwner);
      await setDoc(shopRef, newShop);
      await setDoc(doc(db, `shops/${shopId}/users`, ownerUid), newOwner);

      // 4. Update the shopRequest status to APPROVED
      await updateDoc(doc(db, 'shopRequests', request.requestId), {
        status: 'APPROVED',
        assignedShopId: shopId,
        assignedOwnerUid: ownerUid,
        reviewedAt: now,
      });

      return { shop: newShop, owner: newOwner };
    } catch (err: any) {
      console.error('Error in adminApproveShopRequest:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Get all shop registration requests (Super Admin only)
   */
  async getShopRequests(): Promise<ShopRequest[]> {
    try {
      const q = query(collection(db, 'shopRequests'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as ShopRequest);
    } catch (err: any) {
      console.error('Error fetching shop requests:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Reject a registration request (Super Admin only)
   */
  async rejectShopRequest(requestId: string, reason?: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'shopRequests', requestId), {
        status: 'REJECTED',
        reviewedAt: now,
        rejectionReason: reason || 'تم رفض الطلب بواسطة إدارة المنصة',
      });
    } catch (err: any) {
      console.error('Error rejecting shop request:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Super Admin checks if current authenticated user is the platform super admin
   */
  async checkIsSuperAdmin(uid: string, email?: string | null): Promise<boolean> {
    try {
      if (email?.toLowerCase() === 'abdallahshareif11al@gmail.com') {
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Super Admin check returned false or error:', err);
      return false;
    }
  },

  /**
   * Send email verification to the currently logged in Super Admin / User
   */
  async sendVerificationEmail(): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('لا يوجد مستخدم مسجل الدخول حالياً');
      }
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      console.error('Error sending email verification:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Reload current user to refresh emailVerified state
   */
  async reloadCurrentUser(): Promise<boolean> {
    try {
      if (!auth.currentUser) return false;
      await auth.currentUser.reload();
      return auth.currentUser.emailVerified;
    } catch (err) {
      console.warn('Error reloading current user:', err);
      return false;
    }
  },

  /**
   * Bootstrap/Ensure Super Admin document exists for platform owner
   */
  async bootstrapPlatformOwner(user: { uid: string; email: string; fullName?: string }): Promise<void> {
    try {
      if (user.email.toLowerCase() === 'abdallahshareif11al@gmail.com') {
        const now = new Date().toISOString();
        const adminDoc: PlatformAdmin = {
          adminId: user.uid,
          email: user.email.toLowerCase(),
          fullName: user.fullName || 'مدير منصة ثوبي',
          role: 'SUPER_ADMIN',
          createdAt: now,
          isActive: true,
        };
        await setDoc(doc(db, 'platform_admins', user.uid), adminDoc);

        const userProfile: UserProfile = {
          userId: user.uid,
          uid: user.uid,
          shopId: '',
          fullName: user.fullName || 'مدير منصة ثوبي (Super Admin)',
          email: user.email.toLowerCase(),
          role: 'SUPER_ADMIN',
          isActive: true,
          createdAt: now,
          lastLoginAt: now,
        };
        await setDoc(doc(db, 'users', user.uid), userProfile);
      }
    } catch (err) {
      console.warn('Bootstrap super admin error (non-fatal):', err);
    }
  },

  /**
   * Super Admin provisions a Shop and Creates the Owner Account
   */
  async adminCreateShopAndOwner(
    shopData: {
      name: string;
      phone: string;
      city: string;
      address?: string;
      crNumber?: string;
      taxNumber?: string;
      currency?: string;
      defaultDeliveryDays?: number;
      maxEmployees?: number;
      subscriptionPlan?: string;
    },
    ownerData: {
      fullName: string;
      email: string;
      phone: string;
      initialPassword: string;
    },
    fromRequestId?: string
  ): Promise<{ shop: Shop; owner: UserProfile }> {
    let tempApp: any = null;
    try {
      const now = new Date().toISOString();
      const shopRef = doc(collection(db, 'shops'));
      const shopId = shopRef.id;

      // 1. Create Owner Auth User via secondary Firebase Auth app so Super Admin is not logged out
      const tempAppName = `SuperAdminSecondaryApp_${Date.now()}_${Math.random()}`;
      tempApp = initSecondaryApp(firebaseConfig, tempAppName);
      const tempAuth = getSecondaryAuth(tempApp);

      const userCred = await createUserWithEmailAndPassword(
        tempAuth,
        ownerData.email.trim(),
        ownerData.initialPassword
      );
      const ownerUid = userCred.user.uid;

      // 2. Prepare Shop Record
      const newShop: Shop = {
        shopId,
        name: shopData.name.trim(),
        shopName: shopData.name.trim(),
        phone: shopData.phone.trim(),
        city: shopData.city.trim(),
        address: shopData.address?.trim() || '',
        crNumber: shopData.crNumber?.trim() || '',
        taxNumber: shopData.taxNumber?.trim() || '',
        vatNumber: shopData.taxNumber?.trim() || '',
        currency: shopData.currency || 'SAR',
        defaultDeliveryDays: shopData.defaultDeliveryDays || 5,
        termsAndConditions: '١. البروفة شرط أساسي قبل الاستلام النهائي.\n٢. المحل غير مسؤول عن الثياب بعد مرور ٣٠ يوماً من تاريخ الجاهزية.',
        status: 'ACTIVE',
        ownerUid,
        ownerEmail: ownerData.email.trim().toLowerCase(),
        ownerName: ownerData.fullName.trim(),
        maxEmployees: typeof shopData.maxEmployees === 'number' && shopData.maxEmployees >= 0 ? shopData.maxEmployees : DEFAULT_MAX_EMPLOYEES,
        employeeCount: 0,
        subscriptionPlan: shopData.subscriptionPlan || 'STARTER',
        subscriptionStatus: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };

      // 3. Prepare Shop Account Profile Record
      const newOwner: UserProfile = {
        userId: ownerUid,
        uid: ownerUid,
        shopId,
        fullName: ownerData.fullName.trim(),
        email: ownerData.email.trim().toLowerCase(),
        role: 'SHOP',
        phone: ownerData.phone.trim(),
        isActive: true,
        createdAt: now,
        lastLoginAt: now,
      };

      // 4. Save to Firestore
      await setDoc(doc(db, 'users', ownerUid), newOwner);
      await setDoc(shopRef, newShop);
      await setDoc(doc(db, `shops/${shopId}/users`, ownerUid), newOwner);

      // 5. If this came from a Shop Request, update the request status to APPROVED
      if (fromRequestId) {
        await updateDoc(doc(db, 'shopRequests', fromRequestId), {
          status: 'APPROVED',
          assignedShopId: shopId,
          assignedOwnerUid: ownerUid,
          reviewedAt: now,
        });
      }

      return { shop: newShop, owner: newOwner };
    } catch (err: any) {
      console.error('Error in adminCreateShopAndOwner:', err);
      throw new Error(parseFirebaseError(err));
    } finally {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch (e) {
          // ignore
        }
      }
    }
  },

  /**
   * Super Admin: Fetch all shops across the platform
   */
  async adminGetAllShops(): Promise<Shop[]> {
    try {
      const snap = await getDocs(collection(db, 'shops'));
      return snap.docs.map((d) => ({
        ...d.data(),
        shopName: d.data().name || d.data().shopName,
      })) as Shop[];
    } catch (err: any) {
      console.error('Error fetching all shops:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Super Admin: Change shop status (ACTIVE, SUSPENDED, CANCELLED)
   */
  async adminUpdateShopStatus(shopId: string, status: ShopStatus): Promise<void> {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'shops', shopId), {
        status,
        updatedAt: now,
      });
    } catch (err: any) {
      console.error('Error updating shop status:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Super Admin: Platform overall statistics
   */
  async adminGetPlatformStats(): Promise<{
    totalShops: number;
    activeShops: number;
    suspendedShops: number;
    pendingRequests: number;
  }> {
    try {
      const shops = await this.adminGetAllShops();
      const requests = await this.getShopRequests();

      const activeShops = shops.filter((s) => s.status === 'ACTIVE').length;
      const suspendedShops = shops.filter((s) => s.status === 'SUSPENDED').length;
      const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;

      return {
        totalShops: shops.length,
        activeShops,
        suspendedShops,
        pendingRequests,
      };
    } catch (err: any) {
      console.error('Error getting platform stats:', err);
      return { totalShops: 0, activeShops: 0, suspendedShops: 0, pendingRequests: 0 };
    }
  },

  // -------------------------------------------------------------
  // 1. SHOP & TENANT MANAGEMENT
  // -------------------------------------------------------------
  
  /**
   * Creates a new Shop in Firestore along with the Owner's user profile
   */
  async createShop(
    shopData: {
      name: string;
      phone: string;
      city: string;
      address?: string;
      crNumber?: string;
      taxNumber?: string;
      currency?: string;
      defaultDeliveryDays?: number;
      termsAndConditions?: string;
    },
    ownerProfile: {
      uid: string;
      email: string;
      fullName: string;
      phone?: string;
    }
  ): Promise<{ shop: Shop; user: UserProfile }> {
    try {
      const shopRef = doc(collection(db, 'shops'));
      const shopId = shopRef.id;
      const now = new Date().toISOString();

      const newShop: Shop = {
        shopId,
        name: shopData.name.trim(),
        shopName: shopData.name.trim(),
        phone: shopData.phone.trim(),
        city: shopData.city.trim(),
        address: shopData.address?.trim() || '',
        crNumber: shopData.crNumber?.trim() || '',
        taxNumber: shopData.taxNumber?.trim() || '',
        vatNumber: shopData.taxNumber?.trim() || '',
        currency: shopData.currency || 'SAR',
        defaultDeliveryDays: shopData.defaultDeliveryDays || 5,
        termsAndConditions: shopData.termsAndConditions || '١. البروفة شرط أساسي قبل الاستلام النهائي.\n٢. المحل غير مسؤول عن الثياب بعد مرور ٣٠ يوماً من تاريخ الجاهزية.',
        status: 'ACTIVE',
        ownerUid: ownerProfile.uid,
        createdAt: now,
        updatedAt: now,
      };

      const newUser: UserProfile = {
        userId: ownerProfile.uid,
        uid: ownerProfile.uid,
        shopId,
        fullName: ownerProfile.fullName.trim(),
        email: ownerProfile.email.trim().toLowerCase(),
        role: 'SHOP',
        phone: ownerProfile.phone?.trim() || shopData.phone.trim(),
        isActive: true,
        createdAt: now,
        lastLoginAt: now,
      };

      // 1. Save global user lookup
      await setDoc(doc(db, 'users', ownerProfile.uid), newUser);

      // 2. Save shop root document
      await setDoc(shopRef, newShop);

      // 3. Save user membership in shop subcollection
      await setDoc(doc(db, `shops/${shopId}/users`, ownerProfile.uid), newUser);

      return { shop: newShop, user: newUser };
    } catch (err: any) {
      console.error('Error creating shop:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Get user profile by Firebase Auth UID from global /users collection
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err: any) {
      console.error('Error getting user profile:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Get specific shop member profile (/shops/{shopId}/users/{uid})
   */
  async getShopMember(shopId: string, uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, `shops/${shopId}/users`, uid));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err: any) {
      console.warn('Error fetching shop member record:', err);
      return null;
    }
  },

  /**
   * Find Shop where user is designated as owner (Strictly by ownerUid)
   */
  async getShopByOwner(uid: string): Promise<Shop | null> {
    try {
      if (!uid) return null;
      const qUid = query(collection(db, 'shops'), where('ownerUid', '==', uid), limit(1));
      const snapUid = await getDocs(qUid);
      if (!snapUid.empty) {
        const d = snapUid.docs[0];
        const data = d.data() as Shop;
        return {
          ...data,
          shopName: data.name || data.shopName,
        };
      }
      return null;
    } catch (err: any) {
      console.warn('Error querying shop by ownerUid:', err);
      return null;
    }
  },

  /**
   * Ensure and self-heal Shop Owner documents in /users/{uid} and /shops/{shopId}/users/{uid}
   * STRICT: Verified exclusively via shop.ownerUid === user.uid
   */
  async ensureShopOwnerProfile(
    shop: Shop,
    user: { uid: string; email?: string | null; fullName?: string | null; phone?: string | null }
  ): Promise<UserProfile> {
    try {
      if (!shop.ownerUid || shop.ownerUid !== user.uid) {
        throw new Error('فشل التحقق الأمني: المستخدم الحالي ليس المالك المعتمد لهذا المتجر (UID mismatch).');
      }

      const now = new Date().toISOString();
      const userEmail = (user.email || shop.ownerEmail || '').trim().toLowerCase();
      const userName = shop.ownerName || user.fullName || userEmail.split('@')[0] || 'مالك المتجر';
      const userPhone = shop.phone || user.phone || '';

      const ownerProfile: UserProfile = {
        userId: user.uid,
        uid: user.uid,
        shopId: shop.shopId,
        fullName: userName,
        email: userEmail,
        phone: userPhone,
        role: 'SHOP',
        isActive: true,
        createdAt: shop.createdAt || now,
        lastLoginAt: now,
      };

      // 1. Sync /users/{uid}
      await setDoc(doc(db, 'users', user.uid), ownerProfile, { merge: true });

      // 2. Sync /shops/{shopId}/users/{uid}
      await setDoc(doc(db, `shops/${shop.shopId}/users`, user.uid), ownerProfile, { merge: true });

      return ownerProfile;
    } catch (err: any) {
      console.error('Error ensuring shop owner profile:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Super Admin utility to resynchronize and fix shop owner role and documents
   * STRICT: Requires explicit ownerUid stored in shop document. Never guesses from email.
   */
  async adminResyncShopOwner(shopId: string): Promise<UserProfile | null> {
    try {
      const shopSnap = await getDoc(doc(db, 'shops', shopId));
      if (!shopSnap.exists()) {
        throw new Error('المتجر غير موجود');
      }
      const shopData = shopSnap.data() as Shop;
      const ownerUid = shopData.ownerUid;

      if (!ownerUid || typeof ownerUid !== 'string' || !ownerUid.trim()) {
        throw new Error('لا يوجد ownerUid مسجل لهذا المتجر في قاعدة البيانات. يجب تعيين مالك معتمد أولاً من قبل مدير المنصة.');
      }

      const ownerEmail = (shopData.ownerEmail || '').trim().toLowerCase();
      const now = new Date().toISOString();
      const ownerProfile: UserProfile = {
        userId: ownerUid,
        uid: ownerUid,
        shopId: shopId,
        fullName: shopData.ownerName || 'مالك المتجر',
        email: ownerEmail,
        phone: shopData.phone || '',
        role: 'SHOP',
        isActive: true,
        createdAt: shopData.createdAt || now,
        lastLoginAt: now,
      };

      await setDoc(doc(db, 'users', ownerUid), ownerProfile, { merge: true });
      await setDoc(doc(db, `shops/${shopId}/users`, ownerUid), ownerProfile, { merge: true });

      return ownerProfile;
    } catch (err: any) {
      console.error('Error in adminResyncShopOwner:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Get Shop details by shopId
   */
  async getShop(shopId: string): Promise<Shop> {
    try {
      const snap = await getDoc(doc(db, 'shops', shopId));
      if (snap.exists()) {
        const data = snap.data() as Shop;
        return {
          ...data,
          shopName: data.name || data.shopName,
        };
      }
      throw new Error('المتجر غير موجود أو تم حذفه');
    } catch (err: any) {
      console.error('Error getting shop:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Realtime subscription to Shop document (status, settings, info)
   */
  subscribeShop(shopId: string, onUpdate: (shop: Shop) => void, onError?: (err: any) => void): Unsubscribe {
    try {
      return onSnapshot(
        doc(db, 'shops', shopId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Shop;
            onUpdate({
              ...data,
              shopName: data.name || data.shopName,
            });
          }
        },
        (err) => {
          console.warn('Realtime shop subscription error:', err);
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      console.warn('Failed to initialize shop subscription:', err);
      if (onError) onError(err);
      return () => {};
    }
  },

  /**
   * Update Shop details (Owner only)
   */
  async updateShop(shopId: string, data: Partial<Shop>): Promise<Shop> {
    try {
      const now = new Date().toISOString();
      const updatedData: any = {
        ...data,
        updatedAt: now,
      };

      // Invariant C: Protected fields cannot be modified via general shop updates
      delete updatedData.maxEmployees;
      delete updatedData.maxCars;
      delete updatedData.maxBranches;
      delete updatedData.employeeCount;
      delete updatedData.subscriptionPlan;
      delete updatedData.subscriptionStatus;
      delete updatedData.trialEndsAt;
      delete updatedData.subscriptionEndsAt;
      delete updatedData.plan;
      delete updatedData.billing;
      delete updatedData.billingCycle;
      delete updatedData.billingPeriod;
      delete updatedData.billingStatus;
      delete updatedData.pricingPlan;
      delete updatedData.limits;
      delete updatedData.status;
      delete updatedData.ownerUid;
      delete updatedData.shopId;
      delete updatedData.createdAt;

      if (data.shopName && !data.name) {
        updatedData.name = data.shopName;
      }
      if (data.name && !data.shopName) {
        updatedData.shopName = data.name;
      }
      if (data.vatNumber && !data.taxNumber) {
        updatedData.taxNumber = data.vatNumber;
      }

      await updateDoc(doc(db, 'shops', shopId), updatedData);
      return await this.getShop(shopId);
    } catch (err: any) {
      console.error('Error updating shop:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  // -------------------------------------------------------------
  // 2. CUSTOMERS
  // -------------------------------------------------------------
  
  subscribeCustomers(shopId: string, onUpdate: (customers: Customer[]) => void, onError?: (err: any) => void): Unsubscribe {
    try {
      const q = query(
        collection(db, `shops/${shopId}/customers`),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Customer);
          onUpdate(list);
        },
        (err) => {
          console.warn('Realtime subscription error on customers:', err);
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      console.warn('Failed to initialize customers subscription:', err);
      if (onError) onError(err);
      return () => {};
    }
  },

  async getCustomers(shopId: string): Promise<Customer[]> {
    try {
      const q = query(
        collection(db, `shops/${shopId}/customers`),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Customer);
    } catch (err: any) {
      console.error('Error getting customers:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async getCustomer(shopId: string, customerId: string): Promise<Customer | null> {
    try {
      const snap = await getDoc(doc(db, `shops/${shopId}/customers`, customerId));
      if (snap.exists()) {
        return snap.data() as Customer;
      }
      return null;
    } catch (err: any) {
      console.error('Error getting customer:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async createCustomer(
    shopId: string,
    data: Omit<Customer, 'customerId' | 'shopId' | 'createdAt' | 'updatedAt' | 'totalOrdersCount' | 'totalSpent'>
  ): Promise<Customer> {
    try {
      const docRef = doc(collection(db, `shops/${shopId}/customers`));
      const customerId = docRef.id;
      const now = new Date().toISOString();

      const newCustomer: Customer = {
        ...data,
        customerId,
        shopId,
        totalOrdersCount: 0,
        totalSpent: 0,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(docRef, newCustomer);
      return newCustomer;
    } catch (err: any) {
      console.error('Error creating customer:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async updateCustomer(
    shopId: string,
    customerId: string,
    data: Partial<Customer>
  ): Promise<Customer> {
    try {
      const now = new Date().toISOString();
      const updated: any = {
        ...data,
        updatedAt: now,
      };

      await updateDoc(doc(db, `shops/${shopId}/customers`, customerId), updated);
      const refreshed = await this.getCustomer(shopId, customerId);
      if (!refreshed) throw new Error('العميل غير موجود');
      return refreshed;
    } catch (err: any) {
      console.error('Error updating customer:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async deleteCustomer(shopId: string, customerId: string): Promise<void> {
    try {
      // 1. Strict Protection: Check if customer has any orders in shops/${shopId}/orders
      const ordersQ = query(
        collection(db, `shops/${shopId}/orders`),
        where('customerId', '==', customerId),
        limit(1)
      );
      const ordersSnap = await getDocs(ordersQ);
      if (!ordersSnap.empty) {
        throw new Error('لا يمكن حذف هذا العميل لوجود طلبات مسجلة باسمه. يمكنك الاحتفاظ بسجله بدلًا من حذفه.');
      }

      // 2. Delete all subcollection measurement records if any exist to avoid orphaned records
      const measurementsRef = collection(db, `shops/${shopId}/customers/${customerId}/measurements`);
      const measurementsSnap = await getDocs(measurementsRef);
      if (!measurementsSnap.empty) {
        const batch = writeBatch(db);
        measurementsSnap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }

      // 3. Delete customer document
      await deleteDoc(doc(db, `shops/${shopId}/customers`, customerId));
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  // -------------------------------------------------------------
  // 3. MEASUREMENTS
  // -------------------------------------------------------------
  
  async getCustomerMeasurements(shopId: string, customerId: string): Promise<MeasurementRecord[]> {
    try {
      const q = query(
        collection(db, `shops/${shopId}/customers/${customerId}/measurements`),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as MeasurementRecord);
    } catch (err: any) {
      console.error('Error getting measurements:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async saveMeasurement(
    shopId: string,
    customerId: string,
    data: {
      measurements: MeasurementData;
      notes?: string;
      measuredBy: string;
      measuredByName: string;
      unit?: 'cm' | 'inch';
    }
  ): Promise<MeasurementRecord> {
    try {
      if (data.measurements) {
        const measValidation = validateMeasurements(data.measurements, data.unit || 'cm');
        if (!measValidation.isValid) {
          const errList = [
            measValidation.missingFields.length > 0 ? `المقاسات المفقودة: ${measValidation.missingFields.join('، ')}` : '',
            measValidation.invalidFields && measValidation.invalidFields.length > 0 ? `قيم غير صحيحة: ${measValidation.invalidFields.join('، ')}` : '',
          ].filter(Boolean).join(' | ');
          throw new Error(`بيانات المقاسات غير صحيحة: ${errList}`);
        }
      }

      const docRef = doc(collection(db, `shops/${shopId}/customers/${customerId}/measurements`));
      const measurementId = docRef.id;
      const now = new Date().toISOString();

      const newRecord: MeasurementRecord = {
        measurementId,
        customerId,
        shopId,
        measuredBy: data.measuredBy,
        measuredByName: data.measuredByName,
        createdAt: now,
        updatedAt: now,
        measurements: data.measurements,
        unit: data.unit || 'cm',
        notes: data.notes || '',
      };

      await setDoc(docRef, newRecord);

      // Update customer latest measurement pointer
      await this.updateCustomer(shopId, customerId, {
        latestMeasurementId: measurementId,
      });

      return newRecord;
    } catch (err: any) {
      console.error('Error saving measurement:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  // -------------------------------------------------------------
  // 4. ORDERS
  // -------------------------------------------------------------
  
  subscribeOrders(shopId: string, onUpdate: (orders: Order[]) => void, onError?: (err: any) => void): Unsubscribe {
    try {
      const q = query(
        collection(db, `shops/${shopId}/orders`),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Order);
          onUpdate(list);
        },
        (err) => {
          console.warn('Realtime subscription error on orders:', err);
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      console.warn('Failed to initialize orders subscription:', err);
      if (onError) onError(err);
      return () => {};
    }
  },

  async getOrders(shopId: string): Promise<Order[]> {
    try {
      const q = query(
        collection(db, `shops/${shopId}/orders`),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Order);
    } catch (err: any) {
      console.error('Error getting orders:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async getOrder(shopId: string, orderId: string): Promise<Order | null> {
    try {
      const snap = await getDoc(doc(db, `shops/${shopId}/orders`, orderId));
      if (snap.exists()) {
        return snap.data() as Order;
      }
      return null;
    } catch (err: any) {
      console.error('Error getting order:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async getCustomerOrders(shopId: string, customerId: string): Promise<Order[]> {
    try {
      try {
        const q = query(
          collection(db, `shops/${shopId}/orders`),
          where('customerId', '==', customerId),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as Order);
      } catch (queryErr: any) {
        if (queryErr?.code === 'failed-precondition' || queryErr?.message?.includes('index')) {
          console.warn('Customer orders index not ready, using memory sort fallback:', queryErr.message);
          const fallbackQ = query(
            collection(db, `shops/${shopId}/orders`),
            where('customerId', '==', customerId)
          );
          const snap = await getDocs(fallbackQ);
          return snap.docs
            .map((d) => d.data() as Order)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }
        throw queryErr;
      }
    } catch (err: any) {
      console.error('Error getting customer orders:', err);
      return [];
    }
  },

  async getLatestOrderForCustomer(shopId: string, customerId: string): Promise<Order | null> {
    try {
      try {
        const q = query(
          collection(db, `shops/${shopId}/orders`),
          where('customerId', '==', customerId),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs[0].data() as Order;
        }
        return null;
      } catch (queryErr: any) {
        if (queryErr?.code === 'failed-precondition' || queryErr?.message?.includes('index')) {
          const fallbackQ = query(
            collection(db, `shops/${shopId}/orders`),
            where('customerId', '==', customerId)
          );
          const snap = await getDocs(fallbackQ);
          if (snap.empty) return null;
          const sorted = snap.docs
            .map((d) => d.data() as Order)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          return sorted[0] || null;
        }
        throw queryErr;
      }
    } catch (err: any) {
      console.warn('Error fetching latest order for customer:', err);
      return null;
    }
  },

  async createOrder(
    shopId: string,
    orderInput: Omit<Order, 'orderId' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'statusHistory'> & {
      initialPaymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'stc_pay' | 'other';
    }
  ): Promise<Order> {
    try {
      const { initialPaymentMethod, ...orderDataToSave } = orderInput;

      // Validate measurements BEFORE creating order
      if (orderInput.measurements) {
        const measValidation = validateMeasurements(orderInput.measurements, orderInput.measurementUnit || 'cm');
        if (!measValidation.isValid) {
          const errList = [
            measValidation.missingFields.length > 0 ? `المقاسات المفقودة: ${measValidation.missingFields.join('، ')}` : '',
            measValidation.invalidFields && measValidation.invalidFields.length > 0 ? `قيم غير صحيحة: ${measValidation.invalidFields.join('، ')}` : '',
          ].filter(Boolean).join(' | ');
          throw new Error(`بيانات المقاسات غير صحيحة: ${errList}`);
        }
      }

      // Validate payment method BEFORE starting transaction if initial deposit is recorded
      const hasInitialPayment = (orderInput.pricing?.paidAmount || 0) > 0;
      if (hasInitialPayment && !initialPaymentMethod) {
        throw new Error('يجب تحديد طريقة الدفع عند تسجيل عربون مدفوع');
      }

      const now = new Date().toISOString();

      // Pre-generate IDs and references
      const orderRef = doc(collection(db, `shops/${shopId}/orders`));
      const orderId = orderRef.id;
      const shortSuffix = Date.now().toString().slice(-4) + Math.floor(10 + Math.random() * 90);
      const orderNumber = `TH-${shortSuffix}`;

      const customerRef = doc(db, `shops/${shopId}/customers/${orderInput.customerId}`);

      const payRef = hasInitialPayment ? doc(collection(db, `shops/${shopId}/payments`)) : null;
      const paymentId = payRef ? payRef.id : '';
      const receiptNumber = `REC-${Math.floor(1000 + Math.random() * 9000)}`;

      const isFinancialLocked = Boolean(hasInitialPayment && initialPaymentMethod && orderInput.pricing && payRef);

      const newOrder: Order = {
        ...orderDataToSave,
        orderId,
        orderNumber,
        shopId,
        financialLocked: isFinancialLocked,
        createdAt: now,
        updatedAt: now,
        statusHistory: [
          {
            status: orderInput.status || 'NEW',
            timestamp: now,
            note: 'تم إنشاء الطلب وتسجيل تفاصيل الثوب والمقاسات',
            updatedBy: orderInput.createdBy,
            updatedByName: orderInput.createdByName,
          },
        ],
      };

      let newPayment: Payment | null = null;
      if (hasInitialPayment && initialPaymentMethod && orderInput.pricing && payRef) {
        newPayment = {
          paymentId,
          shopId,
          orderId,
          orderNumber,
          customerId: orderInput.customerId,
          customerName: orderInput.customerName,
          amount: orderInput.pricing.paidAmount,
          method: initialPaymentMethod,
          receiptNumber,
          createdBy: orderInput.createdBy,
          createdByName: orderInput.createdByName,
          notes: 'دفعة مقدمة / عربون عند فتح الطلب',
          createdAt: now,
        };
      }

      // Execute Firestore Atomic Transaction
      await runTransaction(db, async (transaction) => {
        // Step 1: Read customer document first (mandatory Firestore transaction rule)
        const customerSnap = await transaction.get(customerRef);

        // Step 2: Write Order document
        transaction.set(orderRef, newOrder);

        // Step 3: Write Initial Payment document if paidAmount > 0
        if (payRef && newPayment) {
          transaction.set(payRef, newPayment);
        }

        // Step 4: Update Customer statistics atomically
        if (customerSnap.exists()) {
          const currentCustomerData = customerSnap.data() as Customer;
          const updatedStats = {
            lastOrderAt: now,
            totalOrdersCount: (currentCustomerData.totalOrdersCount || 0) + (orderInput.quantity || 1),
            totalSpent: (currentCustomerData.totalSpent || 0) + (orderInput.pricing?.totalAmount || 0),
            updatedAt: now,
          };
          transaction.update(customerRef, updatedStats);
        }
      });

      return newOrder;
    } catch (err: any) {
      console.error('Error creating order in transaction:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async updateOrderStatus(
    shopId: string,
    orderId: string,
    newStatus: OrderStatus,
    user: { id: string; name: string },
    note?: string
  ): Promise<Order> {
    try {
      const order = await this.getOrder(shopId, orderId);
      if (!order) throw new Error('الطلب غير موجود');

      const now = new Date().toISOString();
      const updatedHistory = [
        ...(order.statusHistory || []),
        {
          status: newStatus,
          timestamp: now,
          note: note || `تحديث حالة الطلب إلى: ${newStatus}`,
          updatedBy: user.id,
          updatedByName: user.name,
        },
      ];

      const updatePayload: any = {
        status: newStatus,
        statusHistory: updatedHistory,
        updatedAt: now,
      };

      if (newStatus === 'DELIVERED') {
        updatePayload.actualDeliveryDate = now;
      }

      await updateDoc(doc(db, `shops/${shopId}/orders`, orderId), updatePayload);
      const refreshed = await this.getOrder(shopId, orderId);
      return refreshed!;
    } catch (err: any) {
      console.error('Error updating order status:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async updateOrder(
    shopId: string,
    orderId: string,
    data: Partial<Order>
  ): Promise<Order> {
    try {
      // Protection: If totalAmount is being modified, ensure it cannot be less than actual net paid
      if (data.pricing && typeof data.pricing.totalAmount === 'number') {
        const orderSnap = await getDoc(doc(db, `shops/${shopId}/orders`, orderId));
        if (orderSnap.exists()) {
          const currentOrder = orderSnap.data() as Order;
          const [paymentsSnap, refundsSnap] = await Promise.all([
            getDocs(query(collection(db, `shops/${shopId}/payments`), where('orderId', '==', orderId))),
            getDocs(query(collection(db, `shops/${shopId}/refunds`), where('orderId', '==', orderId))),
          ]);
          const grossPaid = paymentsSnap.docs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
          const totalRefunded = refundsSnap.docs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
          const netPaidFromDocs = Math.max(0, grossPaid - totalRefunded);
          const actualNetPaid = grossPaid > 0 ? netPaidFromDocs : Number(currentOrder.pricing?.paidAmount || 0);

          if (actualNetPaid > 0 && data.pricing.totalAmount < actualNetPaid) {
            throw new Error(
              `لا يمكن تخفيض إجمالي الطلب (${data.pricing.totalAmount} ر.س) ليكون أقل من المبلغ المسجل ماليًا (${actualNetPaid} ر.س). يرجى معالجة الوضع المالي أولاً أو إرجاع المبلغ الزائد للعميل.`
            );
          }
        }
      }

      // Protection: If measurements are being modified, ensure they are valid
      if (data.measurements) {
        const measValidation = validateMeasurements(data.measurements, data.measurementUnit || 'cm');
        if (!measValidation.isValid) {
          const errList = [
            measValidation.missingFields.length > 0 ? `المقاسات المفقودة: ${measValidation.missingFields.join('، ')}` : '',
            measValidation.invalidFields && measValidation.invalidFields.length > 0 ? `قيم غير صحيحة: ${measValidation.invalidFields.join('، ')}` : '',
          ].filter(Boolean).join(' | ');
          throw new Error(`بيانات المقاسات غير صحيحة: ${errList}`);
        }
      }

      const now = new Date().toISOString();
      const updatedData: any = {
        ...data,
        updatedAt: now,
      };

      await updateDoc(doc(db, `shops/${shopId}/orders`, orderId), updatedData);
      const refreshed = await this.getOrder(shopId, orderId);
      if (!refreshed) throw new Error('الطلب غير موجود');
      return refreshed;
    } catch (err: any) {
      console.error('Error updating order:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async deleteOrder(shopId: string, orderId: string): Promise<void> {
    try {
      const orderRef = doc(db, `shops/${shopId}/orders`, orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;
        if (orderData.financialLocked === true) {
          throw new Error(
            'لا يمكن حذف طلب يحتوي على معاملات مالية مسجلة ومقفلة. يمكنك إلغاء الطلب بدلًا من ذلك.'
          );
        }
        const paid = Number(orderData.pricing?.paidAmount || 0);
        const refunded = Number((orderData.pricing as any)?.refundedAmount || 0);
        if (paid > 0 || refunded > 0) {
          throw new Error(
            'لا يمكن حذف طلب يحتوي على معاملات مالية. يمكنك إلغاء الطلب بدلًا من ذلك.'
          );
        }
      }

      // Check if any payment or refund documents exist in Firestore referencing this orderId
      const [paymentsSnap, refundsSnap] = await Promise.all([
        getDocs(query(collection(db, `shops/${shopId}/payments`), where('orderId', '==', orderId))),
        getDocs(query(collection(db, `shops/${shopId}/refunds`), where('orderId', '==', orderId))),
      ]);

      if (!paymentsSnap.empty || !refundsSnap.empty) {
        throw new Error(
          'لا يمكن حذف طلب يحتوي على معاملات مالية. يمكنك إلغاء الطلب بدلًا من ذلك.'
        );
      }

      await deleteDoc(orderRef);
    } catch (err: any) {
      console.error('Error deleting order:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  // -------------------------------------------------------------
  // 5. PAYMENTS
  // -------------------------------------------------------------
  
  subscribePayments(shopId: string, onUpdate: (payments: Payment[]) => void, onError?: (err: any) => void): Unsubscribe {
    try {
      const q = query(
        collection(db, `shops/${shopId}/payments`),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Payment);
          onUpdate(list);
        },
        (err) => {
          console.warn('Realtime subscription error on payments:', err);
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      console.warn('Failed to initialize payments subscription:', err);
      if (onError) onError(err);
      return () => {};
    }
  },

  async getPayments(shopId: string, orderId?: string): Promise<Payment[]> {
    try {
      if (orderId) {
        try {
          const q = query(
            collection(db, `shops/${shopId}/payments`),
            where('orderId', '==', orderId),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          return snap.docs.map((d) => d.data() as Payment);
        } catch (queryErr: any) {
          if (queryErr?.code === 'failed-precondition' || queryErr?.message?.includes('index')) {
            console.warn('Payments index not ready, using memory sort fallback:', queryErr.message);
            const fallbackQ = query(
              collection(db, `shops/${shopId}/payments`),
              where('orderId', '==', orderId)
            );
            const snap = await getDocs(fallbackQ);
            return snap.docs
              .map((d) => d.data() as Payment)
              .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          }
          throw queryErr;
        }
      }

      const q = query(
        collection(db, `shops/${shopId}/payments`),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Payment);
    } catch (err: any) {
      console.error('Error getting payments:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Atomic, Concurrency-Safe Payment Creation:
   * 1. Validates payment amount > 0.
   * 2. Checks order document atomically via transaction.
   * 3. Prevents overpayments: data.amount cannot exceed remainingAmount.
   * 4. Updates order counters atomically.
   */
  async addPayment(
    shopId: string,
    data: Omit<Payment, 'paymentId' | 'shopId' | 'createdAt'>
  ): Promise<Payment> {
    try {
      if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount <= 0) {
        throw new Error('مبلغ الدفعة يجب أن يكون رقماً موجباً أكبر من الصفر.');
      }

      const orderRef = doc(db, `shops/${shopId}/orders`, data.orderId);
      const payRef = doc(collection(db, `shops/${shopId}/payments`));
      const paymentId = payRef.id;
      const now = new Date().toISOString();
      const receiptNumber = data.receiptNumber || `REC-${Math.floor(1000 + Math.random() * 9000)}`;

      const newPayment: Payment = {
        ...data,
        paymentId,
        shopId,
        receiptNumber,
        createdAt: now,
      };

      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error('طلب التفصيل المرتبط بالدفعة غير موجود في سجلات المتجر.');
        }

        const orderData = orderSnap.data() as Order;

        // 1. Canonical Guard: CANCELLED orders must NEVER accept payments
        if (orderData.status === 'CANCELLED') {
          throw new Error('لا يمكن إضافة دفعة مالية لطلب ملغي.');
        }

        // 2. Fetch linked payment documents and refund documents to compute verified ledger
        const [paysById, refsById] = await Promise.all([
          getDocs(query(collection(db, `shops/${shopId}/payments`), where('orderId', '==', data.orderId))),
          getDocs(query(collection(db, `shops/${shopId}/refunds`), where('orderId', '==', data.orderId))),
        ]);

        const payDocsMap = new Map<string, any>();
        paysById.docs.forEach((d) => payDocsMap.set(d.id, d.data()));

        const refDocsMap = new Map<string, any>();
        refsById.docs.forEach((d) => refDocsMap.set(d.id, d.data()));

        if (orderData.orderNumber && orderData.orderNumber !== data.orderId) {
          const [paysByNum, refsByNum] = await Promise.all([
            getDocs(query(collection(db, `shops/${shopId}/payments`), where('orderNumber', '==', orderData.orderNumber))),
            getDocs(query(collection(db, `shops/${shopId}/refunds`), where('orderNumber', '==', orderData.orderNumber))),
          ]);
          paysByNum.docs.forEach((d) => payDocsMap.set(d.id, d.data()));
          refsByNum.docs.forEach((d) => refDocsMap.set(d.id, d.data()));
        }

        let grossPaid = 0;
        payDocsMap.forEach((pData) => {
          grossPaid += Number(pData?.amount) || 0;
        });

        let grossRefunded = 0;
        refDocsMap.forEach((rData) => {
          grossRefunded += Number(rData?.amount) || 0;
        });

        grossPaid = Math.round(grossPaid * 100) / 100;
        grossRefunded = Math.round(grossRefunded * 100) / 100;
        const totalAmount = Math.round((Number(orderData.pricing?.totalAmount) || 0) * 100) / 100;
        const netPaid = Math.max(0, Math.round((grossPaid - grossRefunded) * 100) / 100);
        const remainingAmount = Math.max(0, Math.round((totalAmount - netPaid) * 100) / 100);

        if (data.amount > remainingAmount) {
          throw new Error(
            `المبلغ المدخل (${data.amount} ر.س) أكبر من المبلغ المتبقي الفعلي على الطلب (${remainingAmount} ر.س).`
          );
        }

        const newGrossPaid = Math.round((grossPaid + data.amount) * 100) / 100;
        const newNetPaid = Math.max(0, Math.round((newGrossPaid - grossRefunded) * 100) / 100);
        const newRemaining = Math.max(0, Math.round((totalAmount - newNetPaid) * 100) / 100);

        // 3. Create the immutable payment document
        transaction.set(payRef, newPayment);

        // 4. Update order pricing counters atomically
        transaction.update(orderRef, {
          'pricing.paidAmount': newGrossPaid,
          'pricing.remainingAmount': newRemaining,
          financialLocked: true,
          updatedAt: now,
        });
      });

      return newPayment;
    } catch (err: any) {
      console.error('Error adding payment:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  // -------------------------------------------------------------
  // 5.1 REFUNDS (ATOMIC & CONCURRENCY-SAFE LEDGER)
  // -------------------------------------------------------------

  subscribeRefunds(shopId: string, onUpdate: (refunds: Refund[]) => void, onError?: (err: any) => void): Unsubscribe {
    try {
      const q = query(
        collection(db, `shops/${shopId}/refunds`),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Refund);
          onUpdate(list);
        },
        (err) => {
          console.warn('Realtime subscription error on refunds:', err);
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      console.warn('Failed to initialize refunds subscription:', err);
      if (onError) onError(err);
      return () => {};
    }
  },

  async getRefunds(shopId: string, orderId?: string): Promise<Refund[]> {
    try {
      if (orderId) {
        try {
          const q = query(
            collection(db, `shops/${shopId}/refunds`),
            where('orderId', '==', orderId),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          return snap.docs.map((d) => d.data() as Refund);
        } catch (queryErr: any) {
          if (queryErr?.code === 'failed-precondition' || queryErr?.message?.includes('index')) {
            console.warn('Refunds index not ready, using memory sort fallback:', queryErr.message);
            const fallbackQ = query(
              collection(db, `shops/${shopId}/refunds`),
              where('orderId', '==', orderId)
            );
            const snap = await getDocs(fallbackQ);
            return snap.docs
              .map((d) => d.data() as Refund)
              .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          }
          throw queryErr;
        }
      }

      const q = query(
        collection(db, `shops/${shopId}/refunds`),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Refund);
    } catch (err: any) {
      console.error('Error getting refunds:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Atomic, Concurrency-Safe Refund Creation:
   * Uses runTransaction when order exists to guarantee that:
   * 1. The order exists and belongs to the shop and customer.
   * 2. refund amount is strictly > 0.
   * 3. Total refunded amount can NEVER exceed paidAmount, even with concurrent submissions.
   * 4. Also supports refunding unlinked/legacy payments safely.
   */
  async addRefund(
    shopId: string,
    data: {
      orderId: string;
      customerId: string;
      customerName: string;
      orderNumber: string;
      amount: number;
      paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'stc_pay';
      reason?: string;
      recordedBy: string;
      recordedByUid: string;
    }
  ): Promise<Refund> {
    try {
      if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount <= 0) {
        throw new Error('مبلغ الاسترداد يجب أن يكون رقماً موجباً أكبر من الصفر.');
      }

      const orderRef = doc(db, `shops/${shopId}/orders`, data.orderId);
      const refundDocRef = doc(collection(db, `shops/${shopId}/refunds`));
      const refundId = refundDocRef.id;
      const now = new Date().toISOString();

      const newRefund: Refund = {
        refundId,
        shopId,
        orderId: data.orderId,
        orderNumber: data.orderNumber || data.orderId,
        customerId: data.customerId || '',
        customerName: data.customerName || 'عميل غير مسجل',
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        reason: data.reason?.trim() || 'إرجاع مبلغ للعميل',
        recordedBy: data.recordedBy,
        recordedByUid: data.recordedByUid,
        createdAt: now,
      };

      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        // Order exists in active records: run atomic transaction on order document
        await runTransaction(db, async (transaction) => {
          const transOrderSnap = await transaction.get(orderRef);
          if (!transOrderSnap.exists()) {
            throw new Error('طلب التفصيل المرتبط بعملية الاسترداد غير موجود في سجلات المتجر.');
          }

          const orderData = transOrderSnap.data() as Order;

          if (orderData.shopId !== shopId) {
            throw new Error('معرف المتجر غير متطابق مع بيانات الطلب.');
          }

          // Fetch linked payment documents and refund documents to compute verified ledger
          const [paysById, refsById] = await Promise.all([
            getDocs(query(collection(db, `shops/${shopId}/payments`), where('orderId', '==', data.orderId))),
            getDocs(query(collection(db, `shops/${shopId}/refunds`), where('orderId', '==', data.orderId))),
          ]);

          const payDocsMap = new Map<string, any>();
          paysById.docs.forEach((d) => payDocsMap.set(d.id, d.data()));

          const refDocsMap = new Map<string, any>();
          refsById.docs.forEach((d) => refDocsMap.set(d.id, d.data()));

          if (orderData.orderNumber && orderData.orderNumber !== data.orderId) {
            const [paysByNum, refsByNum] = await Promise.all([
              getDocs(query(collection(db, `shops/${shopId}/payments`), where('orderNumber', '==', orderData.orderNumber))),
              getDocs(query(collection(db, `shops/${shopId}/refunds`), where('orderNumber', '==', orderData.orderNumber))),
            ]);
            paysByNum.docs.forEach((d) => payDocsMap.set(d.id, d.data()));
            refsByNum.docs.forEach((d) => refDocsMap.set(d.id, d.data()));
          }

          let grossPaid = 0;
          payDocsMap.forEach((pData) => {
            grossPaid += Number(pData?.amount) || 0;
          });

          let grossRefunded = 0;
          refDocsMap.forEach((rData) => {
            grossRefunded += Number(rData?.amount) || 0;
          });

          grossPaid = Math.round(grossPaid * 100) / 100;
          grossRefunded = Math.round(grossRefunded * 100) / 100;
          const maxRefundable = Math.max(0, Math.round((grossPaid - grossRefunded) * 100) / 100);

          if (data.amount > maxRefundable) {
            throw new Error(
              `المبلغ المطلوب استرداده (${data.amount} ر.س) يتجاوز الحد الأقصى المتاح للاسترداد لهذا الطلب (${maxRefundable} ر.س).`
            );
          }

          const newRefundedCounter = Math.round((grossRefunded + data.amount) * 100) / 100;
          const totalAmount = Math.round((Number(orderData.pricing?.totalAmount) || 0) * 100) / 100;
          const newNetPaid = Math.max(0, Math.round((grossPaid - newRefundedCounter) * 100) / 100);
          const newRemaining = orderData.status === 'CANCELLED' ? 0 : Math.max(0, Math.round((totalAmount - newNetPaid) * 100) / 100);

          // 1. Create immutable refund document
          transaction.set(refundDocRef, newRefund);

          // 2. Update order refunded amount and remaining counters atomically
          transaction.update(orderRef, {
            'pricing.refundedAmount': newRefundedCounter,
            'pricing.remainingAmount': newRemaining,
            financialLocked: true,
            updatedAt: now,
          });
        });
      } else {
        // Unlinked / Legacy payment case (e.g. REC-9124 where order document was previously deleted):
        // Verify payments and refunds for this orderId to avoid over-refunding
        const [paymentsSnap, refundsSnap] = await Promise.all([
          getDocs(query(collection(db, `shops/${shopId}/payments`), where('orderId', '==', data.orderId))),
          getDocs(query(collection(db, `shops/${shopId}/refunds`), where('orderId', '==', data.orderId))),
        ]);

        const totalPayments = paymentsSnap.docs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
        const totalRefunds = refundsSnap.docs.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
        const maxRefundable = Math.max(0, totalPayments - totalRefunds);

        if (totalPayments > 0 && data.amount > maxRefundable) {
          throw new Error(
            `المبلغ المطلوب استرداده (${data.amount} ر.س) يتجاوز الرصيد القابل للاسترداد (${maxRefundable} ر.س).`
          );
        }

        await setDoc(refundDocRef, newRefund);
      }

      return newRefund;
    } catch (err: any) {
      console.error('Error in addRefund:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  // -------------------------------------------------------------
  // 6. EMPLOYEE MANAGEMENT (SHOP & SUPER_ADMIN ONLY)
  // -------------------------------------------------------------

  /**
   * Fetch all employees for a specific shop tenant
   */
  async getEmployees(shopId: string): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, `shops/${shopId}/users`),
        where('role', '==', 'EMPLOYEE')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as UserProfile);
    } catch (err: any) {
      console.error('Error getting employees:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Get current shop seat status (active count vs max limit)
   */
  async getShopSeatStatus(shopId: string): Promise<{
    maxEmployees: number;
    employeeCount: number;
    remainingSeats: number;
    isAtLimit: boolean;
  }> {
    const shopRef = doc(db, 'shops', shopId);
    const snap = await getDoc(shopRef);
    if (!snap.exists()) {
      throw new EmployeeDomainError(EMPLOYEE_ERROR_CODES.SHOP_NOT_FOUND, 'المتجر غير موجود');
    }
    const data = snap.data() as Partial<Shop>;
    const maxEmployees = typeof data.maxEmployees === 'number' ? data.maxEmployees : DEFAULT_MAX_EMPLOYEES;
    const employeeCount = typeof data.employeeCount === 'number' ? data.employeeCount : 0;
    const remainingSeats = Math.max(0, maxEmployees - employeeCount);
    return {
      maxEmployees,
      employeeCount,
      remainingSeats,
      isAtLimit: employeeCount >= maxEmployees,
    };
  },

  /**
   * SHOP adds a new employee with Firebase Auth account & Granular 5 Permissions.
   * 1. PRE-CHECK: Fast capacity validation on /shops/{shopId} before creating Auth user.
   * 2. AUTH CREATION: Create Firebase Auth user using secondary app.
   * 3. ATOMIC TRANSACTION: In a single atomic Firestore transaction, verifies capacity,
   *    increments employeeCount, writes lastSeatAction: { action: 'CREATE', employeeUid, timestamp },
   *    and creates the employee documents in /shops/{shopId}/users/{uid} and /users/{uid}.
   * 4. COMPENSATION: If the atomic Firestore transaction fails, deletes the newly created Auth user.
   */
  async addEmployeeWithAuth(
    shopId: string,
    data: {
      fullName: string;
      email: string;
      phone: string;
      permissions?: EmployeePermissions;
      role?: string;
      isActive?: boolean;
    },
    initialPassword: string,
    createdByUid?: string
  ): Promise<UserProfile> {
    // STEP 1 — PRE-FLIGHT CAPACITY CHECK
    const shopRef = doc(db, 'shops', shopId);
    const preCheckSnap = await getDoc(shopRef);
    if (!preCheckSnap.exists()) {
      throw new EmployeeDomainError(EMPLOYEE_ERROR_CODES.SHOP_NOT_FOUND, 'المتجر غير موجود');
    }
    const preShopData = preCheckSnap.data() as Partial<Shop>;
    
    // TASK 5: If employeeCount or maxEmployees is missing, block normal seat modification until reconciled by Super Admin
    if (typeof preShopData.employeeCount !== 'number' || typeof preShopData.maxEmployees !== 'number') {
      throw new EmployeeDomainError(
        EMPLOYEE_ERROR_CODES.RECONCILIATION_REQUIRED,
        'يتطلب المتجر مطابقة وتحديث بيانات مقاعد الموظفين من قبل مسؤول المنصة قبل إضافة موظفين جدد.'
      );
    }

    const preMax = preShopData.maxEmployees;
    const preCount = preShopData.employeeCount;
    if (preCount >= preMax) {
      throw new EmployeeDomainError(
        EMPLOYEE_ERROR_CODES.LIMIT_REACHED,
        `لقد وصلت إلى الحد الأقصى لحسابات الموظفين المسموح بها في اشتراكك (${preMax} موظفين). لا يمكن إضافة موظف جديد.`
      );
    }

    let tempApp: any = null;
    let createdAuthUser: any = null;
    let employeeUid = '';

    // STEP 2 — CREATE FIREBASE AUTH USER via secondary app
    try {
      const tempAppName = `EmployeeSecondaryApp_${Date.now()}_${Math.random()}`;
      tempApp = initSecondaryApp(firebaseConfig, tempAppName);
      const tempAuth = getSecondaryAuth(tempApp);

      const userCred = await createUserWithEmailAndPassword(
        tempAuth,
        data.email.trim(),
        initialPassword
      );
      createdAuthUser = userCred.user;
      employeeUid = createdAuthUser.uid;
    } catch (authErr: any) {
      console.error('Auth user creation failed:', authErr);
      throw new EmployeeDomainError(
        EMPLOYEE_ERROR_CODES.CREATION_FAILED,
        `فشل إنشاء حساب الدخول للموظف: ${parseFirebaseError(authErr)}`
      );
    }

    // STEP 3 — ATOMIC FIRESTORE TRANSACTION
    const now = new Date().toISOString();
    const currentAuthUid = createdByUid || auth.currentUser?.uid || '';
    const permissions: EmployeePermissions = {
      customers: !!data.permissions?.customers,
      measurements: !!data.permissions?.measurements,
      orders: !!data.permissions?.orders,
      payments: !!data.permissions?.payments,
      reports: !!data.permissions?.reports,
    };

    const newEmployee: UserProfile = {
      userId: employeeUid,
      uid: employeeUid,
      shopId,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      role: 'EMPLOYEE',
      permissions,
      isActive: true,
      createdAt: now,
      createdBy: currentAuthUid,
    };

    try {
      await runTransaction(db, async (transaction) => {
        const currentShopSnap = await transaction.get(shopRef);
        if (!currentShopSnap.exists()) {
          throw new EmployeeDomainError(EMPLOYEE_ERROR_CODES.SHOP_NOT_FOUND, 'المتجر غير موجود');
        }

        const currentData = currentShopSnap.data() as Partial<Shop>;
        if (typeof currentData.employeeCount !== 'number' || typeof currentData.maxEmployees !== 'number') {
          throw new EmployeeDomainError(
            EMPLOYEE_ERROR_CODES.RECONCILIATION_REQUIRED,
            'يتطلب المتجر مطابقة وتحديث بيانات مقاعد الموظفين من قبل مسؤول المنصة قبل إضافة موظفين جدد.'
          );
        }

        const maxEmployees = currentData.maxEmployees;
        const currentCount = currentData.employeeCount;

        // Re-verify limit inside the transaction lock
        if (currentCount >= maxEmployees) {
          throw new EmployeeDomainError(
            EMPLOYEE_ERROR_CODES.LIMIT_REACHED,
            `لقد وصلت إلى الحد الأقصى لحسابات الموظفين المسموح بها في اشتراكك (${maxEmployees} موظفين). تعذر إكمال الإضافة.`
          );
        }

        const empShopRef = doc(db, `shops/${shopId}/users`, employeeUid);
        const globalUserRef = doc(db, 'users', employeeUid);

        // Update Shop with new counter AND lastSeatAction marker
        const shopUpdatePayload: any = {
          employeeCount: currentCount + 1,
          lastSeatAction: {
            action: 'CREATE',
            employeeUid: employeeUid,
            timestamp: now,
          },
          updatedAt: now,
        };
        if (typeof currentData.maxEmployees !== 'number') {
          shopUpdatePayload.maxEmployees = DEFAULT_MAX_EMPLOYEES;
        }

        transaction.update(shopRef, shopUpdatePayload);
        transaction.set(empShopRef, newEmployee);
        transaction.set(globalUserRef, newEmployee);
      });

      return newEmployee;
    } catch (firestoreErr: any) {
      console.error('Atomic Firestore transaction failed after Auth creation. Compensating by deleting Auth user...', firestoreErr);

      // COMPENSATION: Delete the newly-created Auth user since Firestore write failed
      let authCleanedUp = false;
      try {
        if (createdAuthUser && typeof createdAuthUser.delete === 'function') {
          await createdAuthUser.delete();
          authCleanedUp = true;
        }
      } catch (authDelErr) {
        console.error('Failed to delete orphaned Auth user in compensation:', authDelErr);
        authCleanedUp = false;
      }

      if (authCleanedUp) {
        if (firestoreErr instanceof EmployeeDomainError) {
          throw firestoreErr;
        }
        throw new EmployeeDomainError(
          EMPLOYEE_ERROR_CODES.CREATION_FAILED,
          `تعذر حفظ بيانات الموظف في قاعدة البيانات وتم إلغاء حساب الدخول بنجاح: ${parseFirebaseError(firestoreErr)}`
        );
      } else {
        throw new EmployeeDomainError(
          EMPLOYEE_ERROR_CODES.CREATION_PARTIAL_FAILURE,
          `فشل حفظ بيانات الموظف في قاعدة البيانات (${data.email}). تعذر حذف حساب الدخول تلقائياً (حساب معلق يتطلب مراجعة الدعم).`,
          {
            email: data.email,
            uid: employeeUid,
            authCleanedUp: false,
            rawError: parseFirebaseError(firestoreErr),
          }
        );
      }
    } finally {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch (e) {}
      }
    }
  },

  /**
   * Update granular permissions for an existing employee
   */
  async updateEmployeePermissions(
    shopId: string,
    userId: string,
    permissions: EmployeePermissions
  ): Promise<void> {
    try {
      const cleanPermissions: EmployeePermissions = {
        customers: !!permissions.customers,
        measurements: !!permissions.measurements,
        orders: !!permissions.orders,
        payments: !!permissions.payments,
        reports: !!permissions.reports,
      };

      await updateDoc(doc(db, `shops/${shopId}/users`, userId), {
        permissions: cleanPermissions,
      });

      await updateDoc(doc(db, 'users', userId), {
        permissions: cleanPermissions,
      });
    } catch (err: any) {
      console.error('Error updating employee permissions:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Toggle employee active status (isActive: true / false) with atomic seat count handling.
   * INVARIANT G: Disabling an employee frees a seat (count - 1). Prevents double decrement.
   * INVARIANT H: Reactivating an employee requires an available seat (count < maxEmployees).
   */
  async toggleEmployeeStatus(
    shopId: string,
    userId: string,
    nextStatus: boolean
  ): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const shopRef = doc(db, 'shops', shopId);
        const empShopRef = doc(db, `shops/${shopId}/users`, userId);

        const [shopSnap, empSnap] = await Promise.all([
          transaction.get(shopRef),
          transaction.get(empShopRef),
        ]);

        if (!shopSnap.exists()) {
          throw new EmployeeDomainError(EMPLOYEE_ERROR_CODES.SHOP_NOT_FOUND, 'المتجر غير موجود');
        }
        if (!empSnap.exists()) {
          throw new EmployeeDomainError(EMPLOYEE_ERROR_CODES.CREATION_FAILED, 'سجل الموظف غير موجود في المتجر');
        }

        const shopData = shopSnap.data() as Partial<Shop>;
        const empData = empSnap.data() as Partial<UserProfile>;
        
        // TASK 5: If employeeCount or maxEmployees is missing, block seat changes until reconciled by Super Admin
        if (typeof shopData.employeeCount !== 'number' || typeof shopData.maxEmployees !== 'number') {
          throw new EmployeeDomainError(
            EMPLOYEE_ERROR_CODES.RECONCILIATION_REQUIRED,
            'يتطلب المتجر مطابقة وتحديث بيانات مقاعد الموظفين من قبل مسؤول المنصة قبل تعديل حالة الموظف.'
          );
        }

        const maxEmployees = shopData.maxEmployees;
        const currentCount = shopData.employeeCount;
        const currentIsActive = empData.isActive !== false; // Default true if missing

        const now = new Date().toISOString();
        if (nextStatus === false) {
          // Deactivating
          if (!currentIsActive) {
            // Already inactive: do NOT decrement! Prevent double decrement.
            return;
          }
          const newCount = Math.max(0, currentCount - 1);
          transaction.update(empShopRef, { isActive: false, updatedAt: now });
          transaction.update(shopRef, {
            employeeCount: newCount,
            lastSeatAction: {
              action: 'DEACTIVATE',
              employeeUid: userId,
              timestamp: now,
            },
            updatedAt: now,
          });
        } else {
          // Reactivating
          if (currentIsActive) {
            // Already active
            return;
          }
          if (currentCount >= maxEmployees) {
            throw new EmployeeDomainError(
              EMPLOYEE_ERROR_CODES.LIMIT_REACHED,
              `لا يمكن إعادة تفعيل حساب الموظف، لأن المتجر وصل للحد الأقصى لحسابات الموظفين النشطة (${maxEmployees} موظفين). يرجى ترقية الاشتراك أو تعطيل موظف نشط أولاً.`
            );
          }
          const newCount = currentCount + 1;
          transaction.update(empShopRef, { isActive: true, updatedAt: now });
          transaction.update(shopRef, {
            employeeCount: newCount,
            lastSeatAction: {
              action: 'REACTIVATE',
              employeeUid: userId,
              timestamp: now,
            },
            updatedAt: now,
          });
        }
      });

      // Synchronize global lookup /users/{userId}
      try {
        await updateDoc(doc(db, 'users', userId), { isActive: nextStatus, updatedAt: new Date().toISOString() });
      } catch (syncErr) {
        console.warn('Could not sync isActive to global users collection:', syncErr);
      }
    } catch (err: any) {
      console.error('Error updating employee active status:', err);
      if (err instanceof EmployeeDomainError) {
        throw err;
      }
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Delete employee document from shop membership and revoke access.
   * If the employee was active, decrements employeeCount exactly once.
   * If the employee was already inactive, does NOT decrement employeeCount.
   */
  async deleteEmployeeDoc(shopId: string, userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await runTransaction(db, async (transaction) => {
        const shopRef = doc(db, 'shops', shopId);
        const empShopRef = doc(db, `shops/${shopId}/users`, userId);

        const [shopSnap, empSnap] = await Promise.all([
          transaction.get(shopRef),
          transaction.get(empShopRef),
        ]);

        if (!empSnap.exists()) {
          return;
        }

        const empData = empSnap.data() as Partial<UserProfile>;
        const wasActive = empData.isActive !== false;

        if (shopSnap.exists() && wasActive) {
          const shopData = shopSnap.data() as Partial<Shop>;
          if (typeof shopData.employeeCount !== 'number' || typeof shopData.maxEmployees !== 'number') {
            throw new EmployeeDomainError(
              EMPLOYEE_ERROR_CODES.RECONCILIATION_REQUIRED,
              'يتطلب المتجر مطابقة وتحديث بيانات مقاعد الموظفين من قبل مسؤول المنصة قبل حذف موظف نشط.'
            );
          }
          const currentCount = shopData.employeeCount;
          const newCount = Math.max(0, currentCount - 1);
          transaction.update(shopRef, {
            employeeCount: newCount,
            lastSeatAction: {
              action: 'DELETE',
              employeeUid: userId,
              timestamp: now,
            },
            updatedAt: now,
          });
        }

        // Delete from shop subcollection
        transaction.delete(empShopRef);
      });

      // Remove from global users lookup
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (delErr) {
        console.warn('Could not delete global user doc:', delErr);
      }
    } catch (err: any) {
      console.error('Error deleting employee document:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async deleteEmployee(shopId: string, userId: string): Promise<void> {
    return this.deleteEmployeeDoc(shopId, userId);
  },

  /**
   * Reconciles the authoritative employee count against actual active employee docs.
   * INVARIANT I: Legacy shops with missing fields are initialized (maxEmployees: 3 if missing).
   * Over-limit legacy shops are reconciled to their real active count without breaking existing users.
   */
  async reconcileShopEmployeeCount(shopId: string): Promise<{
    shopId: string;
    actualActiveCount: number;
    maxEmployees: number;
    previousCount: number;
  }> {
    try {
      // 1. Query all employee docs in shop
      const staffRef = collection(db, `shops/${shopId}/users`);
      const q = query(staffRef, where('role', '==', 'EMPLOYEE'));
      const snap = await getDocs(q);

      // Count active employees (isActive === true or undefined)
      let actualActiveCount = 0;
      snap.forEach((d) => {
        const data = d.data() as Partial<UserProfile>;
        if (data.isActive !== false) {
          actualActiveCount++;
        }
      });

      // 2. Read shop doc
      const shopRef = doc(db, 'shops', shopId);
      const shopSnap = await getDoc(shopRef);
      if (!shopSnap.exists()) {
        throw new EmployeeDomainError(EMPLOYEE_ERROR_CODES.SHOP_NOT_FOUND, 'المتجر غير موجود');
      }

      const shopData = shopSnap.data() as Partial<Shop>;
      const previousCount = typeof shopData.employeeCount === 'number' ? shopData.employeeCount : 0;
      const existingMax = typeof shopData.maxEmployees === 'number' ? shopData.maxEmployees : undefined;
      const maxEmployees = existingMax !== undefined ? existingMax : DEFAULT_MAX_EMPLOYEES;

      const updatePayload: any = {
        employeeCount: actualActiveCount,
        updatedAt: new Date().toISOString(),
      };

      // Only write maxEmployees if currently missing! Never overwrite existing explicit maxEmployees
      if (existingMax === undefined) {
        updatePayload.maxEmployees = DEFAULT_MAX_EMPLOYEES;
      }

      await updateDoc(shopRef, updatePayload);

      return {
        shopId,
        actualActiveCount,
        maxEmployees,
        previousCount,
      };
    } catch (err: any) {
      console.error('Error reconciling shop employee count:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Super Admin modifies maxEmployees seat limit for a shop.
   * INVARIANT D: Only SUPER_ADMIN is allowed.
   */
  async adminUpdateShopSeatLimit(shopId: string, maxEmployees: number): Promise<Shop> {
    try {
      if (!Number.isInteger(maxEmployees) || maxEmployees < 0 || maxEmployees > MAX_SAFE_EMPLOYEES) {
        throw new EmployeeDomainError(
          EMPLOYEE_ERROR_CODES.INVALID_SEAT_LIMIT,
          `الحد الأقصى للموظفين يجب أن يكون رقماً صحيحاً بين 0 و ${MAX_SAFE_EMPLOYEES}`
        );
      }

      const shopRef = doc(db, 'shops', shopId);
      await updateDoc(shopRef, {
        maxEmployees,
        updatedAt: new Date().toISOString(),
      });

      return await this.getShop(shopId);
    } catch (err: any) {
      console.error('Error in adminUpdateShopSeatLimit:', err);
      if (err instanceof EmployeeDomainError) throw err;
      throw new Error(parseFirebaseError(err));
    }
  },
};

