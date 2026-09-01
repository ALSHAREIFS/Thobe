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
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
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
} from '../types';

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
   * Submit a new Shop registration request (Public)
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
   * Update Shop details (Owner only)
   */
  async updateShop(shopId: string, data: Partial<Shop>): Promise<Shop> {
    try {
      const now = new Date().toISOString();
      const updatedData: any = {
        ...data,
        updatedAt: now,
      };
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
      // 1. Delete all subcollection measurement records if any exist to avoid orphaned records
      const measurementsRef = collection(db, `shops/${shopId}/customers/${customerId}/measurements`);
      const measurementsSnap = await getDocs(measurementsRef);
      if (!measurementsSnap.empty) {
        const batch = writeBatch(db);
        measurementsSnap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }

      // 2. Delete customer document
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
      const q = query(
        collection(db, `shops/${shopId}/orders`),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Order);
    } catch (err: any) {
      console.error('Error getting customer orders:', err);
      return [];
    }
  },

  async getLatestOrderForCustomer(shopId: string, customerId: string): Promise<Order | null> {
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

      const newOrder: Order = {
        ...orderDataToSave,
        orderId,
        orderNumber,
        shopId,
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
        if ((orderData.pricing?.paidAmount || 0) > 0) {
          throw new Error(
            `لا يمكن حذف طلب يحتوي على دفعات مسجلة (${orderData.pricing?.paidAmount || 0} ر.س). يرجى تغيير حالة الطلب إلى ملغي (CANCELLED) بدلاً من حذفه للحفاظ على سلامة القيود المالية.`
          );
        }
      }

      // Ensure no orphan payment documents exist in Firestore referencing this orderId
      const paymentsQuery = query(
        collection(db, `shops/${shopId}/payments`),
        where('orderId', '==', orderId)
      );
      const paymentsSnap = await getDocs(paymentsQuery);
      if (!paymentsSnap.empty) {
        throw new Error(
          'لا يمكن حذف هذا الطلب لوجود سندات قبض مسجلة له في قاعدة البيانات. يرجى إلغاء الطلب بدلاً من حذفه لمنع حدوث سندات يتيمة.'
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
      let q = query(
        collection(db, `shops/${shopId}/payments`),
        orderBy('createdAt', 'desc')
      );
      if (orderId) {
        q = query(
          collection(db, `shops/${shopId}/payments`),
          where('orderId', '==', orderId),
          orderBy('createdAt', 'desc')
        );
      }
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Payment);
    } catch (err: any) {
      console.error('Error getting payments:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async addPayment(
    shopId: string,
    data: Omit<Payment, 'paymentId' | 'shopId' | 'createdAt'>
  ): Promise<Payment> {
    try {
      const payRef = doc(collection(db, `shops/${shopId}/payments`));
      const paymentId = payRef.id;
      const now = new Date().toISOString();

      const newPayment: Payment = {
        ...data,
        paymentId,
        shopId,
        receiptNumber: data.receiptNumber || `REC-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: now,
      };

      await setDoc(payRef, newPayment);

      // Update order paid and remaining amounts
      const order = await this.getOrder(shopId, data.orderId);
      if (order && order.pricing) {
        const newPaid = (order.pricing.paidAmount || 0) + data.amount;
        const newRemaining = Math.max(0, order.pricing.totalAmount - newPaid);
        await this.updateOrder(shopId, data.orderId, {
          pricing: {
            ...order.pricing,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
          },
        });
      }

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
      let q = query(
        collection(db, `shops/${shopId}/refunds`),
        orderBy('createdAt', 'desc')
      );
      if (orderId) {
        q = query(
          collection(db, `shops/${shopId}/refunds`),
          where('orderId', '==', orderId),
          orderBy('createdAt', 'desc')
        );
      }
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Refund);
    } catch (err: any) {
      console.error('Error getting refunds:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Atomic, Concurrency-Safe Refund Creation:
   * Uses runTransaction on the Order document to guarantee that:
   * 1. The order exists and belongs to the shop and customer.
   * 2. refund amount is strictly > 0.
   * 3. Total refunded amount can NEVER exceed paidAmount, even with concurrent submissions.
   * 4. Double submission or race conditions are safely rejected.
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

      let createdRefund: Refund | null = null;

      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error('طلب التفصيل المرتبط بعملية الاسترداد غير موجود في سجلات المتجر.');
        }

        const orderData = orderSnap.data() as Order;

        // Security & Integrity checks
        if (orderData.shopId !== shopId) {
          throw new Error('معرف المتجر غير متطابق مع بيانات الطلب.');
        }
        if (orderData.customerId !== data.customerId) {
          throw new Error('بيانات العميل غير متطابقة مع بيانات الطلب.');
        }
        if (orderData.orderId !== data.orderId) {
          throw new Error('رقم معرف الطلب غير متطابق.');
        }

        const paidAmount = Number(orderData.pricing?.paidAmount || 0);
        const currentRefundedAmount = Number((orderData.pricing as any)?.refundedAmount || 0);
        const maxRefundable = Math.max(0, paidAmount - currentRefundedAmount);

        if (data.amount > maxRefundable) {
          throw new Error(
            `المبلغ المطلوب استرداده (${data.amount} ر.س) يتجاوز الحد الأقصى المتاح للاسترداد لهذا الطلب (${maxRefundable} ر.س).`
          );
        }

        const newRefundedCounter = currentRefundedAmount + data.amount;

        const newRefund: Refund = {
          refundId,
          shopId,
          orderId: data.orderId,
          orderNumber: data.orderNumber || orderData.orderNumber,
          customerId: data.customerId,
          customerName: data.customerName || orderData.customerName,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          reason: data.reason?.trim() || 'إلغاء الطلب واسترجاع المدفوعات للعميل',
          recordedBy: data.recordedBy,
          recordedByUid: data.recordedByUid,
          createdAt: now,
        };

        // 1. Create the immutable refund ledger record
        transaction.set(refundDocRef, newRefund);

        // 2. Update the transactional concurrency counter on the order document
        transaction.update(orderRef, {
          'pricing.refundedAmount': newRefundedCounter,
          updatedAt: now,
        });

        createdRefund = newRefund;
      });

      if (!createdRefund) {
        throw new Error('تعذر إتمام عملية الاسترداد بنجاح.');
      }

      return createdRefund;
    } catch (err: any) {
      console.error('Error in addRefund transaction:', err);
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
   * SHOP adds a new employee with Firebase Auth account & Granular 5 Permissions.
   * Handles Partial Failure by attempting Auth user deletion / rollback.
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
    let tempApp: any = null;
    let createdAuthUser: any = null;

    try {
      const now = new Date().toISOString();
      const currentAuthUid = createdByUid || auth.currentUser?.uid || '';
      const permissions: EmployeePermissions = {
        customers: !!data.permissions?.customers,
        measurements: !!data.permissions?.measurements,
        orders: !!data.permissions?.orders,
        payments: !!data.permissions?.payments,
        reports: !!data.permissions?.reports,
      };

      const tempAppName = `EmployeeSecondaryApp_${Date.now()}_${Math.random()}`;
      tempApp = initSecondaryApp(firebaseConfig, tempAppName);
      const tempAuth = getSecondaryAuth(tempApp);

      // 1. Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(
        tempAuth,
        data.email.trim(),
        initialPassword
      );
      createdAuthUser = userCred.user;
      const employeeUid = createdAuthUser.uid;

      // 2. Build strict employee profile
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

      // 3. Write simultaneously to /users/{uid} and /shops/{shopId}/users/{uid}
      try {
        await setDoc(doc(db, 'users', employeeUid), newEmployee);
        await setDoc(doc(db, `shops/${shopId}/users`, employeeUid), newEmployee);
      } catch (firestoreErr: any) {
        console.error('Firestore write failed after Auth creation. Initiating rollback...', firestoreErr);
        
        // Attempt Cleanup / Rollback of the orphaned Auth account
        let rollbackSucceeded = false;
        try {
          if (createdAuthUser && typeof createdAuthUser.delete === 'function') {
            await createdAuthUser.delete();
            rollbackSucceeded = true;
          }
        } catch (cleanupErr) {
          console.error('Failed to cleanup orphaned Auth user during rollback:', cleanupErr);
          rollbackSucceeded = false;
        }

        if (rollbackSucceeded) {
          throw new Error(`تعذر إكمال تسجيل الموظف في قاعدة البيانات وتم التراجع عن إنشاء الحساب: ${parseFirebaseError(firestoreErr)}`);
        } else {
          throw new Error(`فشل تسجيل بيانات الموظف في قاعدة البيانات، وتعذر التراجع عن حساب الدخول (${data.email}). يرجى مراجعة الدعم أو المحاولة ببريد آخر.`);
        }
      }

      return newEmployee;
    } catch (err: any) {
      console.error('Error adding employee:', err);
      throw new Error(err.message || parseFirebaseError(err));
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
   * Toggle employee active status (isActive: true / false)
   */
  async toggleEmployeeStatus(
    shopId: string,
    userId: string,
    isActive: boolean
  ): Promise<void> {
    try {
      await updateDoc(doc(db, `shops/${shopId}/users`, userId), {
        isActive,
      });

      await updateDoc(doc(db, 'users', userId), {
        isActive,
      });
    } catch (err: any) {
      console.error('Error updating employee active status:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  /**
   * Delete employee document from shop membership and revoke access (V1)
   */
  async deleteEmployeeDoc(shopId: string, userId: string): Promise<void> {
    try {
      // First deactivate
      await this.toggleEmployeeStatus(shopId, userId, false);

      // Remove from shop subcollection
      await deleteDoc(doc(db, `shops/${shopId}/users`, userId));

      // Remove from global users lookup
      await deleteDoc(doc(db, 'users', userId));
    } catch (err: any) {
      console.error('Error deleting employee document:', err);
      throw new Error(parseFirebaseError(err));
    }
  },

  async deleteEmployee(shopId: string, userId: string): Promise<void> {
    return this.deleteEmployeeDoc(shopId, userId);
  },
};

