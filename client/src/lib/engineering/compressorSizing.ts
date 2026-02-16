import { GAS_CONSTANT, STANDARD_TEMPERATURE, STANDARD_PRESSURE } from "./constants";

export type CompressorType = "centrifugal" | "reciprocating";
export type CompressionModel = "isentropic" | "polytropic";

export interface CompressorInput {
  gasFlowRate: number;
  molecularWeight: number;
  suctionPressure: number;
  dischargePressure: number;
  suctionTemperature: number;
  specificHeatRatio: number;
  compressibilityFactor: number;
  polytropicEfficiency: number;
  mechanicalEfficiency: number;
  motorEfficiency: number;
  compressorType: CompressorType;
  compressionModel: CompressionModel;
  maxDischargeTemperature: number;
}

export interface StageResult {
  stageNumber: number;
  suctionPressure: number;
  dischargePressure: number;
  compressionRatio: number;
  suctionTemperature: number;
  dischargeTemperature: number;
  isentropicHead: number;
  polytropicHead: number;
  gasPower: number;
  shaftPower: number;
}

export interface CompressorResult {
  compressorType: CompressorType;
  compressionModel: CompressionModel;
  overallCompressionRatio: number;
  numberOfStages: number;
  stages: StageResult[];
  totalIsentropicHead: number;
  totalPolytropicHead: number;
  totalGasPower: number;
  totalShaftPower: number;
  totalMotorPower: number;
  finalDischargeTemperature: number;
  adiabaticEfficiency: number;
  polytropicEfficiency: number;
  massFlowRate: number;
  volumetricFlowRate: number;
  actualVolumetricFlowRate: number;
  warnings: string[];
}

function polytropicExponent(k: number, etaPoly: number): number {
  return 1 / (1 - (k - 1) / (k * etaPoly));
}

function calcDischargeTemperature(
  T1_K: number,
  ratio: number,
  k: number,
  eta: number,
  model: CompressionModel
): number {
  if (model === "isentropic") {
    const T2_ideal = T1_K * Math.pow(ratio, (k - 1) / k);
    return T1_K + (T2_ideal - T1_K) / eta;
  }
  const n = polytropicExponent(k, eta);
  return T1_K * Math.pow(ratio, (n - 1) / n);
}

function calcHeads(
  T1_K: number,
  ratio: number,
  k: number,
  Z: number,
  MW: number,
  eta: number
): { isentropicHead: number; polytropicHead: number } {
  const R_sp = GAS_CONSTANT / MW;

  const isentropicHead = Z * R_sp * T1_K * (k / (k - 1)) *
    (Math.pow(ratio, (k - 1) / k) - 1);

  const n = polytropicExponent(k, eta);
  const polytropicHead = Z * R_sp * T1_K * (n / (n - 1)) *
    (Math.pow(ratio, (n - 1) / n) - 1);

  return { isentropicHead, polytropicHead };
}

export function calculateCompressorSizing(input: CompressorInput): CompressorResult {
  const warnings: string[] = [];

  if (input.gasFlowRate <= 0) throw new Error("Gas flow rate must be positive");
  if (input.molecularWeight <= 0) throw new Error("Molecular weight must be positive");
  if (input.suctionPressure <= 0) throw new Error("Suction pressure must be positive");
  if (input.dischargePressure <= input.suctionPressure) throw new Error("Discharge pressure must exceed suction pressure");
  if (input.specificHeatRatio <= 1) throw new Error("Specific heat ratio (k) must be greater than 1");
  if (input.compressibilityFactor <= 0 || input.compressibilityFactor > 2) throw new Error("Z-factor must be between 0 and 2");
  if (input.polytropicEfficiency <= 0 || input.polytropicEfficiency > 100) throw new Error("Efficiency must be between 0 and 100%");
  if (input.mechanicalEfficiency <= 0 || input.mechanicalEfficiency > 100) throw new Error("Mechanical efficiency must be between 0 and 100%");
  if (input.motorEfficiency <= 0 || input.motorEfficiency > 100) throw new Error("Motor efficiency must be between 0 and 100%");

  const T1_K = input.suctionTemperature + 273.15;
  const P1_bar = input.suctionPressure;
  const P2_bar = input.dischargePressure;
  const k = input.specificHeatRatio;
  const Z = input.compressibilityFactor;
  const MW = input.molecularWeight;
  const eta = input.polytropicEfficiency / 100;
  const etaMech = input.mechanicalEfficiency / 100;
  const etaMotor = input.motorEfficiency / 100;
  const model = input.compressionModel;

  const overallRatio = P2_bar / P1_bar;

  const maxRatioPerStage = input.compressorType === "centrifugal" ? 3.5 : 4.0;
  const maxTdischarge_K = input.maxDischargeTemperature + 273.15;

  let numStages = 1;
  if (overallRatio > maxRatioPerStage) {
    numStages = Math.ceil(Math.log(overallRatio) / Math.log(maxRatioPerStage));
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const stageRatio = Math.pow(overallRatio, 1 / numStages);
    const T_discharge = calcDischargeTemperature(T1_K, stageRatio, k, eta, model);
    if (T_discharge <= maxTdischarge_K || numStages >= 10) break;
    numStages++;
  }

  const ratioPerStage = Math.pow(overallRatio, 1 / numStages);

  const massFlowRate_kgs = (input.gasFlowRate * MW) / (3600 * 1000);
  const massFlowRate_kgh = massFlowRate_kgs * 3600;

  const volumetricFlowRate_std = input.gasFlowRate;
  const P1_Pa = P1_bar * 1e5;
  const actualVolumetricFlowRate = (input.gasFlowRate * Z * T1_K * STANDARD_PRESSURE) /
    (STANDARD_TEMPERATURE * P1_Pa);

  const stages: StageResult[] = [];
  let currentP = P1_bar;
  let currentT = T1_K;
  let totalIsentropicHead = 0;
  let totalPolytropicHead = 0;
  let totalGasPower = 0;
  let totalShaftPower = 0;

  for (let i = 0; i < numStages; i++) {
    const nextP = i === numStages - 1 ? P2_bar : currentP * ratioPerStage;
    const stageRatio = nextP / currentP;

    const T_discharge = calcDischargeTemperature(currentT, stageRatio, k, eta, model);
    const heads = calcHeads(currentT, stageRatio, k, Z, MW, eta);

    let gasPower: number;
    if (model === "polytropic") {
      gasPower = (massFlowRate_kgs * heads.polytropicHead) / 1000;
    } else {
      gasPower = (massFlowRate_kgs * heads.isentropicHead) / (eta * 1000);
    }
    const shaftPower = gasPower / etaMech;

    totalIsentropicHead += heads.isentropicHead;
    totalPolytropicHead += heads.polytropicHead;
    totalGasPower += gasPower;
    totalShaftPower += shaftPower;

    stages.push({
      stageNumber: i + 1,
      suctionPressure: currentP,
      dischargePressure: nextP,
      compressionRatio: stageRatio,
      suctionTemperature: currentT - 273.15,
      dischargeTemperature: T_discharge - 273.15,
      isentropicHead: heads.isentropicHead / 1000,
      polytropicHead: heads.polytropicHead / 1000,
      gasPower,
      shaftPower,
    });

    currentP = nextP;
    currentT = numStages > 1 && i < numStages - 1 ? T1_K : T_discharge;
  }

  const totalMotorPower = totalShaftPower / etaMotor;
  const finalDischargeTemp = stages[stages.length - 1].dischargeTemperature;

  let adiabaticEff: number;
  if (model === "isentropic") {
    adiabaticEff = eta;
  } else {
    const idealTempRise = Math.pow(overallRatio, (k - 1) / k) - 1;
    const n = polytropicExponent(k, eta);
    const actualTempRise = Math.pow(overallRatio, (n - 1) / n) - 1;
    adiabaticEff = actualTempRise > 0 ? idealTempRise / actualTempRise : eta;
  }

  if (overallRatio > 10) {
    warnings.push(`High overall compression ratio (${overallRatio.toFixed(1)}) \u2014 verify mechanical feasibility`);
  }
  if (finalDischargeTemp > 200) {
    warnings.push(`Discharge temperature ${finalDischargeTemp.toFixed(0)}\u00B0C exceeds 200\u00B0C \u2014 consider additional intercooling`);
  }
  if (finalDischargeTemp > 150 && input.compressorType === "reciprocating") {
    warnings.push(`Discharge temperature ${finalDischargeTemp.toFixed(0)}\u00B0C may damage packing and valves in reciprocating compressor`);
  }
  if (numStages > 1) {
    warnings.push(`${numStages} compression stages required \u2014 intercooling assumed back to suction temperature between stages`);
  }
  if (input.compressorType === "centrifugal" && MW > 50) {
    warnings.push("High molecular weight gas \u2014 verify centrifugal compressor is suitable (consider reciprocating)");
  }
  if (input.compressorType === "centrifugal" && actualVolumetricFlowRate < 500) {
    warnings.push("Low actual inlet volume flow \u2014 centrifugal compressor may not be economical, consider reciprocating");
  }
  if (input.compressorType === "reciprocating" && actualVolumetricFlowRate > 10000) {
    warnings.push("High actual inlet volume flow \u2014 consider centrifugal compressor for better efficiency");
  }
  if (input.polytropicEfficiency < 70) {
    warnings.push("Low efficiency \u2014 verify compressor selection");
  }

  return {
    compressorType: input.compressorType,
    compressionModel: model,
    overallCompressionRatio: overallRatio,
    numberOfStages: numStages,
    stages,
    totalIsentropicHead: totalIsentropicHead / 1000,
    totalPolytropicHead: totalPolytropicHead / 1000,
    totalGasPower,
    totalShaftPower,
    totalMotorPower,
    finalDischargeTemperature: finalDischargeTemp,
    adiabaticEfficiency: adiabaticEff * 100,
    polytropicEfficiency: input.polytropicEfficiency,
    massFlowRate: massFlowRate_kgh,
    volumetricFlowRate: volumetricFlowRate_std,
    actualVolumetricFlowRate,
    warnings,
  };
}

export const COMPRESSOR_CENTRIFUGAL_TEST_CASE: CompressorInput = {
  gasFlowRate: 5000,
  molecularWeight: 18.5,
  suctionPressure: 30,
  dischargePressure: 90,
  suctionTemperature: 35,
  specificHeatRatio: 1.28,
  compressibilityFactor: 0.95,
  polytropicEfficiency: 78,
  mechanicalEfficiency: 98,
  motorEfficiency: 96,
  compressorType: "centrifugal",
  compressionModel: "polytropic",
  maxDischargeTemperature: 200,
};

export const COMPRESSOR_RECIPROCATING_TEST_CASE: CompressorInput = {
  gasFlowRate: 1000,
  molecularWeight: 28.97,
  suctionPressure: 5,
  dischargePressure: 40,
  suctionTemperature: 25,
  specificHeatRatio: 1.40,
  compressibilityFactor: 0.98,
  polytropicEfficiency: 85,
  mechanicalEfficiency: 95,
  motorEfficiency: 95,
  compressorType: "reciprocating",
  compressionModel: "isentropic",
  maxDischargeTemperature: 150,
};

export const COMMON_COMPRESSOR_GASES: Record<string, { mw: number; k: number; z: number }> = {
  "Natural Gas (sweet)": { mw: 18.5, k: 1.28, z: 0.95 },
  "Natural Gas (lean)": { mw: 17.4, k: 1.30, z: 0.96 },
  "Air": { mw: 28.97, k: 1.40, z: 1.00 },
  "Nitrogen": { mw: 28.01, k: 1.40, z: 1.00 },
  "CO2": { mw: 44.01, k: 1.29, z: 0.82 },
  "Hydrogen": { mw: 2.016, k: 1.41, z: 1.00 },
  "Methane": { mw: 16.04, k: 1.31, z: 0.99 },
  "Ethane": { mw: 30.07, k: 1.19, z: 0.91 },
  "Propane": { mw: 44.10, k: 1.13, z: 0.83 },
  "Fuel Gas (typical)": { mw: 22.0, k: 1.25, z: 0.93 },
  "Associated Gas": { mw: 24.0, k: 1.22, z: 0.90 },
};
