import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import {
  calculateHeatExchanger, TYPICAL_U_VALUES, HX_TEST_CASE,
  type HeatExchangerResult, type FlowArrangement,
} from "@/lib/engineering/heatExchanger";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { Thermometer, FlaskConical, RotateCcw } from "lucide-react";

interface FormState {
  dutyKW: string; hotInletTemp: string; hotOutletTemp: string;
  coldInletTemp: string; coldOutletTemp: string; overallU: string;
  flowArrangement: FlowArrangement; foulingFactor: string; designMargin: string;
  hotFlowRate: string; hotCp: string; coldFlowRate: string; coldCp: string;
}

const defaultForm: FormState = {
  dutyKW: "", hotInletTemp: "", hotOutletTemp: "", coldInletTemp: "", coldOutletTemp: "",
  overallU: "", flowArrangement: "counter_current", foulingFactor: "0.0003",
  designMargin: "15", hotFlowRate: "", hotCp: "4.18", coldFlowRate: "", coldCp: "4.18",
};

const fieldUnitMap: FieldUnitMap = {
  dutyKW: null, hotInletTemp: "temperature", hotOutletTemp: "temperature",
  coldInletTemp: "temperature", coldOutletTemp: "temperature", overallU: null,
  flowArrangement: null, foulingFactor: null, designMargin: null,
  hotFlowRate: "flowMass", hotCp: null, coldFlowRate: "flowMass", coldCp: null,
};

export default function HeatExchangerPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<HeatExchangerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));
  const handleUnitToggle = (ns: UnitSystem) => {
    setForm(convertFormValues(form, fieldUnitMap, unitSystem, ns) as FormState);
    setUnitSystem(ns);
  };

  const handleCalc = () => {
    setError(null);
    try {
      const input = {
        dutyKW: form.dutyKW ? parseFloat(form.dutyKW) : 0,
        hotInletTemp: convertToSI("temperature", parseFloat(form.hotInletTemp), unitSystem),
        hotOutletTemp: convertToSI("temperature", parseFloat(form.hotOutletTemp), unitSystem),
        coldInletTemp: convertToSI("temperature", parseFloat(form.coldInletTemp), unitSystem),
        coldOutletTemp: convertToSI("temperature", parseFloat(form.coldOutletTemp), unitSystem),
        overallU: parseFloat(form.overallU),
        flowArrangement: form.flowArrangement,
        foulingFactor: parseFloat(form.foulingFactor),
        designMargin: parseFloat(form.designMargin),
        hotFlowRate: convertToSI("flowMass", parseFloat(form.hotFlowRate), unitSystem),
        hotCp: parseFloat(form.hotCp),
        coldFlowRate: convertToSI("flowMass", parseFloat(form.coldFlowRate), unitSystem),
        coldCp: parseFloat(form.coldCp),
      };
      setResult(calculateHeatExchanger(input));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null); setResult(null);
    const tc = HX_TEST_CASE;
    setForm({
      dutyKW: tc.dutyKW ? String(tc.dutyKW) : "", hotInletTemp: String(tc.hotInletTemp),
      hotOutletTemp: String(tc.hotOutletTemp), coldInletTemp: String(tc.coldInletTemp),
      coldOutletTemp: String(tc.coldOutletTemp), overallU: String(tc.overallU),
      flowArrangement: tc.flowArrangement, foulingFactor: String(tc.foulingFactor),
      designMargin: String(tc.designMargin), hotFlowRate: String(tc.hotFlowRate),
      hotCp: String(tc.hotCp), coldFlowRate: String(tc.coldFlowRate), coldCp: String(tc.coldCp),
    });
  };

  const handleReset = () => { setForm(defaultForm); setResult(null); setError(null); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Heat Exchanger Sizing</h1>
            <p className="text-sm text-muted-foreground">LMTD method with correction factor</p>
          </div>
        </div>
        <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Input Parameters</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
                    <FlaskConical className="w-3.5 h-3.5 mr-1" /> Test Case
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-xs font-medium text-muted-foreground">Temperature Profile</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Hot Inlet ({getUnit("temperature", unitSystem)})</Label>
                  <Input type="number" value={form.hotInletTemp} onChange={e => update("hotInletTemp", e.target.value)} data-testid="input-thi" /></div>
                <div><Label className="text-xs mb-1.5 block">Hot Outlet ({getUnit("temperature", unitSystem)})</Label>
                  <Input type="number" value={form.hotOutletTemp} onChange={e => update("hotOutletTemp", e.target.value)} data-testid="input-tho" /></div>
                <div><Label className="text-xs mb-1.5 block">Cold Inlet ({getUnit("temperature", unitSystem)})</Label>
                  <Input type="number" value={form.coldInletTemp} onChange={e => update("coldInletTemp", e.target.value)} data-testid="input-tci" /></div>
                <div><Label className="text-xs mb-1.5 block">Cold Outlet ({getUnit("temperature", unitSystem)})</Label>
                  <Input type="number" value={form.coldOutletTemp} onChange={e => update("coldOutletTemp", e.target.value)} data-testid="input-tco" /></div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Flow Rates & Properties</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Hot Flow ({getUnit("flowMass", unitSystem)})</Label>
                    <Input type="number" value={form.hotFlowRate} onChange={e => update("hotFlowRate", e.target.value)} data-testid="input-hot-flow" /></div>
                  <div><Label className="text-xs mb-1.5 block">Hot Cp (kJ/(kg·K))</Label>
                    <Input type="number" value={form.hotCp} onChange={e => update("hotCp", e.target.value)} data-testid="input-hot-cp" /></div>
                  <div><Label className="text-xs mb-1.5 block">Cold Flow ({getUnit("flowMass", unitSystem)})</Label>
                    <Input type="number" value={form.coldFlowRate} onChange={e => update("coldFlowRate", e.target.value)} data-testid="input-cold-flow" /></div>
                  <div><Label className="text-xs mb-1.5 block">Cold Cp (kJ/(kg·K))</Label>
                    <Input type="number" value={form.coldCp} onChange={e => update("coldCp", e.target.value)} data-testid="input-cold-cp" /></div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">HX Configuration</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Duty (kW) — blank=auto from flows</Label>
                    <Input type="number" value={form.dutyKW} onChange={e => update("dutyKW", e.target.value)} placeholder="Auto-calculate" data-testid="input-duty" /></div>
                  <div><Label className="text-xs mb-1.5 block">Flow Arrangement</Label>
                    <Select value={form.flowArrangement} onValueChange={v => update("flowArrangement", v)}>
                      <SelectTrigger data-testid="select-arrangement"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="counter_current">Counter-Current</SelectItem>
                        <SelectItem value="parallel">Parallel Flow</SelectItem>
                        <SelectItem value="1_2_pass">1-2 Shell & Tube</SelectItem>
                        <SelectItem value="2_4_pass">2-4 Shell & Tube</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1.5 block">Overall U (W/(m²·K))</Label>
                    <Input type="number" value={form.overallU} onChange={e => update("overallU", e.target.value)} data-testid="input-u" /></div>
                  <div><Label className="text-xs mb-1.5 block">U Value Guidance</Label>
                    <Select onValueChange={v => update("overallU", String(TYPICAL_U_VALUES[v].typical))}>
                      <SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger>
                      <SelectContent>{Object.entries(TYPICAL_U_VALUES).map(([k, v]) =>
                        <SelectItem key={k} value={k}>{k} ({v.low}–{v.high})</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1.5 block">Fouling Factor (m²·K/W)</Label>
                    <Input type="number" value={form.foulingFactor} onChange={e => update("foulingFactor", e.target.value)} data-testid="input-fouling" /></div>
                  <div><Label className="text-xs mb-1.5 block">Design Margin (%)</Label>
                    <Input type="number" value={form.designMargin} onChange={e => update("designMargin", e.target.value)} data-testid="input-margin" /></div>
                </div>
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}
              <Button className="w-full" onClick={handleCalc} data-testid="button-calculate">Calculate</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (<>
            <WarningPanel warnings={result.warnings} />
            <ResultsPanel title="Heat Exchanger Results" results={[
              { label: "Design Area", value: result.designArea, unit: "m²", highlight: true },
              { label: "Required Area (fouled)", value: result.requiredArea, unit: "m²" },
              { label: "Clean Area", value: result.cleanArea, unit: "m²" },
              { label: "LMTD", value: result.lmtd, unit: "°C" },
              { label: "F Factor", value: result.correctionFactorF, unit: "—", highlight: result.correctionFactorF < 0.8 },
              { label: "Corrected LMTD", value: result.correctedLMTD, unit: "°C", highlight: true },
              { label: "Heat Duty", value: result.dutyKW, unit: "kW" },
              { label: "Hot Side Duty", value: result.hotDutyKW, unit: "kW" },
              { label: "Cold Side Duty", value: result.coldDutyKW, unit: "kW" },
              { label: "Dirty U", value: result.dirtyU, unit: "W/(m²·K)" },
              { label: "R (Heat Capacity Ratio)", value: result.R, unit: "—" },
              { label: "P (Effectiveness)", value: result.P, unit: "—" },
            ]} rawData={result} />
          </>)}
          {!result && (
            <Card><CardContent className="py-12 text-center">
              <Thermometer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Enter parameters and click Calculate</p>
            </CardContent></Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <AssumptionsPanel
          assumptions={[
            "LMTD method for preliminary area estimation",
            "Overall U is user-supplied (use typical values table for guidance)",
            "F factor calculated analytically for 1-2 and 2-4 pass configurations",
            "Fouling resistance applied equally to total area",
            "No detailed tube-side or shell-side calculations (Kern method)",
            "Single-phase sensible heat transfer assumed",
            "Design margin is applied to fouled (required) area",
          ]}
          references={[
            "Kern, D.Q. Process Heat Transfer (1950)",
            "TEMA Standards, 10th Edition",
            "Perry's Chemical Engineers' Handbook, Section 11",
            "Ludwig, E.E. Applied Process Design, Vol. 3",
            "Coulson & Richardson's Chemical Engineering, Vol. 6",
          ]}
        />
      </div>
    </div>
  );
}
