import { useState, useCallback } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Calculator, AlertTriangle, Info, CheckCircle2, XCircle, Copy, Download, BookOpen, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  calculatePipeWT,
  MATERIAL_DB,
  NPS_DATA,
  QUALITY_FACTORS,
  QUALITY_FACTORS_PIPELINE,
  B318_LOCATION_CLASS,
  DEFAULT_PWT_INPUT,
  PWT_TEST_CASE_B313,
  PWT_TEST_CASE_B318,
  PWT_FLAG_LABELS,
  PWT_FLAG_SEVERITY,
  type PipeWTInput,
  type PipeWTResult,
  type PipeStandard,
  type JointTypeKey,
  type LocationClassKey,
  type PipeWTFlag,
} from "@/lib/engineering/pipeWallThickness";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number, d = 2): string {
  if (!isFinite(v)) return "—";
  return v.toFixed(d);
}

function cloneInput(i: PipeWTInput): PipeWTInput {
  return JSON.parse(JSON.stringify(i));
}

const TABS = ["project", "pipe", "basis", "results", "actions"] as const;
type TabId = (typeof TABS)[number];

// ─── Flag Banner ──────────────────────────────────────────────────────────────

function FlagBanner({ flags }: { flags: PipeWTFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="mb-4 space-y-1" data-testid="flags-banner">
      {flags.map(f => (
        <div
          key={f}
          className={`flex items-start gap-2 rounded px-3 py-2 text-sm font-medium ${
            PWT_FLAG_SEVERITY[f] === "critical"
              ? "bg-red-950/60 border border-red-600 text-red-200"
              : PWT_FLAG_SEVERITY[f] === "warning"
              ? "bg-amber-950/60 border border-amber-500 text-amber-200"
              : "bg-blue-950/40 border border-blue-700 text-blue-200"
          }`}
        >
          {PWT_FLAG_SEVERITY[f] === "critical" ? (
            <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
          ) : PWT_FLAG_SEVERITY[f] === "warning" ? (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
          ) : (
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-400" />
          )}
          <span>{PWT_FLAG_LABELS[f]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Step Trace Table ─────────────────────────────────────────────────────────

function CalcStepTable({ steps }: { steps: PipeWTResult["calcSteps"] }) {
  return (
    <div className="overflow-x-auto rounded border border-border" data-testid="table-calc-steps">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Step</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Equation</th>
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Value</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Unit</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Reference</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/10">
              <td className="px-3 py-1.5 text-foreground/90">{s.label}</td>
              <td className="px-3 py-1.5 font-mono text-xs text-primary/80">{s.equation || "—"}</td>
              <td className="px-3 py-1.5 text-right font-mono font-semibold text-amber-400">{s.value}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{s.unit}</td>
              <td className="px-3 py-1.5 text-xs text-blue-300/80">{s.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Schedule Table ───────────────────────────────────────────────────────────

function ScheduleTable({ checks, tReq }: { checks: PipeWTResult["scheduleChecks"]; tReq: number }) {
  return (
    <div className="overflow-x-auto rounded border border-border" data-testid="table-schedules">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Schedule</th>
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">t_nom (mm)</th>
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">t_eff (mm)</th>
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">MAOP (bar)</th>
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">σ_h (MPa)</th>
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Utilisation</th>
            <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Pass/Fail</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c, i) => (
            <tr
              key={i}
              className={`border-b border-border/50 ${c.passes ? "bg-green-950/20" : "bg-red-950/10"}`}
            >
              <td className="px-3 py-1.5 font-medium">{c.schedule}</td>
              <td className="px-3 py-1.5 text-right font-mono">{fmt(c.wallMm)}</td>
              <td className="px-3 py-1.5 text-right font-mono">{fmt(c.tEffective)}</td>
              <td className="px-3 py-1.5 text-right font-mono">{fmt(c.maop)}</td>
              <td className="px-3 py-1.5 text-right font-mono">{fmt(c.hoopStress)}</td>
              <td className={`px-3 py-1.5 text-right font-mono font-semibold ${c.utilisation > 0.9 ? "text-amber-400" : "text-foreground"}`}>
                {fmt(c.utilisation * 100, 1)}%
              </td>
              <td className="px-3 py-1.5 text-center">
                {c.passes
                  ? <CheckCircle2 className="h-4 w-4 mx-auto text-green-400" />
                  : <XCircle className="h-4 w-4 mx-auto text-red-400" />}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/20">
            <td colSpan={7} className="px-3 py-1.5 text-xs text-muted-foreground">
              Required nominal wall: <span className="font-mono font-semibold text-amber-400">{fmt(tReq)} mm</span> — first green row = governing schedule selection.
              MAOP back-calculated at corroded end-of-life condition: t_eff = t_nom × (1 − MT/100) − c.
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Assumptions Panel ────────────────────────────────────────────────────────

function AssumptionsPanel({ inp }: { inp: PipeWTInput }) {
  const std = inp.pipingStandard;
  const assumptions = std === "B31.3" ? [
    { id: "A1", text: "Design equation per ASME B31.3:2022 §304.1.2: t = P·D / (2·(S·E·W + P·Y)). Applicable to straight pipe under internal gauge pressure, thin-wall condition (t < D/6, P/(S·E·W) < 0.385).", ref: "ASME B31.3:2022 §304.1.2" },
    { id: "A2", text: "Allowable stress S from ASME B31.3:2022 Table A-1 (temperature-interpolated). Values shown are per the tabulated specification, product form, and heat treatment condition. Linear interpolation between table entries.", ref: "ASME B31.3:2022 Table A-1" },
    { id: "A3", text: "Y coefficient from ASME B31.3:2022 Table 304.1.1. Y = 0.4 for ferritic and austenitic steel at T ≤ 482 °C. Increases to 0.5/0.6/0.7 at elevated temperatures for ferritic; 0.5 for austenitic above 566 °C.", ref: "ASME B31.3:2022 Table 304.1.1" },
    { id: "A4", text: "Quality (longitudinal joint) factor E from ASME B31.3:2022 Table A-1B. Seamless = 1.00; ERW = 0.85; DSAW/SAW = 1.00; EFW = 0.85; FBW = 0.60.", ref: "ASME B31.3:2022 Table A-1B" },
    { id: "A5", text: "Weld joint strength reduction factor W = 1.0 assumed (valid for T ≤ 510 °C for all listed welds). For T > 510 °C, W must be confirmed from ASME B31.3 Table 302.3.5.", ref: "ASME B31.3:2022 Table 302.3.5" },
    { id: "A6", text: "Thick-wall Lamé equation used when t_p ≥ D/6 or P/(S·E·W) ≥ 0.385 per ASME B31.3 §304.1.2(c): t = D/2 · (√((SEW+P)/(SEW−P)) − 1). This is the closed-form Lamé thick-wall cylinder solution.", ref: "ASME B31.3:2022 §304.1.2(c)" },
    { id: "A7", text: "Total mechanical allowance c = corrosion allowance + erosion allowance + thread/groove depth per ASME B31.3 §304.1.1(a). Each component must be individually justified.", ref: "ASME B31.3:2022 §304.1.1" },
    { id: "A8", text: "Mill tolerance (MT%) applied per ASTM A106 / API 5L §9.10: standard negative mill tolerance is −12.5% on wall thickness. Required nominal = t_total / (1 − MT/100). Pipe selected must satisfy t_nom × (1 − MT/100) ≥ t_total.", ref: "ASTM A106 / API 5L §9.10" },
    { id: "A9", text: "MAOP back-calculated from selected schedule using the rearranged ASME B31.3 §304.1.2 formula at fresh-wall condition minus full corrosion allowance (conservative end-of-life check): P_MAOP = 2·t_eff·S·E·W / (D − 2·Y·t_eff).", ref: "ASME B31.3:2022 §304.1.2" },
    { id: "A10", text: "Hoop (circumferential) stress calculated by Barlow thin-wall formula: σ_h = P·D / (2·t_eff). This is a conservative approximation; thick-wall Lamé radial distribution not computed for hoop stress display.", ref: "Barlow formula (thin-wall)" },
    { id: "A11", text: "Pipe schedule dimensions from ASME B36.10M:2018 (wrought steel). For NPS ≥ 12\", Sch 40 ≠ Std and Sch 80 ≠ XS — each is listed separately. For stainless steel, ASME B36.19M:2018 schedules (5S, 10S, 40S, 80S) apply instead.", ref: "ASME B36.10M:2018, B36.19M:2018" },
    { id: "A12", text: "External pressure, bending, torsion, sustained and occasional loads, and thermal expansion stresses are NOT included in this calculation. A full piping flexibility analysis per ASME B31.3 Chapter II / Appendix D is required.", ref: "ASME B31.3:2022 §319" },
  ] : std === "B31.4" ? [
    { id: "A1", text: "Design equation per ASME B31.4:2019 §403.2.1: t = P·D / (2·S·F·E·T). S = SMYS per API 5L Table B.2. Design factor F = 0.72 for Class 1 locations (liquid pipeline).", ref: "ASME B31.4:2019 §403.2.1" },
    { id: "A2", text: "SMYS values from API 5L:2018 Table B.2 (Product Specification Level 2). SMYS is the design basis stress for pipeline codes; it is NOT divided by a safety factor in this formula — F and E perform that role.", ref: "API 5L:2018 Table B.2" },
    { id: "A3", text: "Temperature derating factor T from ASME B31.4 Table 403.2.1-1: T = 1.000 (T ≤ 121 °C), 0.967 (≤ 149 °C), 0.933 (≤ 177 °C), 0.900 (≤ 204 °C), 0.867 (≤ 232 °C).", ref: "ASME B31.4:2019 Table 403.2.1-1" },
    { id: "A4", text: "Quality factor E from ASME B31.4 Table 403.2.1-1: Seamless = 1.00; ERW = 0.80 (default). Note B31.4 uses E=0.80 for ERW (more conservative than B31.3's 0.85).", ref: "ASME B31.4:2019 Table 403.2.1-1" },
    { id: "A5", text: "Mill tolerance 12.5% (API 5L §9.10). Required nominal = t_total / (1 − 0.125). Selected pipe must meet: t_nom × 0.875 ≥ t_total.", ref: "API 5L:2018 §9.10" },
    { id: "A6", text: "MAOP back-calculated using rearranged B31.4 §403.2.1 formula at corroded condition: P_MAOP = 2·t_eff·S·F·E·T / D.", ref: "ASME B31.4:2019 §403.2.1" },
    { id: "A7", text: "Hydrostatic test pressure shall be 1.25× design pressure per ASME B31.4 §437.4.1. Verify that all components and supports are rated for the test pressure.", ref: "ASME B31.4:2019 §437.4.1" },
  ] : [
    { id: "A1", text: "Design equation per ASME B31.8:2022 §841.11: t = P·D / (2·S·F·E·T). S = SMYS per API 5L Table B.2. Design factor F depends on location class (0.80 / 0.72 / 0.60 / 0.50 / 0.40).", ref: "ASME B31.8:2022 §841.11" },
    { id: "A2", text: "SMYS from API 5L:2018 Table B.2. Pipeline design stress = SMYS; the design factor F provides the safety margin.", ref: "API 5L:2018 Table B.2" },
    { id: "A3", text: "Location class design factor F per ASME B31.8 §841.114A Table 841.114A: Class 1 Div 1 = 0.80, Class 1 Div 2 = 0.72, Class 2 = 0.60, Class 3 = 0.50, Class 4 = 0.40.", ref: "ASME B31.8:2022 §841.114A" },
    { id: "A4", text: "Temperature derating factor T from ASME B31.8 Table 841.1.8-1: T = 1.000 (T ≤ 121 °C), 0.967 (≤ 149 °C), 0.933 (≤ 177 °C), 0.900 (≤ 204 °C), 0.867 (≤ 232 °C).", ref: "ASME B31.8:2022 Table 841.1.8-1" },
    { id: "A4b", text: "Quality factor E from ASME B31.8 §841.11: Seamless = 1.00; ERW (Type E) = 1.00 when manufactured to API 5L PSL2; ERW (Type E) = 0.80 for PSL1 or where full-body NDE not performed.", ref: "ASME B31.8:2022 §841.11" },
    { id: "A5", text: "Mill tolerance 12.5% per API 5L §9.10. Required nominal = t_total / (1 − 0.125).", ref: "API 5L:2018 §9.10" },
    { id: "A6", text: "MAOP back-calculated using rearranged B31.8 §841.11 at corroded condition: P_MAOP = 2·t_eff·S·F·E·T / D.", ref: "ASME B31.8:2022 §841.11" },
    { id: "A7", text: "Hydrostatic strength test: B31.8 §841.322 requires test pressure ≥ 1.25× MAOP for Class 1 locations, held for 8 hours minimum.", ref: "ASME B31.8:2022 §841.322" },
  ];

  const references = [
    { std: "ASME B31.3:2022", title: "Process Piping — §304.1.2 Straight Pipe Pressure Design" },
    { std: "ASME B31.4:2019", title: "Pipeline Transportation Systems — §403.2.1 Pressure Design" },
    { std: "ASME B31.8:2022", title: "Gas Transmission and Distribution Piping — §841.11" },
    { std: "ASME B36.10M:2018", title: "Welded and Seamless Wrought Steel Pipe (schedule dimensions)" },
    { std: "ASME B36.19M:2018", title: "Stainless Steel Pipe (5S / 10S / 40S / 80S schedules)" },
    { std: "API 5L:2018 (PSL2)", title: "Specification for Line Pipe — SMYS, SMUTS, mill tolerance" },
    { std: "ASTM A106-2019", title: "Seamless Carbon Steel Pipe for High-Temperature Service" },
    { std: "ASTM A333-2021", title: "Seamless and Welded Steel Pipe for Low-Temperature Service" },
    { std: "ASTM A312-2022", title: "Seamless, Welded, and Heavily Cold Worked Austenitic SS Pipe" },
    { std: "NACE SP0169 / ISO 15589-1", title: "Corrosion allowance basis and cathodic protection for pipelines" },
    { std: "ASME B16.5:2017", title: "Pipe Flanges and Flanged Fittings (for NPS ≤ 24\", Class 150–2500)" },
    { std: "ASME B16.47:2017", title: "Large Diameter Steel Flanges (NPS 26–60, Series A & B)" },
  ];

  return (
    <div className="space-y-4 mt-4" data-testid="panel-assumptions">
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Assumptions & Method
            <Badge variant="outline" className="text-xs ml-auto">{std}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-2">
            {assumptions.map(a => (
              <div key={a.id} className="flex gap-2 text-sm">
                <span className="text-primary font-mono shrink-0 w-6">{a.id}</span>
                <div>
                  <span className="text-foreground/80">{a.text}</span>
                  <span className="ml-2 text-xs text-blue-400/80 font-mono">[{a.ref}]</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm text-muted-foreground">References</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-1">
            {references.map((r, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="font-mono text-primary shrink-0 min-w-[180px]">{r.std}</span>
                <span className="text-muted-foreground">{r.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground border border-amber-800/40 bg-amber-950/20 rounded px-3 py-2">
        <strong>Screening Tool Notice:</strong> This calculator implements the pressure design equations from ASME B31.3 §304.1.2 and ASME B31.4/B31.8 §403.2.1/§841.11. It does NOT account for sustained loads, thermal expansion stresses, bending, torsion, external pressure, seismic loads, or wind. A full piping stress analysis per ASME B31.3 Chapter II is required before finalising design. Always verify allowable stress values against the current edition of the applicable standard.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PipeWallThicknessPage() {
  const [tab,    setTab]    = useState<TabId>("project");
  const [inp,    setInp]    = useState<PipeWTInput>(cloneInput(DEFAULT_PWT_INPUT));
  const [result, setResult] = useState<PipeWTResult | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const upd = useCallback(<K extends keyof PipeWTInput>(key: K, val: PipeWTInput[K]) => {
    setInp(prev => ({ ...prev, [key]: val }));
    setResult(null);
  }, []);

  const updProject = useCallback(<K extends keyof PipeWTInput["project"]>(key: K, val: string) => {
    setInp(prev => ({ ...prev, project: { ...prev.project, [key]: val } }));
  }, []);

  const handleNpsChange = (nps: string) => {
    const entry = NPS_DATA.find(e => e.nps === nps);
    setInp(prev => ({
      ...prev,
      npsLabel: nps,
      outerDiameter: entry ? entry.odMm : prev.outerDiameter,
    }));
    setResult(null);
  };

  const handleStdChange = (std: PipeStandard) => {
    setInp(prev => {
      const next = { ...prev, pipingStandard: std };
      // If switching to B31.4/B31.8 and material is a B31.3-only material, reset to API5L_X52
      const mat = MATERIAL_DB[prev.materialId];
      if (mat && !mat.compatibleStandards.includes(std)) {
        next.materialId = std === "B31.3" ? "A106_B" : "API5L_X52";
        next.jointType  = std === "B31.3" ? "seamless" : "erw";
      }
      // erw_psl2 is B31.8-only; reset to erw if switching to B31.3/B31.4
      if (prev.jointType === "erw_psl2" && std !== "B31.8") {
        next.jointType = "erw";
      }
      // FBW is not permitted for B31.8 gas transmission; reset to erw
      if (prev.jointType === "fbw" && std === "B31.8") {
        next.jointType = "erw";
      }
      return next;
    });
    setResult(null);
  };

  const handleMaterialChange = (id: string) => {
    const mat = MATERIAL_DB[id];
    setInp(prev => ({
      ...prev,
      materialId: id,
      jointType: mat ? mat.defaultJoint : prev.jointType,
    }));
    setResult(null);
  };

  const runCalc = () => {
    try {
      setError(null);
      const res = calculatePipeWT(inp);
      setResult(res);
      setTab("results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const loadTestCase = (which: "B31.3" | "B31.8") => {
    setInp(cloneInput(which === "B31.3" ? PWT_TEST_CASE_B313 : PWT_TEST_CASE_B318));
    setResult(null);
    setError(null);
    setTab("project");
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify({ input: inp, result }, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const availableMaterials = Object.values(MATERIAL_DB).filter(m =>
    m.compatibleStandards.includes(inp.pipingStandard)
  );

  const currentMat = MATERIAL_DB[inp.materialId];

  // Tab navigation guards
  const canGoResults = true;
  const tabIdx = TABS.indexOf(tab);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/calculators/piping-components" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-1">
            <ChevronLeft className="h-3 w-3" /> Piping Components
          </Link>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-calc-title">
            Pipe Wall Thickness
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ASME B31.3 §304.1.2 · ASME B31.4 §403.2.1 · ASME B31.8 §841.11 · ASME B36.10M
          </p>
          <p className="text-xs text-amber-500/80 mt-0.5 font-medium">Preliminary Wall Thickness &amp; Schedule Screening Tool — results require engineering review before use in design</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select onValueChange={loadTestCase}>
            <SelectTrigger className="w-44 h-8 text-xs" data-testid="button-load-test">
              <SelectValue placeholder="Load test case" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="B31.3">ASME B31.3 — Process Pipe (6″ A106-B)</SelectItem>
              <SelectItem value="B31.8">ASME B31.8 — Gas Pipeline (12″ X60)</SelectItem>
            </SelectContent>
          </Select>
          {result && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={copyJson} data-testid="button-copy-json">
                <Copy className="h-3 w-3" />{copied ? "Copied!" : "Copy JSON"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950/60 border border-red-600 rounded px-4 py-3 text-sm text-red-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>Calculation error:</strong> {error}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/20">
          <TabsTrigger value="project"  data-testid="tab-project">1 · Project</TabsTrigger>
          <TabsTrigger value="pipe"     data-testid="tab-pipe">2 · Pipe & Material</TabsTrigger>
          <TabsTrigger value="basis"    data-testid="tab-basis">3 · Design Basis</TabsTrigger>
          <TabsTrigger value="results"  data-testid="tab-results">4 · Results</TabsTrigger>
          <TabsTrigger value="actions"  data-testid="tab-actions">5 · Recommendations</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Project ── */}
        <TabsContent value="project">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-400">Project Information & Standard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Standard Selection */}
              <div className="rounded border border-border bg-muted/10 p-4 space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Piping Standard</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  {(["B31.3", "B31.4", "B31.8"] as PipeStandard[]).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStdChange(s)}
                      data-testid={`btn-std-${s.replace(".", "")}`}
                      className={`rounded border px-3 py-3 text-left text-sm transition-colors ${
                        inp.pipingStandard === s
                          ? "border-amber-500 bg-amber-950/40 text-amber-200"
                          : "border-border hover:border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      <div className="font-bold">{s}</div>
                      <div className="text-xs mt-0.5 opacity-80">
                        {s === "B31.3" ? "Process Piping — §304.1.2" :
                         s === "B31.4" ? "Liquid Pipelines — §403.2.1" :
                         "Gas Transmission — §841.11"}
                      </div>
                    </button>
                  ))}
                </div>
                {inp.pipingStandard === "B31.3" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Design formula: <code className="text-primary">t = P·D / (2·(S·E·W + P·Y))</code> — uses allowable stress S (fraction of yield/tensile per Table A-1), joint factor E, Y-coefficient, and W-factor.
                  </p>
                )}
                {(inp.pipingStandard === "B31.4" || inp.pipingStandard === "B31.8") && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Design formula: <code className="text-primary">t = P·D / (2·S·F·E·T)</code> — uses SMYS directly with design factor F, joint factor E, and temperature derating T.
                  </p>
                )}
              </div>

              {/* Project fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proj-name">Project / System Description</Label>
                  <Input id="proj-name" value={inp.project.name} onChange={e => updProject("name", e.target.value)} placeholder="e.g. Crude Oil HP Separator Piping" data-testid="input-proj-name" />
                </div>
                <div>
                  <Label htmlFor="proj-tag">Line / Tag Number</Label>
                  <Input id="proj-tag" value={inp.project.lineTag} onChange={e => updProject("lineTag", e.target.value)} placeholder='e.g. 6"-P-1001-A1A' data-testid="input-proj-tag" />
                </div>
                <div>
                  <Label htmlFor="proj-eng">Engineer</Label>
                  <Input id="proj-eng" value={inp.project.engineer} onChange={e => updProject("engineer", e.target.value)} placeholder="Name / initials" data-testid="input-proj-engineer" />
                </div>
                <div>
                  <Label htmlFor="proj-rev">Rev</Label>
                  <Input id="proj-rev" value={inp.project.rev} onChange={e => updProject("rev", e.target.value)} placeholder="A" className="max-w-xs" data-testid="input-proj-rev" />
                </div>
                <div>
                  <Label htmlFor="proj-date">Date</Label>
                  <Input id="proj-date" type="date" value={inp.project.date} onChange={e => updProject("date", e.target.value)} className="max-w-xs" data-testid="input-proj-date" />
                </div>
                <div>
                  <Label>Data Quality</Label>
                  <Select value={inp.project.dataQuality} onValueChange={v => updProject("dataQuality", v)}>
                    <SelectTrigger data-testid="select-data-quality"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preliminary">Preliminary — for estimation only</SelectItem>
                      <SelectItem value="confirmed">Confirmed — based on verified data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setTab("pipe")} data-testid="btn-next-pipe">
                  Next — Pipe & Material <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Pipe & Material ── */}
        <TabsContent value="pipe">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-400">Pipe Size & Material Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* NPS / OD */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipe Size</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      checked={inp.useNpsSel}
                      onChange={() => { upd("useNpsSel", true); }}
                      className="accent-amber-500"
                    />
                    NPS selection (ASME B36.10M)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      checked={!inp.useNpsSel}
                      onChange={() => upd("useNpsSel", false)}
                      className="accent-amber-500"
                    />
                    Custom outside diameter (OD)
                  </label>
                </div>

                {inp.useNpsSel ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>NPS (Nominal Pipe Size)</Label>
                      <Select value={inp.npsLabel} onValueChange={handleNpsChange}>
                        <SelectTrigger data-testid="select-nps"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {NPS_DATA.map(e => (
                            <SelectItem key={e.nps} value={e.nps}>
                              {e.nps} — OD = {e.odMm} mm
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">OD = {inp.outerDiameter.toFixed(1)} mm (per ASME B36.10M)</p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xs">
                    <Label>Outside Diameter OD [mm]</Label>
                    <NumericInput
                      value={inp.outerDiameter}
                      onValueChange={v => upd("outerDiameter", v)}
                      min={10}
                      max={3000}
                      data-testid="input-od"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Custom OD — schedule check disabled. Required nominal wall will still be computed.</p>
                  </div>
                )}
              </div>

              {/* Material */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Material</Label>
                <Select value={inp.materialId} onValueChange={handleMaterialChange}>
                  <SelectTrigger data-testid="select-material"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableMaterials.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                    <SelectItem value="user">User-defined</SelectItem>
                  </SelectContent>
                </Select>

                {inp.materialId === "user" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border/60 rounded p-3 bg-muted/10">
                    <div>
                      <Label>
                        {inp.pipingStandard === "B31.3"
                          ? "Allowable Stress S [MPa] at design temp"
                          : "SMYS [MPa]"}
                      </Label>
                      <NumericInput
                        value={inp.pipingStandard === "B31.3" ? inp.userS_MPa : inp.userSmys}
                        onValueChange={v => inp.pipingStandard === "B31.3" ? upd("userS_MPa", v) : upd("userSmys", v)}
                        min={1} max={1000}
                        data-testid="input-user-stress"
                      />
                    </div>
                    <div>
                      <Label>Material Type (for Y / W coefficient)</Label>
                      <Select value={inp.userMaterialType} onValueChange={v => upd("userMaterialType", v as "ferritic" | "austenitic" | "pipeline" | "user")}>
                        <SelectTrigger data-testid="select-user-mat-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ferritic">Ferritic / Carbon Steel</SelectItem>
                          <SelectItem value="austenitic">Austenitic Stainless Steel</SelectItem>
                          <SelectItem value="pipeline">Pipeline (API 5L / SMYS-based)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {currentMat && (
                  <div className="text-xs text-muted-foreground bg-muted/10 border border-border/40 rounded px-3 py-2">
                    <strong>{currentMat.spec}</strong> — {currentMat.notes}
                  </div>
                )}
              </div>

              {/* Joint Type */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Longitudinal Joint Type
                  <span className="font-normal ml-2 text-muted-foreground/60">
                    {inp.pipingStandard === "B31.3"
                      ? "(E per ASME B31.3 Table A-1B)"
                      : inp.pipingStandard === "B31.4"
                        ? "(E per ASME B31.4 Table 403.2.1-1)"
                        : "(E per ASME B31.8 §841.11)"}
                  </span>
                </Label>
                {inp.pipingStandard !== "B31.3" && (
                  <p className="text-xs text-amber-400/80 bg-amber-950/20 border border-amber-900/40 rounded px-3 py-1.5">
                    B31.4/B31.8 joint factors differ from B31.3. ERW PSL1 = 0.80 (not 0.85). See ASME B31.4 Table 403.2.1-1 / B31.8 §841.11.
                  </p>
                )}
                {inp.pipingStandard === "B31.8" && (
                  <p className="text-xs text-red-400/90 bg-red-950/20 border border-red-900/40 rounded px-3 py-1.5 flex items-start gap-1.5">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    FBW (Furnace Butt Welded) is <strong>not permitted</strong> for gas transmission per ASME B31.8 §817.1 and has been excluded from the selector.
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(inp.pipingStandard === "B31.3" ? QUALITY_FACTORS : QUALITY_FACTORS_PIPELINE)
                    .filter(([key]) => !(inp.pipingStandard === "B31.8" && key === "fbw"))
                    .map(([key, q]) => (
                    <button
                      key={key}
                      onClick={() => upd("jointType", key as JointTypeKey)}
                      data-testid={`btn-joint-${key}`}
                      className={`rounded border px-3 py-2 text-left text-xs transition-colors ${
                        inp.jointType === key
                          ? "border-amber-500 bg-amber-950/40 text-amber-200"
                          : "border-border hover:border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      <div className="font-semibold">{q.label}</div>
                      <div className="opacity-80 mt-0.5">E = {q.E.toFixed(2)}</div>
                    </button>
                  ))}
                  <button
                    onClick={() => upd("jointType", "user")}
                    data-testid="btn-joint-user"
                    className={`rounded border px-3 py-2 text-left text-xs transition-colors ${
                      inp.jointType === "user"
                        ? "border-amber-500 bg-amber-950/40 text-amber-200"
                        : "border-border hover:border-muted-foreground text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold">User-defined</div>
                    <div className="opacity-80 mt-0.5">enter E directly</div>
                  </button>
                </div>
                {inp.jointType === "user" && (
                  <div className="max-w-xs">
                    <Label>Quality Factor E (0 – 1)</Label>
                    <NumericInput
                      value={inp.userE}
                      onValueChange={v => upd("userE", Math.min(1, Math.max(0, v)))}
                      min={0.01} max={1}
                      step={0.01}
                      data-testid="input-user-E"
                    />
                  </div>
                )}
              </div>

              {/* Mill tolerance */}
              <div className="max-w-xs space-y-1">
                <Label>
                  Mill Tolerance MT [%]
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 inline ml-1 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>Standard negative mill tolerance per ASTM A106 / API 5L §9.10 is 12.5%. Required nominal = t_required / (1 − MT/100).</TooltipContent>
                  </Tooltip>
                </Label>
                <NumericInput
                  value={inp.millTolerance}
                  onValueChange={v => upd("millTolerance", Math.max(0, Math.min(25, v)))}
                  min={0} max={25} step={0.5}
                  data-testid="input-mill-tol"
                />
                <p className="text-xs text-muted-foreground">Default 12.5% per ASTM A106 / API 5L §9.10</p>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setTab("project")}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={() => setTab("basis")} data-testid="btn-next-basis">
                  Next — Design Basis <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Design Basis ── */}
        <TabsContent value="basis">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-400">Design Basis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Pressure & Temperature */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>
                    Design Pressure P [bar(g)]
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 inline ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Gauge pressure. Converted internally to MPa: P_MPa = P_bar / 10. Per ASME B31.3 §301.2.2: design pressure ≥ maximum operating pressure including any surge/startup transients.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <NumericInput
                    value={inp.designPressure}
                    onValueChange={v => upd("designPressure", v)}
                    min={0} max={5000}
                    data-testid="input-pressure"
                  />
                  <p className="text-xs text-muted-foreground mt-1">= {(inp.designPressure / 10).toFixed(3)} MPa(g) = {(inp.designPressure * 14.5038).toFixed(1)} psi(g)</p>
                </div>
                <div>
                  <Label>
                    Design Temperature T [°C]
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 inline ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Maximum sustained metal temperature per ASME B31.3 §301.3. Used to determine allowable stress S from Table A-1 and Y-coefficient from Table 304.1.1.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <NumericInput
                    value={inp.designTemperature}
                    onValueChange={v => upd("designTemperature", v)}
                    min={-200} max={900}
                    data-testid="input-temperature"
                  />
                  <p className="text-xs text-muted-foreground mt-1">= {(inp.designTemperature * 9/5 + 32).toFixed(0)} °F</p>
                </div>
              </div>

              {/* Allowances */}
              <div>
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Mechanical Allowances
                  <span className="ml-2 text-xs font-normal text-muted-foreground/60">(ASME B31.3 §304.1.1 — c = sum of all allowances)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label>
                      Corrosion Allowance [mm]
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 inline ml-1 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>Metal loss due to corrosion over design life. c_corr = corrosion rate [mm/yr] × design life [yr]. Per ASME B31.3 §302.4, must be specified by the engineering design.</TooltipContent>
                      </Tooltip>
                    </Label>
                    <NumericInput
                      value={inp.corrosionAllowance}
                      onValueChange={v => upd("corrosionAllowance", Math.max(0, v))}
                      min={0} max={50}
                      step={0.5}
                      data-testid="input-ca"
                    />
                  </div>
                  <div>
                    <Label>
                      Erosion Allowance [mm]
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 inline ml-1 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>Additional allowance for erosion by solid particles / slurry. Per ASME B31.3 §304.1.1(a). Often 0 for clean services.</TooltipContent>
                      </Tooltip>
                    </Label>
                    <NumericInput
                      value={inp.erosionAllowance}
                      onValueChange={v => upd("erosionAllowance", Math.max(0, v))}
                      min={0} max={20}
                      step={0.5}
                      data-testid="input-erosion"
                    />
                  </div>
                  <div>
                    <Label>
                      Thread / Groove Depth [mm]
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 inline ml-1 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>For threaded pipe: thread engagement depth (typically 0.8–1.3 mm). For grooved pipe: groove cut depth. For plain end pipe = 0. Per ASME B31.3 §304.1.1(b).</TooltipContent>
                      </Tooltip>
                    </Label>
                    <NumericInput
                      value={inp.threadGrooveAllowance}
                      onValueChange={v => upd("threadGrooveAllowance", Math.max(0, v))}
                      min={0} max={10}
                      step={0.1}
                      data-testid="input-thread"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total c = {(inp.corrosionAllowance + inp.erosionAllowance + inp.threadGrooveAllowance).toFixed(2)} mm
                </p>
              </div>

              {/* B31.8 Location Class */}
              {inp.pipingStandard === "B31.8" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    ASME B31.8 Location Class
                    <span className="ml-2 text-xs font-normal text-muted-foreground/60">(§841.114A)</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(B318_LOCATION_CLASS).map(([key, lc]) => (
                      <button
                        key={key}
                        onClick={() => upd("locationClass", key as LocationClassKey)}
                        data-testid={`btn-lc-${key}`}
                        className={`rounded border px-3 py-2 text-left text-xs transition-colors ${
                          inp.locationClass === key
                            ? "border-amber-500 bg-amber-950/40 text-amber-200"
                            : "border-border hover:border-muted-foreground text-muted-foreground"
                        }`}
                      >
                        <div className="font-semibold">Class {key}</div>
                        <div className="opacity-80 mt-0.5">{lc.label}</div>
                        <div className="text-amber-300 font-mono mt-1">F = {lc.F.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* B31.4 override design factor */}
              {(inp.pipingStandard === "B31.4" || inp.pipingStandard === "B31.8") && (
                <div className="max-w-xs space-y-2">
                  <Label>
                    Override Design Factor F
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 inline ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Leave blank to use the standard default (B31.4: 0.72; B31.8: per location class). Enter a value only if the engineering specification requires a lower design factor.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    placeholder={inp.pipingStandard === "B31.4" ? "0.72 (default)" : `${B318_LOCATION_CLASS[inp.locationClass]?.F ?? 0.72} (default)`}
                    value={inp.userDesignFactor ?? ""}
                    onChange={e => {
                      const v = e.target.value;
                      upd("userDesignFactor", v === "" ? null : parseFloat(v));
                    }}
                    min={0.01} max={0.80} step={0.01}
                    data-testid="input-design-factor"
                  />
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setTab("pipe")}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={runCalc} data-testid="button-calculate" className="bg-amber-600 hover:bg-amber-500 text-black font-semibold gap-2">
                  <Calculator className="h-4 w-4" /> Calculate Wall Thickness
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Results ── */}
        <TabsContent value="results">
          {!result ? (
            <Card className="border-border bg-card/60">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Complete the design basis and click <strong>Calculate Wall Thickness</strong>.</p>
                <Button className="mt-4" onClick={() => setTab("basis")} data-testid="btn-go-basis">
                  Go to Design Basis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <FlagBanner flags={result.flags} />

              {result.flags.includes("USER_OVERRIDE_ACTIVE") && (
                <div className="flex items-start gap-2 rounded border border-orange-600/60 bg-orange-950/30 px-4 py-3 text-sm text-orange-200" data-testid="banner-user-override">
                  <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0 text-orange-400" />
                  <div>
                    <strong className="text-orange-300">User-Defined Override Active.</strong> One or more design parameters (allowable stress S, quality factor E, or design factor F) have been entered manually, bypassing the built-in material and standard lookup tables. These values must be traceable to ASME B31.3 Table A-1, API 5L, or equivalent recognised standards and must be documented in the formal design record. See Engineering Warnings below for details.
                  </div>
                </div>
              )}

              {result.flags.includes("PRELIMINARY_DATA") && (
                <div className="flex items-start gap-2 rounded border border-amber-600/60 bg-amber-950/30 px-4 py-2 text-xs text-amber-200" data-testid="banner-preliminary">
                  <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
                  <span><strong>Preliminary data quality selected.</strong> Results are for estimation and concept screening only. Confirm all inputs (P, T, material, allowances) before advancing to detailed design.</span>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "t_pressure", value: fmt(result.t_pressure), unit: "mm", tip: "Pressure design thickness only, per ASME B31.3 §304.1.2" },
                  { label: "t_required (incl. c)", value: fmt(result.t_required), unit: "mm", tip: "t_p + all mechanical allowances" },
                  { label: "t_nominal min.", value: fmt(result.t_nominal_required), unit: "mm", tip: `Minimum nominal wall to buy: t_req / (1 − ${inp.millTolerance}%)` },
                  { label: "Selected schedule", value: result.selectedSchedule ? result.selectedSchedule.schedule : "None", unit: result.selectedSchedule ? `${fmt(result.selectedSchedule.wallMm)} mm` : "", tip: "First B36.10M schedule that satisfies t_nom_req" },
                ].map(c => (
                  <Tooltip key={c.label}>
                    <TooltipTrigger asChild>
                      <div className="rounded border border-border bg-card/60 px-3 py-3 cursor-default" data-testid={`card-${c.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}>
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                        <div className="text-xl font-bold text-amber-400 font-mono">{c.value}</div>
                        <div className="text-xs text-muted-foreground">{c.unit}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{c.tip}</TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Secondary metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Allowable stress S", value: fmt(result.S_eff), unit: "MPa" },
                  { label: inp.pipingStandard === "B31.3" ? "Y coefficient" : "Design factor F", value: inp.pipingStandard === "B31.3" ? fmt(result.Y_eff, 1) : fmt(result.F_eff, 2), unit: "—" },
                  { label: "Quality factor E", value: fmt(result.E_eff, 2), unit: "—" },
                  { label: result.selectedSchedule ? "MAOP (selected sch.)" : "MAOP (req. nom.)", value: result.selectedSchedule ? fmt(result.selectedSchedule.maop) : "—", unit: "bar(g)" },
                ].map(c => (
                  <div key={c.label} className="rounded border border-border/50 bg-muted/10 px-3 py-2">
                    <div className="text-xs text-muted-foreground">{c.label}</div>
                    <div className="text-base font-semibold font-mono text-foreground">{c.value}</div>
                    <div className="text-xs text-muted-foreground">{c.unit}</div>
                  </div>
                ))}
              </div>

              {/* Thick-wall indicator */}
              {result.isThickWall && (
                <div className="flex items-start gap-2 rounded border border-amber-600 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
                  <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>Thick-wall condition.</strong> t/D = {fmt(result.tOverD, 4)} ≥ 1/6. Lamé thick-wall equation applied (ASME B31.3 §304.1.2(c)):
                    t = D/2 · (√((S·E·W+P)/(S·E·W−P)) − 1) = <strong>{fmt(result.t_lame)} mm</strong>.
                  </span>
                </div>
              )}

              {/* Selected schedule detail */}
              {result.selectedSchedule && (
                <Card className="border-green-800/60 bg-green-950/20">
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      <span className="font-semibold text-green-300">Governing Schedule: {result.selectedSchedule.schedule}</span>
                      <span className="text-sm text-muted-foreground ml-auto">NPS {inp.npsLabel}, OD = {inp.outerDiameter.toFixed(1)} mm</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Nominal wall:</span><br/><span className="font-mono font-semibold">{fmt(result.selectedSchedule.wallMm)} mm</span></div>
                      <div><span className="text-muted-foreground">Effective (corroded):</span><br/><span className="font-mono font-semibold">{fmt(result.selectedSchedule.tEffective)} mm</span></div>
                      <div>
                        <span className="text-muted-foreground">MAOP (back-calc):</span><br/>
                        <span className="font-mono font-semibold">{fmt(result.selectedSchedule.maop)} bar(g)</span>
                        {inp.designPressure > 0 && (
                          <span className={`ml-1.5 text-xs font-normal ${
                            result.selectedSchedule.maop < inp.designPressure ? "text-red-400" :
                            result.selectedSchedule.maop / inp.designPressure < 1.05 ? "text-amber-400" : "text-green-400"
                          }`}>
                            ({((result.selectedSchedule.maop - inp.designPressure) / inp.designPressure * 100).toFixed(1)}% margin)
                          </span>
                        )}
                      </div>
                      <div><span className="text-muted-foreground">Hoop stress utilisation:</span><br/><span className={`font-mono font-semibold ${result.selectedSchedule.utilisation > 0.9 ? "text-amber-400" : "text-green-400"}`}>{fmt(result.selectedSchedule.utilisation * 100, 1)}%</span></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Schedule table */}
              {result.scheduleChecks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">ASME B36.10M Schedule Comparison — NPS {inp.npsLabel}</h3>
                  <ScheduleTable checks={result.scheduleChecks} tReq={result.t_nominal_required} />
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <Card className="border-border bg-card/60">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Engineering Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-2">
                    {result.warnings.map((w, i) => (
                      <div key={i} className="text-sm text-amber-200/80 flex items-start gap-2">
                        <span className="text-amber-500 shrink-0">•</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Step trace */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Calculation Trace</h3>
                <CalcStepTable steps={result.calcSteps} />
              </div>

              {/* Assumptions */}
              <AssumptionsPanel inp={inp} />
            </div>
          )}
        </TabsContent>

        {/* ── Tab 5: Actions ── */}
        <TabsContent value="actions">
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-400">Engineering Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result && result.flags.length > 0 && <FlagBanner flags={result.flags} />}

              {/* Recommendations */}
              {result && result.recommendations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Action Items</Label>
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 rounded border border-border bg-card/40 px-3 py-2 text-sm">
                      <span className="text-amber-500 font-bold shrink-0 w-5">{i + 1}.</span>
                      <span className="text-foreground/80">{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Standards checklist */}
              <div>
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Design Verification Checklist</Label>
                <div className="space-y-2">
                  {[
                    { item: "Pressure design thickness calculated per governing standard (B31.3 §304.1.2 / B31.4 §403.2.1 / B31.8 §841.11).", ref: "ASME B31.3/4/8" },
                    { item: "Allowable stress S (B31.3) or SMYS (B31.4/B31.8) confirmed against current edition of ASME B31.3 Table A-1 / API 5L Table B.2 at design temperature.", ref: "ASME B31.3 Table A-1 / API 5L Table B.2" },
                    { item: "Corrosion allowance justified by corrosion rate survey, material compatibility study, or owner's engineering specification.", ref: "ASME B31.3 §302.4" },
                    { item: "Mill tolerance confirmed for the ordered specification (ASTM A106/A333/A312 = 12.5%; may be reduced by special order agreement).", ref: "ASTM A106 / API 5L §9.10" },
                    { item: "Pipe schedule selected from ASME B36.10M (steel) or B36.19M (stainless). Confirm availability with vendor before finalising.", ref: "ASME B36.10M:2018" },
                    { item: "Selected pipe MAOP ≥ design pressure (including margin for pressure surges and startup transients).", ref: "ASME B31.3 §301.2" },
                    { item: "Hydrostatic test pressure confirmed: 1.5× DP (B31.3 §345.4.2) or 1.25× DP (B31.4 §437.4.1 / B31.8 §841.322). All components and supports rated for test pressure.", ref: "ASME B31.3 §345 / B31.4 §437 / B31.8 §841" },
                    { item: "Flanges, valves, fittings, and olets selected per the piping class (ASME B16.5 / B16.47 / B16.11) for the same design pressure and temperature.", ref: "ASME B16.5:2017 / B16.47:2017" },
                    { item: "Sustained, occasional, and thermal expansion loads checked by piping flexibility analysis. Pipe stress allowable per ASME B31.3 §302.3.5 / §319.", ref: "ASME B31.3 §319" },
                    { item: "External pressure (vacuum / full-vacuum service) checked separately per ASME B31.3 §304.1.3 and ASME Section VIII Div. 1 UG-28.", ref: "ASME B31.3 §304.1.3 / ASME VIII Div.1 UG-28" },
                    { item: "Impact test requirements confirmed for low-temperature service: ASME B31.3 §323.2.2. Minimum design metal temperature (MDMT) established from ASME B31.3 Figure 323.2.2A.", ref: "ASME B31.3 §323.2.2" },
                    { item: "For elevated-temperature service (T > 370 °C), creep and time-dependent behaviour addressed; weld joint strength reduction factor W reviewed per ASME B31.3 Table 302.3.5.", ref: "ASME B31.3 Table 302.3.5" },
                    { item: "NDE requirements confirmed per piping class: 100% radiographic (RT) or ultrasonic (UT) for Category D severe cyclic or high-pressure service. Random RT for normal fluid service.", ref: "ASME B31.3 §341.4.1" },
                    { item: "For sour service (H₂S > 0.003 MPa partial pressure): material hardness, PWHT, and SSC testing per NACE MR0175 / ISO 15156.", ref: "NACE MR0175 / ISO 15156-2" },
                    { item: "For pipeline (B31.4/B31.8): seam weld NDE (API 5L / B31.8 §826), cathodic protection (NACE SP0169 / ISO 15589-1), and pipeline integrity plan confirmed.", ref: "API 5L:2018 / NACE SP0169" },
                  ].map((c, i) => (
                    <div key={i} className="flex items-start gap-3 rounded border border-border/50 bg-muted/10 px-3 py-2 text-sm">
                      <input type="checkbox" className="mt-0.5 accent-amber-500 shrink-0" data-testid={`check-${i}`} />
                      <div>
                        <span className="text-foreground/80">{c.item}</span>
                        <span className="ml-2 text-xs text-blue-400/80 font-mono">[{c.ref}]</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!result && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Run the calculation to populate action items specific to your design case.
                  <div className="mt-2">
                    <Button onClick={() => setTab("basis")}>Go to Design Basis</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom nav */}
      <div className="flex justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={tabIdx === 0}
          onClick={() => setTab(TABS[tabIdx - 1])}
          data-testid="btn-prev"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={tabIdx === TABS.length - 1}
          onClick={() => setTab(TABS[tabIdx + 1])}
          data-testid="btn-next"
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
