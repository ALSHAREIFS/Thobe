/**
 * Measurement Unit Conversion Utilities
 * Handles exact conversions between Centimeters (CM) and Inches (IN)
 * with rounding and safeguards against drift.
 */

import { MeasurementData, MeasurementUnit } from '../types';

export type { MeasurementUnit };

export const CM_PER_INCH = 2.54;

/**
 * Convert centimeters to inches, rounded to specified decimal places (default 2).
 * If val is falsy/0/null/undefined, returns 0.
 */
export function convertCmToInch(val: number | undefined | null, decimals: number = 2): number {
  if (!val || isNaN(val) || val <= 0) return 0;
  const converted = val / CM_PER_INCH;
  const factor = Math.pow(10, decimals);
  return Math.round((converted + Number.EPSILON) * factor) / factor;
}

/**
 * Convert inches to centimeters, rounded to specified decimal places (default 2).
 * If val is falsy/0/null/undefined, returns 0.
 */
export function convertInchToCm(val: number | undefined | null, decimals: number = 2): number {
  if (!val || isNaN(val) || val <= 0) return 0;
  const converted = val * CM_PER_INCH;
  const factor = Math.pow(10, decimals);
  return Math.round((converted + Number.EPSILON) * factor) / factor;
}

/**
 * Converts a single measurement value between units.
 */
export function convertMeasurementValue(
  val: number | undefined | null,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit,
  decimals: number = 2
): number {
  if (fromUnit === toUnit) {
    return (val && !isNaN(val) && val > 0) ? val : 0;
  }
  if (fromUnit === 'cm' && toUnit === 'inch') {
    return convertCmToInch(val, decimals);
  }
  if (fromUnit === 'inch' && toUnit === 'cm') {
    return convertInchToCm(val, decimals);
  }
  return (val && !isNaN(val) && val > 0) ? val : 0;
}

/**
 * Convert an entire MeasurementData object when the active unit changes.
 * Non-numeric and 0 values are preserved safely.
 */
export function convertMeasurementData(
  data: MeasurementData,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit
): MeasurementData {
  if (fromUnit === toUnit) return { ...data };

  const converted: MeasurementData = { ...data };

  for (const key of Object.keys(data)) {
    const rawVal = data[key];
    if (typeof rawVal === 'number') {
      if (rawVal > 0) {
        converted[key] = convertMeasurementValue(rawVal, fromUnit, toUnit, 2);
      } else {
        converted[key] = 0;
      }
    }
  }

  return converted;
}

/**
 * Get display label in Arabic for a measurement unit.
 */
export function getUnitLabel(unit?: MeasurementUnit | string): string {
  return unit === 'inch' ? 'إنش' : 'سم';
}

/**
 * Scale field config limits (min, max, step, defaultVal) for a given unit.
 * Base configuration in presets.ts is defined in CM.
 */
export function getFieldLimitsForUnit(
  baseMin: number,
  baseMax: number,
  baseStep: number,
  baseDefaultVal: number,
  unit?: MeasurementUnit | string
): { min: number; max: number; step: number; defaultVal: number } {
  if (unit !== 'inch') {
    return {
      min: baseMin,
      max: baseMax,
      step: baseStep,
      defaultVal: baseDefaultVal,
    };
  }

  // Unit is inch: convert min and max, use 0.25 inch step
  return {
    min: Math.round((baseMin / CM_PER_INCH) * 10) / 10,
    max: Math.round((baseMax / CM_PER_INCH) * 10) / 10,
    step: 0.25,
    defaultVal: Math.round((baseDefaultVal / CM_PER_INCH) * 10) / 10,
  };
}

