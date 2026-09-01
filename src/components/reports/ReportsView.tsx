import React from 'react';
import { useShop } from '../../context/ShopContext';
import {
  TrendingUp,
  CreditCard,
  PieChart,
  ShoppingBag,
  Scissors,
  CheckCircle,
  Calendar,
  Layers,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { orders, payments } = useShop();

  const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const totalRevenue = validOrders.reduce((acc, o) => acc + (o.pricing?.totalAmount || 0), 0);
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalRemaining = Math.max(0, totalRevenue - totalPaid);
  const totalGarments = validOrders.reduce((acc, o) => acc + (o.quantity || 1), 0);

  // Group by Garment Type (excluding CANCELLED orders)
  const garmentTypeCounts: Record<string, number> = {};
  validOrders.forEach((o) => {
    const type = o.garmentType || 'سعودي كلاسيك';
    garmentTypeCounts[type] = (garmentTypeCounts[type] || 0) + o.quantity;
  });

  // Group by Collar Type (excluding CANCELLED orders)
  const collarCounts: Record<string, number> = {};
  validOrders.forEach((o) => {
    const c = o.tailoringDetails?.collar?.name || 'قلاب عادي';
    collarCounts[c] = (collarCounts[c] || 0) + 1;
  });

  // Group by Payment Method
  const paymentMethodAmounts: Record<string, number> = {
    cash: 0,
    card: 0,
    stc_pay: 0,
    bank_transfer: 0,
  };
  payments.forEach((p) => {
    const m = p.method || 'cash';
    paymentMethodAmounts[m] = (paymentMethodAmounts[m] || 0) + p.amount;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-700" />
          تقارير الإنتاج والمبيعات
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          إحصائيات دورة العمل، توزيع المبيعات، ومؤشرات تفضيل العملاء لأنماط التفصيل
        </p>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 block">إجمالي المبيعات</span>
          <div className="text-2xl font-black text-stone-900 mt-2">{totalRevenue} ر.س</div>
          <span className="text-[11px] text-stone-400 mt-1 block">لقاء {totalGarments} ثوب مفصل</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 block">المحصل الفعلي (سندات القبض)</span>
          <div className="text-2xl font-black text-emerald-800 mt-2">{totalPaid} ر.س</div>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0}% من إجمالي المبيعات
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-amber-800 block">المتبقي غير المحصل</span>
          <div className="text-2xl font-black text-amber-800 mt-2">{totalRemaining} ر.س</div>
          <span className="text-[11px] text-amber-600 mt-1 block">يستحق عند التسليم والبروفة</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 block">متوسط سعر الثوب</span>
          <div className="text-2xl font-black text-stone-900 mt-2">
            {totalGarments > 0 ? Math.round(totalRevenue / totalGarments) : 0} ر.س
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">شامل القماش والتفصيل</span>
        </div>
      </div>

      {/* Production & Styles Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Popular Thobe Styles */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-700" />
            توزيع قصات الثياب الأكثر طلباً
          </h3>
          <div className="space-y-3">
            {Object.entries(garmentTypeCounts).map(([type, count]) => {
              const pct = totalGarments > 0 ? Math.round((count / totalGarments) * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-1">
                    <span>{type}</span>
                    <span>{count} ثياب ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-800 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-700" />
            توزيع طرق التحصيل والدفع
          </h3>
          <div className="space-y-3">
            {[
              { id: 'card', label: 'شبكة / مدى', amount: paymentMethodAmounts.card, color: 'bg-emerald-700' },
              { id: 'cash', label: 'نقدي (كاش)', amount: paymentMethodAmounts.cash, color: 'bg-amber-800' },
              { id: 'stc_pay', label: 'STC Pay', amount: paymentMethodAmounts.stc_pay, color: 'bg-purple-700' },
              { id: 'bank_transfer', label: 'تحويل بنكي', amount: paymentMethodAmounts.bank_transfer, color: 'bg-blue-700' },
            ].map((p) => {
              const pct = totalPaid > 0 ? Math.round((p.amount / totalPaid) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-1">
                    <span>{p.label}</span>
                    <span>{p.amount} ر.س ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${p.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
