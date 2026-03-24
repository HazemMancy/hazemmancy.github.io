import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, Calculator, AlertTriangle, CheckCircle2, RotateCcw, Info, Download, FileText, FileSpreadsheet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { calculateFlexibility, MATERIAL_PROPERTIES, type FlexibilityInput, type FlexibilityResult } from "@/lib/engineering/piping/flexibility";
import { exportToExcel, exportToCalcNote, exportToJSON, type ExportDatasheet } from "@/lib/engineering/exportUtils";
import { FeedbackSection } from "@/components/engineering/feedback-section";

export default function PipeFlexibilityPage() {
  const [material, setMaterial] = useState("CS_A106B");
  const [tempAmbient, setTempAmbient] = useState(25);
  const [tempOperating, setTempOperating] = useState(200);
  const [pipeOD, setPipeOD] = useState(219.1);
  const [pipeWT, setPipeWT] = useState(8.18);
  const [straightRun, setStraightRun] = useState(30);
  const [allowableStress, setAllowableStress] = useState(138);
  const [fixedBothEnds, setFixedBothEnds] = useState(true);
  const [result, setResult] = useState<FlexibilityResult | null>(null);

  const mat = MATERIAL_PROPERTIES[material];

  const handleCalculate = () => {
    const input: FlexibilityInput = {
      material,
      elastic_modulus_gpa: mat.E_gpa,
      thermal_coeff: mat.alpha,
      temp_ambient_c: tempAmbient,
      temp_operating_c: tempOperating,
      pipe_od_mm: pipeOD,
      pipe_wt_mm: pipeWT,
      straight_run_m: straightRun,
      allowable_stress_mpa: allowableStress,
      fixed_both_ends: fixedBothEnds,
    };
    setResult(calculateFlexibility(input));
  };

  const handleReset = () => {
    setMaterial("CS_A106B");
    setTempAmbient(25); setTempOperating(200);
    setPipeOD(219.1); setPipeWT(8.18);
    setStraightRun(30); setAllowableStress(138);
    setFixedBothEnds(true); setResult(null);
  };

  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;
    return {
      calculatorName: "Pipe Flexibility Screening",
      projectInfo: [
        { label: "Material", value: mat.desc },
        { label: "End Restraint", value: fixedBothEnds ? "Fixed Both Ends" : "Guided / Free" },
      ],
      inputs: [
        { label: "Pipe OD", value: pipeOD, unit: "mm" },
        { label: "Pipe WT", value: pipeWT, unit: "mm" },
        { label: "Straight Run", value: straightRun, unit: "m" },
        { label: "Ambient Temperature", value: tempAmbient, unit: "°C" },
        { label: "Operating Temperature", value: tempOperating, unit: "°C" },
        { label: "Elastic Modulus", value: mat.E_gpa, unit: "GPa" },
        { label: "Thermal Coefficient", value: mat.alpha, unit: "mm/m/°C" },
        { label: "Allowable Stress", value: allowableStress, unit: "MPa" },
      ],
      results: [
        { label: "Verdict", value: result.pass ? "PASS" : "FAIL", unit: "", highlight: true },
        { label: "ΔT", value: result.delta_t, unit: "°C" },
        { label: "Thermal Expansion", value: result.thermal_expansion_mm, unit: "mm" },
        { label: "Guided Cantilever Stress", value: result.guided_cantilever_stress_mpa, unit: "MPa" },
        { label: "Moment of Inertia", value: result.moment_of_inertia_mm4, unit: "mm⁴" },
        { label: "Section Modulus", value: result.section_modulus_mm3, unit: "mm³" },
        ...(result.loop_required && result.min_loop_leg_m > 0 ? [{ label: "Min Expansion Loop Leg", value: result.min_loop_leg_m, unit: "m", highlight: true }] : []),
      ],
      calcSteps: result.trace.map(t => ({ label: t.step, value: t.value })),
      methodology: ["Guided cantilever method per ASME B31.3", "Thermal expansion = α × ΔT × L", "Stress check: σ_guided vs allowable stress S_A"],
      assumptions: ["Material properties at ambient temperature (conservative)", "Screening tool only — not a substitute for formal stress analysis (e.g., Caesar II)"],
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
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-flexibility-title"><TrendingUp className="w-5 h-5 text-primary" /> Pipe Flexibility Screening</h1>
              <p className="text-xs text-muted-foreground">ASME B31.3 — Thermal expansion, guided cantilever stress check, expansion loop sizing</p>
            </div>
          </div>

          <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-400 space-y-1">
                <p><strong>Screening tool only — guided cantilever method per ASME B31.3 Appendix / M.W. Kellogg.</strong></p>
                <p>This tool calculates a single thermal expansion stress using the simplified guided cantilever formula and does <strong>not</strong> perform:</p>
                <ul className="list-disc ml-4 space-y-0.5 text-amber-400/90">
                  <li>Sustained load (deadweight + pressure) stress analysis</li>
                  <li>Occasional load analysis (wind, seismic, PSV reaction, slug force)</li>
                  <li>Nozzle load verification (vessel / pump / compressor connections)</li>
                  <li>Support settlement, spring-hanger sizing, or friction effects</li>
                  <li>Multi-branch / complex routing systems</li>
                </ul>
                <p>A full flexibility analysis using Caesar II, AutoPIPE, or equivalent software per ASME B31.3 Chapter II §319 is required before finalising piping layout and support design.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><h3 className="text-sm font-semibold">Input Parameters</h3></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Material</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-material"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MATERIAL_PROPERTIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.desc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                    <span>E = {mat.E_gpa} GPa</span>
                    <span>α = {(mat.alpha * 1e6).toFixed(1)} ×10⁻⁶ /°C</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Ambient Temp (°C)</Label><NumericInput value={tempAmbient} onValueChange={setTempAmbient} className="h-8 text-xs" data-testid="input-temp-ambient" /></div>
                  <div><Label className="text-xs">Operating Temp (°C)</Label><NumericInput value={tempOperating} onValueChange={setTempOperating} className="h-8 text-xs" data-testid="input-temp-operating" /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Pipe OD (mm)</Label><NumericInput value={pipeOD} onValueChange={setPipeOD} className="h-8 text-xs" data-testid="input-pipe-od" /></div>
                  <div><Label className="text-xs">Wall Thickness (mm)</Label><NumericInput value={pipeWT} onValueChange={setPipeWT} className="h-8 text-xs" data-testid="input-pipe-wt" /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Straight Run (m)</Label><NumericInput value={straightRun} onValueChange={setStraightRun} className="h-8 text-xs" data-testid="input-straight-run" /></div>
                  <div><Label className="text-xs">Allowable Stress (MPa)</Label><NumericInput value={allowableStress} onValueChange={setAllowableStress} className="h-8 text-xs" data-testid="input-allowable-stress" /></div>
                </div>

                <div>
                  <Label className="text-xs">Boundary Context (for documentation only)</Label>
                  <Select value={fixedBothEnds ? "fixed" : "guided"} onValueChange={v => setFixedBothEnds(v === "fixed")}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-restraint"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Both Ends Anchored</SelectItem>
                      <SelectItem value="guided">One End Guided / Free</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    This field is for export reference only — the guided cantilever formula is applied regardless.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCalculate} size="sm" data-testid="button-calculate"><Calculator className="w-3.5 h-3.5 mr-1.5" />Calculate</Button>
                  <Button onClick={handleReset} variant="outline" size="sm" data-testid="button-reset"><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Reset</Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <div className="space-y-4">
                <Card className={result.pass ? "border-green-500/30" : "border-red-500/30"}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.pass ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                        <h3 className="text-sm font-semibold">{result.pass ? "PASS — No Expansion Loop Required" : "FAIL — Expansion Loop Required"}</h3>
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
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">ΔT</span><span className="font-mono">{result.delta_t.toFixed(1)} °C</span></div>
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Thermal Expansion</span><span className="font-mono">{result.thermal_expansion_mm.toFixed(2)} mm</span></div>
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Guided Cantilever Stress</span><span className={`font-mono ${result.pass ? "text-green-400" : "text-red-400"}`}>{result.guided_cantilever_stress_mpa.toFixed(1)} MPa</span></div>
                      <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground block">Allowable Stress</span><span className="font-mono">{allowableStress} MPa</span></div>
                    </div>
                    {result.loop_required && result.min_loop_leg_m > 0 && (
                      <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30">
                        <span className="text-amber-400 font-medium">Minimum Expansion Loop Leg: {result.min_loop_leg_m.toFixed(2)} m</span>
                      </div>
                    )}
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground block">Moment of Inertia</span><span className="font-mono">{result.moment_of_inertia_mm4.toFixed(0)} mm⁴</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground block">Section Modulus</span><span className="font-mono">{result.section_modulus_mm3.toFixed(0)} mm³</span>
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
                  <p className="text-sm text-muted-foreground">Enter parameters and click Calculate to screen pipe flexibility</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mt-6 p-3 rounded-md border border-muted/30 bg-muted/5">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>References:</strong> ASME B31.3 Process Piping — guided cantilever screening method.
              Material properties at ambient temperature (conservative for screening). Not a substitute for formal stress analysis.
            </p>
          </div>

          <div className="mt-6"><FeedbackSection calculatorName="Pipe Flexibility Screening" /></div>
        </div>
      </section>
    </div>
  );
}
