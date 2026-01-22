import {
    HydraulicInputs,
    PipeGeometry,
    FlowProperties,
    PressureDropResults,
    APIChecks,
    GasServiceCriteria,
    LiquidServiceCriteria,
    MixedPhaseServiceCriteria
} from "../types/hydraulicTypes";
import { calculateHydraulics } from "@/lib/physics";
import {
    GAS_SERVICE_CRITERIA,
    LIQUID_SERVICE_CRITERIA,
    MIXED_PHASE_SERVICE_CRITERIA,
    PIPE_SCHEDULE_DATA,
    PIPE_ROUGHNESS
} from "../data/constants";

// Unit conversion factors
const UNIT_CONVERSIONS = {
    length: { m: 1, km: 1000, ft: 0.3048, mi: 1609.34 },
    pressure: { Pa: 1, kPa: 1000, bar: 100000, psi: 6894.76 },
    flowRate: {
        gas: {
            "MMSCFD": 0.327741,
            "Nm³/h": 1 / 3600,
            "Sm³/h": 1 / 3600,
            "m³/h": 1 / 3600,
            "SCFM": 0.000471947
        },
        liquid: {
            "m³/h": 1 / 3600,
            "m³/s": 1,
            "L/min": 1 / 60000,
            "L/s": 0.001,
            "gpm": 0.0000630902,
            "bbl/d": 0.00000184013
        }
    },
    density: { "kg/m³": 1, "lb/ft³": 16.0185, "g/cm³": 1000 },
    viscosity: { "cP": 0.001, "Pa·s": 1, "mPa·s": 0.001 }
};

export const calculatePipeGeometry = (inputs: HydraulicInputs): PipeGeometry => {
    // Get inside diameter from schedule data
    const insideDiameterMM = PIPE_SCHEDULE_DATA[inputs.nominalDiameter]?.[inputs.schedule] || 0;
    const D_m = insideDiameterMM * 0.001;

    // Calculate length in meters
    const L_m = inputs.pipeLength * (UNIT_CONVERSIONS.length[inputs.lengthUnit as keyof typeof UNIT_CONVERSIONS.length] || 1);

    // Calculate roughness in meters
    let epsilon_m = 0;
    if (inputs.pipeMaterial === "Custom") {
        epsilon_m = inputs.customRoughness * 0.001; // mm to m
    } else {
        // Get from roughness database
        // PIPE_ROUGHNESS is imported from constants
        epsilon_m = (PIPE_ROUGHNESS[inputs.pipeMaterial] || 0.0457) * 0.001;
    }

    return {
        isValid: D_m > 0 && L_m > 0,
        insideDiameterMM,
        D_m,
        L_m,
        epsilon_m,
        crossSectionalArea: Math.PI * Math.pow(D_m, 2) / 4
    };
};

export const calculateFlowProperties = (
    inputs: HydraulicInputs,
    pipeGeometry: PipeGeometry
): FlowProperties => {
    const { D_m, crossSectionalArea } = pipeGeometry;

    // Convert flow rate to m³/s
    let Q_m3s = 0;
    // TODO: Fix type safety for dynamic key access
    if (inputs.lineType === "gas") {
        const conversion = UNIT_CONVERSIONS.flowRate.gas[inputs.flowRateUnit as keyof typeof UNIT_CONVERSIONS.flowRate.gas] || 0;
        Q_m3s = inputs.flowRate * conversion;
    } else {
        const conversion = UNIT_CONVERSIONS.flowRate.liquid[inputs.flowRateUnit as keyof typeof UNIT_CONVERSIONS.flowRate.liquid] || 0;
        Q_m3s = inputs.flowRate * conversion;
    }

    // Calculate velocity
    const velocity = crossSectionalArea > 0 ? Q_m3s / crossSectionalArea : 0;

    // Calculate density based on line type
    let density = 0;
    if (inputs.lineType === "gas") {
        // Real gas calculation: ρ = (P × MW) / (Z × R × T)
        const P_Pa = (inputs.inletPressure + 1.01325) * 100000; // barg to bara to Pa
        const R_kmol = 8314; // J/(kmol·K)
        const T_K = inputs.fluidTemperature + 273.15;
        if (R_kmol * T_K * inputs.compressibilityZ > 0) {
            density = (P_Pa * inputs.gasMolecularWeight) / (inputs.compressibilityZ * R_kmol * T_K);
        }
    } else if (inputs.lineType === "liquid") {
        density = inputs.density * (UNIT_CONVERSIONS.density[inputs.densityUnit as keyof typeof UNIT_CONVERSIONS.density] || 1);
    }
    // Mixed-phase density calculated separately

    // Calculate viscosity
    const viscosity = inputs.viscosity * (UNIT_CONVERSIONS.viscosity[inputs.viscosityUnit as keyof typeof UNIT_CONVERSIONS.viscosity] || 0.001);

    // Calculate Reynolds number
    const reynolds = (density * velocity * D_m) / Math.max(viscosity, 1e-10);

    // Determine flow regime
    const flowRegime = reynolds < 2000 ? "Laminar" :
        reynolds < 4000 ? "Transitional" : "Turbulent";

    return {
        isValid: Q_m3s > 0 && density > 0,
        Q_m3s,
        velocity,
        density,
        viscosity,
        reynolds,
        flowRegime,
        crossSectionalArea
    };
};

export const calculatePressureDrop = (
    inputs: HydraulicInputs,
    pipeGeometry: PipeGeometry,
    flowProperties: FlowProperties
): PressureDropResults => {
    const { L_m, D_m, epsilon_m } = pipeGeometry;
    const { velocity, density, viscosity, reynolds } = flowProperties;

    try {
        // Use physics library as single source of truth
        const physicsInputs = {
            length_m: L_m,
            elevation_m: 0,
            innerDiameter_m: D_m,
            roughness_m: epsilon_m,
            massFlow_kg_s: flowProperties.Q_m3s * flowProperties.density,
            pressureIn_Pa: inputs.lineType === 'mixed'
                ? (inputs.mixedOpPressure + 1.01325) * 100000
                : (inputs.inletPressure + 1.01325) * 100000,
            temperature_K: inputs.lineType === 'mixed'
                ? inputs.mixedOpTemp + 273.15
                : inputs.fluidTemperature + 273.15,
            gasMw_kgkmol: inputs.lineType === "gas" ? inputs.gasMolecularWeight : (inputs.lineType === "mixed" ? inputs.mixedGasMW : undefined),
            gasZ: inputs.lineType === "gas" ? inputs.compressibilityZ : undefined,
            gasViscosity_Pas: inputs.lineType === "gas" ? flowProperties.viscosity : undefined,
            gasK: 1.3, // Default Cp/Cv ratio
            density_kgm3: inputs.lineType === "liquid" ? flowProperties.density : undefined
        };

        if (inputs.lineType === "mixed") {
            // Mixed Phase Logic for Physics Engine
            // We need the mixed inputs directly
            // Re-calculate mass flows based on inputs, not generic Q_m3s
            // Actually, let's use the explicit mixed inputs
            const Q_gas_m3s = inputs.mixedGasFlowRate * (UNIT_CONVERSIONS.flowRate.gas[inputs.mixedGasFlowRateUnit as keyof typeof UNIT_CONVERSIONS.flowRate.gas] || 0);
            const Q_liq_m3s = inputs.mixedLiquidFlowRate * (UNIT_CONVERSIONS.flowRate.liquid[inputs.mixedLiquidFlowRateUnit as keyof typeof UNIT_CONVERSIONS.flowRate.liquid] || 0);

            const rhoGas = inputs.mixedGasDensity;
            const rhoLiq = inputs.mixedLiquidDensity;

            physicsInputs.massFlow_kg_s = (Q_gas_m3s * rhoGas) + (Q_liq_m3s * rhoLiq);

            // Add specific Mixed props that calculateHydraulics expects for mixed-beggs-brill
            // Type assertion to bypass strict inputs check since we know mixed-beggs-brill needs more
            const mixedInputs = {
                ...physicsInputs,
                gasMassFlow_kg_s: Q_gas_m3s * rhoGas,
                liquidMassFlow_kg_s: Q_liq_m3s * rhoLiq,
                gasDensity_kgm3: rhoGas,
                liquidDensity_kgm3: rhoLiq,
                gasViscosity_Pas: inputs.mixedGasViscosity * 0.001,
                liquidViscosity_Pas: inputs.mixedLiquidViscosity * 0.001,
                surfaceTension_N_m: 0.072 // Default
            };

            const hydraulicResult = calculateHydraulics("mixed-beggs-brill", mixedInputs);
            const mixDensity = hydraulicResult?.mixtureDensity_kgm3 || density;
            const pressureDrop_Pa = hydraulicResult?.pressureDrop_Pa || 0;
            const headLoss = (mixDensity > 0) ? pressureDrop_Pa / (mixDensity * 9.80665) : 0;

            return {
                pressureDrop_Pa,
                frictionFactor: hydraulicResult?.frictionFactor || 0,
                headLoss,
                machNumber: hydraulicResult?.machNumber || 0,
                velocity_m_s: hydraulicResult?.velocity_m_s || 0,
                mixtureDensity_kgm3: mixDensity
            };
        }

        const calcType = inputs.lineType === "gas" ? "gas" : "liquid";

        const hydraulicResult = calculateHydraulics(calcType, physicsInputs);

        // Calculate headLoss manually
        const mixDensity = hydraulicResult?.mixtureDensity_kgm3 || density;
        const pressureDrop_Pa = hydraulicResult?.pressureDrop_Pa || 0;
        const headLoss = (mixDensity > 0) ? pressureDrop_Pa / (mixDensity * 9.80665) : 0;

        return {
            pressureDrop_Pa,
            frictionFactor: hydraulicResult?.frictionFactor || 0,
            headLoss,
            machNumber: hydraulicResult?.machNumber || 0,
            velocity_m_s: velocity,
            mixtureDensity_kgm3: mixDensity
        };
    } catch (error) {
        console.error("Physics library error:", error);
        // Fallback to Darcy-Weisbach
        return calculateDarcyWeisbach(pipeGeometry, flowProperties);
    }
};

const calculateDarcyWeisbach = (
    pipeGeometry: PipeGeometry,
    flowProperties: FlowProperties
): PressureDropResults => {
    const { L_m, D_m, epsilon_m } = pipeGeometry;
    const { velocity, density, viscosity, reynolds } = flowProperties;

    // Calculate friction factor (Colebrook-White)
    let frictionFactor = 0;
    if (reynolds < 2000) {
        frictionFactor = 64 / reynolds; // Laminar
    } else {
        // Colebrook-White approximation (Swamee-Jain)
        const relativeRoughness = epsilon_m / D_m;
        frictionFactor = 0.25 / Math.pow(
            Math.log10(relativeRoughness / 3.7 + 5.74 / Math.pow(reynolds, 0.9)),
            2
        );
    }

    // Darcy-Weisbach equation
    const pressureDrop_Pa = frictionFactor * (L_m / D_m) * (density * Math.pow(velocity, 2)) / 2;
    const headLoss = pressureDrop_Pa / (density * 9.81);

    return {
        pressureDrop_Pa,
        frictionFactor,
        headLoss,
        machNumber: 0,
        velocity_m_s: velocity,
        mixtureDensity_kgm3: density
    };
};

export const calculateAPICriteriaChecks = (
    inputs: HydraulicInputs,
    flowProperties: FlowProperties,
    pressureDrop: PressureDropResults
): APIChecks => {
    const warnings: string[] = [];
    const { velocity, density } = flowProperties;
    // Use mixture density if available (e.g. mixed phase)
    const effectiveDensity = pressureDrop.mixtureDensity_kgm3 || density;
    const effectiveVelocity = pressureDrop.velocity_m_s || velocity;

    const rhoVSquared = effectiveDensity * Math.pow(effectiveVelocity, 2);

    // API 14E erosional velocity
    const erosionalVelocity = calculateErosionalVelocity(effectiveDensity);

    // Limit values to return
    let limitVelocity: number | null = null;
    let limitRhoV2: number | null = null;
    let limitMach: number | null = null;

    // Check criteria based on line type
    if (inputs.lineType === "gas" && inputs.currentGasCriteria) {
        const criteria = inputs.currentGasCriteria;
        limitVelocity = criteria.velocityMs;
        limitRhoV2 = criteria.rhoV2Limit;
        limitMach = criteria.machLimit;

        if (criteria.velocityMs !== null && effectiveVelocity > criteria.velocityMs) {
            warnings.push(`Velocity (${effectiveVelocity.toFixed(1)} m/s) exceeds limit (${criteria.velocityMs} m/s)`);
        }

        if (criteria.rhoV2Limit !== null && rhoVSquared > criteria.rhoV2Limit) {
            warnings.push(`Momentum (${rhoVSquared.toFixed(0)} kg/m·s²) exceeds limit (${criteria.rhoV2Limit})`);
        }

        // Calculate Mach number for gas
        const machNumber = calculateMachNumber(effectiveVelocity, inputs.fluidTemperature + 273.15, inputs.gasMolecularWeight);
        if (criteria.machLimit !== null && machNumber > criteria.machLimit) {
            warnings.push(`Mach number (${machNumber.toFixed(3)}) exceeds limit (${criteria.machLimit})`);
        }
    } else if (inputs.lineType === "liquid" && inputs.currentLiquidCriteria) {
        // Liquid Checks
        const criteria = inputs.currentLiquidCriteria;
        // Logic for liquid velocity is complex (size dependent), omitting simple limit return for now
        // except general structure
    } else if (inputs.lineType === "mixed" && inputs.currentMixedPhaseCriteria) {
        const criteria = inputs.currentMixedPhaseCriteria;
        limitRhoV2 = criteria.rhoV2Limit;
        limitMach = criteria.machLimit;

        if (criteria.rhoV2Limit !== null && rhoVSquared > criteria.rhoV2Limit) {
            warnings.push(`Momentum (${rhoVSquared.toFixed(0)} kg/m·s²) exceeds limit (${criteria.rhoV2Limit})`);
        }

        // Mixed Phase Mach Check
        const machNumber = pressureDrop.machNumber;
        if (criteria.machLimit !== null && machNumber > criteria.machLimit) {
            warnings.push(`Mach number (${machNumber.toFixed(3)}) exceeds limit (${criteria.machLimit})`);
        }
    }

    return {
        warnings,
        erosionalVelocity,
        erosionalRatio: erosionalVelocity > 0 ? effectiveVelocity / erosionalVelocity : 0,
        rhoVSquared,
        isWithinLimits: warnings.length === 0,
        limitVelocity,
        limitRhoV2,
        limitMach
    };
};

// Helper functions
const calculateErosionalVelocity = (density_kgm3: number): number => {
    const rhoLbFt3 = density_kgm3 / 16.0185;
    if (rhoLbFt3 <= 0) return 0;
    const C = 100; // Conservative for continuous service
    const VeFtS = C / Math.sqrt(rhoLbFt3);
    return VeFtS * 0.3048; // ft/s to m/s
};

const calculateMachNumber = (velocity: number, temperature: number, molecularWeight: number): number => {
    const k = 1.3; // Default Cp/Cv for natural gas
    const R = 8314; // J/(kmol·K)
    if (molecularWeight <= 0) return 0;
    const speedOfSound = Math.sqrt((k * R * temperature) / molecularWeight);
    return velocity / speedOfSound;
};
