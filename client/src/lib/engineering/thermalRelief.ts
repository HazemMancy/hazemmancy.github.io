/**
 * Thermal Expansion Relief — Blocked-in Liquid (9-Tab Wizard)
 *
 * When liquid is trapped between two closed valves and heated,
 * thermal expansion causes rapid pressure rise. A thermal relief
 * valve (TRV) is required to prevent overpressure.
 *
 * Required relief rate for blocked-in liquid:
 *   Q = (α × V × ΔT) / Δt
 *
 * Alternative — heat input method (API 521):
 *   Q = α × q / (ρ × Cp)
 *
 * Solar heating (API 521 default):
 *   q = 947 W/m² × A_exposed  (bare vessel/pipe)
 *   q = 315 W/m² × A_exposed  (insulated vessel/pipe)
 *
 * Required TRV orifice area (liquid, API 520):
 *   A = Q / (N₁ × Kd × Kw × Kp × √(ΔP / G))
 *
 * Correction factors:
 *   Kw — backpressure correction for balanced bellows (1.0 for conventional)
 *   Kp — overpressure correction per API 520 Fig. 31 (1.0 at 25% overpressure, ~0.6 at 10%)
 *
 * Orifice selection per API 526:
 *   Standard orifice designations D through T with effective areas.
 *
 * Reference:
 * - API 521 Section 5.18 (Thermal Expansion)
 * - API 520 Part I (Relief valve sizing)
 * - API 526: Flanged Steel Pressure-Relief Valves (standard orifice areas)
 * - ASME B31.3 (blocked-in liquid overpressure requirement)
 */

// ─── Types ───────────────────────────────────────────────────────────

export type HeatSource = "solar_bare" | "solar_insulated" | "process" | "manual";

export interface ThermalProject {
  name: string;
  client: string;
  location: string;
  caseId: string;
  engineer: string;
  date: string;
  atmosphericPressure: number;
}

export interface ThermalEquipment {
  tag: string;
  service: string;
  trappedVolume: number;
  mawp: number;
  setPressure: number;
  overpressurePercent: number;
  normalOpPressure: number;
  normalOpTemp: number;
}

export interface ThermalHeatSource {
  type: HeatSource;
  exposedArea: number;
  heatInputKW: number;
  heatingDuration: number;
}

export interface ThermalFluid {
  name: string;
  density: number;
  specificHeat: number;
  thermalExpansion: number;
  viscosity: number;
  bulkModulus: number;
}

export interface ThermalTemperatures {
  initial: number;
  final: number;
}

export interface ThermalDeviceSizing {
  kd: number;
  kw: number;
  backPressure: number;
}

export interface ThermalPipingInput {
  pipeDiameter: number;
  pipeLength: number;
  roughness: number;
  fittingsK: number;
}

// ─── Results ─────────────────────────────────────────────────────────

export interface ThermalHeatResult {
  heatInput_kW: number;
  heatFlux_Wm2: number;
}

export interface ThermalExpansionResult {
  temperatureRise: number;
  expansionVolume_L: number;
  expansionVolume_m3: number;
}

export interface ThermalReliefRateResult {
  reliefRate_Lmin: number;
  reliefRate_m3h: number;
  heatMethodRate_m3h: number;
  timeMethodRate_m3h: number;
  method: string;
  warnings: string[];
}

export interface ThermalSizingResult {
  requiredOrificeArea_mm2: number;
  relievingPressure_bar: number;
  backPressure_bar: number;
  differentialPressure_bar: number;
  specificGravity: number;
  kd: number;
  kw: number;
  kp: number;
}

export interface TRVSelection {
  nps: string;
  designation: string;
  area_mm2: number;
  margin: number;
  inletFlange: string;
  outletFlange: string;
}

export interface ThermalPipingResult {
  velocity: number;
  reynoldsNumber: number;
  frictionFactor: number;
  pressureDrop_bar: number;
  percentOfSet: number;
  pass: boolean;
  warnings: string[];
}

export interface CalcTraceStep {
  name: string;
  equation: string;
  variables: Record<string, number | string>;
  result: number | string;
}

export interface ThermalCalcTrace {
  inputs: Record<string, number | string>;
  steps: CalcTraceStep[];
  intermediateValues: Record<string, number>;
  assumptions: string[];
  warnings: string[];
  flags: string[];
}

export interface ThermalFinalResult {
  project: ThermalProject;
  equipment: ThermalEquipment;
  heatSource: ThermalHeatSource;
  fluid: ThermalFluid;
  temperatures: ThermalTemperatures;
  heatResult: ThermalHeatResult;
  expansionResult: ThermalExpansionResult;
  reliefRateResult: ThermalReliefRateResult;
  sizingResult: ThermalSizingResult;
  trvSelection: TRVSelection;
  inletPiping: ThermalPipingResult | null;
  outletPiping: ThermalPipingResult | null;
  pressureRiseRate: number;
  warnings: string[];
  flags: string[];
  actionItems: string[];
  calcTrace: ThermalCalcTrace;
}

// Legacy interface for backward compatibility
export interface ThermalReliefResult {
  temperatureRise: number;
  expansionVolume: number;
  reliefRate: number;
  reliefRateM3H: number;
  heatInput: number;
  requiredOrificeArea: number;
  recommendedTRVSize: string;
  pressureRiseRate: number;
  warnings: string[];
}

// ─── Constants ───────────────────────────────────────────────────────

const SOLAR_HEAT_FLUX_BARE = 947;
const SOLAR_HEAT_FLUX_INSULATED = 315;
const N1_METRIC = 14.2;

export const FLAG_LABELS: Record<string, { label: string; severity: "info" | "warning" | "error" }> = {
  VERY_SMALL_EXPANSION: { label: "Very Small Expansion Volume", severity: "info" },
  LARGE_TEMP_RISE: { label: "Large Temperature Rise", severity: "warning" },
  LOW_SET_PRESSURE: { label: "Low TRV Set Pressure", severity: "warning" },
  EXCEEDS_STD_ORIFICE: { label: "Exceeds Standard TRV Size", severity: "error" },
  LOW_RELIEF_RATE: { label: "Very Low Relief Rate", severity: "info" },
  INLET_DP_FAIL: { label: "Inlet ΔP Exceeds 3%", severity: "error" },
  OUTLET_DP_FAIL: { label: "Outlet ΔP Exceeds Limit", severity: "warning" },
  HIGH_VELOCITY: { label: "High Piping Velocity", severity: "warning" },
  HIGH_BACKPRESSURE: { label: "High Backpressure Ratio", severity: "warning" },
  SET_EXCEEDS_MAWP: { label: "Set Pressure > MAWP", severity: "error" },
  NO_HEAT_SOURCE: { label: "No Heat Source Defined", severity: "warning" },
  ALPHA_TEMP_DEPENDENT: { label: "α Varies With Temperature", severity: "info" },
};

export const TRV_SIZES: { nps: string; area: number }[] = [
  { nps: "3/4\" x 1\"", area: 285 },
  { nps: "1\" x 2\"", area: 506 },
  { nps: "1-1/2\" x 2\"", area: 1140 },
  { nps: "2\" x 3\"", area: 2027 },
  { nps: "3\" x 4\"", area: 4560 },
];

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

export const COMMON_THERMAL_EXPANSION: Record<string, number> = {
  "Water (20°C)": 2.07,
  "Water (50°C)": 4.49,
  "Water (80°C)": 6.43,
  "Crude Oil (light)": 8.0,
  "Crude Oil (medium)": 7.0,
  "Crude Oil (heavy)": 6.0,
  "Diesel": 8.3,
  "Gasoline": 12.0,
  "MEG": 6.5,
  "Methanol": 12.0,
  "Glycerol": 5.0,
};

export const COMMON_FLUIDS: Record<string, ThermalFluid> = {
  "Water (20°C)": { name: "Water (20°C)", density: 998.2, specificHeat: 4.18, thermalExpansion: 2.07, viscosity: 1.0, bulkModulus: 2200 },
  "Water (50°C)": { name: "Water (50°C)", density: 988.0, specificHeat: 4.18, thermalExpansion: 4.49, viscosity: 0.55, bulkModulus: 2290 },
  "Water (80°C)": { name: "Water (80°C)", density: 971.8, specificHeat: 4.20, thermalExpansion: 6.43, viscosity: 0.35, bulkModulus: 2280 },
  "Crude Oil (light)": { name: "Crude Oil (light)", density: 800, specificHeat: 2.1, thermalExpansion: 8.0, viscosity: 5.0, bulkModulus: 1400 },
  "Crude Oil (medium)": { name: "Crude Oil (medium)", density: 870, specificHeat: 1.9, thermalExpansion: 7.0, viscosity: 15.0, bulkModulus: 1500 },
  "Crude Oil (heavy)": { name: "Crude Oil (heavy)", density: 950, specificHeat: 1.8, thermalExpansion: 6.0, viscosity: 50.0, bulkModulus: 1600 },
  "Diesel": { name: "Diesel", density: 830, specificHeat: 2.0, thermalExpansion: 8.3, viscosity: 3.0, bulkModulus: 1450 },
  "Gasoline": { name: "Gasoline", density: 740, specificHeat: 2.2, thermalExpansion: 12.0, viscosity: 0.5, bulkModulus: 1100 },
  "MEG": { name: "MEG", density: 1110, specificHeat: 2.35, thermalExpansion: 6.5, viscosity: 16.0, bulkModulus: 2800 },
  "DEG": { name: "DEG", density: 1118, specificHeat: 2.24, thermalExpansion: 6.3, viscosity: 30.0, bulkModulus: 2700 },
  "TEG": { name: "TEG", density: 1125, specificHeat: 2.17, thermalExpansion: 6.0, viscosity: 40.0, bulkModulus: 2600 },
  "Methanol": { name: "Methanol", density: 791, specificHeat: 2.53, thermalExpansion: 12.0, viscosity: 0.55, bulkModulus: 1070 },
  "Glycerol": { name: "Glycerol", density: 1261, specificHeat: 2.43, thermalExpansion: 5.0, viscosity: 1412, bulkModulus: 4520 },
  "Propylene Glycol": { name: "Propylene Glycol", density: 1036, specificHeat: 2.50, thermalExpansion: 6.8, viscosity: 42.0, bulkModulus: 2500 },
  "Toluene": { name: "Toluene", density: 867, specificHeat: 1.69, thermalExpansion: 10.8, viscosity: 0.59, bulkModulus: 1260 },
};

// ─── Validation ─────────────────────────────────────────────────────

export function validateInputs(
  equipment: ThermalEquipment,
  fluid: ThermalFluid,
  temps: ThermalTemperatures,
  deviceSizing?: ThermalDeviceSizing,
  heatSource?: ThermalHeatSource,
): string[] {
  const errors: string[] = [];
  if (equipment.trappedVolume <= 0) errors.push("Trapped volume must be positive");
  if (equipment.setPressure <= 0) errors.push("Set pressure must be positive");
  if (equipment.mawp > 0 && equipment.setPressure > equipment.mawp) errors.push("Set pressure exceeds MAWP");
  if (equipment.overpressurePercent < 0 || equipment.overpressurePercent > 100) errors.push("Overpressure must be 0-100%");
  if (fluid.density <= 0) errors.push("Fluid density must be positive");
  if (fluid.specificHeat <= 0) errors.push("Specific heat must be positive");
  if (fluid.thermalExpansion <= 0) errors.push("Thermal expansion coefficient must be positive");
  if (fluid.viscosity <= 0) errors.push("Fluid viscosity must be positive");
  if (fluid.bulkModulus < 0) errors.push("Bulk modulus cannot be negative");
  if (temps.final <= temps.initial) errors.push("Final temperature must exceed initial temperature");
  if (deviceSizing) {
    if (deviceSizing.kd <= 0 || deviceSizing.kd > 1) errors.push("Kd must be between 0 and 1");
    if (deviceSizing.kw <= 0 || deviceSizing.kw > 1) errors.push("Kw must be between 0 and 1");
    if (deviceSizing.backPressure < 0) errors.push("Backpressure cannot be negative");
  }
  if (heatSource) {
    if (heatSource.heatInputKW < 0) errors.push("Heat input cannot be negative");
    if (heatSource.heatingDuration < 0) errors.push("Heating duration cannot be negative");
    if (heatSource.exposedArea < 0) errors.push("Exposed area cannot be negative");
  }
  return errors;
}

// ─── Staged Calculation Functions ────────────────────────────────────

export function calculateHeatInput(hs: ThermalHeatSource): ThermalHeatResult {
  let heatFlux = 0;
  let heatInput = 0;
  switch (hs.type) {
    case "solar_bare":
      heatFlux = SOLAR_HEAT_FLUX_BARE;
      heatInput = heatFlux * hs.exposedArea / 1000;
      break;
    case "solar_insulated":
      heatFlux = SOLAR_HEAT_FLUX_INSULATED;
      heatInput = heatFlux * hs.exposedArea / 1000;
      break;
    case "process":
    case "manual":
      heatInput = hs.heatInputKW;
      heatFlux = hs.exposedArea > 0 ? (hs.heatInputKW * 1000) / hs.exposedArea : 0;
      break;
  }
  return { heatInput_kW: heatInput, heatFlux_Wm2: heatFlux };
}

export function calculateExpansion(
  fluid: ThermalFluid,
  trappedVolume: number,
  temps: ThermalTemperatures
): ThermalExpansionResult {
  const dT = temps.final - temps.initial;
  if (dT <= 0) throw new Error("Final temperature must exceed initial temperature");
  if (trappedVolume <= 0) throw new Error("Trapped volume must be positive");
  const alpha = fluid.thermalExpansion * 1e-4;
  const vol_m3 = alpha * trappedVolume * dT;
  return { temperatureRise: dT, expansionVolume_L: vol_m3 * 1000, expansionVolume_m3: vol_m3 };
}

export function calculateReliefRate(
  expansion: ThermalExpansionResult,
  heatResult: ThermalHeatResult,
  fluid: ThermalFluid,
  heatingDuration: number,
  trappedVolume: number,
): ThermalReliefRateResult {
  const warnings: string[] = [];
  const alpha = fluid.thermalExpansion * 1e-4;
  let rate_m3h: number;
  let method: string;
  let heatMethodRate = 0;
  let timeMethodRate = 0;

  if (heatResult.heatInput_kW > 0) {
    heatMethodRate = (alpha * heatResult.heatInput_kW * 3600) / (fluid.density * fluid.specificHeat);
  }

  if (heatingDuration > 0) {
    timeMethodRate = expansion.expansionVolume_m3 / heatingDuration;
  }

  if (heatMethodRate > 0 && timeMethodRate > 0) {
    rate_m3h = Math.max(heatMethodRate, timeMethodRate);
    method = heatMethodRate >= timeMethodRate ? "Heat Input Method (API 521)" : "Volume/Time Method";
    if (heatMethodRate > 0 && timeMethodRate > 0) {
      const ratio = Math.max(heatMethodRate, timeMethodRate) / Math.min(heatMethodRate, timeMethodRate);
      if (ratio > 5) {
        warnings.push(`Large difference between methods (ratio ${ratio.toFixed(1)}:1) — verify inputs`);
      }
    }
  } else if (timeMethodRate > 0) {
    rate_m3h = timeMethodRate;
    method = "Volume/Time Method";
  } else if (heatMethodRate > 0) {
    rate_m3h = heatMethodRate;
    method = "Heat Input Method (API 521)";
  } else {
    rate_m3h = expansion.expansionVolume_m3;
    method = "Instantaneous (no time/heat specified)";
    warnings.push("No heating time or heat input specified — showing total expansion volume as instantaneous rate");
  }

  return {
    reliefRate_Lmin: rate_m3h * 1000 / 60,
    reliefRate_m3h: rate_m3h,
    heatMethodRate_m3h: heatMethodRate,
    timeMethodRate_m3h: timeMethodRate,
    method,
    warnings,
  };
}

export function calculateRelievingPressure(
  setPressure: number,
  overpressurePercent: number,
  atmosphericPressure: number,
): { gauge: number; abs: number } {
  const gauge = setPressure * (1 + overpressurePercent / 100);
  return { gauge, abs: gauge + atmosphericPressure };
}

/**
 * Overpressure correction factor Kp per API 520 Part I, Figure 31.
 * For liquid service, Kp varies with allowable overpressure %.
 * Kp = 1.0 at 25% overpressure; decreases at lower overpressure.
 */
function overpressureCorrectionKp(overpressurePercent: number): number {
  if (overpressurePercent >= 25) return 1.0;
  if (overpressurePercent >= 10) return 0.6 + (overpressurePercent - 10) * 0.4 / 15;
  return Math.max(0.2, overpressurePercent * 0.06);
}

export function calculateTRVSizing(
  reliefRate: ThermalReliefRateResult,
  setPressure: number,
  overpressurePercent: number,
  backPressure: number,
  atmosphericPressure: number,
  fluid: ThermalFluid,
  kd: number,
  kw: number,
): ThermalSizingResult {
  const rp = calculateRelievingPressure(setPressure, overpressurePercent, atmosphericPressure);
  const bpAbs = backPressure + atmosphericPressure;
  const dP = rp.abs - bpAbs;
  const G = fluid.density / 999;
  const kp = overpressureCorrectionKp(overpressurePercent);

  const A_mm2 = dP > 0
    ? (reliefRate.reliefRate_Lmin * Math.sqrt(G)) / (N1_METRIC * kd * kw * kp * Math.sqrt(dP))
    : 0;

  return {
    requiredOrificeArea_mm2: A_mm2,
    relievingPressure_bar: rp.abs,
    backPressure_bar: bpAbs,
    differentialPressure_bar: dP,
    specificGravity: G,
    kd,
    kw,
    kp,
  };
}

export function selectTRV(requiredArea: number): TRVSelection {
  for (const orifice of API_526_ORIFICES) {
    if (orifice.area >= requiredArea) {
      return {
        nps: `${orifice.inletFlange} x ${orifice.outletFlange}`,
        designation: orifice.designation,
        area_mm2: orifice.area,
        margin: requiredArea > 0 ? ((orifice.area - requiredArea) / requiredArea) * 100 : 100,
        inletFlange: orifice.inletFlange,
        outletFlange: orifice.outletFlange,
      };
    }
  }
  const last = API_526_ORIFICES[API_526_ORIFICES.length - 1];
  return {
    nps: `${last.inletFlange} x ${last.outletFlange}`,
    designation: last.designation + " (multiple required)",
    area_mm2: last.area,
    margin: requiredArea > 0 ? ((last.area - requiredArea) / requiredArea) * 100 : 0,
    inletFlange: last.inletFlange,
    outletFlange: last.outletFlange,
  };
}

export function calculateThermalPiping(
  piping: ThermalPipingInput,
  reliefRate_m3h: number,
  density: number,
  viscosity: number,
  setPressure: number,
): ThermalPipingResult {
  const warnings: string[] = [];
  const D_m = piping.pipeDiameter / 1000;
  const A_pipe = Math.PI * D_m * D_m / 4;
  const Q_m3s = reliefRate_m3h / 3600;
  const velocity = A_pipe > 0 ? Q_m3s / A_pipe : 0;

  const mu = viscosity / 1000;
  const Re = mu > 0 ? density * velocity * D_m / mu : 0;

  let f = 0.02;
  if (Re > 0) {
    const eps = piping.roughness / 1000;
    const eD = eps / D_m;
    if (Re < 2300) {
      f = 64 / Re;
    } else {
      const A = -2 * Math.log10(eD / 3.7 + 5.74 / Math.pow(Re, 0.9));
      f = A > 0 ? 1 / (A * A) : 0.02;
    }
  }

  const L_eq = piping.pipeLength + (f > 0 ? (piping.fittingsK * D_m) / f : 0);
  const dP_Pa = D_m > 0 ? f * (L_eq / D_m) * 0.5 * density * velocity * velocity : 0;
  const dP_bar = dP_Pa / 1e5;
  const pctOfSet = setPressure > 0 ? (dP_bar / setPressure) * 100 : 0;
  const pass = pctOfSet <= 3;

  if (!pass) warnings.push(`Pressure drop ${pctOfSet.toFixed(1)}% exceeds 3% of set pressure`);
  if (velocity > 6) warnings.push(`Velocity ${velocity.toFixed(2)} m/s — high for liquid relief piping`);

  return { velocity, reynoldsNumber: Re, frictionFactor: f, pressureDrop_bar: dP_bar, percentOfSet: pctOfSet, pass, warnings };
}

function estimatePressureRiseRate(alpha: number, bulkModulus_MPa: number): number {
  if (bulkModulus_MPa <= 0) return 0;
  const K_Pa = bulkModulus_MPa * 1e6;
  return (alpha * K_Pa) / 1e5;
}

function buildCalcTrace(
  equipment: ThermalEquipment,
  heatSource: ThermalHeatSource,
  fluid: ThermalFluid,
  temperatures: ThermalTemperatures,
  atmosphericPressure: number,
  heatResult: ThermalHeatResult,
  expansionResult: ThermalExpansionResult,
  reliefRateResult: ThermalReliefRateResult,
  sizingResult: ThermalSizingResult,
  trvSelection: TRVSelection,
  flags: string[],
  warnings: string[],
): ThermalCalcTrace {
  const alpha = fluid.thermalExpansion * 1e-4;
  const steps: CalcTraceStep[] = [];

  steps.push({
    name: "Heat Input",
    equation: heatSource.type.startsWith("solar")
      ? "q = heat_flux × A_exposed / 1000"
      : "q = manual_input",
    variables: {
      heat_flux_Wm2: heatResult.heatFlux_Wm2,
      A_exposed_m2: heatSource.exposedArea,
    },
    result: `${heatResult.heatInput_kW.toFixed(4)} kW`,
  });

  steps.push({
    name: "Thermal Expansion Volume",
    equation: "ΔV = α × V × ΔT",
    variables: {
      "α (1/°C)": alpha,
      "V (m³)": equipment.trappedVolume,
      "ΔT (°C)": expansionResult.temperatureRise,
    },
    result: `${expansionResult.expansionVolume_L.toFixed(4)} L`,
  });

  if (reliefRateResult.heatMethodRate_m3h > 0) {
    steps.push({
      name: "Relief Rate — Heat Input Method",
      equation: "Q = α × q / (ρ × Cp) × 3600",
      variables: {
        "α (1/°C)": alpha,
        "q (kW)": heatResult.heatInput_kW,
        "ρ (kg/m³)": fluid.density,
        "Cp (kJ/kg·K)": fluid.specificHeat,
      },
      result: `${reliefRateResult.heatMethodRate_m3h.toFixed(6)} m³/h`,
    });
  }

  if (reliefRateResult.timeMethodRate_m3h > 0) {
    steps.push({
      name: "Relief Rate — Volume/Time Method",
      equation: "Q = ΔV / Δt",
      variables: {
        "ΔV (m³)": expansionResult.expansionVolume_m3,
        "Δt (h)": heatSource.heatingDuration,
      },
      result: `${reliefRateResult.timeMethodRate_m3h.toFixed(6)} m³/h`,
    });
  }

  steps.push({
    name: "Governing Relief Rate",
    equation: "Q_gov = max(Q_heat, Q_time)",
    variables: {
      method: reliefRateResult.method,
    },
    result: `${reliefRateResult.reliefRate_m3h.toFixed(6)} m³/h (${reliefRateResult.reliefRate_Lmin.toFixed(4)} L/min)`,
  });

  const pRelievGauge = equipment.setPressure * (1 + equipment.overpressurePercent / 100);
  steps.push({
    name: "Relieving Pressure",
    equation: "P_reliev(a) = P_set × (1 + OP%/100) + P_atm",
    variables: {
      "P_set (barg)": equipment.setPressure,
      "OP (%)": equipment.overpressurePercent,
      "P_reliev_gauge (barg)": pRelievGauge,
      "P_atm (bar)": atmosphericPressure,
    },
    result: `${sizingResult.relievingPressure_bar.toFixed(4)} bar(a)`,
  });

  steps.push({
    name: "Backpressure & Differential Pressure",
    equation: "ΔP = P_reliev(a) − P_back(a)",
    variables: {
      "P_reliev (bar abs)": sizingResult.relievingPressure_bar,
      "P_back (bar abs)": sizingResult.backPressure_bar,
    },
    result: `ΔP = ${sizingResult.differentialPressure_bar.toFixed(4)} bar`,
  });

  steps.push({
    name: "Specific Gravity & Kp Correction",
    equation: "G = ρ_fluid / ρ_water; Kp per API 520 Fig. 31",
    variables: {
      "ρ_fluid (kg/m³)": fluid.density,
      "ρ_water (kg/m³)": 999,
      "Overpressure (%)": equipment.overpressurePercent,
    },
    result: `G = ${sizingResult.specificGravity.toFixed(4)}, Kp = ${sizingResult.kp.toFixed(3)}`,
  });

  steps.push({
    name: "TRV Orifice Area (API 520)",
    equation: "A = Q_Lpm × √G / (N₁ × Kd × Kw × Kp × √ΔP)",
    variables: {
      "Q (L/min)": reliefRateResult.reliefRate_Lmin,
      G: sizingResult.specificGravity,
      N1: N1_METRIC,
      Kd: sizingResult.kd,
      Kw: sizingResult.kw,
      Kp: sizingResult.kp,
      "ΔP (bar)": sizingResult.differentialPressure_bar,
    },
    result: `${sizingResult.requiredOrificeArea_mm2.toFixed(2)} mm²`,
  });

  steps.push({
    name: "API 526 Orifice Selection",
    equation: "Select smallest standard orifice ≥ A_required",
    variables: {
      required_mm2: sizingResult.requiredOrificeArea_mm2,
      selected: trvSelection.designation,
      selected_mm2: trvSelection.area_mm2,
    },
    result: `${trvSelection.designation} (${trvSelection.area_mm2} mm², +${trvSelection.margin.toFixed(1)}%)`,
  });

  return {
    inputs: {
      fluid: fluid.name,
      "trapped_volume_m3": equipment.trappedVolume,
      "set_pressure_barg": equipment.setPressure,
      "overpressure_%": equipment.overpressurePercent,
      "T_initial_°C": temperatures.initial,
      "T_final_°C": temperatures.final,
      heat_source: heatSource.type,
      "α_×10⁻⁴_/°C": fluid.thermalExpansion,
      "density_kg/m³": fluid.density,
      "Cp_kJ/kg·K": fluid.specificHeat,
      "viscosity_cP": fluid.viscosity,
      "bulk_modulus_MPa": fluid.bulkModulus,
    },
    steps,
    intermediateValues: {
      "alpha_1/°C": alpha,
      heat_input_kW: heatResult.heatInput_kW,
      expansion_volume_L: expansionResult.expansionVolume_L,
      relief_rate_Lmin: reliefRateResult.reliefRate_Lmin,
      relief_rate_m3h: reliefRateResult.reliefRate_m3h,
      required_area_mm2: sizingResult.requiredOrificeArea_mm2,
      relieving_pressure_bar_abs: sizingResult.relievingPressure_bar,
      differential_pressure_bar: sizingResult.differentialPressure_bar,
      specific_gravity: sizingResult.specificGravity,
    },
    assumptions: [
      "Liquid is incompressible and fully trapped between two closed valves",
      "Thermal expansion coefficient assumed constant over temperature range",
      `Solar heat flux per API 521: ${SOLAR_HEAT_FLUX_BARE} W/m² (bare) / ${SOLAR_HEAT_FLUX_INSULATED} W/m² (insulated)`,
      `Discharge coefficient Kd = ${sizingResult.kd}`,
      `Backpressure correction Kw = ${sizingResult.kw}`,
      `Overpressure correction Kp = ${sizingResult.kp.toFixed(3)} (at ${equipment.overpressurePercent}% overpressure)`,
      "No allowance for pipe/vessel flexibility or thermal expansion of metal",
      `Pressure rise rate estimated using bulk modulus K = ${fluid.bulkModulus} MPa`,
    ],
    warnings,
    flags,
  };
}

export function buildThermalFinalResult(
  project: ThermalProject,
  equipment: ThermalEquipment,
  heatSource: ThermalHeatSource,
  fluid: ThermalFluid,
  temperatures: ThermalTemperatures,
  deviceSizing: ThermalDeviceSizing,
  inletPipingInput: ThermalPipingInput | null,
  outletPipingInput: ThermalPipingInput | null,
): ThermalFinalResult {
  const validationErrors = validateInputs(equipment, fluid, temperatures, deviceSizing, heatSource);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("; "));
  }

  const heatResult = calculateHeatInput(heatSource);
  const expansionResult = calculateExpansion(fluid, equipment.trappedVolume, temperatures);
  const reliefRateResult = calculateReliefRate(expansionResult, heatResult, fluid, heatSource.heatingDuration, equipment.trappedVolume);

  const sizingResult = calculateTRVSizing(
    reliefRateResult, equipment.setPressure, equipment.overpressurePercent,
    deviceSizing.backPressure, project.atmosphericPressure, fluid, deviceSizing.kd, deviceSizing.kw,
  );

  const trvSelection = selectTRV(sizingResult.requiredOrificeArea_mm2);
  const alpha = fluid.thermalExpansion * 1e-4;
  const pressureRiseRate = estimatePressureRiseRate(alpha, fluid.bulkModulus);

  let inletPiping: ThermalPipingResult | null = null;
  let outletPiping: ThermalPipingResult | null = null;

  if (inletPipingInput && inletPipingInput.pipeDiameter > 0) {
    inletPiping = calculateThermalPiping(inletPipingInput, reliefRateResult.reliefRate_m3h, fluid.density, fluid.viscosity, equipment.setPressure);
  }
  if (outletPipingInput && outletPipingInput.pipeDiameter > 0) {
    outletPiping = calculateThermalPiping(outletPipingInput, reliefRateResult.reliefRate_m3h, fluid.density, fluid.viscosity, equipment.setPressure);
  }

  const flags: string[] = [];
  const warnings = [...reliefRateResult.warnings];

  if (expansionResult.expansionVolume_L < 0.01) {
    flags.push("VERY_SMALL_EXPANSION");
    warnings.push("Very small expansion volume — thermal relief may not be required");
  }
  if (expansionResult.temperatureRise > 50) {
    flags.push("LARGE_TEMP_RISE");
    warnings.push("Large temperature rise — expansion coefficient varies significantly over this range; use average α");
    flags.push("ALPHA_TEMP_DEPENDENT");
  }
  if (equipment.setPressure < 3) {
    flags.push("LOW_SET_PRESSURE");
    warnings.push("Low TRV set pressure — ensure TRV is suitable for low-pressure service");
  }
  if (equipment.mawp > 0 && equipment.setPressure > equipment.mawp) {
    flags.push("SET_EXCEEDS_MAWP");
    warnings.push("Set pressure exceeds MAWP — correct set pressure to be ≤ MAWP");
  }
  if (sizingResult.requiredOrificeArea_mm2 > API_526_ORIFICES[API_526_ORIFICES.length - 1].area) {
    flags.push("EXCEEDS_STD_ORIFICE");
    warnings.push(`Required area ${sizingResult.requiredOrificeArea_mm2.toFixed(0)} mm² exceeds largest standard API 526 orifice`);
  }
  if (reliefRateResult.reliefRate_Lmin < 0.1) {
    flags.push("LOW_RELIEF_RATE");
    warnings.push("Very low relief rate — verify if a standard TRV provides adequate resolution");
  }
  if (heatResult.heatInput_kW <= 0 && heatSource.heatingDuration <= 0) {
    flags.push("NO_HEAT_SOURCE");
    warnings.push("No heat input or duration defined — unable to determine realistic relief rate");
  }
  if (deviceSizing.backPressure > 0 && equipment.setPressure > 0) {
    const bpRatio = deviceSizing.backPressure / equipment.setPressure;
    if (bpRatio > 0.5) {
      flags.push("HIGH_BACKPRESSURE");
      warnings.push(`Backpressure is ${(bpRatio * 100).toFixed(0)}% of set pressure — consider balanced bellows TRV`);
    }
  }
  if (inletPiping && !inletPiping.pass) {
    flags.push("INLET_DP_FAIL");
    warnings.push("Inlet piping pressure drop exceeds 3% of set pressure");
  }
  if (outletPiping && !outletPiping.pass) {
    flags.push("OUTLET_DP_FAIL");
    warnings.push("Outlet piping pressure drop exceeds recommended limits");
  }
  if (inletPiping && inletPiping.velocity > 6) flags.push("HIGH_VELOCITY");
  if (outletPiping && outletPiping.velocity > 6) flags.push("HIGH_VELOCITY");

  const actionItems: string[] = [];
  actionItems.push(`Install TRV with API 526 orifice "${trvSelection.designation}" (${trvSelection.inletFlange} x ${trvSelection.outletFlange}, area: ${trvSelection.area_mm2} mm²)`);
  if (sizingResult.requiredOrificeArea_mm2 > 0) {
    actionItems.push(`Required orifice area: ${sizingResult.requiredOrificeArea_mm2.toFixed(1)} mm² — margin: +${trvSelection.margin.toFixed(1)}%`);
  }
  actionItems.push("Verify thermal expansion coefficient for operating temperature range");
  actionItems.push("Confirm blocked-in scenarios in HAZOP / process review");
  if (inletPiping && !inletPiping.pass) actionItems.push("Increase inlet pipe size to reduce pressure drop below 3%");
  if (outletPiping && !outletPiping.pass) actionItems.push("Increase outlet pipe size or reduce back pressure");
  if (flags.includes("HIGH_BACKPRESSURE")) actionItems.push("Evaluate balanced bellows or pilot-operated TRV for high backpressure");
  actionItems.push("Cross-reference with detailed thermal analysis for final design");

  const calcTrace = buildCalcTrace(
    equipment, heatSource, fluid, temperatures, project.atmosphericPressure,
    heatResult, expansionResult, reliefRateResult,
    sizingResult, trvSelection, flags, warnings,
  );

  return {
    project, equipment, heatSource, fluid, temperatures,
    heatResult, expansionResult, reliefRateResult, sizingResult, trvSelection,
    inletPiping, outletPiping, pressureRiseRate, warnings, flags, actionItems, calcTrace,
  };
}

// ─── Legacy function (backward compatibility) ────────────────────────

export type ThermalReliefInput = {
  liquidVolume: number;
  liquidDensity: number;
  specificHeat: number;
  thermalExpansion: number;
  initialTemperature: number;
  finalTemperature: number;
  heatingTime: number;
  heatSource: HeatSource;
  exposedArea: number;
  heatInputKW: number;
  setPressure: number;
  backPressure: number;
  atmosphericPressure: number;
};

export function calculateThermalRelief(input: ThermalReliefInput): ThermalReliefResult {
  const fluid: ThermalFluid = {
    name: "Custom", density: input.liquidDensity,
    specificHeat: input.specificHeat, thermalExpansion: input.thermalExpansion,
    viscosity: 1.0, bulkModulus: 2200,
  };
  const hs: ThermalHeatSource = {
    type: input.heatSource, exposedArea: input.exposedArea,
    heatInputKW: input.heatInputKW, heatingDuration: input.heatingTime,
  };
  const temps: ThermalTemperatures = { initial: input.initialTemperature, final: input.finalTemperature };

  const heatResult = calculateHeatInput(hs);
  const expansion = calculateExpansion(fluid, input.liquidVolume, temps);
  const rateResult = calculateReliefRate(expansion, heatResult, fluid, input.heatingTime, input.liquidVolume);
  const sizing = calculateTRVSizing(rateResult, input.setPressure, 10, input.backPressure, input.atmosphericPressure, fluid, 0.65, 1.0);
  const trv = selectTRV(sizing.requiredOrificeArea_mm2);
  const alpha = input.thermalExpansion * 1e-4;

  return {
    temperatureRise: expansion.temperatureRise,
    expansionVolume: expansion.expansionVolume_L,
    reliefRate: rateResult.reliefRate_Lmin,
    reliefRateM3H: rateResult.reliefRate_m3h,
    heatInput: heatResult.heatInput_kW,
    requiredOrificeArea: sizing.requiredOrificeArea_mm2,
    recommendedTRVSize: trv.nps,
    pressureRiseRate: estimatePressureRiseRate(alpha, 2200),
    warnings: [...rateResult.warnings],
  };
}

// ─── Test Case ───────────────────────────────────────────────────────

export const THERMAL_RELIEF_TEST_CASE = {
  project: {
    name: "Example Refinery", client: "ACME Oil", location: "Cairo, Egypt",
    caseId: "TR-001", engineer: "", date: new Date().toISOString().split("T")[0],
    atmosphericPressure: 1.01325,
  } as ThermalProject,
  equipment: {
    tag: "E-4001", service: "Lean/Rich MEG Heat Exchanger",
    trappedVolume: 5.0, mawp: 15, setPressure: 10,
    overpressurePercent: 10, normalOpPressure: 6, normalOpTemp: 45,
  } as ThermalEquipment,
  heatSource: {
    type: "solar_bare" as HeatSource, exposedArea: 10, heatInputKW: 0, heatingDuration: 4,
  } as ThermalHeatSource,
  fluid: COMMON_FLUIDS["Water (20°C)"],
  temperatures: { initial: 20, final: 60 } as ThermalTemperatures,
  deviceSizing: { kd: 0.65, kw: 1.0, backPressure: 0 } as ThermalDeviceSizing,
};
