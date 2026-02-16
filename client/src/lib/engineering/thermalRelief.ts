/**
 * Thermal Expansion Relief — Blocked-in Liquid Screening (9-Tab Wizard)
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SCREENING TOOL — NOT FOR FINAL DESIGN                        ║
 * ║  Results must be verified against detailed thermal analysis    ║
 * ║  and equipment-specific data.                                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * When liquid is trapped between two closed valves and heated,
 * thermal expansion causes rapid pressure rise. A thermal relief
 * valve (TRV) is required to prevent overpressure.
 *
 * Required relief rate for blocked-in liquid:
 *   Q = (α × V × ΔT) / Δt
 *
 * Alternative — heat input method (API 521):
 *   Q = q / (ρ × Cp × ΔT_relief)
 *
 * Solar heating (API 521 default):
 *   q = 947 W/m² × A_exposed  (bare vessel/pipe)
 *   q = 315 W/m² × A_exposed  (insulated vessel/pipe)
 *
 * Required TRV orifice area (liquid, API 520):
 *   A = Q_Lpm / (N₁ × Kd × √(ΔP / G))
 *
 * Reference:
 * - API 521 Section 5.18 (Thermal Expansion)
 * - API 520 Part I (Relief valve sizing)
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
  atmosphericPressure: number; // bar(a) — always stored in bar
}

export interface ThermalEquipment {
  tag: string;
  service: string;
  trappedVolume: number;       // m³
  mawp: number;                // bar(g) / psi(g)
  setPressure: number;         // bar(g) / psi(g)
  overpressurePercent: number; // %
  normalOpPressure: number;    // bar(g) / psi(g)
  normalOpTemp: number;        // °C / °F
}

export interface ThermalHeatSource {
  type: HeatSource;
  exposedArea: number;   // m² — vessel/pipe external surface for solar
  heatInputKW: number;   // kW — for manual or process heating
  heatingDuration: number; // hours
}

export interface ThermalFluid {
  name: string;
  density: number;          // kg/m³
  specificHeat: number;     // kJ/(kg·K)
  thermalExpansion: number; // ×10⁻⁴ /°C
}

export interface ThermalTemperatures {
  initial: number; // °C / °F
  final: number;   // °C / °F
}

export interface ThermalDeviceSizing {
  kd: number;              // discharge coefficient (0.65 typical for liquid TRV)
  backPressure: number;    // bar(g) / psi(g) — superimposed backpressure
}

export interface ThermalPipingInput {
  pipeDiameter: number;    // mm / in
  pipeLength: number;      // m / ft
  roughness: number;       // mm
  fittingsK: number;       // sum of K values
}

// ─── Results ─────────────────────────────────────────────────────────

export interface ThermalHeatResult {
  heatInput_kW: number;
  heatFlux_Wm2: number;
}

export interface ThermalExpansionResult {
  temperatureRise: number;     // °C
  expansionVolume_L: number;   // liters
  expansionVolume_m3: number;
}

export interface ThermalReliefRateResult {
  reliefRate_Lmin: number;
  reliefRate_m3h: number;
  method: string;
  warnings: string[];
}

export interface ThermalSizingResult {
  requiredOrificeArea_mm2: number;
  relievingPressure_bar: number;  // abs
  backPressure_bar: number;       // abs
  differentialPressure_bar: number;
  specificGravity: number;
}

export interface TRVSelection {
  nps: string;
  area_mm2: number;
  margin: number; // %
}

export interface ThermalPipingResult {
  velocity: number;        // m/s
  reynoldsNumber: number;
  frictionFactor: number;
  pressureDrop_bar: number;
  percentOfSet: number;
  pass: boolean;
  warnings: string[];
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
  pressureRiseRate: number; // bar/°C
  warnings: string[];
  actionItems: string[];
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

const SOLAR_HEAT_FLUX_BARE = 947;       // W/m² per API 521
const SOLAR_HEAT_FLUX_INSULATED = 315;  // W/m²

export const TRV_SIZES: { nps: string; area: number }[] = [
  { nps: "3/4\" x 1\"", area: 285 },
  { nps: "1\" x 2\"", area: 506 },
  { nps: "1-1/2\" x 2\"", area: 1140 },
  { nps: "2\" x 3\"", area: 2027 },
  { nps: "3\" x 4\"", area: 4560 },
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
  "Water (20°C)": { name: "Water (20°C)", density: 998.2, specificHeat: 4.18, thermalExpansion: 2.07 },
  "Water (50°C)": { name: "Water (50°C)", density: 988.0, specificHeat: 4.18, thermalExpansion: 4.49 },
  "Water (80°C)": { name: "Water (80°C)", density: 971.8, specificHeat: 4.20, thermalExpansion: 6.43 },
  "Crude Oil (light)": { name: "Crude Oil (light)", density: 800, specificHeat: 2.1, thermalExpansion: 8.0 },
  "Crude Oil (medium)": { name: "Crude Oil (medium)", density: 870, specificHeat: 1.9, thermalExpansion: 7.0 },
  "Crude Oil (heavy)": { name: "Crude Oil (heavy)", density: 950, specificHeat: 1.8, thermalExpansion: 6.0 },
  "Diesel": { name: "Diesel", density: 830, specificHeat: 2.0, thermalExpansion: 8.3 },
  "Gasoline": { name: "Gasoline", density: 740, specificHeat: 2.2, thermalExpansion: 12.0 },
  "MEG": { name: "MEG", density: 1110, specificHeat: 2.35, thermalExpansion: 6.5 },
  "Methanol": { name: "Methanol", density: 791, specificHeat: 2.53, thermalExpansion: 12.0 },
  "Glycerol": { name: "Glycerol", density: 1261, specificHeat: 2.43, thermalExpansion: 5.0 },
};

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

  if (heatResult.heatInput_kW > 0 && heatingDuration > 0) {
    // Heat input method (API 521): Q = α × q / (ρ × Cp)
    // q in kW, Cp in kJ/(kg·K), gives m³/s → ×3600 for m³/h
    const heatMethod = (alpha * heatResult.heatInput_kW * 3600) / (fluid.density * fluid.specificHeat);
    const timeMethod = expansion.expansionVolume_m3 / heatingDuration;
    rate_m3h = Math.max(heatMethod, timeMethod);
    method = heatMethod >= timeMethod ? "Heat Input Method (API 521)" : "Volume/Time Method";
  } else if (heatingDuration > 0) {
    rate_m3h = expansion.expansionVolume_m3 / heatingDuration;
    method = "Volume/Time Method";
  } else if (heatResult.heatInput_kW > 0) {
    // Heat input method (API 521): Q = α × q / (ρ × Cp)
    rate_m3h = (alpha * heatResult.heatInput_kW * 3600) / (fluid.density * fluid.specificHeat);
    method = "Heat Input Method (API 521)";
  } else {
    rate_m3h = expansion.expansionVolume_m3;
    method = "Instantaneous (no time/heat specified)";
    warnings.push("No heating time or heat input specified — showing total expansion volume as instantaneous rate");
  }

  return { reliefRate_Lmin: rate_m3h * 1000 / 60, reliefRate_m3h: rate_m3h, method, warnings };
}

export function calculateRelievingPressure(
  setPressure: number,
  overpressurePercent: number,
  atmosphericPressure: number,
): { gauge: number; abs: number } {
  const gauge = setPressure * (1 + overpressurePercent / 100);
  return { gauge, abs: gauge + atmosphericPressure };
}

export function calculateTRVSizing(
  reliefRate: ThermalReliefRateResult,
  setPressure: number,
  overpressurePercent: number,
  backPressure: number,
  atmosphericPressure: number,
  fluid: ThermalFluid,
  kd: number,
): ThermalSizingResult {
  const rp = calculateRelievingPressure(setPressure, overpressurePercent, atmosphericPressure);
  const bpAbs = backPressure + atmosphericPressure;
  const dP = rp.abs - bpAbs;
  const G = fluid.density / 999;
  const N1 = 14.2;

  const A_mm2 = dP > 0
    ? (reliefRate.reliefRate_Lmin * Math.sqrt(G)) / (N1 * kd * Math.sqrt(dP))
    : 0;

  return {
    requiredOrificeArea_mm2: A_mm2,
    relievingPressure_bar: rp.abs,
    backPressure_bar: bpAbs,
    differentialPressure_bar: dP,
    specificGravity: G,
  };
}

export function selectTRV(requiredArea: number): TRVSelection {
  for (const size of TRV_SIZES) {
    if (size.area >= requiredArea) {
      return {
        nps: size.nps,
        area_mm2: size.area,
        margin: requiredArea > 0 ? ((size.area - requiredArea) / requiredArea) * 100 : 100,
      };
    }
  }
  const last = TRV_SIZES[TRV_SIZES.length - 1];
  return {
    nps: last.nps,
    area_mm2: last.area,
    margin: requiredArea > 0 ? ((last.area - requiredArea) / requiredArea) * 100 : 0,
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

  const mu = viscosity / 1000; // cP → Pa·s
  const Re = density * velocity * D_m / (mu || 0.001);

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

  const L_eq = piping.pipeLength + (piping.fittingsK * D_m) / f;
  const dP_Pa = D_m > 0 ? f * (L_eq / D_m) * 0.5 * density * velocity * velocity : 0;
  const dP_bar = dP_Pa / 1e5;
  const pctOfSet = setPressure > 0 ? (dP_bar / setPressure) * 100 : 0;
  const pass = pctOfSet <= 3;

  if (!pass) warnings.push(`Pressure drop ${pctOfSet.toFixed(1)}% exceeds 3% of set pressure`);
  if (velocity > 60) warnings.push(`Velocity ${velocity.toFixed(1)} m/s exceeds recommended maximum`);

  return { velocity, reynoldsNumber: Re, frictionFactor: f, pressureDrop_bar: dP_bar, percentOfSet: pctOfSet, pass, warnings };
}

function estimatePressureRiseRate(alpha: number): number {
  const beta = 4.5e-10; // isothermal compressibility of water (1/Pa)
  if (beta <= 0) return 0;
  return (alpha / beta) / 1e5;
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
  const heatResult = calculateHeatInput(heatSource);
  const expansionResult = calculateExpansion(fluid, equipment.trappedVolume, temperatures);
  const reliefRateResult = calculateReliefRate(expansionResult, heatResult, fluid, heatSource.heatingDuration, equipment.trappedVolume);

  const sizingResult = calculateTRVSizing(
    reliefRateResult, equipment.setPressure, equipment.overpressurePercent,
    deviceSizing.backPressure, project.atmosphericPressure, fluid, deviceSizing.kd,
  );

  const trvSelection = selectTRV(sizingResult.requiredOrificeArea_mm2);
  const alpha = fluid.thermalExpansion * 1e-4;
  const pressureRiseRate = estimatePressureRiseRate(alpha);

  const viscosity = 1.0; // cP default for liquid
  let inletPiping: ThermalPipingResult | null = null;
  let outletPiping: ThermalPipingResult | null = null;

  if (inletPipingInput && inletPipingInput.pipeDiameter > 0) {
    inletPiping = calculateThermalPiping(inletPipingInput, reliefRateResult.reliefRate_m3h, fluid.density, viscosity, equipment.setPressure);
  }
  if (outletPipingInput && outletPipingInput.pipeDiameter > 0) {
    outletPiping = calculateThermalPiping(outletPipingInput, reliefRateResult.reliefRate_m3h, fluid.density, viscosity, equipment.setPressure);
  }

  const warnings = [...reliefRateResult.warnings];
  if (expansionResult.expansionVolume_L < 0.01) warnings.push("Very small expansion volume — thermal relief may not be required");
  if (expansionResult.temperatureRise > 100) warnings.push("Large temperature rise — expansion coefficient may vary significantly");
  if (equipment.setPressure < 3) warnings.push("Low TRV set pressure — ensure TRV is suitable for low-pressure service");
  if (sizingResult.requiredOrificeArea_mm2 > TRV_SIZES[TRV_SIZES.length - 1].area) {
    warnings.push(`Required area ${sizingResult.requiredOrificeArea_mm2.toFixed(0)} mm² exceeds standard TRV sizes — consider a larger relief device`);
  }
  if (reliefRateResult.reliefRate_Lmin < 0.1) warnings.push("Very low relief rate — verify if a standard TRV provides adequate resolution");
  if (inletPiping && !inletPiping.pass) warnings.push("Inlet piping pressure drop exceeds 3% of set pressure");
  if (outletPiping && !outletPiping.pass) warnings.push("Outlet piping pressure drop exceeds recommended limits");

  const actionItems: string[] = [];
  actionItems.push(`Install TRV size ${trvSelection.nps} (area: ${trvSelection.area_mm2} mm²) at blocked-in section`);
  if (sizingResult.requiredOrificeArea_mm2 > 0) {
    actionItems.push(`Required orifice area: ${sizingResult.requiredOrificeArea_mm2.toFixed(1)} mm² — margin: +${trvSelection.margin.toFixed(1)}%`);
  }
  actionItems.push(`Verify thermal expansion coefficient for operating temperature range`);
  actionItems.push(`Confirm blocked-in scenarios in HAZOP / process review`);
  if (inletPiping && !inletPiping.pass) actionItems.push("Increase inlet pipe size to reduce pressure drop below 3%");
  actionItems.push("Cross-reference with detailed thermal analysis for final design");

  return {
    project, equipment, heatSource, fluid, temperatures,
    heatResult, expansionResult, reliefRateResult, sizingResult, trvSelection,
    inletPiping, outletPiping, pressureRiseRate, warnings, actionItems,
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
  };
  const hs: ThermalHeatSource = {
    type: input.heatSource, exposedArea: input.exposedArea,
    heatInputKW: input.heatInputKW, heatingDuration: input.heatingTime,
  };
  const temps: ThermalTemperatures = { initial: input.initialTemperature, final: input.finalTemperature };

  const heatResult = calculateHeatInput(hs);
  const expansion = calculateExpansion(fluid, input.liquidVolume, temps);
  const rateResult = calculateReliefRate(expansion, heatResult, fluid, input.heatingTime, input.liquidVolume);
  const sizing = calculateTRVSizing(rateResult, input.setPressure, 10, input.backPressure, input.atmosphericPressure, fluid, 0.65);
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
    pressureRiseRate: estimatePressureRiseRate(alpha),
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
  deviceSizing: { kd: 0.65, backPressure: 0 } as ThermalDeviceSizing,
};
