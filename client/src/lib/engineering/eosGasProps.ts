/**
 * Shared EoS Gas Properties Resolver
 *
 * Provides a unified Manual / Peng-Robinson / SRK gas property resolution layer
 * used by all gas-capable calculators (RO, Compressor, PSV, Gas Line, Control Valve).
 *
 * resolveGasProps() is the single entry point. It:
 *   - Returns manual inputs as-is when mode = "manual"
 *   - Calls computePRProperties or computeSRKProperties when mode = "pr" / "srk"
 *   - Falls back gracefully to manual values if EoS computation fails
 *
 * References:
 *   Peng & Robinson (1976) Ind. Eng. Chem. Fundam. 15(1), 59-64
 *   Soave (1972) Chem. Eng. Sci. 27(6), 1197-1203
 *   Lee & Gonzalez-Eakin (1966) SPE-1340-PA — gas viscosity
 *   Chueh & Prausnitz (1967) AIChE J. 13(6) — binary interaction parameters
 */

import type { CompositionEntry, SRKMixtureResult } from "./srkEos";
import { computeSRKProperties } from "./srkEos";
import { computePRProperties } from "./prEos";

export type GasPropsMode = "manual" | "srk" | "pr";

export interface ManualGasProps {
  molecularWeight: number;
  specificHeatRatio: number;
  compressibilityFactor: number;
  viscosity: number;
}

export const DEFAULT_MANUAL_GAS_PROPS: ManualGasProps = {
  molecularWeight: 18.5,
  specificHeatRatio: 1.27,
  compressibilityFactor: 0.92,
  viscosity: 0.012,
};

export const DEFAULT_EOS_COMPOSITION: CompositionEntry[] = [
  { componentId: "CH4",  moleFraction: 0.850 },
  { componentId: "C2H6", moleFraction: 0.090 },
  { componentId: "C3H8", moleFraction: 0.040 },
  { componentId: "N2",   moleFraction: 0.020 },
];

export interface ResolvedGasProps {
  MW: number;
  k: number;
  Z: number;
  viscosity_cP: number;
  rho_kg_m3: number;
  eosResult: SRKMixtureResult | null;
  mode: GasPropsMode;
  warnings: string[];
}

const R_UNIV = 8314.46; // J/(kmol·K)

/**
 * Resolve gas properties from the selected mode.
 *
 * @param mode        - "manual" | "pr" | "srk"
 * @param manual      - Manual fallback / override values (always required as backup)
 * @param composition - EoS composition entries (used when mode ≠ "manual")
 * @param temperature_C - Operating temperature in °C (used for EoS + manual ρ)
 * @param pressure_bar  - Operating pressure in bar(a) (used for EoS + manual ρ)
 */
export function resolveGasProps(
  mode: GasPropsMode,
  manual: ManualGasProps,
  composition: CompositionEntry[],
  temperature_C: number,
  pressure_bar: number,
): ResolvedGasProps {
  const warnings: string[] = [];

  const manualRho = () => {
    const T_K = temperature_C + 273.15;
    const P_Pa = pressure_bar * 1e5;
    return (P_Pa * manual.molecularWeight) / (Math.max(manual.compressibilityFactor, 1e-9) * R_UNIV * T_K);
  };

  if (mode === "manual") {
    return {
      MW: manual.molecularWeight,
      k: manual.specificHeatRatio,
      Z: manual.compressibilityFactor,
      viscosity_cP: manual.viscosity,
      rho_kg_m3: manualRho(),
      eosResult: null,
      mode,
      warnings,
    };
  }

  const eosFn = mode === "pr" ? computePRProperties : computeSRKProperties;
  const eosLabel = mode === "pr" ? "PR EoS (Peng-Robinson)" : "SRK EoS (Soave)";

  try {
    const res = eosFn(composition, temperature_C, pressure_bar);
    for (const w of res.warnings) warnings.push(`${eosLabel}: ${w}`);
    return {
      MW: res.MWm,
      k: res.k,
      Z: res.Z,
      viscosity_cP: res.viscosity_cP,
      rho_kg_m3: res.rho,
      eosResult: res,
      mode,
      warnings,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(`${eosLabel} failed: ${msg}. Falling back to manual gas properties.`);
    return {
      MW: manual.molecularWeight,
      k: manual.specificHeatRatio,
      Z: manual.compressibilityFactor,
      viscosity_cP: manual.viscosity,
      rho_kg_m3: manualRho(),
      eosResult: null,
      mode: "manual",
      warnings,
    };
  }
}
