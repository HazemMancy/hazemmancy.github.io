/**
 * Heat Exchanger Sizing — LMTD Method with F-Correction Factor
 *
 * Core equation:
 *   Q = U × A × F × LMTD
 *
 * Log Mean Temperature Difference:
 *   LMTD = (ΔT1 − ΔT2) / ln(ΔT1 / ΔT2)
 *   When |ΔT1 − ΔT2| < ε: LMTD ≈ (ΔT1 + ΔT2) / 2  (L'Hôpital limit)
 *
 * F-Correction (1-2 shell-and-tube, Bowman et al.):
 *   R = (Th,in − Th,out) / (Tc,out − Tc,in)
 *   P = (Tc,out − Tc,in) / (Th,in − Tc,in)
 *   F = f(R, P) — analytical approximation for 1-shell, 2-tube pass
 *
 * Fouling:
 *   1/U_fouled = 1/U_clean + Rf_hot + Rf_cold
 *
 * Area:
 *   A_req = Q / (U_fouled × F × LMTD)
 *   A_design = A_req × (1 + margin%)
 *
 * Reference:
 * - Kern, D.Q. "Process Heat Transfer" (1950)
 * - TEMA Standards (9th/10th Edition)
 * - Perry's Chemical Engineers' Handbook, Section 11
 * - Ludwig, E.E. "Applied Process Design", Vol. 3
 * - Bowman, Mueller & Nagle, Trans. ASME 62 (1940)
 */

export type FlowArrangement = "counter_current" | "co_current" | "1_2_pass" | "custom_F";

export type FMode = "user_entered" | "approximate_correlation";

export type UMode = "clean_plus_fouling" | "fouled_direct" | "estimated";

export type DutyMode = "both_outlets_known" | "one_outlet_unknown" | "duty_given";

export type EngFlag =
  | "ENERGY_BALANCE_MISMATCH"
  | "ENERGY_BALANCE_BLOCKED"
  | "TEMPERATURE_CROSS"
  | "VERY_LOW_F"
  | "SMALL_APPROACH_TEMP"
  | "U_ESTIMATED"
  | "PHASE_CHANGE_NOT_MODELED"
  | "CP_ASSUMED"
  | "LMTD_NEAR_EQUAL"
  | "NEGATIVE_LMTD"
  | "HIGH_AREA"
  | "CO_CURRENT_PENALTY"
  | "F_APPROXIMATE"
  | "MULTI_SHELL_F"
  | "LOW_EFFECTIVENESS"
  | "HIGH_NTU"
  | "HIGH_OVERDESIGN";

export const FLAG_LABELS: Record<EngFlag, string> = {
  ENERGY_BALANCE_MISMATCH: "Energy balance mismatch between hot and cold sides",
  ENERGY_BALANCE_BLOCKED: "Calculation blocked — energy balance exceeds strict tolerance",
  TEMPERATURE_CROSS: "Temperature cross detected — infeasible configuration",
  VERY_LOW_F: "F-factor below 0.75 — inefficient configuration",
  SMALL_APPROACH_TEMP: "Very small approach temperature — large area expected",
  U_ESTIMATED: "U value estimated from service category — high uncertainty",
  PHASE_CHANGE_NOT_MODELED: "Phase change not modeled — LMTD method may not apply",
  CP_ASSUMED: "Cp value assumed or not verified by user",
  LMTD_NEAR_EQUAL: "Near-equal terminal temperature differences — limiting form used",
  NEGATIVE_LMTD: "Negative or zero LMTD — check temperatures",
  HIGH_AREA: "Large heat transfer area — consider multiple shells or plate HX",
  CO_CURRENT_PENALTY: "Co-current arrangement — counter-current would be more efficient",
  F_APPROXIMATE: "F-factor from approximate correlation — verify with TEMA charts",
  MULTI_SHELL_F: "Multi-shell F-factor applied — verify with TEMA charts for N-shell configuration",
  LOW_EFFECTIVENESS: "Low heat exchanger effectiveness — consider design optimization",
  HIGH_NTU: "NTU > 3 — large exchanger, diminishing returns on area increase",
  HIGH_OVERDESIGN: "Overdesign exceeds 30% — verify if intentional",
};

export const FLAG_SEVERITY: Record<EngFlag, "error" | "warning" | "info"> = {
  ENERGY_BALANCE_MISMATCH: "warning",
  ENERGY_BALANCE_BLOCKED: "error",
  TEMPERATURE_CROSS: "error",
  VERY_LOW_F: "warning",
  SMALL_APPROACH_TEMP: "warning",
  U_ESTIMATED: "warning",
  PHASE_CHANGE_NOT_MODELED: "warning",
  CP_ASSUMED: "info",
  LMTD_NEAR_EQUAL: "info",
  NEGATIVE_LMTD: "error",
  HIGH_AREA: "warning",
  CO_CURRENT_PENALTY: "info",
  F_APPROXIMATE: "warning",
  MULTI_SHELL_F: "info",
  LOW_EFFECTIVENESS: "info",
  HIGH_NTU: "warning",
  HIGH_OVERDESIGN: "info",
};

export const TEMA_FOULING_FACTORS: Record<string, { rf: number; description: string }> = {
  "Cooling tower water (treated)": { rf: 0.000176, description: "TEMA RGP-T-2.4" },
  "Cooling tower water (untreated)": { rf: 0.000352, description: "TEMA RGP-T-2.4" },
  "Sea water (clean)": { rf: 0.000088, description: "TEMA RGP-T-2.4" },
  "Sea water (brackish)": { rf: 0.000352, description: "TEMA RGP-T-2.4" },
  "River water (clean)": { rf: 0.000176, description: "TEMA RGP-T-2.4" },
  "River water (muddy)": { rf: 0.000528, description: "TEMA RGP-T-2.4" },
  "Boiler feedwater (treated)": { rf: 0.000088, description: "TEMA RGP-T-2.4" },
  "Steam (clean)": { rf: 0.000088, description: "TEMA RGP-T-2.4" },
  "Steam (exhaust, oil-bearing)": { rf: 0.000264, description: "TEMA RGP-T-2.4" },
  "Light hydrocarbons": { rf: 0.000176, description: "TEMA RGP-T-2.4" },
  "Heavy hydrocarbons": { rf: 0.000352, description: "TEMA RGP-T-2.4" },
  "Crude oil (dry, <120°C)": { rf: 0.000352, description: "TEMA RGP-T-2.4" },
  "Crude oil (dry, >120°C)": { rf: 0.000528, description: "TEMA RGP-T-2.4" },
  "Crude oil (salty)": { rf: 0.000528, description: "TEMA RGP-T-2.4" },
  "Gasoline / Naphtha": { rf: 0.000176, description: "TEMA RGP-T-2.4" },
  "Kerosene / Jet fuel": { rf: 0.000176, description: "TEMA RGP-T-2.4" },
  "Diesel / Gas oil": { rf: 0.000352, description: "TEMA RGP-T-2.4" },
  "Heavy fuel oil": { rf: 0.000528, description: "TEMA RGP-T-2.4" },
  "Lean amine (MEA/DEA/MDEA)": { rf: 0.000352, description: "Industry practice" },
  "Rich amine": { rf: 0.000352, description: "Industry practice" },
  "Lean glycol (TEG/MEG)": { rf: 0.000176, description: "Industry practice" },
  "Rich glycol": { rf: 0.000352, description: "Industry practice" },
  "Natural gas (clean)": { rf: 0.000176, description: "Industry practice" },
  "Natural gas (sour)": { rf: 0.000352, description: "Industry practice" },
  "Refrigerant (clean)": { rf: 0.000088, description: "TEMA RGP-T-2.4" },
  "Air (compressed, clean)": { rf: 0.000176, description: "TEMA RGP-T-2.4" },
  "Flue gas": { rf: 0.000528, description: "Industry practice" },
};

export interface HXProject {
  name: string;
  caseId: string;
  engineer: string;
  date: string;
  strictEnergyBalance: boolean;
  allowApproxF: boolean;
  allowEstimatedU: boolean;
  balanceTolerance: number;
  showSteps: boolean;
}

export interface StreamSide {
  name: string;
  mDot: number;
  cp: number;
  tIn: number;
  tOut: number;
  tOutKnown: boolean;
  phaseNote: "single_phase" | "condensing" | "boiling";
}

export interface ExchangerConfig {
  arrangement: FlowArrangement;
  fMode: FMode;
  fValue: number;
  approachTempMin: number;
  shellPasses: number;
  tubePasses: number;
}

export interface UInput {
  mode: UMode;
  uClean: number;
  uFouled: number;
  rfHot: number;
  rfCold: number;
  serviceCategory: string;
  designMargin: number;
}

export interface OperatingCase {
  id: string;
  name: string;
  caseType: "normal" | "minimum" | "maximum" | "custom";
  hotSide: StreamSide;
  coldSide: StreamSide;
  dutyMode: DutyMode;
  dutyKW: number;
}

export interface CalcStep {
  name: string;
  equation: string;
  substitution: string;
  result: string;
}

export interface CalcTrace {
  steps: CalcStep[];
  intermediateValues: Record<string, number>;
  assumptions: string[];
  warnings: string[];
  flags: EngFlag[];
}

export interface CaseResult {
  caseName: string;
  caseType: string;
  hotDutyKW: number;
  coldDutyKW: number;
  dutyKW: number;
  dT1: number;
  dT2: number;
  lmtd: number;
  R: number;
  P: number;
  F: number;
  correctedLMTD: number;
  uClean: number;
  uFouled: number;
  totalFoulingResistance: number;
  cleanlinessFactor: number;
  uaReq: number;
  aReq: number;
  aDesign: number;
  overdesignPct: number;
  approachTemp: number;
  effectiveness: number;
  ntu: number;
  capacityRatio: number;
  hotSide: StreamSide;
  coldSide: StreamSide;
  trace: CalcTrace;
}

export interface TubeGeometryInput {
  tubeOD_mm: number;
  tubeWT_mm: number;
  tubeLength_m: number;
  tubePitch: "triangular" | "square";
  pitchRatio: number;
  tubePasses: number;
  tubeSideDensity: number;
}

export interface TubeGeometryResult {
  tubeID_mm: number;
  singleTubeArea_m2: number;
  numberOfTubes: number;
  tubeSideFlowArea_m2: number;
  tubeSideVelocity_ms: number;
  bundleDiameter_mm: number;
  shellID_mm: number;
  shellClearance_mm: number;
  velocityCheck: "low" | "ok" | "high";
  velocityNote: string;
  steps: CalcStep[];
}

export const STANDARD_TUBE_SIZES: { od_mm: number; bwg: number; wt_mm: number; id_mm: number }[] = [
  { od_mm: 19.05, bwg: 14, wt_mm: 2.11, id_mm: 14.83 },
  { od_mm: 19.05, bwg: 16, wt_mm: 1.65, id_mm: 15.75 },
  { od_mm: 25.4, bwg: 12, wt_mm: 2.77, id_mm: 19.86 },
  { od_mm: 25.4, bwg: 14, wt_mm: 2.11, id_mm: 21.18 },
  { od_mm: 25.4, bwg: 16, wt_mm: 1.65, id_mm: 22.10 },
  { od_mm: 31.75, bwg: 14, wt_mm: 2.11, id_mm: 27.53 },
  { od_mm: 38.1, bwg: 14, wt_mm: 2.11, id_mm: 33.88 },
  { od_mm: 50.8, bwg: 14, wt_mm: 2.11, id_mm: 46.58 },
];

export type TEMAType = "BEM" | "AES" | "AET" | "BEU" | "AEP" | "AKT";

export interface TEMAGuidance {
  recommended: TEMAType;
  alternatives: TEMAType[];
  reasoning: string[];
  tubeSideIsHot: boolean;
  fluidAllocation: {
    tubeSide: string;
    shellSide: string;
    reasons: string[];
  };
}

export const TEMA_TYPES: Record<TEMAType, { name: string; description: string; pros: string[]; cons: string[] }> = {
  BEM: {
    name: "Fixed Tubesheet",
    description: "Bonnet cover, single-pass shell, fixed tubesheet",
    pros: ["Simple & economical", "High heat transfer efficiency", "Compact design"],
    cons: ["Shell-side cleaning difficult", "Limited to low ΔT (thermal expansion)", "Cannot handle high fouling shell-side"],
  },
  AES: {
    name: "Floating Head (split ring)",
    description: "Channel with removable cover, single-pass shell, split-ring floating head",
    pros: ["Allows thermal expansion", "Easy mechanical cleaning both sides", "Suitable for high ΔT"],
    cons: ["Higher cost than fixed tubesheet", "More complex sealing", "Larger footprint"],
  },
  AET: {
    name: "Floating Head (pull-through)",
    description: "Channel with removable cover, single-pass shell, pull-through floating head",
    pros: ["Easiest bundle removal", "Best for heavy fouling", "Full cleaning access"],
    cons: ["Most expensive floating head", "Larger shell required", "Some bypass around floating head flange"],
  },
  BEU: {
    name: "U-Tube",
    description: "Bonnet cover, single-pass shell, U-tube bundle",
    pros: ["Thermal expansion naturally absorbed", "Lower cost than floating head", "Good for high ΔT"],
    cons: ["Tube-side mechanical cleaning difficult", "Cannot replace individual tubes", "Inner tube rows difficult to support"],
  },
  AEP: {
    name: "Outside Packed Floating Head",
    description: "Channel with removable cover, single-pass shell, outside packed floating head",
    pros: ["Allows thermal expansion", "Less costly than AES/AET", "Easy tube-side cleaning"],
    cons: ["Shell-side cleaning limited", "Packing may leak", "Not for hazardous shell-side fluids"],
  },
  AKT: {
    name: "Kettle Reboiler",
    description: "Channel with removable cover, kettle-type shell, pull-through floating head",
    pros: ["Ideal for vaporization/reboiler service", "Large vapor disengaging space", "High heat flux capability"],
    cons: ["Large shell diameter", "High cost", "Shell-side level control required"],
  },
};

const BUNDLE_CONSTANTS: Record<string, Record<number, { K1: number; n1: number }>> = {
  triangular: {
    1: { K1: 0.319, n1: 2.142 },
    2: { K1: 0.249, n1: 2.207 },
    4: { K1: 0.175, n1: 2.285 },
    6: { K1: 0.0743, n1: 2.499 },
    8: { K1: 0.0365, n1: 2.675 },
  },
  square: {
    1: { K1: 0.215, n1: 2.207 },
    2: { K1: 0.156, n1: 2.291 },
    4: { K1: 0.158, n1: 2.263 },
    6: { K1: 0.0402, n1: 2.617 },
    8: { K1: 0.0331, n1: 2.643 },
  },
};

export function computeTubeGeometry(
  aDesign_m2: number,
  tubeSideMassFlow_kgph: number,
  tubeInput: TubeGeometryInput,
): TubeGeometryResult {
  const steps: CalcStep[] = [];

  const tubeID_mm = tubeInput.tubeOD_mm - 2 * tubeInput.tubeWT_mm;
  const tubeID_m = tubeID_mm / 1000;
  const tubeOD_m = tubeInput.tubeOD_mm / 1000;

  const singleTubeArea = Math.PI * tubeOD_m * tubeInput.tubeLength_m;
  steps.push({
    name: "Single tube area",
    equation: "A_tube = π × OD × L",
    substitution: `π × ${tubeOD_m.toFixed(4)} × ${tubeInput.tubeLength_m.toFixed(2)}`,
    result: `${singleTubeArea.toFixed(4)} m²`,
  });

  const nTubes = Math.ceil(aDesign_m2 / singleTubeArea);
  steps.push({
    name: "Number of tubes",
    equation: "N_t = A_design / A_tube (rounded up)",
    substitution: `${aDesign_m2.toFixed(2)} / ${singleTubeArea.toFixed(4)}`,
    result: `${nTubes} tubes`,
  });

  const tubesPerPass = nTubes / tubeInput.tubePasses;
  const flowAreaPerTube = (Math.PI / 4) * tubeID_m * tubeID_m;
  const tubeSideFlowArea = tubesPerPass * flowAreaPerTube;

  steps.push({
    name: "Tube-side flow area",
    equation: "A_flow = (N_t / N_passes) × (π/4) × ID²",
    substitution: `(${nTubes}/${tubeInput.tubePasses}) × (π/4) × ${tubeID_m.toFixed(4)}²`,
    result: `${(tubeSideFlowArea * 1e4).toFixed(2)} cm² (${tubeSideFlowArea.toFixed(6)} m²)`,
  });

  const massFlowKgs = tubeSideMassFlow_kgph / 3600;
  let velocity = 0;
  if (tubeInput.tubeSideDensity > 0 && tubeSideFlowArea > 0) {
    const volFlowM3s = massFlowKgs / tubeInput.tubeSideDensity;
    velocity = volFlowM3s / tubeSideFlowArea;
  }

  steps.push({
    name: "Tube-side velocity",
    equation: "v = ṁ / (ρ × A_flow)",
    substitution: tubeInput.tubeSideDensity > 0
      ? `(${tubeSideMassFlow_kgph.toFixed(0)} / 3600) / (${tubeInput.tubeSideDensity.toFixed(0)} × ${tubeSideFlowArea.toFixed(6)})`
      : "density = 0 — cannot compute velocity",
    result: tubeInput.tubeSideDensity > 0 ? `${velocity.toFixed(2)} m/s` : "N/A (density required)",
  });

  let velocityCheck: "low" | "ok" | "high" = "ok";
  let velocityNote = `${velocity.toFixed(2)} m/s — within typical range`;
  if (tubeInput.tubeSideDensity <= 0) {
    velocityCheck = "low";
    velocityNote = "Density not provided — cannot check velocity";
  } else if (velocity < 1.0) {
    velocityCheck = "low";
    velocityNote = `${velocity.toFixed(2)} m/s — LOW: may cause fouling/sedimentation (min ~1 m/s for water, 1.5 m/s = 5 ft/s recommended)`;
  } else if (velocity > 3.0) {
    velocityCheck = "high";
    velocityNote = `${velocity.toFixed(2)} m/s — HIGH: check erosion limits and pressure drop (typical max ~3 m/s for liquids)`;
  }

  const passes = tubeInput.tubePasses;
  const closestPasses = [1, 2, 4, 6, 8].reduce((prev, curr) =>
    Math.abs(curr - passes) < Math.abs(prev - passes) ? curr : prev
  );
  const constants = BUNDLE_CONSTANTS[tubeInput.tubePitch][closestPasses];
  const K1 = constants.K1;
  const n1 = constants.n1;
  const bundleDiameter = tubeInput.tubeOD_mm * Math.pow(nTubes / K1, 1 / n1);

  steps.push({
    name: "Bundle diameter (Db)",
    equation: `Db = OD × (N_t / K1)^(1/n1) — Coulson & Richardson Vol.6 §12.5 / HEDH; K1=${K1}, n1=${n1} (${tubeInput.tubePitch}, ${closestPasses}-pass)`,
    substitution: `${tubeInput.tubeOD_mm} × (${nTubes} / ${K1})^(1/${n1})`,
    result: `${bundleDiameter.toFixed(0)} mm`,
  });

  // Diametral clearance (total, not per-side) from Kern §11 / TEMA Table C-5
  const clearance = bundleDiameter < 300 ? 12 : bundleDiameter < 600 ? 25 : bundleDiameter < 1000 ? 35 : 45;
  const shellID = bundleDiameter + clearance;

  steps.push({
    name: "Shell ID estimate",
    equation: "D_s = D_b + C_clearance (diametral) — Kern §11 / TEMA Table C-5",
    substitution: `${bundleDiameter.toFixed(0)} + ${clearance} mm (diametral clearance)`,
    result: `${shellID.toFixed(0)} mm`,
  });

  return {
    tubeID_mm,
    singleTubeArea_m2: singleTubeArea,
    numberOfTubes: nTubes,
    tubeSideFlowArea_m2: tubeSideFlowArea,
    tubeSideVelocity_ms: velocity,
    bundleDiameter_mm: bundleDiameter,
    shellID_mm: shellID,
    shellClearance_mm: clearance,
    velocityCheck,
    velocityNote,
    steps,
  };
}

export function generateTEMAGuidance(
  hotSide: StreamSide,
  coldSide: StreamSide,
  tempDiffMax: number,
  config: ExchangerConfig,
): TEMAGuidance {
  const reasons: string[] = [];
  const fluidReasons: string[] = [];
  let tubeSideIsHot = false;
  let recommended: TEMAType = "BEM";
  const alternatives: TEMAType[] = [];

  const maxMetalDeltaT = Math.max(
    tempDiffMax,
    Math.abs(hotSide.tIn - coldSide.tOut),
    Math.abs(hotSide.tOut - coldSide.tIn),
  );

  const isCondensing = hotSide.phaseNote === "condensing" || coldSide.phaseNote === "condensing";
  const isBoiling = hotSide.phaseNote === "boiling" || coldSide.phaseNote === "boiling";

  if (maxMetalDeltaT > 80) {
    recommended = "BEU";
    reasons.push(`Large ΔT across exchanger (${maxMetalDeltaT.toFixed(0)}°C > 80°C) — U-tube or floating head needed for thermal expansion`);
    alternatives.push("AES");
    if (maxMetalDeltaT > 150) {
      recommended = "AES";
      reasons.push(`Very large ΔT (${maxMetalDeltaT.toFixed(0)}°C > 150°C) — floating head preferred for cleaning access and expansion`);
      alternatives.push("BEU", "AET");
    }
  } else {
    recommended = "BEM";
    reasons.push(`Moderate ΔT (${maxMetalDeltaT.toFixed(0)}°C ≤ 80°C) — fixed tubesheet is simplest and most economical`);
    alternatives.push("BEU");
  }

  if (isBoiling) {
    recommended = "AKT";
    reasons.push("Boiling/reboiler service — kettle type provides vapor disengaging space");
    alternatives.length = 0;
    alternatives.push("BEU", "AES");
  }

  let allocated = false;
  if (isCondensing) {
    tubeSideIsHot = hotSide.phaseNote !== "condensing";
    allocated = true;
    fluidReasons.push("Condensing fluid → shell side (easier flow path, larger flow area)");
  }

  if (!allocated) {
    const hotCh = hotSide.mDot * hotSide.cp;
    const coldCc = coldSide.mDot * coldSide.cp;

    if (hotSide.tIn > 200 || hotSide.tOut > 200) {
      tubeSideIsHot = true;
      allocated = true;
      fluidReasons.push("High temperature fluid (>200°C) → tube side (minimizes special metallurgy cost)");
    } else if (hotCh < coldCc) {
      tubeSideIsHot = true;
      fluidReasons.push("Lower heat capacity rate fluid → tube side; higher capacity rate → shell side");
    } else {
      tubeSideIsHot = false;
      fluidReasons.push("Lower heat capacity rate fluid → tube side; higher capacity rate → shell side");
    }
    allocated = true;
  }

  if (!allocated) {
    tubeSideIsHot = false;
    fluidReasons.push("Default allocation: cooling medium on tube side for easier cleaning");
  }

  const tubeSideName = tubeSideIsHot ? (hotSide.name || "Hot fluid") : (coldSide.name || "Cold fluid");
  const shellSideName = tubeSideIsHot ? (coldSide.name || "Cold fluid") : (hotSide.name || "Hot fluid");

  return {
    recommended,
    alternatives: alternatives.filter(a => a !== recommended),
    reasoning: reasons,
    tubeSideIsHot,
    fluidAllocation: {
      tubeSide: tubeSideName,
      shellSide: shellSideName,
      reasons: fluidReasons,
    },
  };
}

export interface GeometryCheck {
  aSelected: number;
  qAchieved: number;
  excessArea: number;
}

export interface HXFullResult {
  cases: CaseResult[];
  governingCase: CaseResult | null;
  geometry: GeometryCheck | null;
  config: ExchangerConfig;
  uInput: UInput;
  project: HXProject;
  globalFlags: EngFlag[];
  globalWarnings: string[];
  recommendations: string[];
  disclaimer: string;
}

export const TYPICAL_U_VALUES: Record<string, { low: number; high: number; typical: number }> = {
  "Gas-Gas": { low: 10, high: 50, typical: 25 },
  "Gas-Liquid": { low: 20, high: 300, typical: 100 },
  "Liquid-Liquid (low visc.)": { low: 150, high: 1200, typical: 600 },
  "Liquid-Liquid (high visc.)": { low: 50, high: 400, typical: 200 },
  "Condensing Steam-Water": { low: 1000, high: 4000, typical: 2500 },
  "Condensing HC Vapor-Water": { low: 300, high: 1000, typical: 600 },
  "Condensing HC Vapor-Oil": { low: 50, high: 300, typical: 150 },
  "Boiling Water-Steam": { low: 1500, high: 5000, typical: 3000 },
  "Reboiler (HC)": { low: 200, high: 1000, typical: 500 },
  "Air Cooler (Fin-Fan)": { low: 15, high: 80, typical: 40 },
};

const LMTD_EPSILON = 0.01;
const ENERGY_BALANCE_DEFAULT_TOL = 5;

function computeLMTD(dT1: number, dT2: number, trace: CalcTrace): number {
  if (dT1 <= 0 || dT2 <= 0) {
    if (dT1 < 0 || dT2 < 0) {
      trace.flags.push("NEGATIVE_LMTD");
    }
    trace.flags.push("TEMPERATURE_CROSS");
    throw new Error("Temperature cross — ΔT1 or ΔT2 ≤ 0. Check terminal temperatures for selected flow arrangement.");
  }

  if (Math.abs(dT1 - dT2) < LMTD_EPSILON) {
    trace.flags.push("LMTD_NEAR_EQUAL");
    trace.assumptions.push("ΔT1 ≈ ΔT2 — used arithmetic mean (L'Hôpital limit)");
    const lmtd = (dT1 + dT2) / 2;
    trace.steps.push({
      name: "LMTD (limiting form)",
      equation: "LMTD ≈ (ΔT1 + ΔT2) / 2",
      substitution: `(${dT1.toFixed(2)} + ${dT2.toFixed(2)}) / 2`,
      result: `${lmtd.toFixed(4)} °C`,
    });
    return lmtd;
  }

  const lmtd = (dT1 - dT2) / Math.log(dT1 / dT2);
  trace.steps.push({
    name: "LMTD",
    equation: "LMTD = (ΔT1 − ΔT2) / ln(ΔT1 / ΔT2)",
    substitution: `(${dT1.toFixed(2)} − ${dT2.toFixed(2)}) / ln(${dT1.toFixed(2)} / ${dT2.toFixed(2)})`,
    result: `${lmtd.toFixed(4)} °C`,
  });
  return lmtd;
}

function correctionFactor1_2(R: number, P: number): number {
  if (P <= 0 || P >= 1) return 0.5;
  if (R <= 0) return 0.5;

  if (Math.abs(R - 1) < 1e-6) {
    const sqrt2 = Math.sqrt(2);
    const innerDen = 2 - P * (2 + sqrt2);
    if (innerDen <= 0) return 0.5;
    const innerNum = 2 - P * (2 - sqrt2);
    const ratio = innerNum / innerDen;
    if (ratio <= 0) return 0.5;
    const logRatio = Math.log(ratio);
    if (Math.abs(logRatio) < 1e-10) return 1.0;
    const F = (P * sqrt2) / ((1 - P) * logRatio);
    if (!isFinite(F)) return 0.5;
    return Math.min(Math.max(F, 0.3), 1.0);
  }

  const sqrtR2p1 = Math.sqrt(R * R + 1);
  const S = sqrtR2p1 / (R - 1);

  const wDen = 1 - P * R;
  if (wDen <= 0) return 0.5;
  const W = (1 - P) / wDen;
  if (W <= 0 || !isFinite(W)) return 0.5;
  const num = S * Math.log(W);

  const A = (2 / P - 1 - R + sqrtR2p1);
  const B = (2 / P - 1 - R - sqrtR2p1);
  if (B <= 0 || A / B <= 0) return 0.5;
  const den = Math.log(A / B);
  if (Math.abs(den) < 1e-10) return 1.0;
  const F = num / den;
  if (!isFinite(F)) return 0.5;
  return Math.min(Math.max(F, 0.3), 1.0);
}

function correctionFactorNShell(R: number, P: number, N: number): number {
  if (N <= 1) return correctionFactor1_2(R, P);
  if (P <= 0 || P >= 1) return 0.5;
  const RP = R * P;
  if (RP >= 1 || P >= 1) return 0.5;
  const denom = 1 - RP;
  if (Math.abs(denom) < 1e-12) return 0.5;
  const ratio = ((1 - RP) / (1 - P));
  if (ratio <= 0) return 0.5;
  const ratioN = Math.pow(ratio, 1 / N);
  const P1 = (ratioN - 1) / (ratioN - R);
  if (!isFinite(P1) || P1 <= 0 || P1 >= 1) return 0.5;
  return correctionFactor1_2(R, P1);
}

function computeEffectivenessNTU(
  Ch: number,
  Cc: number,
  dutyKW: number,
  tHotIn: number,
  tColdIn: number,
  trace: CalcTrace,
): { effectiveness: number; ntu: number; capacityRatio: number } {
  const Cmin = Math.min(Ch, Cc);
  const Cmax = Math.max(Ch, Cc);
  const Qmax = Cmin * (tHotIn - tColdIn);
  const epsilon = Qmax > 0 ? dutyKW / Qmax : 0;
  const Cr = Cmax > 0 ? Cmin / Cmax : 0;

  let ntu = 0;
  if (epsilon > 0 && epsilon < 1) {
    if (Math.abs(Cr) < 1e-6) {
      ntu = -Math.log(1 - epsilon);
    } else if (Math.abs(Cr - 1) < 1e-6) {
      ntu = epsilon / (1 - epsilon);
    } else {
      const arg = (1 - epsilon * Cr) / (1 - epsilon);
      if (arg > 0) {
        ntu = (1 / (Cr - 1)) * Math.log(arg);
        ntu = Math.abs(ntu);
      }
    }
  }

  trace.steps.push({
    name: "Effectiveness (ε)",
    equation: "ε = Q / Q_max = Q / (C_min × (Th,in − Tc,in))",
    substitution: `${dutyKW.toFixed(2)} / (${Cmin.toFixed(4)} × ${(tHotIn - tColdIn).toFixed(2)})`,
    result: `${(epsilon * 100).toFixed(1)}%`,
  });
  trace.steps.push({
    name: "NTU",
    equation: "NTU = UA / C_min (back-calc. from ε on counter-current basis — informational; Kays & London §2)",
    substitution: `C_r = ${Cr.toFixed(4)}, ε = ${epsilon.toFixed(4)}`,
    result: `${ntu.toFixed(3)}`,
  });

  trace.intermediateValues["effectiveness"] = epsilon;
  trace.intermediateValues["NTU"] = ntu;
  trace.intermediateValues["C_ratio"] = Cr;

  return { effectiveness: epsilon, ntu, capacityRatio: Cr };
}

function computeFactor(
  config: ExchangerConfig,
  R: number,
  P: number,
  trace: CalcTrace,
): number {
  let F = 1.0;

  if (config.arrangement === "counter_current") {
    F = 1.0;
    trace.steps.push({
      name: "F-factor",
      equation: "F = 1.0 (counter-current)",
      substitution: "Pure counter-current flow",
      result: "1.0000",
    });
  } else if (config.arrangement === "co_current") {
    F = 1.0;
    trace.flags.push("CO_CURRENT_PENALTY");
    trace.warnings.push("Co-current arrangement has thermodynamic penalty vs counter-current — consider switching");
    trace.steps.push({
      name: "F-factor",
      equation: "F = 1.0 (co-current, LMTD already computed for parallel flow)",
      substitution: "Co-current pairing used for LMTD",
      result: "1.0000",
    });
  } else if (config.arrangement === "custom_F") {
    F = config.fValue;
    trace.assumptions.push(`User-entered F = ${F.toFixed(4)}`);
    trace.steps.push({
      name: "F-factor",
      equation: "F = user-entered value",
      substitution: `F = ${F.toFixed(4)}`,
      result: `${F.toFixed(4)}`,
    });
  } else if (config.arrangement === "1_2_pass") {
    if (config.fMode === "user_entered") {
      F = config.fValue;
      trace.assumptions.push(`User-entered F = ${F.toFixed(4)} for ${config.shellPasses}-${config.tubePasses} S&T`);
      trace.steps.push({
        name: "F-factor",
        equation: `F = user-entered (${config.shellPasses}-${config.tubePasses} shell-and-tube)`,
        substitution: `F = ${F.toFixed(4)}`,
        result: `${F.toFixed(4)}`,
      });
    } else {
      if (config.shellPasses > 1) {
        F = correctionFactorNShell(R, P, config.shellPasses);
        trace.flags.push("MULTI_SHELL_F");
        trace.flags.push("F_APPROXIMATE");
        trace.warnings.push(`F-factor for ${config.shellPasses} shells in series from analytical correlation — verify with TEMA charts`);
        trace.steps.push({
          name: `F-factor (${config.shellPasses}-shell approximate)`,
          equation: `F = f(R, P, N=${config.shellPasses}) — multi-shell P₁ transformation + Bowman correlation`,
          substitution: `R = ${R.toFixed(4)}, P = ${P.toFixed(4)}, N = ${config.shellPasses}`,
          result: `${F.toFixed(4)}`,
        });
      } else {
        F = correctionFactor1_2(R, P);
        trace.flags.push("F_APPROXIMATE");
        trace.warnings.push("F-factor from approximate correlation — verify with TEMA charts or vendor data");
        trace.steps.push({
          name: "F-factor (approximate)",
          equation: "F = f(R, P) — Bowman et al. correlation for 1-shell, 2-tube pass",
          substitution: `R = ${R.toFixed(4)}, P = ${P.toFixed(4)}`,
          result: `${F.toFixed(4)}`,
        });
      }
    }
  }

  if (F < 0.75) {
    trace.flags.push("VERY_LOW_F");
    trace.warnings.push(`F = ${F.toFixed(3)} < 0.75 — inefficient thermal configuration per TEMA/Bowman. Consider more shells in series, different pass arrangement, or pure counter-current flow.`);
  } else if (F < 0.80) {
    trace.warnings.push(`F = ${F.toFixed(3)} < 0.80 — approaching TEMA minimum. Review pass arrangement; additional shells in series would improve F. Typical minimum for design is F ≥ 0.80.`);
  }

  trace.intermediateValues["F"] = F;
  return F;
}

function computeUFouled(
  uInput: UInput,
  trace: CalcTrace,
): number {
  let uFouled: number;

  if (uInput.mode === "fouled_direct") {
    uFouled = uInput.uFouled;
    trace.assumptions.push(`U_fouled = ${uFouled.toFixed(1)} W/(m²·K) — user-entered directly`);
    trace.steps.push({
      name: "U_fouled",
      equation: "U_fouled = user-entered",
      substitution: `${uFouled.toFixed(1)}`,
      result: `${uFouled.toFixed(1)} W/(m²·K)`,
    });
  } else if (uInput.mode === "estimated") {
    const svc = TYPICAL_U_VALUES[uInput.serviceCategory];
    if (svc) {
      uFouled = svc.typical;
      trace.flags.push("U_ESTIMATED");
      trace.warnings.push(`U estimated from "${uInput.serviceCategory}" service category (${svc.low}–${svc.high} W/(m²·K)) — HIGH UNCERTAINTY`);
    } else {
      uFouled = uInput.uClean > 0 ? uInput.uClean : 500;
      trace.flags.push("U_ESTIMATED");
      trace.warnings.push("U estimated with no service category selected — very high uncertainty");
    }
    trace.steps.push({
      name: "U_fouled (estimated)",
      equation: "U_fouled = typical value from service category",
      substitution: `Service: ${uInput.serviceCategory || "unknown"}`,
      result: `${uFouled.toFixed(1)} W/(m²·K)`,
    });
  } else {
    const rfTotal = uInput.rfHot + uInput.rfCold;
    if (uInput.uClean <= 0) throw new Error("U_clean must be positive");
    uFouled = 1 / (1 / uInput.uClean + rfTotal);
    trace.steps.push({
      name: "Fouling resistance",
      equation: "Rf_total = Rf_hot + Rf_cold",
      substitution: `${uInput.rfHot.toExponential(3)} + ${uInput.rfCold.toExponential(3)}`,
      result: `${rfTotal.toExponential(3)} m²·K/W`,
    });
    trace.steps.push({
      name: "U_fouled",
      equation: "1/U_fouled = 1/U_clean + Rf_total",
      substitution: `1/${uInput.uClean.toFixed(1)} + ${rfTotal.toExponential(3)}`,
      result: `${uFouled.toFixed(1)} W/(m²·K)`,
    });
  }

  trace.intermediateValues["U_fouled"] = uFouled;
  return uFouled;
}

function solveOutletTemps(
  opCase: OperatingCase,
  trace: CalcTrace,
): { hot: StreamSide; cold: StreamSide; dutyKW: number } {
  const hot = { ...opCase.hotSide };
  const cold = { ...opCase.coldSide };
  let dutyKW = 0;

  if (hot.phaseNote !== "single_phase") trace.flags.push("PHASE_CHANGE_NOT_MODELED");
  if (cold.phaseNote !== "single_phase") trace.flags.push("PHASE_CHANGE_NOT_MODELED");

  const Ch = (hot.mDot / 3600) * hot.cp;
  const Cc = (cold.mDot / 3600) * cold.cp;

  trace.steps.push({
    name: "Heat capacity rate (hot)",
    equation: "Ch = (ṁ_h / 3600) × Cp_h  [kg/h ÷ 3600 = kg/s; Cp in kJ/(kg·K) → Ch in kW/K]",
    substitution: `(${hot.mDot.toFixed(1)} / 3600) × ${hot.cp.toFixed(3)}`,
    result: `${Ch.toFixed(4)} kW/K`,
  });
  trace.steps.push({
    name: "Heat capacity rate (cold)",
    equation: "Cc = (ṁ_c / 3600) × Cp_c  [kg/h ÷ 3600 = kg/s; Cp in kJ/(kg·K) → Cc in kW/K]",
    substitution: `(${cold.mDot.toFixed(1)} / 3600) × ${cold.cp.toFixed(3)}`,
    result: `${Cc.toFixed(4)} kW/K`,
  });

  trace.intermediateValues["Ch_kW_K"] = Ch;
  trace.intermediateValues["Cc_kW_K"] = Cc;

  if (opCase.dutyMode === "duty_given") {
    dutyKW = opCase.dutyKW;
    if (dutyKW <= 0) throw new Error("Duty must be positive when duty_given mode is selected");
    if (Ch > 0) {
      hot.tOut = hot.tIn - dutyKW / Ch;
      hot.tOutKnown = true;
    }
    if (Cc > 0) {
      cold.tOut = cold.tIn + dutyKW / Cc;
      cold.tOutKnown = true;
    }
    trace.steps.push({
      name: "Duty (given)",
      equation: "Q = user-specified",
      substitution: `Q = ${dutyKW.toFixed(2)} kW`,
      result: `${dutyKW.toFixed(2)} kW`,
    });
    if (Ch > 0) {
      trace.steps.push({
        name: "Hot outlet (computed)",
        equation: "Th,out = Th,in − Q / Ch",
        substitution: `${hot.tIn.toFixed(2)} − ${dutyKW.toFixed(2)} / ${Ch.toFixed(4)}`,
        result: `${hot.tOut.toFixed(2)} °C`,
      });
    }
    if (Cc > 0) {
      trace.steps.push({
        name: "Cold outlet (computed)",
        equation: "Tc,out = Tc,in + Q / Cc",
        substitution: `${cold.tIn.toFixed(2)} + ${dutyKW.toFixed(2)} / ${Cc.toFixed(4)}`,
        result: `${cold.tOut.toFixed(2)} °C`,
      });
    }
  } else if (opCase.dutyMode === "one_outlet_unknown") {
    if (hot.tOutKnown && !cold.tOutKnown) {
      const Qh = Ch * (hot.tIn - hot.tOut);
      dutyKW = Qh;
      if (Cc > 0) cold.tOut = cold.tIn + dutyKW / Cc;
      cold.tOutKnown = true;
      trace.steps.push({
        name: "Duty (from hot side)",
        equation: "Q = Ch × (Th,in − Th,out)",
        substitution: `${Ch.toFixed(4)} × (${hot.tIn.toFixed(2)} − ${hot.tOut.toFixed(2)})`,
        result: `${dutyKW.toFixed(2)} kW`,
      });
      trace.steps.push({
        name: "Cold outlet (computed)",
        equation: "Tc,out = Tc,in + Q / Cc",
        substitution: `${cold.tIn.toFixed(2)} + ${dutyKW.toFixed(2)} / ${Cc.toFixed(4)}`,
        result: `${cold.tOut.toFixed(2)} °C`,
      });
    } else if (!hot.tOutKnown && cold.tOutKnown) {
      const Qc = Cc * (cold.tOut - cold.tIn);
      dutyKW = Qc;
      if (Ch > 0) hot.tOut = hot.tIn - dutyKW / Ch;
      hot.tOutKnown = true;
      trace.steps.push({
        name: "Duty (from cold side)",
        equation: "Q = Cc × (Tc,out − Tc,in)",
        substitution: `${Cc.toFixed(4)} × (${cold.tOut.toFixed(2)} − ${cold.tIn.toFixed(2)})`,
        result: `${dutyKW.toFixed(2)} kW`,
      });
      trace.steps.push({
        name: "Hot outlet (computed)",
        equation: "Th,out = Th,in − Q / Ch",
        substitution: `${hot.tIn.toFixed(2)} − ${dutyKW.toFixed(2)} / ${Ch.toFixed(4)}`,
        result: `${hot.tOut.toFixed(2)} °C`,
      });
    } else {
      throw new Error("Exactly one outlet must be unknown in 'one_outlet_unknown' mode");
    }
  } else {
    if (!hot.tOutKnown || !cold.tOutKnown) {
      throw new Error("Both outlet temperatures must be specified in 'both_outlets_known' mode");
    }
    const Qh = Ch * (hot.tIn - hot.tOut);
    const Qc = Cc * (cold.tOut - cold.tIn);
    // Conservative basis: use the larger of Qh and Qc to size for both sides
    dutyKW = (Qh > 0 && Qc > 0) ? Math.max(Qh, Qc) : (Qh > 0 ? Qh : Qc);

    trace.steps.push({
      name: "Duty (hot side)",
      equation: "Q_h = Ch × (Th,in − Th,out)",
      substitution: `${Ch.toFixed(4)} × (${hot.tIn.toFixed(2)} − ${hot.tOut.toFixed(2)})`,
      result: `${Qh.toFixed(2)} kW`,
    });
    trace.steps.push({
      name: "Duty (cold side)",
      equation: "Q_c = Cc × (Tc,out − Tc,in)",
      substitution: `${Cc.toFixed(4)} × (${cold.tOut.toFixed(2)} − ${cold.tIn.toFixed(2)})`,
      result: `${Qc.toFixed(2)} kW`,
    });
    trace.steps.push({
      name: "Governing duty (conservative)",
      equation: "Q_des = max(Q_h, Q_c) — largest duty governs area; covers both sides",
      substitution: `max(${Qh.toFixed(2)}, ${Qc.toFixed(2)})`,
      result: `${dutyKW.toFixed(2)} kW`,
    });

    trace.intermediateValues["Q_hot_kW"] = Qh;
    trace.intermediateValues["Q_cold_kW"] = Qc;
  }

  if (dutyKW <= 0) {
    throw new Error("Computed duty is non-positive — check temperatures and flow rates");
  }

  trace.intermediateValues["Q_kW"] = dutyKW;
  return { hot, cold, dutyKW };
}

function checkEnergyBalance(
  hot: StreamSide,
  cold: StreamSide,
  dutyKW: number,
  tolerance: number,
  strict: boolean,
  trace: CalcTrace,
) {
  const Ch = (hot.mDot / 3600) * hot.cp;
  const Cc = (cold.mDot / 3600) * cold.cp;
  const Qh = Ch * (hot.tIn - hot.tOut);
  const Qc = Cc * (cold.tOut - cold.tIn);

  if (Qh > 0 && Qc > 0) {
    const imbalance = Math.abs(Qh - Qc) / Math.max(Qh, Qc) * 100;
    trace.intermediateValues["energy_balance_pct"] = imbalance;
    trace.intermediateValues["Q_hot_kW"] = Qh;
    trace.intermediateValues["Q_cold_kW"] = Qc;

    trace.steps.push({
      name: "Energy balance check",
      equation: "Imbalance = |Q_h − Q_c| / max(Q_h, Q_c) × 100%",
      substitution: `|${Qh.toFixed(2)} − ${Qc.toFixed(2)}| / ${Math.max(Qh, Qc).toFixed(2)} × 100`,
      result: `${imbalance.toFixed(1)}% (tolerance: ${tolerance}%)`,
    });

    if (imbalance > tolerance) {
      trace.flags.push("ENERGY_BALANCE_MISMATCH");
      trace.warnings.push(
        `Energy balance mismatch: Q_hot = ${Qh.toFixed(1)} kW vs Q_cold = ${Qc.toFixed(1)} kW (${imbalance.toFixed(1)}% difference, tolerance ${tolerance}%)`
      );
      if (strict) {
        trace.flags.push("ENERGY_BALANCE_BLOCKED");
        throw new Error(
          `Strict energy balance enforcement: imbalance ${imbalance.toFixed(1)}% exceeds ${tolerance}% tolerance. ` +
          `Q_hot = ${Qh.toFixed(1)} kW, Q_cold = ${Qc.toFixed(1)} kW. ` +
          `Adjust temperatures, flow rates, or Cp values, or increase tolerance.`
        );
      }
    }
  }
}

function computeCaseResult(
  opCase: OperatingCase,
  config: ExchangerConfig,
  uInput: UInput,
  project: HXProject,
): CaseResult {
  const trace: CalcTrace = {
    steps: [],
    intermediateValues: {},
    assumptions: [
      "LMTD method with correction factor for preliminary sizing",
      "Single-phase sensible heat transfer assumed unless noted",
      "Constant properties (Cp, U) over temperature range",
    ],
    warnings: [],
    flags: [],
  };

  const { hot, cold, dutyKW } = solveOutletTemps(opCase, trace);

  checkEnergyBalance(hot, cold, dutyKW, project.balanceTolerance, project.strictEnergyBalance, trace);

  if (hot.tIn <= cold.tIn) {
    throw new Error("Hot inlet must be hotter than cold inlet");
  }

  let dT1: number, dT2: number;
  if (config.arrangement === "co_current") {
    dT1 = hot.tIn - cold.tIn;
    dT2 = hot.tOut - cold.tOut;
    trace.steps.push({
      name: "Terminal ΔTs (co-current)",
      equation: "ΔT1 = Th,in − Tc,in ; ΔT2 = Th,out − Tc,out",
      substitution: `ΔT1 = ${hot.tIn.toFixed(2)} − ${cold.tIn.toFixed(2)} ; ΔT2 = ${hot.tOut.toFixed(2)} − ${cold.tOut.toFixed(2)}`,
      result: `ΔT1 = ${dT1.toFixed(2)} °C, ΔT2 = ${dT2.toFixed(2)} °C`,
    });
  } else {
    dT1 = hot.tIn - cold.tOut;
    dT2 = hot.tOut - cold.tIn;
    trace.steps.push({
      name: "Terminal ΔTs (counter-current convention)",
      equation: "ΔT1 = Th,in − Tc,out ; ΔT2 = Th,out − Tc,in",
      substitution: `ΔT1 = ${hot.tIn.toFixed(2)} − ${cold.tOut.toFixed(2)} ; ΔT2 = ${hot.tOut.toFixed(2)} − ${cold.tIn.toFixed(2)}`,
      result: `ΔT1 = ${dT1.toFixed(2)} °C, ΔT2 = ${dT2.toFixed(2)} °C`,
    });
  }

  trace.intermediateValues["dT1"] = dT1;
  trace.intermediateValues["dT2"] = dT2;

  const lmtd = computeLMTD(dT1, dT2, trace);
  trace.intermediateValues["LMTD"] = lmtd;

  const R = (cold.tOut - cold.tIn) > 0 ? (hot.tIn - hot.tOut) / (cold.tOut - cold.tIn) : 0;
  const P = (hot.tIn - cold.tIn) > 0 ? (cold.tOut - cold.tIn) / (hot.tIn - cold.tIn) : 0;
  trace.intermediateValues["R"] = R;
  trace.intermediateValues["P"] = P;

  trace.steps.push({
    name: "R and P parameters",
    equation: "R = (Th,in − Th,out) / (Tc,out − Tc,in) ; P = (Tc,out − Tc,in) / (Th,in − Tc,in)",
    substitution: `R = (${hot.tIn.toFixed(2)} − ${hot.tOut.toFixed(2)}) / (${cold.tOut.toFixed(2)} − ${cold.tIn.toFixed(2)}) ; P = (${cold.tOut.toFixed(2)} − ${cold.tIn.toFixed(2)}) / (${hot.tIn.toFixed(2)} − ${cold.tIn.toFixed(2)})`,
    result: `R = ${R.toFixed(4)}, P = ${P.toFixed(4)}`,
  });

  const F = computeFactor(config, R, P, trace);
  const correctedLMTD = F * lmtd;

  trace.steps.push({
    name: "Corrected LMTD",
    equation: "ΔTlm,corr = F × LMTD",
    substitution: `${F.toFixed(4)} × ${lmtd.toFixed(4)}`,
    result: `${correctedLMTD.toFixed(4)} °C`,
  });
  trace.intermediateValues["corrected_LMTD"] = correctedLMTD;

  if (correctedLMTD <= 0) {
    throw new Error("Corrected LMTD ≤ 0 — infeasible configuration");
  }

  const uFouled = computeUFouled(uInput, trace);
  const rfTotal = uInput.mode === "clean_plus_fouling" ? uInput.rfHot + uInput.rfCold : 0;

  const dutyW = dutyKW * 1000;
  const uaReq = dutyW / correctedLMTD;
  const aReq = dutyW / (uFouled * correctedLMTD);
  const aDesign = aReq * (1 + uInput.designMargin / 100);

  trace.steps.push({
    name: "Required UA",
    equation: "UA_req = Q / ΔTlm,corr",
    substitution: `${(dutyW).toFixed(0)} / ${correctedLMTD.toFixed(4)}`,
    result: `${uaReq.toFixed(1)} W/K`,
  });
  trace.steps.push({
    name: "Required area",
    equation: "A_req = Q / (U_fouled × ΔTlm,corr)",
    substitution: `${(dutyW).toFixed(0)} / (${uFouled.toFixed(1)} × ${correctedLMTD.toFixed(4)})`,
    result: `${aReq.toFixed(2)} m²`,
  });
  trace.steps.push({
    name: "Design area",
    equation: "A_design = A_req × (1 + margin%)",
    substitution: `${aReq.toFixed(2)} × (1 + ${uInput.designMargin}%)`,
    result: `${aDesign.toFixed(2)} m²`,
  });

  trace.intermediateValues["UA_req"] = uaReq;
  trace.intermediateValues["A_req"] = aReq;
  trace.intermediateValues["A_design"] = aDesign;

  const approachTemp = Math.min(dT1, dT2);
  const approachMin = config.approachTempMin > 0 ? config.approachTempMin : 5;
  if (approachTemp < 3) {
    trace.flags.push("SMALL_APPROACH_TEMP");
    trace.warnings.push(`Approach temperature = ${approachTemp.toFixed(1)}°C < 3°C — extremely tight, impractical for most shell-and-tube exchangers. Consider plate HX or adjust utility conditions.`);
  } else if (approachTemp < approachMin) {
    trace.flags.push("SMALL_APPROACH_TEMP");
    trace.warnings.push(`Approach temperature = ${approachTemp.toFixed(1)}°C < ${approachMin}°C minimum — tight approach results in large area. Per Kern/TEMA, minimum 5°C approach is typical for hydrocarbon service.`);
  } else if (approachTemp < 10) {
    trace.warnings.push(`Approach temperature = ${approachTemp.toFixed(1)}°C — moderate approach. Verify that area and cost are acceptable. Plate HX may be more economical below 10°C approach.`);
  }
  if (aDesign > 5000) {
    trace.flags.push("HIGH_AREA");
    trace.warnings.push(`Very large area (${aDesign.toFixed(0)} m²) — exceeds typical single-shell limits. Multiple shells in series/parallel or plate HX strongly recommended per TEMA.`);
  } else if (aDesign > 1000) {
    trace.flags.push("HIGH_AREA");
    trace.warnings.push(`Large area (${aDesign.toFixed(0)} m²) — consider multiple shells or plate HX for compact design per TEMA RCB-4.`);
  } else if (aDesign > 500) {
    trace.warnings.push(`Area ${aDesign.toFixed(0)} m² — verify single-shell feasibility. Typical TEMA shell diameters accommodate up to ~500 m² per shell.`);
  }

  if (uFouled > 0) {
    if (uInput.mode === "clean_plus_fouling" && rfTotal > 0.001) {
      trace.warnings.push(`High total fouling resistance Rf = ${(rfTotal * 1000).toFixed(2)} × 10⁻³ m²K/W — verify against TEMA Table RGP-T-2.4 for the fluid pair. Excessive fouling allowance increases exchanger cost.`);
    }
    if (uInput.mode === "clean_plus_fouling" && rfTotal < 0.0001 && rfTotal > 0) {
      trace.warnings.push(`Low total fouling resistance Rf = ${(rfTotal * 1000).toFixed(3)} × 10⁻³ m²K/W — may be optimistic for process service. Verify against TEMA Table RGP-T-2.4.`);
    }
  }

  const Ch = (hot.mDot / 3600) * hot.cp;
  const Cc = (cold.mDot / 3600) * cold.cp;

  const uCleanVal = uInput.mode === "clean_plus_fouling" ? uInput.uClean : uFouled;
  const cleanlinessFactor = uCleanVal > 0 ? uFouled / uCleanVal : 1.0;

  if (cleanlinessFactor < 1.0) {
    trace.steps.push({
      name: "Cleanliness factor",
      equation: "CF = U_fouled / U_clean",
      substitution: `${uFouled.toFixed(1)} / ${uCleanVal.toFixed(1)}`,
      result: `${(cleanlinessFactor * 100).toFixed(1)}%`,
    });
  }

  const overdesignPct = aReq > 0 ? ((aDesign - aReq) / aReq) * 100 : 0;

  const { effectiveness, ntu, capacityRatio } = computeEffectivenessNTU(
    Ch, Cc, dutyKW, hot.tIn, cold.tIn, trace,
  );

  if (effectiveness < 0.3 && effectiveness > 0) {
    trace.flags.push("LOW_EFFECTIVENESS");
    trace.warnings.push(`Low effectiveness ε = ${(effectiveness * 100).toFixed(1)}% — heat recovery potential not fully utilized`);
  }
  if (ntu > 3) {
    trace.flags.push("HIGH_NTU");
    trace.warnings.push(`NTU = ${ntu.toFixed(2)} > 3.0 — large exchanger with diminishing returns on additional area`);
  }

  return {
    caseName: opCase.name,
    caseType: opCase.caseType,
    hotDutyKW: Ch * (hot.tIn - hot.tOut),
    coldDutyKW: Cc * (cold.tOut - cold.tIn),
    dutyKW,
    dT1,
    dT2,
    lmtd,
    R,
    P,
    F,
    correctedLMTD,
    uClean: uCleanVal,
    uFouled,
    totalFoulingResistance: rfTotal,
    cleanlinessFactor,
    uaReq,
    aReq,
    aDesign,
    overdesignPct,
    approachTemp,
    effectiveness,
    ntu,
    capacityRatio,
    hotSide: hot,
    coldSide: cold,
    trace,
  };
}

export function calculateHeatExchangerFull(
  project: HXProject,
  cases: OperatingCase[],
  config: ExchangerConfig,
  uInput: UInput,
  geometryArea?: number,
): HXFullResult {
  if (cases.length === 0) throw new Error("At least one operating case is required");

  const caseResults: CaseResult[] = [];
  const globalFlags: EngFlag[] = [];
  const globalWarnings: string[] = [];

  for (const opCase of cases) {
    const cr = computeCaseResult(opCase, config, uInput, project);
    caseResults.push(cr);
    for (const f of cr.trace.flags) {
      if (!globalFlags.includes(f)) globalFlags.push(f);
    }
  }

  const governingCase = caseResults.reduce((max, c) =>
    c.aDesign > (max?.aDesign ?? 0) ? c : max, caseResults[0]);

  let geometry: GeometryCheck | null = null;
  if (geometryArea && geometryArea > 0 && governingCase) {
    const qAchieved = (governingCase.uFouled * geometryArea * governingCase.correctedLMTD) / 1000;
    const excessArea = ((geometryArea - governingCase.aReq) / governingCase.aReq) * 100;
    geometry = { aSelected: geometryArea, qAchieved, excessArea };
  }

  const recommendations: string[] = [];
  if (globalFlags.includes("VERY_LOW_F")) {
    recommendations.push("Consider more shells in series, different pass arrangement, or pure counter-current to improve F");
  }
  if (globalFlags.includes("SMALL_APPROACH_TEMP")) {
    recommendations.push("Tight approach temperature leads to large area — consider adjusting utility temperature or flow rate");
  }
  if (globalFlags.includes("U_ESTIMATED")) {
    recommendations.push("Request vendor or experienced engineer U range, or estimate with detailed methods (e.g., Bell-Delaware)");
  }
  if (globalFlags.includes("CO_CURRENT_PENALTY")) {
    recommendations.push("Switching to counter-current arrangement would reduce required area");
  }
  if (globalFlags.includes("ENERGY_BALANCE_MISMATCH")) {
    recommendations.push("Review stream flow rates, Cp values, and temperatures for energy balance consistency");
  }
  if (globalFlags.includes("HIGH_AREA")) {
    recommendations.push("Consider multiple shells in series/parallel, or plate heat exchanger for compact design");
  }
  if (globalFlags.includes("PHASE_CHANGE_NOT_MODELED")) {
    recommendations.push("Phase change detected — LMTD method may not be adequate; use zone analysis or specialized software");
  }
  if (globalFlags.includes("HIGH_NTU")) {
    recommendations.push("High NTU indicates diminishing returns — evaluate if additional area investment is economically justified");
  }
  if (globalFlags.includes("MULTI_SHELL_F")) {
    recommendations.push("Multi-shell configuration applied — confirm TEMA F-factor chart for the selected N-shell arrangement");
  }

  if (geometry) {
    if (geometry.excessArea < 0) {
      recommendations.push(`Selected area is ${Math.abs(geometry.excessArea).toFixed(0)}% UNDERSIZED vs required — exchanger will not meet duty. Increase tube count, length, or add shells.`);
    } else if (geometry.excessArea > 30) {
      if (!globalFlags.includes("HIGH_OVERDESIGN")) globalFlags.push("HIGH_OVERDESIGN");
      recommendations.push(`Excess area ${geometry.excessArea.toFixed(0)}% exceeds 30% — significantly over-designed. Verify this is intentional (fouling growth, future debottleneck). Optimal overdesign is 10–25% per TEMA/industry practice.`);
    } else if (geometry.excessArea > 20) {
      recommendations.push(`Excess area ${geometry.excessArea.toFixed(0)}% — acceptable if intended for fouling or future capacity. Optimal range is 10–25%.`);
    } else if (geometry.excessArea >= 0 && geometry.excessArea < 10) {
      recommendations.push(`Excess area ${geometry.excessArea.toFixed(0)}% — tight margin. Consider whether fouling growth will reduce effective area below required. Minimum 10% recommended.`);
    }
  }

  recommendations.push("Confirm U-value with detailed methods (Bell-Delaware for shell-side, Dittus-Boelter for tube-side) or vendor thermal design software");
  recommendations.push("Verify pressure drop on both tube and shell sides is within allowable limits (typically 0.5–1.0 bar per side)");
  recommendations.push("Check tube vibration risk for large exchangers with long unsupported spans (TEMA RCB-4.6) — particularly for gas/vapor on shell side");

  return {
    cases: caseResults,
    governingCase,
    geometry,
    config,
    uInput,
    project,
    globalFlags,
    globalWarnings,
    recommendations,
    disclaimer: "This tool provides preliminary heat exchanger sizing using the LMTD method with a correction factor. Final exchanger design/rating must be confirmed using detailed thermal-hydraulic methods and vendor software, including pressure drop, fouling, bypassing, and mechanical constraints.",
  };
}

export function calculateHeatExchanger(input: {
  dutyKW: number;
  hotInletTemp: number;
  hotOutletTemp: number;
  coldInletTemp: number;
  coldOutletTemp: number;
  overallU: number;
  flowArrangement: FlowArrangement;
  foulingFactor: number;
  designMargin: number;
  hotFlowRate: number;
  hotCp: number;
  coldFlowRate: number;
  coldCp: number;
}): {
  lmtd: number;
  correctionFactorF: number;
  correctedLMTD: number;
  dutyKW: number;
  cleanArea: number;
  totalFoulingResistance: number;
  dirtyU: number;
  requiredArea: number;
  designArea: number;
  R: number;
  P: number;
  hotDutyKW: number;
  coldDutyKW: number;
  warnings: string[];
} {
  const arrangement: FlowArrangement = input.flowArrangement === "parallel" as string
    ? "co_current"
    : input.flowArrangement === "2_4_pass" as string
      ? "1_2_pass"
      : input.flowArrangement;

  const project: HXProject = { ...DEFAULT_PROJECT };
  const opCase: OperatingCase = {
    id: "legacy",
    name: "Legacy",
    caseType: "normal",
    hotSide: {
      name: "Hot",
      mDot: input.hotFlowRate,
      cp: input.hotCp,
      tIn: input.hotInletTemp,
      tOut: input.hotOutletTemp,
      tOutKnown: true,
      phaseNote: "single_phase",
    },
    coldSide: {
      name: "Cold",
      mDot: input.coldFlowRate,
      cp: input.coldCp,
      tIn: input.coldInletTemp,
      tOut: input.coldOutletTemp,
      tOutKnown: true,
      phaseNote: "single_phase",
    },
    dutyMode: input.dutyKW > 0 ? "duty_given" : "both_outlets_known",
    dutyKW: input.dutyKW,
  };
  const config: ExchangerConfig = {
    arrangement,
    fMode: "approximate_correlation",
    fValue: 1.0,
    approachTempMin: 5,
    shellPasses: 1,
    tubePasses: arrangement === "1_2_pass" ? 2 : 1,
  };
  const uInputObj: UInput = {
    mode: "clean_plus_fouling",
    uClean: input.overallU,
    uFouled: 0,
    rfHot: input.foulingFactor / 2,
    rfCold: input.foulingFactor / 2,
    serviceCategory: "",
    designMargin: input.designMargin,
  };

  const result = calculateHeatExchangerFull(project, [opCase], config, uInputObj);
  const cr = result.cases[0];

  return {
    lmtd: cr.lmtd,
    correctionFactorF: cr.F,
    correctedLMTD: cr.correctedLMTD,
    dutyKW: cr.dutyKW,
    cleanArea: cr.dutyKW * 1000 / (input.overallU * cr.correctedLMTD),
    totalFoulingResistance: input.foulingFactor,
    dirtyU: cr.uFouled,
    requiredArea: cr.aReq,
    designArea: cr.aDesign,
    R: cr.R,
    P: cr.P,
    hotDutyKW: cr.hotDutyKW,
    coldDutyKW: cr.coldDutyKW,
    warnings: cr.trace.warnings,
  };
}

export const DEFAULT_PROJECT: HXProject = {
  name: "",
  caseId: "",
  engineer: "",
  date: new Date().toISOString().split("T")[0],
  strictEnergyBalance: true,
  allowApproxF: false,
  allowEstimatedU: false,
  balanceTolerance: ENERGY_BALANCE_DEFAULT_TOL,
  showSteps: true,
};

export const DEFAULT_STREAM: StreamSide = {
  name: "",
  mDot: 0,
  cp: 4.18,
  tIn: 0,
  tOut: 0,
  tOutKnown: true,
  phaseNote: "single_phase",
};

export const DEFAULT_CONFIG: ExchangerConfig = {
  arrangement: "counter_current",
  fMode: "user_entered",
  fValue: 1.0,
  approachTempMin: 5,
  shellPasses: 1,
  tubePasses: 1,
};

export const DEFAULT_U_INPUT: UInput = {
  mode: "clean_plus_fouling",
  uClean: 500,
  uFouled: 0,
  rfHot: 0.0002,
  rfCold: 0.0002,
  serviceCategory: "",
  designMargin: 15,
};

export const DEFAULT_CASE: OperatingCase = {
  id: "case_1",
  name: "Normal",
  caseType: "normal",
  hotSide: { ...DEFAULT_STREAM, name: "Hot Side" },
  coldSide: { ...DEFAULT_STREAM, name: "Cold Side" },
  dutyMode: "both_outlets_known",
  dutyKW: 0,
};

export const HX_TEST_CASE_OIL_COOLER: OperatingCase = {
  id: "test_oil",
  name: "Oil Cooler (Normal)",
  caseType: "normal",
  hotSide: {
    name: "Hot Oil",
    mDot: 20000,
    cp: 2.5,
    tIn: 150,
    tOut: 80,
    tOutKnown: true,
    phaseNote: "single_phase",
  },
  coldSide: {
    name: "Cooling Water",
    mDot: 30000,
    cp: 4.18,
    tIn: 25,
    tOut: 53,
    tOutKnown: true,
    phaseNote: "single_phase",
  },
  dutyMode: "both_outlets_known",
  dutyKW: 0,
};

export const HX_TEST_CONFIG: ExchangerConfig = {
  arrangement: "counter_current",
  fMode: "user_entered",
  fValue: 1.0,
  approachTempMin: 5,
  shellPasses: 1,
  tubePasses: 1,
};

export const HX_TEST_U_INPUT: UInput = {
  mode: "clean_plus_fouling",
  uClean: 500,
  uFouled: 0,
  rfHot: 0.0002,
  rfCold: 0.0001,
  serviceCategory: "",
  designMargin: 15,
};
