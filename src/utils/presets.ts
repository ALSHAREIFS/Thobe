import { TailoringDetails, MeasurementData, FabricDetails } from '../types';

export const EMPTY_MEASUREMENTS: MeasurementData = {
  length: 0,
  shoulder: 0,
  chest: 0,
  waist: 0,
  hips: 0,
  sleeveLength: 0,
  sleeveOpening: 0,
  wrist: 0,
  neck: 0,
  armhole: 0,
  backWidth: 0,
  chestWidth: 0,
  bottomWidth: 0,
  pocketLength: 0,
  pocketPlacement: 0,
  placketLength: 0,
  collarHeight: 0,
};

export const validateMeasurements = (
  measurements: MeasurementData,
  unit: 'cm' | 'inch' = 'cm'
): { isValid: boolean; missingFields: string[]; invalidFields?: string[] } => {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Essential required fields
  if (!measurements || measurements.length === undefined || measurements.length === null || measurements.length === 0) {
    missing.push('طول الثوب');
  } else if (measurements.length < 0) {
    invalid.push('طول الثوب لا يمكن أن يكون سالباً');
  }

  if (!measurements || measurements.shoulder === undefined || measurements.shoulder === null || measurements.shoulder === 0) {
    missing.push('عرض الكتف');
  } else if (measurements.shoulder < 0) {
    invalid.push('عرض الكتف لا يمكن أن يكون سالباً');
  }

  if (!measurements || measurements.chest === undefined || measurements.chest === null || measurements.chest === 0) {
    missing.push('وسع الصدر');
  } else if (measurements.chest < 0) {
    invalid.push('وسع الصدر لا يمكن أن يكون سالباً');
  }

  if (!measurements || measurements.sleeveLength === undefined || measurements.sleeveLength === null || measurements.sleeveLength === 0) {
    missing.push('طول الكم');
  } else if (measurements.sleeveLength < 0) {
    invalid.push('طول الكم لا يمكن أن يكون سالباً');
  }

  if (!measurements || measurements.neck === undefined || measurements.neck === null || measurements.neck === 0) {
    missing.push('محيط الرقبة (الياقة)');
  } else if (measurements.neck < 0) {
    invalid.push('محيط الرقبة لا يمكن أن يكون سالباً');
  }

  // Range validation for all entered fields based on unit
  for (const field of MEASUREMENT_FIELDS_CONFIG) {
    const val = measurements ? measurements[field.key] : undefined;
    if (typeof val === 'number') {
      if (isNaN(val) || val < 0) {
        if (!invalid.some((inv) => inv.includes(field.label) || inv.includes(field.shortLabel))) {
          invalid.push(`${field.label} (${val} ${unit === 'inch' ? 'إنش' : 'سم'}) غير صحيح`);
        }
      } else if (val > 0) {
        const min = unit === 'inch' ? Math.round((field.min / 2.54) * 10) / 10 : field.min;
        const max = unit === 'inch' ? Math.round((field.max / 2.54) * 10) / 10 : field.max;
        // Allow a small 10% tolerance beyond absolute min/max for exceptional human bodies
        if (val < min * 0.8 || val > max * 1.3) {
          invalid.push(`${field.label} (${val} ${unit === 'inch' ? 'إنش' : 'سم'}) غير منطقي`);
        }
      }
    }
  }

  return {
    isValid: missing.length === 0 && invalid.length === 0,
    missingFields: missing,
    invalidFields: invalid,
  };
};

export const DEFAULT_MEASUREMENTS: MeasurementData = {
  length: 145, // الطول (58 إنش = ~147 سم أو 145)
  shoulder: 46, // الكتف
  chest: 62, // الصدر
  waist: 60, // الخصر / البطن
  hips: 66, // الأرداف / وسع الوسط
  sleeveLength: 61, // طول الكم
  sleeveOpening: 16, // فتحة الكم
  wrist: 13, // المعصم / الكبك
  neck: 41, // الرقبة
  armhole: 27, // الجيرو / فتحة الإبط
  backWidth: 44, // عرض الظهر
  chestWidth: 42, // عرض الصدر
  bottomWidth: 85, // وسع أسفل الثوب (الداير)
  pocketLength: 17, // طول الجيب
  pocketPlacement: 22, // نزول الجيب من الكتف
  placketLength: 38, // طول الجبزور
  collarHeight: 3.5, // ارتفاع القلاب
};

export const MEASUREMENT_FIELDS_CONFIG: Array<{
  key: keyof MeasurementData;
  label: string;
  shortLabel: string;
  defaultVal: number;
  min: number;
  max: number;
  step: number;
  category: 'main' | 'upper' | 'sleeves' | 'details';
  description: string;
}> = [
  { key: 'length', label: 'طول الثوب (الطول الكامل)', shortLabel: 'الطول', defaultVal: 145, min: 60, max: 200, step: 0.5, category: 'main', description: 'من أعلى نقطة في الكتف حتى الكعب' },
  { key: 'shoulder', label: 'عرض الكتف', shortLabel: 'الكتف', defaultVal: 46, min: 25, max: 70, step: 0.5, category: 'upper', description: 'من عظمة الكتف الأيمن إلى عظمة الكتف الأيسر' },
  { key: 'chest', label: 'وسع الصدر (محيط كامل)', shortLabel: 'الصدر', defaultVal: 62, min: 30, max: 100, step: 0.5, category: 'upper', description: 'محيط الصدر مع ترك راحة مناسبة' },
  { key: 'waist', label: 'وسع الخصر / البطن', shortLabel: 'الخصر', defaultVal: 60, min: 30, max: 110, step: 0.5, category: 'main', description: 'محيط منطقة الخصر والبطن' },
  { key: 'hips', label: 'وسع الوسط / الأرداف', shortLabel: 'الوسط', defaultVal: 66, min: 35, max: 120, step: 0.5, category: 'main', description: 'وسع الثوب عند مستوى الحوض' },
  { key: 'sleeveLength', label: 'طول الكم', shortLabel: 'طول الكم', defaultVal: 61, min: 25, max: 85, step: 0.5, category: 'sleeves', description: 'من عظمة الكتف حتى مفصل المعصم' },
  { key: 'sleeveOpening', label: 'فتحة الكم (عرض الكم)', shortLabel: 'فتحة الكم', defaultVal: 16, min: 10, max: 30, step: 0.5, category: 'sleeves', description: 'وسع الذراع عند الكوع والأعلى' },
  { key: 'wrist', label: 'وسع المعصم / الكبك', shortLabel: 'الكبك/المعصم', defaultVal: 13, min: 8, max: 25, step: 0.5, category: 'sleeves', description: 'محيط المعصم أو عرض طرف الكم' },
  { key: 'neck', label: 'محيط الرقبة (الياقة)', shortLabel: 'الرقبة', defaultVal: 41, min: 25, max: 60, step: 0.5, category: 'upper', description: 'محيط الرقبة مقاسًا مع راحة إصبعين' },
  { key: 'armhole', label: 'فتحة الإبط (الجيرو)', shortLabel: 'الجيرو/الإبط', defaultVal: 27, min: 15, max: 45, step: 0.5, category: 'upper', description: 'نزول حردة الإبط' },
  { key: 'backWidth', label: 'عرض الظهر', shortLabel: 'الظهر', defaultVal: 44, min: 25, max: 65, step: 0.5, category: 'upper', description: 'عرض الظهر بين تقاطع الإبطين' },
  { key: 'chestWidth', label: 'عرض الصدر الأمامي', shortLabel: 'الصدر الأمامي', defaultVal: 42, min: 25, max: 65, step: 0.5, category: 'upper', description: 'عرض الصدر من الأمام بين الإبطين' },
  { key: 'bottomWidth', label: 'وسع أسفل الثوب (الداير)', shortLabel: 'وسع الداير', defaultVal: 85, min: 50, max: 140, step: 1, category: 'main', description: 'وسع الثوب من الأسفل' },
  { key: 'placketLength', label: 'طول الجبزور (الصدر)', shortLabel: 'طول الصدر', defaultVal: 38, min: 20, max: 55, step: 0.5, category: 'details', description: 'طول فتحة الصنجار / الجبزور' },
  { key: 'pocketPlacement', label: 'نزول الجيب من الكتف', shortLabel: 'نزول الجيب', defaultVal: 22, min: 10, max: 35, step: 0.5, category: 'details', description: 'المسافة من خط الكتف لأعلى الجيب' },
  { key: 'pocketLength', label: 'طول الجيب (جيب الصدر)', shortLabel: 'طول الجيب', defaultVal: 17, min: 10, max: 25, step: 0.5, category: 'details', description: 'ارتفاع فتحة جيب الصدر' },
  { key: 'collarHeight', label: 'ارتفاع الياقة (القلاب)', shortLabel: 'ارتفاع الياقة', defaultVal: 3.5, min: 2, max: 6, step: 0.25, category: 'details', description: 'عرض/ارتفاع القلاب بالسم' },
];

export const EMPTY_TAILORING_DETAILS: TailoringDetails = {
  garmentType: '',
  garmentNotes: '',
  fabric: {
    name: '',
    code: '',
    color: '',
    colorCode: '',
    supplier: '',
    season: 'all',
    type: '',
    notes: '',
  },
  collar: {
    type: '',
    name: '',
    stiffness: '' as any,
    height: 0,
    buttonsCount: 0,
    notes: '',
  },
  sleeves: {
    type: '',
    name: '',
    cuffWidth: 0,
    cuffStiffness: '' as any,
    buttonStyle: '' as any,
    notes: '',
  },
  buttons: {
    type: '',
    name: '',
    color: '',
    count: 0,
    stitchColor: '',
    notes: '',
  },
  pockets: {
    hasChestPocket: false,
    chestPocketType: '' as any,
    hasPenPocket: false,
    sidePocketsCount: 0,
    sidePocketType: '' as any,
    hasMobileInnerPocket: false,
    stitchingType: '' as any,
    notes: '',
  },
  chest: {
    placketType: '' as any,
    name: '',
    placketStitching: '' as any,
    buttonsCount: 0,
    notes: '',
  },
  bottom: {
    finishType: '' as any,
    name: '',
    slitLength: 0,
    notes: '',
  },
  embroidery: {
    hasEmbroidery: false,
    placement: [],
    threadColor: '',
    notes: '',
  },
  specialOptions: {
    threadColor: '',
    doubleStitching: false,
    extraLining: false,
    pocketFlapStiff: false,
    customNotes: '',
    additionalCost: 0,
  },
  generalNotes: '',
};

export interface TailoringValidationResult {
  isValid: boolean;
  missingFields: string[];
}

export interface FabricPricingValidationParams {
  fabric: FabricDetails;
  unitPrice: number;
  quantity: number;
  paidAmount: number;
  paymentMethod?: string;
  deliveryDate?: string;
}

export const validateFabricAndPricing = (
  params: FabricPricingValidationParams
): TailoringValidationResult => {
  const missing: string[] = [];

  // 1. Fabric Name validation (accepts presets or custom names, disallows empty or bare placeholders)
  const fName = params.fabric?.name ? params.fabric.name.trim() : '';
  if (!fName || fName === 'أخرى' || fName === 'قماش آخر' || fName === 'قماش مخصص' || fName === 'قماش مخصص / نوع آخر') {
    missing.push('نوع أو اسم القماش (يرجى كتابة أو اختيار اسم القماش)');
  }

  // 2. Fabric Color validation (accepts quick presets or custom colors, disallows empty or bare placeholders)
  const fColor = params.fabric?.color ? params.fabric.color.trim() : '';
  if (!fColor || fColor === 'أخرى' || fColor === 'لون آخر' || fColor === 'لون مخصص') {
    missing.push('لون القماش (يرجى كتابة أو اختيار لون القماش)');
  }

  // 3. Unit Price validation
  if (!params.unitPrice || params.unitPrice <= 0 || isNaN(params.unitPrice)) {
    missing.push('سعر الثوب / سعر الوحدة (يجب أن يكون أكبر من 0)');
  }

  // 4. Quantity validation
  if (!params.quantity || params.quantity <= 0 || isNaN(params.quantity)) {
    missing.push('عدد الثياب المطلوبة (يجب أن تكون 1 على الأقل)');
  }

  // 5. Paid amount validation (cannot exceed total amount)
  const total = (params.quantity || 1) * (params.unitPrice || 0);
  if (params.paidAmount > total) {
    missing.push('العربون المدفوع (لا يمكن أن يكون أكبر من إجمالي الطلب)');
  }

  // 6. Payment method validation if paidAmount > 0
  if (params.paidAmount > 0) {
    if (!params.paymentMethod || params.paymentMethod.trim() === '') {
      missing.push('طريقة دفع العربون');
    }
  }

  // 7. Delivery date validation
  if (!params.deliveryDate || params.deliveryDate.trim() === '') {
    missing.push('تاريخ موعد التسليم');
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
};

export const validateTailoringDetails = (details: TailoringDetails): TailoringValidationResult => {
  const missing: string[] = [];

  // 1. Garment Type
  const gType = details.garmentType ? details.garmentType.trim() : '';
  if (!gType || gType === 'أخرى' || gType === 'custom' || gType === 'قصة مخصصة' || gType === 'قصة مخصصة / نوع آخر') {
    missing.push('نوع الثوب والقصة (يرجى تحديد أو كتابة اسم القصة)');
  }

  // 2. Collar
  if (!details.collar?.type || details.collar.type.trim() === '') {
    missing.push('تصميم الياقة');
  } else if (details.collar.type === 'custom' || details.collar.type === 'other') {
    const cName = details.collar.name ? details.collar.name.trim() : '';
    if (!cName || cName === 'أخرى' || cName === 'custom' || cName === 'ياقة مخصصة' || cName === 'ياقة مخصصة / شكل آخر') {
      missing.push('تصميم الياقة المخصص (يرجى كتابة وصف الياقة)');
    }
  }

  // 3. Sleeves
  if (!details.sleeves?.type || details.sleeves.type.trim() === '') {
    missing.push('تصميم الأكمام والكبك');
  } else if (details.sleeves.type === 'custom' || details.sleeves.type === 'other') {
    const sName = details.sleeves.name ? details.sleeves.name.trim() : '';
    if (!sName || sName === 'أخرى' || sName === 'custom' || sName === 'كم مخصص' || sName === 'كم مخصص / شكل آخر') {
      missing.push('تصميم الأكمام المخصص (يرجى كتابة وصف الكم)');
    }
  }

  // 4. Pockets
  if (!details.pockets?.chestPocketType || details.pockets.chestPocketType.trim() === '') {
    missing.push('تصميم الجيوب');
  } else if (details.pockets.chestPocketType === 'custom') {
    const pName = details.pockets.name ? details.pockets.name.trim() : '';
    if (!pName || pName === 'أخرى' || pName === 'custom' || pName === 'جيب مخصص' || pName === 'تصميم جيب مخصص / شكل آخر') {
      missing.push('تصميم الجيب المخصص (يرجى كتابة وصف الجيب)');
    }
  }

  // 5. Chest / Placket
  if (!details.chest?.placketType || details.chest.placketType.trim() === '') {
    missing.push('الصدر والصنجار (الجبزور)');
  } else if (details.chest.placketType === 'custom') {
    const chName = details.chest.name ? details.chest.name.trim() : '';
    if (!chName || chName === 'أخرى' || chName === 'custom' || chName === 'صنجار مخصص' || chName === 'صنجار مخصص / تصميم آخر') {
      missing.push('تصميم الصنجار المخصص (يرجى كتابة وصف الصنجار)');
    }
  }

  // 6. Buttons
  if (!details.buttons?.type || details.buttons.type.trim() === '') {
    missing.push('نوعية الأزرار');
  } else if (details.buttons.type === 'custom') {
    const bName = details.buttons.name ? details.buttons.name.trim() : '';
    if (!bName || bName === 'أخرى' || bName === 'custom' || bName === 'أزرار مخصصة' || bName === 'أزرار مخصصة / نوع آخر') {
      missing.push('نوعية الأزرار المخصصة (يرجى كتابة نوع الأزرار)');
    }
  }

  // 7. Bottom & Hem
  if (!details.bottom?.finishType || details.bottom.finishType.trim() === '') {
    missing.push('أسفل الثوب (الكف والفتحات)');
  } else if (details.bottom.finishType === 'custom') {
    const botName = details.bottom.name ? details.bottom.name.trim() : '';
    if (!botName || botName === 'أخرى' || botName === 'custom' || botName === 'تشطيب مخصص' || botName === 'تشطيب مخصص / خيار آخر') {
      missing.push('تشطيب أسفل الثوب المخصص (يرجى كتابة وصف التشطيب)');
    }
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
};

export const DEFAULT_TAILORING_DETAILS: TailoringDetails = {
  garmentType: 'ثوب سعودي رسمي',
  garmentNotes: '',
  fabric: {
    name: 'سميراميس كوري أصلي',
    code: 'SM-8801',
    color: 'أبيض ناصع (ثلجي)',
    colorCode: '#FAF9F6',
    supplier: 'العروبة للأقمشة',
    season: 'all',
    type: 'تترون معالج',
    notes: 'قماش رسمي واقف لا يتكرمش',
  },
  collar: {
    type: 'regular',
    name: 'ياقة قلاب عادية',
    stiffness: 'stiff',
    height: 3.5,
    buttonsCount: 2,
    notes: 'حشوة يابانية قاسية',
  },
  sleeves: {
    type: 'cuff_chamfered',
    name: 'كم كبك مشطوف الزوايا',
    cuffWidth: 6.5,
    cuffStiffness: 'medium',
    buttonStyle: 'stud',
    notes: 'فتحة زرار كبك مزدوجة',
  },
  buttons: {
    type: 'bone',
    name: 'أزرار عظم بيضاء أصلية',
    color: 'أبيض صدفي',
    count: 6,
    stitchColor: 'أبيض',
    notes: 'خياطة خيط متين x',
  },
  pockets: {
    hasChestPocket: true,
    chestPocketType: 'chamfered',
    hasPenPocket: true,
    sidePocketsCount: 2,
    sidePocketType: 'regular',
    hasMobileInnerPocket: true,
    stitchingType: 'single',
    notes: 'مخبأ جوال سري داخل الجيب الأيمن',
  },
  chest: {
    placketType: 'visible',
    name: 'جبزور ظاهر صنجار عادي',
    placketStitching: 'single',
    buttonsCount: 6,
    notes: 'عرض الجبزور 3.2 سم',
  },
  bottom: {
    finishType: 'wide_hem',
    name: 'كف عريض مقلوب (3.5 سم)',
    slitLength: 0,
    notes: 'خياطة مخفية',
  },
  embroidery: {
    hasEmbroidery: false,
    placement: [],
    threadColor: 'أبيض',
    notes: '',
  },
  specialOptions: {
    threadColor: 'نفس لون القماش',
    doubleStitching: false,
    extraLining: true,
    pocketFlapStiff: true,
    customNotes: 'ثوب رسمي للمناسبات',
    additionalCost: 0,
  },
  generalNotes: 'تسليم قبل يوم الجمعة مع كوي على البخار',
};

// Preset catalog options for visual selection cards
export const GARMENT_TYPES_PRESET = [
  { id: 'saudi_formal', name: 'ثوب سعودي رسمي', description: 'الياقة قلاب قاسية مع كبك وأزرار مميزة', popular: true },
  { id: 'saudi_casual', name: 'ثوب سعودي يومي / شبابي', description: 'كم سادة وياقة مريحة خفيفة', popular: true },
  { id: 'kuwaiti', name: 'ثوب كويتي (ياقة كويتية)', description: 'قصة واسعة مريحة وياقة عريضة مقفلة' },
  { id: 'emirati', name: 'ثوب إماراتي (كندورة)', description: 'بدون ياقة (دائرية) مع طربوشة/كردوشة وتطريز ناعم' },
  { id: 'qatari', name: 'ثوب قطري', description: 'ياقة مرتفعة صلبة وأكمام كبك مقوسة' },
  { id: 'omani', name: 'ثوب عماني', description: 'قصة مميزة بدون ياقة مع تطريز حول الصدر وشرابة' },
  { id: 'winter_heavy', name: 'ثوب شتوي صوف', description: 'أقمشة جوخ وصوف ثقيلة بألوان داكنة' },
  { id: 'kids', name: 'ثوب أطفال ولادي', description: 'مقاسات مخصصة للأعمار من سنة إلى 14 سنة' },
  { id: 'custom_special', name: 'تفصيل خاص VIP', description: 'درزات مزدوجة وبطانات داخلية وتطريز خاص' },
];

export const FABRICS_PRESET = [
  { name: 'سميراميس كوري أصلي', code: 'SM-101', color: 'أبيض ثلجي', season: 'all', type: 'تترون معالج', popular: true },
  { name: 'ريتشي ياباني فاخر (Richi)', code: 'RC-500', color: 'أبيض طبيعي', season: 'all', type: 'قطن مخلوط ياباني', popular: true },
  { name: 'تويوبو ياباني أصلي (Toyobo)', code: 'TY-900', color: 'أبيض زبدي', season: 'summer', type: 'بوليستر قطني ناعم', popular: true },
  { name: 'شكيب كوري سوبر بلاتينيوم', code: 'SK-202', color: 'كريمي فاتح', season: 'summer', type: 'خفيف بارد' },
  { name: 'صوف إنجليزي شتوي أصلي', code: 'WO-330', color: 'كحلي داكن', season: 'winter', type: 'صوف طبيعي 80%', popular: true },
  { name: 'صوف إيطالي شتوي فاخر', code: 'IT-770', color: 'رمادي غامق / فحمي', season: 'winter', type: 'صوف معالج ناعم' },
  { name: 'قماش زبدة كوري بارد', code: 'ZB-404', color: 'بيج صحراوي', season: 'summer', type: 'انسيابي خفيف' },
  { name: 'قطن مصري جيزة 100%', code: 'GZ-100', color: 'أبيض عاجي', season: 'summer', type: 'قطن طبيعي صافي' },
  { name: 'قماش تم إحضاره من العميل', code: 'CUST-01', color: 'حسب قماش العميل', season: 'all', type: 'قماش خارجي من العميل', popular: true },
  { name: 'بدون تسجيل قماش (تفصيل فقط / قماش لاحق)', code: 'NO-FABRIC', color: 'غير محدد', season: 'all', type: 'تفصيل وخياطة فقط' },
];

export const COLLAR_OPTIONS_PRESET = [
  { id: 'regular', name: 'ياقة قلاب عادية', sub: 'التقليدية الأكثر انتشاراً', buttons: 2, height: 3.5 },
  { id: 'mandarin', name: 'ياقة صينية (سادة مقفلة)', sub: 'دائرية مرتفعة بدون طي', buttons: 1, height: 3.0 },
  { id: 'royal', name: 'ياقة ملكية عريضة', sub: 'قلاب عريض للمناسبات والوجاهة', buttons: 2, height: 4.2 },
  { id: 'kuwaiti', name: 'ياقة كويتية مائلة', sub: 'زوايا مفتوحة للخارج بانسيابية', buttons: 1, height: 3.2 },
  { id: 'buttoned', name: 'ياقة قلاب أزرار طرفية', sub: 'تثبيت بأزرار صغيرة على الزوايا', buttons: 2, height: 3.5 },
  { id: 'round', name: 'ياقة دائرية مفتوحة (إماراتي)', sub: 'قصة مستديرة حول الرقبة بدون حشوة', buttons: 0, height: 1.5 },
];

export const SLEEVE_OPTIONS_PRESET = [
  { id: 'cuff_chamfered', name: 'كبك مشطوف الزوايا', sub: 'رسمي وأنيق لجميع المناسبات', type: 'cuff' },
  { id: 'cuff_square', name: 'كبك مربع كلاسيكي', sub: 'زوايا حادة 90 درجة تقليدية', type: 'cuff' },
  { id: 'cuff_round', name: 'كبك دائري / مقوس', sub: 'أطراف دائرية ناعمة', type: 'cuff' },
  { id: 'plain', name: 'كم سادة عادي', sub: 'بدون كبك مع كف بسيط', type: 'plain' },
  { id: 'hidden_button', name: 'كم زرار داخلي مخفي', sub: 'مظهر سادة من الخارج مع زرار', type: 'button' },
  { id: 'elastic', name: 'كم مطاطي مزموم', sub: 'مريح للعمل والشباب', type: 'elastic' },
  { id: 'qatari', name: 'كم قطري مدبب', sub: 'قصة مقوسة طويلة فوق المعصم', type: 'special' },
];

export const POCKET_OPTIONS_PRESET = [
  { id: 'chamfered', name: 'جيب صدر مشطوف الزوايا', sub: 'الأكثر شعبية في السعودية' },
  { id: 'regular', name: 'جيب صدر مربع عادي', sub: 'كلاسيكي بسيط' },
  { id: 'square_flap', name: 'جيب صدر مع غطاء (فلب)', sub: 'مع زرار أو بدون غطاء خارجي' },
  { id: 'hidden', name: 'جيب صدر مخفي داخلي', sub: 'مظهر صلب بدون خياطة ظاهرة' },
  { id: 'none', name: 'بدون جيب صدر', sub: 'ثوب ناعم بدون جيوب أمامية' },
];

export const CHEST_OPTIONS_PRESET = [
  { id: 'visible', name: 'جبزور ظاهر صنجار عادي', sub: 'أزرار ظاهرة مرتبة عمودياً' },
  { id: 'hidden', name: 'جبزور مخفي (أزرار مسكرة)', sub: 'غطاء قماش ناعم فوق الأزرار' },
  { id: 'wide', name: 'صنجار عريض ملكي', sub: 'عرض 4 سم مع درزات متوازية' },
  { id: 'narrow', name: 'صنجار رفيع شبابي', sub: 'عرض 2.5 سم ناعم وخفيف' },
  { id: 'embroidered', name: 'صدر مطرز بنقشة هندسية', sub: 'خياطة كمبيوتر أنيقة على الصدر' },
];

export const BUTTON_OPTIONS_PRESET = [
  { id: 'bone', name: 'أزرار عظم أصلية بيضاء', color: '#f8fafc', count: 6 },
  { id: 'pearl', name: 'أزرار صدف طبيعي لامع', color: '#f1f5f9', count: 6 },
  { id: 'plastic', name: 'أزرار بلاستيك مقوى عالية الجودة', color: '#e2e8f0', count: 6 },
  { id: 'fabric', name: 'أزرار ملبسة بنفس قماش الثوب', color: '#ffffff', count: 6 },
  { id: 'snap', name: 'أزرار كبسون داخلية معدنية', color: '#94a3b8', count: 6 },
  { id: 'hidden', name: 'أزرار مخفية داخل الصنجار', color: '#cbd5e1', count: 6 },
  { id: 'none', name: 'بدون أزرار (سحاب / سادة)', color: '#e2e8f0', count: 0 },
];

export const BOTTOM_OPTIONS_PRESET = [
  { id: 'wide_hem', name: 'كف عريض (3.5 - 4 سم)', sub: 'القصة السعودية الرسمية' },
  { id: 'narrow_hem', name: 'كف رفيع عادي (1.5 سم)', sub: 'خفيف ومرن' },
  { id: 'curved', name: 'قصة دوران مائلة للأسفل', sub: 'انسيابي مع حركة القدم' },
  { id: 'side_slits', name: 'فتحات جوانب مع بنسات (كويتي/عماني)', sub: 'فتحات طول 8 - 12 سم' },
];

export const ORDER_STATUS_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  NEW: { label: 'جديد', color: '#1e3a8a', bg: '#dbeafe' },
  MEASURED: { label: 'تم أخذ المقاسات', color: '#1d4ed8', bg: '#eff6ff' },
  CUTTING: { label: 'قيد القص', color: '#92400e', bg: '#fef3c7' },
  SEWING: { label: 'قيد الخياطة', color: '#854d0e', bg: '#fef9c3' },
  FITTING: { label: 'بروفة وقياس', color: '#6b21a8', bg: '#f3e8ff' },
  READY: { label: 'جاهز', color: '#065f46', bg: '#d1fae5' },
  DELIVERED: { label: 'تم التسليم', color: '#374151', bg: '#f3f4f6' },
  CANCELLED: { label: 'ملغي', color: '#991b1b', bg: '#fee2e2' },
};

