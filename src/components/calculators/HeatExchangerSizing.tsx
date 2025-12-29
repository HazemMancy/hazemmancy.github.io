import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer, ArrowRight, Info, BookOpen, Settings, Gauge, Grid3X3, AlertTriangle, Activity, Download, Database, Shield, Droplets, Save, GitCompare } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fluidDatabase, getFluidProperties, getFluidsByCategory } from "@/lib/fluidProperties";
import { calculateASMEThickness, asmeMaterials, getMaterialOptions, type ASMEResults } from "@/lib/asmeCalculations";
import { generateDatasheetPDF, type DatasheetData } from "@/lib/pdfDatasheet";
import { calculateTubeCount, getRecommendedPitch, getRecommendedBaffleSpacing, getAvailableTubeCountTables, allTubeCountTables, type TubeCountTable } from "@/lib/temaGeometry";
import { toast } from "@/hooks/use-toast";
import TubeBundleVisualization from "./TubeBundleVisualization";
import DesignComparison, { type SavedDesign } from "./DesignComparison";
import { HTRIRatingSummary, type HTRIRatingData } from "./HTRIRatingSummary";

type CalculationMode = "design" | "rating";
type FlowArrangement = "counter" | "parallel" | "shell-tube-1-2" | "shell-tube-1-4" | "crossflow-unmixed" | "crossflow-mixed";
type TemperatureUnit = "C" | "F" | "K";
type ShellSideMethod = "kern" | "bell-delaware";

interface FluidInputs {
  inletTemp: string;
  outletTemp: string;
  flowRate: string;
  specificHeat: string;
  density: string;
  viscosity: string;
  thermalConductivity: string;
  prandtl: string;
}

interface TubeGeometry {
  outerDiameter: string;
  wallThickness: string;
  tubeLength: string;
  numberOfTubes: string;
  tubePitch: string;
  baffleSpacing: string;
  baffleCut: string;
  shellDiameter: string;
  tubePasses: string;
  tubePattern: "triangular" | "square" | "rotatedSquare";
  shellBaffleLeakage: string;
  tubeBaffleLeakage: string;
  bundleBypass: string;
  tubeMaterial: string;
  tubeElasticModulus: string;
  tubeDensity: string;
  unsupportedSpanLength: string;
}

interface VibrationResults {
  naturalFrequency: number;
  vortexSheddingFrequency: number;
  acousticResonanceFrequency: number;
  criticalVelocity: number;
  reducedVelocity: number;
  frequencyRatio: number;
  isVibrationRisk: boolean;
  isAcousticRisk: boolean;
  vibrationMessage: string;
  damageNumber: number;
}

// TEMA Tube Count Tables (per TEMA RCB-4.2)
const temaTubeCountTable: Record<number, Record<number, { triangular: number; square: number }>> = {
  205: { 1: { triangular: 32, square: 26 }, 2: { triangular: 30, square: 24 }, 4: { triangular: 24, square: 16 } },
  257: { 1: { triangular: 56, square: 45 }, 2: { triangular: 52, square: 40 }, 4: { triangular: 40, square: 32 } },
  307: { 1: { triangular: 81, square: 64 }, 2: { triangular: 76, square: 60 }, 4: { triangular: 68, square: 52 } },
  337: { 1: { triangular: 106, square: 81 }, 2: { triangular: 98, square: 76 }, 4: { triangular: 90, square: 68 } },
  387: { 1: { triangular: 138, square: 109 }, 2: { triangular: 130, square: 102 }, 4: { triangular: 118, square: 90 } },
  438: { 1: { triangular: 177, square: 142 }, 2: { triangular: 166, square: 130 }, 4: { triangular: 150, square: 118 } },
  489: { 1: { triangular: 224, square: 178 }, 2: { triangular: 212, square: 166 }, 4: { triangular: 196, square: 150 } },
  540: { 1: { triangular: 277, square: 220 }, 2: { triangular: 262, square: 206 }, 4: { triangular: 242, square: 188 } },
  591: { 1: { triangular: 334, square: 265 }, 2: { triangular: 316, square: 250 }, 4: { triangular: 294, square: 228 } },
  635: { 1: { triangular: 394, square: 314 }, 2: { triangular: 374, square: 296 }, 4: { triangular: 346, square: 270 } },
  686: { 1: { triangular: 460, square: 365 }, 2: { triangular: 436, square: 346 }, 4: { triangular: 406, square: 316 } },
  737: { 1: { triangular: 532, square: 422 }, 2: { triangular: 506, square: 400 }, 4: { triangular: 470, square: 366 } },
  787: { 1: { triangular: 608, square: 481 }, 2: { triangular: 578, square: 456 }, 4: { triangular: 538, square: 420 } },
  838: { 1: { triangular: 692, square: 549 }, 2: { triangular: 658, square: 520 }, 4: { triangular: 614, square: 478 } },
  889: { 1: { triangular: 774, square: 613 }, 2: { triangular: 738, square: 584 }, 4: { triangular: 688, square: 536 } },
  940: { 1: { triangular: 866, square: 685 }, 2: { triangular: 826, square: 654 }, 4: { triangular: 770, square: 600 } },
  991: { 1: { triangular: 962, square: 762 }, 2: { triangular: 916, square: 724 }, 4: { triangular: 856, square: 666 } },
  1067: { 1: { triangular: 1126, square: 889 }, 2: { triangular: 1072, square: 848 }, 4: { triangular: 1002, square: 778 } },
  1219: { 1: { triangular: 1500, square: 1182 }, 2: { triangular: 1428, square: 1128 }, 4: { triangular: 1336, square: 1040 } },
  1372: { 1: { triangular: 1920, square: 1514 }, 2: { triangular: 1830, square: 1446 }, 4: { triangular: 1714, square: 1334 } },
  1524: { 1: { triangular: 2394, square: 1889 }, 2: { triangular: 2282, square: 1802 }, 4: { triangular: 2138, square: 1662 } },
};

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

// Tube material properties
const tubeMaterials: Record<string, { E: number; density: number; k: number }> = {
  "carbon-steel": { E: 200e9, density: 7850, k: 50 },
  "stainless-304": { E: 193e9, density: 8000, k: 16 },
  "stainless-316": { E: 193e9, density: 8000, k: 16 },
  "copper": { E: 117e9, density: 8960, k: 385 },
  "admiralty-brass": { E: 100e9, density: 8530, k: 111 },
  "titanium": { E: 116e9, density: 4510, k: 22 },
  "inconel-600": { E: 214e9, density: 8470, k: 15 },
  "monel-400": { E: 179e9, density: 8800, k: 22 },
};

const HeatExchangerSizing = () => {
  const [calculationMode, setCalculationMode] = useState<CalculationMode>("design");
  const [flowArrangement, setFlowArrangement] = useState<FlowArrangement>("shell-tube-1-2");
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>("C");
  const [shellSideMethod, setShellSideMethod] = useState<ShellSideMethod>("bell-delaware");
  
  // Fluid selection
  const [hotFluidType, setHotFluidType] = useState<string>("custom");
  const [coldFluidType, setColdFluidType] = useState<string>("water");
  
  // ASME inputs
  const [designPressure, setDesignPressure] = useState("10"); // Now in barg
  const [corrosionAllowance, setCorrosionAllowance] = useState("3.0");
  const [shellMaterial, setShellMaterial] = useState("sa-516-70");
  const [jointEfficiency, setJointEfficiency] = useState("1.0");
  const [asmeResults, setAsmeResults] = useState<ASMEResults | null>(null);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // PDF metadata
  const [companyName, setCompanyName] = useState("Company Name");
  const [projectName, setProjectName] = useState("Heat Exchanger Design");
  const [itemNumber, setItemNumber] = useState("HX-001");
  const [revisionNo, setRevisionNo] = useState("0");
  
  // TEMA table selection
  const [selectedTemaTable, setSelectedTemaTable] = useState("3/4\" OD on 1\" pitch (standard)");
  
  // HTRI Rating Summary state
  const [htriEnabled, setHtriEnabled] = useState(false);
  const [allowedDPTube, setAllowedDPTube] = useState("50");
  const [allowedDPShell, setAllowedDPShell] = useState("50");
  
  // TEMA auto-calculate mode
  const [autoCalculateGeometry, setAutoCalculateGeometry] = useState(false);
  
  const [hotFluid, setHotFluid] = useState<FluidInputs>({
    inletTemp: "150",
    outletTemp: "90",
    flowRate: "50000",
    specificHeat: "2.1",
    density: "750",
    viscosity: "0.5",
    thermalConductivity: "0.12",
    prandtl: "8.75"
  });
  
  const [coldFluid, setColdFluid] = useState<FluidInputs>({
    inletTemp: "25",
    outletTemp: "70",
    flowRate: "80000",
    specificHeat: "4.18",
    density: "995",
    viscosity: "0.8",
    thermalConductivity: "0.60",
    prandtl: "5.57"
  });
  
  const [overallU, setOverallU] = useState("350");
  const [area, setArea] = useState("50");
  const [hotFouling, setHotFouling] = useState("0.00035");
  const [coldFouling, setColdFouling] = useState("0.00018");

  const [tubeGeometry, setTubeGeometry] = useState<TubeGeometry>({
    outerDiameter: "19.05",
    wallThickness: "2.11",
    tubeLength: "6.0",
    numberOfTubes: "200",
    tubePitch: "25.4",
    baffleSpacing: "300",
    baffleCut: "25",
    shellDiameter: "600",
    tubePasses: "2",
    tubePattern: "triangular",
    shellBaffleLeakage: "3.2",
    tubeBaffleLeakage: "0.8",
    bundleBypass: "0.1",
    tubeMaterial: "carbon-steel",
    tubeElasticModulus: "200",
    tubeDensity: "7850",
    unsupportedSpanLength: "300"
  });
  
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
    tubeSidePressureDrop: number;
    shellSidePressureDrop: number;
    tubeSideVelocity: number;
    shellSideVelocity: number;
    tubeReynolds: number;
    shellReynolds: number;
    heatTransferArea: number;
    tubeInnerDiameter: number;
    flowAreaPerPass: number;
    crossFlowArea: number;
    cleanU: number;
    fouledU: number;
    Jc?: number;
    Jl?: number;
    Jb?: number;
    Jr?: number;
    Js?: number;
    numberOfBaffles: number;
    equivalentDiameter: number;
    // Heat transfer coefficients
    hi: number;
    ho: number;
    tubeNusselt: number;
    shellNusselt: number;
    calculatedU: number;
    // Vibration
    vibration: VibrationResults;
  } | null>(null);

  // Get suggested tube count from TEMA table
  const getSuggestedTubeCount = useMemo(() => {
    const shellDia = parseFloat(tubeGeometry.shellDiameter);
    const passes = parseInt(tubeGeometry.tubePasses);
    const pattern = tubeGeometry.tubePattern === "triangular" ? "triangular" : "square";
    
    const shellSizes = Object.keys(temaTubeCountTable).map(Number).sort((a, b) => a - b);
    let closestSize = shellSizes[0];
    let minDiff = Math.abs(shellDia - closestSize);
    
    for (const size of shellSizes) {
      const diff = Math.abs(shellDia - size);
      if (diff < minDiff) {
        minDiff = diff;
        closestSize = size;
      }
    }
    
    const passData = temaTubeCountTable[closestSize];
    if (!passData) return null;
    
    const passKey = passes <= 1 ? 1 : passes <= 2 ? 2 : 4;
    const tubeData = passData[passKey];
    if (!tubeData) return null;
    
    return {
      count: tubeData[pattern],
      shellSize: closestSize,
      pattern,
      passes: passKey
    };
  }, [tubeGeometry.shellDiameter, tubeGeometry.tubePasses, tubeGeometry.tubePattern]);

  const applySuggestedTubeCount = useCallback(() => {
    if (getSuggestedTubeCount) {
      setTubeGeometry(prev => ({
        ...prev,
        numberOfTubes: getSuggestedTubeCount.count.toString()
      }));
    }
  }, [getSuggestedTubeCount]);

  // Temperature conversion functions
  const toKelvin = useCallback((temp: number, unit: TemperatureUnit): number => {
    switch (unit) {
      case "C": return temp + 273.15;
      case "F": return (temp - 32) * 5/9 + 273.15;
      case "K": return temp;
    }
  }, []);

  const fromKelvin = useCallback((tempK: number, unit: TemperatureUnit): number => {
    switch (unit) {
      case "C": return tempK - 273.15;
      case "F": return (tempK - 273.15) * 9/5 + 32;
      case "K": return tempK;
    }
  }, []);

  /**
   * Calculate Tube-Side Heat Transfer Coefficient (hi)
   * Using Dittus-Boelter / Sieder-Tate correlations
   * 
   * Dittus-Boelter (Re > 10000): Nu = 0.023 × Re^0.8 × Pr^n
   *   n = 0.4 for heating, n = 0.3 for cooling
   * 
   * Sieder-Tate (all Re): Nu = 0.027 × Re^0.8 × Pr^(1/3) × (μ/μw)^0.14
   * 
   * Gnielinski (2300 < Re < 10^6): Nu = (f/8)(Re-1000)Pr / [1 + 12.7(f/8)^0.5(Pr^(2/3)-1)]
   */
  const calculateTubeSideHTC = useCallback((
    Re: number,
    Pr: number,
    k: number,
    Di: number,
    isHeating: boolean = true
  ): { h: number; Nu: number } => {
    if (Re <= 0 || Pr <= 0 || k <= 0 || Di <= 0) {
      return { h: 0, Nu: 0 };
    }

    let Nu: number;
    
    if (Re < 2300) {
      // Laminar flow: Nu = 3.66 (constant wall temp) or 4.36 (constant heat flux)
      Nu = 3.66;
    } else if (Re < 10000) {
      // Transition: Gnielinski correlation
      const f = Math.pow(1.82 * Math.log10(Re) - 1.64, -2);
      Nu = (f / 8) * (Re - 1000) * Pr / (1 + 12.7 * Math.sqrt(f / 8) * (Math.pow(Pr, 2/3) - 1));
      Nu = Math.max(Nu, 3.66); // Ensure positive
    } else {
      // Turbulent: Dittus-Boelter correlation
      const n = isHeating ? 0.4 : 0.3;
      Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, n);
    }

    const h = Nu * k / Di;
    return { h, Nu };
  }, []);

  /**
   * Calculate Shell-Side Heat Transfer Coefficient (ho)
   * Using Bell-Delaware method correlations
   * 
   * Ideal coefficient: h_id = j × Cp × Gs × Pr^(-2/3)
   * Corrected: h_o = h_id × Jc × Jl × Jb × Jr × Js
   * 
   * j-factor correlations:
   * - Triangular pitch: j = 0.321 × Re^(-0.388) for Re > 10000
   * - Square pitch: j = 0.249 × Re^(-0.382) for Re > 10000
   */
  const calculateShellSideHTC = useCallback((
    Re: number,
    Pr: number,
    k: number,
    De: number,
    Gs: number,
    Cp: number,
    tubePattern: string,
    Jc: number,
    Jl: number,
    Jb: number,
    Jr: number,
    Js: number
  ): { h: number; Nu: number } => {
    if (Re <= 0 || Pr <= 0 || k <= 0 || De <= 0 || Gs <= 0) {
      return { h: 0, Nu: 0 };
    }

    let jFactor: number;
    
    if (tubePattern === "triangular") {
      if (Re > 10000) {
        jFactor = 0.321 * Math.pow(Re, -0.388);
      } else if (Re > 1000) {
        jFactor = 0.593 * Math.pow(Re, -0.477);
      } else if (Re > 100) {
        jFactor = 1.52 * Math.pow(Re, -0.574);
      } else {
        jFactor = 1.04 * Math.pow(Re, -0.451);
      }
    } else {
      if (Re > 10000) {
        jFactor = 0.249 * Math.pow(Re, -0.382);
      } else if (Re > 1000) {
        jFactor = 0.391 * Math.pow(Re, -0.438);
      } else if (Re > 100) {
        jFactor = 1.187 * Math.pow(Re, -0.547);
      } else {
        jFactor = 0.994 * Math.pow(Re, -0.426);
      }
    }

    // Ideal heat transfer coefficient
    const h_ideal = jFactor * Cp * 1000 * Gs * Math.pow(Pr, -2/3);
    
    // Apply Bell-Delaware correction factors
    const h = h_ideal * Jc * Jl * Jb * Jr * Js;
    
    // Calculate Nusselt number
    const Nu = h * De / k;

    return { h, Nu };
  }, []);

  /**
   * Flow-Induced Vibration Analysis per TEMA and HTRI Standards
   * 
   * 1. Natural Frequency (fn) - Euler beam theory
   * 2. Vortex Shedding Frequency (fvs) - Strouhal number
   * 3. Acoustic Resonance Frequency (fa) - Speed of sound in shell
   * 4. Critical Velocity - Connors' equation
   */
  const calculateVibrationAnalysis = useCallback((
    shellVelocity: number,
    shellDensity: number,
    tubeOD: number,
    tubePitch: number,
    tubePattern: string,
    tubeElasticModulus: number,
    tubeDensity: number,
    tubeWallThickness: number,
    unsupportedLength: number,
    shellDiameter: number
  ): VibrationResults => {
    if (shellVelocity <= 0 || tubeOD <= 0) {
      return {
        naturalFrequency: 0,
        vortexSheddingFrequency: 0,
        acousticResonanceFrequency: 0,
        criticalVelocity: 0,
        reducedVelocity: 0,
        frequencyRatio: 0,
        isVibrationRisk: false,
        isAcousticRisk: false,
        vibrationMessage: "Insufficient data",
        damageNumber: 0
      };
    }

    // Tube inner diameter
    const Di = tubeOD - 2 * tubeWallThickness;
    
    // Second moment of area (I) for tube
    const I = (Math.PI / 64) * (Math.pow(tubeOD, 4) - Math.pow(Di, 4));
    
    // Cross-sectional area
    const A = (Math.PI / 4) * (Math.pow(tubeOD, 2) - Math.pow(Di, 2));
    
    // Mass per unit length (tube + fluid inside)
    const tubeLinearMass = tubeDensity * A;
    const fluidLinearMass = shellDensity * (Math.PI / 4) * Math.pow(Di, 2);
    const totalLinearMass = tubeLinearMass + fluidLinearMass;
    
    // Added mass coefficient (hydrodynamic mass)
    const pitchRatio = tubePitch / tubeOD;
    let Cm: number;
    if (tubePattern === "triangular") {
      Cm = 1.0 + 0.6 / Math.pow(pitchRatio - 1, 1.5);
    } else {
      Cm = 1.0 + 0.5 / Math.pow(pitchRatio - 1, 1.5);
    }
    Cm = Math.min(Cm, 3.0); // Cap at reasonable value
    
    // Effective mass per unit length
    const addedMass = Cm * shellDensity * (Math.PI / 4) * Math.pow(tubeOD, 2);
    const effectiveMass = totalLinearMass + addedMass;

    /**
     * Natural Frequency (TEMA)
     * fn = (Cn/2π) × √(E×I / (m×L⁴))
     * Cn = coefficient based on end conditions (fixed-fixed: 22.4)
     */
    const Cn = 22.4; // Fixed-fixed boundary conditions (tube sheet to baffle)
    const fn = (Cn / (2 * Math.PI)) * Math.sqrt(
      (tubeElasticModulus * I) / (effectiveMass * Math.pow(unsupportedLength, 4))
    );

    /**
     * Strouhal Number and Vortex Shedding Frequency
     * St = fvs × D / V
     * For tube banks: St ≈ 0.2 (triangular), 0.25 (square)
     */
    const St = tubePattern === "triangular" ? 0.2 : 0.25;
    const fvs = St * shellVelocity / tubeOD;

    /**
     * Acoustic Resonance Frequency
     * fa = c / (2 × W) where W is effective width, c is speed of sound
     * Speed of sound in liquid: c ≈ 1500 m/s (water), for gas calculate from γRT/M
     */
    const speedOfSound = 1500; // m/s (approximate for liquids)
    const effectiveWidth = shellDiameter;
    const fa = speedOfSound / (2 * effectiveWidth);

    /**
     * Critical Velocity - Connors' Equation (Fluid-Elastic Instability)
     * Vcrit = K × fn × D × √(m×δ / (ρ×D²))
     * K = instability constant (2.4 for triangular, 3.4 for square)
     * δ = log decrement of damping (≈0.03 for steel tubes in liquid)
     */
    const K = tubePattern === "triangular" ? 2.4 : 3.4;
    const logDecrement = 0.03; // Typical for steel tubes in liquid
    const massRatio = effectiveMass / (shellDensity * Math.pow(tubeOD, 2));
    const Vcrit = K * fn * tubeOD * Math.sqrt(massRatio * logDecrement);

    // Reduced velocity
    const Vr = shellVelocity / (fn * tubeOD);

    // Frequency ratio (vortex shedding to natural)
    const freqRatio = fvs / fn;

    /**
     * Damage Number (Pettigrew & Taylor)
     * D = ρ × V² × D / (m × fn × δ)
     * D > 1 indicates potential damage
     */
    const damageNumber = (shellDensity * Math.pow(shellVelocity, 2) * tubeOD) / 
                         (effectiveMass * fn * logDecrement);

    // Vibration risk assessment
    const isVibrationRisk = 
      (freqRatio > 0.7 && freqRatio < 1.3) || // Resonance band
      shellVelocity > 0.8 * Vcrit ||           // Near critical velocity
      damageNumber > 0.5;                       // Damage potential

    // Acoustic resonance risk (for gases, fvs approaching fa)
    const isAcousticRisk = 
      Math.abs(fvs - fa) / fa < 0.15 ||
      Math.abs(2 * fvs - fa) / fa < 0.15;

    // Generate message
    let vibrationMessage = "✓ Design is within safe limits";
    if (isVibrationRisk) {
      if (freqRatio > 0.7 && freqRatio < 1.3) {
        vibrationMessage = "⚠ Vortex shedding near resonance! Increase baffle spacing or tube support.";
      } else if (shellVelocity > 0.8 * Vcrit) {
        vibrationMessage = "⚠ Velocity approaching fluid-elastic instability threshold!";
      } else if (damageNumber > 0.5) {
        vibrationMessage = "⚠ High damage potential - review tube support design.";
      }
    }

    return {
      naturalFrequency: fn,
      vortexSheddingFrequency: fvs,
      acousticResonanceFrequency: fa,
      criticalVelocity: Vcrit,
      reducedVelocity: Vr,
      frequencyRatio: freqRatio,
      isVibrationRisk,
      isAcousticRisk,
      vibrationMessage,
      damageNumber
    };
  }, []);

  /**
   * LMTD Correction Factor (F) for Shell & Tube Heat Exchangers
   */
  const calculateCorrectionFactor = useCallback((
    R: number, 
    P: number, 
    arrangement: FlowArrangement
  ): number => {
    if (arrangement === "counter" || arrangement === "parallel") {
      return 1.0;
    }
    
    if (P <= 0 || P >= 1 || R <= 0) return 0.9;
    
    if (Math.abs(R - 1) < 0.001) {
      const F = (P * Math.sqrt(2)) / ((1 - P) * Math.log((2 - P * (2 - Math.sqrt(2))) / (2 - P * (2 + Math.sqrt(2)))));
      return Math.min(1, Math.max(0.5, isNaN(F) || !isFinite(F) ? 0.9 : F));
    }
    
    const sqrtTerm = Math.sqrt(R * R + 1);
    const numerator = sqrtTerm * Math.log((1 - P) / (1 - P * R));
    const term1 = (2 - P * (R + 1 - sqrtTerm)) / (2 - P * (R + 1 + sqrtTerm));
    const denominator = (R - 1) * Math.log(term1);
    
    const F = numerator / denominator;
    return Math.min(1, Math.max(0.5, isNaN(F) || !isFinite(F) ? 0.9 : F));
  }, []);

  const calculateEffectivenessCounter = useCallback((ntu: number, Cr: number): number => {
    if (Cr === 0) return 1 - Math.exp(-ntu);
    if (Math.abs(Cr - 1) < 0.001) return ntu / (1 + ntu);
    return (1 - Math.exp(-ntu * (1 - Cr))) / (1 - Cr * Math.exp(-ntu * (1 - Cr)));
  }, []);

  const calculateEffectivenessParallel = useCallback((ntu: number, Cr: number): number => {
    if (Cr === 0) return 1 - Math.exp(-ntu);
    return (1 - Math.exp(-ntu * (1 + Cr))) / (1 + Cr);
  }, []);

  /**
   * Tube-side pressure drop per Kern's Method
   */
  const calculateTubeSidePressureDrop = useCallback((
    velocity: number,
    density: number,
    viscosity: number,
    innerDiameter: number,
    tubeLength: number,
    tubePasses: number
  ): { pressureDrop: number; reynolds: number } => {
    if (velocity <= 0 || innerDiameter <= 0) return { pressureDrop: 0, reynolds: 0 };
    
    const reynolds = (density * velocity * innerDiameter) / (viscosity / 1000);
    
    let frictionFactor: number;
    if (reynolds < 2300) {
      frictionFactor = 16 / reynolds;
    } else if (reynolds < 100000) {
      frictionFactor = 0.079 * Math.pow(reynolds, -0.25);
    } else {
      frictionFactor = 0.046 * Math.pow(reynolds, -0.2);
    }
    
    const straightDrop = (4 * frictionFactor * tubeLength * tubePasses * density * velocity * velocity) / (2 * innerDiameter);
    const returnLoss = (4 * tubePasses * density * velocity * velocity) / 2;
    const totalPressureDrop = (straightDrop + returnLoss) / 1000;
    
    return { pressureDrop: totalPressureDrop, reynolds };
  }, []);

  /**
   * Bell-Delaware Method for Shell-Side
   */
  const calculateBellDelaware = useCallback((
    massFlowRate: number,
    density: number,
    viscosity: number,
    shellDiameter: number,
    baffleSpacing: number,
    baffleCut: number,
    tubeOuterDiameter: number,
    tubePitch: number,
    tubeLength: number,
    tubePattern: string,
    numberOfTubes: number,
    shellBaffleLeakage: number,
    tubeBaffleLeakage: number,
    bundleBypass: number
  ): { 
    pressureDrop: number; 
    velocity: number; 
    reynolds: number; 
    crossFlowArea: number;
    Jc: number;
    Jl: number;
    Jb: number;
    Jr: number;
    Js: number;
    numberOfBaffles: number;
    equivalentDiameter: number;
    Gs: number;
  } => {
    if (massFlowRate <= 0 || shellDiameter <= 0) {
      return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0, Jc: 1, Jl: 1, Jb: 1, Jr: 1, Js: 1, numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0 };
    }
    
    const clearance = tubePitch - tubeOuterDiameter;
    const Sm = shellDiameter * baffleSpacing * clearance / tubePitch;
    
    if (Sm <= 0) {
      return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0, Jc: 1, Jl: 1, Jb: 1, Jr: 1, Js: 1, numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0 };
    }
    
    const Gs = massFlowRate / Sm;
    const velocity = Gs / density;
    
    let De: number;
    if (tubePattern === "triangular") {
      De = (1.1 / tubeOuterDiameter) * (tubePitch * tubePitch - 0.917 * tubeOuterDiameter * tubeOuterDiameter);
    } else {
      De = (1.27 / tubeOuterDiameter) * (tubePitch * tubePitch - 0.785 * tubeOuterDiameter * tubeOuterDiameter);
    }
    De = Math.max(De, 0.001);
    
    const reynolds = (tubeOuterDiameter * Gs) / (viscosity / 1000);
    const Nb = Math.max(1, Math.floor(tubeLength / baffleSpacing) - 1);
    
    const Fc = 1 - 2 * baffleCut;
    const Jc = 0.55 + 0.72 * Math.max(0.3, Math.min(0.9, Fc));
    
    const Asb = Math.PI * shellDiameter * shellBaffleLeakage;
    const Atb = numberOfTubes * Math.PI * tubeOuterDiameter * tubeBaffleLeakage;
    const totalLeakage = Asb + Atb;
    const rs = Asb / (Asb + Atb + 0.001);
    const rlm = totalLeakage / (Sm + 0.001);
    const Jl = 0.44 * (1 - rs) + (1 - 0.44 * (1 - rs)) * Math.exp(-2.2 * rlm);
    
    const Fbp = bundleBypass;
    const Cbp = reynolds >= 100 ? 1.35 : 1.25;
    const rss = 0.5;
    const Jb = Math.exp(-Cbp * Fbp * (1 - Math.pow(2 * rss, 1/3)));
    
    let Jr: number;
    if (reynolds >= 100) {
      Jr = 1.0;
    } else if (reynolds >= 20) {
      Jr = 0.9;
    } else {
      Jr = 0.8;
    }
    
    const Js = 1.0;
    
    let frictionFactor: number;
    if (reynolds > 1000) {
      frictionFactor = tubePattern === "triangular" 
        ? Math.exp(0.576 - 0.19 * Math.log(reynolds))
        : Math.exp(0.576 - 0.18 * Math.log(reynolds));
    } else if (reynolds > 100) {
      frictionFactor = Math.exp(0.8 - 0.15 * Math.log(reynolds));
    } else {
      frictionFactor = 48 / reynolds;
    }
    
    const Nc = Math.floor(shellDiameter * (1 - 2 * baffleCut) / tubePitch);
    const deltaP_cross = (Nb * 4 * frictionFactor * Gs * Gs * Nc) / (2 * density);
    
    const Nw = Math.floor(2 * baffleCut * shellDiameter / tubePitch);
    const deltaP_window = (Nb + 1) * (2 + 0.6 * Nw) * Gs * Gs / (2 * density);
    
    const deltaP_ends = 2 * Gs * Gs / (2 * density);
    
    const Rb = Jb;
    const Rl = Math.pow(Jl, 2);
    
    const totalPressureDrop = ((deltaP_cross * Rb * Rl) + deltaP_window + deltaP_ends) / 1000;
    
    return { 
      pressureDrop: Math.max(0, totalPressureDrop), 
      velocity, 
      reynolds, 
      crossFlowArea: Sm,
      Jc,
      Jl,
      Jb,
      Jr,
      Js,
      numberOfBaffles: Nb,
      equivalentDiameter: De,
      Gs
    };
  }, []);

  const calculateKernShellSide = useCallback((
    massFlowRate: number,
    density: number,
    viscosity: number,
    shellDiameter: number,
    baffleSpacing: number,
    tubeOuterDiameter: number,
    tubePitch: number,
    tubeLength: number,
    tubePattern: string
  ): { pressureDrop: number; velocity: number; reynolds: number; crossFlowArea: number; numberOfBaffles: number; equivalentDiameter: number; Gs: number } => {
    if (massFlowRate <= 0 || shellDiameter <= 0) {
      return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0, numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0 };
    }
    
    const clearance = tubePitch - tubeOuterDiameter;
    const crossFlowArea = (shellDiameter * baffleSpacing * clearance) / tubePitch;
    
    if (crossFlowArea <= 0) {
      return { pressureDrop: 0, velocity: 0, reynolds: 0, crossFlowArea: 0, numberOfBaffles: 0, equivalentDiameter: 0, Gs: 0 };
    }
    
    const Gs = massFlowRate / crossFlowArea;
    const velocity = Gs / density;
    
    let De: number;
    if (tubePattern === "triangular") {
      De = (4 * ((tubePitch * tubePitch * Math.sqrt(3) / 4) - (Math.PI * tubeOuterDiameter * tubeOuterDiameter / 8))) / 
           (Math.PI * tubeOuterDiameter / 2);
    } else {
      De = (4 * (tubePitch * tubePitch - Math.PI * tubeOuterDiameter * tubeOuterDiameter / 4)) / 
           (Math.PI * tubeOuterDiameter);
    }
    
    const reynolds = (De * Gs) / (viscosity / 1000);
    
    let frictionFactor: number;
    if (reynolds > 500) {
      frictionFactor = Math.exp(0.576 - 0.19 * Math.log(reynolds));
    } else {
      frictionFactor = 1.0;
    }
    
    const numberOfBaffles = Math.floor(tubeLength / baffleSpacing) - 1;
    
    const pressureDrop = (frictionFactor * Gs * Gs * shellDiameter * (numberOfBaffles + 1)) / 
                         (2 * density * De * 1000);
    
    return { pressureDrop: Math.max(0, pressureDrop), velocity, reynolds, crossFlowArea, numberOfBaffles, equivalentDiameter: De, Gs };
  }, []);

  // Main calculation effect
  useEffect(() => {
    const Thi = parseFloat(hotFluid.inletTemp);
    const Tho = parseFloat(hotFluid.outletTemp);
    const Tci = parseFloat(coldFluid.inletTemp);
    const Tco = parseFloat(coldFluid.outletTemp);
    const mh = parseFloat(hotFluid.flowRate);
    const mc = parseFloat(coldFluid.flowRate);
    const Cph = parseFloat(hotFluid.specificHeat);
    const Cpc = parseFloat(coldFluid.specificHeat);
    const rhoHot = parseFloat(hotFluid.density);
    const rhoCold = parseFloat(coldFluid.density);
    const muHot = parseFloat(hotFluid.viscosity);
    const muCold = parseFloat(coldFluid.viscosity);
    const kHot = parseFloat(hotFluid.thermalConductivity);
    const kCold = parseFloat(coldFluid.thermalConductivity);
    const PrHot = parseFloat(hotFluid.prandtl);
    const PrCold = parseFloat(coldFluid.prandtl);
    const U = parseFloat(overallU);
    const A = parseFloat(area);
    const Rfo = parseFloat(hotFouling);
    const Rfi = parseFloat(coldFouling);

    const Do = parseFloat(tubeGeometry.outerDiameter) / 1000;
    const wallThickness = parseFloat(tubeGeometry.wallThickness) / 1000;
    const Di = Do - 2 * wallThickness;
    const tubeLength = parseFloat(tubeGeometry.tubeLength);
    const numberOfTubes = parseInt(tubeGeometry.numberOfTubes);
    const tubePasses = parseInt(tubeGeometry.tubePasses);
    const tubePitch = parseFloat(tubeGeometry.tubePitch) / 1000;
    const baffleSpacing = parseFloat(tubeGeometry.baffleSpacing) / 1000;
    const baffleCut = parseFloat(tubeGeometry.baffleCut) / 100;
    const shellDiameter = parseFloat(tubeGeometry.shellDiameter) / 1000;
    const shellBaffleLeakage = parseFloat(tubeGeometry.shellBaffleLeakage) / 1000;
    const tubeBaffleLeakage = parseFloat(tubeGeometry.tubeBaffleLeakage) / 1000;
    const bundleBypass = parseFloat(tubeGeometry.bundleBypass);
    
    const tubeMat = tubeMaterials[tubeGeometry.tubeMaterial] || tubeMaterials["carbon-steel"];
    const tubeE = tubeMat.E;
    const tubeDensity = tubeMat.density;
    const tubeK = tubeMat.k;
    const unsupportedLength = parseFloat(tubeGeometry.unsupportedSpanLength) / 1000;

    if ([Thi, Tho, Tci, Tco, mh, mc, Cph, Cpc, rhoHot, rhoCold, muHot, muCold, kHot, kCold, PrHot, PrCold].some(isNaN)) {
      setResults(null);
      return;
    }

    const ThiK = toKelvin(Thi, tempUnit);
    const ThoK = toKelvin(Tho, tempUnit);
    const TciK = toKelvin(Tci, tempUnit);
    const TcoK = toKelvin(Tco, tempUnit);

    const Ch = (mh / 3600) * Cph;
    const Cc = (mc / 3600) * Cpc;
    
    const Cmin = Math.min(Ch, Cc);
    const Cmax = Math.max(Ch, Cc);
    const Cr = Cmin / Cmax;

    const Qh = Ch * (ThiK - ThoK);
    
    let deltaT1: number, deltaT2: number;
    
    if (flowArrangement === "parallel") {
      deltaT1 = ThiK - TciK;
      deltaT2 = ThoK - TcoK;
    } else {
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

    const P = (TcoK - TciK) / (ThiK - TciK);
    const R = (ThiK - ThoK) / (TcoK - TciK);

    const F = calculateCorrectionFactor(R, P, flowArrangement);
    const effectiveLmtd = lmtd * F;

    const heatTransferArea = numberOfTubes * Math.PI * Do * tubeLength;
    const flowAreaPerPass = (numberOfTubes / tubePasses) * (Math.PI * Di * Di / 4);
    const tubeSideVelocity = (mc / 3600) / (rhoCold * flowAreaPerPass);

    const tubeSideCalc = calculateTubeSidePressureDrop(
      tubeSideVelocity, rhoCold, muCold, Di, tubeLength, tubePasses
    );

    // Calculate tube-side heat transfer coefficient
    const tubeHTC = calculateTubeSideHTC(
      tubeSideCalc.reynolds, PrCold, kCold, Di, true
    );

    // Calculate shell-side based on selected method
    let shellSideCalc: {
      pressureDrop: number;
      velocity: number;
      reynolds: number;
      crossFlowArea: number;
      Jc?: number;
      Jl?: number;
      Jb?: number;
      Jr?: number;
      Js?: number;
      numberOfBaffles: number;
      equivalentDiameter: number;
      Gs: number;
    };

    if (shellSideMethod === "bell-delaware") {
      shellSideCalc = calculateBellDelaware(
        mh / 3600, rhoHot, muHot, shellDiameter, baffleSpacing, baffleCut,
        Do, tubePitch, tubeLength, tubeGeometry.tubePattern, numberOfTubes,
        shellBaffleLeakage, tubeBaffleLeakage, bundleBypass
      );
    } else {
      const kernResult = calculateKernShellSide(
        mh / 3600, rhoHot, muHot, shellDiameter, baffleSpacing,
        Do, tubePitch, tubeLength, tubeGeometry.tubePattern
      );
      shellSideCalc = { ...kernResult, Jc: 1, Jl: 1, Jb: 1, Jr: 1, Js: 1 };
    }

    // Calculate shell-side heat transfer coefficient
    const shellHTC = calculateShellSideHTC(
      shellSideCalc.reynolds,
      PrHot,
      kHot,
      shellSideCalc.equivalentDiameter,
      shellSideCalc.Gs,
      Cph,
      tubeGeometry.tubePattern,
      shellSideCalc.Jc || 1,
      shellSideCalc.Jl || 1,
      shellSideCalc.Jb || 1,
      shellSideCalc.Jr || 1,
      shellSideCalc.Js || 1
    );

    // Calculate overall U from individual coefficients
    // 1/U = 1/ho + Rfo + (Do×ln(Do/Di))/(2×k_tube) + Rfi×(Do/Di) + (1/hi)×(Do/Di)
    const tubeWallResistance = (Do * Math.log(Do / Di)) / (2 * tubeK);
    const calculatedU = 1 / (
      1 / (shellHTC.h || 1) + 
      Rfo + 
      tubeWallResistance + 
      Rfi * (Do / Di) + 
      (1 / (tubeHTC.h || 1)) * (Do / Di)
    );

    const cleanU = U;
    const fouledU = 1 / (1/U + Rfo + Rfi);

    // Vibration analysis
    const vibration = calculateVibrationAnalysis(
      shellSideCalc.velocity,
      rhoHot,
      Do,
      tubePitch,
      tubeGeometry.tubePattern,
      tubeE,
      tubeDensity,
      wallThickness,
      unsupportedLength,
      shellDiameter
    );

    let ntu: number;
    let effectiveness: number;
    
    if (calculationMode === "design" && !isNaN(U)) {
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
        fouledU,
        Jc: shellSideCalc.Jc,
        Jl: shellSideCalc.Jl,
        Jb: shellSideCalc.Jb,
        Jr: shellSideCalc.Jr,
        Js: shellSideCalc.Js,
        numberOfBaffles: shellSideCalc.numberOfBaffles,
        equivalentDiameter: shellSideCalc.equivalentDiameter,
        hi: tubeHTC.h,
        ho: shellHTC.h,
        tubeNusselt: tubeHTC.Nu,
        shellNusselt: shellHTC.Nu,
        calculatedU,
        vibration
      });
    } else if (calculationMode === "rating" && !isNaN(A) && !isNaN(U)) {
      ntu = (fouledU * A) / (Cmin * 1000);
      
      if (flowArrangement === "parallel") {
        effectiveness = calculateEffectivenessParallel(ntu, Cr);
      } else {
        effectiveness = calculateEffectivenessCounter(ntu, Cr);
      }

      const Qmax = Cmin * (ThiK - TciK);
      const Qactual = effectiveness * Qmax;

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
        fouledU,
        Jc: shellSideCalc.Jc,
        Jl: shellSideCalc.Jl,
        Jb: shellSideCalc.Jb,
        Jr: shellSideCalc.Jr,
        Js: shellSideCalc.Js,
        numberOfBaffles: shellSideCalc.numberOfBaffles,
        equivalentDiameter: shellSideCalc.equivalentDiameter,
        hi: tubeHTC.h,
        ho: shellHTC.h,
        tubeNusselt: tubeHTC.Nu,
        shellNusselt: shellHTC.Nu,
        calculatedU,
        vibration
      });
    }
  }, [hotFluid, coldFluid, overallU, area, flowArrangement, calculationMode, tempUnit, hotFouling, coldFouling, tubeGeometry, shellSideMethod, toKelvin, fromKelvin, calculateCorrectionFactor, calculateEffectivenessCounter, calculateEffectivenessParallel, calculateTubeSidePressureDrop, calculateBellDelaware, calculateKernShellSide, calculateTubeSideHTC, calculateShellSideHTC, calculateVibrationAnalysis]);

  // Auto-update fluid properties when selection or temperature changes
  const updateFluidFromDatabase = useCallback((fluidKey: string, avgTemp: number, setFluid: (f: FluidInputs) => void, currentFluid: FluidInputs) => {
    if (fluidKey === "custom") return;
    const props = getFluidProperties(fluidKey, avgTemp);
    if (props) {
      setFluid({
        ...currentFluid,
        density: props.density.toFixed(1),
        specificHeat: props.specificHeat.toFixed(3),
        viscosity: props.viscosity.toFixed(3),
        thermalConductivity: props.thermalConductivity.toFixed(4),
        prandtl: props.prandtl.toFixed(2)
      });
    }
  }, []);

  useEffect(() => {
    const avgTemp = (parseFloat(hotFluid.inletTemp) + parseFloat(hotFluid.outletTemp)) / 2;
    if (!isNaN(avgTemp) && hotFluidType !== "custom") {
      updateFluidFromDatabase(hotFluidType, avgTemp, setHotFluid, hotFluid);
    }
  }, [hotFluidType]);

  useEffect(() => {
    const avgTemp = (parseFloat(coldFluid.inletTemp) + parseFloat(coldFluid.outletTemp)) / 2;
    if (!isNaN(avgTemp) && coldFluidType !== "custom") {
      updateFluidFromDatabase(coldFluidType, avgTemp, setColdFluid, coldFluid);
    }
  }, [coldFluidType]);

  // ASME calculation effect
  useEffect(() => {
    const P = parseFloat(designPressure);
    const CA = parseFloat(corrosionAllowance);
    const E = parseFloat(jointEfficiency);
    const shellDia = parseFloat(tubeGeometry.shellDiameter);
    const tubeOD = parseFloat(tubeGeometry.outerDiameter);
    const pitch = parseFloat(tubeGeometry.tubePitch);
    const designTemp = Math.max(parseFloat(hotFluid.inletTemp), parseFloat(coldFluid.inletTemp));
    
    if ([P, CA, E, shellDia, tubeOD, pitch, designTemp].some(isNaN)) return;
    
    // Convert barg to MPa: barg / 10 = MPa (approximately)
    const pressureMPa = P / 10;
    const result = calculateASMEThickness(shellDia, tubeOD, pitch, pressureMPa, designTemp, CA, shellMaterial, E);
    setAsmeResults(result);
  }, [designPressure, corrosionAllowance, shellMaterial, jointEfficiency, tubeGeometry.shellDiameter, tubeGeometry.outerDiameter, tubeGeometry.tubePitch, hotFluid.inletTemp, coldFluid.inletTemp]);

  // PDF Export handler
  const handleExportPDF = useCallback(() => {
    if (!results) {
      toast({ title: "No results", description: "Calculate results first before exporting", variant: "destructive" });
      return;
    }
    const data: DatasheetData = {
      companyName,
      projectName,
      itemNumber,
      revisionNo,
      date: new Date().toLocaleDateString(),
      hotFluid: {
        name: fluidDatabase[hotFluidType]?.name || "Custom Fluid",
        inletTemp: parseFloat(hotFluid.inletTemp), outletTemp: parseFloat(hotFluid.outletTemp),
        flowRate: parseFloat(hotFluid.flowRate), density: parseFloat(hotFluid.density),
        viscosity: parseFloat(hotFluid.viscosity), specificHeat: parseFloat(hotFluid.specificHeat),
        thermalConductivity: parseFloat(hotFluid.thermalConductivity), prandtl: parseFloat(hotFluid.prandtl),
        foulingFactor: parseFloat(hotFouling)
      },
      coldFluid: {
        name: fluidDatabase[coldFluidType]?.name || "Custom Fluid",
        inletTemp: parseFloat(coldFluid.inletTemp), outletTemp: parseFloat(coldFluid.outletTemp),
        flowRate: parseFloat(coldFluid.flowRate), density: parseFloat(coldFluid.density),
        viscosity: parseFloat(coldFluid.viscosity), specificHeat: parseFloat(coldFluid.specificHeat),
        thermalConductivity: parseFloat(coldFluid.thermalConductivity), prandtl: parseFloat(coldFluid.prandtl),
        foulingFactor: parseFloat(coldFouling)
      },
      heatDuty: results.heatDuty, lmtd: results.lmtd, correctionFactor: results.correctionFactor,
      effectiveLmtd: results.effectiveLmtd, overallU: parseFloat(overallU), calculatedU: results.calculatedU,
      requiredArea: results.requiredArea, ntu: results.ntu, effectiveness: results.effectiveness,
      hi: results.hi, ho: results.ho, tubeNusselt: results.tubeNusselt, shellNusselt: results.shellNusselt,
      shellDiameter: parseFloat(tubeGeometry.shellDiameter), shellLength: parseFloat(tubeGeometry.tubeLength),
      tubeOD: parseFloat(tubeGeometry.outerDiameter), tubeWallThickness: parseFloat(tubeGeometry.wallThickness),
      tubeLength: parseFloat(tubeGeometry.tubeLength), numberOfTubes: parseInt(tubeGeometry.numberOfTubes),
      tubePitch: parseFloat(tubeGeometry.tubePitch), tubePattern: tubeGeometry.tubePattern,
      tubePasses: parseInt(tubeGeometry.tubePasses), baffleSpacing: parseFloat(tubeGeometry.baffleSpacing),
      baffleCut: parseFloat(tubeGeometry.baffleCut), numberOfBaffles: results.numberOfBaffles,
      tubeMaterial: tubeGeometry.tubeMaterial,
      tubeSidePressureDrop: results.tubeSidePressureDrop, shellSidePressureDrop: results.shellSidePressureDrop,
      tubeSideVelocity: results.tubeSideVelocity, shellSideVelocity: results.shellSideVelocity,
      tubeReynolds: results.tubeReynolds, shellReynolds: results.shellReynolds,
      naturalFrequency: results.vibration.naturalFrequency, vortexFrequency: results.vibration.vortexSheddingFrequency,
      criticalVelocity: results.vibration.criticalVelocity, vibrationStatus: results.vibration.isVibrationRisk ? "WARNING" : "OK",
      shellThickness: asmeResults?.shellRecommended, headThickness: asmeResults?.headThicknessWithCA,
      tubesheetThickness: asmeResults?.tubesheetThickness, flangeClass: asmeResults?.flangeClass,
      designPressure: parseFloat(designPressure) / 10, // Convert barg to MPa for PDF
      designTemperature: Math.max(parseFloat(hotFluid.inletTemp), parseFloat(coldFluid.inletTemp)),
      hydroTestPressure: asmeResults?.hydroTestPressure, shellMaterial: asmeMaterials[shellMaterial]?.name,
      shellSideMethod: shellSideMethod === "bell-delaware" ? "Bell-Delaware" : "Kern's Method",
      tempUnit: getTempUnitLabel()
    };
    generateDatasheetPDF(data);
    toast({ title: "PDF Generated", description: "Datasheet downloaded successfully" });
  }, [results, asmeResults, hotFluid, coldFluid, hotFluidType, coldFluidType, hotFouling, coldFouling, overallU, tubeGeometry, designPressure, shellMaterial, shellSideMethod, companyName, projectName, itemNumber, revisionNo]);

  // Save design handler
  const handleSaveDesign = useCallback(() => {
    if (!results) {
      toast({ title: "No results", description: "Calculate results first", variant: "destructive" });
      return;
    }
    const design: SavedDesign = {
      id: Date.now().toString(),
      name: `Design ${savedDesigns.length + 1}`,
      timestamp: new Date(),
      shellDiameter: parseFloat(tubeGeometry.shellDiameter),
      tubeOD: parseFloat(tubeGeometry.outerDiameter),
      tubeLength: parseFloat(tubeGeometry.tubeLength),
      numberOfTubes: parseInt(tubeGeometry.numberOfTubes),
      tubePasses: parseInt(tubeGeometry.tubePasses),
      tubePitch: parseFloat(tubeGeometry.tubePitch),
      tubePattern: tubeGeometry.tubePattern,
      baffleSpacing: parseFloat(tubeGeometry.baffleSpacing),
      baffleCut: parseFloat(tubeGeometry.baffleCut),
      heatDuty: results.heatDuty,
      requiredArea: results.requiredArea,
      actualArea: results.heatTransferArea,
      overallU: parseFloat(overallU),
      calculatedU: results.calculatedU,
      effectiveness: results.effectiveness,
      tubeSidePressureDrop: results.tubeSidePressureDrop,
      shellSidePressureDrop: results.shellSidePressureDrop,
      tubeSideVelocity: results.tubeSideVelocity,
      shellSideVelocity: results.shellSideVelocity,
      hi: results.hi,
      ho: results.ho,
      isVibrationRisk: results.vibration.isVibrationRisk,
      shellThickness: asmeResults?.shellRecommended,
      shellMaterial: asmeMaterials[shellMaterial]?.name
    };
    setSavedDesigns(prev => [...prev, design]);
    toast({ title: "Design Saved", description: `Saved as ${design.name}` });
  }, [results, asmeResults, tubeGeometry, overallU, shellMaterial, savedDesigns.length]);

  // TEMA auto-calculate geometry
  const handleAutoCalculateGeometry = useCallback(() => {
    const tubeOD = parseFloat(tubeGeometry.outerDiameter);
    const shellDia = parseFloat(tubeGeometry.shellDiameter);
    const passes = parseInt(tubeGeometry.tubePasses);
    const pattern = tubeGeometry.tubePattern as "triangular" | "square" | "rotatedSquare";
    
    // Get recommended pitch
    const pitchResult = getRecommendedPitch(tubeOD, pattern, pattern === "square");
    
    // Calculate tube count
    const tubeCountResult = calculateTubeCount(shellDia, tubeOD, pitchResult.pitch, pattern, passes);
    
    // Get recommended baffle spacing
    const baffleResult = getRecommendedBaffleSpacing(shellDia, parseFloat(tubeGeometry.tubeLength));
    
    setTubeGeometry(prev => ({
      ...prev,
      tubePitch: pitchResult.pitch.toFixed(2),
      numberOfTubes: tubeCountResult.count.toString(),
      baffleSpacing: baffleResult.recommended.toString(),
      unsupportedSpanLength: baffleResult.recommended.toString()
    }));
    
    toast({ 
      title: "Geometry Calculated", 
      description: `${tubeCountResult.count} tubes @ ${pitchResult.pitch.toFixed(1)}mm pitch (${tubeCountResult.method})`
    });
  }, [tubeGeometry]);

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
              className="h-9 no-spinner"
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
              className="h-9 no-spinner"
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
              className="h-9 no-spinner"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cp (kJ/kg·K)</Label>
            <Input
              type="number"
              step="0.01"
              value={fluid.specificHeat}
              onChange={(e) => setFluid({ ...fluid, specificHeat: e.target.value })}
              className="h-9 no-spinner"
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
              className="h-9 no-spinner"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Viscosity (cP)</Label>
            <Input
              type="number"
              step="0.01"
              value={fluid.viscosity}
              onChange={(e) => setFluid({ ...fluid, viscosity: e.target.value })}
              className="h-9 no-spinner"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">k (W/m·K)</Label>
            <Input
              type="number"
              step="0.01"
              value={fluid.thermalConductivity}
              onChange={(e) => setFluid({ ...fluid, thermalConductivity: e.target.value })}
              className="h-9 no-spinner"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Prandtl (Pr)</Label>
            <Input
              type="number"
              step="0.01"
              value={fluid.prandtl}
              onChange={(e) => setFluid({ ...fluid, prandtl: e.target.value })}
              className="h-9 no-spinner"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Mode and Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                ? "Calculate required area"
                : "Calculate performance"}
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
            <Label className="text-xs text-muted-foreground">Shell-Side Method</Label>
            <Select value={shellSideMethod} onValueChange={(v) => setShellSideMethod(v as ShellSideMethod)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bell-delaware">Bell-Delaware</SelectItem>
                <SelectItem value="kern">Kern's Method</SelectItem>
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

      {/* Fluid Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-4 h-4 text-red-500" />
              Hot Fluid Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={hotFluidType} onValueChange={setHotFluidType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select fluid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom (Manual Entry)</SelectItem>
                {Object.entries(getFluidsByCategory()).map(([category, fluids]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{category}</div>
                    {fluids.map(f => (
                      <SelectItem key={f.key} value={f.key}>{f.name}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {hotFluidType !== "custom" && (
              <p className="text-xs text-muted-foreground mt-2">Properties auto-calculated at avg temp</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              Cold Fluid Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={coldFluidType} onValueChange={setColdFluidType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select fluid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom (Manual Entry)</SelectItem>
                {Object.entries(getFluidsByCategory()).map(([category, fluids]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{category}</div>
                    {fluids.map(f => (
                      <SelectItem key={f.key} value={f.key}>{f.name}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {coldFluidType !== "custom" && (
              <p className="text-xs text-muted-foreground mt-2">Properties auto-calculated at avg temp</p>
            )}
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
                className="h-9 no-spinner"
              />
            </div>
            {calculationMode === "rating" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Area (m²)</Label>
                <Input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-9 no-spinner"
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
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cold Fouling (m²·K/W)</Label>
              <Input
                type="number"
                step="0.0001"
                value={coldFouling}
                onChange={(e) => setColdFouling(e.target.value)}
                className="h-9 no-spinner"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tube Geometry */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Tube Geometry (TEMA Standards)
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={handleAutoCalculateGeometry}
              >
                <Grid3X3 className="w-3 h-3" />
                Auto-Calculate (TEMA)
              </Button>
              {getSuggestedTubeCount && (
                <>
                  <span className="text-xs text-muted-foreground">
                    Table: {getSuggestedTubeCount.count} tubes
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={applySuggestedTubeCount}
                  >
                    Apply
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TEMA Table Selector */}
          <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">TEMA Tube Count Table</Label>
                <Select 
                  value={selectedTemaTable} 
                  onValueChange={(value) => {
                    setSelectedTemaTable(value);
                    // Find the selected table and update tube geometry
                    const table = allTubeCountTables.find(t => t.name === value);
                    if (table) {
                      setTubeGeometry(prev => ({
                        ...prev,
                        outerDiameter: table.tubeOD.toString(),
                        tubePitch: table.tubePitch.toString()
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select tube size" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTubeCountTables.map(table => (
                      <SelectItem key={table.name} value={table.name}>
                        {table.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Available sizes:</span> 5/8", 3/4", 1", 1-1/4", 1-1/2" OD
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube OD (mm)</Label>
              <Input
                type="number"
                step="0.01"
                value={tubeGeometry.outerDiameter}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, outerDiameter: e.target.value })}
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Wall Thickness (mm)</Label>
              <Input
                type="number"
                step="0.01"
                value={tubeGeometry.wallThickness}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, wallThickness: e.target.value })}
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube Length (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={tubeGeometry.tubeLength}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, tubeLength: e.target.value })}
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Number of Tubes</Label>
              <Input
                type="number"
                value={tubeGeometry.numberOfTubes}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, numberOfTubes: e.target.value })}
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube Pitch (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={tubeGeometry.tubePitch}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, tubePitch: e.target.value })}
                className="h-9 no-spinner"
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
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Baffle Spacing (mm)</Label>
              <Input
                type="number"
                value={tubeGeometry.baffleSpacing}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, baffleSpacing: e.target.value })}
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Baffle Cut (%)</Label>
              <Input
                type="number"
                value={tubeGeometry.baffleCut}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, baffleCut: e.target.value })}
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tube Material</Label>
              <Select value={tubeGeometry.tubeMaterial} onValueChange={(v) => setTubeGeometry({ ...tubeGeometry, tubeMaterial: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carbon-steel">Carbon Steel</SelectItem>
                  <SelectItem value="stainless-304">Stainless 304</SelectItem>
                  <SelectItem value="stainless-316">Stainless 316</SelectItem>
                  <SelectItem value="copper">Copper</SelectItem>
                  <SelectItem value="admiralty-brass">Admiralty Brass</SelectItem>
                  <SelectItem value="titanium">Titanium</SelectItem>
                  <SelectItem value="inconel-600">Inconel 600</SelectItem>
                  <SelectItem value="monel-400">Monel 400</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Unsupported Span (mm)</Label>
              <Input
                type="number"
                value={tubeGeometry.unsupportedSpanLength}
                onChange={(e) => setTubeGeometry({ ...tubeGeometry, unsupportedSpanLength: e.target.value })}
                className="h-9 no-spinner"
              />
            </div>
            {shellSideMethod === "bell-delaware" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Shell-Baffle Clearance (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tubeGeometry.shellBaffleLeakage}
                    onChange={(e) => setTubeGeometry({ ...tubeGeometry, shellBaffleLeakage: e.target.value })}
                    className="h-9 no-spinner"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tube-Baffle Clearance (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tubeGeometry.tubeBaffleLeakage}
                    onChange={(e) => setTubeGeometry({ ...tubeGeometry, tubeBaffleLeakage: e.target.value })}
                    className="h-9 no-spinner"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Results
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {calculationMode === "design" ? "Design Mode" : "Rating Mode"}
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                {shellSideMethod === "bell-delaware" ? "Bell-Delaware" : "Kern"}
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

            {/* Heat Transfer Coefficients */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Thermometer className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Heat Transfer Coefficients (Nusselt-Based)</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground">hi (Tube)</p>
                  <p className="text-lg font-semibold text-blue-400">
                    {formatNumber(results.hi)} <span className="text-sm font-normal">W/m²K</span>
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-muted-foreground">ho (Shell)</p>
                  <p className="text-lg font-semibold text-red-400">
                    {formatNumber(results.ho)} <span className="text-sm font-normal">W/m²K</span>
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Nu (Tube)</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.tubeNusselt, 1)}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Nu (Shell)</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.shellNusselt, 1)}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">Calculated U</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatNumber(results.calculatedU)} <span className="text-sm font-normal">W/m²K</span>
                  </p>
                </div>
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

            {/* U Values and Geometry */}
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
                <p className="text-xs text-muted-foreground">Number of Baffles</p>
                <p className="text-lg font-semibold">
                  {results.numberOfBaffles}
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Equiv. Diameter</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.equivalentDiameter * 1000, 2)} <span className="text-sm font-normal">mm</span>
                </p>
              </div>
            </div>

            {/* Bell-Delaware Correction Factors */}
            {shellSideMethod === "bell-delaware" && results.Jc !== undefined && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Bell-Delaware Correction Factors</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-1 p-3 rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground">Jc (Baffle Cut)</p>
                      <p className="text-lg font-semibold">
                        {formatNumber(results.Jc, 3)}
                      </p>
                    </div>
                    <div className="space-y-1 p-3 rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground">Jl (Leakage)</p>
                      <p className="text-lg font-semibold">
                        {formatNumber(results.Jl!, 3)}
                      </p>
                    </div>
                    <div className="space-y-1 p-3 rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground">Jb (Bypass)</p>
                      <p className="text-lg font-semibold">
                        {formatNumber(results.Jb!, 3)}
                      </p>
                    </div>
                    <div className="space-y-1 p-3 rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground">Jr (Temp Grad)</p>
                      <p className="text-lg font-semibold">
                        {formatNumber(results.Jr!, 3)}
                      </p>
                    </div>
                    <div className="space-y-1 p-3 rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground">Js (Spacing)</p>
                      <p className="text-lg font-semibold">
                        {formatNumber(results.Js!, 3)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Pressure Drop Results */}
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Pressure Drop ({shellSideMethod === "bell-delaware" ? "Bell-Delaware" : "Kern's"} Method)</p>
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

            {/* Vibration Analysis */}
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Flow-Induced Vibration Analysis (TEMA)</p>
              </div>
              
              {results.vibration.isVibrationRisk && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Vibration Warning</AlertTitle>
                  <AlertDescription>
                    {results.vibration.vibrationMessage}
                  </AlertDescription>
                </Alert>
              )}
              
              {!results.vibration.isVibrationRisk && (
                <Alert className="mb-4 border-green-500/50 bg-green-500/10">
                  <Activity className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Design OK</AlertTitle>
                  <AlertDescription className="text-green-400">
                    {results.vibration.vibrationMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Natural Freq (fn)</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.vibration.naturalFrequency, 1)} <span className="text-sm font-normal">Hz</span>
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Vortex Shed Freq</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.vibration.vortexSheddingFrequency, 1)} <span className="text-sm font-normal">Hz</span>
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Freq Ratio (fvs/fn)</p>
                  <p className={`text-lg font-semibold ${results.vibration.frequencyRatio > 0.7 && results.vibration.frequencyRatio < 1.3 ? 'text-destructive' : ''}`}>
                    {formatNumber(results.vibration.frequencyRatio, 3)}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Critical Velocity</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.vibration.criticalVelocity)} <span className="text-sm font-normal">m/s</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Reduced Velocity (Vr)</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.vibration.reducedVelocity, 3)}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Damage Number</p>
                  <p className={`text-lg font-semibold ${results.vibration.damageNumber > 0.5 ? 'text-destructive' : ''}`}>
                    {formatNumber(results.vibration.damageNumber, 3)}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Acoustic Freq (fa)</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(results.vibration.acousticResonanceFrequency, 0)} <span className="text-sm font-normal">Hz</span>
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

      {/* HTRI-Style Rating Summary */}
      {results && (
        <HTRIRatingSummary
          enabled={htriEnabled}
          onToggle={setHtriEnabled}
          allowedPressureDropTube={allowedDPTube}
          allowedPressureDropShell={allowedDPShell}
          onAllowedDPTubeChange={setAllowedDPTube}
          onAllowedDPShellChange={setAllowedDPShell}
          data={{
            heatDutyRequired: results.heatDuty,
            heatDutyActual: results.heatDuty * (1 + (results.requiredArea > 0 ? (results.heatTransferArea - results.requiredArea) / results.requiredArea : 0)),
            overdesign: results.requiredArea > 0 ? ((results.heatTransferArea - results.requiredArea) / results.requiredArea) * 100 : 0,
            hotInlet: parseFloat(hotFluid.inletTemp),
            hotOutlet: results.hotOutletCalc ?? parseFloat(hotFluid.outletTemp),
            coldInlet: parseFloat(coldFluid.inletTemp),
            coldOutlet: results.coldOutletCalc ?? parseFloat(coldFluid.outletTemp),
            tempUnit: getTempUnitLabel(),
            hotApproach: (results.hotOutletCalc ?? parseFloat(hotFluid.outletTemp)) - parseFloat(coldFluid.inletTemp),
            coldApproach: parseFloat(hotFluid.inletTemp) - (results.coldOutletCalc ?? parseFloat(coldFluid.outletTemp)),
            lmtd: results.lmtd,
            correctionFactor: results.correctionFactor,
            effectiveMTD: results.effectiveLmtd,
            hi: results.hi,
            ho: results.ho,
            Uc: results.cleanU,
            Uf: results.fouledU,
            Ur: results.requiredArea > 0 ? results.heatDuty * 1000 / (results.requiredArea * results.effectiveLmtd) : 0,
            areaRequired: results.requiredArea,
            areaAvailable: results.heatTransferArea,
            areaExcess: results.requiredArea > 0 ? ((results.heatTransferArea - results.requiredArea) / results.requiredArea) * 100 : 0,
            foulingHot: parseFloat(hotFouling),
            foulingCold: parseFloat(coldFouling),
            cleanlinessFactorHot: results.cleanU > 0 ? (results.fouledU / results.cleanU) * 100 : 0,
            cleanlinessFactorCold: results.cleanU > 0 ? (results.fouledU / results.cleanU) * 100 : 0,
            overallCleanliness: results.cleanU > 0 ? (results.fouledU / results.cleanU) * 100 : 0,
            tubeSideDPAllowed: parseFloat(allowedDPTube),
            tubeSideDPCalc: results.tubeSidePressureDrop,
            shellSideDPAllowed: parseFloat(allowedDPShell),
            shellSideDPCalc: results.shellSidePressureDrop,
            tubeSideVelocity: results.tubeSideVelocity,
            shellSideVelocity: results.shellSideVelocity,
            tubeReynolds: results.tubeReynolds,
            shellReynolds: results.shellReynolds,
            isVibrationRisk: results.vibration.isVibrationRisk,
            vibrationMessage: results.vibration.vibrationMessage,
            ntu: results.ntu,
            effectiveness: results.effectiveness,
          }}
        />
      )}

      {/* ASME Mechanical Design */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Mechanical Design (ASME Section VIII Div.1)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Design Pressure (barg)</Label>
              <Input
                type="number"
                step="1"
                value={designPressure}
                onChange={(e) => setDesignPressure(e.target.value)}
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Corrosion Allow. (mm)</Label>
              <Input
                type="number"
                step="0.5"
                value={corrosionAllowance}
                onChange={(e) => setCorrosionAllowance(e.target.value)}
                className="h-9 no-spinner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Shell Material</Label>
              <Select value={shellMaterial} onValueChange={setShellMaterial}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMaterialOptions().map(m => (
                    <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Joint Efficiency</Label>
              <Select value={jointEfficiency} onValueChange={setJointEfficiency}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.0">1.0 (Full RT)</SelectItem>
                  <SelectItem value="0.85">0.85 (Spot RT)</SelectItem>
                  <SelectItem value="0.7">0.7 (No RT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {asmeResults && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Shell Thickness</p>
                <p className="text-lg font-semibold text-primary">
                  {asmeResults.shellRecommended} <span className="text-sm font-normal">mm</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Head Thickness</p>
                <p className="text-lg font-semibold">
                  {asmeResults.headThicknessWithCA.toFixed(1)} <span className="text-sm font-normal">mm</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Tubesheet Thickness</p>
                <p className="text-lg font-semibold">
                  {asmeResults.tubesheetThickness.toFixed(0)} <span className="text-sm font-normal">mm</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Flange Class</p>
                <p className="text-lg font-semibold">
                  {asmeResults.flangeClass}
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">MAWP</p>
                <p className="text-lg font-semibold">
                  {(asmeResults.shellMAWP * 10).toFixed(1)} <span className="text-sm font-normal">barg</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Hydro Test Pressure</p>
                <p className="text-lg font-semibold">
                  {(asmeResults.hydroTestPressure * 10).toFixed(1)} <span className="text-sm font-normal">barg</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Allowable Stress</p>
                <p className="text-lg font-semibold">
                  {asmeResults.allowableStress.toFixed(0)} <span className="text-sm font-normal">MPa</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Min Tube Thickness</p>
                <p className="text-lg font-semibold">
                  {asmeResults.tubeMinThickness.toFixed(2)} <span className="text-sm font-normal">mm</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Export Settings & Actions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            Export & Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Company Name</Label>
              <Input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-9"
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project Name</Label>
              <Input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-9"
                placeholder="Project Name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Item Number</Label>
              <Input
                type="text"
                value={itemNumber}
                onChange={(e) => setItemNumber(e.target.value)}
                className="h-9"
                placeholder="HX-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Revision No.</Label>
              <Input
                type="text"
                value={revisionNo}
                onChange={(e) => setRevisionNo(e.target.value)}
                className="h-9"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExportPDF} className="gap-2">
              <Download className="w-4 h-4" />
              Export PDF Datasheet
            </Button>
            <Button onClick={handleSaveDesign} variant="outline" className="gap-2">
              <Save className="w-4 h-4" />
              Save Design
            </Button>
            <Button 
              onClick={() => setShowComparison(!showComparison)} 
              variant={showComparison ? "secondary" : "outline"} 
              className="gap-2"
            >
              <GitCompare className="w-4 h-4" />
              {showComparison ? "Hide Comparison" : "Compare Designs"} ({savedDesigns.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Design Comparison */}
      {showComparison && (
        <DesignComparison 
          savedDesigns={savedDesigns}
          onDeleteDesign={(id) => setSavedDesigns(prev => prev.filter(d => d.id !== id))}
          onClearAll={() => setSavedDesigns([])}
        />
      )}

      {/* Tube Bundle Visualization */}
      <TubeBundleVisualization
        shellDiameter={parseFloat(tubeGeometry.shellDiameter) || 600}
        tubeOD={parseFloat(tubeGeometry.outerDiameter) || 19.05}
        tubePitch={parseFloat(tubeGeometry.tubePitch) || 25.4}
        numberOfTubes={parseInt(tubeGeometry.numberOfTubes) || 200}
        tubePattern={tubeGeometry.tubePattern}
        tubePasses={parseInt(tubeGeometry.tubePasses) || 2}
        baffleCut={parseFloat(tubeGeometry.baffleCut) || 25}
      />

      {/* Reference Tables */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="tube-count" className="border-border/50">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-primary" />
              TEMA Tube Count Tables (3/4" OD on 1" pitch)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Shell ID (mm)</TableHead>
                    <TableHead className="text-xs">1-Pass Tri</TableHead>
                    <TableHead className="text-xs">1-Pass Sq</TableHead>
                    <TableHead className="text-xs">2-Pass Tri</TableHead>
                    <TableHead className="text-xs">2-Pass Sq</TableHead>
                    <TableHead className="text-xs">4-Pass Tri</TableHead>
                    <TableHead className="text-xs">4-Pass Sq</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(temaTubeCountTable).slice(0, 12).map(([shellId, passes]) => (
                    <TableRow key={shellId}>
                      <TableCell className="text-xs font-mono">{shellId}</TableCell>
                      <TableCell className="text-xs">{passes[1].triangular}</TableCell>
                      <TableCell className="text-xs">{passes[1].square}</TableCell>
                      <TableCell className="text-xs">{passes[2].triangular}</TableCell>
                      <TableCell className="text-xs">{passes[2].square}</TableCell>
                      <TableCell className="text-xs">{passes[4].triangular}</TableCell>
                      <TableCell className="text-xs">{passes[4].square}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>

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
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">LMTD (Log Mean Temperature Difference)</p>
                <p className="font-mono text-muted-foreground">LMTD = (ΔT₁ - ΔT₂) / ln(ΔT₁/ΔT₂)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Dittus-Boelter (Tube-Side Nu, Re {'>'} 10000)</p>
                <p className="font-mono text-muted-foreground">Nu = 0.023 × Re^0.8 × Pr^n</p>
                <p className="text-muted-foreground mt-1">n = 0.4 (heating), n = 0.3 (cooling)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Gnielinski (Transition, 2300 {'<'} Re {'<'} 10^6)</p>
                <p className="font-mono text-muted-foreground text-[10px]">Nu = (f/8)(Re-1000)Pr / [1 + 12.7(f/8)^0.5(Pr^(2/3)-1)]</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Shell-Side j-Factor (Bell-Delaware)</p>
                <p className="font-mono text-muted-foreground">j = 0.321 × Re^(-0.388) (triangular, Re {'>'} 10000)</p>
                <p className="font-mono text-muted-foreground mt-1">h = j × Cp × Gs × Pr^(-2/3) × Jc × Jl × Jb × Jr × Js</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Overall U from Individual Coefficients</p>
                <p className="font-mono text-muted-foreground text-[10px]">1/U = 1/ho + Rfo + (Do×ln(Do/Di))/(2×k) + Rfi×(Do/Di) + (1/hi)×(Do/Di)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Natural Frequency (TEMA Vibration)</p>
                <p className="font-mono text-muted-foreground">fn = (Cn/2π) × √(E×I / (m×L⁴))</p>
                <p className="text-muted-foreground mt-1">Cn = 22.4 for fixed-fixed supports</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Vortex Shedding Frequency (Strouhal)</p>
                <p className="font-mono text-muted-foreground">fvs = St × V / D</p>
                <p className="text-muted-foreground mt-1">St ≈ 0.2 (triangular), 0.25 (square)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Critical Velocity (Connors)</p>
                <p className="font-mono text-muted-foreground">Vcrit = K × fn × D × √(m×δ / (ρ×D²))</p>
                <p className="text-muted-foreground mt-1">K = 2.4 (triangular), 3.4 (square); δ ≈ 0.03 (damping)</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium mb-2">NTU-Effectiveness (Kays & London)</p>
                <p className="font-mono text-muted-foreground">NTU = U×A / Cmin</p>
                <p className="font-mono text-muted-foreground mt-1">ε = (1 - exp(-NTU(1-Cr))) / (1 - Cr×exp(-NTU(1-Cr)))</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default HeatExchangerSizing;
