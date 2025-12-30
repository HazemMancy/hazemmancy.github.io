import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Flame, Disc, Droplets, Thermometer, AlertTriangle, BarChart3, Info, BookOpen, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';

// ============================================
// UNIT CONVERSION CONSTANTS
// ============================================
const UNIT_CONVERSIONS = {
  pressure: { psiToBar: 0.0689476, barToPsi: 14.5038 },
  temperature: { 
    FtoC: (f: number) => (f - 32) * 5/9,
    CtoF: (c: number) => c * 9/5 + 32,
    FtoR: (f: number) => f + 459.67,
    CtoK: (c: number) => c + 273.15,
  },
  mass: { lbToKg: 0.453592, kgToLb: 2.20462 },
  flow: { gpmToM3h: 0.227125, m3hToGpm: 4.40287 },
  area: { in2ToCm2: 6.4516, cm2ToIn2: 0.155 },
  length: { inToMm: 25.4, mmToIn: 0.03937, ftToM: 0.3048, mToFt: 3.28084 },
  heat: { btuToKj: 1.05506, kjToBtu: 0.947817 },
  heatFlux: { btuFt2ToKwM2: 0.00315459, kwM2ToBtuFt2: 316.998 },
};

type UnitSystem = 'imperial' | 'metric';

// ============================================
// API RP 526 STANDARD ORIFICE AREAS
// Flanged Steel Pressure Relief Valves
// ============================================
const ORIFICE_SIZES = [
  { designation: 'D', area: 0.110, areaMetric: 0.710, inletSize: '1', outletSize: '2', diameter: 0.374, diameterMm: 9.50 },
  { designation: 'E', area: 0.196, areaMetric: 1.265, inletSize: '1', outletSize: '2', diameter: 0.500, diameterMm: 12.70 },
  { designation: 'F', area: 0.307, areaMetric: 1.981, inletSize: '1.5x2', outletSize: '2.5', diameter: 0.625, diameterMm: 15.88 },
  { designation: 'G', area: 0.503, areaMetric: 3.245, inletSize: '1.5x2', outletSize: '3', diameter: 0.800, diameterMm: 20.32 },
  { designation: 'H', area: 0.785, areaMetric: 5.065, inletSize: '2x3', outletSize: '4', diameter: 1.000, diameterMm: 25.40 },
  { designation: 'J', area: 1.287, areaMetric: 8.303, inletSize: '3', outletSize: '4', diameter: 1.280, diameterMm: 32.51 },
  { designation: 'K', area: 1.838, areaMetric: 11.858, inletSize: '3', outletSize: '4x6', diameter: 1.530, diameterMm: 38.86 },
  { designation: 'L', area: 2.853, areaMetric: 18.406, inletSize: '4', outletSize: '6', diameter: 1.906, diameterMm: 48.41 },
  { designation: 'M', area: 3.600, areaMetric: 23.226, inletSize: '4', outletSize: '6', diameter: 2.141, diameterMm: 54.38 },
  { designation: 'N', area: 4.340, areaMetric: 28.000, inletSize: '4', outletSize: '6', diameter: 2.352, diameterMm: 59.74 },
  { designation: 'P', area: 6.380, areaMetric: 41.161, inletSize: '4x6', outletSize: '8', diameter: 2.850, diameterMm: 72.39 },
  { designation: 'Q', area: 11.05, areaMetric: 71.290, inletSize: '6', outletSize: '8x10', diameter: 3.750, diameterMm: 95.25 },
  { designation: 'R', area: 16.00, areaMetric: 103.226, inletSize: '6x8', outletSize: '10', diameter: 4.512, diameterMm: 114.60 },
  { designation: 'T', area: 26.00, areaMetric: 167.742, inletSize: '8', outletSize: '10x12', diameter: 5.754, diameterMm: 146.15 },
];

const selectOrifice = (requiredArea: number): typeof ORIFICE_SIZES[0] | null => {
  for (const orifice of ORIFICE_SIZES) {
    if (orifice.area >= requiredArea) return orifice;
  }
  return null;
};

const calculateDiameter = (area: number): number => Math.sqrt(4 * area / Math.PI);

// ============================================
// EXPANDED FLUID DATABASE
// API 520 Table 9 + Additional Industry Fluids
// ============================================
const FLUID_DATABASE: Record<string, { 
  k: number; C: number; MW: number; category: string; 
  SG?: number; Cp?: number; mu?: number; Tc?: number; Pc?: number;
}> = {
  // Common Gases (API 520 Table 9)
  'Air': { k: 1.40, C: 356, MW: 28.97, category: 'Common', Tc: -140.6, Pc: 547 },
  'Ammonia': { k: 1.31, C: 348, MW: 17.03, category: 'Chemical', Tc: 270.1, Pc: 1657 },
  'Argon': { k: 1.67, C: 378, MW: 39.95, category: 'Inert', Tc: -188.3, Pc: 710 },
  'Carbon Dioxide': { k: 1.29, C: 345, MW: 44.01, category: 'Common', Tc: 87.8, Pc: 1070 },
  'Carbon Monoxide': { k: 1.40, C: 356, MW: 28.01, category: 'Chemical', Tc: -220.4, Pc: 507 },
  'Chlorine': { k: 1.36, C: 352, MW: 70.91, category: 'Chemical', Tc: 290.7, Pc: 1157 },
  'Helium': { k: 1.66, C: 377, MW: 4.00, category: 'Inert', Tc: -450.3, Pc: 33 },
  'Hydrogen': { k: 1.41, C: 357, MW: 2.02, category: 'Chemical', Tc: -399.9, Pc: 188 },
  'Nitrogen': { k: 1.40, C: 356, MW: 28.01, category: 'Common', Tc: -232.5, Pc: 492 },
  'Oxygen': { k: 1.40, C: 356, MW: 32.00, category: 'Common', Tc: -181.1, Pc: 731 },
  // Hydrocarbons
  'Methane': { k: 1.31, C: 348, MW: 16.04, category: 'Hydrocarbon', Tc: -116.6, Pc: 667 },
  'Ethane': { k: 1.19, C: 336, MW: 30.07, category: 'Hydrocarbon', Tc: 90.1, Pc: 708 },
  'Propane': { k: 1.13, C: 330, MW: 44.10, category: 'Hydrocarbon', Tc: 206.0, Pc: 617 },
  'n-Butane': { k: 1.09, C: 326, MW: 58.12, category: 'Hydrocarbon', Tc: 305.6, Pc: 551 },
  'Isobutane': { k: 1.10, C: 327, MW: 58.12, category: 'Hydrocarbon', Tc: 274.9, Pc: 529 },
  'n-Pentane': { k: 1.07, C: 324, MW: 72.15, category: 'Hydrocarbon', Tc: 385.7, Pc: 489 },
  'Isopentane': { k: 1.08, C: 325, MW: 72.15, category: 'Hydrocarbon', Tc: 369.0, Pc: 483 },
  'n-Hexane': { k: 1.06, C: 323, MW: 86.18, category: 'Hydrocarbon', Tc: 453.6, Pc: 437 },
  'n-Heptane': { k: 1.05, C: 322, MW: 100.21, category: 'Hydrocarbon', Tc: 512.6, Pc: 397 },
  'n-Octane': { k: 1.04, C: 321, MW: 114.23, category: 'Hydrocarbon', Tc: 564.1, Pc: 361 },
  'Ethylene': { k: 1.24, C: 341, MW: 28.05, category: 'Hydrocarbon', Tc: 48.5, Pc: 731 },
  'Propylene': { k: 1.15, C: 332, MW: 42.08, category: 'Hydrocarbon', Tc: 197.1, Pc: 667 },
  'Butylene': { k: 1.11, C: 328, MW: 56.11, category: 'Hydrocarbon', Tc: 295.5, Pc: 583 },
  // Natural Gas & Refinery
  'Natural Gas (Typical)': { k: 1.27, C: 344, MW: 19.00, category: 'Natural Gas' },
  'Natural Gas (Lean)': { k: 1.30, C: 347, MW: 17.50, category: 'Natural Gas' },
  'Natural Gas (Rich)': { k: 1.22, C: 339, MW: 22.00, category: 'Natural Gas' },
  'Refinery Gas': { k: 1.20, C: 337, MW: 24.00, category: 'Refinery' },
  'Hydrogen Sulfide': { k: 1.32, C: 349, MW: 34.08, category: 'Sour Gas', Tc: 212.7, Pc: 1306 },
  'Sulfur Dioxide': { k: 1.26, C: 343, MW: 64.07, category: 'Chemical', Tc: 315.0, Pc: 1143 },
  // Steam & Water
  'Steam (Saturated)': { k: 1.135, C: 328, MW: 18.02, category: 'Steam' },
  'Steam (Superheated)': { k: 1.30, C: 347, MW: 18.02, category: 'Steam' },
  // Refrigerants
  'R-22 (HCFC-22)': { k: 1.18, C: 335, MW: 86.47, category: 'Refrigerant', Tc: 205.1, Pc: 722 },
  'R-134a': { k: 1.10, C: 327, MW: 102.03, category: 'Refrigerant', Tc: 213.9, Pc: 589 },
  'R-410A': { k: 1.14, C: 331, MW: 72.58, category: 'Refrigerant', Tc: 161.8, Pc: 711 },
  // Industrial Chemicals
  'Acetylene': { k: 1.26, C: 343, MW: 26.04, category: 'Chemical', Tc: 95.5, Pc: 891 },
  'Benzene Vapor': { k: 1.12, C: 329, MW: 78.11, category: 'Chemical', Tc: 552.2, Pc: 710 },
  'Vinyl Chloride': { k: 1.14, C: 331, MW: 62.50, category: 'Chemical', Tc: 313.5, Pc: 808 },
  'Ethylene Oxide': { k: 1.21, C: 338, MW: 44.05, category: 'Chemical', Tc: 386.6, Pc: 1042 },
  'Methanol Vapor': { k: 1.20, C: 337, MW: 32.04, category: 'Chemical', Tc: 464.0, Pc: 1174 },
  'Ethanol Vapor': { k: 1.13, C: 330, MW: 46.07, category: 'Chemical', Tc: 469.4, Pc: 891 },
};

// Liquid expansion coefficients for thermal relief
const LIQUID_EXPANSION_COEFFICIENTS: Record<string, { beta: number; name: string; SG: number; category: string }> = {
  // Water & Aqueous
  water: { beta: 0.00012, name: 'Water', SG: 1.00, category: 'Aqueous' },
  seawater: { beta: 0.00015, name: 'Seawater', SG: 1.025, category: 'Aqueous' },
  brine: { beta: 0.00018, name: 'Brine (25% NaCl)', SG: 1.19, category: 'Aqueous' },
  glycol_meg: { beta: 0.00035, name: 'MEG (50%)', SG: 1.05, category: 'Aqueous' },
  glycol_deg: { beta: 0.00038, name: 'DEG', SG: 1.12, category: 'Aqueous' },
  // Crude Oils
  crude_light: { beta: 0.00050, name: 'Light Crude (30-40 API)', SG: 0.82, category: 'Crude' },
  crude_medium: { beta: 0.00045, name: 'Medium Crude (22-30 API)', SG: 0.88, category: 'Crude' },
  crude_heavy: { beta: 0.00038, name: 'Heavy Crude (10-22 API)', SG: 0.95, category: 'Crude' },
  crude_extra_heavy: { beta: 0.00032, name: 'Extra Heavy Crude (<10 API)', SG: 1.02, category: 'Crude' },
  // Refined Products
  gasoline: { beta: 0.00062, name: 'Gasoline', SG: 0.74, category: 'Refined' },
  naphtha: { beta: 0.00058, name: 'Naphtha', SG: 0.72, category: 'Refined' },
  kerosene: { beta: 0.00055, name: 'Kerosene/Jet Fuel', SG: 0.80, category: 'Refined' },
  diesel: { beta: 0.00048, name: 'Diesel/Gas Oil', SG: 0.85, category: 'Refined' },
  fuel_oil: { beta: 0.00040, name: 'Fuel Oil', SG: 0.92, category: 'Refined' },
  residual_oil: { beta: 0.00035, name: 'Residual/Bunker', SG: 0.98, category: 'Refined' },
  // LPG & NGL
  lpg: { beta: 0.00120, name: 'LPG (Liquid)', SG: 0.55, category: 'LPG' },
  propane: { beta: 0.00150, name: 'Propane (Liquid)', SG: 0.50, category: 'LPG' },
  butane: { beta: 0.00110, name: 'n-Butane (Liquid)', SG: 0.58, category: 'LPG' },
  ngl: { beta: 0.00090, name: 'NGL', SG: 0.60, category: 'LPG' },
  // Chemicals
  ammonia_liq: { beta: 0.00130, name: 'Ammonia (Liquid)', SG: 0.68, category: 'Chemical' },
  methanol: { beta: 0.00070, name: 'Methanol', SG: 0.79, category: 'Chemical' },
  ethanol: { beta: 0.00065, name: 'Ethanol', SG: 0.79, category: 'Chemical' },
  benzene: { beta: 0.00060, name: 'Benzene', SG: 0.88, category: 'Chemical' },
  toluene: { beta: 0.00058, name: 'Toluene', SG: 0.87, category: 'Chemical' },
  xylene: { beta: 0.00055, name: 'Xylene', SG: 0.86, category: 'Chemical' },
  caustic: { beta: 0.00025, name: 'Caustic Soda (50%)', SG: 1.52, category: 'Chemical' },
  acid_sulfuric: { beta: 0.00030, name: 'Sulfuric Acid (98%)', SG: 1.84, category: 'Chemical' },
  // Lubricants
  lube_oil: { beta: 0.00038, name: 'Lube Oil (ISO VG 46)', SG: 0.87, category: 'Lubricant' },
  hydraulic_oil: { beta: 0.00040, name: 'Hydraulic Oil', SG: 0.88, category: 'Lubricant' },
  transformer_oil: { beta: 0.00042, name: 'Transformer Oil', SG: 0.89, category: 'Lubricant' },
  // Custom
  custom: { beta: 0.00050, name: 'Custom Fluid', SG: 1.0, category: 'Custom' },
};

// ============================================
// API 520 PART I - SIZING EQUATIONS
// Per API 520 Part I (10th Edition, November 2024)
// ============================================

// Coefficient C from k (Cp/Cv) - Equation 3.2
const calculateCCoefficient = (k: number): number => {
  if (k <= 1) return 315;
  const term = Math.pow(2 / (k + 1), (k + 1) / (k - 1));
  return 520 * Math.sqrt(k * term);
};

// Critical pressure ratio - Equation 4
const calculateCriticalRatio = (k: number): number => Math.pow(2 / (k + 1), k / (k - 1));

// ============================================
// VAPOR/GAS SIZING - API 520 Section 5.6.2
// A = W × √(TZ/M) / (C × Kd × P₁ × Kb × Kc)
// Where:
//   A = required effective discharge area (in²)
//   W = required relieving rate (lb/hr)
//   T = relieving temperature (°R = °F + 459.67)
//   Z = compressibility factor
//   M = molecular weight
//   C = coefficient from Table 9 or Equation 3.2
//   Kd = effective coefficient of discharge (0.975 certified gas/vapor)
//   P₁ = relieving pressure, psia (set + overpressure + atm)
//   Kb = backpressure correction factor
//   Kc = combination correction factor (0.9 with rupture disk)
// ============================================
const calculateVaporArea = (
  W: number, C: number, Kd: number, P1: number, Kb: number, Kc: number, T: number, Z: number, M: number
): number => {
  if (P1 <= 0 || M <= 0) return 0;
  return (W * Math.sqrt((T * Z) / M)) / (C * Kd * P1 * Kb * Kc);
};

// ============================================
// LIQUID SIZING - API 520 Section 5.8
// A = Q × √G / (38 × Kd × Kw × Kc × Kv × √ΔP)
// Where:
//   A = required effective discharge area (in²)
//   Q = required capacity (gpm at flowing temperature)
//   G = specific gravity at flowing conditions
//   Kd = effective coefficient of discharge (0.65 certified liquid)
//   Kw = backpressure correction factor (balanced only)
//   Kc = combination correction factor
//   Kv = viscosity correction factor
//   ΔP = P₁ - P₂ differential pressure (psi)
// ============================================
const calculateLiquidArea = (
  Q: number, G: number, Kd: number, Kw: number, Kc: number, Kv: number, P1: number, P2: number
): number => {
  const deltaP = P1 - P2;
  if (deltaP <= 0) return 0;
  return (Q * Math.sqrt(G)) / (38 * Kd * Kw * Kc * Kv * Math.sqrt(deltaP));
};

// ============================================
// STEAM SIZING - API 520 Section 5.7
// A = W / (51.5 × P₁ × Kd × Kb × Kc × Kn × Ksh)
// Where:
//   W = required steam flow (lb/hr)
//   P₁ = relieving pressure (psia)
//   Kn = Napier correction (for P > 1515 psia)
//   Ksh = superheat correction factor
// ============================================
const calculateSteamArea = (
  W: number, P1: number, Kd: number, Kb: number, Kc: number, Kn: number, Ksh: number
): number => {
  if (P1 <= 0) return 0;
  return W / (51.5 * P1 * Kd * Kb * Kc * Kn * Ksh);
};

// Napier correction factor (Kn) - API 520 Section 5.7.2
const calculateKn = (P1: number): number => {
  if (P1 <= 1515) return 1.0;
  if (P1 <= 3215) return (0.1906 * P1 - 1000) / (0.2292 * P1 - 1061);
  return 1.0;
};

// Superheat correction factor (Ksh) - API 520 Table 6
const SUPERHEAT_TABLE: { pressure: number; temps: { temp: number; Ksh: number }[] }[] = [
  { pressure: 15, temps: [{ temp: 300, Ksh: 0.987 }, { temp: 400, Ksh: 0.957 }, { temp: 500, Ksh: 0.930 }, { temp: 600, Ksh: 0.905 }, { temp: 700, Ksh: 0.882 }, { temp: 800, Ksh: 0.861 }, { temp: 900, Ksh: 0.841 }, { temp: 1000, Ksh: 0.823 }] },
  { pressure: 50, temps: [{ temp: 300, Ksh: 0.998 }, { temp: 400, Ksh: 0.963 }, { temp: 500, Ksh: 0.935 }, { temp: 600, Ksh: 0.909 }, { temp: 700, Ksh: 0.885 }, { temp: 800, Ksh: 0.864 }, { temp: 900, Ksh: 0.844 }, { temp: 1000, Ksh: 0.825 }] },
  { pressure: 100, temps: [{ temp: 400, Ksh: 0.972 }, { temp: 500, Ksh: 0.942 }, { temp: 600, Ksh: 0.914 }, { temp: 700, Ksh: 0.890 }, { temp: 800, Ksh: 0.868 }, { temp: 900, Ksh: 0.847 }, { temp: 1000, Ksh: 0.828 }] },
  { pressure: 200, temps: [{ temp: 400, Ksh: 0.987 }, { temp: 500, Ksh: 0.953 }, { temp: 600, Ksh: 0.923 }, { temp: 700, Ksh: 0.897 }, { temp: 800, Ksh: 0.874 }, { temp: 900, Ksh: 0.852 }, { temp: 1000, Ksh: 0.833 }] },
  { pressure: 300, temps: [{ temp: 500, Ksh: 0.965 }, { temp: 600, Ksh: 0.932 }, { temp: 700, Ksh: 0.905 }, { temp: 800, Ksh: 0.880 }, { temp: 900, Ksh: 0.858 }, { temp: 1000, Ksh: 0.837 }] },
  { pressure: 500, temps: [{ temp: 500, Ksh: 0.991 }, { temp: 600, Ksh: 0.951 }, { temp: 700, Ksh: 0.919 }, { temp: 800, Ksh: 0.892 }, { temp: 900, Ksh: 0.868 }, { temp: 1000, Ksh: 0.846 }] },
  { pressure: 1000, temps: [{ temp: 600, Ksh: 0.997 }, { temp: 700, Ksh: 0.954 }, { temp: 800, Ksh: 0.921 }, { temp: 900, Ksh: 0.893 }, { temp: 1000, Ksh: 0.868 }] },
  { pressure: 1500, temps: [{ temp: 700, Ksh: 0.993 }, { temp: 800, Ksh: 0.951 }, { temp: 900, Ksh: 0.918 }, { temp: 1000, Ksh: 0.890 }] },
  { pressure: 2000, temps: [{ temp: 800, Ksh: 0.984 }, { temp: 900, Ksh: 0.946 }, { temp: 1000, Ksh: 0.914 }] },
];

const calculateKsh = (P1: number, superheatTemp: number): number => {
  if (superheatTemp <= 0) return 1.0;
  let lowerP = SUPERHEAT_TABLE[0];
  let upperP = SUPERHEAT_TABLE[SUPERHEAT_TABLE.length - 1];
  for (let i = 0; i < SUPERHEAT_TABLE.length - 1; i++) {
    if (P1 >= SUPERHEAT_TABLE[i].pressure && P1 <= SUPERHEAT_TABLE[i + 1].pressure) {
      lowerP = SUPERHEAT_TABLE[i];
      upperP = SUPERHEAT_TABLE[i + 1];
      break;
    }
  }
  const getKshAtPressure = (row: typeof SUPERHEAT_TABLE[0]) => {
    for (let i = 0; i < row.temps.length - 1; i++) {
      if (superheatTemp >= row.temps[i].temp && superheatTemp <= row.temps[i + 1].temp) {
        const t1 = row.temps[i].temp;
        const t2 = row.temps[i + 1].temp;
        const k1 = row.temps[i].Ksh;
        const k2 = row.temps[i + 1].Ksh;
        return k1 + (k2 - k1) * (superheatTemp - t1) / (t2 - t1);
      }
    }
    return row.temps[row.temps.length - 1].Ksh;
  };
  const kshLower = getKshAtPressure(lowerP);
  const kshUpper = getKshAtPressure(upperP);
  if (lowerP.pressure === upperP.pressure) return kshLower;
  const fraction = (P1 - lowerP.pressure) / (upperP.pressure - lowerP.pressure);
  return kshLower + (kshUpper - kshLower) * fraction;
};

// Viscosity correction factor (Kv) - API 520 Section 5.8.3
const calculateKv = (Re: number): number => {
  if (Re >= 100000) return 1.0;
  if (Re <= 0) return 0.3;
  const Kv = Math.pow(0.9935 + 2.878 / Math.sqrt(Re) + 342.75 / Math.pow(Re, 1.5), -0.5);
  return Math.max(0.3, Math.min(1.0, Kv));
};

const calculateReynoldsForLiquid = (Q: number, G: number, viscosity: number, area: number): number => {
  if (viscosity <= 0 || area <= 0) return 100000;
  return (2800 * Q) / (viscosity * Math.sqrt(Math.max(area, 0.001)));
};

// Backpressure correction factors - API 520 Section 5.2.3
const calculateKbConventional = (k: number, P1: number, Pb: number): number => {
  const criticalRatio = calculateCriticalRatio(k);
  const actualRatio = Pb / P1;
  if (actualRatio <= criticalRatio) return 1.0;
  const Kb = 1.0 - (actualRatio - criticalRatio) / (1.0 - criticalRatio);
  return Math.max(0.1, Math.min(1.0, Kb));
};

const calculateKbBalanced = (percentBackpressure: number): number => {
  if (percentBackpressure <= 30) return 1.0;
  if (percentBackpressure >= 50) return 0.70;
  return 1.0 - (percentBackpressure - 30) * 0.015;
};

const calculateKbPilot = (k: number, P1: number, Pb: number): number => {
  const criticalRatio = calculateCriticalRatio(k);
  const actualRatio = Pb / P1;
  if (actualRatio <= criticalRatio) return 1.0;
  const Kb = 1.0 - 0.8 * (actualRatio - criticalRatio) / (1.0 - criticalRatio);
  return Math.max(0.2, Math.min(1.0, Kb));
};

const calculateKw = (percentBackpressure: number): number => {
  if (percentBackpressure <= 15) return 1.0;
  if (percentBackpressure >= 50) return 0.80;
  return 1.0 - 0.00571 * (percentBackpressure - 15);
};

// ============================================
// TWO-PHASE OMEGA METHOD - API 520 Appendix D
// Based on API 520 Appendix D.2
// ============================================
const calculateOmegaMethod = (
  W: number, P1: number, P2: number, x: number, rhoL: number, rhoV: number, Kd: number, Kc: number, k: number
): { area: number; omega: number; massFlux: number; flowRegime: string } => {
  const vL = 1 / rhoL;
  const vV = 1 / rhoV;
  const vTP = x * vV + (1 - x) * vL;
  const omega = (x * vV + (1 - x) * vL * k) / vTP;
  const eta = P2 / P1;
  let etaC = 0.55 + 0.217 * Math.log(omega) - 0.046 * Math.pow(Math.log(omega), 2);
  etaC = Math.max(0.05, Math.min(0.95, etaC));
  const isCritical = eta < etaC;
  const flowRegime = isCritical ? 'Critical (Choked)' : 'Subcritical';
  let massFlux: number;
  if (isCritical) {
    massFlux = 68.09 * Kd * Kc * Math.sqrt((P1 * rhoL * (1 - etaC)) / omega);
  } else {
    const term1 = -2 * (omega - 1) * Math.log(eta);
    const term2 = (omega - 1) * (1 - eta);
    const term3 = (1 - eta * eta) / 2;
    massFlux = 68.09 * Kd * Kc * Math.sqrt(P1 * rhoL * (term1 + term2 + term3) / omega);
  }
  const area = W / massFlux;
  return { area, omega, massFlux, flowRegime };
};

// ============================================
// API 521 - FIRE CASE CALCULATIONS
// Per API 521 (7th Edition) Section 5.15
// ============================================
const ENVIRONMENTAL_FACTORS = [
  { description: 'Bare vessel (no insulation)', F: 1.0, notes: 'No credit for drainage' },
  { description: 'Insulated - k×t ≥ 22.7 W/m² (4 BTU/hr·ft²·°F)', F: 0.30, notes: '1" min. mineral fiber' },
  { description: 'Insulated - k×t ≥ 11.4 W/m² (2 BTU/hr·ft²·°F)', F: 0.15, notes: '2" min. mineral fiber' },
  { description: 'Insulated - k×t ≥ 5.7 W/m² (1 BTU/hr·ft²·°F)', F: 0.075, notes: '4" min. mineral fiber' },
  { description: 'Insulated - k×t ≥ 3.8 W/m² (0.67 BTU/hr·ft²·°F)', F: 0.05, notes: '6" min. mineral fiber' },
  { description: 'Earth-covered storage (above grade)', F: 0.03, notes: 'Min. 3 ft earth cover' },
  { description: 'Underground storage', F: 0.00, notes: 'Below grade, no relief needed' },
  { description: 'Water application per NFPA', F: 1.0, notes: 'No insulation credit with water' },
  { description: 'Depressuring system installed', F: 1.0, notes: 'May reduce relief requirement' },
];

// Fire heat absorption - API 521 Equation 1 & 2
const calculateFireHeatAbsorption = (wettedArea: number, F: number, promptDrainage: boolean): number => {
  // C = 21,000 BTU/hr·ft^0.82 (adequate drainage)
  // C = 34,500 BTU/hr·ft^0.82 (inadequate drainage)
  const C = promptDrainage ? 21000 : 34500;
  return C * F * Math.pow(wettedArea, 0.82);
};

const calculateWettedArea = (
  vesselType: 'horizontal' | 'vertical' | 'sphere', diameter: number, length: number, liquidLevel: number
): { wettedArea: number; totalSurfaceArea: number } => {
  const R = diameter / 2;
  let wettedArea = 0;
  let totalSurfaceArea = 0;
  if (vesselType === 'horizontal') {
    const liquidHeight = (liquidLevel / 100) * diameter;
    const theta = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - liquidHeight / R)));
    const wettedPerimeter = R * theta;
    const shellWetted = wettedPerimeter * length;
    const headWettedFraction = Math.min(1, liquidLevel / 100);
    const headArea = 2 * Math.PI * R * R * 1.09 * headWettedFraction;
    wettedArea = shellWetted + headArea;
    totalSurfaceArea = Math.PI * diameter * length + 2 * Math.PI * R * R * 1.09;
  } else if (vesselType === 'vertical') {
    // API 521: Max wetted height = 25 ft above grade
    const liquidHeight = (liquidLevel / 100) * length;
    const effectiveHeight = Math.min(liquidHeight, 25);
    const shellWetted = Math.PI * diameter * effectiveHeight;
    const bottomHeadArea = Math.PI * R * R * 1.09;
    wettedArea = shellWetted + bottomHeadArea;
    totalSurfaceArea = Math.PI * diameter * length + 2 * Math.PI * R * R * 1.09;
  } else {
    const liquidHeight = (liquidLevel / 100) * diameter;
    wettedArea = Math.PI * diameter * liquidHeight;
    totalSurfaceArea = Math.PI * diameter * diameter;
  }
  return { wettedArea, totalSurfaceArea };
};

const calculateFireCaseRelief = (
  heatAbsorption: number, latentHeat: number, vaporMW: number, vaporK: number,
  relievingPressure: number, relievingTemp: number, compressibility: number, Kd: number, Kb: number, Kc: number
): { massFlow: number; requiredArea: number; C: number } => {
  const massFlow = heatAbsorption / latentHeat;
  const C = calculateCCoefficient(vaporK);
  const requiredArea = calculateVaporArea(massFlow, C, Kd, relievingPressure, Kb, Kc, relievingTemp, compressibility, vaporMW);
  return { massFlow, requiredArea, C };
};

// ============================================
// API 520 PART II - RUPTURE DISK SIZING
// Per API 520 Part II, Section 5
// ============================================
const RUPTURE_DISK_TYPES = [
  { type: 'Pre-scored tension acting', Kr: 1.0, description: 'Scored metal disk, forward acting' },
  { type: 'Pre-scored reverse acting', Kr: 1.5, description: 'Scored reverse buckling' },
  { type: 'Conventional metal', Kr: 2.4, description: 'Solid metal, forward acting' },
  { type: 'Graphite / composite', Kr: 2.0, description: 'Composite or graphite' },
  { type: 'With knife blade', Kr: 0.8, description: 'Knife blade or cutter' },
];

const RUPTURE_DISK_SIZES = [
  { size: 1, area: 0.785 }, { size: 1.5, area: 1.767 }, { size: 2, area: 3.142 },
  { size: 3, area: 7.069 }, { size: 4, area: 12.566 }, { size: 6, area: 28.274 },
  { size: 8, area: 50.265 }, { size: 10, area: 78.540 }, { size: 12, area: 113.097 },
  { size: 14, area: 153.938 }, { size: 16, area: 201.062 }, { size: 18, area: 254.469 },
  { size: 20, area: 314.159 }, { size: 24, area: 452.389 },
];

const calculateRuptureDiskArea = (
  deviceType: 'vapor' | 'liquid' | 'steam', flowRate: number, Kd: number, Kr: number,
  pressure: number, backPressure: number, vaporMW?: number, vaporK?: number,
  temperature?: number, compressibility?: number, specificGravity?: number
): { requiredArea: number; Knet: number } => {
  const Knet = Kd / Math.sqrt(1 + Kr);
  let requiredArea = 0;
  if (deviceType === 'vapor' && vaporMW && vaporK && temperature && compressibility) {
    const C = calculateCCoefficient(vaporK);
    requiredArea = (flowRate * Math.sqrt((temperature * compressibility) / vaporMW)) / (C * Knet * pressure);
  } else if (deviceType === 'liquid' && specificGravity) {
    const deltaP = pressure - backPressure;
    if (deltaP > 0) requiredArea = (flowRate * Math.sqrt(specificGravity)) / (38 * Knet * Math.sqrt(deltaP));
  } else if (deviceType === 'steam') {
    requiredArea = flowRate / (51.5 * pressure * Knet);
  }
  return { requiredArea, Knet };
};

const selectRuptureDiskSize = (requiredArea: number): { size: number; area: number } | null => {
  for (const disk of RUPTURE_DISK_SIZES) {
    if (disk.area >= requiredArea) return disk;
  }
  return null;
};

// ============================================
// API 521 - THERMAL RELIEF CALCULATIONS
// Per API 521 Section 5.6
// ============================================
const calculateThermalExpansionRate = (
  liquidVolume: number, expansionCoeff: number, heatingRate: number
): { volumeRate: number; massRate: number } => {
  const volumeRateGPH = liquidVolume * expansionCoeff * heatingRate;
  const volumeRate = volumeRateGPH / 60;
  const massRate = volumeRateGPH * 8.34;
  return { volumeRate, massRate };
};

// ============================================
// API 521 - CONTROL VALVE FAILURE SCENARIOS
// Per API 521 Section 5.3
// ============================================
const FAILURE_SCENARIOS = [
  { id: 'cv_fail_open', name: 'Control Valve Fails Open', description: 'Upstream CV fails fully open - API 521 5.3.1' },
  { id: 'cv_fail_closed', name: 'Control Valve Fails Closed', description: 'Downstream CV fails closed - API 521 5.3.2' },
  { id: 'check_valve_fail', name: 'Check Valve Failure', description: 'Check valve fails to close - API 521 5.3.3' },
  { id: 'pump_deadhead', name: 'Pump Deadhead', description: 'Pump against closed discharge - API 521 5.4' },
  { id: 'tube_rupture', name: 'Exchanger Tube Rupture', description: 'High to low pressure rupture - API 521 5.9' },
  { id: 'regulator_fail', name: 'Pressure Regulator Failure', description: 'Regulator fails open - API 521 5.3.4' },
  { id: 'blocked_outlet', name: 'Blocked Outlet', description: 'Blocked discharge with heat input - API 521 5.6' },
  { id: 'power_failure', name: 'Power Failure', description: 'Loss of electrical power - API 521 5.11' },
  { id: 'cooling_water_fail', name: 'Cooling Water Failure', description: 'Loss of cooling medium - API 521 5.12' },
  { id: 'reflux_failure', name: 'Reflux Failure', description: 'Loss of reflux in distillation - API 521 5.13' },
] as const;

const calculateCvFlow = (
  Cv: number, P1: number, P2: number, specificGravity: number, fluidType: 'liquid' | 'gas',
  molecularWeight?: number, temperature?: number, Z?: number, k?: number
): { flowRate: number; flowUnit: string; isCritical?: boolean } => {
  const deltaP = P1 - P2;
  if (fluidType === 'liquid') {
    const flowRate = Cv * Math.sqrt(Math.max(deltaP, 0) / specificGravity);
    return { flowRate, flowUnit: 'gpm' };
  } else if (molecularWeight && temperature && Z && k) {
    const P1_abs = P1 + 14.7;
    const P2_abs = Math.max(P2 + 14.7, 14.7);
    const T = temperature + 460;
    const Pcrit = P1_abs * Math.pow(2 / (k + 1), k / (k - 1));
    const isCritical = P2_abs < Pcrit;
    let flowRate: number;
    if (isCritical) {
      flowRate = 63.3 * Cv * P1_abs * Math.sqrt(molecularWeight / (T * Z));
    } else {
      const Y = 1 - (P1_abs - P2_abs) / (3 * P1_abs * Math.pow(2 / (k + 1), k / (k - 1)));
      flowRate = 1360 * Cv * Y * Math.sqrt((P1_abs - P2_abs) * molecularWeight / (T * Z));
    }
    return { flowRate, flowUnit: 'lb/hr', isCritical };
  }
  return { flowRate: 0, flowUnit: 'gpm' };
};

// ============================================
// ORIFICE RESULT DISPLAY COMPONENT
// ============================================
interface OrificeResultProps {
  requiredArea: number;
  selectedOrifice: typeof ORIFICE_SIZES[0] | null;
  title?: string;
  unitSystem: UnitSystem;
  additionalInfo?: React.ReactNode;
}

const OrificeResultCard: React.FC<OrificeResultProps> = ({ requiredArea, selectedOrifice, title = "Orifice Selection", unitSystem, additionalInfo }) => {
  const requiredDiameter = calculateDiameter(requiredArea);
  const utilizationPercent = selectedOrifice ? (requiredArea / selectedOrifice.area * 100) : 0;
  
  const displayArea = unitSystem === 'metric' ? requiredArea * UNIT_CONVERSIONS.area.in2ToCm2 : requiredArea;
  const areaUnit = unitSystem === 'metric' ? 'cm²' : 'in²';
  const displayDia = unitSystem === 'metric' ? requiredDiameter * UNIT_CONVERSIONS.length.inToMm : requiredDiameter;
  const diaUnit = unitSystem === 'metric' ? 'mm' : 'in';
  
  return (
    <Card className="border-gold/30 bg-gradient-card shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          {selectedOrifice ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3 p-4 bg-secondary/50 rounded-lg border border-border">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Required</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Area:</span>
                <span className="text-xl font-mono font-bold text-foreground">{displayArea.toFixed(4)} {areaUnit}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Equiv. Diameter:</span>
                <span className="font-mono font-medium text-foreground">{displayDia.toFixed(3)} {diaUnit}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 p-4 bg-primary/10 rounded-lg border border-gold/30">
            <h4 className="font-semibold text-sm text-primary uppercase tracking-wide">Selected (API RP 526)</h4>
            {selectedOrifice ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Orifice Type:</span>
                  <Badge variant="outline" className="text-lg font-bold border-gold text-primary px-3 py-1">{selectedOrifice.designation}</Badge>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Effective Area:</span>
                  <span className="font-mono font-medium">
                    {unitSystem === 'metric' ? `${selectedOrifice.areaMetric.toFixed(3)} cm²` : `${selectedOrifice.area} in²`}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Orifice Dia.:</span>
                  <span className="font-mono font-medium">
                    {unitSystem === 'metric' ? `${selectedOrifice.diameterMm.toFixed(2)} mm` : `${selectedOrifice.diameter.toFixed(3)} in`}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Inlet × Outlet:</span>
                  <span className="font-mono font-medium">{selectedOrifice.inletSize}" × {selectedOrifice.outletSize}"</span>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Utilization:</span>
                    <span className={`font-mono font-bold ${utilizationPercent > 90 ? 'text-amber-500' : 'text-green-500'}`}>{utilizationPercent.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${utilizationPercent > 90 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(utilizationPercent, 100)}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-destructive font-medium">Exceeds T Orifice</p>
                <p className="text-sm text-muted-foreground mt-1">Consider multiple valves or rupture disk</p>
              </div>
            )}
          </div>
        </div>
        {additionalInfo && <div className="mt-4">{additionalInfo}</div>}
      </CardContent>
    </Card>
  );
};

// ============================================
// UNIT SYSTEM HEADER COMPONENT
// ============================================
const UnitSystemHeader: React.FC<{ unitSystem: UnitSystem; setUnitSystem: (u: UnitSystem) => void }> = ({ unitSystem, setUnitSystem }) => (
  <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border border-border">
    <Settings className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm text-muted-foreground">Units:</span>
    <div className="flex gap-1">
      {(['imperial', 'metric'] as const).map((u) => (
        <Badge key={u} variant={unitSystem === u ? 'default' : 'outline'} className={`cursor-pointer capitalize ${unitSystem === u ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`} onClick={() => setUnitSystem(u)}>
          {u}
        </Badge>
      ))}
    </div>
    <span className="text-xs text-muted-foreground ml-2">
      {unitSystem === 'imperial' ? '(psi, °F, lb, gpm, in²)' : '(bar, °C, kg, m³/h, cm²)'}
    </span>
  </div>
);

// ============================================
// SENSITIVITY CHART COMPONENT
// ============================================
interface SensitivityChartProps {
  title: string;
  data: { x: number; area: number; label?: string }[];
  xLabel: string;
  xUnit: string;
  currentValue: number;
  selectedOrificeArea?: number;
}

const SensitivityChart: React.FC<SensitivityChartProps> = ({ title, data, xLabel, xUnit, currentValue, selectedOrificeArea }) => (
  <Card className="border-border bg-card">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-primary flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: `${xLabel} (${xUnit})`, position: 'bottom', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Area (in²)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} formatter={(value: number) => [`${value.toFixed(4)} in²`, 'Required Area']} labelFormatter={(label) => `${xLabel}: ${label} ${xUnit}`} />
            <Area type="monotone" dataKey="area" stroke="hsl(var(--primary))" fill="url(#areaGradient)" strokeWidth={2} />
            <ReferenceLine x={currentValue} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'Current', position: 'top', fontSize: 9, fill: 'hsl(var(--destructive))' }} />
            {selectedOrificeArea && (
              <ReferenceLine y={selectedOrificeArea} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" label={{ value: 'Selected', position: 'right', fontSize: 9, fill: 'hsl(var(--chart-2))' }} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

// ============================================
// MAIN COMPONENT
// ============================================
export default function API520Calculator() {
  // Unit system state
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  // Vapor inputs
  const [vaporInputs, setVaporInputs] = useState({
    massFlow: 10000, setPresure: 150, overpressure: 10, backPressure: 14.7,
    temperature: 200, molecularWeight: 28.97, specificHeatRatio: 1.40, compressibility: 1.0,
    dischargeCoeff: 0.975, valveType: 'conventional' as 'conventional' | 'balanced' | 'pilot',
    ruptureDisk: false, selectedGas: 'Air',
  });

  // Liquid inputs
  const [liquidInputs, setLiquidInputs] = useState({
    flowRate: 500, specificGravity: 1.0, viscosity: 1.0, setPresure: 150,
    overpressure: 10, backPressure: 0, dischargeCoeff: 0.65,
    valveType: 'conventional' as 'conventional' | 'balanced', ruptureDisk: false,
  });

  // Two-phase inputs
  const [twoPhaseInputs, setTwoPhaseInputs] = useState({
    totalMassFlow: 50000, vaporFraction: 0.1, setPresure: 150, overpressure: 10,
    backPressure: 14.7, liquidDensity: 50, vaporDensity: 0.5, specificHeatRatio: 1.3,
    dischargeCoeff: 0.85, ruptureDisk: false,
  });

  // Steam inputs
  const [steamInputs, setSteamInputs] = useState({
    massFlow: 10000, setPresure: 150, overpressure: 10, backPressure: 14.7,
    steamType: 'saturated' as 'saturated' | 'superheated', superheatTemp: 0,
    dischargeCoeff: 0.975, valveType: 'conventional' as 'conventional' | 'balanced' | 'pilot', ruptureDisk: false,
  });

  // Fire case inputs
  const [fireCaseInputs, setFireCaseInputs] = useState({
    vesselType: 'horizontal' as 'horizontal' | 'vertical' | 'sphere',
    diameter: 10, length: 30, liquidLevel: 50, environmentalFactor: 1.0,
    promptDrainage: true, latentHeat: 150, vaporMW: 44, vaporK: 1.13,
    setPresure: 250, overpressure: 21, relievingTemp: 200, compressibility: 0.85,
    dischargeCoeff: 0.975, ruptureDisk: false,
  });

  // Rupture disk inputs
  const [ruptureDiskInputs, setRuptureDiskInputs] = useState({
    serviceType: 'vapor' as 'vapor' | 'liquid' | 'steam', flowRate: 10000,
    burstPressure: 150, overpressure: 10, backPressure: 14.7, diskType: 0,
    dischargeCoeff: 0.62, vaporMW: 29, vaporK: 1.4, temperature: 200,
    compressibility: 1.0, specificGravity: 1.0,
  });

  // Thermal relief inputs
  const [thermalInputs, setThermalInputs] = useState({
    geometry: 'pipe' as 'pipe' | 'vessel', diameter: 8, length: 500,
    liquidType: 'crude_light' as keyof typeof LIQUID_EXPANSION_COEFFICIENTS,
    customBeta: 0.0005, specificGravity: 0.85, viscosity: 5.0, heatFlux: 100,
    setPresure: 150, overpressure: 10, backPressure: 0, dischargeCoeff: 0.65, ruptureDisk: false,
  });

  // Failure scenario inputs
  const [failureInputs, setFailureInputs] = useState({
    scenario: 'cv_fail_open' as typeof FAILURE_SCENARIOS[number]['id'],
    fluidType: 'liquid' as 'liquid' | 'gas', valveCv: 200, upstreamPressure: 300,
    downstreamPressure: 50, specificGravity: 0.85, viscosity: 5.0, vaporMW: 44,
    vaporK: 1.15, temperature: 100, compressibility: 0.95, setPresure: 150,
    overpressure: 10, backPressure: 0, dischargeCoeff: 0.65, ruptureDisk: false,
  });

  // ===== VAPOR CALCULATIONS (API 520 Part I, Section 5.6) =====
  const vaporResults = useMemo(() => {
    const P1_abs = vaporInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + vaporInputs.overpressure / 100);
    const T_abs = vaporInputs.temperature + 459.67;
    const gasData = FLUID_DATABASE[vaporInputs.selectedGas];
    const C = gasData ? gasData.C : calculateCCoefficient(vaporInputs.specificHeatRatio);
    const percentBackpressure = (vaporInputs.backPressure / relievingPressure) * 100;
    let Kb: number;
    switch (vaporInputs.valveType) {
      case 'balanced': Kb = calculateKbBalanced(percentBackpressure); break;
      case 'pilot': Kb = calculateKbPilot(vaporInputs.specificHeatRatio, relievingPressure, vaporInputs.backPressure); break;
      default: Kb = calculateKbConventional(vaporInputs.specificHeatRatio, relievingPressure, vaporInputs.backPressure);
    }
    const Kc = vaporInputs.ruptureDisk ? 0.9 : 1.0;
    const criticalRatio = calculateCriticalRatio(vaporInputs.specificHeatRatio);
    const actualRatio = vaporInputs.backPressure / relievingPressure;
    const flowRegime = actualRatio < criticalRatio ? 'Critical (Sonic)' : 'Subcritical';
    const requiredArea = calculateVaporArea(vaporInputs.massFlow, C, vaporInputs.dischargeCoeff, relievingPressure, Kb, Kc, T_abs, vaporInputs.compressibility, vaporInputs.molecularWeight);
    const selectedOrifice = selectOrifice(requiredArea);
    return { relievingPressure, C, Kb, Kc, criticalRatio, flowRegime, requiredArea, selectedOrifice, T_abs };
  }, [vaporInputs]);

  // Generate sensitivity data for vapor
  const vaporSensitivityData = useMemo(() => {
    const { C, dischargeCoeff, Kb, Kc, T_abs, compressibility, molecularWeight } = { ...vaporInputs, ...vaporResults };
    
    // Vary set pressure ±30%
    const pressureData = [];
    for (let p = vaporInputs.setPresure * 0.7; p <= vaporInputs.setPresure * 1.3; p += vaporInputs.setPresure * 0.05) {
      const P1 = (p + 14.7) * (1 + vaporInputs.overpressure / 100);
      const area = calculateVaporArea(vaporInputs.massFlow, vaporResults.C, vaporInputs.dischargeCoeff, P1, vaporResults.Kb, vaporResults.Kc, vaporResults.T_abs, vaporInputs.compressibility, vaporInputs.molecularWeight);
      pressureData.push({ x: Math.round(p), area });
    }
    
    // Vary flow rate ±50%
    const flowData = [];
    for (let w = vaporInputs.massFlow * 0.5; w <= vaporInputs.massFlow * 1.5; w += vaporInputs.massFlow * 0.1) {
      const area = calculateVaporArea(w, vaporResults.C, vaporInputs.dischargeCoeff, vaporResults.relievingPressure, vaporResults.Kb, vaporResults.Kc, vaporResults.T_abs, vaporInputs.compressibility, vaporInputs.molecularWeight);
      flowData.push({ x: Math.round(w), area });
    }
    
    // Vary back pressure
    const bpData = [];
    for (let bp = 14.7; bp <= vaporResults.relievingPressure * 0.5; bp += (vaporResults.relievingPressure * 0.5 - 14.7) / 10) {
      const pct = (bp / vaporResults.relievingPressure) * 100;
      const kb = vaporInputs.valveType === 'balanced' ? calculateKbBalanced(pct) : calculateKbConventional(vaporInputs.specificHeatRatio, vaporResults.relievingPressure, bp);
      const area = calculateVaporArea(vaporInputs.massFlow, vaporResults.C, vaporInputs.dischargeCoeff, vaporResults.relievingPressure, kb, vaporResults.Kc, vaporResults.T_abs, vaporInputs.compressibility, vaporInputs.molecularWeight);
      bpData.push({ x: Math.round(bp), area });
    }
    
    return { pressureData, flowData, bpData };
  }, [vaporInputs, vaporResults]);

  // ===== LIQUID CALCULATIONS (API 520 Part I, Section 5.8) =====
  const liquidResults = useMemo(() => {
    const P1 = liquidInputs.setPresure * (1 + liquidInputs.overpressure / 100);
    const P2 = liquidInputs.backPressure;
    const deltaP = P1 - P2;
    const percentBackpressure = (P2 / P1) * 100;
    const Kw = liquidInputs.valveType === 'balanced' ? calculateKw(percentBackpressure) : 1.0;
    const Kc = liquidInputs.ruptureDisk ? 0.9 : 1.0;
    const prelimArea = calculateLiquidArea(liquidInputs.flowRate, liquidInputs.specificGravity, liquidInputs.dischargeCoeff, Kw, Kc, 1.0, P1, P2);
    const Re = calculateReynoldsForLiquid(liquidInputs.flowRate, liquidInputs.specificGravity, liquidInputs.viscosity, Math.max(prelimArea, 0.1));
    const Kv = calculateKv(Re);
    const requiredArea = calculateLiquidArea(liquidInputs.flowRate, liquidInputs.specificGravity, liquidInputs.dischargeCoeff, Kw, Kc, Kv, P1, P2);
    const selectedOrifice = selectOrifice(requiredArea);
    return { relievingPressure: P1, deltaP, Kw, Kv, Kc, Re, requiredArea, selectedOrifice };
  }, [liquidInputs]);

  // ===== TWO-PHASE CALCULATIONS (API 520 Appendix D) =====
  const twoPhaseResults = useMemo(() => {
    const P1_abs = twoPhaseInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + twoPhaseInputs.overpressure / 100);
    const Kc = twoPhaseInputs.ruptureDisk ? 0.9 : 1.0;
    const result = calculateOmegaMethod(twoPhaseInputs.totalMassFlow, relievingPressure, twoPhaseInputs.backPressure, twoPhaseInputs.vaporFraction, twoPhaseInputs.liquidDensity, twoPhaseInputs.vaporDensity, twoPhaseInputs.dischargeCoeff, Kc, twoPhaseInputs.specificHeatRatio);
    const selectedOrifice = selectOrifice(result.area);
    return { relievingPressure, Kc, ...result, selectedOrifice };
  }, [twoPhaseInputs]);

  // ===== STEAM CALCULATIONS (API 520 Part I, Section 5.7) =====
  const steamResults = useMemo(() => {
    const P1_abs = steamInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + steamInputs.overpressure / 100);
    const percentBackpressure = (steamInputs.backPressure / relievingPressure) * 100;
    let Kb: number;
    switch (steamInputs.valveType) {
      case 'balanced': Kb = calculateKbBalanced(percentBackpressure); break;
      case 'pilot': Kb = calculateKbPilot(1.33, relievingPressure, steamInputs.backPressure); break;
      default: Kb = calculateKbConventional(1.33, relievingPressure, steamInputs.backPressure);
    }
    const Kc = steamInputs.ruptureDisk ? 0.9 : 1.0;
    const Kn = calculateKn(relievingPressure);
    const Ksh = steamInputs.steamType === 'superheated' ? calculateKsh(relievingPressure, steamInputs.superheatTemp) : 1.0;
    const requiredArea = calculateSteamArea(steamInputs.massFlow, relievingPressure, steamInputs.dischargeCoeff, Kb, Kc, Kn, Ksh);
    const selectedOrifice = selectOrifice(requiredArea);
    return { relievingPressure, Kb, Kc, Kn, Ksh, requiredArea, selectedOrifice };
  }, [steamInputs]);

  // ===== FIRE CASE CALCULATIONS (API 521 Section 5.15) =====
  const fireCaseResults = useMemo(() => {
    const P1_abs = fireCaseInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + fireCaseInputs.overpressure / 100);
    const T_abs = fireCaseInputs.relievingTemp + 459.67;
    const { wettedArea, totalSurfaceArea } = calculateWettedArea(fireCaseInputs.vesselType, fireCaseInputs.diameter, fireCaseInputs.length, fireCaseInputs.liquidLevel);
    const heatAbsorption = calculateFireHeatAbsorption(wettedArea, fireCaseInputs.environmentalFactor, fireCaseInputs.promptDrainage);
    const Kc = fireCaseInputs.ruptureDisk ? 0.9 : 1.0;
    const { massFlow, requiredArea, C } = calculateFireCaseRelief(heatAbsorption, fireCaseInputs.latentHeat, fireCaseInputs.vaporMW, fireCaseInputs.vaporK, relievingPressure, T_abs, fireCaseInputs.compressibility, fireCaseInputs.dischargeCoeff, 1.0, Kc);
    const selectedOrifice = selectOrifice(requiredArea);
    return { wettedArea, totalSurfaceArea, heatAbsorption, massFlow, relievingPressure, C, Kc, requiredArea, selectedOrifice };
  }, [fireCaseInputs]);

  // ===== RUPTURE DISK CALCULATIONS (API 520 Part II) =====
  const ruptureDiskResults = useMemo(() => {
    const P1_abs = ruptureDiskInputs.burstPressure + 14.7;
    const relievingPressure = P1_abs * (1 + ruptureDiskInputs.overpressure / 100);
    const T_abs = ruptureDiskInputs.temperature + 459.67;
    const diskData = RUPTURE_DISK_TYPES[ruptureDiskInputs.diskType];
    const Kr = diskData.Kr;
    const { requiredArea, Knet } = calculateRuptureDiskArea(ruptureDiskInputs.serviceType, ruptureDiskInputs.flowRate, ruptureDiskInputs.dischargeCoeff, Kr, relievingPressure, ruptureDiskInputs.backPressure, ruptureDiskInputs.vaporMW, ruptureDiskInputs.vaporK, T_abs, ruptureDiskInputs.compressibility, ruptureDiskInputs.specificGravity);
    const selectedDisk = selectRuptureDiskSize(requiredArea);
    return { relievingPressure, Kr, Knet, requiredArea, selectedDisk, diskType: diskData.type };
  }, [ruptureDiskInputs]);

  // ===== THERMAL RELIEF CALCULATIONS (API 521 Section 5.6) =====
  const thermalResults = useMemo(() => {
    const liquidProps = LIQUID_EXPANSION_COEFFICIENTS[thermalInputs.liquidType];
    const beta = thermalInputs.liquidType === 'custom' ? thermalInputs.customBeta : liquidProps.beta;
    let volumeGal: number, surfaceArea: number;
    if (thermalInputs.geometry === 'pipe') {
      const diamFt = thermalInputs.diameter / 12;
      volumeGal = Math.PI * Math.pow(diamFt / 2, 2) * thermalInputs.length * 7.48;
      surfaceArea = Math.PI * diamFt * thermalInputs.length;
    } else {
      volumeGal = Math.PI * Math.pow(thermalInputs.diameter / 2, 2) * thermalInputs.length * 7.48;
      surfaceArea = 2 * Math.PI * Math.pow(thermalInputs.diameter / 2, 2) + Math.PI * thermalInputs.diameter * thermalInputs.length;
    }
    const heatInput = thermalInputs.heatFlux * surfaceArea;
    const liquidCp = 0.5;
    const heatingRate = heatInput / (volumeGal * 8.34 * thermalInputs.specificGravity * liquidCp);
    const { volumeRate, massRate } = calculateThermalExpansionRate(volumeGal, beta, heatingRate);
    const P1 = thermalInputs.setPresure * (1 + thermalInputs.overpressure / 100);
    const Kc = thermalInputs.ruptureDisk ? 0.9 : 1.0;
    const requiredArea = calculateLiquidArea(volumeRate, thermalInputs.specificGravity, thermalInputs.dischargeCoeff, 1.0, Kc, 1.0, P1, thermalInputs.backPressure);
    const selectedOrifice = selectOrifice(requiredArea);
    return { volumeGal, surfaceArea, heatInput, beta, heatingRate, volumeRate, massRate, relievingPressure: P1, Kc, requiredArea, selectedOrifice };
  }, [thermalInputs]);

  // ===== FAILURE SCENARIO CALCULATIONS (API 521 Section 5.3) =====
  const failureResults = useMemo(() => {
    const scenarioInfo = FAILURE_SCENARIOS.find(s => s.id === failureInputs.scenario);
    const cvFlow = calculateCvFlow(failureInputs.valveCv, failureInputs.upstreamPressure, failureInputs.downstreamPressure, failureInputs.specificGravity, failureInputs.fluidType, failureInputs.vaporMW, failureInputs.temperature, failureInputs.compressibility, failureInputs.vaporK);
    const reliefFlowRate = cvFlow.flowRate;
    const reliefFlowUnit = cvFlow.flowUnit;
    const P1 = failureInputs.setPresure * (1 + failureInputs.overpressure / 100);
    const Kc = failureInputs.ruptureDisk ? 0.9 : 1.0;
    let requiredArea: number;
    if (failureInputs.fluidType === 'gas') {
      const C = calculateCCoefficient(failureInputs.vaporK);
      const T_abs = failureInputs.temperature + 459.67;
      const P1_abs = P1 + 14.7;
      requiredArea = calculateVaporArea(reliefFlowRate, C, 0.975, P1_abs, 1.0, Kc, T_abs, failureInputs.compressibility, failureInputs.vaporMW);
    } else {
      const prelimArea = calculateLiquidArea(reliefFlowRate, failureInputs.specificGravity, failureInputs.dischargeCoeff, 1.0, Kc, 1.0, P1, failureInputs.backPressure);
      const Re = calculateReynoldsForLiquid(reliefFlowRate, failureInputs.specificGravity, failureInputs.viscosity, Math.max(prelimArea, 0.1));
      const Kv = calculateKv(Re);
      requiredArea = calculateLiquidArea(reliefFlowRate, failureInputs.specificGravity, failureInputs.dischargeCoeff, 1.0, Kc, Kv, P1, failureInputs.backPressure);
    }
    const selectedOrifice = selectOrifice(requiredArea);
    return { scenarioInfo, cvFlow, reliefFlowRate, reliefFlowUnit, relievingPressure: P1, Kc, requiredArea, selectedOrifice };
  }, [failureInputs]);

  // Group fluids by category
  const fluidsByCategory = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    Object.entries(FLUID_DATABASE).forEach(([key, data]) => {
      if (!grouped[data.category]) grouped[data.category] = [];
      grouped[data.category].push(key);
    });
    return grouped;
  }, []);

  // Group liquids by category
  const liquidsByCategory = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    Object.entries(LIQUID_EXPANSION_COEFFICIENTS).forEach(([key, data]) => {
      if (!grouped[data.category]) grouped[data.category] = [];
      grouped[data.category].push(key);
    });
    return grouped;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-gold/30 bg-gradient-card shadow-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <span className="text-gradient-gold">API 520/521/526 Relief Valve Sizing</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Comprehensive pressure relief device sizing per API Standards
              </CardDescription>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="border-gold/50 text-primary">API 520 Part I (10th Ed) - Sizing</Badge>
                <Badge variant="outline" className="border-gold/50 text-primary">API 520 Part II - Installation</Badge>
                <Badge variant="outline" className="border-gold/50 text-primary">API 521 (7th Ed) - Scenarios</Badge>
                <Badge variant="outline" className="border-gold/50 text-primary">API RP 526 - Orifice Sizes</Badge>
              </div>
            </div>
            <UnitSystemHeader unitSystem={unitSystem} setUnitSystem={setUnitSystem} />
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="vapor" className="space-y-4">
        <TabsList className="grid grid-cols-5 md:grid-cols-10 w-full bg-secondary/50 border border-border">
          <TabsTrigger value="vapor" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Gas/Vapor</TabsTrigger>
          <TabsTrigger value="liquid" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Liquid</TabsTrigger>
          <TabsTrigger value="twophase" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">2-Phase</TabsTrigger>
          <TabsTrigger value="steam" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Steam</TabsTrigger>
          <TabsTrigger value="firecase" className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Flame className="h-3 w-3" />Fire
          </TabsTrigger>
          <TabsTrigger value="rupturedisk" className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Disc className="h-3 w-3" />RD
          </TabsTrigger>
          <TabsTrigger value="thermal" className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Thermometer className="h-3 w-3" />Thermal
          </TabsTrigger>
          <TabsTrigger value="failure" className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertTriangle className="h-3 w-3" />Failure
          </TabsTrigger>
          <TabsTrigger value="reference" className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Info className="h-3 w-3" />Reference
          </TabsTrigger>
          <TabsTrigger value="guidance" className="flex items-center gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpen className="h-3 w-3" />Guide
          </TabsTrigger>
        </TabsList>

        {/* VAPOR TAB - API 520 Part I, Section 5.6 */}
        <TabsContent value="vapor" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-primary">API 520 Part I - Gas/Vapor Relief Sizing</CardTitle>
              <CardDescription>Section 5.6 - Critical and Subcritical Flow</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Mass Flow Rate ({unitSystem === 'metric' ? 'kg/hr' : 'lb/hr'})</Label>
                    <Input type="number" value={vaporInputs.massFlow} onChange={(e) => setVaporInputs({ ...vaporInputs, massFlow: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure ({unitSystem === 'metric' ? 'barg' : 'psig'})</Label>
                    <Input type="number" value={vaporInputs.setPresure} onChange={(e) => setVaporInputs({ ...vaporInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Overpressure (%)</Label>
                    <Input type="number" value={vaporInputs.overpressure} onChange={(e) => setVaporInputs({ ...vaporInputs, overpressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Back Pressure ({unitSystem === 'metric' ? 'bara' : 'psia'})</Label>
                    <Input type="number" value={vaporInputs.backPressure} onChange={(e) => setVaporInputs({ ...vaporInputs, backPressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Temperature ({unitSystem === 'metric' ? '°C' : '°F'})</Label>
                    <Input type="number" value={vaporInputs.temperature} onChange={(e) => setVaporInputs({ ...vaporInputs, temperature: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Gas Selection</Label>
                    <Select value={vaporInputs.selectedGas} onValueChange={(v) => {
                      const gasData = FLUID_DATABASE[v];
                      if (gasData) setVaporInputs({ ...vaporInputs, selectedGas: v, molecularWeight: gasData.MW, specificHeatRatio: gasData.k });
                      else if (v === 'custom') setVaporInputs({ ...vaporInputs, selectedGas: 'custom' });
                    }}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(fluidsByCategory).map(([category, gases]) => (
                          <React.Fragment key={category}>
                            <SelectItem value={`_${category}`} disabled className="font-bold text-primary">{category}</SelectItem>
                            {gases.map((gas) => (<SelectItem key={gas} value={gas}>{gas}</SelectItem>))}
                          </React.Fragment>
                        ))}
                        <SelectItem value="custom">Custom Fluid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Molecular Weight</Label>
                    <Input type="number" value={vaporInputs.molecularWeight} onChange={(e) => setVaporInputs({ ...vaporInputs, molecularWeight: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" disabled={vaporInputs.selectedGas !== 'custom'} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">k (Cp/Cv)</Label>
                    <Input type="number" step="0.01" value={vaporInputs.specificHeatRatio} onChange={(e) => setVaporInputs({ ...vaporInputs, specificHeatRatio: parseFloat(e.target.value) || 1.4 })} className="bg-secondary/50 border-border" disabled={vaporInputs.selectedGas !== 'custom'} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Compressibility (Z)</Label>
                    <Input type="number" step="0.01" value={vaporInputs.compressibility} onChange={(e) => setVaporInputs({ ...vaporInputs, compressibility: parseFloat(e.target.value) || 1.0 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Valve Type</Label>
                  <Select value={vaporInputs.valveType} onValueChange={(v) => setVaporInputs({ ...vaporInputs, valveType: v as any })}>
                    <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="balanced">Balanced Bellows</SelectItem>
                      <SelectItem value="pilot">Pilot Operated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Discharge Coefficient (Kd)</Label>
                  <Input type="number" step="0.001" value={vaporInputs.dischargeCoeff} onChange={(e) => setVaporInputs({ ...vaporInputs, dischargeCoeff: parseFloat(e.target.value) || 0.975 })} className="bg-secondary/50 border-border" />
                  <p className="text-xs text-muted-foreground">API default: 0.975 (certified), 0.62 (uncertified)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="vaporRuptureDisk" checked={vaporInputs.ruptureDisk} onChange={(e) => setVaporInputs({ ...vaporInputs, ruptureDisk: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="vaporRuptureDisk" className="text-muted-foreground">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">API 520 Equation 1 (Section 5.6.2):</h4>
                  <p className="font-mono text-xs text-foreground">A = W × √(TZ/M) / (C × Kd × P₁ × Kb × Kc)</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">Relieving P:</span> <span className="font-mono font-medium">{vaporResults.relievingPressure.toFixed(1)} psia</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">C:</span> <span className="font-mono font-medium">{vaporResults.C.toFixed(0)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Kb:</span> <span className="font-mono font-medium">{vaporResults.Kb.toFixed(3)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Kc:</span> <span className="font-mono font-medium">{vaporResults.Kc.toFixed(2)}</span></div>
                  <div className="col-span-2 text-sm"><span className="text-muted-foreground">Flow Regime:</span> <Badge variant="secondary" className="ml-2">{vaporResults.flowRegime}</Badge></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={vaporResults.requiredArea} selectedOrifice={vaporResults.selectedOrifice} title="Gas/Vapor Relief Valve Selection (API RP 526)" unitSystem={unitSystem} />

          {/* Sensitivity Analysis Charts */}
          <Card className="border-gold/30 bg-gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sensitivity Analysis
              </CardTitle>
              <CardDescription>How required orifice area changes with key parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <SensitivityChart title="Area vs Set Pressure" data={vaporSensitivityData.pressureData} xLabel="Set Pressure" xUnit="psig" currentValue={vaporInputs.setPresure} selectedOrificeArea={vaporResults.selectedOrifice?.area} />
                <SensitivityChart title="Area vs Flow Rate" data={vaporSensitivityData.flowData} xLabel="Mass Flow" xUnit="lb/hr" currentValue={vaporInputs.massFlow} selectedOrificeArea={vaporResults.selectedOrifice?.area} />
                <SensitivityChart title="Area vs Back Pressure" data={vaporSensitivityData.bpData} xLabel="Back Pressure" xUnit="psia" currentValue={vaporInputs.backPressure} selectedOrificeArea={vaporResults.selectedOrifice?.area} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIQUID TAB - API 520 Part I, Section 5.8 */}
        <TabsContent value="liquid" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-primary">API 520 Part I - Liquid Relief Sizing</CardTitle>
              <CardDescription>Section 5.8 - Incompressible Flow</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Flow Rate ({unitSystem === 'metric' ? 'm³/h' : 'gpm'})</Label>
                    <Input type="number" value={liquidInputs.flowRate} onChange={(e) => setLiquidInputs({ ...liquidInputs, flowRate: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Specific Gravity</Label>
                    <Input type="number" step="0.01" value={liquidInputs.specificGravity} onChange={(e) => setLiquidInputs({ ...liquidInputs, specificGravity: parseFloat(e.target.value) || 1.0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Viscosity (cP)</Label>
                    <Input type="number" step="0.1" value={liquidInputs.viscosity} onChange={(e) => setLiquidInputs({ ...liquidInputs, viscosity: parseFloat(e.target.value) || 1.0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure ({unitSystem === 'metric' ? 'barg' : 'psig'})</Label>
                    <Input type="number" value={liquidInputs.setPresure} onChange={(e) => setLiquidInputs({ ...liquidInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Overpressure (%)</Label>
                    <Input type="number" value={liquidInputs.overpressure} onChange={(e) => setLiquidInputs({ ...liquidInputs, overpressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Back Pressure ({unitSystem === 'metric' ? 'barg' : 'psig'})</Label>
                    <Input type="number" value={liquidInputs.backPressure} onChange={(e) => setLiquidInputs({ ...liquidInputs, backPressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Valve Type</Label>
                  <Select value={liquidInputs.valveType} onValueChange={(v) => setLiquidInputs({ ...liquidInputs, valveType: v as any })}>
                    <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="balanced">Balanced Bellows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Discharge Coefficient (Kd)</Label>
                  <Input type="number" step="0.01" value={liquidInputs.dischargeCoeff} onChange={(e) => setLiquidInputs({ ...liquidInputs, dischargeCoeff: parseFloat(e.target.value) || 0.65 })} className="bg-secondary/50 border-border" />
                  <p className="text-xs text-muted-foreground">API default: 0.65 (certified), 0.62 (uncertified)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="liquidRuptureDisk" checked={liquidInputs.ruptureDisk} onChange={(e) => setLiquidInputs({ ...liquidInputs, ruptureDisk: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="liquidRuptureDisk" className="text-muted-foreground">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">API 520 Equation 5 (Section 5.8):</h4>
                  <p className="font-mono text-xs text-foreground">A = Q × √G / (38 × Kd × Kw × Kc × Kv × √ΔP)</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">Relieving P:</span> <span className="font-mono font-medium">{liquidResults.relievingPressure.toFixed(1)} psig</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">ΔP:</span> <span className="font-mono font-medium">{liquidResults.deltaP.toFixed(1)} psi</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Kw:</span> <span className="font-mono font-medium">{liquidResults.Kw.toFixed(3)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Kv:</span> <span className="font-mono font-medium">{liquidResults.Kv.toFixed(3)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Kc:</span> <span className="font-mono font-medium">{liquidResults.Kc.toFixed(2)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Re:</span> <span className="font-mono font-medium">{liquidResults.Re.toFixed(0)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={liquidResults.requiredArea} selectedOrifice={liquidResults.selectedOrifice} title="Liquid Relief Valve Selection (API RP 526)" unitSystem={unitSystem} />
        </TabsContent>

        {/* TWO-PHASE TAB - API 520 Appendix D */}
        <TabsContent value="twophase" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-primary">API 520 Part I - Two-Phase Relief Sizing</CardTitle>
              <CardDescription>Appendix D - Omega (ω) Method</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Total Mass Flow ({unitSystem === 'metric' ? 'kg/hr' : 'lb/hr'})</Label>
                    <Input type="number" value={twoPhaseInputs.totalMassFlow} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, totalMassFlow: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vapor Mass Fraction (x)</Label>
                    <Input type="number" step="0.01" min="0" max="1" value={twoPhaseInputs.vaporFraction} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, vaporFraction: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Liquid Density ({unitSystem === 'metric' ? 'kg/m³' : 'lb/ft³'})</Label>
                    <Input type="number" value={twoPhaseInputs.liquidDensity} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, liquidDensity: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vapor Density ({unitSystem === 'metric' ? 'kg/m³' : 'lb/ft³'})</Label>
                    <Input type="number" step="0.01" value={twoPhaseInputs.vaporDensity} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, vaporDensity: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure ({unitSystem === 'metric' ? 'barg' : 'psig'})</Label>
                    <Input type="number" value={twoPhaseInputs.setPresure} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">k (Cp/Cv)</Label>
                    <Input type="number" step="0.01" value={twoPhaseInputs.specificHeatRatio} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, specificHeatRatio: parseFloat(e.target.value) || 1.3 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Omega Method Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">API 520 Appendix D.2:</h4>
                  <p className="font-mono text-xs text-foreground">ω = (x·vV + (1-x)·vL·k) / vTP</p>
                  <p className="font-mono text-xs text-foreground">G = 68.09 × Kd × Kc × √(P₁ × ρL × (1-ηc) / ω)</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">ω (Omega):</span> <span className="font-mono font-medium">{twoPhaseResults.omega.toFixed(3)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Mass Flux:</span> <span className="font-mono font-medium">{twoPhaseResults.massFlux.toFixed(1)} lb/hr·in²</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Relieving P:</span> <span className="font-mono font-medium">{twoPhaseResults.relievingPressure.toFixed(1)} psia</span></div>
                  <div className="col-span-2 text-sm"><span className="text-muted-foreground">Flow Regime:</span> <Badge variant="secondary" className="ml-2">{twoPhaseResults.flowRegime}</Badge></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={twoPhaseResults.area} selectedOrifice={twoPhaseResults.selectedOrifice} title="Two-Phase Relief Valve Selection (API RP 526)" unitSystem={unitSystem} />
        </TabsContent>

        {/* STEAM TAB - API 520 Part I, Section 5.7 */}
        <TabsContent value="steam" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-primary">API 520 Part I - Steam Relief Sizing</CardTitle>
              <CardDescription>Section 5.7 - Saturated and Superheated Steam</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Mass Flow Rate ({unitSystem === 'metric' ? 'kg/hr' : 'lb/hr'})</Label>
                    <Input type="number" value={steamInputs.massFlow} onChange={(e) => setSteamInputs({ ...steamInputs, massFlow: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure ({unitSystem === 'metric' ? 'barg' : 'psig'})</Label>
                    <Input type="number" value={steamInputs.setPresure} onChange={(e) => setSteamInputs({ ...steamInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Steam Type</Label>
                    <Select value={steamInputs.steamType} onValueChange={(v) => setSteamInputs({ ...steamInputs, steamType: v as any })}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saturated">Saturated (Ksh = 1.0)</SelectItem>
                        <SelectItem value="superheated">Superheated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {steamInputs.steamType === 'superheated' && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Superheat Temp ({unitSystem === 'metric' ? '°C' : '°F'})</Label>
                      <Input type="number" value={steamInputs.superheatTemp} onChange={(e) => setSteamInputs({ ...steamInputs, superheatTemp: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">API 520 Equation 4 (Section 5.7):</h4>
                  <p className="font-mono text-xs text-foreground">A = W / (51.5 × P₁ × Kd × Kb × Kc × Kn × Ksh)</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">Relieving P:</span> <span className="font-mono font-medium">{steamResults.relievingPressure.toFixed(1)} psia</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Kb:</span> <span className="font-mono font-medium">{steamResults.Kb.toFixed(3)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Kn:</span> <span className="font-mono font-medium">{steamResults.Kn.toFixed(3)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Ksh:</span> <span className="font-mono font-medium">{steamResults.Ksh.toFixed(3)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={steamResults.requiredArea} selectedOrifice={steamResults.selectedOrifice} title="Steam Relief Valve Selection (API RP 526)" unitSystem={unitSystem} />
        </TabsContent>

        {/* FIRE CASE TAB - API 521 Section 5.15 */}
        <TabsContent value="firecase" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                API 521 - Fire Case Relief Sizing
              </CardTitle>
              <CardDescription>Section 5.15 - External Fire Exposure</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Vessel Geometry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vessel Type</Label>
                    <Select value={fireCaseInputs.vesselType} onValueChange={(v) => setFireCaseInputs({ ...fireCaseInputs, vesselType: v as any })}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal">Horizontal Cylinder</SelectItem>
                        <SelectItem value="vertical">Vertical Cylinder</SelectItem>
                        <SelectItem value="sphere">Sphere</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Diameter ({unitSystem === 'metric' ? 'm' : 'ft'})</Label>
                    <Input type="number" step="0.5" value={fireCaseInputs.diameter} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, diameter: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{fireCaseInputs.vesselType === 'sphere' ? 'N/A' : `Length/Height (${unitSystem === 'metric' ? 'm' : 'ft'})`}</Label>
                    <Input type="number" step="0.5" value={fireCaseInputs.length} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, length: parseFloat(e.target.value) || 0 })} disabled={fireCaseInputs.vesselType === 'sphere'} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Liquid Level (%)</Label>
                    <Input type="number" min="0" max="100" value={fireCaseInputs.liquidLevel} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, liquidLevel: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Environmental Factor (F) - API 521 Table 5</Label>
                  <Select value={fireCaseInputs.environmentalFactor.toString()} onValueChange={(v) => setFireCaseInputs({ ...fireCaseInputs, environmentalFactor: parseFloat(v) })}>
                    <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTAL_FACTORS.map((ef) => (
                        <SelectItem key={ef.description} value={ef.F.toString()}>{ef.description} (F = {ef.F})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="promptDrainage" checked={fireCaseInputs.promptDrainage} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, promptDrainage: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="promptDrainage" className="text-muted-foreground">Adequate Drainage (C=21,000)</Label>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Fluid Properties & Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Latent Heat ({unitSystem === 'metric' ? 'kJ/kg' : 'BTU/lb'})</Label>
                    <Input type="number" value={fireCaseInputs.latentHeat} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, latentHeat: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vapor MW</Label>
                    <Input type="number" value={fireCaseInputs.vaporMW} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, vaporMW: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">API 521 Equations:</h4>
                  <p className="font-mono text-xs text-foreground">Q = C × F × A^0.82 (Heat absorbed)</p>
                  <p className="font-mono text-xs text-foreground">W = Q / λ (Vapor generation rate)</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">Wetted Area:</span> <span className="font-mono font-medium">{fireCaseResults.wettedArea.toFixed(1)} ft²</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Heat Input:</span> <span className="font-mono font-medium">{(fireCaseResults.heatAbsorption / 1e6).toFixed(2)} MM BTU/hr</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Relief Rate:</span> <span className="font-mono font-medium">{fireCaseResults.massFlow.toFixed(0)} lb/hr</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">C:</span> <span className="font-mono font-medium">{fireCaseResults.C.toFixed(0)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={fireCaseResults.requiredArea} selectedOrifice={fireCaseResults.selectedOrifice} title="Fire Case Relief Valve Selection (API RP 526)" unitSystem={unitSystem} />
        </TabsContent>

        {/* RUPTURE DISK TAB - API 520 Part II */}
        <TabsContent value="rupturedisk" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <Disc className="h-5 w-5 text-blue-500" />
                API 520 Part II - Rupture Disk Sizing
              </CardTitle>
              <CardDescription>Section 5 - Rupture Disk Devices</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Disk Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Service Type</Label>
                    <Select value={ruptureDiskInputs.serviceType} onValueChange={(v) => setRuptureDiskInputs({ ...ruptureDiskInputs, serviceType: v as any })}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vapor">Vapor/Gas</SelectItem>
                        <SelectItem value="liquid">Liquid</SelectItem>
                        <SelectItem value="steam">Steam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Disk Type</Label>
                    <Select value={ruptureDiskInputs.diskType.toString()} onValueChange={(v) => setRuptureDiskInputs({ ...ruptureDiskInputs, diskType: parseInt(v) })}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RUPTURE_DISK_TYPES.map((disk, idx) => (
                          <SelectItem key={disk.type} value={idx.toString()}>{disk.type} (Kr = {disk.Kr})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Flow Rate ({ruptureDiskInputs.serviceType === 'liquid' ? 'gpm' : 'lb/hr'})</Label>
                    <Input type="number" value={ruptureDiskInputs.flowRate} onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, flowRate: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Burst Pressure (psig)</Label>
                    <Input type="number" value={ruptureDiskInputs.burstPressure} onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, burstPressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">Net Discharge Coefficient:</h4>
                  <p className="font-mono text-xs text-foreground">K_net = Kd / √(1 + Kr)</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Rupture Disk Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">Kr:</span> <span className="font-mono font-medium">{ruptureDiskResults.Kr.toFixed(2)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">K_net:</span> <span className="font-mono font-medium">{ruptureDiskResults.Knet.toFixed(3)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Relieving P:</span> <span className="font-mono font-medium">{ruptureDiskResults.relievingPressure.toFixed(1)} psia</span></div>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg border border-gold/30 space-y-3">
                  <h4 className="font-semibold text-sm text-primary uppercase tracking-wide">Required Disk Size</h4>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Required Area:</span>
                    <span className="text-xl font-mono font-bold">{ruptureDiskResults.requiredArea.toFixed(4)} in²</span>
                  </div>
                  {ruptureDiskResults.selectedDisk ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Selected NPS:</span>
                        <Badge variant="outline" className="text-lg font-bold border-gold text-primary px-3 py-1">{ruptureDiskResults.selectedDisk.size}"</Badge>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">Selected Area:</span>
                        <span className="font-mono font-medium">{ruptureDiskResults.selectedDisk.area.toFixed(2)} in²</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-destructive font-medium">Exceeds 24" disk</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* THERMAL TAB - API 521 Section 5.6 */}
        <TabsContent value="thermal" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-red-500" />
                API 521 - Thermal Relief Sizing
              </CardTitle>
              <CardDescription>Section 5.6 - Blocked Outlet / Thermal Expansion</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">System Geometry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Geometry Type</Label>
                    <Select value={thermalInputs.geometry} onValueChange={(v) => setThermalInputs({ ...thermalInputs, geometry: v as any })}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pipe">Pipeline</SelectItem>
                        <SelectItem value="vessel">Vessel/Tank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Diameter ({thermalInputs.geometry === 'pipe' ? 'in' : 'ft'})</Label>
                    <Input type="number" value={thermalInputs.diameter} onChange={(e) => setThermalInputs({ ...thermalInputs, diameter: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Length (ft)</Label>
                    <Input type="number" value={thermalInputs.length} onChange={(e) => setThermalInputs({ ...thermalInputs, length: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Liquid Type</Label>
                    <Select value={thermalInputs.liquidType} onValueChange={(v) => {
                      const liq = LIQUID_EXPANSION_COEFFICIENTS[v as keyof typeof LIQUID_EXPANSION_COEFFICIENTS];
                      setThermalInputs({ ...thermalInputs, liquidType: v as any, specificGravity: liq.SG });
                    }}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(liquidsByCategory).map(([category, liquids]) => (
                          <React.Fragment key={category}>
                            <SelectItem value={`_${category}`} disabled className="font-bold text-primary">{category}</SelectItem>
                            {liquids.map((key) => (<SelectItem key={key} value={key}>{LIQUID_EXPANSION_COEFFICIENTS[key as keyof typeof LIQUID_EXPANSION_COEFFICIENTS].name}</SelectItem>))}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">Volume:</span> <span className="font-mono font-medium">{thermalResults.volumeGal.toFixed(0)} gal</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">β:</span> <span className="font-mono font-medium">{thermalResults.beta.toFixed(5)} /°F</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Heat Rate:</span> <span className="font-mono font-medium">{thermalResults.heatingRate.toFixed(2)} °F/hr</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Relief Rate:</span> <span className="font-mono font-medium">{thermalResults.volumeRate.toFixed(4)} gpm</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Specific Gravity</Label>
                    <Input type="number" step="0.01" value={thermalInputs.specificGravity} onChange={(e) => setThermalInputs({ ...thermalInputs, specificGravity: parseFloat(e.target.value) || 0.85 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Viscosity (cP)</Label>
                    <Input type="number" value={thermalInputs.viscosity} onChange={(e) => setThermalInputs({ ...thermalInputs, viscosity: parseFloat(e.target.value) || 5 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Heat Flux (BTU/hr·ft²)</Label>
                    <Input type="number" value={thermalInputs.heatFlux} onChange={(e) => setThermalInputs({ ...thermalInputs, heatFlux: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure (psig)</Label>
                    <Input type="number" value={thermalInputs.setPresure} onChange={(e) => setThermalInputs({ ...thermalInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={thermalResults.requiredArea} selectedOrifice={thermalResults.selectedOrifice} title="Thermal Relief Valve Selection (API RP 526)" unitSystem={unitSystem} />
        </TabsContent>

        {/* FAILURE TAB - API 521 Section 5.3 */}
        <TabsContent value="failure" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                API 521 - Failure Scenario Sizing
              </CardTitle>
              <CardDescription>Section 5.3 - Control System and Valve Failures</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Failure Scenario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Scenario Type</Label>
                  <Select value={failureInputs.scenario} onValueChange={(v) => setFailureInputs({ ...failureInputs, scenario: v as any })}>
                    <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FAILURE_SCENARIOS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{failureResults.scenarioInfo?.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Fluid Type</Label>
                    <Select value={failureInputs.fluidType} onValueChange={(v) => setFailureInputs({ ...failureInputs, fluidType: v as any })}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="liquid">Liquid</SelectItem>
                        <SelectItem value="gas">Gas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Control Valve Cv</Label>
                    <Input type="number" value={failureInputs.valveCv} onChange={(e) => setFailureInputs({ ...failureInputs, valveCv: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Upstream P (psig)</Label>
                    <Input type="number" value={failureInputs.upstreamPressure} onChange={(e) => setFailureInputs({ ...failureInputs, upstreamPressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Downstream P (psig)</Label>
                    <Input type="number" value={failureInputs.downstreamPressure} onChange={(e) => setFailureInputs({ ...failureInputs, downstreamPressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure (psig)</Label>
                    <Input type="number" value={failureInputs.setPresure} onChange={(e) => setFailureInputs({ ...failureInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Overpressure (%)</Label>
                    <Input type="number" value={failureInputs.overpressure} onChange={(e) => setFailureInputs({ ...failureInputs, overpressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Failure Scenario Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">Relief Flow:</span> <span className="font-mono font-medium">{failureResults.reliefFlowRate.toFixed(1)} {failureResults.reliefFlowUnit}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Relieving P:</span> <span className="font-mono font-medium">{failureResults.relievingPressure.toFixed(1)} psig</span></div>
                  {failureResults.cvFlow.isCritical !== undefined && (
                    <div className="col-span-2 text-sm">
                      <span className="text-muted-foreground">Flow:</span> <Badge variant="secondary" className="ml-2">{failureResults.cvFlow.isCritical ? 'Critical' : 'Subcritical'}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={failureResults.requiredArea} selectedOrifice={failureResults.selectedOrifice} title="Failure Scenario Relief Valve Selection (API RP 526)" unitSystem={unitSystem} />
        </TabsContent>

        {/* REFERENCE TAB */}
        <TabsContent value="reference" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">API RP 526 - Standard Orifice Sizes</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-primary">Type</TableHead>
                      <TableHead className="text-primary">Area (in²)</TableHead>
                      <TableHead className="text-primary">Dia. (in)</TableHead>
                      <TableHead className="text-primary">Inlet × Outlet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ORIFICE_SIZES.map((o) => (
                      <TableRow key={o.designation} className="border-border hover:bg-muted/50">
                        <TableCell className="font-bold text-primary">{o.designation}</TableCell>
                        <TableCell className="font-mono">{o.area}</TableCell>
                        <TableCell className="font-mono">{o.diameter.toFixed(3)}</TableCell>
                        <TableCell>{o.inletSize}" × {o.outletSize}"</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Gas Properties (API 520 Table 9)</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-primary">Gas</TableHead>
                      <TableHead className="text-primary">MW</TableHead>
                      <TableHead className="text-primary">k</TableHead>
                      <TableHead className="text-primary">C</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(FLUID_DATABASE).map(([gas, data]) => (
                      <TableRow key={gas} className="border-border hover:bg-muted/50">
                        <TableCell>{gas}</TableCell>
                        <TableCell className="font-mono">{data.MW}</TableCell>
                        <TableCell className="font-mono">{data.k}</TableCell>
                        <TableCell className="font-mono">{data.C}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* GUIDANCE TAB */}
        <TabsContent value="guidance" className="space-y-4">
          <div className="grid gap-4">
            <Card className="border-gold/30 bg-gradient-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-xl text-primary flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  API Standards Guide for Pressure Relief Devices
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* API 520 Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-primary border-b border-gold/30 pb-2">API 520 - Sizing, Selection & Installation of Pressure-Relieving Devices</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
                      <h4 className="font-semibold text-primary">Part I - Sizing & Selection (10th Ed)</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Section 5.6 - Gas/Vapor sizing (critical & subcritical flow)</li>
                        <li>• Section 5.7 - Steam sizing with Kn and Ksh factors</li>
                        <li>• Section 5.8 - Liquid sizing with Kv viscosity correction</li>
                        <li>• Appendix D - Two-phase Omega (ω) method</li>
                        <li>• Table 9 - C coefficients for common gases</li>
                        <li>• Table 6 - Superheat correction factors</li>
                      </ul>
                      <div className="p-3 bg-primary/10 rounded border border-gold/20">
                        <p className="text-xs font-mono text-foreground">Gas: A = W√(TZ/M) / (C·Kd·P₁·Kb·Kc)</p>
                        <p className="text-xs font-mono text-foreground">Liquid: A = Q√G / (38·Kd·Kw·Kc·Kv·√ΔP)</p>
                        <p className="text-xs font-mono text-foreground">Steam: A = W / (51.5·P₁·Kd·Kb·Kc·Kn·Ksh)</p>
                      </div>
                    </div>

                    <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
                      <h4 className="font-semibold text-primary">Part II - Installation (7th Ed)</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Section 4 - Inlet piping requirements</li>
                        <li>• Section 5 - Rupture disk sizing & installation</li>
                        <li>• Section 6 - Discharge piping design</li>
                        <li>• Pressure drop limits: 3% inlet, variable outlet</li>
                        <li>• Combination devices (RD + PRV)</li>
                      </ul>
                      <div className="p-3 bg-primary/10 rounded border border-gold/20">
                        <p className="text-xs font-mono text-foreground">K_net = Kd / √(1 + Kr)</p>
                        <p className="text-xs font-mono text-foreground">Kc = 0.9 (with rupture disk upstream)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API 521 Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-primary border-b border-gold/30 pb-2">API 521 - Pressure-Relieving & Depressuring Systems (7th Ed)</h3>
                  
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
                    <h4 className="font-semibold text-primary">Relief Scenarios Covered</h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground mb-1">Equipment Failures</p>
                        <ul className="space-y-1">
                          <li>• 5.3 - Control valve failure</li>
                          <li>• 5.4 - Pump deadhead</li>
                          <li>• 5.9 - Tube rupture</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Process Upsets</p>
                        <ul className="space-y-1">
                          <li>• 5.6 - Blocked outlet</li>
                          <li>• 5.11 - Power failure</li>
                          <li>• 5.12 - Cooling water loss</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">External Events</p>
                        <ul className="space-y-1">
                          <li>• 5.15 - Fire case</li>
                          <li>• 5.13 - Reflux failure</li>
                          <li>• 5.7 - Gas blowby</li>
                        </ul>
                      </div>
                    </div>
                    <div className="p-3 bg-primary/10 rounded border border-gold/20">
                      <p className="text-xs font-mono text-foreground">Fire: Q = C × F × A^0.82 (BTU/hr)</p>
                      <p className="text-xs font-mono text-foreground">C = 21,000 (adequate drainage) or 34,500 (inadequate)</p>
                      <p className="text-xs font-mono text-foreground">Overpressure: 10% normal, 16% multiple, 21% fire</p>
                    </div>
                  </div>
                </div>

                {/* API 526 Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-primary border-b border-gold/30 pb-2">API RP 526 - Flanged Steel Pressure Relief Valves</h3>
                  
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
                    <h4 className="font-semibold text-primary">Standard Orifice Designations</h4>
                    <p className="text-sm text-muted-foreground">Defines standard effective discharge areas (D through T) for flanged steel PRVs</p>
                    <div className="grid grid-cols-7 gap-2">
                      {ORIFICE_SIZES.map((o) => (
                        <div key={o.designation} className="text-center p-2 bg-primary/10 rounded border border-gold/20">
                          <span className="font-bold text-primary text-lg">{o.designation}</span>
                          <p className="text-xs text-muted-foreground">{o.area} in²</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calculator Usage Guide */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-primary border-b border-gold/30 pb-2">Calculator Usage Guide</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-2">
                      <h4 className="font-semibold text-foreground">Correction Factors</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li><span className="font-mono text-primary">Kd</span> - Discharge coefficient (0.975 gas, 0.65 liquid)</li>
                        <li><span className="font-mono text-primary">Kb</span> - Backpressure correction (valve type dependent)</li>
                        <li><span className="font-mono text-primary">Kc</span> - Combination factor (0.9 with rupture disk)</li>
                        <li><span className="font-mono text-primary">Kv</span> - Viscosity correction (liquid, Re-based)</li>
                        <li><span className="font-mono text-primary">Kw</span> - Liquid backpressure (balanced bellows)</li>
                        <li><span className="font-mono text-primary">Kn</span> - Napier correction (steam &gt;1515 psia)</li>
                        <li><span className="font-mono text-primary">Ksh</span> - Superheat correction (superheated steam)</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-secondary/30 rounded-lg border border-border space-y-2">
                      <h4 className="font-semibold text-foreground">Best Practices</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Always use certified Kd values from manufacturer</li>
                        <li>• Consider all applicable relief scenarios per API 521</li>
                        <li>• Use 10% overpressure for single devices, 16% for multiple</li>
                        <li>• Apply 21% overpressure for fire case only</li>
                        <li>• Verify inlet/outlet piping per API 520 Part II</li>
                        <li>• Check backpressure limits for valve type selected</li>
                        <li>• Use sensitivity analysis to understand design margins</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
