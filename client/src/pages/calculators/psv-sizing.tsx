import { useState, useMemo } from "react";
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
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { COMMON_GASES, COMMON_LIQUIDS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import {
  type PRDProject, type PRDEquipment, type PRDScenario, type PRDDevice,
  type PRDSizingInput, type PRDSizingResult, type PRDPipingInput,
  type PRDPipingResult, type PRDBackpressureResult, type OrificeSelection,
  type SizingFluidType, type ScenarioType, type DeviceType, type PRDFinalResult,
  SCENARIO_TEMPLATES, OVERPRESSURE_DEFAULTS, API_526_ORIFICES,
  createDefaultScenario, findGoverningCase, calculateRelievingPressure,
  sizePRD, selectAPI526Orifice, calculateInletPressureDrop,
  calculateBackpressure, recommendDeviceType, buildFinalResult,
  estimateFireCaseReliefRate, PRD_TEST_CASE,
} from "@/lib/engineering/prdSizing";
import {
  Shield, FlaskConical, RotateCcw, AlertTriangle,
  ChevronLeft, ChevronRight, ClipboardList, Settings2,
  Flame, Target, Wrench, Calculator, CircleDot,
  PipetteIcon, CheckCircle2, Plus, Trash2, Info,
} from "lucide-react";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "equipment", label: "Equipment", icon: Settings2, step: 2 },
  { id: "scenarios", label: "Scenarios", icon: Flame, step: 3 },
  { id: "governing", label: "Governing", icon: Target, step: 4 },
  { id: "device", label: "Device", icon: Wrench, step: 5 },
  { id: "sizing", label: "Sizing", icon: Calculator, step: 6 },
  { id: "orifice", label: "Orifice", icon: CircleDot, step: 7 },
  { id: "piping", label: "Piping", icon: PipetteIcon, step: 8 },
  { id: "results", label: "Results", icon: CheckCircle2, step: 9 },
];

const defaultProject: PRDProject = {
  name: "", client: "", location: "", caseId: "",
  engineer: "", date: new Date().toISOString().split("T")[0],
  atmosphericPressure: 1.01325,
};

const defaultEquipment: PRDEquipment = {
  tag: "", service: "", mawp: 0, designTemp: 0,
  normalOpPressure: 0, normalOpTemp: 0, setPressure: 0,
  overpressurePercent: 10, overpressureBasis: "non_fire",
};

const defaultDevice: PRDDevice = {
  type: "conventional", backpressureConcern: false,
  corrosionConcern: false, pluggingConcern: false,
  tightnessRequired: false, twoPhaseRisk: false,
};

const defaultSizing: PRDSizingInput = {
  fluidType: "gas", relievingRate: 0, molecularWeight: 28.97,
  specificHeatRatio: 1.4, compressibilityFactor: 1.0,
  relievingTemperature: 25, liquidDensity: 998, viscosity: 1.0,
  vaporPressure: 0, kd: 0.975, kb: 1.0, kc: 1.0, ksh: 1.0,
  relievingPressureAbs: 0, backPressureAbs: 1.01325, atmosphericPressure: 1.01325,
};

const defaultPiping: PRDPipingInput = {
  pipeDiameter: 100, pipeLength: 3, roughness: 0.046,
  fittingsK: 2.0, elevationChange: 0,
};

export default function PSVSizingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [activeTab, setActiveTab] = useState("project");
  const [project, setProject] = useState<PRDProject>({ ...defaultProject });
  const [equipment, setEquipment] = useState<PRDEquipment>({ ...defaultEquipment });
  const [scenarios, setScenarios] = useState<PRDScenario[]>([]);
  const [governingIndex, setGoverningIndex] = useState(-1);
  const [device, setDevice] = useState<PRDDevice>({ ...defaultDevice });
  const [sizing, setSizing] = useState<PRDSizingInput>({ ...defaultSizing });
  const [inletPiping, setInletPiping] = useState<PRDPipingInput>({ ...defaultPiping });
  const [outletPiping, setOutletPiping] = useState<PRDPipingInput>({ ...defaultPiping, pipeLength: 10, fittingsK: 5.0 });
  const [superimposedBP, setSuperimposedBP] = useState(0);
  const [sizingResult, setSizingResult] = useState<PRDSizingResult | null>(null);
  const [orificeSelection, setOrificeSelection] = useState<OrificeSelection | null>(null);
  const [inletResult, setInletResult] = useState<PRDPipingResult | null>(null);
  const [bpResult, setBpResult] = useState<PRDBackpressureResult | null>(null);
  const [finalResult, setFinalResult] = useState<PRDFinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const relievingP = useMemo(() =>
    calculateRelievingPressure(
      convertToSI("pressure", equipment.setPressure, unitSystem),
      equipment.overpressurePercent,
      project.atmosphericPressure
    ),
    [equipment.setPressure, equipment.overpressurePercent, project.atmosphericPressure, unitSystem]
  );

  const autoGoverning = useMemo(() => findGoverningCase(scenarios), [scenarios]);

  const handleUnitToggle = (ns: UnitSystem) => {
    if (ns === unitSystem) return;
    const conv = (param: string, val: number) => {
      if (unitSystem === "SI" && ns === "Field") return convertFromSI(param, val, "Field");
      if (unitSystem === "Field" && ns === "SI") return convertToSI(param, val, "Field");
      return val;
    };
    setEquipment(e => ({
      ...e,
      mawp: conv("pressure", e.mawp),
      normalOpPressure: conv("pressure", e.normalOpPressure),
      setPressure: conv("pressure", e.setPressure),
      designTemp: conv("temperature", e.designTemp),
      normalOpTemp: conv("temperature", e.normalOpTemp),
    }));
    setSizing(s => ({
      ...s,
      relievingTemperature: conv("temperature", s.relievingTemperature),
      backPressureAbs: conv("pressureAbs", s.backPressureAbs),
    }));
    setInletPiping(p => ({
      ...p,
      pipeDiameter: conv("diameter", p.pipeDiameter),
      pipeLength: conv("length", p.pipeLength),
      elevationChange: conv("length", p.elevationChange),
    }));
    setOutletPiping(p => ({
      ...p,
      pipeDiameter: conv("diameter", p.pipeDiameter),
      pipeLength: conv("length", p.pipeLength),
      elevationChange: conv("length", p.elevationChange),
    }));
    setUnitSystem(ns);
  };

  const addScenario = (type: ScenarioType) => {
    setScenarios(prev => [...prev, createDefaultScenario(type)]);
  };

  const updateScenario = (idx: number, updates: Partial<PRDScenario>) => {
    setScenarios(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const removeScenario = (idx: number) => {
    setScenarios(prev => prev.filter((_, i) => i !== idx));
    if (governingIndex === idx) setGoverningIndex(-1);
    else if (governingIndex > idx) setGoverningIndex(g => g - 1);
  };

  const handleSizing = () => {
    setError(null);
    try {
      const gov = governingIndex >= 0 ? scenarios[governingIndex] : null;
      if (!gov) throw new Error("Select a governing case before sizing");
      if (gov.relievingRate <= 0) throw new Error("Governing case has zero relief rate");
      if (equipment.setPressure <= 0) throw new Error("Set pressure must be positive");

      const rp = calculateRelievingPressure(
        convertToSI("pressure", equipment.setPressure, unitSystem),
        equipment.overpressurePercent,
        project.atmosphericPressure
      );

      const bpAbs = convertToSI("pressureAbs", sizing.backPressureAbs, unitSystem);

      const input: PRDSizingInput = {
        ...sizing,
        relievingRate: gov.relievingRate,
        relievingTemperature: convertToSI("temperature", sizing.relievingTemperature, unitSystem),
        relievingPressureAbs: rp.abs,
        backPressureAbs: bpAbs,
        atmosphericPressure: project.atmosphericPressure,
      };

      const result = sizePRD(input);
      setSizingResult(result);

      const orifice = selectAPI526Orifice(result.requiredArea);
      setOrificeSelection(orifice);

      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sizing calculation error");
      setSizingResult(null);
      setOrificeSelection(null);
    }
  };

  const handlePipingCheck = () => {
    if (!sizingResult || governingIndex < 0) return;
    const gov = scenarios[governingIndex];
    try {
      const T_K = convertToSI("temperature", sizing.relievingTemperature, unitSystem) + 273.15;
      const P_Pa = relievingP.abs * 1e5;
      const density = sizing.fluidType === "liquid"
        ? sizing.liquidDensity
        : (sizing.molecularWeight * P_Pa) / (8314.46 * T_K * sizing.compressibilityFactor);
      const visc = sizing.fluidType === "liquid" ? sizing.viscosity : 0.015;
      const setPressure_bar = convertToSI("pressure", equipment.setPressure, unitSystem);

      const inletP: PRDPipingInput = {
        pipeDiameter: convertToSI("diameter", inletPiping.pipeDiameter, unitSystem),
        pipeLength: convertToSI("length", inletPiping.pipeLength, unitSystem),
        roughness: inletPiping.roughness,
        fittingsK: inletPiping.fittingsK,
        elevationChange: convertToSI("length", inletPiping.elevationChange, unitSystem),
      };

      const iResult = calculateInletPressureDrop(inletP, gov.relievingRate, density, visc, setPressure_bar);
      setInletResult(iResult);

      const outletP: PRDPipingInput = {
        pipeDiameter: convertToSI("diameter", outletPiping.pipeDiameter, unitSystem),
        pipeLength: convertToSI("length", outletPiping.pipeLength, unitSystem),
        roughness: outletPiping.roughness,
        fittingsK: outletPiping.fittingsK,
        elevationChange: convertToSI("length", outletPiping.elevationChange, unitSystem),
      };
      const supBP = convertToSI("pressure", superimposedBP, unitSystem);
      const bpRes = calculateBackpressure(outletP, gov.relievingRate, density, visc, supBP, setPressure_bar, device.type);
      setBpResult(bpRes);
    } catch {
      setInletResult(null);
      setBpResult(null);
    }
  };

  const handleBuildResults = () => {
    if (!sizingResult || !orificeSelection || governingIndex < 0) return;
    const result = buildFinalResult(
      project, equipment, scenarios, governingIndex,
      sizingResult, orificeSelection, inletResult, bpResult, device.type
    );
    setFinalResult(result);
  };

  const loadTestCase = () => {
    setUnitSystem("SI");
    setError(null);
    setSizingResult(null);
    setOrificeSelection(null);
    setInletResult(null);
    setBpResult(null);
    setFinalResult(null);
    const tc = PRD_TEST_CASE;
    setProject({ ...tc.project });
    setEquipment({ ...tc.equipment });
    setScenarios([{ ...tc.scenario }]);
    setGoverningIndex(0);
    setDevice({ ...defaultDevice });
    setSizing({ ...tc.sizing });
    setInletPiping({ ...defaultPiping });
    setOutletPiping({ ...defaultPiping, pipeLength: 10, fittingsK: 5.0 });
    setSuperimposedBP(0);
    setActiveTab("project");
  };

  const handleReset = () => {
    setProject({ ...defaultProject });
    setEquipment({ ...defaultEquipment });
    setScenarios([]);
    setGoverningIndex(-1);
    setDevice({ ...defaultDevice });
    setSizing({ ...defaultSizing });
    setInletPiping({ ...defaultPiping });
    setOutletPiping({ ...defaultPiping, pipeLength: 10, fittingsK: 5.0 });
    setSuperimposedBP(0);
    setSizingResult(null);
    setOrificeSelection(null);
    setInletResult(null);
    setBpResult(null);
    setFinalResult(null);
    setError(null);
    setActiveTab("project");
  };

  const handleGasSelect = (name: string) => {
    const g = COMMON_GASES[name];
    if (g) setSizing(s => ({ ...s, molecularWeight: g.mw, specificHeatRatio: g.gamma }));
  };

  const handleLiquidSelect = (name: string) => {
    const l = COMMON_LIQUIDS[name];
    if (l) setSizing(s => ({ ...s, liquidDensity: l.density, viscosity: l.viscosity }));
  };

  const goNext = () => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
  };

  const goPrev = () => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx > 0) setActiveTab(TABS[idx - 1].id);
  };

  const currentTabIdx = TABS.findIndex(t => t.id === activeTab);

  const pU = getUnit("pressure", unitSystem);
  const tU = getUnit("temperature", unitSystem);
  const dU = getUnit("diameter", unitSystem);
  const lU = getUnit("length", unitSystem);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <Card className="mb-6 bg-amber-950/30 border-amber-800/50">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-200" data-testid="text-screening-label">PRELIMINARY ENGINEERING TOOL — NOT FOR FINAL DESIGN</p>
            <p className="text-xs text-amber-200/70">Final sizing must be confirmed by qualified engineers with vendor certified capacity data and detailed process simulation.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">PRD / Flare Relief Calculator</h1>
            <p className="text-sm text-muted-foreground">API 521 / 520 / 526 — Pressure Relief Device Sizing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
            <FlaskConical className="w-3.5 h-3.5 mr-1" /> Test Case
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto mb-4">
          <TabsList className="inline-flex w-auto min-w-full" data-testid="tabs-prd">
            {TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs" data-testid={`tab-${tab.id}`}>
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <Badge variant="outline" className="text-[9px] ml-0.5 px-1">{tab.step}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4" data-testid="text-error">{error}</div>}

        {/* TAB 1: PROJECT SETUP */}
        <TabsContent value="project">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Project Information</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Project Name</Label>
                  <Input value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} data-testid="input-project-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Client</Label>
                  <Input value={project.client} onChange={e => setProject(p => ({ ...p, client: e.target.value }))} data-testid="input-project-client" /></div>
                <div><Label className="text-xs mb-1.5 block">Location</Label>
                  <Input value={project.location} onChange={e => setProject(p => ({ ...p, location: e.target.value }))} data-testid="input-project-location" /></div>
                <div><Label className="text-xs mb-1.5 block">Case ID</Label>
                  <Input value={project.caseId} onChange={e => setProject(p => ({ ...p, caseId: e.target.value }))} data-testid="input-project-caseid" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => setProject(p => ({ ...p, engineer: e.target.value }))} data-testid="input-project-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => setProject(p => ({ ...p, date: e.target.value }))} data-testid="input-project-date" /></div>
              </div>
              <div className="pt-2 border-t">
                <div className="max-w-xs">
                  <Label className="text-xs mb-1.5 block">Atmospheric Pressure (bar abs)</Label>
                  <Input type="number" value={project.atmosphericPressure} onChange={e => setProject(p => ({ ...p, atmosphericPressure: parseFloat(e.target.value) || 0 }))} data-testid="input-atm-pressure" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: EQUIPMENT & SET PRESSURE */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Equipment & Set Pressure</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Equipment Tag</Label>
                  <Input value={equipment.tag} onChange={e => setEquipment(eq => ({ ...eq, tag: e.target.value }))} data-testid="input-equip-tag" /></div>
                <div><Label className="text-xs mb-1.5 block">Service Description</Label>
                  <Input value={equipment.service} onChange={e => setEquipment(eq => ({ ...eq, service: e.target.value }))} data-testid="input-equip-service" /></div>
                <div><Label className="text-xs mb-1.5 block">MAWP ({pU}g)</Label>
                  <Input type="number" value={equipment.mawp || ""} onChange={e => setEquipment(eq => ({ ...eq, mawp: parseFloat(e.target.value) || 0 }))} data-testid="input-equip-mawp" /></div>
                <div><Label className="text-xs mb-1.5 block">Design Temperature ({tU})</Label>
                  <Input type="number" value={equipment.designTemp || ""} onChange={e => setEquipment(eq => ({ ...eq, designTemp: parseFloat(e.target.value) || 0 }))} data-testid="input-equip-design-temp" /></div>
                <div><Label className="text-xs mb-1.5 block">Normal Operating Pressure ({pU}g)</Label>
                  <Input type="number" value={equipment.normalOpPressure || ""} onChange={e => setEquipment(eq => ({ ...eq, normalOpPressure: parseFloat(e.target.value) || 0 }))} data-testid="input-equip-op-pressure" /></div>
                <div><Label className="text-xs mb-1.5 block">Normal Operating Temperature ({tU})</Label>
                  <Input type="number" value={equipment.normalOpTemp || ""} onChange={e => setEquipment(eq => ({ ...eq, normalOpTemp: parseFloat(e.target.value) || 0 }))} data-testid="input-equip-op-temp" /></div>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Set Pressure & Overpressure</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><Label className="text-xs mb-1.5 block">Set Pressure ({pU}g)</Label>
                    <Input type="number" value={equipment.setPressure || ""} onChange={e => setEquipment(eq => ({ ...eq, setPressure: parseFloat(e.target.value) || 0 }))} data-testid="input-equip-set-p" /></div>
                  <div><Label className="text-xs mb-1.5 block">Overpressure Basis</Label>
                    <Select value={equipment.overpressureBasis} onValueChange={(v: PRDEquipment["overpressureBasis"]) => {
                      const def = OVERPRESSURE_DEFAULTS[v];
                      setEquipment(eq => ({ ...eq, overpressureBasis: v, overpressurePercent: def?.percent || eq.overpressurePercent }));
                    }}>
                      <SelectTrigger data-testid="select-op-basis"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(OVERPRESSURE_DEFAULTS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1.5 block">Overpressure (%)</Label>
                    <Input type="number" value={equipment.overpressurePercent} onChange={e => setEquipment(eq => ({ ...eq, overpressurePercent: parseFloat(e.target.value) || 0 }))} data-testid="input-equip-op-pct" /></div>
                </div>
              </div>
              {equipment.setPressure > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3">
                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                      <div><span className="text-muted-foreground">Set Pressure:</span> <span className="font-mono font-medium" data-testid="text-set-p">{equipment.setPressure.toFixed(2)} {pU}g</span></div>
                      <div><span className="text-muted-foreground">Relieving (gauge):</span> <span className="font-mono font-medium text-primary" data-testid="text-reliev-pg">{convertFromSI("pressure", relievingP.gauge, unitSystem).toFixed(2)} {pU}g</span></div>
                      <div><span className="text-muted-foreground">Relieving (abs):</span> <span className="font-mono font-medium" data-testid="text-reliev-pa">{convertFromSI("pressureAbs", relievingP.abs, unitSystem).toFixed(2)} {pU}a</span></div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {equipment.setPressure > equipment.mawp && equipment.mawp > 0 && (
                <WarningPanel warnings={["Set pressure exceeds MAWP — verify with applicable pressure vessel code"]} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SCENARIO SCREENING */}
        <TabsContent value="scenarios">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <h3 className="font-semibold text-sm">Overpressure Scenarios (API 521)</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-wrap gap-2">
                {SCENARIO_TEMPLATES.map(tmpl => (
                  <Button key={tmpl.type} size="sm" variant="outline" onClick={() => addScenario(tmpl.type)} data-testid={`button-add-${tmpl.type}`}>
                    <Plus className="w-3 h-3 mr-1" /> {tmpl.label}
                  </Button>
                ))}
              </div>

              {scenarios.length === 0 && (
                <div className="text-center py-8">
                  <Flame className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Add overpressure scenarios to screen</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Select from the buttons above to add applicable scenarios</p>
                </div>
              )}

              {scenarios.map((scenario, idx) => {
                const tmpl = SCENARIO_TEMPLATES.find(t => t.type === scenario.type);
                return (
                  <Card key={scenario.id} className="bg-muted/30" data-testid={`scenario-card-${idx}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{tmpl?.label || scenario.type}</Badge>
                          {governingIndex === idx && <Badge className="text-[10px] bg-primary">Governing</Badge>}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeScenario(idx)} data-testid={`button-remove-scenario-${idx}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{tmpl?.description}</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div><Label className="text-xs mb-1.5 block">Relief Rate ({scenario.relievingRateUnit})</Label>
                          <Input type="number" value={scenario.relievingRate || ""} onChange={e => updateScenario(idx, { relievingRate: parseFloat(e.target.value) || 0 })} data-testid={`input-scenario-rate-${idx}`} /></div>
                        <div><Label className="text-xs mb-1.5 block">Fluid Phase</Label>
                          <Select value={scenario.fluidPhase} onValueChange={(v: PRDScenario["fluidPhase"]) => updateScenario(idx, { fluidPhase: v })}>
                            <SelectTrigger data-testid={`select-scenario-phase-${idx}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gas">Gas/Vapor</SelectItem>
                              <SelectItem value="steam">Steam</SelectItem>
                              <SelectItem value="liquid">Liquid</SelectItem>
                              <SelectItem value="two_phase">Two-Phase</SelectItem>
                            </SelectContent>
                          </Select></div>
                        <div><Label className="text-xs mb-1.5 block">Notes</Label>
                          <Input value={scenario.notes} onChange={e => updateScenario(idx, { notes: e.target.value })} placeholder="Optional notes..." data-testid={`input-scenario-notes-${idx}`} /></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: GOVERNING CASE */}
        <TabsContent value="governing">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Governing Case Selection</h3>
                {autoGoverning >= 0 && (
                  <Button size="sm" variant="outline" onClick={() => setGoverningIndex(autoGoverning)} data-testid="button-auto-governing">
                    <Target className="w-3.5 h-3.5 mr-1" /> Auto-Select (Largest Rate)
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {scenarios.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No scenarios defined — go to Scenarios tab first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scenarios.map((s, idx) => {
                    const tmpl = SCENARIO_TEMPLATES.find(t => t.type === s.type);
                    const isGoverning = governingIndex === idx;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-md cursor-pointer transition-colors ${isGoverning ? "bg-primary/15 border border-primary/30" : "bg-muted/30"}`}
                        onClick={() => setGoverningIndex(idx)}
                        data-testid={`governing-row-${idx}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isGoverning ? "border-primary" : "border-muted-foreground/30"}`}>
                            {isGoverning && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tmpl?.label || s.type}</p>
                            <p className="text-xs text-muted-foreground">{s.fluidPhase} phase</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-medium" data-testid={`text-gov-rate-${idx}`}>
                            {s.relievingRate > 0 ? s.relievingRate.toLocaleString() : "—"} {s.relievingRateUnit}
                          </p>
                          {s.relievingRate > 0 && idx === autoGoverning && (
                            <Badge variant="secondary" className="text-[9px]">Highest</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: DEVICE TYPE */}
        <TabsContent value="device">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Relief Device Type Selection</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  { type: "conventional" as DeviceType, label: "Conventional Spring", desc: "Standard valve for constant low backpressure (<10% of set)" },
                  { type: "balanced_bellows" as DeviceType, label: "Balanced Bellows", desc: "For variable or moderate backpressure (10–50% of set)" },
                  { type: "pilot_operated" as DeviceType, label: "Pilot Operated", desc: "High backpressure, tight shutoff, large orifice applications" },
                  { type: "rupture_disk" as DeviceType, label: "Rupture Disk", desc: "Corrosive/plugging service, fast-acting relief required" },
                  { type: "combination" as DeviceType, label: "Combination (RD+PSV)", desc: "Rupture disk upstream of PSV for corrosion protection" },
                ]).map(opt => (
                  <div
                    key={opt.type}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${device.type === opt.type ? "bg-primary/15 border border-primary/30" : "bg-muted/30"}`}
                    onClick={() => setDevice(d => ({ ...d, type: opt.type }))}
                    data-testid={`device-option-${opt.type}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${device.type === opt.type ? "border-primary" : "border-muted-foreground/30"}`}>
                        {device.type === opt.type && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5">{opt.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Service Conditions</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    { key: "backpressureConcern" as const, label: "Variable or high backpressure" },
                    { key: "corrosionConcern" as const, label: "Corrosive service" },
                    { key: "pluggingConcern" as const, label: "Plugging / fouling risk" },
                    { key: "tightnessRequired" as const, label: "Tight shutoff required" },
                    { key: "twoPhaseRisk" as const, label: "Two-phase flow risk" },
                  ]).map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer" data-testid={`checkbox-${opt.key}`}>
                      <input type="checkbox" checked={device[opt.key]} onChange={e => setDevice(d => ({ ...d, [opt.key]: e.target.checked }))} className="rounded" />
                      <span className="text-xs">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(() => {
                const bpPct = sizing.backPressureAbs > 0 && equipment.setPressure > 0
                  ? (sizing.backPressureAbs / equipment.setPressure) * 100 : 0;
                const rec = recommendDeviceType(device, bpPct);
                return (rec.reasons.length > 0 || rec.warnings.length > 0) ? (
                  <Card className="bg-accent/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium">Recommendation: <span className="text-primary">{rec.recommended.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span></span>
                      </div>
                      <ul className="space-y-1">
                        {rec.reasons.map((r, i) => <li key={i} className="text-xs text-muted-foreground">- {r}</li>)}
                        {rec.warnings.map((w, i) => <li key={`w${i}`} className="text-xs text-amber-400">- {w}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null;
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: SIZING */}
        <TabsContent value="sizing">
          <div className="grid gap-6 lg:grid-cols-5 items-start">
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">Sizing Parameters (API 520 Part I)</h3>
                    {governingIndex >= 0 && scenarios[governingIndex] && (
                      <Badge variant="outline" className="text-[10px]">
                        Governing: {SCENARIO_TEMPLATES.find(t => t.type === scenarios[governingIndex].type)?.label} — {scenarios[governingIndex].relievingRate.toLocaleString()} {scenarios[governingIndex].relievingRateUnit}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div><Label className="text-xs mb-1.5 block">Fluid Type</Label>
                    <Select value={sizing.fluidType} onValueChange={(v: SizingFluidType) => {
                      const newKd = v === "liquid" ? 0.65 : 0.975;
                      setSizing(s => ({ ...s, fluidType: v, kd: newKd }));
                    }}>
                      <SelectTrigger data-testid="select-fluid-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gas">Gas / Vapor</SelectItem>
                        <SelectItem value="steam">Steam</SelectItem>
                        <SelectItem value="liquid">Liquid</SelectItem>
                      </SelectContent>
                    </Select></div>

                  {sizing.fluidType === "gas" && (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div><Label className="text-xs mb-1.5 block">Gas Selection</Label>
                          <Select onValueChange={handleGasSelect}>
                            <SelectTrigger data-testid="select-gas"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>{Object.keys(COMMON_GASES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                          </Select></div>
                        <div><Label className="text-xs mb-1.5 block">MW (kg/kmol)</Label>
                          <Input type="number" value={sizing.molecularWeight || ""} onChange={e => setSizing(s => ({ ...s, molecularWeight: parseFloat(e.target.value) || 0 }))} data-testid="input-mw" /></div>
                        <div><Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
                          <Input type="number" value={sizing.specificHeatRatio || ""} onChange={e => setSizing(s => ({ ...s, specificHeatRatio: parseFloat(e.target.value) || 0 }))} data-testid="input-k" /></div>
                        <div><Label className="text-xs mb-1.5 block">Z-factor</Label>
                          <Input type="number" value={sizing.compressibilityFactor || ""} onChange={e => setSizing(s => ({ ...s, compressibilityFactor: parseFloat(e.target.value) || 0 }))} data-testid="input-z" /></div>
                      </div>
                    </div>
                  )}

                  {sizing.fluidType === "steam" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label className="text-xs mb-1.5 block">Superheat Correction Ksh</Label>
                        <Input type="number" value={sizing.ksh || ""} onChange={e => setSizing(s => ({ ...s, ksh: parseFloat(e.target.value) || 0 }))} data-testid="input-ksh" /></div>
                    </div>
                  )}

                  {sizing.fluidType === "liquid" && (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div><Label className="text-xs mb-1.5 block">Liquid Selection</Label>
                          <Select onValueChange={handleLiquidSelect}>
                            <SelectTrigger data-testid="select-liquid"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>{Object.keys(COMMON_LIQUIDS).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                          </Select></div>
                        <div><Label className="text-xs mb-1.5 block">Density (kg/m³)</Label>
                          <Input type="number" value={sizing.liquidDensity || ""} onChange={e => setSizing(s => ({ ...s, liquidDensity: parseFloat(e.target.value) || 0 }))} data-testid="input-density" /></div>
                        <div><Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                          <Input type="number" value={sizing.viscosity || ""} onChange={e => setSizing(s => ({ ...s, viscosity: parseFloat(e.target.value) || 0 }))} data-testid="input-viscosity" /></div>
                        <div><Label className="text-xs mb-1.5 block">Vapor Pressure (kPa abs)</Label>
                          <Input type="number" value={sizing.vaporPressure || ""} onChange={e => setSizing(s => ({ ...s, vaporPressure: parseFloat(e.target.value) || 0 }))} data-testid="input-vapor-p" /></div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Relieving Temperature ({tU})</Label>
                      <Input type="number" value={sizing.relievingTemperature || ""} onChange={e => setSizing(s => ({ ...s, relievingTemperature: parseFloat(e.target.value) || 0 }))} data-testid="input-reliev-temp" /></div>
                    <div><Label className="text-xs mb-1.5 block">Back Pressure ({getUnit("pressureAbs", unitSystem)})</Label>
                      <Input type="number" value={sizing.backPressureAbs || ""} onChange={e => setSizing(s => ({ ...s, backPressureAbs: parseFloat(e.target.value) || 0 }))} data-testid="input-back-pressure" /></div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Correction Factors</p>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div><Label className="text-xs mb-1.5 block">Kd (discharge)</Label>
                        <Input type="number" value={sizing.kd || ""} onChange={e => setSizing(s => ({ ...s, kd: parseFloat(e.target.value) || 0 }))} data-testid="input-kd" /></div>
                      <div><Label className="text-xs mb-1.5 block">Kb (backpressure)</Label>
                        <Input type="number" value={sizing.kb || ""} onChange={e => setSizing(s => ({ ...s, kb: parseFloat(e.target.value) || 0 }))} data-testid="input-kb" /></div>
                      <div><Label className="text-xs mb-1.5 block">Kc (combination)</Label>
                        <Input type="number" value={sizing.kc || ""} onChange={e => setSizing(s => ({ ...s, kc: parseFloat(e.target.value) || 0 }))} data-testid="input-kc" /></div>
                      {sizing.fluidType === "steam" && (
                        <div><Label className="text-xs mb-1.5 block">Ksh (superheat)</Label>
                          <Input type="number" value={sizing.ksh || ""} onChange={e => setSizing(s => ({ ...s, ksh: parseFloat(e.target.value) || 0 }))} data-testid="input-ksh-corr" /></div>
                      )}
                    </div>
                  </div>

                  {device.type === "combination" && sizing.kc >= 1.0 && (
                    <WarningPanel warnings={["Combination device selected but Kc = 1.0. Typical Kc = 0.9 for rupture disk upstream of PSV — verify."]} />
                  )}

                  <Button className="w-full" onClick={handleSizing} data-testid="button-calculate">
                    <Calculator className="w-4 h-4 mr-2" /> Calculate Required Area
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {sizingResult ? (
                <>
                  <WarningPanel warnings={sizingResult.warnings} />
                  <ResultsPanel title="PRD Sizing Results" results={[
                    { label: "Required Orifice Area", value: sizingResult.requiredArea, unit: "mm²", highlight: true },
                    { label: "Flow Regime", value: sizingResult.flowRegime || "—", unit: "" },
                    { label: "Relieving Pressure", value: convertFromSI("pressure", sizingResult.relievingPressure - project.atmosphericPressure, unitSystem), unit: `${pU}g`, highlight: true },
                    { label: "Relieving Pressure (abs)", value: convertFromSI("pressureAbs", sizingResult.relievingPressure, unitSystem), unit: `${pU}a` },
                    ...(sizingResult.cCoefficient ? [{ label: "C Coefficient", value: sizingResult.cCoefficient, unit: "—" }] : []),
                    ...(sizingResult.kvFactor !== undefined ? [{ label: "Viscosity Factor Kv", value: sizingResult.kvFactor, unit: "—" }] : []),
                  ]} rawData={sizingResult} />
                </>
              ) : (
                <Card><CardContent className="py-12 text-center">
                  <Calculator className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Complete steps 1-5, then calculate the required relief area</p>
                </CardContent></Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 7: API 526 ORIFICE SELECTION */}
        <TabsContent value="orifice">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">API 526 Orifice Selection</h3></CardHeader>
            <CardContent className="pt-0">
              {!orificeSelection ? (
                <div className="text-center py-8">
                  <CircleDot className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Complete sizing calculation (Step 6) first</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card className="bg-primary/10 border-primary/30">
                    <CardContent className="p-4">
                      <div className="grid gap-4 sm:grid-cols-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Required Area</p>
                          <p className="text-lg font-mono font-bold" data-testid="text-req-area">{sizingResult?.requiredArea.toFixed(1)} mm²</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Selected Orifice</p>
                          <p className="text-lg font-mono font-bold text-primary" data-testid="text-sel-orifice">{orificeSelection.designation}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Orifice Area</p>
                          <p className="text-lg font-mono font-bold" data-testid="text-orifice-area">{orificeSelection.area} mm²</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Margin</p>
                          <p className={`text-lg font-mono font-bold ${orificeSelection.margin >= 0 ? "text-green-400" : "text-destructive"}`} data-testid="text-margin">
                            {orificeSelection.margin >= 0 ? "+" : ""}{orificeSelection.margin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {orificeSelection.inletFlange && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Card className="bg-muted/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Inlet Flange Size</p>
                          <p className="font-mono font-medium" data-testid="text-inlet-flange">{orificeSelection.inletFlange}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Outlet Flange Size</p>
                          <p className="font-mono font-medium" data-testid="text-outlet-flange">{orificeSelection.outletFlange}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-3">All Standard Orifices (API 526)</p>
                    <div className="grid gap-1">
                      {API_526_ORIFICES.map(o => {
                        const isSelected = o.designation === orificeSelection.designation;
                        const isSmall = sizingResult && o.area < sizingResult.requiredArea;
                        return (
                          <div key={o.designation} className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${isSelected ? "bg-primary/15 font-medium" : isSmall ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                            <span className="font-mono w-8">{o.designation}</span>
                            <span className="font-mono">{o.area.toLocaleString()} mm²</span>
                            <span>{o.inletFlange} x {o.outletFlange}</span>
                            {isSelected && <Badge className="text-[9px]">Selected</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 8: PIPING CHECKS */}
        <TabsContent value="piping">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Inlet Piping (API 520 Part II)</h3></CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Pipe ID ({dU})</Label>
                    <Input type="number" value={inletPiping.pipeDiameter || ""} onChange={e => setInletPiping(p => ({ ...p, pipeDiameter: parseFloat(e.target.value) || 0 }))} data-testid="input-inlet-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Pipe Length ({lU})</Label>
                    <Input type="number" value={inletPiping.pipeLength || ""} onChange={e => setInletPiping(p => ({ ...p, pipeLength: parseFloat(e.target.value) || 0 }))} data-testid="input-inlet-length" /></div>
                  <div><Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                    <Input type="number" value={inletPiping.roughness || ""} onChange={e => setInletPiping(p => ({ ...p, roughness: parseFloat(e.target.value) || 0 }))} data-testid="input-inlet-rough" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fittings K (total)</Label>
                    <Input type="number" value={inletPiping.fittingsK || ""} onChange={e => setInletPiping(p => ({ ...p, fittingsK: parseFloat(e.target.value) || 0 }))} data-testid="input-inlet-k" /></div>
                  <div><Label className="text-xs mb-1.5 block">Elevation Change ({lU})</Label>
                    <Input type="number" value={inletPiping.elevationChange || ""} onChange={e => setInletPiping(p => ({ ...p, elevationChange: parseFloat(e.target.value) || 0 }))} data-testid="input-inlet-elev" /></div>
                </div>
                <Card className="bg-accent/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      Inlet piping pressure drop must not exceed 3% of set pressure (API 520 Part II) to prevent valve chatter.
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Outlet Piping & Backpressure</h3></CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Pipe ID ({dU})</Label>
                    <Input type="number" value={outletPiping.pipeDiameter || ""} onChange={e => setOutletPiping(p => ({ ...p, pipeDiameter: parseFloat(e.target.value) || 0 }))} data-testid="input-outlet-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Pipe Length ({lU})</Label>
                    <Input type="number" value={outletPiping.pipeLength || ""} onChange={e => setOutletPiping(p => ({ ...p, pipeLength: parseFloat(e.target.value) || 0 }))} data-testid="input-outlet-length" /></div>
                  <div><Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                    <Input type="number" value={outletPiping.roughness || ""} onChange={e => setOutletPiping(p => ({ ...p, roughness: parseFloat(e.target.value) || 0 }))} data-testid="input-outlet-rough" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fittings K (total)</Label>
                    <Input type="number" value={outletPiping.fittingsK || ""} onChange={e => setOutletPiping(p => ({ ...p, fittingsK: parseFloat(e.target.value) || 0 }))} data-testid="input-outlet-k" /></div>
                  <div><Label className="text-xs mb-1.5 block">Elevation Change ({lU})</Label>
                    <Input type="number" value={outletPiping.elevationChange || ""} onChange={e => setOutletPiping(p => ({ ...p, elevationChange: parseFloat(e.target.value) || 0 }))} data-testid="input-outlet-elev" /></div>
                  <div><Label className="text-xs mb-1.5 block">Superimposed Backpressure ({pU})</Label>
                    <Input type="number" value={superimposedBP || ""} onChange={e => setSuperimposedBP(parseFloat(e.target.value) || 0)} data-testid="input-super-bp" /></div>
                </div>
                <Button className="w-full" onClick={handlePipingCheck} disabled={!sizingResult} data-testid="button-piping-check">
                  Run Piping Checks
                </Button>
              </CardContent>
            </Card>

            {inletResult && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    {inletResult.pass ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-destructive" />}
                    <h3 className="font-semibold text-sm">Inlet Pressure Drop</h3>
                    <Badge variant={inletResult.pass ? "secondary" : "destructive"} className="text-[10px]">{inletResult.pass ? "PASS" : "FAIL"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Pressure Drop</span><span className="font-mono">{inletResult.pressureDrop.toFixed(4)} bar</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">% of Set Pressure</span><span className={`font-mono font-medium ${inletResult.pass ? "" : "text-destructive"}`}>{inletResult.pressureDropPercent.toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Velocity</span><span className="font-mono">{inletResult.velocity.toFixed(1)} m/s</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reynolds Number</span><span className="font-mono">{inletResult.reynoldsNumber.toFixed(0)}</span></div>
                  </div>
                  {inletResult.warnings.length > 0 && <div className="mt-3"><WarningPanel warnings={inletResult.warnings} /></div>}
                </CardContent>
              </Card>
            )}

            {bpResult && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    {bpResult.pass ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-destructive" />}
                    <h3 className="font-semibold text-sm">Backpressure Assessment</h3>
                    <Badge variant={bpResult.pass ? "secondary" : "destructive"} className="text-[10px]">{bpResult.pass ? "PASS" : "FAIL"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Superimposed</span><span className="font-mono">{bpResult.superimposed.toFixed(3)} bar</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Built-up</span><span className="font-mono">{bpResult.builtUp.toFixed(3)} bar</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Backpressure</span><span className="font-mono font-medium">{bpResult.total.toFixed(3)} bar</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">% of Set Pressure</span><span className={`font-mono font-medium ${bpResult.pass ? "" : "text-destructive"}`}>{bpResult.totalPercent.toFixed(2)}%</span></div>
                  </div>
                  {bpResult.warnings.length > 0 && <div className="mt-3"><WarningPanel warnings={bpResult.warnings} /></div>}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB 9: RESULTS SUMMARY */}
        <TabsContent value="results">
          <div className="space-y-4">
            {!sizingResult ? (
              <Card><CardContent className="py-12 text-center">
                <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Complete sizing calculation (Step 6) to view results summary</p>
              </CardContent></Card>
            ) : (
              <>
                <Button className="w-full" onClick={handleBuildResults} data-testid="button-build-results">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Generate Final Results
                </Button>

                {finalResult && (
                  <div className="space-y-4">
                    {finalResult.flags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {finalResult.flags.map((flag, i) => (
                          <Badge key={i} variant="destructive" className="text-[10px]" data-testid={`badge-flag-${i}`}>{flag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">Governing Scenario</p>
                          <p className="text-sm font-medium" data-testid="text-final-gov">{finalResult.governingScenario}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">Selected Orifice</p>
                          <p className="text-lg font-mono font-bold text-primary" data-testid="text-final-orifice">{finalResult.selectedOrifice.designation}</p>
                          <p className="text-[10px] text-muted-foreground">{finalResult.selectedOrifice.area} mm²</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">Required Area</p>
                          <p className="text-sm font-mono font-bold" data-testid="text-final-area">{finalResult.requiredArea.toFixed(1)} mm²</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">Device Type</p>
                          <p className="text-sm font-medium" data-testid="text-final-device">{finalResult.recommendedDevice.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <ResultsPanel title="PRD Sizing Summary" results={[
                      { label: "Equipment Tag", value: equipment.tag || "—", unit: "" },
                      { label: "Governing Case", value: finalResult.governingScenario, unit: "" },
                      { label: "Relieving Rate", value: finalResult.relievingRate, unit: "kg/h", highlight: true },
                      { label: "Relieving Pressure (gauge)", value: convertFromSI("pressure", finalResult.relievingPressureGauge, unitSystem), unit: `${pU}g` },
                      { label: "Relieving Pressure (abs)", value: convertFromSI("pressureAbs", finalResult.relievingPressureAbs, unitSystem), unit: `${pU}a` },
                      { label: "Required Area", value: finalResult.requiredArea, unit: "mm²", highlight: true },
                      { label: "Selected Orifice", value: `${finalResult.selectedOrifice.designation} (${finalResult.selectedOrifice.area} mm²)`, unit: "" },
                      { label: "Orifice Margin", value: `${finalResult.selectedOrifice.margin >= 0 ? "+" : ""}${finalResult.selectedOrifice.margin.toFixed(1)}%`, unit: "" },
                      { label: "Device Type", value: finalResult.recommendedDevice.replace(/_/g, " "), unit: "" },
                      ...(finalResult.inletCheck ? [
                        { label: "Inlet ΔP", value: `${finalResult.inletCheck.pressureDropPercent.toFixed(2)}%`, unit: finalResult.inletCheck.pass ? "PASS" : "FAIL", highlight: !finalResult.inletCheck.pass },
                      ] : []),
                      ...(finalResult.backpressureCheck ? [
                        { label: "Total Backpressure", value: `${finalResult.backpressureCheck.totalPercent.toFixed(2)}%`, unit: finalResult.backpressureCheck.pass ? "PASS" : "FAIL", highlight: !finalResult.backpressureCheck.pass },
                      ] : []),
                    ]} rawData={finalResult} />

                    {finalResult.actionItems.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-primary" />
                            <h4 className="text-sm font-semibold">Action Items</h4>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <ul className="space-y-2">
                            {finalResult.actionItems.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="text-primary shrink-0 mt-px">{i + 1}.</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    <WarningPanel warnings={finalResult.warnings} />
                  </div>
                )}
              </>
            )}

            <AssumptionsPanel
              assumptions={[
                "Gas/vapor sizing per API 520 Part I, Section 5.6 (critical and subcritical flow)",
                "Steam sizing per API 520 Part I with Ksh superheat correction and Kn Napier correction",
                "Liquid sizing per API 520 Part I, Section 5.8 with viscosity correction Kv",
                "Kd = 0.975 for gas/steam (ASME certified), 0.65 for liquid (default values)",
                "Inlet piping loss limit: 3% of set pressure per API 520 Part II",
                "Orifice selection per API 526 standard designations (D through T) with flange sizes",
                "Fire case heat input per API 521 (simplified wetted area method)",
                "Scenario screening per API 521 — user must verify relief rates with process simulation",
              ]}
              references={[
                "API 520 Part I, 10th Edition: Sizing, Selection, and Installation of Pressure-Relieving Devices",
                "API 520 Part II, 6th Edition: Installation",
                "API 521, 7th Edition: Pressure-Relieving and Depressuring Systems",
                "API 526, 7th Edition: Flanged Steel Pressure-Relief Valves",
                "ASME BPVC Section VIII, Division 1: Pressure Vessels",
              ]}
            />

            <FeedbackSection calculatorName="PRD / Flare Relief Calculator" />
          </div>
        </TabsContent>
      </Tabs>

      {/* NAVIGATION BUTTONS */}
      <div className="flex items-center justify-between mt-6 gap-3">
        <Button variant="outline" onClick={goPrev} disabled={currentTabIdx <= 0} data-testid="button-prev-tab">
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <div className="text-xs text-muted-foreground">
          Step {currentTabIdx + 1} of {TABS.length}
        </div>
        <Button variant="outline" onClick={goNext} disabled={currentTabIdx >= TABS.length - 1} data-testid="button-next-tab">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
