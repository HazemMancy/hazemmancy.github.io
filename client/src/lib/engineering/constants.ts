export const GAS_CONSTANT = 8314.46; // J/(kmol·K)
export const STANDARD_TEMPERATURE = 288.15; // K (15°C)
export const STANDARD_PRESSURE = 101325; // Pa (1 atm)
export const GRAVITY = 9.80665; // m/s²
export const PI = Math.PI;

export interface PipeSpec {
  nps: string;
  od_mm: number;
  schedule: string;
  wt_mm: number;
  id_mm: number;
}

export const PIPE_SPECS: PipeSpec[] = [
  { nps: "1/2\"", od_mm: 21.3, schedule: "STD", wt_mm: 2.77, id_mm: 15.76 },
  { nps: "1/2\"", od_mm: 21.3, schedule: "XS", wt_mm: 3.73, id_mm: 13.84 },
  { nps: "3/4\"", od_mm: 26.7, schedule: "STD", wt_mm: 2.87, id_mm: 20.96 },
  { nps: "3/4\"", od_mm: 26.7, schedule: "XS", wt_mm: 3.91, id_mm: 18.88 },
  { nps: "1\"", od_mm: 33.4, schedule: "STD", wt_mm: 3.38, id_mm: 26.64 },
  { nps: "1\"", od_mm: 33.4, schedule: "XS", wt_mm: 4.55, id_mm: 24.30 },
  { nps: "1-1/4\"", od_mm: 42.2, schedule: "STD", wt_mm: 3.56, id_mm: 35.08 },
  { nps: "1-1/4\"", od_mm: 42.2, schedule: "XS", wt_mm: 4.85, id_mm: 32.50 },
  { nps: "1-1/2\"", od_mm: 48.3, schedule: "STD", wt_mm: 3.68, id_mm: 40.94 },
  { nps: "1-1/2\"", od_mm: 48.3, schedule: "XS", wt_mm: 5.08, id_mm: 38.14 },
  { nps: "2\"", od_mm: 60.3, schedule: "STD", wt_mm: 3.91, id_mm: 52.48 },
  { nps: "2\"", od_mm: 60.3, schedule: "XS", wt_mm: 5.54, id_mm: 49.22 },
  { nps: "2\"", od_mm: 60.3, schedule: "SCH 160", wt_mm: 8.74, id_mm: 42.82 },
  { nps: "2-1/2\"", od_mm: 73.0, schedule: "STD", wt_mm: 5.16, id_mm: 62.68 },
  { nps: "2-1/2\"", od_mm: 73.0, schedule: "XS", wt_mm: 7.01, id_mm: 58.98 },
  { nps: "3\"", od_mm: 88.9, schedule: "STD", wt_mm: 5.49, id_mm: 77.92 },
  { nps: "3\"", od_mm: 88.9, schedule: "XS", wt_mm: 7.62, id_mm: 73.66 },
  { nps: "3\"", od_mm: 88.9, schedule: "SCH 160", wt_mm: 11.13, id_mm: 66.64 },
  { nps: "4\"", od_mm: 114.3, schedule: "STD", wt_mm: 6.02, id_mm: 102.26 },
  { nps: "4\"", od_mm: 114.3, schedule: "XS", wt_mm: 8.56, id_mm: 97.18 },
  { nps: "4\"", od_mm: 114.3, schedule: "SCH 120", wt_mm: 11.13, id_mm: 92.04 },
  { nps: "4\"", od_mm: 114.3, schedule: "SCH 160", wt_mm: 13.49, id_mm: 87.32 },
  { nps: "6\"", od_mm: 168.3, schedule: "STD", wt_mm: 7.11, id_mm: 154.08 },
  { nps: "6\"", od_mm: 168.3, schedule: "XS", wt_mm: 10.97, id_mm: 146.36 },
  { nps: "6\"", od_mm: 168.3, schedule: "SCH 120", wt_mm: 14.27, id_mm: 139.76 },
  { nps: "6\"", od_mm: 168.3, schedule: "SCH 160", wt_mm: 18.26, id_mm: 131.78 },
  { nps: "8\"", od_mm: 219.1, schedule: "STD", wt_mm: 8.18, id_mm: 202.74 },
  { nps: "8\"", od_mm: 219.1, schedule: "XS", wt_mm: 12.70, id_mm: 193.70 },
  { nps: "8\"", od_mm: 219.1, schedule: "SCH 120", wt_mm: 18.26, id_mm: 182.58 },
  { nps: "8\"", od_mm: 219.1, schedule: "SCH 160", wt_mm: 23.01, id_mm: 173.08 },
  { nps: "10\"", od_mm: 273.1, schedule: "STD", wt_mm: 9.27, id_mm: 254.56 },
  { nps: "10\"", od_mm: 273.1, schedule: "XS", wt_mm: 12.70, id_mm: 247.70 },
  { nps: "10\"", od_mm: 273.1, schedule: "SCH 120", wt_mm: 21.44, id_mm: 230.22 },
  { nps: "10\"", od_mm: 273.1, schedule: "SCH 160", wt_mm: 28.58, id_mm: 215.94 },
  { nps: "12\"", od_mm: 323.9, schedule: "STD", wt_mm: 9.53, id_mm: 304.84 },
  { nps: "12\"", od_mm: 323.9, schedule: "XS", wt_mm: 12.70, id_mm: 298.50 },
  { nps: "12\"", od_mm: 323.9, schedule: "SCH 120", wt_mm: 25.40, id_mm: 273.10 },
  { nps: "12\"", od_mm: 323.9, schedule: "SCH 160", wt_mm: 33.32, id_mm: 257.26 },
  { nps: "14\"", od_mm: 355.6, schedule: "STD", wt_mm: 9.53, id_mm: 336.54 },
  { nps: "14\"", od_mm: 355.6, schedule: "XS", wt_mm: 12.70, id_mm: 330.20 },
  { nps: "14\"", od_mm: 355.6, schedule: "SCH 120", wt_mm: 27.79, id_mm: 300.02 },
  { nps: "14\"", od_mm: 355.6, schedule: "SCH 160", wt_mm: 35.71, id_mm: 284.18 },
  { nps: "16\"", od_mm: 406.4, schedule: "STD", wt_mm: 9.53, id_mm: 387.34 },
  { nps: "16\"", od_mm: 406.4, schedule: "XS", wt_mm: 12.70, id_mm: 381.00 },
  { nps: "16\"", od_mm: 406.4, schedule: "SCH 120", wt_mm: 30.96, id_mm: 344.48 },
  { nps: "16\"", od_mm: 406.4, schedule: "SCH 160", wt_mm: 40.49, id_mm: 325.42 },
  { nps: "18\"", od_mm: 457.2, schedule: "STD", wt_mm: 9.53, id_mm: 438.14 },
  { nps: "18\"", od_mm: 457.2, schedule: "XS", wt_mm: 12.70, id_mm: 431.80 },
  { nps: "18\"", od_mm: 457.2, schedule: "SCH 120", wt_mm: 34.93, id_mm: 387.34 },
  { nps: "18\"", od_mm: 457.2, schedule: "SCH 160", wt_mm: 45.24, id_mm: 366.72 },
  { nps: "20\"", od_mm: 508.0, schedule: "STD", wt_mm: 9.53, id_mm: 488.94 },
  { nps: "20\"", od_mm: 508.0, schedule: "XS", wt_mm: 12.70, id_mm: 482.60 },
  { nps: "20\"", od_mm: 508.0, schedule: "SCH 120", wt_mm: 38.10, id_mm: 431.80 },
  { nps: "20\"", od_mm: 508.0, schedule: "SCH 160", wt_mm: 50.01, id_mm: 407.98 },
  { nps: "24\"", od_mm: 609.6, schedule: "STD", wt_mm: 9.53, id_mm: 590.54 },
  { nps: "24\"", od_mm: 609.6, schedule: "XS", wt_mm: 12.70, id_mm: 584.20 },
  { nps: "24\"", od_mm: 609.6, schedule: "SCH 120", wt_mm: 46.02, id_mm: 517.56 },
  { nps: "24\"", od_mm: 609.6, schedule: "SCH 160", wt_mm: 59.54, id_mm: 490.52 },
  { nps: "30\"", od_mm: 762.0, schedule: "STD", wt_mm: 9.53, id_mm: 742.94 },
  { nps: "30\"", od_mm: 762.0, schedule: "XS", wt_mm: 12.70, id_mm: 736.60 },
  { nps: "36\"", od_mm: 914.4, schedule: "STD", wt_mm: 9.53, id_mm: 895.34 },
  { nps: "36\"", od_mm: 914.4, schedule: "XS", wt_mm: 12.70, id_mm: 889.00 },
  { nps: "42\"", od_mm: 1066.8, schedule: "STD", wt_mm: 9.53, id_mm: 1047.74 },
  { nps: "42\"", od_mm: 1066.8, schedule: "XS", wt_mm: 12.70, id_mm: 1041.40 },
  { nps: "48\"", od_mm: 1219.2, schedule: "STD", wt_mm: 9.53, id_mm: 1200.14 },
  { nps: "48\"", od_mm: 1219.2, schedule: "XS", wt_mm: 12.70, id_mm: 1193.80 },
];

export function getNPSList(): string[] {
  const seen = new Set<string>();
  return PIPE_SPECS.filter((s) => {
    if (seen.has(s.nps)) return false;
    seen.add(s.nps);
    return true;
  }).map((s) => s.nps);
}

export function getSchedulesForNPS(nps: string): string[] {
  return PIPE_SPECS.filter((s) => s.nps === nps).map((s) => s.schedule);
}

export function getPipeSpec(nps: string, schedule: string): PipeSpec | undefined {
  return PIPE_SPECS.find((s) => s.nps === nps && s.schedule === schedule);
}

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

export interface GasServiceLimit {
  service: string;
  dpLimit?: number;
  dpType?: "bar/km" | "%Pop";
  velocityLimit?: number;
  rhoV2Limit?: number;
  machLimit?: number;
  notes?: string;
}

export const GAS_SERVICE_LIMITS: GasServiceLimit[] = [
  { service: "Continuous – Vacuum", dpType: "%Pop", dpLimit: 10, velocityLimit: 60 },
  { service: "Continuous – Pop atm to 2 barg", dpLimit: 0.5, dpType: "bar/km", velocityLimit: 50 },
  { service: "Continuous – Pop 2 to 7 barg", dpLimit: 1, dpType: "bar/km", velocityLimit: 45 },
  { service: "Continuous – Pop 7 to 35 barg", dpLimit: 1.5, dpType: "bar/km", rhoV2Limit: 15000 },
  { service: "Continuous – Pop 35 to 140 barg", dpLimit: 3, dpType: "bar/km", rhoV2Limit: 20000 },
  { service: "Continuous – Pop above 140 barg", dpLimit: 5, dpType: "bar/km", rhoV2Limit: 25000 },
  { service: "Compressor suction – Vacuum", dpLimit: 0.05, dpType: "bar/km", velocityLimit: 35 },
  { service: "Compressor suction – Pop atm to 2 barg", dpLimit: 0.15, dpType: "bar/km", velocityLimit: 30 },
  { service: "Compressor suction – Pop 2 to 7 barg", dpLimit: 0.4, dpType: "bar/km", velocityLimit: 25 },
  { service: "Compressor suction – Pop 7 to 35 barg", dpLimit: 1, dpType: "bar/km", rhoV2Limit: 6000 },
  { service: "Compressor suction – Pop > 35 barg", dpLimit: 2, dpType: "bar/km", rhoV2Limit: 15000 },
  { service: "Column overhead to condenser", dpLimit: 0.15, dpType: "bar/km", velocityLimit: 30, notes: "Same criteria as compressor suction (atm–2 barg)" },
  { service: "Kettle reboiler return", dpLimit: 0.15, dpType: "bar/km", velocityLimit: 30, notes: "Same criteria as compressor suction (atm–2 barg)" },
  { service: "Discontinuous – Pop < 35 barg", velocityLimit: 60, rhoV2Limit: 15000 },
  { service: "Discontinuous – Pop >= 35 barg", rhoV2Limit: 25000 },
  { service: "Flare – upstream PSV", dpLimit: 3, dpType: "%Pop", notes: "DP < 3% of PRV set pressure (based on set pressure, not operating)" },
  { service: "Flare – upstream BDV", velocityLimit: 60, rhoV2Limit: 30000 },
  { service: "Flare tail pipe", machLimit: 0.7 },
  { service: "Flare tail pipe (downstream BDV)", machLimit: 1.0 },
  { service: "Flare header", machLimit: 0.5 },
  { service: "Steam – Superheated 150#", dpLimit: 2, dpType: "bar/km", velocityLimit: 45 },
  { service: "Steam – Superheated 300#", dpLimit: 3, dpType: "bar/km", velocityLimit: 60 },
  { service: "Steam – Superheated 600#", dpLimit: 6, dpType: "bar/km", velocityLimit: 60 },
  { service: "Steam – Superheated >= 900#", dpLimit: 8, dpType: "bar/km", velocityLimit: 70 },
  { service: "Steam – Saturated 150#", dpLimit: 1, dpType: "bar/km", velocityLimit: 45 },
  { service: "Steam – Saturated 300#", dpLimit: 3, dpType: "bar/km", velocityLimit: 35 },
  { service: "Steam – Saturated 600#", dpLimit: 6, dpType: "bar/km", velocityLimit: 30 },
  { service: "Superheated steam header – 150#", dpLimit: 1, dpType: "bar/km", velocityLimit: 45 },
  { service: "Superheated steam header – 300#", dpLimit: 1.5, dpType: "bar/km", velocityLimit: 45 },
  { service: "Superheated steam header – 600#", dpLimit: 2, dpType: "bar/km", velocityLimit: 45 },
  { service: "Fuel gas", dpLimit: 0.5, dpType: "bar/km", velocityLimit: 50, notes: "Same criteria as continuous service" },
];

export type NPSBand = "<=2\"" | "3\"-6\"" | "8\"-12\"" | "14\"-18\"" | ">=20\"";

export interface LiquidServiceLimit {
  service: string;
  dpLimit?: number;
  velocityByNPS?: Record<NPSBand, number>;
  velocityFixed?: number;
  notes?: string;
}

export const LIQUID_SERVICE_LIMITS: LiquidServiceLimit[] = [
  { service: "Gravity flow", velocityByNPS: { "<=2\"": 0.3, "3\"-6\"": 0.4, "8\"-12\"": 0.6, "14\"-18\"": 0.8, ">=20\"": 0.9 } },
  { service: "Pump suction – boiling point", dpLimit: 0.5, velocityByNPS: { "<=2\"": 0.6, "3\"-6\"": 0.9, "8\"-12\"": 1.3, "14\"-18\"": 1.8, ">=20\"": 2.2 } },
  { service: "Pump suction – sub-cooled", dpLimit: 1, velocityByNPS: { "<=2\"": 0.7, "3\"-6\"": 1.2, "8\"-12\"": 1.6, "14\"-18\"": 2.1, ">=20\"": 2.6 } },
  { service: "Pump discharge – Pop < 35 barg", dpLimit: 4.5, velocityByNPS: { "<=2\"": 1.4, "3\"-6\"": 1.9, "8\"-12\"": 3.1, "14\"-18\"": 4.1, ">=20\"": 5.0 } },
  { service: "Pump discharge – Pop > 35 barg", dpLimit: 6, velocityByNPS: { "<=2\"": 1.5, "3\"-6\"": 2.0, "8\"-12\"": 3.5, "14\"-18\"": 4.6, ">=20\"": 5.0 } },
  { service: "Condenser out – Pop < 10 barg", velocityByNPS: { "<=2\"": 0.3, "3\"-6\"": 0.4, "8\"-12\"": 0.6, "14\"-18\"": 0.8, ">=20\"": 0.9 } },
  { service: "Condenser out – Pop > 10 barg", dpLimit: 0.5, velocityByNPS: { "<=2\"": 0.6, "3\"-6\"": 0.9, "8\"-12\"": 1.3, "14\"-18\"": 1.8, ">=20\"": 2.2 } },
  { service: "Cooling water manifold", velocityFixed: 3.5, notes: "3.5 m/s steel pipe / 2.5 m/s fibre glass" },
  { service: "Cooling water sub-manifold", velocityByNPS: { "<=2\"": 1.5, "3\"-6\"": 2.0, "8\"-12\"": 3.1, "14\"-18\"": 3.5, ">=20\"": 3.5 } },
  { service: "Diathermic oil", dpLimit: 4.5, velocityByNPS: { "<=2\"": 1.4, "3\"-6\"": 1.9, "8\"-12\"": 3.1, "14\"-18\"": 4.1, ">=20\"": 5.0 }, notes: "Same as pump discharge" },
  { service: "Liquid sulphur", velocityFixed: 1.8, notes: "0.9 m/s minimum" },
  { service: "Column side-stream draw-off", velocityByNPS: { "<=2\"": 0.3, "3\"-6\"": 0.4, "8\"-12\"": 0.6, "14\"-18\"": 0.8, ">=20\"": 0.9 } },
];

export interface MixedPhaseServiceLimit {
  service: string;
  rhoV2Limit: number;
  notes?: string;
}

export const MIXED_PHASE_SERVICE_LIMITS: MixedPhaseServiceLimit[] = [
  { service: "Continuous – P < 7 barg", rhoV2Limit: 6000 },
  { service: "Continuous – P > 7 barg", rhoV2Limit: 15000 },
  { service: "Discontinuous", rhoV2Limit: 15000 },
  { service: "Erosive fluid – continuous", rhoV2Limit: 3750 },
  { service: "Erosive fluid – discontinuous", rhoV2Limit: 6000 },
  { service: "Partial condenser outlet", rhoV2Limit: 6000 },
  { service: "Reboiler return (natural circ.)", rhoV2Limit: 1500 },
  { service: "Flare tail pipe (with liquids)", rhoV2Limit: 50000, notes: "Also recommended: Mach < 0.25 (not checked — requires detailed multiphase simulation)" },
  { service: "Flare header (with liquids)", rhoV2Limit: 50000, notes: "Also recommended: Mach < 0.25 (not checked — requires detailed multiphase simulation)" },
];

export function getNPSBand(nps: string): NPSBand {
  const npsNum = parseNPSToInches(nps);
  if (npsNum <= 2) return "<=2\"";
  if (npsNum <= 6) return "3\"-6\"";
  if (npsNum <= 12) return "8\"-12\"";
  if (npsNum <= 18) return "14\"-18\"";
  return ">=20\"";
}

export function getNPSBandFromDiameter(id_mm: number): NPSBand {
  if (id_mm <= 60.3) return "<=2\"";
  if (id_mm <= 168.3) return "3\"-6\"";
  if (id_mm <= 323.9) return "8\"-12\"";
  if (id_mm <= 457.2) return "14\"-18\"";
  return ">=20\"";
}

function parseNPSToInches(nps: string): number {
  const cleaned = nps.replace('"', '').trim();
  if (cleaned.includes('/')) {
    if (cleaned.includes('-')) {
      const [whole, frac] = cleaned.split('-');
      const [num, den] = frac.split('/');
      return parseInt(whole) + parseInt(num) / parseInt(den);
    }
    const [num, den] = cleaned.split('/');
    return parseInt(num) / parseInt(den);
  }
  return parseFloat(cleaned);
}

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
