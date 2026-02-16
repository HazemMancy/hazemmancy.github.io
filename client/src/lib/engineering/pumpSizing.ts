import { GRAVITY, PI } from "./constants";

export type PumpType = "centrifugal" | "positive_displacement";

export interface PipingInput {
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
  vaporPressure: number;
  atmosphericPressure: number;
  suctionVesselPressure: number;
}

export interface PumpSizingInput extends PipingInput {
  pumpEfficiency: number;
  motorEfficiency: number;
}

export interface PDPumpSizingInput extends PipingInput {
  volumetricEfficiency: number;
  mechanicalEfficiency: number;
  motorEfficiency: number;
  reliefValvePressure: number;
  dischargePressure: number;
}

export interface PipingResult {
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
  npshaAvailable: number;
  suctionFrictionFactor: number;
  dischargeFrictionFactor: number;
}

export interface PumpSizingResult extends PipingResult {
  pumpType: "centrifugal";
  totalDynamicHead: number;
  hydraulicPower: number;
  brakePower: number;
  motorPower: number;
  warnings: string[];
}

export interface PDPumpSizingResult extends PipingResult {
  pumpType: "positive_displacement";
  totalDynamicHead: number;
  differentialPressure: number;
  theoreticalFlow: number;
  actualFlow: number;
  slip: number;
  hydraulicPower: number;
  shaftPower: number;
  motorPower: number;
  npipAvailable: number;
  volumetricEfficiency: number;
  mechanicalEfficiency: number;
  liquidDensity: number;
  reliefValvePressure: number;
  dischargePressure: number;
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

export function calculatePiping(input: PipingInput): PipingResult {
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

  const suctionPressureHead = (input.suctionVesselPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const atmosphericHead = (input.atmosphericPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const vaporPressureHead = (input.vaporPressure * 1e3) / (input.liquidDensity * GRAVITY);

  const npshaAvailable = atmosphericHead + suctionPressureHead + input.suctionStaticHead - suction.frictionHead - vaporPressureHead;

  return {
    staticHead,
    suctionFrictionLoss: suction.frictionHead,
    dischargeFrictionLoss: discharge.frictionHead,
    suctionVelocityHead,
    dischargeVelocityHead,
    totalFrictionLoss: suction.frictionHead + discharge.frictionHead,
    suctionVelocity: suction.velocity,
    dischargeVelocity: discharge.velocity,
    suctionReynolds: suction.reynolds,
    dischargeReynolds: discharge.reynolds,
    npshaAvailable,
    suctionFrictionFactor: suction.frictionFactor,
    dischargeFrictionFactor: discharge.frictionFactor,
  };
}

function addVelocityWarnings(warnings: string[], suctionVelocity: number, dischargeVelocity: number) {
  if (suctionVelocity > 2.0) {
    warnings.push("Suction velocity exceeds 2.0 m/s \u2014 may cause cavitation issues");
  }
  if (suctionVelocity < 0.5) {
    warnings.push("Suction velocity below 0.5 m/s \u2014 may cause settling");
  }
  if (dischargeVelocity > 5.0) {
    warnings.push("Discharge velocity exceeds 5.0 m/s \u2014 excessive pipe erosion risk");
  }
  if (dischargeVelocity < 1.0) {
    warnings.push("Discharge velocity below 1.0 m/s \u2014 may cause settling");
  }
}

export function calculatePumpSizing(input: PumpSizingInput): PumpSizingResult {
  const warnings: string[] = [];

  if (input.pumpEfficiency <= 0 || input.pumpEfficiency > 100) {
    throw new Error("Pump efficiency must be between 0 and 100%");
  }
  if (input.motorEfficiency <= 0 || input.motorEfficiency > 100) {
    throw new Error("Motor efficiency must be between 0 and 100%");
  }

  const piping = calculatePiping(input);
  const flowRate_m3s = input.flowRate / 3600;

  const velocityHeadDiff = piping.dischargeVelocityHead - piping.suctionVelocityHead;
  const totalDynamicHead = piping.staticHead + piping.totalFrictionLoss + velocityHeadDiff;

  const hydraulicPower = (input.liquidDensity * GRAVITY * totalDynamicHead * flowRate_m3s) / 1000;
  const pumpEff = input.pumpEfficiency / 100;
  const motorEff = input.motorEfficiency / 100;
  const brakePower = hydraulicPower / pumpEff;
  const motorPower = brakePower / motorEff;

  addVelocityWarnings(warnings, piping.suctionVelocity, piping.dischargeVelocity);

  if (piping.npshaAvailable < 0) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m \u2014 NEGATIVE! Severe cavitation \u2014 pump cannot operate under these conditions`);
  } else if (piping.npshaAvailable < 3.0) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m \u2014 risk of cavitation (typically NPSH margin > 1.0 m required)`);
  }
  if (totalDynamicHead < 0) {
    warnings.push("Negative TDH \u2014 liquid may flow by gravity, pump not required");
  }
  if (input.pumpEfficiency < 50) {
    warnings.push("Low pump efficiency \u2014 verify pump selection");
  }

  return {
    pumpType: "centrifugal",
    totalDynamicHead,
    ...piping,
    hydraulicPower,
    brakePower,
    motorPower,
    warnings,
  };
}

export function calculatePDPumpSizing(input: PDPumpSizingInput): PDPumpSizingResult {
  const warnings: string[] = [];

  if (input.volumetricEfficiency <= 0 || input.volumetricEfficiency > 100) {
    throw new Error("Volumetric efficiency must be between 0 and 100%");
  }
  if (input.mechanicalEfficiency <= 0 || input.mechanicalEfficiency > 100) {
    throw new Error("Mechanical efficiency must be between 0 and 100%");
  }
  if (input.motorEfficiency <= 0 || input.motorEfficiency > 100) {
    throw new Error("Motor efficiency must be between 0 and 100%");
  }

  const piping = calculatePiping(input);
  const flowRate_m3s = input.flowRate / 3600;

  const volEff = input.volumetricEfficiency / 100;
  const mechEff = input.mechanicalEfficiency / 100;
  const motorEff = input.motorEfficiency / 100;

  const theoreticalFlow = input.flowRate / volEff;
  const actualFlow = input.flowRate;
  const slip = theoreticalFlow - actualFlow;

  const velocityHeadDiff = piping.dischargeVelocityHead - piping.suctionVelocityHead;
  const totalDynamicHead = piping.staticHead + piping.totalFrictionLoss + velocityHeadDiff;

  const differentialPressure = input.dischargePressure > 0
    ? input.dischargePressure
    : (input.liquidDensity * GRAVITY * totalDynamicHead) / 1e5;

  const hydraulicPower = (differentialPressure * 1e5 * flowRate_m3s) / 1000;
  const shaftPower = hydraulicPower / mechEff;
  const motorPower = shaftPower / motorEff;

  const npipAvailable = (piping.npshaAvailable * input.liquidDensity * GRAVITY) / 1000;

  addVelocityWarnings(warnings, piping.suctionVelocity, piping.dischargeVelocity);

  if (piping.npshaAvailable < 0) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m (NPIP = ${npipAvailable.toFixed(1)} kPa) \u2014 NEGATIVE! Pump cannot operate`);
  } else if (piping.npshaAvailable < 3.0) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m (NPIP = ${npipAvailable.toFixed(1)} kPa) \u2014 risk of cavitation`);
  }

  if (input.reliefValvePressure > 0) {
    const reliefBar = input.reliefValvePressure;
    const dpBar = differentialPressure;
    if (reliefBar < dpBar * 1.1) {
      warnings.push(`Relief valve set pressure (${reliefBar.toFixed(1)} bar) is less than 110% of differential pressure (${(dpBar * 1.1).toFixed(1)} bar) \u2014 pump may not reach required discharge pressure`);
    }
  } else {
    warnings.push("No relief valve specified \u2014 relief valve is mandatory for positive displacement pumps to prevent overpressure");
  }

  if (differentialPressure > 100) {
    warnings.push(`High differential pressure (${differentialPressure.toFixed(1)} bar) \u2014 verify pump pressure rating`);
  }

  if (input.volumetricEfficiency < 80) {
    warnings.push("Low volumetric efficiency \u2014 excessive internal leakage, verify pump condition");
  }

  if (totalDynamicHead < 0) {
    warnings.push("Negative TDH \u2014 liquid may flow by gravity, pump not required");
  }

  return {
    pumpType: "positive_displacement",
    totalDynamicHead,
    differentialPressure,
    theoreticalFlow,
    actualFlow,
    slip,
    ...piping,
    hydraulicPower,
    shaftPower,
    motorPower,
    npipAvailable,
    volumetricEfficiency: input.volumetricEfficiency,
    mechanicalEfficiency: input.mechanicalEfficiency,
    liquidDensity: input.liquidDensity,
    reliefValvePressure: input.reliefValvePressure,
    dischargePressure: input.dischargePressure,
    warnings,
  };
}

export const PUMP_SIZING_TEST_CASE: PumpSizingInput = {
  flowRate: 150,
  liquidDensity: 998.2,
  viscosity: 1.002,
  suctionStaticHead: 3,
  dischargeStaticHead: 30,
  suctionPipeLength: 5,
  dischargePipeLength: 150,
  suctionPipeDiameter: 202.74,
  dischargePipeDiameter: 154.08,
  suctionRoughness: 0.0457,
  dischargeRoughness: 0.0457,
  suctionFittingsK: 1.5,
  dischargeFittingsK: 8.0,
  pumpEfficiency: 75,
  motorEfficiency: 95,
  vaporPressure: 2.338,
  atmosphericPressure: 1.01325,
  suctionVesselPressure: 0,
};

export const PD_PUMP_TEST_CASE: PDPumpSizingInput = {
  flowRate: 25,
  liquidDensity: 900,
  viscosity: 15.0,
  suctionStaticHead: 2,
  dischargeStaticHead: 10,
  suctionPipeLength: 3,
  dischargePipeLength: 50,
  suctionPipeDiameter: 102.26,
  dischargePipeDiameter: 77.92,
  suctionRoughness: 0.0457,
  dischargeRoughness: 0.0457,
  suctionFittingsK: 1.0,
  dischargeFittingsK: 5.0,
  volumetricEfficiency: 90,
  mechanicalEfficiency: 85,
  motorEfficiency: 95,
  vaporPressure: 20,
  atmosphericPressure: 1.01325,
  suctionVesselPressure: 0.5,
  reliefValvePressure: 15,
  dischargePressure: 10,
};
