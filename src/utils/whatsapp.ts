/**
 * WhatsApp Integration Utilities for "Thobi" (ثوبي)
 * 
 * Provides safe phone number normalization, link generation,
 * and context-aware Arabic message templates for tailoring workflows.
 */

import type { OrderStatus } from '../types';

/**
 * Converts Arabic-Indic and Eastern Arabic digits to standard ASCII digits.
 */
export function convertArabicIndicDigits(str: string): string {
  if (!str) return '';
  const arabicIndicMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };
  return str.replace(/[٠-٩۰-۹]/g, (char) => arabicIndicMap[char] || char);
}

/**
 * Normalizes a phone number into a WhatsApp-compatible international format (E.164 without leading +).
 * 
 * Supports:
 * - 0501234567 -> 966501234567
 * - 501234567 -> 966501234567
 * - +966501234567 -> 966501234567 (no duplicated country code)
 * - 00966501234567 -> 966501234567
 * - 9660501234567 -> 966501234567
 * - International numbers (e.g. +971501234567 -> 971501234567)
 * 
 * Returns null if the number is empty, malformed, or invalid.
 */
export function normalizeWhatsAppNumber(
  rawPhone: string | null | undefined,
  defaultCountryCode = '966'
): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return null;
  }

  // 1. Convert Arabic-indic digits and clean whitespace
  let cleaned = convertArabicIndicDigits(rawPhone.trim());

  // 2. Remove common formatting artifacts (spaces, dashes, parens, dots, slashes)
  cleaned = cleaned.replace(/[\s\-_()[\]/\\.]/g, '');

  // 3. Handle leading "+"
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // 4. Handle leading "00" (international exit prefix)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  // If after stripping it's not all digits, it's invalid
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  // 5. Normalization for default country (Saudi Arabia '966')
  if (defaultCountryCode === '966') {
    // Mistaken format: 96605XXXXXXXX (13 digits with redundant 0)
    if (cleaned.startsWith('96605') && cleaned.length === 13) {
      cleaned = '966' + cleaned.slice(4);
    }

    // Already has 966 prefix
    if (cleaned.startsWith('966')) {
      // Standard Saudi mobile is 966 followed by 9 digits starting with 5 (total 12 digits)
      const afterCode = cleaned.slice(3);
      if (afterCode.startsWith('5') && afterCode.length === 9) {
        return cleaned;
      }
      // Or 8-9 digits landline/toll-free if applicable
      if (cleaned.length >= 11 && cleaned.length <= 12) {
        return cleaned;
      }
    }

    // Local format starting with 05XXXXXXXX (10 digits)
    if (cleaned.startsWith('05') && cleaned.length === 10) {
      return '966' + cleaned.slice(1);
    }

    // Local format without leading 0: 5XXXXXXXX (9 digits)
    if (cleaned.startsWith('5') && cleaned.length === 9) {
      return '966' + cleaned;
    }
  }

  // 6. Generic international check:
  // E.164 without leading plus typically has 8 to 15 digits.
  if (cleaned.length >= 8 && cleaned.length <= 15) {
    // If it starts with a leading 0 and wasn't handled by country code, it is likely an invalid local format
    if (cleaned.startsWith('0')) {
      return null;
    }
    return cleaned;
  }

  return null;
}

/**
 * Convenient alias for Saudi mobile WhatsApp normalization
 */
export function normalizeSaudiWhatsAppNumber(phone: string | null | undefined): string | null {
  return normalizeWhatsAppNumber(phone, '966');
}

/**
 * Builds a direct wa.me link with URL-encoded message.
 * Returns null if the phone number is invalid.
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
  defaultCountryCode = '966'
): string | null {
  const normalized = normalizeWhatsAppNumber(phone, defaultCountryCode);
  if (!normalized) return null;

  const encodedMessage = encodeURIComponent(message.trim());
  return `https://wa.me/${normalized}?text=${encodedMessage}`;
}

export interface BuildOrderMessageParams {
  customerName?: string | null;
  orderNumber?: string | null;
  status?: OrderStatus | string | null;
  shopName?: string | null;
  deliveryDate?: string | null;
  remainingAmount?: number | null;
}

/**
 * Generates an appropriate, context-aware Arabic message tailored to the order status.
 * Guarantees NO "undefined" or "null" placeholders.
 */
export function buildOrderWhatsAppMessage(params: BuildOrderMessageParams): string {
  const customerPart = params.customerName?.trim() ? ` ${params.customerName.trim()}` : '';
  const greeting = `السلام عليكم${customerPart}،`;
  const shopPart = params.shopName?.trim() ? ` لدى ${params.shopName.trim()}` : '';
  const orderRef = params.orderNumber?.trim() ? ` رقم ${params.orderNumber.trim()}` : '';
  const status = (params.status || 'NEW').toUpperCase();

  switch (status) {
    case 'READY': {
      const locationText = params.shopName?.trim()
        ? `يمكنك زيارة ${params.shopName.trim()} لاستلام الطلب.`
        : 'يمكنك زيارة المحل لاستلام طلبك في أوقات العمل الرسمية.';
      return `${greeting}
يسعدنا إبلاغك بأن طلبك${orderRef} أصبح جاهزًا للاستلام.

${locationText}

شكرًا لتعاملك معنا 🌷`;
    }

    case 'NEW':
      return `${greeting}
تم تسجيل طلبك${orderRef} بنجاح${shopPart}.

نسعد بخدمتك دائمًا، وسنوافيكم بآخر التحديثات أثناء مراحل التفصيل.`;

    case 'MEASURED':
      return `${greeting}
تم تسجيل واعتماد مقاسات طلبك${orderRef} بنجاح${shopPart}.

سنبدأ في تجهيز وتفصيل الثوب قريبًا بإذن الله.`;

    case 'CUTTING':
      return `${greeting}
نود إبلاغك بأن طلبك${orderRef} دخل مرحلة القص والتجهيز${shopPart}.`;

    case 'SEWING':
      return `${greeting}
طلبك${orderRef} حاليًا في مرحلة الخياطة والتجميع بدقة عالية${shopPart}.`;

    case 'FITTING': {
      const visitText = params.shopName?.trim()
        ? `لدى ${params.shopName.trim()}`
        : 'بالمحل';
      return `${greeting}
طلبك${orderRef} جاهز الآن للبروفة والقياس ${visitText}.

نسعد بزيارتك لتجربة المقاس والتأكد من ملاءمته التامة.`;
    }

    case 'DELIVERED':
      return `${greeting}
شكرًا لاختيارك${shopPart}.
نتمنى أن ينال طلبك${orderRef} كامل رضاك واستحسانك، ونسعد دائمًا بخدمتك.`;

    case 'CANCELLED':
      return `${greeting}
نود التواصل معك بخصوص طلبك${orderRef}${shopPart}.`;

    default:
      return `${greeting}
بخصوص طلبك${orderRef}${shopPart}.`;
  }
}

export interface BuildCustomerMessageParams {
  customerName?: string | null;
  shopName?: string | null;
}

/**
 * Builds a friendly general greeting for a customer without an active order.
 */
export function buildCustomerWhatsAppMessage(params: BuildCustomerMessageParams): string {
  const customerPart = params.customerName?.trim() ? ` ${params.customerName.trim()}` : '';
  const greeting = `السلام عليكم${customerPart}،`;
  
  if (params.shopName?.trim()) {
    return `${greeting}
معك ${params.shopName.trim()}.
نسعد بتواصلك معنا، كيف يمكننا مساعدتك اليوم؟`;
  }

  return `${greeting}
نسعد بتواصلك معنا، كيف يمكننا مساعدتك اليوم؟`;
}

export interface OpenWhatsAppOptions {
  phone: string | null | undefined;
  message: string;
  defaultCountryCode?: string;
}

export interface OpenWhatsAppResult {
  success: boolean;
  error?: string;
}

/**
 * Safely opens a WhatsApp conversation in a new browser tab.
 * Handles popup blocker errors and invalid phone numbers gracefully.
 */
export function openWhatsAppChat(options: OpenWhatsAppOptions): OpenWhatsAppResult {
  const url = buildWhatsAppUrl(options.phone, options.message, options.defaultCountryCode);
  if (!url) {
    return {
      success: false,
      error: 'رقم هاتف العميل غير صالح لواتساب',
    };
  }

  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      return {
        success: false,
        error: 'تعذر فتح واتساب. تأكد من السماح بالنوافذ المنبثقة في متصفحك.',
      };
    }
    return { success: true };
  } catch (err) {
    console.error('Error opening WhatsApp chat:', err);
    return {
      success: false,
      error: 'حدث خطأ أثناء محاولة فتح واتساب.',
    };
  }
}
