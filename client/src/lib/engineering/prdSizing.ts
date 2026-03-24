/**
 * PRD (Pressure Relief Device) Calculator — Preliminary Screening Tool
 *
 * PURPOSE: API-informed preliminary / screening sizing of pressure relief devices.
 * This module is NOT a rigorous relief system design tool and SHALL NOT be used
 * as the sole basis for final PRD specification, procurement, or code compliance.
 *
 * Code Basis (screening reference only — not full compliance implementation):
 * - API 521 (7th Ed.): Overpressure scenario identification — scenarios are user-supplied, not auto-calculated
 * - API 520 Part I (10th Ed.): PRV sizing equations for gas/vapor, steam, and single-phase liquid
 * - API 520 Part II: Inlet pressure loss and outlet backpressure assessment — approximate fluid properties
 * - API 526 (7th Ed.): Standard orifice designation reference only (effective area, not certified capacity)
 *
 * Limitations:
 * - Two-phase and flashing relief is NOT handled — specialist methodology required
 * - Steam properties (Ksh, density) are user-supplied and not internally validated against steam tables
 * - Complex backpressure and flare network interactions are NOT modelled
 * - Gas/steam sizing equations assume ideal C-coefficient behavior; correction factors are user-supplied
 * - Relief loads (kg/h) are user-entered; rigorous scenario quantification requires process simulation
 */

import { PI, GRAVITY } from "./constants";

// ─── TYPES ──────────────────────────────────────────────────────────────────────

export interface PRDProject {
  name: string;
  client: string;
  location: string;
  caseId: string;
  engineer: string;
  date: string;
  atmosphericPressure: number;
}

export interface PRDEquipment {
  tag: string;
  service: string;
  mawp: number;
  designTemp: number;
  normalOpPressure: number;
  normalOpTemp: number;
  setPressure: number;
  overpressurePercent: number;
  overpressureBasis: "non_fire" | "fire" | "supplemental_fire" | "custom";
}

export type ScenarioType =
  | "blocked_outlet"
  | "control_valve_failure"
  | "cooling_water_failure"
  | "fire_exposure"
  | "tube_rupture"
  | "thermal_expansion"
  | "power_failure"
  | "custom";

export interface PRDScenario {
  id: string;
  type: ScenarioType;
  enabled: boolean;
  description: string;
  relievingRate: number;
  relievingRateUnit: "kg/h" | "m3/h";
  fluidPhase: "gas" | "liquid" | "steam" | "two_phase";
  userProvided: boolean;
  notes: string;
}

export type DeviceType =
  | "conventional"
  | "balanced_bellows"
  | "pilot_operated"
  | "rupture_disk"
  | "combination";

export interface PRDDevice {
  type: DeviceType;
  backpressureConcern: boolean;
  corrosionConcern: boolean;
  pluggingConcern: boolean;
  tightnessRequired: boolean;
  twoPhaseRisk: boolean;
}

export type SizingFluidType = "gas" | "steam" | "liquid";

export interface PRDSizingInput {
  fluidType: SizingFluidType;
  relievingRate: number;
  molecularWeight: number;
  specificHeatRatio: number;
  compressibilityFactor: number;
  relievingTemperature: number;
  liquidDensity: number;
  viscosity: number;
  vaporPressure: number;
  kd: number;
  kb: number;
  kc: number;
  ksh: number;
  relievingPressureAbs: number;
  backPressureAbs: number;
  atmosphericPressure: number;
}

export interface PRDSizingResult {
  requiredArea: number;
  fluidType: SizingFluidType;
  relievingPressure: number;
  /** Actual relieving/sizing temperature (°C) — from the relief sizing case, NOT normal operating temperature */
  relievingTemperature?: number;
  cCoefficient?: number;
  /** Kv — viscosity correction factor (liquid service only) */
  kvFactor?: number;
  /** Kw — liquid overpressure correction factor (liquid service only, per API 520 §5.7.2) */
  kwFactor?: number;
  flowRegime?: string;
  warnings: string[];
}

export interface OrificeSelection {
  designation: string;
  area: number;
  margin: number;
  inletFlange?: string;
  outletFlange?: string;
}

export interface PRDPipingInput {
  pipeDiameter: number;
  pipeLength: number;
  roughness: number;
  fittingsK: number;
  elevationChange: number;
}

export interface PRDPipingResult {
  pressureDrop: number;
  pressureDropPercent: number;
  pass: boolean;
  velocity: number;
  reynoldsNumber: number;
  frictionFactor: number;
  warnings: string[];
}

export interface PRDBackpressureResult {
  superimposed: number;
  builtUp: number;
  total: number;
  totalPercent: number;
  pass: boolean;
  recommendedType: DeviceType;
  warnings: string[];
}

export interface PRDFinalResult {
  governingScenario: string;
  relievingRate: number;
  relievingPressureAbs: number;
  relievingPressureGauge: number;
  relievingTemperature: number;
  requiredArea: number;
  selectedOrifice: OrificeSelection;
  inletCheck: PRDPipingResult | null;
  backpressureCheck: PRDBackpressureResult | null;
  recommendedDevice: DeviceType;
  sizingResult: PRDSizingResult;
  flags: string[];
  actionItems: string[];
  warnings: string[];
}

// ─── API 526 ORIFICE DATA ───────────────────────────────────────────────────────

export const API_526_ORIFICES: { designation: string; area: number; inletFlange: string; outletFlange: string }[] = [
  { designation: "D", area: 71, inletFlange: "1\"", outletFlange: "2\"" },
  { designation: "E", area: 126, inletFlange: "1\"", outletFlange: "2\"" },
  { designation: "F", area: 198, inletFlange: "1.5\"", outletFlange: "2.5\"" },
  { designation: "G", area: 325, inletFlange: "1.5\"", outletFlange: "3\"" },
  { designation: "H", area: 506, inletFlange: "2\"", outletFlange: "3\"" },
  { designation: "J", area: 830, inletFlange: "3\"", outletFlange: "4\"" },
  { designation: "K", area: 1186, inletFlange: "3\"", outletFlange: "4\"" },
  { designation: "L", area: 1841, inletFlange: "4\"", outletFlange: "6\"" },
  { designation: "M", area: 2323, inletFlange: "4\"", outletFlange: "6\"" },
  { designation: "N", area: 2800, inletFlange: "4\"", outletFlange: "6\"" },
  { designation: "P", area: 4116, inletFlange: "6\"", outletFlange: "8\"" },
  { designation: "Q", area: 7126, inletFlange: "6\"", outletFlange: "10\"" },
  { designation: "R", area: 10323, inletFlange: "8\"", outletFlange: "10\"" },
  { designation: "T", area: 16774, inletFlange: "8\"", outletFlange: "12\"" },
];

export function selectAPI526Orifice(requiredArea: number): OrificeSelection {
  for (const orifice of API_526_ORIFICES) {
    if (orifice.area >= requiredArea) {
      return {
        designation: orifice.designation,
        area: orifice.area,
        margin: ((orifice.area - requiredArea) / requiredArea) * 100,
        inletFlange: orifice.inletFlange,
        outletFlange: orifice.outletFlange,
      };
    }
  }
  const last = API_526_ORIFICES[API_526_ORIFICES.length - 1];
  return {
    designation: last.designation + " (multiple required)",
    area: last.area,
    margin: ((last.area - requiredArea) / requiredArea) * 100,
    inletFlange: last.inletFlange,
    outletFlange: last.outletFlange,
  };
}

// ─── RELIEVING PRESSURE ─────────────────────────────────────────────────────────

export function calculateRelievingPressure(
  setPressure: number,
  overpressurePercent: number,
  atmosphericPressure: number
): { abs: number; gauge: number } {
  // API 520 §3.2.7: overpressure % is a percentage of gauge set pressure, not absolute.
  const P1_gauge = setPressure * (1 + overpressurePercent / 100);
  return { abs: P1_gauge + atmosphericPressure, gauge: P1_gauge };
}

// ─── C COEFFICIENT FROM k ───────────────────────────────────────────────────────

export function cFromK(k: number): number {
  return 0.03948 * Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)));
}

// ─── CRITICAL PRESSURE RATIO ────────────────────────────────────────────────────

export function criticalPressureRatio(k: number): number {
  return Math.pow(2 / (k + 1), k / (k - 1));
}

// ─── GAS/VAPOR SIZING (API 520 Part I) ──────────────────────────────────────────

export function sizeGasVapor(input: PRDSizingInput): PRDSizingResult {
  const warnings: string[] = [];
  const { relievingRate, molecularWeight, specificHeatRatio, compressibilityFactor,
    relievingTemperature, kd, kb, kc, relievingPressureAbs, backPressureAbs } = input;

  const T_K = relievingTemperature + 273.15;
  const C = cFromK(specificHeatRatio);

  const Pcrit_ratio = criticalPressureRatio(specificHeatRatio);
  const actualRatio = backPressureAbs / relievingPressureAbs;
  const isCritical = actualRatio <= Pcrit_ratio;

  let A_mm2: number;
  let flowRegime: string;

  // API 520 Eq. 5.21 (SI): P must be in kPa(a); √ argument is M/(Z·T), not T·Z/M
  const P1_kPa = relievingPressureAbs * 100;

  if (isCritical) {
    flowRegime = "Critical (choked)";
    // API 520 Part I, 10th Ed, Eq. 5.21 (SI):
    //   A [mm²] = W [kg/h] / (C × Kd × P1 [kPa(a)] × Kb × Kc × √(M / (Z·T)))
    A_mm2 = relievingRate /
      (C * kd * P1_kPa * kb * kc *
        Math.sqrt(molecularWeight / (T_K * compressibilityFactor)));
  } else {
    flowRegime = "Subcritical";
    const r = backPressureAbs / relievingPressureAbs;
    const k = specificHeatRatio;
    const F2 = Math.sqrt(
      (k / (k - 1)) *
      Math.pow(r, 2 / k) *
      ((1 - Math.pow(r, (k - 1) / k)) / (1 - r))
    );
    // API 520 Part I, 10th Ed, Eq. 5.24 (SI — subcritical):
    //   A [mm²] = W [kg/h] / (F2 × Kd × P1 [kPa(a)] × Kc × √(2M / (Z·T)))
    A_mm2 = relievingRate /
      (F2 * kd * P1_kPa * kc *
        Math.sqrt(2 * molecularWeight / (T_K * compressibilityFactor)));

    if (isNaN(A_mm2) || !isFinite(A_mm2)) {
      A_mm2 = relievingRate /
        (C * kd * P1_kPa * kb * kc *
          Math.sqrt(molecularWeight / (T_K * compressibilityFactor)));
      flowRegime = "Critical (fallback)";
      warnings.push("Subcritical calculation produced invalid result — used critical flow equation as conservative fallback");
    }
  }

  if (A_mm2 <= 0 || isNaN(A_mm2)) throw new Error("Calculated area is non-positive — check inputs");

  if (backPressureAbs / relievingPressureAbs > 0.5 && kb >= 1.0) {
    warnings.push("Back pressure exceeds 50% of relieving pressure — consider balanced bellows or pilot-operated valve");
  }

  if (specificHeatRatio < 1.0 || specificHeatRatio > 2.0) {
    warnings.push("Specific heat ratio k outside typical range (1.0–2.0)");
  }

  if (A_mm2 > API_526_ORIFICES[API_526_ORIFICES.length - 1].area) {
    warnings.push(`Required area ${A_mm2.toFixed(0)} mm² exceeds largest standard orifice (T: ${API_526_ORIFICES[API_526_ORIFICES.length - 1].area} mm²) — multiple PRDs required`);
  }

  warnings.push(
    "API-INFORMED GAS SCREENING: Sizing uses API 520 Part I critical/subcritical flow equations. " +
    "Correction factors (Kd, Kb, Kc) are applied on a screening basis with user-supplied values — not vendor-certified. " +
    "Complex backpressure and flare-network effects are not modelled. " +
    "Two-phase, flashing, or mixed-phase discharge is not handled by this branch and requires specialist methodology. " +
    "Final valve sizing must be confirmed with vendor certified capacity data per API 526."
  );

  return {
    requiredArea: A_mm2,
    fluidType: "gas",
    relievingPressure: relievingPressureAbs,
    relievingTemperature: input.relievingTemperature,
    cCoefficient: C,
    flowRegime,
    warnings,
  };
}

// ─── STEAM SIZING (API 520 Part I) ──────────────────────────────────────────────

export function sizeSteam(input: PRDSizingInput): PRDSizingResult {
  const warnings: string[] = [];
  const { relievingRate, kd, kb, kc, ksh, relievingPressureAbs } = input;

  if (ksh <= 0 || ksh > 1.0) {
    warnings.push(`Superheat correction Ksh=${ksh} — verify against steam tables`);
  }

  let Kn = 1.0;
  const P1_barg = relievingPressureAbs - input.atmosphericPressure;
  if (P1_barg > 103.4) {
    // API 520 Napier correction (Kn) uses P in psia (USC origin — same formula in SI)
    const P1_psia = relievingPressureAbs * 14.5038;
    Kn = (2.7644 * P1_psia - 1000) / (2.7644 * P1_psia);
    warnings.push(`High pressure steam — Napier correction Kn = ${Kn.toFixed(4)} applied`);
  }

  // API 520 Part I, 10th Ed, §5.7.1 (SI) steam constant:
  //   A [mm²] = W [kg/h] × 190.5 / (Kd × P1 [kPa(a)] × Kb × Kc × Ksh × Kn)
  //   Equivalently: A = W / (C_steam × Kd × P1 [bar(a)] × Kb × Kc × Ksh × Kn)
  //   C_steam = 190.5 / (100 kPa/bar × 190.5) = 1/100 … → C_steam for bar = 190.5/100/190.5 × 190.5
  //   From USC→SI conversion: A[mm²] = W[kg/h] / (0.5247 × Kd × P1[bar(a)] × Kb × Kc × Ksh × Kn)
  //   Derivation: 1/STEAM_CONSTANT_bar = (190.5 SI factor) / (bar → kPa × 190.5) = 1/100 → 0.5247 = 100/190.5
  const STEAM_CONSTANT = 0.5247;   // for W[kg/h], P[bar(a)], A[mm²]

  const A_mm2 = relievingRate /
    (STEAM_CONSTANT * kd * relievingPressureAbs * kb * kc * ksh * Kn);

  if (A_mm2 <= 0 || isNaN(A_mm2)) throw new Error("Calculated area is non-positive — check inputs");

  if (A_mm2 > API_526_ORIFICES[API_526_ORIFICES.length - 1].area) {
    warnings.push(`Required area ${A_mm2.toFixed(0)} mm² exceeds largest standard orifice — multiple PRDs required`);
  }

  warnings.push(
    "PRELIMINARY STEAM SIZING ONLY: Steam properties (density, specific enthalpy, superheat correction Ksh) " +
    "must be verified with steam tables or process simulation at the actual relieving pressure and superheat conditions. " +
    "The superheat correction factor Ksh entered here is user-supplied — if incorrect, the area result will be in error. " +
    "This result is a screening estimate only; final steam valve selection requires vendor certified steam capacity data."
  );

  return {
    requiredArea: A_mm2,
    fluidType: "steam",
    relievingPressure: relievingPressureAbs,
    relievingTemperature: input.relievingTemperature,
    flowRegime: "Steam service",
    warnings,
  };
}

// ─── LIQUID SIZING (API 520 Part I) ─────────────────────────────────────────────

export function sizeLiquid(input: PRDSizingInput): PRDSizingResult {
  const warnings: string[] = [];
  const { relievingRate, liquidDensity, viscosity, vaporPressure,
    kd, kc, relievingPressureAbs, backPressureAbs, atmosphericPressure } = input;

  const kw = input.kb;
  const dP = relievingPressureAbs - backPressureAbs;
  if (dP <= 0) throw new Error("Relieving pressure must exceed back pressure");

  const G = liquidDensity / 999;
  const Q_Lmin = relievingRate * 1000 / 60;

  let Kv = 1.0;
  if (viscosity > 2) {
    // Re per API 520 §5.7.2 — constant 1304 for Q[L/min], ΔP[bar], μ[cP]
    // (= 18800 [gpm,psi] × (1/3.785) × (1/3.808) unit conversions)
    const Re_prelim = Q_Lmin * 1304 * G / (viscosity * Math.sqrt(dP / G));
    if (Re_prelim < 100000) {
      Kv = (0.9935 + 2.878 / Math.sqrt(Re_prelim) + 342.75 / (Re_prelim * Re_prelim));
      Kv = Math.min(Kv, 1.0);
      Kv = Math.max(Kv, 0.3);
    }
  }

  if (vaporPressure > 0) {
    const vp_bar = vaporPressure / 100;
    if (vp_bar > relievingPressureAbs * 0.5) {
      warnings.push("Vapor pressure approaches relieving pressure — two-phase / flashing flow suspected. Verify single-phase assumption.");
    }
  }

  // API 520 Part I, 10th Ed, §5.7.2 (SI):
  //   A [mm²] = Q [L/min] × √G / (N₁ × Kd × Kw × Kc × Kv × √ΔP [bar])
  //   N₁ = 0.849  (derived: N₁_m³h = 1/19.63 = 0.05094; × 16.667 [m³/h→L/min] = 0.849)
  const N1_liquid = 0.849;
  const A_mm2 = (Q_Lmin * Math.sqrt(G)) /
    (N1_liquid * kd * kw * kc * Kv * Math.sqrt(dP));

  if (A_mm2 <= 0 || isNaN(A_mm2)) throw new Error("Calculated area is non-positive — check inputs");

  if (viscosity > 100) {
    warnings.push(`High viscosity (${viscosity} cP) — verify viscosity correction factor Kv`);
  }

  if (A_mm2 > API_526_ORIFICES[API_526_ORIFICES.length - 1].area) {
    warnings.push(`Required area ${A_mm2.toFixed(0)} mm² exceeds largest standard orifice — multiple PRDs required`);
  }

  return {
    requiredArea: A_mm2,
    fluidType: "liquid",
    relievingPressure: relievingPressureAbs,
    relievingTemperature: input.relievingTemperature,
    kvFactor: Kv,
    kwFactor: kw,
    flowRegime: "Liquid service",
    warnings,
  };
}

// ─── INPUT VALIDATION ────────────────────────────────────────────────────────────

/**
 * Validates a PRDSizingInput for physical plausibility before solving.
 * Throws a descriptive Error on any invalid condition.
 */
export function validatePRDSizingInput(input: PRDSizingInput): void {
  if (input.relievingRate <= 0)
    throw new Error("Relieving rate must be positive (> 0)");
  if (input.relievingPressureAbs <= 0)
    throw new Error("Relieving pressure (absolute) must be positive (> 0 bar(a))");
  if (input.backPressureAbs < 0)
    throw new Error("Back pressure (absolute) cannot be negative");
  if (input.backPressureAbs >= input.relievingPressureAbs)
    throw new Error("Back pressure must be less than relieving pressure — check pressure basis (abs vs gauge)");
  if (input.atmosphericPressure <= 0)
    throw new Error("Atmospheric pressure must be positive");
  if (input.kd <= 0 || input.kd > 1.0)
    throw new Error(`Discharge coefficient Kd = ${input.kd} is out of range (0 < Kd ≤ 1.0)`);
  if (input.kb <= 0 || input.kb > 1.0)
    throw new Error(`Backpressure/overpressure factor (Kb or Kw) = ${input.kb} is out of range (0 < K ≤ 1.0)`);
  if (input.kc <= 0 || input.kc > 1.0)
    throw new Error(`Combination factor Kc = ${input.kc} is out of range (0 < Kc ≤ 1.0)`);

  if (input.fluidType === "gas") {
    if (input.molecularWeight <= 0)
      throw new Error("Molecular weight must be positive");
    if (input.specificHeatRatio <= 1.0)
      throw new Error(`Specific heat ratio k = ${input.specificHeatRatio} must be > 1.0 for real gases`);
    if (input.specificHeatRatio > 2.0)
      throw new Error(`Specific heat ratio k = ${input.specificHeatRatio} is outside the expected range (1.0–2.0) — verify input`);
    if (input.compressibilityFactor <= 0 || input.compressibilityFactor > 2.0)
      throw new Error(`Compressibility factor Z = ${input.compressibilityFactor} is outside range (0 < Z ≤ 2.0)`);
    const T_K = input.relievingTemperature + 273.15;
    if (T_K <= 0)
      throw new Error("Relieving temperature is below absolute zero (< −273.15 °C)");
  }

  if (input.fluidType === "steam") {
    if (input.ksh <= 0 || input.ksh > 1.0)
      throw new Error(`Superheat correction Ksh = ${input.ksh} is out of range (0 < Ksh ≤ 1.0)`);
  }

  if (input.fluidType === "liquid") {
    if (input.liquidDensity <= 0)
      throw new Error("Liquid density must be positive");
    if (input.viscosity < 0)
      throw new Error("Viscosity must be non-negative");
  }
}

// ─── UNIFIED SIZING DISPATCHER ──────────────────────────────────────────────────

export function sizePRD(input: PRDSizingInput): PRDSizingResult {
  validatePRDSizingInput(input);
  switch (input.fluidType) {
    case "gas": return sizeGasVapor(input);
    case "steam": return sizeSteam(input);
    case "liquid": return sizeLiquid(input);
    default: throw new Error(`Unsupported fluid type: ${input.fluidType}`);
  }
}

// ─── INLET PIPING CHECK (API 520 Part II) ───────────────────────────────────────

function swameeJain(Re: number, relRoughness: number): number {
  if (Re < 2300) return 64 / Re;
  const A = relRoughness / 3.7;
  const B = 5.74 / Math.pow(Re, 0.9);
  return 0.25 / Math.pow(Math.log10(A + B), 2);
}

export function calculateInletPressureDrop(
  piping: PRDPipingInput,
  massFlowRate: number,
  fluidDensity: number,
  viscosity: number,
  setPressure: number,
  allowablePercent: number = 3
): PRDPipingResult {
  const warnings: string[] = [];

  const D_m = piping.pipeDiameter / 1000;
  const A_pipe = PI * D_m * D_m / 4;
  const rho = fluidDensity;
  const mu = viscosity * 1e-3;

  const volFlow = massFlowRate / (rho * 3600);
  const V = volFlow / A_pipe;

  const Re = rho * V * D_m / mu;
  const relRoughness = (piping.roughness / 1000) / D_m;
  const f = swameeJain(Re, relRoughness);

  const L_equiv = piping.pipeLength;
  const K_total = piping.fittingsK;

  const dP_friction = f * (L_equiv / D_m) * 0.5 * rho * V * V;
  const dP_fittings = K_total * 0.5 * rho * V * V;
  const dP_elevation = rho * GRAVITY * piping.elevationChange;
  const dP_total_Pa = dP_friction + dP_fittings + dP_elevation;
  const dP_bar = dP_total_Pa / 1e5;

  const dpPercent = (dP_bar / setPressure) * 100;
  const pass = dpPercent <= allowablePercent;

  if (!pass) {
    warnings.push(`Inlet pressure drop ${dpPercent.toFixed(1)}% exceeds ${allowablePercent}% allowable — risk of valve chatter/instability`);
    warnings.push("Consider larger inlet pipe, shorter run, or fewer fittings");
  }

  if (V > 100) {
    warnings.push(`High inlet velocity ${V.toFixed(1)} m/s — verify pipe sizing`);
  }

  return {
    pressureDrop: dP_bar,
    pressureDropPercent: dpPercent,
    pass,
    velocity: V,
    reynoldsNumber: Re,
    frictionFactor: f,
    warnings,
  };
}

// ─── OUTLET BACKPRESSURE CHECK ──────────────────────────────────────────────────

export function calculateBackpressure(
  outletPiping: PRDPipingInput,
  massFlowRate: number,
  fluidDensity: number,
  viscosity: number,
  superimposedBP: number,
  setPressure: number,
  deviceType: DeviceType
): PRDBackpressureResult {
  const warnings: string[] = [];

  const D_m = outletPiping.pipeDiameter / 1000;
  const A_pipe = PI * D_m * D_m / 4;
  const rho = fluidDensity;
  const mu = viscosity * 1e-3;

  const volFlow = massFlowRate / (rho * 3600);
  const V = volFlow / A_pipe;

  const Re = rho * V * D_m / mu;
  const relRoughness = (outletPiping.roughness / 1000) / D_m;
  const f = swameeJain(Re, relRoughness);

  const dP_friction = f * (outletPiping.pipeLength / D_m) * 0.5 * rho * V * V;
  const dP_fittings = outletPiping.fittingsK * 0.5 * rho * V * V;
  const dP_elevation = rho * GRAVITY * outletPiping.elevationChange;
  const builtUp = (dP_friction + dP_fittings + dP_elevation) / 1e5;

  const total = superimposedBP + builtUp;
  const totalPercent = (total / setPressure) * 100;

  let pass = true;
  let recommendedType: DeviceType = deviceType;

  if (deviceType === "conventional") {
    if (totalPercent > 10) {
      pass = false;
      recommendedType = "balanced_bellows";
      warnings.push(`Total backpressure ${totalPercent.toFixed(1)}% exceeds 10% of set pressure — conventional valve not suitable`);
    }
  } else if (deviceType === "balanced_bellows") {
    if (totalPercent > 50) {
      pass = false;
      recommendedType = "pilot_operated";
      warnings.push(`Total backpressure ${totalPercent.toFixed(1)}% exceeds 50% — balanced bellows capacity may be significantly reduced`);
    }
  }

  return {
    superimposed: superimposedBP,
    builtUp,
    total,
    totalPercent,
    pass,
    recommendedType,
    warnings,
  };
}

// ─── DEVICE TYPE RECOMMENDATION ─────────────────────────────────────────────────

export interface DeviceRecommendation {
  recommended: DeviceType;
  reasons: string[];
  warnings: string[];
}

export function recommendDeviceType(device: PRDDevice, backpressurePercent: number): DeviceRecommendation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let recommended: DeviceType = "conventional";

  if (backpressurePercent > 50) {
    recommended = "pilot_operated";
    reasons.push("High backpressure (>50% of set) requires pilot-operated valve");
  } else if (backpressurePercent > 10 || device.backpressureConcern) {
    recommended = "balanced_bellows";
    reasons.push("Moderate backpressure or variable backpressure — balanced bellows recommended");
  }

  if (device.corrosionConcern || device.pluggingConcern) {
    if (recommended === "pilot_operated") {
      warnings.push("Pilot-operated valves sensitive to corrosion/plugging — verify suitability");
    }
    if (device.pluggingConcern) {
      reasons.push("Plugging service — consider rupture disk or combination device");
      if (recommended === "conventional" || recommended === "balanced_bellows") {
        recommended = "rupture_disk";
      }
    }
  }

  if (device.tightnessRequired) {
    if (recommended === "conventional") {
      recommended = "pilot_operated";
      reasons.push("Tight shutoff required — pilot-operated valve provides better seat tightness");
    }
  }

  if (device.twoPhaseRisk) {
    warnings.push("Two-phase flow suspected — sizing method must be verified by specialist");
  }

  if (reasons.length === 0) {
    reasons.push("Standard service — conventional spring-loaded valve suitable");
  }

  return { recommended, reasons, warnings };
}

// ─── SCENARIO SCREENING ────────────────────────────────────────────────────────

export const SCENARIO_TEMPLATES: { type: ScenarioType; label: string; description: string; defaultPhase: PRDScenario["fluidPhase"] }[] = [
  { type: "blocked_outlet", label: "Blocked Outlet", description: "Downstream valve closure or line blockage causing maximum inlet flow to be relieved", defaultPhase: "gas" },
  { type: "control_valve_failure", label: "Control Valve Failure Open", description: "Upstream CV fails fully open, delivering maximum capacity to protected equipment", defaultPhase: "gas" },
  { type: "cooling_water_failure", label: "Cooling Water / Condenser Failure", description: "Loss of cooling causing process vaporization or pressure rise", defaultPhase: "gas" },
  { type: "fire_exposure", label: "Fire Exposure", description: "External pool fire causing vaporization of liquid inventory (wetted area method)", defaultPhase: "gas" },
  { type: "tube_rupture", label: "Tube Rupture (HP to LP)", description: "Heat exchanger tube rupture, high-pressure fluid enters low-pressure shell", defaultPhase: "gas" },
  { type: "thermal_expansion", label: "Thermal Expansion", description: "Liquid trapped in blocked-in section heated by sun, process, or tracing", defaultPhase: "liquid" },
  { type: "power_failure", label: "Power / Utility Failure", description: "Loss of power causing multiple control/safety system failures", defaultPhase: "gas" },
  { type: "custom", label: "Custom Scenario", description: "User-defined scenario with manual relief rate input", defaultPhase: "gas" },
];

export function createDefaultScenario(type: ScenarioType): PRDScenario {
  const template = SCENARIO_TEMPLATES.find(t => t.type === type);
  return {
    id: `${type}_${Date.now()}`,
    type,
    enabled: true,
    description: template?.description || "",
    relievingRate: 0,
    relievingRateUnit: template?.defaultPhase === "liquid" ? "m3/h" : "kg/h",
    fluidPhase: template?.defaultPhase || "gas",
    userProvided: true,
    notes: "",
  };
}

export function findGoverningCase(scenarios: PRDScenario[]): number {
  const enabled = scenarios.filter(s => s.enabled && s.relievingRate > 0);
  if (enabled.length === 0) return -1;

  let maxIdx = -1;
  let maxRate = 0;
  for (let i = 0; i < scenarios.length; i++) {
    if (scenarios[i].enabled && scenarios[i].relievingRate > maxRate) {
      maxRate = scenarios[i].relievingRate;
      maxIdx = i;
    }
  }
  return maxIdx;
}

// ─── FIRE CASE HELPER (API 521 simplified) ──────────────────────────────────────

export function estimateFireCaseReliefRate(
  wettedArea_m2: number,
  latentHeat_kJ_kg: number,
  insulated: boolean = false
): { heatInput_kW: number; reliefRate_kgh: number } {
  const F = insulated ? 0.3 : 1.0;
  const A_ft2 = wettedArea_m2 * 10.7639;

  // API 521 Eq. 3.15 (simplified F-factor method) — same exponent for all Aw ranges
  const Q_BTUh = 21000 * F * Math.pow(A_ft2, 0.82);

  const Q_kW = Q_BTUh * 0.000293071;
  const W_kgh = (Q_kW / latentHeat_kJ_kg) * 3600;

  return { heatInput_kW: Q_kW, reliefRate_kgh: W_kgh };
}

// ─── THERMAL EXPANSION HELPER ───────────────────────────────────────────────────

export function estimateThermalExpansionRate(
  volume_m3: number,
  alpha_perC: number,
  tempRise_C: number,
  heatingTime_h: number
): { expansionVolume_L: number; reliefRate_m3h: number } {
  const expansion_m3 = alpha_perC * volume_m3 * tempRise_C;
  const expansion_L = expansion_m3 * 1000;
  const rate_m3h = heatingTime_h > 0 ? expansion_m3 / heatingTime_h : 0;
  return { expansionVolume_L: expansion_L, reliefRate_m3h: rate_m3h };
}

// ─── COMPLETE CASE RESULT ───────────────────────────────────────────────────────

export function buildFinalResult(
  project: PRDProject,
  equipment: PRDEquipment,
  scenarios: PRDScenario[],
  governingIndex: number,
  sizingResult: PRDSizingResult,
  orifice: OrificeSelection,
  inletCheck: PRDPipingResult | null,
  bpCheck: PRDBackpressureResult | null,
  deviceType: DeviceType
): PRDFinalResult {
  const flags: string[] = [];
  const actionItems: string[] = [];
  const warnings: string[] = [...sizingResult.warnings];

  const governing = governingIndex >= 0 ? scenarios[governingIndex] : null;

  if (governing?.type === "fire_exposure") flags.push("FIRE CASE");
  if (governing?.fluidPhase === "two_phase") {
    flags.push("TWO-PHASE — SINGLE-PHASE CALC ONLY");
    warnings.push(
      "TWO-PHASE LIMITATION: The governing scenario is tagged as two-phase flow. " +
      "This calculator performs single-phase relief sizing only (gas, steam, or liquid). " +
      "The area calculated is based on the single-phase method selected in Tab 6 and does NOT account for two-phase flow behaviour. " +
      "Two-phase and flashing/flashing-liquid relief requires a dedicated methodology (e.g. API 520 Part I Appendix C, Omega method, or HEM) " +
      "and must be performed by a qualified relief systems specialist. Do NOT use this result as a final basis for a two-phase case."
    );
    actionItems.unshift("CRITICAL: Two-phase governing scenario requires specialist two-phase sizing methodology — this result is indicative only");
  }
  if (governing?.type === "thermal_expansion") flags.push("THERMAL EXPANSION");
  if (sizingResult.flowRegime?.includes("choked") || sizingResult.flowRegime?.includes("Critical")) flags.push("CHOKED FLOW");

  if (inletCheck && !inletCheck.pass) {
    flags.push("INLET DP EXCESSIVE");
    actionItems.push("Review inlet piping — reduce length, increase diameter, or remove fittings");
  }
  if (bpCheck && !bpCheck.pass) {
    flags.push("BACKPRESSURE LIMIT");
    actionItems.push("Review outlet piping and device type selection for backpressure compliance");
  }

  if (orifice.margin < 0) {
    flags.push("MULTIPLE PRVS REQUIRED");
    actionItems.push("Required area exceeds largest single orifice — evaluate multiple valve arrangement");
  }

  actionItems.push("Verify sizing with vendor certified capacity data");
  actionItems.push("Confirm fluid properties at actual relieving conditions (process simulation)");
  actionItems.push("Review with qualified relief systems engineer before procurement");

  return {
    governingScenario: governing ? `${SCENARIO_TEMPLATES.find(t => t.type === governing.type)?.label || governing.type}` : "None selected",
    relievingRate: governing?.relievingRate || 0,
    relievingPressureAbs: sizingResult.relievingPressure,
    relievingPressureGauge: sizingResult.relievingPressure - project.atmosphericPressure,
    /** Relieving temperature from the actual sizing input — always populated by the solver */
    relievingTemperature: sizingResult.relievingTemperature ?? 0,
    requiredArea: sizingResult.requiredArea,
    selectedOrifice: orifice,
    inletCheck,
    backpressureCheck: bpCheck,
    recommendedDevice: deviceType,
    sizingResult,
    flags,
    actionItems,
    warnings,
  };
}

// ─── OVERPRESSURE DEFAULTS ──────────────────────────────────────────────────────

export const OVERPRESSURE_DEFAULTS: Record<string, { percent: number; description: string }> = {
  non_fire: { percent: 10, description: "Non-fire case, single device (10%)" },
  fire: { percent: 21, description: "Fire case, supplemental device (21%)" },
  supplemental_fire: { percent: 16, description: "Fire case with multiple devices (16%)" },
  custom: { percent: 10, description: "User-defined" },
};

// ─── DEFAULT TEST CASE ──────────────────────────────────────────────────────────

export const PRD_TEST_CASE = {
  project: {
    name: "Example Gas Plant",
    client: "Sample Client",
    location: "Middle East",
    caseId: "PRD-001",
    engineer: "Process Engineer",
    date: new Date().toISOString().split("T")[0],
    atmosphericPressure: 1.01325,
  } satisfies PRDProject,
  equipment: {
    tag: "V-1001",
    service: "HP Gas Separator",
    mawp: 50,
    designTemp: 150,
    normalOpPressure: 45,
    normalOpTemp: 40,
    setPressure: 50,
    overpressurePercent: 10,
    overpressureBasis: "non_fire" as const,
  } satisfies PRDEquipment,
  scenario: {
    id: "blocked_outlet_demo",
    type: "blocked_outlet" as ScenarioType,
    enabled: true,
    description: "Downstream isolation valve closure — full inlet flow to vessel must be relieved",
    relievingRate: 15000,
    relievingRateUnit: "kg/h" as const,
    fluidPhase: "gas" as const,
    userProvided: true,
    notes: "Based on maximum upstream CV capacity at fully open",
  } satisfies PRDScenario,
  sizing: {
    fluidType: "gas" as SizingFluidType,
    relievingRate: 15000,
    molecularWeight: 18.5,
    specificHeatRatio: 1.27,
    compressibilityFactor: 0.90,
    relievingTemperature: 120,
    liquidDensity: 998.2,
    viscosity: 1.0,
    vaporPressure: 0,
    kd: 0.975,
    kb: 1.0,
    kc: 1.0,
    ksh: 1.0,
    relievingPressureAbs: 0,
    backPressureAbs: 0,
    atmosphericPressure: 1.01325,
  } satisfies PRDSizingInput,
};
