/**
 * Heat Exchanger Preliminary Sizing — LMTD Method with Kern Approach
 *
 * Basic heat transfer equation:
 *   Q = U * A * F * LMTD
 *
 * Log Mean Temperature Difference:
 *   LMTD = (ΔT1 - ΔT2) / ln(ΔT1 / ΔT2)
 *
 * For counter-current (pure countercurrent F=1):
 *   ΔT1 = T_hot_in - T_cold_out
 *   ΔT2 = T_hot_out - T_cold_in
 *
 * For multi-pass (1-2, 2-4, etc.), apply LMTD correction factor F:
 *   R = (T_hot_in - T_hot_out) / (T_cold_out - T_cold_in)
 *   P = (T_cold_out - T_cold_in) / (T_hot_in - T_cold_in)
 *   F = f(R, P) per TEMA standards
 *
 * Kern method for shell-side heat transfer:
 *   ho = 0.36 * (De * Gs / μ)^0.55 * (Cp * μ / k)^(1/3) * (k / De)
 *
 * For preliminary sizing, use overall U values from tables.
 *
 * Reference:
 * - Kern, D.Q. "Process Heat Transfer" (1950)
 * - TEMA Standards (9th/10th Edition)
 * - Perry's Chemical Engineers' Handbook, Section 11
 * - Ludwig, E.E. "Applied Process Design", Vol. 3
 */

export type FlowArrangement = "counter_current" | "parallel" | "1_2_pass" | "2_4_pass";

export interface HeatExchangerInput {
  dutyKW: number;             // kW (heat duty, 0 = auto-calculate from streams)
  hotInletTemp: number;       // °C
  hotOutletTemp: number;      // °C
  coldInletTemp: number;      // °C
  coldOutletTemp: number;     // °C
  overallU: number;           // W/(m²·K) overall heat transfer coefficient
  flowArrangement: FlowArrangement;
  foulingFactor: number;      // m²·K/W (total fouling resistance, both sides)
  designMargin: number;       // % (excess area, typically 10-25%)
  hotFlowRate: number;        // kg/h (for duty calculation)
  hotCp: number;              // kJ/(kg·K) (for duty calculation)
  coldFlowRate: number;       // kg/h
  coldCp: number;             // kJ/(kg·K)
}

export interface HeatExchangerResult {
  lmtd: number;                // °C
  correctionFactorF: number;
  correctedLMTD: number;       // °C
  dutyKW: number;
  cleanArea: number;           // m² (without fouling)
  totalFoulingResistance: number;
  dirtyU: number;              // W/(m²·K) effective U with fouling
  requiredArea: number;        // m² (with fouling)
  designArea: number;          // m² (with margin)
  R: number;                   // heat capacity ratio
  P: number;                   // temperature effectiveness
  hotDutyKW: number;
  coldDutyKW: number;
  warnings: string[];
}

function calculateLMTD(dT1: number, dT2: number): number {
  if (Math.abs(dT1 - dT2) < 0.01) return dT1;
  if (dT1 <= 0 || dT2 <= 0) throw new Error("Temperature cross detected — invalid terminal temperatures");
  return (dT1 - dT2) / Math.log(dT1 / dT2);
}

function correctionFactor1_2(R: number, P: number): number {
  if (R === 1) {
    const F = (P * Math.sqrt(2)) / ((1 - P) * Math.log((2 - P * (2 - Math.sqrt(2))) / (2 - P * (2 + Math.sqrt(2)))));
    return Math.min(Math.max(F, 0.5), 1.0);
  }
  const S = Math.sqrt(R * R + 1) / (R - 1);
  const W = ((1 - P * R) / (1 - P));
  if (W <= 0) return 0.5;
  const num = S * Math.log(W);
  const A = (2 / P - 1 - R + Math.sqrt(R * R + 1));
  const B = (2 / P - 1 - R - Math.sqrt(R * R + 1));
  if (B === 0 || A / B <= 0) return 0.75;
  const den = Math.log(A / B);
  if (den === 0) return 1.0;
  return num / den;
}

export function calculateHeatExchanger(input: HeatExchangerInput): HeatExchangerResult {
  const warnings: string[] = [];

  const Thi = input.hotInletTemp;
  const Tho = input.hotOutletTemp;
  const Tci = input.coldInletTemp;
  const Tco = input.coldOutletTemp;

  if (Thi <= Tho) throw new Error("Hot inlet must be hotter than hot outlet");
  if (Tco <= Tci) throw new Error("Cold outlet must be hotter than cold inlet");
  if (Thi <= Tci) throw new Error("Hot inlet must be hotter than cold inlet");

  let dT1: number, dT2: number;
  if (input.flowArrangement === "parallel") {
    dT1 = Thi - Tci;
    dT2 = Tho - Tco;
  } else {
    dT1 = Thi - Tco;
    dT2 = Tho - Tci;
  }

  if (dT1 <= 0 || dT2 <= 0) {
    throw new Error("Temperature cross — check terminal temperatures for selected flow arrangement");
  }

  const lmtd = calculateLMTD(dT1, dT2);

  const R = (Thi - Tho) / (Tco - Tci);
  const P = (Tco - Tci) / (Thi - Tci);

  let F = 1.0;
  if (input.flowArrangement === "1_2_pass" || input.flowArrangement === "2_4_pass") {
    F = correctionFactor1_2(R, P);
    if (input.flowArrangement === "2_4_pass") {
      F = Math.max(F, correctionFactor1_2(R, P));
    }
  }

  if (F < 0.75) {
    warnings.push(`LMTD correction factor F = ${F.toFixed(3)} is below 0.75 — consider more shells in series or different arrangement`);
  }
  if (F < 0.5) {
    warnings.push("F factor critically low — this configuration is thermally infeasible");
  }

  const correctedLMTD = F * lmtd;

  const hotDutyKW = (input.hotFlowRate / 3600) * input.hotCp * (Thi - Tho);
  const coldDutyKW = (input.coldFlowRate / 3600) * input.coldCp * (Tco - Tci);

  let dutyKW: number;
  if (input.dutyKW > 0) {
    dutyKW = input.dutyKW;
  } else {
    dutyKW = hotDutyKW > 0 ? hotDutyKW : coldDutyKW;
  }

  if (hotDutyKW > 0 && coldDutyKW > 0) {
    const imbalance = Math.abs(hotDutyKW - coldDutyKW) / Math.max(hotDutyKW, coldDutyKW) * 100;
    if (imbalance > 5) {
      warnings.push(`Heat duty imbalance: hot side ${hotDutyKW.toFixed(1)} kW vs cold side ${coldDutyKW.toFixed(1)} kW (${imbalance.toFixed(1)}% difference). Check flow rates and Cp values.`);
    }
  }

  const U_clean = input.overallU;
  const Rf = input.foulingFactor;
  const dirtyU = 1 / (1 / U_clean + Rf);

  const dutyW = dutyKW * 1000;
  const cleanArea = dutyW / (U_clean * correctedLMTD);
  const requiredArea = dutyW / (dirtyU * correctedLMTD);
  const designArea = requiredArea * (1 + input.designMargin / 100);

  if (correctedLMTD < 5) {
    warnings.push(`Low corrected LMTD (${correctedLMTD.toFixed(1)}°C) — large area required, consider closer temperature approach`);
  }

  if (designArea > 1000) {
    warnings.push(`Large heat transfer area (${designArea.toFixed(0)} m²) — may require multiple shells or plate heat exchanger`);
  }

  if (input.overallU < 50) {
    warnings.push("Low overall U — verify for gas-gas or viscous fluid service");
  }
  if (input.overallU > 2000) {
    warnings.push("High overall U — typical for condensing steam / boiling. Verify assumption.");
  }

  return {
    lmtd,
    correctionFactorF: F,
    correctedLMTD,
    dutyKW,
    cleanArea,
    totalFoulingResistance: Rf,
    dirtyU,
    requiredArea,
    designArea,
    R,
    P,
    hotDutyKW,
    coldDutyKW,
    warnings,
  };
}

export const TYPICAL_U_VALUES: Record<string, { low: number; high: number; typical: number; unit: string }> = {
  "Gas-Gas": { low: 10, high: 50, typical: 25, unit: "W/(m²·K)" },
  "Gas-Liquid": { low: 20, high: 300, typical: 100, unit: "W/(m²·K)" },
  "Liquid-Liquid (low viscosity)": { low: 150, high: 1200, typical: 600, unit: "W/(m²·K)" },
  "Liquid-Liquid (high viscosity)": { low: 50, high: 400, typical: 200, unit: "W/(m²·K)" },
  "Condensing Steam-Water": { low: 1000, high: 4000, typical: 2500, unit: "W/(m²·K)" },
  "Condensing HC Vapor-Water": { low: 300, high: 1000, typical: 600, unit: "W/(m²·K)" },
  "Condensing HC Vapor-Oil": { low: 50, high: 300, typical: 150, unit: "W/(m²·K)" },
  "Boiling Water-Steam": { low: 1500, high: 5000, typical: 3000, unit: "W/(m²·K)" },
  "Reboiler (HC)": { low: 200, high: 1000, typical: 500, unit: "W/(m²·K)" },
  "Air Cooler (Fin-Fan)": { low: 15, high: 80, typical: 40, unit: "W/(m²·K)" },
};

export const HX_TEST_CASE: HeatExchangerInput = {
  dutyKW: 0,
  hotInletTemp: 150,
  hotOutletTemp: 80,
  coldInletTemp: 25,
  coldOutletTemp: 65,
  overallU: 500,
  flowArrangement: "counter_current",
  foulingFactor: 0.0003,
  designMargin: 15,
  hotFlowRate: 20000,
  hotCp: 2.5,
  coldFlowRate: 30000,
  coldCp: 4.18,
};
