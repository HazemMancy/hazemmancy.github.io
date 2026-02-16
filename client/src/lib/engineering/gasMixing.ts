import type { GasMixingInput } from "./validation";

export interface GasMixingResult {
  mixtureMW: number;
  components: Array<{
    name: string;
    moleFraction: number;
    molecularWeight: number;
    massFraction: number;
  }>;
  totalMoleFraction: number;
  wasNormalized: boolean;
  warnings: string[];
}

export function calculateGasMixing(input: GasMixingInput): GasMixingResult {
  const warnings: string[] = [];

  let totalMoleFraction = input.components.reduce((sum, c) => sum + c.moleFraction, 0);

  const wasNormalized = Math.abs(totalMoleFraction - 1.0) > 0.001;
  if (wasNormalized) {
    warnings.push(
      `Mole fractions summed to ${totalMoleFraction.toFixed(4)} — auto-normalized to 1.0`
    );
  }

  const normalizedComponents = input.components.map((c) => ({
    ...c,
    moleFraction: wasNormalized ? c.moleFraction / totalMoleFraction : c.moleFraction,
  }));

  const mixtureMW = normalizedComponents.reduce(
    (sum, c) => sum + c.moleFraction * c.molecularWeight,
    0
  );

  const componentsWithMass = normalizedComponents.map((c) => ({
    name: c.name,
    moleFraction: c.moleFraction,
    molecularWeight: c.molecularWeight,
    massFraction: (c.moleFraction * c.molecularWeight) / mixtureMW,
  }));

  if (mixtureMW < 2) {
    warnings.push("Mixture MW is unusually low — verify component data");
  }
  if (mixtureMW > 100) {
    warnings.push("Mixture MW is unusually high for a gas — verify component data");
  }

  return {
    mixtureMW,
    components: componentsWithMass,
    totalMoleFraction,
    wasNormalized,
    warnings,
  };
}

// Typical sweet natural gas composition — per GPSA Engineering Data Book, Table 2-2
// North Sea / Gulf sweet gas composition, fractions sum to 1.00
// Expected: mixture MW ≈ 18.5 g/mol, 100% mole fraction total
export const GAS_MIXING_TEST_CASE: GasMixingInput = {
  components: [
    { name: "Methane (CH4)", moleFraction: 0.85, molecularWeight: 16.04 },
    { name: "Ethane (C2H6)", moleFraction: 0.08, molecularWeight: 30.07 },
    { name: "Propane (C3H8)", moleFraction: 0.04, molecularWeight: 44.10 },
    { name: "Nitrogen (N2)", moleFraction: 0.02, molecularWeight: 28.01 },
    { name: "CO2", moleFraction: 0.01, molecularWeight: 44.01 },
  ],
};
