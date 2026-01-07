
export interface FluidProperty {
    name: string;
    mw?: number; // Molecular Weight (kg/kmol) for gases
    density?: number; // Density (kg/m³) for liquids or std gas density
    viscosity: number; // Dynamic Viscosity (cP) at standard conditions (~15-20°C)
    k?: number; // Specific Heat Ratio (Cp/Cv)
}

export const commonGases: FluidProperty[] = [
    { name: "Air", mw: 28.96, density: 1.225, viscosity: 0.0181, k: 1.4 },
    { name: "Natural Gas (Typical)", mw: 19.5, density: 0.8, viscosity: 0.011, k: 1.3 },
    { name: "Methane (CH4)", mw: 16.04, density: 0.668, viscosity: 0.011, k: 1.31 },
    { name: "Ethane (C2H6)", mw: 30.07, density: 1.26, viscosity: 0.009, k: 1.19 },
    { name: "Propane (C3H8)", mw: 44.1, density: 1.86, viscosity: 0.008, k: 1.13 },
    { name: "Butane (C4H10)", mw: 58.12, density: 2.48, viscosity: 0.007, k: 1.09 },
    { name: "Nitrogen (N2)", mw: 28.01, density: 1.165, viscosity: 0.0176, k: 1.4 },
    { name: "Carbon Dioxide (CO2)", mw: 44.01, density: 1.842, viscosity: 0.0147, k: 1.29 },
    { name: "Hydrogen (H2)", mw: 2.016, density: 0.0838, viscosity: 0.0088, k: 1.41 },
];

export const commonLiquids: FluidProperty[] = [
    { name: "Water", density: 1000, viscosity: 1.0 },
    { name: "Seawater", density: 1030, viscosity: 1.07 },
    { name: "Diesel", density: 850, viscosity: 3.0 },
    { name: "Gasoline", density: 740, viscosity: 0.6 },
    { name: "Kerosene", density: 820, viscosity: 1.64 },
    { name: "Methanol", density: 792, viscosity: 0.59 },
    { name: "Ethanol", density: 789, viscosity: 1.2 },
    { name: "Crude Oil (Light)", density: 850, viscosity: 5 },
    { name: "Crude Oil (Medium)", density: 900, viscosity: 25 },
    { name: "Crude Oil (Heavy)", density: 950, viscosity: 50 },
];
