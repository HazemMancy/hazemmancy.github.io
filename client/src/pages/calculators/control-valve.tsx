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
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import { COMMON_GASES, COMMON_LIQUIDS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
import {
  type CVProject, type CVServiceData, type CVValveData, type CVInstallation,
  type OperatingPoint, type FluidType, type ValveStyle, type TrimCharacteristic,
  type DataQuality, type CVSizingResult, type CVSelectionResult,
  type CVRiskAssessment, type CVFinalResult,
  DEFAULT_PROJECT, DEFAULT_VALVE_DATA, DEFAULT_INSTALLATION,
  getDefaultServiceData, TYPICAL_VALVE_DEFAULTS,
  computeMultiPointSizing, computeValveSelection, computeRiskAssessment, buildFinalResult,
  CV_TEST_CASE, CV_GAS_TEST, STEAM_PROPS,
} from "@/lib/engineering/controlValve";
import {
  Gauge, FlaskConical, RotateCcw,
  ChevronLeft, ChevronRight, ClipboardList, Droplets,
  Settings2, Calculator, Wrench, ShieldAlert, CheckCircle2,
  Download, FileText, FileSpreadsheet,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "service", label: "Service Data", icon: Droplets, step: 2 },
  { id: "valve", label: "Valve Type", icon: Settings2, step: 3 },
  { id: "sizing", label: "Sizing", icon: Calculator, step: 4 },
  { id: "selection", label: "Selection", icon: Wrench, step: 5 },
  { id: "risk", label: "Risk", icon: ShieldAlert, step: 6 },
  { id: "results", label: "Results", icon: CheckCircle2, step: 7 },
];

export default function ControlValvePage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [activeTab, setActiveTab] = useState("project");
  const [project, setProject] = useState<CVProject>({ ...DEFAULT_PROJECT });
  const [serviceData, setServiceData] = useState<CVServiceData>(getDefaultServiceData());
  const [valveData, setValveData] = useState<CVValveData>({ ...DEFAULT_VALVE_DATA });
  const [installation, setInstallation] = useState<CVInstallation>({ ...DEFAULT_INSTALLATION });

  const [sizingResult, setSizingResult] = useState<CVSizingResult | null>(null);
  const [selectionResult, setSelectionResult] = useState<CVSelectionResult | null>(null);
  const [riskResult, setRiskResult] = useState<CVRiskAssessment | null>(null);
  const [finalResult, setFinalResult] = useState<CVFinalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pU = getUnit("pressureAbs", unitSystem);
  const tU = getUnit("temperature", unitSystem);
  const fU = getUnit("flowLiquid", unitSystem);
  const fmU = getUnit("flowMass", unitSystem);
  const dU = getUnit("diameter", unitSystem);

  const handleUnitToggle = (ns: UnitSystem) => {
    if (ns === unitSystem) return;
    const cp = (param: string, val: number) => {
      if (unitSystem === "SI" && ns === "Field") return convertFromSI(param, val, "Field");
      if (unitSystem === "Field" && ns === "SI") return convertToSI(param, val, "Field");
      return val;
    };
    setServiceData(sd => ({
      ...sd,
      operatingPoints: sd.operatingPoints.map(op => ({
        ...op,
        flowRate: op.flowUnit === "volumetric" ? cp("flowLiquid", op.flowRate) : cp("flowMass", op.flowRate),
        upstreamPressure: cp("pressureAbs", op.upstreamPressure),
        downstreamPressure: cp("pressureAbs", op.downstreamPressure),
        temperature: cp("temperature", op.temperature),
      })),
      liquidProps: {
        ...sd.liquidProps,
        density: cp("density", sd.liquidProps.density),
        vaporPressure: cp("pressureKpa", sd.liquidProps.vaporPressure),
        criticalPressure: cp("pressureAbs", sd.liquidProps.criticalPressure),
      },
      gasProps: {
        ...sd.gasProps,
        criticalPressure: cp("pressureAbs", sd.gasProps.criticalPressure),
      },
    }));
    setValveData(vd => ({
      ...vd,
      pipeSize: cp("diameter", vd.pipeSize),
      valveSize: vd.valveSize > 0 ? cp("diameter", vd.valveSize) : 0,
    }));
    setUnitSystem(ns);
  };

  const updateOP = (idx: number, field: keyof OperatingPoint, value: string | number | boolean) => {
    setServiceData(sd => ({
      ...sd,
      operatingPoints: sd.operatingPoints.map((op, i) =>
        i === idx ? { ...op, [field]: value } : op
      ),
    }));
  };

  const loadTestCase = (testCase: { project: CVProject; serviceData: CVServiceData; valveData: CVValveData; installation: CVInstallation }) => {
    setUnitSystem("SI"); setError(null);
    setSizingResult(null); setSelectionResult(null); setRiskResult(null); setFinalResult(null);
    setProject({ ...testCase.project });
    setServiceData({ ...testCase.serviceData, operatingPoints: testCase.serviceData.operatingPoints.map(op => ({ ...op })) });
    setValveData({ ...testCase.valveData });
    setInstallation({ ...testCase.installation });
    setActiveTab("project");
  };

  const handleReset = () => {
    setUnitSystem("SI"); setError(null);
    setProject({ ...DEFAULT_PROJECT });
    setServiceData(getDefaultServiceData());
    setValveData({ ...DEFAULT_VALVE_DATA });
    setInstallation({ ...DEFAULT_INSTALLATION });
    setSizingResult(null); setSelectionResult(null); setRiskResult(null); setFinalResult(null);
    setActiveTab("project");
  };

  const handleLiquidSelect = (name: string) => {
    const l = COMMON_LIQUIDS[name];
    if (l) {
      setServiceData(sd => ({
        ...sd, fluidName: name,
        liquidProps: { ...sd.liquidProps, density: l.density, vaporPressure: l.vaporPressure ?? sd.liquidProps.vaporPressure },
      }));
    }
  };

  const handleGasSelect = (name: string) => {
    const g = COMMON_GASES[name];
    if (g) {
      setServiceData(sd => ({
        ...sd, fluidName: name,
        gasProps: { ...sd.gasProps, molecularWeight: g.mw, specificHeatRatio: g.gamma },
      }));
    }
  };

  const handleStyleSelect = (style: ValveStyle) => {
    const defaults = TYPICAL_VALVE_DEFAULTS[style];
    setValveData(vd => ({
      ...vd, style, fl: defaults.fl, xt: defaults.xt, fd: defaults.fd, rangeability: defaults.rangeability,
    }));
  };

  const toSIPoints = (): CVServiceData => ({
    ...serviceData,
    operatingPoints: serviceData.operatingPoints.map(op => ({
      ...op,
      flowRate: op.flowUnit === "volumetric" ? convertToSI("flowLiquid", op.flowRate, unitSystem) : convertToSI("flowMass", op.flowRate, unitSystem),
      upstreamPressure: convertToSI("pressureAbs", op.upstreamPressure, unitSystem),
      downstreamPressure: convertToSI("pressureAbs", op.downstreamPressure, unitSystem),
      temperature: convertToSI("temperature", op.temperature, unitSystem),
    })),
    liquidProps: {
      ...serviceData.liquidProps,
      density: convertToSI("density", serviceData.liquidProps.density, unitSystem),
      vaporPressure: convertToSI("pressureKpa", serviceData.liquidProps.vaporPressure, unitSystem),
      criticalPressure: convertToSI("pressureAbs", serviceData.liquidProps.criticalPressure, unitSystem),
    },
    gasProps: {
      ...serviceData.gasProps,
      criticalPressure: convertToSI("pressureAbs", serviceData.gasProps.criticalPressure, unitSystem),
    },
  });

  const toSIValve = (): CVValveData => ({
    ...valveData,
    pipeSize: convertToSI("diameter", valveData.pipeSize, unitSystem),
    valveSize: valveData.valveSize > 0 ? convertToSI("diameter", valveData.valveSize, unitSystem) : 0,
  });

  const handleCalcSizing = () => {
    try {
      setError(null);
      const sd = toSIPoints();
      const vd = toSIValve();
      const result = computeMultiPointSizing(sd, vd, installation);
      setSizingResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sizing error");
      setSizingResult(null);
    }
  };

  const handleCalcSelection = () => {
    if (!sizingResult) { handleCalcSizing(); return; }
    try {
      setError(null);
      setSelectionResult(computeValveSelection(sizingResult, valveData));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Selection error");
    }
  };

  const handleCalcRisk = () => {
    if (!sizingResult) { handleCalcSizing(); return; }
    try {
      setError(null);
      const sd = toSIPoints();
      setRiskResult(computeRiskAssessment(sd, sizingResult, valveData));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Risk assessment error");
    }
  };

  const handleBuildResults = () => {
    try {
      setError(null);
      const sd = toSIPoints();
      const vd = toSIValve();
      setFinalResult(buildFinalResult(project, sd, vd, installation));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating results");
    }
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  const isGasLike = serviceData.fluidType === "gas" || serviceData.fluidType === "steam";

  const buildExportData = (): ExportDatasheet | undefined => {
    if (!finalResult) return undefined;
    const fr = finalResult;
    const sd = fr.serviceData;
    const vd = fr.valveData;
    const sr = fr.sizingResult;

    const inputs = [
      { label: "Fluid Type", value: sd.fluidType },
      { label: "Fluid Name", value: sd.fluidName },
      ...(sd.fluidType === "liquid" ? [
        { label: "Density", value: sd.liquidProps.density, unit: "kg/m³" },
        { label: "Viscosity", value: sd.liquidProps.viscosity, unit: "cP" },
        { label: "Vapor Pressure", value: sd.liquidProps.vaporPressure, unit: "kPa" },
        { label: "Critical Pressure", value: sd.liquidProps.criticalPressure, unit: "bar abs" },
      ] : [
        { label: "Molecular Weight", value: sd.gasProps.molecularWeight, unit: "kg/kmol" },
        { label: "Cp/Cv (k)", value: sd.gasProps.specificHeatRatio, unit: "" },
        { label: "Z-factor", value: sd.gasProps.compressibilityFactor, unit: "" },
        { label: "Critical Pressure", value: sd.gasProps.criticalPressure, unit: "bar abs" },
      ]),
      { label: "Valve Style", value: vd.style },
      { label: "Trim Characteristic", value: vd.characteristic },
      { label: "FL", value: vd.fl, unit: "" },
      { label: "xT", value: vd.xt, unit: "" },
      { label: "Fd", value: vd.fd, unit: "" },
      { label: "Pipe Size", value: vd.pipeSize, unit: "mm" },
      ...(vd.ratedCv > 0 ? [{ label: "Rated Cv", value: vd.ratedCv, unit: "" }] : []),
      ...sd.operatingPoints.filter(op => op.enabled).map(op => ({
        label: `${op.label} Flow`, value: op.flowRate, unit: op.flowUnit === "volumetric" ? "m³/h" : "kg/h",
      })),
      ...sd.operatingPoints.filter(op => op.enabled).map(op => ({
        label: `${op.label} P1/P2`, value: `${op.upstreamPressure} / ${op.downstreamPressure}`, unit: "bar abs",
      })),
    ];

    const results = [
      { label: "Governing Point", value: sr.governingPoint, unit: "", highlight: true },
      { label: "Governing Cv", value: sr.governingCv, unit: "", highlight: true },
      ...sr.pointResults.map(pr => ({ label: `${pr.label} — Required Cv`, value: pr.cvRequired, unit: "" })),
      ...sr.pointResults.map(pr => ({ label: `${pr.label} — ΔP`, value: pr.deltaPActual, unit: "bar" })),
      ...sr.pointResults.map(pr => ({ label: `${pr.label} — Regime`, value: pr.isChoked ? "Choked" : "OK", unit: "" })),
      ...sr.pointResults.filter(pr => pr.openingPercent > 0).map(pr => ({ label: `${pr.label} — Opening`, value: pr.openingPercent, unit: "%" })),
    ];

    const additionalSections = [];
    if (fr.selectionResult && vd.ratedCv > 0) {
      const sel = fr.selectionResult;
      additionalSections.push({
        title: "Valve Selection Check",
        items: [
          { label: "Rated Cv", value: sel.ratedCv },
          { label: "Cv Ratio (Governing/Rated)", value: `${(sel.cvRatio * 100).toFixed(0)}%` },
          { label: "Min Opening", value: sel.minOpening, unit: "%" },
          { label: "Max Opening", value: sel.maxOpening, unit: "%" },
          { label: "Valve Authority", value: `${(sel.authorityFactor * 100).toFixed(0)}%` },
          { label: "Rangeability", value: sel.rangeabilityOK ? "OK" : "INSUFFICIENT" },
        ],
      });
    }

    if (fr.riskAssessment) {
      const ra = fr.riskAssessment;
      additionalSections.push({
        title: "Risk Assessment",
        items: [
          { label: "Cavitation Risk", value: ra.cavitationRisk },
          { label: "Flashing Risk", value: ra.flashingRisk ? "Yes" : "No" },
          { label: "Choked Gas", value: ra.chokedGas ? "Yes" : "No" },
          { label: "High Noise Risk", value: ra.highNoiseRisk ? "Yes" : "No" },
          { label: "Two-Phase Risk", value: ra.twoPhaseRisk ? "Yes" : "No" },
        ],
      });
    }

    return {
      calculatorName: "Control Valve Sizing (IEC 60534)",
      projectInfo: [
        { label: "Project", value: fr.project.name },
        { label: "Client", value: fr.project.client },
        { label: "Location", value: fr.project.location },
        { label: "Case / Tag", value: fr.project.caseId },
        { label: "Engineer", value: fr.project.engineer },
        { label: "Date", value: fr.project.date },
        { label: "Data Quality", value: fr.project.dataQuality },
      ],
      inputs,
      results,
      additionalSections,
      methodology: [
        "Cv sizing per IEC 60534-2-1 / ISA S75.01",
        sd.fluidType === "liquid"
          ? "Liquid: Cv = Q·√(ρ/ΔP) / (N1·Fp), choked check via FL²(P1-FF·Pv)"
          : "Gas: Cv = W / (N8·Fp·P1·Y·√(x·Fk·M/(T·Z))), choked check via Fk·xT",
        "Piping geometry factor Fp based on reducers (sum K = 1.5(1-β²))",
      ],
      assumptions: [
        "FL, xT, Fd values are typical defaults unless vendor-confirmed",
        "Valve opening estimated from inherent characteristic (not installed)",
        "Valve authority = min ΔP / (max ΔP + min ΔP)",
        sd.fluidType === "steam" ? "Steam uses approximate MW/k/Z — verify with steam tables" : "",
      ].filter(Boolean),
      references: [
        "IEC 60534-2-1: Industrial-process control valves — Sizing equations (primary standard)",
        "IEC 60534-2-2: Sizing equations — Cavitation (liquid service, Kc coefficient)",
        "IEC 60534-8-3: Noise prediction — Aerodynamic noise (gas/vapor service)",
        "ISA S75.01: Flow Equations for Sizing Control Valves",
        "THINKTANK Technical Bulletin 1-I: Handbook for Control Valve Sizing (N-constant table, Fp/FLP/xTP, Figure 15)",
        "Fisher Control Valve Handbook, 5th Edition (N-constant validation, numerical factors)",
      ],
      warnings: [
        ...sr.warnings,
        ...(fr.selectionResult?.warnings || []),
        ...(fr.riskAssessment?.warnings || []),
        ...fr.flags,
      ].filter(Boolean),
    };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">Control Valve Sizing</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Cv sizing per IEC 60534-2-1 / ISA S75.01 — corrected N1, N8, Fp, FLP, xTP, Kc per Technical Bulletin 1-I</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select onValueChange={v => { if (v === "liquid") loadTestCase(CV_TEST_CASE); else loadTestCase(CV_GAS_TEST); }}>
            <SelectTrigger className="w-auto gap-1" data-testid="button-load-test">
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="text-xs">Test Case</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="liquid">Liquid (Cooling Water)</SelectItem>
              <SelectItem value="gas">Gas (Natural Gas)</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-cv">
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
                <div><Label className="text-xs mb-1.5 block">Project Name</Label>
                  <Input value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} data-testid="input-project-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Client</Label>
                  <Input value={project.client} onChange={e => setProject(p => ({ ...p, client: e.target.value }))} data-testid="input-client" /></div>
                <div><Label className="text-xs mb-1.5 block">Location</Label>
                  <Input value={project.location} onChange={e => setProject(p => ({ ...p, location: e.target.value }))} data-testid="input-location" /></div>
                <div><Label className="text-xs mb-1.5 block">Case ID / Valve Tag</Label>
                  <Input value={project.caseId} onChange={e => setProject(p => ({ ...p, caseId: e.target.value }))} data-testid="input-case-id" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => setProject(p => ({ ...p, engineer: e.target.value }))} data-testid="input-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => setProject(p => ({ ...p, date: e.target.value }))} data-testid="input-date" /></div>
                <div><Label className="text-xs mb-1.5 block">Data Quality</Label>
                  <Select value={project.dataQuality} onValueChange={v => setProject(p => ({ ...p, dataQuality: v as DataQuality }))}>
                    <SelectTrigger data-testid="select-quality"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preliminary">Preliminary</SelectItem>
                      <SelectItem value="typical_vendor">Typical Vendor Data</SelectItem>
                      <SelectItem value="confirmed_vendor">Confirmed Vendor Data</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Standards Basis</Label>
                  <Input value="IEC 60534-2-1 / ISA S75.01" disabled className="text-muted-foreground" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SERVICE DATA */}
        <TabsContent value="service">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Service Data & Process Conditions</h3>
              <p className="text-xs text-muted-foreground">Define fluid type, properties, and operating points (min/normal/max)</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Fluid Type</Label>
                  <Select value={serviceData.fluidType} onValueChange={v => setServiceData(sd => ({ ...sd, fluidType: v as FluidType }))}>
                    <SelectTrigger data-testid="select-fluid-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liquid">Liquid</SelectItem>
                      <SelectItem value="gas">Gas / Vapor</SelectItem>
                      <SelectItem value="steam">Steam</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Fluid Name</Label>
                  <Input value={serviceData.fluidName} onChange={e => setServiceData(sd => ({ ...sd, fluidName: e.target.value }))} data-testid="input-fluid-name" /></div>
              </div>

              {serviceData.fluidType === "liquid" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium"><Droplets className="w-3.5 h-3.5 text-primary" /> Liquid Properties</div>
                  <div><Label className="text-xs mb-1.5 block">Select Common Liquid</Label>
                    <Select onValueChange={handleLiquidSelect}>
                      <SelectTrigger data-testid="select-liquid"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{Object.keys(COMMON_LIQUIDS).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Density ({getUnit("density", unitSystem)})</Label>
                      <NumericInput value={serviceData.liquidProps.density} onValueChange={v => setServiceData(sd => ({ ...sd, liquidProps: { ...sd.liquidProps, density: v } }))} data-testid="input-density" /></div>
                    <div><Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                      <NumericInput value={serviceData.liquidProps.viscosity} onValueChange={v => setServiceData(sd => ({ ...sd, liquidProps: { ...sd.liquidProps, viscosity: v } }))} data-testid="input-viscosity" /></div>
                    <div><Label className="text-xs mb-1.5 block">Vapor Pressure ({getUnit("pressureKpa", unitSystem)})</Label>
                      <NumericInput value={serviceData.liquidProps.vaporPressure} onValueChange={v => setServiceData(sd => ({ ...sd, liquidProps: { ...sd.liquidProps, vaporPressure: v } }))} data-testid="input-pv" /></div>
                    <div><Label className="text-xs mb-1.5 block">Critical Pressure ({pU})</Label>
                      <NumericInput value={serviceData.liquidProps.criticalPressure} onValueChange={v => setServiceData(sd => ({ ...sd, liquidProps: { ...sd.liquidProps, criticalPressure: v } }))} data-testid="input-pc" /></div>
                  </div>
                </div>
              )}

              {isGasLike && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium"><Droplets className="w-3.5 h-3.5 text-primary" /> {serviceData.fluidType === "steam" ? "Steam Properties" : "Gas Properties"}</div>
                  {serviceData.fluidType === "gas" && (
                    <div><Label className="text-xs mb-1.5 block">Select Common Gas</Label>
                      <Select onValueChange={handleGasSelect}>
                        <SelectTrigger data-testid="select-gas"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{Object.keys(COMMON_GASES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select></div>
                  )}
                  {serviceData.fluidType === "steam" && (
                    <Card className="bg-muted/30"><CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Using approximate steam properties: MW={STEAM_PROPS.molecularWeight}, k={STEAM_PROPS.specificHeatRatio}, Z={STEAM_PROPS.compressibilityFactor}. Verify with steam tables for final design.</p>
                    </CardContent></Card>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Molecular Weight (kg/kmol)</Label>
                      <NumericInput value={serviceData.fluidType === "steam" ? STEAM_PROPS.molecularWeight : serviceData.gasProps.molecularWeight} disabled={serviceData.fluidType === "steam"} onValueChange={v => setServiceData(sd => ({ ...sd, gasProps: { ...sd.gasProps, molecularWeight: v } }))} data-testid="input-mw" /></div>
                    <div><Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
                      <NumericInput value={serviceData.fluidType === "steam" ? STEAM_PROPS.specificHeatRatio : serviceData.gasProps.specificHeatRatio} disabled={serviceData.fluidType === "steam"} onValueChange={v => setServiceData(sd => ({ ...sd, gasProps: { ...sd.gasProps, specificHeatRatio: v } }))} data-testid="input-k" /></div>
                    <div><Label className="text-xs mb-1.5 block">Z-factor</Label>
                      <NumericInput value={serviceData.fluidType === "steam" ? STEAM_PROPS.compressibilityFactor : serviceData.gasProps.compressibilityFactor} disabled={serviceData.fluidType === "steam"} onValueChange={v => setServiceData(sd => ({ ...sd, gasProps: { ...sd.gasProps, compressibilityFactor: v } }))} data-testid="input-z" /></div>
                    <div><Label className="text-xs mb-1.5 block">Critical Pressure ({pU})</Label>
                      <NumericInput value={serviceData.gasProps.criticalPressure} onValueChange={v => setServiceData(sd => ({ ...sd, gasProps: { ...sd.gasProps, criticalPressure: v } }))} data-testid="input-gas-pc" /></div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium">Operating Points (Min / Normal / Max)</h4>
                  <Badge variant="secondary" className="text-[10px]">{serviceData.fluidType === "liquid" ? "Volumetric Flow" : "Mass Flow"}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" data-testid="table-op-points">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 pr-2 w-16">Point</th>
                        <th className="text-left py-1.5 px-1">{serviceData.fluidType === "liquid" ? `Flow (${fU})` : `Flow (${fmU})`}</th>
                        <th className="text-left py-1.5 px-1">P1 ({pU})</th>
                        <th className="text-left py-1.5 px-1">P2 ({pU})</th>
                        <th className="text-left py-1.5 px-1">T ({tU})</th>
                        <th className="text-center py-1.5 w-12">On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceData.operatingPoints.map((op, i) => (
                        <tr key={i} className="border-b border-muted/20">
                          <td className="py-1 pr-2 font-medium">{op.label}</td>
                          <td className="py-1 px-1"><NumericInput className="h-8 text-xs" value={op.flowRate} onValueChange={v => updateOP(i, "flowRate", v)} data-testid={`input-flow-${i}`} /></td>
                          <td className="py-1 px-1"><NumericInput className="h-8 text-xs" value={op.upstreamPressure} onValueChange={v => updateOP(i, "upstreamPressure", v)} data-testid={`input-p1-${i}`} /></td>
                          <td className="py-1 px-1"><NumericInput className="h-8 text-xs" value={op.downstreamPressure} onValueChange={v => updateOP(i, "downstreamPressure", v)} data-testid={`input-p2-${i}`} /></td>
                          <td className="py-1 px-1"><NumericInput className="h-8 text-xs" value={op.temperature} onValueChange={v => updateOP(i, "temperature", v)} data-testid={`input-t-${i}`} /></td>
                          <td className="py-1 text-center"><input type="checkbox" checked={op.enabled} onChange={e => updateOP(i, "enabled", e.target.checked)} data-testid={`check-en-${i}`} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: VALVE TYPE & INSTALLATION */}
        <TabsContent value="valve">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Valve Type & Installation</h3>
              <p className="text-xs text-muted-foreground">Select valve body style, trim, and piping configuration</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Valve Style</Label>
                  <Select value={valveData.style} onValueChange={v => handleStyleSelect(v as ValveStyle)}>
                    <SelectTrigger data-testid="select-style"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="globe">Globe</SelectItem>
                      <SelectItem value="ball">Ball</SelectItem>
                      <SelectItem value="butterfly">Butterfly</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Trim Characteristic</Label>
                  <Select value={valveData.characteristic} onValueChange={v => setValveData(vd => ({ ...vd, characteristic: v as TrimCharacteristic }))}>
                    <SelectTrigger data-testid="select-char"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equal_pct">Equal Percentage</SelectItem>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="quick_open">Quick Opening</SelectItem>
                    </SelectContent>
                  </Select></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Rated Cv (vendor)</Label>
                  <NumericInput value={valveData.ratedCv} onValueChange={v => setValveData(vd => ({ ...vd, ratedCv: v }))} placeholder="Enter after sizing" data-testid="input-rated-cv" /></div>
                <div><Label className="text-xs mb-1.5 block">Rangeability</Label>
                  <NumericInput value={valveData.rangeability} onValueChange={v => setValveData(vd => ({ ...vd, rangeability: v || 50 }))} data-testid="input-rangeability" /></div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-medium mb-3">Recovery & Capacity Factors (Vendor Data)</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><Label className="text-xs mb-1.5 block">FL (Liquid Recovery)</Label>
                    <NumericInput value={valveData.fl} onValueChange={v => setValveData(vd => ({ ...vd, fl: v || 0.9 }))} data-testid="input-fl" /></div>
                  <div><Label className="text-xs mb-1.5 block">xT (Gas Pressure Ratio)</Label>
                    <NumericInput value={valveData.xt} onValueChange={v => setValveData(vd => ({ ...vd, xt: v || 0.7 }))} data-testid="input-xt" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fd (Valve Style Modifier)</Label>
                    <NumericInput value={valveData.fd} onValueChange={v => setValveData(vd => ({ ...vd, fd: v || 0.46 }))} data-testid="input-fd" /></div>
                </div>
                <Card className="bg-muted/30 mt-3"><CardContent className="p-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground">Typical values for {valveData.style}: FL={TYPICAL_VALVE_DEFAULTS[valveData.style].fl}, xT={TYPICAL_VALVE_DEFAULTS[valveData.style].xt}, Fd={TYPICAL_VALVE_DEFAULTS[valveData.style].fd}. Confirm with manufacturer data.</p>
                </CardContent></Card>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-medium mb-3">Piping</h4>
                <PipeSizeSelector
                  unitSystem={unitSystem}
                  innerDiameter={String(valveData.pipeSize)}
                  onDiameterChange={(v) => setValveData(vd => ({ ...vd, pipeSize: parseFloat(v) || 0 }))}
                  showRoughness={false}
                  testIdPrefix="cv"
                />
                <div className="grid gap-4 sm:grid-cols-2 mt-3">
                  <div><Label className="text-xs mb-1.5 block">Valve Size ({dU}) — blank=line-size</Label>
                    <NumericInput value={valveData.valveSize} onValueChange={v => setValveData(vd => ({ ...vd, valveSize: v }))} placeholder="Line-size" data-testid="input-valve-size" /></div>
                  <div><Label className="text-xs mb-1.5 block">Fp Override (0=auto)</Label>
                    <NumericInput value={installation.fpOverride} onValueChange={v => setInstallation(inst => ({ ...inst, fpOverride: v }))} placeholder="Auto-calculate" data-testid="input-fp" /></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SIZING */}
        <TabsContent value="sizing">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Sizing Calculations</h3>
              <p className="text-xs text-muted-foreground">Cv computation per IEC 60534-2-1 for each operating point</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Button className="w-full" onClick={handleCalcSizing} data-testid="button-calculate">
                Calculate Cv (All Points)
              </Button>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}

              {sizingResult && (
                <>
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm">Governing Result</h4>
                        <Badge className="text-[10px]">{sizingResult.governingPoint}</Badge>
                      </div>
                      <p className="text-2xl font-mono font-bold text-primary" data-testid="text-governing-cv">
                        Cv = {sizingResult.governingCv.toFixed(1)}
                      </p>
                    </CardContent>
                  </Card>

                  <WarningPanel warnings={sizingResult.warnings} />

                  {sizingResult.pointResults.map((pr, i) => (
                    <Card key={i} className={pr.label === sizingResult.governingPoint ? "border-primary/30" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{pr.label}</span>
                            {pr.label === sizingResult.governingPoint && <Badge variant="secondary" className="text-[10px]">Governing</Badge>}
                          </div>
                          <Badge variant={pr.isChoked ? "destructive" : "secondary"} className="text-[10px]">
                            {pr.flowRegime}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Required Cv:</span><span className="font-mono font-bold text-primary">{pr.cvRequired.toFixed(1)}</span></div>
                          <div className="flex justify-between py-0.5"><span className="text-muted-foreground">ΔP:</span><span className="font-mono">{pr.deltaPActual.toFixed(2)} bar</span></div>
                          <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Fp:</span><span className="font-mono">{pr.fpFactor.toFixed(3)}</span></div>
                          {serviceData.fluidType === "liquid" && <>
                            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">FF:</span><span className="font-mono">{pr.ffFactor.toFixed(3)}</span></div>
                            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">FLP:</span><span className="font-mono">{pr.flpFactor.toFixed(3)}</span></div>
                            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">ΔP choked:</span><span className="font-mono">{pr.deltaPChoked.toFixed(2)} bar</span></div>
                            {pr.cavitationIndex > 0 && pr.cavitationIndex < 999 && <div className="flex justify-between py-0.5"><span className="text-muted-foreground">σ (cav. idx):</span><span className={`font-mono ${pr.cavitationIndex < pr.kcFactor ? "text-red-400" : pr.cavitationIndex < valveData.fl * valveData.fl ? "text-amber-400" : "text-green-400"}`}>{pr.cavitationIndex.toFixed(3)}</span></div>}
                            {pr.kcFactor > 0 && <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Kc (0.80·FL²):</span><span className="font-mono">{pr.kcFactor.toFixed(3)}</span></div>}
                            {pr.viscosityCorrection > 1 && <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Visc. corr (1/FR):</span><span className="font-mono">{pr.viscosityCorrection.toFixed(3)}</span></div>}
                          </>}
                          {isGasLike && <>
                            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">x (ΔP/P1):</span><span className="font-mono">{pr.xActual.toFixed(4)}</span></div>
                            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">x choked:</span><span className="font-mono">{pr.xChoked.toFixed(4)}</span></div>
                            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Y:</span><span className="font-mono">{pr.yFactor.toFixed(3)}</span></div>
                            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Fk:</span><span className="font-mono">{pr.fkFactor.toFixed(3)}</span></div>
                          </>}
                          {pr.openingPercent > 0 && <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Opening:</span><span className="font-mono">{pr.openingPercent.toFixed(1)}%</span></div>}
                        </div>
                        <WarningPanel warnings={pr.warnings} />
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: SELECTION */}
        <TabsContent value="selection">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Valve Selection & Rating</h3>
              <p className="text-xs text-muted-foreground">Check opening %, rangeability, and valve authority</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {valveData.ratedCv <= 0 && (
                <Card className="bg-amber-950/30 border-amber-800/50"><CardContent className="p-3">
                  <p className="text-xs text-amber-200">Enter Rated Cv in the Valve Type tab to check valve selection. Suggested: Cv &gt; {sizingResult ? (sizingResult.governingCv * 1.25).toFixed(0) : "?"} (25% margin over governing).</p>
                </CardContent></Card>
              )}

              <Button className="w-full" onClick={handleCalcSelection} disabled={!sizingResult} data-testid="button-selection">
                Check Valve Selection
              </Button>

              {selectionResult && (
                <>
                  <WarningPanel warnings={selectionResult.warnings} />

                  <ResultsPanel title="Selection Check" results={[
                    { label: "Rated Cv", value: selectionResult.ratedCv, unit: "" },
                    { label: "Governing / Rated", value: `${(selectionResult.cvRatio * 100).toFixed(0)}%`, unit: "" },
                    { label: "Min Opening", value: selectionResult.minOpening, unit: "%", highlight: selectionResult.minOpening < 10 },
                    { label: "Max Opening", value: selectionResult.maxOpening, unit: "%", highlight: selectionResult.maxOpening > 90 },
                    { label: "Valve Authority", value: `${(selectionResult.authorityFactor * 100).toFixed(0)}%`, unit: "", highlight: selectionResult.authorityFactor < 0.25 },
                    { label: "Rangeability", value: selectionResult.rangeabilityOK ? "OK" : "INSUFFICIENT", unit: "" },
                  ]} rawData={selectionResult} exportData={buildExportData()} />

                  {selectionResult.openings.length > 0 && (
                    <Card><CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Opening at Each Point</h4>
                      <div className="space-y-2">
                        {selectionResult.openings.map((o, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-medium w-16">{o.label}</span>
                            <div className="flex-1 h-4 bg-muted/50 rounded-md overflow-hidden">
                              <div
                                className={`h-full rounded-md transition-all ${o.pctOpen < 10 || o.pctOpen > 90 ? "bg-destructive/70" : "bg-primary/70"}`}
                                style={{ width: `${Math.min(o.pctOpen, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono w-16 text-right" data-testid={`text-opening-${i}`}>{o.pctOpen.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">Recommended operating window: 10-90% open (heuristic guideline)</p>
                    </CardContent></Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: RISK */}
        <TabsContent value="risk">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Cavitation / Flashing / Noise Risk</h3>
              <p className="text-xs text-muted-foreground">Preliminary risk screening based on process conditions</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Button className="w-full" onClick={handleCalcRisk} disabled={!sizingResult} data-testid="button-risk">
                Assess Risk
              </Button>

              {riskResult && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RiskCard label="Cavitation" risk={riskResult.cavitationRisk !== "none"} level={riskResult.cavitationRisk} />
                    <RiskCard label="Flashing" risk={riskResult.flashingRisk} level={riskResult.flashingRisk ? "likely" : "none"} />
                    <RiskCard label="Choked Gas" risk={riskResult.chokedGas} level={riskResult.chokedGas ? "likely" : "none"} />
                    <RiskCard label="High Noise" risk={riskResult.highNoiseRisk} level={riskResult.highNoiseRisk ? "likely" : "none"} />
                  </div>

                  {riskResult.twoPhaseRisk && (
                    <Card className="bg-amber-950/30 border-amber-800/50"><CardContent className="p-3">
                      <p className="text-xs text-amber-200 font-medium">TWO-PHASE RISK: Conditions suggest two-phase flow possibility. Verify phase conditions.</p>
                    </CardContent></Card>
                  )}

                  <WarningPanel warnings={riskResult.warnings} />

                  {riskResult.mitigations.length > 0 && (
                    <Card><CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Recommended Mitigations</h4>
                      <ul className="space-y-1.5">
                        {riskResult.mitigations.map((m, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent></Card>
                  )}

                  {riskResult.cavitationRisk === "none" && !riskResult.flashingRisk && !riskResult.chokedGas && !riskResult.highNoiseRisk && (
                    <Card className="border-green-500/30"><CardContent className="p-4 text-center">
                      <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-400">No significant risk flags identified</p>
                      <p className="text-xs text-muted-foreground mt-1">Service conditions appear within normal control valve operating envelope</p>
                    </CardContent></Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 7: RESULTS */}
        <TabsContent value="results">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <h3 className="font-semibold text-sm">Results & Recommendations</h3>
              {finalResult && (
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
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Button className="w-full" onClick={handleBuildResults} data-testid="button-build-results">
                Generate Final Results
              </Button>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              {finalResult && (
                <>
                  {finalResult.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {finalResult.flags.map((f, i) => (
                        <Badge key={i} variant="destructive" className="text-[10px]" data-testid={`flag-${i}`}>{f}</Badge>
                      ))}
                    </div>
                  )}

                  <WarningPanel warnings={finalResult.sizingResult.warnings} />

                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Control Valve Sizing Summary</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <SummaryRow label="Project" value={finalResult.project.name} testId="text-result-project" />
                        <SummaryRow label="Case / Tag" value={finalResult.project.caseId} />
                        <SummaryRow label="Fluid" value={`${finalResult.serviceData.fluidName} (${finalResult.serviceData.fluidType})`} />
                        <SummaryRow label="Valve Style" value={finalResult.valveData.style} />
                        <SummaryRow label="Governing Point" value={finalResult.sizingResult.governingPoint} />
                        <SummaryRow label="Governing Cv" value={finalResult.sizingResult.governingCv.toFixed(1)} highlight testId="text-result-cv" />
                        {finalResult.valveData.ratedCv > 0 && <>
                          <SummaryRow label="Rated Cv" value={String(finalResult.valveData.ratedCv)} />
                          <SummaryRow label="Cv Ratio" value={`${(finalResult.selectionResult.cvRatio * 100).toFixed(0)}%`} />
                          <SummaryRow label="Min Opening" value={`${finalResult.selectionResult.minOpening.toFixed(1)}%`} />
                          <SummaryRow label="Max Opening" value={`${finalResult.selectionResult.maxOpening.toFixed(1)}%`} />
                          <SummaryRow label="Valve Authority" value={`${(finalResult.selectionResult.authorityFactor * 100).toFixed(0)}%`} />
                        </>}
                        <SummaryRow label="FL" value={String(finalResult.valveData.fl)} />
                        <SummaryRow label="xT" value={String(finalResult.valveData.xt)} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card><CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-3">Per-Point Results</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b">
                          <th className="text-left py-1.5 pr-3">Point</th>
                          <th className="text-right py-1.5 pr-3">Cv</th>
                          <th className="text-right py-1.5 pr-3">ΔP (bar)</th>
                          <th className="text-right py-1.5 pr-3">Opening %</th>
                          <th className="text-right py-1.5">Status</th>
                        </tr></thead>
                        <tbody>
                          {finalResult.sizingResult.pointResults.map((pr, i) => (
                            <tr key={i} className={`border-b border-muted/20 ${pr.label === finalResult.sizingResult.governingPoint ? "bg-primary/5" : ""}`}>
                              <td className="py-1.5 pr-3 font-medium">{pr.label}</td>
                              <td className="text-right py-1.5 pr-3 font-mono">{pr.cvRequired.toFixed(1)}</td>
                              <td className="text-right py-1.5 pr-3 font-mono">{pr.deltaPActual.toFixed(2)}</td>
                              <td className="text-right py-1.5 pr-3 font-mono">{pr.openingPercent > 0 ? `${pr.openingPercent.toFixed(1)}%` : "—"}</td>
                              <td className="text-right py-1.5">
                                <Badge variant={pr.isChoked ? "destructive" : "secondary"} className="text-[10px]">
                                  {pr.isChoked ? "Choked" : "OK"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent></Card>

                  <Card><CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-3">Action Items</h4>
                    <ul className="space-y-2">
                      {finalResult.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent></Card>

                  <AssumptionsPanel
                    assumptions={[
                      "Cv sizing per IEC 60534-2-1 / ISA S75.01 — N1=0.865, N8=94.8, N2=0.00214 (IEC 60534-2-1 Table 1)",
                      "Piping geometry factor: Fp = 1/√(1 + ΣK·Cv²/(N2·d⁴)); ΣK = K1+K2+KB1+KB2 per IEC 60534-2-1 Figure 11",
                      "FLP = FL/√(1 + FL²·K1'·Cv²/(N2·d⁴)) per IEC 60534-2-1 §5.4; iterative 3-pass convergence",
                      "Liquid choked: ΔP_max = (FLP/Fp)²·(P1 − FF·Pv); FF = 0.96 − 0.28·√(Pv/Pc) per IEC 60534-2-1 §5.5",
                      "Gas/vapor: Y = 1 − x/(3·Fk·xTP·Fp²), Fk = k/1.4 per IEC 60534-2-1 §5.6; xTP iterative per §5.8",
                      "Cavitation: Kc = 0.80·FL² per IEC 60534-2-2 §5.2; σ = (P1−Pv)/ΔP; incipient limit = FL²",
                      "FL, xT, Fd: typical defaults per IEC 60534-2-1 Figure 15 — must be replaced by confirmed vendor data for final design",
                      "Viscosity correction (FR) is approximate — full iterative Rev per IEC 60534-2-1 §5.9 requires vendor Fd value",
                      "Valve opening estimated from inherent characteristic (equal %, linear, quick-open) — not installed characteristic",
                      "Valve authority = min ΔP / (min ΔP + max ΔP); target authority >25% for acceptable controllability",
                      serviceData.fluidType === "steam" ? "Steam uses approximate k and Z — verify with IAPWS-IF97 steam tables at actual conditions" : "",
                    ].filter(Boolean)}
                    references={[
                      "IEC 60534-2-1:2011: Industrial-process control valves — Sizing equations for fluid flow (primary sizing standard)",
                      "IEC 60534-2-2:2011: Sizing equations — Inherent flow characteristics and rangeability (cavitation, Kc)",
                      "IEC 60534-8-3:2011: Noise considerations — Control valve aerodynamic noise prediction method",
                      "IEC 60534-8-4:1994: Noise considerations — Prediction of noise generated by hydrodynamic flow (acoustic fatigue)",
                      "ISA S75.01.01: Flow Equations for Sizing Control Valves",
                      "ISA-RP75.23: Considerations for the Application of Control Valve Body Styles",
                      "THINKTANK Technical Bulletin 1-I: Handbook for Control Valve Sizing (numerical constants verification)",
                      "Fisher Control Valve Handbook (Emerson), 5th Edition",
                    ]}
                  />
                </>
              )}
            </CardContent>
          </Card>
          <div className="mt-4">
            <FeedbackSection calculatorName="Control Valve Sizing" />
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

function SummaryRow({ label, value, highlight, testId }: { label: string; value: string; highlight?: boolean; testId?: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-muted/20">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-mono ${highlight ? "text-primary font-bold" : ""}`} data-testid={testId}>{value}</span>
    </div>
  );
}

function RiskCard({ label, risk, level }: { label: string; risk: boolean; level: string }) {
  return (
    <Card className={risk ? "border-destructive/30 bg-destructive/5" : "border-green-500/30 bg-green-500/5"}>
      <CardContent className="p-3 text-center">
        <p className="text-xs font-medium mb-1">{label}</p>
        <Badge variant={risk ? "destructive" : "secondary"} className="text-[10px]">
          {risk ? level.toUpperCase() : "NONE"}
        </Badge>
      </CardContent>
    </Card>
  );
}
