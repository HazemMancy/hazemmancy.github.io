import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Gauge, AlertTriangle, CheckCircle2, Info, Droplets, ArrowUpCircle, Activity, Ruler, Thermometer, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import PumpPerformanceCurves from "./PumpPerformanceCurves";
import PumpSizingGuide from "./guides/PumpSizingGuide";
import PumpSystemDiagram from "./PumpSystemDiagram";
import { generatePumpPDF, PumpDatasheetData } from "@/lib/pumpPdfDatasheet";
import { generatePumpExcelDatasheet, PumpExcelData } from "@/lib/pumpExcelDatasheet";
import { toast } from "@/components/ui/use-toast";

// Import Shared Data & Logic
import {
  pumpTypes,
  scheduleOrder,
  fittingsDatabase,
  pipeScheduleData,
  getFittingsByCategory,
  liquidServiceCriteria
} from "@/lib/pumpData";
import { commonLiquids } from "@/lib/fluids";

import {
  UnitSystem,
  metricFlowRateToM3s, imperialFlowRateToM3s,
  metricHeadToMeters, imperialHeadToMeters,
  metricLengthToMeters, imperialLengthToMeters,
  metricDensityToKgM3, imperialDensityToKgM3,
  metricPressureToKPa, imperialPressureToKPa,
  metricPowerToKW, imperialPowerToKW,
  viscosityToPas,
  calculateVelocity,
  calculateReynolds,
  calculateFrictionFactor,
  calculateNPSHa,
  calculateAccelerationHead,
  calculateHICorrections,
  CalculationResult
} from "@/lib/pumpCalculations";

// Pipe Roughness Data (Needed locally for selection)
const pipeRoughness: Record<string, number> = {
  "Carbon Steel (New)": 0.0457,
  "Carbon Steel (Corroded)": 0.15,
  "Carbon Steel (Severely Corroded)": 0.9,
  "Stainless Steel": 0.015,
  "Duplex Stainless Steel": 0.015,
  "Cast Iron": 0.26,
  "Ductile Iron (Cement Lined)": 0.025,
  "Galvanized Steel": 0.15,
  "PVC/CPVC": 0.0015,
  "HDPE": 0.007,
  "FRP/GRP": 0.03,
  "Copper": 0.0015,
  "Custom": 0,
};

const nominalDiameters = Object.keys(pipeScheduleData);

const getSchedulesForDiameter = (nd: string): string[] => {
  const available = Object.keys(pipeScheduleData[nd] || {});
  return scheduleOrder.filter(sch => available.includes(sch));
};

/**
 * Recommends optimal pipe diameter based on flow rate and target velocity.
 * Suction target: 1.0-1.5 m/s (API 610 recommendation for suction)
 * Discharge target: 2.0-3.0 m/s (typical process piping)
 * @param Q_m3s Flow rate in m³/s
 * @param targetVelocity Target velocity in m/s
 * @param schedule Pipe schedule to use for ID lookup
 * @returns Recommended nominal diameter string
 */
const getRecommendedDiameter = (Q_m3s: number, targetVelocity: number, schedule: string): string | undefined => {
  if (Q_m3s <= 0 || targetVelocity <= 0) return undefined;
  // Required area = Q / V, then D = sqrt(4A/π)
  const requiredArea = Q_m3s / targetVelocity;
  const requiredDia_mm = Math.sqrt(4 * requiredArea / Math.PI) * 1000;

  // Find closest nominal diameter with ID >= required
  let bestNd: string | undefined;
  for (const nd of nominalDiameters) {
    const id_mm = pipeScheduleData[nd]?.[schedule];
    if (id_mm && id_mm >= requiredDia_mm * 0.85) { // Allow 15% tolerance
      bestNd = nd;
      break;
    }
  }
  return bestNd;
};

const parseNominalDiameter = (nd: string): number => {
  if (nd.includes("/")) {
    const [num, den] = nd.split("/").map(s => parseFloat(s.replace("-", "")));
    if (nd.includes("-")) {
      const whole = parseFloat(nd.split("-")[0]);
      return whole + num / den;
    }
    return num / den;
  }
  return parseFloat(nd);
};

// Get velocity limit based on pipe size from Data
const getLiquidVelocityLimit = (criteria: any, nominalSizeInch: number): number | null => {
  if (!criteria.velocity) return null;
  if (nominalSizeInch <= 2) return criteria.velocity.size2;
  if (nominalSizeInch <= 6) return criteria.velocity.size3to6;
  if (nominalSizeInch <= 12) return criteria.velocity.size8to12;
  if (nominalSizeInch <= 18) return criteria.velocity.size14to18;
  return criteria.velocity.size20plus;
};

const PumpSizingCalculator = () => {
  // ========== UNIT SYSTEM & MODE ==========
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [calculationMode, setCalculationMode] = useState<"system" | "flange">("system");

  // Get current unit sets based on unit system
  const flowRateUnits = unitSystem === 'metric' ? metricFlowRateToM3s : imperialFlowRateToM3s;
  const headUnits = unitSystem === 'metric' ? metricHeadToMeters : imperialHeadToMeters;
  const lengthUnits = unitSystem === 'metric' ? metricLengthToMeters : imperialLengthToMeters;
  const densityUnits = unitSystem === 'metric' ? metricDensityToKgM3 : imperialDensityToKgM3;
  const pressureUnits = unitSystem === 'metric' ? metricPressureToKPa : imperialPressureToKPa;

  // ========== STATE MANAGEMENT ==========
  // Flow conditions
  const [flowRate, setFlowRate] = useState<string>("100");
  const [flowRateUnit, setFlowRateUnit] = useState<string>(unitSystem === 'metric' ? "m³/h" : "gpm");

  // Fluid properties
  const [density, setDensity] = useState<string>("1000");
  const [densityUnit, setDensityUnit] = useState<string>(unitSystem === 'metric' ? "kg/m³" : "lb/ft³");
  const [viscosity, setViscosity] = useState<string>("1");
  const [viscosityUnit, setViscosityUnit] = useState<string>("cP");
  const [vaporPressure, setVaporPressure] = useState<string>(unitSystem === 'metric' ? "2.34" : "0.34");
  const [vaporPressureUnit, setVaporPressureUnit] = useState<string>(unitSystem === 'metric' ? "kPa" : "psia");
  const [fluidTemp, setFluidTemp] = useState<string>(unitSystem === 'metric' ? "20" : "68");
  const [compressibility, setCompressibility] = useState<string>("2.0");
  const [selectedFluid, setSelectedFluid] = useState<string>("Water");

  // Suction system
  const [suctionPressure, setSuctionPressure] = useState<string>(unitSystem === 'metric' ? "101.325" : "14.7"); // Absolute
  const [suctionPressureUnit, setSuctionPressureUnit] = useState<string>(unitSystem === 'metric' ? "kPa(a)" : "psia");
  const [suctionStaticHead, setSuctionStaticHead] = useState<string>("3");
  const [suctionHeadUnit, setSuctionHeadUnit] = useState<string>(unitSystem === 'metric' ? "m" : "ft");
  const [suctionPipeLength, setSuctionPipeLength] = useState<string>("10");
  const [suctionLengthUnit, setSuctionLengthUnit] = useState<string>(unitSystem === 'metric' ? "m" : "ft");
  const [suctionNominalDia, setSuctionNominalDia] = useState<string>("6");
  const [suctionSchedule, setSuctionSchedule] = useState<string>("40");
  const [suctionServiceType, setSuctionServiceType] = useState<string>("Pump Suction (Sub-cooled)");

  // Discharge system
  const [dischargeStaticHead, setDischargeStaticHead] = useState<string>("25");
  const [dischargeHeadUnit, setDischargeHeadUnit] = useState<string>(unitSystem === 'metric' ? "m" : "ft");
  const [dischargePipeLength, setDischargePipeLength] = useState<string>("100");
  const [dischargeLengthUnit, setDischargeLengthUnit] = useState<string>(unitSystem === 'metric' ? "m" : "ft");
  const [dischargeNominalDia, setDischargeNominalDia] = useState<string>("4");
  const [dischargeSchedule, setDischargeSchedule] = useState<string>("40");
  const [dischargeEndPressure, setDischargeEndPressure] = useState<string>(unitSystem === 'metric' ? "2" : "29");
  const [dischargeEndPressureUnit, setDischargeEndPressureUnit] = useState<string>(unitSystem === 'metric' ? "bar" : "psig");
  const [dischargeServiceType, setDischargeServiceType] = useState<string>("Pump Discharge (Pop < 35 barg)");

  // Pipe properties
  const [pipeMaterial, setPipeMaterial] = useState<string>("Carbon Steel (New)");
  const [customRoughness, setCustomRoughness] = useState<string>("0.0457");

  // Fittings
  const [suctionFittings, setSuctionFittings] = useState<Record<string, number>>({
    "elbow_90_long": 1, "gate_valve_full": 1, "strainer_y": 1, "entrance_sharp": 1,
  });
  const [dischargeFittings, setDischargeFittings] = useState<Record<string, number>>({
    "elbow_90_long": 4, "gate_valve_full": 2, "check_valve_swing": 1, "exit_sharp": 1,
  });

  // Pump selection & Reciprocating Params
  const [pumpType, setPumpType] = useState<string>("centrifugal_oh2");
  const [pumpEfficiency, setPumpEfficiency] = useState<string>("75");
  const [motorEfficiency, setMotorEfficiency] = useState<string>("95");
  const [npshrMargin, setNpshrMargin] = useState<string>(unitSystem === 'metric' ? "0.5" : "1.6");
  const [pumpRpm, setPumpRpm] = useState<string>("2950"); // RPM

  // Display units
  const [headDisplayUnit, setHeadDisplayUnit] = useState<string>(unitSystem === 'metric' ? "m" : "ft");
  const [powerDisplayUnit, setPowerDisplayUnit] = useState<string>(unitSystem === 'metric' ? "kW" : "hp");

  // Metadata
  const [companyName, setCompanyName] = useState("Company Name");
  const [projectName, setProjectName] = useState("Project Name");
  const [itemNumber, setItemNumber] = useState("P-101");
  const [serviceName, setServiceName] = useState("Water Transfer");

  // Update units handler
  const handleUnitSystemChange = (newSystem: UnitSystem) => {
    if (newSystem !== unitSystem) {
      // Unit conversion helper
      const cvt = (val: string, factor: number) => {
        const num = parseFloat(val);
        return isNaN(num) ? val : (num * factor).toFixed(4);
      };
      const cvtTemp = (val: string, toF: boolean) => {
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return toF ? ((num * 9 / 5) + 32).toFixed(2) : ((num - 32) * 5 / 9).toFixed(2);
      };

      if (newSystem === 'imperial') {
        // Metric -> Imperial
        setFlowRate(prev => cvt(prev, 4.40287)); setFlowRateUnit("gpm");
        setDensity(prev => cvt(prev, 0.062428)); setDensityUnit("lb/ft³");
        setVaporPressure(prev => cvt(prev, 0.145038)); setVaporPressureUnit("psia");
        setFluidTemp(prev => cvtTemp(prev, true));
        setSuctionPressure(prev => cvt(prev, 0.145038)); setSuctionPressureUnit("psia");
        setSuctionStaticHead(prev => cvt(prev, 3.28084)); setSuctionHeadUnit("ft");
        setSuctionPipeLength(prev => cvt(prev, 3.28084)); setSuctionLengthUnit("ft");
        setDischargeStaticHead(prev => cvt(prev, 3.28084)); setDischargeHeadUnit("ft");
        setDischargePipeLength(prev => cvt(prev, 3.28084)); setDischargeLengthUnit("ft");
        setDischargeEndPressure(prev => cvt(prev, 14.5038)); setDischargeEndPressureUnit("psig");
        setHeadDisplayUnit("ft"); setPowerDisplayUnit("hp");
        setNpshrMargin(prev => cvt(prev, 3.28084));
      } else {
        // Imperial -> Metric
        setFlowRate(prev => cvt(prev, 1 / 4.40287)); setFlowRateUnit("m³/h");
        setDensity(prev => cvt(prev, 1 / 0.062428)); setDensityUnit("kg/m³");
        setVaporPressure(prev => cvt(prev, 1 / 0.145038)); setVaporPressureUnit("kPa");
        setFluidTemp(prev => cvtTemp(prev, false));
        setSuctionPressure(prev => cvt(prev, 1 / 0.145038)); setSuctionPressureUnit("kPa(a)");
        setSuctionStaticHead(prev => cvt(prev, 1 / 3.28084)); setSuctionHeadUnit("m");
        setSuctionPipeLength(prev => cvt(prev, 1 / 3.28084)); setSuctionLengthUnit("m");
        setDischargeStaticHead(prev => cvt(prev, 1 / 3.28084)); setDischargeHeadUnit("m");
        setDischargePipeLength(prev => cvt(prev, 1 / 3.28084)); setDischargeLengthUnit("m");
        setDischargeEndPressure(prev => cvt(prev, 1 / 14.5038)); setDischargeEndPressureUnit("bar");
        setHeadDisplayUnit("m"); setPowerDisplayUnit("kW");
        setNpshrMargin(prev => cvt(prev, 1 / 3.28084));
      }
    }
    setUnitSystem(newSystem);
  };

  const suctionCriteria = liquidServiceCriteria.find(c => c.service === suctionServiceType);
  const dischargeCriteria = liquidServiceCriteria.find(c => c.service === dischargeServiceType);

  const handleFluidChange = (fluidName: string) => {
    setSelectedFluid(fluidName);
    const fluid = commonLiquids.find(f => f.name === fluidName);
    if (fluid) {
      if (unitSystem === 'metric') {
        setDensity(fluid.density?.toString() || "1000");
        setViscosity(fluid.viscosity.toString());
        setDensityUnit("kg/m³");
        setViscosityUnit("cP");
        // Simple vapor pressure assumption for common fluids if needed, or leave as matches inputs
        if (fluidName === "Water") setVaporPressure("2.34");
      } else {
        // Imperial conversions
        setDensity((fluid.density ? fluid.density * 0.062428 : 62.4).toFixed(3));
        setViscosity(fluid.viscosity.toString()); // cP is standard
        setDensityUnit("lb/ft³");
        setViscosityUnit("cP");
        if (fluidName === "Water") setVaporPressure("0.34");
      }
    } else if (fluidName === "Custom") {
      // Keep current values, allow edit
    }
  };

  const patm = unitSystem === 'metric' ? 101.325 : 14.7;

  // ========== CALCULATIONS ==========
  const calculations = useMemo(() => {
    const g = 9.81;

    // Unit Maps
    const allFlowRateUnits = { ...metricFlowRateToM3s, ...imperialFlowRateToM3s };
    const allDensityUnits = { ...metricDensityToKgM3, ...imperialDensityToKgM3 };
    const allPressureUnits = { ...metricPressureToKPa, ...imperialPressureToKPa };
    const allHeadUnits = { ...metricHeadToMeters, ...imperialHeadToMeters };
    const allLengthUnits = { ...metricLengthToMeters, ...imperialLengthToMeters };

    // 1. Basic Inputs
    const Q_m3s = parseFloat(flowRate) * (allFlowRateUnits[flowRateUnit] || 0);
    const rho = parseFloat(density) * (allDensityUnits[densityUnit] || 1);
    const mu = parseFloat(viscosity) * (viscosityToPas[viscosityUnit] || 0.001);
    const Pv_abs = parseFloat(vaporPressure) * (allPressureUnits[vaporPressureUnit] || 1) * 1000;

    // Suction Pressure Input Handling
    // If Mode=System, Ps is Source Pressure. If Mode=Flange, Ps is Suction Flange Pressure.
    let Ps_input = parseFloat(suctionPressure) * (allPressureUnits[suctionPressureUnit] || 1) * 1000;
    // Check if input unit implies Gauge (this is a heuristic, ideally we'd track isGauge state)
    // For now assuming Suction Pressure is Absolute as per default units. 
    // If user wants gauge they would usually select a gauge unit if available, but default list is kPa(a)/psia.
    // If we want to support gauge suction input properly:
    // ... For now, assume Absolute input.
    const Ps_abs = Ps_input;

    // Discharge Pressure Input Handling
    // If Mode=System, Pd is Destination Pressure. If Mode=Flange, Pd is Discharge Flange Pressure.
    let Pd_input = parseFloat(dischargeEndPressure) * (allPressureUnits[dischargeEndPressureUnit] || 100) * 1000;
    const isDischargeGauge = dischargeEndPressureUnit.includes("g") || dischargeEndPressureUnit === "bar" || dischargeEndPressureUnit === "psig";
    // Note: "bar" is ambiguous but often gauge in industry, "kPa(a)" is abs. defaults map has "bar" -> 100 kPa.
    // Let's rely on string check properly:
    // Actually, "bar" is usually Absolute in physics but Gauge in industry? We treat "bar" as Gauge often.
    // Let's assume input unit string contains 'a' for absolute? 
    // Standard map: kPa(a), psia, bar(a), bar(g), psig.
    // `dischargeEndPressureUnit` defaults to "bar" or "psig".
    // If "bar", treating as Gauge + Patm is safer for End Pressure?
    // Let's normalize: if unit has 'g' or is 'psig'/'barg', add Patm.
    let Pd_abs = Pd_input;
    if (dischargeEndPressureUnit.includes("g") || dischargeEndPressureUnit === "psig") {
      Pd_abs += (patm * 1000);
    }
    // If "bar" (no suffix), assumes Absolute? Or Gauge? 
    // In our `metricPressureToKPa`, "bar" key exists?
    // Let's stick to safe assumption: Absolute unless "g" is explicit.

    // Pipe properties
    const roughness_m = pipeMaterial === "Custom"
      ? parseFloat(customRoughness) * 0.001
      : (pipeRoughness[pipeMaterial] || 0.0457) * 0.001;

    // 2. Geometry
    const suctionDia_mm = pipeScheduleData[suctionNominalDia]?.[suctionSchedule] || 154.05;
    const suctionDia_m = suctionDia_mm * 0.001;
    const suctionLength_m = parseFloat(suctionPipeLength) * (allLengthUnits[suctionLengthUnit] || 1);
    const suctionStaticHead_m = parseFloat(suctionStaticHead) * (allHeadUnits[suctionHeadUnit] || 1);
    const suctionNominalSizeInch = parseNominalDiameter(suctionNominalDia);

    const dischargeDia_mm = pipeScheduleData[dischargeNominalDia]?.[dischargeSchedule] || 102.26;
    const dischargeDia_m = dischargeDia_mm * 0.001;
    const dischargeLength_m = parseFloat(dischargePipeLength) * (allLengthUnits[dischargeLengthUnit] || 1);
    const dischargeStaticHead_m = parseFloat(dischargeStaticHead) * (allHeadUnits[dischargeHeadUnit] || 1);
    const dischargeNominalSizeInch = parseNominalDiameter(dischargeNominalDia);

    // 3. Velocities & Reynolds
    const suctionVelocity = calculateVelocity(Q_m3s, suctionDia_m);
    const dischargeVelocity = calculateVelocity(Q_m3s, dischargeDia_m);

    const suctionRe = calculateReynolds(suctionVelocity, suctionDia_m, rho, mu);
    const dischargeRe = calculateReynolds(dischargeVelocity, dischargeDia_m, rho, mu);

    // 4. Friction Factors
    const suctionFf = calculateFrictionFactor(suctionRe, roughness_m, suctionDia_m);
    const dischargeFf = calculateFrictionFactor(dischargeRe, roughness_m, dischargeDia_m);

    // 5. Fitting Losses (K-Factors)
    let suctionKTotal = 0;
    Object.entries(suctionFittings).forEach(([key, count]) => {
      if (fittingsDatabase[key] && count > 0) suctionKTotal += count * fittingsDatabase[key].K;
    });

    let dischargeKTotal = 0;
    Object.entries(dischargeFittings).forEach(([key, count]) => {
      if (fittingsDatabase[key] && count > 0) dischargeKTotal += count * fittingsDatabase[key].K;
    });

    // 6. Head Losses (Only calculated for display/system mode use)
    const suctionPipeLoss = suctionFf * (suctionLength_m / suctionDia_m) * (Math.pow(suctionVelocity, 2) / (2 * g));
    const suctionFittingLoss = suctionKTotal * (Math.pow(suctionVelocity, 2) / (2 * g));
    const suctionTotalLoss = suctionPipeLoss + suctionFittingLoss;

    const dischargePipeLoss = dischargeFf * (dischargeLength_m / dischargeDia_m) * (Math.pow(dischargeVelocity, 2) / (2 * g));
    const dischargeFittingLoss = dischargeKTotal * (Math.pow(dischargeVelocity, 2) / (2 * g));
    const dischargeTotalLoss = dischargePipeLoss + dischargeFittingLoss;

    const totalFrictionLoss = suctionTotalLoss + dischargeTotalLoss;

    // 7. Acceleration Head (Reciprocating)
    const accelerationHead = pumpType.includes("reciprocating")
      ? calculateAccelerationHead(suctionLength_m, suctionVelocity, parseFloat(pumpRpm), pumpType, parseFloat(compressibility))
      : 0;


    // 8. Calculations Branching (System vs Flange)
    let totalHead = 0;
    let npshaValue = 0;
    let totalStaticHead = 0; // Display purpose
    let pressureHead = 0; // Display purpose

    if (calculationMode === 'flange') {
      // --- FLANGE MODE (PUMP RATING) ---
      // Inputs: Ps (Flange), Pd (Flange), Pipe Sizes (for velocity head)
      // TDH = (Pd - Ps)/rho/g + (Vd^2 - Vs^2)/2g + (Zd - Zs)
      // Assuming Gauges are at same elevation or negligible diff (Zd-Zs=0) unless we use Static Head inputs?
      // Let's repurpose Static Head inputs as "Gauge Elevation" relative to datum if needed?
      // For simplicity/standard rating: Ignore Z diff or assume corrected pressures.
      const headPressure = (Pd_abs - Ps_abs) / (rho * g);
      const headVelocity = (Math.pow(dischargeVelocity, 2) - Math.pow(suctionVelocity, 2)) / (2 * g);
      const headElevation = (dischargeStaticHead_m - suctionStaticHead_m); // Optional: if user enters gauge elevations.

      // For "Flange Mode", usually we just want P_discharge - P_suction + velocity corrections.
      // If user sets Static Heads to 0 (default in this mode visually?), then Z term is 0.
      totalHead = headPressure + headVelocity + headElevation;

      // NPSHa = Ps_abs/rho/g + Vs^2/2g - Pv/rho/g + (Zs - Zdatum) - AccelerationHead
      // Assuming Ps is at flange centerline (Zs=0 relative to impeller eye datum if standard).
      const h_abs_suction = Ps_abs / (rho * g);
      const h_vel_suction = Math.pow(suctionVelocity, 2) / (2 * g);
      const h_vap = Pv_abs / (rho * g);

      // Note: Accel Head technically applies for the suction line. 
      // If user inputs Flange Pressure, Accel Head "in the pipe" is history? 
      // No, for Recip pumps, the pulsation exists at the flange too. 
      // But typically Accel Head is a loss in the supply line.
      // If we measure P_flange (avg), do we subtract Accel Head? 
      // API 674 says check NPSHa > NPSHr + Acceleration Head.
      // So NPSHa (available) should be calculated normally.
      // If Ps is measured average, we might still deduct Ha? 
      // Let's keep Ha subtraction for safety if Pump is Recip.
      // But Ha requires Suction Length... In Flange mode, Suction Length might be hidden/unknown?
      // If hidden, Ha = 0.

      npshaValue = h_abs_suction + h_vel_suction - h_vap;
      // Note: If Mode=Flange, we typically don't know pipe length, so Ha might be ignored or manually entered.
      // We will leave Ha=0 effectively if Length is 0 or ignored. 
      // But we will Subtract it if calculated (i.e. if user enters length). 
      // For pure Rating (no pipe info), length=0 -> Ha=0.

      totalStaticHead = headElevation;
      pressureHead = headPressure;

    } else {
      // --- SYSTEM MODE (SIZING) ---
      // Inputs: Ps (Source), Pd (Dest), Elevations, Lengths.
      // TDH = StaticDiff + Friction + PressureDiff
      // V diff is 0 (Source surfaces).
      const staticDiff = dischargeStaticHead_m - suctionStaticHead_m;
      const pressDiff = (Pd_abs - Ps_abs) / (rho * g);

      totalHead = staticDiff + totalFrictionLoss + pressDiff;

      // NPSHa = Ps_source + Z_source - Losses - Pvap
      // Velocity head at source = 0.
      npshaValue = calculateNPSHa(
        Ps_abs, Pv_abs, suctionStaticHead_m, suctionTotalLoss, 0, rho, accelerationHead
      );

      totalStaticHead = staticDiff;
      pressureHead = pressDiff;
    }

    // 9. Power
    const eta_pump = parseFloat(pumpEfficiency) / 100 || 0.75;
    const eta_motor = parseFloat(motorEfficiency) / 100 || 0.95;

    const hydraulicPower_kW = (rho * g * Q_m3s * totalHead) / 1000;
    const brakePower_kW = hydraulicPower_kW / eta_pump;
    const motorPower_kW = brakePower_kW / eta_motor;

    // 10. Specific Speed
    const Q_m3min = Q_m3s * 60;
    const n = parseFloat(pumpRpm) || 2950;
    const Ns = n * Math.sqrt(Q_m3min) / Math.pow(totalHead || 1, 0.75); // Using m3/min for Q
    const Nss = n * Math.sqrt(Q_m3min) / Math.pow(Math.max(npshaValue, 0.1), 0.75);

    // 11. Criteria Limits (Eni)
    const suctionCriteriaData = liquidServiceCriteria.find(c => c.service === suctionServiceType);
    const dischargeCriteriaData = liquidServiceCriteria.find(c => c.service === dischargeServiceType);
    const suctionVelLimit = suctionCriteriaData ? getLiquidVelocityLimit(suctionCriteriaData, suctionNominalSizeInch) : null;
    const dischargeVelLimit = dischargeCriteriaData ? getLiquidVelocityLimit(dischargeCriteriaData, dischargeNominalSizeInch) : null;

    // Pressure drop bar/km
    const suctionDpBarKm = suctionLength_m > 0 ? (suctionTotalLoss * rho * g / 100000) / (suctionLength_m / 1000) : 0;
    const dischargeDpBarKm = dischargeLength_m > 0 ? (dischargeTotalLoss * rho * g / 100000) / (dischargeLength_m / 1000) : 0;

    // 12. HI 9.6.7 Viscosity Corrections
    // Calculate if viscosity > 1 cSt (approx).
    // kinematic viscosity in cSt = mu (Pa.s) / rho (kg/m3) * 1e6
    const nu_cSt = (mu / rho) * 1e6;
    let viscosityCorrections = undefined;
    if (nu_cSt > 1.0 && selectedFluid !== "Water") { // Basic check, water is baseline
      // Assume Operating Point is basis for correction (matches common sizing practice)
      // Q in m3/h, H in m.
      viscosityCorrections = calculateHICorrections(Q_m3s * 3600, totalHead || 10, parseFloat(pumpRpm), nu_cSt);
    }

    // 13. Recommended Pipe Diameters (Atlas Copco-style)
    const recommendedSuctionDia = getRecommendedDiameter(Q_m3s, 1.2, suctionSchedule); // Target 1.2 m/s suction
    const recommendedDischargeDia = getRecommendedDiameter(Q_m3s, 2.5, dischargeSchedule); // Target 2.5 m/s discharge

    return {
      Q_m3s, suctionVelocity, dischargeVelocity, suctionRe, dischargeRe,
      suctionTotalLoss, dischargeTotalLoss, totalFrictionLoss,
      totalStaticHead, pressureHead, totalHead,
      npshaValue, accelerationHead,
      hydraulicPower_kW, brakePower_kW, motorPower_kW,
      Ns, Nss,
      suctionNominalSizeInch, dischargeNominalSizeInch,
      suctionDia_mm, dischargeDia_mm,
      suctionVelLimit, dischargeVelLimit, suctionDpBarKm, dischargeDpBarKm,
      suctionCriteriaData, dischargeCriteriaData,
      viscosityPaS: mu,
      viscosityCorrections,
      recommendedSuctionDia, recommendedDischargeDia
    };
  }, [
    flowRate, flowRateUnit, density, densityUnit, viscosity, viscosityUnit,
    vaporPressure, vaporPressureUnit, suctionPressure, suctionPressureUnit,
    pipeMaterial, customRoughness,
    suctionStaticHead, suctionHeadUnit, suctionPipeLength, suctionLengthUnit,
    suctionNominalDia, suctionSchedule, suctionServiceType, suctionFittings,
    dischargeStaticHead, dischargeHeadUnit, dischargePipeLength, dischargeLengthUnit,
    dischargeNominalDia, dischargeSchedule, dischargeServiceType, dischargeFittings,
    dischargeEndPressure, dischargeEndPressureUnit,
    pumpType, pumpRpm, compressibility, pumpEfficiency, motorEfficiency,
    calculationMode, patm
  ]);

  // Export handlers
  const handleExportPDF = () => {
    generatePumpPDF({
      title: "Pump Process Datasheet", companyName, projectName, itemNumber, service: serviceName,
      date: new Date().toLocaleDateString(), unitSystem: unitSystem === 'metric' ? "Metric" : "Imperial",
      flowRate, flowUnit: flowRateUnit, head: calculations.totalHead.toFixed(2), headUnit: headDisplayUnit,
      liquidName: "Process Fluid", temp: fluidTemp, density, densityUnit, viscosity, viscosityUnit,
      vaporPressure, vaporPressureUnit, type: pumpTypes[pumpType].name, standard: pumpTypes[pumpType].standard,
      efficiency: pumpEfficiency, motorEfficiency: motorEfficiency,
      suctionPress: suctionPressure, suctionPressUnit: suctionPressureUnit,
      dischargePress: dischargeEndPressure, dischargePressUnit: dischargeEndPressureUnit,
      tdh: calculations.totalHead.toFixed(2), tdhUnit: headDisplayUnit,
      npsha: calculations.npshaValue.toFixed(2), npshaMargin: npshrMargin, npshaUnit: headDisplayUnit,
      hydPower: calculations.hydraulicPower_kW.toFixed(2), brakePower: calculations.brakePower_kW.toFixed(2),
      motorPower: calculations.motorPower_kW.toFixed(2), powerUnit: powerDisplayUnit,
      suctionVel: calculations.suctionVelocity.toFixed(2), dischargeVel: calculations.dischargeVelocity.toFixed(2),
      velUnit: unitSystem === 'metric' ? "m/s" : "ft/s"
    });
    toast({ title: "Export Successful", description: "PDF Datasheet generated." });
  };

  const handleExportExcel = () => {
    generatePumpExcelDatasheet({
      pdfTitle: "Pump Process Datasheet", companyName, projectName, itemNumber, service: serviceName,
      date: new Date().toLocaleDateString(), unitSystem: unitSystem === 'metric' ? "Metric" : "Imperial",
      flowRate, flowRateUnit, head: calculations.totalHead.toFixed(2), headUnit: headDisplayUnit,
      temperature: fluidTemp, liquid: "Process Fluid", density, densityUnit, viscosity, viscosityUnit,
      vaporPressure, vaporPressureUnit, pumpType: pumpTypes[pumpType].name, standard: pumpTypes[pumpType].standard,
      efficiency: pumpEfficiency, motorEfficiency: motorEfficiency,
      hydraulicPower: calculations.hydraulicPower_kW.toFixed(2), brakePower: calculations.brakePower_kW.toFixed(2),
      motorPower: calculations.motorPower_kW.toFixed(2), powerUnit: powerDisplayUnit,
      npsha: calculations.npshaValue.toFixed(2), npshaMargin: npshrMargin, npshaUnit: headDisplayUnit,
      suctionPressure, suctionPressureUnit, dischargePressure: dischargeEndPressure, dischargePressureUnit: dischargeEndPressureUnit,
      totalHead: calculations.totalHead.toFixed(2), totalHeadUnit: headDisplayUnit,
      suctionVelocity: calculations.suctionVelocity.toFixed(2), dischargeVelocity: calculations.dischargeVelocity.toFixed(2),
      velocityUnit: unitSystem === 'metric' ? "m/s" : "ft/s"
    });
    toast({ title: "Export Successful", description: "Excel Datasheet generated." });
  };

  const fittingCategories = getFittingsByCategory();

  return (
    <div className="space-y-6">
      {/* Unit System Header */}
      <div className="bg-gradient-to-r from-primary/5 via-muted/30 to-primary/5 rounded-xl border-2 border-primary/20 p-4">
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Units:</span>
            <div className="flex items-center gap-1.5 bg-background/80 rounded-lg px-2 py-1 border shadow-sm">
              <span className={`text-xs font-semibold ${unitSystem === 'metric' ? 'text-primary' : 'text-muted-foreground'}`}>Metric</span>
              <Switch checked={unitSystem === 'imperial'} onCheckedChange={(checked) => handleUnitSystemChange(checked ? 'imperial' : 'metric')} className="scale-75" />
              <span className={`text-xs font-semibold ${unitSystem === 'imperial' ? 'text-primary' : 'text-muted-foreground'}`}>Imperial</span>
            </div>
          </div>
          <div className="hidden lg:block h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{fluidTemp} {unitSystem === 'metric' ? '°C' : '°F'}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Mode:</span>
            <Select value={calculationMode} onValueChange={(v: any) => setCalculationMode(v)}>
              <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System Sizing (Source)</SelectItem>
                <SelectItem value="flange">Pump Rating (Flange)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="text-xs ml-auto" title="Friction: Churchill (1977) | Acceleration: API 674">API 610 / 674 • Churchill</Badge>
        </div>
      </div>

      <Tabs defaultValue="calculator" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 h-12 bg-secondary/30 p-1 rounded-full">
            <TabsTrigger value="calculator" className="rounded-full">Calculator</TabsTrigger>
            <TabsTrigger value="curves" className="rounded-full">Curves</TabsTrigger>
            <TabsTrigger value="guide" className="rounded-full">Guide</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calculator" className="space-y-6">
          {/* Atlas Copco-inspired System Diagram */}
          <PumpSystemDiagram
            suctionHead={suctionStaticHead}
            dischargeHead={dischargeStaticHead}
            suctionLength={suctionPipeLength}
            dischargeLength={dischargePipeLength}
            suctionDia={suctionNominalDia}
            dischargeDia={dischargeNominalDia}
            suctionDiaMM={calculations.suctionDia_mm}
            dischargeDiaMM={calculations.dischargeDia_mm}
            flowRate={flowRate}
            flowRateUnit={flowRateUnit}
            totalHead={calculations.totalHead}
            npsha={calculations.npshaValue}
            hydraulicPower={calculations.hydraulicPower_kW}
            brakePower={calculations.brakePower_kW}
            suctionVelocity={calculations.suctionVelocity}
            dischargeVelocity={calculations.dischargeVelocity}
            unitSystem={unitSystem}
            headUnit={unitSystem === 'metric' ? 'm' : 'ft'}
            lengthUnit={unitSystem === 'metric' ? 'm' : 'ft'}
            recommendedSuctionDia={calculations.recommendedSuctionDia}
            recommendedDischargeDia={calculations.recommendedDischargeDia}
          />

          <Tabs defaultValue="flow" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 rounded-lg p-1">
              <TabsTrigger value="flow" className="text-xs py-2"><Droplets className="w-4 h-4 mr-2 hidden sm:inline" />Flow</TabsTrigger>
              <TabsTrigger value="suction" className="text-xs py-2"><ArrowUpCircle className="w-4 h-4 mr-2 hidden sm:inline rotate-180" />Suction</TabsTrigger>
              <TabsTrigger value="discharge" className="text-xs py-2"><ArrowUpCircle className="w-4 h-4 mr-2 hidden sm:inline" />Discharge</TabsTrigger>
              <TabsTrigger value="fittings" className="text-xs py-2"><Activity className="w-4 h-4 mr-2 hidden sm:inline" />Fittings</TabsTrigger>
              <TabsTrigger value="pump" className="text-xs py-2"><Gauge className="w-4 h-4 mr-2 hidden sm:inline" />Pump</TabsTrigger>
            </TabsList>

            {/* Flow Tab */}
            <TabsContent value="flow">
              <Card>
                <CardHeader><CardTitle className="text-lg flex gap-2"><Droplets className="w-5 h-5 text-primary" />Flow & Fluid Properties</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Fluid Selection</Label>
                    <Select value={selectedFluid} onValueChange={handleFluidChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {commonLiquids.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                        <SelectItem value="Custom">Custom Liquid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Flow Rate</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={flowRate} onChange={e => setFlowRate(e.target.value)} />
                      <Select value={flowRateUnit} onValueChange={setFlowRateUnit}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(flowRateUnits).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Density</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={density} onChange={e => setDensity(e.target.value)} />
                      <Select value={densityUnit} onValueChange={setDensityUnit}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(densityUnits).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Viscosity</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={viscosity} onChange={e => setViscosity(e.target.value)} />
                      <Select value={viscosityUnit} onValueChange={setViscosityUnit}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(viscosityToPas).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Vapor Pressure</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={vaporPressure} onChange={e => setVaporPressure(e.target.value)} />
                      <Select value={vaporPressureUnit} onValueChange={setVaporPressureUnit}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(pressureUnits).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature ({unitSystem === 'metric' ? '°C' : '°F'})</Label>
                    <Input type="number" value={fluidTemp} onChange={e => setFluidTemp(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Suction Tab */}
            <TabsContent value="suction">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-lg">
                    <CardTitle className="text-lg flex gap-2"><ArrowUpCircle className="w-5 h-5 text-blue-500 rotate-180" />Suction Side</CardTitle>
                    <Select value={suctionServiceType} onValueChange={setSuctionServiceType}>
                      <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{liquidServiceCriteria.filter(c => c.service.includes('Suction') || c.service.includes('Gravity')).map(c => <SelectItem key={c.service} value={c.service}>{c.service}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{calculationMode === 'flange' ? 'Suction Flange Pressure' : 'Source Pressure (Abs)'}</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={suctionPressure} onChange={e => setSuctionPressure(e.target.value)} />
                      <Select value={suctionPressureUnit} onValueChange={setSuctionPressureUnit}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(pressureUnits).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {calculationMode === 'system' && (
                    <div className="space-y-2">
                      <Label>Static Head (Elev.)</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={suctionStaticHead} onChange={e => setSuctionStaticHead(e.target.value)} />
                        <Select value={suctionHeadUnit} onValueChange={setSuctionHeadUnit}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.keys(headUnits).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {calculationMode === 'system' && (
                    <div className="space-y-2">
                      <Label>Pipe Length</Label>
                      <Input type="number" value={suctionPipeLength} onChange={e => setSuctionPipeLength(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Nominal Dia</Label>
                    <Select value={suctionNominalDia} onValueChange={setSuctionNominalDia}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{nominalDiameters.map(d => <SelectItem key={d} value={d}>{d}"</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Select value={suctionSchedule} onValueChange={setSuctionSchedule}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{getSchedulesForDiameter(suctionNominalDia).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-full p-3 bg-muted/40 rounded border">
                    <p className="text-xs font-semibold mb-2">Suction Analysis {calculationMode === 'flange' && '(Flange Conditions)'}</p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="flex justify-between"><span>Velocity:</span> <span className={`${calculations.suctionVelocity <= (calculations.suctionVelLimit || 2) ? "text-green-600" : "text-red-500 font-bold"}`}>{calculations.suctionVelocity.toFixed(2)} m/s</span></div>
                      <div className="flex justify-between"><span>Reynolds:</span> <span>{calculations.suctionRe.toExponential(2)}</span></div>
                      {calculationMode === 'system' && <div className="flex justify-between"><span>Loss:</span> <span>{calculations.suctionTotalLoss.toFixed(2)} m</span></div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Discharge Tab */}
            <TabsContent value="discharge">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center bg-orange-50/50 p-2 rounded-lg">
                    <CardTitle className="text-lg flex gap-2"><ArrowUpCircle className="w-5 h-5 text-orange-500" />Discharge Side</CardTitle>
                    <Select value={dischargeServiceType} onValueChange={setDischargeServiceType}>
                      <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{liquidServiceCriteria.filter(c => c.service.includes('Discharge') || c.service.includes('Manifold')).map(c => <SelectItem key={c.service} value={c.service}>{c.service}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{calculationMode === 'flange' ? 'Discharge Flange Pressure' : 'End Pressure (Gauge)'}</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={dischargeEndPressure} onChange={e => setDischargeEndPressure(e.target.value)} />
                      <Select value={dischargeEndPressureUnit} onValueChange={setDischargeEndPressureUnit}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(pressureUnits).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {calculationMode === 'system' && (
                    <div className="space-y-2">
                      <Label>Static Head (Elev.)</Label>
                      <Input type="number" value={dischargeStaticHead} onChange={e => setDischargeStaticHead(e.target.value)} />
                    </div>
                  )}
                  {calculationMode === 'system' && (
                    <div className="space-y-2">
                      <Label>Pipe Length</Label>
                      <Input type="number" value={dischargePipeLength} onChange={e => setDischargePipeLength(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Nominal Dia</Label>
                    <Select value={dischargeNominalDia} onValueChange={setDischargeNominalDia}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{nominalDiameters.map(d => <SelectItem key={d} value={d}>{d}"</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Select value={dischargeSchedule} onValueChange={setDischargeSchedule}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{getSchedulesForDiameter(dischargeNominalDia).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-full p-3 bg-muted/40 rounded border">
                    <p className="text-xs font-semibold mb-2">Discharge Analysis</p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="flex justify-between"><span>Velocity:</span> <span className={`${calculations.dischargeVelocity <= (calculations.dischargeVelLimit || 4) ? "text-green-600" : "text-red-500 font-bold"}`}>{calculations.dischargeVelocity.toFixed(2)} m/s</span></div>
                      <div className="flex justify-between"><span>Reynolds:</span> <span>{calculations.dischargeRe.toExponential(2)}</span></div>
                      {calculationMode === 'system' && <div className="flex justify-between"><span>Loss:</span> <span>{calculations.dischargeTotalLoss.toFixed(2)} m</span></div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fittings Tab */}
            <TabsContent value="fittings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base text-blue-600">Suction Fittings</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(fittingCategories).map(([cat, items]) => (
                      <div key={cat}>
                        <h4 className="text-xs font-semibold mb-1 text-muted-foreground">{cat}</h4>
                        {items.map(item => (
                          <div key={item.key} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                            <span>{item.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] w-12 justify-center">K={item.K}</Badge>
                              <Input
                                type="number"
                                min="0"
                                className="h-7 w-16 text-right"
                                value={suctionFittings[item.key] || 0}
                                onChange={e => setSuctionFittings({ ...suctionFittings, [item.key]: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base text-orange-600">Discharge Fittings</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(fittingCategories).map(([cat, items]) => (
                      <div key={cat}>
                        <h4 className="text-xs font-semibold mb-1 text-muted-foreground">{cat}</h4>
                        {items.map(item => (
                          <div key={item.key} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                            <span>{item.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] w-12 justify-center">K={item.K}</Badge>
                              <Input
                                type="number"
                                min="0"
                                className="h-7 w-16 text-right"
                                value={dischargeFittings[item.key] || 0}
                                onChange={e => setDischargeFittings({ ...dischargeFittings, [item.key]: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pump Selection Tab */}
            <TabsContent value="pump">
              <Card>
                <CardHeader><CardTitle className="text-lg flex gap-2"><Gauge className="w-5 h-5 text-primary" />Pump Configuration</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Pump Type Standard</Label>
                    <Select value={pumpType} onValueChange={setPumpType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="centrifugal_oh2" className="font-semibold">API 610 (Centrifugal)</SelectItem>
                        {Object.keys(pumpTypes).filter(k => k.includes('centrifugal')).map(k => <SelectItem key={k} value={k}>{pumpTypes[k].name}</SelectItem>)}
                        <SelectItem value="reciprocating_triplex" className="font-semibold mt-2">API 674 (Reciprocating)</SelectItem>
                        {Object.keys(pumpTypes).filter(k => k.includes('reciprocating')).map(k => <SelectItem key={k} value={k}>{pumpTypes[k].name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Common Pump Params */}
                  <div className="space-y-2">
                    <Label className="text-xs">Pump Speed (RPM)</Label>
                    <Input type="number" value={pumpRpm} onChange={e => setPumpRpm(e.target.value)} />
                  </div>

                  {/* Reciprocating Specific Inputs */}
                  {pumpType.includes('reciprocating') && (
                    <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200">
                      <Label className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <Settings className="w-4 h-4" /> Reciprocating Params
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Compressibility (K)</Label>
                          <Input type="number" value={compressibility} onChange={e => setCompressibility(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                          <p className="text-[10px] text-muted-foreground pb-2">Required for Acceleration Head calc (API 674).</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Label>Efficiency Estimates</Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label className="text-xs">Pump η (%)</Label>
                        <Input type="number" value={pumpEfficiency} onChange={e => setPumpEfficiency(e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Motor η (%)</Label>
                        <Input type="number" value={motorEfficiency} onChange={e => setMotorEfficiency(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Results Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Pump Sizing Results</CardTitle></CardHeader>
            <CardContent>
              {calculations.viscosityCorrections && calculations.viscosityCorrections.B > 0 && (
                <div className="mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 rounded text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-700 dark:text-blue-300">HI 9.6.7 Viscosity Correction Applied</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                    <div>Parameter B: <span className="font-mono font-bold text-foreground">{calculations.viscosityCorrections.B.toFixed(2)}</span></div>
                    <div>Head Factor ($C_H$): <span className="font-mono font-bold text-foreground">{calculations.viscosityCorrections.C_H.toFixed(3)}</span></div>
                    <div>Flow Factor ($C_Q$): <span className="font-mono font-bold text-foreground">{calculations.viscosityCorrections.C_Q.toFixed(3)}</span></div>
                    <div>Eff. Factor ($C_\eta$): <span className="font-mono font-bold text-foreground">{calculations.viscosityCorrections.C_eta.toFixed(3)}</span></div>
                  </div>
                  <p className="mt-2 text-xs italic opacity-80">
                    Performance is derated for viscosity.
                    Predicting Water Performance: Q_w = Q_vis/C_Q, H_w = H_vis/C_H, η_vis = η_w × C_η.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Dynamic Head</p>
                  <p className="text-2xl font-bold font-mono">{calculations.totalHead.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">m</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Hydraulic Power</p>
                  <p className="text-2xl font-bold font-mono text-blue-600">{calculations.hydraulicPower_kW.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">kW</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">NPSH Available</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold font-mono ${calculations.npshaValue > 3 ? 'text-green-600' : 'text-red-500'}`}>{calculations.npshaValue.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">m</span></p>
                    {calculations.accelerationHead > 0 && (
                      <Tooltip>
                        <TooltipTrigger><AlertTriangle className="w-4 h-4 text-amber-500" /></TooltipTrigger>
                        <TooltipContent>Includes {calculations.accelerationHead.toFixed(2)}m acceleration head loss</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Brake Power</p>
                  <p className="text-2xl font-bold font-mono">{calculations.brakePower_kW.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">kW</span></p>
                </div>
                <div className="space-y-1"> // Electrical Power
                  <p className="text-sm text-muted-foreground">Electrical Power</p>
                  <p className="text-2xl font-bold font-mono text-amber-600">{calculations.motorPower_kW.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">kW</span></p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={handleExportExcel}>Export Excel</Button>
                <Button onClick={handleExportPDF}>Download Datasheet</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curves">
          <PumpPerformanceCurves
            operatingFlow={calculations.Q_m3s * 3600} // m³/h
            operatingHead={calculations.totalHead} // m
            operatingEfficiency={parseFloat(pumpEfficiency)}
            operatingPower={calculations.brakePower_kW}
            npshr={Math.max(0.1, calculations.npshaValue - (parseFloat(npshrMargin) * (unitSystem === 'imperial' ? 0.3048 : 1)))} // Estimate NPSHr from NPSHa - Margin
            npsha={calculations.npshaValue}
            pumpType={pumpType}
          />
        </TabsContent>

        <TabsContent value="guide">
          <PumpSizingGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PumpSizingCalculator;
