import { PI } from "./constants";

export type KODrumOrientation = "vertical" | "horizontal";
export type InternalsType = "bare" | "wire_mesh";
export type ScenarioType = "normal_flaring" | "fire_case" | "blowdown" | "depressuring" | "blocked_outlet" | "custom";

export interface CalcStep {
  label: string;
  equation: string;
  substitution: string;
  result: number;
  unit: string;
}

export interface FlareScenario {
  id: string;
  name: string;
  scenarioType: ScenarioType;
  gasFlowRate: number;
  gasFlowBasis: "actual" | "standard";
  gasDensity: number;
  gasMW: number;
  gasPressure: number;
  gasTemperature: number;
  gasZ: number;
  liquidCarryoverRate: number;
  liquidDensity: number;
  duration: number;
  notes: string;
}

export interface KODrumConfig {
  orientation: KODrumOrientation;
  internals: InternalsType;
  kValue: number;
  kMode: "user" | "typical";
  levelFraction: number;
  maxDiameter: number;
  maxLD: number;
  drainLineSize: number;
  drainRate: number;
  allowances: KODrumAllowances;
  applyPressureCorrection: boolean;
}

export interface KODrumAllowances {
  inletZone: number;
  disengagementZone: number;
  mistEliminatorZone: number;
  sumpZone: number;
  nozzleZone: number;
}

export interface HoldupBasis {
  holdupTime: number;
  rainoutFraction: number;
}

export interface ProjectSetup {
  caseName: string;
  engineer: string;
  date: string;
  showIntermediateSteps: boolean;
  showAssumptionsLog: boolean;
}

export interface ScenarioGasResult {
  scenarioId: string;
  scenarioName: string;
  Qg_actual_m3s: number;
  v_s_max: number;
  A_req: number;
  D_req_mm: number;
  steps: CalcStep[];
}

export interface LiquidAccumResult {
  scenarioVolumes: { scenarioId: string; scenarioName: string; volume_m3: number }[];
  governingLiquidScenarioId: string;
  governingAccumulation_m3: number;
  totalAccumulation_m3: number;
  rainoutVolume_m3: number;
  totalWithRainout_m3: number;
  drainVolume_m3: number;
  netAccumulation_m3: number;
  drainAdequate: boolean;
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
  mistFaceVelocity: number;
  minimumDiameterApplied: boolean;
  steps: CalcStep[];
}

export type EngFlag =
  | "TRANSIENT_REVIEW"
  | "DYNAMIC_SIM_REQUIRED"
  | "DRAIN_INADEQUATE"
  | "CONSERVATIVE_K"
  | "BARE_VESSEL"
  | "HIGH_LIQUID_ACCUMULATION"
  | "K_USER_ASSUMED"
  | "K_TYPICAL_MODE"
  | "VENDOR_MIST_CONFIRM"
  | "LD_OUT_OF_RANGE"
  | "GAS_VELOCITY_EXCEEDED"
  | "HIGH_LIQUID_LEVEL"
  | "HIGH_PRESSURE"
  | "MINIMUM_DIAMETER_APPLIED";

export const FLAG_LABELS: Record<EngFlag, string> = {
  TRANSIENT_REVIEW: "Flare KO drum service — transient loads may govern; dynamic simulation review required",
  DYNAMIC_SIM_REQUIRED: "Multiple relief scenarios with overlapping timing — dynamic simulation recommended",
  DRAIN_INADEQUATE: "Drain rate is insufficient to handle liquid accumulation rate — increase drain capacity",
  CONSERVATIVE_K: "Conservative K-factor applied per API 521 for flare KO service",
  BARE_VESSEL: "Bare vessel (no mist eliminator) — lowest K-factor, largest diameter expected",
  HIGH_LIQUID_ACCUMULATION: "Total liquid accumulation exceeds 5 m³ — verify vessel volume and drain system",
  K_USER_ASSUMED: "K value is user-assumed — confirm with vendor/internals data",
  K_TYPICAL_MODE: "K value from typical API 521 guidance — confirm for specific service",
  VENDOR_MIST_CONFIRM: "Mist eliminator selection requires vendor confirmation",
  LD_OUT_OF_RANGE: "L/D ratio outside typical range (2–5)",
  GAS_VELOCITY_EXCEEDED: "Actual gas velocity exceeds Souders-Brown limit",
  HIGH_LIQUID_LEVEL: "Liquid level exceeds 75% — increase vessel size or drain capacity",
  HIGH_PRESSURE: "High pressure service — wall thickness and weight may govern",
  MINIMUM_DIAMETER_APPLIED: "API 521 minimum diameter of 1500 mm applied — calculated diameter was smaller",
};

export const FLAG_SEVERITY: Record<EngFlag, "info" | "warning" | "error"> = {
  TRANSIENT_REVIEW: "warning",
  DYNAMIC_SIM_REQUIRED: "warning",
  DRAIN_INADEQUATE: "error",
  CONSERVATIVE_K: "info",
  BARE_VESSEL: "info",
  HIGH_LIQUID_ACCUMULATION: "warning",
  K_USER_ASSUMED: "info",
  K_TYPICAL_MODE: "info",
  VENDOR_MIST_CONFIRM: "info",
  LD_OUT_OF_RANGE: "warning",
  GAS_VELOCITY_EXCEEDED: "error",
  HIGH_LIQUID_LEVEL: "error",
  HIGH_PRESSURE: "info",
  MINIMUM_DIAMETER_APPLIED: "info",
};

export interface FlareKODrumFullResult {
  project: ProjectSetup;
  scenarios: FlareScenario[];
  config: KODrumConfig;
  holdup: HoldupBasis;
  scenarioResults: ScenarioGasResult[];
  governingScenarioId: string;
  governingReason: string;
  liquidAccum: LiquidAccumResult;
  geometry: GeometryResult;
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

export const DEFAULT_SCENARIO: FlareScenario = {
  id: "scenario_1",
  name: "Normal Flaring",
  scenarioType: "normal_flaring",
  gasFlowRate: 0,
  gasFlowBasis: "actual",
  gasDensity: 0,
  gasMW: 28,
  gasPressure: 1.05,
  gasTemperature: 50,
  gasZ: 1.0,
  liquidCarryoverRate: 0,
  liquidDensity: 800,
  duration: 30,
  notes: "",
};

export const DEFAULT_ALLOWANCES: KODrumAllowances = {
  inletZone: 0.3,
  disengagementZone: 0.6,
  mistEliminatorZone: 0.15,
  sumpZone: 0.3,
  nozzleZone: 0.15,
};

export const DEFAULT_CONFIG: KODrumConfig = {
  orientation: "vertical",
  internals: "bare",
  kValue: 0.035,
  kMode: "typical",
  levelFraction: 0.5,
  maxDiameter: 0,
  maxLD: 0,
  drainLineSize: 4,
  drainRate: 0,
  allowances: { ...DEFAULT_ALLOWANCES },
  applyPressureCorrection: false,
};

export const DEFAULT_HOLDUP: HoldupBasis = {
  holdupTime: 20,
  rainoutFraction: 0,
};

export const K_GUIDANCE_KO: Record<string, { range: [number, number]; typical: number; notes: string }> = {
  "Bare vessel (no internals)": { range: [0.02, 0.05], typical: 0.035, notes: "Conservative gravity settling per API 521" },
  "With wire mesh pad": { range: [0.04, 0.08], typical: 0.061, notes: "Mist eliminator installed — confirm with vendor" },
};

function computeKPressureCorrection(P_barg: number): { Cp: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  let Cp: number;
  if (P_barg <= 6.9) {
    Cp = 1.0;
  } else {
    Cp = Math.max(0.5, 1.0 - 0.00483 * (P_barg - 6.9));
  }
  steps.push({
    label: "Pressure correction (GPSA Fig 7-9)",
    equation: P_barg <= 6.9
      ? "Cp = 1.0 (P \u2264 6.9 barg)"
      : "Cp = max(0.5, 1.0 \u2212 0.00483 \u00D7 (P \u2212 6.9))",
    substitution: P_barg <= 6.9
      ? `Cp = 1.0 (P = ${P_barg.toFixed(2)} barg)`
      : `Cp = max(0.5, 1.0 \u2212 0.00483 \u00D7 (${P_barg.toFixed(2)} \u2212 6.9))`,
    result: Cp,
    unit: "-",
  });
  return { Cp, steps };
}

function segmentAreaFraction(h_over_D: number): number {
  if (h_over_D <= 0) return 0;
  if (h_over_D >= 1) return 1;
  const theta = 2 * Math.acos(1 - 2 * h_over_D);
  return (theta - Math.sin(theta)) / (2 * PI);
}

function gasAreaFractionForLevel(levelFraction: number): number {
  return 1 - segmentAreaFraction(levelFraction);
}

function computeActualGasFlow(s: FlareScenario): { Qg_m3s: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  let Qg_m3s: number;

  if (s.gasFlowBasis === "actual") {
    Qg_m3s = s.gasFlowRate / 3600;
    steps.push({
      label: "Gas flow (actual)",
      equation: "Q_g = Q_input / 3600",
      substitution: `Q_g = ${s.gasFlowRate} / 3600`,
      result: Qg_m3s,
      unit: "m\u00B3/s",
    });
  } else {
    if (s.gasPressure <= 0 || s.gasTemperature <= 0 || s.gasMW <= 0) {
      throw new Error(`Scenario "${s.name}": P, T, and MW required to convert standard to actual gas flow`);
    }
    const P_Pa = s.gasPressure * 1e5;
    const T_K = s.gasTemperature + 273.15;
    const Z = s.gasZ > 0 ? s.gasZ : 1.0;
    const Qstd_m3s = s.gasFlowRate / 3600;
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
  }

  return { Qg_m3s, steps };
}

function computeSoudersBrown(
  K: number, rhoL: number, rhoG: number, Qg_m3s: number, gasAreaFrac: number, label: string
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
    label: `${label}: A_req (gas)`,
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

  return { D_m, gasAreaFrac, v_actual, steps };
}

function computeLiquidAccumulation(
  scenarios: FlareScenario[],
  holdup: HoldupBasis,
  config: KODrumConfig,
): LiquidAccumResult {
  const steps: CalcStep[] = [];
  const scenarioVolumes: { scenarioId: string; scenarioName: string; volume_m3: number }[] = [];

  let governingLiquidScenarioId = scenarios[0].id;
  let governingAccumulation = 0;
  let governingDuration = scenarios[0].duration;

  for (const s of scenarios) {
    const Ql_m3s = s.liquidCarryoverRate / 3600;
    const vol = Ql_m3s * s.duration * 60;
    scenarioVolumes.push({ scenarioId: s.id, scenarioName: s.name, volume_m3: vol });

    steps.push({
      label: `${s.name}: liquid accumulation`,
      equation: "V_i = Q_l,i / 3600 \u00D7 t_i \u00D7 60",
      substitution: `V_i = ${s.liquidCarryoverRate} / 3600 \u00D7 ${s.duration} \u00D7 60`,
      result: vol,
      unit: "m\u00B3",
    });

    if (vol > governingAccumulation) {
      governingAccumulation = vol;
      governingLiquidScenarioId = s.id;
      governingDuration = s.duration;
    }
  }

  const governingScenarioName = scenarios.find(s => s.id === governingLiquidScenarioId)?.name || "Unknown";

  steps.push({
    label: "Governing liquid scenario",
    equation: "V_governing = max(V_i)",
    substitution: `V_governing = ${governingScenarioName} = ${governingAccumulation.toFixed(4)}`,
    result: governingAccumulation,
    unit: "m\u00B3",
  });

  const totalAccum = governingAccumulation;

  const rainoutVolume = totalAccum * holdup.rainoutFraction;
  if (holdup.rainoutFraction > 0) {
    steps.push({
      label: "Rainout volume",
      equation: "V_rainout = V_governing \u00D7 f_rainout",
      substitution: `V_rainout = ${totalAccum.toFixed(4)} \u00D7 ${holdup.rainoutFraction}`,
      result: rainoutVolume,
      unit: "m\u00B3",
    });
  }

  const totalWithRainout = totalAccum + rainoutVolume;
  steps.push({
    label: "Total with rainout",
    equation: "V_total = V_governing + V_rainout",
    substitution: `V_total = ${totalAccum.toFixed(4)} + ${rainoutVolume.toFixed(4)}`,
    result: totalWithRainout,
    unit: "m\u00B3",
  });

  const drainVolume = config.drainRate > 0 ? (config.drainRate / 3600) * governingDuration * 60 : 0;
  if (config.drainRate > 0) {
    steps.push({
      label: "Drain volume (over governing duration)",
      equation: "V_drain = Q_drain / 3600 \u00D7 t_governing \u00D7 60",
      substitution: `V_drain = ${config.drainRate} / 3600 \u00D7 ${governingDuration} \u00D7 60`,
      result: drainVolume,
      unit: "m\u00B3",
    });
  }

  const netAccum = Math.max(0, totalWithRainout - drainVolume);
  steps.push({
    label: "Net liquid accumulation",
    equation: "V_net = max(0, V_total \u2212 V_drain)",
    substitution: `V_net = max(0, ${totalWithRainout.toFixed(4)} \u2212 ${drainVolume.toFixed(4)})`,
    result: netAccum,
    unit: "m\u00B3",
  });

  const maxLiquidRate = Math.max(...scenarios.map(s => s.liquidCarryoverRate));
  const drainAdequate = config.drainRate <= 0 ? (maxLiquidRate <= 0) : config.drainRate >= maxLiquidRate;

  if (!drainAdequate) {
    steps.push({
      label: "Drain adequacy",
      equation: "Q_drain vs max(Q_l,i)",
      substitution: `${config.drainRate.toFixed(2)} < ${maxLiquidRate.toFixed(2)} \u2014 INADEQUATE`,
      result: config.drainRate,
      unit: "m\u00B3/h",
    });
  }

  return {
    scenarioVolumes,
    governingLiquidScenarioId,
    governingAccumulation_m3: governingAccumulation,
    totalAccumulation_m3: totalAccum,
    rainoutVolume_m3: rainoutVolume,
    totalWithRainout_m3: totalWithRainout,
    drainVolume_m3: drainVolume,
    netAccumulation_m3: netAccum,
    drainAdequate,
    steps,
  };
}

function assembleGeometry(
  D_gas_mm: number,
  liquidVol: number,
  config: KODrumConfig,
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

  const API_521_MIN_DIAMETER_MM = 1500;
  let minimumDiameterApplied = false;
  if (D_mm < API_521_MIN_DIAMETER_MM) {
    minimumDiameterApplied = true;
    steps.push({
      label: "API 521 minimum diameter",
      equation: "D = max(D_calc, 1500 mm)",
      substitution: `D = max(${D_mm}, ${API_521_MIN_DIAMETER_MM})`,
      result: API_521_MIN_DIAMETER_MM,
      unit: "mm",
    });
    D_mm = API_521_MIN_DIAMETER_MM;
  }

  const D_m = D_mm / 1000;
  const A_vessel = (PI / 4) * D_m * D_m;
  let L_mm: number;
  let liquidLevelPercent: number;
  let gasAreaFraction: number;

  if (isVertical) {
    const liquidHeight = liquidVol > 0 ? liquidVol / A_vessel : 0;
    const allow = config.allowances;
    const totalHeight = liquidHeight + allow.inletZone + allow.disengagementZone +
      (config.internals === "wire_mesh" ? allow.mistEliminatorZone : 0) +
      allow.sumpZone + allow.nozzleZone;

    L_mm = Math.ceil(totalHeight * 1000 / 50) * 50;
    L_mm = Math.max(L_mm, 1000);
    liquidLevelPercent = L_mm > 0 ? (liquidHeight / (L_mm / 1000)) * 100 : 0;
    gasAreaFraction = 1.0;

    steps.push({
      label: "Liquid height",
      equation: "h_liq = V_liq / A_vessel",
      substitution: `h_liq = ${liquidVol.toFixed(4)} / ${A_vessel.toFixed(6)}`,
      result: liquidHeight,
      unit: "m",
    });
    const allowTotal = allow.inletZone + allow.disengagementZone +
      (config.internals === "wire_mesh" ? allow.mistEliminatorZone : 0) +
      allow.sumpZone + allow.nozzleZone;
    steps.push({
      label: "Allowances total",
      equation: "h_allow = inlet + disengage + mist + sump + nozzle",
      substitution: `h_allow = ${allow.inletZone} + ${allow.disengagementZone} + ${config.internals === "wire_mesh" ? allow.mistEliminatorZone : 0} + ${allow.sumpZone} + ${allow.nozzleZone}`,
      result: allowTotal,
      unit: "m",
    });
    steps.push({
      label: "Total vessel height",
      equation: "H = h_liq + h_allow",
      substitution: `H = ${liquidHeight.toFixed(3)} + ${allowTotal.toFixed(3)}`,
      result: L_mm / 1000,
      unit: "m",
    });
  } else {
    const levelFrac = config.levelFraction;
    const liquidAreaFrac = segmentAreaFraction(levelFrac);
    gasAreaFraction = 1 - liquidAreaFrac;

    const D_liq_m = liquidVol > 0 && liquidAreaFrac > 0
      ? Math.pow(liquidVol / (liquidAreaFrac * PI / 4), 0.5)
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

    if (liqAreaPerM > 0 && liquidVol > 0) {
      const L_liq_m = liquidVol / liqAreaPerM;
      const L_liq_mm = L_liq_m * 1000;
      const allow = config.allowances;
      const L_min_mm = L_liq_mm + (allow.inletZone + allow.nozzleZone) * 1000;
      if (L_min_mm > L_target) L_target = L_min_mm;
    }

    L_mm = Math.ceil(L_target / 50) * 50;
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
      substitution: `D_liq = \u221A(${liquidVol.toFixed(4)} / (${liquidAreaFrac.toFixed(4)} \u00D7 ${(PI / 4).toFixed(4)}))`,
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
  const vesselVol = (PI / 4) * (D_mm / 1000) ** 2 * L_m;
  const actualGasVelocity = gasAreaFraction > 0 ? Qg_m3s / (gasAreaFraction * (PI / 4) * (D_mm / 1000) ** 2) : 0;
  const mistFaceVelocity = Qg_m3s / ((PI / 4) * (D_mm / 1000) ** 2);
  const LD_ratio = D_mm > 0 ? L_mm / D_mm : 0;

  steps.push({ label: "Vessel volume", equation: "V = \u03C0D\u00B2/4 \u00D7 L", substitution: `V = \u03C0\u00D7${(D_mm / 1000).toFixed(3)}\u00B2/4 \u00D7 ${L_m.toFixed(3)}`, result: vesselVol, unit: "m\u00B3" });
  steps.push({ label: "L/D ratio", equation: "L/D", substitution: `${L_mm} / ${D_mm}`, result: LD_ratio, unit: "-" });
  steps.push({ label: "Actual gas velocity", equation: "v_gas = Q_g / A_gas", substitution: `v_gas = ${Qg_m3s.toFixed(6)} / ${(gasAreaFraction * (PI / 4) * (D_mm / 1000) ** 2).toFixed(6)}`, result: actualGasVelocity, unit: "m/s" });
  steps.push({ label: "Mist eliminator face velocity", equation: "v_face = Q_g / A_vessel", substitution: `v_face = ${Qg_m3s.toFixed(6)} / ${((PI / 4) * (D_mm / 1000) ** 2).toFixed(6)}`, result: mistFaceVelocity, unit: "m/s" });

  return {
    D_mm,
    L_mm,
    D_m: D_mm / 1000,
    L_m,
    vesselVolume_m3: vesselVol,
    liquidVolume_m3: liquidVol,
    gasAreaFraction,
    actualGasVelocity,
    liquidLevelPercent,
    LD_ratio,
    mistFaceVelocity,
    minimumDiameterApplied,
    steps,
  };
}

function collectFlags(
  scenarios: FlareScenario[],
  config: KODrumConfig,
  geometry: GeometryResult,
  liquidAccum: LiquidAccumResult,
  v_s_max_governing: number,
): EngFlag[] {
  const flags: EngFlag[] = [];

  flags.push("TRANSIENT_REVIEW");
  flags.push("CONSERVATIVE_K");

  if (scenarios.length > 1) flags.push("DYNAMIC_SIM_REQUIRED");
  if (config.internals === "bare") flags.push("BARE_VESSEL");

  if (config.kMode === "user") flags.push("K_USER_ASSUMED");
  if (config.kMode === "typical") flags.push("K_TYPICAL_MODE");
  if (config.internals === "wire_mesh") flags.push("VENDOR_MIST_CONFIRM");

  if (!liquidAccum.drainAdequate) flags.push("DRAIN_INADEQUATE");
  if (liquidAccum.totalWithRainout_m3 > 5) flags.push("HIGH_LIQUID_ACCUMULATION");

  if (geometry.LD_ratio < 2 || geometry.LD_ratio > 5) flags.push("LD_OUT_OF_RANGE");
  if (geometry.actualGasVelocity > v_s_max_governing) flags.push("GAS_VELOCITY_EXCEEDED");
  if (geometry.liquidLevelPercent > 75) flags.push("HIGH_LIQUID_LEVEL");

  const anyHighPressure = scenarios.some(s => s.gasPressure > 30);
  if (anyHighPressure) flags.push("HIGH_PRESSURE");

  if (geometry.minimumDiameterApplied) flags.push("MINIMUM_DIAMETER_APPLIED");

  return flags;
}

function generateRecommendations(flags: EngFlag[], config: KODrumConfig): string[] {
  const recs: string[] = [];

  if (flags.includes("TRANSIENT_REVIEW")) {
    recs.push("Review transient relief loads with dynamic simulation to confirm steady-state sizing is adequate.");
  }
  if (flags.includes("DYNAMIC_SIM_REQUIRED")) {
    recs.push("Multiple relief scenarios identified — consider dynamic simulation to evaluate overlapping events.");
  }
  if (flags.includes("DRAIN_INADEQUATE")) {
    recs.push("Increase drain line size or add pumped drain to handle liquid accumulation rate.");
  }
  if (flags.includes("BARE_VESSEL")) {
    recs.push("Bare vessel design results in larger diameter. Consider adding wire mesh pad if pressure drop is acceptable.");
  }
  if (flags.includes("HIGH_LIQUID_ACCUMULATION")) {
    recs.push("High liquid accumulation — verify drain system capacity and consider intermediate drain tank.");
  }
  if (flags.includes("GAS_VELOCITY_EXCEEDED")) {
    recs.push("Gas velocity exceeds Souders-Brown limit — increase vessel diameter or reduce gas flow.");
  }
  if (flags.includes("HIGH_LIQUID_LEVEL")) {
    recs.push("Liquid level exceeds 75% of vessel — increase vessel diameter or improve drain capacity.");
  }
  if (flags.includes("LD_OUT_OF_RANGE")) {
    recs.push("L/D ratio outside typical 2\u20135 range — review vessel economics and plot space constraints.");
  }
  if (config.internals === "wire_mesh") {
    recs.push("Confirm mist eliminator specification with vendor — pressure drop and capacity to be verified.");
  }
  if (flags.includes("MINIMUM_DIAMETER_APPLIED")) {
    recs.push("API 521 minimum diameter of 1500 mm was applied — calculated gas-capacity diameter was smaller. Verify if project-specific requirements allow a smaller vessel.");
  }

  return recs;
}

function generateNextSteps(flags: EngFlag[]): string[] {
  const steps: string[] = [
    "Confirm relief loads with process simulation (steady-state and dynamic).",
    "Verify fluid properties (density, MW, viscosity) with PVT analysis.",
    "Issue vessel datasheet for mechanical design (wall thickness, nozzle sizing).",
    "Coordinate with flare system designer for header sizing and back-pressure.",
    "Review drain system design — gravity vs. pumped, routing, and material selection.",
  ];

  if (flags.includes("DYNAMIC_SIM_REQUIRED")) {
    steps.push("Perform dynamic simulation for overlapping relief scenarios.");
  }
  if (flags.includes("HIGH_PRESSURE")) {
    steps.push("Perform wall thickness calculation per ASME VIII Div 1 or 2.");
  }

  return steps;
}

function generateAssumptions(config: KODrumConfig, holdup: HoldupBasis): string[] {
  const assumptions: string[] = [
    "Souders-Brown correlation used for gas capacity sizing per API 521.",
    `K-factor = ${config.kValue} (${config.kMode === "typical" ? "typical API 521 guidance" : "user-specified"}).`,
    `Vessel orientation: ${config.orientation}.`,
    `Internals: ${config.internals === "bare" ? "bare vessel (no mist eliminator)" : "wire mesh pad"}.`,
    "Liquid accumulation based on governing (largest) single-scenario accumulation (non-concurrent).",
    `Holdup time: ${holdup.holdupTime} minutes.`,
    "Vessel sized to contain net liquid accumulation (after drain credit).",
    "Steady-state sizing — transient peaks may require additional verification.",
    "Vessel heads (2:1 ellipsoidal assumed) not included in volume calculation.",
    "Corrosion allowance, insulation, and weight not included in preliminary sizing.",
    "API 521 minimum vessel diameter of 1500 mm enforced for flare KO drum service.",
    `Pressure correction on K-factor: ${config.applyPressureCorrection ? "enabled" : "disabled (typical for near-atmospheric flare KO service)"}.`,
  ];

  if (holdup.rainoutFraction > 0) {
    assumptions.push(`Rainout fraction: ${(holdup.rainoutFraction * 100).toFixed(1)}% of accumulated liquid.`);
  }

  if (config.drainRate > 0) {
    assumptions.push(`Drain rate: ${config.drainRate} m\u00B3/h credited against liquid accumulation.`);
  }

  return assumptions;
}

export function calculateFlareKODrum(
  project: ProjectSetup,
  scenarios: FlareScenario[],
  config: KODrumConfig,
  holdup: HoldupBasis,
): FlareKODrumFullResult {
  if (scenarios.length === 0) {
    throw new Error("At least one scenario is required.");
  }

  const isVertical = config.orientation === "vertical";
  const gasAreaFrac = isVertical ? 1.0 : gasAreaFractionForLevel(config.levelFraction);

  const scenarioResults: ScenarioGasResult[] = [];
  let governingScenarioId = scenarios[0].id;
  let maxDReq = 0;
  let v_s_max_governing = 0;

  for (const s of scenarios) {
    const { Qg_m3s, steps: flowSteps } = computeActualGasFlow(s);

    let D_req_mm: number;
    let v_s_max: number;
    let A_req: number;
    let allSteps: CalcStep[] = [...flowSteps];

    let K_eff = config.kValue;
    if (config.applyPressureCorrection) {
      const P_barg = s.gasPressure - 1.01325;
      const { Cp, steps: cpSteps } = computeKPressureCorrection(P_barg);
      K_eff = config.kValue * Cp;
      allSteps = [...allSteps, ...cpSteps];
      allSteps.push({
        label: "Effective K (pressure-corrected)",
        equation: "K_eff = K_base \u00D7 Cp",
        substitution: `K_eff = ${config.kValue} \u00D7 ${Cp.toFixed(4)}`,
        result: K_eff,
        unit: "-",
      });
    }

    if (isVertical) {
      const sb = computeSoudersBrown(K_eff, s.liquidDensity, s.gasDensity, Qg_m3s, gasAreaFrac, s.name);
      D_req_mm = sb.D_req_m * 1000;
      v_s_max = sb.v_s_max;
      A_req = sb.A_req;
      allSteps = [...allSteps, ...sb.steps];
    } else {
      const hz = solveHorizontalDiameter(K_eff, s.liquidDensity, s.gasDensity, Qg_m3s, config.levelFraction);
      D_req_mm = hz.D_m * 1000;
      v_s_max = K_eff * Math.sqrt((s.liquidDensity - s.gasDensity) / s.gasDensity);
      A_req = Qg_m3s / v_s_max;
      allSteps = [...allSteps, ...hz.steps];
    }

    scenarioResults.push({
      scenarioId: s.id,
      scenarioName: s.name,
      Qg_actual_m3s: Qg_m3s,
      v_s_max,
      A_req,
      D_req_mm,
      steps: allSteps,
    });

    if (D_req_mm > maxDReq) {
      maxDReq = D_req_mm;
      governingScenarioId = s.id;
      v_s_max_governing = v_s_max;
    }
  }

  const governingScenario = scenarios.find(s => s.id === governingScenarioId)!;
  const governingReason = `Scenario "${governingScenario.name}" requires the largest diameter (${maxDReq.toFixed(0)} mm)`;

  const liquidAccum = computeLiquidAccumulation(scenarios, holdup, config);

  const liquidVolForGeometry = Math.max(liquidAccum.netAccumulation_m3, liquidAccum.totalWithRainout_m3 * (holdup.holdupTime / Math.max(1, scenarios.reduce((sum, s) => sum + s.duration, 0))));
  const designLiquidVol = Math.max(liquidAccum.netAccumulation_m3, liquidVolForGeometry);

  const govQg = scenarioResults.find(r => r.scenarioId === governingScenarioId)!.Qg_actual_m3s;
  const geometry = assembleGeometry(maxDReq, designLiquidVol, config, govQg);

  const flags = collectFlags(scenarios, config, geometry, liquidAccum, v_s_max_governing);
  const warnings = flags.map(f => FLAG_LABELS[f]);
  const recommendations = generateRecommendations(flags, config);
  const nextSteps = generateNextSteps(flags);
  const assumptions = generateAssumptions(config, holdup);

  return {
    project,
    scenarios,
    config,
    holdup,
    scenarioResults,
    governingScenarioId,
    governingReason,
    liquidAccum,
    geometry,
    flags,
    warnings,
    recommendations,
    nextSteps,
    assumptions,
  };
}

export const TEST_CASES = {
  verticalFlareKO: {
    project: {
      caseName: "Flare KO Drum — Test Case",
      engineer: "Process Engineer",
      date: "2024-01-15",
      showIntermediateSteps: true,
      showAssumptionsLog: true,
    },
    scenarios: [
      {
        id: "scenario_1",
        name: "Normal Flaring",
        scenarioType: "normal_flaring" as ScenarioType,
        gasFlowRate: 5000,
        gasFlowBasis: "actual" as const,
        gasDensity: 3.5,
        gasMW: 28,
        gasPressure: 1.2,
        gasTemperature: 60,
        gasZ: 1.0,
        liquidCarryoverRate: 2,
        liquidDensity: 800,
        duration: 60,
        notes: "Continuous normal flaring",
      },
      {
        id: "scenario_2",
        name: "Blowdown",
        scenarioType: "blowdown" as ScenarioType,
        gasFlowRate: 25000,
        gasFlowBasis: "actual" as const,
        gasDensity: 5.0,
        gasMW: 30,
        gasPressure: 2.0,
        gasTemperature: 80,
        gasZ: 0.95,
        liquidCarryoverRate: 10,
        liquidDensity: 750,
        duration: 15,
        notes: "Emergency blowdown scenario",
      },
    ],
    config: { ...DEFAULT_CONFIG },
    holdup: { ...DEFAULT_HOLDUP },
  },
};
