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
