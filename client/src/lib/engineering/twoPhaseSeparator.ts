import { PI } from "./constants";

export type TwoPhaseSepOrientation = "vertical" | "horizontal";
export type ServiceType = "gas_scrubber" | "inlet_separator" | "slug_catcher" | "test_separator";
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

export interface TwoPhaseSepConfig {
  orientation: TwoPhaseSepOrientation;
  serviceType: ServiceType;
  inletDevice: InletDeviceType;
  mistEliminator: MistEliminatorType;
  kValue: number;
  kMode: "user" | "typical";
  levelFraction: number;
  maxDiameter: number;
  maxLD: number;
  allowances: VesselAllowances;
  enableDropletCheck: boolean;
  dropletDiameter_um: number;
}

export interface VesselAllowances {
  inletZone: number;
  disengagementZone: number;
  mistEliminatorZone: number;
  sumpZone: number;
  nozzleZone: number;
}

export interface HoldupBasis {
  residenceTime: number;
  surgeTime: number;
  slugVolume: number;
  drainRate: number;
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
  dropletSettlingVelocity?: number;
  actualGasVelocity?: number;
  dropletCarryoverRisk?: boolean;
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
  | "PROPERTY_UNCERTAINTY"
  | "HIGH_GAS_VELOCITY"
  | "SLUG_CATCHER_REQUIRED"
  | "DROPLET_CARRYOVER_RISK"
  | "K_USER_ASSUMED"
  | "K_TYPICAL_MODE"
  | "VENDOR_MIST_CONFIRM"
  | "LD_OUT_OF_RANGE"
  | "GAS_VELOCITY_EXCEEDED"
  | "HIGH_LIQUID_LEVEL";

export const FLAG_LABELS: Record<EngFlag, string> = {
  PROPERTY_UNCERTAINTY: "Fluid property uncertainty — validate with PVT data or lab analysis",
  HIGH_GAS_VELOCITY: "Gas velocity is high relative to Souders\u2013Brown limit — review internals selection",
  SLUG_CATCHER_REQUIRED: "Slug catcher service — ensure slug volume is adequately accommodated",
  DROPLET_CARRYOVER_RISK: "Droplet settling velocity is less than actual gas velocity — carryover risk",
  K_USER_ASSUMED: "K value is user-assumed — confirm with vendor/internals data",
  K_TYPICAL_MODE: "K value from typical GPSA guidance — confirm for specific service",
  VENDOR_MIST_CONFIRM: "Mist eliminator selection requires vendor confirmation",
  LD_OUT_OF_RANGE: "L/D ratio outside typical range",
  GAS_VELOCITY_EXCEEDED: "Actual gas velocity exceeds Souders\u2013Brown limit",
  HIGH_LIQUID_LEVEL: "Liquid level exceeds 75% — increase vessel size or reduce retention",
};

export const FLAG_SEVERITY: Record<EngFlag, "info" | "warning" | "error"> = {
  PROPERTY_UNCERTAINTY: "info",
  HIGH_GAS_VELOCITY: "warning",
  SLUG_CATCHER_REQUIRED: "warning",
  DROPLET_CARRYOVER_RISK: "warning",
  K_USER_ASSUMED: "info",
  K_TYPICAL_MODE: "info",
  VENDOR_MIST_CONFIRM: "info",
  LD_OUT_OF_RANGE: "warning",
  GAS_VELOCITY_EXCEEDED: "error",
  HIGH_LIQUID_LEVEL: "error",
};

export interface TwoPhaseSepFullResult {
  project: ProjectSetup;
  cases: OperatingCase[];
  config: TwoPhaseSepConfig;
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

export const DEFAULT_CONFIG: TwoPhaseSepConfig = {
  orientation: "vertical",
  serviceType: "gas_scrubber",
  inletDevice: "diverter",
  mistEliminator: "wire_mesh",
  kValue: 0.07,
  kMode: "user",
  levelFraction: 0.5,
  maxDiameter: 0,
  maxLD: 0,
  allowances: { ...DEFAULT_ALLOWANCES },
  enableDropletCheck: false,
  dropletDiameter_um: 150,
};

export const DEFAULT_HOLDUP: HoldupBasis = {
  residenceTime: 2,
  surgeTime: 1,
  slugVolume: 0,
  drainRate: 0,
};

export const K_GUIDANCE_GPSA: Record<string, { range: [number, number]; typical: number; notes: string }> = {
  "Vertical \u2014 No internals": { range: [0.03, 0.06], typical: 0.04, notes: "Gravity settling only (GPSA Sec 7)" },
  "Vertical \u2014 Wire mesh pad": { range: [0.05, 0.10], typical: 0.07, notes: "Most common for gas scrubbers (GPSA)" },
  "Vertical \u2014 Vane pack": { range: [0.07, 0.12], typical: 0.10, notes: "Higher throughput, larger \u0394P (GPSA)" },
  "Horizontal \u2014 No internals": { range: [0.04, 0.08], typical: 0.06, notes: "Gravity settling only (GPSA)" },
  "Horizontal \u2014 Wire mesh pad": { range: [0.07, 0.12], typical: 0.10, notes: "Common inlet separator (GPSA)" },
  "Horizontal \u2014 Vane pack": { range: [0.10, 0.15], typical: 0.12, notes: "Higher throughput (GPSA)" },
};

function segmentAreaFraction(h_over_D: number): number {
  if (h_over_D <= 0) return 0;
  if (h_over_D >= 1) return 1;
  const h = h_over_D;
  const theta = 2 * Math.acos(1 - 2 * h);
  return (theta - Math.sin(theta)) / (2 * PI);
}

function gasAreaFractionForLevel(levelFraction: number): number {
  return 1 - segmentAreaFraction(levelFraction);
}

function computeActualGasFlow(c: OperatingCase): { Qg_m3s: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  let Qg_m3s: number;

  if (c.gasFlowBasis === "actual") {
    Qg_m3s = c.gasFlowRate / 3600;
    steps.push({ label: "Gas flow (actual)", equation: "Q_g = Q_input / 3600", substitution: `Q_g = ${c.gasFlowRate} / 3600`, result: Qg_m3s, unit: "m\u00B3/s" });
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
    steps.push({ label: "Standard to actual", equation: "Q_act = Q_std \u00D7 (P_std/P) \u00D7 (T/T_std) \u00D7 Z", substitution: `Q_act = ${Qstd_m3s.toFixed(6)} \u00D7 (${P_std}/${P_Pa.toFixed(0)}) \u00D7 (${T_K.toFixed(2)}/${T_std}) \u00D7 ${Z}`, result: Qg_m3s, unit: "m\u00B3/s" });

    const rho_calc = (P_Pa * c.gasMW) / (8314.46 * T_K * Z);
    if (c.gasDensity <= 0 || Math.abs(c.gasDensity - rho_calc) / rho_calc > 0.2) {
      steps.push({ label: "Density cross-check", equation: "\u03C1_calc = P\u00B7MW / (R\u00B7T\u00B7Z)", substitution: `\u03C1_calc = ${P_Pa.toFixed(0)} \u00D7 ${c.gasMW} / (8314.46 \u00D7 ${T_K.toFixed(2)} \u00D7 ${Z})`, result: rho_calc, unit: "kg/m\u00B3" });
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
  steps.push({ label: `${label}: v_s,max`, equation: "v_s,max = K \u00D7 \u221A((\u03C1_l \u2212 \u03C1_g) / \u03C1_g)", substitution: `v_s,max = ${K} \u00D7 \u221A((${rhoL} \u2212 ${rhoG}) / ${rhoG})`, result: v_s_max, unit: "m/s" });

  const A_req = Qg_m3s / v_s_max;
  steps.push({ label: `${label}: A_req (total)`, equation: "A_req = Q_g / v_s,max", substitution: `A_req = ${Qg_m3s.toFixed(6)} / ${v_s_max.toFixed(4)}`, result: A_req, unit: "m\u00B2" });

  const A_vessel = A_req / gasAreaFrac;
  const D_req_m = Math.sqrt(4 * A_vessel / PI);
  steps.push({ label: `${label}: D_req`, equation: "D = \u221A(4 \u00D7 A_vessel / \u03C0)", substitution: `D = \u221A(4 \u00D7 ${A_vessel.toFixed(6)} / ${PI.toFixed(4)})`, result: D_req_m * 1000, unit: "mm" });

  return { v_s_max, A_req, D_req_m, steps };
}

function computeDropletSettling(
  rhoL: number, rhoG: number, gasViscosity_cP: number, dropletDiam_um: number,
  Qg_m3s: number, D_m: number
): { v_t: number; v_actual: number; carryoverRisk: boolean; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  const g = 9.80665;
  const d_m = dropletDiam_um * 1e-6;
  const mu_g = gasViscosity_cP * 1e-3;

  const v_t = ((rhoL - rhoG) * g * d_m * d_m) / (18 * mu_g);
  steps.push({
    label: "Droplet settling velocity (Stokes)",
    equation: "v_t = (\u03C1_l \u2212 \u03C1_g) \u00D7 g \u00D7 d\u00B2 / (18 \u00D7 \u03BC_g)",
    substitution: `v_t = (${rhoL} \u2212 ${rhoG}) \u00D7 ${g} \u00D7 (${d_m.toExponential(3)})\u00B2 / (18 \u00D7 ${mu_g.toExponential(3)})`,
    result: v_t,
    unit: "m/s",
  });

  const A_vessel = (PI / 4) * D_m * D_m;
  const v_actual = Qg_m3s / A_vessel;
  steps.push({ label: "Actual gas velocity", equation: "v_gas = Q_g / A_vessel", substitution: `v_gas = ${Qg_m3s.toFixed(6)} / ${A_vessel.toFixed(6)}`, result: v_actual, unit: "m/s" });

  const carryoverRisk = v_actual > v_t;
  if (carryoverRisk) {
    steps.push({ label: "Droplet check", equation: "v_gas > v_t \u2192 CARRYOVER RISK", substitution: `${v_actual.toFixed(4)} > ${v_t.toFixed(4)}`, result: v_actual, unit: "-" });
  } else {
    steps.push({ label: "Droplet check", equation: "v_gas \u2264 v_t \u2192 OK", substitution: `${v_actual.toFixed(4)} \u2264 ${v_t.toFixed(4)}`, result: v_actual, unit: "-" });
  }

  return { v_t, v_actual, carryoverRisk, steps };
}

function solveHorizontalDiameter(
  K: number, rhoL: number, rhoG: number, Qg_m3s: number, levelFraction: number
): { D_m: number; gasAreaFrac: number; v_actual: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  const v_s_max = K * Math.sqrt((rhoL - rhoG) / rhoG);
  const A_req = Qg_m3s / v_s_max;

  steps.push({ label: "Horizontal: v_s,max", equation: "v_s,max = K \u00D7 \u221A((\u03C1_l \u2212 \u03C1_g) / \u03C1_g)", substitution: `v_s,max = ${K} \u00D7 \u221A((${rhoL} \u2212 ${rhoG}) / ${rhoG})`, result: v_s_max, unit: "m/s" });
  steps.push({ label: "Horizontal: A_req (gas)", equation: "A_req = Q_g / v_s,max", substitution: `A_req = ${Qg_m3s.toFixed(6)} / ${v_s_max.toFixed(4)}`, result: A_req, unit: "m\u00B2" });

  const gasAreaFrac = gasAreaFractionForLevel(levelFraction);
  steps.push({ label: "Gas area fraction", equation: "f_gas = 1 \u2212 f_segment(h/D)", substitution: `f_gas = 1 \u2212 f_segment(${levelFraction})`, result: gasAreaFrac, unit: "-" });

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

  steps.push({ label: "Horizontal: D_req (iterative)", equation: "Solve D: f_gas \u00D7 \u03C0D\u00B2/4 \u2265 A_req", substitution: `${gasAreaFrac.toFixed(4)} \u00D7 \u03C0\u00D7${D_m.toFixed(4)}\u00B2/4 = ${A_gas_avail.toFixed(6)} \u2265 ${A_req.toFixed(6)}`, result: D_m * 1000, unit: "mm" });
  steps.push({ label: "Gas area available", equation: "A_gas = f_gas \u00D7 \u03C0D\u00B2/4", substitution: `A_gas = ${gasAreaFrac.toFixed(4)} \u00D7 \u03C0\u00D7${D_m.toFixed(4)}\u00B2/4`, result: A_gas_avail, unit: "m\u00B2" });

  return { D_m, gasAreaFrac, v_actual, steps };
}

function computeHoldup(
  cases: OperatingCase[],
  holdup: HoldupBasis,
  governingCaseId: string,
): { totalVolume_m3: number; holdupVolume_m3: number; surgeVolume_m3: number; slugVolume_m3: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  const govCase = cases.find(c => c.id === governingCaseId) || cases[0];

  let Ql_m3s = govCase.liquidFlowRate / 3600;
  if (govCase.liquidFlowBasis === "mass" && govCase.liquidDensity > 0) {
    Ql_m3s = (govCase.liquidFlowRate / govCase.liquidDensity) / 3600;
    steps.push({ label: "Liquid vol flow", equation: "Q_l = W_l / \u03C1_l / 3600", substitution: `Q_l = ${govCase.liquidFlowRate} / ${govCase.liquidDensity} / 3600`, result: Ql_m3s, unit: "m\u00B3/s" });
  } else {
    steps.push({ label: "Liquid vol flow", equation: "Q_l = Q_input / 3600", substitution: `Q_l = ${govCase.liquidFlowRate} / 3600`, result: Ql_m3s, unit: "m\u00B3/s" });
  }

  const holdupVolume = Ql_m3s * holdup.residenceTime * 60;
  steps.push({ label: "Holdup volume", equation: "V_hold = Q_l \u00D7 t_res \u00D7 60", substitution: `V_hold = ${Ql_m3s.toFixed(6)} \u00D7 ${holdup.residenceTime} \u00D7 60`, result: holdupVolume, unit: "m\u00B3" });

  const surgeVolume = Ql_m3s * holdup.surgeTime * 60;
  steps.push({ label: "Surge volume", equation: "V_surge = Q_l \u00D7 t_surge \u00D7 60", substitution: `V_surge = ${Ql_m3s.toFixed(6)} \u00D7 ${holdup.surgeTime} \u00D7 60`, result: surgeVolume, unit: "m\u00B3" });

  const slugVolume = holdup.slugVolume;
  if (slugVolume > 0) {
    steps.push({ label: "Slug volume (user)", equation: "V_slug (direct input)", substitution: `V_slug = ${slugVolume}`, result: slugVolume, unit: "m\u00B3" });
  }

  const totalVolume = holdupVolume + surgeVolume + slugVolume;
  steps.push({ label: "Total liquid volume", equation: "V_total = V_hold + V_surge + V_slug", substitution: `V_total = ${holdupVolume.toFixed(4)} + ${surgeVolume.toFixed(4)} + ${slugVolume.toFixed(4)}`, result: totalVolume, unit: "m\u00B3" });

  return { totalVolume_m3: totalVolume, holdupVolume_m3: holdupVolume, surgeVolume_m3: surgeVolume, slugVolume_m3: slugVolume, steps };
}

function assembleGeometry(
  D_gas_mm: number,
  totalLiquidVol: number,
  config: TwoPhaseSepConfig,
  Qg_m3s: number,
): GeometryResult {
  const steps: CalcStep[] = [];
  const isVertical = config.orientation === "vertical";

  let D_mm = Math.max(D_gas_mm, 500);
  D_mm = Math.ceil(D_mm / 50) * 50;

  if (config.maxDiameter > 0 && D_mm > config.maxDiameter) {
    D_mm = config.maxDiameter;
  }

  steps.push({ label: "Gas-capacity diameter", equation: "D_gas (rounded to 50mm)", substitution: `D = ceil(${D_gas_mm.toFixed(0)} / 50) \u00D7 50`, result: D_mm, unit: "mm" });

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

    const allowTotal = allow.inletZone + allow.disengagementZone + allow.mistEliminatorZone + allow.sumpZone + allow.nozzleZone;
    steps.push({ label: "Liquid height", equation: "h_liq = V_liq / A_vessel", substitution: `h_liq = ${totalLiquidVol.toFixed(4)} / ${A_vessel.toFixed(6)}`, result: liquidHeight, unit: "m" });
    steps.push({ label: "Allowances total", equation: "h_allow = inlet + disengage + mist + sump + nozzle", substitution: `h_allow = ${allow.inletZone} + ${allow.disengagementZone} + ${allow.mistEliminatorZone} + ${allow.sumpZone} + ${allow.nozzleZone}`, result: allowTotal, unit: "m" });
    steps.push({ label: "Total vessel height", equation: "H = h_liq + h_allow", substitution: `H = ${liquidHeight.toFixed(3)} + ${allowTotal.toFixed(3)}`, result: L_mm / 1000, unit: "m" });
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

    steps.push({ label: "Liquid area fraction", equation: "f_liq = segment_area(h/D)", substitution: `f_liq = segment_area(${levelFrac})`, result: liquidAreaFrac, unit: "-" });
    steps.push({ label: "Diameter (liquid check)", equation: "D_liq = \u221A(V_liq / (f_liq \u00D7 \u03C0/4))", substitution: `D_liq = \u221A(${totalLiquidVol.toFixed(4)} / (${liquidAreaFrac.toFixed(4)} \u00D7 ${(PI / 4).toFixed(4)}))`, result: D_liq_mm, unit: "mm" });
    steps.push({ label: "Selected diameter", equation: "D = max(D_gas, D_liq, 500mm)", substitution: `D = max(${D_gas_mm.toFixed(0)}, ${D_liq_mm.toFixed(0)}, 500)`, result: D_mm, unit: "mm" });
    steps.push({ label: "Vessel length", equation: "L = max(D \u00D7 L/D, L_liq_req + allowances)", substitution: `L = max(${D_mm} \u00D7 ${targetLD}, ...)`, result: L_mm / 1000, unit: "m" });
  }

  const L_m = L_mm / 1000;
  const vesselVol_corrected = (PI / 4) * (D_mm / 1000) ** 2 * L_m;

  const actualGasVelocity = gasAreaFraction > 0 ? Qg_m3s / (gasAreaFraction * (PI / 4) * (D_mm / 1000) ** 2) : 0;
  const mistFaceVelocity = Qg_m3s / ((PI / 4) * (D_mm / 1000) ** 2);

  const LD_ratio = D_mm > 0 ? L_mm / D_mm : 0;

  steps.push({ label: "Vessel volume", equation: "V = \u03C0D\u00B2/4 \u00D7 L", substitution: `V = \u03C0\u00D7${(D_mm / 1000).toFixed(3)}\u00B2/4 \u00D7 ${L_m.toFixed(3)}`, result: vesselVol_corrected, unit: "m\u00B3" });
  steps.push({ label: "L/D ratio", equation: "L/D", substitution: `${L_mm} / ${D_mm}`, result: LD_ratio, unit: "-" });
  steps.push({ label: "Actual gas velocity", equation: "v_gas = Q_g / A_gas", substitution: `v_gas = ${Qg_m3s.toFixed(6)} / ${(gasAreaFraction * (PI / 4) * (D_mm / 1000) ** 2).toFixed(6)}`, result: actualGasVelocity, unit: "m/s" });
  steps.push({ label: "Mist eliminator face velocity", equation: "v_face = Q_g / A_vessel", substitution: `v_face = ${Qg_m3s.toFixed(6)} / ${((PI / 4) * (D_mm / 1000) ** 2).toFixed(6)}`, result: mistFaceVelocity, unit: "m/s" });

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
  config: TwoPhaseSepConfig,
  geometry: GeometryResult,
  v_s_max: number,
  caseResults: CaseGasResult[],
): EngFlag[] {
  const flags: EngFlag[] = [];

  if (config.kMode === "user") flags.push("K_USER_ASSUMED");
  if (config.kMode === "typical") flags.push("K_TYPICAL_MODE");

  if (config.mistEliminator !== "none") flags.push("VENDOR_MIST_CONFIRM");

  if (config.serviceType === "slug_catcher") flags.push("SLUG_CATCHER_REQUIRED");

  if (geometry.actualGasVelocity > v_s_max && v_s_max > 0) flags.push("GAS_VELOCITY_EXCEEDED");
  if (v_s_max > 0 && geometry.actualGasVelocity > v_s_max * 0.85) flags.push("HIGH_GAS_VELOCITY");
  if (geometry.liquidLevelPercent > 75) flags.push("HIGH_LIQUID_LEVEL");

  const isHoriz = config.orientation === "horizontal";
  const isVert = config.orientation === "vertical";
  if (isHoriz && (geometry.LD_ratio < 2.5 || geometry.LD_ratio > 6)) flags.push("LD_OUT_OF_RANGE");
  if (isVert && (geometry.LD_ratio < 2 || geometry.LD_ratio > 5)) flags.push("LD_OUT_OF_RANGE");

  if (config.enableDropletCheck) {
    const anyCarryover = caseResults.some(cr => cr.dropletCarryoverRisk);
    if (anyCarryover) flags.push("DROPLET_CARRYOVER_RISK");
  }

  const anyUncertainty = cases.some(c => c.gasDensity <= 0 || c.liquidDensity <= 0);
  if (anyUncertainty) flags.push("PROPERTY_UNCERTAINTY");

  const unique: EngFlag[] = [];
  const seen = new Set<EngFlag>();
  for (const f of flags) {
    if (!seen.has(f)) { seen.add(f); unique.push(f); }
  }
  return unique;
}

function buildRecommendations(flags: EngFlag[], config: TwoPhaseSepConfig, geometry: GeometryResult): { recs: string[]; nextSteps: string[] } {
  const recs: string[] = [];
  const nextSteps: string[] = [];

  if (flags.includes("GAS_VELOCITY_EXCEEDED")) {
    recs.push("Increase vessel diameter or improve internals (higher K) to meet gas capacity");
  }
  if (flags.includes("HIGH_GAS_VELOCITY")) {
    recs.push("Gas velocity approaching Souders\u2013Brown limit \u2014 consider larger diameter or better internals");
  }
  if (flags.includes("HIGH_LIQUID_LEVEL")) {
    recs.push("Reduce condensate retention time, increase diameter, or add dedicated liquid surge vessel");
  }
  if (flags.includes("LD_OUT_OF_RANGE")) {
    const isHoriz = config.orientation === "horizontal";
    recs.push(`L/D ratio ${geometry.LD_ratio.toFixed(1)} outside typical ${isHoriz ? "2.5\u20136.0" : "2\u20135"} range \u2014 adjust length or diameter`);
  }
  if (flags.includes("SLUG_CATCHER_REQUIRED")) {
    recs.push("Slug catcher service \u2014 ensure slug volume is based on pipeline transient analysis");
    nextSteps.push("Perform pipeline dynamic simulation (e.g. OLGA) to determine slug volumes");
  }
  if (flags.includes("DROPLET_CARRYOVER_RISK")) {
    recs.push("Droplet carryover risk \u2014 consider larger vessel, higher-efficiency internals, or reducing droplet target size");
    nextSteps.push("Review mist eliminator grade and efficiency curves with vendor");
  }
  if (flags.includes("VENDOR_MIST_CONFIRM")) {
    recs.push("Confirm mist eliminator type, face velocity limits, and \u0394P with vendor");
    nextSteps.push("Submit process data sheet to mist eliminator vendor for selection");
  }
  if (flags.includes("PROPERTY_UNCERTAINTY")) {
    recs.push("Validate fluid properties with PVT analysis or lab data");
  }

  nextSteps.push("Validate fluid properties with PVT analysis at operating conditions");
  nextSteps.push("Perform mechanical design (wall thickness, nozzle sizing, skirt/saddle)");
  nextSteps.push("Issue process data sheet for vendor quotation");
  nextSteps.push("Review nozzle sizing (inlet, gas outlet, liquid outlet, PSV, instruments)");

  return { recs, nextSteps };
}

function buildAssumptions(config: TwoPhaseSepConfig, holdup: HoldupBasis): string[] {
  const a: string[] = [];
  a.push("Souders\u2013Brown equation for maximum allowable gas velocity per GPSA Section 7");
  a.push(`K value = ${config.kValue} m/s (${config.kMode === "typical" ? "from typical GPSA guidance" : "user-entered"})`);

  const serviceLabels: Record<ServiceType, string> = {
    gas_scrubber: "Gas scrubber",
    inlet_separator: "Inlet separator",
    slug_catcher: "Slug catcher",
    test_separator: "Test separator",
  };
  a.push(`Service type: ${serviceLabels[config.serviceType]}`);
  a.push(`Orientation: ${config.orientation}`);

  if (config.orientation === "horizontal") {
    a.push(`Normal liquid level fraction: ${(config.levelFraction * 100).toFixed(0)}% of diameter`);
  }

  a.push(`Mist eliminator: ${config.mistEliminator.replace("_", " ")}`);
  a.push(`Inlet device: ${config.inletDevice.replace("_", " ")}`);
  a.push(`Condensate residence time: ${holdup.residenceTime} min`);
  a.push(`Surge time: ${holdup.surgeTime} min`);
  if (holdup.slugVolume > 0) a.push(`Slug volume: ${holdup.slugVolume} m\u00B3`);
  if (config.enableDropletCheck) {
    a.push(`Droplet settling check enabled (Stokes' law, d = ${config.dropletDiameter_um} \u03BCm)`);
  }
  a.push("Vessel diameter rounded up to nearest 50 mm");
  a.push("No mechanical design (wall thickness, weight, nozzles) considered");
  a.push("Head volumes not included \u2014 cylindrical shell volume only");
  a.push("References: GPSA Engineering Data Book Section 7, API RP 14E");

  return a;
}

export function calculateTwoPhaseSeparator(
  project: ProjectSetup,
  cases: OperatingCase[],
  config: TwoPhaseSepConfig,
  holdup: HoldupBasis,
): TwoPhaseSepFullResult {
  if (cases.length === 0) throw new Error("At least one operating case is required");

  const warnings: string[] = [];
  const caseResults: CaseGasResult[] = [];

  const isHorizontal = config.orientation === "horizontal";

  for (const c of cases) {
    if (c.gasDensity <= 0) throw new Error(`Case "${c.name}": Gas density must be positive`);
    if (c.liquidDensity <= 0) throw new Error(`Case "${c.name}": Liquid density must be positive`);
    if (c.liquidDensity <= c.gasDensity) {
      warnings.push(`Case "${c.name}": \u03C1_l (${c.liquidDensity}) \u2264 \u03C1_g (${c.gasDensity}) \u2014 check fluid properties`);
    }
    if (c.gasFlowRate <= 0 && c.liquidFlowRate <= 0) {
      throw new Error(`Case "${c.name}": At least one flow rate must be positive`);
    }

    const { Qg_m3s, steps: flowSteps } = computeActualGasFlow(c);

    let D_req_mm: number;
    let v_s_max: number;
    let A_req: number;
    const allSteps = [...flowSteps];

    if (isHorizontal) {
      const res = solveHorizontalDiameter(config.kValue, c.liquidDensity, c.gasDensity, Qg_m3s, config.levelFraction);
      D_req_mm = res.D_m * 1000;
      v_s_max = config.kValue * Math.sqrt((c.liquidDensity - c.gasDensity) / c.gasDensity);
      A_req = Qg_m3s / v_s_max;
      allSteps.push(...res.steps);
    } else {
      const res = computeSoudersBrown(config.kValue, c.liquidDensity, c.gasDensity, Qg_m3s, 1.0, c.name);
      D_req_mm = res.D_req_m * 1000;
      v_s_max = res.v_s_max;
      A_req = res.A_req;
      allSteps.push(...res.steps);
    }

    let dropletSettlingVelocity: number | undefined;
    let actualGasVelocityDroplet: number | undefined;
    let dropletCarryoverRisk: boolean | undefined;

    if (config.enableDropletCheck && c.gasViscosity > 0) {
      const D_check_m = Math.max(D_req_mm / 1000, 0.5);
      const dropletRes = computeDropletSettling(
        c.liquidDensity, c.gasDensity, c.gasViscosity,
        config.dropletDiameter_um, Qg_m3s, D_check_m
      );
      dropletSettlingVelocity = dropletRes.v_t;
      actualGasVelocityDroplet = dropletRes.v_actual;
      dropletCarryoverRisk = dropletRes.carryoverRisk;
      allSteps.push(...dropletRes.steps);
    }

    caseResults.push({
      caseId: c.id,
      caseName: c.name,
      Qg_actual_m3s: Qg_m3s,
      v_s_max,
      A_req,
      D_req_mm,
      dropletSettlingVelocity,
      actualGasVelocity: actualGasVelocityDroplet,
      dropletCarryoverRisk,
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
    computeHoldup(cases, holdup, governingCaseId);

  const govCaseResult = caseResults[governingIdx];
  const geometry = assembleGeometry(maxD, totalVolume_m3, config, govCaseResult.Qg_actual_m3s);

  const flags = collectFlags(cases, config, geometry, govCaseResult.v_s_max, caseResults);
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

export const TEST_CASES: { name: string; project: ProjectSetup; cases: OperatingCase[]; config: TwoPhaseSepConfig; holdup: HoldupBasis }[] = [
  {
    name: "Vertical Gas Scrubber",
    project: { ...DEFAULT_PROJECT, caseName: "Gas Scrubber V-3001" },
    cases: [
      {
        ...DEFAULT_CASE,
        id: "normal",
        name: "Normal",
        caseType: "normal",
        gasFlowRate: 8000,
        gasFlowBasis: "actual",
        gasDensity: 20,
        gasMW: 19,
        gasPressure: 25,
        gasTemperature: 35,
        gasZ: 0.92,
        gasViscosity: 0.013,
        liquidFlowRate: 3,
        liquidDensity: 700,
        liquidViscosity: 0.5,
      },
      {
        ...DEFAULT_CASE,
        id: "max",
        name: "Maximum",
        caseType: "maximum",
        gasFlowRate: 12000,
        gasFlowBasis: "actual",
        gasDensity: 18,
        gasMW: 19,
        gasPressure: 25,
        gasTemperature: 40,
        gasZ: 0.91,
        gasViscosity: 0.013,
        liquidFlowRate: 5,
        liquidDensity: 680,
        liquidViscosity: 0.4,
      },
    ],
    config: {
      ...DEFAULT_CONFIG,
      orientation: "vertical",
      serviceType: "gas_scrubber",
      mistEliminator: "wire_mesh",
      kValue: 0.07,
      kMode: "typical",
      enableDropletCheck: true,
      dropletDiameter_um: 150,
    },
    holdup: {
      ...DEFAULT_HOLDUP,
      residenceTime: 2,
      surgeTime: 1,
      slugVolume: 0,
    },
  },
  {
    name: "Horizontal Inlet Separator with Slug",
    project: { ...DEFAULT_PROJECT, caseName: "Inlet Separator V-4001" },
    cases: [
      {
        ...DEFAULT_CASE,
        id: "normal",
        name: "Normal",
        caseType: "normal",
        gasFlowRate: 15000,
        gasFlowBasis: "actual",
        gasDensity: 25,
        gasMW: 20,
        gasPressure: 40,
        gasTemperature: 45,
        gasZ: 0.88,
        gasViscosity: 0.014,
        liquidFlowRate: 20,
        liquidDensity: 780,
        liquidViscosity: 0.8,
      },
      {
        ...DEFAULT_CASE,
        id: "upset",
        name: "Upset / Slug",
        caseType: "upset",
        gasFlowRate: 18000,
        gasFlowBasis: "actual",
        gasDensity: 22,
        gasMW: 20,
        gasPressure: 38,
        gasTemperature: 50,
        gasZ: 0.87,
        gasViscosity: 0.014,
        liquidFlowRate: 40,
        liquidDensity: 760,
        liquidViscosity: 0.7,
        flagSlugging: true,
      },
    ],
    config: {
      ...DEFAULT_CONFIG,
      orientation: "horizontal",
      serviceType: "inlet_separator",
      mistEliminator: "wire_mesh",
      kValue: 0.10,
      kMode: "typical",
      levelFraction: 0.5,
      enableDropletCheck: false,
    },
    holdup: {
      ...DEFAULT_HOLDUP,
      residenceTime: 3,
      surgeTime: 2,
      slugVolume: 5,
    },
  },
];
