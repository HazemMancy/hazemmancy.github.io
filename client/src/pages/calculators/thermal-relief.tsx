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
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import {
  type ThermalProject, type ThermalEquipment, type ThermalHeatSource, type ThermalFluid,
  type ThermalTemperatures, type ThermalDeviceSizing, type ThermalPipingInput,
  type ThermalHeatResult, type ThermalExpansionResult, type ThermalReliefRateResult,
  type ThermalSizingResult, type TRVSelection, type ThermalPipingResult, type ThermalFinalResult,
  type HeatSource,
  COMMON_FLUIDS, API_526_ORIFICES, FLAG_LABELS,
  calculateHeatInput, calculateExpansion, calculateReliefRate,
  calculateRelievingPressure, calculateTRVSizing, selectTRV,
  calculateThermalPiping, buildThermalFinalResult, validateInputs,
  THERMAL_RELIEF_TEST_CASE,
} from "@/lib/engineering/thermalRelief";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Flame, FlaskConical, RotateCcw,
  ChevronLeft, ChevronRight, ClipboardList, Settings2,
  Sun, Droplets, Thermometer, Calculator, Wrench,
  PipetteIcon, CheckCircle2, Download, FileSpreadsheet, FileText,
  AlertTriangle, Info, XCircle, ChevronDown, ChevronUp,
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
  viscosity: 1.0, bulkModulus: 2200,
};

const defaultTemps: ThermalTemperatures = { initial: 0, final: 0 };

const defaultDeviceSizing: ThermalDeviceSizing = { kd: 0.65, kw: 1.0, backPressure: 0 };

const defaultPiping: ThermalPipingInput = {
  pipeDiameter: 25, pipeLength: 1, roughness: 0.046, fittingsK: 1.5,
};

function FlagIcon({ severity }: { severity: "info" | "warning" | "error" }) {
  if (severity === "error") return <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
}

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
  const [showTrace, setShowTrace] = useState(false);

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
      const tempsInSI: ThermalTemperatures = {
        initial: convertToSI("temperature", temperatures.initial, unitSystem),
        final: convertToSI("temperature", temperatures.final, unitSystem),
      };
      const validationErrors = validateInputs(equipment, fluid, tempsInSI, undefined, heatSource);
      if (validationErrors.length > 0) {
        setError(validationErrors.join("; "));
        return;
      }
      const hr = calculateHeatInput(heatSource);
      setHeatResult(hr);
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
      const tempsInSI: ThermalTemperatures = {
        initial: convertToSI("temperature", temperatures.initial, unitSystem),
        final: convertToSI("temperature", temperatures.final, unitSystem),
      };
      const validationErrors = validateInputs(equipment, fluid, tempsInSI, deviceSizing, heatSource);
      if (validationErrors.length > 0) {
        setError(validationErrors.join("; "));
        return;
      }
      const sp = convertToSI("pressure", equipment.setPressure, unitSystem);
      const bp = convertToSI("pressure", deviceSizing.backPressure, unitSystem);
      const sr = calculateTRVSizing(reliefRateResult, sp, equipment.overpressurePercent, bp, project.atmosphericPressure, fluid, deviceSizing.kd, deviceSizing.kw);
      setSizingResult(sr);
      const trv = selectTRV(sr.requiredOrificeArea_mm2);
      setTrvSelection(trv);
      setActiveTab("results");
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
      setInletPipingResult(calculateThermalPiping(inP, reliefRateResult.reliefRate_m3h, fluid.density, fluid.viscosity, sp, false));
      const outP: ThermalPipingInput = {
        pipeDiameter: convertToSI("diameter", outletPiping.pipeDiameter, unitSystem),
        pipeLength: convertToSI("length", outletPiping.pipeLength, unitSystem),
        roughness: outletPiping.roughness, fittingsK: outletPiping.fittingsK,
      };
      setOutletPipingResult(calculateThermalPiping(outP, reliefRateResult.reliefRate_m3h, fluid.density, fluid.viscosity, sp, true));
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

  const buildExportDatasheet = (): ExportDatasheet => ({
    calculatorName: "Thermal Expansion Relief Calculator",
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
      { label: "Trapped Volume", value: equipment.trappedVolume, unit: "m³" },
      { label: "MAWP", value: equipment.mawp, unit: `${pU}g` },
      { label: "Set Pressure", value: equipment.setPressure, unit: `${pU}g` },
      { label: "Overpressure", value: equipment.overpressurePercent, unit: "%" },
      { label: "Heat Source Type", value: heatSource.type.replace(/_/g, " "), unit: "" },
      { label: "Exposed Area", value: heatSource.exposedArea, unit: "m²" },
      { label: "Heating Duration", value: heatSource.heatingDuration, unit: "hours" },
      { label: "Fluid", value: fluid.name || "Custom" },
      { label: "Density", value: fluid.density, unit: "kg/m³" },
      { label: "Specific Heat", value: fluid.specificHeat, unit: "kJ/(kg·K)" },
      { label: "Thermal Expansion Coeff.", value: fluid.thermalExpansion, unit: "×10⁻⁴ /°C" },
      { label: "Viscosity", value: fluid.viscosity, unit: "cP" },
      { label: "Bulk Modulus", value: fluid.bulkModulus, unit: "MPa" },
      { label: "Initial Temperature", value: temperatures.initial, unit: tU },
      { label: "Final Temperature", value: temperatures.final, unit: tU },
      { label: "Kd", value: deviceSizing.kd, unit: "" },
      { label: "Kw", value: deviceSizing.kw, unit: "" },
      { label: "Back Pressure", value: deviceSizing.backPressure, unit: `${pU}g` },
    ],
    results: finalResult ? [
      { label: "Heat Input", value: finalResult.heatResult.heatInput_kW, unit: "kW" },
      { label: "Temperature Rise", value: finalResult.expansionResult.temperatureRise, unit: "°C" },
      { label: "Expansion Volume", value: finalResult.expansionResult.expansionVolume_L, unit: "L", highlight: true },
      { label: "Relief Rate", value: finalResult.reliefRateResult.reliefRate_Lmin, unit: "L/min", highlight: true },
      { label: "Relief Rate", value: finalResult.reliefRateResult.reliefRate_m3h, unit: "m³/h" },
      { label: "Method", value: finalResult.reliefRateResult.method, unit: "" },
      { label: "Required Orifice Area", value: finalResult.sizingResult.requiredOrificeArea_mm2, unit: "mm²", highlight: true },
      { label: "Kp (overpressure correction)", value: finalResult.sizingResult.kp, unit: "" },
      { label: "Relieving Pressure", value: finalResult.sizingResult.relievingPressure_bar, unit: "bar(a)" },
      { label: "Differential Pressure", value: finalResult.sizingResult.differentialPressure_bar, unit: "bar" },
      { label: "Specific Gravity", value: finalResult.sizingResult.specificGravity, unit: "" },
      { label: "API 526 Orifice", value: finalResult.trvSelection.designation, unit: "" },
      { label: "Effective Area", value: finalResult.trvSelection.area_mm2, unit: "mm²" },
      { label: "Margin", value: `+${finalResult.trvSelection.margin.toFixed(1)}%`, unit: "" },
      { label: "Flanges", value: `${finalResult.trvSelection.inletFlange} x ${finalResult.trvSelection.outletFlange}`, unit: "" },
      { label: "Pressure Rise per °C (Approx.)", value: finalResult.pressureRisePerDegC, unit: "bar/°C" },
    ] : [],
    assumptions: finalResult?.calcTrace.assumptions || [
      "Liquid is incompressible and fully trapped between two closed valves",
      "Thermal expansion coefficient assumed constant over temperature range",
    ],
    references: [
      "API 521: Pressure-Relieving and Depressuring Systems, Section 5.18",
      "API 520 Part I: Sizing of pressure-relieving devices",
      "API 526: Flanged Steel Pressure-Relief Valves (standard orifice designations D–T)",
      "ASME B31.3: Process Piping (blocked-in liquid overpressure)",
    ],
  });

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
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

      <Card className="mb-4 md:mb-6 border-amber-500/30 bg-amber-500/5" data-testid="banner-screening-disclaimer">
        <CardContent className="p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-500 mb-1">Screening Tool Only</p>
            <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
              This calculator is an engineering screening tool for preliminary thermal relief sizing.
              It is not intended for final relief system design. Final sizing shall be validated with rigorous process simulation
              and independent review per API 521 and applicable project specifications.
            </p>
          </div>
        </CardContent>
      </Card>

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
                  <NumericInput value={project.atmosphericPressure} onValueChange={v => setProject(p => ({ ...p, atmosphericPressure: v }))} data-testid="input-atm-p" /></div>
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
                  <NumericInput value={equipment.trappedVolume} onValueChange={v => setEquipment(eq => ({ ...eq, trappedVolume: v }))} data-testid="input-volume" /></div>
                <div><Label className="text-xs mb-1.5 block">MAWP ({pU}g)</Label>
                  <NumericInput value={equipment.mawp} onValueChange={v => setEquipment(eq => ({ ...eq, mawp: v }))} data-testid="input-mawp" /></div>
                <div><Label className="text-xs mb-1.5 block">Set Pressure ({pU}g)</Label>
                  <NumericInput value={equipment.setPressure} onValueChange={v => setEquipment(eq => ({ ...eq, setPressure: v }))} data-testid="input-set-p" /></div>
                <div><Label className="text-xs mb-1.5 block">Overpressure (%)</Label>
                  <NumericInput value={equipment.overpressurePercent} onValueChange={v => setEquipment(eq => ({ ...eq, overpressurePercent: v }))} data-testid="input-overpressure" /></div>
                <div><Label className="text-xs mb-1.5 block">Normal Op. Pressure ({pU}g)</Label>
                  <NumericInput value={equipment.normalOpPressure} onValueChange={v => setEquipment(eq => ({ ...eq, normalOpPressure: v }))} data-testid="input-op-p" /></div>
                <div><Label className="text-xs mb-1.5 block">Normal Op. Temp ({tU})</Label>
                  <NumericInput value={equipment.normalOpTemp} onValueChange={v => setEquipment(eq => ({ ...eq, normalOpTemp: v }))} data-testid="input-op-t" /></div>
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
                  <NumericInput value={heatSource.heatingDuration} onValueChange={v => setHeatSource(hs => ({ ...hs, heatingDuration: v }))} data-testid="input-duration" /></div>
              </div>
              {(heatSource.type === "solar_bare" || heatSource.type === "solar_insulated") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Exposed Area (m²)</Label>
                    <NumericInput value={heatSource.exposedArea} onValueChange={v => setHeatSource(hs => ({ ...hs, exposedArea: v }))} data-testid="input-area" /></div>
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
                    <NumericInput value={heatSource.heatInputKW} onValueChange={v => setHeatSource(hs => ({ ...hs, heatInputKW: v }))} data-testid="input-heat" /></div>
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
                  <NumericInput value={fluid.density} onValueChange={v => setFluid(f => ({ ...f, density: v }))} data-testid="input-density" /></div>
                <div><Label className="text-xs mb-1.5 block">Specific Heat (kJ/(kg·K))</Label>
                  <NumericInput value={fluid.specificHeat} onValueChange={v => setFluid(f => ({ ...f, specificHeat: v }))} data-testid="input-cp" /></div>
                <div><Label className="text-xs mb-1.5 block">Thermal Expansion Coeff. (×10⁻⁴ /°C)</Label>
                  <NumericInput value={fluid.thermalExpansion} onValueChange={v => setFluid(f => ({ ...f, thermalExpansion: v }))} data-testid="input-alpha" /></div>
                <div><Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                  <NumericInput value={fluid.viscosity} onValueChange={v => setFluid(f => ({ ...f, viscosity: v }))} data-testid="input-viscosity" /></div>
                <div><Label className="text-xs mb-1.5 block">Bulk Modulus (MPa)</Label>
                  <NumericInput value={fluid.bulkModulus} onValueChange={v => setFluid(f => ({ ...f, bulkModulus: v }))} data-testid="input-bulk-modulus" /></div>
              </div>
              <p className="text-[10px] text-muted-foreground">Bulk modulus is used to estimate pressure rise rate (dP/dT) in the blocked-in section. Set to 0 if unknown.</p>
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
                  <NumericInput value={temperatures.initial} onValueChange={v => setTemperatures(t => ({ ...t, initial: v }))} data-testid="input-t1" /></div>
                <div><Label className="text-xs mb-1.5 block">Final Temperature ({tU})</Label>
                  <NumericInput value={temperatures.final} onValueChange={v => setTemperatures(t => ({ ...t, final: v }))} data-testid="input-t2" /></div>
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
                  <p className="font-mono font-bold">{heatSource.type.replace(/_/g, " ")}</p>
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
                  ...(reliefRateResult.heatMethodRate_m3h > 0 ? [{ label: "Heat Method Rate", value: reliefRateResult.heatMethodRate_m3h * 1000 / 60, unit: "L/min" }] : []),
                  ...(reliefRateResult.timeMethodRate_m3h > 0 ? [{ label: "Volume/Time Rate", value: reliefRateResult.timeMethodRate_m3h * 1000 / 60, unit: "L/min" }] : []),
                  { label: "Governing Relief Rate", value: reliefRateResult.reliefRate_Lmin, unit: "L/min", highlight: true },
                  { label: "Governing Relief Rate", value: reliefRateResult.reliefRate_m3h, unit: "m³/h" },
                  { label: "Governing Method", value: reliefRateResult.method, unit: "" },
                ]} rawData={{ ...expansionResult, ...reliefRateResult }} exportData={{
                  calculatorName: "Thermal Expansion Relief — Relief Rate",
                  projectInfo: [
                    { label: "Project", value: project.name || "—" },
                    { label: "Engineer", value: project.engineer || "—" },
                    { label: "Date", value: project.date },
                  ],
                  inputs: [
                    { label: "Equipment Tag", value: equipment.tag || "—" },
                    { label: "Trapped Volume", value: equipment.trappedVolume, unit: "m³" },
                    { label: "Heat Source Type", value: heatSource.type.replace(/_/g, " ") },
                    { label: "Heating Duration", value: heatSource.heatingDuration, unit: "hours" },
                    { label: "Fluid", value: fluid.name || "Custom" },
                    { label: "Density", value: fluid.density, unit: "kg/m³" },
                    { label: "Specific Heat", value: fluid.specificHeat, unit: "kJ/(kg·K)" },
                    { label: "Thermal Expansion Coeff.", value: fluid.thermalExpansion, unit: "×10⁻⁴ /°C" },
                    { label: "Initial Temperature", value: temperatures.initial, unit: tU },
                    { label: "Final Temperature", value: temperatures.final, unit: tU },
                  ],
                  results: [
                    { label: "Temperature Rise", value: expansionResult.temperatureRise, unit: "°C" },
                    { label: "Expansion Volume", value: expansionResult.expansionVolume_L, unit: "L", highlight: true },
                    { label: "Heat Input", value: heatResult.heatInput_kW, unit: "kW" },
                    { label: "Relief Rate", value: reliefRateResult.reliefRate_Lmin, unit: "L/min", highlight: true },
                    { label: "Relief Rate", value: reliefRateResult.reliefRate_m3h, unit: "m³/h" },
                    { label: "Calculation Method", value: reliefRateResult.method, unit: "" },
                  ],
                  assumptions: [
                    "Liquid is incompressible and fully trapped between two closed valves",
                    "Thermal expansion coefficient assumed constant over temperature range",
                    "Solar heat flux per API 521: 947 W/m² (bare) / 315 W/m² (insulated)",
                  ],
                  references: [
                    "API 521: Pressure-Relieving and Depressuring Systems, Section 5.18",
                    "Perry's Chemical Engineers' Handbook, Chapter 2 (thermal properties)",
                  ],
                } as ExportDatasheet} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizing">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Device Selection & Sizing</h3>
              <p className="text-xs text-muted-foreground">TRV sizing per API 520 liquid equation with Kw and Kp correction</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Discharge Coefficient (Kd)</Label>
                  <NumericInput value={deviceSizing.kd} onValueChange={v => setDeviceSizing(d => ({ ...d, kd: v }))} data-testid="input-kd" />
                  <p className="text-[10px] text-muted-foreground mt-1">Typical: 0.65 for liquid TRV</p></div>
                <div><Label className="text-xs mb-1.5 block">Backpressure Correction (Kw)</Label>
                  <NumericInput value={deviceSizing.kw} onValueChange={v => setDeviceSizing(d => ({ ...d, kw: v }))} data-testid="input-kw" />
                  <p className="text-[10px] text-muted-foreground mt-1">Verify per API 520 §5.7.2 — depends on device type and service conditions</p></div>
                <div><Label className="text-xs mb-1.5 block">Back Pressure ({pU}g)</Label>
                  <NumericInput value={deviceSizing.backPressure} onValueChange={v => setDeviceSizing(d => ({ ...d, backPressure: v }))} data-testid="input-back-p" /></div>
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
                    { label: "Kd", value: sizingResult.kd, unit: "" },
                    { label: "Kw", value: sizingResult.kw, unit: "" },
                    { label: "Kp (overpressure correction)", value: sizingResult.kp, unit: "" },
                  ]} rawData={sizingResult} exportData={{
                    calculatorName: "Thermal Expansion Relief — TRV Sizing",
                    projectInfo: [
                      { label: "Project", value: project.name || "—" },
                      { label: "Engineer", value: project.engineer || "—" },
                      { label: "Date", value: project.date },
                    ],
                    inputs: [
                      { label: "Set Pressure", value: equipment.setPressure, unit: `${pU}g` },
                      { label: "Overpressure", value: equipment.overpressurePercent, unit: "%" },
                      { label: "Back Pressure", value: deviceSizing.backPressure, unit: `${pU}g` },
                      { label: "Discharge Coefficient (Kd)", value: deviceSizing.kd },
                      { label: "Backpressure Correction (Kw)", value: deviceSizing.kw },
                      { label: "Fluid", value: fluid.name || "Custom" },
                      { label: "Density", value: fluid.density, unit: "kg/m³" },
                    ],
                    results: [
                      { label: "Required Orifice Area", value: sizingResult.requiredOrificeArea_mm2, unit: "mm²", highlight: true },
                      { label: "Relieving Pressure", value: sizingResult.relievingPressure_bar, unit: "bar(a)" },
                      { label: "Differential Pressure", value: sizingResult.differentialPressure_bar, unit: "bar" },
                      { label: "Specific Gravity", value: sizingResult.specificGravity, unit: "" },
                      { label: "Kp (overpressure correction)", value: sizingResult.kp, unit: "" },
                      ...(trvSelection ? [
                        { label: "Selected Orifice", value: trvSelection.designation, unit: "" },
                        { label: "Effective Area", value: trvSelection.area_mm2, unit: "mm²" },
                        { label: "Margin", value: `+${trvSelection.margin.toFixed(1)}%`, unit: "" },
                        { label: "Flanges (Inlet x Outlet)", value: `${trvSelection.inletFlange} x ${trvSelection.outletFlange}`, unit: "" },
                      ] : []),
                    ],
                    assumptions: [
                      "TRV sizing uses liquid relief equation with Kd = " + deviceSizing.kd,
                      "Backpressure correction Kw = " + deviceSizing.kw,
                      "Overpressure correction Kp per API 520 Figure 31",
                      "Orifice selection per API 526 standard designations",
                    ],
                    references: [
                      "API 520 Part I: Sizing of pressure-relieving devices",
                      "API 526: Flanged Steel Pressure-Relief Valves",
                    ],
                  } as ExportDatasheet} />

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
              <p className="text-xs text-muted-foreground">Inlet: 3% rule per API 520. Outlet: hydraulic estimate only — no pass/fail criterion (back pressure compliance depends on device type selection).</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div>
                <h4 className="text-xs font-medium mb-3">Inlet Piping</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Pipe Diameter ({getUnit("diameter", unitSystem)})</Label>
                    <NumericInput value={inletPiping.pipeDiameter} onValueChange={v => setInletPiping(p => ({ ...p, pipeDiameter: v }))} data-testid="input-inlet-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Pipe Length ({getUnit("length", unitSystem)})</Label>
                    <NumericInput value={inletPiping.pipeLength} onValueChange={v => setInletPiping(p => ({ ...p, pipeLength: v }))} data-testid="input-inlet-len" /></div>
                  <div><Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                    <NumericInput value={inletPiping.roughness} onValueChange={v => setInletPiping(p => ({ ...p, roughness: v }))} data-testid="input-inlet-rough" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fittings K (total)</Label>
                    <NumericInput value={inletPiping.fittingsK} onValueChange={v => setInletPiping(p => ({ ...p, fittingsK: v }))} data-testid="input-inlet-k" /></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-medium mb-3">Outlet Piping</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Pipe Diameter ({getUnit("diameter", unitSystem)})</Label>
                    <NumericInput value={outletPiping.pipeDiameter} onValueChange={v => setOutletPiping(p => ({ ...p, pipeDiameter: v }))} data-testid="input-outlet-dia" /></div>
                  <div><Label className="text-xs mb-1.5 block">Pipe Length ({getUnit("length", unitSystem)})</Label>
                    <NumericInput value={outletPiping.pipeLength} onValueChange={v => setOutletPiping(p => ({ ...p, pipeLength: v }))} data-testid="input-outlet-len" /></div>
                  <div><Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                    <NumericInput value={outletPiping.roughness} onValueChange={v => setOutletPiping(p => ({ ...p, roughness: v }))} data-testid="input-outlet-rough" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fittings K (total)</Label>
                    <NumericInput value={outletPiping.fittingsK} onValueChange={v => setOutletPiping(p => ({ ...p, fittingsK: v }))} data-testid="input-outlet-k" /></div>
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
                      <span>Friction Factor:</span><span className="font-mono">{inletPipingResult.frictionFactor.toFixed(5)}</span>
                    </div>
                    <WarningPanel warnings={inletPipingResult.warnings} />
                  </CardContent>
                </Card>
              )}

              {outletPipingResult && (
                <Card className="border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-400">ESTIMATE</Badge>
                      <span className="text-xs font-medium">Outlet Piping (Hydraulic Estimate — No Pass/Fail)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <span>Pressure Drop:</span><span className="font-mono">{outletPipingResult.pressureDrop_bar.toFixed(4)} bar ({outletPipingResult.percentOfSet.toFixed(1)}% of set)</span>
                      <span>Velocity:</span><span className="font-mono">{outletPipingResult.velocity.toFixed(2)} m/s</span>
                      <span>Re:</span><span className="font-mono">{outletPipingResult.reynoldsNumber.toFixed(0)}</span>
                      <span>Friction Factor:</span><span className="font-mono">{outletPipingResult.frictionFactor.toFixed(5)}</span>
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
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" data-testid="button-export-final">
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem data-testid="button-export-calc-note" onClick={() => exportToCalcNote(buildExportDatasheet())}>
                          <FileText className="w-3.5 h-3.5 mr-2" /> Calc Note (Print / PDF)
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid="button-export-final-excel" onClick={() => exportToExcel(buildExportDatasheet())}>
                          <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Export Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid="button-export-final-json" onClick={() => exportToJSON(buildExportDatasheet())}>
                          <Download className="w-3.5 h-3.5 mr-2" /> Export JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {finalResult.flags.length > 0 && (
                    <Card className="border-yellow-500/30 bg-yellow-500/5" data-testid="card-flags">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          Engineering Flags
                        </h4>
                        <div className="space-y-2">
                          {finalResult.flags.map((flag, i) => {
                            const info = FLAG_LABELS[flag];
                            return (
                              <div key={i} className="flex items-center gap-2 text-xs" data-testid={`flag-${flag}`}>
                                <FlagIcon severity={info?.severity || "info"} />
                                <span className={info?.severity === "error" ? "text-destructive" : info?.severity === "warning" ? "text-yellow-400" : "text-muted-foreground"}>
                                  {info?.label || flag}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <WarningPanel warnings={finalResult.warnings} />

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Summary</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Heat Input:</span>
                          <span className="font-mono">{finalResult.heatResult.heatInput_kW.toFixed(3)} kW</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Temperature Rise:</span>
                          <span className="font-mono">{finalResult.expansionResult.temperatureRise.toFixed(1)} °C</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Expansion Volume:</span>
                          <span className="font-mono text-primary font-bold">{finalResult.expansionResult.expansionVolume_L.toFixed(3)} L</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Relief Rate:</span>
                          <span className="font-mono text-primary font-bold">{finalResult.reliefRateResult.reliefRate_Lmin.toFixed(4)} L/min</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Method:</span>
                          <span className="font-mono text-xs">{finalResult.reliefRateResult.method}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Required Area:</span>
                          <span className="font-mono">{finalResult.sizingResult.requiredOrificeArea_mm2.toFixed(2)} mm²</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Kd / Kw / Kp:</span>
                          <span className="font-mono">{finalResult.sizingResult.kd} / {finalResult.sizingResult.kw} / {finalResult.sizingResult.kp.toFixed(3)}</span>
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
                          <span className="text-muted-foreground">Pressure Rise per °C (Approx.):</span>
                          <span className="font-mono">{finalResult.pressureRisePerDegC.toFixed(1)} bar/°C</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {(finalResult.inletPiping || finalResult.outletPiping) && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3">Piping Checks</h4>
                        <div className="space-y-3">
                          {finalResult.inletPiping && (
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant={finalResult.inletPiping.pass ? "secondary" : "destructive"} className="text-[10px]">
                                {finalResult.inletPiping.pass ? "PASS" : "FAIL"}
                              </Badge>
                              <span>Inlet: {finalResult.inletPiping.pressureDrop_bar.toFixed(4)} bar ({finalResult.inletPiping.percentOfSet.toFixed(1)}%), v={finalResult.inletPiping.velocity.toFixed(2)} m/s</span>
                            </div>
                          )}
                          {finalResult.outletPiping && (
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-400">ESTIMATE</Badge>
                              <span>Outlet: {finalResult.outletPiping.pressureDrop_bar.toFixed(4)} bar ({finalResult.outletPiping.percentOfSet.toFixed(1)}%), v={finalResult.outletPiping.velocity.toFixed(2)} m/s (hydraulic est.)</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

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

                  <Card>
                    <CardContent className="p-4">
                      <button
                        className="flex items-center gap-2 w-full text-left"
                        onClick={() => setShowTrace(!showTrace)}
                        data-testid="button-toggle-trace"
                      >
                        <h4 className="font-semibold text-sm">Calculation Trace</h4>
                        {showTrace ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                      </button>
                      {showTrace && (
                        <div className="mt-3 space-y-3">
                          {finalResult.calcTrace.steps.map((step, i) => (
                            <div key={i} className="border border-muted/30 rounded-md p-3">
                              <p className="text-xs font-medium text-primary mb-1">Step {i + 1}: {step.name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground mb-2">{step.equation}</p>
                              <div className="grid grid-cols-2 gap-1 text-[10px]">
                                {Object.entries(step.variables).map(([k, v]) => (
                                  <div key={k} className="flex justify-between">
                                    <span className="text-muted-foreground">{k}:</span>
                                    <span className="font-mono">{typeof v === "number" ? v.toFixed(6) : v}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-1 pt-1 border-t border-muted/20">
                                <p className="text-[10px] font-mono font-bold">{step.result}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <AssumptionsPanel
                    assumptions={finalResult.calcTrace.assumptions}
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
