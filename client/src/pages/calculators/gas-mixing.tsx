import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { COMMON_GASES, type GasCategory } from "@/lib/engineering/constants";
import {
  type GasMixProject, type GasMixComponent, type GasMixStream,
  type GasMixingResult, type MultiStreamResult,
  DEFAULT_PROJECT, createEmptyComponent, nextId, loadPreset,
  calculateGasMixing, calculateMultiStreamMixing,
  GAS_MIXING_TEST_COMPONENTS, MULTI_STREAM_TEST, R_UNIVERSAL,
  PRESET_COMPOSITIONS, type PresetComposition,
} from "@/lib/engineering/gasMixing";
import {
  Blend, Plus, Trash2, FlaskConical, RotateCcw, Copy,
  ChevronLeft, ChevronRight, ClipboardList, Beaker, BarChart3, GitMerge,
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText,
  Search, BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";

const TABS = [
  { id: "project", label: "Project", icon: ClipboardList, step: 1 },
  { id: "components", label: "Components", icon: Beaker, step: 2 },
  { id: "results", label: "Results", icon: BarChart3, step: 3 },
  { id: "multistream", label: "Multi-Stream", icon: GitMerge, step: 4 },
];

const CATEGORY_ORDER: GasCategory[] = [
  "Paraffins", "Olefins", "Naphthenes", "Aromatics",
  "Acid / Sour", "Sulfur Compounds", "Inerts", "Other",
];

function groupedGases() {
  const groups: Record<string, { name: string; formula: string }[]> = {};
  for (const cat of CATEGORY_ORDER) groups[cat] = [];
  for (const [name, props] of Object.entries(COMMON_GASES)) {
    const cat = props.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ name, formula: props.formula });
  }
  return groups;
}

const GROUPED = groupedGases();

function fmtNum(v: number | null | undefined, dec: number = 4): string {
  if (v == null) return "—";
  return v.toFixed(dec);
}

export default function GasMixingPage() {
  const [activeTab, setActiveTab] = useState("project");
  const [project, setProject] = useState<GasMixProject>({ ...DEFAULT_PROJECT });
  const [components, setComponents] = useState<GasMixComponent[]>([createEmptyComponent(), createEmptyComponent()]);
  const [streams, setStreams] = useState<GasMixStream[]>([]);
  const [result, setResult] = useState<GasMixingResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiStreamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gasFilter, setGasFilter] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);

  const totalMF = components.reduce((s, c) => s + (c.moleFraction || 0), 0);
  const sumOK = Math.abs(totalMF - 1.0) < 5e-4;

  const filteredGases = useMemo(() => {
    if (!gasFilter.trim()) return GROUPED;
    const q = gasFilter.toLowerCase();
    const stripSubscripts = (s: string) =>
      s.replace(/[\u2080-\u2089]/g, ch => String(ch.charCodeAt(0) - 0x2080))
       .replace(/[\u2070\u00B9\u00B2\u00B3\u2074-\u2079]/g, ch => {
         const map: Record<string, string> = {"\u2070":"0","\u00B9":"1","\u00B2":"2","\u00B3":"3","\u2074":"4","\u2075":"5","\u2076":"6","\u2077":"7","\u2078":"8","\u2079":"9"};
         return map[ch] || ch;
       });
    const out: Record<string, { name: string; formula: string }[]> = {};
    for (const [cat, gases] of Object.entries(GROUPED)) {
      const filtered = gases.filter(g => {
        const plain = stripSubscripts(g.formula).toLowerCase();
        return g.name.toLowerCase().includes(q) || g.formula.toLowerCase().includes(q) || plain.includes(q);
      });
      if (filtered.length > 0) out[cat] = filtered;
    }
    return out;
  }, [gasFilter]);

  const updateComponent = (id: string, field: keyof GasMixComponent, value: string | number) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleGasSelect = (id: string, gasName: string) => {
    const gas = COMMON_GASES[gasName];
    if (gas) {
      setComponents(prev => prev.map(c =>
        c.id === id ? {
          ...c, name: gasName, molecularWeight: gas.mw, formula: gas.formula,
          gamma: gas.gamma, Tc: gas.Tc, Pc: gas.Pc, omega: gas.omega,
        } : c
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

  const handleLoadPreset = (preset: PresetComposition) => {
    setComponents(loadPreset(preset));
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
      setResult(calculateGasMixing({ components: parsed }, components));
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

  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;
    const assumptions = [
      "Ideal gas mixing assumed (Amagat's law)",
      "Mixture MW = \u03A3(y_i \u00D7 MW_i) \u2014 mole-fraction weighted average",
      "Mass fractions: w_i = (y_i \u00D7 MW_i) / MW_mix",
      `R_mix = R_u / MW_mix = ${R_UNIVERSAL.toFixed(5)} / MW_mix [kJ/(kg\u00B7K)]`,
      "Gas SG = MW_mix / MW_air (28.966 kg/kmol)",
      "Pseudocritical properties: Kay's mixing rule \u2014 Tc_pc = \u03A3(y_i \u00D7 Tc_i), Pc_pc = \u03A3(y_i \u00D7 Pc_i)",
      result.wasNormalized ? "Auto-normalization applied (mole fractions did not sum to 1.0)" : "Mole fractions summed to 1.0 \u2014 no normalization needed",
    ];
    const references = [
      "Perry's Chemical Engineers' Handbook, 9th Edition",
      "GPSA Engineering Data Book, 14th Edition",
      "Smith, Van Ness, Abbott \u2014 Introduction to Chemical Engineering Thermodynamics",
      "Standing & Katz (1942) \u2014 Pseudocritical property correlations",
      "Kay, W.B. (1936) \u2014 Density of Hydrocarbon Gases and Vapors",
    ];
    const results: ExportDatasheet["results"] = [
      { label: "Mixture MW", value: result.mixtureMW, unit: project.mwUnits, highlight: true },
      { label: "Gas SG (vs Air)", value: result.gasSG, unit: "\u2014" },
      { label: "R_mix", value: result.rMix, unit: result.rMixUnit },
    ];
    if (result.gammaMix != null) results.push({ label: "\u03B3_mix (Cp/Cv)", value: result.gammaMix, unit: "\u2014" });
    if (result.TcPc != null) results.push({ label: "Tc_pc (pseudocritical)", value: result.TcPc, unit: "K" });
    if (result.PcPc != null) results.push({ label: "Pc_pc (pseudocritical)", value: result.PcPc, unit: "bar" });
    if (result.omegaMix != null) results.push({ label: "\u03C9_mix (acentric)", value: result.omegaMix, unit: "\u2014" });
    results.push(
      { label: "\u03A3y (raw)", value: result.totalMoleFraction, unit: "\u2014" },
      { label: "Mass fraction total", value: result.massFractionTotal, unit: "\u2014" },
    );
    for (const c of result.components) {
      results.push({ label: `${c.name} (${c.formula}) mass frac`, value: c.massFraction, unit: "\u2014" });
    }
    return {
      calculatorName: "Gas Mixing Calculator",
      projectInfo: [
        { label: "Case Name", value: project.name || "\u2014" },
        { label: "Case ID", value: project.caseId || "\u2014" },
        { label: "Engineer", value: project.engineer || "\u2014" },
        { label: "Date", value: project.date || "\u2014" },
      ],
      inputs: components.map((c, i) => ({
        label: `${c.name || `Component ${i + 1}`} (y_i / MW)`,
        value: `${c.moleFraction.toFixed(6)} / ${c.molecularWeight.toFixed(3)}`,
        unit: project.mwUnits,
      })),
      results,
      calcSteps: result.calcSteps.map(s => ({
        label: `${s.component}: y_i \u00D7 MW_i`,
        equation: `${s.yi.toFixed(6)} \u00D7 ${s.mwi.toFixed(3)}`,
        value: s.product,
        unit: project.mwUnits,
      })),
      methodology: [
        "MW_mix = \u03A3(y_i \u00D7 MW_i)",
        "w_i = (y_i \u00D7 MW_i) / MW_mix",
        "R_mix = R_universal / MW_mix",
        "SG = MW_mix / 28.966",
        "\u03B3_mix \u2248 \u03A3(y_i \u00D7 \u03B3_i) \u2014 approximate",
        "Tc_pc = \u03A3(y_i \u00D7 Tc_i) \u2014 Kay's rule",
        "Pc_pc = \u03A3(y_i \u00D7 Pc_i) \u2014 Kay's rule",
      ],
      assumptions,
      references,
      warnings: [...result.flags, ...result.warnings],
    };
  };

  const handleExport = (format: "pdf" | "excel" | "json") => {
    const data = buildExportData();
    if (!data) return;
    if (format === "pdf") exportToCalcNote(data);
    else if (format === "excel") exportToExcel(data);
    else exportToJSON(data);
  };

  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  const presetCategories = Array.from(new Set(PRESET_COMPOSITIONS.map(p => p.category)));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Blend className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">Gas Mixing Calculator</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {Object.keys(COMMON_GASES).length} components · MW · SG · pseudocritical · multi-stream mixing
            </p>
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
          <div className="space-y-4">
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

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Load Preset Composition</h3>
                  <Badge variant="secondary" className="text-[10px]">{PRESET_COMPOSITIONS.length} presets</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a typical O&G stream composition to auto-fill the component table
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {presetCategories.map(cat => (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {PRESET_COMPOSITIONS.filter(p => p.category === cat).map(preset => (
                        <button
                          key={preset.name}
                          className="text-left p-2.5 rounded-md border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          onClick={() => handleLoadPreset(preset)}
                          data-testid={`button-preset-${preset.name.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          <p className="text-xs font-medium">{preset.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{preset.description}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{preset.components.length} components</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: COMPONENTS */}
        <TabsContent value="components">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">Gas Components</h3>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowLibrary(!showLibrary)} data-testid="button-toggle-library">
                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                      {showLibrary ? "Hide" : "Show"} Library
                    </Button>
                    <span className={`text-xs font-mono ${sumOK ? "text-green-400" : "text-amber-400"}`} data-testid="text-total-mf">
                      Σy = {totalMF.toFixed(6)}
                    </span>
                    {sumOK ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Select gas from the categorized library or enter manually. MW, γ, Tc, Pc, ω are auto-filled from the library.</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" data-testid="table-components">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 pr-1 w-8">#</th>
                        <th className="text-left py-1.5 px-1">Component</th>
                        <th className="text-left py-1.5 px-1 w-20">Formula</th>
                        <th className="text-left py-1.5 px-1 w-24">y_i</th>
                        <th className="text-left py-1.5 px-1 w-20">mol%</th>
                        <th className="text-left py-1.5 px-1 w-24">MW</th>
                        <th className="text-center py-1.5 w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((comp, index) => (
                        <tr key={comp.id} className="border-b border-muted/20" data-testid={`row-component-${index}`}>
                          <td className="py-1 pr-1 text-muted-foreground">{index + 1}</td>
                          <td className="py-1 px-1">
                            <Select value={comp.name || undefined} onValueChange={v => handleGasSelect(comp.id, v)}>
                              <SelectTrigger className="h-8 text-xs" data-testid={`select-gas-${index}`}>
                                <SelectValue placeholder="Select gas..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                {CATEGORY_ORDER.map(cat => {
                                  const gases = GROUPED[cat];
                                  if (!gases || gases.length === 0) return null;
                                  return (
                                    <SelectGroup key={cat}>
                                      <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{cat}</SelectLabel>
                                      {gases.map(g => (
                                        <SelectItem key={g.name} value={g.name}>
                                          <span className="flex items-center gap-2">
                                            <span>{g.name}</span>
                                            <span className="text-muted-foreground text-[10px]">{g.formula}</span>
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-1 px-1">
                            <span className="text-xs text-muted-foreground font-mono">{comp.formula || "—"}</span>
                          </td>
                          <td className="py-1 px-1">
                            <NumericInput className="h-8 text-xs" value={comp.moleFraction} step="0.01"
                              onValueChange={v => updateComponent(comp.id, "moleFraction", v)}
                              data-testid={`input-mole-frac-${index}`} />
                          </td>
                          <td className="py-1 px-1">
                            <NumericInput className="h-8 text-xs" value={comp.moleFraction ? parseFloat((comp.moleFraction * 100).toFixed(2)) : 0} step="0.1"
                              onValueChange={v => updateComponent(comp.id, "moleFraction", v / 100)}
                              data-testid={`input-mol-pct-${index}`} />
                          </td>
                          <td className="py-1 px-1">
                            <NumericInput className="h-8 text-xs" value={comp.molecularWeight}
                              onValueChange={v => updateComponent(comp.id, "molecularWeight", v)}
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

            {showLibrary && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">Gas Component Library</h3>
                    <Badge variant="secondary" className="text-[10px]">{Object.keys(COMMON_GASES).length} components</Badge>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8 h-8 text-xs"
                      placeholder="Search by name or formula..."
                      value={gasFilter}
                      onChange={e => setGasFilter(e.target.value)}
                      data-testid="input-gas-filter"
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {Object.entries(filteredGases).map(([cat, gases]) => (
                      <div key={cat}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 sticky top-0 bg-card py-0.5">{cat} ({gases.length})</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="text-left py-1 pr-2">Name</th>
                                <th className="text-left py-1 px-1">Formula</th>
                                <th className="text-right py-1 px-1">MW</th>
                                <th className="text-right py-1 px-1">γ</th>
                                <th className="text-right py-1 px-1">Tc (K)</th>
                                <th className="text-right py-1 px-1">Pc (bar)</th>
                                <th className="text-right py-1 px-1">ω</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gases.map(g => {
                                const props = COMMON_GASES[g.name];
                                return (
                                  <tr key={g.name} className="border-b border-muted/20 hover:bg-muted/30">
                                    <td className="py-1 pr-2 font-medium">{g.name}</td>
                                    <td className="py-1 px-1 font-mono text-muted-foreground">{g.formula}</td>
                                    <td className="py-1 px-1 text-right font-mono">{props.mw.toFixed(3)}</td>
                                    <td className="py-1 px-1 text-right font-mono">{props.gamma.toFixed(2)}</td>
                                    <td className="py-1 px-1 text-right font-mono">{fmtNum(props.Tc, 2)}</td>
                                    <td className="py-1 px-1 text-right font-mono">{fmtNum(props.Pc, 2)}</td>
                                    <td className="py-1 px-1 text-right font-mono">{fmtNum(props.omega, 4)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
                      <h4 className="font-semibold text-sm">Mixture Properties</h4>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" data-testid="button-export-results">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="button-export-calc-note">
                            <FileText className="w-4 h-4 mr-2 text-red-400" />
                            Calc Note (Print / PDF)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("excel")} data-testid="button-export-excel">
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />
                            Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("json")} data-testid="button-export-json">
                            <Download className="w-4 h-4 mr-2 text-blue-400" />
                            Export as JSON
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-3xl font-mono font-bold text-primary" data-testid="text-mw-mix">
                      {result.mixtureMW.toFixed(4)} <span className="text-base text-muted-foreground font-normal">{project.mwUnits}</span>
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 mt-3 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-muted/20">
                        <span className="text-muted-foreground">Gas SG (vs Air)</span>
                        <span className="font-mono font-medium" data-testid="text-gas-sg">{result.gasSG.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-muted/20">
                        <span className="text-muted-foreground">R_mix</span>
                        <span className="font-mono">{result.rMix.toFixed(6)} {result.rMixUnit}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-muted/20">
                        <span className="text-muted-foreground">Σy (raw)</span>
                        <span className="font-mono">{result.totalMoleFraction.toFixed(6)}</span>
                      </div>
                      {result.gammaMix != null && (
                        <div className="flex justify-between py-1.5 border-b border-muted/20">
                          <span className="text-muted-foreground">γ_mix (Cp/Cv)</span>
                          <span className="font-mono" data-testid="text-gamma-mix">{result.gammaMix.toFixed(4)}</span>
                        </div>
                      )}
                      {result.TcPc != null && (
                        <div className="flex justify-between py-1.5 border-b border-muted/20">
                          <span className="text-muted-foreground">Tc_pc</span>
                          <span className="font-mono" data-testid="text-tc-pc">{result.TcPc.toFixed(2)} K</span>
                        </div>
                      )}
                      {result.PcPc != null && (
                        <div className="flex justify-between py-1.5 border-b border-muted/20">
                          <span className="text-muted-foreground">Pc_pc</span>
                          <span className="font-mono" data-testid="text-pc-pc">{result.PcPc.toFixed(2)} bar</span>
                        </div>
                      )}
                      {result.omegaMix != null && (
                        <div className="flex justify-between py-1.5 border-b border-muted/20">
                          <span className="text-muted-foreground">ω_mix (acentric)</span>
                          <span className="font-mono" data-testid="text-omega-mix">{result.omegaMix.toFixed(4)}</span>
                        </div>
                      )}
                    </div>
                    {result.TcPc != null && result.PcPc != null && (
                      <Card className="mt-3 bg-muted/20"><CardContent className="p-2.5">
                        <p className="text-[10px] text-muted-foreground">
                          Pseudocritical properties via Kay's mixing rule. For sour gas (H₂S &gt; 4 mol%), apply Wichert–Aziz correction to Tc_pc and Pc_pc before EOS calculations.
                        </p>
                      </CardContent></Card>
                    )}
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
                          <th className="text-left py-1.5 px-2">Formula</th>
                          <th className="text-right py-1.5 px-2">y_i</th>
                          <th className="text-right py-1.5 px-2">MW_i</th>
                          <th className="text-right py-1.5 px-2">y_i × MW_i</th>
                        </tr></thead>
                        <tbody>
                          {result.components.map((c, i) => (
                            <tr key={i} className="border-b border-muted/20">
                              <td className="py-1.5 pr-2">{c.name}</td>
                              <td className="py-1.5 px-2 font-mono text-muted-foreground text-[10px]">{c.formula}</td>
                              <td className="text-right py-1.5 px-2 font-mono">{c.moleFraction.toFixed(6)}</td>
                              <td className="text-right py-1.5 px-2 font-mono">{c.molecularWeight.toFixed(3)}</td>
                              <td className="text-right py-1.5 px-2 font-mono">{c.yiMWi.toFixed(6)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-bold">
                            <td className="py-1.5 pr-2" colSpan={2}>Total</td>
                            <td className="text-right py-1.5 px-2 font-mono">{result.components.reduce((s, c) => s + c.moleFraction, 0).toFixed(6)}</td>
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
                    <h4 className="text-sm font-semibold">Composition Table: Mole, Mass, and Physical Properties</h4>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b text-muted-foreground">
                          <th className="text-left py-1.5 pr-2">Component</th>
                          <th className="text-right py-1.5 px-1.5">y_i</th>
                          <th className="text-right py-1.5 px-1.5">w_i</th>
                          <th className="text-right py-1.5 px-1.5">MW</th>
                          <th className="text-right py-1.5 px-1.5">γ</th>
                          <th className="text-right py-1.5 px-1.5">Tc (K)</th>
                          <th className="text-right py-1.5 px-1.5">Pc (bar)</th>
                          <th className="text-right py-1.5 px-1.5">ω</th>
                        </tr></thead>
                        <tbody>
                          {result.components.map((c, i) => (
                            <tr key={i} className={`border-b border-muted/20 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                              <td className="py-1.5 pr-2">
                                <span className="font-medium">{c.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5">{c.formula}</span>
                              </td>
                              <td className="text-right py-1.5 px-1.5 font-mono">{c.moleFraction.toFixed(6)}</td>
                              <td className="text-right py-1.5 px-1.5 font-mono">{c.massFraction.toFixed(6)}</td>
                              <td className="text-right py-1.5 px-1.5 font-mono">{c.molecularWeight.toFixed(3)}</td>
                              <td className="text-right py-1.5 px-1.5 font-mono">{fmtNum(c.gamma, 3)}</td>
                              <td className="text-right py-1.5 px-1.5 font-mono">{fmtNum(c.Tc, 2)}</td>
                              <td className="text-right py-1.5 px-1.5 font-mono">{fmtNum(c.Pc, 2)}</td>
                              <td className="text-right py-1.5 px-1.5 font-mono">{fmtNum(c.omega, 4)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-bold bg-primary/5">
                            <td className="py-1.5 pr-2">Mixture</td>
                            <td className="text-right py-1.5 px-1.5 font-mono">{result.components.reduce((s, c) => s + c.moleFraction, 0).toFixed(6)}</td>
                            <td className="text-right py-1.5 px-1.5 font-mono">{result.massFractionTotal.toFixed(6)}</td>
                            <td className="text-right py-1.5 px-1.5 font-mono text-primary">{result.mixtureMW.toFixed(3)}</td>
                            <td className="text-right py-1.5 px-1.5 font-mono">{fmtNum(result.gammaMix, 3)}</td>
                            <td className="text-right py-1.5 px-1.5 font-mono">{fmtNum(result.TcPc, 2)}</td>
                            <td className="text-right py-1.5 px-1.5 font-mono">{fmtNum(result.PcPc, 2)}</td>
                            <td className="text-right py-1.5 px-1.5 font-mono">{fmtNum(result.omegaMix, 4)}</td>
                          </tr>
                        </tbody>
                      </table>
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
                    "Ideal gas mixing assumed (Amagat's law / Dalton's law)",
                    "MW_mix = Σ(y_i × MW_i) — mole-fraction weighted average",
                    "Mass fractions: w_i = (y_i × MW_i) / MW_mix",
                    `R_mix = R_u / MW_mix = ${R_UNIVERSAL.toFixed(5)} / MW_mix [kJ/(kg·K)]`,
                    "Gas SG = MW_mix / 28.966 (MW of dry air)",
                    "γ_mix ≈ Σ(y_i × γ_i) — approximate, linear mixing",
                    "Pseudocritical: Kay's rule — Tc_pc = Σ(y_i × Tc_i), Pc_pc = Σ(y_i × Pc_i)",
                    "ω_mix = Σ(y_i × ω_i) — acentric factor mixing",
                    result.wasNormalized ? "Auto-normalization applied" : "Mole fractions summed to 1.0 — no normalization needed",
                  ]}
                  references={[
                    "Perry's Chemical Engineers' Handbook, 9th Edition",
                    "GPSA Engineering Data Book, 14th Edition",
                    "Smith, Van Ness, Abbott — Introduction to Chemical Engineering Thermodynamics",
                    "Standing & Katz (1942) — Pseudocritical property correlations",
                    "Kay, W.B. (1936) — Density of Hydrocarbon Gases and Vapors",
                    "Wichert & Aziz (1972) — Sour gas pseudocritical correction",
                    "Poling, Prausnitz & O'Connell — Properties of Gases and Liquids, 5th Edition",
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
                        <NumericInput className="h-8 text-xs w-28" value={stream.molarFlow}
                          onValueChange={v => updateStream(stream.id, "molarFlow", v)}
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
                            <NumericInput className="h-7 text-xs w-24" value={sc?.moleFraction || 0}
                              onValueChange={v => updateStreamComp(stream.id, comp.id, v)}
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Total Flow</span>
                          <span className="font-mono" data-testid="text-total-flow">{multiResult.mixedStream.totalFlow.toFixed(2)} kmol/h</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">MW_mix</span>
                          <span className="font-mono font-bold text-primary" data-testid="text-multi-mw">{multiResult.mixedStream.mwMix.toFixed(4)} {project.mwUnits}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-muted/20">
                          <span className="text-muted-foreground">Gas SG</span>
                          <span className="font-mono">{multiResult.mixedStream.gasSG.toFixed(4)}</span>
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
