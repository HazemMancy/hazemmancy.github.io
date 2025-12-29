/**
 * Fluid Properties Database
 * Temperature-dependent properties for common oil & gas fluids
 * 
 * Data sources:
 * - GPSA Engineering Data Book
 * - Perry's Chemical Engineers' Handbook
 * - NIST Chemistry WebBook
 * - API Technical Data Book
 */

export interface FluidProperties {
  density: number;        // kg/m³
  specificHeat: number;   // kJ/kg·K
  viscosity: number;      // cP
  thermalConductivity: number; // W/m·K
  prandtl: number;        // dimensionless
}

export interface FluidData {
  name: string;
  category: string;
  minTemp: number;  // °C
  maxTemp: number;  // °C
  // Coefficients for temperature-dependent properties
  // Property = A + B*T + C*T² + D*T³ (T in °C)
  density: { A: number; B: number; C: number; D: number };
  specificHeat: { A: number; B: number; C: number; D: number };
  viscosity: { A: number; B: number; C: number; D: number }; // Uses exp(A + B/T) for liquids
  thermalConductivity: { A: number; B: number; C: number; D: number };
}

// Fluid property database with polynomial coefficients
export const fluidDatabase: Record<string, FluidData> = {
  "water": {
    name: "Water",
    category: "Water/Steam",
    minTemp: 0,
    maxTemp: 200,
    density: { A: 1000.5, B: -0.0679, C: -0.00457, D: 0.0000075 },
    specificHeat: { A: 4.217, B: -0.00286, C: 0.0000578, D: -0.000000261 },
    viscosity: { A: 1.788, B: -0.0578, C: 0.0011, D: -0.0000085 },
    thermalConductivity: { A: 0.569, B: 0.00187, C: -0.0000073, D: 0 }
  },
  "seawater": {
    name: "Seawater (3.5% salinity)",
    category: "Water/Steam",
    minTemp: 0,
    maxTemp: 100,
    density: { A: 1028, B: -0.21, C: -0.003, D: 0 },
    specificHeat: { A: 3.993, B: -0.00051, C: 0, D: 0 },
    viscosity: { A: 1.88, B: -0.054, C: 0.00088, D: 0 },
    thermalConductivity: { A: 0.571, B: 0.00177, C: 0, D: 0 }
  },
  "crude-light": {
    name: "Light Crude Oil (API 35-40)",
    category: "Crude Oil",
    minTemp: 20,
    maxTemp: 300,
    density: { A: 850, B: -0.65, C: 0, D: 0 },
    specificHeat: { A: 1.92, B: 0.00365, C: 0, D: 0 },
    viscosity: { A: 8.5, B: -0.12, C: 0.0006, D: 0 },
    thermalConductivity: { A: 0.135, B: -0.00014, C: 0, D: 0 }
  },
  "crude-medium": {
    name: "Medium Crude Oil (API 25-35)",
    category: "Crude Oil",
    minTemp: 20,
    maxTemp: 300,
    density: { A: 890, B: -0.62, C: 0, D: 0 },
    specificHeat: { A: 1.88, B: 0.00385, C: 0, D: 0 },
    viscosity: { A: 25, B: -0.35, C: 0.0018, D: 0 },
    thermalConductivity: { A: 0.13, B: -0.00012, C: 0, D: 0 }
  },
  "crude-heavy": {
    name: "Heavy Crude Oil (API 15-25)",
    category: "Crude Oil",
    minTemp: 30,
    maxTemp: 300,
    density: { A: 950, B: -0.58, C: 0, D: 0 },
    specificHeat: { A: 1.84, B: 0.00405, C: 0, D: 0 },
    viscosity: { A: 150, B: -2.2, C: 0.012, D: 0 },
    thermalConductivity: { A: 0.125, B: -0.00010, C: 0, D: 0 }
  },
  "gasoline": {
    name: "Gasoline",
    category: "Light Hydrocarbons",
    minTemp: -40,
    maxTemp: 150,
    density: { A: 750, B: -0.85, C: 0, D: 0 },
    specificHeat: { A: 2.0, B: 0.0042, C: 0, D: 0 },
    viscosity: { A: 0.65, B: -0.012, C: 0.00008, D: 0 },
    thermalConductivity: { A: 0.14, B: -0.00018, C: 0, D: 0 }
  },
  "kerosene": {
    name: "Kerosene/Jet Fuel",
    category: "Light Hydrocarbons",
    minTemp: -50,
    maxTemp: 200,
    density: { A: 820, B: -0.72, C: 0, D: 0 },
    specificHeat: { A: 1.97, B: 0.004, C: 0, D: 0 },
    viscosity: { A: 2.2, B: -0.032, C: 0.00016, D: 0 },
    thermalConductivity: { A: 0.138, B: -0.00016, C: 0, D: 0 }
  },
  "diesel": {
    name: "Diesel Fuel",
    category: "Light Hydrocarbons",
    minTemp: -20,
    maxTemp: 250,
    density: { A: 850, B: -0.68, C: 0, D: 0 },
    specificHeat: { A: 1.95, B: 0.00395, C: 0, D: 0 },
    viscosity: { A: 4.5, B: -0.065, C: 0.00035, D: 0 },
    thermalConductivity: { A: 0.132, B: -0.00015, C: 0, D: 0 }
  },
  "naphtha": {
    name: "Naphtha",
    category: "Light Hydrocarbons",
    minTemp: -20,
    maxTemp: 150,
    density: { A: 720, B: -0.88, C: 0, D: 0 },
    specificHeat: { A: 2.05, B: 0.0044, C: 0, D: 0 },
    viscosity: { A: 0.55, B: -0.01, C: 0.00006, D: 0 },
    thermalConductivity: { A: 0.142, B: -0.0002, C: 0, D: 0 }
  },
  "fuel-oil": {
    name: "Fuel Oil (No. 6)",
    category: "Heavy Hydrocarbons",
    minTemp: 50,
    maxTemp: 300,
    density: { A: 980, B: -0.55, C: 0, D: 0 },
    specificHeat: { A: 1.75, B: 0.0042, C: 0, D: 0 },
    viscosity: { A: 300, B: -4.5, C: 0.025, D: 0 },
    thermalConductivity: { A: 0.12, B: -0.00008, C: 0, D: 0 }
  },
  "vgo": {
    name: "Vacuum Gas Oil (VGO)",
    category: "Heavy Hydrocarbons",
    minTemp: 100,
    maxTemp: 400,
    density: { A: 920, B: -0.6, C: 0, D: 0 },
    specificHeat: { A: 2.0, B: 0.0038, C: 0, D: 0 },
    viscosity: { A: 12, B: -0.16, C: 0.0008, D: 0 },
    thermalConductivity: { A: 0.125, B: -0.00012, C: 0, D: 0 }
  },
  "bitumen": {
    name: "Bitumen/Asphalt",
    category: "Heavy Hydrocarbons",
    minTemp: 100,
    maxTemp: 300,
    density: { A: 1050, B: -0.5, C: 0, D: 0 },
    specificHeat: { A: 1.65, B: 0.0045, C: 0, D: 0 },
    viscosity: { A: 5000, B: -80, C: 0.5, D: 0 },
    thermalConductivity: { A: 0.17, B: -0.00005, C: 0, D: 0 }
  },
  "methanol": {
    name: "Methanol",
    category: "Chemicals",
    minTemp: -90,
    maxTemp: 65,
    density: { A: 810, B: -0.92, C: 0, D: 0 },
    specificHeat: { A: 2.51, B: 0.0036, C: 0, D: 0 },
    viscosity: { A: 0.59, B: -0.011, C: 0.00007, D: 0 },
    thermalConductivity: { A: 0.203, B: -0.00024, C: 0, D: 0 }
  },
  "ethylene-glycol": {
    name: "Ethylene Glycol",
    category: "Chemicals",
    minTemp: -12,
    maxTemp: 200,
    density: { A: 1130, B: -0.65, C: 0, D: 0 },
    specificHeat: { A: 2.35, B: 0.003, C: 0, D: 0 },
    viscosity: { A: 20, B: -0.38, C: 0.0028, D: 0 },
    thermalConductivity: { A: 0.252, B: -0.0001, C: 0, D: 0 }
  },
  "glycol-50": {
    name: "50% Ethylene Glycol/Water",
    category: "Chemicals",
    minTemp: -35,
    maxTemp: 150,
    density: { A: 1075, B: -0.45, C: 0, D: 0 },
    specificHeat: { A: 3.28, B: 0.002, C: 0, D: 0 },
    viscosity: { A: 4.8, B: -0.11, C: 0.0009, D: 0 },
    thermalConductivity: { A: 0.38, B: 0.0006, C: 0, D: 0 }
  },
  "ammonia-liquid": {
    name: "Ammonia (Liquid)",
    category: "Refrigerants",
    minTemp: -40,
    maxTemp: 50,
    density: { A: 680, B: -1.2, C: 0, D: 0 },
    specificHeat: { A: 4.6, B: 0.0025, C: 0, D: 0 },
    viscosity: { A: 0.26, B: -0.004, C: 0.00002, D: 0 },
    thermalConductivity: { A: 0.54, B: -0.002, C: 0, D: 0 }
  },
  "propane-liquid": {
    name: "Propane (Liquid)",
    category: "Light Hydrocarbons",
    minTemp: -42,
    maxTemp: 96,
    density: { A: 580, B: -1.8, C: 0, D: 0 },
    specificHeat: { A: 2.4, B: 0.006, C: 0, D: 0 },
    viscosity: { A: 0.2, B: -0.003, C: 0.00002, D: 0 },
    thermalConductivity: { A: 0.11, B: -0.0003, C: 0, D: 0 }
  },
  "natural-gas": {
    name: "Natural Gas (High P, Liquid-like)",
    category: "Gases",
    minTemp: 0,
    maxTemp: 100,
    density: { A: 250, B: -1.5, C: 0.005, D: 0 },
    specificHeat: { A: 2.2, B: 0.003, C: 0, D: 0 },
    viscosity: { A: 0.015, B: -0.00008, C: 0, D: 0 },
    thermalConductivity: { A: 0.035, B: 0.00008, C: 0, D: 0 }
  },
  "hydrogen": {
    name: "Hydrogen Gas",
    category: "Gases",
    minTemp: 0,
    maxTemp: 300,
    density: { A: 0.09, B: -0.0003, C: 0, D: 0 },
    specificHeat: { A: 14.3, B: 0.0003, C: 0, D: 0 },
    viscosity: { A: 0.009, B: 0.00002, C: 0, D: 0 },
    thermalConductivity: { A: 0.172, B: 0.00048, C: 0, D: 0 }
  },
  "steam-low": {
    name: "Steam (Low Pressure)",
    category: "Water/Steam",
    minTemp: 100,
    maxTemp: 300,
    density: { A: 0.6, B: -0.0018, C: 0.000003, D: 0 },
    specificHeat: { A: 1.87, B: 0.0003, C: 0, D: 0 },
    viscosity: { A: 0.012, B: 0.00003, C: 0, D: 0 },
    thermalConductivity: { A: 0.024, B: 0.00007, C: 0, D: 0 }
  },
  "air": {
    name: "Air",
    category: "Gases",
    minTemp: -40,
    maxTemp: 300,
    density: { A: 1.29, B: -0.0042, C: 0.000007, D: 0 },
    specificHeat: { A: 1.005, B: 0.00002, C: 0, D: 0 },
    viscosity: { A: 0.0172, B: 0.00005, C: 0, D: 0 },
    thermalConductivity: { A: 0.024, B: 0.00007, C: 0, D: 0 }
  },
  "nitrogen": {
    name: "Nitrogen Gas",
    category: "Gases",
    minTemp: -100,
    maxTemp: 300,
    density: { A: 1.25, B: -0.0041, C: 0.000006, D: 0 },
    specificHeat: { A: 1.04, B: 0.00001, C: 0, D: 0 },
    viscosity: { A: 0.0166, B: 0.00005, C: 0, D: 0 },
    thermalConductivity: { A: 0.024, B: 0.00007, C: 0, D: 0 }
  },
  "co2": {
    name: "Carbon Dioxide",
    category: "Gases",
    minTemp: 0,
    maxTemp: 300,
    density: { A: 1.98, B: -0.0058, C: 0.000009, D: 0 },
    specificHeat: { A: 0.84, B: 0.00035, C: 0, D: 0 },
    viscosity: { A: 0.0138, B: 0.00004, C: 0, D: 0 },
    thermalConductivity: { A: 0.015, B: 0.00006, C: 0, D: 0 }
  },
  "r134a-liquid": {
    name: "R-134a Refrigerant (Liquid)",
    category: "Refrigerants",
    minTemp: -40,
    maxTemp: 80,
    density: { A: 1350, B: -3.8, C: 0, D: 0 },
    specificHeat: { A: 1.35, B: 0.003, C: 0, D: 0 },
    viscosity: { A: 0.35, B: -0.007, C: 0.00005, D: 0 },
    thermalConductivity: { A: 0.092, B: -0.0003, C: 0, D: 0 }
  },
  "therminol-66": {
    name: "Therminol 66 (Heat Transfer)",
    category: "Heat Transfer Fluids",
    minTemp: 0,
    maxTemp: 340,
    density: { A: 1020, B: -0.68, C: 0, D: 0 },
    specificHeat: { A: 1.56, B: 0.004, C: 0, D: 0 },
    viscosity: { A: 45, B: -0.75, C: 0.005, D: 0 },
    thermalConductivity: { A: 0.118, B: -0.00012, C: 0, D: 0 }
  },
  "dowtherm-a": {
    name: "Dowtherm A",
    category: "Heat Transfer Fluids",
    minTemp: 15,
    maxTemp: 400,
    density: { A: 1060, B: -0.72, C: 0, D: 0 },
    specificHeat: { A: 1.55, B: 0.0038, C: 0, D: 0 },
    viscosity: { A: 4.5, B: -0.065, C: 0.0004, D: 0 },
    thermalConductivity: { A: 0.138, B: -0.00015, C: 0, D: 0 }
  }
};

/**
 * Calculate fluid properties at a given temperature
 */
export function getFluidProperties(fluidKey: string, tempC: number): FluidProperties | null {
  const fluid = fluidDatabase[fluidKey];
  if (!fluid) return null;

  // Clamp temperature to valid range
  const T = Math.max(fluid.minTemp, Math.min(fluid.maxTemp, tempC));

  const calcProperty = (coef: { A: number; B: number; C: number; D: number }) => {
    return coef.A + coef.B * T + coef.C * T * T + coef.D * T * T * T;
  };

  const density = calcProperty(fluid.density);
  const specificHeat = calcProperty(fluid.specificHeat);
  let viscosity = calcProperty(fluid.viscosity);
  const thermalConductivity = calcProperty(fluid.thermalConductivity);

  // Ensure positive values
  viscosity = Math.max(0.001, viscosity);
  
  // Calculate Prandtl number: Pr = Cp * μ / k
  // Cp in kJ/kg·K, μ in cP (= 0.001 Pa·s), k in W/m·K
  const prandtl = (specificHeat * 1000 * (viscosity / 1000)) / thermalConductivity;

  return {
    density: Math.max(0.01, density),
    specificHeat: Math.max(0.1, specificHeat),
    viscosity: Math.max(0.001, viscosity),
    thermalConductivity: Math.max(0.001, thermalConductivity),
    prandtl: Math.max(0.01, prandtl)
  };
}

/**
 * Get list of fluids grouped by category
 */
export function getFluidsByCategory(): Record<string, { key: string; name: string }[]> {
  const grouped: Record<string, { key: string; name: string }[]> = {};
  
  for (const [key, fluid] of Object.entries(fluidDatabase)) {
    if (!grouped[fluid.category]) {
      grouped[fluid.category] = [];
    }
    grouped[fluid.category].push({ key, name: fluid.name });
  }
  
  return grouped;
}

/**
 * Get all fluid options for select component
 */
export function getAllFluidOptions(): { key: string; name: string; category: string }[] {
  return Object.entries(fluidDatabase).map(([key, fluid]) => ({
    key,
    name: fluid.name,
    category: fluid.category
  }));
}
