import { PI, GAS_CONSTANT, MACH_LIMIT, RHO_V2_LIMIT, VELOCITY_LIMITS } from "./constants";
import type { GasLineSizingInput } from "./validation";

export interface GasSizingResult {
  velocity: number;
  reynoldsNumber: number;
  frictionFactor: number;
  pressureDrop: number;
  pressureDropPer100m: number;
  /** Fraction of inlet absolute pressure lost to friction: dP / P_in (dimensionless) */
  pressureDropFraction: number;
  machNumber: number;
  rhoV2: number;
  gasDensity: number;
  warnings: string[];
}

function swameeJainFriction(Re: number, roughness: number, diameter: number): number {
  if (Re < 2300) {
    return 64 / Re;
  }
  const relRoughness = roughness / diameter;
  const term = Math.log10(relRoughness / 3.7 + 5.74 / Math.pow(Re, 0.9));
  return 0.25 / Math.pow(term, 2);
}

export function calculateGasLineSizing(input: GasLineSizingInput): GasSizingResult {
  const warnings: string[] = [];

  if (input.innerDiameter <= 0) throw new Error("Inner diameter must be positive");
  if (input.pipeLength <= 0) throw new Error("Pipe length must be positive");
  if (input.pressure <= 0) throw new Error("Pressure must be positive (absolute)");
  if (input.flowRate <= 0) throw new Error("Flow rate must be positive");
  if (input.molecularWeight <= 0) throw new Error("Molecular weight must be positive");
  if (input.compressibilityFactor <= 0) throw new Error("Compressibility factor Z must be positive");
  if (input.specificHeatRatio <= 1) throw new Error("Specific heat ratio k must be greater than 1");
  if (input.viscosity <= 0) throw new Error("Gas viscosity must be positive");
  if (input.roughness < 0) throw new Error("Pipe roughness must be non-negative");

  const T_K = input.temperature + 273.15;
  if (T_K <= 0) throw new Error("Absolute temperature must be positive (check temperature input)");

  const P_Pa = input.pressure * 1e5;
  const D_m = input.innerDiameter / 1000;
  const A = PI * Math.pow(D_m, 2) / 4;

  const rho = (P_Pa * input.molecularWeight) / (input.compressibilityFactor * GAS_CONSTANT * T_K);
  if (!isFinite(rho) || rho <= 0) throw new Error("Computed gas density is invalid — check pressure, temperature, and MW inputs");

  const massFlow_kgs = input.flowRate / 3600;
  const velocity = massFlow_kgs / (rho * A);
  if (!isFinite(velocity)) throw new Error("Computed velocity is invalid — check inputs");

  const mu_Pas = input.viscosity * 1e-3;
  const Re = (rho * velocity * D_m) / mu_Pas;

  const roughness_m = input.roughness / 1000;
  const f = swameeJainFriction(Re, roughness_m, D_m);

  const dP_Pa = f * (input.pipeLength / D_m) * 0.5 * rho * Math.pow(velocity, 2);
  const dP_bar = dP_Pa / 1e5;
  const dP_per100m = input.pipeLength > 0 ? (dP_bar / input.pipeLength) * 100 : 0;

  const pressureDropFraction = dP_bar / input.pressure;

  if (pressureDropFraction > 0.4) {
    warnings.push(
      `ΔP/P_in = ${(pressureDropFraction * 100).toFixed(1)}% — HIGH: constant-density Darcy screening is unreliable at this pressure drop. Results are indicative only. Use a rigorous compressible-flow solver or process simulator.`
    );
  } else if (pressureDropFraction > 0.1) {
    warnings.push(
      `ΔP/P_in = ${(pressureDropFraction * 100).toFixed(1)}% — CAUTION: significant fraction of inlet pressure lost. Constant-density screening assumption introduces increasing error. Consider segmented calculation.`
    );
  }

  const sonicVelocity = Math.sqrt(
    (input.specificHeatRatio * input.compressibilityFactor * GAS_CONSTANT * T_K) / input.molecularWeight
  );
  const machNumber = velocity / sonicVelocity;

  const rhoV2 = rho * Math.pow(velocity, 2);

  if (velocity > VELOCITY_LIMITS.gas.max) {
    warnings.push(`Velocity ${velocity.toFixed(1)} m/s exceeds maximum recommended limit of ${VELOCITY_LIMITS.gas.max} m/s`);
  } else if (velocity > VELOCITY_LIMITS.gas.warning) {
    warnings.push(`Velocity ${velocity.toFixed(1)} m/s is approaching the upper limit of ${VELOCITY_LIMITS.gas.max} m/s`);
  }
  if (velocity < VELOCITY_LIMITS.gas.min) {
    warnings.push(`Velocity ${velocity.toFixed(1)} m/s is below minimum recommended velocity of ${VELOCITY_LIMITS.gas.min} m/s`);
  }

  if (machNumber > MACH_LIMIT) {
    warnings.push(`Mach number ${machNumber.toFixed(3)} exceeds ${MACH_LIMIT} — risk of choking/noise issues`);
  }

  if (rhoV2 > RHO_V2_LIMIT) {
    warnings.push(`ρv² = ${rhoV2.toFixed(0)} kg/(m·s²) exceeds ${RHO_V2_LIMIT} — potential AIV/FIV concern`);
  }

  if (Re < 2300) {
    warnings.push("Laminar flow regime detected (Re < 2300). Verify operating conditions.");
  }

  return {
    velocity,
    reynoldsNumber: Re,
    frictionFactor: f,
    pressureDrop: dP_bar,
    pressureDropPer100m: dP_per100m,
    pressureDropFraction,
    machNumber,
    rhoV2,
    gasDensity: rho,
    warnings,
  };
}

// Gas export pipeline — per GPSA Engineering Data Book, Section 17
// Sweet natural gas at moderate pressure through 10" Sch 40 CS pipe
// Expected: velocity ~12–18 m/s, ΔP/100m within API RP 14E limits
export const GAS_SIZING_TEST_CASE: GasLineSizingInput = {
  flowRate: 50000,             // kg/h — mass flow rate (solver basis)
  pressure: 30,                // bar(a) — absolute inlet pressure (required for gas density)
  temperature: 40,             // °C — typical process temperature
  molecularWeight: 18.5,       // sweet natural gas (GPSA typical composition)
  innerDiameter: 254.5,        // mm — 10" NPS Sch 40 (ID = 254.5 mm per ASME B36.10)
  pipeLength: 500,             // m — moderate run between facilities
  roughness: 0.0457,           // mm — commercial carbon steel (Moody, GPSA Table 17-7)
  compressibilityFactor: 0.92, // Z at 30 bara, 40°C (GPSA Fig 23-4)
  specificHeatRatio: 1.27,     // k for natural gas (GPSA Section 13)
  viscosity: 0.012,            // cP — gas viscosity at conditions (GPSA Fig 23-27)
};
