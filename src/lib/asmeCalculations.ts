/**
 * ASME Section VIII Division 1 Pressure Vessel Calculations
 * 
 * References:
 * - ASME Boiler and Pressure Vessel Code, Section VIII, Division 1
 * - UG-27: Cylindrical Shells Under Internal Pressure
 * - UG-28: Cylindrical Shells Under External Pressure
 * - UG-32: Formed Heads Under Internal Pressure
 * - UG-100: Hydrostatic Test
 */

export interface MaterialProperties {
  name: string;
  designStress: number;      // S - Allowable stress at design temp (MPa)
  yieldStrength: number;     // Sy - Yield strength (MPa)
  tensileStrength: number;   // Su - Tensile strength (MPa)
  elasticModulus: number;    // E - Elastic modulus (GPa)
  maxTemp: number;           // Maximum design temperature (°C)
  jointEfficiency: number;   // E - Joint efficiency (0.7-1.0)
}

export interface ASMEInput {
  innerDiameter: number;     // mm
  designPressure: number;    // MPa (gauge)
  designTemperature: number; // °C
  corrosionAllowance: number; // mm
  material: string;
  jointEfficiency: number;   // 0.7-1.0 based on radiography
}

export interface ASMEResults {
  // Shell calculations
  shellThickness: number;         // Required thickness (mm)
  shellThicknessWithCA: number;   // With corrosion allowance (mm)
  shellMinThickness: number;      // Minimum per ASME (mm)
  shellRecommended: number;       // Recommended (rounded up) (mm)
  shellMAWP: number;              // Maximum Allowable Working Pressure (MPa)
  
  // Tube calculations
  tubeThickness: number;          // Required tube thickness (mm)
  tubeMinThickness: number;       // Minimum tube thickness (mm)
  
  // Tubesheet calculations
  tubesheetThickness: number;     // Required tubesheet thickness (mm)
  
  // Head calculations (2:1 ellipsoidal)
  headThickness: number;          // Required head thickness (mm)
  headThicknessWithCA: number;    // With corrosion allowance (mm)
  
  // Flange rating
  flangeClass: string;            // ASME B16.5 flange class
  
  // Hydrostatic test
  hydroTestPressure: number;      // Test pressure (MPa)
  
  // Safety factors
  safeFactor: number;             // Design safety factor
  
  // Material info
  allowableStress: number;        // S at design temp (MPa)
}

// Material database per ASME Section II Part D
export const asmeMaterials: Record<string, MaterialProperties> = {
  "sa-516-70": {
    name: "SA-516 Grade 70 (Carbon Steel)",
    designStress: 138,    // At room temp
    yieldStrength: 260,
    tensileStrength: 485,
    elasticModulus: 200,
    maxTemp: 450,
    jointEfficiency: 1.0
  },
  "sa-516-60": {
    name: "SA-516 Grade 60 (Carbon Steel)",
    designStress: 118,
    yieldStrength: 220,
    tensileStrength: 415,
    elasticModulus: 200,
    maxTemp: 450,
    jointEfficiency: 1.0
  },
  "sa-285-c": {
    name: "SA-285 Grade C (Carbon Steel)",
    designStress: 95,
    yieldStrength: 170,
    tensileStrength: 380,
    elasticModulus: 200,
    maxTemp: 400,
    jointEfficiency: 1.0
  },
  "sa-240-304": {
    name: "SA-240 Type 304 (Stainless)",
    designStress: 138,
    yieldStrength: 205,
    tensileStrength: 515,
    elasticModulus: 193,
    maxTemp: 815,
    jointEfficiency: 1.0
  },
  "sa-240-316": {
    name: "SA-240 Type 316 (Stainless)",
    designStress: 138,
    yieldStrength: 205,
    tensileStrength: 515,
    elasticModulus: 193,
    maxTemp: 815,
    jointEfficiency: 1.0
  },
  "sa-240-316l": {
    name: "SA-240 Type 316L (Stainless)",
    designStress: 115,
    yieldStrength: 170,
    tensileStrength: 485,
    elasticModulus: 193,
    maxTemp: 815,
    jointEfficiency: 1.0
  },
  "sa-179": {
    name: "SA-179 (Seamless Tube)",
    designStress: 84,
    yieldStrength: 180,
    tensileStrength: 325,
    elasticModulus: 200,
    maxTemp: 400,
    jointEfficiency: 1.0
  },
  "sa-213-tp304": {
    name: "SA-213 TP304 (Stainless Tube)",
    designStress: 115,
    yieldStrength: 205,
    tensileStrength: 515,
    elasticModulus: 193,
    maxTemp: 650,
    jointEfficiency: 1.0
  },
  "sa-213-tp316": {
    name: "SA-213 TP316 (Stainless Tube)",
    designStress: 115,
    yieldStrength: 205,
    tensileStrength: 515,
    elasticModulus: 193,
    maxTemp: 650,
    jointEfficiency: 1.0
  },
  "sb-171-c70600": {
    name: "SB-171 C70600 (90-10 Cu-Ni)",
    designStress: 55,
    yieldStrength: 105,
    tensileStrength: 275,
    elasticModulus: 115,
    maxTemp: 315,
    jointEfficiency: 1.0
  },
  "sb-265-gr2": {
    name: "SB-265 Grade 2 (Titanium)",
    designStress: 100,
    yieldStrength: 275,
    tensileStrength: 345,
    elasticModulus: 103,
    maxTemp: 315,
    jointEfficiency: 1.0
  }
};

/**
 * Get allowable stress at temperature
 * Simplified: reduces linearly above 200°C
 */
function getAllowableStress(material: MaterialProperties, tempC: number): number {
  if (tempC <= 200) return material.designStress;
  if (tempC >= material.maxTemp) return material.designStress * 0.5;
  
  // Linear interpolation
  const ratio = (tempC - 200) / (material.maxTemp - 200);
  return material.designStress * (1 - 0.5 * ratio);
}

/**
 * Calculate shell thickness per ASME UG-27
 * t = P × R / (S × E - 0.6 × P)
 * 
 * Where:
 * P = Design pressure (MPa)
 * R = Inside radius (mm)
 * S = Allowable stress (MPa)
 * E = Joint efficiency
 */
function calculateShellThickness(
  innerDiameter: number,
  pressure: number,
  allowableStress: number,
  jointEfficiency: number
): number {
  const R = innerDiameter / 2;
  const t = (pressure * R) / (allowableStress * jointEfficiency - 0.6 * pressure);
  return Math.max(t, 0);
}

/**
 * Calculate MAWP per ASME UG-27
 * MAWP = S × E × t / (R + 0.6 × t)
 */
function calculateMAWP(
  innerDiameter: number,
  thickness: number,
  allowableStress: number,
  jointEfficiency: number
): number {
  const R = innerDiameter / 2;
  return (allowableStress * jointEfficiency * thickness) / (R + 0.6 * thickness);
}

/**
 * Calculate 2:1 ellipsoidal head thickness per ASME UG-32
 * t = P × D / (2 × S × E - 0.2 × P)
 */
function calculateHeadThickness(
  innerDiameter: number,
  pressure: number,
  allowableStress: number,
  jointEfficiency: number
): number {
  const t = (pressure * innerDiameter) / (2 * allowableStress * jointEfficiency - 0.2 * pressure);
  return Math.max(t, 0);
}

/**
 * Calculate tube thickness per ASME
 * t = P × D_o / (2 × S × E + 0.8 × P)
 */
function calculateTubeThickness(
  outerDiameter: number,
  pressure: number,
  allowableStress: number
): number {
  const t = (pressure * outerDiameter) / (2 * allowableStress + 0.8 * pressure);
  return Math.max(t, 0);
}

/**
 * Calculate tubesheet thickness (simplified TEMA approach)
 * t = G × √(0.785 × P / (S × η))
 * 
 * Where G = mean gasket diameter, η = ligament efficiency
 */
function calculateTubesheetThickness(
  shellDiameter: number,
  pressure: number,
  allowableStress: number,
  tubePitch: number,
  tubeOD: number
): number {
  const G = shellDiameter * 0.95; // Approximate gasket diameter
  const ligamentEfficiency = (tubePitch - tubeOD) / tubePitch;
  const eta = Math.max(0.3, ligamentEfficiency);
  
  const t = G * Math.sqrt(0.785 * pressure / (allowableStress * eta));
  return Math.max(t, 25); // Minimum 25mm
}

/**
 * Determine ASME B16.5 flange class
 */
function getFlangeClass(pressure: number, tempC: number): string {
  // Pressure in MPa, convert to psi for class lookup
  const psi = pressure * 145.038;
  
  // Simplified class selection (actual depends on material group)
  if (tempC <= 200) {
    if (psi <= 275) return "Class 150";
    if (psi <= 720) return "Class 300";
    if (psi <= 1440) return "Class 600";
    if (psi <= 2160) return "Class 900";
    if (psi <= 3600) return "Class 1500";
    return "Class 2500";
  } else if (tempC <= 400) {
    if (psi <= 200) return "Class 150";
    if (psi <= 500) return "Class 300";
    if (psi <= 1000) return "Class 600";
    if (psi <= 1500) return "Class 900";
    if (psi <= 2500) return "Class 1500";
    return "Class 2500";
  } else {
    if (psi <= 100) return "Class 150";
    if (psi <= 300) return "Class 300";
    if (psi <= 600) return "Class 600";
    if (psi <= 900) return "Class 900";
    if (psi <= 1500) return "Class 1500";
    return "Class 2500";
  }
}

/**
 * Main ASME calculation function
 */
export function calculateASMEThickness(
  shellDiameter: number,      // mm
  tubeOD: number,             // mm
  tubePitch: number,          // mm
  designPressure: number,     // MPa
  designTemperature: number,  // °C
  corrosionAllowance: number, // mm
  materialKey: string,
  jointEfficiency: number
): ASMEResults {
  const material = asmeMaterials[materialKey] || asmeMaterials["sa-516-70"];
  const S = getAllowableStress(material, designTemperature);
  const E = jointEfficiency;

  // Shell thickness per UG-27
  const shellCalc = calculateShellThickness(shellDiameter, designPressure, S, E);
  const shellWithCA = shellCalc + corrosionAllowance;
  const shellMin = Math.max(shellWithCA, 3.0); // ASME minimum
  const shellRecommended = Math.ceil(shellMin / 2) * 2; // Round up to even mm

  // MAWP calculation
  const mawp = calculateMAWP(shellDiameter, shellRecommended - corrosionAllowance, S, E);

  // Head thickness per UG-32
  const headCalc = calculateHeadThickness(shellDiameter, designPressure, S, E);
  const headWithCA = headCalc + corrosionAllowance;

  // Tube thickness (using tube material properties)
  const tubeMaterial = asmeMaterials["sa-179"];
  const tubeCalc = calculateTubeThickness(tubeOD, designPressure, tubeMaterial.designStress);
  const tubeMin = Math.max(tubeCalc + corrosionAllowance, 0.5);

  // Tubesheet thickness
  const tubesheetCalc = calculateTubesheetThickness(
    shellDiameter, designPressure, S, tubePitch, tubeOD
  );

  // Flange class
  const flangeClass = getFlangeClass(designPressure, designTemperature);

  // Hydrostatic test pressure per UG-99
  const hydroTest = Math.min(1.3 * designPressure, 1.3 * mawp);

  // Safety factor
  const safeFactor = S * E / designPressure;

  return {
    shellThickness: Number(shellCalc.toFixed(2)),
    shellThicknessWithCA: Number(shellWithCA.toFixed(2)),
    shellMinThickness: Number(shellMin.toFixed(2)),
    shellRecommended,
    shellMAWP: Number(mawp.toFixed(3)),
    tubeThickness: Number(tubeCalc.toFixed(3)),
    tubeMinThickness: Number(tubeMin.toFixed(2)),
    tubesheetThickness: Number(tubesheetCalc.toFixed(1)),
    headThickness: Number(headCalc.toFixed(2)),
    headThicknessWithCA: Number(headWithCA.toFixed(2)),
    flangeClass,
    hydroTestPressure: Number(hydroTest.toFixed(3)),
    safeFactor: Number(safeFactor.toFixed(2)),
    allowableStress: Number(S.toFixed(1))
  };
}

/**
 * Get material options for select component
 */
export function getMaterialOptions(): { key: string; name: string }[] {
  return Object.entries(asmeMaterials).map(([key, mat]) => ({
    key,
    name: mat.name
  }));
}
