import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Customer, MeasurementData, Order, TailoringDetails, PAYMENT_METHOD_MAP } from '../../types';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import {
  DEFAULT_TAILORING_DETAILS,
  EMPTY_TAILORING_DETAILS,
  EMPTY_MEASUREMENTS,
  validateMeasurements,
  validateTailoringDetails,
  validateFabricAndPricing,
} from '../../utils/presets';
import { MeasurementForm } from '../measurements/MeasurementForm';
import { VisualOptionSelector } from '../visuals/VisualOptionSelector';
import { FabricSelector } from './FabricSelector';
import { TailorService } from '../../services/firebaseService';
import {
  User,
  UserPlus,
  Ruler,
  Scissors,
  Layers,
  Receipt,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  Printer,
  Copy,
} from 'lucide-react';

interface OrderWizardProps {
  onComplete: (order: Order) => void;
  onCancel: () => void;
  initialCustomer?: Customer | null;
  initialTemplateOrder?: Order | null;
  initialEditingOrder?: Order | null;
}

export const OrderWizard: React.FC<OrderWizardProps> = ({
  onComplete,
  onCancel,
  initialCustomer,
  initialTemplateOrder,
  initialEditingOrder,
}) => {
  const { customers, orders, payments, refunds, currentShop, showToast, createCustomer, updateOrder } = useShop();
  const { currentUser } = useAuth();
  const shopId = currentShop?.shopId || 'shop_main_01';

  const isEditingMode = Boolean(initialEditingOrder);

  // Compute actual non-cancelled order counts dynamically per customer
  const customerOrderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status !== 'CANCELLED') {
        counts[o.customerId] = (counts[o.customerId] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  // Actual verified net paid for the order being edited
  const actualNetPaid = useMemo(() => {
    if (!isEditingMode || !initialEditingOrder) return 0;
    const orderPays = payments.filter((p) => p.orderId === initialEditingOrder.orderId);
    const orderRefs = refunds.filter((r) => r.orderId === initialEditingOrder.orderId);
    const grossPaid = orderPays.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalRefunded = orderRefs.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const netFromDocs = Math.max(0, grossPaid - totalRefunded);
    return grossPaid > 0 ? netFromDocs : Number(initialEditingOrder.pricing?.paidAmount || 0);
  }, [isEditingMode, initialEditingOrder, payments, refunds]);

  // Wizard Step (1: Customer, 2: Measurements, 3: Tailoring Details, 4: Fabric & Pricing, 5: Review)
  const [step, setStep] = useState<number>(isEditingMode ? 2 : 1);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialCustomer || 
    (initialEditingOrder ? {
      customerId: initialEditingOrder.customerId,
      shopId: initialEditingOrder.shopId,
      fullName: initialEditingOrder.customerName,
      phone: initialEditingOrder.customerPhone,
      address: initialEditingOrder.customerAddress || '',
      city: 'الرياض',
      totalOrdersCount: 1,
      totalSpent: 0,
      createdAt: '',
      updatedAt: '',
    } : null)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isSavingNewCustomer, setIsSavingNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Order Details
  const [measurements, setMeasurements] = useState<MeasurementData>(
    initialEditingOrder?.measurements || initialTemplateOrder?.measurements || EMPTY_MEASUREMENTS
  );
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'inch'>('cm');

  const [tailoringDetails, setTailoringDetails] = useState<TailoringDetails>(
    initialEditingOrder?.tailoringDetails || initialTemplateOrder?.tailoringDetails || EMPTY_TAILORING_DETAILS
  );

  // Pricing & Schedule
  const [quantity, setQuantity] = useState<number>(initialEditingOrder?.quantity || initialTemplateOrder?.quantity || 1);
  const [unitPrice, setUnitPrice] = useState<number>(initialEditingOrder?.pricing?.unitPrice || initialTemplateOrder?.pricing?.unitPrice || 0);
  const [paidAmount, setPaidAmount] = useState<number>(
    initialEditingOrder ? (initialEditingOrder.pricing?.paidAmount || 0) : 0
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'stc_pay'>('cash');
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    if (initialEditingOrder?.deliveryDate) {
      return initialEditingOrder.deliveryDate.split('T')[0];
    }
    const d = new Date();
    d.setDate(d.getDate() + (currentShop?.defaultDeliveryDays || 5));
    return d.toISOString().split('T')[0];
  });
  const [assignedTailor, setAssignedTailor] = useState(initialEditingOrder?.assignedTailor || 'المعلم كمال');
  const [orderNotes, setOrderNotes] = useState(initialEditingOrder?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const isSubmittingRef = useRef(false);

  // Keyboard shortcut listener to prevent duplicate Enter/F2 triggers while saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmittingRef.current || isSubmitting || isSavedSuccessfully) {
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isSubmitting, isSavedSuccessfully]);

  // Load previous customer history or template if provided
  useEffect(() => {
    if (initialEditingOrder) {
      setMeasurements(initialEditingOrder.measurements || EMPTY_MEASUREMENTS);
      setTailoringDetails(initialEditingOrder.tailoringDetails || DEFAULT_TAILORING_DETAILS);
      if (initialEditingOrder.pricing) {
        setUnitPrice(initialEditingOrder.pricing.unitPrice || 0);
        setPaidAmount(initialEditingOrder.pricing.paidAmount || 0);
      }
      setQuantity(initialEditingOrder.quantity || 1);
      setOrderNotes(initialEditingOrder.notes || '');
      setAssignedTailor(initialEditingOrder.assignedTailor || 'المعلم كمال');
      if (initialEditingOrder.deliveryDate) {
        setDeliveryDate(initialEditingOrder.deliveryDate.split('T')[0]);
      }
      const existingCust = customers.find(c => c.customerId === initialEditingOrder.customerId);
      if (existingCust) {
        setSelectedCustomer(existingCust);
      }
      setStep(2);
    } else if (initialTemplateOrder) {
      setMeasurements(initialTemplateOrder.measurements || EMPTY_MEASUREMENTS);
      setTailoringDetails(initialTemplateOrder.tailoringDetails || EMPTY_TAILORING_DETAILS);
      if (initialTemplateOrder.pricing) {
        setUnitPrice(initialTemplateOrder.pricing.unitPrice || 0);
        setPaidAmount(0); // Never copy previous payments when duplicating an order
      } else {
        setPaidAmount(0);
      }
      setOrderNotes(`مكرر من الطلب ${initialTemplateOrder.orderNumber}`);
      const existingCust = customers.find(c => c.customerId === initialTemplateOrder.customerId);
      if (existingCust) {
        setSelectedCustomer(existingCust);
      }
      setStep(2); // Jump straight to measurements review
    }
  }, [initialTemplateOrder, initialEditingOrder, customers]);

  // Load customer measurements when a customer is selected
  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsCreatingCustomer(false);

    try {
      // Check if customer has latest order to clone
      const lastOrder = await TailorService.getLatestOrderForCustomer(shopId, cust.customerId);
      if (lastOrder && lastOrder.measurements && lastOrder.measurements.length > 0) {
        setMeasurements(lastOrder.measurements);
        setTailoringDetails(lastOrder.tailoringDetails || EMPTY_TAILORING_DETAILS);
      } else {
        const historyMeas = await TailorService.getCustomerMeasurements(shopId, cust.customerId);
        if (historyMeas.length > 0 && historyMeas[0].measurements && historyMeas[0].measurements.length > 0) {
          setMeasurements(historyMeas[0].measurements);
          setTailoringDetails(EMPTY_TAILORING_DETAILS);
        } else {
          setMeasurements(EMPTY_MEASUREMENTS);
          setTailoringDetails(EMPTY_TAILORING_DETAILS);
        }
      }
    } catch (e) {
      console.warn('Could not fetch previous customer records:', e);
      setMeasurements(EMPTY_MEASUREMENTS);
      setTailoringDetails(EMPTY_TAILORING_DETAILS);
    }
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim() || isSavingNewCustomer) {
      if (!newCustName.trim() || !newCustPhone.trim()) {
        showToast('الاسم ورقم الجوال مطلوبان لإضافة العميل', 'error');
      }
      return;
    }

    setIsSavingNewCustomer(true);
    try {
      const created = await createCustomer({
        fullName: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim(),
        city: 'الرياض',
        notes: newCustNotes.trim(),
      });
      setSelectedCustomer(created);
      setMeasurements(EMPTY_MEASUREMENTS);
      setTailoringDetails(EMPTY_TAILORING_DETAILS);
      setIsCreatingCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustNotes('');
    } catch (err: any) {
      console.error('Save customer error:', err);
    } finally {
      setIsSavingNewCustomer(false);
    }
  };

  // Pricing calculations
  const totalAmount = quantity * unitPrice;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const isTotalLessThanNetPaid = isEditingMode && actualNetPaid > 0 && totalAmount < actualNetPaid;

  // Submission handler
  const handleFinalSubmit = async () => {
    // Synchronous immediate lock guard to block rapid concurrent clicks and shortcut fires
    if (isSubmittingRef.current || isSubmitting || isSavedSuccessfully) {
      return;
    }

    if (!selectedCustomer) {
      showToast('يرجى اختيار العميل أولاً', 'error');
      setStep(1);
      return;
    }

    // Financial check: Prevent totalAmount < actualNetPaid
    if (isTotalLessThanNetPaid) {
      showToast(
        `لا يمكن حفظ التعديل: إجمالي الطلب الجديد (${totalAmount} ر.س) أقل من صافي المبلغ المقبوض فعلياً (${actualNetPaid} ر.س). يرجى تصحيح السعر أو معالجة الاسترداد أولاً.`,
        'error'
      );
      setStep(4);
      return;
    }

    // Validate essential measurements before submitting
    const measValidation = validateMeasurements(measurements);
    if (!measValidation.isValid) {
      showToast(
        `لا يمكن اعتماد الطلب بدون استكمال المقاسات الأساسية: ${measValidation.missingFields.join('، ')}`,
        'error'
      );
      setStep(2);
      return;
    }

    // Validate tailoring details before submitting
    const tailoringValidation = validateTailoringDetails(tailoringDetails);
    if (!tailoringValidation.isValid) {
      showToast(
        `يرجى إكمال خيارات التفصيل الأساسية قبل المتابعة: ${tailoringValidation.missingFields.join('، ')}`,
        'error'
      );
      setStep(3);
      return;
    }

    // Validate fabric and pricing before submitting
    const fabricPricingValidation = validateFabricAndPricing({
      fabric: tailoringDetails.fabric,
      unitPrice,
      quantity,
      paidAmount,
      paymentMethod,
      deliveryDate,
    });
    if (!fabricPricingValidation.isValid) {
      showToast(
        `يرجى استكمال بيانات القماش والتسعير قبل الاعتماد: ${fabricPricingValidation.missingFields.join('، ')}`,
        'error'
      );
      setStep(4);
      return;
    }

    // Lock both ref and state immediately
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // 1. Save measurement record for the customer
      await TailorService.saveMeasurement(shopId, selectedCustomer.customerId, {
        measurements,
        notes: measurementNotes,
        measuredBy: currentUser.userId,
        measuredByName: currentUser.fullName,
        unit: measurementUnit,
      });

      if (isEditingMode && initialEditingOrder) {
        // Update existing order - preserve verified paidAmount and calculate remaining
        const existingPaid = initialEditingOrder.pricing?.paidAmount || 0;
        const newRemaining = Math.max(0, totalAmount - existingPaid);

        const updated = await updateOrder(initialEditingOrder.orderId, {
          garmentType: tailoringDetails.garmentType,
          quantity,
          measurements,
          tailoringDetails,
          pricing: {
            ...initialEditingOrder.pricing,
            unitPrice,
            quantity,
            totalAmount,
            paidAmount: existingPaid,
            remainingAmount: newRemaining,
          },
          deliveryDate,
          assignedTailor,
          notes: orderNotes,
        });

        setIsSavedSuccessfully(true);
        onComplete(updated);
      } else {
        // 2. Create the order
        const newOrder = await TailorService.createOrder(shopId, {
          shopId: shopId,
          customerId: selectedCustomer.customerId,
          customerName: selectedCustomer.fullName,
          customerPhone: selectedCustomer.phone,
          customerAddress: selectedCustomer.address,
          status: 'NEW',
          garmentType: tailoringDetails.garmentType,
          quantity,
          measurements,
          tailoringDetails,
          pricing: {
            unitPrice,
            quantity,
            fabricCost: 0,
            extrasCost: 0,
            totalAmount,
            paidAmount,
            remainingAmount,
            taxAmount: 0,
          },
          initialPaymentMethod: paymentMethod,
          orderDate: new Date().toISOString(),
          deliveryDate,
          assignedTailor,
          notes: orderNotes,
          createdBy: currentUser.userId,
          createdByName: currentUser.fullName,
        });

        setIsSavedSuccessfully(true);
        showToast(`تم إنشاء الطلب (${newOrder.orderNumber}) بنجاح!`, 'success');
        onComplete(newOrder);
      }
    } catch (err: any) {
      // Re-enable upon failure so user can resolve issue and retry
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      showToast(err.message || 'حدث خطأ أثناء حفظ الطلب', 'error');
    }
  };

  // Filtered customer search
  const filteredCustomers = customers.filter(
    (c) =>
      (c?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c?.phone || '').includes(searchQuery)
  );

  const stepsHeader = [
    { num: 1, title: 'العميل', icon: User },
    { num: 2, title: 'المقاسات', icon: Ruler },
    { num: 3, title: 'خيارات التفصيل', icon: Scissors },
    { num: 4, title: 'القماش والتسعير', icon: Layers },
    { num: 5, title: 'مراجعة واعتماد', icon: Receipt },
  ];

  return (
    <div className="bg-slate-100 min-h-screen pb-16">
      {/* Wizard Top Step Indicator Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isEditingMode ? 'bg-amber-600' : 'bg-[#1A365D]'}`}></span>
                {isEditingMode ? `تعديل تفاصيل الطلب (${initialEditingOrder?.orderNumber})` : 'دفتر التفصيل الإلكتروني - إنشاء طلب جديد'}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedCustomer ? `العميل: ${selectedCustomer.fullName} (${selectedCustomer.phone})` : 'اختر العميل للبدء في أخذ المقاسات والتفصيل'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                إلغاء
              </button>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  السابق
                </button>
              )}
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !selectedCustomer) {
                      showToast('يرجى اختيار العميل أولاً للمتابعة', 'error');
                      return;
                    }
                    if (step === 2) {
                      const check = validateMeasurements(measurements);
                      if (!check.isValid) {
                        showToast(`يرجى استكمال المقاسات الأساسية: ${check.missingFields.join('، ')}`, 'error');
                        return;
                      }
                    }
                    if (step === 3) {
                      const tailoringCheck = validateTailoringDetails(tailoringDetails);
                      if (!tailoringCheck.isValid) {
                        showToast(
                          `يرجى إكمال خيارات التفصيل الأساسية قبل المتابعة: ${tailoringCheck.missingFields.join('، ')}`,
                          'error'
                        );
                        return;
                      }
                    }
                    if (step === 4) {
                      if (isTotalLessThanNetPaid) {
                        showToast(
                          `لا يمكن المتابعة: إجمالي الطلب الجديد (${totalAmount} ر.س) أقل من صافي المبلغ المقبوض فعلياً (${actualNetPaid} ر.س). يرجى تصحيح السعر أو معالجة الاسترداد أولاً.`,
                          'error'
                        );
                        return;
                      }
                      const fabricPricingCheck = validateFabricAndPricing({
                        fabric: tailoringDetails.fabric,
                        unitPrice,
                        quantity,
                        paidAmount,
                        paymentMethod,
                        deliveryDate,
                      });
                      if (!fabricPricingCheck.isValid) {
                        showToast(
                          `يرجى استكمال بيانات القماش والتسعير قبل المتابعة: ${fabricPricingCheck.missingFields.join('، ')}`,
                          'error'
                        );
                        return;
                      }
                    }
                    setStep((s) => s + 1);
                  }}
                  className="flex items-center gap-1 px-5 py-1.5 text-xs font-bold text-white bg-[#1A365D] hover:bg-[#152C4D] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || isSavedSuccessfully}
                  onClick={handleFinalSubmit}
                  className="flex items-center gap-1.5 px-6 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الطلب وطباعة الباركود'}
                </button>
              )}
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between max-w-2xl mx-auto pt-2 overflow-x-auto no-scrollbar">
            {stepsHeader.map((s) => {
              const Icon = s.icon;
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={s.num > step && !selectedCustomer}
                  onClick={() => {
                    if (!selectedCustomer) {
                      showToast('يرجى اختيار العميل أولاً', 'error');
                      return;
                    }
                    if (s.num > 2) {
                      const check = validateMeasurements(measurements);
                      if (!check.isValid) {
                        showToast(`يرجى إكمال المقاسات الأساسية: ${check.missingFields.join('، ')}`, 'error');
                        return;
                      }
                    }
                    if (s.num > 3) {
                      const tailoringCheck = validateTailoringDetails(tailoringDetails);
                      if (!tailoringCheck.isValid) {
                        showToast(
                          `يرجى إكمال خيارات التفصيل الأساسية قبل المتابعة: ${tailoringCheck.missingFields.join('، ')}`,
                          'error'
                        );
                        return;
                      }
                    }
                    if (s.num > 4) {
                      const fabricPricingCheck = validateFabricAndPricing({
                        fabric: tailoringDetails.fabric,
                        unitPrice,
                        quantity,
                        paidAmount,
                        paymentMethod,
                        deliveryDate,
                      });
                      if (!fabricPricingCheck.isValid) {
                        showToast(
                          `يرجى إكمال بيانات القماش والتسعير قبل المتابعة: ${fabricPricingCheck.missingFields.join('، ')}`,
                          'error'
                        );
                        return;
                      }
                    }
                    setStep(s.num);
                  }}
                  className={`flex items-center gap-2 py-1 px-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[#1A365D] text-white shadow-xs'
                      : isCompleted
                      ? 'text-[#1A365D] bg-blue-50 hover:bg-blue-100 border border-blue-200/60'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isCurrent
                        ? 'bg-white text-[#1A365D]'
                        : isCompleted
                        ? 'bg-[#1A365D] text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? '✓' : s.num}
                  </div>
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Step Body */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        {/* ================= STEP 1: CUSTOMER SELECTION ================= */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Quick Customer Search or Create */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-black text-slate-900">الخطوة الأولى: تحديد بيانات العميل</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    ابحث برقم الجوال (05xxxxxxx) أو اسم العميل، أو أضف عميل جديد بضغطة زر
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1A365D] hover:bg-[#152C4D] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  {isCreatingCustomer ? 'إلغاء وإظهار قائمة البحث' : 'إضافة عميل جديد'}
                </button>
              </div>

              {/* Form to Add New Customer */}
              {isCreatingCustomer ? (
                <form onSubmit={handleSaveNewCustomer} className="bg-slate-50 p-5 rounded-2xl border border-slate-300 space-y-4">
                  <h4 className="font-black text-sm text-slate-900 mb-2">تسجيل عميل جديد في النظام</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الثلاثي / اللقب *</label>
                      <input
                        type="text"
                        required
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        placeholder="مثال: سعد الشريف"
                        className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-300 font-bold focus:border-[#1A365D] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الجوال السعودي *</label>
                      <input
                        type="tel"
                        required
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        placeholder="0501234567"
                        className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-300 font-bold focus:border-[#1A365D] focus:outline-none text-left dir-ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">العنوان والحي</label>
                      <input
                        type="text"
                        value={newCustAddress}
                        onChange={(e) => setNewCustAddress(e.target.value)}
                        placeholder="حي الروضة، جدة"
                        className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-300 focus:border-[#1A365D] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات عامة</label>
                      <input
                        type="text"
                        value={newCustNotes}
                        onChange={(e) => setNewCustNotes(e.target.value)}
                        placeholder="عميل مميز / يفضل المقاس المريح..."
                        className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-300 focus:border-[#1A365D] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSavingNewCustomer}
                      onClick={() => setIsCreatingCustomer(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-white rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingNewCustomer}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#1A365D] hover:bg-[#152C4D] rounded-xl shadow-xs transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {isSavingNewCustomer ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>جارٍ الحفظ...</span>
                        </>
                      ) : (
                        'حفظ العميل ومتابعة المقاسات'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Customer Search and List */
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم، اللقب، أو رقم الجوال..."
                      className="w-full pl-4 pr-11 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-300 font-bold focus:bg-white focus:border-[#1A365D] focus:outline-none transition-all"
                    />
                  </div>

                  {/* Selected Customer Banner */}
                  {selectedCustomer && (
                    <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-500 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1A365D] text-white flex items-center justify-center font-black">
                          {selectedCustomer.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                            {selectedCustomer.fullName}
                            <span className="text-[10px] bg-blue-200 text-[#1A365D] px-2 py-0.5 rounded-full font-bold">
                              تم التحديد
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-mono mt-0.5">{selectedCustomer.phone}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-4 py-2 bg-[#1A365D] text-white text-xs font-bold rounded-xl hover:bg-[#152C4D] shadow-xs flex items-center gap-1 transition-colors"
                      >
                        متابعة للمقاسات
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Customers Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto p-1">
                    {filteredCustomers.map((cust) => {
                      const isSelected = selectedCustomer?.customerId === cust.customerId;
                      return (
                        <div
                          key={cust.customerId}
                          onClick={() => handleSelectCustomer(cust)}
                          className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#1A365D] bg-blue-50/80 ring-2 ring-[#1A365D]/10 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-900">{cust.fullName}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{cust.phone}</div>
                            {cust.notes && (
                              <div className="text-[11px] text-slate-400 mt-2 line-clamp-1 italic">{cust.notes}</div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">طلبات سابقة: {customerOrderCounts[cust.customerId] || 0}</span>
                            <span className="font-bold text-[#1A365D]">اختيار</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 2: MEASUREMENTS ================= */}
        {step === 2 && (
          <div className="space-y-6">
            <MeasurementForm
              measurements={measurements}
              onChange={setMeasurements}
              unit={measurementUnit}
              onUnitChange={setMeasurementUnit}
              notes={measurementNotes}
              onNotesChange={setMeasurementNotes}
            />
          </div>
        )}

        {/* ================= STEP 3: TAILORING DETAILS (THE DIGITAL TAILOR BOOK) ================= */}
        {step === 3 && (
          <div className="space-y-6">
            <VisualOptionSelector
              tailoringDetails={tailoringDetails}
              onChange={setTailoringDetails}
            />
          </div>
        )}

        {/* ================= STEP 4: FABRIC, PRICING & DELIVERY ================= */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Live Step Validation Banner */}
            {(() => {
              const currentCheck = validateFabricAndPricing({
                fabric: tailoringDetails.fabric,
                unitPrice,
                quantity,
                paidAmount,
                paymentMethod,
                deliveryDate,
              });

              if (!currentCheck.isValid) {
                return (
                  <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900 animate-fadeIn">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-amber-950">بيانات أساسية مطلوبة لإكمال خطوة القماش والتسعير:</h4>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {currentCheck.missingFields.map((f, i) => (
                          <span
                            key={i}
                            className="bg-amber-100/90 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-lg text-[11px] font-bold"
                          >
                            • {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>جميع بيانات القماش والتسعير وموعد التسليم مكتملة وجاهزة للمراجعة والاعتماد.</span>
                </div>
              );
            })()}

            {/* Fabric Section */}
            <FabricSelector
              fabric={tailoringDetails.fabric}
              onChange={(f) => setTailoringDetails({ ...tailoringDetails, fabric: f })}
            />

            {/* Pricing & Schedule Section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#1A365D]" />
                  التسعير اليدوي والحسابات المالية وموعد التسليم
                </h4>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  تسعير مخصص من الخياط
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">عدد الثياب المطلوبة</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-base font-black bg-slate-50 rounded-xl border border-slate-300 text-slate-900 text-center focus:bg-white focus:border-[#1A365D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">سعر الثوب الواحد (ر.س) *</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={unitPrice || ''}
                    placeholder="اكتب السعر يدوياً"
                    onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-base font-black bg-slate-50 rounded-xl border border-slate-300 text-slate-900 text-center focus:bg-white focus:border-[#1A365D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isEditingMode ? 'المبلغ المدفوع المسجل (سندات القبض)' : 'العربون المدفوع الآن (ر.س)'}
                  </label>
                  {isEditingMode ? (
                    <div className="w-full px-3 py-2 text-base font-black bg-stone-100 rounded-xl border border-stone-300 text-emerald-800 text-center flex items-center justify-center">
                      {initialEditingOrder?.pricing?.paidAmount || 0} ر.س
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max={totalAmount}
                      value={paidAmount || ''}
                      placeholder="0"
                      onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 text-base font-black bg-slate-50 rounded-xl border border-slate-300 text-emerald-700 text-center focus:bg-white focus:border-emerald-600"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة دفع العربون</label>
                  <select
                    disabled={isEditingMode}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm font-bold bg-slate-50 rounded-xl border border-slate-300 text-slate-900 disabled:opacity-60 disabled:bg-stone-100"
                  >
                    <option value="cash">نقدي (كاش)</option>
                    <option value="card">شبكة / مدى</option>
                    <option value="stc_pay">STC Pay</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                  </select>
                </div>
              </div>

              {/* Schedule and Tailor Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#1A365D]" />
                    تاريخ التسليم والبروفة المتوقع
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold bg-slate-50 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الخياط المسؤول عن التفصيل</label>
                  <input
                    type="text"
                    value={assignedTailor}
                    onChange={(e) => setAssignedTailor(e.target.value)}
                    placeholder="اسم الخياط / المعلم"
                    className="w-full px-3 py-2 text-sm font-bold bg-slate-50 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div>
                  <div className="text-xs text-slate-500 font-semibold">إجمالي الطلب ({quantity} ثياب)</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{totalAmount} ر.س</div>
                </div>
                <div>
                  <div className="text-xs text-emerald-700 font-semibold">المدفوع (العربون)</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{paidAmount} ر.س</div>
                </div>
                <div>
                  <div className="text-xs text-[#1A365D] font-semibold">المتبقي عند الاستلام</div>
                  <div className="text-lg font-black text-[#1A365D] mt-0.5">{remainingAmount} ر.س</div>
                </div>
              </div>

              {isTotalLessThanNetPaid && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-bold flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-rose-800 text-sm">
                      تعارض مالي: إجمالي الطلب ({totalAmount} ر.س) أقل من صافي المبلغ المقبوض فعلياً ({actualNetPaid} ر.س)!
                    </p>
                    <p className="text-stone-600 mt-1 font-normal text-xs leading-relaxed">
                      لا يمكن تعديل السعر أو الكمية لقيمة تجعل إجمالي الطلب أقل مما تم قبضه فعلياً من العميل. يرجى تصحيح السعر/الكمية، أو إجراء سند استرداد للعميل من تفاصيل الطلب أولاً.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 5: REVIEW & CONFIRMATION ================= */}
        {step === 5 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">مراجعة نموذج التفصيل النهائي</h3>
                <p className="text-xs text-slate-500 mt-0.5">تأكد من صحة المقاسات والتفاصيل المختارة قبل الحفظ النهائي</p>
              </div>
              <div className="text-left">
                <span className="text-xs bg-blue-50 border border-blue-200 text-[#1A365D] font-bold px-3 py-1 rounded-full">
                  جاهز للاعتماد والقص
                </span>
              </div>
            </div>

            {/* Customer Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block">اسم العميل:</span>
                <span className="font-black text-sm text-slate-900">{selectedCustomer?.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">رقم الجوال:</span>
                <span className="font-bold text-slate-800 font-mono">{selectedCustomer?.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block">نوع الثوب:</span>
                <span className="font-bold text-[#1A365D]">{tailoringDetails.garmentType} ({quantity} ثياب)</span>
              </div>
              <div>
                <span className="text-slate-400 block">موعد التسليم:</span>
                <span className="font-bold text-slate-800">{deliveryDate}</span>
              </div>
            </div>

            {/* Measurements Grid */}
            <div>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5">جدول المقاسات (سم)</h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400">الطول الكامل</div>
                  <div className="font-black text-sm text-slate-900 mt-0.5">{measurements.length} سم</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400">الكتف</div>
                  <div className="font-black text-sm text-slate-900 mt-0.5">{measurements.shoulder} سم</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400">الصدر</div>
                  <div className="font-black text-sm text-slate-900 mt-0.5">{measurements.chest} سم</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400">طول الكم</div>
                  <div className="font-black text-sm text-slate-900 mt-0.5">{measurements.sleeveLength} سم</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400">الرقبة</div>
                  <div className="font-black text-sm text-slate-900 mt-0.5">{measurements.neck} سم</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400">الكبك / المعصم</div>
                  <div className="font-black text-sm text-slate-900 mt-0.5">{measurements.wrist} سم</div>
                </div>
              </div>
            </div>

            {/* Tailoring Specs Matrix */}
            <div>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5">مواصفات الخياطة والتفصيل</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-400 block text-[11px]">القماش واللون:</span>
                  <div className="font-bold text-slate-900">{tailoringDetails.fabric.name}</div>
                  <div className="text-slate-600 text-[11px]">
                    {tailoringDetails.fabric.color} {tailoringDetails.fabric.colorCode ? `(${tailoringDetails.fabric.colorCode})` : ''}
                  </div>
                  {tailoringDetails.fabric.notes && (
                    <div className="text-[10px] text-amber-900 font-bold bg-amber-50 p-1 rounded">
                      ملاحظة قماش: {tailoringDetails.fabric.notes}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-400 block text-[11px]">الياقة والكم:</span>
                  <div className="font-bold text-slate-900">{tailoringDetails.collar.name} ({tailoringDetails.collar.stiffness === 'stiff' ? 'قاسية' : 'وسط'})</div>
                  <div className="text-slate-600 text-[11px]">{tailoringDetails.sleeves.name}</div>
                  {(tailoringDetails.collar.notes || tailoringDetails.sleeves.notes) && (
                    <div className="text-[10px] text-stone-700">
                      {tailoringDetails.collar.notes && <div>• ياقة: {tailoringDetails.collar.notes}</div>}
                      {tailoringDetails.sleeves.notes && <div>• أكمام: {tailoringDetails.sleeves.notes}</div>}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-400 block text-[11px]">الجيوب والأزرار:</span>
                  <div className="font-bold text-slate-900">
                    {tailoringDetails.pockets.name ||
                      (tailoringDetails.pockets.chestPocketType === 'none'
                        ? 'بدون جيب صدر'
                        : tailoringDetails.pockets.chestPocketType === 'chamfered'
                        ? 'جيب صدر مشطوف'
                        : 'جيب صدر عادي')}
                  </div>
                  <div className="text-slate-600 text-[11px]">{tailoringDetails.buttons.name}</div>
                  {(tailoringDetails.pockets.notes || tailoringDetails.buttons.notes || tailoringDetails.chest.notes) && (
                    <div className="text-[10px] text-stone-700">
                      {tailoringDetails.chest.notes && <div>• صدر: {tailoringDetails.chest.notes}</div>}
                      {tailoringDetails.pockets.notes && <div>• جيوب: {tailoringDetails.pockets.notes}</div>}
                      {tailoringDetails.buttons.notes && <div>• أزرار: {tailoringDetails.buttons.notes}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* General or Additional Notes in Review */}
              {(tailoringDetails.garmentNotes ||
                tailoringDetails.bottom.notes ||
                tailoringDetails.embroidery?.notes ||
                tailoringDetails.generalNotes ||
                orderNotes) && (
                <div className="mt-3 p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 block mb-1">الملاحظات المدونة على الطلب:</span>
                  <div className="space-y-0.5 text-stone-800 text-[11px]">
                    {tailoringDetails.garmentNotes && <div>• <b>قصة الثوب:</b> {tailoringDetails.garmentNotes}</div>}
                    {tailoringDetails.bottom.notes && <div>• <b>أسفل الثوب:</b> {tailoringDetails.bottom.notes}</div>}
                    {tailoringDetails.embroidery?.notes && <div>• <b>التطريز:</b> {tailoringDetails.embroidery.notes}</div>}
                    {tailoringDetails.generalNotes && <div>• <b>عام:</b> {tailoringDetails.generalNotes}</div>}
                    {orderNotes && <div>• <b>ملاحظات إضافية:</b> {orderNotes}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Financial Conflict Alert in Review */}
            {isTotalLessThanNetPaid && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-bold flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-rose-800 text-sm">
                    تعارض مالي يمنع الحفظ: إجمالي الطلب ({totalAmount} ر.س) أقل من صافي المبلغ المقبوض فعلياً ({actualNetPaid} ر.س)!
                  </p>
                  <p className="text-stone-600 mt-1 font-normal text-xs leading-relaxed">
                    يرجى الرجوع للخطوة السابقة وتصحيح سعر الثوب أو الكمية، أو إجراء سند استرداد للعميل أولاً.
                  </p>
                </div>
              </div>
            )}

            {/* Financials & Save Buttons */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-center sm:text-right">
                <div>
                  <span className="text-xs text-slate-500 block">إجمالي المبلغ:</span>
                  <span className="font-black text-lg text-slate-900">{totalAmount} ر.س</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-700 block">العربون:</span>
                  <span className="font-black text-lg text-emerald-700">{paidAmount} ر.س</span>
                  {paidAmount > 0 && (
                    <span className="text-[10px] text-emerald-800 font-bold block mt-0.5">
                      ({PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-[#1A365D] block">المتبقي:</span>
                  <span className="font-black text-lg text-[#1A365D]">{remainingAmount} ر.س</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting || isSavedSuccessfully || isTotalLessThanNetPaid}
                onClick={handleFinalSubmit}
                className="w-full sm:w-auto px-8 py-3 bg-[#1A365D] hover:bg-[#152C4D] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isSubmitting
                  ? 'جاري الحفظ في قاعدة البيانات...'
                  : isEditingMode
                  ? 'حفظ وتحديث بيانات الطلب'
                  : 'اعتماد وحفظ الطلب'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
