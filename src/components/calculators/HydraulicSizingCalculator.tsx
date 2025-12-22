import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, ArrowRight, AlertTriangle, Info, CheckCircle2, Wind, Droplets, Waves } from "lucide-react";

// Calculation Method based on operating conditions
interface CalculationMethod {
  id: string;
  name: string;
  condition: string;
  description: string;
}

const calculationMethods: CalculationMethod[] = [
  { 
    id: "darcy-weisbach", 
    name: "Darcy-Weisbach", 
    condition: "L/D < ~1000, ΔP < 10% of P₁, Onshore/offshore facility piping",
    description: "General purpose equation for facility piping with low pressure drop"
  },
  { 
    id: "panhandle-a", 
    name: "Panhandle A", 
    condition: "Long transmission pipelines",
    description: "Empirical equation for long-distance gas transmission"
  },
  { 
    id: "panhandle-b", 
    name: "Panhandle B", 
    condition: "High-pressure, large-diameter lines",
    description: "Modified Panhandle for high-pressure transmission"
  },
  { 
    id: "weymouth", 
    name: "Weymouth", 
    condition: "Low-pressure distribution lines",
    description: "Simplified equation for distribution systems"
  },
];

// ENI Gas Line Sizing Criteria (Table 8.1.1.1)
interface GasSizingCriteria {
  service: string;
  pressureRange: string;
  pressureDropBarKm: number | null; // null = not specified, or "10% Pop" for vacuum
  velocityMs: number | null; // null = not specified
  rhoV2: number | null; // kg/m*s² - null = not specified
  mach: number | null; // null = not specified
  note?: string;
}

const gasServiceCriteria: GasSizingCriteria[] = [
  // Continuous service
  { service: "Continuous", pressureRange: "Vacuum", pressureDropBarKm: null, velocityMs: 60, rhoV2: null, mach: null, note: "ΔP = 10% Pop" },
  { service: "Continuous", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.5, velocityMs: 50, rhoV2: null, mach: null, note: "Note 1" },
  { service: "Continuous", pressureRange: "2 to 7 barg", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2: null, mach: null },
  { service: "Continuous", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.5, velocityMs: null, rhoV2: 15000, mach: null },
  { service: "Continuous", pressureRange: "35 to 140 barg", pressureDropBarKm: 3, velocityMs: null, rhoV2: 20000, mach: null },
  { service: "Continuous", pressureRange: "Above 140 barg", pressureDropBarKm: 5, velocityMs: null, rhoV2: 25000, mach: null },
  
  // Compressor suction
  { service: "Compressor Suction", pressureRange: "Vacuum", pressureDropBarKm: 0.05, velocityMs: 35, rhoV2: null, mach: null },
  { service: "Compressor Suction", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.15, velocityMs: 30, rhoV2: null, mach: null },
  { service: "Compressor Suction", pressureRange: "2 to 7 barg", pressureDropBarKm: 0.4, velocityMs: 25, rhoV2: null, mach: null },
  { service: "Compressor Suction", pressureRange: "7 to 35 barg", pressureDropBarKm: 1, velocityMs: null, rhoV2: 6000, mach: null },
  { service: "Compressor Suction", pressureRange: "Above 35 barg", pressureDropBarKm: 2, velocityMs: null, rhoV2: 15000, mach: null },
  
  // Discontinuous service
  { service: "Discontinuous", pressureRange: "Below 35 barg", pressureDropBarKm: null, velocityMs: 60, rhoV2: 15000, mach: null },
  { service: "Discontinuous", pressureRange: "35 barg and above", pressureDropBarKm: null, velocityMs: null, rhoV2: 25000, mach: null },
  
  // Flare
  { service: "Flare - Upstream PSV", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2: null, mach: null, note: "ΔP < 3% PRV set" },
  { service: "Flare - Upstream BDV", pressureRange: "All", pressureDropBarKm: null, velocityMs: 60, rhoV2: 30000, mach: null },
  { service: "Flare - Tail Pipe", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2: null, mach: 0.7, note: "Note 2" },
  { service: "Flare - Tail Pipe (downstream BDV)", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2: null, mach: 1.0 },
  { service: "Flare Header", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2: null, mach: 0.5 },
  
  // Steam to users
  { service: "Steam - Superheated #150", pressureRange: "All", pressureDropBarKm: 2.0, velocityMs: 45, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam - Superheated #300", pressureRange: "All", pressureDropBarKm: 3.0, velocityMs: 60, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam - Superheated #600", pressureRange: "All", pressureDropBarKm: 6.0, velocityMs: 60, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam - Superheated #900+", pressureRange: "All", pressureDropBarKm: 8.0, velocityMs: 70, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam - Saturated #150", pressureRange: "All", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2: null, mach: null, note: "Note 3" },
  { service: "Steam - Saturated #300", pressureRange: "All", pressureDropBarKm: 3.0, velocityMs: 35, rhoV2: null, mach: null, note: "Note 3" },
  { service: "Steam - Saturated #600", pressureRange: "All", pressureDropBarKm: 6.0, velocityMs: 30, rhoV2: null, mach: null, note: "Note 3" },
  
  // Superheated Steam long headers
  { service: "Steam Header - #150", pressureRange: "All", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam Header - #300", pressureRange: "All", pressureDropBarKm: 1.5, velocityMs: 45, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam Header - #600", pressureRange: "All", pressureDropBarKm: 2.0, velocityMs: 45, rhoV2: null, mach: null, note: "Note 4" },
  
  // Fuel Gas (same as continuous)
  { service: "Fuel Gas", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.5, velocityMs: 50, rhoV2: null, mach: null },
  { service: "Fuel Gas", pressureRange: "2 to 7 barg", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2: null, mach: null },
  { service: "Fuel Gas", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.5, velocityMs: null, rhoV2: 15000, mach: null },
];

// Get unique service types
const gasServiceTypes = [...new Set(gasServiceCriteria.map(c => c.service))];

// Get pressure ranges for a service type
const getPressureRangesForService = (service: string): string[] => {
  return gasServiceCriteria.filter(c => c.service === service).map(c => c.pressureRange);
};

// Get criteria for a specific service and pressure range
const getCriteriaForServiceAndPressure = (service: string, pressureRange: string): GasSizingCriteria | undefined => {
  return gasServiceCriteria.find(c => c.service === service && c.pressureRange === pressureRange);
};

// Unit conversion factors to SI
const lengthToMeters: Record<string, number> = {
  m: 1,
  km: 1000,
};

const diameterToMeters: Record<string, number> = {
  mm: 0.001,
  in: 0.0254,
};

// ASME B36.10M / B36.19M Pipe Schedule Data - Inside Diameter (mm)
// Schedule types: 5s, 10s, 10, 20, 30, 40s, STD, 40, 60, 80s, XS, 80, 100, 120, 140, 160, XXS
const pipeScheduleData: Record<string, Record<string, number>> = {
  // NPS 1/2" (DN 15) - OD: 21.3 mm
  "1/2": { 
    "5s": 18.04, "10s": 17.12, "10": 17.12, "40s": 15.80, "STD": 15.80, "40": 15.80, 
    "80s": 13.87, "XS": 13.87, "80": 13.87, "160": 11.74, "XXS": 6.35 
  },
  // NPS 3/4" (DN 20) - OD: 26.7 mm
  "3/4": { 
    "5s": 23.37, "10s": 22.45, "10": 22.45, "40s": 20.93, "STD": 20.93, "40": 20.93, 
    "80s": 18.85, "XS": 18.85, "80": 18.85, "160": 15.54, "XXS": 11.07 
  },
  // NPS 1" (DN 25) - OD: 33.4 mm
  "1": { 
    "5s": 29.51, "10s": 27.86, "10": 27.86, "40s": 26.64, "STD": 26.64, "40": 26.64, 
    "80s": 24.31, "XS": 24.31, "80": 24.31, "160": 20.70, "XXS": 15.22 
  },
  // NPS 1-1/4" (DN 32) - OD: 42.2 mm
  "1-1/4": { 
    "5s": 38.14, "10s": 36.63, "10": 36.63, "40s": 35.05, "STD": 35.05, "40": 35.05, 
    "80s": 32.46, "XS": 32.46, "80": 32.46, "160": 29.46, "XXS": 22.76 
  },
  // NPS 1-1/2" (DN 40) - OD: 48.3 mm
  "1-1/2": { 
    "5s": 44.20, "10s": 42.72, "10": 42.72, "40s": 40.89, "STD": 40.89, "40": 40.89, 
    "80s": 38.10, "XS": 38.10, "80": 38.10, "160": 33.98, "XXS": 27.94 
  },
  // NPS 2" (DN 50) - OD: 60.3 mm
  "2": { 
    "5s": 56.26, "10s": 54.79, "10": 54.79, "40s": 52.50, "STD": 52.50, "40": 52.50, 
    "80s": 49.25, "XS": 49.25, "80": 49.25, "160": 42.90, "XXS": 38.16 
  },
  // NPS 2-1/2" (DN 65) - OD: 73.0 mm
  "2-1/2": { 
    "5s": 68.78, "10s": 66.90, "10": 66.90, "40s": 62.71, "STD": 62.71, "40": 62.71, 
    "80s": 59.00, "XS": 59.00, "80": 59.00, "160": 53.98, "XXS": 44.96 
  },
  // NPS 3" (DN 80) - OD: 88.9 mm
  "3": { 
    "5s": 84.68, "10s": 82.80, "10": 82.80, "40s": 77.93, "STD": 77.93, "40": 77.93, 
    "80s": 73.66, "XS": 73.66, "80": 73.66, "160": 66.64, "XXS": 58.42 
  },
  // NPS 4" (DN 100) - OD: 114.3 mm
  "4": { 
    "5s": 110.08, "10s": 108.20, "10": 108.20, "40s": 102.26, "STD": 102.26, "40": 102.26, 
    "80s": 97.18, "XS": 97.18, "80": 97.18, "120": 92.04, "160": 87.32, "XXS": 80.06 
  },
  // NPS 6" (DN 150) - OD: 168.3 mm
  "6": { 
    "5s": 164.66, "10s": 162.74, "10": 162.74, "40s": 154.05, "STD": 154.05, "40": 154.05, 
    "80s": 146.33, "XS": 146.33, "80": 146.33, "120": 139.70, "160": 131.78, "XXS": 124.38 
  },
  // NPS 8" (DN 200) - OD: 219.1 mm
  "8": { 
    "5s": 216.66, "10s": 214.96, "10": 214.96, "20": 209.55, "30": 206.38, 
    "40s": 205.00, "STD": 202.72, "40": 202.72, "60": 196.85, 
    "80s": 196.85, "XS": 193.68, "80": 193.68, "100": 186.96, "120": 180.98, "140": 177.80, "160": 173.99, "XXS": 174.64 
  },
  // NPS 10" (DN 250) - OD: 273.0 mm
  "10": { 
    "5s": 271.02, "10s": 268.92, "10": 268.92, "20": 262.76, "30": 257.48, 
    "40s": 260.35, "STD": 254.51, "40": 254.51, "60": 247.65, 
    "80s": 254.51, "XS": 247.65, "80": 242.87, "100": 236.52, "120": 230.18, "140": 225.42, "160": 222.25, "XXS": 222.25 
  },
  // NPS 12" (DN 300) - OD: 323.8 mm
  "12": { 
    "5s": 323.85, "10s": 320.42, "10": 320.42, "20": 314.66, "30": 307.09, 
    "40s": 315.88, "STD": 303.23, "40": 303.23, "60": 295.30, 
    "80s": 311.15, "XS": 298.45, "80": 288.90, "100": 280.92, "120": 273.05, "140": 266.70, "160": 264.67, "XXS": 264.67 
  },
  // NPS 14" (DN 350) - OD: 355.6 mm
  "14": { 
    "5s": 350.50, "10s": 347.68, "10": 347.68, "20": 342.90, "30": 339.76, 
    "STD": 347.68, "40": 336.54, "60": 330.20, 
    "XS": 339.76, "80": 323.88, "100": 317.50, "120": 311.18, "140": 304.80, "160": 290.58 
  },
  // NPS 16" (DN 400) - OD: 406.4 mm
  "16": { 
    "5s": 400.86, "10s": 398.02, "10": 398.02, "20": 393.70, "30": 387.36, 
    "STD": 398.02, "40": 381.00, "60": 374.66, 
    "XS": 387.36, "80": 363.52, "100": 354.08, "120": 344.48, "140": 336.54, "160": 333.34 
  },
  // NPS 18" (DN 450) - OD: 457.2 mm
  "18": { 
    "5s": 451.46, "10s": 448.62, "10": 448.62, "20": 444.30, "30": 434.72, 
    "STD": 448.62, "40": 428.66, "60": 419.10, 
    "XS": 434.72, "80": 409.58, "100": 398.02, "120": 387.36, "140": 381.00, "160": 376.94 
  },
  // NPS 20" (DN 500) - OD: 508.0 mm
  "20": { 
    "5s": 501.80, "10s": 498.44, "10": 498.44, "20": 490.96, "30": 482.60, 
    "STD": 498.44, "40": 477.82, "60": 466.78, 
    "XS": 482.60, "80": 455.62, "100": 444.30, "120": 431.80, "140": 419.10, "160": 419.10 
  },
  // NPS 24" (DN 600) - OD: 609.6 mm
  "24": { 
    "5s": 603.25, "10s": 598.42, "10": 598.42, "20": 590.04, "30": 581.66, 
    "STD": 598.42, "40": 574.68, "60": 560.32, 
    "XS": 581.66, "80": 547.68, "100": 530.10, "120": 514.35, "140": 504.82, "160": 498.44 
  },
  // NPS 30" (DN 750) - OD: 762.0 mm
  "30": { 
    "5s": 755.65, "10s": 749.30, "10": 749.30, "20": 736.60, "30": 723.90, 
    "STD": 749.30, "XS": 736.60 
  },
  // NPS 36" (DN 900) - OD: 914.4 mm
  "36": { 
    "5s": 906.65, "10s": 898.52, "10": 898.52, "20": 882.90, "30": 869.95, 
    "STD": 898.52, "40": 863.60, "XS": 882.90 
  },
  // NPS 42" (DN 1050) - OD: 1066.8 mm
  "42": { 
    "5s": 1057.91, "10s": 1047.75, "10": 1047.75, "20": 1031.88, "30": 1016.00, 
    "STD": 1047.75, "XS": 1031.88 
  },
  // NPS 48" (DN 1200) - OD: 1219.2 mm
  "48": { 
    "5s": 1209.17, "10s": 1196.85, "10": 1196.85, "20": 1178.56, "30": 1162.05, 
    "STD": 1196.85, "XS": 1178.56 
  },
};

// Schedule order for display (ASME B36.10M / B36.19M)
const scheduleOrder = ["5s", "10s", "10", "20", "30", "40s", "STD", "40", "60", "80s", "XS", "80", "100", "120", "140", "160", "XXS"];

const nominalDiameters = Object.keys(pipeScheduleData);

// Get available schedules for a nominal diameter (sorted by schedule order)
const getSchedulesForDiameter = (nd: string): string[] => {
  const available = Object.keys(pipeScheduleData[nd] || {});
  return scheduleOrder.filter(sch => available.includes(sch));
};

// Gas flow rate units
const gasFlowRateToM3s: Record<string, number> = {
  "mmscfd": 0.327741,
  "Nm³/h": 1 / 3600,
  "Sm³/h": 1 / 3600,
  "m³/h": 1 / 3600,
  "scfm": 0.000471947,
};

// Liquid flow rate units
const liquidFlowRateToM3s: Record<string, number> = {
  "m³/h": 1 / 3600,
  "m³/s": 1,
  "L/min": 1 / 60000,
  "L/s": 0.001,
  "gpm": 0.0000630902,
  "bbl/d": 0.00000184013,
};

const densityToKgM3: Record<string, number> = {
  "kg/m³": 1,
  "lb/ft³": 16.0185,
  "g/cm³": 1000,
};

const viscosityToPas: Record<string, number> = {
  "cP": 0.001,
  "Pa·s": 1,
  "mPa·s": 0.001,
};

const roughnessToMeters: Record<string, number> = {
  mm: 0.001,
  μm: 0.000001,
  in: 0.0254,
};

const pressureFromPa: Record<string, number> = {
  Pa: 1,
  kPa: 0.001,
  bar: 0.00001,
  psi: 0.000145038,
  "kg/cm²": 0.0000101972,
};

// Pipe roughness per ASME/ANSI/API standards (in mm)
// Reference: API 5L, ASME B31.1, Crane TP-410
const pipeRoughness: Record<string, number> = {
  "Carbon Steel (New)": 0.0457,        // API 5L / ASME B31.3 - new clean CS
  "Carbon Steel (Corroded)": 0.15,     // Moderately corroded service
  "Carbon Steel (Severely Corroded)": 0.9, // Heavy scale/corrosion
  "Stainless Steel": 0.015,            // ASME B36.19M - SS 304/316
  "Duplex Stainless Steel": 0.015,     // 2205/2507 duplex
  "Cast Iron": 0.26,                   // ANSI/AWWA C110
  "Ductile Iron (Cement Lined)": 0.025, // AWWA C104
  "Galvanized Steel": 0.15,            // Hot-dip galvanized
  "Chrome-Moly Steel": 0.0457,         // ASTM A335 (P11, P22, etc.)
  "Copper/Copper-Nickel": 0.0015,      // ASTM B88 / B111
  "PVC/CPVC": 0.0015,                  // ASTM D1785 / F441
  "HDPE": 0.007,                       // ASTM F714
  "Fiberglass (FRP/GRE)": 0.005,       // API 15HR
  "Concrete": 1.0,                     // Cast-in-place
  "Lined Steel (Epoxy)": 0.006,        // Internal epoxy coating
  "Lined Steel (Rubber)": 0.025,       // Rubber lined
  "Custom": 0,
};

// Common fluids database with temperature-dependent properties
interface FluidProperties {
  name: string;
  type: "gas" | "liquid";
  temperatures: number[];
  density: Record<number, number>;
  viscosity: Record<number, number>;
}

const fluidsDatabase: FluidProperties[] = [
  // Gases
  { 
    name: "Natural Gas", type: "gas",
    temperatures: [15, 25, 50, 100],
    density: { 15: 0.75, 25: 0.72, 50: 0.65, 100: 0.55 },
    viscosity: { 15: 0.011, 25: 0.011, 50: 0.012, 100: 0.014 }
  },
  { 
    name: "Air", type: "gas",
    temperatures: [15, 25, 50, 100, 150],
    density: { 15: 1.225, 25: 1.184, 50: 1.093, 100: 0.946, 150: 0.834 },
    viscosity: { 15: 0.0179, 25: 0.0184, 50: 0.0196, 100: 0.0218, 150: 0.0238 }
  },
  { 
    name: "Nitrogen", type: "gas",
    temperatures: [15, 25, 50, 100],
    density: { 15: 1.185, 25: 1.145, 50: 1.056, 100: 0.916 },
    viscosity: { 15: 0.0175, 25: 0.0180, 50: 0.0191, 100: 0.0212 }
  },
  { 
    name: "Carbon Dioxide", type: "gas",
    temperatures: [15, 25, 50, 100],
    density: { 15: 1.87, 25: 1.81, 50: 1.67, 100: 1.45 },
    viscosity: { 15: 0.0145, 25: 0.0150, 50: 0.0165, 100: 0.0190 }
  },
  { 
    name: "Hydrogen", type: "gas",
    temperatures: [15, 25, 50, 100],
    density: { 15: 0.085, 25: 0.082, 50: 0.076, 100: 0.066 },
    viscosity: { 15: 0.0088, 25: 0.0090, 50: 0.0095, 100: 0.0105 }
  },
  { 
    name: "Steam", type: "gas",
    temperatures: [100, 150, 200, 300],
    density: { 100: 0.590, 150: 0.517, 200: 0.460, 300: 0.379 },
    viscosity: { 100: 0.0125, 150: 0.0142, 200: 0.0160, 300: 0.0195 }
  },
  // Liquids
  { 
    name: "Water", type: "liquid",
    temperatures: [5, 15, 25, 40, 60, 80, 100],
    density: { 5: 1000, 15: 999, 25: 997, 40: 992, 60: 983, 80: 972, 100: 958 },
    viscosity: { 5: 1.52, 15: 1.14, 25: 0.89, 40: 0.65, 60: 0.47, 80: 0.35, 100: 0.28 }
  },
  { 
    name: "Seawater", type: "liquid",
    temperatures: [5, 15, 25, 40],
    density: { 5: 1028, 15: 1026, 25: 1023, 40: 1017 },
    viscosity: { 5: 1.62, 15: 1.20, 25: 0.96, 40: 0.70 }
  },
  { 
    name: "Crude Oil (Light)", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 850, 25: 843, 40: 830, 60: 812 },
    viscosity: { 15: 12, 25: 8, 40: 5, 60: 3 }
  },
  { 
    name: "Crude Oil (Medium)", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 900, 25: 893, 40: 880, 60: 862 },
    viscosity: { 15: 50, 25: 30, 40: 15, 60: 8 }
  },
  { 
    name: "Crude Oil (Heavy)", type: "liquid",
    temperatures: [15, 25, 40, 60, 80],
    density: { 15: 950, 25: 943, 40: 930, 60: 912, 80: 895 },
    viscosity: { 15: 500, 25: 200, 40: 80, 60: 35, 80: 18 }
  },
  { 
    name: "Diesel", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 850, 25: 843, 40: 830, 60: 812 },
    viscosity: { 15: 4.5, 25: 3.2, 40: 2.2, 60: 1.5 }
  },
  { 
    name: "Gasoline", type: "liquid",
    temperatures: [15, 25, 40],
    density: { 15: 750, 25: 742, 40: 728 },
    viscosity: { 15: 0.6, 25: 0.5, 40: 0.4 }
  },
  { 
    name: "Kerosene", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 810, 25: 802, 40: 788, 60: 770 },
    viscosity: { 15: 2.2, 25: 1.7, 40: 1.2, 60: 0.9 }
  },
  { 
    name: "Glycol (MEG)", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 1115, 25: 1109, 40: 1098, 60: 1083 },
    viscosity: { 15: 25, 25: 17, 40: 9, 60: 5 }
  },
  { 
    name: "Methanol", type: "liquid",
    temperatures: [15, 25, 40],
    density: { 15: 792, 25: 785, 40: 772 },
    viscosity: { 15: 0.62, 25: 0.55, 40: 0.45 }
  },
  { 
    name: "Ammonia (Liquid)", type: "liquid",
    temperatures: [-33, 0, 25],
    density: { "-33": 682, 0: 639, 25: 602 },
    viscosity: { "-33": 0.27, 0: 0.16, 25: 0.13 }
  },
];

interface HydraulicSizingCalculatorProps {
  lineType: "gas" | "liquid" | "mixed";
}

const HydraulicSizingCalculator = ({ lineType }: HydraulicSizingCalculatorProps) => {
  // Input states
  const [pipeLength, setPipeLength] = useState<string>("100");
  const [lengthUnit, setLengthUnit] = useState<string>("m");
  const [nominalDiameter, setNominalDiameter] = useState<string>("4");
  const [schedule, setSchedule] = useState<string>("STD");
  const [diameterUnit, setDiameterUnit] = useState<string>("mm");
  const [flowRate, setFlowRate] = useState<string>(lineType === "gas" ? "10" : "50");
  const [flowRateUnit, setFlowRateUnit] = useState<string>(lineType === "gas" ? "mmscfd" : "m³/h");
  const [density, setDensity] = useState<string>(lineType === "gas" ? "0.75" : "1000");
  const [densityUnit, setDensityUnit] = useState<string>("kg/m³");
  const [viscosity, setViscosity] = useState<string>(lineType === "gas" ? "0.011" : "1");
  const [viscosityUnit, setViscosityUnit] = useState<string>("cP");
  const [pipeMaterial, setPipeMaterial] = useState<string>("Carbon Steel");
  const [customRoughness, setCustomRoughness] = useState<string>("0.045");
  const [roughnessUnit, setRoughnessUnit] = useState<string>("mm");
  const [pressureUnit, setPressureUnit] = useState<string>("bar");
  const [selectedFluid, setSelectedFluid] = useState<string>("");
  const [fluidTemperature, setFluidTemperature] = useState<string>("25");
  
  // Calculation method selection
  const [calculationMethod, setCalculationMethod] = useState<string>("darcy-weisbach");
  
  // Additional inputs for gas transmission equations (Panhandle, Weymouth)
  const [inletPressure, setInletPressure] = useState<string>("70"); // bara
  const [baseTemperature, setBaseTemperature] = useState<string>("15.56"); // °C (60°F standard)
  const [basePressure, setBasePressure] = useState<string>("1.01325"); // bara (14.7 psia standard)
  const [gasGravity, setGasGravity] = useState<string>("0.65"); // Specific gravity (air = 1)
  const [compressibilityZ, setCompressibilityZ] = useState<string>("0.9"); // Compressibility factor
  
  // Gas service type selection (ENI criteria)
  const [gasServiceType, setGasServiceType] = useState<string>("Continuous");
  const [gasPressureRange, setGasPressureRange] = useState<string>("2 to 7 barg");

  // Get available pressure ranges for selected gas service
  const availableGasPressureRanges = useMemo(() => {
    return getPressureRangesForService(gasServiceType);
  }, [gasServiceType]);

  // Reset pressure range when service type changes
  const handleGasServiceChange = (service: string) => {
    setGasServiceType(service);
    const ranges = getPressureRangesForService(service);
    if (ranges.length > 0 && !ranges.includes(gasPressureRange)) {
      setGasPressureRange(ranges[0]);
    }
  };

  // Get fluids filtered by type
  const availableFluids = useMemo(() => {
    return fluidsDatabase.filter(f => f.type === lineType);
  }, [lineType]);

  // Get available temperatures for selected fluid
  const availableTemperatures = useMemo(() => {
    const fluid = fluidsDatabase.find(f => f.name === selectedFluid);
    return fluid?.temperatures || [];
  }, [selectedFluid]);

  // Handle fluid selection
  const handleFluidSelect = (fluidName: string) => {
    setSelectedFluid(fluidName);
    if (fluidName === "Other") {
      // Allow custom input - keep current values or set defaults
      return;
    }
    const fluid = fluidsDatabase.find(f => f.name === fluidName);
    if (fluid) {
      const temp = fluid.temperatures.includes(25) ? 25 : fluid.temperatures[0];
      setFluidTemperature(temp.toString());
      setDensity(fluid.density[temp].toString());
      setViscosity(fluid.viscosity[temp].toString());
    }
  };

  // Handle temperature change
  const handleTemperatureChange = (temp: string) => {
    setFluidTemperature(temp);
    const fluid = fluidsDatabase.find(f => f.name === selectedFluid);
    if (fluid) {
      const tempNum = parseInt(temp);
      setDensity(fluid.density[tempNum]?.toString() || density);
      setViscosity(fluid.viscosity[tempNum]?.toString() || viscosity);
    }
  };

  // Get available schedules for current diameter
  const availableSchedules = useMemo(() => {
    return getSchedulesForDiameter(nominalDiameter);
  }, [nominalDiameter]);

  // Reset schedule if not available for new diameter
  useMemo(() => {
    if (!availableSchedules.includes(schedule)) {
      setSchedule(availableSchedules[0] || "STD");
    }
  }, [nominalDiameter, availableSchedules]);

  // Get inside diameter from nominal diameter and schedule
  const insideDiameterMM = useMemo(() => {
    return pipeScheduleData[nominalDiameter]?.[schedule] || 0;
  }, [nominalDiameter, schedule]);

  // Convert inside diameter to selected unit for display
  const insideDiameterDisplay = useMemo(() => {
    if (diameterUnit === "in") {
      return (insideDiameterMM / 25.4).toFixed(3);
    }
    return insideDiameterMM.toFixed(2);
  }, [insideDiameterMM, diameterUnit]);

  // Get flow rate conversion factor
  const flowRateConversion = lineType === "gas" ? gasFlowRateToM3s : liquidFlowRateToM3s;

  // Convert all inputs to SI units
  const L_m = useMemo(() => parseFloat(pipeLength) * lengthToMeters[lengthUnit] || 0, [pipeLength, lengthUnit]);
  const D_m = useMemo(() => insideDiameterMM * 0.001, [insideDiameterMM]);
  const Q_m3s = useMemo(() => parseFloat(flowRate) * (flowRateConversion[flowRateUnit] || 0), [flowRate, flowRateUnit, flowRateConversion]);
  const rho = useMemo(() => parseFloat(density) * densityToKgM3[densityUnit] || 0, [density, densityUnit]);
  const mu = useMemo(() => parseFloat(viscosity) * viscosityToPas[viscosityUnit] || 0, [viscosity, viscosityUnit]);
  const epsilon_m = useMemo(() => {
    const roughnessValue = pipeMaterial === "Custom" 
      ? parseFloat(customRoughness) 
      : pipeRoughness[pipeMaterial];
    return (roughnessValue || 0) * roughnessToMeters[roughnessUnit];
  }, [pipeMaterial, customRoughness, roughnessUnit]);

  // Parse operating conditions for gas
  const P_operating_bara = useMemo(() => parseFloat(inletPressure) || 1.01325, [inletPressure]);
  const T_operating_K = useMemo(() => (parseFloat(fluidTemperature) || 15) + 273.15, [fluidTemperature]);
  const T_std_K = useMemo(() => (parseFloat(baseTemperature) || 15.56) + 273.15, [baseTemperature]);
  const P_std_bara = useMemo(() => parseFloat(basePressure) || 1.01325, [basePressure]);
  const Z_factor = useMemo(() => parseFloat(compressibilityZ) || 1.0, [compressibilityZ]);

  // Calculate velocity
  // For gas: v = Q_std × (P_std/P_actual) × (T_actual/T_std) × Z / A (converts to actual conditions)
  // For liquid: v = Q / A (incompressible)
  const velocity = useMemo(() => {
    if (D_m <= 0) return 0;
    const area = Math.PI * Math.pow(D_m / 2, 2);
    
    if (lineType === "gas") {
      // Convert standard flow to actual flow using ideal gas law with compressibility
      // Q_actual = Q_std × (P_std/P_actual) × (T_actual/T_std) × Z
      const Q_actual = Q_m3s * (P_std_bara / P_operating_bara) * (T_operating_K / T_std_K) * Z_factor;
      return Q_actual / area;
    }
    
    // Liquid - direct calculation (incompressible)
    return Q_m3s / area;
  }, [Q_m3s, D_m, lineType, P_std_bara, P_operating_bara, T_operating_K, T_std_K, Z_factor]);

  // Calculate ρv² (rho v squared)
  const rhoVSquared = useMemo(() => {
    return rho * Math.pow(velocity, 2);
  }, [rho, velocity]);

  // Calculate Reynolds number
  const reynoldsNumber = useMemo(() => {
    if (mu <= 0 || D_m <= 0) return 0;
    return (rho * velocity * D_m) / mu;
  }, [rho, velocity, D_m, mu]);

  // Determine flow regime
  const flowRegime = useMemo(() => {
    if (reynoldsNumber < 2300) return "Laminar";
    if (reynoldsNumber < 4000) return "Transitional";
    return "Turbulent";
  }, [reynoldsNumber]);

  // Calculate friction factor using Haaland approximation
  const frictionFactor = useMemo(() => {
    if (reynoldsNumber <= 0 || D_m <= 0) return 0;
    
    if (reynoldsNumber < 2300) {
      return 64 / reynoldsNumber;
    }
    
    const relativeRoughness = epsilon_m / D_m;
    const term1 = relativeRoughness / 3.7;
    const term2 = 6.9 / reynoldsNumber;
    const f = Math.pow(-1.8 * Math.log10(Math.pow(term1, 1.11) + term2), -2);
    
    return f;
  }, [reynoldsNumber, epsilon_m, D_m]);

  // Additional gas transmission inputs (reuse velocity calculation variables where applicable)
  const P1_bara = P_operating_bara; // Alias for pressure drop calculations
  const Tb_K = T_std_K; // Base temperature for transmission equations
  const Pb_bara = P_std_bara; // Base pressure for transmission equations
  const Sg = useMemo(() => parseFloat(gasGravity) || 0.65, [gasGravity]);
  const Z = Z_factor; // Alias for transmission equations
  const T_K = T_operating_K; // Operating temperature for transmission equations

  // Calculate pressure drop based on selected method
  const pressureDropPa = useMemo(() => {
    if (D_m <= 0) return 0;
    
    // For liquid lines, always use Darcy-Weisbach
    if (lineType === "liquid") {
      if (frictionFactor <= 0) return 0;
      return frictionFactor * (L_m / D_m) * (rho * Math.pow(velocity, 2) / 2);
    }
    
    // For gas lines, use selected method
    switch (calculationMethod) {
      case "darcy-weisbach": {
        if (frictionFactor <= 0) return 0;
        return frictionFactor * (L_m / D_m) * (rho * Math.pow(velocity, 2) / 2);
      }
      
      case "panhandle-a": {
        // Panhandle A equation (AGA form)
        // Q = 435.87 * (Tb/Pb) * ((P1² - P2²) / (Sg^0.8539 * L * T * Z))^0.5394 * D^2.6182
        // Rearranged to solve for P2 (outlet pressure)
        // Units: Q in m³/day, P in bara, L in km, T in K, D in mm
        if (P1_bara <= 0 || L_m <= 0 || Q_m3s <= 0 || Sg <= 0 || T_K <= 0 || Z <= 0) return 0;
        
        const Q_m3day = Q_m3s * 86400; // Convert m³/s to m³/day
        const L_km = L_m / 1000;
        const D_mm = D_m * 1000;
        
        // Solving: (P1² - P2²) = (Q / (435.87 * (Tb/Pb) * D^2.6182))^(1/0.5394) * Sg^0.8539 * L * T * Z
        const coefficient = 435.87 * (Tb_K / Pb_bara) * Math.pow(D_mm, 2.6182);
        if (coefficient <= 0) return 0;
        
        const ratio = Q_m3day / coefficient;
        const P1sqMinusP2sq = Math.pow(ratio, 1/0.5394) * Math.pow(Sg, 0.8539) * L_km * T_K * Z;
        
        const P2sq = P1_bara * P1_bara - P1sqMinusP2sq;
        if (P2sq < 0) return P1_bara * 100000; // Flow is choked
        
        const P2_bara = Math.sqrt(P2sq);
        return (P1_bara - P2_bara) * 100000; // Convert bar to Pa
      }
      
      case "panhandle-b": {
        // Panhandle B equation
        // Q = 737 * (Tb/Pb) * ((P1² - P2²) / (Sg^0.961 * L * T * Z))^0.510 * D^2.530
        // Units: Q in m³/day, P in bara, L in km, T in K, D in mm
        if (P1_bara <= 0 || L_m <= 0 || Q_m3s <= 0 || Sg <= 0 || T_K <= 0 || Z <= 0) return 0;
        
        const Q_m3day = Q_m3s * 86400;
        const L_km = L_m / 1000;
        const D_mm = D_m * 1000;
        
        const coefficient = 737 * (Tb_K / Pb_bara) * Math.pow(D_mm, 2.530);
        if (coefficient <= 0) return 0;
        
        const ratio = Q_m3day / coefficient;
        const P1sqMinusP2sq = Math.pow(ratio, 1/0.510) * Math.pow(Sg, 0.961) * L_km * T_K * Z;
        
        const P2sq = P1_bara * P1_bara - P1sqMinusP2sq;
        if (P2sq < 0) return P1_bara * 100000;
        
        const P2_bara = Math.sqrt(P2sq);
        return (P1_bara - P2_bara) * 100000;
      }
      
      case "weymouth": {
        // Weymouth equation
        // Q = 137.2 * (Tb/Pb) * ((P1² - P2²) / (Sg * L * T * Z))^0.5 * D^2.667
        // Units: Q in m³/day, P in bara, L in km, T in K, D in mm
        if (P1_bara <= 0 || L_m <= 0 || Q_m3s <= 0 || Sg <= 0 || T_K <= 0 || Z <= 0) return 0;
        
        const Q_m3day = Q_m3s * 86400;
        const L_km = L_m / 1000;
        const D_mm = D_m * 1000;
        
        const coefficient = 137.2 * (Tb_K / Pb_bara) * Math.pow(D_mm, 2.667);
        if (coefficient <= 0) return 0;
        
        const ratio = Q_m3day / coefficient;
        const P1sqMinusP2sq = Math.pow(ratio, 2) * Sg * L_km * T_K * Z;
        
        const P2sq = P1_bara * P1_bara - P1sqMinusP2sq;
        if (P2sq < 0) return P1_bara * 100000;
        
        const P2_bara = Math.sqrt(P2sq);
        return (P1_bara - P2_bara) * 100000;
      }
      
      default:
        if (frictionFactor <= 0) return 0;
        return frictionFactor * (L_m / D_m) * (rho * Math.pow(velocity, 2) / 2);
    }
  }, [calculationMethod, lineType, frictionFactor, L_m, D_m, rho, velocity, P1_bara, Tb_K, Pb_bara, Sg, Z, T_K, Q_m3s]);

  // Convert to selected unit
  const pressureDrop = useMemo(() => {
    return pressureDropPa * pressureFromPa[pressureUnit];
  }, [pressureDropPa, pressureUnit]);

  // Calculate head loss
  const headLoss = useMemo(() => {
    if (rho <= 0) return 0;
    return pressureDropPa / (rho * 9.81);
  }, [pressureDropPa, rho]);

  // Calculate pressure drop per 100m
  const pressureDropPer100m = useMemo(() => {
    if (L_m <= 0) return 0;
    return (pressureDropPa * 100 / L_m) * pressureFromPa[pressureUnit];
  }, [pressureDropPa, L_m, pressureUnit]);

  const isValidInput = L_m > 0 && D_m > 0 && Q_m3s > 0 && rho > 0 && mu > 0;

  // API 14E Erosional Velocity Calculation
  // Ve = C / sqrt(ρm) where C = 100-150 and ρm is in lb/ft³
  const erosionalVelocity = useMemo(() => {
    // Convert density from kg/m³ to lb/ft³
    const rhoLbFt3 = rho / 16.0185;
    if (rhoLbFt3 <= 0) return 0;
    
    // C = 100 for continuous service (conservative, solid-free fluids)
    const C = 100;
    
    // Ve in ft/s
    const VeFtS = C / Math.sqrt(rhoLbFt3);
    
    // Convert to m/s
    return VeFtS * 0.3048;
  }, [rho]);

  // Get current ENI gas sizing criteria based on service type and pressure range
  const currentGasCriteria = useMemo(() => {
    return getCriteriaForServiceAndPressure(gasServiceType, gasPressureRange);
  }, [gasServiceType, gasPressureRange]);

  // Line Sizing Criteria based on ENI Table 8.1.1.1 for gas, API 14E for liquid
  const sizingCriteria = useMemo(() => {
    if (lineType === "gas" && currentGasCriteria) {
      // Convert pressure drop from bar/km to bar/100m
      const pressureDropBarPer100m = currentGasCriteria.pressureDropBarKm 
        ? currentGasCriteria.pressureDropBarKm / 10 
        : null;
      
      return {
        minVelocity: 0, // No minimum for gas
        maxVelocity: currentGasCriteria.velocityMs, // From ENI table, null if using ρv² instead
        maxRhoVSquared: currentGasCriteria.rhoV2, // From ENI table
        maxPressureDropPer100m: pressureDropBarPer100m, // bar/100m
        maxMach: currentGasCriteria.mach, // For flare applications
        note: currentGasCriteria.note,
        service: currentGasCriteria.service,
        pressureRange: currentGasCriteria.pressureRange,
      };
    } else {
      // Liquid - API 14E criteria
      return {
        minVelocity: 0.9, // 3 ft/s - minimum to prevent silt/solids settling
        maxVelocity: 4.6, // 15 ft/s - maximum to prevent erosion
        maxRhoVSquared: 15000, // kg/(m·s²) - higher limit for liquids
        maxPressureDropPer100m: 1.0, // bar/100m
        maxMach: null,
        note: null,
        service: null,
        pressureRange: null,
      };
    }
  }, [lineType, currentGasCriteria]);

  // Status check function based on ENI/API 14E criteria
  const getStatusIndicator = () => {
    const pressureDropPer100mBar = L_m > 0 ? (pressureDropPa * 100 / L_m) * 0.00001 : 0; // Convert to bar/100m
    
    // Pressure drop check - only if limit is specified
    const pressureDropOk = sizingCriteria.maxPressureDropPer100m === null || 
      (L_m > 0 && pressureDropPer100mBar <= sizingCriteria.maxPressureDropPer100m);
    
    // Velocity check - only if limit is specified
    const velocityOk = sizingCriteria.maxVelocity === null || 
      (velocity >= sizingCriteria.minVelocity && velocity <= sizingCriteria.maxVelocity);
    
    // ρv² check - only if limit is specified
    const rhoVSquaredOk = sizingCriteria.maxRhoVSquared === null || 
      rhoVSquared <= sizingCriteria.maxRhoVSquared;
    
    return {
      pressureDrop: sizingCriteria.maxPressureDropPer100m === null ? "na" as const : 
        (pressureDropOk ? "ok" as const : "warning" as const),
      velocity: sizingCriteria.maxVelocity === null ? "na" as const : 
        (velocityOk ? "ok" as const : "warning" as const),
      rhoVSquared: sizingCriteria.maxRhoVSquared === null ? "na" as const : 
        (rhoVSquaredOk ? "ok" as const : "warning" as const),
    };
  };

  const status = getStatusIndicator();

  const StatusIcon = ({ type }: { type: "ok" | "warning" | "na" }) => {
    if (type === "ok") {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (type === "na") {
      return <Info className="w-4 h-4 text-muted-foreground" />;
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  if (lineType === "mixed") {
    return (
      <div className="space-y-8">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Waves className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                  Mixed-Phase <span className="text-primary">Line Sizing</span>
                </h2>
                <p className="text-muted-foreground">Beggs & Brill equation for two-phase flow</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Mixed-phase pressure drop calculations using Beggs & Brill correlation 
              for two-phase flow are being developed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const PhaseIcon = lineType === "gas" ? Wind : Droplets;
  const phaseTitle = lineType === "gas" ? "Gas Line Sizing" : "Liquid Line Sizing";

  // Get current calculation method details
  const currentMethod = calculationMethods.find(m => m.id === calculationMethod);

  return (
    <div className="space-y-8">
      {/* Title Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 rounded-xl bg-primary/10">
                <PhaseIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                  {lineType === "gas" ? "Gas" : "Liquid"} <span className="text-primary">Line Sizing</span>
                </h2>
                <p className="text-muted-foreground">
                  {lineType === "gas" 
                    ? `${currentMethod?.name || "Darcy-Weisbach"} equation` 
                    : "Darcy-Weisbach equation for single-phase pipe flow"}
                </p>
              </div>
            </div>
            
            {/* Calculation Method Dropdown - Only for Gas */}
            {lineType === "gas" && (
              <div className="w-full sm:w-72">
                <Select value={calculationMethod} onValueChange={setCalculationMethod}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {calculationMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{method.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Method condition hint */}
          {lineType === "gas" && currentMethod && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Recommended for:</p>
              <p className="text-sm">{currentMethod.condition}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipe Properties */}
        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-blue-500 font-bold text-sm">1</span>
              </div>
              <h3 className="font-heading font-semibold text-lg">Pipe Properties</h3>
            </div>

            <div className="space-y-5">
              {/* Gas Service Type (ENI Criteria) - Only show for gas lines */}
              {lineType === "gas" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Service Type</Label>
                    <Select value={gasServiceType} onValueChange={handleGasServiceChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gasServiceTypes.map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Operating Pressure</Label>
                    <Select value={gasPressureRange} onValueChange={setGasPressureRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGasPressureRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show current criteria */}
                  {currentGasCriteria && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                      <p className="text-xs font-medium text-primary">Recommended Limits</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {currentGasCriteria.pressureDropBarKm !== null && (
                          <p>ΔP: ≤ {currentGasCriteria.pressureDropBarKm} bar/km</p>
                        )}
                        {currentGasCriteria.velocityMs !== null && (
                          <p>Velocity: ≤ {currentGasCriteria.velocityMs} m/s</p>
                        )}
                        {currentGasCriteria.rhoV2 !== null && (
                          <p>ρv²: ≤ {currentGasCriteria.rhoV2.toLocaleString()} kg/(m·s²)</p>
                        )}
                        {currentGasCriteria.mach !== null && (
                          <p>Mach: ≤ {currentGasCriteria.mach}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              {/* Pipe Length */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Length</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={pipeLength}
                    onChange={(e) => setPipeLength(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="100"
                  />
                  <Select value={lengthUnit} onValueChange={setLengthUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="km">km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nominal Diameter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nominal Diameter (NPS)</Label>
                <Select value={nominalDiameter} onValueChange={setNominalDiameter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {nominalDiameters.map((nd) => (
                      <SelectItem key={nd} value={nd}>
                        {nd}"
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Schedule</Label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSchedules.map((sch) => (
                      <SelectItem key={sch} value={sch}>
                        {sch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Inside Diameter Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Inside Diameter (ID)</Label>
                  <Select value={diameterUnit} onValueChange={setDiameterUnit}>
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xl font-mono font-bold text-primary">
                    {insideDiameterDisplay} <span className="text-sm font-normal">{diameterUnit}</span>
                  </p>
                </div>
              </div>

              {/* Pipe Material */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Material</Label>
                <Select value={pipeMaterial} onValueChange={setPipeMaterial}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(pipeRoughness).map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Roughness */}
              {pipeMaterial === "Custom" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Surface Roughness (ε)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={customRoughness}
                      onChange={(e) => setCustomRoughness(e.target.value)}
                      className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.045"
                    />
                    <Select value={roughnessUnit} onValueChange={setRoughnessUnit}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="μm">μm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {pipeMaterial !== "Custom" && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    Surface Roughness: <span className="font-mono text-foreground">{pipeRoughness[pipeMaterial]} mm</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Flow Properties */}
        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-green-500 font-bold text-sm">2</span>
              </div>
              <h3 className="font-heading font-semibold text-lg">Flow Properties</h3>
            </div>

            <div className="space-y-5">
              {/* Fluid Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fluid Type</Label>
                <Select value={selectedFluid} onValueChange={handleFluidSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fluid..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFluids.map((fluid) => (
                      <SelectItem key={fluid.name} value={fluid.name}>
                        {fluid.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Temperature (°C)</Label>
                <Input
                  type="number"
                  value={fluidTemperature}
                  onChange={(e) => setFluidTemperature(e.target.value)}
                  disabled={selectedFluid !== "" && selectedFluid !== "Other"}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="25"
                />
              </div>

              {/* Flow Rate */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Volumetric Flow Rate</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={flowRate}
                    onChange={(e) => setFlowRate(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={lineType === "gas" ? "10" : "50"}
                  />
                  <Select value={flowRateUnit} onValueChange={setFlowRateUnit}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(flowRateConversion).map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fluid Density */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fluid Density (ρ)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    disabled={selectedFluid !== "" && selectedFluid !== "Other"}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-70 disabled:cursor-not-allowed"
                    placeholder={lineType === "gas" ? "0.75" : "1000"}
                  />
                  <Select value={densityUnit} onValueChange={setDensityUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg/m³">kg/m³</SelectItem>
                      <SelectItem value="lb/ft³">lb/ft³</SelectItem>
                      <SelectItem value="g/cm³">g/cm³</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Viscosity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dynamic Viscosity (μ)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={viscosity}
                    onChange={(e) => setViscosity(e.target.value)}
                    disabled={selectedFluid !== "" && selectedFluid !== "Other"}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-70 disabled:cursor-not-allowed"
                    placeholder={lineType === "gas" ? "0.011" : "1"}
                  />
                  <Select value={viscosityUnit} onValueChange={setViscosityUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cP">cP</SelectItem>
                      <SelectItem value="Pa·s">Pa·s</SelectItem>
                      <SelectItem value="mPa·s">mPa·s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Operating Conditions - Always shown for Gas */}
              {lineType === "gas" && (
                <>
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Operating Conditions (for velocity at actual)</p>
                  </div>
                  
                  {/* Operating Pressure */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Operating Pressure P (bara)</Label>
                    <Input
                      type="number"
                      value={inletPressure}
                      onChange={(e) => setInletPressure(e.target.value)}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="70"
                    />
                  </div>
                  
                  {/* Compressibility Factor */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Compressibility Factor (Z)</Label>
                    <Input
                      type="number"
                      value={compressibilityZ}
                      onChange={(e) => setCompressibilityZ(e.target.value)}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.9"
                    />
                  </div>
                  
                  {/* Standard/Base Conditions */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Std Temp T_std (°C)</Label>
                      <Input
                        type="number"
                        value={baseTemperature}
                        onChange={(e) => setBaseTemperature(e.target.value)}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="15.56"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Std Press P_std (bara)</Label>
                      <Input
                        type="number"
                        value={basePressure}
                        onChange={(e) => setBasePressure(e.target.value)}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="1.01325"
                      />
                    </div>
                  </div>
                  
                  {/* Gas Specific Gravity - Only for transmission methods */}
                  {calculationMethod !== "darcy-weisbach" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Gas Specific Gravity (air=1)</Label>
                      <Input
                        type="number"
                        value={gasGravity}
                        onChange={(e) => setGasGravity(e.target.value)}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.65"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg">Results</h3>
            </div>

            {isValidInput ? (
              <div className="space-y-4">
                {/* Pressure Drop - Main Result */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Pressure Drop (ΔP)</span>
                      <StatusIcon type={status.pressureDrop} />
                    </div>
                    <Select value={pressureUnit} onValueChange={setPressureUnit}>
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">bar</SelectItem>
                        <SelectItem value="kPa">kPa</SelectItem>
                        <SelectItem value="Pa">Pa</SelectItem>
                        <SelectItem value="psi">psi</SelectItem>
                        <SelectItem value="kg/cm²">kg/cm²</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-3xl font-mono font-bold text-primary">
                    {pressureDrop.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(pressureDropPer100m * 10).toFixed(4)} {pressureUnit}/km
                    {sizingCriteria.maxPressureDropPer100m !== null && lineType === "gas" && (
                      <span className="ml-2">
                        (Limit: ≤ {(sizingCriteria.maxPressureDropPer100m * 10).toFixed(1)} {pressureUnit}/km)
                      </span>
                    )}
                  </p>
                </div>

                {/* Velocity */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Fluid Velocity</span>
                    <StatusIcon type={status.velocity} />
                  </div>
                  <p className="text-lg font-mono font-semibold">{velocity.toFixed(3)} m/s</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sizingCriteria.maxVelocity !== null 
                      ? (lineType === "gas" 
                          ? `Limit: ≤ ${sizingCriteria.maxVelocity} m/s`
                          : `Limit: ${sizingCriteria.minVelocity} - ${sizingCriteria.maxVelocity} m/s`)
                      : "N/A - Use ρv² criterion"
                    }
                  </p>
                </div>


                {/* ρv² */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">ρv² (Erosional)</span>
                    <StatusIcon type={status.rhoVSquared} />
                  </div>
                  <p className="text-lg font-mono font-semibold">{rhoVSquared.toFixed(2)} kg/(m·s²)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sizingCriteria.maxRhoVSquared !== null 
                      ? `Limit: ≤ ${sizingCriteria.maxRhoVSquared.toLocaleString()} kg/(m·s²)`
                      : "N/A - Use velocity criterion"
                    }
                  </p>
                </div>

                {/* Head Loss */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-xs text-muted-foreground">Head Loss</span>
                  <p className="text-lg font-mono font-semibold">{headLoss.toFixed(3)} m</p>
                </div>

                {/* Flow Regime */}
                <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                  <span className="text-sm">Flow Regime</span>
                  <Badge 
                    variant="outline"
                    className={
                      flowRegime === "Laminar" 
                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                        : flowRegime === "Turbulent"
                        ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }
                  >
                    {flowRegime}
                  </Badge>
                </div>

                {/* Intermediate Values */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Intermediate Values</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-xs text-muted-foreground block">Reynolds (Re)</span>
                      <span className="font-mono">{reynoldsNumber.toFixed(0)}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-xs text-muted-foreground block">Friction Factor (f)</span>
                      <span className="font-mono">{frictionFactor.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm text-center">Enter valid values for all inputs to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equation Reference */}
      <Card className="border border-border">
        <CardContent className="p-6">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Equations Used
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Darcy-Weisbach</p>
              <p className="font-mono text-xs">ΔP = f × (L/D) × (ρV²/2)</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Reynolds Number</p>
              <p className="font-mono text-xs">Re = ρVD / μ</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Haaland (Turbulent f)</p>
              <p className="font-mono text-xs">1/√f = -1.8 log[(ε/3.7D)^1.11 + 6.9/Re]</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HydraulicSizingCalculator;
