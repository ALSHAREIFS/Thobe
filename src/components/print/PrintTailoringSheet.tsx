import React, { useState, useEffect } from 'react';
import { formatCurrency, getCurrencySymbol } from '../../utils/currencyFormatting';
import { Order, Payment, Refund, PAYMENT_METHOD_MAP } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { TailorService } from '../../services/firebaseService';
import { getUnitLabel } from '../../utils/measurementConversion';
import { formatMeasurementDisplay, getMeasurementNumeralPreference } from '../../utils/measurementNormalization';
import { getOrderVatSnapshot } from '../../utils/vatCalculations';
import { Printer, X, Scissors, Phone, MapPin, Calendar, User, ShieldCheck, Check, ArrowRight, Receipt, CreditCard } from 'lucide-react';
import {
  CollarRegularIcon,
  CollarMandarinIcon,
  CollarRoyalIcon,
  CollarKuwaitiIcon,
  CollarRoundIcon,
  CuffChamferedIcon,
  CuffSquareIcon,
  CuffRoundIcon,
  SleevePlainIcon,
  PocketChamferedIcon,
  PocketSquareIcon,
  PlacketVisibleIcon,
  PlacketHiddenIcon,
  BottomWideHemIcon,
  BottomSlitsIcon,
} from '../visuals/OptionIcons';

interface PrintTailoringSheetProps {
  order: Order;
  onClose: () => void;
}

export const PrintTailoringSheet: React.FC<PrintTailoringSheetProps> = ({ order, onClose }) => {
  const { currentShop } = useAuth();
  const { payments: contextPayments, refunds: contextRefunds } = useShop();
  const [directPayments, setDirectPayments] = useState<Payment[]>([]);
  const [directRefunds, setDirectRefunds] = useState<Refund[]>([]);
  const [showNotification, setShowNotification] = useState(true);

  // Fetch real payment and refund documents directly from Firestore for this order
  useEffect(() => {
    const shopId = currentShop?.shopId || order.shopId;
    if (!shopId || !order.orderId) return;

    let isMounted = true;
    Promise.all([
      TailorService.getPayments(shopId, order.orderId).catch(() => []),
      TailorService.getRefunds(shopId, order.orderId).catch(() => []),
    ]).then(([pays, refs]) => {
      if (isMounted) {
        setDirectPayments(pays);
        setDirectRefunds(refs);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentShop?.shopId, order.shopId, order.orderId]);

  // Combine context and direct payments by paymentId to ensure real Firestore documents
  const allCandidatePayments = [...directPayments, ...(contextPayments || []).filter(
    (pay) => pay.orderId === order.orderId || (pay.orderNumber && pay.orderNumber === order.orderNumber)
  )];

  const orderPaymentsMap = new Map<string, Payment>();
  allCandidatePayments.forEach((p) => {
    if (p.paymentId) {
      orderPaymentsMap.set(p.paymentId, p);
    }
  });
  const orderPayments = Array.from(orderPaymentsMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Combine context and direct refunds
  const allCandidateRefunds = [...directRefunds, ...(contextRefunds || []).filter(
    (ref) => ref.orderId === order.orderId || (ref.orderNumber && ref.orderNumber === order.orderNumber)
  )];

  const orderRefundsMap = new Map<string, Refund>();
  allCandidateRefunds.forEach((r) => {
    if (r.refundId) {
      orderRefundsMap.set(r.refundId, r);
    }
  });
  const orderRefunds = Array.from(orderRefundsMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Source of Truth Financial Calculations
  const grossPaid = orderPayments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
  const totalRefunds = orderRefunds.reduce((acc, ref) => acc + (ref.amount || 0), 0);
  const netPaid = Math.max(0, grossPaid - totalRefunds);
  const totalAmount = order.pricing?.totalAmount || 0;
  const remainingAmount = Math.max(0, totalAmount - netPaid);

  // Order-level immutable VAT snapshot
  const vatSnapshot = getOrderVatSnapshot(order);
  const effectiveTaxNumber =
    vatSnapshot.vatRegistrationNumber ||
    currentShop?.vatRegistrationNumber ||
    currentShop?.taxNumber ||
    currentShop?.vatNumber ||
    '';

  const paymentMethodsSummary = orderPayments.length > 0
    ? Array.from(new Set(orderPayments.map((pay) => PAYMENT_METHOD_MAP[pay.method] || pay.method))).join(' + ')
    : '';

  // Auto-hide the top floating notification after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const m = order.measurements;
  const td = order.tailoringDetails;
  const p = order.pricing;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex flex-col items-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto"
    >
      {/* Top Floating Notification Bar (Auto-hides in 2s, X button dismisses it only) */}
      {showNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-stone-900/95 backdrop-blur-md text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 print:hidden border border-stone-700 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap">نموذج أمر التفصيل والقص (A4)</span>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة النموذج (Ctrl+P)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNotification(false)}
            className="w-7 h-7 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="إخفاء هذا التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Persistent Subtle Top-Right Control Bar for convenient Print & Close when notification is hidden */}
      <div className="fixed top-3 left-3 sm:left-4 z-55 flex items-center gap-2 print:hidden">
        {!showNotification && (
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer"
            title="طباعة (Ctrl+P)"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs font-bold shadow-lg border border-stone-700 transition-all cursor-pointer"
          title="إغلاق والعودة"
        >
          <X className="w-4 h-4" />
          <span>إغلاق</span>
        </button>
      </div>

      {/* The Printable A4 Sheet Container */}
      <div
        id="tailoring-print-sheet"
        className="w-full max-w-[850px] bg-white text-stone-950 p-3 sm:p-8 rounded-2xl shadow-2xl my-4 sm:my-8 print:my-0 print:p-4 print:shadow-none print:w-full print:rounded-none border border-stone-300 text-xs"
        style={{ fontFamily: 'Tajawal, sans-serif' }}
      >
        {/* 1. SHOP HEADER & BARCODE */}
        <div className="border-b-2 border-stone-900 pb-4 mb-4 flex flex-col sm:flex-row print:flex-row items-start justify-between gap-4">
          <div className="flex items-start sm:items-center print:items-center gap-3 w-full sm:w-auto print:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-900 text-white flex items-center justify-center font-black text-2xl border-2 border-amber-800 shrink-0">
              ث
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-950">{currentShop?.shopName || currentShop?.name || 'المقص الذهبي للخياطة'}</h1>
              <p className="text-xs text-stone-600 font-bold">للخياطة الرجالية الراقية وتفصيل الثياب</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] text-stone-500 mt-1">
                {currentShop?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-stone-400" /> {currentShop.phone}
                  </span>
                )}
                  {(currentShop?.city || currentShop?.address) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" /> {currentShop?.city ? currentShop.city + (currentShop?.address ? ' - ' : '') : ''}{currentShop?.address || ''}
                    </span>
                  )}
                {effectiveTaxNumber && (
                  <span className="font-mono">الرقم الضريبي: {effectiveTaxNumber}</span>
                )}
              </div>
            </div>
          </div>

          {/* Barcode & Order Number Ticket */}
          <div className="text-left bg-stone-100 p-2.5 rounded-xl border border-stone-300 w-full sm:w-auto print:w-auto">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center justify-between sm:justify-end print:justify-end gap-2">
              <span>أمر تفصيل رقم</span>
              {(vatSnapshot.vatEnabled && (currentShop?.country === 'SA' && currentShop?.currency === 'SAR')) && (
                <span className="text-[8px] font-black text-blue-900 bg-blue-100 px-1 py-0.5 rounded border border-blue-200">
                  فاتورة ضريبية مبسطة
                </span>
              )}
            </div>
            <div className="text-lg font-black text-stone-950 font-mono tracking-wider">{order.orderNumber}</div>
            {/* Visual Simulated Barcode */}
            <div className="h-6 w-full sm:w-32 print:w-32 bg-stone-900 my-1 flex items-center justify-center text-[8px] text-white tracking-[0.3em] font-mono mx-auto sm:mx-0 print:mx-0">
              ||||| | |||| ||| ||
            </div>
            <div className="text-[9px] text-stone-500 text-center font-mono">{order.orderNumber}</div>
          </div>
        </div>

        {/* 2. CUSTOMER & ORDER INFO GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-300 mb-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-stone-500 block">اسم العميل:</span>
            <span className="font-black text-sm text-stone-900">{order.customerName}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-500 block">رقم الجوال:</span>
            <span className="font-bold text-stone-900 font-mono text-sm">{order.customerPhone}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-500 block">تاريخ الطلب:</span>
            <span className="font-bold text-stone-800">
              {new Date(order.orderDate).toLocaleDateString('ar-SA')}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-500 block">موعد الاستلام:</span>
            <span className="font-black text-amber-900 text-sm bg-amber-100 px-2 py-0.5 rounded">
              {new Date(order.deliveryDate).toLocaleDateString('ar-SA')}
            </span>
          </div>
        </div>

        {/* 3. MEASUREMENTS TABLE (دفتر المقاسات الدقيق) */}
        <div className="mb-4">
          <div className="flex items-center justify-between bg-stone-900 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-amber-400" /> جدول المقاسات ({getUnitLabel(order.measurementUnit)})
            </span>
            <div className="flex items-center gap-3">
              <span className="text-amber-300 hidden sm:inline print:inline">وحدة القياس: {getUnitLabel(order.measurementUnit)}</span>
              <span>عدد الثياب: {order.quantity}</span>
            </div>
          </div>

          <div className="hidden sm:block print:block">
            <table className="w-full border-collapse border border-stone-300 text-center text-xs">
              <thead>
                <tr className="bg-stone-100 font-bold text-stone-800">
                  <th className="border border-stone-300 py-1.5 px-1">طول الثوب</th>
                  <th className="border border-stone-300 py-1.5 px-1">الكتف</th>
                  <th className="border border-stone-300 py-1.5 px-1">الصدر</th>
                  <th className="border border-stone-300 py-1.5 px-1">الخصر</th>
                  <th className="border border-stone-300 py-1.5 px-1">الوسط</th>
                  <th className="border border-stone-300 py-1.5 px-1">طول الكم</th>
                  <th className="border border-stone-300 py-1.5 px-1">الكبك</th>
                  <th className="border border-stone-300 py-1.5 px-1">الرقبة</th>
                  <th className="border border-stone-300 py-1.5 px-1">الداير</th>
                  <th className="border border-stone-300 py-1.5 px-1">الجيرو</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-black text-sm text-stone-950 bg-white">
                  <td className="border border-stone-300 py-2 bg-amber-50 text-amber-950 font-black text-base">{formatMeasurementDisplay(m.length, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2">{formatMeasurementDisplay(m.shoulder, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2">{formatMeasurementDisplay(m.chest, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2">{formatMeasurementDisplay(m.waist, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2">{formatMeasurementDisplay(m.hips, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2 bg-amber-50 text-amber-950">{formatMeasurementDisplay(m.sleeveLength, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2">{formatMeasurementDisplay(m.wrist, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2">{formatMeasurementDisplay(m.neck, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2">{formatMeasurementDisplay(m.bottomWidth, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                  <td className="border border-stone-300 py-2">{formatMeasurementDisplay(m.armhole, { numeralSystem: getMeasurementNumeralPreference() })}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-2 gap-2 p-3 bg-white border border-stone-300 border-t-0 rounded-b-lg sm:hidden print:hidden text-xs">
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="text-stone-500 font-bold">طول الثوب:</span>
              <span className="font-black text-amber-900">{formatMeasurementDisplay(m.length, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="text-stone-500 font-bold">الكتف:</span>
              <span className="font-black text-stone-900">{formatMeasurementDisplay(m.shoulder, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="text-stone-500 font-bold">الصدر:</span>
              <span className="font-black text-stone-900">{formatMeasurementDisplay(m.chest, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="text-stone-500 font-bold">الخصر:</span>
              <span className="font-black text-stone-900">{formatMeasurementDisplay(m.waist, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="text-stone-500 font-bold">الوسط:</span>
              <span className="font-black text-stone-900">{formatMeasurementDisplay(m.hips, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="text-stone-500 font-bold">طول الكم:</span>
              <span className="font-black text-amber-900">{formatMeasurementDisplay(m.sleeveLength, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="text-stone-500 font-bold">الكبك:</span>
              <span className="font-black text-stone-900">{formatMeasurementDisplay(m.wrist, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-1">
              <span className="text-stone-500 font-bold">الرقبة:</span>
              <span className="font-black text-stone-900">{formatMeasurementDisplay(m.neck, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 font-bold">الداير:</span>
              <span className="font-black text-stone-900">{formatMeasurementDisplay(m.bottomWidth, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 font-bold">الجيرو:</span>
              <span className="font-black text-stone-900">{formatMeasurementDisplay(m.armhole, { numeralSystem: getMeasurementNumeralPreference() })}</span>
            </div>
          </div>
        </div>

        {/* 4. VISUAL TAILORING SPECIFICATIONS (خيارات ورسوم التفصيل) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3 mb-4">
          {/* Card 1: Collar Specs with SVG */}
          <div className="p-3 rounded-xl border-2 border-stone-300 bg-white flex flex-col items-center text-center">
            <span className="text-[11px] font-black text-stone-700 border-b border-stone-200 pb-1 w-full">
              الياقة (القلاب)
            </span>
            <div className="w-14 h-14 my-1">
              {td.collar.type === 'regular' && <CollarRegularIcon selected={true} />}
              {td.collar.type === 'mandarin' && <CollarMandarinIcon selected={true} />}
              {td.collar.type === 'royal' && <CollarRoyalIcon selected={true} />}
              {td.collar.type === 'kuwaiti' && <CollarKuwaitiIcon selected={true} />}
              {td.collar.type === 'round' && <CollarRoundIcon selected={true} />}
              {!['regular', 'mandarin', 'royal', 'kuwaiti', 'round'].includes(td.collar.type) && (
                <CollarRegularIcon selected={true} />
              )}
            </div>
            <div className="font-black text-xs text-stone-900">{td.collar.name || 'غير محدد'}</div>
            <div className="text-[10px] text-stone-600 mt-0.5">
              حشوة: {td.collar.stiffness === 'stiff' ? 'قاسية (واقفة)' : td.collar.stiffness === 'medium' ? 'وسط' : td.collar.stiffness === 'soft' ? 'طرية' : 'غير محدد'} | أزرار: {td.collar.buttonsCount ?? 'غير محدد'}
            </div>
            <div className="text-[10px] text-stone-600">ارتفاع: {td.collar.height ? `${td.collar.height} سم` : 'غير محدد'}</div>
          </div>

          {/* Card 2: Sleeves & Cuff Specs with SVG */}
          <div className="p-3 rounded-xl border-2 border-stone-300 bg-white flex flex-col items-center text-center">
            <span className="text-[11px] font-black text-stone-700 border-b border-stone-200 pb-1 w-full">
              الأكمام والكبك
            </span>
            <div className="w-14 h-14 my-1">
              {td.sleeves.type === 'cuff_chamfered' && <CuffChamferedIcon selected={true} />}
              {td.sleeves.type === 'cuff_square' && <CuffSquareIcon selected={true} />}
              {td.sleeves.type === 'cuff_round' && <CuffRoundIcon selected={true} />}
              {td.sleeves.type === 'plain' && <SleevePlainIcon selected={true} />}
              {!['cuff_chamfered', 'cuff_square', 'cuff_round', 'plain'].includes(td.sleeves.type) && (
                <CuffChamferedIcon selected={true} />
              )}
            </div>
            <div className="font-black text-xs text-stone-900">{td.sleeves.name || 'غير محدد'}</div>
            <div className="text-[10px] text-stone-600 mt-0.5">
              حشوة: {td.sleeves.cuffStiffness === 'stiff' ? 'قاسية' : td.sleeves.cuffStiffness === 'medium' ? 'وسط' : td.sleeves.cuffStiffness === 'soft' ? 'طرية' : 'غير محدد'} | عرض: {td.sleeves.cuffWidth ? `${td.sleeves.cuffWidth} سم` : 'غير محدد'}
            </div>
            <div className="text-[10px] text-stone-600">
              القفل: {td.sleeves.buttonStyle === 'stud' ? 'كبك حر' : td.sleeves.buttonStyle === 'hidden' ? 'زرار مخفي' : td.sleeves.buttonStyle === 'visible' ? 'زرار ظاهر' : 'غير محدد'}
            </div>
          </div>

          {/* Card 3: Chest & Pocket Specs with SVG */}
          <div className="p-3 rounded-xl border-2 border-stone-300 bg-white flex flex-col items-center text-center">
            <span className="text-[11px] font-black text-stone-700 border-b border-stone-200 pb-1 w-full">
              الصدر والجيوب
            </span>
            <div className="w-14 h-14 my-1">
              {td.pockets.chestPocketType === 'chamfered' ? (
                <PocketChamferedIcon selected={true} />
              ) : (
                <PocketSquareIcon selected={true} />
              )}
            </div>
            <div className="font-black text-xs text-stone-900">{td.chest.name || 'غير محدد'}</div>
            <div className="text-[10px] text-stone-600 mt-0.5">
              الجيب: {td.pockets.chestPocketType === 'chamfered' ? 'مشطوف' : td.pockets.chestPocketType === 'regular' ? 'مربع' : td.pockets.chestPocketType === 'square_flap' ? 'مع غطاء' : td.pockets.chestPocketType === 'hidden' ? 'مخفي' : td.pockets.chestPocketType === 'none' ? 'بدون' : 'غير محدد'} | جيوب الجوانب: {td.pockets.sidePocketsCount || 'غير محدد'}
            </div>
            <div className="text-[10px] text-stone-600">
              {td.pockets.hasPenPocket ? '✓ مخبأ قلم' : ''} {td.pockets.hasMobileInnerPocket ? '✓ مخبأ جوال سري' : ''}
            </div>
          </div>
        </div>

        {/* 5. FABRIC & FINISH SPECIFICATIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-300 mb-4 text-xs">
          <div>
            <span className="font-bold text-stone-500 block text-[10px]">القماش المختار:</span>
            <div className="font-black text-stone-900 text-sm">{td.fabric.name || 'غير محدد'}</div>
            <div className="text-stone-600 mt-0.5">
              اللون: {td.fabric.color || 'غير محدد'} {td.fabric.colorCode ? `(${td.fabric.colorCode})` : ''} | الكود: {td.fabric.code || 'بدون'}
            </div>
            {td.fabric.notes?.trim() && (
              <div className="text-[10px] text-amber-900 font-bold mt-1 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200">
                ملاحظات القماش: {td.fabric.notes.trim()}
              </div>
            )}
          </div>
          <div>
            <span className="font-bold text-stone-500 block text-[10px]">الأزرار والتشطيب:</span>
            <div className="font-bold text-stone-900">{td.buttons.name || 'غير محدد'} {td.buttons.type ? `(${td.buttons.type})` : ''}</div>
            <div className="text-stone-600 mt-0.5">
              أسفل الثوب: {td.bottom.name || 'غير محدد'} | {td.specialOptions?.doubleStitching ? 'درزة دبل' : 'درزة عادية'}
            </div>
            {td.garmentNotes?.trim() && (
              <div className="text-[10px] text-amber-900 font-bold mt-1 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200">
                ملاحظات القصة: {td.garmentNotes.trim()}
              </div>
            )}
          </div>
        </div>

        {/* 6. TAILOR NOTES & INSTRUCTIONS */}
        {(td.generalNotes?.trim() ||
          order.notes?.trim() ||
          td.garmentNotes?.trim() ||
          td.collar?.notes?.trim() ||
          td.sleeves?.notes?.trim() ||
          td.pockets?.notes?.trim() ||
          td.chest?.notes?.trim() ||
          td.buttons?.notes?.trim() ||
          td.bottom?.notes?.trim() ||
          td.embroidery?.notes?.trim() ||
          td.specialOptions?.customNotes?.trim()) && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 mb-4 text-xs">
            <span className="font-black text-amber-950 block text-[11px] mb-1">
              ملاحظات وتفاصيل الخياطة المخصصة:
            </span>
            <div className="space-y-1 text-stone-800 font-bold text-[11px]">
              {td.generalNotes?.trim() && (
                <div>• <span className="text-amber-950 font-black">عام:</span> {td.generalNotes.trim()}</div>
              )}
              {td.garmentNotes?.trim() && (
                <div>• <span className="text-amber-950 font-black">القصة والنمط:</span> {td.garmentNotes.trim()}</div>
              )}
              {td.collar?.notes?.trim() && (
                <div>• <span className="text-amber-950 font-black">الياقة:</span> {td.collar.notes.trim()}</div>
              )}
              {td.sleeves?.notes?.trim() && (
                <div>• <span className="text-amber-950 font-black">الأكمام والكبك:</span> {td.sleeves.notes.trim()}</div>
              )}
              {td.pockets?.notes?.trim() && (
                <div>• <span className="text-amber-950 font-black">الجيوب:</span> {td.pockets.notes.trim()}</div>
              )}
              {td.chest?.notes?.trim() && (
                <div>• <span className="text-amber-950 font-black">الصدر والجبزور:</span> {td.chest.notes.trim()}</div>
              )}
              {td.buttons?.notes?.trim() && (
                <div>• <span className="text-amber-950 font-black">الأزرار:</span> {td.buttons.notes.trim()}</div>
              )}
              {td.bottom?.notes?.trim() && (
                <div>• <span className="text-amber-950 font-black">أسفل الثوب:</span> {td.bottom.notes.trim()}</div>
              )}
              {td.embroidery?.notes?.trim() && (
                <div>• <span className="text-amber-950 font-black">التطريز:</span> {td.embroidery.notes.trim()}</div>
              )}
              {td.specialOptions?.customNotes?.trim() && (
                <div>• <span className="text-amber-950 font-black">إضافات خاصة:</span> {td.specialOptions.customNotes.trim()}</div>
              )}
              {order.notes?.trim() && !td.generalNotes?.trim() && (
                <div>• <span className="text-amber-950 font-black">ملاحظات الطلب:</span> {order.notes.trim()}</div>
              )}
            </div>
          </div>
        )}

        {/* 7. FINANCIAL SUMMARY & SIGNATURE RECEIPT */}
        <div className="border-t-2 border-stone-900 pt-3">
          <div className="flex flex-col sm:flex-row print:flex-row items-center justify-between gap-4">
            <div className={`grid ${(vatSnapshot.vatEnabled && (currentShop?.country === 'SA' && currentShop?.currency === 'SAR')) ? 'grid-cols-2 sm:grid-cols-5 print:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3'} gap-2 text-center flex-1 w-full sm:w-auto print:w-auto`}>
              {(vatSnapshot.vatEnabled && (currentShop?.country === 'SA' && currentShop?.currency === 'SAR')) && (
                <>
                  <div className="bg-stone-50 p-2 rounded-lg border border-stone-300 flex flex-col justify-center">
                    <span className="text-[10px] text-stone-500 font-bold block">قبل الضريبة</span>
                    <span className="font-black text-stone-900 text-sm">{formatCurrency(vatSnapshot.subtotalAmount, currentShop?.currency)}</span>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 flex flex-col justify-center">
                    <span className="text-[10px] text-blue-800 font-bold block">الضريبة ({vatSnapshot.vatRate}%)</span>
                    <span className="font-black text-blue-950 text-sm">{formatCurrency(vatSnapshot.vatAmount, currentShop?.currency)}</span>
                  </div>
                </>
              )}
              <div className="bg-stone-100 p-2 rounded-lg border border-stone-300 flex flex-col justify-center">
                <span className="text-[10px] text-stone-500 font-bold block">
                  {(vatSnapshot.vatEnabled && (currentShop?.country === 'SA' && currentShop?.currency === 'SAR')) ? 'الإجمالي شامل الضريبة' : 'إجمالي المبلغ'}
                </span>
                <span className="font-black text-stone-950 text-sm">{formatCurrency(totalAmount, currentShop?.currency)}</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-300 flex flex-col justify-center">
                <span className="text-[10px] text-emerald-800 font-bold block">
                  {orderPayments.length > 1 ? 'إجمالي المقبوض' : 'العربون المدفوع'}
                </span>
                <span className="font-black text-emerald-950 text-sm">{formatCurrency(grossPaid, currentShop?.currency)}</span>
                {grossPaid > 0 ? (
                  <span className="text-[9px] text-emerald-900 font-black block mt-0.5 bg-emerald-100/90 px-1 py-0.5 rounded border border-emerald-200">
                    طريقة الدفع: {orderPayments[0] ? (PAYMENT_METHOD_MAP[orderPayments[0].method] || orderPayments[0].method) : (paymentMethodsSummary || 'نقدي')}
                  </span>
                ) : (
                  <span className="text-[9px] text-stone-500 font-semibold block mt-0.5">
                    (عند الاستلام)
                  </span>
                )}
              </div>
              <div className="bg-amber-50 p-2 rounded-lg border border-amber-300 flex flex-col justify-center">
                <span className="text-[10px] text-amber-900 font-bold block">المتبقي للاستلام</span>
                <span className="font-black text-amber-950 text-sm">{formatCurrency(remainingAmount, currentShop?.currency)}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex items-center justify-around sm:justify-start print:justify-start gap-6 text-center text-[10px] text-stone-600 shrink-0 w-full sm:w-auto print:w-auto mt-4 sm:mt-0 print:mt-0">
              <div>
                <div className="h-8 border-b border-stone-400 w-24 mb-1"></div>
                <span className="font-bold">توقيع الخياط</span>
              </div>
              <div>
                <div className="h-8 border-b border-stone-400 w-28 mb-1"></div>
                <span className="font-bold">توقيع / استلام العميل</span>
              </div>
            </div>
          </div>

          {/* Detailed Payment Receipts List from Firestore */}
          {orderPayments.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-dashed border-stone-300">
              <div className="flex items-center justify-between text-[11px] font-black text-stone-900 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-800" />
                  سجل سندات القبض والدفعات المعتمدة ({orderPayments.length}):
                </span>
                <span className="text-[10px] text-stone-600 font-bold">
                  المسدد فعلياً: <b className="text-emerald-900">{orderPayments.reduce((acc, pay) => acc + (pay.amount || 0), 0)} {getCurrencySymbol(currentShop?.currency)}</b>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-1.5">
                {orderPayments.map((pay, idx) => {
                  const methodLabel = PAYMENT_METHOD_MAP[pay.method] || pay.method || 'نقدي';
                  return (
                    <div
                      key={pay.paymentId || idx}
                      className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-stone-900">{formatCurrency(pay.amount, currentShop?.currency)}</span>
                        <span className="font-bold text-emerald-950 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300">
                          طريقة الدفع: {methodLabel}
                        </span>
                      </div>
                      <div className="text-[9px] text-stone-600 font-mono flex items-center gap-1.5">
                        <span>{new Date(pay.createdAt).toLocaleDateString('ar-SA')}</span>
                        {pay.receiptNumber && <span className="text-stone-400">#{pay.receiptNumber}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-2 border-t border-stone-200 text-center text-[9px] text-stone-400 flex items-center justify-between">
          <span>تم الإصدار بواسطة نظام ثوبي لإدارة الخياطة الرجالية</span>
          <span>المعلم المسؤول: {order.assignedTailor || 'معلم القص'}</span>
          <span>يحفظ هذا الكوبون لتقديمه عند الاستلام والبروفة</span>
        </div>
      </div>
    </div>
  );
};
