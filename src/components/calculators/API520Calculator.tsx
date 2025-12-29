import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Flame, Disc, Droplets } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API 520/521 Relief Valve Sizing
            <Badge variant="outline" className="ml-2">API 520 Part I & II</Badge>
          </CardTitle>
          <CardDescription>
            Pressure relief device sizing for vapor, liquid, two-phase, steam, fire case, rupture disk, and overfill protection per API 520/521/2000
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="vapor" className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="vapor">Vapor</TabsTrigger>
          <TabsTrigger value="liquid">Liquid</TabsTrigger>
          <TabsTrigger value="twophase">Two-Phase</TabsTrigger>
          <TabsTrigger value="steam">Steam</TabsTrigger>
          <TabsTrigger value="firecase" className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            Fire
          </TabsTrigger>
          <TabsTrigger value="rupturedisk" className="flex items-center gap-1">
            <Disc className="h-3 w-3" />
            RD
          </TabsTrigger>
          <TabsTrigger value="overfill" className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            Overfill
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
              <CardTitle className="text-lg flex items-center gap-2">
                Vapor Relief Sizing Results
                {vaporResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 520 Part I, Eq. 3.1</CardDescription>
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
              <CardTitle className="text-lg flex items-center gap-2">
                Liquid Relief Sizing Results
                {liquidResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 520 Part I, Eq. 3.5</CardDescription>
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
              <CardTitle className="text-lg flex items-center gap-2">
                Two-Phase Relief Sizing Results (Omega Method)
                {twoPhaseResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 520 Appendix D - Omega Parameter Method</CardDescription>
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
      </Tabs>

      {/* Reference Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API 520/521/2000 Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Standard Orifice Designations</h4>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {ORIFICE_SIZES.map((o) => (
                  <div key={o.designation} className="flex justify-between bg-muted p-1 rounded">
                    <span className="font-mono font-medium">{o.designation}</span>
                    <span>{o.area}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Key Equations</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• <strong>Vapor:</strong> A = W√(TZ/M) / (C·Kd·P1·Kb·Kc)</li>
                <li>• <strong>Liquid:</strong> A = Q√G / (38·Kd·Kw·Kc·Kv·√ΔP)</li>
                <li>• <strong>Steam:</strong> A = W / (51.5·P1·Kd·Kb·Kc·Kn·Ksh)</li>
                <li>• <strong>Fire:</strong> Q = C·F·A^0.82 per API 521</li>
                <li>• <strong>RD:</strong> Knet = Kd / √(1+Kr)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Environmental Factors</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                {ENVIRONMENTAL_FACTORS.slice(0, 4).map((ef) => (
                  <li key={ef.description}>• {ef.description}: F = {ef.F}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">API 2000 Thermal Breathing</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• First 1000 bbl: 1.0 CFH/bbl</li>
                <li>• Above 1000 bbl: 0.6 CFH/bbl</li>
                <li>• Outbreathing: 60% of inbreathing</li>
                <li>• Pump in/out: 1:1 displacement</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
