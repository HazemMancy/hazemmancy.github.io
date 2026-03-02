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
import { Slider } from "@/components/ui/slider";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI } from "@/lib/engineering/unitConversion";
import {
  type ProjectSetup, type OperatingCase, type ConvSepConfig, type HoldupBasis,
  type ConvSepFullResult, type ConvSepType, type PhaseMode,
  type InletDeviceType, type MistEliminatorType, type CaseType, type EngFlag,
  DEFAULT_PROJECT, DEFAULT_CASE, DEFAULT_CONFIG, DEFAULT_HOLDUP,
  K_GUIDANCE_CONV, FLAG_LABELS, FLAG_SEVERITY,
  calculateConventionalSeparator, TEST_CASES,
} from "@/lib/engineering/conventionalSeparator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF, exportToJSON } from "@/lib/engineering/exportUtils";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import {
  Container, ClipboardList, Droplets, Settings2, BarChart3, Gauge,
  Ruler, ShieldCheck, ChevronLeft, ChevronRight, RotateCcw, FlaskConical,
  Plus, Trash2, AlertTriangle, CheckCircle2, Download, Info,
  FileText, FileSpreadsheet,
} from "lucide-react";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "cases", label: "Cases", icon: Droplets, step: 2 },
  { id: "config", label: "Design", icon: Settings2, step: 3 },
  { id: "gas", label: "Gas Sizing", icon: Gauge, step: 4 },
  { id: "holdup", label: "Holdup", icon: Ruler, step: 5 },
  { id: "geometry", label: "Geometry", icon: Container, step: 6 },
  { id: "results", label: "Results", icon: BarChart3, step: 7 },
];

const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "maximum", label: "Maximum" },
  { value: "turndown", label: "Turndown" },
  { value: "fire", label: "Fire" },
  { value: "upset", label: "Upset" },
  { value: "startup", label: "Start-up" },
  { value: "blowdown", label: "Blowdown" },
  { value: "custom", label: "Custom" },
];

const ORIENTATIONS: { value: ConvSepType; label: string }[] = [
  { value: "vertical", label: "Vertical" },
  { value: "horizontal", label: "Horizontal" },
];

const PHASE_MODES: { value: PhaseMode; label: string }[] = [
  { value: "two_phase", label: "2-Phase (Gas\u2013Liquid)" },
  { value: "three_phase", label: "3-Phase (Gas\u2013Oil\u2013Water)" },
];

const pU = (param: string, us: UnitSystem) => getUnit(param, us);

export default function ConventionalSeparatorPage() {
  const [activeTab, setActiveTab] = useState("project");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [project, setProject] = useState<ProjectSetup>({ ...DEFAULT_PROJECT });
  const [cases, setCases] = useState<OperatingCase[]>([{ ...DEFAULT_CASE }]);
  const [config, setConfig] = useState<ConvSepConfig>({ ...DEFAULT_CONFIG, allowances: { ...DEFAULT_CONFIG.allowances } });
  const [holdup, setHoldup] = useState<HoldupBasis>({ ...DEFAULT_HOLDUP });
  const [result, setResult] = useState<ConvSepFullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProject = (k: keyof ProjectSetup, v: string | boolean) => setProject(p => ({ ...p, [k]: v }));
  const updateConfig = (k: keyof ConvSepConfig, v: unknown) => setConfig(p => ({ ...p, [k]: v as never }));
  const updateAllowance = (k: string, v: number) => setConfig(p => ({ ...p, allowances: { ...p.allowances, [k]: v } }));
  const updateHoldup = (k: keyof HoldupBasis, v: number) => setHoldup(p => ({ ...p, [k]: v }));

  const updateCase = (idx: number, k: keyof OperatingCase, v: unknown) => {
    setCases(prev => prev.map((c, i) => i === idx ? { ...c, [k]: v } : c));
  };

  const addCase = () => {
    const id = `case_${Date.now()}`;
    setCases(prev => [...prev, { ...DEFAULT_CASE, id, name: `Case ${prev.length + 1}`, caseType: "maximum" }]);
  };

  const removeCase = (idx: number) => {
    if (cases.length <= 1) return;
    setCases(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const convertedCases = cases.map(c => {
        const cc = { ...c };
        if (unitSystem !== "SI") {
          if (cc.gasFlowBasis === "actual") {
            cc.gasFlowRate = convertToSI("flowActualGas", cc.gasFlowRate, unitSystem);
          } else {
            cc.gasFlowRate = convertToSI("flowGas", cc.gasFlowRate, unitSystem);
          }
          cc.gasPressure = convertToSI("pressureAbs", cc.gasPressure, unitSystem);
          cc.gasTemperature = convertToSI("temperature", cc.gasTemperature, unitSystem);
          if (cc.liquidFlowBasis === "volume") {
            cc.liquidFlowRate = convertToSI("flowLiquid", cc.liquidFlowRate, unitSystem);
          } else {
            cc.liquidFlowRate = convertToSI("flowMass", cc.liquidFlowRate, unitSystem);
          }
          if (cc.gasDensity > 0) cc.gasDensity = convertToSI("density", cc.gasDensity, unitSystem);
          if (cc.liquidDensity > 0) cc.liquidDensity = convertToSI("density", cc.liquidDensity, unitSystem);
        }
        return cc;
      });

      const r = calculateConventionalSeparator(project, convertedCases, config, holdup);
      setResult(r);
      setActiveTab("gas");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const handleReset = () => {
    setProject({ ...DEFAULT_PROJECT });
    setCases([{ ...DEFAULT_CASE }]);
    setConfig({ ...DEFAULT_CONFIG, allowances: { ...DEFAULT_CONFIG.allowances } });
    setHoldup({ ...DEFAULT_HOLDUP });
    setResult(null);
    setError(null);
    setActiveTab("project");
  };

  const loadTestCase = (idx: number) => {
    setUnitSystem("SI");
    setError(null);
    setResult(null);
    const tc = TEST_CASES[idx];
    setProject({ ...tc.project });
    setCases(tc.cases.map(c => ({ ...c })));
    setConfig({ ...tc.config, allowances: { ...tc.config.allowances } });
    setHoldup({ ...tc.holdup });
  };

  const goTab = (dir: number) => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    const next = idx + dir;
    if (next >= 0 && next < TABS.length) setActiveTab(TABS[next].id);
  };

  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;
    const gov = result.caseResults.find(c => c.caseId === result.governingCaseId);

    const inputs: ExportDatasheet["inputs"] = [
      { label: "Orientation", value: config.orientation },
      { label: "Phase Mode", value: config.phaseMode.replace(/_/g, " ") },
      { label: "Inlet Device", value: config.inletDevice.replace(/_/g, " ") },
      { label: "Mist Eliminator", value: config.mistEliminator.replace(/_/g, " ") },
      { label: "K Value", value: config.kValue, unit: "m/s" },
      { label: "Liquid Residence Time", value: holdup.residenceTime, unit: "min" },
      { label: "Surge Time", value: holdup.surgeTime, unit: "min" },
    ];

    cases.forEach((c, i) => {
      inputs.push(
        { label: `Case ${i + 1} Name`, value: c.name },
        { label: `Case ${i + 1} Type`, value: c.caseType },
        { label: `Case ${i + 1} Gas Flow`, value: c.gasFlowRate, unit: c.gasFlowBasis === "actual" ? "m\u00B3/h act" : "Sm\u00B3/h" },
        { label: `Case ${i + 1} Gas Density`, value: c.gasDensity, unit: "kg/m\u00B3" },
        { label: `Case ${i + 1} Gas MW`, value: c.gasMW, unit: "kg/kmol" },
        { label: `Case ${i + 1} Gas Pressure`, value: c.gasPressure, unit: "bar abs" },
        { label: `Case ${i + 1} Gas Temperature`, value: c.gasTemperature, unit: "\u00B0C" },
        { label: `Case ${i + 1} Gas Z`, value: c.gasZ },
        { label: `Case ${i + 1} Liquid Flow`, value: c.liquidFlowRate, unit: c.liquidFlowBasis === "volume" ? "m\u00B3/h" : "kg/h" },
        { label: `Case ${i + 1} Liquid Density`, value: c.liquidDensity, unit: "kg/m\u00B3" },
      );
    });

    const results: ExportDatasheet["results"] = [
      { label: "Vessel Diameter", value: result.geometry.D_mm, unit: "mm", highlight: true },
      { label: config.orientation === "vertical" ? "Vessel Height (T-T)" : "Vessel Length (T-T)", value: result.geometry.L_mm, unit: "mm", highlight: true },
      { label: "L/D Ratio", value: result.geometry.LD_ratio, unit: "-" },
      { label: "Vessel Volume", value: result.geometry.vesselVolume_m3, unit: "m\u00B3" },
      { label: "Liquid Volume Required", value: result.geometry.liquidVolume_m3, unit: "m\u00B3" },
      { label: "Gas Area Fraction", value: result.geometry.gasAreaFraction * 100, unit: "%" },
      { label: "Actual Gas Velocity", value: result.geometry.actualGasVelocity, unit: "m/s" },
      { label: "Mist Face Velocity", value: result.geometry.mistFaceVelocity, unit: "m/s" },
      { label: "Liquid Level", value: result.geometry.liquidLevelPercent, unit: "%" },
    ];

    if (gov) {
      results.push(
        { label: "Governing Case v_s,max", value: gov.v_s_max, unit: "m/s" },
        { label: "Governing Case A_req", value: gov.A_req, unit: "m\u00B2" },
        { label: "Governing Case D_req", value: gov.D_req_mm, unit: "mm" },
      );
    }

    const calcSteps: ExportDatasheet["calcSteps"] = [];
    if (gov) {
      gov.steps.forEach(s => calcSteps.push({ label: s.label, equation: s.equation, value: s.result, unit: s.unit }));
    }
    result.holdupSteps.forEach(s => calcSteps.push({ label: s.label, equation: s.equation, value: s.result, unit: s.unit }));
    result.geometry.steps.forEach(s => calcSteps.push({ label: s.label, equation: s.equation, value: s.result, unit: s.unit }));

    const additionalSections: ExportDatasheet["additionalSections"] = [];
    if (result.caseResults.length > 1) {
      additionalSections.push({
        title: "Case Comparison",
        items: result.caseResults.map(cr => ({
          label: `${cr.caseName} \u2014 D_req`,
          value: cr.D_req_mm,
          unit: "mm",
        })),
      });
    }

    return {
      calculatorName: "Conventional Separator Sizing (API 12J)",
      projectInfo: [
        { label: "Case Name", value: project.caseName || "-" },
        { label: "Engineer", value: project.engineer || "-" },
        { label: "Date", value: project.date || "-" },
      ],
      inputs,
      results,
      calcSteps: calcSteps.length > 0 ? calcSteps : undefined,
      additionalSections: additionalSections.length > 0 ? additionalSections : undefined,
      methodology: [
        "Souders\u2013Brown correlation for maximum allowable gas velocity: v_max = K \u00D7 \u221A((\u03C1_L \u2212 \u03C1_G) / \u03C1_G)",
        "Gas capacity area from continuity: A = Q_actual / v_max",
        "Liquid holdup from residence time and surge time requirements",
        "Vessel geometry assembled from gas capacity + liquid holdup + allowance zones",
        "L/D ratio checked against typical design limits (API 12J)",
      ],
      assumptions: result.assumptions,
      references: [
        "API 12J: Specification for Oil and Gas Separators",
        "GPSA Engineering Data Book, Section 7: Separation Equipment",
        "Arnold & Stewart: Surface Production Operations, Vol. 1",
        "Stewart & Arnold: Gas\u2013Liquid and Liquid\u2013Liquid Separators",
      ],
      warnings: [
        ...result.warnings,
        ...result.flags.map(f => FLAG_LABELS[f] || f.replace(/_/g, " ")),
      ].filter(Boolean),
    };
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Container className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Conventional Separator</h1>
            <p className="text-sm text-muted-foreground">Production separator sizing per API 12J</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UnitSelector value={unitSystem} onChange={ns => setUnitSystem(ns)} />
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        <Button size="sm" variant="outline" onClick={() => loadTestCase(0)} data-testid="button-test-vert">
          <FlaskConical className="w-3.5 h-3.5 mr-1" /> Vertical 2-Phase
        </Button>
        <Button size="sm" variant="outline" onClick={() => loadTestCase(1)} data-testid="button-test-horiz">
          <FlaskConical className="w-3.5 h-3.5 mr-1" /> Horizontal 3-Phase
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {TABS.map((t, i) => (
          <div key={t.id} className="flex items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              i < tabIdx ? "bg-primary text-primary-foreground"
                : i === tabIdx ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`} data-testid={`step-indicator-${t.step}`}>
              {t.step}
            </div>
            {i < TABS.length - 1 && <div className={`w-4 h-px ${i < tabIdx ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap h-auto gap-0.5 mb-4">
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="flex-1 min-w-0 text-xs gap-1 py-1.5" data-testid={`tab-${t.id}`}>
              <t.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline truncate">{t.label}</span>
              <span className="sm:hidden">{t.step}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="project">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Project Setup</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Case Name / ID</Label>
                  <Input value={project.caseName} onChange={e => updateProject("caseName", e.target.value)} placeholder="e.g. V-1001 HP Separator" data-testid="input-case-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => updateProject("engineer", e.target.value)} data-testid="input-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => updateProject("date", e.target.value)} data-testid="input-date" /></div>
              </div>
              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Calculation Options</p>
                <div className="flex items-center gap-2">
                  <Checkbox checked={project.showIntermediateSteps} onCheckedChange={v => updateProject("showIntermediateSteps", !!v)} id="chk-steps" data-testid="chk-steps" />
                  <Label htmlFor="chk-steps" className="text-xs">Show intermediate calculation steps</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={project.showAssumptionsLog} onCheckedChange={v => updateProject("showAssumptionsLog", !!v)} id="chk-assumptions" data-testid="chk-assumptions" />
                  <Label htmlFor="chk-assumptions" className="text-xs">Show assumptions log</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Droplets className="w-4 h-4" /> Operating Cases</h3>
                <Button size="sm" variant="outline" onClick={addCase} data-testid="button-add-case">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Case
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              {cases.map((c, idx) => (
                <div key={c.id} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                      <Input value={c.name} onChange={e => updateCase(idx, "name", e.target.value)} className="w-40" data-testid={`input-case-name-${idx}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={c.caseType} onValueChange={v => updateCase(idx, "caseType", v)}>
                        <SelectTrigger className="w-32" data-testid={`select-case-type-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{CASE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {cases.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeCase(idx)} data-testid={`button-remove-case-${idx}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground">Gas</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div><Label className="text-xs mb-1 block">Gas Flow ({c.gasFlowBasis === "actual" ? pU("flowActualGas", unitSystem) : pU("flowGas", unitSystem)})</Label>
                      <NumericInput value={c.gasFlowRate} onValueChange={v => updateCase(idx, "gasFlowRate", v)} data-testid={`input-gas-flow-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Flow Basis</Label>
                      <Select value={c.gasFlowBasis} onValueChange={v => updateCase(idx, "gasFlowBasis", v)}>
                        <SelectTrigger data-testid={`select-gas-basis-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actual">Actual (at vessel P,T)</SelectItem>
                          <SelectItem value="standard">Standard (Sm\u00B3/h or MMSCFD)</SelectItem>
                        </SelectContent>
                      </Select></div>
                    <div><Label className="text-xs mb-1 block">Gas Density ({pU("density", unitSystem)})</Label>
                      <NumericInput value={c.gasDensity} onValueChange={v => updateCase(idx, "gasDensity", v)} data-testid={`input-gas-density-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">MW (kg/kmol)</Label>
                      <NumericInput value={c.gasMW} onValueChange={v => updateCase(idx, "gasMW", v)} data-testid={`input-gas-mw-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Pressure ({pU("pressureAbs", unitSystem)}) abs</Label>
                      <NumericInput value={c.gasPressure} onValueChange={v => updateCase(idx, "gasPressure", v)} data-testid={`input-gas-p-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Temperature ({pU("temperature", unitSystem)})</Label>
                      <NumericInput value={c.gasTemperature} onValueChange={v => updateCase(idx, "gasTemperature", v)} data-testid={`input-gas-t-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Z factor</Label>
                      <NumericInput value={c.gasZ} onValueChange={v => updateCase(idx, "gasZ", v)} data-testid={`input-gas-z-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Gas Viscosity (cP)</Label>
                      <NumericInput value={c.gasViscosity} onValueChange={v => updateCase(idx, "gasViscosity", v)} data-testid={`input-gas-visc-${idx}`} /></div>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground">Liquid</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div><Label className="text-xs mb-1 block">Liquid Flow ({c.liquidFlowBasis === "volume" ? pU("flowLiquid", unitSystem) : pU("flowMass", unitSystem)})</Label>
                      <NumericInput value={c.liquidFlowRate} onValueChange={v => updateCase(idx, "liquidFlowRate", v)} data-testid={`input-liq-flow-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Flow Basis</Label>
                      <Select value={c.liquidFlowBasis} onValueChange={v => updateCase(idx, "liquidFlowBasis", v)}>
                        <SelectTrigger data-testid={`select-liq-basis-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="volume">Volumetric</SelectItem>
                          <SelectItem value="mass">Mass</SelectItem>
                        </SelectContent>
                      </Select></div>
                    <div><Label className="text-xs mb-1 block">Liquid Density ({pU("density", unitSystem)})</Label>
                      <NumericInput value={c.liquidDensity} onValueChange={v => updateCase(idx, "liquidDensity", v)} data-testid={`input-liq-density-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Liquid Viscosity (cP)</Label>
                      <NumericInput value={c.liquidViscosity} onValueChange={v => updateCase(idx, "liquidViscosity", v)} data-testid={`input-liq-visc-${idx}`} /></div>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground">Flags & Conditions</p>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { key: "flagFoam", label: "Foam" },
                      { key: "flagSolids", label: "Solids/Sand" },
                      { key: "flagSlugging", label: "Slugging" },
                      { key: "flagHydrate", label: "Hydrate/Wax" },
                      { key: "flagEmulsion", label: "Emulsion" },
                    ].map(f => (
                      <div key={f.key} className="flex items-center gap-1.5">
                        <Checkbox checked={c[f.key as keyof OperatingCase] as boolean} onCheckedChange={v => updateCase(idx, f.key as keyof OperatingCase, !!v)} id={`${f.key}-${idx}`} data-testid={`chk-${f.key}-${idx}`} />
                        <Label htmlFor={`${f.key}-${idx}`} className="text-xs">{f.label}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1 block">Droplet Removal Basis (\u03BCm)</Label>
                      <NumericInput value={c.dropletBasis} onValueChange={v => updateCase(idx, "dropletBasis", v)} data-testid={`input-droplet-${idx}`} /></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" /> Design Basis</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Orientation</Label>
                  <Select value={config.orientation} onValueChange={v => updateConfig("orientation", v as ConvSepType)}>
                    <SelectTrigger data-testid="select-orientation"><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIENTATIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Phase Mode</Label>
                  <Select value={config.phaseMode} onValueChange={v => updateConfig("phaseMode", v as PhaseMode)}>
                    <SelectTrigger data-testid="select-phase-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>{PHASE_MODES.map(pm => <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Inlet Device</Label>
                  <Select value={config.inletDevice} onValueChange={v => updateConfig("inletDevice", v as InletDeviceType)}>
                    <SelectTrigger data-testid="select-inlet"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diverter">Simple Diverter</SelectItem>
                      <SelectItem value="half_pipe">Half-open Pipe</SelectItem>
                      <SelectItem value="cyclone">Cyclone</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Mist Eliminator</Label>
                  <Select value={config.mistEliminator} onValueChange={v => updateConfig("mistEliminator", v as MistEliminatorType)}>
                    <SelectTrigger data-testid="select-mist"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="wire_mesh">Wire Mesh Pad</SelectItem>
                      <SelectItem value="vane_pack">Vane Pack</SelectItem>
                      <SelectItem value="high_efficiency">High-efficiency (vendor)</SelectItem>
                    </SelectContent>
                  </Select></div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Souders\u2013Brown K Value</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">K Guidance (typical ranges)</Label>
                    <Select onValueChange={v => {
                      const g = K_GUIDANCE_CONV[v];
                      if (g) { updateConfig("kValue", g.typical); updateConfig("kMode", "typical"); }
                    }}>
                      <SelectTrigger data-testid="select-k-guidance"><SelectValue placeholder="Select guidance..." /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(K_GUIDANCE_CONV).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{k} (K={v.typical})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs mb-1.5 block">K Value (m/s)</Label>
                    <NumericInput step="0.001" value={config.kValue} onValueChange={v => { updateConfig("kValue", v); updateConfig("kMode", "user"); }} data-testid="input-k-value" /></div>
                </div>
                {config.kMode === "typical" && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-2">
                    <p className="text-xs text-blue-400"><Info className="w-3 h-3 inline mr-1" />K value from typical guidance. Confirm suitability for your specific service.</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">GPSA K-Factor Corrections</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="chk-pressure-corr" checked={config.applyPressureCorrection} onCheckedChange={v => updateConfig("applyPressureCorrection", !!v)} data-testid="chk-pressure-correction" />
                    <Label htmlFor="chk-pressure-corr" className="text-xs">Apply GPSA Fig 7-9 pressure correction</Label>
                  </div>
                  <div><Label className="text-xs mb-1.5 block">Foam Derating Factor (0.5\u20131.0)</Label>
                    <NumericInput step="0.05" min={0.5} max={1} value={config.foamFactor} onValueChange={v => updateConfig("foamFactor", v)} data-testid="input-foam-factor" />
                    <p className="text-xs text-muted-foreground mt-1">Applied when foam is flagged on any case (typical 0.5\u20130.7)</p>
                  </div>
                </div>
              </div>

              {config.orientation === "horizontal" && (
                <div className="pt-2 border-t space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Horizontal Vessel Parameters</p>
                  <div><Label className="text-xs mb-1.5 block">Normal Liquid Level Fraction: {(config.levelFraction * 100).toFixed(0)}%</Label>
                    <Slider value={[config.levelFraction * 100]} onValueChange={v => updateConfig("levelFraction", v[0] / 100)} min={20} max={70} step={5} data-testid="slider-level" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>20%</span><span>70%</span></div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Constraints (optional)</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Max Vessel Diameter (mm) \u2014 0 = no limit</Label>
                    <NumericInput value={config.maxDiameter} onValueChange={v => updateConfig("maxDiameter", v)} data-testid="input-max-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Max L/D \u2014 0 = default</Label>
                    <NumericInput value={config.maxLD} onValueChange={v => updateConfig("maxLD", v)} data-testid="input-max-ld" /></div>
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Allowance Heights (m)</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { key: "inletZone", label: "Inlet Zone" },
                    { key: "disengagementZone", label: "Disengagement Zone" },
                    { key: "mistEliminatorZone", label: "Mist Eliminator" },
                    { key: "sumpZone", label: "Sump / Bottom" },
                    { key: "nozzleZone", label: "Nozzle / Top" },
                  ].map(a => (
                    <div key={a.key}><Label className="text-xs mb-1 block">{a.label}</Label>
                      <NumericInput step="0.05" value={config.allowances[a.key as keyof typeof config.allowances]} onValueChange={v => updateAllowance(a.key, v)} data-testid={`input-allow-${a.key}`} /></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gas">
          {!result ? (
            <Card><CardContent className="py-12 text-center">
              <Gauge className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Click Calculate to run Souders\u2013Brown sizing</p>
              <Button onClick={handleCalculate} data-testid="button-calculate">Calculate</Button>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Gauge className="w-4 h-4" /> Gas Capacity Sizing (Souders\u2013Brown)</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {result.caseResults.map((cr) => (
                  <div key={cr.caseId} className={`border rounded-md p-3 space-y-2 ${cr.caseId === result.governingCaseId ? "border-primary/50 bg-primary/5" : ""}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium">{cr.caseName}</span>
                      {cr.caseId === result.governingCaseId && <Badge variant="default" className="text-xs">Governing</Badge>}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                      <div><span className="text-muted-foreground">v_s,max:</span> <span className="font-mono">{cr.v_s_max.toFixed(3)} m/s</span></div>
                      <div><span className="text-muted-foreground">A_req:</span> <span className="font-mono">{cr.A_req.toFixed(4)} m\u00B2</span></div>
                      <div><span className="text-muted-foreground">D_req:</span> <span className="font-mono">{cr.D_req_mm.toFixed(0)} mm</span></div>
                    </div>
                    {project.showIntermediateSteps && cr.steps.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b"><th className="text-left py-1 pr-2">Step</th><th className="text-left py-1 pr-2">Equation</th><th className="text-left py-1 pr-2">Substitution</th><th className="text-right py-1 pr-2">Value</th><th className="text-left py-1">Unit</th></tr></thead>
                          <tbody>{cr.steps.map((s, si) => (
                            <tr key={si} className="border-b border-border/30">
                              <td className="py-1 pr-2 text-muted-foreground">{s.label}</td>
                              <td className="py-1 pr-2 font-mono text-muted-foreground">{s.equation}</td>
                              <td className="py-1 pr-2 font-mono text-muted-foreground text-xs">{s.substitution}</td>
                              <td className="py-1 pr-2 text-right font-mono">{typeof s.result === "number" ? s.result.toFixed(4) : s.result}</td>
                              <td className="py-1">{s.unit}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bg-primary/10 rounded-md p-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 inline mr-1 text-primary" />
                  <strong>Governing case:</strong> {result.governingReason}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="holdup">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Ruler className="w-4 h-4" /> Liquid Holdup / Surge / Retention</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-xs text-muted-foreground">Define retention times and surge volumes. Typical values shown as guidance only \u2014 user must confirm.</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Liquid Residence Time (min)</Label>
                  <NumericInput value={holdup.residenceTime} onValueChange={v => updateHoldup("residenceTime", v)} data-testid="input-res-time" />
                  <p className="text-xs text-muted-foreground mt-1">Typical: 2\u20135 min (GPSA)</p></div>
                <div><Label className="text-xs mb-1.5 block">Surge Time (min)</Label>
                  <NumericInput value={holdup.surgeTime} onValueChange={v => updateHoldup("surgeTime", v)} data-testid="input-surge-time" />
                  <p className="text-xs text-muted-foreground mt-1">Typical: 2\u20133 min (process upset)</p></div>
              </div>

              {config.phaseMode === "three_phase" && (
                <div className="pt-2 border-t space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">3-Phase Retention (Preliminary)</p>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2 mb-2">
                    <p className="text-xs text-amber-400"><AlertTriangle className="w-3 h-3 inline mr-1" />3-phase requires detailed design (weirs, coalescers, emulsions). Values here are for preliminary volume estimation only.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Oil Retention Time (min)</Label>
                      <NumericInput value={holdup.oilRetentionTime} onValueChange={v => updateHoldup("oilRetentionTime", v)} data-testid="input-oil-ret" />
                      <p className="text-xs text-muted-foreground mt-1">Typical: 3\u20138 min</p></div>
                    <div><Label className="text-xs mb-1.5 block">Water Retention Time (min)</Label>
                      <NumericInput value={holdup.waterRetentionTime} onValueChange={v => updateHoldup("waterRetentionTime", v)} data-testid="input-water-ret" />
                      <p className="text-xs text-muted-foreground mt-1">Typical: 5\u201315 min</p></div>
                    <div><Label className="text-xs mb-1.5 block">Oil/Water Split Ratio (oil fraction)</Label>
                      <NumericInput step="0.05" value={holdup.oilWaterSplitRatio} onValueChange={v => updateHoldup("oilWaterSplitRatio", v)} data-testid="input-ow-split" />
                      <p className="text-xs text-muted-foreground mt-1">e.g. 0.7 = 70% oil, 30% water</p></div>
                  </div>
                </div>
              )}

              {result && result.holdupSteps.length > 0 && project.showIntermediateSteps && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Holdup Calculation Steps</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b"><th className="text-left py-1 pr-2">Step</th><th className="text-left py-1 pr-2">Equation</th><th className="text-left py-1 pr-2">Substitution</th><th className="text-right py-1 pr-2">Value</th><th className="text-left py-1">Unit</th></tr></thead>
                      <tbody>{result.holdupSteps.map((s, si) => (
                        <tr key={si} className="border-b border-border/30">
                          <td className="py-1 pr-2 text-muted-foreground">{s.label}</td>
                          <td className="py-1 pr-2 font-mono text-muted-foreground">{s.equation}</td>
                          <td className="py-1 pr-2 font-mono text-muted-foreground text-xs">{s.substitution}</td>
                          <td className="py-1 pr-2 text-right font-mono">{typeof s.result === "number" ? s.result.toFixed(4) : s.result}</td>
                          <td className="py-1">{s.unit}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}
              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate-holdup">Calculate / Recalculate</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geometry">
          {!result ? (
            <Card><CardContent className="py-12 text-center">
              <Container className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Run calculation first</p>
              <Button onClick={handleCalculate} data-testid="button-calculate-geo">Calculate</Button>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Container className="w-4 h-4" /> Geometry Assembly & Checks</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "Vessel Diameter", value: `${result.geometry.D_mm.toFixed(0)} mm`, highlight: true },
                    { label: config.orientation === "vertical" ? "Vessel Height (T-T)" : "Vessel Length (T-T)", value: `${result.geometry.L_mm.toFixed(0)} mm`, highlight: true },
                    { label: "L/D Ratio", value: result.geometry.LD_ratio.toFixed(2) },
                    { label: "Vessel Volume", value: `${result.geometry.vesselVolume_m3.toFixed(3)} m\u00B3` },
                    { label: "Liquid Volume Required", value: `${result.geometry.liquidVolume_m3.toFixed(3)} m\u00B3` },
                    { label: "Gas Area Fraction", value: `${(result.geometry.gasAreaFraction * 100).toFixed(1)}%` },
                    { label: "Actual Gas Velocity", value: `${result.geometry.actualGasVelocity.toFixed(3)} m/s` },
                    { label: "Mist Face Velocity", value: `${result.geometry.mistFaceVelocity.toFixed(3)} m/s` },
                    { label: "Liquid Level", value: `${result.geometry.liquidLevelPercent.toFixed(1)}%` },
                  ].map((r, i) => (
                    <div key={i} className={`p-3 rounded-md border ${r.highlight ? "border-primary/40 bg-primary/5" : ""}`}>
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                      <p className={`font-mono text-sm ${r.highlight ? "font-bold" : ""}`} data-testid={`text-geo-${i}`}>{r.value}</p>
                    </div>
                  ))}
                </div>

                {project.showIntermediateSteps && result.geometry.steps.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Geometry Calculation Steps</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b"><th className="text-left py-1 pr-2">Step</th><th className="text-left py-1 pr-2">Equation</th><th className="text-left py-1 pr-2">Substitution</th><th className="text-right py-1 pr-2">Value</th><th className="text-left py-1">Unit</th></tr></thead>
                        <tbody>{result.geometry.steps.map((s, si) => (
                          <tr key={si} className="border-b border-border/30">
                            <td className="py-1 pr-2 text-muted-foreground">{s.label}</td>
                            <td className="py-1 pr-2 font-mono text-muted-foreground">{s.equation}</td>
                            <td className="py-1 pr-2 font-mono text-muted-foreground text-xs">{s.substitution}</td>
                            <td className="py-1 pr-2 text-right font-mono">{typeof s.result === "number" ? s.result.toFixed(4) : s.result}</td>
                            <td className="py-1">{s.unit}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <div className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <div key={i} className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded-md">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />{w}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results">
          {!result ? (
            <Card><CardContent className="py-12 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Run calculation first</p>
              <Button onClick={handleCalculate} data-testid="button-calculate-results">Calculate</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Results Summary</h3>
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
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-3 rounded-md border border-primary/40 bg-primary/5 text-center">
                      <p className="text-xs text-muted-foreground">Vessel Diameter</p>
                      <p className="text-xl font-bold font-mono" data-testid="text-result-dia">{result.geometry.D_mm.toFixed(0)} mm</p>
                    </div>
                    <div className="p-3 rounded-md border border-primary/40 bg-primary/5 text-center">
                      <p className="text-xs text-muted-foreground">{config.orientation === "vertical" ? "Vessel Height" : "Vessel Length"} (T-T)</p>
                      <p className="text-xl font-bold font-mono" data-testid="text-result-len">{result.geometry.L_mm.toFixed(0)} mm</p>
                    </div>
                    <div className="p-3 rounded-md border text-center">
                      <p className="text-xs text-muted-foreground">Vessel Volume</p>
                      <p className="text-lg font-mono" data-testid="text-result-vol">{result.geometry.vesselVolume_m3.toFixed(2)} m\u00B3</p>
                    </div>
                    <div className="p-3 rounded-md border text-center">
                      <p className="text-xs text-muted-foreground">L/D Ratio</p>
                      <p className="text-lg font-mono" data-testid="text-result-ld">{result.geometry.LD_ratio.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div className="p-2 rounded-md border">
                      <span className="text-muted-foreground">Governing Case:</span> <span className="font-medium">{result.caseResults.find(c => c.caseId === result.governingCaseId)?.caseName}</span>
                    </div>
                    <div className="p-2 rounded-md border">
                      <span className="text-muted-foreground">v_s,max:</span> <span className="font-mono">{result.caseResults.find(c => c.caseId === result.governingCaseId)?.v_s_max.toFixed(3)} m/s</span>
                    </div>
                    <div className="p-2 rounded-md border">
                      <span className="text-muted-foreground">Actual Gas Velocity:</span> <span className="font-mono">{result.geometry.actualGasVelocity.toFixed(3)} m/s</span>
                    </div>
                    <div className="p-2 rounded-md border">
                      <span className="text-muted-foreground">Liquid Level:</span> <span className="font-mono">{result.geometry.liquidLevelPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {result.flags.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Engineering Flags</h3>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {result.flags.map((f, i) => {
                      const severity = FLAG_SEVERITY[f];
                      const colors = severity === "error" ? "bg-destructive/10 text-destructive border-destructive/30"
                        : severity === "warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/30";
                      return (
                        <div key={i} className={`text-xs p-2 rounded-md border ${colors}`} data-testid={`flag-${f}`}>
                          <Badge variant="outline" className="mr-2 text-xs no-default-hover-elevate no-default-active-elevate">{f.replace(/_/g, " ")}</Badge>
                          {FLAG_LABELS[f]}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {result.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Recommendations</h3>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {result.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Next Steps Checklist</h3>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {result.nextSteps.map((ns, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Checkbox id={`ns-${i}`} data-testid={`chk-next-${i}`} />
                      <Label htmlFor={`ns-${i}`} className="text-xs leading-relaxed">{ns}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {project.showAssumptionsLog && (
                <AssumptionsPanel
                  assumptions={result.assumptions}
                  references={[
                    "API 12J: Specification for Oil and Gas Separators",
                    "GPSA Engineering Data Book, Section 7: Separation Equipment",
                    "Arnold & Stewart: Surface Production Operations, Vol. 1",
                    "Stewart & Arnold: Gas\u2013Liquid and Liquid\u2013Liquid Separators",
                  ]}
                />
              )}

              <FeedbackSection calculatorName="Conventional Separator" />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-2 mt-6">
        <Button variant="outline" size="sm" onClick={() => goTab(-1)} disabled={tabIdx === 0} data-testid="button-prev">
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <div className="flex items-center gap-2">
          {error && activeTab !== "holdup" && (
            <div className="text-xs text-destructive max-w-xs truncate">{error}</div>
          )}
          {activeTab === "cases" || activeTab === "holdup" || activeTab === "config" ? (
            <Button size="sm" onClick={handleCalculate} data-testid="button-calculate-nav">Calculate</Button>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={() => goTab(1)} disabled={tabIdx === TABS.length - 1} data-testid="button-next">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
