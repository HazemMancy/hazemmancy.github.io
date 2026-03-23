import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { COMMON_LIQUIDS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { EosGasPropsPanel } from "@/components/EosGasPropsPanel";
import {
  type GasPropsMode, type ManualGasProps, resolveGasProps,
} from "@/lib/engineering/eosGasProps";
import { useGasProps } from "@/lib/engineering/GasPropsContext";
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
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { exportToExcel, exportToJSON } from "@/lib/engineering/exportUtils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield, FlaskConical, RotateCcw, AlertTriangle,
  ChevronLeft, ChevronRight, ClipboardList, Settings2,
  Flame, Target, Wrench, Calculator, CircleDot,
  PipetteIcon, CheckCircle2, Plus, Trash2, Info,
  Download, FileSpreadsheet, FileText,
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
  const { gasPropsMode: psvGasPropsMode, setGasPropsMode: setPsvGasPropsMode, gasComposition: psvGasComposition, setGasComposition: setPsvGasComposition } = useGasProps();
  const [psvEosMW, setPsvEosMW] = useState<number | null>(null);
  const [psvEosZ, setPsvEosZ] = useState<number | null>(null);

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

      let mw = sizing.molecularWeight;
      let z  = sizing.compressibilityFactor;
      let k  = sizing.specificHeatRatio;

      if (sizing.fluidType === "gas" && psvGasPropsMode !== "manual") {
        const T_K = convertToSI("temperature", sizing.relievingTemperature, unitSystem);
        const T_C = T_K - 273.15;
        const manual: ManualGasProps = { molecularWeight: mw, specificHeatRatio: k, compressibilityFactor: z, viscosity: 0.015 };
        const resolved = resolveGasProps(psvGasPropsMode, manual, psvGasComposition, T_C, rp.abs);
        if (resolved.warnings.length > 0) setError(`EoS: ${resolved.warnings.join("; ")}`);
        mw = resolved.MW; z = resolved.Z; k = resolved.k;
        setPsvEosMW(mw); setPsvEosZ(z);
      } else {
        setPsvEosMW(null); setPsvEosZ(null);
      }

      const input: PRDSizingInput = {
        ...sizing,
        molecularWeight: mw,
        compressibilityFactor: z,
        specificHeatRatio: k,
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
        : ((psvEosMW ?? sizing.molecularWeight) * P_Pa) / (8314.46 * T_K * (psvEosZ ?? sizing.compressibilityFactor));
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
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">PRD / Flare Relief Calculator</h1>
            <p className="text-xs md:text-sm text-muted-foreground">API 521 / 520 / 526 — Pressure Relief Device Sizing</p>
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

      <Card className="mb-4 md:mb-6 border-amber-500/30 bg-amber-500/5" data-testid="banner-screening-disclaimer">
        <CardContent className="p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-500 mb-1">Screening Tool Only</p>
            <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
              This calculator is an engineering screening tool for preliminary relief device sizing per API 520/521/526.
              It is not intended for final relief system design. Final sizing shall be validated with rigorous process simulation,
              vendor-certified capacity data, and independent review per applicable codes and project specifications.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 mb-4 md:mb-6">
          <TabsList className="inline-flex w-max min-w-full md:w-full md:min-w-0 h-auto p-1" data-testid="tabs-prd">
            {TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs px-2 md:px-3 py-1.5 whitespace-nowrap" data-testid={`tab-${tab.id}`}>
                <tab.icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.step}</span>
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
                  <NumericInput value={project.atmosphericPressure} onValueChange={v => setProject(p => ({ ...p, atmosphericPressure: v }))} data-testid="input-atm-pressure" />
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
                  <NumericInput value={equipment.mawp} onValueChange={v => setEquipment(eq => ({ ...eq, mawp: v }))} data-testid="input-equip-mawp" /></div>
                <div><Label className="text-xs mb-1.5 block">Design Temperature ({tU})</Label>
                  <NumericInput value={equipment.designTemp} onValueChange={v => setEquipment(eq => ({ ...eq, designTemp: v }))} data-testid="input-equip-design-temp" /></div>
                <div><Label className="text-xs mb-1.5 block">Normal Operating Pressure ({pU}g)</Label>
                  <NumericInput value={equipment.normalOpPressure} onValueChange={v => setEquipment(eq => ({ ...eq, normalOpPressure: v }))} data-testid="input-equip-op-pressure" /></div>
                <div><Label className="text-xs mb-1.5 block">Normal Operating Temperature ({tU})</Label>
                  <NumericInput value={equipment.normalOpTemp} onValueChange={v => setEquipment(eq => ({ ...eq, normalOpTemp: v }))} data-testid="input-equip-op-temp" /></div>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Set Pressure & Overpressure</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><Label className="text-xs mb-1.5 block">Set Pressure ({pU}g)</Label>
                    <NumericInput value={equipment.setPressure} onValueChange={v => setEquipment(eq => ({ ...eq, setPressure: v }))} data-testid="input-equip-set-p" /></div>
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
                    <NumericInput value={equipment.overpressurePercent} onValueChange={v => setEquipment(eq => ({ ...eq, overpressurePercent: v }))} data-testid="input-equip-op-pct" /></div>
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
                          <NumericInput value={scenario.relievingRate} onValueChange={v => updateScenario(idx, { relievingRate: v })} data-testid={`input-scenario-rate-${idx}`} /></div>
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
                      <EosGasPropsPanel
                        mode={psvGasPropsMode}
                        onModeChange={setPsvGasPropsMode}
                        composition={psvGasComposition}
                        onCompositionChange={setPsvGasComposition}
                        manual={{
                          molecularWeight: sizing.molecularWeight,
                          specificHeatRatio: sizing.specificHeatRatio,
                          compressibilityFactor: sizing.compressibilityFactor,
                          viscosity: 0.015,
                        }}
                        onManualChange={(field, value) => {
                          if (field === "molecularWeight") setSizing(s => ({ ...s, molecularWeight: value }));
                          else if (field === "specificHeatRatio") setSizing(s => ({ ...s, specificHeatRatio: value }));
                          else if (field === "compressibilityFactor") setSizing(s => ({ ...s, compressibilityFactor: value }));
                        }}
                        showViscosity={false}
                        testIdPrefix="psv"
                      />
                    </div>
                  )}

                  {sizing.fluidType === "steam" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label className="text-xs mb-1.5 block">Superheat Correction Ksh</Label>
                        <NumericInput value={sizing.ksh} onValueChange={v => setSizing(s => ({ ...s, ksh: v }))} data-testid="input-ksh" /></div>
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
                          <NumericInput value={sizing.liquidDensity} onValueChange={v => setSizing(s => ({ ...s, liquidDensity: v }))} data-testid="input-density" /></div>
                        <div><Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                          <NumericInput value={sizing.viscosity} onValueChange={v => setSizing(s => ({ ...s, viscosity: v }))} data-testid="input-viscosity" /></div>
                        <div><Label className="text-xs mb-1.5 block">Vapor Pressure (kPa abs)</Label>
                          <NumericInput value={sizing.vaporPressure} onValueChange={v => setSizing(s => ({ ...s, vaporPressure: v }))} data-testid="input-vapor-p" /></div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Relieving Temperature ({tU})</Label>
                      <NumericInput value={sizing.relievingTemperature} onValueChange={v => setSizing(s => ({ ...s, relievingTemperature: v }))} data-testid="input-reliev-temp" /></div>
                    <div><Label className="text-xs mb-1.5 block">Back Pressure ({getUnit("pressureAbs", unitSystem)})</Label>
                      <NumericInput value={sizing.backPressureAbs} onValueChange={v => setSizing(s => ({ ...s, backPressureAbs: v }))} data-testid="input-back-pressure" /></div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Correction Factors</p>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div><Label className="text-xs mb-1.5 block">Kd (discharge)</Label>
                        <NumericInput value={sizing.kd} onValueChange={v => setSizing(s => ({ ...s, kd: v }))} data-testid="input-kd" /></div>
                      <div><Label className="text-xs mb-1.5 block">Kb (backpressure)</Label>
                        <NumericInput value={sizing.kb} onValueChange={v => setSizing(s => ({ ...s, kb: v }))} data-testid="input-kb" /></div>
                      <div><Label className="text-xs mb-1.5 block">Kc (combination)</Label>
                        <NumericInput value={sizing.kc} onValueChange={v => setSizing(s => ({ ...s, kc: v }))} data-testid="input-kc" /></div>
                      {sizing.fluidType === "steam" && (
                        <div><Label className="text-xs mb-1.5 block">Ksh (superheat)</Label>
                          <NumericInput value={sizing.ksh} onValueChange={v => setSizing(s => ({ ...s, ksh: v }))} data-testid="input-ksh-corr" /></div>
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
                  ]} rawData={sizingResult} exportData={{
                    calculatorName: "PRD Sizing Results",
                    projectInfo: [
                      { label: "Project", value: project.name || "—" },
                      { label: "Client", value: project.client || "—" },
                      { label: "Location", value: project.location || "—" },
                      { label: "Case ID", value: project.caseId || "—" },
                      { label: "Engineer", value: project.engineer || "—" },
                      { label: "Date", value: project.date },
                    ],
                    inputs: [
                      { label: "Equipment Tag", value: equipment.tag || "—" },
                      { label: "Service", value: equipment.service || "—" },
                      { label: "MAWP", value: equipment.mawp, unit: `${pU}g` },
                      { label: "Design Temperature", value: equipment.designTemp, unit: tU },
                      { label: "Set Pressure", value: equipment.setPressure, unit: `${pU}g` },
                      { label: "Overpressure Basis", value: equipment.overpressureBasis },
                      { label: "Overpressure", value: equipment.overpressurePercent, unit: "%" },
                      { label: "Atmospheric Pressure", value: project.atmosphericPressure, unit: "bar abs" },
                      { label: "Fluid Type", value: sizing.fluidType },
                      { label: "Molecular Weight", value: sizing.molecularWeight, unit: "g/mol" },
                      { label: "Specific Heat Ratio (k)", value: sizing.specificHeatRatio },
                      { label: "Compressibility Factor (Z)", value: sizing.compressibilityFactor },
                      { label: "Relieving Temperature", value: sizing.relievingTemperature, unit: tU },
                      { label: "Kd", value: sizing.kd },
                      { label: "Kb", value: sizing.kb },
                      { label: "Kc", value: sizing.kc },
                      { label: "Device Type", value: device.type },
                      ...(governingIndex >= 0 && scenarios[governingIndex] ? [
                        { label: "Governing Scenario", value: scenarios[governingIndex].type },
                        { label: "Governing Relief Rate", value: scenarios[governingIndex].relievingRate, unit: "kg/h" },
                      ] : []),
                    ],
                    results: [
                      { label: "Required Orifice Area", value: sizingResult.requiredArea, unit: "mm²", highlight: true },
                      { label: "Flow Regime", value: sizingResult.flowRegime || "—", unit: "" },
                      { label: "Relieving Pressure (gauge)", value: convertFromSI("pressure", sizingResult.relievingPressure - project.atmosphericPressure, unitSystem), unit: `${pU}g`, highlight: true },
                      { label: "Relieving Pressure (abs)", value: convertFromSI("pressureAbs", sizingResult.relievingPressure, unitSystem), unit: `${pU}a` },
                      ...(sizingResult.cCoefficient ? [{ label: "C Coefficient", value: sizingResult.cCoefficient, unit: "—" }] : []),
                      ...(sizingResult.kvFactor !== undefined ? [{ label: "Viscosity Factor Kv", value: sizingResult.kvFactor, unit: "—" }] : []),
                    ],
                    methodology: [
                      "Gas/vapor sizing per API 520 Part I, Section 5.6 (critical and subcritical flow)",
                      "Steam sizing per API 520 Part I with Ksh superheat correction and Kn Napier correction",
                      "Liquid sizing per API 520 Part I, Section 5.8 with viscosity correction Kv",
                    ],
                    assumptions: [
                      "Kd = 0.975 for gas/steam (ASME certified), 0.65 for liquid (default values)",
                      "Scenario screening per API 521 — user must verify relief rates with process simulation",
                    ],
                    references: [
                      "API 520 Part I, 10th Edition: Sizing, Selection, and Installation of Pressure-Relieving Devices",
                      "API 521, 7th Edition: Pressure-Relieving and Depressuring Systems",
                    ],
                    warnings: sizingResult.warnings,
                  } as ExportDatasheet} />
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
                    <NumericInput value={inletPiping.pipeDiameter} onValueChange={v => setInletPiping(p => ({ ...p, pipeDiameter: v }))} data-testid="input-inlet-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Pipe Length ({lU})</Label>
                    <NumericInput value={inletPiping.pipeLength} onValueChange={v => setInletPiping(p => ({ ...p, pipeLength: v }))} data-testid="input-inlet-length" /></div>
                  <div><Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                    <NumericInput value={inletPiping.roughness} onValueChange={v => setInletPiping(p => ({ ...p, roughness: v }))} data-testid="input-inlet-rough" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fittings K (total)</Label>
                    <NumericInput value={inletPiping.fittingsK} onValueChange={v => setInletPiping(p => ({ ...p, fittingsK: v }))} data-testid="input-inlet-k" /></div>
                  <div><Label className="text-xs mb-1.5 block">Elevation Change ({lU})</Label>
                    <NumericInput value={inletPiping.elevationChange} onValueChange={v => setInletPiping(p => ({ ...p, elevationChange: v }))} data-testid="input-inlet-elev" /></div>
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
                    <NumericInput value={outletPiping.pipeDiameter} onValueChange={v => setOutletPiping(p => ({ ...p, pipeDiameter: v }))} data-testid="input-outlet-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Pipe Length ({lU})</Label>
                    <NumericInput value={outletPiping.pipeLength} onValueChange={v => setOutletPiping(p => ({ ...p, pipeLength: v }))} data-testid="input-outlet-length" /></div>
                  <div><Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                    <NumericInput value={outletPiping.roughness} onValueChange={v => setOutletPiping(p => ({ ...p, roughness: v }))} data-testid="input-outlet-rough" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fittings K (total)</Label>
                    <NumericInput value={outletPiping.fittingsK} onValueChange={v => setOutletPiping(p => ({ ...p, fittingsK: v }))} data-testid="input-outlet-k" /></div>
                  <div><Label className="text-xs mb-1.5 block">Elevation Change ({lU})</Label>
                    <NumericInput value={outletPiping.elevationChange} onValueChange={v => setOutletPiping(p => ({ ...p, elevationChange: v }))} data-testid="input-outlet-elev" /></div>
                  <div><Label className="text-xs mb-1.5 block">Superimposed Backpressure ({pU})</Label>
                    <NumericInput value={superimposedBP} onValueChange={v => setSuperimposedBP(v)} data-testid="input-super-bp" /></div>
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

                    <ResultsPanel showExport={true} title="PRD Sizing Summary" results={[
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
                    ]} rawData={finalResult} exportData={{
                      calculatorName: "PRD / Flare Relief Calculator",
                      projectInfo: [
                        { label: "Project", value: project.name || "—" },
                        { label: "Client", value: project.client || "—" },
                        { label: "Location", value: project.location || "—" },
                        { label: "Case ID", value: project.caseId || "—" },
                        { label: "Engineer", value: project.engineer || "—" },
                        { label: "Date", value: project.date },
                      ],
                      inputs: [
                        { label: "Equipment Tag", value: equipment.tag || "—" },
                        { label: "Service", value: equipment.service || "—" },
                        { label: "MAWP", value: equipment.mawp, unit: `${pU}g` },
                        { label: "Design Temperature", value: equipment.designTemp, unit: tU },
                        { label: "Set Pressure", value: equipment.setPressure, unit: `${pU}g` },
                        { label: "Overpressure Basis", value: equipment.overpressureBasis },
                        { label: "Overpressure", value: equipment.overpressurePercent, unit: "%" },
                        { label: "Atmospheric Pressure", value: project.atmosphericPressure, unit: "bar abs" },
                        { label: "Fluid Type", value: sizing.fluidType },
                        { label: "Molecular Weight", value: sizing.molecularWeight, unit: "g/mol" },
                        { label: "Specific Heat Ratio (k)", value: sizing.specificHeatRatio },
                        { label: "Compressibility Factor (Z)", value: sizing.compressibilityFactor },
                        { label: "Relieving Temperature", value: sizing.relievingTemperature, unit: tU },
                        { label: "Kd", value: sizing.kd },
                        { label: "Kb", value: sizing.kb },
                        { label: "Kc", value: sizing.kc },
                        { label: "Device Type", value: device.type },
                        ...(governingIndex >= 0 && scenarios[governingIndex] ? [
                          { label: "Governing Scenario", value: scenarios[governingIndex].type },
                          { label: "Governing Relief Rate", value: scenarios[governingIndex].relievingRate, unit: "kg/h" },
                        ] : []),
                      ],
                      results: [
                        { label: "Governing Scenario", value: finalResult.governingScenario, unit: "" },
                        { label: "Relieving Rate", value: finalResult.relievingRate, unit: "kg/h", highlight: true },
                        { label: "Relieving Pressure (gauge)", value: convertFromSI("pressure", finalResult.relievingPressureGauge, unitSystem), unit: `${pU}g` },
                        { label: "Relieving Pressure (abs)", value: convertFromSI("pressureAbs", finalResult.relievingPressureAbs, unitSystem), unit: `${pU}a` },
                        { label: "Required Area", value: finalResult.requiredArea, unit: "mm²", highlight: true },
                        { label: "Selected Orifice", value: `${finalResult.selectedOrifice.designation} (${finalResult.selectedOrifice.area} mm²)`, unit: "" },
                        { label: "Orifice Margin", value: `${finalResult.selectedOrifice.margin >= 0 ? "+" : ""}${finalResult.selectedOrifice.margin.toFixed(1)}%`, unit: "" },
                        { label: "Device Type", value: finalResult.recommendedDevice.replace(/_/g, " "), unit: "" },
                        ...(finalResult.inletCheck ? [
                          { label: "Inlet Pressure Drop", value: `${finalResult.inletCheck.pressureDropPercent.toFixed(2)}%`, unit: finalResult.inletCheck.pass ? "PASS" : "FAIL" },
                        ] : []),
                        ...(finalResult.backpressureCheck ? [
                          { label: "Total Backpressure", value: `${finalResult.backpressureCheck.totalPercent.toFixed(2)}%`, unit: finalResult.backpressureCheck.pass ? "PASS" : "FAIL" },
                        ] : []),
                      ],
                      additionalSections: [
                        ...(scenarios.length > 0 ? [{
                          title: "Overpressure Scenarios",
                          items: scenarios.map((s, i) => ({
                            label: `${s.type}${governingIndex === i ? " (Governing)" : ""}`,
                            value: s.relievingRate,
                            unit: "kg/h",
                          })),
                        }] : []),
                        ...(finalResult.inletCheck ? [{
                          title: "Inlet Piping Check",
                          items: [
                            { label: "Pressure Drop", value: finalResult.inletCheck.pressureDrop, unit: "bar" },
                            { label: "% of Set Pressure", value: finalResult.inletCheck.pressureDropPercent, unit: "%" },
                            { label: "Velocity", value: finalResult.inletCheck.velocity, unit: "m/s" },
                            { label: "Reynolds Number", value: finalResult.inletCheck.reynoldsNumber, unit: "" },
                            { label: "Status", value: finalResult.inletCheck.pass ? "PASS" : "FAIL" },
                          ],
                        }] : []),
                        ...(finalResult.backpressureCheck ? [{
                          title: "Backpressure Assessment",
                          items: [
                            { label: "Superimposed", value: finalResult.backpressureCheck.superimposed, unit: "bar" },
                            { label: "Built-up", value: finalResult.backpressureCheck.builtUp, unit: "bar" },
                            { label: "Total Backpressure", value: finalResult.backpressureCheck.total, unit: "bar" },
                            { label: "% of Set Pressure", value: finalResult.backpressureCheck.totalPercent, unit: "%" },
                            { label: "Status", value: finalResult.backpressureCheck.pass ? "PASS" : "FAIL" },
                          ],
                        }] : []),
                      ],
                      methodology: [
                        "Gas/vapor sizing per API 520 Part I, Section 5.6 (critical and subcritical flow)",
                        "Steam sizing per API 520 Part I with Ksh superheat correction and Kn Napier correction",
                        "Liquid sizing per API 520 Part I, Section 5.8 with viscosity correction Kv",
                        "Orifice selection per API 526 standard designations (D through T)",
                        "Inlet piping pressure drop check per API 520 Part II (3% rule)",
                        "Backpressure assessment per API 521 guidelines",
                      ],
                      assumptions: [
                        "Gas/vapor sizing per API 520 Part I, Section 5.6 (critical and subcritical flow)",
                        "Steam sizing per API 520 Part I with Ksh superheat correction and Kn Napier correction",
                        "Liquid sizing per API 520 Part I, Section 5.8 with viscosity correction Kv",
                        "Kd = 0.975 for gas/steam (ASME certified), 0.65 for liquid (default values)",
                        "Inlet piping loss limit: 3% of set pressure per API 520 Part II",
                        "Orifice selection per API 526 standard designations (D through T) with flange sizes",
                        "Fire case heat input per API 521 (simplified wetted area method)",
                        "Scenario screening per API 521 — user must verify relief rates with process simulation",
                      ],
                      references: [
                        "API 520 Part I, 10th Edition: Sizing, Selection, and Installation of Pressure-Relieving Devices",
                        "API 520 Part II, 6th Edition: Installation",
                        "API 521, 7th Edition: Pressure-Relieving and Depressuring Systems",
                        "API 526, 7th Edition: Flanged Steel Pressure-Relief Valves",
                        "ASME BPVC Section VIII, Division 1: Pressure Vessels",
                      ],
                      warnings: [
                        ...finalResult.flags,
                        ...finalResult.warnings,
                      ],
                    } as ExportDatasheet} />

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
