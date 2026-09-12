export type UserRole = 'SUPER_ADMIN' | 'SHOP' | 'EMPLOYEE';

export interface EmployeePermissions {
  customers: boolean;
  measurements: boolean;
  orders: boolean;
  payments: boolean;
  reports: boolean;
}

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  customers: false,
  measurements: false,
  orders: false,
  payments: false,
  reports: false,
};

export type ShopStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export type VatPriceMode = 'INCLUSIVE' | 'EXCLUSIVE';

export interface OrderTaxSnapshot {
  vatEnabled: boolean;
  vatRate: number;
  vatPriceMode: VatPriceMode | null;
  vatRegistrationNumber?: string;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export const SHOP_STATUS_MAP: Record<ShopStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'قيد المراجعة', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  ACTIVE: { label: 'نشط وفعال', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  SUSPENDED: { label: 'معلّق مؤقتاً', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  CANCELLED: { label: 'ملغي', color: 'text-stone-700', bg: 'bg-stone-100', border: 'border-stone-200' },
};

export interface ShopRequest {
  requestId: string;
  uid?: string;
  ownerName: string;
  shopName: string;
  email: string;
  phone: string;
  city: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  assignedShopId?: string;
  assignedOwnerUid?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface PlatformAdmin {
  adminId: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN';
  createdAt: string;
  isActive: boolean;
}

export type OrderStatus =
  | 'NEW'
  | 'MEASURED'
  | 'CUTTING'
  | 'SEWING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  NEW: { label: 'جديد', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  MEASURED: { label: 'تم أخذ المقاسات', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  CUTTING: { label: 'قيد القص', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  SEWING: { label: 'قيد الخياطة', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  READY: { label: 'جاهز', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  DELIVERED: { label: 'تم التسليم', color: 'text-stone-700', bg: 'bg-stone-100', border: 'border-stone-200' },
  CANCELLED: { label: 'ملغي', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

export interface Shop {
  shopId: string;
  name: string;
  shopName?: string; // alias for display compatibility
  logoUrl?: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  crNumber?: string; // السجل التجاري
  taxNumber?: string; // الرقم الضريبي
  vatNumber?: string; // alias
  vatEnabled?: boolean; // تفعيل ضريبة القيمة المضافة
  vatRegistrationNumber?: string; // الرقم الضريبي للمنشأة
  vatRate?: number; // نسبة الضريبة (مثال: 15)
  vatPriceMode?: VatPriceMode; // طريقة إدخال الأسعار (INCLUSIVE | EXCLUSIVE)
  currency: string;
  defaultDeliveryDays: number;
  termsAndConditions?: string;
  status: ShopStatus;
  ownerUid?: string;
  ownerEmail?: string;
  ownerName?: string;
  maxEmployees?: number; // الحد الأقصى لحسابات الموظفين النشطة
  employeeCount?: number; // عدد حسابات الموظفين النشطة حالياً (بدون المالك)
  subscriptionPlan?: string; // خطة الاشتراك
  subscriptionStatus?: string; // حالة الاشتراك
  lastSeatAction?: SeatActionRecord; // علامة مطابقة العملية للمقاعد (CREATE / DEACTIVATE / REACTIVATE / DELETE)
  createdAt: string;
  updatedAt: string;
}

export interface SeatActionRecord {
  action: 'CREATE' | 'DEACTIVATE' | 'REACTIVATE' | 'DELETE';
  employeeUid: string;
  timestamp: string;
}

export const DEFAULT_MAX_EMPLOYEES = 3;
export const MAX_SAFE_EMPLOYEES = 100;

export const EMPLOYEE_ERROR_CODES = {
  LIMIT_REACHED: 'EMPLOYEE_LIMIT_REACHED',
  ALREADY_INACTIVE: 'EMPLOYEE_ALREADY_INACTIVE',
  ALREADY_ACTIVE: 'EMPLOYEE_ALREADY_ACTIVE',
  CREATION_FAILED: 'EMPLOYEE_CREATION_FAILED',
  CREATION_PARTIAL_FAILURE: 'EMPLOYEE_CREATION_PARTIAL_FAILURE',
  RECONCILIATION_REQUIRED: 'EMPLOYEE_COUNT_RECONCILIATION_REQUIRED',
  SHOP_NOT_FOUND: 'SHOP_NOT_FOUND',
  INVALID_SEAT_LIMIT: 'INVALID_SEAT_LIMIT',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type EmployeeErrorCode = typeof EMPLOYEE_ERROR_CODES[keyof typeof EMPLOYEE_ERROR_CODES];

export class EmployeeDomainError extends Error {
  code: EmployeeErrorCode | string;
  details?: any;
  constructor(code: EmployeeErrorCode | string, messageAr: string, details?: any) {
    super(messageAr);
    this.name = 'EmployeeDomainError';
    this.code = code;
    this.details = details;
  }
}

export interface UserProfile {
  userId: string;
  uid?: string; // alias for Firebase Auth UID
  shopId: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  permissions?: EmployeePermissions;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  lastLoginAt?: string;
}

export type MeasurementUnit = 'cm' | 'inch';

export interface Customer {
  customerId: string;
  shopId: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastOrderAt?: string;
  totalOrdersCount: number;
  totalSpent: number;
  latestMeasurementId?: string;
}

export interface MeasurementData {
  length: number; // الطول الكامل (طول الثوب)
  shoulder: number; // الكتف
  chest: number; // الصدر / وسع الصدر
  waist: number; // الخصر / البطن
  hips: number; // الأرداف / وسع الوسط
  sleeveLength: number; // طول الكم
  sleeveOpening: number; // فتحة الكم
  wrist: number; // المعصم / الكبك
  neck: number; // الرقبة / الياقة
  armhole: number; // فتحة الإبط / الجيرو
  backWidth: number; // عرض الظهر
  chestWidth: number; // عرض الصدر من الأمام
  bottomWidth: number; // وسع أسفل الثوب (الداير)
  pocketLength?: number; // طول الجيب
  pocketPlacement?: number; // موقع نزول الجيب
  placketLength?: number; // طول الجبزور / الصدر
  collarHeight?: number; // ارتفاع الياقة
  [key: string]: any;
}

export interface MeasurementRecord {
  id?: string;
  date?: string;
  measurementId: string;
  customerId: string;
  shopId: string;
  measuredBy: string;
  measuredByName: string;
  createdAt: string;
  updatedAt: string;
  measurements: MeasurementData;
  unit: MeasurementUnit;
  notes?: string;
}

export type CustomerMeasurement = MeasurementRecord;


export interface CollarDetails {
  type: string; // 'regular' | 'mandarin' | 'royal' | 'kuwaiti' | 'buttoned' | 'double' | 'round' | 'special';
  name: string;
  stiffness: 'soft' | 'medium' | 'stiff'; // طرية | وسط | قاسية
  height?: number; // بالسم
  buttonsCount: number; // 1 | 2
  notes?: string;
}

export interface SleeveDetails {
  type: string; // 'plain' | 'cuff_square' | 'cuff_chamfered' | 'cuff_round' | 'elastic' | 'qatari' | 'hidden_button';
  name: string;
  cuffWidth?: number; // بالسم
  cuffStiffness: 'soft' | 'medium' | 'stiff';
  buttonStyle: 'visible' | 'hidden' | 'stud'; // أزرار ظاهرة | مخفية | كبك
  notes?: string;
}

export interface ButtonDetails {
  type: string; // 'plastic' | 'bone' | 'pearl' | 'fabric' | 'snap' | 'hidden';
  name: string;
  color: string;
  count: number;
  stitchColor?: string;
  placement?: string;
  notes?: string;
}

export interface PocketDetails {
  hasChestPocket: boolean;
  chestPocketType: 'regular' | 'chamfered' | 'square_flap' | 'hidden' | 'none' | 'custom' | string;
  name?: string;
  hasPenPocket: boolean;
  sidePocketsCount: number; // 1 | 2
  sidePocketType: 'regular' | 'zipper' | 'hidden_inside' | string;
  hasMobileInnerPocket: boolean;
  stitchingType: 'single' | 'double' | string;
  notes?: string;
}

export interface ChestDetails {
  placketType: 'visible' | 'hidden' | 'wide' | 'narrow' | 'embroidered' | 'custom' | string;
  name: string;
  placketStitching: 'single' | 'double' | 'hidden' | string;
  embroideryPattern?: string;
  buttonsCount: number;
  notes?: string;
}

export interface BottomDetails {
  finishType: 'wide_hem' | 'narrow_hem' | 'curved' | 'side_slits' | 'custom' | string;
  name: string;
  slitLength?: number;
  notes?: string;
}

export interface EmbroideryDetails {
  hasEmbroidery: boolean;
  type?: 'hand' | 'machine' | 'thread_color';
  placement: string[]; // ['collar', 'cuff', 'pocket', 'chest']
  threadColor?: string;
  designName?: string;
  designImageUrl?: string;
  notes?: string;
}

export interface FabricDetails {
  name: string;
  code?: string;
  color: string;
  colorCode?: string;
  supplier?: string;
  season?: 'summer' | 'winter' | 'all';
  type?: string; // قطن، تترون، صوف، زبدة، ياباني، كوري
  pricePerMeter?: number;
  imageUrl?: string;
  notes?: string;
}

export interface SpecialOptions {
  threadColor?: string;
  doubleStitching?: boolean;
  extraLining?: boolean;
  pocketFlapStiff?: boolean;
  customNotes?: string;
  additionalCost?: number;
}

export interface TailoringDetails {
  garmentType: string;
  garmentNotes?: string;
  fabric: FabricDetails;
  collar: CollarDetails;
  sleeves: SleeveDetails;
  buttons: ButtonDetails;
  pockets: PocketDetails;
  chest: ChestDetails;
  bottom: BottomDetails;
  embroidery: EmbroideryDetails;
  specialOptions: SpecialOptions;
  generalNotes?: string;
}

export interface OrderPricing {
  unitPrice: number;
  quantity: number;
  fabricCost: number;
  extrasCost: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  discount?: number;
  taxAmount?: number;
  // VAT Snapshot Fields (immutable historical tax record)
  subtotalAmount?: number; // المبلغ قبل الضريبة
  vatAmount?: number; // قيمة ضريبة القيمة المضافة
  vatEnabled?: boolean; // هل تم تطبيق الضريبة
  vatRate?: number; // نسبة الضريبة المطبقة وقت الطلب
  vatPriceMode?: VatPriceMode | null; // طريقة إدخال السعر وقت الطلب
  vatRegistrationNumber?: string; // الرقم الضريبي للمحل وقت الطلب
}

export interface StatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy: string;
  updatedByName: string;
}

export interface OrderImage {
  id: string;
  url: string;
  label: string;
  uploadedAt: string;
}

export interface Order {
  orderId: string;
  orderNumber: string; // TH-000001
  shopId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  status: OrderStatus;
  statusHistory: StatusHistoryItem[];
  garmentType: string;
  quantity: number;
  measurements: MeasurementData;
  measurementUnit?: MeasurementUnit;
  measurementId?: string;
  tailoringDetails: TailoringDetails;
  pricing: OrderPricing;
  taxSnapshot?: OrderTaxSnapshot;
  orderDate: string;
  deliveryDate: string;
  actualDeliveryDate?: string;
  assignedTailor?: string;
  images?: OrderImage[];
  financialLocked?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  shopId: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'stc_pay' | 'other';
  receiptNumber?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  notes?: string;
}

export interface Refund {
  refundId: string;
  shopId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'stc_pay';
  reason?: string;
  recordedBy: string;
  recordedByUid: string;
  createdAt: string;
}

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash: 'نقدي',
  card: 'شبكة / مدى',
  bank_transfer: 'تحويل بنكي',
  stc_pay: 'STC Pay',
  other: 'أخرى',
};

export interface CatalogItem {
  itemId: string;
  shopId: string;
  category: 'garment_type' | 'fabric' | 'collar' | 'sleeve' | 'pocket' | 'button' | 'custom_option';
  name: string;
  code?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
}
