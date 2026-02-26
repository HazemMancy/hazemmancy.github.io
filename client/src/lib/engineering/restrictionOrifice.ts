import { PI, GAS_CONSTANT } from "./constants";

export const R_UNIVERSAL = GAS_CONSTANT;

export type Phase = "liquid" | "gas";
export type SizingMode = "sizeForFlow" | "checkOrifice" | "predictDP";
export type CdMode = "user" | "estimated";
export type EdgeType = "sharp" | "rounded";
export type BasisMode = "inPipe" | "freeDischarge";

export interface ROProject {
  name: string;
  caseId: string;
  engineer: string;
  date: string;
  maxIterations: number;
  tolerance: number;
  showIntermediates: boolean;
}

export const DEFAULT_PROJECT: ROProject = {
  name: "", caseId: "", engineer: "", date: new Date().toISOString().slice(0, 10),
  maxIterations: 50, tolerance: 1e-6, showIntermediates: true,
};

export interface FluidPropsLiquid {
  density: number;
  viscosity: number;
  vaporPressure: number;
}

export interface FluidPropsGas {
  molecularWeight: number;
  specificHeatRatio: number;
  compressibilityFactor: number;
  viscosity: number;
}

export interface OrificeOptions {
  cdMode: CdMode;
  cdValue: number;
  edgeType: EdgeType;
  basisMode: BasisMode;
  thickness: number;
}

export interface ROServiceInput {
  phase: Phase;
  sizingMode: SizingMode;
  massFlowRate: number;
  volFlowRate: number;
  flowBasis: "mass" | "volume";
  upstreamPressure: number;
  downstreamPressure: number;
  temperature: number;
  pipeDiameter: number;
  orificeDiameter: number;
  liquidProps: FluidPropsLiquid;
  gasProps: FluidPropsGas;
  orifice: OrificeOptions;
  betaMin: number;
  betaMax: number;
  numStages: number;
}

export const DEFAULT_SERVICE: ROServiceInput = {
  phase: "liquid",
  sizingMode: "sizeForFlow",
  massFlowRate: 0, volFlowRate: 0, flowBasis: "volume",
  upstreamPressure: 0, downstreamPressure: 0, temperature: 25,
  pipeDiameter: 154.08, orificeDiameter: 0,
  liquidProps: { density: 998.2, viscosity: 1.0, vaporPressure: 0 },
  gasProps: { molecularWeight: 18.5, specificHeatRatio: 1.27, compressibilityFactor: 0.92, viscosity: 0.012 },
  orifice: { cdMode: "user", cdValue: 0.61, edgeType: "sharp", basisMode: "inPipe", thickness: 3 },
  betaMin: 0.20, betaMax: 0.75, numStages: 1,
};

export interface CalcStep {
  label: string;
  equation: string;
  value: string;
  unit: string;
  eqId?: string;
}

export interface SolverInfo {
  method: string;
  iterations: number;
  finalError: number;
  tolerance: number;
  converged: boolean;
  bracketLow: number;
  bracketHigh: number;
}

export type ROFlag =
  | "CHOKED_FLOW"
  | "HIGH_NOISE_RISK"
  | "FLASHING_LIKELY"
  | "CAVITATION_RISK"
  | "TWO_PHASE_SUSPECTED"
  | "BETA_OUT_OF_RANGE"
  | "CD_ESTIMATED"
  | "HIGH_DP_FRACTION"
  | "SOLVER_ISSUE"
  | "NEAR_CHOKED"
  | "HIGH_MACH"
  | "HIGH_ORIFICE_VELOCITY"
  | "MULTI_STAGE_RECOMMENDED";

export interface StageResult {
  stageNumber: number;
  upstreamPressure: number;
  downstreamPressure: number;
  pressureDrop: number;
  orificeDiameter: number;
  betaRatio: number;
  orificeVelocity: number;
}

export interface ROResult {
  phase: Phase;
  sizingMode: SizingMode;
  requiredDiameter: number;
  orificeArea: number;
  betaRatio: number;
  pressureDrop: number;
  permanentPressureLoss: number;
  recoveryFactor: number;
  orificeVelocity: number;
  pipeVelocity: number;
  flowCoefficient: number;
  massFlow: number;
  volFlow: number;
  standardBore: number;
  standardBoreArea: number;
  standardBoreBeta: number;
  pressureRatio: number;
  criticalPressureRatio: number;
  isChoked: boolean;
  expansionFactor: number;
  criticalFlowFunction: number;
  upstreamDensity: number;
  rSpecific: number;
  reynoldsNumber: number;
  reynoldsNumberPipe: number;
  machNumber: number;
  sigma: number;
  noiseLevelEstimate: number;
  cdEffective: number;
  numStages: number;
  stages: StageResult[];
  calcSteps: CalcStep[];
  solverInfo: SolverInfo | null;
  flags: ROFlag[];
  warnings: string[];
  recommendations: string[];
}

interface BisectionResult {
  root: number;
  iterations: number;
  error: number;
  converged: boolean;
  bracketLow: number;
  bracketHigh: number;
}

function bisectionSolve(
  fn: (x: number) => number,
  lo: number, hi: number,
  tol: number, maxIter: number,
): BisectionResult {
  let fLo = fn(lo);
  let fHi = fn(hi);

  if (fLo * fHi > 0) {
    let bestX = lo; let bestF = Math.abs(fLo);
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = lo + (hi - lo) * i / steps;
      const fx = fn(x);
      if (Math.abs(fx) < bestF) { bestF = Math.abs(fx); bestX = x; }
      if (fx * fLo < 0) { hi = x; fHi = fx; break; }
      if (fx * fHi < 0) { lo = x; fLo = fx; break; }
    }
    if (fLo * fHi > 0) {
      return { root: bestX, iterations: steps, error: bestF, converged: false, bracketLow: lo, bracketHigh: hi };
    }
  }

  let mid = lo;
  let iter = 0;
  for (; iter < maxIter; iter++) {
    mid = (lo + hi) / 2;
    const fMid = fn(mid);
    if (Math.abs(fMid) < tol || (hi - lo) / 2 < tol * 0.01) {
      return { root: mid, iterations: iter + 1, error: Math.abs(fMid), converged: true, bracketLow: lo, bracketHigh: hi };
    }
    if (fMid * fLo < 0) { hi = mid; fHi = fMid; }
    else { lo = mid; fLo = fMid; }
  }
  return { root: mid, iterations: iter, error: Math.abs(fn(mid)), converged: Math.abs(fn(mid)) < tol * 100, bracketLow: lo, bracketHigh: hi };
}

function roundToStandardBore(d_mm: number): number {
  if (d_mm <= 3) return Math.ceil(d_mm * 10) / 10;
  if (d_mm <= 10) return Math.ceil(d_mm * 4) / 4;
  if (d_mm <= 50) return Math.ceil(d_mm * 2) / 2;
  return Math.ceil(d_mm);
}

function estimateCdFromReynolds(Re_d: number, beta: number, edgeType: EdgeType): number {
  if (edgeType === "rounded") return 0.97;
  if (Re_d < 100) return 0.50;
  const Ce = 0.5959 + 0.0312 * Math.pow(beta, 2.1) - 0.1840 * Math.pow(beta, 8);
  const ReCorr = Re_d > 4000 ? 91.706 * Math.pow(beta, 2.5) / Math.pow(Re_d, 0.75) : 0;
  const Cd = Ce + ReCorr;
  return Math.max(0.40, Math.min(Cd, 0.85));
}

function permanentPressureLossFraction(beta: number): number {
  return Math.sqrt(1 - Math.pow(beta, 4)) - Math.pow(beta, 2);
}

function estimateNoiseLevel(
  W_kgs: number, P1_Pa: number, P2_Pa: number,
  D_mm: number, d_mm: number, rho1: number,
): number {
  const dP = P1_Pa - P2_Pa;
  if (dP <= 0 || W_kgs <= 0 || rho1 <= 0) return 0;
  const v_orifice = W_kgs / (rho1 * (PI / 4) * Math.pow(d_mm / 1000, 2));
  const Lw = 10 * Math.log10(W_kgs * Math.pow(v_orifice, 3) * rho1) + 10;
  const r_m = 1.0;
  const SPL = Lw - 10 * Math.log10(PI * D_mm / 1000 * r_m) + 10 * Math.log10(D_mm / (D_mm + 2 * 10));
  return Math.max(0, Math.min(SPL, 150));
}

function liquidMassFlowForDiameter(
  d_mm: number, D_mm: number, rho: number, dP_Pa: number, Cd: number, basisMode: BasisMode,
): number {
  const d_m = d_mm / 1000;
  const D_m = D_mm / 1000;
  const A = (PI / 4) * d_m * d_m;
  const beta = d_m / D_m;
  const betaCorr = basisMode === "inPipe" ? (1 - Math.pow(beta, 4)) : 1;
  if (betaCorr <= 0 || dP_Pa <= 0) return 0;
  return Cd * A * Math.sqrt(2 * rho * dP_Pa / betaCorr) * 3600;
}

function liquidDPForDiameter(
  d_mm: number, D_mm: number, rho: number, W_kgh: number, Cd: number, basisMode: BasisMode,
): number {
  const d_m = d_mm / 1000;
  const D_m = D_mm / 1000;
  const A = (PI / 4) * d_m * d_m;
  const beta = d_m / D_m;
  const betaCorr = basisMode === "inPipe" ? (1 - Math.pow(beta, 4)) : 1;
  if (A <= 0 || Cd <= 0) return 0;
  const W_kgs = W_kgh / 3600;
  return (W_kgs / (Cd * A)) * (W_kgs / (Cd * A)) * betaCorr / (2 * rho);
}

export function calculateROLiquid(input: ROServiceInput, project: ROProject): ROResult {
  const steps: CalcStep[] = [];
  const flags: ROFlag[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const P1_Pa = input.upstreamPressure * 1e5;
  const P2_Pa = input.downstreamPressure * 1e5;
  const rho = input.liquidProps.density;
  const mu_cP = input.liquidProps.viscosity;
  const Pv = input.liquidProps.vaporPressure;
  let Cd = input.orifice.cdValue;
  const D_mm = input.pipeDiameter;
  const D_m = D_mm / 1000;
  const basisMode = input.orifice.basisMode;
  const estimateCd = input.orifice.cdMode === "estimated" && mu_cP > 0;

  if (input.sizingMode !== "predictDP") {
    if (P1_Pa <= P2_Pa) throw new Error("Upstream pressure (P1) must be greater than downstream pressure (P2)");
  }
  if (rho <= 0) throw new Error("Liquid density must be positive");
  if (Cd <= 0 || Cd > 1) throw new Error("Discharge coefficient must be between 0 and 1");
  if (D_mm <= 0) throw new Error("Pipe diameter must be positive");

  let W_kgh: number;
  let Q_m3h: number;
  if (input.flowBasis === "volume") {
    Q_m3h = input.volFlowRate;
    W_kgh = Q_m3h * rho;
    if (Q_m3h <= 0 && input.sizingMode !== "checkOrifice") throw new Error("Volumetric flow rate must be positive");
  } else {
    W_kgh = input.massFlowRate;
    Q_m3h = W_kgh / rho;
    if (W_kgh <= 0 && input.sizingMode !== "checkOrifice") throw new Error("Mass flow rate must be positive");
  }

  const dP_Pa = P1_Pa - P2_Pa;
  const dP_bar = input.upstreamPressure - input.downstreamPressure;

  steps.push({ label: "Upstream pressure P₁", equation: "", value: input.upstreamPressure.toFixed(3), unit: "bar(a)", eqId: "RO-L-01" });
  steps.push({ label: "Downstream pressure P₂", equation: "", value: input.downstreamPressure.toFixed(3), unit: "bar(a)", eqId: "RO-L-02" });
  steps.push({ label: "Pressure drop ΔP", equation: "ΔP = P₁ - P₂", value: dP_bar.toFixed(3), unit: "bar", eqId: "RO-L-03" });
  steps.push({ label: "ΔP (Pa)", equation: "ΔP = (P₁ - P₂) × 10⁵", value: dP_Pa.toFixed(0), unit: "Pa", eqId: "RO-L-04" });
  steps.push({ label: "Liquid density ρ", equation: "", value: rho.toFixed(2), unit: "kg/m³", eqId: "RO-L-05" });
  steps.push({ label: "Mass flow W", equation: "W = Q × ρ", value: W_kgh.toFixed(2), unit: "kg/h", eqId: "RO-L-06" });
  steps.push({ label: "Volume flow Q", equation: "Q = W / ρ", value: Q_m3h.toFixed(4), unit: "m³/h", eqId: "RO-L-07" });

  if (estimateCd) {
    flags.push("CD_ESTIMATED");
    warnings.push("Cd is iteratively estimated from Reader-Harris/Gallagher correlation — results have higher uncertainty");
  }

  let d_mm: number;
  let solverInfo: SolverInfo | null = null;
  let cdIterations = 0;

  if (input.sizingMode === "sizeForFlow") {
    const maxCdIter = estimateCd ? 10 : 1;
    let prevCd = Cd;
    for (let ci = 0; ci < maxCdIter; ci++) {
      cdIterations = ci + 1;
      const fn = (d: number) => liquidMassFlowForDiameter(d, D_mm, rho, dP_Pa, Cd, basisMode) - W_kgh;
      const solResult = bisectionSolve(fn, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
      d_mm = solResult.root;
      if (ci === 0) {
        solverInfo = {
          method: "Bisection", iterations: solResult.iterations, finalError: solResult.error,
          tolerance: project.tolerance, converged: solResult.converged,
          bracketLow: solResult.bracketLow, bracketHigh: solResult.bracketHigh,
        };
        if (!solResult.converged) {
          flags.push("SOLVER_ISSUE");
          warnings.push(`Solver did not converge after ${solResult.iterations} iterations (error: ${solResult.error.toExponential(2)})`);
        }
      }
      if (!estimateCd) break;
      const di_m = d_mm! / 1000;
      const Ai = (PI / 4) * di_m * di_m;
      const betai = di_m / D_m;
      const vi = (Q_m3h / 3600) / Ai;
      const mu_Pas = mu_cP * 1e-3;
      const Rei = rho * vi * di_m / mu_Pas;
      const Cd_new = estimateCdFromReynolds(Rei, betai, input.orifice.edgeType);
      if (Math.abs(Cd_new - prevCd) < 1e-5) { Cd = Cd_new; break; }
      prevCd = Cd;
      Cd = Cd_new;
    }
    d_mm = d_mm!;
    steps.push({ label: "Solver target", equation: "Find d : W(d) = W_target", value: W_kgh.toFixed(2), unit: "kg/h", eqId: "RO-L-09" });
    if (estimateCd) {
      steps.push({ label: "Cd convergence", equation: `${cdIterations} Cd iterations`, value: Cd.toFixed(4), unit: "—", eqId: "RO-L-09b" });
    }
  } else if (input.sizingMode === "checkOrifice") {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in check mode");
    if (estimateCd) {
      const di_m = d_mm / 1000;
      const betai = di_m / D_m;
      const Ai = (PI / 4) * di_m * di_m;
      let prevCd = Cd;
      for (let ci = 0; ci < 10; ci++) {
        cdIterations = ci + 1;
        W_kgh = liquidMassFlowForDiameter(d_mm, D_mm, rho, dP_Pa, Cd, basisMode);
        Q_m3h = W_kgh / rho;
        const vi = (Q_m3h / 3600) / Ai;
        const mu_Pas = mu_cP * 1e-3;
        const Rei = rho * vi * di_m / mu_Pas;
        const Cd_new = estimateCdFromReynolds(Rei, betai, input.orifice.edgeType);
        if (Math.abs(Cd_new - prevCd) < 1e-5) { Cd = Cd_new; break; }
        prevCd = Cd;
        Cd = Cd_new;
      }
      W_kgh = liquidMassFlowForDiameter(d_mm, D_mm, rho, dP_Pa, Cd, basisMode);
      Q_m3h = W_kgh / rho;
      steps.push({ label: "Cd convergence", equation: `${cdIterations} Cd iterations`, value: Cd.toFixed(4), unit: "—", eqId: "RO-L-10b" });
    } else {
      W_kgh = liquidMassFlowForDiameter(d_mm, D_mm, rho, dP_Pa, Cd, basisMode);
      Q_m3h = W_kgh / rho;
    }
    steps.push({ label: "Check mode", equation: "Given d, P₁, P₂ → compute W", value: W_kgh.toFixed(2), unit: "kg/h", eqId: "RO-L-10" });
  } else {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in ΔP prediction mode");
    if (W_kgh <= 0) throw new Error("Flow rate must be positive in ΔP prediction mode");
    if (estimateCd) {
      const di_m = d_mm / 1000;
      const betai = di_m / D_m;
      const Ai = (PI / 4) * di_m * di_m;
      let prevCd = Cd;
      for (let ci = 0; ci < 10; ci++) {
        cdIterations = ci + 1;
        const vi = (Q_m3h / 3600) / Ai;
        const mu_Pas = mu_cP * 1e-3;
        const Rei = rho * vi * di_m / mu_Pas;
        const Cd_new = estimateCdFromReynolds(Rei, betai, input.orifice.edgeType);
        if (Math.abs(Cd_new - prevCd) < 1e-5) { Cd = Cd_new; break; }
        prevCd = Cd;
        Cd = Cd_new;
      }
      steps.push({ label: "Cd convergence", equation: `${cdIterations} Cd iterations`, value: Cd.toFixed(4), unit: "—", eqId: "RO-L-11b" });
    }
    const predictedDP_Pa = liquidDPForDiameter(d_mm, D_mm, rho, W_kgh, Cd, basisMode);
    const predictedDP_bar = predictedDP_Pa / 1e5;
    steps.push({ label: "Predicted ΔP", equation: "ΔP = W²·(1-β⁴) / (2ρ·Cd²·A²)", value: predictedDP_bar.toFixed(4), unit: "bar", eqId: "RO-L-11" });
    steps.push({ label: "Predicted P₂", equation: "P₂ = P₁ - ΔP", value: (input.upstreamPressure - predictedDP_bar).toFixed(4), unit: "bar(a)", eqId: "RO-L-12" });
  }

  const d_m = d_mm / 1000;
  const A_m2 = (PI / 4) * d_m * d_m;
  const A_mm2 = A_m2 * 1e6;
  const beta = d_m / D_m;
  const betaCorr = basisMode === "inPipe" ? (1 - Math.pow(beta, 4)) : 1;
  const pipeArea_m2 = (PI / 4) * D_m * D_m;

  const actualDP_bar = input.sizingMode === "predictDP"
    ? liquidDPForDiameter(d_mm, D_mm, rho, W_kgh, Cd, basisMode) / 1e5
    : dP_bar;
  const actualP2_bar = input.upstreamPressure - actualDP_bar;

  const permLossFraction = permanentPressureLossFraction(beta);
  const permanentPressureLoss = actualDP_bar * permLossFraction;
  const recoveryFactor = 1 - permLossFraction;

  steps.push({ label: "Orifice diameter d", equation: input.sizingMode === "sizeForFlow" ? "d (solved)" : "d (given)", value: d_mm.toFixed(3), unit: "mm", eqId: "RO-L-13" });
  steps.push({ label: "Orifice area A", equation: "A = π·d²/4", value: A_mm2.toFixed(2), unit: "mm²", eqId: "RO-L-14" });
  steps.push({ label: "Beta ratio β", equation: "β = d/D", value: beta.toFixed(4), unit: "—", eqId: "RO-L-15" });
  steps.push({ label: "β⁴ correction", equation: `1 - β⁴ = ${betaCorr.toFixed(6)}`, value: betaCorr.toFixed(6), unit: "—", eqId: "RO-L-16" });
  steps.push({ label: "Permanent ΔP fraction", equation: "α = √(1-β⁴) - β²", value: permLossFraction.toFixed(4), unit: "—", eqId: "RO-L-17" });
  steps.push({ label: "Permanent pressure loss", equation: "ΔP_perm = ΔP × α", value: permanentPressureLoss.toFixed(4), unit: "bar", eqId: "RO-L-18" });
  steps.push({ label: "Pressure recovery", equation: "ΔP_recov = ΔP × (1 - α)", value: (actualDP_bar * recoveryFactor).toFixed(4), unit: "bar", eqId: "RO-L-19" });

  const Q_m3s = Q_m3h / 3600;
  const orificeVelocity = A_m2 > 0 ? Q_m3s / A_m2 : 0;
  const pipeVelocity = pipeArea_m2 > 0 ? Q_m3s / pipeArea_m2 : 0;
  const flowCoefficient = Cd / Math.sqrt(betaCorr > 0 ? betaCorr : 1);

  steps.push({ label: "Orifice velocity v_o", equation: "v_o = Q / A_orifice", value: orificeVelocity.toFixed(2), unit: "m/s", eqId: "RO-L-20" });
  steps.push({ label: "Pipe velocity v_p", equation: "v_p = Q / A_pipe", value: pipeVelocity.toFixed(2), unit: "m/s", eqId: "RO-L-21" });
  steps.push({ label: "Flow coefficient K", equation: "K = Cd / √(1-β⁴)", value: flowCoefficient.toFixed(4), unit: "—", eqId: "RO-L-22" });
  steps.push({ label: "Cd effective", equation: estimateCd ? "Iteratively estimated (RHG)" : "User-defined", value: Cd.toFixed(4), unit: "—", eqId: "RO-L-25" });

  let Re = 0;
  let Re_pipe = 0;
  if (mu_cP > 0 && d_m > 0) {
    const mu_Pas = mu_cP * 1e-3;
    Re = rho * orificeVelocity * d_m / mu_Pas;
    Re_pipe = rho * pipeVelocity * D_m / mu_Pas;
    steps.push({ label: "Reynolds (orifice)", equation: "Re_d = ρ·v_o·d / μ", value: Re.toFixed(0), unit: "—", eqId: "RO-L-23" });
    steps.push({ label: "Reynolds (pipe)", equation: "Re_D = ρ·v_p·D / μ", value: Re_pipe.toFixed(0), unit: "—", eqId: "RO-L-24" });
  }

  if (Pv > 0) {
    const sigma = actualDP_bar > 0 ? (input.upstreamPressure - Pv) / actualDP_bar : 0;
    steps.push({ label: "Cavitation index σ", equation: "σ = (P₁ - Pv) / ΔP", value: sigma.toFixed(4), unit: "—", eqId: "RO-L-08" });

    if (actualP2_bar <= Pv) {
      flags.push("FLASHING_LIKELY");
      warnings.push(`P₂ (${actualP2_bar.toFixed(2)} bar) ≤ Pv (${Pv.toFixed(2)} bar) — flashing likely, two-phase downstream`);
      recommendations.push("Consider staged pressure reduction or relocate restriction point");
    } else if (actualP2_bar < Pv * 1.3) {
      flags.push("CAVITATION_RISK");
      warnings.push(`P₂ close to Pv — cavitation risk (P₂=${actualP2_bar.toFixed(2)} bar, Pv=${Pv.toFixed(2)} bar)`);
      recommendations.push("Evaluate anti-cavitation trim or multi-stage letdown");
    }

    if (Pv >= input.upstreamPressure) {
      flags.push("TWO_PHASE_SUSPECTED");
      warnings.push(`Pv (${Pv.toFixed(2)} bar) ≥ P₁ (${input.upstreamPressure.toFixed(2)} bar) — boiling upstream`);
    }
  }

  const dpFraction = actualDP_bar > 0 && input.upstreamPressure > 0 ? actualDP_bar / input.upstreamPressure : 0;
  if (dpFraction > 0.5) {
    flags.push("HIGH_DP_FRACTION");
    warnings.push(`ΔP/P₁ = ${(dpFraction * 100).toFixed(1)}% — very high pressure drop fraction`);
    recommendations.push("Consider multi-stage restriction to reduce cavitation and noise risk");
  }

  const stdBore = roundToStandardBore(d_mm);
  const stdBoreArea = (PI / 4) * Math.pow(stdBore / 1000, 2) * 1e6;
  const stdBoreBeta = (stdBore / 1000) / D_m;
  steps.push({ label: "Standard bore (rounded up)", equation: "", value: stdBore.toFixed(2), unit: "mm", eqId: "RO-L-26" });
  steps.push({ label: "Standard bore β", equation: "β_std = d_std / D", value: stdBoreBeta.toFixed(4), unit: "—", eqId: "RO-L-27" });

  if (beta < input.betaMin || beta > input.betaMax) {
    flags.push("BETA_OUT_OF_RANGE");
    warnings.push(`β = ${beta.toFixed(4)} outside recommended range [${input.betaMin}–${input.betaMax}]`);
    if (beta > input.betaMax) recommendations.push("Consider using a larger pipe size to achieve a lower β ratio");
    if (beta < input.betaMin) recommendations.push("Very small orifice — verify manufacturability and consider alternative restriction methods");
  }

  if (orificeVelocity > 50) {
    flags.push("HIGH_ORIFICE_VELOCITY");
    warnings.push(`Orifice velocity ${orificeVelocity.toFixed(1)} m/s is very high — erosion and cavitation risk`);
    recommendations.push("Consider multi-stage restriction to reduce jet velocity");
  }

  const numStages = input.numStages > 1 ? input.numStages : 1;
  const stages: StageResult[] = [];
  if (numStages > 1 && input.sizingMode === "sizeForFlow") {
    const totalDP = actualDP_bar;
    const stageDP = totalDP / numStages;
    for (let s = 0; s < numStages; s++) {
      const sP1 = input.upstreamPressure - s * stageDP;
      const sP2 = sP1 - stageDP;
      const sDP_Pa = stageDP * 1e5;
      const fn = (d: number) => liquidMassFlowForDiameter(d, D_mm, rho, sDP_Pa, Cd, basisMode) - W_kgh;
      const sol = bisectionSolve(fn, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
      const sBeta = (sol.root / 1000) / D_m;
      const sArea = (PI / 4) * Math.pow(sol.root / 1000, 2);
      const sVel = Q_m3s / sArea;
      stages.push({
        stageNumber: s + 1, upstreamPressure: sP1, downstreamPressure: sP2,
        pressureDrop: stageDP, orificeDiameter: sol.root, betaRatio: sBeta, orificeVelocity: sVel,
      });
    }
    steps.push({ label: "Multi-stage", equation: `${numStages} stages × ${stageDP.toFixed(3)} bar each`, value: totalDP.toFixed(3), unit: "bar total", eqId: "RO-L-28" });
  }

  if (dpFraction > 0.4 && numStages <= 1) {
    flags.push("MULTI_STAGE_RECOMMENDED");
    const suggestedStages = Math.ceil(dpFraction / 0.3);
    recommendations.push(`Consider ${suggestedStages}-stage restriction (ΔP/P₁ = ${(dpFraction * 100).toFixed(0)}% exceeds 40%)`);
  }

  return {
    phase: "liquid", sizingMode: input.sizingMode,
    requiredDiameter: d_mm, orificeArea: A_mm2, betaRatio: beta,
    pressureDrop: actualDP_bar, permanentPressureLoss, recoveryFactor,
    orificeVelocity, pipeVelocity, flowCoefficient,
    massFlow: W_kgh, volFlow: Q_m3h,
    standardBore: stdBore, standardBoreArea: stdBoreArea, standardBoreBeta: stdBoreBeta,
    pressureRatio: 0, criticalPressureRatio: 0, isChoked: false,
    expansionFactor: 1, criticalFlowFunction: 0,
    upstreamDensity: rho, rSpecific: 0,
    reynoldsNumber: Re, reynoldsNumberPipe: Re_pipe, machNumber: 0,
    sigma: Pv > 0 && actualDP_bar > 0 ? (input.upstreamPressure - Pv) / actualDP_bar : 0,
    noiseLevelEstimate: 0, cdEffective: Cd,
    numStages, stages,
    calcSteps: steps, solverInfo, flags, warnings, recommendations,
  };
}

function gasCriticalPressureRatio(k: number): number {
  return Math.pow(2 / (k + 1), k / (k - 1));
}

function gasCriticalFlowFunction(k: number): number {
  return Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)));
}

function gasExpansionFactorExact(pressureRatio: number, k: number): number {
  const r = pressureRatio;
  if (r <= 0 || r >= 1) return 1;
  const num = (k / (k - 1)) * (Math.pow(r, 2 / k) - Math.pow(r, (k + 1) / k));
  const den = (1 - r);
  if (den <= 0) return 1;
  return Math.sqrt(num / den);
}

function gasExpansionFactorISA(beta: number, pressureRatio: number, k: number): number {
  const r = pressureRatio;
  return 1 - (0.41 + 0.35 * Math.pow(beta, 4)) * (1 - r) / k;
}

function gasMassFlowForDiameter(
  d_mm: number, D_mm: number, P1_Pa: number, T_K: number,
  MW: number, k: number, Z: number, Cd: number,
  pressureRatio: number, isChoked: boolean, basisMode: BasisMode,
): number {
  const d_m = d_mm / 1000;
  const D_m = D_mm / 1000;
  const A = (PI / 4) * d_m * d_m;
  const beta = d_m / D_m;
  const betaCorr = basisMode === "inPipe" ? Math.sqrt(1 - Math.pow(beta, 4)) : 1;
  const rho1 = (P1_Pa * MW) / (Z * R_UNIVERSAL * T_K);

  if (isChoked) {
    const fk = gasCriticalFlowFunction(k);
    const W = Cd * A * P1_Pa * fk * Math.sqrt(MW / (Z * R_UNIVERSAL * T_K)) / betaCorr;
    return W * 3600;
  } else {
    const Y = gasExpansionFactorISA(beta, pressureRatio, k);
    const dP_Pa = P1_Pa * (1 - pressureRatio);
    const W = Cd * A * Y * Math.sqrt(2 * rho1 * dP_Pa) / betaCorr;
    return W * 3600;
  }
}

function gasDPForDiameter(
  d_mm: number, D_mm: number, P1_Pa: number, T_K: number,
  MW: number, k: number, Z: number, Cd: number,
  W_kgh: number, basisMode: BasisMode, maxIter: number, tol: number,
): { dP_Pa: number; isChoked: boolean; solverInfo: SolverInfo } {
  const xCrit = gasCriticalPressureRatio(k);
  const W_choked = gasMassFlowForDiameter(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, xCrit, true, basisMode);
  if (W_kgh >= W_choked) {
    return {
      dP_Pa: P1_Pa * (1 - xCrit),
      isChoked: true,
      solverInfo: { method: "Choked (direct)", iterations: 0, finalError: 0, tolerance: tol, converged: true, bracketLow: 0, bracketHigh: 0 },
    };
  }
  const fn = (r: number) => gasMassFlowForDiameter(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, r, false, basisMode) - W_kgh;
  const sol = bisectionSolve(fn, xCrit + 0.001, 0.9999, tol, maxIter);
  return {
    dP_Pa: P1_Pa * (1 - sol.root),
    isChoked: false,
    solverInfo: { method: "Bisection (r-space)", iterations: sol.iterations, finalError: sol.error, tolerance: tol, converged: sol.converged, bracketLow: sol.bracketLow, bracketHigh: sol.bracketHigh },
  };
}

export function calculateROGas(input: ROServiceInput, project: ROProject): ROResult {
  const steps: CalcStep[] = [];
  const flags: ROFlag[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const P1_bar = input.upstreamPressure;
  const P2_bar = input.downstreamPressure;
  const P1_Pa = P1_bar * 1e5;
  const T_C = input.temperature;
  const T_K = T_C + 273.15;
  const k = input.gasProps.specificHeatRatio;
  const Z = input.gasProps.compressibilityFactor;
  const MW = input.gasProps.molecularWeight;
  let Cd = input.orifice.cdValue;
  const D_mm = input.pipeDiameter;
  const D_m = D_mm / 1000;
  const basisMode = input.orifice.basisMode;
  const mu_cP = input.gasProps.viscosity;

  if (input.sizingMode !== "predictDP") {
    if (P2_bar >= P1_bar) throw new Error("Upstream pressure (P₁) must exceed downstream pressure (P₂)");
  }
  if (k <= 1) throw new Error("Specific heat ratio k must be > 1");
  if (MW <= 0) throw new Error("Molecular weight must be positive");
  if (Z <= 0) throw new Error("Compressibility factor Z must be positive");
  if (Cd <= 0 || Cd > 1) throw new Error("Discharge coefficient must be between 0 and 1");
  if (D_mm <= 0) throw new Error("Pipe diameter must be positive");

  let W_kgh = input.massFlowRate;
  if (W_kgh <= 0 && input.sizingMode === "sizeForFlow") throw new Error("Mass flow rate must be positive");
  if (W_kgh <= 0 && input.sizingMode === "predictDP") throw new Error("Mass flow rate must be positive for ΔP prediction");

  const R_specific = R_UNIVERSAL / MW;
  const rho1 = (P1_Pa * MW) / (Z * R_UNIVERSAL * T_K);
  const xCrit = gasCriticalPressureRatio(k);
  const fk = gasCriticalFlowFunction(k);

  steps.push({ label: "Upstream pressure P₁", equation: "", value: P1_bar.toFixed(3), unit: "bar(a)", eqId: "RO-G-01" });
  steps.push({ label: "Downstream pressure P₂", equation: "", value: P2_bar.toFixed(3), unit: "bar(a)", eqId: "RO-G-02" });
  steps.push({ label: "Temperature", equation: "T = T_C + 273.15", value: `${T_C.toFixed(1)} °C = ${T_K.toFixed(2)} K`, unit: "", eqId: "RO-G-03" });
  steps.push({ label: "Molecular weight MW", equation: "", value: MW.toFixed(2), unit: "kg/kmol", eqId: "RO-G-04" });
  steps.push({ label: "Specific heat ratio k", equation: "", value: k.toFixed(4), unit: "—", eqId: "RO-G-05" });
  steps.push({ label: "Compressibility Z", equation: "", value: Z.toFixed(4), unit: "—", eqId: "RO-G-06" });
  steps.push({ label: "R_specific", equation: "R_s = R_u / MW", value: R_specific.toFixed(3), unit: "J/(kg·K)", eqId: "RO-G-07" });
  steps.push({ label: "Upstream density ρ₁", equation: "ρ₁ = P₁·MW / (Z·R_u·T)", value: rho1.toFixed(4), unit: "kg/m³", eqId: "RO-G-08" });
  steps.push({ label: "Critical pressure ratio r_crit", equation: "r_crit = (2/(k+1))^(k/(k-1))", value: xCrit.toFixed(6), unit: "—", eqId: "RO-G-09" });
  steps.push({ label: "Critical flow function f(k)", equation: "f(k) = √(k·(2/(k+1))^((k+1)/(k-1)))", value: fk.toFixed(6), unit: "—", eqId: "RO-G-10" });

  if (input.orifice.cdMode === "estimated") {
    flags.push("CD_ESTIMATED");
    warnings.push("Cd is estimated — results carry higher uncertainty");
  }

  let d_mm: number;
  let solverInfo: SolverInfo | null = null;
  let actualDP_bar: number;
  let isChoked: boolean;
  let pressureRatio: number;

  if (input.sizingMode === "sizeForFlow") {
    const P2_Pa = P2_bar * 1e5;
    pressureRatio = P2_Pa / P1_Pa;
    isChoked = pressureRatio <= xCrit;
    actualDP_bar = P1_bar - P2_bar;

    const fn = (d: number) =>
      gasMassFlowForDiameter(d, D_mm, P1_Pa, T_K, MW, k, Z, Cd, pressureRatio, isChoked, basisMode) - W_kgh;
    const dMax = D_mm * 0.95;
    const dMin = 0.5;
    const solResult = bisectionSolve(fn, dMin, dMax, project.tolerance, project.maxIterations);
    d_mm = solResult.root;
    solverInfo = {
      method: "Bisection", iterations: solResult.iterations, finalError: solResult.error,
      tolerance: project.tolerance, converged: solResult.converged,
      bracketLow: solResult.bracketLow, bracketHigh: solResult.bracketHigh,
    };
    if (!solResult.converged) {
      flags.push("SOLVER_ISSUE");
      warnings.push(`Solver did not converge after ${solResult.iterations} iterations`);
    }
    steps.push({ label: "Pressure ratio r", equation: "r = P₂/P₁", value: pressureRatio.toFixed(6), unit: "—", eqId: "RO-G-11" });
    steps.push({ label: "Flow regime", equation: isChoked ? "r ≤ r_crit → CHOKED" : "r > r_crit → Subcritical", value: isChoked ? "CHOKED (SONIC)" : "SUBCRITICAL", unit: "", eqId: "RO-G-12" });
    steps.push({ label: "Solver target", equation: "Find d : W(d) = W_target", value: W_kgh.toFixed(2), unit: "kg/h", eqId: "RO-G-13" });
  } else if (input.sizingMode === "checkOrifice") {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in check mode");
    const P2_Pa = P2_bar * 1e5;
    pressureRatio = P2_Pa / P1_Pa;
    isChoked = pressureRatio <= xCrit;
    actualDP_bar = P1_bar - P2_bar;
    W_kgh = gasMassFlowForDiameter(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, pressureRatio, isChoked, basisMode);
    steps.push({ label: "Pressure ratio r", equation: "r = P₂/P₁", value: pressureRatio.toFixed(6), unit: "—", eqId: "RO-G-11" });
    steps.push({ label: "Flow regime", equation: isChoked ? "r ≤ r_crit → CHOKED" : "r > r_crit → Subcritical", value: isChoked ? "CHOKED (SONIC)" : "SUBCRITICAL", unit: "", eqId: "RO-G-12" });
    steps.push({ label: "Check mode", equation: "Given d, P₁, P₂ → compute W", value: W_kgh.toFixed(2), unit: "kg/h", eqId: "RO-G-14" });
  } else {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in ΔP prediction mode");
    const dpResult = gasDPForDiameter(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, W_kgh, basisMode, project.maxIterations, project.tolerance);
    actualDP_bar = dpResult.dP_Pa / 1e5;
    isChoked = dpResult.isChoked;
    pressureRatio = 1 - actualDP_bar / P1_bar;
    solverInfo = dpResult.solverInfo;
    steps.push({ label: "Predicted ΔP", equation: "Solve for r : W(d,r) = W_target", value: actualDP_bar.toFixed(4), unit: "bar", eqId: "RO-G-15" });
    steps.push({ label: "Predicted P₂", equation: "P₂ = P₁ - ΔP", value: (P1_bar - actualDP_bar).toFixed(4), unit: "bar(a)", eqId: "RO-G-16" });
    steps.push({ label: "Flow regime", equation: isChoked ? "CHOKED — max flow reached" : "Subcritical", value: isChoked ? "CHOKED" : "SUBCRITICAL", unit: "", eqId: "RO-G-12" });
  }

  if (isChoked) {
    flags.push("CHOKED_FLOW");
    flags.push("HIGH_NOISE_RISK");
    warnings.push("Flow is CHOKED (critical) — downstream pressure does not affect flow rate");
    warnings.push("Sonic flow at orifice — high noise and vibration expected");
    recommendations.push("Consider multi-stage restriction with intermediate pipe sections");
    recommendations.push("Evaluate noise levels per IEC 60534-8-3 or vendor acoustic analysis");
    recommendations.push("Consider thicker orifice plate and downstream piping reinforcement");
  } else if (pressureRatio < xCrit * 1.1) {
    flags.push("NEAR_CHOKED");
    warnings.push("Pressure ratio close to critical — small changes may cause choking");
  }

  const dpFraction = actualDP_bar > 0 && P1_bar > 0 ? actualDP_bar / P1_bar : 0;
  if (dpFraction > 0.5 && !flags.includes("HIGH_DP_FRACTION")) {
    flags.push("HIGH_DP_FRACTION");
    warnings.push(`ΔP/P₁ = ${(dpFraction * 100).toFixed(1)}% — very high pressure drop fraction`);
  }

  const d_m = d_mm / 1000;
  const A_m2 = (PI / 4) * d_m * d_m;
  const A_mm2 = A_m2 * 1e6;
  const beta = d_m / D_m;
  const Y_actual = isChoked ? 0 : gasExpansionFactorISA(beta, pressureRatio, k);
  const Y_exact = isChoked ? 0 : gasExpansionFactorExact(pressureRatio, k);
  const pipeArea_m2 = (PI / 4) * D_m * D_m;
  const W_kgs = W_kgh / 3600;
  const orificeVelocity = A_m2 > 0 && rho1 > 0 ? W_kgs / (rho1 * A_m2) : 0;
  const pipeVelocity = pipeArea_m2 > 0 && rho1 > 0 ? W_kgs / (rho1 * pipeArea_m2) : 0;
  const betaCorr = basisMode === "inPipe" ? (1 - Math.pow(beta, 4)) : 1;
  const flowCoefficient = Cd / Math.sqrt(betaCorr > 0 ? betaCorr : 1);

  const sonicVelocity = Math.sqrt(k * Z * R_specific * T_K);
  const machNumber = orificeVelocity / sonicVelocity;

  const permLossFraction = permanentPressureLossFraction(beta);
  const permanentPressureLoss = actualDP_bar * permLossFraction;
  const recoveryFactor = 1 - permLossFraction;

  steps.push({ label: "Orifice diameter d", equation: input.sizingMode === "sizeForFlow" ? "d (solved)" : "d (given)", value: d_mm.toFixed(3), unit: "mm", eqId: "RO-G-17" });
  steps.push({ label: "Orifice area A", equation: "A = π·d²/4", value: A_mm2.toFixed(2), unit: "mm²", eqId: "RO-G-18" });
  steps.push({ label: "Beta ratio β", equation: "β = d/D", value: beta.toFixed(4), unit: "—", eqId: "RO-G-19" });
  if (!isChoked) {
    steps.push({ label: "Y (ISA approx.)", equation: "Y = 1 - (0.41+0.35β⁴)·(1-r)/k", value: Y_actual.toFixed(6), unit: "—", eqId: "RO-G-20a" });
    steps.push({ label: "Y (exact isentropic)", equation: "Y = √[(k/(k-1))·(r^(2/k) - r^((k+1)/k))/(1-r)]", value: Y_exact.toFixed(6), unit: "—", eqId: "RO-G-20b" });
  }
  steps.push({ label: "Permanent ΔP fraction", equation: "α = √(1-β⁴) - β²", value: permLossFraction.toFixed(4), unit: "—", eqId: "RO-G-21" });
  steps.push({ label: "Permanent pressure loss", equation: "ΔP_perm = ΔP × α", value: permanentPressureLoss.toFixed(4), unit: "bar", eqId: "RO-G-22" });
  steps.push({ label: "Orifice velocity v_o", equation: "v_o = W / (ρ₁·A)", value: orificeVelocity.toFixed(2), unit: "m/s", eqId: "RO-G-23" });
  steps.push({ label: "Pipe velocity v_p", equation: "v_p = W / (ρ₁·A_pipe)", value: pipeVelocity.toFixed(2), unit: "m/s", eqId: "RO-G-24" });
  steps.push({ label: "Speed of sound c", equation: "c = √(k·Z·R_s·T)", value: sonicVelocity.toFixed(2), unit: "m/s", eqId: "RO-G-25" });
  steps.push({ label: "Mach number at orifice", equation: "Ma = v_o / c", value: machNumber.toFixed(4), unit: "—", eqId: "RO-G-26" });

  let Re = 0;
  let Re_pipe = 0;
  if (mu_cP > 0 && d_m > 0) {
    const mu_Pas = mu_cP * 1e-3;
    Re = rho1 * orificeVelocity * d_m / mu_Pas;
    Re_pipe = rho1 * pipeVelocity * D_m / mu_Pas;
    steps.push({ label: "Reynolds (orifice)", equation: "Re_d = ρ₁·v_o·d / μ", value: Re.toFixed(0), unit: "—", eqId: "RO-G-27" });
    steps.push({ label: "Reynolds (pipe)", equation: "Re_D = ρ₁·v_p·D / μ", value: Re_pipe.toFixed(0), unit: "—", eqId: "RO-G-28" });
  }

  if (input.orifice.cdMode === "estimated" && Re > 0) {
    const Cd_est = estimateCdFromReynolds(Re, beta, input.orifice.edgeType);
    steps.push({ label: "Estimated Cd (RHG)", equation: "Cd = f(Re_d, β)", value: Cd_est.toFixed(4), unit: "—", eqId: "RO-G-29" });
    Cd = Cd_est;
  }

  const noiseSPL = estimateNoiseLevel(W_kgs, P1_Pa, P1_Pa - actualDP_bar * 1e5, D_mm, d_mm, rho1);
  if (noiseSPL > 0) {
    steps.push({ label: "Noise estimate SPL", equation: "Simplified acoustic power model", value: noiseSPL.toFixed(1), unit: "dB(A)", eqId: "RO-G-30" });
  }

  if (machNumber > 1.0) {
    flags.push("HIGH_MACH");
    warnings.push(`Mach ${machNumber.toFixed(2)} > 1.0 at orifice — flow is sonic/supersonic`);
  } else if (machNumber > 0.8) {
    flags.push("HIGH_MACH");
    warnings.push(`Mach ${machNumber.toFixed(2)} > 0.8 at orifice — approaching sonic conditions`);
  }

  const stdBore = roundToStandardBore(d_mm);
  const stdBoreArea = (PI / 4) * Math.pow(stdBore / 1000, 2) * 1e6;
  const stdBoreBeta = (stdBore / 1000) / D_m;
  steps.push({ label: "Standard bore (rounded up)", equation: "", value: stdBore.toFixed(2), unit: "mm", eqId: "RO-G-31" });
  steps.push({ label: "Standard bore β", equation: "β_std = d_std / D", value: stdBoreBeta.toFixed(4), unit: "—", eqId: "RO-G-32" });

  if (beta < input.betaMin || beta > input.betaMax) {
    flags.push("BETA_OUT_OF_RANGE");
    warnings.push(`β = ${beta.toFixed(4)} outside recommended range [${input.betaMin}–${input.betaMax}]`);
    if (beta > input.betaMax) recommendations.push("Consider using a larger pipe size to reduce β");
    if (beta < input.betaMin) recommendations.push("Very small orifice — verify manufacturability");
  }

  if (orificeVelocity > 200) {
    flags.push("HIGH_ORIFICE_VELOCITY");
    warnings.push(`Orifice velocity ${orificeVelocity.toFixed(0)} m/s — high erosion risk`);
  }

  const numStages = input.numStages > 1 ? input.numStages : 1;
  const stages: StageResult[] = [];
  if (numStages > 1 && input.sizingMode === "sizeForFlow") {
    const totalDP = actualDP_bar;
    const stageDP = totalDP / numStages;
    for (let s = 0; s < numStages; s++) {
      const sP1_bar = P1_bar - s * stageDP;
      const sP2_bar = sP1_bar - stageDP;
      const sP1_Pa = sP1_bar * 1e5;
      const sP2_Pa = sP2_bar * 1e5;
      const sPressureRatio = sP2_Pa / sP1_Pa;
      const sIsChoked = sPressureRatio <= xCrit;
      const fn = (d: number) =>
        gasMassFlowForDiameter(d, D_mm, sP1_Pa, T_K, MW, k, Z, Cd, sPressureRatio, sIsChoked, basisMode) - W_kgh;
      const sol = bisectionSolve(fn, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
      const sBeta = (sol.root / 1000) / D_m;
      const sRho = (sP1_Pa * MW) / (Z * R_UNIVERSAL * T_K);
      const sArea = (PI / 4) * Math.pow(sol.root / 1000, 2);
      const sVel = sRho > 0 ? W_kgs / (sRho * sArea) : 0;
      stages.push({
        stageNumber: s + 1, upstreamPressure: sP1_bar, downstreamPressure: sP2_bar,
        pressureDrop: stageDP, orificeDiameter: sol.root, betaRatio: sBeta, orificeVelocity: sVel,
      });
    }
  }

  if (dpFraction > 0.4 && numStages <= 1) {
    flags.push("MULTI_STAGE_RECOMMENDED");
    const suggestedStages = Math.ceil(dpFraction / 0.3);
    recommendations.push(`Consider ${suggestedStages}-stage restriction (ΔP/P₁ = ${(dpFraction * 100).toFixed(0)}% exceeds 40%)`);
  }

  return {
    phase: "gas", sizingMode: input.sizingMode,
    requiredDiameter: d_mm, orificeArea: A_mm2, betaRatio: beta,
    pressureDrop: actualDP_bar, permanentPressureLoss, recoveryFactor,
    orificeVelocity, pipeVelocity, flowCoefficient,
    massFlow: W_kgh, volFlow: rho1 > 0 ? W_kgh / rho1 : 0,
    standardBore: stdBore, standardBoreArea: stdBoreArea, standardBoreBeta: stdBoreBeta,
    pressureRatio, criticalPressureRatio: xCrit, isChoked,
    expansionFactor: Y_actual, criticalFlowFunction: fk,
    upstreamDensity: rho1, rSpecific: R_specific,
    reynoldsNumber: Re, reynoldsNumberPipe: Re_pipe, machNumber,
    sigma: 0, noiseLevelEstimate: noiseSPL, cdEffective: Cd,
    numStages, stages,
    calcSteps: steps, solverInfo, flags, warnings, recommendations,
  };
}

export function calculateRO(input: ROServiceInput, project: ROProject): ROResult {
  if (input.phase === "liquid") return calculateROLiquid(input, project);
  return calculateROGas(input, project);
}

export interface ROLiquidInput {
  flowRate: number; liquidDensity: number; upstreamPressure: number;
  downstreamPressure: number; orificeDiameter: number; pipeDiameter: number;
  dischargeCoefficient: number;
}

export interface ROLiquidResult {
  requiredOrificeDiameter: number; orificeArea: number; betaRatio: number;
  velocity: number; pipeVelocity: number; pressureDrop: number;
  flowCoefficient: number; warnings: string[];
}

export interface ROGasInput {
  massFlowRate: number; molecularWeight: number; upstreamPressure: number;
  downstreamPressure: number; upstreamTemperature: number; orificeDiameter: number;
  pipeDiameter: number; specificHeatRatio: number; compressibilityFactor: number;
  dischargeCoefficient: number;
}

export interface ROGasResult {
  requiredOrificeDiameter: number; orificeArea: number; betaRatio: number;
  pressureRatio: number; criticalPressureRatio: number; isChoked: boolean;
  velocity: number; warnings: string[];
}

export function calculateROLiquidLegacy(input: ROLiquidInput): ROLiquidResult {
  const service: ROServiceInput = {
    ...DEFAULT_SERVICE,
    phase: "liquid", sizingMode: input.orificeDiameter > 0 ? "checkOrifice" : "sizeForFlow",
    volFlowRate: input.flowRate, flowBasis: "volume",
    upstreamPressure: input.upstreamPressure, downstreamPressure: input.downstreamPressure,
    pipeDiameter: input.pipeDiameter, orificeDiameter: input.orificeDiameter,
    liquidProps: { density: input.liquidDensity, viscosity: 1, vaporPressure: 0 },
    orifice: { ...DEFAULT_SERVICE.orifice, cdValue: input.dischargeCoefficient },
  };
  const r = calculateROLiquid(service, DEFAULT_PROJECT);
  return {
    requiredOrificeDiameter: r.requiredDiameter, orificeArea: r.orificeArea,
    betaRatio: r.betaRatio, velocity: r.orificeVelocity, pipeVelocity: r.pipeVelocity,
    pressureDrop: r.pressureDrop, flowCoefficient: r.flowCoefficient, warnings: r.warnings,
  };
}

export function calculateROGasLegacy(input: ROGasInput): ROGasResult {
  const service: ROServiceInput = {
    ...DEFAULT_SERVICE,
    phase: "gas", sizingMode: input.orificeDiameter > 0 ? "checkOrifice" : "sizeForFlow",
    massFlowRate: input.massFlowRate, flowBasis: "mass",
    upstreamPressure: input.upstreamPressure, downstreamPressure: input.downstreamPressure,
    temperature: input.upstreamTemperature,
    pipeDiameter: input.pipeDiameter, orificeDiameter: input.orificeDiameter,
    gasProps: { molecularWeight: input.molecularWeight, specificHeatRatio: input.specificHeatRatio, compressibilityFactor: input.compressibilityFactor, viscosity: 0.012 },
    orifice: { ...DEFAULT_SERVICE.orifice, cdValue: input.dischargeCoefficient },
  };
  const r = calculateROGas(service, DEFAULT_PROJECT);
  return {
    requiredOrificeDiameter: r.requiredDiameter, orificeArea: r.orificeArea,
    betaRatio: r.betaRatio, pressureRatio: r.pressureRatio,
    criticalPressureRatio: r.criticalPressureRatio, isChoked: r.isChoked,
    velocity: r.orificeVelocity, warnings: r.warnings,
  };
}

export const RO_LIQUID_TEST_CASE: ROLiquidInput = {
  flowRate: 50, liquidDensity: 998.2, upstreamPressure: 10,
  downstreamPressure: 5, orificeDiameter: 0, pipeDiameter: 154.08,
  dischargeCoefficient: 0.61,
};

export const RO_GAS_TEST_CASE: ROGasInput = {
  massFlowRate: 5000, molecularWeight: 18.5, upstreamPressure: 30,
  downstreamPressure: 10, upstreamTemperature: 40, orificeDiameter: 0,
  pipeDiameter: 154.08, specificHeatRatio: 1.27, compressibilityFactor: 0.92,
  dischargeCoefficient: 0.61,
};

export const RO_LIQUID_SERVICE_TEST: ROServiceInput = {
  ...DEFAULT_SERVICE,
  phase: "liquid", sizingMode: "sizeForFlow",
  volFlowRate: 50, flowBasis: "volume",
  upstreamPressure: 10, downstreamPressure: 5,
  liquidProps: { density: 998.2, viscosity: 1.0, vaporPressure: 2.34 },
};

export const RO_GAS_SERVICE_TEST: ROServiceInput = {
  ...DEFAULT_SERVICE,
  phase: "gas", sizingMode: "sizeForFlow",
  massFlowRate: 5000, flowBasis: "mass",
  upstreamPressure: 30, downstreamPressure: 10, temperature: 40,
  gasProps: { molecularWeight: 18.5, specificHeatRatio: 1.27, compressibilityFactor: 0.92, viscosity: 0.012 },
};

export const FLAG_LABELS: Record<ROFlag, string> = {
  CHOKED_FLOW: "CHOKED FLOW (GAS)",
  HIGH_NOISE_RISK: "HIGH NOISE RISK",
  FLASHING_LIKELY: "FLASHING LIKELY (LIQUID)",
  CAVITATION_RISK: "CAVITATION RISK",
  TWO_PHASE_SUSPECTED: "TWO-PHASE SUSPECTED",
  BETA_OUT_OF_RANGE: "β OUT OF RANGE",
  CD_ESTIMATED: "Cd ESTIMATED",
  HIGH_DP_FRACTION: "HIGH ΔP FRACTION",
  SOLVER_ISSUE: "SOLVER ISSUE",
  NEAR_CHOKED: "NEAR CHOKED",
  HIGH_MACH: "HIGH MACH NUMBER",
  HIGH_ORIFICE_VELOCITY: "HIGH ORIFICE VELOCITY",
  MULTI_STAGE_RECOMMENDED: "MULTI-STAGE RECOMMENDED",
};

export const FLAG_SEVERITY: Record<ROFlag, "critical" | "warning" | "info"> = {
  CHOKED_FLOW: "critical",
  HIGH_NOISE_RISK: "critical",
  FLASHING_LIKELY: "critical",
  CAVITATION_RISK: "warning",
  TWO_PHASE_SUSPECTED: "critical",
  BETA_OUT_OF_RANGE: "warning",
  CD_ESTIMATED: "info",
  HIGH_DP_FRACTION: "warning",
  SOLVER_ISSUE: "critical",
  NEAR_CHOKED: "info",
  HIGH_MACH: "warning",
  HIGH_ORIFICE_VELOCITY: "warning",
  MULTI_STAGE_RECOMMENDED: "info",
};
