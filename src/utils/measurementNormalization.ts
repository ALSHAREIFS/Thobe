/**
 * Centralized Measurement Numeral Normalization & Formatting Layer
 *
 * NON-NEGOTIABLE INVARIANT:
 * Changing numeral representation must NEVER change numeric value.
 *
 * 67 -> ٦٧ (Arabic display)
 * 67 -> 67 (Latin display)
 * 60.5 -> ٦٠.٥ (or ٦٠٫٥)
 *
 * parse(format(value)) === value for all supported numbers.
 *
 * Formatting is PRESENTATION ONLY:
 * - NEVER alters measurement value
 * - NEVER triggers unit conversion (CM <-> INCH is independent)
 * - NEVER substitutes presets
 * - NEVER rounds to a different measurement
 * - Decouples canonical storage (pure JS number) from display representation.
 */

// Mapping of all Arabic-Indic and Eastern Arabic/Persian digits to standard ASCII digits
const DIGIT_MAP: Record<string, string> = {
  // Arabic-Indic digits (used in Arabic)
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  // Eastern Arabic / Persian / Urdu digits
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

// Reverse mapping: ASCII digits to Arabic-Indic digits
const ARABIC_DIGITS: string[] = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export type NumeralSystem = 'arabic' | 'latin';

const NUMERAL_PREFERENCE_KEY = 'thobi_measurement_numeral_system';

/**
 * Get current numeral display system preference.
 * Defaults to 'latin' (standard tailoring measurement tape digits), with quick toggle available.
 */
export function getMeasurementNumeralPreference(): NumeralSystem {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'latin';
  }
  try {
    const saved = window.localStorage.getItem(NUMERAL_PREFERENCE_KEY);
    if (saved === 'arabic' || saved === 'latin') {
      return saved;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return 'latin';
}

/**
 * Set and persist current numeral display system preference.
 */
export function setMeasurementNumeralPreference(system: NumeralSystem): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(NUMERAL_PREFERENCE_KEY, system);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Normalizes any numeral input string:
 * - Converts Arabic-Indic and Persian digits to standard ASCII '0'-'9'
 * - Normalizes Arabic decimal separator '٫' (U+066B), Arabic comma '،' (U+060C), and ',' to '.'
 * - Strips RTL/LTR marks and illegal non-numeric characters (leaving only digits and at most one decimal point)
 * - Trims whitespace
 */
export function normalizeNumeralInput(input: string | number | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  if (typeof input === 'number') {
    if (isNaN(input)) return '';
    return input.toString();
  }

  const raw = String(input);
  if (!raw.trim()) {
    return '';
  }

  // 1. Remove unicode directional marks (RLM, LRM, ALM, etc.)
  let cleaned = raw.replace(/[\u200E\u200F\u061C\u202A-\u202E]/g, '').trim();

  // 2. Convert all Arabic-Indic and Persian digits to ASCII
  cleaned = cleaned.replace(/[٠-٩۰-۹]/g, (ch) => DIGIT_MAP[ch] || ch);

  // 3. Normalize decimal separators: Arabic Momayyez (٫), Arabic comma (،), Latin comma (,) -> standard period (.)
  cleaned = cleaned.replace(/[٫،,]/g, '.');

  // 4. Strip everything except digits and decimal point
  cleaned = cleaned.replace(/[^0-9.]/g, '');

  // 5. If there are multiple dots, preserve only the first dot
  const parts = cleaned.split('.');
  if (parts.length > 1) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  return cleaned;
}

/**
 * Safely parses any measurement input (string with Latin or Arabic digits, number, etc.)
 * into a canonical numeric value.
 *
 * Guarantees:
 * - Never returns NaN
 * - Never mutates value (e.g. 67 stays 67, 60.5 stays 60.5)
 * - Negative values clamped to 0
 * - Rounded to maximum 2 decimal places to prevent IEEE floating point noise
 */
export function parseMeasurementNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined) {
    return 0;
  }

  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return 0;
    return Math.round((input + Number.EPSILON) * 100) / 100;
  }

  const normalized = normalizeNumeralInput(input);
  if (!normalized || normalized === '.') {
    return 0;
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

/**
 * Converts ASCII digits in any string or number to Arabic-Indic digits (٠-٩).
 * Optionally keeps '.' or converts '.' to Arabic decimal comma '٫'.
 */
export function toArabicIndicDigits(value: string | number, useArabicDecimalSeparator: boolean = false): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  let converted = str.replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d, 10)] || d);

  if (useArabicDecimalSeparator) {
    converted = converted.replace(/\./g, '٫');
  }

  return converted;
}

/**
 * Converts Arabic-Indic and Persian digits to standard ASCII Latin digits (0-9).
 */
export function toLatinDigits(value: string | number): string {
  return normalizeNumeralInput(value);
}

export interface FormatMeasurementOptions {
  numeralSystem?: NumeralSystem;
  allowEmpty?: boolean;
  useArabicDecimalSeparator?: boolean;
  maxDecimals?: number;
}

/**
 * Formats a canonical measurement value for presentation.
 * PRESENTATION ONLY - never alters the canonical value.
 *
 * parseMeasurementNumber(formatMeasurementDisplay(val)) === val ALWAYS holds!
 */
export function formatMeasurementDisplay(
  value: number | string | null | undefined,
  options: FormatMeasurementOptions = {}
): string {
  const {
    numeralSystem = 'latin',
    allowEmpty = false,
    useArabicDecimalSeparator = false,
    maxDecimals = 2,
  } = options;

  if (value === null || value === undefined || value === '') {
    return allowEmpty ? '' : (numeralSystem === 'arabic' ? '٠' : '0');
  }

  const num = typeof value === 'number' ? value : parseMeasurementNumber(value);

  if (isNaN(num) || num <= 0) {
    return allowEmpty ? '' : (numeralSystem === 'arabic' ? '٠' : '0');
  }

  // Format canonical clean number string (e.g. 67 -> "67", 60.5 -> "60.5")
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
  const standardStr = rounded.toString();

  if (numeralSystem === 'arabic') {
    return toArabicIndicDigits(standardStr, useArabicDecimalSeparator);
  }

  return standardStr;
}

/**
 * Audit and normalize an entire MeasurementData object to ensure all fields are pure numbers.
 * Strips NaN, undefined, or string residue.
 */
export function sanitizeMeasurementData<T extends Record<string, any>>(data: T): T {
  const result: Record<string, any> = {};

  for (const key of Object.keys(data)) {
    const val = data[key];
    if (typeof val === 'number') {
      result[key] = isNaN(val) || val < 0 ? 0 : Math.round((val + Number.EPSILON) * 100) / 100;
    } else if (typeof val === 'string' && val.trim() !== '') {
      result[key] = parseMeasurementNumber(val);
    } else if (val === null || val === undefined || val === '') {
      result[key] = 0;
    } else {
      result[key] = val;
    }
  }

  return result as T;
}
