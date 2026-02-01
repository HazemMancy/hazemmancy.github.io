/**
 * Heat Exchanger Extended Types and Enums
 * 
 * @api API 660, API 661, TEMA, NACE MR0175
 * @safety CRITICAL: Type definitions for safety-critical calculations
 * @reference GPSA Engineering Data Book, ASME Section VIII
 */

// ============================================================================
// SAFETY CONSTANTS
// ============================================================================

/**
 * Industry-standard safety factors for heat exchanger design
 * @api API 660 Section 5.3, TEMA RGP
 * @safety CRITICAL: These factors prevent equipment failure
 */
export const SAFETY_FACTORS = {
  /** Minimum design pressure factor (1.5× operating) - ASME VIII */
  pressure: 1.5,
  /** Maximum velocity as fraction of critical (80%) - TEMA RGP T-4 */
  vibration: 0.8,
  /** Over-surface margin for fouling (25%) - TEMA RGP */
  thermal: 1.25,
  /** Corrosion allowance in mm - API 660 */
  corrosion: 3.0,
  /** F-factor minimum - TEMA */
  minFactor: 0.75
} as const;

/**
 * Service-dependent velocity limits per API 660/RP 14E
 * @api API 660 Section 5.4, API RP 14E
 * @safety CRITICAL: Prevents erosion and vibration damage
 */
export const VELOCITY_LIMITS = {
  cleanLiquid: { tube: 2.4, shell: 1.5, description: 'Clean non-fouling liquids' },
  foulingLiquid: { tube: 1.5, shell: 0.9, description: 'Fouling liquids (crude, fuel oil)' },
  gasVapor: { tube: 30.0, shell: 25.0, description: 'Gas/vapor service' },
  twoPhase: { tube: 15.0, shell: 10.0, description: 'Two-phase flow' },
  erosive: { tube: 1.0, shell: 0.6, description: 'Erosive slurry service' }
} as const;

export type ServiceType = keyof typeof VELOCITY_LIMITS;

// ============================================================================
// ENUMS
// ============================================================================

export enum UnitSystem {
  METRIC = 'metric',
  IMPERIAL = 'imperial'
}

export enum FluidPhase {
  LIQUID = 'liquid',
  GAS = 'gas',
  TWO_PHASE = 'two_phase',
  SUPERCRITICAL = 'supercritical'
}

export enum ExchangerType {
  SHELL_TUBE = 'shell_tube',
  AIR_COOLED = 'air_cooled',
  PLATE_FIN = 'plate_fin',
  DOUBLE_PIPE = 'double_pipe',
  SPIRAL = 'spiral'
}

export enum TubePattern {
  TRIANGULAR_30 = 'triangular_30',
  TRIANGULAR_60 = 'triangular_60',
  SQUARE_90 = 'square_90',
  SQUARE_45 = 'square_45'
}

export enum TEMAClass {
  R = 'R',  // Refinery service (most stringent)
  C = 'C',  // Commercial service
  B = 'B'   // Chemical service
}

export enum MaterialClass {
  CARBON_STEEL = 'carbon_steel',
  LOW_ALLOY = 'low_alloy',
  STAINLESS = 'stainless',
  DUPLEX = 'duplex',
  NICKEL_ALLOY = 'nickel_alloy',
  TITANIUM = 'titanium',
  COPPER_ALLOY = 'copper_alloy'
}

export enum CorrosionEnvironment {
  NONE = 'none',
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  SOUR = 'sour',
  ACIDIC = 'acidic'
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Comprehensive safety report attached to all calculation results
 * @safety CRITICAL: Must be included in all outputs
 */
export interface SafetyReport {
  /** Legal disclaimer text */
  disclaimer: string;
  /** Critical warnings requiring immediate attention */
  criticalWarnings: string[];
  /** Required engineering actions */
  requiredActions: string[];
  /** Overall standards compliance status */
  standardsCompliant: boolean;
  /** Specific standards validated */
  standardsChecked: string[];
  /** Timestamp of analysis */
  timestamp: Date;
}

/**
 * Base calculation result with warnings/errors
 */
export interface CalculationResult {
  warnings: string[];
  errors: string[];
  isValid: boolean;
}

/**
 * Process conditions for fluid stream
 */
export interface ProcessConditions {
  flowRate: number;           // kg/s (SI)
  inletTemperature: number;   // K
  outletTemperature: number;  // K
  pressure: number;           // Pa
  phase: FluidPhase;
  allowablePressureDrop: number; // Pa
}

/**
 * Fluid properties at operating conditions
 */
export interface FluidProperties {
  density: number;            // kg/m³
  viscosity: number;          // Pa·s
  specificHeat: number;       // J/kg·K
  thermalConductivity: number; // W/m·K
  prandtl: number;            // dimensionless
  speedOfSound?: number;      // m/s
  surfaceTension?: number;    // N/m (for two-phase)
  vaporPressure?: number;     // Pa
  molecularWeight?: number;   // kg/kmol
  gamma?: number;             // Cp/Cv for gases
}

/**
 * Shell & Tube mechanical design parameters
 */
export interface MechanicalDesign {
  tubeOD: number;             // m
  tubeID: number;             // m
  tubeWallThickness: number;  // m
  tubeLength: number;         // m
  tubePitch: number;          // m
  tubePattern: TubePattern;
  numberOfTubes: number;
  numberOfPasses: number;
  shellID: number;            // m
  baffleCut: number;          // fraction (0-0.5)
  baffleSpacing: number;      // m
  unsupportedSpan: number;    // m
  tubeElasticModulus: number; // Pa
  tubeDensity: number;        // kg/m³
  tubeMaterial: MaterialClass;
}

/**
 * Air-cooled heat exchanger design parameters
 * @api API 661
 */
export interface AirCooledDesign {
  bundleWidth: number;        // m
  bundleLength: number;       // m
  bundleDepth: number;        // m (rows × pitch)
  numberOfBays: number;
  tubesPerRow: number;
  numberOfRows: number;
  tubeOD: number;             // m
  tubeWallThickness: number;  // m
  finType: 'extruded' | 'embedded' | 'welded' | 'L-foot';
  finDensity: number;         // fins/m
  finHeight: number;          // m
  finThickness: number;       // m
  fanType: 'induced' | 'forced';
  fanDiameter: number;        // m
  motorPower: number;         // W
  headerType: 'plug' | 'cover_plate' | 'manifold';
  headerThickness: number;    // m
  designPressure: number;     // Pa
  designTemperature: number;  // K
}

/**
 * Vibration analysis inputs
 * @api TEMA RGP T-4, API 660 Section 5.6
 */
export interface VibrationInputs {
  crossflowVelocity: number;  // m/s
  shellFluidDensity: number;  // kg/m³
  tubeFluidDensity: number;   // kg/m³
  speedOfSound: number;       // m/s in shell fluid
  tubeOD: number;             // m
  tubeID: number;             // m
  tubePitch: number;          // m
  tubePattern: TubePattern;
  tubeElasticModulus: number; // Pa
  tubeDensity: number;        // kg/m³
  unsupportedSpan: number;    // m
  shellID: number;            // m
  dampingRatio?: number;      // dimensionless (default 0.03)
  fluidPhase: FluidPhase;
}

/**
 * Comprehensive vibration analysis results
 * @api TEMA RGP T-4
 * @safety CRITICAL: Prevents tube failure
 */
export interface VibrationResults extends CalculationResult {
  naturalFrequency: number;           // Hz
  vortexSheddingFrequency: number;    // Hz
  turbulentBuffetingFrequency: number; // Hz
  acousticResonanceFrequency: number; // Hz
  criticalVelocity: number;           // m/s
  reducedVelocity: number;            // dimensionless
  frequencyRatio: number;             // fvs/fn
  damageNumber: number;               // Connors criterion
  tubeWearRate?: number;              // mm/year (predicted)
  
  // Risk assessments
  isVortexSheddingRisk: boolean;
  isFEIRisk: boolean;               // Fluid Elastic Instability
  isAcousticRisk: boolean;
  isTurbulentBuffetingRisk: boolean;
  
  // Messages
  vibrationMessage: string;
  recommendations: string[];
  
  // Design margins
  velocityMargin: number;             // fraction of critical
  frequencyMargin: number;            // distance from resonance band
}

/**
 * Two-phase flow calculation inputs
 * @api GPSA, Lockhart-Martinelli
 */
export interface TwoPhaseInputs {
  liquidFlowRate: number;     // kg/s
  gasFlowRate: number;        // kg/s
  liquidDensity: number;      // kg/m³
  gasDensity: number;         // kg/m³
  liquidViscosity: number;    // Pa·s
  gasViscosity: number;       // Pa·s
  surfaceTension: number;     // N/m
  pipeID: number;             // m
  pipeLength: number;         // m
  inclination: number;        // radians from horizontal
  pressure: number;           // Pa
}

/**
 * Two-phase flow calculation results
 * @api GPSA Engineering Data Book
 */
export interface TwoPhaseResults extends CalculationResult {
  flowPattern: FlowPattern;
  voidFraction: number;
  liquidHoldup: number;
  pressureDrop: number;           // Pa
  frictionPressureDrop: number;   // Pa
  accelerationPressureDrop: number; // Pa
  gravitationalPressureDrop: number; // Pa
  liquidVelocity: number;         // m/s (superficial)
  gasVelocity: number;            // m/s (superficial)
  mixtureVelocity: number;        // m/s
  lockhart_martinelli: number;    // X parameter
  twoPhaseFrictionMultiplier: number;
  
  // Instability detection
  isSlugFlow: boolean;
  slugFrequency?: number;         // Hz
  isFlowInstable: boolean;
  instabilityType?: string;
}

export enum FlowPattern {
  BUBBLE = 'bubble',
  SLUG = 'slug',
  CHURN = 'churn',
  ANNULAR = 'annular',
  STRATIFIED = 'stratified',
  STRATIFIED_WAVY = 'stratified_wavy',
  MIST = 'mist',
  DISPERSED_BUBBLE = 'dispersed_bubble'
}

/**
 * API validation result structure
 */
export interface APIValidationResult extends CalculationResult {
  standard: 'API 660' | 'API 661' | 'TEMA' | 'NACE MR0175';
  sections: {
    section: string;
    requirement: string;
    actualValue: string | number;
    limit: string | number;
    status: 'pass' | 'warning' | 'fail';
    severity: 'info' | 'warning' | 'critical';
  }[];
}

/**
 * Material selection result for corrosion/compatibility
 * @api NACE MR0175, API 660
 */
export interface MaterialSelectionResult extends CalculationResult {
  recommendedMaterial: MaterialClass;
  alternativeMaterials: MaterialClass[];
  corrosionRate: number;          // mm/year
  expectedLife: number;           // years
  isNACECompliant: boolean;
  naceMR0175Requirements: string[];
  galvanicCompatible: boolean;
  hydrogenEmbrittlementRisk: boolean;
  stressCorrosionCrackingRisk: boolean;
  temperatureLimitations: {
    min: number;  // K
    max: number;  // K
  };
}

/**
 * Complete heat exchanger analysis output
 * @safety CRITICAL: Always includes safety report
 */
export interface HeatExchangerAnalysis {
  // Thermal results
  heatDuty: number;               // W
  lmtd: number;                   // K
  correctionFactor: number;       // F
  overallU: number;               // W/m²·K
  requiredArea: number;           // m²
  actualArea: number;             // m²
  oversurface: number;            // fraction
  effectiveness: number;          // NTU effectiveness
  ntu: number;
  
  // Hydraulic results
  tubeSidePressureDrop: number;   // Pa
  shellSidePressureDrop: number;  // Pa
  tubeSideVelocity: number;       // m/s
  shellSideVelocity: number;      // m/s
  
  // Heat transfer coefficients
  tubeSideHTC: number;            // W/m²·K
  shellSideHTC: number;           // W/m²·K
  
  // Vibration
  vibration: VibrationResults;
  
  // Validation
  apiValidation: APIValidationResult[];
  materialSelection?: MaterialSelectionResult;
  twoPhaseResults?: TwoPhaseResults;
  
  // Safety report (MANDATORY)
  safetyReport: SafetyReport;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create default safety report
 * @safety CRITICAL: Always display this disclaimer
 */
export function createSafetyReport(
  warnings: string[],
  errors: string[],
  standardsChecked: string[]
): SafetyReport {
  return {
    disclaimer: `⚠️ SAFETY CRITICAL DISCLAIMER ⚠️
THIS IS A SCREENING TOOL ONLY. NOT FOR FINAL DESIGN.
MUST BE VERIFIED BY:
1. Licensed Professional Engineer
2. HTRI/Aspen EDR Software
3. API 660/661 Compliance Audit`,
    criticalWarnings: warnings.filter(w => 
      w.toLowerCase().includes('critical') || 
      w.toLowerCase().includes('safety') ||
      w.toLowerCase().includes('exceed')
    ),
    requiredActions: errors.length > 0 
      ? ['Resolve all errors before proceeding', ...errors]
      : ['Review all warnings with qualified engineer'],
    standardsCompliant: errors.length === 0,
    standardsChecked,
    timestamp: new Date()
  };
}

/**
 * Get velocity limits for service type
 * @api API 660 Section 5.4
 */
export function getVelocityLimits(
  serviceType: ServiceType,
  phase: FluidPhase
): { tube: number; shell: number } {
  // Two-phase overrides service type
  if (phase === FluidPhase.TWO_PHASE) {
    return VELOCITY_LIMITS.twoPhase;
  }
  
  // Gas service
  if (phase === FluidPhase.GAS || phase === FluidPhase.SUPERCRITICAL) {
    return VELOCITY_LIMITS.gasVapor;
  }
  
  return VELOCITY_LIMITS[serviceType];
}

/**
 * Calculate pitch ratio
 * @api TEMA RGP
 */
export function calculatePitchRatio(tubePitch: number, tubeOD: number): number {
  return tubePitch / tubeOD;
}

/**
 * Validate pitch ratio per TEMA
 * @api TEMA Section RGP-4
 */
export function validatePitchRatio(pitchRatio: number): {
  isValid: boolean;
  message: string;
} {
  if (pitchRatio < 1.25) {
    return {
      isValid: false,
      message: `Pitch ratio ${pitchRatio.toFixed(3)} below TEMA minimum of 1.25`
    };
  }
  if (pitchRatio > 1.5) {
    return {
      isValid: true,
      message: `Pitch ratio ${pitchRatio.toFixed(3)} above typical range (1.25-1.5) - reduced tube count`
    };
  }
  return {
    isValid: true,
    message: `Pitch ratio ${pitchRatio.toFixed(3)} within TEMA range (1.25-1.5)`
  };
}
