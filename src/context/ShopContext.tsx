import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Customer, Order, OrderStatus, Payment, Refund, Shop, UserProfile, EmployeePermissions } from '../types';
import { TailorService } from '../services/firebaseService';
import { useAuth } from './AuthContext';

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ShopContextType {
  currentShop: Shop | null;
  currentUser: UserProfile | null;
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  refunds: Refund[];
  employees: UserProfile[];
  loading: boolean;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  refreshData: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
  
  // Navigation & Modals State
  activeTab: 'dashboard' | 'orders' | 'new_order' | 'customers' | 'measurements' | 'payments' | 'reports' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'orders' | 'new_order' | 'customers' | 'measurements' | 'payments' | 'reports' | 'settings') => void;
  
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  
  orderToPrint: Order | null;
  setOrderToPrint: (order: Order | null) => void;
  
  repeatOrderTemplate: Order | null;
  setRepeatOrderTemplate: (order: Order | null) => void;

  editingOrder: Order | null;
  setEditingOrder: (order: Order | null) => void;

  // Actions
  createOrder: (data: Parameters<typeof TailorService.createOrder>[1]) => Promise<Order>;
  updateOrder: (orderId: string, data: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<Order>;
  createCustomer: (data: Parameters<typeof TailorService.createCustomer>[1]) => Promise<Customer>;
  updateCustomer: (customerId: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (customerId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addPayment: (data: Parameters<typeof TailorService.addPayment>[1]) => Promise<Payment>;
  addRefund: (data: Parameters<typeof TailorService.addRefund>[1]) => Promise<Refund>;
  startRepeatOrder: (order: Order) => void;
  startEditOrder: (order: Order) => void;

  // Employee Actions
  addEmployee: (
    data: {
      fullName: string;
      email: string;
      phone: string;
      permissions: EmployeePermissions;
    },
    password: string
  ) => Promise<UserProfile>;
  updateEmployeePermissions: (userId: string, permissions: EmployeePermissions) => Promise<void>;
  toggleEmployeeStatus: (userId: string, isActive: boolean) => Promise<void>;
  deleteEmployee: (userId: string) => Promise<void>;
}

export const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentShop, currentUser, isSuperAdmin, isShop, refreshProfile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'new_order' | 'customers' | 'measurements' | 'payments' | 'reports' | 'settings'>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [repeatOrderTemplate, setRepeatOrderTemplate] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast_' + Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchEmployeesList = useCallback(async () => {
    if (!currentShop?.shopId) {
      setEmployees([]);
      return;
    }
    // Only SHOP and SuperAdmin can fetch employee list
    if (isSuperAdmin || isShop) {
      try {
        const empList = await TailorService.getEmployees(currentShop.shopId);
        setEmployees(empList);
      } catch (err: any) {
        console.warn('Could not fetch employees:', err);
      }
    } else {
      setEmployees([]);
    }
  }, [currentShop?.shopId, isSuperAdmin, isShop]);

  const loadAllData = useCallback(async () => {
    if (!currentShop?.shopId) {
      setCustomers([]);
      setOrders([]);
      setPayments([]);
      setEmployees([]);
      return;
    }

    try {
      setLoading(true);
      const [cList, oList, pList, rList] = await Promise.all([
        TailorService.getCustomers(currentShop.shopId).catch(() => []),
        TailorService.getOrders(currentShop.shopId).catch(() => []),
        TailorService.getPayments(currentShop.shopId).catch(() => []),
        TailorService.getRefunds(currentShop.shopId).catch(() => []),
      ]);
      setCustomers(cList);
      setOrders(oList);
      setPayments(pList);
      setRefunds(rList);

      if (isSuperAdmin || isShop) {
        await fetchEmployeesList();
      }
    } catch (err: any) {
      console.error('Error loading shop data:', err);
      showToast(err.message || 'تعذر تحميل بعض البيانات من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentShop?.shopId, isSuperAdmin, isShop, fetchEmployeesList, showToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Realtime subscription for customers, orders, payments, and refunds collections
  useEffect(() => {
    if (!currentShop?.shopId) return;

    const unsubscribeCustomers = TailorService.subscribeCustomers(
      currentShop.shopId,
      (updatedCustomers) => {
        setCustomers(updatedCustomers);
      },
      (err) => {
        console.warn('Realtime customers update failed:', err);
      }
    );

    const unsubscribeOrders = TailorService.subscribeOrders(
      currentShop.shopId,
      (updatedOrders) => {
        setOrders(updatedOrders);
      },
      (err) => {
        console.warn('Realtime orders update failed:', err);
      }
    );

    const unsubscribePayments = TailorService.subscribePayments(
      currentShop.shopId,
      (updatedPayments) => {
        setPayments(updatedPayments);
      },
      (err) => {
        console.warn('Realtime payments update failed:', err);
      }
    );

    const unsubscribeRefunds = TailorService.subscribeRefunds(
      currentShop.shopId,
      (updatedRefunds) => {
        setRefunds(updatedRefunds);
      },
      (err) => {
        console.warn('Realtime refunds update failed:', err);
      }
    );

    return () => {
      unsubscribeCustomers();
      unsubscribeOrders();
      unsubscribePayments();
      unsubscribeRefunds();
    };
  }, [currentShop?.shopId]);

  const createOrder = async (data: Parameters<typeof TailorService.createOrder>[1]): Promise<Order> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      const newOrder = await TailorService.createOrder(currentShop.shopId, data);
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.orderId !== newOrder.orderId)]);
      showToast(`تم إنشاء الطلب بنجاح برقم (${newOrder.orderNumber})`, 'success');
      return newOrder;
    } catch (err: any) {
      showToast(err.message || 'فشل إنشاء الطلب', 'error');
      throw err;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string): Promise<Order> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      const updated = await TailorService.updateOrderStatus(
        currentShop.shopId,
        orderId,
        status,
        { id: currentUser?.userId || 'usr_unknown', name: currentUser?.fullName || 'المستخدم' },
        note
      );
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? updated : o)));
      showToast(`تم تحديث حالة الطلب ${updated.orderNumber} بنجاح`, 'success');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث حالة الطلب', 'error');
      throw err;
    }
  };

  const createCustomer = async (data: Parameters<typeof TailorService.createCustomer>[1]): Promise<Customer> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      const newCust = await TailorService.createCustomer(currentShop.shopId, data);
      // Optimistic immediate state update so UI and metrics refresh instantly
      setCustomers((prev) => [newCust, ...prev.filter((c) => c.customerId !== newCust.customerId)]);
      showToast(`تم إضافة العميل (${newCust.fullName}) بنجاح`, 'success');
      return newCust;
    } catch (err: any) {
      showToast(err.message || 'فشل إضافة العميل', 'error');
      throw err;
    }
  };

  const updateCustomer = async (customerId: string, data: Partial<Customer>): Promise<Customer> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      const updated = await TailorService.updateCustomer(currentShop.shopId, customerId, data);
      setCustomers((prev) => prev.map((c) => (c.customerId === customerId ? updated : c)));
      showToast(`تم تحديث بيانات العميل بنجاح`, 'success');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث بيانات العميل', 'error');
      throw err;
    }
  };

  const deleteCustomer = async (customerId: string): Promise<void> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      await TailorService.deleteCustomer(currentShop.shopId, customerId);
      setCustomers((prev) => prev.filter((c) => c.customerId !== customerId));
      showToast(`تم حذف العميل بنجاح`, 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل حذف العميل', 'error');
      throw err;
    }
  };

  const addPayment = async (data: Parameters<typeof TailorService.addPayment>[1]): Promise<Payment> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      const newPay = await TailorService.addPayment(currentShop.shopId, data);
      await loadAllData();
      showToast(`تم تسجيل سند قبض بمبلغ ${newPay.amount} ر.س`, 'success');
      return newPay;
    } catch (err: any) {
      showToast(err.message || 'فشل تسجيل الدفعة', 'error');
      throw err;
    }
  };

  const addRefund = async (data: Parameters<typeof TailorService.addRefund>[1]): Promise<Refund> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      const newRef = await TailorService.addRefund(currentShop.shopId, data);
      await loadAllData();
      showToast(`تم تسجيل سند استرداد بمبلغ ${newRef.amount} ر.س بنجاح`, 'success');
      return newRef;
    } catch (err: any) {
      showToast(err.message || 'فشل تسجيل سند الاسترداد', 'error');
      throw err;
    }
  };

  const startRepeatOrder = (order: Order) => {
    setRepeatOrderTemplate(order);
    setEditingOrder(null);
    setSelectedCustomerId(order.customerId);
    setActiveTab('new_order');
  };

  const startEditOrder = (order: Order) => {
    setEditingOrder(order);
    setRepeatOrderTemplate(null);
    setSelectedCustomerId(order.customerId);
    setActiveTab('new_order');
  };

  const updateOrder = async (orderId: string, data: Partial<Order>): Promise<Order> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      const updated = await TailorService.updateOrder(currentShop.shopId, orderId, data);
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? updated : o)));
      showToast(`تم حفظ تعديلات الطلب (${updated.orderNumber}) بنجاح`, 'success');
      return updated;
    } catch (err: any) {
      showToast(err.message || 'فشل تعديل بيانات الطلب', 'error');
      throw err;
    }
  };

  const deleteOrder = async (orderId: string): Promise<void> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      await TailorService.deleteOrder(currentShop.shopId, orderId);
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      showToast(`تم حذف الطلب بنجاح`, 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل حذف الطلب', 'error');
      throw err;
    }
  };

  const addEmployee = async (
    data: {
      fullName: string;
      email: string;
      phone: string;
      permissions: EmployeePermissions;
    },
    password: string
  ): Promise<UserProfile> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      const created = await TailorService.addEmployeeWithAuth(
        currentShop.shopId,
        data,
        password,
        currentUser?.userId || ''
      );
      setEmployees((prev) => [created, ...prev.filter((e) => e.userId !== created.userId)]);
      refreshProfile().catch(() => {});
      showToast(`تم إنشاء حساب الموظف (${created.fullName}) بنجاح`, 'success');
      return created;
    } catch (err: any) {
      showToast(err.message || 'فشل إضافة الموظف', 'error');
      throw err;
    }
  };

  const updateEmployeePermissions = async (
    userId: string,
    permissions: EmployeePermissions
  ): Promise<void> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      await TailorService.updateEmployeePermissions(currentShop.shopId, userId, permissions);
      setEmployees((prev) =>
        prev.map((e) => (e.userId === userId ? { ...e, permissions } : e))
      );
      showToast('تم تحديث صلاحيات الموظف بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث الصلاحيات', 'error');
      throw err;
    }
  };

  const toggleEmployeeStatus = async (
    userId: string,
    isActive: boolean
  ): Promise<void> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      await TailorService.toggleEmployeeStatus(currentShop.shopId, userId, isActive);
      setEmployees((prev) =>
        prev.map((e) => (e.userId === userId ? { ...e, isActive } : e))
      );
      refreshProfile().catch(() => {});
      showToast(
        isActive ? 'تم تفعيل حساب الموظف بنجاح' : 'تم تعطيل حساب الموظف بنجاح (تم تحرير مقعد)',
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'فشل تغيير حالة الموظف', 'error');
      throw err;
    }
  };

  const deleteEmployee = async (userId: string): Promise<void> => {
    if (!currentShop?.shopId) throw new Error('المتجر غير محدد');
    try {
      await TailorService.deleteEmployeeDoc(currentShop.shopId, userId);
      setEmployees((prev) => prev.filter((e) => e.userId !== userId));
      refreshProfile().catch(() => {});
      showToast('تم إزالة وصول الموظف من المتجر بنجاح', 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل إزالة الموظف', 'error');
      throw err;
    }
  };

  const value: ShopContextType = {
    currentShop,
    currentUser,
    customers,
    orders,
    payments,
    refunds,
    employees,
    loading,
    toasts,
    showToast,
    removeToast,
    refreshData: loadAllData,
    refreshEmployees: fetchEmployeesList,
    activeTab,
    setActiveTab,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedOrderId,
    setSelectedOrderId,
    orderToPrint,
    setOrderToPrint,
    repeatOrderTemplate,
    setRepeatOrderTemplate,
    editingOrder,
    setEditingOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addPayment,
    addRefund,
    startRepeatOrder,
    startEditOrder,
    addEmployee,
    updateEmployeePermissions,
    toggleEmployeeStatus,
    deleteEmployee,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within a ShopProvider');
  return context;
};
