/**
 * TEMA Tube Geometry Standards
 * Standard tube dimensions, pitches, and layout calculations per TEMA RCB-4
 */

// Standard tube sizes per TEMA (OD in mm, with common wall thicknesses)
export const standardTubeSizes: { od: number; bwg: number; wall: number; di: number }[] = [
  // 3/4" (19.05mm) OD - Most common
  { od: 19.05, bwg: 12, wall: 2.77, di: 13.51 },
  { od: 19.05, bwg: 14, wall: 2.11, di: 14.83 },
  { od: 19.05, bwg: 16, wall: 1.65, di: 15.75 },
  { od: 19.05, bwg: 18, wall: 1.25, di: 16.55 },
  
  // 1" (25.4mm) OD
  { od: 25.4, bwg: 10, wall: 3.40, di: 18.60 },
  { od: 25.4, bwg: 12, wall: 2.77, di: 19.86 },
  { od: 25.4, bwg: 14, wall: 2.11, di: 21.18 },
  { od: 25.4, bwg: 16, wall: 1.65, di: 22.10 },
  
  // 1.25" (31.75mm) OD
  { od: 31.75, bwg: 10, wall: 3.40, di: 24.95 },
  { od: 31.75, bwg: 12, wall: 2.77, di: 26.21 },
  { od: 31.75, bwg: 14, wall: 2.11, di: 27.53 },
  
  // 1.5" (38.1mm) OD
  { od: 38.1, bwg: 10, wall: 3.40, di: 31.30 },
  { od: 38.1, bwg: 12, wall: 2.77, di: 32.56 },
  { od: 38.1, bwg: 14, wall: 2.11, di: 33.88 },
  
  // Metric sizes
  { od: 20, bwg: 0, wall: 2.0, di: 16.0 },
  { od: 25, bwg: 0, wall: 2.5, di: 20.0 },
  { od: 30, bwg: 0, wall: 2.5, di: 25.0 },
  { od: 38, bwg: 0, wall: 3.0, di: 32.0 },
];

// Standard tube pitches per TEMA
export const standardPitches: { od: number; triangular: number; square: number }[] = [
  { od: 19.05, triangular: 23.81, square: 25.4 },  // 15/16" and 1"
  { od: 19.05, triangular: 25.4, square: 25.4 },   // 1" (common)
  { od: 25.4, triangular: 31.75, square: 31.75 },  // 1.25"
  { od: 25.4, triangular: 33.34, square: 34.93 },  // Alternate
  { od: 31.75, triangular: 39.69, square: 41.28 },
  { od: 38.1, triangular: 47.63, square: 50.8 },
];

// Standard shell sizes per TEMA (ID in mm)
export const standardShellSizes = [
  205, 257, 307, 337, 387, 438, 489, 540, 591, 635, 
  686, 737, 787, 838, 889, 940, 991, 1067, 1219, 1372, 1524
];

// TEMA tube count tables for 19.05mm OD tubes with 25.4mm triangular/square pitch
export const temaTubeCountTable: Record<number, Record<number, { triangular: number; square: number }>> = {
  205: { 1: { triangular: 32, square: 26 }, 2: { triangular: 30, square: 24 }, 4: { triangular: 24, square: 16 } },
  257: { 1: { triangular: 56, square: 45 }, 2: { triangular: 52, square: 40 }, 4: { triangular: 40, square: 32 } },
  307: { 1: { triangular: 81, square: 64 }, 2: { triangular: 76, square: 60 }, 4: { triangular: 68, square: 52 } },
  337: { 1: { triangular: 106, square: 81 }, 2: { triangular: 98, square: 76 }, 4: { triangular: 90, square: 68 } },
  387: { 1: { triangular: 138, square: 109 }, 2: { triangular: 130, square: 102 }, 4: { triangular: 118, square: 90 } },
  438: { 1: { triangular: 177, square: 142 }, 2: { triangular: 166, square: 130 }, 4: { triangular: 150, square: 118 } },
  489: { 1: { triangular: 224, square: 178 }, 2: { triangular: 212, square: 166 }, 4: { triangular: 196, square: 150 } },
  540: { 1: { triangular: 277, square: 220 }, 2: { triangular: 262, square: 206 }, 4: { triangular: 242, square: 188 } },
  591: { 1: { triangular: 334, square: 265 }, 2: { triangular: 316, square: 250 }, 4: { triangular: 294, square: 228 } },
  635: { 1: { triangular: 394, square: 314 }, 2: { triangular: 374, square: 296 }, 4: { triangular: 346, square: 270 } },
  686: { 1: { triangular: 460, square: 365 }, 2: { triangular: 436, square: 346 }, 4: { triangular: 406, square: 316 } },
  737: { 1: { triangular: 532, square: 422 }, 2: { triangular: 506, square: 400 }, 4: { triangular: 470, square: 366 } },
  787: { 1: { triangular: 608, square: 481 }, 2: { triangular: 578, square: 456 }, 4: { triangular: 538, square: 420 } },
  838: { 1: { triangular: 692, square: 549 }, 2: { triangular: 658, square: 520 }, 4: { triangular: 614, square: 478 } },
  889: { 1: { triangular: 774, square: 613 }, 2: { triangular: 738, square: 584 }, 4: { triangular: 688, square: 536 } },
  940: { 1: { triangular: 866, square: 685 }, 2: { triangular: 826, square: 654 }, 4: { triangular: 770, square: 600 } },
  991: { 1: { triangular: 962, square: 762 }, 2: { triangular: 916, square: 724 }, 4: { triangular: 856, square: 666 } },
  1067: { 1: { triangular: 1126, square: 889 }, 2: { triangular: 1072, square: 848 }, 4: { triangular: 1002, square: 778 } },
  1219: { 1: { triangular: 1500, square: 1182 }, 2: { triangular: 1428, square: 1128 }, 4: { triangular: 1336, square: 1040 } },
  1372: { 1: { triangular: 1920, square: 1514 }, 2: { triangular: 1830, square: 1446 }, 4: { triangular: 1714, square: 1334 } },
  1524: { 1: { triangular: 2394, square: 1889 }, 2: { triangular: 2282, square: 1802 }, 4: { triangular: 2138, square: 1662 } },
};

/**
 * Calculate tube count using Palen's correlation
 * Nt = K1 × (CTP/CL) × (Ds/Pt)^n
 * 
 * K1 and n depend on pitch pattern
 * CTP = tube count calculation constant (0.93 for 1 pass, 0.90 for 2 pass, 0.85 for 4+ pass)
 * CL = tube layout constant (1.0 for square, 0.87 for triangular)
 */
export function calculateTubeCount(
  shellDiameter: number, // mm
  tubeOD: number, // mm
  tubePitch: number, // mm
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number
): { count: number; method: string } {
  // Tube layout constant
  const CL = tubePattern === "triangular" ? 0.87 : 1.0;
  
  // Tube count constant based on passes
  let CTP: number;
  if (tubePasses === 1) CTP = 0.93;
  else if (tubePasses === 2) CTP = 0.90;
  else CTP = 0.85;
  
  // Clearance for shell-bundle (approximate)
  const bundleClearance = shellDiameter > 600 ? 50 : (shellDiameter > 300 ? 30 : 20);
  const bundleDiameter = shellDiameter - bundleClearance;
  
  // Method 1: Area-based calculation
  const shellArea = Math.PI * Math.pow(bundleDiameter / 2, 2);
  
  let tubeArea: number;
  if (tubePattern === "triangular") {
    // Triangular pitch: area per tube = (√3/4) × Pt²
    tubeArea = (Math.sqrt(3) / 4) * Math.pow(tubePitch, 2);
  } else {
    // Square pitch: area per tube = Pt²
    tubeArea = Math.pow(tubePitch, 2);
  }
  
  const Nt_area = Math.floor(CTP * CL * shellArea / tubeArea);
  
  // Method 2: Palen's correlation
  // For triangular: Nt = 0.78 × (Db/Pt)^2
  // For square: Nt = 0.785 × (Db/Pt)^2
  const K = tubePattern === "triangular" ? 0.78 : 0.785;
  const Nt_palen = Math.floor(CTP * K * Math.pow(bundleDiameter / tubePitch, 2));
  
  // Use average of methods and apply pass reduction
  const Nt = Math.round((Nt_area + Nt_palen) / 2);
  
  return { 
    count: Nt, 
    method: "Palen/Area Average" 
  };
}

/**
 * Calculate recommended tube pitch based on TEMA standards
 * Minimum pitch ratios:
 * - Triangular: Pt/Do ≥ 1.25
 * - Square: Pt/Do ≥ 1.25 (1.33 preferred for cleaning)
 */
export function getRecommendedPitch(
  tubeOD: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  cleaningRequired: boolean = false
): { pitch: number; ratio: number } {
  let ratio: number;
  
  if (tubePattern === "triangular") {
    ratio = 1.25;
  } else {
    // Square patterns allow cleaning, prefer wider pitch
    ratio = cleaningRequired ? 1.33 : 1.25;
  }
  
  // Find nearest standard pitch
  const calculatedPitch = tubeOD * ratio;
  
  // Round to nearest 0.1mm
  const pitch = Math.round(calculatedPitch * 10) / 10;
  
  return { pitch, ratio: pitch / tubeOD };
}

/**
 * Calculate bundle diameter for given tube count
 * Using TEMA correlations
 */
export function calculateBundleDiameter(
  numberOfTubes: number,
  tubeOD: number,
  tubePitch: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number
): number {
  // K1 and n1 values from TEMA
  let K1: number, n1: number;
  
  if (tubePattern === "triangular") {
    if (tubePasses === 1) { K1 = 0.319; n1 = 2.142; }
    else if (tubePasses === 2) { K1 = 0.249; n1 = 2.207; }
    else { K1 = 0.175; n1 = 2.285; }
  } else {
    if (tubePasses === 1) { K1 = 0.215; n1 = 2.207; }
    else if (tubePasses === 2) { K1 = 0.156; n1 = 2.291; }
    else { K1 = 0.158; n1 = 2.263; }
  }
  
  // Db = Do × (Nt/K1)^(1/n1)
  const bundleDiameter = tubeOD * Math.pow(numberOfTubes / K1, 1 / n1);
  
  return bundleDiameter;
}

/**
 * Calculate required shell diameter for given tube count
 */
export function calculateShellDiameter(
  numberOfTubes: number,
  tubeOD: number,
  tubePitch: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number,
  shellType: "fixed" | "floating" | "u-tube" = "fixed"
): { shellDiameter: number; bundleDiameter: number; clearance: number } {
  const bundleDiameter = calculateBundleDiameter(numberOfTubes, tubeOD, tubePitch, tubePattern, tubePasses);
  
  // Shell-bundle clearance based on shell type (from TEMA)
  let clearance: number;
  if (shellType === "fixed") {
    clearance = bundleDiameter < 300 ? 10 : (bundleDiameter < 700 ? 20 : 30);
  } else if (shellType === "floating") {
    clearance = bundleDiameter < 300 ? 40 : (bundleDiameter < 700 ? 60 : 80);
  } else {
    // U-tube
    clearance = bundleDiameter < 300 ? 15 : (bundleDiameter < 700 ? 25 : 35);
  }
  
  const shellDiameter = bundleDiameter + clearance;
  
  // Find nearest standard shell size
  const nearestStandard = standardShellSizes.reduce((prev, curr) => 
    Math.abs(curr - shellDiameter) < Math.abs(prev - shellDiameter) ? curr : prev
  );
  
  return { 
    shellDiameter: nearestStandard, 
    bundleDiameter: bundleDiameter,
    clearance: nearestStandard - bundleDiameter
  };
}

/**
 * Get recommended baffle spacing based on TEMA
 * Typical: 0.2 × Ds to 1.0 × Ds
 * Minimum: 50mm or Ds/5, whichever is greater
 */
export function getRecommendedBaffleSpacing(
  shellDiameter: number,
  tubeLength: number,
  service: "liquid" | "gas" | "condensing" | "boiling" = "liquid"
): { min: number; max: number; recommended: number } {
  const min = Math.max(50, shellDiameter / 5);
  const max = shellDiameter;
  
  let factor: number;
  switch (service) {
    case "gas":
      factor = 0.6; // Closer spacing for gases
      break;
    case "condensing":
      factor = 0.5;
      break;
    case "boiling":
      factor = 0.4;
      break;
    default:
      factor = 0.4; // Liquid service
  }
  
  const recommended = Math.min(max, Math.max(min, shellDiameter * factor));
  
  return { min, max, recommended: Math.round(recommended) };
}

/**
 * Calculate number of baffles
 */
export function calculateNumberOfBaffles(tubeLength: number, baffleSpacing: number): number {
  return Math.max(1, Math.floor((tubeLength * 1000) / baffleSpacing) - 1);
}
