/**
 * Thermal Expansion Relief — Blocked-in Liquid Screening
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
 *   Q = (α * V * ΔT) / Δt
 *
 * where:
 *   Q  = volumetric relief rate (m³/h)
 *   α  = coefficient of thermal expansion (1/°C)
 *   V  = trapped liquid volume (m³)
 *   ΔT = temperature rise (°C)
 *   Δt = time for temperature rise (hours)
 *
 * Alternative — heat input method (API 521):
 *   Q = q / (ρ * Cp * ΔT_relief)
 *   where q = heat input rate (kW), ρ = density, Cp = specific heat
 *
 * For solar heating (API 521 default):
 *   q = 947 W/m² × A_exposed (for bare vessel/pipe)
 *   q = 315 W/m² × A_exposed (for insulated vessel/pipe)
 *
 * Required TRV orifice area (liquid, API 520):
 *   A = Q_Lpm / (Kd * sqrt(ΔP / G))
 *
 * Reference:
 * - API 521 Section 5.18 (Thermal Expansion)
 * - API 520 Part I (Relief valve sizing)
 * - ASME B31.3 (blocked-in liquid overpressure requirement)
 */

export type HeatSource = "solar_bare" | "solar_insulated" | "process" | "manual";

export interface ThermalReliefInput {
  liquidVolume: number;        // m³ (trapped volume)
  liquidDensity: number;       // kg/m³
  specificHeat: number;        // kJ/(kg·K)
  thermalExpansion: number;    // 1/°C × 10⁻⁴ (e.g. water ≈ 2.07 at 20°C)
  initialTemperature: number;  // °C
  finalTemperature: number;    // °C
  heatingTime: number;         // hours (for rate calculation)
  heatSource: HeatSource;
  exposedArea: number;         // m² (vessel/pipe external surface for solar)
  heatInputKW: number;         // kW (for manual or process heating)
  setPressure: number;         // bar(g) (TRV set pressure)
  backPressure: number;        // bar(g)
  atmosphericPressure: number; // bar(a)
}

export interface ThermalReliefResult {
  temperatureRise: number;       // °C
  expansionVolume: number;       // liters
  reliefRate: number;            // L/min
  reliefRateM3H: number;        // m³/h
  heatInput: number;             // kW
  requiredOrificeArea: number;   // mm²
  recommendedTRVSize: string;    // NPS designation
  pressureRiseRate: number;      // bar/°C (approximate)
  warnings: string[];
}

const SOLAR_HEAT_FLUX_BARE = 947;       // W/m² per API 521
const SOLAR_HEAT_FLUX_INSULATED = 315;  // W/m²

const TRV_SIZES: { nps: string; area: number }[] = [
  { nps: "3/4\" × 1\"", area: 285 },
  { nps: "1\" × 2\"", area: 506 },
  { nps: "1-1/2\" × 2\"", area: 1140 },
  { nps: "2\" × 3\"", area: 2027 },
  { nps: "3\" × 4\"", area: 4560 },
];

function selectTRVSize(requiredArea: number): { nps: string; area: number } {
  for (const size of TRV_SIZES) {
    if (size.area >= requiredArea) return size;
  }
  return TRV_SIZES[TRV_SIZES.length - 1];
}

/**
 * Approximate isothermal compressibility for hydraulic liquids:
 * Water: ~4.5e-10 1/Pa at 20°C
 * Light oil: ~7e-10 1/Pa
 * These are used to estimate pressure rise rate per °C in a rigid vessel.
 */
function estimatePressureRiseRate(alpha: number, beta: number): number {
  if (beta <= 0) return 0;
  return (alpha / beta) / 1e5;
}

export function calculateThermalRelief(input: ThermalReliefInput): ThermalReliefResult {
  const warnings: string[] = [];

  const dT = input.finalTemperature - input.initialTemperature;
  if (dT <= 0) throw new Error("Final temperature must exceed initial temperature");

  const alpha = input.thermalExpansion * 1e-4;

  const expansionVolume_m3 = alpha * input.liquidVolume * dT;
  const expansionVolume_L = expansionVolume_m3 * 1000;

  let heatInput_kW: number;
  switch (input.heatSource) {
    case "solar_bare":
      heatInput_kW = SOLAR_HEAT_FLUX_BARE * input.exposedArea / 1000;
      break;
    case "solar_insulated":
      heatInput_kW = SOLAR_HEAT_FLUX_INSULATED * input.exposedArea / 1000;
      break;
    case "process":
    case "manual":
      heatInput_kW = input.heatInputKW;
      break;
  }

  let reliefRate_m3h: number;
  if (input.heatingTime > 0 && heatInput_kW <= 0) {
    reliefRate_m3h = expansionVolume_m3 / input.heatingTime;
  } else if (heatInput_kW > 0) {
    const dT_for_rate = Math.max(dT, 1);
    reliefRate_m3h = (heatInput_kW * 3600) / (input.liquidDensity * input.specificHeat * dT_for_rate) * alpha * dT;
    reliefRate_m3h = Math.max(reliefRate_m3h, expansionVolume_m3 / Math.max(input.heatingTime, 0.01));
  } else {
    reliefRate_m3h = expansionVolume_m3;
    warnings.push("No heating time or heat input specified — showing total expansion volume as instantaneous rate");
  }

  const reliefRate_Lmin = reliefRate_m3h * 1000 / 60;

  const P_set_abs = input.setPressure + input.atmosphericPressure;
  const P_back_abs = input.backPressure + input.atmosphericPressure;
  const dP_relief = P_set_abs * 1.1 - P_back_abs;

  const G = input.liquidDensity / 999;
  const Kd = 0.65;
  const N1 = 14.2;

  const A_mm2 = dP_relief > 0
    ? (reliefRate_Lmin * Math.sqrt(G)) / (N1 * Kd * Math.sqrt(dP_relief))
    : 0;

  const trv = selectTRVSize(A_mm2);

  const beta_compressibility = 4.5e-10;
  const pressureRiseRate = estimatePressureRiseRate(alpha, beta_compressibility);

  if (reliefRate_Lmin < 0.1) {
    warnings.push("Very low relief rate — verify if a standard TRV provides adequate resolution");
  }

  if (expansionVolume_L < 0.01) {
    warnings.push("Very small expansion volume — thermal relief may not be required for this volume");
  }

  if (dT > 100) {
    warnings.push("Large temperature rise — thermal expansion coefficient may vary significantly over this range");
  }

  if (input.setPressure < 3) {
    warnings.push("Low TRV set pressure — ensure TRV is suitable for low-pressure service");
  }

  if (A_mm2 > TRV_SIZES[TRV_SIZES.length - 1].area) {
    warnings.push(`Required area ${A_mm2.toFixed(0)} mm² exceeds standard TRV sizes — consider a larger relief device`);
  }

  return {
    temperatureRise: dT,
    expansionVolume: expansionVolume_L,
    reliefRate: reliefRate_Lmin,
    reliefRateM3H: reliefRate_m3h,
    heatInput: heatInput_kW,
    requiredOrificeArea: A_mm2,
    recommendedTRVSize: trv.nps,
    pressureRiseRate,
    warnings,
  };
}

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

export const THERMAL_RELIEF_TEST_CASE: ThermalReliefInput = {
  liquidVolume: 5.0,
  liquidDensity: 998.2,
  specificHeat: 4.18,
  thermalExpansion: 2.07,
  initialTemperature: 20,
  finalTemperature: 60,
  heatingTime: 4,
  heatSource: "solar_bare",
  exposedArea: 10,
  heatInputKW: 0,
  setPressure: 10,
  backPressure: 0,
  atmosphericPressure: 1.01325,
};
