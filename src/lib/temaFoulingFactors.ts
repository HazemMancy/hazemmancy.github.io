/**
 * TEMA RGP-T-2.4 Recommended Fouling Factors
 * Reference: TEMA Standards (10th Edition), Table RGP-T-2.4
 * 
 * These values represent thermal resistance due to fouling deposits
 * Units: m²·K/W (SI) or hr·ft²·°F/BTU (Imperial)
 */

import { FluidType } from './heatExchangerTypes';

// TEMA Table RGP-T-2.4 - Fouling Factors in m²·K/W (SI Units)
export interface FoulingFactorEntry {
  service: string;
  category: string;
  rfSI: number;          // m²·K/W
  rfImperial: number;    // hr·ft²·°F/BTU
  velocityNote?: string;
  temperatureNote?: string;
}

// Complete TEMA RGP-T-2.4 Fouling Factor Database
export const TEMA_FOULING_FACTORS: Record<string, FoulingFactorEntry> = {
  // ============================================
  // WATER (Cooling Water)
  // ============================================
  'cooling_water_treated_clean': {
    service: 'Cooling Water - Treated, Clean',
    category: 'Water',
    rfSI: 0.000176,
    rfImperial: 0.001,
    velocityNote: 'v > 0.9 m/s (3 ft/s)',
    temperatureNote: 'T < 50°C (125°F)'
  },
  'cooling_water_treated_moderate': {
    service: 'Cooling Water - Treated, Moderate',
    category: 'Water',
    rfSI: 0.000352,
    rfImperial: 0.002,
    velocityNote: 'v > 0.9 m/s',
    temperatureNote: 'T > 50°C'
  },
  'cooling_water_untreated': {
    service: 'Cooling Water - Untreated',
    category: 'Water',
    rfSI: 0.000528,
    rfImperial: 0.003,
    velocityNote: 'v > 0.9 m/s'
  },
  'cooling_tower_water': {
    service: 'Cooling Tower Water',
    category: 'Water',
    rfSI: 0.000352,
    rfImperial: 0.002,
    velocityNote: 'v > 0.9 m/s'
  },
  'city_water': {
    service: 'City/Municipal Water',
    category: 'Water',
    rfSI: 0.000176,
    rfImperial: 0.001,
    velocityNote: 'v > 0.9 m/s'
  },
  'boiler_feedwater_treated': {
    service: 'Boiler Feedwater - Treated',
    category: 'Water',
    rfSI: 0.000088,
    rfImperial: 0.0005,
    velocityNote: 'v > 0.9 m/s'
  },
  'boiler_blowdown': {
    service: 'Boiler Blowdown',
    category: 'Water',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'condensate': {
    service: 'Steam Condensate',
    category: 'Water',
    rfSI: 0.000088,
    rfImperial: 0.0005
  },
  'distilled_water': {
    service: 'Distilled/Deionized Water',
    category: 'Water',
    rfSI: 0.000088,
    rfImperial: 0.0005
  },
  'seawater_clean': {
    service: 'Seawater - Clean (< 45°C)',
    category: 'Water',
    rfSI: 0.000088,
    rfImperial: 0.0005,
    temperatureNote: 'T < 45°C (115°F)'
  },
  'seawater_above_45c': {
    service: 'Seawater - Above 45°C',
    category: 'Water',
    rfSI: 0.000176,
    rfImperial: 0.001,
    temperatureNote: 'T > 45°C'
  },
  'brackish_water': {
    service: 'Brackish Water',
    category: 'Water',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'river_water_clean': {
    service: 'River Water - Clean',
    category: 'Water',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'river_water_muddy': {
    service: 'River Water - Muddy/Silty',
    category: 'Water',
    rfSI: 0.000528,
    rfImperial: 0.003
  },
  
  // ============================================
  // STEAM
  // ============================================
  'steam_clean': {
    service: 'Steam - Clean (oil-free)',
    category: 'Steam',
    rfSI: 0.000088,
    rfImperial: 0.0005
  },
  'steam_oil_bearing': {
    service: 'Steam - Oil Bearing',
    category: 'Steam',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'steam_exhaust': {
    service: 'Steam - Exhaust (low pressure)',
    category: 'Steam',
    rfSI: 0.000088,
    rfImperial: 0.0005
  },
  
  // ============================================
  // LIQUIDS - ORGANIC
  // ============================================
  'refrigerant_liquid': {
    service: 'Refrigerant Liquid',
    category: 'Organics',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'refrigerant_vapor': {
    service: 'Refrigerant Vapor (condensing)',
    category: 'Organics',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'hydraulic_fluid': {
    service: 'Hydraulic Fluid',
    category: 'Organics',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'thermal_oil_clean': {
    service: 'Thermal Oil - Clean',
    category: 'Organics',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'thermal_oil_dirty': {
    service: 'Thermal Oil - Dirty',
    category: 'Organics',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'transformer_oil': {
    service: 'Transformer Oil',
    category: 'Organics',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'vegetable_oil': {
    service: 'Vegetable Oil',
    category: 'Organics',
    rfSI: 0.000528,
    rfImperial: 0.003
  },
  'quench_oil': {
    service: 'Quench Oil',
    category: 'Organics',
    rfSI: 0.000704,
    rfImperial: 0.004
  },
  
  // ============================================
  // PETROLEUM FRACTIONS (TEMA Table RGP-T-2.4)
  // ============================================
  'gasoline': {
    service: 'Gasoline',
    category: 'Petroleum',
    rfSI: 0.000176,
    rfImperial: 0.001,
    velocityNote: 'v > 0.6 m/s'
  },
  'naphtha': {
    service: 'Naphtha / Light Distillates',
    category: 'Petroleum',
    rfSI: 0.000176,
    rfImperial: 0.001,
    velocityNote: 'v > 0.6 m/s'
  },
  'kerosene': {
    service: 'Kerosene',
    category: 'Petroleum',
    rfSI: 0.000176,
    rfImperial: 0.001,
    velocityNote: 'v > 0.6 m/s'
  },
  'jet_fuel': {
    service: 'Jet Fuel',
    category: 'Petroleum',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'diesel_light': {
    service: 'Diesel - Light (Gas Oil)',
    category: 'Petroleum',
    rfSI: 0.000352,
    rfImperial: 0.002,
    velocityNote: 'v > 0.6 m/s'
  },
  'diesel_heavy': {
    service: 'Diesel - Heavy',
    category: 'Petroleum',
    rfSI: 0.000528,
    rfImperial: 0.003
  },
  'crude_oil_dry_below_120c': {
    service: 'Crude Oil - Dry (< 120°C)',
    category: 'Petroleum',
    rfSI: 0.000352,
    rfImperial: 0.002,
    temperatureNote: 'T < 120°C (250°F)',
    velocityNote: 'v > 0.6 m/s'
  },
  'crude_oil_dry_120_180c': {
    service: 'Crude Oil - Dry (120-180°C)',
    category: 'Petroleum',
    rfSI: 0.000528,
    rfImperial: 0.003,
    temperatureNote: '120-180°C (250-350°F)'
  },
  'crude_oil_dry_180_230c': {
    service: 'Crude Oil - Dry (180-230°C)',
    category: 'Petroleum',
    rfSI: 0.000704,
    rfImperial: 0.004,
    temperatureNote: '180-230°C (350-450°F)'
  },
  'crude_oil_dry_above_230c': {
    service: 'Crude Oil - Dry (> 230°C)',
    category: 'Petroleum',
    rfSI: 0.000880,
    rfImperial: 0.005,
    temperatureNote: 'T > 230°C (450°F)'
  },
  'crude_oil_wet_salty': {
    service: 'Crude Oil - Wet/Salty',
    category: 'Petroleum',
    rfSI: 0.000528,
    rfImperial: 0.003
  },
  'fuel_oil_no2': {
    service: 'Fuel Oil No. 2',
    category: 'Petroleum',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'fuel_oil_no6': {
    service: 'Fuel Oil No. 6 (Bunker C)',
    category: 'Petroleum',
    rfSI: 0.000880,
    rfImperial: 0.005
  },
  'residuum': {
    service: 'Residuum / Vacuum Resid',
    category: 'Petroleum',
    rfSI: 0.001760,
    rfImperial: 0.010
  },
  'asphalt': {
    service: 'Asphalt / Bitumen',
    category: 'Petroleum',
    rfSI: 0.001760,
    rfImperial: 0.010
  },
  'lube_oil': {
    service: 'Lube Oil',
    category: 'Petroleum',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  
  // ============================================
  // LIGHT HYDROCARBONS / LPG / NGL
  // ============================================
  'propane_liquid': {
    service: 'Propane - Liquid',
    category: 'Light HC',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'butane_liquid': {
    service: 'Butane - Liquid',
    category: 'Light HC',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'lpg_liquid': {
    service: 'LPG - Liquid',
    category: 'Light HC',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'ngl_liquid': {
    service: 'NGL - Liquid',
    category: 'Light HC',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'pentane_liquid': {
    service: 'Pentane - Liquid',
    category: 'Light HC',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'hexane_liquid': {
    service: 'Hexane - Liquid',
    category: 'Light HC',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  
  // ============================================
  // GASES
  // ============================================
  'air': {
    service: 'Air - Clean',
    category: 'Gases',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'air_dirty': {
    service: 'Air - Industrial',
    category: 'Gases',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'natural_gas': {
    service: 'Natural Gas - Clean',
    category: 'Gases',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'natural_gas_sour': {
    service: 'Natural Gas - Sour (H₂S)',
    category: 'Gases',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'flue_gas': {
    service: 'Flue Gas',
    category: 'Gases',
    rfSI: 0.001760,
    rfImperial: 0.010
  },
  'hydrogen': {
    service: 'Hydrogen',
    category: 'Gases',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'nitrogen': {
    service: 'Nitrogen',
    category: 'Gases',
    rfSI: 0.000088,
    rfImperial: 0.0005
  },
  'oxygen': {
    service: 'Oxygen',
    category: 'Gases',
    rfSI: 0.000088,
    rfImperial: 0.0005
  },
  'co2': {
    service: 'Carbon Dioxide',
    category: 'Gases',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'ammonia_vapor': {
    service: 'Ammonia - Vapor',
    category: 'Gases',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  
  // ============================================
  // CHEMICAL PROCESS STREAMS
  // ============================================
  'amine_lean': {
    service: 'Amine - Lean (clean)',
    category: 'Chemicals',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'amine_rich': {
    service: 'Amine - Rich (dirty)',
    category: 'Chemicals',
    rfSI: 0.000528,
    rfImperial: 0.003
  },
  'glycol_lean': {
    service: 'Glycol - Lean',
    category: 'Chemicals',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'glycol_rich': {
    service: 'Glycol - Rich',
    category: 'Chemicals',
    rfSI: 0.000528,
    rfImperial: 0.003
  },
  'methanol': {
    service: 'Methanol',
    category: 'Chemicals',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'ethanol': {
    service: 'Ethanol',
    category: 'Chemicals',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'caustic_soda': {
    service: 'Caustic Soda (NaOH)',
    category: 'Chemicals',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'sulfuric_acid': {
    service: 'Sulfuric Acid',
    category: 'Chemicals',
    rfSI: 0.000352,
    rfImperial: 0.002
  },
  'ammonia_liquid': {
    service: 'Ammonia - Liquid',
    category: 'Chemicals',
    rfSI: 0.000176,
    rfImperial: 0.001
  },
  'brine': {
    service: 'Brine',
    category: 'Chemicals',
    rfSI: 0.000528,
    rfImperial: 0.003
  },
};

// Mapping from FluidType enum to TEMA fouling factor keys
export const FLUID_TYPE_TO_FOULING_KEY: Record<FluidType, string> = {
  // Water & Steam
  [FluidType.WATER]: 'cooling_water_treated_clean',
  [FluidType.STEAM]: 'steam_clean',
  [FluidType.BOILER_FEEDWATER]: 'boiler_feedwater_treated',
  [FluidType.COOLING_WATER]: 'cooling_water_treated_clean',
  [FluidType.SEAWATER]: 'seawater_clean',
  
  // Crude & Products
  [FluidType.CRUDE_OIL]: 'crude_oil_dry_120_180c',
  [FluidType.CRUDE_OIL_LIGHT]: 'crude_oil_dry_below_120c',
  [FluidType.CRUDE_OIL_MEDIUM]: 'crude_oil_dry_120_180c',
  [FluidType.CRUDE_OIL_HEAVY]: 'crude_oil_dry_180_230c',
  [FluidType.NAPHTHA]: 'naphtha',
  [FluidType.KEROSENE]: 'kerosene',
  [FluidType.DIESEL]: 'diesel_light',
  [FluidType.GASOLINE]: 'gasoline',
  [FluidType.JET_FUEL]: 'jet_fuel',
  [FluidType.FUEL_OIL]: 'fuel_oil_no6',
  [FluidType.LUBE_OIL]: 'lube_oil',
  [FluidType.ASPHALT]: 'asphalt',
  
  // Light Hydrocarbons
  [FluidType.METHANE]: 'natural_gas',
  [FluidType.ETHANE]: 'natural_gas',
  [FluidType.PROPANE]: 'propane_liquid',
  [FluidType.BUTANE]: 'butane_liquid',
  [FluidType.ISOBUTANE]: 'butane_liquid',
  [FluidType.PENTANE]: 'pentane_liquid',
  [FluidType.HEXANE]: 'hexane_liquid',
  [FluidType.NATURAL_GAS]: 'natural_gas',
  [FluidType.LPG]: 'lpg_liquid',
  [FluidType.NGL]: 'ngl_liquid',
  
  // Process Chemicals
  [FluidType.AMINE]: 'amine_lean',
  [FluidType.AMINE_MEA]: 'amine_lean',
  [FluidType.AMINE_DEA]: 'amine_lean',
  [FluidType.AMINE_MDEA]: 'amine_lean',
  [FluidType.GLYCOL]: 'glycol_lean',
  [FluidType.GLYCOL_MEG]: 'glycol_lean',
  [FluidType.GLYCOL_DEG]: 'glycol_lean',
  [FluidType.GLYCOL_TEG]: 'glycol_lean',
  [FluidType.METHANOL]: 'methanol',
  [FluidType.ETHANOL]: 'ethanol',
  [FluidType.CAUSTIC_SODA]: 'caustic_soda',
  [FluidType.SULFURIC_ACID]: 'sulfuric_acid',
  [FluidType.AMMONIA]: 'ammonia_liquid',
  
  // Gases
  [FluidType.HYDROGEN]: 'hydrogen',
  [FluidType.NITROGEN]: 'nitrogen',
  [FluidType.OXYGEN]: 'oxygen',
  [FluidType.CO2]: 'co2',
  [FluidType.H2S]: 'natural_gas_sour',
  [FluidType.FLUE_GAS]: 'flue_gas',
  [FluidType.AIR]: 'air',
  
  // Refrigerants
  [FluidType.R134A]: 'refrigerant_liquid',
  [FluidType.R410A]: 'refrigerant_liquid',
  [FluidType.R22]: 'refrigerant_liquid',
  
  // Other
  [FluidType.THERMAL_OIL]: 'thermal_oil_clean',
  [FluidType.BRINE]: 'brine',
  [FluidType.CUSTOM]: 'cooling_water_treated_clean',
};

/**
 * Get TEMA fouling factor for a fluid type
 * Returns values in SI (m²·K/W) by default
 */
export function getTEMAFoulingFactor(
  fluidType: FluidType,
  unitSystem: 'metric' | 'imperial' = 'metric'
): { rf: number; service: string; category: string; notes?: string } {
  const key = FLUID_TYPE_TO_FOULING_KEY[fluidType] || 'cooling_water_treated_clean';
  const entry = TEMA_FOULING_FACTORS[key];
  
  if (!entry) {
    return {
      rf: unitSystem === 'metric' ? 0.000352 : 0.002,
      service: 'Default (Treated Cooling Water)',
      category: 'Water'
    };
  }
  
  const notes = [entry.velocityNote, entry.temperatureNote].filter(Boolean).join('; ');
  
  return {
    rf: unitSystem === 'metric' ? entry.rfSI : entry.rfImperial,
    service: entry.service,
    category: entry.category,
    notes: notes || undefined
  };
}

/**
 * Get temperature-adjusted fouling factor for crude oil
 * Per TEMA RGP-T-2.4, crude oil fouling varies with temperature
 */
export function getCrudeOilFoulingFactor(
  temperature: number, // °C
  unitSystem: 'metric' | 'imperial' = 'metric'
): { rf: number; service: string } {
  let key: string;
  
  if (temperature < 120) {
    key = 'crude_oil_dry_below_120c';
  } else if (temperature < 180) {
    key = 'crude_oil_dry_120_180c';
  } else if (temperature < 230) {
    key = 'crude_oil_dry_180_230c';
  } else {
    key = 'crude_oil_dry_above_230c';
  }
  
  const entry = TEMA_FOULING_FACTORS[key];
  return {
    rf: unitSystem === 'metric' ? entry.rfSI : entry.rfImperial,
    service: entry.service
  };
}

/**
 * Get all available fouling services for UI dropdown
 */
export function getAllFoulingServices(): { key: string; service: string; category: string; rfSI: number }[] {
  return Object.entries(TEMA_FOULING_FACTORS).map(([key, entry]) => ({
    key,
    service: entry.service,
    category: entry.category,
    rfSI: entry.rfSI
  }));
}

/**
 * Get fouling services by category for grouped dropdown
 */
export function getFoulingServicesByCategory(): Record<string, { key: string; service: string; rfSI: number }[]> {
  const grouped: Record<string, { key: string; service: string; rfSI: number }[]> = {};
  
  Object.entries(TEMA_FOULING_FACTORS).forEach(([key, entry]) => {
    if (!grouped[entry.category]) {
      grouped[entry.category] = [];
    }
    grouped[entry.category].push({
      key,
      service: entry.service,
      rfSI: entry.rfSI
    });
  });
  
  return grouped;
}
