import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Ruler, Calculator, AlertTriangle, CheckCircle2, RotateCcw, Info, Download, FileText, FileSpreadsheet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { calculateSafeSpan, type SafeSpanInput, type SafeSpanResult } from "@/lib/engineering/piping/safeSpans";
import { exportToExcel, exportToCalcNote, exportToJSON, type ExportDatasheet } from "@/lib/engineering/exportUtils";
import { FeedbackSection } from "@/components/engineering/feedback-section";

export default function SafeSpansPage() {
  const [pipeOD, setPipeOD] = useState(219.1);
  const [pipeWT, setPipeWT] = useState(8.18);
  const [pipeDensity, setPipeDensity] = useState(7850);
  const [fluidDensity, setFluidDensity] = useState(1000);
  const [insulThk, setInsulThk] = useState(50);
  const [insulDensity, setInsulDensity] = useState(120);
  const [allowDefl, setAllowDefl] = useState(12.5);
  const [elasticMod, setElasticMod] = useState(200);
  const [allowStress, setAllowStress] = useState(138);
  const [concLoad, setConcLoad] = useState(0);
  const [supportType, setSupportType] = useState<"simple" | "continuous" | "fixed">("simple");
  const [result, setResult] = useState<SafeSpanResult | null>(null);

  const handleCalculate = () => {
    const input: SafeSpanInput = {
      pipe_od_mm: pipeOD,
      pipe_wt_mm: pipeWT,
      pipe_density_kg_m3: pipeDensity,
      fluid_density_kg_m3: fluidDensity,
      insulation_thickness_mm: insulThk,
      insulation_density_kg_m3: insulDensity,
      allowable_deflection_mm: allowDefl,
      elastic_modulus_gpa: elasticMod,
      allowable_stress_mpa: allowStress,
      concentrated_load_n: concLoad,
      support_type: supportType,
    };
    setResult(calculateSafeSpan(input));
  };

  const handleReset = () => {
    setPipeOD(219.1); setPipeWT(8.18); setPipeDensity(7850);
    setFluidDensity(1000); setInsulThk(50); setInsulDensity(120);
    setAllowDefl(12.5); setElasticMod(200); setAllowStress(138);
    setConcLoad(0); setSupportType("simple"); setResult(null);
  };

  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;
    return {
      calculatorName: "Safe Span Screening",
      projectInfo: [
        { label: "Support Type", value: supportType === "simple" ? "Simply Supported" : supportType === "continuous" ? "Continuous" : "Fixed Ends" },
      ],
      inputs: [
        { label: "Pipe OD", value: pipeOD, unit: "mm" },
        { label: "Pipe WT", value: pipeWT, unit: "mm" },
        { label: "Pipe Density", value: pipeDensity, unit: "kg/m³" },
        { label: "Fluid Density", value: fluidDensity, unit: "kg/m³" },
        { label: "Insulation Thickness", value: insulThk, unit: "mm" },
        { label: "Insulation Density", value: insulDensity, unit: "kg/m³" },
        { label: "Allowable Deflection", value: allowDefl, unit: "mm" },
        { label: "Elastic Modulus", value: elasticMod, unit: "GPa" },
        { label: "Allowable Stress", value: allowStress, unit: "MPa" },
        { label: "Concentrated Load", value: concLoad, unit: "N" },
      ],
      results: [
        { label: "Governing Safe Span", value: result.governing_span_m, unit: "m", highlight: true },
        { label: "Governing Criterion", value: result.governing_criterion, unit: "" },
        { label: "Span by Stress", value: result.span_by_stress_m, unit: "m" },
        { label: "Span by Deflection", value: result.span_by_deflection_m, unit: "m" },
        { label: "Pipe Weight", value: result.pipe_weight_kg_m, unit: "kg/m" },
        { label: "Fluid Weight", value: result.fluid_weight_kg_m, unit: "kg/m" },
        { label: "Insulation Weight", value: result.insulation_weight_kg_m, unit: "kg/m" },
        { label: "Total Weight", value: result.total_weight_kg_m, unit: "kg/m" },
        { label: "Total Load", value: result.total_load_n_m, unit: "N/m" },
        { label: "Pipe ID", value: result.pipe_id_mm, unit: "mm" },
      ],
      calcSteps: result.trace.map(t => ({ label: t.step, value: t.value })),
      methodology: ["Beam bending theory per ASME B31.3", "Stress criterion: σ_bending ≤ S_a", "Deflection criterion: δ_max ≤ allowable deflection"],
      assumptions: ["Uniform distributed load (pipe + fluid + insulation)", "Does not include wind, seismic, or dynamic loads", "Consult project piping specification for final support spacing"],
      references: ["ASME B31.3 Process Piping"],
      warnings: result.warnings,
    };
  };

  const handleExport = (format: "pdf" | "excel" | "json") => {
    const data = buildExportData();
    if (!data) return;
    if (format === "pdf") exportToCalcNote(data);
    else if (format === "excel") exportToExcel(data);
    else exportToJSON(data);
  };

  return (
    <div className="min-h-screen">
      <section className="py-6 md:py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/calculators/piping-components"><Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-piping"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-safespans-title"><Ruler className="w-5 h-5 text-primary" /> Safe Span Screening</h1>
              <p className="text-xs text-muted-foreground">ASME B31.3 — Pipe support spacing by stress and deflection criteria</p>
            </div>
          </div>

          <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-400 space-y-1">
                <p><strong>Beam-span screening only — not a substitute for a formal pipe support design.</strong></p>
                <p>This tool applies standard beam bending theory with idealised support coefficients:
                  Simply Supported (C_stress = 8, C_defl = 76.8), Continuous (C_stress = 10),
                  Fixed Ends (C_stress = 12, C_defl = 384). These are engineering approximations for
                  uniform loading between two supports. Real pipe supports have intermediate flexibility
                  and may differ significantly from these idealised conditions.</p>
                <p>The following are <strong>NOT included</strong> in this screening:</p>
                <ul className="list-disc ml-4 space-y-0.5 text-amber-400/90">
                  <li>Wind, seismic, surge, or slug-flow loads</li>
                  <li>Thermal expansion / contraction forces on supports</li>
                  <li>Nozzle load verification at connected equipment</li>
                  <li>Dynamic effects, acoustic / flow-induced vibration</li>
                  <li>Support settlement or non-uniform load distribution</li>
                </ul>
                <p>Final support spacing must be confirmed by the project piping specification and a formal stress analysis (Caesar II / AutoPIPE / manual calculation per ASME B31.3).</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><h3 className="text-sm font-semibold">Input Parameters</h3></CardHeader>
              <CardContent className="space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pipe</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">OD (mm)</Label><NumericInput value={pipeOD} onValueChange={setPipeOD} className="h-8 text-xs" data-testid="input-pipe-od" /></div>
                  <div><Label className="text-xs">WT (mm)</Label><NumericInput value={pipeWT} onValueChange={setPipeWT} className="h-8 text-xs" data-testid="input-pipe-wt" /></div>
                  <div><Label className="text-xs">ρ_pipe (kg/m³)</Label><NumericInput value={pipeDensity} onValueChange={setPipeDensity} className="h-8 text-xs" data-testid="input-pipe-density" /></div>
                </div>

                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fluid</h4>
                <div><Label className="text-xs">Fluid Density (kg/m³)</Label><NumericInput value={fluidDensity} onValueChange={setFluidDensity} className="h-8 text-xs" data-testid="input-fluid-density" /></div>

                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Insulation</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Thickness (mm)</Label><NumericInput value={insulThk} onValueChange={setInsulThk} className="h-8 text-xs" data-testid="input-insul-thk" /></div>
                  <div><Label className="text-xs">ρ_insul (kg/m³)</Label><NumericInput value={insulDensity} onValueChange={setInsulDensity} className="h-8 text-xs" data-testid="input-insul-density" /></div>
                </div>

                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Criteria</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Allowable Deflection (mm)</Label><NumericInput value={allowDefl} onValueChange={setAllowDefl} className="h-8 text-xs" data-testid="input-allow-defl" /></div>
                  <div><Label className="text-xs">E (GPa)</Label><NumericInput value={elasticMod} onValueChange={setElasticMod} className="h-8 text-xs" data-testid="input-elastic-mod" /></div>
                  <div><Label className="text-xs">Allowable Stress (MPa)</Label><NumericInput value={allowStress} onValueChange={setAllowStress} className="h-8 text-xs" data-testid="input-allow-stress" /></div>
                  <div><Label className="text-xs">Support Type</Label>
                    <Select value={supportType} onValueChange={v => setSupportType(v as "simple" | "continuous" | "fixed")}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-support-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simply Supported</SelectItem>
                        <SelectItem value="continuous">Continuous</SelectItem>
                        <SelectItem value="fixed">Fixed Ends</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCalculate} size="sm" data-testid="button-calculate"><Calculator className="w-3.5 h-3.5 mr-1.5" />Calculate</Button>
                  <Button onClick={handleReset} variant="outline" size="sm" data-testid="button-reset"><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Reset</Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <div className="space-y-4">
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <h3 className="text-sm font-semibold">Governing Safe Span: {result.governing_span_m.toFixed(2)} m</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Governed by: {result.governing_criterion}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" data-testid="button-export-results"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="button-export-calc-note"><FileText className="w-4 h-4 mr-2 text-red-400" />Calc Note (Print / PDF)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("excel")} data-testid="button-export-excel"><FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />Export as Excel</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("json")} data-testid="button-export-json"><Download className="w-4 h-4 mr-2 text-blue-400" />Export as JSON</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Span (Stress)</span><span className="font-mono">{result.span_by_stress_m.toFixed(2)} m</span></div>
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Span (Deflection)</span><span className="font-mono">{result.span_by_deflection_m.toFixed(2)} m</span></div>
                    </div>
                    <h4 className="text-xs font-medium text-muted-foreground mt-2">Weight Breakdown</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Pipe</span><span className="font-mono">{result.pipe_weight_kg_m.toFixed(2)} kg/m</span></div>
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Fluid</span><span className="font-mono">{result.fluid_weight_kg_m.toFixed(2)} kg/m</span></div>
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Insulation</span><span className="font-mono">{result.insulation_weight_kg_m.toFixed(2)} kg/m</span></div>
                      <div className="p-2 rounded bg-primary/10 border border-primary/20"><span className="text-muted-foreground block">Total</span><span className="font-mono font-medium">{result.total_weight_kg_m.toFixed(2)} kg/m</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Load</span><span className="font-mono">{result.total_load_n_m.toFixed(1)} N/m</span></div>
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Pipe ID</span><span className="font-mono">{result.pipe_id_mm.toFixed(1)} mm</span></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><h3 className="text-sm font-semibold">Calculation Trace</h3></CardHeader>
                  <CardContent className="space-y-1">
                    {result.trace.map((t, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-mono">{t.step}</span>
                        <span className="font-mono">{t.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {result.warnings.length > 0 && (
                  <Card className="border-amber-500/20">
                    <CardContent className="py-3 space-y-1">
                      {result.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {!result && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Info className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Enter parameters and click Calculate to screen safe span</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mt-6 p-3 rounded-md border border-muted/30 bg-muted/5">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>References:</strong> ASME B31.3 Process Piping — beam bending theory for pipe support spacing.
              Does not include wind, seismic, or dynamic loads. Consult project piping specification for final support spacing.
            </p>
          </div>

          <div className="mt-6"><FeedbackSection calculatorName="Safe Span Screening" /></div>
        </div>
      </section>
    </div>
  );
}
