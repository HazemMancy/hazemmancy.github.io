import { GRAVITY, PI, PIPE_ROUGHNESS } from "./constants";

export interface PumpSizingInput {
  flowRate: number;
  liquidDensity: number;
  viscosity: number;
  suctionStaticHead: number;
  dischargeStaticHead: number;
  suctionPipeLength: number;
  dischargePipeLength: number;
  suctionPipeDiameter: number;
  dischargePipeDiameter: number;
  suctionRoughness: number;
  dischargeRoughness: number;
  suctionFittingsK: number;
  dischargeFittingsK: number;
  pumpEfficiency: number;
  motorEfficiency: number;
  vaporPressure: number;
  atmosphericPressure: number;
  suctionVesselPressure: number;
}

export interface PumpSizingResult {
  totalDynamicHead: number;
  staticHead: number;
  suctionFrictionLoss: number;
  dischargeFrictionLoss: number;
  suctionVelocityHead: number;
  dischargeVelocityHead: number;
  totalFrictionLoss: number;
  suctionVelocity: number;
  dischargeVelocity: number;
  suctionReynolds: number;
  dischargeReynolds: number;
  hydraulicPower: number;
  brakePower: number;
  motorPower: number;
  npshaAvailable: number;
  suctionFrictionFactor: number;
  dischargeFrictionFactor: number;
  warnings: string[];
}

function swameeJainFriction(re: number, relativeRoughness: number): number {
  if (re < 2300) {
    return 64 / re;
  }
  const a = relativeRoughness / 3.7;
  const b = 5.74 / Math.pow(re, 0.9);
  const logTerm = Math.log10(a + b);
  return 0.25 / (logTerm * logTerm);
}

function calculateFrictionHead(
  flowRate_m3s: number,
  pipeDiameter_m: number,
  pipeLength_m: number,
  roughness_m: number,
  density: number,
  viscosity_Pa_s: number,
  fittingsK: number
): { frictionHead: number; velocity: number; reynolds: number; frictionFactor: number } {
  const area = (PI / 4) * pipeDiameter_m * pipeDiameter_m;
  const velocity = flowRate_m3s / area;
  const reynolds = (density * velocity * pipeDiameter_m) / viscosity_Pa_s;
  const relativeRoughness = roughness_m / pipeDiameter_m;
  const frictionFactor = swameeJainFriction(reynolds, relativeRoughness);

  const pipeFrictionHead = frictionFactor * (pipeLength_m / pipeDiameter_m) * (velocity * velocity) / (2 * GRAVITY);
  const fittingFrictionHead = fittingsK * (velocity * velocity) / (2 * GRAVITY);
  const frictionHead = pipeFrictionHead + fittingFrictionHead;

  return { frictionHead, velocity, reynolds, frictionFactor };
}

export function calculatePumpSizing(input: PumpSizingInput): PumpSizingResult {
  const warnings: string[] = [];

  const flowRate_m3s = input.flowRate / 3600;
  const viscosity_Pa_s = input.viscosity / 1000;

  const suctionDia_m = input.suctionPipeDiameter / 1000;
  const dischargeDia_m = input.dischargePipeDiameter / 1000;
  const suctionRoughness_m = input.suctionRoughness / 1000;
  const dischargeRoughness_m = input.dischargeRoughness / 1000;

  if (suctionDia_m <= 0 || dischargeDia_m <= 0) {
    throw new Error("Pipe diameters must be positive");
  }
  if (flowRate_m3s <= 0) {
    throw new Error("Flow rate must be positive");
  }
  if (input.liquidDensity <= 0) {
    throw new Error("Liquid density must be positive");
  }
  if (input.pumpEfficiency <= 0 || input.pumpEfficiency > 100) {
    throw new Error("Pump efficiency must be between 0 and 100%");
  }
  if (input.motorEfficiency <= 0 || input.motorEfficiency > 100) {
    throw new Error("Motor efficiency must be between 0 and 100%");
  }

  const suction = calculateFrictionHead(
    flowRate_m3s, suctionDia_m, input.suctionPipeLength, suctionRoughness_m,
    input.liquidDensity, viscosity_Pa_s, input.suctionFittingsK
  );

  const discharge = calculateFrictionHead(
    flowRate_m3s, dischargeDia_m, input.dischargePipeLength, dischargeRoughness_m,
    input.liquidDensity, viscosity_Pa_s, input.dischargeFittingsK
  );

  const suctionVelocityHead = (suction.velocity * suction.velocity) / (2 * GRAVITY);
  const dischargeVelocityHead = (discharge.velocity * discharge.velocity) / (2 * GRAVITY);

  const staticHead = input.dischargeStaticHead - input.suctionStaticHead;
  const totalFrictionLoss = suction.frictionHead + discharge.frictionHead;
  const velocityHeadDiff = dischargeVelocityHead - suctionVelocityHead;
  const totalDynamicHead = staticHead + totalFrictionLoss + velocityHeadDiff;

  const hydraulicPower = (input.liquidDensity * GRAVITY * totalDynamicHead * flowRate_m3s) / 1000;
  const pumpEff = input.pumpEfficiency / 100;
  const motorEff = input.motorEfficiency / 100;
  const brakePower = hydraulicPower / pumpEff;
  const motorPower = brakePower / motorEff;

  const suctionPressureHead = (input.suctionVesselPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const atmosphericHead = (input.atmosphericPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const vaporPressureHead = (input.vaporPressure * 1e3) / (input.liquidDensity * GRAVITY);

  const npshaAvailable = atmosphericHead + suctionPressureHead + input.suctionStaticHead - suction.frictionHead - suctionVelocityHead - vaporPressureHead;

  if (suction.velocity > 2.0) {
    warnings.push("Suction velocity exceeds 2.0 m/s — may cause cavitation issues");
  }
  if (suction.velocity < 0.5) {
    warnings.push("Suction velocity below 0.5 m/s — may cause settling");
  }
  if (discharge.velocity > 5.0) {
    warnings.push("Discharge velocity exceeds 5.0 m/s — excessive pipe erosion risk");
  }
  if (discharge.velocity < 1.0) {
    warnings.push("Discharge velocity below 1.0 m/s — may cause settling");
  }
  if (npshaAvailable < 0) {
    warnings.push(`NPSHa = ${npshaAvailable.toFixed(2)} m — NEGATIVE! Severe cavitation — pump cannot operate under these conditions`);
  } else if (npshaAvailable < 3.0) {
    warnings.push(`NPSHa = ${npshaAvailable.toFixed(2)} m — risk of cavitation (typically NPSH margin > 1.0 m required)`);
  }
  if (totalDynamicHead < 0) {
    warnings.push("Negative TDH — liquid may flow by gravity, pump not required");
  }
  if (input.pumpEfficiency < 50) {
    warnings.push("Low pump efficiency — verify pump selection");
  }

  return {
    totalDynamicHead,
    staticHead,
    suctionFrictionLoss: suction.frictionHead,
    dischargeFrictionLoss: discharge.frictionHead,
    suctionVelocityHead,
    dischargeVelocityHead,
    totalFrictionLoss,
    suctionVelocity: suction.velocity,
    dischargeVelocity: discharge.velocity,
    suctionReynolds: suction.reynolds,
    dischargeReynolds: discharge.reynolds,
    hydraulicPower,
    brakePower,
    motorPower,
    npshaAvailable,
    suctionFrictionFactor: suction.frictionFactor,
    dischargeFrictionFactor: discharge.frictionFactor,
    warnings,
  };
}

export const PUMP_SIZING_TEST_CASE: PumpSizingInput = {
  flowRate: 100,
  liquidDensity: 998.2,
  viscosity: 1.002,
  suctionStaticHead: 2,
  dischargeStaticHead: 25,
  suctionPipeLength: 10,
  dischargePipeLength: 200,
  suctionPipeDiameter: 203.2,
  dischargePipeDiameter: 154.1,
  suctionRoughness: 0.0457,
  dischargeRoughness: 0.0457,
  suctionFittingsK: 3.5,
  dischargeFittingsK: 8.0,
  pumpEfficiency: 75,
  motorEfficiency: 95,
  vaporPressure: 2.338,
  atmosphericPressure: 1.01325,
  suctionVesselPressure: 0,
};
