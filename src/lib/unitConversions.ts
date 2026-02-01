/**
 * Comprehensive Unit Conversion Library
 * For all engineering calculators
 * 
 * Provides real-time conversion between Metric and Imperial units
 * with validation and bounds checking
 */

export type UnitSystem = 'metric' | 'imperial';

// Conversion factors: multiply metric value to get imperial value
export const CONVERSION_FACTORS = {
  // Length
  mm_to_inch: 0.0393701,
  m_to_ft: 3.28084,
  m_to_inch: 39.3701,
  km_to_mile: 0.621371,
  
  // Area
  m2_to_ft2: 10.7639,
  mm2_to_in2: 0.00155,
  
  // Volume
  m3_to_ft3: 35.3147,
  L_to_gal: 0.264172,
  
  // Mass
  kg_to_lb: 2.20462,
  
  // Flow Rate
  kg_hr_to_lb_hr: 2.20462,
  m3_hr_to_gpm: 4.40287,
  kg_s_to_lb_s: 2.20462,
  
  // Density
  kg_m3_to_lb_ft3: 0.062428,
  
  // Pressure
  bar_to_psi: 14.5038,
  kPa_to_psi: 0.145038,
  MPa_to_psi: 145.038,
  Pa_to_psi: 0.000145038,
  
  // Velocity
  m_s_to_ft_s: 3.28084,
  
  // Temperature (handled separately - not a simple factor)
  
  // Thermal Properties
  W_mK_to_BTU_hr_ft_F: 0.5778,
  kJ_kgK_to_BTU_lb_F: 0.238846,
  W_m2K_to_BTU_hr_ft2_F: 0.17611,
  
  // Fouling Resistance
  m2K_W_to_hr_ft2_F_BTU: 5.67826,
  
  // Heat Duty
  kW_to_BTU_hr: 3412.14,
  W_to_BTU_hr: 3.41214,
  
  // Viscosity
  cP_to_cP: 1, // cP is universal
  Pa_s_to_lb_ft_s: 0.671969,
  
  // Roughness (same as length)
  mm_to_mil: 39.3701,
};

// Inverse factors for Imperial to Metric
export const INVERSE_FACTORS = Object.fromEntries(
  Object.entries(CONVERSION_FACTORS).map(([key, value]) => [key, 1 / value])
) as Record<string, number>;

/**
 * Temperature conversion functions
 */
export const temperatureConversions = {
  C_to_F: (c: number) => (c * 9/5) + 32,
  F_to_C: (f: number) => (f - 32) * 5/9,
  C_to_K: (c: number) => c + 273.15,
  K_to_C: (k: number) => k - 273.15,
  F_to_K: (f: number) => (f - 32) * 5/9 + 273.15,
  K_to_F: (k: number) => (k - 273.15) * 9/5 + 32,
  F_to_R: (f: number) => f + 459.67,
  R_to_F: (r: number) => r - 459.67,
};

/**
 * Unit definition with display labels and conversion info
 */
export interface UnitDefinition {
  metric: {
    label: string;
    symbol: string;
  };
  imperial: {
    label: string;
    symbol: string;
  };
  conversionFactor: number; // Multiply metric to get imperial
  decimals: {
    metric: number;
    imperial: number;
  };
  bounds?: {
    min?: number;
    max?: number;
  };
}

/**
 * Standard unit definitions for engineering properties
 */
export const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  temperature: {
    metric: { label: 'Celsius', symbol: '°C' },
    imperial: { label: 'Fahrenheit', symbol: '°F' },
    conversionFactor: 1, // Special handling
    decimals: { metric: 1, imperial: 1 },
    bounds: { min: -273.15 }
  },
  lengthSmall: {
    metric: { label: 'Millimeters', symbol: 'mm' },
    imperial: { label: 'Inches', symbol: 'in' },
    conversionFactor: CONVERSION_FACTORS.mm_to_inch,
    decimals: { metric: 2, imperial: 3 },
    bounds: { min: 0 }
  },
  lengthLarge: {
    metric: { label: 'Meters', symbol: 'm' },
    imperial: { label: 'Feet', symbol: 'ft' },
    conversionFactor: CONVERSION_FACTORS.m_to_ft,
    decimals: { metric: 2, imperial: 2 },
    bounds: { min: 0 }
  },
  area: {
    metric: { label: 'Square Meters', symbol: 'm²' },
    imperial: { label: 'Square Feet', symbol: 'ft²' },
    conversionFactor: CONVERSION_FACTORS.m2_to_ft2,
    decimals: { metric: 2, imperial: 2 },
    bounds: { min: 0 }
  },
  massFlowRate: {
    metric: { label: 'Kilograms per Hour', symbol: 'kg/hr' },
    imperial: { label: 'Pounds per Hour', symbol: 'lb/hr' },
    conversionFactor: CONVERSION_FACTORS.kg_hr_to_lb_hr,
    decimals: { metric: 0, imperial: 0 },
    bounds: { min: 0 }
  },
  density: {
    metric: { label: 'Kilograms per Cubic Meter', symbol: 'kg/m³' },
    imperial: { label: 'Pounds per Cubic Foot', symbol: 'lb/ft³' },
    conversionFactor: CONVERSION_FACTORS.kg_m3_to_lb_ft3,
    decimals: { metric: 1, imperial: 3 },
    bounds: { min: 0 }
  },
  viscosity: {
    metric: { label: 'Centipoise', symbol: 'cP' },
    imperial: { label: 'Centipoise', symbol: 'cP' },
    conversionFactor: 1, // cP is universal
    decimals: { metric: 3, imperial: 3 },
    bounds: { min: 0 }
  },
  specificHeat: {
    metric: { label: 'Kilojoules per Kilogram Kelvin', symbol: 'kJ/kg·K' },
    imperial: { label: 'BTU per Pound Fahrenheit', symbol: 'BTU/lb·°F' },
    conversionFactor: CONVERSION_FACTORS.kJ_kgK_to_BTU_lb_F,
    decimals: { metric: 3, imperial: 3 },
    bounds: { min: 0 }
  },
  thermalConductivity: {
    metric: { label: 'Watts per Meter Kelvin', symbol: 'W/m·K' },
    imperial: { label: 'BTU per Hour Foot Fahrenheit', symbol: 'BTU/hr·ft·°F' },
    conversionFactor: CONVERSION_FACTORS.W_mK_to_BTU_hr_ft_F,
    decimals: { metric: 4, imperial: 4 },
    bounds: { min: 0 }
  },
  heatTransferCoeff: {
    metric: { label: 'Watts per Square Meter Kelvin', symbol: 'W/m²·K' },
    imperial: { label: 'BTU per Hour Square Foot Fahrenheit', symbol: 'BTU/hr·ft²·°F' },
    conversionFactor: CONVERSION_FACTORS.W_m2K_to_BTU_hr_ft2_F,
    decimals: { metric: 1, imperial: 2 },
    bounds: { min: 0 }
  },
  foulingResistance: {
    metric: { label: 'Square Meter Kelvin per Watt', symbol: 'm²·K/W' },
    imperial: { label: 'Hour Square Foot Fahrenheit per BTU', symbol: 'hr·ft²·°F/BTU' },
    conversionFactor: CONVERSION_FACTORS.m2K_W_to_hr_ft2_F_BTU,
    decimals: { metric: 5, imperial: 4 },
    bounds: { min: 0 }
  },
  pressure: {
    metric: { label: 'Bar (gauge)', symbol: 'barg' },
    imperial: { label: 'Pounds per Square Inch (gauge)', symbol: 'psig' },
    conversionFactor: CONVERSION_FACTORS.bar_to_psi,
    decimals: { metric: 2, imperial: 1 },
  },
  pressureKPa: {
    metric: { label: 'Kilopascals', symbol: 'kPa' },
    imperial: { label: 'Pounds per Square Inch', symbol: 'psi' },
    conversionFactor: CONVERSION_FACTORS.kPa_to_psi,
    decimals: { metric: 1, imperial: 2 },
    bounds: { min: 0 }
  },
  velocity: {
    metric: { label: 'Meters per Second', symbol: 'm/s' },
    imperial: { label: 'Feet per Second', symbol: 'ft/s' },
    conversionFactor: CONVERSION_FACTORS.m_s_to_ft_s,
    decimals: { metric: 2, imperial: 2 },
    bounds: { min: 0 }
  },
  heatDuty: {
    metric: { label: 'Kilowatts', symbol: 'kW' },
    imperial: { label: 'BTU per Hour', symbol: 'BTU/hr' },
    conversionFactor: CONVERSION_FACTORS.kW_to_BTU_hr,
    decimals: { metric: 1, imperial: 0 },
    bounds: { min: 0 }
  },
};

/**
 * Convert a value from metric to imperial or vice versa
 */
export function convertValue(
  value: number | string,
  unitType: keyof typeof UNIT_DEFINITIONS,
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): number {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return NaN;
  
  if (fromSystem === toSystem) return numValue;
  
  const unitDef = UNIT_DEFINITIONS[unitType];
  if (!unitDef) {
    console.warn(`Unknown unit type: ${unitType}`);
    return numValue;
  }
  
  // Special handling for temperature
  if (unitType === 'temperature') {
    if (fromSystem === 'metric') {
      return temperatureConversions.C_to_F(numValue);
    } else {
      return temperatureConversions.F_to_C(numValue);
    }
  }
  
  // Standard conversion
  const factor = unitDef.conversionFactor;
  if (fromSystem === 'metric') {
    return numValue * factor;
  } else {
    return numValue / factor;
  }
}

/**
 * Format a value with appropriate decimals for the unit system
 */
export function formatValue(
  value: number,
  unitType: keyof typeof UNIT_DEFINITIONS,
  unitSystem: UnitSystem
): string {
  if (isNaN(value) || !isFinite(value)) return '—';
  
  const unitDef = UNIT_DEFINITIONS[unitType];
  if (!unitDef) return value.toFixed(2);
  
  const decimals = unitDef.decimals[unitSystem];
  return value.toFixed(decimals);
}

/**
 * Get the unit symbol for display
 */
export function getUnitSymbol(
  unitType: keyof typeof UNIT_DEFINITIONS,
  unitSystem: UnitSystem
): string {
  const unitDef = UNIT_DEFINITIONS[unitType];
  if (!unitDef) return '';
  return unitDef[unitSystem].symbol;
}

/**
 * Validate a value is within bounds
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  correctedValue?: number;
}

export function validateValue(
  value: number | string,
  unitType: keyof typeof UNIT_DEFINITIONS,
  unitSystem: UnitSystem
): ValidationResult {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, message: 'Invalid number' };
  }
  
  const unitDef = UNIT_DEFINITIONS[unitType];
  if (!unitDef?.bounds) {
    return { isValid: true };
  }
  
  // Convert bounds to current unit system if needed
  let minBound = unitDef.bounds.min;
  let maxBound = unitDef.bounds.max;
  
  if (unitSystem === 'imperial' && unitType !== 'temperature') {
    if (minBound !== undefined) minBound *= unitDef.conversionFactor;
    if (maxBound !== undefined) maxBound *= unitDef.conversionFactor;
  } else if (unitSystem === 'imperial' && unitType === 'temperature') {
    if (minBound !== undefined) minBound = temperatureConversions.C_to_F(minBound);
    if (maxBound !== undefined) maxBound = temperatureConversions.C_to_F(maxBound);
  }
  
  if (minBound !== undefined && numValue < minBound) {
    return {
      isValid: false,
      message: `Value below minimum (${formatValue(minBound, unitType, unitSystem)} ${getUnitSymbol(unitType, unitSystem)})`,
      correctedValue: minBound
    };
  }
  
  if (maxBound !== undefined && numValue > maxBound) {
    return {
      isValid: false,
      message: `Value above maximum (${formatValue(maxBound, unitType, unitSystem)} ${getUnitSymbol(unitType, unitSystem)})`,
      correctedValue: maxBound
    };
  }
  
  return { isValid: true };
}

/**
 * Convert and format a string value for display
 */
export function convertAndFormat(
  value: string,
  unitType: keyof typeof UNIT_DEFINITIONS,
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): string {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  
  const converted = convertValue(numValue, unitType, fromSystem, toSystem);
  return formatValue(converted, unitType, toSystem);
}

/**
 * Batch convert multiple values for a unit system change
 */
export interface ConversionSpec {
  value: string;
  unitType: keyof typeof UNIT_DEFINITIONS;
}

export function batchConvert(
  values: Record<string, ConversionSpec>,
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, spec] of Object.entries(values)) {
    result[key] = convertAndFormat(spec.value, spec.unitType, fromSystem, toSystem);
  }
  
  return result;
}

/**
 * Convert to SI units (always metric base)
 */
export function toSI(
  value: number | string,
  unitType: keyof typeof UNIT_DEFINITIONS,
  fromSystem: UnitSystem
): number {
  if (fromSystem === 'metric') {
    return typeof value === 'string' ? parseFloat(value) : value;
  }
  return convertValue(value, unitType, 'imperial', 'metric');
}

/**
 * Convert from SI units to display system
 */
export function fromSI(
  value: number,
  unitType: keyof typeof UNIT_DEFINITIONS,
  toSystem: UnitSystem
): number {
  if (toSystem === 'metric') {
    return value;
  }
  return convertValue(value, unitType, 'metric', 'imperial');
}
