import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { COMMON_GASES, COMMON_LIQUIDS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import {
  type ROProject, type ROServiceInput, type ROResult,
  type Phase, type SizingMode, type CdMode, type BasisMode,
  DEFAULT_PROJECT, DEFAULT_SERVICE,
  calculateRO,
  RO_LIQUID_SERVICE_TEST, RO_GAS_SERVICE_TEST,
  FLAG_LABELS, FLAG_SEVERITY,
} from "@/lib/engineering/restrictionOrifice";
import {
  CircleDot, FlaskConical, RotateCcw, ChevronLeft, ChevronRight,
  ClipboardList, Droplets, Settings2, BarChart3, ShieldCheck,
  AlertTriangle, Download, CheckCircle2, Zap,
} from "lucide-react";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "service", label: "Service", icon: Droplets, step: 2 },
  { id: "sizing", label: "Sizing", icon: Settings2, step: 3 },
  { id: "results", label: "Results", icon: BarChart3, step: 4 },
  { id: "recommendations", label: "Actions", icon: ShieldCheck, step: 5 },
];

export default function RestrictionOrificePage() {
  const [activeTab, setActiveTab] = useState("project");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [project, setProject] = useState<ROProject>({ ...DEFAULT_PROJECT });
  const [service, setService] = useState<ROServiceInput>({ ...DEFAULT_SERVICE });
  const [result, setResult] = useState<ROResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProject = (field: keyof ROProject, value: string | number | boolean) =>
    setProject(p => ({ ...p, [field]: value }));

  const updateService = (field: keyof ROServiceInput, value: unknown) =>
    setService(p => ({ ...p, [field]: value }));

  const updateLiquidProps = (field: string, value: number) =>
    setService(p => ({ ...p, liquidProps: { ...p.liquidProps, [field]: value } }));

  const updateGasProps = (field: string, value: number) =>
    setService(p => ({ ...p, gasProps: { ...p.gasProps, [field]: value } }));

  const updateOrifice = (field: string, value: string | number) =>
    setService(p => ({ ...p, orifice: { ...p.orifice, [field]: value } }));

  const handleUnitToggle = (ns: UnitSystem) => {
    setUnitSystem(ns);
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null); setResult(null);
    if (service.phase === "liquid") {
      setService({ ...RO_LIQUID_SERVICE_TEST });
    } else {
      setService({ ...RO_GAS_SERVICE_TEST });
    }
  };

  const handleReset = () => {
    setProject({ ...DEFAULT_PROJECT });
    setService({ ...DEFAULT_SERVICE });
    setResult(null); setError(null);
    setActiveTab("project");
  };

  const handleLiquidSelect = (name: string) => {
    const l = COMMON_LIQUIDS[name];
    if (l) updateLiquidProps("density", l.density);
  };

  const handleGasSelect = (name: string) => {
    const g = COMMON_GASES[name];
    if (g) {
      setService(p => ({
        ...p, gasProps: { ...p.gasProps, molecularWeight: g.mw, specificHeatRatio: g.gamma },
      }));
    }
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const input = { ...service };
      if (unitSystem !== "SI") {
        if (input.phase === "liquid") {
          if (input.flowBasis === "volume") {
            input.volFlowRate = convertToSI("flowLiquid", input.volFlowRate, unitSystem);
          } else {
            input.massFlowRate = convertToSI("flowMass", input.massFlowRate, unitSystem);
          }
          input.upstreamPressure = convertToSI("pressureAbs", input.upstreamPressure, unitSystem);
          input.downstreamPressure = convertToSI("pressureAbs", input.downstreamPressure, unitSystem);
        } else {
          input.massFlowRate = convertToSI("flowMass", input.massFlowRate, unitSystem);
          input.upstreamPressure = convertToSI("pressureAbs", input.upstreamPressure, unitSystem);
          input.downstreamPressure = convertToSI("pressureAbs", input.downstreamPressure, unitSystem);
          input.temperature = convertToSI("temperature", input.temperature, unitSystem);
        }
        input.pipeDiameter = convertToSI("diameter", input.pipeDiameter, unitSystem);
        if (input.orificeDiameter > 0) {
          input.orificeDiameter = convertToSI("diameter", input.orificeDiameter, unitSystem);
        }
        if (input.liquidProps.vaporPressure > 0) {
          input.liquidProps = { ...input.liquidProps, vaporPressure: convertToSI("pressureAbs", input.liquidProps.vaporPressure, unitSystem) };
        }
      }
      const r = calculateRO(input, project);
      setResult(r);
      setActiveTab("results");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const exportData = { project, service, result, unitSystem, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ro_sizing_${project.caseId || "case"}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  const pU = (param: string) => getUnit(param, unitSystem);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
      <Card className="mb-4 md:mb-6 bg-amber-950/30 border-amber-800/50">
        <CardContent className="flex items-center gap-3 p-3 md:p-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-[10px] md:text-xs text-amber-200/70" data-testid="text-disclaimer">
            SCREENING TOOL — This provides preliminary restriction orifice sizing for single-phase liquid and gas/vapor service. Final design must be verified with detailed hydraulics, mechanical integrity checks, noise/vibration analysis, and vendor specifications.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">Restriction Orifice Sizing</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Liquid & gas orifice with choked-flow check</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
          <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
            <FlaskConical className="w-3.5 h-3.5 mr-1" /> Test Case
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-ro">
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

        {/* TAB 1: PROJECT */}
        <TabsContent value="project">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Project Setup</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Case Name</Label>
                  <Input value={project.name} onChange={e => updateProject("name", e.target.value)} data-testid="input-case-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Case ID</Label>
                  <Input value={project.caseId} onChange={e => updateProject("caseId", e.target.value)} data-testid="input-case-id" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => updateProject("engineer", e.target.value)} data-testid="input-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => updateProject("date", e.target.value)} data-testid="input-date" /></div>
              </div>
              <Card className="bg-muted/30"><CardContent className="p-3">
                <h4 className="text-xs font-semibold mb-2">Solver Settings</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-[10px] mb-1 block">Max Iterations</Label>
                    <Input type="number" className="h-8 text-xs" value={project.maxIterations} onChange={e => updateProject("maxIterations", parseInt(e.target.value) || 50)} data-testid="input-max-iter" /></div>
                  <div><Label className="text-[10px] mb-1 block">Tolerance</Label>
                    <Input type="number" className="h-8 text-xs" value={project.tolerance} step="0.000001" onChange={e => updateProject("tolerance", parseFloat(e.target.value) || 1e-6)} data-testid="input-tolerance" /></div>
                </div>
              </CardContent></Card>
              <Card className="bg-muted/30"><CardContent className="p-3 text-[10px] text-muted-foreground">
                Basis: Generic RO sizing (engineering approximation). Equations reference ISO 5167 / Crane TP-410 methodology. Not certified for metering-grade compliance.
              </CardContent></Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SERVICE & INPUTS */}
        <TabsContent value="service">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">Service & Fluid Properties</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Phase</Label>
                  <Select value={service.phase} onValueChange={v => updateService("phase", v as Phase)}>
                    <SelectTrigger data-testid="select-phase"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liquid">Liquid</SelectItem>
                      <SelectItem value="gas">Gas / Vapor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {service.phase === "liquid" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground">Flow & Pressures</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Flow Basis</Label>
                      <Select value={service.flowBasis} onValueChange={v => updateService("flowBasis", v)}>
                        <SelectTrigger data-testid="select-flow-basis"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="volume">Volumetric ({pU("flowLiquid")})</SelectItem>
                          <SelectItem value="mass">Mass ({pU("flowMass")})</SelectItem>
                        </SelectContent>
                      </Select></div>
                    {service.flowBasis === "volume" ? (
                      <div><Label className="text-xs mb-1.5 block">Vol Flow ({pU("flowLiquid")})</Label>
                        <Input type="number" value={service.volFlowRate || ""} onChange={e => updateService("volFlowRate", parseFloat(e.target.value) || 0)} data-testid="input-vol-flow" /></div>
                    ) : (
                      <div><Label className="text-xs mb-1.5 block">Mass Flow ({pU("flowMass")})</Label>
                        <Input type="number" value={service.massFlowRate || ""} onChange={e => updateService("massFlowRate", parseFloat(e.target.value) || 0)} data-testid="input-mass-flow" /></div>
                    )}
                    <div><Label className="text-xs mb-1.5 block">P1 Upstream ({pU("pressureAbs")})</Label>
                      <Input type="number" value={service.upstreamPressure || ""} onChange={e => updateService("upstreamPressure", parseFloat(e.target.value) || 0)} data-testid="input-p1" /></div>
                    <div><Label className="text-xs mb-1.5 block">P2 Downstream ({pU("pressureAbs")})</Label>
                      <Input type="number" value={service.downstreamPressure || ""} onChange={e => updateService("downstreamPressure", parseFloat(e.target.value) || 0)} data-testid="input-p2" /></div>
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground">Liquid Properties</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Liquid Selection</Label>
                      <Select onValueChange={handleLiquidSelect}>
                        <SelectTrigger data-testid="select-liquid"><SelectValue placeholder="Select liquid..." /></SelectTrigger>
                        <SelectContent>{Object.keys(COMMON_LIQUIDS).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><Label className="text-xs mb-1.5 block">Density (kg/m³)</Label>
                      <Input type="number" value={service.liquidProps.density || ""} onChange={e => updateLiquidProps("density", parseFloat(e.target.value) || 0)} data-testid="input-density" /></div>
                    <div><Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                      <Input type="number" value={service.liquidProps.viscosity || ""} onChange={e => updateLiquidProps("viscosity", parseFloat(e.target.value) || 0)} data-testid="input-viscosity" /></div>
                    <div><Label className="text-xs mb-1.5 block">Vapor Pressure ({pU("pressureAbs")})</Label>
                      <Input type="number" value={service.liquidProps.vaporPressure || ""} onChange={e => updateLiquidProps("vaporPressure", parseFloat(e.target.value) || 0)} placeholder="Optional — for cavitation check" data-testid="input-vapor-pressure" /></div>
                  </div>
                </div>
              )}

              {service.phase === "gas" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground">Flow & Pressures</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Mass Flow ({pU("flowMass")})</Label>
                      <Input type="number" value={service.massFlowRate || ""} onChange={e => updateService("massFlowRate", parseFloat(e.target.value) || 0)} data-testid="input-mass-flow" /></div>
                    <div><Label className="text-xs mb-1.5 block">P1 Upstream ({pU("pressureAbs")})</Label>
                      <Input type="number" value={service.upstreamPressure || ""} onChange={e => updateService("upstreamPressure", parseFloat(e.target.value) || 0)} data-testid="input-p1" /></div>
                    <div><Label className="text-xs mb-1.5 block">P2 Downstream ({pU("pressureAbs")})</Label>
                      <Input type="number" value={service.downstreamPressure || ""} onChange={e => updateService("downstreamPressure", parseFloat(e.target.value) || 0)} data-testid="input-p2" /></div>
                    <div><Label className="text-xs mb-1.5 block">Temperature ({pU("temperature")})</Label>
                      <Input type="number" value={service.temperature || ""} onChange={e => updateService("temperature", parseFloat(e.target.value) || 0)} data-testid="input-temp" /></div>
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground">Gas Properties</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Gas Selection</Label>
                      <Select onValueChange={handleGasSelect}>
                        <SelectTrigger data-testid="select-gas"><SelectValue placeholder="Select gas..." /></SelectTrigger>
                        <SelectContent>{Object.keys(COMMON_GASES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><Label className="text-xs mb-1.5 block">MW (kg/kmol)</Label>
                      <Input type="number" value={service.gasProps.molecularWeight || ""} onChange={e => updateGasProps("molecularWeight", parseFloat(e.target.value) || 0)} data-testid="input-mw" /></div>
                    <div><Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
                      <Input type="number" value={service.gasProps.specificHeatRatio || ""} onChange={e => updateGasProps("specificHeatRatio", parseFloat(e.target.value) || 0)} data-testid="input-k" /></div>
                    <div><Label className="text-xs mb-1.5 block">Z-factor</Label>
                      <Input type="number" value={service.gasProps.compressibilityFactor || ""} onChange={e => updateGasProps("compressibilityFactor", parseFloat(e.target.value) || 0)} data-testid="input-z" /></div>
                  </div>
                </div>
              )}

              <h4 className="text-xs font-semibold text-muted-foreground">Pipe & Orifice</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <PipeSizeSelector
                    innerDiameter={String(service.pipeDiameter)}
                    onDiameterChange={(v: string) => updateService("pipeDiameter", parseFloat(v) || 0)}
                    unitSystem={unitSystem}
                    showRoughness={false}
                    testIdPrefix="ro"
                  />
                </div>
                <div><Label className="text-xs mb-1.5 block">Pipe ID ({pU("diameter")})</Label>
                  <Input type="number" value={service.pipeDiameter || ""} onChange={e => updateService("pipeDiameter", parseFloat(e.target.value) || 0)} data-testid="input-pipe-dia" /></div>
                <div><Label className="text-xs mb-1.5 block">Cd Mode</Label>
                  <Select value={service.orifice.cdMode} onValueChange={v => updateOrifice("cdMode", v as CdMode)}>
                    <SelectTrigger data-testid="select-cd-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User-Defined Cd</SelectItem>
                      <SelectItem value="estimated">Estimated Cd (warning)</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Cd Value</Label>
                  <Input type="number" value={service.orifice.cdValue || ""} step="0.01" onChange={e => updateOrifice("cdValue", parseFloat(e.target.value) || 0)} data-testid="input-cd" /></div>
                <div><Label className="text-xs mb-1.5 block">Edge Type</Label>
                  <Select value={service.orifice.edgeType} onValueChange={v => updateOrifice("edgeType", v)}>
                    <SelectTrigger data-testid="select-edge"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sharp">Sharp-edged (default)</SelectItem>
                      <SelectItem value="rounded">Rounded (requires vendor data)</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Basis Mode</Label>
                  <Select value={service.orifice.basisMode} onValueChange={v => updateOrifice("basisMode", v as BasisMode)}>
                    <SelectTrigger data-testid="select-basis"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inPipe">In-pipe with β correction</SelectItem>
                      <SelectItem value="freeDischarge">Free discharge (no β corr.)</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Plate Thickness ({pU("diameter")})</Label>
                  <Input type="number" value={service.orifice.thickness || ""} onChange={e => updateOrifice("thickness", parseFloat(e.target.value) || 0)} placeholder="Informational" data-testid="input-thickness" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SIZING MODE */}
        <TabsContent value="sizing">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Sizing Mode & Constraints</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Sizing Mode</Label>
                  <Select value={service.sizingMode} onValueChange={v => updateService("sizingMode", v as SizingMode)}>
                    <SelectTrigger data-testid="select-sizing-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sizeForFlow">Size for required flow (solve for d)</SelectItem>
                      <SelectItem value="predictDP">Predict ΔP for given orifice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {service.sizingMode === "predictDP" && (
                  <div><Label className="text-xs mb-1.5 block">Orifice Diameter ({pU("diameter")})</Label>
                    <Input type="number" value={service.orificeDiameter || ""} onChange={e => updateService("orificeDiameter", parseFloat(e.target.value) || 0)} data-testid="input-orifice-dia" /></div>
                )}
              </div>

              <Card className="bg-muted/30"><CardContent className="p-3">
                <h4 className="text-xs font-semibold mb-2">Constraints & Limits</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-[10px] mb-1 block">β min (warning threshold)</Label>
                    <Input type="number" className="h-8 text-xs" value={service.betaMin} step="0.05" onChange={e => updateService("betaMin", parseFloat(e.target.value) || 0.2)} data-testid="input-beta-min" /></div>
                  <div><Label className="text-[10px] mb-1 block">β max (warning threshold)</Label>
                    <Input type="number" className="h-8 text-xs" value={service.betaMax} step="0.05" onChange={e => updateService("betaMax", parseFloat(e.target.value) || 0.75)} data-testid="input-beta-max" /></div>
                </div>
              </CardContent></Card>

              <Card className="bg-muted/30"><CardContent className="p-3 text-[10px] text-muted-foreground space-y-1">
                <p><strong>Size for flow:</strong> Given Q or W, P1, P2 → solver finds required orifice diameter d (bisection method).</p>
                <p><strong>Predict ΔP:</strong> Given d → computes achievable flow and resulting conditions. Useful for checking existing orifice plates.</p>
                <p>The solver iterates to converge on d accounting for the β-dependent correction factor (1-β⁴) in the orifice equation.</p>
              </CardContent></Card>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}

              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                <Zap className="w-4 h-4 mr-2" /> Calculate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: RESULTS */}
        <TabsContent value="results">
          <div className="space-y-4">
            {!result && (
              <Card><CardContent className="py-12 text-center">
                <CircleDot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Configure inputs and click Calculate on the Sizing tab</p>
              </CardContent></Card>
            )}

            {result && (
              <>
                {result.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" data-testid="flags-banner">
                    {result.flags.map((f, i) => (
                      <Badge key={i}
                        variant={FLAG_SEVERITY[f] === "critical" ? "destructive" : FLAG_SEVERITY[f] === "warning" ? "secondary" : "outline"}
                        className="text-[10px]" data-testid={`flag-${f}`}>
                        {FLAG_LABELS[f]}
                      </Badge>
                    ))}
                  </div>
                )}

                <WarningPanel warnings={result.warnings} />

                <Card className="border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <h4 className="font-semibold text-sm">
                        {result.phase === "liquid" ? "Liquid" : "Gas"} RO —{" "}
                        {result.sizingMode === "sizeForFlow" ? "Size for Flow" : "ΔP Prediction"}
                      </h4>
                      <div className="flex items-center gap-2">
                        {result.phase === "gas" && (
                          <Badge variant={result.isChoked ? "destructive" : "secondary"} className="text-[10px]" data-testid="badge-regime">
                            {result.isChoked ? "CHOKED" : "SUBCRITICAL"}
                          </Badge>
                        )}
                        <Button size="sm" variant="outline" onClick={handleExport} data-testid="button-export">
                          <Download className="w-3.5 h-3.5 mr-1" /> JSON
                        </Button>
                      </div>
                    </div>

                    <div className="text-3xl font-mono font-bold text-primary mb-1" data-testid="text-result-dia">
                      {convertFromSI("diameter", result.requiredDiameter, unitSystem).toFixed(2)}{" "}
                      <span className="text-base text-muted-foreground font-normal">{pU("diameter")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Required orifice diameter</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      {[
                        { label: "Orifice Area", val: result.orificeArea.toFixed(2), unit: "mm²" },
                        { label: "β ratio", val: result.betaRatio.toFixed(4), unit: "—" },
                        { label: "ΔP", val: convertFromSI("pressure", result.pressureDrop, unitSystem).toFixed(3), unit: pU("pressure") },
                        { label: "Orifice velocity", val: convertFromSI("velocity", result.orificeVelocity, unitSystem).toFixed(2), unit: pU("velocity") },
                        { label: "Pipe velocity", val: convertFromSI("velocity", result.pipeVelocity, unitSystem).toFixed(2), unit: pU("velocity") },
                        { label: "Flow coeff. K", val: result.flowCoefficient.toFixed(4), unit: "—" },
                        { label: "Mass flow", val: convertFromSI("flowMass", result.massFlow, unitSystem).toFixed(2), unit: pU("flowMass") },
                        ...(result.phase === "gas" ? [
                          { label: "P2/P1", val: result.pressureRatio.toFixed(6), unit: "—" },
                          { label: "x_crit", val: result.criticalPressureRatio.toFixed(6), unit: "—" },
                          { label: "ρ₁ upstream", val: result.upstreamDensity.toFixed(4), unit: "kg/m³" },
                          { label: "R_specific", val: result.rSpecific.toFixed(3), unit: "J/(kg·K)" },
                          ...(result.isChoked ? [{ label: "f(k)", val: result.criticalFlowFunction.toFixed(6), unit: "—" }]
                            : [{ label: "Y expansion", val: result.expansionFactor.toFixed(6), unit: "—" }]),
                        ] : []),
                        ...(result.phase === "liquid" && result.reynoldsNumber > 0 ? [
                          { label: "Reynolds #", val: result.reynoldsNumber.toFixed(0), unit: "—" },
                        ] : []),
                        ...(result.phase === "liquid" && result.sigma > 0 ? [
                          { label: "Cavitation σ", val: result.sigma.toFixed(4), unit: "—" },
                        ] : []),
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between py-1.5 border-b border-muted/20">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-mono">{item.val} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-sm font-semibold">Calculation Trace</h4>
                    <p className="text-[10px] text-muted-foreground">Step-by-step intermediate values</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" data-testid="table-calc-steps">
                        <thead><tr className="border-b">
                          <th className="text-left py-1.5 pr-2">Parameter</th>
                          <th className="text-left py-1.5 px-2">Equation</th>
                          <th className="text-right py-1.5 px-2">Value</th>
                          <th className="text-right py-1.5 pl-2">Unit</th>
                        </tr></thead>
                        <tbody>
                          {result.calcSteps.map((s, i) => (
                            <tr key={i} className="border-b border-muted/20">
                              <td className="py-1.5 pr-2 text-muted-foreground">{s.label}</td>
                              <td className="py-1.5 px-2 font-mono text-[10px]">{s.equation}</td>
                              <td className="text-right py-1.5 px-2 font-mono">{s.value}</td>
                              <td className="text-right py-1.5 pl-2 text-muted-foreground">{s.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {result.solverInfo && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">Solver Convergence</h4>
                        {result.solverInfo.converged ?
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> :
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        }
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Method</span>
                          <span className="font-mono">{result.solverInfo.method}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Iterations</span>
                          <span className="font-mono">{result.solverInfo.iterations}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Final error</span>
                          <span className="font-mono">{result.solverInfo.finalError.toExponential(3)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Tolerance</span>
                          <span className="font-mono">{result.solverInfo.tolerance.toExponential(1)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Converged</span>
                          <span className="font-mono">{result.solverInfo.converged ? "YES" : "NO"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Bracket</span>
                          <span className="font-mono">[{result.solverInfo.bracketLow.toFixed(3)}, {result.solverInfo.bracketHigh.toFixed(3)}] mm</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <AssumptionsPanel
                  assumptions={[
                    `${result.phase === "liquid" ? "Incompressible" : "Compressible"} flow through sharp-edged restriction orifice`,
                    result.phase === "liquid"
                      ? "W = Cd·A·√(2·ρ·ΔP / (1-β⁴)) — orifice mass flow equation with β correction"
                      : result.isChoked
                        ? "W = Cd·A·P1·f(k)·√(MW/(Z·Ru·T)) / √(1-β⁴) — critical (choked) flow"
                        : "W = Cd·A·Y·√(2·ρ₁·ΔP) / √(1-β⁴) — subcritical compressible flow",
                    `Discharge coefficient Cd = ${service.orifice.cdValue} (${service.orifice.cdMode === "user" ? "user-defined" : "estimated"})`,
                    `Basis: ${service.orifice.basisMode === "inPipe" ? "In-pipe with β⁴ correction" : "Free discharge (no β correction)"}`,
                    result.phase === "gas" ? `Expansion factor Y per ISA approximation: Y = 1 - (0.41+0.35β⁴)·(1-r)/k` : "No compressibility correction for liquid",
                    "Solver: bisection root-finding for orifice diameter",
                  ]}
                  references={[
                    "ISO 5167: Measurement of fluid flow by means of pressure differential devices",
                    "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
                    "API 520 Part I: Sizing of pressure-relieving devices (critical flow reference)",
                    "Miller, R.W. Flow Measurement Engineering Handbook, 3rd Edition",
                  ]}
                />
              </>
            )}
          </div>
        </TabsContent>

        {/* TAB 5: RECOMMENDATIONS */}
        <TabsContent value="recommendations">
          <div className="space-y-4">
            {!result && (
              <Card><CardContent className="py-12 text-center">
                <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Run calculation first to see recommendations</p>
              </CardContent></Card>
            )}

            {result && (
              <>
                {result.recommendations.length > 0 && (
                  <Card className="border-amber-800/30 bg-amber-950/20">
                    <CardHeader className="pb-2">
                      <h4 className="text-sm font-semibold text-amber-200">Engineering Recommendations</h4>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {result.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-amber-200/80">{r}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {result.recommendations.length === 0 && (
                  <Card className="border-green-800/30 bg-green-950/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      <p className="text-xs text-green-200/80">No critical recommendations. Results are within normal engineering limits.</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2"><h4 className="text-sm font-semibold">Next Steps Checklist</h4></CardHeader>
                  <CardContent className="pt-0 space-y-2 text-xs text-muted-foreground">
                    {[
                      "Confirm fluid properties against NIST/GPSA/vendor data at actual conditions",
                      "Verify pipe schedule and ID against isometric drawings",
                      "Evaluate noise levels — especially for gas service at high ΔP",
                      "Check orifice plate mechanical design (thickness, material, gasket compatibility)",
                      "Review downstream piping for erosion and vibration",
                      result.phase === "liquid" && service.liquidProps.vaporPressure <= 0 ? "Provide vapor pressure Pv for cavitation screening" : null,
                      result.isChoked ? "Acoustic analysis recommended for choked flow conditions" : null,
                      "Confirm with vendor for final orifice bore tolerance and Cd",
                      "Cross-check with detailed hydraulics model (PipeSim, Aspen Hydraulics, etc.)",
                    ].filter(Boolean).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 py-0.5">
                        <div className="w-4 h-4 rounded border border-muted-foreground/30 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><h4 className="text-sm font-semibold">Summary</h4></CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Phase</span>
                      <span className="font-mono">{result.phase === "liquid" ? "Liquid" : "Gas/Vapor"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-mono">{result.sizingMode === "sizeForFlow" ? "Size for Flow" : "ΔP Prediction"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Orifice d</span>
                      <span className="font-mono">{convertFromSI("diameter", result.requiredDiameter, unitSystem).toFixed(2)} {pU("diameter")}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">β</span>
                      <span className="font-mono">{result.betaRatio.toFixed(4)}</span>
                    </div>
                    {result.phase === "gas" && (
                      <div className="flex justify-between py-1 border-b border-muted/20">
                        <span className="text-muted-foreground">Regime</span>
                        <span className="font-mono">{result.isChoked ? "CHOKED (sonic)" : "Subcritical"}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Flags</span>
                      <span className="font-mono">{result.flags.length > 0 ? result.flags.map(f => FLAG_LABELS[f]).join(", ") : "None"}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <FeedbackSection calculatorName="Restriction Orifice" />
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
