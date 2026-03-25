import { useState, useMemo } from "react";
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
  type ProjectSetup, type FlareScenario, type KODrumConfig, type HoldupBasis,
  type FlareKODrumFullResult, type ScenarioType,
  DEFAULT_PROJECT, DEFAULT_SCENARIO, DEFAULT_CONFIG, DEFAULT_HOLDUP,
  K_GUIDANCE_KO, FLAG_LABELS, FLAG_SEVERITY,
  calculateFlareKODrum, TEST_CASES,
} from "@/lib/engineering/flareKODrum";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
import { computeOrientationRecommendation, type OrientationResult } from "@/lib/engineering/orientationRecommendation";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import {
  Flame, ClipboardList, AlertCircle, Settings2, BarChart3, Gauge,
  ShieldCheck, ChevronLeft, ChevronRight, RotateCcw, FlaskConical,
  Plus, Trash2, AlertTriangle, CheckCircle2, Download, Info,
  FileText, FileSpreadsheet, Container, Droplets, Compass, Calculator, TriangleAlert,
} from "lucide-react";
import {
  flareKOScenarioSchema, flareKOConfigSchema, flareKOHoldupSchema,
} from "@/lib/engineering/validation";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1, desc: "Project setup & options" },
  { id: "scenarios", label: "Scenarios", icon: AlertCircle, step: 2, desc: "Relief & blowdown scenarios" },
  { id: "config", label: "Design", icon: Settings2, step: 3, desc: "Orientation, internals & K-value" },
  { id: "gas", label: "Gas Sizing", icon: Gauge, step: 4, desc: "Souders-Brown gas capacity" },
  { id: "liquid", label: "Liquid Accum.", icon: Droplets, step: 5, desc: "Transient liquid accumulation" },
  { id: "geometry", label: "Geometry", icon: Container, step: 6, desc: "Vessel dimensions & L/D" },
  { id: "results", label: "Results", icon: BarChart3, step: 7, desc: "Summary, flags & export" },
];

const SCENARIO_TYPES: { value: ScenarioType; label: string }[] = [
  { value: "normal_flaring", label: "Normal Flaring" },
  { value: "fire_case", label: "Fire Case" },
  { value: "blowdown", label: "Blowdown" },
  { value: "depressuring", label: "Depressuring" },
  { value: "blocked_outlet", label: "Blocked Outlet" },
  { value: "custom", label: "Custom" },
];

const pU = (param: string, us: UnitSystem) => getUnit(param, us);

export default function FlareKODrumPage() {
  const [activeTab, setActiveTab] = useState("project");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [project, setProject] = useState<ProjectSetup>({ ...DEFAULT_PROJECT });
  const [scenarios, setScenarios] = useState<FlareScenario[]>([{ ...DEFAULT_SCENARIO }]);
  const [config, setConfig] = useState<KODrumConfig>({ ...DEFAULT_CONFIG, allowances: { ...DEFAULT_CONFIG.allowances } });
  const [holdup, setHoldup] = useState<HoldupBasis>({ ...DEFAULT_HOLDUP });
  const [result, setResult] = useState<FlareKODrumFullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orientationRec = useMemo<OrientationResult>(() => {
    const caseInputs = scenarios.map(s => ({
      gasFlowRate: s.gasFlowRate,
      gasFlowBasis: s.gasFlowBasis,
      gasDensity: s.gasDensity,
      gasMW: s.gasMW,
      gasPressure: s.gasPressure,
      gasTemperature: s.gasTemperature,
      gasZ: s.gasZ,
      liquidFlowRate: s.liquidCarryoverRate,
      liquidDensity: s.liquidDensity,
      flagFoam: false,
      flagSolids: false,
      flagSlugging: false,
    }));
    return computeOrientationRecommendation({
      cases: caseInputs,
      serviceType: "flare_ko",
      phaseMode: "two_phase",
      currentOrientation: config.orientation,
    });
  }, [scenarios, config.orientation]);

  const updateProject = (k: keyof ProjectSetup, v: string | boolean) => setProject(p => ({ ...p, [k]: v }));
  const updateConfig = (k: keyof KODrumConfig, v: unknown) => setConfig(p => ({ ...p, [k]: v as never }));
  const updateAllowance = (k: string, v: number) => setConfig(p => ({ ...p, allowances: { ...p.allowances, [k]: v } }));
  const updateHoldup = (k: keyof HoldupBasis, v: number) => setHoldup(p => ({ ...p, [k]: v }));

  const updateScenario = (idx: number, k: keyof FlareScenario, v: unknown) => {
    setScenarios(prev => prev.map((s, i) => i === idx ? { ...s, [k]: v } : s));
  };

  const addScenario = () => {
    const id = `scenario_${Date.now()}`;
    setScenarios(prev => [...prev, { ...DEFAULT_SCENARIO, id, name: `Scenario ${prev.length + 1}`, scenarioType: "blowdown" }]);
  };

  const removeScenario = (idx: number) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCalculate = () => {
    setError(null);

    const scenarioErrors: string[] = [];
    for (const s of scenarios) {
      const r = flareKOScenarioSchema.safeParse(s);
      if (!r.success) {
        scenarioErrors.push(`Scenario "${s.name}": ${r.error.issues.map(i => i.message).join("; ")}`);
      }
    }
    const configResult = flareKOConfigSchema.safeParse(config);
    const holdupResult = flareKOHoldupSchema.safeParse(holdup);
    const allErrors = [
      ...scenarioErrors,
      ...(configResult.success ? [] : configResult.error.issues.map(i => i.message)),
      ...(holdupResult.success ? [] : holdupResult.error.issues.map(i => i.message)),
    ];
    if (allErrors.length > 0) {
      setError(allErrors.join("\n"));
      return;
    }

    try {
      const convertedScenarios = scenarios.map(s => {
        const cs = { ...s };
        if (unitSystem !== "SI") {
          if (cs.gasFlowBasis === "actual") {
            cs.gasFlowRate = convertToSI("flowActualGas", cs.gasFlowRate, unitSystem);
          } else {
            cs.gasFlowRate = convertToSI("flowGas", cs.gasFlowRate, unitSystem);
          }
          cs.gasPressure = convertToSI("pressureAbs", cs.gasPressure, unitSystem);
          cs.gasTemperature = convertToSI("temperature", cs.gasTemperature, unitSystem);
          if (cs.gasDensity > 0) cs.gasDensity = convertToSI("density", cs.gasDensity, unitSystem);
          if (cs.liquidDensity > 0) cs.liquidDensity = convertToSI("density", cs.liquidDensity, unitSystem);
          if (cs.liquidCarryoverRate > 0) cs.liquidCarryoverRate = convertToSI("flowLiquid", cs.liquidCarryoverRate, unitSystem);
        }
        return cs;
      });

      const r = calculateFlareKODrum(project, convertedScenarios, config, holdup);
      setResult(r);
      setActiveTab("results");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const handleReset = () => {
    setProject({ ...DEFAULT_PROJECT });
    setScenarios([{ ...DEFAULT_SCENARIO }]);
    setConfig({ ...DEFAULT_CONFIG, allowances: { ...DEFAULT_CONFIG.allowances } });
    setHoldup({ ...DEFAULT_HOLDUP });
    setResult(null);
    setError(null);
    setActiveTab("project");
  };

  const loadTestCase = () => {
    setUnitSystem("SI");
    setError(null);
    setResult(null);
    const tc = TEST_CASES.verticalFlareKO;
    setProject({ ...tc.project });
    setScenarios(tc.scenarios.map(s => ({ ...s })));
    setConfig({ ...tc.config, allowances: { ...tc.config.allowances } });
    setHoldup({ ...tc.holdup });
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;
    const gov = result.scenarioResults.find(r => r.scenarioId === result.governingScenarioId);

    const inputs: ExportDatasheet["inputs"] = [
      { label: "Orientation", value: config.orientation },
      { label: "Internals", value: config.internals },
      { label: "K Value", value: config.kValue, unit: "m/s" },
      { label: "Holdup Time", value: holdup.holdupTime, unit: "min" },
      { label: "Rainout Fraction", value: holdup.rainoutFraction },
      { label: "Drain Rate", value: config.drainRate, unit: "m\u00B3/h" },
    ];

    scenarios.forEach((s, i) => {
      inputs.push(
        { label: `Scenario ${i + 1} Name`, value: s.name },
        { label: `Scenario ${i + 1} Type`, value: s.scenarioType },
        { label: `Scenario ${i + 1} Gas Flow`, value: s.gasFlowRate, unit: s.gasFlowBasis === "actual" ? "m\u00B3/h act" : "Sm\u00B3/h" },
        { label: `Scenario ${i + 1} Gas Density`, value: s.gasDensity, unit: "kg/m\u00B3" },
        { label: `Scenario ${i + 1} Gas MW`, value: s.gasMW, unit: "kg/kmol" },
        { label: `Scenario ${i + 1} Pressure`, value: s.gasPressure, unit: "bar abs" },
        { label: `Scenario ${i + 1} Temperature`, value: s.gasTemperature, unit: "\u00B0C" },
        { label: `Scenario ${i + 1} Liquid Carryover`, value: s.liquidCarryoverRate, unit: "m\u00B3/h" },
        { label: `Scenario ${i + 1} Liquid Density`, value: s.liquidDensity, unit: "kg/m\u00B3" },
        { label: `Scenario ${i + 1} Duration`, value: s.duration, unit: "min" },
      );
    });

    const results: ExportDatasheet["results"] = [
      { label: "Vessel Diameter", value: result.geometry.D_mm, unit: "mm", highlight: true },
      { label: config.orientation === "vertical" ? "Vessel Height (T-T)" : "Vessel Length (T-T)", value: result.geometry.L_mm, unit: "mm", highlight: true },
      { label: "L/D Ratio", value: result.geometry.LD_ratio, unit: "-" },
      { label: "Vessel Volume", value: result.geometry.vesselVolume_m3, unit: "m\u00B3" },
      { label: "Net Liquid Accumulation", value: result.liquidAccum.netAccumulation_m3, unit: "m\u00B3" },
      { label: "Gas Area Fraction", value: result.geometry.gasAreaFraction * 100, unit: "%" },
      { label: "Actual Gas Velocity", value: result.geometry.actualGasVelocity, unit: "m/s" },
      { label: "Gross Vessel Face Velocity (screening est.)", value: result.geometry.grossFaceVelocity, unit: "m/s" },
      { label: "Liquid Level", value: result.geometry.liquidLevelPercent, unit: "%" },
    ];

    if (gov) {
      results.push(
        { label: "Governing Scenario v_s,max", value: gov.v_s_max, unit: "m/s" },
        { label: "Governing Scenario A_req", value: gov.A_req, unit: "m\u00B2" },
        { label: "Governing Scenario D_req", value: gov.D_req_mm, unit: "mm" },
      );
    }

    const calcSteps: ExportDatasheet["calcSteps"] = [];
    if (gov) {
      gov.steps.forEach(s => calcSteps.push({ label: s.label, equation: s.equation, value: s.result, unit: s.unit }));
    }
    result.liquidAccum.steps.forEach(s => calcSteps.push({ label: s.label, equation: s.equation, value: s.result, unit: s.unit }));
    result.geometry.steps.forEach(s => calcSteps.push({ label: s.label, equation: s.equation, value: s.result, unit: s.unit }));

    const additionalSections: ExportDatasheet["additionalSections"] = [];
    if (result.scenarioResults.length > 1) {
      additionalSections.push({
        title: "Scenario Comparison",
        items: result.scenarioResults.map(sr => ({
          label: `${sr.scenarioName} \u2014 D_req`,
          value: sr.D_req_mm,
          unit: "mm",
        })),
      });
    }

    return {
      calculatorName: "Flare KO Drum Sizing",
      projectInfo: [
        { label: "Case Name", value: project.caseName || "-" },
        { label: "Engineer", value: project.engineer || "-" },
        { label: "Date", value: project.date || "-" },
      ],
      inputs,
      results,
      calcSteps: calcSteps.length > 0 ? calcSteps : undefined,
      methodology: [
        "SCOPE: Flare KO Drum Preliminary Sizing / Screening Tool per API 521 Section 5.4.2. This is NOT: final vessel or internals design; a dynamic transient flare-hydraulics model; a substitute for project-specific relief/flare study or mechanical verification.",
        "Gas capacity: Souders\u2013Brown correlation v_max = K \u00D7 \u221A((\u03C1_L \u2212 \u03C1_G) / \u03C1_G). Not modelled: inlet devices, droplet-size distribution, CFD, internals efficiency, slug hydrodynamics, foam or re-entrainment. Screening basis only.",
        "K-factor: per API 521 screening guidance. K-factor pressure correction (GPSA Fig 7-9, if enabled) is an approximate screening treatment only — NOT a rigorous universal correction for all flare KO service; verify against project/company design basis.",
        "K_eff reported in m/s with separate K_base, pressure-correction factor Cp, and corrected K_eff = K_base \u00D7 Cp shown in calculation steps for traceability.",
        "Standard gas conversion basis (where applicable): 15\u00B0C and 1.01325 bar(a) per ISO 13443.",
        "Liquid design volume: governing scenario net accumulation (Q_l \u00D7 event duration) + rainout allowance \u2212 drain credit. Governing = single non-concurrent worst-case event. Sump dead volume addressed via sump zone height in geometry \u2014 not included in net accumulation figure.",
        "Drain adequacy check: instantaneous screening indicator (Q_drain vs. peak Q_l). Not a final drain design check \u2014 final adequacy depends on event duration, total volume, sump capacity, pump start-up, level philosophy, and actual hydraulics.",
        "Gross vessel face velocity computed on gross cross-sectional area \u2014 NOT actual mist-pad effective area. Demister vendor sizing requires actual pad dimensions and net area.",
        "API 521-based flare KO screening minimum diameter of 1500 mm applied where gas-capacity result is smaller. This is a screening guideline, not an unconditional universal rule; verify against project design basis.",
        "Dynamic simulation: recommended only if multiple transient scenarios could overlap or if severe accumulation risk is identified. Not automatically required for all multi-scenario cases.",
        "Vessel geometry: gas capacity diameter + net liquid accumulation volume + user-defined allowance zones (inlet, disengagement, mist eliminator, sump, nozzle). Vessel heads not included in volume.",
      ],
      assumptions: result.assumptions,
      references: [
        "API 521: Pressure-relieving and Depressuring Systems, Section 5.4.2",
        "API 12J: Specification for Oil and Gas Separators",
        "GPSA Engineering Data Book, Section 7: Separation Equipment",
      ],
      warnings: [
        ...result.warnings,
        ...result.flags.map(f => FLAG_LABELS[f] || f.replace(/_/g, " ")),
      ].filter(Boolean),
      additionalSections: [
        ...additionalSections,
        ...(result.recommendations && result.recommendations.length > 0 ? [{
          title: "Engineering Recommendations",
          items: result.recommendations.map((r: string, i: number) => ({ label: `${i + 1}. ${r}`, value: "", unit: "" })),
        }] : []),
      ],
    };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Flare Knock Out Drum Sizing</h1>
            <p className="text-sm text-muted-foreground">Flare KO Drum Preliminary Sizing / Screening Tool — API 521 Section 5.4.2</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UnitSelector value={unitSystem} onChange={ns => setUnitSystem(ns)} />
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-amber-700/40 bg-amber-950/20 px-4 py-3" data-testid="banner-screening-tool">
        <div className="flex items-start gap-2">
          <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div className="text-xs text-amber-200 space-y-0.5">
            <p className="font-semibold text-amber-300">Preliminary Screening Tool — Not for Direct Design Use</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-200/80">
              <li>Not final vessel or internals design — wall thickness, nozzle loads, and weight require formal mechanical design</li>
              <li>Not a dynamic transient flare-hydraulics model — transient peak loads may exceed the steady-state basis</li>
              <li>Not a substitute for a project-specific relief/flare study or detailed drain-system design</li>
              <li>Gross vessel face velocity is reported on gross cross-sectional area — actual mist-pad sizing requires vendor confirmation</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-test-flare-ko">
          <FlaskConical className="w-3.5 h-3.5 mr-1" /> Flare KO Drum Test
        </Button>
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
                {isCompleted ? "\u2713" : t.step}
              </span>
              <span className="hidden sm:inline">{t.label}</span>
              {i < TABS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 ml-1" />}
            </button>
          );
        })}
      </div>

      {result && result.flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" data-testid="flags-banner">
          {result.flags.map(f => (
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

        <TabsContent value="project">
          <div className="space-y-4">
            <StepHeader step={1} title="Project Setup" desc="Enter project information and calculation options." />
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Project Setup</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Case Name / ID</Label>
                  <Input value={project.caseName} onChange={e => updateProject("caseName", e.target.value)} placeholder="e.g. V-8001 Flare KO Drum" data-testid="input-case-name" /></div>
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
          </div>
        </TabsContent>

        <TabsContent value="scenarios">
          <div className="space-y-4">
            <StepHeader step={2} title="Relief / Blowdown Scenarios" desc="Define gas and liquid data for each relief or blowdown scenario." />
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Relief / Blowdown Scenarios</h3>
                <Button size="sm" variant="outline" onClick={addScenario} data-testid="button-add-scenario">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Scenario
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              {scenarios.map((s, idx) => (
                <div key={s.id} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                      <Input value={s.name} onChange={e => updateScenario(idx, "name", e.target.value)} className="w-40" data-testid={`input-scenario-name-${idx}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={s.scenarioType} onValueChange={v => updateScenario(idx, "scenarioType", v)}>
                        <SelectTrigger className="w-36" data-testid={`select-scenario-type-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{SCENARIO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {scenarios.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeScenario(idx)} data-testid={`button-remove-scenario-${idx}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground">Gas</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div><Label className="text-xs mb-1 block">Gas Flow Rate ({s.gasFlowBasis === "actual" ? pU("flowActualGas", unitSystem) : pU("flowGas", unitSystem)})</Label>
                      <NumericInput value={s.gasFlowRate} onValueChange={v => updateScenario(idx, "gasFlowRate", v)} data-testid={`input-gas-flow-${idx}`} /></div>
                    <div>
                      <Label className="text-xs mb-1 block">Flow Basis</Label>
                      <Select value={s.gasFlowBasis} onValueChange={v => updateScenario(idx, "gasFlowBasis", v)}>
                        <SelectTrigger data-testid={`select-gas-basis-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actual">Actual (at vessel P,T)</SelectItem>
                          <SelectItem value="standard">Standard (Sm³/h or MMSCFD)</SelectItem>
                        </SelectContent>
                      </Select>
                      {s.gasFlowBasis === "standard" && (
                        <p className="text-[10px] text-blue-400/80 mt-1 flex items-center gap-1">
                          <Info className="w-3 h-3 shrink-0" />
                          Standard gas basis: 15°C and 1.01325 bar(a) per ISO 13443. Requires P, T, Z, and MW inputs.
                        </p>
                      )}
                    </div>
                    <div><Label className="text-xs mb-1 block">Gas Density ({pU("density", unitSystem)})</Label>
                      <NumericInput value={s.gasDensity} onValueChange={v => updateScenario(idx, "gasDensity", v)} data-testid={`input-gas-density-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">MW (kg/kmol)</Label>
                      <NumericInput value={s.gasMW} onValueChange={v => updateScenario(idx, "gasMW", v)} data-testid={`input-gas-mw-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Pressure ({pU("pressureAbs", unitSystem)}) abs</Label>
                      <NumericInput value={s.gasPressure} onValueChange={v => updateScenario(idx, "gasPressure", v)} data-testid={`input-gas-p-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Temperature ({pU("temperature", unitSystem)})</Label>
                      <NumericInput value={s.gasTemperature} onValueChange={v => updateScenario(idx, "gasTemperature", v)} data-testid={`input-gas-t-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Z factor</Label>
                      <NumericInput value={s.gasZ} onValueChange={v => updateScenario(idx, "gasZ", v)} data-testid={`input-gas-z-${idx}`} /></div>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground">Liquid Carryover</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div><Label className="text-xs mb-1 block">Liquid Carryover Rate ({pU("flowLiquid", unitSystem)})</Label>
                      <NumericInput value={s.liquidCarryoverRate} onValueChange={v => updateScenario(idx, "liquidCarryoverRate", v)} data-testid={`input-liq-carryover-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Liquid Density ({pU("density", unitSystem)})</Label>
                      <NumericInput value={s.liquidDensity} onValueChange={v => updateScenario(idx, "liquidDensity", v)} data-testid={`input-liq-density-${idx}`} /></div>
                    <div><Label className="text-xs mb-1 block">Duration (minutes)</Label>
                      <NumericInput value={s.duration} onValueChange={v => updateScenario(idx, "duration", v)} data-testid={`input-duration-${idx}`} /></div>
                  </div>

                  <div><Label className="text-xs mb-1 block">Notes</Label>
                    <Input value={s.notes} onChange={e => updateScenario(idx, "notes", e.target.value)} placeholder="Optional notes for this scenario" data-testid={`input-notes-${idx}`} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="config">
          <div className="space-y-4">
            <StepHeader step={3} title="Design Basis" desc="Configure orientation, internals, K-value and vessel constraints." />
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" /> Design Basis</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className={`rounded-md p-3 space-y-2 ${
                orientationRec.confidence === "strong"
                  ? "bg-green-500/10 border border-green-500/30"
                  : orientationRec.confidence === "moderate"
                    ? "bg-yellow-500/10 border border-yellow-500/30"
                    : "bg-blue-500/10 border border-blue-500/30"
              }`} data-testid="panel-orientation-recommendation">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4" />
                    <span className="text-sm font-medium">Orientation Recommendation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${
                      orientationRec.confidence === "strong"
                        ? "border-green-500/50 text-green-600 dark:text-green-400"
                        : orientationRec.confidence === "moderate"
                          ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                          : "border-blue-500/50 text-blue-600 dark:text-blue-400"
                    }`} data-testid="badge-confidence">
                      {orientationRec.confidence}
                    </Badge>
                    <Badge variant="secondary" className="text-xs" data-testid="badge-recommended-orientation">
                      {orientationRec.recommendedOrientation}
                    </Badge>
                  </div>
                </div>
                {orientationRec.gvf > 0 && (
                  <p className="text-xs text-muted-foreground" data-testid="text-gvf-value">
                    GVF = {orientationRec.gvf.toFixed(4)}
                  </p>
                )}
                <ul className="text-xs space-y-0.5" data-testid="list-orientation-reasons">
                  {orientationRec.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground italic">
                  Per API 521 Section 5.4.2, KO drums are typically vertical. Horizontal may be used for large liquid accumulation volumes.
                </p>
                {config.orientation !== orientationRec.recommendedOrientation && orientationRec.recommendedOrientation !== "either" && (
                  <div className="flex items-center gap-2 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      Current selection ({config.orientation}) differs from recommendation ({orientationRec.recommendedOrientation})
                    </span>
                    <Button size="sm" variant="outline" onClick={() => updateConfig("orientation", orientationRec.recommendedOrientation)} data-testid="button-use-recommendation">
                      Use Recommendation
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Orientation</Label>
                  <Select value={config.orientation} onValueChange={v => updateConfig("orientation", v)}>
                    <SelectTrigger data-testid="select-orientation"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs mb-1.5 block">Internals</Label>
                  <Select value={config.internals} onValueChange={v => updateConfig("internals", v)}>
                    <SelectTrigger data-testid="select-internals"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bare">Bare vessel (no mist eliminator)</SelectItem>
                      <SelectItem value="wire_mesh">Wire mesh pad</SelectItem>
                    </SelectContent>
                  </Select></div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Souders\u2013Brown K Value (API 521)</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">K Guidance (API 521 ranges)</Label>
                    <Select onValueChange={v => {
                      const g = K_GUIDANCE_KO[v];
                      if (g) { updateConfig("kValue", g.typical); updateConfig("kMode", "typical"); }
                    }}>
                      <SelectTrigger data-testid="select-k-guidance"><SelectValue placeholder="Select guidance..." /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(K_GUIDANCE_KO).map(([k, v]) => (
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
                    <p className="text-xs text-blue-400"><Info className="w-3 h-3 inline mr-1" />K value from typical API 521 guidance. Confirm suitability for your specific service.</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">K-Factor Corrections</p>
                <div className="flex items-center gap-2">
                  <Checkbox id="chk-pressure-corr" checked={config.applyPressureCorrection} onCheckedChange={v => updateConfig("applyPressureCorrection", !!v)} data-testid="chk-pressure-correction" />
                  <Label htmlFor="chk-pressure-corr" className="text-xs">Apply GPSA Fig 7-9 pressure correction — approximate screening treatment only (typically disabled for near-atmospheric KO drums; verify against project design basis for final design)</Label>
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Drain System</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Drain Line Nominal Size (in)</Label>
                    <NumericInput value={config.drainLineSize} onValueChange={v => updateConfig("drainLineSize", v)} data-testid="input-drain-size" /></div>
                  <div><Label className="text-xs mb-1.5 block">Drain Rate (m\u00B3/h)</Label>
                    <NumericInput value={config.drainRate} onValueChange={v => updateConfig("drainRate", v)} data-testid="input-drain-rate" /></div>
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
          </div>
        </TabsContent>

        <TabsContent value="gas">
          <div className="space-y-4">
            <StepHeader step={4} title="Gas Capacity Sizing" desc="Souders-Brown correlation results for each scenario." />
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
                {result.scenarioResults.map((sr) => (
                  <div key={sr.scenarioId} className={`border rounded-md p-3 space-y-2 ${sr.scenarioId === result.governingScenarioId ? "border-primary/50 bg-primary/5" : ""}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium">{sr.scenarioName}</span>
                      {sr.scenarioId === result.governingScenarioId && <Badge variant="default" className="text-xs">Governing</Badge>}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                      <div><span className="text-muted-foreground">v_s,max:</span> <span className="font-mono">{sr.v_s_max.toFixed(3)} m/s</span></div>
                      <div><span className="text-muted-foreground">A_req:</span> <span className="font-mono">{sr.A_req.toFixed(4)} m\u00B2</span></div>
                      <div><span className="text-muted-foreground">D_req:</span> <span className="font-mono">{sr.D_req_mm.toFixed(0)} mm</span></div>
                    </div>
                    {project.showIntermediateSteps && sr.steps.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b"><th className="text-left py-1 pr-2">Step</th><th className="text-left py-1 pr-2">Equation</th><th className="text-left py-1 pr-2">Substitution</th><th className="text-right py-1 pr-2">Value</th><th className="text-left py-1">Unit</th></tr></thead>
                          <tbody>{sr.steps.map((s, si) => (
                            <tr key={si} className="border-b border-border/30">
                              <td className="py-1 pr-2 text-muted-foreground">{s.label}</td>
                              <td className="py-1 pr-2 font-mono text-muted-foreground">{s.equation}</td>
                              <td className="py-1 pr-2 font-mono text-muted-foreground">{s.substitution}</td>
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
                  <strong>Governing scenario:</strong> {result.governingReason}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </TabsContent>

        <TabsContent value="liquid">
          <div className="space-y-4">
            <StepHeader step={5} title="Liquid Accumulation" desc="Define holdup time, rainout fraction and review liquid volumes." />
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Droplets className="w-4 h-4" /> Liquid Accumulation</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="rounded-md border border-blue-900/30 bg-blue-950/10 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80 mb-1">Liquid Design Volume Basis</p>
                <p>Design volume = governing scenario accumulation (Q_liquid × event duration) + rainout allowance − drain credit. Governing = single non-concurrent event with the largest carryover volume. Sump dead volume is handled via the Sump Zone height allowance in Design tab, and is <em>not</em> included in the net accumulation figure.</p>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Rainout Fraction (0–1)</Label>
                <NumericInput step="0.01" value={holdup.rainoutFraction} onValueChange={v => updateHoldup("rainoutFraction", v)} data-testid="input-rainout" />
                <p className="text-xs text-muted-foreground mt-1">Fraction of governing event carryover volume attributed to header rainout/condensation. Set to 0 if not applicable or unknown.</p>
              </div>

              {result && (
                <div className="pt-2 border-t space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Scenario Liquid Accumulation</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b"><th className="text-left py-1 pr-2">Scenario</th><th className="text-right py-1 pr-2">Volume (m\u00B3)</th></tr></thead>
                      <tbody>
                        {result.liquidAccum.scenarioVolumes.map((sv, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="py-1 pr-2">{sv.scenarioName}</td>
                            <td className="py-1 pr-2 text-right font-mono">{sv.volume_m3.toFixed(4)}</td>
                          </tr>
                        ))}
                        <tr className="border-b font-medium">
                          <td className="py-1 pr-2">Governing Accumulation</td>
                          <td className="py-1 pr-2 text-right font-mono">{result.liquidAccum.totalAccumulation_m3.toFixed(4)}</td>
                        </tr>
                        {result.liquidAccum.rainoutVolume_m3 > 0 && (
                          <tr className="border-b border-border/30">
                            <td className="py-1 pr-2">Rainout Volume</td>
                            <td className="py-1 pr-2 text-right font-mono">{result.liquidAccum.rainoutVolume_m3.toFixed(4)}</td>
                          </tr>
                        )}
                        <tr className="border-b border-border/30">
                          <td className="py-1 pr-2">Total with Rainout</td>
                          <td className="py-1 pr-2 text-right font-mono">{result.liquidAccum.totalWithRainout_m3.toFixed(4)}</td>
                        </tr>
                        {result.liquidAccum.drainVolume_m3 > 0 && (
                          <tr className="border-b border-border/30">
                            <td className="py-1 pr-2">Drain Volume (credit)</td>
                            <td className="py-1 pr-2 text-right font-mono">{result.liquidAccum.drainVolume_m3.toFixed(4)}</td>
                          </tr>
                        )}
                        <tr className="font-bold">
                          <td className="py-1 pr-2">Net Accumulation</td>
                          <td className="py-1 pr-2 text-right font-mono">{result.liquidAccum.netAccumulation_m3.toFixed(4)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {!result.liquidAccum.drainAdequate && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                      <AlertTriangle className="w-3 h-3 inline mr-1" /><strong>Drain-rate screening flag (preliminary indicator only):</strong> Instantaneous drain rate appears insufficient for peak carryover rate. This is a preliminary screening indicator — final drain adequacy requires detailed drain system analysis (line sizing, pump selection, level philosophy, event duration).
                    </div>
                  )}

                  {project.showIntermediateSteps && result.liquidAccum.steps.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Liquid Accumulation Steps</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b"><th className="text-left py-1 pr-2">Step</th><th className="text-left py-1 pr-2">Equation</th><th className="text-left py-1 pr-2">Substitution</th><th className="text-right py-1 pr-2">Value</th><th className="text-left py-1">Unit</th></tr></thead>
                          <tbody>{result.liquidAccum.steps.map((s, si) => (
                            <tr key={si} className="border-b border-border/30">
                              <td className="py-1 pr-2 text-muted-foreground">{s.label}</td>
                              <td className="py-1 pr-2 font-mono text-muted-foreground">{s.equation}</td>
                              <td className="py-1 pr-2 font-mono text-muted-foreground">{s.substitution}</td>
                              <td className="py-1 pr-2 text-right font-mono">{typeof s.result === "number" ? s.result.toFixed(4) : s.result}</td>
                              <td className="py-1">{s.unit}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="geometry">
          <div className="space-y-4">
            <StepHeader step={6} title="Geometry Assembly" desc="Review vessel dimensions, L/D ratio and geometry checks." />
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
                    { label: "Liquid Volume (net accum.)", value: `${result.geometry.liquidVolume_m3.toFixed(3)} m\u00B3` },
                    { label: "Gas Area Fraction", value: `${(result.geometry.gasAreaFraction * 100).toFixed(1)}%` },
                    { label: "Actual Gas Velocity", value: `${result.geometry.actualGasVelocity.toFixed(3)} m/s` },
                    { label: "Gross Vessel Face Velocity (screening est.)", value: `${result.geometry.grossFaceVelocity.toFixed(3)} m/s` },
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
                            <td className="py-1 pr-2 font-mono text-muted-foreground">{s.substitution}</td>
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
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="space-y-4">
            <StepHeader step={7} title="Results Summary" desc="Review sizing results, flags and export." />
          {!result ? (
            <Card><CardContent className="py-12 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Run calculation first</p>
              <Button onClick={handleCalculate} data-testid="button-calculate-results">Calculate</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 flex items-start gap-2" data-testid="banner-screening-scope">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">
                  <span className="font-semibold">Preliminary Screening Tool Only.</span> Results are for concept / FEED support only. This calculator does not replace a detailed flare/relief study, final mechanical design, mist eliminator vendor sizing, or dynamic transient simulation. All outputs require verification against the project/company design basis before use in final engineering documents.
                </p>
              </div>
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
                        <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToCalcNote(d); }} data-testid="button-export-calc-note">
                          <FileText className="w-4 h-4 mr-2 text-red-400" />
                          Calc Note (Print / PDF)
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
                      <p className="text-lg font-mono">{result.geometry.vesselVolume_m3.toFixed(2)} m\u00B3</p>
                    </div>
                    <div className="p-3 rounded-md border text-center">
                      <p className="text-xs text-muted-foreground">L/D Ratio</p>
                      <p className="text-lg font-mono">{result.geometry.LD_ratio.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div className="p-2 rounded-md border">
                      <span className="text-muted-foreground">Governing Scenario:</span> <span className="font-medium">{result.scenarioResults.find(r => r.scenarioId === result.governingScenarioId)?.scenarioName}</span>
                    </div>
                    <div className="p-2 rounded-md border">
                      <span className="text-muted-foreground">v_s,max:</span> <span className="font-mono">{result.scenarioResults.find(r => r.scenarioId === result.governingScenarioId)?.v_s_max.toFixed(3)} m/s</span>
                    </div>
                    <div className="p-2 rounded-md border">
                      <span className="text-muted-foreground">Actual Gas Velocity:</span> <span className="font-mono">{result.geometry.actualGasVelocity.toFixed(3)} m/s</span>
                    </div>
                    <div className="p-2 rounded-md border">
                      <span className="text-muted-foreground">Net Liquid Accumulation:</span> <span className="font-mono">{result.liquidAccum.netAccumulation_m3.toFixed(3)} m\u00B3</span>
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
                    "API 521: Pressure-relieving and Depressuring Systems, Section 5.4.2",
                    "API 12J: Specification for Oil and Gas Separators",
                    "GPSA Engineering Data Book, Section 7: Separation Equipment",
                  ]}
                />
              )}

              <FeedbackSection calculatorName="Flare KO Drum" />
            </div>
          )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-muted/30">
        <Button size="sm" variant="outline" onClick={goPrev} disabled={tabIdx <= 0} data-testid="button-prev">
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        <div className="text-xs text-muted-foreground">
          Step {tabIdx + 1} of {TABS.length}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "liquid" ? (
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
          ) : activeTab !== "results" ? (
            <Button size="sm" variant="outline" onClick={goNext} disabled={tabIdx >= TABS.length - 1} data-testid="button-next">
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : result ? (
            <Button size="sm" variant="outline" onClick={() => setActiveTab("liquid")} data-testid="button-back-to-calc">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Recalculate
            </Button>
          ) : null}
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
