/**
 * Heat Exchanger Calculation Library
 * 
 * Comprehensive engineering calculations for shell & tube and air-cooled heat exchangers.
 * 
 * @api API 660, API 661, TEMA, NACE MR0175, ASME VIII
 * @safety CRITICAL: Safety-critical engineering tool
 * 
 * ⚠️ SAFETY CRITICAL DISCLAIMER ⚠️
 * THIS IS A SCREENING TOOL ONLY. NOT FOR FINAL DESIGN.
 * MUST BE VERIFIED BY:
 * 1. Licensed Professional Engineer
 * 2. HTRI/Aspen EDR Software
 * 3. API 660/661 Compliance Audit
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './types';

// ============================================================================
// CALCULATION EXPORTS
// ============================================================================

// Vibration Analysis (TEMA RGP T-4)
export { 
  calculateVibrationAnalysis,
  getGasServiceParameters,
  getLiquidServiceParameters
} from './calculations/vibration';

// Two-Phase Flow
export {
  calculateTwoPhaseFlow,
  calculateShahCondensationHTC,
  calculateChenBoilingHTC,
  getFlowPatternBoundaries
} from './calculations/twoPhase';

// ============================================================================
// VALIDATION EXPORTS
// ============================================================================

// API Standards Validation
export {
  validateAPI660Complete,
  validateAPI661Complete,
  validateTEMAClass,
  validateExchanger
} from './apiValidation';

// ============================================================================
// MECHANICAL DESIGN EXPORTS
// ============================================================================

// Material Selection & NACE MR0175
export {
  determineSourServiceRegion,
  validateNACEMR0175,
  selectMaterial,
  getMaterialProperties,
  getSuitableMaterials
} from './mechanical/materialSelection';

// ============================================================================
// SAFETY REPORT GENERATOR
// ============================================================================

import { SafetyReport, createSafetyReport, APIValidationResult } from './types';

/**
 * Generate comprehensive safety report for heat exchanger design
 * @safety CRITICAL: Must be included in all analysis outputs
 */
export function generateSafetyReport(
  validationResults: APIValidationResult[],
  additionalWarnings: string[] = []
): SafetyReport {
  const allWarnings = [
    ...additionalWarnings,
    ...validationResults.flatMap(v => v.warnings)
  ];
  
  const allErrors = validationResults.flatMap(v => v.errors);
  
  const standardsChecked = validationResults.map(v => v.standard);

  return createSafetyReport(allWarnings, allErrors, standardsChecked);
}

// ============================================================================
// VERSION & DOCUMENTATION
// ============================================================================

export const LIBRARY_VERSION = '1.0.0';

export const LIBRARY_INFO = {
  version: LIBRARY_VERSION,
  standards: [
    'API 660 (10th Edition) - Shell-and-Tube Heat Exchangers',
    'API 661 (7th Edition) - Air-Cooled Heat Exchangers',
    'TEMA Standards (10th Edition) - Tubular Exchanger Manufacturers Association',
    'NACE MR0175/ISO 15156 - Sour Service Materials',
    'ASME Section VIII Division 1 - Pressure Vessel Design'
  ],
  correlations: [
    'Bell-Delaware (Shell-side thermal-hydraulic)',
    'Dittus-Boelter, Gnielinski (Tube-side HTC)',
    'TEMA RGP T-4 (Vibration analysis)',
    'Lockhart-Martinelli (Two-phase flow)',
    'Shah (Condensation)',
    'Chen (Boiling)',
    'Connors (Fluid-elastic instability)'
  ],
  disclaimer: `⚠️ SAFETY CRITICAL DISCLAIMER ⚠️
THIS IS A SCREENING TOOL ONLY. NOT FOR FINAL DESIGN.
MUST BE VERIFIED BY:
1. Licensed Professional Engineer
2. HTRI/Aspen EDR Software
3. API 660/661 Compliance Audit`
};
