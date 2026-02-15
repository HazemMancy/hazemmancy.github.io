export const GAS_CONSTANT = 8314.46; // J/(kmol·K)
export const STANDARD_TEMPERATURE = 288.15; // K (15°C)
export const STANDARD_PRESSURE = 101325; // Pa (1 atm)
export const GRAVITY = 9.80665; // m/s²
export const PI = Math.PI;

export const PIPE_SCHEDULES: Record<string, Record<string, number>> = {
  "STD": {
    "2": 0.04925,
    "3": 0.07391,
    "4": 0.10226,
    "6": 0.15405,
    "8": 0.20272,
    "10": 0.25448,
    "12": 0.30480,
    "14": 0.33325,
    "16": 0.38100,
    "18": 0.42863,
    "20": 0.47788,
    "24": 0.57468,
  },
};

export const PIPE_ROUGHNESS: Record<string, number> = {
  "Carbon Steel": 0.0000457,
  "Stainless Steel": 0.0000152,
  "Commercial Steel": 0.0000457,
  "Drawn Tubing": 0.0000015,
  "Galvanized Iron": 0.000152,
  "Cast Iron": 0.000259,
  "Concrete": 0.001524,
  "PVC/HDPE": 0.0000015,
};

export const GAS_SPECIFIC_HEAT_RATIO: Record<string, number> = {
  "Methane": 1.31,
  "Ethane": 1.19,
  "Propane": 1.13,
  "Natural Gas (typical)": 1.27,
  "Air": 1.40,
  "Nitrogen": 1.40,
  "CO2": 1.29,
  "Hydrogen": 1.41,
};

export const COMMON_GASES: Record<string, { mw: number; gamma: number }> = {
  "Methane (CH4)": { mw: 16.04, gamma: 1.31 },
  "Ethane (C2H6)": { mw: 30.07, gamma: 1.19 },
  "Propane (C3H8)": { mw: 44.10, gamma: 1.13 },
  "n-Butane (C4H10)": { mw: 58.12, gamma: 1.09 },
  "Nitrogen (N2)": { mw: 28.01, gamma: 1.40 },
  "Carbon Dioxide (CO2)": { mw: 44.01, gamma: 1.29 },
  "Hydrogen Sulfide (H2S)": { mw: 34.08, gamma: 1.32 },
  "Hydrogen (H2)": { mw: 2.016, gamma: 1.41 },
  "Oxygen (O2)": { mw: 32.00, gamma: 1.40 },
  "Water Vapor (H2O)": { mw: 18.015, gamma: 1.33 },
};

export const VELOCITY_LIMITS = {
  gas: { min: 3, max: 25, warning: 20 },
  liquid: { min: 0.5, max: 5, warning: 3 },
  multiphase: { min: 1, max: 15, warning: 10 },
};

export const MACH_LIMIT = 0.3;
export const RHO_V2_LIMIT = 6000; // kg/(m·s²) for AIV/FIV screening

export const COMMON_LIQUIDS: Record<string, { density: number; viscosity: number; vaporPressure: number }> = {
  "Water (20°C)": { density: 998.2, viscosity: 1.002, vaporPressure: 2.338 },
  "Water (40°C)": { density: 992.2, viscosity: 0.653, vaporPressure: 7.384 },
  "Water (60°C)": { density: 983.2, viscosity: 0.467, vaporPressure: 19.94 },
  "Water (80°C)": { density: 971.8, viscosity: 0.355, vaporPressure: 47.39 },
  "Crude Oil (light)": { density: 850, viscosity: 5.0, vaporPressure: 30 },
  "Crude Oil (medium)": { density: 900, viscosity: 15.0, vaporPressure: 20 },
  "Crude Oil (heavy)": { density: 950, viscosity: 50.0, vaporPressure: 10 },
  "Diesel": { density: 832, viscosity: 3.0, vaporPressure: 0.3 },
  "Gasoline": { density: 737, viscosity: 0.6, vaporPressure: 55 },
  "MEG (Mono Ethylene Glycol)": { density: 1113, viscosity: 16.1, vaporPressure: 0.012 },
  "DEG (Diethylene Glycol)": { density: 1118, viscosity: 30.0, vaporPressure: 0.001 },
  "Methanol": { density: 791, viscosity: 0.544, vaporPressure: 12.98 },
  "Seawater": { density: 1025, viscosity: 1.08, vaporPressure: 2.338 },
};

export const FITTING_K_VALUES: Record<string, number> = {
  "90° Elbow (standard)": 0.75,
  "90° Elbow (long radius)": 0.45,
  "45° Elbow": 0.35,
  "Tee (through run)": 0.40,
  "Tee (through branch)": 1.50,
  "Gate Valve (fully open)": 0.17,
  "Globe Valve (fully open)": 6.0,
  "Check Valve (swing)": 2.0,
  "Check Valve (lift)": 10.0,
  "Ball Valve (fully open)": 0.05,
  "Butterfly Valve (fully open)": 0.25,
  "Strainer (Y-type)": 2.0,
  "Entrance (sharp-edged)": 0.50,
  "Entrance (well-rounded)": 0.04,
  "Exit (pipe to tank)": 1.00,
  "Reducer": 0.15,
  "Expander": 0.30,
};
