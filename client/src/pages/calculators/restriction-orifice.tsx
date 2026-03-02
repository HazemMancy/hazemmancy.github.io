import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
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
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { exportToExcel, exportToPDF, exportToJSON } from "@/lib/engineering/exportUtils";
import {
  CircleDot, FlaskConical, RotateCcw, ChevronLeft, ChevronRight,
  ClipboardList, Droplets, Settings2, BarChart3, ShieldCheck,
  AlertTriangle, CheckCircle2, Zap, Download, FileText, FileSpreadsheet,
  Volume2, Layers,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    if (ns === unitSystem) return;
    const prev = unitSystem;
    setService(s => {
      const n = { ...s, liquidProps: { ...s.liquidProps }, gasProps: { ...s.gasProps } };
      const c = (param: string, val: number) => {
        if (prev === "SI") return convertFromSI(param, val, ns);
        return convertFromSI(param, convertToSI(param, val, prev), ns);
      };
      if (n.volFlowRate) n.volFlowRate = c("flowLiquid", n.volFlowRate);
      if (n.massFlowRate) n.massFlowRate = c("flowMass", n.massFlowRate);
      if (n.upstreamPressure) n.upstreamPressure = c("pressureAbs", n.upstreamPressure);
      if (n.downstreamPressure) n.downstreamPressure = c("pressureAbs", n.downstreamPressure);
      if (n.temperature) n.temperature = c("temperature", n.temperature);
      if (n.pipeDiameter) n.pipeDiameter = c("diameter", n.pipeDiameter);
      if (n.orificeDiameter) n.orificeDiameter = c("diameter", n.orificeDiameter);
      if (n.liquidProps.vaporPressure) n.liquidProps.vaporPressure = c("pressureAbs", n.liquidProps.vaporPressure);
      return n;
    });
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


  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  const pU = (param: string) => getUnit(param, unitSystem);

  const buildExportData = (): ExportDatasheet | undefined => {
    if (!result) return undefined;
    const inputs = [
      { label: "Phase", value: service.phase === "liquid" ? "Liquid" : "Gas / Vapor" },
      { label: "Sizing Mode", value: service.sizingMode === "sizeForFlow" ? "Size for Flow" : service.sizingMode === "checkOrifice" ? "Check Orifice" : "Predict ΔP" },
      ...(service.phase === "liquid" ? [
        { label: "Flow Basis", value: service.flowBasis === "volume" ? "Volumetric" : "Mass" },
        ...(service.flowBasis === "volume"
          ? [{ label: "Vol Flow Rate", value: service.volFlowRate, unit: pU("flowLiquid") }]
          : [{ label: "Mass Flow Rate", value: service.massFlowRate, unit: pU("flowMass") }]),
        { label: "Density", value: service.liquidProps.density, unit: "kg/m³" },
        { label: "Viscosity", value: service.liquidProps.viscosity, unit: "cP" },
        ...(service.liquidProps.vaporPressure > 0 ? [{ label: "Vapor Pressure", value: service.liquidProps.vaporPressure, unit: pU("pressureAbs") }] : []),
      ] : [
        { label: "Mass Flow Rate", value: service.massFlowRate, unit: pU("flowMass") },
        { label: "Temperature", value: service.temperature, unit: pU("temperature") },
        { label: "Molecular Weight", value: service.gasProps.molecularWeight, unit: "kg/kmol" },
        { label: "Cp/Cv (k)", value: service.gasProps.specificHeatRatio, unit: "" },
        { label: "Z-factor", value: service.gasProps.compressibilityFactor, unit: "" },
        { label: "Viscosity", value: service.gasProps.viscosity, unit: "cP" },
      ]),
      { label: "P1 Upstream", value: service.upstreamPressure, unit: pU("pressureAbs") },
      { label: "P2 Downstream", value: service.downstreamPressure, unit: pU("pressureAbs") },
      { label: "Pipe ID", value: service.pipeDiameter, unit: pU("diameter") },
      { label: "Cd Value", value: result.cdEffective, unit: "" },
      { label: "Cd Mode", value: service.orifice.cdMode === "user" ? "User-Defined" : "Estimated (RHG)" },
      { label: "Edge Type", value: service.orifice.edgeType === "sharp" ? "Sharp-edged" : "Rounded" },
      { label: "Basis Mode", value: service.orifice.basisMode === "inPipe" ? "In-pipe with β correction" : "Free discharge" },
      ...(service.numStages > 1 ? [{ label: "Number of Stages", value: service.numStages, unit: "" }] : []),
    ];

    const results = [
      { label: "Orifice Diameter", value: convertFromSI("diameter", result.requiredDiameter, unitSystem), unit: pU("diameter"), highlight: true },
      { label: "Standard Bore", value: convertFromSI("diameter", result.standardBore, unitSystem), unit: pU("diameter") },
      { label: "Orifice Area", value: result.orificeArea, unit: "mm²" },
      { label: "β Ratio", value: result.betaRatio, unit: "" },
      { label: "Total ΔP", value: convertFromSI("pressure", result.pressureDrop, unitSystem), unit: pU("pressure") },
      { label: "Permanent ΔP", value: convertFromSI("pressure", result.permanentPressureLoss, unitSystem), unit: pU("pressure") },
      { label: "Recovery Factor", value: result.recoveryFactor, unit: "" },
      { label: "Orifice Velocity", value: convertFromSI("velocity", result.orificeVelocity, unitSystem), unit: pU("velocity") },
      { label: "Pipe Velocity", value: convertFromSI("velocity", result.pipeVelocity, unitSystem), unit: pU("velocity") },
      { label: "Flow Coefficient K", value: result.flowCoefficient, unit: "" },
      { label: "Mass Flow", value: convertFromSI("flowMass", result.massFlow, unitSystem), unit: pU("flowMass") },
      ...(result.phase === "gas" ? [
        { label: "P2/P1", value: result.pressureRatio, unit: "" },
        { label: "Critical Pressure Ratio", value: result.criticalPressureRatio, unit: "" },
        { label: "Flow Regime", value: result.isChoked ? "CHOKED" : "Subcritical", unit: "" },
        { label: "Upstream Density", value: result.upstreamDensity, unit: "kg/m³" },
        { label: "Mach Number", value: result.machNumber, unit: "" },
        ...(result.isChoked
          ? [{ label: "f(k) Critical Flow Function", value: result.criticalFlowFunction, unit: "" }]
          : [{ label: "Y Expansion Factor", value: result.expansionFactor, unit: "" }]),
        ...(result.noiseLevelEstimate > 0 ? [{ label: "Noise Level (est.)", value: result.noiseLevelEstimate, unit: "dB(A)" }] : []),
      ] : []),
      ...(result.reynoldsNumber > 0 ? [{ label: "Reynolds (orifice)", value: result.reynoldsNumber, unit: "" }] : []),
      ...(result.reynoldsNumberPipe > 0 ? [{ label: "Reynolds (pipe)", value: result.reynoldsNumberPipe, unit: "" }] : []),
      ...(result.phase === "liquid" && result.sigma > 0 ? [{ label: "Cavitation Index σ", value: result.sigma, unit: "" }] : []),
    ];

    const calcSteps = result.calcSteps.map(s => ({
      label: s.label, equation: s.equation, value: s.value, unit: s.unit,
    }));

    const additionalSections: ExportDatasheet["additionalSections"] = [];
    if (result.solverInfo) {
      additionalSections.push({
        title: "Solver Convergence",
        items: [
          { label: "Method", value: result.solverInfo.method },
          { label: "Iterations", value: result.solverInfo.iterations },
          { label: "Final Error", value: result.solverInfo.finalError },
          { label: "Tolerance", value: result.solverInfo.tolerance },
          { label: "Converged", value: result.solverInfo.converged ? "YES" : "NO" },
          { label: "Bracket Low", value: result.solverInfo.bracketLow, unit: "mm" },
          { label: "Bracket High", value: result.solverInfo.bracketHigh, unit: "mm" },
        ],
      });
    }
    if (result.stages.length > 0) {
      additionalSections.push({
        title: "Multi-Stage Breakdown",
        items: result.stages.flatMap(s => [
          { label: `Stage ${s.stageNumber} P₁`, value: s.upstreamPressure, unit: "bar(a)" },
          { label: `Stage ${s.stageNumber} P₂`, value: s.downstreamPressure, unit: "bar(a)" },
          { label: `Stage ${s.stageNumber} ΔP`, value: s.pressureDrop, unit: "bar" },
          { label: `Stage ${s.stageNumber} d`, value: s.orificeDiameter, unit: "mm" },
          { label: `Stage ${s.stageNumber} β`, value: s.betaRatio, unit: "" },
        ]),
      });
    }

    return {
      calculatorName: "Restriction Orifice Sizing",
      projectInfo: [
        { label: "Case Name", value: project.name },
        { label: "Case ID", value: project.caseId },
        { label: "Engineer", value: project.engineer },
        { label: "Date", value: project.date },
        { label: "Unit System", value: unitSystem },
      ],
      inputs,
      results,
      calcSteps,
      additionalSections,
      methodology: [
        result.phase === "liquid"
          ? "Incompressible flow through sharp-edged restriction orifice"
          : "Compressible flow through sharp-edged restriction orifice",
        result.phase === "liquid"
          ? "W = Cd·A·√(2·ρ·ΔP / (1-β⁴)) — orifice mass flow equation with β⁴ velocity-of-approach correction"
          : result.isChoked
            ? "W = Cd·A·P₁·f(k)·√(MW/(Z·Ru·T)) / √(1-β⁴) — critical (choked) flow"
            : "W = Cd·A·Y·√(2·ρ₁·ΔP) / √(1-β⁴) — subcritical compressible flow with ISA expansion factor",
        "Permanent pressure loss: α = √(1-β⁴) - β² (ISO 5167)",
        "Solver: bisection root-finding with bracket refinement",
      ],
      assumptions: [
        `Discharge coefficient Cd = ${result.cdEffective.toFixed(4)} (${service.orifice.cdMode === "user" ? "user-defined" : "estimated via Reader-Harris/Gallagher"})`,
        `Basis: ${service.orifice.basisMode === "inPipe" ? "In-pipe with β⁴ velocity-of-approach correction" : "Free discharge (no β correction)"}`,
        result.phase === "gas" ? "Expansion factor Y per ISA/ISO 5167 approximation: Y = 1 - (0.41+0.35β⁴)·(1-r)/k" : "Incompressible (no expansion factor)",
        "Permanent pressure loss per ISO 5167 orifice plate formula",
      ],
      references: [
        "ISO 5167: Measurement of fluid flow by means of pressure differential devices",
        "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
        "API 520 Part I: Sizing of pressure-relieving devices (critical flow reference)",
        "Miller, R.W. Flow Measurement Engineering Handbook, 3rd Edition",
        "Reader-Harris, M.J. Orifice Plates and Venturi Tubes (Springer)",
      ],
      warnings: [
        ...result.warnings,
        ...result.flags.map(f => FLAG_LABELS[f]),
        ...result.recommendations,
      ].filter(Boolean),
    };
  };

  const needsOrificeDia = service.sizingMode === "checkOrifice" || service.sizingMode === "predictDP";
  const needsFlow = service.sizingMode === "sizeForFlow" || service.sizingMode === "predictDP";
  const needsPressures = service.sizingMode === "sizeForFlow" || service.sizingMode === "checkOrifice";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">Restriction Orifice Sizing</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Liquid & gas with choked-flow, permanent ΔP, Mach & noise screening</p>
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
                    <NumericInput className="h-8 text-xs" value={project.maxIterations} onValueChange={v => updateProject("maxIterations", Math.round(v) || 50)} data-testid="input-max-iter" /></div>
                  <div><Label className="text-[10px] mb-1 block">Tolerance</Label>
                    <NumericInput className="h-8 text-xs" value={project.tolerance} step="0.000001" onValueChange={v => updateProject("tolerance", v || 1e-6)} data-testid="input-tolerance" /></div>
                </div>
              </CardContent></Card>
              <Card className="bg-muted/30"><CardContent className="p-3 text-[10px] text-muted-foreground">
                Basis: Generic RO sizing (engineering approximation). Equations reference ISO 5167 / Crane TP-410 methodology. Not certified for metering-grade compliance.
              </CardContent></Card>
            </CardContent>
          </Card>
        </TabsContent>

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
                    {needsFlow && (
                      <>
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
                            <NumericInput value={service.volFlowRate} onValueChange={v => updateService("volFlowRate", v)} data-testid="input-vol-flow" /></div>
                        ) : (
                          <div><Label className="text-xs mb-1.5 block">Mass Flow ({pU("flowMass")})</Label>
                            <NumericInput value={service.massFlowRate} onValueChange={v => updateService("massFlowRate", v)} data-testid="input-mass-flow" /></div>
                        )}
                      </>
                    )}
                    {needsPressures && (
                      <>
                        <div><Label className="text-xs mb-1.5 block">P1 Upstream ({pU("pressureAbs")})</Label>
                          <NumericInput value={service.upstreamPressure} onValueChange={v => updateService("upstreamPressure", v)} data-testid="input-p1" /></div>
                        <div><Label className="text-xs mb-1.5 block">P2 Downstream ({pU("pressureAbs")})</Label>
                          <NumericInput value={service.downstreamPressure} onValueChange={v => updateService("downstreamPressure", v)} data-testid="input-p2" /></div>
                      </>
                    )}
                    {service.sizingMode === "predictDP" && (
                      <div><Label className="text-xs mb-1.5 block">P1 Upstream ({pU("pressureAbs")})</Label>
                        <NumericInput value={service.upstreamPressure} onValueChange={v => updateService("upstreamPressure", v)} data-testid="input-p1" /></div>
                    )}
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground">Liquid Properties</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Liquid Selection</Label>
                      <Select onValueChange={handleLiquidSelect}>
                        <SelectTrigger data-testid="select-liquid"><SelectValue placeholder="Select liquid..." /></SelectTrigger>
                        <SelectContent>{Object.keys(COMMON_LIQUIDS).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><Label className="text-xs mb-1.5 block">Density (kg/m³)</Label>
                      <NumericInput value={service.liquidProps.density} onValueChange={v => updateLiquidProps("density", v)} data-testid="input-density" /></div>
                    <div><Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                      <NumericInput value={service.liquidProps.viscosity} onValueChange={v => updateLiquidProps("viscosity", v)} data-testid="input-viscosity" /></div>
                    <div><Label className="text-xs mb-1.5 block">Vapor Pressure ({pU("pressureAbs")})</Label>
                      <NumericInput value={service.liquidProps.vaporPressure} onValueChange={v => updateLiquidProps("vaporPressure", v)} placeholder="Optional — for cavitation check" data-testid="input-vapor-pressure" /></div>
                  </div>
                </div>
              )}

              {service.phase === "gas" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground">Flow & Pressures</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {needsFlow && (
                      <div><Label className="text-xs mb-1.5 block">Mass Flow ({pU("flowMass")})</Label>
                        <NumericInput value={service.massFlowRate} onValueChange={v => updateService("massFlowRate", v)} data-testid="input-mass-flow" /></div>
                    )}
                    {needsPressures && (
                      <>
                        <div><Label className="text-xs mb-1.5 block">P1 Upstream ({pU("pressureAbs")})</Label>
                          <NumericInput value={service.upstreamPressure} onValueChange={v => updateService("upstreamPressure", v)} data-testid="input-p1" /></div>
                        <div><Label className="text-xs mb-1.5 block">P2 Downstream ({pU("pressureAbs")})</Label>
                          <NumericInput value={service.downstreamPressure} onValueChange={v => updateService("downstreamPressure", v)} data-testid="input-p2" /></div>
                      </>
                    )}
                    {service.sizingMode === "predictDP" && (
                      <div><Label className="text-xs mb-1.5 block">P1 Upstream ({pU("pressureAbs")})</Label>
                        <NumericInput value={service.upstreamPressure} onValueChange={v => updateService("upstreamPressure", v)} data-testid="input-p1" /></div>
                    )}
                    <div><Label className="text-xs mb-1.5 block">Temperature ({pU("temperature")})</Label>
                      <NumericInput value={service.temperature} onValueChange={v => updateService("temperature", v)} data-testid="input-temp" /></div>
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground">Gas Properties</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Gas Selection</Label>
                      <Select onValueChange={handleGasSelect}>
                        <SelectTrigger data-testid="select-gas"><SelectValue placeholder="Select gas..." /></SelectTrigger>
                        <SelectContent>{Object.keys(COMMON_GASES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><Label className="text-xs mb-1.5 block">MW (kg/kmol)</Label>
                      <NumericInput value={service.gasProps.molecularWeight} onValueChange={v => updateGasProps("molecularWeight", v)} data-testid="input-mw" /></div>
                    <div><Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
                      <NumericInput value={service.gasProps.specificHeatRatio} onValueChange={v => updateGasProps("specificHeatRatio", v)} data-testid="input-k" /></div>
                    <div><Label className="text-xs mb-1.5 block">Z-factor</Label>
                      <NumericInput value={service.gasProps.compressibilityFactor} onValueChange={v => updateGasProps("compressibilityFactor", v)} data-testid="input-z" /></div>
                    <div><Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                      <NumericInput value={service.gasProps.viscosity} step="0.001" onValueChange={v => updateGasProps("viscosity", v)} data-testid="input-gas-viscosity" /></div>
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
                  <NumericInput value={service.pipeDiameter} onValueChange={v => updateService("pipeDiameter", v)} data-testid="input-pipe-dia" /></div>
                <div><Label className="text-xs mb-1.5 block">Cd Mode</Label>
                  <Select value={service.orifice.cdMode} onValueChange={v => updateOrifice("cdMode", v as CdMode)}>
                    <SelectTrigger data-testid="select-cd-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User-Defined Cd</SelectItem>
                      <SelectItem value="estimated">Estimated Cd (Reader-Harris/Gallagher)</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Cd Value</Label>
                  <NumericInput value={service.orifice.cdValue} step="0.01" onValueChange={v => updateOrifice("cdValue", v)} data-testid="input-cd" /></div>
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
                  <NumericInput value={service.orifice.thickness} onValueChange={v => updateOrifice("thickness", v)} placeholder="Informational" data-testid="input-thickness" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                      <SelectItem value="checkOrifice">Check existing orifice (given d, P₁, P₂ → W)</SelectItem>
                      <SelectItem value="predictDP">Predict ΔP (given d, W → solve ΔP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {needsOrificeDia && (
                  <div><Label className="text-xs mb-1.5 block">Orifice Diameter ({pU("diameter")})</Label>
                    <NumericInput value={service.orificeDiameter} onValueChange={v => updateService("orificeDiameter", v)} data-testid="input-orifice-dia" /></div>
                )}
              </div>

              <Card className="bg-muted/30"><CardContent className="p-3">
                <h4 className="text-xs font-semibold mb-2">Constraints & Limits</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div><Label className="text-[10px] mb-1 block">β min (warning threshold)</Label>
                    <NumericInput className="h-8 text-xs" value={service.betaMin} step="0.05" onValueChange={v => updateService("betaMin", v || 0.2)} data-testid="input-beta-min" /></div>
                  <div><Label className="text-[10px] mb-1 block">β max (warning threshold)</Label>
                    <NumericInput className="h-8 text-xs" value={service.betaMax} step="0.05" onValueChange={v => updateService("betaMax", v || 0.75)} data-testid="input-beta-max" /></div>
                  <div><Label className="text-[10px] mb-1 block">Number of Stages</Label>
                    <NumericInput className="h-8 text-xs" value={service.numStages} min={1} max={10} onValueChange={v => updateService("numStages", Math.max(1, Math.min(10, Math.round(v) || 1)))} data-testid="input-num-stages" /></div>
                </div>
              </CardContent></Card>

              <Card className="bg-muted/30"><CardContent className="p-3 text-[10px] text-muted-foreground space-y-1">
                <p><strong>Size for flow:</strong> Given Q or W, P₁, P₂ → solver finds required orifice diameter d (bisection method).</p>
                <p><strong>Check orifice:</strong> Given d, P₁, P₂ → computes achievable flow W and resulting conditions.</p>
                <p><strong>Predict ΔP:</strong> Given d, W, P₁ → solver finds required ΔP (and P₂) for the specified flow through the orifice.</p>
                <p>Permanent pressure loss computed per ISO 5167: α = √(1-β⁴) - β². Multi-stage equally divides total ΔP across N stages.</p>
              </CardContent></Card>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}

              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                <Zap className="w-4 h-4 mr-2" /> Calculate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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
                        {result.sizingMode === "sizeForFlow" ? "Size for Flow" : result.sizingMode === "checkOrifice" ? "Check Orifice" : "Predict ΔP"}
                      </h4>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" data-testid="button-export-results">
                              <Download className="w-3.5 h-3.5 mr-1.5" />Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToPDF(d); }} data-testid="button-export-pdf">
                              <FileText className="w-4 h-4 mr-2 text-red-400" />Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToExcel(d); }} data-testid="button-export-excel">
                              <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />Export as Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToJSON(d); }} data-testid="button-export-json">
                              <Download className="w-4 h-4 mr-2 text-blue-400" />Export as JSON
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {result.phase === "gas" && (
                          <Badge variant={result.isChoked ? "destructive" : "secondary"} className="text-[10px]" data-testid="badge-regime">
                            {result.isChoked ? "CHOKED" : "SUBCRITICAL"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <div className="text-3xl font-mono font-bold text-primary" data-testid="text-result-dia">
                          {convertFromSI("diameter", result.requiredDiameter, unitSystem).toFixed(2)}
                          <span className="text-base text-muted-foreground font-normal ml-1">{pU("diameter")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Required orifice diameter</p>
                      </div>
                      <div>
                        <div className="text-xl font-mono font-semibold text-muted-foreground" data-testid="text-std-bore">
                          {convertFromSI("diameter", result.standardBore, unitSystem).toFixed(2)}
                          <span className="text-sm font-normal ml-1">{pU("diameter")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Standard bore (rounded up)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0 text-xs">
                      {[
                        { label: "Orifice Area", val: result.orificeArea.toFixed(2), unit: "mm²" },
                        { label: "β ratio", val: result.betaRatio.toFixed(4), unit: "—" },
                        { label: "Total ΔP", val: convertFromSI("pressure", result.pressureDrop, unitSystem).toFixed(3), unit: pU("pressure") },
                        { label: "Permanent ΔP", val: convertFromSI("pressure", result.permanentPressureLoss, unitSystem).toFixed(3), unit: pU("pressure") },
                        { label: "Recovery", val: (result.recoveryFactor * 100).toFixed(1) + "%", unit: "" },
                        { label: "Orifice velocity", val: convertFromSI("velocity", result.orificeVelocity, unitSystem).toFixed(2), unit: pU("velocity") },
                        { label: "Pipe velocity", val: convertFromSI("velocity", result.pipeVelocity, unitSystem).toFixed(2), unit: pU("velocity") },
                        { label: "Flow coeff. K", val: result.flowCoefficient.toFixed(4), unit: "—" },
                        { label: "Cd effective", val: result.cdEffective.toFixed(4), unit: "—" },
                        { label: "Mass flow", val: convertFromSI("flowMass", result.massFlow, unitSystem).toFixed(2), unit: pU("flowMass") },
                        ...(result.phase === "gas" ? [
                          { label: "P₂/P₁", val: result.pressureRatio.toFixed(6), unit: "—" },
                          { label: "r_crit", val: result.criticalPressureRatio.toFixed(6), unit: "—" },
                          { label: "ρ₁ upstream", val: result.upstreamDensity.toFixed(4), unit: "kg/m³" },
                          { label: "Mach", val: result.machNumber.toFixed(4), unit: "—" },
                          { label: "R_specific", val: result.rSpecific.toFixed(3), unit: "J/(kg·K)" },
                          ...(result.isChoked ? [{ label: "f(k)", val: result.criticalFlowFunction.toFixed(6), unit: "—" }]
                            : [{ label: "Y expansion", val: result.expansionFactor.toFixed(6), unit: "—" }]),
                        ] : []),
                        ...(result.reynoldsNumber > 0 ? [
                          { label: "Re (orifice)", val: result.reynoldsNumber.toFixed(0), unit: "—" },
                        ] : []),
                        ...(result.reynoldsNumberPipe > 0 ? [
                          { label: "Re (pipe)", val: result.reynoldsNumberPipe.toFixed(0), unit: "—" },
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

                {result.phase === "gas" && result.noiseLevelEstimate > 0 && (
                  <Card className={result.noiseLevelEstimate > 85 ? "border-amber-800/30 bg-amber-950/10" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Volume2 className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-semibold">Noise Level Estimate</h4>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-mono font-bold" data-testid="text-noise-level">
                          {result.noiseLevelEstimate.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground mb-0.5">dB(A) at 1m</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {result.noiseLevelEstimate > 85
                          ? "Exceeds 85 dB(A) occupational limit — detailed acoustic analysis per IEC 60534-8-3 is recommended"
                          : "Within acceptable range — verify with vendor acoustic prediction for final design"}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {result.stages.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold">Multi-Stage Breakdown ({result.stages.length} stages)</h4>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" data-testid="table-stages">
                          <thead><tr className="border-b">
                            <th className="text-left py-1.5 pr-2">Stage</th>
                            <th className="text-right py-1.5 px-2">P₁ (bar)</th>
                            <th className="text-right py-1.5 px-2">P₂ (bar)</th>
                            <th className="text-right py-1.5 px-2">ΔP (bar)</th>
                            <th className="text-right py-1.5 px-2">d (mm)</th>
                            <th className="text-right py-1.5 px-2">β</th>
                            <th className="text-right py-1.5 pl-2">v_o (m/s)</th>
                          </tr></thead>
                          <tbody>
                            {result.stages.map((s, i) => (
                              <tr key={i} className="border-b border-muted/20">
                                <td className="py-1.5 pr-2 font-mono">{s.stageNumber}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.upstreamPressure.toFixed(2)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.downstreamPressure.toFixed(2)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.pressureDrop.toFixed(3)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.orificeDiameter.toFixed(2)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.betaRatio.toFixed(4)}</td>
                                <td className="text-right py-1.5 pl-2 font-mono">{s.orificeVelocity.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-sm font-semibold">Calculation Trace</h4>
                    <p className="text-[10px] text-muted-foreground">Step-by-step intermediate values with equation IDs</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" data-testid="table-calc-steps">
                        <thead><tr className="border-b">
                          <th className="text-left py-1.5 pr-1 w-16">Eq. ID</th>
                          <th className="text-left py-1.5 px-2">Parameter</th>
                          <th className="text-left py-1.5 px-2">Equation</th>
                          <th className="text-right py-1.5 px-2">Value</th>
                          <th className="text-right py-1.5 pl-2">Unit</th>
                        </tr></thead>
                        <tbody>
                          {result.calcSteps.map((s, i) => (
                            <tr key={i} className="border-b border-muted/20">
                              <td className="py-1.5 pr-1 font-mono text-[9px] text-primary/60">{s.eqId || "—"}</td>
                              <td className="py-1.5 px-2 text-muted-foreground">{s.label}</td>
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
                    `${result.phase === "liquid" ? "Incompressible" : "Compressible"} flow through ${service.orifice.edgeType}-edged restriction orifice`,
                    result.phase === "liquid"
                      ? "W = Cd·A·√(2·ρ·ΔP / (1-β⁴)) — orifice mass flow with velocity-of-approach correction"
                      : result.isChoked
                        ? "W = Cd·A·P₁·f(k)·√(MW/(Z·Ru·T)) / √(1-β⁴) — critical (choked) flow"
                        : "W = Cd·A·Y·√(2·ρ₁·ΔP) / √(1-β⁴) — subcritical compressible flow",
                    `Discharge coefficient Cd = ${result.cdEffective.toFixed(4)} (${service.orifice.cdMode === "user" ? "user-defined" : "estimated via Reader-Harris/Gallagher correlation"})`,
                    `Basis: ${service.orifice.basisMode === "inPipe" ? "In-pipe with β⁴ velocity-of-approach correction" : "Free discharge (no β correction)"}`,
                    result.phase === "gas" ? "Expansion factor Y per ISA/ISO 5167: Y = 1 - (0.41+0.35β⁴)·(1-r)/k" : "Incompressible — no expansion factor applied",
                    "Permanent pressure loss: α = √(1-β⁴) - β² (ISO 5167, Table A.1)",
                    `Standard bore rounded to nearest ${result.requiredDiameter <= 10 ? "0.25" : result.requiredDiameter <= 50 ? "0.5" : "1.0"} mm increment`,
                    "Solver: bisection root-finding with 40-step bracket refinement fallback",
                  ]}
                  references={[
                    "ISO 5167-1/2: Measurement of fluid flow — pressure differential devices (orifice plates)",
                    "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
                    "API 520 Part I: Sizing of pressure-relieving devices (critical flow functions)",
                    "Miller, R.W. Flow Measurement Engineering Handbook, 3rd Edition",
                    "Reader-Harris, M.J. Orifice Plates and Venturi Tubes (Springer, 2015)",
                    "IEC 60534-8-3: Noise considerations (for gas noise estimates)",
                  ]}
                />
              </>
            )}
          </div>
        </TabsContent>

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
                      result.numStages > 1 ? "Verify inter-stage pipe spacing is sufficient for flow recovery" : null,
                      "Confirm with vendor for final orifice bore tolerance and Cd",
                      "Cross-check with detailed hydraulics model (PipeSim, Aspen Hydraulics, etc.)",
                      result.standardBore > result.requiredDiameter ? `Standard bore ${result.standardBore.toFixed(2)} mm is larger than required ${result.requiredDiameter.toFixed(2)} mm — verify margin is acceptable` : null,
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
                      <span className="font-mono">{result.sizingMode === "sizeForFlow" ? "Size for Flow" : result.sizingMode === "checkOrifice" ? "Check Orifice" : "Predict ΔP"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Orifice d</span>
                      <span className="font-mono">{convertFromSI("diameter", result.requiredDiameter, unitSystem).toFixed(2)} {pU("diameter")}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Standard bore</span>
                      <span className="font-mono">{convertFromSI("diameter", result.standardBore, unitSystem).toFixed(2)} {pU("diameter")}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">β</span>
                      <span className="font-mono">{result.betaRatio.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Total ΔP</span>
                      <span className="font-mono">{convertFromSI("pressure", result.pressureDrop, unitSystem).toFixed(3)} {pU("pressure")}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Permanent ΔP</span>
                      <span className="font-mono">{convertFromSI("pressure", result.permanentPressureLoss, unitSystem).toFixed(3)} {pU("pressure")}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Mass flow</span>
                      <span className="font-mono">{convertFromSI("flowMass", result.massFlow, unitSystem).toFixed(2)} {pU("flowMass")}</span>
                    </div>
                    {result.phase === "gas" && (
                      <>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Regime</span>
                          <span className="font-mono">{result.isChoked ? "CHOKED" : "SUBCRITICAL"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Mach</span>
                          <span className="font-mono">{result.machNumber.toFixed(4)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between py-1 border-b border-muted/20">
                      <span className="text-muted-foreground">Flags</span>
                      <span className="font-mono text-right">{result.flags.length === 0 ? "None" : result.flags.join(", ")}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between mt-4 md:mt-6">
        <Button variant="outline" size="sm" disabled={tabIdx === 0} onClick={goPrev} data-testid="button-prev">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">Step {tabIdx + 1} of {TABS.length}</span>
        <Button variant="outline" size="sm" disabled={tabIdx === TABS.length - 1} onClick={goNext} data-testid="button-next">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="mt-8">
        <FeedbackSection calculatorName="Restriction Orifice Sizing" />
      </div>
    </div>
  );
}
