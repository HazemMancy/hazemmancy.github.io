export const CONSTANTS = {
    g: 9.80665,        // Gravity (m/s²)
    R_universal: 8314.462618, // J/(kmol·K)
    patm: 101325,      // Pa
};

export interface HydraulicInputs {
    // Geometry
    length_m: number;
    elevation_m: number; // positive = outlet is higher (pressure loss due to gravity)
    innerDiameter_m: number;
    roughness_m: number;

    // Flow
    massFlow_kg_s: number; // Total Mass Flow
    gasMassFlow_kg_s?: number;
    liquidMassFlow_kg_s?: number;

    // Operating Conditions (Inlet)
    pressureIn_Pa: number; // Absolute
    temperature_K: number;

    // Liquid Properties
    density_kgm3?: number;
    viscosity_Pas?: number;

    // Gas Properties (Single Phase Gas)
    gasMw_kgkmol?: number;
    gasZ?: number;
    gasViscosity_Pas?: number;
    gasK?: number; // Cp/Cv

    // Multiphase Properties
    liquidDensity_kgm3?: number;
    liquidViscosity_Pas?: number;
    gasDensity_kgm3?: number;
    surfaceTension_N_m?: number;
}

export interface HydraulicResult {
    success: boolean;
    pressureOut_Pa: number;
    pressureDrop_Pa: number;

    // Components of dP
    dp_friction_Pa: number;
    dp_elevation_Pa: number;
    dp_acceleration_Pa: number;

    velocity_m_s: number; // Mixture velocity for multiphase
    reynolds: number;
    frictionFactor: number;
    flowRegime: string;

    // Diagnostics
    machNumber?: number;
    liquidHoldup?: number; // Alpha
    mixtureDensity_kgm3?: number;
    mixtureViscosity_Pas?: number;
    superficialVelGas_m_s?: number;
    superficialVelLiq_m_s?: number;

    warnings: string[];
}

export const unitConversions = {
    // Length
    ft_to_m: 0.3048,
    in_to_m: 0.0254,

    // Pressure
    psi_to_pa: 6894.76,
    bar_to_pa: 100000,

    // Density
    lb_ft3_to_kg_m3: 16.0185,

    // Viscosity
    cp_to_pas: 0.001,
};
