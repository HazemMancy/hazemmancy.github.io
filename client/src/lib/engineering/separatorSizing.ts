import { PI, GRAVITY } from "./constants";

/**
 * Separator / Knockout Drum Preliminary Sizing
 *
 * Souders-Brown equation for maximum allowable gas velocity:
 *   V_max = K * sqrt((ρL - ρG) / ρG)
 *
 * where:
 *   K    = Souders-Brown constant (m/s), depends on vessel type and internals
 *   ρL   = liquid density (kg/m³)
 *   ρG   = gas density (kg/m³)
 *
 * Vessel diameter from gas flow:
 *   A_min = Q_gas / (V_max * f_area)
 *   D     = sqrt(4 * A_min / π)
 *
 * where f_area = fraction of cross-section available for gas (vertical: ~1.0, horizontal: ~0.5)
 *
 * Liquid holdup for residence time:
 *   V_liquid = Q_liquid * t_residence
 *
 * For horizontal vessels, iterative sizing for L/D ratio (typically 3-5)
 *
 * Reference:
 * - API 12J (Specification for Oil and Gas Separators)
 * - GPSA Engineering Data Book, Section 7
 * - Arnold & Stewart, Surface Production Operations Vol. 1
 */

export type VesselOrientation = "vertical" | "horizontal";

export interface SeparatorInput {
  gasFlowRate: number;       // Sm³/h (standard volumetric)
  gasMolecularWeight: number; // kg/kmol
  gasDensity: number;        // kg/m³ at operating conditions
  liquidFlowRate: number;    // m³/h at operating conditions
  liquidDensity: number;     // kg/m³
  operatingPressure: number; // bar(g)
  operatingTemperature: number; // °C
  kFactor: number;           // Souders-Brown K (m/s), user-adjustable
  residenceTime: number;     // minutes (liquid holdup)
  orientation: VesselOrientation;
  ldRatio: number;           // L/D ratio for horizontal (typically 3-5)
  surgeTime: number;         // minutes (additional liquid surge volume)
  demisterPadDP: number;     // bar (pressure drop across demister, typically 0.001-0.005)
}

export interface SeparatorResult {
  maxGasVelocity: number;      // m/s (Souders-Brown)
  minVesselDiameter: number;   // mm (gas capacity)
  liquidHoldupVolume: number;  // m³
  surgeVolume: number;         // m³
  totalLiquidVolume: number;   // m³
  vesselDiameter: number;      // mm (governing dimension)
  vesselLength: number;        // mm (T-T for horizontal, height for vertical)
  vesselVolume: number;        // m³
  gasAreaFraction: number;
  actualGasVelocity: number;   // m/s based on final vessel size
  liquidLevelPercent: number;  // % of vessel ID
  warnings: string[];
}

export function calculateSeparatorSizing(input: SeparatorInput): SeparatorResult {
  const warnings: string[] = [];

  if (input.gasDensity <= 0) throw new Error("Gas density must be positive");
  if (input.liquidDensity <= 0) throw new Error("Liquid density must be positive");
  if (input.liquidDensity <= input.gasDensity) throw new Error("Liquid density must be greater than gas density");

  const rhoL = input.liquidDensity;
  const rhoG = input.gasDensity;
  const K = input.kFactor;

  const V_max = K * Math.sqrt((rhoL - rhoG) / rhoG);

  const Q_gas_m3s = (input.gasFlowRate / 3600) * (1.01325 / (input.operatingPressure + 1.01325)) *
    ((input.operatingTemperature + 273.15) / 288.15);

  const Q_liq_m3s = input.liquidFlowRate / 3600;

  const isVertical = input.orientation === "vertical";
  const gasAreaFraction = isVertical ? 1.0 : 0.5;

  const A_gas_min = Q_gas_m3s / (V_max * gasAreaFraction);
  const D_gas_min_m = Math.sqrt(4 * A_gas_min / PI);
  const D_gas_min_mm = D_gas_min_m * 1000;

  const liquidHoldup_m3 = Q_liq_m3s * input.residenceTime * 60;
  const surgeVolume_m3 = Q_liq_m3s * input.surgeTime * 60;
  const totalLiquidVolume = liquidHoldup_m3 + surgeVolume_m3;

  let vesselDia_mm: number;
  let vesselLength_mm: number;
  let liquidLevelPercent: number;

  if (isVertical) {
    vesselDia_mm = Math.max(D_gas_min_mm, 500);
    vesselDia_mm = Math.ceil(vesselDia_mm / 100) * 100;

    const vesselDia_m = vesselDia_mm / 1000;
    const vesselArea_m2 = (PI / 4) * vesselDia_m * vesselDia_m;

    const liquidHeight_m = totalLiquidVolume / vesselArea_m2;
    const gasDisengagementHeight_m = Math.max(0.6, vesselDia_m * 0.5);
    const inletNozzleHeight_m = 0.3;
    const demisterHeight_m = 0.15;
    const totalHeight_m = liquidHeight_m + gasDisengagementHeight_m + inletNozzleHeight_m + demisterHeight_m + 0.3;

    vesselLength_mm = Math.ceil(totalHeight_m * 1000 / 100) * 100;
    liquidLevelPercent = (liquidHeight_m / (vesselLength_mm / 1000)) * 100;
  } else {
    const LD = input.ldRatio;
    const D_liq_m = Math.pow((4 * totalLiquidVolume * 2) / (PI * LD), 1 / 3);
    const D_liq_mm = D_liq_m * 1000;

    vesselDia_mm = Math.max(D_gas_min_mm, D_liq_mm, 500);
    vesselDia_mm = Math.ceil(vesselDia_mm / 100) * 100;

    vesselLength_mm = Math.ceil(vesselDia_mm * LD / 100) * 100;

    const vesselDia_m = vesselDia_mm / 1000;
    const vesselArea_m2 = (PI / 4) * vesselDia_m * vesselDia_m;
    const vesselLength_m = vesselLength_mm / 1000;
    const vesselTotalVol = vesselArea_m2 * vesselLength_m;
    liquidLevelPercent = (totalLiquidVolume / vesselTotalVol) * 100;

    if (liquidLevelPercent > 75) {
      warnings.push(`Liquid level ${liquidLevelPercent.toFixed(0)}% exceeds 75% — increase vessel size or reduce residence time`);
    }
  }

  const vesselDia_m = vesselDia_mm / 1000;
  const vesselArea_m2 = (PI / 4) * vesselDia_m * vesselDia_m;
  const vesselLength_m = vesselLength_mm / 1000;
  const vesselVolume = vesselArea_m2 * vesselLength_m;

  const actualGasVelocity = Q_gas_m3s / (vesselArea_m2 * gasAreaFraction);

  if (actualGasVelocity > V_max) {
    warnings.push(`Actual gas velocity ${actualGasVelocity.toFixed(2)} m/s exceeds Souders-Brown limit ${V_max.toFixed(2)} m/s`);
  }

  const actualLD = vesselLength_mm / vesselDia_mm;
  if (!isVertical && (actualLD < 2.5 || actualLD > 6)) {
    warnings.push(`L/D ratio ${actualLD.toFixed(1)} outside typical range (2.5–6.0)`);
  }
  if (isVertical && (actualLD < 2 || actualLD > 5)) {
    warnings.push(`Height/Diameter ratio ${actualLD.toFixed(1)} outside typical range (2–5)`);
  }

  if (K > 0.15) {
    warnings.push(`K-factor ${K.toFixed(3)} m/s is high — typically 0.03–0.12 for most services. Verify with vendor/internals data.`);
  }

  if (input.operatingPressure > 100) {
    warnings.push("High pressure service — wall thickness and weight may be significant factors");
  }

  return {
    maxGasVelocity: V_max,
    minVesselDiameter: D_gas_min_mm,
    liquidHoldupVolume: liquidHoldup_m3,
    surgeVolume: surgeVolume_m3,
    totalLiquidVolume,
    vesselDiameter: vesselDia_mm,
    vesselLength: vesselLength_mm,
    vesselVolume,
    gasAreaFraction,
    actualGasVelocity,
    liquidLevelPercent,
    warnings,
  };
}

export const SEPARATOR_VERTICAL_TEST_CASE: SeparatorInput = {
  gasFlowRate: 5000,
  gasMolecularWeight: 18.5,
  gasDensity: 25,
  liquidFlowRate: 10,
  liquidDensity: 800,
  operatingPressure: 30,
  operatingTemperature: 40,
  kFactor: 0.07,
  residenceTime: 5,
  orientation: "vertical",
  ldRatio: 3,
  surgeTime: 2,
  demisterPadDP: 0.003,
};

export const SEPARATOR_HORIZONTAL_TEST_CASE: SeparatorInput = {
  gasFlowRate: 15000,
  gasMolecularWeight: 18.5,
  gasDensity: 25,
  liquidFlowRate: 50,
  liquidDensity: 800,
  operatingPressure: 30,
  operatingTemperature: 40,
  kFactor: 0.10,
  residenceTime: 5,
  orientation: "horizontal",
  ldRatio: 4,
  surgeTime: 3,
  demisterPadDP: 0.003,
};
