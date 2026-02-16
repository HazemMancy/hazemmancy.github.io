import { PI, GAS_CONSTANT } from "./constants";

export const R_UNIVERSAL = GAS_CONSTANT; // 8314.46 J/(kmol·K)

export type Phase = "liquid" | "gas";
export type SizingMode = "sizeForFlow" | "predictDP";
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
  density: number;       // kg/m³
  viscosity: number;     // cP (optional for Re)
  vaporPressure: number; // bar(a), 0 = not provided
}

export interface FluidPropsGas {
  molecularWeight: number; // kg/kmol
  specificHeatRatio: number; // k = Cp/Cv
  compressibilityFactor: number; // Z
  viscosity: number; // cP (optional for Re)
}

export interface OrificeOptions {
  cdMode: CdMode;
  cdValue: number;
  edgeType: EdgeType;
  basisMode: BasisMode;
  thickness: number; // mm (informational)
}

export interface ROServiceInput {
  phase: Phase;
  sizingMode: SizingMode;
  massFlowRate: number;   // kg/h
  volFlowRate: number;    // m³/h (liquid only, primary)
  flowBasis: "mass" | "volume"; // which is primary
  upstreamPressure: number;   // bar(a)
  downstreamPressure: number; // bar(a)
  temperature: number;        // °C
  pipeDiameter: number;       // mm (ID)
  orificeDiameter: number;    // mm (for predictDP mode)
  liquidProps: FluidPropsLiquid;
  gasProps: FluidPropsGas;
  orifice: OrificeOptions;
  betaMin: number; // default 0.2
  betaMax: number; // default 0.75
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
  betaMin: 0.20, betaMax: 0.75,
};

export interface CalcStep {
  label: string;
  equation: string;
  value: string;
  unit: string;
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
  | "NEAR_CHOKED";

export interface ROResult {
  phase: Phase;
  sizingMode: SizingMode;
  requiredDiameter: number;  // mm
  orificeArea: number;       // mm²
  betaRatio: number;
  pressureDrop: number;      // bar
  orificeVelocity: number;   // m/s
  pipeVelocity: number;      // m/s
  flowCoefficient: number;   // Cd / sqrt(1-β⁴)
  massFlow: number;          // kg/h
  volFlow: number;           // m³/h (liquid) or actual m³/h (gas)
  // Gas-specific
  pressureRatio: number;     // P2/P1
  criticalPressureRatio: number; // x_crit
  isChoked: boolean;
  expansionFactor: number;   // Y (subcritical)
  criticalFlowFunction: number; // f(k) for choked
  upstreamDensity: number;   // kg/m³
  rSpecific: number;         // J/(kg·K)
  // Liquid-specific
  reynoldsNumber: number;
  sigma: number;             // cavitation index
  // Traces
  calcSteps: CalcStep[];
  solverInfo: SolverInfo | null;
  flags: ROFlag[];
  warnings: string[];
  recommendations: string[];
}

// ─── SOLVER ────────────────────────────────────────────────────────────────────

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
    const steps = 20;
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

// ─── LIQUID SIZING ─────────────────────────────────────────────────────────────

function liquidMassFlowForDiameter(
  d_mm: number, D_mm: number, rho: number, dP_Pa: number, Cd: number, basisMode: BasisMode,
): number {
  const d_m = d_mm / 1000;
  const D_m = D_mm / 1000;
  const A = (PI / 4) * d_m * d_m;
  const beta = d_m / D_m;
  const betaCorr = basisMode === "inPipe" ? (1 - Math.pow(beta, 4)) : 1;
  if (betaCorr <= 0 || dP_Pa <= 0) return 0;
  return Cd * A * Math.sqrt(2 * rho * dP_Pa / betaCorr) * 3600; // kg/h
}

export function calculateROLiquid(input: ROServiceInput, project: ROProject): ROResult {
  const steps: CalcStep[] = [];
  const flags: ROFlag[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const P1_Pa = input.upstreamPressure * 1e5;
  const P2_Pa = input.downstreamPressure * 1e5;
  const dP_Pa = P1_Pa - P2_Pa;
  const dP_bar = input.upstreamPressure - input.downstreamPressure;
  const rho = input.liquidProps.density;
  const mu_cP = input.liquidProps.viscosity;
  const Pv = input.liquidProps.vaporPressure;
  const Cd = input.orifice.cdValue;
  const D_mm = input.pipeDiameter;
  const D_m = D_mm / 1000;
  const basisMode = input.orifice.basisMode;

  if (P1_Pa <= P2_Pa) throw new Error("Upstream pressure (P1) must be greater than downstream pressure (P2)");
  if (rho <= 0) throw new Error("Liquid density must be positive");
  if (Cd <= 0 || Cd > 1) throw new Error("Discharge coefficient must be between 0 and 1");
  if (D_mm <= 0) throw new Error("Pipe diameter must be positive");

  let W_kgh: number;
  let Q_m3h: number;
  if (input.flowBasis === "volume") {
    Q_m3h = input.volFlowRate;
    W_kgh = Q_m3h * rho;
    if (Q_m3h <= 0) throw new Error("Volumetric flow rate must be positive");
  } else {
    W_kgh = input.massFlowRate;
    Q_m3h = W_kgh / rho;
    if (W_kgh <= 0) throw new Error("Mass flow rate must be positive");
  }

  steps.push({ label: "Pressure drop", equation: "ΔP = P1 - P2", value: dP_bar.toFixed(3), unit: "bar" });
  steps.push({ label: "ΔP (Pa)", equation: "ΔP = (P1 - P2) × 10⁵", value: dP_Pa.toFixed(0), unit: "Pa" });
  steps.push({ label: "Flow rate (mass)", equation: "W = Q × ρ", value: W_kgh.toFixed(2), unit: "kg/h" });
  steps.push({ label: "Flow rate (vol)", equation: "Q = W / ρ", value: Q_m3h.toFixed(4), unit: "m³/h" });

  if (input.orifice.cdMode === "estimated") {
    flags.push("CD_ESTIMATED");
    warnings.push("Cd is estimated — results have higher uncertainty");
  }

  // Cavitation / flashing checks
  if (Pv > 0) {
    const sigma = (input.upstreamPressure - Pv) / dP_bar;
    steps.push({ label: "Cavitation index σ", equation: "σ = (P1 - Pv) / ΔP", value: sigma.toFixed(4), unit: "—" });

    if (input.downstreamPressure <= Pv) {
      flags.push("FLASHING_LIKELY");
      warnings.push(`P2 (${input.downstreamPressure.toFixed(2)} bar) ≤ Pv (${Pv.toFixed(2)} bar) — flashing is likely, two-phase flow expected downstream`);
      recommendations.push("Consider staged pressure reduction, downstream pressure increase, or relocate restriction point");
    } else if (input.downstreamPressure < Pv * 1.3) {
      flags.push("CAVITATION_RISK");
      warnings.push(`P2 close to Pv — cavitation risk (P2=${input.downstreamPressure.toFixed(2)} bar, Pv=${Pv.toFixed(2)} bar)`);
      recommendations.push("Evaluate anti-cavitation trim alternatives or multi-stage pressure letdown");
    }

    if (Pv >= input.upstreamPressure) {
      flags.push("TWO_PHASE_SUSPECTED");
      warnings.push(`Vapor pressure Pv (${Pv.toFixed(2)} bar) ≥ P1 (${input.upstreamPressure.toFixed(2)} bar) — fluid may be boiling upstream`);
    }
  }

  const dpFraction = dP_bar / input.upstreamPressure;
  if (dpFraction > 0.5) {
    flags.push("HIGH_DP_FRACTION");
    warnings.push(`ΔP/P1 = ${(dpFraction * 100).toFixed(1)}% — very high pressure drop fraction`);
    recommendations.push("Consider multi-stage restriction to reduce cavitation and noise risk");
  }

  let d_mm: number;
  let solverInfo: SolverInfo | null = null;

  if (input.sizingMode === "sizeForFlow") {
    const fn = (d: number) => liquidMassFlowForDiameter(d, D_mm, rho, dP_Pa, Cd, basisMode) - W_kgh;
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
      warnings.push(`Solver did not fully converge after ${solResult.iterations} iterations (error: ${solResult.error.toExponential(2)})`);
    }
    steps.push({ label: "Solver target", equation: "Find d such that W(d) = W_target", value: W_kgh.toFixed(2), unit: "kg/h" });
  } else {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in ΔP prediction mode");
  }

  const d_m = d_mm / 1000;
  const A_m2 = (PI / 4) * d_m * d_m;
  const A_mm2 = A_m2 * 1e6;
  const beta = d_m / D_m;
  const betaCorr = basisMode === "inPipe" ? (1 - Math.pow(beta, 4)) : 1;
  const pipeArea_m2 = (PI / 4) * D_m * D_m;

  steps.push({ label: "Orifice diameter d", equation: "d (solved)", value: d_mm.toFixed(3), unit: "mm" });
  steps.push({ label: "Orifice area A", equation: "A = π d² / 4", value: A_mm2.toFixed(2), unit: "mm²" });
  steps.push({ label: "Beta ratio β", equation: "β = d / D", value: beta.toFixed(4), unit: "—" });
  steps.push({ label: "β⁴ correction", equation: `1 - β⁴ = ${betaCorr.toFixed(6)}`, value: betaCorr.toFixed(6), unit: "—" });

  let actualDP_bar = dP_bar;
  if (input.sizingMode === "predictDP") {
    const W_calc = liquidMassFlowForDiameter(d_mm, D_mm, rho, dP_Pa, Cd, basisMode);
    steps.push({ label: "Predicted mass flow", equation: "W = Cd·A·√(2ρΔP/(1-β⁴))", value: W_calc.toFixed(2), unit: "kg/h" });
    W_kgh = W_calc;
    Q_m3h = W_calc / rho;
  }

  const Q_m3s = Q_m3h / 3600;
  const orificeVelocity = Q_m3s / A_m2;
  const pipeVelocity = Q_m3s / pipeArea_m2;
  const flowCoefficient = Cd / Math.sqrt(betaCorr > 0 ? betaCorr : 1);

  steps.push({ label: "Orifice velocity", equation: "v_o = Q / A_orifice", value: orificeVelocity.toFixed(2), unit: "m/s" });
  steps.push({ label: "Pipe velocity", equation: "v_p = Q / A_pipe", value: pipeVelocity.toFixed(2), unit: "m/s" });
  steps.push({ label: "Flow coefficient K", equation: "K = Cd / √(1-β⁴)", value: flowCoefficient.toFixed(4), unit: "—" });

  let Re = 0;
  if (mu_cP > 0) {
    const mu_Pas = mu_cP * 1e-3;
    Re = rho * orificeVelocity * d_m / mu_Pas;
    steps.push({ label: "Reynolds number", equation: "Re = ρ·v·d / μ", value: Re.toFixed(0), unit: "—" });
  }

  // β range check
  if (beta < input.betaMin || beta > input.betaMax) {
    flags.push("BETA_OUT_OF_RANGE");
    warnings.push(`β = ${beta.toFixed(4)} outside recommended range [${input.betaMin}–${input.betaMax}]`);
    if (beta > input.betaMax) recommendations.push("Consider using a larger pipe size to achieve a lower β ratio");
    if (beta < input.betaMin) recommendations.push("Very small orifice — verify manufacturability and consider alternative restriction methods");
  }

  if (orificeVelocity > 50) {
    warnings.push(`Orifice velocity ${orificeVelocity.toFixed(1)} m/s is very high — erosion and cavitation risk`);
    recommendations.push("Consider multi-stage restriction to reduce jet velocity");
  }

  return {
    phase: "liquid", sizingMode: input.sizingMode,
    requiredDiameter: d_mm, orificeArea: A_mm2, betaRatio: beta,
    pressureDrop: actualDP_bar, orificeVelocity, pipeVelocity, flowCoefficient,
    massFlow: W_kgh, volFlow: Q_m3h,
    pressureRatio: 0, criticalPressureRatio: 0, isChoked: false,
    expansionFactor: 1, criticalFlowFunction: 0,
    upstreamDensity: rho, rSpecific: 0, reynoldsNumber: Re,
    sigma: Pv > 0 ? (input.upstreamPressure - Pv) / dP_bar : 0,
    calcSteps: steps, solverInfo, flags, warnings, recommendations,
  };
}

// ─── GAS SIZING ────────────────────────────────────────────────────────────────

function gasCriticalPressureRatio(k: number): number {
  return Math.pow(2 / (k + 1), k / (k - 1));
}

function gasCriticalFlowFunction(k: number): number {
  return Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)));
}

function gasExpansionFactor(beta: number, pressureRatio: number, k: number): number {
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
  const R_specific = R_UNIVERSAL / MW; // J/(kg·K)
  const rho1 = (P1_Pa * MW) / (Z * R_UNIVERSAL * T_K); // kg/m³

  if (isChoked) {
    const fk = gasCriticalFlowFunction(k);
    const W = Cd * A * P1_Pa * fk * Math.sqrt(MW / (Z * R_UNIVERSAL * T_K)) / betaCorr;
    return W * 3600; // kg/h
  } else {
    const Y = gasExpansionFactor(beta, pressureRatio, k);
    const dP_Pa = P1_Pa * (1 - pressureRatio);
    const W = Cd * A * Y * Math.sqrt(2 * rho1 * dP_Pa) / betaCorr;
    return W * 3600; // kg/h
  }
}

export function calculateROGas(input: ROServiceInput, project: ROProject): ROResult {
  const steps: CalcStep[] = [];
  const flags: ROFlag[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const P1_bar = input.upstreamPressure;
  const P2_bar = input.downstreamPressure;
  const P1_Pa = P1_bar * 1e5;
  const P2_Pa = P2_bar * 1e5;
  const T_C = input.temperature;
  const T_K = T_C + 273.15;
  const k = input.gasProps.specificHeatRatio;
  const Z = input.gasProps.compressibilityFactor;
  const MW = input.gasProps.molecularWeight;
  const Cd = input.orifice.cdValue;
  const D_mm = input.pipeDiameter;
  const D_m = D_mm / 1000;
  const basisMode = input.orifice.basisMode;

  if (P2_Pa >= P1_Pa) throw new Error("Upstream pressure (P1) must exceed downstream pressure (P2)");
  if (k <= 1) throw new Error("Specific heat ratio k must be > 1");
  if (MW <= 0) throw new Error("Molecular weight must be positive");
  if (Z <= 0) throw new Error("Compressibility factor Z must be positive");
  if (Cd <= 0 || Cd > 1) throw new Error("Discharge coefficient must be between 0 and 1");
  if (D_mm <= 0) throw new Error("Pipe diameter must be positive");

  let W_kgh = input.massFlowRate;
  if (W_kgh <= 0 && input.sizingMode === "sizeForFlow") throw new Error("Mass flow rate must be positive");

  const R_specific = R_UNIVERSAL / MW;
  const rho1 = (P1_Pa * MW) / (Z * R_UNIVERSAL * T_K);
  const pressureRatio = P2_Pa / P1_Pa;
  const xCrit = gasCriticalPressureRatio(k);
  const isChoked = pressureRatio <= xCrit;
  const fk = gasCriticalFlowFunction(k);

  steps.push({ label: "Upstream pressure P1", equation: "", value: P1_bar.toFixed(3), unit: "bar(a)" });
  steps.push({ label: "Downstream pressure P2", equation: "", value: P2_bar.toFixed(3), unit: "bar(a)" });
  steps.push({ label: "Temperature", equation: "T = T_C + 273.15", value: `${T_C.toFixed(1)} °C = ${T_K.toFixed(2)} K`, unit: "" });
  steps.push({ label: "R_specific", equation: "R_s = R_u / MW", value: R_specific.toFixed(3), unit: "J/(kg·K)" });
  steps.push({ label: "Upstream density ρ₁", equation: "ρ₁ = P1·MW / (Z·R_u·T)", value: rho1.toFixed(4), unit: "kg/m³" });
  steps.push({ label: "Pressure ratio x", equation: "x = P2 / P1", value: pressureRatio.toFixed(6), unit: "—" });
  steps.push({ label: "Critical pressure ratio x_crit", equation: "x_crit = (2/(k+1))^(k/(k-1))", value: xCrit.toFixed(6), unit: "—" });
  steps.push({ label: "Flow regime", equation: isChoked ? "x ≤ x_crit → CHOKED" : "x > x_crit → Subcritical", value: isChoked ? "CHOKED (SONIC)" : "SUBCRITICAL", unit: "" });

  if (isChoked) {
    flags.push("CHOKED_FLOW");
    flags.push("HIGH_NOISE_RISK");
    warnings.push("Flow is CHOKED (critical) — downstream pressure does not affect flow rate");
    warnings.push("Sonic flow at orifice — high noise and vibration expected");
    recommendations.push("Consider multi-stage restriction with intermediate pipe sections");
    recommendations.push("Evaluate noise levels per IEC 60534-8-3 or vendor acoustic analysis");
    recommendations.push("Consider thicker orifice plate and downstream piping reinforcement");
    steps.push({ label: "Critical flow function f(k)", equation: "f(k) = √(k·(2/(k+1))^((k+1)/(k-1)))", value: fk.toFixed(6), unit: "—" });
  } else {
    const beta_est = 0.5;
    const Y_est = gasExpansionFactor(beta_est, pressureRatio, k);
    steps.push({ label: "Expansion factor Y (est)", equation: "Y = 1 - (0.41+0.35β⁴)·(1-r)/k", value: Y_est.toFixed(6), unit: "—" });
    if (pressureRatio < xCrit * 1.1) {
      flags.push("NEAR_CHOKED");
      warnings.push("Pressure ratio is close to critical — small changes may cause choking");
    }
  }

  if (input.orifice.cdMode === "estimated") {
    flags.push("CD_ESTIMATED");
    warnings.push("Cd is estimated — results carry higher uncertainty");
  }

  const dpFraction = (P1_bar - P2_bar) / P1_bar;
  if (dpFraction > 0.5) {
    flags.push("HIGH_DP_FRACTION");
    warnings.push(`ΔP/P1 = ${(dpFraction * 100).toFixed(1)}% — very high pressure drop fraction`);
  }

  let d_mm: number;
  let solverInfo: SolverInfo | null = null;

  if (input.sizingMode === "sizeForFlow") {
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
    steps.push({ label: "Solver target", equation: "Find d such that W(d) = W_target", value: W_kgh.toFixed(2), unit: "kg/h" });
  } else {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in ΔP prediction mode");
    W_kgh = gasMassFlowForDiameter(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, pressureRatio, isChoked, basisMode);
  }

  const d_m = d_mm / 1000;
  const A_m2 = (PI / 4) * d_m * d_m;
  const A_mm2 = A_m2 * 1e6;
  const beta = d_m / D_m;
  const Y_actual = isChoked ? 0 : gasExpansionFactor(beta, pressureRatio, k);
  const pipeArea_m2 = (PI / 4) * D_m * D_m;
  const orificeVelocity = (W_kgh / 3600) / (rho1 * A_m2);
  const pipeVelocity = (W_kgh / 3600) / (rho1 * pipeArea_m2);
  const betaCorr = basisMode === "inPipe" ? (1 - Math.pow(beta, 4)) : 1;
  const flowCoefficient = Cd / Math.sqrt(betaCorr > 0 ? betaCorr : 1);
  const actualDP_bar = P1_bar - P2_bar;

  steps.push({ label: "Orifice diameter d", equation: input.sizingMode === "sizeForFlow" ? "d (solved)" : "d (given)", value: d_mm.toFixed(3), unit: "mm" });
  steps.push({ label: "Orifice area A", equation: "A = π d² / 4", value: A_mm2.toFixed(2), unit: "mm²" });
  steps.push({ label: "Beta ratio β", equation: "β = d / D", value: beta.toFixed(4), unit: "—" });
  if (!isChoked) {
    steps.push({ label: "Expansion factor Y (final)", equation: "Y = 1 - (0.41+0.35β⁴)·(1-r)/k", value: Y_actual.toFixed(6), unit: "—" });
  }
  steps.push({ label: "Orifice velocity", equation: "v_o = W / (ρ₁·A)", value: orificeVelocity.toFixed(2), unit: "m/s" });
  steps.push({ label: "Pipe velocity", equation: "v_p = W / (ρ₁·A_pipe)", value: pipeVelocity.toFixed(2), unit: "m/s" });

  if (beta < input.betaMin || beta > input.betaMax) {
    flags.push("BETA_OUT_OF_RANGE");
    warnings.push(`β = ${beta.toFixed(4)} outside recommended range [${input.betaMin}–${input.betaMax}]`);
    if (beta > input.betaMax) recommendations.push("Consider using a larger pipe size to reduce β");
    if (beta < input.betaMin) recommendations.push("Very small orifice — verify manufacturability");
  }

  return {
    phase: "gas", sizingMode: input.sizingMode,
    requiredDiameter: d_mm, orificeArea: A_mm2, betaRatio: beta,
    pressureDrop: actualDP_bar, orificeVelocity, pipeVelocity, flowCoefficient,
    massFlow: W_kgh, volFlow: W_kgh / (rho1 > 0 ? rho1 : 1),
    pressureRatio, criticalPressureRatio: xCrit, isChoked,
    expansionFactor: Y_actual, criticalFlowFunction: fk,
    upstreamDensity: rho1, rSpecific: R_specific,
    reynoldsNumber: 0, sigma: 0,
    calcSteps: steps, solverInfo, flags, warnings, recommendations,
  };
}

// ─── MAIN ENTRY ────────────────────────────────────────────────────────────────

export function calculateRO(input: ROServiceInput, project: ROProject): ROResult {
  if (input.phase === "liquid") return calculateROLiquid(input, project);
  return calculateROGas(input, project);
}

// ─── BACKWARD COMPATIBILITY ────────────────────────────────────────────────────

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
    phase: "liquid", sizingMode: input.orificeDiameter > 0 ? "predictDP" : "sizeForFlow",
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
    phase: "gas", sizingMode: input.orificeDiameter > 0 ? "predictDP" : "sizeForFlow",
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

// ─── TEST CASES ────────────────────────────────────────────────────────────────

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
};
