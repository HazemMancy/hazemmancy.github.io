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
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import {
  type ThermalProject, type ThermalEquipment, type ThermalHeatSource, type ThermalFluid,
  type ThermalTemperatures, type ThermalDeviceSizing, type ThermalPipingInput,
  type ThermalHeatResult, type ThermalExpansionResult, type ThermalReliefRateResult,
  type ThermalSizingResult, type TRVSelection, type ThermalPipingResult, type ThermalFinalResult,
  type HeatSource,
  COMMON_FLUIDS, API_526_ORIFICES,
  calculateHeatInput, calculateExpansion, calculateReliefRate,
  calculateRelievingPressure, calculateTRVSizing, selectTRV,
  calculateThermalPiping, buildThermalFinalResult,
  THERMAL_RELIEF_TEST_CASE,
} from "@/lib/engineering/thermalRelief";
import {
  Flame, FlaskConical, RotateCcw, AlertTriangle,
  ChevronLeft, ChevronRight, ClipboardList, Settings2,
  Sun, Droplets, Thermometer, Calculator, Wrench,
  PipetteIcon, CheckCircle2,
} from "lucide-react";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "equipment", label: "Equipment", icon: Settings2, step: 2 },
  { id: "heatsource", label: "Heat Source", icon: Sun, step: 3 },
  { id: "fluid", label: "Fluid", icon: Droplets, step: 4 },
  { id: "temperature", label: "Temperature", icon: Thermometer, step: 5 },
  { id: "reliefrate", label: "Relief Rate", icon: Calculator, step: 6 },
  { id: "sizing", label: "Sizing", icon: Wrench, step: 7 },
  { id: "piping", label: "Piping", icon: PipetteIcon, step: 8 },
  { id: "results", label: "Results", icon: CheckCircle2, step: 9 },
];

const defaultProject: ThermalProject = {
  name: "", client: "", location: "", caseId: "",
  engineer: "", date: new Date().toISOString().split("T")[0],
  atmosphericPressure: 1.01325,
};

const defaultEquipment: ThermalEquipment = {
  tag: "", service: "", trappedVolume: 0,
  mawp: 0, setPressure: 0, overpressurePercent: 10,
  normalOpPressure: 0, normalOpTemp: 0,
};

const defaultHeatSource: ThermalHeatSource = {
  type: "solar_bare", exposedArea: 0, heatInputKW: 0, heatingDuration: 4,
};

const defaultFluid: ThermalFluid = {
  name: "", density: 998.2, specificHeat: 4.18, thermalExpansion: 2.07,
};

const defaultTemps: ThermalTemperatures = { initial: 0, final: 0 };

const defaultDeviceSizing: ThermalDeviceSizing = { kd: 0.65, backPressure: 0 };

const defaultPiping: ThermalPipingInput = {
  pipeDiameter: 25, pipeLength: 1, roughness: 0.046, fittingsK: 1.5,
};

export default function ThermalReliefPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [activeTab, setActiveTab] = useState("project");
  const [project, setProject] = useState<ThermalProject>({ ...defaultProject });
  const [equipment, setEquipment] = useState<ThermalEquipment>({ ...defaultEquipment });
  const [heatSource, setHeatSource] = useState<ThermalHeatSource>({ ...defaultHeatSource });
  const [fluid, setFluid] = useState<ThermalFluid>({ ...defaultFluid });
  const [temperatures, setTemperatures] = useState<ThermalTemperatures>({ ...defaultTemps });
  const [deviceSizing, setDeviceSizing] = useState<ThermalDeviceSizing>({ ...defaultDeviceSizing });
  const [inletPiping, setInletPiping] = useState<ThermalPipingInput>({ ...defaultPiping });
  const [outletPiping, setOutletPiping] = useState<ThermalPipingInput>({ ...defaultPiping, pipeDiameter: 25, pipeLength: 3, fittingsK: 3.0 });

  const [heatResult, setHeatResult] = useState<ThermalHeatResult | null>(null);
  const [expansionResult, setExpansionResult] = useState<ThermalExpansionResult | null>(null);
  const [reliefRateResult, setReliefRateResult] = useState<ThermalReliefRateResult | null>(null);
  const [sizingResult, setSizingResult] = useState<ThermalSizingResult | null>(null);
  const [trvSelection, setTrvSelection] = useState<TRVSelection | null>(null);
  const [inletPipingResult, setInletPipingResult] = useState<ThermalPipingResult | null>(null);
  const [outletPipingResult, setOutletPipingResult] = useState<ThermalPipingResult | null>(null);
  const [finalResult, setFinalResult] = useState<ThermalFinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pU = getUnit("pressure", unitSystem);
  const tU = getUnit("temperature", unitSystem);

  const relievingP = useMemo(() =>
    calculateRelievingPressure(
      convertToSI("pressure", equipment.setPressure, unitSystem),
      equipment.overpressurePercent,
      project.atmosphericPressure
    ),
    [equipment.setPressure, equipment.overpressurePercent, project.atmosphericPressure, unitSystem]
  );

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
      normalOpTemp: conv("temperature", e.normalOpTemp),
    }));
    setTemperatures(t => ({
      initial: conv("temperature", t.initial),
      final: conv("temperature", t.final),
    }));
    setDeviceSizing(d => ({
      ...d,
      backPressure: conv("pressure", d.backPressure),
    }));
    setInletPiping(p => ({
      ...p,
      pipeDiameter: conv("diameter", p.pipeDiameter),
      pipeLength: conv("length", p.pipeLength),
    }));
    setOutletPiping(p => ({
      ...p,
      pipeDiameter: conv("diameter", p.pipeDiameter),
      pipeLength: conv("length", p.pipeLength),
    }));
    setUnitSystem(ns);
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null);
    setHeatResult(null); setExpansionResult(null); setReliefRateResult(null);
    setSizingResult(null); setTrvSelection(null); setFinalResult(null);
    setInletPipingResult(null); setOutletPipingResult(null);
    const tc = THERMAL_RELIEF_TEST_CASE;
    setProject({ ...tc.project });
    setEquipment({ ...tc.equipment });
    setHeatSource({ ...tc.heatSource });
    setFluid({ ...tc.fluid });
    setTemperatures({ ...tc.temperatures });
    setDeviceSizing({ ...tc.deviceSizing });
    setActiveTab("project");
  };

  const handleReset = () => {
    setUnitSystem("SI"); setError(null);
    setProject({ ...defaultProject }); setEquipment({ ...defaultEquipment });
    setHeatSource({ ...defaultHeatSource }); setFluid({ ...defaultFluid });
    setTemperatures({ ...defaultTemps }); setDeviceSizing({ ...defaultDeviceSizing });
    setInletPiping({ ...defaultPiping }); setOutletPiping({ ...defaultPiping, pipeDiameter: 25, pipeLength: 3, fittingsK: 3.0 });
    setHeatResult(null); setExpansionResult(null); setReliefRateResult(null);
    setSizingResult(null); setTrvSelection(null); setFinalResult(null);
    setInletPipingResult(null); setOutletPipingResult(null);
    setActiveTab("project");
  };

  const handleCalcReliefRate = () => {
    try {
      setError(null);
      const hr = calculateHeatInput(heatSource);
      setHeatResult(hr);
      const tempsInSI: ThermalTemperatures = {
        initial: convertToSI("temperature", temperatures.initial, unitSystem),
        final: convertToSI("temperature", temperatures.final, unitSystem),
      };
      const exp = calculateExpansion(fluid, equipment.trappedVolume, tempsInSI);
      setExpansionResult(exp);
      const rr = calculateReliefRate(exp, hr, fluid, heatSource.heatingDuration, equipment.trappedVolume);
      setReliefRateResult(rr);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setReliefRateResult(null); setExpansionResult(null); setHeatResult(null);
    }
  };

  const handleCalcSizing = () => {
    if (!reliefRateResult) {
      handleCalcReliefRate();
      return;
    }
    try {
      setError(null);
      const sp = convertToSI("pressure", equipment.setPressure, unitSystem);
      const bp = convertToSI("pressure", deviceSizing.backPressure, unitSystem);
      const sr = calculateTRVSizing(reliefRateResult, sp, equipment.overpressurePercent, bp, project.atmosphericPressure, fluid, deviceSizing.kd);
      setSizingResult(sr);
      const trv = selectTRV(sr.requiredOrificeArea_mm2);
      setTrvSelection(trv);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sizing calculation error");
      setSizingResult(null); setTrvSelection(null);
    }
  };

  const handlePipingCheck = () => {
    if (!reliefRateResult) return;
    try {
      const sp = convertToSI("pressure", equipment.setPressure, unitSystem);
      const inP: ThermalPipingInput = {
        pipeDiameter: convertToSI("diameter", inletPiping.pipeDiameter, unitSystem),
        pipeLength: convertToSI("length", inletPiping.pipeLength, unitSystem),
        roughness: inletPiping.roughness, fittingsK: inletPiping.fittingsK,
      };
      setInletPipingResult(calculateThermalPiping(inP, reliefRateResult.reliefRate_m3h, fluid.density, 1.0, sp));
      const outP: ThermalPipingInput = {
        pipeDiameter: convertToSI("diameter", outletPiping.pipeDiameter, unitSystem),
        pipeLength: convertToSI("length", outletPiping.pipeLength, unitSystem),
        roughness: outletPiping.roughness, fittingsK: outletPiping.fittingsK,
      };
      setOutletPipingResult(calculateThermalPiping(outP, reliefRateResult.reliefRate_m3h, fluid.density, 1.0, sp));
    } catch {
      setInletPipingResult(null); setOutletPipingResult(null);
    }
  };

  const handleBuildResults = () => {
    try {
      setError(null);
      const tempsInSI: ThermalTemperatures = {
        initial: convertToSI("temperature", temperatures.initial, unitSystem),
        final: convertToSI("temperature", temperatures.final, unitSystem),
      };
      const equipInSI: ThermalEquipment = {
        ...equipment,
        mawp: convertToSI("pressure", equipment.mawp, unitSystem),
        setPressure: convertToSI("pressure", equipment.setPressure, unitSystem),
        normalOpPressure: convertToSI("pressure", equipment.normalOpPressure, unitSystem),
        normalOpTemp: convertToSI("temperature", equipment.normalOpTemp, unitSystem),
      };
      const devInSI: ThermalDeviceSizing = {
        ...deviceSizing,
        backPressure: convertToSI("pressure", deviceSizing.backPressure, unitSystem),
      };
      const inP: ThermalPipingInput | null = inletPiping.pipeDiameter > 0 ? {
        pipeDiameter: convertToSI("diameter", inletPiping.pipeDiameter, unitSystem),
        pipeLength: convertToSI("length", inletPiping.pipeLength, unitSystem),
        roughness: inletPiping.roughness, fittingsK: inletPiping.fittingsK,
      } : null;
      const outP: ThermalPipingInput | null = outletPiping.pipeDiameter > 0 ? {
        pipeDiameter: convertToSI("diameter", outletPiping.pipeDiameter, unitSystem),
        pipeLength: convertToSI("length", outletPiping.pipeLength, unitSystem),
        roughness: outletPiping.roughness, fittingsK: outletPiping.fittingsK,
      } : null;
      const fr = buildThermalFinalResult(project, equipInSI, heatSource, fluid, tempsInSI, devInSI, inP, outP);
      setFinalResult(fr);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating results");
    }
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
      <Card className="mb-4 md:mb-6 bg-amber-950/30 border-amber-800/50">
        <CardContent className="flex items-center gap-3 p-3 md:p-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs md:text-sm font-semibold text-amber-200" data-testid="text-screening-label">PRELIMINARY ENGINEERING TOOL</p>
            <p className="text-[10px] md:text-xs text-amber-200/70">Results must be verified against detailed thermal analysis per API 521 and ASME B31.3.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">Thermal Expansion Relief</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Blocked-in liquid overpressure screening — 9-step wizard</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-thermal">
        <div className="overflow-x-auto -mx-4 px-4 mb-4 md:mb-6">
          <TabsList className="inline-flex w-max min-w-full md:w-full md:min-w-0 h-auto p-1">
            {TABS.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs px-2 md:px-3 py-1.5 whitespace-nowrap" data-testid={`tab-${t.id}`}>
                <t.icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.step}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="project">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Project Information</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Project Name</Label>
                  <Input value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} data-testid="input-project-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Client</Label>
                  <Input value={project.client} onChange={e => setProject(p => ({ ...p, client: e.target.value }))} data-testid="input-client" /></div>
                <div><Label className="text-xs mb-1.5 block">Location</Label>
                  <Input value={project.location} onChange={e => setProject(p => ({ ...p, location: e.target.value }))} data-testid="input-location" /></div>
                <div><Label className="text-xs mb-1.5 block">Case ID</Label>
                  <Input value={project.caseId} onChange={e => setProject(p => ({ ...p, caseId: e.target.value }))} data-testid="input-case-id" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => setProject(p => ({ ...p, engineer: e.target.value }))} data-testid="input-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => setProject(p => ({ ...p, date: e.target.value }))} data-testid="input-date" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Atmospheric Pressure (bar abs)</Label>
                  <Input type="number" value={project.atmosphericPressure} onChange={e => setProject(p => ({ ...p, atmosphericPressure: parseFloat(e.target.value) || 0 }))} data-testid="input-atm-p" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Equipment & Set Pressure</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Equipment Tag</Label>
                  <Input value={equipment.tag} onChange={e => setEquipment(eq => ({ ...eq, tag: e.target.value }))} data-testid="input-equip-tag" /></div>
                <div><Label className="text-xs mb-1.5 block">Service</Label>
                  <Input value={equipment.service} onChange={e => setEquipment(eq => ({ ...eq, service: e.target.value }))} data-testid="input-service" /></div>
                <div><Label className="text-xs mb-1.5 block">Trapped Liquid Volume (m³)</Label>
                  <Input type="number" value={equipment.trappedVolume || ""} onChange={e => setEquipment(eq => ({ ...eq, trappedVolume: parseFloat(e.target.value) || 0 }))} data-testid="input-volume" /></div>
                <div><Label className="text-xs mb-1.5 block">MAWP ({pU}g)</Label>
                  <Input type="number" value={equipment.mawp || ""} onChange={e => setEquipment(eq => ({ ...eq, mawp: parseFloat(e.target.value) || 0 }))} data-testid="input-mawp" /></div>
                <div><Label className="text-xs mb-1.5 block">Set Pressure ({pU}g)</Label>
                  <Input type="number" value={equipment.setPressure || ""} onChange={e => setEquipment(eq => ({ ...eq, setPressure: parseFloat(e.target.value) || 0 }))} data-testid="input-set-p" /></div>
                <div><Label className="text-xs mb-1.5 block">Overpressure (%)</Label>
                  <Input type="number" value={equipment.overpressurePercent} onChange={e => setEquipment(eq => ({ ...eq, overpressurePercent: parseFloat(e.target.value) || 10 }))} data-testid="input-overpressure" /></div>
                <div><Label className="text-xs mb-1.5 block">Normal Op. Pressure ({pU}g)</Label>
                  <Input type="number" value={equipment.normalOpPressure || ""} onChange={e => setEquipment(eq => ({ ...eq, normalOpPressure: parseFloat(e.target.value) || 0 }))} data-testid="input-op-p" /></div>
                <div><Label className="text-xs mb-1.5 block">Normal Op. Temp ({tU})</Label>
                  <Input type="number" value={equipment.normalOpTemp || ""} onChange={e => setEquipment(eq => ({ ...eq, normalOpTemp: parseFloat(e.target.value) || 0 }))} data-testid="input-op-t" /></div>
              </div>
              {equipment.setPressure > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3 md:p-4">
                    <p className="text-xs font-medium mb-2">Computed Relieving Pressure</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Gauge:</span>
                      <span className="font-mono" data-testid="text-reliev-pg">{convertFromSI("pressure", relievingP.gauge, unitSystem).toFixed(2)} {pU}g</span>
                      <span>Absolute:</span>
                      <span className="font-mono" data-testid="text-reliev-pa">{relievingP.abs.toFixed(4)} bar(a)</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatsource">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Heat Source Configuration</h3>
              <p className="text-xs text-muted-foreground">Define the heat source causing thermal expansion per API 521</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Heat Source Type</Label>
                  <Select value={heatSource.type} onValueChange={v => setHeatSource(hs => ({ ...hs, type: v as HeatSource }))}>
                    <SelectTrigger data-testid="select-heat-source"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solar_bare">Solar - Bare vessel (947 W/m²)</SelectItem>
                      <SelectItem value="solar_insulated">Solar - Insulated (315 W/m²)</SelectItem>
                      <SelectItem value="process">Process heating</SelectItem>
                      <SelectItem value="manual">Manual heat input</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Heating Duration (hours)</Label>
                  <Input type="number" value={heatSource.heatingDuration || ""} onChange={e => setHeatSource(hs => ({ ...hs, heatingDuration: parseFloat(e.target.value) || 0 }))} data-testid="input-duration" /></div>
              </div>
              {(heatSource.type === "solar_bare" || heatSource.type === "solar_insulated") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Exposed Area (m²)</Label>
                    <Input type="number" value={heatSource.exposedArea || ""} onChange={e => setHeatSource(hs => ({ ...hs, exposedArea: parseFloat(e.target.value) || 0 }))} data-testid="input-area" /></div>
                  <Card className="bg-muted/30"><CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Solar flux: <span className="font-mono text-foreground">{heatSource.type === "solar_bare" ? "947" : "315"} W/m²</span> per API 521</p>
                    {heatSource.exposedArea > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Heat input: <span className="font-mono text-foreground">{((heatSource.type === "solar_bare" ? 947 : 315) * heatSource.exposedArea / 1000).toFixed(2)} kW</span></p>
                    )}
                  </CardContent></Card>
                </div>
              )}
              {(heatSource.type === "process" || heatSource.type === "manual") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Heat Input (kW)</Label>
                    <Input type="number" value={heatSource.heatInputKW || ""} onChange={e => setHeatSource(hs => ({ ...hs, heatInputKW: parseFloat(e.target.value) || 0 }))} data-testid="input-heat" /></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fluid">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Fluid Properties</h3>
              <p className="text-xs text-muted-foreground">Select a common fluid or enter custom properties</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div><Label className="text-xs mb-1.5 block">Select Common Fluid</Label>
                <Select onValueChange={v => { if (COMMON_FLUIDS[v]) setFluid({ ...COMMON_FLUIDS[v] }); }}>
                  <SelectTrigger data-testid="select-fluid"><SelectValue placeholder="Select fluid..." /></SelectTrigger>
                  <SelectContent>{Object.keys(COMMON_FLUIDS).map(k =>
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  )}</SelectContent>
                </Select></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Fluid Name</Label>
                  <Input value={fluid.name} onChange={e => setFluid(f => ({ ...f, name: e.target.value }))} data-testid="input-fluid-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Density (kg/m³)</Label>
                  <Input type="number" value={fluid.density || ""} onChange={e => setFluid(f => ({ ...f, density: parseFloat(e.target.value) || 0 }))} data-testid="input-density" /></div>
                <div><Label className="text-xs mb-1.5 block">Specific Heat (kJ/(kg·K))</Label>
                  <Input type="number" value={fluid.specificHeat || ""} onChange={e => setFluid(f => ({ ...f, specificHeat: parseFloat(e.target.value) || 0 }))} data-testid="input-cp" /></div>
                <div><Label className="text-xs mb-1.5 block">Thermal Expansion Coeff. (x10⁻⁴ /°C)</Label>
                  <Input type="number" value={fluid.thermalExpansion || ""} onChange={e => setFluid(f => ({ ...f, thermalExpansion: parseFloat(e.target.value) || 0 }))} data-testid="input-alpha" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temperature">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Temperature Conditions</h3>
              <p className="text-xs text-muted-foreground">Define initial and final temperatures for the blocked-in liquid</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Initial Temperature ({tU})</Label>
                  <Input type="number" value={temperatures.initial || ""} onChange={e => setTemperatures(t => ({ ...t, initial: parseFloat(e.target.value) || 0 }))} data-testid="input-t1" /></div>
                <div><Label className="text-xs mb-1.5 block">Final Temperature ({tU})</Label>
                  <Input type="number" value={temperatures.final || ""} onChange={e => setTemperatures(t => ({ ...t, final: parseFloat(e.target.value) || 0 }))} data-testid="input-t2" /></div>
              </div>
              {temperatures.initial > 0 && temperatures.final > temperatures.initial && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3 md:p-4">
                    <p className="text-xs font-medium mb-2">Temperature Rise</p>
                    <p className="text-lg font-mono font-bold text-primary" data-testid="text-delta-t">
                      {(temperatures.final - temperatures.initial).toFixed(1)} {tU}
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reliefrate">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Relief Rate Calculation</h3>
              <p className="text-xs text-muted-foreground">Calculate expansion volume and required relief rate</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <Card className="bg-muted/30"><CardContent className="p-3">
                  <p className="text-muted-foreground mb-1">Trapped Volume</p>
                  <p className="font-mono font-bold">{equipment.trappedVolume} m³</p>
                </CardContent></Card>
                <Card className="bg-muted/30"><CardContent className="p-3">
                  <p className="text-muted-foreground mb-1">Fluid</p>
                  <p className="font-mono font-bold">{fluid.name || "Custom"} ({fluid.density} kg/m³)</p>
                </CardContent></Card>
                <Card className="bg-muted/30"><CardContent className="p-3">
                  <p className="text-muted-foreground mb-1">Heat Source</p>
                  <p className="font-mono font-bold">{heatSource.type.replace("_", " ")}</p>
                </CardContent></Card>
                <Card className="bg-muted/30"><CardContent className="p-3">
                  <p className="text-muted-foreground mb-1">Temperature Rise</p>
                  <p className="font-mono font-bold">{temperatures.final - temperatures.initial} {tU}</p>
                </CardContent></Card>
              </div>
              <Button className="w-full" onClick={handleCalcReliefRate} data-testid="button-calc-rate">Calculate Relief Rate</Button>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}

              {reliefRateResult && expansionResult && heatResult && (
                <ResultsPanel title="Relief Rate Results" results={[
                  { label: "Temperature Rise", value: expansionResult.temperatureRise, unit: "°C" },
                  { label: "Expansion Volume", value: expansionResult.expansionVolume_L, unit: "L", highlight: true },
                  { label: "Heat Input", value: heatResult.heatInput_kW, unit: "kW" },
                  { label: "Relief Rate", value: reliefRateResult.reliefRate_Lmin, unit: "L/min", highlight: true },
                  { label: "Relief Rate", value: reliefRateResult.reliefRate_m3h, unit: "m³/h" },
                  { label: "Calculation Method", value: reliefRateResult.method, unit: "" },
                ]} rawData={{ ...expansionResult, ...reliefRateResult }} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizing">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Device Selection & Sizing</h3>
              <p className="text-xs text-muted-foreground">TRV sizing per API 520 liquid equation</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Discharge Coefficient (Kd)</Label>
                  <Input type="number" value={deviceSizing.kd} onChange={e => setDeviceSizing(d => ({ ...d, kd: parseFloat(e.target.value) || 0.65 }))} data-testid="input-kd" /></div>
                <div><Label className="text-xs mb-1.5 block">Back Pressure ({pU}g)</Label>
                  <Input type="number" value={deviceSizing.backPressure || ""} onChange={e => setDeviceSizing(d => ({ ...d, backPressure: parseFloat(e.target.value) || 0 }))} data-testid="input-back-p" /></div>
              </div>

              <Button className="w-full" onClick={handleCalcSizing} data-testid="button-calculate">Calculate Required Area</Button>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              {sizingResult && trvSelection && (
                <>
                  <ResultsPanel title="TRV Sizing Results" results={[
                    { label: "Required Orifice Area", value: sizingResult.requiredOrificeArea_mm2, unit: "mm²", highlight: true },
                    { label: "Relieving Pressure", value: sizingResult.relievingPressure_bar, unit: "bar(a)" },
                    { label: "Differential Pressure", value: sizingResult.differentialPressure_bar, unit: "bar" },
                    { label: "Specific Gravity", value: sizingResult.specificGravity, unit: "" },
                  ]} rawData={sizingResult} />

                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Selected Orifice (API 526)</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="text-muted-foreground">Orifice Designation:</span>
                        <span className="font-mono font-bold text-primary" data-testid="text-trv-designation">{trvSelection.designation}</span>
                        <span className="text-muted-foreground">Flanges (Inlet x Outlet):</span>
                        <span className="font-mono" data-testid="text-trv-flanges">{trvSelection.inletFlange} x {trvSelection.outletFlange}</span>
                        <span className="text-muted-foreground">Effective Area:</span>
                        <span className="font-mono" data-testid="text-trv-area">{trvSelection.area_mm2} mm²</span>
                        <span className="text-muted-foreground">Margin:</span>
                        <span className="font-mono text-green-400">+{trvSelection.margin.toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card><CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-3">API 526 Standard Orifice Sizes</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b">
                          <th className="text-left py-1.5 pr-3">Orifice</th>
                          <th className="text-right py-1.5 pr-3">Area (mm²)</th>
                          <th className="text-left py-1.5 pr-3">Inlet</th>
                          <th className="text-left py-1.5 pr-3">Outlet</th>
                          <th className="text-right py-1.5">Status</th>
                        </tr></thead>
                        <tbody>{API_526_ORIFICES.map(o => {
                          const isSelected = trvSelection.designation.startsWith(o.designation);
                          return (
                            <tr key={o.designation} className={`border-b border-muted/20 ${isSelected ? "bg-primary/10" : ""}`} data-testid={`row-orifice-${o.designation}`}>
                              <td className={`py-1.5 pr-3 font-mono ${isSelected ? "text-primary font-bold" : ""}`}>{o.designation}</td>
                              <td className="text-right py-1.5 pr-3 font-mono">{o.area}</td>
                              <td className="py-1.5 pr-3 font-mono text-muted-foreground">{o.inletFlange}</td>
                              <td className="py-1.5 pr-3 font-mono text-muted-foreground">{o.outletFlange}</td>
                              <td className="text-right py-1.5">
                                {isSelected && <Badge className="text-[10px]">Selected</Badge>}
                                {!isSelected && o.area >= sizingResult.requiredOrificeArea_mm2 && <span className="text-green-400">OK</span>}
                                {!isSelected && o.area < sizingResult.requiredOrificeArea_mm2 && <span className="text-muted-foreground/50">Too small</span>}
                              </td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </CardContent></Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="piping">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Piping Checks</h3>
              <p className="text-xs text-muted-foreground">Inlet/outlet piping pressure drop check (3% rule)</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div>
                <h4 className="text-xs font-medium mb-3">Inlet Piping</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Pipe Diameter ({getUnit("diameter", unitSystem)})</Label>
                    <Input type="number" value={inletPiping.pipeDiameter || ""} onChange={e => setInletPiping(p => ({ ...p, pipeDiameter: parseFloat(e.target.value) || 0 }))} data-testid="input-inlet-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Pipe Length ({getUnit("length", unitSystem)})</Label>
                    <Input type="number" value={inletPiping.pipeLength || ""} onChange={e => setInletPiping(p => ({ ...p, pipeLength: parseFloat(e.target.value) || 0 }))} data-testid="input-inlet-len" /></div>
                  <div><Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                    <Input type="number" value={inletPiping.roughness} onChange={e => setInletPiping(p => ({ ...p, roughness: parseFloat(e.target.value) || 0.046 }))} data-testid="input-inlet-rough" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fittings K (total)</Label>
                    <Input type="number" value={inletPiping.fittingsK} onChange={e => setInletPiping(p => ({ ...p, fittingsK: parseFloat(e.target.value) || 0 }))} data-testid="input-inlet-k" /></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-medium mb-3">Outlet Piping</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Pipe Diameter ({getUnit("diameter", unitSystem)})</Label>
                    <Input type="number" value={outletPiping.pipeDiameter || ""} onChange={e => setOutletPiping(p => ({ ...p, pipeDiameter: parseFloat(e.target.value) || 0 }))} data-testid="input-outlet-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Pipe Length ({getUnit("length", unitSystem)})</Label>
                    <Input type="number" value={outletPiping.pipeLength || ""} onChange={e => setOutletPiping(p => ({ ...p, pipeLength: parseFloat(e.target.value) || 0 }))} data-testid="input-outlet-len" /></div>
                  <div><Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                    <Input type="number" value={outletPiping.roughness} onChange={e => setOutletPiping(p => ({ ...p, roughness: parseFloat(e.target.value) || 0.046 }))} data-testid="input-outlet-rough" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fittings K (total)</Label>
                    <Input type="number" value={outletPiping.fittingsK} onChange={e => setOutletPiping(p => ({ ...p, fittingsK: parseFloat(e.target.value) || 0 }))} data-testid="input-outlet-k" /></div>
                </div>
              </div>

              <Button className="w-full" onClick={handlePipingCheck} disabled={!reliefRateResult} data-testid="button-piping-check">
                Run Piping Checks
              </Button>

              {inletPipingResult && (
                <Card className={inletPipingResult.pass ? "border-green-500/30" : "border-destructive/30"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={inletPipingResult.pass ? "secondary" : "destructive"} className="text-[10px]">
                        {inletPipingResult.pass ? "PASS" : "FAIL"}
                      </Badge>
                      <span className="text-xs font-medium">Inlet Piping</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Pressure Drop:</span><span className="font-mono">{inletPipingResult.pressureDrop_bar.toFixed(4)} bar ({inletPipingResult.percentOfSet.toFixed(1)}% of set)</span>
                      <span>Velocity:</span><span className="font-mono">{inletPipingResult.velocity.toFixed(2)} m/s</span>
                      <span>Re:</span><span className="font-mono">{inletPipingResult.reynoldsNumber.toFixed(0)}</span>
                    </div>
                    <WarningPanel warnings={inletPipingResult.warnings} />
                  </CardContent>
                </Card>
              )}

              {outletPipingResult && (
                <Card className={outletPipingResult.pass ? "border-green-500/30" : "border-destructive/30"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={outletPipingResult.pass ? "secondary" : "destructive"} className="text-[10px]">
                        {outletPipingResult.pass ? "PASS" : "FAIL"}
                      </Badge>
                      <span className="text-xs font-medium">Outlet Piping</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Pressure Drop:</span><span className="font-mono">{outletPipingResult.pressureDrop_bar.toFixed(4)} bar ({outletPipingResult.percentOfSet.toFixed(1)}% of set)</span>
                      <span>Velocity:</span><span className="font-mono">{outletPipingResult.velocity.toFixed(2)} m/s</span>
                      <span>Re:</span><span className="font-mono">{outletPipingResult.reynoldsNumber.toFixed(0)}</span>
                    </div>
                    <WarningPanel warnings={outletPipingResult.warnings} />
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Results Summary</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Button className="w-full" onClick={handleBuildResults} data-testid="button-build-results">Generate Final Results</Button>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              {finalResult && (
                <>
                  <WarningPanel warnings={finalResult.warnings} />

                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Thermal Relief Summary</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Project:</span>
                          <span className="font-mono" data-testid="text-result-project">{finalResult.project.name}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Equipment:</span>
                          <span className="font-mono" data-testid="text-result-equip">{finalResult.equipment.tag} - {finalResult.equipment.service}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Fluid:</span>
                          <span className="font-mono">{finalResult.fluid.name}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Heat Source:</span>
                          <span className="font-mono">{finalResult.heatSource.type.replace("_", " ")}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Temperature Rise:</span>
                          <span className="font-mono">{finalResult.expansionResult.temperatureRise.toFixed(1)} °C</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Expansion Volume:</span>
                          <span className="font-mono text-primary font-bold">{finalResult.expansionResult.expansionVolume_L.toFixed(2)} L</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Relief Rate:</span>
                          <span className="font-mono text-primary font-bold">{finalResult.reliefRateResult.reliefRate_Lmin.toFixed(3)} L/min</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Required Area:</span>
                          <span className="font-mono">{finalResult.sizingResult.requiredOrificeArea_mm2.toFixed(1)} mm²</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">API 526 Orifice:</span>
                          <span className="font-mono text-primary font-bold" data-testid="text-result-trv">{finalResult.trvSelection.designation}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Flanges (Inlet x Outlet):</span>
                          <span className="font-mono" data-testid="text-result-flanges">{finalResult.trvSelection.inletFlange} x {finalResult.trvSelection.outletFlange}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Effective Area:</span>
                          <span className="font-mono">{finalResult.trvSelection.area_mm2} mm² (+{finalResult.trvSelection.margin.toFixed(1)}%)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Pressure Rise Rate:</span>
                          <span className="font-mono">{finalResult.pressureRiseRate.toFixed(1)} bar/°C</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Action Items</h4>
                      <ul className="space-y-2">
                        {finalResult.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <AssumptionsPanel
                    assumptions={[
                      "Liquid is incompressible and fully trapped between two closed valves",
                      "Thermal expansion coefficient assumed constant over temperature range",
                      "Solar heat flux per API 521: 947 W/m² (bare) / 315 W/m² (insulated)",
                      "TRV sizing uses liquid relief equation with Kd = " + deviceSizing.kd,
                      "Pressure rise rate estimated using water isothermal compressibility",
                      "No allowance for pipe/vessel flexibility or thermal expansion of metal",
                    ]}
                    references={[
                      "API 521: Pressure-Relieving and Depressuring Systems, Section 5.18",
                      "API 520 Part I: Sizing of pressure-relieving devices",
                      "API 526: Flanged Steel Pressure-Relief Valves (standard orifice designations D–T)",
                      "ASME B31.3: Process Piping (blocked-in liquid overpressure)",
                      "Perry's Chemical Engineers' Handbook, Chapter 2 (thermal properties)",
                    ]}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <div className="mt-4">
            <FeedbackSection calculatorName="Thermal Relief" />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between mt-4 md:mt-6">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={tabIdx === 0} data-testid="button-prev-tab">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">Step {tabIdx + 1} of {TABS.length}</span>
        <Button variant="outline" size="sm" onClick={goNext} disabled={tabIdx === TABS.length - 1} data-testid="button-next-tab">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
