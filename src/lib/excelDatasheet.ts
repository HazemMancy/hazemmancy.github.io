/**
 * Excel Datasheet Export - HTRI Style
 * Creates professional heat exchanger datasheets in Excel format
 */

import * as XLSX from 'xlsx';

export interface ExcelDatasheetData {
  // Document info
  companyName: string;
  projectName: string;
  itemNumber: string;
  revisionNo: string;
  date: string;
  
  // Exchanger identification
  temaType: string;
  orientation: string;
  surfaceArea: number;
  surfaceAreaUnit: string;
  
  // Shell side
  shellFluid: string;
  shellInletTemp: number;
  shellOutletTemp: number;
  shellFlowRate: number;
  shellPressureDrop: number;
  shellVelocity: number;
  shellReynolds: number;
  shellHTC: number;
  
  // Tube side
  tubeFluid: string;
  tubeInletTemp: number;
  tubeOutletTemp: number;
  tubeFlowRate: number;
  tubePressureDrop: number;
  tubeVelocity: number;
  tubeReynolds: number;
  tubeHTC: number;
  
  // Thermal performance
  heatDuty: number;
  lmtd: number;
  correctionFactor: number;
  effectiveMTD: number;
  overallU: number;
  cleanU: number;
  fouledU: number;
  overdesign: number;
  ntu: number;
  effectiveness: number;
  
  // Fouling
  shellFouling: number;
  tubeFouling: number;
  cleanlinessPercent: number;
  
  // Geometry
  shellDiameter: number;
  tubeOD: number;
  tubeWall: number;
  tubeLength: number;
  numberOfTubes: number;
  tubePitch: number;
  tubePattern: string;
  tubePasses: number;
  baffleSpacing: number;
  baffleCut: number;
  numberOfBaffles: number;
  
  // Mechanical
  designPressure: number;
  shellThickness: number;
  headThickness: number;
  tubesheetThickness: number;
  shellMaterial: string;
  tubeMaterial: string;
  flangeClass: string;
  
  // Vibration
  naturalFrequency: number;
  vortexFrequency: number;
  criticalVelocity: number;
  vibrationSafe: boolean;
  
  // Tube Bundle Visualization Data
  bundleVisualization?: {
    tubePattern: "triangular" | "square" | "rotatedSquare";
    baffleCut: number;
  };
  
  // Units
  unitSystem: 'metric' | 'imperial';
  tempUnit: string;
}

// Unit labels based on system
const getUnits = (system: 'metric' | 'imperial') => ({
  length: system === 'metric' ? 'mm' : 'in',
  lengthLong: system === 'metric' ? 'm' : 'ft',
  area: system === 'metric' ? 'm²' : 'ft²',
  flowRate: system === 'metric' ? 'kg/hr' : 'lb/hr',
  pressure: system === 'metric' ? 'kPa' : 'psi',
  pressureDesign: system === 'metric' ? 'barg' : 'psig',
  velocity: system === 'metric' ? 'm/s' : 'ft/s',
  htc: system === 'metric' ? 'W/m²·K' : 'BTU/hr·ft²·°F',
  duty: system === 'metric' ? 'kW' : 'BTU/hr',
  fouling: system === 'metric' ? 'm²·K/W' : 'hr·ft²·°F/BTU',
  frequency: 'Hz',
});

export function generateExcelDatasheet(data: ExcelDatasheetData): void {
  const units = getUnits(data.unitSystem);
  const wb = XLSX.utils.book_new();
  
  // ========== SHEET 1: SUMMARY (HTRI Style) ==========
  const summaryData = [
    // Header
    ['HEAT EXCHANGER DATASHEET', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Company:', data.companyName, '', 'Date:', data.date, ''],
    ['Project:', data.projectName, '', 'Item No.:', data.itemNumber, ''],
    ['TEMA Type:', data.temaType, '', 'Revision:', data.revisionNo, ''],
    ['', '', '', '', '', ''],
    
    // Performance Summary
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['PERFORMANCE SUMMARY', '', '', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', '', '', ''],
    ['Parameter', 'Shell Side', 'Tube Side', 'Units', '', ''],
    ['─────────────────────────────────────────────────────────────────────────────────'],
    ['Fluid', data.shellFluid, data.tubeFluid, '', '', ''],
    ['Inlet Temperature', data.shellInletTemp, data.tubeInletTemp, data.tempUnit, '', ''],
    ['Outlet Temperature', data.shellOutletTemp, data.tubeOutletTemp, data.tempUnit, '', ''],
    ['Flow Rate', data.shellFlowRate, data.tubeFlowRate, units.flowRate, '', ''],
    ['Pressure Drop', data.shellPressureDrop.toFixed(2), data.tubePressureDrop.toFixed(2), units.pressure, '', ''],
    ['Velocity', data.shellVelocity.toFixed(2), data.tubeVelocity.toFixed(2), units.velocity, '', ''],
    ['Reynolds Number', data.shellReynolds.toFixed(0), data.tubeReynolds.toFixed(0), '', '', ''],
    ['Heat Transfer Coeff.', data.shellHTC.toFixed(0), data.tubeHTC.toFixed(0), units.htc, '', ''],
    ['Fouling Factor', (data.shellFouling * 1000).toFixed(4), (data.tubeFouling * 1000).toFixed(4), '×10⁻³ ' + units.fouling, '', ''],
    ['', '', '', '', '', ''],
    
    // Thermal Design
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['THERMAL DESIGN', '', '', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', '', '', ''],
    ['Heat Duty', data.heatDuty.toFixed(2), units.duty, '', '', ''],
    ['LMTD', data.lmtd.toFixed(2), data.tempUnit, '', '', ''],
    ['Correction Factor (F)', data.correctionFactor.toFixed(4), '', '', '', ''],
    ['Effective MTD', data.effectiveMTD.toFixed(2), data.tempUnit, '', '', ''],
    ['', '', '', '', '', ''],
    ['Overall U (Clean)', data.cleanU.toFixed(2), units.htc, '', '', ''],
    ['Overall U (Fouled)', data.fouledU.toFixed(2), units.htc, '', '', ''],
    ['Overall U (Required)', data.overallU.toFixed(2), units.htc, '', '', ''],
    ['', '', '', '', '', ''],
    ['Surface Area', data.surfaceArea.toFixed(2), data.surfaceAreaUnit, '', '', ''],
    ['Overdesign', (data.overdesign >= 0 ? '+' : '') + data.overdesign.toFixed(1), '%', '', '', ''],
    ['NTU', data.ntu.toFixed(3), '', '', '', ''],
    ['Effectiveness', (data.effectiveness * 100).toFixed(1), '%', '', '', ''],
    ['Cleanliness Factor', data.cleanlinessPercent.toFixed(1), '%', '', '', ''],
    ['', '', '', '', '', ''],
  ];
  
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths
  ws1['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
  
  // ========== SHEET 2: CONSTRUCTION ==========
  const constructionData = [
    ['CONSTRUCTION DETAILS', '', '', '', ''],
    ['', '', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['SHELL & BUNDLE GEOMETRY', '', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', '', ''],
    ['Shell Inside Diameter', data.shellDiameter, units.length, '', ''],
    ['Shell Thickness', data.shellThickness, units.length, '', ''],
    ['Shell Material', data.shellMaterial, '', '', ''],
    ['', '', '', '', ''],
    ['Number of Tubes', data.numberOfTubes, '', '', ''],
    ['Tube Outside Diameter', data.tubeOD, units.length, '', ''],
    ['Tube Wall Thickness', data.tubeWall, units.length, '', ''],
    ['Tube Length', data.tubeLength, units.lengthLong, '', ''],
    ['Tube Pitch', data.tubePitch, units.length, '', ''],
    ['Tube Pattern', data.tubePattern, '', '', ''],
    ['Number of Passes', data.tubePasses, '', '', ''],
    ['Tube Material', data.tubeMaterial, '', '', ''],
    ['', '', '', '', ''],
    ['Baffle Spacing', data.baffleSpacing, units.length, '', ''],
    ['Baffle Cut', data.baffleCut, '%', '', ''],
    ['Number of Baffles', data.numberOfBaffles, '', '', ''],
    ['', '', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['MECHANICAL DESIGN (ASME VIII Div.1)', '', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', '', ''],
    ['Design Pressure', data.designPressure, units.pressureDesign, '', ''],
    ['Shell Thickness (min)', data.shellThickness, units.length, '', ''],
    ['Head Thickness', data.headThickness.toFixed(1), units.length, '', ''],
    ['Tubesheet Thickness', data.tubesheetThickness.toFixed(0), units.length, '', ''],
    ['Flange Rating', data.flangeClass, '', '', ''],
    ['', '', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['VIBRATION ANALYSIS', '', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', '', ''],
    ['Natural Frequency', data.naturalFrequency.toFixed(1), units.frequency, '', ''],
    ['Vortex Shedding Frequency', data.vortexFrequency.toFixed(1), units.frequency, '', ''],
    ['Critical Velocity', data.criticalVelocity.toFixed(2), units.velocity, '', ''],
    ['Vibration Status', data.vibrationSafe ? 'ACCEPTABLE' : 'WARNING - REVIEW REQUIRED', '', '', ''],
    ['', '', '', '', ''],
  ];
  
  const ws2 = XLSX.utils.aoa_to_sheet(constructionData);
  ws2['!cols'] = [{ wch: 28 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Construction');
  
  // ========== SHEET 3: DETAILED CALCULATIONS ==========
  const calcData = [
    ['DETAILED CALCULATIONS', '', '', ''],
    ['', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['HEAT TRANSFER ANALYSIS', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', ''],
    ['Parameter', 'Value', 'Units', 'Notes'],
    ['─────────────────────────────────────────────────────────────────────────────────'],
    ['Tube-side HTC (hi)', data.tubeHTC.toFixed(1), units.htc, 'Dittus-Boelter/Gnielinski'],
    ['Shell-side HTC (ho)', data.shellHTC.toFixed(1), units.htc, 'Bell-Delaware method'],
    ['Clean Overall U (Uc)', data.cleanU.toFixed(1), units.htc, '1/Uc = 1/ho + Rw + 1/hi'],
    ['Fouled Overall U (Uf)', data.fouledU.toFixed(1), units.htc, 'Including fouling resistances'],
    ['Required U (Ur)', data.overallU.toFixed(1), units.htc, 'Q / (A × ΔTLM)'],
    ['', '', '', ''],
    ['LMTD', data.lmtd.toFixed(2), data.tempUnit, 'Log Mean Temperature Diff.'],
    ['F Factor', data.correctionFactor.toFixed(4), '-', 'TEMA correction'],
    ['Effective MTD', data.effectiveMTD.toFixed(2), data.tempUnit, 'LMTD × F'],
    ['', '', '', ''],
    ['Tube-side Reynolds', data.tubeReynolds.toFixed(0), '-', 'Flow regime indicator'],
    ['Shell-side Reynolds', data.shellReynolds.toFixed(0), '-', 'Flow regime indicator'],
    ['', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['PRESSURE DROP ANALYSIS', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', ''],
    ['Tube-side ΔP', data.tubePressureDrop.toFixed(2), units.pressure, 'Fanning equation'],
    ['Shell-side ΔP', data.shellPressureDrop.toFixed(2), units.pressure, 'Bell-Delaware method'],
    ['Tube-side Velocity', data.tubeVelocity.toFixed(2), units.velocity, ''],
    ['Shell-side Velocity', data.shellVelocity.toFixed(2), units.velocity, ''],
    ['', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['PERFORMANCE RATING', '', '', ''],
    ['═══════════════════════════════════════════════════════════════════════════════'],
    ['', '', '', ''],
    ['Heat Duty', data.heatDuty.toFixed(2), units.duty, 'Actual heat transfer'],
    ['Surface Area Required', (data.heatDuty * 1000 / (data.overallU * data.effectiveMTD)).toFixed(2), units.area, 'Q / (U × MTD)'],
    ['Surface Area Available', data.surfaceArea.toFixed(2), units.area, 'π × Do × L × Nt'],
    ['Overdesign', (data.overdesign >= 0 ? '+' : '') + data.overdesign.toFixed(1), '%', '(Available - Required) / Required'],
    ['NTU', data.ntu.toFixed(3), '-', 'UA / Cmin'],
    ['Effectiveness', (data.effectiveness * 100).toFixed(1), '%', 'ε-NTU method'],
    ['', '', '', ''],
  ];
  
  const ws3 = XLSX.utils.aoa_to_sheet(calcData);
  ws3['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Calculations');
  
  // Generate filename and download
  const filename = `${data.itemNumber}_${data.projectName.replace(/\s+/g, '_')}_Datasheet.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Unit conversion utilities
export const unitConversions = {
  // Length
  mmToIn: (mm: number) => mm / 25.4,
  inToMm: (inch: number) => inch * 25.4,
  mToFt: (m: number) => m * 3.28084,
  ftToM: (ft: number) => ft / 3.28084,
  
  // Area
  m2ToFt2: (m2: number) => m2 * 10.7639,
  ft2ToM2: (ft2: number) => ft2 / 10.7639,
  
  // Mass flow
  kghrToLbhr: (kghr: number) => kghr * 2.20462,
  lbhrToKghr: (lbhr: number) => lbhr / 2.20462,
  
  // Pressure
  kPaToPsi: (kPa: number) => kPa * 0.145038,
  psiToKPa: (psi: number) => psi / 0.145038,
  bargToPsig: (barg: number) => barg * 14.5038,
  psigToBarg: (psig: number) => psig / 14.5038,
  
  // Velocity
  msToFts: (ms: number) => ms * 3.28084,
  ftsToMs: (fts: number) => fts / 3.28084,
  
  // Heat transfer coefficient
  wm2kToBtuhrft2f: (wm2k: number) => wm2k * 0.17611,
  btuhrft2fToWm2k: (btu: number) => btu / 0.17611,
  
  // Heat duty
  kwToBtuhr: (kw: number) => kw * 3412.14,
  btuhrToKw: (btuhr: number) => btuhr / 3412.14,
  
  // Fouling factor
  m2kwToHrft2fBtu: (m2kw: number) => m2kw * 5.67826,
  hrft2fBtuToM2kw: (imp: number) => imp / 5.67826,
  
  // Temperature
  cToF: (c: number) => c * 9/5 + 32,
  fToC: (f: number) => (f - 32) * 5/9,
  
  // Density
  kgm3ToLbft3: (kgm3: number) => kgm3 * 0.062428,
  lbft3ToKgm3: (lbft3: number) => lbft3 / 0.062428,
  
  // Specific heat
  kjkgkToBtulbf: (kjkgk: number) => kjkgk * 0.238846,
  btulbfToKjkgk: (btu: number) => btu / 0.238846,
  
  // Viscosity
  cpToLbfts: (cp: number) => cp * 0.000671969,
  lbftsTocp: (lbfts: number) => lbfts / 0.000671969,
  
  // Thermal conductivity
  wmkToBtuhrftf: (wmk: number) => wmk * 0.577789,
  btuhrftfToWmk: (btu: number) => btu / 0.577789,
};

// Convert all values based on unit system
export function convertToImperial(value: number, type: string): number {
  switch (type) {
    case 'length': return unitConversions.mmToIn(value);
    case 'lengthLong': return unitConversions.mToFt(value);
    case 'area': return unitConversions.m2ToFt2(value);
    case 'flowRate': return unitConversions.kghrToLbhr(value);
    case 'pressure': return unitConversions.kPaToPsi(value);
    case 'pressureDesign': return unitConversions.bargToPsig(value);
    case 'velocity': return unitConversions.msToFts(value);
    case 'htc': return unitConversions.wm2kToBtuhrft2f(value);
    case 'duty': return unitConversions.kwToBtuhr(value);
    case 'fouling': return unitConversions.m2kwToHrft2fBtu(value);
    case 'temp': return unitConversions.cToF(value);
    case 'density': return unitConversions.kgm3ToLbft3(value);
    case 'specificHeat': return unitConversions.kjkgkToBtulbf(value);
    case 'viscosity': return unitConversions.cpToLbfts(value);
    case 'thermalCond': return unitConversions.wmkToBtuhrftf(value);
    default: return value;
  }
}

export function convertToMetric(value: number, type: string): number {
  switch (type) {
    case 'length': return unitConversions.inToMm(value);
    case 'lengthLong': return unitConversions.ftToM(value);
    case 'area': return unitConversions.ft2ToM2(value);
    case 'flowRate': return unitConversions.lbhrToKghr(value);
    case 'pressure': return unitConversions.psiToKPa(value);
    case 'pressureDesign': return unitConversions.psigToBarg(value);
    case 'velocity': return unitConversions.ftsToMs(value);
    case 'htc': return unitConversions.btuhrft2fToWm2k(value);
    case 'duty': return unitConversions.btuhrToKw(value);
    case 'fouling': return unitConversions.hrft2fBtuToM2kw(value);
    case 'temp': return unitConversions.fToC(value);
    case 'density': return unitConversions.lbft3ToKgm3(value);
    case 'specificHeat': return unitConversions.btulbfToKjkgk(value);
    case 'viscosity': return unitConversions.lbftsTocp(value);
    case 'thermalCond': return unitConversions.btuhrftfToWmk(value);
    default: return value;
  }
}
