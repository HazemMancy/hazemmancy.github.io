import { PumpType } from "./pumpData";

// ================== UNIT TYPES ==================
export type UnitSystem = 'metric' | 'imperial';

// ================== UNIT CONVERSIONS ==================

// Metric flow rate units (to m³/s)
export const metricFlowRateToM3s: Record<string, number> = {
    "m³/h": 1 / 3600,
    "m³/s": 1,
    "L/min": 1 / 60000,
    "L/s": 0.001,
};

// Imperial flow rate units (to m³/s)
export const imperialFlowRateToM3s: Record<string, number> = {
    "gpm": 0.0000630902,
    "bbl/d": 0.00000184013,
    "ft³/min": 0.000471947,
    "ft³/s": 0.0283168,
};

// Metric head units (to m)
export const metricHeadToMeters: Record<string, number> = {
    "m": 1,
    "bar": 10.197,
    "kPa": 0.10197,
};

// Imperial head units (to m)
export const imperialHeadToMeters: Record<string, number> = {
    "ft": 0.3048,
    "psi": 0.703,
    "in H₂O": 0.0254,
};

// Length conversion (to meters)
export const metricLengthToMeters: Record<string, number> = {
    "m": 1,
    "km": 1000,
};

export const imperialLengthToMeters: Record<string, number> = {
    "ft": 0.3048,
    "mi": 1609.34,
};

// Density conversion (to kg/m³)
export const metricDensityToKgM3: Record<string, number> = {
    "kg/m³": 1,
    "g/cm³": 1000,
    "SG": 1000,
};

export const imperialDensityToKgM3: Record<string, number> = {
    "lb/ft³": 16.0185,
    "lb/gal": 119.826,
    "SG": 1000,
};

// Viscosity conversion (to Pa·s)
export const viscosityToPas: Record<string, number> = {
    "cP": 0.001,
    "Pa·s": 1,
    "mPa·s": 0.001,
    "cSt": 0.001,
};

// Pressure conversion (to kPa)
export const metricPressureToKPa: Record<string, number> = {
    "kPa": 1,
    "bar": 100,
    "MPa": 1000,
    "kPa(a)": 1,
};

export const imperialPressureToKPa: Record<string, number> = {
    "psia": 6.89476,
    "psig": 6.89476,
    "in Hg": 3.38639,
};

// Power conversion (to kW)
export const metricPowerToKW: Record<string, number> = {
    "kW": 1,
    "W": 0.001,
    "MW": 1000,
};

export const imperialPowerToKW: Record<string, number> = {
    "hp": 0.7457,
    "BTU/hr": 0.000293071,
};

// ================== ENGINEERING CALCULATIONS ==================

/**
 * Calculates Colebrook-White friction factor using Swamee-Jain approximation
 * @param Re Reynolds number
 * @param eD Relative roughness (roughness/diameter)
 * @returns Friction factor (f)
 */
/**
 * Calculates Friction Factor using Churchill's Equation (1977)
 * Standard used in Aspen HYSYS / Process Simulators.
 * Covers Laminar, Transition, and Turbulent regimes in a single continuous function.
 * @param Re Reynolds number
 * @param eD Relative roughness (roughness/diameter)
 * @returns Darcy Friction factor (f)
 */
export const calculateChurchill = (Re: number, eD: number): number => {
    if (Re <= 0) return 0;

    // Churchill Component A
    // A = (-2.457 * ln( (7/Re)^0.9 + 0.27*(e/D) ))^16
    const term1 = Math.pow(7 / Re, 0.9);
    const term2 = 0.27 * eD;
    const A = Math.pow(-2.457 * Math.log(term1 + term2), 16);

    // Churchill Component B
    // B = (37530 / Re)^16
    const B = Math.pow(37530 / Re, 16);

    // f = 8 * [ (8/Re)^12 + 1 / (A + B)^1.5 ] ^ (1/12)
    const laminarTerm = Math.pow(8 / Re, 12);
    const turbulentTerm = 1 / Math.pow(A + B, 1.5);

    return 8 * Math.pow(laminarTerm + turbulentTerm, 1 / 12);
};

export const calculateFrictionFactor = (Re: number, roughness: number, diameter: number): number => {
    const relativeRoughness = roughness / diameter;
    return calculateChurchill(Re, relativeRoughness);
};

export const calculateReynolds = (velocity: number, diameter: number, density: number, viscosity: number): number => {
    if (viscosity === 0) return 0;
    return (density * velocity * diameter) / viscosity;
};

export const calculateVelocity = (flowRate: number, diameter: number): number => {
    if (diameter === 0) return 0;
    const area = Math.PI * Math.pow(diameter / 2, 2);
    return flowRate / area;
};

/**
 * Calculates Net Positive Suction Head Available (NPSHa)
 * @param suctionPressure Suction pressure (Pa absolute)
 * @param liquidVaporPressure Vapor pressure (Pa absolute)
 * @param suctionStaticHead Static head (meters, +ve if source above pump)
 * @param suctionFrictionLoss Friction head loss (meters)
 * @param suctionVelocityHead Velocity head (meters)
 * @param density Fluid density (kg/m³)
 * @param accelerationHead Acceleration head (meters, for reciprocating pumps)
 */
export const calculateNPSHa = (
    suctionPressure: number,
    liquidVaporPressure: number,
    suctionStaticHead: number,
    suctionFrictionLoss: number,
    suctionVelocityHead: number,
    density: number,
    accelerationHead: number = 0
): number => {
    const g = 9.81;
    // NPSHa = (Ps - Pv)/(ρg) + Zs - hfs + Vs²/(2g) - ha
    const pressureHead = (suctionPressure - liquidVaporPressure) / (density * g);
    return pressureHead + suctionStaticHead - suctionFrictionLoss + suctionVelocityHead - accelerationHead;
};

/**
 * Calculates Acceleration Head for Reciprocating Pumps (API 674)
 * ha = (L * V * N * C) / (K * g)
 * @param suctionLength Line length (m)
 * @param velocity Fluid velocity (m/s)
 * @param rpm Pump speed (rpm)
 * @param pumpType Pump type key (to determine C constant)
 * @param compressibilityFactor Fluid compressibility factor (K) - typically 1.4 to 2.5
 */
export const calculateAccelerationHead = (
    suctionLength: number,
    velocity: number,
    rpm: number,
    pumpType: string,
    compressibilityFactor: number = 2.0 // Default for water/liquids
): number => {
    const g = 9.81;

    // Pump Constants (C) per Hydraulic Institute / API 674
    // Simplex Single Acting: 0.400
    // Simplex Double Acting: 0.200
    // Duplex Single Acting: 0.200
    // Duplex Double Acting: 0.115
    // Triplex: 0.066
    // Quintuplex: 0.040
    // Septuplex: 0.028

    let C = 0;
    if (pumpType.includes("reciprocating_simplex")) C = 0.200; // Assume double acting or conservative single
    else if (pumpType.includes("reciprocating_duplex")) C = 0.115;
    else if (pumpType.includes("reciprocating_triplex")) C = 0.066;
    // Rotary/Centrifugal effectively have C=0 (steady flow)

    return (suctionLength * velocity * rpm * C) / (compressibilityFactor * g);
};

/**
 * Calculates HI 9.6.7 Viscosity Correction Factors
 * Using digitized data from Hydraulic Institute Standards (ANSI/HI 9.6.7)
 * Method: Calculates Parameter B, then interpolates C_Q, C_H, C_eta.
 * 
 * @param Q_m3h Flow rate in m³/h (Viscous) - Assumed at/near BEP for method
 * @param H_m Head in meters (Viscous)
 * @param N_rpm Pump Speed in RPM
 * @param nu_cSt Viscosity in cSt (mm²/s)
 * @returns { C_Q, C_H, C_eta, B }
 */
export const calculateHICorrections = (Q_m3h: number, H_m: number, N_rpm: number, nu_cSt: number) => {
    // 0. Limits check
    if (Q_m3h <= 0 || H_m <= 0 || N_rpm <= 0 || nu_cSt <= 1) {
        return { C_Q: 1, C_H: 1, C_eta: 1, B: 0 };
    }

    // 1. Calculate Parameter B
    // B = 16.5 * (nu^0.5 * H^0.0625) / (Q^0.375 * N^0.25)
    // Note: HI Formula uses Q(m3/h), H(m), nu(cSt), N(rpm)
    const B = 16.5 * (Math.pow(nu_cSt, 0.5) * Math.pow(H_m, 0.0625)) / (Math.pow(Q_m3h, 0.375) * Math.pow(N_rpm, 0.25));

    // 2. Interpolate Factors from Digitized table
    // Table: [B, C_eta, C_Q, C_H]
    const table = [
        [0, 1.0, 1.0, 1.0],
        [1.0, 1.00, 1.00, 1.00],
        [2.0, 0.96, 0.99, 0.99],
        [4.0, 0.89, 0.97, 0.98],
        [6.0, 0.85, 0.96, 0.97],
        [8.0, 0.81, 0.95, 0.96],
        [10.0, 0.77, 0.94, 0.95],
        [15.0, 0.69, 0.91, 0.93],
        [20.0, 0.62, 0.89, 0.91],
        [30.0, 0.53, 0.85, 0.88],
        [40.0, 0.45, 0.82, 0.85]
    ];

    // Linear Interpolation Helper
    const interpolate = (val: number, idx: number) => {
        if (val <= table[0][0]) return 1.0;
        if (val >= table[table.length - 1][0]) return table[table.length - 1][idx];

        for (let i = 0; i < table.length - 1; i++) {
            if (val >= table[i][0] && val < table[i + 1][0]) {
                const t = (val - table[i][0]) / (table[i + 1][0] - table[i][0]);
                return table[i][idx] * (1 - t) + table[i + 1][idx] * t;
            }
        }
        return 1.0;
    };

    const C_eta = interpolate(B, 1);
    const C_Q = interpolate(B, 2);
    const C_H = interpolate(B, 3);

    return { C_Q, C_H, C_eta, B };
};

export interface CalculationResult {
    suctionVelocity: number;
    dischargeVelocity: number;
    suctionReynolds: number;
    dischargeReynolds: number;
    suctionFrictionLoss: number;
    dischargeFrictionLoss: number;
    suctionTotalLoss: number;
    dischargeTotalLoss: number;
    totalFrictionLoss: number;
    totalStaticHead: number;
    totalDynamicHead: number;
    NPSHa: number;
    accelerationHead: number;
    hydraulicPower: number;
    brakePower: number;
    motorPower: number;
    viscosityCorrections?: { C_Q: number, C_H: number, C_eta: number, B: number };
}
