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
    loading,
    isSuperAdmin,
    isShopSuspended,
    platformViewMode,
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

  // Not logged in -> Show Authentication / Registration Request Page
  if (!firebaseUser || !currentUser) {
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
