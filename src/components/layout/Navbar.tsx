import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import {
  Scissors,
  Plus,
  LogOut,
  Shield,
  Menu,
  Building,
  AlertTriangle,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { currentShop, currentUser, signOut, role, isSuperAdmin, hasPermission } = useAuth();
  const { setActiveTab } = useShop();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await signOut();
      setShowLogoutModal(false);
    } catch (err: any) {
      console.error('Error during logout:', err);
      setLogoutError(err?.message || 'حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مجدداً.');
      setIsLoggingOut(false);
    }
  };

  const getRoleLabel = () => {
    if (isSuperAdmin || role === 'SUPER_ADMIN') return 'إدارة المنصة (Super Admin)';
    if (role === 'SHOP') return 'حساب المتجر (Shop)';
    return 'موظف (Employee)';
  };

  const getRoleBadgeColor = () => {
    if (isSuperAdmin || role === 'SUPER_ADMIN') return 'bg-purple-100 text-purple-900 border-purple-200';
    if (role === 'SHOP') return 'bg-amber-100 text-amber-900 border-amber-200';
    return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1A365D] text-white flex items-center justify-center font-black text-lg shadow-sm">
              ث
            </div>
            <div>
              <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <span>{currentShop?.name || currentShop?.shopName || 'محل الخياطة'}</span>
                <span className="text-[10px] font-bold bg-blue-50 text-[#1A365D] border border-blue-200 px-2 py-0.2 rounded-full hidden sm:inline">
                  SaaS Tenant
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold hidden sm:block">
                {currentShop?.city ? `فرع ${currentShop.city}` : 'دفتر التفصيل الإلكتروني'}
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Fast New Order Button (if employee has orders permission) */}
          {hasPermission('orders') && (
            <button
              type="button"
              onClick={() => setActiveTab('new_order')}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[#1A365D] hover:bg-[#152C4D] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">طلب تفصيل جديد (F2)</span>
              <span className="sm:hidden">طلب جديد</span>
            </button>
          )}

          {/* User Info Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#1A365D]">
                {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
              </div>
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-slate-900 leading-none">{currentUser.fullName}</div>
                <div className={`text-[9px] font-bold mt-1 px-1.5 py-0.2 rounded-md border inline-block ${getRoleBadgeColor()}`}>
                  {getRoleLabel()}
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => {
              setLogoutError(null);
              setShowLogoutModal(true);
            }}
            title="تسجيل الخروج"
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Logout Confirmation Custom Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <LogOut className="w-5 h-5 text-amber-400" />
                تأكيد تسجيل الخروج
              </h3>
              <button
                disabled={isLoggingOut}
                onClick={() => setShowLogoutModal(false)}
                className="text-slate-400 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-slate-800 leading-relaxed">
                هل أنت متأكد من تسجيل الخروج؟
              </p>

              {currentUser && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>المستخدم:</span>
                    <span className="font-bold text-slate-800">{currentUser.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الدور:</span>
                    <span className="font-bold text-slate-800">{getRoleLabel()}</span>
                  </div>
                </div>
              )}

              {logoutError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{logoutError}</span>
                </div>
              )}

              <p className="text-xs text-slate-500">
                سيتم إنهاء جلستك الحالية والعودة لشاشة تسجيل الدخول.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleConfirmLogout}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isLoggingOut ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ تسجيل الخروج...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل الخروج</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
