import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Flame, Disc, Droplets, Thermometer, AlertTriangle, BarChart3, Plus, Trash2, TrendingUp, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// ============================================
// API 520/521 RELIEF VALVE SIZING CALCULATOR
// Per API 520 Part I (10th Ed) & API 521 (7th Ed)
// ============================================

// ============================================
// API 520 STANDARD ORIFICE AREAS (API RP 526)
// Effective discharge areas in square inches
// ============================================
const ORIFICE_SIZES = [
  { designation: 'D', area: 0.110, inletSize: '1', outletSize: '2', diameter: 0.374 },
  { designation: 'E', area: 0.196, inletSize: '1', outletSize: '2', diameter: 0.500 },
  { designation: 'F', area: 0.307, inletSize: '1.5x2', outletSize: '2.5', diameter: 0.625 },
  { designation: 'G', area: 0.503, inletSize: '1.5x2', outletSize: '3', diameter: 0.800 },
  { designation: 'H', area: 0.785, inletSize: '2x3', outletSize: '4', diameter: 1.000 },
  { designation: 'J', area: 1.287, inletSize: '3', outletSize: '4', diameter: 1.280 },
  { designation: 'K', area: 1.838, inletSize: '3', outletSize: '4x6', diameter: 1.530 },
  { designation: 'L', area: 2.853, inletSize: '4', outletSize: '6', diameter: 1.906 },
  { designation: 'M', area: 3.600, inletSize: '4', outletSize: '6', diameter: 2.141 },
  { designation: 'N', area: 4.340, inletSize: '4', outletSize: '6', diameter: 2.352 },
  { designation: 'P', area: 6.380, inletSize: '4x6', outletSize: '8', diameter: 2.850 },
  { designation: 'Q', area: 11.05, inletSize: '6', outletSize: '8x10', diameter: 3.750 },
  { designation: 'R', area: 16.00, inletSize: '6x8', outletSize: '10', diameter: 4.512 },
  { designation: 'T', area: 26.00, inletSize: '8', outletSize: '10x12', diameter: 5.754 },
];

const selectOrifice = (requiredArea: number): { designation: string; area: number; inletSize: string; outletSize: string; diameter: number } | null => {
  for (const orifice of ORIFICE_SIZES) {
    if (orifice.area >= requiredArea) {
      return orifice;
    }
  }
  return null;
};

// Calculate equivalent orifice diameter from area
const calculateDiameter = (area: number): number => {
  return Math.sqrt(4 * area / Math.PI);
};

// ============================================
// API 520 COEFFICIENT C FROM k (Cp/Cv)
// Per API 520 Part I, Equation 3.2
// C = 520 × √[k × (2/(k+1))^((k+1)/(k-1))]
// ============================================
const calculateCCoefficient = (k: number): number => {
  if (k <= 1) return 315;
  const term = Math.pow(2 / (k + 1), (k + 1) / (k - 1));
  return 520 * Math.sqrt(k * term);
};

// Pre-calculated C values for common gases (API 520 Table 9)
const C_VALUES_TABLE: Record<string, { k: number; C: number; MW: number }> = {
  'Air': { k: 1.40, C: 356, MW: 28.97 },
  'Ammonia': { k: 1.31, C: 348, MW: 17.03 },
  'Argon': { k: 1.67, C: 378, MW: 39.95 },
  'Butane (n-)': { k: 1.09, C: 326, MW: 58.12 },
  'Carbon Dioxide': { k: 1.29, C: 345, MW: 44.01 },
  'Carbon Monoxide': { k: 1.40, C: 356, MW: 28.01 },
  'Chlorine': { k: 1.36, C: 352, MW: 70.91 },
  'Ethane': { k: 1.19, C: 336, MW: 30.07 },
  'Ethylene': { k: 1.24, C: 341, MW: 28.05 },
  'Helium': { k: 1.66, C: 377, MW: 4.00 },
  'Hydrogen': { k: 1.41, C: 357, MW: 2.02 },
  'Hydrogen Sulfide': { k: 1.32, C: 349, MW: 34.08 },
  'Methane': { k: 1.31, C: 348, MW: 16.04 },
  'Natural Gas (typical)': { k: 1.27, C: 344, MW: 19.00 },
  'Nitrogen': { k: 1.40, C: 356, MW: 28.01 },
  'Oxygen': { k: 1.40, C: 356, MW: 32.00 },
  'Propane': { k: 1.13, C: 330, MW: 44.10 },
  'Propylene': { k: 1.15, C: 332, MW: 42.08 },
  'Steam': { k: 1.33, C: 350, MW: 18.02 },
  'Sulfur Dioxide': { k: 1.26, C: 343, MW: 64.07 },
};

// Critical pressure ratio
const calculateCriticalRatio = (k: number): number => {
  return Math.pow(2 / (k + 1), k / (k - 1));
};

// ============================================
// API 520 VAPOR/GAS RELIEF SIZING
// Per API 520 Part I, Section 5.6.2, Equation 1
// ============================================
const calculateVaporArea = (
  W: number, C: number, Kd: number, P1: number, Kb: number, Kc: number, T: number, Z: number, M: number
): number => {
  if (P1 <= 0 || M <= 0) return 0;
  return (W * Math.sqrt((T * Z) / M)) / (C * Kd * P1 * Kb * Kc);
};

// ============================================
// API 520 LIQUID RELIEF SIZING
// Per API 520 Part I, Section 5.8, Equation 5
// ============================================
const calculateLiquidArea = (
  Q: number, G: number, Kd: number, Kw: number, Kc: number, Kv: number, P1: number, P2: number
): number => {
  const deltaP = P1 - P2;
  if (deltaP <= 0) return 0;
  return (Q * Math.sqrt(G)) / (38 * Kd * Kw * Kc * Kv * Math.sqrt(deltaP));
};

// ============================================
// API 520 STEAM RELIEF SIZING
// Per API 520 Part I, Section 5.7
// ============================================
const calculateSteamArea = (
  W: number, P1: number, Kd: number, Kb: number, Kc: number, Kn: number, Ksh: number
): number => {
  if (P1 <= 0) return 0;
  return W / (51.5 * P1 * Kd * Kb * Kc * Kn * Ksh);
};

// Napier correction factor (Kn)
const calculateKn = (P1: number): number => {
  if (P1 <= 1515) return 1.0;
  if (P1 <= 3215) {
    return (0.1906 * P1 - 1000) / (0.2292 * P1 - 1061);
  }
  return 1.0;
};

// Superheat correction factor (Ksh) table
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

// Viscosity correction factor (Kv)
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

// Backpressure correction factors
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
// TWO-PHASE OMEGA METHOD
// Per API 520 Part I, Appendix D
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
// API 521 FIRE CASE CALCULATIONS
// ============================================
const ENVIRONMENTAL_FACTORS = [
  { description: 'Bare vessel (no insulation)', F: 1.0, notes: 'No credit for drainage' },
  { description: 'Insulated - k×t ≥ 22.7 W/m² (4 BTU/hr·ft²·°F)', F: 0.30, notes: '1" min. mineral fiber' },
  { description: 'Insulated - k×t ≥ 11.4 W/m² (2 BTU/hr·ft²·°F)', F: 0.15, notes: '2" min. mineral fiber' },
  { description: 'Insulated - k×t ≥ 5.7 W/m² (1 BTU/hr·ft²·°F)', F: 0.075, notes: '4" min. mineral fiber' },
  { description: 'Insulated - k×t ≥ 3.8 W/m² (0.67 BTU/hr·ft²·°F)', F: 0.05, notes: '6" min. mineral fiber' },
  { description: 'Earth-covered storage (above grade)', F: 0.03, notes: 'Min. 3 ft earth cover' },
  { description: 'Underground storage', F: 0.00, notes: 'Below grade, no relief needed' },
];

const calculateFireHeatAbsorption = (wettedArea: number, F: number, promptDrainage: boolean): number => {
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
// RUPTURE DISK SIZING
// ============================================
const RUPTURE_DISK_TYPES = [
  { type: 'Pre-scored tension acting', Kr: 1.0, description: 'Scored metal disk, forward acting' },
  { type: 'Pre-scored reverse acting', Kr: 1.5, description: 'Scored reverse buckling' },
  { type: 'Conventional metal', Kr: 2.4, description: 'Solid metal, forward acting' },
  { type: 'Graphite / composite', Kr: 2.0, description: 'Composite or graphite' },
  { type: 'With knife blade', Kr: 0.8, description: 'Knife blade or cutter' },
];

const RUPTURE_DISK_SIZES = [
  { size: 1, area: 0.785 },
  { size: 1.5, area: 1.767 },
  { size: 2, area: 3.142 },
  { size: 3, area: 7.069 },
  { size: 4, area: 12.566 },
  { size: 6, area: 28.274 },
  { size: 8, area: 50.265 },
  { size: 10, area: 78.540 },
  { size: 12, area: 113.097 },
  { size: 14, area: 153.938 },
  { size: 16, area: 201.062 },
  { size: 18, area: 254.469 },
  { size: 20, area: 314.159 },
  { size: 24, area: 452.389 },
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
    if (deltaP > 0) {
      requiredArea = (flowRate * Math.sqrt(specificGravity)) / (38 * Knet * Math.sqrt(deltaP));
    }
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
// THERMAL RELIEF / BLOCKED OUTLET
// ============================================
const LIQUID_EXPANSION_COEFFICIENTS: Record<string, { beta: number; name: string; SG: number }> = {
  water: { beta: 0.00012, name: 'Water', SG: 1.0 },
  crude_light: { beta: 0.00050, name: 'Light Crude Oil', SG: 0.80 },
  crude_heavy: { beta: 0.00035, name: 'Heavy Crude Oil', SG: 0.92 },
  gasoline: { beta: 0.00060, name: 'Gasoline', SG: 0.74 },
  diesel: { beta: 0.00045, name: 'Diesel Fuel', SG: 0.85 },
  kerosene: { beta: 0.00055, name: 'Kerosene', SG: 0.80 },
  lube_oil: { beta: 0.00038, name: 'Lube Oil', SG: 0.90 },
  lpg: { beta: 0.00120, name: 'LPG (Liquid)', SG: 0.55 },
  propane: { beta: 0.00150, name: 'Propane', SG: 0.50 },
  butane: { beta: 0.00110, name: 'n-Butane', SG: 0.58 },
  ammonia: { beta: 0.00130, name: 'Ammonia', SG: 0.68 },
  methanol: { beta: 0.00070, name: 'Methanol', SG: 0.79 },
  custom: { beta: 0.00050, name: 'Custom', SG: 1.0 },
};

const calculateThermalExpansionRate = (
  liquidVolume: number, expansionCoeff: number, heatingRate: number
): { volumeRate: number; massRate: number } => {
  const volumeRateGPH = liquidVolume * expansionCoeff * heatingRate;
  const volumeRate = volumeRateGPH / 60;
  const massRate = volumeRateGPH * 8.34;
  return { volumeRate, massRate };
};

// ============================================
// CONTROL VALVE FAILURE SCENARIOS
// ============================================
const FAILURE_SCENARIOS = [
  { id: 'cv_fail_open', name: 'Control Valve Fails Open', description: 'Upstream CV fails fully open' },
  { id: 'cv_fail_closed', name: 'Control Valve Fails Closed', description: 'Downstream CV fails closed' },
  { id: 'check_valve_fail', name: 'Check Valve Failure', description: 'Check valve fails to close' },
  { id: 'pump_deadhead', name: 'Pump Deadhead', description: 'Pump against closed discharge' },
  { id: 'tube_rupture', name: 'Exchanger Tube Rupture', description: 'High to low pressure rupture' },
  { id: 'regulator_fail', name: 'Pressure Regulator Failure', description: 'Regulator fails open' },
  { id: 'blocked_outlet', name: 'Blocked Outlet', description: 'Blocked discharge with heat input' },
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
// RESULT DISPLAY COMPONENT
// ============================================
interface OrificeResultProps {
  requiredArea: number;
  selectedOrifice: { designation: string; area: number; inletSize: string; outletSize: string; diameter: number } | null;
  title?: string;
  additionalInfo?: React.ReactNode;
}

const OrificeResultCard: React.FC<OrificeResultProps> = ({ requiredArea, selectedOrifice, title = "Orifice Selection", additionalInfo }) => {
  const requiredDiameter = calculateDiameter(requiredArea);
  const utilizationPercent = selectedOrifice ? (requiredArea / selectedOrifice.area * 100) : 0;
  
  return (
    <Card className="border-gold/30 bg-gradient-card shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          {selectedOrifice ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Required Area */}
          <div className="space-y-3 p-4 bg-secondary/50 rounded-lg border border-border">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Required</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Area:</span>
                <span className="text-xl font-mono font-bold text-foreground">{requiredArea.toFixed(4)} in²</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Equiv. Diameter:</span>
                <span className="font-mono font-medium text-foreground">{requiredDiameter.toFixed(3)}"</span>
              </div>
            </div>
          </div>
          
          {/* Selected Orifice */}
          <div className="space-y-3 p-4 bg-primary/10 rounded-lg border border-gold/30">
            <h4 className="font-semibold text-sm text-primary uppercase tracking-wide">Selected (API RP 526)</h4>
            {selectedOrifice ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Orifice Type:</span>
                  <Badge variant="outline" className="text-lg font-bold border-gold text-primary px-3 py-1">
                    {selectedOrifice.designation}
                  </Badge>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Effective Area:</span>
                  <span className="font-mono font-medium">{selectedOrifice.area} in²</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Orifice Dia.:</span>
                  <span className="font-mono font-medium">{selectedOrifice.diameter.toFixed(3)}"</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Inlet × Outlet:</span>
                  <span className="font-mono font-medium">{selectedOrifice.inletSize}" × {selectedOrifice.outletSize}"</span>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Utilization:</span>
                    <span className={`font-mono font-bold ${utilizationPercent > 90 ? 'text-amber-500' : 'text-green-500'}`}>
                      {utilizationPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${utilizationPercent > 90 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    />
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
// MAIN COMPONENT
// ============================================
export default function API520Calculator() {
  // Vapor inputs
  const [vaporInputs, setVaporInputs] = useState({
    massFlow: 10000,
    setPresure: 150,
    overpressure: 10,
    backPressure: 14.7,
    temperature: 200,
    molecularWeight: 29,
    specificHeatRatio: 1.4,
    compressibility: 1.0,
    dischargeCoeff: 0.975,
    valveType: 'conventional' as 'conventional' | 'balanced' | 'pilot',
    ruptureDisk: false,
    selectedGas: 'Air',
  });

  // Liquid inputs
  const [liquidInputs, setLiquidInputs] = useState({
    flowRate: 500,
    specificGravity: 1.0,
    viscosity: 1.0,
    setPresure: 150,
    overpressure: 10,
    backPressure: 0,
    dischargeCoeff: 0.65,
    valveType: 'conventional' as 'conventional' | 'balanced',
    ruptureDisk: false,
  });

  // Two-phase inputs
  const [twoPhaseInputs, setTwoPhaseInputs] = useState({
    totalMassFlow: 50000,
    vaporFraction: 0.1,
    setPresure: 150,
    overpressure: 10,
    backPressure: 14.7,
    liquidDensity: 50,
    vaporDensity: 0.5,
    specificHeatRatio: 1.3,
    dischargeCoeff: 0.85,
    ruptureDisk: false,
  });

  // Steam inputs
  const [steamInputs, setSteamInputs] = useState({
    massFlow: 10000,
    setPresure: 150,
    overpressure: 10,
    backPressure: 14.7,
    steamType: 'saturated' as 'saturated' | 'superheated',
    superheatTemp: 0,
    dischargeCoeff: 0.975,
    valveType: 'conventional' as 'conventional' | 'balanced' | 'pilot',
    ruptureDisk: false,
  });

  // Fire case inputs
  const [fireCaseInputs, setFireCaseInputs] = useState({
    vesselType: 'horizontal' as 'horizontal' | 'vertical' | 'sphere',
    diameter: 10,
    length: 30,
    liquidLevel: 50,
    environmentalFactor: 1.0,
    promptDrainage: true,
    latentHeat: 150,
    vaporMW: 44,
    vaporK: 1.13,
    setPresure: 250,
    overpressure: 21,
    relievingTemp: 200,
    compressibility: 0.85,
    dischargeCoeff: 0.975,
    ruptureDisk: false,
  });

  // Rupture disk inputs
  const [ruptureDiskInputs, setRuptureDiskInputs] = useState({
    serviceType: 'vapor' as 'vapor' | 'liquid' | 'steam',
    flowRate: 10000,
    burstPressure: 150,
    overpressure: 10,
    backPressure: 14.7,
    diskType: 0,
    dischargeCoeff: 0.62,
    vaporMW: 29,
    vaporK: 1.4,
    temperature: 200,
    compressibility: 1.0,
    specificGravity: 1.0,
  });

  // Thermal relief inputs
  const [thermalInputs, setThermalInputs] = useState({
    geometry: 'pipe' as 'pipe' | 'vessel',
    diameter: 8,
    length: 500,
    liquidType: 'crude_light' as keyof typeof LIQUID_EXPANSION_COEFFICIENTS,
    customBeta: 0.0005,
    specificGravity: 0.85,
    viscosity: 5.0,
    heatFlux: 100,
    setPresure: 150,
    overpressure: 10,
    backPressure: 0,
    dischargeCoeff: 0.65,
    ruptureDisk: false,
  });

  // Failure scenario inputs
  const [failureInputs, setFailureInputs] = useState({
    scenario: 'cv_fail_open' as typeof FAILURE_SCENARIOS[number]['id'],
    fluidType: 'liquid' as 'liquid' | 'gas',
    valveCv: 200,
    upstreamPressure: 300,
    downstreamPressure: 50,
    specificGravity: 0.85,
    viscosity: 5.0,
    vaporMW: 44,
    vaporK: 1.15,
    temperature: 100,
    compressibility: 0.95,
    setPresure: 150,
    overpressure: 10,
    backPressure: 0,
    dischargeCoeff: 0.65,
    ruptureDisk: false,
  });

  // ===== VAPOR CALCULATIONS =====
  const vaporResults = useMemo(() => {
    const P1_abs = vaporInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + vaporInputs.overpressure / 100);
    const T_abs = vaporInputs.temperature + 459.67;
    const gasData = C_VALUES_TABLE[vaporInputs.selectedGas];
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
    const requiredArea = calculateVaporArea(
      vaporInputs.massFlow, C, vaporInputs.dischargeCoeff, relievingPressure,
      Kb, Kc, T_abs, vaporInputs.compressibility, vaporInputs.molecularWeight
    );
    const selectedOrifice = selectOrifice(requiredArea);
    return { relievingPressure, C, Kb, Kc, criticalRatio, flowRegime, requiredArea, selectedOrifice };
  }, [vaporInputs]);

  // ===== LIQUID CALCULATIONS =====
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

  // ===== TWO-PHASE CALCULATIONS =====
  const twoPhaseResults = useMemo(() => {
    const P1_abs = twoPhaseInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + twoPhaseInputs.overpressure / 100);
    const Kc = twoPhaseInputs.ruptureDisk ? 0.9 : 1.0;
    const result = calculateOmegaMethod(
      twoPhaseInputs.totalMassFlow, relievingPressure, twoPhaseInputs.backPressure,
      twoPhaseInputs.vaporFraction, twoPhaseInputs.liquidDensity, twoPhaseInputs.vaporDensity,
      twoPhaseInputs.dischargeCoeff, Kc, twoPhaseInputs.specificHeatRatio
    );
    const selectedOrifice = selectOrifice(result.area);
    return { relievingPressure, Kc, ...result, selectedOrifice };
  }, [twoPhaseInputs]);

  // ===== STEAM CALCULATIONS =====
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

  // ===== FIRE CASE CALCULATIONS =====
  const fireCaseResults = useMemo(() => {
    const P1_abs = fireCaseInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + fireCaseInputs.overpressure / 100);
    const T_abs = fireCaseInputs.relievingTemp + 459.67;
    const { wettedArea, totalSurfaceArea } = calculateWettedArea(
      fireCaseInputs.vesselType, fireCaseInputs.diameter, fireCaseInputs.length, fireCaseInputs.liquidLevel
    );
    const heatAbsorption = calculateFireHeatAbsorption(wettedArea, fireCaseInputs.environmentalFactor, fireCaseInputs.promptDrainage);
    const Kc = fireCaseInputs.ruptureDisk ? 0.9 : 1.0;
    const { massFlow, requiredArea, C } = calculateFireCaseRelief(
      heatAbsorption, fireCaseInputs.latentHeat, fireCaseInputs.vaporMW, fireCaseInputs.vaporK,
      relievingPressure, T_abs, fireCaseInputs.compressibility, fireCaseInputs.dischargeCoeff, 1.0, Kc
    );
    const selectedOrifice = selectOrifice(requiredArea);
    return { wettedArea, totalSurfaceArea, heatAbsorption, massFlow, relievingPressure, C, Kc, requiredArea, selectedOrifice };
  }, [fireCaseInputs]);

  // ===== RUPTURE DISK CALCULATIONS =====
  const ruptureDiskResults = useMemo(() => {
    const P1_abs = ruptureDiskInputs.burstPressure + 14.7;
    const relievingPressure = P1_abs * (1 + ruptureDiskInputs.overpressure / 100);
    const T_abs = ruptureDiskInputs.temperature + 459.67;
    const diskData = RUPTURE_DISK_TYPES[ruptureDiskInputs.diskType];
    const Kr = diskData.Kr;
    const { requiredArea, Knet } = calculateRuptureDiskArea(
      ruptureDiskInputs.serviceType, ruptureDiskInputs.flowRate, ruptureDiskInputs.dischargeCoeff, Kr,
      relievingPressure, ruptureDiskInputs.backPressure, ruptureDiskInputs.vaporMW, ruptureDiskInputs.vaporK,
      T_abs, ruptureDiskInputs.compressibility, ruptureDiskInputs.specificGravity
    );
    const selectedDisk = selectRuptureDiskSize(requiredArea);
    return { relievingPressure, Kr, Knet, requiredArea, selectedDisk, diskType: diskData.type };
  }, [ruptureDiskInputs]);

  // ===== THERMAL RELIEF CALCULATIONS =====
  const thermalResults = useMemo(() => {
    const liquidProps = LIQUID_EXPANSION_COEFFICIENTS[thermalInputs.liquidType];
    const beta = thermalInputs.liquidType === 'custom' ? thermalInputs.customBeta : liquidProps.beta;
    let volumeGal: number, surfaceArea: number;
    if (thermalInputs.geometry === 'pipe') {
      const diamFt = thermalInputs.diameter / 12;
      volumeGal = Math.PI * Math.pow(diamFt / 2, 2) * thermalInputs.length * 7.481;
      surfaceArea = Math.PI * diamFt * thermalInputs.length;
    } else {
      volumeGal = Math.PI * Math.pow(thermalInputs.diameter / 2, 2) * thermalInputs.length * 7.481;
      surfaceArea = Math.PI * thermalInputs.diameter * thermalInputs.length + Math.PI * Math.pow(thermalInputs.diameter, 2) / 2;
    }
    const totalHeatInput = thermalInputs.heatFlux * surfaceArea;
    const liquidMass = volumeGal * 8.34 * thermalInputs.specificGravity;
    const heatingRate = totalHeatInput / (liquidMass * 0.5);
    const { volumeRate } = calculateThermalExpansionRate(volumeGal, beta, heatingRate);
    const P1 = thermalInputs.setPresure * (1 + thermalInputs.overpressure / 100);
    const Kc = thermalInputs.ruptureDisk ? 0.9 : 1.0;
    const prelimArea = calculateLiquidArea(volumeRate, thermalInputs.specificGravity, thermalInputs.dischargeCoeff, 1.0, Kc, 1.0, P1, thermalInputs.backPressure);
    const Re = calculateReynoldsForLiquid(volumeRate, thermalInputs.specificGravity, thermalInputs.viscosity, Math.max(prelimArea, 0.01));
    const Kv = calculateKv(Re);
    const requiredArea = calculateLiquidArea(volumeRate, thermalInputs.specificGravity, thermalInputs.dischargeCoeff, 1.0, Kc, Kv, P1, thermalInputs.backPressure);
    const selectedOrifice = selectOrifice(requiredArea);
    return { volumeGal, surfaceArea, beta, heatingRate, totalHeatInput, volumeRate, relievingPressure: P1, Kv, Kc, Re, requiredArea, selectedOrifice, liquidName: liquidProps.name };
  }, [thermalInputs]);

  // ===== FAILURE SCENARIO CALCULATIONS =====
  const failureResults = useMemo(() => {
    const scenarioInfo = FAILURE_SCENARIOS.find(s => s.id === failureInputs.scenario);
    const cvFlow = calculateCvFlow(
      failureInputs.valveCv, failureInputs.upstreamPressure, failureInputs.downstreamPressure,
      failureInputs.specificGravity, failureInputs.fluidType, failureInputs.vaporMW,
      failureInputs.temperature, failureInputs.compressibility, failureInputs.vaporK
    );
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

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-gold/30 bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <span className="text-gradient-gold">API 520/521 Relief Valve Sizing</span>
            <Badge variant="outline" className="border-gold/50 text-primary">API 520 Part I (10th Ed)</Badge>
            <Badge variant="outline" className="border-gold/50 text-primary">API 521 (7th Ed)</Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Comprehensive pressure relief device sizing per API 520/521 standards with orifice selection per API RP 526
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="vapor" className="space-y-4">
        <TabsList className="grid grid-cols-9 w-full bg-secondary/50 border border-border">
          <TabsTrigger value="vapor" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Vapor/Gas</TabsTrigger>
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
        </TabsList>

        {/* VAPOR TAB */}
        <TabsContent value="vapor" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Process Conditions</CardTitle>
                <CardDescription>Per API 520 Part I, Section 5.6</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Mass Flow Rate (lb/hr)</Label>
                    <Input type="number" value={vaporInputs.massFlow} onChange={(e) => setVaporInputs({ ...vaporInputs, massFlow: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure (psig)</Label>
                    <Input type="number" value={vaporInputs.setPresure} onChange={(e) => setVaporInputs({ ...vaporInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Overpressure (%)</Label>
                    <Input type="number" value={vaporInputs.overpressure} onChange={(e) => setVaporInputs({ ...vaporInputs, overpressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Back Pressure (psia)</Label>
                    <Input type="number" value={vaporInputs.backPressure} onChange={(e) => setVaporInputs({ ...vaporInputs, backPressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Temperature (°F)</Label>
                    <Input type="number" value={vaporInputs.temperature} onChange={(e) => setVaporInputs({ ...vaporInputs, temperature: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Gas Selection</Label>
                    <Select value={vaporInputs.selectedGas} onValueChange={(v) => {
                      const gasData = C_VALUES_TABLE[v];
                      if (gasData) setVaporInputs({ ...vaporInputs, selectedGas: v, molecularWeight: gasData.MW, specificHeatRatio: gasData.k });
                    }}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(C_VALUES_TABLE).map((gas) => (<SelectItem key={gas} value={gas}>{gas}</SelectItem>))}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Molecular Weight</Label>
                    <Input type="number" value={vaporInputs.molecularWeight} onChange={(e) => setVaporInputs({ ...vaporInputs, molecularWeight: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">k (Cp/Cv)</Label>
                    <Input type="number" step="0.01" value={vaporInputs.specificHeatRatio} onChange={(e) => setVaporInputs({ ...vaporInputs, specificHeatRatio: parseFloat(e.target.value) || 1.4 })} className="bg-secondary/50 border-border" />
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
                  <p className="text-xs text-muted-foreground">API default: 0.975 for vapor (certified)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="vaporRuptureDisk" checked={vaporInputs.ruptureDisk} onChange={(e) => setVaporInputs({ ...vaporInputs, ruptureDisk: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="vaporRuptureDisk" className="text-muted-foreground">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">API 520 Equation (5.6.2):</h4>
                  <p className="font-mono text-xs text-foreground">A = W × √(TZ/M) / (C × Kd × P₁ × Kb × Kc)</p>
                </div>

                {/* Coefficients Display */}
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

          <OrificeResultCard requiredArea={vaporResults.requiredArea} selectedOrifice={vaporResults.selectedOrifice} title="Vapor Relief Valve Selection" />
        </TabsContent>

        {/* LIQUID TAB */}
        <TabsContent value="liquid" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Process Conditions</CardTitle>
                <CardDescription>Per API 520 Part I, Section 5.8</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Flow Rate (gpm)</Label>
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
                    <Label className="text-muted-foreground">Set Pressure (psig)</Label>
                    <Input type="number" value={liquidInputs.setPresure} onChange={(e) => setLiquidInputs({ ...liquidInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Overpressure (%)</Label>
                    <Input type="number" value={liquidInputs.overpressure} onChange={(e) => setLiquidInputs({ ...liquidInputs, overpressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Back Pressure (psig)</Label>
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
                  <p className="text-xs text-muted-foreground">API default: 0.65 for liquid (certified), 0.62 (uncertified)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="liquidRuptureDisk" checked={liquidInputs.ruptureDisk} onChange={(e) => setLiquidInputs({ ...liquidInputs, ruptureDisk: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="liquidRuptureDisk" className="text-muted-foreground">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">API 520 Equation (5.8):</h4>
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

          <OrificeResultCard requiredArea={liquidResults.requiredArea} selectedOrifice={liquidResults.selectedOrifice} title="Liquid Relief Valve Selection" />
        </TabsContent>

        {/* TWO-PHASE TAB */}
        <TabsContent value="twophase" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Two-Phase Flow Conditions</CardTitle>
                <CardDescription>Per API 520 Part I, Appendix D (Omega Method)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Total Mass Flow (lb/hr)</Label>
                    <Input type="number" value={twoPhaseInputs.totalMassFlow} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, totalMassFlow: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vapor Mass Fraction</Label>
                    <Input type="number" step="0.01" min="0" max="1" value={twoPhaseInputs.vaporFraction} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, vaporFraction: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure (psig)</Label>
                    <Input type="number" value={twoPhaseInputs.setPresure} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Overpressure (%)</Label>
                    <Input type="number" value={twoPhaseInputs.overpressure} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, overpressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Back Pressure (psia)</Label>
                    <Input type="number" value={twoPhaseInputs.backPressure} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, backPressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Liquid Density (lb/ft³)</Label>
                    <Input type="number" value={twoPhaseInputs.liquidDensity} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, liquidDensity: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vapor Density (lb/ft³)</Label>
                    <Input type="number" step="0.01" value={twoPhaseInputs.vaporDensity} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, vaporDensity: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
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
                <CardTitle className="text-lg text-primary">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Discharge Coefficient (Kd)</Label>
                  <Input type="number" step="0.01" value={twoPhaseInputs.dischargeCoeff} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, dischargeCoeff: parseFloat(e.target.value) || 0.85 })} className="bg-secondary/50 border-border" />
                  <p className="text-xs text-muted-foreground">Typical: 0.85 for two-phase</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tpRuptureDisk" checked={twoPhaseInputs.ruptureDisk} onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, ruptureDisk: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="tpRuptureDisk" className="text-muted-foreground">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">Omega Method (API 520 Appendix D):</h4>
                  <p className="font-mono text-xs text-foreground">ω = (x×vᵥ + (1-x)×vₗ×k) / vₜₚ</p>
                  <p className="font-mono text-xs text-foreground">η꜀ = 0.55 + 0.217×ln(ω) - 0.046×(ln(ω))²</p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm"><span className="text-muted-foreground">ω (Omega):</span> <span className="font-mono font-medium">{twoPhaseResults.omega.toFixed(3)}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Mass Flux:</span> <span className="font-mono font-medium">{twoPhaseResults.massFlux.toFixed(0)} lb/hr/in²</span></div>
                  <div className="col-span-2 text-sm"><span className="text-muted-foreground">Flow Regime:</span> <Badge variant="secondary" className="ml-2">{twoPhaseResults.flowRegime}</Badge></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={twoPhaseResults.area} selectedOrifice={twoPhaseResults.selectedOrifice} title="Two-Phase Relief Valve Selection" />
        </TabsContent>

        {/* STEAM TAB */}
        <TabsContent value="steam" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Steam Conditions</CardTitle>
                <CardDescription>Per API 520 Part I, Section 5.7</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Mass Flow Rate (lb/hr)</Label>
                    <Input type="number" value={steamInputs.massFlow} onChange={(e) => setSteamInputs({ ...steamInputs, massFlow: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure (psig)</Label>
                    <Input type="number" value={steamInputs.setPresure} onChange={(e) => setSteamInputs({ ...steamInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Overpressure (%)</Label>
                    <Input type="number" value={steamInputs.overpressure} onChange={(e) => setSteamInputs({ ...steamInputs, overpressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Back Pressure (psia)</Label>
                    <Input type="number" value={steamInputs.backPressure} onChange={(e) => setSteamInputs({ ...steamInputs, backPressure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Steam Type</Label>
                    <Select value={steamInputs.steamType} onValueChange={(v) => setSteamInputs({ ...steamInputs, steamType: v as any })}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saturated">Saturated</SelectItem>
                        <SelectItem value="superheated">Superheated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {steamInputs.steamType === 'superheated' && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Superheat Temp (°F)</Label>
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
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Valve Type</Label>
                  <Select value={steamInputs.valveType} onValueChange={(v) => setSteamInputs({ ...steamInputs, valveType: v as any })}>
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
                  <Input type="number" step="0.001" value={steamInputs.dischargeCoeff} onChange={(e) => setSteamInputs({ ...steamInputs, dischargeCoeff: parseFloat(e.target.value) || 0.975 })} className="bg-secondary/50 border-border" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="steamRuptureDisk" checked={steamInputs.ruptureDisk} onChange={(e) => setSteamInputs({ ...steamInputs, ruptureDisk: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="steamRuptureDisk" className="text-muted-foreground">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-gold/20 space-y-2">
                  <h4 className="font-medium text-sm text-primary">API 520 Equation (5.7):</h4>
                  <p className="font-mono text-xs text-foreground">A = W / (51.5 × Kd × P₁ × Kb × Kc × Kn × Ksh)</p>
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

          <OrificeResultCard requiredArea={steamResults.requiredArea} selectedOrifice={steamResults.selectedOrifice} title="Steam Relief Valve Selection" />
        </TabsContent>

        {/* FIRE CASE TAB */}
        <TabsContent value="firecase" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Vessel Geometry
                </CardTitle>
                <CardDescription>Per API 521 Section 5.15</CardDescription>
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
                    <Label className="text-muted-foreground">Diameter (ft)</Label>
                    <Input type="number" step="0.5" value={fireCaseInputs.diameter} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, diameter: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{fireCaseInputs.vesselType === 'sphere' ? 'N/A' : 'Length/Height (ft)'}</Label>
                    <Input type="number" step="0.5" value={fireCaseInputs.length} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, length: parseFloat(e.target.value) || 0 })} disabled={fireCaseInputs.vesselType === 'sphere'} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Liquid Level (%)</Label>
                    <Input type="number" min="0" max="100" value={fireCaseInputs.liquidLevel} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, liquidLevel: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Environmental Factor (F)</Label>
                    <Select value={fireCaseInputs.environmentalFactor.toString()} onValueChange={(v) => setFireCaseInputs({ ...fireCaseInputs, environmentalFactor: parseFloat(v) })}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENVIRONMENTAL_FACTORS.map((ef) => (
                          <SelectItem key={ef.description} value={ef.F.toString()}>{ef.description} (F = {ef.F})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="promptDrainage" checked={fireCaseInputs.promptDrainage} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, promptDrainage: e.target.checked })} className="h-4 w-4 accent-primary" />
                    <Label htmlFor="promptDrainage" className="text-muted-foreground">Adequate Drainage (C=21000)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">Fluid Properties & Relief</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Latent Heat (BTU/lb)</Label>
                    <Input type="number" value={fireCaseInputs.latentHeat} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, latentHeat: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vapor MW</Label>
                    <Input type="number" value={fireCaseInputs.vaporMW} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, vaporMW: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Vapor k (Cp/Cv)</Label>
                    <Input type="number" step="0.01" value={fireCaseInputs.vaporK} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, vaporK: parseFloat(e.target.value) || 1.1 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Set Pressure (psig)</Label>
                    <Input type="number" value={fireCaseInputs.setPresure} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, setPresure: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Overpressure (%) - Fire: 21%</Label>
                    <Input type="number" value={fireCaseInputs.overpressure} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, overpressure: parseFloat(e.target.value) || 21 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Relieving Temp (°F)</Label>
                    <Input type="number" value={fireCaseInputs.relievingTemp} onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, relievingTemp: parseFloat(e.target.value) || 0 })} className="bg-secondary/50 border-border" />
                  </div>
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

          <OrificeResultCard requiredArea={fireCaseResults.requiredArea} selectedOrifice={fireCaseResults.selectedOrifice} title="Fire Case Relief Valve Selection" />
        </TabsContent>

        {/* RUPTURE DISK TAB */}
        <TabsContent value="rupturedisk" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <Disc className="h-5 w-5 text-blue-500" />
                  Rupture Disk Configuration
                </CardTitle>
                <CardDescription>Per API 520 Part II, Section 5</CardDescription>
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
                        <Badge variant="outline" className="text-lg font-bold border-gold text-primary px-3 py-1">
                          {ruptureDiskResults.selectedDisk.size}"
                        </Badge>
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

        {/* THERMAL TAB */}
        <TabsContent value="thermal" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-red-500" />
                  System Geometry
                </CardTitle>
                <CardDescription>Per API 521 Section 5.6 - Blocked Outlet</CardDescription>
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
                      <SelectContent>
                        {Object.entries(LIQUID_EXPANSION_COEFFICIENTS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label className="text-muted-foreground">Overpressure (%)</Label>
                    <Input type="number" value={thermalInputs.overpressure} onChange={(e) => setThermalInputs({ ...thermalInputs, overpressure: parseFloat(e.target.value) || 10 })} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Kd</Label>
                    <Input type="number" step="0.01" value={thermalInputs.dischargeCoeff} onChange={(e) => setThermalInputs({ ...thermalInputs, dischargeCoeff: parseFloat(e.target.value) || 0.65 })} className="bg-secondary/50 border-border" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="thermalRD" checked={thermalInputs.ruptureDisk} onChange={(e) => setThermalInputs({ ...thermalInputs, ruptureDisk: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="thermalRD" className="text-muted-foreground">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrificeResultCard requiredArea={thermalResults.requiredArea} selectedOrifice={thermalResults.selectedOrifice} title="Thermal Relief Valve Selection" />
        </TabsContent>

        {/* FAILURE TAB */}
        <TabsContent value="failure" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Failure Scenario
                </CardTitle>
                <CardDescription>Per API 521 Section 5.3</CardDescription>
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

          <OrificeResultCard requiredArea={failureResults.requiredArea} selectedOrifice={failureResults.selectedOrifice} title="Failure Scenario Relief Valve Selection" />
        </TabsContent>

        {/* REFERENCE TAB */}
        <TabsContent value="reference" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-primary">API RP 526 Standard Orifice Sizes</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-primary">Designation</TableHead>
                      <TableHead className="text-primary">Area (in²)</TableHead>
                      <TableHead className="text-primary">Diameter (in)</TableHead>
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
                    {Object.entries(C_VALUES_TABLE).map(([gas, data]) => (
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
      </Tabs>
    </div>
  );
}
