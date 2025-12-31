import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Gauge, AlertTriangle, CheckCircle2, Info, Zap, Droplets, ArrowUpCircle, Activity, Ruler, Thermometer, TrendingUp, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PumpPerformanceCurves from "./PumpPerformanceCurves";
import PumpGuide from "./guides/PumpGuide";

// ================== TYPE DEFINITIONS ==================

type UnitSystem = 'metric' | 'imperial';

// ================== UNIT CONVERSIONS ==================

// Metric flow rate units (to m³/s)
const metricFlowRateToM3s: Record<string, number> = {
  "m³/h": 1 / 3600,
  "m³/s": 1,
  "L/min": 1 / 60000,
  "L/s": 0.001,
};

// Imperial flow rate units (to m³/s)
const imperialFlowRateToM3s: Record<string, number> = {
  "gpm": 0.0000630902,
  "bbl/d": 0.00000184013,
  "ft³/min": 0.000471947,
  "ft³/s": 0.0283168,
};

// Metric head units (to m)
const metricHeadToMeters: Record<string, number> = {
  "m": 1,
  "bar": 10.197,
  "kPa": 0.10197,
};

// Imperial head units (to m)
const imperialHeadToMeters: Record<string, number> = {
  "ft": 0.3048,
  "psi": 0.703,
  "in H₂O": 0.0254,
};

// Length conversion (to meters)
const metricLengthToMeters: Record<string, number> = {
  "m": 1,
  "km": 1000,
};

const imperialLengthToMeters: Record<string, number> = {
  "ft": 0.3048,
  "mi": 1609.34,
};

// Density conversion (to kg/m³)
const metricDensityToKgM3: Record<string, number> = {
  "kg/m³": 1,
  "g/cm³": 1000,
  "SG": 1000,
};

const imperialDensityToKgM3: Record<string, number> = {
  "lb/ft³": 16.0185,
  "lb/gal": 119.826,
  "SG": 1000,
};

// Viscosity conversion (to Pa·s)
const viscosityToPas: Record<string, number> = {
  "cP": 0.001,
  "Pa·s": 1,
  "mPa·s": 0.001,
  "cSt": 0.001,
};

// Pressure conversion (to kPa)
const metricPressureToKPa: Record<string, number> = {
  "kPa": 1,
  "bar": 100,
  "MPa": 1000,
  "kPa(a)": 1,
};

const imperialPressureToKPa: Record<string, number> = {
  "psia": 6.89476,
  "psig": 6.89476,
  "in Hg": 3.38639,
};

// Power conversion (to kW)
const metricPowerToKW: Record<string, number> = {
  "kW": 1,
  "W": 0.001,
  "MW": 1000,
};

const imperialPowerToKW: Record<string, number> = {
  "hp": 0.7457,
  "BTU/hr": 0.000293071,
};

// ================== Eni Liquid Line Sizing Criteria (Table 8.2.1.1) ==================

interface LiquidSizingCriteria {
  service: string;
  pressureDropBarKm: number | null;
  velocity: {
    size2: number | null;
    size3to6: number | null;
    size8to12: number | null;
    size14to18: number | null;
    size20plus: number | null;
  } | null;
}

const liquidServiceCriteria: LiquidSizingCriteria[] = [
  { service: "Gravity Flow", pressureDropBarKm: null, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
  { service: "Pump Suction (Boiling Point)", pressureDropBarKm: 0.5, velocity: { size2: 0.6, size3to6: 0.9, size8to12: 1.3, size14to18: 1.8, size20plus: 2.2 } },
  { service: "Pump Suction (Sub-cooled)", pressureDropBarKm: 1.0, velocity: { size2: 0.7, size3to6: 1.2, size8to12: 1.6, size14to18: 2.1, size20plus: 2.6 } },
  { service: "Pump Discharge (Pop < 35 barg)", pressureDropBarKm: 4.5, velocity: { size2: 1.4, size3to6: 1.9, size8to12: 3.1, size14to18: 4.1, size20plus: 5.0 } },
  { service: "Pump Discharge (Pop > 35 barg)", pressureDropBarKm: 6.0, velocity: { size2: 1.5, size3to6: 2.0, size8to12: 3.5, size14to18: 4.6, size20plus: 5.0 } },
  { service: "Condenser Outlet (Pop < 10 barg)", pressureDropBarKm: 0.5, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
  { service: "Condenser Outlet (Pop > 10 barg)", pressureDropBarKm: 0.5, velocity: { size2: 0.6, size3to6: 0.9, size8to12: 1.3, size14to18: 1.8, size20plus: 2.2 } },
  { service: "Cooling Water Manifold", pressureDropBarKm: null, velocity: { size2: 3.5, size3to6: 3.5, size8to12: 3.5, size14to18: 3.5, size20plus: 3.5 } },
  { service: "Cooling Water Sub-manifold", pressureDropBarKm: 1.5, velocity: { size2: 2.0, size3to6: 3.1, size8to12: 3.5, size14to18: 3.5, size20plus: 3.5 } },
  { service: "Diathermic Oil", pressureDropBarKm: null, velocity: null },
  { service: "Liquid Sulphur", pressureDropBarKm: null, velocity: { size2: 1.8, size3to6: 1.8, size8to12: 1.8, size14to18: 1.8, size20plus: 1.8 } },
  { service: "Column Side-stream Draw-off", pressureDropBarKm: null, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
];

// Get velocity limit based on pipe size
const getLiquidVelocityLimit = (criteria: LiquidSizingCriteria, nominalSizeInch: number): number | null => {
  if (!criteria.velocity) return null;
  if (nominalSizeInch <= 2) return criteria.velocity.size2;
  if (nominalSizeInch <= 6) return criteria.velocity.size3to6;
  if (nominalSizeInch <= 12) return criteria.velocity.size8to12;
  if (nominalSizeInch <= 18) return criteria.velocity.size14to18;
  return criteria.velocity.size20plus;
};

// ================== PIPE SCHEDULE DATA (ASME B36.10M / B36.19M) ==================

const pipeScheduleData: Record<string, Record<string, number>> = {
  "1/2": { "5s": 18.04, "10s": 17.12, "40": 15.80, "STD": 15.80, "80": 13.87, "XS": 13.87, "160": 11.74, "XXS": 6.35 },
  "3/4": { "5s": 23.37, "10s": 22.45, "40": 20.93, "STD": 20.93, "80": 18.85, "XS": 18.85, "160": 15.54, "XXS": 11.07 },
  "1": { "5s": 29.51, "10s": 27.86, "40": 26.64, "STD": 26.64, "80": 24.31, "XS": 24.31, "160": 20.70, "XXS": 15.22 },
  "1-1/4": { "5s": 38.14, "10s": 36.63, "40": 35.05, "STD": 35.05, "80": 32.46, "XS": 32.46, "160": 29.46, "XXS": 22.76 },
  "1-1/2": { "5s": 44.20, "10s": 42.72, "40": 40.89, "STD": 40.89, "80": 38.10, "XS": 38.10, "160": 33.98, "XXS": 27.94 },
  "2": { "5s": 56.26, "10s": 54.79, "40": 52.50, "STD": 52.50, "80": 49.25, "XS": 49.25, "160": 42.90, "XXS": 38.16 },
  "2-1/2": { "5s": 68.78, "10s": 66.90, "40": 62.71, "STD": 62.71, "80": 59.00, "XS": 59.00, "160": 53.98, "XXS": 44.96 },
  "3": { "5s": 84.68, "10s": 82.80, "40": 77.93, "STD": 77.93, "80": 73.66, "XS": 73.66, "160": 66.64, "XXS": 58.42 },
  "4": { "5s": 110.08, "10s": 108.20, "40": 102.26, "STD": 102.26, "80": 97.18, "XS": 97.18, "120": 92.04, "160": 87.32, "XXS": 80.06 },
  "6": { "5s": 164.66, "10s": 162.74, "40": 154.05, "STD": 154.05, "80": 146.33, "XS": 146.33, "120": 139.70, "160": 131.78, "XXS": 124.38 },
  "8": { "5s": 216.66, "10s": 214.96, "20": 209.55, "30": 206.38, "40": 202.72, "STD": 202.72, "60": 196.85, "80": 193.68, "XS": 193.68, "100": 186.96, "120": 180.98, "140": 177.80, "160": 173.99, "XXS": 174.64 },
  "10": { "5s": 271.02, "10s": 268.92, "20": 262.76, "30": 257.48, "40": 254.51, "STD": 254.51, "60": 247.65, "80": 242.87, "XS": 247.65, "100": 236.52, "120": 230.18, "140": 225.42, "160": 222.25, "XXS": 222.25 },
  "12": { "5s": 323.85, "10s": 320.42, "20": 314.66, "30": 307.09, "40": 303.23, "STD": 303.23, "60": 295.30, "80": 288.90, "XS": 298.45, "100": 280.92, "120": 273.05, "140": 266.70, "160": 264.67, "XXS": 264.67 },
  "14": { "5s": 350.50, "10s": 347.68, "20": 342.90, "30": 339.76, "40": 336.54, "STD": 347.68, "60": 330.20, "80": 323.88, "XS": 339.76, "100": 317.50, "120": 311.18, "140": 304.80, "160": 290.58 },
  "16": { "5s": 400.86, "10s": 398.02, "20": 393.70, "30": 387.36, "40": 381.00, "STD": 398.02, "60": 374.66, "80": 363.52, "XS": 387.36, "100": 354.08, "120": 344.48, "140": 336.54, "160": 333.34 },
  "18": { "5s": 451.46, "10s": 448.62, "20": 444.30, "30": 434.72, "40": 428.66, "STD": 448.62, "60": 419.10, "80": 409.58, "XS": 434.72, "100": 398.02, "120": 387.36, "140": 381.00, "160": 376.94 },
  "20": { "5s": 501.80, "10s": 498.44, "20": 490.96, "30": 482.60, "40": 477.82, "STD": 498.44, "60": 466.78, "80": 455.62, "XS": 482.60, "100": 444.30, "120": 431.80, "140": 419.10, "160": 419.10 },
  "24": { "5s": 603.25, "10s": 598.42, "20": 590.04, "30": 581.66, "40": 574.68, "STD": 598.42, "60": 560.32, "80": 547.68, "XS": 581.66, "100": 530.10, "120": 514.35, "140": 504.82, "160": 498.44 },
  "30": { "5s": 755.65, "10s": 749.30, "20": 736.60, "30": 723.90, "STD": 749.30, "XS": 736.60 },
  "36": { "5s": 906.65, "10s": 898.52, "20": 882.90, "30": 869.95, "40": 863.60, "STD": 898.52, "XS": 882.90 },
};

const scheduleOrder = ["5s", "10s", "10", "20", "30", "40", "STD", "60", "80", "XS", "100", "120", "140", "160", "XXS"];
const nominalDiameters = Object.keys(pipeScheduleData);

const getSchedulesForDiameter = (nd: string): string[] => {
  const available = Object.keys(pipeScheduleData[nd] || {});
  return scheduleOrder.filter(sch => available.includes(sch));
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

// ================== EXPANDED K-FACTOR DATABASE (FITTINGS) - Per Crane TP-410 ==================

interface FittingData {
  name: string;
  K: number;
  LeD: number;
  category: string;
}

const fittingsDatabase: Record<string, FittingData> = {
  // Elbows
  "elbow_90_std": { name: "90° Elbow (Standard Radius)", K: 0.75, LeD: 30, category: "Elbows" },
  "elbow_90_long": { name: "90° Elbow (Long Radius)", K: 0.45, LeD: 20, category: "Elbows" },
  "elbow_90_short": { name: "90° Elbow (Short Radius)", K: 1.5, LeD: 50, category: "Elbows" },
  "elbow_90_mitered_1": { name: "90° Mitered Elbow (1 weld)", K: 1.3, LeD: 60, category: "Elbows" },
  "elbow_90_mitered_2": { name: "90° Mitered Elbow (2 welds)", K: 0.75, LeD: 35, category: "Elbows" },
  "elbow_90_mitered_3": { name: "90° Mitered Elbow (3 welds)", K: 0.55, LeD: 25, category: "Elbows" },
  "elbow_45": { name: "45° Elbow", K: 0.35, LeD: 16, category: "Elbows" },
  "elbow_45_mitered": { name: "45° Mitered Elbow", K: 0.30, LeD: 15, category: "Elbows" },
  "elbow_180": { name: "180° Return Bend", K: 1.5, LeD: 60, category: "Elbows" },
  
  // Tees
  "tee_straight": { name: "Tee (Straight Through)", K: 0.4, LeD: 20, category: "Tees" },
  "tee_branch_90": { name: "Tee (Branch Flow 90°)", K: 1.3, LeD: 60, category: "Tees" },
  "tee_branch_45": { name: "Tee (Branch Flow 45°)", K: 0.8, LeD: 35, category: "Tees" },
  "tee_dividing": { name: "Tee (Dividing Flow)", K: 1.0, LeD: 50, category: "Tees" },
  
  // Gate Valves
  "gate_valve_full": { name: "Gate Valve (Full Open)", K: 0.17, LeD: 8, category: "Gate Valves" },
  "gate_valve_3_4": { name: "Gate Valve (3/4 Open)", K: 0.9, LeD: 35, category: "Gate Valves" },
  "gate_valve_half": { name: "Gate Valve (1/2 Open)", K: 4.5, LeD: 160, category: "Gate Valves" },
  "gate_valve_1_4": { name: "Gate Valve (1/4 Open)", K: 24.0, LeD: 900, category: "Gate Valves" },
  
  // Globe Valves
  "globe_valve_full": { name: "Globe Valve (Full Open)", K: 6.0, LeD: 340, category: "Globe Valves" },
  "globe_valve_half": { name: "Globe Valve (1/2 Open)", K: 9.5, LeD: 500, category: "Globe Valves" },
  "globe_valve_angle": { name: "Angle Valve (Full Open)", K: 2.0, LeD: 145, category: "Globe Valves" },
  "globe_valve_y": { name: "Y-Pattern Globe (Full Open)", K: 3.0, LeD: 160, category: "Globe Valves" },
  
  // Ball Valves
  "ball_valve_full": { name: "Ball Valve (Full Open)", K: 0.05, LeD: 3, category: "Ball Valves" },
  "ball_valve_reduced": { name: "Ball Valve (Reduced Port)", K: 0.15, LeD: 8, category: "Ball Valves" },
  "ball_valve_v_port": { name: "Ball Valve (V-Port)", K: 0.25, LeD: 12, category: "Ball Valves" },
  
  // Butterfly Valves
  "butterfly_valve_full": { name: "Butterfly Valve (Full Open)", K: 0.25, LeD: 12, category: "Butterfly Valves" },
  "butterfly_valve_30": { name: "Butterfly Valve (30° Open)", K: 6.5, LeD: 300, category: "Butterfly Valves" },
  "butterfly_valve_60": { name: "Butterfly Valve (60° Open)", K: 1.5, LeD: 70, category: "Butterfly Valves" },
  
  // Plug Valves
  "plug_valve_full": { name: "Plug Valve (Full Open)", K: 0.4, LeD: 18, category: "Plug Valves" },
  "plug_valve_3_way": { name: "3-Way Plug Valve (Straight)", K: 0.6, LeD: 25, category: "Plug Valves" },
  
  // Check Valves
  "check_valve_swing": { name: "Swing Check Valve", K: 2.0, LeD: 100, category: "Check Valves" },
  "check_valve_lift": { name: "Lift Check Valve", K: 10.0, LeD: 600, category: "Check Valves" },
  "check_valve_ball": { name: "Ball Check Valve", K: 4.0, LeD: 150, category: "Check Valves" },
  "check_valve_tilting": { name: "Tilting Disc Check Valve", K: 1.0, LeD: 50, category: "Check Valves" },
  "check_valve_wafer": { name: "Wafer Check Valve", K: 2.5, LeD: 120, category: "Check Valves" },
  "check_valve_nozzle": { name: "Nozzle Check Valve", K: 1.5, LeD: 75, category: "Check Valves" },
  
  // Reducers & Expanders
  "reducer_concentric": { name: "Concentric Reducer", K: 0.5, LeD: 25, category: "Reducers" },
  "reducer_eccentric": { name: "Eccentric Reducer", K: 0.6, LeD: 30, category: "Reducers" },
  "expander_gradual": { name: "Gradual Expander (θ<15°)", K: 0.3, LeD: 15, category: "Reducers" },
  "expander_sudden": { name: "Sudden Expansion", K: 1.0, LeD: 40, category: "Reducers" },
  "contraction_gradual": { name: "Gradual Contraction", K: 0.1, LeD: 5, category: "Reducers" },
  "contraction_sudden": { name: "Sudden Contraction", K: 0.5, LeD: 25, category: "Reducers" },
  
  // Strainers & Filters
  "strainer_y": { name: "Y-Strainer", K: 2.0, LeD: 100, category: "Strainers" },
  "strainer_basket": { name: "Basket Strainer", K: 3.5, LeD: 175, category: "Strainers" },
  "strainer_duplex": { name: "Duplex Strainer", K: 3.0, LeD: 150, category: "Strainers" },
  "filter": { name: "In-line Filter", K: 4.0, LeD: 200, category: "Strainers" },
  
  // Entrance & Exit
  "entrance_bellmouth": { name: "Pipe Entrance (Bellmouth)", K: 0.04, LeD: 2, category: "Entrance/Exit" },
  "entrance_rounded": { name: "Pipe Entrance (Rounded)", K: 0.25, LeD: 12, category: "Entrance/Exit" },
  "entrance_sharp": { name: "Pipe Entrance (Sharp Edge)", K: 0.5, LeD: 25, category: "Entrance/Exit" },
  "entrance_projecting": { name: "Pipe Entrance (Projecting)", K: 0.8, LeD: 40, category: "Entrance/Exit" },
  "exit_sharp": { name: "Pipe Exit (Sharp)", K: 1.0, LeD: 50, category: "Entrance/Exit" },
  "exit_submerged": { name: "Pipe Exit (Submerged)", K: 1.0, LeD: 50, category: "Entrance/Exit" },
  
  // Miscellaneous
  "flowmeter_orifice": { name: "Orifice Flowmeter", K: 2.5, LeD: 125, category: "Miscellaneous" },
  "flowmeter_venturi": { name: "Venturi Flowmeter", K: 0.5, LeD: 25, category: "Miscellaneous" },
  "flowmeter_magnetic": { name: "Magnetic Flowmeter", K: 0.1, LeD: 5, category: "Miscellaneous" },
  "coupling": { name: "Union/Coupling", K: 0.04, LeD: 2, category: "Miscellaneous" },
  "foot_valve": { name: "Foot Valve with Strainer", K: 15.0, LeD: 750, category: "Miscellaneous" },
  "pulsation_dampener": { name: "Pulsation Dampener", K: 2.0, LeD: 100, category: "Miscellaneous" },
};

// Group fittings by category
const getFittingsByCategory = (): Record<string, { key: string; name: string; K: number }[]> => {
  const categories: Record<string, { key: string; name: string; K: number }[]> = {};
  Object.entries(fittingsDatabase).forEach(([key, data]) => {
    if (!categories[data.category]) {
      categories[data.category] = [];
    }
    categories[data.category].push({ key, name: data.name, K: data.K });
  });
  return categories;
};

// ================== PIPE ROUGHNESS (mm) ==================

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

// ================== PUMP TYPES (per API 610 / API 674 / API 676) ==================

interface PumpType {
  name: string;
  standard: string;
  typicalEfficiency: [number, number];
  typicalHead: [number, number];
  typicalFlow: [number, number];
  characteristics: string[];
}

const pumpTypes: Record<string, PumpType> = {
  "centrifugal_oh1": {
    name: "API 610 OH1 (Horizontal, Foot Mounted)",
    standard: "API 610",
    typicalEfficiency: [55, 85],
    typicalHead: [10, 150],
    typicalFlow: [5, 500],
    characteristics: ["Overhung impeller", "Foot mounted", "General purpose", "Easy maintenance"]
  },
  "centrifugal_oh2": {
    name: "API 610 OH2 (Horizontal, Centerline Mounted)",
    standard: "API 610",
    typicalEfficiency: [60, 85],
    typicalHead: [15, 200],
    typicalFlow: [10, 1000],
    characteristics: ["Centerline mounted", "High temperature service", "Reduced nozzle loads", "Process applications"]
  },
  "centrifugal_oh3": {
    name: "API 610 OH3 (Vertical, In-line)",
    standard: "API 610",
    typicalEfficiency: [55, 80],
    typicalHead: [10, 100],
    typicalFlow: [5, 300],
    characteristics: ["Vertical in-line", "Space saving", "Pipe-supported", "Low maintenance"]
  },
  "centrifugal_bb1": {
    name: "API 610 BB1 (Axially Split, Single Stage)",
    standard: "API 610",
    typicalEfficiency: [70, 88],
    typicalHead: [20, 180],
    typicalFlow: [100, 5000],
    characteristics: ["Double suction", "Low NPSH required", "High flow", "Water services"]
  },
  "centrifugal_bb2": {
    name: "API 610 BB2 (Radially Split, Single Stage)",
    standard: "API 610",
    typicalEfficiency: [70, 87],
    typicalHead: [30, 250],
    typicalFlow: [50, 2000],
    characteristics: ["High pressure", "Between bearings", "Hydrocarbon services"]
  },
  "centrifugal_bb3": {
    name: "API 610 BB3 (Axially Split, Multistage)",
    standard: "API 610",
    typicalEfficiency: [65, 85],
    typicalHead: [100, 600],
    typicalFlow: [50, 1500],
    characteristics: ["High head", "Boiler feed water", "Multiple stages", "Pipeline services"]
  },
  "centrifugal_bb5": {
    name: "API 610 BB5 (Radially Split, Multistage)",
    standard: "API 610",
    typicalEfficiency: [65, 82],
    typicalHead: [200, 2000],
    typicalFlow: [10, 500],
    characteristics: ["Very high pressure", "Injection services", "Barrel design"]
  },
  "centrifugal_vs1": {
    name: "API 610 VS1 (Vertical, Single Stage)",
    standard: "API 610",
    typicalEfficiency: [50, 75],
    typicalHead: [5, 50],
    typicalFlow: [10, 1000],
    characteristics: ["Sump pump", "Wet pit", "Submerged suction"]
  },
  "centrifugal_vs6": {
    name: "API 610 VS6 (Vertical, Multistage)",
    standard: "API 610",
    typicalEfficiency: [55, 80],
    typicalHead: [50, 400],
    typicalFlow: [5, 200],
    characteristics: ["Deep well", "Borehole", "Can type"]
  },
  "reciprocating_simplex": {
    name: "API 674 Reciprocating (Simplex)",
    standard: "API 674",
    typicalEfficiency: [80, 95],
    typicalHead: [100, 3000],
    typicalFlow: [0.1, 50],
    characteristics: ["High pressure", "Constant flow", "Single acting", "Chemical injection"]
  },
  "reciprocating_duplex": {
    name: "API 674 Reciprocating (Duplex)",
    standard: "API 674",
    typicalEfficiency: [80, 95],
    typicalHead: [100, 2500],
    typicalFlow: [0.5, 100],
    characteristics: ["Reduced pulsation", "Double acting", "Metering", "High viscosity"]
  },
  "reciprocating_triplex": {
    name: "API 674 Reciprocating (Triplex)",
    standard: "API 674",
    typicalEfficiency: [85, 95],
    typicalHead: [100, 3500],
    typicalFlow: [1, 200],
    characteristics: ["Smooth flow", "High pressure", "Mud pumps", "Desalination"]
  },
  "rotary_gear": {
    name: "API 676 Rotary (Gear)",
    standard: "API 676",
    typicalEfficiency: [50, 75],
    typicalHead: [30, 200],
    typicalFlow: [0.1, 100],
    characteristics: ["High viscosity", "Lubricating fluids", "Constant flow", "Self-priming"]
  },
  "rotary_screw": {
    name: "API 676 Rotary (Screw/Twin Screw)",
    standard: "API 676",
    typicalEfficiency: [60, 80],
    typicalHead: [50, 400],
    typicalFlow: [1, 500],
    characteristics: ["Low pulsation", "Multiphase capable", "Crude oil", "Asphalt"]
  },
  "rotary_progressive": {
    name: "API 676 Rotary (Progressive Cavity)",
    standard: "API 676",
    typicalEfficiency: [40, 70],
    typicalHead: [50, 240],
    typicalFlow: [0.5, 200],
    characteristics: ["High viscosity", "Abrasive fluids", "Sludge", "Polymers"]
  },
  "rotary_lobe": {
    name: "API 676 Rotary (Lobe)",
    standard: "API 676",
    typicalEfficiency: [40, 65],
    typicalHead: [10, 50],
    typicalFlow: [5, 500],
    characteristics: ["Gentle pumping", "Shear sensitive", "Food grade", "Slurries"]
  },
};

// ================== CALCULATION FUNCTIONS (Darcy-Weisbach per API) ==================

const calculateColebrook = (Re: number, eD: number): number => {
  // Swamee-Jain approximation for Colebrook-White equation
  const term1 = eD / 3.7;
  const term2 = 5.74 / Math.pow(Re, 0.9);
  return 0.25 / Math.pow(Math.log10(term1 + term2), 2);
};

const calculateFrictionFactor = (Re: number, roughness: number, diameter: number): number => {
  const relativeRoughness = roughness / diameter;
  
  if (Re < 2300) {
    // Laminar flow - Hagen-Poiseuille
    return 64 / Re;
  } else if (Re < 4000) {
    // Transition zone - linear interpolation
    const fLam = 64 / Re;
    const fTurb = calculateColebrook(4000, relativeRoughness);
    const t = (Re - 2300) / 1700;
    return fLam * (1 - t) + fTurb * t;
  } else {
    // Turbulent flow - Colebrook-White
    return calculateColebrook(Re, relativeRoughness);
  }
};

const calculateReynolds = (velocity: number, diameter: number, density: number, viscosity: number): number => {
  return (density * velocity * diameter) / viscosity;
};

const calculateVelocity = (flowRate: number, diameter: number): number => {
  const area = Math.PI * Math.pow(diameter / 2, 2);
  return flowRate / area;
};

// NPSHa calculation per API 610 / HI
const calculateNPSHa = (
  suctionPressure: number, // Pa absolute
  liquidVaporPressure: number, // Pa
  suctionStaticHead: number, // m (positive if above pump, negative if below)
  suctionFrictionLoss: number, // m
  suctionVelocityHead: number, // m
  density: number // kg/m³
): number => {
  const g = 9.81;
  // NPSHa = (Ps - Pv)/(ρg) + Zs - hfs + Vs²/(2g)
  const pressureHead = (suctionPressure - liquidVaporPressure) / (density * g);
  return pressureHead + suctionStaticHead - suctionFrictionLoss + suctionVelocityHead;
};

// ================== MAIN COMPONENT ==================

const PumpSizingCalculator = () => {
  // ========== UNIT SYSTEM ==========
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  
  // Get current unit sets based on unit system
  const flowRateUnits = unitSystem === 'metric' ? metricFlowRateToM3s : imperialFlowRateToM3s;
  const headUnits = unitSystem === 'metric' ? metricHeadToMeters : imperialHeadToMeters;
  const lengthUnits = unitSystem === 'metric' ? metricLengthToMeters : imperialLengthToMeters;
  const densityUnits = unitSystem === 'metric' ? metricDensityToKgM3 : imperialDensityToKgM3;
  const pressureUnits = unitSystem === 'metric' ? metricPressureToKPa : imperialPressureToKPa;
  const powerUnits = unitSystem === 'metric' ? metricPowerToKW : imperialPowerToKW;

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
  
  // Fittings - using dynamic state for all fittings
  const [suctionFittings, setSuctionFittings] = useState<Record<string, number>>({
    "elbow_90_long": 1,
    "gate_valve_full": 1,
    "strainer_y": 1,
    "entrance_bellmouth": 1,
  });
  
  const [dischargeFittings, setDischargeFittings] = useState<Record<string, number>>({
    "elbow_90_long": 4,
    "gate_valve_full": 2,
    "check_valve_swing": 1,
    "exit_sharp": 1,
  });
  
  // Pump selection
  const [pumpType, setPumpType] = useState<string>("centrifugal_oh2");
  const [pumpEfficiency, setPumpEfficiency] = useState<string>("75");
  const [motorEfficiency, setMotorEfficiency] = useState<string>("95");
  const [npshrMargin, setNpshrMargin] = useState<string>(unitSystem === 'metric' ? "0.5" : "1.6");
  
  // Display units
  const [headDisplayUnit, setHeadDisplayUnit] = useState<string>(unitSystem === 'metric' ? "m" : "ft");
  const [powerDisplayUnit, setPowerDisplayUnit] = useState<string>(unitSystem === 'metric' ? "kW" : "hp");

  // Update units when system changes
  const handleUnitSystemChange = (newSystem: UnitSystem) => {
    setUnitSystem(newSystem);
    if (newSystem === 'metric') {
      setFlowRateUnit("m³/h");
      setDensityUnit("kg/m³");
      setVaporPressureUnit("kPa");
      setSuctionPressureUnit("kPa(a)");
      setSuctionHeadUnit("m");
      setSuctionLengthUnit("m");
      setDischargeHeadUnit("m");
      setDischargeLengthUnit("m");
      setDischargeEndPressureUnit("bar");
      setHeadDisplayUnit("m");
      setPowerDisplayUnit("kW");
    } else {
      setFlowRateUnit("gpm");
      setDensityUnit("lb/ft³");
      setVaporPressureUnit("psia");
      setSuctionPressureUnit("psia");
      setSuctionHeadUnit("ft");
      setSuctionLengthUnit("ft");
      setDischargeHeadUnit("ft");
      setDischargeLengthUnit("ft");
      setDischargeEndPressureUnit("psig");
      setHeadDisplayUnit("ft");
      setPowerDisplayUnit("hp");
    }
  };

  // Get Eni sizing criteria for suction
  const suctionCriteria = liquidServiceCriteria.find(c => c.service === suctionServiceType);
  const dischargeCriteria = liquidServiceCriteria.find(c => c.service === dischargeServiceType);

  // ========== CALCULATIONS ==========
  
  const calculations = useMemo(() => {
    const g = 9.81; // m/s²
    
    // Convert inputs to SI units
    const allFlowRateUnits = { ...metricFlowRateToM3s, ...imperialFlowRateToM3s };
    const allDensityUnits = { ...metricDensityToKgM3, ...imperialDensityToKgM3 };
    const allPressureUnits = { ...metricPressureToKPa, ...imperialPressureToKPa };
    const allHeadUnits = { ...metricHeadToMeters, ...imperialHeadToMeters };
    const allLengthUnits = { ...metricLengthToMeters, ...imperialLengthToMeters };
    
    const Q_m3s = parseFloat(flowRate) * (allFlowRateUnits[flowRateUnit] || 1 / 3600);
    const rho = parseFloat(density) * (allDensityUnits[densityUnit] || 1);
    const mu = parseFloat(viscosity) * (viscosityToPas[viscosityUnit] || 0.001);
    const Pv = parseFloat(vaporPressure) * (allPressureUnits[vaporPressureUnit] || 1) * 1000; // to Pa
    const Ps = parseFloat(suctionPressure) * (allPressureUnits[suctionPressureUnit] || 1) * 1000; // to Pa
    
    // Pipe roughness
    const roughness_m = pipeMaterial === "Custom" 
      ? parseFloat(customRoughness) * 0.001 
      : (pipeRoughness[pipeMaterial] || 0.0457) * 0.001;
    
    // Suction pipe geometry
    const suctionDia_mm = pipeScheduleData[suctionNominalDia]?.[suctionSchedule] || 154.05;
    const suctionDia_m = suctionDia_mm * 0.001;
    const suctionLength_m = parseFloat(suctionPipeLength) * (allLengthUnits[suctionLengthUnit] || 1);
    const suctionStaticHead_m = parseFloat(suctionStaticHead) * (allHeadUnits[suctionHeadUnit] || 1);
    const suctionNominalSizeInch = parseNominalDiameter(suctionNominalDia);
    
    // Discharge pipe geometry
    const dischargeDia_mm = pipeScheduleData[dischargeNominalDia]?.[dischargeSchedule] || 102.26;
    const dischargeDia_m = dischargeDia_mm * 0.001;
    const dischargeLength_m = parseFloat(dischargePipeLength) * (allLengthUnits[dischargeLengthUnit] || 1);
    const dischargeStaticHead_m = parseFloat(dischargeStaticHead) * (allHeadUnits[dischargeHeadUnit] || 1);
    const dischargeNominalSizeInch = parseNominalDiameter(dischargeNominalDia);
    
    // Discharge end pressure - handle gauge vs absolute
    let dischargeEndPressure_Pa = parseFloat(dischargeEndPressure) * (allPressureUnits[dischargeEndPressureUnit] || 100) * 1000;
    if (dischargeEndPressureUnit.includes("g")) { // gauge pressure
      dischargeEndPressure_Pa += Ps; // Add suction absolute pressure as reference
    }
    
    // Velocities
    const suctionVelocity = calculateVelocity(Q_m3s, suctionDia_m);
    const dischargeVelocity = calculateVelocity(Q_m3s, dischargeDia_m);
    
    // Reynolds numbers
    const suctionRe = calculateReynolds(suctionVelocity, suctionDia_m, rho, mu);
    const dischargeRe = calculateReynolds(dischargeVelocity, dischargeDia_m, rho, mu);
    
    // Friction factors (Darcy-Weisbach)
    const suctionFf = calculateFrictionFactor(suctionRe, roughness_m, suctionDia_m);
    const dischargeFf = calculateFrictionFactor(dischargeRe, roughness_m, dischargeDia_m);
    
    // Suction fitting losses (K-factors)
    let suctionKTotal = 0;
    Object.entries(suctionFittings).forEach(([key, count]) => {
      if (fittingsDatabase[key] && count > 0) {
        suctionKTotal += count * fittingsDatabase[key].K;
      }
    });
    
    // Discharge fitting losses (K-factors)
    let dischargeKTotal = 0;
    Object.entries(dischargeFittings).forEach(([key, count]) => {
      if (fittingsDatabase[key] && count > 0) {
        dischargeKTotal += count * fittingsDatabase[key].K;
      }
    });
    
    // Suction friction loss (Darcy-Weisbach: hf = f * L/D * v²/2g)
    const suctionPipeLoss = suctionFf * (suctionLength_m / suctionDia_m) * (Math.pow(suctionVelocity, 2) / (2 * g));
    const suctionFittingLoss = suctionKTotal * (Math.pow(suctionVelocity, 2) / (2 * g));
    const suctionTotalLoss = suctionPipeLoss + suctionFittingLoss;
    
    // Discharge friction loss
    const dischargePipeLoss = dischargeFf * (dischargeLength_m / dischargeDia_m) * (Math.pow(dischargeVelocity, 2) / (2 * g));
    const dischargeFittingLoss = dischargeKTotal * (Math.pow(dischargeVelocity, 2) / (2 * g));
    const dischargeTotalLoss = dischargePipeLoss + dischargeFittingLoss;
    
    // Total friction loss
    const totalFrictionLoss = suctionTotalLoss + dischargeTotalLoss;
    
    // Static head (discharge - suction)
    const totalStaticHead = dischargeStaticHead_m - suctionStaticHead_m;
    
    // Pressure head at discharge (convert discharge pressure to head)
    const pressureHead = (dischargeEndPressure_Pa - Ps) / (rho * g);
    
    // Velocity head
    const suctionVelocityHead = Math.pow(suctionVelocity, 2) / (2 * g);
    const dischargeVelocityHead = Math.pow(dischargeVelocity, 2) / (2 * g);
    const velocityHeadDiff = dischargeVelocityHead - suctionVelocityHead;
    
    // Total Dynamic Head (TDH) per API 610 / HI
    // TDH = (Pd - Ps)/(ρg) + (Zd - Zs) + (Vd² - Vs²)/(2g) + hf_total
    const totalHead = totalStaticHead + totalFrictionLoss + pressureHead + velocityHeadDiff;
    
    // NPSHa calculation per API 610
    const npshaValue = calculateNPSHa(Ps, Pv, suctionStaticHead_m, suctionTotalLoss, suctionVelocityHead, rho);
    
    // Power calculations per API 610
    const eta_pump = parseFloat(pumpEfficiency) / 100;
    const eta_motor = parseFloat(motorEfficiency) / 100;
    
    // Hydraulic power: Ph = ρ * g * Q * H
    const hydraulicPower_kW = (rho * g * Q_m3s * totalHead) / 1000;
    // Brake power: Pb = Ph / η_pump
    const brakePower_kW = hydraulicPower_kW / eta_pump;
    // Motor power: Pm = Pb / η_motor
    const motorPower_kW = brakePower_kW / eta_motor;
    
    // Specific speed (for pump selection) - API 610 / HI
    const Q_m3min = Q_m3s * 60;
    const n = 2950; // Typical 2-pole motor speed at 50Hz (rpm)
    // Ns = n * √Q / H^0.75 (metric specific speed)
    const Ns = n * Math.sqrt(Q_m3min) / Math.pow(totalHead, 0.75);
    
    // Suction specific speed
    const Nss = n * Math.sqrt(Q_m3min) / Math.pow(Math.max(npshaValue, 0.1), 0.75);
    
    // Flow regime
    const flowRegime = suctionRe < 2300 ? "Laminar" : suctionRe < 4000 ? "Transition" : "Turbulent";
    
    // Get Eni velocity limits
    const suctionCriteriaData = liquidServiceCriteria.find(c => c.service === suctionServiceType);
    const dischargeCriteriaData = liquidServiceCriteria.find(c => c.service === dischargeServiceType);
    
    const suctionVelLimit = suctionCriteriaData ? getLiquidVelocityLimit(suctionCriteriaData, suctionNominalSizeInch) : null;
    const dischargeVelLimit = dischargeCriteriaData ? getLiquidVelocityLimit(dischargeCriteriaData, dischargeNominalSizeInch) : null;
    
    // Calculate pressure drop per km
    const suctionDpBarKm = suctionLength_m > 0 ? (suctionTotalLoss * rho * g / 100000) / (suctionLength_m / 1000) : 0;
    const dischargeDpBarKm = dischargeLength_m > 0 ? (dischargeTotalLoss * rho * g / 100000) / (dischargeLength_m / 1000) : 0;
    
    return {
      // Flow
      flowRate_m3h: Q_m3s * 3600,
      flowRate_gpm: Q_m3s / 0.0000630902,
      
      // Velocities
      suctionVelocity,
      dischargeVelocity,
      
      // Velocity limits (Eni criteria)
      suctionVelLimit,
      dischargeVelLimit,
      
      // Pressure drop
      suctionDpBarKm,
      dischargeDpBarKm,
      suctionDpLimit: suctionCriteriaData?.pressureDropBarKm || null,
      dischargeDpLimit: dischargeCriteriaData?.pressureDropBarKm || null,
      
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
      suctionVelocityHead,
      dischargeVelocityHead,
      totalHead,
      
      // NPSH
      npshaValue,
      npshrEstimate: npshaValue - parseFloat(npshrMargin) * (headUnits[headDisplayUnit] || 1),
      
      // Power
      hydraulicPower_kW,
      brakePower_kW,
      motorPower_kW,
      
      // Pump selection parameters
      specificSpeed: Ns,
      suctionSpecificSpeed: Nss,
      
      // Pipe diameters for display
      suctionDia_mm,
      dischargeDia_mm,
      suctionNominalSizeInch,
      dischargeNominalSizeInch,
      
      // Validity checks
      isValid: !isNaN(totalHead) && totalHead > 0 && Q_m3s > 0,
      suctionVelocityOk: suctionVelLimit ? suctionVelocity <= suctionVelLimit : suctionVelocity <= 2.0,
      dischargeVelocityOk: dischargeVelLimit ? dischargeVelocity <= dischargeVelLimit : dischargeVelocity <= 4.0,
      suctionDpOk: suctionCriteriaData?.pressureDropBarKm ? suctionDpBarKm <= suctionCriteriaData.pressureDropBarKm : true,
      dischargeDpOk: dischargeCriteriaData?.pressureDropBarKm ? dischargeDpBarKm <= dischargeCriteriaData.pressureDropBarKm : true,
      npshaOk: npshaValue > 3,
    };
  }, [
    flowRate, flowRateUnit, density, densityUnit, viscosity, viscosityUnit,
    vaporPressure, vaporPressureUnit, suctionPressure, suctionPressureUnit,
    pipeMaterial, customRoughness,
    suctionStaticHead, suctionHeadUnit, suctionPipeLength, suctionLengthUnit,
    suctionNominalDia, suctionSchedule, suctionFittings, suctionServiceType,
    dischargeStaticHead, dischargeHeadUnit, dischargePipeLength, dischargeLengthUnit,
    dischargeNominalDia, dischargeSchedule, dischargeFittings, dischargeServiceType,
    dischargeEndPressure, dischargeEndPressureUnit,
    pumpEfficiency, motorEfficiency, npshrMargin, headDisplayUnit, headUnits
  ]);

  // Helper function for head unit conversion display
  const convertHead = (headM: number): number => {
    const allHeadUnits = { ...metricHeadToMeters, ...imperialHeadToMeters };
    return headM / (allHeadUnits[headDisplayUnit] || 1);
  };

  const convertPower = (powerKW: number): number => {
    const allPowerUnits = { ...metricPowerToKW, ...imperialPowerToKW };
    return powerKW / (allPowerUnits[powerDisplayUnit] || 1);
  };

  // Get pump type info
  const selectedPumpInfo = pumpTypes[pumpType];

  // Group fittings for display
  const fittingCategories = getFittingsByCategory();

  // Update fitting count
  const updateSuctionFitting = (key: string, count: number) => {
    setSuctionFittings(prev => ({ ...prev, [key]: Math.max(0, count) }));
  };
  
  const updateDischargeFitting = (key: string, count: number) => {
    setDischargeFittings(prev => ({ ...prev, [key]: Math.max(0, count) }));
  };

  return (
    <div className="space-y-6">
      {/* Unit System Header */}
      <div className="bg-gradient-to-r from-primary/5 via-muted/30 to-primary/5 rounded-xl border-2 border-primary/20 p-4">
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Ruler className="w-4 h-4" />
              <span className="text-xs font-medium">Units:</span>
            </div>
            <div className="flex items-center gap-1.5 bg-background/80 rounded-lg px-2 py-1 border">
              <span className={`text-xs font-semibold transition-colors ${unitSystem === 'metric' ? 'text-primary' : 'text-muted-foreground'}`}>
                Metric
              </span>
              <Switch
                checked={unitSystem === 'imperial'}
                onCheckedChange={(checked) => handleUnitSystemChange(checked ? 'imperial' : 'metric')}
                className="scale-75"
              />
              <span className={`text-xs font-semibold transition-colors ${unitSystem === 'imperial' ? 'text-primary' : 'text-muted-foreground'}`}>
                Imperial
              </span>
            </div>
          </div>
          
          <div className="hidden lg:block h-8 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Temperature:</span>
            <Badge variant="outline" className="text-xs">{fluidTemp} {unitSystem === 'metric' ? '°C' : '°F'}</Badge>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            API 610 / API 674 / API 676
          </Badge>
        </div>
      </div>

      {/* Input Tabs */}
      <Tabs defaultValue="flow" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="flow" className="text-xs sm:text-sm">
            <Droplets className="w-4 h-4 mr-1 hidden sm:inline" />
            Flow
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
          <TabsTrigger value="pump" className="text-xs sm:text-sm">
            <Gauge className="w-4 h-4 mr-1 hidden sm:inline" />
            Pump
          </TabsTrigger>
          <TabsTrigger value="curves" className="text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 mr-1 hidden sm:inline" />
            Curves
          </TabsTrigger>
          <TabsTrigger value="guide" className="text-xs sm:text-sm">
            <HelpCircle className="w-4 h-4 mr-1 hidden sm:inline" />
            Guide
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
                      {Object.keys(flowRateUnits).map((unit) => (
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
                      {Object.keys(densityUnits).map((unit) => (
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
                    <SelectTrigger className="w-20">
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
                  Vapor Pressure
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vapor pressure at operating temperature</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="vaporPressure"
                    type="number"
                    step="0.01"
                    value={vaporPressure}
                    onChange={(e) => setVaporPressure(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={vaporPressureUnit} onValueChange={setVaporPressureUnit}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(pressureUnits).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fluid Temperature */}
              <div className="space-y-2">
                <Label htmlFor="fluidTemp">Fluid Temperature ({unitSystem === 'metric' ? '°C' : '°F'})</Label>
                <Input
                  id="fluidTemp"
                  type="number"
                  value={fluidTemp}
                  onChange={(e) => setFluidTemp(e.target.value)}
                />
              </div>

              {/* Pipe Material */}
              <div className="space-y-2">
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-blue-500 rotate-180" />
                  Suction Side Geometry
                </CardTitle>
                {/* Eni Sizing Criteria */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Eni Sizing Criteria:</Label>
                  <Select value={suctionServiceType} onValueChange={setSuctionServiceType}>
                    <SelectTrigger className="w-[220px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {liquidServiceCriteria.filter(c => c.service.toLowerCase().includes('suction') || c.service.toLowerCase().includes('gravity')).map((c) => (
                        <SelectItem key={c.service} value={c.service} className="text-xs">{c.service}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Recommended Limits */}
              {suctionCriteria && (
                <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium mb-1">Recommended Limits</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {suctionCriteria.pressureDropBarKm && (
                      <span>ΔP ≤ {suctionCriteria.pressureDropBarKm} bar/km</span>
                    )}
                    {suctionCriteria.velocity && (
                      <span>
                        v ≤ {getLiquidVelocityLimit(suctionCriteria, calculations.suctionNominalSizeInch)} m/s
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Suction Pressure */}
              <div className="space-y-2">
                <Label htmlFor="suctionPressure" className="flex items-center gap-1">
                  Suction Pressure (Absolute)
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Absolute pressure at suction source<br/>Typically vessel pressure or atmospheric</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="suctionPressure"
                    type="number"
                    value={suctionPressure}
                    onChange={(e) => setSuctionPressure(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={suctionPressureUnit} onValueChange={setSuctionPressureUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(pressureUnits).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                      {Object.keys(headUnits).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
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
                      {Object.keys(lengthUnits).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
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

              {/* Suction Status */}
              <div className="md:col-span-2 lg:col-span-3 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium mb-2">Suction Line Status</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Velocity</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{calculations.suctionVelocity.toFixed(2)} m/s</span>
                      {calculations.suctionVelocityOk ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Limit</span>
                    <span className="font-mono">{calculations.suctionVelLimit?.toFixed(1) || '2.0'} m/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ΔP</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{calculations.suctionDpBarKm.toFixed(2)} bar/km</span>
                      {calculations.suctionDpOk ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reynolds</span>
                    <span className="font-mono">{calculations.suctionRe.toExponential(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discharge Side Tab */}
        <TabsContent value="discharge">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-orange-500" />
                  Discharge Side Geometry
                </CardTitle>
                {/* Eni Sizing Criteria */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Eni Sizing Criteria:</Label>
                  <Select value={dischargeServiceType} onValueChange={setDischargeServiceType}>
                    <SelectTrigger className="w-[220px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {liquidServiceCriteria.filter(c => c.service.toLowerCase().includes('discharge') || c.service.toLowerCase().includes('manifold') || c.service.toLowerCase().includes('condenser')).map((c) => (
                        <SelectItem key={c.service} value={c.service} className="text-xs">{c.service}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Recommended Limits */}
              {dischargeCriteria && (
                <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium mb-1">Recommended Limits</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {dischargeCriteria.pressureDropBarKm && (
                      <span>ΔP ≤ {dischargeCriteria.pressureDropBarKm} bar/km</span>
                    )}
                    {dischargeCriteria.velocity && (
                      <span>
                        v ≤ {getLiquidVelocityLimit(dischargeCriteria, calculations.dischargeNominalSizeInch)} m/s
                      </span>
                    )}
                  </div>
                </div>
              )}
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
                      {Object.keys(headUnits).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
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
                      {Object.keys(lengthUnits).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Discharge End Pressure */}
              <div className="space-y-2">
                <Label htmlFor="dischargePress" className="flex items-center gap-1">
                  Discharge Pressure
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Required pressure at discharge point<br/>Set to 0 for open tank discharge</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="dischargePress"
                    type="number"
                    step="0.1"
                    value={dischargeEndPressure}
                    onChange={(e) => setDischargeEndPressure(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={dischargeEndPressureUnit} onValueChange={setDischargeEndPressureUnit}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(pressureUnits).map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              {/* Discharge Status */}
              <div className="md:col-span-2 lg:col-span-3 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium mb-2">Discharge Line Status</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Velocity</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{calculations.dischargeVelocity.toFixed(2)} m/s</span>
                      {calculations.dischargeVelocityOk ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Limit</span>
                    <span className="font-mono">{calculations.dischargeVelLimit?.toFixed(1) || '4.0'} m/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ΔP</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{calculations.dischargeDpBarKm.toFixed(2)} bar/km</span>
                      {calculations.dischargeDpOk ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reynolds</span>
                    <span className="font-mono">{calculations.dischargeRe.toExponential(2)}</span>
                  </div>
                </div>
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
              <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                {Object.entries(fittingCategories).map(([category, fittings]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {fittings.map(({ key, name, K }) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs truncate">{name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">(K={K})</span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            value={suctionFittings[key] || 0}
                            onChange={(e) => updateSuctionFitting(key, parseInt(e.target.value) || 0)}
                            className="w-16 h-7 text-xs text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
              <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                {Object.entries(fittingCategories).map(([category, fittings]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {fittings.map(({ key, name, K }) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs truncate">{name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">(K={K})</span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            value={dischargeFittings[key] || 0}
                            onChange={(e) => updateDischargeFitting(key, parseInt(e.target.value) || 0)}
                            className="w-16 h-7 text-xs text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pump Type */}
                <div className="space-y-2 lg:col-span-2">
                  <Label>Pump Type (per API Standard)</Label>
                  <Select value={pumpType} onValueChange={setPumpType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem disabled value="header-api610" className="font-semibold text-primary">— API 610 Centrifugal —</SelectItem>
                      {Object.entries(pumpTypes).filter(([_, t]) => t.standard === 'API 610').map(([key, type]) => (
                        <SelectItem key={key} value={key} className="text-xs">{type.name}</SelectItem>
                      ))}
                      <SelectItem disabled value="header-api674" className="font-semibold text-primary">— API 674 Reciprocating —</SelectItem>
                      {Object.entries(pumpTypes).filter(([_, t]) => t.standard === 'API 674').map(([key, type]) => (
                        <SelectItem key={key} value={key} className="text-xs">{type.name}</SelectItem>
                      ))}
                      <SelectItem disabled value="header-api676" className="font-semibold text-primary">— API 676 Rotary —</SelectItem>
                      {Object.entries(pumpTypes).filter(([_, t]) => t.standard === 'API 676').map(([key, type]) => (
                        <SelectItem key={key} value={key} className="text-xs">{type.name}</SelectItem>
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
                        <p>Typical: {selectedPumpInfo?.typicalEfficiency[0]}-{selectedPumpInfo?.typicalEfficiency[1]}%</p>
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
              </div>

              {/* NPSH Margin */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="npshrMargin" className="flex items-center gap-1">
                    NPSHa-NPSHr Margin ({headDisplayUnit})
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Per API 610: Min margin = 1.0m or 15% NPSHr</p>
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
              </div>

              {/* Pump Type Info */}
              {selectedPumpInfo && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">{selectedPumpInfo.name}</p>
                    <Badge variant="outline">{selectedPumpInfo.standard}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedPumpInfo.characteristics.map((char, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{char}</Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground border-t pt-3">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">Head Range</span>
                      <span className="font-mono">{selectedPumpInfo.typicalHead[0]}-{selectedPumpInfo.typicalHead[1]} m</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">Flow Range</span>
                      <span className="font-mono">{selectedPumpInfo.typicalFlow[0]}-{selectedPumpInfo.typicalFlow[1]} m³/h</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide">Efficiency</span>
                      <span className="font-mono">{selectedPumpInfo.typicalEfficiency[0]}-{selectedPumpInfo.typicalEfficiency[1]}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pump Selection Guidance */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs font-medium mb-2">Pump Selection Guidance (Based on Operating Point)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Specific Speed (Ns)</span>
                    <span className="font-mono text-sm">{calculations.specificSpeed.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Suction Ns (Nss)</span>
                    <span className="font-mono text-sm">{calculations.suctionSpecificSpeed.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Recommended Type</span>
                    <span className="font-medium">
                      {calculations.specificSpeed < 30 ? 'Positive Displacement' :
                       calculations.specificSpeed < 80 ? 'Multistage Centrifugal' :
                       calculations.specificSpeed < 200 ? 'Single Stage Centrifugal' :
                       'Axial/Mixed Flow'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">NPSH Status</span>
                    <span className={`font-medium ${calculations.npshaOk ? 'text-green-600' : 'text-red-600'}`}>
                      {calculations.suctionSpecificSpeed > 11000 ? 'Critical - Review' : calculations.npshaOk ? 'Acceptable' : 'Insufficient'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pump Curves Tab */}
        <TabsContent value="curves">
          <PumpPerformanceCurves
            operatingFlow={calculations.flowRate_m3h}
            operatingHead={calculations.totalHead}
            operatingEfficiency={parseFloat(pumpEfficiency) || 75}
            operatingPower={calculations.brakePower_kW}
            npshr={parseFloat(npshrMargin) || 3}
            npsha={calculations.npshaValue}
            pumpType={selectedPumpInfo?.name || 'centrifugal'}
          />
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide">
          <PumpGuide />
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
                    {Object.keys({ ...metricHeadToMeters, ...imperialHeadToMeters }).map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={powerDisplayUnit} onValueChange={setPowerDisplayUnit}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys({ ...metricPowerToKW, ...imperialPowerToKW }).map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
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
              <h4 className="text-sm font-medium mb-3">Head Components Breakdown (per API 610)</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Static Head (Zd - Zs)</span>
                  <span className="font-mono">{convertHead(calculations.totalStaticHead).toFixed(2)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Suction Friction Loss (hfs)</span>
                  <span className="font-mono">{convertHead(calculations.suctionTotalLoss).toFixed(2)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discharge Friction Loss (hfd)</span>
                  <span className="font-mono">{convertHead(calculations.dischargeTotalLoss).toFixed(2)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pressure Head (Pd-Ps)/(ρg)</span>
                  <span className="font-mono">{convertHead(calculations.pressureHead).toFixed(2)} {headDisplayUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Velocity Head Diff (Vd²-Vs²)/(2g)</span>
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
              <span className="text-sm font-mono">
                {unitSystem === 'metric' ? `${calculations.flowRate_m3h.toFixed(1)} m³/h` : `${calculations.flowRate_gpm.toFixed(0)} gpm`}
              </span>
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
              <span className="text-sm font-mono">{convertPower(calculations.hydraulicPower_kW).toFixed(2)} {powerDisplayUnit}</span>
            </div>

            {/* Warnings */}
            <div className="pt-4 border-t space-y-2">
              {!calculations.suctionVelocityOk && (
                <div className="flex items-start gap-2 text-amber-600 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Suction velocity exceeds Eni limit ({calculations.suctionVelLimit?.toFixed(1) || '2.0'} m/s)</span>
                </div>
              )}
              {!calculations.dischargeVelocityOk && (
                <div className="flex items-start gap-2 text-amber-600 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Discharge velocity exceeds Eni limit ({calculations.dischargeVelLimit?.toFixed(1) || '4.0'} m/s)</span>
                </div>
              )}
              {!calculations.npshaOk && (
                <div className="flex items-start gap-2 text-red-600 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>NPSHa is low! Risk of cavitation. Increase suction head or reduce losses.</span>
                </div>
              )}
              {calculations.suctionSpecificSpeed > 11000 && (
                <div className="flex items-start gap-2 text-amber-600 text-xs">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>High Nss ({calculations.suctionSpecificSpeed.toFixed(0)}) - Review NPSH margin per API 610</span>
                </div>
              )}
              {calculations.isValid && calculations.npshaOk && calculations.suctionVelocityOk && calculations.dischargeVelocityOk && (
                <div className="flex items-start gap-2 text-green-600 text-xs">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>All parameters within acceptable limits</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PumpSizingCalculator;
