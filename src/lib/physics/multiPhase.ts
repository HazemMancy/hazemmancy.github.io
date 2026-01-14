/**
 * src/lib/physics/multiPhase.ts
 * Multiphase Engineering Models
 * Includes: 
 *  1. Homogeneous No-Slip (Screening)
 *  2. Beggs & Brill (1973) (Engineering-Grade) with Inclination Correction
 */

import { CONSTANTS, HydraulicInputs, HydraulicResult } from "./types";
import { solveColebrook } from "./singlePhase";

/**
 * Homogeneous No-Slip Model (Screening Only)
 */
export const calcHomogeneousDrift = (inputs: HydraulicInputs): HydraulicResult => {
    const {
        massFlow_kg_s, innerDiameter_m, length_m, elevation_m, roughness_m,
        gasDensity_kgm3, liquidDensity_kgm3, gasViscosity_Pas, liquidViscosity_Pas,
        pressureIn_Pa,
        gasMassFlow_kg_s, liquidMassFlow_kg_s
    } = inputs;

    const warnings: string[] = ["SCREENING ONLY: Homogeneous Model"];

    if (gasMassFlow_kg_s === undefined || liquidMassFlow_kg_s === undefined) {
        throw new Error("Gas/Liquid mass splits required for multiphase calc");
    }

    const rhoG = gasDensity_kgm3 || 1.0;
    const rhoL = liquidDensity_kgm3 || 1000.0;
    const muG = gasViscosity_Pas || 0.00001;
    const muL = liquidViscosity_Pas || 0.001;
    const area = Math.PI * Math.pow(innerDiameter_m, 2) / 4;

    const Qg = gasMassFlow_kg_s / rhoG;
    const Ql = liquidMassFlow_kg_s / rhoL;
    const Q_total = Qg + Ql;
    const Vm = Q_total / area;

    const lambdaL = Ql / Q_total;
    const lambdaG = 1 - lambdaL;

    // Mixture Properties (No-Slip)
    const rhoMix = rhoL * lambdaL + rhoG * lambdaG;
    const muMix = muL * lambdaL + muG * lambdaG;

    // Friction
    const Re = (rhoMix * Vm * innerDiameter_m) / muMix;
    const relRough = roughness_m / innerDiameter_m;
    const f = solveColebrook(Re, relRough);

    const dp_f = f * (length_m / innerDiameter_m) * (0.5 * rhoMix * Vm * Vm);
    const dp_z = rhoMix * CONSTANTS.g * elevation_m;

    const total_dp = dp_f + dp_z;
    const p_out = pressureIn_Pa - total_dp;

    return {
        success: true,
        pressureOut_Pa: p_out,
        pressureDrop_Pa: total_dp,
        velocity_m_s: Vm,
        reynolds: Re,
        frictionFactor: f,
        flowRegime: "Homogeneous (Assumed)",
        liquidHoldup: lambdaL, // No slip
        superficialVelGas_m_s: Qg / area,
        superficialVelLiq_m_s: Ql / area,
        mixtureDensity_kgm3: rhoMix,
        mixtureViscosity_Pas: muMix,
        dp_friction_Pa: dp_f,
        dp_elevation_Pa: dp_z,
        dp_acceleration_Pa: 0,
        warnings
    };
};

/**
 * Beggs & Brill (1973) Correlation implementation.
 */
export const calcBeggsBrill = (inputs: HydraulicInputs): HydraulicResult => {
    const {
        innerDiameter_m, length_m, elevation_m, roughness_m,
        gasDensity_kgm3, liquidDensity_kgm3, gasViscosity_Pas, liquidViscosity_Pas,
        pressureIn_Pa, gasMassFlow_kg_s, liquidMassFlow_kg_s
    } = inputs;

    const warnings: string[] = [];

    // Safety check for inputs
    if (innerDiameter_m <= 0) throw new Error("ID must be > 0");
    if (gasMassFlow_kg_s === undefined || liquidMassFlow_kg_s === undefined) throw new Error("Splits required");

    const area = Math.PI * Math.pow(innerDiameter_m, 2) / 4;
    const rhoG = gasDensity_kgm3 || 1.0;
    const rhoL = liquidDensity_kgm3 || 1000.0;
    const muG = gasViscosity_Pas || 0.00001;
    const muL = liquidViscosity_Pas || 0.001; // Pas

    const Qg = gasMassFlow_kg_s / rhoG;
    const Ql = liquidMassFlow_kg_s / rhoL;
    const Q_total = Qg + Ql;

    if (Q_total <= 0) return { success: false, pressureOut_Pa: pressureIn_Pa, pressureDrop_Pa: 0, velocity_m_s: 0, reynolds: 0, frictionFactor: 0, flowRegime: "Static", dp_friction_Pa: 0, dp_elevation_Pa: 0, dp_acceleration_Pa: 0, warnings: [] };

    const Vm = Q_total / area;
    const Vsl = Ql / area;
    const Vsg = Qg / area;

    // No-Slip Holdup
    const lambdaL = Ql / Q_total;

    // Froude Number
    const Fr = (Vm * Vm) / (CONSTANTS.g * innerDiameter_m);

    // 2. Flow Regime Determination (L parameters)
    const L1 = 316 * Math.pow(lambdaL, 0.302);
    const L2 = 0.0009252 * Math.pow(lambdaL, -2.4684);
    const L3 = 0.10 * Math.pow(lambdaL, -1.4516);
    const L4 = 0.5 * Math.pow(lambdaL, -6.738);

    let regime = "Segregated";
    let regimeCode = 0; // 0: Segregated, 1: Transition, 2: Intermittent, 3: Distributed

    if (lambdaL < 0.01 && Fr < L1) {
        regime = "Segregated"; regimeCode = 0;
    } else if (lambdaL >= 0.01 && Fr < L2) {
        regime = "Segregated"; regimeCode = 0;
    } else if (lambdaL >= 0.01 && Fr > L2 && Fr < L3) {
        regime = "Transition"; regimeCode = 1;
    } else if ((0.01 <= lambdaL && lambdaL < 0.4 && Fr > L3 && Fr <= L1) || (lambdaL >= 0.4 && Fr > L3 && Fr <= L4)) {
        regime = "Intermittent"; regimeCode = 2;
    } else if ((lambdaL < 0.4 && Fr >= L1) || (lambdaL >= 0.4 && Fr > L4)) {
        regime = "Distributed"; regimeCode = 3;
    } else {
        // Fallback Logic
        if (Fr > L1) { regime = "Distributed"; regimeCode = 3; }
        else { regime = "Segregated"; regimeCode = 0; }
    }

    // 3. Liquid Holdup (Horizontal) alpha_0
    const getHorizCoeffs = (code: number) => {
        switch (code) {
            case 0: return [0.98, 0.4846, 0.0868]; // Segregated
            case 2: return [0.845, 0.5351, 0.0173]; // Intermittent
            case 3: return [1.065, 0.5824, 0.0609]; // Distributed
            default: return [1, 1, 0];
        }
    };

    const calcAlpha0 = (code: number): number => {
        const [ca, cb, cc] = getHorizCoeffs(code);
        let val = (ca * Math.pow(lambdaL, cb)) / Math.pow(Fr, cc);
        if (val < lambdaL) val = lambdaL; // Constraint
        if (val > 1) val = 1;
        return val;
    };

    let alpha0 = 0;
    if (regimeCode === 1) {
        // Transition: Weighted Average
        const alpha_seg = calcAlpha0(0);
        const alpha_int = calcAlpha0(2);
        const A_weight = (L3 - Fr) / (L3 - L2);
        alpha0 = A_weight * alpha_seg + (1 - A_weight) * alpha_int;
    } else {
        alpha0 = calcAlpha0(regimeCode);
    }

    // 4. Inclination Correction factor Psi -> C
    // Inclination Check
    // Angle theta. 
    // If elevation_m != 0, we have inclination.
    // Standard B&B calculates C for ALL inclined flow, uphill OR downhill.
    // Exception: Distributed Flow (Regime 3) has C=0 (No correction).

    const sigma = inputs.surfaceTension_N_m || 0.072;
    const Nlv = Vsl * Math.pow(rhoL / (CONSTANTS.g * sigma), 0.25);

    let C = 0;
    if (regimeCode !== 3 && elevation_m !== 0) {
        // Determine Uphill/Downhill
        // elevation_m > 0 => Uphill (Outlet higher than Inlet).
        const isUphill = elevation_m > 0;

        const getIncCoeffs = (code: number, uphill: boolean) => {
            if (uphill) {
                switch (code) {
                    case 0: return [0.011, -3.768, 3.539, -1.614]; // Segregated Uphill
                    case 2: return [2.96, 0.305, -0.4473, 0.0978]; // Intermittent Uphill
                    default: return [0, 0, 0, 0];
                }
            } else {
                // Downhill: Check if Regime 0 or 2 (Beggs does not correct Distributed)
                // Coefficients for Downhill Segregated: 4.70, -0.3692, 0.1244, -0.5056
                return [4.70, -0.3692, 0.1244, -0.5056];
            }
        };

        const calcC = (code: number) => {
            const [cd, ce, cf, cg] = getIncCoeffs(code, isUphill);
            // C = (1 - lambdaL) * ln( d * lambdaL^e * Nlv^f * Fr^g )
            const term = cd * Math.pow(lambdaL, ce) * Math.pow(Nlv, cf) * Math.pow(Fr, cg);
            if (term <= 1e-9) return 0; // Log protection
            return (1 - lambdaL) * Math.log(term);
        };

        if (regimeCode === 1) {
            // Transition C
            const C_seg = calcC(0);
            const C_int = calcC(2); // Note: For downhill, coeffs same, but formula applied to code 2
            const A_weight = (L3 - Fr) / (L3 - L2);
            C = A_weight * C_seg + (1 - A_weight) * C_int;
        } else {
            C = calcC(regimeCode);
        }
    }

    // Calculate Psi
    // Psi = 1 + C * [ sin(1.8 Theta) - 0.333 sin^3(1.8 Theta) ]
    let sinTheta = elevation_m / length_m;
    if (Math.abs(sinTheta) > 1) sinTheta = Math.sign(sinTheta);
    const theta_rad = Math.asin(sinTheta); // Angle from horizontal
    // Note: B&B uses theta as angle from horizontal. Uphill > 0. Correct.

    const termPsi = Math.sin(1.8 * theta_rad) - 0.333 * Math.pow(Math.sin(1.8 * theta_rad), 3);
    const Psi = 1 + C * termPsi;

    let alpha = alpha0 * Psi;
    // Constraint 0.0001 < alpha < 0.9999
    if (alpha < 0.0001) alpha = 0.0001;
    if (alpha > 0.9999) alpha = 0.9999;

    // 5. Friction Factor (Two-Phase)
    // f_tp = f_ns * e^S
    // rho_ns, mu_ns
    const rho_ns = rhoL * lambdaL + rhoG * (1 - lambdaL);
    const mu_ns = muL * lambdaL + muG * (1 - lambdaL);
    const Re_ns = (rho_ns * Vm * innerDiameter_m) / mu_ns;

    const relRough = roughness_m / innerDiameter_m;
    const f_ns = solveColebrook(Re_ns, relRough);

    // S factor
    // y = lambdaL / alpha^2
    const y = lambdaL / (alpha * alpha);

    let S = 0;
    // Check range
    // If 1 < y < 1.2
    if (y > 1 && y < 1.2) {
        S = Math.log(2.2 * y - 1.2);
    } else {
        // formula: S = ln(y) / ( -0.0523 + 3.182 ln(y) - 0.8725 ln(y)^2 + 0.01853 ln(y)^4 )
        const lny = Math.log(y);
        if (Math.abs(lny) < 1e-9) S = 0;
        else {
            const denom = -0.0523 + 3.182 * lny - 0.8725 * lny * lny + 0.01853 * Math.pow(lny, 4);
            S = lny / denom;
        }
    }

    const f_tp = f_ns * Math.exp(S);

    // 6. Gradients
    // Elevation: rho_mix_slip (Holdup dependant)
    const rho_mix_slip = rhoL * alpha + rhoG * (1 - alpha);
    // dP/dL_elev = rho_slip * g * sinTheta
    const dp_z_total = rho_mix_slip * CONSTANTS.g * elevation_m; // (rho g sinTheta) * L = rho g dZ

    // Friction: B&B uses rho_ns for friction term definition
    // dP/dL_fric = f_tp * rho_ns * Vm^2 / 2D
    const dp_f_total = (f_tp * rho_ns * Vm * Vm / (2 * innerDiameter_m)) * length_m;

    const dp_total = dp_z_total + dp_f_total;
    const p_out = pressureIn_Pa - dp_total;

    // Warnings
    if (Fr > 300 && regime !== "Distributed") warnings.push("High Froude number suggests Mist Flow");
    if (alpha > 0.95 && lambdaL < 0.5) warnings.push("Liquid accumulation predicted");

    return {
        success: true,
        pressureOut_Pa: p_out,
        pressureDrop_Pa: dp_total,
        velocity_m_s: Vm,
        reynolds: Re_ns,
        frictionFactor: f_tp,
        flowRegime: regime,
        liquidHoldup: alpha,
        superficialVelGas_m_s: Vsg,
        superficialVelLiq_m_s: Vsl,
        mixtureDensity_kgm3: rho_mix_slip,
        mixtureViscosity_Pas: mu_ns,
        dp_friction_Pa: dp_f_total,
        dp_elevation_Pa: dp_z_total,
        dp_acceleration_Pa: 0,
        warnings
    };
};
