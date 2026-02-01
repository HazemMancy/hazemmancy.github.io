/**
 * Expanded Fluid Properties Library for Heat Exchanger Calculations
 * Comprehensive database for Oil & Gas industry fluids
 * 
 * Data sources:
 * - GPSA Engineering Data Book (14th Edition)
 * - API Technical Data Book
 * - Perry's Chemical Engineers' Handbook
 * - NIST Chemistry WebBook
 * - DIPPR 801 Database
 */

import { FluidType, FluidPhase, FluidCategory, FluidDefinition, FluidProperties, FluidPropertyCoefficients } from './heatExchangerTypes';

// Universal Gas Constant
const R_GAS = 8.314; // J/(mol·K)

/**
 * Calculate speed of sound for gases using ideal gas approximation
 * c = sqrt(γ * R * T / M)
 * @param gamma - Cp/Cv ratio
 * @param mw - Molecular weight (g/mol)
 * @param tempK - Temperature in Kelvin
 */
export function calculateGasSpeedOfSound(gamma: number, mw: number, tempK: number): number {
  return Math.sqrt((gamma * R_GAS * tempK) / (mw / 1000));
}

/**
 * Calculate speed of sound for liquids using Newton-Laplace equation
 * c = sqrt(K / ρ)
 * @param bulkModulus - Bulk modulus in GPa
 * @param density - Density in kg/m³
 */
export function calculateLiquidSpeedOfSound(bulkModulus: number, density: number): number {
  return Math.sqrt((bulkModulus * 1e9) / density);
}

/**
 * Interpolate fluid properties at a given temperature
 * Uses polynomial or Andrade equation depending on property
 */
export function interpolateProperties(
  baseProps: FluidProperties,
  coefficients: FluidPropertyCoefficients | undefined,
  temperature: number // °C
): FluidProperties {
  if (!coefficients) {
    return baseProps;
  }

  // Clamp temperature to valid range
  const T = Math.max(
    coefficients.validRange.min,
    Math.min(coefficients.validRange.max, temperature)
  );

  const deltaT = T - coefficients.refTemp;

  // Polynomial interpolation for most properties
  const calcPoly = (coef: { A: number; B: number; C: number; D?: number }, baseVal: number) => {
    const result = baseVal + coef.A * deltaT + coef.B * deltaT * deltaT + (coef.D || 0) * deltaT * deltaT * deltaT;
    return Math.max(0.001, result);
  };

  // Viscosity often follows Andrade equation: μ = A * exp(B / (T + C))
  const calcViscosity = (coef: { A: number; B: number; C: number }, baseVal: number) => {
    if (coef.A === 0) {
      // Use linear approximation
      return Math.max(0.001, baseVal * (1 + coef.B * deltaT / 100));
    }
    return Math.max(0.001, coef.A * Math.exp(coef.B / (T + coef.C + 273.15)));
  };

  const density = baseProps.density * (1 + coefficients.density.B * deltaT / 1000);
  const specificHeat = baseProps.specificHeat * (1 + coefficients.specificHeat.B * deltaT / 1000);
  const thermalConductivity = baseProps.thermalConductivity * (1 + coefficients.thermalConductivity.B * deltaT / 1000);
  const viscosity = calcViscosity(coefficients.viscosity, baseProps.viscosity);

  return {
    ...baseProps,
    density: Math.max(0.01, density),
    specificHeat: Math.max(0.1, specificHeat),
    thermalConductivity: Math.max(0.001, thermalConductivity),
    viscosity: Math.max(0.001, viscosity)
  };
}

/**
 * Calculate speed of sound based on fluid type and conditions
 */
export function calculateSpeedOfSound(
  fluid: FluidDefinition,
  temperature: number, // °C
  pressure?: number // bar (for gases)
): number {
  const tempK = temperature + 273.15;
  
  if (fluid.phase === FluidPhase.GAS) {
    // Use gamma and MW for gas speed of sound
    const gamma = fluid.properties.gamma || 1.4;
    const mw = fluid.properties.molecularWeight || 28.97;
    return calculateGasSpeedOfSound(gamma, mw, tempK);
  } else {
    // Use bulk modulus for liquids
    const K = fluid.properties.bulkModulus || 2.2; // Default water-like
    const rho = fluid.properties.density;
    return calculateLiquidSpeedOfSound(K, rho);
  }
}

// ============================================================================
// COMPREHENSIVE FLUID DATABASE
// ============================================================================

export const fluidLibrary: Partial<Record<FluidType, FluidDefinition>> = {
  // ========== WATER & STEAM ==========
  [FluidType.WATER]: {
    type: FluidType.WATER,
    name: "Water",
    category: FluidCategory.WATER_STEAM,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 997,
      viscosity: 0.89,
      specificHeat: 4.18,
      thermalConductivity: 0.606,
      molecularWeight: 18.015,
      boilingPoint: 100,
      freezingPoint: 0,
      bulkModulus: 2.2,
      criticalTemp: 647,
      criticalPressure: 22.1
    },
    coefficients: {
      density: { A: -0.0001, B: -0.3, C: 0 },
      viscosity: { A: 0.001, B: 570, C: -140 },
      specificHeat: { A: 0, B: 0.1, C: 0 },
      thermalConductivity: { A: 0, B: 2.5, C: 0 },
      refTemp: 25,
      validRange: { min: 0, max: 200 }
    },
    description: "Pure water at standard conditions"
  },

  [FluidType.STEAM]: {
    type: FluidType.STEAM,
    name: "Steam (Saturated)",
    category: FluidCategory.WATER_STEAM,
    phase: FluidPhase.GAS,
    properties: {
      density: 0.6,
      viscosity: 0.012,
      specificHeat: 2.08,
      thermalConductivity: 0.025,
      molecularWeight: 18.015,
      gamma: 1.33,
      boilingPoint: 100
    },
    description: "Saturated steam at atmospheric pressure"
  },

  [FluidType.BOILER_FEEDWATER]: {
    type: FluidType.BOILER_FEEDWATER,
    name: "Boiler Feedwater",
    category: FluidCategory.WATER_STEAM,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 985,
      viscosity: 0.45,
      specificHeat: 4.22,
      thermalConductivity: 0.68,
      molecularWeight: 18.015,
      bulkModulus: 2.2
    },
    coefficients: {
      density: { A: 0, B: -0.4, C: 0 },
      viscosity: { A: 0.0003, B: 650, C: -130 },
      specificHeat: { A: 0, B: 0.15, C: 0 },
      thermalConductivity: { A: 0, B: 1.8, C: 0 },
      refTemp: 80,
      validRange: { min: 40, max: 200 }
    },
    description: "Treated feedwater for boilers"
  },

  [FluidType.COOLING_WATER]: {
    type: FluidType.COOLING_WATER,
    name: "Cooling Water",
    category: FluidCategory.WATER_STEAM,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 998,
      viscosity: 0.95,
      specificHeat: 4.18,
      thermalConductivity: 0.60,
      molecularWeight: 18.015,
      bulkModulus: 2.2
    },
    description: "Circulating cooling water (treated)"
  },

  [FluidType.SEAWATER]: {
    type: FluidType.SEAWATER,
    name: "Seawater (3.5% salinity)",
    category: FluidCategory.WATER_STEAM,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1025,
      viscosity: 1.08,
      specificHeat: 3.99,
      thermalConductivity: 0.58,
      molecularWeight: 18.5,
      bulkModulus: 2.3
    },
    coefficients: {
      density: { A: 0, B: -0.35, C: 0 },
      viscosity: { A: 0.0012, B: 580, C: -138 },
      specificHeat: { A: 0, B: 0.08, C: 0 },
      thermalConductivity: { A: 0, B: 2.2, C: 0 },
      refTemp: 25,
      validRange: { min: 5, max: 80 }
    },
    description: "Ocean/sea water with typical salinity"
  },

  // ========== CRUDE & PRODUCTS ==========
  [FluidType.CRUDE_OIL_LIGHT]: {
    type: FluidType.CRUDE_OIL_LIGHT,
    name: "Light Crude Oil (API 35-40)",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 830,
      viscosity: 8,
      specificHeat: 2.0,
      thermalConductivity: 0.135,
      molecularWeight: 220,
      bulkModulus: 1.4,
      boilingPoint: 350
    },
    coefficients: {
      density: { A: 0, B: -0.7, C: 0 },
      viscosity: { A: 0, B: -3.5, C: 0 },
      specificHeat: { A: 0, B: 1.8, C: 0 },
      thermalConductivity: { A: 0, B: -0.8, C: 0 },
      refTemp: 25,
      validRange: { min: 20, max: 300 }
    },
    description: "Light crude oil, API gravity 35-40°"
  },

  [FluidType.CRUDE_OIL_MEDIUM]: {
    type: FluidType.CRUDE_OIL_MEDIUM,
    name: "Medium Crude Oil (API 25-35)",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 880,
      viscosity: 25,
      specificHeat: 1.92,
      thermalConductivity: 0.13,
      molecularWeight: 280,
      bulkModulus: 1.5,
      boilingPoint: 400
    },
    coefficients: {
      density: { A: 0, B: -0.65, C: 0 },
      viscosity: { A: 0, B: -4.2, C: 0 },
      specificHeat: { A: 0, B: 2.0, C: 0 },
      thermalConductivity: { A: 0, B: -0.7, C: 0 },
      refTemp: 25,
      validRange: { min: 20, max: 300 }
    },
    description: "Medium crude oil, API gravity 25-35°"
  },

  [FluidType.CRUDE_OIL_HEAVY]: {
    type: FluidType.CRUDE_OIL_HEAVY,
    name: "Heavy Crude Oil (API 15-25)",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 940,
      viscosity: 150,
      specificHeat: 1.85,
      thermalConductivity: 0.125,
      molecularWeight: 400,
      bulkModulus: 1.6,
      boilingPoint: 500
    },
    coefficients: {
      density: { A: 0, B: -0.58, C: 0 },
      viscosity: { A: 0, B: -5.5, C: 0 },
      specificHeat: { A: 0, B: 2.2, C: 0 },
      thermalConductivity: { A: 0, B: -0.6, C: 0 },
      refTemp: 30,
      validRange: { min: 30, max: 300 }
    },
    description: "Heavy crude oil, API gravity 15-25°"
  },

  [FluidType.NAPHTHA]: {
    type: FluidType.NAPHTHA,
    name: "Naphtha",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 720,
      viscosity: 0.55,
      specificHeat: 2.1,
      thermalConductivity: 0.14,
      molecularWeight: 100,
      bulkModulus: 1.1,
      boilingPoint: 150
    },
    coefficients: {
      density: { A: 0, B: -0.95, C: 0 },
      viscosity: { A: 0, B: -2.5, C: 0 },
      specificHeat: { A: 0, B: 2.2, C: 0 },
      thermalConductivity: { A: 0, B: -1.2, C: 0 },
      refTemp: 25,
      validRange: { min: -20, max: 150 }
    },
    description: "Light petroleum distillate"
  },

  [FluidType.KEROSENE]: {
    type: FluidType.KEROSENE,
    name: "Kerosene",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 800,
      viscosity: 1.8,
      specificHeat: 2.0,
      thermalConductivity: 0.138,
      molecularWeight: 170,
      bulkModulus: 1.3,
      boilingPoint: 250
    },
    coefficients: {
      density: { A: 0, B: -0.8, C: 0 },
      viscosity: { A: 0, B: -2.8, C: 0 },
      specificHeat: { A: 0, B: 2.0, C: 0 },
      thermalConductivity: { A: 0, B: -1.0, C: 0 },
      refTemp: 25,
      validRange: { min: -50, max: 200 }
    },
    description: "Kerosene / Jet fuel range"
  },

  [FluidType.DIESEL]: {
    type: FluidType.DIESEL,
    name: "Diesel Fuel",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 840,
      viscosity: 3.5,
      specificHeat: 1.95,
      thermalConductivity: 0.132,
      molecularWeight: 200,
      bulkModulus: 1.35,
      boilingPoint: 300
    },
    coefficients: {
      density: { A: 0, B: -0.75, C: 0 },
      viscosity: { A: 0, B: -3.0, C: 0 },
      specificHeat: { A: 0, B: 2.0, C: 0 },
      thermalConductivity: { A: 0, B: -0.9, C: 0 },
      refTemp: 25,
      validRange: { min: -20, max: 250 }
    },
    description: "Automotive/industrial diesel"
  },

  [FluidType.GASOLINE]: {
    type: FluidType.GASOLINE,
    name: "Gasoline",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 740,
      viscosity: 0.5,
      specificHeat: 2.05,
      thermalConductivity: 0.14,
      molecularWeight: 100,
      bulkModulus: 1.0,
      boilingPoint: 120
    },
    coefficients: {
      density: { A: 0, B: -1.0, C: 0 },
      viscosity: { A: 0, B: -2.2, C: 0 },
      specificHeat: { A: 0, B: 2.2, C: 0 },
      thermalConductivity: { A: 0, B: -1.3, C: 0 },
      refTemp: 25,
      validRange: { min: -40, max: 100 }
    },
    description: "Motor gasoline / petrol"
  },

  [FluidType.JET_FUEL]: {
    type: FluidType.JET_FUEL,
    name: "Jet Fuel (Jet A-1)",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 810,
      viscosity: 2.0,
      specificHeat: 2.0,
      thermalConductivity: 0.138,
      molecularWeight: 165,
      bulkModulus: 1.28,
      boilingPoint: 260,
      freezingPoint: -47
    },
    description: "Aviation turbine fuel"
  },

  [FluidType.FUEL_OIL]: {
    type: FluidType.FUEL_OIL,
    name: "Heavy Fuel Oil (No. 6)",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 970,
      viscosity: 300,
      specificHeat: 1.75,
      thermalConductivity: 0.12,
      molecularWeight: 450,
      bulkModulus: 1.6,
      boilingPoint: 550
    },
    coefficients: {
      density: { A: 0, B: -0.55, C: 0 },
      viscosity: { A: 0, B: -6.0, C: 0 },
      specificHeat: { A: 0, B: 2.4, C: 0 },
      thermalConductivity: { A: 0, B: -0.5, C: 0 },
      refTemp: 50,
      validRange: { min: 50, max: 300 }
    },
    description: "Bunker C / Heavy fuel oil"
  },

  [FluidType.LUBE_OIL]: {
    type: FluidType.LUBE_OIL,
    name: "Lubricating Oil",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 880,
      viscosity: 100,
      specificHeat: 2.0,
      thermalConductivity: 0.13,
      molecularWeight: 400,
      bulkModulus: 1.5
    },
    coefficients: {
      density: { A: 0, B: -0.6, C: 0 },
      viscosity: { A: 0, B: -5.0, C: 0 },
      specificHeat: { A: 0, B: 2.0, C: 0 },
      thermalConductivity: { A: 0, B: -0.6, C: 0 },
      refTemp: 40,
      validRange: { min: 20, max: 150 }
    },
    description: "Mineral base lubricating oil"
  },

  [FluidType.ASPHALT]: {
    type: FluidType.ASPHALT,
    name: "Asphalt/Bitumen",
    category: FluidCategory.CRUDE_PRODUCTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1030,
      viscosity: 10000,
      specificHeat: 1.65,
      thermalConductivity: 0.17,
      molecularWeight: 800,
      bulkModulus: 1.8,
      boilingPoint: 600
    },
    description: "Paving grade asphalt/bitumen"
  },

  // ========== LIGHT HYDROCARBONS ==========
  [FluidType.METHANE]: {
    type: FluidType.METHANE,
    name: "Methane (CH₄)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.GAS,
    properties: {
      density: 0.668,
      viscosity: 0.011,
      specificHeat: 2.22,
      thermalConductivity: 0.034,
      molecularWeight: 16.04,
      gamma: 1.31,
      boilingPoint: -161,
      criticalTemp: 190.6,
      criticalPressure: 4.60
    },
    description: "Pure methane gas"
  },

  [FluidType.ETHANE]: {
    type: FluidType.ETHANE,
    name: "Ethane (C₂H₆)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.GAS,
    properties: {
      density: 1.26,
      viscosity: 0.0092,
      specificHeat: 1.75,
      thermalConductivity: 0.021,
      molecularWeight: 30.07,
      gamma: 1.19,
      boilingPoint: -89,
      criticalTemp: 305.3,
      criticalPressure: 4.87
    },
    description: "Pure ethane gas"
  },

  [FluidType.PROPANE]: {
    type: FluidType.PROPANE,
    name: "Propane (C₃H₈)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 493,
      viscosity: 0.11,
      specificHeat: 2.52,
      thermalConductivity: 0.089,
      molecularWeight: 44.1,
      gamma: 1.13,
      bulkModulus: 0.35,
      boilingPoint: -42,
      criticalTemp: 369.8,
      criticalPressure: 4.25
    },
    description: "Liquid propane (refrigerated or pressurized)"
  },

  [FluidType.BUTANE]: {
    type: FluidType.BUTANE,
    name: "n-Butane (C₄H₁₀)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 573,
      viscosity: 0.16,
      specificHeat: 2.39,
      thermalConductivity: 0.107,
      molecularWeight: 58.12,
      gamma: 1.09,
      bulkModulus: 0.42,
      boilingPoint: -0.5,
      criticalTemp: 425.1,
      criticalPressure: 3.80
    },
    description: "Liquid n-butane"
  },

  [FluidType.ISOBUTANE]: {
    type: FluidType.ISOBUTANE,
    name: "Isobutane (i-C₄H₁₀)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 551,
      viscosity: 0.14,
      specificHeat: 2.44,
      thermalConductivity: 0.095,
      molecularWeight: 58.12,
      gamma: 1.10,
      bulkModulus: 0.38,
      boilingPoint: -12,
      criticalTemp: 408.1,
      criticalPressure: 3.65
    },
    description: "Liquid isobutane"
  },

  [FluidType.PENTANE]: {
    type: FluidType.PENTANE,
    name: "n-Pentane (C₅H₁₂)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 626,
      viscosity: 0.24,
      specificHeat: 2.32,
      thermalConductivity: 0.113,
      molecularWeight: 72.15,
      bulkModulus: 0.52,
      boilingPoint: 36
    },
    description: "Liquid pentane"
  },

  [FluidType.HEXANE]: {
    type: FluidType.HEXANE,
    name: "n-Hexane (C₆H₁₄)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 659,
      viscosity: 0.31,
      specificHeat: 2.27,
      thermalConductivity: 0.12,
      molecularWeight: 86.18,
      bulkModulus: 0.68,
      boilingPoint: 69
    },
    description: "Liquid hexane"
  },

  [FluidType.NATURAL_GAS]: {
    type: FluidType.NATURAL_GAS,
    name: "Natural Gas (Typical)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.GAS,
    properties: {
      density: 0.75,
      viscosity: 0.011,
      specificHeat: 2.2,
      thermalConductivity: 0.035,
      molecularWeight: 18.5,
      gamma: 1.28
    },
    description: "Typical natural gas composition"
  },

  [FluidType.LPG]: {
    type: FluidType.LPG,
    name: "LPG (Propane/Butane Mix)",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 530,
      viscosity: 0.13,
      specificHeat: 2.45,
      thermalConductivity: 0.095,
      molecularWeight: 50,
      bulkModulus: 0.38,
      boilingPoint: -25
    },
    description: "Liquefied petroleum gas blend"
  },

  [FluidType.NGL]: {
    type: FluidType.NGL,
    name: "Natural Gas Liquids",
    category: FluidCategory.LIGHT_HC,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 560,
      viscosity: 0.18,
      specificHeat: 2.4,
      thermalConductivity: 0.10,
      molecularWeight: 55,
      bulkModulus: 0.45,
      boilingPoint: 10
    },
    description: "Mixed NGLs (C2-C5+)"
  },

  // ========== PROCESS CHEMICALS ==========
  [FluidType.AMINE_MEA]: {
    type: FluidType.AMINE_MEA,
    name: "MEA Solution (30 wt%)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1010,
      viscosity: 2.2,
      specificHeat: 3.5,
      thermalConductivity: 0.48,
      molecularWeight: 61,
      bulkModulus: 2.0,
      boilingPoint: 170
    },
    coefficients: {
      density: { A: 0, B: -0.45, C: 0 },
      viscosity: { A: 0, B: -3.5, C: 0 },
      specificHeat: { A: 0, B: 0.5, C: 0 },
      thermalConductivity: { A: 0, B: 1.5, C: 0 },
      refTemp: 40,
      validRange: { min: 20, max: 130 }
    },
    description: "Monoethanolamine 30% aqueous solution"
  },

  [FluidType.AMINE_DEA]: {
    type: FluidType.AMINE_DEA,
    name: "DEA Solution (25 wt%)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1020,
      viscosity: 3.0,
      specificHeat: 3.3,
      thermalConductivity: 0.45,
      molecularWeight: 105,
      bulkModulus: 2.0,
      boilingPoint: 190
    },
    description: "Diethanolamine 25% aqueous solution"
  },

  [FluidType.AMINE_MDEA]: {
    type: FluidType.AMINE_MDEA,
    name: "MDEA Solution (50 wt%)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1030,
      viscosity: 8.0,
      specificHeat: 2.9,
      thermalConductivity: 0.35,
      molecularWeight: 119,
      bulkModulus: 2.1,
      boilingPoint: 247
    },
    description: "Methyldiethanolamine 50% aqueous solution"
  },

  [FluidType.GLYCOL_MEG]: {
    type: FluidType.GLYCOL_MEG,
    name: "MEG (Monoethylene Glycol)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1110,
      viscosity: 20,
      specificHeat: 2.35,
      thermalConductivity: 0.256,
      molecularWeight: 62,
      bulkModulus: 2.4,
      boilingPoint: 197,
      freezingPoint: -13
    },
    coefficients: {
      density: { A: 0, B: -0.6, C: 0 },
      viscosity: { A: 0, B: -4.5, C: 0 },
      specificHeat: { A: 0, B: 1.3, C: 0 },
      thermalConductivity: { A: 0, B: -0.3, C: 0 },
      refTemp: 25,
      validRange: { min: -10, max: 180 }
    },
    description: "Pure monoethylene glycol"
  },

  [FluidType.GLYCOL_DEG]: {
    type: FluidType.GLYCOL_DEG,
    name: "DEG (Diethylene Glycol)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1118,
      viscosity: 35,
      specificHeat: 2.15,
      thermalConductivity: 0.21,
      molecularWeight: 106,
      bulkModulus: 2.5,
      boilingPoint: 245
    },
    description: "Pure diethylene glycol"
  },

  [FluidType.GLYCOL_TEG]: {
    type: FluidType.GLYCOL_TEG,
    name: "TEG (Triethylene Glycol)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1125,
      viscosity: 49,
      specificHeat: 2.05,
      thermalConductivity: 0.19,
      molecularWeight: 150,
      bulkModulus: 2.6,
      boilingPoint: 285
    },
    coefficients: {
      density: { A: 0, B: -0.55, C: 0 },
      viscosity: { A: 0, B: -4.8, C: 0 },
      specificHeat: { A: 0, B: 1.1, C: 0 },
      thermalConductivity: { A: 0, B: -0.4, C: 0 },
      refTemp: 25,
      validRange: { min: 10, max: 200 }
    },
    description: "Pure triethylene glycol (gas dehydration)"
  },

  [FluidType.METHANOL]: {
    type: FluidType.METHANOL,
    name: "Methanol",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 792,
      viscosity: 0.59,
      specificHeat: 2.51,
      thermalConductivity: 0.203,
      molecularWeight: 32,
      bulkModulus: 0.82,
      boilingPoint: 65
    },
    description: "Pure methanol"
  },

  [FluidType.ETHANOL]: {
    type: FluidType.ETHANOL,
    name: "Ethanol",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 789,
      viscosity: 1.2,
      specificHeat: 2.44,
      thermalConductivity: 0.171,
      molecularWeight: 46,
      bulkModulus: 0.89,
      boilingPoint: 78
    },
    description: "Pure ethanol"
  },

  [FluidType.CAUSTIC_SODA]: {
    type: FluidType.CAUSTIC_SODA,
    name: "Caustic Soda (50% NaOH)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1530,
      viscosity: 78,
      specificHeat: 2.0,
      thermalConductivity: 0.65,
      molecularWeight: 40,
      bulkModulus: 3.0
    },
    description: "50% sodium hydroxide solution"
  },

  [FluidType.SULFURIC_ACID]: {
    type: FluidType.SULFURIC_ACID,
    name: "Sulfuric Acid (98%)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1840,
      viscosity: 27,
      specificHeat: 1.38,
      thermalConductivity: 0.35,
      molecularWeight: 98,
      bulkModulus: 3.5,
      boilingPoint: 337
    },
    description: "Concentrated sulfuric acid"
  },

  [FluidType.AMMONIA]: {
    type: FluidType.AMMONIA,
    name: "Ammonia (Liquid)",
    category: FluidCategory.PROCESS_CHEMICALS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 610,
      viscosity: 0.13,
      specificHeat: 4.7,
      thermalConductivity: 0.48,
      molecularWeight: 17,
      bulkModulus: 1.0,
      boilingPoint: -33
    },
    description: "Liquid anhydrous ammonia"
  },

  // ========== GASES ==========
  [FluidType.HYDROGEN]: {
    type: FluidType.HYDROGEN,
    name: "Hydrogen (H₂)",
    category: FluidCategory.GASES,
    phase: FluidPhase.GAS,
    properties: {
      density: 0.084,
      viscosity: 0.0088,
      specificHeat: 14.3,
      thermalConductivity: 0.182,
      molecularWeight: 2.016,
      gamma: 1.41,
      boilingPoint: -253
    },
    description: "Pure hydrogen gas"
  },

  [FluidType.NITROGEN]: {
    type: FluidType.NITROGEN,
    name: "Nitrogen (N₂)",
    category: FluidCategory.GASES,
    phase: FluidPhase.GAS,
    properties: {
      density: 1.165,
      viscosity: 0.0176,
      specificHeat: 1.04,
      thermalConductivity: 0.026,
      molecularWeight: 28.01,
      gamma: 1.40,
      boilingPoint: -196
    },
    description: "Pure nitrogen gas"
  },

  [FluidType.OXYGEN]: {
    type: FluidType.OXYGEN,
    name: "Oxygen (O₂)",
    category: FluidCategory.GASES,
    phase: FluidPhase.GAS,
    properties: {
      density: 1.33,
      viscosity: 0.0204,
      specificHeat: 0.92,
      thermalConductivity: 0.027,
      molecularWeight: 32,
      gamma: 1.40,
      boilingPoint: -183
    },
    description: "Pure oxygen gas"
  },

  [FluidType.CO2]: {
    type: FluidType.CO2,
    name: "Carbon Dioxide (CO₂)",
    category: FluidCategory.GASES,
    phase: FluidPhase.GAS,
    properties: {
      density: 1.84,
      viscosity: 0.0147,
      specificHeat: 0.85,
      thermalConductivity: 0.0166,
      molecularWeight: 44.01,
      gamma: 1.29,
      boilingPoint: -78,
      criticalTemp: 304.2,
      criticalPressure: 7.38
    },
    description: "Carbon dioxide gas"
  },

  [FluidType.H2S]: {
    type: FluidType.H2S,
    name: "Hydrogen Sulfide (H₂S)",
    category: FluidCategory.GASES,
    phase: FluidPhase.GAS,
    properties: {
      density: 1.43,
      viscosity: 0.0125,
      specificHeat: 1.01,
      thermalConductivity: 0.014,
      molecularWeight: 34.08,
      gamma: 1.32,
      boilingPoint: -60
    },
    description: "Hydrogen sulfide (toxic)"
  },

  [FluidType.FLUE_GAS]: {
    type: FluidType.FLUE_GAS,
    name: "Flue Gas (Typical)",
    category: FluidCategory.GASES,
    phase: FluidPhase.GAS,
    properties: {
      density: 1.15,
      viscosity: 0.018,
      specificHeat: 1.05,
      thermalConductivity: 0.028,
      molecularWeight: 29,
      gamma: 1.35
    },
    description: "Combustion flue gas (~12% CO₂)"
  },

  [FluidType.AIR]: {
    type: FluidType.AIR,
    name: "Air",
    category: FluidCategory.GASES,
    phase: FluidPhase.GAS,
    properties: {
      density: 1.205,
      viscosity: 0.0181,
      specificHeat: 1.006,
      thermalConductivity: 0.026,
      molecularWeight: 28.97,
      gamma: 1.40
    },
    coefficients: {
      density: { A: 0, B: -0.35, C: 0 },
      viscosity: { A: 0, B: 0.8, C: 0 },
      specificHeat: { A: 0, B: 0.02, C: 0 },
      thermalConductivity: { A: 0, B: 0.8, C: 0 },
      refTemp: 25,
      validRange: { min: -40, max: 500 }
    },
    description: "Atmospheric air"
  },

  // ========== REFRIGERANTS ==========
  [FluidType.R134A]: {
    type: FluidType.R134A,
    name: "R-134a (Tetrafluoroethane)",
    category: FluidCategory.REFRIGERANTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1206,
      viscosity: 0.20,
      specificHeat: 1.42,
      thermalConductivity: 0.081,
      molecularWeight: 102,
      bulkModulus: 0.5,
      boilingPoint: -26
    },
    description: "Common HFC refrigerant"
  },

  [FluidType.R410A]: {
    type: FluidType.R410A,
    name: "R-410A",
    category: FluidCategory.REFRIGERANTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1062,
      viscosity: 0.12,
      specificHeat: 1.84,
      thermalConductivity: 0.088,
      molecularWeight: 72.6,
      bulkModulus: 0.45,
      boilingPoint: -52
    },
    description: "HFC refrigerant blend"
  },

  [FluidType.R22]: {
    type: FluidType.R22,
    name: "R-22 (Chlorodifluoromethane)",
    category: FluidCategory.REFRIGERANTS,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1194,
      viscosity: 0.21,
      specificHeat: 1.26,
      thermalConductivity: 0.086,
      molecularWeight: 86.5,
      bulkModulus: 0.55,
      boilingPoint: -41
    },
    description: "HCFC refrigerant (phasing out)"
  },

  // ========== OTHER ==========
  [FluidType.THERMAL_OIL]: {
    type: FluidType.THERMAL_OIL,
    name: "Thermal Oil (Therminol 66)",
    category: FluidCategory.OTHER,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1020,
      viscosity: 30,
      specificHeat: 1.58,
      thermalConductivity: 0.118,
      molecularWeight: 250,
      bulkModulus: 1.8,
      boilingPoint: 359
    },
    coefficients: {
      density: { A: 0, B: -0.68, C: 0 },
      viscosity: { A: 0, B: -5.5, C: 0 },
      specificHeat: { A: 0, B: 2.5, C: 0 },
      thermalConductivity: { A: 0, B: -0.8, C: 0 },
      refTemp: 25,
      validRange: { min: 10, max: 340 }
    },
    description: "High-temperature heat transfer fluid"
  },

  [FluidType.BRINE]: {
    type: FluidType.BRINE,
    name: "Brine (CaCl₂ 30%)",
    category: FluidCategory.OTHER,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1290,
      viscosity: 3.5,
      specificHeat: 2.72,
      thermalConductivity: 0.55,
      molecularWeight: 111,
      bulkModulus: 2.8,
      freezingPoint: -50
    },
    description: "Calcium chloride brine solution"
  },

  [FluidType.CUSTOM]: {
    type: FluidType.CUSTOM,
    name: "Custom Fluid",
    category: FluidCategory.OTHER,
    phase: FluidPhase.LIQUID,
    properties: {
      density: 1000,
      viscosity: 1.0,
      specificHeat: 4.0,
      thermalConductivity: 0.5,
      molecularWeight: 100,
      bulkModulus: 2.0
    },
    description: "User-defined fluid properties"
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get fluid definition by type
 */
export function getFluidDefinition(type: FluidType): FluidDefinition | undefined {
  // Handle backwards-compatible aliases
  if (type === FluidType.CRUDE_OIL) {
    return fluidLibrary[FluidType.CRUDE_OIL_MEDIUM];
  }
  if (type === FluidType.AMINE) {
    return fluidLibrary[FluidType.AMINE_MEA];
  }
  if (type === FluidType.GLYCOL) {
    return fluidLibrary[FluidType.GLYCOL_MEG];
  }
  return fluidLibrary[type];
}

/**
 * Get fluid display name
 */
export function getFluidDisplayName(type: FluidType): string {
  const fluid = getFluidDefinition(type);
  return fluid?.name || 'Custom Fluid';
}

/**
 * Get fluids grouped by category
 */
export function getFluidsByCategory(): Record<FluidCategory, FluidType[]> {
  const grouped: Record<FluidCategory, FluidType[]> = {
    [FluidCategory.WATER_STEAM]: [],
    [FluidCategory.CRUDE_PRODUCTS]: [],
    [FluidCategory.LIGHT_HC]: [],
    [FluidCategory.PROCESS_CHEMICALS]: [],
    [FluidCategory.GASES]: [],
    [FluidCategory.REFRIGERANTS]: [],
    [FluidCategory.OTHER]: []
  };

  Object.values(fluidLibrary).forEach(fluid => {
    if (fluid) {
      grouped[fluid.category].push(fluid.type);
    }
  });

  return grouped;
}

/**
 * Get all fluid types as array
 */
export function getAllFluidTypes(): FluidType[] {
  return Object.values(FluidType);
}

/**
 * Get temperature-adjusted properties
 */
export function getPropertiesAtTemperature(
  type: FluidType,
  temperature: number
): FluidProperties {
  const fluid = getFluidDefinition(type);
  if (!fluid) {
    return fluidLibrary[FluidType.CUSTOM]!.properties;
  }
  return interpolateProperties(fluid.properties, fluid.coefficients, temperature);
}

/**
 * Calculate Prandtl number from fluid properties
 */
export function calculatePrandtlNumber(
  specificHeat: number,    // kJ/kg·K
  viscosity: number,       // cP
  thermalConductivity: number // W/m·K
): number {
  const Cp = specificHeat * 1000; // kJ -> J
  const mu = viscosity * 0.001;   // cP -> Pa·s
  return (Cp * mu) / thermalConductivity;
}
