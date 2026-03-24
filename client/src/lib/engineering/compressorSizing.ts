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

export interface CompressorValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCompressorInput(input: Partial<CompressorInput>): CompressorValidationResult {
  const errors: string[] = [];
  if (input.gasFlowRate === undefined || isNaN(input.gasFlowRate) || input.gasFlowRate <= 0)
    errors.push("Gas flow rate must be a positive number");
  if (input.molecularWeight === undefined || isNaN(input.molecularWeight) || input.molecularWeight <= 0)
    errors.push("Molecular weight must be > 0");
  if (input.suctionPressure === undefined || isNaN(input.suctionPressure) || input.suctionPressure <= 0)
    errors.push("Suction pressure must be > 0");
  if (input.dischargePressure === undefined || isNaN(input.dischargePressure) || input.dischargePressure <= 0)
    errors.push("Discharge pressure must be > 0");
  if (
    input.suctionPressure !== undefined && !isNaN(input.suctionPressure) &&
    input.dischargePressure !== undefined && !isNaN(input.dischargePressure) &&
    input.dischargePressure <= input.suctionPressure
  ) errors.push("Discharge pressure must exceed suction pressure");
  if (input.suctionTemperature !== undefined && !isNaN(input.suctionTemperature) &&
    (input.suctionTemperature < -100 || input.suctionTemperature > 500))
    errors.push("Suction temperature outside valid engineering range (−100 to 500 °C)");
  if (input.specificHeatRatio === undefined || isNaN(input.specificHeatRatio) || input.specificHeatRatio <= 1)
    errors.push("Specific heat ratio (k) must be > 1");
  if (input.compressibilityFactor === undefined || isNaN(input.compressibilityFactor) ||
    input.compressibilityFactor <= 0 || input.compressibilityFactor > 2)
    errors.push("Compressibility factor (Z) must be between 0 and 2");
  if (input.polytropicEfficiency === undefined || isNaN(input.polytropicEfficiency) ||
    input.polytropicEfficiency <= 0 || input.polytropicEfficiency >= 100)
    errors.push("Compressor efficiency must be between 0 and 100 %");
  if (input.mechanicalEfficiency === undefined || isNaN(input.mechanicalEfficiency) ||
    input.mechanicalEfficiency <= 0 || input.mechanicalEfficiency > 100)
    errors.push("Mechanical efficiency must be between 0 and 100 %");
  if (input.motorEfficiency === undefined || isNaN(input.motorEfficiency) ||
    input.motorEfficiency <= 0 || input.motorEfficiency > 100)
    errors.push("Motor/driver efficiency must be between 0 and 100 %");
  if (input.compressorType && !["centrifugal", "reciprocating"].includes(input.compressorType))
    errors.push("Compressor type must be 'centrifugal' or 'reciprocating'");
  if (input.compressionModel && !["isentropic", "polytropic"].includes(input.compressionModel))
    errors.push("Compression model must be 'isentropic' or 'polytropic'");
  return { valid: errors.length === 0, errors };
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

  if (model === "polytropic") {
    traceSteps.push({
      name: "Polytropic Exponent",
      equation: "n = 1 / (1 - (k - 1) / (k \u00D7 \u03B7_p))    [GPSA §13-2]",
      substitution: `n = 1 / (1 - (${k.toFixed(4)} - 1) / (${k.toFixed(4)} \u00D7 ${eta.toFixed(4)}))`,
      result: `n = ${n.toFixed(6)}`,
    });
  }

  const V_molar = (GAS_CONSTANT * STANDARD_TEMPERATURE) / STANDARD_PRESSURE;
  const massFlowRate_kgs = (input.gasFlowRate * MW) / (V_molar * 3600);
  const massFlowRate_kgh = massFlowRate_kgs * 3600;
  intermediateValues["massFlowRate_kg_s"] = massFlowRate_kgs;
  intermediateValues["massFlowRate_kg_h"] = massFlowRate_kgh;
  intermediateValues["V_molar"] = V_molar;

  traceSteps.push({
    name: "Molar Volume at Standard Conditions",
    equation: "V_m = R \u00D7 T_std / P_std",
    substitution: `V_m = ${GAS_CONSTANT.toFixed(2)} \u00D7 ${STANDARD_TEMPERATURE.toFixed(2)} / ${STANDARD_PRESSURE.toFixed(0)}`,
    result: `V_m = ${V_molar.toFixed(4)} m\u00B3/kmol`,
  });

  traceSteps.push({
    name: "Mass Flow Rate",
    equation: "\u1E41 = (Q_std \u00D7 MW) / (V_m \u00D7 3600)",
    substitution: `\u1E41 = (${input.gasFlowRate.toFixed(2)} \u00D7 ${MW.toFixed(4)}) / (${V_molar.toFixed(4)} \u00D7 3600)`,
    result: `\u1E41 = ${massFlowRate_kgs.toFixed(6)} kg/s (${massFlowRate_kgh.toFixed(2)} kg/h)`,
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
    assumptions.push("Perfect intercooling assumed: gas cooled back to suction temperature between stages. No intercooler approach temperature modeled (typical 5\u201310\u00B0C above cooling medium). No interstage pressure drop modeled (typical 0.3\u20130.5 bar per intercooler). These omissions are non-conservative for multi-stage trains \u2014 include in system pressure budget during detailed design.");
  }
  assumptions.push(`Compression model: ${model}`);
  assumptions.push(`Compressor type: ${input.compressorType}`);
  assumptions.push(input.compressorType === "centrifugal"
    ? "Reference basis: API 617 (Axial and Centrifugal Compressors), GPSA Section 13 \u2014 preliminary FEED screening only; not a substitute for detailed vendor selection or API compliance review"
    : "Reference basis: API 618 (Reciprocating Compressors), GPSA Section 13 \u2014 preliminary FEED screening only; not a substitute for detailed vendor selection or API compliance review");
  assumptions.push(`Gas constant R = ${GAS_CONSTANT.toFixed(2)} J/(kmol\u00B7K)`);
  assumptions.push(`Standard conditions: T_std = ${STANDARD_TEMPERATURE.toFixed(2)} K (15\u00B0C), P_std = ${STANDARD_PRESSURE.toFixed(0)} Pa (101.325 kPa) \u2014 per ISO 13443 / GPSA Section 13 / API MPMS Chapter 14.3`);
  assumptions.push("Gas properties (k, Z, MW) held constant at suction-condition values across all stages \u2014 no stage-by-stage EOS recalculation. For high-pressure or wide-ratio multi-stage trains, verify with a rigorous EOS simulation tool.");
  assumptions.push("Z-factor at suction conditions only; actual Z varies per stage \u2014 average Z approximation may understate compression work in wide-ratio multi-stage trains; EOS verification recommended");

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
        equation: "T\u2082 = T\u2081 + (T\u2082_ideal - T\u2081) / \u03B7_is    where T\u2082_ideal = T\u2081 * r^((k-1)/k)    [API-aware screening \u2014 isentropic basis per ASME PTC-10 approach]",
        substitution: `T\u2082_ideal = ${currentT.toFixed(2)} * ${stageRatio.toFixed(4)}^((${k.toFixed(4)}-1)/${k.toFixed(4)}) = ${T2_ideal.toFixed(2)} K;  T\u2082 = ${currentT.toFixed(2)} + (${T2_ideal.toFixed(2)} - ${currentT.toFixed(2)}) / ${eta.toFixed(4)}`,
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

    traceSteps.push({
      name: `Isentropic Head${stageLabel}`,
      equation: "H_is = Z\u00B7(R/MW)\u00B7T\u2081\u00B7(k/(k-1))\u00B7(r^((k-1)/k) - 1)    [API-aware screening basis \u2014 GPSA \u00A713-4 / API 617 \u00A75.9.4 reference equation]",
      substitution: `H_is = ${Z.toFixed(4)}\u00B7(${GAS_CONSTANT.toFixed(2)}/${MW.toFixed(4)})\u00B7${currentT.toFixed(2)}\u00B7(${k.toFixed(4)}/(${k.toFixed(4)}-1))\u00B7(${stageRatio.toFixed(4)}^((${k.toFixed(4)}-1)/${k.toFixed(4)})-1)`,
      result: `H_is = ${heads.isentropicHead.toFixed(2)} J/kg (${(heads.isentropicHead / 1000).toFixed(4)} kJ/kg)`,
    });

    if (model === "polytropic") {
      traceSteps.push({
        name: `Polytropic Head${stageLabel}`,
        equation: "H_p = Z\u00B7(R/MW)\u00B7T\u2081\u00B7(n/(n-1))\u00B7(r^((n-1)/n) - 1)    [API-aware screening basis \u2014 GPSA \u00A713-4 / API 617 \u00A75.9.5 reference equation]",
        substitution: `H_p = ${Z.toFixed(4)}\u00B7(${GAS_CONSTANT.toFixed(2)}/${MW.toFixed(4)})\u00B7${currentT.toFixed(2)}\u00B7(${n.toFixed(6)}/(${n.toFixed(6)}-1))\u00B7(${stageRatio.toFixed(4)}^((${n.toFixed(6)}-1)/${n.toFixed(6)})-1)`,
        result: `H_p = ${heads.polytropicHead.toFixed(2)} J/kg (${(heads.polytropicHead / 1000).toFixed(4)} kJ/kg)`,
      });
    }

    let gasPower: number;
    if (model === "polytropic") {
      gasPower = (massFlowRate_kgs * heads.polytropicHead) / 1000;
      traceSteps.push({
        name: `Gas Power${stageLabel}  (polytropic)`,
        equation: "W_gas = \u1E41 \u00D7 H_p / 1000    [H_p already accounts for \u03B7_p through n]",
        substitution: `W_gas = ${massFlowRate_kgs.toFixed(6)} \u00D7 ${heads.polytropicHead.toFixed(2)} / 1000`,
        result: `W_gas = ${gasPower.toFixed(4)} kW`,
      });
    } else {
      gasPower = (massFlowRate_kgs * heads.isentropicHead) / (eta * 1000);
      traceSteps.push({
        name: `Gas Power${stageLabel}  (isentropic)`,
        equation: "W_gas = \u1E41 \u00D7 H_is / (\u03B7_is \u00D7 1000)    [API-aware screening basis \u2014 ASME PTC-10 / API 617 \u00A75.9.3 reference equation]",
        substitution: `W_gas = ${massFlowRate_kgs.toFixed(6)} \u00D7 ${heads.isentropicHead.toFixed(2)} / (${eta.toFixed(4)} \u00D7 1000)`,
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
    name: "Total Gas Power",
    equation: "W_gas_total = \u03A3 W_gas per stage",
    substitution: stages.map((s, i) => `Stage ${i + 1}: ${s.gasPower.toFixed(4)} kW`).join(" + "),
    result: `W_gas_total = ${totalGasPower.toFixed(4)} kW`,
  });

  traceSteps.push({
    name: "Total Shaft Power",
    equation: "W_shaft_total = \u03A3 W_shaft per stage  (includes mechanical losses per stage)",
    substitution: stages.map((s, i) => `Stage ${i + 1}: ${s.shaftPower.toFixed(4)} kW`).join(" + "),
    result: `W_shaft_total = ${totalShaftPower.toFixed(4)} kW`,
  });

  traceSteps.push({
    name: "Total Motor Power (Electrical Input)",
    equation: "W_motor = W_shaft_total / \u03B7_motor",
    substitution: `W_motor = ${totalShaftPower.toFixed(4)} / ${etaMotor.toFixed(4)}`,
    result: `W_motor = ${totalMotorPower.toFixed(4)} kW  (electrical input to motor terminals)`,
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

  if (model === "polytropic") {
    const idealTempRise = Math.pow(overallRatio, (k - 1) / k) - 1;
    const actualTempRise = Math.pow(overallRatio, (n - 1) / n) - 1;
    traceSteps.push({
      name: "Adiabatic (Isentropic) Efficiency",
      equation: "\u03B7_is = (r^((k-1)/k) - 1) / (r^((n-1)/n) - 1)    [ASME PTC-10 / GPSA §13-2]",
      substitution: `\u03B7_is = (${overallRatio.toFixed(4)}^((${k.toFixed(4)}-1)/${k.toFixed(4)})-1) / (${overallRatio.toFixed(4)}^((${n.toFixed(6)}-1)/${n.toFixed(6)})-1) = ${idealTempRise.toFixed(6)} / ${actualTempRise.toFixed(6)}`,
      result: `\u03B7_is = ${(adiabaticEff * 100).toFixed(2)}%  (adiabatic efficiency equivalent to specified \u03B7_p = ${(eta * 100).toFixed(1)}%)`,
    });
  } else {
    traceSteps.push({
      name: "Adiabatic (Isentropic) Efficiency",
      equation: "\u03B7_is = input (isentropic model — user-specified)",
      substitution: `\u03B7_is = ${(eta * 100).toFixed(2)}%`,
      result: `\u03B7_is = ${(adiabaticEff * 100).toFixed(2)}%`,
    });
  }

  intermediateValues["k"] = k;
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

  // Stage-property constancy — added as first warning so it is most visible
  warnings.push(
    `SCREENING ASSUMPTION — Constant gas properties: k = ${k.toFixed(3)}, Z = ${Z.toFixed(3)}, MW = ${MW.toFixed(1)} kg/kmol are held constant at suction-condition values across ALL ${numStages} stage(s). ` +
    `Stage-by-stage EOS recalculation is NOT implemented. ` +
    `For multi-stage trains, high-ratio service, or heavy/lean gases, verify with rigorous EOS simulation (e.g. Aspen HYSYS, ProMax) or vendor thermodynamic modeling before detailed design.`
  );

  if (overallRatio > 10) {
    warnings.push(`High overall compression ratio (${overallRatio.toFixed(1)}) — verify mechanical feasibility and consider additional staging. FEED screening guidance; confirm with vendor.`);
  }
  if (finalDischargeTemp > input.maxDischargeTemperature) {
    warnings.push(`Discharge temperature ${finalDischargeTemp.toFixed(0)} °C exceeds user-specified limit (${input.maxDischargeTemperature} °C) — additional intercooling may be required or materials upgrade needed. Verify per project specification and applicable standard edition.`);
  } else if (finalDischargeTemp > input.maxDischargeTemperature * 0.9) {
    warnings.push(`Discharge temperature ${finalDischargeTemp.toFixed(0)} °C approaching user-specified limit (${input.maxDischargeTemperature} °C) — verify material suitability and consider intercooling in detailed design.`);
  }
  if (finalDischargeTemp > 150 && input.compressorType === "reciprocating") {
    warnings.push(`Discharge temperature ${finalDischargeTemp.toFixed(0)} °C exceeds 150 °C — typical industry guidance limits reciprocating discharge temperature to ~150 °C for packing and valve life; verify against project specification and applicable standard edition. Consider adding an intercooling stage.`);
  }
  if (numStages > 1) {
    warnings.push(`${numStages} compression stages required — intercooling assumed back to suction temperature between stages. Actual intercooler approach is typically 5–10°C above cooling medium. Allow 0.3–0.5 bar pressure drop per intercooler in system design.`);
  }

  for (let s = 0; s < stages.length; s++) {
    if (stages[s].dischargeTemperature > input.maxDischargeTemperature) {
      warnings.push(`Stage ${s + 1}: discharge temperature ${stages[s].dischargeTemperature.toFixed(0)}°C exceeds limit (${input.maxDischargeTemperature}°C) — intercooling inadequate or ratio too high for single stage.`);
    }
    if (stages[s].compressionRatio > 3.5 && input.compressorType === "centrifugal") {
      warnings.push(`Stage ${s + 1}: compression ratio ${stages[s].compressionRatio.toFixed(2)} exceeds the FEED screening guideline of ~3.5:1 for centrifugal compressors (common industry practice). Consider adding stages — confirm actual per-stage limit with compressor vendor.`);
    }
    if (stages[s].compressionRatio > 4.0 && input.compressorType === "reciprocating") {
      warnings.push(`Stage ${s + 1}: compression ratio ${stages[s].compressionRatio.toFixed(2)} exceeds the FEED screening guideline of ~4.0:1 for reciprocating compressors (common industry practice). Confirm actual limit with cylinder vendor.`);
    }
  }

  if (input.compressorType === "centrifugal" && MW > 50) {
    warnings.push(`Preliminary screening guidance: high molecular weight (${MW}) \u2014 centrifugal impeller tip speed may be limiting; consider reciprocating for heavy gases (GPSA Section 13). Confirm with vendor.`);
  }
  if (input.compressorType === "centrifugal" && MW < 5) {
    warnings.push(`Preliminary screening guidance: low molecular weight (${MW.toFixed(1)}) \u2014 very high polytropic head per stage; centrifugal may require many stages. Verify feasibility with vendor per API 617.`);
  }
  if (input.compressorType === "centrifugal" && actualVolumetricFlowRate < 500) {
    warnings.push(`Preliminary screening guidance: low actual inlet volume flow (${actualVolumetricFlowRate.toFixed(0)} m\u00B3/h) \u2014 centrifugal compressors are typically uneconomical below ~500 m\u00B3/h; consider reciprocating (GPSA Section 13).`);
  }
  if (input.compressorType === "centrifugal" && actualVolumetricFlowRate > 200000) {
    warnings.push(`Preliminary screening guidance: very high actual inlet flow (${actualVolumetricFlowRate.toFixed(0)} m\u00B3/h) \u2014 verify single-casing capacity with vendor; may require parallel units (API 617 reference).`);
  }
  if (input.compressorType === "reciprocating" && actualVolumetricFlowRate > 10000) {
    warnings.push(`Preliminary screening guidance: high actual inlet flow (${actualVolumetricFlowRate.toFixed(0)} m\u00B3/h) \u2014 centrifugal compressor may offer better efficiency and lower maintenance at this flow (GPSA Section 13).`);
  }
  if (input.polytropicEfficiency < 70) {
    warnings.push(`Low efficiency (${input.polytropicEfficiency}%) — verify compressor selection. Typical: centrifugal 75–85%, reciprocating 80–90% (GPSA Table 13-2/3).`);
  }

  const minNameplate_kW = totalShaftPower * 1.10;
  warnings.push(
    `Driver / nameplate screening minimum \u2265 ${minNameplate_kW.toFixed(1)} kW ` +
    `(= 110% \u00D7 shaft power ${totalShaftPower.toFixed(1)} kW \u2014 common FEED screening practice for driver sizing margin; ` +
    `verify required service factor and nameplate margin against project specification and applicable standard edition). ` +
    `Calculated electrical input = ${totalMotorPower.toFixed(1)} kW at \u03B7_motor = ${input.motorEfficiency}%.`
  );

  warnings.push(`Z-factor used: ${Z.toFixed(3)} (suction conditions only). Actual Z varies per stage — this is a known simplification. For wide-ratio multi-stage trains, verify with EOS-based simulation at each stage's discharge conditions.`);

  if (input.compressorType === "reciprocating") {
    warnings.push("RECIPROCATING SCREENING ONLY: This tool provides preliminary compression work and volumetric efficiency screening. NOT modeled: rod loads, frame/cylinder sizing, piston speed limits, valve pressure losses, pulsation (consult applicable standard), or settling-out pressure. Full mechanical design requires detailed vendor engineering per applicable project standards.");
    if (numStages > 1) {
      warnings.push("Reciprocating multi-stage screening: inter-stage rod load, pin reversal, pulsation dampener sizing, and settling-out pressure (SOP) for emergency shutdown all require detailed vendor engineering. This tool does not model these items.");
    }
  }
  if (input.compressorType === "centrifugal") {
    warnings.push("CENTRIFUGAL SCREENING: Surge margin should typically be \u2265 10% from the operating point to the estimated surge boundary — verify with vendor performance map. Anti-surge control philosophy should be confirmed during detailed design. Surge line shown on illustrative chart is schematic only; actual surge boundary requires vendor performance testing per applicable standard and project specification.");
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
