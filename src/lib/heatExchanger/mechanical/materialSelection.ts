/**
 * Material Selection Module - NACE MR0175 Compliance
 * 
 * @api NACE MR0175/ISO 15156, API 660
 * @safety CRITICAL: Prevents material failures in corrosive service
 * @reference ASME Section II Part D, NACE TM0177
 * @validation Sour service validation mandatory for H₂S > 0.05 psia
 */

import {
  MaterialClass,
  CorrosionEnvironment,
  MaterialSelectionResult,
  FluidPhase
} from '../types';

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface MaterialProperties {
  name: string;
  class: MaterialClass;
  yieldStrength: number;       // MPa
  tensileStrength: number;     // MPa
  allowableStress: number;     // MPa at 20°C
  maxTemp: number;             // K
  minTemp: number;             // K
  corrosionRate: {
    none: number;              // mm/year
    mild: number;
    moderate: number;
    severe: number;
    sour: number;
    acidic: number;
  };
  naceMR0175Compliant: boolean;
  maxHardnessHRC: number;      // For sour service
  pren?: number;               // Pitting Resistance Equivalent Number (for SS/duplex)
}

const MATERIAL_DATABASE: Record<string, MaterialProperties> = {
  'SA-516-70': {
    name: 'Carbon Steel SA-516 Gr. 70',
    class: MaterialClass.CARBON_STEEL,
    yieldStrength: 260,
    tensileStrength: 485,
    allowableStress: 137.9,
    maxTemp: 700,
    minTemp: 243,
    corrosionRate: { none: 0.1, mild: 0.25, moderate: 0.5, severe: 1.0, sour: 0.5, acidic: 2.0 },
    naceMR0175Compliant: true,
    maxHardnessHRC: 22
  },
  'SA-387-11': {
    name: 'Cr-Mo Steel SA-387 Gr. 11',
    class: MaterialClass.LOW_ALLOY,
    yieldStrength: 310,
    tensileStrength: 515,
    allowableStress: 158.6,
    maxTemp: 811,
    minTemp: 243,
    corrosionRate: { none: 0.05, mild: 0.15, moderate: 0.3, severe: 0.6, sour: 0.3, acidic: 1.0 },
    naceMR0175Compliant: true,
    maxHardnessHRC: 22
  },
  'SS-304': {
    name: 'Stainless Steel 304',
    class: MaterialClass.STAINLESS,
    yieldStrength: 205,
    tensileStrength: 515,
    allowableStress: 137.9,
    maxTemp: 1089,
    minTemp: 77,
    corrosionRate: { none: 0.01, mild: 0.05, moderate: 0.1, severe: 0.3, sour: 0.2, acidic: 0.5 },
    naceMR0175Compliant: false, // Not for sour service
    maxHardnessHRC: 22,
    pren: 18
  },
  'SS-316L': {
    name: 'Stainless Steel 316L',
    class: MaterialClass.STAINLESS,
    yieldStrength: 170,
    tensileStrength: 485,
    allowableStress: 115.1,
    maxTemp: 1089,
    minTemp: 77,
    corrosionRate: { none: 0.01, mild: 0.03, moderate: 0.08, severe: 0.2, sour: 0.1, acidic: 0.3 },
    naceMR0175Compliant: true,
    maxHardnessHRC: 22,
    pren: 25
  },
  'DUPLEX-2205': {
    name: 'Duplex 2205 (UNS S32205)',
    class: MaterialClass.DUPLEX,
    yieldStrength: 450,
    tensileStrength: 620,
    allowableStress: 165.5,
    maxTemp: 573,
    minTemp: 233,
    corrosionRate: { none: 0.005, mild: 0.02, moderate: 0.05, severe: 0.1, sour: 0.05, acidic: 0.15 },
    naceMR0175Compliant: true,
    maxHardnessHRC: 28,
    pren: 35
  },
  'INCONEL-625': {
    name: 'Inconel 625 (UNS N06625)',
    class: MaterialClass.NICKEL_ALLOY,
    yieldStrength: 414,
    tensileStrength: 827,
    allowableStress: 165.5,
    maxTemp: 1366,
    minTemp: 77,
    corrosionRate: { none: 0.001, mild: 0.005, moderate: 0.01, severe: 0.03, sour: 0.02, acidic: 0.05 },
    naceMR0175Compliant: true,
    maxHardnessHRC: 35,
    pren: 51
  },
  'TITANIUM-GR2': {
    name: 'Titanium Grade 2',
    class: MaterialClass.TITANIUM,
    yieldStrength: 275,
    tensileStrength: 345,
    allowableStress: 96.5,
    maxTemp: 589,
    minTemp: 77,
    corrosionRate: { none: 0.001, mild: 0.002, moderate: 0.005, severe: 0.01, sour: 0.01, acidic: 0.02 },
    naceMR0175Compliant: true,
    maxHardnessHRC: 25
  },
  'CU-NI-90-10': {
    name: 'Copper-Nickel 90/10',
    class: MaterialClass.COPPER_ALLOY,
    yieldStrength: 105,
    tensileStrength: 275,
    allowableStress: 68.9,
    maxTemp: 505,
    minTemp: 200,
    corrosionRate: { none: 0.02, mild: 0.05, moderate: 0.1, severe: 0.3, sour: 2.0, acidic: 1.0 },
    naceMR0175Compliant: false, // Not for sour service
    maxHardnessHRC: 20
  }
};

// ============================================================================
// SOUR SERVICE VALIDATION (NACE MR0175)
// ============================================================================

/**
 * NACE MR0175 Sour Service Regions
 * Based on H₂S partial pressure and pH
 */
interface SourServiceConditions {
  h2sPartialPressure: number;  // kPa
  co2PartialPressure: number;  // kPa
  totalPressure: number;       // kPa
  temperature: number;         // K
  pH: number;
  chlorideContent: number;     // mg/L
}

/**
 * Determine NACE MR0175 Region
 * @api NACE MR0175/ISO 15156-2
 */
export function determineSourServiceRegion(
  conditions: SourServiceConditions
): { region: 0 | 1 | 2 | 3; description: string } {
  const { h2sPartialPressure, pH, temperature } = conditions;
  
  // H₂S threshold: 0.3 kPa (0.05 psia)
  const H2S_THRESHOLD = 0.345; // kPa
  
  if (h2sPartialPressure < H2S_THRESHOLD) {
    return { 
      region: 0, 
      description: 'Non-sour service (H₂S < 0.05 psia)' 
    };
  }

  // Region determination based on pH and H₂S
  if (pH >= 3.5) {
    if (h2sPartialPressure < 1) {
      return { region: 1, description: 'SSC Region 1 - Mild sour' };
    }
    if (h2sPartialPressure < 10) {
      return { region: 2, description: 'SSC Region 2 - Moderate sour' };
    }
  }
  
  return { region: 3, description: 'SSC Region 3 - Severe sour' };
}

/**
 * Validate material for NACE MR0175 compliance
 * @api NACE MR0175/ISO 15156
 * @safety CRITICAL: Prevents sulfide stress cracking
 */
export function validateNACEMR0175(
  materialId: string,
  conditions: SourServiceConditions
): {
  isCompliant: boolean;
  requirements: string[];
  restrictions: string[];
} {
  const material = MATERIAL_DATABASE[materialId];
  const requirements: string[] = [];
  const restrictions: string[] = [];

  if (!material) {
    return {
      isCompliant: false,
      requirements: ['Unknown material - verify NACE compliance manually'],
      restrictions: ['Cannot assess compliance for unknown material']
    };
  }

  const sourRegion = determineSourServiceRegion(conditions);
  
  // Non-sour service - no special requirements
  if (sourRegion.region === 0) {
    return {
      isCompliant: true,
      requirements: ['Standard material specifications apply'],
      restrictions: []
    };
  }

  // Check basic NACE compliance
  if (!material.naceMR0175Compliant) {
    restrictions.push(`${material.name} is NOT listed in NACE MR0175`);
    return {
      isCompliant: false,
      requirements: ['Select NACE MR0175 listed material'],
      restrictions
    };
  }

  // Hardness requirements
  requirements.push(`Maximum hardness: ${material.maxHardnessHRC} HRC`);
  
  // Temperature restrictions for some materials
  if (material.class === MaterialClass.DUPLEX && conditions.temperature > 505) {
    restrictions.push('Duplex SS limited to 232°C (450°F) in sour service');
  }

  // Region-specific requirements
  if (sourRegion.region >= 2) {
    requirements.push('Post-weld heat treatment (PWHT) required');
    requirements.push('Impact testing per NACE TM0177 required');
  }

  if (sourRegion.region === 3) {
    requirements.push('SSC testing per NACE TM0177 Method A required');
    restrictions.push('Limited weld procedure qualification required');
  }

  // Chloride stress corrosion cracking check for austenitic SS
  if (material.class === MaterialClass.STAINLESS && 
      conditions.chlorideContent > 50 && 
      conditions.temperature > 333) {
    restrictions.push('Risk of chloride SCC - consider duplex or nickel alloy');
  }

  return {
    isCompliant: restrictions.length === 0,
    requirements,
    restrictions
  };
}

// ============================================================================
// MATERIAL SELECTION ENGINE
// ============================================================================

/**
 * Complete material selection analysis
 * 
 * @api NACE MR0175, API 660
 * @safety CRITICAL: Material compatibility validation
 */
export function selectMaterial(
  environment: CorrosionEnvironment,
  conditions: {
    temperature: number;         // K
    pressure: number;            // Pa
    h2sContent?: number;         // mol%
    co2Content?: number;         // mol%
    chlorideContent?: number;    // mg/L
    pH?: number;
    designLife: number;          // years
  }
): MaterialSelectionResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let naceMR0175Requirements: string[] = [];

  // Default sour service conditions
  const sourConditions: SourServiceConditions = {
    h2sPartialPressure: ((conditions.h2sContent ?? 0) / 100) * (conditions.pressure / 1000),
    co2PartialPressure: ((conditions.co2Content ?? 0) / 100) * (conditions.pressure / 1000),
    totalPressure: conditions.pressure / 1000, // kPa
    temperature: conditions.temperature,
    pH: conditions.pH ?? 7,
    chlorideContent: conditions.chlorideContent ?? 0
  };

  // Determine if sour service
  const isSourService = environment === CorrosionEnvironment.SOUR ||
    sourConditions.h2sPartialPressure >= 0.345;

  // Score materials based on environment
  const materialScores: { id: string; score: number; props: MaterialProperties }[] = [];

  for (const [id, props] of Object.entries(MATERIAL_DATABASE)) {
    let score = 100;

    // Temperature check
    if (conditions.temperature > props.maxTemp) {
      score = 0;
      continue;
    }
    if (conditions.temperature < props.minTemp) {
      score = 0;
      continue;
    }

    // NACE compliance for sour service
    if (isSourService && !props.naceMR0175Compliant) {
      score = 0;
      continue;
    }

    // Corrosion rate scoring
    const corrosionRate = props.corrosionRate[environment] ?? props.corrosionRate.moderate;
    const expectedWear = corrosionRate * conditions.designLife;
    
    if (expectedWear > 6) { // More than 6mm loss
      score -= 50;
    } else if (expectedWear > 3) {
      score -= 25;
    }

    // Cost factor (rough approximation)
    const costFactor: Record<MaterialClass, number> = {
      [MaterialClass.CARBON_STEEL]: 1.0,
      [MaterialClass.LOW_ALLOY]: 1.5,
      [MaterialClass.STAINLESS]: 3.0,
      [MaterialClass.DUPLEX]: 5.0,
      [MaterialClass.NICKEL_ALLOY]: 10.0,
      [MaterialClass.TITANIUM]: 15.0,
      [MaterialClass.COPPER_ALLOY]: 4.0
    };

    // Prefer lower cost materials if corrosion is acceptable
    score -= (costFactor[props.class] - 1) * 5;

    // PREN bonus for chloride environments
    if (conditions.chlorideContent && conditions.chlorideContent > 100) {
      if (props.pren) {
        score += (props.pren - 20) * 0.5;
      }
    }

    materialScores.push({ id, score, props });
  }

  // Sort by score
  materialScores.sort((a, b) => b.score - a.score);

  if (materialScores.length === 0 || materialScores[0].score <= 0) {
    errors.push('No suitable material found for specified conditions');
    return {
      recommendedMaterial: MaterialClass.NICKEL_ALLOY,
      alternativeMaterials: [],
      corrosionRate: 0,
      expectedLife: 0,
      isNACECompliant: false,
      naceMR0175Requirements: ['Consult materials engineer'],
      galvanicCompatible: true,
      hydrogenEmbrittlementRisk: isSourService,
      stressCorrosionCrackingRisk: false,
      temperatureLimitations: { min: 0, max: 0 },
      warnings,
      errors,
      isValid: false
    };
  }

  const recommended = materialScores[0];
  const alternatives = materialScores.slice(1, 4).filter(m => m.score > 0);

  // NACE validation for recommended material
  if (isSourService) {
    const naceValidation = validateNACEMR0175(recommended.id, sourConditions);
    naceMR0175Requirements = naceValidation.requirements;
    
    if (!naceValidation.isCompliant) {
      warnings.push(...naceValidation.restrictions);
    }
  }

  // Galvanic compatibility check
  const galvanicCompatible = checkGalvanicCompatibility(
    recommended.props.class,
    alternatives.map(a => a.props.class)
  );

  // Hydrogen embrittlement risk
  const hydrogenEmbrittlementRisk = 
    isSourService && 
    (recommended.props.yieldStrength > 550 || 
     recommended.props.maxHardnessHRC > 28);

  if (hydrogenEmbrittlementRisk) {
    warnings.push('Hydrogen embrittlement risk - verify hardness and PWHT requirements');
  }

  // Stress corrosion cracking risk
  const stressCorrosionCrackingRisk = 
    recommended.props.class === MaterialClass.STAINLESS &&
    (conditions.chlorideContent ?? 0) > 50 &&
    conditions.temperature > 333;

  if (stressCorrosionCrackingRisk) {
    warnings.push('Chloride stress corrosion cracking risk for austenitic SS');
  }

  // Calculate expected corrosion
  const corrosionRate = recommended.props.corrosionRate[environment] ?? 0.1;
  const expectedLife = 3 / corrosionRate; // 3mm corrosion allowance

  return {
    recommendedMaterial: recommended.props.class,
    alternativeMaterials: alternatives.map(a => a.props.class),
    corrosionRate,
    expectedLife: Math.min(expectedLife, conditions.designLife * 2),
    isNACECompliant: isSourService ? recommended.props.naceMR0175Compliant : true,
    naceMR0175Requirements,
    galvanicCompatible,
    hydrogenEmbrittlementRisk,
    stressCorrosionCrackingRisk,
    temperatureLimitations: {
      min: recommended.props.minTemp,
      max: recommended.props.maxTemp
    },
    warnings,
    errors,
    isValid: errors.length === 0
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check galvanic compatibility between materials
 * @reference ASTM G82
 */
function checkGalvanicCompatibility(
  primary: MaterialClass,
  others: MaterialClass[]
): boolean {
  // Galvanic series (approximate position)
  const galvanicPosition: Record<MaterialClass, number> = {
    [MaterialClass.TITANIUM]: 1,        // Most noble
    [MaterialClass.NICKEL_ALLOY]: 2,
    [MaterialClass.STAINLESS]: 3,
    [MaterialClass.DUPLEX]: 3,
    [MaterialClass.COPPER_ALLOY]: 4,
    [MaterialClass.LOW_ALLOY]: 5,
    [MaterialClass.CARBON_STEEL]: 6     // Most active
  };

  const primaryPos = galvanicPosition[primary];
  
  for (const other of others) {
    const otherPos = galvanicPosition[other];
    // More than 2 positions apart = potential galvanic corrosion
    if (Math.abs(primaryPos - otherPos) > 2) {
      return false;
    }
  }

  return true;
}

/**
 * Get material properties by ID
 */
export function getMaterialProperties(materialId: string): MaterialProperties | undefined {
  return MATERIAL_DATABASE[materialId];
}

/**
 * Get all materials suitable for an environment
 */
export function getSuitableMaterials(
  environment: CorrosionEnvironment,
  maxCorrosionRate: number = 0.5
): MaterialProperties[] {
  return Object.values(MATERIAL_DATABASE).filter(
    mat => mat.corrosionRate[environment] <= maxCorrosionRate
  );
}
