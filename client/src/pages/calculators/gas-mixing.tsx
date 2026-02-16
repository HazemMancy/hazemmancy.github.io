import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { COMMON_GASES } from "@/lib/engineering/constants";
import {
  type GasMixProject, type GasMixComponent, type GasMixStream,
  type GasMixingResult, type MultiStreamResult,
  DEFAULT_PROJECT, createEmptyComponent, nextId,
  calculateGasMixing, calculateMultiStreamMixing,
  GAS_MIXING_TEST_COMPONENTS, MULTI_STREAM_TEST, R_UNIVERSAL,
} from "@/lib/engineering/gasMixing";
import {
  Blend, Plus, Trash2, FlaskConical, RotateCcw, Copy,
  ChevronLeft, ChevronRight, ClipboardList, Beaker, BarChart3, GitMerge,
  AlertTriangle, CheckCircle2, Download,
} from "lucide-react";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "components", label: "Components", icon: Beaker, step: 2 },
  { id: "results", label: "Results", icon: BarChart3, step: 3 },
  { id: "multistream", label: "Multi-Stream", icon: GitMerge, step: 4 },
];

export default function GasMixingPage() {
  const [activeTab, setActiveTab] = useState("project");
  const [project, setProject] = useState<GasMixProject>({ ...DEFAULT_PROJECT });
  const [components, setComponents] = useState<GasMixComponent[]>([createEmptyComponent(), createEmptyComponent()]);
  const [streams, setStreams] = useState<GasMixStream[]>([]);
  const [result, setResult] = useState<GasMixingResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiStreamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalMF = components.reduce((s, c) => s + (c.moleFraction || 0), 0);
  const sumOK = Math.abs(totalMF - 1.0) < 5e-4;

  const updateComponent = (id: string, field: keyof GasMixComponent, value: string | number) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleGasSelect = (id: string, gasName: string) => {
    const gas = COMMON_GASES[gasName];
    if (gas) {
      setComponents(prev => prev.map(c =>
        c.id === id ? { ...c, name: gasName, molecularWeight: gas.mw } : c
      ));
    }
  };

  const addRow = () => setComponents(prev => [...prev, createEmptyComponent()]);
  const removeRow = (id: string) => {
    if (components.length <= 2) return;
    setComponents(prev => prev.filter(c => c.id !== id));
  };
  const duplicateRow = (id: string) => {
    const src = components.find(c => c.id === id);
    if (src) setComponents(prev => [...prev, { ...src, id: nextId() }]);
  };

  const loadTestCase = () => {
    setComponents(GAS_MIXING_TEST_COMPONENTS.map(c => ({ ...c, id: nextId() })));
    setResult(null); setError(null);
  };

  const handleReset = () => {
    setProject({ ...DEFAULT_PROJECT });
    setComponents([createEmptyComponent(), createEmptyComponent()]);
    setStreams([]);
    setResult(null); setMultiResult(null); setError(null);
    setActiveTab("project");
  };

  const handleCalculate = () => {
    setError(null);
    try {
      if (project.normalizationMode === "strict" && !sumOK) {
        throw new Error(`Strict mode: mole fractions sum to ${totalMF.toFixed(6)}, must be 1.0 ± 0.0005`);
      }
      const parsed = components.map((c, i) => {
        if (c.molecularWeight <= 0) throw new Error(`Row ${i + 1} (${c.name || "unnamed"}): MW must be > 0`);
        if (c.moleFraction < 0) throw new Error(`Row ${i + 1}: mole fraction cannot be negative`);
        return { name: c.name || `Component ${i + 1}`, moleFraction: c.moleFraction, molecularWeight: c.molecularWeight };
      });
      setResult(calculateGasMixing({ components: parsed }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadMultiStreamTest = () => {
    const idMap = new Map<string, string>();
    const newComps = MULTI_STREAM_TEST.components.map(c => {
      const newId = nextId();
      idMap.set(c.id, newId);
      return { ...c, id: newId };
    });
    setComponents(newComps);
    setStreams(MULTI_STREAM_TEST.streams.map(s => ({
      ...s, id: nextId(),
      components: s.components.map(sc => ({
        ...sc,
        componentId: idMap.get(sc.componentId) || sc.componentId,
      })),
    })));
    setMultiResult(null);
  };

  const addStream = () => {
    setStreams(prev => [...prev, {
      id: nextId(), name: `Stream ${prev.length + 1}`, molarFlow: 0, flowUnit: "kmol/h",
      components: components.map(c => ({ componentId: c.id, moleFraction: 0 })),
    }]);
  };

  const updateStream = (streamId: string, field: string, value: string | number) => {
    setStreams(prev => prev.map(s => s.id === streamId ? { ...s, [field]: value } : s));
  };

  const updateStreamComp = (streamId: string, compId: string, yi: number) => {
    setStreams(prev => prev.map(s =>
      s.id === streamId ? {
        ...s,
        components: s.components.map(sc =>
          sc.componentId === compId ? { ...sc, moleFraction: yi } : sc
        ),
      } : s
    ));
  };

  const removeStream = (streamId: string) => {
    setStreams(prev => prev.filter(s => s.id !== streamId));
  };

  const handleMultiStreamCalc = () => {
    setError(null);
    try {
      if (streams.length < 2) throw new Error("At least 2 streams required");
      setMultiResult(calculateMultiStreamMixing(streams, components));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Multi-stream error");
      setMultiResult(null);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const exportData = {
      project, components: result.components, mixtureMW: result.mixtureMW,
      rMix: result.rMix, normalization: result.normalizationTrace,
      calcSteps: result.calcSteps, flags: result.flags, timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gas_mixing_${project.caseId || "case"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Blend className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">Gas Mixing Calculator</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Mole-fraction weighted MW + multi-stream mixing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
            <FlaskConical className="w-3.5 h-3.5 mr-1" /> Test Case
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-gasmix">
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
                  <Input value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} data-testid="input-case-name" /></div>
                <div><Label className="text-xs mb-1.5 block">Case ID</Label>
                  <Input value={project.caseId} onChange={e => setProject(p => ({ ...p, caseId: e.target.value }))} data-testid="input-case-id" /></div>
                <div><Label className="text-xs mb-1.5 block">Engineer</Label>
                  <Input value={project.engineer} onChange={e => setProject(p => ({ ...p, engineer: e.target.value }))} data-testid="input-engineer" /></div>
                <div><Label className="text-xs mb-1.5 block">Date</Label>
                  <Input type="date" value={project.date} onChange={e => setProject(p => ({ ...p, date: e.target.value }))} data-testid="input-date" /></div>
                <div><Label className="text-xs mb-1.5 block">MW Units</Label>
                  <Select value={project.mwUnits} onValueChange={v => setProject(p => ({ ...p, mwUnits: v as "kg/kmol" | "g/mol" }))}>
                    <SelectTrigger data-testid="select-mw-units"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg/kmol">kg/kmol</SelectItem>
                      <SelectItem value="g/mol">g/mol</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">Normalization Mode</Label>
                  <Select value={project.normalizationMode} onValueChange={v => setProject(p => ({ ...p, normalizationMode: v as "strict" | "normalize" }))}>
                    <SelectTrigger data-testid="select-norm-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normalize">Allow Normalization</SelectItem>
                      <SelectItem value="strict">Strict (Require Σy = 1.0)</SelectItem>
                    </SelectContent>
                  </Select></div>
              </div>
              <Card className="bg-muted/30"><CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Note: kg/kmol and g/mol are numerically identical. The label changes for reporting purposes. R_u = {R_UNIVERSAL.toFixed(5)} kJ/(kmol·K).</p>
              </CardContent></Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: COMPONENTS */}
        <TabsContent value="components">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">Gas Components</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${sumOK ? "text-green-400" : "text-amber-400"}`} data-testid="text-total-mf">
                    Σy = {totalMF.toFixed(6)}
                  </span>
                  {sumOK ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Enter component names, mole fractions, and molecular weights. Use the dropdown to auto-fill MW from library.</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="table-components">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1.5 pr-1 w-8">#</th>
                      <th className="text-left py-1.5 px-1">Component</th>
                      <th className="text-left py-1.5 px-1 w-24">Formula</th>
                      <th className="text-left py-1.5 px-1 w-24">y_i</th>
                      <th className="text-left py-1.5 px-1 w-24">mol%</th>
                      <th className="text-left py-1.5 px-1 w-24">MW ({project.mwUnits})</th>
                      <th className="text-center py-1.5 w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((comp, index) => (
                      <tr key={comp.id} className="border-b border-muted/20" data-testid={`row-component-${index}`}>
                        <td className="py-1 pr-1 text-muted-foreground">{index + 1}</td>
                        <td className="py-1 px-1">
                          <Select value={comp.name || undefined} onValueChange={v => handleGasSelect(comp.id, v)}>
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-gas-${index}`}>
                              <SelectValue placeholder="Select or type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(COMMON_GASES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1 px-1">
                          <Input className="h-8 text-xs" value={comp.formula} onChange={e => updateComponent(comp.id, "formula", e.target.value)} placeholder="e.g. CH4" data-testid={`input-formula-${index}`} />
                        </td>
                        <td className="py-1 px-1">
                          <Input type="number" className="h-8 text-xs" value={comp.moleFraction || ""} step="0.01"
                            onChange={e => updateComponent(comp.id, "moleFraction", parseFloat(e.target.value) || 0)}
                            data-testid={`input-mole-frac-${index}`} />
                        </td>
                        <td className="py-1 px-1">
                          <Input type="number" className="h-8 text-xs" value={comp.moleFraction ? (comp.moleFraction * 100).toFixed(2) : ""} step="0.1"
                            onChange={e => updateComponent(comp.id, "moleFraction", (parseFloat(e.target.value) || 0) / 100)}
                            data-testid={`input-mol-pct-${index}`} />
                        </td>
                        <td className="py-1 px-1">
                          <Input type="number" className="h-8 text-xs" value={comp.molecularWeight || ""}
                            onChange={e => updateComponent(comp.id, "molecularWeight", parseFloat(e.target.value) || 0)}
                            data-testid={`input-mw-${index}`} />
                        </td>
                        <td className="py-1 px-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button size="icon" variant="ghost" onClick={() => duplicateRow(comp.id)} data-testid={`button-dup-${index}`}>
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeRow(comp.id)} disabled={components.length <= 2} data-testid={`button-remove-${index}`}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={addRow} data-testid="button-add-component">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Component
                </Button>
                {!sumOK && project.normalizationMode === "strict" && (
                  <Badge variant="destructive" className="text-[10px]">STRICT: Σy must = 1.0</Badge>
                )}
                {!sumOK && project.normalizationMode === "normalize" && (
                  <Badge variant="secondary" className="text-[10px]">Will auto-normalize</Badge>
                )}
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}

              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                Calculate Mixture Properties
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: RESULTS */}
        <TabsContent value="results">
          <div className="space-y-4">
            {!result && (
              <Card><CardContent className="py-12 text-center">
                <Blend className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Enter components and click Calculate on the Components tab first</p>
              </CardContent></Card>
            )}

            {result && (
              <>
                {result.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.flags.map((f, i) => (
                      <Badge key={i} variant={f.includes("NORMALIZATION") ? "secondary" : "destructive"} className="text-[10px]" data-testid={`flag-${i}`}>{f}</Badge>
                    ))}
                  </div>
                )}

                <WarningPanel warnings={result.warnings} />

                <Card className="border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <h4 className="font-semibold text-sm">Mixture Molecular Weight</h4>
                      <Button size="sm" variant="outline" onClick={handleExport} data-testid="button-export">
                        <Download className="w-3.5 h-3.5 mr-1" /> Export JSON
                      </Button>
                    </div>
                    <p className="text-3xl font-mono font-bold text-primary" data-testid="text-mw-mix">
                      {result.mixtureMW.toFixed(4)} <span className="text-base text-muted-foreground font-normal">{project.mwUnits}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-muted/20">
                        <span className="text-muted-foreground">R_mix</span>
                        <span className="font-mono">{result.rMix.toFixed(6)} {result.rMixUnit}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-muted/20">
                        <span className="text-muted-foreground">Σy (raw)</span>
                        <span className="font-mono">{result.totalMoleFraction.toFixed(6)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-sm font-semibold">Equation: MW_mix = Σ(y_i · MW_i)</h4>
                    <p className="text-[10px] text-muted-foreground">Stepwise calculation trace</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" data-testid="table-calc-steps">
                        <thead><tr className="border-b">
                          <th className="text-left py-1.5 pr-2">Component</th>
                          <th className="text-right py-1.5 px-2">y_i</th>
                          <th className="text-right py-1.5 px-2">MW_i</th>
                          <th className="text-right py-1.5 px-2">y_i × MW_i</th>
                        </tr></thead>
                        <tbody>
                          {result.calcSteps.map((s, i) => (
                            <tr key={i} className="border-b border-muted/20">
                              <td className="py-1.5 pr-2">{s.component}</td>
                              <td className="text-right py-1.5 px-2 font-mono">{s.yi.toFixed(6)}</td>
                              <td className="text-right py-1.5 px-2 font-mono">{s.mwi.toFixed(3)}</td>
                              <td className="text-right py-1.5 px-2 font-mono">{s.product.toFixed(6)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-bold">
                            <td className="py-1.5 pr-2">Total</td>
                            <td className="text-right py-1.5 px-2 font-mono">{result.calcSteps.reduce((s, c) => s + c.yi, 0).toFixed(6)}</td>
                            <td className="text-right py-1.5 px-2"></td>
                            <td className="text-right py-1.5 px-2 font-mono text-primary">{result.mixtureMW.toFixed(4)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="text-sm font-semibold">Mass Fractions: w_i = (y_i · MW_i) / MW_mix</h4>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {result.components.map((c, i) => (
                        <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-md text-xs ${i % 2 === 0 ? "bg-muted/50" : ""}`}>
                          <span className="text-muted-foreground truncate mr-2">{c.name}</span>
                          <div className="flex gap-4 font-mono shrink-0">
                            <span>y = {c.moleFraction.toFixed(6)}</span>
                            <span>w = {c.massFraction.toFixed(6)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-2 px-3 bg-primary/5 rounded-md text-xs font-bold">
                        <span>Totals</span>
                        <div className="flex gap-4 font-mono">
                          <span>Σy = {result.calcSteps.reduce((s, c) => s + c.yi, 0).toFixed(6)}</span>
                          <span>Σw = {result.massFractionTotal.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {result.normalizationTrace && (
                  <Card className="bg-amber-950/20 border-amber-800/30">
                    <CardHeader className="pb-2">
                      <h4 className="text-sm font-semibold text-amber-200">Normalization Trace</h4>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs space-y-2">
                      <div className="flex justify-between py-1"><span className="text-amber-200/70">Σy (raw)</span><span className="font-mono text-amber-200">{result.normalizationTrace.rawTotal.toFixed(6)}</span></div>
                      <div className="flex justify-between py-1"><span className="text-amber-200/70">Normalization factor (1/Σy)</span><span className="font-mono text-amber-200">{result.normalizationTrace.normalizationFactor.toFixed(6)}</span></div>
                      <div className="border-t border-amber-800/30 pt-2 space-y-1">
                        {result.normalizationTrace.normalizedFractions.map((nf, i) => (
                          <div key={i} className="flex justify-between py-0.5">
                            <span className="text-amber-200/70">{nf.name}</span>
                            <span className="font-mono text-amber-200">{nf.raw.toFixed(6)} → {nf.normalized.toFixed(6)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <AssumptionsPanel
                  assumptions={[
                    "Ideal gas mixing assumed (Amagat's law)",
                    "Mixture MW = Σ(y_i × MW_i) — mole-fraction weighted average",
                    "Mass fractions: w_i = (y_i × MW_i) / MW_mix",
                    `R_mix = R_u / MW_mix = ${R_UNIVERSAL.toFixed(5)} / MW_mix [kJ/(kg·K)]`,
                    result.wasNormalized ? "Auto-normalization applied (mole fractions did not sum to 1.0)" : "Mole fractions summed to 1.0 — no normalization needed",
                  ]}
                  references={[
                    "Perry's Chemical Engineers' Handbook, 9th Edition",
                    "GPSA Engineering Data Book, 14th Edition",
                    "Smith, Van Ness, Abbott — Introduction to Chemical Engineering Thermodynamics",
                  ]}
                />
              </>
            )}
          </div>
        </TabsContent>

        {/* TAB 4: MULTI-STREAM */}
        <TabsContent value="multistream">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold text-sm">Multi-Stream Mixing</h3>
                  <p className="text-xs text-muted-foreground">Combine multiple inlet streams on a molar flow basis</p>
                </div>
                <Button size="sm" variant="outline" onClick={loadMultiStreamTest} data-testid="button-load-multi-test">
                  <FlaskConical className="w-3.5 h-3.5 mr-1" /> Load Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {components.length < 2 && (
                <Card className="bg-amber-950/30 border-amber-800/50"><CardContent className="p-3">
                  <p className="text-xs text-amber-200">Define components on the Components tab first. The same component list is used for all streams.</p>
                </CardContent></Card>
              )}

              {streams.length === 0 && (
                <div className="text-center py-6">
                  <GitMerge className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No streams defined yet</p>
                  <Button size="sm" variant="outline" onClick={addStream} data-testid="button-add-stream">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Stream
                  </Button>
                </div>
              )}

              {streams.map((stream, si) => (
                <Card key={stream.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-1">
                        <Input className="h-8 text-xs max-w-40" value={stream.name}
                          onChange={e => updateStream(stream.id, "name", e.target.value)}
                          data-testid={`input-stream-name-${si}`} />
                        <Input type="number" className="h-8 text-xs w-28" value={stream.molarFlow || ""}
                          onChange={e => updateStream(stream.id, "molarFlow", parseFloat(e.target.value) || 0)}
                          placeholder="kmol/h" data-testid={`input-stream-flow-${si}`} />
                        <span className="text-[10px] text-muted-foreground">kmol/h</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeStream(stream.id)} data-testid={`button-remove-stream-${si}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid gap-1">
                      {components.map((comp, ci) => {
                        const sc = stream.components.find(s => s.componentId === comp.id);
                        return (
                          <div key={comp.id} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground truncate w-32">{comp.name || `Comp ${ci + 1}`}</span>
                            <Input type="number" className="h-7 text-xs w-24" value={sc?.moleFraction || ""}
                              onChange={e => updateStreamComp(stream.id, comp.id, parseFloat(e.target.value) || 0)}
                              step="0.01" data-testid={`input-stream-${si}-comp-${ci}`} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      Σy = {stream.components.reduce((s, c) => s + c.moleFraction, 0).toFixed(6)}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {streams.length > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={addStream} data-testid="button-add-stream-more">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Stream
                  </Button>
                  <Button className="flex-1" onClick={handleMultiStreamCalc} disabled={streams.length < 2} data-testid="button-calc-multi">
                    Calculate Mixed Stream
                  </Button>
                </div>
              )}

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              {multiResult && (
                <>
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-2">Mixed Stream Results</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Total Flow</span>
                          <span className="font-mono" data-testid="text-total-flow">{multiResult.mixedStream.totalFlow.toFixed(2)} kmol/h</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">MW_mix</span>
                          <span className="font-mono font-bold text-primary" data-testid="text-multi-mw">{multiResult.mixedStream.mwMix.toFixed(4)} {project.mwUnits}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">R_mix</span>
                          <span className="font-mono">{multiResult.mixedStream.rMix.toFixed(6)} kJ/(kg·K)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><h4 className="text-sm font-semibold">Mixed Stream Composition</h4></CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b">
                            <th className="text-left py-1.5">Component</th>
                            <th className="text-right py-1.5 px-2">n_i (kmol/h)</th>
                            <th className="text-right py-1.5 px-2">y_i</th>
                            <th className="text-right py-1.5 px-2">w_i</th>
                          </tr></thead>
                          <tbody>
                            {multiResult.mixedStream.composition.map((c, i) => (
                              <tr key={i} className="border-b border-muted/20">
                                <td className="py-1.5">{c.name}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{c.ni.toFixed(4)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{c.yi.toFixed(6)}</td>
                                <td className="text-right py-1.5 px-2 font-mono">{c.massFraction.toFixed(6)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <WarningPanel warnings={multiResult.warnings} />

                  <Card>
                    <CardHeader className="pb-2"><h4 className="text-sm font-semibold">Calculation Trace</h4></CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-0.5 text-[10px] font-mono text-muted-foreground max-h-60 overflow-y-auto">
                        {multiResult.calcTrace.map((line, i) => <div key={i} className="py-0.5">{line}</div>)}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
          <div className="mt-4">
            <FeedbackSection calculatorName="Gas Mixing" />
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
