export type UnitSystem = 'metric' | 'imperial';

export interface GasServiceCriteria {
    service: string;
    pressureRange: string;
    pressureDropBarKm: number | null;
    velocityMs: number | null;
    rhoV2Limit: number | null;
    machLimit: number | null;
    cValue: number | null;
    note?: string;
}

export interface LiquidServiceCriteria {
    service: string;
    pressureDropBarKm: number | null;
    velocity: {
        size2: number | null;
        size3to6: number | null;
        size8to12: number | null;
        size14to18: number | null;
        size20plus: number | null;
    } | null;
}

export interface MixedPhaseServiceCriteria {
    service: string;
    rhoV2Limit: number | null;
    machLimit: number | null;
    cValue: number | null;
    note?: string;
}

export interface HydraulicInputs {
    lineType: 'gas' | 'liquid' | 'mixed';
    unitSystem: UnitSystem;

    // Pipe properties
    pipeLength: number;
    lengthUnit: string;
    nominalDiameter: string;
    schedule: string;
    pipeMaterial: string;
    customRoughness: number;
    roughnessUnit: string;

    // Flow properties
    flowRate: number;
    flowRateUnit: string;
    density: number;
    densityUnit: string;
    viscosity: number;
    viscosityUnit: string;
    selectedFluid: string;
    fluidTemperature: number;

    // Gas-specific
    gasServiceType: string;
    gasPressureRange: string;
    inletPressure: number;
    compressibilityZ: number;
    gasDensity60F: number;
    gasMolecularWeight: number;
    baseTemperature: number;
    basePressure: number;
    baseCompressibilityZ: number;

    // Liquid-specific
    liquidServiceType: string;

    // Mixed-phase specific
    mixedPhaseServiceType: string;
    mixedGasFlowRate: number;
    mixedGasFlowRateUnit: string;
    mixedLiquidFlowRate: number;
    mixedLiquidFlowRateUnit: string;
    mixedGasDensity: number;
    mixedLiquidDensity: number;
    mixedOpPressure: number;
    mixedOpTemp: number;
    mixedGasZ: number;
    mixedGasViscosity: number;
    mixedLiquidViscosity: number;
    pressureType: string;

    // Criteria
    currentGasCriteria: GasServiceCriteria | null;
    currentLiquidCriteria: LiquidServiceCriteria | null;
    currentMixedPhaseCriteria: MixedPhaseServiceCriteria | null;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface PipeGeometry {
    isValid: boolean;
    insideDiameterMM: number;
    D_m: number;
    L_m: number;
    epsilon_m: number;
    crossSectionalArea: number;
}

export interface FlowProperties {
    isValid: boolean;
    Q_m3s: number;
    velocity: number;
    density: number;
    viscosity: number;
    reynolds: number;
    flowRegime: string;
    crossSectionalArea: number;
}

export interface PressureDropResults {
    pressureDrop_Pa: number;
    frictionFactor: number;
    headLoss: number;
    machNumber: number;
    velocity_m_s: number;
    mixtureDensity_kgm3: number;
}

export interface APIChecks {
    warnings: string[];
    erosionalVelocity: number;
    erosionalRatio: number;
    rhoVSquared: number;
    isWithinLimits: boolean;
    limitVelocity?: number | null;
    limitRhoV2?: number | null;
    limitMach?: number | null;
}

export interface CalculationResults extends PipeGeometry, FlowProperties, PressureDropResults, APIChecks {
    validation: ValidationResult;
}

export interface MixedPhaseCalculation {
    rhoG_op?: number;
    rhoL?: number;
    rhoMixture?: number;
    Qg_act_m3s?: number;
    Ql_m3s?: number;
    totalVolumetricFlow?: number;
    totalMassFlow?: number;
    lambdaG?: number;
    lambdaL?: number;
    xG?: number;
    gasFlowIsStandard?: boolean;
    correctionFactor?: number;
}
