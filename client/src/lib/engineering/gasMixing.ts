/**
 * Gas Mixing Calculator — Mole-Fraction Weighted MW + Multi-Stream Mixing
 *
 * Equations:
 *   MW_mix = Σ(y_i × MW_i)              — mole-fraction weighted average
 *   w_i    = (y_i × MW_i) / MW_mix       — mass fraction from mole fraction
 *   R_mix  = R_u / MW_mix                 — mixture specific gas constant
 *   Multi-stream:
 *     F_total   = ΣF_j
 *     n_i       = Σ(F_j × y_i,j)
 *     y_i,mix   = n_i / F_total
 *
 * Reference: Perry's Chemical Engineers' Handbook, GPSA Engineering Data Book
 */

import type { GasMixingInput } from "./validation";

// ─── Constants ────────────────────────────────────────────────────────

const R_UNIVERSAL = 8.31446; // kJ/(kmol·K)
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
  moleFraction: number;
  molecularWeight: number;
  massFraction: number;
  yiMWi: number;
}

export interface GasMixingResult {
  mixtureMW: number;
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
  };
  calcTrace: string[];
  warnings: string[];
}

// ─── Core Calculation ─────────────────────────────────────────────────

export function calculateGasMixing(input: GasMixingInput): GasMixingResult {
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

  const componentsWithMass: ComponentResult[] = normalizedComponents.map(c => ({
    name: c.name,
    moleFraction: c.moleFraction,
    molecularWeight: c.molecularWeight,
    massFraction: mixtureMW > 0 ? (c.moleFraction * c.molecularWeight) / mixtureMW : 0,
    yiMWi: c.moleFraction * c.molecularWeight,
  }));

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
  if (Math.abs(massFractionTotal - 1.0) > SUM_TOLERANCE_INTERNAL && mixtureMW > 0) {
    warnings.push(`Mass fraction total = ${massFractionTotal.toFixed(8)} (rounding artifact)`);
  }

  return {
    mixtureMW, components: componentsWithMass, totalMoleFraction,
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
  calcTrace.push(`MW_mix = ${mwMix.toFixed(4)} kg/kmol`);
  calcTrace.push(`R_mix = ${R_UNIVERSAL.toFixed(5)} / ${mwMix.toFixed(4)} = ${rMix.toFixed(6)} kJ/(kg·K)`);

  return {
    streams: streamResults,
    mixedStream: { totalFlow, composition: mixedComposition, mwMix, rMix },
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

export const GAS_MIXING_TEST_CASE: GasMixingInput = {
  components: [
    { name: "Methane (CH4)", moleFraction: 0.85, molecularWeight: 16.04 },
    { name: "Ethane (C2H6)", moleFraction: 0.08, molecularWeight: 30.07 },
    { name: "Propane (C3H8)", moleFraction: 0.04, molecularWeight: 44.10 },
    { name: "Nitrogen (N2)", moleFraction: 0.02, molecularWeight: 28.01 },
    { name: "CO2", moleFraction: 0.01, molecularWeight: 44.01 },
  ],
};

export const GAS_MIXING_TEST_COMPONENTS: GasMixComponent[] = [
  { id: "t1", name: "Methane (CH4)", formula: "CH4", molecularWeight: 16.04, moleFraction: 0.85, notes: "" },
  { id: "t2", name: "Ethane (C2H6)", formula: "C2H6", molecularWeight: 30.07, moleFraction: 0.08, notes: "" },
  { id: "t3", name: "Propane (C3H8)", formula: "C3H8", molecularWeight: 44.10, moleFraction: 0.04, notes: "" },
  { id: "t4", name: "Nitrogen (N2)", formula: "N2", molecularWeight: 28.01, moleFraction: 0.02, notes: "" },
  { id: "t5", name: "CO2", formula: "CO2", molecularWeight: 44.01, moleFraction: 0.01, notes: "" },
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

export { R_UNIVERSAL };
