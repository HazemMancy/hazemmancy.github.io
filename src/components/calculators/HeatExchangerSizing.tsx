import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer, ArrowRight, Info, BookOpen, Settings, Gauge, Grid3X3, AlertTriangle, Activity, Download, Database, Shield, Droplets, Save, GitCompare, FileSpreadsheet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import HeatExchangerGuide from "./guides/HeatExchangerGuide";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fluidDatabase, getFluidProperties, getFluidsByCategory } from "@/lib/fluidProperties";
import { calculateASMEThickness, asmeMaterials, getMaterialOptions, type ASMEResults } from "@/lib/asmeCalculations";
import { generateDatasheetPDF, type DatasheetData } from "@/lib/pdfDatasheet";
import { calculateTubeCount, calculateShellDiameter, getRecommendedPitch, getRecommendedBaffleSpacing, getAvailableTubeCountTables, allTubeCountTables, standardTubeSizes, type TubeCountTable } from "@/lib/temaGeometry";
import { toast } from "@/hooks/use-toast";
import TubeBundleVisualization from "./TubeBundleVisualization";
import DesignComparison, { type SavedDesign } from "./DesignComparison";
import { HTRIRatingSummary, type HTRIRatingData } from "./HTRIRatingSummary";
import { generateExcelDatasheet, type ExcelDatasheetData, unitConversions } from "@/lib/excelDatasheet";
import {
  toKelvin,
  fromKelvin,
  calculateTubeSideHTC,
  calculateShellSideHTC,
  calculateVibrationAnalysis,
  calculateCorrectionFactor,
  calculateEffectivenessCounter,
  calculateEffectivenessParallel,
  calculateTubeSidePressureDrop,
  calculateBellDelaware,
  calculateKernShellSide,
  type VibrationResults
} from "@/lib/heatExchangerCalculations";

type CalculationMode = "design" | "rating";
type FlowArrangement = "counter" | "parallel" | "shell-tube-1-2" | "shell-tube-1-4" | "crossflow-unmixed" | "crossflow-mixed";
type TemperatureUnit = "C" | "F" | "K";
type ShellSideMethod = "kern" | "bell-delaware";
type UnitSystem = "metric" | "imperial";

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

type ShellType = "fixed-tubesheet" | "u-tube" | "floating-head" | "kettle";

// Bundle clearances per TEMA (mm) for different shell types
const shellTypeClearances: Record<ShellType, { name: string; clearance: number; description: string }> = {
  "fixed-tubesheet": { name: "Fixed Tubesheet (L/M/N)", clearance: 12, description: "Tubes welded to both tubesheets" },
  "u-tube": { name: "U-Tube (U)", clearance: 25, description: "Tubes bent in U-shape, one tubesheet" },
  "floating-head": { name: "Floating Head (P/S/T/W)", clearance: 45, description: "One tubesheet floats, allows thermal expansion" },
  "kettle": { name: "Kettle Reboiler (K)", clearance: 50, description: "Large shell for vapor disengagement" },
};

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

  // Shell type selector
  const [shellType, setShellType] = useState<ShellType>("fixed-tubesheet");

  // HTRI Rating Summary state
  const [htriEnabled, setHtriEnabled] = useState(false);
  const [allowedDPTube, setAllowedDPTube] = useState("50");
  const [allowedDPShell, setAllowedDPShell] = useState("50");

  // Unit system
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

  // Reference table selector
  const [selectedTemaRefTable, setSelectedTemaRefTable] = useState("3/4\" OD on 1\" pitch (standard)");

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

  // Get suggested tube count from selected TEMA table
  const getSuggestedTubeCount = useMemo(() => {
    // Find the selected TEMA table
    const selectedTable = allTubeCountTables.find(t => t.name === selectedTemaTable);
    if (!selectedTable) return null;

    const shellDia = parseFloat(tubeGeometry.shellDiameter);
    const passes = parseInt(tubeGeometry.tubePasses);
    const pattern = tubeGeometry.tubePattern === "triangular" ? "triangular" : "square";

    // Find closest shell size in the selected table
    const shellSizes = Object.keys(selectedTable.counts).map(Number).sort((a, b) => a - b);
    if (shellSizes.length === 0) return null;

    let closestSize = shellSizes[0];
    let minDiff = Math.abs(shellDia - closestSize);

    for (const size of shellSizes) {
      const diff = Math.abs(shellDia - size);
      if (diff < minDiff) {
        minDiff = diff;
        closestSize = size;
      }
    }

    const passData = selectedTable.counts[closestSize];
    if (!passData) return null;

    const passKey = passes <= 1 ? 1 : passes <= 2 ? 2 : 4;
    const tubeData = passData[passKey];
    if (!tubeData) return null;

    return {
      count: tubeData[pattern],
      shellSize: closestSize,
      pattern,
      passes: passKey,
      tubeOD: selectedTable.tubeOD,
      tubePitch: selectedTable.tubePitch
    };
  }, [selectedTemaTable, tubeGeometry.shellDiameter, tubeGeometry.tubePasses, tubeGeometry.tubePattern]);

  // Apply tube count AND update related geometry from selected TEMA table
  const applySuggestedTubeCount = useCallback(() => {
    if (getSuggestedTubeCount) {
      // Find matching wall thickness from standard tube sizes
      const standardTube = standardTubeSizes.find(t => Math.abs(t.od - getSuggestedTubeCount.tubeOD) < 0.5);

      setTubeGeometry(prev => ({
        ...prev,
        numberOfTubes: getSuggestedTubeCount.count.toString(),
        outerDiameter: getSuggestedTubeCount.tubeOD.toString(),
        tubePitch: getSuggestedTubeCount.tubePitch.toString(),
        wallThickness: standardTube ? standardTube.wall.toString() : prev.wallThickness
      }));

      toast({
        title: "TEMA Table Applied",
        description: `${getSuggestedTubeCount.count} tubes @ ${getSuggestedTubeCount.tubePitch.toFixed(1)}mm pitch`
      });
    }
  }, [getSuggestedTubeCount]);

















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

    const fFactorResult = calculateCorrectionFactor(R, P, flowArrangement);
    const F = fFactorResult.F;
    const fFactorWarning = fFactorResult.warning;
    const fFactorMessage = fFactorResult.message;
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
    const fouledU = 1 / (1 / U + Rfo + Rfi);

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
  }, [hotFluid, coldFluid, overallU, area, flowArrangement, calculationMode, tempUnit, hotFouling, coldFouling, tubeGeometry, shellSideMethod]);

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

  // Live unit conversion effect
  const prevUnitSystem = useRef(unitSystem);
  useEffect(() => {
    if (prevUnitSystem.current === unitSystem) return;

    const fromImperial = prevUnitSystem.current === 'imperial';
    prevUnitSystem.current = unitSystem;

    // Convert tube geometry values
    setTubeGeometry(prev => {
      const convertLength = (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        // mm <-> inches
        return fromImperial
          ? (num * 25.4).toFixed(2)  // in -> mm
          : (num / 25.4).toFixed(3); // mm -> in
      };

      const convertLengthLong = (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        // m <-> ft
        return fromImperial
          ? (num / 3.28084).toFixed(2)  // ft -> m
          : (num * 3.28084).toFixed(2); // m -> ft
      };

      return {
        ...prev,
        outerDiameter: convertLength(prev.outerDiameter),
        wallThickness: convertLength(prev.wallThickness),
        tubePitch: convertLength(prev.tubePitch),
        shellDiameter: convertLength(prev.shellDiameter),
        baffleSpacing: convertLength(prev.baffleSpacing),
        unsupportedSpanLength: convertLength(prev.unsupportedSpanLength),
        shellBaffleLeakage: convertLength(prev.shellBaffleLeakage),
        tubeBaffleLeakage: convertLength(prev.tubeBaffleLeakage),
        tubeLength: convertLengthLong(prev.tubeLength),
      };
    });

    // Convert fluid flow rates
    const convertFlowRate = (val: string) => {
      const num = parseFloat(val);
      if (isNaN(num)) return val;
      // kg/hr <-> lb/hr
      return fromImperial
        ? (num / 2.20462).toFixed(0)  // lb/hr -> kg/hr
        : (num * 2.20462).toFixed(0); // kg/hr -> lb/hr
    };

    const convertDensity = (val: string) => {
      const num = parseFloat(val);
      if (isNaN(num)) return val;
      // kg/m³ <-> lb/ft³
      // Conversion: 1 lb/ft³ = 16.0185 kg/m³ (or 1 kg/m³ = 0.062428 lb/ft³)
      return fromImperial
        ? (num * 16.0185).toFixed(1)   // lb/ft³ -> kg/m³ (multiply by 16.0185)
        : (num * 0.062428).toFixed(3); // kg/m³ -> lb/ft³ (multiply by 0.062428)
    };

    setHotFluid(prev => ({
      ...prev,
      flowRate: convertFlowRate(prev.flowRate),
      density: convertDensity(prev.density),
    }));

    setColdFluid(prev => ({
      ...prev,
      flowRate: convertFlowRate(prev.flowRate),
      density: convertDensity(prev.density),
    }));

  }, [unitSystem]);

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

  // Excel export handler
  const handleExportExcel = useCallback(() => {
    if (!results) {
      toast({ title: "No results", description: "Calculate results first", variant: "destructive" });
      return;
    }

    const tempUnitLabel = getTempUnitLabel();

    const data: ExcelDatasheetData = {
      companyName,
      projectName,
      itemNumber,
      revisionNo,
      date: new Date().toLocaleDateString(),
      temaType: flowArrangement.includes("shell-tube") ? `AES ${tubeGeometry.tubePasses}-Pass` : flowArrangement,
      orientation: "Horizontal",
      surfaceArea: results.heatTransferArea,
      surfaceAreaUnit: unitSystem === 'metric' ? 'm²' : 'ft²',
      shellFluid: hotFluidType === "custom" ? "Hot Fluid" : hotFluidType,
      shellInletTemp: parseFloat(hotFluid.inletTemp),
      shellOutletTemp: results.hotOutletCalc ?? parseFloat(hotFluid.outletTemp),
      shellFlowRate: parseFloat(hotFluid.flowRate),
      shellPressureDrop: results.shellSidePressureDrop,
      shellVelocity: results.shellSideVelocity,
      shellReynolds: results.shellReynolds,
      shellHTC: results.ho,
      tubeFluid: coldFluidType === "custom" ? "Cold Fluid" : coldFluidType,
      tubeInletTemp: parseFloat(coldFluid.inletTemp),
      tubeOutletTemp: results.coldOutletCalc ?? parseFloat(coldFluid.outletTemp),
      tubeFlowRate: parseFloat(coldFluid.flowRate),
      tubePressureDrop: results.tubeSidePressureDrop,
      tubeVelocity: results.tubeSideVelocity,
      tubeReynolds: results.tubeReynolds,
      tubeHTC: results.hi,
      heatDuty: results.heatDuty,
      lmtd: results.lmtd,
      correctionFactor: results.correctionFactor,
      effectiveMTD: results.effectiveLmtd,
      overallU: parseFloat(overallU),
      cleanU: results.cleanU,
      fouledU: results.fouledU,
      overdesign: results.requiredArea > 0 ? ((results.heatTransferArea - results.requiredArea) / results.requiredArea) * 100 : 0,
      ntu: results.ntu,
      effectiveness: results.effectiveness,
      shellFouling: parseFloat(hotFouling),
      tubeFouling: parseFloat(coldFouling),
      cleanlinessPercent: results.cleanU > 0 ? (results.fouledU / results.cleanU) * 100 : 100,
      shellDiameter: parseFloat(tubeGeometry.shellDiameter),
      tubeOD: parseFloat(tubeGeometry.outerDiameter),
      tubeWall: parseFloat(tubeGeometry.wallThickness),
      tubeLength: parseFloat(tubeGeometry.tubeLength),
      numberOfTubes: parseInt(tubeGeometry.numberOfTubes),
      tubePitch: parseFloat(tubeGeometry.tubePitch),
      tubePattern: tubeGeometry.tubePattern === "triangular" ? "Triangular (30°)" : tubeGeometry.tubePattern === "square" ? "Square (90°)" : "Rotated Square (45°)",
      tubePasses: parseInt(tubeGeometry.tubePasses),
      baffleSpacing: parseFloat(tubeGeometry.baffleSpacing),
      baffleCut: parseFloat(tubeGeometry.baffleCut),
      numberOfBaffles: results.numberOfBaffles,
      designPressure: parseFloat(designPressure),
      shellThickness: asmeResults?.shellRecommended ? parseFloat(String(asmeResults.shellRecommended)) : 0,
      headThickness: asmeResults?.headThicknessWithCA ?? 0,
      tubesheetThickness: asmeResults?.tubesheetThickness ?? 0,
      shellMaterial: asmeMaterials[shellMaterial]?.name ?? shellMaterial,
      tubeMaterial: tubeGeometry.tubeMaterial,
      flangeClass: asmeResults?.flangeClass ?? "Class 150",
      naturalFrequency: results.vibration.naturalFrequency,
      vortexFrequency: results.vibration.vortexSheddingFrequency,
      criticalVelocity: results.vibration.criticalVelocity,
      vibrationSafe: !results.vibration.isVibrationRisk,
      unitSystem,
      tempUnit: tempUnitLabel,
    };

    generateExcelDatasheet(data);
    toast({ title: "Excel Generated", description: "HTRI-style datasheet downloaded successfully" });
  }, [results, asmeResults, hotFluid, coldFluid, hotFluidType, coldFluidType, hotFouling, coldFouling, overallU, tubeGeometry, designPressure, shellMaterial, flowArrangement, companyName, projectName, itemNumber, revisionNo, unitSystem, tempUnit]);

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

  // TEMA auto-calculate geometry - calculates shell diameter from tube count OR tube count from shell diameter
  const handleAutoCalculateGeometry = useCallback(() => {
    const tubeOD = parseFloat(tubeGeometry.outerDiameter);
    const currentShellDia = parseFloat(tubeGeometry.shellDiameter);
    const currentTubeCount = parseInt(tubeGeometry.numberOfTubes);
    const passes = parseInt(tubeGeometry.tubePasses);
    const pattern = tubeGeometry.tubePattern as "triangular" | "square" | "rotatedSquare";

    // Get recommended pitch
    const pitchResult = getRecommendedPitch(tubeOD, pattern, pattern === "square");

    // Calculate shell diameter from current tube count
    const shellResult = calculateShellDiameter(currentTubeCount, tubeOD, pitchResult.pitch, pattern, passes);

    // Get recommended baffle spacing based on new shell diameter
    const baffleResult = getRecommendedBaffleSpacing(shellResult.shellDiameter, parseFloat(tubeGeometry.tubeLength));

    setTubeGeometry(prev => ({
      ...prev,
      tubePitch: pitchResult.pitch.toFixed(2),
      shellDiameter: shellResult.shellDiameter.toFixed(0),
      baffleSpacing: baffleResult.recommended.toString(),
      unsupportedSpanLength: baffleResult.recommended.toString()
    }));

    toast({
      title: "Geometry Calculated",
      description: `Shell ID: ${shellResult.shellDiameter.toFixed(0)}mm for ${currentTubeCount} tubes @ ${pitchResult.pitch.toFixed(1)}mm pitch`
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

  // Unit label helpers
  const getLengthUnit = () => unitSystem === 'metric' ? 'mm' : 'in';
  const getLengthLongUnit = () => unitSystem === 'metric' ? 'm' : 'ft';
  const getFlowRateUnit = () => unitSystem === 'metric' ? 'kg/hr' : 'lb/hr';
  const getDensityUnit = () => unitSystem === 'metric' ? 'kg/m³' : 'lb/ft³';
  const getPressureUnit = () => unitSystem === 'metric' ? 'kPa' : 'psi';
  const getVelocityUnit = () => unitSystem === 'metric' ? 'm/s' : 'ft/s';
  const getAreaUnit = () => unitSystem === 'metric' ? 'm²' : 'ft²';
  const getDutyUnit = () => unitSystem === 'metric' ? 'kW' : 'BTU/hr';
  const getHTCUnit = () => unitSystem === 'metric' ? 'W/m²K' : 'BTU/hr·ft²·°F';

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
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="guide">Standards Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
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

            <Card className="border-border/50">
              <CardContent className="pt-4 space-y-3">
                <Label className="text-xs text-muted-foreground">Unit System</Label>
                <Tabs value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="metric" className="text-xs">Metric (SI)</TabsTrigger>
                    <TabsTrigger value="imperial" className="text-xs">Imperial</TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-xs text-muted-foreground">
                  {unitSystem === "metric"
                    ? "mm, m², kW, kg/hr"
                    : "in, ft², BTU/hr, lb/hr"}
                </p>
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
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Tube Geometry (TEMA Standards)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">TEMA Tube Count Table</Label>
                    <Select
                      value={selectedTemaTable}
                      onValueChange={(value) => {
                        setSelectedTemaTable(value);
                        // Find the selected table and update tube geometry
                        const table = allTubeCountTables.find(t => t.name === value);
                        if (table) {
                          // Find matching wall thickness from standard tube sizes
                          const standardTube = standardTubeSizes.find(t => Math.abs(t.od - table.tubeOD) < 0.5);

                          // Get current shell diameter and look up tube count from table
                          const currentShellDia = parseFloat(tubeGeometry.shellDiameter);
                          const passes = parseInt(tubeGeometry.tubePasses);
                          const pattern = tubeGeometry.tubePattern === "triangular" ? "triangular" : "square";

                          // Find closest shell size in the table
                          const availableShellSizes = Object.keys(table.counts).map(Number).sort((a, b) => a - b);
                          let closestShell = availableShellSizes[0];
                          let minDiff = Math.abs(currentShellDia - closestShell);
                          for (const shellSize of availableShellSizes) {
                            const diff = Math.abs(currentShellDia - shellSize);
                            if (diff < minDiff) {
                              minDiff = diff;
                              closestShell = shellSize;
                            }
                          }

                          // Look up tube count from table
                          const shellData = table.counts[closestShell];
                          const passData = shellData?.[passes] || shellData?.[2] || shellData?.[1];
                          const tubeCount = passData ? (pattern === "triangular" ? passData.triangular : passData.square) : 200;

                          // Get recommended baffle spacing
                          const baffleResult = getRecommendedBaffleSpacing(closestShell, parseFloat(tubeGeometry.tubeLength));

                          setTubeGeometry(prev => ({
                            ...prev,
                            outerDiameter: table.tubeOD.toString(),
                            tubePitch: table.tubePitch.toString(),
                            wallThickness: standardTube ? standardTube.wall.toString() : prev.wallThickness,
                            shellDiameter: closestShell.toString(),
                            numberOfTubes: tubeCount.toString(),
                            baffleSpacing: baffleResult.recommended.toString()
                          }));

                          toast({
                            title: "TEMA Table Applied",
                            description: `${tubeCount} tubes for Shell ID ${closestShell}mm @ ${table.tubePitch}mm pitch`
                          });
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

                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Shell Type (TEMA)</Label>
                    <Select
                      value={shellType}
                      onValueChange={(value: ShellType) => setShellType(value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select shell type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(shellTypeClearances).map(([key, data]) => (
                          <SelectItem key={key} value={key}>
                            {data.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Bundle clearance: {shellTypeClearances[shellType].clearance}mm
                    </p>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Shell ID ({getLengthUnit()})</Label>
                    <Select
                      value={tubeGeometry.shellDiameter}
                      onValueChange={(value) => {
                        const table = allTubeCountTables.find(t => t.name === selectedTemaTable);
                        const newShellDia = parseInt(value);
                        const passes = parseInt(tubeGeometry.tubePasses);
                        const pattern = tubeGeometry.tubePattern === "triangular" ? "triangular" : "square";

                        // Look up tube count from TEMA table
                        let tubeCount = parseInt(tubeGeometry.numberOfTubes);
                        if (table) {
                          const shellData = table.counts[newShellDia];
                          const passData = shellData?.[passes] || shellData?.[2] || shellData?.[1];
                          if (passData) {
                            tubeCount = pattern === "triangular" ? passData.triangular : passData.square;
                          }
                        }

                        // Get recommended baffle spacing
                        const baffleResult = getRecommendedBaffleSpacing(newShellDia, parseFloat(tubeGeometry.tubeLength));

                        setTubeGeometry(prev => ({
                          ...prev,
                          shellDiameter: value,
                          numberOfTubes: tubeCount.toString(),
                          baffleSpacing: baffleResult.recommended.toString()
                        }));

                        toast({
                          title: "Shell Size Updated",
                          description: `${tubeCount} tubes for Shell ID ${newShellDia}mm`
                        });
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select shell size" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const table = allTubeCountTables.find(t => t.name === selectedTemaTable);
                          const availableShells = table ? Object.keys(table.counts).map(Number).sort((a, b) => a - b) : [];
                          return availableShells.map(shell => (
                            <SelectItem key={shell} value={shell.toString()}>
                              {shell} mm
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>


              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tube OD ({getLengthUnit()})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tubeGeometry.outerDiameter}
                    onChange={(e) => setTubeGeometry({ ...tubeGeometry, outerDiameter: e.target.value })}
                    className="h-9 no-spinner bg-muted/50"
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Wall Thickness ({getLengthUnit()})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tubeGeometry.wallThickness}
                    onChange={(e) => setTubeGeometry({ ...tubeGeometry, wallThickness: e.target.value })}
                    className="h-9 no-spinner bg-muted/50"
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tube Length ({getLengthLongUnit()})</Label>
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
                    className="h-9 no-spinner bg-muted/50"
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tube Pitch ({getLengthUnit()})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tubeGeometry.tubePitch}
                    onChange={(e) => setTubeGeometry({ ...tubeGeometry, tubePitch: e.target.value })}
                    className="h-9 no-spinner bg-muted/50"
                    disabled
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
                  <Label className="text-xs text-muted-foreground">Baffle Spacing ({getLengthUnit()})</Label>
                  <Input
                    type="number"
                    value={tubeGeometry.baffleSpacing}
                    onChange={(e) => setTubeGeometry({ ...tubeGeometry, baffleSpacing: e.target.value })}
                    className="h-9 no-spinner bg-muted/50"
                    disabled
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
                  <Label className="text-xs text-muted-foreground">Unsupported Span ({getLengthUnit()})</Label>
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
                      <Label className="text-xs text-muted-foreground">Shell-Baffle Clearance ({getLengthUnit()})</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={tubeGeometry.shellBaffleLeakage}
                        onChange={(e) => setTubeGeometry({ ...tubeGeometry, shellBaffleLeakage: e.target.value })}
                        className="h-9 no-spinner"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Tube-Baffle Clearance ({getLengthUnit()})</Label>
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
                      <AlertTitle className="text-green-500">Vibration Check Passed</AlertTitle>
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
                  Export PDF
                </Button>
                <Button onClick={handleExportExcel} variant="outline" className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel (HTRI Style)
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

        </TabsContent>

        <TabsContent value="guide">
          <HeatExchangerGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HeatExchangerSizing;
