import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { ORDER_STATUS_LABELS } from '../../utils/presets';
import { CustomerDetailModal } from '../customers/CustomerDetailModal';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { WhatsAppModal } from '../whatsapp/WhatsAppModal';
import { Customer, Order } from '../../types';
import {
  Scissors,
  Users,
  ShoppingBag,
  TrendingUp,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  UserPlus,
  Printer,
  Sparkles,
  CheckCircle2,
  Eye,
  Edit2,
  Ruler,
  Phone,
  Search,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    orders,
    customers,
    payments,
    refunds,
    setActiveTab,
    setOrderToPrint,
    startRepeatOrder,
    startEditOrder,
    setSelectedCustomerId,
    setRepeatOrderTemplate,
  } = useShop();
  const { currentShop, currentUser, hasPermission } = useAuth();

  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<Customer | null>(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<Order | null>(null);

  // Permission flags
  const canOrders = hasPermission('orders');
  const canCustomers = hasPermission('customers');
  const canMeasurements = hasPermission('measurements');
  const canPayments = hasPermission('payments');
  const canReports = hasPermission('reports');

  // Valid non-cancelled orders for active revenue & order metrics
  const validOrders = orders.filter((o) => o.status !== 'CANCELLED');

  // Metrics Calculations (computed only when relevant)
  const activeOrders = canOrders
    ? orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status))
    : [];
  const readyOrders = canOrders
    ? orders.filter((o) => o.status === 'READY' || o.status === 'FITTING')
    : [];
  const totalRevenue = canReports || canPayments
    ? validOrders.reduce((acc, o) => acc + (o.pricing?.totalAmount || 0), 0)
    : 0;
  const grossCollected = canPayments || canReports
    ? payments.reduce((acc, p) => acc + (p.amount || 0), 0)
    : 0;
  const totalRefunds = canPayments || canReports
    ? refunds.reduce((acc, r) => acc + (r.amount || 0), 0)
    : 0;
  const netCollected = Math.max(0, grossCollected - totalRefunds);
  const remainingUnpaid = Math.max(0, totalRevenue - netCollected);

  // Today / Urgent deliveries
  const todayStr = new Date().toISOString().split('T')[0];
  const urgentOrders = canOrders
    ? orders.filter(
        (o) => !['DELIVERED', 'CANCELLED'].includes(o.status) && o.deliveryDate <= todayStr
      )
    : [];

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomerForModal(customer);
  };

  const handleNewOrderForCustomer = (customer: Customer) => {
    setSelectedCustomerForModal(null);
    setSelectedCustomerId(customer.customerId);
    setRepeatOrderTemplate(null);
    setActiveTab('new_order');
  };

  const handleRepeatOrder = (order: Order) => {
    setSelectedCustomerForModal(null);
    setRepeatOrderTemplate(order);
    setSelectedCustomerId(order.customerId);
    setActiveTab('new_order');
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Quick Actions */}
      <div className="bg-gradient-to-l from-[#0F172A] via-[#1E293B] to-[#1A365D] text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-300">
              {currentShop?.name || currentShop?.shopName} - مرحباً {currentUser?.fullName}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            لوحة قيادة معمل الخياطة ودفتر التفصيل
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            متابعة دقيقة لأوامر تفصيل الثياب السعودية، قياسات العملاء، والتسليمات المجدولة لليوم
          </p>
        </div>

        {/* Action Buttons (Permission-Guarded) */}
        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto">
          {canOrders && (
            <button
              type="button"
              onClick={() => setActiveTab('new_order')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-[#1A365D] font-black text-sm rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Scissors className="w-4 h-4 text-[#1A365D]" />
              <span>تفصيل طلب ثوب جديد</span>
            </button>
          )}

          {(canCustomers || canMeasurements) && (
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl border border-slate-700 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-400" />
              <span>إضافة / بحث عميل</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid (Permission-Guarded) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Orders - Orders Permission Required */}
        {canOrders && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">الطلبات قيد التفصيل</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1A365D] flex items-center justify-center border border-blue-100">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{activeOrders.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">من إجمالي {orders.length} طلب</div>
            </div>
          </div>
        )}

        {/* 2. Ready for Fitting / Pickup - Orders Permission Required */}
        {canOrders && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">جاهز للبروفة والاستلام</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-800">{readyOrders.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">بانتظار حضور العميل</div>
            </div>
          </div>
        )}

        {/* 3. Customers Count - Customers or Measurements Permission Required */}
        {(canCustomers || canMeasurements) && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">العملاء المسجلين</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center border border-indigo-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{customers.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">بمقاساتهم وسجلاتهم المحفوظة</div>
            </div>
          </div>
        )}

        {/* 4. Measurements Guide Card (If user has measurements permission but no orders) */}
        {canMeasurements && !canOrders && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">دفتر القياسات والمقاسات</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100">
                <Ruler className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm font-black text-slate-900">أخذ القياسات والتعديل</div>
              <div className="text-[11px] text-slate-400 mt-0.5">جاهز لتسجيل المقاسات الثمانية للثوب</div>
            </div>
          </div>
        )}

        {/* 5. Total Financials - Reports Permission Required */}
        {canReports && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">إجمالي المبيعات</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{totalRevenue} ر.س</div>
              {canPayments && (
                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>تم التحصيل:</span>
                    <b className="text-emerald-700 font-bold">{netCollected} ر.س</b>
                  </div>
                  {totalRefunds > 0 && (
                    <div className="flex items-center justify-between text-rose-600">
                      <span>مستردات:</span>
                      <b className="font-bold">{totalRefunds} ر.س</b>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-stone-500 text-[10px]">
                    <span>متبقي التحصيل:</span>
                    <span className="font-bold text-amber-800">{remainingUnpaid} ر.س</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Urgent Deliveries Alert if any (Orders Permission Required) */}
      {canOrders && urgentOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-xs text-amber-950">
                تنبيه: يوجد ({urgentOrders.length}) طلبات موعد تسليمها اليوم أو متأخرة!
              </h3>
              <p className="text-[11px] text-amber-800">
                يرجى مراجعة الخياطين للتأكد من إنهاء مرحلة الخياطة والكي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="px-4 py-1.5 bg-amber-800 text-white rounded-xl text-xs font-bold shrink-0 hover:bg-amber-900 cursor-pointer"
          >
            عرض الطلبات
          </button>
        </div>
      )}

      {/* Main Grid: Orders / Customers based on Permissions + Quick Tailoring Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Main Section */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {/* CASE 1: User has Orders permission -> Show Recent Orders Table */}
          {canOrders ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900">آخر طلبات التفصيل المضافة</h3>
                  <p className="text-xs text-slate-500">قائمة بأحدث الثياب قيد التنفيذ</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-[#1A365D] hover:underline cursor-pointer"
                >
                  عرض كل الطلبات →
                </button>
              </div>

              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    لا توجد طلبات مسجلة حتى الآن
                  </div>
                ) : (
                  orders.slice(0, 5).map((order) => {
                    const statusConfig = ORDER_STATUS_LABELS[order.status] || {
                      label: order.status,
                      color: '#333',
                      bg: '#eee',
                    };
                    return (
                      <div
                        key={order.orderId}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="px-2.5 py-1.5 min-w-[76px] rounded-xl bg-white border border-slate-200 flex items-center justify-center font-mono font-bold text-xs text-[#1A365D]">
                            {order.orderNumber}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{order.customerName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{order.garmentType}</span>
                              <span>•</span>
                              <span>{order.quantity} ثياب</span>
                              <span>•</span>
                              <span>تسليم: {new Date(order.deliveryDate).toLocaleDateString('ar-SA')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <span
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                          >
                            {statusConfig.label}
                          </span>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForWhatsApp(order)}
                            className="p-1.5 text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                            title="مراسلة العميل عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForModal(order)}
                            className="px-2.5 py-1.5 text-xs font-bold text-[#1A365D] hover:text-white bg-blue-50 hover:bg-[#1A365D] rounded-lg border border-blue-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="عرض تفاصيل الطلب والحالة المالية"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditOrder(order)}
                            className="px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:text-white bg-amber-50 hover:bg-amber-700 rounded-lg border border-amber-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="تعديل تفاصيل ومقاسات الطلب"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setOrderToPrint(order)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="طباعة نموذج التفصيل"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (canCustomers || canMeasurements) ? (
            /* CASE 2: User does NOT have Orders, but HAS Customers/Measurements -> Show Recent Customers & Saved Profiles */
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1A365D]" />
                    <span>سجل العملاء والمقاسات المحفوظة</span>
                  </h3>
                  <p className="text-xs text-slate-500">إدارة بطاقات العملاء وتحديث المقاسات التفصيلية للثياب</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('customers')}
                  className="text-xs font-bold text-[#1A365D] hover:underline cursor-pointer"
                >
                  فتح دليل العملاء بالكامل →
                </button>
              </div>

              <div className="space-y-3">
                {customers.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    لا يوجد عملاء مسجلون حالياً
                  </div>
                ) : (
                  customers.slice(0, 5).map((cust) => (
                    <div
                      key={cust.customerId}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-sm text-[#1A365D]">
                          {cust.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{cust.fullName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="dir-ltr text-right">{cust.phone}</span>
                            </span>
                            {cust.address && (
                              <>
                                <span>•</span>
                                <span>{cust.address}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleCustomerClick(cust)}
                          className="px-3 py-1.5 text-xs font-bold text-[#1A365D] bg-white hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Ruler className="w-3.5 h-3.5 text-[#1A365D]" />
                          <span>عرض وتعديل المقاسات</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* CASE 3: No Orders, No Customers -> Clean Information Box */
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Scissors className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">مرحباً بك في نظام ثوبي للخياطة</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                تواصل مع إدارة المحل لتفعيل الصلاحيات المناسبة لمهام عملك.
              </p>
            </div>
          )}
        </div>

        {/* Right: Quick Production Stats & Presets */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Shortcuts (Permission-Guarded) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
              إجراءات سريعة
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {canOrders && (
                <button
                  type="button"
                  onClick={() => setActiveTab('new_order')}
                  className="w-full text-right p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1A365D] font-bold text-xs border border-blue-200 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-[#1A365D]" />
                    <span>أخذ مقاسات وبدء تفصيل</span>
                  </span>
                  <span className="text-[10px] bg-blue-200 text-[#1A365D] px-1.5 py-0.5 rounded font-bold">F2</span>
                </button>
              )}

              {(canCustomers || canMeasurements) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('customers')}
                  className="w-full text-right p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>البحث في سجل العملاء والمقاسات</span>
                  </span>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">F3</span>
                </button>
              )}

              {canOrders && (
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="w-full text-right p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-slate-600" />
                    <span>أوامر القص والخياطة</span>
                  </span>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">F4</span>
                </button>
              )}

              {canReports && (
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className="w-full text-right p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-600" />
                    <span>تقارير المبيعات والأداء</span>
                  </span>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">F5</span>
                </button>
              )}
            </div>
          </div>

          {/* Saudi Thobe Styles Guide */}
          <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <h4 className="font-bold text-xs text-blue-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ميزات دفتر التفصيل الإلكتروني
            </h4>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">✓</span>
                <span>رسومات وأشكال تفصيلية لكل من الياقة، الكبك، والجيوب</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">✓</span>
                <span>طباعة أمر تفصيل ورقي كامل (A4) مزود بباركود فريد</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">✓</span>
                <span>زر سريع لتكرار أي طلب سابق للعميل بنقرة واحدة</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Customer Detail Modal if opened from Dashboard */}
      {selectedCustomerForModal && (
        <CustomerDetailModal
          customer={selectedCustomerForModal}
          onClose={() => setSelectedCustomerForModal(null)}
          onNewOrder={() => handleNewOrderForCustomer(selectedCustomerForModal)}
          onRepeatOrder={(order) => handleRepeatOrder(order)}
          onPrintOrder={(order) => setOrderToPrint(order)}
          onEditOrder={(order) => {
            startEditOrder(order);
            setSelectedCustomerForModal(null);
          }}
        />
      )}

      {/* Order Detail Modal if opened from Dashboard */}
      {selectedOrderForModal && (
        <OrderDetailModal
          order={selectedOrderForModal}
          onClose={() => setSelectedOrderForModal(null)}
          onPrint={() => {
            const ord = selectedOrderForModal;
            setSelectedOrderForModal(null);
            setOrderToPrint(ord);
          }}
          onRepeat={() => {
            const ord = selectedOrderForModal;
            setSelectedOrderForModal(null);
            handleRepeatOrder(ord);
          }}
          onEdit={() => {
            const ord = selectedOrderForModal;
            setSelectedOrderForModal(null);
            startEditOrder(ord);
          }}
        />
      )}

      {/* WhatsApp Modal */}
      {selectedOrderForWhatsApp && (
        <WhatsAppModal
          isOpen={Boolean(selectedOrderForWhatsApp)}
          onClose={() => setSelectedOrderForWhatsApp(null)}
          customerName={selectedOrderForWhatsApp.customerName}
          phone={selectedOrderForWhatsApp.customerPhone}
          orderNumber={selectedOrderForWhatsApp.orderNumber}
          orderStatus={selectedOrderForWhatsApp.status}
          shopName={currentShop?.name || currentShop?.shopName}
        />
      )}
    </div>
  );
};
