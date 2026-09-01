import React, { useState, useMemo } from 'react';
import { Customer, Order } from '../../types';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { CustomerDetailModal } from './CustomerDetailModal';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Ruler,
  ShoppingBag,
  ArrowUpDown,
  Printer,
  Copy,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const CustomerListView: React.FC = () => {
  const { customers, orders, createCustomer, deleteCustomer, setActiveTab, setSelectedCustomerId, setRepeatOrderTemplate, setOrderToPrint, startEditOrder } = useShop();
  const { hasPermission } = useAuth();

  const canOrders = hasPermission('orders');
  const canMeasurements = hasPermission('measurements');

  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // New customer form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically compute real customer metrics from loaded orders (Source of Truth)
  // Excludes CANCELLED orders as they are voided and do not represent active business value
  const customerStatsMap = useMemo(() => {
    const stats: Record<string, { totalOrdersCount: number; totalOrderValue: number; totalRemaining: number }> = {};

    orders.forEach((o) => {
      if (o.status === 'CANCELLED') return;

      const cId = o.customerId;
      if (!stats[cId]) {
        stats[cId] = { totalOrdersCount: 0, totalOrderValue: 0, totalRemaining: 0 };
      }

      stats[cId].totalOrdersCount += 1;
      const orderTotal = o.pricing?.totalAmount || 0;
      const paid = o.pricing?.paidAmount || 0;
      const remaining = o.pricing?.remainingAmount !== undefined ? o.pricing.remainingAmount : Math.max(0, orderTotal - paid);

      stats[cId].totalOrderValue += orderTotal;
      stats[cId].totalRemaining += remaining;
    });

    return stats;
  }, [orders]);

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await createCustomer({
        fullName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: 'الرياض',
        notes: notes.trim(),
      });

      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setShowAddModal(false);
      setSelectedCustomer(created);
    } catch (err: any) {
      console.error('Error creating customer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrderForCustomer = (c: Customer) => {
    setSelectedCustomer(null);
    setSelectedCustomerId(c.customerId);
    setRepeatOrderTemplate(null);
    setActiveTab('new_order');
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete || isDeletingCustomer) return;

    setIsDeletingCustomer(true);
    try {
      await deleteCustomer(customerToDelete.customerId);
      if (selectedCustomer?.customerId === customerToDelete.customerId) {
        setSelectedCustomer(null);
      }
      setCustomerToDelete(null);
    } catch (err: any) {
      console.error('Error deleting customer:', err);
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const handleRepeatOrder = (order: Order) => {
    setSelectedCustomer(null);
    setRepeatOrderTemplate(order);
    setSelectedCustomerId(order.customerId);
    setActiveTab('new_order');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-700" />
            دليل العملاء وسجلات المقاسات
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            إدارة بيانات العملاء، مقاساتهم المحفوظة، وتاريخ تفصيل الثياب
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-black shadow-xs transition-all"
        >
          <UserPlus className="w-4 h-4" />
          إضافة عميل جديد
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="w-5 h-5 text-stone-400 absolute right-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم العميل أو رقم الجوال السعودي (05xxxxxxx)..."
          className="w-full pl-4 pr-12 py-3 text-sm bg-white rounded-2xl border border-stone-200 font-bold focus:border-amber-700 focus:outline-none shadow-xs transition-all"
        />
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((customer) => (
          <div
            key={customer.customerId}
            onClick={() => setSelectedCustomer(customer)}
            className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:shadow-md hover:border-amber-600 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 group-hover:bg-amber-800 group-hover:text-white flex items-center justify-center font-black text-base transition-colors">
                    {customer.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-stone-900 group-hover:text-amber-800 transition-colors">
                      {customer.fullName}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-stone-500 font-mono mt-0.5">
                      <Phone className="w-3 h-3 text-stone-400" />
                      {customer.phone}
                    </div>
                  </div>
                </div>
              </div>

              {customer.address && (
                <div className="text-xs text-stone-500 mt-3 line-clamp-1 bg-stone-50 p-2 rounded-lg">
                  📍 {customer.address}
                </div>
              )}

              {customer.notes && (
                <div className="text-[11px] text-stone-400 mt-2 line-clamp-1 italic">
                  💬 {customer.notes}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
              {(() => {
                const stats = customerStatsMap[customer.customerId] || { totalOrdersCount: 0, totalOrderValue: 0, totalRemaining: 0 };
                return (
                  <div className="flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center gap-2.5 text-stone-600 font-semibold">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />
                        {stats.totalOrdersCount} {stats.totalOrdersCount === 1 ? 'طلب' : 'طلبات'}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="font-black text-stone-900">
                        {stats.totalOrderValue} ر.س
                      </span>
                    </div>
                    {stats.totalRemaining > 0 && (
                      <span className="text-[11px] font-bold text-amber-800">
                        متبقي: {stats.totalRemaining} ر.س
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomerToDelete(customer);
                  }}
                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="حذف العميل"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {canOrders && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNewOrderForCustomer(customer);
                    }}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-800 text-amber-900 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تفصيل ثوب</span>
                  </button>
                )}

                {!canOrders && canMeasurements && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(customer);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-[#1A365D] text-[#1A365D] hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>المقاسات</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300">
            <Users className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-600">لم يتم العثور على عملاء مطابقين للبحث</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-black"
            >
              + إضافة العميل الآن
            </button>
          </div>
        )}
      </div>

      {/* Customer Detail Profile Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onNewOrder={() => handleNewOrderForCustomer(selectedCustomer)}
          onRepeatOrder={(order) => handleRepeatOrder(order)}
          onPrintOrder={(order) => setOrderToPrint(order)}
          onEditOrder={(order) => {
            startEditOrder(order);
            setSelectedCustomer(null);
          }}
        />
      )}

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                تسجيل عميل جديد
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">الاسم الثلاثي أو اللقب *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: سلمان بن خالد الدوسري"
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 rounded-xl border border-stone-300 font-bold focus:bg-white focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">رقم الجوال السعودي *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 rounded-xl border border-stone-300 font-bold focus:bg-white focus:border-amber-700 focus:outline-none dir-ltr text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">المدينة والحي</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="الرياض - حي الملز"
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">ملاحظات العميل</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل خاصة بالعميل أو تفضيلاته..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 rounded-xl border border-stone-300 focus:bg-white focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 rounded-xl disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    'حفظ العميل'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
                تأكيد حذف العميل
              </h3>
              <button
                disabled={isDeletingCustomer}
                onClick={() => setCustomerToDelete(null)}
                className="text-rose-200 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-stone-800">
                هل أنت متأكد من حذف العميل <span className="text-rose-700 underline underline-offset-4">"{customerToDelete.fullName}"</span>؟
              </p>

              {orders.filter((o) => o.customerId === customerToDelete.customerId).length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-semibold">
                  ⚠️ تنبيه: العميل لديه ({orders.filter((o) => o.customerId === customerToDelete.customerId).length}) طلبات مسجلة في المتجر. لن يتم حذف طلباته السابقة حفاظاً على السجلات المالية والمحاسبية.
                </div>
              )}

              <p className="text-xs text-stone-500 leading-relaxed">
                سيتم حذف بطاقة العميل وقياساته الخاصة من المتجر بشكل نهائي.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isDeletingCustomer}
                  onClick={() => setCustomerToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeletingCustomer}
                  onClick={handleConfirmDeleteCustomer}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isDeletingCustomer ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف العميل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
