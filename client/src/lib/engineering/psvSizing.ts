import { GAS_CONSTANT, PI } from "./constants";

/**
 * PSV (Pressure Safety Valve) Sizing — API 520 Part I Screening
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SCREENING TOOL — NOT FOR FINAL DESIGN                        ║
 * ║  Results must be verified by a qualified relief systems        ║
 * ║  engineer using detailed process simulation and vendor data.   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Gas/Vapor Relief (API 520 Section 5.6):
 *   A = W / (C * Kd * P1 * Kb * Kc * sqrt(T * Z / M))
 *
 * where:
 *   A  = required effective discharge area (mm²)
 *   W  = required relieving capacity (kg/h)
 *   C  = coefficient from k (specific heat ratio)
 *      C = 0.03948 * sqrt(k * (2/(k+1))^((k+1)/(k-1)))
 *   Kd = effective coefficient of discharge (0.975 for gas, 0.65 for liquid)
 *   P1 = upstream relieving pressure = Set pressure × (1 + overpressure) + atmospheric (bar(a))
 *   Kb = back pressure correction factor (1.0 for conventional, varies for balanced)
 *   Kc = combination correction factor (1.0 for no rupture disk, 0.9 with)
 *   T  = relieving temperature (K)
 *   Z  = compressibility factor
 *   M  = molecular weight (kg/kmol)
 *
 * Liquid Relief (API 520 Section 5.8):
 *   A = Q / (Kd * Kw * Kc * Kv * sqrt(ΔP / G))
 *
 * where:
 *   Q  = required flow (L/min)
 *   Kd = 0.65
 *   Kw = back pressure correction (1.0 for conventional)
 *   Kv = viscosity correction factor (1.0 for water-like)
 *   ΔP = P1 - P2 (differential pressure, bar)
 *   G  = specific gravity relative to water
 *
 * Standard orifice designations per API 526:
 *   D: 71 mm², E: 126 mm², F: 198 mm², G: 325 mm², H: 506 mm²,
 *   J: 830 mm², K: 1186 mm², L: 1841 mm², M: 2323 mm²,
 *   N: 2800 mm², P: 4116 mm², Q: 7126 mm², R: 10323 mm², T: 16774 mm²
 *
 * Reference:
 * - API 520 Part I, 10th Edition (2020)
 * - API 526, 7th Edition
 */

export type PSVFluidType = "gas" | "liquid" | "steam";

export interface PSVGasInput {
  massFlowRate: number;        // kg/h (required relieving rate)
  molecularWeight: number;     // kg/kmol
  setPressure: number;         // bar(g)
  overpressure: number;        // % (typically 10% for single PSV, 21% for fire case)
  backPressure: number;        // bar(g) (constant back pressure)
  relievingTemperature: number; // °C
  compressibilityFactor: number;
  specificHeatRatio: number;   // Cp/Cv
  kd: number;                  // discharge coefficient (default 0.975)
  kb: number;                  // back pressure correction (1.0 for conventional)
  kc: number;                  // combination correction (1.0 no rupture disk)
  atmosphericPressure: number; // bar(a)
}

export interface PSVLiquidInput {
  flowRate: number;           // m³/h
  liquidDensity: number;      // kg/m³
  setPressure: number;        // bar(g)
  overpressure: number;       // % (typically 10%, 25% for fire)
  backPressure: number;       // bar(g)
  viscosity: number;          // cP
  kd: number;                 // discharge coefficient (default 0.65)
  kw: number;                 // back pressure correction (1.0 for conventional)
  kc: number;                 // combination correction
  atmosphericPressure: number;
}

export interface PSVResult {
  requiredArea: number;       // mm²
  selectedOrifice: string;    // API 526 designation
  selectedOrificeArea: number; // mm²
  relievingPressure: number;  // bar(a)
  relievingPressureGauge: number; // bar(g)
  cCoefficient?: number;
  warnings: string[];
}

const API_526_ORIFICES: { designation: string; area: number }[] = [
  { designation: "D", area: 71 },
  { designation: "E", area: 126 },
  { designation: "F", area: 198 },
  { designation: "G", area: 325 },
  { designation: "H", area: 506 },
  { designation: "J", area: 830 },
  { designation: "K", area: 1186 },
  { designation: "L", area: 1841 },
  { designation: "M", area: 2323 },
  { designation: "N", area: 2800 },
  { designation: "P", area: 4116 },
  { designation: "Q", area: 7126 },
  { designation: "R", area: 10323 },
  { designation: "T", area: 16774 },
];

function selectOrifice(requiredArea: number): { designation: string; area: number } {
  for (const orifice of API_526_ORIFICES) {
    if (orifice.area >= requiredArea) return orifice;
  }
  return API_526_ORIFICES[API_526_ORIFICES.length - 1];
}

/**
 * C coefficient from specific heat ratio k (API 520 Eq. 5.6):
 *   C = 0.03948 * sqrt(k * (2/(k+1))^((k+1)/(k-1)))
 *
 * Note: The constant 0.03948 applies for W in kg/h, P in bar(a), T in K, M in kg/kmol, A in mm²
 */
function cFromK(k: number): number {
  return 0.03948 * Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)));
}

export function calculatePSVGas(input: PSVGasInput): PSVResult {
  const warnings: string[] = [];

  const P_set_abs = input.setPressure + input.atmosphericPressure;
  const P1 = P_set_abs * (1 + input.overpressure / 100);
  const P_back_abs = input.backPressure + input.atmosphericPressure;
  const T_K = input.relievingTemperature + 273.15;

  const C = cFromK(input.specificHeatRatio);

  const A_mm2 = input.massFlowRate /
    (C * input.kd * P1 * input.kb * input.kc *
      Math.sqrt(T_K * input.compressibilityFactor / input.molecularWeight));

  if (A_mm2 <= 0) throw new Error("Calculated area is non-positive — check inputs");

  const orifice = selectOrifice(A_mm2);

  if (P_back_abs / P1 > 0.5 && input.kb >= 1.0) {
    warnings.push("Back pressure exceeds 50% of relieving pressure — consider balanced bellows PSV (Kb < 1.0)");
  }

  if (input.overpressure < 10) {
    warnings.push("Overpressure below 10% — verify allowable overpressure per applicable code");
  }

  if (input.overpressure > 21) {
    warnings.push("Overpressure above 21% — typically only allowed for fire case with multiple PSVs");
  }

  if (A_mm2 > API_526_ORIFICES[API_526_ORIFICES.length - 1].area) {
    warnings.push(`Required area ${A_mm2.toFixed(0)} mm² exceeds largest standard orifice (T: ${API_526_ORIFICES[API_526_ORIFICES.length - 1].area} mm²) — multiple PSVs required`);
  }

  return {
    requiredArea: A_mm2,
    selectedOrifice: orifice.designation,
    selectedOrificeArea: orifice.area,
    relievingPressure: P1,
    relievingPressureGauge: P1 - input.atmosphericPressure,
    cCoefficient: C,
    warnings,
  };
}

export function calculatePSVLiquid(input: PSVLiquidInput): PSVResult {
  const warnings: string[] = [];

  const P_set_abs = input.setPressure + input.atmosphericPressure;
  const P1 = P_set_abs * (1 + input.overpressure / 100);
  const P_back_abs = input.backPressure + input.atmosphericPressure;
  const dP = P1 - P_back_abs;

  if (dP <= 0) throw new Error("Relieving pressure must exceed back pressure");

  const G = input.liquidDensity / 999;
  const Q_Lmin = input.flowRate * 1000 / 60;

  let Kv = 1.0;
  if (input.viscosity > 2) {
    const Re_prelim = Q_Lmin * 18800 * G / (input.viscosity * Math.sqrt(dP / G));
    if (Re_prelim < 100000) {
      Kv = (0.9935 + 2.878 / Math.sqrt(Re_prelim) + 342.75 / (Re_prelim * Re_prelim));
      Kv = Math.min(Kv, 1.0);
      Kv = Math.max(Kv, 0.3);
    }
  }

  const N1_liquid = 14.2;

  const A_mm2 = (Q_Lmin * Math.sqrt(G)) /
    (N1_liquid * input.kd * input.kw * input.kc * Kv * Math.sqrt(dP));

  if (A_mm2 <= 0) throw new Error("Calculated area is non-positive — check inputs");

  const orifice = selectOrifice(A_mm2);

  if (input.viscosity > 100) {
    warnings.push(`High viscosity (${input.viscosity} cP) — verify viscosity correction factor Kv`);
  }

  if (P_back_abs / P1 > 0.5) {
    warnings.push("High back pressure ratio — verify Kw factor for balanced bellows");
  }

  if (A_mm2 > API_526_ORIFICES[API_526_ORIFICES.length - 1].area) {
    warnings.push(`Required area ${A_mm2.toFixed(0)} mm² exceeds largest standard orifice — multiple PSVs needed`);
  }

  return {
    requiredArea: A_mm2,
    selectedOrifice: orifice.designation,
    selectedOrificeArea: orifice.area,
    relievingPressure: P1,
    relievingPressureGauge: P1 - input.atmosphericPressure,
    warnings,
  };
}

export const PSV_GAS_TEST_CASE: PSVGasInput = {
  massFlowRate: 15000,
  molecularWeight: 18.5,
  setPressure: 50,
  overpressure: 10,
  backPressure: 3,
  relievingTemperature: 120,
  compressibilityFactor: 0.90,
  specificHeatRatio: 1.27,
  kd: 0.975,
  kb: 1.0,
  kc: 1.0,
  atmosphericPressure: 1.01325,
};

export const PSV_LIQUID_TEST_CASE: PSVLiquidInput = {
  flowRate: 50,
  liquidDensity: 998.2,
  setPressure: 10,
  overpressure: 10,
  backPressure: 1,
  viscosity: 1.0,
  kd: 0.65,
  kw: 1.0,
  kc: 1.0,
  atmosphericPressure: 1.01325,
};
