import { z } from "zod";

// ---------------------------------------------------------------------------
// Unit type definitions
// ---------------------------------------------------------------------------

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
  /** Conversion factor: value_in_this_unit × factor = m³/h */
  factor: number;
  /** Fixed reference pressure (kPa abs) — used only for non-actual units */
  refP_kPa: number;
  /** Fixed reference temperature (K) — used only for non-actual units */
  refT_K: number;
  refZ: number;
  /** True = actual-condition unit; conditions are operating P, T, Z — NOT fixed reference */
  isActual: boolean;
  pLabel_SI: string;
  tLabel_SI: string;
}

// ---------------------------------------------------------------------------
// Reference condition constants (must match label text exactly)
// ---------------------------------------------------------------------------

const ATM_KPA = 101.325;       // 1 atm = 101.325 kPa
const T_NORMAL_K = 273.15;     // 0°C — Normal basis per ISO 13443
const T_STANDARD_K = 288.15;   // 15°C — Standard basis per ISO 13443
const T_60F_K = 288.706;       // 60°F — US standard basis
const FT3_TO_M3 = 0.028316846592;

export const FLOW_UNITS: Record<FlowUnitType, FlowUnitDef> = {
  "Nm3/h": {
    label: "Nm\u00B3/h \u2014 Normal m\u00B3/h (0\u00B0C, 101.325 kPa abs) \u2014 fixed reference",
    factor: 1,
    refP_kPa: ATM_KPA,
    refT_K: T_NORMAL_K,
    refZ: 1.0,
    isActual: false,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "Sm3/h": {
    label: "Sm\u00B3/h \u2014 Standard m\u00B3/h (15\u00B0C, 101.325 kPa abs) \u2014 fixed reference",
    factor: 1,
    refP_kPa: ATM_KPA,
    refT_K: T_STANDARD_K,
    refZ: 1.0,
    isActual: false,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  // Actual-condition units: reference fields are placeholders only.
  // Actual P, T, Z must be supplied by the user at operating conditions.
  "Am3/h": {
    label: "Am\u00B3/h \u2014 Actual m\u00B3/h \u2014 condition-dependent (requires P, T, Z)",
    factor: 1,
    refP_kPa: ATM_KPA,
    refT_K: T_STANDARD_K,
    refZ: 1.0,
    isActual: true,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "Am3/s": {
    label: "Am\u00B3/s \u2014 Actual m\u00B3/s \u2014 condition-dependent (requires P, T, Z)",
    factor: 3600,
    refP_kPa: ATM_KPA,
    refT_K: T_STANDARD_K,
    refZ: 1.0,
    isActual: true,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "SCFM": {
    label: "SCFM \u2014 Standard ft\u00B3/min (60\u00B0F, 14.696 psia) \u2014 fixed US reference",
    factor: FT3_TO_M3 * 60,
    refP_kPa: ATM_KPA,
    refT_K: T_60F_K,
    refZ: 1.0,
    isActual: false,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "MMSCFD": {
    label: "MMSCFD \u2014 MM std ft\u00B3/day (60\u00B0F, 14.696 psia) \u2014 fixed US reference",
    factor: 1e6 * FT3_TO_M3 / 24,
    refP_kPa: ATM_KPA,
    refT_K: T_60F_K,
    refZ: 1.0,
    isActual: false,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
  "ACFM": {
    label: "ACFM \u2014 Actual ft\u00B3/min \u2014 condition-dependent (requires P, T, Z)",
    factor: FT3_TO_M3 * 60,
    refP_kPa: ATM_KPA,
    refT_K: T_STANDARD_K,
    refZ: 1.0,
    isActual: true,
    pLabel_SI: "bar(a)",
    tLabel_SI: "\u00B0C",
  },
};

// ---------------------------------------------------------------------------
// Zod validation schema — matches real solver input exactly
// ---------------------------------------------------------------------------

const FLOW_UNIT_VALUES = Object.keys(FLOW_UNITS) as [FlowUnitType, ...FlowUnitType[]];

export const gasVolumeInputSchema = z.object({
  volume: z.number({ invalid_type_error: "Volume must be a number" })
    .positive("Volume must be greater than zero"),

  fromUnit: z.enum(FLOW_UNIT_VALUES, { errorMap: () => ({ message: "Invalid source unit" }) }),
  toUnit:   z.enum(FLOW_UNIT_VALUES, { errorMap: () => ({ message: "Invalid target unit" }) }),

  /** Source absolute pressure (kPa) */
  fromP_kPa: z.number().positive("Source pressure must be positive (absolute)"),
  /** Source absolute temperature (K) */
  fromT_K: z.number().positive("Source temperature must be above absolute zero"),
  /** Source compressibility factor — user-supplied; not calculated internally */
  fromZ: z.number()
    .positive("Source Z-factor must be positive")
    .max(2.5, "Source Z-factor above 2.5 is unrealistic — verify EOS source"),

  /** Target absolute pressure (kPa) */
  toP_kPa: z.number().positive("Target pressure must be positive (absolute)"),
  /** Target absolute temperature (K) */
  toT_K: z.number().positive("Target temperature must be above absolute zero"),
  /** Target compressibility factor — user-supplied; not calculated internally */
  toZ: z.number()
    .positive("Target Z-factor must be positive")
    .max(2.5, "Target Z-factor above 2.5 is unrealistic — verify EOS source"),
});

export type GasVolumeInput = z.infer<typeof gasVolumeInputSchema>;

// ---------------------------------------------------------------------------
// Result interfaces
// ---------------------------------------------------------------------------

export interface SolutionStep {
  label: string;
  value: string;
}

export interface AllUnitsResult {
  unit: FlowUnitType;
  value: number;
  /** True = fixed reference conditions; False = condition-dependent (actual) */
  isFixedReference: boolean;
  /** Note shown alongside actual-condition results in the UI */
  conditionNote?: string;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtNum(n: number, digits = 3): string {
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(digits);
  return n.toPrecision(4);
}

// ---------------------------------------------------------------------------
// Main calculation function
// ---------------------------------------------------------------------------

export function calculateGasVolume(rawInput: GasVolumeInput): GasVolumeResult {
  // --- Schema validation in the actual solve path ---
  const parsed = gasVolumeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    throw new Error(first?.message ?? "Invalid input");
  }
  const input = parsed.data;

  const warnings: string[] = [];

  const fromDef = FLOW_UNITS[input.fromUnit];
  const toDef   = FLOW_UNITS[input.toUnit];

  // Warn if actual unit is used without obvious non-atmospheric conditions
  if (fromDef.isActual && Math.abs(input.fromP_kPa - ATM_KPA) < 0.1 && Math.abs(input.fromT_K - T_STANDARD_K) < 1) {
    warnings.push("Source is an actual-condition unit but P/T appear to be at reference conditions — confirm operating conditions are intended.");
  }
  if (toDef.isActual && Math.abs(input.toP_kPa - ATM_KPA) < 0.1 && Math.abs(input.toT_K - T_STANDARD_K) < 1) {
    warnings.push("Target is an actual-condition unit but P/T appear to be at reference conditions — confirm target operating conditions are intended.");
  }

  // Z-factor range warnings
  if (input.fromZ < 0.5) {
    warnings.push("Source Z-factor < 0.5 is unusually low — verify with EOS or property simulator.");
  } else if (input.fromZ < 0.8) {
    warnings.push("Source Z-factor < 0.8 — significant departure from ideal gas; ensure Z is from a validated EOS or correlation.");
  }
  if (input.toZ < 0.5) {
    warnings.push("Target Z-factor < 0.5 is unusually low — verify with EOS or property simulator.");
  } else if (input.toZ < 0.8) {
    warnings.push("Target Z-factor < 0.8 — significant departure from ideal gas; ensure Z is from a validated EOS or correlation.");
  }
  if (input.fromZ > 1.2) {
    warnings.push("Source Z-factor > 1.2 is unusually high — verify with equation of state.");
  }
  if (input.toZ > 1.2) {
    warnings.push("Target Z-factor > 1.2 is unusually high — verify with equation of state.");
  }

  // Temperature warnings
  if (input.fromT_K < 200) {
    warnings.push("Source temperature below \u2212073\u00B0C (\u2212100\u00B0F) — verify cryogenic conditions are intended.");
  }
  if (input.toT_K < 200) {
    warnings.push("Target temperature below \u2212073\u00B0C (\u2212100\u00B0F) — verify cryogenic conditions are intended.");
  }

  // Large pressure-ratio warning
  const pRatio = Math.max(input.fromP_kPa, input.toP_kPa) / Math.min(input.fromP_kPa, input.toP_kPa);
  if (pRatio > 100) {
    warnings.push(`High pressure ratio (${fmtNum(pRatio, 1)}\u00D7) between source and target conditions — large volume change; Z-factor accuracy is critical.`);
  } else if (pRatio > 20) {
    warnings.push(`Significant pressure ratio (${fmtNum(pRatio, 1)}\u00D7) between source and target — verify Z-factors are appropriate for each condition independently.`);
  }

  // Near-critical / high-pressure warning
  if (input.fromP_kPa > 7000 || input.toP_kPa > 7000) {
    warnings.push("Pressure exceeds 70 bar(a) — gas may be near-critical or supercritical. Z-factor from a rigorous EOS (PR, SRK) is strongly recommended.");
  }

  // Build calculation steps
  const steps: SolutionStep[] = [];

  steps.push({
    label: "Gas Law",
    value: "V2 = V1 \u00D7 (P1/P2) \u00D7 (T2/T1) \u00D7 (Z2/Z1)  [Real gas law: PV = ZnRT]",
  });

  // Convert V1 to m³/h as the internal working unit
  const V1_m3h = input.volume * fromDef.factor;

  steps.push({ label: "V1", value: `${fmtNum(input.volume)} ${input.fromUnit}` });

  if (fromDef.factor !== 1) {
    steps.push({ label: "V1 (m\u00B3/h)", value: `${fmtNum(V1_m3h)} m\u00B3/h` });
  }

  const P1 = input.fromP_kPa;
  const T1 = input.fromT_K;
  const Z1 = input.fromZ;
  const P2 = input.toP_kPa;
  const T2 = input.toT_K;
  const Z2 = input.toZ;

  const srcBasis = fromDef.isActual
    ? "actual operating conditions (user-supplied)"
    : `fixed reference: ${fromDef.label}`;
  const tgtBasis = toDef.isActual
    ? "actual operating conditions (user-supplied)"
    : `fixed reference: ${toDef.label}`;

  steps.push({ label: "P1 (source)", value: `${fmtNum(P1)} kPa abs  \u2014 ${srcBasis}` });
  steps.push({ label: "T1 (source)", value: `${fmtNum(T1)} K` });
  steps.push({ label: "Z1 (user-supplied)", value: `${fmtNum(Z1)}` });
  steps.push({ label: "P2 (target)", value: `${fmtNum(P2)} kPa abs  \u2014 ${tgtBasis}` });
  steps.push({ label: "T2 (target)", value: `${fmtNum(T2)} K` });
  steps.push({ label: "Z2 (user-supplied)", value: `${fmtNum(Z2)}` });

  const V2_m3h = V1_m3h * (P1 / P2) * (T2 / T1) * (Z2 / Z1);

  steps.push({
    label: "V2 (m\u00B3/h)",
    value: `${fmtNum(V1_m3h)} \u00D7 (${fmtNum(P1)}/${fmtNum(P2)}) \u00D7 (${fmtNum(T2)}/${fmtNum(T1)}) \u00D7 (${fmtNum(Z2)}/${fmtNum(Z1)}) = ${fmtNum(V2_m3h)}`,
  });

  const outputVolume = V2_m3h / toDef.factor;

  if (toDef.factor !== 1) {
    steps.push({
      label: `V2 (${input.toUnit})`,
      value: `${fmtNum(V2_m3h)} / ${fmtNum(toDef.factor)} = ${fmtNum(outputVolume)}`,
    });
  }

  steps.push({ label: "Result", value: `${fmtNum(outputVolume)} ${input.toUnit}` });

  // ---------------------------------------------------------------------------
  // All-units table — OPTION A implementation
  //
  // Rule:
  //   - Fixed-reference units (Nm³/h, Sm³/h, SCFM, MMSCFD): always included;
  //     computed at their own immutable reference P/T/Z.
  //   - Actual-condition units (Am³/h, Am³/s, ACFM): included ONLY when that
  //     unit is the explicitly selected target unit (using target P2/T2/Z2).
  //     If not the selected target, they are omitted — no surrogate actual-
  //     condition basis is assumed.
  //
  // This prevents the misleading display of actual-unit equivalents whose
  // P/T/Z basis has not been explicitly defined by the user.
  // ---------------------------------------------------------------------------

  const allUnits: AllUnitsResult[] = [];

  for (const unitKey of Object.keys(FLOW_UNITS) as FlowUnitType[]) {
    const def = FLOW_UNITS[unitKey];

    if (def.isActual) {
      // Only include if this IS the selected target unit (explicit basis defined)
      if (unitKey !== input.toUnit) continue;

      const v_m3h = V1_m3h * (P1 / P2) * (T2 / T1) * (Z2 / Z1);
      allUnits.push({
        unit: unitKey,
        value: v_m3h / def.factor,
        isFixedReference: false,
        conditionNote: `at target conditions: ${fmtNum(P2)} kPa abs, ${fmtNum(T2)} K, Z=${fmtNum(Z2)}`,
      });
    } else {
      // Fixed-reference unit: compute at its immutable reference conditions
      const targetP = def.refP_kPa;
      const targetT = def.refT_K;
      const targetZ = def.refZ;
      const v_m3h = V1_m3h * (P1 / targetP) * (targetT / T1) * (targetZ / Z1);
      allUnits.push({
        unit: unitKey,
        value: v_m3h / def.factor,
        isFixedReference: true,
      });
    }
  }

  // Always ensure the selected output unit is in the table (may already be there)
  const outputInTable = allUnits.some(a => a.unit === input.toUnit);
  if (!outputInTable) {
    // This case shouldn't arise under normal flow, but guard defensively
    allUnits.unshift({
      unit: input.toUnit,
      value: outputVolume,
      isFixedReference: !toDef.isActual,
      conditionNote: toDef.isActual
        ? `at target conditions: ${fmtNum(P2)} kPa abs, ${fmtNum(T2)} K, Z=${fmtNum(Z2)}`
        : undefined,
    });
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

// ---------------------------------------------------------------------------
// Reference test case — per ISO 13443 / GPA 2172
// 1 MMSCFD (60°F, 14.696 psia) → Sm³/h (15°C, 101.325 kPa)
// Expected: ≈ 1,177.6 Sm³/h (verified against ISO 13443 conversion factors)
// ---------------------------------------------------------------------------
export const GAS_VOLUME_TEST_CASE = {
  volume: 1,
  fromUnit: "MMSCFD" as FlowUnitType,
  fromP_bar: 1.01325,     // 14.696 psia — US standard reference pressure
  fromT_C: 15.56,         // 60°F — US standard reference temperature
  fromZ: 1.0,             // ideal gas at reference conditions
  toUnit: "Sm3/h" as FlowUnitType,
  toP_bar: 1.01325,       // 1.01325 bara — ISO 13443 reference pressure
  toT_C: 15,              // 15°C — ISO 13443 reference temperature
  toZ: 1.0,               // ideal gas at reference conditions
};
