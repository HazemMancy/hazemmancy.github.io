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

// Scenario comparison types
interface SavedScenario {
  id: string;
  name: string;
  type: 'vapor' | 'liquid' | 'twophase' | 'steam' | 'fire' | 'rupturedisk' | 'overfill' | 'thermal' | 'failure';
  timestamp: Date;
  inputs: Record<string, any>;
  results: {
    requiredArea: number;
    selectedOrifice: { designation: string; area: number } | null;
    relievingPressure: number;
    massFlow?: number;
    flowRate?: number;
    flowUnit?: string;
    correctionFactors: Record<string, number>;
  };
}

// ============================================
// API 520 STANDARD ORIFICE AREAS (API RP 526)
// Effective discharge areas in square inches
// ============================================
const ORIFICE_SIZES = [
  { designation: 'D', area: 0.110, inletSize: '1', outletSize: '2' },
  { designation: 'E', area: 0.196, inletSize: '1', outletSize: '2' },
  { designation: 'F', area: 0.307, inletSize: '1.5x2', outletSize: '2.5' },
  { designation: 'G', area: 0.503, inletSize: '1.5x2', outletSize: '3' },
  { designation: 'H', area: 0.785, inletSize: '2x3', outletSize: '4' },
  { designation: 'J', area: 1.287, inletSize: '3', outletSize: '4' },
  { designation: 'K', area: 1.838, inletSize: '3', outletSize: '4x6' },
  { designation: 'L', area: 2.853, inletSize: '4', outletSize: '6' },
  { designation: 'M', area: 3.600, inletSize: '4', outletSize: '6' },
  { designation: 'N', area: 4.340, inletSize: '4', outletSize: '6' },
  { designation: 'P', area: 6.380, inletSize: '4x6', outletSize: '8' },
  { designation: 'Q', area: 11.05, inletSize: '6', outletSize: '8x10' },
  { designation: 'R', area: 16.00, inletSize: '6x8', outletSize: '10' },
  { designation: 'T', area: 26.00, inletSize: '8', outletSize: '10x12' },
];

const selectOrifice = (requiredArea: number): { designation: string; area: number; inletSize: string; outletSize: string } | null => {
  for (const orifice of ORIFICE_SIZES) {
    if (orifice.area >= requiredArea) {
      return orifice;
    }
  }
  return null;
};

// ============================================
// API 520 COEFFICIENT C FROM k (Cp/Cv)
// Per API 520 Part I, Equation 3.2
// C = 520 × √[k × (2/(k+1))^((k+1)/(k-1))]
// ============================================
const calculateCCoefficient = (k: number): number => {
  if (k <= 1) return 315; // Minimum practical value
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

// ============================================
// CRITICAL PRESSURE RATIO
// Per API 520 Part I
// ============================================
const calculateCriticalRatio = (k: number): number => {
  return Math.pow(2 / (k + 1), k / (k - 1));
};

// ============================================
// API 520 VAPOR/GAS RELIEF SIZING
// Per API 520 Part I, Section 5.6.2, Equation 1
// A = W × √(TZ/M) / (C × Kd × P1 × Kb × Kc)
// Where:
//   A = required area (in²)
//   W = mass flow rate (lb/hr)
//   T = relieving temperature (°R)
//   Z = compressibility factor
//   M = molecular weight
//   C = coefficient from k
//   Kd = discharge coefficient (0.975 for vapor)
//   P1 = relieving pressure (psia)
//   Kb = backpressure correction factor
//   Kc = combination correction factor
// ============================================
const calculateVaporArea = (
  W: number,      // Mass flow rate (lb/hr)
  C: number,      // Coefficient from gas properties
  Kd: number,     // Discharge coefficient (default 0.975)
  P1: number,     // Relieving pressure (psia)
  Kb: number,     // Back pressure correction factor
  Kc: number,     // Combination correction factor
  T: number,      // Relieving temperature (°R)
  Z: number,      // Compressibility factor
  M: number       // Molecular weight
): number => {
  if (P1 <= 0 || M <= 0) return 0;
  return (W * Math.sqrt((T * Z) / M)) / (C * Kd * P1 * Kb * Kc);
};

// ============================================
// API 520 LIQUID RELIEF SIZING
// Per API 520 Part I, Section 5.8, Equation 5
// A = Q × √(G) / (38 × Kd × Kw × Kc × Kv × √(P1-P2))
// Where:
//   A = required area (in²)
//   Q = volumetric flow rate (gpm at flowing temp)
//   G = specific gravity at flowing temp (water = 1.0)
//   Kd = discharge coefficient (0.65 certified, use 0.62 if uncertified)
//   Kw = backpressure correction factor (balanced bellows only)
//   Kc = combination correction factor
//   Kv = viscosity correction factor
//   P1 = set pressure + overpressure (psig)
//   P2 = total back pressure (psig)
// ============================================
const calculateLiquidArea = (
  Q: number,      // Flow rate (gpm)
  G: number,      // Specific gravity
  Kd: number,     // Discharge coefficient (default 0.65)
  Kw: number,     // Back pressure correction factor
  Kc: number,     // Combination correction factor
  Kv: number,     // Viscosity correction factor
  P1: number,     // Set pressure + overpressure (psig)
  P2: number      // Total back pressure (psig)
): number => {
  const deltaP = P1 - P2;
  if (deltaP <= 0) return 0;
  return (Q * Math.sqrt(G)) / (38 * Kd * Kw * Kc * Kv * Math.sqrt(deltaP));
};

// ============================================
// API 520 STEAM RELIEF SIZING
// Per API 520 Part I, Section 5.7
// For saturated steam:
//   A = W / (51.5 × Kd × P1 × Kb × Kc × Kn × Ksh)
// Where:
//   A = required area (in²)
//   W = steam mass flow rate (lb/hr)
//   Kd = discharge coefficient (0.975)
//   P1 = relieving pressure (psia)
//   Kb = backpressure correction factor
//   Kc = combination correction factor
//   Kn = Napier correction factor (for P > 1500 psia)
//   Ksh = superheat correction factor
// ============================================
const calculateSteamArea = (
  W: number,      // Steam flow rate (lb/hr)
  P1: number,     // Relieving pressure (psia)
  Kd: number,     // Discharge coefficient
  Kb: number,     // Back pressure correction factor
  Kc: number,     // Combination correction factor
  Kn: number,     // Napier correction factor
  Ksh: number     // Superheat correction factor
): number => {
  if (P1 <= 0) return 0;
  return W / (51.5 * P1 * Kd * Kb * Kc * Kn * Ksh);
};

// ============================================
// NAPIER CORRECTION FACTOR (Kn)
// Per API 520 Part I, Section 5.7.1
// For saturated steam at high pressures
// Kn = 1.0 for P1 ≤ 1515 psia
// Kn = (0.1906×P1 - 1000) / (0.2292×P1 - 1061) for 1515 < P1 ≤ 3215 psia
// ============================================
const calculateKn = (P1: number): number => {
  if (P1 <= 1515) return 1.0;
  if (P1 <= 3215) {
    return (0.1906 * P1 - 1000) / (0.2292 * P1 - 1061);
  }
  return 1.0; // Beyond valid range
};

// ============================================
// SUPERHEAT CORRECTION FACTOR (Ksh)
// Per API 520 Part I, Table 9
// Interpolated values based on pressure and temperature
// ============================================
const SUPERHEAT_TABLE: { pressure: number; temps: { temp: number; Ksh: number }[] }[] = [
  { pressure: 15, temps: [{ temp: 300, Ksh: 0.987 }, { temp: 400, Ksh: 0.957 }, { temp: 500, Ksh: 0.930 }, { temp: 600, Ksh: 0.905 }, { temp: 700, Ksh: 0.882 }, { temp: 800, Ksh: 0.861 }, { temp: 900, Ksh: 0.841 }, { temp: 1000, Ksh: 0.823 }] },
  { pressure: 50, temps: [{ temp: 300, Ksh: 0.998 }, { temp: 400, Ksh: 0.963 }, { temp: 500, Ksh: 0.935 }, { temp: 600, Ksh: 0.909 }, { temp: 700, Ksh: 0.885 }, { temp: 800, Ksh: 0.864 }, { temp: 900, Ksh: 0.844 }, { temp: 1000, Ksh: 0.825 }] },
  { pressure: 100, temps: [{ temp: 400, Ksh: 0.972 }, { temp: 500, Ksh: 0.942 }, { temp: 600, Ksh: 0.914 }, { temp: 700, Ksh: 0.890 }, { temp: 800, Ksh: 0.868 }, { temp: 900, Ksh: 0.847 }, { temp: 1000, Ksh: 0.828 }] },
  { pressure: 200, temps: [{ temp: 400, Ksh: 0.987 }, { temp: 500, Ksh: 0.953 }, { temp: 600, Ksh: 0.923 }, { temp: 700, Ksh: 0.897 }, { temp: 800, Ksh: 0.874 }, { temp: 900, Ksh: 0.852 }, { temp: 1000, Ksh: 0.833 }] },
  { pressure: 300, temps: [{ temp: 500, Ksh: 0.965 }, { temp: 600, Ksh: 0.932 }, { temp: 700, Ksh: 0.905 }, { temp: 800, Ksh: 0.880 }, { temp: 900, Ksh: 0.858 }, { temp: 1000, Ksh: 0.837 }] },
  { pressure: 400, temps: [{ temp: 500, Ksh: 0.978 }, { temp: 600, Ksh: 0.941 }, { temp: 700, Ksh: 0.912 }, { temp: 800, Ksh: 0.886 }, { temp: 900, Ksh: 0.863 }, { temp: 1000, Ksh: 0.842 }] },
  { pressure: 500, temps: [{ temp: 500, Ksh: 0.991 }, { temp: 600, Ksh: 0.951 }, { temp: 700, Ksh: 0.919 }, { temp: 800, Ksh: 0.892 }, { temp: 900, Ksh: 0.868 }, { temp: 1000, Ksh: 0.846 }] },
  { pressure: 600, temps: [{ temp: 500, Ksh: 0.999 }, { temp: 600, Ksh: 0.960 }, { temp: 700, Ksh: 0.926 }, { temp: 800, Ksh: 0.898 }, { temp: 900, Ksh: 0.873 }, { temp: 1000, Ksh: 0.851 }] },
  { pressure: 800, temps: [{ temp: 600, Ksh: 0.979 }, { temp: 700, Ksh: 0.940 }, { temp: 800, Ksh: 0.909 }, { temp: 900, Ksh: 0.883 }, { temp: 1000, Ksh: 0.859 }] },
  { pressure: 1000, temps: [{ temp: 600, Ksh: 0.997 }, { temp: 700, Ksh: 0.954 }, { temp: 800, Ksh: 0.921 }, { temp: 900, Ksh: 0.893 }, { temp: 1000, Ksh: 0.868 }] },
  { pressure: 1250, temps: [{ temp: 700, Ksh: 0.973 }, { temp: 800, Ksh: 0.935 }, { temp: 900, Ksh: 0.905 }, { temp: 1000, Ksh: 0.879 }] },
  { pressure: 1500, temps: [{ temp: 700, Ksh: 0.993 }, { temp: 800, Ksh: 0.951 }, { temp: 900, Ksh: 0.918 }, { temp: 1000, Ksh: 0.890 }] },
  { pressure: 2000, temps: [{ temp: 800, Ksh: 0.984 }, { temp: 900, Ksh: 0.946 }, { temp: 1000, Ksh: 0.914 }] },
  { pressure: 2500, temps: [{ temp: 900, Ksh: 0.979 }, { temp: 1000, Ksh: 0.941 }] },
  { pressure: 3000, temps: [{ temp: 1000, Ksh: 0.973 }] },
];

const calculateKsh = (P1: number, superheatTemp: number): number => {
  if (superheatTemp <= 0) return 1.0; // Saturated steam
  
  // Find pressure bounds
  let lowerP = SUPERHEAT_TABLE[0];
  let upperP = SUPERHEAT_TABLE[SUPERHEAT_TABLE.length - 1];
  
  for (let i = 0; i < SUPERHEAT_TABLE.length - 1; i++) {
    if (P1 >= SUPERHEAT_TABLE[i].pressure && P1 <= SUPERHEAT_TABLE[i + 1].pressure) {
      lowerP = SUPERHEAT_TABLE[i];
      upperP = SUPERHEAT_TABLE[i + 1];
      break;
    }
  }
  
  // Interpolate Ksh based on temperature at each pressure
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
  
  // Interpolate between pressure levels
  if (lowerP.pressure === upperP.pressure) return kshLower;
  const fraction = (P1 - lowerP.pressure) / (upperP.pressure - lowerP.pressure);
  return kshLower + (kshUpper - kshLower) * fraction;
};

// ============================================
// VISCOSITY CORRECTION FACTOR (Kv)
// Per API 520 Part I, Section 5.8.4
// Based on Reynolds number at the orifice
// Kv = (0.9935 + 2.878/√Re + 342.75/Re^1.5)^(-0.5)
// ============================================
const calculateKv = (Re: number): number => {
  if (Re >= 100000) return 1.0;
  if (Re <= 0) return 0.3; // Minimum
  const Kv = Math.pow(0.9935 + 2.878 / Math.sqrt(Re) + 342.75 / Math.pow(Re, 1.5), -0.5);
  return Math.max(0.3, Math.min(1.0, Kv));
};

// Calculate Reynolds number for liquid flow through orifice
// Re = Q × 2800 / (μ × √A)
// Where Q = gpm, μ = centipoise, A = in²
const calculateReynoldsForLiquid = (Q: number, G: number, viscosity: number, area: number): number => {
  if (viscosity <= 0 || area <= 0) return 100000;
  return (2800 * Q) / (viscosity * Math.sqrt(Math.max(area, 0.001)));
};

// ============================================
// BACKPRESSURE CORRECTION FACTOR (Kb)
// Per API 520 Part I, Figure 30 (Conventional)
// and Figure 31 (Balanced Bellows)
// ============================================

// For conventional valves (vapor/gas service)
// Kb is based on critical flow - if subcritical, capacity is reduced
const calculateKbConventional = (k: number, P1: number, Pb: number): number => {
  const criticalRatio = calculateCriticalRatio(k);
  const actualRatio = Pb / P1;
  
  if (actualRatio <= criticalRatio) {
    return 1.0; // Critical flow
  }
  
  // Subcritical flow - linear reduction from critical ratio to 1.0
  // Per API 520 Figure 30
  const Kb = 1.0 - (actualRatio - criticalRatio) / (1.0 - criticalRatio);
  return Math.max(0.1, Math.min(1.0, Kb));
};

// For balanced bellows valves (vapor/gas service)
// Per API 520 Figure 31 - more conservative than conventional
const calculateKbBalanced = (percentBackpressure: number): number => {
  // Based on API 520 Figure 31 curve
  if (percentBackpressure <= 30) return 1.0;
  if (percentBackpressure >= 50) return 0.70;
  
  // Linear interpolation between 30% and 50%
  return 1.0 - (percentBackpressure - 30) * 0.015;
};

// For pilot operated valves
// Kb = 1.0 for modulating pilots (up to critical)
// Kb follows conventional curve for pop-action pilots
const calculateKbPilot = (k: number, P1: number, Pb: number): number => {
  const criticalRatio = calculateCriticalRatio(k);
  const actualRatio = Pb / P1;
  
  if (actualRatio <= criticalRatio) return 1.0;
  
  // For subcritical, similar to conventional but slightly better
  const Kb = 1.0 - 0.8 * (actualRatio - criticalRatio) / (1.0 - criticalRatio);
  return Math.max(0.2, Math.min(1.0, Kb));
};

// ============================================
// BACKPRESSURE CORRECTION FACTOR (Kw)
// For liquid service (balanced bellows only)
// Per API 520 Part I, Figure 32
// ============================================
const calculateKw = (percentBackpressure: number): number => {
  if (percentBackpressure <= 15) return 1.0;
  if (percentBackpressure >= 50) return 0.80;
  
  // Curve fit to API 520 Figure 32
  return 1.0 - 0.00571 * (percentBackpressure - 15);
};

// ============================================
// TWO-PHASE OMEGA METHOD
// Per API 520 Part I, Appendix D
// For flashing and two-phase flow relief
// ============================================
const calculateOmegaMethod = (
  W: number,        // Total mass flow (lb/hr)
  P1: number,       // Relieving pressure (psia)
  P2: number,       // Back pressure (psia)
  x: number,        // Inlet vapor mass fraction (0-1)
  rhoL: number,     // Liquid density (lb/ft³)
  rhoV: number,     // Vapor density at inlet (lb/ft³)
  Kd: number,       // Discharge coefficient (0.85 typical for 2-phase)
  Kc: number,       // Combination factor
  k: number         // Specific heat ratio
): { area: number; omega: number; massFlux: number; flowRegime: string } => {
  // Calculate specific volumes
  const vL = 1 / rhoL;
  const vV = 1 / rhoV;
  const vTP = x * vV + (1 - x) * vL; // Two-phase specific volume
  
  // Calculate omega parameter (API 520 Eq. D.3)
  // ω = (x × vV + (1-x) × vL × k) / vTP
  const omega = (x * vV + (1 - x) * vL * k) / vTP;
  
  // Calculate pressure ratio
  const eta = P2 / P1;
  
  // Calculate critical pressure ratio for two-phase (API 520 Eq. D.5)
  // η_c = 0.55 + 0.217×ln(ω) - 0.046×(ln(ω))²
  let etaC = 0.55 + 0.217 * Math.log(omega) - 0.046 * Math.pow(Math.log(omega), 2);
  etaC = Math.max(0.05, Math.min(0.95, etaC));
  
  // Determine flow regime
  const isCritical = eta < etaC;
  const flowRegime = isCritical ? 'Critical (Choked)' : 'Subcritical';
  
  // Calculate mass flux G (lb/hr/in²)
  let massFlux: number;
  
  if (isCritical) {
    // Critical flow (API 520 Eq. D.6)
    // G = 68.09 × √(P1 × ρL × (1 - η_c) / ω)
    massFlux = 68.09 * Kd * Kc * Math.sqrt((P1 * rhoL * (1 - etaC)) / omega);
  } else {
    // Subcritical flow (API 520 Eq. D.7)
    const term1 = -2 * (omega - 1) * Math.log(eta);
    const term2 = (omega - 1) * (1 - eta);
    const term3 = (1 - eta * eta) / 2;
    massFlux = 68.09 * Kd * Kc * Math.sqrt(P1 * rhoL * (term1 + term2 + term3) / omega);
  }
  
  // Calculate required area (A = W / G)
  const area = W / massFlux;
  
  return { area, omega, massFlux, flowRegime };
};

// ============================================
// API 521 FIRE CASE CALCULATIONS
// Per API 521 Section 5.15
// ============================================

// Environmental factors per API 521 Table 5
const ENVIRONMENTAL_FACTORS = [
  { description: 'Bare vessel (no insulation)', F: 1.0, notes: 'No credit for drainage' },
  { description: 'Insulated - k×t ≥ 22.7 W/m² (4 BTU/hr·ft²·°F)', F: 0.30, notes: '1" min. mineral fiber equiv.' },
  { description: 'Insulated - k×t ≥ 11.4 W/m² (2 BTU/hr·ft²·°F)', F: 0.15, notes: '2" min. mineral fiber equiv.' },
  { description: 'Insulated - k×t ≥ 5.7 W/m² (1 BTU/hr·ft²·°F)', F: 0.075, notes: '4" min. mineral fiber equiv.' },
  { description: 'Insulated - k×t ≥ 3.8 W/m² (0.67 BTU/hr·ft²·°F)', F: 0.05, notes: '6" min. mineral fiber equiv.' },
  { description: 'Earth-covered storage (above grade)', F: 0.03, notes: 'Min. 3 ft earth cover' },
  { description: 'Underground storage', F: 0.00, notes: 'Below grade, no relief needed' },
  { description: 'Water spray system (approved)', F: 1.0, notes: 'No credit per API 521' },
  { description: 'Depressuring system installed', F: 1.0, notes: 'Requires separate analysis' },
];

// Fire heat absorption per API 521 Table 4 (updated values)
// Q = C × F × A^0.82
// C = 21000 for adequate drainage, 34500 for inadequate drainage
// A = wetted surface area (ft²)
const calculateFireHeatAbsorption = (
  wettedArea: number,    // ft²
  F: number,             // Environmental factor
  promptDrainage: boolean
): number => {
  // Per API 521 Table 4 / Section 5.15.2
  // For adequate drainage: Q = 21000 × F × A^0.82
  // For inadequate drainage: Q = 34500 × F × A^0.82
  const C = promptDrainage ? 21000 : 34500;
  return C * F * Math.pow(wettedArea, 0.82);
};

// Calculate wetted area for different vessel geometries
// Per API 521 Section 5.15.3
const calculateWettedArea = (
  vesselType: 'horizontal' | 'vertical' | 'sphere',
  diameter: number,        // ft
  length: number,          // ft (or height for vertical)
  liquidLevel: number      // % of diameter/height
): { wettedArea: number; totalSurfaceArea: number; maxWettedArea: number } => {
  const R = diameter / 2;
  let wettedArea = 0;
  let totalSurfaceArea = 0;
  
  if (vesselType === 'horizontal') {
    // Horizontal cylinder with 2:1 elliptical heads
    const liquidHeight = (liquidLevel / 100) * diameter;
    
    // Shell wetted area
    const theta = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - liquidHeight / R)));
    const wettedPerimeter = R * theta;
    const shellWetted = wettedPerimeter * length;
    
    // Head wetted area (2:1 elliptical)
    const headWettedFraction = Math.min(1, liquidLevel / 100);
    const headArea = 2 * Math.PI * R * R * 1.09 * headWettedFraction;
    
    wettedArea = shellWetted + headArea;
    totalSurfaceArea = Math.PI * diameter * length + 2 * Math.PI * R * R * 1.09;
    
  } else if (vesselType === 'vertical') {
    // Vertical cylinder - limited to 25 ft above grade per API 521
    const liquidHeight = (liquidLevel / 100) * length;
    const effectiveHeight = Math.min(liquidHeight, 25); // API 521 25 ft limit
    
    const shellWetted = Math.PI * diameter * effectiveHeight;
    const bottomHeadArea = Math.PI * R * R * 1.09; // 2:1 elliptical bottom
    
    wettedArea = shellWetted + bottomHeadArea;
    totalSurfaceArea = Math.PI * diameter * length + 2 * Math.PI * R * R * 1.09;
    
  } else { // sphere
    const liquidHeight = (liquidLevel / 100) * diameter;
    // Spherical cap area = π × D × h (for height h on sphere of diameter D)
    wettedArea = Math.PI * diameter * liquidHeight;
    totalSurfaceArea = Math.PI * diameter * diameter;
  }
  
  // Maximum wetted area for fire case (API 521 limits)
  const maxWettedArea = vesselType === 'vertical' 
    ? Math.PI * diameter * 25 + Math.PI * R * R * 1.09 
    : wettedArea;
  
  return { 
    wettedArea: Math.min(wettedArea, maxWettedArea), 
    totalSurfaceArea,
    maxWettedArea 
  };
};

// Calculate fire case relief requirements
const calculateFireCaseRelief = (
  heatAbsorption: number,   // BTU/hr
  latentHeat: number,       // BTU/lb
  vaporMW: number,
  vaporK: number,
  relievingPressure: number, // psia
  relievingTemp: number,     // °R
  compressibility: number,
  Kd: number,
  Kb: number,
  Kc: number
): { massFlow: number; requiredArea: number; C: number } => {
  // Mass flow rate = Q / λ (heat absorption / latent heat)
  const massFlow = heatAbsorption / latentHeat;
  
  // Calculate C coefficient
  const C = calculateCCoefficient(vaporK);
  
  // Calculate required area using vapor equation
  const requiredArea = calculateVaporArea(
    massFlow,
    C,
    Kd,
    relievingPressure,
    Kb,
    Kc,
    relievingTemp,
    compressibility,
    vaporMW
  );
  
  return { massFlow, requiredArea, C };
};

// ============================================
// RUPTURE DISK SIZING
// Per API 520 Part II, Section 5
// ============================================

// Rupture disk resistance factors (Kr) per API 520 Part II
const RUPTURE_DISK_TYPES = [
  { type: 'Pre-scored tension acting', Kr: 1.0, description: 'Scored metal disk, forward acting' },
  { type: 'Pre-scored reverse acting', Kr: 1.5, description: 'Scored reverse buckling' },
  { type: 'Conventional metal', Kr: 2.4, description: 'Solid metal, forward acting' },
  { type: 'Graphite / composite', Kr: 2.0, description: 'Composite or graphite' },
  { type: 'With knife blade', Kr: 0.8, description: 'Knife blade or cutter' },
];

// Standard rupture disk sizes per ASME B16.5 flanges
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

// Calculate RD with PRV in series
// Knet = Kd / √(1 + Kr)
const calculateRuptureDiskArea = (
  deviceType: 'vapor' | 'liquid' | 'steam',
  flowRate: number,
  Kd: number,
  Kr: number,
  pressure: number,
  backPressure: number,
  vaporMW?: number,
  vaporK?: number,
  temperature?: number,
  compressibility?: number,
  specificGravity?: number
): { requiredArea: number; Knet: number } => {
  // Net coefficient accounting for RD resistance
  const Knet = Kd / Math.sqrt(1 + Kr);
  
  let requiredArea = 0;
  
  if (deviceType === 'vapor' && vaporMW && vaporK && temperature && compressibility) {
    const C = calculateCCoefficient(vaporK);
    requiredArea = (flowRate * Math.sqrt((temperature * compressibility) / vaporMW)) / 
                   (C * Knet * pressure);
  } else if (deviceType === 'liquid' && specificGravity) {
    const deltaP = pressure - backPressure;
    if (deltaP > 0) {
      requiredArea = (flowRate * Math.sqrt(specificGravity)) / 
                     (38 * Knet * Math.sqrt(deltaP));
    }
  } else if (deviceType === 'steam') {
    requiredArea = flowRate / (51.5 * pressure * Knet);
  }
  
  return { requiredArea, Knet };
};

const selectRuptureDiskSize = (requiredArea: number): { size: number; area: number } | null => {
  for (const disk of RUPTURE_DISK_SIZES) {
    if (disk.area >= requiredArea) {
      return disk;
    }
  }
  return null;
};

// ============================================
// THERMAL RELIEF / BLOCKED OUTLET
// Per API 521 Section 5.6
// ============================================

// Liquid thermal expansion coefficients (β) per API 521
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
  ethanol: { beta: 0.00062, name: 'Ethanol', SG: 0.79 },
  benzene: { beta: 0.00068, name: 'Benzene', SG: 0.88 },
  toluene: { beta: 0.00058, name: 'Toluene', SG: 0.87 },
  custom: { beta: 0.00050, name: 'Custom', SG: 1.0 },
};

// Calculate thermal expansion flow rate (API 521 Eq. 5)
// Q = V × β × ΔT/Δt
const calculateThermalExpansionRate = (
  liquidVolume: number,    // gallons
  expansionCoeff: number,  // 1/°F
  heatingRate: number      // °F/hr
): { volumeRate: number; massRate: number } => {
  const volumeRateGPH = liquidVolume * expansionCoeff * heatingRate;
  const volumeRate = volumeRateGPH / 60; // gpm
  const massRate = volumeRateGPH * 8.34; // lb/hr (assuming water density)
  return { volumeRate, massRate };
};

// ============================================
// CONTROL VALVE FAILURE SCENARIOS
// Per API 521 Section 5.3
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

// Control valve flow calculation (IEC 60534 / ISA 75.01)
// Liquid: Q = Cv × √(ΔP / G)
// Gas: W = 63.3 × Cv × P1 × √(M/(T×Z)) for choked flow
const calculateCvFlow = (
  Cv: number,
  P1: number,        // Upstream pressure (psig)
  P2: number,        // Downstream pressure (psig)
  specificGravity: number,
  fluidType: 'liquid' | 'gas',
  molecularWeight?: number,
  temperature?: number,
  Z?: number,
  k?: number
): { flowRate: number; flowUnit: string; isCritical?: boolean } => {
  const deltaP = P1 - P2;
  
  if (fluidType === 'liquid') {
    const flowRate = Cv * Math.sqrt(Math.max(deltaP, 0) / specificGravity);
    return { flowRate, flowUnit: 'gpm' };
  } else if (molecularWeight && temperature && Z && k) {
    const P1_abs = P1 + 14.7;
    const P2_abs = Math.max(P2 + 14.7, 14.7);
    const T = temperature + 460;
    
    // Critical pressure ratio
    const Pcrit = P1_abs * Math.pow(2 / (k + 1), k / (k - 1));
    const isCritical = P2_abs < Pcrit;
    
    let flowRate: number;
    if (isCritical) {
      // Critical (choked) flow
      flowRate = 63.3 * Cv * P1_abs * Math.sqrt(molecularWeight / (T * Z));
    } else {
      // Subcritical flow
      const Y = 1 - (P1_abs - P2_abs) / (3 * P1_abs * Math.pow(2 / (k + 1), k / (k - 1)));
      flowRate = 1360 * Cv * Y * Math.sqrt((P1_abs - P2_abs) * molecularWeight / (T * Z));
    }
    return { flowRate, flowUnit: 'lb/hr', isCritical };
  }
  return { flowRate: 0, flowUnit: 'gpm' };
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

  // Saved scenarios for comparison
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [newScenarioName, setNewScenarioName] = useState('');

  // ===== VAPOR CALCULATIONS =====
  const vaporResults = useMemo(() => {
    const P1_abs = vaporInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + vaporInputs.overpressure / 100);
    const T_abs = vaporInputs.temperature + 459.67;
    
    // Get C from table or calculate
    const gasData = C_VALUES_TABLE[vaporInputs.selectedGas];
    const C = gasData ? gasData.C : calculateCCoefficient(vaporInputs.specificHeatRatio);
    
    // Calculate Kb based on valve type
    const percentBackpressure = (vaporInputs.backPressure / relievingPressure) * 100;
    let Kb: number;
    switch (vaporInputs.valveType) {
      case 'balanced':
        Kb = calculateKbBalanced(percentBackpressure);
        break;
      case 'pilot':
        Kb = calculateKbPilot(vaporInputs.specificHeatRatio, relievingPressure, vaporInputs.backPressure);
        break;
      default:
        Kb = calculateKbConventional(vaporInputs.specificHeatRatio, relievingPressure, vaporInputs.backPressure);
    }
    
    // Kc for rupture disk upstream
    const Kc = vaporInputs.ruptureDisk ? 0.9 : 1.0;
    
    // Critical ratio check
    const criticalRatio = calculateCriticalRatio(vaporInputs.specificHeatRatio);
    const actualRatio = vaporInputs.backPressure / relievingPressure;
    const flowRegime = actualRatio < criticalRatio ? 'Critical (Sonic)' : 'Subcritical';
    
    // Calculate required area
    const requiredArea = calculateVaporArea(
      vaporInputs.massFlow,
      C,
      vaporInputs.dischargeCoeff,
      relievingPressure,
      Kb,
      Kc,
      T_abs,
      vaporInputs.compressibility,
      vaporInputs.molecularWeight
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      relievingPressure,
      C,
      Kb,
      Kc,
      criticalRatio,
      flowRegime,
      requiredArea,
      selectedOrifice,
    };
  }, [vaporInputs]);

  // ===== LIQUID CALCULATIONS =====
  const liquidResults = useMemo(() => {
    const P1 = liquidInputs.setPresure * (1 + liquidInputs.overpressure / 100);
    const P2 = liquidInputs.backPressure;
    const deltaP = P1 - P2;
    
    // Kw for balanced bellows in liquid service
    const percentBackpressure = (P2 / P1) * 100;
    const Kw = liquidInputs.valveType === 'balanced' ? calculateKw(percentBackpressure) : 1.0;
    
    // Kc for rupture disk
    const Kc = liquidInputs.ruptureDisk ? 0.9 : 1.0;
    
    // Preliminary area for Re calculation
    const prelimArea = calculateLiquidArea(
      liquidInputs.flowRate,
      liquidInputs.specificGravity,
      liquidInputs.dischargeCoeff,
      Kw,
      Kc,
      1.0,
      P1,
      P2
    );
    
    // Reynolds number and Kv
    const Re = calculateReynoldsForLiquid(
      liquidInputs.flowRate,
      liquidInputs.specificGravity,
      liquidInputs.viscosity,
      Math.max(prelimArea, 0.1)
    );
    const Kv = calculateKv(Re);
    
    // Final area with Kv
    const requiredArea = calculateLiquidArea(
      liquidInputs.flowRate,
      liquidInputs.specificGravity,
      liquidInputs.dischargeCoeff,
      Kw,
      Kc,
      Kv,
      P1,
      P2
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      relievingPressure: P1,
      deltaP,
      Kw,
      Kv,
      Kc,
      Re,
      requiredArea,
      selectedOrifice,
    };
  }, [liquidInputs]);

  // ===== TWO-PHASE CALCULATIONS =====
  const twoPhaseResults = useMemo(() => {
    const P1_abs = twoPhaseInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + twoPhaseInputs.overpressure / 100);
    
    const Kc = twoPhaseInputs.ruptureDisk ? 0.9 : 1.0;
    
    const result = calculateOmegaMethod(
      twoPhaseInputs.totalMassFlow,
      relievingPressure,
      twoPhaseInputs.backPressure,
      twoPhaseInputs.vaporFraction,
      twoPhaseInputs.liquidDensity,
      twoPhaseInputs.vaporDensity,
      twoPhaseInputs.dischargeCoeff,
      Kc,
      twoPhaseInputs.specificHeatRatio
    );
    
    const selectedOrifice = selectOrifice(result.area);
    
    return {
      relievingPressure,
      Kc,
      ...result,
      selectedOrifice,
    };
  }, [twoPhaseInputs]);

  // ===== STEAM CALCULATIONS =====
  const steamResults = useMemo(() => {
    const P1_abs = steamInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + steamInputs.overpressure / 100);
    
    // Kb based on valve type
    const percentBackpressure = (steamInputs.backPressure / relievingPressure) * 100;
    let Kb: number;
    switch (steamInputs.valveType) {
      case 'balanced':
        Kb = calculateKbBalanced(percentBackpressure);
        break;
      case 'pilot':
        Kb = calculateKbPilot(1.33, relievingPressure, steamInputs.backPressure);
        break;
      default:
        Kb = calculateKbConventional(1.33, relievingPressure, steamInputs.backPressure);
    }
    
    const Kc = steamInputs.ruptureDisk ? 0.9 : 1.0;
    const Kn = calculateKn(relievingPressure);
    const Ksh = steamInputs.steamType === 'superheated' 
      ? calculateKsh(relievingPressure, steamInputs.superheatTemp)
      : 1.0;
    
    const requiredArea = calculateSteamArea(
      steamInputs.massFlow,
      relievingPressure,
      steamInputs.dischargeCoeff,
      Kb,
      Kc,
      Kn,
      Ksh
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      relievingPressure,
      Kb,
      Kc,
      Kn,
      Ksh,
      requiredArea,
      selectedOrifice,
    };
  }, [steamInputs]);

  // ===== FIRE CASE CALCULATIONS =====
  const fireCaseResults = useMemo(() => {
    const P1_abs = fireCaseInputs.setPresure + 14.7;
    const relievingPressure = P1_abs * (1 + fireCaseInputs.overpressure / 100);
    const T_abs = fireCaseInputs.relievingTemp + 459.67;
    
    const { wettedArea, totalSurfaceArea } = calculateWettedArea(
      fireCaseInputs.vesselType,
      fireCaseInputs.diameter,
      fireCaseInputs.length,
      fireCaseInputs.liquidLevel
    );
    
    const heatAbsorption = calculateFireHeatAbsorption(
      wettedArea,
      fireCaseInputs.environmentalFactor,
      fireCaseInputs.promptDrainage
    );
    
    const Kc = fireCaseInputs.ruptureDisk ? 0.9 : 1.0;
    
    const { massFlow, requiredArea, C } = calculateFireCaseRelief(
      heatAbsorption,
      fireCaseInputs.latentHeat,
      fireCaseInputs.vaporMW,
      fireCaseInputs.vaporK,
      relievingPressure,
      T_abs,
      fireCaseInputs.compressibility,
      fireCaseInputs.dischargeCoeff,
      1.0, // Kb = 1.0 for fire case (atmospheric discharge)
      Kc
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      wettedArea,
      totalSurfaceArea,
      heatAbsorption,
      massFlow,
      relievingPressure,
      C,
      Kc,
      requiredArea,
      selectedOrifice,
    };
  }, [fireCaseInputs]);

  // ===== RUPTURE DISK CALCULATIONS =====
  const ruptureDiskResults = useMemo(() => {
    const P1_abs = ruptureDiskInputs.burstPressure + 14.7;
    const relievingPressure = P1_abs * (1 + ruptureDiskInputs.overpressure / 100);
    const T_abs = ruptureDiskInputs.temperature + 459.67;
    
    const diskData = RUPTURE_DISK_TYPES[ruptureDiskInputs.diskType];
    const Kr = diskData.Kr;
    
    const { requiredArea, Knet } = calculateRuptureDiskArea(
      ruptureDiskInputs.serviceType,
      ruptureDiskInputs.flowRate,
      ruptureDiskInputs.dischargeCoeff,
      Kr,
      relievingPressure,
      ruptureDiskInputs.backPressure,
      ruptureDiskInputs.vaporMW,
      ruptureDiskInputs.vaporK,
      T_abs,
      ruptureDiskInputs.compressibility,
      ruptureDiskInputs.specificGravity
    );
    
    const selectedDisk = selectRuptureDiskSize(requiredArea);
    
    return {
      relievingPressure,
      Kr,
      Knet,
      requiredArea,
      selectedDisk,
      diskType: diskData.type,
    };
  }, [ruptureDiskInputs]);

  // ===== THERMAL RELIEF CALCULATIONS =====
  const thermalResults = useMemo(() => {
    const liquidProps = LIQUID_EXPANSION_COEFFICIENTS[thermalInputs.liquidType];
    const beta = thermalInputs.liquidType === 'custom' 
      ? thermalInputs.customBeta 
      : liquidProps.beta;
    
    // Calculate volume
    let volumeGal: number;
    let surfaceArea: number;
    
    if (thermalInputs.geometry === 'pipe') {
      const diamFt = thermalInputs.diameter / 12;
      volumeGal = Math.PI * Math.pow(diamFt / 2, 2) * thermalInputs.length * 7.481;
      surfaceArea = Math.PI * diamFt * thermalInputs.length;
    } else {
      volumeGal = Math.PI * Math.pow(thermalInputs.diameter / 2, 2) * thermalInputs.length * 7.481;
      surfaceArea = Math.PI * thermalInputs.diameter * thermalInputs.length + 
                   Math.PI * Math.pow(thermalInputs.diameter, 2) / 2;
    }
    
    // Heat input and heating rate
    const totalHeatInput = thermalInputs.heatFlux * surfaceArea;
    const liquidMass = volumeGal * 8.34 * thermalInputs.specificGravity;
    const heatingRate = totalHeatInput / (liquidMass * 0.5); // Assume Cp ≈ 0.5 BTU/lb°F
    
    // Thermal expansion flow
    const { volumeRate } = calculateThermalExpansionRate(volumeGal, beta, heatingRate);
    
    // Relief sizing
    const P1 = thermalInputs.setPresure * (1 + thermalInputs.overpressure / 100);
    const Kc = thermalInputs.ruptureDisk ? 0.9 : 1.0;
    
    // Preliminary area for Re
    const prelimArea = calculateLiquidArea(
      volumeRate, thermalInputs.specificGravity, thermalInputs.dischargeCoeff,
      1.0, Kc, 1.0, P1, thermalInputs.backPressure
    );
    
    const Re = calculateReynoldsForLiquid(volumeRate, thermalInputs.specificGravity, 
                                           thermalInputs.viscosity, Math.max(prelimArea, 0.01));
    const Kv = calculateKv(Re);
    
    const requiredArea = calculateLiquidArea(
      volumeRate, thermalInputs.specificGravity, thermalInputs.dischargeCoeff,
      1.0, Kc, Kv, P1, thermalInputs.backPressure
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      volumeGal,
      surfaceArea,
      beta,
      heatingRate,
      totalHeatInput,
      volumeRate,
      relievingPressure: P1,
      Kv,
      Kc,
      Re,
      requiredArea,
      selectedOrifice,
      liquidName: liquidProps.name,
    };
  }, [thermalInputs]);

  // ===== FAILURE SCENARIO CALCULATIONS =====
  const failureResults = useMemo(() => {
    const scenarioInfo = FAILURE_SCENARIOS.find(s => s.id === failureInputs.scenario);
    
    const cvFlow = calculateCvFlow(
      failureInputs.valveCv,
      failureInputs.upstreamPressure,
      failureInputs.downstreamPressure,
      failureInputs.specificGravity,
      failureInputs.fluidType,
      failureInputs.vaporMW,
      failureInputs.temperature,
      failureInputs.compressibility,
      failureInputs.vaporK
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
      requiredArea = calculateVaporArea(
        reliefFlowRate, C, 0.975, P1_abs, 1.0, Kc,
        T_abs, failureInputs.compressibility, failureInputs.vaporMW
      );
    } else {
      const prelimArea = calculateLiquidArea(
        reliefFlowRate, failureInputs.specificGravity, failureInputs.dischargeCoeff,
        1.0, Kc, 1.0, P1, failureInputs.backPressure
      );
      const Re = calculateReynoldsForLiquid(reliefFlowRate, failureInputs.specificGravity,
                                             failureInputs.viscosity, Math.max(prelimArea, 0.1));
      const Kv = calculateKv(Re);
      requiredArea = calculateLiquidArea(
        reliefFlowRate, failureInputs.specificGravity, failureInputs.dischargeCoeff,
        1.0, Kc, Kv, P1, failureInputs.backPressure
      );
    }
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      scenarioInfo,
      cvFlow,
      reliefFlowRate,
      reliefFlowUnit,
      relievingPressure: P1,
      Kc,
      requiredArea,
      selectedOrifice,
    };
  }, [failureInputs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API 520/521 Relief Valve Sizing
            <Badge variant="outline" className="ml-2">API 520 Part I (10th Ed)</Badge>
            <Badge variant="outline">API 521 (7th Ed)</Badge>
          </CardTitle>
          <CardDescription>
            Comprehensive pressure relief device sizing per API 520/521 standards
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="vapor" className="space-y-4">
        <TabsList className="grid grid-cols-9 w-full">
          <TabsTrigger value="vapor" className="text-xs">Vapor/Gas</TabsTrigger>
          <TabsTrigger value="liquid" className="text-xs">Liquid</TabsTrigger>
          <TabsTrigger value="twophase" className="text-xs">2-Phase</TabsTrigger>
          <TabsTrigger value="steam" className="text-xs">Steam</TabsTrigger>
          <TabsTrigger value="firecase" className="flex items-center gap-1 text-xs">
            <Flame className="h-3 w-3" />
            Fire
          </TabsTrigger>
          <TabsTrigger value="rupturedisk" className="flex items-center gap-1 text-xs">
            <Disc className="h-3 w-3" />
            RD
          </TabsTrigger>
          <TabsTrigger value="thermal" className="flex items-center gap-1 text-xs">
            <Thermometer className="h-3 w-3" />
            Thermal
          </TabsTrigger>
          <TabsTrigger value="failure" className="flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Failure
          </TabsTrigger>
          <TabsTrigger value="reference" className="flex items-center gap-1 text-xs">
            <Info className="h-3 w-3" />
            Reference
          </TabsTrigger>
        </TabsList>

        {/* VAPOR TAB */}
        <TabsContent value="vapor" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
                <CardDescription>Per API 520 Part I, Section 5.6</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mass Flow Rate (lb/hr)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.massFlow}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, massFlow: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.setPresure}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.overpressure}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psia)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.backPressure}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature (°F)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.temperature}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, temperature: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gas Selection</Label>
                    <Select
                      value={vaporInputs.selectedGas}
                      onValueChange={(v) => {
                        const gasData = C_VALUES_TABLE[v];
                        if (gasData) {
                          setVaporInputs({
                            ...vaporInputs,
                            selectedGas: v,
                            molecularWeight: gasData.MW,
                            specificHeatRatio: gasData.k,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(C_VALUES_TABLE).map((gas) => (
                          <SelectItem key={gas} value={gas}>{gas}</SelectItem>
                        ))}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Molecular Weight</Label>
                    <Input
                      type="number"
                      value={vaporInputs.molecularWeight}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, molecularWeight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>k (Cp/Cv)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={vaporInputs.specificHeatRatio}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, specificHeatRatio: parseFloat(e.target.value) || 1.4 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Compressibility (Z)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={vaporInputs.compressibility}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, compressibility: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Valve Type</Label>
                  <Select
                    value={vaporInputs.valveType}
                    onValueChange={(v) => setVaporInputs({ ...vaporInputs, valveType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="balanced">Balanced Bellows</SelectItem>
                      <SelectItem value="pilot">Pilot Operated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discharge Coefficient (Kd)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={vaporInputs.dischargeCoeff}
                    onChange={(e) => setVaporInputs({ ...vaporInputs, dischargeCoeff: parseFloat(e.target.value) || 0.975 })}
                  />
                  <p className="text-xs text-muted-foreground">API default: 0.975 for vapor</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vaporRuptureDisk"
                    checked={vaporInputs.ruptureDisk}
                    onChange={(e) => setVaporInputs({ ...vaporInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="vaporRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">API 520 Equation (5.6.2):</h4>
                  <p className="font-mono text-xs">A = W × √(TZ/M) / (C × Kd × P₁ × Kb × Kc)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Vapor Relief Sizing Results
                {vaporResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure</h4>
                  <p className="text-sm">Relieving: <span className="font-mono font-medium">{vaporResults.relievingPressure.toFixed(1)} psia</span></p>
                  <p className="text-sm">Critical Ratio: <span className="font-mono font-medium">{vaporResults.criticalRatio.toFixed(3)}</span></p>
                  <p className="text-sm">Flow Regime: <span className="font-mono font-medium">{vaporResults.flowRegime}</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Coefficients</h4>
                  <p className="text-sm">C: <span className="font-mono font-medium">{vaporResults.C.toFixed(0)}</span></p>
                  <p className="text-sm">Kb: <span className="font-mono font-medium">{vaporResults.Kb.toFixed(3)}</span></p>
                  <p className="text-sm">Kc: <span className="font-mono font-medium">{vaporResults.Kc.toFixed(2)}</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Required Area</h4>
                  <p className="text-2xl font-mono font-bold">{vaporResults.requiredArea.toFixed(4)} in²</p>
                </div>
                <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Selected Orifice</h4>
                  {vaporResults.selectedOrifice ? (
                    <>
                      <p className="text-2xl font-mono font-bold">{vaporResults.selectedOrifice.designation}</p>
                      <p className="text-sm">Area: {vaporResults.selectedOrifice.area} in²</p>
                      <p className="text-sm">Inlet: {vaporResults.selectedOrifice.inletSize}"</p>
                    </>
                  ) : (
                    <p className="text-destructive font-medium">Exceeds T orifice</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIQUID TAB */}
        <TabsContent value="liquid" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
                <CardDescription>Per API 520 Part I, Section 5.8</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Flow Rate (gpm)</Label>
                    <Input
                      type="number"
                      value={liquidInputs.flowRate}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, flowRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specific Gravity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={liquidInputs.specificGravity}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, specificGravity: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Viscosity (cP)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={liquidInputs.viscosity}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, viscosity: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={liquidInputs.setPresure}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={liquidInputs.overpressure}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={liquidInputs.backPressure}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Valve Type</Label>
                  <Select
                    value={liquidInputs.valveType}
                    onValueChange={(v) => setLiquidInputs({ ...liquidInputs, valveType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="balanced">Balanced Bellows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discharge Coefficient (Kd)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={liquidInputs.dischargeCoeff}
                    onChange={(e) => setLiquidInputs({ ...liquidInputs, dischargeCoeff: parseFloat(e.target.value) || 0.65 })}
                  />
                  <p className="text-xs text-muted-foreground">API default: 0.65 for liquid (certified), 0.62 (uncertified)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="liquidRuptureDisk"
                    checked={liquidInputs.ruptureDisk}
                    onChange={(e) => setLiquidInputs({ ...liquidInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="liquidRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">API 520 Equation (5.8):</h4>
                  <p className="font-mono text-xs">A = Q × √G / (38 × Kd × Kw × Kc × Kv × √ΔP)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Liquid Relief Sizing Results
                {liquidResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure</h4>
                  <p className="text-sm">Relieving: <span className="font-mono font-medium">{liquidResults.relievingPressure.toFixed(1)} psig</span></p>
                  <p className="text-sm">ΔP: <span className="font-mono font-medium">{liquidResults.deltaP.toFixed(1)} psi</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <p className="text-sm">Kw: <span className="font-mono font-medium">{liquidResults.Kw.toFixed(3)}</span></p>
                  <p className="text-sm">Kv: <span className="font-mono font-medium">{liquidResults.Kv.toFixed(3)}</span></p>
                  <p className="text-sm">Kc: <span className="font-mono font-medium">{liquidResults.Kc.toFixed(2)}</span></p>
                  <p className="text-sm">Re: <span className="font-mono font-medium">{liquidResults.Re.toFixed(0)}</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Required Area</h4>
                  <p className="text-2xl font-mono font-bold">{liquidResults.requiredArea.toFixed(4)} in²</p>
                </div>
                <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Selected Orifice</h4>
                  {liquidResults.selectedOrifice ? (
                    <>
                      <p className="text-2xl font-mono font-bold">{liquidResults.selectedOrifice.designation}</p>
                      <p className="text-sm">Area: {liquidResults.selectedOrifice.area} in²</p>
                    </>
                  ) : (
                    <p className="text-destructive font-medium">Exceeds T orifice</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TWO-PHASE TAB */}
        <TabsContent value="twophase" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Two-Phase Flow Conditions</CardTitle>
                <CardDescription>Per API 520 Part I, Appendix D (Omega Method)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Mass Flow (lb/hr)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.totalMassFlow}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, totalMassFlow: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vapor Mass Fraction</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={twoPhaseInputs.vaporFraction}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, vaporFraction: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.setPresure}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.overpressure}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psia)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.backPressure}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Liquid Density (lb/ft³)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.liquidDensity}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, liquidDensity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vapor Density (lb/ft³)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={twoPhaseInputs.vaporDensity}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, vaporDensity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>k (Cp/Cv)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={twoPhaseInputs.specificHeatRatio}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, specificHeatRatio: parseFloat(e.target.value) || 1.3 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Discharge Coefficient (Kd)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={twoPhaseInputs.dischargeCoeff}
                    onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, dischargeCoeff: parseFloat(e.target.value) || 0.85 })}
                  />
                  <p className="text-xs text-muted-foreground">Typical: 0.85 for two-phase</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tpRuptureDisk"
                    checked={twoPhaseInputs.ruptureDisk}
                    onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="tpRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Omega Method (API 520 Appendix D):</h4>
                  <p className="font-mono text-xs">ω = (x×vᵥ + (1-x)×vₗ×k) / vₜₚ</p>
                  <p className="font-mono text-xs">η꜀ = 0.55 + 0.217×ln(ω) - 0.046×(ln(ω))²</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Two-Phase Relief Sizing Results
                {twoPhaseResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Flow Parameters</h4>
                  <p className="text-sm">ω (Omega): <span className="font-mono font-medium">{twoPhaseResults.omega.toFixed(3)}</span></p>
                  <p className="text-sm">Flow Regime: <span className="font-mono font-medium">{twoPhaseResults.flowRegime}</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Mass Flux</h4>
                  <p className="text-sm">G: <span className="font-mono font-medium">{twoPhaseResults.massFlux.toFixed(0)} lb/hr/in²</span></p>
                  <p className="text-sm">Kc: <span className="font-mono font-medium">{twoPhaseResults.Kc.toFixed(2)}</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Required Area</h4>
                  <p className="text-2xl font-mono font-bold">{twoPhaseResults.area.toFixed(4)} in²</p>
                </div>
                <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Selected Orifice</h4>
                  {twoPhaseResults.selectedOrifice ? (
                    <>
                      <p className="text-2xl font-mono font-bold">{twoPhaseResults.selectedOrifice.designation}</p>
                      <p className="text-sm">Area: {twoPhaseResults.selectedOrifice.area} in²</p>
                    </>
                  ) : (
                    <p className="text-destructive font-medium">Exceeds T orifice</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEAM TAB */}
        <TabsContent value="steam" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Steam Conditions</CardTitle>
                <CardDescription>Per API 520 Part I, Section 5.7</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mass Flow Rate (lb/hr)</Label>
                    <Input
                      type="number"
                      value={steamInputs.massFlow}
                      onChange={(e) => setSteamInputs({ ...steamInputs, massFlow: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={steamInputs.setPresure}
                      onChange={(e) => setSteamInputs({ ...steamInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={steamInputs.overpressure}
                      onChange={(e) => setSteamInputs({ ...steamInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psia)</Label>
                    <Input
                      type="number"
                      value={steamInputs.backPressure}
                      onChange={(e) => setSteamInputs({ ...steamInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Steam Type</Label>
                    <Select
                      value={steamInputs.steamType}
                      onValueChange={(v) => setSteamInputs({ ...steamInputs, steamType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saturated">Saturated Steam</SelectItem>
                        <SelectItem value="superheated">Superheated Steam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {steamInputs.steamType === 'superheated' && (
                    <div className="space-y-2">
                      <Label>Superheat Temperature (°F)</Label>
                      <Input
                        type="number"
                        value={steamInputs.superheatTemp}
                        onChange={(e) => setSteamInputs({ ...steamInputs, superheatTemp: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Valve Type</Label>
                  <Select
                    value={steamInputs.valveType}
                    onValueChange={(v) => setSteamInputs({ ...steamInputs, valveType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="balanced">Balanced Bellows</SelectItem>
                      <SelectItem value="pilot">Pilot Operated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discharge Coefficient (Kd)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={steamInputs.dischargeCoeff}
                    onChange={(e) => setSteamInputs({ ...steamInputs, dischargeCoeff: parseFloat(e.target.value) || 0.975 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="steamRuptureDisk"
                    checked={steamInputs.ruptureDisk}
                    onChange={(e) => setSteamInputs({ ...steamInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="steamRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
                
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">API 520 Steam Equation (5.7):</h4>
                  <p className="font-mono text-xs">A = W / (51.5 × Kd × P₁ × Kb × Kc × Kn × Ksh)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Steam Relief Sizing Results
                {steamResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure</h4>
                  <p className="text-sm">Relieving: <span className="font-mono font-medium">{steamResults.relievingPressure.toFixed(1)} psia</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <p className="text-sm">Kb: <span className="font-mono font-medium">{steamResults.Kb.toFixed(3)}</span></p>
                  <p className="text-sm">Kc: <span className="font-mono font-medium">{steamResults.Kc.toFixed(2)}</span></p>
                  <p className="text-sm">Kn: <span className="font-mono font-medium">{steamResults.Kn.toFixed(3)}</span></p>
                  <p className="text-sm">Ksh: <span className="font-mono font-medium">{steamResults.Ksh.toFixed(3)}</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Required Area</h4>
                  <p className="text-2xl font-mono font-bold">{steamResults.requiredArea.toFixed(4)} in²</p>
                </div>
                <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Selected Orifice</h4>
                  {steamResults.selectedOrifice ? (
                    <>
                      <p className="text-2xl font-mono font-bold">{steamResults.selectedOrifice.designation}</p>
                      <p className="text-sm">Area: {steamResults.selectedOrifice.area} in²</p>
                    </>
                  ) : (
                    <p className="text-destructive font-medium">Exceeds T orifice</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FIRE CASE TAB */}
        <TabsContent value="firecase" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Vessel Geometry
                </CardTitle>
                <CardDescription>Per API 521 Section 5.15</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vessel Type</Label>
                    <Select
                      value={fireCaseInputs.vesselType}
                      onValueChange={(v) => setFireCaseInputs({ ...fireCaseInputs, vesselType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal">Horizontal Cylinder</SelectItem>
                        <SelectItem value="vertical">Vertical Cylinder</SelectItem>
                        <SelectItem value="sphere">Sphere</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Diameter (ft)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={fireCaseInputs.diameter}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, diameter: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{fireCaseInputs.vesselType === 'sphere' ? 'N/A' : 'Length/Height (ft)'}</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={fireCaseInputs.length}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, length: parseFloat(e.target.value) || 0 })}
                      disabled={fireCaseInputs.vesselType === 'sphere'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Liquid Level (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={fireCaseInputs.liquidLevel}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, liquidLevel: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Environmental Factor (F)</Label>
                    <Select
                      value={fireCaseInputs.environmentalFactor.toString()}
                      onValueChange={(v) => setFireCaseInputs({ ...fireCaseInputs, environmentalFactor: parseFloat(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENVIRONMENTAL_FACTORS.map((ef) => (
                          <SelectItem key={ef.description} value={ef.F.toString()}>
                            {ef.description} (F = {ef.F})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="promptDrainage"
                      checked={fireCaseInputs.promptDrainage}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, promptDrainage: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="promptDrainage">Adequate Drainage (C=21000)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fluid Properties & Relief Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latent Heat (BTU/lb)</Label>
                    <Input
                      type="number"
                      value={fireCaseInputs.latentHeat}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, latentHeat: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vapor MW</Label>
                    <Input
                      type="number"
                      value={fireCaseInputs.vaporMW}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, vaporMW: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vapor k (Cp/Cv)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fireCaseInputs.vaporK}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, vaporK: parseFloat(e.target.value) || 1.1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Compressibility (Z)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fireCaseInputs.compressibility}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, compressibility: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={fireCaseInputs.setPresure}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%) - Fire allows 21%</Label>
                    <Input
                      type="number"
                      value={fireCaseInputs.overpressure}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, overpressure: parseFloat(e.target.value) || 21 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relieving Temperature (°F)</Label>
                    <Input
                      type="number"
                      value={fireCaseInputs.relievingTemp}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, relievingTemp: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discharge Coefficient (Kd)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={fireCaseInputs.dischargeCoeff}
                      onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, dischargeCoeff: parseFloat(e.target.value) || 0.975 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Fire Case Relief Sizing Results
                {fireCaseResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 521 Table 4 - Q = C × F × A^0.82</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Wetted Area</h4>
                  <p className="text-sm">Wetted: <span className="font-mono font-medium">{fireCaseResults.wettedArea.toFixed(1)} ft²</span></p>
                  <p className="text-sm">Total Surface: <span className="font-mono font-medium">{fireCaseResults.totalSurfaceArea.toFixed(1)} ft²</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Heat & Vapor</h4>
                  <p className="text-sm">Q: <span className="font-mono font-medium">{(fireCaseResults.heatAbsorption / 1e6).toFixed(2)} MM BTU/hr</span></p>
                  <p className="text-sm">W: <span className="font-mono font-medium">{fireCaseResults.massFlow.toFixed(0)} lb/hr</span></p>
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Required Area</h4>
                  <p className="text-2xl font-mono font-bold">{fireCaseResults.requiredArea.toFixed(4)} in²</p>
                </div>
                <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Selected Orifice</h4>
                  {fireCaseResults.selectedOrifice ? (
                    <>
                      <p className="text-2xl font-mono font-bold">{fireCaseResults.selectedOrifice.designation}</p>
                      <p className="text-sm">Area: {fireCaseResults.selectedOrifice.area} in²</p>
                    </>
                  ) : (
                    <p className="text-destructive font-medium">Exceeds T orifice</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RUPTURE DISK TAB */}
        <TabsContent value="rupturedisk" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Disc className="h-4 w-4 text-blue-500" />
                  Rupture Disk Configuration
                </CardTitle>
                <CardDescription>Per API 520 Part II, Section 5</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <Select
                      value={ruptureDiskInputs.serviceType}
                      onValueChange={(v) => setRuptureDiskInputs({ ...ruptureDiskInputs, serviceType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vapor">Vapor/Gas</SelectItem>
                        <SelectItem value="liquid">Liquid</SelectItem>
                        <SelectItem value="steam">Steam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Disk Type</Label>
                    <Select
                      value={ruptureDiskInputs.diskType.toString()}
                      onValueChange={(v) => setRuptureDiskInputs({ ...ruptureDiskInputs, diskType: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RUPTURE_DISK_TYPES.map((disk, idx) => (
                          <SelectItem key={disk.type} value={idx.toString()}>
                            {disk.type} (Kr = {disk.Kr})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Flow Rate ({ruptureDiskInputs.serviceType === 'liquid' ? 'gpm' : 'lb/hr'})</Label>
                    <Input
                      type="number"
                      value={ruptureDiskInputs.flowRate}
                      onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, flowRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Burst Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={ruptureDiskInputs.burstPressure}
                      onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, burstPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Net Discharge Coefficient:</h4>
                  <p className="font-mono text-xs">K_net = Kd / √(1 + Kr)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Coefficients</h4>
                    <p className="text-sm">Kr: <span className="font-mono font-medium">{ruptureDiskResults.Kr.toFixed(2)}</span></p>
                    <p className="text-sm">K_net: <span className="font-mono font-medium">{ruptureDiskResults.Knet.toFixed(3)}</span></p>
                  </div>
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Required Area</h4>
                    <p className="text-2xl font-mono font-bold">{ruptureDiskResults.requiredArea.toFixed(4)} in²</p>
                  </div>
                </div>
                <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Selected Disk Size</h4>
                  {ruptureDiskResults.selectedDisk ? (
                    <>
                      <p className="text-2xl font-mono font-bold">{ruptureDiskResults.selectedDisk.size}" NPS</p>
                      <p className="text-sm">Area: {ruptureDiskResults.selectedDisk.area.toFixed(2)} in²</p>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  System Geometry
                </CardTitle>
                <CardDescription>Per API 521 Section 5.6 - Blocked Outlet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Geometry Type</Label>
                    <Select
                      value={thermalInputs.geometry}
                      onValueChange={(v) => setThermalInputs({ ...thermalInputs, geometry: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pipe">Pipeline</SelectItem>
                        <SelectItem value="vessel">Vessel/Tank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Diameter ({thermalInputs.geometry === 'pipe' ? 'in' : 'ft'})</Label>
                    <Input
                      type="number"
                      value={thermalInputs.diameter}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, diameter: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Length (ft)</Label>
                    <Input
                      type="number"
                      value={thermalInputs.length}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, length: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Liquid Type</Label>
                    <Select
                      value={thermalInputs.liquidType}
                      onValueChange={(v) => {
                        const liq = LIQUID_EXPANSION_COEFFICIENTS[v as keyof typeof LIQUID_EXPANSION_COEFFICIENTS];
                        setThermalInputs({ 
                          ...thermalInputs, 
                          liquidType: v as any,
                          specificGravity: liq.SG
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LIQUID_EXPANSION_COEFFICIENTS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.name} (β = {val.beta.toExponential(2)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Heat Flux (BTU/hr/ft²)</Label>
                    <Input
                      type="number"
                      value={thermalInputs.heatFlux}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, heatFlux: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Viscosity (cP)</Label>
                    <Input
                      type="number"
                      value={thermalInputs.viscosity}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, viscosity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Volume & Area</h4>
                    <p className="text-sm">Volume: <span className="font-mono font-medium">{thermalResults.volumeGal.toFixed(0)} gal</span></p>
                    <p className="text-sm">Surface: <span className="font-mono font-medium">{thermalResults.surfaceArea.toFixed(1)} ft²</span></p>
                  </div>
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Thermal Flow</h4>
                    <p className="text-sm">β: <span className="font-mono font-medium">{thermalResults.beta.toExponential(2)} /°F</span></p>
                    <p className="text-sm">Q: <span className="font-mono font-medium">{thermalResults.volumeRate.toFixed(4)} gpm</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Required Area</h4>
                    <p className="text-2xl font-mono font-bold">{thermalResults.requiredArea.toFixed(4)} in²</p>
                  </div>
                  <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Selected Orifice</h4>
                    {thermalResults.selectedOrifice ? (
                      <>
                        <p className="text-2xl font-mono font-bold">{thermalResults.selectedOrifice.designation}</p>
                        <p className="text-sm">Area: {thermalResults.selectedOrifice.area} in²</p>
                      </>
                    ) : (
                      <p className="text-destructive font-medium">Exceeds T</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FAILURE TAB */}
        <TabsContent value="failure" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Failure Scenario
                </CardTitle>
                <CardDescription>Per API 521 Section 5.3</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Scenario Type</Label>
                  <Select
                    value={failureInputs.scenario}
                    onValueChange={(v) => setFailureInputs({ ...failureInputs, scenario: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <Label>Fluid Type</Label>
                    <Select
                      value={failureInputs.fluidType}
                      onValueChange={(v) => setFailureInputs({ ...failureInputs, fluidType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="liquid">Liquid</SelectItem>
                        <SelectItem value="gas">Vapor/Gas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valve Cv</Label>
                    <Input
                      type="number"
                      value={failureInputs.valveCv}
                      onChange={(e) => setFailureInputs({ ...failureInputs, valveCv: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Upstream Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={failureInputs.upstreamPressure}
                      onChange={(e) => setFailureInputs({ ...failureInputs, upstreamPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Downstream Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={failureInputs.downstreamPressure}
                      onChange={(e) => setFailureInputs({ ...failureInputs, downstreamPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">CV Flow</h4>
                    <p className="text-sm">Flow: <span className="font-mono font-medium">{failureResults.reliefFlowRate.toFixed(0)} {failureResults.reliefFlowUnit}</span></p>
                    {failureResults.cvFlow.isCritical !== undefined && (
                      <p className="text-sm">Regime: <span className="font-mono font-medium">{failureResults.cvFlow.isCritical ? 'Critical' : 'Subcritical'}</span></p>
                    )}
                  </div>
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm text-muted-foreground">Required Area</h4>
                    <p className="text-2xl font-mono font-bold">{failureResults.requiredArea.toFixed(4)} in²</p>
                  </div>
                </div>
                <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">Selected Orifice</h4>
                  {failureResults.selectedOrifice ? (
                    <>
                      <p className="text-2xl font-mono font-bold">{failureResults.selectedOrifice.designation}</p>
                      <p className="text-sm">Area: {failureResults.selectedOrifice.area} in²</p>
                    </>
                  ) : (
                    <p className="text-destructive font-medium">Exceeds T orifice</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* REFERENCE TAB */}
        <TabsContent value="reference" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Standard Orifice Sizes (API RP 526)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Designation</TableHead>
                      <TableHead>Effective Area (in²)</TableHead>
                      <TableHead>Inlet Size</TableHead>
                      <TableHead>Outlet Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ORIFICE_SIZES.map((orifice) => (
                      <TableRow key={orifice.designation}>
                        <TableCell className="font-mono font-bold">{orifice.designation}</TableCell>
                        <TableCell className="font-mono">{orifice.area}</TableCell>
                        <TableCell>{orifice.inletSize}"</TableCell>
                        <TableCell>{orifice.outletSize}"</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gas Properties (API 520 Table 9)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gas</TableHead>
                      <TableHead>k (Cp/Cv)</TableHead>
                      <TableHead>C</TableHead>
                      <TableHead>MW</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(C_VALUES_TABLE).slice(0, 10).map(([gas, data]) => (
                      <TableRow key={gas}>
                        <TableCell>{gas}</TableCell>
                        <TableCell className="font-mono">{data.k}</TableCell>
                        <TableCell className="font-mono">{data.C}</TableCell>
                        <TableCell className="font-mono">{data.MW.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Environmental Factors (API 521 Table 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Condition</TableHead>
                    <TableHead>Factor (F)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ENVIRONMENTAL_FACTORS.map((ef) => (
                    <TableRow key={ef.description}>
                      <TableCell>{ef.description}</TableCell>
                      <TableCell className="font-mono font-bold">{ef.F}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ef.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
