/**
 * Two-Phase Flow Calculations Module
 * 
 * Implements industry-standard correlations for two-phase heat transfer
 * and pressure drop in heat exchangers.
 * 
 * @api GPSA Engineering Data Book, API 660
 * @safety CRITICAL: Two-phase instabilities can cause equipment failure
 * @reference Lockhart-Martinelli (1949), Baker (1954), Taitel-Dukler (1976)
 * @validation Must match process simulators within 15%
 * @limitation Horizontal flow correlations; vertical requires separate treatment
 */

import {
  TwoPhaseInputs,
  TwoPhaseResults,
  FlowPattern,
  CalculationResult
} from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const g = 9.81; // m/s²

/**
 * Baker chart flow pattern boundaries (approximate)
 * @reference Baker (1954), modified Taitel-Dukler
 */
const FLOW_PATTERN_BOUNDARIES = {
  bubbleToSlug: 0.3,      // Gas void fraction
  slugToChurn: 0.25,      // Froude number transition
  churnToAnnular: 3.1,    // Martinelli parameter
  stratifiedLimit: 0.5    // Inclination factor
};

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Complete two-phase flow analysis
 * 
 * @api GPSA Engineering Data Book Chapter 7
 * @safety CRITICAL: Detects flow instabilities
 */
export function calculateTwoPhaseFlow(
  inputs: TwoPhaseInputs
): TwoPhaseResults {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Input validation
  if (inputs.liquidFlowRate <= 0 && inputs.gasFlowRate <= 0) {
    return createErrorResult(['At least one phase flow rate must be positive']);
  }

  // Calculate superficial velocities
  const pipeArea = Math.PI * Math.pow(inputs.pipeID / 2, 2);
  const liquidVelocity = (inputs.liquidFlowRate / inputs.liquidDensity) / pipeArea;
  const gasVelocity = (inputs.gasFlowRate / inputs.gasDensity) / pipeArea;
  const mixtureVelocity = liquidVelocity + gasVelocity;

  // Lockhart-Martinelli parameter
  const X = calculateLockhartMartinelli(
    inputs.liquidFlowRate,
    inputs.gasFlowRate,
    inputs.liquidDensity,
    inputs.gasDensity,
    inputs.liquidViscosity,
    inputs.gasViscosity,
    inputs.pipeID
  );

  // Void fraction (Lockhart-Martinelli correlation)
  const voidFraction = calculateVoidFraction(X);
  const liquidHoldup = 1 - voidFraction;

  // Flow pattern determination
  const flowPattern = determineFlowPattern(
    liquidVelocity,
    gasVelocity,
    inputs.liquidDensity,
    inputs.gasDensity,
    inputs.surfaceTension,
    inputs.pipeID,
    inputs.inclination
  );

  // Two-phase friction multiplier
  const twoPhaseFrictionMultiplier = calculateFrictionMultiplier(X, flowPattern);

  // Pressure drop components
  const pressureDropResult = calculateTwoPhasePressureDrop(
    inputs,
    liquidVelocity,
    gasVelocity,
    voidFraction,
    twoPhaseFrictionMultiplier
  );

  // Instability detection
  const instabilityResult = detectFlowInstabilities(
    flowPattern,
    inputs,
    liquidVelocity,
    gasVelocity,
    voidFraction
  );

  if (instabilityResult.isInstable) {
    warnings.push(`Flow instability detected: ${instabilityResult.type}`);
  }

  // Slug flow warning
  const isSlugFlow = flowPattern === FlowPattern.SLUG;
  let slugFrequency: number | undefined;
  if (isSlugFlow) {
    slugFrequency = estimateSlugFrequency(mixtureVelocity, inputs.pipeID);
    warnings.push(
      `Slug flow detected - frequency ~${slugFrequency.toFixed(1)} Hz. ` +
      `May cause mechanical vibration and instrumentation issues.`
    );
  }

  // Quality and flow regime warnings
  const gasQuality = inputs.gasFlowRate / (inputs.gasFlowRate + inputs.liquidFlowRate);
  if (gasQuality > 0.9) {
    warnings.push('Very high gas quality (>90%) - approaching mist flow');
  }
  if (gasQuality < 0.1) {
    warnings.push('Very low gas quality (<10%) - approaching bubble flow');
  }

  return {
    flowPattern,
    voidFraction,
    liquidHoldup,
    pressureDrop: pressureDropResult.total,
    frictionPressureDrop: pressureDropResult.friction,
    accelerationPressureDrop: pressureDropResult.acceleration,
    gravitationalPressureDrop: pressureDropResult.gravitational,
    liquidVelocity,
    gasVelocity,
    mixtureVelocity,
    lockhart_martinelli: X,
    twoPhaseFrictionMultiplier,
    isSlugFlow,
    slugFrequency,
    isFlowInstable: instabilityResult.isInstable,
    instabilityType: instabilityResult.type,
    warnings,
    errors,
    isValid: errors.length === 0
  };
}

// ============================================================================
// LOCKHART-MARTINELLI CORRELATION
// ============================================================================

/**
 * Calculate Lockhart-Martinelli parameter X
 * 
 * X² = (dP/dz)_L / (dP/dz)_G
 * 
 * @reference Lockhart & Martinelli (1949)
 */
function calculateLockhartMartinelli(
  liquidFlow: number,
  gasFlow: number,
  liquidDensity: number,
  gasDensity: number,
  liquidViscosity: number,
  gasViscosity: number,
  pipeID: number
): number {
  if (gasFlow <= 0) return Infinity;
  if (liquidFlow <= 0) return 0;

  const pipeArea = Math.PI * Math.pow(pipeID / 2, 2);
  
  // Superficial velocities
  const vL = (liquidFlow / liquidDensity) / pipeArea;
  const vG = (gasFlow / gasDensity) / pipeArea;

  // Reynolds numbers
  const ReL = (liquidDensity * vL * pipeID) / liquidViscosity;
  const ReG = (gasDensity * vG * pipeID) / gasViscosity;

  // Friction factors (Blasius correlation)
  const fL = ReL < 2300 ? 16 / ReL : 0.079 * Math.pow(ReL, -0.25);
  const fG = ReG < 2300 ? 16 / ReG : 0.079 * Math.pow(ReG, -0.25);

  // Single-phase pressure gradients
  const dPdzL = (2 * fL * liquidDensity * vL * vL) / pipeID;
  const dPdzG = (2 * fG * gasDensity * vG * vG) / pipeID;

  if (dPdzG <= 0) return Infinity;
  
  return Math.sqrt(dPdzL / dPdzG);
}

/**
 * Calculate void fraction from Lockhart-Martinelli parameter
 * 
 * @reference Chisholm correlation
 */
function calculateVoidFraction(X: number): number {
  if (X <= 0) return 1.0;
  if (X === Infinity) return 0.0;
  
  // Chisholm correlation (improved over original L-M)
  // α = 1 / (1 + 0.28 * X^0.71)
  const alpha = 1 / (1 + 0.28 * Math.pow(X, 0.71));
  
  return Math.max(0, Math.min(1, alpha));
}

/**
 * Calculate two-phase friction multiplier
 * 
 * @reference Chisholm (1967)
 */
function calculateFrictionMultiplier(X: number, pattern: FlowPattern): number {
  // Chisholm C coefficient depends on flow regime
  let C: number;
  switch (pattern) {
    case FlowPattern.ANNULAR:
      C = 20;
      break;
    case FlowPattern.SLUG:
    case FlowPattern.CHURN:
      C = 12;
      break;
    case FlowPattern.STRATIFIED:
    case FlowPattern.STRATIFIED_WAVY:
      C = 10;
      break;
    case FlowPattern.BUBBLE:
    case FlowPattern.DISPERSED_BUBBLE:
      C = 5;
      break;
    default:
      C = 12;
  }

  // φ²_L = 1 + C/X + 1/X²
  if (X <= 0) return 1;
  return 1 + C / X + 1 / (X * X);
}

// ============================================================================
// FLOW PATTERN DETERMINATION
// ============================================================================

/**
 * Determine two-phase flow pattern using modified Taitel-Dukler method
 * 
 * @api GPSA Engineering Data Book
 * @reference Taitel & Dukler (1976), Baker (1954)
 */
function determineFlowPattern(
  vL: number,
  vG: number,
  rhoL: number,
  rhoG: number,
  sigma: number,
  D: number,
  theta: number // inclination from horizontal (radians)
): FlowPattern {
  // Check for single-phase cases
  if (vG <= 0.001) return FlowPattern.BUBBLE;
  if (vL <= 0.001) return FlowPattern.MIST;

  // Dimensionless groups
  const lambda = Math.sqrt(rhoG / rhoL);
  const psi = (sigma / (rhoL * g * D * D)) * Math.pow(rhoL / rhoG, 0.5);

  // Froude numbers
  const FrL = vL / Math.sqrt(g * D);
  const FrG = vG / Math.sqrt(g * D);

  // Modified Froude number (Taitel-Dukler)
  const FrM = Math.pow(vG, 2) / (g * D);

  // Weber number for droplet entrainment
  const We = (rhoG * vG * vG * D) / sigma;

  // Superficial momentum flux ratio
  const momRatio = (rhoG * vG * vG) / (rhoL * vL * vL);

  // Void fraction estimate
  const alpha = vG / (vG + vL);

  // ====================================
  // Flow Pattern Logic (Simplified Baker/Taitel-Dukler)
  // ====================================

  // Horizontal or near-horizontal flow
  if (Math.abs(theta) < 0.1) {
    // Stratified flow: low gas and liquid velocities
    if (FrG < 0.5 && FrL < 0.1) {
      if (FrG < 0.1) {
        return FlowPattern.STRATIFIED;
      }
      return FlowPattern.STRATIFIED_WAVY;
    }

    // Slug/Plug: intermediate velocities
    if (alpha < 0.4 && FrM < 4) {
      return FlowPattern.SLUG;
    }

    // Annular: high gas velocity, We criterion
    if (We > 350 || FrG > 3) {
      return FlowPattern.ANNULAR;
    }

    // Dispersed bubble: high liquid velocity
    if (FrL > 0.5 && alpha < 0.3) {
      return FlowPattern.DISPERSED_BUBBLE;
    }

    // Default to slug for intermediate
    if (alpha > 0.2 && alpha < 0.8) {
      return FlowPattern.SLUG;
    }

    // Churn for high void fraction with moderate velocity
    if (alpha > 0.6 && FrG > 1) {
      return FlowPattern.CHURN;
    }

    return FlowPattern.SLUG; // Default
  }

  // Inclined/Vertical flow
  if (theta > 0.1) {
    // Upward flow
    if (alpha < 0.25) {
      return FlowPattern.BUBBLE;
    }
    if (alpha < 0.65 && FrM < 4) {
      return FlowPattern.SLUG;
    }
    if (alpha < 0.85) {
      return FlowPattern.CHURN;
    }
    return FlowPattern.ANNULAR;
  }

  // Downward flow
  if (FrG < 1) {
    return FlowPattern.STRATIFIED;
  }
  return FlowPattern.ANNULAR;
}

// ============================================================================
// PRESSURE DROP CALCULATION
// ============================================================================

interface PressureDropComponents {
  total: number;
  friction: number;
  acceleration: number;
  gravitational: number;
}

/**
 * Calculate two-phase pressure drop components
 * 
 * @reference Lockhart-Martinelli, Friedel correlation
 */
function calculateTwoPhasePressureDrop(
  inputs: TwoPhaseInputs,
  vL: number,
  vG: number,
  voidFraction: number,
  phiSquared: number
): PressureDropComponents {
  const pipeArea = Math.PI * Math.pow(inputs.pipeID / 2, 2);
  const { liquidDensity, gasDensity, liquidViscosity, pipeLength, inclination } = inputs;

  // Single-phase liquid pressure gradient
  const ReL = (liquidDensity * vL * inputs.pipeID) / liquidViscosity;
  const fL = ReL < 2300 ? 16 / ReL : 0.079 * Math.pow(ReL, -0.25);
  const dPdzL = (2 * fL * liquidDensity * vL * vL) / inputs.pipeID;

  // Frictional pressure drop
  const friction = dPdzL * phiSquared * pipeLength;

  // Mixture density
  const rhoM = liquidDensity * (1 - voidFraction) + gasDensity * voidFraction;

  // Gravitational pressure drop
  const gravitational = rhoM * g * pipeLength * Math.sin(inclination);

  // Acceleration pressure drop (for phase change - simplified)
  // Full calculation requires inlet/outlet quality change
  const acceleration = 0; // Negligible for adiabatic flow

  const total = friction + Math.abs(gravitational) + acceleration;

  return {
    total: Math.max(0, total),
    friction: Math.max(0, friction),
    acceleration,
    gravitational
  };
}

// ============================================================================
// INSTABILITY DETECTION
// ============================================================================

interface InstabilityResult {
  isInstable: boolean;
  type?: string;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Detect two-phase flow instabilities
 * 
 * @safety CRITICAL: Instabilities can cause equipment damage
 */
function detectFlowInstabilities(
  pattern: FlowPattern,
  inputs: TwoPhaseInputs,
  vL: number,
  vG: number,
  voidFraction: number
): InstabilityResult {
  const instabilities: string[] = [];

  // 1. Density-wave oscillation
  // Common in boiling systems with low subcooling
  const mixtureVelocity = vL + vG;
  if (pattern === FlowPattern.SLUG && voidFraction > 0.3 && voidFraction < 0.7) {
    // Slug flow is inherently unstable
    instabilities.push('Slug flow oscillation');
  }

  // 2. Ledinegg instability (pressure drop vs flow characteristic)
  // Simplified check: high pressure, low flow
  const pressureDensityRatio = inputs.pressure / inputs.liquidDensity;
  if (pressureDensityRatio > 1e5 && mixtureVelocity < 1.0) {
    instabilities.push('Potential Ledinegg instability');
  }

  // 3. Flashing instability
  // Can occur near saturation conditions
  if (inputs.pressure < 500000 && voidFraction > 0.8) {
    instabilities.push('Flashing risk at low pressure');
  }

  // 4. Churn flow instability
  if (pattern === FlowPattern.CHURN) {
    instabilities.push('Churn flow oscillation');
  }

  if (instabilities.length === 0) {
    return { isInstable: false };
  }

  return {
    isInstable: true,
    type: instabilities.join('; '),
    severity: instabilities.length > 1 ? 'high' : 'medium'
  };
}

/**
 * Estimate slug frequency for mechanical design
 * 
 * @reference Heywood & Richardson correlation
 */
function estimateSlugFrequency(mixtureVelocity: number, pipeID: number): number {
  // Typical slug frequency: 0.2-2 Hz
  // f ≈ 0.3 * Vm / D
  return 0.3 * mixtureVelocity / pipeID;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createErrorResult(errors: string[]): TwoPhaseResults {
  return {
    flowPattern: FlowPattern.SLUG,
    voidFraction: 0,
    liquidHoldup: 1,
    pressureDrop: 0,
    frictionPressureDrop: 0,
    accelerationPressureDrop: 0,
    gravitationalPressureDrop: 0,
    liquidVelocity: 0,
    gasVelocity: 0,
    mixtureVelocity: 0,
    lockhart_martinelli: 0,
    twoPhaseFrictionMultiplier: 1,
    isSlugFlow: false,
    isFlowInstable: false,
    warnings: [],
    errors,
    isValid: false
  };
}

// ============================================================================
// TWO-PHASE HEAT TRANSFER (CONDENSATION/BOILING)
// ============================================================================

/**
 * Shah condensation correlation for tube-side condensation
 * 
 * @api GPSA, Heat Transfer Research Inc.
 * @reference Shah (1979)
 */
export function calculateShahCondensationHTC(
  liquidHTC: number,      // Single-phase liquid HTC (W/m²K)
  pressure: number,       // Pa
  criticalPressure: number, // Pa
  quality: number         // Vapor quality (0-1)
): number {
  const Pr = pressure / criticalPressure; // Reduced pressure
  
  // Shah correlation
  // h_tp = h_L × [(1-x)^0.8 + (3.8 × x^0.76 × (1-x)^0.04) / Pr^0.38]
  const term1 = Math.pow(1 - quality, 0.8);
  const term2 = (3.8 * Math.pow(quality, 0.76) * Math.pow(1 - quality, 0.04)) / Math.pow(Pr, 0.38);
  
  return liquidHTC * (term1 + term2);
}

/**
 * Chen boiling correlation for nucleate boiling
 * 
 * @api GPSA, HTRI
 * @reference Chen (1966)
 */
export function calculateChenBoilingHTC(
  liquidHTC: number,        // Forced convection liquid HTC (W/m²K)
  heatFlux: number,         // W/m²
  pressure: number,         // Pa
  saturationTemp: number,   // K
  wallTemp: number,         // K
  liquidThermalCond: number, // W/m·K
  liquidSpecificHeat: number, // J/kg·K
  liquidDensity: number,    // kg/m³
  vaporDensity: number,     // kg/m³
  surfaceTension: number,   // N/m
  latentHeat: number,       // J/kg
  quality: number           // Vapor quality (0-1)
): number {
  // Suppression factor S
  const ReTP = 10000; // Simplified; should use two-phase Re
  const S = 1 / (1 + 2.53e-6 * Math.pow(ReTP, 1.17));

  // Enhancement factor F (Lockhart-Martinelli based)
  const Xtt = Math.pow((1 - quality) / quality, 0.9) * 
              Math.pow(vaporDensity / liquidDensity, 0.5);
  const F = Xtt <= 0.1 ? 2.35 * Math.pow(1 / Xtt + 0.213, 0.736) : 1;

  // Nucleate boiling HTC (Forster-Zuber)
  const deltaT = wallTemp - saturationTemp;
  const deltaP = pressure * 0.1; // Simplified pressure difference
  
  const hNB = 0.00122 * 
    Math.pow(liquidThermalCond, 0.79) * 
    Math.pow(liquidSpecificHeat, 0.45) *
    Math.pow(liquidDensity, 0.49) /
    (Math.pow(surfaceTension, 0.5) * 
     Math.pow(latentHeat, 0.24) * 
     Math.pow(vaporDensity, 0.24)) *
    Math.pow(deltaT, 0.24) * 
    Math.pow(deltaP, 0.75);

  // Total two-phase HTC
  return F * liquidHTC + S * hNB;
}

/**
 * Flow pattern map boundaries (for visualization)
 * Returns dimensionless coordinates for Baker chart
 */
export function getFlowPatternBoundaries(): {
  pattern: FlowPattern;
  xRange: [number, number];
  yRange: [number, number];
}[] {
  return [
    { pattern: FlowPattern.STRATIFIED, xRange: [0.01, 0.5], yRange: [0.01, 0.3] },
    { pattern: FlowPattern.STRATIFIED_WAVY, xRange: [0.01, 1], yRange: [0.3, 1] },
    { pattern: FlowPattern.SLUG, xRange: [0.5, 5], yRange: [0.3, 5] },
    { pattern: FlowPattern.BUBBLE, xRange: [0.01, 0.5], yRange: [1, 10] },
    { pattern: FlowPattern.ANNULAR, xRange: [1, 100], yRange: [1, 100] },
    { pattern: FlowPattern.MIST, xRange: [5, 100], yRange: [10, 100] }
  ];
}
