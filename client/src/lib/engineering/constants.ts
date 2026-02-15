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
