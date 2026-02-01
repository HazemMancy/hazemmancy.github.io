/**
 * Heat Exchanger Types and Enums
 * Based on API 660, API 661, TEMA, and GPSA standards
 */

export enum UnitSystem {
  METRIC = 'metric',
  IMPERIAL = 'imperial'
}

// Expanded fluid types for Oil & Gas industry
export enum FluidType {
  // Water & Steam
  WATER = 'water',
  STEAM = 'steam',
  BOILER_FEEDWATER = 'boiler_feedwater',
  COOLING_WATER = 'cooling_water',
  SEAWATER = 'seawater',
  
  // Crude & Products
  CRUDE_OIL = 'crude_oil', // Keep for backwards compatibility
  CRUDE_OIL_LIGHT = 'crude_oil_light',
  CRUDE_OIL_MEDIUM = 'crude_oil_medium',
  CRUDE_OIL_HEAVY = 'crude_oil_heavy',
  NAPHTHA = 'naphtha',
  KEROSENE = 'kerosene',
  DIESEL = 'diesel',
  GASOLINE = 'gasoline',
  JET_FUEL = 'jet_fuel',
  FUEL_OIL = 'fuel_oil',
  LUBE_OIL = 'lube_oil',
  ASPHALT = 'asphalt',
  
  // Light Hydrocarbons
  METHANE = 'methane',
  ETHANE = 'ethane',
  PROPANE = 'propane',
  BUTANE = 'butane',
  ISOBUTANE = 'isobutane',
  PENTANE = 'pentane',
  HEXANE = 'hexane',
  NATURAL_GAS = 'natural_gas',
  LPG = 'lpg',
  NGL = 'ngl',
  
  // Process Chemicals
  AMINE = 'amine', // Keep for backwards compatibility
  AMINE_MEA = 'amine_mea',
  AMINE_DEA = 'amine_dea',
  AMINE_MDEA = 'amine_mdea',
  GLYCOL = 'glycol', // Keep for backwards compatibility
  GLYCOL_MEG = 'glycol_meg',
  GLYCOL_DEG = 'glycol_deg',
  GLYCOL_TEG = 'glycol_teg',
  METHANOL = 'methanol',
  ETHANOL = 'ethanol',
  CAUSTIC_SODA = 'caustic_soda',
  SULFURIC_ACID = 'sulfuric_acid',
  AMMONIA = 'ammonia',
  
  // Gases
  HYDROGEN = 'hydrogen',
  NITROGEN = 'nitrogen',
  OXYGEN = 'oxygen',
  CO2 = 'co2',
  H2S = 'h2s',
  FLUE_GAS = 'flue_gas',
  AIR = 'air',
  
  // Refrigerants
  R134A = 'r134a',
  R410A = 'r410a',
  R22 = 'r22',
  
  // Other
  THERMAL_OIL = 'thermal_oil',
  BRINE = 'brine',
  CUSTOM = 'custom'
}

// Fluid phase for property calculations
export enum FluidPhase {
  LIQUID = 'liquid',
  GAS = 'gas',
  TWO_PHASE = 'two_phase',
  SUPERCRITICAL = 'supercritical'
}

// Fluid category for UI grouping
export enum FluidCategory {
  WATER_STEAM = 'Water & Steam',
  CRUDE_PRODUCTS = 'Crude & Products',
  LIGHT_HC = 'Light Hydrocarbons',
  PROCESS_CHEMICALS = 'Process Chemicals',
  GASES = 'Gases',
  REFRIGERANTS = 'Refrigerants',
  OTHER = 'Other'
}

export enum ExchangerType {
  SHELL_TUBE = 'shell_tube',
  AIR_COOLED = 'air_cooled',
  PLATE_FIN = 'plate_fin'
}

export enum TemaType {
  AES = 'AES',
  AEU = 'AEU',
  BEM = 'BEM',
  BEU = 'BEU',
  NEN = 'NEN',
  AET = 'AET',
  AEP = 'AEP',
  AKT = 'AKT',
  CFU = 'CFU'
}

export enum TubeLayout {
  TRIANGULAR_30 = 30,
  TRIANGULAR_60 = 60,
  SQUARE_45 = 45,
  SQUARE_90 = 90
}

export interface FluidProperties {
  density: number;           // kg/m³ (metric) or lb/ft³ (imperial)
  viscosity: number;         // cP (centipoise)
  specificHeat: number;      // kJ/kg·K (metric) or BTU/lb·°F (imperial)
  thermalConductivity: number; // W/m·K (metric) or BTU/hr·ft·°F (imperial)
  boilingPoint?: number;     // °C or °F
  freezingPoint?: number;    // °C or °F
  molecularWeight?: number;  // g/mol
  criticalTemp?: number;     // K
  criticalPressure?: number; // MPa
  // Properties for speed of sound calculation
  bulkModulus?: number;      // GPa (for liquids)
  gamma?: number;            // Cp/Cv ratio (for gases)
  speedOfSound?: number;     // m/s (calculated or reference)
}

// Temperature-dependent property coefficients
export interface FluidPropertyCoefficients {
  // Polynomial coefficients for temperature dependence
  // Property = A + B*T + C*T² + D*T³ where T is in °C
  density: { A: number; B: number; C: number; D?: number };
  viscosity: { A: number; B: number; C: number }; // Andrade equation: μ = A * exp(B/(T+C))
  specificHeat: { A: number; B: number; C: number; D?: number };
  thermalConductivity: { A: number; B: number; C: number };
  // Reference conditions
  refTemp: number; // °C
  validRange: { min: number; max: number }; // °C
}

export interface FluidDefinition {
  type: FluidType;
  name: string;
  category: FluidCategory;
  phase: FluidPhase;
  properties: FluidProperties;
  coefficients?: FluidPropertyCoefficients;
  description?: string;
}

export interface ProcessConditions {
  flowRate: number;
  temperatureIn: number;
  temperatureOut: number;
  pressure: number;
  allowablePressureDrop: number;
}

export interface MechanicalDesign {
  tubeOD: number;          // mm or inch
  tubeThickness: number;   // mm or inch
  tubeLength: number;      // m or ft
  tubePitch: number;       // mm or inch
  tubeLayout: TubeLayout;
  numberOfPasses: number;
  baffleCut: number;       // percentage (0-50)
  baffleSpacing: number;   // mm or inch
  shellDiameter?: number;  // mm or inch
  numberOfTubes?: number;
}

export interface VibrationCheckResult {
  isSafe: boolean;
  naturalFrequency: number;
  vortexSheddingFrequency: number;
  fluidElasticInstability: number;
  acousticResonanceFrequency: number;
  message: string;
  warnings: string[];
}

export interface ThermalResults {
  heatDuty: number;
  lmtd: number;
  correctionFactor: number;
  overallU: number;
  requiredArea: number;
  effectiveness: number;
  ntu: number;
}

export interface HydraulicResults {
  tubeSidePressureDrop: number;
  shellSidePressureDrop: number;
  tubeSideVelocity: number;
  shellSideVelocity: number;
  tubeReynolds: number;
  shellReynolds: number;
}

export interface MechanicalResults {
  shellThickness: number;
  headThickness: number;
  tubesheetThickness: number;
  flangeClass: string;
  hydroTestPressure: number;
}

export interface APIValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  standard: 'API 660' | 'API 661';
}

// Side assignment for heat exchanger
export type FluidSide = 'shell' | 'tube';
