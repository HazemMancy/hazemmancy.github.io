import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Flame, Disc, Droplets, Thermometer, AlertTriangle, BarChart3, Plus, Trash2, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

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

// API 520 Vapor Relief Sizing - Eq. 3.1
const calculateVaporArea = (
  W: number, // Mass flow rate (lb/hr)
  C: number, // Coefficient from gas properties
  Kd: number, // Discharge coefficient
  P1: number, // Relieving pressure (psia)
  Kb: number, // Back pressure correction factor
  Kc: number, // Combination correction factor
  T: number, // Relieving temperature (°R)
  Z: number, // Compressibility factor
  M: number // Molecular weight
): number => {
  // A = W * sqrt(T*Z/M) / (C * Kd * P1 * Kb * Kc)
  return (W * Math.sqrt((T * Z) / M)) / (C * Kd * P1 * Kb * Kc);
};

// API 520 Liquid Relief Sizing - Eq. 3.5
const calculateLiquidArea = (
  Q: number, // Flow rate (gpm)
  G: number, // Specific gravity
  Kd: number, // Discharge coefficient
  Kw: number, // Back pressure correction factor
  Kc: number, // Combination correction factor
  Kv: number, // Viscosity correction factor
  P1: number, // Set pressure + overpressure (psig)
  P2: number // Total back pressure (psig)
): number => {
  // A = Q * sqrt(G) / (38 * Kd * Kw * Kc * Kv * sqrt(P1 - P2))
  const deltaP = P1 - P2;
  if (deltaP <= 0) return 0;
  return (Q * Math.sqrt(G)) / (38 * Kd * Kw * Kc * Kv * Math.sqrt(deltaP));
};

// Calculate C coefficient from k (specific heat ratio)
const calculateCCoefficient = (k: number): number => {
  // C = 520 * sqrt(k * (2/(k+1))^((k+1)/(k-1)))
  const term = Math.pow(2 / (k + 1), (k + 1) / (k - 1));
  return 520 * Math.sqrt(k * term);
};

// Calculate critical pressure ratio
const calculateCriticalRatio = (k: number): number => {
  return Math.pow(2 / (k + 1), k / (k - 1));
};

// Two-Phase Omega Method (API 520 Appendix D)
const calculateOmegaMethod = (
  W: number, // Total mass flow (lb/hr)
  P1: number, // Relieving pressure (psia)
  P2: number, // Back pressure (psia)
  x: number, // Inlet vapor mass fraction
  rhoL: number, // Liquid density (lb/ft³)
  rhoV: number, // Vapor density at inlet (lb/ft³)
  Kd: number, // Discharge coefficient
  k: number // Specific heat ratio
): { area: number; omega: number; G: number } => {
  // Calculate omega parameter
  const vL = 1 / rhoL;
  const vV = 1 / rhoV;
  const omega = x * vV / (x * vV + (1 - x) * vL) + 
                (1 - x) * vL * k / (x * vV + (1 - x) * vL);
  
  // Calculate pressure ratio
  const eta = P2 / P1;
  
  // Calculate critical pressure ratio for two-phase
  let etaC = 0.55 + 0.217 * Math.log(omega) - 0.046 * Math.pow(Math.log(omega), 2);
  etaC = Math.max(0.1, Math.min(0.95, etaC));
  
  // Calculate mass flux
  let G: number;
  if (eta < etaC) {
    // Critical flow
    G = 68.09 * Math.sqrt(P1 * rhoL * (1 - etaC) / omega);
  } else {
    // Subcritical flow
    G = 68.09 * Math.sqrt(P1 * rhoL * 2 * (1 - eta) * (eta - etaC + 1) / omega);
  }
  
  // Calculate required area
  const area = W / (G * 3600);
  
  return { area, omega, G };
};

// Steam Relief Sizing (API 520)
const calculateSteamArea = (
  W: number, // Steam flow rate (lb/hr)
  P1: number, // Relieving pressure (psia)
  Kd: number, // Discharge coefficient
  Kb: number, // Back pressure correction factor
  Kc: number, // Combination correction factor
  Kn: number, // Napier correction factor
  Ksh: number // Superheat correction factor
): number => {
  // For saturated steam: A = W / (51.5 * P1 * Kd * Kb * Kc * Kn * Ksh)
  return W / (51.5 * P1 * Kd * Kb * Kc * Kn * Ksh);
};

// Standard orifice designations
const ORIFICE_SIZES = [
  { designation: 'D', area: 0.110 },
  { designation: 'E', area: 0.196 },
  { designation: 'F', area: 0.307 },
  { designation: 'G', area: 0.503 },
  { designation: 'H', area: 0.785 },
  { designation: 'J', area: 1.287 },
  { designation: 'K', area: 1.838 },
  { designation: 'L', area: 2.853 },
  { designation: 'M', area: 3.600 },
  { designation: 'N', area: 4.340 },
  { designation: 'P', area: 6.380 },
  { designation: 'Q', area: 11.05 },
  { designation: 'R', area: 16.00 },
  { designation: 'T', area: 26.00 },
];

const selectOrifice = (requiredArea: number): { designation: string; area: number } | null => {
  for (const orifice of ORIFICE_SIZES) {
    if (orifice.area >= requiredArea) {
      return orifice;
    }
  }
  return null;
};

// Viscosity correction factor (API 520)
const calculateKv = (Re: number): number => {
  if (Re >= 100000) return 1.0;
  // Kv = (0.9935 + 2.878/sqrt(Re) + 342.75/Re^1.5)^-0.5
  return Math.pow(0.9935 + 2.878 / Math.sqrt(Re) + 342.75 / Math.pow(Re, 1.5), -0.5);
};

// Napier correction for high pressure steam
const calculateKn = (P1: number): number => {
  if (P1 <= 1500) return 1.0;
  if (P1 <= 3200) {
    return (0.1906 * P1 - 1000) / (0.2292 * P1 - 1061);
  }
  return 1.0;
};

// API 521 Fire Case - Heat absorption calculation
// Q = C × F × A^0.82 (BTU/hr)
// For wetted area (API 521 Table 4)
const calculateFireHeatAbsorption = (
  wettedArea: number, // ft²
  C: number, // Environmental factor constant (21000 for bare vessel, 34500 with insulation credit)
  F: number, // Environmental factor
  promptDrainage: boolean
): number => {
  // Per API 521 Table 4
  // Q = 21000 × F × A^0.82 for adequate drainage
  // Q = 34500 × F × A^0.82 for inadequate drainage
  const constant = promptDrainage ? 21000 : 34500;
  return constant * F * Math.pow(wettedArea, 0.82);
};

// Calculate wetted area for different vessel geometries
const calculateWettedArea = (
  vesselType: 'horizontal' | 'vertical' | 'sphere',
  diameter: number, // ft
  length: number, // ft (or height for vertical)
  liquidLevel: number // % of diameter
): { wettedArea: number; totalSurfaceArea: number } => {
  const R = diameter / 2;
  let wettedArea = 0;
  let totalSurfaceArea = 0;

  if (vesselType === 'horizontal') {
    // Horizontal cylinder with 2:1 elliptical heads
    const liquidHeight = (liquidLevel / 100) * diameter;
    const theta = 2 * Math.acos(1 - liquidHeight / R);
    const wettedPerimeter = R * theta;
    const shellArea = wettedPerimeter * length;
    
    // Head area (simplified for 2:1 elliptical)
    const headHeight = Math.min(liquidHeight, R);
    const headWettedFraction = liquidLevel / 100;
    const headArea = 2 * Math.PI * R * R * 1.09 * headWettedFraction; // 1.09 factor for 2:1 elliptical
    
    wettedArea = shellArea + headArea;
    totalSurfaceArea = Math.PI * diameter * length + 2 * Math.PI * R * R * 1.09;
  } else if (vesselType === 'vertical') {
    // Vertical cylinder
    const liquidHeight = (liquidLevel / 100) * length;
    // Limited to 25 ft above grade per API 521
    const effectiveHeight = Math.min(liquidHeight, 25);
    
    const shellArea = Math.PI * diameter * effectiveHeight;
    const bottomHeadArea = Math.PI * R * R * 1.09; // 2:1 elliptical bottom head
    
    wettedArea = shellArea + bottomHeadArea;
    totalSurfaceArea = Math.PI * diameter * length + 2 * Math.PI * R * R * 1.09;
  } else {
    // Sphere
    const liquidHeight = (liquidLevel / 100) * diameter;
    // Spherical cap area
    wettedArea = Math.PI * diameter * liquidHeight;
    totalSurfaceArea = Math.PI * diameter * diameter;
  }

  return { wettedArea, totalSurfaceArea };
};

// Environmental factors per API 521 Table 5
const ENVIRONMENTAL_FACTORS = [
  { description: 'Bare vessel', F: 1.0 },
  { description: 'Insulated (1" mineral fiber)', F: 0.3 },
  { description: 'Insulated (2" mineral fiber)', F: 0.15 },
  { description: 'Insulated (4" mineral fiber)', F: 0.075 },
  { description: 'Earth covered storage', F: 0.03 },
  { description: 'Underground storage', F: 0.0 },
  { description: 'Water spray applied', F: 1.0 }, // Credit not typically allowed
  { description: 'Depressuring system', F: 1.0 }, // Requires separate analysis
];

// Calculate fire case relief requirements
const calculateFireCaseRelief = (
  heatAbsorption: number, // BTU/hr
  latentHeat: number, // BTU/lb
  vaporMW: number,
  vaporK: number,
  relievingPressure: number, // psia
  relievingTemp: number, // °R
  compressibility: number,
  Kd: number,
  Kb: number,
  Kc: number
): { massFlow: number; requiredArea: number } => {
  // Mass flow rate = Q / λ
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
  
  return { massFlow, requiredArea };
};

// API 520 Appendix M - Rupture Disk Sizing
// Rupture disk minimum net flow area
const calculateRuptureDiskArea = (
  deviceType: 'vapor' | 'liquid' | 'steam',
  flowRate: number, // lb/hr for vapor/steam, gpm for liquid
  Kd: number, // Coefficient of discharge (typically 0.62 for RD alone)
  Kr: number, // Resistance factor for RD
  pressure: number, // Relieving pressure psia/psig
  backPressure: number,
  // Vapor-specific
  vaporMW?: number,
  vaporK?: number,
  temperature?: number, // °R
  compressibility?: number,
  // Liquid-specific
  specificGravity?: number
): { requiredArea: number; Knet: number } => {
  // Net coefficient of discharge accounting for RD resistance
  // Knet = Kd / sqrt(1 + Kr)
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
    // Steam service
    requiredArea = flowRate / (51.5 * pressure * Knet);
  }
  
  return { requiredArea, Knet };
};

// Standard rupture disk sizes
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

const selectRuptureDiskSize = (requiredArea: number): { size: number; area: number } | null => {
  for (const disk of RUPTURE_DISK_SIZES) {
    if (disk.area >= requiredArea) {
      return disk;
    }
  }
  return null;
};

// ============================================
// Liquid Overfill Protection Calculations
// Per API 2000 and API 521 Guidelines
// ============================================

// Calculate tank vapor space volume
const calculateVaporSpace = (
  tankType: 'vertical' | 'horizontal' | 'cone_roof' | 'dome_roof',
  diameter: number, // ft
  height: number, // ft (or length for horizontal)
  liquidLevel: number, // %
  roofHeight?: number // ft for cone/dome roofs
): { vaporVolume: number; liquidVolume: number; totalVolume: number } => {
  const R = diameter / 2;
  let totalVolume = 0;
  let liquidVolume = 0;
  
  if (tankType === 'horizontal') {
    // Horizontal cylindrical tank
    totalVolume = Math.PI * R * R * height;
    const liquidHeight = (liquidLevel / 100) * diameter;
    const theta = 2 * Math.acos(1 - liquidHeight / R);
    const segmentArea = (R * R / 2) * (theta - Math.sin(theta));
    liquidVolume = segmentArea * height;
  } else {
    // Vertical tanks
    const shellVolume = Math.PI * R * R * height;
    const roofVol = roofHeight ? (Math.PI * R * R * roofHeight) / 3 : 0; // Simplified cone
    totalVolume = shellVolume + roofVol;
    liquidVolume = (liquidLevel / 100) * shellVolume;
  }
  
  const vaporVolume = totalVolume - liquidVolume;
  return { vaporVolume, liquidVolume, totalVolume };
};

// Calculate required venting rate for liquid overfill
// Based on liquid inflow rate and vapor space compression
const calculateOverfillVentingRate = (
  liquidInflowRate: number, // gpm or bbl/hr
  flowUnit: 'gpm' | 'bbl_hr',
  tankDiameter: number, // ft
  vaporMW: number,
  temperature: number, // °F
  atmosphericPressure: number, // psia (typically 14.7)
  maxAllowablePressure: number // psig
): { 
  volumetricVentRate: number; // SCFH
  massVentRate: number; // lb/hr
  liquidRiseRate: number; // ft/hr
} => {
  // Convert to consistent units
  let liquidRateFt3Hr: number;
  if (flowUnit === 'gpm') {
    liquidRateFt3Hr = liquidInflowRate * 60 * 0.1337; // gpm to ft³/hr
  } else {
    liquidRateFt3Hr = liquidInflowRate * 5.615; // bbl/hr to ft³/hr
  }
  
  // Calculate liquid rise rate
  const tankArea = Math.PI * Math.pow(tankDiameter / 2, 2);
  const liquidRiseRate = liquidRateFt3Hr / tankArea;
  
  // Required volumetric vent rate equals liquid inflow rate (volume displacement)
  // Convert to standard conditions
  const T_abs = temperature + 459.67;
  const maxPressAbs = maxAllowablePressure + atmosphericPressure;
  
  // Correct to standard conditions (60°F, 14.7 psia)
  const volumetricVentRate = liquidRateFt3Hr * (maxPressAbs / 14.7) * (519.67 / T_abs);
  
  // Calculate mass flow rate
  // PV = nRT, n = PV/RT, mass = n * MW
  const R = 10.73; // psia·ft³/(lbmol·°R)
  const molarRate = (atmosphericPressure * volumetricVentRate) / (R * 519.67);
  const massVentRate = molarRate * vaporMW;
  
  return { volumetricVentRate, massVentRate, liquidRiseRate };
};

// Calculate relief device sizing for liquid overfill
const calculateOverfillReliefArea = (
  massFlow: number, // lb/hr
  vaporMW: number,
  vaporK: number,
  setPresure: number, // psig
  overpressure: number, // %
  backPressure: number, // psia
  temperature: number, // °F
  compressibility: number,
  Kd: number,
  Kc: number
): { requiredArea: number; relievingPressure: number; C: number } => {
  const P1_abs = setPresure + 14.7;
  const P1_relieving = P1_abs * (1 + overpressure / 100);
  const T_abs = temperature + 459.67;
  const C = calculateCCoefficient(vaporK);
  
  // Calculate back pressure correction (assume conventional valve)
  const criticalRatio = calculateCriticalRatio(vaporK);
  const backPressureRatio = backPressure / P1_relieving;
  const Kb = backPressureRatio > criticalRatio ? 0.9 : 1.0;
  
  const requiredArea = calculateVaporArea(
    massFlow,
    C,
    Kd,
    P1_relieving,
    Kb,
    Kc,
    T_abs,
    compressibility,
    vaporMW
  );
  
  return { requiredArea, relievingPressure: P1_relieving, C };
};

// API 2000 normal venting requirements
const calculateAPI2000NormalVenting = (
  maxPumpInRate: number, // bbl/hr
  maxPumpOutRate: number, // bbl/hr
  tankVolume: number, // bbl
  latitude: 'tropical' | 'temperate' | 'arctic'
): { 
  thermalInbreathing: number; // SCFH
  thermalOutbreathing: number; // SCFH
  pumpInVenting: number; // SCFH
  pumpOutVenting: number; // SCFH
  totalInbreathing: number; // SCFH
  totalOutbreathing: number; // SCFH
} => {
  // Thermal breathing per API 2000 Table 2
  // Inbreathing: 1.0 CFH per bbl for first 1000 bbl, 0.6 CFH per bbl thereafter
  let thermalInbreathing: number;
  if (tankVolume <= 1000) {
    thermalInbreathing = tankVolume * 1.0;
  } else {
    thermalInbreathing = 1000 * 1.0 + (tankVolume - 1000) * 0.6;
  }
  
  // Adjust for latitude
  const latitudeFactor = latitude === 'tropical' ? 1.0 : latitude === 'temperate' ? 0.7 : 0.5;
  
  // Outbreathing: typically 60% of inbreathing
  const thermalOutbreathing = thermalInbreathing * 0.6 * latitudeFactor;
  thermalInbreathing *= latitudeFactor;
  
  // Pump in/out venting (1:1 volume displacement)
  const pumpInVenting = maxPumpInRate * 5.615; // bbl/hr to ft³/hr
  const pumpOutVenting = maxPumpOutRate * 5.615;
  
  return {
    thermalInbreathing,
    thermalOutbreathing,
    pumpInVenting,
    pumpOutVenting,
    totalInbreathing: thermalInbreathing + pumpOutVenting,
    totalOutbreathing: thermalOutbreathing + pumpInVenting,
  };
};

// ============================================
// Blocked Outlet / Thermal Relief Calculations
// Per API 521 Section 5.6
// ============================================

// Common liquid thermal expansion coefficients (1/°F)
const LIQUID_EXPANSION_COEFFICIENTS: Record<string, { alpha: number; name: string; specificGravity: number }> = {
  water: { alpha: 0.00012, name: 'Water', specificGravity: 1.0 },
  crude_oil: { alpha: 0.00040, name: 'Crude Oil', specificGravity: 0.85 },
  gasoline: { alpha: 0.00060, name: 'Gasoline', specificGravity: 0.74 },
  diesel: { alpha: 0.00045, name: 'Diesel', specificGravity: 0.85 },
  kerosene: { alpha: 0.00055, name: 'Kerosene', specificGravity: 0.80 },
  lube_oil: { alpha: 0.00038, name: 'Lube Oil', specificGravity: 0.90 },
  lpg: { alpha: 0.00120, name: 'LPG (Liquid)', specificGravity: 0.55 },
  propane: { alpha: 0.00150, name: 'Propane', specificGravity: 0.50 },
  butane: { alpha: 0.00110, name: 'Butane', specificGravity: 0.58 },
  ammonia: { alpha: 0.00130, name: 'Ammonia', specificGravity: 0.68 },
  methanol: { alpha: 0.00070, name: 'Methanol', specificGravity: 0.79 },
  ethanol: { alpha: 0.00062, name: 'Ethanol', specificGravity: 0.79 },
  benzene: { alpha: 0.00068, name: 'Benzene', specificGravity: 0.88 },
  toluene: { alpha: 0.00058, name: 'Toluene', specificGravity: 0.87 },
  custom: { alpha: 0.0005, name: 'Custom', specificGravity: 1.0 },
};

// Calculate thermal expansion flow rate
// Q = V × α × ΔT/Δt (volume expansion rate)
const calculateThermalExpansionRate = (
  liquidVolume: number, // gallons
  expansionCoeff: number, // 1/°F
  heatingRate: number // °F/hr
): { volumeRate: number; massRate: number } => {
  // Volume rate in gpm
  const volumeRateGPH = liquidVolume * expansionCoeff * heatingRate;
  const volumeRate = volumeRateGPH / 60; // Convert to gpm
  
  // Mass rate (assuming water density 8.34 lb/gal)
  const massRate = volumeRateGPH * 8.34; // lb/hr
  
  return { volumeRate, massRate };
};

// Calculate heating rate from heat input
const calculateHeatingRate = (
  heatInput: number, // BTU/hr
  liquidVolume: number, // gallons
  specificGravity: number,
  specificHeat: number // BTU/(lb·°F)
): number => {
  // Mass of liquid
  const liquidMass = liquidVolume * 8.34 * specificGravity; // lb
  
  // Temperature rise rate = Q / (m × Cp)
  const heatingRate = heatInput / (liquidMass * specificHeat); // °F/hr
  
  return heatingRate;
};

// Common heat input sources
const HEAT_SOURCES = [
  { name: 'Solar radiation (bare vessel)', heatFlux: 100 }, // BTU/hr/ft²
  { name: 'Solar radiation (insulated)', heatFlux: 20 },
  { name: 'Steam tracing', heatFlux: 300 },
  { name: 'Electric heat tracing', heatFlux: 200 },
  { name: 'Hot oil tracing', heatFlux: 250 },
  { name: 'Adjacent hot equipment', heatFlux: 150 },
  { name: 'Fire exposure', heatFlux: 10000 }, // Use fire case instead
];

// Calculate pipe/vessel surface area
const calculateSurfaceArea = (
  geometry: 'pipe' | 'vessel' | 'tank',
  diameter: number, // inches for pipe, ft for vessel/tank
  length: number // ft
): number => {
  if (geometry === 'pipe') {
    // Pipe: πDL (D in ft)
    const diameterFt = diameter / 12;
    return Math.PI * diameterFt * length;
  } else {
    // Vessel/tank: πDL + 2 × πD²/4 (approximation including heads)
    return Math.PI * diameter * length + Math.PI * diameter * diameter / 2;
  }
};

// Calculate liquid volume from geometry
const calculateLiquidVolume = (
  geometry: 'pipe' | 'vessel' | 'tank',
  diameter: number, // inches for pipe, ft for vessel/tank
  length: number // ft
): { volumeGal: number; volumeFt3: number } => {
  let volumeFt3: number;
  
  if (geometry === 'pipe') {
    // Pipe volume
    const diameterFt = diameter / 12;
    volumeFt3 = Math.PI * Math.pow(diameterFt / 2, 2) * length;
  } else {
    // Vessel/tank volume (cylindrical)
    volumeFt3 = Math.PI * Math.pow(diameter / 2, 2) * length;
  }
  
  const volumeGal = volumeFt3 * 7.481;
  return { volumeGal, volumeFt3 };
};

// Thermal relief sizing (liquid)
const calculateThermalReliefArea = (
  flowRate: number, // gpm
  specificGravity: number,
  viscosity: number, // cP
  setPresure: number, // psig
  overpressure: number, // %
  backPressure: number, // psig
  Kd: number,
  Kc: number
): { requiredArea: number; Kv: number; Kw: number } => {
  const P1 = setPresure * (1 + overpressure / 100);
  const P2 = backPressure;
  
  // Assume conventional valve for thermal relief
  const Kw = 1.0;
  
  // Preliminary area for Reynolds calculation
  const prelimArea = calculateLiquidArea(
    flowRate,
    specificGravity,
    Kd,
    Kw,
    Kc,
    1.0, // Preliminary Kv
    P1,
    P2
  );
  
  // Calculate Reynolds number
  const Re = (2800 * flowRate * Math.sqrt(Math.max(prelimArea, 0.001))) / 
             (viscosity * Math.sqrt(specificGravity));
  
  const Kv = calculateKv(Math.max(Math.abs(Re), 1));
  
  // Final area calculation
  const requiredArea = calculateLiquidArea(
    flowRate,
    specificGravity,
    Kd,
    Kw,
    Kc,
    Kv,
    P1,
    P2
  );
  
  return { requiredArea, Kv, Kw };
};

// ============================================
// Control Valve Failure Scenarios
// Per API 521 Section 5.3
// ============================================

// Failure scenarios
const FAILURE_SCENARIOS = [
  { id: 'cv_fail_open', name: 'Control Valve Fails Open', description: 'Upstream CV fails fully open, max flow to downstream' },
  { id: 'cv_fail_closed', name: 'Control Valve Fails Closed', description: 'Downstream CV fails closed, blocked outlet' },
  { id: 'check_valve_fail', name: 'Check Valve Failure', description: 'Check valve fails, reverse flow possible' },
  { id: 'pump_deadhead', name: 'Pump Deadhead', description: 'Pump running against closed discharge' },
  { id: 'exchanger_tube_rupture', name: 'Exchanger Tube Rupture', description: 'High pressure side blows into low pressure' },
  { id: 'regulator_fail', name: 'Pressure Regulator Failure', description: 'Regulator fails open, full upstream pressure' },
  { id: 'external_fire', name: 'External Fire + Blocked', description: 'Fire case with blocked outlet' },
] as const;

// Calculate control valve flow at failed position
const calculateCvFlow = (
  Cv: number, // Valve Cv
  P1: number, // Upstream pressure (psig)
  P2: number, // Downstream pressure (psig) 
  specificGravity: number,
  fluidType: 'liquid' | 'gas' | 'vapor',
  // Gas-specific
  molecularWeight?: number,
  temperature?: number, // °F
  Z?: number, // Compressibility
  k?: number // Specific heat ratio
): { flowRate: number; flowUnit: string; isCritical?: boolean } => {
  const deltaP = P1 - P2;
  
  if (fluidType === 'liquid') {
    // Liquid flow: Q = Cv × sqrt(ΔP / SG)
    const flowRate = Cv * Math.sqrt(Math.max(deltaP, 0) / specificGravity);
    return { flowRate, flowUnit: 'gpm' };
  } else if (molecularWeight && temperature && Z && k) {
    // Gas flow (with critical flow check)
    const P1_abs = P1 + 14.7;
    const P2_abs = P2 + 14.7;
    const T = temperature + 460;
    
    // Critical pressure ratio
    const Pcrit = P1_abs * Math.pow(2 / (k + 1), k / (k - 1));
    const isCritical = P2_abs < Pcrit;
    
    let flowRate: number;
    if (isCritical) {
      // Critical (choked) flow
      // W = 63.3 × Cv × P1 × sqrt(M / (T × Z))
      flowRate = 63.3 * Cv * P1_abs * Math.sqrt(molecularWeight / (T * Z));
    } else {
      // Subcritical flow
      // W = 1360 × Cv × sqrt((P1² - P2²) × M / (T × Z))
      flowRate = 1360 * Cv * Math.sqrt((P1_abs * P1_abs - P2_abs * P2_abs) * molecularWeight / (T * Z));
    }
    return { flowRate, flowUnit: 'lb/hr', isCritical };
  }
  return { flowRate: 0, flowUnit: 'gpm' };
};

// Calculate pump deadhead pressure rise
const calculatePumpDeadhead = (
  shutoffHead: number, // ft
  specificGravity: number,
  motorPower: number, // hp
  efficiency: number // pump efficiency at deadhead (typically 0-30%)
): { deadheadPressure: number; heatGeneration: number } => {
  // Deadhead pressure = shutoff head converted to psi
  const deadheadPressure = shutoffHead * specificGravity * 0.433; // ft to psi
  
  // Heat generation at deadhead (all power goes to heat)
  // Power in BTU/hr = hp × 2545 BTU/(hp·hr)
  const heatGeneration = motorPower * 2545 * (1 - efficiency);
  
  return { deadheadPressure, heatGeneration };
};

// Calculate exchanger tube rupture flow
const calculateTubeRuptureFlow = (
  tubeID: number, // inches
  numTubesRuptured: number,
  highSidePressure: number, // psig
  lowSidePressure: number, // psig
  fluidDensity: number, // lb/ft³
  dischargeCoeff: number // typically 0.6-0.8
): { massFlow: number; velocity: number } => {
  // Flow area
  const areaPerTube = Math.PI * Math.pow(tubeID / 24, 2); // ft² (ID in inches / 2 / 12)
  const totalArea = areaPerTube * numTubesRuptured;
  
  // Pressure differential
  const deltaP = (highSidePressure - lowSidePressure) * 144; // psf
  
  // Velocity from Bernoulli (simplified)
  // v = Cd × sqrt(2 × ΔP / ρ)
  const velocity = dischargeCoeff * Math.sqrt(2 * Math.max(deltaP, 0) / fluidDensity);
  
  // Mass flow
  const volumeFlow = velocity * totalArea * 3600; // ft³/hr
  const massFlow = volumeFlow * fluidDensity; // lb/hr
  
  return { massFlow, velocity };
};

// Water hammer / pressure surge calculation (Joukowsky equation)
const calculateWaterHammer = (
  velocity: number, // ft/s
  pipeLength: number, // ft
  pipeDiameter: number, // inches
  pipeWallThickness: number, // inches
  fluidDensity: number, // lb/ft³
  fluidBulkModulus: number, // psi (typically 300,000 for water)
  pipeMaterial: 'steel' | 'stainless' | 'copper' | 'pvc'
): { pressureSurge: number; waveSpeed: number; closureTime: number } => {
  // Pipe modulus of elasticity
  const pipeModulus: Record<string, number> = {
    steel: 30e6,
    stainless: 28e6,
    copper: 17e6,
    pvc: 0.4e6,
  };
  const E = pipeModulus[pipeMaterial];
  
  // Wave speed (celerity)
  // a = sqrt(K/ρ) / sqrt(1 + (K×D)/(E×t))
  const D = pipeDiameter;
  const t = pipeWallThickness;
  const K = fluidBulkModulus;
  const rho = fluidDensity;
  
  const waveSpeed = Math.sqrt(K * 144 / rho) / Math.sqrt(1 + (K * D) / (E * t));
  
  // Joukowsky pressure surge: ΔP = ρ × a × ΔV / 144
  const pressureSurge = (rho * waveSpeed * velocity) / 144; // psi
  
  // Critical closure time (round trip)
  const closureTime = (2 * pipeLength) / waveSpeed;
  
  return { pressureSurge, waveSpeed, closureTime };
};

// Combined failure scenario relief sizing
const calculateFailureScenarioRelief = (
  scenario: string,
  flowType: 'vapor' | 'liquid',
  flowRate: number, // lb/hr for vapor, gpm for liquid
  setPresure: number,
  overpressure: number,
  backPressure: number,
  // Vapor params
  vaporMW?: number,
  vaporK?: number,
  temperature?: number,
  compressibility?: number,
  // Liquid params
  specificGravity?: number,
  viscosity?: number,
  // Common
  Kd?: number,
  Kc?: number
): { requiredArea: number; relievingPressure: number } => {
  const P1 = setPresure * (1 + overpressure / 100);
  
  if (flowType === 'vapor' && vaporMW && vaporK && temperature && compressibility) {
    const T_abs = temperature + 459.67;
    const C = calculateCCoefficient(vaporK);
    const P1_abs = P1 + 14.7;
    
    const requiredArea = calculateVaporArea(
      flowRate,
      C,
      Kd || 0.975,
      P1_abs,
      1.0, // Kb
      Kc || 1.0,
      T_abs,
      compressibility,
      vaporMW
    );
    
    return { requiredArea, relievingPressure: P1 };
  } else if (flowType === 'liquid' && specificGravity) {
    const requiredArea = calculateLiquidArea(
      flowRate,
      specificGravity,
      Kd || 0.65,
      1.0, // Kw
      Kc || 1.0,
      1.0, // Kv simplified
      P1,
      backPressure
    );
    
    return { requiredArea, relievingPressure: P1 };
  }
  
  return { requiredArea: 0, relievingPressure: P1 };
};

export default function API520Calculator() {
  // Vapor inputs
  const [vaporInputs, setVaporInputs] = useState({
    massFlow: 10000, // lb/hr
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    temperature: 200, // °F
    molecularWeight: 29, // Air
    specificHeatRatio: 1.4,
    compressibility: 1.0,
    dischargeCoeff: 0.975, // Kd
    valveType: 'conventional' as 'conventional' | 'balanced' | 'pilot',
    ruptureDisk: false,
  });

  // Liquid inputs
  const [liquidInputs, setLiquidInputs] = useState({
    flowRate: 500, // gpm
    specificGravity: 1.0,
    viscosity: 1.0, // cP
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 0, // psig
    dischargeCoeff: 0.65, // Kd
    valveType: 'conventional' as 'conventional' | 'balanced',
    ruptureDisk: false,
  });

  // Two-phase inputs
  const [twoPhaseInputs, setTwoPhaseInputs] = useState({
    totalMassFlow: 50000, // lb/hr
    vaporFraction: 0.1, // mass fraction
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    liquidDensity: 50, // lb/ft³
    vaporDensity: 0.5, // lb/ft³
    specificHeatRatio: 1.3,
    dischargeCoeff: 0.85,
    ruptureDisk: false,
  });

  // Steam inputs
  const [steamInputs, setSteamInputs] = useState({
    massFlow: 10000, // lb/hr
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    steamType: 'saturated' as 'saturated' | 'superheated',
    superheatTemp: 0, // °F above saturation
    dischargeCoeff: 0.975,
    valveType: 'conventional' as 'conventional' | 'balanced' | 'pilot',
    ruptureDisk: false,
  });

  // Fire case inputs (API 521)
  const [fireCaseInputs, setFireCaseInputs] = useState({
    vesselType: 'horizontal' as 'horizontal' | 'vertical' | 'sphere',
    diameter: 10, // ft
    length: 30, // ft
    liquidLevel: 50, // %
    environmentalFactor: 1.0,
    promptDrainage: true,
    latentHeat: 150, // BTU/lb
    vaporMW: 44, // Propane
    vaporK: 1.13,
    setPresure: 250, // psig
    overpressure: 21, // % (fire case allows 21%)
    relievingTemp: 200, // °F
    compressibility: 0.85,
    dischargeCoeff: 0.975,
    ruptureDisk: false,
  });

  // Rupture disk inputs (API 520 Appendix M)
  const [ruptureDiskInputs, setRuptureDiskInputs] = useState({
    serviceType: 'vapor' as 'vapor' | 'liquid' | 'steam',
    flowRate: 10000, // lb/hr for vapor/steam, gpm for liquid
    burstPressure: 150, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    resistanceFactor: 2.4, // Kr typical for RD
    dischargeCoeff: 0.62, // Typical for RD alone
    // Vapor properties
    vaporMW: 29,
    vaporK: 1.4,
    temperature: 200, // °F
    compressibility: 1.0,
    // Liquid properties
    specificGravity: 1.0,
    // Configuration
    inletPipeDia: 4, // inches
    diskType: 'conventional' as 'conventional' | 'graphite' | 'scored',
  });

  // Liquid overfill inputs
  const [overfillInputs, setOverfillInputs] = useState({
    tankType: 'vertical' as 'vertical' | 'horizontal' | 'cone_roof' | 'dome_roof',
    tankDiameter: 40, // ft
    tankHeight: 48, // ft
    roofHeight: 4, // ft (for cone/dome)
    currentLiquidLevel: 80, // %
    maxLiquidInflowRate: 1000, // bbl/hr
    flowUnit: 'bbl_hr' as 'gpm' | 'bbl_hr',
    vaporMW: 86, // Hexane-like
    vaporK: 1.05,
    temperature: 100, // °F
    compressibility: 0.98,
    maxAllowablePressure: 2.0, // psig (low pressure tank)
    setPresure: 1.5, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    dischargeCoeff: 0.975,
    ruptureDisk: false,
    latitude: 'temperate' as 'tropical' | 'temperate' | 'arctic',
    maxPumpOutRate: 800, // bbl/hr
  });

  // Thermal relief inputs (blocked outlet)
  const [thermalInputs, setThermalInputs] = useState({
    geometry: 'pipe' as 'pipe' | 'vessel' | 'tank',
    diameter: 8, // inches for pipe, ft for vessel/tank
    length: 500, // ft
    liquidType: 'crude_oil' as keyof typeof LIQUID_EXPANSION_COEFFICIENTS,
    customExpansionCoeff: 0.0005, // 1/°F
    specificGravity: 0.85,
    viscosity: 5.0, // cP
    specificHeat: 0.5, // BTU/(lb·°F)
    heatSource: 'solar' as 'solar' | 'tracing' | 'ambient' | 'custom',
    heatFlux: 100, // BTU/hr/ft² for solar, total BTU/hr for custom
    ambientTempRise: 50, // °F/hr for ambient heating case
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 0, // psig
    dischargeCoeff: 0.65,
    ruptureDisk: false,
  });

  // Control valve failure inputs
  const [failureInputs, setFailureInputs] = useState({
    scenario: 'cv_fail_open' as typeof FAILURE_SCENARIOS[number]['id'],
    fluidType: 'liquid' as 'liquid' | 'vapor',
    // Control valve data
    valveCv: 200,
    upstreamPressure: 300, // psig
    downstreamPressure: 50, // psig
    normalFlowRate: 500, // gpm or lb/hr
    // Fluid properties
    specificGravity: 0.85,
    viscosity: 5.0, // cP
    vaporMW: 44,
    vaporK: 1.15,
    temperature: 150, // °F
    compressibility: 0.9,
    // Water hammer
    pipeVelocity: 8, // ft/s
    pipeLength: 500, // ft
    pipeDiameter: 8, // inches
    pipeWallThickness: 0.322, // inches (Sch 40)
    pipeMaterial: 'steel' as 'steel' | 'stainless' | 'copper' | 'pvc',
    fluidBulkModulus: 200000, // psi
    fluidDensity: 53, // lb/ft³
    // Pump deadhead
    pumpShutoffHead: 400, // ft
    motorPower: 100, // hp
    deadheadEfficiency: 0.1, // 10%
    // Tube rupture
    tubeID: 0.75, // inches
    numTubesRuptured: 1,
    // Relief settings
    setPresure: 250, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    dischargeCoeff: 0.65,
    ruptureDisk: false,
  });

  // Scenario comparison state
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Get scenario type label
  const getScenarioTypeLabel = (type: SavedScenario['type']) => {
    const labels: Record<SavedScenario['type'], string> = {
      vapor: 'Vapor',
      liquid: 'Liquid',
      twophase: 'Two-Phase',
      steam: 'Steam',
      fire: 'Fire Case',
      rupturedisk: 'Rupture Disk',
      overfill: 'Overfill',
      thermal: 'Thermal',
      failure: 'Failure',
    };
    return labels[type];
  };

  // Save current scenario to comparison
  const saveScenario = useCallback((
    type: SavedScenario['type'],
    inputs: Record<string, any>,
    results: SavedScenario['results']
  ) => {
    const name = scenarioName.trim() || `${getScenarioTypeLabel(type)} ${savedScenarios.length + 1}`;
    const newScenario: SavedScenario = {
      id: generateId(),
      name,
      type,
      timestamp: new Date(),
      inputs,
      results,
    };
    setSavedScenarios(prev => [...prev, newScenario]);
    setScenarioName('');
  }, [scenarioName, savedScenarios.length]);

  // Remove scenario from comparison
  const removeScenario = useCallback((id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  }, []);

  // Clear all scenarios
  const clearAllScenarios = useCallback(() => {
    setSavedScenarios([]);
  }, []);

  // Sensitivity analysis state
  const [sensitivityInputs, setSensitivityInputs] = useState({
    analysisType: 'vapor' as 'vapor' | 'liquid',
    variableType: 'flow' as 'flow' | 'pressure',
    rangeMin: 50, // % of base value
    rangeMax: 150, // % of base value
    steps: 11,
  });

  // Sensitivity analysis calculation
  const sensitivityResults = useMemo(() => {
    const { analysisType, variableType, rangeMin, rangeMax, steps } = sensitivityInputs;
    const dataPoints: Array<{
      variableValue: number;
      variablePercent: number;
      requiredArea: number;
      orifice: string;
      orificeArea: number;
    }> = [];

    if (analysisType === 'vapor') {
      const baseValue = variableType === 'flow' ? vaporInputs.massFlow : vaporInputs.setPresure;
      
      for (let i = 0; i < steps; i++) {
        const percent = rangeMin + (rangeMax - rangeMin) * (i / (steps - 1));
        const value = baseValue * (percent / 100);
        
        // Calculate with varied parameter
        const massFlow = variableType === 'flow' ? value : vaporInputs.massFlow;
        const setPresure = variableType === 'pressure' ? value : vaporInputs.setPresure;
        
        const P1_abs = setPresure + 14.7;
        const P1_relieving = P1_abs * (1 + vaporInputs.overpressure / 100);
        const T_abs = vaporInputs.temperature + 459.67;
        const C = calculateCCoefficient(vaporInputs.specificHeatRatio);
        const criticalRatio = calculateCriticalRatio(vaporInputs.specificHeatRatio);
        const backPressureRatio = vaporInputs.backPressure / P1_relieving;
        
        let Kb = 1.0;
        if (vaporInputs.valveType === 'conventional') {
          Kb = backPressureRatio > criticalRatio ? 0.9 : 1.0;
        } else if (vaporInputs.valveType === 'balanced') {
          if (backPressureRatio <= criticalRatio) {
            Kb = 1.0;
          } else {
            Kb = Math.sqrt(1 - Math.pow((backPressureRatio - criticalRatio) / (1 - criticalRatio), 2));
          }
        }
        
        const Kc = vaporInputs.ruptureDisk ? 0.9 : 1.0;
        const requiredArea = calculateVaporArea(
          massFlow, C, vaporInputs.dischargeCoeff, P1_relieving,
          Kb, Kc, T_abs, vaporInputs.compressibility, vaporInputs.molecularWeight
        );
        
        const selected = selectOrifice(requiredArea);
        dataPoints.push({
          variableValue: value,
          variablePercent: percent,
          requiredArea,
          orifice: selected?.designation || 'Exceeds T',
          orificeArea: selected?.area || 0,
        });
      }
    } else {
      // Liquid analysis
      const baseValue = variableType === 'flow' ? liquidInputs.flowRate : liquidInputs.setPresure;
      
      for (let i = 0; i < steps; i++) {
        const percent = rangeMin + (rangeMax - rangeMin) * (i / (steps - 1));
        const value = baseValue * (percent / 100);
        
        const flowRate = variableType === 'flow' ? value : liquidInputs.flowRate;
        const setPresure = variableType === 'pressure' ? value : liquidInputs.setPresure;
        
        const P1 = setPresure * (1 + liquidInputs.overpressure / 100);
        const P2 = liquidInputs.backPressure;
        
        let Kw = 1.0;
        if (liquidInputs.valveType === 'balanced') {
          const ratio = P2 / P1;
          Kw = ratio <= 0.5 ? 1.0 : 1.0 - 0.3 * (ratio - 0.5);
        }
        
        const Kc = liquidInputs.ruptureDisk ? 0.9 : 1.0;
        const prelimArea = calculateLiquidArea(flowRate, liquidInputs.specificGravity, 
          liquidInputs.dischargeCoeff, Kw, Kc, 1.0, P1, P2);
        const Re = (2800 * flowRate * Math.sqrt(Math.max(prelimArea, 0.001))) / 
                   (liquidInputs.viscosity * Math.sqrt(liquidInputs.specificGravity));
        const Kv = calculateKv(Math.max(Math.abs(Re), 1));
        
        const requiredArea = calculateLiquidArea(flowRate, liquidInputs.specificGravity,
          liquidInputs.dischargeCoeff, Kw, Kc, Kv, P1, P2);
        
        const selected = selectOrifice(requiredArea);
        dataPoints.push({
          variableValue: value,
          variablePercent: percent,
          requiredArea,
          orifice: selected?.designation || 'Exceeds T',
          orificeArea: selected?.area || 0,
        });
      }
    }

    // Find orifice change points
    const orificeChanges: Array<{ from: string; to: string; atPercent: number; atValue: number }> = [];
    for (let i = 1; i < dataPoints.length; i++) {
      if (dataPoints[i].orifice !== dataPoints[i - 1].orifice) {
        orificeChanges.push({
          from: dataPoints[i - 1].orifice,
          to: dataPoints[i].orifice,
          atPercent: dataPoints[i].variablePercent,
          atValue: dataPoints[i].variableValue,
        });
      }
    }

    // Calculate sensitivity gradient (% change in area per % change in variable)
    const baseIndex = Math.floor(steps / 2);
    const baseArea = dataPoints[baseIndex]?.requiredArea || 0;
    const sensitivity = baseArea > 0 ? 
      ((dataPoints[steps - 1]?.requiredArea || 0) - (dataPoints[0]?.requiredArea || 0)) / 
      (baseArea * (rangeMax - rangeMin) / 100) : 0;

    return {
      dataPoints,
      orificeChanges,
      sensitivity,
      baseValue: sensitivityInputs.analysisType === 'vapor' 
        ? (variableType === 'flow' ? vaporInputs.massFlow : vaporInputs.setPresure)
        : (variableType === 'flow' ? liquidInputs.flowRate : liquidInputs.setPresure),
      unit: sensitivityInputs.analysisType === 'vapor'
        ? (variableType === 'flow' ? 'lb/hr' : 'psig')
        : (variableType === 'flow' ? 'gpm' : 'psig'),
    };
  }, [sensitivityInputs, vaporInputs, liquidInputs]);

  const vaporResults = useMemo(() => {
    const P1_abs = vaporInputs.setPresure + 14.7; // Convert to psia
    const P1_relieving = P1_abs * (1 + vaporInputs.overpressure / 100); // Relieving pressure
    const T_abs = vaporInputs.temperature + 459.67; // Convert to °R
    
    // Calculate C coefficient
    const C = calculateCCoefficient(vaporInputs.specificHeatRatio);
    
    // Back pressure correction
    let Kb = 1.0;
    const backPressureRatio = vaporInputs.backPressure / P1_relieving;
    const criticalRatio = calculateCriticalRatio(vaporInputs.specificHeatRatio);
    
    if (vaporInputs.valveType === 'conventional') {
      Kb = backPressureRatio > criticalRatio ? 0.9 : 1.0; // Simplified
    } else if (vaporInputs.valveType === 'balanced') {
      if (backPressureRatio <= criticalRatio) {
        Kb = 1.0;
      } else {
        Kb = Math.sqrt(1 - Math.pow((backPressureRatio - criticalRatio) / (1 - criticalRatio), 2));
      }
    }
    
    // Combination correction (rupture disk)
    const Kc = vaporInputs.ruptureDisk ? 0.9 : 1.0;
    
    // Calculate required area
    const requiredArea = calculateVaporArea(
      vaporInputs.massFlow,
      C,
      vaporInputs.dischargeCoeff,
      P1_relieving,
      Kb,
      Kc,
      T_abs,
      vaporInputs.compressibility,
      vaporInputs.molecularWeight
    );
    
    // Select orifice
    const selectedOrifice = selectOrifice(requiredArea);
    
    // Check if critical flow
    const isCriticalFlow = backPressureRatio <= criticalRatio;
    
    return {
      relievingPressure: P1_relieving,
      C,
      Kb,
      Kc,
      criticalRatio,
      requiredArea,
      selectedOrifice,
      isCriticalFlow,
      backPressureRatio,
    };
  }, [vaporInputs]);

  // Liquid calculations
  const liquidResults = useMemo(() => {
    const P1 = liquidInputs.setPresure * (1 + liquidInputs.overpressure / 100);
    const P2 = liquidInputs.backPressure;
    
    // Back pressure correction for balanced valves
    let Kw = 1.0;
    if (liquidInputs.valveType === 'balanced') {
      const ratio = P2 / P1;
      Kw = ratio <= 0.5 ? 1.0 : 1.0 - 0.3 * (ratio - 0.5);
    }
    
    // Viscosity correction
    // First calculate area with Kv = 1
    const prelimArea = calculateLiquidArea(
      liquidInputs.flowRate,
      liquidInputs.specificGravity,
      liquidInputs.dischargeCoeff,
      Kw,
      liquidInputs.ruptureDisk ? 0.9 : 1.0,
      1.0, // Preliminary Kv
      P1,
      P2
    );
    
    // Calculate Reynolds number
    const U = liquidInputs.flowRate / (prelimArea * 2800); // Velocity
    const Re = (2800 * liquidInputs.flowRate * Math.sqrt(prelimArea)) / 
               (liquidInputs.viscosity * Math.sqrt(liquidInputs.specificGravity));
    
    const Kv = calculateKv(Math.abs(Re));
    
    // Final area calculation
    const Kc = liquidInputs.ruptureDisk ? 0.9 : 1.0;
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
      deltaP: P1 - P2,
      Kw,
      Kv,
      Kc,
      reynoldsNumber: Re,
      requiredArea,
      selectedOrifice,
    };
  }, [liquidInputs]);

  // Two-phase calculations
  const twoPhaseResults = useMemo(() => {
    const P1_abs = twoPhaseInputs.setPresure + 14.7;
    const P1_relieving = P1_abs * (1 + twoPhaseInputs.overpressure / 100);
    
    const Kc = twoPhaseInputs.ruptureDisk ? 0.9 : 1.0;
    
    const { area, omega, G } = calculateOmegaMethod(
      twoPhaseInputs.totalMassFlow,
      P1_relieving,
      twoPhaseInputs.backPressure,
      twoPhaseInputs.vaporFraction,
      twoPhaseInputs.liquidDensity,
      twoPhaseInputs.vaporDensity,
      twoPhaseInputs.dischargeCoeff,
      twoPhaseInputs.specificHeatRatio
    );
    
    const requiredArea = area / Kc;
    const selectedOrifice = selectOrifice(requiredArea);
    
    // Determine flow regime
    let flowRegime = 'Two-Phase';
    if (twoPhaseInputs.vaporFraction < 0.01) flowRegime = 'Predominantly Liquid';
    else if (twoPhaseInputs.vaporFraction > 0.99) flowRegime = 'Predominantly Vapor';
    
    return {
      relievingPressure: P1_relieving,
      omega,
      massFlux: G,
      requiredArea,
      selectedOrifice,
      flowRegime,
      Kc,
    };
  }, [twoPhaseInputs]);

  // Steam calculations
  const steamResults = useMemo(() => {
    const P1_abs = steamInputs.setPresure + 14.7;
    const P1_relieving = P1_abs * (1 + steamInputs.overpressure / 100);
    
    // Back pressure correction
    let Kb = 1.0;
    const backPressureRatio = steamInputs.backPressure / P1_relieving;
    if (steamInputs.valveType === 'balanced' && backPressureRatio > 0.55) {
      Kb = Math.sqrt(1 - Math.pow((backPressureRatio - 0.55) / 0.45, 2));
    }
    
    const Kc = steamInputs.ruptureDisk ? 0.9 : 1.0;
    const Kn = calculateKn(P1_relieving);
    
    // Superheat correction
    let Ksh = 1.0;
    if (steamInputs.steamType === 'superheated' && steamInputs.superheatTemp > 0) {
      // Simplified correlation
      Ksh = 1 / (1 + 0.00065 * steamInputs.superheatTemp);
    }
    
    const requiredArea = calculateSteamArea(
      steamInputs.massFlow,
      P1_relieving,
      steamInputs.dischargeCoeff,
      Kb,
      Kc,
      Kn,
      Ksh
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      relievingPressure: P1_relieving,
      Kb,
      Kc,
      Kn,
      Ksh,
      requiredArea,
      selectedOrifice,
    };
  }, [steamInputs]);

  // Fire case calculations (API 521)
  const fireCaseResults = useMemo(() => {
    // Calculate wetted area
    const { wettedArea, totalSurfaceArea } = calculateWettedArea(
      fireCaseInputs.vesselType,
      fireCaseInputs.diameter,
      fireCaseInputs.length,
      fireCaseInputs.liquidLevel
    );
    
    // Calculate heat absorption
    const heatAbsorption = calculateFireHeatAbsorption(
      wettedArea,
      fireCaseInputs.promptDrainage ? 21000 : 34500,
      fireCaseInputs.environmentalFactor,
      fireCaseInputs.promptDrainage
    );
    
    // Calculate relieving conditions
    const P1_abs = fireCaseInputs.setPresure + 14.7;
    const P1_relieving = P1_abs * (1 + fireCaseInputs.overpressure / 100);
    const T_abs = fireCaseInputs.relievingTemp + 459.67;
    
    const Kc = fireCaseInputs.ruptureDisk ? 0.9 : 1.0;
    const Kb = 1.0; // Assuming critical flow for fire case
    
    // Calculate required relief
    const { massFlow, requiredArea } = calculateFireCaseRelief(
      heatAbsorption,
      fireCaseInputs.latentHeat,
      fireCaseInputs.vaporMW,
      fireCaseInputs.vaporK,
      P1_relieving,
      T_abs,
      fireCaseInputs.compressibility,
      fireCaseInputs.dischargeCoeff,
      Kb,
      Kc
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      wettedArea,
      totalSurfaceArea,
      heatAbsorption,
      massFlow,
      relievingPressure: P1_relieving,
      requiredArea,
      selectedOrifice,
      Kc,
    };
  }, [fireCaseInputs]);

  // Rupture disk calculations (API 520 Appendix M)
  const ruptureDiskResults = useMemo(() => {
    const burstPressure = ruptureDiskInputs.burstPressure + 14.7; // Convert to psia
    const relievingPressure = burstPressure * (1 + ruptureDiskInputs.overpressure / 100);
    const T_abs = ruptureDiskInputs.temperature + 459.67;
    
    // Calculate resistance factor based on disk type
    let Kr = ruptureDiskInputs.resistanceFactor;
    if (ruptureDiskInputs.diskType === 'graphite') {
      Kr = 1.5; // Lower resistance
    } else if (ruptureDiskInputs.diskType === 'scored') {
      Kr = 0.5; // Even lower resistance
    }
    
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
    
    // Calculate minimum burst pressure ratio
    const burstTolerance = ruptureDiskInputs.diskType === 'conventional' ? 0.05 : 0.02;
    const minBurst = ruptureDiskInputs.burstPressure * (1 - burstTolerance);
    const maxBurst = ruptureDiskInputs.burstPressure * (1 + burstTolerance);
    
    return {
      relievingPressure,
      Kr,
      Knet,
      requiredArea,
      selectedDisk,
      minBurst,
      maxBurst,
      burstTolerance: burstTolerance * 100,
    };
  }, [ruptureDiskInputs]);

  // Liquid overfill calculations
  const overfillResults = useMemo(() => {
    // Calculate tank volumes
    const { vaporVolume, liquidVolume, totalVolume } = calculateVaporSpace(
      overfillInputs.tankType,
      overfillInputs.tankDiameter,
      overfillInputs.tankHeight,
      overfillInputs.currentLiquidLevel,
      overfillInputs.roofHeight
    );
    
    // Convert to barrels
    const totalVolumeBarrels = totalVolume / 5.615;
    const liquidVolumeBarrels = liquidVolume / 5.615;
    const vaporVolumeBarrels = vaporVolume / 5.615;
    
    // Calculate venting requirements for overfill
    const { volumetricVentRate, massVentRate, liquidRiseRate } = calculateOverfillVentingRate(
      overfillInputs.maxLiquidInflowRate,
      overfillInputs.flowUnit,
      overfillInputs.tankDiameter,
      overfillInputs.vaporMW,
      overfillInputs.temperature,
      14.7, // atmospheric
      overfillInputs.maxAllowablePressure
    );
    
    // Calculate API 2000 normal venting
    const api2000Venting = calculateAPI2000NormalVenting(
      overfillInputs.maxLiquidInflowRate,
      overfillInputs.maxPumpOutRate,
      totalVolumeBarrels,
      overfillInputs.latitude
    );
    
    // Relief device sizing for overfill case
    const Kc = overfillInputs.ruptureDisk ? 0.9 : 1.0;
    const { requiredArea, relievingPressure, C } = calculateOverfillReliefArea(
      massVentRate,
      overfillInputs.vaporMW,
      overfillInputs.vaporK,
      overfillInputs.setPresure,
      overfillInputs.overpressure,
      overfillInputs.backPressure,
      overfillInputs.temperature,
      overfillInputs.compressibility,
      overfillInputs.dischargeCoeff,
      Kc
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    // Calculate time to overfill from current level
    const remainingVaporVolume = vaporVolume; // ft³
    let inflowRateFt3Hr: number;
    if (overfillInputs.flowUnit === 'gpm') {
      inflowRateFt3Hr = overfillInputs.maxLiquidInflowRate * 60 * 0.1337;
    } else {
      inflowRateFt3Hr = overfillInputs.maxLiquidInflowRate * 5.615;
    }
    const timeToOverfill = remainingVaporVolume / inflowRateFt3Hr; // hours
    
    return {
      totalVolume,
      liquidVolume,
      vaporVolume,
      totalVolumeBarrels,
      liquidVolumeBarrels,
      vaporVolumeBarrels,
      volumetricVentRate,
      massVentRate,
      liquidRiseRate,
      api2000Venting,
      requiredArea,
      relievingPressure,
      C,
      selectedOrifice,
      Kc,
      timeToOverfill,
    };
  }, [overfillInputs]);

  // Thermal relief calculations (blocked outlet)
  const thermalResults = useMemo(() => {
    // Get liquid properties
    const liquidProps = LIQUID_EXPANSION_COEFFICIENTS[thermalInputs.liquidType];
    const expansionCoeff = thermalInputs.liquidType === 'custom' 
      ? thermalInputs.customExpansionCoeff 
      : liquidProps.alpha;
    
    // Calculate geometry
    const { volumeGal, volumeFt3 } = calculateLiquidVolume(
      thermalInputs.geometry,
      thermalInputs.diameter,
      thermalInputs.length
    );
    
    const surfaceArea = calculateSurfaceArea(
      thermalInputs.geometry,
      thermalInputs.diameter,
      thermalInputs.length
    );
    
    // Calculate heat input
    let totalHeatInput: number;
    let heatingRate: number;
    
    if (thermalInputs.heatSource === 'solar' || thermalInputs.heatSource === 'tracing') {
      totalHeatInput = thermalInputs.heatFlux * surfaceArea;
      heatingRate = calculateHeatingRate(
        totalHeatInput,
        volumeGal,
        thermalInputs.specificGravity,
        thermalInputs.specificHeat
      );
    } else if (thermalInputs.heatSource === 'ambient') {
      heatingRate = thermalInputs.ambientTempRise;
      const liquidMass = volumeGal * 8.34 * thermalInputs.specificGravity;
      totalHeatInput = liquidMass * thermalInputs.specificHeat * heatingRate;
    } else {
      totalHeatInput = thermalInputs.heatFlux; // Custom: direct heat input in BTU/hr
      heatingRate = calculateHeatingRate(
        totalHeatInput,
        volumeGal,
        thermalInputs.specificGravity,
        thermalInputs.specificHeat
      );
    }
    
    // Calculate thermal expansion flow
    const { volumeRate, massRate } = calculateThermalExpansionRate(
      volumeGal,
      expansionCoeff,
      heatingRate
    );
    
    // Relief device sizing
    const Kc = thermalInputs.ruptureDisk ? 0.9 : 1.0;
    const { requiredArea, Kv, Kw } = calculateThermalReliefArea(
      volumeRate,
      thermalInputs.specificGravity,
      thermalInputs.viscosity,
      thermalInputs.setPresure,
      thermalInputs.overpressure,
      thermalInputs.backPressure,
      thermalInputs.dischargeCoeff,
      Kc
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    const relievingPressure = thermalInputs.setPresure * (1 + thermalInputs.overpressure / 100);
    
    // Time to dangerous overpressure (rough estimate)
    // Assuming bulk modulus of ~200,000 psi for liquids
    const bulkModulus = 200000; // psi
    const pressureRiseRate = (expansionCoeff * heatingRate * bulkModulus); // psi/hr
    const timeToDangerousPressure = thermalInputs.setPresure / pressureRiseRate; // hours
    
    return {
      volumeGal,
      volumeFt3,
      surfaceArea,
      expansionCoeff,
      heatingRate,
      totalHeatInput,
      volumeRate,
      massRate,
      requiredArea,
      Kv,
      Kw,
      Kc,
      selectedOrifice,
      relievingPressure,
      pressureRiseRate,
      timeToDangerousPressure,
      liquidName: liquidProps.name,
    };
  }, [thermalInputs]);

  // Control valve failure calculations
  const failureResults = useMemo(() => {
    const scenarioInfo = FAILURE_SCENARIOS.find(s => s.id === failureInputs.scenario);
    
    // Calculate CV flow at failure
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
    
    // Water hammer calculation
    const waterHammer = calculateWaterHammer(
      failureInputs.pipeVelocity,
      failureInputs.pipeLength,
      failureInputs.pipeDiameter,
      failureInputs.pipeWallThickness,
      failureInputs.fluidDensity,
      failureInputs.fluidBulkModulus,
      failureInputs.pipeMaterial
    );
    
    // Pump deadhead
    const pumpDeadhead = calculatePumpDeadhead(
      failureInputs.pumpShutoffHead,
      failureInputs.specificGravity,
      failureInputs.motorPower,
      failureInputs.deadheadEfficiency
    );
    
    // Tube rupture
    const tubeRupture = calculateTubeRuptureFlow(
      failureInputs.tubeID,
      failureInputs.numTubesRuptured,
      failureInputs.upstreamPressure,
      failureInputs.downstreamPressure,
      failureInputs.fluidDensity,
      0.62 // Discharge coefficient for orifice
    );
    
    // Determine relief flow based on scenario
    let reliefFlowRate: number;
    let reliefFlowUnit: string;
    
    switch (failureInputs.scenario) {
      case 'cv_fail_open':
        reliefFlowRate = cvFlow.flowRate;
        reliefFlowUnit = cvFlow.flowUnit;
        break;
      case 'pump_deadhead':
        // Heat generation causes thermal expansion
        reliefFlowRate = failureInputs.normalFlowRate * 0.1; // Estimate
        reliefFlowUnit = 'gpm';
        break;
      case 'exchanger_tube_rupture':
        reliefFlowRate = tubeRupture.massFlow;
        reliefFlowUnit = 'lb/hr';
        break;
      default:
        reliefFlowRate = cvFlow.flowRate;
        reliefFlowUnit = cvFlow.flowUnit;
    }
    
    // Relief device sizing
    const Kc = failureInputs.ruptureDisk ? 0.9 : 1.0;
    const { requiredArea, relievingPressure } = calculateFailureScenarioRelief(
      failureInputs.scenario,
      failureInputs.fluidType,
      reliefFlowRate,
      failureInputs.setPresure,
      failureInputs.overpressure,
      failureInputs.backPressure,
      failureInputs.vaporMW,
      failureInputs.vaporK,
      failureInputs.temperature,
      failureInputs.compressibility,
      failureInputs.specificGravity,
      failureInputs.viscosity,
      failureInputs.dischargeCoeff,
      Kc
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    // Calculate max pressure with water hammer
    const maxPressureWithSurge = failureInputs.upstreamPressure + waterHammer.pressureSurge;
    
    return {
      scenarioInfo,
      cvFlow,
      waterHammer,
      pumpDeadhead,
      tubeRupture,
      reliefFlowRate,
      reliefFlowUnit,
      requiredArea,
      relievingPressure,
      selectedOrifice,
      Kc,
      maxPressureWithSurge,
    };
  }, [failureInputs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API 520/521 Relief Valve Sizing
            <Badge variant="outline" className="ml-2">API 520 Part I & II</Badge>
          </CardTitle>
          <CardDescription>
            Comprehensive pressure relief device sizing per API 520/521/2000 including failure scenarios
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="vapor" className="space-y-4">
        <TabsList className="grid grid-cols-11 w-full">
          <TabsTrigger value="vapor" className="text-xs">Vapor</TabsTrigger>
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
          <TabsTrigger value="overfill" className="flex items-center gap-1 text-xs">
            <Droplets className="h-3 w-3" />
            Overfill
          </TabsTrigger>
          <TabsTrigger value="thermal" className="flex items-center gap-1 text-xs">
            <Thermometer className="h-3 w-3" />
            Thermal
          </TabsTrigger>
          <TabsTrigger value="failure" className="flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Failure
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3" />
            Sensitivity
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-1 text-xs">
            <BarChart3 className="h-3 w-3" />
            Compare
          </TabsTrigger>
        </TabsList>

        {/* Vapor Tab */}
        <TabsContent value="vapor" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
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
                    <Label>Molecular Weight</Label>
                    <Input
                      type="number"
                      value={vaporInputs.molecularWeight}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, molecularWeight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specific Heat Ratio (k)</Label>
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
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Vapor Relief Sizing Results
                    {vaporResults.selectedOrifice ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </CardTitle>
                  <CardDescription>Per API 520 Part I, Eq. 3.1</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('vapor', vaporInputs, {
                    requiredArea: vaporResults.requiredArea,
                    selectedOrifice: vaporResults.selectedOrifice,
                    relievingPressure: vaporResults.relievingPressure,
                    massFlow: vaporInputs.massFlow,
                    correctionFactors: { Kd: vaporInputs.dischargeCoeff, Kb: vaporResults.Kb, Kc: vaporResults.Kc }
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Compare
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{vaporResults.relievingPressure.toFixed(1)} psia</span></p>
                    <p className="text-sm">Critical Ratio (Pc/P1): <span className="font-mono font-medium">{vaporResults.criticalRatio.toFixed(4)}</span></p>
                    <p className="text-sm">Back Pressure Ratio: <span className="font-mono font-medium">{vaporResults.backPressureRatio.toFixed(4)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <div className="space-y-1">
                    <p className="text-sm">C Coefficient: <span className="font-mono font-medium">{vaporResults.C.toFixed(2)}</span></p>
                    <p className="text-sm">Kb (Back Pressure): <span className="font-mono font-medium">{vaporResults.Kb.toFixed(3)}</span></p>
                    <p className="text-sm">Kc (Combination): <span className="font-mono font-medium">{vaporResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{vaporResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {vaporResults.selectedOrifice ? `${vaporResults.selectedOrifice.designation} (${vaporResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                    <p className="text-sm">Flow Condition: <Badge variant={vaporResults.isCriticalFlow ? "default" : "secondary"}>
                      {vaporResults.isCriticalFlow ? 'Critical (Sonic)' : 'Subcritical'}
                    </Badge></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liquid Tab */}
        <TabsContent value="liquid" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
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
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Liquid Relief Sizing Results
                    {liquidResults.selectedOrifice ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </CardTitle>
                  <CardDescription>Per API 520 Part I, Eq. 3.5</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('liquid', liquidInputs, {
                    requiredArea: liquidResults.requiredArea,
                    selectedOrifice: liquidResults.selectedOrifice,
                    relievingPressure: liquidResults.relievingPressure,
                    flowRate: liquidInputs.flowRate,
                    flowUnit: 'gpm',
                    correctionFactors: { Kd: liquidInputs.dischargeCoeff, Kw: liquidResults.Kw, Kc: liquidResults.Kc, Kv: liquidResults.Kv }
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Compare
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{liquidResults.relievingPressure.toFixed(1)} psig</span></p>
                    <p className="text-sm">Differential Pressure: <span className="font-mono font-medium">{liquidResults.deltaP.toFixed(1)} psi</span></p>
                    <p className="text-sm">Reynolds Number: <span className="font-mono font-medium">{liquidResults.reynoldsNumber.toFixed(0)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Kw (Back Pressure): <span className="font-mono font-medium">{liquidResults.Kw.toFixed(3)}</span></p>
                    <p className="text-sm">Kv (Viscosity): <span className="font-mono font-medium">{liquidResults.Kv.toFixed(3)}</span></p>
                    <p className="text-sm">Kc (Combination): <span className="font-mono font-medium">{liquidResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{liquidResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {liquidResults.selectedOrifice ? `${liquidResults.selectedOrifice.designation} (${liquidResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Two-Phase Tab */}
        <TabsContent value="twophase" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
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
                    <Label>Specific Heat Ratio (k)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={twoPhaseInputs.specificHeatRatio}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, specificHeatRatio: parseFloat(e.target.value) || 1.3 })}
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valve Configuration</CardTitle>
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
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="twoPhaseRuptureDisk"
                    checked={twoPhaseInputs.ruptureDisk}
                    onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="twoPhaseRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Two-Phase Relief Sizing Results (Omega Method)
                    {twoPhaseResults.selectedOrifice ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </CardTitle>
                  <CardDescription>Per API 520 Appendix D - Omega Parameter Method</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('twophase', twoPhaseInputs, {
                    requiredArea: twoPhaseResults.requiredArea,
                    selectedOrifice: twoPhaseResults.selectedOrifice,
                    relievingPressure: twoPhaseResults.relievingPressure,
                    massFlow: twoPhaseInputs.totalMassFlow,
                    correctionFactors: { Kd: twoPhaseInputs.dischargeCoeff, Kc: twoPhaseResults.Kc }
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Compare
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Flow Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{twoPhaseResults.relievingPressure.toFixed(1)} psia</span></p>
                    <p className="text-sm">Flow Regime: <Badge variant="outline">{twoPhaseResults.flowRegime}</Badge></p>
                    <p className="text-sm">Omega (ω): <span className="font-mono font-medium">{twoPhaseResults.omega.toFixed(4)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Mass Flux</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Mass Flux (G): <span className="font-mono font-medium">{twoPhaseResults.massFlux.toFixed(1)} lb/ft²·s</span></p>
                    <p className="text-sm">Kc (Combination): <span className="font-mono font-medium">{twoPhaseResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{twoPhaseResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {twoPhaseResults.selectedOrifice ? `${twoPhaseResults.selectedOrifice.designation} (${twoPhaseResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steam Tab */}
        <TabsContent value="steam" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Steam Flow Rate (lb/hr)</Label>
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
                        <SelectItem value="saturated">Saturated</SelectItem>
                        <SelectItem value="superheated">Superheated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {steamInputs.steamType === 'superheated' && (
                    <div className="space-y-2">
                      <Label>Superheat (°F above sat.)</Label>
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
              <CardDescription>Per API 520 Part I - Steam Service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{steamResults.relievingPressure.toFixed(1)} psia</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Kb (Back Pressure): <span className="font-mono font-medium">{steamResults.Kb.toFixed(3)}</span></p>
                    <p className="text-sm">Kc (Combination): <span className="font-mono font-medium">{steamResults.Kc.toFixed(2)}</span></p>
                    <p className="text-sm">Kn (Napier): <span className="font-mono font-medium">{steamResults.Kn.toFixed(3)}</span></p>
                    <p className="text-sm">Ksh (Superheat): <span className="font-mono font-medium">{steamResults.Ksh.toFixed(3)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{steamResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {steamResults.selectedOrifice ? `${steamResults.selectedOrifice.designation} (${steamResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fire Case Tab (API 521) */}
        <TabsContent value="firecase" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Vessel Geometry
                </CardTitle>
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
                    <Label htmlFor="promptDrainage">Adequate Drainage (C = 21,000)</Label>
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fireCaseRuptureDisk"
                    checked={fireCaseInputs.ruptureDisk}
                    onChange={(e) => setFireCaseInputs({ ...fireCaseInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="fireCaseRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
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
              <CardDescription>Per API 521 Table 4 - Fire Exposure Heat Input</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Wetted Area</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Wetted Area: <span className="font-mono font-medium">{fireCaseResults.wettedArea.toFixed(1)} ft²</span></p>
                    <p className="text-sm">Total Surface: <span className="font-mono font-medium">{fireCaseResults.totalSurfaceArea.toFixed(1)} ft²</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Heat Absorption</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Q: <span className="font-mono font-medium">{(fireCaseResults.heatAbsorption / 1e6).toFixed(2)} MM BTU/hr</span></p>
                    <p className="text-sm">Vapor Rate: <span className="font-mono font-medium">{fireCaseResults.massFlow.toFixed(0)} lb/hr</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Relieving Conditions</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Pressure: <span className="font-mono font-medium">{fireCaseResults.relievingPressure.toFixed(1)} psia</span></p>
                    <p className="text-sm">Kc: <span className="font-mono font-medium">{fireCaseResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{fireCaseResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {fireCaseResults.selectedOrifice ? `${fireCaseResults.selectedOrifice.designation} (${fireCaseResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rupture Disk Tab (API 520 Appendix M) */}
        <TabsContent value="rupturedisk" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Disc className="h-4 w-4 text-blue-500" />
                  Rupture Disk Configuration
                </CardTitle>
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
                      value={ruptureDiskInputs.diskType}
                      onValueChange={(v) => setRuptureDiskInputs({ ...ruptureDiskInputs, diskType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conventional">Conventional Metal</SelectItem>
                        <SelectItem value="graphite">Graphite</SelectItem>
                        <SelectItem value="scored">Scored/Reverse Acting</SelectItem>
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
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={ruptureDiskInputs.overpressure}
                      onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psia)</Label>
                    <Input
                      type="number"
                      value={ruptureDiskInputs.backPressure}
                      onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resistance Factor (Kr)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={ruptureDiskInputs.resistanceFactor}
                      onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, resistanceFactor: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discharge Coefficient (Kd)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={ruptureDiskInputs.dischargeCoeff}
                      onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, dischargeCoeff: parseFloat(e.target.value) || 0.62 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fluid Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ruptureDiskInputs.serviceType === 'vapor' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Molecular Weight</Label>
                      <Input
                        type="number"
                        value={ruptureDiskInputs.vaporMW}
                        onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, vaporMW: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Specific Heat Ratio (k)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ruptureDiskInputs.vaporK}
                        onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, vaporK: parseFloat(e.target.value) || 1.4 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature (°F)</Label>
                      <Input
                        type="number"
                        value={ruptureDiskInputs.temperature}
                        onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, temperature: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Compressibility (Z)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ruptureDiskInputs.compressibility}
                        onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, compressibility: parseFloat(e.target.value) || 1.0 })}
                      />
                    </div>
                  </div>
                )}
                {ruptureDiskInputs.serviceType === 'liquid' && (
                  <div className="space-y-2">
                    <Label>Specific Gravity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={ruptureDiskInputs.specificGravity}
                      onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, specificGravity: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                )}
                {ruptureDiskInputs.serviceType === 'steam' && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Steam service uses standard steam properties per API 520.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Inlet Pipe Diameter (in)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={ruptureDiskInputs.inletPipeDia}
                    onChange={(e) => setRuptureDiskInputs({ ...ruptureDiskInputs, inletPipeDia: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Rupture Disk Sizing Results
                {ruptureDiskResults.selectedDisk ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 520 Appendix M - Rupture Disk Devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{ruptureDiskResults.relievingPressure.toFixed(1)} psia</span></p>
                    <p className="text-sm">Burst Tolerance: <span className="font-mono font-medium">±{ruptureDiskResults.burstTolerance.toFixed(0)}%</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Burst Range</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Min Burst: <span className="font-mono font-medium">{ruptureDiskResults.minBurst.toFixed(1)} psig</span></p>
                    <p className="text-sm">Max Burst: <span className="font-mono font-medium">{ruptureDiskResults.maxBurst.toFixed(1)} psig</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Discharge Coefficients</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Kr (Resistance): <span className="font-mono font-medium">{ruptureDiskResults.Kr.toFixed(2)}</span></p>
                    <p className="text-sm">Knet (Net Coeff): <span className="font-mono font-medium">{ruptureDiskResults.Knet.toFixed(3)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{ruptureDiskResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Size: <span className="font-mono font-medium">
                      {ruptureDiskResults.selectedDisk ? `${ruptureDiskResults.selectedDisk.size}" (${ruptureDiskResults.selectedDisk.area.toFixed(2)} in²)` : 'Exceeds 24"'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Standard Rupture Disk Sizes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-xs">
                {RUPTURE_DISK_SIZES.map((disk) => (
                  <div 
                    key={disk.size} 
                    className={`flex flex-col items-center p-2 rounded ${
                      ruptureDiskResults.selectedDisk?.size === disk.size 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    <span className="font-mono font-medium">{disk.size}"</span>
                    <span className="text-[10px]">{disk.area.toFixed(2)} in²</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liquid Overfill Tab */}
        <TabsContent value="overfill" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Tank Geometry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tank Type</Label>
                    <Select
                      value={overfillInputs.tankType}
                      onValueChange={(v) => setOverfillInputs({ ...overfillInputs, tankType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Vertical Cylinder</SelectItem>
                        <SelectItem value="horizontal">Horizontal Cylinder</SelectItem>
                        <SelectItem value="cone_roof">Cone Roof</SelectItem>
                        <SelectItem value="dome_roof">Dome Roof</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Diameter (ft)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={overfillInputs.tankDiameter}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, tankDiameter: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height/Length (ft)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={overfillInputs.tankHeight}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, tankHeight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  {(overfillInputs.tankType === 'cone_roof' || overfillInputs.tankType === 'dome_roof') && (
                    <div className="space-y-2">
                      <Label>Roof Height (ft)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={overfillInputs.roofHeight}
                        onChange={(e) => setOverfillInputs({ ...overfillInputs, roofHeight: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Current Liquid Level (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={overfillInputs.currentLiquidLevel}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, currentLiquidLevel: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Climate Zone</Label>
                    <Select
                      value={overfillInputs.latitude}
                      onValueChange={(v) => setOverfillInputs({ ...overfillInputs, latitude: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tropical">Tropical</SelectItem>
                        <SelectItem value="temperate">Temperate</SelectItem>
                        <SelectItem value="arctic">Arctic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Flow Rates & Operating Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Liquid Inflow Rate</Label>
                    <Input
                      type="number"
                      value={overfillInputs.maxLiquidInflowRate}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, maxLiquidInflowRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Flow Unit</Label>
                    <Select
                      value={overfillInputs.flowUnit}
                      onValueChange={(v) => setOverfillInputs({ ...overfillInputs, flowUnit: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bbl_hr">bbl/hr</SelectItem>
                        <SelectItem value="gpm">gpm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Pump Out Rate (bbl/hr)</Label>
                    <Input
                      type="number"
                      value={overfillInputs.maxPumpOutRate}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, maxPumpOutRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature (°F)</Label>
                    <Input
                      type="number"
                      value={overfillInputs.temperature}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, temperature: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Allowable Pressure (psig)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={overfillInputs.maxAllowablePressure}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, maxAllowablePressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={overfillInputs.setPresure}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vapor Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vapor Molecular Weight</Label>
                    <Input
                      type="number"
                      value={overfillInputs.vaporMW}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, vaporMW: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vapor k (Cp/Cv)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={overfillInputs.vaporK}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, vaporK: parseFloat(e.target.value) || 1.05 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Compressibility (Z)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={overfillInputs.compressibility}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, compressibility: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discharge Coefficient (Kd)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={overfillInputs.dischargeCoeff}
                      onChange={(e) => setOverfillInputs({ ...overfillInputs, dischargeCoeff: parseFloat(e.target.value) || 0.975 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="overfillRuptureDisk"
                    checked={overfillInputs.ruptureDisk}
                    onChange={(e) => setOverfillInputs({ ...overfillInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="overfillRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tank Volume Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="font-mono font-medium">{overfillResults.totalVolumeBarrels.toFixed(0)} bbl</p>
                    <p className="text-xs text-muted-foreground">({overfillResults.totalVolume.toFixed(0)} ft³)</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Liquid Volume</p>
                    <p className="font-mono font-medium">{overfillResults.liquidVolumeBarrels.toFixed(0)} bbl</p>
                    <p className="text-xs text-muted-foreground">({overfillResults.liquidVolume.toFixed(0)} ft³)</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Vapor Space</p>
                    <p className="font-mono font-medium">{overfillResults.vaporVolumeBarrels.toFixed(0)} bbl</p>
                    <p className="text-xs text-muted-foreground">({overfillResults.vaporVolume.toFixed(0)} ft³)</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Time to Overfill</p>
                    <p className="font-mono font-medium">{overfillResults.timeToOverfill.toFixed(1)} hrs</p>
                    <p className="text-xs text-muted-foreground">at max inflow rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Overfill Protection Results
                {overfillResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 2000/521 - Liquid Overfill Venting Requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Overfill Venting</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Volume Rate: <span className="font-mono font-medium">{overfillResults.volumetricVentRate.toFixed(0)} SCFH</span></p>
                    <p className="text-sm">Mass Rate: <span className="font-mono font-medium">{overfillResults.massVentRate.toFixed(1)} lb/hr</span></p>
                    <p className="text-sm">Liquid Rise: <span className="font-mono font-medium">{overfillResults.liquidRiseRate.toFixed(2)} ft/hr</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">API 2000 Normal Venting</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Thermal In: <span className="font-mono font-medium">{overfillResults.api2000Venting.thermalInbreathing.toFixed(0)} SCFH</span></p>
                    <p className="text-sm">Thermal Out: <span className="font-mono font-medium">{overfillResults.api2000Venting.thermalOutbreathing.toFixed(0)} SCFH</span></p>
                    <p className="text-sm">Total Out: <span className="font-mono font-medium">{overfillResults.api2000Venting.totalOutbreathing.toFixed(0)} SCFH</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Relief Conditions</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving P: <span className="font-mono font-medium">{overfillResults.relievingPressure.toFixed(2)} psia</span></p>
                    <p className="text-sm">C Coefficient: <span className="font-mono font-medium">{overfillResults.C.toFixed(2)}</span></p>
                    <p className="text-sm">Kc: <span className="font-mono font-medium">{overfillResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{overfillResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {overfillResults.selectedOrifice ? `${overfillResults.selectedOrifice.designation} (${overfillResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API 2000 Pump In/Out Venting Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Inbreathing (Vacuum Relief)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-muted-foreground">Thermal:</p>
                    <p className="font-mono">{overfillResults.api2000Venting.thermalInbreathing.toFixed(0)} SCFH</p>
                    <p className="text-muted-foreground">Pump Out:</p>
                    <p className="font-mono">{overfillResults.api2000Venting.pumpOutVenting.toFixed(0)} SCFH</p>
                    <p className="text-muted-foreground font-medium">Total:</p>
                    <p className="font-mono font-medium">{overfillResults.api2000Venting.totalInbreathing.toFixed(0)} SCFH</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Outbreathing (Pressure Relief)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-muted-foreground">Thermal:</p>
                    <p className="font-mono">{overfillResults.api2000Venting.thermalOutbreathing.toFixed(0)} SCFH</p>
                    <p className="text-muted-foreground">Pump In:</p>
                    <p className="font-mono">{overfillResults.api2000Venting.pumpInVenting.toFixed(0)} SCFH</p>
                    <p className="text-muted-foreground font-medium">Total:</p>
                    <p className="font-mono font-medium">{overfillResults.api2000Venting.totalOutbreathing.toFixed(0)} SCFH</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thermal Relief Tab (Blocked Outlet) */}
        <TabsContent value="thermal" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  System Geometry
                </CardTitle>
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
                        <SelectItem value="pipe">Blocked Pipeline</SelectItem>
                        <SelectItem value="vessel">Pressure Vessel</SelectItem>
                        <SelectItem value="tank">Storage Tank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Diameter ({thermalInputs.geometry === 'pipe' ? 'in' : 'ft'})</Label>
                    <Input
                      type="number"
                      step={thermalInputs.geometry === 'pipe' ? '0.5' : '1'}
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
                      onValueChange={(v) => setThermalInputs({ ...thermalInputs, liquidType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LIQUID_EXPANSION_COEFFICIENTS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val.name} (α = {val.alpha.toExponential(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {thermalInputs.liquidType === 'custom' && (
                    <div className="space-y-2">
                      <Label>Custom α (1/°F)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={thermalInputs.customExpansionCoeff}
                        onChange={(e) => setThermalInputs({ ...thermalInputs, customExpansionCoeff: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Specific Gravity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={thermalInputs.specificGravity}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, specificGravity: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Viscosity (cP)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={thermalInputs.viscosity}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, viscosity: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specific Heat (BTU/lb·°F)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={thermalInputs.specificHeat}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, specificHeat: parseFloat(e.target.value) || 0.5 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Heat Source & Relief Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Heat Source</Label>
                    <Select
                      value={thermalInputs.heatSource}
                      onValueChange={(v) => setThermalInputs({ ...thermalInputs, heatSource: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solar">Solar Radiation</SelectItem>
                        <SelectItem value="tracing">Heat Tracing</SelectItem>
                        <SelectItem value="ambient">Ambient Temp Rise</SelectItem>
                        <SelectItem value="custom">Custom Heat Input</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(thermalInputs.heatSource === 'solar' || thermalInputs.heatSource === 'tracing') && (
                    <div className="space-y-2">
                      <Label>Heat Flux (BTU/hr/ft²)</Label>
                      <Input
                        type="number"
                        value={thermalInputs.heatFlux}
                        onChange={(e) => setThermalInputs({ ...thermalInputs, heatFlux: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                  {thermalInputs.heatSource === 'ambient' && (
                    <div className="space-y-2">
                      <Label>Temp Rise Rate (°F/hr)</Label>
                      <Input
                        type="number"
                        value={thermalInputs.ambientTempRise}
                        onChange={(e) => setThermalInputs({ ...thermalInputs, ambientTempRise: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                  {thermalInputs.heatSource === 'custom' && (
                    <div className="space-y-2">
                      <Label>Total Heat Input (BTU/hr)</Label>
                      <Input
                        type="number"
                        value={thermalInputs.heatFlux}
                        onChange={(e) => setThermalInputs({ ...thermalInputs, heatFlux: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={thermalInputs.setPresure}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={thermalInputs.overpressure}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={thermalInputs.backPressure}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discharge Coefficient (Kd)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={thermalInputs.dischargeCoeff}
                      onChange={(e) => setThermalInputs({ ...thermalInputs, dischargeCoeff: parseFloat(e.target.value) || 0.65 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="thermalRuptureDisk"
                    checked={thermalInputs.ruptureDisk}
                    onChange={(e) => setThermalInputs({ ...thermalInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="thermalRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Thermal Relief Sizing Results
                {thermalResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 521 Section 5.6 - Blocked Outlet / Thermal Expansion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">System Volume</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Volume: <span className="font-mono font-medium">{thermalResults.volumeGal.toFixed(0)} gal</span></p>
                    <p className="text-sm">Surface Area: <span className="font-mono font-medium">{thermalResults.surfaceArea.toFixed(1)} ft²</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Thermal Expansion</h4>
                  <div className="space-y-1">
                    <p className="text-sm">α: <span className="font-mono font-medium">{thermalResults.expansionCoeff.toExponential(2)} /°F</span></p>
                    <p className="text-sm">Heating: <span className="font-mono font-medium">{thermalResults.heatingRate.toFixed(2)} °F/hr</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Relief Flow</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Volume: <span className="font-mono font-medium">{thermalResults.volumeRate.toFixed(4)} gpm</span></p>
                    <p className="text-sm">Heat In: <span className="font-mono font-medium">{(thermalResults.totalHeatInput / 1000).toFixed(1)} kBTU/hr</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Kv: <span className="font-mono font-medium">{thermalResults.Kv.toFixed(3)}</span></p>
                    <p className="text-sm">Kc: <span className="font-mono font-medium">{thermalResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required: <span className="font-mono font-medium">{thermalResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected: <span className="font-mono font-medium">
                      {thermalResults.selectedOrifice ? `${thermalResults.selectedOrifice.designation} (${thermalResults.selectedOrifice.area} in²)` : 'Exceeds T'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Liquid Thermal Expansion Coefficients Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {Object.entries(LIQUID_EXPANSION_COEFFICIENTS).filter(([k]) => k !== 'custom').map(([key, val]) => (
                  <div 
                    key={key} 
                    className={`flex flex-col p-2 rounded ${
                      thermalInputs.liquidType === key 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    <span className="font-medium">{val.name}</span>
                    <span className="font-mono text-[10px]">α = {val.alpha.toExponential(2)}</span>
                    <span className="text-[10px]">SG = {val.specificGravity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Control Valve Failure Tab */}
        <TabsContent value="failure" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Failure Scenario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Failure Type</Label>
                  <Select
                    value={failureInputs.scenario}
                    onValueChange={(v) => setFailureInputs({ ...failureInputs, scenario: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FAILURE_SCENARIOS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
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
                        <SelectItem value="vapor">Vapor/Gas</SelectItem>
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
                  <div className="space-y-2">
                    <Label>Specific Gravity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={failureInputs.specificGravity}
                      onChange={(e) => setFailureInputs({ ...failureInputs, specificGravity: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature (°F)</Label>
                    <Input
                      type="number"
                      value={failureInputs.temperature}
                      onChange={(e) => setFailureInputs({ ...failureInputs, temperature: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                {failureInputs.fluidType === 'vapor' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vapor MW</Label>
                      <Input
                        type="number"
                        value={failureInputs.vaporMW}
                        onChange={(e) => setFailureInputs({ ...failureInputs, vaporMW: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vapor k (Cp/Cv)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={failureInputs.vaporK}
                        onChange={(e) => setFailureInputs({ ...failureInputs, vaporK: parseFloat(e.target.value) || 1.15 })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Water Hammer / Pressure Surge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pipe Velocity (ft/s)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={failureInputs.pipeVelocity}
                      onChange={(e) => setFailureInputs({ ...failureInputs, pipeVelocity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pipe Length (ft)</Label>
                    <Input
                      type="number"
                      value={failureInputs.pipeLength}
                      onChange={(e) => setFailureInputs({ ...failureInputs, pipeLength: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pipe Diameter (in)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={failureInputs.pipeDiameter}
                      onChange={(e) => setFailureInputs({ ...failureInputs, pipeDiameter: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wall Thickness (in)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={failureInputs.pipeWallThickness}
                      onChange={(e) => setFailureInputs({ ...failureInputs, pipeWallThickness: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pipe Material</Label>
                    <Select
                      value={failureInputs.pipeMaterial}
                      onValueChange={(v) => setFailureInputs({ ...failureInputs, pipeMaterial: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="steel">Carbon Steel</SelectItem>
                        <SelectItem value="stainless">Stainless Steel</SelectItem>
                        <SelectItem value="copper">Copper</SelectItem>
                        <SelectItem value="pvc">PVC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fluid Density (lb/ft³)</Label>
                    <Input
                      type="number"
                      value={failureInputs.fluidDensity}
                      onChange={(e) => setFailureInputs({ ...failureInputs, fluidDensity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {(failureInputs.scenario === 'pump_deadhead' || failureInputs.scenario === 'exchanger_tube_rupture') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {failureInputs.scenario === 'pump_deadhead' ? 'Pump Deadhead Data' : 'Tube Rupture Data'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {failureInputs.scenario === 'pump_deadhead' && (
                    <>
                      <div className="space-y-2">
                        <Label>Shutoff Head (ft)</Label>
                        <Input
                          type="number"
                          value={failureInputs.pumpShutoffHead}
                          onChange={(e) => setFailureInputs({ ...failureInputs, pumpShutoffHead: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Motor Power (hp)</Label>
                        <Input
                          type="number"
                          value={failureInputs.motorPower}
                          onChange={(e) => setFailureInputs({ ...failureInputs, motorPower: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deadhead Efficiency</Label>
                        <Input
                          type="number"
                          step="0.05"
                          max="0.5"
                          value={failureInputs.deadheadEfficiency}
                          onChange={(e) => setFailureInputs({ ...failureInputs, deadheadEfficiency: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </>
                  )}
                  {failureInputs.scenario === 'exchanger_tube_rupture' && (
                    <>
                      <div className="space-y-2">
                        <Label>Tube ID (in)</Label>
                        <Input
                          type="number"
                          step="0.125"
                          value={failureInputs.tubeID}
                          onChange={(e) => setFailureInputs({ ...failureInputs, tubeID: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label># Tubes Ruptured</Label>
                        <Input
                          type="number"
                          min="1"
                          value={failureInputs.numTubesRuptured}
                          onChange={(e) => setFailureInputs({ ...failureInputs, numTubesRuptured: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relief Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Set Pressure (psig)</Label>
                  <Input
                    type="number"
                    value={failureInputs.setPresure}
                    onChange={(e) => setFailureInputs({ ...failureInputs, setPresure: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overpressure (%)</Label>
                  <Input
                    type="number"
                    value={failureInputs.overpressure}
                    onChange={(e) => setFailureInputs({ ...failureInputs, overpressure: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Back Pressure (psia)</Label>
                  <Input
                    type="number"
                    value={failureInputs.backPressure}
                    onChange={(e) => setFailureInputs({ ...failureInputs, backPressure: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kd</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={failureInputs.dischargeCoeff}
                    onChange={(e) => setFailureInputs({ ...failureInputs, dischargeCoeff: parseFloat(e.target.value) || 0.65 })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="failureRuptureDisk"
                    checked={failureInputs.ruptureDisk}
                    onChange={(e) => setFailureInputs({ ...failureInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="failureRuptureDisk">RD (Kc=0.9)</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Failure Scenario Results
                {failureResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 521 Section 5.3 - Failure Contingencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">CV Flow at Failure</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Flow: <span className="font-mono font-medium">{failureResults.cvFlow.flowRate.toFixed(1)} {failureResults.cvFlow.flowUnit}</span></p>
                    {failureResults.cvFlow.isCritical !== undefined && (
                      <p className="text-sm">Critical: <Badge variant={failureResults.cvFlow.isCritical ? "default" : "secondary"}>
                        {failureResults.cvFlow.isCritical ? 'Yes' : 'No'}
                      </Badge></p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Water Hammer</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Surge: <span className="font-mono font-medium text-orange-500">{failureResults.waterHammer.pressureSurge.toFixed(0)} psi</span></p>
                    <p className="text-sm">Wave Speed: <span className="font-mono font-medium">{failureResults.waterHammer.waveSpeed.toFixed(0)} ft/s</span></p>
                    <p className="text-sm">Closure: <span className="font-mono font-medium">{failureResults.waterHammer.closureTime.toFixed(2)} s</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Max Pressure</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Normal: <span className="font-mono font-medium">{failureInputs.upstreamPressure} psig</span></p>
                    <p className="text-sm">With Surge: <span className="font-mono font-medium text-red-500">{failureResults.maxPressureWithSurge.toFixed(0)} psig</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Relief Flow</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Rate: <span className="font-mono font-medium">{failureResults.reliefFlowRate.toFixed(1)} {failureResults.reliefFlowUnit}</span></p>
                    <p className="text-sm">P1: <span className="font-mono font-medium">{failureResults.relievingPressure.toFixed(0)} psig</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Area: <span className="font-mono font-medium">{failureResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Orifice: <span className="font-mono font-medium">
                      {failureResults.selectedOrifice ? `${failureResults.selectedOrifice.designation}` : 'Exceeds T'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API 521 Failure Scenarios Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-xs">
                {FAILURE_SCENARIOS.map((s) => (
                  <div 
                    key={s.id} 
                    className={`p-2 rounded ${
                      failureInputs.scenario === s.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    <p className="font-medium">{s.name}</p>
                    <p className="text-[10px] opacity-80">{s.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sensitivity Analysis Tab */}
        <TabsContent value="sensitivity" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Analysis Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Analysis Type</Label>
                  <Select
                    value={sensitivityInputs.analysisType}
                    onValueChange={(v) => setSensitivityInputs({ ...sensitivityInputs, analysisType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vapor">Vapor Relief</SelectItem>
                      <SelectItem value="liquid">Liquid Relief</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Variable to Analyze</Label>
                  <Select
                    value={sensitivityInputs.variableType}
                    onValueChange={(v) => setSensitivityInputs({ ...sensitivityInputs, variableType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flow">Flow Rate</SelectItem>
                      <SelectItem value="pressure">Set Pressure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Range Min (%)</Label>
                    <Input
                      type="number"
                      value={sensitivityInputs.rangeMin}
                      onChange={(e) => setSensitivityInputs({ ...sensitivityInputs, rangeMin: parseFloat(e.target.value) || 50 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Range Max (%)</Label>
                    <Input
                      type="number"
                      value={sensitivityInputs.rangeMax}
                      onChange={(e) => setSensitivityInputs({ ...sensitivityInputs, rangeMax: parseFloat(e.target.value) || 150 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data Points</Label>
                  <Input
                    type="number"
                    min="3"
                    max="21"
                    value={sensitivityInputs.steps}
                    onChange={(e) => setSensitivityInputs({ ...sensitivityInputs, steps: Math.min(21, Math.max(3, parseInt(e.target.value) || 11)) })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Base Values</CardTitle>
                <CardDescription>
                  Using current {sensitivityInputs.analysisType === 'vapor' ? 'Vapor' : 'Liquid'} tab inputs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {sensitivityInputs.analysisType === 'vapor' ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Mass Flow</p>
                        <p className="font-mono font-medium">{vaporInputs.massFlow.toLocaleString()} lb/hr</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Set Pressure</p>
                        <p className="font-mono font-medium">{vaporInputs.setPresure} psig</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Temperature</p>
                        <p className="font-mono font-medium">{vaporInputs.temperature} °F</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Current Orifice</p>
                        <p className="font-mono font-medium">{vaporResults.selectedOrifice?.designation || 'Exceeds T'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Flow Rate</p>
                        <p className="font-mono font-medium">{liquidInputs.flowRate.toLocaleString()} gpm</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Set Pressure</p>
                        <p className="font-mono font-medium">{liquidInputs.setPresure} psig</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Specific Gravity</p>
                        <p className="font-mono font-medium">{liquidInputs.specificGravity}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Current Orifice</p>
                        <p className="font-mono font-medium">{liquidResults.selectedOrifice?.designation || 'Exceeds T'}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Required Area vs {sensitivityInputs.variableType === 'flow' ? 'Flow Rate' : 'Set Pressure'}</CardTitle>
              <CardDescription>
                Showing how orifice sizing changes across {sensitivityInputs.rangeMin}% - {sensitivityInputs.rangeMax}% of base {sensitivityInputs.variableType === 'flow' ? 'flow' : 'pressure'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sensitivityResults.dataPoints} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="variableValue" 
                      tickFormatter={(val) => val.toLocaleString()}
                      label={{ value: `${sensitivityInputs.variableType === 'flow' ? 'Flow Rate' : 'Set Pressure'} (${sensitivityResults.unit})`, position: 'bottom', offset: 0 }}
                      className="text-xs"
                    />
                    <YAxis 
                      label={{ value: 'Required Area (in²)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(val) => val.toFixed(3)}
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'requiredArea' ? `${value.toFixed(4)} in²` : value,
                        name === 'requiredArea' ? 'Required Area' : name
                      ]}
                      labelFormatter={(val) => `${sensitivityInputs.variableType === 'flow' ? 'Flow' : 'Pressure'}: ${Number(val).toLocaleString()} ${sensitivityResults.unit}`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="requiredArea" 
                      name="Required Area"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <ReferenceLine 
                      x={sensitivityResults.baseValue} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="5 5"
                      label={{ value: 'Base', position: 'top', fill: 'hsl(var(--destructive))' }}
                    />
                    {/* Show orifice area thresholds */}
                    {ORIFICE_SIZES.slice(0, 8).map((orifice) => (
                      <ReferenceLine 
                        key={orifice.designation}
                        y={orifice.area} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="2 4"
                        strokeOpacity={0.5}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sensitivity Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Sensitivity Factor</p>
                    <p className="font-mono font-medium text-lg">
                      {(sensitivityResults.sensitivity * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      % change in area per % change in {sensitivityInputs.variableType}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Area Range</p>
                    <p className="font-mono font-medium">
                      {sensitivityResults.dataPoints[0]?.requiredArea.toFixed(4)} - {sensitivityResults.dataPoints[sensitivityResults.dataPoints.length - 1]?.requiredArea.toFixed(4)} in²
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Min Orifice</p>
                    <p className="font-mono font-medium">{sensitivityResults.dataPoints[0]?.orifice}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Max Orifice</p>
                    <p className="font-mono font-medium">{sensitivityResults.dataPoints[sensitivityResults.dataPoints.length - 1]?.orifice}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Orifice Change Points</CardTitle>
                <CardDescription>Values where orifice size selection changes</CardDescription>
              </CardHeader>
              <CardContent>
                {sensitivityResults.orificeChanges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orifice changes in this range. Orifice remains constant.</p>
                ) : (
                  <div className="space-y-2">
                    {sensitivityResults.orificeChanges.map((change, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{change.from}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="default">{change.to}</Badge>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-mono">{change.atValue.toLocaleString()} {sensitivityResults.unit}</p>
                          <p className="text-xs text-muted-foreground">{change.atPercent.toFixed(0)}% of base</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detailed Results Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>% of Base</TableHead>
                      <TableHead className="text-right">{sensitivityInputs.variableType === 'flow' ? 'Flow Rate' : 'Set Pressure'}</TableHead>
                      <TableHead className="text-right">Required Area (in²)</TableHead>
                      <TableHead>Orifice</TableHead>
                      <TableHead className="text-right">Orifice Area (in²)</TableHead>
                      <TableHead className="text-right">Margin (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sensitivityResults.dataPoints.map((point, i) => {
                      const margin = point.orificeArea > 0 ? ((point.orificeArea - point.requiredArea) / point.requiredArea) * 100 : 0;
                      const isBase = Math.abs(point.variablePercent - 100) < 1;
                      return (
                        <TableRow key={i} className={isBase ? 'bg-primary/10' : ''}>
                          <TableCell className="font-mono">{point.variablePercent.toFixed(0)}%</TableCell>
                          <TableCell className="text-right font-mono">{point.variableValue.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{point.requiredArea.toFixed(4)}</TableCell>
                          <TableCell>
                            <Badge variant={point.orifice === 'Exceeds T' ? 'destructive' : 'outline'}>
                              {point.orifice}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {point.orificeArea > 0 ? point.orificeArea.toFixed(3) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {point.orificeArea > 0 ? `+${margin.toFixed(1)}%` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Scenario Comparison
              </CardTitle>
              <CardDescription>
                Compare multiple relief scenarios side-by-side. Save scenarios from other tabs to add them here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedScenarios.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Scenarios Saved</p>
                  <p className="text-sm">Go to other tabs and click "Add to Comparison" to save scenarios for comparison.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{savedScenarios.length} scenario(s) saved</p>
                    <Button variant="outline" size="sm" onClick={clearAllScenarios} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Scenario</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Required Area (in²)</TableHead>
                          <TableHead className="text-right">Orifice</TableHead>
                          <TableHead className="text-right">Relieving P (psia)</TableHead>
                          <TableHead className="text-right">Flow Rate</TableHead>
                          <TableHead>Kd</TableHead>
                          <TableHead>Kb</TableHead>
                          <TableHead>Kc</TableHead>
                          <TableHead>Kv/Kw</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {savedScenarios.map((scenario) => (
                          <TableRow key={scenario.id}>
                            <TableCell className="font-medium">
                              <div>
                                <p>{scenario.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {scenario.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getScenarioTypeLabel(scenario.type)}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {scenario.results.requiredArea.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {scenario.results.selectedOrifice?.designation || 'Exceeds T'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {scenario.results.relievingPressure.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {scenario.results.massFlow 
                                ? `${scenario.results.massFlow.toFixed(0)} lb/hr`
                                : scenario.results.flowRate 
                                  ? `${scenario.results.flowRate.toFixed(1)} ${scenario.results.flowUnit || 'gpm'}`
                                  : '-'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {scenario.results.correctionFactors.Kd?.toFixed(3) || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {scenario.results.correctionFactors.Kb?.toFixed(3) || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {scenario.results.correctionFactors.Kc?.toFixed(2) || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {scenario.results.correctionFactors.Kv?.toFixed(3) || 
                               scenario.results.correctionFactors.Kw?.toFixed(3) || '-'}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeScenario(scenario.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Governing Case Analysis */}
                  {savedScenarios.length >= 2 && (
                    <Card className="border-primary/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Governing Case Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Largest Required Area</p>
                            {(() => {
                              const max = savedScenarios.reduce((a, b) => 
                                a.results.requiredArea > b.results.requiredArea ? a : b
                              );
                              return (
                                <div>
                                  <p className="font-mono font-medium text-lg">{max.results.requiredArea.toFixed(4)} in²</p>
                                  <p className="text-sm text-primary">{max.name}</p>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Recommended Orifice</p>
                            {(() => {
                              const maxArea = Math.max(...savedScenarios.map(s => s.results.requiredArea));
                              const governingOrifice = ORIFICE_SIZES.find(o => o.area >= maxArea);
                              return (
                                <div>
                                  <p className="font-mono font-medium text-lg">
                                    {governingOrifice?.designation || 'Exceeds T'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {governingOrifice ? `${governingOrifice.area} in²` : 'Multiple valves needed'}
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Area Range</p>
                            <div>
                              <p className="font-mono font-medium">
                                {Math.min(...savedScenarios.map(s => s.results.requiredArea)).toFixed(4)} - {' '}
                                {Math.max(...savedScenarios.map(s => s.results.requiredArea)).toFixed(4)} in²
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Δ = {(Math.max(...savedScenarios.map(s => s.results.requiredArea)) - 
                                     Math.min(...savedScenarios.map(s => s.results.requiredArea))).toFixed(4)} in²
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Add from Current Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Add Current Calculations</CardTitle>
              <CardDescription>Add the current calculation from any tab to the comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Scenario Name (optional)</Label>
                  <Input
                    placeholder="Enter a name for this scenario..."
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('vapor', vaporInputs, {
                    requiredArea: vaporResults.requiredArea,
                    selectedOrifice: vaporResults.selectedOrifice,
                    relievingPressure: vaporResults.relievingPressure,
                    massFlow: vaporInputs.massFlow,
                    correctionFactors: { Kd: vaporInputs.dischargeCoeff, Kb: vaporResults.Kb, Kc: vaporResults.Kc }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Vapor
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('liquid', liquidInputs, {
                    requiredArea: liquidResults.requiredArea,
                    selectedOrifice: liquidResults.selectedOrifice,
                    relievingPressure: liquidResults.relievingPressure,
                    flowRate: liquidInputs.flowRate,
                    flowUnit: 'gpm',
                    correctionFactors: { Kd: liquidInputs.dischargeCoeff, Kw: liquidResults.Kw, Kc: liquidResults.Kc, Kv: liquidResults.Kv }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Liquid
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('twophase', twoPhaseInputs, {
                    requiredArea: twoPhaseResults.requiredArea,
                    selectedOrifice: twoPhaseResults.selectedOrifice,
                    relievingPressure: twoPhaseResults.relievingPressure,
                    massFlow: twoPhaseInputs.totalMassFlow,
                    correctionFactors: { Kd: twoPhaseInputs.dischargeCoeff, Kc: twoPhaseResults.Kc }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  2-Phase
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('steam', steamInputs, {
                    requiredArea: steamResults.requiredArea,
                    selectedOrifice: steamResults.selectedOrifice,
                    relievingPressure: steamResults.relievingPressure,
                    massFlow: steamInputs.massFlow,
                    correctionFactors: { Kd: steamInputs.dischargeCoeff, Kb: steamResults.Kb, Kc: steamResults.Kc }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Steam
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('fire', fireCaseInputs, {
                    requiredArea: fireCaseResults.requiredArea,
                    selectedOrifice: fireCaseResults.selectedOrifice,
                    relievingPressure: fireCaseResults.relievingPressure,
                    massFlow: fireCaseResults.massFlow,
                    correctionFactors: { Kd: fireCaseInputs.dischargeCoeff, Kc: fireCaseResults.Kc }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Fire
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('rupturedisk', ruptureDiskInputs, {
                    requiredArea: ruptureDiskResults.requiredArea,
                    selectedOrifice: null,
                    relievingPressure: ruptureDiskResults.relievingPressure,
                    correctionFactors: { Kd: ruptureDiskInputs.dischargeCoeff }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  RD
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('overfill', overfillInputs, {
                    requiredArea: overfillResults.requiredArea,
                    selectedOrifice: overfillResults.selectedOrifice,
                    relievingPressure: overfillResults.relievingPressure,
                    massFlow: overfillResults.massVentRate,
                    correctionFactors: { Kd: overfillInputs.dischargeCoeff, Kc: overfillResults.Kc }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Overfill
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('thermal', thermalInputs, {
                    requiredArea: thermalResults.requiredArea,
                    selectedOrifice: thermalResults.selectedOrifice,
                    relievingPressure: thermalResults.relievingPressure,
                    flowRate: thermalResults.volumeRate,
                    flowUnit: 'gpm',
                    correctionFactors: { Kd: thermalInputs.dischargeCoeff, Kc: thermalResults.Kc, Kv: thermalResults.Kv }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Thermal
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => saveScenario('failure', failureInputs, {
                    requiredArea: failureResults.requiredArea,
                    selectedOrifice: failureResults.selectedOrifice,
                    relievingPressure: failureResults.relievingPressure,
                    flowRate: failureResults.reliefFlowRate,
                    flowUnit: failureResults.reliefFlowUnit,
                    correctionFactors: { Kd: failureInputs.dischargeCoeff, Kc: failureResults.Kc }
                  })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Failure
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reference Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API 520/521/2000 Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-6 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Orifices</h4>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {ORIFICE_SIZES.slice(0, 8).map((o) => (
                  <div key={o.designation} className="flex justify-between bg-muted p-1 rounded">
                    <span className="font-mono font-medium">{o.designation}</span>
                    <span>{o.area}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Equations</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Vapor: A = W√(TZ/M) / (C·Kd·P1)</li>
                <li>• Liquid: A = Q√G / (38·Kd·√ΔP)</li>
                <li>• Fire: Q = C·F·A^0.82</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Fire Factors</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                {ENVIRONMENTAL_FACTORS.slice(0, 3).map((ef) => (
                  <li key={ef.description}>• {ef.description}: {ef.F}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">API 2000</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• &lt;1000 bbl: 1.0 CFH/bbl</li>
                <li>• &gt;1000: 0.6 CFH/bbl</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Thermal</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Q = V × α × dT/dt</li>
                <li>• Solar: ~100 BTU/hr/ft²</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Water Hammer</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• ΔP = ρ × a × ΔV</li>
                <li>• Joukowsky equation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
