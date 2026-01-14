/**
 * src/lib/physics/singlePhase.ts
 * Single-Phase Engineering Models
 */

import { CONSTANTS, HydraulicInputs, HydraulicResult } from "./types";

/**
 * Newton-Raphson solver for Colebrook-White equation.
 * 1/sqrt(f) = -2 * log10( (e/D)/3.7 + 2.51 / (Re * sqrt(f)) )
 */
export const solveColebrook = (Re: number, relativeRoughness: number): number => {
    if (Re < 2000) {
        return Re > 0 ? 64 / Re : 0; // Laminar flow
    }
    if (relativeRoughness < 0) relativeRoughness = 0;

    // Initial guess: Haaland approximation
    // 1/sqrt(f) = -1.8 * log10( (e/D/3.7)^1.11 + 6.9/Re )
    const term = Math.pow(relativeRoughness / 3.7, 1.11) + 6.9 / Re;
    let invSqrtF = -1.8 * Math.log10(term);
    let f = 1 / (invSqrtF * invSqrtF);

    // Newton-Raphson iteration
    for (let i = 0; i < 20; i++) {
        if (f <= 0) f = 0.001; // Guard
        invSqrtF = 1 / Math.sqrt(f);
        // Derivative dg/df is complex, simpler to iterate on x = 1/sqrt(f)
        const f_next = Math.pow(-2 * Math.log10(relativeRoughness / 3.7 + 2.51 / (Re * Math.sqrt(f))), -2);

        if (Math.abs(f_next - f) < 1e-6) {
            return f_next;
        }
        f = f_next;
    }
    return f;
};

/**
 * Calculate Liquid Pressure Drop (Darcy-Weisbach + Elevation)
 */
export const calcLiquidPressureDrop = (inputs: HydraulicInputs): HydraulicResult => {
    const {
        massFlow_kg_s, innerDiameter_m, length_m, elevation_m, roughness_m,
        density_kgm3, viscosity_Pas, pressureIn_Pa
    } = inputs;

    const warnings: string[] = [];

    // Validation
    if (!density_kgm3 || density_kgm3 <= 0) throw new Error("Liquid density required");
    if (!viscosity_Pas || viscosity_Pas <= 0) throw new Error("Liquid viscosity required");
    if (innerDiameter_m <= 0) throw new Error("Diameter must be positive");

    const area = Math.PI * Math.pow(innerDiameter_m, 2) / 4;
    const velocity = massFlow_kg_s / (density_kgm3 * area);
    const Re = (density_kgm3 * velocity * innerDiameter_m) / viscosity_Pas;
    const relRough = roughness_m / innerDiameter_m;
    const f = solveColebrook(Re, relRough);

    // Darcy-Weisbach: dP_f = f * (L/D) * (rho * v^2 / 2)
    const dp_friction_Pa = f * (length_m / innerDiameter_m) * (density_kgm3 * Math.pow(velocity, 2) / 2);

    // Elevation Head: dP_z = rho * g * delta_z
    // Convention: elevation_m is z_out - z_in.
    // If z_out > z_in (uphill), Pressure Loss is Positive.
    const dp_elevation_Pa = density_kgm3 * CONSTANTS.g * elevation_m;

    // Total DP
    const total_dp = dp_friction_Pa + dp_elevation_Pa;
    const p_out = pressureIn_Pa - total_dp;

    // Warnings
    if (velocity > 4.5) warnings.push("Velocity exceeds typical liquid limit (4.5 m/s)");
    if (p_out < 0) warnings.push("Negative outlet pressure likely - Vacuum condition");

    return {
        success: true,
        pressureOut_Pa: p_out,
        pressureDrop_Pa: total_dp,
        velocity_m_s: velocity,
        reynolds: Re,
        frictionFactor: f,
        flowRegime: Re < 2000 ? "Laminar" : Re > 4000 ? "Turbulent" : "Transition",
        dp_friction_Pa,
        dp_elevation_Pa,
        dp_acceleration_Pa: 0,
        warnings
    };
};

/**
 * Calculate Gas Pressure Drop (General Fundamental Flow Equation - Integrated)
 * Reference: GPSA Engineering Data Book
 * P1^2 - e^S P2^2 = ( ... )
 */
export const calcGasPressureDrop = (inputs: HydraulicInputs): HydraulicResult => {
    const {
        massFlow_kg_s, innerDiameter_m, length_m, elevation_m, roughness_m,
        gasMw_kgkmol, gasViscosity_Pas, pressureIn_Pa, temperature_K, gasZ, gasK
    } = inputs;

    const warnings: string[] = [];

    // Validate gas props
    if (!gasMw_kgkmol || gasMw_kgkmol <= 0) throw new Error("Gas MW required");
    const Z = gasZ || 1.0;
    const visc = gasViscosity_Pas || 1.5e-5;
    const k = gasK || 1.3;
    const area = Math.PI * Math.pow(innerDiameter_m, 2) / 4;

    // 1. Calculate Average Conditions (Approximate for Re)
    // We assume P_avg approx P_in for initial f
    const rho_in = (pressureIn_Pa * gasMw_kgkmol) / (Z * CONSTANTS.R_universal * temperature_K);
    const v_in = massFlow_kg_s / (rho_in * area); // Velocity
    const Re = (rho_in * v_in * innerDiameter_m) / visc; // Mass flux Re is constant along pipe: 4*m_dot / (pi * D * mu)
    const relRough = roughness_m / innerDiameter_m;
    const f = solveColebrook(Re, relRough);

    // 2. Fundamental Equation
    // Term: C_flow = (f L / D) * (Z R T / MW) * (m_dot/A)^2
    // Integrated Elevation Term S_exp = 2 * g * dz * MW / ZRT

    const specific_gas_const = CONSTANTS.R_universal / gasMw_kgkmol; // J/kgK
    const velocity_head_term = Math.pow(massFlow_kg_s / area, 2); // (kg/s / m2)^2

    const FrictionTerm = (f * length_m / innerDiameter_m) * (Z * specific_gas_const * temperature_K) * velocity_head_term;

    let P_out_sq = 0;

    // Elevation Exponent S_2 = 2 * S_parameter
    const S_2 = 2 * (gasMw_kgkmol * CONSTANTS.g * elevation_m) / (Z * CONSTANTS.R_universal * temperature_K);

    if (Math.abs(S_2) < 1e-6) {
        // Horizontal
        // P1^2 - P2^2 = FrictionTerm
        P_out_sq = Math.pow(pressureIn_Pa, 2) - FrictionTerm;
    } else {
        // Inclined
        // P_out^2 = [ P_in^2 * e^(-S2) ] - [ FrictionTerm * (1 - e^(-S2)) / S2 ]
        // Correct Standard Integration
        const term1 = Math.pow(pressureIn_Pa, 2) * Math.exp(-S_2);
        const term2 = FrictionTerm * (1 - Math.exp(-S_2)) / S_2;
        P_out_sq = term1 - term2;
    }

    if (P_out_sq <= 0) {
        return {
            success: false,
            pressureOut_Pa: 0,
            pressureDrop_Pa: pressureIn_Pa,
            velocity_m_s: 0,
            reynolds: Re,
            frictionFactor: f,
            flowRegime: "Choked/Vacuum",
            dp_friction_Pa: pressureIn_Pa,
            dp_elevation_Pa: 0,
            dp_acceleration_Pa: 0,
            warnings: ["Pressure drop too high - potential vacuum or choked flow"]
        };
    }

    const P_out = Math.sqrt(P_out_sq);

    // Calculate final metrics
    const rho_out = (P_out * gasMw_kgkmol) / (Z * CONSTANTS.R_universal * temperature_K);
    const v_out = massFlow_kg_s / (rho_out * area);

    const c_sound = Math.sqrt(k * Z * specific_gas_const * temperature_K);
    const mach = v_out / c_sound;

    if (mach > 1.0) warnings.push("Mach > 1.0: Flow is choked");
    if (mach > 0.3) warnings.push("Mach > 0.3: Compressibility effects significant");

    // Breakdown (Approximate linear contrib for display)
    const total_dp = pressureIn_Pa - P_out;
    const P_arith = (pressureIn_Pa + P_out) / 2;
    const dp_f_approx = FrictionTerm / (2 * P_arith);
    const dp_e_approx = total_dp - dp_f_approx;

    return {
        success: true,
        pressureOut_Pa: P_out,
        pressureDrop_Pa: total_dp,
        velocity_m_s: v_out,
        reynolds: Re,
        frictionFactor: f,
        flowRegime: "Turbulent",
        machNumber: mach,
        dp_friction_Pa: dp_f_approx,
        dp_elevation_Pa: dp_e_approx,
        dp_acceleration_Pa: 0, // Inherent in compressible eq
        warnings
    };
};
