import { PI } from "./constants";

export type ConvSepType = "vertical" | "horizontal";
export type PhaseMode = "two_phase" | "three_phase";
export type InletDeviceType = "diverter" | "half_pipe" | "cyclone" | "none";
export type MistEliminatorType = "none" | "wire_mesh" | "vane_pack" | "high_efficiency";
export type CaseType = "normal" | "maximum" | "fire" | "upset" | "startup" | "blowdown" | "turndown" | "custom";

export interface CalcStep {
  label: string;
  equation: string;
  substitution: string;
  result: number;
  unit: string;
}

export interface OperatingCase {
  id: string;
  name: string;
  caseType: CaseType;
  gasFlowRate: number;
  gasFlowBasis: "actual" | "standard";
  gasDensity: number;
  gasMW: number;
  gasPressure: number;
  gasTemperature: number;
  gasZ: number;
  gasViscosity: number;
  liquidFlowRate: number;
  liquidFlowBasis: "volume" | "mass";
  liquidDensity: number;
  liquidViscosity: number;
  flagFoam: boolean;
  flagSolids: boolean;
  flagSlugging: boolean;
  flagHydrate: boolean;
  flagEmulsion: boolean;
  dropletBasis: number;
}

export interface VesselAllowances {
  inletZone: number;
  disengagementZone: number;
  mistEliminatorZone: number;
  sumpZone: number;
  nozzleZone: number;
}

export interface ConvSepConfig {
  orientation: ConvSepType;
  phaseMode: PhaseMode;
  inletDevice: InletDeviceType;
  mistEliminator: MistEliminatorType;
  kValue: number;
  kMode: "user" | "typical";
  levelFraction: number;
  maxDiameter: number;
  maxLD: number;
  allowances: VesselAllowances;
  foamFactor: number;
  applyPressureCorrection: boolean;
}

export interface HoldupBasis {
  residenceTime: number;
  surgeTime: number;
  oilRetentionTime: number;
  waterRetentionTime: number;
  oilWaterSplitRatio: number;
}

export interface ProjectSetup {
  caseName: string;
  engineer: string;
  date: string;
  showIntermediateSteps: boolean;
  showAssumptionsLog: boolean;
}

export interface CaseGasResult {
  caseId: string;
  caseName: string;
  Qg_actual_m3s: number;
  v_s_max: number;
  A_req: number;
  D_req_mm: number;
  steps: CalcStep[];
}

export interface GeometryResult {
  D_mm: number;
  L_mm: number;
  D_m: number;
  L_m: number;
  vesselVolume_m3: number;
  liquidVolume_m3: number;
  gasAreaFraction: number;
  actualGasVelocity: number;
  liquidLevelPercent: number;
  LD_ratio: number;
  holdupCapacity_m3: number;
  surgeCapacity_m3: number;
  totalLiquidCapacity_m3: number;
  mistFaceVelocity: number;
  steps: CalcStep[];
}

export type EngFlag =
  | "FOAM_RISK"
  | "SLUGGING_RISK"
  | "SOLIDS_SAND"
  | "EMULSION_RISK"
  | "HYDRATE_WAX"
  | "HIGH_LIQUID_LEVEL"
  | "LD_OUT_OF_RANGE"
  | "GAS_VELOCITY_EXCEEDED"
  | "HIGH_LIQUID_LOAD"
  | "HIGH_PRESSURE"
  | "K_USER_ASSUMED"
  | "K_TYPICAL_MODE"
  | "VENDOR_MIST_CONFIRM"
  | "THREE_PHASE_PRELIM"
  | "SPECIALIST_REQUIRED"
  | "FOAM_K_DERATED"
  | "PRESSURE_K_CORRECTED"
  | "SETTLING_LENGTH_SHORT"
  | "STOKES_RE_EXCEEDED";

export const FLAG_LABELS: Record<EngFlag, string> = {
  FOAM_RISK: "Foam risk identified \u2014 consider antifoam and reduced K",
  SLUGGING_RISK: "Slugging risk \u2014 consider slug catcher or dedicated surge drum",
  SOLIDS_SAND: "Solids/sand present \u2014 sand jetting and desanding required",
  EMULSION_RISK: "Emulsion risk \u2014 coalescers or chemical treatment may be needed",
  HYDRATE_WAX: "Hydrate/wax risk \u2014 inhibitor injection and heat tracing required",
  HIGH_LIQUID_LEVEL: "Liquid level exceeds 75% \u2014 increase vessel size or reduce retention",
  LD_OUT_OF_RANGE: "L/D ratio outside typical range",
  GAS_VELOCITY_EXCEEDED: "Actual gas velocity exceeds Souders\u2013Brown limit",
  HIGH_LIQUID_LOAD: "High liquid load \u2014 gas area reduced, verify gas capacity",
  HIGH_PRESSURE: "High pressure service \u2014 wall thickness and weight may govern",
  K_USER_ASSUMED: "K value is user-assumed \u2014 confirm with vendor/internals data",
  K_TYPICAL_MODE: "K value from typical guidance \u2014 confirm for specific service",
  VENDOR_MIST_CONFIRM: "Mist eliminator selection requires vendor confirmation",
  THREE_PHASE_PRELIM: "3-phase sizing is preliminary \u2014 detailed design required (weirs, coalescers, emulsions)",
  SPECIALIST_REQUIRED: "Non-standard conditions \u2014 specialist design review required",
  FOAM_K_DERATED: "K value derated for foam tendency (GPSA guidance)",
  PRESSURE_K_CORRECTED: "K value corrected for high pressure per GPSA Fig 7-9",
  SETTLING_LENGTH_SHORT: "Horizontal settling length may be insufficient for droplet removal",
  STOKES_RE_EXCEEDED: "Particle Reynolds number exceeds 1 \u2014 Stokes law may underestimate terminal velocity",
};

export const FLAG_SEVERITY: Record<EngFlag, "info" | "warning" | "error"> = {
  FOAM_RISK: "warning",
  SLUGGING_RISK: "warning",
  SOLIDS_SAND: "warning",
  EMULSION_RISK: "warning",
  HYDRATE_WAX: "warning",
  HIGH_LIQUID_LEVEL: "error",
  LD_OUT_OF_RANGE: "warning",
  GAS_VELOCITY_EXCEEDED: "error",
  HIGH_LIQUID_LOAD: "warning",
  HIGH_PRESSURE: "info",
  K_USER_ASSUMED: "info",
  K_TYPICAL_MODE: "info",
  VENDOR_MIST_CONFIRM: "info",
  THREE_PHASE_PRELIM: "warning",
  SPECIALIST_REQUIRED: "error",
  FOAM_K_DERATED: "info",
  PRESSURE_K_CORRECTED: "info",
  SETTLING_LENGTH_SHORT: "warning",
  STOKES_RE_EXCEEDED: "warning",
};

export interface ConvSepFullResult {
  project: ProjectSetup;
  cases: OperatingCase[];
  config: ConvSepConfig;
  holdup: HoldupBasis;
  caseResults: CaseGasResult[];
  governingCaseId: string;
  governingReason: string;
  geometry: GeometryResult;
  holdupSteps: CalcStep[];
  flags: EngFlag[];
  warnings: string[];
  recommendations: string[];
  nextSteps: string[];
  assumptions: string[];
}

export const DEFAULT_PROJECT: ProjectSetup = {
  caseName: "",
  engineer: "",
  date: new Date().toISOString().split("T")[0],
  showIntermediateSteps: true,
  showAssumptionsLog: true,
};

export const DEFAULT_CASE: OperatingCase = {
  id: "case_1",
  name: "Normal",
  caseType: "normal",
  gasFlowRate: 0,
  gasFlowBasis: "actual",
  gasDensity: 0,
  gasMW: 18.5,
  gasPressure: 0,
  gasTemperature: 0,
  gasZ: 0.9,
  gasViscosity: 0.012,
  liquidFlowRate: 0,
  liquidFlowBasis: "volume",
  liquidDensity: 0,
  liquidViscosity: 1.0,
  flagFoam: false,
  flagSolids: false,
  flagSlugging: false,
  flagHydrate: false,
  flagEmulsion: false,
  dropletBasis: 150,
};

export const DEFAULT_ALLOWANCES: VesselAllowances = {
  inletZone: 0.3,
  disengagementZone: 0.6,
  mistEliminatorZone: 0.15,
  sumpZone: 0.3,
  nozzleZone: 0.15,
};

export const DEFAULT_CONFIG: ConvSepConfig = {
  orientation: "vertical",
  phaseMode: "two_phase",
  inletDevice: "diverter",
  mistEliminator: "wire_mesh",
  kValue: 0.07,
  kMode: "user",
  levelFraction: 0.5,
  maxDiameter: 0,
  maxLD: 0,
  allowances: { ...DEFAULT_ALLOWANCES },
  foamFactor: 0.7,
  applyPressureCorrection: true,
};

export const DEFAULT_HOLDUP: HoldupBasis = {
  residenceTime: 5,
  surgeTime: 2,
  oilRetentionTime: 5,
  waterRetentionTime: 10,
  oilWaterSplitRatio: 0.7,
};

export const K_GUIDANCE_CONV: Record<string, { range: [number, number]; typical: number; notes: string }> = {
  "Vertical \u2014 No internals": { range: [0.03, 0.06], typical: 0.04, notes: "Gravity settling only, API 12J" },
  "Vertical \u2014 Wire mesh pad": { range: [0.05, 0.10], typical: 0.07, notes: "Most common for production separators, API 12J" },
  "Vertical \u2014 Vane pack": { range: [0.07, 0.12], typical: 0.10, notes: "Higher throughput, larger \u0394P" },
  "Vertical \u2014 High efficiency": { range: [0.10, 0.15], typical: 0.12, notes: "Multi-cyclone / high-efficiency demister" },
  "Horizontal \u2014 No internals": { range: [0.04, 0.08], typical: 0.06, notes: "Gravity settling only" },
  "Horizontal \u2014 Wire mesh pad": { range: [0.07, 0.12], typical: 0.10, notes: "Common production separator, API 12J" },
  "Horizontal \u2014 Vane pack": { range: [0.10, 0.15], typical: 0.12, notes: "Higher throughput" },
  "Horizontal \u2014 High efficiency": { range: [0.12, 0.18], typical: 0.15, notes: "Multi-cyclone demister" },
};

function segmentAreaFraction(h_over_D: number): number {
  if (h_over_D <= 0) return 0;
  if (h_over_D >= 1) return 1;
  const theta = 2 * Math.acos(1 - 2 * h_over_D);
  return (theta - Math.sin(theta)) / (2 * PI);
}

function gasAreaFractionForLevel(levelFraction: number): number {
  return 1 - segmentAreaFraction(levelFraction);
}

export function computeKPressureCorrection(P_barg: number): { Cp: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  let Cp: number;

  if (P_barg <= 6.9) {
    Cp = 1.0;
    steps.push({
      label: "Pressure correction factor (GPSA Fig 7-9)",
      equation: "Cp = 1.0 (P \u2264 6.9 barg)",
      substitution: `Cp = 1.0 (P = ${P_barg.toFixed(1)} barg)`,
      result: Cp,
      unit: "-",
    });
  } else {
    Cp = Math.max(0.5, 1.0 - 0.00483 * (P_barg - 6.9));
    steps.push({
      label: "Pressure correction factor (GPSA Fig 7-9)",
      equation: "Cp = max(0.5, 1.0 \u2212 0.00483 \u00D7 (P \u2212 6.9))",
      substitution: `Cp = max(0.5, 1.0 \u2212 0.00483 \u00D7 (${P_barg.toFixed(1)} \u2212 6.9))`,
      result: Cp,
      unit: "-",
    });
  }

  return { Cp, steps };
}

export function computeEffectiveK(
  K_base: number,
  config: ConvSepConfig,
  P_barg: number,
  hasFoam: boolean,
): { K_eff: number; steps: CalcStep[]; pressureCorrected: boolean; foamDerated: boolean } {
  const steps: CalcStep[] = [];
  let K_eff = K_base;
  let pressureCorrected = false;
  let foamDerated = false;

  steps.push({
    label: "K base value",
    equation: "K_base",
    substitution: `K_base = ${K_base}`,
    result: K_base,
    unit: "m/s",
  });

  if (config.applyPressureCorrection && P_barg > 6.9) {
    const { Cp, steps: cpSteps } = computeKPressureCorrection(P_barg);
    steps.push(...cpSteps);
    K_eff = K_eff * Cp;
    pressureCorrected = true;
    steps.push({
      label: "K after pressure correction",
      equation: "K_p = K_base \u00D7 Cp",
      substitution: `K_p = ${K_base} \u00D7 ${Cp.toFixed(4)}`,
      result: K_eff,
      unit: "m/s",
    });
  }

  if (hasFoam && config.foamFactor > 0 && config.foamFactor < 1.0) {
    const K_before = K_eff;
    K_eff = K_eff * config.foamFactor;
    foamDerated = true;
    steps.push({
      label: "K after foam derating",
      equation: "K_foam = K_p \u00D7 F_foam",
      substitution: `K_foam = ${K_before.toFixed(4)} \u00D7 ${config.foamFactor}`,
      result: K_eff,
      unit: "m/s",
    });
  }

  steps.push({
    label: "Effective K value",
    equation: "K_eff",
    substitution: `K_eff = ${K_eff.toFixed(4)}`,
    result: K_eff,
    unit: "m/s",
  });

  return { K_eff, steps, pressureCorrected, foamDerated };
}

function computeStokesSettling(
  rhoL: number, rhoG: number, mu_g: number, d_micron: number,
): { v_t: number; Re_p: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  const d_m = d_micron * 1e-6;
  const g = 9.80665;

  const v_t = (rhoL - rhoG) * g * d_m * d_m / (18 * mu_g * 1e-3);
  steps.push({
    label: "Stokes terminal velocity",
    equation: "v_t = (\u03C1_l \u2212 \u03C1_g) \u00D7 g \u00D7 d\u00B2 / (18 \u00D7 \u03BC_g)",
    substitution: `v_t = (${rhoL} \u2212 ${rhoG}) \u00D7 ${g} \u00D7 (${d_micron}\u00D710\u207B\u2076)\u00B2 / (18 \u00D7 ${mu_g}\u00D710\u207B\u00B3)`,
    result: v_t,
    unit: "m/s",
  });

  const Re_p = rhoG * v_t * d_m / (mu_g * 1e-3);
  steps.push({
    label: "Particle Reynolds number",
    equation: "Re_p = \u03C1_g \u00D7 v_t \u00D7 d / \u03BC_g",
    substitution: `Re_p = ${rhoG} \u00D7 ${v_t.toFixed(6)} \u00D7 ${d_m.toExponential(3)} / ${(mu_g * 1e-3).toExponential(3)}`,
    result: Re_p,
    unit: "-",
  });

  return { v_t, Re_p, steps };
}

function computeActualGasFlow(c: OperatingCase): { Qg_m3s: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  let Qg_m3s: number;

  if (c.gasFlowBasis === "actual") {
    Qg_m3s = c.gasFlowRate / 3600;
    steps.push({
      label: "Gas flow (actual)",
      equation: "Q_g = Q_input / 3600",
      substitution: `Q_g = ${c.gasFlowRate} / 3600`,
      result: Qg_m3s,
      unit: "m\u00B3/s",
    });
  } else {
    if (c.gasPressure <= 0 || c.gasTemperature <= 0 || c.gasMW <= 0) {
      throw new Error(`Case "${c.name}": P, T, and MW required to convert standard to actual gas flow`);
    }
    const P_Pa = c.gasPressure * 1e5;
    const T_K = c.gasTemperature + 273.15;
    const Z = c.gasZ > 0 ? c.gasZ : 1.0;
    const Qstd_m3s = c.gasFlowRate / 3600;
    const P_std = 101325;
    const T_std = 288.15;
    Qg_m3s = Qstd_m3s * (P_std / P_Pa) * (T_K / T_std) * Z;
    steps.push({
      label: "Standard to actual",
      equation: "Q_act = Q_std \u00D7 (P_std/P) \u00D7 (T/T_std) \u00D7 Z",
      substitution: `Q_act = ${Qstd_m3s.toFixed(6)} \u00D7 (${P_std}/${P_Pa.toFixed(0)}) \u00D7 (${T_K.toFixed(2)}/${T_std}) \u00D7 ${Z}`,
      result: Qg_m3s,
      unit: "m\u00B3/s",
    });

    const rho_calc = (P_Pa * c.gasMW) / (8314.46 * T_K * Z);
    if (c.gasDensity <= 0 || Math.abs(c.gasDensity - rho_calc) / rho_calc > 0.2) {
      steps.push({
        label: "Density cross-check",
        equation: "\u03C1_calc = P\u00B7MW / (R\u00B7T\u00B7Z)",
        substitution: `\u03C1_calc = ${P_Pa.toFixed(0)} \u00D7 ${c.gasMW} / (8314.46 \u00D7 ${T_K.toFixed(2)} \u00D7 ${Z})`,
        result: rho_calc,
        unit: "kg/m\u00B3",
      });
    }
  }

  return { Qg_m3s, steps };
}

function computeSoudersBrown(
  K: number, rhoL: number, rhoG: number, Qg_m3s: number,
  gasAreaFrac: number, label: string
): { v_s_max: number; A_req: number; D_req_m: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];

  if (rhoL <= rhoG) throw new Error("Liquid density must be greater than gas density");
  if (rhoG <= 0) throw new Error("Gas density must be positive");
  if (K <= 0) throw new Error("K value must be positive");

  const v_s_max = K * Math.sqrt((rhoL - rhoG) / rhoG);
  steps.push({
    label: `${label}: v_s,max`,
    equation: "v_s,max = K \u00D7 \u221A((\u03C1_l \u2212 \u03C1_g) / \u03C1_g)",
    substitution: `v_s,max = ${K} \u00D7 \u221A((${rhoL} \u2212 ${rhoG}) / ${rhoG})`,
    result: v_s_max,
    unit: "m/s",
  });

  const A_req = Qg_m3s / v_s_max;
  steps.push({
    label: `${label}: A_req (total)`,
    equation: "A_req = Q_g / v_s,max",
    substitution: `A_req = ${Qg_m3s.toFixed(6)} / ${v_s_max.toFixed(4)}`,
    result: A_req,
    unit: "m\u00B2",
  });

  const A_vessel = A_req / gasAreaFrac;
  const D_req_m = Math.sqrt(4 * A_vessel / PI);
  steps.push({
    label: `${label}: D_req`,
    equation: "D = \u221A(4 \u00D7 A_vessel / \u03C0)",
    substitution: `D = \u221A(4 \u00D7 ${A_vessel.toFixed(6)} / ${PI.toFixed(4)})`,
    result: D_req_m * 1000,
    unit: "mm",
  });

  return { v_s_max, A_req, D_req_m, steps };
}

function solveHorizontalDiameter(
  K: number, rhoL: number, rhoG: number, Qg_m3s: number, levelFraction: number
): { D_m: number; gasAreaFrac: number; v_actual: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  const v_s_max = K * Math.sqrt((rhoL - rhoG) / rhoG);
  const A_req = Qg_m3s / v_s_max;

  steps.push({
    label: "Horizontal: v_s,max",
    equation: "v_s,max = K \u00D7 \u221A((\u03C1_l \u2212 \u03C1_g) / \u03C1_g)",
    substitution: `v_s,max = ${K} \u00D7 \u221A((${rhoL} \u2212 ${rhoG}) / ${rhoG})`,
    result: v_s_max,
    unit: "m/s",
  });
  steps.push({
    label: "Horizontal: A_req (gas)",
    equation: "A_req = Q_g / v_s,max",
    substitution: `A_req = ${Qg_m3s.toFixed(6)} / ${v_s_max.toFixed(4)}`,
    result: A_req,
    unit: "m\u00B2",
  });

  const gasAreaFrac = gasAreaFractionForLevel(levelFraction);
  steps.push({
    label: "Gas area fraction",
    equation: "f_gas = 1 \u2212 f_segment(h/D)",
    substitution: `f_gas = 1 \u2212 f_segment(${levelFraction})`,
    result: gasAreaFrac,
    unit: "-",
  });

  let D_lo = 0.1;
  let D_hi = 20;
  let D_m = 1.0;
  for (let i = 0; i < 50; i++) {
    D_m = (D_lo + D_hi) / 2;
    const A_total = (PI / 4) * D_m * D_m;
    const A_gas_avail = gasAreaFrac * A_total;
    if (A_gas_avail >= A_req) {
      D_hi = D_m;
    } else {
      D_lo = D_m;
    }
    if ((D_hi - D_lo) < 0.0001) break;
  }

  const A_total = (PI / 4) * D_m * D_m;
  const A_gas_avail = gasAreaFrac * A_total;
  const v_actual = Qg_m3s / A_gas_avail;

  steps.push({
    label: "Horizontal: D_req (iterative)",
    equation: "Solve D: f_gas \u00D7 \u03C0D\u00B2/4 \u2265 A_req",
    substitution: `${gasAreaFrac.toFixed(4)} \u00D7 \u03C0\u00D7${D_m.toFixed(4)}\u00B2/4 = ${A_gas_avail.toFixed(6)} \u2265 ${A_req.toFixed(6)}`,
    result: D_m * 1000,
    unit: "mm",
  });
  steps.push({
    label: "Gas area available",
    equation: "A_gas = f_gas \u00D7 \u03C0D\u00B2/4",
    substitution: `A_gas = ${gasAreaFrac.toFixed(4)} \u00D7 \u03C0\u00D7${D_m.toFixed(4)}\u00B2/4`,
    result: A_gas_avail,
    unit: "m\u00B2",
  });

  return { D_m, gasAreaFrac, v_actual, steps };
}

function computeHoldup(
  cases: OperatingCase[],
  holdup: HoldupBasis,
  config: ConvSepConfig,
  governingCaseId: string,
): { totalVolume_m3: number; holdupVolume_m3: number; surgeVolume_m3: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  const govCase = cases.find(c => c.id === governingCaseId) || cases[0];

  let Ql_m3s = govCase.liquidFlowRate / 3600;
  if (govCase.liquidFlowBasis === "mass" && govCase.liquidDensity > 0) {
    Ql_m3s = (govCase.liquidFlowRate / govCase.liquidDensity) / 3600;
    steps.push({
      label: "Liquid vol flow",
      equation: "Q_l = W_l / \u03C1_l / 3600",
      substitution: `Q_l = ${govCase.liquidFlowRate} / ${govCase.liquidDensity} / 3600`,
      result: Ql_m3s,
      unit: "m\u00B3/s",
    });
  } else {
    steps.push({
      label: "Liquid vol flow",
      equation: "Q_l = Q_input / 3600",
      substitution: `Q_l = ${govCase.liquidFlowRate} / 3600`,
      result: Ql_m3s,
      unit: "m\u00B3/s",
    });
  }

  const holdupVolume = Ql_m3s * holdup.residenceTime * 60;
  steps.push({
    label: "Holdup volume",
    equation: "V_hold = Q_l \u00D7 t_res \u00D7 60",
    substitution: `V_hold = ${Ql_m3s.toFixed(6)} \u00D7 ${holdup.residenceTime} \u00D7 60`,
    result: holdupVolume,
    unit: "m\u00B3",
  });

  const surgeVolume = Ql_m3s * holdup.surgeTime * 60;
  steps.push({
    label: "Surge volume",
    equation: "V_surge = Q_l \u00D7 t_surge \u00D7 60",
    substitution: `V_surge = ${Ql_m3s.toFixed(6)} \u00D7 ${holdup.surgeTime} \u00D7 60`,
    result: surgeVolume,
    unit: "m\u00B3",
  });

  let totalVolume = holdupVolume + surgeVolume;

  if (config.phaseMode === "three_phase") {
    const oilFrac = holdup.oilWaterSplitRatio;
    const waterFrac = 1 - oilFrac;
    const Ql_oil_m3s = Ql_m3s * oilFrac;
    const Ql_water_m3s = Ql_m3s * waterFrac;
    const oilVol = Ql_oil_m3s * holdup.oilRetentionTime * 60;
    const waterVol = Ql_water_m3s * holdup.waterRetentionTime * 60;
    steps.push({
      label: "Oil phase volume",
      equation: "V_oil = Q_oil \u00D7 t_oil \u00D7 60",
      substitution: `V_oil = ${Ql_oil_m3s.toFixed(6)} \u00D7 ${holdup.oilRetentionTime} \u00D7 60`,
      result: oilVol,
      unit: "m\u00B3",
    });
    steps.push({
      label: "Water phase volume",
      equation: "V_water = Q_water \u00D7 t_water \u00D7 60",
      substitution: `V_water = ${Ql_water_m3s.toFixed(6)} \u00D7 ${holdup.waterRetentionTime} \u00D7 60`,
      result: waterVol,
      unit: "m\u00B3",
    });
    totalVolume = Math.max(totalVolume, oilVol + waterVol + surgeVolume);
  }

  steps.push({
    label: "Total liquid volume",
    equation: config.phaseMode === "three_phase"
      ? "V_total = max(V_hold+V_surge, V_oil+V_water+V_surge)"
      : "V_total = V_hold + V_surge",
    substitution: `V_total = ${totalVolume.toFixed(4)}`,
    result: totalVolume,
    unit: "m\u00B3",
  });

  return { totalVolume_m3: totalVolume, holdupVolume_m3: holdupVolume, surgeVolume_m3: surgeVolume, steps };
}

function assembleGeometry(
  D_gas_mm: number,
  totalLiquidVol: number,
  config: ConvSepConfig,
  Qg_m3s: number,
): GeometryResult {
  const steps: CalcStep[] = [];
  const isVertical = config.orientation === "vertical";

  let D_mm = Math.max(D_gas_mm, 500);
  D_mm = Math.ceil(D_mm / 50) * 50;

  if (config.maxDiameter > 0 && D_mm > config.maxDiameter) {
    D_mm = config.maxDiameter;
  }

  steps.push({
    label: "Gas-capacity diameter",
    equation: "D_gas (rounded to 50mm)",
    substitution: `D = ceil(${D_gas_mm.toFixed(0)} / 50) \u00D7 50`,
    result: D_mm,
    unit: "mm",
  });

  const D_m = D_mm / 1000;
  const A_vessel = (PI / 4) * D_m * D_m;
  let L_mm: number;
  let liquidLevelPercent: number;
  let gasAreaFraction: number;
  let holdupCapacity: number;
  let surgeCapacity: number;

  if (isVertical) {
    const liquidHeight = totalLiquidVol / A_vessel;
    const allow = config.allowances;
    const totalHeight = liquidHeight + allow.inletZone + allow.disengagementZone +
      allow.mistEliminatorZone + allow.sumpZone + allow.nozzleZone;

    L_mm = Math.ceil(totalHeight * 1000 / 50) * 50;
    liquidLevelPercent = (liquidHeight / (L_mm / 1000)) * 100;
    gasAreaFraction = 1.0;
    holdupCapacity = totalLiquidVol;
    surgeCapacity = 0;

    steps.push({
      label: "API 12J Seam-to-Seam buildup: Sump zone",
      equation: "h_sump",
      substitution: `h_sump = ${allow.sumpZone}`,
      result: allow.sumpZone,
      unit: "m",
    });
    steps.push({
      label: "API 12J Seam-to-Seam buildup: Liquid height",
      equation: "h_liq = V_liq / A_vessel",
      substitution: `h_liq = ${totalLiquidVol.toFixed(4)} / ${A_vessel.toFixed(6)}`,
      result: liquidHeight,
      unit: "m",
    });
    steps.push({
      label: "API 12J Seam-to-Seam buildup: Inlet zone",
      equation: "h_inlet",
      substitution: `h_inlet = ${allow.inletZone}`,
      result: allow.inletZone,
      unit: "m",
    });
    steps.push({
      label: "API 12J Seam-to-Seam buildup: Disengagement zone",
      equation: "h_disengage",
      substitution: `h_disengage = ${allow.disengagementZone}`,
      result: allow.disengagementZone,
      unit: "m",
    });
    steps.push({
      label: "API 12J Seam-to-Seam buildup: Mist eliminator zone",
      equation: "h_mist",
      substitution: `h_mist = ${allow.mistEliminatorZone}`,
      result: allow.mistEliminatorZone,
      unit: "m",
    });
    steps.push({
      label: "API 12J Seam-to-Seam buildup: Nozzle zone",
      equation: "h_nozzle",
      substitution: `h_nozzle = ${allow.nozzleZone}`,
      result: allow.nozzleZone,
      unit: "m",
    });

    const allowTotal = allow.inletZone + allow.disengagementZone + allow.mistEliminatorZone + allow.sumpZone + allow.nozzleZone;
    steps.push({
      label: "Total vessel height (seam-to-seam)",
      equation: "H = h_sump + h_liq + h_inlet + h_disengage + h_mist + h_nozzle",
      substitution: `H = ${allow.sumpZone} + ${liquidHeight.toFixed(3)} + ${allow.inletZone} + ${allow.disengagementZone} + ${allow.mistEliminatorZone} + ${allow.nozzleZone}`,
      result: L_mm / 1000,
      unit: "m",
    });
  } else {
    const levelFrac = config.levelFraction;
    const liquidAreaFrac = segmentAreaFraction(levelFrac);
    gasAreaFraction = 1 - liquidAreaFrac;

    const D_liq_m = totalLiquidVol > 0
      ? Math.pow(totalLiquidVol / (liquidAreaFrac * PI / 4), 0.5)
      : 0;
    const D_liq_mm = D_liq_m * 1000;

    if (D_liq_mm > D_mm) {
      D_mm = Math.ceil(D_liq_mm / 50) * 50;
      if (config.maxDiameter > 0 && D_mm > config.maxDiameter) {
        D_mm = config.maxDiameter;
      }
    }

    const targetLD = config.maxLD > 0 ? Math.min(config.maxLD, 5) : 4;
    let L_target = D_mm * targetLD;

    const D_final_m = D_mm / 1000;
    const A_final = (PI / 4) * D_final_m * D_final_m;
    const liqAreaPerM = liquidAreaFrac * A_final;

    if (liqAreaPerM > 0 && totalLiquidVol > 0) {
      const L_liq_m = totalLiquidVol / liqAreaPerM;
      const L_liq_mm = L_liq_m * 1000;
      const allow = config.allowances;
      const L_min_mm = L_liq_mm + (allow.inletZone + allow.nozzleZone) * 1000;
      if (L_min_mm > L_target) L_target = L_min_mm;
    }

    L_mm = Math.ceil(L_target / 50) * 50;

    const L_m = L_mm / 1000;
    const vesselVol = A_final * L_m;
    holdupCapacity = liquidAreaFrac * vesselVol;
    surgeCapacity = 0;
    liquidLevelPercent = levelFrac * 100;

    steps.push({
      label: "Liquid area fraction",
      equation: "f_liq = segment_area(h/D)",
      substitution: `f_liq = segment_area(${levelFrac})`,
      result: liquidAreaFrac,
      unit: "-",
    });
    steps.push({
      label: "Diameter (liquid check)",
      equation: "D_liq = \u221A(V_liq / (f_liq \u00D7 \u03C0/4))",
      substitution: `D_liq = \u221A(${totalLiquidVol.toFixed(4)} / (${liquidAreaFrac.toFixed(4)} \u00D7 ${(PI / 4).toFixed(4)}))`,
      result: D_liq_mm,
      unit: "mm",
    });
    steps.push({
      label: "Selected diameter",
      equation: "D = max(D_gas, D_liq, 500mm)",
      substitution: `D = max(${D_gas_mm.toFixed(0)}, ${D_liq_mm.toFixed(0)}, 500)`,
      result: D_mm,
      unit: "mm",
    });
    steps.push({
      label: "Vessel length",
      equation: "L = max(D \u00D7 L/D, L_liq_req + allowances)",
      substitution: `L = max(${D_mm} \u00D7 ${targetLD}, ...)`,
      result: L_mm / 1000,
      unit: "m",
    });
  }

  const L_m = L_mm / 1000;
  const vesselVol_corrected = (PI / 4) * (D_mm / 1000) ** 2 * L_m;

  const actualGasVelocity = gasAreaFraction > 0 ? Qg_m3s / (gasAreaFraction * (PI / 4) * (D_mm / 1000) ** 2) : 0;
  const mistFaceVelocity = Qg_m3s / ((PI / 4) * (D_mm / 1000) ** 2);

  const LD_ratio = D_mm > 0 ? L_mm / D_mm : 0;

  steps.push({
    label: "Vessel volume",
    equation: "V = \u03C0D\u00B2/4 \u00D7 L",
    substitution: `V = \u03C0\u00D7${(D_mm / 1000).toFixed(3)}\u00B2/4 \u00D7 ${L_m.toFixed(3)}`,
    result: vesselVol_corrected,
    unit: "m\u00B3",
  });
  steps.push({
    label: "L/D ratio",
    equation: "L/D",
    substitution: `${L_mm} / ${D_mm}`,
    result: LD_ratio,
    unit: "-",
  });
  steps.push({
    label: "Actual gas velocity",
    equation: "v_gas = Q_g / A_gas",
    substitution: `v_gas = ${Qg_m3s.toFixed(6)} / ${(gasAreaFraction * (PI / 4) * (D_mm / 1000) ** 2).toFixed(6)}`,
    result: actualGasVelocity,
    unit: "m/s",
  });
  steps.push({
    label: "Mist eliminator face velocity",
    equation: "v_face = Q_g / A_vessel",
    substitution: `v_face = ${Qg_m3s.toFixed(6)} / ${((PI / 4) * (D_mm / 1000) ** 2).toFixed(6)}`,
    result: mistFaceVelocity,
    unit: "m/s",
  });

  return {
    D_mm,
    L_mm,
    D_m: D_mm / 1000,
    L_m,
    vesselVolume_m3: vesselVol_corrected,
    liquidVolume_m3: totalLiquidVol,
    gasAreaFraction,
    actualGasVelocity,
    liquidLevelPercent,
    LD_ratio,
    holdupCapacity_m3: holdupCapacity,
    surgeCapacity_m3: surgeCapacity,
    totalLiquidCapacity_m3: holdupCapacity + surgeCapacity,
    mistFaceVelocity,
    steps,
  };
}

function collectFlags(
  cases: OperatingCase[],
  config: ConvSepConfig,
  geometry: GeometryResult,
  v_s_max: number,
  pressureCorrected: boolean,
  foamDerated: boolean,
  stokesReExceeded: boolean,
  settlingShort: boolean,
): EngFlag[] {
  const flags: EngFlag[] = [];

  const anyFoam = cases.some(c => c.flagFoam);
  const anySolids = cases.some(c => c.flagSolids);
  const anySlugging = cases.some(c => c.flagSlugging);
  const anyHydrate = cases.some(c => c.flagHydrate);
  const anyEmulsion = cases.some(c => c.flagEmulsion);

  if (anyFoam) flags.push("FOAM_RISK");
  if (anySolids) flags.push("SOLIDS_SAND");
  if (anySlugging) flags.push("SLUGGING_RISK");
  if (anyHydrate) flags.push("HYDRATE_WAX");
  if (anyEmulsion) flags.push("EMULSION_RISK");

  if (anyFoam || anySolids || anyHydrate || anyEmulsion) flags.push("SPECIALIST_REQUIRED");

  if (config.kMode === "user") flags.push("K_USER_ASSUMED");
  if (config.kMode === "typical") flags.push("K_TYPICAL_MODE");

  if (pressureCorrected) flags.push("PRESSURE_K_CORRECTED");
  if (foamDerated) flags.push("FOAM_K_DERATED");
  if (stokesReExceeded) flags.push("STOKES_RE_EXCEEDED");
  if (settlingShort) flags.push("SETTLING_LENGTH_SHORT");

  if (config.mistEliminator !== "none") flags.push("VENDOR_MIST_CONFIRM");
  if (config.phaseMode === "three_phase") flags.push("THREE_PHASE_PRELIM");

  if (geometry.actualGasVelocity > v_s_max && v_s_max > 0) flags.push("GAS_VELOCITY_EXCEEDED");
  if (geometry.liquidLevelPercent > 75) flags.push("HIGH_LIQUID_LEVEL");

  const isHoriz = config.orientation === "horizontal";
  if (isHoriz && (geometry.LD_ratio < 2.5 || geometry.LD_ratio > 6)) flags.push("LD_OUT_OF_RANGE");
  if (!isHoriz && (geometry.LD_ratio < 2 || geometry.LD_ratio > 5)) flags.push("LD_OUT_OF_RANGE");

  if (isHoriz && geometry.gasAreaFraction < 0.3) flags.push("HIGH_LIQUID_LOAD");

  const maxP = Math.max(...cases.map(c => c.gasPressure));
  if (maxP > 100) flags.push("HIGH_PRESSURE");

  const unique: EngFlag[] = [];
  const seen = new Set<EngFlag>();
  for (const f of flags) {
    if (!seen.has(f)) { seen.add(f); unique.push(f); }
  }
  return unique;
}

function buildRecommendations(flags: EngFlag[], config: ConvSepConfig, geometry: GeometryResult): { recs: string[]; nextSteps: string[] } {
  const recs: string[] = [];
  const nextSteps: string[] = [];

  if (flags.includes("FOAM_RISK")) {
    recs.push("Consider antifoam injection strategy and reduce K value by 50\u201370%");
    nextSteps.push("Review antifoam chemical compatibility and injection rates");
  }
  if (flags.includes("SLUGGING_RISK")) {
    recs.push("Consider upstream slug catcher or dedicated surge drum");
    nextSteps.push("Perform dynamic simulation to quantify slug volumes");
  }
  if (flags.includes("SOLIDS_SAND")) {
    recs.push("Include sand jetting nozzles and consider desanding cyclones");
    nextSteps.push("Specify erosion-resistant internals and sand handling system");
  }
  if (flags.includes("HYDRATE_WAX")) {
    recs.push("Include heat tracing and chemical inhibitor injection provisions");
    nextSteps.push("Perform hydrate/wax formation analysis with PVT data");
  }
  if (flags.includes("GAS_VELOCITY_EXCEEDED")) {
    recs.push("Increase vessel diameter or improve internals (higher K) to meet gas capacity");
  }
  if (flags.includes("HIGH_LIQUID_LEVEL")) {
    recs.push("Reduce retention time, increase diameter, or add dedicated liquid surge vessel");
  }
  if (flags.includes("LD_OUT_OF_RANGE")) {
    const isHoriz = config.orientation === "horizontal";
    recs.push(`L/D ratio ${geometry.LD_ratio.toFixed(1)} outside typical ${isHoriz ? "2.5\u20136.0" : "2\u20135"} range \u2014 adjust length or diameter`);
  }
  if (flags.includes("HIGH_LIQUID_LOAD")) {
    recs.push("Gas area fraction is low due to high liquid level \u2014 verify gas capacity is adequate");
  }
  if (flags.includes("VENDOR_MIST_CONFIRM")) {
    recs.push("Confirm mist eliminator type, face velocity limits, and \u0394P with vendor");
    nextSteps.push("Submit process data sheet to mist eliminator vendor for selection");
  }
  if (flags.includes("THREE_PHASE_PRELIM")) {
    recs.push("3-phase sizing is preliminary \u2014 detailed design requires weir/baffle sizing, coalescer selection, and emulsion characterization");
    nextSteps.push("Perform bottle test for oil-water separation characteristics");
  }
  if (flags.includes("EMULSION_RISK")) {
    recs.push("Consider chemical demulsifier injection and coalescing internals");
  }
  if (flags.includes("PRESSURE_K_CORRECTED")) {
    recs.push("K value reduced for high-pressure operation per GPSA Fig 7-9 piecewise correlation");
  }
  if (flags.includes("FOAM_K_DERATED")) {
    recs.push("K value derated for foam tendency \u2014 verify foam factor with field/lab data");
  }
  if (flags.includes("SETTLING_LENGTH_SHORT")) {
    recs.push("Horizontal settling length insufficient for target droplet removal \u2014 increase L/D or vessel diameter");
  }
  if (flags.includes("STOKES_RE_EXCEEDED")) {
    recs.push("Particle Re > 1 \u2014 Stokes law assumption may be non-conservative; consider drag-corrected settling");
    nextSteps.push("Evaluate intermediate-law or iterative drag coefficient for droplet settling");
  }

  nextSteps.push("Validate fluid properties with PVT analysis at operating conditions");
  nextSteps.push("Perform mechanical design (wall thickness, nozzle sizing, saddle/skirt)");
  nextSteps.push("Issue process data sheet for vendor quotation");
  nextSteps.push("Review nozzle sizing (inlet, gas outlet, liquid outlet, PSV, instruments)");

  return { recs, nextSteps };
}

function buildAssumptions(config: ConvSepConfig, holdup: HoldupBasis): string[] {
  const a: string[] = [];
  a.push("Souders\u2013Brown equation for maximum allowable gas velocity (API 12J)");
  a.push(`K value (base) = ${config.kValue} m/s (${config.kMode === "typical" ? "from typical guidance" : "user-entered"})`);
  if (config.applyPressureCorrection) {
    a.push("Pressure correction applied to K per GPSA Fig 7-9 (Cp = 1.0 for P \u2264 6.9 barg, piecewise linear above)");
  }
  if (config.foamFactor < 1.0) {
    a.push(`Foam derating factor: ${config.foamFactor} (applied when foam flagged on case)`);
  }
  a.push(`Orientation: ${config.orientation === "vertical" ? "Vertical" : "Horizontal"} production separator`);
  a.push(`Phase mode: ${config.phaseMode === "two_phase" ? "2-phase (gas-liquid)" : "3-phase (gas-oil-water)"}`);

  if (config.orientation === "horizontal") {
    a.push(`Normal liquid level fraction: ${(config.levelFraction * 100).toFixed(0)}% of diameter`);
  }

  a.push(`Mist eliminator: ${config.mistEliminator.replace(/_/g, " ")}`);
  a.push(`Inlet device: ${config.inletDevice.replace(/_/g, " ")}`);
  a.push(`Liquid residence time: ${holdup.residenceTime} min`);
  a.push(`Surge time: ${holdup.surgeTime} min`);

  if (config.phaseMode === "three_phase") {
    a.push(`Oil retention time: ${holdup.oilRetentionTime} min`);
    a.push(`Water retention time: ${holdup.waterRetentionTime} min`);
    a.push(`Oil/water split ratio: ${(holdup.oilWaterSplitRatio * 100).toFixed(0)}/${((1 - holdup.oilWaterSplitRatio) * 100).toFixed(0)}`);
  }

  a.push("Vessel diameter rounded up to nearest 50 mm");
  a.push("No mechanical design (wall thickness, weight, nozzles) considered");
  a.push("Head volumes not included \u2014 cylindrical shell volume only");
  a.push("Standard: API 12J \u2014 Specification for Oil and Gas Separators");

  return a;
}

export function calculateConventionalSeparator(
  project: ProjectSetup,
  cases: OperatingCase[],
  config: ConvSepConfig,
  holdup: HoldupBasis,
): ConvSepFullResult {
  if (cases.length === 0) throw new Error("At least one operating case is required");

  const warnings: string[] = [];
  const caseResults: CaseGasResult[] = [];

  const isHorizontal = config.orientation === "horizontal";

  let anyPressureCorrected = false;
  let anyFoamDerated = false;
  let anyStokesReExceeded = false;
  let anySettlingShort = false;

  for (const c of cases) {
    if (c.gasDensity <= 0) throw new Error(`Case "${c.name}": Gas density must be positive`);
    if (c.liquidDensity <= 0) throw new Error(`Case "${c.name}": Liquid density must be positive`);
    if (c.liquidDensity <= c.gasDensity) {
      warnings.push(`Case "${c.name}": \u03C1_l (\u200B${c.liquidDensity}\u200B) \u2264 \u03C1_g (\u200B${c.gasDensity}\u200B) \u2014 check fluid properties`);
    }
    if (c.gasFlowRate <= 0 && c.liquidFlowRate <= 0) {
      throw new Error(`Case "${c.name}": At least one flow rate must be positive`);
    }

    const { Qg_m3s, steps: flowSteps } = computeActualGasFlow(c);

    const { K_eff, steps: kSteps, pressureCorrected, foamDerated } = computeEffectiveK(
      config.kValue, config, c.gasPressure, c.flagFoam,
    );
    if (pressureCorrected) anyPressureCorrected = true;
    if (foamDerated) anyFoamDerated = true;

    let D_req_mm: number;
    let v_s_max: number;
    let A_req: number;
    const allSteps = [...flowSteps, ...kSteps];

    if (isHorizontal) {
      const res = solveHorizontalDiameter(K_eff, c.liquidDensity, c.gasDensity, Qg_m3s, config.levelFraction);
      D_req_mm = res.D_m * 1000;
      v_s_max = K_eff * Math.sqrt((c.liquidDensity - c.gasDensity) / c.gasDensity);
      A_req = Qg_m3s / v_s_max;
      allSteps.push(...res.steps);
    } else {
      const res = computeSoudersBrown(K_eff, c.liquidDensity, c.gasDensity, Qg_m3s, 1.0, c.name);
      D_req_mm = res.D_req_m * 1000;
      v_s_max = res.v_s_max;
      A_req = res.A_req;
      allSteps.push(...res.steps);
    }

    if (c.gasViscosity > 0 && c.dropletBasis > 0) {
      const stokes = computeStokesSettling(c.liquidDensity, c.gasDensity, c.gasViscosity, c.dropletBasis);
      allSteps.push(...stokes.steps);
      if (stokes.Re_p > 1) anyStokesReExceeded = true;
    }

    caseResults.push({
      caseId: c.id,
      caseName: c.name,
      Qg_actual_m3s: Qg_m3s,
      v_s_max,
      A_req,
      D_req_mm,
      steps: allSteps,
    });
  }

  let governingIdx = 0;
  let maxD = 0;
  for (let i = 0; i < caseResults.length; i++) {
    if (caseResults[i].D_req_mm > maxD) {
      maxD = caseResults[i].D_req_mm;
      governingIdx = i;
    }
  }
  const governingCaseId = caseResults[governingIdx].caseId;
  const governingReason = `Case "${caseResults[governingIdx].caseName}" requires largest diameter (${maxD.toFixed(0)} mm)`;

  const { totalVolume_m3, steps: holdupSteps } =
    computeHoldup(cases, holdup, config, governingCaseId);

  const govCaseResult = caseResults[governingIdx];
  const geometry = assembleGeometry(maxD, totalVolume_m3, config, govCaseResult.Qg_actual_m3s);

  if (isHorizontal) {
    const govCase = cases.find(c => c.id === governingCaseId) || cases[0];
    if (govCase.gasViscosity > 0 && govCase.dropletBasis > 0) {
      const stokes = computeStokesSettling(govCase.liquidDensity, govCase.gasDensity, govCase.gasViscosity, govCase.dropletBasis);
      const v_t = stokes.v_t;
      const D_m = geometry.D_m;
      const h_gas = D_m * (1 - config.levelFraction);
      const t_settle = h_gas > 0 && v_t > 0 ? h_gas / v_t : 0;

      const gasAreaFrac = gasAreaFractionForLevel(config.levelFraction);
      const A_gas = gasAreaFrac * (PI / 4) * D_m * D_m;
      const v_gas = A_gas > 0 ? govCaseResult.Qg_actual_m3s / A_gas : 0;

      const allow = config.allowances;
      const L_eff = Math.max(0, geometry.L_m - allow.inletZone - allow.nozzleZone);
      const t_gas = (v_gas > 0 && L_eff > 0) ? L_eff / v_gas : 0;

      geometry.steps.push({
        label: "Settling time (droplet to liquid surface)",
        equation: "t_settle = h_gas / v_t",
        substitution: `t_settle = ${h_gas.toFixed(3)} / ${v_t.toFixed(6)}`,
        result: t_settle,
        unit: "s",
      });
      geometry.steps.push({
        label: "Gas residence time in effective length",
        equation: "t_gas = L_eff / v_gas",
        substitution: `t_gas = ${L_eff.toFixed(3)} / ${v_gas.toFixed(4)}`,
        result: t_gas,
        unit: "s",
      });

      if (t_settle > t_gas && t_gas > 0) {
        anySettlingShort = true;
        geometry.steps.push({
          label: "Settling length check",
          equation: "t_settle > t_gas \u2014 settling length insufficient",
          substitution: `${t_settle.toFixed(2)} s > ${t_gas.toFixed(2)} s`,
          result: t_settle / t_gas,
          unit: "ratio",
        });
      }
    }
  }

  const flags = collectFlags(cases, config, geometry, govCaseResult.v_s_max, anyPressureCorrected, anyFoamDerated, anyStokesReExceeded, anySettlingShort);
  const { recs, nextSteps } = buildRecommendations(flags, config, geometry);
  const assumptions = buildAssumptions(config, holdup);

  return {
    project,
    cases,
    config,
    holdup,
    caseResults,
    governingCaseId,
    governingReason,
    geometry,
    holdupSteps,
    flags,
    warnings,
    recommendations: recs,
    nextSteps,
    assumptions,
  };
}

export const TEST_CASES: { name: string; project: ProjectSetup; cases: OperatingCase[]; config: ConvSepConfig; holdup: HoldupBasis }[] = [
  {
    name: "Vertical 2-Phase Production Separator",
    project: { ...DEFAULT_PROJECT, caseName: "1st Stage Separator V-1001" },
    cases: [
      {
        ...DEFAULT_CASE,
        id: "normal",
        name: "Normal",
        caseType: "normal",
        gasFlowRate: 5000,
        gasFlowBasis: "actual",
        gasDensity: 25,
        gasMW: 18.5,
        gasPressure: 30,
        gasTemperature: 40,
        gasZ: 0.9,
        liquidFlowRate: 10,
        liquidDensity: 800,
      },
      {
        ...DEFAULT_CASE,
        id: "max",
        name: "Maximum",
        caseType: "maximum",
        gasFlowRate: 7000,
        gasFlowBasis: "actual",
        gasDensity: 23,
        gasMW: 18.5,
        gasPressure: 28,
        gasTemperature: 45,
        gasZ: 0.9,
        liquidFlowRate: 15,
        liquidDensity: 790,
      },
    ],
    config: {
      ...DEFAULT_CONFIG,
      orientation: "vertical",
      phaseMode: "two_phase",
      mistEliminator: "wire_mesh",
      kValue: 0.07,
      kMode: "typical",
      foamFactor: 0.7,
      applyPressureCorrection: true,
    },
    holdup: {
      ...DEFAULT_HOLDUP,
      residenceTime: 5,
      surgeTime: 2,
    },
  },
  {
    name: "Horizontal 3-Phase Production Separator",
    project: { ...DEFAULT_PROJECT, caseName: "3-Phase Separator V-2001" },
    cases: [
      {
        ...DEFAULT_CASE,
        id: "normal",
        name: "Normal",
        caseType: "normal",
        gasFlowRate: 5000,
        gasFlowBasis: "actual",
        gasDensity: 30,
        gasMW: 20,
        gasPressure: 35,
        gasTemperature: 45,
        gasZ: 0.88,
        liquidFlowRate: 80,
        liquidDensity: 820,
        flagEmulsion: true,
      },
      {
        ...DEFAULT_CASE,
        id: "max",
        name: "Maximum",
        caseType: "maximum",
        gasFlowRate: 7500,
        gasFlowBasis: "actual",
        gasDensity: 28,
        gasMW: 20,
        gasPressure: 35,
        gasTemperature: 50,
        gasZ: 0.87,
        liquidFlowRate: 120,
        liquidDensity: 810,
      },
    ],
    config: {
      ...DEFAULT_CONFIG,
      orientation: "horizontal",
      phaseMode: "three_phase",
      mistEliminator: "vane_pack",
      kValue: 0.12,
      kMode: "typical",
      levelFraction: 0.5,
      foamFactor: 0.7,
      applyPressureCorrection: true,
    },
    holdup: {
      ...DEFAULT_HOLDUP,
      residenceTime: 5,
      surgeTime: 3,
      oilRetentionTime: 5,
      waterRetentionTime: 10,
      oilWaterSplitRatio: 0.7,
    },
  },
];
