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
  type GasPropsMode, type TappingType, type CompositionEntry,
  DEFAULT_PROJECT, DEFAULT_SERVICE,
  calculateRO,
  RO_LIQUID_SERVICE_TEST, RO_GAS_SERVICE_TEST,
  FLAG_LABELS, FLAG_SEVERITY,
} from "@/lib/engineering/restrictionOrifice";
import { COMPONENT_DB } from "@/lib/engineering/srkEos";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
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

  const addCompositionRow = () =>
    setService(p => ({ ...p, composition: [...(p.composition || []), { componentId: "CH4", moleFraction: 0 }] }));

  const removeCompositionRow = (idx: number) =>
    setService(p => ({ ...p, composition: (p.composition || []).filter((_, i) => i !== idx) }));

  const updateCompositionRow = (idx: number, field: keyof CompositionEntry, value: string | number) =>
    setService(p => ({
      ...p,
      composition: (p.composition || []).map((row, i) => i === idx ? { ...row, [field]: value } : row),
    }));

  const normalizeComposition = () => {
    setService(p => {
      const sum = (p.composition || []).reduce((s, r) => s + r.moleFraction, 0);
      if (sum <= 0) return p;
      return { ...p, composition: (p.composition || []).map(r => ({ ...r, moleFraction: r.moleFraction / sum })) };
    });
  };

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
        { label: "Gas Props Mode", value: service.gasPropsMode === "manual" ? "Manual" : service.gasPropsMode === "pr" ? "Peng-Robinson EoS (PR)" : "Soave-Redlich-Kwong EoS (SRK)" },
        ...(result.srkResult ? [
          { label: "Molecular Weight (EoS)", value: result.srkResult.MWm, unit: "kg/kmol" },
          { label: "Cp/Cv k (EoS)", value: result.srkResult.k, unit: "" },
          { label: "Z-factor (EoS)", value: result.srkResult.Z, unit: "" },
          { label: "Viscosity (Lee-EoS)", value: result.srkResult.viscosity_cP, unit: "cP" },
        ] : [
          { label: "Molecular Weight", value: service.gasProps.molecularWeight, unit: "kg/kmol" },
          { label: "Cp/Cv (k)", value: service.gasProps.specificHeatRatio, unit: "" },
          { label: "Z-factor", value: service.gasProps.compressibilityFactor, unit: "" },
          { label: "Viscosity", value: service.gasProps.viscosity, unit: "cP" },
        ]),
      ]),
      { label: "P1 Upstream", value: service.upstreamPressure, unit: pU("pressureAbs") },
      { label: "P2 Downstream", value: service.downstreamPressure, unit: pU("pressureAbs") },
      { label: "Pipe ID", value: service.pipeDiameter, unit: pU("diameter") },
      { label: "Tapping Type", value: service.orifice.tappingType === "corner" ? "Corner taps" : service.orifice.tappingType === "flange" ? "Flange taps (25.4 mm)" : "D–D/2 taps" },
      { label: "Cd Value (effective)", value: result.cdEffective, unit: "" },
      { label: "Cd Mode", value: service.orifice.cdMode === "user" ? "User-Defined" : "Estimated (ISO 5167-2 RHG)" },
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
      { label: "Perm ΔP Fraction (ISO 5167-2 Annex D)", value: result.permanentPressureLossFraction, unit: "" },
      { label: "Recovery Factor", value: result.recoveryFactor, unit: "" },
      { label: "Orifice Velocity", value: convertFromSI("velocity", result.orificeVelocity, unitSystem), unit: pU("velocity") },
      { label: "API 14E Erosional Velocity Ve", value: convertFromSI("velocity", result.erosionalVelocity, unitSystem), unit: pU("velocity") },
      { label: "v_o / Ve Ratio", value: result.erosionalVelocityRatio, unit: result.erosionalVelocityRatio > 1 ? "EXCEEDED" : "OK" },
      { label: "Pipe Velocity", value: convertFromSI("velocity", result.pipeVelocity, unitSystem), unit: pU("velocity") },
      { label: "Flow Coefficient K", value: result.flowCoefficient, unit: "" },
      { label: "Mass Flow", value: convertFromSI("flowMass", result.massFlow, unitSystem), unit: pU("flowMass") },
      ...(result.phase === "gas" ? [
        { label: "P2/P1", value: result.pressureRatio, unit: "" },
        { label: "Critical Pressure Ratio r_crit", value: result.criticalPressureRatio, unit: "" },
        { label: "Flow Regime", value: result.isChoked ? "CHOKED (SONIC)" : "Subcritical", unit: "" },
        { label: "Upstream Density ρ₁", value: result.upstreamDensity, unit: "kg/m³" },
        { label: "Mach Number at Orifice", value: result.machNumber, unit: "" },
        ...(result.isChoked
          ? [{ label: "C(k) Critical Flow Function", value: result.criticalFlowFunction, unit: "" }]
          : [{ label: "Y Expansion Factor (ISO 5167-2)", value: result.expansionFactor, unit: "" }]),
        ...(result.noiseLevelEstimate > 0 ? [{ label: "Noise SPL (screening)", value: result.noiseLevelEstimate, unit: "dB(A) at 1m" }] : []),
      ] : []),
      ...(result.reynoldsNumber > 0 ? [{ label: "Reynolds Re_d (orifice)", value: result.reynoldsNumber, unit: "" }] : []),
      ...(result.reynoldsNumberPipe > 0 ? [{ label: "Reynolds Re_D (pipe)", value: result.reynoldsNumberPipe, unit: "" }] : []),
      ...(result.phase === "liquid" && result.sigma < 999 ? [
        { label: "Cavitation Index σ = (P₁−Pv)/ΔP", value: result.sigma, unit: "" },
        { label: "σᵢ Incipient Threshold (ISA-RP75.23)", value: result.sigmaIncipient, unit: "" },
        { label: "Cavitation Status", value: result.sigma < 1.5 ? "SEVERE" : result.sigma < result.sigmaIncipient ? "INCIPIENT" : "NONE", unit: "" },
      ] : []),
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
        title: `Multi-Stage Breakdown (${service.stageDistribution === "geometric" ? "Geometric P₂/P₁ distribution" : "Equal ΔP distribution"})`,
        items: result.stages.flatMap(s => [
          { label: `Stage ${s.stageNumber} P₁`, value: s.upstreamPressure, unit: "bar(a)" },
          { label: `Stage ${s.stageNumber} P₂`, value: s.downstreamPressure, unit: "bar(a)" },
          { label: `Stage ${s.stageNumber} P₂/P₁`, value: s.pressureRatioDP ?? (s.downstreamPressure / s.upstreamPressure), unit: "" },
          { label: `Stage ${s.stageNumber} ΔP`, value: s.pressureDrop, unit: "bar" },
          { label: `Stage ${s.stageNumber} d`, value: s.orificeDiameter, unit: "mm" },
          { label: `Stage ${s.stageNumber} β`, value: s.betaRatio, unit: "" },
          ...(result.phase === "gas" ? [{ label: `Stage ${s.stageNumber} Regime`, value: s.isChoked ? "CHOKED" : "Subcritical", unit: "" }] : []),
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
          ? "Incompressible liquid flow through restriction orifice — ISO 5167-2:2003"
          : result.isChoked
            ? "Compressible gas flow — CHOKED (sonic) conditions — ISO 5167-2:2003"
            : "Compressible gas flow — subcritical conditions — ISO 5167-2:2003",
        result.phase === "liquid"
          ? "W = Cd · E · A · √(2·ρ·ΔP),  E = 1/√(1−β⁴) [ISO 5167-2 Eq.1, velocity-of-approach correction]"
          : result.isChoked
            ? "W = Cd · E · A · P₁ · C(k) · √(MW/(Z·Rᵤ·T)),  C(k) = √(k·(2/(k+1))^((k+1)/(k-1)))"
            : "W = Cd · E · A · Y · √(2·ρ₁·ΔP),  Y = 1−(0.351+0.256β⁴+0.93β⁸)·(1−r^(1/k)) [ISO 5167-2]",
        `Discharge coefficient: ISO 5167-2:2003 Reader-Harris/Gallagher (RHG) — ${service.orifice.tappingType === "corner" ? "corner taps (L₁=L′₂=0)" : service.orifice.tappingType === "D-D2" ? "D and D/2 taps (L₁=1, L′₂=0.47) — L1/L2 applied" : `flange taps (L₁=L′₂=25.4/D mm) — L1/L2 applied`}`,
        "Permanent pressure loss: ΔP_perm/ΔP = (√(1−β⁴Cd²) − Cd·β²) / (√(1−β⁴Cd²) + Cd·β²) [ISO 5167-2:2003 Annex D]",
        "Cavitation index: σ = (P₁−Pv)/ΔP vs σᵢ = 2.7 incipient, σch = 1.5 constant [ISA-RP75.23 / Tullis 1993]",
        "Erosional velocity: Ve = 122/√ρ [m/s] — API RP 14E, C = 100 continuous service",
        "Stage distribution: geometric (equal P₂/P₁ per stage) or equal ΔP per stage",
        "Solver: bisection root-finding (bracketed, deterministic, tol=1e-6)",
      ],
      assumptions: [
        `Cd = ${result.cdEffective.toFixed(4)} (${service.orifice.cdMode === "user" ? "user-defined — not corrected for Re or β by engine" : "ISO 5167-2 RHG — iterative convergence on Re and d"})`,
        `Basis: ${service.orifice.basisMode === "inPipe" ? "In-pipe flow — E = 1/√(1−β⁴) applied" : "Free discharge — no β correction (E = 1)"}`,
        `Plate edge: ${service.orifice.edgeType === "sharp" ? "Sharp-edged (Cd ≈ 0.61 turbulent)" : "Rounded edge (Cd ≈ 0.97 — ISA 1932 nozzle type)"}`,
        result.phase === "gas" ? (service.gasPropsMode && service.gasPropsMode !== "manual" ? `Z from ${service.gasPropsMode === "pr" ? "Peng-Robinson" : "SRK"} EoS = ${result.srkResult?.Z?.toFixed(4) ?? "computed"} (real-gas compressibility)` : `Manual Z = ${service.gasProps.compressibilityFactor} (user-specified compressibility factor)`) : "Liquid treated as incompressible (constant density)",
        "All pressures are absolute (bar(a))",
        "Standard bore rounded up to nearest metric drill size",
        "Noise estimate is a screening tool only — not certified for acoustic design",
      ],
      references: [
        "ISO 5167-2:2003 — Measurement of fluid flow by means of pressure differential devices — Orifice plates",
        "ISO 5167-1:2003 — General principles and requirements",
        "API RP 14E:2007 — Design of Offshore Production Platform Piping Systems (erosional velocity)",
        "ISA-RP75.23-1995 — Considerations for control valve cavitation",
        "Crane Technical Paper 410 — Flow of Fluids Through Valves, Fittings, and Pipe",
        "Miller, R.W. Flow Measurement Engineering Handbook, 3rd Ed. (McGraw-Hill)",
        "Reader-Harris, M.J. Orifice Plates and Venturi Tubes (Springer, 2015)",
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
                  <div className="grid gap-3 sm:grid-cols-2 mb-1">
                    <div className="sm:col-span-2">
                      <Label className="text-xs mb-1.5 block">Gas Properties Mode</Label>
                      <Select value={service.gasPropsMode || "manual"} onValueChange={v => updateService("gasPropsMode", v as GasPropsMode)} data-testid="select-gas-props-mode">
                        <SelectTrigger data-testid="select-gas-props-mode-trigger"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Input (MW, k, Z, μ)</SelectItem>
                          <SelectItem value="pr">Peng-Robinson EoS — Recommended for O&G (auto-computes MW, k, Z, μ, T₂)</SelectItem>
                          <SelectItem value="srk">SRK EoS — Soave 1972 (auto-computes MW, k, Z, μ, T₂)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(service.gasPropsMode === "srk" || service.gasPropsMode === "pr") ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-amber-400 font-semibold">
                          {service.gasPropsMode === "pr"
                            ? "PR EoS Composition (Peng-Robinson 1976/1978, Chueh-Prausnitz BIP, Lee viscosity)"
                            : "SRK EoS Composition (Graboski-Daubert α, Chueh-Prausnitz BIP, Lee viscosity)"}
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={normalizeComposition} data-testid="btn-normalize-composition">Normalize</Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={addCompositionRow} data-testid="btn-add-component">+ Component</Button>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Sum of mole fractions: <span className={Math.abs((service.composition || []).reduce((s, r) => s + r.moleFraction, 0) - 1) > 0.001 ? "text-amber-400 font-bold" : "text-green-400"}>
                          {((service.composition || []).reduce((s, r) => s + r.moleFraction, 0) * 100).toFixed(2)}%
                        </span> — must equal 100% before calculating
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-muted/30">
                              <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Component</th>
                              <th className="text-right py-1 px-2 font-medium text-muted-foreground">Mole Fraction</th>
                              <th className="text-right py-1 pl-2 font-medium text-muted-foreground">MW</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(service.composition || []).map((row, i) => {
                              const comp = COMPONENT_DB[row.componentId];
                              return (
                                <tr key={i} className="border-b border-muted/10">
                                  <td className="py-1 pr-2">
                                    <Select value={row.componentId} onValueChange={v => updateCompositionRow(i, "componentId", v)}>
                                      <SelectTrigger className="h-6 text-[11px]" data-testid={`select-component-${i}`}><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(COMPONENT_DB).map(([id, c]) => <SelectItem key={id} value={id}>{c.name} ({id})</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-1 px-2">
                                    <NumericInput
                                      value={row.moleFraction} step="0.001"
                                      onValueChange={v => updateCompositionRow(i, "moleFraction", v)}
                                      className="h-6 text-[11px] text-right"
                                      data-testid={`input-mole-fraction-${i}`}
                                    />
                                  </td>
                                  <td className="py-1 pl-2 font-mono text-right text-muted-foreground">{comp ? comp.MW.toFixed(2) : "—"}</td>
                                  <td className="py-1 pl-1">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => removeCompositionRow(i)} data-testid={`btn-remove-component-${i}`}>×</Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
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
                  )}
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
                <div><Label className="text-xs mb-1.5 block">Tapping Type (ISO 5167-2)</Label>
                  <Select value={service.orifice.tappingType || "corner"} onValueChange={v => updateOrifice("tappingType", v as TappingType)}>
                    <SelectTrigger data-testid="select-tapping-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corner">Corner taps (L₁=L'₂=0)</SelectItem>
                      <SelectItem value="D-D2">D and D/2 taps (L₁=1, L'₂=0.47)</SelectItem>
                      <SelectItem value="flange">Flange taps (L₁=L'₂=25.4/D mm)</SelectItem>
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
                {service.numStages > 1 && (
                  <div className="mt-3">
                    <Label className="text-[10px] mb-1 block">Stage Pressure Distribution</Label>
                    <Select value={service.stageDistribution ?? "geometric"} onValueChange={v => updateService("stageDistribution", v as "equal_dp" | "geometric")}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-stage-dist"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geometric">Geometric (equal P₂/P₁ per stage) — recommended</SelectItem>
                        <SelectItem value="equal_dp">Equal ΔP per stage</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Geometric distribution: each stage sees the same P₂/P₁ ratio = (P₂_total/P₁)^(1/n). Prevents early stages from choking on gas service and equalises cavitation index on liquid service.
                    </p>
                  </div>
                )}
              </CardContent></Card>

              <Card className="bg-muted/30"><CardContent className="p-3 text-[10px] text-muted-foreground space-y-1">
                <p><strong>Size for flow:</strong> Given Q or W, P₁, P₂ → solver finds required orifice diameter d (bisection method).</p>
                <p><strong>Check orifice:</strong> Given d, P₁, P₂ → computes achievable flow W and resulting conditions.</p>
                <p><strong>Predict ΔP:</strong> Given d, W, P₁ → solver finds required ΔP (and P₂) for the specified flow through the orifice.</p>
                <p>Permanent pressure loss per ISO 5167-2 Annex D: (√(1−β⁴Cd²) − Cd·β²) / (√(1−β⁴Cd²) + Cd·β²). Cd per Reader-Harris/Gallagher (ISO 5167-2:2003). Cavitation index σ = (P₁−Pv)/ΔP checked against σᵢ = 2.7 (ISA-RP75.23).</p>
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
                            <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToCalcNote(d); }} data-testid="button-export-calc-note">
                              <FileText className="w-4 h-4 mr-2 text-red-400" />Calc Note (Print / PDF)
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
                        { label: "Std β (rounded bore)", val: result.standardBoreBeta.toFixed(4), unit: "—" },
                        { label: "Total ΔP", val: convertFromSI("pressure", result.pressureDrop, unitSystem).toFixed(3), unit: pU("pressure") },
                        { label: "Permanent ΔP", val: convertFromSI("pressure", result.permanentPressureLoss, unitSystem).toFixed(3), unit: pU("pressure") },
                        { label: "Perm ΔP fraction (ISO)", val: (result.permanentPressureLossFraction * 100).toFixed(1) + "%", unit: "" },
                        { label: "Recovery factor", val: (result.recoveryFactor * 100).toFixed(1) + "%", unit: "" },
                        { label: "Orifice velocity", val: convertFromSI("velocity", result.orificeVelocity, unitSystem).toFixed(2), unit: pU("velocity") },
                        { label: "API 14E Ve limit", val: convertFromSI("velocity", result.erosionalVelocity, unitSystem).toFixed(2), unit: pU("velocity") },
                        { label: "v / Ve ratio", val: result.erosionalVelocityRatio.toFixed(3), unit: result.erosionalVelocityRatio > 1 ? "⚠ EXCEEDED" : "✓ OK" },
                        { label: "Pipe velocity", val: convertFromSI("velocity", result.pipeVelocity, unitSystem).toFixed(2), unit: pU("velocity") },
                        { label: "Flow coeff. K", val: result.flowCoefficient.toFixed(4), unit: "—" },
                        { label: "Cd effective", val: result.cdEffective.toFixed(4), unit: "—" },
                        { label: "Mass flow", val: convertFromSI("flowMass", result.massFlow, unitSystem).toFixed(2), unit: pU("flowMass") },
                        ...(result.phase === "gas" ? [
                          { label: "P₂/P₁ actual", val: result.pressureRatio.toFixed(6), unit: "—" },
                          { label: "r_crit = (2/(k+1))^(k/(k-1))", val: result.criticalPressureRatio.toFixed(6), unit: "—" },
                          { label: "ρ₁ upstream", val: result.upstreamDensity.toFixed(4), unit: "kg/m³" },
                          { label: "Mach number (orifice)", val: result.machNumber.toFixed(4), unit: "—" },
                          { label: "R_specific", val: result.rSpecific.toFixed(3), unit: "J/(kg·K)" },
                          ...(result.isChoked ? [{ label: "C(k) critical flow fn", val: result.criticalFlowFunction.toFixed(6), unit: "—" }]
                            : [{ label: "Y expansion (ISO 5167)", val: result.expansionFactor.toFixed(6), unit: "—" }]),
                          ...(result.noiseLevelEstimate > 0 ? [{ label: "Noise SPL (screening)", val: result.noiseLevelEstimate.toFixed(0), unit: "dB(A) @1m" }] : []),
                          ...(result.dischargeTemperature !== null ? (() => {
                            const eosLabel = service.gasPropsMode === "pr" ? "PR" : "SRK";
                            return [{ label: `T discharge (${eosLabel} isenthalpic flash)`, val: result.dischargeTemperature.toFixed(2) + " °C  (ΔT = " + (result.dischargeTemperature - service.temperature).toFixed(2) + " °C)", unit: result.dischargeTemperatureConverged ? "✓ converged" : "⚠ approx" }];
                          })() : []),
                          ...(result.srkResult ? (() => {
                            const eosLabel = service.gasPropsMode === "pr" ? "PR" : "SRK";
                            return [
                              { label: `MW (${eosLabel})`, val: result.srkResult.MWm.toFixed(3), unit: "kg/kmol" },
                              { label: `Z (${eosLabel})`, val: result.srkResult.Z.toFixed(4), unit: "—" },
                              { label: `k (${eosLabel})`, val: result.srkResult.k.toFixed(4), unit: "—" },
                              { label: `μ (${eosLabel}/Lee)`, val: result.srkResult.viscosity_cP.toFixed(5), unit: "cP" },
                              { label: `Hm (${eosLabel})`, val: result.srkResult.Hm.toFixed(1), unit: "kJ/kmol" },
                            ];
                          })() : []),
                        ] : []),
                        ...(result.reynoldsNumber > 0 ? [
                          { label: "Re (orifice, d)", val: result.reynoldsNumber.toFixed(0), unit: "—" },
                        ] : []),
                        ...(result.reynoldsNumberPipe > 0 ? [
                          { label: "Re (pipe, D)", val: result.reynoldsNumberPipe.toFixed(0), unit: "—" },
                        ] : []),
                        ...(result.phase === "liquid" && result.sigma < 999 ? [
                          { label: "Cavitation index σ", val: result.sigma.toFixed(3), unit: "—" },
                          { label: "σᵢ incipient (ISA)", val: result.sigmaIncipient.toFixed(1), unit: result.sigma < result.sigmaIncipient ? "⚠ σ < σᵢ" : "✓ σ > σᵢ" },
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
                        <h4 className="text-sm font-semibold">Multi-Stage Breakdown ({result.stages.length} stages — {service.stageDistribution === "geometric" ? "geometric P₂/P₁" : "equal ΔP"} distribution)</h4>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" data-testid="table-stages">
                          <thead><tr className="border-b">
                            <th className="text-left py-1.5 pr-2">Stage</th>
                            <th className="text-right py-1.5 px-2">P₁ (bar)</th>
                            <th className="text-right py-1.5 px-2">P₂ (bar)</th>
                            <th className="text-right py-1.5 px-2">P₂/P₁</th>
                            <th className="text-right py-1.5 px-2">ΔP (bar)</th>
                            <th className="text-right py-1.5 px-2">d (mm)</th>
                            <th className="text-right py-1.5 px-2">β</th>
                            <th className="text-right py-1.5 px-2">v_o (m/s)</th>
                            {result.phase === "gas" && <th className="text-right py-1.5 pl-2">Regime</th>}
                          </tr></thead>
                          <tbody>
                            {result.stages.map((s, i) => (
                              <tr key={i} className="border-b border-muted/20">
                                <td className="py-1.5 pr-2 font-mono">{s.stageNumber}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.upstreamPressure.toFixed(3)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.downstreamPressure.toFixed(3)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.pressureRatioDP?.toFixed(4) ?? "—"}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.pressureDrop.toFixed(3)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.orificeDiameter.toFixed(2)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.betaRatio.toFixed(4)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{s.orificeVelocity.toFixed(1)}</td>
                                {result.phase === "gas" && (
                                  <td className={`text-right py-1.5 pl-2 font-mono text-[10px] ${s.isChoked ? "text-destructive" : "text-green-400"}`}>
                                    {s.isChoked ? "CHOKED" : "Subcrit."}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {result.straightPipeRecs && result.straightPipeRecs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <h4 className="text-sm font-semibold">Upstream / Downstream Straight-Pipe Requirements</h4>
                      <p className="text-[10px] text-muted-foreground">ISO 5167-2:2003 Table 3 (β ≈ {result.betaRatio.toFixed(2)} interpolated). For restriction orifice service — informational best practice.</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <table className="w-full text-xs" data-testid="table-pipe-recs">
                        <thead><tr className="border-b">
                          <th className="text-left py-1.5 pr-2">Upstream Fitting</th>
                          <th className="text-right py-1.5 px-2">Min Upstream L/D</th>
                          <th className="text-right py-1.5 pl-2">Min Downstream L/D</th>
                        </tr></thead>
                        <tbody>
                          {result.straightPipeRecs.map((r, i) => (
                            <tr key={i} className="border-b border-muted/20">
                              <td className="py-1.5 pr-2 text-muted-foreground">{r.fitting}</td>
                              <td className="text-right py-1.5 px-2 font-mono">{r.upstreamLD}D ({(r.upstreamLD * service.pipeDiameter / 1000).toFixed(2)} m)</td>
                              <td className="text-right py-1.5 pl-2 font-mono">{r.downstreamLD}D ({(r.downstreamLD * service.pipeDiameter / 1000).toFixed(2)} m)</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[10px] text-muted-foreground mt-2">Note: For pressure-drop service (not metering), minimum upstream L/D ≥ 5D is generally acceptable. Values shown are conservative ISO 5167 metering-grade requirements.</p>
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
                    `${result.phase === "liquid" ? "Incompressible" : "Compressible"} flow through ${service.orifice.edgeType}-edged restriction orifice (ISO 5167-2:2003)`,
                    result.phase === "liquid"
                      ? "W = Cd · E · A · √(2·ρ·ΔP), E = 1/√(1−β⁴) — velocity-of-approach factor [ISO 5167-2 Eq. 1]"
                      : result.isChoked
                        ? "W = Cd · E · A · P₁ · C(k) · √(MW/(Z·Rᵤ·T)), C(k) = √(k·(2/(k+1))^((k+1)/(k-1))) — critical (choked) flow"
                        : "W = Cd · E · A · Y · √(2·ρ₁·ΔP), Y = 1−(0.351+0.256β⁴+0.93β⁸)·(1−r^(1/k)) — ISO 5167-2 expansion factor",
                    `Discharge coefficient Cd = ${result.cdEffective.toFixed(4)} (${service.orifice.cdMode === "user" ? "user-defined" : "ISO 5167-2:2003 Reader-Harris/Gallagher correlation — validated for β ∈ [0.1,0.75], Re_D ≥ 5000"})`,
                    `Basis mode: ${service.orifice.basisMode === "inPipe" ? "In-pipe (β⁴ velocity-of-approach correction applied)" : "Free discharge (no β correction — Cd acts on orifice area only)"}`,
                    "Permanent pressure loss: ΔP_perm/ΔP = (√(1−β⁴Cd²) − Cd·β²) / (√(1−β⁴Cd²) + Cd·β²) [ISO 5167-2:2003 Annex D]",
                    `Cavitation (liquid): σ = (P₁−Pv)/ΔP. Incipient threshold σᵢ = 2.7; constant cavitation σch = 1.5 [ISA-RP75.23 / Tullis 1993]`,
                    "Erosional velocity: Ve = 122/√ρ [m/s] per API RP 14E §2.4, C = 100 (continuous service)",
                    `Plate thickness: ${service.orifice.thickness > 0 ? `e = ${service.orifice.thickness} mm, e/d = ${result.requiredDiameter > 0 ? (service.orifice.thickness / result.requiredDiameter).toFixed(3) : "N/A"} — correction applied per Lienhard/ISO 5167 commentary` : "Plate thickness not specified — thin plate assumed (e/d ≤ 0.5)"}`,
                    `Standard bore: ${result.standardBore.toFixed(2)} mm (rounded up to next standard drill size — metric series)`,
                    "Solver: bisection root-finding (bracketed, deterministic) with 60-step initial bracket search",
                  ]}
                  references={[
                    "ISO 5167-2:2003 — Measurement of fluid flow by means of pressure differential devices — Orifice plates",
                    "ISO 5167-1:2003 — General principles and requirements",
                    "API RP 14E:2007 — Design of Offshore Production Platform Piping Systems (erosional velocity §2.4)",
                    "ISA-RP75.23-1995 — Considerations for the application of control valve body styles (cavitation index)",
                    "Crane TP-410 — Flow of Fluids Through Valves, Fittings, and Pipe",
                    "Miller, R.W. Flow Measurement Engineering Handbook, 3rd Edition (McGraw-Hill)",
                    "Reader-Harris, M.J. Orifice Plates and Venturi Tubes (Springer, 2015) — RHG correlation",
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
                      "Confirm fluid properties against NIST / GPSA / vendor data at actual operating conditions",
                      "Verify pipe schedule and internal diameter against P&ID and isometric drawings",
                      result.phase === "liquid" && service.liquidProps.vaporPressure <= 0
                        ? "⚠ Input vapor pressure Pv to enable cavitation screening (σ = (P₁−Pv)/ΔP)" : null,
                      result.phase === "liquid" && result.sigma < 999 && result.sigma < 2.7
                        ? `⚠ Cavitation: σ = ${result.sigma.toFixed(3)} < σᵢ = 2.7 — specify anti-cavitation material (stellite, WC) or multi-stage` : null,
                      result.erosionalVelocityRatio > 0.75
                        ? `⚠ Orifice velocity ${result.orificeVelocity.toFixed(1)} m/s — ${result.erosionalVelocityRatio > 1 ? "EXCEEDS" : "approaching"} API 14E erosional limit ${result.erosionalVelocity.toFixed(1)} m/s. Specify erosion-resistant material.` : null,
                      result.phase === "gas" ? "Evaluate noise levels per IEC 60534-8-3 or vendor acoustic model — especially for choked or near-choked flow" : null,
                      "Check orifice plate mechanical design — thickness per ASME B16.36 / ISO 5167, material per NACE MR0175 where applicable",
                      "Review downstream piping for acoustic fatigue (ASME B31.3 Appendix X) if SPL > 140 dB in-pipe",
                      result.isChoked ? "⚠ Choked flow: downstream pipe reinforcement and acoustic liner may be required" : null,
                      result.numStages > 1 ? `Verify inter-stage pipe length — allow ≥ 10D between restriction stages for flow reconditioning` : null,
                      "Confirm final orifice bore tolerance with fabricator (typical ±0.1 mm for machined orifice)",
                      "Confirm Cd with vendor or request witnessed flow test if Cd accuracy > ±5% is required",
                      "Cross-check with detailed hydraulics model (Aspen HYSYS, PipeSim, etc.) for long-term performance",
                      result.standardBore > result.requiredDiameter
                        ? `Standard bore ${result.standardBore.toFixed(2)} mm > required ${result.requiredDiameter.toFixed(2)} mm — verify that actual flow at standard bore is acceptable` : null,
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
