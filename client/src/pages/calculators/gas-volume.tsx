import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import {
  calculateGasVolume,
  GAS_VOLUME_TEST_CASE,
  type GasVolumeResult,
} from "@/lib/engineering/gasVolume";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { ArrowLeftRight, FlaskConical, RotateCcw } from "lucide-react";

interface FormState {
  flowRate: string;
  pressureStd: string;
  temperatureStd: string;
  pressureActual: string;
  temperatureActual: string;
  zFactorStd: string;
  zFactorActual: string;
}

const defaultForm: FormState = {
  flowRate: "",
  pressureStd: "1.01325",
  temperatureStd: "15",
  pressureActual: "",
  temperatureActual: "",
  zFactorStd: "1.0",
  zFactorActual: "0.9",
};

const fieldUnitMap: FieldUnitMap = {
  flowRate: null,
  pressureStd: "pressure",
  temperatureStd: "temperature",
  pressureActual: "pressure",
  temperatureActual: "temperature",
  zFactorStd: null,
  zFactorActual: null,
};

export default function GasVolumePage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<GasVolumeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnitToggle = (newSystem: UnitSystem) => {
    const converted = convertFormValues(form, fieldUnitMap, unitSystem, newSystem);
    setForm(converted);
    setUnitSystem(newSystem);
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const input = {
        flowRate: parseFloat(form.flowRate),
        pressureStd: convertToSI("pressure", parseFloat(form.pressureStd), unitSystem),
        temperatureStd: convertToSI("temperature", parseFloat(form.temperatureStd), unitSystem),
        pressureActual: convertToSI("pressure", parseFloat(form.pressureActual), unitSystem),
        temperatureActual: convertToSI("temperature", parseFloat(form.temperatureActual), unitSystem),
        zFactorStd: parseFloat(form.zFactorStd),
        zFactorActual: parseFloat(form.zFactorActual),
      };
      for (const [key, val] of Object.entries(input)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }
      const res = calculateGasVolume(input);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    const tc = GAS_VOLUME_TEST_CASE;
    setUnitSystem("SI");
    setForm({
      flowRate: String(tc.flowRate),
      pressureStd: String(tc.pressureStd),
      temperatureStd: String(tc.temperatureStd),
      pressureActual: String(tc.pressureActual),
      temperatureActual: String(tc.temperatureActual),
      zFactorStd: String(tc.zFactorStd),
      zFactorActual: String(tc.zFactorActual),
    });
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setForm(defaultForm);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">
              Gas Volume Conversion
            </h1>
            <p className="text-sm text-muted-foreground">
              Standard to actual volume with Z-factor correction
            </p>
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
                    <FlaskConical className="w-3.5 h-3.5 mr-1" />
                    Test Case
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label className="text-xs mb-1.5 block">
                  Standard Flow Rate (Sm3/h)
                </Label>
                <Input
                  type="number"
                  value={form.flowRate}
                  onChange={(e) => updateField("flowRate", e.target.value)}
                  placeholder="e.g. 10000"
                  data-testid="input-flow-rate"
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Standard Conditions
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Pressure ({getUnit("pressure", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.pressureStd}
                      onChange={(e) => updateField("pressureStd", e.target.value)}
                      data-testid="input-pressure-std"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Temperature ({getUnit("temperature", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.temperatureStd}
                      onChange={(e) => updateField("temperatureStd", e.target.value)}
                      data-testid="input-temp-std"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Z-factor</Label>
                    <Input
                      type="number"
                      value={form.zFactorStd}
                      onChange={(e) => updateField("zFactorStd", e.target.value)}
                      data-testid="input-z-std"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Actual Conditions
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Pressure ({getUnit("pressure", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.pressureActual}
                      onChange={(e) => updateField("pressureActual", e.target.value)}
                      placeholder="e.g. 50"
                      data-testid="input-pressure-act"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Temperature ({getUnit("temperature", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.temperatureActual}
                      onChange={(e) => updateField("temperatureActual", e.target.value)}
                      placeholder="e.g. 80"
                      data-testid="input-temp-act"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Z-factor</Label>
                    <Input
                      type="number"
                      value={form.zFactorActual}
                      onChange={(e) => updateField("zFactorActual", e.target.value)}
                      data-testid="input-z-act"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                  {error}
                </div>
              )}

              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                Convert
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <WarningPanel warnings={result.warnings} />
              <ResultsPanel
                title="Volume Conversion Results"
                results={[
                  {
                    label: "Standard Flow Rate",
                    value: result.standardFlowRate,
                    unit: "Sm3/h",
                    highlight: true,
                  },
                  {
                    label: "Actual Flow Rate",
                    value: result.actualFlowRate,
                    unit: "Am3/h",
                    highlight: true,
                  },
                  {
                    label: "Conversion Factor (Std/Act)",
                    value: result.conversionFactor,
                    unit: "—",
                  },
                ]}
                rawData={result}
              />
            </>
          )}
          {!result && (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Enter standard and actual conditions to convert
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <AssumptionsPanel
          assumptions={[
            "Real gas law: PV = ZnRT",
            "Conversion: Qact = Qstd × (Pstd/Pact) × (Tact/Tstd) × (Zact/Zstd)",
            "Z-factor must be obtained from equation of state or charts",
            "Standard conditions default: 15°C, 1.01325 bar (ISO 13443)",
          ]}
          references={[
            "ISO 13443: Natural Gas — Standard Reference Conditions",
            "AGA Report No. 8: Compressibility Factors of Natural Gas",
            "Perry's Chemical Engineers' Handbook, 9th Edition",
          ]}
        />
      </div>
    </div>
  );
}
