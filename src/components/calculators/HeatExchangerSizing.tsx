import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer, ArrowRight, Info, BookOpen, Settings, Gauge } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CalculationMode = "design" | "rating";
type FlowArrangement = "counter" | "parallel" | "shell-tube-1-2" | "shell-tube-1-4" | "crossflow-unmixed" | "crossflow-mixed";
type TemperatureUnit = "C" | "F" | "K";

interface FluidInputs {
  inletTemp: string;
  outletTemp: string;
  flowRate: string;
  specificHeat: string;
  density: string;
  viscosity: string;
}

interface TubeGeometry {
  outerDiameter: string; // mm
  wallThickness: string; // mm
  tubeLength: string; // m
  numberOfTubes: string;
  tubePitch: string; // mm
  baffleSpacing: string; // mm
  baffleCut: string; // % of shell diameter
  shellDiameter: string; // mm
  tubePasses: string;
  tubePattern: "triangular" | "square" | "rotatedSquare";
}

// U value reference data per TEMA and GPSA standards
const uValueReference = [
  { hotSide: "Water", coldSide: "Water", uMin: 850, uMax: 1700, notes: "Clean service" },
  { hotSide: "Steam", coldSide: "Water", uMin: 1000, uMax: 3500, notes: "Condensing steam" },
  { hotSide: "Light Hydrocarbon", coldSide: "Water", uMin: 350, uMax: 700, notes: "Low viscosity" },
  { hotSide: "Heavy Hydrocarbon", coldSide: "Water", uMin: 60, uMax: 300, notes: "High viscosity" },
  { hotSide: "Crude Oil", coldSide: "Water", uMin: 60, uMax: 200, notes: "Typical refinery" },
  { hotSide: "Gas (Low P)", coldSide: "Water", uMin: 25, uMax: 60, notes: "< 2 bar" },
  { hotSide: "Gas (High P)", coldSide: "Water", uMin: 150, uMax: 500, notes: "> 20 bar" },
  { hotSide: "Light HC", coldSide: "Light HC", uMin: 200, uMax: 400, notes: "Liquid-liquid" },
  { hotSide: "Heavy HC", coldSide: "Heavy HC", uMin: 50, uMax: 150, notes: "High viscosity" },
  { hotSide: "Steam", coldSide: "Light HC", uMin: 300, uMax: 900, notes: "Reboiler service" },
  { hotSide: "Steam", coldSide: "Heavy HC", uMin: 60, uMax: 200, notes: "Viscous heating" },
  { hotSide: "Gas", coldSide: "Gas", uMin: 10, uMax: 50, notes: "Low pressure" },
  { hotSide: "Condensing HC", coldSide: "Water", uMin: 400, uMax: 900, notes: "Light condensate" },
  { hotSide: "Air", coldSide: "Water", uMin: 25, uMax: 50, notes: "Finned tubes recommended" },
];

// Fouling factors per TEMA RGP-T-2.4 (m²·K/W)
const foulingReference = [
  { service: "Distilled water", factor: 0.00009 },
  { service: "Treated cooling water", factor: 0.00018 },
  { service: "River water", factor: 0.00035 },
  { service: "Sea water", factor: 0.00018 },
  { service: "Light hydrocarbons (clean)", factor: 0.00018 },
  { service: "Heavy hydrocarbons", factor: 0.00053 },
  { service: "Crude oil (< 200°C)", factor: 0.00035 },
  { service: "Crude oil (> 200°C)", factor: 0.00088 },
  { service: "Natural gas", factor: 0.00018 },
  { service: "Steam (clean)", factor: 0.00009 },
  { service: "Refrigerants", factor: 0.00018 },
];

const HeatExchangerSizing = () => {
  const [calculationMode, setCalculationMode] = useState<CalculationMode>("design");
  const [flowArrangement, setFlowArrangement] = useState<FlowArrangement>("shell-tube-1-2");
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>("C");
  
  // Hot fluid inputs
  const [hotFluid, setHotFluid] = useState<FluidInputs>({
    inletTemp: "150",
    outletTemp: "90",
    flowRate: "50000",
    specificHeat: "2.1",
    density: "750",
    viscosity: "0.5"
  });
  
  // Cold fluid inputs
  const [coldFluid, setColdFluid] = useState<FluidInputs>({
    inletTemp: "25",
    outletTemp: "70",
    flowRate: "80000",
    specificHeat: "4.18",
    density: "995",
    viscosity: "0.8"
  });
  
  // Heat transfer coefficient (for design mode)
  const [overallU, setOverallU] = useState("350");
  
  // Area (for rating mode)
  const [area, setArea] = useState("50");
  
  // Fouling factors
  const [hotFouling, setHotFouling] = useState("0.00035");
  const [coldFouling, setColdFouling] = useState("0.00018");

  // Tube geometry
  const [tubeGeometry, setTubeGeometry] = useState<TubeGeometry>({
    outerDiameter: "19.05", // 3/4 inch
    wallThickness: "2.11", // 14 BWG
    tubeLength: "6.0",
    numberOfTubes: "200",
    tubePitch: "25.4", // 1 inch
    baffleSpacing: "300",
    baffleCut: "25",
    shellDiameter: "600",
    tubePasses: "2",
    tubePattern: "triangular"
  });
  
  // Results
  const [results, setResults] = useState<{
    heatDuty: number;
    lmtd: number;
    correctionFactor: number;
    effectiveLmtd: number;
    requiredArea: number;
    ntu: number;
    effectiveness: number;
    capacityRatio: number;
    hotOutletCalc?: number;
    coldOutletCalc?: number;
    // Pressure drop results
    tubeSidePressureDrop: number;
    shellSidePressureDrop: number;
    tubeSideVelocity: number;
    shellSideVelocity: number;
    tubeReynolds: number;
    shellReynolds: number;
    // Geometry results
    heatTransferArea: number;
    tubeInnerDiameter: number;
    flowAreaPerPass: number;
    crossFlowArea: number;
    // Fouled U
    cleanU: number;
    fouledU: number;
  } | null>(null);

  // Temperature conversion functions
  const toKelvin = (temp: number, unit: TemperatureUnit): number => {
    switch (unit) {
      case "C": return temp + 273.15;
      case "F": return (temp - 32) * 5/9 + 273.15;
      case "K": return temp;
    }
  };

  const fromKelvin = (tempK: number, unit: TemperatureUnit): number => {
    switch (unit) {
      case "C": return tempK - 273.15;
      case "F": return (tempK - 273.15) * 9/5 + 32;
      case "K": return tempK;
    }
  };

  /**
   * LMTD Correction Factor (F) for Shell & Tube Heat Exchangers
   * Per TEMA Standards and Kern's Process Heat Transfer
   * 
   * For 1-2 and 1-4 shell & tube exchangers:
   * F = (√(R² + 1) × ln[(1-P)/(1-PR)]) / ((R-1) × ln[(2-P(R+1-√(R²+1)))/(2-P(R+1+√(R²+1)))])
   * 
   * Where:
   * R = (T₁ - T₂)/(t₂ - t₁) = Shell side temperature range / Tube side temperature range
   * P = (t₂ - t₁)/(T₁ - t₁) = Tube side temperature efficiency
   */
  const calculateCorrectionFactor = (
    R: number, 
    P: number, 
    arrangement: FlowArrangement
  ): number => {
    if (arrangement === "counter" || arrangement === "parallel") {
      return 1.0;
    }
    
    if (P <= 0 || P >= 1 || R <= 0) return 0.9;
    
    // For shell & tube 1-2 and crossflow configurations
    if (Math.abs(R - 1) < 0.001) {
      // Special case when R ≈ 1 (per Kern's method)
      const F = (P * Math.sqrt(2)) / ((1 - P) * Math.log((2 - P * (2 - Math.sqrt(2))) / (2 - P * (2 + Math.sqrt(2)))));
      return Math.min(1, Math.max(0.5, isNaN(F) || !isFinite(F) ? 0.9 : F));
    }
    
    const sqrtTerm = Math.sqrt(R * R + 1);
    const numerator = sqrtTerm * Math.log((1 - P) / (1 - P * R));
    const term1 = (2 - P * (R + 1 - sqrtTerm)) / (2 - P * (R + 1 + sqrtTerm));
    const denominator = (R - 1) * Math.log(term1);
    
    const F = numerator / denominator;
    return Math.min(1, Math.max(0.5, isNaN(F) || !isFinite(F) ? 0.9 : F));
  };

  /**
   * NTU-Effectiveness Method (per Kays and London)
   * Counter flow: ε = (1 - exp(-NTU(1-Cr))) / (1 - Cr×exp(-NTU(1-Cr)))
   */
  const calculateEffectivenessCounter = (ntu: number, Cr: number): number => {
    if (Cr === 0) return 1 - Math.exp(-ntu);
    if (Math.abs(Cr - 1) < 0.001) return ntu / (1 + ntu);
    return (1 - Math.exp(-ntu * (1 - Cr))) / (1 - Cr * Math.exp(-ntu * (1 - Cr)));
  };

  /**
   * Parallel flow: ε = (1 - exp(-NTU(1+Cr))) / (1 + Cr)
   */
  const calculateEffectivenessParallel = (ntu: number, Cr: number): number => {
    if (Cr === 0) return 1 - Math.exp(-ntu);
    return (1 - Math.exp(-ntu * (1 + Cr))) / (1 + Cr);
  };

  /**
   * Tube-side pressure drop per Kern's Method (GPSA Engineering Data Book)
   * ΔP_tube = (4f × L × N_p × ρ × v²) / (2 × d_i) + (4 × N_p × ρ × v²) / 2
   * 
   * Where:
   * f = Fanning friction factor (from Moody chart or correlations)
   * L = Tube length (m)
   * N_p = Number of tube passes
   * ρ = Fluid density (kg/m³)
   * v = Tube-side velocity (m/s)
   * d_i = Tube inner diameter (m)
   */
  const calculateTubeSidePressureDrop = (
    velocity: number,
    density: number,
    viscosity: number,
    innerDiameter: number,
    tubeLength: number,
    tubePasses: number
  ): { pressureDrop: number; reynolds: number } => {
    if (velocity <= 0 || innerDiameter <= 0) return { pressureDrop: 0, reynolds: 0 };
    
    // Reynolds number: Re = ρ × v × d / μ
    const reynolds = (density * velocity * innerDiameter) / (viscosity / 1000); // viscosity in cP to Pa.s
    
    // Friction factor (Blasius correlation for turbulent flow)
    // f = 0.079 × Re^(-0.25) for 4000 < Re < 10^5
    // f = 16/Re for laminar flow (Re < 2300)
    let frictionFactor: number;
    if (reynolds < 2300) {
      frictionFactor = 16 / reynolds;
    } else if (reynolds < 100000) {
      frictionFactor = 0.079 * Math.pow(reynolds, -0.25);
    } else {
      // Karman-Nikuradse for smooth tubes
      frictionFactor = 0.046 * Math.pow(reynolds, -0.2);
    }
    
    // Straight tube pressure drop
    const straightDrop = (4 * frictionFactor * tubeLength * tubePasses * density * velocity * velocity) / (2 * innerDiameter);
    
    // Return loss (4 velocity heads per pass)
    const returnLoss = (4 * tubePasses * density * velocity * velocity) / 2;
    
    // Total in Pa, convert to kPa
    const totalPressureDrop = (straightDrop + returnLoss) / 1000;
    
    return { pressureDrop: totalPressureDrop, reynolds };
  };

  /**
   * Shell-side pressure drop per Kern's Method
   * ΔP_shell = (f × G_s² × D_s × (N_b + 1)) / (2 × ρ × D_e × φ_s)
   * 
   * Where:
   * f = Shell-side friction factor
   * G_s = Shell-side mass velocity (kg/m²·s)
   * D_s = Shell diameter (m)
   * N_b = Number of baffles
   * D_e = Equivalent diameter (m)
   * φ_s = Viscosity correction factor
   */
  const calculateShellSidePressureDrop = (
    massFlowRate: number, // kg/s
    density: number,
    viscosity: number,
    shellDiameter: number, // m
    baffleSpacing: number, // m
    tubeOuterDiameter: number, // m
    tubePitch: number, // m
    tubeLength: number, // m
    tubePattern: string
  ): { pressureDrop: number; velocity: number; reynolds: number; crossFlowArea: number } => {
    if (massFlowRate <= 0 || shellDiameter <= 0) {
      return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0 };
    }
    
    // Cross-flow area: A_s = D_s × B × C' / P_t
    // C' = P_t - d_o (clearance between tubes)
    const clearance = tubePitch - tubeOuterDiameter;
    const crossFlowArea = (shellDiameter * baffleSpacing * clearance) / tubePitch;
    
    if (crossFlowArea <= 0) {
      return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0 };
    }
    
    // Shell-side mass velocity
    const Gs = massFlowRate / crossFlowArea;
    
    // Shell-side velocity
    const velocity = Gs / density;
    
    // Equivalent diameter (hydraulic diameter for shell side)
    // For triangular pitch: D_e = 4 × (P_t² × √3/4 - π × d_o²/8) / (π × d_o/2)
    // For square pitch: D_e = 4 × (P_t² - π × d_o²/4) / (π × d_o)
    let De: number;
    if (tubePattern === "triangular") {
      De = (4 * ((tubePitch * tubePitch * Math.sqrt(3) / 4) - (Math.PI * tubeOuterDiameter * tubeOuterDiameter / 8))) / 
           (Math.PI * tubeOuterDiameter / 2);
    } else {
      De = (4 * (tubePitch * tubePitch - Math.PI * tubeOuterDiameter * tubeOuterDiameter / 4)) / 
           (Math.PI * tubeOuterDiameter);
    }
    
    // Reynolds number
    const reynolds = (De * Gs) / (viscosity / 1000);
    
    // Friction factor (Kern's correlation)
    // f = exp(0.576 - 0.19 × ln(Re)) for Re > 500
    let frictionFactor: number;
    if (reynolds > 500) {
      frictionFactor = Math.exp(0.576 - 0.19 * Math.log(reynolds));
    } else {
      frictionFactor = 1.0;
    }
    
    // Number of baffles
    const numberOfBaffles = Math.floor(tubeLength / baffleSpacing) - 1;
    
    // Shell-side pressure drop
    const pressureDrop = (frictionFactor * Gs * Gs * shellDiameter * (numberOfBaffles + 1)) / 
                         (2 * density * De * 1000); // Convert to kPa
    
    return { pressureDrop: Math.max(0, pressureDrop), velocity, reynolds, crossFlowArea };
  };

  useEffect(() => {
    const Thi = parseFloat(hotFluid.inletTemp);
    const Tho = parseFloat(hotFluid.outletTemp);
    const Tci = parseFloat(coldFluid.inletTemp);
    const Tco = parseFloat(coldFluid.outletTemp);
    const mh = parseFloat(hotFluid.flowRate); // kg/hr
    const mc = parseFloat(coldFluid.flowRate); // kg/hr
    const Cph = parseFloat(hotFluid.specificHeat); // kJ/kg·K
    const Cpc = parseFloat(coldFluid.specificHeat); // kJ/kg·K
    const rhoHot = parseFloat(hotFluid.density); // kg/m³
    const rhoCold = parseFloat(coldFluid.density); // kg/m³
    const muHot = parseFloat(hotFluid.viscosity); // cP
    const muCold = parseFloat(coldFluid.viscosity); // cP
    const U = parseFloat(overallU); // W/m²·K
    const A = parseFloat(area); // m²
    const Rfo = parseFloat(hotFouling); // m²·K/W
    const Rfi = parseFloat(coldFouling); // m²·K/W

    // Tube geometry
    const Do = parseFloat(tubeGeometry.outerDiameter) / 1000; // Convert mm to m
    const wallThickness = parseFloat(tubeGeometry.wallThickness) / 1000;
    const Di = Do - 2 * wallThickness;
    const tubeLength = parseFloat(tubeGeometry.tubeLength);
    const numberOfTubes = parseInt(tubeGeometry.numberOfTubes);
    const tubePasses = parseInt(tubeGeometry.tubePasses);
    const tubePitch = parseFloat(tubeGeometry.tubePitch) / 1000;
    const baffleSpacing = parseFloat(tubeGeometry.baffleSpacing) / 1000;
    const shellDiameter = parseFloat(tubeGeometry.shellDiameter) / 1000;

    if ([Thi, Tho, Tci, Tco, mh, mc, Cph, Cpc, rhoHot, rhoCold, muHot, muCold].some(isNaN)) {
      setResults(null);
      return;
    }

    // Convert temperatures to Kelvin for calculations
    const ThiK = toKelvin(Thi, tempUnit);
    const ThoK = toKelvin(Tho, tempUnit);
    const TciK = toKelvin(Tci, tempUnit);
    const TcoK = toKelvin(Tco, tempUnit);

    // Heat capacity rates (kW/K)
    const Ch = (mh / 3600) * Cph; // Convert kg/hr to kg/s
    const Cc = (mc / 3600) * Cpc;
    
    const Cmin = Math.min(Ch, Cc);
    const Cmax = Math.max(Ch, Cc);
    const Cr = Cmin / Cmax; // Capacity ratio

    // Heat duty from hot side (kW)
    // Q = ṁ × Cp × ΔT
    const Qh = Ch * (ThiK - ThoK);
    
    // LMTD calculation per TEMA Standards
    // LMTD = (ΔT₁ - ΔT₂) / ln(ΔT₁/ΔT₂)
    let deltaT1: number, deltaT2: number;
    
    if (flowArrangement === "parallel") {
      deltaT1 = ThiK - TciK;
      deltaT2 = ThoK - TcoK;
    } else {
      // Counter flow (and as base for correction factor)
      deltaT1 = ThiK - TcoK;
      deltaT2 = ThoK - TciK;
    }

    if (deltaT1 <= 0 || deltaT2 <= 0) {
      setResults(null);
      return;
    }

    let lmtd: number;
    if (Math.abs(deltaT1 - deltaT2) < 0.001) {
      lmtd = deltaT1;
    } else {
      lmtd = (deltaT1 - deltaT2) / Math.log(deltaT1 / deltaT2);
    }

    // Calculate P and R for correction factor (TEMA notation)
    // P = (t₂ - t₁)/(T₁ - t₁) - Tube side thermal effectiveness
    // R = (T₁ - T₂)/(t₂ - t₁) - Ratio of heat capacity rates
    const P = (TcoK - TciK) / (ThiK - TciK);
    const R = (ThiK - ThoK) / (TcoK - TciK);

    // LMTD Correction factor (F)
    const F = calculateCorrectionFactor(R, P, flowArrangement);
    const effectiveLmtd = lmtd * F;

    // Calculate heat transfer area from tube geometry
    // A = N × π × Do × L (outside area)
    const heatTransferArea = numberOfTubes * Math.PI * Do * tubeLength;

    // Flow area per pass
    const flowAreaPerPass = (numberOfTubes / tubePasses) * (Math.PI * Di * Di / 4);

    // Tube-side velocity (cold fluid typically in tubes)
    const tubeSideVelocity = (mc / 3600) / (rhoCold * flowAreaPerPass);

    // Tube-side pressure drop
    const tubeSideCalc = calculateTubeSidePressureDrop(
      tubeSideVelocity, rhoCold, muCold, Di, tubeLength, tubePasses
    );

    // Shell-side pressure drop (hot fluid in shell)
    const shellSideCalc = calculateShellSidePressureDrop(
      mh / 3600, rhoHot, muHot, shellDiameter, baffleSpacing, Do, tubePitch, tubeLength, tubeGeometry.tubePattern
    );

    // Clean and fouled U calculation
    // 1/U_fouled = 1/U_clean + Rfo + Rfi
    const cleanU = U;
    const fouledU = 1 / (1/U + Rfo + Rfi);

    // NTU and effectiveness
    let ntu: number;
    let effectiveness: number;
    
    if (calculationMode === "design" && !isNaN(U)) {
      // Design mode: calculate required area
      // Q = U × A × LMTD × F (per TEMA)
      const requiredArea = (Qh * 1000) / (fouledU * effectiveLmtd);
      ntu = (fouledU * requiredArea) / (Cmin * 1000);
      
      if (flowArrangement === "parallel") {
        effectiveness = calculateEffectivenessParallel(ntu, Cr);
      } else {
        effectiveness = calculateEffectivenessCounter(ntu, Cr);
      }

      setResults({
        heatDuty: Qh,
        lmtd,
        correctionFactor: F,
        effectiveLmtd,
        requiredArea,
        ntu,
        effectiveness,
        capacityRatio: Cr,
        tubeSidePressureDrop: tubeSideCalc.pressureDrop,
        shellSidePressureDrop: shellSideCalc.pressureDrop,
        tubeSideVelocity,
        shellSideVelocity: shellSideCalc.velocity,
        tubeReynolds: tubeSideCalc.reynolds,
        shellReynolds: shellSideCalc.reynolds,
        heatTransferArea,
        tubeInnerDiameter: Di * 1000,
        flowAreaPerPass,
        crossFlowArea: shellSideCalc.crossFlowArea,
        cleanU,
        fouledU
      });
    } else if (calculationMode === "rating" && !isNaN(A) && !isNaN(U)) {
      // Rating mode: calculate outlet temperatures using ε-NTU
      ntu = (fouledU * A) / (Cmin * 1000);
      
      if (flowArrangement === "parallel") {
        effectiveness = calculateEffectivenessParallel(ntu, Cr);
      } else {
        effectiveness = calculateEffectivenessCounter(ntu, Cr);
      }

      // Maximum possible heat transfer
      const Qmax = Cmin * (ThiK - TciK);
      const Qactual = effectiveness * Qmax;

      // Calculate outlet temperatures
      const ThoCalcK = ThiK - Qactual / Ch;
      const TcoCalcK = TciK + Qactual / Cc;

      setResults({
        heatDuty: Qactual,
        lmtd,
        correctionFactor: F,
        effectiveLmtd,
        requiredArea: A,
        ntu,
        effectiveness,
        capacityRatio: Cr,
        hotOutletCalc: fromKelvin(ThoCalcK, tempUnit),
        coldOutletCalc: fromKelvin(TcoCalcK, tempUnit),
        tubeSidePressureDrop: tubeSideCalc.pressureDrop,
        shellSidePressureDrop: shellSideCalc.pressureDrop,
        tubeSideVelocity,
        shellSideVelocity: shellSideCalc.velocity,
        tubeReynolds: tubeSideCalc.reynolds,
        shellReynolds: shellSideCalc.reynolds,
        heatTransferArea,
        tubeInnerDiameter: Di * 1000,
        flowAreaPerPass,
        crossFlowArea: shellSideCalc.crossFlowArea,
        cleanU,
        fouledU
      });
    }
  }, [hotFluid, coldFluid, overallU, area, flowArrangement, calculationMode, tempUnit, hotFouling, coldFouling, tubeGeometry]);

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (isNaN(num) || !isFinite(num)) return "—";
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const getTempUnitLabel = () => {
    switch (tempUnit) {
      case "C": return "°C";
      case "F": return "°F";
      case "K": return "K";
    }
  };

  const FluidInputCard = ({
    title,
    fluid,
    setFluid,
    colorClass
  }: {
    title: string;
    fluid: FluidInputs;
    setFluid: (f: FluidInputs) => void;
    colorClass: string;
  }) => (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${colorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Inlet Temp ({getTempUnitLabel()})</Label>
            <Input
              type="number"
              value={fluid.inletTemp}
              onChange={(e) => setFluid({ ...fluid, inletTemp: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Outlet Temp ({getTempUnitLabel()})
              {calculationMode === "rating" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 inline ml-1 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Used as initial guess; actual value calculated</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Input
              type="number"
              value={fluid.outletTemp}
              onChange={(e) => setFluid({ ...fluid, outletTemp: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Flow Rate (kg/hr)</Label>
            <Input
              type="number"
              value={fluid.flowRate}
              onChange={(e) => setFluid({ ...fluid, flowRate: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cp (kJ/kg·K)</Label>
            <Input
              type="number"
              step="0.01"
              value={fluid.specificHeat}
              onChange={(e) => setFluid({ ...fluid, specificHeat: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Density (kg/m³)</Label>
            <Input
              type="number"
              value={fluid.density}
              onChange={(e) => setFluid({ ...fluid, density: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Viscosity (cP)</Label>
            <Input
              type="number"
              step="0.01"
              value={fluid.viscosity}
              onChange={(e) => setFluid({ ...fluid, viscosity: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Mode and Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 space-y-3">
            <Label className="text-xs text-muted-foreground">Calculation Mode</Label>
            <Tabs value={calculationMode} onValueChange={(v) => setCalculationMode(v as CalculationMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="design" className="text-xs">Design</TabsTrigger>
                <TabsTrigger value="rating" className="text-xs">Rating</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {calculationMode === "design" 
                ? "Calculate required heat transfer area"
                : "Calculate performance for given area"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 space-y-3">
            <Label className="text-xs text-muted-foreground">Flow Arrangement</Label>
            <Select value={flowArrangement} onValueChange={(v) => setFlowArrangement(v as FlowArrangement)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="counter">Counter Flow</SelectItem>
                <SelectItem value="parallel">Parallel Flow</SelectItem>
                <SelectItem value="shell-tube-1-2">Shell & Tube (1-2)</SelectItem>
                <SelectItem value="shell-tube-1-4">Shell & Tube (1-4)</SelectItem>
                <SelectItem value="crossflow-unmixed">Crossflow (Unmixed)</SelectItem>
                <SelectItem value="crossflow-mixed">Crossflow (Mixed)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 space-y-3">
            <Label className="text-xs text-muted-foreground">Temperature Unit</Label>
            <Select value={tempUnit} onValueChange={(v) => setTempUnit(v as TemperatureUnit)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">Celsius (°C)</SelectItem>
                <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                <SelectItem value="K">Kelvin (K)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Fluid Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FluidInputCard
          title="Hot Fluid (Shell Side)"
          fluid={hotFluid}
          setFluid={setHotFluid}
          colorClass="bg-red-500"
        />
        <FluidInputCard
          title="Cold Fluid (Tube Side)"
          fluid={coldFluid}
          setFluid={setColdFluid}
          colorClass="bg-blue-500"
        />
      </div>

      {/* Heat Transfer Parameters */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-primary" />
            Heat Transfer Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Overall U (W/m²·K)</Label>
              <Input
                type="number"
                value={overallU}
                onChange={(e) => setOverallU(e.target.value)}
                className="h-9"
              />
            </div>
            {calculationMode === "rating" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Area (m²)</Label>
                <Input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hot Fouling (m²·K/W)</Label>
              <Input
                type="number"
                step="0.0001"
                value={hotFouling}
                onChange={(e) => setHotFouling(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cold Fouling (m²·K/W)</Label>
              <Input
                type="number"
                step="0.0001"
                value={coldFouling}
                onChange={(e) => setColdFouling(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tube Geometry */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Tube Geometry (TEMA Standards)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube OD (mm)</Label>
              <Input
                type="number"
                step="0.01"
                value={tubeGeometry.outerDiameter}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, outerDiameter: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Wall Thickness (mm)</Label>
              <Input
                type="number"
                step="0.01"
                value={tubeGeometry.wallThickness}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, wallThickness: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube Length (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={tubeGeometry.tubeLength}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, tubeLength: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Number of Tubes</Label>
              <Input
                type="number"
                value={tubeGeometry.numberOfTubes}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, numberOfTubes: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube Pitch (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={tubeGeometry.tubePitch}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, tubePitch: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube Passes</Label>
              <Select value={tubeGeometry.tubePasses} onValueChange={(v) => setTubeGeometry({ ...tubeGeometry, tubePasses: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube Pattern</Label>
              <Select value={tubeGeometry.tubePattern} onValueChange={(v: "triangular" | "square" | "rotatedSquare") => setTubeGeometry({ ...tubeGeometry, tubePattern: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="triangular">Triangular (30°)</SelectItem>
                  <SelectItem value="square">Square (90°)</SelectItem>
                  <SelectItem value="rotatedSquare">Rotated Square (45°)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Shell ID (mm)</Label>
              <Input
                type="number"
                value={tubeGeometry.shellDiameter}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, shellDiameter: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Baffle Spacing (mm)</Label>
              <Input
                type="number"
                value={tubeGeometry.baffleSpacing}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, baffleSpacing: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Baffle Cut (%)</Label>
              <Input
                type="number"
                value={tubeGeometry.baffleCut}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, baffleCut: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Results
              <Badge variant="outline" className="ml-auto text-xs font-normal">
                {calculationMode === "design" ? "Design Mode" : "Rating Mode"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Heat Duty</p>
                <p className="text-lg font-semibold text-primary">
                  {formatNumber(results.heatDuty)} <span className="text-sm font-normal">kW</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">LMTD</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.lmtd)} <span className="text-sm font-normal">{getTempUnitLabel()}</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Correction Factor (F)</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.correctionFactor, 3)}
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Effective LMTD</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.effectiveLmtd)} <span className="text-sm font-normal">{getTempUnitLabel()}</span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Secondary Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">
                  {calculationMode === "design" ? "Required Area" : "Given Area"}
                </p>
                <p className="text-lg font-semibold text-primary">
                  {formatNumber(results.requiredArea)} <span className="text-sm font-normal">m²</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">NTU</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.ntu, 3)}
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Effectiveness (ε)</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.effectiveness * 100, 1)} <span className="text-sm font-normal">%</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Capacity Ratio (Cr)</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.capacityRatio, 3)}
                </p>
              </div>
            </div>

            <Separator />

            {/* U Values */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Clean U</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.cleanU)} <span className="text-sm font-normal">W/m²·K</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Fouled U</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.fouledU)} <span className="text-sm font-normal">W/m²·K</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Tube ID</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.tubeInnerDiameter, 2)} <span className="text-sm font-normal">mm</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Calculated Area</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.heatTransferArea)} <span className="text-sm font-normal">m²</span>
                </p>
              </div>
            </div>

            {/* Pressure Drop Results */}
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Pressure Drop (Kern's Method)</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground">Tube Side ΔP</p>
                  <p className="text-lg font-semibold text-blue-400">
                    {formatNumber(results.tubeSidePressureDrop)} <span className="text-sm font-normal">kPa</span>
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-muted-foreground">Shell Side ΔP</p>
                  <p className="text-lg font-semibold text-red-400">
                    {formatNumber(results.shellSidePressureDrop)} <span className="text-sm font-normal">kPa</span>
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground">Tube Velocity</p>
                  <p className="text-lg font-semibold text-blue-400">
                    {formatNumber(results.tubeSideVelocity)} <span className="text-sm font-normal">m/s</span>
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-muted-foreground">Shell Velocity</p>
                  <p className="text-lg font-semibold text-red-400">
                    {formatNumber(results.shellSideVelocity)} <span className="text-sm font-normal">m/s</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Tube Reynolds (Re)</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.tubeReynolds, 0)}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Shell Reynolds (Re)</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.shellReynolds, 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating mode outlet temperatures */}
            {calculationMode === "rating" && results.hotOutletCalc !== undefined && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-muted-foreground">Calculated Hot Outlet</p>
                    <p className="text-lg font-semibold text-red-400">
                      {formatNumber(results.hotOutletCalc)} <span className="text-sm font-normal">{getTempUnitLabel()}</span>
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">Calculated Cold Outlet</p>
                    <p className="text-lg font-semibold text-blue-400">
                      {formatNumber(results.coldOutletCalc!)} <span className="text-sm font-normal">{getTempUnitLabel()}</span>
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Temperature Profile Visualization */}
            <Separator />
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-3">Temperature Profile</p>
              <div className="flex items-center justify-between gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Hot In</p>
                  <p className="text-sm font-semibold text-red-400">{hotFluid.inletTemp}{getTempUnitLabel()}</p>
                </div>
                <div className="flex-1 h-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-300 rounded opacity-60" />
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-red-200" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Hot Out</p>
                  <p className="text-sm font-semibold text-red-300">
                    {calculationMode === "rating" && results.hotOutletCalc 
                      ? formatNumber(results.hotOutletCalc, 1)
                      : hotFluid.outletTemp}{getTempUnitLabel()}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 mt-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Cold In</p>
                  <p className="text-sm font-semibold text-blue-400">{coldFluid.inletTemp}{getTempUnitLabel()}</p>
                </div>
                <div className="flex-1 h-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded opacity-60" />
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Cold Out</p>
                  <p className="text-sm font-semibold text-blue-300">
                    {calculationMode === "rating" && results.coldOutletCalc 
                      ? formatNumber(results.coldOutletCalc, 1)
                      : coldFluid.outletTemp}{getTempUnitLabel()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reference Tables */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="u-values" className="border-border/50">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Overall U Value Reference (TEMA/GPSA)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Hot Side</TableHead>
                    <TableHead className="text-xs">Cold Side</TableHead>
                    <TableHead className="text-xs">U Min (W/m²·K)</TableHead>
                    <TableHead className="text-xs">U Max (W/m²·K)</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uValueReference.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{row.hotSide}</TableCell>
                      <TableCell className="text-xs">{row.coldSide}</TableCell>
                      <TableCell className="text-xs">{row.uMin}</TableCell>
                      <TableCell className="text-xs">{row.uMax}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fouling" className="border-border/50">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Fouling Factors Reference (TEMA RGP-T-2.4)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Service</TableHead>
                    <TableHead className="text-xs">Fouling Factor (m²·K/W)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {foulingReference.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{row.service}</TableCell>
                      <TableCell className="text-xs font-mono">{row.factor.toFixed(5)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="equations" className="border-border/50">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Equations Reference
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Heat Duty (TEMA)</p>
                <p className="font-mono text-muted-foreground">Q = ṁ × Cp × ΔT</p>
                <p className="text-muted-foreground mt-1">Where: ṁ = mass flow rate, Cp = specific heat, ΔT = temperature difference</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">LMTD (Log Mean Temperature Difference)</p>
                <p className="font-mono text-muted-foreground">LMTD = (ΔT₁ - ΔT₂) / ln(ΔT₁/ΔT₂)</p>
                <p className="text-muted-foreground mt-1">Counter flow: ΔT₁ = Th,in - Tc,out, ΔT₂ = Th,out - Tc,in</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">LMTD Correction Factor F (Kern's Method)</p>
                <p className="font-mono text-muted-foreground text-[10px]">F = [√(R²+1) × ln((1-P)/(1-PR))] / [(R-1) × ln((2-P(R+1-√(R²+1)))/(2-P(R+1+√(R²+1))))]</p>
                <p className="text-muted-foreground mt-1">P = (tc,out - tc,in)/(th,in - tc,in), R = (th,in - th,out)/(tc,out - tc,in)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Heat Transfer Area (TEMA)</p>
                <p className="font-mono text-muted-foreground">A = Q / (U × F × LMTD)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Fouled Overall U</p>
                <p className="font-mono text-muted-foreground">1/U_fouled = 1/U_clean + Rf,o + Rf,i</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">NTU-Effectiveness (Kays & London)</p>
                <p className="font-mono text-muted-foreground">NTU = U×A / Cmin</p>
                <p className="font-mono text-muted-foreground mt-1">ε = (1 - exp(-NTU(1-Cr))) / (1 - Cr×exp(-NTU(1-Cr)))</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Tube-Side Pressure Drop (Kern's Method)</p>
                <p className="font-mono text-muted-foreground">ΔP = (4f × L × Np × ρ × v²)/(2 × di) + (4 × Np × ρ × v²)/2</p>
                <p className="text-muted-foreground mt-1">Friction factor: f = 0.079 × Re^(-0.25) (Blasius, turbulent)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Shell-Side Pressure Drop (Kern's Method)</p>
                <p className="font-mono text-muted-foreground">ΔP = (f × Gs² × Ds × (Nb+1)) / (2 × ρ × De)</p>
                <p className="text-muted-foreground mt-1">De (triangular) = 4×(Pt²×√3/4 - π×do²/8) / (π×do/2)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Reynolds Number</p>
                <p className="font-mono text-muted-foreground">Re = ρ × v × d / μ</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default HeatExchangerSizing;
