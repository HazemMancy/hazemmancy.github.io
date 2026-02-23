import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Ruler, Calculator, AlertTriangle, CheckCircle2, RotateCcw, Info } from "lucide-react";
import { calculateSafeSpan, type SafeSpanInput, type SafeSpanResult } from "@/lib/engineering/piping/safeSpans";
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
              <p className="text-xs text-amber-400">
                <strong>Screening tool only.</strong> Final support spacing per project piping spec / stress analysis.
                Wind, seismic, and dynamic loads are not included in this screening.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><h3 className="text-sm font-semibold">Input Parameters</h3></CardHeader>
              <CardContent className="space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pipe</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">OD (mm)</Label><Input type="number" value={pipeOD} onChange={e => setPipeOD(Number(e.target.value))} className="h-8 text-xs" data-testid="input-pipe-od" /></div>
                  <div><Label className="text-xs">WT (mm)</Label><Input type="number" value={pipeWT} onChange={e => setPipeWT(Number(e.target.value))} className="h-8 text-xs" data-testid="input-pipe-wt" /></div>
                  <div><Label className="text-xs">ρ_pipe (kg/m³)</Label><Input type="number" value={pipeDensity} onChange={e => setPipeDensity(Number(e.target.value))} className="h-8 text-xs" data-testid="input-pipe-density" /></div>
                </div>

                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fluid</h4>
                <div><Label className="text-xs">Fluid Density (kg/m³)</Label><Input type="number" value={fluidDensity} onChange={e => setFluidDensity(Number(e.target.value))} className="h-8 text-xs" data-testid="input-fluid-density" /></div>

                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Insulation</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Thickness (mm)</Label><Input type="number" value={insulThk} onChange={e => setInsulThk(Number(e.target.value))} className="h-8 text-xs" data-testid="input-insul-thk" /></div>
                  <div><Label className="text-xs">ρ_insul (kg/m³)</Label><Input type="number" value={insulDensity} onChange={e => setInsulDensity(Number(e.target.value))} className="h-8 text-xs" data-testid="input-insul-density" /></div>
                </div>

                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Criteria</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Allowable Deflection (mm)</Label><Input type="number" value={allowDefl} onChange={e => setAllowDefl(Number(e.target.value))} className="h-8 text-xs" data-testid="input-allow-defl" /></div>
                  <div><Label className="text-xs">E (GPa)</Label><Input type="number" value={elasticMod} onChange={e => setElasticMod(Number(e.target.value))} className="h-8 text-xs" data-testid="input-elastic-mod" /></div>
                  <div><Label className="text-xs">Allowable Stress (MPa)</Label><Input type="number" value={allowStress} onChange={e => setAllowStress(Number(e.target.value))} className="h-8 text-xs" data-testid="input-allow-stress" /></div>
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
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">Governing Safe Span: {result.governing_span_m.toFixed(2)} m</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Governed by: {result.governing_criterion}</p>
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
