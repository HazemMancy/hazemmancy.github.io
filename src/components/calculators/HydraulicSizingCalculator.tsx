import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, ArrowRight, AlertTriangle, Info, CheckCircle2, Wind, Droplets, Waves } from "lucide-react";

// Unit conversion factors to SI
const lengthToMeters: Record<string, number> = {
  m: 1,
  km: 1000,
};

const diameterToMeters: Record<string, number> = {
  mm: 0.001,
  in: 0.0254,
};

// Extended pipe schedule data (ID in mm) based on Nominal Diameter and Schedule
const pipeScheduleData: Record<string, Record<string, number>> = {
  "1/2": { "Sch 5S": 18.04, "Sch 10S": 17.12, "Sch 40/STD": 15.80, "Sch 80/XS": 13.87, "Sch 160": 11.74, "XXS": 6.35 },
  "3/4": { "Sch 5S": 23.37, "Sch 10S": 22.45, "Sch 40/STD": 20.93, "Sch 80/XS": 18.85, "Sch 160": 15.54, "XXS": 11.07 },
  "1": { "Sch 5S": 29.51, "Sch 10S": 27.86, "Sch 40/STD": 26.64, "Sch 80/XS": 24.31, "Sch 160": 20.70, "XXS": 15.22 },
  "1-1/4": { "Sch 5S": 38.14, "Sch 10S": 36.63, "Sch 40/STD": 35.05, "Sch 80/XS": 32.46, "Sch 160": 29.46, "XXS": 22.76 },
  "1-1/2": { "Sch 5S": 44.20, "Sch 10S": 42.72, "Sch 40/STD": 40.89, "Sch 80/XS": 38.10, "Sch 160": 33.98, "XXS": 27.94 },
  "2": { "Sch 5S": 56.26, "Sch 10S": 54.79, "Sch 40/STD": 52.50, "Sch 80/XS": 49.25, "Sch 160": 42.90, "XXS": 38.16 },
  "2-1/2": { "Sch 5S": 68.78, "Sch 10S": 66.90, "Sch 40/STD": 62.71, "Sch 80/XS": 59.00, "Sch 160": 53.98, "XXS": 44.96 },
  "3": { "Sch 5S": 84.68, "Sch 10S": 84.68, "Sch 40/STD": 77.93, "Sch 80/XS": 73.66, "Sch 160": 66.64, "XXS": 58.42 },
  "4": { "Sch 5S": 110.08, "Sch 10S": 108.20, "Sch 40/STD": 102.26, "Sch 80/XS": 97.18, "Sch 160": 87.32, "XXS": 80.06 },
  "6": { "Sch 5S": 164.66, "Sch 10S": 162.74, "Sch 40/STD": 154.05, "Sch 80/XS": 146.33, "Sch 160": 131.78, "XXS": 124.38 },
  "8": { "Sch 5S": 216.66, "Sch 10S": 214.96, "Sch 20": 209.55, "Sch 40/STD": 202.72, "Sch 60": 196.85, "Sch 80/XS": 193.68, "Sch 160": 173.99, "XXS": 174.64 },
  "10": { "Sch 5S": 271.02, "Sch 10S": 268.92, "Sch 20": 262.76, "Sch 40/STD": 254.51, "Sch 60": 247.65, "Sch 80/XS": 242.87, "Sch 160": 222.25, "XXS": 222.25 },
  "12": { "Sch 5S": 323.85, "Sch 10S": 320.42, "Sch 20": 314.66, "Sch 40/STD": 303.23, "Sch 60": 295.30, "Sch 80/XS": 288.90, "Sch 160": 264.67, "XXS": 264.67 },
  "14": { "Sch 5S": 350.50, "Sch 10S": 347.68, "Sch 20": 342.90, "Sch 30": 339.76, "Sch 40": 336.54, "Sch 60": 330.20, "Sch 80": 323.88, "Sch 160": 290.58 },
  "16": { "Sch 5S": 400.86, "Sch 10S": 398.02, "Sch 20": 393.70, "Sch 30": 387.36, "Sch 40": 381.00, "Sch 60": 374.66, "Sch 80": 363.52, "Sch 160": 333.34 },
  "18": { "Sch 5S": 451.46, "Sch 10S": 448.62, "Sch 20": 444.30, "Sch 30": 434.72, "Sch 40": 428.66, "Sch 60": 419.10, "Sch 80": 409.58, "Sch 160": 376.94 },
  "20": { "Sch 5S": 501.80, "Sch 10S": 498.44, "Sch 20": 490.96, "Sch 30": 482.60, "Sch 40": 477.82, "Sch 60": 466.78, "Sch 80": 455.62, "Sch 160": 419.10 },
  "24": { "Sch 5S": 603.25, "Sch 10S": 598.42, "Sch 20": 590.04, "Sch 30": 581.66, "Sch 40": 574.68, "Sch 60": 560.32, "Sch 80": 547.68, "Sch 160": 498.44 },
  "30": { "Sch 5S": 755.65, "Sch 10S": 749.30, "Sch 20": 736.60, "Sch 30": 723.90, "STD": 749.30, "XS": 736.60 },
  "36": { "Sch 5S": 906.65, "Sch 10S": 898.52, "Sch 20": 882.90, "Sch 30": 869.95, "Sch 40": 863.60, "STD": 898.52, "XS": 882.90 },
  "42": { "Sch 5S": 1057.91, "Sch 10S": 1047.75, "Sch 20": 1031.88, "Sch 30": 1016.00, "STD": 1047.75, "XS": 1031.88 },
  "48": { "Sch 5S": 1209.17, "Sch 10S": 1196.85, "Sch 20": 1178.56, "Sch 30": 1162.05, "STD": 1196.85, "XS": 1178.56 },
};

const nominalDiameters = Object.keys(pipeScheduleData);

// Get available schedules for a nominal diameter
const getSchedulesForDiameter = (nd: string): string[] => {
  return Object.keys(pipeScheduleData[nd] || {});
};

// Gas flow rate units
const gasFlowRateToM3s: Record<string, number> = {
  "mmscfd": 0.327741,
  "Nm³/h": 1 / 3600,
  "Sm³/h": 1 / 3600,
  "m³/h": 1 / 3600,
  "scfm": 0.000471947,
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

// Common pipe roughness values (in mm)
const pipeRoughness: Record<string, number> = {
  "Carbon Steel": 0.045,
  "Stainless Steel": 0.015,
  "Cast Iron": 0.26,
  "Galvanized Steel": 0.15,
  "PVC/Plastic": 0.0015,
  "Copper": 0.0015,
  "Concrete": 1.0,
  "HDPE": 0.007,
  "Fiberglass (FRP)": 0.005,
  "Custom": 0,
};

// Common fluids database with temperature-dependent properties
interface FluidProperties {
  name: string;
  type: "gas" | "liquid";
  temperatures: number[];
  density: Record<number, number>;
  viscosity: Record<number, number>;
}

const fluidsDatabase: FluidProperties[] = [
  // Gases
  { 
    name: "Natural Gas", type: "gas",
    temperatures: [15, 25, 50, 100],
    density: { 15: 0.75, 25: 0.72, 50: 0.65, 100: 0.55 },
    viscosity: { 15: 0.011, 25: 0.011, 50: 0.012, 100: 0.014 }
  },
  { 
    name: "Air", type: "gas",
    temperatures: [15, 25, 50, 100, 150],
    density: { 15: 1.225, 25: 1.184, 50: 1.093, 100: 0.946, 150: 0.834 },
    viscosity: { 15: 0.0179, 25: 0.0184, 50: 0.0196, 100: 0.0218, 150: 0.0238 }
  },
  { 
    name: "Nitrogen", type: "gas",
    temperatures: [15, 25, 50, 100],
    density: { 15: 1.185, 25: 1.145, 50: 1.056, 100: 0.916 },
    viscosity: { 15: 0.0175, 25: 0.0180, 50: 0.0191, 100: 0.0212 }
  },
  { 
    name: "Carbon Dioxide", type: "gas",
    temperatures: [15, 25, 50, 100],
    density: { 15: 1.87, 25: 1.81, 50: 1.67, 100: 1.45 },
    viscosity: { 15: 0.0145, 25: 0.0150, 50: 0.0165, 100: 0.0190 }
  },
  { 
    name: "Hydrogen", type: "gas",
    temperatures: [15, 25, 50, 100],
    density: { 15: 0.085, 25: 0.082, 50: 0.076, 100: 0.066 },
    viscosity: { 15: 0.0088, 25: 0.0090, 50: 0.0095, 100: 0.0105 }
  },
  { 
    name: "Steam", type: "gas",
    temperatures: [100, 150, 200, 300],
    density: { 100: 0.590, 150: 0.517, 200: 0.460, 300: 0.379 },
    viscosity: { 100: 0.0125, 150: 0.0142, 200: 0.0160, 300: 0.0195 }
  },
  // Liquids
  { 
    name: "Water", type: "liquid",
    temperatures: [5, 15, 25, 40, 60, 80, 100],
    density: { 5: 1000, 15: 999, 25: 997, 40: 992, 60: 983, 80: 972, 100: 958 },
    viscosity: { 5: 1.52, 15: 1.14, 25: 0.89, 40: 0.65, 60: 0.47, 80: 0.35, 100: 0.28 }
  },
  { 
    name: "Seawater", type: "liquid",
    temperatures: [5, 15, 25, 40],
    density: { 5: 1028, 15: 1026, 25: 1023, 40: 1017 },
    viscosity: { 5: 1.62, 15: 1.20, 25: 0.96, 40: 0.70 }
  },
  { 
    name: "Crude Oil (Light)", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 850, 25: 843, 40: 830, 60: 812 },
    viscosity: { 15: 12, 25: 8, 40: 5, 60: 3 }
  },
  { 
    name: "Crude Oil (Medium)", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 900, 25: 893, 40: 880, 60: 862 },
    viscosity: { 15: 50, 25: 30, 40: 15, 60: 8 }
  },
  { 
    name: "Crude Oil (Heavy)", type: "liquid",
    temperatures: [15, 25, 40, 60, 80],
    density: { 15: 950, 25: 943, 40: 930, 60: 912, 80: 895 },
    viscosity: { 15: 500, 25: 200, 40: 80, 60: 35, 80: 18 }
  },
  { 
    name: "Diesel", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 850, 25: 843, 40: 830, 60: 812 },
    viscosity: { 15: 4.5, 25: 3.2, 40: 2.2, 60: 1.5 }
  },
  { 
    name: "Gasoline", type: "liquid",
    temperatures: [15, 25, 40],
    density: { 15: 750, 25: 742, 40: 728 },
    viscosity: { 15: 0.6, 25: 0.5, 40: 0.4 }
  },
  { 
    name: "Kerosene", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 810, 25: 802, 40: 788, 60: 770 },
    viscosity: { 15: 2.2, 25: 1.7, 40: 1.2, 60: 0.9 }
  },
  { 
    name: "Glycol (MEG)", type: "liquid",
    temperatures: [15, 25, 40, 60],
    density: { 15: 1115, 25: 1109, 40: 1098, 60: 1083 },
    viscosity: { 15: 25, 25: 17, 40: 9, 60: 5 }
  },
  { 
    name: "Methanol", type: "liquid",
    temperatures: [15, 25, 40],
    density: { 15: 792, 25: 785, 40: 772 },
    viscosity: { 15: 0.62, 25: 0.55, 40: 0.45 }
  },
  { 
    name: "Ammonia (Liquid)", type: "liquid",
    temperatures: [-33, 0, 25],
    density: { "-33": 682, 0: 639, 25: 602 },
    viscosity: { "-33": 0.27, 0: 0.16, 25: 0.13 }
  },
];

interface HydraulicSizingCalculatorProps {
  lineType: "gas" | "liquid" | "mixed";
}

const HydraulicSizingCalculator = ({ lineType }: HydraulicSizingCalculatorProps) => {
  // Input states
  const [pipeLength, setPipeLength] = useState<string>("100");
  const [lengthUnit, setLengthUnit] = useState<string>("m");
  const [nominalDiameter, setNominalDiameter] = useState<string>("4");
  const [schedule, setSchedule] = useState<string>("Sch 40/STD");
  const [diameterUnit, setDiameterUnit] = useState<string>("mm");
  const [flowRate, setFlowRate] = useState<string>(lineType === "gas" ? "10" : "50");
  const [flowRateUnit, setFlowRateUnit] = useState<string>(lineType === "gas" ? "mmscfd" : "m³/h");
  const [density, setDensity] = useState<string>(lineType === "gas" ? "0.75" : "1000");
  const [densityUnit, setDensityUnit] = useState<string>("kg/m³");
  const [viscosity, setViscosity] = useState<string>(lineType === "gas" ? "0.011" : "1");
  const [viscosityUnit, setViscosityUnit] = useState<string>("cP");
  const [pipeMaterial, setPipeMaterial] = useState<string>("Carbon Steel");
  const [customRoughness, setCustomRoughness] = useState<string>("0.045");
  const [roughnessUnit, setRoughnessUnit] = useState<string>("mm");
  const [pressureUnit, setPressureUnit] = useState<string>("bar");
  const [selectedFluid, setSelectedFluid] = useState<string>("");
  const [fluidTemperature, setFluidTemperature] = useState<string>("25");

  // Get fluids filtered by type
  const availableFluids = useMemo(() => {
    return fluidsDatabase.filter(f => f.type === lineType);
  }, [lineType]);

  // Get available temperatures for selected fluid
  const availableTemperatures = useMemo(() => {
    const fluid = fluidsDatabase.find(f => f.name === selectedFluid);
    return fluid?.temperatures || [];
  }, [selectedFluid]);

  // Handle fluid selection
  const handleFluidSelect = (fluidName: string) => {
    setSelectedFluid(fluidName);
    const fluid = fluidsDatabase.find(f => f.name === fluidName);
    if (fluid) {
      const temp = fluid.temperatures.includes(25) ? 25 : fluid.temperatures[0];
      setFluidTemperature(temp.toString());
      setDensity(fluid.density[temp].toString());
      setViscosity(fluid.viscosity[temp].toString());
    }
  };

  // Handle temperature change
  const handleTemperatureChange = (temp: string) => {
    setFluidTemperature(temp);
    const fluid = fluidsDatabase.find(f => f.name === selectedFluid);
    if (fluid) {
      const tempNum = parseInt(temp);
      setDensity(fluid.density[tempNum]?.toString() || density);
      setViscosity(fluid.viscosity[tempNum]?.toString() || viscosity);
    }
  };

  // Get available schedules for current diameter
  const availableSchedules = useMemo(() => {
    return getSchedulesForDiameter(nominalDiameter);
  }, [nominalDiameter]);

  // Reset schedule if not available for new diameter
  useMemo(() => {
    if (!availableSchedules.includes(schedule)) {
      setSchedule(availableSchedules[0] || "Sch 40/STD");
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

  // Get flow rate conversion factor
  const flowRateConversion = lineType === "gas" ? gasFlowRateToM3s : liquidFlowRateToM3s;

  // Convert all inputs to SI units
  const L_m = useMemo(() => parseFloat(pipeLength) * lengthToMeters[lengthUnit] || 0, [pipeLength, lengthUnit]);
  const D_m = useMemo(() => insideDiameterMM * 0.001, [insideDiameterMM]);
  const Q_m3s = useMemo(() => parseFloat(flowRate) * (flowRateConversion[flowRateUnit] || 0), [flowRate, flowRateUnit, flowRateConversion]);
  const rho = useMemo(() => parseFloat(density) * densityToKgM3[densityUnit] || 0, [density, densityUnit]);
  const mu = useMemo(() => parseFloat(viscosity) * viscosityToPas[viscosityUnit] || 0, [viscosity, viscosityUnit]);
  const epsilon_m = useMemo(() => {
    const roughnessValue = pipeMaterial === "Custom" 
      ? parseFloat(customRoughness) 
      : pipeRoughness[pipeMaterial];
    return (roughnessValue || 0) * roughnessToMeters[roughnessUnit];
  }, [pipeMaterial, customRoughness, roughnessUnit]);

  // Calculate velocity
  const velocity = useMemo(() => {
    if (D_m <= 0) return 0;
    const area = Math.PI * Math.pow(D_m / 2, 2);
    return Q_m3s / area;
  }, [Q_m3s, D_m]);

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

  // Calculate friction factor using Haaland approximation
  const frictionFactor = useMemo(() => {
    if (reynoldsNumber <= 0 || D_m <= 0) return 0;
    
    if (reynoldsNumber < 2300) {
      return 64 / reynoldsNumber;
    }
    
    const relativeRoughness = epsilon_m / D_m;
    const term1 = relativeRoughness / 3.7;
    const term2 = 6.9 / reynoldsNumber;
    const f = Math.pow(-1.8 * Math.log10(Math.pow(term1, 1.11) + term2), -2);
    
    return f;
  }, [reynoldsNumber, epsilon_m, D_m]);

  // Calculate pressure drop using Darcy-Weisbach
  const pressureDropPa = useMemo(() => {
    if (D_m <= 0 || frictionFactor <= 0) return 0;
    return frictionFactor * (L_m / D_m) * (rho * Math.pow(velocity, 2) / 2);
  }, [frictionFactor, L_m, D_m, rho, velocity]);

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

  // API 14E Line Sizing Criteria
  // Gas: Ve (erosional), max 60 ft/s (18.3 m/s), ρv² < 8000 kg/(m·s²)
  // Liquid: 3-15 ft/s (0.9-4.6 m/s), ρv² < 15000 kg/(m·s²)
  const sizingCriteria = useMemo(() => {
    if (lineType === "gas") {
      return {
        minVelocity: 0, // No minimum for gas
        maxVelocity: Math.min(erosionalVelocity, 18.3), // Min of Ve and 60 ft/s
        maxRhoVSquared: 8000, // kg/(m·s²) - approximately 5000 lb/(ft·s²)
        maxPressureDropPer100m: 0.5, // bar/100m (0.22 psi/100ft equivalent)
      };
    } else {
      // Liquid
      return {
        minVelocity: 0.9, // 3 ft/s - minimum to prevent silt/solids settling
        maxVelocity: 4.6, // 15 ft/s - maximum to prevent erosion
        maxRhoVSquared: 15000, // kg/(m·s²) - higher limit for liquids
        maxPressureDropPer100m: 1.0, // bar/100m
      };
    }
  }, [lineType, erosionalVelocity]);

  // Status check function based on API 14E criteria
  const getStatusIndicator = () => {
    const pressureDropPer100mBar = (pressureDropPa * 100 / L_m) * 0.00001; // Convert to bar/100m
    
    // Pressure drop check
    const pressureDropOk = L_m > 0 && pressureDropPer100mBar <= sizingCriteria.maxPressureDropPer100m;
    
    // Velocity check
    const velocityOk = velocity >= sizingCriteria.minVelocity && velocity <= sizingCriteria.maxVelocity;
    
    // ρv² check
    const rhoVSquaredOk = rhoVSquared <= sizingCriteria.maxRhoVSquared;
    
    return {
      pressureDrop: pressureDropOk ? "ok" as const : "warning" as const,
      velocity: velocityOk ? "ok" as const : "warning" as const,
      rhoVSquared: rhoVSquaredOk ? "ok" as const : "warning" as const,
    };
  };

  const status = getStatusIndicator();

  const StatusIcon = ({ type }: { type: "ok" | "warning" }) => {
    if (type === "ok") {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
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

  return (
    <div className="space-y-8">
      {/* Title Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <PhaseIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                {lineType === "gas" ? "Gas" : "Liquid"} <span className="text-primary">Line Sizing</span>
              </h2>
              <p className="text-muted-foreground">Darcy-Weisbach equation for single-phase pipe flow</p>
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
              {/* Fluid Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fluid Type</Label>
                <Select value={selectedFluid} onValueChange={handleFluidSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fluid..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFluids.map((fluid) => (
                      <SelectItem key={fluid.name} value={fluid.name}>
                        {fluid.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature Selection */}
              {selectedFluid && availableTemperatures.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Temperature (°C)</Label>
                  <Select value={fluidTemperature} onValueChange={handleTemperatureChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemperatures.map((temp) => (
                        <SelectItem key={temp} value={temp.toString()}>
                          {temp}°C
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Flow Rate */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Volumetric Flow Rate</Label>
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
                      {Object.keys(flowRateConversion).map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fluid Density */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fluid Density (ρ)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={lineType === "gas" ? "0.75" : "1000"}
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
                    {pressureDropPer100m.toFixed(4)} {pressureUnit}/100m
                  </p>
                </div>

                {/* Velocity */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Fluid Velocity</span>
                    <StatusIcon type={status.velocity} />
                  </div>
                  <p className="text-lg font-mono font-semibold">{velocity.toFixed(3)} m/s</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lineType === "gas" 
                      ? `Limit: ≤ ${sizingCriteria.maxVelocity.toFixed(1)} m/s (Ve or 60 ft/s)`
                      : `Limit: ${sizingCriteria.minVelocity.toFixed(1)} - ${sizingCriteria.maxVelocity.toFixed(1)} m/s (3-15 ft/s)`
                    }
                  </p>
                </div>

                {/* Erosional Velocity (API 14E) */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-xs text-muted-foreground">Erosional Velocity (Ve)</span>
                  <p className="text-lg font-mono font-semibold">{erosionalVelocity.toFixed(2)} m/s</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    API 14E: Ve = C/√ρ (C=100)
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
                    Limit: ≤ {sizingCriteria.maxRhoVSquared.toLocaleString()} kg/(m·s²)
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
                      <span className="text-xs text-muted-foreground block">Reynolds (Re)</span>
                      <span className="font-mono">{reynoldsNumber.toFixed(0)}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-xs text-muted-foreground block">Friction Factor (f)</span>
                      <span className="font-mono">{frictionFactor.toFixed(6)}</span>
                    </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Darcy-Weisbach</p>
              <p className="font-mono text-xs">ΔP = f × (L/D) × (ρV²/2)</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Reynolds Number</p>
              <p className="font-mono text-xs">Re = ρVD / μ</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Haaland (Turbulent f)</p>
              <p className="font-mono text-xs">1/√f = -1.8 log[(ε/3.7D)^1.11 + 6.9/Re]</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HydraulicSizingCalculator;
