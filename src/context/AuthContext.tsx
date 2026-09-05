import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { TailorService, parseFirebaseError } from '../services/firebaseService';
import { UserProfile, UserRole, Shop, ShopStatus, ShopRequest, EmployeePermissions } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  currentShop: Shop | null;
  firebaseUser: User | null;
  loading: boolean;
  authError: string | null;
  role: UserRole | null;
  isSuperAdmin: boolean;
  isShop: boolean;
  isEmployee: boolean;
  isShopSuspended: boolean;
  canEditSettings: boolean;
  canDeleteRecords: boolean;
  hasPermission: (permission: keyof EmployeePermissions) => boolean;
  
  // Platform View toggle (for Super Admin)
  platformViewMode: 'platform' | 'shop';
  setPlatformViewMode: (mode: 'platform' | 'shop') => void;

  // Auth actions
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadAuthUser: () => Promise<boolean>;
  submitRegistrationRequest: (data: {
    ownerName: string;
    shopName: string;
    email: string;
    phone: string;
    city: string;
    notes?: string;
  }) => Promise<ShopRequest>;
  updateShopSettings: (data: Partial<Shop>) => Promise<Shop>;
  refreshProfile: () => Promise<void>;
  clearAuthError: () => void;
  selectShopForAdmin: (shop: Shop | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [platformViewMode, setPlatformViewMode] = useState<'platform' | 'shop'>('platform');

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const loadUserData = useCallback(async (user: User) => {
    try {
      setLoading(true);
      setAuthError(null);

      // 1. Check if user is Super Admin
      const isSuper = await TailorService.checkIsSuperAdmin(user.uid, user.email);
      setIsSuperAdmin(isSuper);

      if (isSuper) {
        // Bootstrap platform admin records if needed
        await TailorService.bootstrapPlatformOwner({
          uid: user.uid,
          email: user.email || 'abdallahshareif11al@gmail.com',
          fullName: user.displayName || 'مدير منصة ثوبي',
        });
        setPlatformViewMode('platform');
      }

      // 2. Resolve User Profile & Shop Ownership
      // A. Check if user is the designated owner of a shop (Strictly by ownerUid)
      let resolvedShop: Shop | null = null;
      let resolvedProfile: UserProfile | null = null;

      try {
        resolvedShop = await TailorService.getShopByOwner(user.uid);
      } catch (err) {
        console.warn('Could not check shop by ownerUid:', err);
      }

      // B. Fetch user document from /users/{uid}
      const rawProfile = await TailorService.getUserProfile(user.uid);

      // C. If user is owner of a shop (Strictly ownerUid === user.uid):
      if (resolvedShop && resolvedShop.ownerUid === user.uid) {
        // The user IS the verified Shop Owner
        resolvedProfile = await TailorService.ensureShopOwnerProfile(resolvedShop, {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || rawProfile?.fullName,
          phone: rawProfile?.phone,
        });
        setCurrentUser(resolvedProfile);
        setCurrentShop(resolvedShop);
        return;
      }

      // D. If not identified as owner via getShopByOwner, check if rawProfile has shopId:
      if (rawProfile?.shopId) {
        try {
          const shop = await TailorService.getShop(rawProfile.shopId);
          // Check if this shop designates this user as owner strictly by ownerUid
          if (shop && shop.ownerUid === user.uid) {
            resolvedProfile = await TailorService.ensureShopOwnerProfile(shop, {
              uid: user.uid,
              email: user.email,
              fullName: rawProfile.fullName || user.displayName,
              phone: rawProfile.phone,
            });
            setCurrentUser(resolvedProfile);
            setCurrentShop(shop);
            return;
          }

          // Otherwise, user is an employee in this shop
          // Verify membership record in /shops/{shopId}/users/{uid}
          const memberDoc = await TailorService.getShopMember(rawProfile.shopId, user.uid);
          if (memberDoc && memberDoc.isActive) {
            resolvedProfile = {
              ...rawProfile,
              ...memberDoc,
              role: 'EMPLOYEE', // strictly EMPLOYEE
            };
            setCurrentUser(resolvedProfile);
            setCurrentShop(shop);
            return;
          } else {
            console.warn('User has inactive or missing employee membership document');
            setCurrentUser(rawProfile);
            setCurrentShop(shop);
            return;
          }
        } catch (shopErr: any) {
          console.warn('Could not load shop for member:', shopErr);
        }
      }

      // E. Fallback for Super Admin or basic user
      if (isSuper) {
        const superProfile: UserProfile = {
          userId: user.uid,
          uid: user.uid,
          shopId: '',
          fullName: user.displayName || 'مدير منصة ثوبي (Super Admin)',
          email: user.email || '',
          role: 'SUPER_ADMIN',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(superProfile);
        setCurrentShop(null);
      } else if (rawProfile) {
        setCurrentUser(rawProfile);
        setCurrentShop(null);
      } else {
        setCurrentUser(null);
        setCurrentShop(null);
      }
    } catch (err: any) {
      console.error('Error in loadUserData:', err);
      setAuthError(parseFirebaseError(err));
      setCurrentUser(null);
      setCurrentShop(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await loadUserData(user);
      } else {
        setCurrentUser(null);
        setCurrentShop(null);
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadUserData]);

  // Real-time shop status & info listener for active tenants
  useEffect(() => {
    const shopId = currentUser?.shopId;
    if (!shopId) return;

    const unsubscribeShop = TailorService.subscribeShop(shopId, (updatedShop) => {
      setCurrentShop(updatedShop);
    });

    return () => unsubscribeShop();
  }, [currentUser?.shopId]);

  const signIn = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      setLoading(false);
      throw new Error(msg);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setCurrentShop(null);
      setFirebaseUser(null);
      setIsSuperAdmin(false);
      setAuthError(null);
      setPlatformViewMode('platform');
    } catch (err: any) {
      setAuthError(parseFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const sendVerificationEmail = async () => {
    try {
      setAuthError(null);
      await TailorService.sendVerificationEmail();
    } catch (err: any) {
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const reloadAuthUser = async (): Promise<boolean> => {
    try {
      const verified = await TailorService.reloadCurrentUser();
      if (auth.currentUser) {
        setFirebaseUser({ ...auth.currentUser });
        await loadUserData(auth.currentUser);
      }
      return verified;
    } catch (err: any) {
      console.warn('Error reloading auth user:', err);
      return false;
    }
  };

  const submitRegistrationRequest = async (data: {
    ownerName: string;
    shopName: string;
    email: string;
    phone: string;
    city: string;
    notes?: string;
  }) => {
    try {
      setAuthError(null);
      const req = await TailorService.createShopRequest(data);
      return req;
    } catch (err: any) {
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const updateShopSettings = async (data: Partial<Shop>): Promise<Shop> => {
    if (!currentShop) throw new Error('لا يوجد متجر محدد');
    try {
      const updated = await TailorService.updateShop(currentShop.shopId, data);
      setCurrentShop(updated);
      return updated;
    } catch (err: any) {
      const msg = parseFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const selectShopForAdmin = (shop: Shop | null) => {
    if (isSuperAdmin) {
      setCurrentShop(shop);
      if (shop) {
        setPlatformViewMode('shop');
      }
    }
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      await loadUserData(firebaseUser);
    }
  };

  const role = isSuperAdmin ? 'SUPER_ADMIN' : currentUser?.role || null;
  const isShop = role === 'SHOP';
  const isEmployee = role === 'EMPLOYEE';
  const isShopSuspended = currentShop ? currentShop.status === 'SUSPENDED' : false;

  const hasPermission = useCallback((permission: keyof EmployeePermissions): boolean => {
    if (isSuperAdmin || isShop) return true;
    if (isEmployee && currentUser?.isActive) {
      return !!currentUser?.permissions?.[permission];
    }
    return false;
  }, [isSuperAdmin, isShop, isEmployee, currentUser]);

  const value: AuthContextType = {
    currentUser,
    currentShop,
    firebaseUser,
    loading,
    authError,
    role,
    isSuperAdmin,
    isShop,
    isEmployee,
    isShopSuspended,
    canEditSettings: isSuperAdmin || isShop,
    canDeleteRecords: isSuperAdmin || isShop,
    hasPermission,
    platformViewMode,
    setPlatformViewMode,
    signIn,
    signOut,
    sendPasswordReset,
    sendVerificationEmail,
    reloadAuthUser,
    submitRegistrationRequest,
    updateShopSettings,
    refreshProfile,
    clearAuthError,
    selectShopForAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
