/**
 * HTRI-Compatible Export Module
 * 
 * Generates heat exchanger reports in a format comparable to HTRI Xchanger Suite®
 * for validation and commercial software cross-checking.
 * 
 * @api API 660, TEMA Standards, HTRI Guidelines
 * @reference HTRI Xchanger Suite User Manual
 * @safety CRITICAL: Export includes all safety-critical parameters
 * 
 * Output Format Sections:
 * 1. Case Summary
 * 2. Process Conditions
 * 3. Thermal Performance
 * 4. Pressure Drop Analysis
 * 5. Geometry Details
 * 6. Vibration Analysis
 * 7. Standards Compliance
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// ============================================================================
// HTRI EXPORT DATA STRUCTURE
// ============================================================================

export interface HTRIExportData {
  // Case Identification
  caseInfo: {
    caseName: string;
    caseNumber: string;
    projectName: string;
    customer: string;
    engineer: string;
    date: string;
    revision: string;
    temaDesignation: string;
    orientation: 'horizontal' | 'vertical';
    exchangerService: string;
  };

  // Process Conditions (Shell & Tube)
  shellSide: {
    fluidName: string;
    flowRate: number;        // kg/s
    inletTemp: number;       // °C
    outletTemp: number;      // °C
    operatingPressure: number; // kPa
    allowablePD: number;     // kPa
    foulingFactor: number;   // m²·K/W
    density: number;         // kg/m³
    viscosity: number;       // mPa·s
    specificHeat: number;    // kJ/kg·K
    thermalConductivity: number; // W/m·K
    prandtlNumber: number;
    phase: 'liquid' | 'vapor' | 'two-phase' | 'condensing' | 'boiling';
  };

  tubeSide: {
    fluidName: string;
    flowRate: number;
    inletTemp: number;
    outletTemp: number;
    operatingPressure: number;
    allowablePD: number;
    foulingFactor: number;
    density: number;
    viscosity: number;
    specificHeat: number;
    thermalConductivity: number;
    prandtlNumber: number;
    phase: 'liquid' | 'vapor' | 'two-phase' | 'condensing' | 'boiling';
  };

  // Thermal Performance
  thermalResults: {
    heatDuty: number;              // kW
    heatDutyBalance: number;       // % difference hot/cold
    lmtd: number;                  // °C
    correctionFactorF: number;     // dimensionless
    effectiveMTD: number;          // °C
    overallUClean: number;         // W/m²·K
    overallUFouled: number;        // W/m²·K
    overallURequired: number;      // W/m²·K
    overallUService: number;       // W/m²·K (calculated)
    shellHTC: number;              // W/m²·K
    tubeHTC: number;               // W/m²·K
    tubeWallResistance: number;    // m²·K/W
    effectiveness: number;         // fraction
    ntu: number;                   // dimensionless
    thermalEfficiency: number;     // %
    oversurfacePercent: number;    // %
  };

  // Pressure Drop Results
  pressureDropResults: {
    shellSidePD: number;           // kPa
    shellSideComponents: {
      crossflow: number;           // kPa
      window: number;              // kPa
      endZones: number;            // kPa
      nozzles: number;             // kPa
    };
    tubeSidePD: number;            // kPa
    tubeSideComponents: {
      friction: number;            // kPa
      returns: number;             // kPa
      nozzles: number;             // kPa
    };
    shellVelocity: number;         // m/s
    tubeVelocity: number;          // m/s
    shellReynolds: number;
    tubeReynolds: number;
    shellFlowRegime: string;
    tubeFlowRegime: string;
  };

  // Geometry
  geometry: {
    shellID: number;               // mm
    shellThickness: number;        // mm
    tubeOD: number;                // mm
    tubeWall: number;              // mm
    tubeID: number;                // mm
    tubeLength: number;            // m
    effectiveTubeLength: number;   // m
    numberOfTubes: number;
    tubePitch: number;             // mm
    pitchRatio: number;
    tubePattern: 'triangular-30' | 'triangular-60' | 'square-90' | 'rotated-square-45';
    tubePasses: number;
    shellPasses: number;
    baffleType: 'single-segmental' | 'double-segmental' | 'no-tubes-in-window' | 'disc-doughnut';
    baffleSpacing: number;         // mm
    inletBaffleSpacing: number;    // mm
    outletBaffleSpacing: number;   // mm
    baffleCut: number;             // %
    baffleThickness: number;       // mm
    numberOfBaffles: number;
    crossflowArea: number;         // m²
    windowArea: number;            // m²
    bundleDiameter: number;        // mm
    shellToTubesheetClearance: number; // mm
    sealingStrips: number;
  };

  // Material & Mechanical
  mechanical: {
    shellMaterial: string;
    tubeMaterial: string;
    tubesheetMaterial: string;
    baffleMaterial: string;
    designPressureShell: number;   // barg
    designPressureTube: number;    // barg
    designTemperature: number;     // °C
    hydroTestPressure: number;     // barg
    corrosionAllowance: number;    // mm
    jointEfficiency: number;       // fraction
    tubesheetThickness: number;    // mm
    channelThickness: number;      // mm
    flangeRating: string;
    tubeToTubesheetJoint: 'expanded' | 'welded' | 'expanded-and-welded';
  };

  // Vibration Analysis (TEMA RGP T-4)
  vibration: {
    naturalFrequency: number;           // Hz
    vortexSheddingFrequency: number;    // Hz
    turbulentBuffetingFrequency: number; // Hz
    acousticResonanceFrequency: number; // Hz
    criticalVelocity: number;           // m/s
    crossflowVelocity: number;          // m/s
    velocityRatio: number;              // V/Vcrit
    frequencyRatio: number;             // fvs/fn
    reducedVelocity: number;
    damageNumber: number;
    unsupportedSpan: number;            // mm
    logDecrement: number;
    isVortexSheddingRisk: boolean;
    isFEIRisk: boolean;
    isAcousticRisk: boolean;
    vibrationStatus: 'safe' | 'marginal' | 'unsafe';
    recommendations: string[];
  };

  // Bell-Delaware J-Factors
  bellDelawareFactors: {
    Jc: number;  // Baffle cut correction
    Jl: number;  // Leakage correction
    Jb: number;  // Bypass correction
    Jr: number;  // Adverse temperature gradient
    Js: number;  // Unequal baffle spacing
    jFactor: number;  // Heat transfer j-factor
    fFactor: number;  // Friction f-factor
  };

  // Validation & Compliance
  compliance: {
    api660Compliant: boolean;
    temaClass: 'R' | 'C' | 'B';
    api660Warnings: string[];
    api660Errors: string[];
    temaWarnings: string[];
    asmeCompliant: boolean;
    designCode: string;
  };

  // Unit System
  unitSystem: 'SI' | 'US';
}

// ============================================================================
// HTRI EXCEL EXPORT
// ============================================================================

/**
 * Generate HTRI-compatible Excel report
 * Mimics HTRI Xchanger Suite output format for validation
 */
export function generateHTRIExcel(data: HTRIExportData): void {
  const wb = XLSX.utils.book_new();

  // ==================== SHEET 1: CASE SUMMARY ====================
  const caseSummary = [
    ['╔══════════════════════════════════════════════════════════════════════════════════╗'],
    ['║                    HEAT EXCHANGER THERMAL DESIGN REPORT                          ║'],
    ['║                    HTRI-Compatible Format for Validation                         ║'],
    ['╚══════════════════════════════════════════════════════════════════════════════════╝'],
    [''],
    ['CASE IDENTIFICATION', '', '', ''],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Case Name:', data.caseInfo.caseName, 'Case Number:', data.caseInfo.caseNumber],
    ['Project:', data.caseInfo.projectName, 'Customer:', data.caseInfo.customer],
    ['Engineer:', data.caseInfo.engineer, 'Date:', data.caseInfo.date],
    ['TEMA Designation:', data.caseInfo.temaDesignation, 'Revision:', data.caseInfo.revision],
    ['Orientation:', data.caseInfo.orientation, 'Service:', data.caseInfo.exchangerService],
    [''],
    [''],
    ['OVERALL PERFORMANCE SUMMARY'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['', 'Calculated', 'Required', 'Status'],
    ['Heat Duty (kW)', data.thermalResults.heatDuty.toFixed(2), '-', getStatusBadge(true)],
    ['Duty Balance (%)', data.thermalResults.heatDutyBalance.toFixed(2), '< 5%', getStatusBadge(Math.abs(data.thermalResults.heatDutyBalance) < 5)],
    ['LMTD (°C)', data.thermalResults.lmtd.toFixed(2), '-', '-'],
    ['F Factor', data.thermalResults.correctionFactorF.toFixed(4), '≥ 0.75', getStatusBadge(data.thermalResults.correctionFactorF >= 0.75)],
    ['Effective MTD (°C)', data.thermalResults.effectiveMTD.toFixed(2), '-', '-'],
    [''],
    ['Overall U Clean (W/m²·K)', data.thermalResults.overallUClean.toFixed(1), '-', '-'],
    ['Overall U Fouled (W/m²·K)', data.thermalResults.overallUFouled.toFixed(1), '-', '-'],
    ['Overall U Required (W/m²·K)', data.thermalResults.overallURequired.toFixed(1), '-', '-'],
    ['Overall U Service (W/m²·K)', data.thermalResults.overallUService.toFixed(1), '≥ U Required', getStatusBadge(data.thermalResults.overallUService >= data.thermalResults.overallURequired)],
    [''],
    ['Oversurface (%)', data.thermalResults.oversurfacePercent.toFixed(1), '10-25%', getStatusBadge(data.thermalResults.oversurfacePercent >= 10 && data.thermalResults.oversurfacePercent <= 50)],
    ['Effectiveness', (data.thermalResults.effectiveness * 100).toFixed(1) + '%', '-', '-'],
    ['NTU', data.thermalResults.ntu.toFixed(3), '-', '-'],
    [''],
    [''],
    ['PRESSURE DROP SUMMARY'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['', 'Calculated', 'Allowable', 'Status'],
    ['Shell Side (kPa)', data.pressureDropResults.shellSidePD.toFixed(2), data.shellSide.allowablePD.toFixed(2), getStatusBadge(data.pressureDropResults.shellSidePD <= data.shellSide.allowablePD)],
    ['Tube Side (kPa)', data.pressureDropResults.tubeSidePD.toFixed(2), data.tubeSide.allowablePD.toFixed(2), getStatusBadge(data.pressureDropResults.tubeSidePD <= data.tubeSide.allowablePD)],
    ['Shell Velocity (m/s)', data.pressureDropResults.shellVelocity.toFixed(2), '< 1.5 (liquid)', getStatusBadge(data.pressureDropResults.shellVelocity < 1.8)],
    ['Tube Velocity (m/s)', data.pressureDropResults.tubeVelocity.toFixed(2), '< 3.0', getStatusBadge(data.pressureDropResults.tubeVelocity < 3.0)],
    [''],
    [''],
    ['VIBRATION ANALYSIS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Natural Frequency (Hz)', data.vibration.naturalFrequency.toFixed(1), '-', '-'],
    ['Vortex Shedding (Hz)', data.vibration.vortexSheddingFrequency.toFixed(1), 'Avoid 0.7-1.3×fn', getStatusBadge(!data.vibration.isVortexSheddingRisk)],
    ['Critical Velocity (m/s)', data.vibration.criticalVelocity.toFixed(2), '-', '-'],
    ['Velocity Ratio (V/Vcrit)', data.vibration.velocityRatio.toFixed(3), '< 0.8', getStatusBadge(data.vibration.velocityRatio < 0.8)],
    ['Frequency Ratio (fvs/fn)', data.vibration.frequencyRatio.toFixed(3), '< 0.7 or > 1.3', getStatusBadge(data.vibration.frequencyRatio < 0.7 || data.vibration.frequencyRatio > 1.3)],
    ['VIBRATION STATUS', data.vibration.vibrationStatus.toUpperCase(), '-', getStatusBadge(data.vibration.vibrationStatus === 'safe')],
    [''],
    [''],
    ['COMPLIANCE SUMMARY'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['API 660 Compliance', data.compliance.api660Compliant ? 'COMPLIANT' : 'NON-COMPLIANT', '', ''],
    ['TEMA Class', data.compliance.temaClass, '', ''],
    ['Design Code', data.compliance.designCode, '', ''],
    ['ASME Compliance', data.compliance.asmeCompliant ? 'COMPLIANT' : 'REVIEW REQUIRED', '', ''],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(caseSummary);
  ws1['!cols'] = [{ wch: 32 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Case Summary');

  // ==================== SHEET 2: PROCESS CONDITIONS ====================
  const processSheet = [
    ['PROCESS CONDITIONS'],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['', 'SHELL SIDE', 'TUBE SIDE', 'Units'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Fluid Name', data.shellSide.fluidName, data.tubeSide.fluidName, ''],
    ['Phase', data.shellSide.phase, data.tubeSide.phase, ''],
    ['Flow Rate', data.shellSide.flowRate.toFixed(3), data.tubeSide.flowRate.toFixed(3), 'kg/s'],
    ['Flow Rate', (data.shellSide.flowRate * 3600).toFixed(1), (data.tubeSide.flowRate * 3600).toFixed(1), 'kg/hr'],
    [''],
    ['Inlet Temperature', data.shellSide.inletTemp.toFixed(1), data.tubeSide.inletTemp.toFixed(1), '°C'],
    ['Outlet Temperature', data.shellSide.outletTemp.toFixed(1), data.tubeSide.outletTemp.toFixed(1), '°C'],
    ['Temperature Change', Math.abs(data.shellSide.inletTemp - data.shellSide.outletTemp).toFixed(1), Math.abs(data.tubeSide.inletTemp - data.tubeSide.outletTemp).toFixed(1), '°C'],
    [''],
    ['Operating Pressure', data.shellSide.operatingPressure.toFixed(1), data.tubeSide.operatingPressure.toFixed(1), 'kPa'],
    ['Allowable Pressure Drop', data.shellSide.allowablePD.toFixed(1), data.tubeSide.allowablePD.toFixed(1), 'kPa'],
    ['Calculated Pressure Drop', data.pressureDropResults.shellSidePD.toFixed(2), data.pressureDropResults.tubeSidePD.toFixed(2), 'kPa'],
    [''],
    ['FLUID PROPERTIES (at bulk temperature)'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Density', data.shellSide.density.toFixed(1), data.tubeSide.density.toFixed(1), 'kg/m³'],
    ['Viscosity', data.shellSide.viscosity.toFixed(4), data.tubeSide.viscosity.toFixed(4), 'mPa·s'],
    ['Specific Heat', data.shellSide.specificHeat.toFixed(3), data.tubeSide.specificHeat.toFixed(3), 'kJ/kg·K'],
    ['Thermal Conductivity', data.shellSide.thermalConductivity.toFixed(4), data.tubeSide.thermalConductivity.toFixed(4), 'W/m·K'],
    ['Prandtl Number', data.shellSide.prandtlNumber.toFixed(2), data.tubeSide.prandtlNumber.toFixed(2), ''],
    [''],
    ['FOULING FACTORS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Fouling Factor', (data.shellSide.foulingFactor * 1000).toFixed(4), (data.tubeSide.foulingFactor * 1000).toFixed(4), '×10⁻³ m²·K/W'],
    ['Cleanliness (approx)', ((1 - data.shellSide.foulingFactor * data.thermalResults.overallUClean) * 100).toFixed(1), ((1 - data.tubeSide.foulingFactor * data.thermalResults.overallUClean) * 100).toFixed(1), '%'],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(processSheet);
  ws2['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Process Conditions');

  // ==================== SHEET 3: THERMAL PERFORMANCE ====================
  const thermalSheet = [
    ['THERMAL PERFORMANCE ANALYSIS'],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['HEAT DUTY'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Total Heat Duty', data.thermalResults.heatDuty.toFixed(2), 'kW', ''],
    ['Heat Duty', (data.thermalResults.heatDuty * 3.412).toFixed(0), 'BTU/hr', ''],
    ['Duty Balance Error', data.thermalResults.heatDutyBalance.toFixed(2), '%', ''],
    [''],
    ['TEMPERATURE DRIVING FORCE'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Log Mean Temp Diff (LMTD)', data.thermalResults.lmtd.toFixed(2), '°C', 'Uncorrected'],
    ['F Correction Factor', data.thermalResults.correctionFactorF.toFixed(4), '', 'Shell-tube correction'],
    ['Effective MTD', data.thermalResults.effectiveMTD.toFixed(2), '°C', 'LMTD × F'],
    [''],
    ['HEAT TRANSFER COEFFICIENTS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Parameter', 'Value', 'Units', 'Method'],
    ['Tube-side Film (hi)', data.thermalResults.tubeHTC.toFixed(1), 'W/m²·K', 'Gnielinski/Dittus-Boelter'],
    ['Shell-side Film (ho)', data.thermalResults.shellHTC.toFixed(1), 'W/m²·K', 'Bell-Delaware'],
    ['Tube Wall Resistance', (data.thermalResults.tubeWallResistance * 1000).toFixed(4), '×10⁻³ m²·K/W', 'ln(Do/Di)/(2πkL)'],
    [''],
    ['OVERALL COEFFICIENTS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Clean Overall U (Uc)', data.thermalResults.overallUClean.toFixed(1), 'W/m²·K', 'No fouling'],
    ['Fouled Overall U (Uf)', data.thermalResults.overallUFouled.toFixed(1), 'W/m²·K', 'With fouling'],
    ['Required U (Ur)', data.thermalResults.overallURequired.toFixed(1), 'W/m²·K', 'Q/(A×MTD)'],
    ['Service U (Us)', data.thermalResults.overallUService.toFixed(1), 'W/m²·K', 'From calculation'],
    [''],
    ['DESIGN MARGINS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Oversurface', data.thermalResults.oversurfacePercent.toFixed(1), '%', 'Excess area'],
    ['Thermal Efficiency', data.thermalResults.thermalEfficiency.toFixed(1), '%', ''],
    ['NTU', data.thermalResults.ntu.toFixed(3), '', 'UA/Cmin'],
    ['Effectiveness (ε)', (data.thermalResults.effectiveness * 100).toFixed(1), '%', 'Q/Qmax'],
    [''],
    ['BELL-DELAWARE CORRECTION FACTORS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Jc (Baffle cut)', data.bellDelawareFactors.Jc.toFixed(4), '', 'Segmental baffle'],
    ['Jl (Leakage)', data.bellDelawareFactors.Jl.toFixed(4), '', 'Shell & tube-baffle'],
    ['Jb (Bypass)', data.bellDelawareFactors.Jb.toFixed(4), '', 'Bundle bypass'],
    ['Jr (Temperature)', data.bellDelawareFactors.Jr.toFixed(4), '', 'Laminar flow'],
    ['Js (Spacing)', data.bellDelawareFactors.Js.toFixed(4), '', 'End baffle spacing'],
    ['j-Factor (Colburn)', data.bellDelawareFactors.jFactor.toFixed(6), '', 'Heat transfer'],
    ['f-Factor (Friction)', data.bellDelawareFactors.fFactor.toFixed(6), '', 'Pressure drop'],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(thermalSheet);
  ws3['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Thermal Performance');

  // ==================== SHEET 4: GEOMETRY ====================
  const geometrySheet = [
    ['EXCHANGER GEOMETRY'],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['SHELL'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Shell Inside Diameter', data.geometry.shellID.toFixed(0), 'mm', (data.geometry.shellID / 25.4).toFixed(2) + ' in'],
    ['Shell Thickness', data.geometry.shellThickness.toFixed(1), 'mm', ''],
    ['Shell Material', data.mechanical.shellMaterial, '', ''],
    ['Shell Passes', data.geometry.shellPasses, '', ''],
    [''],
    ['TUBES'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Number of Tubes', data.geometry.numberOfTubes, '', ''],
    ['Tube Outside Diameter', data.geometry.tubeOD.toFixed(2), 'mm', (data.geometry.tubeOD / 25.4).toFixed(3) + ' in'],
    ['Tube Wall Thickness', data.geometry.tubeWall.toFixed(2), 'mm', 'BWG equivalent'],
    ['Tube Inside Diameter', data.geometry.tubeID.toFixed(2), 'mm', ''],
    ['Tube Length (Total)', data.geometry.tubeLength.toFixed(2), 'm', (data.geometry.tubeLength * 3.281).toFixed(1) + ' ft'],
    ['Effective Tube Length', data.geometry.effectiveTubeLength.toFixed(2), 'm', 'Between tubesheets'],
    ['Tube Pitch', data.geometry.tubePitch.toFixed(2), 'mm', ''],
    ['Pitch Ratio (P/Do)', data.geometry.pitchRatio.toFixed(3), '', 'TEMA: 1.25-1.50'],
    ['Tube Pattern', data.geometry.tubePattern, '', ''],
    ['Tube Passes', data.geometry.tubePasses, '', ''],
    ['Tube Material', data.mechanical.tubeMaterial, '', ''],
    ['Tube-Tubesheet Joint', data.mechanical.tubeToTubesheetJoint, '', ''],
    [''],
    ['BAFFLES'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Baffle Type', data.geometry.baffleType, '', ''],
    ['Number of Baffles', data.geometry.numberOfBaffles, '', ''],
    ['Baffle Spacing (Central)', data.geometry.baffleSpacing.toFixed(0), 'mm', ''],
    ['Inlet Baffle Spacing', data.geometry.inletBaffleSpacing.toFixed(0), 'mm', ''],
    ['Outlet Baffle Spacing', data.geometry.outletBaffleSpacing.toFixed(0), 'mm', ''],
    ['Baffle Cut', data.geometry.baffleCut.toFixed(0), '%', 'of shell ID'],
    ['Baffle Thickness', data.geometry.baffleThickness.toFixed(1), 'mm', ''],
    ['Sealing Strips (pairs)', data.geometry.sealingStrips, '', ''],
    [''],
    ['FLOW AREAS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Crossflow Area (Sm)', (data.geometry.crossflowArea * 1e6).toFixed(0), 'mm²', (data.geometry.crossflowArea * 1e4).toFixed(2) + ' cm²'],
    ['Window Area (Sw)', (data.geometry.windowArea * 1e6).toFixed(0), 'mm²', ''],
    ['Bundle Diameter (OTL)', data.geometry.bundleDiameter.toFixed(0), 'mm', ''],
    ['Shell-Bundle Clearance', data.geometry.shellToTubesheetClearance.toFixed(1), 'mm', 'Diametral'],
  ];

  const ws4 = XLSX.utils.aoa_to_sheet(geometrySheet);
  ws4['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Geometry');

  // ==================== SHEET 5: VIBRATION ANALYSIS ====================
  const vibrationSheet = [
    ['FLOW-INDUCED VIBRATION ANALYSIS'],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    ['Reference: TEMA RGP T-4, API 660 §5.6.2'],
    [''],
    ['NATURAL FREQUENCY ANALYSIS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Unsupported Span Length', data.vibration.unsupportedSpan.toFixed(0), 'mm', 'Between supports'],
    ['Log Decrement (δ)', data.vibration.logDecrement.toFixed(4), '', 'Damping parameter'],
    ['Natural Frequency (fn)', data.vibration.naturalFrequency.toFixed(2), 'Hz', 'First mode'],
    [''],
    ['VORTEX SHEDDING'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Crossflow Velocity', data.vibration.crossflowVelocity.toFixed(3), 'm/s', 'Shell-side'],
    ['Vortex Shedding Freq (fvs)', data.vibration.vortexSheddingFrequency.toFixed(2), 'Hz', 'St × V / d'],
    ['Frequency Ratio (fvs/fn)', data.vibration.frequencyRatio.toFixed(3), '', 'Avoid 0.7-1.3'],
    ['Vortex Shedding Risk', data.vibration.isVortexSheddingRisk ? 'YES - RESONANCE ZONE' : 'NO', '', ''],
    [''],
    ['FLUID-ELASTIC INSTABILITY (FEI)'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Critical Velocity (Vcrit)', data.vibration.criticalVelocity.toFixed(3), 'm/s', 'Connors criterion'],
    ['Velocity Ratio (V/Vcrit)', data.vibration.velocityRatio.toFixed(3), '', 'Must be < 0.8'],
    ['Reduced Velocity', data.vibration.reducedVelocity.toFixed(3), '', 'V/(fn×d)'],
    ['Damage Number', data.vibration.damageNumber.toFixed(4), '', 'Must be < 0.5'],
    ['FEI Risk', data.vibration.isFEIRisk ? 'YES - EXCEEDS LIMIT' : 'NO', '', ''],
    [''],
    ['ACOUSTIC RESONANCE'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Acoustic Frequency (fa)', data.vibration.acousticResonanceFrequency.toFixed(2), 'Hz', 'c/(2W)'],
    ['Turbulent Buffeting (ftb)', data.vibration.turbulentBuffetingFrequency.toFixed(2), 'Hz', ''],
    ['Acoustic Risk', data.vibration.isAcousticRisk ? 'YES' : 'NO', '', 'Gas service'],
    [''],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    ['OVERALL VIBRATION STATUS', data.vibration.vibrationStatus.toUpperCase(), '', ''],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['RECOMMENDATIONS'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ...data.vibration.recommendations.map((rec, i) => [`${i + 1}. ${rec}`, '', '', '']),
  ];

  const ws5 = XLSX.utils.aoa_to_sheet(vibrationSheet);
  ws5['!cols'] = [{ wch: 36 }, { wch: 20 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'Vibration Analysis');

  // ==================== SHEET 6: PRESSURE DROP BREAKDOWN ====================
  const pressureSheet = [
    ['PRESSURE DROP ANALYSIS'],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['SHELL SIDE PRESSURE DROP BREAKDOWN'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Component', 'Value (kPa)', '% of Total', 'Method'],
    ['Crossflow (baffled zone)', data.pressureDropResults.shellSideComponents.crossflow.toFixed(2), (data.pressureDropResults.shellSideComponents.crossflow / data.pressureDropResults.shellSidePD * 100).toFixed(1) + '%', 'Bell-Delaware'],
    ['Window zones', data.pressureDropResults.shellSideComponents.window.toFixed(2), (data.pressureDropResults.shellSideComponents.window / data.pressureDropResults.shellSidePD * 100).toFixed(1) + '%', ''],
    ['End zones (inlet/outlet)', data.pressureDropResults.shellSideComponents.endZones.toFixed(2), (data.pressureDropResults.shellSideComponents.endZones / data.pressureDropResults.shellSidePD * 100).toFixed(1) + '%', ''],
    ['Nozzles', data.pressureDropResults.shellSideComponents.nozzles.toFixed(2), (data.pressureDropResults.shellSideComponents.nozzles / data.pressureDropResults.shellSidePD * 100).toFixed(1) + '%', ''],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['TOTAL SHELL SIDE', data.pressureDropResults.shellSidePD.toFixed(2), '100%', ''],
    ['Allowable', data.shellSide.allowablePD.toFixed(2), '', ''],
    ['Margin', (data.shellSide.allowablePD - data.pressureDropResults.shellSidePD).toFixed(2), ((1 - data.pressureDropResults.shellSidePD / data.shellSide.allowablePD) * 100).toFixed(1) + '%', ''],
    [''],
    ['Shell-side Velocity', data.pressureDropResults.shellVelocity.toFixed(3), 'm/s', ''],
    ['Shell-side Reynolds', data.pressureDropResults.shellReynolds.toFixed(0), '', data.pressureDropResults.shellFlowRegime],
    [''],
    [''],
    ['TUBE SIDE PRESSURE DROP BREAKDOWN'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Component', 'Value (kPa)', '% of Total', 'Method'],
    ['Straight tube friction', data.pressureDropResults.tubeSideComponents.friction.toFixed(2), (data.pressureDropResults.tubeSideComponents.friction / data.pressureDropResults.tubeSidePD * 100).toFixed(1) + '%', 'Darcy-Weisbach'],
    ['Return losses', data.pressureDropResults.tubeSideComponents.returns.toFixed(2), (data.pressureDropResults.tubeSideComponents.returns / data.pressureDropResults.tubeSidePD * 100).toFixed(1) + '%', '4×Np velocity heads'],
    ['Nozzles', data.pressureDropResults.tubeSideComponents.nozzles.toFixed(2), (data.pressureDropResults.tubeSideComponents.nozzles / data.pressureDropResults.tubeSidePD * 100).toFixed(1) + '%', ''],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['TOTAL TUBE SIDE', data.pressureDropResults.tubeSidePD.toFixed(2), '100%', ''],
    ['Allowable', data.tubeSide.allowablePD.toFixed(2), '', ''],
    ['Margin', (data.tubeSide.allowablePD - data.pressureDropResults.tubeSidePD).toFixed(2), ((1 - data.pressureDropResults.tubeSidePD / data.tubeSide.allowablePD) * 100).toFixed(1) + '%', ''],
    [''],
    ['Tube-side Velocity', data.pressureDropResults.tubeVelocity.toFixed(3), 'm/s', ''],
    ['Tube-side Reynolds', data.pressureDropResults.tubeReynolds.toFixed(0), '', data.pressureDropResults.tubeFlowRegime],
  ];

  const ws6 = XLSX.utils.aoa_to_sheet(pressureSheet);
  ws6['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws6, 'Pressure Drop');

  // ==================== SHEET 7: COMPLIANCE ====================
  const complianceSheet = [
    ['STANDARDS COMPLIANCE REPORT'],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['API 660 COMPLIANCE'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Status:', data.compliance.api660Compliant ? 'COMPLIANT' : 'NON-COMPLIANT'],
    [''],
    ['Warnings:'],
    ...data.compliance.api660Warnings.map(w => [`  ⚠ ${w}`]),
    [''],
    ['Errors:'],
    ...data.compliance.api660Errors.map(e => [`  ❌ ${e}`]),
    [''],
    ['TEMA COMPLIANCE'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['TEMA Class:', data.compliance.temaClass],
    [''],
    ['Warnings:'],
    ...data.compliance.temaWarnings.map(w => [`  ⚠ ${w}`]),
    [''],
    ['MECHANICAL DESIGN'],
    ['────────────────────────────────────────────────────────────────────────────────────'],
    ['Design Code:', data.compliance.designCode],
    ['ASME Compliance:', data.compliance.asmeCompliant ? 'COMPLIANT' : 'REVIEW REQUIRED'],
    [''],
    ['Design Pressure (Shell):', data.mechanical.designPressureShell.toFixed(1) + ' barg'],
    ['Design Pressure (Tube):', data.mechanical.designPressureTube.toFixed(1) + ' barg'],
    ['Design Temperature:', data.mechanical.designTemperature.toFixed(0) + ' °C'],
    ['Hydro Test Pressure:', data.mechanical.hydroTestPressure.toFixed(1) + ' barg'],
    ['Joint Efficiency:', (data.mechanical.jointEfficiency * 100).toFixed(0) + '%'],
    ['Corrosion Allowance:', data.mechanical.corrosionAllowance.toFixed(1) + ' mm'],
    [''],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    ['DISCLAIMER'],
    ['════════════════════════════════════════════════════════════════════════════════════'],
    ['This is a SCREENING TOOL only. Results must be verified by:'],
    ['1. Licensed Professional Engineer'],
    ['2. Commercial software (HTRI, Aspen EDR, etc.)'],
    ['3. API 660/661 compliance audit'],
    ['════════════════════════════════════════════════════════════════════════════════════'],
  ];

  const ws7 = XLSX.utils.aoa_to_sheet(complianceSheet);
  ws7['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws7, 'Compliance');

  // Save file
  const fileName = `HTRI_Report_${data.caseInfo.caseNumber}_${data.caseInfo.date.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusBadge(pass: boolean): string {
  return pass ? '✓ PASS' : '✗ REVIEW';
}

/**
 * Create default HTRI export data structure from calculator results
 */
export function createHTRIExportData(
  calculatorData: Partial<HTRIExportData>
): HTRIExportData {
  const defaultData: HTRIExportData = {
    caseInfo: {
      caseName: 'Heat Exchanger Design',
      caseNumber: 'HX-001',
      projectName: 'Project',
      customer: '',
      engineer: '',
      date: new Date().toLocaleDateString(),
      revision: 'A',
      temaDesignation: 'AES',
      orientation: 'horizontal',
      exchangerService: 'General Service',
    },
    shellSide: {
      fluidName: 'Water',
      flowRate: 0,
      inletTemp: 0,
      outletTemp: 0,
      operatingPressure: 101.325,
      allowablePD: 50,
      foulingFactor: 0.0002,
      density: 1000,
      viscosity: 1,
      specificHeat: 4.18,
      thermalConductivity: 0.6,
      prandtlNumber: 6,
      phase: 'liquid',
    },
    tubeSide: {
      fluidName: 'Water',
      flowRate: 0,
      inletTemp: 0,
      outletTemp: 0,
      operatingPressure: 101.325,
      allowablePD: 50,
      foulingFactor: 0.0002,
      density: 1000,
      viscosity: 1,
      specificHeat: 4.18,
      thermalConductivity: 0.6,
      prandtlNumber: 6,
      phase: 'liquid',
    },
    thermalResults: {
      heatDuty: 0,
      heatDutyBalance: 0,
      lmtd: 0,
      correctionFactorF: 1,
      effectiveMTD: 0,
      overallUClean: 0,
      overallUFouled: 0,
      overallURequired: 0,
      overallUService: 0,
      shellHTC: 0,
      tubeHTC: 0,
      tubeWallResistance: 0,
      effectiveness: 0,
      ntu: 0,
      thermalEfficiency: 0,
      oversurfacePercent: 0,
    },
    pressureDropResults: {
      shellSidePD: 0,
      shellSideComponents: { crossflow: 0, window: 0, endZones: 0, nozzles: 0 },
      tubeSidePD: 0,
      tubeSideComponents: { friction: 0, returns: 0, nozzles: 0 },
      shellVelocity: 0,
      tubeVelocity: 0,
      shellReynolds: 0,
      tubeReynolds: 0,
      shellFlowRegime: 'Turbulent',
      tubeFlowRegime: 'Turbulent',
    },
    geometry: {
      shellID: 0,
      shellThickness: 0,
      tubeOD: 0,
      tubeWall: 0,
      tubeID: 0,
      tubeLength: 0,
      effectiveTubeLength: 0,
      numberOfTubes: 0,
      tubePitch: 0,
      pitchRatio: 0,
      tubePattern: 'triangular-30',
      tubePasses: 1,
      shellPasses: 1,
      baffleType: 'single-segmental',
      baffleSpacing: 0,
      inletBaffleSpacing: 0,
      outletBaffleSpacing: 0,
      baffleCut: 25,
      baffleThickness: 6,
      numberOfBaffles: 0,
      crossflowArea: 0,
      windowArea: 0,
      bundleDiameter: 0,
      shellToTubesheetClearance: 0,
      sealingStrips: 0,
    },
    mechanical: {
      shellMaterial: 'Carbon Steel SA-516 Gr.70',
      tubeMaterial: 'Carbon Steel SA-179',
      tubesheetMaterial: 'Carbon Steel SA-516 Gr.70',
      baffleMaterial: 'Carbon Steel',
      designPressureShell: 10,
      designPressureTube: 10,
      designTemperature: 150,
      hydroTestPressure: 15,
      corrosionAllowance: 3,
      jointEfficiency: 0.85,
      tubesheetThickness: 0,
      channelThickness: 0,
      flangeRating: 'Class 150',
      tubeToTubesheetJoint: 'expanded',
    },
    vibration: {
      naturalFrequency: 0,
      vortexSheddingFrequency: 0,
      turbulentBuffetingFrequency: 0,
      acousticResonanceFrequency: 0,
      criticalVelocity: 0,
      crossflowVelocity: 0,
      velocityRatio: 0,
      frequencyRatio: 0,
      reducedVelocity: 0,
      damageNumber: 0,
      unsupportedSpan: 0,
      logDecrement: 0.03,
      isVortexSheddingRisk: false,
      isFEIRisk: false,
      isAcousticRisk: false,
      vibrationStatus: 'safe',
      recommendations: [],
    },
    bellDelawareFactors: {
      Jc: 1,
      Jl: 1,
      Jb: 1,
      Jr: 1,
      Js: 1,
      jFactor: 0,
      fFactor: 0,
    },
    compliance: {
      api660Compliant: true,
      temaClass: 'R',
      api660Warnings: [],
      api660Errors: [],
      temaWarnings: [],
      asmeCompliant: true,
      designCode: 'ASME Section VIII Div.1',
    },
    unitSystem: 'SI',
  };

  // Deep merge with provided data
  return deepMerge(defaultData, calculatorData) as HTRIExportData;
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const output = { ...target };
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        output[key] = deepMerge(output[key] as any, source[key] as any);
      } else {
        (output as any)[key] = source[key];
      }
    }
  }
  return output;
}
