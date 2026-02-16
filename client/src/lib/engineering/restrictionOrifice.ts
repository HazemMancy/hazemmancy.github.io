import { PI, GAS_CONSTANT } from "./constants";

export interface ROLiquidInput {
  flowRate: number;       // m³/h
  liquidDensity: number;  // kg/m³
  upstreamPressure: number; // bar(g)
  downstreamPressure: number; // bar(g)
  orificeDiameter: number; // mm (0 = calculate required)
  pipeDiameter: number;    // mm
  dischargeCoefficient: number; // typically 0.60-0.65
}

export interface ROLiquidResult {
  requiredOrificeDiameter: number; // mm
  orificeArea: number;      // mm²
  betaRatio: number;
  velocity: number;         // m/s through orifice
  pipeVelocity: number;     // m/s in pipe
  pressureDrop: number;     // bar
  flowCoefficient: number;
  warnings: string[];
}

export interface ROGasInput {
  massFlowRate: number;     // kg/h
  molecularWeight: number;  // kg/kmol
  upstreamPressure: number; // bar(a)
  downstreamPressure: number; // bar(a)
  upstreamTemperature: number; // °C
  orificeDiameter: number;  // mm (0 = calculate required)
  pipeDiameter: number;     // mm
  specificHeatRatio: number; // Cp/Cv
  compressibilityFactor: number;
  dischargeCoefficient: number;
}

export interface ROGasResult {
  requiredOrificeDiameter: number; // mm
  orificeArea: number;      // mm²
  betaRatio: number;
  pressureRatio: number;
  criticalPressureRatio: number;
  isChoked: boolean;
  velocity: number;         // m/s through orifice
  warnings: string[];
}

/**
 * Liquid restriction orifice sizing using Bernoulli/orifice equation:
 *   Q = Cd * A * sqrt(2 * ΔP / ρ)
 * where:
 *   Q  = volumetric flow rate (m³/s)
 *   Cd = discharge coefficient (dimensionless, typically 0.60–0.65 for sharp-edged)
 *   A  = orifice area (m²)
 *   ΔP = differential pressure (Pa)
 *   ρ  = liquid density (kg/m³)
 *
 * Reference: Crane TP-410, Miller Flow Measurement Engineering Handbook
 */
export function calculateROLiquid(input: ROLiquidInput): ROLiquidResult {
  const warnings: string[] = [];

  const dP_bar = input.upstreamPressure - input.downstreamPressure;
  if (dP_bar <= 0) throw new Error("Upstream pressure must be greater than downstream pressure");

  const dP_Pa = dP_bar * 1e5;
  const Cd = input.dischargeCoefficient;
  const Q_m3s = input.flowRate / 3600;
  const pipeDia_m = input.pipeDiameter / 1000;
  const pipeArea = (PI / 4) * pipeDia_m * pipeDia_m;

  const requiredArea_m2 = Q_m3s / (Cd * Math.sqrt(2 * dP_Pa / input.liquidDensity));
  const requiredDia_m = Math.sqrt(4 * requiredArea_m2 / PI);
  const requiredDia_mm = requiredDia_m * 1000;

  const useDia_mm = input.orificeDiameter > 0 ? input.orificeDiameter : requiredDia_mm;
  const useDia_m = useDia_mm / 1000;
  const orificeArea_m2 = (PI / 4) * useDia_m * useDia_m;
  const orificeArea_mm2 = orificeArea_m2 * 1e6;

  const beta = useDia_m / pipeDia_m;
  const velocity = Q_m3s / orificeArea_m2;
  const pipeVelocity = Q_m3s / pipeArea;

  const flowCoefficient = Cd / Math.sqrt(1 - Math.pow(beta, 4));

  if (beta > 0.75) {
    warnings.push(`Beta ratio ${beta.toFixed(3)} > 0.75 — orifice may not provide reliable pressure drop`);
  }
  if (beta < 0.2) {
    warnings.push(`Beta ratio ${beta.toFixed(3)} < 0.20 — very small orifice, verify manufacturability`);
  }
  if (velocity > 50) {
    warnings.push(`Orifice velocity ${velocity.toFixed(1)} m/s is very high — erosion/cavitation risk`);
  }
  if (dP_bar > input.upstreamPressure * 0.5) {
    warnings.push("Pressure drop exceeds 50% of upstream pressure — cavitation likely, consider multi-stage");
  }

  return {
    requiredOrificeDiameter: requiredDia_mm,
    orificeArea: orificeArea_mm2,
    betaRatio: beta,
    velocity,
    pipeVelocity,
    pressureDrop: dP_bar,
    flowCoefficient,
    warnings,
  };
}

/**
 * Gas restriction orifice sizing per ISA/ISO 5167 approach:
 *   W = Cd * A * P1 * Y * sqrt(2 * MW / (Z * R * T))
 *
 * Critical (choked) flow check:
 *   P2/P1 < (2/(k+1))^(k/(k-1))  →  choked flow
 *
 * For choked flow, mass flow through orifice:
 *   W = Cd * A * P1 * sqrt(MW * k / (Z * R * T) * (2/(k+1))^((k+1)/(k-1)))
 *
 * For sub-critical flow, expansion factor Y (ISA approximation):
 *   Y = 1 - (0.41 + 0.35 * β⁴) * (1 - r) / k
 *   where r = P2/P1
 *
 * Reference: ISO 5167, API 520 Part I (for critical flow), Crane TP-410
 */
export function calculateROGas(input: ROGasInput): ROGasResult {
  const warnings: string[] = [];

  const P1_Pa = input.upstreamPressure * 1e5;
  const P2_Pa = input.downstreamPressure * 1e5;
  const T_K = input.upstreamTemperature + 273.15;
  const k = input.specificHeatRatio;
  const Z = input.compressibilityFactor;
  const MW = input.molecularWeight;
  const Cd = input.dischargeCoefficient;
  const W_kgs = input.massFlowRate / 3600;
  const pipeDia_m = input.pipeDiameter / 1000;

  if (P2_Pa >= P1_Pa) throw new Error("Upstream pressure must exceed downstream pressure");

  const pressureRatio = P2_Pa / P1_Pa;
  const criticalPressureRatio = Math.pow(2 / (k + 1), k / (k - 1));
  const isChoked = pressureRatio <= criticalPressureRatio;

  let requiredArea_m2: number;

  if (isChoked) {
    const chokedFactor = Math.sqrt(
      (MW * k) / (Z * GAS_CONSTANT * T_K) * Math.pow(2 / (k + 1), (k + 1) / (k - 1))
    );
    requiredArea_m2 = W_kgs / (Cd * P1_Pa * chokedFactor);
    warnings.push("Flow is CHOKED (critical) — downstream pressure does not affect flow rate");
  } else {
    const beta_est = 0.5;
    const Y = 1 - (0.41 + 0.35 * Math.pow(beta_est, 4)) * (1 - pressureRatio) / k;

    const rho1 = (P1_Pa * MW) / (Z * GAS_CONSTANT * T_K);
    const dP_Pa = P1_Pa - P2_Pa;
    requiredArea_m2 = W_kgs / (Cd * Y * Math.sqrt(2 * rho1 * dP_Pa));
  }

  const requiredDia_m = Math.sqrt(4 * requiredArea_m2 / PI);
  const requiredDia_mm = requiredDia_m * 1000;

  const useDia_mm = input.orificeDiameter > 0 ? input.orificeDiameter : requiredDia_mm;
  const useDia_m = useDia_mm / 1000;
  const orificeArea_m2 = (PI / 4) * useDia_m * useDia_m;
  const orificeArea_mm2 = orificeArea_m2 * 1e6;

  const beta = useDia_m / pipeDia_m;

  const rho_upstream = (P1_Pa * MW) / (Z * GAS_CONSTANT * T_K);
  const velocity = W_kgs / (rho_upstream * orificeArea_m2);

  if (beta > 0.75) {
    warnings.push(`Beta ratio ${beta.toFixed(3)} > 0.75 — orifice may not provide reliable restriction`);
  }
  if (beta < 0.2) {
    warnings.push(`Beta ratio ${beta.toFixed(3)} < 0.20 — very small orifice`);
  }
  if (!isChoked && pressureRatio < criticalPressureRatio * 1.1) {
    warnings.push("Pressure ratio is close to critical — small changes may cause choking");
  }

  return {
    requiredOrificeDiameter: requiredDia_mm,
    orificeArea: orificeArea_mm2,
    betaRatio: beta,
    pressureRatio,
    criticalPressureRatio,
    isChoked,
    velocity,
    warnings,
  };
}

export const RO_LIQUID_TEST_CASE: ROLiquidInput = {
  flowRate: 50,
  liquidDensity: 998.2,
  upstreamPressure: 10,
  downstreamPressure: 5,
  orificeDiameter: 0,
  pipeDiameter: 154.08,
  dischargeCoefficient: 0.61,
};

export const RO_GAS_TEST_CASE: ROGasInput = {
  massFlowRate: 5000,
  molecularWeight: 18.5,
  upstreamPressure: 30,
  downstreamPressure: 10,
  upstreamTemperature: 40,
  orificeDiameter: 0,
  pipeDiameter: 154.08,
  specificHeatRatio: 1.27,
  compressibilityFactor: 0.92,
  dischargeCoefficient: 0.61,
};
