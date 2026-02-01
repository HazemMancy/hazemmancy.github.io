/**
 * Heat Exchanger Types and Enums
 * Based on API 660, API 661, TEMA, and GPSA standards
 */

export enum UnitSystem {
  METRIC = 'metric',
  IMPERIAL = 'imperial'
}

export enum FluidType {
  CRUDE_OIL = 'crude_oil',
  NATURAL_GAS = 'natural_gas',
  WATER = 'water',
  STEAM = 'steam',
  AMINE = 'amine',
  GLYCOL = 'glycol',
  PROPANE = 'propane',
  BUTANE = 'butane',
  NAPHTHA = 'naphtha',
  DIESEL = 'diesel',
  CUSTOM = 'custom'
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
