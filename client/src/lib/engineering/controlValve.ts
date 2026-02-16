/**
 * Control Valve Sizing — Cv calculation per IEC 60534 / ISA S75
 *
 * Liquid sizing equation (IEC 60534-2-1):
 *   Cv = Q / (N1 * Fp * sqrt(ΔP / (ρ/ρ0)))
 *
 * where:
 *   Q   = volumetric flow rate
 *   N1  = numerical constant (depends on units)
 *   Fp  = piping geometry factor (1.0 for line-size valve)
 *   ΔP  = differential pressure across valve
 *   ρ   = fluid density
 *   ρ0  = reference density (water at 15°C = 999 kg/m³)
 *
 * Choked flow check (liquid):
 *   ΔP_choked = FL² * (P1 - FF * Pv)
 *   FF = 0.96 - 0.28 * sqrt(Pv / Pc)
 *
 * Gas sizing equation (IEC 60534-2-1):
 *   W = N8 * Fp * Cv * Y * sqrt(x * MW * P1 / (T * Z))
 *
 * where:
 *   x = ΔP/P1 (pressure drop ratio)
 *   Y = 1 - x/(3*xT*Fp²)  (expansion factor)
 *   xT = pressure drop ratio at choked flow
 *
 * Reference: IEC 60534-2-1, ISA S75.01, Fisher Control Valve Handbook
 */

export interface CVLiquidInput {
  flowRate: number;         // m³/h
  liquidDensity: number;    // kg/m³
  upstreamPressure: number; // bar(a)
  downstreamPressure: number; // bar(a)
  vaporPressure: number;    // kPa(a)
  criticalPressure: number; // bar(a) (fluid critical pressure)
  pipeSize: number;         // mm (pipe ID for Fp calculation)
  valveSize: number;        // mm (valve nominal size, 0=line-size)
  fl: number;               // liquid pressure recovery factor (typical 0.8-0.9)
}

export interface CVLiquidResult {
  cvRequired: number;
  cvChoked: number;
  fpFactor: number;
  ffFactor: number;
  deltaPActual: number;     // bar
  deltaPChoked: number;     // bar
  isChoked: boolean;
  flowRegime: string;
  warnings: string[];
}

export interface CVGasInput {
  massFlowRate: number;     // kg/h
  molecularWeight: number;  // kg/kmol
  upstreamPressure: number; // bar(a)
  downstreamPressure: number; // bar(a)
  temperature: number;      // °C
  compressibilityFactor: number;
  specificHeatRatio: number;
  pipeSize: number;         // mm
  valveSize: number;        // mm (0=line-size)
  xt: number;               // pressure drop ratio factor at choked flow (typical 0.65-0.75)
}

export interface CVGasResult {
  cvRequired: number;
  xActual: number;
  xChoked: number;
  yFactor: number;
  fkFactor: number;
  fpFactor: number;
  isChoked: boolean;
  warnings: string[];
}

const N1_SI = 0.0865;  // for Q in m³/h, ΔP in bar, ρ/ρ0 ratio
const N8_SI = 94.8;    // for W in kg/h, P in bar(a), T in K, MW in kg/kmol
const RHO_REF = 999;   // kg/m³ reference density (water at 15°C)

function pipingGeometryFactor(pipeSize_mm: number, valveSize_mm: number): number {
  if (valveSize_mm <= 0 || valveSize_mm >= pipeSize_mm) return 1.0;
  const beta = valveSize_mm / pipeSize_mm;
  const sumK = 1.5 * (1 - beta * beta);
  return 1 / Math.sqrt(1 + sumK / 890);
}

export function calculateCVLiquid(input: CVLiquidInput): CVLiquidResult {
  const warnings: string[] = [];

  const P1 = input.upstreamPressure;
  const P2 = input.downstreamPressure;
  const dP = P1 - P2;

  if (dP <= 0) throw new Error("Upstream pressure must exceed downstream pressure");
  if (P1 <= 0) throw new Error("Upstream pressure must be positive");

  const Pv_bar = input.vaporPressure / 100;
  const Pc = input.criticalPressure;
  const FL = input.fl;
  const Fp = pipingGeometryFactor(input.pipeSize, input.valveSize);

  const FF = 0.96 - 0.28 * Math.sqrt(Pv_bar / Pc);
  const dP_choked = FL * FL * (P1 - FF * Pv_bar);
  const dP_sizing = Math.min(dP, dP_choked);
  const isChoked = dP >= dP_choked;

  const Q = input.flowRate;
  const Gf = input.liquidDensity / RHO_REF;

  const Cv = Q / (N1_SI * Fp * Math.sqrt(dP_sizing / Gf));

  if (isChoked) {
    warnings.push("Flow is CHOKED — valve is at maximum capacity for this ΔP. Increasing ΔP will not increase flow.");
  }

  if (Cv > 10000) {
    warnings.push(`Very large Cv (${Cv.toFixed(0)}) — verify valve can be sourced at this capacity`);
  }

  if (P2 < Pv_bar) {
    warnings.push("Downstream pressure is below fluid vapor pressure — flashing will occur downstream");
  }

  if (FL < 0.5) {
    warnings.push("Low FL factor — high pressure recovery valve (e.g., butterfly/ball). Verify cavitation limits.");
  }

  const Cv_choked = Q / (N1_SI * Fp * Math.sqrt(dP_choked / Gf));

  return {
    cvRequired: Cv,
    cvChoked: Cv_choked,
    fpFactor: Fp,
    ffFactor: FF,
    deltaPActual: dP,
    deltaPChoked: dP_choked,
    isChoked,
    flowRegime: isChoked ? "Choked (Cavitating/Flashing)" : "Normal (Sub-critical)",
    warnings,
  };
}

export function calculateCVGas(input: CVGasInput): CVGasResult {
  const warnings: string[] = [];

  const P1 = input.upstreamPressure;
  const P2 = input.downstreamPressure;
  const dP = P1 - P2;
  const T_K = input.temperature + 273.15;
  const k = input.specificHeatRatio;
  const Z = input.compressibilityFactor;
  const MW = input.molecularWeight;
  const xT = input.xt;

  if (dP <= 0) throw new Error("Upstream pressure must exceed downstream pressure");
  if (P1 <= 0) throw new Error("Upstream pressure must be positive");

  const Fp = pipingGeometryFactor(input.pipeSize, input.valveSize);
  const Fk = k / 1.4;
  const x = dP / P1;
  const x_choked = Fk * xT * Fp * Fp;
  const x_sizing = Math.min(x, x_choked);
  const isChoked = x >= x_choked;

  const Y = 1 - x_sizing / (3 * Fk * xT * Fp * Fp);

  const W = input.massFlowRate;
  const Cv = W / (N8_SI * Fp * Y * Math.sqrt(x_sizing * MW * P1 / (T_K * Z)));

  if (isChoked) {
    warnings.push("Flow is CHOKED — valve is at critical flow. Reducing downstream pressure will not increase flow.");
  }

  if (Y < 0.667) {
    warnings.push(`Expansion factor Y = ${Y.toFixed(3)} — valve operating near choked condition`);
  }

  if (Cv > 10000) {
    warnings.push(`Very large Cv (${Cv.toFixed(0)}) — verify valve availability`);
  }

  return {
    cvRequired: Cv,
    xActual: x,
    xChoked: x_choked,
    yFactor: Y,
    fkFactor: Fk,
    fpFactor: Fp,
    isChoked,
    warnings,
  };
}

export const CV_LIQUID_TEST_CASE: CVLiquidInput = {
  flowRate: 100,
  liquidDensity: 998.2,
  upstreamPressure: 10,
  downstreamPressure: 5,
  vaporPressure: 2.338,
  criticalPressure: 220.64,
  pipeSize: 154.08,
  valveSize: 0,
  fl: 0.90,
};

export const CV_GAS_TEST_CASE: CVGasInput = {
  massFlowRate: 10000,
  molecularWeight: 18.5,
  upstreamPressure: 30,
  downstreamPressure: 25,
  temperature: 40,
  compressibilityFactor: 0.92,
  specificHeatRatio: 1.27,
  pipeSize: 154.08,
  valveSize: 0,
  xt: 0.70,
};
