/**
 * Heat Exchanger Unit Conversion Hook
 * Provides optimized, memoized unit conversion functions for the Heat Exchanger calculator.
 * 
 * Standards: Consistent with TEMA, API 660, and ASME conventions
 * All internal calculations use SI units (m, Pa, kg, W, K)
 */

import { useCallback, useMemo } from 'react';

export type UnitSystem = 'metric' | 'imperial';
export type TemperatureUnit = 'C' | 'F' | 'K';

// Precise conversion factors (NIST reference values)
export const CONVERSION_FACTORS = {
  // Length
  MM_TO_INCH: 0.0393700787,      // mm → in
  M_TO_FT: 3.280839895,          // m → ft
  
  // Area
  M2_TO_FT2: 10.76391042,        // m² → ft²
  
  // Mass Flow
  KG_HR_TO_LB_HR: 2.204622622,   // kg/hr → lb/hr
  
  // Density
  KG_M3_TO_LB_FT3: 0.0624279606, // kg/m³ → lb/ft³
  
  // Pressure
  PA_TO_PSI: 0.000145037738,     // Pa → psi
  KPA_TO_PSI: 0.145037738,       // kPa → psi
  BAR_TO_PSI: 14.5037738,        // bar → psi
  
  // Velocity
  M_S_TO_FT_S: 3.280839895,      // m/s → ft/s
  
  // Thermal Properties
  W_M2K_TO_BTU_HR_FT2_F: 0.17611018, // W/m²·K → BTU/hr·ft²·°F
  W_MK_TO_BTU_HR_FT_F: 0.5778,       // W/m·K → BTU/hr·ft·°F
  KJ_KGK_TO_BTU_LB_F: 0.2388459,     // kJ/kg·K → BTU/lb·°F
  
  // Fouling Resistance (inverse of HTC)
  M2K_W_TO_HR_FT2_F_BTU: 5.678263,   // m²·K/W → hr·ft²·°F/BTU
  
  // Heat Duty
  W_TO_BTU_HR: 3.412141633,         // W → BTU/hr
  KW_TO_BTU_HR: 3412.141633,        // kW → BTU/hr
} as const;

/**
 * Temperature conversion utilities
 */
export const temperatureConvert = {
  CtoF: (c: number): number => c * 9/5 + 32,
  FtoC: (f: number): number => (f - 32) * 5/9,
  CtoK: (c: number): number => c + 273.15,
  KtoC: (k: number): number => k - 273.15,
  FtoK: (f: number): number => (f - 32) * 5/9 + 273.15,
  KtoF: (k: number): number => (k - 273.15) * 9/5 + 32,
};

/**
 * Property type definitions for structured conversions
 */
export type PropertyType = 
  | 'lengthSmall'      // mm ↔ in
  | 'lengthLarge'      // m ↔ ft
  | 'area'             // m² ↔ ft²
  | 'massFlow'         // kg/hr ↔ lb/hr
  | 'density'          // kg/m³ ↔ lb/ft³
  | 'pressureKPa'      // kPa ↔ psi
  | 'pressureBar'      // bar ↔ psi (for design pressure)
  | 'velocity'         // m/s ↔ ft/s
  | 'htc'              // W/m²·K ↔ BTU/hr·ft²·°F
  | 'thermalCond'      // W/m·K ↔ BTU/hr·ft·°F
  | 'specificHeat'     // kJ/kg·K ↔ BTU/lb·°F
  | 'fouling'          // m²·K/W ↔ hr·ft²·°F/BTU
  | 'heatDutyKW'       // kW ↔ BTU/hr
  | 'heatDutyW';       // W ↔ BTU/hr

/**
 * Property conversion configuration
 */
interface PropertyConfig {
  factor: number;           // Metric → Imperial factor
  decimals: { metric: number; imperial: number };
}

const PROPERTY_CONFIG: Record<PropertyType, PropertyConfig> = {
  lengthSmall: { 
    factor: CONVERSION_FACTORS.MM_TO_INCH, 
    decimals: { metric: 2, imperial: 3 } 
  },
  lengthLarge: { 
    factor: CONVERSION_FACTORS.M_TO_FT, 
    decimals: { metric: 2, imperial: 2 } 
  },
  area: { 
    factor: CONVERSION_FACTORS.M2_TO_FT2, 
    decimals: { metric: 2, imperial: 2 } 
  },
  massFlow: { 
    factor: CONVERSION_FACTORS.KG_HR_TO_LB_HR, 
    decimals: { metric: 0, imperial: 0 } 
  },
  density: { 
    factor: CONVERSION_FACTORS.KG_M3_TO_LB_FT3, 
    decimals: { metric: 1, imperial: 3 } 
  },
  pressureKPa: { 
    factor: CONVERSION_FACTORS.KPA_TO_PSI, 
    decimals: { metric: 1, imperial: 2 } 
  },
  pressureBar: { 
    factor: CONVERSION_FACTORS.BAR_TO_PSI, 
    decimals: { metric: 2, imperial: 1 } 
  },
  velocity: { 
    factor: CONVERSION_FACTORS.M_S_TO_FT_S, 
    decimals: { metric: 2, imperial: 2 } 
  },
  htc: { 
    factor: CONVERSION_FACTORS.W_M2K_TO_BTU_HR_FT2_F, 
    decimals: { metric: 1, imperial: 2 } 
  },
  thermalCond: { 
    factor: CONVERSION_FACTORS.W_MK_TO_BTU_HR_FT_F, 
    decimals: { metric: 4, imperial: 4 } 
  },
  specificHeat: { 
    factor: CONVERSION_FACTORS.KJ_KGK_TO_BTU_LB_F, 
    decimals: { metric: 3, imperial: 3 } 
  },
  fouling: { 
    factor: CONVERSION_FACTORS.M2K_W_TO_HR_FT2_F_BTU, 
    decimals: { metric: 6, imperial: 5 } 
  },
  heatDutyKW: { 
    factor: CONVERSION_FACTORS.KW_TO_BTU_HR, 
    decimals: { metric: 1, imperial: 0 } 
  },
  heatDutyW: { 
    factor: CONVERSION_FACTORS.W_TO_BTU_HR, 
    decimals: { metric: 1, imperial: 0 } 
  },
};

/**
 * Main unit conversion hook
 */
export function useHeatExchangerUnits(unitSystem: UnitSystem) {
  const isImperial = unitSystem === 'imperial';

  /**
   * Convert a numeric value between unit systems
   */
  const convert = useCallback((
    value: number,
    propertyType: PropertyType,
    toSystem: UnitSystem
  ): number => {
    if (isNaN(value) || !isFinite(value)) return value;
    
    const config = PROPERTY_CONFIG[propertyType];
    if (toSystem === 'imperial') {
      return value * config.factor;
    } else {
      return value / config.factor;
    }
  }, []);

  /**
   * Convert a string value between unit systems
   */
  const convertString = useCallback((
    value: string,
    propertyType: PropertyType,
    fromSystem: UnitSystem,
    toSystem: UnitSystem
  ): string => {
    if (fromSystem === toSystem) return value;
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    const config = PROPERTY_CONFIG[propertyType];
    const decimals = config.decimals[toSystem];
    
    if (toSystem === 'imperial') {
      return (num * config.factor).toFixed(decimals);
    } else {
      return (num / config.factor).toFixed(decimals);
    }
  }, []);

  /**
   * Convert temperature between unit systems
   */
  const convertTemperature = useCallback((
    value: string,
    fromUnit: TemperatureUnit,
    toUnit: TemperatureUnit
  ): string => {
    if (fromUnit === toUnit) return value;
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    // Convert to Kelvin first, then to target
    let kelvin: number;
    switch (fromUnit) {
      case 'C': kelvin = temperatureConvert.CtoK(num); break;
      case 'F': kelvin = temperatureConvert.FtoK(num); break;
      case 'K': kelvin = num; break;
    }
    
    let result: number;
    switch (toUnit) {
      case 'C': result = temperatureConvert.KtoC(kelvin); break;
      case 'F': result = temperatureConvert.KtoF(kelvin); break;
      case 'K': result = kelvin; break;
    }
    
    return result.toFixed(1);
  }, []);

  /**
   * Format value for display with correct decimals
   */
  const format = useCallback((
    value: number,
    propertyType: PropertyType
  ): string => {
    if (isNaN(value) || !isFinite(value)) return '—';
    
    const config = PROPERTY_CONFIG[propertyType];
    const decimals = config.decimals[unitSystem];
    return value.toFixed(decimals);
  }, [unitSystem]);

  /**
   * Convert to SI (metric) for calculations - always use this before calculations
   */
  const toSI = useCallback((
    value: string | number,
    propertyType: PropertyType
  ): number => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 0;
    
    if (!isImperial) return num;
    
    const config = PROPERTY_CONFIG[propertyType];
    return num / config.factor;
  }, [isImperial]);

  /**
   * Convert from SI (metric) to display units
   */
  const fromSI = useCallback((
    value: number,
    propertyType: PropertyType
  ): number => {
    if (isNaN(value) || !isFinite(value)) return value;
    
    if (!isImperial) return value;
    
    const config = PROPERTY_CONFIG[propertyType];
    return value * config.factor;
  }, [isImperial]);

  /**
   * Get unit label for a property type
   */
  const getLabel = useMemo(() => ({
    lengthSmall: isImperial ? 'in' : 'mm',
    lengthLarge: isImperial ? 'ft' : 'm',
    area: isImperial ? 'ft²' : 'm²',
    massFlow: isImperial ? 'lb/hr' : 'kg/hr',
    density: isImperial ? 'lb/ft³' : 'kg/m³',
    pressureKPa: isImperial ? 'psi' : 'kPa',
    pressureBar: isImperial ? 'psig' : 'barg',
    velocity: isImperial ? 'ft/s' : 'm/s',
    htc: isImperial ? 'BTU/hr·ft²·°F' : 'W/m²·K',
    thermalCond: isImperial ? 'BTU/hr·ft·°F' : 'W/m·K',
    specificHeat: isImperial ? 'BTU/lb·°F' : 'kJ/kg·K',
    fouling: isImperial ? 'hr·ft²·°F/BTU' : 'm²·K/W',
    heatDutyKW: isImperial ? 'BTU/hr' : 'kW',
    heatDutyW: isImperial ? 'BTU/hr' : 'W',
  }), [isImperial]);

  /**
   * Batch convert fluid properties when unit system changes
   */
  const convertFluidProperties = useCallback((
    props: {
      flowRate: string;
      density: string;
      specificHeat: string;
      thermalConductivity: string;
    },
    fromSystem: UnitSystem,
    toSystem: UnitSystem
  ) => {
    if (fromSystem === toSystem) return props;
    
    return {
      flowRate: convertString(props.flowRate, 'massFlow', fromSystem, toSystem),
      density: convertString(props.density, 'density', fromSystem, toSystem),
      specificHeat: convertString(props.specificHeat, 'specificHeat', fromSystem, toSystem),
      thermalConductivity: convertString(props.thermalConductivity, 'thermalCond', fromSystem, toSystem),
    };
  }, [convertString]);

  /**
   * Batch convert geometry properties when unit system changes
   */
  const convertGeometryProperties = useCallback((
    geom: {
      outerDiameter: string;
      wallThickness: string;
      tubePitch: string;
      shellDiameter: string;
      baffleSpacing: string;
      unsupportedSpanLength: string;
      tubeLength: string;
      shellBaffleLeakage: string;
      tubeBaffleLeakage: string;
    },
    fromSystem: UnitSystem,
    toSystem: UnitSystem
  ) => {
    if (fromSystem === toSystem) return geom;
    
    return {
      outerDiameter: convertString(geom.outerDiameter, 'lengthSmall', fromSystem, toSystem),
      wallThickness: convertString(geom.wallThickness, 'lengthSmall', fromSystem, toSystem),
      tubePitch: convertString(geom.tubePitch, 'lengthSmall', fromSystem, toSystem),
      shellDiameter: convertString(geom.shellDiameter, 'lengthSmall', fromSystem, toSystem),
      baffleSpacing: convertString(geom.baffleSpacing, 'lengthSmall', fromSystem, toSystem),
      unsupportedSpanLength: convertString(geom.unsupportedSpanLength, 'lengthSmall', fromSystem, toSystem),
      tubeLength: convertString(geom.tubeLength, 'lengthLarge', fromSystem, toSystem),
      shellBaffleLeakage: convertString(geom.shellBaffleLeakage, 'lengthSmall', fromSystem, toSystem),
      tubeBaffleLeakage: convertString(geom.tubeBaffleLeakage, 'lengthSmall', fromSystem, toSystem),
    };
  }, [convertString]);

  return {
    // Core conversion functions
    convert,
    convertString,
    convertTemperature,
    format,
    toSI,
    fromSI,
    
    // Labels
    getLabel,
    
    // Batch converters
    convertFluidProperties,
    convertGeometryProperties,
    
    // State
    isImperial,
    unitSystem,
  };
}

/**
 * Utility: Safe number parsing with fallback
 */
export function safeParseFloat(value: string, fallback: number = 0): number {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Utility: Format number with locale-aware separators
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '—';
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}
