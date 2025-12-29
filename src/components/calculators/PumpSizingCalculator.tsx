import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, AlertTriangle, CheckCircle2, Info, Zap, Droplets, ArrowUpCircle, Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ================== UNIT CONVERSIONS ==================

const flowRateToM3s: Record<string, number> = {
  "m³/h": 1 / 3600,
  "m³/s": 1,
  "L/min": 1 / 60000,
  "L/s": 0.001,
  "gpm": 0.0000630902,
  "bbl/d": 0.00000184013,
};

const headToMeters: Record<string, number> = {
  "m": 1,
  "ft": 0.3048,
  "bar": 10.197, // Approximate for water at 15°C
  "psi": 0.703, // Approximate for water at 15°C
};

const lengthToMeters: Record<string, number> = {
  "m": 1,
  "ft": 0.3048,
  "km": 1000,
};

const diameterToMeters: Record<string, number> = {
  "mm": 0.001,
  "in": 0.0254,
  "m": 1,
};

const densityToKgM3: Record<string, number> = {
  "kg/m³": 1,
  "lb/ft³": 16.0185,
  "g/cm³": 1000,
  "SG": 1000, // Specific gravity * 1000
};

const viscosityToPas: Record<string, number> = {
  "cP": 0.001,
  "Pa·s": 1,
  "mPa·s": 0.001,
  "cSt": 0.001, // Approximate - depends on density
};

const powerToKW: Record<string, number> = {
  "kW": 1,
  "hp": 0.7457,
  "W": 0.001,
};

// ================== PIPE SCHEDULE DATA ==================

const pipeScheduleData: Record<string, Record<string, number>> = {
  "1": { "40": 26.64, "80": 24.31, "STD": 26.64, "XS": 24.31 },
  "1-1/2": { "40": 40.89, "80": 38.10, "STD": 40.89, "XS": 38.10 },
  "2": { "40": 52.50, "80": 49.25, "STD": 52.50, "XS": 49.25 },
  "3": { "40": 77.93, "80": 73.66, "STD": 77.93, "XS": 73.66 },
  "4": { "40": 102.26, "80": 97.18, "STD": 102.26, "XS": 97.18 },
  "6": { "40": 154.05, "80": 146.33, "STD": 154.05, "XS": 146.33 },
  "8": { "40": 202.72, "80": 193.68, "STD": 202.72, "XS": 193.68 },
  "10": { "40": 254.51, "80": 242.87, "STD": 254.51, "XS": 247.65 },
  "12": { "40": 303.23, "80": 288.90, "STD": 303.23, "XS": 298.45 },
  "14": { "40": 336.54, "STD": 347.68, "XS": 339.76 },
  "16": { "40": 381.00, "STD": 398.02, "XS": 387.36 },
  "18": { "40": 428.66, "STD": 448.62, "XS": 434.72 },
  "20": { "40": 477.82, "STD": 498.44, "XS": 482.60 },
  "24": { "40": 574.68, "STD": 598.42, "XS": 581.66 },
};

const nominalDiameters = Object.keys(pipeScheduleData);

const getSchedulesForDiameter = (nd: string): string[] => {
  return Object.keys(pipeScheduleData[nd] || {});
};

// ================== K-FACTOR DATABASE (FITTINGS) ==================

interface FittingData {
  name: string;
  K: number; // Loss coefficient
  LeD: number; // Equivalent length in pipe diameters
}

const fittingsDatabase: Record<string, FittingData> = {
  "elbow_90_std": { name: "90° Elbow (Standard)", K: 0.75, LeD: 30 },
  "elbow_90_long": { name: "90° Elbow (Long Radius)", K: 0.45, LeD: 20 },
  "elbow_45": { name: "45° Elbow", K: 0.35, LeD: 16 },
  "tee_straight": { name: "Tee (Straight Through)", K: 0.4, LeD: 20 },
  "tee_branch": { name: "Tee (Branch Flow)", K: 1.3, LeD: 60 },
  "gate_valve_full": { name: "Gate Valve (Full Open)", K: 0.17, LeD: 8 },
  "gate_valve_half": { name: "Gate Valve (½ Open)", K: 4.5, LeD: 160 },
  "globe_valve_full": { name: "Globe Valve (Full Open)", K: 6.0, LeD: 340 },
  "ball_valve_full": { name: "Ball Valve (Full Open)", K: 0.05, LeD: 3 },
  "check_valve_swing": { name: "Check Valve (Swing)", K: 2.0, LeD: 100 },
  "check_valve_ball": { name: "Check Valve (Ball)", K: 4.0, LeD: 150 },
  "reducer": { name: "Reducer", K: 0.5, LeD: 25 },
  "expander": { name: "Expander", K: 1.0, LeD: 40 },
  "strainer": { name: "Strainer (Y-Type)", K: 2.0, LeD: 100 },
  "entrance_sharp": { name: "Pipe Entrance (Sharp)", K: 0.5, LeD: 25 },
  "entrance_bellmouth": { name: "Pipe Entrance (Bellmouth)", K: 0.04, LeD: 2 },
  "exit_sharp": { name: "Pipe Exit", K: 1.0, LeD: 50 },
};

// ================== PIPE ROUGHNESS ==================

const pipeRoughness: Record<string, number> = {
  "Carbon Steel (New)": 0.0457,
  "Carbon Steel (Corroded)": 0.15,
  "Stainless Steel": 0.015,
  "Ductile Iron": 0.25,
  "PVC/CPVC": 0.0015,
  "HDPE": 0.007,
  "Copper": 0.0015,
  "Cast Iron": 0.26,
  "Custom": 0,
};

// ================== PUMP TYPES ==================

interface PumpType {
  name: string;
  typicalEfficiency: [number, number]; // [min, max] %
  typicalHead: [number, number]; // [min, max] m
  typicalFlow: [number, number]; // [min, max] m³/h
  characteristics: string[];
}

const pumpTypes: Record<string, PumpType> = {
  "centrifugal_end_suction": {
    name: "Centrifugal End Suction",
    typicalEfficiency: [60, 85],
    typicalHead: [10, 150],
    typicalFlow: [1, 1000],
    characteristics: ["Most common industrial pump", "Variable flow with fixed speed", "Suitable for clean fluids"]
  },
  "centrifugal_multistage": {
    name: "Centrifugal Multistage",
    typicalEfficiency: [65, 82],
    typicalHead: [50, 600],
    typicalFlow: [1, 500],
    characteristics: ["High head applications", "Boiler feed water", "High pressure process"]
  },
  "positive_displacement_gear": {
    name: "Positive Displacement (Gear)",
    typicalEfficiency: [50, 75],
    typicalHead: [30, 200],
    typicalFlow: [0.1, 100],
    characteristics: ["Constant flow", "High viscosity fluids", "Precise metering"]
  },
  "positive_displacement_piston": {
    name: "Positive Displacement (Piston)",
    typicalEfficiency: [80, 95],
    typicalHead: [100, 2000],
    typicalFlow: [0.1, 50],
    characteristics: ["Very high pressure", "Constant flow", "Chemical injection"]
  },
  "submersible": {
    name: "Submersible",
    typicalEfficiency: [50, 70],
    typicalHead: [20, 300],
    typicalFlow: [1, 200],
    characteristics: ["Borehole/well applications", "Sump drainage", "No priming required"]
  },
};

// ================== CALCULATION FUNCTIONS ==================

const calculateFrictionFactor = (Re: number, roughness: number, diameter: number): number => {
  const relativeRoughness = roughness / diameter;
  
  if (Re < 2300) {
    // Laminar flow
    return 64 / Re;
  } else if (Re < 4000) {
    // Transition zone - interpolate
    const fLam = 64 / Re;
    const fTurb = calculateColebrook(4000, relativeRoughness);
    const t = (Re - 2300) / 1700;
    return fLam * (1 - t) + fTurb * t;
  } else {
    // Turbulent flow - Colebrook-White equation (iterative)
    return calculateColebrook(Re, relativeRoughness);
  }
};

const calculateColebrook = (Re: number, eD: number): number => {
  // Swamee-Jain approximation for Colebrook equation
  const term1 = eD / 3.7;
  const term2 = 5.74 / Math.pow(Re, 0.9);
  return 0.25 / Math.pow(Math.log10(term1 + term2), 2);
};

const calculateReynolds = (velocity: number, diameter: number, density: number, viscosity: number): number => {
  return (density * velocity * diameter) / viscosity;
};

const calculateVelocity = (flowRate: number, diameter: number): number => {
  const area = Math.PI * Math.pow(diameter / 2, 2);
  return flowRate / area;
};

const calculateNPSHa = (
  atmosphericPressure: number, // Pa
  liquidVaporPressure: number, // Pa
  suctionStaticHead: number, // m (positive if above pump, negative if below)
  suctionFrictionLoss: number, // m
  density: number // kg/m³
): number => {
  const g = 9.81;
  const pressureHead = (atmosphericPressure - liquidVaporPressure) / (density * g);
  return pressureHead + suctionStaticHead - suctionFrictionLoss;
};

// ================== MAIN COMPONENT ==================

const PumpSizingCalculator = () => {
  // ========== STATE MANAGEMENT ==========
  
  // Flow conditions
  const [flowRate, setFlowRate] = useState<string>("100");
  const [flowRateUnit, setFlowRateUnit] = useState<string>("m³/h");
  
  // Fluid properties
  const [density, setDensity] = useState<string>("1000");
  const [densityUnit, setDensityUnit] = useState<string>("kg/m³");
  const [viscosity, setViscosity] = useState<string>("1");
  const [viscosityUnit, setViscosityUnit] = useState<string>("cP");
  const [vaporPressure, setVaporPressure] = useState<string>("2.34"); // kPa at 20°C for water
  const [fluidTemp, setFluidTemp] = useState<string>("20");
  
  // System geometry - Suction
  const [suctionStaticHead, setSuctionStaticHead] = useState<string>("3");
  const [suctionHeadUnit, setSuctionHeadUnit] = useState<string>("m");
  const [suctionPipeLength, setSuctionPipeLength] = useState<string>("10");
  const [suctionLengthUnit, setSuctionLengthUnit] = useState<string>("m");
  const [suctionNominalDia, setSuctionNominalDia] = useState<string>("6");
  const [suctionSchedule, setSuctionSchedule] = useState<string>("40");
  
  // System geometry - Discharge
  const [dischargeStaticHead, setDischargeStaticHead] = useState<string>("25");
  const [dischargeHeadUnit, setDischargeHeadUnit] = useState<string>("m");
  const [dischargePipeLength, setDischargePipeLength] = useState<string>("100");
  const [dischargeLengthUnit, setDischargeLengthUnit] = useState<string>("m");
  const [dischargeNominalDia, setDischargeNominalDia] = useState<string>("4");
  const [dischargeSchedule, setDischargeSchedule] = useState<string>("40");
  const [dischargeEndPressure, setDischargeEndPressure] = useState<string>("2"); // barg
  
  // Pipe properties
  const [pipeMaterial, setPipeMaterial] = useState<string>("Carbon Steel (New)");
  const [customRoughness, setCustomRoughness] = useState<string>("0.0457");
  
  // Fittings - Suction
  const [suctionElbow90Std, setSuctionElbow90Std] = useState<string>("1");
  const [suctionGateValve, setSuctionGateValve] = useState<string>("1");
  const [suctionStrainer, setSuctionStrainer] = useState<string>("1");
  const [suctionEntrance, setSuctionEntrance] = useState<string>("bellmouth");
  
  // Fittings - Discharge
  const [dischargeElbow90Std, setDischargeElbow90Std] = useState<string>("4");
  const [dischargeElbow90Long, setDischargeElbow90Long] = useState<string>("2");
  const [dischargeGateValve, setDischargeGateValve] = useState<string>("2");
  const [dischargeCheckValve, setDischargeCheckValve] = useState<string>("1");
  const [dischargeExit, setDischargeExit] = useState<string>("1");
  
  // Pump selection
  const [pumpType, setPumpType] = useState<string>("centrifugal_end_suction");
  const [pumpEfficiency, setPumpEfficiency] = useState<string>("75");
  const [motorEfficiency, setMotorEfficiency] = useState<string>("95");
  const [npshrMargin, setNpshrMargin] = useState<string>("0.5"); // NPSHa should be NPSHr + margin
  
  // Atmospheric conditions
  const [atmosphericPressure, setAtmosphericPressure] = useState<string>("101.325"); // kPa
  
  // Display units
  const [headDisplayUnit, setHeadDisplayUnit] = useState<string>("m");
  const [powerDisplayUnit, setPowerDisplayUnit] = useState<string>("kW");

  // ========== CALCULATIONS ==========
  
  const calculations = useMemo(() => {
    const g = 9.81; // m/s²
    
    // Convert inputs to SI units
    const Q_m3s = parseFloat(flowRate) * (flowRateToM3s[flowRateUnit] || 1 / 3600);
    const rho = parseFloat(density) * (densityToKgM3[densityUnit] || 1);
    const mu = parseFloat(viscosity) * (viscosityToPas[viscosityUnit] || 0.001);
    const Pv = parseFloat(vaporPressure) * 1000; // kPa to Pa
    const Patm = parseFloat(atmosphericPressure) * 1000; // kPa to Pa
    
    // Pipe roughness
    const roughness_m = pipeMaterial === "Custom" 
      ? parseFloat(customRoughness) * 0.001 
      : (pipeRoughness[pipeMaterial] || 0.0457) * 0.001;
    
    // Suction pipe geometry
    const suctionDia_mm = pipeScheduleData[suctionNominalDia]?.[suctionSchedule] || 154.05;
    const suctionDia_m = suctionDia_mm * 0.001;
    const suctionLength_m = parseFloat(suctionPipeLength) * (lengthToMeters[suctionLengthUnit] || 1);
    const suctionStaticHead_m = parseFloat(suctionStaticHead) * (headToMeters[suctionHeadUnit] || 1);
    
    // Discharge pipe geometry
    const dischargeDia_mm = pipeScheduleData[dischargeNominalDia]?.[dischargeSchedule] || 102.26;
    const dischargeDia_m = dischargeDia_mm * 0.001;
    const dischargeLength_m = parseFloat(dischargePipeLength) * (lengthToMeters[dischargeLengthUnit] || 1);
    const dischargeStaticHead_m = parseFloat(dischargeStaticHead) * (headToMeters[dischargeHeadUnit] || 1);
    const dischargeEndPressure_Pa = parseFloat(dischargeEndPressure) * 100000; // barg to Pa
    
    // Velocities
    const suctionVelocity = calculateVelocity(Q_m3s, suctionDia_m);
    const dischargeVelocity = calculateVelocity(Q_m3s, dischargeDia_m);
    
    // Reynolds numbers
    const suctionRe = calculateReynolds(suctionVelocity, suctionDia_m, rho, mu);
    const dischargeRe = calculateReynolds(dischargeVelocity, dischargeDia_m, rho, mu);
    
    // Friction factors
    const suctionFf = calculateFrictionFactor(suctionRe, roughness_m, suctionDia_m);
    const dischargeFf = calculateFrictionFactor(dischargeRe, roughness_m, dischargeDia_m);
    
    // Suction fitting losses (K-factors)
    let suctionKTotal = 0;
    suctionKTotal += parseInt(suctionElbow90Std) * fittingsDatabase["elbow_90_std"].K;
    suctionKTotal += parseInt(suctionGateValve) * fittingsDatabase["gate_valve_full"].K;
    suctionKTotal += parseInt(suctionStrainer) * fittingsDatabase["strainer"].K;
    suctionKTotal += suctionEntrance === "bellmouth" 
      ? fittingsDatabase["entrance_bellmouth"].K 
      : fittingsDatabase["entrance_sharp"].K;
    
    // Discharge fitting losses (K-factors)
    let dischargeKTotal = 0;
    dischargeKTotal += parseInt(dischargeElbow90Std) * fittingsDatabase["elbow_90_std"].K;
    dischargeKTotal += parseInt(dischargeElbow90Long) * fittingsDatabase["elbow_90_long"].K;
    dischargeKTotal += parseInt(dischargeGateValve) * fittingsDatabase["gate_valve_full"].K;
    dischargeKTotal += parseInt(dischargeCheckValve) * fittingsDatabase["check_valve_swing"].K;
    dischargeKTotal += parseInt(dischargeExit) * fittingsDatabase["exit_sharp"].K;
    
    // Suction friction loss (Darcy-Weisbach)
    const suctionPipeLoss = suctionFf * (suctionLength_m / suctionDia_m) * (Math.pow(suctionVelocity, 2) / (2 * g));
    const suctionFittingLoss = suctionKTotal * (Math.pow(suctionVelocity, 2) / (2 * g));
    const suctionTotalLoss = suctionPipeLoss + suctionFittingLoss;
    
    // Discharge friction loss (Darcy-Weisbach)
    const dischargePipeLoss = dischargeFf * (dischargeLength_m / dischargeDia_m) * (Math.pow(dischargeVelocity, 2) / (2 * g));
    const dischargeFittingLoss = dischargeKTotal * (Math.pow(dischargeVelocity, 2) / (2 * g));
    const dischargeTotalLoss = dischargePipeLoss + dischargeFittingLoss;
    
    // Total friction loss
    const totalFrictionLoss = suctionTotalLoss + dischargeTotalLoss;
    
    // Static head (discharge - suction)
    const totalStaticHead = dischargeStaticHead_m - suctionStaticHead_m;
    
    // Pressure head at discharge
    const pressureHead = dischargeEndPressure_Pa / (rho * g);
    
    // Velocity head difference
    const velocityHeadDiff = (Math.pow(dischargeVelocity, 2) - Math.pow(suctionVelocity, 2)) / (2 * g);
    
    // Total Dynamic Head (TDH)
    const totalHead = totalStaticHead + totalFrictionLoss + pressureHead + velocityHeadDiff;
    
    // NPSHa calculation
    const npshaValue = calculateNPSHa(Patm, Pv, suctionStaticHead_m, suctionTotalLoss, rho);
    
    // Power calculations
    const eta_pump = parseFloat(pumpEfficiency) / 100;
    const eta_motor = parseFloat(motorEfficiency) / 100;
    
    const hydraulicPower_kW = (rho * g * Q_m3s * totalHead) / 1000;
    const brakePower_kW = hydraulicPower_kW / eta_pump;
    const motorPower_kW = brakePower_kW / eta_motor;
    
    // Specific speed (for pump selection guidance)
    const Q_m3min = Q_m3s * 60;
    const n = 1450; // Typical 4-pole motor speed (rpm)
    const Ns = n * Math.sqrt(Q_m3min) / Math.pow(totalHead, 0.75); // Metric specific speed
    
    // Flow regime
    const flowRegime = suctionRe < 2300 ? "Laminar" : suctionRe < 4000 ? "Transition" : "Turbulent";
    
    return {
      // Flow
      flowRate_m3h: Q_m3s * 3600,
      flowRate_gpm: Q_m3s / 0.0000630902,
      
      // Velocities
      suctionVelocity,
      dischargeVelocity,
      
      // Reynolds numbers
      suctionRe,
      dischargeRe,
      flowRegime,
      
      // Friction factors
      suctionFf,
      dischargeFf,
      
      // Losses breakdown
      suctionPipeLoss,
      suctionFittingLoss,
      suctionTotalLoss,
      dischargePipeLoss,
      dischargeFittingLoss,
      dischargeTotalLoss,
      totalFrictionLoss,
      
      // Head components
      totalStaticHead,
      pressureHead,
      velocityHeadDiff,
      totalHead,
      
      // NPSH
      npshaValue,
      npshrEstimate: npshaValue - parseFloat(npshrMargin),
      
      // Power
      hydraulicPower_kW,
      brakePower_kW,
      motorPower_kW,
      
      // Pump selection
      specificSpeed: Ns,
      
      // Pipe diameters for display
      suctionDia_mm,
      dischargeDia_mm,
      
      // Validity checks
      isValid: !isNaN(totalHead) && totalHead > 0 && Q_m3s > 0,
      suctionVelocityOk: suctionVelocity >= 0.5 && suctionVelocity <= 2.5,
      dischargeVelocityOk: dischargeVelocity >= 1.0 && dischargeVelocity <= 4.0,
      npshaOk: npshaValue > 3, // Generally NPSHa should be > 3m
    };
  }, [
    flowRate, flowRateUnit, density, densityUnit, viscosity, viscosityUnit,
    vaporPressure, atmosphericPressure, pipeMaterial, customRoughness,
    suctionStaticHead, suctionHeadUnit, suctionPipeLength, suctionLengthUnit,
    suctionNominalDia, suctionSchedule, suctionElbow90Std, suctionGateValve,
    suctionStrainer, suctionEntrance, dischargeStaticHead, dischargeHeadUnit,
    dischargePipeLength, dischargeLengthUnit, dischargeNominalDia, dischargeSchedule,
    dischargeEndPressure, dischargeElbow90Std, dischargeElbow90Long, dischargeGateValve,
    dischargeCheckValve, dischargeExit, pumpEfficiency, motorEfficiency, npshrMargin
  ]);

  // Helper function for head unit conversion display
  const convertHead = (headM: number): number => {
    return headM / (headToMeters[headDisplayUnit] || 1);
  };

  const convertPower = (powerKW: number): number => {
    return powerKW / (powerToKW[powerDisplayUnit] || 1);
  };

  // Get pump type info
  const selectedPumpInfo = pumpTypes[pumpType];

  return (
    <div className="space-y-6">
      {/* Input Tabs */}
      <Tabs defaultValue="flow" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5">
          <TabsTrigger value="flow" className="text-xs sm:text-sm">
            <Droplets className="w-4 h-4 mr-1 hidden sm:inline" />
            Flow & Fluid
          </TabsTrigger>
          <TabsTrigger value="suction" className="text-xs sm:text-sm">
            <ArrowUpCircle className="w-4 h-4 mr-1 hidden sm:inline rotate-180" />
            Suction
          </TabsTrigger>
          <TabsTrigger value="discharge" className="text-xs sm:text-sm">
            <ArrowUpCircle className="w-4 h-4 mr-1 hidden sm:inline" />
            Discharge
          </TabsTrigger>
          <TabsTrigger value="fittings" className="text-xs sm:text-sm">
            <Activity className="w-4 h-4 mr-1 hidden sm:inline" />
            Fittings
          </TabsTrigger>
          <TabsTrigger value="pump" className="text-xs sm:text-sm hidden lg:flex">
            <Gauge className="w-4 h-4 mr-1" />
            Pump
          </TabsTrigger>
        </TabsList>

        {/* Flow & Fluid Properties Tab */}
        <TabsContent value="flow">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Droplets className="w-5 h-5 text-primary" />
                Flow Rate & Fluid Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Flow Rate */}
              <div className="space-y-2">
                <Label htmlFor="flowRate">Flow Rate</Label>
                <div className="flex gap-2">
                  <Input
                    id="flowRate"
                    type="number"
                    value={flowRate}
                    onChange={(e) => setFlowRate(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={flowRateUnit} onValueChange={setFlowRateUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(flowRateToM3s).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Density */}
              <div className="space-y-2">
                <Label htmlFor="density">Density</Label>
                <div className="flex gap-2">
                  <Input
                    id="density"
                    type="number"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={densityUnit} onValueChange={setDensityUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(densityToKgM3).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Viscosity */}
              <div className="space-y-2">
                <Label htmlFor="viscosity">Dynamic Viscosity</Label>
                <div className="flex gap-2">
                  <Input
                    id="viscosity"
                    type="number"
                    value={viscosity}
                    onChange={(e) => setViscosity(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={viscosityUnit} onValueChange={setViscosityUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(viscosityToPas).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vapor Pressure */}
              <div className="space-y-2">
                <Label htmlFor="vaporPressure" className="flex items-center gap-1">
                  Vapor Pressure (kPa)
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vapor pressure at operating temperature<br/>Water at 20°C: 2.34 kPa</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="vaporPressure"
                  type="number"
                  step="0.01"
                  value={vaporPressure}
                  onChange={(e) => setVaporPressure(e.target.value)}
                />
              </div>

              {/* Fluid Temperature */}
              <div className="space-y-2">
                <Label htmlFor="fluidTemp">Fluid Temperature (°C)</Label>
                <Input
                  id="fluidTemp"
                  type="number"
                  value={fluidTemp}
                  onChange={(e) => setFluidTemp(e.target.value)}
                />
              </div>

              {/* Atmospheric Pressure */}
              <div className="space-y-2">
                <Label htmlFor="atmPressure">Atmospheric Pressure (kPa)</Label>
                <Input
                  id="atmPressure"
                  type="number"
                  value={atmosphericPressure}
                  onChange={(e) => setAtmosphericPressure(e.target.value)}
                />
              </div>

              {/* Pipe Material */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pipeMaterial">Pipe Material</Label>
                <Select value={pipeMaterial} onValueChange={setPipeMaterial}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(pipeRoughness).map((mat) => (
                      <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {pipeMaterial === "Custom" && (
                <div className="space-y-2">
                  <Label htmlFor="customRoughness">Custom Roughness (mm)</Label>
                  <Input
                    id="customRoughness"
                    type="number"
                    step="0.001"
                    value={customRoughness}
                    onChange={(e) => setCustomRoughness(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suction Side Tab */}
        <TabsContent value="suction">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-blue-500 rotate-180" />
                Suction Side Geometry
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Suction Static Head */}
              <div className="space-y-2">
                <Label htmlFor="suctionHead" className="flex items-center gap-1">
                  Static Suction Head
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Positive: liquid level above pump centerline<br/>Negative: liquid level below pump (suction lift)</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="suctionHead"
                    type="number"
                    value={suctionStaticHead}
                    onChange={(e) => setSuctionStaticHead(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={suctionHeadUnit} onValueChange={setSuctionHeadUnit}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="ft">ft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Suction Pipe Length */}
              <div className="space-y-2">
                <Label htmlFor="suctionLength">Pipe Length</Label>
                <div className="flex gap-2">
                  <Input
                    id="suctionLength"
                    type="number"
                    value={suctionPipeLength}
                    onChange={(e) => setSuctionPipeLength(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={suctionLengthUnit} onValueChange={setSuctionLengthUnit}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="ft">ft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Suction Pipe Diameter */}
              <div className="space-y-2">
                <Label>Nominal Diameter (NPS)</Label>
                <Select value={suctionNominalDia} onValueChange={(val) => {
                  setSuctionNominalDia(val);
                  const schedules = getSchedulesForDiameter(val);
                  if (!schedules.includes(suctionSchedule)) {
                    setSuctionSchedule(schedules[0] || "40");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {nominalDiameters.map((nd) => (
                      <SelectItem key={nd} value={nd}>{nd}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Suction Pipe Schedule */}
              <div className="space-y-2">
                <Label>Schedule</Label>
                <Select value={suctionSchedule} onValueChange={setSuctionSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getSchedulesForDiameter(suctionNominalDia).map((sch) => (
                      <SelectItem key={sch} value={sch}>{sch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ID Display */}
              <div className="space-y-2">
                <Label>Inside Diameter</Label>
                <Input
                  value={`${calculations.suctionDia_mm.toFixed(2)} mm`}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discharge Side Tab */}
        <TabsContent value="discharge">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-orange-500" />
                Discharge Side Geometry
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Discharge Static Head */}
              <div className="space-y-2">
                <Label htmlFor="dischargeHead" className="flex items-center gap-1">
                  Static Discharge Head
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Height of discharge point above pump centerline</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="dischargeHead"
                    type="number"
                    value={dischargeStaticHead}
                    onChange={(e) => setDischargeStaticHead(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={dischargeHeadUnit} onValueChange={setDischargeHeadUnit}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="ft">ft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Discharge Pipe Length */}
              <div className="space-y-2">
                <Label htmlFor="dischargeLength">Pipe Length</Label>
                <div className="flex gap-2">
                  <Input
                    id="dischargeLength"
                    type="number"
                    value={dischargePipeLength}
                    onChange={(e) => setDischargePipeLength(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={dischargeLengthUnit} onValueChange={setDischargeLengthUnit}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="ft">ft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Discharge End Pressure */}
              <div className="space-y-2">
                <Label htmlFor="dischargePress" className="flex items-center gap-1">
                  Discharge Pressure (barg)
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Required pressure at discharge point<br/>Set to 0 for open tank discharge</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="dischargePress"
                  type="number"
                  step="0.1"
                  value={dischargeEndPressure}
                  onChange={(e) => setDischargeEndPressure(e.target.value)}
                />
              </div>

              {/* Discharge Pipe Diameter */}
              <div className="space-y-2">
                <Label>Nominal Diameter (NPS)</Label>
                <Select value={dischargeNominalDia} onValueChange={(val) => {
                  setDischargeNominalDia(val);
                  const schedules = getSchedulesForDiameter(val);
                  if (!schedules.includes(dischargeSchedule)) {
                    setDischargeSchedule(schedules[0] || "40");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {nominalDiameters.map((nd) => (
                      <SelectItem key={nd} value={nd}>{nd}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discharge Pipe Schedule */}
              <div className="space-y-2">
                <Label>Schedule</Label>
                <Select value={dischargeSchedule} onValueChange={setDischargeSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getSchedulesForDiameter(dischargeNominalDia).map((sch) => (
                      <SelectItem key={sch} value={sch}>{sch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ID Display */}
              <div className="space-y-2">
                <Label>Inside Diameter</Label>
                <Input
                  value={`${calculations.dischargeDia_mm.toFixed(2)} mm`}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fittings Tab */}
        <TabsContent value="fittings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Suction Fittings */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-blue-500 rotate-180" />
                  Suction Fittings
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">90° Elbows (Std)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={suctionElbow90Std}
                    onChange={(e) => setSuctionElbow90Std(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gate Valves</Label>
                  <Input
                    type="number"
                    min="0"
                    value={suctionGateValve}
                    onChange={(e) => setSuctionGateValve(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Strainers</Label>
                  <Input
                    type="number"
                    min="0"
                    value={suctionStrainer}
                    onChange={(e) => setSuctionStrainer(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entrance Type</Label>
                  <Select value={suctionEntrance} onValueChange={setSuctionEntrance}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bellmouth">Bellmouth</SelectItem>
                      <SelectItem value="sharp">Sharp Edge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Discharge Fittings */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-orange-500" />
                  Discharge Fittings
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">90° Elbows (Std)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={dischargeElbow90Std}
                    onChange={(e) => setDischargeElbow90Std(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">90° Elbows (Long)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={dischargeElbow90Long}
                    onChange={(e) => setDischargeElbow90Long(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gate Valves</Label>
                  <Input
                    type="number"
                    min="0"
                    value={dischargeGateValve}
                    onChange={(e) => setDischargeGateValve(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Check Valves</Label>
                  <Input
                    type="number"
                    min="0"
                    value={dischargeCheckValve}
                    onChange={(e) => setDischargeCheckValve(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pipe Exits</Label>
                  <Input
                    type="number"
                    min="0"
                    value={dischargeExit}
                    onChange={(e) => setDischargeExit(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pump Selection Tab */}
        <TabsContent value="pump">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" />
                Pump Selection & Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Pump Type */}
              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <Label>Pump Type</Label>
                <Select value={pumpType} onValueChange={setPumpType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(pumpTypes).map(([key, type]) => (
                      <SelectItem key={key} value={key}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pump Efficiency */}
              <div className="space-y-2">
                <Label htmlFor="pumpEff" className="flex items-center gap-1">
                  Pump Efficiency (%)
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Typical range: {selectedPumpInfo?.typicalEfficiency[0]}-{selectedPumpInfo?.typicalEfficiency[1]}%</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="pumpEff"
                  type="number"
                  min="1"
                  max="100"
                  value={pumpEfficiency}
                  onChange={(e) => setPumpEfficiency(e.target.value)}
                />
              </div>

              {/* Motor Efficiency */}
              <div className="space-y-2">
                <Label htmlFor="motorEff">Motor Efficiency (%)</Label>
                <Input
                  id="motorEff"
                  type="number"
                  min="1"
                  max="100"
                  value={motorEfficiency}
                  onChange={(e) => setMotorEfficiency(e.target.value)}
                />
              </div>

              {/* NPSH Margin */}
              <div className="space-y-2">
                <Label htmlFor="npshrMargin" className="flex items-center gap-1">
                  NPSHa-NPSHr Margin (m)
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Recommended: 0.5-1.0m minimum<br/>Higher margin for hot liquids</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="npshrMargin"
                  type="number"
                  step="0.1"
                  value={npshrMargin}
                  onChange={(e) => setNpshrMargin(e.target.value)}
                />
              </div>

              {/* Pump Type Info */}
              {selectedPumpInfo && (
                <div className="md:col-span-2 lg:col-span-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">{selectedPumpInfo.name} Characteristics:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPumpInfo.characteristics.map((char, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{char}</Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3 text-xs text-muted-foreground">
                    <div>Head: {selectedPumpInfo.typicalHead[0]}-{selectedPumpInfo.typicalHead[1]} m</div>
                    <div>Flow: {selectedPumpInfo.typicalFlow[0]}-{selectedPumpInfo.typicalFlow[1]} m³/h</div>
                    <div>Efficiency: {selectedPumpInfo.typicalEfficiency[0]}-{selectedPumpInfo.typicalEfficiency[1]}%</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Results Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Pump Requirements
              </CardTitle>
              <div className="flex gap-2">
                <Select value={headDisplayUnit} onValueChange={setHeadDisplayUnit}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="ft">ft</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={powerDisplayUnit} onValueChange={setPowerDisplayUnit}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kW">kW</SelectItem>
                    <SelectItem value="hp">hp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Head */}
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">
                  {convertHead(calculations.totalHead).toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Head ({headDisplayUnit})
                </div>
              </div>

              {/* Brake Power */}
              <div className="p-4 bg-orange-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {convertPower(calculations.brakePower_kW).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Brake Power ({powerDisplayUnit})
                </div>
              </div>

              {/* Motor Power */}
              <div className="p-4 bg-purple-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {convertPower(calculations.motorPower_kW).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Motor Power ({powerDisplayUnit})
                </div>
              </div>

              {/* NPSHa */}
              <div className={`p-4 rounded-lg text-center ${
                calculations.npshaOk ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                <div className={`text-2xl font-bold ${
                  calculations.npshaOk ? 'text-green-600' : 'text-red-600'
                }`}>
                  {calculations.npshaValue.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  NPSHa (m)
                </div>
              </div>
            </div>

            {/* Head Breakdown */}
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Head Components Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Static Head (Discharge - Suction)</span>
                  <span className="font-mono">{convertHead(calculations.totalStaticHead).toFixed(2)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Suction Friction Loss</span>
                  <span className="font-mono">{convertHead(calculations.suctionTotalLoss).toFixed(2)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discharge Friction Loss</span>
                  <span className="font-mono">{convertHead(calculations.dischargeTotalLoss).toFixed(2)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discharge Pressure Head</span>
                  <span className="font-mono">{convertHead(calculations.pressureHead).toFixed(2)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Velocity Head Difference</span>
                  <span className="font-mono">{convertHead(calculations.velocityHeadDiff).toFixed(3)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold border-t pt-2">
                  <span>Total Dynamic Head (TDH)</span>
                  <span className="font-mono text-primary">{convertHead(calculations.totalHead).toFixed(2)} {headDisplayUnit}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status & Warnings Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Flow Rate */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Flow Rate</span>
              <span className="text-sm font-mono">{calculations.flowRate_m3h.toFixed(1)} m³/h</span>
            </div>

            {/* Suction Velocity */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Suction Velocity</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{calculations.suctionVelocity.toFixed(2)} m/s</span>
                {calculations.suctionVelocityOk ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
            </div>

            {/* Discharge Velocity */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Discharge Velocity</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{calculations.dischargeVelocity.toFixed(2)} m/s</span>
                {calculations.dischargeVelocityOk ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
            </div>

            {/* Flow Regime */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Flow Regime</span>
              <Badge variant="outline">{calculations.flowRegime}</Badge>
            </div>

            {/* Specific Speed */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Specific Speed (Ns)</span>
              <span className="text-sm font-mono">{calculations.specificSpeed.toFixed(0)}</span>
            </div>

            {/* Hydraulic Power */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Hydraulic Power</span>
              <span className="text-sm font-mono">{calculations.hydraulicPower_kW.toFixed(2)} kW</span>
            </div>

            {/* Warnings */}
            <div className="pt-4 border-t space-y-2">
              {!calculations.suctionVelocityOk && (
                <div className="flex items-start gap-2 text-amber-600 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Suction velocity outside 0.5-2.5 m/s range. Consider larger suction pipe.</span>
                </div>
              )}
              {!calculations.dischargeVelocityOk && (
                <div className="flex items-start gap-2 text-amber-600 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Discharge velocity outside 1.0-4.0 m/s range.</span>
                </div>
              )}
              {!calculations.npshaOk && (
                <div className="flex items-start gap-2 text-red-600 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Low NPSHa ({calculations.npshaValue.toFixed(1)}m). Risk of cavitation!</span>
                </div>
              )}
              {calculations.npshaOk && calculations.suctionVelocityOk && calculations.dischargeVelocityOk && (
                <div className="flex items-center gap-2 text-green-600 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All parameters within recommended limits</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Friction Loss Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Friction Loss Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Suction Side */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-blue-500 rotate-180" />
                Suction Side
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pipe Friction Loss</span>
                  <span className="font-mono">{calculations.suctionPipeLoss.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fitting Losses</span>
                  <span className="font-mono">{calculations.suctionFittingLoss.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total Suction Loss</span>
                  <span className="font-mono">{calculations.suctionTotalLoss.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between text-muted-foreground pt-2">
                  <span>Reynolds Number</span>
                  <span className="font-mono">{calculations.suctionRe.toExponential(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Friction Factor</span>
                  <span className="font-mono">{calculations.suctionFf.toFixed(5)}</span>
                </div>
              </div>
            </div>

            {/* Discharge Side */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-orange-500" />
                Discharge Side
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pipe Friction Loss</span>
                  <span className="font-mono">{calculations.dischargePipeLoss.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fitting Losses</span>
                  <span className="font-mono">{calculations.dischargeFittingLoss.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total Discharge Loss</span>
                  <span className="font-mono">{calculations.dischargeTotalLoss.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between text-muted-foreground pt-2">
                  <span>Reynolds Number</span>
                  <span className="font-mono">{calculations.dischargeRe.toExponential(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Friction Factor</span>
                  <span className="font-mono">{calculations.dischargeFf.toFixed(5)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PumpSizingCalculator;
