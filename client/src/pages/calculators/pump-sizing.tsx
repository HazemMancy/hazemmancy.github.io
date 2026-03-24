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
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
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
import { centrifugalPumpSchema, pdPumpSchema } from "@/lib/engineering/validation";

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
  pumpSpeed: string;
  vaporPressure: string;
  atmosphericPressure: string;
  suctionVesselPressure: string;
  dischargeVesselPressure: string;
  volumetricEfficiency: string;
  mechanicalEfficiency: string;
  reliefValvePressure: string;
  pumpDifferentialPressure: string;
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
  pumpSpeed: "",
  vaporPressure: "",
  atmosphericPressure: "1.01325",
  suctionVesselPressure: "0",
  dischargeVesselPressure: "0",
  volumetricEfficiency: "90",
  mechanicalEfficiency: "85",
  reliefValvePressure: "",
  pumpDifferentialPressure: "",
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
  pumpSpeed: null,
  vaporPressure: "pressureKpa",
  atmosphericPressure: "pressureAbs",
  suctionVesselPressure: "pressureGauge",
  dischargeVesselPressure: "pressureGauge",
  volumetricEfficiency: null,
  mechanicalEfficiency: null,
  reliefValvePressure: "pressureGauge",
  pumpDifferentialPressure: "pressure",
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
      const pipingBase = {
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
        suctionVesselPressure: convertToSI("pressureGauge", parseFloat(form.suctionVesselPressure) || 0, unitSystem),
        dischargeVesselPressure: convertToSI("pressureGauge", parseFloat(form.dischargeVesselPressure) || 0, unitSystem),
      };

      if (pumpType === "centrifugal") {
        const speedVal = parseFloat(form.pumpSpeed);
        const rawInput = {
          ...pipingBase,
          pumpEfficiency: parseFloat(form.pumpEfficiency),
          motorEfficiency: parseFloat(form.motorEfficiency),
          pumpSpeed: !isNaN(speedVal) && speedVal > 0 ? speedVal : undefined,
        };
        const parsed = centrifugalPumpSchema.safeParse(rawInput);
        if (!parsed.success) {
          const msg = parsed.error.errors[0]?.message || "Invalid input";
          throw new Error(msg);
        }
        const res = calculatePumpSizing(parsed.data);
        setCentrifugalResult(res);
        setPdResult(null);
        setActiveTab("summary");
      } else {
        const rawInput = {
          ...pipingBase,
          volumetricEfficiency: parseFloat(form.volumetricEfficiency),
          mechanicalEfficiency: parseFloat(form.mechanicalEfficiency),
          motorEfficiency: parseFloat(form.motorEfficiency),
          reliefValvePressure: convertToSI("pressureGauge", parseFloat(form.reliefValvePressure) || 0, unitSystem),
          pumpDifferentialPressure: convertToSI("pressure", parseFloat(form.pumpDifferentialPressure) || 0, unitSystem),
        };
        const parsed = pdPumpSchema.safeParse(rawInput);
        if (!parsed.success) {
          const msg = parsed.error.errors[0]?.message || "Invalid input";
          throw new Error(msg);
        }
        const res = calculatePDPumpSizing(parsed.data);
        setPdResult(res);
        setCentrifugalResult(null);
        setActiveTab("summary");
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
        dischargeVesselPressure: String(tc.dischargeVesselPressure),
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
        dischargeVesselPressure: String(tc.dischargeVesselPressure),
        reliefValvePressure: String(tc.reliefValvePressure),
        pumpDifferentialPressure: String(tc.pumpDifferentialPressure),
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
        { label: "Suction Vessel Pressure", value: form.suctionVesselPressure, unit: getUnit("pressureGauge", u) },
        { label: "Discharge Vessel Pressure", value: form.dischargeVesselPressure, unit: getUnit("pressureGauge", u) },
      ],
      results: [
        { label: "Total Dynamic Head (TDH)", value: convertFromSI("head", r.totalDynamicHead, u), unit: getUnit("head", u), highlight: true },
        { label: "Static Head", value: convertFromSI("head", r.staticHead, u), unit: getUnit("head", u) },
        { label: "Pressure Head Difference (P\u2090\u2091\u209C - P\u209B\u1D64\u1D9C\u1D9C)", value: convertFromSI("head", r.pressureHeadDifference, u), unit: getUnit("head", u) },
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
        { label: "NPSHa (Available \u2014 screening; compare vs. vendor NPSHr + margin)", value: convertFromSI("head", r.npshaAvailable, u), unit: getUnit("head", u), highlight: r.npshaAvailable < 3.0 },
        { label: "Suction f (Darcy)", value: r.suctionFrictionFactor, unit: "\u2014" },
        { label: "Discharge f (Darcy)", value: r.dischargeFrictionFactor, unit: "\u2014" },
      ],
      methodology: [
        "PRELIMINARY HYDRAULIC / POWER SCREENING \u2014 not a substitute for vendor selection or detailed network analysis",
        "Darcy-Weisbach equation with Swamee-Jain friction factor (turbulent) or 64/Re (laminar)",
        "TDH = \u0394z + h_f_total + \u0394h_velocity + (P_dest \u2212 P_suction)/(\u03C1g) \u2014 full Bernoulli basis",
        "Hydraulic Power = \u03C1 \u00D7 g \u00D7 Q \u00D7 TDH",
        "Brake Power = Hydraulic Power / Pump Efficiency",
        "Motor Power = Brake Power / Motor Efficiency",
        "NPSHa = P_atm/(\u03C1g) + P_vessel/(\u03C1g) + z_suction \u2212 h_f_suction \u2212 P_vap/(\u03C1g)",
        "NPSHr is a vendor pump curve property and is NOT computed here",
      ],
      assumptions: [
        "Preliminary hydraulic and power screening only \u2014 not a substitute for vendor pump selection",
        "Steady-state, incompressible liquid flow",
        "Pipe full (no two-phase flow)",
        "Darcy-Weisbach equation with Swamee-Jain friction factor approximation",
        "Minor losses calculated using resistance coefficient (K) method (Crane TP-410)",
        "TDH includes elevation, friction, velocity head, AND destination vessel pressure head \u2014 full Bernoulli basis",
        "NPSHa is a suction-side screening value only; NPSHr is a vendor pump curve property not computed here \u2014 always compare NPSHa against vendor NPSHr plus required margin before selection",
        "No pump curve, BEP matching, or off-BEP performance derating performed",
        "Motor margin percentages are indicative driver sizing guidance (API-aware, common EPC preliminary practice) \u2014 verify against project specification and selected motor standard",
        "Velocity thresholds in advisory notes are common EPC/HI preliminary guidance values \u2014 not absolute code limits",
        "Suction/discharge vessel pressures are gauge (0 bar g = atmospheric)",
      ],
      references: [
        "Hydraulic Institute Standards (HI 1.3) \u2014 Centrifugal Pump Design",
        "API 610 \u2014 Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries",
        "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
        "Cameron Hydraulic Data, 20th Edition",
        "Perry\u2019s Chemical Engineers\u2019 Handbook, 9th Edition",
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
        { label: "Required Pump \u0394P", value: form.pumpDifferentialPressure, unit: getUnit("pressure", u) },
        { label: "Relief Valve Set Pressure", value: form.reliefValvePressure, unit: getUnit("pressureGauge", u) },
        { label: "Vapor Pressure", value: form.vaporPressure, unit: getUnit("pressureKpa", u) },
        { label: "Atmospheric Pressure", value: form.atmosphericPressure, unit: getUnit("pressureAbs", u) },
        { label: "Suction Vessel Pressure", value: form.suctionVesselPressure, unit: getUnit("pressureGauge", u) },
        { label: "Discharge Vessel Pressure", value: form.dischargeVesselPressure, unit: getUnit("pressureGauge", u) },
      ],
      results: [
        { label: "Pump Differential Pressure (\u0394P)", value: convertFromSI("pressure", r.differentialPressure, u), unit: getUnit("pressure", u), highlight: true },
        { label: "Actual Discharge-Side Pressure", value: convertFromSI("pressureGauge", r.actualDischargePressure, u), unit: getUnit("pressureGauge", u) },
        { label: "Total Dynamic Head (informational)", value: convertFromSI("head", r.totalDynamicHead, u), unit: getUnit("head", u) },
        { label: "Static Head", value: convertFromSI("head", r.staticHead, u), unit: getUnit("head", u) },
        { label: "Total Friction Loss", value: convertFromSI("head", r.totalFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Actual Flow (Delivered)", value: convertFromSI("flowLiquid", r.actualFlow, u), unit: getUnit("flowLiquid", u) },
        { label: "Theoretical Flow (Displaced)", value: convertFromSI("flowLiquid", r.theoreticalFlow, u), unit: getUnit("flowLiquid", u) },
        { label: "Slip (Internal Leakage)", value: convertFromSI("flowLiquid", r.slip, u), unit: getUnit("flowLiquid", u) },
        { label: "Hydraulic Power", value: convertFromSI("power", r.hydraulicPower, u), unit: getUnit("power", u) },
        { label: "Shaft Power", value: convertFromSI("power", r.shaftPower, u), unit: getUnit("power", u), highlight: true },
        { label: "Motor Power Required", value: convertFromSI("power", r.motorPower, u), unit: getUnit("power", u), highlight: true },
        { label: "NPSHa (Available \u2014 screening; compare vs. vendor NPIPr + margin)", value: convertFromSI("head", r.npshaAvailable, u), unit: getUnit("head", u), highlight: r.npshaAvailable < 3.0 },
        { label: "NPIPa (Available \u2014 screening; compare vs. vendor NPIPr + margin)", value: r.npipAvailable, unit: "kPa", highlight: r.npipAvailable < 30 },
        { label: "Suction Velocity", value: convertFromSI("velocity", r.suctionVelocity, u), unit: getUnit("velocity", u) },
        { label: "Discharge Velocity", value: convertFromSI("velocity", r.dischargeVelocity, u), unit: getUnit("velocity", u) },
        { label: "Relief Valve Set Pressure", value: r.reliefValvePressure > 0 ? convertFromSI("pressureGauge", r.reliefValvePressure, u) : 0, unit: r.reliefValvePressure > 0 ? getUnit("pressureGauge", u) : "Not set" },
      ],
      methodology: [
        "HYDRAULIC / POWER SCREENING ONLY \u2014 not full PD pump sizing per API 674/676",
        "Darcy-Weisbach equation with Swamee-Jain friction factor (turbulent) or 64/Re (laminar)",
        "Theoretical flow = Actual delivered flow / Volumetric Efficiency",
        "Slip = Theoretical (displaced) flow \u2212 Actual delivered flow",
        "Pump \u0394P: user-specified required pressure rise across pump (bar); 0 = estimated from piping TDH",
        "Actual discharge-side pressure = Suction vessel pressure + Pump \u0394P",
        "Hydraulic Power = Pump \u0394P \u00D7 Q_actual",
        "Shaft Power = Hydraulic Power / Mechanical Efficiency",
        "Motor Power = Shaft Power / Motor Efficiency",
        "NPIPa = NPSHa \u00D7 \u03C1 \u00D7 g (per API 676 for rotary PD pumps)",
        "Relief valve check basis: actual discharge-side pressure (suction + pump \u0394P)",
        "Acceleration head in suction piping NOT included \u2014 assess pulsation effects with vendor",
      ],
      assumptions: [
        "PRELIMINARY HYDRAULIC / POWER SCREENING ONLY \u2014 not a substitute for full PD pump mechanical design, vendor engineering, or formal API 674/676 compliance review",
        "Displacement, stroke/speed selection, plunger/piston dimensions, pulsation bottle sizing, acceleration head NOT calculated",
        "Steady-state, incompressible liquid flow; no transient, pulsation, or two-phase effects",
        "Required Pump \u0394P = pressure rise across pump (bar differential) \u2014 NOT destination vessel gauge pressure; if 0, estimated from TDH as screening fallback",
        "Actual discharge-side pressure (for relief valve screening) = suctionVesselPressure + pump \u0394P \u2014 simplified estimate only",
        "Required (delivered) flow = actual flow input; theoretical (displaced) flow = actual flow / volumetric efficiency; slip = simplified internal leakage model",
        "NPSHa screening only \u2014 NPIPr (required) is a vendor property not computed here; acceleration head further reduces effective suction head for reciprocating PD pumps",
        "Relief valve check is preliminary screening (suction + pump \u0394P basis) \u2014 final relief system design requires full study per applicable standards",
        "Motor margin percentages are indicative driver sizing guidance (common EPC preliminary practice) \u2014 verify against project specification",
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
              {pumpType === "centrifugal" ? "Centrifugal" : "Positive Displacement"} pump &mdash; preliminary hydraulic &amp; power screening &mdash; 5-step wizard
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
                      <div>
                        <Label className="text-xs mb-1.5 block">Pump Speed (rpm) <span className="text-muted-foreground font-normal">— for specific speed Ns</span></Label>
                        <Input type="number" value={form.pumpSpeed} onChange={(e) => updateField("pumpSpeed", e.target.value)} placeholder="e.g. 1450 or 2950 (optional)" data-testid="input-pump-speed" />
                        <p className="text-[10px] text-muted-foreground mt-1">Leave blank to use 1450 rpm as assumed basis (HI 1.3)</p>
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
                        <Label className="text-xs mb-1.5 block">Required Pump &Delta;P ({getUnit("pressure", unitSystem)})</Label>
                        <Input type="number" value={form.pumpDifferentialPressure} onChange={(e) => updateField("pumpDifferentialPressure", e.target.value)} placeholder="0 = estimated from TDH" data-testid="input-pump-dp" />
                        <p className="text-[10px] text-muted-foreground mt-1">Pressure rise across pump only (&Delta;P), not destination vessel pressure</p>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Relief Valve Pressure ({getUnit("pressureGauge", unitSystem)})</Label>
                        <Input type="number" value={form.reliefValvePressure} onChange={(e) => updateField("reliefValvePressure", e.target.value)} placeholder="e.g. 15" data-testid="input-relief-pressure" />
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-xs mb-1.5 block">Atmospheric Pressure ({getUnit("pressureAbs", unitSystem)})</Label>
                    <Input type="number" value={form.atmosphericPressure} onChange={(e) => updateField("atmosphericPressure", e.target.value)} data-testid="input-atm-pressure" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Suction Vessel Pressure ({getUnit("pressureGauge", unitSystem)})</Label>
                    <Input type="number" value={form.suctionVesselPressure} onChange={(e) => updateField("suctionVesselPressure", e.target.value)} placeholder="0 = atmospheric" data-testid="input-vessel-pressure" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Discharge Vessel Pressure ({getUnit("pressureGauge", unitSystem)})</Label>
                    <Input type="number" value={form.dischargeVesselPressure} onChange={(e) => updateField("dischargeVesselPressure", e.target.value)} placeholder="0 = atmospheric" data-testid="input-discharge-vessel-pressure" />
                    <p className="text-[10px] text-muted-foreground mt-1">Destination / receiving vessel gauge pressure (0 = atmospheric)</p>
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
                          <div className="text-xs text-muted-foreground">NPSHa (screening)</div>
                          <div className={`text-lg font-bold ${centrifugalResult.npshaAvailable < 3 ? "text-destructive" : ""}`}>{convertFromSI("head", centrifugalResult.npshaAvailable, unitSystem).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">{getUnit("head", unitSystem)} — compare vs. vendor NPSHr</div>
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
                          <div className="text-xs text-muted-foreground">NPSHa (screening)</div>
                          <div className={`text-lg font-bold ${pdResult.npshaAvailable < 3 ? "text-destructive" : ""}`}>{convertFromSI("head", pdResult.npshaAvailable, unitSystem).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">{getUnit("head", unitSystem)} — compare vs. vendor NPIPr</div>
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
                        { label: "Static Head (\u0394z)", value: convertFromSI("head", centrifugalResult.staticHead, unitSystem), unit: getUnit("head", unitSystem) },
                        { label: "Pressure Head Diff (P\u2091\u2090\u209C\u209C \u2212 P\u209B\u1D64\u1D9C)/(\u03C1g)", value: convertFromSI("head", centrifugalResult.pressureHeadDifference, unitSystem), unit: getUnit("head", unitSystem) },
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
                        { label: "NPSHa (Available) — compare vs. vendor NPSHr + margin", value: convertFromSI("head", centrifugalResult.npshaAvailable, unitSystem), unit: getUnit("head", unitSystem), highlight: centrifugalResult.npshaAvailable < 3.0 },
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
                        { label: "Pump Differential Pressure (\u0394P)", value: convertFromSI("pressure", pdResult.differentialPressure, unitSystem), unit: getUnit("pressure", unitSystem), highlight: true },
                        { label: "Actual Discharge-Side Pressure", value: convertFromSI("pressureGauge", pdResult.actualDischargePressure, unitSystem), unit: getUnit("pressureGauge", unitSystem) },
                        { label: "Total Dynamic Head (informational)", value: convertFromSI("head", pdResult.totalDynamicHead, unitSystem), unit: getUnit("head", unitSystem) },
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
                        { label: "NPSHa (Available) — compare vs. vendor NPIPr + margin", value: convertFromSI("head", pdResult.npshaAvailable, unitSystem), unit: getUnit("head", unitSystem), highlight: pdResult.npshaAvailable < 3.0 },
                        { label: "NPIPa (Available) — compare vs. vendor NPIPr + margin", value: pdResult.npipAvailable, unit: "kPa", highlight: pdResult.npipAvailable < 30 },
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
                          value: pdResult.reliefValvePressure > 0 ? convertFromSI("pressureGauge", pdResult.reliefValvePressure, unitSystem) : 0,
                          unit: pdResult.reliefValvePressure > 0 ? getUnit("pressureGauge", unitSystem) : "Not set",
                          highlight: pdResult.reliefValvePressure <= 0,
                        },
                        {
                          label: "Actual Discharge-Side Pressure",
                          value: convertFromSI("pressureGauge", pdResult.actualDischargePressure, unitSystem),
                          unit: getUnit("pressureGauge", unitSystem),
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
                      <DropdownMenuItem onClick={() => { const d = getExportData(); if (d) exportToCalcNote(d); }} data-testid="button-export-calc-note">
                        <FileText className="w-4 h-4 mr-2" />Calc Note (Print / PDF)
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
                      "PRELIMINARY HYDRAULIC / POWER SCREENING \u2014 not a substitute for vendor pump selection, detailed hydraulic network analysis, or formal API 610 compliance review",
                      "Steady-state, incompressible liquid flow; pipe assumed full (no two-phase flow); no transient surge or water-hammer effects",
                      "TDH = \u0394z + h_f_total + \u0394h_velocity + (P_dest \u2212 P_suction)/(\u03C1g) \u2014 full Bernoulli basis; both suction and discharge vessel pressures are included",
                      "Darcy-Weisbach friction with Swamee-Jain approximation (turbulent) or 64/Re (laminar); minor losses via resistance coefficient (K) method \u2014 ref. Crane TP-410",
                      "NPSHa computed from suction-side energy balance only \u2014 this is a screening value. NPSHr is a vendor pump curve property and is NOT computed here. Always compare NPSHa against vendor NPSHr plus required project/company margin before equipment selection",
                      "The 3 m NPSHa advisory flag is a common preliminary screening trigger only \u2014 it is NOT a final acceptance criterion. Actual margin requirements are vendor- and project-specific",
                      "No pump curve, BEP matching, or off-BEP performance derating performed",
                      "Velocity thresholds in advisory notes are common EPC/HI preliminary guidance values \u2014 not absolute code limits; verify against project specification",
                      "Motor margin percentages are indicative driver sizing guidance (API-aware, common EPC preliminary practice) \u2014 verify against project specification and selected motor standard edition",
                      "Specific speed Ns is an indicative screening value in the stated unit convention (rpm, m\u00B3/h, m) \u2014 impeller geometry selection requires vendor engineering and curve confirmation",
                      "Suction and discharge vessel pressures are gauge (0 bar g = atmospheric)",
                    ]}
                    references={[
                      "Hydraulic Institute Standards (HI 1.3) \u2014 Centrifugal Pump Design",
                      "API 610 \u2014 Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries",
                      "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
                      "Cameron Hydraulic Data, 20th Edition",
                      "Perry\u2019s Chemical Engineers\u2019 Handbook, 9th Edition",
                    ]}
                  />
                ) : (
                  <AssumptionsPanel
                    assumptions={[
                      "PRELIMINARY HYDRAULIC / POWER SCREENING ONLY \u2014 not a substitute for full PD pump mechanical design, vendor engineering, or formal API 674/676 compliance review",
                      "Displacement, stroke/speed combination, plunger/piston/cylinder dimensions, pulsation bottle sizing, and acceleration head are NOT calculated",
                      "Steady-state, incompressible liquid flow; no two-phase flow, transient effects, or pulsation dynamics",
                      "Required Pump \u0394P = required pressure rise across the pump (bar differential) \u2014 NOT a destination vessel gauge pressure; if 0 is entered, \u0394P is estimated from piping TDH as a screening fallback",
                      "Actual discharge-side pressure (for relief valve screening) = suction vessel pressure + pump \u0394P \u2014 this is a simplified estimate; actual discharge pressure depends on system back-pressure and line losses",
                      "Required (delivered) flow = actual flow input; theoretical (displaced) flow = actual flow / volumetric efficiency; slip = theoretical \u2212 actual (simplified internal leakage model)",
                      "Hydraulic power = pump \u0394P \u00D7 actual delivered flow; shaft power = hydraulic power / mechanical efficiency; motor power = shaft power / motor efficiency",
                      "NPSHa computed from suction-side energy balance \u2014 screening value only. NPIPr (required) is a vendor property and is NOT computed here. Compare NPSHa/NPIPa against vendor NPIPr plus required margin; acceleration head further reduces effective suction head for reciprocating PD pumps",
                      "The 30 kPa NPIPa advisory flag is a common screening trigger only \u2014 not a final acceptance criterion; vendor NPIPr and project/company margin govern",
                      "Relief valve check is a preliminary screening only (suction + pump \u0394P basis) \u2014 final relief set pressure requires full pressure relief system study per project specification and applicable standards",
                      "Velocity threshold advisory notes are common EPC/HI preliminary guidance \u2014 not absolute limits; verify against project specification",
                      "Motor margin percentages are indicative driver sizing guidance (common EPC preliminary practice) \u2014 verify against project specification",
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
