import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { ORDER_STATUS_LABELS } from '../../utils/presets';
import { calculateOrderFinancials } from '../../utils/financialCalculations';
import { OrderDetailModal } from './OrderDetailModal';
import { WhatsAppModal } from '../whatsapp/WhatsAppModal';
import {
  ShoppingBag,
  Plus,
  Search,
  Printer,
  Copy,
  Calendar,
  Phone,
  Clock,
  CheckCircle2,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';

export const OrderListView: React.FC = () => {
  const {
    orders,
    payments,
    refunds,
    deleteOrder,
    updateOrderStatus,
    setActiveTab,
    setOrderToPrint,
    startRepeatOrder,
    startEditOrder,
  } = useShop();
  const { currentShop } = useAuth();

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [orderToCancelWithWarning, setOrderToCancelWithWarning] = useState<Order | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [whatsAppOrder, setWhatsAppOrder] = useState<Order | null>(null);

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete || isDeletingOrder) return;
    setIsDeletingOrder(true);
    try {
      await deleteOrder(orderToDelete.orderId);
      if (selectedOrder?.orderId === orderToDelete.orderId) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
    } catch (err: any) {
      console.error('Error deleting order:', err);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancelWithWarning || isCancellingOrder) return;
    setIsCancellingOrder(true);
    try {
      await updateOrderStatus(
        orderToCancelWithWarning.orderId,
        'CANCELLED',
        'إلغاء الطلب من قائمة الطلبات مع وجود دفعات مسجلة سابقة'
      );
      setOrderToCancelWithWarning(null);
    } catch (err: any) {
      console.error('Error cancelling order:', err);
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = selectedStatus === 'ALL' || o.status === selectedStatus;
    const matchesSearch =
      (o?.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (o?.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (o?.customerPhone || '').includes(search);
    return matchesStatus && matchesSearch;
  });

  const statuses: { id: string; label: string }[] = [
    { id: 'ALL', label: 'جميع الطلبات' },
    { id: 'NEW', label: 'جديد' },
    { id: 'CUTTING', label: 'في القص' },
    { id: 'SEWING', label: 'في الخياطة' },
    { id: 'FITTING', label: 'بروفة' },
    { id: 'READY', label: 'جاهز للاستلام' },
    { id: 'DELIVERED', label: 'تم التسليم' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-700" />
            سجل أوامر التفصيل والخياطة
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            متابعة مراحل الإنتاج، طباعة نماذج التفصيل، وإدارة تسليم الثياب
          </p>
        </div>

        <button
          onClick={() => setActiveTab('new_order')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-black shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          إنشاء طلب تفصيل جديد
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-stone-400 absolute right-4 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الطلب (مثال: ORD-...)، اسم العميل، أو رقم الجوال..."
            className="w-full pl-4 pr-12 py-3 text-sm bg-white rounded-2xl border border-stone-200 font-bold focus:border-amber-700 focus:outline-none shadow-xs transition-all"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {statuses.map((st) => {
            const count = st.id === 'ALL' ? orders.length : orders.filter((o) => o.status === st.id).length;
            const isSelected = selectedStatus === st.id;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-amber-900 text-white' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List / Cards Grid */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const statusConfig = ORDER_STATUS_LABELS[order.status] || {
            label: order.status,
            color: '#333',
            bg: '#eee',
          };

          // Calculate Canonical Financials for this specific order
          const fin = calculateOrderFinancials(order, payments || [], refunds || []);
          const orderTotal = fin.totalAmount;
          const orderRemaining = fin.activeRemaining;

          return (
            <div
              key={order.orderId}
              onClick={() => setSelectedOrder(order)}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs hover:shadow-md hover:border-amber-600 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              {/* Order Info & Customer */}
              <div className="flex items-start gap-4">
                <div className="px-3 py-2 rounded-2xl bg-stone-100 group-hover:bg-amber-100 text-stone-800 group-hover:text-amber-900 flex flex-col items-center justify-center shrink-0 border border-stone-200 transition-colors">
                  <span className="text-[10px] font-bold text-stone-500">طلب</span>
                  <span className="font-mono font-black text-xs">{order.orderNumber}</span>
                </div>

                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-black text-sm text-stone-900 group-hover:text-amber-800 transition-colors">
                      {order.customerName}
                    </span>
                    <span className="text-xs text-stone-400 font-mono">({order.customerPhone})</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWhatsAppOrder(order);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-[11px] font-bold transition-all cursor-pointer"
                      title="مراسلة العميل عبر واتساب"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600 group-hover:text-emerald-500" />
                      <span>واتساب</span>
                    </button>
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-3 text-xs text-stone-500 mt-1.5">
                    <span className="font-bold text-stone-700 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                      {order.garmentType} ({order.quantity} ثياب)
                    </span>
                    <span>القماش: {order.tailoringDetails?.fabric?.name || 'قماش مخصص'}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      التسليم: {new Date(order.deliveryDate).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                <div className="text-right">
                  <div className="text-sm font-black text-stone-900">{orderTotal} ر.س</div>
                  <div className="text-[11px] text-stone-400">
                    {fin.isCancelled ? (
                      fin.unrefundedLiability > 0 ? (
                        <span className="text-rose-700 font-bold">بانتظار استرداد: {fin.unrefundedLiability} ر.س</span>
                      ) : (
                        <span className="text-stone-400 font-semibold">ملغي (لا يوجد رصيد)</span>
                      )
                    ) : orderRemaining > 0 ? (
                      <span className="text-amber-800 font-bold">متبقي: {orderRemaining} ر.س</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">مدفوع بالكامل ✓</span>
                    )}
                  </div>
                  {fin.hasFinancialMismatch && (
                    <div className="mt-0.5">
                      <span
                        className="inline-block text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold"
                        title={fin.mismatchReason}
                      >
                        ⚠️ يحتاج مراجعة مالية
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {order.status === 'READY' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWhatsAppOrder(order);
                      }}
                      className="px-2.5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl border border-emerald-500 transition-all text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="إبلاغ العميل بجاهزية الثوب عبر واتساب"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-100" />
                      <span className="hidden sm:inline">إبلاغ بالجاهزية</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWhatsAppOrder(order);
                      }}
                      className="p-2 text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 rounded-xl border border-emerald-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="مراسلة العميل عبر واتساب"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                    className="p-2 text-stone-700 hover:text-amber-900 bg-stone-50 hover:bg-amber-50 rounded-xl border border-stone-200 hover:border-amber-300 transition-all text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="عرض تفاصيل الطلب والحالة المالية"
                  >
                    <Eye className="w-4 h-4 text-amber-700" />
                    <span>عرض</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditOrder(order);
                    }}
                    className="p-2 text-amber-900 hover:text-white bg-amber-50 hover:bg-amber-700 rounded-xl border border-amber-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="تعديل تفاصيل ومقاسات الطلب"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>تعديل</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOrderToPrint(order);
                    }}
                    className="p-2 text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="طباعة نموذج أمر التفصيل"
                  >
                    <Printer className="w-4 h-4 text-stone-500" />
                    <span className="hidden sm:inline">طباعة</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRepeatOrder(order);
                    }}
                    className="p-2 text-stone-700 hover:text-stone-900 bg-stone-50 hover:bg-stone-200 rounded-xl border border-stone-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="تكرار ونسخ هذا الطلب"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">تكرار</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOrderToDelete(order);
                    }}
                    className="p-2 text-stone-400 hover:text-rose-600 bg-stone-50 hover:bg-rose-50 rounded-xl border border-stone-200 hover:border-rose-300 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="حذف هذا الطلب"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-600">لا توجد طلبات مطابقة للفلتر المحدد</p>
            <button
              onClick={() => setActiveTab('new_order')}
              className="mt-3 px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-black"
            >
              + إنشاء طلب جديد الآن
            </button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPrint={() => {
            setOrderToPrint(selectedOrder);
            setSelectedOrder(null);
          }}
          onRepeat={() => {
            startRepeatOrder(selectedOrder);
            setSelectedOrder(null);
          }}
          onEdit={() => {
            startEditOrder(selectedOrder);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Cancel Order with Payments Warning Modal */}
      {orderToCancelWithWarning && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-amber-800 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                تأكيد إلغاء أمر التفصيل
              </h3>
              <button
                disabled={isCancellingOrder}
                onClick={() => setOrderToCancelWithWarning(null)}
                className="text-amber-200 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {(() => {
                const fin = calculateOrderFinancials(orderToCancelWithWarning, payments || [], refunds || []);
                const cancelPaid = fin.grossPaid;
                return (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed font-semibold">
                    هذا الطلب يحتوي على دفعات فعلية مسجلة بالسجل بقيمة <b className="font-black text-amber-900 text-sm">{cancelPaid} ر.س</b>. إلغاء الطلب لن يحذف دفعات العميل المسجلة. يمكنك إرجاع المبلغ للعميل عبر سند استرداد.
                  </div>
                );
              })()}

              <p className="text-xs text-stone-600 font-medium leading-relaxed">
                عند تأكيد الإلغاء، ستتغير حالة الطلب ({orderToCancelWithWarning.orderNumber}) إلى (ملغي)، ويُستبعد من إجمالي مبيعات وطلبات المتجر في لوحة التحكم والتقارير.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isCancellingOrder}
                  onClick={() => setOrderToCancelWithWarning(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  disabled={isCancellingOrder}
                  onClick={handleConfirmCancelOrder}
                  className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isCancellingOrder ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ الإلغاء...</span>
                    </>
                  ) : (
                    <span>تأكيد إلغاء الطلب</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation or Blocked Modal */}
      {orderToDelete && (() => {
        const fin = calculateOrderFinancials(orderToDelete, payments || [], refunds || []);
        const hasLegacyPaid = (orderToDelete.pricing?.paidAmount || 0) > 0;
        const deleteBlocked = fin.grossPaid > 0 || hasLegacyPaid;
        const displayPaid = fin.grossPaid > 0 ? fin.grossPaid : (orderToDelete.pricing?.paidAmount || 0);

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
              <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
                <h3 className="font-black text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-300" />
                  {deleteBlocked ? 'تعذر الحذف النهائي للطلب' : 'تأكيد حذف أمر التفصيل'}
                </h3>
                <button
                  disabled={isDeletingOrder}
                  onClick={() => setOrderToDelete(null)}
                  className="text-rose-200 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                {deleteBlocked ? (
                  <>
                    <p className="text-sm font-bold text-stone-900">
                      لا يمكن حذف الطلب رقم <span className="text-rose-700 font-mono">({orderToDelete.orderNumber})</span> نهائياً.
                    </p>

                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2">
                      <p className="font-bold">
                        يحتوي هذا الطلب على سجلات مالية مسجلة بقيمة <span className="font-black text-rose-950">{displayPaid} ر.س</span>.
                      </p>
                      <p className="text-rose-700 text-[11px] leading-relaxed">
                        حذف هذا الطلب سيتسبب في وجود دفعات غير مرتبطة بطلب وتشويه سجلات المتجر. يرجى إلغاء الطلب بدلاً من حذفه.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setOrderToDelete(null)}
                        className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                      >
                        إغلاق
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const target = orderToDelete;
                          setOrderToDelete(null);
                          setOrderToCancelWithWarning(target);
                        }}
                        className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        إلغاء الطلب بدلاً من حذفه
                      </button>
                    </div>
                  </>
                ) : (
                <>
                  <p className="text-sm font-bold text-stone-800">
                    هل أنت متأكد من حذف الطلب رقم <span className="text-rose-700 font-mono underline underline-offset-4">({orderToDelete.orderNumber})</span> للعميل <span className="font-black">{orderToDelete.customerName}</span>؟
                  </p>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 space-y-1">
                    <div className="flex justify-between">
                      <span>نوع الثوب:</span>
                      <span className="font-bold text-stone-800">{orderToDelete.garmentType} ({orderToDelete.quantity} ثياب)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي المبلغ:</span>
                      <span className="font-bold text-stone-800">{orderToDelete.pricing?.totalAmount} ر.س</span>
                    </div>
                  </div>

                  <p className="text-xs text-rose-600 font-semibold leading-relaxed">
                    ⚠️ تحذير: سيتم حذف أمر التفصيل ومقاساته المخصصة نهائياً من سجلات المتجر وتحديث الإحصائيات مباشرة.
                  </p>

                  <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                    <button
                      type="button"
                      disabled={isDeletingOrder}
                      onClick={() => setOrderToDelete(null)}
                      className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingOrder}
                      onClick={handleConfirmDeleteOrder}
                      className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      {isDeletingOrder ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>جارٍ الحذف...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الطلب</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* WhatsApp Chat Modal */}
      {whatsAppOrder && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppOrder)}
          onClose={() => setWhatsAppOrder(null)}
          customerName={whatsAppOrder.customerName}
          phone={whatsAppOrder.customerPhone}
          orderNumber={whatsAppOrder.orderNumber}
          orderStatus={whatsAppOrder.status}
          shopName={currentShop?.name || currentShop?.shopName}
        />
      )}
    </div>
  );
};
