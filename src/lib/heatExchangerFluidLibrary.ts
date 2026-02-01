/**
 * Fluid Properties Library for Heat Exchanger Calculations
 * Based on GPSA Engineering Data Book and industry standards
 */

import { FluidType, FluidProperties, UnitSystem } from './heatExchangerTypes';


// Fluid database with properties at reference conditions (25°C, 1 atm)
// Note: This is a legacy database. Use fluidLibraryExpanded.ts for the full library.
const fluidDatabase: Partial<Record<FluidType, Partial<FluidProperties>>> = {
  [FluidType.CRUDE_OIL]: {
    density: 850,
    viscosity: 10,
    specificHeat: 2.0,
    thermalConductivity: 0.14,
    boilingPoint: 350,
    molecularWeight: 300,
    criticalTemp: 700,
    criticalPressure: 2.0
  },
  [FluidType.NATURAL_GAS]: {
    density: 0.8,
    viscosity: 0.011,
    specificHeat: 2.2,
    thermalConductivity: 0.03,
    boilingPoint: -161,
    molecularWeight: 18,
    criticalTemp: 190,
    criticalPressure: 4.6
  },
  [FluidType.WATER]: {
    density: 997,
    viscosity: 0.89,
    specificHeat: 4.18,
    thermalConductivity: 0.606,
    boilingPoint: 100,
    freezingPoint: 0,
    molecularWeight: 18,
    criticalTemp: 647,
    criticalPressure: 22.1
  },
  [FluidType.STEAM]: {
    density: 0.6,
    viscosity: 0.012,
    specificHeat: 2.0,
    thermalConductivity: 0.025,
    boilingPoint: 100,
    molecularWeight: 18,
    criticalTemp: 647,
    criticalPressure: 22.1
  },
  [FluidType.AMINE]: {
    density: 1010,
    viscosity: 1.5,
    specificHeat: 3.5,
    thermalConductivity: 0.5,
    boilingPoint: 170,
    molecularWeight: 61
  },
  [FluidType.GLYCOL]: {
    density: 1110,
    viscosity: 20,
    specificHeat: 2.4,
    thermalConductivity: 0.256,
    freezingPoint: -13,
    boilingPoint: 197,
    molecularWeight: 62
  },
  [FluidType.PROPANE]: {
    density: 493,
    viscosity: 0.097,
    specificHeat: 2.52,
    thermalConductivity: 0.089,
    boilingPoint: -42,
    molecularWeight: 44,
    criticalTemp: 370,
    criticalPressure: 4.25
  },
  [FluidType.BUTANE]: {
    density: 573,
    viscosity: 0.157,
    specificHeat: 2.39,
    thermalConductivity: 0.107,
    boilingPoint: -0.5,
    molecularWeight: 58,
    criticalTemp: 425,
    criticalPressure: 3.80
  },
  [FluidType.NAPHTHA]: {
    density: 750,
    viscosity: 0.6,
    specificHeat: 2.1,
    thermalConductivity: 0.12,
    boilingPoint: 150,
    molecularWeight: 100
  },
  [FluidType.DIESEL]: {
    density: 850,
    viscosity: 3.0,
    specificHeat: 2.0,
    thermalConductivity: 0.13,
    boilingPoint: 300,
    molecularWeight: 200
  },
  [FluidType.CUSTOM]: {}
};

/**
 * Get fluid properties for a given fluid type and unit system
 */
export function getFluidTypeProperties(
  type: FluidType, 
  unitSystem: UnitSystem
): Partial<FluidProperties> {
  const props = { ...fluidDatabase[type] };
  
  if (unitSystem === UnitSystem.IMPERIAL) {
    return {
      ...props,
      density: props.density ? props.density * 0.062428 : undefined,
      specificHeat: props.specificHeat ? props.specificHeat * 0.238846 : undefined,
      thermalConductivity: props.thermalConductivity ? props.thermalConductivity * 0.5778 : undefined,
      boilingPoint: props.boilingPoint ? props.boilingPoint * 9/5 + 32 : undefined,
      freezingPoint: props.freezingPoint ? props.freezingPoint * 9/5 + 32 : undefined
    };
  }
  
  return props;
}

/**
 * GPSA Hydrocarbon Viscosity Correlation
 * Reference: GPSA Engineering Data Book, Section 23
 * @param temperature - Temperature in °C
 * @param apiGravity - API gravity of the fluid
 * @returns Viscosity in cP
 */
export function calculateHydrocarbonViscosity(
  temperature: number, 
  apiGravity: number
): number {
  const T = temperature + 273.15; // Convert to Kelvin
  const A = 10.715 * Math.pow(apiGravity + 100, -0.515);
  const B = 5.44 * Math.pow(apiGravity + 150, -0.338);
  
  return A * Math.pow(T, B);
}

/**
 * Lee-Gonzalez Correlation for Gas Viscosity
 * Reference: GPSA Engineering Data Book
 * @param temperature - Temperature in °C
 * @param pressure - Pressure in MPa
 * @param specificGravity - Gas specific gravity (air = 1.0)
 * @returns Viscosity in cP
 */
export function calculateGasViscosity(
  temperature: number, 
  pressure: number, 
  specificGravity: number
): number {
  const T = temperature + 273.15; // Convert to Kelvin
  const M = 28.97 * specificGravity; // Molecular weight
  
  // Gas density approximation (ideal gas)
  const R = 8.314; // J/(mol·K)
  const rho = (pressure * 1e6 * M) / (R * T * 1000); // kg/m³
  const rhoGramPerL = rho; // g/L = kg/m³
  
  const K = (9.4 + 0.02 * M) * Math.pow(T, 1.5) / (209 + 19 * M + T);
  const X = 3.5 + 986 / T + 0.01 * M;
  const Y = 2.4 - 0.2 * X;
  
  return K * Math.exp(X * Math.pow(rhoGramPerL / 1000, Y)) / 10000;
}

/**
 * Calculate Prandtl number from fluid properties
 */
export function calculatePrandtl(
  specificHeat: number,    // kJ/kg·K
  viscosity: number,       // cP
  thermalConductivity: number // W/m·K
): number {
  // Cp in J/kg·K, μ in Pa·s, k in W/m·K
  const Cp = specificHeat * 1000; // kJ -> J
  const mu = viscosity * 0.001;   // cP -> Pa·s
  return (Cp * mu) / thermalConductivity;
}

/**
 * Estimate water properties at a given temperature
 * Reference: GPSA Engineering Data Book
 */
export function getWaterPropertiesAtTemp(temperature: number): FluidProperties {
  const T = temperature; // °C
  
  // Density correlation (valid 0-100°C)
  const density = 1000 * (1 - Math.abs(T - 4) * 0.00006);
  
  // Viscosity correlation (Vogel equation approximation)
  const viscosity = 1.787 * Math.exp(-0.03 * T);
  
  // Specific heat (relatively constant)
  const specificHeat = 4.18 - 0.0005 * T;
  
  // Thermal conductivity
  const thermalConductivity = 0.569 + 0.0018 * T - 0.000006 * T * T;
  
  return {
    density: Math.max(density, 800),
    viscosity: Math.max(viscosity, 0.2),
    specificHeat,
    thermalConductivity: Math.max(thermalConductivity, 0.4),
    boilingPoint: 100,
    freezingPoint: 0
  };
}

/**
 * Get all available fluid types
 */
export function getAvailableFluidTypes(): FluidType[] {
  return Object.values(FluidType);
}

/**
 * Get fluid type display name
 */
export function getFluidTypeDisplayName(type: FluidType): string {
  const names: Partial<Record<FluidType, string>> = {
    [FluidType.CRUDE_OIL]: 'Crude Oil',
    [FluidType.NATURAL_GAS]: 'Natural Gas',
    [FluidType.WATER]: 'Water',
    [FluidType.STEAM]: 'Steam',
    [FluidType.AMINE]: 'Amine (MEA/DEA)',
    [FluidType.GLYCOL]: 'Glycol (MEG/DEG)',
    [FluidType.PROPANE]: 'Propane',
    [FluidType.BUTANE]: 'Butane',
    [FluidType.NAPHTHA]: 'Naphtha',
    [FluidType.DIESEL]: 'Diesel',
    [FluidType.CUSTOM]: 'Custom Fluid'
  };
  return names[type] || type;
}

export { fluidDatabase };
