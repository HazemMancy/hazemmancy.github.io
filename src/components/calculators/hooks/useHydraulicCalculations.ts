import { useMemo } from "react";
import { HydraulicInputs, CalculationResults, ValidationResult } from "../types/hydraulicTypes";
import {
    calculatePipeGeometry,
    calculateFlowProperties,
    calculatePressureDrop,
    calculateAPICriteriaChecks
} from "../utils/calculations";
import { PIPE_SCHEDULE_DATA } from "../data/constants";

export const useHydraulicCalculations = (inputs: HydraulicInputs) => {
    // Single source of truth for all calculations
    const results = useMemo((): CalculationResults | null => {
        try {
            // 1. Validate inputs
            const validation = validateInputs(inputs);
            if (!validation.isValid) {
                return null;
            }

            // 2. Calculate pipe geometry
            const pipeGeometry = calculatePipeGeometry(inputs);
            if (!pipeGeometry.isValid) {
                return null;
            }

            // 3. Calculate flow properties
            const flowProperties = calculateFlowProperties(inputs, pipeGeometry);
            if (!flowProperties.isValid) {
                return null;
            }

            // 4. Calculate pressure drop using physics library
            const pressureDropResults = calculatePressureDrop(inputs, pipeGeometry, flowProperties);

            // 5. Apply API criteria checks
            const apiChecks = calculateAPICriteriaChecks(inputs, flowProperties, pressureDropResults);

            // 6. Combine all results
            return {
                ...pipeGeometry,
                ...flowProperties,
                ...pressureDropResults,
                ...apiChecks,
                validation: {
                    isValid: true,
                    warnings: apiChecks.warnings,
                    errors: []
                }
            };
        } catch (error) {
            console.error("Hydraulic calculation error:", error);
            return null;
        }
    }, [inputs]);

    // Extract specific values for component use
    const insideDiameterMM = useMemo(() => {
        return PIPE_SCHEDULE_DATA[inputs.nominalDiameter]?.[inputs.schedule] || 0;
    }, [inputs.nominalDiameter, inputs.schedule]);

    const insideDiameterDisplay = useMemo(() => {
        if (inputs.unitSystem === 'imperial') {
            return (insideDiameterMM / 25.4).toFixed(3);
        }
        return insideDiameterMM.toFixed(2);
    }, [insideDiameterMM, inputs.unitSystem]);

    const availableSchedules = useMemo(() => {
        const available = Object.keys(PIPE_SCHEDULE_DATA[inputs.nominalDiameter] || {});
        const scheduleOrder = ["5s", "10s", "10", "20", "30", "40s", "STD", "40", "60", "80s", "XS", "80", "100", "120", "140", "160", "XXS"];
        return scheduleOrder.filter(sch => available.includes(sch));
    }, [inputs.nominalDiameter]);

    // Mixed-phase specific calculations (if needed for specialized UI not covered by generic results)
    const mixedPhaseCalc = useMemo(() => {
        if (inputs.lineType !== "mixed") return null;
        return results ? {
            rhoMixture: results.mixtureDensity_kgm3,
            // Map other specific mixed properties if added to CalculationResults
        } : null;
    }, [inputs.lineType, results]);

    return {
        results,
        validation: results?.validation || { isValid: false, warnings: [], errors: ["Invalid inputs"] },
        insideDiameterMM,
        insideDiameterDisplay,
        availableSchedules,
        mixedPhaseCalc
    };
};

// Helper functions
const validateInputs = (inputs: HydraulicInputs): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (inputs.pipeLength <= 0) errors.push("Pipe length must be positive");
    if (inputs.flowRate <= 0) errors.push("Flow rate must be positive");
    if (inputs.fluidTemperature < -273.15) errors.push("Temperature below absolute zero");

    // Type-specific validation
    if (inputs.lineType === "gas") {
        if (inputs.inletPressure < 0) warnings.push("Negative inlet pressure detected");
        if (inputs.compressibilityZ <= 0) errors.push("Compressibility factor must be positive");
    }

    if (inputs.lineType === "liquid") {
        if (inputs.density <= 0) errors.push("Density must be positive");
        if (inputs.viscosity <= 0) warnings.push("Very low viscosity detected");
    }

    if (inputs.lineType === "mixed") {
        if (inputs.mixedGasFlowRate <= 0 && inputs.mixedLiquidFlowRate <= 0) {
            errors.push("At least one phase must have positive flow rate");
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};
