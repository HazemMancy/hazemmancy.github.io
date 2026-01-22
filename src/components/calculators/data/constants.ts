// API RP 14E Gas Service Criteria
export const GAS_SERVICE_CRITERIA = [
    { service: "Continuous", pressureRange: "Vacuum", pressureDropBarKm: null, velocityMs: 60, rhoV2Limit: null, machLimit: null, cValue: null, note: "ΔP = 10% Pop" },
    { service: "Continuous", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.5, velocityMs: 50, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Continuous", pressureRange: "2 to 7 barg", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Continuous", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.5, velocityMs: null, rhoV2Limit: 15000, machLimit: null, cValue: null },
    { service: "Continuous", pressureRange: "35 to 140 barg", pressureDropBarKm: 3.0, velocityMs: null, rhoV2Limit: 20000, machLimit: null, cValue: null },
    { service: "Continuous", pressureRange: "Above 140 barg", pressureDropBarKm: 5.0, velocityMs: null, rhoV2Limit: 25000, machLimit: null, cValue: null },

    // Compressor suction
    { service: "Compressor Suction", pressureRange: "Vacuum", pressureDropBarKm: 0.05, velocityMs: 35, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Compressor Suction", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.15, velocityMs: 30, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Compressor Suction", pressureRange: "2 to 7 barg", pressureDropBarKm: 0.4, velocityMs: 25, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Compressor Suction", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.0, velocityMs: null, rhoV2Limit: 6000, machLimit: null, cValue: null },
    { service: "Compressor Suction", pressureRange: "Above 35 barg", pressureDropBarKm: 2.0, velocityMs: null, rhoV2Limit: 15000, machLimit: null, cValue: null },

    // Column Overhead
    { service: "Column Overhead to Condenser", pressureRange: "Vacuum", pressureDropBarKm: 0.05, velocityMs: 35, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Column Overhead to Condenser", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.15, velocityMs: 30, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Column Overhead to Condenser", pressureRange: "2 to 7 barg", pressureDropBarKm: 0.4, velocityMs: 25, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Column Overhead to Condenser", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.0, velocityMs: null, rhoV2Limit: 6000, machLimit: null, cValue: null },
    { service: "Column Overhead to Condenser", pressureRange: "Above 35 barg", pressureDropBarKm: 2.0, velocityMs: null, rhoV2Limit: 15000, machLimit: null, cValue: null },

    // Kettle Reboiler
    { service: "Kettle Reboiler Return", pressureRange: "Vacuum", pressureDropBarKm: 0.05, velocityMs: 35, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Kettle Reboiler Return", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.15, velocityMs: 30, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Kettle Reboiler Return", pressureRange: "2 to 7 barg", pressureDropBarKm: 0.4, velocityMs: 25, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Kettle Reboiler Return", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.0, velocityMs: null, rhoV2Limit: 6000, machLimit: null, cValue: null },
    { service: "Kettle Reboiler Return", pressureRange: "Above 35 barg", pressureDropBarKm: 2.0, velocityMs: null, rhoV2Limit: 15000, machLimit: null, cValue: null },

    // Discontinuous
    { service: "Discontinuous", pressureRange: "Below 35 barg", pressureDropBarKm: null, velocityMs: 60, rhoV2Limit: 15000, machLimit: null, cValue: null },
    { service: "Discontinuous", pressureRange: "35 barg and above", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: 25000, machLimit: null, cValue: null },

    // Flare
    { service: "Flare - Upstream PSV", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: null, machLimit: null, cValue: null, note: "ΔP < 3% PRV set" },
    { service: "Flare - Upstream BDV", pressureRange: "All", pressureDropBarKm: null, velocityMs: 60, rhoV2Limit: 30000, machLimit: null, cValue: null },
    { service: "Flare Tail Pipe", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: null, machLimit: 0.7, cValue: null },
    { service: "Flare Tail Pipe (Legacy)", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: null, machLimit: 1.0, cValue: null, note: "Downstream BDV" },
    { service: "Flare Header", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: null, machLimit: 0.5, cValue: null },

    // Steam
    { service: "Steam (Superheated 150#)", pressureRange: "All", pressureDropBarKm: 2.0, velocityMs: 45, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Superheated 300#)", pressureRange: "All", pressureDropBarKm: 3.0, velocityMs: 60, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Superheated 600#)", pressureRange: "All", pressureDropBarKm: 6.0, velocityMs: 60, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Superheated >=900#)", pressureRange: "All", pressureDropBarKm: 8.0, velocityMs: 70, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Saturated 150#)", pressureRange: "All", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Saturated 300#)", pressureRange: "All", pressureDropBarKm: 3.0, velocityMs: 35, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Saturated 600#)", pressureRange: "All", pressureDropBarKm: 6.0, velocityMs: 30, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Long Headers 150#)", pressureRange: "All", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Long Headers 300#)", pressureRange: "All", pressureDropBarKm: 1.5, velocityMs: 45, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Steam (Long Headers 600#)", pressureRange: "All", pressureDropBarKm: 2.0, velocityMs: 45, rhoV2Limit: null, machLimit: null, cValue: null },

    // Fuel Gas
    { service: "Fuel Gas", pressureRange: "Vacuum", pressureDropBarKm: null, velocityMs: 60, rhoV2Limit: null, machLimit: null, cValue: null, note: "ΔP = 10% Pop" },
    { service: "Fuel Gas", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.5, velocityMs: 50, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Fuel Gas", pressureRange: "2 to 7 barg", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2Limit: null, machLimit: null, cValue: null },
    { service: "Fuel Gas", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.5, velocityMs: null, rhoV2Limit: 15000, machLimit: null, cValue: null },
    { service: "Fuel Gas", pressureRange: "35 to 140 barg", pressureDropBarKm: 3.0, velocityMs: null, rhoV2Limit: 20000, machLimit: null, cValue: null },
    { service: "Fuel Gas", pressureRange: "Above 140 barg", pressureDropBarKm: 5.0, velocityMs: null, rhoV2Limit: 25000, machLimit: null, cValue: null },
];

// API RP 14E Liquid Service Criteria
export const LIQUID_SERVICE_CRITERIA = [
    { service: "Gravity Flow", pressureDropBarKm: null, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
    { service: "Pump Suction (Boiling Point)", pressureDropBarKm: 0.5, velocity: { size2: 0.6, size3to6: 0.9, size8to12: 1.3, size14to18: 1.8, size20plus: 2.2 } },
    { service: "Pump Suction (Sub-cooled)", pressureDropBarKm: 1.0, velocity: { size2: 0.7, size3to6: 1.2, size8to12: 1.6, size14to18: 2.1, size20plus: 2.6 } },
    { service: "Pump Discharge (Pop < 35 barg)", pressureDropBarKm: 4.5, velocity: { size2: 1.4, size3to6: 1.9, size8to12: 3.1, size14to18: 4.1, size20plus: 5.0 } },
    { service: "Pump Discharge (Pop > 35 barg)", pressureDropBarKm: 6.0, velocity: { size2: 1.5, size3to6: 2.0, size8to12: 3.5, size14to18: 4.6, size20plus: 5.0 } },
    { service: "Condenser Out (Pop < 10 barg)", pressureDropBarKm: null, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
    { service: "Condenser Out (Pop > 10 barg)", pressureDropBarKm: 0.5, velocity: { size2: 0.6, size3to6: 0.9, size8to12: 1.3, size14to18: 1.8, size20plus: 2.2 } },
    { service: "Cooling Water", pressureDropBarKm: null, velocity: { size2: 3.5, size3to6: 3.5, size8to12: 3.5, size14to18: 3.5, size20plus: 3.5 } },
    { service: "Liquid Sulphur", pressureDropBarKm: null, velocity: { size2: 1.8, size3to6: 1.8, size8to12: 1.8, size14to18: 1.8, size20plus: 1.8 } },
];

// Mixed-phase: API RP 14E (Table 8.3.1.1)
export const MIXED_PHASE_SERVICE_CRITERIA = [
    { service: "Continuous (P < 7 barg)", rhoV2Limit: 6000, machLimit: null, cValue: null },
    { service: "Continuous (P > 7 barg)", rhoV2Limit: 15000, machLimit: null, cValue: null },
    { service: "Discontinuous", rhoV2Limit: 15000, machLimit: null, cValue: null },
    { service: "Erosive Fluid (Continuous)", rhoV2Limit: 3750, machLimit: null, cValue: null },
    { service: "Erosive Fluid (Discontinuous)", rhoV2Limit: 6000, machLimit: null, cValue: null },
    { service: "Partial Condenser Outlet", rhoV2Limit: 6000, machLimit: null, cValue: null },
    { service: "Reboiler Return (Natural Circulation)", rhoV2Limit: 1500, machLimit: null, cValue: null },
    { service: "Flare Tail Pipe (Liquids)", rhoV2Limit: 50000, machLimit: 0.25, cValue: null, note: "Mach < 0.25" },
    { service: "Flare Header (Liquids)", rhoV2Limit: 50000, machLimit: 0.25, cValue: null, note: "Mach < 0.25" },
];

// Pipe roughness per ASME/ANSI/API standards (in mm)
export const PIPE_ROUGHNESS: Record<string, number> = {
    "Carbon Steel (New)": 0.0457,
    "Carbon Steel (Corroded)": 0.15,
    "Carbon Steel (Severely Corroded)": 0.9,
    "Stainless Steel": 0.015,
    "Duplex Stainless Steel": 0.015,
    "Cast Iron": 0.26,
    "Ductile Iron (Cement Lined)": 0.025,
    "Galvanized Steel": 0.15,
    "Chrome-Moly Steel": 0.0457,
    "Copper/Copper-Nickel": 0.0015,
    "PVC/CPVC": 0.0015,
    "HDPE": 0.007,
    "Fiberglass (FRP/GRE)": 0.005,
    "Concrete": 1.0,
    "Lined Steel (Epoxy)": 0.006,
    "Lined Steel (Rubber)": 0.025,
    "Custom": 0,
};

// ASME B36.10M/B36.19M Pipe Schedule Data
export const PIPE_SCHEDULE_DATA: Record<string, Record<string, number>> = {
    "1/2": {
        "5s": 18.04, "10s": 17.12, "10": 17.12, "40s": 15.80, "STD": 15.80, "40": 15.80,
        "80s": 13.87, "XS": 13.87, "80": 13.87, "160": 11.74, "XXS": 6.35
    },
    "3/4": {
        "5s": 23.37, "10s": 22.45, "10": 22.45, "40s": 20.93, "STD": 20.93, "40": 20.93,
        "80s": 18.85, "XS": 18.85, "80": 18.85, "160": 15.54, "XXS": 11.07
    },
    "1": {
        "5s": 29.51, "10s": 27.86, "10": 27.86, "40s": 26.64, "STD": 26.64, "40": 26.64,
        "80s": 24.31, "XS": 24.31, "80": 24.31, "160": 20.70, "XXS": 15.22
    },
    "1-1/4": {
        "5s": 38.14, "10s": 36.63, "10": 36.63, "40s": 35.05, "STD": 35.05, "40": 35.05,
        "80s": 32.46, "XS": 32.46, "80": 32.46, "160": 29.46, "XXS": 22.76
    },
    "1-1/2": {
        "5s": 44.20, "10s": 42.72, "10": 42.72, "40s": 40.89, "STD": 40.89, "40": 40.89,
        "80s": 38.10, "XS": 38.10, "80": 38.10, "160": 33.98, "XXS": 27.94
    },
    "2": {
        "5s": 56.26, "10s": 54.79, "10": 54.79, "40s": 52.50, "STD": 52.50, "40": 52.50,
        "80s": 49.25, "XS": 49.25, "80": 49.25, "160": 42.90, "XXS": 38.16
    },
    "2-1/2": {
        "5s": 68.78, "10s": 66.90, "10": 66.90, "40s": 62.71, "STD": 62.71, "40": 62.71,
        "80s": 59.00, "XS": 59.00, "80": 59.00, "160": 53.98, "XXS": 44.96
    },
    "3": {
        "5s": 84.68, "10s": 82.80, "10": 82.80, "40s": 77.93, "STD": 77.93, "40": 77.93,
        "80s": 73.66, "XS": 73.66, "80": 73.66, "160": 66.64, "XXS": 58.42
    },
    "4": {
        "5s": 110.08, "10s": 108.20, "10": 108.20, "40s": 102.26, "STD": 102.26, "40": 102.26,
        "80s": 97.18, "XS": 97.18, "80": 97.18, "120": 92.04, "160": 87.32, "XXS": 80.06
    },
    "6": {
        "5s": 164.66, "10s": 162.74, "10": 162.74, "40s": 154.05, "STD": 154.05, "40": 154.05,
        "80s": 146.33, "XS": 146.33, "80": 146.33, "120": 139.70, "160": 131.78, "XXS": 124.38
    },
    "8": {
        "5s": 216.66, "10s": 214.96, "10": 214.96, "20": 209.55, "30": 206.38,
        "40s": 205.00, "STD": 202.72, "40": 202.72, "60": 196.85,
        "80s": 196.85, "XS": 193.68, "80": 193.68, "100": 186.96, "120": 180.98, "140": 177.80, "160": 173.99, "XXS": 174.64
    },
    "10": {
        "5s": 271.02, "10s": 268.92, "10": 268.92, "20": 262.76, "30": 257.48,
        "40s": 260.35, "STD": 254.51, "40": 254.51, "60": 247.65,
        "80s": 254.51, "XS": 247.65, "80": 242.87, "100": 236.52, "120": 230.18, "140": 225.42, "160": 222.25, "XXS": 222.25
    },
    "12": {
        "5s": 323.85, "10s": 320.42, "10": 320.42, "20": 314.66, "30": 307.09,
        "40s": 315.88, "STD": 303.23, "40": 303.23, "60": 295.30,
        "80s": 311.15, "XS": 298.45, "80": 288.90, "100": 280.92, "120": 273.05, "140": 266.70, "160": 264.67, "XXS": 264.67
    },
    "14": {
        "5s": 350.50, "10s": 347.68, "10": 347.68, "20": 342.90, "30": 339.76,
        "STD": 347.68, "40": 336.54, "60": 330.20,
        "XS": 339.76, "80": 323.88, "100": 317.50, "120": 311.18, "140": 304.80, "160": 290.58
    },
    "16": {
        "5s": 400.86, "10s": 398.02, "10": 398.02, "20": 393.70, "30": 387.36,
        "STD": 398.02, "40": 381.00, "60": 374.66,
        "XS": 387.36, "80": 363.52, "100": 354.08, "120": 344.48, "140": 336.54, "160": 333.34
    },
    "18": {
        "5s": 451.46, "10s": 448.62, "10": 448.62, "20": 444.30, "30": 434.72,
        "STD": 448.62, "40": 428.66, "60": 419.10,
        "XS": 434.72, "80": 409.58, "100": 398.02, "120": 387.36, "140": 381.00, "160": 376.94
    },
    "20": {
        "5s": 501.80, "10s": 498.44, "10": 498.44, "20": 490.96, "30": 482.60,
        "STD": 498.44, "40": 477.82, "60": 466.78,
        "XS": 482.60, "80": 455.62, "100": 444.30, "120": 431.80, "140": 419.10, "160": 419.10
    },
    "24": {
        "5s": 603.25, "10s": 598.42, "10": 598.42, "20": 590.04, "30": 581.66,
        "STD": 598.42, "40": 574.68, "60": 560.32,
        "XS": 581.66, "80": 547.68, "100": 530.10, "120": 514.35, "140": 504.82, "160": 498.44
    },
    "30": {
        "5s": 755.65, "10s": 749.30, "10": 749.30, "20": 736.60, "30": 723.90,
        "STD": 749.30, "XS": 736.60
    },
    "36": {
        "5s": 906.65, "10s": 898.52, "10": 898.52, "20": 882.90, "30": 869.95,
        "STD": 898.52, "40": 863.60, "XS": 882.90
    },
    "42": {
        "5s": 1057.91, "10s": 1047.75, "10": 1047.75, "20": 1031.88, "30": 1016.00,
        "STD": 1047.75, "XS": 1031.88
    },
    "48": {
        "5s": 1209.17, "10s": 1196.85, "10": 1196.85, "20": 1178.56, "30": 1162.05,
        "STD": 1196.85, "XS": 1178.56
    },
};

// Flow unit definitions
export const STANDARD_GAS_UNITS = ["Nm³/h", "Sm³/h", "SCFM", "MMSCFD", "MSCFD"];
export const ACTUAL_GAS_UNITS = ["m³/h", "m³/s", "Am³/h"];

// Gas properties at standard conditions
export const STANDARD_CONDITIONS = {
    Nm3: { pressure: 101.325, temperature: 273.15 }, // 0°C, 101.325 kPa
    Sm3: { pressure: 101.325, temperature: 288.15 }, // 15°C, 101.325 kPa
    SF6: { pressure: 101.325, temperature: 293.15 }, // Example, rarely used in this context
};


