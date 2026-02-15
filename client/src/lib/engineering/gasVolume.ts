import type { GasVolumeInput } from "./validation";

export interface GasVolumeResult {
  standardFlowRate: number;
  actualFlowRate: number;
  conversionFactor: number;
  standardDensityRatio: number;
  warnings: string[];
}

export function calculateGasVolume(input: GasVolumeInput): GasVolumeResult {
  const warnings: string[] = [];

  const T_std_K = input.temperatureStd + 273.15;
  const T_act_K = input.temperatureActual + 273.15;

  const conversionFactor =
    (input.pressureActual / input.pressureStd) *
    (T_std_K / T_act_K) *
    (input.zFactorStd / input.zFactorActual);

  const actualFlowRate = input.flowRate / conversionFactor;
  const standardFlowRate = input.flowRate;

  const standardDensityRatio = conversionFactor;

  if (input.zFactorActual < 0.5) {
    warnings.push("Z-factor at actual conditions is unusually low — verify with equation of state");
  }
  if (input.zFactorActual > 1.2) {
    warnings.push("Z-factor at actual conditions is unusually high — verify with equation of state");
  }

  if (T_act_K < 200) {
    warnings.push("Very low actual temperature — verify cryogenic conditions are intended");
  }

  if (conversionFactor > 100) {
    warnings.push("Very high compression ratio — verify input conditions");
  }

  return {
    standardFlowRate,
    actualFlowRate,
    conversionFactor,
    standardDensityRatio,
    warnings,
  };
}

export const GAS_VOLUME_TEST_CASE: GasVolumeInput = {
  flowRate: 10000,
  pressureStd: 1.01325,
  temperatureStd: 15,
  pressureActual: 50,
  temperatureActual: 80,
  zFactorStd: 1.0,
  zFactorActual: 0.88,
};
