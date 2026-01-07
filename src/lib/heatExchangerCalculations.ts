
// Heat Exchanger Calculation Library
// Contains physics models for Shell & Tube Heat Exchangers
// Methods: Bell-Delaware, Kern, Dittus-Boelter, Sieder-Tate, TEMA/HTRI Vibration

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
export const calculateTubeSideHTC = (
    Re: number,
    Pr: number,
    k: number,
    Di: number,
    isHeating: boolean = true,
    viscosityRatio?: number
): { h: number; Nu: number } => {
    if (Re <= 0 || Pr <= 0 || k <= 0 || Di <= 0) {
        return { h: 0, Nu: 0 };
    }

    let Nu: number;

    if (Re < 2300) {
        // Laminar flow: Nu = 3.66 (constant wall temp) or 4.36 (constant heat flux)
        // Per Shah & London (1978) - Advances in Heat Transfer
        Nu = 3.66;
    } else if (Re < 10000) {
        // Transition: Gnielinski correlation (1976)
        // Valid for 2300 < Re < 10^6, 0.5 < Pr < 2000
        const f = Math.pow(1.82 * Math.log10(Re) - 1.64, -2);
        Nu = (f / 8) * (Re - 1000) * Pr / (1 + 12.7 * Math.sqrt(f / 8) * (Math.pow(Pr, 2 / 3) - 1));
        Nu = Math.max(Nu, 3.66); // Ensure positive
    } else {
        // Turbulent: Dittus-Boelter correlation (1930)
        // Valid for Re > 10000, 0.6 < Pr < 160, L/D > 10
        // n = 0.4 for heating (Tw > Tb), n = 0.3 for cooling (Tw < Tb)
        const n = isHeating ? 0.4 : 0.3;
        Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, n);
    }

    // Apply Sieder-Tate viscosity correction if provided
    // Recommended when (Tw - Tb) > 10°C or viscosity varies significantly
    // Per Sieder & Tate (1936): Nu_corrected = Nu * (μ_bulk/μ_wall)^0.14
    if (viscosityRatio && viscosityRatio > 0 && Re >= 10000) {
        Nu = Nu * Math.pow(viscosityRatio, 0.14);
    }

    const h = Nu * k / Di;
    return { h, Nu };
};

/**
 * Calculate Shell-Side Heat Transfer Coefficient (ho)
 * 
 * References:
 * - Bell, K.J. (1963): "Final Report of the Cooperative Research Program on Shell and Tube Heat Exchangers"
 * - TEMA Standards Section RGP-4.5: Shell-Side Heat Transfer
 * - Taborek, J. (1983): "Shell-and-Tube Heat Exchangers" in Heat Exchanger Design Handbook
 * - HTRI Design Manual: Delaware Method
 * 
 * Method: Bell-Delaware with j-factor correlations
 * 
 * Validity Ranges:
 * - Reynolds number: 10 < Re < 10^6
 * - Prandtl number: 0.7 < Pr < 500
 * - Tube pitch/diameter ratio: 1.25 < P/D < 2.0
 * 
 * Correction Factors (Bell-Delaware):
 * - Jc: Baffle configuration correction
 * - Jl: Baffle leakage correction (shell-to-baffle and tube-to-baffle)
 * - Jb: Bundle bypass correction
 * - Jr: Laminar flow correction
 * - Js: Unequal baffle spacing correction
 * 
 * @param Re - Shell-side Reynolds number based on tube OD
 * @param Pr - Prandtl number
 * @param k - Thermal conductivity (W/m·K)
 * @param De - Equivalent diameter (m)
 * @param Gs - Mass velocity (kg/m²s)
 * @param Cp - Specific heat (kJ/kg·K)
 * @param tubePattern - "triangular" or "square"
 * @param Jc - Baffle configuration correction factor
 * @param Jl - Leakage correction factor
 * @param Jb - Bundle bypass correction factor
 * @param Jr - Laminar flow correction factor
 * @param Js - Unequal spacing correction factor
 * @returns Object containing heat transfer coefficient (W/m²K) and Nusselt number
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
): { h: number; Nu: number } => {
    if (Re <= 0 || Pr <= 0 || k <= 0 || De <= 0 || Gs <= 0) {
        return { h: 0, Nu: 0 };
    }

    let jFactor: number;

    // j-factor correlations per Bell-Delaware method
    // Coefficients from HTRI and Taborek (1983)
    if (tubePattern === "triangular") {
        // Triangular (30° or 60°) pitch - more efficient heat transfer
        if (Re > 10000) {
            jFactor = 0.321 * Math.pow(Re, -0.388);  // Turbulent
        } else if (Re > 1000) {
            jFactor = 0.593 * Math.pow(Re, -0.477);  // Transition
        } else if (Re > 100) {
            jFactor = 1.52 * Math.pow(Re, -0.574);   // Low Re transition
        } else {
            jFactor = 1.04 * Math.pow(Re, -0.451);   // Laminar
        }
    } else {
        // Square (90°) or rotated square (45°) pitch - easier to clean
        if (Re > 10000) {
            jFactor = 0.249 * Math.pow(Re, -0.382);  // Turbulent
        } else if (Re > 1000) {
            jFactor = 0.391 * Math.pow(Re, -0.438);  // Transition
        } else if (Re > 100) {
            jFactor = 1.187 * Math.pow(Re, -0.547);  // Low Re transition
        } else {
            jFactor = 0.994 * Math.pow(Re, -0.426);  // Laminar
        }
    }

    // Ideal heat transfer coefficient (no corrections)
    // h_ideal = j × Cp × Gs × Pr^(-2/3)
    const h_ideal = jFactor * Cp * 1000 * Gs * Math.pow(Pr, -2 / 3);

    // Apply Bell-Delaware correction factors
    // h_actual = h_ideal × Jc × Jl × Jb × Jr × Js
    const h = h_ideal * Jc * Jl * Jb * Jr * Js;

    // Calculate Nusselt number
    const Nu = h * De / k;

    return { h, Nu };
};

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
    shellDiameter: number
): VibrationResults => {
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
            damageNumber: 0
        };
    }

    // Tube inner diameter
    const Di = tubeOD - 2 * tubeWallThickness;

    // Second moment of area (I) for tube
    const I = (Math.PI / 64) * (Math.pow(tubeOD, 4) - Math.pow(Di, 4));

    // Cross-sectional area
    const A = (Math.PI / 4) * (Math.pow(tubeOD, 2) - Math.pow(Di, 2));

    // Mass per unit length (tube + fluid inside)
    const tubeLinearMass = tubeDensity * A;
    const fluidLinearMass = shellDensity * (Math.PI / 4) * Math.pow(Di, 2);
    const totalLinearMass = tubeLinearMass + fluidLinearMass;

    // Added mass coefficient (hydrodynamic mass)
    const pitchRatio = tubePitch / tubeOD;
    let Cm: number;
    if (tubePattern === "triangular") {
        Cm = 1.0 + 0.6 / Math.pow(pitchRatio - 1, 1.5);
    } else {
        Cm = 1.0 + 0.5 / Math.pow(pitchRatio - 1, 1.5);
    }
    Cm = Math.min(Cm, 3.0); // Cap at reasonable value

    // Effective mass per unit length
    const addedMass = Cm * shellDensity * (Math.PI / 4) * Math.pow(tubeOD, 2);
    const effectiveMass = totalLinearMass + addedMass;

    /**
     * Natural Frequency (TEMA)
     * fn = (Cn/2π) × √(E×I / (m×L⁴))
     */
    const Cn = 22.4; // Fixed-fixed boundary conditions
    const fn = (Cn / (2 * Math.PI)) * Math.sqrt(
        (tubeElasticModulus * I) / (effectiveMass * Math.pow(unsupportedLength, 4))
    );

    /**
     * Strouhal Number and Vortex Shedding Frequency
     */
    const St = tubePattern === "triangular" ? 0.2 : 0.25;
    const fvs = St * shellVelocity / tubeOD;

    /**
     * Acoustic Resonance Frequency
     */
    const speedOfSound = 1500; // m/s (approximate for liquids)
    const effectiveWidth = shellDiameter;
    const fa = speedOfSound / (2 * effectiveWidth);

    /**
     * Critical Velocity - Connors' Equation
     */
    const K = tubePattern === "triangular" ? 2.4 : 3.4;
    const logDecrement = 0.03;
    const massRatio = effectiveMass / (shellDensity * Math.pow(tubeOD, 2));
    const Vcrit = K * fn * tubeOD * Math.sqrt(massRatio * logDecrement);

    // Reduced velocity
    const Vr = shellVelocity / (fn * tubeOD);

    // Frequency ratio
    const freqRatio = fvs / fn;

    /**
     * Damage Number (Pettigrew & Taylor)
     */
    const damageNumber = (shellDensity * Math.pow(shellVelocity, 2) * tubeOD) /
        (effectiveMass * fn * logDecrement);

    // Vibration risk assessment
    const isVibrationRisk =
        (freqRatio > 0.7 && freqRatio < 1.3) || // Resonance band
        shellVelocity > 0.8 * Vcrit ||           // Near critical velocity
        damageNumber > 0.5;                       // Damage potential

    // Acoustic resonance risk
    const isAcousticRisk =
        Math.abs(fvs - fa) / fa < 0.15 ||
        Math.abs(2 * fvs - fa) / fa < 0.15;

    // Generate message
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
        damageNumber
    };
};

/**
 * LMTD Correction Factor (F)
 * 
 * References:
 * - TEMA Standards Section RGP-4.5: LMTD Correction Factors
 * - Bowman, Mueller, Nagle (1940): "Mean Temperature Difference in Design"
 * - Kern, D.Q.: Process Heat Transfer, Chapter 8
 * 
 * TEMA Design Guideline:
 * - F should be > 0.75 for economical design
 * - F < 0.75 indicates potential temperature cross or poor configuration
 * - Consider increasing shell passes or changing flow arrangement if F < 0.75
 * 
 * @param R - Temperature effectiveness ratio: (T1-T2)/(t2-t1)
 * @param P - Thermal effectiveness: (t2-t1)/(T1-t1)
 * @param arrangement - Flow arrangement type
 * @returns Object with F-factor value and warning flag
 */
export const calculateCorrectionFactor = (
    R: number,
    P: number,
    arrangement: FlowArrangement
): { F: number; warning: boolean; message?: string } => {
    // Counter-flow and parallel-flow have F = 1.0 (no correction needed)
    if (arrangement === "counter" || arrangement === "parallel") {
        return { F: 1.0, warning: false };
    }

    // Validate inputs
    if (P <= 0 || P >= 1 || R <= 0) {
        return { F: 0.9, warning: true, message: "Invalid P or R values" };
    }

    let F: number;

    // Special case: R ≈ 1 (equal heat capacity rates)
    if (Math.abs(R - 1) < 0.001) {
        const F_calc = (P * Math.sqrt(2)) / ((1 - P) * Math.log((2 - P * (2 - Math.sqrt(2))) / (2 - P * (2 + Math.sqrt(2)))));
        F = Math.min(1, Math.max(0.5, isNaN(F_calc) || !isFinite(F_calc) ? 0.9 : F_calc));
    } else {
        // General formula for 1-2, 1-4 shell-tube exchangers
        const sqrtTerm = Math.sqrt(R * R + 1);
        const numerator = sqrtTerm * Math.log((1 - P) / (1 - P * R));
        const term1 = (2 - P * (R + 1 - sqrtTerm)) / (2 - P * (R + 1 + sqrtTerm));
        const denominator = (R - 1) * Math.log(term1);

        F = numerator / denominator;
        F = Math.min(1, Math.max(0.5, isNaN(F) || !isFinite(F) ? 0.9 : F));
    }

    // TEMA recommendation: F should be > 0.75
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
): { pressureDrop: number; reynolds: number } => {
    if (velocity <= 0 || innerDiameter <= 0) return { pressureDrop: 0, reynolds: 0 };

    const reynolds = (density * velocity * innerDiameter) / (viscosity / 1000);

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
    const totalPressureDrop = (straightDrop + returnLoss) / 1000;

    return { pressureDrop: totalPressureDrop, reynolds };
};

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
): {
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
} => {
    if (massFlowRate <= 0 || shellDiameter <= 0) {
        return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0, Jc: 1, Jl: 1, Jb: 1, Jr: 1, Js: 1, numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0 };
    }

    const clearance = tubePitch - tubeOuterDiameter;
    const Sm = shellDiameter * baffleSpacing * clearance / tubePitch;

    if (Sm <= 0) {
        return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0, Jc: 1, Jl: 1, Jb: 1, Jr: 1, Js: 1, numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0 };
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

    const reynolds = (tubeOuterDiameter * Gs) / (viscosity / 1000);
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

    const Nc = Math.floor(shellDiameter * (1 - 2 * baffleCut) / tubePitch);
    const deltaP_cross = (Nb * 4 * frictionFactor * Gs * Gs * Nc) / (2 * density);

    const Nw = Math.floor(2 * baffleCut * shellDiameter / tubePitch);
    const deltaP_window = (Nb + 1) * (2 + 0.6 * Nw) * Gs * Gs / (2 * density);

    const deltaP_ends = 2 * Gs * Gs / (2 * density);

    const Rb = Jb;
    const Rl = Math.pow(Jl, 2);

    const totalPressureDrop = ((deltaP_cross * Rb * Rl) + deltaP_window + deltaP_ends) / 1000;

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
        Gs
    };
};

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
): { pressureDrop: number; velocity: number; reynolds: number; crossFlowArea: number; numberOfBaffles: number; equivalentDiameter: number; Gs: number } => {
    if (massFlowRate <= 0 || shellDiameter <= 0) {
        return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0, numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0 };
    }

    const clearance = tubePitch - tubeOuterDiameter;
    const crossFlowArea = (shellDiameter * baffleSpacing * clearance) / tubePitch;

    if (crossFlowArea <= 0) {
        return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0, numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0 };
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

    const reynolds = (De * Gs) / (viscosity / 1000);

    let frictionFactor: number;
    if (reynolds > 500) {
        frictionFactor = Math.exp(0.576 - 0.19 * Math.log(reynolds));
    } else {
        frictionFactor = 1.0;
    }

    const numberOfBaffles = Math.floor(tubeLength / baffleSpacing) - 1;

    const pressureDrop = (frictionFactor * Gs * Gs * shellDiameter * (numberOfBaffles + 1)) /
        (2 * density * De * 1000);

    return { pressureDrop: Math.max(0, pressureDrop), velocity, reynolds, crossFlowArea, numberOfBaffles, equivalentDiameter: De, Gs };
};
