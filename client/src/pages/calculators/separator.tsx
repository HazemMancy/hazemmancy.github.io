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
  calculateSeparatorSizing,
  SEPARATOR_VERTICAL_TEST_CASE, SEPARATOR_HORIZONTAL_TEST_CASE,
  type SeparatorResult, type VesselOrientation,
} from "@/lib/engineering/separatorSizing";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { Container, FlaskConical, RotateCcw } from "lucide-react";

interface FormState {
  gasFlowRate: string; gasMolecularWeight: string; gasDensity: string;
  liquidFlowRate: string; liquidDensity: string; operatingPressure: string;
  operatingTemperature: string; kFactor: string; residenceTime: string;
  orientation: VesselOrientation; ldRatio: string; surgeTime: string; demisterPadDP: string;
}

const defaultForm: FormState = {
  gasFlowRate: "", gasMolecularWeight: "18.5", gasDensity: "",
  liquidFlowRate: "", liquidDensity: "", operatingPressure: "",
  operatingTemperature: "", kFactor: "0.07", residenceTime: "5",
  orientation: "vertical", ldRatio: "3", surgeTime: "2", demisterPadDP: "0.003",
};

const fieldUnitMap: FieldUnitMap = {
  gasFlowRate: "flowGas", gasMolecularWeight: null, gasDensity: null,
  liquidFlowRate: "flowLiquid", liquidDensity: null, operatingPressure: "pressure",
  operatingTemperature: "temperature", kFactor: null, residenceTime: null,
  orientation: null, ldRatio: null, surgeTime: null, demisterPadDP: null,
};

const K_FACTOR_GUIDANCE: Record<string, number> = {
  "Vertical w/ mesh pad": 0.07,
  "Vertical w/ vane pack": 0.10,
  "Vertical w/o internals": 0.04,
  "Horizontal w/ mesh pad": 0.10,
  "Horizontal w/ vane pack": 0.12,
  "Horizontal w/o internals": 0.06,
  "KO Drum (bare)": 0.035,
  "KO Drum (mesh pad)": 0.061,
};

export default function SeparatorPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<SeparatorResult | null>(null);
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
        gasFlowRate: convertToSI("flowGas", parseFloat(form.gasFlowRate), unitSystem),
        gasMolecularWeight: parseFloat(form.gasMolecularWeight),
        gasDensity: parseFloat(form.gasDensity),
        liquidFlowRate: convertToSI("flowLiquid", parseFloat(form.liquidFlowRate), unitSystem),
        liquidDensity: parseFloat(form.liquidDensity),
        operatingPressure: convertToSI("pressure", parseFloat(form.operatingPressure), unitSystem),
        operatingTemperature: convertToSI("temperature", parseFloat(form.operatingTemperature), unitSystem),
        kFactor: parseFloat(form.kFactor),
        residenceTime: parseFloat(form.residenceTime),
        orientation: form.orientation,
        ldRatio: parseFloat(form.ldRatio),
        surgeTime: parseFloat(form.surgeTime),
        demisterPadDP: parseFloat(form.demisterPadDP),
      };
      for (const [k, v] of Object.entries(input)) if (typeof v === 'number' && isNaN(v)) throw new Error(`Invalid ${k}`);
      setResult(calculateSeparatorSizing(input));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = (orient: VesselOrientation) => {
    setUnitSystem("SI"); setError(null); setResult(null);
    const tc = orient === "vertical" ? SEPARATOR_VERTICAL_TEST_CASE : SEPARATOR_HORIZONTAL_TEST_CASE;
    setForm({
      gasFlowRate: String(tc.gasFlowRate), gasMolecularWeight: String(tc.gasMolecularWeight),
      gasDensity: String(tc.gasDensity), liquidFlowRate: String(tc.liquidFlowRate),
      liquidDensity: String(tc.liquidDensity), operatingPressure: String(tc.operatingPressure),
      operatingTemperature: String(tc.operatingTemperature), kFactor: String(tc.kFactor),
      residenceTime: String(tc.residenceTime), orientation: tc.orientation,
      ldRatio: String(tc.ldRatio), surgeTime: String(tc.surgeTime),
      demisterPadDP: String(tc.demisterPadDP),
    });
  };

  const handleReset = () => { setForm(defaultForm); setResult(null); setError(null); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Container className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Separator / KO Drum Sizing</h1>
            <p className="text-sm text-muted-foreground">Souders-Brown preliminary sizing</p>
          </div>
        </div>
        <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">Input Parameters</h3>
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => loadTestCase("vertical")} data-testid="button-load-test-v">
                    <FlaskConical className="w-3.5 h-3.5 mr-1" /> Vertical
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => loadTestCase("horizontal")} data-testid="button-load-test-h">
                    <FlaskConical className="w-3.5 h-3.5 mr-1" /> Horizontal
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Gas Flow ({getUnit("flowGas", unitSystem)})</Label>
                  <Input type="number" value={form.gasFlowRate} onChange={e => update("gasFlowRate", e.target.value)} data-testid="input-gas-flow" /></div>
                <div><Label className="text-xs mb-1.5 block">Gas Density (kg/m³) at operating conditions</Label>
                  <Input type="number" value={form.gasDensity} onChange={e => update("gasDensity", e.target.value)} data-testid="input-gas-density" /></div>
                <div><Label className="text-xs mb-1.5 block">Liquid Flow ({getUnit("flowLiquid", unitSystem)})</Label>
                  <Input type="number" value={form.liquidFlowRate} onChange={e => update("liquidFlowRate", e.target.value)} data-testid="input-liq-flow" /></div>
                <div><Label className="text-xs mb-1.5 block">Liquid Density (kg/m³)</Label>
                  <Input type="number" value={form.liquidDensity} onChange={e => update("liquidDensity", e.target.value)} data-testid="input-liq-density" /></div>
                <div><Label className="text-xs mb-1.5 block">Operating Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                  <Input type="number" value={form.operatingPressure} onChange={e => update("operatingPressure", e.target.value)} data-testid="input-pressure" /></div>
                <div><Label className="text-xs mb-1.5 block">Temperature ({getUnit("temperature", unitSystem)})</Label>
                  <Input type="number" value={form.operatingTemperature} onChange={e => update("operatingTemperature", e.target.value)} data-testid="input-temp" /></div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Vessel Configuration</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Orientation</Label>
                    <Select value={form.orientation} onValueChange={v => update("orientation", v)}>
                      <SelectTrigger data-testid="select-orientation"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                      </SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1.5 block">K-factor Guidance</Label>
                    <Select onValueChange={v => update("kFactor", String(K_FACTOR_GUIDANCE[v]))}>
                      <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent>{Object.entries(K_FACTOR_GUIDANCE).map(([k, v]) =>
                        <SelectItem key={k} value={k}>{k} (K={v})</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1.5 block">K-factor (m/s)</Label>
                    <Input type="number" value={form.kFactor} onChange={e => update("kFactor", e.target.value)} data-testid="input-k-factor" /></div>
                  <div><Label className="text-xs mb-1.5 block">Residence Time (min)</Label>
                    <Input type="number" value={form.residenceTime} onChange={e => update("residenceTime", e.target.value)} data-testid="input-res-time" /></div>
                  <div><Label className="text-xs mb-1.5 block">Surge Time (min)</Label>
                    <Input type="number" value={form.surgeTime} onChange={e => update("surgeTime", e.target.value)} data-testid="input-surge" /></div>
                  {form.orientation === "horizontal" && (
                    <div><Label className="text-xs mb-1.5 block">L/D Ratio</Label>
                      <Input type="number" value={form.ldRatio} onChange={e => update("ldRatio", e.target.value)} data-testid="input-ld" /></div>
                  )}
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
            <ResultsPanel title="Separator Sizing Results" results={[
              { label: "Vessel Diameter", value: result.vesselDiameter, unit: "mm", highlight: true },
              { label: "Vessel Length/Height", value: result.vesselLength, unit: "mm", highlight: true },
              { label: "Vessel Volume", value: result.vesselVolume, unit: "m³" },
              { label: "Souders-Brown V_max", value: result.maxGasVelocity, unit: "m/s" },
              { label: "Actual Gas Velocity", value: result.actualGasVelocity, unit: "m/s" },
              { label: "Min Dia (gas capacity)", value: result.minVesselDiameter, unit: "mm" },
              { label: "Liquid Holdup Volume", value: result.liquidHoldupVolume, unit: "m³" },
              { label: "Surge Volume", value: result.surgeVolume, unit: "m³" },
              { label: "Total Liquid Volume", value: result.totalLiquidVolume, unit: "m³" },
              { label: "Liquid Level", value: result.liquidLevelPercent, unit: "%" },
            ]} rawData={result} />
          </>)}
          {!result && (
            <Card><CardContent className="py-12 text-center">
              <Container className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Enter parameters and click Calculate</p>
            </CardContent></Card>
          )}
          <div className="mt-4">
            <AssumptionsPanel
            assumptions={[
            "Souders-Brown equation for maximum gas velocity through vessel",
            "Gas-liquid separation only (no three-phase / water-oil separation)",
            "K-factor is user-supplied based on vessel type and internals",
            "Vertical vessel: gas disengagement zone height = max(0.6m, 0.5×D)",
            "Horizontal vessel: liquid fills bottom half, gas flows over top half",
            "Vessel diameter rounded up to nearest 100 mm",
            "No consideration of mechanical design (wall thickness, weight, nozzles)",
            ]}
            references={[
            "API 12J: Specification for Oil and Gas Separators",
            "GPSA Engineering Data Book, Section 7: Separation Equipment",
            "Arnold & Stewart: Surface Production Operations, Vol. 1",
            "Stewart & Arnold: Gas-Liquid and Liquid-Liquid Separators",
            ]}
            />
          </div>

          <FeedbackSection calculatorName="Separator / KO Drum" />
        </div>
      </div>
    </div>
  );
}
