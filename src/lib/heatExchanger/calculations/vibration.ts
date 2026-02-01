/**
 * TEMA RGP T-4 Vibration Analysis Module
 * Complete implementation for flow-induced vibration assessment
 * 
 * @api API 660 Section 5.6.2, TEMA RGP T-4
 * @safety CRITICAL: Prevents tube rupture and catastrophic failure
 * @reference TEMA Standards 10th Edition, HTRI Design Manual
 * @validation Must match HTRI within 15%
 * @limitation Two-phase damping correlations approximate
 */

import {
  VibrationInputs,
  VibrationResults,
  FluidPhase,
  TubePattern,
  SAFETY_FACTORS
} from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Strouhal numbers for different tube patterns
 * @reference TEMA RGP T-4.31
 */
const STROUHAL_NUMBERS: Record<TubePattern, number> = {
  [TubePattern.TRIANGULAR_30]: 0.20,
  [TubePattern.TRIANGULAR_60]: 0.22,
  [TubePattern.SQUARE_90]: 0.25,
  [TubePattern.SQUARE_45]: 0.21
};

/**
 * Connors constant K for fluid-elastic instability
 * @reference TEMA RGP T-4.41, Connors (1970)
 */
const CONNORS_K: Record<TubePattern, number> = {
  [TubePattern.TRIANGULAR_30]: 2.4,
  [TubePattern.TRIANGULAR_60]: 2.8,
  [TubePattern.SQUARE_90]: 3.4,
  [TubePattern.SQUARE_45]: 3.0
};

/**
 * Mode shape constant for different end conditions
 * @reference TEMA RGP T-4.21
 */
const MODE_CONSTANTS = {
  /** Fixed-Fixed (between baffles) */
  fixedFixed: 22.4,
  /** Fixed-Simply Supported */
  fixedSimple: 15.4,
  /** Simply Supported both ends */
  simpleSimple: 9.87
} as const;

/**
 * Damping ratios for different services
 * @reference TEMA RGP T-4.32
 */
const DAMPING_RATIOS = {
  /** Gas service (low damping) */
  gas: 0.01,
  /** Light liquid (water, light HC) */
  liquidLight: 0.03,
  /** Viscous liquid */
  liquidViscous: 0.05,
  /** Two-phase (highest damping) */
  twoPhase: 0.08
} as const;

// ============================================================================
// MAIN VIBRATION ANALYSIS
// ============================================================================

/**
 * Complete flow-induced vibration analysis per TEMA RGP T-4
 * 
 * Analyzes four vibration mechanisms:
 * 1. Vortex shedding (von Kármán vortices)
 * 2. Fluid-elastic instability (FEI) - most dangerous
 * 3. Turbulent buffeting
 * 4. Acoustic resonance (gas service)
 * 
 * @api API 660 Section 5.6.2
 * @safety CRITICAL: Prevents tube rupture
 * @reference TEMA RGP T-4
 */
export function calculateVibrationAnalysis(
  inputs: VibrationInputs
): VibrationResults {
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  // Input validation
  const validationResult = validateVibrationInputs(inputs);
  if (!validationResult.isValid) {
    return createErrorResult(validationResult.errors);
  }
  warnings.push(...validationResult.warnings);

  // Get appropriate damping ratio
  const dampingRatio = inputs.dampingRatio ?? getDampingRatio(inputs.fluidPhase);

  // Calculate tube properties
  const tubeProps = calculateTubeProperties(inputs);

  // 1. Natural frequency calculation (TEMA RGP T-4.21)
  const naturalFrequency = calculateNaturalFrequency(
    inputs.tubeElasticModulus,
    tubeProps.momentOfInertia,
    tubeProps.effectiveMass,
    inputs.unsupportedSpan
  );

  // 2. Vortex shedding frequency (TEMA RGP T-4.31)
  const vortexSheddingFrequency = calculateVortexSheddingFrequency(
    inputs.crossflowVelocity,
    inputs.tubeOD,
    inputs.tubePattern
  );

  // 3. Turbulent buffeting frequency range
  const turbulentBuffetingFrequency = calculateTurbulentBuffetingFrequency(
    inputs.crossflowVelocity,
    inputs.tubeOD,
    inputs.tubePitch
  );

  // 4. Acoustic resonance frequency (gas service only)
  const acousticResonanceFrequency = calculateAcousticFrequency(
    inputs.speedOfSound,
    inputs.shellID,
    inputs.fluidPhase
  );

  // 5. Critical velocity for FEI (TEMA RGP T-4.41)
  const criticalVelocity = calculateCriticalVelocity(
    naturalFrequency,
    inputs.tubeOD,
    tubeProps.effectiveMass,
    inputs.shellFluidDensity,
    dampingRatio,
    inputs.tubePattern
  );

  // 6. Reduced velocity
  const reducedVelocity = inputs.crossflowVelocity / (naturalFrequency * inputs.tubeOD);

  // 7. Frequency ratio (key resonance indicator)
  const frequencyRatio = vortexSheddingFrequency / naturalFrequency;

  // 8. Damage number (Connors criterion)
  const damageNumber = calculateDamageNumber(
    inputs.shellFluidDensity,
    inputs.crossflowVelocity,
    inputs.tubeOD,
    tubeProps.effectiveMass,
    naturalFrequency,
    dampingRatio
  );

  // ============================================
  // RISK ASSESSMENTS
  // ============================================

  // Vortex shedding risk: frequency ratio in resonance band 0.7-1.3
  const isVortexSheddingRisk = frequencyRatio > 0.7 && frequencyRatio < 1.3;
  if (isVortexSheddingRisk) {
    warnings.push(
      `CRITICAL: Vortex shedding frequency (${vortexSheddingFrequency.toFixed(1)} Hz) ` +
      `in resonance band (0.7-1.3 × fn = ${(0.7 * naturalFrequency).toFixed(1)}-${(1.3 * naturalFrequency).toFixed(1)} Hz)`
    );
    recommendations.push('Increase baffle spacing to raise natural frequency');
    recommendations.push('Add intermediate tube supports');
    recommendations.push('Consider rotated square pitch layout');
  }

  // Fluid-elastic instability risk: velocity > 80% of critical
  const velocityMargin = inputs.crossflowVelocity / criticalVelocity;
  const isFEIRisk = velocityMargin > SAFETY_FACTORS.vibration;
  if (isFEIRisk) {
    warnings.push(
      `CRITICAL: Cross-flow velocity (${inputs.crossflowVelocity.toFixed(2)} m/s) ` +
      `exceeds ${SAFETY_FACTORS.vibration * 100}% of critical velocity (${criticalVelocity.toFixed(2)} m/s)`
    );
    recommendations.push('Reduce shell-side flow rate');
    recommendations.push('Increase tube pitch');
    recommendations.push('Use larger shell diameter');
  }

  // Acoustic resonance risk (gas service)
  const isAcousticRisk = checkAcousticResonance(
    vortexSheddingFrequency,
    acousticResonanceFrequency,
    inputs.fluidPhase
  );
  if (isAcousticRisk) {
    warnings.push(
      `CRITICAL: Acoustic resonance risk - vortex frequency near acoustic mode ` +
      `(${acousticResonanceFrequency.toFixed(1)} Hz)`
    );
    recommendations.push('Install acoustic baffles or desuperheater plates');
    recommendations.push('Modify tube pitch to shift vortex frequency');
  }

  // Turbulent buffeting risk
  const isTurbulentBuffetingRisk = reducedVelocity > 3.3;
  if (isTurbulentBuffetingRisk) {
    warnings.push(
      `Turbulent buffeting concern: Reduced velocity (${reducedVelocity.toFixed(2)}) > 3.3`
    );
    recommendations.push('Review tube support design');
  }

  // Damage number check
  if (damageNumber > 0.5) {
    warnings.push(
      `High damage potential: Connors damage number (${damageNumber.toFixed(3)}) > 0.5`
    );
    recommendations.push('Increase tube support frequency');
  }

  // Tube wear prediction (simplified)
  const tubeWearRate = estimateTubeWearRate(
    isVortexSheddingRisk || isFEIRisk,
    damageNumber,
    inputs.fluidPhase
  );

  // Frequency margin from resonance
  const frequencyMargin = Math.min(
    Math.abs(frequencyRatio - 0.7),
    Math.abs(frequencyRatio - 1.3)
  );

  // Generate overall message
  const vibrationMessage = generateVibrationMessage(
    isVortexSheddingRisk,
    isFEIRisk,
    isAcousticRisk,
    isTurbulentBuffetingRisk,
    velocityMargin
  );

  return {
    naturalFrequency,
    vortexSheddingFrequency,
    turbulentBuffetingFrequency,
    acousticResonanceFrequency,
    criticalVelocity,
    reducedVelocity,
    frequencyRatio,
    damageNumber,
    tubeWearRate,
    isVortexSheddingRisk,
    isFEIRisk,
    isAcousticRisk,
    isTurbulentBuffetingRisk,
    vibrationMessage,
    recommendations,
    velocityMargin,
    frequencyMargin,
    warnings,
    errors,
    isValid: !isFEIRisk && !isVortexSheddingRisk
  };
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate tube natural frequency
 * @api TEMA RGP T-4.21
 * 
 * fn = (Cn / 2π) × √(EI / mL⁴)
 * 
 * @param E - Elastic modulus (Pa)
 * @param I - Moment of inertia (m⁴)
 * @param effectiveMass - Total effective mass per unit length (kg/m)
 * @param L - Unsupported span length (m)
 */
function calculateNaturalFrequency(
  E: number,
  I: number,
  effectiveMass: number,
  L: number
): number {
  const Cn = MODE_CONSTANTS.fixedFixed; // Assume fixed-fixed between baffles
  return (Cn / (2 * Math.PI)) * Math.sqrt((E * I) / (effectiveMass * Math.pow(L, 4)));
}

/**
 * Calculate vortex shedding frequency
 * @api TEMA RGP T-4.31
 * 
 * fvs = St × V / d
 */
function calculateVortexSheddingFrequency(
  velocity: number,
  tubeOD: number,
  pattern: TubePattern
): number {
  const St = STROUHAL_NUMBERS[pattern];
  return St * velocity / tubeOD;
}

/**
 * Calculate turbulent buffeting frequency range
 * @api TEMA RGP T-4.33
 */
function calculateTurbulentBuffetingFrequency(
  velocity: number,
  tubeOD: number,
  tubePitch: number
): number {
  const pitchRatio = tubePitch / tubeOD;
  // Owen's correlation for turbulent buffeting
  const ftb = (3.05 * velocity * (1 - 1 / pitchRatio)) / tubeOD;
  return Math.max(0, ftb);
}

/**
 * Calculate acoustic resonance frequency
 * @api TEMA RGP T-4.5
 * 
 * fa = c / (2W) for fundamental mode
 */
function calculateAcousticFrequency(
  speedOfSound: number,
  shellDiameter: number,
  phase: FluidPhase
): number {
  // Only relevant for gas service
  if (phase === FluidPhase.LIQUID || phase === FluidPhase.TWO_PHASE) {
    return 0;
  }
  
  // Safety check on speed of sound
  const safeSpeedOfSound = Math.max(speedOfSound, 150); // Minimum credible
  
  // Fundamental transverse mode
  return safeSpeedOfSound / (2 * shellDiameter);
}

/**
 * Calculate critical velocity for fluid-elastic instability
 * @api TEMA RGP T-4.41, Connors criterion
 * 
 * Vcrit = K × fn × d × √(m × δ / ρ × d²)
 */
function calculateCriticalVelocity(
  fn: number,
  tubeOD: number,
  effectiveMass: number,
  fluidDensity: number,
  dampingRatio: number,
  pattern: TubePattern
): number {
  const K = CONNORS_K[pattern];
  const massRatio = effectiveMass / (fluidDensity * Math.pow(tubeOD, 2));
  const logDecrement = 2 * Math.PI * dampingRatio; // δ = 2πζ
  
  return K * fn * tubeOD * Math.sqrt(massRatio * logDecrement);
}

/**
 * Calculate Connors damage number
 * @api TEMA RGP T-4.42
 */
function calculateDamageNumber(
  fluidDensity: number,
  velocity: number,
  tubeOD: number,
  effectiveMass: number,
  fn: number,
  dampingRatio: number
): number {
  const logDecrement = 2 * Math.PI * dampingRatio;
  return (fluidDensity * Math.pow(velocity, 2) * tubeOD) /
    (effectiveMass * fn * logDecrement);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface TubeProperties {
  momentOfInertia: number;  // m⁴
  crossSectionArea: number; // m²
  tubeMass: number;         // kg/m
  fluidMass: number;        // kg/m
  addedMass: number;        // kg/m (hydrodynamic)
  effectiveMass: number;    // kg/m
}

/**
 * Calculate tube structural and mass properties
 */
function calculateTubeProperties(inputs: VibrationInputs): TubeProperties {
  const { tubeOD, tubeID, tubeDensity, tubeFluidDensity, shellFluidDensity, 
          tubePitch, tubePattern } = inputs;

  // Moment of inertia (hollow tube)
  const I = (Math.PI / 64) * (Math.pow(tubeOD, 4) - Math.pow(tubeID, 4));

  // Cross-section area
  const A = (Math.PI / 4) * (Math.pow(tubeOD, 2) - Math.pow(tubeID, 2));

  // Tube mass per unit length
  const tubeMass = tubeDensity * A;

  // Internal fluid mass
  const fluidMass = tubeFluidDensity * (Math.PI / 4) * Math.pow(tubeID, 2);

  // Hydrodynamic added mass coefficient (Cm)
  const pitchRatio = tubePitch / tubeOD;
  let Cm: number;
  if (tubePattern === TubePattern.TRIANGULAR_30 || tubePattern === TubePattern.TRIANGULAR_60) {
    Cm = 1.0 + 0.6 / Math.pow(pitchRatio - 1, 1.5);
  } else {
    Cm = 1.0 + 0.5 / Math.pow(pitchRatio - 1, 1.5);
  }
  Cm = Math.min(Cm, 3.0); // Cap for tight pitch

  // Added mass from surrounding fluid
  const addedMass = Cm * shellFluidDensity * (Math.PI / 4) * Math.pow(tubeOD, 2);

  // Total effective mass
  const effectiveMass = tubeMass + fluidMass + addedMass;

  return {
    momentOfInertia: I,
    crossSectionArea: A,
    tubeMass,
    fluidMass,
    addedMass,
    effectiveMass
  };
}

/**
 * Get damping ratio based on fluid phase
 * @api TEMA RGP T-4.32
 */
function getDampingRatio(phase: FluidPhase): number {
  switch (phase) {
    case FluidPhase.GAS:
      return DAMPING_RATIOS.gas;
    case FluidPhase.TWO_PHASE:
      return DAMPING_RATIOS.twoPhase;
    case FluidPhase.SUPERCRITICAL:
      return DAMPING_RATIOS.gas;
    default:
      return DAMPING_RATIOS.liquidLight;
  }
}

/**
 * Check acoustic resonance condition
 */
function checkAcousticResonance(
  fvs: number,
  fa: number,
  phase: FluidPhase
): boolean {
  if (phase === FluidPhase.LIQUID || fa <= 0) return false;
  
  // Check fundamental and first harmonic
  const ratio1 = fvs / fa;
  const ratio2 = (2 * fvs) / fa;
  
  return (ratio1 > 0.85 && ratio1 < 1.15) || (ratio2 > 0.85 && ratio2 < 1.15);
}

/**
 * Estimate tube wear rate
 * @limitation Simplified correlation; actual wear depends on many factors
 */
function estimateTubeWearRate(
  hasVibrationIssue: boolean,
  damageNumber: number,
  phase: FluidPhase
): number {
  if (!hasVibrationIssue && damageNumber < 0.3) {
    return 0.01; // Minimal wear (mm/year)
  }
  
  // Base wear rate
  let wearRate = damageNumber * 0.5; // Simplified correlation
  
  // Increase for two-phase (droplet impingement)
  if (phase === FluidPhase.TWO_PHASE) {
    wearRate *= 2.0;
  }
  
  return Math.min(wearRate, 5.0); // Cap at 5 mm/year (severe)
}

/**
 * Generate human-readable vibration status message
 */
function generateVibrationMessage(
  isVortexRisk: boolean,
  isFEIRisk: boolean,
  isAcousticRisk: boolean,
  isTurbulentRisk: boolean,
  velocityMargin: number
): string {
  if (isFEIRisk) {
    return '⛔ CRITICAL: Fluid-elastic instability risk - REDESIGN REQUIRED';
  }
  
  if (isVortexRisk) {
    return '⚠️ WARNING: Vortex shedding resonance - reduce baffle spacing';
  }
  
  if (isAcousticRisk) {
    return '⚠️ WARNING: Acoustic resonance possible - install acoustic baffles';
  }
  
  if (isTurbulentRisk) {
    return '⚠️ CAUTION: Turbulent buffeting concern - review support design';
  }
  
  if (velocityMargin > 0.6) {
    return `✓ ACCEPTABLE: Operating at ${(velocityMargin * 100).toFixed(0)}% of critical velocity (limit: 80%)`;
  }
  
  return `✓ SAFE: Design well within vibration limits (${(velocityMargin * 100).toFixed(0)}% of critical)`;
}

/**
 * Validate vibration analysis inputs
 */
function validateVibrationInputs(inputs: VibrationInputs): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (inputs.crossflowVelocity <= 0) {
    errors.push('Cross-flow velocity must be positive');
  }
  
  if (inputs.tubeOD <= 0 || inputs.tubeID <= 0) {
    errors.push('Tube dimensions must be positive');
  }
  
  if (inputs.tubeOD <= inputs.tubeID) {
    errors.push('Tube OD must be greater than ID');
  }
  
  if (inputs.tubePitch <= inputs.tubeOD) {
    errors.push('Tube pitch must be greater than OD');
  }
  
  if (inputs.unsupportedSpan <= 0) {
    errors.push('Unsupported span must be positive');
  }
  
  // Speed of sound validation
  if (inputs.speedOfSound < 50) {
    warnings.push(`Speed of sound (${inputs.speedOfSound.toFixed(1)} m/s) is suspiciously low - clamping to 150 m/s`);
  }
  
  // Pitch ratio check
  const pitchRatio = inputs.tubePitch / inputs.tubeOD;
  if (pitchRatio < 1.25) {
    errors.push(`Pitch ratio (${pitchRatio.toFixed(3)}) below TEMA minimum of 1.25`);
  }
  if (pitchRatio > 2.0) {
    warnings.push(`Pitch ratio (${pitchRatio.toFixed(3)}) above typical range - verify geometry`);
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Create error result when inputs invalid
 */
function createErrorResult(errors: string[]): VibrationResults {
  return {
    naturalFrequency: 0,
    vortexSheddingFrequency: 0,
    turbulentBuffetingFrequency: 0,
    acousticResonanceFrequency: 0,
    criticalVelocity: 0,
    reducedVelocity: 0,
    frequencyRatio: 0,
    damageNumber: 0,
    tubeWearRate: 0,
    isVortexSheddingRisk: false,
    isFEIRisk: false,
    isAcousticRisk: false,
    isTurbulentBuffetingRisk: false,
    vibrationMessage: 'Error: Invalid inputs',
    recommendations: [],
    velocityMargin: 0,
    frequencyMargin: 0,
    warnings: [],
    errors,
    isValid: false
  };
}

// ============================================================================
// EXPORTS FOR GAS VS LIQUID DIFFERENTIATION
// ============================================================================

/**
 * Get service-specific vibration parameters
 * @api API 660 Section 5.6.2
 */
export function getGasServiceParameters(inputs: VibrationInputs): {
  dampingRatio: number;
  acousticConcern: boolean;
  velocityFactor: number;
} {
  return {
    dampingRatio: DAMPING_RATIOS.gas,
    acousticConcern: true,
    velocityFactor: 1.0 // No reduction for gas
  };
}

export function getLiquidServiceParameters(inputs: VibrationInputs): {
  dampingRatio: number;
  acousticConcern: boolean;
  velocityFactor: number;
} {
  // Viscous liquids have higher damping, allow slightly higher velocity
  const isViscous = inputs.shellFluidDensity > 900; // Crude oil, etc.
  
  return {
    dampingRatio: isViscous ? DAMPING_RATIOS.liquidViscous : DAMPING_RATIOS.liquidLight,
    acousticConcern: false,
    velocityFactor: isViscous ? 0.9 : 1.0
  };
}
