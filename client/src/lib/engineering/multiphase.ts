import { PI, VELOCITY_LIMITS } from "./constants";
import type { MultiphaseInput } from "./validation";

export interface MultiphaseResult {
  superficialGasVelocity: number;
  superficialLiquidVelocity: number;
  mixtureVelocity: number;
  erosionalVelocity: number;
  mixtureDensity: number;
  rhoV2: number;
  liquidHoldup: number;
  velocityRatio: number;
  warnings: string[];
}

export function calculateMultiphase(input: MultiphaseInput): MultiphaseResult {
  const warnings: string[] = [];

  if (input.innerDiameter <= 0) throw new Error("Inner diameter must be positive");
  if (input.gasDensity <= 0) throw new Error("Gas density must be positive");
  if (input.liquidDensity <= 0) throw new Error("Liquid density must be positive");
  if (input.gasFlowRate < 0) throw new Error("Gas flow rate must be non-negative");
  if (input.liquidFlowRate < 0) throw new Error("Liquid flow rate must be non-negative");
  if (input.gasFlowRate <= 0 && input.liquidFlowRate <= 0) throw new Error("At least one phase must have positive flow");
  if (input.cFactor <= 0) throw new Error("C-factor must be positive");
  if (input.liquidDensity <= input.gasDensity) {
    warnings.push("Liquid density ≤ gas density — verify fluid properties (possible near-critical conditions)");
  }

  const D_m = input.innerDiameter / 1000;
  const A = PI * Math.pow(D_m, 2) / 4;

  const Qg_m3s = input.gasFlowRate / 3600;
  const Ql_m3s = input.liquidFlowRate / 3600;

  const Vsg = Qg_m3s / A;
  const Vsl = Ql_m3s / A;
  const Vm = Vsg + Vsl;

  const totalSuperVel = Vsg + Vsl;
  const lambdaL = totalSuperVel > 0 ? Vsl / totalSuperVel : 0;
  const mixtureDensity = input.liquidDensity * lambdaL + input.gasDensity * (1 - lambdaL);

  const erosionalVelocity = input.cFactor / Math.sqrt(mixtureDensity);

  const rhoV2 = mixtureDensity * Vm * Vm;
  const velocityRatio = Vm / erosionalVelocity;

  if (Vm > erosionalVelocity) {
    warnings.push(`Mixture velocity ${Vm.toFixed(2)} m/s exceeds API RP 14E erosional velocity of ${erosionalVelocity.toFixed(2)} m/s`);
  } else if (velocityRatio > 0.8) {
    warnings.push(`Mixture velocity is at ${(velocityRatio * 100).toFixed(0)}% of erosional velocity — approaching limit`);
  }

  if (Vm > VELOCITY_LIMITS.multiphase.max) {
    warnings.push(`Mixture velocity ${Vm.toFixed(2)} m/s exceeds typical multiphase limit of ${VELOCITY_LIMITS.multiphase.max} m/s`);
  }

  if (lambdaL > 0.5) {
    warnings.push("High liquid holdup — expect slug flow regime");
  } else if (lambdaL < 0.01 && input.liquidFlowRate > 0) {
    warnings.push("Very low liquid content — mist flow likely");
  }

  return {
    superficialGasVelocity: Vsg,
    superficialLiquidVelocity: Vsl,
    mixtureVelocity: Vm,
    erosionalVelocity,
    mixtureDensity,
    rhoV2,
    liquidHoldup: lambdaL,
    velocityRatio,
    warnings,
  };
}

// Wellhead flowline — per API RP 14E erosional velocity screening
// Gas-condensate multiphase flow in 10" Sch 40 CS pipe
// Expected: erosional velocity ~8–15 m/s, ρV² < 10,000 Pa
export const MULTIPHASE_TEST_CASE: MultiphaseInput = {
  gasFlowRate: 5000,     // Sm³/h — gas from wellhead/manifold
  liquidFlowRate: 50,    // m³/h — condensate/produced water
  gasDensity: 25,        // kg/m³ — at operating P/T (from PVT)
  liquidDensity: 800,    // kg/m³ — condensate + water weighted average
  innerDiameter: 254.5,  // mm — 10" NPS Sch 40 (ASME B36.10)
  pipeLength: 1000,      // m — flowline from wellhead to separator
  cFactor: 150,          // API RP 14E C-factor (continuous service, inhibited)
};
