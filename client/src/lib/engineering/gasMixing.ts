/**
 * Gas Mixing Calculator — Mole-Fraction Weighted MW + Multi-Stream Mixing
 *
 * Equations:
 *   MW_mix = Σ(y_i × MW_i)              — mole-fraction weighted average
 *   w_i    = (y_i × MW_i) / MW_mix       — mass fraction from mole fraction
 *   R_mix  = R_u / MW_mix                 — mixture specific gas constant
 *   SG     = MW_mix / MW_air              — gas specific gravity (relative to air)
 *   γ_mix  = Σ(y_i × γ_i)               — approximate mixture Cp/Cv ratio
 *   Tc_pc  = Σ(y_i × Tc_i)              — pseudocritical temperature (Kay's rule)
 *   Pc_pc  = Σ(y_i × Pc_i)              — pseudocritical pressure (Kay's rule)
 *   ω_mix  = Σ(y_i × ω_i)              — mixture acentric factor
 *   Multi-stream:
 *     F_total   = ΣF_j
 *     n_i       = Σ(F_j × y_i,j)
 *     y_i,mix   = n_i / F_total
 *
 * Reference: Perry's Chemical Engineers' Handbook, GPSA Engineering Data Book
 *            Standing & Katz (1942) — pseudocritical correlations
 */

import type { GasMixingInput } from "./validation";
import { COMMON_GASES, type GasProperties } from "./constants";
import { NAME_TO_EOS_ID, type CompositionEntry } from "./srkEos";
import { computeSRKProperties } from "./srkEos";
import { computePRProperties } from "./prEos";

// ─── Constants ────────────────────────────────────────────────────────

const R_UNIVERSAL = 8.31446; // kJ/(kmol·K)
const MW_AIR = 28.966;
const SUM_TOLERANCE_STRICT = 5e-4;
const SUM_TOLERANCE_INTERNAL = 1e-6;

// ─── Types ────────────────────────────────────────────────────────────

export interface GasMixProject {
  name: string;
  caseId: string;
  engineer: string;
  date: string;
  mwUnits: "kg/kmol" | "g/mol";
  normalizationMode: "strict" | "normalize";
}

export interface GasMixComponent {
  id: string;
  name: string;
  formula: string;
  molecularWeight: number;
  moleFraction: number;
  notes: string;
  gamma?: number;
  Tc?: number;
  Pc?: number;
  omega?: number;
}

export interface GasMixStream {
  id: string;
  name: string;
  molarFlow: number;
  flowUnit: string;
  components: { componentId: string; moleFraction: number }[];
}

export interface NormalizationTrace {
  rawTotal: number;
  normalizationFactor: number;
  normalizedFractions: { name: string; raw: number; normalized: number }[];
}

export interface CalcStep {
  component: string;
  yi: number;
  mwi: number;
  product: number;
}

export interface ComponentResult {
  name: string;
  formula: string;
  moleFraction: number;
  molecularWeight: number;
  massFraction: number;
  yiMWi: number;
  gamma?: number;
  Tc?: number;
  Pc?: number;
  omega?: number;
}

export interface GasMixingResult {
  mixtureMW: number;
  gasSG: number;
  gammaMix: number | null;
  TcPc: number | null;
  PcPc: number | null;
  omegaMix: number | null;
  components: ComponentResult[];
  totalMoleFraction: number;
  wasNormalized: boolean;
  normalizationTrace: NormalizationTrace | null;
  calcSteps: CalcStep[];
  massFractionTotal: number;
  rMix: number;
  rMixUnit: string;
  flags: string[];
  warnings: string[];
}

export interface MultiStreamResult {
  streams: {
    name: string;
    molarFlow: number;
    mwStream: number;
    composition: { name: string; yi: number }[];
  }[];
  mixedStream: {
    totalFlow: number;
    composition: { name: string; yi: number; ni: number; massFraction: number }[];
    mwMix: number;
    rMix: number;
    gasSG: number;
  };
  calcTrace: string[];
  warnings: string[];
}

// ─── Preset Compositions ──────────────────────────────────────────────

export interface PresetComposition {
  name: string;
  description: string;
  category: "Natural Gas" | "Refinery" | "Acid / Sour" | "Utility" | "Flare / Relief";
  components: { name: string; moleFraction: number }[];
}

export const PRESET_COMPOSITIONS: PresetComposition[] = [
  {
    name: "Lean Natural Gas",
    description: "Typical pipeline-quality dry natural gas (C1-dominant)",
    category: "Natural Gas",
    components: [
      { name: "Methane", moleFraction: 0.9100 },
      { name: "Ethane", moleFraction: 0.0450 },
      { name: "Propane", moleFraction: 0.0120 },
      { name: "i-Butane", moleFraction: 0.0025 },
      { name: "n-Butane", moleFraction: 0.0030 },
      { name: "i-Pentane", moleFraction: 0.0010 },
      { name: "n-Pentane", moleFraction: 0.0008 },
      { name: "Carbon Dioxide", moleFraction: 0.0150 },
      { name: "Nitrogen", moleFraction: 0.0100 },
      { name: "n-Hexane", moleFraction: 0.0007 },
    ],
  },
  {
    name: "Rich Natural Gas",
    description: "Wellhead associated gas with heavier hydrocarbons",
    category: "Natural Gas",
    components: [
      { name: "Methane", moleFraction: 0.7500 },
      { name: "Ethane", moleFraction: 0.1000 },
      { name: "Propane", moleFraction: 0.0600 },
      { name: "i-Butane", moleFraction: 0.0150 },
      { name: "n-Butane", moleFraction: 0.0200 },
      { name: "i-Pentane", moleFraction: 0.0080 },
      { name: "n-Pentane", moleFraction: 0.0060 },
      { name: "n-Hexane", moleFraction: 0.0050 },
      { name: "n-Heptane", moleFraction: 0.0030 },
      { name: "Carbon Dioxide", moleFraction: 0.0200 },
      { name: "Nitrogen", moleFraction: 0.0080 },
      { name: "Hydrogen Sulfide", moleFraction: 0.0050 },
    ],
  },
  {
    name: "Sour Natural Gas",
    description: "High H₂S and CO₂ content natural gas",
    category: "Acid / Sour",
    components: [
      { name: "Methane", moleFraction: 0.7200 },
      { name: "Ethane", moleFraction: 0.0500 },
      { name: "Propane", moleFraction: 0.0250 },
      { name: "i-Butane", moleFraction: 0.0050 },
      { name: "n-Butane", moleFraction: 0.0060 },
      { name: "Carbon Dioxide", moleFraction: 0.0800 },
      { name: "Hydrogen Sulfide", moleFraction: 0.1000 },
      { name: "Nitrogen", moleFraction: 0.0100 },
      { name: "Water Vapor", moleFraction: 0.0040 },
    ],
  },
  {
    name: "Acid Gas (Amine Unit Off-Gas)",
    description: "Acid gas from amine regenerator — mainly H₂S + CO₂",
    category: "Acid / Sour",
    components: [
      { name: "Hydrogen Sulfide", moleFraction: 0.6500 },
      { name: "Carbon Dioxide", moleFraction: 0.3200 },
      { name: "Methane", moleFraction: 0.0150 },
      { name: "Water Vapor", moleFraction: 0.0150 },
    ],
  },
  {
    name: "Fuel Gas (Refinery)",
    description: "Typical refinery fuel gas header composition",
    category: "Refinery",
    components: [
      { name: "Methane", moleFraction: 0.5000 },
      { name: "Hydrogen", moleFraction: 0.2500 },
      { name: "Ethane", moleFraction: 0.1000 },
      { name: "Propane", moleFraction: 0.0500 },
      { name: "Ethylene", moleFraction: 0.0400 },
      { name: "Nitrogen", moleFraction: 0.0300 },
      { name: "Carbon Dioxide", moleFraction: 0.0200 },
      { name: "n-Butane", moleFraction: 0.0100 },
    ],
  },
  {
    name: "FCC Off-Gas",
    description: "Fluid catalytic cracker regenerator off-gas",
    category: "Refinery",
    components: [
      { name: "Nitrogen", moleFraction: 0.7800 },
      { name: "Carbon Dioxide", moleFraction: 0.1200 },
      { name: "Oxygen", moleFraction: 0.0300 },
      { name: "Carbon Monoxide", moleFraction: 0.0400 },
      { name: "Water Vapor", moleFraction: 0.0200 },
      { name: "Sulfur Dioxide", moleFraction: 0.0100 },
    ],
  },
  {
    name: "Hydrogen-Rich (Reformer)",
    description: "Hydrogen-rich stream from catalytic reformer",
    category: "Refinery",
    components: [
      { name: "Hydrogen", moleFraction: 0.8000 },
      { name: "Methane", moleFraction: 0.1000 },
      { name: "Ethane", moleFraction: 0.0500 },
      { name: "Propane", moleFraction: 0.0250 },
      { name: "n-Butane", moleFraction: 0.0150 },
      { name: "n-Pentane", moleFraction: 0.0100 },
    ],
  },
  {
    name: "Flare Gas (Emergency)",
    description: "Typical emergency flare gas composition (mixed hydrocarbon)",
    category: "Flare / Relief",
    components: [
      { name: "Methane", moleFraction: 0.4000 },
      { name: "Ethane", moleFraction: 0.1500 },
      { name: "Propane", moleFraction: 0.1200 },
      { name: "n-Butane", moleFraction: 0.0800 },
      { name: "n-Pentane", moleFraction: 0.0400 },
      { name: "Hydrogen", moleFraction: 0.0500 },
      { name: "Nitrogen", moleFraction: 0.1000 },
      { name: "Carbon Dioxide", moleFraction: 0.0400 },
      { name: "Hydrogen Sulfide", moleFraction: 0.0200 },
    ],
  },
  {
    name: "Nitrogen Blanket Gas",
    description: "Nitrogen with trace impurities for blanketing service",
    category: "Utility",
    components: [
      { name: "Nitrogen", moleFraction: 0.9950 },
      { name: "Oxygen", moleFraction: 0.0030 },
      { name: "Argon", moleFraction: 0.0010 },
      { name: "Water Vapor", moleFraction: 0.0010 },
    ],
  },
  {
    name: "Instrument Air (Dry)",
    description: "Dried instrument air composition",
    category: "Utility",
    components: [
      { name: "Nitrogen", moleFraction: 0.7808 },
      { name: "Oxygen", moleFraction: 0.2095 },
      { name: "Argon", moleFraction: 0.0093 },
      { name: "Carbon Dioxide", moleFraction: 0.0004 },
    ],
  },
  {
    name: "LPG Vapor",
    description: "Typical LPG vapor (propane/butane blend)",
    category: "Natural Gas",
    components: [
      { name: "Propane", moleFraction: 0.6000 },
      { name: "i-Butane", moleFraction: 0.1500 },
      { name: "n-Butane", moleFraction: 0.2200 },
      { name: "Ethane", moleFraction: 0.0200 },
      { name: "i-Pentane", moleFraction: 0.0100 },
    ],
  },
  {
    name: "Synthesis Gas (Steam Reformer)",
    description: "Syngas from steam methane reformer (SMR)",
    category: "Refinery",
    components: [
      { name: "Hydrogen", moleFraction: 0.7400 },
      { name: "Carbon Monoxide", moleFraction: 0.0800 },
      { name: "Carbon Dioxide", moleFraction: 0.1000 },
      { name: "Methane", moleFraction: 0.0400 },
      { name: "Nitrogen", moleFraction: 0.0200 },
      { name: "Water Vapor", moleFraction: 0.0200 },
    ],
  },
  {
    name: "Tail Gas (SRU)",
    description: "Sulfur Recovery Unit tail gas",
    category: "Acid / Sour",
    components: [
      { name: "Nitrogen", moleFraction: 0.5500 },
      { name: "Water Vapor", moleFraction: 0.2500 },
      { name: "Carbon Dioxide", moleFraction: 0.0800 },
      { name: "Hydrogen Sulfide", moleFraction: 0.0150 },
      { name: "Sulfur Dioxide", moleFraction: 0.0050 },
      { name: "Hydrogen", moleFraction: 0.0400 },
      { name: "Carbon Monoxide", moleFraction: 0.0200 },
      { name: "Carbonyl Sulfide", moleFraction: 0.0050 },
      { name: "Methane", moleFraction: 0.0350 },
    ],
  },
];

// ─── Core Calculation ─────────────────────────────────────────────────

export function calculateGasMixing(
  input: GasMixingInput,
  componentExtras?: GasMixComponent[],
): GasMixingResult {
  const warnings: string[] = [];
  const flags: string[] = [];

  if (input.components.length < 2) {
    throw new Error("At least 2 components are required");
  }

  for (const c of input.components) {
    if (c.molecularWeight <= 0) throw new Error(`Invalid MW for ${c.name}: must be > 0`);
    if (c.moleFraction < 0) throw new Error(`Negative mole fraction for ${c.name}`);
  }

  const names = input.components.map(c => c.name.trim().toLowerCase());
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    flags.push("DUPLICATE COMPONENTS");
    warnings.push(`Duplicate component names detected: ${duplicates.join(", ")}`);
  }

  let totalMoleFraction = input.components.reduce((sum, c) => sum + c.moleFraction, 0);
  const wasNormalized = Math.abs(totalMoleFraction - 1.0) > SUM_TOLERANCE_STRICT;
  let normalizationTrace: NormalizationTrace | null = null;

  if (wasNormalized) {
    flags.push("NORMALIZATION APPLIED");
    warnings.push(`Mole fractions sum to ${totalMoleFraction.toFixed(6)} (not 1.0) — normalized`);
    normalizationTrace = {
      rawTotal: totalMoleFraction,
      normalizationFactor: totalMoleFraction > 0 ? 1 / totalMoleFraction : 0,
      normalizedFractions: input.components.map(c => ({
        name: c.name,
        raw: c.moleFraction,
        normalized: totalMoleFraction > 0 ? c.moleFraction / totalMoleFraction : 0,
      })),
    };
  }

  const normalizedComponents = input.components.map(c => ({
    ...c,
    moleFraction: wasNormalized && totalMoleFraction > 0 ? c.moleFraction / totalMoleFraction : c.moleFraction,
  }));

  const calcSteps: CalcStep[] = normalizedComponents.map(c => ({
    component: c.name,
    yi: c.moleFraction,
    mwi: c.molecularWeight,
    product: c.moleFraction * c.molecularWeight,
  }));

  const mixtureMW = calcSteps.reduce((sum, s) => sum + s.product, 0);
  const gasSG = mixtureMW / MW_AIR;

  const extraMap = new Map<string, GasMixComponent>();
  if (componentExtras) {
    for (const ce of componentExtras) {
      extraMap.set(ce.name, ce);
    }
  }

  let gammaMix: number | null = null;
  let TcPc: number | null = null;
  let PcPc: number | null = null;
  let omegaMix: number | null = null;
  let hasAllGamma = true;
  let hasAllCritical = true;
  let hasAllOmega = true;
  let gammaSum = 0;
  let tcSum = 0;
  let pcSum = 0;
  let omegaSum = 0;

  const componentsWithMass: ComponentResult[] = normalizedComponents.map(c => {
    const extra = extraMap.get(c.name);
    const gasLib = COMMON_GASES[c.name] as GasProperties | undefined;
    const gamma = extra?.gamma ?? gasLib?.gamma;
    const Tc = extra?.Tc ?? gasLib?.Tc;
    const Pc = extra?.Pc ?? gasLib?.Pc;
    const omega = extra?.omega ?? gasLib?.omega;
    const formula = extra?.formula ?? gasLib?.formula ?? "";

    if (gamma != null) { gammaSum += c.moleFraction * gamma; } else { hasAllGamma = false; }
    if (Tc != null && Pc != null) { tcSum += c.moleFraction * Tc; pcSum += c.moleFraction * Pc; } else { hasAllCritical = false; }
    if (omega != null) { omegaSum += c.moleFraction * omega; } else { hasAllOmega = false; }

    return {
      name: c.name,
      formula,
      moleFraction: c.moleFraction,
      molecularWeight: c.molecularWeight,
      massFraction: mixtureMW > 0 ? (c.moleFraction * c.molecularWeight) / mixtureMW : 0,
      yiMWi: c.moleFraction * c.molecularWeight,
      gamma,
      Tc,
      Pc,
      omega,
    };
  });

  if (hasAllGamma) gammaMix = gammaSum;
  if (hasAllCritical) { TcPc = tcSum; PcPc = pcSum; }
  if (hasAllOmega) omegaMix = omegaSum;

  const massFractionTotal = componentsWithMass.reduce((s, c) => s + c.massFraction, 0);
  const rMix = mixtureMW > 0 ? R_UNIVERSAL / mixtureMW : 0;

  if (mixtureMW < 2) {
    flags.push("LOW MW");
    warnings.push("Mixture MW is unusually low — verify component data");
  }
  if (mixtureMW > 100) {
    flags.push("HIGH MW");
    warnings.push("Mixture MW is unusually high for a gas — verify component data");
  }
  if (gasSG > 2.0) {
    flags.push("HEAVY GAS");
    warnings.push("Gas SG > 2.0 — very heavy gas, may condense at moderate pressures");
  }
  if (Math.abs(massFractionTotal - 1.0) > SUM_TOLERANCE_INTERNAL && mixtureMW > 0) {
    warnings.push(`Mass fraction total = ${massFractionTotal.toFixed(8)} (rounding artifact)`);
  }

  const h2sFrac = normalizedComponents.find(c => c.name === "Hydrogen Sulfide")?.moleFraction ?? 0;
  const co2Frac = normalizedComponents.find(c => c.name === "Carbon Dioxide")?.moleFraction ?? 0;
  if (h2sFrac > 0.0001) {
    flags.push("SOUR GAS");
    if (h2sFrac > 0.04) warnings.push(`H₂S mole fraction ${(h2sFrac * 100).toFixed(2)}% — classified as sour gas. Apply Wichert–Aziz correction for pseudocritical properties.`);
  }
  if (co2Frac > 0.05) {
    flags.push("HIGH CO₂");
    warnings.push(`CO₂ mole fraction ${(co2Frac * 100).toFixed(1)}% — significant acid gas content`);
  }

  return {
    mixtureMW, gasSG, gammaMix, TcPc, PcPc, omegaMix,
    components: componentsWithMass, totalMoleFraction,
    wasNormalized, normalizationTrace, calcSteps, massFractionTotal,
    rMix, rMixUnit: "kJ/(kg·K)", flags, warnings,
  };
}

// ─── Multi-Stream Mixing ─────────────────────────────────────────────

export function calculateMultiStreamMixing(
  streams: GasMixStream[],
  allComponents: GasMixComponent[],
): MultiStreamResult {
  const warnings: string[] = [];
  const calcTrace: string[] = [];

  if (streams.length < 2) throw new Error("At least 2 streams required for multi-stream mixing");

  const totalFlow = streams.reduce((s, st) => s + st.molarFlow, 0);
  if (totalFlow <= 0) throw new Error("Total molar flow must be positive");
  calcTrace.push(`F_total = ${streams.map(s => s.molarFlow.toFixed(2)).join(" + ")} = ${totalFlow.toFixed(2)} kmol/h`);

  const componentMap = new Map<string, { name: string; mw: number; ni: number }>();

  for (const comp of allComponents) {
    componentMap.set(comp.id, { name: comp.name, mw: comp.molecularWeight, ni: 0 });
  }

  const streamResults = streams.map(stream => {
    const streamYTotal = stream.components.reduce((s, c) => s + c.moleFraction, 0);
    if (Math.abs(streamYTotal - 1.0) > SUM_TOLERANCE_STRICT && streamYTotal > 0) {
      warnings.push(`Stream "${stream.name}": Σy = ${streamYTotal.toFixed(6)} (not 1.0)`);
    }

    const composition: { name: string; yi: number }[] = [];
    for (const sc of stream.components) {
      const comp = componentMap.get(sc.componentId);
      if (comp) {
        const ni = stream.molarFlow * sc.moleFraction;
        comp.ni += ni;
        composition.push({ name: comp.name, yi: sc.moleFraction });
        calcTrace.push(`n_${comp.name}_${stream.name} = ${stream.molarFlow.toFixed(2)} × ${sc.moleFraction.toFixed(6)} = ${ni.toFixed(4)} kmol/h`);
      }
    }

    let mwStream = 0;
    for (const sc of stream.components) {
      const comp = componentMap.get(sc.componentId);
      if (comp) mwStream += sc.moleFraction * comp.mw;
    }

    return { name: stream.name, molarFlow: stream.molarFlow, mwStream, composition };
  });

  const mixedComposition: { name: string; yi: number; ni: number; massFraction: number }[] = [];
  let mwMix = 0;
  const compMwByName = new Map<string, number>();

  componentMap.forEach((comp) => {
    if (comp.ni > 0) {
      const yi = totalFlow > 0 ? comp.ni / totalFlow : 0;
      mixedComposition.push({ name: comp.name, yi, ni: comp.ni, massFraction: 0 });
      mwMix += yi * comp.mw;
      compMwByName.set(comp.name, comp.mw);
      calcTrace.push(`y_${comp.name}_mix = ${comp.ni.toFixed(4)} / ${totalFlow.toFixed(2)} = ${yi.toFixed(6)}`);
    }
  });

  for (const mc of mixedComposition) {
    mc.massFraction = mwMix > 0 ? (mc.yi * (compMwByName.get(mc.name) || 0)) / mwMix : 0;
  }

  const rMix = mwMix > 0 ? R_UNIVERSAL / mwMix : 0;
  const gasSG = mwMix / MW_AIR;
  calcTrace.push(`MW_mix = ${mwMix.toFixed(4)} kg/kmol`);
  calcTrace.push(`SG = ${mwMix.toFixed(4)} / ${MW_AIR} = ${gasSG.toFixed(4)}`);
  calcTrace.push(`R_mix = ${R_UNIVERSAL.toFixed(5)} / ${mwMix.toFixed(4)} = ${rMix.toFixed(6)} kJ/(kg·K)`);

  return {
    streams: streamResults,
    mixedStream: { totalFlow, composition: mixedComposition, mwMix, rMix, gasSG },
    calcTrace, warnings,
  };
}

// ─── Operating Conditions Calculations ────────────────────────────────
/**
 * Calculate mixture thermodynamic properties at specified T and P.
 *
 * Correlations used:
 *   Z  — Pitzer correlation: Z = Z⁰ + ω·Z¹ (Standing-Katz based)
 *        Z⁰, Z¹ from Pitzer et al. (1955) / Lee-Kesler (1975) simplified
 *   ρ  — ρ = P·MW / (Z·R·T)
 *   μ  — Lee-Gonzalez-Eakin (1966): μ = K·exp(X·ρ^Y) [cP]
 *   Cp — Correlation: Cp_ideal + departure via reduced properties
 *   a  — Speed of sound: a = √(γ·Z·R·T/MW) [m/s]
 *
 * References:
 *   Standing & Katz (1942), Pitzer (1955), Lee-Kesler (1975),
 *   Lee-Gonzalez-Eakin (1966), GPSA Engineering Data Book
 */

export interface OperatingConditions {
  temperature: number;
  temperatureUnit: "K" | "°C" | "°F" | "°R";
  pressure: number;
  pressureUnit: "bar" | "bara" | "barg" | "psia" | "psig" | "kPa" | "MPa" | "atm";
  atmosphericPressure: number;
}

export interface ConditionsResult {
  T_K: number;
  P_bar: number;
  Tr: number;
  Pr: number;
  Z: number;
  density_kgm3: number;
  specificVolume_m3kg: number;
  molarVolume_m3kmol: number;
  viscosity_cP: number;
  Cp_kJkgK: number | null;
  Cv_kJkgK: number | null;
  gammaActual: number | null;
  speedOfSound_ms: number | null;
  JT_Kbar: number | null;
  idealDensity_kgm3: number;
  calcTrace: CondCalcStep[];
  flags: string[];
  warnings: string[];
}

export interface CondCalcStep {
  label: string;
  equation: string;
  value: number;
  unit: string;
}

function convertTemperatureToK(T: number, unit: string): number {
  switch (unit) {
    case "K": return T;
    case "°C": return T + 273.15;
    case "°F": return (T - 32) * 5 / 9 + 273.15;
    case "°R": return T * 5 / 9;
    default: return T;
  }
}

function convertPressureToBar(P: number, unit: string, Patm: number): number {
  switch (unit) {
    case "bar":
    case "bara": return P;
    case "barg": return P + Patm;
    case "psia": return P * 0.0689476;
    case "psig": return (P + Patm / 0.0689476) * 0.0689476;
    case "kPa": return P / 100;
    case "MPa": return P * 10;
    case "atm": return P * 1.01325;
    default: return P;
  }
}

/**
 * Pitzer Z-factor correlation (simplified Lee-Kesler form).
 *
 * Z⁰ = 1 + B⁰·Pr/Tr + C⁰·(Pr/Tr)²
 * B⁰ = 0.083 - 0.422/Tr^1.6
 * C⁰ = 0.139 - 0.172/Tr^4.2
 *
 * Z¹ = B¹·Pr/Tr + C¹·(Pr/Tr)²
 * B¹ = 0.139 - 0.172/Tr^4.2
 * C¹ = 0.008 + 0.043/Tr^2
 *
 * Z = Z⁰ + ω·Z¹
 *
 * Valid for Pr < ~10, Tr > 0.5. For engineering screening, this is adequate.
 * For high-accuracy work, use Peng-Robinson or SRK EOS.
 */
function pitzerZ(Tr: number, Pr: number, omega: number): number {
  const B0 = 0.083 - 0.422 / Math.pow(Tr, 1.6);
  const C0 = 0.139 - 0.172 / Math.pow(Tr, 4.2);
  const Z0 = 1 + B0 * Pr / Tr + C0 * Math.pow(Pr / Tr, 2);

  const B1 = 0.139 - 0.172 / Math.pow(Tr, 4.2);
  const C1 = 0.008 + 0.043 / Math.pow(Tr, 2);
  const Z1 = B1 * Pr / Tr + C1 * Math.pow(Pr / Tr, 2);

  let Z = Z0 + omega * Z1;
  if (Z < 0.05) Z = 0.05;
  if (Z > 5.0) Z = 5.0;
  return Z;
}

/**
 * Lee-Gonzalez-Eakin gas viscosity correlation (1966).
 *
 * μ = K × exp(X × ρ^Y) × 1e-4 [cP]
 * K = (9.379 + 0.01607·MW)·T^1.5 / (209.2 + 19.26·MW + T)
 * X = 3.448 + 986.4/T + 0.01009·MW
 * Y = 2.447 - 0.2224·X
 * ρ in g/cm³
 *
 * Reference: Lee, A.L., Gonzalez, M.H., Eakin, B.E. (1966)
 *            "The Viscosity of Natural Gases"
 *            Journal of Petroleum Technology, SPE-1340-PA
 */
function lgeViscosity(T_R: number, density_gcm3: number, MW: number): number {
  const K = (9.379 + 0.01607 * MW) * Math.pow(T_R, 1.5) / (209.2 + 19.26 * MW + T_R);
  const X = 3.448 + 986.4 / T_R + 0.01009 * MW;
  const Y = 2.447 - 0.2224 * X;
  return K * Math.exp(X * Math.pow(density_gcm3, Y)) * 1e-4;
}

export function calculateMixtureAtConditions(
  mixResult: GasMixingResult,
  conditions: OperatingConditions,
): ConditionsResult {
  const flags: string[] = [];
  const warnings: string[] = [];
  const calcTrace: CondCalcStep[] = [];

  const T_K = convertTemperatureToK(conditions.temperature, conditions.temperatureUnit);
  const P_bar = convertPressureToBar(conditions.pressure, conditions.pressureUnit, conditions.atmosphericPressure);

  if (T_K <= 0) throw new Error("Absolute temperature must be positive");
  if (P_bar <= 0) throw new Error("Absolute pressure must be positive");

  calcTrace.push({ label: "Temperature", equation: `${conditions.temperature} ${conditions.temperatureUnit}`, value: T_K, unit: "K" });
  calcTrace.push({ label: "Pressure", equation: `${conditions.pressure} ${conditions.pressureUnit}`, value: P_bar, unit: "bar (abs)" });

  const MW = mixResult.mixtureMW;
  const TcPc = mixResult.TcPc;
  const PcPc = mixResult.PcPc;
  const omega = mixResult.omegaMix;
  const gammaMix = mixResult.gammaMix;

  let Tr = 0, Pr = 0, Z = 1;
  let hasCritical = TcPc != null && PcPc != null && TcPc > 0 && PcPc > 0;

  if (hasCritical) {
    Tr = T_K / TcPc!;
    Pr = P_bar / PcPc!;
    calcTrace.push({ label: "Reduced Temperature (Tr)", equation: `${T_K.toFixed(2)} / ${TcPc!.toFixed(2)}`, value: Tr, unit: "—" });
    calcTrace.push({ label: "Reduced Pressure (Pr)", equation: `${P_bar.toFixed(2)} / ${PcPc!.toFixed(2)}`, value: Pr, unit: "—" });

    const w = omega ?? 0;
    Z = pitzerZ(Tr, Pr, w);
    calcTrace.push({
      label: "Compressibility Factor (Z)",
      equation: `Z⁰ + ω·Z¹ (Pitzer, ω=${w.toFixed(4)})`,
      value: Z,
      unit: "—",
    });

    if (Tr < 1.0) {
      flags.push("NEAR_CRITICAL");
      warnings.push(`Tr = ${Tr.toFixed(3)} < 1.0 — below pseudocritical temperature. Possible condensation. Pitzer correlation accuracy degrades significantly.`);
    }
    if (Pr > 10) {
      flags.push("HIGH_PRESSURE");
      warnings.push(`Pr = ${Pr.toFixed(2)} > 10 — very high reduced pressure. Use Peng-Robinson or SRK EOS for accurate Z.`);
    }
    if (Tr < 0.5 || Pr > 15) {
      warnings.push("Operating conditions outside Pitzer correlation validity range. Results are approximate.");
    }
  } else {
    flags.push("NO_CRITICAL_DATA");
    warnings.push("Pseudocritical properties not available — assuming Z = 1.0 (ideal gas). Provide Tc and Pc for all components for real-gas calculations.");
    Z = 1.0;
    Tr = 0;
    Pr = 0;
  }

  // R in consistent units: 8.31446 kJ/(kmol·K) = 0.0831446 (L·bar)/(mol·K)
  // For ρ: P [Pa] = P_bar × 1e5, R_J = 8314.46 J/(kmol·K)
  const R_J = 8314.46; // J/(kmol·K)
  const P_Pa = P_bar * 1e5;

  const density_kgm3 = (P_Pa * MW) / (Z * R_J * T_K);
  const idealDensity = (P_Pa * MW) / (R_J * T_K);
  const specificVolume = 1 / density_kgm3;
  const molarVolume = (Z * R_J * T_K) / P_Pa; // m³/kmol

  calcTrace.push({ label: "Gas Density", equation: `P·MW / (Z·R·T) = ${P_bar.toFixed(2)}×1e5 × ${MW.toFixed(3)} / (${Z.toFixed(4)} × 8314.46 × ${T_K.toFixed(2)})`, value: density_kgm3, unit: "kg/m³" });
  calcTrace.push({ label: "Ideal Gas Density", equation: `P·MW / (R·T)`, value: idealDensity, unit: "kg/m³" });
  calcTrace.push({ label: "Specific Volume", equation: `1/ρ`, value: specificVolume, unit: "m³/kg" });
  calcTrace.push({ label: "Molar Volume", equation: `Z·R·T / P`, value: molarVolume, unit: "m³/kmol" });

  // Viscosity (Lee-Gonzalez-Eakin) — uses T in °R and ρ in g/cm³
  const T_R = T_K * 1.8; // K to °R
  const density_gcm3 = density_kgm3 / 1000;
  let viscosity_cP = lgeViscosity(T_R, density_gcm3, MW);

  if (!isFinite(viscosity_cP) || viscosity_cP <= 0 || viscosity_cP > 1) {
    viscosity_cP = 0.01;
    warnings.push("Viscosity calculation returned unusual value — defaulted to 0.01 cP. Check conditions.");
  }

  calcTrace.push({ label: "Dynamic Viscosity", equation: `Lee-Gonzalez-Eakin (T=${T_R.toFixed(1)} °R, ρ=${density_gcm3.toExponential(4)} g/cm³)`, value: viscosity_cP, unit: "cP" });

  // Cp estimation (ideal + departure for moderate pressures)
  // Cp_ideal ≈ γ/(γ-1) × R/MW [kJ/(kg·K)] for the mixture
  let Cp_kJkgK: number | null = null;
  let Cv_kJkgK: number | null = null;
  let gammaActual: number | null = null;
  let speedOfSound: number | null = null;
  let JT: number | null = null;

  if (gammaMix != null && gammaMix > 1) {
    const Rsp = R_UNIVERSAL / MW; // kJ/(kg·K)
    const Cp_ideal = gammaMix / (gammaMix - 1) * Rsp;
    const Cv_ideal = 1 / (gammaMix - 1) * Rsp;

    // Departure correction for real gas (simplified)
    // At low Pr: Cp ≈ Cp_ideal; at higher Pr: Cp increases
    let CpDeparture = 0;
    if (hasCritical && Tr > 0.5) {
      // Simplified residual Cp/R from generalized correlation
      // ΔCp/R ≈ -Tr × d²(B·Pr/Tr)/dTr² × Pr
      // For screening: ΔCp ≈ Rsp × Pr²/(Tr³) × 0.422×1.6×2.6/Tr^1.6
      const d2B0 = 0.422 * 1.6 * 2.6 / Math.pow(Tr, 3.6);
      CpDeparture = Rsp * Pr * d2B0 * Tr;
      if (CpDeparture < 0) CpDeparture = 0;
    }

    Cp_kJkgK = Cp_ideal + CpDeparture;
    Cv_kJkgK = Cp_kJkgK - Rsp; // ideal-gas relation: Cp − Cv = R_specific [kJ/(kg·K)]
    if (Cv_kJkgK <= 0) Cv_kJkgK = Cv_ideal;
    gammaActual = Cp_kJkgK / Cv_kJkgK;

    calcTrace.push({ label: "Cp (ideal)", equation: `γ/(γ-1) × R/MW = ${gammaMix.toFixed(4)}/(${gammaMix.toFixed(4)}-1) × ${Rsp.toFixed(6)}`, value: Cp_ideal, unit: "kJ/(kg·K)" });
    calcTrace.push({ label: "Cp (at conditions)", equation: `Cp_ideal + ΔCp_departure`, value: Cp_kJkgK, unit: "kJ/(kg·K)" });
    calcTrace.push({ label: "Cv (at conditions)", equation: `Cp − R_sp (ideal-gas: Cp−Cv = R/MW)`, value: Cv_kJkgK, unit: "kJ/(kg·K)" });
    calcTrace.push({ label: "γ (at conditions)", equation: `Cp/Cv`, value: gammaActual, unit: "—" });

    // Speed of sound: a = √(γ·Z·R·T/MW) where R in J/(kg·K)
    const Rsp_J = Rsp * 1000; // J/(kg·K)
    speedOfSound = Math.sqrt(gammaActual * Z * Rsp_J * T_K);
    calcTrace.push({ label: "Speed of Sound", equation: `√(γ·Z·R·T/MW)`, value: speedOfSound, unit: "m/s" });

    // Joule-Thomson coefficient (simplified): μ_JT ≈ (T × dZ/dT_P - Z + 1) × V / (Cp × Z)
    // Simplified: μ_JT ≈ (2/Pr × (T × B'(Tr)) - B0) / Cp  [K/bar]
    if (hasCritical && Tr > 0.5) {
      const B0 = 0.083 - 0.422 / Math.pow(Tr, 1.6);
      const dB0dTr = 0.422 * 1.6 / Math.pow(Tr, 2.6);
      const Tc_val = TcPc!;
      const Pc_val = PcPc!;
      JT = (Tc_val / (Pc_val * 100)) * (dB0dTr * Tr - B0) / Cp_kJkgK;
      calcTrace.push({ label: "Joule-Thomson Coefficient", equation: `simplified virial`, value: JT, unit: "K/bar" });
      if (JT < 0) {
        flags.push("INVERSION");
        warnings.push("Negative Joule-Thomson coefficient — above inversion temperature (heating on expansion).");
      }
    }
  }

  if (density_kgm3 > 500) {
    flags.push("LIQUID_LIKE");
    warnings.push("Density exceeds 500 kg/m³ — may be in liquid or supercritical phase.");
  }

  return {
    T_K, P_bar, Tr, Pr, Z,
    density_kgm3, specificVolume_m3kg: specificVolume, molarVolume_m3kmol: molarVolume,
    viscosity_cP,
    Cp_kJkgK, Cv_kJkgK, gammaActual, speedOfSound_ms: speedOfSound,
    JT_Kbar: JT,
    idealDensity_kgm3: idealDensity,
    calcTrace, flags, warnings,
  };
}

// ─── Defaults & Test Cases ────────────────────────────────────────────

export const DEFAULT_PROJECT: GasMixProject = {
  name: "", caseId: "", engineer: "",
  date: new Date().toISOString().split("T")[0],
  mwUnits: "kg/kmol", normalizationMode: "normalize",
};

let _nextId = 1;
export function nextId(): string { return `comp_${_nextId++}`; }

export function createEmptyComponent(): GasMixComponent {
  return { id: nextId(), name: "", formula: "", molecularWeight: 0, moleFraction: 0, notes: "" };
}

export function componentFromLibrary(gasName: string, moleFraction: number): GasMixComponent {
  const gas = COMMON_GASES[gasName];
  if (!gas) return { ...createEmptyComponent(), name: gasName, moleFraction };
  return {
    id: nextId(),
    name: gasName,
    formula: gas.formula,
    molecularWeight: gas.mw,
    moleFraction,
    notes: "",
    gamma: gas.gamma,
    Tc: gas.Tc,
    Pc: gas.Pc,
    omega: gas.omega,
  };
}

export function loadPreset(preset: PresetComposition): GasMixComponent[] {
  return preset.components.map(c => componentFromLibrary(c.name, c.moleFraction));
}

export const GAS_MIXING_TEST_CASE: GasMixingInput = {
  components: [
    { name: "Methane", moleFraction: 0.85, molecularWeight: 16.043 },
    { name: "Ethane", moleFraction: 0.08, molecularWeight: 30.070 },
    { name: "Propane", moleFraction: 0.04, molecularWeight: 44.096 },
    { name: "Nitrogen", moleFraction: 0.02, molecularWeight: 28.014 },
    { name: "Carbon Dioxide", moleFraction: 0.01, molecularWeight: 44.010 },
  ],
};

export const GAS_MIXING_TEST_COMPONENTS: GasMixComponent[] = [
  { id: "t1", name: "Methane", formula: "CH₄", molecularWeight: 16.043, moleFraction: 0.85, notes: "", gamma: 1.31, Tc: 190.56, Pc: 45.99, omega: 0.0115 },
  { id: "t2", name: "Ethane", formula: "C₂H₆", molecularWeight: 30.070, moleFraction: 0.08, notes: "", gamma: 1.19, Tc: 305.32, Pc: 48.72, omega: 0.0995 },
  { id: "t3", name: "Propane", formula: "C₃H₈", molecularWeight: 44.096, moleFraction: 0.04, notes: "", gamma: 1.13, Tc: 369.83, Pc: 42.48, omega: 0.1523 },
  { id: "t4", name: "Nitrogen", formula: "N₂", molecularWeight: 28.014, moleFraction: 0.02, notes: "", gamma: 1.40, Tc: 126.20, Pc: 33.98, omega: 0.0372 },
  { id: "t5", name: "Carbon Dioxide", formula: "CO₂", molecularWeight: 44.010, moleFraction: 0.01, notes: "", gamma: 1.29, Tc: 304.13, Pc: 73.77, omega: 0.2239 },
];

export const MULTI_STREAM_TEST = {
  components: GAS_MIXING_TEST_COMPONENTS,
  streams: [
    {
      id: "s1", name: "Stream A", molarFlow: 100, flowUnit: "kmol/h",
      components: [
        { componentId: "t1", moleFraction: 0.90 },
        { componentId: "t2", moleFraction: 0.05 },
        { componentId: "t3", moleFraction: 0.03 },
        { componentId: "t4", moleFraction: 0.01 },
        { componentId: "t5", moleFraction: 0.01 },
      ],
    },
    {
      id: "s2", name: "Stream B", molarFlow: 50, flowUnit: "kmol/h",
      components: [
        { componentId: "t1", moleFraction: 0.75 },
        { componentId: "t2", moleFraction: 0.14 },
        { componentId: "t3", moleFraction: 0.06 },
        { componentId: "t4", moleFraction: 0.04 },
        { componentId: "t5", moleFraction: 0.01 },
      ],
    },
  ] as GasMixStream[],
};

export { R_UNIVERSAL, MW_AIR };

// ─── EoS Integration for Gas Mixing ──────────────────────────────────

/**
 * Result of an EoS-based operating conditions calculation.
 * Extends ConditionsResult with EoS-specific trace.
 */
export interface EoSConditionsResult extends ConditionsResult {
  eosMode: "pr" | "srk";
  eosMapped: number;       // number of components mapped to COMPONENT_DB
  eosTotal:  number;       // total number of components in mixture
  eosSteps: { label: string; equation: string; value: string; unit: string }[];
}

/**
 * Bridge a gas mixing composition to EoS CompositionEntry[].
 * Maps component names via NAME_TO_EOS_ID.
 * Returns null for components not in the database (with names in `unmapped`).
 */
export function bridgeCompositionToEoS(
  components: ComponentResult[],
): { entries: CompositionEntry[]; unmapped: string[] } {
  const entries: CompositionEntry[] = [];
  const unmapped: string[] = [];

  for (const c of components) {
    const id = NAME_TO_EOS_ID[c.name];
    if (id) {
      if (c.moleFraction > 0) entries.push({ componentId: id, moleFraction: c.moleFraction });
    } else {
      if (c.moleFraction > 0) unmapped.push(`${c.name} (y=${(c.moleFraction * 100).toFixed(2)}%)`);
    }
  }

  return { entries, unmapped };
}

/**
 * Calculate mixture operating-conditions properties using PR or SRK EoS.
 *
 * Falls back to Pitzer if fewer than 2 components can be mapped to COMPONENT_DB.
 * Partially mappable compositions run EoS on the mappable sub-set and warn about unmapped species.
 *
 * EoS references:
 *   PR: Peng & Robinson (1976/1978)
 *   SRK: Soave (1972); mixing rules per Graboski & Daubert (1978)
 *   Viscosity: Lee, Gonzalez & Eakin (1966) SPE-1340-PA
 *   Flash: isenthalpic bisection, 60 iterations, 1 kJ/kmol tolerance
 */
export function calculateMixtureAtConditionsEoS(
  mixResult: GasMixingResult,
  conditions: OperatingConditions,
  eosMode: "pr" | "srk",
): EoSConditionsResult {
  const { entries, unmapped } = bridgeCompositionToEoS(mixResult.components);
  const total = mixResult.components.filter(c => c.moleFraction > 0).length;
  const mapped = entries.length;

  // Warn about unmapped components; fall back to Pitzer if coverage is too low
  const baseResult = calculateMixtureAtConditions(mixResult, conditions);

  if (mapped < 2) {
    const result: EoSConditionsResult = {
      ...baseResult,
      eosMode, eosMapped: mapped, eosTotal: total,
      eosSteps: [],
    };
    result.warnings.push(
      `EoS mode selected but only ${mapped}/${total} components are in the EoS database. ` +
      `Unmapped: ${unmapped.join(", ")}. Falling back to Pitzer correlation.`
    );
    return result;
  }

  const T_K = conditions.temperatureUnit === "K" ? conditions.temperature
    : conditions.temperatureUnit === "°C" ? conditions.temperature + 273.15
    : conditions.temperatureUnit === "°F" ? (conditions.temperature - 32) * 5 / 9 + 273.15
    : conditions.temperature * 5 / 9; // °R

  const P_bar = conditions.pressureUnit === "bar" || conditions.pressureUnit === "bara" ? conditions.pressure
    : conditions.pressureUnit === "barg" ? conditions.pressure + conditions.atmosphericPressure
    : conditions.pressureUnit === "psia" ? conditions.pressure * 0.0689476
    : conditions.pressureUnit === "psig" ? (conditions.pressure + conditions.atmosphericPressure / 0.0689476) * 0.0689476
    : conditions.pressureUnit === "kPa" ? conditions.pressure / 100
    : conditions.pressureUnit === "MPa" ? conditions.pressure * 10
    : conditions.pressureUnit === "atm" ? conditions.pressure * 1.01325
    : conditions.pressure;

  const flags: string[] = [];
  const warnings: string[] = [...baseResult.warnings.filter(w => w.includes("Unmapped") || w.includes("assuming Z = 1"))];

  if (unmapped.length > 0) {
    warnings.push(
      `Components not in EoS database (contribution re-distributed): ${unmapped.join(", ")}. ` +
      `EoS applied to ${mapped}/${total} components.`
    );
  }

  try {
    const eos = eosMode === "pr"
      ? computePRProperties(entries, T_K - 273.15, P_bar)
      : computeSRKProperties(entries, T_K - 273.15, P_bar);

    if (eos.warnings.length > 0) warnings.push(...eos.warnings);

    if (eos.phase === "two-phase") flags.push("TWO_PHASE");
    if (eos.Z < 0.2) flags.push("NEAR_CRITICAL");

    const Rsp = 8314.46 / eos.MWm; // J/(kg·K) = specific gas constant
    const Cp_kJkgK = eos.Cp_mix / eos.MWm; // kJ/kg·K (ideal-gas Cp from EoS database)
    const Cv_kJkgK = Cp_kJkgK - Rsp / 1000; // ideal-gas: Cp − Cv = R_specific [kJ/(kg·K)]
    const gammaActual = Cv_kJkgK > 0 ? Cp_kJkgK / Cv_kJkgK : null;
    const speedOfSound = gammaActual != null
      ? Math.sqrt(gammaActual * eos.Z * Rsp * T_K)
      : null;

    const density_kgm3 = eos.rho;
    const molarVolume = eos.Vm;
    const specificVolume = 1 / density_kgm3;
    const idealDensity = (P_bar * 1e5 * eos.MWm) / (8314.46 * T_K);

    const eosSteps = eos.steps.map(s => ({
      label: s.label, equation: s.equation, value: s.value, unit: s.unit,
    }));

    const result: EoSConditionsResult = {
      T_K, P_bar,
      Tr: 0, Pr: 0, // not meaningful for EoS (no single Tc/Pc)
      Z: eos.Z,
      density_kgm3,
      specificVolume_m3kg: specificVolume,
      molarVolume_m3kmol: molarVolume,
      viscosity_cP: eos.viscosity_cP,
      Cp_kJkgK, Cv_kJkgK: Cv_kJkgK > 0 ? Cv_kJkgK : null,
      gammaActual,
      speedOfSound_ms: speedOfSound,
      JT_Kbar: null, // not computed from EoS yet
      idealDensity_kgm3: idealDensity,
      calcTrace: [
        { label: "Temperature", equation: `${conditions.temperature} ${conditions.temperatureUnit}`, value: T_K, unit: "K" },
        { label: "Pressure", equation: `${conditions.pressure} ${conditions.pressureUnit}`, value: P_bar, unit: "bara" },
        { label: `EoS Mode`, equation: eosMode === "pr" ? "Peng-Robinson (1976/1978)" : "SRK (Soave 1972)", value: eos.Z, unit: "Z" },
        { label: "ρ (EoS)", equation: "MWm/Vm", value: density_kgm3, unit: "kg/m³" },
        { label: "μ (Lee 1966)", equation: "K·exp(X·ρ^Y)", value: eos.viscosity_cP, unit: "cP" },
        { label: "Cp (ideal gas)", equation: "Σxi·Cp,i / MWm", value: Cp_kJkgK, unit: "kJ/(kg·K)" },
        { label: "Cv (ideal-gas rel.)", equation: "Cp − Rsp  (Rsp = Ru/MWm)", value: Cv_kJkgK, unit: "kJ/(kg·K)" },
        { label: "γ (actual)", equation: "Cp/Cv", value: gammaActual ?? 0, unit: "—" },
        ...(speedOfSound != null ? [{ label: "a (speed of sound)", equation: "√(γ·Z·R·T/MW)", value: speedOfSound, unit: "m/s" }] : []),
      ],
      flags, warnings,
      eosMode, eosMapped: mapped, eosTotal: total, eosSteps,
    };

    return result;
  } catch (err) {
    const result: EoSConditionsResult = {
      ...baseResult,
      eosMode, eosMapped: mapped, eosTotal: total,
      eosSteps: [],
    };
    result.warnings.push(`EoS calculation failed: ${err instanceof Error ? err.message : String(err)}. Showing Pitzer fallback.`);
    return result;
  }
}
