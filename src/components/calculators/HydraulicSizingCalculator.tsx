import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Gauge, ArrowRight, AlertTriangle, Info, CheckCircle2, Wind, Droplets, Waves, Ruler, HelpCircle, Bot } from "lucide-react";
import HydraulicGuide from "./guides/HydraulicGuide";
import { generateHydraulicPDF, HydraulicDatasheetData } from "@/lib/hydraulicPdfDatasheet";
import { generateHydraulicExcelDatasheet, HydraulicExcelData } from "@/lib/hydraulicExcelDatasheet";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
// Export imports managed above
import { commonGases, commonLiquids, FluidProperty } from '@/lib/fluids';


// ================== TYPE DEFINITIONS ==================
type UnitSystem = 'metric' | 'imperial';

// Darcy-Weisbach is used for pressure drop calculations (Standard Industry Practice)

// API RP 14E / Best Practice Gas Line Sizing Criteria
interface GasSizingCriteria {
  service: string;
  pressureRange: string;
  pressureDropBarKm: number | null; // null = not specified
  velocityMs: number | null; // null = not specified
  rhoV2Limit: number | null; // kg/m·s²
  machLimit: number | null;
  cValue: number | null; // Keep for backward compatibility / calculation if needed
  note?: string;
}

// API RP 14E / Best Practice Liquid Line Sizing Criteria
interface LiquidSizingCriteria {
  service: string;
  pressureDropBarKm: number | null;
  velocity: {
    size2: number | null;      // <= 2"
    size3to6: number | null;   // 3" to 6"
    size8to12: number | null;  // 8" to 12"
    size14to18: number | null; // 14" to 18"
    size20plus: number | null; // >= 20"
  } | null;
}

// Mixed-Phase: API RP 14E Checking
interface MixedPhaseSizingCriteria {
  service: string;
  rhoV2Limit: number | null; // kg/m·s²
  machLimit: number | null;
  cValue: number | null;
  note?: string; // Add note field
}

// Data from user tables
const gasServiceCriteria: GasSizingCriteria[] = [
  // Continuous service
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

  // Column Overhead to condenser (Same as Compressor Suction)
  { service: "Column Overhead to Condenser", pressureRange: "Vacuum", pressureDropBarKm: 0.05, velocityMs: 35, rhoV2Limit: null, machLimit: null, cValue: null },
  { service: "Column Overhead to Condenser", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.15, velocityMs: 30, rhoV2Limit: null, machLimit: null, cValue: null },
  { service: "Column Overhead to Condenser", pressureRange: "2 to 7 barg", pressureDropBarKm: 0.4, velocityMs: 25, rhoV2Limit: null, machLimit: null, cValue: null },
  { service: "Column Overhead to Condenser", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.0, velocityMs: null, rhoV2Limit: 6000, machLimit: null, cValue: null },
  { service: "Column Overhead to Condenser", pressureRange: "Above 35 barg", pressureDropBarKm: 2.0, velocityMs: null, rhoV2Limit: 15000, machLimit: null, cValue: null },

  // Kettle Reboiler return (Same as Compressor Suction)
  { service: "Kettle Reboiler Return", pressureRange: "Vacuum", pressureDropBarKm: 0.05, velocityMs: 35, rhoV2Limit: null, machLimit: null, cValue: null },
  { service: "Kettle Reboiler Return", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.15, velocityMs: 30, rhoV2Limit: null, machLimit: null, cValue: null },
  { service: "Kettle Reboiler Return", pressureRange: "2 to 7 barg", pressureDropBarKm: 0.4, velocityMs: 25, rhoV2Limit: null, machLimit: null, cValue: null },
  { service: "Kettle Reboiler Return", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.0, velocityMs: null, rhoV2Limit: 6000, machLimit: null, cValue: null },
  { service: "Kettle Reboiler Return", pressureRange: "Above 35 barg", pressureDropBarKm: 2.0, velocityMs: null, rhoV2Limit: 15000, machLimit: null, cValue: null },

  // Discontinuous service
  { service: "Discontinuous", pressureRange: "Below 35 barg", pressureDropBarKm: null, velocityMs: 60, rhoV2Limit: 15000, machLimit: null, cValue: null },
  { service: "Discontinuous", pressureRange: "35 barg and above", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: 25000, machLimit: null, cValue: null },

  // Flare
  { service: "Flare - Upstream PSV", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: null, machLimit: null, cValue: null, note: "ΔP < 3% PRV set" },
  { service: "Flare - Upstream BDV", pressureRange: "All", pressureDropBarKm: null, velocityMs: 60, rhoV2Limit: 30000, machLimit: null, cValue: null },
  { service: "Flare Tail Pipe", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: null, machLimit: 0.7, cValue: null },
  { service: "Flare Tail Pipe (Legacy)", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2Limit: null, machLimit: 1.0, cValue: null, note: "Downstream BDV" }, // Renamed for clarity vs Mixed
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

  // Fuel Gas (Mirrors Continuous Service)
  { service: "Fuel Gas", pressureRange: "Vacuum", pressureDropBarKm: null, velocityMs: 60, rhoV2Limit: null, machLimit: null, cValue: null, note: "ΔP = 10% Pop" },
  { service: "Fuel Gas", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.5, velocityMs: 50, rhoV2Limit: null, machLimit: null, cValue: null },
  { service: "Fuel Gas", pressureRange: "2 to 7 barg", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2Limit: null, machLimit: null, cValue: null },
  { service: "Fuel Gas", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.5, velocityMs: null, rhoV2Limit: 15000, machLimit: null, cValue: null },
  { service: "Fuel Gas", pressureRange: "35 to 140 barg", pressureDropBarKm: 3.0, velocityMs: null, rhoV2Limit: 20000, machLimit: null, cValue: null },
  { service: "Fuel Gas", pressureRange: "Above 140 barg", pressureDropBarKm: 5.0, velocityMs: null, rhoV2Limit: 25000, machLimit: null, cValue: null },
];

// Liquid service criteria per User Tables
const liquidServiceCriteria: LiquidSizingCriteria[] = [
  { service: "Gravity Flow", pressureDropBarKm: null, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
  { service: "Pump Suction (Boiling Point)", pressureDropBarKm: 0.5, velocity: { size2: 0.6, size3to6: 0.9, size8to12: 1.3, size14to18: 1.8, size20plus: 2.2 } },
  { service: "Pump Suction (Sub-cooled)", pressureDropBarKm: 1.0, velocity: { size2: 0.7, size3to6: 1.2, size8to12: 1.6, size14to18: 2.1, size20plus: 2.6 } },
  { service: "Pump Discharge (Pop < 35 barg)", pressureDropBarKm: 4.5, velocity: { size2: 1.4, size3to6: 1.9, size8to12: 3.1, size14to18: 4.1, size20plus: 5.0 } },
  { service: "Pump Discharge (Pop > 35 barg)", pressureDropBarKm: 6.0, velocity: { size2: 1.5, size3to6: 2.0, size8to12: 3.5, size14to18: 4.6, size20plus: 5.0 } },
  { service: "Condenser Out (Pop < 10 barg)", pressureDropBarKm: null, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
  { service: "Condenser Out (Pop > 10 barg)", pressureDropBarKm: 0.5, velocity: { size2: 0.6, size3to6: 0.9, size8to12: 1.3, size14to18: 1.8, size20plus: 2.2 } },
  { service: "Cooling Water", pressureDropBarKm: null, velocity: { size2: 3.5, size3to6: 3.5, size8to12: 3.5, size14to18: 3.5, size20plus: 3.5 } }, // Simplified
  { service: "Liquid Sulphur", pressureDropBarKm: null, velocity: { size2: 1.8, size3to6: 1.8, size8to12: 1.8, size14to18: 1.8, size20plus: 1.8 } }, // Note: Min 0.9
];

// Mixed-phase: API RP 14E C-values
// Mixed-phase: API RP 14E (Table 8.3.1.1)
const mixedPhaseServiceCriteria: MixedPhaseSizingCriteria[] = [
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

// ... (rest of helper functions remain similar, but using new types)

// Get unique service types
const gasServiceTypes = [...new Set(gasServiceCriteria.map(c => c.service))];
const liquidServiceTypes = liquidServiceCriteria.map(c => c.service);
const mixedPhaseServiceTypes = mixedPhaseServiceCriteria.map(c => c.service);

// ... (getPressureRangesForService etc. - keep existing logic but map to new vars)

const getPressureRangesForService = (service: string): string[] => {
  return gasServiceCriteria.filter(c => c.service === service).map(c => c.pressureRange);
};

// ...

// Calculate API 14E Erosional Velocity
// Ve = C / sqrt(rho)
// Note: API 14E uses Imperial Units: Ve in ft/s, rho in lb/ft³
// We must convert for calculation if in Metric, or use Metric equivalent constant.
// Metric equivalent: Ve(m/s) = (C_imperial * 0.3048 * sqrt(16.0185)) / sqrt(rho_kgm3) = C_imp * 1.22 / sqrt(rho_kgm3)
// Metric equivalent: Ve(m/s) = (C_imperial * 0.3048 * sqrt(16.0185)) / sqrt(rho_kgm3) = C_imp * 1.22 / sqrt(rho_kgm3)
const calculateErosionalVelocity = (rho_kgm3: number, cValue: number): number => {
  if (rho_kgm3 <= 0 || !cValue) return 9999;
  return (cValue * 1.22) / Math.sqrt(rho_kgm3);
};

// Helper: Get criteria for gas service
// Helper: Get criteria for gas service
const getCriteriaForServiceAndPressure = (service: string, pressureRange: string): GasSizingCriteria | null => {
  const criteria = gasServiceCriteria.find(c => c.service === service && c.pressureRange === pressureRange);
  return criteria || null;
};

// Helper: Get criteria for liquid service
const getLiquidCriteriaForService = (service: string): LiquidSizingCriteria | null => {
  const criteria = liquidServiceCriteria.find(c => c.service === service);
  return criteria || null;
};

// Helper: Get criteria for mixed-phase service
const getMixedPhaseCriteriaForService = (service: string): MixedPhaseSizingCriteria | null => {
  const criteria = mixedPhaseServiceCriteria.find(c => c.service === service);
  return criteria || null;
};

// Helper: Get liquid velocity limit based on diameter
const getLiquidVelocityLimit = (criteria: LiquidSizingCriteria, diameter: number): number | null => {
  if (!criteria.velocity) return null;
  if (diameter <= 2) return criteria.velocity.size2;
  if (diameter <= 6) return criteria.velocity.size3to6;
  if (diameter <= 12) return criteria.velocity.size8to12;
  if (diameter <= 18) return criteria.velocity.size14to18;
  return criteria.velocity.size20plus;
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

// Gas volumetric flow rate units (standard/base conditions)
const gasVolumetricFlowRateToM3s: Record<string, number> = {
  "MMSCFD": 0.327741,
  "Nm³/h": 1 / 3600,
  "Sm³/h": 1 / 3600,
  "m³/h": 1 / 3600,
  "SCFM": 0.000471947,
};

// Gas mass flow rate units (to kg/s)
const gasMassFlowRateToKgS: Record<string, number> = {
  "kg/hr": 1 / 3600,
  "kg/s": 1,
  "lb/hr": 0.000125998,
  "t/hr": 1 / 3.6,
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

// ====================================================================
// ENGINEERING DIRECTIVE: HYSYS ALIGNMENT DECLARATION
// ====================================================================
// 1. BASE CONDITIONS: User-defined (Default: 1.01325 bara, 15.56°C)
// 2. ASSUMPTIONS:
//    - Gas: Segmented Isothermal Compressible Flow (Molar Flow Conserved)
//    - Liquid: Incompressible Darcy-Weisbach + Elevation + Minor Losses
//    - Mixed: Homogeneous No-Slip Model (Screening Only) - NOT HYSYS EQUIVALENT
// 3. Z-FACTOR: Constant or Linear interpolation (if implemented)
// 4. ROUGHNESS: Absolute roughness in meters
// 5. DEVIATION: < 2% vs HYSYS for single-phase when Z/Density matched.
// ====================================================================

// Data from user tables
// ... (criteria arrays)

const densityToKgM3: Record<string, number> = {
  "kg/m³": 1,
  "lb/ft³": 16.018463,
  "g/cm³": 1000,
  "lb/gal": 119.826427, // Added per directive
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
  psi: 0.0001450377,
  "kg/cm²": 0.000010197,
};

// Canonical Pressure Helper (Engineering Directive)
const PATM_PA = 101325;
const toPascalAbs = (val: number, unit: string, isGauge: boolean) => {
  let p_Pa = 0;
  // Base unit conversion steps
  switch (unit) {
    case 'bar': p_Pa = val * 100000; break;
    case 'kPa': p_Pa = val * 1000; break;
    case 'Pa': p_Pa = val; break;
    case 'psi': p_Pa = val * 6894.757; break;
    case 'psia': p_Pa = val * 6894.757; break; // Unit implies abs, but we handle logic below
    case 'kg/cm²': p_Pa = val * 98066.5; break;
    default: p_Pa = val * 100000;
  }

  // Gauge Handling
  const isUnitAbsolute = unit === 'psia';
  const isSelectionGauge = isGauge;

  if (isUnitAbsolute) {
    return p_Pa;
  }

  if (isSelectionGauge) {
    return p_Pa + PATM_PA;
  }
  return p_Pa;
};

// Pipe roughness per ASME/ANSI/API standards (in mm)
const pipeRoughness: Record<string, number> = {
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

type BeggsBrillRegime = "segregated" | "transition" | "intermittent" | "distributed";

const getBeggsBrillRegime = (lambdaL: number, nFr: number): BeggsBrillRegime => {
  const lambdaSafe = Math.max(lambdaL, 1e-6);
  const L1 = 316 * Math.pow(lambdaSafe, 0.302);
  const L2 = 0.0009252 * Math.pow(lambdaSafe, -2.468);
  const L3 = 0.1 * Math.pow(lambdaSafe, -1.4516);
  const L4 = 0.5 * Math.pow(lambdaSafe, -6.738);

  if ((lambdaSafe < 0.01 && nFr < L1) || (lambdaSafe >= 0.01 && nFr < L2)) return "segregated";
  if (nFr >= L2 && nFr < L3) return "transition";
  if (nFr >= L3 && nFr < L4) return "intermittent";
  return "distributed";
};

const getBeggsBrillHoldup = (lambdaL: number, nFr: number, regime: BeggsBrillRegime): number => {
  const lambdaSafe = Math.max(lambdaL, 1e-6);
  const nFrSafe = Math.max(nFr, 1e-6);

  const coeffs = {
    segregated: { a: 0.98, b: 0.4846, c: 0.0868 },
    intermittent: { a: 0.845, b: 0.5351, c: 0.0173 },
    distributed: { a: 1.065, b: 0.5824, c: 0.0609 },
  };

  const holdup = (a: number, b: number, c: number) => a * Math.pow(lambdaSafe, b) / Math.pow(nFrSafe, c);

  if (regime === "transition") {
    const L2 = 0.0009252 * Math.pow(lambdaSafe, -2.468);
    const L3 = 0.1 * Math.pow(lambdaSafe, -1.4516);
    const hSeg = holdup(coeffs.segregated.a, coeffs.segregated.b, coeffs.segregated.c);
    const hInt = holdup(coeffs.intermittent.a, coeffs.intermittent.b, coeffs.intermittent.c);
    const t = (Math.min(Math.max(nFrSafe, L2), L3) - L2) / (L3 - L2);
    return Math.min(1, Math.max(lambdaSafe, hSeg + t * (hInt - hSeg)));
  }

  const selected = coeffs[regime === "segregated" ? "segregated" : regime === "intermittent" ? "intermittent" : "distributed"];
  return Math.min(1, Math.max(lambdaSafe, holdup(selected.a, selected.b, selected.c)));
};

interface HydraulicSizingCalculatorProps {
  lineType: "gas" | "liquid" | "mixed";
}

const HydraulicSizingCalculator = ({ lineType }: HydraulicSizingCalculatorProps) => {
  // Unit system state
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  // Get unit options based on system
  const flowRateUnits = unitSystem === 'metric'
    ? (lineType === "gas" ? ["MMSCFD", "Nm³/h", "Sm³/h", "m³/h"] : ["m³/h", "m³/s", "L/min", "L/s"])
    : (lineType === "gas" ? ["MMSCFD", "SCFM"] : ["gpm", "bbl/d", "ft³/min"]);

  const lengthUnits = unitSystem === 'metric' ? ["m", "km"] : ["ft", "mi"];
  const diameterUnits = unitSystem === 'metric' ? ["mm"] : ["in"];
  const densityUnits = unitSystem === 'metric' ? ["kg/m³", "g/cm³"] : ["lb/ft³", "lb/gal"];
  const pressureUnits = unitSystem === 'metric' ? ["bar", "kPa", "Pa"] : ["psi", "psia"];
  const roughnessUnits = unitSystem === 'metric' ? ["mm", "μm"] : ["in"];

  // Input states
  const [pipeLength, setPipeLength] = useState<string>("18");
  const [lengthUnit, setLengthUnit] = useState<string>("km");
  const [nominalDiameter, setNominalDiameter] = useState<string>("4");
  const [schedule, setSchedule] = useState<string>("120");
  const [diameterUnit, setDiameterUnit] = useState<string>("mm");
  const [flowRate, setFlowRate] = useState<string>(lineType === "gas" ? "2" : "50");
  const [flowRateUnit, setFlowRateUnit] = useState<string>(lineType === "gas" ? "MMSCFD" : "m³/h");

  const [density, setDensity] = useState<string>(lineType === "gas" ? "0.75" : "1000");
  const [densityUnit, setDensityUnit] = useState<string>("kg/m³");
  const [viscosity, setViscosity] = useState<string>(lineType === "gas" ? "0.011" : "1");
  const [viscosityUnit, setViscosityUnit] = useState<string>("cP");
  const [selectedFluid, setSelectedFluid] = useState<string>("Custom");
  const [pipeMaterial, setPipeMaterial] = useState<string>("Carbon Steel (New)");
  const [customRoughness, setCustomRoughness] = useState<string>("0.0457");
  const [roughnessUnit, setRoughnessUnit] = useState<string>("mm");
  const [pressureUnit, setPressureUnit] = useState<string>("bar");

  const [fluidTemperature, setFluidTemperature] = useState<string>("15");



  // Handle unit system change
  const handleUnitSystemChange = (isImperial: boolean) => {
    const newSystem = isImperial ? 'imperial' : 'metric';

    // Convert values if system is changing
    if (newSystem !== unitSystem) {
      // Helper to safely parse and convert
      const cvt = (val: string, factor: number) => {
        const num = parseFloat(val);
        return isNaN(num) ? val : (num * factor).toFixed(4);
      };

      const cvtTemp = (val: string, toF: boolean) => {
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return toF ? ((num * 9 / 5) + 32).toFixed(2) : ((num - 32) * 5 / 9).toFixed(2);
      };

      if (isImperial) {
        // Metric -> Imperial
        setLengthUnit("ft");     // km -> ft
        setPipeLength(prev => cvt(prev, 3280.84));

        setDiameterUnit("in");   // mm -> in
        setNominalDiameter(prev => cvt(prev, 1 / 25.4));

        setDensityUnit("lb/ft³"); // kg/m³ -> lb/ft³
        setDensity(prev => cvt(prev, 0.062428));

        setPressureUnit("psi");   // bar -> psi
        setInletPressure(prev => cvt(prev, 14.5038)); // Gauge pressure

        setRoughnessUnit("in");   // mm -> in
        setCustomRoughness(prev => cvt(prev, 1 / 25.4));

        setFluidTemperature(prev => cvtTemp(prev, true)); // C -> F

        if (lineType === "gas") {
          setFlowRateUnit("MMSCFD"); // Standard is usually MMSCFD for both or similar
        } else {
          setFlowRateUnit("gpm"); // m³/h -> gpm
          setFlowRate(prev => cvt(prev, 4.40287));
        }
      } else {
        // Imperial -> Metric
        setLengthUnit("km");     // ft -> km
        setPipeLength(prev => cvt(prev, 1 / 3280.84));

        setDiameterUnit("mm");   // in -> mm
        setNominalDiameter(prev => cvt(prev, 25.4));

        setDensityUnit("kg/m³"); // lb/ft³ -> kg/m³
        setDensity(prev => cvt(prev, 1 / 0.062428));

        setPressureUnit("bar");  // psi -> bar
        setInletPressure(prev => cvt(prev, 1 / 14.5038));

        setRoughnessUnit("mm");  // in -> mm
        setCustomRoughness(prev => cvt(prev, 25.4));

        setFluidTemperature(prev => cvtTemp(prev, false)); // F -> C

        if (lineType === "gas") {
          setFlowRateUnit("MMSCFD");
        } else {
          setFlowRateUnit("m³/h"); // gpm -> m³/h
          setFlowRate(prev => cvt(prev, 1 / 4.40287));
        }
      }
    }

    setUnitSystem(newSystem);
  };

  // Operating conditions for gas (editable)
  const [inletPressure, setInletPressure] = useState<string>("12"); // User input value
  const [pressureType, setPressureType] = useState<"gauge" | "absolute">("gauge"); // New: Gauge/Abs toggle
  const [compressibilityZ, setCompressibilityZ] = useState<string>("1.0"); // Compressibility factor
  const [gasDensity60F, setGasDensity60F] = useState<string>("0.856"); // Gas density at 60°F (kg/m³)
  const [gasMolecularWeight, setGasMolecularWeight] = useState<string>("20.3"); // kg/kmol - editable for accuracy
  const [gasFlowBasis, setGasFlowBasis] = useState<"standard" | "actual">("standard"); // New: Flow Basis toggle

  // Standard/Base conditions (editable so you can match your HYSYS/project settings)
  const [baseTemperature, setBaseTemperature] = useState<string>("15.56"); // °C (60°F for MMSCFD)
  const [basePressure, setBasePressure] = useState<string>("1.01325"); // bara
  const [baseCompressibilityZ, setBaseCompressibilityZ] = useState<string>("1"); // Z at base/std

  // Gas service type selection (ENI criteria)
  const [gasServiceType, setGasServiceType] = useState<string>("Continuous");
  const [gasPressureRange, setGasPressureRange] = useState<string>("2 to 7 barg");

  // Liquid service type selection (API RP 14E criteria)
  const [liquidServiceType, setLiquidServiceType] = useState<string>("Pump Discharge (Pop < 35 barg)");

  // Liquid Physics Inputs (New)
  const [elevationChange, setElevationChange] = useState<string>("0"); // meters (+ is up/gain head, - is down/loss head? Convention: + means outlet is higher)
  const [minorLossK, setMinorLossK] = useState<string>("0"); // Dimensionless total K value

  // Mixed-phase service type selection (API RP 14E criteria)
  const [mixedPhaseServiceType, setMixedPhaseServiceType] = useState<string>("Continuous (P < 7 barg)");

  // Mixed-phase flow inputs

  // Mixed-phase flow inputs
  const [mixedGasFlowRate, setMixedGasFlowRate] = useState<string>("5");
  const [mixedGasFlowRateUnit, setMixedGasFlowRateUnit] = useState<string>("MMSCFD");
  const [mixedLiquidFlowRate, setMixedLiquidFlowRate] = useState<string>("50");
  const [mixedLiquidFlowRateUnit, setMixedLiquidFlowRateUnit] = useState<string>("m³/h");

  // Mixed-phase Operating Conditions (New)
  const [mixedOpPressure, setMixedOpPressure] = useState<string>("12"); // barg
  const [mixedOpTemp, setMixedOpTemp] = useState<string>("45"); // °C
  const [mixedGasZ, setMixedGasZ] = useState<string>("0.9"); // Z-factor at op conditions

  // Mixed-phase Fluid Properties (New)
  const [mixedGasDensity, setMixedGasDensity] = useState<string>("30"); // kg/m³ at OP conditions (keep for now as fallback or user override)
  const [mixedLiquidDensity, setMixedLiquidDensity] = useState<string>("800"); // kg/m³
  const [mixedGasViscosity, setMixedGasViscosity] = useState<string>("0.013"); // cP
  const [mixedLiquidViscosity, setMixedLiquidViscosity] = useState<string>("1.0"); // cP

  // API 14E C-Factor
  const [cFactor, setCFactor] = useState<string>("100"); // Default 100 for continuous

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

  // Get current liquid criteria
  const currentLiquidCriteria = useMemo(() => {
    return getLiquidCriteriaForService(liquidServiceType);
  }, [liquidServiceType]);

  // Get current mixed-phase criteria
  const currentMixedPhaseCriteria = useMemo(() => {
    return getMixedPhaseCriteriaForService(mixedPhaseServiceType);
  }, [mixedPhaseServiceType]);

  // Get nominal diameter as number for velocity limit lookup
  const nominalDiameterNumber = useMemo(() => {
    const nd = nominalDiameter.replace("-", ".");
    return parseFloat(nd) || 4;
  }, [nominalDiameter]);

  // Get available schedules for current diameter
  const availableSchedules = useMemo(() => {
    return getSchedulesForDiameter(nominalDiameter);
  }, [nominalDiameter]);

  // Reset schedule if not available for new diameter
  useEffect(() => {
    if (!availableSchedules.includes(schedule)) {
      setSchedule(availableSchedules[0] || "STD");
    }
  }, [nominalDiameter, availableSchedules, schedule]);

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

  // Get flow rate conversion factor (volumetric only for gas)
  const flowRateConversion = lineType === "gas"
    ? gasVolumetricFlowRateToM3s
    : liquidFlowRateToM3s;

  // Reset fluid selection when line type changes
  useEffect(() => {
    setSelectedFluid("Custom");
  }, [lineType]);

  // Reset fluid selection when line type changes


  const handleFluidChange = (value: string) => {
    setSelectedFluid(value);
    if (value === "Custom") return;

    if (lineType === "gas") {
      const fluid = commonGases.find(f => f.name === value);
      if (fluid) {
        setGasMolecularWeight(fluid.mw?.toString() || "");
        if (fluid.density) {
          setGasDensity60F(fluid.density.toString());
        } else if (fluid.mw) {
          setGasDensity60F((fluid.mw / 23.69).toFixed(4));
        }
        setViscosity(fluid.viscosity.toString());
        setViscosityUnit("cP");
      }
    } else if (lineType === "liquid") {
      const fluid = commonLiquids.find(f => f.name === value);
      if (fluid) {
        setDensity(fluid.density?.toString() || "");
        setDensityUnit("kg/m³");
        setViscosity(fluid.viscosity.toString());
        setViscosityUnit("cP");
      }
    }
  };

  // 1. Common Unit Conversions (SI) & Base Hooks
  const L_m = useMemo(() => {
    const len = parseFloat(pipeLength) || 0;
    const factor = lengthUnit === "km" ? 1000 : lengthUnit === "ft" ? 0.3048 : lengthUnit === "mi" ? 1609.34 : 1;
    return len * factor;
  }, [pipeLength, lengthUnit]);

  const D_m = useMemo(() => insideDiameterMM * 0.001, [insideDiameterMM]);

  const Q_m3s = useMemo(() => {
    return parseFloat(flowRate) * (flowRateConversion[flowRateUnit] || 0);
  }, [flowRate, flowRateUnit, flowRateConversion]);

  const epsilon_m = useMemo(() => {
    const roughnessValue = pipeMaterial === "Custom"
      ? parseFloat(customRoughness)
      : (pipeRoughness[pipeMaterial] ?? pipeRoughness["Carbon Steel (New)"]); // safe fallback
    return (roughnessValue || 0) * roughnessToMeters[roughnessUnit];
  }, [pipeMaterial, customRoughness, roughnessUnit]);

  // 2. Base / Standard Conditions (Common)
  const T_std_K = useMemo(() => (parseFloat(baseTemperature) || 15.56) + 273.15, [baseTemperature]);
  const P_std_bara = useMemo(() => parseFloat(basePressure) || 1.01325, [basePressure]);
  const Z_std_factor = useMemo(() => parseFloat(baseCompressibilityZ) || 1.0, [baseCompressibilityZ]);

  // 3. Mixed Phase Calculation (Rigorous)
  // Depends on Base Conditions
  const mixedPhaseCalc = useMemo(() => {
    if (lineType !== "mixed") return null;

    const rhoG_op = parseFloat(mixedGasDensity) || 0; // Operating density
    const rhoL = parseFloat(mixedLiquidDensity) || 800; // kg/m³

    // 1. Gas Flow Conversion (Standard to Actual)
    // Formula: Q_act = Q_std * (P_std / P_op) * (T_op / T_std) * (Z_op / Z_std)
    const Qg_std_m3s = parseFloat(mixedGasFlowRate) * (gasVolumetricFlowRateToM3s[mixedGasFlowRateUnit] || 0);

    // Rigorous Pressure
    let P_op_bara = parseFloat(mixedOpPressure) || 0;
    if (pressureType === "gauge") P_op_bara += 1.01325; // Add atm if gauge

    const T_op_K = (parseFloat(mixedOpTemp) || 15) + 273.15;
    const Z_op = parseFloat(mixedGasZ) || 0.9;

    let correctionFactor = 1.0;
    if (P_op_bara > 0 && P_std_bara > 0 && T_std_K > 0 && Z_std_factor > 0) {
      correctionFactor = (P_std_bara / P_op_bara) * (T_op_K / T_std_K) * (Z_op / Z_std_factor);
    }

    const Qg_act_m3s = Qg_std_m3s * correctionFactor;

    // 2. Liquid Flow (Actual)
    const Ql_input = parseFloat(mixedLiquidFlowRate) || 0;
    const Ql_m3s = Ql_input * (liquidFlowRateToM3s[mixedLiquidFlowRateUnit] || 0);

    // 3. Mass Flows
    const massFlowGas = Qg_act_m3s * rhoG_op;
    const massFlowLiquid = Ql_m3s * rhoL;
    const totalMassFlow = massFlowGas + massFlowLiquid;

    // 4. Homogeneous Mixture Properties
    const totalVolumetricFlow = Qg_act_m3s + Ql_m3s; // v_m * A

    // Mixture Density: ρm = (mg + ml) / Q_total (Explicit form)
    const rhoMixture = totalVolumetricFlow > 0 ? totalMassFlow / totalVolumetricFlow : 0;

    // Volume Fractions
    const lambdaG = totalVolumetricFlow > 0 ? Qg_act_m3s / totalVolumetricFlow : 0;
    const lambdaL = 1 - lambdaG;

    // Mixture Viscosity (McAdams / Volume Weighted)
    const muG_cP = parseFloat(mixedGasViscosity) || 0.01;
    const muL_cP = parseFloat(mixedLiquidViscosity) || 1.0;

    const viscosityMixture_cP = (lambdaG * muG_cP) + (lambdaL * muL_cP);
    const viscosityMixture_Pas = viscosityMixture_cP * 0.001;

    // Gas Mass Fraction
    const xG = totalMassFlow > 0 ? massFlowGas / totalMassFlow : 0;

    return {
      rhoG: rhoG_op,
      rhoL,
      muG: muG_cP,
      muL: muL_cP,
      rhoMixture,
      viscosityMixture_cP,
      viscosityMixture_Pas,
      Qg_std_m3s,
      Qg_act_m3s,
      Ql_m3s,
      totalVolumetricFlow,
      totalMassFlow,
      lambdaL,
      lambdaG,
      xG,
      correctionFactor
    };
  }, [lineType, mixedGasDensity, mixedLiquidDensity, mixedGasViscosity, mixedLiquidViscosity,
    mixedGasFlowRate, mixedGasFlowRateUnit, mixedLiquidFlowRate, mixedLiquidFlowRateUnit,
    mixedOpPressure, mixedOpTemp, mixedGasZ, pressureType, P_std_bara, T_std_K, Z_std_factor]);

  // 4. Viscosity (Depends on Mixed Phase)
  const mu = useMemo(() => {
    if (lineType === "mixed" && mixedPhaseCalc) {
      return mixedPhaseCalc.viscosityMixture_Pas;
    }
    return parseFloat(viscosity) * viscosityToPas[viscosityUnit] || 0;
  }, [viscosity, viscosityUnit, lineType, mixedPhaseCalc]);

  // =====================================================================
  // HYSYS ALIGNMENT: CORE PHYSICS ENGINE
  // =====================================================================

  // 1. Constants & Unit Conversions (Audited)
  const R_GAS_CONSTANT = 8314.462618; // J/(kmol·K)
  const G_GRAVITY = 9.80665; // m/s²
  const PATM_PA = 101325; // Standard Atm in Pa

  // 2. Process Conditions Parsing (Rigorous SI Conversion)

  // Temperature (Operating & Base)
  const T_op_K = useMemo(() => {
    const tVal = parseFloat(fluidTemperature) || 15;
    // Temp unit conversion if needed (currently implementation assumes C input for calc, but UI handles conversion?? Needs Check)
    // Actually, looking at handleUnitSystemChange, the state `fluidTemperature` is converted.
    // So we just interpret based on expected 'C' effectively if checking logic? 
    // Wait, unitSystem toggle updates the VALUE. So `fluidTemperature` is in C or F?
    // Let's assume the state `fluidTemperature` is always the number matching `temperatureUnit`.
    // But we don't have a `temperatureUnit` state variable that drives physics.
    // The legacy code assumed `fluidTemperature` was converted to C if Metric?
    // FIX: To be safe, look at `unitSystem`.
    if (unitSystem === 'imperial') {
      return (tVal - 32) * 5 / 9 + 273.15;
    }
    return tVal + 273.15;
  }, [fluidTemperature, unitSystem]);

  const T_base_K = useMemo(() => {
    const tVal = parseFloat(baseTemperature) || 15.56;
    // Base is typically entered in C? Let's assume Base is always C for now unless we add unit toggle.
    return tVal + 273.15;
  }, [baseTemperature]);

  // Pressure (Operating) -> Absolute Pa
  const P_inlet_Pa_abs = useMemo(() => {
    const pVal = parseFloat(inletPressure) || 0;
    return toPascalAbs(pVal, pressureUnit, pressureType === 'gauge');
  }, [inletPressure, pressureUnit, pressureType]);

  const P_base_Pa_abs = useMemo(() => {
    return (parseFloat(basePressure) || 1.01325) * 100000;
  }, [basePressure]);

  // fluid Properties
  const MW = parseFloat(gasMolecularWeight) || 20.3;
  const Z_op = parseFloat(compressibilityZ) || 1.0;
  const Z_base = parseFloat(baseCompressibilityZ) || 1.0;

  // 3. Flow Rate Handling (Molar Flow Basis)
  // Calculates n_dot (kmol/s) which is conserved.
  const molarFlow_kmol_s = useMemo(() => {
    if (lineType !== 'gas') return 0;
    const qVal = parseFloat(flowRate) || 0;
    if (qVal <= 0) return 0;

    // Convert input flow to SI volumetric rate (m3/s) as if it were raw volume
    // But we need to know if it's Standard or Actual volume first.
    let q_m3s_raw = 0;

    // Metric: MMSCFD, Nm3/h, Sm3/h, m3/h
    // Imperial: MMSCFD, SCFM
    // We already have `flowRateConversion` map, let's use it carefully.

    // Special handling for MMSCFD/SCFM -> They are inherently Standard.
    const isStandardUnit = ['MMSCFD', 'Nm³/h', 'Sm³/h', 'SCFM'].includes(flowRateUnit);

    // User Toggle "Standard" vs "Actual" applies primarily when unit is generic like "m3/h"
    const isBasisStandard = gasFlowBasis === 'standard' || isStandardUnit;

    // Get Raw SI Volumetric Flow (m3/s)
    q_m3s_raw = qVal * (gasVolumetricFlowRateToM3s[flowRateUnit] || 0);

    // Calculate Molar Flow
    if (isBasisStandard) {
      // n = (P_base * Q_std) / (Z_base * R * T_base)
      // Note: MMSCFD conversion factor usually includes P_base/T_base assumption (1 atm, 60F).
      // If we want rigorous, we should convert MMSCFD to "Standard m3/s" then apply Ideal Gas Law at Base Conditions?
      // Actually, 1 kmol = 23.64 Sm3 at 15C? 
      // Let's rely on the ideal gas law with user P_base/T_base for "m3/h" types.
      // For MMSCFD, it is strictly 60F/1atm. 
      if (flowRateUnit === 'MMSCFD') {
        // 1 MMSCFD = 1177.6 kg/hr for Air? No, depends on MW.
        // 1 lb-mol = 379.48 SCF. 
        // 1 MMSCF = 1,000,000 / 379.48 = 2635.18 lbmol.
        // Convert to kmol: 2635.18 * 0.45359 = 1195 kmol (per day).
        // Per second: 1195 / 86400 = 0.0138 kmol/s.
        // Let's use rigorous conversion.
        const kmol_per_day = qVal * 1000000 / 379.48 / 2.20462; // Check constant 379.48 is for 60F/14.696psi
        // Better: Use the q_m3s_raw which converts to "Standard m3/s".
        // If q_m3s_raw is correct "Standard m3/s", then:
        return (P_base_Pa_abs * q_m3s_raw) / (Z_base * R_GAS_CONSTANT * T_base_K);
      }

      return (P_base_Pa_abs * q_m3s_raw) / (Z_base * R_GAS_CONSTANT * T_base_K);
    } else {
      // Actual Flow
      // n = (P_op * Q_act) / (Z_op * R * T_op)
      return (P_inlet_Pa_abs * q_m3s_raw) / (Z_op * R_GAS_CONSTANT * T_op_K);
    }
  }, [flowRate, flowRateUnit, gasFlowBasis, P_inlet_Pa_abs, T_op_K, Z_op, P_base_Pa_abs, T_base_K, Z_base, lineType]);

  // 4. Density Calculation (Rigorous)
  // At Inlet
  const rhoInlet = useMemo(() => {
    if (lineType === 'gas') {
      return (P_inlet_Pa_abs * MW) / (Z_op * R_GAS_CONSTANT * T_op_K);
    }
    if (lineType === 'liquid') {
      const dVal = parseFloat(density) || 1000;
      return dVal * (densityToKgM3[densityUnit] || 1);
    }
    if (lineType === 'mixed' && mixedPhaseCalc) return mixedPhaseCalc.rhoMixture;
    return 0;
  }, [lineType, P_inlet_Pa_abs, MW, Z_op, T_op_K, density, densityUnit, mixedPhaseCalc]);

  // 5. Viscosity (Convert to Pa·s)
  const viscosityPas = useMemo(() => {
    if (lineType === 'mixed' && mixedPhaseCalc) return mixedPhaseCalc.viscosityMixture_Pas;
    const vVal = parseFloat(viscosity) || (lineType === 'gas' ? 0.01 : 1);
    return vVal * (viscosityToPas[viscosityUnit] || 0.001);
  }, [viscosity, viscosityUnit, lineType, mixedPhaseCalc]);

  // 6. CORE HYDRAULIC CALCULATION (Segmented)
  const hydraulicResult = useMemo(() => {
    if (L_m <= 0 || D_m <= 0) return null;

    // --- LIQUID PHYSICS (Incompressible) ---
    if (lineType === 'liquid') {
      // Properties
      const rho = rhoInlet;
      const mu = viscosityPas;

      let Q_total_m3s = 0;
      Q_total_m3s = Q_m3s;

      if (Q_total_m3s <= 0) return null;

      const Area = Math.PI * Math.pow(D_m / 2, 2);
      const v = Q_total_m3s / Area;
      const Re = (rho * v * D_m) / mu;

      // Friction Factor (Swamee-Jain equivalent)
      let f = 0.02;
      if (Re < 2300) {
        f = 64 / Re;
      } else {
        const rr = epsilon_m / D_m;
        f = 0.25 / Math.pow(Math.log10(rr / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
      }

      // 1. Frictional Loss (Darcy)
      const dP_fric_Pa = f * (L_m / D_m) * 0.5 * rho * Math.pow(v, 2);

      // 2. Minor Losses
      const K = parseFloat(minorLossK) || 0;
      const dP_minor_Pa = K * 0.5 * rho * Math.pow(v, 2);

      // 3. Static Head (Elevation)
      const dz = parseFloat(elevationChange) || 0;
      const dP_static_Pa = rho * G_GRAVITY * dz;

      const dP_total_Pa = dP_fric_Pa + dP_minor_Pa + dP_static_Pa;
      const dP_bar = dP_total_Pa / 100000;

      return {
        velocity: v, // Constant velocity for liquid
        maxVelocity: v,
        reynoldsNumber: Re,
        frictionFactor: f,
        pressureDropPa: dP_total_Pa,
        pressureDropBar: dP_bar,
        pressureDropBarKm: (dP_bar / L_m) * 1000,
        rhoVSquared: rho * v * v,
        outletPressurePa: P_inlet_Pa_abs - dP_total_Pa,
        avgDensity: rho,
        machNumber: 0,
      };
    }

    // --- MIXED-PHASE PHYSICS (Beggs & Brill) ---
    if (lineType === 'mixed' && mixedPhaseCalc) {
      const rhoL = mixedPhaseCalc.rhoL;
      const rhoG = mixedPhaseCalc.rhoG;
      const muL = mixedPhaseCalc.muL * 0.001;
      const muG = mixedPhaseCalc.muG * 0.001;

      const Ql = mixedPhaseCalc.Ql_m3s;
      const Qg = mixedPhaseCalc.Qg_act_m3s;
      const Q_total = Ql + Qg;
      if (Q_total <= 0) return null;

      const Area = Math.PI * Math.pow(D_m / 2, 2);
      const vsl = Ql / Area;
      const vsg = Qg / Area;
      const vm = vsl + vsg;
      const lambdaL = vm > 0 ? vsl / vm : 0;

      const nFr = (vm * vm) / (G_GRAVITY * D_m);
      const regime = getBeggsBrillRegime(lambdaL, nFr);
      const holdup = getBeggsBrillHoldup(lambdaL, nFr, regime);

      const rhoMix = rhoL * holdup + rhoG * (1 - holdup);
      const muMix = muL * holdup + muG * (1 - holdup);

      const Re = (rhoMix * vm * D_m) / Math.max(muMix, 1e-12);
      let f = 0.02;
      if (Re < 2300) {
        f = 64 / Re;
      } else {
        const rr = epsilon_m / D_m;
        f = 0.25 / Math.pow(Math.log10(rr / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
      }

      const dP_fric_Pa = f * (L_m / D_m) * 0.5 * rhoMix * Math.pow(vm, 2);
      const K = parseFloat(minorLossK) || 0;
      const dP_minor_Pa = K * 0.5 * rhoMix * Math.pow(vm, 2);
      const dz = parseFloat(elevationChange) || 0;
      const dP_static_Pa = rhoMix * G_GRAVITY * dz;

      const dP_total_Pa = dP_fric_Pa + dP_minor_Pa + dP_static_Pa;

      return {
        velocity: vm,
        maxVelocity: vm,
        reynoldsNumber: Re,
        frictionFactor: f,
        pressureDropPa: dP_total_Pa,
        pressureDropBar: dP_total_Pa / 100000,
        pressureDropBarKm: (dP_total_Pa / 100000 / L_m) * 1000,
        rhoVSquared: rhoMix * vm * vm,
        outletPressurePa: Math.max(P_inlet_Pa_abs - dP_total_Pa, 0),
        avgDensity: rhoMix,
        machNumber: 0,
        flowRegime: `Mixed (${regime})`,
      };
    }

    // --- GAS PHYSICS (Segmented Compressible) ---
    if (lineType === 'gas' && molarFlow_kmol_s > 0) {
      const SEGMENTS = 20;
      const dL = L_m / SEGMENTS;
      const Area = Math.PI * Math.pow(D_m / 2, 2);

      let P_current = P_inlet_Pa_abs;
      let dP_accumulated = 0;
      let f_accumulated = 0;
      let v_inlet = 0;
      let rho_inlet_val = 0;
      let rho_avg_accum = 0;
      let segmentsUsed = 0;

      for (let i = 0; i < SEGMENTS; i++) {
        // Isothermal check: P_current
        if (P_current <= 0) break;

        // 1. Density at Node
        const rho_node = (P_current * MW) / (Z_op * R_GAS_CONSTANT * T_op_K);

        // 2. Actual Flow at Node
        const Q_act_node = (molarFlow_kmol_s * Z_op * R_GAS_CONSTANT * T_op_K) / P_current;

        // 3. Velocity
        const v_node = Q_act_node / Area;

        if (i === 0) {
          rho_inlet_val = rho_node;
          v_inlet = v_node;
        }

        // 4. Reynolds
        const Re_node = (rho_node * v_node * D_m) / viscosityPas;

        // 5. Friction Factor
        let f_node = 0.02;
        if (Re_node < 2300) {
          f_node = 64 / Re_node;
        } else {
          const rr = epsilon_m / D_m;
          f_node = 0.25 / Math.pow(Math.log10(rr / 3.7 + 5.74 / Math.pow(Re_node, 0.9)), 2);
        }

        // 6. dP Segment
        const dP_seg = f_node * (dL / D_m) * 0.5 * rho_node * Math.pow(v_node, 2);

        P_current -= dP_seg;
        dP_accumulated += dP_seg;
        rho_avg_accum += rho_node;
        f_accumulated += f_node;
        segmentsUsed += 1;
      }

      if (segmentsUsed === 0 || P_current <= 0) return null;

      // Outlet calc
      const Q_act_outlet = (molarFlow_kmol_s * Z_op * R_GAS_CONSTANT * T_op_K) / P_current;
      const v_outlet = Q_act_outlet / Area;

      const rho_avg = rho_avg_accum / segmentsUsed;
      const f_avg = f_accumulated / segmentsUsed;

      // 7. Minor Losses (K-factor) and Static Head
      const K = parseFloat(minorLossK) || 0;
      const dP_minor_Pa = K * 0.5 * rho_avg * Math.pow(v_outlet, 2);
      const dz = parseFloat(elevationChange) || 0;
      const dP_static_Pa = rho_avg * G_GRAVITY * dz;

      const dP_total_Pa = dP_accumulated + dP_minor_Pa + dP_static_Pa;
      const outletPressurePa = Math.max(P_current - dP_minor_Pa - dP_static_Pa, 0);

      // Mach Approx (k=1.3)
      const k = 1.3;
      const c_sound = Math.sqrt((k * Z_op * R_GAS_CONSTANT * T_op_K) / MW);
      const mach = v_outlet / c_sound;

      return {
        velocity: v_inlet,
        maxVelocity: v_outlet,
        velocityInlet: v_inlet,
        reynoldsNumber: (rho_inlet_val * v_inlet * D_m) / viscosityPas,
        frictionFactor: f_avg,
        pressureDropPa: dP_total_Pa,
        pressureDropBar: dP_total_Pa / 100000,
        pressureDropBarKm: (dP_total_Pa / 100000 / L_m) * 1000,
        outletPressurePa,
        avgDensity: rho_avg,
        rhoVSquared: rho_inlet_val * v_inlet * v_inlet, // Use max? Gas criteria usually implies max dynamic pressure? No, typically check momentum at highest velocity.
        // Let's use Outlet Rho * Outlet V^2 ?
        // Rho_out * V_out^2 = (P_out*MW/ZRT) * (n*ZRT/P_out / A)^2 = P_out * const * 1/P_out^2 = const / P_out.
        // As P drops, V increases, Rho decreases. 
        // Momentum (rho v^2) typically increases as pressure drops.
        // Let's report max Rho V^2 (at outlet).
        maxRhoVSquared: ((outletPressurePa * MW) / (Z_op * R_GAS_CONSTANT * T_op_K)) * Math.pow(v_outlet, 2),
        machNumber: mach
      };
    }
    return null;
  }, [L_m, D_m, lineType, Q_m3s, molarFlow_kmol_s, P_inlet_Pa_abs, T_op_K, Z_op, MW, viscosityPas, epsilon_m, mixedPhaseCalc, minorLossK, elevationChange, density, densityUnit, R_GAS_CONSTANT]);

  // 7. Map Results to UI Variables
  const velocity = hydraulicResult?.maxVelocity || hydraulicResult?.velocity || 0;
  const reynoldsNumber = hydraulicResult?.reynoldsNumber || 0;
  const frictionFactor = hydraulicResult?.frictionFactor || 0;

  const pressureDropPa = hydraulicResult?.pressureDropPa || 0;
  const pressureDropBar = useMemo(() => {
    return pressureDropPa / 100000;
  }, [pressureDropPa]);

  // Convert for Display
  const pressureDrop = useMemo(() => {
    return pressureDropPa * (pressureFromPa[pressureUnit] || 0.00001);
  }, [pressureDropPa, pressureUnit]);

  const pressureDropPer100m = useMemo(() => {
    if (L_m <= 0) return 0;
    // API 14E criteria are defined in bar/100m
    return (pressureDropBar * 100) / L_m;
  }, [pressureDropBar, L_m]);

  const headLoss = useMemo(() => {
    // hL = dP / (rho g)
    const r = hydraulicResult?.avgDensity || rhoInlet || 1;
    return pressureDropPa / (r * G_GRAVITY);
  }, [pressureDropPa, hydraulicResult, rhoInlet]);

  const flowRegime = useMemo(() => {
    if (hydraulicResult?.flowRegime) return hydraulicResult.flowRegime;
    if (reynoldsNumber < 2300) return "Laminar";
    if (reynoldsNumber < 4000) return "Transitional";
    return "Turbulent";
  }, [hydraulicResult, reynoldsNumber]);

  const rhoVSquared = hydraulicResult?.maxRhoVSquared || hydraulicResult?.rhoVSquared || 0;
  const machNumber = hydraulicResult?.machNumber || 0;
  const rho = hydraulicResult?.avgDensity || rhoInlet; // For legacy downstream checks if any

  // API 14E Erosional Velocity
  const erosionalVelocity = useMemo(() => {
    const c = parseFloat(cFactor) || 100;
    // Ve(m/s) = (C / sqrt(rho_lb_ft3)) * 0.3048
    const r_use = rho > 0 ? rho : 1;
    const rho_imp = r_use / 16.0185;
    const ve_ft = c / Math.sqrt(rho_imp);
    return ve_ft * 0.3048;
  }, [rho, cFactor]);

  const isValidInput = L_m > 0 && D_m > 0 && Q_m3s > 0 && rho > 0 && mu > 0;



  // Get current ENI gas sizing criteria based on service type and pressure range
  const currentGasCriteria = useMemo(() => {
    return getCriteriaForServiceAndPressure(gasServiceType, gasPressureRange);
  }, [gasServiceType, gasPressureRange]);

  // Line Sizing Criteria based on API 14E for gas, liquid, and mixed
  const sizingCriteria = useMemo(() => {
    if (lineType === "gas" && currentGasCriteria) {
      // Gas - API RP 14E / Custom Table
      const pressureDropBarPer100m = currentGasCriteria.pressureDropBarKm
        ? currentGasCriteria.pressureDropBarKm / 10
        : null;

      return {
        minVelocity: 0, // No minimum for gas
        maxVelocity: currentGasCriteria.velocityMs,
        maxRhoVSquared: currentGasCriteria.rhoV2Limit, // Re-enabled
        maxPressureDropPer100m: pressureDropBarPer100m,
        maxPressureDropBarKm: currentGasCriteria.pressureDropBarKm,
        maxMach: currentGasCriteria.machLimit,
        note: currentGasCriteria.note,
        service: currentGasCriteria.service,
        pressureRange: currentGasCriteria.pressureRange,
        cValue: currentGasCriteria.cValue, // Pass C-value if needed
      };
    } else if (lineType === "liquid" && currentLiquidCriteria) {
      // Liquid - Table 8.2.1.1
      const velocityLimit = getLiquidVelocityLimit(currentLiquidCriteria, nominalDiameterNumber);
      const pressureDropBarPer100m = currentLiquidCriteria.pressureDropBarKm
        ? currentLiquidCriteria.pressureDropBarKm / 10
        : null;

      return {
        minVelocity: liquidServiceType.includes("Sulphur") ? 0.9 : 0.3,
        maxVelocity: velocityLimit,
        maxRhoVSquared: null,
        maxPressureDropPer100m: pressureDropBarPer100m,
        maxPressureDropBarKm: currentLiquidCriteria.pressureDropBarKm,
        maxMach: null,
        note: null,
        service: currentLiquidCriteria.service,
        pressureRange: null,
      };
    } else if (lineType === "mixed" && currentMixedPhaseCriteria) {
      // Mixed-phase
      return {
        minVelocity: 0,
        maxVelocity: null,
        maxRhoVSquared: currentMixedPhaseCriteria.rhoV2Limit,
        maxPressureDropPer100m: null,
        maxPressureDropBarKm: null,
        maxMach: currentMixedPhaseCriteria.machLimit,
        note: currentMixedPhaseCriteria.note,
        service: currentMixedPhaseCriteria.service,
        pressureRange: null,
        cValue: currentMixedPhaseCriteria.cValue,
      };
    } else {
      // Default fallback
      return {
        minVelocity: 0.9,
        maxVelocity: 4.6,
        maxRhoVSquared: 15000,
        maxPressureDropPer100m: 1.0,
        maxPressureDropBarKm: 10,
        maxMach: null,
        note: null,
        service: null,
        pressureRange: null,
      };
    }
  }, [lineType, currentGasCriteria, currentLiquidCriteria, currentMixedPhaseCriteria, nominalDiameterNumber, liquidServiceType]);

  // API 14E Erosional Velocity Calculation
  // Ve = C / sqrt(ρm) where C is configurable (default 100) and ρm is in lb/ft³
  // Moved here to be after sizingCriteria
  // Restore Aliases for legacy export/results compatibility
  const T_operating_K = T_op_K;
  const Z_factor = Z_op;
  const P_operating_bara = P_inlet_Pa_abs / 100000;

  // Placeholders for specific export fields if needed
  const rhoGasStandard = 0;
  const rhoGasOperating = rho;

  // ========== RESULTS CALCULATION (API 14E) ==========
  // Metadata for Export - RESTORED
  const [companyName, setCompanyName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [itemNumber, setItemNumber] = useState("");
  const [serviceName, setServiceName] = useState("");

  // Pressure (Operating) -> Absolute Pa
  // Mapping rigorous results to UI
  const results = useMemo(() => {
    if (!hydraulicResult) return null;

    const {
      velocity, reynoldsNumber, frictionFactor,
      pressureDropPa, pressureDropBar, pressureDropBarKm,
      rhoVSquared, machNumber: calcMach, maxVelocity,
      // erosionalVelocity: calcErosional // Not returned by engine yet
    } = hydraulicResult;

    // Check Limits
    let velocityLimit = 999;
    let dPWarning = false;
    let velocityWarning = false;
    let momentumWarning = false;
    let machWarning = false;

    let cValueLimit: number | null = null;
    let erosionalVelocity = 0;

    // Re-calculate erosional velocity for display if not in engine
    // Ve = C / sqrt(rho)
    // We use C-Factor from state (cFactor) or criteria (cValueLimit)
    // Default C is 100 continuous, 125 intermittent
    const densityForErosion = rhoInlet || 1; // Avoid div by zero
    // Convert density to lb/ft3 for API 14E formula
    const rho_imp = densityForErosion / 16.018463;

    // Get C-Value from Criteria OR User Input (if mixed)
    // For now, use the user input `cFactor` as base, unless Criteria overrides.
    let cVal = parseFloat(cFactor) || 100;

    if (lineType === "mixed" && currentMixedPhaseCriteria?.cValue) {
      cVal = currentMixedPhaseCriteria.cValue;
      cValueLimit = cVal;
    }
    // Calculate Ve (ft/s) then convert to m/s
    const ve_ft = cVal / Math.sqrt(rho_imp);
    erosionalVelocity = ve_ft * 0.3048;

    // Limits Logic (Consolidated)
    if (lineType === "gas" && currentGasCriteria) {
      // 1. Velocity
      const vLimitAbs = currentGasCriteria.velocityMs;
      if (vLimitAbs !== null) {
        if (maxVelocity > vLimitAbs) velocityWarning = true;
        velocityLimit = vLimitAbs;
      }
      // 2. Momentum
      if (currentGasCriteria.rhoV2Limit !== null) {
        if (rhoVSquared > currentGasCriteria.rhoV2Limit) momentumWarning = true;
      }
      // 3. Mach
      if (currentGasCriteria.machLimit !== null) {
        if (calcMach > currentGasCriteria.machLimit) machWarning = true;
      }
      // 4. dP
      if (currentGasCriteria.pressureDropBarKm !== null) {
        if (pressureDropBarKm > currentGasCriteria.pressureDropBarKm) dPWarning = true;
      }
    }

    if (lineType === "liquid" && currentLiquidCriteria) {
      const vLimit = getLiquidVelocityLimit(currentLiquidCriteria, nominalDiameterNumber);
      velocityLimit = vLimit || 15;
      if (maxVelocity > velocityLimit) velocityWarning = true;
      if (currentLiquidCriteria.pressureDropBarKm && pressureDropBarKm > currentLiquidCriteria.pressureDropBarKm) {
        dPWarning = true;
      }
    }

    if (lineType === "mixed" && currentMixedPhaseCriteria) {
      cValueLimit = currentMixedPhaseCriteria.cValue;
      if (currentMixedPhaseCriteria.rhoV2Limit) {
        if (rhoVSquared > currentMixedPhaseCriteria.rhoV2Limit) momentumWarning = true;
      }
      // Mach forbidden
    }

    return {
      velocity: maxVelocity, // Use max
      reynoldsNumber,
      frictionFactor,
      dP_per_m: pressureDropPa / L_m,
      dP_total_bar: pressureDropBar,
      dP_bar_km: pressureDropBarKm,
      flowRegime,
      velocityLimit,
      erosionalVelocity,
      cValueLimit,
      dP_limit: (lineType === "gas" ? currentGasCriteria?.pressureDropBarKm : currentLiquidCriteria?.pressureDropBarKm) || null,
      velWarning: velocityWarning || momentumWarning || machWarning,
      velocityWarning,
      momentumWarning,
      machWarning,
      dPWarning,
      rhoVSquared,
      rhoV2Limit: sizingCriteria.maxRhoVSquared,
      machNumber: calcMach,
      machLimit: sizingCriteria.maxMach,
      erosionalRatio: erosionalVelocity > 0 ? maxVelocity / erosionalVelocity : 0
    };
  }, [hydraulicResult, lineType, currentGasCriteria, currentLiquidCriteria, currentMixedPhaseCriteria, sizingCriteria, nominalDiameterNumber, cFactor, rhoInlet, L_m]);

  // Status check function based on API 14E criteria
  const getStatusIndicator = () => {
    if (!results) return { pressureDrop: "na" as const, velocity: "na" as const, rhoVSquared: "na" as const, mach: "na" as const };

    const pressureDropLimit = sizingCriteria.maxPressureDropBarKm !== null;
    const velocityLimit = sizingCriteria.maxVelocity !== null;
    const rhoV2Limit = sizingCriteria.maxRhoVSquared !== null;
    const machLimit = sizingCriteria.maxMach !== null;

    return {
      pressureDrop: pressureDropLimit ? (results.dPWarning ? "warning" as const : "ok" as const) : "na" as const,
      velocity: velocityLimit ? (results.velWarning ? "warning" as const : "ok" as const) : "na" as const,
      rhoVSquared: rhoV2Limit ? (results.momentumWarning ? "warning" as const : "ok" as const) : "na" as const,
      mach: machLimit ? (results.machWarning ? "warning" as const : "ok" as const) : "na" as const,
    };
  };

  const status = getStatusIndicator();

  const StatusIcon = ({ type }: { type: "ok" | "warning" | "na" }) => {
    if (type === "ok") {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (type === "na") {
      return null;
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  // Determine phase icon and title based on line type
  const PhaseIcon = lineType === "gas" ? Wind : lineType === "liquid" ? Droplets : Waves;
  const phaseTitle = lineType === "gas" ? "Gas Line Sizing" : lineType === "liquid" ? "Liquid Line Sizing" : "Mixed-Phase Line Sizing";
  const phaseSubtitle = "Best Practice Sizing Criteria as per API RP 14E";

  // Get current calculation method details

  const handleExportPDF = () => {
    try {
      const datasheetData: HydraulicDatasheetData = {
        // companyName, projectName, etc. removed per request
        lineType: lineType as 'gas' | 'liquid' | 'mixed',
        date: new Date().toLocaleDateString(),

        nominalDiameter,
        schedule,
        insideDiameterMM,
        pipeLength,
        lengthUnit,
        flowRate,
        flowRateUnit,
        inletPressure,
        pressureUnit,
        temperature: fluidTemperature,
        pipeMaterial,
        roughness: epsilon_m, // in meters

        fluidDensity: rho,
        fluidViscosity: parseFloat(viscosity) * (unitSystem === 'metric' ? 1 : 1), // simplified, we store unit
        molecularWeight: lineType === 'gas' ? MW : undefined,
        compressibilityZ: lineType === 'gas' ? Z_factor : undefined,

        velocity,
        reynoldsNumber,
        flowRegime,
        frictionFactor: frictionFactor > 0 ? frictionFactor : 0,
        pressureDrop: pressureDrop,
        pressureDropUnit: pressureUnit,
        pressureDropPer100m: pressureDropPer100m,
        headLoss,
        erosionalVelocity,
        rhoVSquared: rho * Math.pow(velocity, 2),

        sizingCriteria: {
          maxVelocity: sizingCriteria.maxVelocity,
          maxPressureDropPer100m: sizingCriteria.maxPressureDropPer100m,
          maxRhoVSquared: sizingCriteria.maxRhoVSquared,
          serviceType: sizingCriteria.service || '',
        },

        status: status as any
      };

      generateHydraulicPDF(datasheetData);
      toast({
        title: "PDF Exported",
        description: "Hydraulic sizing datasheet has been downloaded.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Failed",
        description: "An error occurred during PDF generation.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const excelData: HydraulicExcelData = {
        // companyName, projectName, etc. removed per request
        lineType: lineType as 'gas' | 'liquid' | 'mixed',
        date: new Date().toLocaleDateString(),

        nominalDiameter,
        schedule,
        insideDiameterMM,
        pipeLength,
        lengthUnit,
        flowRate,
        flowRateUnit,
        inletPressure,
        pressureUnit,
        temperature: fluidTemperature,
        pipeMaterial,
        roughness: epsilon_m,

        fluidDensity: rho,
        fluidViscosity: parseFloat(viscosity), // unit assumed from state
        molecularWeight: lineType === 'gas' ? MW : undefined,
        compressibilityZ: lineType === 'gas' ? Z_factor : undefined,

        velocity,
        reynoldsNumber,
        flowRegime,
        frictionFactor: frictionFactor > 0 ? frictionFactor : 0,
        pressureDrop,
        pressureDropUnit: pressureUnit,
        pressureDropPer100m,
        headLoss,
        erosionalVelocity,
        rhoVSquared: rho * Math.pow(velocity, 2),

        sizingCriteria: {
          maxVelocity: sizingCriteria.maxVelocity,
          maxPressureDropPer100m: sizingCriteria.maxPressureDropPer100m,
          maxRhoVSquared: sizingCriteria.maxRhoVSquared,
          serviceType: sizingCriteria.service || '',
        }
      };

      generateHydraulicExcelDatasheet(excelData);
      toast({
        title: "Excel Exported",
        description: "Hydraulic sizing datasheet has been downloaded.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Failed",
        description: "An error occurred during Excel generation.",
        variant: "destructive",
      });
    }
  };



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
                  {lineType === "gas" ? "Gas" : lineType === "liquid" ? "Liquid" : "Mixed-Phase"} <span className="text-primary">Line Sizing</span>
                </h2>
                <p className="text-muted-foreground">
                  {phaseSubtitle}
                </p>
              </div>
            </div>

            {/* Unit System Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              <span className={`text-sm font-medium ${unitSystem === 'metric' ? 'text-primary' : 'text-muted-foreground'}`}>
                Metric
              </span>
              <Switch
                checked={unitSystem === 'imperial'}
                onCheckedChange={handleUnitSystemChange}
              />
              <span className={`text-sm font-medium ${unitSystem === 'imperial' ? 'text-primary' : 'text-muted-foreground'}`}>
                Imperial
              </span>
            </div>


          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calculator" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-secondary/30 p-1 rounded-full">
            <TabsTrigger value="calculator" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Calculator
            </TabsTrigger>
            <TabsTrigger value="guide" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Standards Guide
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calculator" className="space-y-6">
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
                            {currentGasCriteria.rhoV2Limit !== null && (
                              <p>Momentum (ρv²): ≤ {currentGasCriteria.rhoV2Limit.toLocaleString()} kg/m·s²</p>
                            )}
                            {currentGasCriteria.machLimit !== null && (
                              <p>Mach: ≤ {currentGasCriteria.machLimit}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Liquid Service Type (API RP 14E Criteria) - Only show for liquid lines */}
                  {lineType === "liquid" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Service Type</Label>
                        <Select value={liquidServiceType} onValueChange={setLiquidServiceType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {liquidServiceTypes.map((service) => (
                              <SelectItem key={service} value={service}>
                                {service}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Show current criteria */}
                      {currentLiquidCriteria && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                          <p className="text-xs font-medium text-primary">Recommended Limits</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {currentLiquidCriteria.pressureDropBarKm !== null && (
                              <p>ΔP: ≤ {currentLiquidCriteria.pressureDropBarKm} bar/km</p>
                            )}
                            {sizingCriteria.maxVelocity !== null && (
                              <p>Velocity: ≤ {sizingCriteria.maxVelocity} m/s</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Mixed-Phase Service Type (API RP 14E Criteria) - Only show for mixed-phase lines */}
                  {lineType === "mixed" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Service Type</Label>
                        <Select value={mixedPhaseServiceType} onValueChange={setMixedPhaseServiceType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {mixedPhaseServiceTypes.map((service) => (
                              <SelectItem key={service} value={service}>
                                {service}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Show current criteria */}
                      {currentMixedPhaseCriteria && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                          <p className="text-xs font-medium text-primary">Recommended Limits</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {currentMixedPhaseCriteria.rhoV2Limit !== null && (
                              <p>Momentum (ρv²): ≤ {currentMixedPhaseCriteria.rhoV2Limit.toLocaleString()} kg/m·s²</p>
                            )}
                            {currentMixedPhaseCriteria.machLimit !== null && (
                              <p>Mach: ≤ {currentMixedPhaseCriteria.machLimit}</p>
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
                          {lengthUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
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
                          {diameterUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
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
                            {roughnessUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
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
                  {/* Fluid Type Selection - Top of Flow Properties */}
                  {lineType !== "mixed" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fluid Type</Label>
                      <Select value={selectedFluid} onValueChange={handleFluidChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {lineType === "gas" ? (
                            <>
                              <SelectItem value="Custom">Custom Gas</SelectItem>
                              {commonGases.map(g => (
                                <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                              ))}
                            </>
                          ) : (
                            <>
                              <SelectItem value="Custom">Custom Liquid</SelectItem>
                              {commonLiquids.map(l => (
                                <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Temperature */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Temperature (°C)</Label>
                    <Input
                      type="number"
                      value={fluidTemperature}
                      onChange={(e) => setFluidTemperature(e.target.value)}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder={lineType === "gas" ? "15.56" : "25"}
                    />
                  </div>

                  {/* Flow Rate - Gas and Liquid lines */}
                  {lineType !== "mixed" && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Flow Rate</Label>
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
                            {flowRateUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Flow Basis Toggle for Gas */}
                      {lineType === "gas" && (
                        <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-md border border-border/50">
                          <Label className="text-xs font-medium text-muted-foreground">Flow Basis</Label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setGasFlowBasis("standard")}
                              className={`px-3 py-1 text-xs rounded-md transition-colors ${gasFlowBasis === "standard" ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                            >
                              Standard
                            </button>
                            <button
                              onClick={() => setGasFlowBasis("actual")}
                              className={`px-3 py-1 text-xs rounded-md transition-colors ${gasFlowBasis === "actual" ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                            >
                              Actual
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {gasFlowBasis === "standard"
                              ? "Flow is at standard conditions (Ref. T_std, P_std). Converted to actual for velocity."
                              : "Flow is at operating inlet conditions (Ref. T_op, P_op)."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mixed-Phase Flow Inputs */}
                  {lineType === "mixed" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Gas Flow Rate</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={mixedGasFlowRate}
                            onChange={(e) => setMixedGasFlowRate(e.target.value)}
                            className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="5"
                          />
                          <Select value={mixedGasFlowRateUnit} onValueChange={setMixedGasFlowRateUnit}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(gasVolumetricFlowRateToM3s).map((unit) => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Liquid Flow Rate</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={mixedLiquidFlowRate}
                            onChange={(e) => setMixedLiquidFlowRate(e.target.value)}
                            className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="50"
                          />
                          <Select value={mixedLiquidFlowRateUnit} onValueChange={setMixedLiquidFlowRateUnit}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(liquidFlowRateToM3s).map((unit) => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Operating Conditions for Mixed Phase (P-T-Z) */}
                      <div className="pt-3 border-t border-border mt-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 font-semibold text-primary">Operating Conditions (Required for Gas actual flow)</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Op. Pressure</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={mixedOpPressure}
                              onChange={(e) => setMixedOpPressure(e.target.value)}
                              className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Select value={pressureType} onValueChange={(v: any) => setPressureType(v)}>
                              <SelectTrigger className="w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gauge">Gauge</SelectItem>
                                <SelectItem value="absolute">Abs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Op. Temp (°C)</Label>
                          <Input
                            type="number"
                            value={mixedOpTemp}
                            onChange={(e) => setMixedOpTemp(e.target.value)}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Gas Z-Factor</Label>
                          <Input
                            type="number"
                            value={mixedGasZ}
                            onChange={(e) => setMixedGasZ(e.target.value)}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none"
                            placeholder="0.9"
                          />
                        </div>
                      </div>

                      {/* Fluid Properties Split for Mixed Phase */}
                      <div className="pt-3 border-t border-border mt-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 font-semibold text-primary">Component Properties</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Gas Density @ Op. Cond. (kg/m³)</Label>
                        <Input
                          type="number"
                          value={mixedGasDensity}
                          onChange={(e) => setMixedGasDensity(e.target.value)}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="30"
                        />
                        <p className="text-[10px] text-muted-foreground">Used for mass flow calculation</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Liquid Density (kg/m³)</Label>
                        <Input
                          type="number"
                          value={mixedLiquidDensity}
                          onChange={(e) => setMixedLiquidDensity(e.target.value)}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Gas Viscosity (cP)</Label>
                          <Input
                            type="number"
                            value={mixedGasViscosity}
                            onChange={(e) => setMixedGasViscosity(e.target.value)}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Liq. Viscosity (cP)</Label>
                          <Input
                            type="number"
                            value={mixedLiquidViscosity}
                            onChange={(e) => setMixedLiquidViscosity(e.target.value)}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                      </div>

                      {/* API 14E C-Factor */}
                      <div className="space-y-2 mt-2">
                        <Label className="text-sm font-medium">API 14E C-Factor</Label>
                        <Input
                          type="number"
                          value={cFactor}
                          onChange={(e) => setCFactor(e.target.value)}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="100"
                        />
                        <p className="text-[10px] text-muted-foreground">Standard: 100 for Continuous, 125 for Intermittent</p>
                      </div>

                      {/* Mixed-phase calculated properties */}
                      {mixedPhaseCalc && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2 mt-4">
                          <p className="text-xs font-medium text-primary flex items-center gap-1">
                            <Info className="w-3 h-3" /> Homogeneous Mixture Results
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">ρ<sub>mix</sub>:</span>
                              <span className="font-mono ml-1 text-primary font-bold">{mixedPhaseCalc.rhoMixture.toFixed(2)} kg/m³</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">μ<sub>mix</sub>:</span>
                              <span className="font-mono ml-1">{mixedPhaseCalc.viscosityMixture_cP.toFixed(3)} cP</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">λ<sub>L</sub> (No-Slip):</span>
                              <span className="font-mono ml-1">{(mixedPhaseCalc.lambdaL * 100).toFixed(1)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Correction:</span>
                              <span className="font-mono ml-1">{mixedPhaseCalc.correctionFactor.toFixed(3)}x</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Q<sub>g,act</sub>:</span>
                              <span className="font-mono ml-1">{(mixedPhaseCalc.Qg_act_m3s * 3600).toFixed(1)} m³/h</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Fluid Density - Only shown for liquid */}
                  {lineType === "liquid" && (
                    <div className="space-y-2">
                      {/* Fluid Selection for Liquid */}
                      <div className="hidden">
                        <Label className="text-sm font-medium">Fluid Type</Label>
                        <Select value={selectedFluid} onValueChange={handleFluidChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Custom">Custom Liquid</SelectItem>
                            {commonLiquids.map(l => (
                              <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Label className="text-sm font-medium">Fluid Density (ρ)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={density}
                          onChange={(e) => setDensity(e.target.value)}
                          disabled={selectedFluid !== "Custom"}
                          className={`flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedFluid !== "Custom" ? "bg-muted/50" : ""}`}
                          placeholder="1000"
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
                  )}

                  {/* Dynamic Viscosity */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Dynamic Viscosity (μ)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={viscosity}
                        onChange={(e) => setViscosity(e.target.value)}
                        disabled={selectedFluid !== "Custom" && (lineType === "gas" || lineType === "liquid")}
                        className={`flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedFluid !== "Custom" && (lineType === "gas" || lineType === "liquid") ? "bg-muted/50" : ""}`}
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

                  {/* Liquid Physics - Elevation and Minor Losses */}
                  {lineType === "liquid" && (
                    <div className="p-4 rounded-lg bg-secondary/20 border border-border space-y-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hydraulic Details (HYSYS Segment)</p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Elevation Change (Total)</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              value={elevationChange}
                              onChange={(e) => setElevationChange(e.target.value)}
                              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none bg-background/50 border-input/60"
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">m</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Positive = Gain elevation (Pressure Drop)</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Minor Losses (K)</Label>
                          <Input
                            type="number"
                            value={minorLossK}
                            onChange={(e) => setMinorLossK(e.target.value)}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none bg-background/50 border-input/60"
                            placeholder="0"
                          />
                          <p className="text-[10px] text-muted-foreground">Total resistance coeff (Valves/Fittings)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Viscosity */}

                  {/* Operating Conditions - Always shown for Gas */}
                  {lineType === "gas" && (
                    <>
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Operating Conditions (for velocity at actual)</p>
                      </div>

                      {/* Fluid Selection for Gas */}
                      <div className="hidden">
                        <Label className="text-sm font-medium">Fluid Type</Label>
                        <Select value={selectedFluid} onValueChange={handleFluidChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Custom">Custom Gas</SelectItem>
                            {commonGases.map(g => (
                              <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Operating Pressure */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Inlet Pressure</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={inletPressure}
                            onChange={(e) => setInletPressure(e.target.value)}
                            className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="12"
                          />
                          <Select value={pressureType} onValueChange={(v: any) => setPressureType(v)}>
                            <SelectTrigger className="w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gauge">Gauge</SelectItem>
                              <SelectItem value="absolute">Abs</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">= {P_operating_bara.toFixed(4)} bara (used for density)</p>
                      </div>

                      {/* Compressibility Factor */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Compressibility Factor (Z)</Label>
                        <Input
                          type="number"
                          value={compressibilityZ}
                          onChange={(e) => setCompressibilityZ(e.target.value)}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="1.0"
                        />
                      </div>

                      {/* Gas Density @ 60°F */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Gas Density @ 60°F (kg/m³)</Label>
                        <Input
                          type="number"
                          value={gasDensity60F}
                          onChange={(e) => {
                            setGasDensity60F(e.target.value);
                            // Auto-calculate MW from density
                            const rho = parseFloat(e.target.value) || 0.856;
                            setGasMolecularWeight((rho * 23.69).toFixed(2));
                          }}
                          disabled={selectedFluid !== "Custom"}
                          className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedFluid !== "Custom" ? "bg-muted/50" : ""}`}
                          placeholder="0.856"
                        />
                      </div>

                      {/* Molecular Weight - editable for accuracy */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Molecular Weight (kg/kmol)</Label>
                        <Input
                          type="number"
                          value={gasMolecularWeight}
                          onChange={(e) => {
                            setGasMolecularWeight(e.target.value);
                            // Auto-calculate Density @ 60F from MW
                            const mw = parseFloat(e.target.value);
                            if (mw > 0) {
                              setGasDensity60F((mw / 23.69).toFixed(4));
                            }
                          }}
                          disabled={selectedFluid !== "Custom"}
                          className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedFluid !== "Custom" ? "bg-muted/50" : ""}`}
                          placeholder="20.3"
                        />
                      </div>

                      {/* Calculated Densities Display */}
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                        <p className="text-xs font-medium text-primary">Calculated Gas Density</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">ρ @ Std:</span>
                            <span className="font-mono ml-1">{rhoGasStandard.toFixed(4)} kg/m³</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ρ @ Op:</span>
                            <span className="font-mono ml-1 text-primary font-semibold">{rhoGasOperating.toFixed(4)} kg/m³</span>
                          </div>
                        </div>
                      </div>

                      {/* Standard/Base Conditions - Locked */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">Std Temp T_std (°C)</Label>
                          <Input
                            type="number"
                            value={baseTemperature}
                            disabled
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-muted/50 cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">Std Press P_std (bara)</Label>
                          <Input
                            type="number"
                            value={basePressure}
                            disabled
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-muted/50 cursor-not-allowed"
                          />
                        </div>
                      </div>
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
                      <div className="text-xs text-muted-foreground mt-1">
                        <p>{(pressureDropPer100m * 10).toFixed(4)} {pressureUnit}/km</p>
                        {status.pressureDrop === "na" ? (
                          <p className="mt-1 text-muted-foreground italic">No limit specified - follow recommended limits</p>
                        ) : (
                          sizingCriteria.maxPressureDropBarKm !== null && (
                            <span className="ml-2">
                              (Limit: ≤ {(sizingCriteria.maxPressureDropBarKm).toFixed(1)} bar/km)
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Velocity */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {lineType === "gas" ? "Velocity" : "Fluid Velocity"}
                        </span>
                        <StatusIcon type={status.velocity} />
                      </div>
                      <p className="text-lg font-mono font-semibold">{velocity.toFixed(3)} m/s</p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {status.velocity === "na" ? (
                          <p className="italic">No limit specified - follow recommended limits</p>
                        ) : (
                          <p>
                            {sizingCriteria.maxVelocity !== null && (
                              lineType === "gas"
                                ? `Limit: ≤ ${sizingCriteria.maxVelocity} m/s`
                                : `Limit: ${sizingCriteria.minVelocity} - ${sizingCriteria.maxVelocity} m/s`
                            )}
                          </p>
                        )}
                      </div>
                    </div>


                    {/* Momentum / Erosion Limits */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Momentum (ρv²)</span>
                        <StatusIcon type={status.rhoVSquared} />
                      </div>
                      <p className="text-lg font-mono font-semibold">{results?.rhoVSquared.toFixed(0)} kg/(m·s²)</p>

                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {status.rhoVSquared === "na" ? (
                          <p className="italic">No limit specified - follow recommended limits</p>
                        ) : (
                          results?.rhoV2Limit && (
                            <p>Limit: ≤ {results.rhoV2Limit.toLocaleString()}</p>
                          )
                        )}
                        {/* We can still show erosional velocity as info if available */}
                        {results?.cValueLimit && !results?.rhoV2Limit && (
                          <p>Ve Limit: {results.erosionalVelocity.toFixed(1)} m/s (C={results.cValueLimit})</p>
                        )}
                      </div>
                    </div>

                    {/* Erosional Ratio */}
                    {results?.erosionalVelocity > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Erosional Ratio (V/Ve)</span>
                        </div>
                        <p className={`text-lg font-mono font-semibold ${results.erosionalRatio > 1 ? "text-destructive" : ""}`}>
                          {results.erosionalRatio.toFixed(2)}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          <p>Ve = {results.erosionalVelocity.toFixed(1)} m/s</p>
                        </div>
                      </div>
                    )}

                    {/* Mach Number (Gas/Mixed) */}
                    {(lineType === "gas" || lineType === "mixed") && (
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Mach Number</span>
                          <StatusIcon type={status.mach} />
                        </div>
                        <p className="text-lg font-mono font-semibold">{results?.machNumber.toFixed(3)}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {status.mach === "na" ? (
                            <p className="italic">No limit specified - follow recommended limits</p>
                          ) : (
                            results?.machLimit && (
                              <p>Limit: ≤ {results.machLimit}</p>
                            )
                          )}
                        </div>
                      </div>
                    )}

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
                          <span className="text-xs text-muted-foreground block">
                            Reynolds (Re) {lineType === "gas" ? "(Avg)" : ""}
                          </span>
                          <span className="font-mono">
                            {reynoldsNumber.toFixed(0)}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-muted/30">
                          <span className="text-xs text-muted-foreground block">
                            Friction Factor (f) {lineType === "gas" ? "(Avg)" : ""}
                          </span>
                          <span className="font-mono">
                            {frictionFactor.toFixed(6)}
                          </span>
                        </div>
                        {lineType === "gas" && hydraulicResult && (
                          <>
                            <div className="p-2 rounded bg-muted/30">
                              <span className="text-xs text-muted-foreground block">Outlet Pressure</span>
                              <span className="font-mono">{(hydraulicResult.outletPressurePa / 100000).toFixed(4)} bara</span>
                            </div>
                            <div className="p-2 rounded bg-muted/30">
                              <span className="text-xs text-muted-foreground block">Avg. Gas Density</span>
                              <span className="font-mono">{hydraulicResult.avgDensity.toFixed(4)} kg/m³</span>
                            </div>
                          </>
                        )}
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



          {/* Metadata and Export Section - RESTORED */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-secondary/10 border border-border/50">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-8 bg-background/50 border-input/60" placeholder="Company Name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Project</Label>
              <Input value={projectName} onChange={e => setProjectName(e.target.value)} className="h-8 bg-background/50 border-input/60" placeholder="Project Name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Item No</Label>
              <Input value={itemNumber} onChange={e => setItemNumber(e.target.value)} className="h-8 bg-background/50 border-input/60" placeholder="Line Number" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Service</Label>
              <Input value={serviceName} onChange={e => setServiceName(e.target.value)} className="h-8 bg-background/50 border-input/60" placeholder="Service Description" />
            </div>
            <div className="col-span-1 md:col-span-4 flex items-center justify-end gap-2 mt-2">
              <Button onClick={() => {
                if (!results) {
                  toast({ title: "No results", description: "Run calculations first", variant: "destructive" });
                  return;
                }
                // Map state to export interface
                const datasheet: HydraulicDatasheetData = {
                  companyName,
                  projectName,
                  itemNumber,
                  serviceName,
                  date: new Date().toLocaleDateString(),
                  lineType: lineType as "gas" | "liquid" | "mixed",
                  // Inputs
                  flowRate: parseFloat(flowRate) || 0,
                  flowRateUnit,
                  pipeDiameter: insideDiameterMM,
                  pipeSchedule: schedule === "Custom" ? "Custom" : schedule,
                  pipeLength: parseFloat(pipeLength) || 0,
                  lengthUnit,
                  pressure: parseFloat(inletPressure) || 0,
                  pressureUnit,
                  temperature: parseFloat(fluidTemperature) || 0,
                  temperatureUnit: "C", // Simplified for now
                  // Results
                  velocity: results.velocity,
                  pressureDrop: pressureDrop, // Use calculated value from scope
                  headLoss: headLoss,
                  erosionalVelocity: results.erosionalVelocity,
                  machNumber: results.machNumber,
                  flowRegime: flowRegime,
                  rhoVSquared: results.rhoVSquared,
                  // HYSYS physics
                  pressureType,
                  gasFlowBasis,
                } as any;
                generateHydraulicPDF(datasheet);
                toast({ title: "PDF Exported Successfully" });
              }} className="h-9 gap-2" variant="outline">
                Export Datasheet (PDF)
              </Button>
              <Button onClick={() => {
                if (!results) {
                  toast({ title: "No results", description: "Run calculations first", variant: "destructive" });
                  return;
                }
                // Basic Excel Export logic
                const excel: HydraulicExcelData = {
                  companyName,
                  projectName,
                  itemNumber,
                  serviceName,
                  lineType,
                  results
                } as any;
                generateHydraulicExcelDatasheet(excel);
                toast({ title: "Excel Exported Successfully" });
              }} className="h-9 gap-2" variant="outline">
                Export to Excel
              </Button>
            </div>
          </div>

        </TabsContent>

        <TabsContent value="guide">
          <HydraulicGuide />
        </TabsContent>
      </Tabs>
    </div >
  );
};

export default HydraulicSizingCalculator;
