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
  calculateThermalRelief, COMMON_THERMAL_EXPANSION, THERMAL_RELIEF_TEST_CASE,
  type ThermalReliefResult, type HeatSource,
} from "@/lib/engineering/thermalRelief";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { Flame, FlaskConical, RotateCcw, AlertTriangle } from "lucide-react";

interface FormState {
  liquidVolume: string; liquidDensity: string; specificHeat: string;
  thermalExpansion: string; initialTemperature: string; finalTemperature: string;
  heatingTime: string; heatSource: HeatSource; exposedArea: string;
  heatInputKW: string; setPressure: string; backPressure: string;
  atmosphericPressure: string;
}

const defaultForm: FormState = {
  liquidVolume: "", liquidDensity: "", specificHeat: "4.18",
  thermalExpansion: "2.07", initialTemperature: "", finalTemperature: "",
  heatingTime: "4", heatSource: "solar_bare", exposedArea: "",
  heatInputKW: "", setPressure: "", backPressure: "0",
  atmosphericPressure: "1.01325",
};

const fieldUnitMap: FieldUnitMap = {
  liquidVolume: null, liquidDensity: null, specificHeat: null,
  thermalExpansion: null, initialTemperature: "temperature",
  finalTemperature: "temperature", heatingTime: null, heatSource: null,
  exposedArea: null, heatInputKW: null, setPressure: "pressure",
  backPressure: "pressure", atmosphericPressure: null,
};

export default function ThermalReliefPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<ThermalReliefResult | null>(null);
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
        liquidVolume: parseFloat(form.liquidVolume),
        liquidDensity: parseFloat(form.liquidDensity),
        specificHeat: parseFloat(form.specificHeat),
        thermalExpansion: parseFloat(form.thermalExpansion),
        initialTemperature: convertToSI("temperature", parseFloat(form.initialTemperature), unitSystem),
        finalTemperature: convertToSI("temperature", parseFloat(form.finalTemperature), unitSystem),
        heatingTime: parseFloat(form.heatingTime),
        heatSource: form.heatSource,
        exposedArea: parseFloat(form.exposedArea) || 0,
        heatInputKW: parseFloat(form.heatInputKW) || 0,
        setPressure: convertToSI("pressure", parseFloat(form.setPressure), unitSystem),
        backPressure: convertToSI("pressure", parseFloat(form.backPressure || "0"), unitSystem),
        atmosphericPressure: parseFloat(form.atmosphericPressure),
      };
      setResult(calculateThermalRelief(input));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null); setResult(null);
    const tc = THERMAL_RELIEF_TEST_CASE;
    setForm({
      liquidVolume: String(tc.liquidVolume), liquidDensity: String(tc.liquidDensity),
      specificHeat: String(tc.specificHeat), thermalExpansion: String(tc.thermalExpansion),
      initialTemperature: String(tc.initialTemperature), finalTemperature: String(tc.finalTemperature),
      heatingTime: String(tc.heatingTime), heatSource: tc.heatSource,
      exposedArea: String(tc.exposedArea), heatInputKW: String(tc.heatInputKW),
      setPressure: String(tc.setPressure), backPressure: String(tc.backPressure),
      atmosphericPressure: String(tc.atmosphericPressure),
    });
  };

  const handleReset = () => { setForm(defaultForm); setResult(null); setError(null); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <Card className="mb-6 bg-amber-950/30 border-amber-800/50">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-200" data-testid="text-screening-label">SCREENING TOOL — NOT FOR FINAL DESIGN</p>
            <p className="text-xs text-amber-200/70">Results must be verified against detailed thermal analysis and equipment-specific data per ASME B31.3 and API 521.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Thermal Expansion Relief</h1>
            <p className="text-sm text-muted-foreground">Blocked-in liquid overpressure screening</p>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-xs mb-1.5 block">Trapped Liquid Volume (m³)</Label>
                  <Input type="number" value={form.liquidVolume} onChange={e => update("liquidVolume", e.target.value)} data-testid="input-volume" /></div>
                <div><Label className="text-xs mb-1.5 block">Liquid Density (kg/m³)</Label>
                  <Input type="number" value={form.liquidDensity} onChange={e => update("liquidDensity", e.target.value)} data-testid="input-density" /></div>
                <div><Label className="text-xs mb-1.5 block">Specific Heat (kJ/(kg·K))</Label>
                  <Input type="number" value={form.specificHeat} onChange={e => update("specificHeat", e.target.value)} data-testid="input-cp" /></div>
                <div><Label className="text-xs mb-1.5 block">Thermal Expansion Coeff. (×10⁻⁴ /°C)</Label>
                  <Select onValueChange={v => update("thermalExpansion", String(COMMON_THERMAL_EXPANSION[v]))}>
                    <SelectTrigger><SelectValue placeholder="Select fluid..." /></SelectTrigger>
                    <SelectContent>{Object.entries(COMMON_THERMAL_EXPANSION).map(([k, v]) =>
                      <SelectItem key={k} value={k}>{k} (α={v})</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label className="text-xs mb-1.5 block">α Value (×10⁻⁴ /°C)</Label>
                  <Input type="number" value={form.thermalExpansion} onChange={e => update("thermalExpansion", e.target.value)} data-testid="input-alpha" /></div>
                <div><Label className="text-xs mb-1.5 block">Initial Temp ({getUnit("temperature", unitSystem)})</Label>
                  <Input type="number" value={form.initialTemperature} onChange={e => update("initialTemperature", e.target.value)} data-testid="input-t1" /></div>
                <div><Label className="text-xs mb-1.5 block">Final Temp ({getUnit("temperature", unitSystem)})</Label>
                  <Input type="number" value={form.finalTemperature} onChange={e => update("finalTemperature", e.target.value)} data-testid="input-t2" /></div>
                <div><Label className="text-xs mb-1.5 block">Heating Time (hours)</Label>
                  <Input type="number" value={form.heatingTime} onChange={e => update("heatingTime", e.target.value)} data-testid="input-time" /></div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Heat Source</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">Heat Source Type</Label>
                    <Select value={form.heatSource} onValueChange={v => update("heatSource", v)}>
                      <SelectTrigger data-testid="select-heat-source"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solar_bare">Solar — Bare vessel (947 W/m²)</SelectItem>
                        <SelectItem value="solar_insulated">Solar — Insulated (315 W/m²)</SelectItem>
                        <SelectItem value="process">Process heating</SelectItem>
                        <SelectItem value="manual">Manual heat input</SelectItem>
                      </SelectContent>
                    </Select></div>
                  {(form.heatSource === "solar_bare" || form.heatSource === "solar_insulated") && (
                    <div><Label className="text-xs mb-1.5 block">Exposed Area (m²)</Label>
                      <Input type="number" value={form.exposedArea} onChange={e => update("exposedArea", e.target.value)} data-testid="input-area" /></div>
                  )}
                  {(form.heatSource === "process" || form.heatSource === "manual") && (
                    <div><Label className="text-xs mb-1.5 block">Heat Input (kW)</Label>
                      <Input type="number" value={form.heatInputKW} onChange={e => update("heatInputKW", e.target.value)} data-testid="input-heat" /></div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Relief Device</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-xs mb-1.5 block">TRV Set Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                    <Input type="number" value={form.setPressure} onChange={e => update("setPressure", e.target.value)} data-testid="input-set-p" /></div>
                  <div><Label className="text-xs mb-1.5 block">Back Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                    <Input type="number" value={form.backPressure} onChange={e => update("backPressure", e.target.value)} data-testid="input-back-p" /></div>
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
            <ResultsPanel title="Thermal Relief Results" results={[
              { label: "Temperature Rise", value: result.temperatureRise, unit: "°C" },
              { label: "Expansion Volume", value: result.expansionVolume, unit: "L", highlight: true },
              { label: "Relief Rate", value: result.reliefRate, unit: "L/min", highlight: true },
              { label: "Relief Rate", value: result.reliefRateM3H, unit: "m³/h" },
              { label: "Heat Input", value: result.heatInput, unit: "kW" },
              { label: "Required Orifice Area", value: result.requiredOrificeArea, unit: "mm²" },
              { label: "Recommended TRV Size", value: result.recommendedTRVSize, unit: "", highlight: true },
              { label: "Pressure Rise Rate (est.)", value: result.pressureRiseRate, unit: "bar/°C" },
            ]} rawData={result} />
          </>)}
          {!result && (
            <Card><CardContent className="py-12 text-center">
              <Flame className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Enter parameters and click Calculate</p>
            </CardContent></Card>
          )}
          <div className="mt-4">
            <AssumptionsPanel
            assumptions={[
            "Liquid is incompressible and fully trapped between two closed valves",
            "Thermal expansion coefficient assumed constant over temperature range",
            "Solar heat flux per API 521: 947 W/m² (bare) / 315 W/m² (insulated)",
            "TRV sizing uses simplified liquid relief equation (Kd=0.65)",
            "Pressure rise rate estimated using water isothermal compressibility",
            "No allowance for pipe/vessel flexibility or thermal expansion of metal",
            ]}
            references={[
            "API 521: Pressure-Relieving and Depressuring Systems, Section 5.18",
            "API 520 Part I: Sizing of pressure-relieving devices",
            "ASME B31.3: Process Piping (blocked-in liquid overpressure)",
            "Perry's Chemical Engineers' Handbook, Chapter 2 (thermal properties)",
            ]}
            />
          </div>

          <FeedbackSection calculatorName="Thermal Relief" />
        </div>
      </div>
    </div>
  );
}
