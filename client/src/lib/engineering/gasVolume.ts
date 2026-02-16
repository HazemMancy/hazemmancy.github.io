export type FlowUnitType =
  | "Nm3/h"
  | "Sm3/h"
  | "Am3/h"
  | "Am3/s"
  | "SCFM"
  | "MMSCFD"
  | "ACFM";

export interface FlowUnitDef {
  label: string;
  factor: number;
  refP_kPa: number;
  refT_K: number;
  refZ: number;
  isActual: boolean;
  pLabel_SI: string;
  tLabel_SI: string;
}

const ATM_KPA = 101.325;
const T_NORMAL_K = 273.15;
const T_STANDARD_K = 288.15;
const T_60F_K = 288.706;
const FT3_TO_M3 = 0.028316846592;

export const FLOW_UNITS: Record<FlowUnitType, FlowUnitDef> = {
  "Nm3/h": {
    label: "Nm\u00B3/h (Normal, 0\u00B0C, 1 atm)",
    factor: 1,
    refP_kPa: ATM_KPA,
    refT_K: T_NORMAL_K,
    refZ: 1.0,
    isActual: false,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "Sm3/h": {
    label: "Sm\u00B3/h (Standard, 15\u00B0C, 1 atm)",
    factor: 1,
    refP_kPa: ATM_KPA,
    refT_K: T_STANDARD_K,
    refZ: 1.0,
    isActual: false,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "Am3/h": {
    label: "Am\u00B3/h (Actual)",
    factor: 1,
    refP_kPa: ATM_KPA,
    refT_K: T_STANDARD_K,
    refZ: 1.0,
    isActual: true,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "Am3/s": {
    label: "Am\u00B3/s (Actual)",
    factor: 3600,
    refP_kPa: ATM_KPA,
    refT_K: T_STANDARD_K,
    refZ: 1.0,
    isActual: true,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "SCFM": {
    label: "SCFM (60\u00B0F, 14.696 psia)",
    factor: FT3_TO_M3 * 60,
    refP_kPa: ATM_KPA,
    refT_K: T_60F_K,
    refZ: 1.0,
    isActual: false,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "MMSCFD": {
    label: "MMSCFD (60\u00B0F, 14.696 psia)",
    factor: 1e6 * FT3_TO_M3 / 24,
    refP_kPa: ATM_KPA,
    refT_K: T_60F_K,
    refZ: 1.0,
    isActual: false,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "ACFM": {
    label: "ACFM (Actual)",
    factor: FT3_TO_M3 * 60,
    refP_kPa: ATM_KPA,
    refT_K: T_STANDARD_K,
    refZ: 1.0,
    isActual: true,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
};

export interface GasVolumeInput {
  volume: number;
  fromUnit: FlowUnitType;
  fromP_kPa: number;
  fromT_K: number;
  fromZ: number;
  toUnit: FlowUnitType;
  toP_kPa: number;
  toT_K: number;
  toZ: number;
}

export interface SolutionStep {
  label: string;
  value: string;
}

export interface AllUnitsResult {
  unit: FlowUnitType;
  value: number;
}

export interface GasVolumeResult {
  outputVolume: number;
  outputUnit: FlowUnitType;
  inputVolume: number;
  inputUnit: FlowUnitType;
  steps: SolutionStep[];
  allUnits: AllUnitsResult[];
  warnings: string[];
}

function fmtNum(n: number, digits = 3): string {
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(digits);
  return n.toPrecision(4);
}

export function calculateGasVolume(input: GasVolumeInput): GasVolumeResult {
  const warnings: string[] = [];

  if (input.volume <= 0) throw new Error("Volume must be positive");
  if (input.fromP_kPa <= 0) throw new Error("Source pressure must be positive");
  if (input.toP_kPa <= 0) throw new Error("Target pressure must be positive");
  if (input.fromT_K <= 0) throw new Error("Source temperature must be above absolute zero");
  if (input.toT_K <= 0) throw new Error("Target temperature must be above absolute zero");
  if (input.fromZ <= 0 || input.fromZ > 2) throw new Error("Source Z-factor must be between 0 and 2");
  if (input.toZ <= 0 || input.toZ > 2) throw new Error("Target Z-factor must be between 0 and 2");

  const fromDef = FLOW_UNITS[input.fromUnit];
  const toDef = FLOW_UNITS[input.toUnit];

  const steps: SolutionStep[] = [];

  steps.push({ label: "Gas Law", value: "V2 = V1 \u00D7 (P1/P2) \u00D7 (T2/T1) \u00D7 (Z2/Z1)" });

  const V1_m3h = input.volume * fromDef.factor;

  steps.push({ label: "V1", value: `${fmtNum(input.volume)} ${input.fromUnit}` });

  if (fromDef.factor !== 1) {
    steps.push({ label: "V1 (as m\u00B3/h)", value: `${fmtNum(V1_m3h)} m\u00B3/h` });
  }

  const P1 = input.fromP_kPa;
  const T1 = input.fromT_K;
  const Z1 = input.fromZ;
  const P2 = input.toP_kPa;
  const T2 = input.toT_K;
  const Z2 = input.toZ;

  steps.push({ label: "P1", value: `${fmtNum(P1)} kPa abs` });
  steps.push({ label: "T1", value: `${fmtNum(T1)} K` });
  steps.push({ label: "Z1", value: `${fmtNum(Z1)}` });
  steps.push({ label: "P2", value: `${fmtNum(P2)} kPa abs` });
  steps.push({ label: "T2", value: `${fmtNum(T2)} K` });
  steps.push({ label: "Z2", value: `${fmtNum(Z2)}` });

  const V2_m3h = V1_m3h * (P1 / P2) * (T2 / T1) * (Z2 / Z1);

  steps.push({
    label: "V2 (m\u00B3/h)",
    value: `${fmtNum(V1_m3h)} \u00D7 (${fmtNum(P1)}/${fmtNum(P2)}) \u00D7 (${fmtNum(T2)}/${fmtNum(T1)}) \u00D7 (${fmtNum(Z2)}/${fmtNum(Z1)}) = ${fmtNum(V2_m3h)}`,
  });

  const outputVolume = V2_m3h / toDef.factor;

  if (toDef.factor !== 1) {
    steps.push({ label: `V2 (${input.toUnit})`, value: `${fmtNum(V2_m3h)} / ${fmtNum(toDef.factor)} = ${fmtNum(outputVolume)}` });
  }

  steps.push({ label: "Result", value: `${fmtNum(outputVolume)} ${input.toUnit}` });

  const allUnits: AllUnitsResult[] = [];
  for (const unitKey of Object.keys(FLOW_UNITS) as FlowUnitType[]) {
    const def = FLOW_UNITS[unitKey];
    let targetP: number, targetT: number, targetZ: number;
    if (unitKey === input.toUnit) {
      targetP = P2;
      targetT = T2;
      targetZ = Z2;
    } else if (def.isActual) {
      targetP = P2;
      targetT = T2;
      targetZ = Z2;
    } else {
      targetP = def.refP_kPa;
      targetT = def.refT_K;
      targetZ = def.refZ;
    }
    const v_m3h = V1_m3h * (P1 / targetP) * (targetT / T1) * (targetZ / Z1);
    allUnits.push({ unit: unitKey, value: v_m3h / def.factor });
  }

  if (input.fromZ < 0.5 || input.toZ < 0.5) {
    warnings.push("Z-factor is unusually low \u2014 verify with equation of state");
  }
  if (input.fromZ > 1.2 || input.toZ > 1.2) {
    warnings.push("Z-factor is unusually high \u2014 verify with equation of state");
  }
  if (input.fromT_K < 200 || input.toT_K < 200) {
    warnings.push("Very low temperature \u2014 verify cryogenic conditions are intended");
  }

  return {
    outputVolume,
    outputUnit: input.toUnit,
    inputVolume: input.volume,
    inputUnit: input.fromUnit,
    steps,
    allUnits,
    warnings,
  };
}

export const GAS_VOLUME_TEST_CASE = {
  volume: 1,
  fromUnit: "MMSCFD" as FlowUnitType,
  fromP_bar: 1.01325,
  fromT_C: 15.56,
  fromZ: 1.0,
  toUnit: "Sm3/h" as FlowUnitType,
  toP_bar: 1.01325,
  toT_C: 15,
  toZ: 1.0,
};
