import React, { useState, useEffect } from 'react';
import { Customer, CustomerMeasurement, Order } from '../../types';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { TailorService } from '../../services/firebaseService';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Ruler,
  ShoppingBag,
  Plus,
  Copy,
  Printer,
  Edit2,
  Clock,
  CheckCircle,
  Eye,
  Trash2,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import { WhatsAppModal } from '../whatsapp/WhatsAppModal';

interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
  onNewOrder: () => void;
  onRepeatOrder: (order: Order) => void;
  onPrintOrder: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onNewOrder,
  onRepeatOrder,
  onPrintOrder,
  onEditOrder,
}) => {
  const { currentShop, payments, refunds, updateCustomer, deleteCustomer, showToast } = useShop();
  const { hasPermission } = useAuth();

  const canOrders = hasPermission('orders');
  const canMeasurements = hasPermission('measurements');
  const canCustomers = hasPermission('customers');
  const canPayments = hasPermission('payments');
  const canReports = hasPermission('reports');

  const [measurementsList, setMeasurementsList] = useState<CustomerMeasurement[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(customer.fullName);
  const [editPhone, setEditPhone] = useState(customer.phone);
  const [editAddress, setEditAddress] = useState(customer.address || '');
  const [editNotes, setEditNotes] = useState(customer.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [selectedWhatsAppOrder, setSelectedWhatsAppOrder] = useState<Order | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  useEffect(() => {
    const shopId = currentShop?.shopId;
    const custId = customer?.customerId;
    if (!shopId || !custId) return;

    let isMounted = true;
    setLoading(true);

    Promise.all([
      (canMeasurements || canCustomers)
        ? TailorService.getCustomerMeasurements(shopId, custId).catch(() => [])
        : Promise.resolve([]),
      canOrders
        ? TailorService.getCustomerOrders(shopId, custId).catch(() => [])
        : Promise.resolve([]),
    ]).then(([mList, oList]) => {
      if (isMounted) {
        setMeasurementsList(mList);
        setOrdersList(oList);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Error fetching customer profile:', err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [currentShop?.shopId, customer?.customerId, canOrders, canMeasurements, canCustomers]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCustomer(customer.customerId, {
      fullName: editName,
      phone: editPhone,
      address: editAddress,
      notes: editNotes,
    });
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;

    if (ordersList.length > 0) {
      showToast('لا يمكن حذف هذا العميل لوجود طلبات مسجلة باسمه. يمكنك الاحتفاظ بسجله بدلًا من حذفه.', 'error');
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCustomer(customer.customerId);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      showToast(err.message || 'حدث خطأ أثناء محاولة حذف العميل', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-800 flex items-center justify-center text-xl font-black text-white">
              {customer.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                {customer.fullName}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-all cursor-pointer"
                  title="تعديل بيانات العميل"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-stone-400 hover:text-rose-400 p-1 rounded-lg hover:bg-stone-800 transition-all cursor-pointer"
                  title="حذف العميل"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </h2>
              <div className="flex items-center gap-3 text-xs text-stone-300 font-mono mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-amber-500" /> <span dir="ltr">{customer.phone}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWhatsAppOrder(null);
                    setIsWhatsAppOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 hover:text-white hover:bg-emerald-800 border border-emerald-700/60 text-[11px] font-bold transition-all cursor-pointer"
                  title="مراسلة العميل عبر واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>واتساب</span>
                </button>
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" /> {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedWhatsAppOrder(null);
                setIsWhatsAppOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="تواصل مع العميل عبر واتساب"
            >
              <MessageCircle className="w-4 h-4 text-emerald-100" />
              <span className="hidden sm:inline">تواصل عبر واتساب</span>
              <span className="sm:hidden">واتساب</span>
            </button>
            {canOrders && (
              <button
                onClick={onNewOrder}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                تفصيل طلب جديد
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editing Section */}
        {isEditing && (
          <form onSubmit={handleSaveEdit} className="p-4 bg-stone-100 border-b border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1">الاسم:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-stone-300 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-stone-700 block mb-1">رقم الجوال:</label>
              <input
                type="text"
                dir="ltr"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-stone-300 font-bold text-left"
              />
            </div>
            <div>
              <label className="font-bold text-stone-700 block mb-1">العنوان:</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-stone-300"
              />
            </div>
            <div>
              <label className="font-bold text-stone-700 block mb-1">ملاحظات العميل:</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-stone-300"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-white text-stone-700 rounded-lg border"
              >
                إلغاء
              </button>
              <button type="submit" className="px-4 py-1 bg-amber-800 text-white font-bold rounded-lg">
                حفظ التعديلات
              </button>
            </div>
          </form>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Quick Metrics */}
          {(() => {
            const validOrders = ordersList.filter((o) => o.status !== 'CANCELLED');
            const totalPurchases = validOrders.reduce((acc, o) => acc + (o.pricing?.totalAmount || 0), 0);

            // Compute customer payments and refunds strictly from SOT collections
            const validOrderIds = new Set(validOrders.map((o) => o.orderId));
            const customerGrossPaid = (payments || [])
              .filter((p) => p.customerId === customer.customerId || validOrderIds.has(p.orderId))
              .reduce((acc, p) => acc + (p.amount || 0), 0);
            const customerRefunded = (refunds || [])
              .filter((r) => r.customerId === customer.customerId || validOrderIds.has(r.orderId))
              .reduce((acc, r) => acc + (r.amount || 0), 0);
            const customerNetPaid = Math.max(0, customerGrossPaid - customerRefunded);
            const totalRemaining = Math.max(0, totalPurchases - customerNetPaid);

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {canOrders && (
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                    <div className="text-[11px] text-stone-500 font-bold">إجمالي الطلبات</div>
                    <div className="text-xl font-black text-stone-900 mt-0.5">{validOrders.length}</div>
                  </div>
                )}
                {(canReports || canPayments) && (
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                    <div className="text-[11px] text-stone-500 font-bold">إجمالي المشتريات</div>
                    <div className="text-xl font-black text-amber-800 mt-0.5">
                      {totalPurchases} ر.س
                    </div>
                  </div>
                )}
                {(canReports || canPayments) && (
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                    <div className="text-[11px] text-stone-500 font-bold">المتبقي بذمة العميل</div>
                    <div className={`text-xl font-black mt-0.5 ${totalRemaining > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {totalRemaining} ر.س
                    </div>
                  </div>
                )}
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="text-[11px] text-stone-500 font-bold">تاريخ الانضمام</div>
                  <div className="text-xs font-black text-stone-700 mt-2">
                    {new Date(customer.createdAt).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 1. LATEST SAVED MEASUREMENTS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-amber-700" />
                سجل المقاسات المحفوظة
              </h3>
              <span className="text-xs text-stone-500">
                {measurementsList.length > 0 ? `آخر تحديث: ${new Date(measurementsList[0].date).toLocaleDateString('ar-SA')}` : 'لا توجد مقاسات مسجلة'}
              </span>
            </div>

            {measurementsList.length > 0 ? (
              <div className="space-y-3">
                {measurementsList.slice(0, 2).map((mRec, idx) => {
                  const m = mRec.measurements;
                  return (
                    <div key={mRec.id || idx} className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                        <span className="font-bold text-stone-800">
                          {idx === 0 ? '★ المقاس الحالي المعتمد' : 'مقاس سابق'}
                        </span>
                        <span>أخذ القياس: {mRec.measuredByName || 'الخياط'} ({new Date(mRec.date).toLocaleDateString('ar-SA')})</span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-xs">
                        <div className="bg-white p-2 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 block">الطول</span>
                          <span className="font-black text-amber-900 text-sm">{m.length}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 block">الكتف</span>
                          <span className="font-black text-stone-900 text-sm">{m.shoulder}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 block">الصدر</span>
                          <span className="font-black text-stone-900 text-sm">{m.chest}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 block">طول الكم</span>
                          <span className="font-black text-stone-900 text-sm">{m.sleeveLength}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 block">الرقبة</span>
                          <span className="font-black text-stone-900 text-sm">{m.neck}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 block">الكبك</span>
                          <span className="font-black text-stone-900 text-sm">{m.wrist}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 block">الداير</span>
                          <span className="font-black text-stone-900 text-sm">{m.bottomWidth}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-400 block">الخصر</span>
                          <span className="font-black text-stone-900 text-sm">{m.waist}</span>
                        </div>
                      </div>

                      {mRec.notes && (
                        <p className="text-xs text-stone-600 mt-2 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                          ملاحظات المقاس: {mRec.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                <p className="text-xs text-stone-500">لم يتم تسجيل مقاسات لهذا العميل حتى الآن</p>
                {canOrders && (
                  <button
                    onClick={onNewOrder}
                    className="mt-2 text-xs font-black text-amber-800 hover:underline cursor-pointer"
                  >
                    + أخذ مقاسات وبدء تفصيل طلب الآن
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. PREVIOUS ORDERS HISTORY & REPEAT ACTION - Only if Orders permission enabled */}
          {canOrders && (
            <div>
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-amber-700" />
                سجل الطلبات السابقة وإمكانية التكرار السريع
              </h3>

              {ordersList.length > 0 ? (
                <div className="space-y-3">
                  {ordersList.map((order) => (
                    <div
                      key={order.orderId}
                      className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-stone-900 font-mono">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                            {order.garmentType}
                          </span>
                          <span className="text-xs text-stone-500">
                            ({order.quantity} {order.quantity === 1 ? 'ثوب' : 'ثياب'})
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 mt-1 flex items-center gap-3">
                          <span>بتاريخ: {new Date(order.orderDate).toLocaleDateString('ar-SA')}</span>
                          <span>القماش: {order.tailoringDetails?.fabric?.name || 'قماش مخصص'}</span>
                          <span className="font-black text-stone-900">{order.pricing?.totalAmount} ر.س</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="px-2.5 py-2 text-stone-700 hover:text-amber-900 bg-white hover:bg-amber-50 rounded-xl border border-stone-200 hover:border-amber-300 transition-all text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="عرض تفاصيل الطلب والحالة المالية"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-700" />
                          عرض
                        </button>

                        {onEditOrder && (
                          <button
                            onClick={() => onEditOrder(order)}
                            className="px-2.5 py-2 text-amber-900 hover:text-white bg-white hover:bg-amber-700 rounded-xl border border-amber-200 transition-all text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="تعديل تفاصيل ومقاسات الطلب"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWhatsAppOrder(order);
                            setIsWhatsAppOpen(true);
                          }}
                          className="p-2 text-emerald-700 hover:text-white bg-white hover:bg-emerald-600 rounded-xl border border-emerald-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="مراسلة العميل عبر واتساب بخصوص هذا الطلب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">واتساب</span>
                        </button>

                        <button
                          onClick={() => onPrintOrder(order)}
                          className="p-2 text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="طباعة نموذج التفصيل"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          طباعة
                        </button>

                        <button
                          onClick={() => onRepeatOrder(order)}
                          className="px-3 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          title="نسخ وتكرار هذا الطلب بمقاساته ومواصفاته كاملة"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          تكرار
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <p className="text-xs text-stone-500">لا توجد طلبات سابقة مسجلة</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Customer Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
                تأكيد حذف العميل
              </h3>
              <button
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="text-rose-200 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-stone-800">
                هل أنت متأكد من حذف العميل <span className="text-rose-700 underline underline-offset-4">"{customer.fullName}"</span>؟
              </p>

              {ordersList.length > 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 leading-relaxed font-bold flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-rose-800 text-sm">
                      لا يمكن حذف هذا العميل لوجود طلبات مسجلة باسمه. يمكنك الاحتفاظ بسجله بدلًا من حذفه.
                    </p>
                    <p className="text-stone-600 mt-1 font-normal text-xs">
                      يحتوي سجله على ({ordersList.length}) طلبات مسجلة للحفاظ على التاريخ المالي والمحاسبي.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-500 leading-relaxed">
                  سيتم حذف بطاقة العميل وسجل قياساته ({measurementsList.length} قياس مسجل) بشكل نهائي من المتجر.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {ordersList.length > 0 ? 'إغلاق' : 'إلغاء'}
                </button>
                {ordersList.length === 0 && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {isDeleting ? (
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Order Detail Modal if opened from Customer Profile */}
      {selectedOrderForDetail && (
        <OrderDetailModal
          order={selectedOrderForDetail}
          onClose={() => setSelectedOrderForDetail(null)}
          onPrint={() => {
            const ord = selectedOrderForDetail;
            setSelectedOrderForDetail(null);
            onPrintOrder(ord);
          }}
          onRepeat={() => {
            const ord = selectedOrderForDetail;
            setSelectedOrderForDetail(null);
            onRepeatOrder(ord);
          }}
          onEdit={onEditOrder ? () => {
            const ord = selectedOrderForDetail;
            setSelectedOrderForDetail(null);
            onEditOrder(ord);
          } : undefined}
        />
      )}

      {/* WhatsApp Modal */}
      {isWhatsAppOpen && (
        <WhatsAppModal
          isOpen={isWhatsAppOpen}
          onClose={() => {
            setIsWhatsAppOpen(false);
            setSelectedWhatsAppOrder(null);
          }}
          customerName={customer.fullName}
          phone={customer.phone}
          orderNumber={selectedWhatsAppOrder?.orderNumber}
          orderStatus={selectedWhatsAppOrder?.status}
          shopName={currentShop?.name || currentShop?.shopName}
        />
      )}
    </div>
  );
};
