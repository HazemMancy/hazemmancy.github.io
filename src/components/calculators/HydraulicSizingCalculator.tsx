import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, ArrowRight, AlertTriangle, Info, CheckCircle2, Wind, Droplets, Waves } from "lucide-react";

// Darcy-Weisbach is the only method used - matching HYSYS calculations

// ENI Gas Line Sizing Criteria (Table 8.1.1.1)
interface GasSizingCriteria {
  service: string;
  pressureRange: string;
  pressureDropBarKm: number | null; // null = not specified, or "10% Pop" for vacuum
  velocityMs: number | null; // null = not specified
  rhoV2: number | null; // kg/m*s² - null = not specified
  mach: number | null; // null = not specified
  note?: string;
}

const gasServiceCriteria: GasSizingCriteria[] = [
  // Continuous service
  { service: "Continuous", pressureRange: "Vacuum", pressureDropBarKm: null, velocityMs: 60, rhoV2: null, mach: null, note: "ΔP = 10% Pop" },
  { service: "Continuous", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.5, velocityMs: 50, rhoV2: null, mach: null, note: "Note 1" },
  { service: "Continuous", pressureRange: "2 to 7 barg", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2: null, mach: null },
  { service: "Continuous", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.5, velocityMs: null, rhoV2: 15000, mach: null },
  { service: "Continuous", pressureRange: "35 to 140 barg", pressureDropBarKm: 3, velocityMs: null, rhoV2: 20000, mach: null },
  { service: "Continuous", pressureRange: "Above 140 barg", pressureDropBarKm: 5, velocityMs: null, rhoV2: 25000, mach: null },
  
  // Compressor suction
  { service: "Compressor Suction", pressureRange: "Vacuum", pressureDropBarKm: 0.05, velocityMs: 35, rhoV2: null, mach: null },
  { service: "Compressor Suction", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.15, velocityMs: 30, rhoV2: null, mach: null },
  { service: "Compressor Suction", pressureRange: "2 to 7 barg", pressureDropBarKm: 0.4, velocityMs: 25, rhoV2: null, mach: null },
  { service: "Compressor Suction", pressureRange: "7 to 35 barg", pressureDropBarKm: 1, velocityMs: null, rhoV2: 6000, mach: null },
  { service: "Compressor Suction", pressureRange: "Above 35 barg", pressureDropBarKm: 2, velocityMs: null, rhoV2: 15000, mach: null },
  
  // Discontinuous service
  { service: "Discontinuous", pressureRange: "Below 35 barg", pressureDropBarKm: null, velocityMs: 60, rhoV2: 15000, mach: null },
  { service: "Discontinuous", pressureRange: "35 barg and above", pressureDropBarKm: null, velocityMs: null, rhoV2: 25000, mach: null },
  
  // Flare
  { service: "Flare - Upstream PSV", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2: null, mach: null, note: "ΔP < 3% PRV set" },
  { service: "Flare - Upstream BDV", pressureRange: "All", pressureDropBarKm: null, velocityMs: 60, rhoV2: 30000, mach: null },
  { service: "Flare - Tail Pipe", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2: null, mach: 0.7, note: "Note 2" },
  { service: "Flare - Tail Pipe (downstream BDV)", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2: null, mach: 1.0 },
  { service: "Flare Header", pressureRange: "All", pressureDropBarKm: null, velocityMs: null, rhoV2: null, mach: 0.5 },
  
  // Steam to users
  { service: "Steam - Superheated #150", pressureRange: "All", pressureDropBarKm: 2.0, velocityMs: 45, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam - Superheated #300", pressureRange: "All", pressureDropBarKm: 3.0, velocityMs: 60, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam - Superheated #600", pressureRange: "All", pressureDropBarKm: 6.0, velocityMs: 60, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam - Superheated #900+", pressureRange: "All", pressureDropBarKm: 8.0, velocityMs: 70, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam - Saturated #150", pressureRange: "All", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2: null, mach: null, note: "Note 3" },
  { service: "Steam - Saturated #300", pressureRange: "All", pressureDropBarKm: 3.0, velocityMs: 35, rhoV2: null, mach: null, note: "Note 3" },
  { service: "Steam - Saturated #600", pressureRange: "All", pressureDropBarKm: 6.0, velocityMs: 30, rhoV2: null, mach: null, note: "Note 3" },
  
  // Superheated Steam long headers
  { service: "Steam Header - #150", pressureRange: "All", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam Header - #300", pressureRange: "All", pressureDropBarKm: 1.5, velocityMs: 45, rhoV2: null, mach: null, note: "Note 4" },
  { service: "Steam Header - #600", pressureRange: "All", pressureDropBarKm: 2.0, velocityMs: 45, rhoV2: null, mach: null, note: "Note 4" },
  
  // Fuel Gas (same as continuous)
  { service: "Fuel Gas", pressureRange: "Atm to 2 barg", pressureDropBarKm: 0.5, velocityMs: 50, rhoV2: null, mach: null },
  { service: "Fuel Gas", pressureRange: "2 to 7 barg", pressureDropBarKm: 1.0, velocityMs: 45, rhoV2: null, mach: null },
  { service: "Fuel Gas", pressureRange: "7 to 35 barg", pressureDropBarKm: 1.5, velocityMs: null, rhoV2: 15000, mach: null },
];

// Get unique service types
const gasServiceTypes = [...new Set(gasServiceCriteria.map(c => c.service))];

// Get pressure ranges for a service type
const getPressureRangesForService = (service: string): string[] => {
  return gasServiceCriteria.filter(c => c.service === service).map(c => c.pressureRange);
};

// Get criteria for a specific service and pressure range
const getCriteriaForServiceAndPressure = (service: string, pressureRange: string): GasSizingCriteria | undefined => {
  return gasServiceCriteria.find(c => c.service === service && c.pressureRange === pressureRange);
};

// Unit conversion factors to SI
const lengthToMeters: Record<string, number> = {
  m: 1,
  km: 1000,
};

const diameterToMeters: Record<string, number> = {
  mm: 0.001,
  in: 0.0254,
};

// ASME B36.10M / B36.19M Pipe Schedule Data - Inside Diameter (mm)
// Schedule types: 5s, 10s, 10, 20, 30, 40s, STD, 40, 60, 80s, XS, 80, 100, 120, 140, 160, XXS
const pipeScheduleData: Record<string, Record<string, number>> = {
  // NPS 1/2" (DN 15) - OD: 21.3 mm
  "1/2": { 
    "5s": 18.04, "10s": 17.12, "10": 17.12, "40s": 15.80, "STD": 15.80, "40": 15.80, 
    "80s": 13.87, "XS": 13.87, "80": 13.87, "160": 11.74, "XXS": 6.35 
  },
  // NPS 3/4" (DN 20) - OD: 26.7 mm
  "3/4": { 
    "5s": 23.37, "10s": 22.45, "10": 22.45, "40s": 20.93, "STD": 20.93, "40": 20.93, 
    "80s": 18.85, "XS": 18.85, "80": 18.85, "160": 15.54, "XXS": 11.07 
  },
  // NPS 1" (DN 25) - OD: 33.4 mm
  "1": { 
    "5s": 29.51, "10s": 27.86, "10": 27.86, "40s": 26.64, "STD": 26.64, "40": 26.64, 
    "80s": 24.31, "XS": 24.31, "80": 24.31, "160": 20.70, "XXS": 15.22 
  },
  // NPS 1-1/4" (DN 32) - OD: 42.2 mm
  "1-1/4": { 
    "5s": 38.14, "10s": 36.63, "10": 36.63, "40s": 35.05, "STD": 35.05, "40": 35.05, 
    "80s": 32.46, "XS": 32.46, "80": 32.46, "160": 29.46, "XXS": 22.76 
  },
  // NPS 1-1/2" (DN 40) - OD: 48.3 mm
  "1-1/2": { 
    "5s": 44.20, "10s": 42.72, "10": 42.72, "40s": 40.89, "STD": 40.89, "40": 40.89, 
    "80s": 38.10, "XS": 38.10, "80": 38.10, "160": 33.98, "XXS": 27.94 
  },
  // NPS 2" (DN 50) - OD: 60.3 mm
  "2": { 
    "5s": 56.26, "10s": 54.79, "10": 54.79, "40s": 52.50, "STD": 52.50, "40": 52.50, 
    "80s": 49.25, "XS": 49.25, "80": 49.25, "160": 42.90, "XXS": 38.16 
  },
  // NPS 2-1/2" (DN 65) - OD: 73.0 mm
  "2-1/2": { 
    "5s": 68.78, "10s": 66.90, "10": 66.90, "40s": 62.71, "STD": 62.71, "40": 62.71, 
    "80s": 59.00, "XS": 59.00, "80": 59.00, "160": 53.98, "XXS": 44.96 
  },
  // NPS 3" (DN 80) - OD: 88.9 mm
  "3": { 
    "5s": 84.68, "10s": 82.80, "10": 82.80, "40s": 77.93, "STD": 77.93, "40": 77.93, 
    "80s": 73.66, "XS": 73.66, "80": 73.66, "160": 66.64, "XXS": 58.42 
  },
  // NPS 4" (DN 100) - OD: 114.3 mm
  "4": { 
    "5s": 110.08, "10s": 108.20, "10": 108.20, "40s": 102.26, "STD": 102.26, "40": 102.26, 
    "80s": 97.18, "XS": 97.18, "80": 97.18, "120": 92.04, "160": 87.32, "XXS": 80.06 
  },
  // NPS 6" (DN 150) - OD: 168.3 mm
  "6": { 
    "5s": 164.66, "10s": 162.74, "10": 162.74, "40s": 154.05, "STD": 154.05, "40": 154.05, 
    "80s": 146.33, "XS": 146.33, "80": 146.33, "120": 139.70, "160": 131.78, "XXS": 124.38 
  },
  // NPS 8" (DN 200) - OD: 219.1 mm
  "8": { 
    "5s": 216.66, "10s": 214.96, "10": 214.96, "20": 209.55, "30": 206.38, 
    "40s": 205.00, "STD": 202.72, "40": 202.72, "60": 196.85, 
    "80s": 196.85, "XS": 193.68, "80": 193.68, "100": 186.96, "120": 180.98, "140": 177.80, "160": 173.99, "XXS": 174.64 
  },
  // NPS 10" (DN 250) - OD: 273.0 mm
  "10": { 
    "5s": 271.02, "10s": 268.92, "10": 268.92, "20": 262.76, "30": 257.48, 
    "40s": 260.35, "STD": 254.51, "40": 254.51, "60": 247.65, 
    "80s": 254.51, "XS": 247.65, "80": 242.87, "100": 236.52, "120": 230.18, "140": 225.42, "160": 222.25, "XXS": 222.25 
  },
  // NPS 12" (DN 300) - OD: 323.8 mm
  "12": { 
    "5s": 323.85, "10s": 320.42, "10": 320.42, "20": 314.66, "30": 307.09, 
    "40s": 315.88, "STD": 303.23, "40": 303.23, "60": 295.30, 
    "80s": 311.15, "XS": 298.45, "80": 288.90, "100": 280.92, "120": 273.05, "140": 266.70, "160": 264.67, "XXS": 264.67 
  },
  // NPS 14" (DN 350) - OD: 355.6 mm
  "14": { 
    "5s": 350.50, "10s": 347.68, "10": 347.68, "20": 342.90, "30": 339.76, 
    "STD": 347.68, "40": 336.54, "60": 330.20, 
    "XS": 339.76, "80": 323.88, "100": 317.50, "120": 311.18, "140": 304.80, "160": 290.58 
  },
  // NPS 16" (DN 400) - OD: 406.4 mm
  "16": { 
    "5s": 400.86, "10s": 398.02, "10": 398.02, "20": 393.70, "30": 387.36, 
    "STD": 398.02, "40": 381.00, "60": 374.66, 
    "XS": 387.36, "80": 363.52, "100": 354.08, "120": 344.48, "140": 336.54, "160": 333.34 
  },
  // NPS 18" (DN 450) - OD: 457.2 mm
  "18": { 
    "5s": 451.46, "10s": 448.62, "10": 448.62, "20": 444.30, "30": 434.72, 
    "STD": 448.62, "40": 428.66, "60": 419.10, 
    "XS": 434.72, "80": 409.58, "100": 398.02, "120": 387.36, "140": 381.00, "160": 376.94 
  },
  // NPS 20" (DN 500) - OD: 508.0 mm
  "20": { 
    "5s": 501.80, "10s": 498.44, "10": 498.44, "20": 490.96, "30": 482.60, 
    "STD": 498.44, "40": 477.82, "60": 466.78, 
    "XS": 482.60, "80": 455.62, "100": 444.30, "120": 431.80, "140": 419.10, "160": 419.10 
  },
  // NPS 24" (DN 600) - OD: 609.6 mm
  "24": { 
    "5s": 603.25, "10s": 598.42, "10": 598.42, "20": 590.04, "30": 581.66, 
    "STD": 598.42, "40": 574.68, "60": 560.32, 
    "XS": 581.66, "80": 547.68, "100": 530.10, "120": 514.35, "140": 504.82, "160": 498.44 
  },
  // NPS 30" (DN 750) - OD: 762.0 mm
  "30": { 
    "5s": 755.65, "10s": 749.30, "10": 749.30, "20": 736.60, "30": 723.90, 
    "STD": 749.30, "XS": 736.60 
  },
  // NPS 36" (DN 900) - OD: 914.4 mm
  "36": { 
    "5s": 906.65, "10s": 898.52, "10": 898.52, "20": 882.90, "30": 869.95, 
    "STD": 898.52, "40": 863.60, "XS": 882.90 
  },
  // NPS 42" (DN 1050) - OD: 1066.8 mm
  "42": { 
    "5s": 1057.91, "10s": 1047.75, "10": 1047.75, "20": 1031.88, "30": 1016.00, 
    "STD": 1047.75, "XS": 1031.88 
  },
  // NPS 48" (DN 1200) - OD: 1219.2 mm
  "48": { 
    "5s": 1209.17, "10s": 1196.85, "10": 1196.85, "20": 1178.56, "30": 1162.05, 
    "STD": 1196.85, "XS": 1178.56 
  },
};

// Schedule order for display (ASME B36.10M / B36.19M)
const scheduleOrder = ["5s", "10s", "10", "20", "30", "40s", "STD", "40", "60", "80s", "XS", "80", "100", "120", "140", "160", "XXS"];

const nominalDiameters = Object.keys(pipeScheduleData);

// Get available schedules for a nominal diameter (sorted by schedule order)
const getSchedulesForDiameter = (nd: string): string[] => {
  const available = Object.keys(pipeScheduleData[nd] || {});
  return scheduleOrder.filter(sch => available.includes(sch));
};

// Gas volumetric flow rate units (standard/base conditions)
const gasVolumetricFlowRateToM3s: Record<string, number> = {
  "MMSCFD": 0.327741,
  "Nm³/h": 1 / 3600,
  "Sm³/h": 1 / 3600,
  "m³/h": 1 / 3600,
  "SCFM": 0.000471947,
};

// Gas mass flow rate units (to kg/s)
const gasMassFlowRateToKgS: Record<string, number> = {
  "kg/hr": 1 / 3600,
  "kg/s": 1,
  "lb/hr": 0.000125998,
  "t/hr": 1 / 3.6,
};

// Liquid flow rate units
const liquidFlowRateToM3s: Record<string, number> = {
  "m³/h": 1 / 3600,
  "m³/s": 1,
  "L/min": 1 / 60000,
  "L/s": 0.001,
  "gpm": 0.0000630902,
  "bbl/d": 0.00000184013,
};

const densityToKgM3: Record<string, number> = {
  "kg/m³": 1,
  "lb/ft³": 16.0185,
  "g/cm³": 1000,
};

const viscosityToPas: Record<string, number> = {
  "cP": 0.001,
  "Pa·s": 1,
  "mPa·s": 0.001,
};

const roughnessToMeters: Record<string, number> = {
  mm: 0.001,
  μm: 0.000001,
  in: 0.0254,
};

const pressureFromPa: Record<string, number> = {
  Pa: 1,
  kPa: 0.001,
  bar: 0.00001,
  psi: 0.000145038,
  "kg/cm²": 0.0000101972,
};

// Pipe roughness per ASME/ANSI/API standards (in mm)
// Reference: API 5L, ASME B31.1, Crane TP-410
const pipeRoughness: Record<string, number> = {
  "Carbon Steel (New)": 0.0457,        // API 5L / ASME B31.3 - new clean CS
  "Carbon Steel (Corroded)": 0.15,     // Moderately corroded service
  "Carbon Steel (Severely Corroded)": 0.9, // Heavy scale/corrosion
  "Stainless Steel": 0.015,            // ASME B36.19M - SS 304/316
  "Duplex Stainless Steel": 0.015,     // 2205/2507 duplex
  "Cast Iron": 0.26,                   // ANSI/AWWA C110
  "Ductile Iron (Cement Lined)": 0.025, // AWWA C104
  "Galvanized Steel": 0.15,            // Hot-dip galvanized
  "Chrome-Moly Steel": 0.0457,         // ASTM A335 (P11, P22, etc.)
  "Copper/Copper-Nickel": 0.0015,      // ASTM B88 / B111
  "PVC/CPVC": 0.0015,                  // ASTM D1785 / F441
  "HDPE": 0.007,                       // ASTM F714
  "Fiberglass (FRP/GRE)": 0.005,       // API 15HR
  "Concrete": 1.0,                     // Cast-in-place
  "Lined Steel (Epoxy)": 0.006,        // Internal epoxy coating
  "Lined Steel (Rubber)": 0.025,       // Rubber lined
  "Custom": 0,
};

interface HydraulicSizingCalculatorProps {
  lineType: "gas" | "liquid" | "mixed";
}

const HydraulicSizingCalculator = ({ lineType }: HydraulicSizingCalculatorProps) => {
  // Input states
  const [pipeLength, setPipeLength] = useState<string>("18");
  const [lengthUnit, setLengthUnit] = useState<string>("km");
  const [nominalDiameter, setNominalDiameter] = useState<string>("4");
  const [schedule, setSchedule] = useState<string>("120");
  const [diameterUnit, setDiameterUnit] = useState<string>("mm");
  const [flowRate, setFlowRate] = useState<string>(lineType === "gas" ? "2" : "50");
  const [flowRateUnit, setFlowRateUnit] = useState<string>(lineType === "gas" ? "MMSCFD" : "m³/h");
  
  const [density, setDensity] = useState<string>(lineType === "gas" ? "0.75" : "1000");
  const [densityUnit, setDensityUnit] = useState<string>("kg/m³");
  const [viscosity, setViscosity] = useState<string>(lineType === "gas" ? "0.011" : "1");
  const [viscosityUnit, setViscosityUnit] = useState<string>("cP");
  const [pipeMaterial, setPipeMaterial] = useState<string>("Carbon Steel (New)");
  const [customRoughness, setCustomRoughness] = useState<string>("0.0457");
  const [roughnessUnit, setRoughnessUnit] = useState<string>("mm");
  const [pressureUnit, setPressureUnit] = useState<string>("bar");
  const [fluidTemperature, setFluidTemperature] = useState<string>("15");
  
  // Operating conditions for gas (editable)
  const [inletPressure, setInletPressure] = useState<string>("12"); // barg (user enters gauge pressure)
  const [compressibilityZ, setCompressibilityZ] = useState<string>("1.0"); // Compressibility factor
  const [gasDensity60F, setGasDensity60F] = useState<string>("0.856"); // Gas density at 60°F (kg/m³)
  const [gasMolecularWeight, setGasMolecularWeight] = useState<string>("20.3"); // kg/kmol - editable for accuracy
  
  // Standard/Base conditions (editable so you can match your HYSYS/project settings)
  const [baseTemperature, setBaseTemperature] = useState<string>("15.56"); // °C (60°F for MMSCFD)
  const [basePressure, setBasePressure] = useState<string>("1.01325"); // bara
  const [baseCompressibilityZ, setBaseCompressibilityZ] = useState<string>("1"); // Z at base/std

  // Gas service type selection (ENI criteria)
  const [gasServiceType, setGasServiceType] = useState<string>("Continuous");
  const [gasPressureRange, setGasPressureRange] = useState<string>("2 to 7 barg");

  // Get available pressure ranges for selected gas service
  const availableGasPressureRanges = useMemo(() => {
    return getPressureRangesForService(gasServiceType);
  }, [gasServiceType]);

  // Reset pressure range when service type changes
  const handleGasServiceChange = (service: string) => {
    setGasServiceType(service);
    const ranges = getPressureRangesForService(service);
    if (ranges.length > 0 && !ranges.includes(gasPressureRange)) {
      setGasPressureRange(ranges[0]);
    }
  };

  // Get available schedules for current diameter
  const availableSchedules = useMemo(() => {
    return getSchedulesForDiameter(nominalDiameter);
  }, [nominalDiameter]);

  // Reset schedule if not available for new diameter
  useMemo(() => {
    if (!availableSchedules.includes(schedule)) {
      setSchedule(availableSchedules[0] || "STD");
    }
  }, [nominalDiameter, availableSchedules]);

  // Get inside diameter from nominal diameter and schedule
  const insideDiameterMM = useMemo(() => {
    return pipeScheduleData[nominalDiameter]?.[schedule] || 0;
  }, [nominalDiameter, schedule]);

  // Convert inside diameter to selected unit for display
  const insideDiameterDisplay = useMemo(() => {
    if (diameterUnit === "in") {
      return (insideDiameterMM / 25.4).toFixed(3);
    }
    return insideDiameterMM.toFixed(2);
  }, [insideDiameterMM, diameterUnit]);

  // Get flow rate conversion factor (volumetric only for gas)
  const flowRateConversion = lineType === "gas" 
    ? gasVolumetricFlowRateToM3s
    : liquidFlowRateToM3s;

  // Convert all inputs to SI units
  const L_m = useMemo(() => parseFloat(pipeLength) * lengthToMeters[lengthUnit] || 0, [pipeLength, lengthUnit]);
  const D_m = useMemo(() => insideDiameterMM * 0.001, [insideDiameterMM]);
  const Q_m3s = useMemo(() => {
    return parseFloat(flowRate) * (flowRateConversion[flowRateUnit] || 0);
  }, [flowRate, flowRateUnit, flowRateConversion]);
  const mu = useMemo(() => parseFloat(viscosity) * viscosityToPas[viscosityUnit] || 0, [viscosity, viscosityUnit]);
  const epsilon_m = useMemo(() => {
    const roughnessValue = pipeMaterial === "Custom"
      ? parseFloat(customRoughness)
      : (pipeRoughness[pipeMaterial] ?? pipeRoughness["Carbon Steel (New)"]); // safe fallback
    return (roughnessValue || 0) * roughnessToMeters[roughnessUnit];
  }, [pipeMaterial, customRoughness, roughnessUnit]);

  // Parse operating conditions for gas
  // Convert inlet pressure from barg to bara (user enters gauge pressure)
  const P_operating_bara = useMemo(() => (parseFloat(inletPressure) || 0) + 1.01325, [inletPressure]);
  const T_operating_K = useMemo(() => (parseFloat(fluidTemperature) || 15) + 273.15, [fluidTemperature]);
  const T_std_K = useMemo(() => (parseFloat(baseTemperature) || 15.56) + 273.15, [baseTemperature]);
  const P_std_bara = useMemo(() => parseFloat(basePressure) || 1.01325, [basePressure]);
  const Z_factor = useMemo(() => parseFloat(compressibilityZ) || 1.0, [compressibilityZ]);
  const Z_std_factor = useMemo(() => parseFloat(baseCompressibilityZ) || 1.0, [baseCompressibilityZ]);
  
  // Use molecular weight directly from user input (or auto-calculated from density)
  const MW = useMemo(() => {
    return parseFloat(gasMolecularWeight) || 20.3; // kg/kmol
  }, [gasMolecularWeight]);

  // Gas constant R = 8.314 J/(mol·K) = 8.314 kPa·L/(mol·K)
  const R_gas = 8.314; // J/(mol·K)

  // Calculate gas density at operating conditions (HYSYS method)
  // ρ = (P × MW) / (Z × R × T)
  // P in Pa, MW in kg/kmol, R = 8314 J/(kmol·K), T in K → ρ in kg/m³
  const rhoGasOperating = useMemo(() => {
    if (lineType !== "gas") return 0;
    const P_Pa = P_operating_bara * 100000; // bara to Pa
    const R_kmol = 8314; // J/(kmol·K)
    return (P_Pa * MW) / (Z_factor * R_kmol * T_operating_K);
  }, [lineType, P_operating_bara, MW, Z_factor, T_operating_K]);

  // Calculate gas density at standard conditions
  const rhoGasStandard = useMemo(() => {
    if (lineType !== "gas") return 0;
    const P_Pa = P_std_bara * 100000;
    const R_kmol = 8314;
    return (P_Pa * MW) / (Z_std_factor * R_kmol * T_std_K);
  }, [lineType, P_std_bara, MW, T_std_K, Z_std_factor]);

  // Use calculated density for gas, user input for liquid
  const rho = useMemo(() => {
    if (lineType === "gas") {
      return rhoGasOperating;
    }
    return parseFloat(density) * densityToKgM3[densityUnit] || 0;
  }, [lineType, rhoGasOperating, density, densityUnit]);

  // For gas calculations we convert the entered volumetric flow (standard OR actual) into a molar flow.
  // Convention used here: for gas, "m³/h" is treated as ACTUAL flow at inlet conditions; other units are treated as STANDARD flow at base/std conditions.
  const isGasActualFlow = lineType === "gas" && flowRateUnit === "m³/h";

  // Calculate mass flow in kg/s for display
  const massFlowKgS = useMemo(() => {
    if (lineType !== "gas") return 0;
    
    // From volumetric: first get molar flow, then multiply by MW
    const R_kmol = 8314;
    const P_ref_Pa = (isGasActualFlow ? P_operating_bara : P_std_bara) * 100000;
    const T_ref_K = isGasActualFlow ? T_operating_K : T_std_K;
    const Z_ref = isGasActualFlow ? Z_factor : Z_std_factor;
    
    if (P_ref_Pa <= 0 || T_ref_K <= 0 || Z_ref <= 0 || MW <= 0) return 0;
    
    const Q_vol = parseFloat(flowRate) * (gasVolumetricFlowRateToM3s[flowRateUnit] || 0);
    const molarFlow = (P_ref_Pa * Q_vol) / (Z_ref * R_kmol * T_ref_K);
    return molarFlow * MW;
  }, [lineType, isGasActualFlow, P_operating_bara, P_std_bara, T_operating_K, T_std_K, Z_factor, Z_std_factor, flowRate, flowRateUnit, MW]);

  const molarFlowKmolPerS = useMemo(() => {
    if (lineType !== "gas") return 0;

    const R_kmol = 8314; // Pa·m³/(kmol·K)

    // Volumetric flow input only
    const P_ref_Pa = (isGasActualFlow ? P_operating_bara : P_std_bara) * 100000;
    const T_ref_K = isGasActualFlow ? T_operating_K : T_std_K;
    const Z_ref = isGasActualFlow ? Z_factor : Z_std_factor;

    if (P_ref_Pa <= 0 || T_ref_K <= 0 || Z_ref <= 0) return 0;

    const Q_vol = parseFloat(flowRate) * (gasVolumetricFlowRateToM3s[flowRateUnit] || 0);

    // ṅ = (P·Q) / (Z·R·T)
    return (P_ref_Pa * Q_vol) / (Z_ref * R_kmol * T_ref_K);
  }, [lineType, isGasActualFlow, P_operating_bara, P_std_bara, T_operating_K, T_std_K, Z_factor, Z_std_factor, flowRate, flowRateUnit, MW, massFlowKgS]);

  // Calculate velocity
  // Gas: velocity is computed from the inlet actual volumetric flow derived from molar flow (HYSYS-style)
  // Liquid: v = Q / A (incompressible)
  const velocity = useMemo(() => {
    if (D_m <= 0) return 0;
    const area = Math.PI * Math.pow(D_m / 2, 2);

    if (lineType === "gas") {
      const R_kmol = 8314; // Pa·m³/(kmol·K)
      const P_in_Pa = P_operating_bara * 100000;
      if (P_in_Pa <= 0) return 0;

      const Q_inlet_actual_m3s = (molarFlowKmolPerS * Z_factor * R_kmol * T_operating_K) / P_in_Pa;
      return Q_inlet_actual_m3s / area;
    }

    return Q_m3s / area;
  }, [D_m, lineType, Q_m3s, molarFlowKmolPerS, P_operating_bara, T_operating_K, Z_factor]);

  // Calculate ρv² (rho v squared)
  const rhoVSquared = useMemo(() => {
    return rho * Math.pow(velocity, 2);
  }, [rho, velocity]);

  // Calculate Reynolds number
  const reynoldsNumber = useMemo(() => {
    if (mu <= 0 || D_m <= 0) return 0;
    return (rho * velocity * D_m) / mu;
  }, [rho, velocity, D_m, mu]);

  // Determine flow regime
  const flowRegime = useMemo(() => {
    if (reynoldsNumber < 2300) return "Laminar";
    if (reynoldsNumber < 4000) return "Transitional";
    return "Turbulent";
  }, [reynoldsNumber]);

  // Calculate friction factor using iterative Colebrook-White (HYSYS method)
  // 1/√f = -2 × log10(ε/(3.7D) + 2.51/(Re×√f))
  const frictionFactor = useMemo(() => {
    if (reynoldsNumber <= 0 || D_m <= 0) return 0;
    
    // Laminar flow
    if (reynoldsNumber < 2300) {
      return 64 / reynoldsNumber;
    }
    
    const relativeRoughness = epsilon_m / D_m;
    
    // Iterative Colebrook-White solution
    // Start with Swamee-Jain approximation as initial guess
    let f = 0.25 / Math.pow(Math.log10(relativeRoughness / 3.7 + 5.74 / Math.pow(reynoldsNumber, 0.9)), 2);
    
    // Newton-Raphson iteration for Colebrook-White
    for (let i = 0; i < 20; i++) {
      const sqrtF = Math.sqrt(f);
      const lhs = 1 / sqrtF;
      const rhs = -2 * Math.log10(relativeRoughness / 3.7 + 2.51 / (reynoldsNumber * sqrtF));
      const residual = lhs - rhs;
      
      // Derivative: d(1/√f)/df = -0.5 × f^(-1.5)
      // d(rhs)/df = -2 × (1/ln(10)) × (2.51/(Re×√f)) × (-0.5×f^(-1.5)) / (ε/3.7D + 2.51/(Re×√f))
      //           = (2.51 / (ln(10) × Re × f^1.5)) / (ε/3.7D + 2.51/(Re×√f))
      const term = relativeRoughness / 3.7 + 2.51 / (reynoldsNumber * sqrtF);
      const dLhs = -0.5 * Math.pow(f, -1.5);
      const dRhs = (2.51 / (Math.LN10 * reynoldsNumber * Math.pow(f, 1.5))) / term;
      const derivative = dLhs - dRhs;
      
      const fNew = f - residual / derivative;
      
      if (Math.abs(fNew - f) < 1e-10) {
        f = fNew;
        break;
      }
      f = fNew;
      if (f <= 0) f = 0.001; // Safety check
    }
    
    return f;
  }, [reynoldsNumber, epsilon_m, D_m]);

  // Alias for pressure drop calculations
  const P1_bara = P_operating_bara;

  // Helper: Calculate friction factor for given Re, epsilon, D
  const calcFrictionFactor = (Re: number, eps: number, D: number): number => {
    if (Re <= 0 || D <= 0) return 0;
    if (Re < 2300) return 64 / Re;
    
    const relRough = eps / D;
    let f = 0.25 / Math.pow(Math.log10(relRough / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
    
    for (let i = 0; i < 20; i++) {
      const sqrtF = Math.sqrt(f);
      const lhs = 1 / sqrtF;
      const rhs = -2 * Math.log10(relRough / 3.7 + 2.51 / (Re * sqrtF));
      const residual = lhs - rhs;
      const term = relRough / 3.7 + 2.51 / (Re * sqrtF);
      const dLhs = -0.5 * Math.pow(f, -1.5);
      const dRhs = (2.51 / (Math.LN10 * Re * Math.pow(f, 1.5))) / term;
      const derivative = dLhs - dRhs;
      const fNew = f - residual / derivative;
      if (Math.abs(fNew - f) < 1e-10) { f = fNew; break; }
      f = Math.max(fNew, 0.001);
    }
    return f;
  };

  // Helper: Calculate gas density at given pressure (bara) and temperature (K)
  const calcGasDensity = (P_bara: number, T_K: number, Z: number, mw: number): number => {
    const P_Pa = P_bara * 100000;
    const R_kmol = 8314;
    return (P_Pa * mw) / (Z * R_kmol * T_K);
  };

  // HYSYS-style segmented compressible flow calculation for gas
  // Divides pipe into segments, recalculates density/velocity as P drops
  // Uses molar flow conservation: ṅ = constant, Q = ṅ·Z·R·T / P
  const segmentedResults = useMemo(() => {
    if (lineType !== "gas" || D_m <= 0 || Q_m3s <= 0 || L_m <= 0 || mu <= 0 || molarFlowKmolPerS <= 0) {
      return null;
    }

    const area = Math.PI * Math.pow(D_m / 2, 2);
    const numSegments = 100; // More segments = more accuracy
    const dL = L_m / numSegments;
    const R_kmol = 8314; // Pa·m³/(kmol·K)

    let P_current = P_operating_bara;
    let totalDeltaP_Pa = 0;
    let avgVelocity = 0;
    let avgDensity = 0;
    let avgRe = 0;
    let avgFriction = 0;
    let segmentsRun = 0;

    for (let i = 0; i < numSegments; i++) {
      // Density at current pressure
      const rho_local = calcGasDensity(P_current, T_operating_K, Z_factor, MW);

      // Actual volumetric flow at current conditions from molar flow
      const P_local_Pa = P_current * 100000;
      if (P_local_Pa <= 0) break;
      const Q_local = (molarFlowKmolPerS * Z_factor * R_kmol * T_operating_K) / P_local_Pa;
      const v_local = Q_local / area;

      // Reynolds number
      const Re_local = (rho_local * v_local * D_m) / mu;

      // Friction factor
      const f_local = calcFrictionFactor(Re_local, epsilon_m, D_m);

      // Pressure drop for this segment: ΔP = f × (dL/D) × (ρV²/2)
      const dP_Pa = f_local * (dL / D_m) * (rho_local * Math.pow(v_local, 2) / 2);

      totalDeltaP_Pa += dP_Pa;

      // Update pressure for next segment
      P_current -= dP_Pa / 100000; // Convert Pa to bar

      // Accumulate for averages
      avgVelocity += v_local;
      avgDensity += rho_local;
      avgRe += Re_local;
      avgFriction += f_local;
      segmentsRun += 1;

      // Safety: stop if pressure goes too low
      if (P_current < 0.1) break;
    }

    const denom = segmentsRun || 1;

    return {
      totalPressureDropPa: totalDeltaP_Pa,
      avgVelocity: avgVelocity / denom,
      avgDensity: avgDensity / denom,
      avgReynolds: avgRe / denom,
      avgFriction: avgFriction / denom,
      outletPressure: P_current,
      inletVelocity: velocity, // Use the already calculated inlet velocity
      outletVelocity: (() => {
        const P_out_Pa = P_current * 100000;
        if (P_out_Pa <= 0) return 0;
        const Q_out = (molarFlowKmolPerS * Z_factor * R_kmol * T_operating_K) / P_out_Pa;
        return Q_out / area;
      })(),
    };
  }, [lineType, D_m, Q_m3s, L_m, mu, P_operating_bara, T_operating_K, Z_factor, MW, epsilon_m, velocity, molarFlowKmolPerS]);

  // Calculate pressure drop using Darcy-Weisbach
  // For gas: use segmented method (HYSYS-style)
  // For liquid: single calculation (incompressible)
  const pressureDropPa = useMemo(() => {
    if (D_m <= 0) return 0;
    
    // For gas, use segmented compressible method
    if (lineType === "gas" && segmentedResults) {
      return segmentedResults.totalPressureDropPa;
    }
    
    // For liquid, use standard Darcy-Weisbach
    if (frictionFactor <= 0) return 0;
    return frictionFactor * (L_m / D_m) * (rho * Math.pow(velocity, 2) / 2);
  }, [lineType, segmentedResults, frictionFactor, L_m, D_m, rho, velocity]);

  // Convert to selected unit
  const pressureDrop = useMemo(() => {
    return pressureDropPa * pressureFromPa[pressureUnit];
  }, [pressureDropPa, pressureUnit]);

  // Calculate head loss
  const headLoss = useMemo(() => {
    if (rho <= 0) return 0;
    return pressureDropPa / (rho * 9.81);
  }, [pressureDropPa, rho]);

  // Calculate pressure drop per 100m
  const pressureDropPer100m = useMemo(() => {
    if (L_m <= 0) return 0;
    return (pressureDropPa * 100 / L_m) * pressureFromPa[pressureUnit];
  }, [pressureDropPa, L_m, pressureUnit]);

  const isValidInput = L_m > 0 && D_m > 0 && Q_m3s > 0 && rho > 0 && mu > 0;

  // API 14E Erosional Velocity Calculation
  // Ve = C / sqrt(ρm) where C = 100-150 and ρm is in lb/ft³
  const erosionalVelocity = useMemo(() => {
    // Convert density from kg/m³ to lb/ft³
    const rhoLbFt3 = rho / 16.0185;
    if (rhoLbFt3 <= 0) return 0;
    
    // C = 100 for continuous service (conservative, solid-free fluids)
    const C = 100;
    
    // Ve in ft/s
    const VeFtS = C / Math.sqrt(rhoLbFt3);
    
    // Convert to m/s
    return VeFtS * 0.3048;
  }, [rho]);

  // Get current ENI gas sizing criteria based on service type and pressure range
  const currentGasCriteria = useMemo(() => {
    return getCriteriaForServiceAndPressure(gasServiceType, gasPressureRange);
  }, [gasServiceType, gasPressureRange]);

  // Line Sizing Criteria based on ENI Table 8.1.1.1 for gas, API 14E for liquid
  const sizingCriteria = useMemo(() => {
    if (lineType === "gas" && currentGasCriteria) {
      // Convert pressure drop from bar/km to bar/100m
      const pressureDropBarPer100m = currentGasCriteria.pressureDropBarKm 
        ? currentGasCriteria.pressureDropBarKm / 10 
        : null;
      
      return {
        minVelocity: 0, // No minimum for gas
        maxVelocity: currentGasCriteria.velocityMs, // From ENI table, null if using ρv² instead
        maxRhoVSquared: currentGasCriteria.rhoV2, // From ENI table
        maxPressureDropPer100m: pressureDropBarPer100m, // bar/100m
        maxMach: currentGasCriteria.mach, // For flare applications
        note: currentGasCriteria.note,
        service: currentGasCriteria.service,
        pressureRange: currentGasCriteria.pressureRange,
      };
    } else {
      // Liquid - API 14E criteria
      return {
        minVelocity: 0.9, // 3 ft/s - minimum to prevent silt/solids settling
        maxVelocity: 4.6, // 15 ft/s - maximum to prevent erosion
        maxRhoVSquared: 15000, // kg/(m·s²) - higher limit for liquids
        maxPressureDropPer100m: 1.0, // bar/100m
        maxMach: null,
        note: null,
        service: null,
        pressureRange: null,
      };
    }
  }, [lineType, currentGasCriteria]);

  // Status check function based on ENI/API 14E criteria
  const getStatusIndicator = () => {
    const pressureDropPer100mBar = L_m > 0 ? (pressureDropPa * 100 / L_m) * 0.00001 : 0; // Convert to bar/100m
    
    // Pressure drop check - only if limit is specified
    const pressureDropOk = sizingCriteria.maxPressureDropPer100m === null || 
      (L_m > 0 && pressureDropPer100mBar <= sizingCriteria.maxPressureDropPer100m);
    
    // Velocity check - only if limit is specified
    const velocityOk = sizingCriteria.maxVelocity === null || 
      (velocity >= sizingCriteria.minVelocity && velocity <= sizingCriteria.maxVelocity);
    
    // ρv² check - only if limit is specified
    const rhoVSquaredOk = sizingCriteria.maxRhoVSquared === null || 
      rhoVSquared <= sizingCriteria.maxRhoVSquared;
    
    return {
      pressureDrop: sizingCriteria.maxPressureDropPer100m === null ? "na" as const : 
        (pressureDropOk ? "ok" as const : "warning" as const),
      velocity: sizingCriteria.maxVelocity === null ? "na" as const : 
        (velocityOk ? "ok" as const : "warning" as const),
      rhoVSquared: sizingCriteria.maxRhoVSquared === null ? "na" as const : 
        (rhoVSquaredOk ? "ok" as const : "warning" as const),
    };
  };

  const status = getStatusIndicator();

  const StatusIcon = ({ type }: { type: "ok" | "warning" | "na" }) => {
    if (type === "ok") {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (type === "na") {
      return <Info className="w-4 h-4 text-muted-foreground" />;
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  if (lineType === "mixed") {
    return (
      <div className="space-y-8">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Waves className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                  Mixed-Phase <span className="text-primary">Line Sizing</span>
                </h2>
                <p className="text-muted-foreground">Beggs & Brill equation for two-phase flow</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Mixed-phase pressure drop calculations using Beggs & Brill correlation 
              for two-phase flow are being developed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const PhaseIcon = lineType === "gas" ? Wind : Droplets;
  const phaseTitle = lineType === "gas" ? "Gas Line Sizing" : "Liquid Line Sizing";

  // Get current calculation method details
  return (
    <div className="space-y-8">
      {/* Title Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 rounded-xl bg-primary/10">
                <PhaseIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                  {lineType === "gas" ? "Gas" : "Liquid"} <span className="text-primary">Line Sizing</span>
                </h2>
                <p className="text-muted-foreground">
                  Single-Phase Pipe Flow
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipe Properties */}
        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-blue-500 font-bold text-sm">1</span>
              </div>
              <h3 className="font-heading font-semibold text-lg">Pipe Properties</h3>
            </div>

            <div className="space-y-5">
              {/* Gas Service Type (ENI Criteria) - Only show for gas lines */}
              {lineType === "gas" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Service Type</Label>
                    <Select value={gasServiceType} onValueChange={handleGasServiceChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gasServiceTypes.map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Operating Pressure</Label>
                    <Select value={gasPressureRange} onValueChange={setGasPressureRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGasPressureRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show current criteria */}
                  {currentGasCriteria && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                      <p className="text-xs font-medium text-primary">Recommended Limits</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {currentGasCriteria.pressureDropBarKm !== null && (
                          <p>ΔP: ≤ {currentGasCriteria.pressureDropBarKm} bar/km</p>
                        )}
                        {currentGasCriteria.velocityMs !== null && (
                          <p>Velocity: ≤ {currentGasCriteria.velocityMs} m/s</p>
                        )}
                        {currentGasCriteria.rhoV2 !== null && (
                          <p>ρv²: ≤ {currentGasCriteria.rhoV2.toLocaleString()} kg/(m·s²)</p>
                        )}
                        {currentGasCriteria.mach !== null && (
                          <p>Mach: ≤ {currentGasCriteria.mach}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              {/* Pipe Length */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Length</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={pipeLength}
                    onChange={(e) => setPipeLength(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="100"
                  />
                  <Select value={lengthUnit} onValueChange={setLengthUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="km">km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nominal Diameter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nominal Diameter (NPS)</Label>
                <Select value={nominalDiameter} onValueChange={setNominalDiameter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {nominalDiameters.map((nd) => (
                      <SelectItem key={nd} value={nd}>
                        {nd}"
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Schedule</Label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSchedules.map((sch) => (
                      <SelectItem key={sch} value={sch}>
                        {sch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Inside Diameter Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Inside Diameter (ID)</Label>
                  <Select value={diameterUnit} onValueChange={setDiameterUnit}>
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xl font-mono font-bold text-primary">
                    {insideDiameterDisplay} <span className="text-sm font-normal">{diameterUnit}</span>
                  </p>
                </div>
              </div>

              {/* Pipe Material */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Material</Label>
                <Select value={pipeMaterial} onValueChange={setPipeMaterial}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(pipeRoughness).map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Roughness */}
              {pipeMaterial === "Custom" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Surface Roughness (ε)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={customRoughness}
                      onChange={(e) => setCustomRoughness(e.target.value)}
                      className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.045"
                    />
                    <Select value={roughnessUnit} onValueChange={setRoughnessUnit}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="μm">μm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {pipeMaterial !== "Custom" && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    Surface Roughness: <span className="font-mono text-foreground">{pipeRoughness[pipeMaterial]} mm</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Flow Properties */}
        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-green-500 font-bold text-sm">2</span>
              </div>
              <h3 className="font-heading font-semibold text-lg">Flow Properties</h3>
            </div>

            <div className="space-y-5">
              {/* Temperature */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Temperature (°C)</Label>
                <Input
                  type="number"
                  value={fluidTemperature}
                  onChange={(e) => setFluidTemperature(e.target.value)}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder={lineType === "gas" ? "15.56" : "25"}
                />
              </div>

              {/* Flow Rate */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Flow Rate</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={flowRate}
                    onChange={(e) => setFlowRate(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={lineType === "gas" ? "10" : "50"}
                  />
                  <Select value={flowRateUnit} onValueChange={setFlowRateUnit}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {lineType === "gas" ? (
                        Object.keys(gasVolumetricFlowRateToM3s).map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))
                      ) : (
                        Object.keys(liquidFlowRateToM3s).map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {lineType === "gas" && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">m³/h</span> = actual flow at inlet; other units = standard flow.
                  </p>
                )}
              </div>

              {/* Fluid Density - Only shown for liquid */}
              {lineType === "liquid" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fluid Density (ρ)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                      className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="1000"
                    />
                    <Select value={densityUnit} onValueChange={setDensityUnit}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg/m³">kg/m³</SelectItem>
                        <SelectItem value="lb/ft³">lb/ft³</SelectItem>
                        <SelectItem value="g/cm³">g/cm³</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Dynamic Viscosity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dynamic Viscosity (μ)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={viscosity}
                    onChange={(e) => setViscosity(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={lineType === "gas" ? "0.011" : "1"}
                  />
                  <Select value={viscosityUnit} onValueChange={setViscosityUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cP">cP</SelectItem>
                      <SelectItem value="Pa·s">Pa·s</SelectItem>
                      <SelectItem value="mPa·s">mPa·s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Operating Conditions - Always shown for Gas */}
              {lineType === "gas" && (
                <>
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Operating Conditions (for velocity at actual)</p>
                  </div>
                  
                  {/* Operating Pressure - in barg */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Inlet Pressure (barg)</Label>
                    <Input
                      type="number"
                      value={inletPressure}
                      onChange={(e) => setInletPressure(e.target.value)}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="12"
                    />
                    <p className="text-xs text-muted-foreground">= {P_operating_bara.toFixed(4)} bara</p>
                  </div>
                  
                  {/* Compressibility Factor */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Compressibility Factor (Z)</Label>
                    <Input
                      type="number"
                      value={compressibilityZ}
                      onChange={(e) => setCompressibilityZ(e.target.value)}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="1.0"
                    />
                  </div>
                  
                  {/* Gas Density @ 60°F */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Gas Density @ 60°F (kg/m³)</Label>
                    <Input
                      type="number"
                      value={gasDensity60F}
                      onChange={(e) => {
                        setGasDensity60F(e.target.value);
                        // Auto-calculate MW from density
                        const rho = parseFloat(e.target.value) || 0.856;
                        setGasMolecularWeight((rho * 23.69).toFixed(2));
                      }}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.856"
                    />
                  </div>
                  
                  {/* Molecular Weight - editable for accuracy */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Molecular Weight (kg/kmol)</Label>
                    <Input
                      type="number"
                      value={gasMolecularWeight}
                      onChange={(e) => setGasMolecularWeight(e.target.value)}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="20.3"
                    />
                  </div>
                  
                  {/* Calculated Densities Display */}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                    <p className="text-xs font-medium text-primary">Calculated Gas Density</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">ρ @ Std:</span>
                        <span className="font-mono ml-1">{rhoGasStandard.toFixed(4)} kg/m³</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ρ @ Op:</span>
                        <span className="font-mono ml-1 text-primary font-semibold">{rhoGasOperating.toFixed(4)} kg/m³</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Standard/Base Conditions - Locked */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Std Temp T_std (°C)</Label>
                      <Input
                        type="number"
                        value={baseTemperature}
                        disabled
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-muted/50 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Std Press P_std (bara)</Label>
                      <Input
                        type="number"
                        value={basePressure}
                        disabled
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-muted/50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg">Results</h3>
            </div>

            {isValidInput ? (
              <div className="space-y-4">
                {/* Pressure Drop - Main Result */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Pressure Drop (ΔP)</span>
                      <StatusIcon type={status.pressureDrop} />
                    </div>
                    <Select value={pressureUnit} onValueChange={setPressureUnit}>
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">bar</SelectItem>
                        <SelectItem value="kPa">kPa</SelectItem>
                        <SelectItem value="Pa">Pa</SelectItem>
                        <SelectItem value="psi">psi</SelectItem>
                        <SelectItem value="kg/cm²">kg/cm²</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-3xl font-mono font-bold text-primary">
                    {pressureDrop.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(pressureDropPer100m * 10).toFixed(4)} {pressureUnit}/km
                    {sizingCriteria.maxPressureDropPer100m !== null && lineType === "gas" && (
                      <span className="ml-2">
                        (Limit: ≤ {(sizingCriteria.maxPressureDropPer100m * 10).toFixed(1)} {pressureUnit}/km)
                      </span>
                    )}
                  </p>
                </div>

                {/* Velocity */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {lineType === "gas" ? "Velocity" : "Fluid Velocity"}
                    </span>
                    <StatusIcon type={status.velocity} />
                  </div>
                  <p className="text-lg font-mono font-semibold">{velocity.toFixed(3)} m/s</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sizingCriteria.maxVelocity !== null 
                      ? (lineType === "gas" 
                          ? `Limit: ≤ ${sizingCriteria.maxVelocity} m/s`
                          : `Limit: ${sizingCriteria.minVelocity} - ${sizingCriteria.maxVelocity} m/s`)
                      : "N/A - Use ρv² criterion"
                    }
                  </p>
                </div>


                {/* ρv² */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">ρv² (Erosional)</span>
                    <StatusIcon type={status.rhoVSquared} />
                  </div>
                  <p className="text-lg font-mono font-semibold">{rhoVSquared.toFixed(2)} kg/(m·s²)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sizingCriteria.maxRhoVSquared !== null 
                      ? `Limit: ≤ ${sizingCriteria.maxRhoVSquared.toLocaleString()} kg/(m·s²)`
                      : "N/A - Use velocity criterion"
                    }
                  </p>
                </div>

                {/* Head Loss */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-xs text-muted-foreground">Head Loss</span>
                  <p className="text-lg font-mono font-semibold">{headLoss.toFixed(3)} m</p>
                </div>

                {/* Flow Regime */}
                <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                  <span className="text-sm">Flow Regime</span>
                  <Badge 
                    variant="outline"
                    className={
                      flowRegime === "Laminar" 
                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                        : flowRegime === "Turbulent"
                        ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }
                  >
                    {flowRegime}
                  </Badge>
                </div>

                {/* Intermediate Values */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Intermediate Values</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-xs text-muted-foreground block">
                        Reynolds (Re) {lineType === "gas" && segmentedResults ? "(Avg)" : ""}
                      </span>
                      <span className="font-mono">
                        {lineType === "gas" && segmentedResults 
                          ? segmentedResults.avgReynolds.toFixed(0)
                          : reynoldsNumber.toFixed(0)
                        }
                      </span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-xs text-muted-foreground block">
                        Friction Factor (f) {lineType === "gas" && segmentedResults ? "(Avg)" : ""}
                      </span>
                      <span className="font-mono">
                        {lineType === "gas" && segmentedResults 
                          ? segmentedResults.avgFriction.toFixed(6)
                          : frictionFactor.toFixed(6)
                        }
                      </span>
                    </div>
                    {lineType === "gas" && segmentedResults && (
                      <>
                        <div className="p-2 rounded bg-muted/30">
                          <span className="text-xs text-muted-foreground block">Outlet Pressure</span>
                          <span className="font-mono">{segmentedResults.outletPressure.toFixed(4)} bara</span>
                        </div>
                        <div className="p-2 rounded bg-muted/30">
                          <span className="text-xs text-muted-foreground block">Avg. Gas Density</span>
                          <span className="font-mono">{segmentedResults.avgDensity.toFixed(4)} kg/m³</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm text-center">Enter valid values for all inputs to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equation Reference */}
      <Card className="border border-border">
        <CardContent className="p-6">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Equations Used
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Darcy-Weisbach</p>
              <p className="font-mono text-xs">ΔP = f × (L/D) × (ρV²/2)</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Reynolds Number</p>
              <p className="font-mono text-xs">Re = ρVD / μ</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Colebrook-White (Turbulent f)</p>
              <p className="font-mono text-xs">1/√f = -2 log(ε/3.7D + 2.51/(Re√f))</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Gas Density (Ideal Gas + Z)</p>
              <p className="font-mono text-xs">ρ = (P × MW) / (Z × R × T)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HydraulicSizingCalculator;
