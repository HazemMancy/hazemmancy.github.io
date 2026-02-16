/**
 * PRD (Pressure Relief Device) Calculator — API 521/520/526
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  PRELIMINARY ENGINEERING TOOL — NOT FOR FINAL DESIGN           ║
 * ║  Final sizing must be confirmed by qualified engineers and     ║
 * ║  validated with vendor certified capacity data.                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Code Basis:
 * - API 521: Overpressure scenario identification and relief load determination
 * - API 520 Part I: PRV sizing equations (gas/vapor, steam, liquid)
 * - API 520 Part II: Inlet pressure loss and outlet backpressure assessment
 * - API 526: Standard orifice selection (effective discharge area)
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
  cCoefficient?: number;
  kvFactor?: number;
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
  const P_set_abs = setPressure + atmosphericPressure;
  const P1 = P_set_abs * (1 + overpressurePercent / 100);
  return { abs: P1, gauge: P1 - atmosphericPressure };
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

  if (isCritical) {
    flowRegime = "Critical (choked)";
    A_mm2 = relievingRate /
      (C * kd * relievingPressureAbs * kb * kc *
        Math.sqrt(T_K * compressibilityFactor / molecularWeight));
  } else {
    flowRegime = "Subcritical";
    const r = backPressureAbs / relievingPressureAbs;
    const k = specificHeatRatio;
    const F2 = Math.sqrt(
      (k / (k - 1)) *
      Math.pow(r, 2 / k) *
      ((1 - Math.pow(r, (k - 1) / k)) / (1 - r))
    );
    A_mm2 = relievingRate /
      (F2 * kd * relievingPressureAbs * kc *
        Math.sqrt(2 * T_K * compressibilityFactor / molecularWeight));

    if (isNaN(A_mm2) || !isFinite(A_mm2)) {
      A_mm2 = relievingRate /
        (C * kd * relievingPressureAbs * kb * kc *
          Math.sqrt(T_K * compressibilityFactor / molecularWeight));
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

  return {
    requiredArea: A_mm2,
    fluidType: "gas",
    relievingPressure: relievingPressureAbs,
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
    Kn = (2.7644 * relievingPressureAbs - 1000) / (2.7644 * relievingPressureAbs);
    warnings.push(`High pressure steam — Napier correction Kn = ${Kn.toFixed(4)} applied`);
  }

  const STEAM_CONSTANT = 190.5;

  const A_mm2 = relievingRate /
    (STEAM_CONSTANT * kd * relievingPressureAbs * kb * kc * ksh * Kn);

  if (A_mm2 <= 0 || isNaN(A_mm2)) throw new Error("Calculated area is non-positive — check inputs");

  if (A_mm2 > API_526_ORIFICES[API_526_ORIFICES.length - 1].area) {
    warnings.push(`Required area ${A_mm2.toFixed(0)} mm² exceeds largest standard orifice — multiple PRDs required`);
  }

  return {
    requiredArea: A_mm2,
    fluidType: "steam",
    relievingPressure: relievingPressureAbs,
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
    const Re_prelim = Q_Lmin * 18800 * G / (viscosity * Math.sqrt(dP / G));
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

  const N1_liquid = 14.2;
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
    kvFactor: Kv,
    flowRegime: "Liquid service",
    warnings,
  };
}

// ─── UNIFIED SIZING DISPATCHER ──────────────────────────────────────────────────

export function sizePRD(input: PRDSizingInput): PRDSizingResult {
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

  let Q_BTUh: number;
  if (A_ft2 <= 2800) {
    Q_BTUh = 21000 * F * Math.pow(A_ft2, 0.82);
  } else {
    Q_BTUh = 21000 * F * Math.pow(A_ft2, 0.82);
  }

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
  if (governing?.fluidPhase === "two_phase") flags.push("TWO-PHASE SUSPECTED");
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
    relievingTemperature: equipment.normalOpTemp,
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
