/**
 * src/lib/physics/index.ts
 * Main Export and Unified Calculator Logic
 */
export * from "./types";
import { HydraulicInputs, HydraulicResult } from "./types";
import { calcLiquidPressureDrop, calcGasPressureDrop } from "./singlePhase";
import { calcBeggsBrill, calcHomogeneousDrift } from "./multiPhase";

export type CalculationType = "gas" | "liquid" | "mixed-beggs-brill" | "mixed-homogeneous";

export const calculateHydraulics = (
    type: CalculationType,
    inputs: HydraulicInputs
): HydraulicResult => {
    switch (type) {
        case "gas":
            return calcGasPressureDrop(inputs);
        case "liquid":
            return calcLiquidPressureDrop(inputs);
        case "mixed-beggs-brill":
            return calcBeggsBrill(inputs);
        case "mixed-homogeneous":
            // Optional: fallback to homogeneous
            return calcHomogeneousDrift(inputs);
        default:
            throw new Error(`Unknown calculation type: ${type}`);
    }
};
