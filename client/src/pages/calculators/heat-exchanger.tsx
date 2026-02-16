import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import {
  type HXProject, type OperatingCase, type ExchangerConfig, type UInput,
  type HXFullResult, type CaseResult, type StreamSide, type FlowArrangement,
  type FMode, type UMode, type DutyMode, type EngFlag,
  DEFAULT_PROJECT, DEFAULT_CASE, DEFAULT_CONFIG, DEFAULT_U_INPUT, DEFAULT_STREAM,
  HX_TEST_CASE_OIL_COOLER, HX_TEST_CONFIG, HX_TEST_U_INPUT,
  TYPICAL_U_VALUES, FLAG_LABELS, FLAG_SEVERITY,
  calculateHeatExchangerFull,
} from "@/lib/engineering/heatExchanger";
import {
  Thermometer, ClipboardList, Droplets, Settings2, BarChart3,
  Ruler, ShieldCheck, ChevronLeft, ChevronRight, RotateCcw, FlaskConical,
  Plus, Trash2, AlertTriangle, CheckCircle2, Download, Info,
  Calculator, Gauge, Box,
} from "lucide-react";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "streams", label: "Streams", icon: Droplets, step: 2 },
  { id: "config", label: "Config", icon: Settings2, step: 3 },
  { id: "lmtd", label: "LMTD", icon: Calculator, step: 4 },
  { id: "u_area", label: "U & Area", icon: Gauge, step: 5 },
  { id: "geometry", label: "Geometry", icon: Box, step: 6 },
  { id: "results", label: "Results", icon: BarChart3, step: 7 },
];

const pU = (param: string, us: UnitSystem) => getUnit(param, us);

function fmtN(n: number, d = 2): string {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(3);
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(d);
  return n.toPrecision(4);
}

export default function HeatExchangerPage() {
  const [activeTab, setActiveTab] = useState("project");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [project, setProject] = useState<HXProject>({ ...DEFAULT_PROJECT });
  const [cases, setCases] = useState<OperatingCase[]>([{ ...DEFAULT_CASE }]);
  const [config, setConfig] = useState<ExchangerConfig>({ ...DEFAULT_CONFIG });
  const [uInput, setUInput] = useState<UInput>({ ...DEFAULT_U_INPUT });
  const [geoArea, setGeoArea] = useState<string>("");
  const [result, setResult] = useState<HXFullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProject = (k: keyof HXProject, v: unknown) => setProject(p => ({ ...p, [k]: v }));
  const updateConfig = (k: keyof ExchangerConfig, v: unknown) => setConfig(p => ({ ...p, [k]: v }));
  const updateUInput = (k: keyof UInput, v: unknown) => setUInput(p => ({ ...p, [k]: v }));

  const updateCase = (idx: number, k: keyof OperatingCase, v: unknown) =>
    setCases(prev => prev.map((c, i) => i === idx ? { ...c, [k]: v } : c));
  const updateCaseHot = (idx: number, k: keyof StreamSide, v: unknown) =>
    setCases(prev => prev.map((c, i) => i === idx ? { ...c, hotSide: { ...c.hotSide, [k]: v } } : c));
  const updateCaseCold = (idx: number, k: keyof StreamSide, v: unknown) =>
    setCases(prev => prev.map((c, i) => i === idx ? { ...c, coldSide: { ...c.coldSide, [k]: v } } : c));

  const addCase = () => {
    const id = `case_${Date.now()}`;
    setCases(prev => [...prev, {
      ...DEFAULT_CASE,
      id,
      name: `Case ${prev.length + 1}`,
      caseType: "maximum",
      hotSide: { ...DEFAULT_STREAM, name: "Hot Side" },
      coldSide: { ...DEFAULT_STREAM, name: "Cold Side" },
    }]);
  };

  const removeCase = (idx: number) => {
    if (cases.length <= 1) return;
    setCases(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const convertedCases = cases.map(c => {
        const cc = { ...c };
        cc.hotSide = { ...c.hotSide };
        cc.coldSide = { ...c.coldSide };
        if (unitSystem !== "SI") {
          cc.hotSide.tIn = convertToSI("temperature", c.hotSide.tIn, unitSystem);
          cc.hotSide.tOut = convertToSI("temperature", c.hotSide.tOut, unitSystem);
          cc.coldSide.tIn = convertToSI("temperature", c.coldSide.tIn, unitSystem);
          cc.coldSide.tOut = convertToSI("temperature", c.coldSide.tOut, unitSystem);
          cc.hotSide.mDot = convertToSI("flowMass", c.hotSide.mDot, unitSystem);
          cc.coldSide.mDot = convertToSI("flowMass", c.coldSide.mDot, unitSystem);
        }
        return cc;
      });

      const geo = geoArea ? parseFloat(geoArea) : undefined;
      const r = calculateHeatExchangerFull(project, convertedCases, config, uInput, geo);
      setResult(r);
      setActiveTab("lmtd");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null); setResult(null);
    setProject({ ...DEFAULT_PROJECT, name: "Oil Cooler HX", caseId: "HX-001", engineer: "HEM" });
    setCases([{ ...HX_TEST_CASE_OIL_COOLER }]);
    setConfig({ ...HX_TEST_CONFIG });
    setUInput({ ...HX_TEST_U_INPUT });
    setGeoArea("");
  };

  const handleReset = () => {
    setProject({ ...DEFAULT_PROJECT });
    setCases([{ ...DEFAULT_CASE }]);
    setConfig({ ...DEFAULT_CONFIG });
    setUInput({ ...DEFAULT_U_INPUT });
    setGeoArea("");
    setResult(null); setError(null);
    setActiveTab("project");
  };

  const handleExportJSON = () => {
    const data = { project, cases, config, uInput, geoArea, result };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hx_sizing_${project.caseId || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.project) setProject(data.project);
        if (data.cases) setCases(data.cases);
        if (data.config) setConfig(data.config);
        if (data.uInput) setUInput(data.uInput);
        if (data.geoArea) setGeoArea(data.geoArea);
        setResult(null); setError(null);
      } catch { setError("Invalid JSON file"); }
    };
    reader.readAsText(file);
  };

  const handleExportHTML = () => {
    if (!result || !result.governingCase) return;
    const gc = result.governingCase;
    const html = buildCalcNoteHTML(result, gc, project);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hx_calc_note_${project.caseId || "export"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Heat Exchanger Sizing</h1>
            <p className="text-sm text-muted-foreground">LMTD method with F-correction factor</p>
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

      {result && result.globalFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" data-testid="flags-banner">
          {result.globalFlags.map(f => (
            <Badge key={f} variant={FLAG_SEVERITY[f] === "error" ? "destructive" : "secondary"} className="text-xs" data-testid={`flag-${f}`}>
              {FLAG_SEVERITY[f] === "error" ? <AlertTriangle className="w-3 h-3 mr-1" /> :
               FLAG_SEVERITY[f] === "warning" ? <AlertTriangle className="w-3 h-3 mr-1" /> :
               <Info className="w-3 h-3 mr-1" />}
              {f.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs gap-1" data-testid={`tab-${t.id}`}>
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.step}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="project">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Project Setup</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Case Name / ID</Label>
                  <Input value={project.name} onChange={e => updateProject("name", e.target.value)} data-testid="input-case-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Case Number</Label>
                  <Input value={project.caseId} onChange={e => updateProject("caseId", e.target.value)} data-testid="input-case-id" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => updateProject("engineer", e.target.value)} data-testid="input-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => updateProject("date", e.target.value)} data-testid="input-date" /></div>
              </div>
              <div className="pt-2 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Calculation Options</p>
                <div className="flex items-center gap-2">
                  <Checkbox checked={project.strictEnergyBalance} onCheckedChange={v => updateProject("strictEnergyBalance", v)} id="strict-eb" data-testid="check-strict-eb" />
                  <Label htmlFor="strict-eb" className="text-xs">Strict energy balance enforcement</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={project.allowApproxF} onCheckedChange={v => updateProject("allowApproxF", v)} id="approx-f" data-testid="check-approx-f" />
                  <Label htmlFor="approx-f" className="text-xs">Allow approximate F correlation</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={project.allowEstimatedU} onCheckedChange={v => updateProject("allowEstimatedU", v)} id="est-u" data-testid="check-est-u" />
                  <Label htmlFor="est-u" className="text-xs">Allow approximate U estimation</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={project.showSteps} onCheckedChange={v => updateProject("showSteps", v)} id="show-steps" data-testid="check-show-steps" />
                  <Label htmlFor="show-steps" className="text-xs">Show step-by-step calculation trace</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs whitespace-nowrap">Energy balance tolerance (%)</Label>
                  <Input type="number" className="w-20" value={project.balanceTolerance} onChange={e => updateProject("balanceTolerance", parseFloat(e.target.value) || 5)} data-testid="input-balance-tol" />
                </div>
              </div>
              <div className="pt-2 border-t flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleExportJSON} data-testid="button-save-json">
                  <Download className="w-3.5 h-3.5 mr-1" /> Save JSON
                </Button>
                <label>
                  <Button size="sm" variant="outline" asChild><span><ClipboardList className="w-3.5 h-3.5 mr-1" /> Load JSON</span></Button>
                  <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} data-testid="input-load-json" />
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streams">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">Operating Cases & Stream Data</h3>
              <Button size="sm" variant="outline" onClick={addCase} data-testid="button-add-case">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Case
              </Button>
            </div>
            {unitSystem === "Field" && (
              <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                <Info className="w-3 h-3 inline mr-1" />
                Temperatures in {pU("temperature", unitSystem)}, flows in {pU("flowMass", unitSystem)}. Cp is always in kJ/(kg·K) per industry convention.
              </p>
            )}
            {cases.map((c, idx) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input className="w-40 h-8 text-xs" value={c.name} onChange={e => updateCase(idx, "name", e.target.value)} data-testid={`input-case-name-${idx}`} />
                      <Select value={c.caseType} onValueChange={v => updateCase(idx, "caseType", v)}>
                        <SelectTrigger className="w-28 h-8 text-xs" data-testid={`select-case-type-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="minimum">Minimum</SelectItem>
                          <SelectItem value="maximum">Maximum</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={c.dutyMode} onValueChange={v => updateCase(idx, "dutyMode", v as DutyMode)}>
                        <SelectTrigger className="w-44 h-8 text-xs" data-testid={`select-duty-mode-${idx}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both_outlets_known">Both outlets known</SelectItem>
                          <SelectItem value="one_outlet_unknown">One outlet unknown</SelectItem>
                          <SelectItem value="duty_given">Duty given</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {cases.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeCase(idx)} data-testid={`button-remove-case-${idx}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {c.dutyMode === "duty_given" && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Duty (kW)</Label>
                      <Input type="number" className="w-32 h-8 text-xs" value={c.dutyKW || ""} onChange={e => updateCase(idx, "dutyKW", parseFloat(e.target.value) || 0)} data-testid={`input-duty-${idx}`} />
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-red-400/80">Hot Side</p>
                      <div className="grid gap-2 grid-cols-2">
                        <div><Label className="text-xs mb-1 block">T_in ({pU("temperature", unitSystem)})</Label>
                          <Input type="number" className="h-8 text-xs" value={c.hotSide.tIn || ""} onChange={e => updateCaseHot(idx, "tIn", parseFloat(e.target.value) || 0)} data-testid={`input-thi-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">T_out ({pU("temperature", unitSystem)}){c.dutyMode === "one_outlet_unknown" && !c.hotSide.tOutKnown ? " (auto)" : ""}</Label>
                          <Input type="number" className="h-8 text-xs" value={c.hotSide.tOut || ""} onChange={e => updateCaseHot(idx, "tOut", parseFloat(e.target.value) || 0)}
                            disabled={c.dutyMode === "one_outlet_unknown" && !c.hotSide.tOutKnown}
                            data-testid={`input-tho-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">Flow ({pU("flowMass", unitSystem)})</Label>
                          <Input type="number" className="h-8 text-xs" value={c.hotSide.mDot || ""} onChange={e => updateCaseHot(idx, "mDot", parseFloat(e.target.value) || 0)} data-testid={`input-hot-flow-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">Cp (kJ/(kg·K))</Label>
                          <Input type="number" className="h-8 text-xs" value={c.hotSide.cp || ""} onChange={e => updateCaseHot(idx, "cp", parseFloat(e.target.value) || 0)} data-testid={`input-hot-cp-${idx}`} /></div>
                      </div>
                      {c.dutyMode === "one_outlet_unknown" && (
                        <div className="flex items-center gap-2">
                          <Checkbox checked={c.hotSide.tOutKnown} onCheckedChange={v => {
                            updateCaseHot(idx, "tOutKnown", !!v);
                            if (v) updateCaseCold(idx, "tOutKnown", false);
                          }} id={`hot-out-known-${idx}`} data-testid={`check-hot-out-known-${idx}`} />
                          <Label htmlFor={`hot-out-known-${idx}`} className="text-xs">Hot outlet known</Label>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-blue-400/80">Cold Side</p>
                      <div className="grid gap-2 grid-cols-2">
                        <div><Label className="text-xs mb-1 block">T_in ({pU("temperature", unitSystem)})</Label>
                          <Input type="number" className="h-8 text-xs" value={c.coldSide.tIn || ""} onChange={e => updateCaseCold(idx, "tIn", parseFloat(e.target.value) || 0)} data-testid={`input-tci-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">T_out ({pU("temperature", unitSystem)}){c.dutyMode === "one_outlet_unknown" && !c.coldSide.tOutKnown ? " (auto)" : ""}</Label>
                          <Input type="number" className="h-8 text-xs" value={c.coldSide.tOut || ""} onChange={e => updateCaseCold(idx, "tOut", parseFloat(e.target.value) || 0)}
                            disabled={c.dutyMode === "one_outlet_unknown" && !c.coldSide.tOutKnown}
                            data-testid={`input-tco-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">Flow ({pU("flowMass", unitSystem)})</Label>
                          <Input type="number" className="h-8 text-xs" value={c.coldSide.mDot || ""} onChange={e => updateCaseCold(idx, "mDot", parseFloat(e.target.value) || 0)} data-testid={`input-cold-flow-${idx}`} /></div>
                        <div><Label className="text-xs mb-1 block">Cp (kJ/(kg·K))</Label>
                          <Input type="number" className="h-8 text-xs" value={c.coldSide.cp || ""} onChange={e => updateCaseCold(idx, "cp", parseFloat(e.target.value) || 0)} data-testid={`input-cold-cp-${idx}`} /></div>
                      </div>
                      {c.dutyMode === "one_outlet_unknown" && (
                        <div className="flex items-center gap-2">
                          <Checkbox checked={c.coldSide.tOutKnown} onCheckedChange={v => {
                            updateCaseCold(idx, "tOutKnown", !!v);
                            if (v) updateCaseHot(idx, "tOutKnown", false);
                          }} id={`cold-out-known-${idx}`} data-testid={`check-cold-out-known-${idx}`} />
                          <Label htmlFor={`cold-out-known-${idx}`} className="text-xs">Cold outlet known</Label>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Exchanger Configuration</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Flow Arrangement</Label>
                  <Select value={config.arrangement} onValueChange={v => updateConfig("arrangement", v as FlowArrangement)}>
                    <SelectTrigger data-testid="select-arrangement"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="counter_current">Counter-Current (F = 1)</SelectItem>
                      <SelectItem value="co_current">Co-Current (F = 1)</SelectItem>
                      <SelectItem value="1_2_pass">1-2 Shell & Tube (F &lt; 1)</SelectItem>
                      <SelectItem value="custom_F">Custom (user-entered F)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(config.arrangement === "1_2_pass") && (
                  <div>
                    <Label className="text-xs mb-1.5 block">F-Factor Mode</Label>
                    <Select value={config.fMode} onValueChange={v => updateConfig("fMode", v as FMode)}>
                      <SelectTrigger data-testid="select-f-mode"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_entered">User-entered F</SelectItem>
                        {project.allowApproxF && (
                          <SelectItem value="approximate_correlation">Approximate correlation</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(config.arrangement === "custom_F" || (config.arrangement === "1_2_pass" && config.fMode === "user_entered")) && (
                  <div>
                    <Label className="text-xs mb-1.5 block">F-Factor Value (0.5–1.0)</Label>
                    <Input type="number" min={0.5} max={1} step={0.01} value={config.fValue} onChange={e => updateConfig("fValue", parseFloat(e.target.value) || 1)} data-testid="input-f-value" />
                    <p className="text-xs text-muted-foreground mt-1">Typical range: 0.75–1.0. Below 0.75 indicates inefficient configuration.</p>
                  </div>
                )}
                {config.arrangement === "1_2_pass" && config.fMode === "approximate_correlation" && (
                  <div className="sm:col-span-2 p-3 rounded-md bg-amber-950/30 text-amber-200 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                    F-factor will be computed from an approximate correlation (Bowman et al.) — verify with TEMA charts or vendor data for final design.
                  </div>
                )}
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Pass Information</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Shell Passes</Label>
                    <Input type="number" min={1} value={config.shellPasses} onChange={e => updateConfig("shellPasses", parseInt(e.target.value) || 1)} data-testid="input-shell-passes" /></div>
                  <div><Label className="text-xs mb-1.5 block">Tube Passes</Label>
                    <Input type="number" min={1} value={config.tubePasses} onChange={e => updateConfig("tubePasses", parseInt(e.target.value) || 1)} data-testid="input-tube-passes" /></div>
                  <div><Label className="text-xs mb-1.5 block">Min Approach Temp ({pU("temperature", unitSystem)})</Label>
                    <Input type="number" value={config.approachTempMin} onChange={e => updateConfig("approachTempMin", parseFloat(e.target.value) || 5)} data-testid="input-approach" /></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lmtd">
          <div className="space-y-4">
            {!result && (
              <Card><CardContent className="py-8 text-center">
                <Calculator className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Configure streams and click Calculate to see LMTD results</p>
                <Button onClick={handleCalculate} data-testid="button-calculate-lmtd">Calculate</Button>
              </CardContent></Card>
            )}
            {result && result.cases.map((cr, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{cr.caseName} — LMTD Analysis</h3>
                    <Badge variant="secondary" className="text-xs">{cr.caseType}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                    <ResultBox label="Duty" value={`${fmtN(cr.dutyKW)} kW`} />
                    <ResultBox label="ΔT1" value={`${fmtN(cr.dT1)} °C`} />
                    <ResultBox label="ΔT2" value={`${fmtN(cr.dT2)} °C`} />
                    <ResultBox label="LMTD" value={`${fmtN(cr.lmtd)} °C`} highlight />
                  </div>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                    <ResultBox label="R" value={fmtN(cr.R, 4)} />
                    <ResultBox label="P" value={fmtN(cr.P, 4)} />
                    <ResultBox label="F" value={fmtN(cr.F, 4)} highlight={cr.F < 0.8} />
                    <ResultBox label="F × LMTD" value={`${fmtN(cr.correctedLMTD)} °C`} highlight />
                  </div>
                  {project.showSteps && cr.trace.steps.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Calculation Trace</p>
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {cr.trace.steps.filter(s =>
                          s.name.includes("ΔT") || s.name.includes("LMTD") || s.name.includes("F-factor") || s.name.includes("R and P") || s.name.includes("Corrected") || s.name.includes("Duty") || s.name.includes("capacity") || s.name.includes("outlet")
                        ).map((step, si) => (
                          <div key={si} className="text-xs bg-muted/30 p-2 rounded-md font-mono">
                            <span className="text-muted-foreground">{step.name}:</span>{" "}
                            <span className="text-primary/80">{step.equation}</span>
                            <br />
                            <span className="text-muted-foreground/70">{step.substitution}</span>
                            <span className="text-foreground font-medium"> = {step.result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {cr.trace.warnings.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      {cr.trace.warnings.map((w, wi) => (
                        <div key={wi} className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950/30 p-2 rounded-md">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="u_area">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Overall U & Fouling</h3></CardHeader>
              <CardContent className="space-y-4 pt-0">
                {unitSystem === "Field" && (
                  <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                    <Info className="w-3 h-3 inline mr-1" />
                    U values in W/(m²·K), fouling in m²·K/W, area in m² — SI standard per TEMA convention.
                  </p>
                )}
                <div>
                  <Label className="text-xs mb-1.5 block">U Handling Mode</Label>
                  <Select value={uInput.mode} onValueChange={v => updateUInput("mode", v as UMode)}>
                    <SelectTrigger data-testid="select-u-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clean_plus_fouling">U_clean + Fouling Resistances</SelectItem>
                      <SelectItem value="fouled_direct">U_fouled (direct entry)</SelectItem>
                      {project.allowEstimatedU && (
                        <SelectItem value="estimated">Estimate from service category</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {uInput.mode === "clean_plus_fouling" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">U_clean (W/(m²·K))</Label>
                      <Input type="number" value={uInput.uClean || ""} onChange={e => updateUInput("uClean", parseFloat(e.target.value) || 0)} data-testid="input-u-clean" /></div>
                    <div>
                      <Label className="text-xs mb-1.5 block">U Guidance (typical values)</Label>
                      <Select onValueChange={v => {
                        const svc = TYPICAL_U_VALUES[v];
                        if (svc) updateUInput("uClean", svc.typical);
                      }}>
                        <SelectTrigger data-testid="select-u-guidance"><SelectValue placeholder="Select service..." /></SelectTrigger>
                        <SelectContent>{Object.entries(TYPICAL_U_VALUES).map(([k, v]) =>
                          <SelectItem key={k} value={k}>{k} ({v.low}–{v.high})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs mb-1.5 block">Rf_hot (m²·K/W)</Label>
                      <Input type="number" step="0.0001" value={uInput.rfHot || ""} onChange={e => updateUInput("rfHot", parseFloat(e.target.value) || 0)} data-testid="input-rf-hot" /></div>
                    <div><Label className="text-xs mb-1.5 block">Rf_cold (m²·K/W)</Label>
                      <Input type="number" step="0.0001" value={uInput.rfCold || ""} onChange={e => updateUInput("rfCold", parseFloat(e.target.value) || 0)} data-testid="input-rf-cold" /></div>
                  </div>
                )}
                {uInput.mode === "fouled_direct" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">U_fouled (W/(m²·K))</Label>
                      <Input type="number" value={uInput.uFouled || ""} onChange={e => updateUInput("uFouled", parseFloat(e.target.value) || 0)} data-testid="input-u-fouled" /></div>
                  </div>
                )}
                {uInput.mode === "estimated" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-amber-950/30 text-amber-200 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                      U estimated from service category — HIGH UNCERTAINTY. Verify with vendor or detailed analysis.
                    </div>
                    <div><Label className="text-xs mb-1.5 block">Service Category</Label>
                      <Select value={uInput.serviceCategory} onValueChange={v => updateUInput("serviceCategory", v)}>
                        <SelectTrigger data-testid="select-service-cat"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{Object.entries(TYPICAL_U_VALUES).map(([k, v]) =>
                          <SelectItem key={k} value={k}>{k} ({v.low}–{v.high} W/(m²·K))</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Design Margin (%)</Label>
                      <Input type="number" value={uInput.designMargin} onChange={e => updateUInput("designMargin", parseFloat(e.target.value) || 0)} data-testid="input-margin" /></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}
            <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
              Calculate Heat Exchanger
            </Button>

            {result && result.cases.map((cr, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <h3 className="font-semibold text-sm">{cr.caseName} — Area Results</h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                    <ResultBox label="U_fouled" value={`${fmtN(cr.uFouled)} W/(m²·K)`} />
                    <ResultBox label="UA_req" value={`${fmtN(cr.uaReq)} W/K`} />
                    <ResultBox label="A_req" value={`${fmtN(cr.aReq)} m²`} />
                    <ResultBox label="A_design" value={`${fmtN(cr.aDesign)} m²`} highlight />
                    <ResultBox label="Fouling Rf" value={`${cr.totalFoulingResistance.toExponential(3)} m²·K/W`} />
                    <ResultBox label="Approach" value={`${fmtN(cr.approachTemp)} °C`} highlight={cr.approachTemp < 5} />
                  </div>
                  {project.showSteps && (
                    <div className="pt-2 mt-2 border-t space-y-1 max-h-48 overflow-y-auto">
                      {cr.trace.steps.filter(s =>
                        s.name.includes("U_fouled") || s.name.includes("Fouling") || s.name.includes("UA") || s.name.includes("area") || s.name.includes("Area")
                      ).map((step, si) => (
                        <div key={si} className="text-xs bg-muted/30 p-2 rounded-md font-mono">
                          <span className="text-muted-foreground">{step.name}:</span>{" "}
                          <span className="text-primary/80">{step.equation}</span>
                          <br />
                          <span className="text-muted-foreground/70">{step.substitution}</span>
                          <span className="text-foreground font-medium"> = {step.result}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="geometry">
          <Card>
            <CardHeader className="pb-3"><h3 className="font-semibold text-sm">Geometry & Preliminary Selection</h3></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-xs text-muted-foreground">
                Enter a candidate area to check achieved duty. Geometry and baffle design not included — vendor rating required.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Selected Area A (m²)</Label>
                  <Input type="number" value={geoArea} onChange={e => setGeoArea(e.target.value)} placeholder="e.g. 50" data-testid="input-geo-area" /></div>
              </div>
              {geoArea && result?.governingCase && (
                <div className="space-y-2">
                  <Button size="sm" onClick={handleCalculate} data-testid="button-check-geometry">Check Area</Button>
                  {result.geometry && (
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                      <ResultBox label="A selected" value={`${fmtN(result.geometry.aSelected)} m²`} />
                      <ResultBox label="Q achieved" value={`${fmtN(result.geometry.qAchieved)} kW`} />
                      <ResultBox label="Excess area" value={`${fmtN(result.geometry.excessArea)}%`} highlight={result.geometry.excessArea < 0} />
                    </div>
                  )}
                </div>
              )}
              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
                Geometry and baffle design are not included in this preliminary sizing tool. Final design requires vendor thermal rating software.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <div className="space-y-4">
            {!result && (
              <Card><CardContent className="py-12 text-center">
                <Thermometer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Enter parameters and click Calculate</p>
                <Button onClick={handleCalculate} data-testid="button-calculate-results">Calculate</Button>
              </CardContent></Card>
            )}
            {result && (
              <>
                {result.governingCase && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <h3 className="font-semibold">Results Summary — {result.governingCase.caseName} (Governing)</h3>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={handleExportJSON} data-testid="button-export-json">
                            <Download className="w-3.5 h-3.5 mr-1" /> JSON
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleExportHTML} data-testid="button-export-html">
                            <Download className="w-3.5 h-3.5 mr-1" /> Calc Note
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <SummaryTable cr={result.governingCase} />
                    </CardContent>
                  </Card>
                )}

                {result.cases.length > 1 && (
                  <Card>
                    <CardHeader className="pb-2"><h3 className="font-semibold text-sm">Case Comparison</h3></CardHeader>
                    <CardContent className="pt-0 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1.5 px-2 text-muted-foreground">Parameter</th>
                            {result.cases.map((cr, i) => (
                              <th key={i} className="text-right py-1.5 px-2">{cr.caseName}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: "Duty (kW)", key: "dutyKW" },
                            { label: "LMTD (°C)", key: "lmtd" },
                            { label: "F", key: "F" },
                            { label: "Corrected LMTD (°C)", key: "correctedLMTD" },
                            { label: "A_req (m²)", key: "aReq" },
                            { label: "A_design (m²)", key: "aDesign" },
                          ].map(row => (
                            <tr key={row.key} className="border-b border-muted/30">
                              <td className="py-1.5 px-2 text-muted-foreground">{row.label}</td>
                              {result.cases.map((cr, i) => (
                                <td key={i} className="py-1.5 px-2 text-right font-mono tabular-nums">
                                  {fmtN((cr as unknown as Record<string, number>)[row.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="py-3">
                    <p className="text-xs text-muted-foreground italic" data-testid="text-disclaimer">{result.disclaimer}</p>
                  </CardContent>
                </Card>

                <AssumptionsPanel
                  assumptions={result.governingCase?.trace.assumptions ?? []}
                  references={[
                    "Kern, D.Q. Process Heat Transfer (1950)",
                    "TEMA Standards, 10th Edition",
                    "Perry's Chemical Engineers' Handbook, Section 11",
                    "Bowman, Mueller & Nagle, Trans. ASME 62 (1940)",
                    "Ludwig, E.E. Applied Process Design, Vol. 3",
                  ]}
                />
                <FeedbackSection calculatorName="Heat Exchanger" />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-2 mt-4">
        <Button size="sm" variant="outline" onClick={goPrev} disabled={tabIdx <= 0} data-testid="button-prev">
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        {activeTab !== "results" ? (
          <Button size="sm" onClick={goNext} data-testid="button-next">
            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleCalculate} data-testid="button-recalculate">
            Recalculate
          </Button>
        )}
      </div>
    </div>
  );
}

function ResultBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded-md text-center ${highlight ? "bg-primary/10" : "bg-muted/30"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-mono font-medium tabular-nums">{value}</div>
    </div>
  );
}

function SummaryTable({ cr }: { cr: CaseResult }) {
  const rows = [
    { label: "Heat Duty", value: `${fmtN(cr.dutyKW)} kW`, hl: false },
    { label: "Hot Side Duty", value: `${fmtN(cr.hotDutyKW)} kW`, hl: false },
    { label: "Cold Side Duty", value: `${fmtN(cr.coldDutyKW)} kW`, hl: false },
    { label: "ΔT1", value: `${fmtN(cr.dT1)} °C`, hl: false },
    { label: "ΔT2", value: `${fmtN(cr.dT2)} °C`, hl: false },
    { label: "LMTD", value: `${fmtN(cr.lmtd)} °C`, hl: false },
    { label: "R (capacity ratio)", value: fmtN(cr.R, 4), hl: false },
    { label: "P (effectiveness)", value: fmtN(cr.P, 4), hl: false },
    { label: "F (correction factor)", value: fmtN(cr.F, 4), hl: cr.F < 0.8 },
    { label: "Corrected LMTD", value: `${fmtN(cr.correctedLMTD)} °C`, hl: true },
    { label: "U_clean", value: `${fmtN(cr.uClean)} W/(m²·K)`, hl: false },
    { label: "U_fouled", value: `${fmtN(cr.uFouled)} W/(m²·K)`, hl: false },
    { label: "Total Rf", value: `${cr.totalFoulingResistance.toExponential(3)} m²·K/W`, hl: false },
    { label: "UA_req", value: `${fmtN(cr.uaReq)} W/K`, hl: false },
    { label: "A_req", value: `${fmtN(cr.aReq)} m²`, hl: false },
    { label: "A_design", value: `${fmtN(cr.aDesign)} m²`, hl: true },
    { label: "Approach Temp", value: `${fmtN(cr.approachTemp)} °C`, hl: cr.approachTemp < 5 },
  ];
  return (
    <div className="grid gap-1">
      {rows.map((r, i) => (
        <div key={i} className={`flex items-center justify-between py-1.5 px-3 rounded-md ${r.hl ? "bg-primary/10" : i % 2 === 0 ? "bg-muted/50" : ""}`} data-testid={`result-row-${i}`}>
          <span className="text-xs text-muted-foreground">{r.label}</span>
          <span className="text-xs font-mono font-medium tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function buildCalcNoteHTML(result: HXFullResult, gc: CaseResult, project: HXProject): string {
  const traceHTML = gc.trace.steps.map(s =>
    `<tr><td>${s.name}</td><td><code>${s.equation}</code></td><td>${s.substitution}</td><td><strong>${s.result}</strong></td></tr>`
  ).join("\n");

  const flagsHTML = gc.trace.flags.map(f =>
    `<li style="color: ${FLAG_SEVERITY[f] === "error" ? "#e74c3c" : "#f39c12"}">${FLAG_LABELS[f]}</li>`
  ).join("\n");

  const warningsHTML = gc.trace.warnings.map(w => `<li>${w}</li>`).join("\n");
  const assumptionsHTML = gc.trace.assumptions.map(a => `<li>${a}</li>`).join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>HX Calc Note — ${project.name || project.caseId}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; font-size: 12px; }
  h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 14px; margin-top: 20px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; font-size: 11px; }
  th { background: #f5f5f5; }
  code { background: #f0f0f0; padding: 1px 4px; font-size: 10px; }
  .summary-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; }
  .disclaimer { margin-top: 20px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; font-size: 11px; }
</style></head><body>
<h1>Heat Exchanger Sizing — Calculation Note</h1>
<div class="summary-row"><span>Case: ${project.name} (${project.caseId})</span><span>Engineer: ${project.engineer}</span><span>Date: ${project.date}</span></div>
<div class="summary-row"><span>Basis: LMTD method with F-correction factor</span><span>Arrangement: ${result.config.arrangement.replace(/_/g, " ")}</span></div>

<h2>Stream Data</h2>
<table>
<tr><th></th><th>Hot Side</th><th>Cold Side</th></tr>
<tr><td>Name</td><td>${gc.hotSide.name}</td><td>${gc.coldSide.name}</td></tr>
<tr><td>T_in (°C)</td><td>${gc.hotSide.tIn.toFixed(1)}</td><td>${gc.coldSide.tIn.toFixed(1)}</td></tr>
<tr><td>T_out (°C)</td><td>${gc.hotSide.tOut.toFixed(1)}</td><td>${gc.coldSide.tOut.toFixed(1)}</td></tr>
<tr><td>Flow (kg/h)</td><td>${gc.hotSide.mDot.toFixed(0)}</td><td>${gc.coldSide.mDot.toFixed(0)}</td></tr>
<tr><td>Cp (kJ/(kg·K))</td><td>${gc.hotSide.cp.toFixed(3)}</td><td>${gc.coldSide.cp.toFixed(3)}</td></tr>
</table>

<h2>Results Summary</h2>
<table>
<tr><td>Duty</td><td>${gc.dutyKW.toFixed(2)} kW</td></tr>
<tr><td>LMTD</td><td>${gc.lmtd.toFixed(2)} °C</td></tr>
<tr><td>F-factor</td><td>${gc.F.toFixed(4)}</td></tr>
<tr><td>Corrected LMTD</td><td>${gc.correctedLMTD.toFixed(2)} °C</td></tr>
<tr><td>U_fouled</td><td>${gc.uFouled.toFixed(1)} W/(m²·K)</td></tr>
<tr><td>UA_req</td><td>${gc.uaReq.toFixed(1)} W/K</td></tr>
<tr><td>A_req</td><td>${gc.aReq.toFixed(2)} m²</td></tr>
<tr><td>A_design</td><td>${gc.aDesign.toFixed(2)} m²</td></tr>
</table>

<h2>Step-by-Step Calculations</h2>
<table><tr><th>Step</th><th>Equation</th><th>Substitution</th><th>Result</th></tr>
${traceHTML}
</table>

<h2>Assumptions</h2><ul>${assumptionsHTML}</ul>

${gc.trace.flags.length > 0 ? `<h2>Engineering Flags</h2><ul>${flagsHTML}</ul>` : ""}
${gc.trace.warnings.length > 0 ? `<h2>Warnings</h2><ul>${warningsHTML}</ul>` : ""}

<div class="disclaimer">${result.disclaimer}</div>

<h2>Next Steps</h2>
<ul>
<li>Confirm U value with vendor or detailed calculation (Bell-Delaware / Kern)</li>
<li>Perform detailed thermal-hydraulic rating (pressure drop, baffle design)</li>
<li>Verify mechanical design (ASME Section VIII, tube sheet, nozzle sizing)</li>
<li>Check fouling allowances against operating experience</li>
</ul>
</body></html>`;
}
