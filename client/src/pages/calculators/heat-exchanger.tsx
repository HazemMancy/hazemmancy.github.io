import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI } from "@/lib/engineering/unitConversion";
import {
  type HXProject, type OperatingCase, type ExchangerConfig, type UInput,
  type HXFullResult, type CaseResult, type StreamSide, type FlowArrangement,
  type FMode, type UMode, type DutyMode,
  type TubeGeometryInput, type TubeGeometryResult, type TEMAGuidance,
  DEFAULT_PROJECT, DEFAULT_CASE, DEFAULT_CONFIG, DEFAULT_U_INPUT, DEFAULT_STREAM,
  HX_TEST_CASE_OIL_COOLER, HX_TEST_CONFIG, HX_TEST_U_INPUT,
  TYPICAL_U_VALUES, TEMA_FOULING_FACTORS, FLAG_LABELS, FLAG_SEVERITY,
  STANDARD_TUBE_SIZES, TEMA_TYPES,
  calculateHeatExchangerFull, computeTubeGeometry, generateTEMAGuidance,
} from "@/lib/engineering/heatExchanger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF as exportToPDFUtil, exportToJSON } from "@/lib/engineering/exportUtils";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import {
  Thermometer, ClipboardList, Droplets, Settings2, BarChart3,
  ShieldCheck, ChevronLeft, ChevronRight, RotateCcw, FlaskConical,
  Plus, Trash2, AlertTriangle, CheckCircle2, Download, Info,
  Calculator, Gauge, Box, FileText, FileSpreadsheet, Zap,
} from "lucide-react";

const TABS = [
  { id: "basis", label: "Basis", icon: ClipboardList, step: 1, desc: "Project info & stream data" },
  { id: "config", label: "Configuration", icon: Settings2, step: 2, desc: "Exchanger type, U & fouling" },
  { id: "thermal", label: "Thermal Design", icon: Calculator, step: 3, desc: "Calculate duty, LMTD & area" },
  { id: "geometry", label: "Geometry", icon: Box, step: 4, desc: "Tube sizing & TEMA guidance" },
  { id: "summary", label: "Summary", icon: BarChart3, step: 5, desc: "Results, export & review" },
];

const pU = (param: string, us: UnitSystem) => getUnit(param, us);
const numVal = (v: number): string | number => (v === 0 ? "" : v);
const tempVal = (v: number): number => v;

function fmtN(n: number, d = 2): string {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(3);
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(d);
  return n.toPrecision(4);
}

export default function HeatExchangerPage() {
  const [activeTab, setActiveTab] = useState("basis");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [project, setProject] = useState<HXProject>({ ...DEFAULT_PROJECT });
  const [cases, setCases] = useState<OperatingCase[]>([{ ...DEFAULT_CASE }]);
  const [config, setConfig] = useState<ExchangerConfig>({ ...DEFAULT_CONFIG });
  const [uInput, setUInput] = useState<UInput>({ ...DEFAULT_U_INPUT });
  const [geoArea, setGeoArea] = useState<string>("");
  const [tubeGeo, setTubeGeo] = useState<TubeGeometryInput>({
    tubeOD_mm: 25.4, tubeWT_mm: 2.11, tubeLength_m: 6.0,
    tubePitch: "triangular", pitchRatio: 1.25, tubePasses: 2, tubeSideDensity: 1000,
  });
  const [tubeGeoResult, setTubeGeoResult] = useState<TubeGeometryResult | null>(null);
  const [temaGuidance, setTemaGuidance] = useState<TEMAGuidance | null>(null);
  const [result, setResult] = useState<HXFullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProject = (k: keyof HXProject, v: unknown) => setProject(p => ({ ...p, [k]: v }));
  const updateConfig = (k: keyof ExchangerConfig, v: unknown) => setConfig(p => ({ ...p, [k]: v }));
  const updateUInput = (k: keyof UInput, v: unknown) => setUInput(p => ({ ...p, [k]: v }));

  const updateCase = (idx: number, k: keyof OperatingCase, v: unknown) =>
    setCases(prev => prev.map((c, i) => i === idx ? { ...c, [k]: v } : c));
  const updateCaseHot = (idx: number, k: keyof StreamSide, v: unknown) =>
    setCases(prev => prev.map((c, i) => i === idx ? { ...c, hotSide: { ...c.hotSide, [k]: v } } : c));
  const updateCaseCold = (idx: number, k: keyof StreamSide, v: unknown) =>
    setCases(prev => prev.map((c, i) => i === idx ? { ...c, coldSide: { ...c.coldSide, [k]: v } } : c));

  const addCase = () => {
    const id = `case_${Date.now()}`;
    setCases(prev => [...prev, {
      ...DEFAULT_CASE, id, name: `Case ${prev.length + 1}`, caseType: "maximum",
      hotSide: { ...DEFAULT_STREAM, name: "Hot Side" },
      coldSide: { ...DEFAULT_STREAM, name: "Cold Side" },
    }]);
  };

  const removeCase = (idx: number) => {
    if (cases.length <= 1) return;
    setCases(prev => prev.filter((_, i) => i !== idx));
  };

  const recomputeTubeGeo = () => {
    if (!result?.governingCase || !temaGuidance) return;
    const gc = result.governingCase;
    const tubeSideMassFlow = temaGuidance.tubeSideIsHot ? gc.hotSide.mDot : gc.coldSide.mDot;
    if (gc.aDesign > 0 && tubeSideMassFlow > 0) {
      setTubeGeoResult(computeTubeGeometry(gc.aDesign, tubeSideMassFlow, tubeGeo));
    }
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const convertedCases = cases.map(c => {
        const cc = { ...c };
        cc.hotSide = { ...c.hotSide };
        cc.coldSide = { ...c.coldSide };
        if (unitSystem !== "SI") {
          cc.hotSide.tIn = convertToSI("temperature", c.hotSide.tIn, unitSystem);
          cc.hotSide.tOut = convertToSI("temperature", c.hotSide.tOut, unitSystem);
          cc.coldSide.tIn = convertToSI("temperature", c.coldSide.tIn, unitSystem);
          cc.coldSide.tOut = convertToSI("temperature", c.coldSide.tOut, unitSystem);
          cc.hotSide.mDot = convertToSI("flowMass", c.hotSide.mDot, unitSystem);
          cc.coldSide.mDot = convertToSI("flowMass", c.coldSide.mDot, unitSystem);
        }
        return cc;
      });

      const geo = geoArea ? parseFloat(geoArea) : undefined;
      // approachTempMin is a temperature DIFFERENCE — convert with multiplier only (no offset)
      const convertedConfig = unitSystem !== "SI"
        ? { ...config, approachTempMin: config.approachTempMin * 5 / 9 }
        : config;
      const r = calculateHeatExchangerFull(project, convertedCases, convertedConfig, uInput, geo);
      setResult(r);

      if (r.governingCase) {
        const gc = r.governingCase;
        const guidance = generateTEMAGuidance(gc.hotSide, gc.coldSide, Math.abs(gc.hotSide.tIn - gc.coldSide.tIn), config);
        setTemaGuidance(guidance);

        const tubeSideMassFlow = guidance.tubeSideIsHot ? gc.hotSide.mDot : gc.coldSide.mDot;
        if (gc.aDesign > 0 && tubeSideMassFlow > 0) {
          const tgr = computeTubeGeometry(gc.aDesign, tubeSideMassFlow, tubeGeo);
          setTubeGeoResult(tgr);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null); setResult(null);
    setProject({ ...DEFAULT_PROJECT, name: "Oil Cooler HX", caseId: "HX-001", engineer: "HEM" });
    setCases([{ ...HX_TEST_CASE_OIL_COOLER }]);
    setConfig({ ...HX_TEST_CONFIG });
    setUInput({ ...HX_TEST_U_INPUT });
    setGeoArea("");
  };

  const handleReset = () => {
    setProject({ ...DEFAULT_PROJECT });
    setCases([{ ...DEFAULT_CASE }]);
    setConfig({ ...DEFAULT_CONFIG });
    setUInput({ ...DEFAULT_U_INPUT });
    setGeoArea("");
    setTubeGeoResult(null); setTemaGuidance(null);
    setResult(null); setError(null);
    setActiveTab("basis");
  };

  const handleExportPDF = () => {
    if (!result || !result.governingCase) return;
    const gc = result.governingCase;
    const html = buildCalcNoteHTML(result, gc, project);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const buildExportData = (): ExportDatasheet | null => {
    if (!result || !result.governingCase) return null;
    const gc = result.governingCase;
    const inputs: ExportDatasheet["inputs"] = [
      { label: "Flow Arrangement", value: config.arrangement.replace(/_/g, " ") },
      { label: "Shell Passes", value: config.shellPasses },
      { label: "Tube Passes", value: config.tubePasses },
      { label: "Min Approach Temp", value: config.approachTempMin, unit: "°C" },
      { label: "F-Factor Value", value: config.fValue },
      { label: "U Mode", value: uInput.mode.replace(/_/g, " ") },
    ];
    if (uInput.mode === "clean_plus_fouling") {
      inputs.push(
        { label: "U_clean", value: uInput.uClean, unit: "W/(m²·K)" },
        { label: "Rf_hot", value: uInput.rfHot, unit: "m²·K/W" },
        { label: "Rf_cold", value: uInput.rfCold, unit: "m²·K/W" },
      );
    } else if (uInput.mode === "fouled_direct") {
      inputs.push({ label: "U_fouled", value: uInput.uFouled, unit: "W/(m²·K)" });
    } else if (uInput.mode === "estimated") {
      inputs.push({ label: "Service Category", value: uInput.serviceCategory || "-" });
    }
    inputs.push({ label: "Design Margin", value: uInput.designMargin, unit: "%" });
    cases.forEach((c, i) => {
      inputs.push(
        { label: `Case ${i + 1} Name`, value: c.name },
        { label: `Case ${i + 1} Type`, value: c.caseType },
        { label: `Case ${i + 1} Hot T_in`, value: c.hotSide.tIn, unit: "°C" },
        { label: `Case ${i + 1} Hot T_out`, value: c.hotSide.tOut, unit: "°C" },
        { label: `Case ${i + 1} Hot Flow`, value: c.hotSide.mDot, unit: "kg/h" },
        { label: `Case ${i + 1} Hot Cp`, value: c.hotSide.cp, unit: "kJ/(kg·K)" },
        { label: `Case ${i + 1} Cold T_in`, value: c.coldSide.tIn, unit: "°C" },
        { label: `Case ${i + 1} Cold T_out`, value: c.coldSide.tOut, unit: "°C" },
        { label: `Case ${i + 1} Cold Flow`, value: c.coldSide.mDot, unit: "kg/h" },
        { label: `Case ${i + 1} Cold Cp`, value: c.coldSide.cp, unit: "kJ/(kg·K)" },
      );
    });
    const results: ExportDatasheet["results"] = [
      { label: "Heat Duty", value: gc.dutyKW, unit: "kW", highlight: true },
      { label: "Hot Side Duty", value: gc.hotDutyKW, unit: "kW" },
      { label: "Cold Side Duty", value: gc.coldDutyKW, unit: "kW" },
      { label: "ΔT1", value: gc.dT1, unit: "°C" },
      { label: "ΔT2", value: gc.dT2, unit: "°C" },
      { label: "LMTD", value: gc.lmtd, unit: "°C" },
      { label: "R (capacity ratio)", value: gc.R, unit: "-" },
      { label: "P (effectiveness)", value: gc.P, unit: "-" },
      { label: "F (correction factor)", value: gc.F, unit: "-" },
      { label: "Corrected LMTD", value: gc.correctedLMTD, unit: "°C", highlight: true },
      { label: "U_clean", value: gc.uClean, unit: "W/(m²·K)" },
      { label: "U_fouled", value: gc.uFouled, unit: "W/(m²·K)" },
      { label: "Total Rf", value: gc.totalFoulingResistance, unit: "m²·K/W" },
      { label: "UA_req", value: gc.uaReq, unit: "W/K" },
      { label: "A_req", value: gc.aReq, unit: "m²" },
      { label: "A_design", value: gc.aDesign, unit: "m²", highlight: true },
      { label: "Overdesign", value: gc.overdesignPct, unit: "%" },
      { label: "Cleanliness Factor", value: gc.cleanlinessFactor * 100, unit: "%" },
      { label: "Approach Temp", value: gc.approachTemp, unit: "°C" },
      { label: "ε (effectiveness)", value: gc.effectiveness * 100, unit: "%" },
      { label: "NTU", value: gc.ntu, unit: "-" },
      { label: "C_r (capacity ratio)", value: gc.capacityRatio, unit: "-" },
    ];
    const calcSteps: ExportDatasheet["calcSteps"] = gc.trace.steps.map(s => ({
      label: s.name, equation: s.equation, value: s.result, unit: "",
    }));
    const additionalSections: ExportDatasheet["additionalSections"] = [];
    if (result.cases.length > 1) {
      additionalSections.push({
        title: "Case Comparison — A_design",
        items: result.cases.map(cr => ({ label: cr.caseName, value: cr.aDesign, unit: "m²" })),
      });
    }
    if (result.geometry) {
      additionalSections.push({
        title: "Geometry Check",
        items: [
          { label: "A selected", value: result.geometry.aSelected, unit: "m²" },
          { label: "Q achieved", value: result.geometry.qAchieved, unit: "kW" },
          { label: "Excess area", value: result.geometry.excessArea, unit: "%" },
        ],
      });
    }
    return {
      calculatorName: "Heat Exchanger Sizing (LMTD)",
      projectInfo: [
        { label: "Case Name", value: project.name || "-" },
        { label: "Case ID", value: project.caseId || "-" },
        { label: "Engineer", value: project.engineer || "-" },
        { label: "Date", value: project.date || "-" },
      ],
      inputs, results,
      calcSteps: calcSteps.length > 0 ? calcSteps : undefined,
      additionalSections: additionalSections.length > 0 ? additionalSections : undefined,
      methodology: [
        "LMTD method: Q = U × A × F × LMTD",
        "F-correction factor for multi-pass configurations (Bowman et al.)",
        "U_fouled = 1 / (1/U_clean + Rf_hot + Rf_cold)",
        "Design area includes user-specified margin percentage",
        "Energy balance check: Q_hot vs Q_cold within specified tolerance",
      ],
      assumptions: gc.trace.assumptions,
      references: [
        "Kern, D.Q. Process Heat Transfer (1950)",
        "TEMA Standards, 10th Edition",
        "Perry's Chemical Engineers' Handbook, Section 11",
        "Bowman, Mueller & Nagle, Trans. ASME 62 (1940)",
        "Ludwig, E.E. Applied Process Design, Vol. 3",
      ],
      warnings: [
        ...gc.trace.warnings,
        ...gc.trace.flags.map(f => FLAG_LABELS[f] || f.replace(/_/g, " ")),
      ].filter(Boolean),
    };
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Heat Exchanger Sizing</h1>
            <p className="text-sm text-muted-foreground">LMTD method · F-correction · TEMA guidance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UnitSelector value={unitSystem} onChange={setUnitSystem} />
          <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
            <FlaskConical className="w-3.5 h-3.5 mr-1" /> Test Case
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((t, i) => {
          const isCurrent = activeTab === t.id;
          const isCompleted = tabIdx > i;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${isCurrent ? "bg-primary/15 text-primary border border-primary/30" :
                  isCompleted ? "bg-muted/50 text-foreground hover:bg-muted/80" :
                  "text-muted-foreground hover:bg-muted/30"}`}
              data-testid={`step-${t.id}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                ${isCurrent ? "bg-primary text-primary-foreground" :
                  isCompleted ? "bg-primary/40 text-primary-foreground" :
                  "bg-muted text-muted-foreground"}`}>
                {isCompleted ? "✓" : t.step}
              </span>
              <span className="hidden sm:inline">{t.label}</span>
              {i < TABS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 ml-1" />}
            </button>
          );
        })}
      </div>

      {result && result.globalFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" data-testid="flags-banner">
          {result.globalFlags.map(f => (
            <Badge key={f} variant={FLAG_SEVERITY[f] === "error" ? "destructive" : "secondary"} className="text-xs" data-testid={`flag-${f}`}>
              {FLAG_SEVERITY[f] === "error" || FLAG_SEVERITY[f] === "warning"
                ? <AlertTriangle className="w-3 h-3 mr-1" />
                : <Info className="w-3 h-3 mr-1" />}
              {f.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        <TabsList className="hidden">
          {TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
        </TabsList>

        {/* ─── TAB 1: BASIS ─── */}
        <TabsContent value="basis">
          <div className="space-y-4">
            <StepHeader step={1} title="Define Basis of Design" desc="Enter project information and operating conditions for hot and cold streams." />

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary/70" /> Project Setup
                </h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Case Name / ID</Label>
                    <Input value={project.name} onChange={e => updateProject("name", e.target.value)} data-testid="input-case-name" /></div>
                  <div><Label className="text-xs mb-1.5 block">Case Number</Label>
                    <Input value={project.caseId} onChange={e => updateProject("caseId", e.target.value)} data-testid="input-case-id" /></div>
                  <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                    <Input value={project.engineer} onChange={e => updateProject("engineer", e.target.value)} data-testid="input-engineer" /></div>
                  <div><Label className="text-xs mb-1.5 block">Date</Label>
                    <Input type="date" value={project.date} onChange={e => updateProject("date", e.target.value)} data-testid="input-date" /></div>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Options</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={project.strictEnergyBalance} onCheckedChange={v => updateProject("strictEnergyBalance", v)} id="strict-eb" data-testid="check-strict-eb" />
                      <Label htmlFor="strict-eb" className="text-xs">Strict energy balance enforcement</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={project.allowApproxF} onCheckedChange={v => updateProject("allowApproxF", v)} id="approx-f" data-testid="check-approx-f" />
                      <Label htmlFor="approx-f" className="text-xs">Allow approximate F correlation</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={project.allowEstimatedU} onCheckedChange={v => updateProject("allowEstimatedU", v)} id="est-u" data-testid="check-est-u" />
                      <Label htmlFor="est-u" className="text-xs">Allow approximate U estimation</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={project.showSteps} onCheckedChange={v => updateProject("showSteps", v)} id="show-steps" data-testid="check-show-steps" />
                      <Label htmlFor="show-steps" className="text-xs">Show step-by-step calculation trace</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs whitespace-nowrap">Energy balance tolerance (%)</Label>
                      <NumericInput className="w-20 h-8 text-xs" value={project.balanceTolerance} onValueChange={v => updateProject("balanceTolerance", v || 5)} data-testid="input-balance-tol" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Droplets className="w-4 h-4 text-primary/70" /> Operating Cases & Stream Data
              </h3>
              <Button size="sm" variant="outline" onClick={addCase} data-testid="button-add-case">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Case
              </Button>
            </div>

            {unitSystem === "Field" && (
              <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                <Info className="w-3 h-3 inline mr-1" />
                Temperatures in {pU("temperature", unitSystem)}, flows in {pU("flowMass", unitSystem)}. Cp always in kJ/(kg·K).
              </p>
            )}

            {cases.map((c, idx) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input className="w-40 h-8 text-xs" value={c.name} onChange={e => updateCase(idx, "name", e.target.value)} data-testid={`input-case-name-${idx}`} />
                      <Select value={c.caseType} onValueChange={v => updateCase(idx, "caseType", v)}>
                        <SelectTrigger className="w-28 h-8 text-xs" data-testid={`select-case-type-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="minimum">Minimum</SelectItem>
                          <SelectItem value="maximum">Maximum</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={c.dutyMode} onValueChange={v => updateCase(idx, "dutyMode", v as DutyMode)}>
                        <SelectTrigger className="w-44 h-8 text-xs" data-testid={`select-duty-mode-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both_outlets_known">Both outlets known</SelectItem>
                          <SelectItem value="one_outlet_unknown">One outlet unknown</SelectItem>
                          <SelectItem value="duty_given">Duty given</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {cases.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeCase(idx)} data-testid={`button-remove-case-${idx}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {c.dutyMode === "duty_given" && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Duty (kW)</Label>
                      <NumericInput className="w-32 h-8 text-xs" value={c.dutyKW} onValueChange={v => updateCase(idx, "dutyKW", v)} data-testid={`input-duty-${idx}`} />
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 p-3 rounded-lg border border-red-500/15 bg-red-950/5">
                      <p className="text-xs font-semibold text-red-400/90 uppercase tracking-wider">Hot Side</p>
                      <div className="grid gap-2 grid-cols-2">
                        <div><Label className="text-xs mb-1 block">T_in ({pU("temperature", unitSystem)})</Label>
                          <NumericInput className="h-8 text-xs" value={c.hotSide.tIn} onValueChange={v => updateCaseHot(idx, "tIn", v)} data-testid={`input-thi-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">T_out ({pU("temperature", unitSystem)}){c.dutyMode === "one_outlet_unknown" && !c.hotSide.tOutKnown ? " (auto)" : ""}</Label>
                          <NumericInput className="h-8 text-xs" value={c.hotSide.tOut} onValueChange={v => updateCaseHot(idx, "tOut", v)}
                            disabled={c.dutyMode === "one_outlet_unknown" && !c.hotSide.tOutKnown}
                            data-testid={`input-tho-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">Flow ({pU("flowMass", unitSystem)})</Label>
                          <NumericInput className="h-8 text-xs" value={c.hotSide.mDot} onValueChange={v => updateCaseHot(idx, "mDot", v)} data-testid={`input-hot-flow-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">Cp (kJ/(kg·K))</Label>
                          <NumericInput className="h-8 text-xs" value={c.hotSide.cp} onValueChange={v => updateCaseHot(idx, "cp", v)} data-testid={`input-hot-cp-${idx}`} /></div>
                      </div>
                      {c.dutyMode === "one_outlet_unknown" && (
                        <div className="flex items-center gap-2">
                          <Checkbox checked={c.hotSide.tOutKnown} onCheckedChange={v => {
                            updateCaseHot(idx, "tOutKnown", !!v);
                            if (v) updateCaseCold(idx, "tOutKnown", false);
                          }} id={`hot-out-known-${idx}`} data-testid={`check-hot-out-known-${idx}`} />
                          <Label htmlFor={`hot-out-known-${idx}`} className="text-xs">Hot outlet known</Label>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-3 rounded-lg border border-blue-500/15 bg-blue-950/5">
                      <p className="text-xs font-semibold text-blue-400/90 uppercase tracking-wider">Cold Side</p>
                      <div className="grid gap-2 grid-cols-2">
                        <div><Label className="text-xs mb-1 block">T_in ({pU("temperature", unitSystem)})</Label>
                          <NumericInput className="h-8 text-xs" value={c.coldSide.tIn} onValueChange={v => updateCaseCold(idx, "tIn", v)} data-testid={`input-tci-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">T_out ({pU("temperature", unitSystem)}){c.dutyMode === "one_outlet_unknown" && !c.coldSide.tOutKnown ? " (auto)" : ""}</Label>
                          <NumericInput className="h-8 text-xs" value={c.coldSide.tOut} onValueChange={v => updateCaseCold(idx, "tOut", v)}
                            disabled={c.dutyMode === "one_outlet_unknown" && !c.coldSide.tOutKnown}
                            data-testid={`input-tco-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">Flow ({pU("flowMass", unitSystem)})</Label>
                          <NumericInput className="h-8 text-xs" value={c.coldSide.mDot} onValueChange={v => updateCaseCold(idx, "mDot", v)} data-testid={`input-cold-flow-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">Cp (kJ/(kg·K))</Label>
                          <NumericInput className="h-8 text-xs" value={c.coldSide.cp} onValueChange={v => updateCaseCold(idx, "cp", v)} data-testid={`input-cold-cp-${idx}`} /></div>
                      </div>
                      {c.dutyMode === "one_outlet_unknown" && (
                        <div className="flex items-center gap-2">
                          <Checkbox checked={c.coldSide.tOutKnown} onCheckedChange={v => {
                            updateCaseCold(idx, "tOutKnown", !!v);
                            if (v) updateCaseHot(idx, "tOutKnown", false);
                          }} id={`cold-out-known-${idx}`} data-testid={`check-cold-out-known-${idx}`} />
                          <Label htmlFor={`cold-out-known-${idx}`} className="text-xs">Cold outlet known</Label>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAB 2: CONFIGURATION ─── */}
        <TabsContent value="config">
          <div className="space-y-4">
            <StepHeader step={2} title="Exchanger Configuration" desc="Set flow arrangement, shell/tube passes, overall heat transfer coefficient, and fouling resistances." />

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary/70" /> Flow Arrangement & Passes
                </h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">Flow Arrangement</Label>
                    <Select value={config.arrangement} onValueChange={v => updateConfig("arrangement", v as FlowArrangement)}>
                      <SelectTrigger data-testid="select-arrangement"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="counter_current">Counter-Current (F = 1)</SelectItem>
                        <SelectItem value="co_current">Co-Current (F = 1)</SelectItem>
                        <SelectItem value="1_2_pass">1-2 Shell & Tube (F &lt; 1)</SelectItem>
                        <SelectItem value="custom_F">Custom (user-entered F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {config.arrangement === "1_2_pass" && (
                    <div>
                      <Label className="text-xs mb-1.5 block">F-Factor Mode</Label>
                      <Select value={config.fMode} onValueChange={v => updateConfig("fMode", v as FMode)}>
                        <SelectTrigger data-testid="select-f-mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user_entered">User-entered F</SelectItem>
                          {project.allowApproxF && <SelectItem value="approximate_correlation">Approximate correlation</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(config.arrangement === "custom_F" || (config.arrangement === "1_2_pass" && config.fMode === "user_entered")) && (
                    <div>
                      <Label className="text-xs mb-1.5 block">F-Factor Value (0.5–1.0)</Label>
                      <NumericInput min={0.5} max={1} step={0.01} value={config.fValue} onValueChange={v => updateConfig("fValue", v || 1)} data-testid="input-f-value" />
                      <p className="text-xs text-muted-foreground mt-1">Typical: 0.75–1.0. Below 0.75 = inefficient configuration.</p>
                    </div>
                  )}
                  {config.arrangement === "1_2_pass" && config.fMode === "approximate_correlation" && (
                    <div className="sm:col-span-2 p-3 rounded-md bg-amber-950/30 text-amber-200 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                      F computed from approximate correlation — verify with TEMA charts for final design.
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t grid gap-4 sm:grid-cols-3">
                  <div><Label className="text-xs mb-1.5 block">Shell Passes</Label>
                    <NumericInput min={1} value={config.shellPasses} onValueChange={v => updateConfig("shellPasses", Math.round(v) || 1)} data-testid="input-shell-passes" /></div>
                  <div><Label className="text-xs mb-1.5 block">Tube Passes</Label>
                    <NumericInput min={1} value={config.tubePasses} onValueChange={v => updateConfig("tubePasses", Math.round(v) || 1)} data-testid="input-tube-passes" /></div>
                  <div><Label className="text-xs mb-1.5 block">Min Approach Temp ({pU("temperature", unitSystem)})</Label>
                    <NumericInput value={config.approachTempMin} onValueChange={v => updateConfig("approachTempMin", v || 5)} data-testid="input-approach" /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-primary/70" /> Overall U & Fouling Resistances
                </h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label className="text-xs mb-1.5 block">U Handling Mode</Label>
                  <Select value={uInput.mode} onValueChange={v => updateUInput("mode", v as UMode)}>
                    <SelectTrigger data-testid="select-u-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clean_plus_fouling">U_clean + Fouling Resistances</SelectItem>
                      <SelectItem value="fouled_direct">U_fouled (direct entry)</SelectItem>
                      {project.allowEstimatedU && <SelectItem value="estimated">Estimate from service category</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {uInput.mode === "clean_plus_fouling" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">U_clean (W/(m²·K))</Label>
                      <NumericInput value={uInput.uClean} onValueChange={v => updateUInput("uClean", v)} data-testid="input-u-clean" /></div>
                    <div>
                      <Label className="text-xs mb-1.5 block">U Guidance (typical values)</Label>
                      <Select onValueChange={v => {
                        const svc = TYPICAL_U_VALUES[v];
                        if (svc) updateUInput("uClean", svc.typical);
                      }}>
                        <SelectTrigger data-testid="select-u-guidance"><SelectValue placeholder="Select service..." /></SelectTrigger>
                        <SelectContent>{Object.entries(TYPICAL_U_VALUES).map(([k, v]) =>
                          <SelectItem key={k} value={k}>{k} ({v.low}–{v.high})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Rf_hot (m²·K/W)</Label>
                      <div className="flex gap-2">
                        <NumericInput step="0.0001" className="flex-1" value={uInput.rfHot} onValueChange={v => updateUInput("rfHot", v)} data-testid="input-rf-hot" />
                        <Select onValueChange={v => { const f = TEMA_FOULING_FACTORS[v]; if (f) updateUInput("rfHot", f.rf); }}>
                          <SelectTrigger className="w-[180px] h-9 text-xs" data-testid="select-rf-hot-preset"><SelectValue placeholder="TEMA preset..." /></SelectTrigger>
                          <SelectContent>{Object.entries(TEMA_FOULING_FACTORS).map(([k, v]) =>
                            <SelectItem key={k} value={k} className="text-xs">{k} ({v.rf.toExponential(2)})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Rf_cold (m²·K/W)</Label>
                      <div className="flex gap-2">
                        <NumericInput step="0.0001" className="flex-1" value={uInput.rfCold} onValueChange={v => updateUInput("rfCold", v)} data-testid="input-rf-cold" />
                        <Select onValueChange={v => { const f = TEMA_FOULING_FACTORS[v]; if (f) updateUInput("rfCold", f.rf); }}>
                          <SelectTrigger className="w-[180px] h-9 text-xs" data-testid="select-rf-cold-preset"><SelectValue placeholder="TEMA preset..." /></SelectTrigger>
                          <SelectContent>{Object.entries(TEMA_FOULING_FACTORS).map(([k, v]) =>
                            <SelectItem key={k} value={k} className="text-xs">{k} ({v.rf.toExponential(2)})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {uInput.mode === "fouled_direct" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">U_fouled (W/(m²·K))</Label>
                      <NumericInput value={uInput.uFouled} onValueChange={v => updateUInput("uFouled", v)} data-testid="input-u-fouled" /></div>
                  </div>
                )}

                {uInput.mode === "estimated" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-amber-950/30 text-amber-200 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                      U estimated from service category — HIGH UNCERTAINTY. Verify with vendor data.
                    </div>
                    <div><Label className="text-xs mb-1.5 block">Service Category</Label>
                      <Select value={uInput.serviceCategory} onValueChange={v => updateUInput("serviceCategory", v)}>
                        <SelectTrigger data-testid="select-service-cat"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{Object.entries(TYPICAL_U_VALUES).map(([k, v]) =>
                          <SelectItem key={k} value={k}>{k} ({v.low}–{v.high} W/(m²·K))</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Design Margin (%)</Label>
                      <NumericInput value={uInput.designMargin} onValueChange={v => updateUInput("designMargin", v)} data-testid="input-margin" /></div>
                  </div>
                </div>

                <div className="p-3 rounded-md border border-dashed border-muted-foreground/20 bg-muted/20">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Governing Equation</p>
                  <p className="text-xs font-mono text-primary/80">U_fouled = 1 / (1/U_clean + R_f,hot + R_f,cold)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 3: THERMAL DESIGN ─── */}
        <TabsContent value="thermal">
          <div className="space-y-4">
            <StepHeader step={3} title="Thermal Design Calculation" desc="Calculate heat duty, LMTD, F-correction factor, and required heat transfer area." />

            <Card className="border-primary/20">
              <CardContent className="py-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    {result ? "Results computed. Modify inputs and recalculate, or proceed to Geometry."
                      : "Configure basis and settings in the previous tabs, then run the thermal design calculation."}
                  </p>
                  <Button size="lg" onClick={handleCalculate} data-testid="button-calculate" className="min-w-[220px]">
                    <Calculator className="w-4 h-4 mr-2" />
                    {result ? "Recalculate" : "Calculate Heat Exchanger"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md flex items-start gap-2" data-testid="text-error">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </div>
            )}

            {result && result.cases.map((cr, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 pt-2">
                  <Thermometer className="w-4 h-4 text-primary/70" />
                  {cr.caseName}
                  <Badge variant="secondary" className="text-[10px]">{cr.caseType}</Badge>
                  {result.governingCase?.caseName === cr.caseName && (
                    <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Governing</Badge>
                  )}
                </h3>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">1</span>
                      Energy Balance
                    </h4>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="space-y-1">
                      <EqLine eq="Q_hot = ṁ_hot × Cp_hot × (T_h,in − T_h,out)" val={`${fmtN(cr.hotDutyKW)} kW`} />
                      <EqLine eq="Q_cold = ṁ_cold × Cp_cold × (T_c,out − T_c,in)" val={`${fmtN(cr.coldDutyKW)} kW`} />
                      <EqLine eq="Q_design (governing)" val={`${fmtN(cr.dutyKW)} kW`} highlight />
                    </div>
                    {Math.abs(cr.hotDutyKW - cr.coldDutyKW) / Math.max(cr.hotDutyKW, cr.coldDutyKW) > 0.01 && (
                      <p className="text-[10px] text-amber-300 mt-1">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        Energy imbalance: {((Math.abs(cr.hotDutyKW - cr.coldDutyKW) / Math.max(cr.hotDutyKW, cr.coldDutyKW)) * 100).toFixed(1)}%
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">2</span>
                      Log Mean Temperature Difference
                    </h4>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="space-y-1">
                      {result.config.arrangement === "co_current" ? (
                        <>
                          <EqLine eq="ΔT₁ = T_h,in − T_c,in  (co-current inlet pairing)" val={`${fmtN(cr.dT1)} °C`} />
                          <EqLine eq="ΔT₂ = T_h,out − T_c,out  (co-current outlet pairing)" val={`${fmtN(cr.dT2)} °C`} />
                        </>
                      ) : (
                        <>
                          <EqLine eq="ΔT₁ = T_h,in − T_c,out  (counter-current hot-inlet end)" val={`${fmtN(cr.dT1)} °C`} />
                          <EqLine eq="ΔT₂ = T_h,out − T_c,in  (counter-current hot-outlet end)" val={`${fmtN(cr.dT2)} °C`} />
                        </>
                      )}
                      <EqLine eq="LMTD = (ΔT₁ − ΔT₂) / ln(ΔT₁ / ΔT₂)" val={`${fmtN(cr.lmtd)} °C`} highlight />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">3</span>
                      F-Factor Correction
                    </h4>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="space-y-1">
                      <EqLine eq="R = (T_h,in − T_h,out) / (T_c,out − T_c,in)" val={fmtN(cr.R, 4)} />
                      <EqLine eq="P = (T_c,out − T_c,in) / (T_h,in − T_c,in)" val={fmtN(cr.P, 4)} />
                      <EqLine eq={`F = ${cr.F === 1 ? "1.0 (pure counter/co-current)" : "f(R, P)"}`} val={fmtN(cr.F, 4)} highlight={cr.F < 0.8} />
                      <EqLine eq="LMTD_corrected = F × LMTD" val={`${fmtN(cr.correctedLMTD)} °C`} highlight />
                    </div>
                    {cr.F < 0.8 && (
                      <p className="text-[10px] text-amber-300 mt-1">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        F &lt; 0.80 — consider additional shell passes or different arrangement.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">4</span>
                      Heat Transfer Area
                    </h4>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="space-y-1">
                      <EqLine eq="U_fouled = 1 / (1/U_clean + Rf_hot + Rf_cold)" val={`${fmtN(cr.uFouled)} W/(m²·K)`} />
                      <EqLine eq="A_required = Q / (U_fouled × F × LMTD)" val={`${fmtN(cr.aReq)} m²`} />
                      <EqLine eq={`A_design = A_req × (1 + ${uInput.designMargin}%)`} val={`${fmtN(cr.aDesign)} m²`} highlight />
                    </div>
                    <div className="grid gap-2 grid-cols-3 sm:grid-cols-5 mt-3">
                      <ResultBox label="U_clean" value={`${fmtN(cr.uClean)}`} sub="W/(m²·K)" />
                      <ResultBox label="Rf total" value={cr.totalFoulingResistance.toExponential(2)} sub="m²·K/W" />
                      <ResultBox label="CF" value={`${(cr.cleanlinessFactor * 100).toFixed(0)}%`} />
                      <ResultBox label="Approach" value={`${fmtN(cr.approachTemp)} °C`} highlight={cr.approachTemp < 5} />
                      <ResultBox label="ε" value={`${(cr.effectiveness * 100).toFixed(1)}%`} />
                    </div>
                  </CardContent>
                </Card>

                {project.showSteps && cr.trace.steps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Calculation Trace</h4>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {cr.trace.steps.map((step, si) => (
                          <div key={si} className="text-xs bg-muted/30 p-2 rounded-md font-mono">
                            <span className="text-muted-foreground">{step.name}:</span>{" "}
                            <span className="text-primary/80">{step.equation}</span>
                            <br />
                            <span className="text-muted-foreground/70">{step.substitution}</span>
                            <span className="text-foreground font-medium"> = {step.result}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {cr.trace.warnings.length > 0 && (
                  <div className="space-y-1">
                    {cr.trace.warnings.map((w, wi) => (
                      <div key={wi} className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950/30 p-2 rounded-md">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /><span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAB 4: GEOMETRY ─── */}
        <TabsContent value="geometry">
          <div className="space-y-4">
            <StepHeader step={4} title="Mechanical Layout & TEMA Guidance" desc="Select tube geometry, estimate tube count and shell diameter, verify area, and review TEMA type recommendations." />

            {!result?.governingCase ? (
              <Card><CardContent className="py-10 text-center">
                <Box className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Run the thermal design calculation first (Step 3).</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("thermal")} data-testid="button-go-thermal">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Go to Thermal Design
                </Button>
              </CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Box className="w-4 h-4 text-primary/70" /> Tube Sizing (Preliminary)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Select tube dimensions to estimate tube count, bundle/shell diameter, and tube-side velocity.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Tube OD × BWG</Label>
                        <Select value={`${tubeGeo.tubeOD_mm}_${tubeGeo.tubeWT_mm}`} onValueChange={v => {
                          const [od, wt] = v.split("_").map(Number);
                          setTubeGeo(g => ({ ...g, tubeOD_mm: od, tubeWT_mm: wt }));
                        }}>
                          <SelectTrigger className="text-xs" data-testid="select-tube-size"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STANDARD_TUBE_SIZES.map(t => (
                              <SelectItem key={`${t.od_mm}_${t.wt_mm}`} value={`${t.od_mm}_${t.wt_mm}`} className="text-xs">
                                {t.od_mm} mm OD × BWG {t.bwg} (WT {t.wt_mm}, ID {t.id_mm} mm)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Tube Length (m)</Label>
                        <Select value={String(tubeGeo.tubeLength_m)} onValueChange={v => setTubeGeo(g => ({ ...g, tubeLength_m: parseFloat(v) }))}>
                          <SelectTrigger className="text-xs" data-testid="select-tube-length"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[2.44, 3.05, 3.66, 4.88, 6.10].map(l => (
                              <SelectItem key={l} value={String(l)} className="text-xs">{l} m ({(l * 3.281).toFixed(0)} ft)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Tube Pitch</Label>
                        <Select value={tubeGeo.tubePitch} onValueChange={v => setTubeGeo(g => ({ ...g, tubePitch: v as "triangular" | "square" }))}>
                          <SelectTrigger className="text-xs" data-testid="select-tube-pitch"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="triangular">Triangular (30°) — higher HTC</SelectItem>
                            <SelectItem value="square">Square (90°) — easier cleaning</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Pitch Ratio (Pt/OD)</Label>
                        <NumericInput step={0.05} min={1.1} max={1.5} className="text-xs" value={tubeGeo.pitchRatio}
                          onValueChange={v => setTubeGeo(g => ({ ...g, pitchRatio: v || 1.25 }))} data-testid="input-pitch-ratio" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">Typical: 1.25 (tri), 1.25–1.33 (sq)</p>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Tube Passes</Label>
                        <Select value={String(tubeGeo.tubePasses)} onValueChange={v => setTubeGeo(g => ({ ...g, tubePasses: parseInt(v) }))}>
                          <SelectTrigger className="text-xs" data-testid="select-geo-tube-passes"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 4, 6, 8].map(n => (
                              <SelectItem key={n} value={String(n)} className="text-xs">{n}-pass</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Tube-Side Density (kg/m³)</Label>
                        <NumericInput className="text-xs" value={tubeGeo.tubeSideDensity}
                          onValueChange={v => setTubeGeo(g => ({ ...g, tubeSideDensity: v }))} data-testid="input-tube-density" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">Water ≈ 1000, light HC ≈ 700</p>
                      </div>
                    </div>

                    <Button size="sm" variant="outline" onClick={recomputeTubeGeo} data-testid="button-recompute-tube-geo">
                      Recalculate Tube Layout
                    </Button>

                    {tubeGeoResult && (
                      <div className="pt-3 border-t space-y-3">
                        <p className="text-xs font-medium text-muted-foreground">Preliminary Tube Layout</p>
                        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                          <ResultBox label="Tube ID" value={`${tubeGeoResult.tubeID_mm.toFixed(1)} mm`} />
                          <ResultBox label="m²/tube" value={tubeGeoResult.singleTubeArea_m2.toFixed(4)} />
                          <ResultBox label="No. Tubes" value={`${tubeGeoResult.numberOfTubes}`} highlight />
                          <ResultBox label="Bundle Ø" value={`${tubeGeoResult.bundleDiameter_mm.toFixed(0)} mm`} />
                          <ResultBox label="Shell ID" value={`${tubeGeoResult.shellID_mm.toFixed(0)} mm`} highlight />
                          <ResultBox label="Tube Vel." value={`${tubeGeoResult.tubeSideVelocity_ms.toFixed(2)} m/s`}
                            highlight={tubeGeoResult.velocityCheck !== "ok"} />
                        </div>
                        <div className={`text-xs p-2 rounded-md ${
                          tubeGeoResult.velocityCheck === "ok" ? "bg-green-950/30 text-green-300" :
                          tubeGeoResult.velocityCheck === "low" ? "bg-amber-950/30 text-amber-200" :
                          "bg-red-950/30 text-red-300"
                        }`}>
                          {tubeGeoResult.velocityCheck === "ok" ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {tubeGeoResult.velocityNote}
                        </div>
                        {project.showSteps && (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {tubeGeoResult.steps.map((step, si) => (
                              <div key={si} className="text-xs bg-muted/30 p-2 rounded-md font-mono">
                                <span className="text-muted-foreground">{step.name}:</span>{" "}
                                <span className="text-primary/80">{step.equation}</span>
                                <br />
                                <span className="text-muted-foreground/70">{step.substitution}</span>
                                <span className="text-foreground font-medium"> = {step.result}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm">Area Verification</h3>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label className="text-xs mb-1.5 block">Selected Area A (m²)</Label>
                        <Input type="number" value={geoArea} onChange={e => setGeoArea(e.target.value)} placeholder="e.g. 50" data-testid="input-geo-area" /></div>
                    </div>
                    {geoArea && (
                      <div className="space-y-2">
                        <Button size="sm" onClick={handleCalculate} data-testid="button-check-geometry">Check Area</Button>
                        {result?.geometry && (
                          <div className="grid gap-2 grid-cols-3">
                            <ResultBox label="A selected" value={`${fmtN(result.geometry.aSelected)} m²`} />
                            <ResultBox label="Q achieved" value={`${fmtN(result.geometry.qAchieved)} kW`} />
                            <ResultBox label="Excess area" value={`${fmtN(result.geometry.excessArea)}%`} highlight={result.geometry.excessArea < 0} />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {temaGuidance && (
                  <Card>
                    <CardHeader className="pb-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" /> TEMA Type & Fluid Allocation
                      </h3>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="p-3 rounded-md border border-primary/30 bg-primary/5">
                          <p className="text-xs font-semibold text-primary mb-1">Recommended: {temaGuidance.recommended}</p>
                          <p className="text-xs text-muted-foreground">{TEMA_TYPES[temaGuidance.recommended].name}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">{TEMA_TYPES[temaGuidance.recommended].description}</p>
                          <div className="mt-2 space-y-0.5">
                            {TEMA_TYPES[temaGuidance.recommended].pros.map((p, i) => (
                              <p key={i} className="text-[10px] text-green-400/80">+ {p}</p>
                            ))}
                            {TEMA_TYPES[temaGuidance.recommended].cons.map((c, i) => (
                              <p key={i} className="text-[10px] text-red-400/60">- {c}</p>
                            ))}
                          </div>
                        </div>
                        {temaGuidance.alternatives.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Alternatives</p>
                            {temaGuidance.alternatives.slice(0, 2).map(alt => (
                              <div key={alt} className="p-2 rounded-md border border-border/50 bg-muted/20">
                                <p className="text-xs font-medium">{alt} — {TEMA_TYPES[alt].name}</p>
                                <p className="text-[10px] text-muted-foreground">{TEMA_TYPES[alt].description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {temaGuidance.reasoning.map((r, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <Info className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />{r}
                          </p>
                        ))}
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Fluid Allocation</p>
                        <div className="grid gap-2 grid-cols-2">
                          <div className="p-2 rounded-md bg-blue-950/20 border border-blue-500/20">
                            <p className="text-[10px] font-semibold text-blue-400 mb-0.5">TUBE SIDE</p>
                            <p className="text-xs">{temaGuidance.fluidAllocation.tubeSide}</p>
                          </div>
                          <div className="p-2 rounded-md bg-amber-950/20 border border-amber-500/20">
                            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">SHELL SIDE</p>
                            <p className="text-xs">{temaGuidance.fluidAllocation.shellSide}</p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {temaGuidance.fluidAllocation.reasons.map((r, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground/70">- {r}</p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
                  <Info className="w-3 h-3 inline mr-1" />
                  Tube count and shell diameter are preliminary. Detailed thermal-hydraulic analysis requires vendor software (HTRI, Aspen EDR).
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ─── TAB 5: SUMMARY ─── */}
        <TabsContent value="summary">
          <div className="space-y-4">
            <StepHeader step={5} title="Design Summary & Export" desc="Review complete results, compare cases, and export the calculation report." />

            {!result ? (
              <Card><CardContent className="py-10 text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Run the thermal design calculation first (Step 3).</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("thermal")} data-testid="button-go-thermal-2">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Go to Thermal Design
                </Button>
              </CardContent></Card>
            ) : (
              <>
                {result.governingCase && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <h3 className="font-semibold">Results — {result.governingCase.caseName} (Governing)</h3>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" data-testid="button-export-results">
                              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-calc-note">
                              <FileText className="w-4 h-4 mr-2 text-red-400" /> Calc Note (Print/PDF)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToPDFUtil(d); }} data-testid="button-export-pdf">
                              <FileText className="w-4 h-4 mr-2 text-red-400" /> Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToExcel(d); }} data-testid="button-export-excel">
                              <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" /> Export as Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToJSON(d); }} data-testid="button-export-json">
                              <Download className="w-4 h-4 mr-2 text-blue-400" /> Export as JSON
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <SummaryTable cr={result.governingCase} />
                    </CardContent>
                  </Card>
                )}

                {result.cases.length > 1 && (
                  <Card>
                    <CardHeader className="pb-2"><h3 className="font-semibold text-sm">Case Comparison</h3></CardHeader>
                    <CardContent className="pt-0 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1.5 px-2 text-muted-foreground">Parameter</th>
                            {result.cases.map((cr, i) => (
                              <th key={i} className="text-right py-1.5 px-2">{cr.caseName}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: "Duty (kW)", key: "dutyKW" },
                            { label: "LMTD (°C)", key: "lmtd" },
                            { label: "F", key: "F" },
                            { label: "Corrected LMTD (°C)", key: "correctedLMTD" },
                            { label: "A_req (m²)", key: "aReq" },
                            { label: "A_design (m²)", key: "aDesign" },
                            { label: "ε (%)", key: "effectiveness", pct: true },
                            { label: "NTU", key: "ntu" },
                          ].map((row: { label: string; key: string; pct?: boolean }) => (
                            <tr key={row.key} className="border-b border-muted/30">
                              <td className="py-1.5 px-2 text-muted-foreground">{row.label}</td>
                              {result.cases.map((cr, i) => {
                                const val = (cr as unknown as Record<string, number>)[row.key];
                                return (
                                  <td key={i} className="py-1.5 px-2 text-right font-mono tabular-nums">
                                    {row.pct ? fmtN(val * 100) : fmtN(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}

                {result.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-sm">Recommendations</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {result.recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />{r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="py-3">
                    <p className="text-xs text-muted-foreground italic" data-testid="text-disclaimer">{result.disclaimer}</p>
                  </CardContent>
                </Card>

                <AssumptionsPanel
                  assumptions={result.governingCase?.trace.assumptions ?? []}
                  references={[
                    "Kern, D.Q. Process Heat Transfer (1950)",
                    "TEMA Standards, 10th Edition",
                    "Perry's Chemical Engineers' Handbook, Section 11",
                    "Bowman, Mueller & Nagle, Trans. ASME 62 (1940)",
                    "Ludwig, E.E. Applied Process Design, Vol. 3",
                  ]}
                />
                <FeedbackSection calculatorName="Heat Exchanger" />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {error && activeTab !== "thermal" && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mt-4" data-testid="text-error-global">
          <AlertTriangle className="w-4 h-4 inline mr-2" />{error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-muted/30">
        <Button size="sm" variant="outline" onClick={goPrev} disabled={tabIdx <= 0} data-testid="button-prev">
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        <div className="text-xs text-muted-foreground">
          Step {tabIdx + 1} of {TABS.length}
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "thermal" && activeTab !== "summary" && (
            <Button size="sm" variant="outline" onClick={goNext} disabled={tabIdx >= TABS.length - 1} data-testid="button-next">
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
          {activeTab === "thermal" && (
            <>
              <Button size="sm" onClick={handleCalculate} data-testid="button-calculate-main">
                <Calculator className="w-3.5 h-3.5 mr-1" /> {result ? "Recalculate" : "Calculate"}
              </Button>
              {result && (
                <Button size="sm" variant="outline" onClick={goNext} data-testid="button-next">
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </>
          )}
          {activeTab === "summary" && result && (
            <Button size="sm" variant="outline" onClick={() => setActiveTab("thermal")} data-testid="button-back-to-calc">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Recalculate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-1">
      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
        {step}
      </div>
      <div>
        <h2 className="font-semibold text-base">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function EqLine({ eq, val, highlight, sub }: { eq: string; val: string; highlight?: boolean; sub?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 px-3 py-1.5 rounded-md font-mono text-xs
      ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}>
      <span className="text-muted-foreground">{eq}</span>
      <span className={`font-semibold tabular-nums shrink-0 ${highlight ? "text-primary" : ""}`}>
        = {val}
        {sub && <span className="text-muted-foreground/60 font-normal ml-1">{sub}</span>}
      </span>
    </div>
  );
}

function ResultBox({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div className={`p-2 rounded-md text-center ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-mono font-medium tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground/60">{sub}</div>}
    </div>
  );
}

function SummaryTable({ cr }: { cr: CaseResult }) {
  const sections = [
    {
      title: "Energy Balance",
      rows: [
        { label: "Heat Duty", value: `${fmtN(cr.dutyKW)} kW`, hl: true },
        { label: "Hot Side Duty", value: `${fmtN(cr.hotDutyKW)} kW`, hl: false },
        { label: "Cold Side Duty", value: `${fmtN(cr.coldDutyKW)} kW`, hl: false },
      ],
    },
    {
      title: "Temperature Analysis",
      rows: [
        { label: "ΔT₁", value: `${fmtN(cr.dT1)} °C`, hl: false },
        { label: "ΔT₂", value: `${fmtN(cr.dT2)} °C`, hl: false },
        { label: "LMTD", value: `${fmtN(cr.lmtd)} °C`, hl: false },
        { label: "R (capacity ratio)", value: fmtN(cr.R, 4), hl: false },
        { label: "P (thermal effectiveness)", value: fmtN(cr.P, 4), hl: false },
        { label: "F (correction factor)", value: fmtN(cr.F, 4), hl: cr.F < 0.8 },
        { label: "Corrected LMTD", value: `${fmtN(cr.correctedLMTD)} °C`, hl: true },
        { label: "Approach Temp", value: `${fmtN(cr.approachTemp)} °C`, hl: cr.approachTemp < 5 },
      ],
    },
    {
      title: "Heat Transfer & Area",
      rows: [
        { label: "U_clean", value: `${fmtN(cr.uClean)} W/(m²·K)`, hl: false },
        { label: "U_fouled", value: `${fmtN(cr.uFouled)} W/(m²·K)`, hl: false },
        { label: "Total Rf", value: `${cr.totalFoulingResistance.toExponential(3)} m²·K/W`, hl: false },
        { label: "Cleanliness Factor", value: `${(cr.cleanlinessFactor * 100).toFixed(1)}%`, hl: false },
        { label: "UA_req", value: `${fmtN(cr.uaReq)} W/K`, hl: false },
        { label: "A_req", value: `${fmtN(cr.aReq)} m²`, hl: false },
        { label: "A_design", value: `${fmtN(cr.aDesign)} m²`, hl: true },
        { label: "Overdesign", value: `${fmtN(cr.overdesignPct)}%`, hl: false },
      ],
    },
    {
      title: "Performance",
      rows: [
        { label: "ε (effectiveness)", value: `${(cr.effectiveness * 100).toFixed(1)}%`, hl: false },
        { label: "NTU", value: fmtN(cr.ntu, 3), hl: cr.ntu > 3 },
        { label: "C_r (capacity ratio)", value: fmtN(cr.capacityRatio, 4), hl: false },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={si}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{section.title}</p>
          <div className="grid gap-0.5">
            {section.rows.map((r, i) => (
              <div key={i} className={`flex items-center justify-between py-1.5 px-3 rounded-md ${r.hl ? "bg-primary/10" : i % 2 === 0 ? "bg-muted/40" : ""}`} data-testid={`result-row-${si}-${i}`}>
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className={`text-xs font-mono font-medium tabular-nums ${r.hl ? "text-primary" : ""}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function buildCalcNoteHTML(result: HXFullResult, gc: CaseResult, project: HXProject): string {
  const traceHTML = gc.trace.steps.map(s =>
    `<tr><td>${s.name}</td><td><code>${s.equation}</code></td><td>${s.substitution}</td><td><strong>${s.result}</strong></td></tr>`
  ).join("\n");
  const flagsHTML = gc.trace.flags.map(f =>
    `<li style="color: ${FLAG_SEVERITY[f] === "error" ? "#e74c3c" : "#f39c12"}">${FLAG_LABELS[f]}</li>`
  ).join("\n");
  const warningsHTML = gc.trace.warnings.map(w => `<li>${w}</li>`).join("\n");
  const assumptionsHTML = gc.trace.assumptions.map(a => `<li>${a}</li>`).join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>HX Calc Note — ${project.name || project.caseId}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; font-size: 12px; color: #222; }
  h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 14px; margin-top: 20px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; font-size: 11px; }
  th { background: #f5f5f5; }
  code { background: #f0f0f0; padding: 1px 4px; font-size: 10px; }
  .summary-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; }
  .disclaimer { margin-top: 20px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; font-size: 11px; }
  @media print { body { margin: 0; padding: 10px; } h1 { font-size: 16px; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style></head><body>
<h1>Heat Exchanger Sizing — Calculation Note</h1>
<div class="summary-row"><span>Case: ${project.name} (${project.caseId})</span><span>Engineer: ${project.engineer}</span><span>Date: ${project.date}</span></div>
<div class="summary-row"><span>Basis: LMTD method with F-correction factor</span><span>Arrangement: ${result.config.arrangement.replace(/_/g, " ")}</span></div>

<h2>Stream Data</h2>
<table>
<tr><th></th><th>Hot Side</th><th>Cold Side</th></tr>
<tr><td>Name</td><td>${gc.hotSide.name}</td><td>${gc.coldSide.name}</td></tr>
<tr><td>T_in (°C)</td><td>${gc.hotSide.tIn.toFixed(1)}</td><td>${gc.coldSide.tIn.toFixed(1)}</td></tr>
<tr><td>T_out (°C)</td><td>${gc.hotSide.tOut.toFixed(1)}</td><td>${gc.coldSide.tOut.toFixed(1)}</td></tr>
<tr><td>Flow (kg/h)</td><td>${gc.hotSide.mDot.toFixed(0)}</td><td>${gc.coldSide.mDot.toFixed(0)}</td></tr>
<tr><td>Cp (kJ/(kg·K))</td><td>${gc.hotSide.cp.toFixed(3)}</td><td>${gc.coldSide.cp.toFixed(3)}</td></tr>
</table>

<h2>Results Summary</h2>
<table>
<tr><td>Duty</td><td>${gc.dutyKW.toFixed(2)} kW</td></tr>
<tr><td>LMTD</td><td>${gc.lmtd.toFixed(2)} °C</td></tr>
<tr><td>F-factor</td><td>${gc.F.toFixed(4)}</td></tr>
<tr><td>Corrected LMTD</td><td>${gc.correctedLMTD.toFixed(2)} °C</td></tr>
<tr><td>U_fouled</td><td>${gc.uFouled.toFixed(1)} W/(m²·K)</td></tr>
<tr><td>UA_req</td><td>${gc.uaReq.toFixed(1)} W/K</td></tr>
<tr><td>A_req</td><td>${gc.aReq.toFixed(2)} m²</td></tr>
<tr><td>A_design</td><td>${gc.aDesign.toFixed(2)} m²</td></tr>
</table>

<h2>Step-by-Step Calculations</h2>
<table><tr><th>Step</th><th>Equation</th><th>Substitution</th><th>Result</th></tr>
${traceHTML}
</table>

<h2>Assumptions</h2><ul>${assumptionsHTML}</ul>

${gc.trace.flags.length > 0 ? `<h2>Engineering Flags</h2><ul>${flagsHTML}</ul>` : ""}
${gc.trace.warnings.length > 0 ? `<h2>Warnings</h2><ul>${warningsHTML}</ul>` : ""}

<div class="disclaimer">${result.disclaimer}</div>

<h2>Next Steps</h2>
<ul>
<li>Confirm U value with vendor or detailed calculation (Bell-Delaware / Kern)</li>
<li>Perform detailed thermal-hydraulic rating (pressure drop, baffle design)</li>
<li>Verify mechanical design (ASME Section VIII, tube sheet, nozzle sizing)</li>
<li>Check fouling allowances against operating experience</li>
</ul>
</body></html>`;
}
