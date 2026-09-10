import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShopProvider, useShop } from './context/ShopContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/layout/ToastContainer';
import { SplashScreen } from './components/layout/SplashScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { OrderWizard } from './components/orders/OrderWizard';
import { OrderListView } from './components/orders/OrderListView';
import { CustomerListView } from './components/customers/CustomerListView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { PrintTailoringSheet } from './components/print/PrintTailoringSheet';
import { AuthPage } from './components/auth/AuthPage';
import { PlatformAdminDashboard } from './components/admin/PlatformAdminDashboard';
import {
  Scissors,
  ShieldAlert,
  PauseCircle,
  Clock,
  LogOut,
  ArrowRight,
  Store,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    orderToPrint,
    setOrderToPrint,
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    repeatOrderTemplate,
    setRepeatOrderTemplate,
    editingOrder,
    setEditingOrder,
    currentShop,
  } = useShop();

  const { isSuperAdmin, isShop, hasPermission, setPlatformViewMode } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  // Keyboard shortcut listener (F2: New Order, F3: Customers, F4: Orders, ESC: close modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && hasPermission('orders')) {
        e.preventDefault();
        setEditingOrder(null);
        setRepeatOrderTemplate(null);
        setActiveTab('new_order');
      } else if (e.key === 'F3' && (hasPermission('customers') || hasPermission('measurements'))) {
        e.preventDefault();
        setActiveTab('customers');
      } else if (e.key === 'F4' && hasPermission('orders')) {
        e.preventDefault();
        setActiveTab('orders');
      } else if (e.key === 'Escape' && orderToPrint) {
        setOrderToPrint(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, orderToPrint, setOrderToPrint, setEditingOrder, setRepeatOrderTemplate, hasPermission]);

  const activeCustomer = customers.find((c) => c.customerId === selectedCustomerId) || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#1E293B] font-sans antialiased selection:bg-[#1A365D] selection:text-white" dir="rtl">
      {/* Super Admin Preview Banner (if viewing shop workspace) */}
      {isSuperAdmin && (
        <div className="bg-slate-900 text-slate-100 px-4 py-2 flex items-center justify-between text-xs border-b border-slate-800 z-40">
          <div className="flex items-center gap-2 font-bold">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
              وضع المعاينة الإدارية (Super Admin Mode)
            </span>
            <span>تستعرض الآن بيئة متجر: "{currentShop?.name || currentShop?.shopName}"</span>
          </div>
          <button
            onClick={() => setPlatformViewMode('platform')}
            className="px-3 py-1 bg-[#1A365D] hover:bg-[#23487a] text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>العودة للوحة إدارة المنصة</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* Animated Opening Intro Splash Screen */}
      {showSplash && (
        <SplashScreen
          shopName={currentShop?.name || currentShop?.shopName || 'المقص الذهبي للخياطة'}
          tagline="نظام إدارة الخياطة الرجالية والأثواب الفاخرة"
          duration={2000}
          onFinish={() => setShowSplash(false)}
        />
      )}

      <div className="flex-1 flex min-w-0">
        {/* Sidebar Navigation */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}

            {activeTab === 'new_order' && hasPermission('orders') && (
              <OrderWizard
                initialCustomer={activeCustomer}
                initialTemplateOrder={repeatOrderTemplate}
                initialEditingOrder={editingOrder}
                onComplete={(savedOrder) => {
                  setRepeatOrderTemplate(null);
                  setEditingOrder(null);
                  setSelectedCustomerId(null);
                  setOrderToPrint(savedOrder);
                  setActiveTab('orders');
                }}
                onCancel={() => {
                  setRepeatOrderTemplate(null);
                  setEditingOrder(null);
                  setSelectedCustomerId(null);
                  setActiveTab('dashboard');
                }}
              />
            )}

            {activeTab === 'orders' && hasPermission('orders') && <OrderListView />}

            {activeTab === 'customers' && (hasPermission('customers') || hasPermission('measurements')) && <CustomerListView />}

            {activeTab === 'reports' && hasPermission('reports') && <ReportsView />}

            {activeTab === 'settings' && (isSuperAdmin || isShop) && <SettingsView />}

            {/* Fallback Unauthorized State if directly navigated to unpermitted tab */}
            {((activeTab === 'new_order' && !hasPermission('orders')) ||
              (activeTab === 'orders' && !hasPermission('orders')) ||
              (activeTab === 'customers' && !hasPermission('customers') && !hasPermission('measurements')) ||
              (activeTab === 'reports' && !hasPermission('reports')) ||
              (activeTab === 'settings' && !isSuperAdmin && !isShop)) && (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm max-w-lg mx-auto mt-12">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto border border-amber-100">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-black text-slate-900">غير مصرح بالوصول إلى هذه الشاشة</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  حسابك لا يمتلك الصلاحية الكافية لفتح هذه الصفحة. يرجى مراجعة إدارة المحل لتعديل الصلاحيات.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-6 py-2.5 bg-[#1A365D] hover:bg-[#23487a] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  العودة للوحة القيادة
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Print Order Modal */}
      {orderToPrint && (
        <PrintTailoringSheet
          order={orderToPrint}
          onClose={() => setOrderToPrint(null)}
        />
      )}

      {/* Toast Alert Notifications */}
      <ToastContainer />
    </div>
  );
};

const AppContent: React.FC = () => {
  const {
    currentUser,
    currentShop,
    firebaseUser,
    userShopRequest,
    loading,
    isSuperAdmin,
    isShopSuspended,
    platformViewMode,
    reloadAuthUser,
    signOut,
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-[#1A365D] border border-blue-400/40 flex items-center justify-center mb-4 shadow-xl animate-pulse">
          <Scissors className="w-7 h-7 text-blue-300 animate-spin" />
        </div>
        <div className="font-black text-base text-slate-200">منصة ثوبي السحابية</div>
        <div className="text-xs text-slate-400 mt-1">جاري التحقق من الصلاحيات والاتصال بـ Firestore...</div>
      </div>
    );
  }

  // 1. Not logged in -> Show Authentication / Registration Request Page
  if (!firebaseUser) {
    return <AuthPage />;
  }

  // 2. User is authenticated, but their shop request is still PENDING -> Block access and show Pending status
  if (userShopRequest && userShopRequest.status === 'PENDING' && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in fade-in">
          <div className="w-16 h-16 bg-amber-950/80 border border-amber-500/50 rounded-2xl flex items-center justify-center text-amber-400 mx-auto shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white">طلب اشتراك المتجر قيد المراجعة</h2>
            <p className="text-xs text-amber-400 font-bold">
              متجر: {userShopRequest.shopName}
            </p>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            تم استلام طلب اشتراك متجرك وبيانات حسابك بنجاح، والطلب حالياً قيد المراجعة والاعتماد لدى إدارة منصة "ثوبي".
          </p>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-right space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">المالك / المدير:</span>
              <span className="text-white font-bold">{userShopRequest.ownerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">البريد الإلكتروني:</span>
              <span dir="ltr" className="text-slate-200 font-mono">{userShopRequest.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">المدينة:</span>
              <span className="text-slate-200">{userShopRequest.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">تاريخ الطلب:</span>
              <span className="text-slate-200">{new Date(userShopRequest.createdAt).toLocaleDateString('ar-SA')}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-900">
              <span className="text-slate-400">حالة الطلب:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-950 text-amber-400 border border-amber-800/60">
                بانتظار موافقة الإدارة
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl text-[11px] text-blue-300 text-right leading-relaxed">
            بمجرد قيام إدارة المنصة باعتماد طلبك، ستتمكن من الدخول فوراً وبدء إدارة متجرك دون الحاجة لإنشاء حساب جديد.
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => reloadAuthUser()}
              className="w-full py-3 bg-[#1A365D] hover:bg-[#204373] text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تحديث حالة الطلب</span>
            </button>
            <button
              onClick={() => signOut()}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. User is authenticated, but their shop registration request was REJECTED
  if (userShopRequest && userShopRequest.status === 'REJECTED' && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-rose-800/80 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl animate-in fade-in">
          <div className="w-16 h-16 bg-rose-950/80 border border-rose-800 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">تم رفض طلب اشتراك المتجر</h2>
            <p className="text-xs text-rose-300 font-bold">
              متجر "{userShopRequest.shopName}"
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            نعتذر منك، لم تتم الموافقة على طلب انضمام المتجر إلى منصة ثوبي.
          </p>
          {userShopRequest.rejectionReason && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 text-right">
              <span className="font-bold text-slate-400 block mb-1">سبب الرفض:</span>
              {userShopRequest.rejectionReason}
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Not logged in with complete profile -> Show Auth Page
  if (!currentUser) {
    return <AuthPage />;
  }

  // Super Admin view mode platform -> Show Platform Admin Dashboard
  if (isSuperAdmin && (platformViewMode === 'platform' || !currentShop)) {
    return <PlatformAdminDashboard />;
  }

  // If Shop is SUSPENDED -> Block access with message
  if (isShopSuspended && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-rose-800/80 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-rose-950/80 border border-rose-800 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
            <PauseCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">حساب المتجر معلّق مؤقتاً</h2>
            <p className="text-xs text-rose-300 font-bold">
              متجر "{currentShop?.name || currentShop?.shopName}"
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            تم تعليق هذا المتجر بواسطة إدارة منصة "ثوبي". تم إيقاف جميع عمليات القراءة والتسجيل حتى يتم تسوية
            حالة الاشتراك.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            لإعادة التفعيل، يرجى التواصل مع إدارة منصة ثوبي عبر البريد أو الهاتف المسجل.
          </div>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    );
  }

  // Regular user with no active shop attached yet
  if (!currentShop && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-amber-800/60 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-amber-950/80 border border-amber-800 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white">الحساب بانتظار التعيين أو التفعيل</h2>
            <p className="text-xs text-amber-300">
              مرحباً {currentUser.fullName} ({currentUser.email})
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            حسابك مسجل في المنصة ولكن لم يتم ربطه بمتجر فعال بعد من قبل إدارة المنصة أو مالك المحل.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    );
  }

  // Fully authenticated with active Shop Tenant (or Super Admin inspecting shop)
  return (
    <ShopProvider>
      <MainLayout />
    </ShopProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
