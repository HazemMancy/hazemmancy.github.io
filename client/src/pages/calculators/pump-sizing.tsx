import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import {
  calculatePumpSizing,
  calculatePDPumpSizing,
  PUMP_SIZING_TEST_CASE,
  PD_PUMP_TEST_CASE,
  type PumpSizingResult,
  type PDPumpSizingResult,
  type PumpType,
  type PumpCalcStep,
} from "@/lib/engineering/pumpSizing";
import { COMMON_LIQUIDS, FITTING_K_VALUES } from "@/lib/engineering/constants";

const FITTING_K_MAP: Record<string, number> = Object.fromEntries(
  FITTING_K_VALUES.map(f => [f.type, f.k])
);
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { exportToExcel, exportToPDF, exportToJSON } from "@/lib/engineering/exportUtils";
import {
  Droplets, FlaskConical, RotateCcw, X,
  ChevronLeft, ChevronRight, ClipboardList,
  Settings2, Calculator, CheckCircle2, Download,
  FileText, FileSpreadsheet, Waves,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PumpCurveChart } from "@/components/engineering/pump-curve-chart";
import { PDCurveChart } from "@/components/engineering/pd-curve-chart";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "fluid", label: "Fluid & Piping", icon: Droplets, step: 2 },
  { id: "config", label: "Pump Config", icon: Settings2, step: 3 },
  { id: "hydraulics", label: "Hydraulics", icon: Calculator, step: 4 },
  { id: "summary", label: "Summary", icon: CheckCircle2, step: 5 },
];

interface ProjectInfo {
  name: string;
  client: string;
  location: string;
  caseId: string;
  engineer: string;
  date: string;
}

const defaultProject: ProjectInfo = {
  name: "",
  client: "",
  location: "",
  caseId: "",
  engineer: "",
  date: new Date().toISOString().split("T")[0],
};

interface FormState {
  flowRate: string;
  liquidDensity: string;
  viscosity: string;
  suctionStaticHead: string;
  dischargeStaticHead: string;
  suctionPipeLength: string;
  dischargePipeLength: string;
  suctionPipeDiameter: string;
  dischargePipeDiameter: string;
  suctionRoughness: string;
  dischargeRoughness: string;
  suctionFittingsK: string;
  dischargeFittingsK: string;
  pumpEfficiency: string;
  motorEfficiency: string;
  vaporPressure: string;
  atmosphericPressure: string;
  suctionVesselPressure: string;
  volumetricEfficiency: string;
  mechanicalEfficiency: string;
  reliefValvePressure: string;
  dischargePressure: string;
}

const defaultForm: FormState = {
  flowRate: "",
  liquidDensity: "",
  viscosity: "",
  suctionStaticHead: "",
  dischargeStaticHead: "",
  suctionPipeLength: "",
  dischargePipeLength: "",
  suctionPipeDiameter: "",
  dischargePipeDiameter: "",
  suctionRoughness: "0.0457",
  dischargeRoughness: "0.0457",
  suctionFittingsK: "0",
  dischargeFittingsK: "0",
  pumpEfficiency: "75",
  motorEfficiency: "95",
  vaporPressure: "",
  atmosphericPressure: "1.01325",
  suctionVesselPressure: "0",
  volumetricEfficiency: "90",
  mechanicalEfficiency: "85",
  reliefValvePressure: "",
  dischargePressure: "",
};

const fieldUnitMap: FieldUnitMap = {
  flowRate: "flowLiquid",
  liquidDensity: null,
  viscosity: null,
  suctionStaticHead: "head",
  dischargeStaticHead: "head",
  suctionPipeLength: "length",
  dischargePipeLength: "length",
  suctionPipeDiameter: "diameter",
  dischargePipeDiameter: "diameter",
  suctionRoughness: null,
  dischargeRoughness: null,
  suctionFittingsK: null,
  dischargeFittingsK: null,
  pumpEfficiency: null,
  motorEfficiency: null,
  vaporPressure: "pressureKpa",
  atmosphericPressure: "pressureAbs",
  suctionVesselPressure: "pressure",
  volumetricEfficiency: null,
  mechanicalEfficiency: null,
  reliefValvePressure: "pressure",
  dischargePressure: "pressure",
};

interface FittingEntry {
  name: string;
  count: number;
}

function TraceStepCard({ step }: { step: PumpCalcStep }) {
  return (
    <div className="border rounded-md p-3 space-y-1.5 bg-muted/30" data-testid={`trace-step-${step.name.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="text-xs font-semibold">{step.name}</div>
      <div className="font-mono text-[11px] text-muted-foreground">{step.equation}</div>
      <div className="font-mono text-[11px]">{step.substitution}</div>
      <div className="font-mono text-[11px] font-bold text-primary">= {step.result}</div>
    </div>
  );
}

export default function PumpSizingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [activeTab, setActiveTab] = useState("project");
  const [pumpType, setPumpType] = useState<PumpType>("centrifugal");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [project, setProject] = useState<ProjectInfo>({ ...defaultProject });
  const [centrifugalResult, setCentrifugalResult] = useState<PumpSizingResult | null>(null);
  const [pdResult, setPdResult] = useState<PDPumpSizingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suctionFittings, setSuctionFittings] = useState<FittingEntry[]>([]);
  const [dischargeFittings, setDischargeFittings] = useState<FittingEntry[]>([]);

  const hasResult = !!(centrifugalResult || pdResult);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnitToggle = (newSystem: UnitSystem) => {
    const converted = convertFormValues(form, fieldUnitMap, unitSystem, newSystem);
    setForm(converted);
    setUnitSystem(newSystem);
  };

  const handlePumpTypeChange = (type: PumpType) => {
    setPumpType(type);
    setCentrifugalResult(null);
    setPdResult(null);
    setError(null);
  };

  const computeKTotal = (fittings: FittingEntry[]): number => {
    return fittings.reduce((sum, f) => {
      const kVal = FITTING_K_MAP[f.name] ?? 0;
      return sum + kVal * f.count;
    }, 0);
  };

  const addFitting = (side: "suction" | "discharge", name: string) => {
    const setter = side === "suction" ? setSuctionFittings : setDischargeFittings;
    const field = side === "suction" ? "suctionFittingsK" : "dischargeFittingsK";
    setter((prev) => {
      const existing = prev.find((f) => f.name === name);
      let updated: FittingEntry[];
      if (existing) {
        updated = prev.map((f) => f.name === name ? { ...f, count: f.count + 1 } : f);
      } else {
        updated = [...prev, { name, count: 1 }];
      }
      const total = computeKTotal(updated);
      updateField(field, total.toFixed(2));
      return updated;
    });
  };

  const removeFitting = (side: "suction" | "discharge", name: string) => {
    const setter = side === "suction" ? setSuctionFittings : setDischargeFittings;
    const field = side === "suction" ? "suctionFittingsK" : "dischargeFittingsK";
    setter((prev) => {
      const updated = prev.filter((f) => f.name !== name);
      const total = computeKTotal(updated);
      updateField(field, total.toFixed(2));
      return updated;
    });
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const pipingInput = {
        flowRate: convertToSI("flowLiquid", parseFloat(form.flowRate), unitSystem),
        liquidDensity: parseFloat(form.liquidDensity),
        viscosity: parseFloat(form.viscosity),
        suctionStaticHead: convertToSI("head", parseFloat(form.suctionStaticHead), unitSystem),
        dischargeStaticHead: convertToSI("head", parseFloat(form.dischargeStaticHead), unitSystem),
        suctionPipeLength: convertToSI("length", parseFloat(form.suctionPipeLength), unitSystem),
        dischargePipeLength: convertToSI("length", parseFloat(form.dischargePipeLength), unitSystem),
        suctionPipeDiameter: convertToSI("diameter", parseFloat(form.suctionPipeDiameter), unitSystem),
        dischargePipeDiameter: convertToSI("diameter", parseFloat(form.dischargePipeDiameter), unitSystem),
        suctionRoughness: parseFloat(form.suctionRoughness),
        dischargeRoughness: parseFloat(form.dischargeRoughness),
        suctionFittingsK: parseFloat(form.suctionFittingsK),
        dischargeFittingsK: parseFloat(form.dischargeFittingsK),
        vaporPressure: convertToSI("pressureKpa", parseFloat(form.vaporPressure), unitSystem),
        atmosphericPressure: convertToSI("pressureAbs", parseFloat(form.atmosphericPressure), unitSystem),
        suctionVesselPressure: convertToSI("pressure", parseFloat(form.suctionVesselPressure), unitSystem),
      };

      for (const [key, val] of Object.entries(pipingInput)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }

      if (pumpType === "centrifugal") {
        const input = {
          ...pipingInput,
          pumpEfficiency: parseFloat(form.pumpEfficiency),
          motorEfficiency: parseFloat(form.motorEfficiency),
        };
        if (isNaN(input.pumpEfficiency)) throw new Error("Invalid pump efficiency");
        if (isNaN(input.motorEfficiency)) throw new Error("Invalid motor efficiency");
        const res = calculatePumpSizing(input);
        setCentrifugalResult(res);
        setPdResult(null);
        setActiveTab("hydraulics");
      } else {
        const input = {
          ...pipingInput,
          volumetricEfficiency: parseFloat(form.volumetricEfficiency),
          mechanicalEfficiency: parseFloat(form.mechanicalEfficiency),
          motorEfficiency: parseFloat(form.motorEfficiency),
          reliefValvePressure: convertToSI("pressure", parseFloat(form.reliefValvePressure) || 0, unitSystem),
          dischargePressure: convertToSI("pressure", parseFloat(form.dischargePressure) || 0, unitSystem),
        };
        if (isNaN(input.volumetricEfficiency)) throw new Error("Invalid volumetric efficiency");
        if (isNaN(input.mechanicalEfficiency)) throw new Error("Invalid mechanical efficiency");
        if (isNaN(input.motorEfficiency)) throw new Error("Invalid motor efficiency");
        const res = calculatePDPumpSizing(input);
        setPdResult(res);
        setCentrifugalResult(null);
        setActiveTab("hydraulics");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setCentrifugalResult(null);
      setPdResult(null);
    }
  };

  const loadTestCase = () => {
    setError(null);
    setCentrifugalResult(null);
    setPdResult(null);
    setSuctionFittings([]);
    setDischargeFittings([]);
    setUnitSystem("SI");

    if (pumpType === "centrifugal") {
      const tc = PUMP_SIZING_TEST_CASE;
      setForm({
        ...defaultForm,
        flowRate: String(tc.flowRate),
        liquidDensity: String(tc.liquidDensity),
        viscosity: String(tc.viscosity),
        suctionStaticHead: String(tc.suctionStaticHead),
        dischargeStaticHead: String(tc.dischargeStaticHead),
        suctionPipeLength: String(tc.suctionPipeLength),
        dischargePipeLength: String(tc.dischargePipeLength),
        suctionPipeDiameter: String(tc.suctionPipeDiameter),
        dischargePipeDiameter: String(tc.dischargePipeDiameter),
        suctionRoughness: String(tc.suctionRoughness),
        dischargeRoughness: String(tc.dischargeRoughness),
        suctionFittingsK: String(tc.suctionFittingsK),
        dischargeFittingsK: String(tc.dischargeFittingsK),
        pumpEfficiency: String(tc.pumpEfficiency),
        motorEfficiency: String(tc.motorEfficiency),
        vaporPressure: String(tc.vaporPressure),
        atmosphericPressure: String(tc.atmosphericPressure),
        suctionVesselPressure: String(tc.suctionVesselPressure),
      });
    } else {
      const tc = PD_PUMP_TEST_CASE;
      setForm({
        ...defaultForm,
        flowRate: String(tc.flowRate),
        liquidDensity: String(tc.liquidDensity),
        viscosity: String(tc.viscosity),
        suctionStaticHead: String(tc.suctionStaticHead),
        dischargeStaticHead: String(tc.dischargeStaticHead),
        suctionPipeLength: String(tc.suctionPipeLength),
        dischargePipeLength: String(tc.dischargePipeLength),
        suctionPipeDiameter: String(tc.suctionPipeDiameter),
        dischargePipeDiameter: String(tc.dischargePipeDiameter),
        suctionRoughness: String(tc.suctionRoughness),
        dischargeRoughness: String(tc.dischargeRoughness),
        suctionFittingsK: String(tc.suctionFittingsK),
        dischargeFittingsK: String(tc.dischargeFittingsK),
        volumetricEfficiency: String(tc.volumetricEfficiency),
        mechanicalEfficiency: String(tc.mechanicalEfficiency),
        motorEfficiency: String(tc.motorEfficiency),
        vaporPressure: String(tc.vaporPressure),
        atmosphericPressure: String(tc.atmosphericPressure),
        suctionVesselPressure: String(tc.suctionVesselPressure),
        reliefValvePressure: String(tc.reliefValvePressure),
        dischargePressure: String(tc.dischargePressure),
      });
    }
    setActiveTab("fluid");
  };

  const handleReset = () => {
    setForm(defaultForm);
    setProject({ ...defaultProject });
    setSuctionFittings([]);
    setDischargeFittings([]);
    setCentrifugalResult(null);
    setPdResult(null);
    setError(null);
    setActiveTab("project");
  };

  const handleLiquidSelect = (liquidName: string) => {
    const liquid = COMMON_LIQUIDS[liquidName];
    if (liquid) {
      setForm((prev) => ({
        ...prev,
        liquidDensity: String(liquid.density),
        viscosity: String(liquid.viscosity),
        vaporPressure: String(liquid.vaporPressure ?? ""),
      }));
    }
  };

  const renderFittingsSection = (
    side: "suction" | "discharge",
    fittings: FittingEntry[],
    totalK: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Fittings (K total = {totalK})</Label>
        <Select onValueChange={(v) => addFitting(side, v)}>
          <SelectTrigger className="w-[180px]" data-testid={`select-${side}-fitting`}>
            <SelectValue placeholder="Add fitting..." />
          </SelectTrigger>
          <SelectContent>
            {FITTING_K_VALUES.map((f) => (
              <SelectItem key={f.type} value={f.type}>{f.type} (K={f.k})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {fittings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fittings.map((f) => (
            <Badge key={f.name} variant="secondary" className="text-xs gap-1">
              {f.count}x {f.name}
              <button
                onClick={() => removeFitting(side, f.name)}
                className="ml-0.5"
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  const buildCentrifugalExportData = (): ExportDatasheet | undefined => {
    if (!centrifugalResult) return undefined;
    const u = unitSystem;
    const r = centrifugalResult;
    return {
      calculatorName: "Pump Sizing Calculator \u2014 Centrifugal",
      chartElementId: "chart-pump-curve",
      projectInfo: [
        { label: "Project", value: project.name },
        { label: "Client", value: project.client },
        { label: "Location", value: project.location },
        { label: "Case / Tag", value: project.caseId },
        { label: "Engineer", value: project.engineer },
        { label: "Date", value: project.date },
      ],
      inputs: [
        { label: "Flow Rate", value: form.flowRate, unit: getUnit("flowLiquid", u) },
        { label: "Liquid Density", value: form.liquidDensity, unit: "kg/m\u00B3" },
        { label: "Viscosity", value: form.viscosity, unit: "cP" },
        { label: "Suction Static Head", value: form.suctionStaticHead, unit: getUnit("head", u) },
        { label: "Discharge Static Head", value: form.dischargeStaticHead, unit: getUnit("head", u) },
        { label: "Suction Pipe Length", value: form.suctionPipeLength, unit: getUnit("length", u) },
        { label: "Discharge Pipe Length", value: form.dischargePipeLength, unit: getUnit("length", u) },
        { label: "Suction Pipe Diameter", value: form.suctionPipeDiameter, unit: getUnit("diameter", u) },
        { label: "Discharge Pipe Diameter", value: form.dischargePipeDiameter, unit: getUnit("diameter", u) },
        { label: "Suction Roughness", value: form.suctionRoughness, unit: "mm" },
        { label: "Discharge Roughness", value: form.dischargeRoughness, unit: "mm" },
        { label: "Suction Fittings K", value: form.suctionFittingsK },
        { label: "Discharge Fittings K", value: form.dischargeFittingsK },
        { label: "Pump Efficiency", value: form.pumpEfficiency, unit: "%" },
        { label: "Motor Efficiency", value: form.motorEfficiency, unit: "%" },
        { label: "Vapor Pressure", value: form.vaporPressure, unit: getUnit("pressureKpa", u) },
        { label: "Atmospheric Pressure", value: form.atmosphericPressure, unit: getUnit("pressureAbs", u) },
        { label: "Suction Vessel Pressure", value: form.suctionVesselPressure, unit: getUnit("pressure", u) },
      ],
      results: [
        { label: "Total Dynamic Head (TDH)", value: convertFromSI("head", r.totalDynamicHead, u), unit: getUnit("head", u), highlight: true },
        { label: "Static Head", value: convertFromSI("head", r.staticHead, u), unit: getUnit("head", u) },
        { label: "Suction Friction Loss", value: convertFromSI("head", r.suctionFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Discharge Friction Loss", value: convertFromSI("head", r.dischargeFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Total Friction Loss", value: convertFromSI("head", r.totalFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Hydraulic Power", value: convertFromSI("power", r.hydraulicPower, u), unit: getUnit("power", u) },
        { label: "Brake Power (BHP)", value: convertFromSI("power", r.brakePower, u), unit: getUnit("power", u), highlight: true },
        { label: "Motor Power Required", value: convertFromSI("power", r.motorPower, u), unit: getUnit("power", u), highlight: true },
        { label: "Suction Velocity", value: convertFromSI("velocity", r.suctionVelocity, u), unit: getUnit("velocity", u) },
        { label: "Discharge Velocity", value: convertFromSI("velocity", r.dischargeVelocity, u), unit: getUnit("velocity", u) },
        { label: "Suction Reynolds", value: r.suctionReynolds, unit: "\u2014" },
        { label: "Discharge Reynolds", value: r.dischargeReynolds, unit: "\u2014" },
        { label: "NPSHa (Available)", value: convertFromSI("head", r.npshaAvailable, u), unit: getUnit("head", u), highlight: r.npshaAvailable < 3.0 },
        { label: "Suction f (Darcy)", value: r.suctionFrictionFactor, unit: "\u2014" },
        { label: "Discharge f (Darcy)", value: r.dischargeFrictionFactor, unit: "\u2014" },
      ],
      methodology: [
        "Darcy-Weisbach equation with Swamee-Jain friction factor approximation",
        "TDH = Static Head + Friction Loss (suction + discharge) + Velocity Head difference",
        "Hydraulic Power = \u03C1 * g * Q * TDH",
        "Brake Power = Hydraulic Power / Pump Efficiency",
        "Motor Power = Brake Power / Motor Efficiency",
        "NPSHa = P_atm + P_vessel + h_suction - hf_suction - P_vapor (all in head of liquid)",
      ],
      assumptions: [
        "Steady-state, incompressible liquid flow",
        "Centrifugal pump application",
        "Darcy-Weisbach equation with Swamee-Jain friction factor",
        "Minor losses calculated using resistance coefficient (K) method",
        "NPSHa calculated per HI/API standards",
        "Atmospheric pressure at sea level unless specified",
        "Suction vessel pressure is gauge pressure (0 = atmospheric)",
      ],
      references: [
        "Hydraulic Institute Standards (HI 1.3) \u2014 Centrifugal Pump Design",
        "API 610 \u2014 Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries",
        "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
        "Cameron Hydraulic Data, 20th Edition",
        "Perry's Chemical Engineers' Handbook, 9th Edition",
      ],
      warnings: r.warnings,
    };
  };

  const buildPDExportData = (): ExportDatasheet | undefined => {
    if (!pdResult) return undefined;
    const u = unitSystem;
    const r = pdResult;
    return {
      calculatorName: "Pump Sizing Calculator \u2014 Positive Displacement",
      chartElementId: "chart-pd-curve",
      projectInfo: [
        { label: "Project", value: project.name },
        { label: "Client", value: project.client },
        { label: "Location", value: project.location },
        { label: "Case / Tag", value: project.caseId },
        { label: "Engineer", value: project.engineer },
        { label: "Date", value: project.date },
      ],
      inputs: [
        { label: "Flow Rate", value: form.flowRate, unit: getUnit("flowLiquid", u) },
        { label: "Liquid Density", value: form.liquidDensity, unit: "kg/m\u00B3" },
        { label: "Viscosity", value: form.viscosity, unit: "cP" },
        { label: "Suction Static Head", value: form.suctionStaticHead, unit: getUnit("head", u) },
        { label: "Discharge Static Head", value: form.dischargeStaticHead, unit: getUnit("head", u) },
        { label: "Suction Pipe Length", value: form.suctionPipeLength, unit: getUnit("length", u) },
        { label: "Discharge Pipe Length", value: form.dischargePipeLength, unit: getUnit("length", u) },
        { label: "Suction Pipe Diameter", value: form.suctionPipeDiameter, unit: getUnit("diameter", u) },
        { label: "Discharge Pipe Diameter", value: form.dischargePipeDiameter, unit: getUnit("diameter", u) },
        { label: "Suction Roughness", value: form.suctionRoughness, unit: "mm" },
        { label: "Discharge Roughness", value: form.dischargeRoughness, unit: "mm" },
        { label: "Suction Fittings K", value: form.suctionFittingsK },
        { label: "Discharge Fittings K", value: form.dischargeFittingsK },
        { label: "Volumetric Efficiency", value: form.volumetricEfficiency, unit: "%" },
        { label: "Mechanical Efficiency", value: form.mechanicalEfficiency, unit: "%" },
        { label: "Motor Efficiency", value: form.motorEfficiency, unit: "%" },
        { label: "Discharge Pressure", value: form.dischargePressure, unit: getUnit("pressure", u) },
        { label: "Relief Valve Set Pressure", value: form.reliefValvePressure, unit: getUnit("pressure", u) },
        { label: "Vapor Pressure", value: form.vaporPressure, unit: getUnit("pressureKpa", u) },
        { label: "Atmospheric Pressure", value: form.atmosphericPressure, unit: getUnit("pressureAbs", u) },
        { label: "Suction Vessel Pressure", value: form.suctionVesselPressure, unit: getUnit("pressure", u) },
      ],
      results: [
        { label: "Differential Pressure", value: convertFromSI("pressure", r.differentialPressure, u), unit: getUnit("pressure", u), highlight: true },
        { label: "Total Dynamic Head", value: convertFromSI("head", r.totalDynamicHead, u), unit: getUnit("head", u) },
        { label: "Static Head", value: convertFromSI("head", r.staticHead, u), unit: getUnit("head", u) },
        { label: "Total Friction Loss", value: convertFromSI("head", r.totalFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Actual Flow (Delivered)", value: convertFromSI("flowLiquid", r.actualFlow, u), unit: getUnit("flowLiquid", u) },
        { label: "Theoretical Flow (Displaced)", value: convertFromSI("flowLiquid", r.theoreticalFlow, u), unit: getUnit("flowLiquid", u) },
        { label: "Slip (Internal Leakage)", value: convertFromSI("flowLiquid", r.slip, u), unit: getUnit("flowLiquid", u) },
        { label: "Hydraulic Power", value: convertFromSI("power", r.hydraulicPower, u), unit: getUnit("power", u) },
        { label: "Shaft Power", value: convertFromSI("power", r.shaftPower, u), unit: getUnit("power", u), highlight: true },
        { label: "Motor Power Required", value: convertFromSI("power", r.motorPower, u), unit: getUnit("power", u), highlight: true },
        { label: "NPSHa (Available)", value: convertFromSI("head", r.npshaAvailable, u), unit: getUnit("head", u), highlight: r.npshaAvailable < 3.0 },
        { label: "NPIPa (Available)", value: r.npipAvailable, unit: "kPa", highlight: r.npipAvailable < 30 },
        { label: "Suction Velocity", value: convertFromSI("velocity", r.suctionVelocity, u), unit: getUnit("velocity", u) },
        { label: "Discharge Velocity", value: convertFromSI("velocity", r.dischargeVelocity, u), unit: getUnit("velocity", u) },
        { label: "Relief Valve Set Pressure", value: r.reliefValvePressure > 0 ? convertFromSI("pressure", r.reliefValvePressure, u) : 0, unit: r.reliefValvePressure > 0 ? getUnit("pressure", u) : "Not set" },
      ],
      methodology: [
        "Darcy-Weisbach equation with Swamee-Jain friction factor approximation",
        "Theoretical flow = Required flow / Volumetric Efficiency",
        "Slip = Theoretical flow - Actual delivered flow",
        "Hydraulic Power = \u0394P * Q (actual flow)",
        "Shaft Power = Hydraulic Power / Mechanical Efficiency",
        "Motor Power = Shaft Power / Motor Efficiency",
        "NPIPa = NPSHa * \u03C1 * g (per API 676 for rotary PD pumps)",
      ],
      assumptions: [
        "Steady-state, incompressible liquid flow",
        "Positive displacement pump (reciprocating, gear, screw, or diaphragm)",
        "Required flow is the actual delivered flow; theoretical flow = required flow / volumetric efficiency",
        "Slip = Theoretical flow \u2212 Actual delivered flow (internal leakage increases with \u0394P)",
        "Shaft power = Hydraulic power / Mechanical efficiency",
        "Motor power = Shaft power / Motor efficiency (user-specified)",
        "Discharge pressure input is the total differential pressure across the pump",
        "NPSHa per HI/API standards; NPIPa = NPSHa \u00d7 \u03c1 \u00d7 g (per API 676)",
        "Relief valve is mandatory for overpressure protection",
      ],
      references: [
        "API 674 \u2014 Positive Displacement Pumps \u2014 Reciprocating",
        "API 676 \u2014 Positive Displacement Pumps \u2014 Rotary",
        "API 675 \u2014 Positive Displacement Pumps \u2014 Controlled Volume (Metering)",
        "Hydraulic Institute Standards (HI 3.1-3.5) \u2014 Rotary Pump Standards",
        "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
        "Karassik et al. \u2014 Pump Handbook, 4th Edition",
      ],
      warnings: r.warnings,
    };
  };

  const hydraulicsGated = !hasResult;
  const summaryGated = !hasResult;
  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => {
    if (tabIdx >= TABS.length - 1) return;
    const nextTab = TABS[tabIdx + 1].id;
    if ((nextTab === "hydraulics" && hydraulicsGated) || (nextTab === "summary" && summaryGated)) return;
    setActiveTab(nextTab);
  };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  const currentTrace = centrifugalResult?.trace || pdResult?.trace;
  const currentWarnings = centrifugalResult?.warnings || pdResult?.warnings || [];

  const getExportData = () => pumpType === "centrifugal" ? buildCentrifugalExportData() : buildPDExportData();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Waves className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">Pump Sizing Calculator</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {pumpType === "centrifugal" ? "Centrifugal" : "Positive Displacement"} pump hydraulics &mdash; 5-step wizard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
            <FlaskConical className="w-3.5 h-3.5 mr-1" />Test Case
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-pump">
        <div className="overflow-x-auto -mx-4 px-4 mb-4 md:mb-6">
          <TabsList className="inline-flex w-max min-w-full md:w-full md:min-w-0 h-auto p-1">
            {TABS.map(t => {
              const gated = (t.id === "hydraulics" || t.id === "summary") && !hasResult;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  disabled={gated}
                  className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs px-2 md:px-3 py-1.5 whitespace-nowrap"
                  data-testid={`tab-${t.id}`}
                >
                  <t.icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.step}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="text-xs text-muted-foreground mb-4" data-testid="text-step-indicator">
          Step {tabIdx + 1} of {TABS.length} &mdash; {TABS[tabIdx]?.label}
        </div>

        {/* TAB 1: PROJECT */}
        <TabsContent value="project">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Project Setup</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Project Name</Label>
                  <Input value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} data-testid="input-project-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Client</Label>
                  <Input value={project.client} onChange={e => setProject(p => ({ ...p, client: e.target.value }))} data-testid="input-client" /></div>
                <div><Label className="text-xs mb-1.5 block">Location</Label>
                  <Input value={project.location} onChange={e => setProject(p => ({ ...p, location: e.target.value }))} data-testid="input-location" /></div>
                <div><Label className="text-xs mb-1.5 block">Case ID / Pump Tag</Label>
                  <Input value={project.caseId} onChange={e => setProject(p => ({ ...p, caseId: e.target.value }))} data-testid="input-case-id" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => setProject(p => ({ ...p, engineer: e.target.value }))} data-testid="input-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => setProject(p => ({ ...p, date: e.target.value }))} data-testid="input-date" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: FLUID & PIPING */}
        <TabsContent value="fluid">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Liquid Properties</h3>
                <p className="text-xs text-muted-foreground">Select a common liquid or enter custom properties</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">Common Liquid</Label>
                    <Select onValueChange={handleLiquidSelect}>
                      <SelectTrigger data-testid="select-liquid">
                        <SelectValue placeholder="Select a liquid..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(COMMON_LIQUIDS).map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Flow Rate ({getUnit("flowLiquid", unitSystem)})</Label>
                    <Input type="number" value={form.flowRate} onChange={(e) => updateField("flowRate", e.target.value)} placeholder="e.g. 150" data-testid="input-flow" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Liquid Density (kg/m\u00B3)</Label>
                    <Input type="number" value={form.liquidDensity} onChange={(e) => updateField("liquidDensity", e.target.value)} placeholder="e.g. 998.2" data-testid="input-density" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                    <Input type="number" value={form.viscosity} onChange={(e) => updateField("viscosity", e.target.value)} placeholder="e.g. 1.0" data-testid="input-viscosity" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Vapor Pressure ({getUnit("pressureKpa", unitSystem)})</Label>
                    <Input type="number" value={form.vaporPressure} onChange={(e) => updateField("vaporPressure", e.target.value)} placeholder="e.g. 2.338" data-testid="input-vapor-pressure" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Suction Piping</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">Suction Static Head ({getUnit("head", unitSystem)})</Label>
                    <Input type="number" value={form.suctionStaticHead} onChange={(e) => updateField("suctionStaticHead", e.target.value)} placeholder="e.g. 3" data-testid="input-suction-head" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Suction Pipe Length ({getUnit("length", unitSystem)})</Label>
                    <Input type="number" value={form.suctionPipeLength} onChange={(e) => updateField("suctionPipeLength", e.target.value)} placeholder="e.g. 5" data-testid="input-suction-length" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Suction Pipe Diameter ({getUnit("diameter", unitSystem)})</Label>
                    <PipeSizeSelector innerDiameter={form.suctionPipeDiameter} onDiameterChange={(v: string) => updateField("suctionPipeDiameter", v)} unitSystem={unitSystem} testIdPrefix="suction" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Suction Roughness (mm)</Label>
                    <Input type="number" value={form.suctionRoughness} onChange={(e) => updateField("suctionRoughness", e.target.value)} data-testid="input-suction-roughness" />
                  </div>
                </div>
                {renderFittingsSection("suction", suctionFittings, form.suctionFittingsK)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Discharge Piping</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">Discharge Static Head ({getUnit("head", unitSystem)})</Label>
                    <Input type="number" value={form.dischargeStaticHead} onChange={(e) => updateField("dischargeStaticHead", e.target.value)} placeholder="e.g. 30" data-testid="input-discharge-head" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Discharge Pipe Length ({getUnit("length", unitSystem)})</Label>
                    <Input type="number" value={form.dischargePipeLength} onChange={(e) => updateField("dischargePipeLength", e.target.value)} placeholder="e.g. 150" data-testid="input-discharge-length" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Discharge Pipe Diameter ({getUnit("diameter", unitSystem)})</Label>
                    <PipeSizeSelector innerDiameter={form.dischargePipeDiameter} onDiameterChange={(v: string) => updateField("dischargePipeDiameter", v)} unitSystem={unitSystem} testIdPrefix="discharge" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Discharge Roughness (mm)</Label>
                    <Input type="number" value={form.dischargeRoughness} onChange={(e) => updateField("dischargeRoughness", e.target.value)} data-testid="input-discharge-roughness" />
                  </div>
                </div>
                {renderFittingsSection("discharge", dischargeFittings, form.dischargeFittingsK)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: PUMP CONFIG */}
        <TabsContent value="config">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Pump Type</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Type</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={pumpType === "centrifugal" ? "default" : "outline"}
                      onClick={() => handlePumpTypeChange("centrifugal")}
                      data-testid="button-type-centrifugal"
                    >
                      Centrifugal
                    </Button>
                    <Button
                      size="sm"
                      variant={pumpType === "positive_displacement" ? "default" : "outline"}
                      onClick={() => handlePumpTypeChange("positive_displacement")}
                      data-testid="button-type-pd"
                    >
                      Positive Displacement
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Efficiencies & Conditions</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  {pumpType === "centrifugal" ? (
                    <>
                      <div>
                        <Label className="text-xs mb-1.5 block">Pump Efficiency (%)</Label>
                        <Input type="number" value={form.pumpEfficiency} onChange={(e) => updateField("pumpEfficiency", e.target.value)} placeholder="e.g. 75" data-testid="input-pump-eff" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Motor Efficiency (%)</Label>
                        <Input type="number" value={form.motorEfficiency} onChange={(e) => updateField("motorEfficiency", e.target.value)} placeholder="e.g. 95" data-testid="input-motor-eff" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs mb-1.5 block">Volumetric Efficiency (%)</Label>
                        <Input type="number" value={form.volumetricEfficiency} onChange={(e) => updateField("volumetricEfficiency", e.target.value)} placeholder="e.g. 90" data-testid="input-vol-eff" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Mechanical Efficiency (%)</Label>
                        <Input type="number" value={form.mechanicalEfficiency} onChange={(e) => updateField("mechanicalEfficiency", e.target.value)} placeholder="e.g. 85" data-testid="input-mech-eff" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Motor Efficiency (%)</Label>
                        <Input type="number" value={form.motorEfficiency} onChange={(e) => updateField("motorEfficiency", e.target.value)} placeholder="e.g. 95" data-testid="input-motor-eff" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Discharge Pressure ({getUnit("pressure", unitSystem)})</Label>
                        <Input type="number" value={form.dischargePressure} onChange={(e) => updateField("dischargePressure", e.target.value)} placeholder="0 = from TDH" data-testid="input-discharge-pressure" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Relief Valve Pressure ({getUnit("pressure", unitSystem)})</Label>
                        <Input type="number" value={form.reliefValvePressure} onChange={(e) => updateField("reliefValvePressure", e.target.value)} placeholder="e.g. 15" data-testid="input-relief-pressure" />
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-xs mb-1.5 block">Atmospheric Pressure ({getUnit("pressureAbs", unitSystem)})</Label>
                    <Input type="number" value={form.atmosphericPressure} onChange={(e) => updateField("atmosphericPressure", e.target.value)} data-testid="input-atm-pressure" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Suction Vessel Pressure ({getUnit("pressure", unitSystem)})</Label>
                    <Input type="number" value={form.suctionVesselPressure} onChange={(e) => updateField("suctionVesselPressure", e.target.value)} placeholder="0 = atmospheric" data-testid="input-vessel-pressure" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
              Calculate Pump Sizing
            </Button>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                {error}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 4: HYDRAULICS */}
        <TabsContent value="hydraulics">
          <div className="space-y-4">
            {!hasResult && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Droplets className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Complete Pump Config and click Calculate to see hydraulics</p>
                </CardContent>
              </Card>
            )}

            {hasResult && (
              <>
                <WarningPanel warnings={currentWarnings} />

                {pumpType === "centrifugal" && centrifugalResult && (
                  <Card>
                    <CardHeader className="pb-3">
                      <h3 className="font-semibold text-sm">Key Results</h3>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="p-3 border rounded-md text-center" data-testid="text-tdh">
                          <div className="text-xs text-muted-foreground">TDH</div>
                          <div className="text-lg font-bold">{convertFromSI("head", centrifugalResult.totalDynamicHead, unitSystem).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">{getUnit("head", unitSystem)}</div>
                        </div>
                        <div className="p-3 border rounded-md text-center" data-testid="text-bhp">
                          <div className="text-xs text-muted-foreground">Brake Power</div>
                          <div className="text-lg font-bold">{convertFromSI("power", centrifugalResult.brakePower, unitSystem).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">{getUnit("power", unitSystem)}</div>
                        </div>
                        <div className="p-3 border rounded-md text-center" data-testid="text-npsha">
                          <div className="text-xs text-muted-foreground">NPSHa</div>
                          <div className={`text-lg font-bold ${centrifugalResult.npshaAvailable < 3 ? "text-destructive" : ""}`}>{convertFromSI("head", centrifugalResult.npshaAvailable, unitSystem).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">{getUnit("head", unitSystem)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {pumpType === "positive_displacement" && pdResult && (
                  <Card>
                    <CardHeader className="pb-3">
                      <h3 className="font-semibold text-sm">Key Results</h3>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="p-3 border rounded-md text-center" data-testid="text-dp">
                          <div className="text-xs text-muted-foreground">Diff. Pressure</div>
                          <div className="text-lg font-bold">{convertFromSI("pressure", pdResult.differentialPressure, unitSystem).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">{getUnit("pressure", unitSystem)}</div>
                        </div>
                        <div className="p-3 border rounded-md text-center" data-testid="text-shaft-power">
                          <div className="text-xs text-muted-foreground">Shaft Power</div>
                          <div className="text-lg font-bold">{convertFromSI("power", pdResult.shaftPower, unitSystem).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">{getUnit("power", unitSystem)}</div>
                        </div>
                        <div className="p-3 border rounded-md text-center" data-testid="text-npsha-pd">
                          <div className="text-xs text-muted-foreground">NPSHa</div>
                          <div className={`text-lg font-bold ${pdResult.npshaAvailable < 3 ? "text-destructive" : ""}`}>{convertFromSI("head", pdResult.npshaAvailable, unitSystem).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">{getUnit("head", unitSystem)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentTrace && (
                  <Card>
                    <CardHeader className="pb-3">
                      <h3 className="font-semibold text-sm">Calculation Trace</h3>
                      <p className="text-xs text-muted-foreground">Step-by-step equation display with numeric substitutions</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {currentTrace.steps.map((step, i) => (
                          <TraceStepCard key={i} step={step} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* TAB 5: SUMMARY */}
        <TabsContent value="summary">
          <div className="space-y-4">
            {!hasResult && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Droplets className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Complete Pump Config and click Calculate to see summary</p>
                </CardContent>
              </Card>
            )}

            {hasResult && (
              <>
                <WarningPanel warnings={currentWarnings} />

                {pumpType === "centrifugal" && centrifugalResult && (
                  <>
                    <ResultsPanel
                      title="Head & Friction"
                      results={[
                        { label: "Total Dynamic Head (TDH)", value: convertFromSI("head", centrifugalResult.totalDynamicHead, unitSystem), unit: getUnit("head", unitSystem), highlight: true },
                        { label: "Static Head", value: convertFromSI("head", centrifugalResult.staticHead, unitSystem), unit: getUnit("head", unitSystem) },
                        { label: "Suction Friction Loss", value: convertFromSI("head", centrifugalResult.suctionFrictionLoss, unitSystem), unit: getUnit("head", unitSystem) },
                        { label: "Discharge Friction Loss", value: convertFromSI("head", centrifugalResult.dischargeFrictionLoss, unitSystem), unit: getUnit("head", unitSystem) },
                        { label: "Total Friction Loss", value: convertFromSI("head", centrifugalResult.totalFrictionLoss, unitSystem), unit: getUnit("head", unitSystem) },
                      ]}
                      rawData={centrifugalResult}
                      exportData={buildCentrifugalExportData()}
                    />
                    <ResultsPanel
                      title="Power"
                      results={[
                        { label: "Hydraulic Power", value: convertFromSI("power", centrifugalResult.hydraulicPower, unitSystem), unit: getUnit("power", unitSystem) },
                        { label: "Brake Power (BHP)", value: convertFromSI("power", centrifugalResult.brakePower, unitSystem), unit: getUnit("power", unitSystem), highlight: true },
                        { label: "Motor Power Required", value: convertFromSI("power", centrifugalResult.motorPower, unitSystem), unit: getUnit("power", unitSystem), highlight: true },
                      ]}
                      rawData={centrifugalResult}
                      exportData={buildCentrifugalExportData()}
                    />
                    <ResultsPanel
                      title="NPSH & Velocities"
                      results={[
                        { label: "NPSHa (Available)", value: convertFromSI("head", centrifugalResult.npshaAvailable, unitSystem), unit: getUnit("head", unitSystem), highlight: centrifugalResult.npshaAvailable < 3.0 },
                        { label: "Suction Velocity", value: convertFromSI("velocity", centrifugalResult.suctionVelocity, unitSystem), unit: getUnit("velocity", unitSystem) },
                        { label: "Discharge Velocity", value: convertFromSI("velocity", centrifugalResult.dischargeVelocity, unitSystem), unit: getUnit("velocity", unitSystem) },
                        { label: "Suction Reynolds", value: centrifugalResult.suctionReynolds, unit: "\u2014" },
                        { label: "Discharge Reynolds", value: centrifugalResult.dischargeReynolds, unit: "\u2014" },
                        { label: "Suction f (Darcy)", value: centrifugalResult.suctionFrictionFactor, unit: "\u2014" },
                        { label: "Discharge f (Darcy)", value: centrifugalResult.dischargeFrictionFactor, unit: "\u2014" },
                      ]}
                      rawData={centrifugalResult}
                      exportData={buildCentrifugalExportData()}
                    />
                    <PumpCurveChart
                      designFlowSI={convertToSI("flowLiquid", parseFloat(form.flowRate) || 0, unitSystem)}
                      tdhSI={centrifugalResult.totalDynamicHead}
                      staticHeadSI={centrifugalResult.staticHead}
                      brakePowerSI={centrifugalResult.brakePower}
                      pumpEfficiency={parseFloat(form.pumpEfficiency) || 75}
                      liquidDensity={parseFloat(form.liquidDensity) || 998}
                      flowUnit={getUnit("flowLiquid", unitSystem)}
                      headUnit={getUnit("head", unitSystem)}
                      powerUnit={getUnit("power", unitSystem)}
                      convertFlow={(si) => convertFromSI("flowLiquid", si, unitSystem)}
                      convertHead={(si) => convertFromSI("head", si, unitSystem)}
                      convertPower={(si) => convertFromSI("power", si, unitSystem)}
                    />
                  </>
                )}

                {pumpType === "positive_displacement" && pdResult && (
                  <>
                    <ResultsPanel
                      title="Pressure & Flow"
                      results={[
                        { label: "Differential Pressure", value: convertFromSI("pressure", pdResult.differentialPressure, unitSystem), unit: getUnit("pressure", unitSystem), highlight: true },
                        { label: "Total Dynamic Head", value: convertFromSI("head", pdResult.totalDynamicHead, unitSystem), unit: getUnit("head", unitSystem) },
                        { label: "Static Head", value: convertFromSI("head", pdResult.staticHead, unitSystem), unit: getUnit("head", unitSystem) },
                        { label: "Total Friction Loss", value: convertFromSI("head", pdResult.totalFrictionLoss, unitSystem), unit: getUnit("head", unitSystem) },
                        { label: "Actual Flow (Delivered)", value: convertFromSI("flowLiquid", pdResult.actualFlow, unitSystem), unit: getUnit("flowLiquid", unitSystem) },
                        { label: "Theoretical Flow (Displaced)", value: convertFromSI("flowLiquid", pdResult.theoreticalFlow, unitSystem), unit: getUnit("flowLiquid", unitSystem) },
                        { label: "Slip (Internal Leakage)", value: convertFromSI("flowLiquid", pdResult.slip, unitSystem), unit: getUnit("flowLiquid", unitSystem) },
                      ]}
                      rawData={pdResult}
                      exportData={buildPDExportData()}
                    />
                    <ResultsPanel
                      title="Power Requirements"
                      results={[
                        { label: "Hydraulic Power", value: convertFromSI("power", pdResult.hydraulicPower, unitSystem), unit: getUnit("power", unitSystem) },
                        { label: "Shaft Power", value: convertFromSI("power", pdResult.shaftPower, unitSystem), unit: getUnit("power", unitSystem), highlight: true },
                        { label: "Motor Power Required", value: convertFromSI("power", pdResult.motorPower, unitSystem), unit: getUnit("power", unitSystem), highlight: true },
                      ]}
                      rawData={pdResult}
                      exportData={buildPDExportData()}
                    />
                    <ResultsPanel
                      title="NPSH / NPIP & Velocities"
                      results={[
                        { label: "NPSHa (Available)", value: convertFromSI("head", pdResult.npshaAvailable, unitSystem), unit: getUnit("head", unitSystem), highlight: pdResult.npshaAvailable < 3.0 },
                        { label: "NPIPa (Available)", value: pdResult.npipAvailable, unit: "kPa", highlight: pdResult.npipAvailable < 30 },
                        { label: "Suction Velocity", value: convertFromSI("velocity", pdResult.suctionVelocity, unitSystem), unit: getUnit("velocity", unitSystem) },
                        { label: "Discharge Velocity", value: convertFromSI("velocity", pdResult.dischargeVelocity, unitSystem), unit: getUnit("velocity", unitSystem) },
                        { label: "Suction Reynolds", value: pdResult.suctionReynolds, unit: "\u2014" },
                        { label: "Discharge Reynolds", value: pdResult.dischargeReynolds, unit: "\u2014" },
                      ]}
                      rawData={pdResult}
                      exportData={buildPDExportData()}
                    />
                    <ResultsPanel
                      title="Safety & Protection"
                      results={[
                        {
                          label: "Relief Valve Set Pressure",
                          value: pdResult.reliefValvePressure > 0 ? convertFromSI("pressure", pdResult.reliefValvePressure, unitSystem) : 0,
                          unit: pdResult.reliefValvePressure > 0 ? getUnit("pressure", unitSystem) : "Not set",
                          highlight: pdResult.reliefValvePressure <= 0,
                        },
                        {
                          label: "Required Discharge Pressure",
                          value: pdResult.dischargePressure > 0 ? convertFromSI("pressure", pdResult.dischargePressure, unitSystem) : 0,
                          unit: pdResult.dischargePressure > 0 ? getUnit("pressure", unitSystem) : "From TDH",
                        },
                      ]}
                      rawData={pdResult}
                      exportData={buildPDExportData()}
                    />
                    <PDCurveChart
                      designFlowSI={pdResult.actualFlow}
                      differentialPressureBar={pdResult.differentialPressure}
                      shaftPowerSI={pdResult.shaftPower}
                      volumetricEfficiency={pdResult.volumetricEfficiency}
                      mechanicalEfficiency={pdResult.mechanicalEfficiency}
                      liquidDensity={pdResult.liquidDensity}
                      flowUnit={getUnit("flowLiquid", unitSystem)}
                      pressureUnit={getUnit("pressure", unitSystem)}
                      powerUnit={getUnit("power", unitSystem)}
                      convertFlow={(si) => convertFromSI("flowLiquid", si, unitSystem)}
                      convertPressure={(si) => convertFromSI("pressure", si, unitSystem)}
                      convertPower={(si) => convertFromSI("power", si, unitSystem)}
                    />
                  </>
                )}

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" data-testid="button-export">
                        <Download className="w-4 h-4 mr-1.5" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { const d = getExportData(); if (d) exportToPDF(d); }} data-testid="button-export-pdf">
                        <FileText className="w-4 h-4 mr-2" />PDF Datasheet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const d = getExportData(); if (d) exportToExcel(d); }} data-testid="button-export-excel">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />Excel Workbook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const d = getExportData(); if (d) exportToJSON(d); }} data-testid="button-export-json">
                        <Download className="w-4 h-4 mr-2" />JSON Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {pumpType === "centrifugal" ? (
                  <AssumptionsPanel
                    assumptions={[
                      "Steady-state, incompressible liquid flow",
                      "Centrifugal pump application",
                      "Darcy-Weisbach equation with Swamee-Jain friction factor",
                      "Minor losses calculated using resistance coefficient (K) method",
                      "NPSHa calculated per HI/API standards",
                      "Atmospheric pressure at sea level unless specified",
                      "Suction vessel pressure is gauge pressure (0 = atmospheric)",
                    ]}
                    references={[
                      "Hydraulic Institute Standards (HI 1.3) \u2014 Centrifugal Pump Design",
                      "API 610 \u2014 Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries",
                      "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
                      "Cameron Hydraulic Data, 20th Edition",
                      "Perry's Chemical Engineers' Handbook, 9th Edition",
                    ]}
                  />
                ) : (
                  <AssumptionsPanel
                    assumptions={[
                      "Steady-state, incompressible liquid flow",
                      "Positive displacement pump (reciprocating, gear, screw, or diaphragm)",
                      "Required flow is the actual delivered flow; theoretical flow = required flow / volumetric efficiency",
                      "Slip = Theoretical flow \u2212 Actual delivered flow (internal leakage increases with \u0394P)",
                      "Shaft power = Hydraulic power / Mechanical efficiency",
                      "Motor power = Shaft power / Motor efficiency (user-specified)",
                      "Discharge pressure input is the total differential pressure across the pump",
                      "NPSHa calculated per HI/API standards; NPIPa = NPSHa \u00d7 \u03c1 \u00d7 g (per API 676 for rotary PD pumps)",
                      "Relief valve is mandatory for overpressure protection",
                      "Performance curves show flow/slip/power variation with differential pressure per API 674/676",
                      "Darcy-Weisbach equation for piping friction losses",
                      "Atmospheric pressure at sea level unless specified",
                    ]}
                    references={[
                      "API 674 \u2014 Positive Displacement Pumps \u2014 Reciprocating",
                      "API 676 \u2014 Positive Displacement Pumps \u2014 Rotary",
                      "API 675 \u2014 Positive Displacement Pumps \u2014 Controlled Volume (Metering)",
                      "Hydraulic Institute Standards (HI 3.1-3.5) \u2014 Rotary Pump Standards",
                      "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
                      "Karassik et al. \u2014 Pump Handbook, 4th Edition",
                    ]}
                  />
                )}

                <FeedbackSection calculatorName="Pump Sizing" />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between mt-6 gap-2">
        <Button variant="outline" onClick={goPrev} disabled={tabIdx === 0} data-testid="button-prev">
          <ChevronLeft className="w-4 h-4 mr-1" />Previous
        </Button>
        <Button variant="outline" onClick={goNext} disabled={tabIdx === TABS.length - 1 || ((activeTab === "hydraulics" || activeTab === "summary") && !hasResult)} data-testid="button-next">
          Next<ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
