/**
 * Control Valve Sizing — Cv Calculator
 *
 * Basis: IEC 60534-informed preliminary sizing (screening tool only — not a substitute for
 * final vendor sizing per IEC 60534-2-1 / ISA S75.01 with confirmed fluid properties)
 * Reference: THINKTANK Technical Bulletin 1-I — Handbook for Control Valve Sizing
 *
 * 7-Tab Wizard Engine:
 *   Tab 1: Project Setup
 *   Tab 2: Service Data (liquid / gas-vapor / steam, min/normal/max operating points)
 *   Tab 3: Valve Type & Installation
 *   Tab 4: Sizing Calculations (per-point Cv, choked checks, viscosity correction)
 *   Tab 5: Valve Selection & Rating (opening %, rangeability, authority)
 *   Tab 6: Cavitation / Flashing / Noise Risk
 *   Tab 7: Results & Recommendations
 *
 * Key Equations (IEC 60534-2-1, Figure 4):
 *
 *   LIQUID — Normal flow (turbulent):
 *     Cv = 1.16 · qv / (Fp · √(ΔP / ρr))          [qv: m³/h, ΔP: bar, ρr = ρ1/999]
 *     Cv = qm    / (865 · Fp · √(ΔP · ρr))         [qm: kg/h]
 *     Numerically: N1 = 0.865 for qv [m³/h], ΔP [bar] → Cv [gpm]
 *
 *   LIQUID — Limit (choked) flow:
 *     ΔP_max = (FLP/Fp)² · (P1 − FF·Pv)
 *     Cv = 1.16 · qv_max / (FLP · √((P1 − FF·Pv) / ρr))
 *
 *   GAS/VAPOR — Normal flow (turbulent):
 *     Cv = qm / (N8 · Fp · P1 · Y · √(x · MW / (T1 · Z)))
 *     N8 = 94.8  for qm [kg/h], P1 [bar], T1 [K], MW [kg/kmol] → Cv [gpm]
 *
 *   GAS/VAPOR — Limit (choked) flow:
 *     x ≥ Fk · xTP  →  Y = 0.667 (minimum), x_sizing = Fk·xTP
 *
 *   Expansion factor: Y = 1 − x / (3 · Fk · xT · Fp²), clamped ≥ 0.667
 *   Fk = k / 1.4
 *   FF = 0.96 − 0.28 · √(Pv/Pc)
 *
 *   PIPING GEOMETRY FACTOR (IEC 60534, iterative):
 *     ΣK = K1 + K2 + KB1 + KB2 (same reducer/expander: ΣK = 1.5·(1−β²)²)
 *     Fp = 1 / √(1 + ΣK·Cv² / (N2·d⁴))   N2 = 0.00214, d [mm], Cv [gpm]
 *
 *   FLP (combined FL + Fp, for choked with reducers):
 *     FLP = FL / √(1 + FL²·K1'·Cv² / (N2·d⁴))
 *     where K1' = K1 + KB1 (upstream fitting only)
 *
 *   CAVITATION:
 *     Kc = 0.80 · FL²   (coefficient of constant cavitation, IEC 60534-2-2)
 *     σ  = (P1 − Pv) / ΔP   (service cavitation index)
 *     Cavitation: σ < Kc / (P1 − Pv) ≡ ΔP > Kc·(P1 − Pv)
 */

// ─── Types ────────────────────────────────────────────────────────────

export type FluidType = "liquid" | "gas" | "steam";
export type ValveStyle = "globe" | "ball" | "butterfly";
export type TrimCharacteristic = "equal_pct" | "linear" | "quick_open";
export type DataQuality = "preliminary" | "typical_vendor" | "confirmed_vendor";

export interface CVProject {
  name: string;
  client: string;
  location: string;
  caseId: string;
  engineer: string;
  date: string;
  dataQuality: DataQuality;
  atmosphericPressure: number;
}

export interface FluidPropsLiquid {
  density: number;
  viscosity: number;
  vaporPressure: number;
  criticalPressure: number;
}

export interface FluidPropsGas {
  molecularWeight: number;
  specificHeatRatio: number;
  compressibilityFactor: number;
  viscosity: number;
  criticalPressure: number;
}

export interface OperatingPoint {
  label: string;
  flowRate: number;
  flowUnit: "volumetric" | "mass";
  upstreamPressure: number;
  downstreamPressure: number;
  temperature: number;
  enabled: boolean;
}

export interface CVServiceData {
  fluidType: FluidType;
  fluidName: string;
  liquidProps: FluidPropsLiquid;
  gasProps: FluidPropsGas;
  operatingPoints: OperatingPoint[];
}

export interface CVValveData {
  style: ValveStyle;
  characteristic: TrimCharacteristic;
  ratedCv: number;
  fl: number;
  xt: number;
  fd: number;
  valveSize: number;
  pipeSize: number;
  rangeability: number;
}

export interface CVInstallation {
  hasReducers: boolean;
  upstreamPipeSize: number;
  downstreamPipeSize: number;
  fpOverride: number;
}

// ─── Results ──────────────────────────────────────────────────────────

export interface CVPointResult {
  label: string;
  cvRequired: number;
  deltaPActual: number;
  deltaPChoked: number;
  isChoked: boolean;
  flowRegime: string;
  fpFactor: number;
  flpFactor: number;
  ffFactor: number;
  fkFactor: number;
  xActual: number;
  xChoked: number;
  yFactor: number;
  viscosityCorrection: number;
  openingPercent: number;
  velocity: number;
  cavitationIndex: number;
  kcFactor: number;
  warnings: string[];
}

export interface CVSizingResult {
  pointResults: CVPointResult[];
  governingPoint: string;
  governingCv: number;
  warnings: string[];
}

export interface CVSelectionResult {
  ratedCv: number;
  cvRatio: number;
  openings: { label: string; pctOpen: number; cv: number }[];
  minOpening: number;
  maxOpening: number;
  rangeabilityOK: boolean;
  authorityScreeningEstimate: number;
  warnings: string[];
}

export interface CVRiskAssessment {
  cavitationRisk: "none" | "incipient" | "likely" | "severe";
  flashingRisk: boolean;
  chokedGas: boolean;
  highNoiseRisk: boolean;
  twoPhaseRisk: boolean;
  cavitationIndex: number;
  mitigations: string[];
  warnings: string[];
}

export interface CVFinalResult {
  project: CVProject;
  serviceData: CVServiceData;
  valveData: CVValveData;
  sizingResult: CVSizingResult;
  selectionResult: CVSelectionResult;
  riskAssessment: CVRiskAssessment;
  flags: string[];
  actionItems: string[];
}

// ─── Legacy interfaces (backward compat) ──────────────────────────────

export interface CVLiquidInput {
  flowRate: number;
  liquidDensity: number;
  upstreamPressure: number;
  downstreamPressure: number;
  vaporPressure: number;
  criticalPressure: number;
  pipeSize: number;
  valveSize: number;
  fl: number;
}

export interface CVLiquidResult {
  cvRequired: number;
  cvChoked: number;
  fpFactor: number;
  ffFactor: number;
  deltaPActual: number;
  deltaPChoked: number;
  isChoked: boolean;
  flowRegime: string;
  warnings: string[];
}

export interface CVGasInput {
  massFlowRate: number;
  molecularWeight: number;
  upstreamPressure: number;
  downstreamPressure: number;
  temperature: number;
  compressibilityFactor: number;
  specificHeatRatio: number;
  pipeSize: number;
  valveSize: number;
  xt: number;
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

// ─── IEC 60534 Numerical Constants ────────────────────────────────────

/**
 * N1 = 0.865: Liquid volumetric Cv equation
 *   Cv = qv / (N1 · Fp · √(ΔP/ρr))
 *   qv [m³/h], ΔP [bar], ρr = ρ1/999 [−] → Cv [gpm]
 *   Source: IEC 60534-2-1 / ISA-75.01 Table 1
 */
const N1 = 0.865;

/**
 * N8 = 94.8: Gas/vapor mass-flow Cv equation
 *   Cv = qm / (N8 · Fp · P1 · Y · √(x · MW / (T1 · Z)))
 *   qm [kg/h], P1 [bar], T1 [K], MW [kg/kmol] → Cv [gpm]
 *   Source: IEC 60534-2-1 / ISA-75.01 Table 1
 *   NOTE: P1 appears linearly in denominator, NOT under square root.
 */
const N8 = 94.8;

/**
 * N2 = 0.00214: Piping geometry factor equation
 *   Fp = 1 / √(1 + ΣK · Cv² / (N2 · d⁴))
 *   Cv [gpm], d [mm] → Fp [−]
 *   Source: IEC 60534-2-1 (equivalent to N2=890 for d in inches)
 */
const N2 = 0.00214;

/** Reference density of water at 15.5°C per IEC 60534 (ρ₀) */
const RHO_REF = 999;

// ─── Steam & Valve Data ────────────────────────────────────────────────

export const STEAM_PROPS: FluidPropsGas = {
  molecularWeight: 18.015,
  specificHeatRatio: 1.3,
  compressibilityFactor: 0.95,
  viscosity: 0.012,
  criticalPressure: 220.64,
};

/**
 * Typical valve defaults per IEC 60534-2-1, Figure 15 (Table of FL, xT, Fd).
 * Globe single-port, flow-to-open: FL=0.90, xT=0.72, Fd=0.46
 * Ball:       FL=0.60, xT=0.50, Fd=0.10
 * Butterfly:  FL=0.67, xT=0.35, Fd=0.57 (eccentric shaft, 70°)
 */
const TYPICAL_VALVE_DATA: Record<ValveStyle, { fl: number; xt: number; fd: number; rangeability: number }> = {
  globe:     { fl: 0.90, xt: 0.72, fd: 0.46, rangeability: 50  },
  ball:      { fl: 0.60, xt: 0.50, fd: 0.10, rangeability: 100 },
  butterfly: { fl: 0.67, xt: 0.35, fd: 0.57, rangeability: 30  },
};

// ─── Core IEC 60534 Equations ─────────────────────────────────────────

/**
 * FF: Liquid critical pressure ratio factor (IEC 60534-2-1, §5.5)
 *   FF = 0.96 − 0.28 · √(Pv/Pc)
 *   Pv [bar abs], Pc [bar abs] → FF [−]
 */
function liquidCriticalPressureRatio(Pv_bar: number, Pc_bar: number): number {
  if (Pc_bar <= 0) return 0.96;
  return 0.96 - 0.28 * Math.sqrt(Math.max(0, Pv_bar / Pc_bar));
}

/**
 * Compute resistance coefficients for reducer/expander per IEC 60534-2-1, Figure 11.
 *   K1 (inlet reducer)  = 0.5 · (1 − (d/D1)²)²
 *   K2 (outlet expander)= 1.0 · (1 − (d/D2)²)²
 *   KB1 = 1 − (d/D1)⁴   (Bernoulli, inlet)
 *   KB2 = -(1 − (d/D2)⁴) (Bernoulli, outlet, negative for expander)
 * For same d/D: ΣK = K1+K2+KB1+KB2 = 1.5·(1−β²)² (KB1+KB2 cancel)
 * Returns {sumK, K1prime} where K1prime = K1+KB1 (upstream only, for FLP)
 */
function computeResistanceCoeffs(
  valveSize_mm: number,
  upstreamPipe_mm: number,
  downstreamPipe_mm: number,
): { sumK: number; K1prime: number } {
  if (valveSize_mm <= 0) return { sumK: 0, K1prime: 0 };
  const betaUp = Math.min(valveSize_mm / upstreamPipe_mm, 1.0);
  const betaDn = Math.min(valveSize_mm / downstreamPipe_mm, 1.0);
  const K1  = 0.5 * Math.pow(1 - betaUp * betaUp, 2);
  const K2  = 1.0 * Math.pow(1 - betaDn * betaDn, 2);
  const KB1 =  1 - Math.pow(betaUp, 4);
  const KB2 = -(1 - Math.pow(betaDn, 4));
  return {
    sumK: K1 + K2 + KB1 + KB2,
    K1prime: K1 + KB1,
  };
}

/**
 * Fp: Piping geometry factor (IEC 60534-2-1, §5.3)
 *   Fp = 1 / √(1 + ΣK · Cv² / (N2 · d⁴))
 *   d = valve size [mm], Cv [gpm], N2 = 0.00214
 *   Returns 1.0 when no reducers or Cv=0.
 */
function computeFp(sumK: number, Cv_gpm: number, valveSize_mm: number): number {
  if (sumK <= 0 || Cv_gpm <= 0 || valveSize_mm <= 0) return 1.0;
  const d4 = Math.pow(valveSize_mm, 4);
  return 1.0 / Math.sqrt(1 + sumK * Cv_gpm * Cv_gpm / (N2 * d4));
}

/**
 * FLP: Combined liquid pressure recovery + piping geometry factor (IEC 60534-2-1, §5.4)
 *   FLP = FL / √(1 + FL²·K1'·Cv² / (N2·d⁴))
 *   K1' = K1 + KB1 (upstream fitting only)
 *   Used for ΔP_max with reducers: ΔP_max = (FLP/Fp)²·(P1 − FF·Pv)
 */
function computeFLP(FL: number, K1prime: number, Cv_gpm: number, valveSize_mm: number): number {
  if (K1prime <= 0 || Cv_gpm <= 0 || valveSize_mm <= 0) return FL;
  const d4 = Math.pow(valveSize_mm, 4);
  return FL / Math.sqrt(1 + FL * FL * K1prime * Cv_gpm * Cv_gpm / (N2 * d4));
}

/**
 * xTP: Pressure differential ratio factor with reducers (IEC 60534-2-1, §5.8)
 *   xTP = xT / (Fp² · (1 + xT·K1'·Cv² / (N2·d⁴)))
 *   Iterative — uses current Cv estimate.
 */
function computeXTP(xT: number, Fp: number, K1prime: number, Cv_gpm: number, valveSize_mm: number): number {
  if (K1prime <= 0 || Cv_gpm <= 0 || valveSize_mm <= 0) return xT;
  const d4 = Math.pow(valveSize_mm, 4);
  const correction = 1 + xT * K1prime * Cv_gpm * Cv_gpm / (N2 * d4);
  return xT / (Fp * Fp * correction);
}

function estimateOpening(requiredCv: number, ratedCv: number, characteristic: TrimCharacteristic): number {
  if (ratedCv <= 0 || requiredCv <= 0) return 0;
  const ratio = Math.min(requiredCv / ratedCv, 1.0);
  switch (characteristic) {
    case "equal_pct": return ratio > 0 ? Math.max(0, Math.min(100, 100 + (100 / Math.log(50)) * Math.log(ratio))) : 0;
    case "linear":    return ratio * 100;
    case "quick_open":return Math.sqrt(ratio) * 100;
    default:          return ratio * 100;
  }
}

function estimateVelocity(flowRate: number, pipeSize_mm: number, fluidType: FluidType, density: number): number {
  if (pipeSize_mm <= 0) return 0;
  const D_m = pipeSize_mm / 1000;
  const A = Math.PI * D_m * D_m / 4;
  if (A <= 0) return 0;
  return fluidType === "liquid" ? (flowRate / 3600) / A : (flowRate / 3600) / (density * A);
}

// ─── Per-Point Sizing Functions ────────────────────────────────────────

/**
 * Liquid Cv per IEC 60534-2-1, Figure 4 (turbulent flow).
 *
 * Normal flow:  Cv = qv / (N1 · Fp · √(ΔP / ρr))
 * Choked flow:  Cv = 1.16 · qv / (FLP · √((P1 − FF·Pv) / ρr))
 *               ΔP_max = (FLP/Fp)² · (P1 − FF·Pv)
 *
 * Iterative Fp/FLP (3 iterations per IEC 60534 practice).
 *
 * @param point    - Operating point (SI: qv [m³/h], P [bar abs], T [°C])
 * @param props    - Liquid properties (ρ [kg/m³], μ [cP], Pv [kPa], Pc [bar])
 * @param fl       - Pressure recovery factor FL [−]
 * @param valveSize_mm  - Valve nominal size [mm] (0 = same as pipe)
 * @param pipeUp_mm    - Upstream pipe ID [mm]
 * @param pipeDn_mm    - Downstream pipe ID [mm]
 */
export function computeLiquidPoint(
  point: OperatingPoint,
  props: FluidPropsLiquid,
  fl: number,
  valveSize_mm: number,
  pipeUp_mm: number,
  pipeDn_mm: number,
  fpOverride?: number,
): CVPointResult {
  const warnings: string[] = [];
  const P1    = point.upstreamPressure;
  const P2    = point.downstreamPressure;
  const dP    = P1 - P2;

  if (dP <= 0) throw new Error(`${point.label}: P1 must exceed P2`);
  if (P1 <= 0) throw new Error(`${point.label}: P1 must be positive (absolute pressure)`);

  // Vapor pressure: stored in kPa, convert to bar abs
  const Pv_bar = props.vaporPressure / 100;
  const Pc     = props.criticalPressure;
  const FL     = fl;
  const Gf     = props.density / RHO_REF;            // = ρr (relative density)
  const FF     = liquidCriticalPressureRatio(Pv_bar, Pc);
  // Kc: coefficient of constant cavitation per IEC 60534-2-2 (§5.2)
  const Kc     = 0.80 * FL * FL;

  // Determine effective valve size for reducer calcs
  const d_mm   = valveSize_mm > 0 ? valveSize_mm : Math.min(pipeUp_mm, pipeDn_mm);
  const hasReducers = valveSize_mm > 0 && (valveSize_mm < pipeUp_mm * 0.99 || valveSize_mm < pipeDn_mm * 0.99);
  const { sumK, K1prime } = hasReducers
    ? computeResistanceCoeffs(d_mm, pipeUp_mm, pipeDn_mm)
    : { sumK: 0, K1prime: 0 };

  // Iterative Fp/FLP computation (3 iterations, starting Fp=1)
  // If fpOverride is provided, Fp is fixed; FLP is still computed from valve/pipe geometry.
  const useManualFp = fpOverride !== undefined && fpOverride > 0 && fpOverride <= 1.0;
  if (useManualFp) {
    warnings.push(
      `Manual Fp override = ${fpOverride!.toFixed(3)} applied. ` +
      "Cv is computed using this Fp directly; FLP is still derived from piping geometry. " +
      "Confirm Fp value against vendor datasheet or IEC 60534-2-1 Annex A."
    );
  }

  let Fp  = useManualFp ? fpOverride! : 1.0;
  let FLP = FL;
  let Cv  = 0;

  for (let iter = 0; iter < 3; iter++) {
    // Choked ΔP with reducers: ΔP_max = (FLP/Fp)² · (P1 − FF·Pv)
    const dP_choked_with_fp = (FLP / Fp) * (FLP / Fp) * (P1 - FF * Pv_bar);
    const dP_choked = Math.max(dP_choked_with_fp, 0.001);
    const dP_sizing = Math.min(dP, dP_choked);
    const isChoked  = dP >= dP_choked;

    if (isChoked) {
      // Choked: use FLP in denominator (1/N1 ≈ 1.156 per IEC 60534-2-1 Table 1)
      Cv = (1 / N1) * point.flowRate / (FLP * Math.sqrt(Math.max((P1 - FF * Pv_bar) / Gf, 0.001)));
    } else {
      // Normal: Cv = qv / (N1 · Fp · √(ΔP/ρr))
      Cv = point.flowRate / (N1 * Fp * Math.sqrt(dP_sizing / Gf));
    }

    // Recompute Fp and FLP with this Cv estimate
    if (hasReducers && Cv > 0) {
      if (!useManualFp) Fp = computeFp(sumK, Cv, d_mm);
      FLP = computeFLP(FL, K1prime, Cv, d_mm);
    }
  }

  // Final choked check with converged Fp/FLP
  const dP_choked = Math.max((FLP / Fp) * (FLP / Fp) * (P1 - FF * Pv_bar), 0.001);
  const isChoked  = dP >= dP_choked;

  // Viscosity correction (Reynolds number factor FR) per IEC 60534-2-1, §5.9
  // Simplified Rev estimate using velocity approach; full iterative Rev per IEC 60534 requires Fd (vendor data).
  let viscCorr = 1.0;
  if (props.viscosity > 20 && Cv > 0) {
    // Approximate valve Reynolds number via Q, Cv, viscosity
    // Rev ≈ N1·Fp·Cv·√(ΔP/ρr) / (ν) — simplified without Fd term
    const nu_m2s   = (props.viscosity / 1000) / props.density;           // kinematic viscosity [m²/s]
    const velocity  = Cv > 0 ? point.flowRate / (3600 * Math.PI * (d_mm / 1000) ** 2 / 4) : 0; // m/s
    const RevSimple = velocity > 0 && nu_m2s > 0 ? (velocity * d_mm / 1000) / nu_m2s : 50000;
    if (RevSimple > 0 && RevSimple < 10000) {
      const FR = Math.min(1.0, Math.max(0.1, 0.026 * Math.pow(RevSimple, 0.67)));
      if (FR < 0.99) {
        viscCorr = 1 / FR;
        Cv = Cv * viscCorr;
        warnings.push(`Viscosity correction applied: FR = ${FR.toFixed(3)}, Rev ≈ ${RevSimple.toFixed(0)} — non-turbulent flow per IEC 60534-2-1 §4.4. Full correction requires vendor Fd value.`);
      }
    }
  }

  // ─── Warnings ───────────────────────────────────────────────────────
  if (isChoked) {
    warnings.push(
      `Flow is CHOKED (ΔP = ${dP.toFixed(2)} bar ≥ ΔP_max = ${dP_choked.toFixed(2)} bar) — ` +
      "valve at maximum capacity. Increasing ΔP will not increase flow. Consider a larger valve or higher upstream pressure."
    );
  }

  if (P2 < Pv_bar) {
    warnings.push(
      `FLASHING: Downstream P2 (${P2.toFixed(2)} bar abs) < Pv (${Pv_bar.toFixed(2)} bar abs). ` +
      "Liquid will flash to vapor downstream. Use hardened trim (stellite grade 6) and size downstream piping for two-phase flow."
    );
  }

  // Cavitation assessment using Kc per IEC 60534-2-2 (§5.2)
  const sigma = (P1 > Pv_bar && dP > 0) ? (P1 - Pv_bar) / dP : 999;
  if (P1 > Pv_bar && !isChoked) {
    if (sigma < Kc) {
      warnings.push(
        `SEVERE CAVITATION RISK: σ = ${sigma.toFixed(3)} < Kc = ${Kc.toFixed(3)} (Kc = 0.80·FL², approximate per IEC 60534-2-2). ` +
        "Constant bubble cavitation regime likely. Anti-cavitation or multi-stage trim may be required — verify with vendor cavitation data (σ_mr, σ_id per IEC 60534-2-2)."
      );
    } else if (sigma < FL * FL) {
      warnings.push(
        `CAVITATION LIKELY: σ = ${sigma.toFixed(3)} < FL² = ${(FL*FL).toFixed(3)}. ` +
        "Flow exceeds incipient cavitation limit. Specify anti-cavitation trim (cage-guided, multi-stage)."
      );
    } else if (sigma < FL * FL * 1.15) {
      warnings.push(
        `INCIPIENT CAVITATION: σ = ${sigma.toFixed(3)} approaches FL² = ${(FL*FL).toFixed(3)} (IEC 60534-2-2). ` +
        "Monitor vibration and noise; consider anti-cavitation trim."
      );
    }
  }

  if (FL < 0.5) {
    warnings.push(
      `Low FL = ${FL.toFixed(2)} — high-recovery valve (ball/butterfly). ` +
      "Cavitation risk is significantly higher than for globe valves. Verify against IEC 60534-2-2 cavitation limits."
    );
  }

  const dpRatio = dP / P1;
  if (dpRatio > 0.5 && !isChoked) {
    warnings.push(`High ΔP/P1 = ${(dpRatio*100).toFixed(0)}% — approaching choked conditions. Review system ΔP budget.`);
  }
  if (dpRatio < 0.02) {
    warnings.push(`Very low ΔP/P1 = ${(dpRatio*100).toFixed(1)}% — poor control authority. Verify whether a control valve is appropriate.`);
  }
  if (Cv > 10000) {
    warnings.push(`Very large Cv = ${Cv.toFixed(0)} — verify valve can be sourced. Consider parallel valves or larger body.`);
  }
  if (hasReducers && Fp < 0.95) {
    warnings.push(
      `Piping reducers reduce effective capacity: Fp = ${Fp.toFixed(3)}. ` +
      "Consider matching valve size to pipe size to eliminate Fp correction."
    );
  }

  return {
    label: point.label, cvRequired: Cv, deltaPActual: dP, deltaPChoked: dP_choked,
    isChoked, flowRegime: isChoked ? "Choked (Cavitating/Flashing)" : "Normal (Subcritical)",
    fpFactor: Fp, flpFactor: FLP, ffFactor: FF, fkFactor: 0,
    xActual: 0, xChoked: 0, yFactor: 1,
    viscosityCorrection: viscCorr, openingPercent: 0, velocity: 0,
    cavitationIndex: isFinite(sigma) ? sigma : 0,
    kcFactor: Kc,
    warnings,
  };
}

/**
 * Gas/Vapor Cv per IEC 60534-2-1, Figure 4 (turbulent flow).
 *
 * Normal flow:
 *   Y = 1 − x / (3 · Fk · xTP · Fp²)  [clamped to 0.667]
 *   Cv = qm / (N8 · Fp · P1 · Y · √(x · MW / (T1 · Z)))
 *
 * Choked flow (x ≥ Fk · xTP):
 *   Y = 0.667, x_sizing = Fk · xTP
 *   Cv = qm / (N8 · Fp · P1 · 0.667 · √(Fk · xTP · MW / (T1 · Z)))
 *
 * Key: P1 is LINEAR in denominator (not under square root).
 * N8 = 94.8 for qm [kg/h], P1 [bar], T1 [K], MW [kg/kmol] → Cv [gpm]
 *
 * @param point    - Operating point (P1, P2 [bar abs], T [°C], flow [kg/h or Nm³/h])
 * @param props    - Gas properties (MW [kg/kmol], k, Z, viscosity [cP])
 * @param xt       - Pressure differential ratio factor at choked flow [−]
 * @param valveSize_mm  - Valve nominal size [mm]
 * @param pipeUp_mm    - Upstream pipe ID [mm]
 * @param pipeDn_mm    - Downstream pipe ID [mm]
 */
export function computeGasPoint(
  point: OperatingPoint,
  props: FluidPropsGas,
  xt: number,
  valveSize_mm: number,
  pipeUp_mm: number,
  pipeDn_mm: number,
  fpOverride?: number,
): CVPointResult {
  const warnings: string[] = [];
  const P1   = point.upstreamPressure;
  const P2   = point.downstreamPressure;
  const dP   = P1 - P2;
  const T_K  = point.temperature + 273.15;

  if (dP <= 0) throw new Error(`${point.label}: P1 must exceed P2`);
  if (P1 <= 0) throw new Error(`${point.label}: P1 must be positive (absolute pressure)`);
  if (T_K <= 0) throw new Error(`${point.label}: Temperature must be above absolute zero`);

  // Convert volumetric (Normal Nm³/h at 0°C, 1.01325 bar per ISO 13443) to mass flow if needed.
  // Molar volume at 0°C, 1.01325 bar (STP) = 22.414 m³/kmol.
  const W_kgh = point.flowUnit === "mass"
    ? point.flowRate
    : point.flowRate * props.molecularWeight / 22.414;

  const Fk  = props.specificHeatRatio / 1.4;
  const x   = dP / P1;

  // Determine valve size for reducer calcs
  const d_mm = valveSize_mm > 0 ? valveSize_mm : Math.min(pipeUp_mm, pipeDn_mm);
  const hasReducers = valveSize_mm > 0 && (valveSize_mm < pipeUp_mm * 0.99 || valveSize_mm < pipeDn_mm * 0.99);
  const { sumK, K1prime } = hasReducers
    ? computeResistanceCoeffs(d_mm, pipeUp_mm, pipeDn_mm)
    : { sumK: 0, K1prime: 0 };

  // Iterative Fp/xTP (3 iterations)
  // If fpOverride is provided, Fp is fixed; xTP is still computed from geometry.
  const useManualFpGas = fpOverride !== undefined && fpOverride > 0 && fpOverride <= 1.0;
  if (useManualFpGas) {
    warnings.push(
      `Manual Fp override = ${fpOverride!.toFixed(3)} applied. ` +
      "xTP is still derived from piping geometry. Confirm Fp against vendor data or IEC 60534-2-1 Annex A."
    );
  }

  let Fp   = useManualFpGas ? fpOverride! : 1.0;
  let xTP  = xt;
  let Cv   = 0;

  for (let iter = 0; iter < 3; iter++) {
    const x_choked = Fk * xTP;
    const x_sizing = Math.min(x, x_choked);
    const isChoked = x >= x_choked;

    // Y = 1 − x_sizing / (3 · Fk · xTP · Fp²)  — per IEC 60534-2-1 §5.6
    const Y_raw = 1 - x_sizing / (3 * Fk * xTP * Fp * Fp);
    const Y     = Math.max(2/3, Y_raw);

    // IEC 60534-2-1 gas Cv: Cv = W / (N8 · Fp · P1 · Y · √(x_sizing · MW / (T · Z)))
    // N8 = 94.8, P1 linear in denominator
    const innerSqrt = Math.sqrt(Math.max(x_sizing * props.molecularWeight / (T_K * props.compressibilityFactor), 1e-12));
    Cv = W_kgh / (N8 * Fp * P1 * Y * innerSqrt);

    // Recompute Fp, xTP with this Cv estimate
    if (hasReducers && Cv > 0) {
      if (!useManualFpGas) Fp = computeFp(sumK, Cv, d_mm);
      xTP = computeXTP(xt, Fp, K1prime, Cv, d_mm);
    }
  }

  const x_choked = Fk * xTP;
  const x_sizing = Math.min(x, x_choked);
  const isChoked = x >= x_choked;
  const Y_raw    = 1 - x_sizing / (3 * Fk * xTP * Fp * Fp);
  const Y        = Math.max(2/3, Y_raw);

  // ─── Warnings ───────────────────────────────────────────────────────
  if (isChoked) {
    warnings.push(
      `Flow is CHOKED: x = ${x.toFixed(3)} ≥ Fk·xTP = ${x_choked.toFixed(3)}. ` +
      "Critical (sonic) flow at vena contracta. Y = 0.667 (minimum). Reducing P2 will not increase flow. " +
      "Consider multi-stage trim or larger valve."
    );
  }

  if (Y < 0.667 + 0.01) {
    warnings.push(
      `Expansion factor Y = ${Y.toFixed(3)} at minimum (0.667 per IEC 60534-2-1 §5.6). ` +
      "Valve operating at choked limit — vendor noise prediction strongly recommended per IEC 60534-8-3."
    );
  }

  if (x > 0.8) {
    warnings.push(
      `Very high pressure ratio x = ${x.toFixed(3)} (x/xT = ${(x/(Fk*xt)).toFixed(2)}) — ` +
      "sonic velocity and aerodynamic noise likely (screening indication only). Vendor noise prediction recommended per IEC 60534-8-3 before final design."
    );
  } else if (x > 0.5 && !isChoked) {
    warnings.push(
      `Elevated pressure ratio x = ${x.toFixed(3)} — noise risk screening indicator. Verify with vendor noise prediction per IEC 60534-8-3, especially near occupied areas.`
    );
  }
  if (x < 0.05) {
    warnings.push(`Very low pressure ratio x = ${x.toFixed(3)} — poor control resolution. Verify turndown and controllability.`);
  }

  if (props.compressibilityFactor < 0.7) {
    warnings.push(
      `Low Z = ${props.compressibilityFactor.toFixed(3)} — gas significantly non-ideal. ` +
      "Verify Z with rigorous EOS (Peng-Robinson or SRK) at operating conditions."
    );
  }

  if (Cv > 10000) {
    warnings.push(`Very large Cv = ${Cv.toFixed(0)} — verify valve availability. Consider parallel valve arrangement.`);
  }

  if (hasReducers && Fp < 0.95) {
    warnings.push(`Piping reducers reduce effective capacity: Fp = ${Fp.toFixed(3)}. xTP = ${xTP.toFixed(3)} (reduced from xT = ${xt.toFixed(3)}).`);
  }

  const dP_choked_equiv = x_choked * P1;
  return {
    label: point.label, cvRequired: Cv, deltaPActual: dP, deltaPChoked: dP_choked_equiv,
    isChoked, flowRegime: isChoked ? "Choked (Critical/Sonic)" : "Subcritical",
    fpFactor: Fp, flpFactor: 0, ffFactor: 0, fkFactor: Fk,
    xActual: x, xChoked: x_choked, yFactor: Y,
    viscosityCorrection: 1.0, openingPercent: 0, velocity: 0,
    cavitationIndex: 0, kcFactor: 0,
    warnings,
  };
}

/**
 * Steam Cv — uses gas equations with approximate steam properties.
 * IMPORTANT: Treat as preliminary only. Verify with steam tables for final design.
 */
export function computeSteamPoint(
  point: OperatingPoint,
  xt: number,
  valveSize_mm: number,
  pipeUp_mm: number,
  pipeDn_mm: number,
  fpOverride?: number,
  customProps?: Partial<FluidPropsGas>,
): CVPointResult {
  const props: FluidPropsGas = { ...STEAM_PROPS, ...customProps };
  const result = computeGasPoint(point, props, xt, valveSize_mm, pipeUp_mm, pipeDn_mm, fpOverride);
  result.warnings.push(
    "Steam sizing uses approximate properties (MW=18.015, k=1.3, Z=0.95). " +
    "Verify with steam tables (IAPWS-IF97) for final design."
  );
  return result;
}

// ─── Multi-Point Sizing ────────────────────────────────────────────────

export function computeMultiPointSizing(
  serviceData: CVServiceData,
  valveData: CVValveData,
  installation: CVInstallation,
): CVSizingResult {
  const warnings: string[] = [];

  // Resolve pipe sizes for Fp/FLP calcs
  const pipeUp = installation.upstreamPipeSize > 0 ? installation.upstreamPipeSize : valveData.pipeSize;
  const pipeDn = installation.downstreamPipeSize > 0 ? installation.downstreamPipeSize : valveData.pipeSize;
  const valveD = valveData.valveSize > 0 ? valveData.valveSize : 0;

  // Override Fp if user provided one
  const useManualFp = installation.fpOverride > 0 && installation.fpOverride <= 1.0;

  const enabledPoints = serviceData.operatingPoints.filter(p => p.enabled);
  if (enabledPoints.length === 0) throw new Error("At least one operating point must be enabled");

  const fpOverrideVal = useManualFp ? installation.fpOverride : undefined;

  const pointResults: CVPointResult[] = enabledPoints.map(point => {
    // Validate inputs
    if (point.flowRate <= 0) throw new Error(`${point.label}: Flow rate must be positive`);
    if (point.upstreamPressure <= 0) throw new Error(`${point.label}: P1 must be positive (absolute pressure)`);
    if (point.upstreamPressure <= point.downstreamPressure) throw new Error(`${point.label}: P1 must exceed P2`);

    let result: CVPointResult;

    switch (serviceData.fluidType) {
      case "liquid":
        result = computeLiquidPoint(
          point, serviceData.liquidProps, valveData.fl,
          valveD, pipeUp, pipeDn, fpOverrideVal,
        );
        result.velocity = estimateVelocity(point.flowRate, valveData.pipeSize, "liquid", serviceData.liquidProps.density);
        break;
      case "gas":
        result = computeGasPoint(point, serviceData.gasProps, valveData.xt, valveD, pipeUp, pipeDn, fpOverrideVal);
        break;
      case "steam":
        result = computeSteamPoint(point, valveData.xt, valveD, pipeUp, pipeDn, fpOverrideVal);
        break;
    }

    if (valveData.ratedCv > 0) {
      result.openingPercent = estimateOpening(result.cvRequired, valveData.ratedCv, valveData.characteristic);
    }

    return result;
  });

  // Find governing (maximum Cv) point
  let governingIdx = 0;
  for (let i = 1; i < pointResults.length; i++) {
    if (pointResults[i].cvRequired > pointResults[governingIdx].cvRequired) governingIdx = i;
  }

  const govCv = pointResults[governingIdx].cvRequired;

  if (pointResults.length > 1) {
    const minCv = Math.min(...pointResults.map(p => p.cvRequired));
    if (govCv > 0 && govCv / Math.max(minCv, 0.001) > 50) {
      warnings.push("Wide Cv range (>50:1) across operating points — consider split-range or two valves for better controllability.");
    }
  }

  return {
    pointResults,
    governingPoint: pointResults[governingIdx].label,
    governingCv: govCv,
    warnings,
  };
}

// ─── Selection & Risk ─────────────────────────────────────────────────

export function computeValveSelection(
  sizingResult: CVSizingResult,
  valveData: CVValveData,
): CVSelectionResult {
  const warnings: string[] = [];
  const ratedCv = valveData.ratedCv;

  if (ratedCv <= 0) {
    return {
      ratedCv: 0, cvRatio: 0, openings: [], minOpening: 0, maxOpening: 0,
      rangeabilityOK: false, authorityScreeningEstimate: 0,
      warnings: ["No rated Cv entered — enter vendor valve data for selection check"],
    };
  }

  const cvRatio = sizingResult.governingCv / ratedCv;
  if (cvRatio > 1.0) warnings.push(`Governing Cv (${sizingResult.governingCv.toFixed(1)}) exceeds rated Cv (${ratedCv}) — select a larger valve`);
  if (cvRatio > 0.9) warnings.push("Valve operating very close to rated capacity — limited control margin. Recommend Cv margin ≥ 10–25% over governing Cv.");
  if (cvRatio < 0.1) warnings.push("Valve heavily oversized (utilization < 10%) — consider smaller body size to improve controllability.");

  const openings = sizingResult.pointResults.map(pr => ({
    label: pr.label,
    pctOpen: estimateOpening(pr.cvRequired, ratedCv, valveData.characteristic),
    cv: pr.cvRequired,
  }));

  const minOpen = Math.min(...openings.map(o => o.pctOpen));
  const maxOpen = Math.max(...openings.map(o => o.pctOpen));

  if (minOpen < 10) warnings.push(`Min opening ${minOpen.toFixed(1)}% — poor controllability below 10% stroke. Valve may hunt or oscillate.`);
  if (maxOpen > 90) warnings.push(`Max opening ${maxOpen.toFixed(1)}% — limited control authority above 90% stroke.`);

  const requiredTurndown = openings.length > 1
    ? Math.max(...openings.map(o => o.cv)) / Math.max(Math.min(...openings.map(o => o.cv)), 0.001)
    : 1;
  const rangeabilityOK = requiredTurndown <= valveData.rangeability;
  if (!rangeabilityOK) {
    warnings.push(`Required turndown ${requiredTurndown.toFixed(0)}:1 exceeds valve rangeability ${valveData.rangeability}:1. Consider valve with higher rangeability or two valves.`);
  }

  const normalPt = sizingResult.pointResults.find(p => p.label === "Normal") || sizingResult.pointResults[0];
  const dPValveNormal = normalPt.deltaPActual;
  const dPMaxSystem   = Math.max(...sizingResult.pointResults.map(p => p.deltaPActual));
  // Heuristic: total system ΔP ≈ 2 × max valve ΔP (not rigorous — assumes valve takes ~50% of system drop)
  const dPSystemEst   = dPMaxSystem * 2;
  const authorityScreeningEstimate = dPSystemEst > 0 ? dPValveNormal / dPSystemEst : 0;
  if (authorityScreeningEstimate < 0.25) {
    warnings.push(
      `Low valve authority screening estimate (${(authorityScreeningEstimate*100).toFixed(0)}%) — heuristic indicator only. ` +
      "Target >25% for good control. Authority = ΔP_valve_normal / ΔP_system_estimated (where ΔP_system ≈ 2×max valve ΔP — confirm with actual system curve)."
    );
  }

  return { ratedCv, cvRatio, openings, minOpening: minOpen, maxOpening: maxOpen, rangeabilityOK, authorityScreeningEstimate, warnings };
}

export function computeRiskAssessment(
  serviceData: CVServiceData,
  sizingResult: CVSizingResult,
  valveData: CVValveData,
): CVRiskAssessment {
  const warnings: string[] = [];
  const mitigations: string[] = [];
  let cavitationRisk: CVRiskAssessment["cavitationRisk"] = "none";
  let flashingRisk  = false;
  let chokedGas     = false;
  let highNoiseRisk = false;
  let twoPhaseRisk  = false;
  let cavitationIndex = 0;

  if (serviceData.fluidType === "liquid") {
    const lp     = serviceData.liquidProps;
    const Pv_bar = lp.vaporPressure / 100;
    const FL     = valveData.fl;
    const FL2    = FL * FL;
    const Kc     = 0.80 * FL2;

    for (const pr of sizingResult.pointResults) {
      const op = serviceData.operatingPoints.find(p => p.label === pr.label);
      const P1 = op?.upstreamPressure || 0;
      const P2 = op?.downstreamPressure || 0;
      const dP = P1 - P2;
      const sigma = (P1 > Pv_bar && dP > 0) ? (P1 - Pv_bar) / dP : 999;

      if (sigma < 999) cavitationIndex = Math.min(cavitationIndex || sigma, sigma);

      if (P2 < Pv_bar) {
        flashingRisk = true;
        warnings.push(
          `${pr.label}: FLASHING — P2 (${P2.toFixed(2)} bar abs) < Pv (${Pv_bar.toFixed(2)} bar abs). ` +
          "Downstream piping must be sized for two-phase (flashing) service."
        );
        mitigations.push("Use hardened trim materials (stellite grade 6, tungsten carbide) — cavitation resistance index ref. IEC 60534 Figure 9");
        mitigations.push("Consider relocating valve to increase downstream backpressure");
        mitigations.push("Size downstream piping for two-phase (flashing) flow with appropriate velocity limits");
      }

      // Cavitation per IEC 60534-2-2 using Kc and FL²
      if (sigma < Kc) {
        cavitationRisk = "severe";
        warnings.push(
          `${pr.label}: SEVERE CAVITATION RISK — σ = ${sigma.toFixed(3)} < Kc = ${Kc.toFixed(3)} (Kc = 0.80·FL², approximate per IEC 60534-2-2). ` +
          "Constant bubble cavitation regime likely — risk of erosion damage. Anti-cavitation or multi-stage trim may be required; verify with vendor cavitation data (σ_mr, σ_id per IEC 60534-2-2)."
        );
        mitigations.push("Use multi-stage anti-cavitation trim (cage-guided, labyrinth) — obtain vendor σ_mr and σ_id values");
        mitigations.push("Install restriction orifice downstream to increase P2 and raise σ above Kc");
        mitigations.push("Consider cascaded valves (two in series) to split pressure drop");
        mitigations.push("Select valve type with higher FL (e.g., characterized globe) — verify per IEC 60534-2-2");
      } else if (sigma < FL2) {
        cavitationRisk = cavitationRisk === "severe" ? "severe" : "likely";
        warnings.push(
          `${pr.label}: CAVITATION LIKELY — σ = ${sigma.toFixed(3)} < FL² = ${FL2.toFixed(3)} per IEC 60534-2-2. ` +
          "Incipient-to-constant cavitation. Specify anti-cavitation trim."
        );
        mitigations.push("Specify anti-cavitation trim — obtain vendor cavitation coefficients (σ_mr, σ_id, xFZ)");
      } else if (sigma < FL2 * 1.15) {
        const cr = cavitationRisk as string;
        cavitationRisk = (cr === "severe" || cr === "likely") ? cavitationRisk : "incipient";
        warnings.push(
          `${pr.label}: INCIPIENT CAVITATION — σ = ${sigma.toFixed(3)} approaches FL² = ${FL2.toFixed(3)} (IEC 60534-2-2). ` +
          "Monitor vibration and noise at commissioning."
        );
        mitigations.push("Monitor vibration and acoustic emission at commissioning; consider anti-cavitation trim if noise is observed");
      }

      if (pr.isChoked) {
        twoPhaseRisk = true;
        mitigations.push("Choked liquid flow may produce two-phase conditions downstream — verify pipe supports for vibration and acoustic fatigue per IEC 60534-8-4 / ASME B31.3 Appendix X");
      }
    }
  }

  if (serviceData.fluidType === "gas" || serviceData.fluidType === "steam") {
    for (const pr of sizingResult.pointResults) {
      if (pr.isChoked) {
        chokedGas     = true;
        highNoiseRisk = true;
        warnings.push(
          `${pr.label}: CHOKED GAS FLOW — sonic velocity at vena contracta (screening indication). Y = 0.667. ` +
          "Vendor noise prediction recommended per IEC 60534-8-3 before final design."
        );
        mitigations.push("Install downstream diffuser/silencer for noise attenuation — verify per IEC 60534-8-3");
        mitigations.push("Evaluate multi-stage low-noise trim to reduce per-stage pressure ratio below Fk·xT — obtain vendor data");
        mitigations.push("Check pipe wall thickness for acoustic fatigue if SPL likely >110 dBA — per IEC 60534-8-4 / project fatigue criteria");
      }
      if (pr.xActual > 0.5 && !pr.isChoked) {
        highNoiseRisk = true;
        warnings.push(
          `${pr.label}: Elevated pressure ratio x = ${pr.xActual.toFixed(3)} — aerodynamic noise risk (screening indication only). ` +
          "Vendor noise prediction recommended per IEC 60534-8-3."
        );
        mitigations.push("Request vendor noise prediction per IEC 60534-8-3 — screening only, not a substitute for vendor acoustic analysis");
        mitigations.push("Consider low-noise trim (multi-path, multi-stage) if vendor predicted noise >85 dBA");
      } else if (pr.xActual > 0.3 && pr.xActual <= 0.5) {
        warnings.push(`${pr.label}: Moderate pressure ratio x = ${pr.xActual.toFixed(3)} — standard noise screening recommended.`);
      }
    }
  }

  const uniqueMitigations = Array.from(new Set(mitigations));
  return { cavitationRisk, flashingRisk, chokedGas, highNoiseRisk, twoPhaseRisk, cavitationIndex, mitigations: uniqueMitigations, warnings };
}

export function buildFinalResult(
  project: CVProject,
  serviceData: CVServiceData,
  valveData: CVValveData,
  installation: CVInstallation,
): CVFinalResult {
  const sizingResult    = computeMultiPointSizing(serviceData, valveData, installation);
  const selectionResult = computeValveSelection(sizingResult, valveData);
  const riskAssessment  = computeRiskAssessment(serviceData, sizingResult, valveData);

  const flags: string[] = [];
  if (riskAssessment.flashingRisk)                 flags.push("FLASHING");
  if (riskAssessment.cavitationRisk !== "none")    flags.push(`CAVITATION (${riskAssessment.cavitationRisk.toUpperCase()})`);
  if (riskAssessment.chokedGas)                    flags.push("CHOKED GAS");
  if (riskAssessment.highNoiseRisk)                flags.push("HIGH NOISE RISK");
  if (riskAssessment.twoPhaseRisk)                 flags.push("TWO-PHASE RISK");
  if (project.dataQuality === "preliminary")        flags.push("PRELIMINARY PROPERTIES");
  if (valveData.ratedCv <= 0)                      flags.push("MISSING VENDOR Cv RATING");
  if (sizingResult.pointResults.some(p => p.viscosityCorrection > 1)) flags.push("VISCOSITY CORRECTION USED");

  const actionItems: string[] = [];
  actionItems.push(`Governing point: ${sizingResult.governingPoint} → Required Cv = ${sizingResult.governingCv.toFixed(1)} gpm`);

  if (valveData.ratedCv > 0) {
    const util = (selectionResult.cvRatio * 100).toFixed(0);
    actionItems.push(`Selected valve rated Cv = ${valveData.ratedCv} (utilization = ${util}%)`);
    if (selectionResult.cvRatio > 0.9) actionItems.push("Valve near full capacity — confirm rated Cv includes appropriate safety margin with vendor");
    if (selectionResult.cvRatio < 0.15) actionItems.push("Valve significantly oversized — review body size selection to improve controllability");
  } else {
    actionItems.push(`Select valve with rated Cv ≥ ${(sizingResult.governingCv * 1.25).toFixed(0)} (recommended 25% margin over governing Cv per IEC 60534)`);
  }
  actionItems.push("Obtain confirmed vendor FL, xT, Fd, xFZ, Kc values and re-run sizing for final design");
  actionItems.push("Confirm fluid properties at actual operating conditions (ρ, μ, Pv, Pc, k, Z, MW)");

  if (serviceData.fluidType === "liquid") {
    actionItems.push("Verify vapor pressure (Pv) and critical pressure (Pc) at operating temperature for accurate choked flow/cavitation assessment");
    if (riskAssessment.flashingRisk)                   actionItems.push("Flashing service: specify hardened trim materials (stellite grade 6) and size downstream piping for two-phase flow");
    if (riskAssessment.cavitationRisk === "incipient")  actionItems.push("Incipient cavitation: request vendor cavitation data (σ_mr, σ_id, xFZ) per IEC 60534-2-2");
    if (riskAssessment.cavitationRisk === "likely" || riskAssessment.cavitationRisk === "severe")
      actionItems.push("Cavitation service: specify multi-stage anti-cavitation trim (cage-guided, labyrinth) or evaluate cascaded valve arrangement");
    if (riskAssessment.twoPhaseRisk) actionItems.push("Two-phase risk downstream: verify pipe supports for vibration and check downstream erosion allowance");
  }

  if (serviceData.fluidType === "gas" || serviceData.fluidType === "steam") {
    if (riskAssessment.highNoiseRisk) actionItems.push("Request vendor noise prediction per IEC 60534-8-3. If >85 dBA, specify low-noise trim or downstream silencer.");
    if (riskAssessment.chokedGas)     actionItems.push("Choked gas flow: evaluate multi-stage trim to reduce per-stage pressure ratio below Fk·xT. Check pipe wall for acoustic fatigue per IEC 60534-8-4.");
    actionItems.push("Verify compressibility factor (Z) with rigorous EOS (Peng-Robinson or SRK) at actual operating conditions");
  }

  if (serviceData.fluidType === "steam") {
    actionItems.push("Verify steam properties (superheat, quality, enthalpy) with steam tables (IAPWS-IF97) — this tool uses approximate values");
  }

  if (project.dataQuality === "preliminary") {
    actionItems.push("Data quality is preliminary — re-run sizing when confirmed process data is available");
  }

  return { project, serviceData, valveData, sizingResult, selectionResult, riskAssessment, flags, actionItems };
}

// ─── Legacy Functions (backward compat) ───────────────────────────────

export function pipingGeometryFactor(pipeSize_mm: number, valveSize_mm: number): number {
  if (valveSize_mm <= 0 || valveSize_mm >= pipeSize_mm) return 1.0;
  const { sumK } = computeResistanceCoeffs(valveSize_mm, pipeSize_mm, pipeSize_mm);
  // Approximate without Cv (use Cv=100 as typical estimate for initial sizing)
  return computeFp(sumK, 100, valveSize_mm);
}

export function calculateCVLiquid(input: CVLiquidInput): CVLiquidResult {
  const warnings: string[] = [];
  const P1   = input.upstreamPressure;
  const P2   = input.downstreamPressure;
  const dP   = P1 - P2;

  if (dP <= 0) throw new Error("Upstream pressure must exceed downstream pressure");
  if (P1 <= 0) throw new Error("Upstream pressure must be positive");

  const Pv_bar   = input.vaporPressure / 100;
  const Pc       = input.criticalPressure;
  const FL       = input.fl;
  const Gf       = input.liquidDensity / RHO_REF;
  const FF       = liquidCriticalPressureRatio(Pv_bar, Pc);
  const Kc       = 0.80 * FL * FL;
  const Fp       = pipingGeometryFactor(input.pipeSize, input.valveSize);
  const dP_choked = Math.max(FL * FL * (P1 - FF * Pv_bar), 0.001);
  const dP_sizing = Math.min(dP, dP_choked);
  const isChoked  = dP >= dP_choked;

  const Cv = input.flowRate / (N1 * Fp * Math.sqrt(dP_sizing / Gf));

  if (isChoked) warnings.push(`Flow is CHOKED (ΔP = ${dP.toFixed(2)} bar ≥ ΔP_max = ${dP_choked.toFixed(2)} bar) — maximum capacity reached per IEC 60534`);
  if (Cv > 10000) warnings.push(`Very large Cv (${Cv.toFixed(0)}) — verify valve can be sourced.`);
  if (P2 < Pv_bar) warnings.push(`Downstream P (${P2.toFixed(2)} bar) < Pv (${Pv_bar.toFixed(2)} bar) — flashing will occur downstream.`);
  if (FL < 0.5) warnings.push(`Low FL (${FL.toFixed(2)}) — high recovery valve. Elevated cavitation risk.`);

  const sigma = P1 > Pv_bar && dP > 0 ? (P1 - Pv_bar) / dP : 999;
  if (sigma < Kc && sigma < 999) warnings.push(`SEVERE CAVITATION: σ = ${sigma.toFixed(3)} < Kc = ${Kc.toFixed(3)} (Kc = 0.80·FL²) per IEC 60534-2-2.`);
  else if (sigma < FL * FL && sigma < 999) warnings.push(`Cavitation likely: σ = ${sigma.toFixed(3)} < FL² = ${(FL*FL).toFixed(3)} per IEC 60534-2-2.`);

  const Cv_choked = input.flowRate / (N1 * Fp * Math.sqrt(dP_choked / Gf));

  return {
    cvRequired: Cv, cvChoked: Cv_choked, fpFactor: Fp, ffFactor: FF,
    deltaPActual: dP, deltaPChoked: dP_choked, isChoked,
    flowRegime: isChoked ? "Choked (Cavitating/Flashing)" : "Normal (Sub-critical)", warnings,
  };
}

export function calculateCVGas(input: CVGasInput): CVGasResult {
  const warnings: string[] = [];
  const P1  = input.upstreamPressure;
  const P2  = input.downstreamPressure;
  const dP  = P1 - P2;
  const T_K = input.temperature + 273.15;

  if (dP <= 0) throw new Error("Upstream pressure must exceed downstream pressure");
  if (P1 <= 0) throw new Error("Upstream pressure must be positive");

  const Fp       = pipingGeometryFactor(input.pipeSize, input.valveSize);
  const Fk       = input.specificHeatRatio / 1.4;
  const x        = dP / P1;
  const x_choked = Fk * input.xt * Fp * Fp;
  const x_sizing = Math.min(x, x_choked);
  const isChoked = x >= x_choked;
  const Y        = Math.max(2/3, 1 - x_sizing / (3 * Fk * input.xt * Fp * Fp));

  // CORRECT formula: P1 is LINEAR in denominator, not under square root
  const Cv = input.massFlowRate / (N8 * Fp * P1 * Y * Math.sqrt(x_sizing * input.molecularWeight / (T_K * input.compressibilityFactor)));

  if (isChoked) warnings.push(`Flow is CHOKED: x = ${x.toFixed(3)} ≥ Fk·xT = ${x_choked.toFixed(3)}. Y = 0.667 (minimum).`);
  if (Y <= 2/3 + 0.01) warnings.push(`Expansion factor Y = ${Y.toFixed(3)} at minimum (0.667 per IEC 60534-2-1).`);
  if (x > 0.8) warnings.push(`Very high x = ${x.toFixed(3)} — aerodynamic noise likely. Request vendor noise prediction per IEC 60534-8-3.`);
  if (x < 0.05) warnings.push(`Very low x = ${x.toFixed(3)} — poor control resolution.`);
  if (input.compressibilityFactor < 0.7) warnings.push(`Low Z = ${input.compressibilityFactor.toFixed(3)} — significantly non-ideal gas. Verify with rigorous EOS.`);

  return { cvRequired: Cv, xActual: x, xChoked: x_choked, yFactor: Y, fkFactor: Fk, fpFactor: Fp, isChoked, warnings };
}

// ─── Defaults & Test Cases ────────────────────────────────────────────

export const DEFAULT_PROJECT: CVProject = {
  name: "", client: "", location: "", caseId: "", engineer: "",
  date: new Date().toISOString().split("T")[0],
  dataQuality: "preliminary", atmosphericPressure: 1.01325,
};

export const DEFAULT_LIQUID_PROPS: FluidPropsLiquid = {
  density: 998.2, viscosity: 1.0, vaporPressure: 2.338, criticalPressure: 220.64,
};

export const DEFAULT_GAS_PROPS: FluidPropsGas = {
  molecularWeight: 18.5, specificHeatRatio: 1.27, compressibilityFactor: 0.92,
  viscosity: 0.012, criticalPressure: 46.0,
};

export const DEFAULT_VALVE_DATA: CVValveData = {
  style: "globe", characteristic: "equal_pct", ratedCv: 0,
  fl: 0.90, xt: 0.72, fd: 0.46, valveSize: 0, pipeSize: 154.08, rangeability: 50,
};

export const DEFAULT_INSTALLATION: CVInstallation = {
  hasReducers: false, upstreamPipeSize: 154.08, downstreamPipeSize: 154.08, fpOverride: 0,
};

export function getDefaultOperatingPoints(): OperatingPoint[] {
  return [
    { label: "Min",    flowRate: 0, flowUnit: "volumetric", upstreamPressure: 0, downstreamPressure: 0, temperature: 25, enabled: true },
    { label: "Normal", flowRate: 0, flowUnit: "volumetric", upstreamPressure: 0, downstreamPressure: 0, temperature: 25, enabled: true },
    { label: "Max",    flowRate: 0, flowUnit: "volumetric", upstreamPressure: 0, downstreamPressure: 0, temperature: 25, enabled: true },
  ];
}

export function getDefaultServiceData(): CVServiceData {
  return {
    fluidType: "liquid", fluidName: "",
    liquidProps: { ...DEFAULT_LIQUID_PROPS },
    gasProps: { ...DEFAULT_GAS_PROPS },
    operatingPoints: getDefaultOperatingPoints(),
  };
}

export const TYPICAL_VALVE_DEFAULTS = TYPICAL_VALVE_DATA;

// ─── Test Cases ────────────────────────────────────────────────────────

export const CV_TEST_CASE = {
  project: {
    name: "Cooling Water Control", client: "ACME Refinery", location: "Cairo, Egypt",
    caseId: "CV-001", engineer: "", date: new Date().toISOString().split("T")[0],
    dataQuality: "preliminary" as DataQuality, atmosphericPressure: 1.01325,
  },
  serviceData: {
    fluidType: "liquid" as FluidType, fluidName: "Cooling Water",
    liquidProps: { density: 998.2, viscosity: 1.0, vaporPressure: 2.338, criticalPressure: 220.64 },
    gasProps: { ...DEFAULT_GAS_PROPS },
    operatingPoints: [
      { label: "Min",    flowRate: 30,  flowUnit: "volumetric" as const, upstreamPressure: 10, downstreamPressure: 7, temperature: 20, enabled: true },
      { label: "Normal", flowRate: 100, flowUnit: "volumetric" as const, upstreamPressure: 10, downstreamPressure: 5, temperature: 20, enabled: true },
      { label: "Max",    flowRate: 150, flowUnit: "volumetric" as const, upstreamPressure: 10, downstreamPressure: 4, temperature: 20, enabled: true },
    ],
  },
  valveData: {
    style: "globe" as ValveStyle, characteristic: "equal_pct" as TrimCharacteristic,
    ratedCv: 200, fl: 0.90, xt: 0.72, fd: 0.46, valveSize: 0, pipeSize: 154.08, rangeability: 50,
  },
  installation: { ...DEFAULT_INSTALLATION },
};

export const CV_GAS_TEST = {
  project: {
    name: "Natural Gas Letdown", client: "Gas Plant", location: "Cairo, Egypt",
    caseId: "CV-002", engineer: "", date: new Date().toISOString().split("T")[0],
    dataQuality: "preliminary" as DataQuality, atmosphericPressure: 1.01325,
  },
  serviceData: {
    fluidType: "gas" as FluidType, fluidName: "Natural Gas",
    liquidProps: { ...DEFAULT_LIQUID_PROPS },
    gasProps: { molecularWeight: 16.5, specificHeatRatio: 1.27, compressibilityFactor: 0.88, viscosity: 0.011, criticalPressure: 46.0 },
    operatingPoints: [
      { label: "Min",    flowRate: 10000, flowUnit: "mass" as const, upstreamPressure: 80, downstreamPressure: 72, temperature: 20, enabled: true },
      { label: "Normal", flowRate: 25000, flowUnit: "mass" as const, upstreamPressure: 80, downstreamPressure: 65, temperature: 20, enabled: true },
      { label: "Max",    flowRate: 40000, flowUnit: "mass" as const, upstreamPressure: 80, downstreamPressure: 55, temperature: 20, enabled: true },
    ],
  },
  valveData: {
    style: "globe" as ValveStyle, characteristic: "equal_pct" as TrimCharacteristic,
    ratedCv: 0, fl: 0.90, xt: 0.72, fd: 0.46, valveSize: 0, pipeSize: 154.08, rangeability: 50,
  },
  installation: { ...DEFAULT_INSTALLATION },
};
