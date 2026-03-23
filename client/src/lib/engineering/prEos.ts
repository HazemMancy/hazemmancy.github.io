/**
 * Peng-Robinson (1976/1978) Equation of State — Mixture Property Engine
 *
 * Implements:
 *   PR EoS:          Peng & Robinson (1976), Ind. Eng. Chem. Fundam. 15(1), 59–64
 *                    κ extension: Peng & Robinson (1978) for ω > 0.491
 *   Mixing rules:    Van der Waals (classical), same as SRK
 *   BIP:             Chueh & Prausnitz (1967), AIChE J. 13(6), 1099–1107
 *   Gas viscosity:   Lee, Gonzalez & Eakin (1966), JPT, 997–1000  (shared with SRK)
 *   Residual H:      PR departure function — Poling et al. (2001) §6-5
 *   Isenthalpic flash: bisection on T at fixed P until H(T2,P2) = H(T1,P1)
 *
 * Key differences from SRK:
 *   Ωa = 0.45724  (SRK: 0.42748)
 *   Ωb = 0.07780  (SRK: 0.08664)
 *   κ  = 0.37464 + 1.54226ω − 0.26992ω²  (ω ≤ 0.491, PR76)
 *        0.379642 + 1.48503ω − 0.164423ω² + 0.016666ω³  (ω > 0.491, PR78)
 *   Residual departure uses ln[(Z+(1+√2)B)/(Z+(1−√2)B)] / (2√2·bm)
 *     instead of SRK's ln(Vm/(Vm+bm)) / bm
 *
 * Industry context: PR is the dominant EoS for O&G hydrocarbon systems.
 *   Gives better Z and ρ for gas phase than SRK; used as default in
 *   HYSYS, Pro/II, UniSim, Aspen Plus (oil & gas option sets).
 *
 * R = 0.08314 m³·bar/kmol·K throughout.
 * All ai in [m⁶·bar/kmol²], bi in [m³/kmol], P in [bara], T in [K]
 */

import {
  COMPONENT_DB, type CompositionEntry,
  type SRKMixtureResult, type SRKCalcStep, type SRKComponentResult,
  leeViscosity, R_SRK,
} from "./srkEos";

const T_REF = 298.15; // K — reference temperature for ideal-gas enthalpy
const SQRT2 = Math.sqrt(2);
const OA   = 0.45724; // PR Ωa
const OB   = 0.07780; // PR Ωb

// ─── PR κ Parameter ───────────────────────────────────────────────────────────

/**
 * PR κ parameter:
 *   PR76 (ω ≤ 0.491): κ = 0.37464 + 1.54226·ω − 0.26992·ω²
 *   PR78 (ω > 0.491): κ = 0.379642 + 1.48503·ω − 0.164423·ω² + 0.016666·ω³
 *   Ref: Peng & Robinson (1976) Eq. 17; (1978) correction for heavier hydrocarbons.
 */
function prKappa(omega: number): number {
  if (omega <= 0.491) {
    return 0.37464 + 1.54226 * omega - 0.26992 * omega * omega;
  }
  // PR78 extension
  return 0.379642 + 1.48503 * omega - 0.164423 * omega * omega + 0.016666 * omega * omega * omega;
}

// ─── PR α(T) Function ─────────────────────────────────────────────────────────

/**
 * PR α(T) = [1 + κ·(1 − √(T/Tc))]²
 * Identical in form to SRK α but uses PR κ.
 * Ref: Peng & Robinson (1976) Eq. 12–13
 */
function prAlpha(T_K: number, Tc_K: number, kappa: number): number {
  const sqrtTr = Math.sqrt(T_K / Tc_K);
  const q = 1 + kappa * (1 - sqrtTr);
  return q * q;
}

// ─── PR Component Parameters ai, bi, dai_dT ──────────────────────────────────

/** ai = Ωa·R²·Tc²/Pc·α(T)   [m⁶·bar/kmol²] */
function prAi(Tc_K: number, Pc_bara: number, alpha: number): number {
  return OA * R_SRK * R_SRK * Tc_K * Tc_K / Pc_bara * alpha;
}

/** bi = Ωb·R·Tc/Pc   [m³/kmol] */
function prBi(Tc_K: number, Pc_bara: number): number {
  return OB * R_SRK * Tc_K / Pc_bara;
}

/**
 * dai/dT = Ωa·R²·Tc²/Pc · dα/dT
 * dα/dT  = −κ/√(T·Tc) · [1 + κ(1−√Tr)] = −κ·√α / √(T·Tc)
 * Ref: Peng & Robinson (1976) Eq. 18; Poling et al. (2001) §6-5
 */
function prDai_dT(T_K: number, Tc_K: number, Pc_bara: number, kappa: number, alpha: number): number {
  const aci = OA * R_SRK * R_SRK * Tc_K * Tc_K / Pc_bara;
  const dAlpha_dT = -kappa * Math.sqrt(alpha) / Math.sqrt(T_K * Tc_K);
  return aci * dAlpha_dT;
}

// ─── Chueh-Prausnitz BIP (identical to SRK) ───────────────────────────────────

/**
 * kij = 1 − 8·√(Vci·Vcj) / (Vci^(1/3) + Vcj^(1/3))³
 * Chueh & Prausnitz (1967). Applicable for both PR and SRK.
 */
function bipCP(Vc_i: number, Vc_j: number): number {
  if (Math.abs(Vc_i - Vc_j) < 1e-9) return 0;
  const sumCbrt = Math.pow(Vc_i, 1 / 3) + Math.pow(Vc_j, 1 / 3);
  const kij = 1 - 8 * Math.sqrt(Vc_i * Vc_j) / Math.pow(sumCbrt, 3);
  return Math.max(0, kij);
}

// ─── Van der Waals Mixing Rules ───────────────────────────────────────────────

/**
 * am = ΣΣ xi·xj·√(ai·aj)·(1−kij)   [VdW mixing]
 * bm = Σ  xi·bi
 * dam_dT via analytical cross-derivative (same formula as SRK mixing)
 * Ref: Peng & Robinson (1976) Eq. 20–22
 */
function vdwMixingPR(
  comps: SRKComponentResult[],
  kijMatrix: number[][],
): { am: number; bm: number; dam_dT: number } {
  const n = comps.length;
  let am = 0; let dam_dT = 0; let bm = 0;

  for (let i = 0; i < n; i++) {
    bm += comps[i].xi * comps[i].bi;
    for (let j = 0; j < n; j++) {
      const sqrtAiAj = Math.sqrt(comps[i].ai * comps[j].ai);
      const aij = sqrtAiAj * (1 - kijMatrix[i][j]);
      am += comps[i].xi * comps[j].xi * aij;
      if (sqrtAiAj > 0) {
        const daij_dT = (1 - kijMatrix[i][j]) * sqrtAiAj *
          (comps[i].dai_dT / (2 * comps[i].ai) + comps[j].dai_dT / (2 * comps[j].ai));
        dam_dT += comps[i].xi * comps[j].xi * daij_dT;
      }
    }
  }
  return { am, bm, dam_dT };
}

// ─── PR Cubic Z-equation Solver ───────────────────────────────────────────────

/**
 * Solve PR cubic in Z:
 *   Z³ − (1−B)·Z² + (A−3B²−2B)·Z − (AB−B²−B³) = 0
 *
 * where A = am·P/(R²T²), B = bm·P/(R·T)
 * Ref: Peng & Robinson (1976) Eq. 8; Poling et al. (2001) Table 4-9.
 *
 * Solved via Cardano depressed cubic: Z = t − (1−B)/3
 * Returns all real roots > B (physically required: Vm = ZRT/P > bm).
 */
function solvePRCubic(A: number, B: number): number[] {
  // Z³ + c1·Z² + c2·Z + c3 = 0
  const c1 = -(1 - B);               // coeff of Z²
  const c2 = A - 3 * B * B - 2 * B; // coeff of Z
  const c3 = -(A * B - B * B - B * B * B); // constant

  // Depress: Z = t − c1/3
  const p = c2 - c1 * c1 / 3;
  const q = c3 - c1 * c2 / 3 + 2 * c1 * c1 * c1 / 27;
  const disc = q * q / 4 + p * p * p / 27;

  let roots: number[] = [];

  if (disc > 1e-15) {
    // One real root
    const sqrtDisc = Math.sqrt(disc);
    const u = Math.cbrt(-q / 2 + sqrtDisc);
    const v = Math.cbrt(-q / 2 - sqrtDisc);
    roots = [u + v - c1 / 3];
  } else if (Math.abs(disc) <= 1e-15) {
    // Three real roots, at least two equal
    const u = Math.cbrt(-q / 2);
    roots = [2 * u - c1 / 3, -u - c1 / 3];
  } else {
    // Three distinct real roots (casus irreducibilis)
    const r = Math.sqrt(-p * p * p / 27);
    const theta = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
    const rCbrt = Math.cbrt(r);
    roots = [
      2 * rCbrt * Math.cos(theta / 3) - c1 / 3,
      2 * rCbrt * Math.cos((theta + 2 * Math.PI) / 3) - c1 / 3,
      2 * rCbrt * Math.cos((theta + 4 * Math.PI) / 3) - c1 / 3,
    ];
  }

  // Physical filter: Z > B (Vm > bm)
  return roots.filter(z => z > B + 1e-8).sort((a, b) => a - b);
}

// ─── PR Residual Enthalpy ─────────────────────────────────────────────────────

/**
 * PR residual molar enthalpy departure from ideal gas at same (T, P):
 *   Hres = R·T·(Z−1) + (T·dam_dT − am)/(2√2·bm) × ln[(Z+(1+√2)·B)/(Z+(1−√2)·B)]
 *
 * Units: multiply by 100 to convert m³·bar/kmol → kJ/kmol (1 m³·bar = 100 kJ)
 * Ref: Peng & Robinson (1976) Eq. 24; Poling et al. (2001) Eq. 6-5.5
 */
function prResidualEnthalpy(
  T_K: number, Z: number, bm: number, am: number, dam_dT: number, B: number,
): number {
  const RTZ1 = R_SRK * T_K * (Z - 1) * 100; // kJ/kmol

  const num = T_K * dam_dT - am;
  const denom = 2 * SQRT2 * bm;

  const argUpper = Z + (1 + SQRT2) * B;
  const argLower = Z + (1 - SQRT2) * B;

  if (denom === 0 || argLower <= 0 || argUpper <= 0) return RTZ1;

  const logTerm = Math.log(argUpper / Math.max(argLower, 1e-12));
  const departure = (num / denom) * logTerm * 100; // kJ/kmol

  return RTZ1 + departure;
}

// ─── Ideal-Gas Enthalpy (shared formula) ─────────────────────────────────────

function idealMolarEnthalpyPR(comps: SRKComponentResult[], T_K: number): { Hid: number; Cp_mix: number } {
  let Hf = 0; let Cp_mix = 0;
  for (const c of comps) {
    const db = COMPONENT_DB[c.id];
    if (!db) continue;
    Hf     += c.xi * db.Hf;
    Cp_mix += c.xi * db.Cp;
  }
  return { Hid: Hf + Cp_mix * (T_K - T_REF), Cp_mix };
}

// ─── Main PR Solver ───────────────────────────────────────────────────────────

/**
 * Compute PR EoS mixture properties at given (T, P, composition).
 * Returns the same SRKMixtureResult shape so it can be used interchangeably
 * with computeSRKProperties() in the restriction orifice engine.
 *
 * @param composition  Array of { componentId, moleFraction }
 * @param T_C          Temperature [°C]
 * @param P_bara       Pressure [bara]
 * @returns SRKMixtureResult (PR basis — fields labelled accordingly in steps)
 */
export function computePRProperties(
  composition: CompositionEntry[],
  T_C: number,
  P_bara: number,
): SRKMixtureResult {
  const steps: SRKCalcStep[] = [];
  const warnings: string[] = [];

  const T_K = T_C + 273.15;

  // ── Validate ────────────────────────────────────────────────────────────────
  if (T_K <= 0)      throw new Error(`Temperature must be positive (got ${T_K.toFixed(1)} K)`);
  if (P_bara <= 0)   throw new Error(`Pressure must be positive (got ${P_bara.toFixed(3)} bara)`);
  if (composition.length === 0) throw new Error("Composition is empty");

  const active = composition.filter(c => c.moleFraction > 0 && COMPONENT_DB[c.componentId]);
  if (active.length === 0) throw new Error("No valid components with non-zero mole fractions");

  const xSum = active.reduce((s, c) => s + c.moleFraction, 0);
  if (Math.abs(xSum - 1) > 0.02) {
    warnings.push(`Mole fractions sum to ${(xSum * 100).toFixed(2)}% — normalizing to 100%.`);
  }

  // ── Mixture MW ──────────────────────────────────────────────────────────────
  let MWm = 0;
  const normed = active.map(c => ({ ...c, moleFraction: c.moleFraction / xSum }));
  for (const c of normed) MWm += c.moleFraction * COMPONENT_DB[c.componentId].MW;

  steps.push({ label: "──── PR EoS (Peng-Robinson 1976/1978) ────", equation: "P = RT/(V−b) − a(T)/[V(V+b)+b(V−b)]", value: "", unit: "", eqId: "PR-00" });
  steps.push({ label: "T upstream", equation: "T[K] = T[°C] + 273.15", value: T_K.toFixed(2), unit: "K", eqId: "PR-01" });
  steps.push({ label: "P upstream", equation: "", value: P_bara.toFixed(3), unit: "bara", eqId: "PR-02" });
  steps.push({ label: "MWm = Σxi·MWi", equation: "", value: MWm.toFixed(3), unit: "kg/kmol", eqId: "PR-03" });

  // ── Per-component PR parameters ─────────────────────────────────────────────
  const comps: SRKComponentResult[] = [];
  for (const c of normed) {
    const db = COMPONENT_DB[c.componentId];
    const xi = c.moleFraction;
    const Tr = T_K / db.Tc;
    const kap = prKappa(db.omega);
    const alp = prAlpha(T_K, db.Tc, kap);
    const ai  = prAi(db.Tc, db.Pc, alp);
    const bi  = prBi(db.Tc, db.Pc);
    const dai = prDai_dT(T_K, db.Tc, db.Pc, kap, alp);
    comps.push({ id: c.componentId, name: db.name, xi, Tr, sqrtTr: Math.sqrt(Tr), mi: kap, alpha: alp, ai, bi, dai_dT: dai });
  }

  steps.push({ label: "κ (PR κ-parameters)", equation: "κ = 0.37464+1.54226ω−0.26992ω² (PR76); extended PR78 for ω>0.491", value: comps.map(c => `${c.id}:${c.mi.toFixed(4)}`).join(", "), unit: "—", eqId: "PR-04" });
  steps.push({ label: "α(T) = [1+κ(1−√Tr)]²", equation: "Peng-Robinson α function", value: comps.map(c => `${c.id}:${c.alpha.toFixed(4)}`).join(", "), unit: "—", eqId: "PR-05" });
  steps.push({ label: "ai = Ωa·R²·Tc²/Pc·α", equation: "Ωa = 0.45724", value: comps.map(c => `${c.id}:${c.ai.toFixed(4)}`).join(", "), unit: "m⁶·bar/kmol²", eqId: "PR-06" });
  steps.push({ label: "bi = Ωb·R·Tc/Pc", equation: "Ωb = 0.07780", value: comps.map(c => `${c.id}:${c.bi.toFixed(5)}`).join(", "), unit: "m³/kmol", eqId: "PR-07" });

  // ── BIP matrix (Chueh-Prausnitz) ────────────────────────────────────────────
  const n = comps.length;
  const kijMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i === j) return 0;
      const kij = bipCP(COMPONENT_DB[comps[i].id].Vc, COMPONENT_DB[comps[j].id].Vc);
      return kij;
    }),
  );

  const kij_pairs: { i: string; j: string; kij: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = kijMatrix[i][j];
      if (v > 1e-6) kij_pairs.push({ i: comps[i].id, j: comps[j].id, kij: v });
    }
  }
  if (kij_pairs.length > 0) {
    steps.push({ label: "kij (Chueh-Prausnitz)", equation: "kij = 1 − 8√(Vci·Vcj)/(Vci^(1/3)+Vcj^(1/3))³", value: kij_pairs.map(p => `${p.i}-${p.j}:${p.kij.toFixed(4)}`).join(", "), unit: "—", eqId: "PR-08" });
  }

  // ── VdW mixing rules ─────────────────────────────────────────────────────────
  const { am, bm, dam_dT } = vdwMixingPR(comps, kijMatrix);
  steps.push({ label: "am (mixture)", equation: "am = ΣΣ xi·xj·√(ai·aj)·(1−kij)", value: am.toFixed(6), unit: "m⁶·bar/kmol²", eqId: "PR-09" });
  steps.push({ label: "bm (mixture)", equation: "bm = Σ xi·bi", value: bm.toFixed(6), unit: "m³/kmol", eqId: "PR-10" });
  steps.push({ label: "dam/dT", equation: "Analytical cross-derivative of VdW mixing rule", value: dam_dT.toExponential(4), unit: "m⁶·bar/kmol²·K⁻¹", eqId: "PR-11" });

  // ── Dimensionless A and B ────────────────────────────────────────────────────
  const A_dim = am * P_bara / (R_SRK * R_SRK * T_K * T_K);
  const B_dim = bm * P_bara / (R_SRK * T_K);
  steps.push({ label: "A = am·P/(R²T²)", equation: "Dimensionless PR A", value: A_dim.toFixed(6), unit: "—", eqId: "PR-12" });
  steps.push({ label: "B = bm·P/(R·T)", equation: "Dimensionless PR B", value: B_dim.toFixed(6), unit: "—", eqId: "PR-13" });

  // ── Solve PR cubic ───────────────────────────────────────────────────────────
  // Z³ − (1−B)Z² + (A−3B²−2B)Z − (AB−B²−B³) = 0
  const roots = solvePRCubic(A_dim, B_dim);
  steps.push({ label: "PR cubic roots", equation: "Z³−(1−B)Z²+(A−3B²−2B)Z−(AB−B²−B³)=0", value: roots.map(r => r.toFixed(5)).join(", "), unit: "—", eqId: "PR-14" });

  if (roots.length === 0) throw new Error("PR EoS cubic yielded no valid Z roots. Check T, P, composition.");

  const Z_vap = roots[roots.length - 1]; // largest = vapour root
  const Z_liq = roots.length > 1 ? roots[0] : null; // smallest = liquid root

  let phase: "gas" | "liquid" | "two-phase" = "gas";
  if (roots.length > 1) {
    phase = "two-phase";
    warnings.push(`Two PR Z-roots found (Z_v=${Z_vap.toFixed(4)}, Z_l=${Z_liq!.toFixed(4)}) — two-phase region. Using vapour root for gas-phase properties.`);
  }

  const Z  = Z_vap;
  const Vm = Z * R_SRK * T_K / P_bara; // m³/kmol
  const rho = MWm / Vm;                  // kg/m³

  steps.push({ label: "Z (vapour root)", equation: "Largest physical root of PR cubic", value: Z.toFixed(6), unit: "—", eqId: "PR-15" });
  if (Z_liq !== null) steps.push({ label: "Z (liquid root)", equation: "Smallest root — two-phase indicator", value: Z_liq.toFixed(6), unit: "—", eqId: "PR-16" });
  steps.push({ label: "Vm = Z·R·T/P", equation: "", value: Vm.toFixed(5), unit: "m³/kmol", eqId: "PR-17" });
  steps.push({ label: "ρ = MWm/Vm", equation: "", value: rho.toFixed(3), unit: "kg/m³", eqId: "PR-18" });

  if (Z < 0.1) warnings.push(`Very low Z = ${Z.toFixed(4)} — fluid may be near-liquid; verify phase state.`);
  if (T_K / (comps[0] ? COMPONENT_DB[comps[0].id].Tc : 300) > 5) warnings.push("Very high reduced temperature — PR may have reduced accuracy.");

  // ── Lee viscosity ────────────────────────────────────────────────────────────
  const viscosity_cP = leeViscosity(T_K, rho, MWm);
  steps.push({ label: "μg (Lee-Gonzalez-Eakin 1966)", equation: "μg = K·exp(X·ρ^Y) [cP]", value: viscosity_cP.toFixed(5), unit: "cP", eqId: "PR-19" });

  // ── Ideal-gas Cp and k ───────────────────────────────────────────────────────
  const { Hid, Cp_mix } = idealMolarEnthalpyPR(comps, T_K);
  const k = Cp_mix > R_SRK ? Cp_mix / (Cp_mix - R_SRK) : 1.4; // Cp/Cv = Cp/(Cp-R), ideal gas
  steps.push({ label: "Cp,mix (ideal gas)", equation: "Σxi·Cp,i (constant approximation at 25°C)", value: Cp_mix.toFixed(2), unit: "kJ/kmol·K", eqId: "PR-20" });
  steps.push({ label: "k = Cp/(Cp−R)", equation: "Ideal-gas Cp/Cv; R = 8.314 kJ/kmol·K", value: k.toFixed(4), unit: "—", eqId: "PR-21" });

  // ── PR residual enthalpy ─────────────────────────────────────────────────────
  const Hm_residual = prResidualEnthalpy(T_K, Z, bm, am, dam_dT, B_dim);
  const Hm = Hid + Hm_residual;
  const Hm_mass = Hm / MWm;

  steps.push({ label: "Hid (ideal gas)", equation: "Hid = Σxi·Hf,i + Cp,mix·(T−298.15 K)", value: Hid.toFixed(1), unit: "kJ/kmol", eqId: "PR-22" });
  steps.push({ label: "Hres (PR departure)", equation: "Hres = RT(Z−1) + (T·dam/dT−am)/(2√2·bm)·ln[(Z+(1+√2)B)/(Z+(1−√2)B)] ×100", value: Hm_residual.toFixed(1), unit: "kJ/kmol", eqId: "PR-23" });
  steps.push({ label: "Hm = Hid + Hres", equation: "Total molar enthalpy", value: Hm.toFixed(1), unit: "kJ/kmol", eqId: "PR-24" });
  steps.push({ label: "Hm/MWm", equation: "Specific enthalpy", value: Hm_mass.toFixed(1), unit: "kJ/kg", eqId: "PR-25" });

  // ── Reduced properties ───────────────────────────────────────────────────────
  const Tr_mix = comps.reduce((s, c) => s + c.xi * c.Tr, 0);
  if (Tr_mix < 0.5) warnings.push(`Low reduced temperature Tr_mix ≈ ${Tr_mix.toFixed(2)} — fluid may be condensing.`);
  if (Tr_mix > 5)   warnings.push(`Very high Tr_mix ≈ ${Tr_mix.toFixed(2)} — approaching ideal gas limit.`);

  return {
    MWm, am, bm, dam_dT,
    A_dim, B_dim,
    Z, Z_liq, phase, Vm, rho,
    viscosity_cP, Cp_mix, k,
    Hm, Hm_ideal: Hid, Hm_residual, Hm_mass,
    components: comps,
    kij_pairs,
    steps, warnings,
  };
}

// ─── PR Isenthalpic Flash ─────────────────────────────────────────────────────

/**
 * Isenthalpic flash via bisection: find T2 at P2 such that H_PR(T2,P2) = H_target
 *
 * Used to compute discharge temperature across an RO/valve (throttling process).
 * For ideal gases, T2 = T1 (Joule-Thomson coefficient = 0); real-gas Joule-Thomson
 * cooling is captured through the PR residual enthalpy.
 *
 * @param composition  Mixture composition
 * @param H_target     Target enthalpy [kJ/kmol] — from upstream PR result
 * @param P2_bara      Downstream pressure [bara]
 * @param T1_C         Upstream temperature [°C] — used as initial bracket midpoint
 * @returns T2_C, converged flag, iterations
 */
export function isenthalpicFlashPR(
  composition: CompositionEntry[],
  H_target: number,
  P2_bara: number,
  T1_C: number,
): { T2_C: number; converged: boolean; iterations: number } {
  const MAX_ITER = 60;
  const TOL_kJ   = 1.0; // kJ/kmol tolerance on enthalpy

  let lo = T1_C - 80;  // bracket: upstream T minus 80 °C
  let hi = T1_C + 10;  // upstream T plus 10 °C (JT cooling expected)

  // Expand bracket if needed
  const hLo = computePRProperties(composition, lo, P2_bara).Hm;
  const hHi = computePRProperties(composition, hi, P2_bara).Hm;
  const fLo = hLo - H_target;
  const fHi = hHi - H_target;

  // If same sign, try to expand
  let expanded = false;
  if (fLo * fHi > 0) {
    lo = T1_C - 200;
    hi = T1_C + 50;
    const h2Lo = computePRProperties(composition, lo, P2_bara).Hm;
    const h2Hi = computePRProperties(composition, hi, P2_bara).Hm;
    if ((h2Lo - H_target) * (h2Hi - H_target) > 0) {
      // Still same sign — fall back to T1
      return { T2_C: T1_C, converged: false, iterations: 0 };
    }
    expanded = true;
  }
  void expanded;

  // Bisection
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const Tmid = (lo + hi) / 2;
    const Hmid = computePRProperties(composition, Tmid, P2_bara).Hm;
    const fMid = Hmid - H_target;

    if (Math.abs(fMid) < TOL_kJ || (hi - lo) < 0.001) {
      return { T2_C: Tmid, converged: true, iterations: iter + 1 };
    }

    const fLoVal = computePRProperties(composition, lo, P2_bara).Hm - H_target;
    if (fLoVal * fMid < 0) hi = Tmid; else lo = Tmid;
  }

  return { T2_C: (lo + hi) / 2, converged: false, iterations: MAX_ITER };
}
