/**
 * Soave-Redlich-Kwong (SRK) Equation of State — Mixture Property Engine
 *
 * Implements:
 *   SRK EoS:         Soave (1972), Chem. Eng. Sci. 27, 1197–1203
 *   Mixing rules:     Van der Waals (classical)
 *   BIP:              Chueh & Prausnitz (1967), AIChE J. 13(6), 1099–1107
 *   α formulation:    Graboski & Daubert (1978) — standard SRK αi = [1 + mi(1−√Tri)]²
 *   Gas viscosity:    Lee, Gonzalez & Eakin (1966), JPT, 997–1000
 *   Residual enthalpy: derived from SRK departure function
 *   Isenthalpic flash: bisection on T at fixed P until H(T2,P2) = H(T1,P1)
 *
 * Reference: Jayanthi Vijay Sarathy, "Restriction Orifice [RO] Sizing – SRK EoS and ISO 5167-2",
 *            DG Impianti Industriali S.p.A. technical note.
 *
 * R = 0.08314 m³·bar/kmol·K (SRK convention throughout — SI bar units)
 * All ai in [m⁶·bar/kmol²], bi in [m³/kmol], P in [bara], T in [K]
 */

// ─── Gas constant in SRK convention ──────────────────────────────────────────

/** Universal gas constant — SRK convention: R = 0.08314 m³·bar/kmol·K */
export const R_SRK = 0.08314;

/** Reference temperature for ideal-gas enthalpy (Tref = 25°C = 298.15 K) */
const T_REF = 298.15;

// ─── Component Database ───────────────────────────────────────────────────────

export interface ComponentData {
  id: string;
  name: string;
  formula: string;
  MW: number;        // kg/kmol
  Tc: number;        // K
  Pc: number;        // bara
  Vc: number;        // m³/kmol (critical volume — for Chueh-Prausnitz BIP)
  omega: number;     // acentric factor
  Hf: number;        // kJ/kmol — ideal gas enthalpy of formation at 1 atm, 25°C
  Cp: number;        // kJ/kmol·K — ideal gas Cp at ~1 atm, 25°C (constant approximation)
}

/**
 * Component database — critical properties from Poling, Prausnitz & O'Connell (2001),
 * Table A-1. Hf from NIST/Perry's. Cp at 25°C from Perry's/NIST.
 * Values for Methane–N₂ match Table 1 & 2 of the referenced technical note.
 */
export const COMPONENT_DB: Record<string, ComponentData> = {
  CH4:    { id: "CH4",    name: "Methane",    formula: "CH₄",    MW: 16.043,  Tc: 190.7, Pc:  46.41, Vc: 0.0990, omega: 0.0115, Hf:  -74900,  Cp:  35.97 },
  C2H6:   { id: "C2H6",   name: "Ethane",     formula: "C₂H₆",   MW: 30.070,  Tc: 305.4, Pc:  48.84, Vc: 0.1480, omega: 0.0986, Hf:  -84738,  Cp:  53.12 },
  C3H8:   { id: "C3H8",   name: "Propane",    formula: "C₃H₈",   MW: 44.097,  Tc: 369.9, Pc:  42.57, Vc: 0.2000, omega: 0.1524, Hf: -103890,  Cp:  75.42 },
  iC4H10: { id: "iC4H10", name: "i-Butane",   formula: "i-C₄H₁₀", MW: 58.124, Tc: 408.1, Pc:  36.48, Vc: 0.2630, omega: 0.1848, Hf: -134590,  Cp:  98.30 },
  nC4H10: { id: "nC4H10", name: "n-Butane",   formula: "n-C₄H₁₀", MW: 58.124, Tc: 425.2, Pc:  37.97, Vc: 0.2550, omega: 0.2010, Hf: -126190,  Cp:  98.91 },
  iC5H12: { id: "iC5H12", name: "i-Pentane",  formula: "i-C₅H₁₂", MW: 72.151, Tc: 460.4, Pc:  33.34, Vc: 0.3080, omega: 0.2222, Hf: -154590,  Cp: 165.53 },
  nC5H12: { id: "nC5H12", name: "n-Pentane",  formula: "n-C₅H₁₂", MW: 72.151, Tc: 469.6, Pc:  33.75, Vc: 0.3110, omega: 0.2539, Hf: -146490,  Cp: 167.79 },
  nC6H14: { id: "nC6H14", name: "n-Hexane",   formula: "n-C₆H₁₄", MW: 86.178, Tc: 507.9, Pc:  30.32, Vc: 0.3680, omega: 0.3007, Hf: -167290,  Cp: 191.94 },
  nC7H16: { id: "nC7H16", name: "n-Heptane",  formula: "n-C₇H₁₆", MW: 100.205,Tc: 540.2, Pc:  27.36, Vc: 0.4320, omega: 0.3495, Hf: -187900,  Cp: 224.64 },
  H2O:    { id: "H2O",    name: "Water",       formula: "H₂O",    MW: 18.015,  Tc: 647.3, Pc: 221.20, Vc: 0.0571, omega: 0.3440, Hf: -241814,  Cp:  79.93 },
  CO2:    { id: "CO2",    name: "CO₂",         formula: "CO₂",    MW: 44.010,  Tc: 304.1, Pc:  73.70, Vc: 0.0939, omega: 0.2389, Hf: -393790,  Cp:  38.50 },
  H2S:    { id: "H2S",    name: "H₂S",         formula: "H₂S",    MW: 34.081,  Tc: 373.6, Pc:  90.08, Vc: 0.0980, omega: 0.0810, Hf:  -20179,  Cp:  34.54 },
  N2:     { id: "N2",     name: "Nitrogen",    formula: "N₂",     MW: 28.013,  Tc: 126.2, Pc:  33.94, Vc: 0.0900, omega: 0.0400, Hf:       0,  Cp:  29.19 },
  H2:     { id: "H2",     name: "Hydrogen",    formula: "H₂",     MW:  2.016,  Tc:  33.2, Pc:  13.13, Vc: 0.0650, omega:-0.2160, Hf:       0,  Cp:  28.86 },
  CO:     { id: "CO",     name: "CO",          formula: "CO",     MW: 28.010,  Tc: 132.9, Pc:  34.99, Vc: 0.0930, omega: 0.0510, Hf: -110530,  Cp:  29.14 },
  Ar:     { id: "Ar",     name: "Argon",       formula: "Ar",     MW: 39.948,  Tc: 150.8, Pc:  48.87, Vc: 0.0749, omega: 0.0000, Hf:       0,  Cp:  20.79 },
  O2:     { id: "O2",    name: "Oxygen",      formula: "O₂",     MW: 31.999,  Tc: 154.6, Pc:  50.43, Vc: 0.0734, omega: 0.0222, Hf:       0,  Cp:  29.38 },
  SO2:    { id: "SO2",   name: "SO₂",         formula: "SO₂",    MW: 64.066,  Tc: 430.8, Pc:  78.84, Vc: 0.1220, omega: 0.2451, Hf: -296830,  Cp:  39.84 },
  C2H4:   { id: "C2H4",  name: "Ethylene",    formula: "C₂H₄",   MW: 28.054,  Tc: 282.3, Pc:  50.41, Vc: 0.1290, omega: 0.0862, Hf:  52500,   Cp:  42.90 },
  COS:    { id: "COS",   name: "COS",         formula: "COS",    MW: 60.075,  Tc: 378.8, Pc:  63.49, Vc: 0.1380, omega: 0.0978, Hf: -138700,  Cp:  41.28 },
};

export const COMPONENT_IDS = Object.keys(COMPONENT_DB);

/**
 * Map from common gas names (as used in COMMON_GASES / gas mixing calculator)
 * to COMPONENT_DB keys. Covers alternate names used in O&G practice.
 * Used to bridge gas mixing compositions to the EoS engine.
 */
export const NAME_TO_EOS_ID: Record<string, string> = {
  "Methane":          "CH4",
  "Ethane":           "C2H6",
  "Propane":          "C3H8",
  "i-Butane":         "iC4H10",
  "n-Butane":         "nC4H10",
  "i-Pentane":        "iC5H12",
  "n-Pentane":        "nC5H12",
  "n-Hexane":         "nC6H14",
  "n-Heptane":        "nC7H16",
  "Water":            "H2O",
  "Water Vapor":      "H2O",
  "Carbon Dioxide":   "CO2",
  "Hydrogen Sulfide": "H2S",
  "Nitrogen":         "N2",
  "Hydrogen":         "H2",
  "Carbon Monoxide":  "CO",
  "Argon":            "Ar",
  "Oxygen":           "O2",
  "Sulfur Dioxide":   "SO2",
  "Ethylene":         "C2H4",
  "Carbonyl Sulfide": "COS",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompositionEntry {
  componentId: string;
  moleFraction: number;
}

export interface SRKComponentResult {
  id: string;
  name: string;
  xi: number;
  Tr: number;          // T/Tc — reduced temperature
  sqrtTr: number;      // √(T/Tc)
  mi: number;          // SRK m-parameter (Graboski-Daubert)
  alpha: number;       // α(T) = [1 + mi(1−√Tr)]²
  ai: number;          // m⁶·bar/kmol²
  bi: number;          // m³/kmol
  dai_dT: number;      // d(ai)/dT [m⁶·bar/kmol²·K⁻¹]
}

export interface SRKCalcStep {
  label: string;
  equation: string;
  value: string;
  unit: string;
  eqId?: string;
}

export interface SRKMixtureResult {
  // Mixture composition
  MWm: number;              // kg/kmol
  // SRK mixing parameters
  am: number;               // m⁶·bar/kmol²
  bm: number;               // m³/kmol
  dam_dT: number;           // d(am)/dT — numerical [m⁶·bar/kmol²·K⁻¹]
  A_dim: number;            // dimensionless SRK A = am·P/(R·T)²
  B_dim: number;            // dimensionless SRK B = bm·P/(R·T)
  // Phase and Z-factor
  Z: number;                // compressibility factor (vapor root)
  Z_liq: number | null;     // liquid root (if two-phase)
  phase: "gas" | "liquid" | "two-phase";
  Vm: number;               // m³/kmol (molar volume, vapor)
  // Derived properties
  rho: number;              // kg/m³
  viscosity_cP: number;     // gas viscosity [cP] — Lee et al. (1966)
  Cp_mix: number;           // kJ/kmol·K (ideal-gas molar Cp at T)
  k: number;                // Cp/Cv = Cp/(Cp − R) [ideal-gas]
  // Enthalpy
  Hm: number;               // kJ/kmol (total molar enthalpy)
  Hm_ideal: number;         // kJ/kmol (ideal gas contribution)
  Hm_residual: number;      // kJ/kmol (residual departure)
  Hm_mass: number;          // kJ/kg
  // Per-component detail
  components: SRKComponentResult[];
  kij_pairs: { i: string; j: string; kij: number }[];
  // Calc trace
  steps: SRKCalcStep[];
  warnings: string[];
}

// ─── SRK Component Parameters ─────────────────────────────────────────────────

/**
 * SRK m-parameter (Graboski & Daubert, 1978)
 * mi = 0.48505 + 1.55171·ωi − 0.15613·ωi²
 * Ref: PDF Eq. (9)
 */
function srkM(omega: number): number {
  return 0.48505 + 1.55171 * omega - 0.15613 * omega * omega;
}

/**
 * SRK α(T) function (Graboski & Daubert)
 * αi(T) = [1 + mi·(1 − √(T/Tci))]²
 * Ref: PDF Eq. (8)
 */
function srkAlpha(T_K: number, Tc_K: number, mi: number): number {
  const sqrtTr = Math.sqrt(T_K / Tc_K);
  const q = 1 + mi * (1 - sqrtTr);
  return q * q;
}

/**
 * SRK individual component attractive parameter ai [m⁶·bar/kmol²]
 * ai = 0.42748 × R² × Tci² / Pci × αi(T)
 * Ref: PDF Eq. (5), R = 0.08314 m³·bar/kmol·K
 */
function srkAi(Tc_K: number, Pc_bara: number, alpha: number): number {
  return (0.42748 * R_SRK * R_SRK * Tc_K * Tc_K / Pc_bara) * alpha;
}

/**
 * SRK individual component co-volume bi [m³/kmol]
 * bi = 0.08664 × R × Tci / Pci
 * Ref: PDF Eq. (6)
 */
function srkBi(Tc_K: number, Pc_bara: number): number {
  return 0.08664 * R_SRK * Tc_K / Pc_bara;
}

/**
 * Analytical derivative d(αi)/dT:
 * dαi/dT = −mi · [1 + mi·(1−√Tri)] / √(T·Tci)
 * Since dai/dT = (ai/αi) · dαi/dT = (0.42748·R²·Tci²/Pci) · dαi/dT
 */
function srkDai_dT(T_K: number, Tc_K: number, Pc_bara: number, mi: number, alpha: number): number {
  const ci = 0.42748 * R_SRK * R_SRK * Tc_K * Tc_K / Pc_bara;
  const dAlpha_dT = -mi * Math.sqrt(alpha) / Math.sqrt(T_K * Tc_K);
  return ci * dAlpha_dT;
}

// ─── Binary Interaction Parameters (BIP) ─────────────────────────────────────

/**
 * Chueh–Prausnitz (1967) BIP for non-polar pairs — uses critical volumes.
 * kij = 1 − 8·(Vci·Vcj)^(1/2) / (Vci^(1/3) + Vcj^(1/3))^3
 * Ref: Poling, Prausnitz & O'Connell (2001) Eq. 5-5.3; PDF Eq. (10)
 * For same component: kij = 0.
 * Note: kij can be small negative for very similar species (treated as 0).
 */
function bipChuehPrausnitz(Vc_i: number, Vc_j: number): number {
  if (Math.abs(Vc_i - Vc_j) < 1e-9) return 0; // same component
  const sumCbrt = Math.pow(Vc_i, 1 / 3) + Math.pow(Vc_j, 1 / 3);
  const kij = 1 - 8 * Math.sqrt(Vc_i * Vc_j) / Math.pow(sumCbrt, 3);
  return Math.max(0, kij); // non-negative for physical pairs
}

// ─── Mixing Rules ─────────────────────────────────────────────────────────────

/**
 * Van der Waals mixing rules for am and bm.
 * am = ΣΣ xi·xj·aij,   aij = √(ai·aj)·(1−kij)   [Ref: PDF Eq. 2-4]
 * bm = Σ  xi·bi                                    [Ref: PDF Eq. 4]
 *
 * Also computes dam_dT numerically for the residual enthalpy calculation.
 * Returns am, bm, dam_dT.
 */
function vdwMixing(
  comps: SRKComponentResult[],
  kijMatrix: number[][],
): { am: number; bm: number; dam_dT: number } {
  const n = comps.length;
  let am = 0;
  let dam_dT = 0;
  let bm = 0;

  for (let i = 0; i < n; i++) {
    bm += comps[i].xi * comps[i].bi;
    for (let j = 0; j < n; j++) {
      const aij = Math.sqrt(comps[i].ai * comps[j].ai) * (1 - kijMatrix[i][j]);
      am += comps[i].xi * comps[j].xi * aij;

      // d(aij)/dT = (1-kij)/2·(daj/dT·√(ai/aj) + dai/dT·√(aj/ai))
      // = (1-kij)/2·(dai/dT/√ai + daj/dT/√aj)·√(ai·aj)
      const sqrtAiAj = Math.sqrt(comps[i].ai * comps[j].ai);
      if (sqrtAiAj > 0) {
        const daij_dT =
          (1 - kijMatrix[i][j]) * sqrtAiAj *
          (comps[i].dai_dT / (2 * comps[i].ai) + comps[j].dai_dT / (2 * comps[j].ai));
        dam_dT += comps[i].xi * comps[j].xi * daij_dT;
      }
    }
  }

  return { am, bm, dam_dT };
}

// ─── Cubic Z-equation Solver ──────────────────────────────────────────────────

/**
 * Solve SRK cubic: Z³ − Z² + (A−B−B²)·Z − A·B = 0
 * Ref: PDF Eq. (13); A = am·P/(R·T)², B = bm·P/(R·T)
 *
 * Returns all real positive roots. Vapor root = largest. Liquid root = smallest.
 * If one positive root → single phase. Two distinct positive roots → potentially two-phase.
 */
function solveZCubic(A: number, B: number): number[] {
  const c1 = -(1);             // coefficient of Z²
  const c2 = A - B - B * B;   // coefficient of Z
  const c3 = -A * B;           // constant

  // Cardano's depressed cubic: let Z = t + 1/3
  // t³ + pt + q = 0
  const p = c2 - c1 * c1 / 3;
  const q = c3 - c1 * c2 / 3 + 2 * c1 * c1 * c1 / 27;

  const discriminant = q * q / 4 + p * p * p / 27;

  let roots: number[] = [];

  if (discriminant > 0) {
    // One real root
    const u = Math.cbrt(-q / 2 + Math.sqrt(discriminant));
    const v = Math.cbrt(-q / 2 - Math.sqrt(discriminant));
    const t = u + v;
    roots = [t - c1 / 3];
  } else if (Math.abs(discriminant) < 1e-15) {
    // Three real roots, at least two equal
    const u = Math.cbrt(-q / 2);
    roots = [2 * u - c1 / 3, -u - c1 / 3, -u - c1 / 3];
  } else {
    // Three distinct real roots (casus irreducibilis)
    const r = Math.sqrt(-p * p * p / 27);
    const theta = Math.acos(-q / (2 * r));
    const rCbrt = Math.cbrt(r);
    roots = [
      2 * rCbrt * Math.cos(theta / 3) - c1 / 3,
      2 * rCbrt * Math.cos((theta + 2 * Math.PI) / 3) - c1 / 3,
      2 * rCbrt * Math.cos((theta + 4 * Math.PI) / 3) - c1 / 3,
    ];
  }

  // Keep only real positive roots (Z must exceed B physically)
  return roots.filter(z => z > B + 1e-8).sort((a, b) => a - b);
}

// ─── Lee–Gonzalez–Eakin (1966) Gas Viscosity ─────────────────────────────────

/**
 * Lee–Gonzalez–Eakin (1966) gas viscosity correlation.
 * μg [cP] = K₁ × exp(X × ρ^Y)
 * K₁ = [(9.4 + 0.02·MW)·T^1.5] / (209 + 19·MW + T) × 10⁻⁴
 * X  = 3.5 + 986/T + 0.01·MW
 * Y  = 2.4 − 0.2·X
 *
 * Valid: T in °R (= K × 1.8), ρ in g/cm³, P: 100–8000 psia, T: 100–340°F
 * Ref: PDF Eq. (23)–(26); Lee et al. JPT 1966, 997–1000.
 *
 * @param T_K    Temperature [K]
 * @param rho_kgm3  Density [kg/m³]
 * @param MWg    Gas molecular weight [kg/kmol]
 * @returns viscosity [cP]
 */
export function leeViscosity(T_K: number, rho_kgm3: number, MWg: number): number {
  const T_R = T_K * 1.8; // convert K → °Rankine
  const rho_gcm3 = rho_kgm3 * 1e-3; // kg/m³ → g/cm³
  // Original Lee, Gonzalez & Eakin (1966) JPT SPE-1340-PA coefficients
  const K1 = ((9.379 + 0.01607 * MWg) * Math.pow(T_R, 1.5)) / (209.2 + 19.26 * MWg + T_R) * 1e-4;
  const X = 3.448 + 986.4 / T_R + 0.01009 * MWg;
  const Y = 2.447 - 0.2224 * X;
  return K1 * Math.exp(X * Math.pow(rho_gcm3, Y));
}

// ─── SRK Residual Enthalpy ────────────────────────────────────────────────────

/**
 * SRK residual molar enthalpy departure (from ideal gas at same T, P):
 * Hres = R·T·(Z−1) + (T·dam_dT − am)/bm × ln(Vm/(Vm+bm))
 *
 * This is the standard SRK departure function derived from:
 * Hres = ∫[V→∞] [T·(∂P/∂T)_V − P] dV + R·T·(Z−1)
 * Ref: Poling et al. (2001) §6-5; PDF Eq. (19)
 *
 * @returns Hres [kJ/kmol] — multiply by 1/1000 since R=0.08314 m³·bar/kmol·K and 1 m³·bar = 100 kJ
 */
function srkResidualEnthalpy(
  T_K: number, Z: number, Vm: number, am: number, bm: number, dam_dT: number,
): number {
  // 1 m³·bar = 100 kJ → multiply by 100 to convert bar·m³/kmol → kJ/kmol
  const RTZ_minus1 = R_SRK * T_K * (Z - 1) * 100;
  const logTerm = bm > 0 ? Math.log(Vm / (Vm + bm)) : 0;
  const departure = (T_K * dam_dT - am) / bm * logTerm * 100;
  return RTZ_minus1 + departure;
}

// ─── Ideal Gas Enthalpy ───────────────────────────────────────────────────────

/**
 * Ideal gas molar enthalpy of the mixture:
 * Hid = Σ xi·Hf,i + Σ xi·Cp,i·(T − Tref)
 * Ref: PDF Eq. (16)–(18), Tref = 25°C = 298.15 K
 *
 * @returns Hid [kJ/kmol]
 */
function idealMolarEnthalpy(comps: SRKComponentResult[], T_K: number): { Hid: number; Cp_mix: number } {
  let Hf_mix = 0;
  let Cp_mix = 0;
  for (const c of comps) {
    const comp = COMPONENT_DB[c.id];
    if (!comp) continue;
    Hf_mix += c.xi * comp.Hf;
    Cp_mix += c.xi * comp.Cp;
  }
  const Hid = Hf_mix + Cp_mix * (T_K - T_REF);
  return { Hid, Cp_mix };
}

// ─── Main SRK Solver ──────────────────────────────────────────────────────────

/**
 * Compute SRK EoS mixture properties at given (T, P, composition).
 * Returns density, Z-factor, viscosity, Cp, k, and molar enthalpy with full trace.
 *
 * @param composition  Array of { componentId, moleFraction }
 * @param T_C          Temperature [°C]
 * @param P_bara       Pressure [bara]
 */
export function computeSRKProperties(
  composition: CompositionEntry[],
  T_C: number,
  P_bara: number,
): SRKMixtureResult {
  const steps: SRKCalcStep[] = [];
  const warnings: string[] = [];

  const T_K = T_C + 273.15;

  // ── 1. Validate & normalise composition ──────────────────────────────────
  const active = composition.filter(c => c.moleFraction > 0 && COMPONENT_DB[c.componentId]);
  if (active.length === 0) throw new Error("SRK: no valid components with non-zero mole fraction");

  const xSum = active.reduce((s, c) => s + c.moleFraction, 0);
  if (Math.abs(xSum - 1) > 0.005) {
    warnings.push(`Mole fractions sum = ${xSum.toFixed(4)} — normalised to 1.0 for calculation`);
  }
  const normalised = active.map(c => ({ ...c, moleFraction: c.moleFraction / xSum }));

  // ── 2. Mixture MW ────────────────────────────────────────────────────────
  let MWm = 0;
  for (const c of normalised) {
    MWm += c.moleFraction * COMPONENT_DB[c.componentId].MW;
  }
  steps.push({ label: "MWm (mixture)", equation: "MWm = Σ xi·MWi", value: MWm.toFixed(3), unit: "kg/kmol", eqId: "SRK-01" });

  // ── 3. Per-component SRK parameters ──────────────────────────────────────
  const comps: SRKComponentResult[] = normalised.map(c => {
    const db = COMPONENT_DB[c.componentId];
    const mi = srkM(db.omega);
    const alpha = srkAlpha(T_K, db.Tc, mi);
    const ai = srkAi(db.Tc, db.Pc, alpha);
    const bi = srkBi(db.Tc, db.Pc);
    const dai_dT = srkDai_dT(T_K, db.Tc, db.Pc, mi, alpha);
    const Tr = T_K / db.Tc;
    return {
      id: c.componentId,
      name: db.name,
      xi: c.moleFraction,
      Tr,
      sqrtTr: Math.sqrt(Tr),
      mi,
      alpha,
      ai,
      bi,
      dai_dT,
    };
  });

  // Add a representative component trace step (methane or first)
  const c0 = comps[0];
  steps.push({
    label: `m (${c0.name})`,
    equation: "mi = 0.48505 + 1.55171ωi − 0.15613ωi² [Graboski-Daubert]",
    value: c0.mi.toFixed(4), unit: "—", eqId: "SRK-02",
  });
  steps.push({
    label: `α(T) (${c0.name})`,
    equation: "αi = [1 + mi·(1−√(T/Tci))]²",
    value: c0.alpha.toFixed(4), unit: "—", eqId: "SRK-03",
  });
  steps.push({
    label: `ai (${c0.name})`,
    equation: "ai = 0.42748·R²·Tci²/Pci·αi",
    value: c0.ai.toFixed(4), unit: "m⁶·bar/kmol²", eqId: "SRK-04",
  });
  steps.push({
    label: `bi (${c0.name})`,
    equation: "bi = 0.08664·R·Tci/Pci",
    value: c0.bi.toFixed(4), unit: "m³/kmol", eqId: "SRK-05",
  });

  // ── 4. Binary interaction parameters ─────────────────────────────────────
  const n = comps.length;
  const kijMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const kij_pairs: { i: string; j: string; kij: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const kij = bipChuehPrausnitz(COMPONENT_DB[comps[i].id].Vc, COMPONENT_DB[comps[j].id].Vc);
      kijMatrix[i][j] = kij;
      kijMatrix[j][i] = kij;
      kij_pairs.push({ i: comps[i].id, j: comps[j].id, kij });
    }
  }
  if (kij_pairs.length > 0 && kij_pairs.length <= 6) {
    steps.push({
      label: `kij (${kij_pairs[0].i}–${kij_pairs[0].j})`,
      equation: "kij = 1 − 8(Vci·Vcj)^½ / (Vci^⅓+Vcj^⅓)³  [Chueh-Prausnitz 1967]",
      value: kij_pairs[0].kij.toFixed(4), unit: "—", eqId: "SRK-06",
    });
  }

  // ── 5. Mixing rules — am, bm ──────────────────────────────────────────────
  const { am, bm, dam_dT } = vdwMixing(comps, kijMatrix);
  steps.push({ label: "am (mixture)", equation: "am = ΣΣ xi·xj·√(ai·aj)·(1−kij)  [Van der Waals]", value: am.toFixed(4), unit: "m⁶·bar/kmol²", eqId: "SRK-07" });
  steps.push({ label: "bm (mixture)", equation: "bm = Σ xi·bi", value: bm.toFixed(4), unit: "m³/kmol", eqId: "SRK-08" });
  steps.push({ label: "dam/dT", equation: "numerical — ΣΣ xi·xj·d(aij)/dT", value: dam_dT.toExponential(4), unit: "m⁶·bar/kmol²·K⁻¹", eqId: "SRK-09" });

  // ── 6. Dimensionless A, B ─────────────────────────────────────────────────
  const RT = R_SRK * T_K;
  const A_dim = am * P_bara / (RT * RT);
  const B_dim = bm * P_bara / RT;
  steps.push({ label: "A = am·P/(R·T)²", equation: "SRK dimensionless A  [PDF Eq.14]", value: A_dim.toFixed(4), unit: "—", eqId: "SRK-10" });
  steps.push({ label: "B = bm·P/(R·T)", equation: "SRK dimensionless B  [PDF Eq.15]", value: B_dim.toFixed(4), unit: "—", eqId: "SRK-11" });
  steps.push({ label: "Cubic: Z³−Z²+(A−B−B²)Z−AB=0", equation: "[PDF Eq.13]", value: `A-B-B² = ${(A_dim - B_dim - B_dim * B_dim).toFixed(4)}`, unit: "", eqId: "SRK-12" });

  // ── 7. Solve cubic for Z ──────────────────────────────────────────────────
  const positiveRoots = solveZCubic(A_dim, B_dim);
  if (positiveRoots.length === 0) {
    warnings.push("SRK cubic has no valid positive roots — defaulting to Z=1 (ideal gas)");
    positiveRoots.push(1);
  }

  const Z_vap = positiveRoots[positiveRoots.length - 1]; // largest = vapor
  const Z_liq = positiveRoots.length > 1 ? positiveRoots[0] : null; // smallest = liquid

  let phase: "gas" | "liquid" | "two-phase" = "gas";
  if (positiveRoots.length > 1) {
    phase = "two-phase";
    warnings.push(`Two-phase condition: SRK cubic has ${positiveRoots.length} positive roots (Z_vap=${Z_vap.toFixed(4)}, Z_liq=${Z_liq!.toFixed(4)}). Vapor-phase root used for RO sizing.`);
  }

  const Z = Z_vap;
  const Vm = Z * RT / P_bara; // m³/kmol

  steps.push({ label: "Z (vapor root)", equation: "largest positive root of cubic", value: Z.toFixed(4), unit: "—", eqId: "SRK-13" });
  steps.push({ label: "Vm", equation: "Vm = Z·R·T/P", value: Vm.toFixed(4), unit: "m³/kmol", eqId: "SRK-14" });

  // ── 8. Mixture density ───────────────────────────────────────────────────
  const rho = MWm / Vm; // kg/m³
  steps.push({ label: "ρ = MWm/Vm", equation: "ρ = MWm / Vm  [PDF Eq.12]", value: rho.toFixed(3), unit: "kg/m³", eqId: "SRK-15" });

  // ── 9. Gas viscosity — Lee et al. (1966) ─────────────────────────────────
  const viscosity_cP = leeViscosity(T_K, rho, MWm);
  const T_R = T_K * 1.8;
  const X = 3.5 + 986 / T_R + 0.01 * MWm;
  const Y_lee = 2.4 - 0.2 * X;
  const K1_lee = ((9.4 + 0.02 * MWm) * Math.pow(T_R, 1.5)) / (209 + 19 * MWm + T_R) * 1e-4;
  steps.push({ label: "K₁ (Lee 1966)", equation: "K₁ = (9.4+0.02·MW)·T_R^1.5 / (209+19·MW+T_R) × 10⁻⁴", value: K1_lee.toExponential(4), unit: "—", eqId: "SRK-16" });
  steps.push({ label: "X (Lee 1966)", equation: "X = 3.5 + 986/T_R + 0.01·MW", value: X.toFixed(3), unit: "—", eqId: "SRK-17" });
  steps.push({ label: "Y (Lee 1966)", equation: "Y = 2.4 − 0.2·X", value: Y_lee.toFixed(3), unit: "—", eqId: "SRK-18" });
  steps.push({ label: "μg (Lee 1966)", equation: "μg = K₁·exp(X·ρ^Y)  [PDF Eq.23]", value: viscosity_cP.toFixed(5), unit: "cP", eqId: "SRK-19" });

  if (viscosity_cP > 0.5 || viscosity_cP < 0.001) {
    warnings.push(`Lee viscosity = ${viscosity_cP.toFixed(4)} cP — check conditions vs Lee (1966) validity range: 6.9–551 bara, 38–171°C`);
  }

  // ── 10. Ideal gas enthalpy ────────────────────────────────────────────────
  const { Hid, Cp_mix } = idealMolarEnthalpy(comps, T_K);
  const Cp_int = Cp_mix * (T_K - T_REF); // kJ/kmol
  steps.push({ label: "Σxi·Hf,i", equation: "Ideal gas enthalpy of formation mix", value: (Hid - Cp_int).toFixed(1), unit: "kJ/kmol", eqId: "SRK-20" });
  steps.push({ label: "Σxi·Cp,i·(T−Tref)", equation: "Sensible heat, Tref=25°C", value: Cp_int.toFixed(1), unit: "kJ/kmol", eqId: "SRK-21" });
  steps.push({ label: "Hid (ideal gas)", equation: "Hid = Σxi·Hf,i + Σxi·Cp,i·(T−Tref)", value: Hid.toFixed(1), unit: "kJ/kmol", eqId: "SRK-22" });

  // ── 11. Residual enthalpy ─────────────────────────────────────────────────
  const Hm_residual = srkResidualEnthalpy(T_K, Z, Vm, am, bm, dam_dT);
  const Hm = Hid + Hm_residual;
  const Hm_mass = Hm / MWm;
  steps.push({ label: "RT(Z−1)·100 [kJ/kmol]", equation: "R·T·(Z−1)×100  [SRK departure]", value: (R_SRK * T_K * (Z - 1) * 100).toFixed(1), unit: "kJ/kmol", eqId: "SRK-23" });
  steps.push({ label: "Hres (residual)", equation: "Hres = R·T·(Z−1)·100 + (T·dam_dT−am)/bm·ln(Vm/(Vm+bm))·100", value: Hm_residual.toFixed(1), unit: "kJ/kmol", eqId: "SRK-24" });
  steps.push({ label: "Hm (total)", equation: "Hm = Hid + Hres  [PDF Eq.22]", value: Hm.toFixed(1), unit: "kJ/kmol", eqId: "SRK-25" });
  steps.push({ label: "Hm (mass)", equation: "Hm/MWm", value: Hm_mass.toFixed(1), unit: "kJ/kg", eqId: "SRK-26" });

  // ── 12. Cp mixture and k ──────────────────────────────────────────────────
  // Ideal gas: k = Cp/(Cp−R) where R=8.314 kJ/kmol·K
  const R_kJ = 8.314; // kJ/kmol·K
  const Cv_mix = Cp_mix - R_kJ;
  const k = Cv_mix > 0 ? Cp_mix / Cv_mix : 1.3;
  steps.push({ label: "Cp,mix (ideal gas)", equation: "Σxi·Cp,i at 25°C (constant approx.)", value: Cp_mix.toFixed(2), unit: "kJ/kmol·K", eqId: "SRK-27" });
  steps.push({ label: "k = Cp/(Cp−R)", equation: "Ideal gas Cp/Cv, R=8.314 kJ/kmol·K", value: k.toFixed(4), unit: "—", eqId: "SRK-28" });

  return {
    MWm, am, bm, dam_dT,
    A_dim, B_dim,
    Z, Z_liq, phase, Vm, rho,
    viscosity_cP,
    Cp_mix, k,
    Hm, Hm_ideal: Hid, Hm_residual, Hm_mass,
    components: comps,
    kij_pairs,
    steps, warnings,
  };
}

// ─── Isenthalpic Flash (Discharge Temperature) ───────────────────────────────

/**
 * Isenthalpic flash — find discharge temperature T2 at P2 such that:
 *   Hm(T2, P2) = Hm_target
 *
 * Applies when the fluid passes through a restriction (RO, valve, orifice).
 * Solved by bisection on temperature. Ref: PDF §"Discharge temperature".
 *
 * @param composition   Mixture composition
 * @param H_target      Target enthalpy [kJ/kmol] — from inlet SRK result
 * @param P2_bara       Discharge pressure [bara]
 * @param T1_C          Inlet temperature [°C] — used as starting upper bound
 * @returns discharge temperature [°C] or null if not converged
 */
export function isenthalpicFlash(
  composition: CompositionEntry[],
  H_target: number,
  P2_bara: number,
  T1_C: number,
): { T2_C: number; converged: boolean; iterations: number } {
  // Bisection: H(T2) = H_target
  // For JT expansion: T2 < T1 for most hydrocarbons (JT cooling)
  // Search range: [T1 − 200, T1 + 50] °C
  const T_lo = T1_C - 200;
  const T_hi = T1_C + 50;

  const fn = (T_C: number) => {
    try {
      const r = computeSRKProperties(composition, T_C, P2_bara);
      return r.Hm - H_target;
    } catch {
      return 0;
    }
  };

  let fLo = fn(T_lo);
  let fHi = fn(T_hi);

  // If same sign, try wider bracket
  let lo = T_lo;
  let hi = T_hi;
  if (fLo * fHi > 0) {
    const T_lo2 = T1_C - 400;
    fLo = fn(T_lo2);
    if (fLo * fHi > 0) {
      return { T2_C: T1_C, converged: false, iterations: 0 };
    }
    lo = T_lo2; // use the expanded lower bound
  }
  let mid = (lo + hi) / 2;
  let iter = 0;
  const tol = 0.01; // 0.01°C convergence
  const maxIter = 60;

  for (; iter < maxIter; iter++) {
    mid = (lo + hi) / 2;
    const fMid = fn(mid);
    if (Math.abs(fMid) < 10 || (hi - lo) < tol) {
      return { T2_C: mid, converged: true, iterations: iter + 1 };
    }
    if (fMid * fLo < 0) { hi = mid; }
    else { lo = mid; fLo = fMid; }
  }

  return { T2_C: mid, converged: Math.abs((hi - lo)) < 0.5, iterations: iter };
}
