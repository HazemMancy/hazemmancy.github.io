import { GAS_CONSTANT, STANDARD_TEMPERATURE, STANDARD_PRESSURE } from "./constants";

export type CompressorType = "centrifugal" | "reciprocating";
export type CompressionModel = "isentropic" | "polytropic";

export interface CalcStep {
  name: string;
  equation: string;
  substitution: string;
  result: string;
}

export interface CalcTrace {
  steps: CalcStep[];
  intermediateValues: Record<string, number>;
  assumptions: string[];
  warnings: string[];
}

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
  trace: CalcTrace;
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

  const traceSteps: CalcStep[] = [];
  const intermediateValues: Record<string, number> = {};
  const assumptions: string[] = [];

  const n = polytropicExponent(k, eta);
  intermediateValues["n"] = n;

  traceSteps.push({
    name: "Polytropic Exponent",
    equation: "n = 1 / (1 - (k - 1) / (k * \u03B7_p))",
    substitution: `n = 1 / (1 - (${k.toFixed(4)} - 1) / (${k.toFixed(4)} * ${eta.toFixed(4)}))`,
    result: `n = ${n.toFixed(6)}`,
  });

  const massFlowRate_kgs = (input.gasFlowRate * MW) / (3600 * 1000);
  const massFlowRate_kgh = massFlowRate_kgs * 3600;
  intermediateValues["massFlowRate_kg_s"] = massFlowRate_kgs;
  intermediateValues["massFlowRate_kg_h"] = massFlowRate_kgh;

  traceSteps.push({
    name: "Mass Flow Rate",
    equation: "\u1E41 = (Q_std * MW) / (3600 * 1000)",
    substitution: `\u1E41 = (${input.gasFlowRate.toFixed(2)} * ${MW.toFixed(4)}) / (3600 * 1000)`,
    result: `\u1E41 = ${massFlowRate_kgs.toFixed(6)} kg/s (${massFlowRate_kgh.toFixed(4)} kg/h)`,
  });

  const volumetricFlowRate_std = input.gasFlowRate;
  const P1_Pa = P1_bar * 1e5;
  const actualVolumetricFlowRate = (input.gasFlowRate * Z * T1_K * STANDARD_PRESSURE) /
    (STANDARD_TEMPERATURE * P1_Pa);
  intermediateValues["actualVolumetricFlowRate"] = actualVolumetricFlowRate;

  traceSteps.push({
    name: "Actual Volumetric Flow Rate",
    equation: "Q_act = (Q_std * Z * T\u2081 * P_std) / (T_std * P\u2081)",
    substitution: `Q_act = (${input.gasFlowRate.toFixed(2)} * ${Z.toFixed(4)} * ${T1_K.toFixed(2)} * ${STANDARD_PRESSURE.toFixed(0)}) / (${STANDARD_TEMPERATURE.toFixed(2)} * ${P1_Pa.toFixed(0)})`,
    result: `Q_act = ${actualVolumetricFlowRate.toFixed(4)} m\u00B3/h`,
  });

  if (numStages > 1) {
    assumptions.push(`Equal compression ratio per stage: r = ${ratioPerStage.toFixed(4)}`);
    assumptions.push("Intercooling assumed back to suction temperature between stages");
  }
  assumptions.push(`Compression model: ${model}`);
  assumptions.push(`Compressor type: ${input.compressorType}`);
  assumptions.push(`Gas constant R = ${GAS_CONSTANT.toFixed(2)} J/(kmol\u00B7K)`);
  assumptions.push(`Standard conditions: T_std = ${STANDARD_TEMPERATURE.toFixed(2)} K, P_std = ${STANDARD_PRESSURE.toFixed(0)} Pa`);

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
    const stageLabel = numStages > 1 ? ` (Stage ${i + 1})` : "";

    const T_discharge = calcDischargeTemperature(currentT, stageRatio, k, eta, model);

    if (model === "isentropic") {
      const T2_ideal = currentT * Math.pow(stageRatio, (k - 1) / k);
      traceSteps.push({
        name: `Discharge Temperature${stageLabel}`,
        equation: "T\u2082 = T\u2081 + (T\u2081 * r^((k-1)/k) - T\u2081) / \u03B7",
        substitution: `T\u2082 = ${currentT.toFixed(2)} + (${currentT.toFixed(2)} * ${stageRatio.toFixed(4)}^((${k.toFixed(4)}-1)/${k.toFixed(4)}) - ${currentT.toFixed(2)}) / ${eta.toFixed(4)}`,
        result: `T\u2082 = ${T_discharge.toFixed(2)} K (${(T_discharge - 273.15).toFixed(2)} \u00B0C)`,
      });
    } else {
      traceSteps.push({
        name: `Discharge Temperature${stageLabel}`,
        equation: "T\u2082 = T\u2081 * r^((n-1)/n)",
        substitution: `T\u2082 = ${currentT.toFixed(2)} * ${stageRatio.toFixed(4)}^((${n.toFixed(6)}-1)/${n.toFixed(6)})`,
        result: `T\u2082 = ${T_discharge.toFixed(2)} K (${(T_discharge - 273.15).toFixed(2)} \u00B0C)`,
      });
    }

    const heads = calcHeads(currentT, stageRatio, k, Z, MW, eta);
    const R_sp = GAS_CONSTANT / MW;

    traceSteps.push({
      name: `Isentropic Head${stageLabel}`,
      equation: "H_is = Z * (R/MW) * T\u2081 * (k/(k-1)) * (r^((k-1)/k) - 1)",
      substitution: `H_is = ${Z.toFixed(4)} * (${GAS_CONSTANT.toFixed(2)}/${MW.toFixed(4)}) * ${currentT.toFixed(2)} * (${k.toFixed(4)}/(${k.toFixed(4)}-1)) * (${stageRatio.toFixed(4)}^((${k.toFixed(4)}-1)/${k.toFixed(4)}) - 1)`,
      result: `H_is = ${heads.isentropicHead.toFixed(2)} J/kg (${(heads.isentropicHead / 1000).toFixed(4)} kJ/kg)`,
    });

    traceSteps.push({
      name: `Polytropic Head${stageLabel}`,
      equation: "H_p = Z * (R/MW) * T\u2081 * (n/(n-1)) * (r^((n-1)/n) - 1)",
      substitution: `H_p = ${Z.toFixed(4)} * (${GAS_CONSTANT.toFixed(2)}/${MW.toFixed(4)}) * ${currentT.toFixed(2)} * (${n.toFixed(6)}/(${n.toFixed(6)}-1)) * (${stageRatio.toFixed(4)}^((${n.toFixed(6)}-1)/${n.toFixed(6)}) - 1)`,
      result: `H_p = ${heads.polytropicHead.toFixed(2)} J/kg (${(heads.polytropicHead / 1000).toFixed(4)} kJ/kg)`,
    });

    let gasPower: number;
    if (model === "polytropic") {
      gasPower = (massFlowRate_kgs * heads.polytropicHead) / 1000;
      traceSteps.push({
        name: `Gas Power${stageLabel}`,
        equation: "W_gas = (\u1E41 * H_p) / 1000",
        substitution: `W_gas = (${massFlowRate_kgs.toFixed(6)} * ${heads.polytropicHead.toFixed(2)}) / 1000`,
        result: `W_gas = ${gasPower.toFixed(4)} kW`,
      });
    } else {
      gasPower = (massFlowRate_kgs * heads.isentropicHead) / (eta * 1000);
      traceSteps.push({
        name: `Gas Power${stageLabel}`,
        equation: "W_gas = (\u1E41 * H_is) / (\u03B7 * 1000)",
        substitution: `W_gas = (${massFlowRate_kgs.toFixed(6)} * ${heads.isentropicHead.toFixed(2)}) / (${eta.toFixed(4)} * 1000)`,
        result: `W_gas = ${gasPower.toFixed(4)} kW`,
      });
    }

    const shaftPower = gasPower / etaMech;
    traceSteps.push({
      name: `Shaft Power${stageLabel}`,
      equation: "W_shaft = W_gas / \u03B7_mech",
      substitution: `W_shaft = ${gasPower.toFixed(4)} / ${etaMech.toFixed(4)}`,
      result: `W_shaft = ${shaftPower.toFixed(4)} kW`,
    });

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

  traceSteps.push({
    name: "Total Motor Power",
    equation: "W_motor = W_shaft_total / \u03B7_motor",
    substitution: `W_motor = ${totalShaftPower.toFixed(4)} / ${etaMotor.toFixed(4)}`,
    result: `W_motor = ${totalMotorPower.toFixed(4)} kW`,
  });

  const finalDischargeTemp = stages[stages.length - 1].dischargeTemperature;

  let adiabaticEff: number;
  if (model === "isentropic") {
    adiabaticEff = eta;
  } else {
    const idealTempRise = Math.pow(overallRatio, (k - 1) / k) - 1;
    const actualTempRise = Math.pow(overallRatio, (n - 1) / n) - 1;
    adiabaticEff = actualTempRise > 0 ? idealTempRise / actualTempRise : eta;
  }

  intermediateValues["polytropicExponent"] = n;
  intermediateValues["overallCompressionRatio"] = overallRatio;
  intermediateValues["ratioPerStage"] = ratioPerStage;
  intermediateValues["R_specific"] = GAS_CONSTANT / MW;
  intermediateValues["T1_K"] = T1_K;
  intermediateValues["totalIsentropicHead_kJ_kg"] = totalIsentropicHead / 1000;
  intermediateValues["totalPolytropicHead_kJ_kg"] = totalPolytropicHead / 1000;
  intermediateValues["totalGasPower_kW"] = totalGasPower;
  intermediateValues["totalShaftPower_kW"] = totalShaftPower;
  intermediateValues["totalMotorPower_kW"] = totalMotorPower;
  intermediateValues["adiabaticEfficiency"] = adiabaticEff * 100;

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

  const trace: CalcTrace = {
    steps: traceSteps,
    intermediateValues,
    assumptions,
    warnings: [...warnings],
  };

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
    trace,
  };
}

// Centrifugal compressor — per GPSA Section 13 / API 617
// Natural gas export compressor, 3:1 ratio, single stage
// Expected: polytropic head ~150–180 kJ/kg, discharge temp ~130–150°C
export const COMPRESSOR_CENTRIFUGAL_TEST_CASE: CompressorInput = {
  gasFlowRate: 5000,           // Sm³/h — gas export rate
  molecularWeight: 18.5,       // sweet natural gas (GPSA typical)
  suctionPressure: 30,         // bara — separator outlet / suction scrubber
  dischargePressure: 90,       // bara — export pipeline pressure
  suctionTemperature: 35,      // °C — after suction cooler
  specificHeatRatio: 1.28,     // k for natural gas (GPSA Section 13)
  compressibilityFactor: 0.95, // Z at suction conditions (GPSA Fig 23-4)
  polytropicEfficiency: 78,    // % — typical centrifugal (GPSA Table 13-3)
  mechanicalEfficiency: 98,    // % — bearing/seal losses (API 617)
  motorEfficiency: 96,         // % — electric motor driver
  compressorType: "centrifugal",
  compressionModel: "polytropic",
  maxDischargeTemperature: 200,// °C — API 617 limit for materials
};

// Reciprocating compressor — per GPSA Section 13 / API 618
// Instrument air compressor, 8:1 ratio, multi-stage with intercooling
// Expected: 2+ stages, discharge temp <150°C per stage
export const COMPRESSOR_RECIPROCATING_TEST_CASE: CompressorInput = {
  gasFlowRate: 1000,           // Sm³/h — instrument air demand
  molecularWeight: 28.97,      // air (standard molecular weight)
  suctionPressure: 1,          // bara — atmospheric suction
  dischargePressure: 8,        // bara — instrument air header (7 bar gauge)
  suctionTemperature: 30,      // °C — ambient air, post-filter
  specificHeatRatio: 1.40,     // k for air (NIST)
  compressibilityFactor: 1.00, // Z ≈ 1.0 for air at low pressure
  polytropicEfficiency: 85,    // % — typical reciprocating (GPSA Table 13-2)
  mechanicalEfficiency: 95,    // % — crosshead/packing losses (API 618)
  motorEfficiency: 95,         // % — electric motor driver
  compressorType: "reciprocating",
  compressionModel: "isentropic",
  maxDischargeTemperature: 150,// °C — API 618 limit for valve/packing life
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
