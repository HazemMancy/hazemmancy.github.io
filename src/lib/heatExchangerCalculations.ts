/**
 * Heat Exchanger Calculation Library
 * Contains physics models for Shell & Tube Heat Exchangers
 * 
 * Methods:
 * - Bell-Delaware (Shell-side HTC & ΔP)
 * - Kern (Simplified shell-side)
 * - Dittus-Boelter, Gnielinski, Sieder-Tate (Tube-side HTC)
 * - TEMA/HTRI Vibration Analysis
 * 
 * Standards Compliance:
 * - API 660 (Shell & Tube Heat Exchangers)
 * - API 661 (Air-Cooled Heat Exchangers)
 * - TEMA Standards (10th Edition)
 * - ASME Section VIII Division 1 (Pressure Vessel Design)
 * - GPSA Engineering Data Book (Fluid Properties)
 * 
 * SCREENING-LEVEL CALCULATION LIBRARY
 * -----------------------------------
 * This library provides screening-level engineering calculations only.
 * It is NOT intended for final design, fabrication, or safety-critical applications.
 * Results should be verified against specialized software (HTRI, ASPEN, etc.)
 * 
 * UNIT REQUIREMENTS (STRICT SI):
 * - Lengths: meters (m)
 * - Pressure: Pascals (Pa)
 * - Temperature: Kelvin (K)
 * - Viscosity: Pascal-seconds (Pa·s) [NOT cP]
 * - Flow Rate: kg/s or m³/s as specified
 * - Density: kg/m³
 * - Specific Heat: J/kg·K [NOT kJ]
 * - Thermal Conductivity: W/m·K
 */

export type FlowArrangement = "counter" | "parallel" | "shell-tube-1-2" | "shell-tube-1-4" | "crossflow-unmixed" | "crossflow-mixed";
export type TemperatureUnit = "C" | "F" | "K";

export interface VibrationResults {
    naturalFrequency: number;
    vortexSheddingFrequency: number;
    acousticResonanceFrequency: number;
    criticalVelocity: number;
    reducedVelocity: number;
    frequencyRatio: number;
    isVibrationRisk: boolean;
    isAcousticRisk: boolean;
    vibrationMessage: string;
    damageNumber: number;
}

// Temperature conversion functions
export const toKelvin = (temp: number, unit: TemperatureUnit): number => {
    switch (unit) {
        case "C": return temp + 273.15;
        case "F": return (temp - 32) * 5 / 9 + 273.15;
        case "K": return temp;
    }
};

export const fromKelvin = (tempK: number, unit: TemperatureUnit): number => {
    switch (unit) {
        case "C": return tempK - 273.15;
        case "F": return (tempK - 273.15) * 9 / 5 + 32;
        case "K": return tempK;
    }
};

/**
 * Calculate Tube-Side Heat Transfer Coefficient (hi)
 * 
 * References:
 * - Dittus-Boelter (1930): McAdams, Heat Transmission, 3rd Ed.
 * - Gnielinski (1976): Int. Chem. Eng. 16, 359-368
 * - Sieder-Tate (1936): Ind. Eng. Chem. 28, 1429
 * - TEMA Standards Section RGP-4.4
 * 
 * Validity Ranges:
 * - Laminar (Re < 2300): L/D > 10, fully developed flow
 * - Transition (2300 < Re < 10000): Gnielinski correlation
 * - Turbulent (Re > 10000): 0.6 < Pr < 160, L/D > 10
 * 
 * @param Re - Reynolds number (ρVD/μ)
 * @param Pr - Prandtl number (Cpμ/k)
 * @param k - Thermal conductivity (W/m·K)
 * @param Di - Inner diameter (m)
 * @param isHeating - True if fluid is being heated (affects Pr exponent)
 * @param viscosityRatio - Optional: μ_bulk/μ_wall for Sieder-Tate correction (use when ΔT > 10°C)
 * @returns Object containing heat transfer coefficient (W/m²K) and Nusselt number
 */
export interface CalculationResult {
    warnings: string[];
    errors: string[];
}

export interface HtcResult extends CalculationResult {
    h: number;
    Nu: number;
}

/**
 * Calculate Tube-Side Heat Transfer Coefficient (hi)
 * ...
 */
export const calculateTubeSideHTC = (
    Re: number,
    Pr: number,
    k: number,
    Di: number,
    isHeating: boolean = true,
    viscosityRatio?: number
): HtcResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (Re <= 0 || Pr <= 0 || k <= 0 || Di <= 0) {
        return { h: 0, Nu: 0, warnings, errors: ["Invalid input parameters for tube-side HTC"] };
    }

    let Nu: number;

    if (Re < 2300) {
        Nu = 3.66;
    } else if (Re < 10000) {
        const f = Math.pow(1.82 * Math.log10(Re) - 1.64, -2);
        Nu = (f / 8) * (Re - 1000) * Pr / (1 + 12.7 * Math.sqrt(f / 8) * (Math.pow(Pr, 2 / 3) - 1));
        Nu = Math.max(Nu, 3.66);
    } else {
        const n = isHeating ? 0.4 : 0.3;
        Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, n);
    }

    if (viscosityRatio && viscosityRatio > 0 && Re >= 10000) {
        Nu = Nu * Math.pow(viscosityRatio, 0.14);
    }

    const h = Nu * k / Di;
    return { h, Nu, warnings, errors };
};

/**
 * Calculate Shell-Side Heat Transfer Coefficient (ho)
 * ...
 */
export const calculateShellSideHTC = (
    Re: number,
    Pr: number,
    k: number,
    De: number,
    Gs: number,
    Cp: number,
    tubePattern: string,
    Jc: number,
    Jl: number,
    Jb: number,
    Jr: number,
    Js: number
): HtcResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (Re <= 0 || Pr <= 0 || k <= 0 || De <= 0 || Gs <= 0) {
        return { h: 0, Nu: 0, warnings, errors: ["Invalid input parameters for shell-side HTC"] };
    }

    let jFactor: number;

    if (tubePattern === "triangular") {
        if (Re > 10000) {
            jFactor = 0.321 * Math.pow(Re, -0.388);
        } else if (Re > 1000) {
            jFactor = 0.593 * Math.pow(Re, -0.477);
        } else if (Re > 100) {
            jFactor = 1.52 * Math.pow(Re, -0.574);
        } else {
            jFactor = 1.04 * Math.pow(Re, -0.451);
        }
    } else {
        if (Re > 10000) {
            jFactor = 0.249 * Math.pow(Re, -0.382);
        } else if (Re > 1000) {
            jFactor = 0.391 * Math.pow(Re, -0.438);
        } else if (Re > 100) {
            jFactor = 1.187 * Math.pow(Re, -0.547);
        } else {
            jFactor = 0.994 * Math.pow(Re, -0.426);
        }
    }

    const h_ideal = jFactor * Cp * Gs * Math.pow(Pr, -2 / 3);
    const h = h_ideal * Jc * Jl * Jb * Jr * Js;
    const Nu = h * De / k;

    return { h, Nu, warnings, errors };
};

export interface VibrationsExtendedResult extends VibrationResults, CalculationResult { }

/**
 * Flow-Induced Vibration Analysis per TEMA and HTRI Standards
 */
export const calculateVibrationAnalysis = (
    shellVelocity: number,
    shellDensity: number,
    tubeOD: number,
    tubePitch: number,
    tubePattern: string,
    tubeElasticModulus: number,
    tubeDensity: number,
    tubeWallThickness: number,
    unsupportedLength: number,
    shellDiameter: number,
    tubeFluidDensity: number,
    speedOfSound: number
): VibrationsExtendedResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (shellVelocity <= 0 || tubeOD <= 0) {
        return {
            naturalFrequency: 0,
            vortexSheddingFrequency: 0,
            acousticResonanceFrequency: 0,
            criticalVelocity: 0,
            reducedVelocity: 0,
            frequencyRatio: 0,
            isVibrationRisk: false,
            isAcousticRisk: false,
            vibrationMessage: "Insufficient data",
            damageNumber: 0,
            warnings,
            errors: ["Invalid velocity or tube geometry for vibration analysis"]
        };
    }

    // [VALIDATION] Speed of Sound Clamping
    // Prevent non-physical zero speed of sound (division by zero risk)
    let safeSpeedOfSound = speedOfSound;
    if (speedOfSound < 50) {
        safeSpeedOfSound = 150; // Minimum credible speed (gas/mixed)
        warnings.push(`Input Speed of Sound (${speedOfSound.toFixed(1)} m/s) is suspiciously low. Clamped to 150 m/s for safety.`);
    }

    const Di = tubeOD - 2 * tubeWallThickness;
    const I = (Math.PI / 64) * (Math.pow(tubeOD, 4) - Math.pow(Di, 4));
    const A = (Math.PI / 4) * (Math.pow(tubeOD, 2) - Math.pow(Di, 2));

    const tubeLinearMass = tubeDensity * A;
    const fluidLinearMass = tubeFluidDensity * (Math.PI / 4) * Math.pow(Di, 2);
    const totalLinearMass = tubeLinearMass + fluidLinearMass;

    const pitchRatio = tubePitch / tubeOD;
    let Cm: number;
    if (tubePattern === "triangular") {
        Cm = 1.0 + 0.6 / Math.pow(pitchRatio - 1, 1.5);
    } else {
        Cm = 1.0 + 0.5 / Math.pow(pitchRatio - 1, 1.5);
    }
    Cm = Math.min(Cm, 3.0);

    const addedMass = Cm * shellDensity * (Math.PI / 4) * Math.pow(tubeOD, 2);
    const effectiveMass = totalLinearMass + addedMass;

    const Cn = 22.4;
    const fn = (Cn / (2 * Math.PI)) * Math.sqrt(
        (tubeElasticModulus * I) / (effectiveMass * Math.pow(unsupportedLength, 4))
    );

    const St = tubePattern === "triangular" ? 0.2 : 0.25;
    const fvs = St * shellVelocity / tubeOD;

    const effectiveWidth = shellDiameter;
    const fa = safeSpeedOfSound / (2 * effectiveWidth);

    const K = tubePattern === "triangular" ? 2.4 : 3.4;
    const logDecrement = 0.03;
    const massRatio = effectiveMass / (shellDensity * Math.pow(tubeOD, 2));
    const Vcrit = K * fn * tubeOD * Math.sqrt(massRatio * logDecrement);

    const Vr = shellVelocity / (fn * tubeOD);
    const freqRatio = fvs / fn;

    const damageNumber = (shellDensity * Math.pow(shellVelocity, 2) * tubeOD) /
        (effectiveMass * fn * logDecrement);

    const isVibrationRisk =
        (freqRatio > 0.7 && freqRatio < 1.3) ||
        shellVelocity > 0.8 * Vcrit ||
        damageNumber > 0.5;

    const isAcousticRisk =
        Math.abs(fvs - fa) / fa < 0.15 ||
        Math.abs(2 * fvs - fa) / fa < 0.15;

    let vibrationMessage = "✓ Design is within safe limits";
    if (isVibrationRisk) {
        if (freqRatio > 0.7 && freqRatio < 1.3) {
            vibrationMessage = "⚠ Vortex shedding near resonance! Increase baffle spacing or tube support.";
        } else if (shellVelocity > 0.8 * Vcrit) {
            vibrationMessage = "⚠ Velocity approaching fluid-elastic instability threshold!";
        } else if (damageNumber > 0.5) {
            vibrationMessage = "⚠ High damage potential - review tube support design.";
        }
    }

    return {
        naturalFrequency: fn,
        vortexSheddingFrequency: fvs,
        acousticResonanceFrequency: fa,
        criticalVelocity: Vcrit,
        reducedVelocity: Vr,
        frequencyRatio: freqRatio,
        isVibrationRisk,
        isAcousticRisk,
        vibrationMessage,
        damageNumber,
        warnings,
        errors
    };
};

/**
 * LMTD Correction Factor (F)
 * ...
 */
export const calculateCorrectionFactor = (
    R: number,
    P: number,
    arrangement: FlowArrangement
): { F: number; warning: boolean; message?: string } => {
    if (arrangement === "counter" || arrangement === "parallel") {
        return { F: 1.0, warning: false };
    }

    if (P <= 0 || P >= 1 || R <= 0) {
        return { F: 0.9, warning: true, message: "Invalid P or R values" };
    }

    let F: number;

    if (Math.abs(R - 1) < 0.001) {
        const F_calc = (P * Math.sqrt(2)) / ((1 - P) * Math.log((2 - P * (2 - Math.sqrt(2))) / (2 - P * (2 + Math.sqrt(2)))));
        F = Math.min(1, Math.max(0.5, isNaN(F_calc) || !isFinite(F_calc) ? 0.9 : F_calc));
    } else {
        const sqrtTerm = Math.sqrt(R * R + 1);
        const numerator = sqrtTerm * Math.log((1 - P) / (1 - P * R));
        const term1 = (2 - P * (R + 1 - sqrtTerm)) / (2 - P * (R + 1 + sqrtTerm));
        const denominator = (R - 1) * Math.log(term1);

        F = numerator / denominator;
        F = Math.min(1, Math.max(0.5, isNaN(F) || !isFinite(F) ? 0.9 : F));
    }

    const warning = F < 0.75;
    const message = warning
        ? `F-factor (${F.toFixed(3)}) is below TEMA recommended minimum of 0.75. Consider increasing shell passes or changing flow arrangement.`
        : undefined;

    return { F, warning, message };
};

export const calculateEffectivenessCounter = (ntu: number, Cr: number): number => {
    if (Cr === 0) return 1 - Math.exp(-ntu);
    if (Math.abs(Cr - 1) < 0.001) return ntu / (1 + ntu);
    return (1 - Math.exp(-ntu * (1 - Cr))) / (1 - Cr * Math.exp(-ntu * (1 - Cr)));
};

export const calculateEffectivenessParallel = (ntu: number, Cr: number): number => {
    if (Cr === 0) return 1 - Math.exp(-ntu);
    return (1 - Math.exp(-ntu * (1 + Cr))) / (1 + Cr);
};

export interface PressureDropResult extends CalculationResult {
    pressureDrop: number;
    reynolds: number;
}

/**
 * Tube-side pressure drop per Kern's Method
 */
export const calculateTubeSidePressureDrop = (
    velocity: number,
    density: number,
    viscosity: number,
    innerDiameter: number,
    tubeLength: number,
    tubePasses: number
): PressureDropResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (velocity <= 0 || innerDiameter <= 0) return { pressureDrop: 0, reynolds: 0, warnings, errors: ["Invalid velocity or diameter"] };

    const reynolds = (density * velocity * innerDiameter) / viscosity;

    let frictionFactor: number;
    if (reynolds < 2300) {
        frictionFactor = 16 / reynolds;
    } else if (reynolds < 100000) {
        frictionFactor = 0.079 * Math.pow(reynolds, -0.25);
    } else {
        frictionFactor = 0.046 * Math.pow(reynolds, -0.2);
    }

    const straightDrop = (4 * frictionFactor * tubeLength * tubePasses * density * velocity * velocity) / (2 * innerDiameter);
    const returnLoss = (4 * tubePasses * density * velocity * velocity) / 2;
    const totalPressureDrop = straightDrop + returnLoss;

    return { pressureDrop: totalPressureDrop, reynolds, warnings, errors };
};

export interface BellDelawareResult extends CalculationResult {
    pressureDrop: number;
    velocity: number;
    reynolds: number;
    crossFlowArea: number;
    Jc: number;
    Jl: number;
    Jb: number;
    Jr: number;
    Js: number;
    numberOfBaffles: number;
    equivalentDiameter: number;
    Gs: number;
}

/**
 * Bell-Delaware Method for Shell-Side
 */
export const calculateBellDelaware = (
    massFlowRate: number,
    density: number,
    viscosity: number,
    shellDiameter: number,
    baffleSpacing: number,
    baffleCut: number,
    tubeOuterDiameter: number,
    tubePitch: number,
    tubeLength: number,
    tubePattern: string,
    numberOfTubes: number,
    shellBaffleLeakage: number,
    tubeBaffleLeakage: number,
    bundleBypass: number
): BellDelawareResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Default safe return object
    const errorResult = {
        pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0,
        Jc: 1, Jl: 1, Jb: 1, Jr: 1, Js: 1,
        numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0,
        warnings, errors
    };

    if (massFlowRate <= 0 || shellDiameter <= 0) {
        errors.push("Invalid mass flow or shell diameter");
        return { ...errorResult, errors };
    }

    // [VALIDATION] Geometry Guardrails
    if (baffleCut <= 0 || baffleCut >= 0.5) {
        errors.push(`Invalid Baffle Cut (${(baffleCut * 100).toFixed(1)}%). Must be between 0 and 50%.`);
        return { ...errorResult, errors };
    }

    if (tubePitch <= tubeOuterDiameter) {
        errors.push(`Invalid Geometry: Pitch (${tubePitch * 1000}mm) must be greater than Tube OD (${tubeOuterDiameter * 1000}mm).`);
        return { ...errorResult, errors };
    }

    const clearance = tubePitch - tubeOuterDiameter;
    const Sm = shellDiameter * baffleSpacing * clearance / tubePitch;

    if (Sm <= 0) {
        errors.push("Calculated cross-flow area is zero or negative. Check geometry inputs.");
        return { ...errorResult, errors };
    }

    const Gs = massFlowRate / Sm;
    const velocity = Gs / density;

    let De: number;
    if (tubePattern === "triangular") {
        De = (1.1 / tubeOuterDiameter) * (tubePitch * tubePitch - 0.917 * tubeOuterDiameter * tubeOuterDiameter);
    } else {
        De = (1.27 / tubeOuterDiameter) * (tubePitch * tubePitch - 0.785 * tubeOuterDiameter * tubeOuterDiameter);
    }
    De = Math.max(De, 0.001);

    const reynolds = (tubeOuterDiameter * Gs) / viscosity;
    const Nb = Math.max(1, Math.floor(tubeLength / baffleSpacing) - 1);

    const Fc = 1 - 2 * baffleCut;
    const Jc = 0.55 + 0.72 * Math.max(0.3, Math.min(0.9, Fc));

    const Asb = Math.PI * shellDiameter * shellBaffleLeakage;
    const Atb = numberOfTubes * Math.PI * tubeOuterDiameter * tubeBaffleLeakage;
    const totalLeakage = Asb + Atb;
    const rs = Asb / (Asb + Atb + 0.001);
    const rlm = totalLeakage / (Sm + 0.001);
    const Jl = 0.44 * (1 - rs) + (1 - 0.44 * (1 - rs)) * Math.exp(-2.2 * rlm);

    const Fbp = bundleBypass;
    const Cbp = reynolds >= 100 ? 1.35 : 1.25;
    const rss = 0.5;
    const Jb = Math.exp(-Cbp * Fbp * (1 - Math.pow(2 * rss, 1 / 3)));

    let Jr: number;
    if (reynolds >= 100) {
        Jr = 1.0;
    } else if (reynolds >= 20) {
        Jr = 0.9;
    } else {
        Jr = 0.8;
    }

    const Js = 1.0;

    let frictionFactor: number;
    if (reynolds > 1000) {
        frictionFactor = tubePattern === "triangular"
            ? Math.exp(0.576 - 0.19 * Math.log(reynolds))
            : Math.exp(0.576 - 0.18 * Math.log(reynolds));
    } else if (reynolds > 100) {
        frictionFactor = Math.exp(0.8 - 0.15 * Math.log(reynolds));
    } else {
        frictionFactor = 48 / reynolds;
    }

    // [FIX] Enforce Nc >= 1 per engineering rules
    // Calculate theoretical crossflow rows
    const theoreticalNc = shellDiameter * (1 - 2 * baffleCut) / tubePitch;
    const Nc = Math.max(1, Math.floor(theoreticalNc));

    if (theoreticalNc < 1) {
        warnings.push(`Geometry warning: Calculated crossflow rows (${theoreticalNc.toFixed(2)}) < 1.0. Claming to 1.0 for pressure drop safety.`);
    }

    const deltaP_cross = (Nb * 4 * frictionFactor * Gs * Gs * Nc) / (2 * density);

    // [FIX] Enforce Nw >= 0
    const theoreticalNw = 2 * baffleCut * shellDiameter / tubePitch;
    const Nw = Math.max(0, Math.floor(theoreticalNw));
    const deltaP_window = (Nb + 1) * (2 + 0.6 * Nw) * Gs * Gs / (2 * density);

    const deltaP_ends = 2 * Gs * Gs / (2 * density);

    const Rb = Jb;
    const Rl = Math.pow(Jl, 2);

    const totalPressureDrop = (deltaP_cross * Rb * Rl) + deltaP_window + deltaP_ends;

    return {
        pressureDrop: Math.max(0, totalPressureDrop),
        velocity,
        reynolds,
        crossFlowArea: Sm,
        Jc,
        Jl,
        Jb,
        Jr,
        Js,
        numberOfBaffles: Nb,
        equivalentDiameter: De,
        Gs,
        warnings,
        errors
    };
};

export interface KernResult extends CalculationResult {
    pressureDrop: number;
    velocity: number;
    reynolds: number;
    crossFlowArea: number;
    numberOfBaffles: number;
    equivalentDiameter: number;
    Gs: number;
}

export const calculateKernShellSide = (
    massFlowRate: number,
    density: number,
    viscosity: number,
    shellDiameter: number,
    baffleSpacing: number,
    tubeOuterDiameter: number,
    tubePitch: number,
    tubeLength: number,
    tubePattern: string
): KernResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    const errorResult = {
        pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0,
        numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0,
        warnings, errors
    };

    if (massFlowRate <= 0 || shellDiameter <= 0) {
        errors.push("Invalid mass flow or shell diameter");
        return { ...errorResult, errors };
    }

    if (tubePitch <= tubeOuterDiameter) {
        errors.push(`Invalid Geometry: Pitch (${tubePitch * 1000}mm) must be greater than Tube OD (${tubeOuterDiameter * 1000}mm).`);
        return { ...errorResult, errors };
    }

    const clearance = tubePitch - tubeOuterDiameter;
    const crossFlowArea = (shellDiameter * baffleSpacing * clearance) / tubePitch;

    if (crossFlowArea <= 0) {
        errors.push("Calculated cross-flow area is zero or negative. Check geometry inputs.");
        return { ...errorResult, errors };
    }

    const Gs = massFlowRate / crossFlowArea;
    const velocity = Gs / density;

    let De: number;
    if (tubePattern === "triangular") {
        De = (4 * ((tubePitch * tubePitch * Math.sqrt(3) / 4) - (Math.PI * tubeOuterDiameter * tubeOuterDiameter / 8))) /
            (Math.PI * tubeOuterDiameter / 2);
    } else {
        De = (4 * (tubePitch * tubePitch - Math.PI * tubeOuterDiameter * tubeOuterDiameter / 4)) /
            (Math.PI * tubeOuterDiameter);
    }

    const reynolds = (De * Gs) / viscosity;

    let frictionFactor: number;
    if (reynolds > 500) {
        frictionFactor = Math.exp(0.576 - 0.19 * Math.log(reynolds));
    } else {
        frictionFactor = 1.0;
    }

    const numberOfBaffles = Math.floor(tubeLength / baffleSpacing) - 1;

    const pressureDrop = (frictionFactor * Gs * Gs * shellDiameter * (numberOfBaffles + 1)) /
        (2 * density * De);

    return {
        pressureDrop: Math.max(0, pressureDrop),
        velocity, reynolds, crossFlowArea, numberOfBaffles, equivalentDiameter: De, Gs,
        warnings, errors
    };
};

// ============================================================================
// UNIT CONVERSION UTILITIES
// ============================================================================

/**
 * Convert temperature between units
 */
export const convertTemperature = {
    CtoF: (c: number) => c * 9 / 5 + 32,
    FtoC: (f: number) => (f - 32) * 5 / 9,
    CtoK: (c: number) => c + 273.15,
    KtoC: (k: number) => k - 273.15,
    FtoK: (f: number) => (f - 32) * 5 / 9 + 273.15,
    KtoF: (k: number) => (k - 273.15) * 9 / 5 + 32
};

/**
 * Unit conversion factors for heat exchanger calculations
 */
export const unitConversionFactors = {
    // Length
    mmToIn: 0.03937,
    inToMm: 25.4,
    mToFt: 3.28084,
    ftToM: 0.3048,

    // Area
    m2ToFt2: 10.7639,
    ft2ToM2: 0.092903,

    // Flow rate
    kgHrToLbHr: 2.20462,
    lbHrToKgHr: 0.453592,
    m3HrToGpm: 4.40287,
    gpmToM3Hr: 0.227125,

    // Density
    kgM3ToLbFt3: 0.062428,
    lbFt3ToKgM3: 16.0185,

    // Pressure
    kPaToPsi: 0.145038,
    psiToKPa: 6.89476,
    mpaToBar: 10,
    barToMpa: 0.1,
    paTokPa: 0.001,

    // Viscosity
    cPToPaS: 0.001,
    paSToCp: 1000,

    // Thermal conductivity
    wMKToBtuHrFtF: 0.5778,
    btuHrFtFToWMK: 1.7307,

    // Heat transfer coefficient
    wM2KToBtuHrFt2F: 0.1761,
    btuHrFt2FToWM2K: 5.67826,

    // Specific heat
    kJKgKToBtuLbF: 0.238846,
    btuLbFToKJKgK: 4.1868,

    // Heat duty
    kWToBtuHr: 3412.14,
    btuHrToKW: 0.000293071,
    kWToMmbtuHr: 0.003412,

    // Velocity
    msToFts: 3.28084,
    ftsToMs: 0.3048
};

/**
 * Convert value between unit systems
 */
export const convertToMetric = (value: number, property: string): number => {
    const conversions: Record<string, (v: number) => number> = {
        'temperature': (f: number) => (f - 32) * 5 / 9,
        'pressure': (psi: number) => psi * 0.00689476,
        'flowRate': (lbhr: number) => lbhr * 0.453592,
        'density': (lbft3: number) => lbft3 * 16.0185,
        'viscosity': (cP: number) => cP * 0.001,
        'length': (inch: number) => inch * 0.0254,
        'lengthLong': (ft: number) => ft * 0.3048,
        'heatTransferCoefficient': (btu: number) => btu * 5.67826,
        'specificHeat': (btu: number) => btu * 4.1868,
        'thermalConductivity': (btu: number) => btu * 1.7307,
        'area': (ft2: number) => ft2 * 0.092903,
        'velocity': (fts: number) => fts * 0.3048,
        'heatDuty': (btuhr: number) => btuhr * 0.000293071
    };

    return conversions[property]?.(value) ?? value;
};

/**
 * Convert value to imperial units
 */
export const convertToImperial = (value: number, property: string): number => {
    const conversions: Record<string, (v: number) => number> = {
        'temperature': (c: number) => c * 9 / 5 + 32,
        'pressure': (mpa: number) => mpa * 145.038,
        'flowRate': (kghr: number) => kghr * 2.20462,
        'density': (kgm3: number) => kgm3 * 0.062428,
        'viscosity': (pas: number) => pas * 1000,
        'length': (m: number) => m * 39.3701,
        'lengthLong': (m: number) => m * 3.28084,
        'heatTransferCoefficient': (w: number) => w * 0.1761,
        'specificHeat': (kj: number) => kj * 0.238846,
        'thermalConductivity': (w: number) => w * 0.5778,
        'area': (m2: number) => m2 * 10.7639,
        'velocity': (ms: number) => ms * 3.28084,
        'heatDuty': (kw: number) => kw * 3412.14
    };

    return conversions[property]?.(value) ?? value;
};

// ============================================================================
// OVERALL HEAT TRANSFER COEFFICIENT CALCULATION
// ============================================================================

export interface OverallUResult extends CalculationResult {
    cleanU: number;
    fouledU: number;
    tubeWallResistance: number;
    tubeSideResistance: number;
    shellSideResistance: number;
}

/**
 * Calculate overall heat transfer coefficient
 * @param hi - Tube-side heat transfer coefficient (W/m²·K)
 * @param ho - Shell-side heat transfer coefficient (W/m²·K)
 * @param Di - Tube inner diameter (m)
 * @param Do - Tube outer diameter (m)
 * @param kTube - Tube thermal conductivity (W/m·K)
 * @param Rfi - Tube-side fouling factor (m²·K/W)
 * @param Rfo - Shell-side fouling factor (m²·K/W)
 */
export const calculateOverallU = (
    hi: number,
    ho: number,
    Di: number,
    Do: number,
    kTube: number,
    Rfi: number = 0,
    Rfo: number = 0
): OverallUResult => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (hi <= 0 || ho <= 0 || Di <= 0 || Do <= 0 || kTube <= 0) {
        return {
            cleanU: 0,
            fouledU: 0,
            tubeWallResistance: 0,
            tubeSideResistance: 0,
            shellSideResistance: 0,
            warnings,
            errors: ["Invalid input parameters for U calculation"]
        };
    }

    // Resistances (all referenced to outside surface area)
    const tubeWallResistance = (Do * Math.log(Do / Di)) / (2 * kTube);
    const tubeSideResistance = (1 / hi) * (Do / Di);
    const shellSideResistance = 1 / ho;

    // Clean U (no fouling)
    const cleanU = 1 / (shellSideResistance + tubeWallResistance + tubeSideResistance);

    // Fouled U (with fouling factors)
    const fouledU = 1 / (
        shellSideResistance + 
        Rfo + 
        tubeWallResistance + 
        (Rfi * (Do / Di)) + 
        tubeSideResistance
    );

    // Warnings
    if (cleanU < 50) {
        warnings.push("Very low U value - check fluid properties and geometry");
    }
    if (fouledU < cleanU * 0.5) {
        warnings.push("Significant fouling impact - consider cleaning frequency");
    }

    return {
        cleanU,
        fouledU,
        tubeWallResistance,
        tubeSideResistance,
        shellSideResistance,
        warnings,
        errors
    };
};

// ============================================================================
// NTU-EFFECTIVENESS CALCULATIONS
// ============================================================================

export interface NTUResult {
    ntu: number;
    effectiveness: number;
    Cmin: number;
    Cmax: number;
    Cr: number;
    Qmax: number;
    Qactual: number;
}

/**
 * Calculate NTU and effectiveness for different flow arrangements
 */
export const calculateNTUEffectiveness = (
    U: number,           // Overall U (W/m²·K)
    A: number,           // Heat transfer area (m²)
    mh: number,          // Hot fluid mass flow (kg/s)
    mc: number,          // Cold fluid mass flow (kg/s)
    Cph: number,         // Hot fluid specific heat (J/kg·K)
    Cpc: number,         // Cold fluid specific heat (J/kg·K)
    ThIn: number,        // Hot fluid inlet temp (K)
    TcIn: number,        // Cold fluid inlet temp (K)
    flowArrangement: FlowArrangement = "counter"
): NTUResult => {
    const Ch = mh * Cph;
    const Cc = mc * Cpc;
    const Cmin = Math.min(Ch, Cc);
    const Cmax = Math.max(Ch, Cc);
    const Cr = Cmin / Cmax;

    const ntu = (U * A) / Cmin;

    // Calculate effectiveness based on flow arrangement
    let effectiveness: number;
    if (flowArrangement === "counter") {
        effectiveness = calculateEffectivenessCounter(ntu, Cr);
    } else if (flowArrangement === "parallel") {
        effectiveness = calculateEffectivenessParallel(ntu, Cr);
    } else {
        // For shell-tube and crossflow, use counter-flow approximation
        // with correction factor already applied to LMTD
        effectiveness = calculateEffectivenessCounter(ntu, Cr);
    }

    const Qmax = Cmin * (ThIn - TcIn);
    const Qactual = effectiveness * Qmax;

    return {
        ntu,
        effectiveness,
        Cmin,
        Cmax,
        Cr,
        Qmax,
        Qactual
    };
};

// ============================================================================
// HEAT DUTY CALCULATIONS
// ============================================================================

/**
 * Calculate heat duty from fluid conditions
 * @param massFlow - Mass flow rate (kg/s)
 * @param specificHeat - Specific heat (J/kg·K)
 * @param TIn - Inlet temperature (K)
 * @param TOut - Outlet temperature (K)
 * @returns Heat duty in Watts
 */
export const calculateHeatDuty = (
    massFlow: number,
    specificHeat: number,
    TIn: number,
    TOut: number
): number => {
    return Math.abs(massFlow * specificHeat * (TIn - TOut));
};

/**
 * Calculate required heat transfer area
 * @param Q - Heat duty (W)
 * @param U - Overall heat transfer coefficient (W/m²·K)
 * @param LMTD - Log mean temperature difference (K)
 * @param F - LMTD correction factor (default 1.0)
 * @returns Required area in m²
 */
export const calculateRequiredArea = (
    Q: number,
    U: number,
    LMTD: number,
    F: number = 1.0
): number => {
    if (U <= 0 || LMTD <= 0 || F <= 0) return 0;
    return Q / (U * LMTD * F);
};
