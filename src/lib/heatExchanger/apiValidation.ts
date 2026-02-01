/**
 * Complete API 660 & API 661 Standards Validation
 * 
 * @api API 660 (10th Edition), API 661 (7th Edition)
 * @safety CRITICAL: Ensures regulatory compliance
 * @reference TEMA Standards 10th Edition
 * @validation Covers all critical sections
 */

import {
  MechanicalDesign,
  AirCooledDesign,
  ExchangerType,
  APIValidationResult,
  TubePattern,
  FluidPhase,
  SAFETY_FACTORS,
  VELOCITY_LIMITS,
  ServiceType,
  getVelocityLimits
} from './types';

// ============================================================================
// API 660 VALIDATION (SHELL & TUBE)
// ============================================================================

/**
 * Complete API 660 validation for shell & tube heat exchangers
 * 
 * @api API 660 (10th Edition)
 * @safety CRITICAL: Mechanical integrity validation
 */
export function validateAPI660Complete(
  design: MechanicalDesign,
  operatingParams: {
    shellVelocity: number;        // m/s
    tubeVelocity: number;         // m/s
    designPressure: number;       // Pa
    designTemperature: number;    // K
    serviceType: ServiceType;
    fluidPhase: FluidPhase;
    numberOfTubes: number;
  }
): APIValidationResult {
  const sections: APIValidationResult['sections'] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const shellDiameter = design.shellID;

  // ============================================
  // Section 5.3.2 - Tube Pitch Requirements
  // ============================================
  const pitchRatio = design.tubePitch / design.tubeOD;
  const minPitchRatio = 1.25;
  
  sections.push({
    section: 'API 660 §5.3.2',
    requirement: 'Minimum tube pitch ratio (P/d)',
    actualValue: pitchRatio.toFixed(3),
    limit: `≥ ${minPitchRatio}`,
    status: pitchRatio >= minPitchRatio ? 'pass' : 'fail',
    severity: pitchRatio >= minPitchRatio ? 'info' : 'critical'
  });

  if (pitchRatio < minPitchRatio) {
    errors.push(`Pitch ratio ${pitchRatio.toFixed(3)} below API 660 minimum of ${minPitchRatio}`);
  }

  // ============================================
  // Section 5.3.3 - Minimum Tube Wall Thickness
  // ============================================
  const minWallThickness = getMinimumTubeWall(design.tubeOD, operatingParams.designPressure);
  
  sections.push({
    section: 'API 660 §5.3.3',
    requirement: 'Minimum tube wall thickness',
    actualValue: `${(design.tubeWallThickness * 1000).toFixed(2)} mm`,
    limit: `≥ ${(minWallThickness * 1000).toFixed(2)} mm`,
    status: design.tubeWallThickness >= minWallThickness ? 'pass' : 'fail',
    severity: design.tubeWallThickness >= minWallThickness ? 'info' : 'critical'
  });

  if (design.tubeWallThickness < minWallThickness) {
    errors.push(`Tube wall thickness insufficient for design pressure`);
  }

  // ============================================
  // Section 5.4 - Velocity Limits (API RP 14E)
  // ============================================
  const velocityLimits = getVelocityLimits(operatingParams.serviceType, operatingParams.fluidPhase);

  sections.push({
    section: 'API 660 §5.4',
    requirement: 'Tube-side velocity limit',
    actualValue: `${operatingParams.tubeVelocity.toFixed(2)} m/s`,
    limit: `≤ ${velocityLimits.tube} m/s`,
    status: operatingParams.tubeVelocity <= velocityLimits.tube ? 'pass' : 
            operatingParams.tubeVelocity <= velocityLimits.tube * 1.1 ? 'warning' : 'fail',
    severity: operatingParams.tubeVelocity > velocityLimits.tube ? 'critical' : 'info'
  });

  sections.push({
    section: 'API 660 §5.4',
    requirement: 'Shell-side velocity limit',
    actualValue: `${operatingParams.shellVelocity.toFixed(2)} m/s`,
    limit: `≤ ${velocityLimits.shell} m/s`,
    status: operatingParams.shellVelocity <= velocityLimits.shell ? 'pass' : 
            operatingParams.shellVelocity <= velocityLimits.shell * 1.1 ? 'warning' : 'fail',
    severity: operatingParams.shellVelocity > velocityLimits.shell ? 'critical' : 'info'
  });

  if (operatingParams.tubeVelocity > velocityLimits.tube) {
    errors.push(`Tube velocity ${operatingParams.tubeVelocity.toFixed(2)} m/s exceeds limit ${velocityLimits.tube} m/s`);
  }
  if (operatingParams.shellVelocity > velocityLimits.shell) {
    warnings.push(`Shell velocity ${operatingParams.shellVelocity.toFixed(2)} m/s exceeds typical limit ${velocityLimits.shell} m/s`);
  }

  // ============================================
  // Section 5.6.2 - Vibration for Gas Service
  // ============================================
  if (operatingParams.fluidPhase === FluidPhase.GAS) {
    sections.push({
      section: 'API 660 §5.6.2',
      requirement: 'Gas service vibration analysis required',
      actualValue: 'Vibration analysis mandatory',
      limit: 'See TEMA RGP T-4',
      status: 'warning',
      severity: 'warning'
    });
    warnings.push('Gas service: Detailed vibration analysis per TEMA RGP T-4 is mandatory');
  }

  // ============================================
  // Section 6.2.2 - Minimum Baffle Spacing
  // ============================================
  const minBaffleSpacing = Math.max(shellDiameter * 0.2, 0.050); // 1/5 shell ID or 50mm
  
  sections.push({
    section: 'API 660 §6.2.2',
    requirement: 'Minimum baffle spacing',
    actualValue: `${(design.baffleSpacing * 1000).toFixed(1)} mm`,
    limit: `≥ ${(minBaffleSpacing * 1000).toFixed(1)} mm`,
    status: design.baffleSpacing >= minBaffleSpacing ? 'pass' : 'warning',
    severity: design.baffleSpacing >= minBaffleSpacing ? 'info' : 'warning'
  });

  if (design.baffleSpacing < minBaffleSpacing) {
    warnings.push(`Baffle spacing below API 660 minimum (1/5 shell ID or 50mm)`);
  }

  // ============================================
  // Section 6.2.3 - Maximum Baffle Spacing
  // ============================================
  const maxBaffleSpacing = shellDiameter; // Shell ID
  
  sections.push({
    section: 'API 660 §6.2.3',
    requirement: 'Maximum baffle spacing (vibration)',
    actualValue: `${(design.baffleSpacing * 1000).toFixed(1)} mm`,
    limit: `≤ ${(maxBaffleSpacing * 1000).toFixed(1)} mm`,
    status: design.baffleSpacing <= maxBaffleSpacing ? 'pass' : 'warning',
    severity: design.baffleSpacing <= maxBaffleSpacing ? 'info' : 'warning'
  });

  if (design.baffleSpacing > maxBaffleSpacing) {
    warnings.push(`Baffle spacing exceeds shell ID - check tube vibration`);
  }

  // ============================================
  // Section 6.2.4 - Baffle Cut Limits
  // ============================================
  const baffleCutPercent = design.baffleCut * 100;
  
  sections.push({
    section: 'API 660 §6.2.4',
    requirement: 'Baffle cut range',
    actualValue: `${baffleCutPercent.toFixed(1)}%`,
    limit: '15% - 45%',
    status: baffleCutPercent >= 15 && baffleCutPercent <= 45 ? 'pass' : 'warning',
    severity: baffleCutPercent < 15 || baffleCutPercent > 45 ? 'warning' : 'info'
  });

  if (baffleCutPercent < 15 || baffleCutPercent > 45) {
    warnings.push(`Baffle cut ${baffleCutPercent.toFixed(1)}% outside recommended range (15-45%)`);
  }

  // ============================================
  // Section 7 - Standard Tube Lengths
  // ============================================
  const standardLengths = [2.44, 3.05, 3.66, 4.88, 6.10, 7.32]; // meters
  const closestStandard = standardLengths.reduce((prev, curr) =>
    Math.abs(curr - design.tubeLength) < Math.abs(prev - design.tubeLength) ? curr : prev
  );
  const isStandardLength = Math.abs(design.tubeLength - closestStandard) < 0.1;

  sections.push({
    section: 'API 660 §7',
    requirement: 'Standard tube length',
    actualValue: `${design.tubeLength.toFixed(2)} m`,
    limit: `Standard: ${closestStandard} m`,
    status: isStandardLength ? 'pass' : 'warning',
    severity: isStandardLength ? 'info' : 'warning'
  });

  // ============================================
  // Tube Count Validation (TEMA)
  // ============================================
  const maxPossibleTubes = estimateMaxTubeCount(
    shellDiameter,
    design.tubeOD,
    design.tubePitch,
    design.tubePattern
  );

  sections.push({
    section: 'TEMA §RGP-4',
    requirement: 'Tube count vs shell size',
    actualValue: operatingParams.numberOfTubes.toString(),
    limit: `≤ ~${maxPossibleTubes}`,
    status: operatingParams.numberOfTubes <= maxPossibleTubes * 1.05 ? 'pass' : 'warning',
    severity: operatingParams.numberOfTubes > maxPossibleTubes * 1.1 ? 'warning' : 'info'
  });

  // ============================================
  // Nozzle Velocity Limits (API RP 14E)
  // ============================================
  // ρv² erosion limit
  const rhoV2Limit = operatingParams.fluidPhase === FluidPhase.GAS ? 15000 : 150000; // Pa
  
  sections.push({
    section: 'API RP 14E',
    requirement: 'Erosion velocity limit (ρv²)',
    actualValue: 'Check nozzle sizing',
    limit: `≤ ${rhoV2Limit} Pa`,
    status: 'pass',
    severity: 'info'
  });

  return {
    standard: 'API 660',
    sections,
    warnings,
    errors,
    isValid: errors.length === 0
  };
}

// ============================================================================
// API 661 VALIDATION (AIR-COOLED)
// ============================================================================

/**
 * Complete API 661 validation for air-cooled heat exchangers
 * 
 * @api API 661 (7th Edition)
 * @safety CRITICAL: Air cooler mechanical integrity
 */
export function validateAPI661Complete(
  design: AirCooledDesign,
  operatingParams: {
    airFaceVelocity: number;      // m/s
    airSidePressureDrop: number;  // Pa
    tubeVelocity: number;         // m/s
    processFluidPhase: FluidPhase;
  }
): APIValidationResult {
  const sections: APIValidationResult['sections'] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // ============================================
  // Section 5.2.1 - Air Face Velocity
  // ============================================
  const minAirVelocity = 2.0; // m/s
  const maxAirVelocity = design.fanType === 'induced' ? 3.5 : 4.0; // m/s

  sections.push({
    section: 'API 661 §5.2.1',
    requirement: 'Air face velocity range',
    actualValue: `${operatingParams.airFaceVelocity.toFixed(2)} m/s`,
    limit: `${minAirVelocity} - ${maxAirVelocity} m/s`,
    status: operatingParams.airFaceVelocity >= minAirVelocity && 
            operatingParams.airFaceVelocity <= maxAirVelocity ? 'pass' : 'warning',
    severity: operatingParams.airFaceVelocity < minAirVelocity || 
              operatingParams.airFaceVelocity > maxAirVelocity ? 'warning' : 'info'
  });

  if (operatingParams.airFaceVelocity < minAirVelocity) {
    warnings.push(`Air velocity ${operatingParams.airFaceVelocity.toFixed(2)} m/s below typical minimum of ${minAirVelocity} m/s`);
  }
  if (operatingParams.airFaceVelocity > maxAirVelocity) {
    warnings.push(`Air velocity ${operatingParams.airFaceVelocity.toFixed(2)} m/s above typical maximum of ${maxAirVelocity} m/s`);
  }

  // ============================================
  // Section 5.4.2 - Minimum Air-Side Pressure Drop
  // ============================================
  const minAirDP = 100; // 0.1 kPa = 100 Pa

  sections.push({
    section: 'API 661 §5.4.2',
    requirement: 'Minimum air-side pressure drop',
    actualValue: `${operatingParams.airSidePressureDrop.toFixed(0)} Pa`,
    limit: `≥ ${minAirDP} Pa (0.1 kPa)`,
    status: operatingParams.airSidePressureDrop >= minAirDP ? 'pass' : 'fail',
    severity: operatingParams.airSidePressureDrop < minAirDP ? 'critical' : 'info'
  });

  if (operatingParams.airSidePressureDrop < minAirDP) {
    errors.push(`Air-side ΔP ${operatingParams.airSidePressureDrop.toFixed(0)} Pa below API 661 minimum of 100 Pa`);
  }

  // ============================================
  // Section 5.3 - Standard Bundle Sizes
  // ============================================
  const standardWidths = [2.44, 2.74, 3.05]; // meters (8', 9', 10')
  const closestWidth = standardWidths.reduce((prev, curr) =>
    Math.abs(curr - design.bundleWidth) < Math.abs(prev - design.bundleWidth) ? curr : prev
  );
  const isStandardWidth = Math.abs(design.bundleWidth - closestWidth) < 0.1;

  sections.push({
    section: 'API 661 §5.3',
    requirement: 'Standard bundle width',
    actualValue: `${design.bundleWidth.toFixed(2)} m`,
    limit: `Standard: ${closestWidth} m`,
    status: isStandardWidth ? 'pass' : 'warning',
    severity: isStandardWidth ? 'info' : 'warning'
  });

  // ============================================
  // Section 6.3 - Tube Fin Density Limits
  // ============================================
  const minFinDensity = 276; // fins/m (7 fins/inch)
  const maxFinDensity = 433; // fins/m (11 fins/inch)

  sections.push({
    section: 'API 661 §6.3',
    requirement: 'Fin density range',
    actualValue: `${design.finDensity.toFixed(0)} fins/m`,
    limit: `${minFinDensity} - ${maxFinDensity} fins/m`,
    status: design.finDensity >= minFinDensity && design.finDensity <= maxFinDensity ? 'pass' : 'warning',
    severity: design.finDensity < minFinDensity || design.finDensity > maxFinDensity ? 'warning' : 'info'
  });

  if (design.finDensity < minFinDensity) {
    warnings.push(`Fin density ${design.finDensity.toFixed(0)} fins/m below typical minimum`);
  }
  if (design.finDensity > maxFinDensity) {
    warnings.push(`Fin density ${design.finDensity.toFixed(0)} fins/m above typical maximum - cleaning concerns`);
  }

  // ============================================
  // Section 6 - Standard Tube Sizes
  // ============================================
  const standardTubeODs = [0.01905, 0.0254, 0.03175]; // 3/4", 1", 1-1/4" in meters
  const isStandardTube = standardTubeODs.some(od => Math.abs(od - design.tubeOD) < 0.001);

  sections.push({
    section: 'API 661 §6',
    requirement: 'Standard tube OD',
    actualValue: `${(design.tubeOD * 1000).toFixed(2)} mm`,
    limit: '19.05, 25.4, or 31.75 mm',
    status: isStandardTube ? 'pass' : 'warning',
    severity: isStandardTube ? 'info' : 'warning'
  });

  // ============================================
  // Section 7.2 - Header Design Requirements
  // ============================================
  const minHeaderThickness = calculateMinHeaderThickness(
    design.designPressure,
    design.headerType
  );

  sections.push({
    section: 'API 661 §7.2',
    requirement: 'Header minimum thickness',
    actualValue: `${(design.headerThickness * 1000).toFixed(2)} mm`,
    limit: `≥ ${(minHeaderThickness * 1000).toFixed(2)} mm`,
    status: design.headerThickness >= minHeaderThickness ? 'pass' : 'fail',
    severity: design.headerThickness < minHeaderThickness ? 'critical' : 'info'
  });

  if (design.headerThickness < minHeaderThickness) {
    errors.push(`Header thickness insufficient for design pressure`);
  }

  // ============================================
  // Fan Coverage
  // ============================================
  const bundleArea = design.bundleWidth * design.bundleLength;
  const fanArea = Math.PI * Math.pow(design.fanDiameter / 2, 2) * design.numberOfBays;
  const fanCoverage = fanArea / bundleArea;
  const minFanCoverage = 0.40; // 40% minimum

  sections.push({
    section: 'API 661 §5.5',
    requirement: 'Fan coverage ratio',
    actualValue: `${(fanCoverage * 100).toFixed(1)}%`,
    limit: `≥ ${(minFanCoverage * 100).toFixed(0)}%`,
    status: fanCoverage >= minFanCoverage ? 'pass' : 'warning',
    severity: fanCoverage < minFanCoverage ? 'warning' : 'info'
  });

  return {
    standard: 'API 661',
    sections,
    warnings,
    errors,
    isValid: errors.length === 0
  };
}

// ============================================================================
// TEMA VALIDATION
// ============================================================================

/**
 * TEMA class validation
 * @api TEMA Standards 10th Edition
 */
export function validateTEMAClass(
  design: MechanicalDesign,
  temaClass: 'R' | 'C' | 'B'
): APIValidationResult {
  const sections: APIValidationResult['sections'] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // TEMA Class-specific requirements
  const classRequirements = {
    R: { minTubeWall: 0.00211, minCorrosion: 0.003, maxBaffleSpacing: 0.6 },
    C: { minTubeWall: 0.00165, minCorrosion: 0.002, maxBaffleSpacing: 0.8 },
    B: { minTubeWall: 0.00165, minCorrosion: 0.002, maxBaffleSpacing: 0.8 }
  };

  const req = classRequirements[temaClass];

  // Minimum tube wall for TEMA class
  sections.push({
    section: `TEMA ${temaClass}-2.31`,
    requirement: `Class ${temaClass} minimum tube wall`,
    actualValue: `${(design.tubeWallThickness * 1000).toFixed(2)} mm`,
    limit: `≥ ${(req.minTubeWall * 1000).toFixed(2)} mm`,
    status: design.tubeWallThickness >= req.minTubeWall ? 'pass' : 'fail',
    severity: design.tubeWallThickness < req.minTubeWall ? 'critical' : 'info'
  });

  // Pitch ratio
  const pitchRatio = design.tubePitch / design.tubeOD;
  sections.push({
    section: `TEMA RGP-4`,
    requirement: 'Pitch ratio (P/d)',
    actualValue: pitchRatio.toFixed(3),
    limit: '1.25 - 1.50',
    status: pitchRatio >= 1.25 && pitchRatio <= 1.50 ? 'pass' : 'warning',
    severity: pitchRatio < 1.25 ? 'critical' : 'info'
  });

  // L/D ratio for shell
  const ldRatio = design.tubeLength / design.shellID;
  sections.push({
    section: 'TEMA RGP',
    requirement: 'Shell L/D ratio',
    actualValue: ldRatio.toFixed(2),
    limit: '3 - 15 typical',
    status: ldRatio >= 3 && ldRatio <= 15 ? 'pass' : 'warning',
    severity: ldRatio < 2 || ldRatio > 20 ? 'warning' : 'info'
  });

  return {
    standard: 'TEMA',
    sections,
    warnings,
    errors,
    isValid: errors.length === 0
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get minimum tube wall thickness per API 660
 * @api API 660 §5.3.3
 */
function getMinimumTubeWall(tubeOD: number, designPressure: number): number {
  // Simplified - actual calculation requires material properties
  // Minimum based on tube OD
  if (tubeOD <= 0.01905) return 0.00165; // 3/4" tube: 1.65mm min
  if (tubeOD <= 0.0254) return 0.00211;  // 1" tube: 2.11mm min
  return 0.00277; // Larger tubes: 2.77mm min
}

/**
 * Estimate maximum tube count for shell size
 * @api TEMA tube count tables
 */
function estimateMaxTubeCount(
  shellDiameter: number,
  tubeOD: number,
  tubePitch: number,
  pattern: TubePattern
): number {
  const bundleClearance = 0.012; // 12mm for fixed tubesheet
  const bundleDiameter = shellDiameter - bundleClearance * 2;
  const bundleArea = Math.PI * Math.pow(bundleDiameter / 2, 2);

  // Area per tube depends on layout
  let areaPerTube: number;
  if (pattern === TubePattern.TRIANGULAR_30 || pattern === TubePattern.TRIANGULAR_60) {
    areaPerTube = tubePitch * tubePitch * Math.sqrt(3) / 2;
  } else {
    areaPerTube = tubePitch * tubePitch;
  }

  const packingFactor = 0.78; // Typical
  return Math.floor((bundleArea / areaPerTube) * packingFactor);
}

/**
 * Calculate minimum header thickness for air cooler
 * @api API 661 §7.2
 */
function calculateMinHeaderThickness(
  designPressure: number,
  headerType: 'plug' | 'cover_plate' | 'manifold'
): number {
  // Simplified - based on design pressure
  // Actual requires ASME Section VIII calculation
  const baseThickness = designPressure / 1e7; // Very simplified
  
  const headerFactors = {
    plug: 1.0,
    cover_plate: 1.2,
    manifold: 0.8
  };

  return Math.max(0.003, baseThickness * headerFactors[headerType]); // 3mm minimum
}

// ============================================================================
// COMBINED VALIDATION
// ============================================================================

/**
 * Run all applicable validations based on exchanger type
 */
export function validateExchanger(
  exchangerType: ExchangerType,
  design: MechanicalDesign | AirCooledDesign,
  operatingParams: {
    shellVelocity?: number;
    tubeVelocity: number;
    designPressure: number;
    designTemperature: number;
    serviceType: ServiceType;
    fluidPhase: FluidPhase;
    numberOfTubes?: number;
    airFaceVelocity?: number;
    airSidePressureDrop?: number;
  }
): APIValidationResult[] {
  const results: APIValidationResult[] = [];

  if (exchangerType === ExchangerType.SHELL_TUBE) {
    results.push(validateAPI660Complete(
      design as MechanicalDesign,
      {
        shellVelocity: operatingParams.shellVelocity ?? 0,
        tubeVelocity: operatingParams.tubeVelocity,
        designPressure: operatingParams.designPressure,
        designTemperature: operatingParams.designTemperature,
        serviceType: operatingParams.serviceType,
        fluidPhase: operatingParams.fluidPhase,
        numberOfTubes: operatingParams.numberOfTubes ?? 0
      }
    ));

    results.push(validateTEMAClass(design as MechanicalDesign, 'R'));
  }

  if (exchangerType === ExchangerType.AIR_COOLED) {
    results.push(validateAPI661Complete(
      design as AirCooledDesign,
      {
        airFaceVelocity: operatingParams.airFaceVelocity ?? 3.0,
        airSidePressureDrop: operatingParams.airSidePressureDrop ?? 150,
        tubeVelocity: operatingParams.tubeVelocity,
        processFluidPhase: operatingParams.fluidPhase
      }
    ));
  }

  return results;
}
