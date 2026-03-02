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
import { UnitSelector } from "@/components/engineering/unit-selector";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI } from "@/lib/engineering/unitConversion";
import {
  calculateSeparator,
  recommendSeparatorConfig,
  type ServiceType,
  type SeparatorOrientation,
  type PhaseMode,
  type OperatingCase,
  type SeparatorConfig,
  type HoldupBasis,
  type ProjectSetup,
  type SeparatorFullResult,
  type CaseGasResult,
  type GeometryResult,
  type EngFlag,
  type CaseType,
  type InletDeviceType,
  type MistEliminatorType,
  type CalcStep,
  type ServiceRecommendation,
  type VesselAllowances,
  DEFAULT_PROJECT,
  DEFAULT_CASE,
  DEFAULT_CONFIG,
  DEFAULT_HOLDUP,
  DEFAULT_ALLOWANCES,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_STANDARDS,
  SERVICE_TYPE_DESCRIPTIONS,
  FLAG_LABELS,
  FLAG_SEVERITY,
  getKGuidance,
  getStandardReference,
  TEST_CASES,
  K_GUIDANCE_API12J,
  K_GUIDANCE_GPSA,
} from "@/lib/engineering/separatorSizing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF as exportToPDFUtil, exportToJSON } from "@/lib/engineering/exportUtils";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import {
  Container, ClipboardList, Droplets, Settings2, BarChart3, Gauge,
  ShieldCheck, ChevronLeft, ChevronRight, RotateCcw, FlaskConical,
  Plus, Trash2, AlertTriangle, CheckCircle2, Download, Info,
  FileText, FileSpreadsheet, Calculator, Wind, Box,
} from "lucide-react";

const TABS = [
  { id: "service", label: "Service", icon: Gauge, step: 1, desc: "Select service type & get recommendations" },
  { id: "project", label: "Project", icon: ClipboardList, step: 2, desc: "Project info & options" },
  { id: "cases", label: "Cases", icon: BarChart3, step: 3, desc: "Operating case data" },
  { id: "design", label: "Design", icon: Settings2, step: 4, desc: "Orientation, K-value & internals" },
  { id: "gas-sizing", label: "Gas Sizing", icon: Wind, step: 5, desc: "Souders-Brown capacity check" },
  { id: "holdup", label: "Holdup", icon: Droplets, step: 6, desc: "Liquid residence & surge" },
  { id: "geometry", label: "Geometry", icon: Box, step: 7, desc: "Vessel dimensions" },
  { id: "results", label: "Results", icon: ShieldCheck, step: 8, desc: "Summary, flags & export" },
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

const pU = (param: string, us: UnitSystem) => getUnit(param, us);

function fmtN(n: number, d = 2): string {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(3);
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(d);
  return n.toPrecision(4);
}

export default function SeparatorSizingPage() {
  const [activeTab, setActiveTab] = useState("service");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [project, setProject] = useState<ProjectSetup>({ ...DEFAULT_PROJECT });
  const [cases, setCases] = useState<OperatingCase[]>([{ ...DEFAULT_CASE }]);
  const [config, setConfig] = useState<SeparatorConfig>({ ...DEFAULT_CONFIG, allowances: { ...DEFAULT_ALLOWANCES } });
  const [holdup, setHoldup] = useState<HoldupBasis>({ ...DEFAULT_HOLDUP });
  const [result, setResult] = useState<SeparatorFullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [serviceType, setServiceType] = useState<ServiceType>("production");
  const [hasFreeWater, setHasFreeWater] = useState(false);
  const [waterCutPercent, setWaterCutPercent] = useState(0);
  const [gasLiquidRatio, setGasLiquidRatio] = useState<"gas_dominant" | "liquid_dominant" | "mixed">("gas_dominant");
  const [flagFoam, setFlagFoam] = useState(false);
  const [flagSolids, setFlagSolids] = useState(false);
  const [flagSlugging, setFlagSlugging] = useState(false);
  const [flagEmulsion, setFlagEmulsion] = useState(false);
  const [recommendation, setRecommendation] = useState<ServiceRecommendation | null>(null);

  const updateProject = (k: keyof ProjectSetup, v: string | boolean) => setProject(p => ({ ...p, [k]: v }));
  const updateConfig = (k: keyof SeparatorConfig, v: unknown) => setConfig(p => ({ ...p, [k]: v as never }));
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

  const handleServiceTypeChange = (st: ServiceType) => {
    setServiceType(st);
    setConfig(p => ({ ...p, serviceType: st }));
    setRecommendation(null);
  };

  const handleGetRecommendation = () => {
    const rec = recommendSeparatorConfig({
      serviceType,
      hasFreeWater,
      waterCutPercent,
      gasLiquidRatio,
      flagFoam,
      flagSolids,
      flagSlugging,
      flagEmulsion,
    });
    setRecommendation(rec);
  };

  const handleApplyRecommendation = () => {
    if (!recommendation) return;
    setConfig(p => ({
      ...p,
      orientation: recommendation.recommendedOrientation,
      phaseMode: recommendation.recommendedPhaseMode,
    }));
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
          if (cc.oilDensity && cc.oilDensity > 0) cc.oilDensity = convertToSI("density", cc.oilDensity, unitSystem);
          if (cc.waterDensity && cc.waterDensity > 0) cc.waterDensity = convertToSI("density", cc.waterDensity, unitSystem);
        }
        return cc;
      });

      const r = calculateSeparator(project, convertedCases, config, holdup);
      setResult(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    setUnitSystem("SI");
    setError(null);
    setResult(null);
    const tc = TEST_CASES[0];
    setProject({ ...tc.project });
    setCases(tc.cases.map(c => ({ ...c })));
    setConfig({ ...tc.config, allowances: { ...tc.config.allowances } });
    setHoldup({ ...tc.holdup });
    setServiceType(tc.config.serviceType);
    setRecommendation(null);
  };

  const handleReset = () => {
    setProject({ ...DEFAULT_PROJECT });
    setCases([{ ...DEFAULT_CASE }]);
    setConfig({ ...DEFAULT_CONFIG, allowances: { ...DEFAULT_ALLOWANCES } });
    setHoldup({ ...DEFAULT_HOLDUP });
    setResult(null);
    setError(null);
    setActiveTab("service");
    setServiceType("production");
    setHasFreeWater(false);
    setWaterCutPercent(0);
    setGasLiquidRatio("gas_dominant");
    setFlagFoam(false);
    setFlagSolids(false);
    setFlagSlugging(false);
    setFlagEmulsion(false);
    setRecommendation(null);
  };

  const handleExportPDF = () => {
    if (!result) return;
    const gov = result.caseResults.find(c => c.caseId === result.governingCaseId);
    const html = buildCalcNoteHTML(result, gov, project);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;
    const gov = result.caseResults.find(c => c.caseId === result.governingCaseId);

    const inputs: ExportDatasheet["inputs"] = [
      { label: "Service Type", value: SERVICE_TYPE_LABELS[config.serviceType] },
      { label: "Orientation", value: config.orientation },
      { label: "Phase Mode", value: config.phaseMode.replace(/_/g, " ") },
      { label: "Inlet Device", value: config.inletDevice.replace(/_/g, " ") },
      { label: "Mist Eliminator", value: config.mistEliminator.replace(/_/g, " ") },
      { label: "K Value", value: config.kValue, unit: "m/s" },
      { label: "K Mode", value: config.kMode },
      { label: "Foam Factor", value: config.foamFactor },
      { label: "Liquid Residence Time", value: holdup.residenceTime, unit: "min" },
      { label: "Surge Time", value: holdup.surgeTime, unit: "min" },
    ];

    if (config.phaseMode === "three_phase") {
      inputs.push(
        { label: "Oil Retention Time", value: holdup.oilRetentionTime, unit: "min" },
        { label: "Water Retention Time", value: holdup.waterRetentionTime, unit: "min" },
      );
    }
    if (holdup.slugVolume > 0) {
      inputs.push({ label: "Slug Volume", value: holdup.slugVolume, unit: "m\u00B3" });
    }
    if (config.enableDropletCheck) {
      inputs.push({ label: "Droplet Diameter", value: config.dropletDiameter_um, unit: "\u03BCm" });
    }

    cases.forEach((c, i) => {
      inputs.push(
        { label: `Case ${i + 1} Name`, value: c.name },
        { label: `Case ${i + 1} Type`, value: c.caseType },
        { label: `Case ${i + 1} Gas Flow`, value: c.gasFlowRate, unit: c.gasFlowBasis === "actual" ? "m\u00B3/h act" : "Sm\u00B3/h" },
        { label: `Case ${i + 1} Gas Density`, value: c.gasDensity, unit: "kg/m\u00B3" },
        { label: `Case ${i + 1} Pressure`, value: c.gasPressure, unit: "bar abs" },
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
        items: result.caseResults.map(cr => ({ label: `${cr.caseName} \u2014 D_req`, value: cr.D_req_mm, unit: "mm" })),
      });
    }

    return {
      calculatorName: "Separator Sizing (API 12J / GPSA)",
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
        "Souders\u2013Brown correlation: v_max = K \u00D7 \u221A((\u03C1_L \u2212 \u03C1_G) / \u03C1_G)",
        "Gas capacity area: A = Q_actual / v_max",
        "K-value pressure correction per GPSA Fig 7-9",
        "Liquid holdup from residence time and surge time",
        "Vessel geometry from gas capacity + liquid holdup + allowances",
      ],
      assumptions: result.assumptions,
      references: [
        "API 12J: Specification for Oil and Gas Separators",
        "GPSA Engineering Data Book, Section 7: Separation Equipment",
        "Arnold & Stewart: Surface Production Operations, Vol. 1",
      ],
      warnings: [
        ...result.warnings,
        ...result.flags.map(f => FLAG_LABELS[f] || f.replace(/_/g, " ")),
      ].filter(Boolean),
    };
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  const kGuidance = getKGuidance(config.serviceType);
  const confColor = (c: string) => c === "strong" ? "text-green-500" : c === "moderate" ? "text-amber-500" : "text-blue-500";
  const confBadgeVariant = (c: string): "default" | "secondary" | "destructive" | "outline" => c === "strong" ? "default" : "secondary";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Container className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Separator Sizing</h1>
            <p className="text-sm text-muted-foreground">API 12J · GPSA Sec 7 · Souders-Brown</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UnitSelector value={unitSystem} onChange={setUnitSystem} />
          <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
            <FlaskConical className="w-3.5 h-3.5 mr-1" /> Test Case
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
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

        <TabsContent value="service">
          <div className="space-y-4">
            <StepHeader step={1} title="Service Type & Recommendations" desc="Select the service type and answer the questionnaire to get design recommendations." />

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Gauge className="w-4 h-4" /> Service Type</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label className="text-xs mb-1.5 block">Service Type</Label>
                  <Select value={serviceType} onValueChange={(v) => handleServiceTypeChange(v as ServiceType)}>
                    <SelectTrigger data-testid="select-service-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map(st => (
                        <SelectItem key={st} value={st}>{SERVICE_TYPE_LABELS[st]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">{SERVICE_TYPE_DESCRIPTIONS[serviceType]}</p>
                <Badge variant="outline" className="text-xs">{SERVICE_TYPE_STANDARDS[serviceType]}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Questionnaire</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center gap-2">
                  <Checkbox checked={hasFreeWater} onCheckedChange={v => setHasFreeWater(!!v)} id="chk-free-water" data-testid="chk-free-water" />
                  <Label htmlFor="chk-free-water" className="text-xs">Is free water present?</Label>
                </div>
                {hasFreeWater && (
                  <div>
                    <Label className="text-xs mb-1 block">Water Cut (%)</Label>
                    <NumericInput value={waterCutPercent} onValueChange={setWaterCutPercent} min={0} max={100} data-testid="input-water-cut-pct" />
                  </div>
                )}
                <div>
                  <Label className="text-xs mb-1.5 block">Gas / Liquid Ratio</Label>
                  <Select value={gasLiquidRatio} onValueChange={v => setGasLiquidRatio(v as "gas_dominant" | "liquid_dominant" | "mixed")}>
                    <SelectTrigger data-testid="select-glr"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gas_dominant">Gas Dominant</SelectItem>
                      <SelectItem value="liquid_dominant">Liquid Dominant</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs font-medium text-muted-foreground">Process Flags</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={flagFoam} onCheckedChange={v => setFlagFoam(!!v)} id="chk-foam-svc" data-testid="chk-foam-svc" />
                    <Label htmlFor="chk-foam-svc" className="text-xs">Foaming tendency</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={flagSolids} onCheckedChange={v => setFlagSolids(!!v)} id="chk-solids-svc" data-testid="chk-solids-svc" />
                    <Label htmlFor="chk-solids-svc" className="text-xs">Solids / sand</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={flagSlugging} onCheckedChange={v => setFlagSlugging(!!v)} id="chk-slugging-svc" data-testid="chk-slugging-svc" />
                    <Label htmlFor="chk-slugging-svc" className="text-xs">Slugging risk</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={flagEmulsion} onCheckedChange={v => setFlagEmulsion(!!v)} id="chk-emulsion-svc" data-testid="chk-emulsion-svc" />
                    <Label htmlFor="chk-emulsion-svc" className="text-xs">Emulsion risk</Label>
                  </div>
                </div>
                <Button size="sm" onClick={handleGetRecommendation} data-testid="button-get-recommendation">
                  Get Recommendation
                </Button>
              </CardContent>
            </Card>

            {recommendation && (
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Recommendation
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="p-3 rounded-md border">
                      <p className="text-xs text-muted-foreground mb-1">Orientation</p>
                      <p className="text-sm font-semibold capitalize">{recommendation.recommendedOrientation}</p>
                      <Badge variant={confBadgeVariant(recommendation.orientationConfidence)} className={`text-xs mt-1 ${confColor(recommendation.orientationConfidence)}`}>
                        {recommendation.orientationConfidence}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-md border">
                      <p className="text-xs text-muted-foreground mb-1">Phase Mode</p>
                      <p className="text-sm font-semibold">{recommendation.recommendedPhaseMode === "three_phase" ? "3-Phase" : "2-Phase"}</p>
                      <Badge variant={confBadgeVariant(recommendation.phaseConfidence)} className={`text-xs mt-1 ${confColor(recommendation.phaseConfidence)}`}>
                        {recommendation.phaseConfidence}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Orientation Reasons</p>
                    <ul className="space-y-1">
                      {recommendation.orientationReasons.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Phase Mode Reasons</p>
                    <ul className="space-y-1">
                      {recommendation.phaseReasons.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleApplyRecommendation} data-testid="button-apply-recommendation">
                    Apply Recommendation
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="project">
          <div className="space-y-4">
            <StepHeader step={2} title="Project Setup" desc="Enter project information." />
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cases">
          <div className="space-y-4">
            <StepHeader step={3} title="Operating Cases" desc="Define gas and liquid stream data for each operating case." />
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
                            <SelectItem value="standard">Standard</SelectItem>
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
                            <SelectItem value="volume">Volume</SelectItem>
                            <SelectItem value="mass">Mass</SelectItem>
                          </SelectContent>
                        </Select></div>
                      <div><Label className="text-xs mb-1 block">Liquid Density ({pU("density", unitSystem)})</Label>
                        <NumericInput value={c.liquidDensity} onValueChange={v => updateCase(idx, "liquidDensity", v)} data-testid={`input-liq-density-${idx}`} /></div>
                      <div><Label className="text-xs mb-1 block">Liquid Viscosity (cP)</Label>
                        <NumericInput value={c.liquidViscosity} onValueChange={v => updateCase(idx, "liquidViscosity", v)} data-testid={`input-liq-visc-${idx}`} /></div>
                    </div>

                    {config.phaseMode === "three_phase" && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground">3-Phase Data</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div><Label className="text-xs mb-1 block">Water Cut (fraction)</Label>
                            <NumericInput value={c.waterCut ?? 0} onValueChange={v => updateCase(idx, "waterCut", v)} data-testid={`input-water-cut-${idx}`} /></div>
                          <div><Label className="text-xs mb-1 block">Oil Density ({pU("density", unitSystem)})</Label>
                            <NumericInput value={c.oilDensity ?? 0} onValueChange={v => updateCase(idx, "oilDensity", v)} data-testid={`input-oil-density-${idx}`} /></div>
                          <div><Label className="text-xs mb-1 block">Water Density ({pU("density", unitSystem)})</Label>
                            <NumericInput value={c.waterDensity ?? 0} onValueChange={v => updateCase(idx, "waterDensity", v)} data-testid={`input-water-density-${idx}`} /></div>
                          <div><Label className="text-xs mb-1 block">Oil Viscosity (cP)</Label>
                            <NumericInput value={c.oilViscosity ?? 0} onValueChange={v => updateCase(idx, "oilViscosity", v)} data-testid={`input-oil-visc-${idx}`} /></div>
                          <div><Label className="text-xs mb-1 block">Water Viscosity (cP)</Label>
                            <NumericInput value={c.waterViscosity ?? 0} onValueChange={v => updateCase(idx, "waterViscosity", v)} data-testid={`input-water-visc-${idx}`} /></div>
                        </div>
                      </>
                    )}

                    <p className="text-xs font-medium text-muted-foreground">Process Flags</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={c.flagFoam} onCheckedChange={v => updateCase(idx, "flagFoam", !!v)} id={`chk-foam-${idx}`} data-testid={`chk-foam-${idx}`} />
                        <Label htmlFor={`chk-foam-${idx}`} className="text-xs">Foam</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={c.flagSolids} onCheckedChange={v => updateCase(idx, "flagSolids", !!v)} id={`chk-solids-${idx}`} data-testid={`chk-solids-${idx}`} />
                        <Label htmlFor={`chk-solids-${idx}`} className="text-xs">Solids</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={c.flagSlugging} onCheckedChange={v => updateCase(idx, "flagSlugging", !!v)} id={`chk-slugging-${idx}`} data-testid={`chk-slugging-${idx}`} />
                        <Label htmlFor={`chk-slugging-${idx}`} className="text-xs">Slugging</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={c.flagHydrate} onCheckedChange={v => updateCase(idx, "flagHydrate", !!v)} id={`chk-hydrate-${idx}`} data-testid={`chk-hydrate-${idx}`} />
                        <Label htmlFor={`chk-hydrate-${idx}`} className="text-xs">Hydrate</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={c.flagEmulsion} onCheckedChange={v => updateCase(idx, "flagEmulsion", !!v)} id={`chk-emulsion-${idx}`} data-testid={`chk-emulsion-${idx}`} />
                        <Label htmlFor={`chk-emulsion-${idx}`} className="text-xs">Emulsion</Label>
                      </div>
                    </div>

                    {config.enableDropletCheck && (
                      <div>
                        <Label className="text-xs mb-1 block">Droplet Basis (\u03BCm)</Label>
                        <NumericInput value={c.dropletBasis} onValueChange={v => updateCase(idx, "dropletBasis", v)} data-testid={`input-droplet-${idx}`} />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="design">
          <div className="space-y-4">
            <StepHeader step={4} title="Design Configuration" desc="Set orientation, K-value, internals and vessel constraints." />

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" /> Orientation & Phase Mode</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Orientation</Label>
                    <Select value={config.orientation} onValueChange={v => updateConfig("orientation", v)}>
                      <SelectTrigger data-testid="select-orientation"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1.5 block">Phase Mode</Label>
                    <Select value={config.phaseMode} onValueChange={v => updateConfig("phaseMode", v)}>
                      <SelectTrigger data-testid="select-phase-mode"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="two_phase">2-Phase (Gas\u2013Liquid)</SelectItem>
                        <SelectItem value="three_phase">3-Phase (Gas\u2013Oil\u2013Water)</SelectItem>
                      </SelectContent>
                    </Select></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Calculator className="w-4 h-4" /> K-Value & Internals</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">K Mode</Label>
                    <Select value={config.kMode} onValueChange={v => updateConfig("kMode", v)}>
                      <SelectTrigger data-testid="select-k-mode"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User-entered</SelectItem>
                        <SelectItem value="typical">Typical (from guidance)</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1.5 block">K Value (m/s)</Label>
                    <NumericInput value={config.kValue} onValueChange={v => updateConfig("kValue", v)} data-testid="input-k-value" /></div>
                </div>

                <div className="overflow-x-auto">
                  <p className="text-xs font-medium text-muted-foreground mb-2">K Guidance ({getStandardReference(config.serviceType)})</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 px-2 text-muted-foreground">Configuration</th>
                        <th className="text-right py-1.5 px-2 text-muted-foreground">Range</th>
                        <th className="text-right py-1.5 px-2 text-muted-foreground">Typical</th>
                        <th className="text-left py-1.5 px-2 text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(kGuidance).map(([key, val]) => (
                        <tr key={key} className="border-b border-muted/30">
                          <td className="py-1.5 px-2">{key}</td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums">{val.range[0]}\u2013{val.range[1]}</td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums">{val.typical}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{val.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Inlet Device</Label>
                    <Select value={config.inletDevice} onValueChange={v => updateConfig("inletDevice", v)}>
                      <SelectTrigger data-testid="select-inlet-device"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="diverter">Diverter Plate</SelectItem>
                        <SelectItem value="half_pipe">Half Pipe</SelectItem>
                        <SelectItem value="cyclone">Cyclone</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1.5 block">Mist Eliminator</Label>
                    <Select value={config.mistEliminator} onValueChange={v => updateConfig("mistEliminator", v)}>
                      <SelectTrigger data-testid="select-mist-elim"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="wire_mesh">Wire Mesh Pad</SelectItem>
                        <SelectItem value="vane_pack">Vane Pack</SelectItem>
                        <SelectItem value="high_efficiency">High Efficiency</SelectItem>
                      </SelectContent>
                    </Select></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" /> Options</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={config.applyPressureCorrection} onCheckedChange={v => updateConfig("applyPressureCorrection", !!v)} id="chk-pressure-corr" data-testid="chk-pressure-corr" />
                    <Label htmlFor="chk-pressure-corr" className="text-xs">Apply pressure correction (GPSA Fig 7-9)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={config.enableDropletCheck} onCheckedChange={v => updateConfig("enableDropletCheck", !!v)} id="chk-droplet" data-testid="chk-droplet" />
                    <Label htmlFor="chk-droplet" className="text-xs">Enable droplet settling check</Label>
                  </div>
                </div>
                {config.enableDropletCheck && (
                  <div><Label className="text-xs mb-1 block">Droplet Diameter (\u03BCm)</Label>
                    <NumericInput value={config.dropletDiameter_um} onValueChange={v => updateConfig("dropletDiameter_um", v)} data-testid="input-droplet-diam" /></div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1 block">Foam Factor</Label>
                    <NumericInput value={config.foamFactor} onValueChange={v => updateConfig("foamFactor", v)} data-testid="input-foam-factor" /></div>
                  {config.orientation === "horizontal" && (
                    <div><Label className="text-xs mb-1 block">Level Fraction (h/D)</Label>
                      <NumericInput value={config.levelFraction} onValueChange={v => updateConfig("levelFraction", v)} min={0.1} max={0.9} data-testid="input-level-frac" /></div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Box className="w-4 h-4" /> Vessel Constraints</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1 block">Max Diameter (mm, 0 = no limit)</Label>
                    <NumericInput value={config.maxDiameter} onValueChange={v => updateConfig("maxDiameter", v)} data-testid="input-max-diam" /></div>
                  <div><Label className="text-xs mb-1 block">Max L/D (0 = no limit)</Label>
                    <NumericInput value={config.maxLD} onValueChange={v => updateConfig("maxLD", v)} data-testid="input-max-ld" /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gas-sizing">
          <div className="space-y-4">
            <StepHeader step={5} title="Gas Sizing Results" desc="Souders-Brown gas capacity check for each operating case." />

            {!result ? (
              <Card><CardContent className="py-10 text-center">
                <Wind className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Complete Holdup tab and calculate first.</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("holdup")} data-testid="button-go-holdup">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Go to Holdup
                </Button>
              </CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Governing Case
                    </h3>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">{result.governingReason}</p>
                  </CardContent>
                </Card>

                {result.caseResults.length > 0 && result.caseResults[0].steps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <h3 className="font-semibold text-sm">Effective K Value</h3>
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0">
                      {result.caseResults[0].steps
                        .filter(s => s.label.toLowerCase().includes("k ") || s.label.toLowerCase().includes("k_") || s.label.toLowerCase().includes("pressure correction") || s.label.toLowerCase().includes("foam"))
                        .map((s, i) => (
                          <EqLine key={i} eq={s.label} val={`${fmtN(s.result)} ${s.unit}`} highlight={s.label.includes("Effective")} />
                        ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm">Per-Case Results</h3>
                  </CardHeader>
                  <CardContent className="pt-0 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 px-2 text-muted-foreground">Case</th>
                          <th className="text-right py-1.5 px-2 text-muted-foreground">Q_g (m\u00B3/s)</th>
                          <th className="text-right py-1.5 px-2 text-muted-foreground">v_s,max (m/s)</th>
                          <th className="text-right py-1.5 px-2 text-muted-foreground">A_req (m\u00B2)</th>
                          <th className="text-right py-1.5 px-2 text-muted-foreground">D_req (mm)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.caseResults.map((cr, i) => (
                          <tr key={i} className={`border-b border-muted/30 ${cr.caseId === result.governingCaseId ? "bg-primary/5" : ""}`}>
                            <td className="py-1.5 px-2">{cr.caseName} {cr.caseId === result.governingCaseId && <Badge variant="outline" className="text-[10px] ml-1">Gov.</Badge>}</td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">{fmtN(cr.Qg_actual_m3s, 4)}</td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">{fmtN(cr.v_s_max, 4)}</td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">{fmtN(cr.A_req, 4)}</td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">{fmtN(cr.D_req_mm, 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {config.enableDropletCheck && result.caseResults.some(cr => cr.dropletSettlingVelocity !== undefined) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <h3 className="font-semibold text-sm">Droplet Settling Check</h3>
                    </CardHeader>
                    <CardContent className="pt-0 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1.5 px-2 text-muted-foreground">Case</th>
                            <th className="text-right py-1.5 px-2 text-muted-foreground">v_t (m/s)</th>
                            <th className="text-right py-1.5 px-2 text-muted-foreground">v_gas (m/s)</th>
                            <th className="text-right py-1.5 px-2 text-muted-foreground">Re_p</th>
                            <th className="text-center py-1.5 px-2 text-muted-foreground">Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.caseResults.filter(cr => cr.dropletSettlingVelocity !== undefined).map((cr, i) => (
                            <tr key={i} className="border-b border-muted/30">
                              <td className="py-1.5 px-2">{cr.caseName}</td>
                              <td className="py-1.5 px-2 text-right font-mono tabular-nums">{fmtN(cr.dropletSettlingVelocity!, 4)}</td>
                              <td className="py-1.5 px-2 text-right font-mono tabular-nums">{fmtN(cr.actualGasVelocity!, 4)}</td>
                              <td className="py-1.5 px-2 text-right font-mono tabular-nums">{fmtN(cr.dropletRe_p!, 3)}</td>
                              <td className="py-1.5 px-2 text-center">
                                {cr.dropletCarryoverRisk
                                  ? <Badge variant="destructive" className="text-[10px]">Carryover</Badge>
                                  : <Badge variant="secondary" className="text-[10px]">OK</Badge>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="holdup">
          <div className="space-y-4">
            <StepHeader step={6} title="Liquid Holdup & Surge" desc="Define residence time, surge time and slug volume requirements." />

            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Droplets className="w-4 h-4" /> Residence Time</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1 block">Residence Time (min)</Label>
                    <NumericInput value={holdup.residenceTime} onValueChange={v => updateHoldup("residenceTime", v)} data-testid="input-res-time" /></div>
                  <div><Label className="text-xs mb-1 block">Surge Time (min)</Label>
                    <NumericInput value={holdup.surgeTime} onValueChange={v => updateHoldup("surgeTime", v)} data-testid="input-surge-time" /></div>
                </div>
                {config.phaseMode === "three_phase" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1 block">Oil Retention Time (min)</Label>
                      <NumericInput value={holdup.oilRetentionTime} onValueChange={v => updateHoldup("oilRetentionTime", v)} data-testid="input-oil-ret" /></div>
                    <div><Label className="text-xs mb-1 block">Water Retention Time (min)</Label>
                      <NumericInput value={holdup.waterRetentionTime} onValueChange={v => updateHoldup("waterRetentionTime", v)} data-testid="input-water-ret" /></div>
                  </div>
                )}
                {(config.serviceType === "slug_catcher" || config.serviceType === "inlet_separator") && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1 block">Slug Volume (m\u00B3)</Label>
                      <NumericInput value={holdup.slugVolume} onValueChange={v => updateHoldup("slugVolume", v)} data-testid="input-slug-vol" /></div>
                    <div><Label className="text-xs mb-1 block">Drain Rate (m\u00B3/h)</Label>
                      <NumericInput value={holdup.drainRate} onValueChange={v => updateHoldup("drainRate", v)} data-testid="input-drain-rate" /></div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleCalculate} data-testid="button-calculate-main">
                <Calculator className="w-3.5 h-3.5 mr-1" /> {result ? "Recalculate" : "Calculate"}
              </Button>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                <AlertTriangle className="w-4 h-4 inline mr-2" />{error}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="geometry">
          <div className="space-y-4">
            <StepHeader step={7} title="Vessel Geometry" desc="Vessel dimensions and geometry breakdown." />

            {!result ? (
              <Card><CardContent className="py-10 text-center">
                <Box className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Complete Holdup tab and calculate first.</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("holdup")} data-testid="button-go-holdup-2">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Go to Holdup
                </Button>
              </CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm">Geometry Steps</h3>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0">
                    {result.geometry.steps.map((s, i) => (
                      <EqLine key={i} eq={s.label} val={`${fmtN(s.result)} ${s.unit}`} sub={s.equation} />
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-semibold text-sm">Vessel Dimensions</h3>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-0.5">
                      {[
                        { label: "Diameter", value: `${fmtN(result.geometry.D_mm, 0)} mm`, hl: true },
                        { label: config.orientation === "vertical" ? "Height (T-T)" : "Length (T-T)", value: `${fmtN(result.geometry.L_mm, 0)} mm`, hl: true },
                        { label: "L/D Ratio", value: fmtN(result.geometry.LD_ratio), hl: false },
                        { label: "Vessel Volume", value: `${fmtN(result.geometry.vesselVolume_m3)} m\u00B3`, hl: false },
                        { label: "Liquid Level", value: `${fmtN(result.geometry.liquidLevelPercent)}%`, hl: false },
                        { label: "Actual Gas Velocity", value: `${fmtN(result.geometry.actualGasVelocity, 4)} m/s`, hl: false },
                        { label: "Mist Face Velocity", value: `${fmtN(result.geometry.mistFaceVelocity, 4)} m/s`, hl: false },
                      ].map((r, i) => (
                        <div key={i} className={`flex items-center justify-between py-1.5 px-3 rounded-md ${r.hl ? "bg-primary/10" : i % 2 === 0 ? "bg-muted/40" : ""}`} data-testid={`geo-row-${i}`}>
                          <span className="text-xs text-muted-foreground">{r.label}</span>
                          <span className={`text-xs font-mono font-medium tabular-nums ${r.hl ? "text-primary" : ""}`}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="space-y-4">
            <StepHeader step={8} title="Results & Export" desc="Review complete results, engineering flags, and export the calculation." />

            {!result ? (
              <Card><CardContent className="py-10 text-center">
                <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Complete Holdup tab and calculate first.</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("holdup")} data-testid="button-go-holdup-3">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Go to Holdup
                </Button>
              </CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold">Summary</h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" data-testid="button-export-results">
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-calc-note">
                            <FileText className="w-4 h-4 mr-2 text-red-400" /> Calc Note (Print/PDF)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToPDFUtil(d); }} data-testid="button-export-pdf">
                            <FileText className="w-4 h-4 mr-2 text-red-400" /> Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToExcel(d); }} data-testid="button-export-excel">
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" /> Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToJSON(d); }} data-testid="button-export-json">
                            <Download className="w-4 h-4 mr-2 text-blue-400" /> Export as JSON
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="p-3 rounded-md border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Governing Case</p>
                        <p className="text-sm font-semibold">{result.caseResults.find(c => c.caseId === result.governingCaseId)?.caseName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{result.governingReason}</p>
                      </div>
                      <div className="p-3 rounded-md border bg-primary/5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Diameter</p>
                        <p className="text-lg font-bold text-primary">{fmtN(result.geometry.D_mm, 0)} mm</p>
                      </div>
                      <div className="p-3 rounded-md border bg-primary/5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{config.orientation === "vertical" ? "Height (T-T)" : "Length (T-T)"}</p>
                        <p className="text-lg font-bold text-primary">{fmtN(result.geometry.L_mm, 0)} mm</p>
                      </div>
                    </div>

                    <div className="grid gap-0.5">
                      {[
                        { label: "L/D Ratio", value: fmtN(result.geometry.LD_ratio) },
                        { label: "Vessel Volume", value: `${fmtN(result.geometry.vesselVolume_m3)} m\u00B3` },
                        { label: "Liquid Volume Required", value: `${fmtN(result.geometry.liquidVolume_m3)} m\u00B3` },
                        { label: "Gas Area Fraction", value: `${fmtN(result.geometry.gasAreaFraction * 100)}%` },
                        { label: "Actual Gas Velocity", value: `${fmtN(result.geometry.actualGasVelocity, 4)} m/s` },
                        { label: "Mist Face Velocity", value: `${fmtN(result.geometry.mistFaceVelocity, 4)} m/s` },
                        { label: "Liquid Level", value: `${fmtN(result.geometry.liquidLevelPercent)}%` },
                      ].map((r, i) => (
                        <div key={i} className={`flex items-center justify-between py-1.5 px-3 rounded-md ${i % 2 === 0 ? "bg-muted/40" : ""}`}>
                          <span className="text-xs text-muted-foreground">{r.label}</span>
                          <span className="text-xs font-mono font-medium tabular-nums">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {result.flags.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Engineering Flags
                      </h3>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {result.flags.map(f => (
                          <li key={f} className="text-xs flex items-start gap-2" data-testid={`result-flag-${f}`}>
                            <Badge
                              variant={FLAG_SEVERITY[f] === "error" ? "destructive" : FLAG_SEVERITY[f] === "warning" ? "secondary" : "outline"}
                              className="text-[10px] shrink-0 mt-0.5"
                            >
                              {FLAG_SEVERITY[f]}
                            </Badge>
                            <span className="text-muted-foreground">{FLAG_LABELS[f]}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {result.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-sm">Recommendations</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {result.recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />{r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {result.nextSteps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <h3 className="font-semibold text-sm">Next Steps</h3>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {result.nextSteps.map((ns, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-muted-foreground/60 mt-px shrink-0">{i + 1}.</span>{ns}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <AssumptionsPanel
                  assumptions={result.assumptions}
                  references={[
                    "API 12J: Specification for Oil and Gas Separators",
                    "GPSA Engineering Data Book, Section 7: Separation Equipment",
                    "Arnold & Stewart: Surface Production Operations, Vol. 1",
                    "Stewart & Arnold: Gas\u2013Liquid and Liquid\u2013Liquid Separators",
                  ]}
                />
                <FeedbackSection calculatorName="Separator Sizing" />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {error && activeTab !== "holdup" && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mt-4" data-testid="text-error-global">
          <AlertTriangle className="w-4 h-4 inline mr-2" />{error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-muted/30">
        <Button size="sm" variant="outline" onClick={goPrev} disabled={tabIdx <= 0} data-testid="button-prev">
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        <div className="text-xs text-muted-foreground">
          Step {tabIdx + 1} of {TABS.length}
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "holdup" && activeTab !== "results" && (
            <Button size="sm" variant="outline" onClick={goNext} disabled={tabIdx >= TABS.length - 1} data-testid="button-next">
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
          {activeTab === "holdup" && (
            <>
              {result && (
                <Button size="sm" variant="outline" onClick={goNext} data-testid="button-next">
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </>
          )}
          {activeTab === "results" && result && (
            <Button size="sm" variant="outline" onClick={() => setActiveTab("holdup")} data-testid="button-back-to-calc">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Recalculate
            </Button>
          )}
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

function EqLine({ eq, val, highlight, sub }: { eq: string; val: string; highlight?: boolean; sub?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 px-3 py-1.5 rounded-md font-mono text-xs
      ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}>
      <span className="text-muted-foreground">{eq}</span>
      <span className={`font-semibold tabular-nums shrink-0 ${highlight ? "text-primary" : ""}`}>
        = {val}
        {sub && <span className="text-muted-foreground/60 font-normal ml-1">{sub}</span>}
      </span>
    </div>
  );
}

function buildCalcNoteHTML(result: SeparatorFullResult, gov: CaseGasResult | undefined, project: ProjectSetup): string {
  const stepsHTML = gov ? gov.steps.map(s =>
    `<tr><td>${s.label}</td><td><code>${s.equation}</code></td><td>${s.substitution}</td><td><strong>${typeof s.result === "number" ? s.result.toFixed(4) : s.result}</strong> ${s.unit}</td></tr>`
  ).join("\n") : "";

  const holdupHTML = result.holdupSteps.map(s =>
    `<tr><td>${s.label}</td><td><code>${s.equation}</code></td><td>${s.substitution}</td><td><strong>${typeof s.result === "number" ? s.result.toFixed(4) : s.result}</strong> ${s.unit}</td></tr>`
  ).join("\n");

  const geoHTML = result.geometry.steps.map(s =>
    `<tr><td>${s.label}</td><td><code>${s.equation}</code></td><td>${s.substitution}</td><td><strong>${typeof s.result === "number" ? s.result.toFixed(4) : s.result}</strong> ${s.unit}</td></tr>`
  ).join("\n");

  const flagsHTML = result.flags.map(f =>
    `<li style="color: ${FLAG_SEVERITY[f] === "error" ? "#e74c3c" : FLAG_SEVERITY[f] === "warning" ? "#f39c12" : "#3498db"}">${FLAG_LABELS[f]}</li>`
  ).join("\n");

  const assumptionsHTML = result.assumptions.map(a => `<li>${a}</li>`).join("\n");
  const recsHTML = result.recommendations.map(r => `<li>${r}</li>`).join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Separator Calc Note \u2014 ${project.caseName || "Untitled"}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; font-size: 12px; color: #222; }
  h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 14px; margin-top: 20px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; font-size: 11px; }
  th { background: #f5f5f5; }
  code { background: #f0f0f0; padding: 1px 4px; font-size: 10px; }
  .summary-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; }
  .disclaimer { margin-top: 20px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; font-size: 11px; }
  @media print { body { margin: 0; padding: 10px; } h1 { font-size: 16px; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style></head><body>
<h1>Separator Sizing \u2014 Calculation Note</h1>
<div class="summary-row"><span>Case: ${project.caseName}</span><span>Engineer: ${project.engineer}</span><span>Date: ${project.date}</span></div>
<div class="summary-row"><span>Service: ${SERVICE_TYPE_LABELS[result.config.serviceType]}</span><span>Orientation: ${result.config.orientation}</span><span>Phase: ${result.config.phaseMode.replace(/_/g, " ")}</span></div>

<h2>Results Summary</h2>
<table>
<tr><td>Governing Case</td><td>${result.governingReason}</td></tr>
<tr><td>Vessel Diameter</td><td>${result.geometry.D_mm} mm</td></tr>
<tr><td>${result.config.orientation === "vertical" ? "Height" : "Length"} (T-T)</td><td>${result.geometry.L_mm} mm</td></tr>
<tr><td>L/D Ratio</td><td>${result.geometry.LD_ratio.toFixed(2)}</td></tr>
<tr><td>Vessel Volume</td><td>${result.geometry.vesselVolume_m3.toFixed(3)} m\u00B3</td></tr>
<tr><td>Gas Velocity</td><td>${result.geometry.actualGasVelocity.toFixed(4)} m/s</td></tr>
<tr><td>Liquid Level</td><td>${result.geometry.liquidLevelPercent.toFixed(1)}%</td></tr>
</table>

${stepsHTML ? `<h2>Gas Sizing Steps</h2><table><tr><th>Step</th><th>Equation</th><th>Substitution</th><th>Result</th></tr>${stepsHTML}</table>` : ""}

<h2>Holdup Steps</h2>
<table><tr><th>Step</th><th>Equation</th><th>Substitution</th><th>Result</th></tr>${holdupHTML}</table>

<h2>Geometry Steps</h2>
<table><tr><th>Step</th><th>Equation</th><th>Substitution</th><th>Result</th></tr>${geoHTML}</table>

<h2>Assumptions</h2><ul>${assumptionsHTML}</ul>

${result.flags.length > 0 ? `<h2>Engineering Flags</h2><ul>${flagsHTML}</ul>` : ""}
${result.recommendations.length > 0 ? `<h2>Recommendations</h2><ul>${recsHTML}</ul>` : ""}

<div class="disclaimer">DISCLAIMER: This document is generated for preliminary screening purposes only. For project-critical applications, verify against licensed standards and detailed engineering.</div>
</body></html>`;
}
