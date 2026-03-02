import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import {
  calculateCompressorSizing,
  COMPRESSOR_CENTRIFUGAL_TEST_CASE,
  COMPRESSOR_RECIPROCATING_TEST_CASE,
  COMMON_COMPRESSOR_GASES,
  type CompressorResult,
  type CompressorType,
  type CompressionModel,
} from "@/lib/engineering/compressorSizing";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { CompressorCurveChart } from "@/components/engineering/compressor-curve-chart";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { exportToExcel, exportToPDF, exportToJSON } from "@/lib/engineering/exportUtils";
import {
  Cog, FlaskConical, RotateCcw, ChevronLeft, ChevronRight,
  ClipboardList, Wind, Calculator, Layers, CheckCircle2,
  Download, FileText, FileSpreadsheet,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  date: new Date().toISOString().slice(0, 10),
};

interface FormState {
  gasFlowRate: string;
  molecularWeight: string;
  suctionPressure: string;
  dischargePressure: string;
  suctionTemperature: string;
  specificHeatRatio: string;
  compressibilityFactor: string;
  polytropicEfficiency: string;
  mechanicalEfficiency: string;
  motorEfficiency: string;
  maxDischargeTemperature: string;
}

const defaultForm: FormState = {
  gasFlowRate: "",
  molecularWeight: "",
  suctionPressure: "",
  dischargePressure: "",
  suctionTemperature: "",
  specificHeatRatio: "",
  compressibilityFactor: "1.0",
  polytropicEfficiency: "78",
  mechanicalEfficiency: "98",
  motorEfficiency: "96",
  maxDischargeTemperature: "200",
};

const fieldUnitMap: FieldUnitMap = {
  gasFlowRate: "flowGas",
  molecularWeight: null,
  suctionPressure: "pressure",
  dischargePressure: "pressure",
  suctionTemperature: "temperature",
  specificHeatRatio: null,
  compressibilityFactor: null,
  polytropicEfficiency: null,
  mechanicalEfficiency: null,
  motorEfficiency: null,
  maxDischargeTemperature: "temperature",
};

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "gas", label: "Gas & Conditions", icon: Wind, step: 2 },
  { id: "sizing", label: "Sizing", icon: Calculator, step: 3 },
  { id: "stages", label: "Stages", icon: Layers, step: 4 },
  { id: "summary", label: "Summary", icon: CheckCircle2, step: 5 },
];

export default function CompressorPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [activeTab, setActiveTab] = useState("project");
  const [project, setProject] = useState<ProjectInfo>({ ...defaultProject });
  const [compressorType, setCompressorType] = useState<CompressorType>("centrifugal");
  const [compressionModel, setCompressionModel] = useState<CompressionModel>("polytropic");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<CompressorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleUnitToggle = (ns: UnitSystem) => {
    setForm(convertFormValues(form, fieldUnitMap, unitSystem, ns) as FormState);
    setUnitSystem(ns);
  };

  const handleGasSelect = (gasName: string) => {
    const gas = COMMON_COMPRESSOR_GASES[gasName];
    if (gas) {
      setForm(p => ({
        ...p,
        molecularWeight: String(gas.mw),
        specificHeatRatio: String(gas.k),
        compressibilityFactor: String(gas.z),
      }));
    }
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const input = {
        gasFlowRate: convertToSI("flowGas", parseFloat(form.gasFlowRate), unitSystem),
        molecularWeight: parseFloat(form.molecularWeight),
        suctionPressure: convertToSI("pressure", parseFloat(form.suctionPressure), unitSystem),
        dischargePressure: convertToSI("pressure", parseFloat(form.dischargePressure), unitSystem),
        suctionTemperature: convertToSI("temperature", parseFloat(form.suctionTemperature), unitSystem),
        specificHeatRatio: parseFloat(form.specificHeatRatio),
        compressibilityFactor: parseFloat(form.compressibilityFactor),
        polytropicEfficiency: parseFloat(form.polytropicEfficiency),
        mechanicalEfficiency: parseFloat(form.mechanicalEfficiency),
        motorEfficiency: parseFloat(form.motorEfficiency),
        compressorType,
        compressionModel,
        maxDischargeTemperature: convertToSI("temperature", parseFloat(form.maxDischargeTemperature), unitSystem),
      };

      for (const [key, val] of Object.entries(input)) {
        if (typeof val === "number" && isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }

      const res = calculateCompressorSizing(input);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    setError(null);
    setResult(null);
    setUnitSystem("SI");
    const tc = compressorType === "centrifugal"
      ? COMPRESSOR_CENTRIFUGAL_TEST_CASE
      : COMPRESSOR_RECIPROCATING_TEST_CASE;
    setCompressionModel(tc.compressionModel);
    setForm({
      gasFlowRate: String(tc.gasFlowRate),
      molecularWeight: String(tc.molecularWeight),
      suctionPressure: String(tc.suctionPressure),
      dischargePressure: String(tc.dischargePressure),
      suctionTemperature: String(tc.suctionTemperature),
      specificHeatRatio: String(tc.specificHeatRatio),
      compressibilityFactor: String(tc.compressibilityFactor),
      polytropicEfficiency: String(tc.polytropicEfficiency),
      mechanicalEfficiency: String(tc.mechanicalEfficiency),
      motorEfficiency: String(tc.motorEfficiency),
      maxDischargeTemperature: String(tc.maxDischargeTemperature),
    });
    setActiveTab("gas");
  };

  const handleReset = () => {
    setForm(defaultForm);
    setProject({ ...defaultProject });
    setResult(null);
    setError(null);
    setActiveTab("project");
  };

  const buildResults = () => {
    if (!result) return [];
    const u = unitSystem;
    return [
      { label: "Compressor Type", value: result.compressorType === "centrifugal" ? "Centrifugal" : "Reciprocating", unit: "" },
      { label: "Compression Model", value: result.compressionModel === "isentropic" ? "Isentropic" : "Polytropic", unit: "" },
      { label: "Overall Compression Ratio", value: result.overallCompressionRatio.toFixed(2), unit: "" },
      { label: "Number of Stages", value: String(result.numberOfStages), unit: "", highlight: result.numberOfStages > 1 },
      { label: "Total Isentropic Head", value: result.totalIsentropicHead.toFixed(1), unit: "kJ/kg" },
      { label: "Total Polytropic Head", value: result.totalPolytropicHead.toFixed(1), unit: "kJ/kg" },
      { label: "Gas Power", value: convertFromSI("power", result.totalGasPower, u).toFixed(1), unit: getUnit("power", u) },
      { label: "Shaft Power", value: convertFromSI("power", result.totalShaftPower, u).toFixed(1), unit: getUnit("power", u), highlight: true },
      { label: "Motor Power", value: convertFromSI("power", result.totalMotorPower, u).toFixed(1), unit: getUnit("power", u), highlight: true },
      { label: "Discharge Temperature", value: convertFromSI("temperature", result.finalDischargeTemperature, u).toFixed(1), unit: getUnit("temperature", u), highlight: result.finalDischargeTemperature > 150 },
      { label: "Adiabatic Efficiency", value: result.adiabaticEfficiency.toFixed(1), unit: "%" },
      { label: "Polytropic Efficiency", value: result.polytropicEfficiency.toFixed(1), unit: "%" },
      { label: "Mass Flow Rate", value: result.massFlowRate.toFixed(1), unit: "kg/h" },
      { label: "Std. Volumetric Flow", value: convertFromSI("flowGas", result.volumetricFlowRate, u).toFixed(2), unit: getUnit("flowGas", u) },
      { label: "Actual Inlet Volume Flow", value: result.actualVolumetricFlowRate.toFixed(1), unit: "m\u00B3/h" },
    ];
  };

  const buildExportData = (): ExportDatasheet | undefined => {
    if (!result) return undefined;
    const u = unitSystem;
    const stageSection = result.stages.length > 1
      ? result.stages.map(s => ({
          title: `Stage ${s.stageNumber}`,
          items: [
            { label: "Compression Ratio", value: s.compressionRatio, unit: "" },
            { label: "Suction Pressure", value: convertFromSI("pressure", s.suctionPressure, u), unit: getUnit("pressure", u) },
            { label: "Discharge Pressure", value: convertFromSI("pressure", s.dischargePressure, u), unit: getUnit("pressure", u) },
            { label: "Suction Temperature", value: convertFromSI("temperature", s.suctionTemperature, u), unit: getUnit("temperature", u) },
            { label: "Discharge Temperature", value: convertFromSI("temperature", s.dischargeTemperature, u), unit: getUnit("temperature", u) },
            { label: "Shaft Power", value: convertFromSI("power", s.shaftPower, u), unit: getUnit("power", u) },
          ],
        }))
      : undefined;

    return {
      calculatorName: "Compressor Sizing Calculator",
      chartElementId: "chart-compressor-curve",
      projectInfo: [
        { label: "Project", value: project.name },
        { label: "Client", value: project.client },
        { label: "Location", value: project.location },
        { label: "Case / Tag", value: project.caseId },
        { label: "Engineer", value: project.engineer },
        { label: "Date", value: project.date },
      ],
      inputs: [
        { label: "Gas Flow Rate", value: form.gasFlowRate, unit: getUnit("flowGas", u) },
        { label: "Molecular Weight", value: form.molecularWeight, unit: "kg/kmol" },
        { label: "Suction Pressure", value: form.suctionPressure, unit: getUnit("pressure", u) },
        { label: "Discharge Pressure", value: form.dischargePressure, unit: getUnit("pressure", u) },
        { label: "Suction Temperature", value: form.suctionTemperature, unit: getUnit("temperature", u) },
        { label: "Specific Heat Ratio (k)", value: form.specificHeatRatio },
        { label: "Compressibility Factor (Z)", value: form.compressibilityFactor },
        { label: "Compressor Type", value: compressorType === "centrifugal" ? "Centrifugal" : "Reciprocating" },
        { label: "Compression Model", value: compressionModel === "polytropic" ? "Polytropic" : "Isentropic" },
        { label: `${compressionModel === "polytropic" ? "Polytropic" : "Isentropic"} Efficiency`, value: form.polytropicEfficiency, unit: "%" },
        { label: "Mechanical Efficiency", value: form.mechanicalEfficiency, unit: "%" },
        { label: "Motor/Driver Efficiency", value: form.motorEfficiency, unit: "%" },
        { label: "Max Discharge Temperature", value: form.maxDischargeTemperature, unit: getUnit("temperature", u) },
      ],
      results: buildResults().map(r => ({
        label: r.label,
        value: typeof r.value === "string" ? r.value : r.value,
        unit: r.unit,
        highlight: r.highlight,
      })),
      methodology: [
        "Compression ratio per stage limited to ~3.5 (centrifugal) or ~4.0 (reciprocating)",
        "Multi-stage compression with equal stage ratios and intercooling back to suction temperature",
        compressionModel === "polytropic"
          ? "Polytropic head: Hp = (Z * R * T1 / MW) * (n/(n-1)) * [(P2/P1)^((n-1)/n) - 1]"
          : "Isentropic head: Hs = (Z * R * T1 / MW) * (k/(k-1)) * [(P2/P1)^((k-1)/k) - 1]",
        "Gas power = Head * mass flow rate",
        "Shaft power = Gas power / (polytropic or isentropic efficiency * mechanical efficiency)",
        "Motor power = Shaft power / motor efficiency",
        "Discharge temperature: T2 = T1 * (P2/P1)^((n-1)/n) for polytropic",
      ],
      assumptions: [
        "Ideal gas law with compressibility factor (Z) correction",
        "Single Z-factor used across all stages (average approximation)",
        "Perfect intercooling assumed — gas cooled back to suction temperature between stages",
        "Stage pressure ratios are equal (balanced staging)",
        "No pressure drop in intercoolers or piping between stages",
        compressionModel === "polytropic"
          ? "Polytropic process path: PV\u207F = constant, n derived from k and \u03B7_poly"
          : "Isentropic (adiabatic reversible) compression with efficiency correction",
        "Mechanical losses accounted via mechanical efficiency factor",
        "Motor/driver losses accounted via motor efficiency factor",
        compressorType === "centrifugal"
          ? "Max ratio per stage ~3.5 for centrifugal compressors"
          : "Max ratio per stage ~4.0 for reciprocating compressors",
      ],
      references: [
        "GPSA Engineering Data Book, Section 13 — Compressors",
        "API 617 — Axial and Centrifugal Compressors",
        "API 618 — Reciprocating Compressors",
        "Ludwig's Applied Process Design, Volume 3, Chapter 12",
        "Perry's Chemical Engineers' Handbook, Section 10",
      ],
      warnings: result.warnings,
      additionalSections: stageSection,
    };
  };

  const buildStageRows = () => {
    if (!result || result.stages.length <= 1) return null;
    const u = unitSystem;
    return result.stages.map(s => ({
      stage: s.stageNumber,
      ratio: s.compressionRatio.toFixed(2),
      pSuction: convertFromSI("pressure", s.suctionPressure, u).toFixed(2),
      pDischarge: convertFromSI("pressure", s.dischargePressure, u).toFixed(2),
      tSuction: convertFromSI("temperature", s.suctionTemperature, u).toFixed(1),
      tDischarge: convertFromSI("temperature", s.dischargeTemperature, u).toFixed(1),
      power: convertFromSI("power", s.shaftPower, u).toFixed(1),
    }));
  };

  const stagesGated = !result;
  const summaryGated = !result;
  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => {
    if (tabIdx >= TABS.length - 1) return;
    const nextTab = TABS[tabIdx + 1].id;
    if ((nextTab === "stages" && stagesGated) || (nextTab === "summary" && summaryGated)) return;
    setActiveTab(nextTab);
  };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Cog className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">
              Compressor Sizing Calculator
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {compressorType === "centrifugal"
                ? "Centrifugal compressor head, power & staging"
                : "Reciprocating compressor power & staging"} — 5-step wizard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
            <FlaskConical className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">Test Case</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-compressor">
        <div className="overflow-x-auto -mx-4 px-4 mb-4 md:mb-6">
          <TabsList className="inline-flex w-max min-w-full md:w-full md:min-w-0 h-auto p-1">
            {TABS.map(t => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                disabled={(t.id === "stages" && stagesGated) || (t.id === "summary" && summaryGated)}
                className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs px-2 md:px-3 py-1.5 whitespace-nowrap"
                data-testid={`tab-${t.id}`}
              >
                <t.icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.step}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

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
                <div><Label className="text-xs mb-1.5 block">Case ID / Tag</Label>
                  <Input value={project.caseId} onChange={e => setProject(p => ({ ...p, caseId: e.target.value }))} data-testid="input-case-id" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => setProject(p => ({ ...p, engineer: e.target.value }))} data-testid="input-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => setProject(p => ({ ...p, date: e.target.value }))} data-testid="input-date" /></div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-medium mb-3">Compressor Configuration</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Type</Label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={compressorType === "centrifugal" ? "default" : "outline"}
                        onClick={() => {
                          setCompressorType("centrifugal");
                          setCompressionModel("polytropic");
                          setForm(p => ({ ...p, polytropicEfficiency: "78", mechanicalEfficiency: "98", maxDischargeTemperature: "200" }));
                          setResult(null); setError(null);
                        }}
                        data-testid="button-type-centrifugal"
                      >
                        Centrifugal
                      </Button>
                      <Button
                        size="sm"
                        variant={compressorType === "reciprocating" ? "default" : "outline"}
                        onClick={() => {
                          setCompressorType("reciprocating");
                          setCompressionModel("isentropic");
                          setForm(p => ({ ...p, polytropicEfficiency: "85", mechanicalEfficiency: "95", maxDischargeTemperature: "150" }));
                          setResult(null); setError(null);
                        }}
                        data-testid="button-type-reciprocating"
                      >
                        Reciprocating
                      </Button>
                    </div>
                  </div>
                  <div className="border-l pl-3 flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Model</Label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={compressionModel === "polytropic" ? "default" : "outline"}
                        onClick={() => { setCompressionModel("polytropic"); setResult(null); }}
                        data-testid="button-model-polytropic"
                      >
                        Polytropic
                      </Button>
                      <Button
                        size="sm"
                        variant={compressionModel === "isentropic" ? "default" : "outline"}
                        onClick={() => { setCompressionModel("isentropic"); setResult(null); }}
                        data-testid="button-model-isentropic"
                      >
                        Isentropic
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gas">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Gas Properties</h3>
                <p className="text-xs text-muted-foreground">Select a gas or enter custom properties</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">Gas Selection</Label>
                    <Select onValueChange={handleGasSelect}>
                      <SelectTrigger data-testid="select-gas">
                        <SelectValue placeholder="Select a gas..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(COMMON_COMPRESSOR_GASES).map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Gas Flow Rate ({getUnit("flowGas", unitSystem)})</Label>
                    <Input type="number" value={form.gasFlowRate} onChange={e => update("gasFlowRate", e.target.value)}
                      placeholder="e.g. 5000" data-testid="input-flow" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Molecular Weight (kg/kmol)</Label>
                    <Input type="number" value={form.molecularWeight} onChange={e => update("molecularWeight", e.target.value)}
                      placeholder="e.g. 18.5" data-testid="input-mw" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Specific Heat Ratio k (Cp/Cv)</Label>
                    <Input type="number" value={form.specificHeatRatio} onChange={e => update("specificHeatRatio", e.target.value)}
                      placeholder="e.g. 1.28" data-testid="input-k" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Compressibility Factor Z</Label>
                    <Input type="number" value={form.compressibilityFactor} onChange={e => update("compressibilityFactor", e.target.value)}
                      placeholder="e.g. 0.95" data-testid="input-z" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Pressure & Temperature</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">Suction Pressure ({getUnit("pressure", unitSystem)})</Label>
                    <Input type="number" value={form.suctionPressure} onChange={e => update("suctionPressure", e.target.value)}
                      placeholder="e.g. 30" data-testid="input-p1" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Discharge Pressure ({getUnit("pressure", unitSystem)})</Label>
                    <Input type="number" value={form.dischargePressure} onChange={e => update("dischargePressure", e.target.value)}
                      placeholder="e.g. 90" data-testid="input-p2" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Suction Temperature ({getUnit("temperature", unitSystem)})</Label>
                    <Input type="number" value={form.suctionTemperature} onChange={e => update("suctionTemperature", e.target.value)}
                      placeholder="e.g. 35" data-testid="input-t1" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Max Discharge Temperature ({getUnit("temperature", unitSystem)})</Label>
                    <Input type="number" value={form.maxDischargeTemperature} onChange={e => update("maxDischargeTemperature", e.target.value)}
                      placeholder="e.g. 200" data-testid="input-tmax" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Efficiencies</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      {compressionModel === "polytropic" ? "Polytropic" : "Isentropic"} Eff. (%)
                    </Label>
                    <Input type="number" value={form.polytropicEfficiency} onChange={e => update("polytropicEfficiency", e.target.value)}
                      placeholder="e.g. 78" data-testid="input-eta-poly" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Mechanical Eff. (%)</Label>
                    <Input type="number" value={form.mechanicalEfficiency} onChange={e => update("mechanicalEfficiency", e.target.value)}
                      placeholder="e.g. 98" data-testid="input-eta-mech" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Motor/Driver Eff. (%)</Label>
                    <Input type="number" value={form.motorEfficiency} onChange={e => update("motorEfficiency", e.target.value)}
                      placeholder="e.g. 96" data-testid="input-eta-motor" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sizing">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Sizing Calculations</h3>
              <p className="text-xs text-muted-foreground">
                {compressionModel === "polytropic" ? "Polytropic" : "Isentropic"} head, power & staging per GPSA / API 617-618
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                Calculate Compressor Sizing
              </Button>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                  {error}
                </div>
              )}

              {result && (
                <>
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h4 className="font-semibold text-sm">Governing Results</h4>
                        <Badge className="text-[10px]">{result.numberOfStages} Stage{result.numberOfStages > 1 ? "s" : ""}</Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Motor Power</p>
                          <p className="text-lg font-mono font-bold text-primary" data-testid="text-motor-power">
                            {convertFromSI("power", result.totalMotorPower, unitSystem).toFixed(1)} {getUnit("power", unitSystem)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Discharge Temp</p>
                          <p className="text-lg font-mono font-bold" data-testid="text-discharge-temp">
                            {convertFromSI("temperature", result.finalDischargeTemperature, unitSystem).toFixed(1)} {getUnit("temperature", unitSystem)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Total {compressionModel === "polytropic" ? "Polytropic" : "Isentropic"} Head</p>
                          <p className="text-lg font-mono font-bold" data-testid="text-total-head">
                            {(compressionModel === "polytropic" ? result.totalPolytropicHead : result.totalIsentropicHead).toFixed(1)} kJ/kg
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <WarningPanel warnings={result.warnings} />

                  <div>
                    <h4 className="font-semibold text-sm mb-3">Calculation Trace</h4>
                    <div className="space-y-2">
                      {result.trace.steps.map((step, i) => (
                        <Card key={i}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="secondary" className="text-[10px]">{i + 1}</Badge>
                              <span className="text-xs font-medium">{step.name}</span>
                            </div>
                            <div className="space-y-1 font-mono text-[11px] bg-muted/30 p-2 rounded-md">
                              <p className="text-muted-foreground">{step.equation}</p>
                              <p className="text-muted-foreground">{step.substitution}</p>
                              <p className="font-semibold">{step.result}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          {result && (
            <div className="space-y-4">
              {result.numberOfStages > 1 && buildStageRows() && (
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm">Stage-by-Stage Breakdown</h3>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-2 pr-2 text-left">Stage</th>
                            <th className="py-2 px-2 text-right">Ratio</th>
                            <th className="py-2 px-2 text-right">P in ({getUnit("pressure", unitSystem)})</th>
                            <th className="py-2 px-2 text-right">P out ({getUnit("pressure", unitSystem)})</th>
                            <th className="py-2 px-2 text-right">T in ({getUnit("temperature", unitSystem)})</th>
                            <th className="py-2 px-2 text-right">T out ({getUnit("temperature", unitSystem)})</th>
                            <th className="py-2 pl-2 text-right">Power ({getUnit("power", unitSystem)})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buildStageRows()!.map(s => (
                            <tr key={s.stage} className="border-b border-muted/30" data-testid={`row-stage-${s.stage}`}>
                              <td className="py-2 pr-2 font-medium">{s.stage}</td>
                              <td className="py-2 px-2 text-right font-mono">{s.ratio}</td>
                              <td className="py-2 px-2 text-right font-mono">{s.pSuction}</td>
                              <td className="py-2 px-2 text-right font-mono">{s.pDischarge}</td>
                              <td className="py-2 px-2 text-right font-mono">{s.tSuction}</td>
                              <td className="py-2 px-2 text-right font-mono">{s.tDischarge}</td>
                              <td className="py-2 pl-2 text-right font-mono">{s.power}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Intercooling assumed back to suction temperature between stages
                    </p>
                  </CardContent>
                </Card>
              )}

              {result.numberOfStages <= 1 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Single-stage compression — no multi-stage breakdown required</p>
                  </CardContent>
                </Card>
              )}

              <CompressorCurveChart result={result} unitSystem={unitSystem} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary">
          {result && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <h3 className="font-semibold text-sm">Results & Export</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" data-testid="button-export-results">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToPDF(d); }} data-testid="button-export-pdf">
                        <FileText className="w-4 h-4 mr-2 text-red-400" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToExcel(d); }} data-testid="button-export-excel">
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />
                        Export as Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToJSON(d); }} data-testid="button-export-json">
                        <Download className="w-4 h-4 mr-2 text-blue-400" />
                        Export as JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResultsPanel
                    title="Compressor Sizing Results"
                    results={buildResults()}
                    rawData={{
                      calculator: "Compressor Sizing",
                      unitSystem,
                      compressorType: result.compressorType,
                      compressionModel: result.compressionModel,
                      input: form,
                      result,
                    }}
                    exportData={buildExportData()}
                  />
                </CardContent>
              </Card>

              <WarningPanel warnings={result.warnings} />

              <AssumptionsPanel
                assumptions={[
                  "Ideal gas law with compressibility factor (Z) correction",
                  "Single Z-factor used across all stages (average approximation)",
                  "Perfect intercooling assumed — gas cooled back to suction temperature between stages",
                  "Stage pressure ratios are equal (balanced staging)",
                  "No pressure drop in intercoolers or piping between stages",
                  compressionModel === "polytropic"
                    ? "Polytropic process path: PV\u207F = constant, n derived from k and \u03B7_poly"
                    : "Isentropic (adiabatic reversible) compression with efficiency correction",
                  "Mechanical losses accounted via mechanical efficiency factor",
                  "Motor/driver losses accounted via motor efficiency factor",
                  compressorType === "centrifugal"
                    ? "Max ratio per stage ~3.5 for centrifugal compressors"
                    : "Max ratio per stage ~4.0 for reciprocating compressors",
                ]}
                references={[
                  "GPSA Engineering Data Book, Section 13 — Compressors",
                  "API 617 — Axial and Centrifugal Compressors",
                  "API 618 — Reciprocating Compressors",
                  "Ludwig's Applied Process Design, Volume 3, Chapter 12",
                  "Perry's Chemical Engineers' Handbook, Section 10",
                ]}
              />
              <FeedbackSection calculatorName="Compressor Sizing" />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between mt-4 md:mt-6">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={tabIdx === 0} data-testid="button-prev-tab">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <span className="text-xs text-muted-foreground" data-testid="text-step-indicator">Step {tabIdx + 1} of {TABS.length}</span>
        <Button variant="outline" size="sm" onClick={goNext} disabled={tabIdx === TABS.length - 1} data-testid="button-next-tab">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
