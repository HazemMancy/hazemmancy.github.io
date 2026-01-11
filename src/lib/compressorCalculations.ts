import { CompressorType } from "./compressorData";

export interface CompressorInputs {
    gasType: string;
    molecularWeight: number;
    specificHeatRatio: number;
    compressibilityFactor: number;
    criticalTemperature: number; // Added
    criticalPressure: number;    // Added
    inletPressure: number;
    inletTemperature: number;
    dischargePressure: number;
    flowRate: number;
    flowUnit: string;
    standardCondition: string;
    pressureUnit: string;
    tempUnit: string;
    compressorType: string;
    isentropicEfficiency: number;
    polytropicEfficiency: number;
    mechanicalEfficiency: number;
    motorEfficiency: number;
    numberOfStages: number;
    intercoolerApproach: number;
}

export interface CalculationResults {
    compressionRatio: number;
    ratioPerStage: number;
    isentropicHead: number;
    polytropicHead: number;
    dischargeTemp: number;
    dischargeTempPerStage: number[];
    isentropicPower: number;
    polytropicPower: number;
    shaftPower: number;
    motorPower: number;
    actualFlow: number;
    massFlow: number;
    specificPower: number;
    adiabaticEfficiency: number;
    polytropicExponent: number;
    schultzFactor: number;
    compressibilityX: number;
    compressibilityY: number;
    inletDensity: number;
    dischargeDensity: number;
    isentropicExponent: number;
    volumetricEfficiency: number;
    pistonDisplacement: number;
    rodLoad: number;
    surgeFlow: number;
    stonewallFlow: number;
    designHead: number;
    designPower: number;
    warnings: string[];
}

// Unit Conversions
export const convertPressure = (value: number, from: string, to: string): number => {
    const barAbsFrom = () => {
        switch (from) {
            case 'bara': return value;
            case 'barg': return value + 1.01325;
            case 'psia': return value * 0.0689476;
            case 'psig': return (value + 14.696) * 0.0689476;
            case 'kPa': return value * 0.01;
            case 'MPa': return value * 10;
            case 'atm': return value * 1.01325;
            default: return value;
        }
    };
    const barValue = barAbsFrom();
    switch (to) {
        case 'bara': return barValue;
        case 'barg': return barValue - 1.01325;
        case 'psia': return barValue / 0.0689476;
        case 'psig': return barValue / 0.0689476 - 14.696;
        case 'kPa': return barValue / 0.01;
        case 'MPa': return barValue / 10;
        case 'atm': return barValue / 1.01325;
        default: return barValue;
    }
};

export const convertTemp = (value: number, from: string, to: string): number => {
    let kelvin: number;
    if (from === 'C') kelvin = value + 273.15;
    else if (from === 'F') kelvin = (value - 32) * 5 / 9 + 273.15;
    else kelvin = value;

    if (to === 'C') return kelvin - 273.15;
    if (to === 'F') return (kelvin - 273.15) * 9 / 5 + 32;
    return kelvin;
};

export const getStandardConditions = (standardCondition: string) => {
    switch (standardCondition) {
        case 'ISO': return { Tstd: 273.15, Pstd: 101325 };
        case 'SCFM': return { Tstd: (60 - 32) * 5 / 9 + 273.15, Pstd: 101325 };
        case 'NTP': default: return { Tstd: 273.15 + 15, Pstd: 101325 };
    }
};

export const convertFlow = (
    value: number, from: string, mw: number, T: number, P: number, standardCondition: string
): number => {
    const { Tstd, Pstd } = getStandardConditions(standardCondition);
    switch (from) {
        case 'nm3h': return (value * Pstd * mw) / (Tstd * 8314.46 * 3600);
        case 'sm3h': return (value * Pstd * mw) / (Tstd * 8314.46 * 3600);
        case 'am3h': return (value * P * 1e5 * mw) / ((T + 273.15) * 8314.46 * 3600);
        case 'scfm': return (value * 0.0283168 * 60 * Pstd * mw) / (Tstd * 8314.46 * 3600);
        case 'acfm': return (value * 0.0283168 * 60 * P * 1e5 * mw) / ((T + 273.15) * 8314.46 * 3600);
        case 'kgh': return value / 3600;
        case 'kgs': return value;
        case 'lbh': return value * 0.453592 / 3600;
        default: return value;
    }
};

// Main Calculation
export const calculateCompressorPerformance = (
    inputs: CompressorInputs,
    compressor: CompressorType
): CalculationResults => {
    const warnings: string[] = [];
    const P1 = convertPressure(inputs.inletPressure, inputs.pressureUnit, 'bara');
    const P2 = convertPressure(inputs.dischargePressure, inputs.pressureUnit, 'bara');
    const T1 = convertTemp(inputs.inletTemperature, inputs.tempUnit, 'K');
    const massFlow = convertFlow(
        inputs.flowRate, inputs.flowUnit, inputs.molecularWeight,
        inputs.inletTemperature, P1, inputs.standardCondition
    );

    const k = inputs.specificHeatRatio;
    const Z1_input = inputs.compressibilityFactor;
    const MW = inputs.molecularWeight;
    const Rgas = 8314.46 / MW;
    const etaIsen = inputs.isentropicEfficiency / 100;
    const etaPoly = inputs.polytropicEfficiency / 100;
    const etaMech = inputs.mechanicalEfficiency / 100;
    const etaMotor = inputs.motorEfficiency / 100;
    const numStages = inputs.numberOfStages;

    // Compression Ratio
    const compressionRatio = P2 / P1;
    const ratioPerStage = Math.pow(compressionRatio, 1 / numStages);

    // Check Limits
    if (ratioPerStage > compressor.maxRatio) {
        warnings.push(`Compression ratio per stage (${ratioPerStage.toFixed(2)}) exceeds ${compressor.standard} limit for ${compressor.name} (${compressor.maxRatio})`);
    }

    // Real Gas Calculation (Lee-Kesler / Schultz)
    // Use Critical Props if available (> 1K, > 1bar to avoid zeros)
    const useRealGas = inputs.criticalTemperature > 1 && inputs.criticalPressure > 1;
    const Tc = inputs.criticalTemperature;
    const Pc = inputs.criticalPressure;
    const P1_Pa = P1 * 1e5;

    let Z1_used = Z1_input;
    let Z2 = Z1_input; // Initial guess
    let X_bounded = 0; // Ideal gas default
    let Y_bounded = 1; // Ideal gas default
    let schultzF = 1.0;
    let rho1 = P1_Pa / (Z1_input * Rgas * T1);
    let rho2 = 0;

    if (useRealGas) {
        // Reduced properties
        const Tr1 = T1 / Tc;
        const Pr1 = P1 / Pc;

        // Lee-Kesler Z1
        const B0_1 = 0.083 - 0.422 / Math.pow(Tr1, 1.6);
        const Z1_calc = 1 + B0_1 * Pr1 / Tr1;
        Z1_used = Z1_input < 0.99 && Math.abs(Z1_input - 1) > 0.01 ? Z1_input : Math.max(0.5, Math.min(1.1, Z1_calc));

        rho1 = P1_Pa / (Z1_used * Rgas * T1);
        const v1 = 1 / rho1;

        // Derivatives for Schultz X, Y
        const dBdT = 0.422 * 1.6 / (Tc * Math.pow(Tr1, 2.6));
        const dZdT = Pr1 * (dBdT / Tr1 - B0_1 / (Tc * Tr1 * Tr1));
        const X = (T1 / Z1_used) * dZdT;

        const dZdP = B0_1 / (Pc * Tr1);
        const Y = 1 - (P1 / Z1_used) * dZdP;

        X_bounded = Math.max(-0.5, Math.min(0.5, X));
        Y_bounded = Math.max(0.8, Math.min(1.2, Y));

        // Discharge Estimate (Iterative or Single Step)
        // Single step estimate for Z2 based on isentropic T2 guess
        // T2_isen = T1 * (P2/P1)^((k-1)/k)
        // Actually we calculate T2 later, but we need Z2 for Head.
        // Use isentropic T2 approximation for Z2 calculation.
        const T2_approx = T1 * Math.pow(compressionRatio, (k - 1) / k);
        const Tr2 = T2_approx / Tc;
        const Pr2 = P2 / Pc;
        const B0_2 = 0.083 - 0.422 / Math.pow(Tr2, 1.6);
        const Z2_calc = 1 + B0_2 * Pr2 / Tr2;
        Z2 = Math.max(0.5, Math.min(1.1, Z2_calc));

        const P2_Pa = P2 * 1e5;
        rho2 = P2_Pa / (Z2 * Rgas * T2_approx);
        const v2 = 1 / rho2;

        // Schultz F
        const Z1v1 = Z1_used * v1;
        const Z2v2 = Z2 * v2;

        if (Math.abs(Z2v2 - Z1v1) < 0.001 * Z1v1) {
            schultzF = 1.0;
        } else {
            const lnPratio = Math.log(P2 / P1);
            const lnZvRatio = Math.log(Z2v2 / Z1v1);
            if (Math.abs(lnZvRatio) < 1e-10) schultzF = 1.0;
            else schultzF = lnPratio * (Z2v2 - Z1v1) / (Z2v2 * lnZvRatio);
        }
        schultzF = Math.max(0.85, Math.min(1.15, schultzF));
    } else {
        // Ideal / Constant Z
        rho2 = (P2 * 1e5) / (Z1_used * Rgas * (T1 * Math.pow(compressionRatio, (k - 1) / k))); // Approx
    }

    // Polytropic Exponent n
    const nDenominator = 1 - ((k - 1) / k) * etaPoly * ((1 + X_bounded) / Y_bounded);
    const nPoly = Math.max(1.01, 1 / nDenominator);

    // Isentropic exponent ns
    const ns = k * Y_bounded / (1 + X_bounded);

    // Discharge Temperature
    const isReciprocating = ['reciprocating', 'diaphragm'].includes(inputs.compressorType);
    let dischargeTemp = 0;
    let T2 = 0;
    const dischargeTempPerStage: number[] = [];

    if (isReciprocating) {
        // T2 = T1 * (P2/P1)^((k-1)/(k*etaIsen))
        const tempExponent = (k - 1) / (k * etaIsen);
        let T_current = T1;
        for (let i = 0; i < numStages; i++) {
            const T_out = T_current * Math.pow(ratioPerStage, tempExponent);
            dischargeTempPerStage.push(T_out - 273.15);
            if (i < numStages - 1) T_current = T1 + inputs.intercoolerApproach;
            else T2 = T_out;
        }
    } else {
        // T2 = T1 * (P2/P1)^m
        const m = ((nPoly - 1) / nPoly) * ((1 + X_bounded) / Y_bounded);
        let T_current = T1;
        for (let i = 0; i < numStages; i++) {
            const T_out = T_current * Math.pow(ratioPerStage, m);
            dischargeTempPerStage.push(T_out - 273.15);
            if (i < numStages - 1) T_current = T1 + inputs.intercoolerApproach;
            else T2 = T_out;
        }
    }
    dischargeTemp = T2 - 273.15;

    // Head Calculations (Total for whole machine - Simplified for multistage by using total Ratio)
    // For multistage with intercooling, head is sum of stages.
    // Approximation: Total Head = Stage Head * N
    // Stage Head based on RatioPerStage.

    // Single Stage Head Calculation
    const isentropicHeadStage = (Z1_used * Rgas * T1 * k / (k - 1)) * (Math.pow(ratioPerStage, (k - 1) / k) - 1);
    const polytropicHeadStage = schultzF * (Z1_used * Rgas * T1 * nPoly / (nPoly - 1)) * (Math.pow(ratioPerStage, (nPoly - 1) / nPoly) - 1);

    const isentropicHead = isentropicHeadStage * numStages;
    const polytropicHead = polytropicHeadStage * numStages;

    // Power
    let isentropicPower = 0;
    let polytropicPower = 0;
    let shaftPower = 0;
    let volumetricEfficiency = 1.0;
    let pistonDisplacement = 0;
    let rodLoad = 0;

    if (isReciprocating) {
        const clearance = compressor.clearanceVol || 0.08;
        const reExpansionLoss = clearance * (Math.pow(ratioPerStage, 1 / k) - 1); // Per stage
        const leakageLoss = 0.02;
        const heatingLoss = 0.02;
        volumetricEfficiency = Math.max(0.4, 1 - reExpansionLoss - leakageLoss - heatingLoss);

        const actualVolumetricFlow = (massFlow / rho1); // m³/s
        pistonDisplacement = actualVolumetricFlow / volumetricEfficiency * 3600;

        isentropicPower = (massFlow * isentropicHead) / 1000;
        polytropicPower = isentropicPower / etaIsen;
        shaftPower = polytropicPower / etaMech;

        // Rod Load (Estimate on first stage ΔP)
        // ΔP_stage = P1 * (Ratio - 1)
        const deltaP_stage = (P1 * (ratioPerStage - 1)) * 1e5;
        rodLoad = deltaP_stage * 0.1 / 1000; // kN (0.1m2 Area)
    } else {
        isentropicPower = (massFlow * isentropicHead) / 1000;
        polytropicPower = (massFlow * polytropicHead) / 1000;
        shaftPower = polytropicPower / etaMech;
    }

    const motorPower = shaftPower / etaMotor;
    const actualFlow = (massFlow / rho1) * 3600;

    // Specific Power
    const { Tstd, Pstd } = getStandardConditions(inputs.standardCondition);
    const nm3hFlow = (massFlow * 3600 * 8314.46 * Tstd) / (MW * Pstd);
    const specificPower = nm3hFlow > 0 ? (motorPower / nm3hFlow) * 100 : 0;

    // Curve Params
    const surgeFlow = !isReciprocating ? actualFlow * (inputs.compressorType === 'axial' ? 0.75 : 0.55) : 0;
    const stonewallFlow = !isReciprocating ? actualFlow * 1.15 : 0;

    // Warnings
    if (dischargeTemp > 200) warnings.push(`Discharge temp (${dischargeTemp.toFixed(0)}°C) exceeds 200°C limit`);
    if (P1 < 0.5) warnings.push('Very low suction pressure');
    if (useRealGas && (schultzF < 0.9 || schultzF > 1.1)) warnings.push(`Schultz factor (${schultzF.toFixed(3)}) indicates deviation from ideal gas`);

    return {
        compressionRatio, ratioPerStage,
        isentropicHead: isentropicHead / 1000, // kJ/kg
        polytropicHead: polytropicHead / 1000, // kJ/kg
        dischargeTemp, dischargeTempPerStage,
        isentropicPower, polytropicPower, shaftPower, motorPower,
        actualFlow, massFlow: massFlow * 3600, specificPower,
        adiabaticEfficiency: etaIsen * 100,
        polytropicExponent: nPoly, schultzFactor: schultzF,
        compressibilityX: X_bounded, compressibilityY: Y_bounded,
        inletDensity: rho1, dischargeDensity: rho2, isentropicExponent: ns,
        volumetricEfficiency, pistonDisplacement, rodLoad,
        surgeFlow, stonewallFlow,
        designHead: polytropicHead / 1000, designPower: motorPower,
        warnings
    };
};
