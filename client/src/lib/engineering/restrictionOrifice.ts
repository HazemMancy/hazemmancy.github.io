/**
 * Restriction Orifice Sizing Engine
 *
 * Standards:
 *   ISO 5167-2:2003 — Measurement of fluid flow, Orifice plates
 *   Crane Technical Paper 410 (TP-410) — Flow of Fluids
 *   API RP 14E — Design of Offshore Production Platform Piping Systems (erosional velocity)
 *   ISA-RP75.23 — Considerations for the application of control valve body styles (cavitation)
 *
 * Sizing Modes:
 *   sizeForFlow  — Given flow + ΔP, solve for orifice diameter d
 *   checkOrifice — Given d, P1, P2, compute actual flow
 *   predictDP    — Given d + flow, compute required ΔP
 *
 * Key Equations:
 *
 *   LIQUID (incompressible):
 *     W  = Cd · (π/4)·d² · √(2·ρ·ΔP / (1−β⁴))        [ISO 5167-2 Eq. 1]
 *     or equivalently: W = Cd · E · A · √(2·ρ·ΔP)       E = 1/√(1−β⁴)
 *
 *   GAS — subcritical:
 *     W  = Cd · E · A · Y · √(2·ρ₁·ΔP)                 [ISO 5167 / ISA approach]
 *     Y  = 1 − (0.351 + 0.256β⁴ + 0.93β⁸)·(1−(P2/P1)^(1/k))   [ISO 5167-2 expansion factor]
 *
 *   GAS — choked (critical):
 *     W  = Cd · E · A · P₁ · C(k) · √(MW / (Z·Ru·T₁))
 *     C(k) = √(k · (2/(k+1))^((k+1)/(k-1)))            [critical flow function]
 *     r_crit = (2/(k+1))^(k/(k-1))                      [critical pressure ratio]
 *
 *   DISCHARGE COEFFICIENT — ISO 5167-2:2003 Reader-Harris/Gallagher (corner taps, simplified):
 *     Cd = 0.5961 + 0.0261β² − 0.216β⁸
 *          + 0.000521·(10⁶·β/Re_D)^0.7
 *          + (0.0188 + 0.0063·(19000β/Re_D)^0.8)·β^3.5·(10⁶/Re_D)^0.3
 *          + 0.011·(0.75−β)·(2.8 − D/25.4)             [D-correction for D<71.12 mm]
 *     Valid: 0.1 ≤ β ≤ 0.75, Re_D ≥ 5000, D ≥ 50 mm
 *     For sharp-edged thin orifice in turbulent flow: Cd ≈ 0.61 (β~0.5)
 *
 *   PLATE THICKNESS CORRECTION (ISO 5167 / Lienhard 2005):
 *     Thin:  e/d < 0.5  → no correction (Cd sharp-edged)
 *     Thick: 0.5 ≤ e/d ≤ 2.5 → Cd_thick = Cd_thin × (1 + 0.023·(e/d − 0.5))
 *     Very thick: e/d > 2.5 → Cd ≈ 0.80 (long-tube approach)
 *
 *   PERMANENT PRESSURE LOSS (ISO 5167-2 Annex D):
 *     ΔP_perm / ΔP_total = (√(1−β⁴·Cd²) − Cd·β²) / (√(1−β⁴·Cd²) + Cd·β²)
 *
 *   CAVITATION (ISA-RP75.23 / Tullis 1993):
 *     σ = (P1 − Pv) / ΔP               (service cavitation index)
 *     σi ≈ 2.7  (incipient cavitation, sharp-edged orifice)
 *     σch ≈ 1.5 (constant/developed cavitation)
 *     σfl: when P2 ≤ Pv → flashing
 *
 *   EROSIONAL VELOCITY (API RP 14E, §2.4):
 *     Ve = C / √ρ [field]  →  Ve = 122 / √ρ [m/s, ρ in kg/m³]
 *     C = 100 (continuous service), 125 (intermittent)
 *
 *   UPSTREAM STRAIGHT-PIPE LENGTH (ISO 5167-2:2003 Table 3, β=0.4−0.6):
 *     Single 90° elbow:      ≥ 14D upstream, 5D downstream
 *     Gate valve (fully open):≥ 12D upstream, 5D downstream
 *     Two 90° elbows (2-plane):≥ 34D upstream, 5D downstream
 *     No upstream fitting:    ≥ 6D upstream, 4D downstream
 */

import { PI, GAS_CONSTANT } from "./constants";
import {
  type CompositionEntry, type SRKMixtureResult,
  computeSRKProperties, isenthalpicFlash,
} from "./srkEos";
import { computePRProperties, isenthalpicFlashPR } from "./prEos";

export const R_UNIVERSAL = GAS_CONSTANT;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Phase        = "liquid" | "gas";
export type SizingMode   = "sizeForFlow" | "checkOrifice" | "predictDP";
export type CdMode       = "user" | "estimated";
export type EdgeType     = "sharp" | "rounded";
export type BasisMode    = "inPipe" | "freeDischarge";
export type TappingType  = "corner" | "D-D2" | "flange";
export type GasPropsMode = "manual" | "srk" | "pr";

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
  tappingType: TappingType;
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
  gasPropsMode: GasPropsMode;
  composition: CompositionEntry[];
  orifice: OrificeOptions;
  betaMin: number;
  betaMax: number;
  numStages: number;
  stageDistribution: "equal_dp" | "geometric";
}

export const DEFAULT_SERVICE: ROServiceInput = {
  phase: "liquid",
  sizingMode: "sizeForFlow",
  massFlowRate: 0, volFlowRate: 0, flowBasis: "volume",
  upstreamPressure: 0, downstreamPressure: 0, temperature: 25,
  pipeDiameter: 154.08, orificeDiameter: 0,
  liquidProps: { density: 998.2, viscosity: 1.0, vaporPressure: 0 },
  gasProps: { molecularWeight: 18.5, specificHeatRatio: 1.27, compressibilityFactor: 0.92, viscosity: 0.012 },
  gasPropsMode: "manual",
  composition: [{ componentId: "CH4", moleFraction: 1.0 }],
  orifice: { cdMode: "user", cdValue: 0.61, edgeType: "sharp", basisMode: "inPipe", thickness: 6, tappingType: "corner" },
  betaMin: 0.20, betaMax: 0.75, numStages: 1, stageDistribution: "geometric",
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
  | "CAVITATION_INCIPIENT"
  | "CAVITATION_SEVERE"
  | "TWO_PHASE_SUSPECTED"
  | "BETA_OUT_OF_RANGE"
  | "CD_ESTIMATED"
  | "HIGH_DP_FRACTION"
  | "SOLVER_ISSUE"
  | "NEAR_CHOKED"
  | "HIGH_MACH"
  | "HIGH_ORIFICE_VELOCITY"
  | "EROSIONAL_VELOCITY_EXCEEDED"
  | "MULTI_STAGE_RECOMMENDED"
  | "THICK_ORIFICE"
  | "LOW_REYNOLDS";

export interface StageResult {
  stageNumber: number;
  upstreamPressure: number;
  downstreamPressure: number;
  pressureDrop: number;
  orificeDiameter: number;
  betaRatio: number;
  orificeVelocity: number;
  pressureRatioDP: number;
  isChoked: boolean;
}

export interface StraightPipeRec {
  fitting: string;
  upstreamLD: number;
  downstreamLD: number;
}

export interface ROResult {
  phase: Phase;
  sizingMode: SizingMode;
  requiredDiameter: number;
  orificeArea: number;
  betaRatio: number;
  pressureDrop: number;
  permanentPressureLoss: number;
  permanentPressureLossFraction: number;
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
  sigmaIncipient: number;
  noiseLevelEstimate: number;
  cdEffective: number;
  erosionalVelocity: number;
  erosionalVelocityRatio: number;
  numStages: number;
  stages: StageResult[];
  straightPipeRecs: StraightPipeRec[];
  calcSteps: CalcStep[];
  solverInfo: SolverInfo | null;
  flags: ROFlag[];
  warnings: string[];
  recommendations: string[];
  // SRK EoS outputs (gas phase, when gasPropsMode = "srk")
  srkResult: SRKMixtureResult | null;
  dischargeTemperature: number | null;
  dischargeTemperatureConverged: boolean;
}

// Re-export SRK types for UI consumption
export type { CompositionEntry, SRKMixtureResult };

// ─── Internal Types ───────────────────────────────────────────────────────────

interface BisectionResult {
  root: number;
  iterations: number;
  error: number;
  converged: boolean;
  bracketLow: number;
  bracketHigh: number;
}

// ─── Solver ───────────────────────────────────────────────────────────────────

function bisectionSolve(
  fn: (x: number) => number,
  lo: number, hi: number,
  tol: number, maxIter: number,
): BisectionResult {
  let fLo = fn(lo);
  let fHi = fn(hi);

  if (fLo * fHi > 0) {
    let bestX = lo; let bestF = Math.abs(fLo);
    const steps = 60;
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

  let mid = lo; let iter = 0;
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

// ─── ISO Standard Bore Sizes ──────────────────────────────────────────────────

/**
 * Round up to the nearest standard drill/bore size.
 * Uses common metric drill series (≤6mm = 0.1mm step, ≤13 = 0.5mm, ≤50 = 1mm, >50 = 2mm).
 */
export function roundToStandardBore(d_mm: number): number {
  if (d_mm <= 0) return 0;
  if (d_mm <= 6)   return Math.ceil(d_mm * 10) / 10;
  if (d_mm <= 13)  return Math.ceil(d_mm * 2) / 2;
  if (d_mm <= 50)  return Math.ceil(d_mm);
  return Math.ceil(d_mm / 2) * 2;
}

// ─── ISO 5167-2 Discharge Coefficient ────────────────────────────────────────

/**
 * Full ISO 5167-2:2003 Eq. 1 — Reader-Harris/Gallagher discharge coefficient.
 *
 * Implements ALL terms including tapping-type correction via L1 and L'2:
 *
 *   Cd = 0.5961 + 0.0261β² − 0.216β⁸
 *        + 0.000521·(10⁶β/Re_D)^0.7                          [Re term 1]
 *        + (0.0188 + 0.0063A)·β^3.5·(10⁶/Re_D)^0.3          [Re term 2]
 *        + (0.043 + 0.08·e^(−10L1) − 0.123·e^(−7L1))·(1−0.11A)·β⁴/(1−β⁴)  [upstream tap term]
 *        − 0.031·(M'2 − 0.8·M'2^1.1)·β^1.3                  [downstream tap term]
 *        + 0.011·(0.75−β)·(2.8 − D/25.4)                    [D-correction, D < 71.12 mm]
 *
 *   A  = (19000β/Re_D)^0.8
 *   M'2 = 2L'2/(1−β)
 *
 *   Tapping geometry:
 *     Corner taps:   L1 = L'2 = 0             → upstream and downstream tap terms = 0 (vanish analytically)
 *     D–D/2 taps:    L1 = 1,   L'2 = 0.47
 *     Flange taps:   L1 = L'2 = 25.4/D [mm]   (D in mm)
 *
 * Valid: 0.1 ≤ β ≤ 0.75, Re_D ≥ 5000, 50 mm ≤ D ≤ 1000 mm
 * For rounded-edge (ISA 1932 nozzle type): Cd ≈ 0.97 (Cd is flat vs Re).
 *
 * Ref: ISO 5167-2:2003 §8.3.2, Table 1; Reader & Harris (1995) Flow Meas. Instrum.
 *
 * @param beta        d/D ratio
 * @param Re_D        pipe Reynolds number
 * @param D_mm        pipe internal diameter [mm]
 * @param edgeType    "sharp" | "rounded"
 * @param tappingType "corner" | "D-D2" | "flange"
 */
function cdReaderHarrisGallagher(
  beta: number,
  Re_D: number,
  D_mm: number,
  edgeType: EdgeType,
  tappingType: TappingType = "corner",
): number {
  if (edgeType === "rounded") return 0.97;

  if (beta < 0.05 || beta > 0.95) return 0.61;
  if (Re_D < 100) return 0.50;

  const b2  = beta * beta;
  const b4  = b2 * b2;
  const b8  = b4 * b4;
  const b35 = Math.pow(beta, 3.5);
  const b13 = Math.pow(beta, 1.3);

  // ── Base (infinite Re) ─────────────────────────────────────────────────────
  const Cd_inf = 0.5961 + 0.0261 * b2 - 0.216 * b8;

  // ── Re-dependent terms ─────────────────────────────────────────────────────
  const A = Re_D > 0 ? Math.pow(19000 * beta / Re_D, 0.8) : 0;
  const Re_term1 = Re_D > 0 ? 0.000521 * Math.pow(1e6 * beta / Re_D, 0.7) : 0;
  const Re_term2 = Re_D > 0 ? (0.0188 + 0.0063 * A) * b35 * Math.pow(1e6 / Re_D, 0.3) : 0;

  // ── Tapping geometry L1, L'2 ───────────────────────────────────────────────
  let L1  = 0; // upstream tap position (normalised by D)
  let L2p = 0; // L'2 = downstream tap position (normalised by D)

  if (tappingType === "corner") {
    L1 = 0; L2p = 0;
  } else if (tappingType === "D-D2") {
    L1 = 1; L2p = 0.47;
  } else {
    // Flange taps: L1 = L'2 = 25.4/D where D is in mm
    const ratio = 25.4 / D_mm;
    L1 = ratio; L2p = ratio;
  }

  // ── Upstream tap correction term (ISO 5167-2 Eq. 1 term 4) ───────────────
  // (0.043 + 0.08·e^(−10L1) − 0.123·e^(−7L1))·(1−0.11A)·β⁴/(1−β⁴)
  // For corner taps (L1=0): 0.043 + 0.08 − 0.123 = 0 → term vanishes ✓
  const upstreamCoeff = 0.043 + 0.08 * Math.exp(-10 * L1) - 0.123 * Math.exp(-7 * L1);
  const upstreamTerm = upstreamCoeff * (1 - 0.11 * A) * b4 / Math.max(1 - b4, 1e-9);

  // ── Downstream tap correction term (ISO 5167-2 Eq. 1 term 5) ─────────────
  // −0.031·(M'2 − 0.8·M'2^1.1)·β^1.3,  M'2 = 2·L'2/(1−β)
  // For corner taps (L'2=0): M'2 = 0 → term vanishes ✓
  const M2p = 2 * L2p / Math.max(1 - beta, 0.01);
  const downstreamTerm = -0.031 * (M2p - 0.8 * Math.pow(M2p, 1.1)) * b13;

  // ── Small-pipe D-correction (ISO 5167-2: for D < 71.12 mm = 2.8 inch) ────
  const D_corr = D_mm < 71.12 ? 0.011 * (0.75 - beta) * (2.8 - D_mm / 25.4) : 0;

  const Cd = Cd_inf + Re_term1 + Re_term2 + upstreamTerm + downstreamTerm + D_corr;
  return Math.max(0.40, Math.min(Cd, 0.92));
}

/**
 * Plate thickness Cd correction.
 * For thick orifices (e/d > 0.5), the effective discharge coefficient increases
 * because the orifice acts more like a short tube (less contraction).
 *
 * Ref: Lienhard & Dhir (2005), Miller (2009), ISO 5167-2 Commentary
 *   e/d ≤ 0.02 → thin plate, Cd = Cd_thin (no correction)
 *   0.02 < e/d ≤ 0.5 → Cd_thick = Cd_thin (no meaningful correction in this range)
 *   0.5 < e/d ≤ 2.5 → Cd increases linearly: Cd = Cd_thin × (1 + 0.023·(e/d − 0.5))
 *   e/d > 2.5 → short tube regime: Cd ≈ 0.80 (square-edged tube)
 */
function applyThicknessCorrection(Cd_thin: number, e_mm: number, d_mm: number): { Cd: number; corrected: boolean; regime: string } {
  if (d_mm <= 0 || e_mm <= 0) return { Cd: Cd_thin, corrected: false, regime: "thin plate" };
  const eod = e_mm / d_mm;
  if (eod <= 0.5) return { Cd: Cd_thin, corrected: false, regime: "thin plate (e/d ≤ 0.5)" };
  if (eod > 2.5) return { Cd: 0.80, corrected: true, regime: "short tube (e/d > 2.5) — Cd ≈ 0.80" };
  const Cd_corrected = Cd_thin * (1 + 0.023 * (eod - 0.5));
  return { Cd: Math.min(Cd_corrected, 0.90), corrected: true, regime: `thick orifice (e/d = ${eod.toFixed(2)})` };
}

// ─── Permanent Pressure Loss ──────────────────────────────────────────────────

/**
 * Permanent pressure loss fraction per ISO 5167-2:2003 Annex D.
 *   ΔP_perm / ΔP_total = (√(1−β⁴·Cd²) − Cd·β²) / (√(1−β⁴·Cd²) + Cd·β²)
 * Returns the fraction [0..1].
 * Note: Crane TP-410 approximation: ≈ (1−β²) for Cd=0.61, good for β < 0.7.
 */
function permanentPressureLossFraction(beta: number, Cd: number): number {
  const b4  = Math.pow(beta, 4);
  const inner = Math.sqrt(Math.max(1 - b4 * Cd * Cd, 0.001));
  const CdB2  = Cd * beta * beta;
  const num   = inner - CdB2;
  const den   = inner + CdB2;
  return den > 0 ? Math.max(0, Math.min(1, num / den)) : 1 - beta * beta;
}

// ─── Gas Critical Flow ────────────────────────────────────────────────────────

/** Critical pressure ratio: r_crit = (2/(k+1))^(k/(k-1)) */
function gasCriticalPressureRatio(k: number): number {
  return Math.pow(2 / (k + 1), k / (k - 1));
}

/** Critical flow function: C(k) = √(k·(2/(k+1))^((k+1)/(k-1))) */
function gasCriticalFlowFunction(k: number): number {
  return Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)));
}

/**
 * ISO 5167-2 Gas expansion factor Y (ISA approximation).
 * Y = 1 − (0.351 + 0.256β⁴ + 0.93β⁸)·(1−(P2/P1)^(1/k))
 * Valid: 0.75 ≤ r ≤ 1 (subcritical). Returns 1 for incompressible limit.
 */
function gasExpansionFactorISO(beta: number, pressureRatio: number, k: number): number {
  const r = pressureRatio;
  if (r <= 0 || r >= 1 || k <= 1) return 1;
  const b4 = Math.pow(beta, 4);
  const b8 = Math.pow(beta, 8);
  return Math.max(0.667, 1 - (0.351 + 0.256 * b4 + 0.93 * b8) * (1 - Math.pow(r, 1 / k)));
}

// ─── Erosional Velocity ───────────────────────────────────────────────────────

/**
 * API RP 14E erosional velocity limit.
 * Ve = C_field / √ρ [ft/s, lb/ft³] → Ve = 122 / √ρ [m/s, kg/m³]
 * C = 100 (continuous service, single-phase liquid or gas)
 * Note: for multi-phase service, C = 75-100; for corrosive service, C = 60-80.
 */
function erosionalVelocity_SI(rho_kgm3: number): number {
  if (rho_kgm3 <= 0) return 999;
  return 122 / Math.sqrt(rho_kgm3);
}

// ─── Straight Pipe Length Recommendations ────────────────────────────────────

/**
 * Upstream/downstream straight-pipe length recommendations per ISO 5167-2:2003 Table 3.
 * Values are in pipe diameters (L/D) for β ≈ 0.4−0.6 (interpolated).
 * For restriction orifices (not metering) these are conservative best-practice guidelines.
 */
function straightPipeRecommendations(beta: number): StraightPipeRec[] {
  // Interpolate between β=0.4 and β=0.6 for common fittings (upstream / downstream)
  const f = Math.max(0, Math.min(1, (beta - 0.4) / 0.2));
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * f);
  return [
    { fitting: "Single 90° elbow",           upstreamLD: lerp(14, 18), downstreamLD: 5 },
    { fitting: "Two 90° elbows (same plane)", upstreamLD: lerp(18, 22), downstreamLD: 5 },
    { fitting: "Two 90° elbows (diff planes)",upstreamLD: lerp(34, 44), downstreamLD: 6 },
    { fitting: "Globe / butterfly valve",     upstreamLD: lerp(18, 22), downstreamLD: 5 },
    { fitting: "Gate valve (fully open)",     upstreamLD: lerp(12, 14), downstreamLD: 5 },
    { fitting: "Reducer (2D upstream)",       upstreamLD: lerp(10, 12), downstreamLD: 5 },
    { fitting: "No fitting (free flow)",      upstreamLD: lerp(6, 10),  downstreamLD: 4 },
  ];
}

// ─── Noise Estimation ────────────────────────────────────────────────────────

/**
 * Simplified A-weighted SPL estimate for fluid noise from restriction orifice.
 * Based on acoustic power methods (IEC 60534-8 adapted for RO).
 * Returns estimated SPL at 1m distance [dB(A)]. Treat as screening only.
 */
function estimateNoiseSPL(
  W_kgs: number, P1_Pa: number, P2_Pa: number,
  D_mm: number, d_mm: number, rho1: number,
): number {
  const dP = P1_Pa - P2_Pa;
  if (dP <= 0 || W_kgs <= 0 || rho1 <= 0 || d_mm <= 0) return 0;
  const A_orifice = PI / 4 * Math.pow(d_mm / 1000, 2);
  const v_jet = A_orifice > 0 ? W_kgs / (rho1 * A_orifice) : 0;
  if (v_jet <= 0) return 0;
  // Acoustic power ~ W·v²·ρ proportional approach
  // Calibrated to give ~80 dB for water at 10 m/s jet, ~100 dB for gas at 150 m/s jet
  const Lw_ref = 10 * Math.log10(Math.max(W_kgs * Math.pow(v_jet, 2) * rho1 * 1e-4, 1e-30));
  const SPL_at_1m = Lw_ref + 40 - 10 * Math.log10(2 * PI * Math.pow(D_mm / 1000 + 0.5, 2));
  return Math.max(0, Math.min(SPL_at_1m, 160));
}

// ─── Flow Equations ───────────────────────────────────────────────────────────

function liquidMassFlow(
  d_mm: number, D_mm: number, rho: number, dP_Pa: number, Cd: number, basisMode: BasisMode,
): number {
  const d_m = d_mm / 1000;
  const D_m = D_mm / 1000;
  const A   = (PI / 4) * d_m * d_m;
  const beta = d_m / D_m;
  const velApproach = basisMode === "inPipe" ? Math.sqrt(1 - Math.pow(beta, 4)) : 1;
  if (velApproach <= 0 || dP_Pa <= 0 || A <= 0) return 0;
  return Cd * A / velApproach * Math.sqrt(2 * rho * dP_Pa) * 3600;
}

function liquidDP(
  d_mm: number, D_mm: number, rho: number, W_kgh: number, Cd: number, basisMode: BasisMode,
): number {
  const d_m = d_mm / 1000;
  const D_m = D_mm / 1000;
  const A   = (PI / 4) * d_m * d_m;
  const beta = d_m / D_m;
  const velApproach = basisMode === "inPipe" ? Math.sqrt(1 - Math.pow(beta, 4)) : 1;
  if (A <= 0 || Cd <= 0 || velApproach <= 0) return 0;
  const W_kgs = W_kgh / 3600;
  return Math.pow(W_kgs * velApproach / (Cd * A), 2) / (2 * rho);
}

function gasMassFlow(
  d_mm: number, D_mm: number,
  P1_Pa: number, T_K: number, MW: number, k: number, Z: number, Cd: number,
  pressureRatio: number, isChoked: boolean, basisMode: BasisMode,
): number {
  const d_m  = d_mm / 1000;
  const D_m  = D_mm / 1000;
  const A    = (PI / 4) * d_m * d_m;
  const beta = d_m / D_m;
  const velApproach = basisMode === "inPipe" ? Math.sqrt(1 - Math.pow(beta, 4)) : 1;
  const rho1 = (P1_Pa * MW) / (Z * R_UNIVERSAL * T_K);

  if (isChoked) {
    const fk = gasCriticalFlowFunction(k);
    const W  = Cd * A * P1_Pa * fk * Math.sqrt(MW / (Z * R_UNIVERSAL * T_K)) / velApproach;
    return W * 3600;
  } else {
    const Y   = gasExpansionFactorISO(beta, pressureRatio, k);
    const dP  = P1_Pa * (1 - pressureRatio);
    const W   = Cd * A * Y * Math.sqrt(2 * rho1 * dP) / velApproach;
    return W * 3600;
  }
}

function gasDP(
  d_mm: number, D_mm: number,
  P1_Pa: number, T_K: number, MW: number, k: number, Z: number, Cd: number,
  W_kgh: number, basisMode: BasisMode, maxIter: number, tol: number,
): { dP_Pa: number; isChoked: boolean; solverInfo: SolverInfo } {
  const xCrit = gasCriticalPressureRatio(k);
  const W_choked = gasMassFlow(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, xCrit, true, basisMode);

  if (W_kgh >= W_choked) {
    return {
      dP_Pa: P1_Pa * (1 - xCrit),
      isChoked: true,
      solverInfo: { method: "Choked (direct)", iterations: 0, finalError: 0, tolerance: tol, converged: true, bracketLow: 0, bracketHigh: 0 },
    };
  }

  const fn = (r: number) => gasMassFlow(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, r, false, basisMode) - W_kgh;
  const sol = bisectionSolve(fn, xCrit + 0.0001, 0.99999, tol, maxIter);
  return {
    dP_Pa: P1_Pa * (1 - sol.root),
    isChoked: false,
    solverInfo: { method: "Bisection (pressure-ratio space)", iterations: sol.iterations, finalError: sol.error, tolerance: tol, converged: sol.converged, bracketLow: sol.bracketLow, bracketHigh: sol.bracketHigh },
  };
}

// ─── Cd Iteration ────────────────────────────────────────────────────────────

function iterateCd(
  initialCd: number,
  getReAndBeta: (Cd: number) => { Re_D: number; beta: number; d_mm: number },
  D_mm: number,
  edgeType: EdgeType,
  e_mm: number,
  maxIter: number,
  tappingType: TappingType = "corner",
): { Cd: number; iterations: number; thicknessRegime: string } {
  let Cd = initialCd;
  let regime = "thin plate";
  for (let i = 0; i < maxIter; i++) {
    const { Re_D, beta, d_mm } = getReAndBeta(Cd);
    const Cd_thin = cdReaderHarrisGallagher(beta, Re_D, D_mm, edgeType, tappingType);
    const thick   = applyThicknessCorrection(Cd_thin, e_mm, d_mm);
    regime = thick.regime;
    const Cd_new  = thick.Cd;
    if (Math.abs(Cd_new - Cd) < 1e-6) { Cd = Cd_new; break; }
    Cd = Cd_new;
  }
  return { Cd, iterations: maxIter, thicknessRegime: regime };
}

// ─── Multi-Stage Pressure Distribution ───────────────────────────────────────

/**
 * Compute per-stage pressures.
 * "equal_dp":  each stage ΔP = ΔP_total / n  (simple equal distribution)
 * "geometric": each stage P2/P1 = (P2_total/P1_total)^(1/n)  (equal pressure ratio per stage)
 *   — preferred for gas and cavitation-limited liquid service
 */
function computeStageP(
  P1_bar: number, P2_bar: number, n: number,
  distribution: "equal_dp" | "geometric",
): Array<{ P1: number; P2: number }> {
  const stages = [];
  if (distribution === "geometric" && P2_bar > 0 && P1_bar > P2_bar) {
    const r_total = P2_bar / P1_bar;
    const r_stage = Math.pow(r_total, 1 / n);
    for (let i = 0; i < n; i++) {
      const sP1 = P1_bar * Math.pow(r_stage, i);
      const sP2 = P1_bar * Math.pow(r_stage, i + 1);
      stages.push({ P1: sP1, P2: sP2 });
    }
  } else {
    const dP = (P1_bar - P2_bar) / n;
    for (let i = 0; i < n; i++) {
      stages.push({ P1: P1_bar - i * dP, P2: P1_bar - (i + 1) * dP });
    }
  }
  return stages;
}

// ─── Liquid Calculation ───────────────────────────────────────────────────────

export function calculateROLiquid(input: ROServiceInput, project: ROProject): ROResult {
  const steps:   CalcStep[]       = [];
  const flags:   ROFlag[]         = [];
  const warnings:  string[]       = [];
  const recommendations: string[] = [];

  const P1_Pa   = input.upstreamPressure * 1e5;
  const P2_Pa   = input.downstreamPressure * 1e5;
  const rho     = input.liquidProps.density;
  const mu_cP   = input.liquidProps.viscosity;
  const Pv_bar  = input.liquidProps.vaporPressure;
  const D_mm    = input.pipeDiameter;
  const D_m     = D_mm / 1000;
  const basisMode = input.orifice.basisMode;
  const e_mm    = input.orifice.thickness;
  const estimateCd = input.orifice.cdMode === "estimated";
  let Cd        = input.orifice.cdValue;

  if (input.sizingMode !== "predictDP") {
    if (P1_Pa <= P2_Pa) throw new Error("P1 must exceed P2");
  }
  if (rho <= 0)     throw new Error("Liquid density must be positive");
  if (Cd <= 0 || Cd > 1) throw new Error("Discharge coefficient must be in (0, 1]");
  if (D_mm <= 0)    throw new Error("Pipe diameter must be positive");

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

  const dP_Pa  = P1_Pa - P2_Pa;
  const dP_bar = input.upstreamPressure - input.downstreamPressure;

  steps.push({ label: "P₁ upstream",     equation: "", value: input.upstreamPressure.toFixed(3), unit: "bar(a)", eqId: "RO-L-01" });
  steps.push({ label: "P₂ downstream",   equation: "", value: input.downstreamPressure.toFixed(3), unit: "bar(a)", eqId: "RO-L-02" });
  steps.push({ label: "ΔP = P₁ − P₂",   equation: "ΔP = P₁ − P₂", value: dP_bar.toFixed(4), unit: "bar", eqId: "RO-L-03" });
  steps.push({ label: "ρ liquid",         equation: "", value: rho.toFixed(3), unit: "kg/m³", eqId: "RO-L-04" });
  steps.push({ label: "Mass flow W",      equation: input.flowBasis === "volume" ? "W = Q × ρ" : "given", value: W_kgh.toFixed(3), unit: "kg/h", eqId: "RO-L-05" });
  steps.push({ label: "Vol flow Q",       equation: input.flowBasis === "mass" ? "Q = W/ρ" : "given", value: Q_m3h.toFixed(4), unit: "m³/h", eqId: "RO-L-06" });

  // Discharge coefficient
  if (estimateCd) { flags.push("CD_ESTIMATED"); }

  let d_mm: number;
  let solverInfo: SolverInfo | null = null;
  let thicknessRegime = "thin plate";

  if (input.sizingMode === "sizeForFlow") {
    if (estimateCd) {
      const getReAndBeta = (CdGuess: number) => {
        const fn2 = (d: number) => liquidMassFlow(d, D_mm, rho, dP_Pa, CdGuess, basisMode) - W_kgh;
        const sol = bisectionSolve(fn2, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
        const d_m_g = sol.root / 1000;
        const A_g   = PI / 4 * d_m_g * d_m_g;
        const v_g   = Q_m3h / 3600 / A_g;
        const Re_D_g = rho * (Q_m3h / 3600 / (PI / 4 * D_m * D_m)) * D_m / Math.max(mu_cP * 1e-3, 1e-12);
        return { Re_D: Re_D_g, beta: d_m_g / D_m, d_mm: sol.root };
      };
      const result = iterateCd(Cd, getReAndBeta, D_mm, input.orifice.edgeType, e_mm, 10, input.orifice.tappingType || "corner");
      Cd = result.Cd;
      thicknessRegime = result.thicknessRegime;
    } else {
      // Apply thickness correction to user-specified Cd
      const fn2 = (d: number) => liquidMassFlow(d, D_mm, rho, dP_Pa, Cd, basisMode) - W_kgh;
      const sol = bisectionSolve(fn2, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
      const thickResult = applyThicknessCorrection(Cd, e_mm, sol.root);
      if (thickResult.corrected) {
        Cd = thickResult.Cd;
        thicknessRegime = thickResult.regime;
        flags.push("THICK_ORIFICE");
      }
    }
    const fn = (d: number) => liquidMassFlow(d, D_mm, rho, dP_Pa, Cd, basisMode) - W_kgh;
    const solResult = bisectionSolve(fn, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
    d_mm = solResult.root;
    solverInfo = {
      method: "Bisection", iterations: solResult.iterations, finalError: solResult.error,
      tolerance: project.tolerance, converged: solResult.converged,
      bracketLow: solResult.bracketLow, bracketHigh: solResult.bracketHigh,
    };
    if (!solResult.converged) {
      flags.push("SOLVER_ISSUE");
      warnings.push(`Solver did not converge after ${solResult.iterations} iterations (error = ${solResult.error.toExponential(2)})`);
    }
  } else if (input.sizingMode === "checkOrifice") {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in check mode");
    if (estimateCd) {
      const Re_D_est = rho * (Q_m3h / 3600 / (PI / 4 * D_m * D_m)) * D_m / Math.max(mu_cP * 1e-3, 1e-12);
      Cd = cdReaderHarrisGallagher(d_mm / D_mm, Re_D_est, D_mm, input.orifice.edgeType, input.orifice.tappingType || "corner");
      const thick = applyThicknessCorrection(Cd, e_mm, d_mm);
      Cd = thick.Cd;
      thicknessRegime = thick.regime;
    }
    W_kgh = liquidMassFlow(d_mm, D_mm, rho, dP_Pa, Cd, basisMode);
    Q_m3h = W_kgh / rho;
  } else {
    // predictDP
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in ΔP-prediction mode");
    if (W_kgh <= 0) throw new Error("Flow rate must be positive in ΔP-prediction mode");
    if (estimateCd) {
      const Re_D_est = rho * (Q_m3h / 3600 / (PI / 4 * D_m * D_m)) * D_m / Math.max(mu_cP * 1e-3, 1e-12);
      Cd = cdReaderHarrisGallagher(d_mm / D_mm, Re_D_est, D_mm, input.orifice.edgeType, input.orifice.tappingType || "corner");
      const thick = applyThicknessCorrection(Cd, e_mm, d_mm);
      Cd = thick.Cd;
      thicknessRegime = thick.regime;
    }
    const predDP_Pa  = liquidDP(d_mm, D_mm, rho, W_kgh, Cd, basisMode);
    const predDP_bar = predDP_Pa / 1e5;
    steps.push({ label: "Predicted ΔP",  equation: "ΔP = W²·(1−β⁴) / (2ρ·Cd²·A²)", value: predDP_bar.toFixed(4), unit: "bar", eqId: "RO-L-11" });
    steps.push({ label: "Predicted P₂",  equation: "P₂ = P₁ − ΔP", value: (input.upstreamPressure - predDP_bar).toFixed(4), unit: "bar(a)", eqId: "RO-L-12" });
  }

  const d_m   = d_mm / 1000;
  const A_m2  = (PI / 4) * d_m * d_m;
  const A_mm2 = A_m2 * 1e6;
  const beta  = d_m / D_m;

  const actualDP_bar = input.sizingMode === "predictDP"
    ? liquidDP(d_mm, D_mm, rho, W_kgh, Cd, basisMode) / 1e5
    : dP_bar;
  const actualP2_bar = input.upstreamPressure - actualDP_bar;

  // Permanent pressure loss — ISO 5167-2 Annex D
  const permFraction  = permanentPressureLossFraction(beta, Cd);
  const permLoss_bar  = actualDP_bar * permFraction;
  const recoveryFac   = 1 - permFraction;

  // Velocities
  const Q_m3s         = Q_m3h / 3600;
  const pipeArea_m2   = (PI / 4) * D_m * D_m;
  const orificeVel    = A_m2 > 0  ? Q_m3s / A_m2  : 0;
  const pipeVel       = pipeArea_m2 > 0 ? Q_m3s / pipeArea_m2 : 0;
  const flowCoeff     = Cd / Math.sqrt(Math.max(1 - Math.pow(beta, 4), 1e-9));

  // Reynolds numbers
  let Re = 0; let Re_pipe = 0;
  if (mu_cP > 0 && d_m > 0) {
    const mu_Pas = mu_cP * 1e-3;
    Re       = rho * orificeVel * d_m / mu_Pas;
    Re_pipe  = rho * pipeVel   * D_m / mu_Pas;
  }

  steps.push({ label: "Cd effective",           equation: estimateCd ? `ISO 5167-2 RHG (${thicknessRegime})` : `user-defined (${thicknessRegime})`, value: Cd.toFixed(4), unit: "—", eqId: "RO-L-07" });
  steps.push({ label: "Velocity approach E",     equation: "E = 1/√(1−β⁴)", value: (1/Math.sqrt(Math.max(1-Math.pow(beta,4),1e-9))).toFixed(4), unit: "—", eqId: "RO-L-07b" });
  steps.push({ label: "d orifice (calculated)",  equation: input.sizingMode === "sizeForFlow" ? "W = Cd·E·A·√(2ρΔP) → d" : "given", value: d_mm.toFixed(3), unit: "mm", eqId: "RO-L-08" });
  steps.push({ label: "A orifice",               equation: "A = π·d²/4", value: A_mm2.toFixed(2), unit: "mm²", eqId: "RO-L-09" });
  steps.push({ label: "β = d/D",                 equation: "β = d/D", value: beta.toFixed(4), unit: "—", eqId: "RO-L-10" });
  steps.push({ label: "ΔP_perm fraction (ISO)",  equation: "(√(1−β⁴Cd²)−Cd·β²) / (√(1−β⁴Cd²)+Cd·β²)", value: permFraction.toFixed(4), unit: "—", eqId: "RO-L-13" });
  steps.push({ label: "ΔP_perm",                 equation: "ΔP_perm = ΔP × fraction", value: permLoss_bar.toFixed(4), unit: "bar", eqId: "RO-L-14" });
  steps.push({ label: "Pressure recovery",       equation: "1 − permFraction", value: recoveryFac.toFixed(4), unit: "—", eqId: "RO-L-15" });
  steps.push({ label: "Orifice velocity v_o",    equation: "v_o = Q/A_o", value: orificeVel.toFixed(2), unit: "m/s", eqId: "RO-L-16" });
  steps.push({ label: "Pipe velocity v_p",       equation: "v_p = Q/A_p", value: pipeVel.toFixed(2), unit: "m/s", eqId: "RO-L-17" });
  steps.push({ label: "Flow coefficient K",      equation: "K = Cd/√(1−β⁴) = Cd·E", value: flowCoeff.toFixed(4), unit: "—", eqId: "RO-L-18" });
  if (Re > 0) {
    steps.push({ label: "Re_d (orifice)",        equation: "ρ·v_o·d/μ", value: Re.toFixed(0), unit: "—", eqId: "RO-L-19" });
    steps.push({ label: "Re_D (pipe)",           equation: "ρ·v_p·D/μ", value: Re_pipe.toFixed(0), unit: "—", eqId: "RO-L-20" });
  }

  // API 14E erosional velocity
  const Ve = erosionalVelocity_SI(rho);
  const Ve_ratio = orificeVel / Ve;

  // Cavitation assessment (ISA-RP75.23 / Tullis method)
  const sigma_i  = 2.7;  // incipient cavitation index for sharp orifice
  const sigma_ch = 1.5;  // constant (choking) cavitation index
  const sigma     = (actualDP_bar > 0 && input.upstreamPressure > Pv_bar)
    ? (input.upstreamPressure - Pv_bar) / actualDP_bar
    : 999;

  if (Pv_bar > 0) {
    steps.push({ label: "σ (cavitation index)", equation: "σ = (P₁−Pv)/ΔP", value: sigma < 999 ? sigma.toFixed(3) : "N/A", unit: "—", eqId: "RO-L-21" });
    steps.push({ label: "σᵢ incipient (sharp)", equation: "σᵢ ≈ 2.7 (ISA-RP75.23)", value: sigma_i.toFixed(1), unit: "—", eqId: "RO-L-22" });

    if (actualP2_bar <= Pv_bar) {
      flags.push("FLASHING_LIKELY");
      warnings.push(`FLASHING: P₂ = ${actualP2_bar.toFixed(2)} bar ≤ Pv = ${Pv_bar.toFixed(2)} bar. Liquid will flash to vapor downstream. Two-phase flow in outlet piping.`);
      recommendations.push("Relocate orifice to higher-pressure section, or use multi-stage reduction to keep P₂ > 1.3×Pv");
    } else if (sigma < sigma_ch) {
      flags.push("CAVITATION_SEVERE");
      warnings.push(`SEVERE CAVITATION: σ = ${sigma.toFixed(3)} < σch = ${sigma_ch.toFixed(1)} (ISA-RP75.23). Constant bubble collapse — erosion damage likely.`);
      recommendations.push("Use multi-stage restriction to reduce per-stage ΔP and keep σ > 2.7");
      recommendations.push("Specify hardened (stellite, tungsten carbide) orifice plate material");
    } else if (sigma < sigma_i) {
      flags.push("CAVITATION_INCIPIENT");
      warnings.push(`INCIPIENT CAVITATION: σ = ${sigma.toFixed(3)} < σᵢ = ${sigma_i.toFixed(1)} (ISA-RP75.23). Cavitation bubbles forming in vena contracta.`);
      recommendations.push("Monitor vibration and noise at commissioning. Consider anti-cavitation multi-stage restriction if σ approaches 1.5.");
    }

    if (Pv_bar >= input.upstreamPressure) {
      flags.push("TWO_PHASE_SUSPECTED");
      warnings.push(`Pv (${Pv_bar.toFixed(2)} bar) ≥ P₁ (${input.upstreamPressure.toFixed(2)} bar) — liquid may already be boiling upstream.`);
    }
  }

  const dpFraction = actualDP_bar > 0 && input.upstreamPressure > 0 ? actualDP_bar / input.upstreamPressure : 0;
  if (dpFraction > 0.5) {
    flags.push("HIGH_DP_FRACTION");
    warnings.push(`ΔP/P₁ = ${(dpFraction * 100).toFixed(1)}% — very high single-stage pressure drop. Cavitation and noise risks elevated.`);
  }

  if (beta < input.betaMin || beta > input.betaMax) {
    flags.push("BETA_OUT_OF_RANGE");
    warnings.push(`β = ${beta.toFixed(4)} outside recommended range [${input.betaMin.toFixed(2)} – ${input.betaMax.toFixed(2)}]`);
    if (beta > input.betaMax) recommendations.push("Consider using a larger pipe size (increase D) to reduce β ratio");
    if (beta < input.betaMin) recommendations.push("Very small orifice — verify manufacturability (min practical bore ≈ 3 mm). Consider raising β limit.");
  }

  if (orificeVel > Ve) {
    flags.push("EROSIONAL_VELOCITY_EXCEEDED");
    warnings.push(`Orifice velocity ${orificeVel.toFixed(1)} m/s EXCEEDS API 14E erosional limit ${Ve.toFixed(1)} m/s (C=100). Erosion of orifice plate and downstream pipe expected.`);
    recommendations.push("Increase orifice diameter (or use multi-stage) to reduce jet velocity below API 14E erosional limit");
  } else if (orificeVel > Ve * 0.75) {
    flags.push("HIGH_ORIFICE_VELOCITY");
    warnings.push(`Orifice velocity ${orificeVel.toFixed(1)} m/s approaching API 14E erosional limit ${Ve.toFixed(1)} m/s — use corrosion-resistant materials.`);
  }

  if (Re > 0 && Re < 5000) {
    flags.push("LOW_REYNOLDS");
    warnings.push(`Re_d = ${Re.toFixed(0)} < 5000 — Cd correlation valid range (Re ≥ 5000) not met. Results have higher uncertainty at laminar/transitional conditions.`);
  }

  if (thicknessRegime !== "thin plate") {
    flags.push("THICK_ORIFICE");
    warnings.push(`${thicknessRegime} — Cd corrected for plate thickness. Verify with vendor. Standard thin-plate orifice assumed in most references.`);
  }

  // Multi-stage
  const numStages = Math.max(1, input.numStages || 1);
  const stages: StageResult[] = [];
  if (numStages > 1 && input.sizingMode === "sizeForFlow") {
    const stagePs = computeStageP(input.upstreamPressure, actualP2_bar, numStages, input.stageDistribution);
    for (const sp of stagePs) {
      const sDP_Pa = (sp.P1 - sp.P2) * 1e5;
      const fn_s = (d: number) => liquidMassFlow(d, D_mm, rho, sDP_Pa, Cd, basisMode) - W_kgh;
      const sol_s = bisectionSolve(fn_s, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
      const sBeta = (sol_s.root / 1000) / D_m;
      const sArea = PI / 4 * Math.pow(sol_s.root / 1000, 2);
      const sVel  = sArea > 0 ? Q_m3s / sArea : 0;
      stages.push({
        stageNumber: stagePs.indexOf(sp) + 1,
        upstreamPressure: sp.P1, downstreamPressure: sp.P2,
        pressureDrop: sp.P1 - sp.P2, orificeDiameter: sol_s.root,
        betaRatio: sBeta, orificeVelocity: sVel,
        pressureRatioDP: sp.P2 / sp.P1, isChoked: false,
      });
    }
  }

  if (dpFraction > 0.40 && numStages <= 1) {
    flags.push("MULTI_STAGE_RECOMMENDED");
    const suggestedN = Math.max(2, Math.ceil(dpFraction / 0.30));
    recommendations.push(`Consider ${suggestedN}-stage restriction (ΔP/P₁ = ${(dpFraction * 100).toFixed(0)}% > 40%). Use geometric pressure distribution.`);
  }

  const stdBore     = roundToStandardBore(d_mm);
  const stdBoreArea = (PI / 4) * Math.pow(stdBore / 1000, 2) * 1e6;
  const stdBoreBeta = (stdBore / 1000) / D_m;

  const straightPipeRecs = straightPipeRecommendations(beta);

  return {
    phase: "liquid", sizingMode: input.sizingMode,
    requiredDiameter: d_mm, orificeArea: A_mm2, betaRatio: beta,
    pressureDrop: actualDP_bar, permanentPressureLoss: permLoss_bar,
    permanentPressureLossFraction: permFraction, recoveryFactor: recoveryFac,
    orificeVelocity: orificeVel, pipeVelocity: pipeVel, flowCoefficient: flowCoeff,
    massFlow: W_kgh, volFlow: Q_m3h,
    standardBore: stdBore, standardBoreArea: stdBoreArea, standardBoreBeta: stdBoreBeta,
    pressureRatio: 0, criticalPressureRatio: 0, isChoked: false,
    expansionFactor: 1, criticalFlowFunction: 0,
    upstreamDensity: rho, rSpecific: 0,
    reynoldsNumber: Re, reynoldsNumberPipe: Re_pipe, machNumber: 0,
    sigma, sigmaIncipient: sigma_i, noiseLevelEstimate: 0, cdEffective: Cd,
    erosionalVelocity: Ve, erosionalVelocityRatio: Ve_ratio,
    numStages, stages, straightPipeRecs,
    calcSteps: steps, solverInfo, flags, warnings, recommendations,
    srkResult: null, dischargeTemperature: null, dischargeTemperatureConverged: false,
  };
}

// ─── Gas Calculation ──────────────────────────────────────────────────────────

export function calculateROGas(input: ROServiceInput, project: ROProject): ROResult {
  const steps:         CalcStep[] = [];
  const flags:         ROFlag[]   = [];
  const warnings:      string[]   = [];
  const recommendations: string[] = [];

  const P1_bar  = input.upstreamPressure;
  const P2_bar  = input.downstreamPressure;
  const P1_Pa   = P1_bar * 1e5;
  const T_K     = input.temperature + 273.15;
  const D_mm    = input.pipeDiameter;
  const D_m     = D_mm / 1000;
  const basisMode  = input.orifice.basisMode;
  const e_mm    = input.orifice.thickness;
  const estimateCd = input.orifice.cdMode === "estimated";
  let Cd        = input.orifice.cdValue;

  // ── SRK EoS integration ────────────────────────────────────────────────────
  let srkResult: SRKMixtureResult | null = null;
  let MW      = input.gasProps.molecularWeight;
  let k       = input.gasProps.specificHeatRatio;
  let Z       = input.gasProps.compressibilityFactor;
  let mu_cP   = input.gasProps.viscosity;

  const eosMode = input.gasPropsMode;
  if ((eosMode === "srk" || eosMode === "pr") && input.composition && input.composition.length > 0) {
    const eosFn = eosMode === "pr" ? computePRProperties : computeSRKProperties;
    const eosLabel = eosMode === "pr" ? "PR EoS (Peng-Robinson 1976/1978)" : "SRK EoS (Soave 1972)";
    const eosId    = eosMode === "pr" ? "PR" : "SRK";
    try {
      srkResult = eosFn(input.composition, input.temperature, P1_bar);
      MW    = srkResult.MWm;
      k     = srkResult.k;
      Z     = srkResult.Z;
      mu_cP = srkResult.viscosity_cP;
      for (const w of srkResult.warnings) warnings.push(`${eosId}: ${w}`);
      steps.push({ label: `── ${eosLabel} Mode ──`, equation: "Properties from EoS + Chueh-Prausnitz BIP + Lee viscosity", value: "", unit: "", eqId: `${eosId}-00` });
      steps.push({ label: `MWm (${eosId})`,   equation: "MWm = Σ xi·MWi", value: MW.toFixed(3), unit: "kg/kmol", eqId: `${eosId}-01` });
      steps.push({ label: `Z (${eosId})`,     equation: `${eosId} cubic — largest positive root`, value: Z.toFixed(4), unit: "—", eqId: `${eosId}-13` });
      steps.push({ label: `k (${eosId})`,     equation: "k = Cp/(Cp−R), ideal-gas Cp", value: k.toFixed(4), unit: "—", eqId: `${eosId}-28` });
      steps.push({ label: `μ (${eosId}/Lee)`, equation: "Lee-Gonzalez-Eakin (1966)", value: mu_cP.toFixed(5), unit: "cP", eqId: `${eosId}-19` });
      steps.push({ label: `ρ (${eosId})`,     equation: "ρ = MWm/Vm", value: srkResult.rho.toFixed(3), unit: "kg/m³", eqId: `${eosId}-15` });
    } catch (e: unknown) {
      warnings.push(`${eosLabel} failed: ${e instanceof Error ? e.message : String(e)}. Falling back to manual gas properties.`);
    }
  }

  if (input.sizingMode !== "predictDP") {
    if (P2_bar >= P1_bar) throw new Error("P1 must exceed P2");
  }
  if (k <= 1)   throw new Error("Specific heat ratio k must be > 1");
  if (MW <= 0)  throw new Error("Molecular weight must be positive");
  if (Z <= 0)   throw new Error("Compressibility factor Z must be positive");
  if (Cd <= 0 || Cd > 1) throw new Error("Discharge coefficient must be in (0, 1]");
  if (D_mm <= 0) throw new Error("Pipe diameter must be positive");

  let W_kgh = input.massFlowRate;
  if (W_kgh <= 0 && input.sizingMode === "sizeForFlow") throw new Error("Mass flow rate must be positive");
  if (W_kgh <= 0 && input.sizingMode === "predictDP")   throw new Error("Mass flow rate must be positive for ΔP prediction");

  const R_spec  = R_UNIVERSAL / MW;
  const rho1    = srkResult ? srkResult.rho : (P1_Pa * MW) / (Z * R_UNIVERSAL * T_K);
  const xCrit   = gasCriticalPressureRatio(k);
  const fk      = gasCriticalFlowFunction(k);

  steps.push({ label: "P₁ upstream",          equation: "", value: P1_bar.toFixed(3),  unit: "bar(a)", eqId: "RO-G-01" });
  steps.push({ label: "P₂ downstream",         equation: "", value: P2_bar.toFixed(3),  unit: "bar(a)", eqId: "RO-G-02" });
  steps.push({ label: "T upstream",            equation: "T = T_C + 273.15", value: `${input.temperature.toFixed(1)} °C = ${T_K.toFixed(2)} K`, unit: "", eqId: "RO-G-03" });
  steps.push({ label: "MW",                    equation: srkResult ? "From SRK EoS" : "user input", value: MW.toFixed(3), unit: "kg/kmol", eqId: "RO-G-04" });
  steps.push({ label: "k = Cp/Cv",            equation: srkResult ? "From SRK EoS (ideal gas)" : "user input", value: k.toFixed(4), unit: "—", eqId: "RO-G-05" });
  steps.push({ label: "Z",                     equation: srkResult ? "From SRK EoS cubic" : "user input", value: Z.toFixed(4), unit: "—", eqId: "RO-G-06" });
  steps.push({ label: "R_specific",            equation: "R_s = Rᵤ / MW", value: R_spec.toFixed(3), unit: "J/(kg·K)", eqId: "RO-G-07" });
  steps.push({ label: "ρ₁ upstream",           equation: srkResult ? "ρ₁ = MWm/Vm (SRK)" : "ρ₁ = P₁·MW/(Z·Rᵤ·T)", value: rho1.toFixed(4), unit: "kg/m³", eqId: "RO-G-08" });
  steps.push({ label: "r_crit = (2/(k+1))^(k/(k-1))", equation: "r_crit = (2/(k+1))^(k/(k-1))", value: xCrit.toFixed(6), unit: "—", eqId: "RO-G-09" });
  steps.push({ label: "C(k) critical flow fn", equation: "C(k) = √(k·(2/(k+1))^((k+1)/(k-1)))", value: fk.toFixed(6), unit: "—", eqId: "RO-G-10" });

  if (estimateCd) { flags.push("CD_ESTIMATED"); }

  let d_mm: number;
  let solverInfo: SolverInfo | null = null;
  let actualDP_bar: number;
  let isChoked: boolean;
  let pressureRatio: number;
  let thicknessRegime = "thin plate";

  if (input.sizingMode === "sizeForFlow") {
    const P2_Pa = P2_bar * 1e5;
    pressureRatio = P2_Pa / P1_Pa;
    isChoked = pressureRatio <= xCrit;
    actualDP_bar = P1_bar - P2_bar;

    if (estimateCd) {
      const getReAndBeta = (CdGuess: number) => {
        const fn2 = (d: number) => gasMassFlow(d, D_mm, P1_Pa, T_K, MW, k, Z, CdGuess, pressureRatio, isChoked, basisMode) - W_kgh;
        const sol = bisectionSolve(fn2, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
        const d_m_g = sol.root / 1000;
        const A_g   = PI / 4 * d_m_g * d_m_g;
        const v_g   = rho1 > 0 && A_g > 0 ? (W_kgh / 3600) / (rho1 * A_g) : 0;
        const Re_D_g = rho1 * (W_kgh / 3600 / (rho1 * PI / 4 * D_m * D_m)) * D_m / Math.max(mu_cP * 1e-3, 1e-12);
        return { Re_D: Re_D_g, beta: d_m_g / D_m, d_mm: sol.root };
      };
      const result = iterateCd(Cd, getReAndBeta, D_mm, input.orifice.edgeType, e_mm, 10, input.orifice.tappingType || "corner");
      Cd = result.Cd;
      thicknessRegime = result.thicknessRegime;
    }

    const fn = (d: number) => gasMassFlow(d, D_mm, P1_Pa, T_K, MW, k, Z, Cd, pressureRatio, isChoked, basisMode) - W_kgh;
    const solResult = bisectionSolve(fn, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
    d_mm = solResult.root;
    solverInfo = {
      method: "Bisection (diameter)", iterations: solResult.iterations, finalError: solResult.error,
      tolerance: project.tolerance, converged: solResult.converged,
      bracketLow: solResult.bracketLow, bracketHigh: solResult.bracketHigh,
    };
    if (!solResult.converged) { flags.push("SOLVER_ISSUE"); warnings.push(`Solver not converged — error = ${solResult.error.toExponential(2)}`); }

    steps.push({ label: "r = P₂/P₁",         equation: "r = P₂/P₁", value: pressureRatio.toFixed(6), unit: "—", eqId: "RO-G-11" });
    steps.push({ label: "r_crit",             equation: "—", value: xCrit.toFixed(6), unit: "—", eqId: "RO-G-11b" });
    steps.push({ label: "Flow regime",        equation: isChoked ? "r ≤ r_crit → CHOKED" : "r > r_crit → Subcritical", value: isChoked ? "CHOKED (SONIC)" : "SUBCRITICAL", unit: "", eqId: "RO-G-12" });

  } else if (input.sizingMode === "checkOrifice") {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in check mode");
    pressureRatio = P2_bar / P1_bar;
    isChoked = pressureRatio <= xCrit;
    actualDP_bar = P1_bar - P2_bar;
    if (estimateCd) {
      const Re_D_est = rho1 * (W_kgh / 3600 / (rho1 * PI / 4 * D_m * D_m)) * D_m / Math.max(mu_cP * 1e-3, 1e-12);
      Cd = cdReaderHarrisGallagher(d_mm / D_mm, Re_D_est, D_mm, input.orifice.edgeType, input.orifice.tappingType || "corner");
      const thick = applyThicknessCorrection(Cd, e_mm, d_mm);
      Cd = thick.Cd; thicknessRegime = thick.regime;
    }
    W_kgh = gasMassFlow(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, pressureRatio, isChoked, basisMode);
    steps.push({ label: "Flow regime", equation: isChoked ? "r ≤ r_crit → CHOKED" : "Subcritical", value: isChoked ? "CHOKED" : "SUBCRITICAL", unit: "", eqId: "RO-G-12" });

  } else {
    d_mm = input.orificeDiameter;
    if (d_mm <= 0) throw new Error("Orifice diameter must be positive in ΔP-prediction mode");
    if (estimateCd) {
      const Re_D_est = rho1 * (W_kgh / 3600 / (rho1 * PI / 4 * D_m * D_m)) * D_m / Math.max(mu_cP * 1e-3, 1e-12);
      Cd = cdReaderHarrisGallagher(d_mm / D_mm, Re_D_est, D_mm, input.orifice.edgeType, input.orifice.tappingType || "corner");
      const thick = applyThicknessCorrection(Cd, e_mm, d_mm);
      Cd = thick.Cd; thicknessRegime = thick.regime;
    }
    const dpResult = gasDP(d_mm, D_mm, P1_Pa, T_K, MW, k, Z, Cd, W_kgh, basisMode, project.maxIterations, project.tolerance);
    actualDP_bar = dpResult.dP_Pa / 1e5;
    isChoked     = dpResult.isChoked;
    pressureRatio = 1 - actualDP_bar / P1_bar;
    solverInfo   = dpResult.solverInfo;
    steps.push({ label: "Predicted ΔP", equation: "Solve r : W(d,r) = W_target", value: actualDP_bar.toFixed(4), unit: "bar", eqId: "RO-G-15" });
    steps.push({ label: "Flow regime",  equation: isChoked ? "CHOKED" : "Subcritical", value: isChoked ? "CHOKED" : "SUBCRITICAL", unit: "", eqId: "RO-G-12" });
  }

  const d_m    = d_mm / 1000;
  const A_m2   = (PI / 4) * d_m * d_m;
  const A_mm2  = A_m2 * 1e6;
  const beta   = d_m / D_m;

  const Y_actual  = isChoked ? 0 : gasExpansionFactorISO(beta, pressureRatio, k);
  const pipeArea  = (PI / 4) * D_m * D_m;
  const W_kgs     = W_kgh / 3600;
  const orificeVel= A_m2 > 0 && rho1 > 0 ? W_kgs / (rho1 * A_m2) : 0;
  const pipeVel   = pipeArea > 0 && rho1 > 0 ? W_kgs / (rho1 * pipeArea) : 0;
  const sonicVel  = Math.sqrt(k * Z * R_spec * T_K);
  const machNo    = orificeVel / sonicVel;
  const permFrac  = permanentPressureLossFraction(beta, Cd);
  const permLoss  = actualDP_bar * permFrac;
  const recovFac  = 1 - permFrac;
  const flowCoeff = Cd / Math.sqrt(Math.max(1 - Math.pow(beta, 4), 1e-9));

  let Re = 0; let Re_pipe = 0;
  if (mu_cP > 0 && d_m > 0) {
    const mu_Pas = mu_cP * 1e-3;
    Re       = rho1 * orificeVel * d_m / mu_Pas;
    Re_pipe  = rho1 * pipeVel   * D_m / mu_Pas;
  }

  steps.push({ label: "Cd effective",             equation: estimateCd ? `ISO 5167-2 RHG (${thicknessRegime})` : "user-defined", value: Cd.toFixed(4), unit: "—", eqId: "RO-G-16" });
  if (!isChoked) {
    steps.push({ label: "Y (ISO 5167-2)",          equation: "Y = 1−(0.351+0.256β⁴+0.93β⁸)·(1−r^(1/k))", value: Y_actual.toFixed(6), unit: "—", eqId: "RO-G-17" });
  }
  steps.push({ label: "d orifice",                equation: input.sizingMode === "sizeForFlow" ? "solved" : "given", value: d_mm.toFixed(3), unit: "mm", eqId: "RO-G-18" });
  steps.push({ label: "A orifice",                equation: "π·d²/4", value: A_mm2.toFixed(2), unit: "mm²", eqId: "RO-G-19" });
  steps.push({ label: "β = d/D",                  equation: "β = d/D", value: beta.toFixed(4), unit: "—", eqId: "RO-G-20" });
  steps.push({ label: "ΔP_perm fraction (ISO)",   equation: "(√(1−β⁴Cd²)−Cd·β²)/(√(1−β⁴Cd²)+Cd·β²)", value: permFrac.toFixed(4), unit: "—", eqId: "RO-G-21" });
  steps.push({ label: "ΔP_perm",                  equation: "ΔP × permFraction", value: permLoss.toFixed(4), unit: "bar", eqId: "RO-G-22" });
  steps.push({ label: "v_o orifice velocity",     equation: "W/(ρ₁·A_o)", value: orificeVel.toFixed(2), unit: "m/s", eqId: "RO-G-23" });
  steps.push({ label: "v_p pipe velocity",        equation: "W/(ρ₁·A_p)", value: pipeVel.toFixed(2), unit: "m/s", eqId: "RO-G-24" });
  steps.push({ label: "Speed of sound c",         equation: "c = √(k·Z·R_s·T)", value: sonicVel.toFixed(1), unit: "m/s", eqId: "RO-G-25" });
  steps.push({ label: "Mach number Ma",           equation: "Ma = v_o / c", value: machNo.toFixed(4), unit: "—", eqId: "RO-G-26" });
  if (Re > 0) {
    steps.push({ label: "Re_d (orifice)",         equation: "ρ₁·v_o·d/μ", value: Re.toFixed(0), unit: "—", eqId: "RO-G-27" });
    steps.push({ label: "Re_D (pipe)",            equation: "ρ₁·v_p·D/μ", value: Re_pipe.toFixed(0), unit: "—", eqId: "RO-G-28" });
  }

  // Choked flow checks
  if (isChoked) {
    flags.push("CHOKED_FLOW"); flags.push("HIGH_NOISE_RISK");
    warnings.push(`Flow is CHOKED (sonic): P₂/P₁ = ${pressureRatio.toFixed(4)} ≤ r_crit = ${xCrit.toFixed(4)}. Downstream pressure does not affect flow. Y = 0.667 (min).`);
    warnings.push(`Sonic gas jet — high aerodynamic noise expected. SPL > 100 dB(A) likely at orifice exit.`);
    recommendations.push("Use multi-stage restriction to avoid sonic conditions per stage");
    recommendations.push("Request vendor acoustic analysis per IEC 60534-8 / API RP 521 for noise and vibration");
    recommendations.push("Downstream pipe wall thickness check for acoustic fatigue (ASME B31.3)");
  } else if (pressureRatio < xCrit * 1.1) {
    flags.push("NEAR_CHOKED");
    warnings.push(`Near-choked: P₂/P₁ = ${pressureRatio.toFixed(4)} within 10% of r_crit = ${xCrit.toFixed(4)}. Small flow increase may cause choking.`);
  }

  if (machNo > 0.8 && !isChoked) {
    flags.push("HIGH_MACH");
    warnings.push(`Ma = ${machNo.toFixed(3)} at orifice — compressibility and noise significant. ISA expansion factor becomes less accurate above Ma = 0.6.`);
  }

  // API 14E erosional velocity
  const Ve = erosionalVelocity_SI(rho1);
  const Ve_ratio = orificeVel / Ve;
  if (orificeVel > Ve) {
    flags.push("EROSIONAL_VELOCITY_EXCEEDED");
    warnings.push(`Orifice velocity ${orificeVel.toFixed(1)} m/s EXCEEDS API 14E erosional limit ${Ve.toFixed(1)} m/s (ρ=${rho1.toFixed(2)} kg/m³).`);
    recommendations.push("Increase orifice diameter or split into multiple stages to reduce jet velocity");
  } else if (orificeVel > Ve * 0.75) {
    flags.push("HIGH_ORIFICE_VELOCITY");
    warnings.push(`Orifice velocity ${orificeVel.toFixed(1)} m/s approaching API 14E erosional limit ${Ve.toFixed(1)} m/s.`);
  }

  const dpFraction = actualDP_bar > 0 && P1_bar > 0 ? actualDP_bar / P1_bar : 0;
  if (dpFraction > 0.5 && !flags.includes("HIGH_DP_FRACTION")) {
    flags.push("HIGH_DP_FRACTION");
    warnings.push(`ΔP/P₁ = ${(dpFraction * 100).toFixed(1)}% — single-stage pressure reduction is very high.`);
  }

  if (beta < input.betaMin || beta > input.betaMax) {
    flags.push("BETA_OUT_OF_RANGE");
    warnings.push(`β = ${beta.toFixed(4)} outside range [${input.betaMin.toFixed(2)}–${input.betaMax.toFixed(2)}]`);
    if (beta > input.betaMax) recommendations.push("Increase pipe size to reduce β");
    if (beta < input.betaMin) recommendations.push("Very small bore — verify with manufacturer (minimum practical ≈ 3 mm)");
  }

  if (Re > 0 && Re < 5000) {
    flags.push("LOW_REYNOLDS");
    warnings.push(`Re_d = ${Re.toFixed(0)} < 5000 — gas flow may be non-turbulent. Cd correlation uncertainty increases significantly.`);
  }

  if (thicknessRegime !== "thin plate") {
    flags.push("THICK_ORIFICE");
    warnings.push(`${thicknessRegime} — Cd corrected for plate thickness.`);
  }

  // Noise estimate
  const noiseSPL = estimateNoiseSPL(W_kgs, P1_Pa, P1_Pa - actualDP_bar * 1e5, D_mm, d_mm, rho1);
  if (noiseSPL > 0) {
    steps.push({ label: "Noise SPL (screening)", equation: "Simplified acoustic power model", value: noiseSPL.toFixed(0), unit: "dB(A) at 1m", eqId: "RO-G-29" });
    if (noiseSPL > 100) {
      flags.push("HIGH_NOISE_RISK");
      warnings.push(`Estimated SPL ≈ ${noiseSPL.toFixed(0)} dB(A) — very high noise level. Rigorous prediction required per API 521 / IEC 60534-8-3.`);
    } else if (noiseSPL > 85) {
      warnings.push(`Estimated SPL ≈ ${noiseSPL.toFixed(0)} dB(A) — noise may require mitigation. Verify with vendor acoustic prediction.`);
    }
  }

  // Multi-stage
  const numStages = Math.max(1, input.numStages || 1);
  const stages: StageResult[] = [];
  if (numStages > 1 && input.sizingMode === "sizeForFlow") {
    const stagePs = computeStageP(P1_bar, P1_bar - actualDP_bar, numStages, input.stageDistribution);
    for (const sp of stagePs) {
      const sP1_Pa    = sp.P1 * 1e5;
      const sP2_Pa    = sp.P2 * 1e5;
      const sPR       = sP2_Pa / sP1_Pa;
      const sIsChoked = sPR <= xCrit;
      const sRho1     = (sP1_Pa * MW) / (Z * R_UNIVERSAL * T_K);
      const fn_s = (d: number) => gasMassFlow(d, D_mm, sP1_Pa, T_K, MW, k, Z, Cd, sPR, sIsChoked, basisMode) - W_kgh;
      const sol_s = bisectionSolve(fn_s, 0.5, D_mm * 0.95, project.tolerance, project.maxIterations);
      const sBeta = (sol_s.root / 1000) / D_m;
      const sArea = PI / 4 * Math.pow(sol_s.root / 1000, 2);
      const sVel  = sArea > 0 && sRho1 > 0 ? W_kgs / (sRho1 * sArea) : 0;
      stages.push({
        stageNumber: stagePs.indexOf(sp) + 1,
        upstreamPressure: sp.P1, downstreamPressure: sp.P2,
        pressureDrop: sp.P1 - sp.P2, orificeDiameter: sol_s.root,
        betaRatio: sBeta, orificeVelocity: sVel,
        pressureRatioDP: sPR, isChoked: sIsChoked,
      });
    }
  }

  if (dpFraction > 0.40 && numStages <= 1) {
    flags.push("MULTI_STAGE_RECOMMENDED");
    const suggestedN = Math.max(2, Math.ceil(dpFraction / 0.30));
    recommendations.push(`Consider ${suggestedN}-stage restriction (ΔP/P₁ = ${(dpFraction*100).toFixed(0)}% > 40%). Use geometric pressure distribution to avoid choking per stage.`);
  }

  const stdBore     = roundToStandardBore(d_mm);
  const stdBoreArea = (PI / 4) * Math.pow(stdBore / 1000, 2) * 1e6;
  const stdBoreBeta = (stdBore / 1000) / D_m;

  const straightPipeRecs = straightPipeRecommendations(beta);

  // ── Isenthalpic flash (discharge temperature) via SRK ─────────────────────
  let dischargeTemperature: number | null = null;
  let dischargeTemperatureConverged = false;

  if (srkResult && input.composition && input.composition.length > 0) {
    try {
      const H_inlet   = srkResult.Hm; // kJ/kmol at upstream conditions
      const P_down    = P2_bar > 0 ? P2_bar : P1_bar - actualDP_bar;
      const flashFn   = eosMode === "pr" ? isenthalpicFlashPR : isenthalpicFlash;
      const flashResult = flashFn(
        input.composition, H_inlet, P_down, input.temperature,
      );
      dischargeTemperature = flashResult.T2_C;
      dischargeTemperatureConverged = flashResult.converged;
      const dT = dischargeTemperature - input.temperature;
      steps.push({
        label: "T discharge (isenthalpic flash)",
        equation: `${eosMode === "pr" ? "PR" : "SRK"} isenthalpic flash: H(T2,P2) = H(T1,P1) — bisection`,
        value: `${dischargeTemperature.toFixed(2)} °C  (ΔT = ${dT.toFixed(2)} °C)`,
        unit: "",
        eqId: "SRK-30",
      });
      if (!flashResult.converged) {
        warnings.push(`Isenthalpic flash did not fully converge (iter=${flashResult.iterations}). T_discharge = ${dischargeTemperature.toFixed(1)} °C is approximate.`);
      }
      if (dT < -50) {
        warnings.push(`Large discharge temperature drop ΔT = ${dT.toFixed(1)} °C — check for hydrate or wax formation.`);
        recommendations.push("Evaluate hydrate inhibition (e.g. MEG injection) if T_discharge is below hydrate formation temperature");
      }
    } catch {
      warnings.push("Isenthalpic flash for discharge temperature could not be computed.");
    }
  }

  return {
    phase: "gas", sizingMode: input.sizingMode,
    requiredDiameter: d_mm, orificeArea: A_mm2, betaRatio: beta,
    pressureDrop: actualDP_bar, permanentPressureLoss: permLoss,
    permanentPressureLossFraction: permFrac, recoveryFactor: recovFac,
    orificeVelocity: orificeVel, pipeVelocity: pipeVel, flowCoefficient: flowCoeff,
    massFlow: W_kgh, volFlow: rho1 > 0 ? W_kgh / rho1 : 0,
    standardBore: stdBore, standardBoreArea: stdBoreArea, standardBoreBeta: stdBoreBeta,
    pressureRatio, criticalPressureRatio: xCrit, isChoked,
    expansionFactor: Y_actual, criticalFlowFunction: fk,
    upstreamDensity: rho1, rSpecific: R_spec,
    reynoldsNumber: Re, reynoldsNumberPipe: Re_pipe, machNumber: machNo,
    sigma: 0, sigmaIncipient: 0, noiseLevelEstimate: noiseSPL, cdEffective: Cd,
    erosionalVelocity: Ve, erosionalVelocityRatio: Ve_ratio,
    numStages, stages, straightPipeRecs,
    calcSteps: steps, solverInfo, flags, warnings, recommendations,
    srkResult, dischargeTemperature, dischargeTemperatureConverged,
  };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function calculateRO(input: ROServiceInput, project: ROProject): ROResult {
  if (input.phase === "liquid") return calculateROLiquid(input, project);
  return calculateROGas(input, project);
}

// ─── Legacy Interfaces (backward compat) ─────────────────────────────────────

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
  return { requiredOrificeDiameter: r.requiredDiameter, orificeArea: r.orificeArea, betaRatio: r.betaRatio, velocity: r.orificeVelocity, pipeVelocity: r.pipeVelocity, pressureDrop: r.pressureDrop, flowCoefficient: r.flowCoefficient, warnings: r.warnings };
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
  return { requiredOrificeDiameter: r.requiredDiameter, orificeArea: r.orificeArea, betaRatio: r.betaRatio, pressureRatio: r.pressureRatio, criticalPressureRatio: r.criticalPressureRatio, isChoked: r.isChoked, velocity: r.orificeVelocity, warnings: r.warnings };
}

// ─── Test Cases ───────────────────────────────────────────────────────────────

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
  liquidProps: { density: 998.2, viscosity: 1.0, vaporPressure: 0.023 },
  stageDistribution: "geometric",
};

export const RO_GAS_SERVICE_TEST: ROServiceInput = {
  ...DEFAULT_SERVICE,
  phase: "gas", sizingMode: "sizeForFlow",
  massFlowRate: 5000, flowBasis: "mass",
  upstreamPressure: 30, downstreamPressure: 10, temperature: 40,
  gasProps: { molecularWeight: 18.5, specificHeatRatio: 1.27, compressibilityFactor: 0.92, viscosity: 0.012 },
  stageDistribution: "geometric",
};

// ─── Flag Metadata ────────────────────────────────────────────────────────────

export const FLAG_LABELS: Record<ROFlag, string> = {
  CHOKED_FLOW:               "CHOKED FLOW (SONIC GAS)",
  HIGH_NOISE_RISK:           "HIGH NOISE RISK",
  FLASHING_LIKELY:           "FLASHING LIKELY",
  CAVITATION_INCIPIENT:      "INCIPIENT CAVITATION",
  CAVITATION_SEVERE:         "SEVERE CAVITATION",
  TWO_PHASE_SUSPECTED:       "TWO-PHASE SUSPECTED UPSTREAM",
  BETA_OUT_OF_RANGE:         "β OUT OF RANGE",
  CD_ESTIMATED:              "Cd ESTIMATED (ISO 5167-2 RHG)",
  HIGH_DP_FRACTION:          "HIGH ΔP/P₁ RATIO",
  SOLVER_ISSUE:              "SOLVER CONVERGENCE ISSUE",
  NEAR_CHOKED:               "NEAR CHOKED CONDITIONS",
  HIGH_MACH:                 "HIGH MACH NUMBER (> 0.8)",
  HIGH_ORIFICE_VELOCITY:     "HIGH ORIFICE VELOCITY",
  EROSIONAL_VELOCITY_EXCEEDED: "API 14E EROSIONAL VELOCITY EXCEEDED",
  MULTI_STAGE_RECOMMENDED:   "MULTI-STAGE REDUCTION RECOMMENDED",
  THICK_ORIFICE:             "THICK ORIFICE PLATE — Cd CORRECTED",
  LOW_REYNOLDS:              "LOW REYNOLDS NUMBER (Re < 5000)",
};

export const FLAG_SEVERITY: Record<ROFlag, "critical" | "warning" | "info"> = {
  CHOKED_FLOW:               "critical",
  HIGH_NOISE_RISK:           "critical",
  FLASHING_LIKELY:           "critical",
  CAVITATION_INCIPIENT:      "warning",
  CAVITATION_SEVERE:         "critical",
  TWO_PHASE_SUSPECTED:       "critical",
  BETA_OUT_OF_RANGE:         "warning",
  CD_ESTIMATED:              "info",
  HIGH_DP_FRACTION:          "warning",
  SOLVER_ISSUE:              "critical",
  NEAR_CHOKED:               "info",
  HIGH_MACH:                 "warning",
  HIGH_ORIFICE_VELOCITY:     "warning",
  EROSIONAL_VELOCITY_EXCEEDED: "critical",
  MULTI_STAGE_RECOMMENDED:   "info",
  THICK_ORIFICE:             "info",
  LOW_REYNOLDS:              "warning",
};
