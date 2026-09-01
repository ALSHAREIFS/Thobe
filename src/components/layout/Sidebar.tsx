import React from 'react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  PlusCircle,
  Users,
  TrendingUp,
  Settings,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeTab, setActiveTab, orders } = useShop();
  const { isSuperAdmin, isShop, hasPermission } = useAuth();

  const activeOrdersCount = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;

  const allNavItems = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم والإنتاج',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'new_order',
      label: 'طلب تفصيل جديد (F2)',
      icon: PlusCircle,
      highlight: true,
      visible: hasPermission('orders'),
    },
    {
      id: 'orders',
      label: 'أوامر التفصيل والخياطة',
      icon: ShoppingBag,
      badge: activeOrdersCount,
      visible: hasPermission('orders'),
    },
    {
      id: 'customers',
      label: 'دليل وسجلات العملاء',
      icon: Users,
      visible: hasPermission('customers') || hasPermission('measurements'),
    },
    {
      id: 'reports',
      label: 'التقارير والمبيعات',
      icon: TrendingUp,
      visible: hasPermission('reports'),
    },
    {
      id: 'settings',
      label: 'إعدادات المحل وفريق العمل',
      icon: Settings,
      visible: isSuperAdmin || isShop, // Strict: EMPLOYEE cannot see settings
    },
  ];

  const visibleNavItems = allNavItems.filter((item) => item.visible);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed lg:static top-0 right-0 z-50 h-screen w-64 bg-[#0F172A] text-slate-300 border-l border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-3 py-3 mb-4 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-[#1A365D] border border-blue-400/30 text-white flex items-center justify-center font-black text-lg shadow-sm">
              ث
            </div>
            <div>
              <div className="font-black text-white text-base leading-tight">نظام ثوبي</div>
              <div className="text-[10px] text-blue-400 font-bold">دفتر التفصيل الرقمي</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as any);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-right ${
                    isSelected
                      ? 'bg-[#1A365D] text-white shadow-sm border border-blue-400/30'
                      : item.highlight
                      ? 'bg-slate-800/90 text-blue-300 hover:bg-slate-800 border border-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isSelected ? 'bg-white text-[#1A365D]' : 'bg-slate-800 text-blue-300 border border-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Tailor Tips / Footer */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              تلميحة للخياط:
            </div>
            <p className="leading-relaxed">
              يمكنك طباعة أمر التفصيل (A4) مع الباركود من تفاصيل أي طلب لتسليمه لمعلم القص.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
