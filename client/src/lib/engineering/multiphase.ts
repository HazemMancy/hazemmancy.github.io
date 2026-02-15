import { PI, VELOCITY_LIMITS } from "./constants";
import type { MultiphaseInput } from "./validation";

export interface MultiphaseResult {
  superficialGasVelocity: number;
  superficialLiquidVelocity: number;
  mixtureVelocity: number;
  erosionalVelocity: number;
  mixtureDensity: number;
  liquidHoldup: number;
  velocityRatio: number;
  warnings: string[];
}

export function calculateMultiphase(input: MultiphaseInput): MultiphaseResult {
  const warnings: string[] = [];

  const D_m = input.innerDiameter / 1000;
  const A = PI * Math.pow(D_m, 2) / 4;

  const Qg_m3s = input.gasFlowRate / 3600;
  const Ql_m3s = input.liquidFlowRate / 3600;

  const Vsg = Qg_m3s / A;
  const Vsl = Ql_m3s / A;
  const Vm = Vsg + Vsl;

  const lambdaL = Vsl / (Vsg + Vsl + 1e-10);
  const mixtureDensity = input.liquidDensity * lambdaL + input.gasDensity * (1 - lambdaL);

  const erosionalVelocity = input.cFactor / Math.sqrt(mixtureDensity);

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

  warnings.push("Note: This is a screening-level tool using the homogeneous model. For detailed analysis, use a dedicated multiphase simulator (e.g., OLGA, Pipesim).");

  return {
    superficialGasVelocity: Vsg,
    superficialLiquidVelocity: Vsl,
    mixtureVelocity: Vm,
    erosionalVelocity,
    mixtureDensity,
    liquidHoldup: lambdaL,
    velocityRatio,
    warnings,
  };
}

export const MULTIPHASE_TEST_CASE: MultiphaseInput = {
  gasFlowRate: 5000,
  liquidFlowRate: 50,
  gasDensity: 25,
  liquidDensity: 800,
  innerDiameter: 254.5,
  pipeLength: 1000,
  cFactor: 150,
};
