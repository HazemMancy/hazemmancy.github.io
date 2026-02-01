/**
 * API 660 & API 661 Standards Validation
 * For Shell & Tube and Air-Cooled Heat Exchangers
 * 
 * References:
 * - API 660 (10th Edition): Shell-and-Tube Heat Exchangers
 * - API 661 (7th Edition): Air-Cooled Heat Exchangers for General Refinery Service
 * - TEMA Standards (10th Edition)
 */

import { 
  MechanicalDesign, 
  ExchangerType, 
  APIValidationResult,
  VibrationCheckResult,
  TubeLayout
} from './heatExchangerTypes';

/**
 * API 660 Validation for Shell & Tube Heat Exchangers
 * Checks mechanical design against API 660 requirements
 */
export function validateAPI660(
  design: MechanicalDesign,
  shellDiameter: number,
  numberOfTubes: number,
  shellVelocity: number,
  tubeVelocity: number
): APIValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let isValid = true;

  // API 660 Section 6.2.2 - Minimum baffle spacing
  // Shall not be less than 1/5 of shell ID or 50mm, whichever is greater
  const minBaffleSpacing = Math.max(shellDiameter * 0.2, 50);
  if (design.baffleSpacing < minBaffleSpacing) {
    warnings.push(
      `Baffle spacing (${design.baffleSpacing.toFixed(1)} mm) below API 660 minimum: ${minBaffleSpacing.toFixed(1)} mm (1/5 shell ID or 50mm)`
    );
  }

  // API 660 Section 6.2.3 - Maximum baffle spacing
  // Shall not exceed shell ID for unsupported span considerations
  if (design.baffleSpacing > shellDiameter) {
    warnings.push(
      `Baffle spacing (${design.baffleSpacing.toFixed(1)} mm) exceeds shell ID (${shellDiameter.toFixed(1)} mm) - check tube vibration`
    );
  }

  // API 660 Section 6.2.4 - Baffle cut limits
  // Typically 20-45% for segmental baffles
  if (design.baffleCut < 15 || design.baffleCut > 45) {
    warnings.push(
      `Baffle cut (${design.baffleCut}%) outside recommended range of 15-45%`
    );
  }

  // API 660 Section 5.3.2 - Tube pitch requirements
  // Minimum pitch = 1.25 × tube OD for triangular, 1.25 × tube OD for square
  const minPitchRatio = 1.25;
  const actualPitchRatio = design.tubePitch / design.tubeOD;
  if (actualPitchRatio < minPitchRatio) {
    errors.push(
      `Tube pitch ratio (${actualPitchRatio.toFixed(2)}) below API 660 minimum of ${minPitchRatio}`
    );
    isValid = false;
  }

  // API 660 Section 5.4 - Velocity limits
  // Shell-side: typically 0.3-1.5 m/s for liquids
  // Tube-side: typically 0.9-2.4 m/s for liquids, up to 3.0 m/s for clean fluids
  if (shellVelocity > 1.8) {
    warnings.push(
      `Shell-side velocity (${shellVelocity.toFixed(2)} m/s) exceeds typical limit of 1.8 m/s - check erosion/vibration`
    );
  }
  if (tubeVelocity > 3.0) {
    warnings.push(
      `Tube-side velocity (${tubeVelocity.toFixed(2)} m/s) exceeds typical limit of 3.0 m/s`
    );
  }

  // API 660 Section 5.5 - Tube count validation
  // Check against TEMA tube count tables
  const maxPossibleTubes = estimateMaxTubeCount(
    shellDiameter, 
    design.tubeOD, 
    design.tubePitch, 
    design.tubeLayout
  );
  if (numberOfTubes > maxPossibleTubes * 1.1) {
    warnings.push(
      `Tube count (${numberOfTubes}) may exceed maximum for shell size (~${maxPossibleTubes})`
    );
  }

  // API 660 Section 7 - Tube length limits
  // Standard lengths: 2.44m (8ft), 3.05m (10ft), 3.66m (12ft), 
  // 4.88m (16ft), 6.10m (20ft), 7.32m (24ft)
  const standardLengths = [2.44, 3.05, 3.66, 4.88, 6.10, 7.32];
  const closestStandard = standardLengths.reduce((prev, curr) => 
    Math.abs(curr - design.tubeLength) < Math.abs(prev - design.tubeLength) ? curr : prev
  );
  if (Math.abs(design.tubeLength - closestStandard) > 0.1) {
    warnings.push(
      `Tube length (${design.tubeLength.toFixed(2)} m) is non-standard. Closest standard: ${closestStandard} m`
    );
  }

  return {
    isValid,
    warnings,
    errors,
    standard: 'API 660'
  };
}

/**
 * API 661 Validation for Air-Cooled Heat Exchangers
 */
export function validateAPI661(
  design: MechanicalDesign,
  airVelocity: number,
  bundleWidth: number,
  bundleDepth: number
): APIValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let isValid = true;

  // API 661 Section 5.2.1 - Air face velocity limits
  // Typically 2.5-3.5 m/s for induced draft, 3.0-4.0 m/s for forced draft
  if (airVelocity < 2.0) {
    warnings.push(
      `Air face velocity (${airVelocity.toFixed(2)} m/s) below typical minimum of 2.0 m/s`
    );
  }
  if (airVelocity > 4.0) {
    warnings.push(
      `Air face velocity (${airVelocity.toFixed(2)} m/s) above typical maximum of 4.0 m/s`
    );
  }

  // API 661 Section 5.3 - Bundle size limits
  // Standard bundle widths: 2.44m, 2.74m, 3.05m
  const standardWidths = [2.44, 2.74, 3.05];
  const closestWidth = standardWidths.reduce((prev, curr) => 
    Math.abs(curr - bundleWidth) < Math.abs(prev - bundleWidth) ? curr : prev
  );
  if (Math.abs(bundleWidth - closestWidth) > 0.1) {
    warnings.push(
      `Bundle width (${bundleWidth.toFixed(2)} m) is non-standard. Consider ${closestWidth} m`
    );
  }

  // API 661 Section 6 - Tube specifications
  // Common sizes: 25.4mm (1") OD for most applications
  const commonODs = [19.05, 25.4, 31.75]; // mm
  if (!commonODs.some(od => Math.abs(od - design.tubeOD) < 1)) {
    warnings.push(
      `Tube OD (${design.tubeOD.toFixed(2)} mm) is non-standard for air-cooled service`
    );
  }

  return {
    isValid,
    warnings,
    errors,
    standard: 'API 661'
  };
}

/**
 * Estimate maximum tube count based on shell geometry
 * Using TEMA layout rules
 */
function estimateMaxTubeCount(
  shellDiameter: number,
  tubeOD: number,
  tubePitch: number,
  layout: TubeLayout
): number {
  // Estimate bundle diameter (shell ID minus clearances)
  const bundleClearance = 12; // mm for fixed tubesheet
  const bundleDiameter = shellDiameter - bundleClearance * 2;
  
  // Calculate tube layout area
  const bundleArea = Math.PI * Math.pow(bundleDiameter / 2, 2);
  
  // Area per tube depends on layout
  let areaPerTube: number;
  if (layout === TubeLayout.TRIANGULAR_30 || layout === TubeLayout.TRIANGULAR_60) {
    // Triangular: pitch² × sin(60°) / 2
    areaPerTube = tubePitch * tubePitch * Math.sqrt(3) / 2;
  } else {
    // Square: pitch²
    areaPerTube = tubePitch * tubePitch;
  }
  
  // Packing efficiency factor (typically 0.7-0.85)
  const packingFactor = 0.78;
  
  return Math.floor((bundleArea / areaPerTube) * packingFactor);
}

/**
 * TEMA/API 660 Vibration Analysis
 * Based on TEMA RGP T-4 and API 660 Section 5.6
 */
export function checkVibrationAPI660(
  naturalFrequency: number,
  vortexSheddingFrequency: number,
  acousticFrequency: number,
  criticalVelocity: number,
  actualVelocity: number,
  damageNumber: number
): VibrationCheckResult {
  const warnings: string[] = [];
  let isSafe = true;
  let message = 'Vibration analysis passed per API 660';

  // Frequency ratio check (vortex/natural)
  const freqRatio = vortexSheddingFrequency / naturalFrequency;
  
  // API 660 / TEMA criteria:
  // Avoid 0.7 < fvs/fn < 1.3 (resonance band)
  if (freqRatio > 0.7 && freqRatio < 1.3) {
    isSafe = false;
    message = 'Vortex shedding frequency near resonance band (0.7-1.3 × fn)';
    warnings.push('Increase baffle spacing or add support to raise natural frequency');
  }

  // Velocity ratio check
  const velocityRatio = actualVelocity / criticalVelocity;
  if (velocityRatio > 0.8) {
    isSafe = false;
    message = 'Cross-flow velocity approaching fluid-elastic instability threshold';
    warnings.push(`Velocity ratio ${velocityRatio.toFixed(2)} exceeds 0.8 limit`);
  }

  // Acoustic resonance check
  if (acousticFrequency > 0) {
    const acousticRatio = vortexSheddingFrequency / acousticFrequency;
    if (acousticRatio > 0.85 && acousticRatio < 1.15) {
      warnings.push('Potential acoustic resonance - consider acoustic baffles');
    }
  }

  // Damage number check (Connors criterion)
  if (damageNumber > 0.5) {
    warnings.push(`Damage number (${damageNumber.toFixed(3)}) above 0.5 - review tube support design`);
  }

  // Fluid-elastic instability
  const fluidElasticParam = damageNumber;

  return {
    isSafe,
    naturalFrequency,
    vortexSheddingFrequency,
    fluidElasticInstability: fluidElasticParam,
    acousticResonanceFrequency: acousticFrequency,
    message,
    warnings
  };
}

/**
 * ASME Section VIII Division 1 Shell Thickness Calculation
 * Used by API 660 for pressure vessel design
 */
export function calculateShellThicknessASME(
  pressure: number,      // MPa (design pressure)
  radius: number,        // mm (inside radius)
  allowableStress: number, // MPa
  jointEfficiency: number, // 0.0-1.0
  corrosionAllowance: number // mm
): { thickness: number; formula: string } {
  // UG-27 formula for circumferential stress (governing)
  // t = (P × R) / (S × E - 0.6 × P) + CA
  const t = (pressure * radius) / (allowableStress * jointEfficiency - 0.6 * pressure) + corrosionAllowance;
  
  return {
    thickness: Math.max(t, getMinimumThickness(radius * 2)),
    formula: 't = (P × R) / (S × E - 0.6 × P) + CA [ASME UG-27]'
  };
}

/**
 * ASME minimum thickness requirements
 */
function getMinimumThickness(diameter: number): number {
  // ASME minimum for unfired pressure vessels
  // Based on UG-16 and common practice
  if (diameter <= 150) return 2.0;
  if (diameter <= 300) return 2.5;
  if (diameter <= 600) return 3.0;
  if (diameter <= 1000) return 4.0;
  return Math.max(4.0, diameter / 300);
}

/**
 * Validate exchanger against appropriate API standard
 */
export function validateExchanger(
  exchangerType: ExchangerType,
  design: MechanicalDesign,
  operatingParams: {
    shellDiameter: number;
    numberOfTubes: number;
    shellVelocity: number;
    tubeVelocity: number;
    airVelocity?: number;
    bundleWidth?: number;
    bundleDepth?: number;
  }
): APIValidationResult {
  if (exchangerType === ExchangerType.SHELL_TUBE) {
    return validateAPI660(
      design,
      operatingParams.shellDiameter,
      operatingParams.numberOfTubes,
      operatingParams.shellVelocity,
      operatingParams.tubeVelocity
    );
  } else if (exchangerType === ExchangerType.AIR_COOLED) {
    return validateAPI661(
      design,
      operatingParams.airVelocity || 3.0,
      operatingParams.bundleWidth || 2.44,
      operatingParams.bundleDepth || 1.0
    );
  }
  
  return {
    isValid: true,
    warnings: ['No specific API standard validation available for this exchanger type'],
    errors: [],
    standard: 'API 660'
  };
}
