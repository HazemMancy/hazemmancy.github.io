import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import {
  calculateLiquidLineSizing,
  LIQUID_SIZING_TEST_CASE,
  type LiquidSizingResult,
} from "@/lib/engineering/liquidSizing";
import { PIPE_ROUGHNESS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { Droplets, FlaskConical, RotateCcw } from "lucide-react";

interface FormState {
  flowRate: string;
  density: string;
  viscosity: string;
  innerDiameter: string;
  pipeLength: string;
  roughness: string;
  elevationChange: string;
}

const defaultForm: FormState = {
  flowRate: "",
  density: "",
  viscosity: "",
  innerDiameter: "",
  pipeLength: "",
  roughness: "0.0457",
  elevationChange: "0",
};

export default function LiquidLineSizingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<LiquidSizingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const input = {
        flowRate: convertToSI("flowVolume", parseFloat(form.flowRate), unitSystem),
        density: convertToSI("density", parseFloat(form.density), unitSystem),
        viscosity: parseFloat(form.viscosity),
        innerDiameter: convertToSI("diameter", parseFloat(form.innerDiameter), unitSystem),
        pipeLength: convertToSI("length", parseFloat(form.pipeLength), unitSystem),
        roughness: parseFloat(form.roughness),
        elevationChange: convertToSI("length", parseFloat(form.elevationChange), unitSystem),
      };
      for (const [key, val] of Object.entries(input)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }
      const res = calculateLiquidLineSizing(input);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    const tc = LIQUID_SIZING_TEST_CASE;
    setUnitSystem("SI");
    setForm({
      flowRate: String(tc.flowRate),
      density: String(tc.density),
      viscosity: String(tc.viscosity),
      innerDiameter: String(tc.innerDiameter),
      pipeLength: String(tc.pipeLength),
      roughness: String(tc.roughness),
      elevationChange: String(tc.elevationChange),
    });
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setForm(defaultForm);
    setResult(null);
    setError(null);
  };

  const handleRoughnessSelect = (material: string) => {
    const r = PIPE_ROUGHNESS[material];
    if (r !== undefined) {
      setForm((prev) => ({ ...prev, roughness: String(r * 1000) }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">
              Liquid Line Sizing
            </h1>
            <p className="text-sm text-muted-foreground">
              Darcy-Weisbach friction + static head losses
            </p>
          </div>
        </div>
        <UnitSelector value={unitSystem} onChange={setUnitSystem} />
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Volume Flow Rate ({getUnit("flowVolume", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.flowRate}
                    onChange={(e) => updateField("flowRate", e.target.value)}
                    placeholder="e.g. 100"
                    data-testid="input-flow-rate"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Liquid Density ({getUnit("density", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.density}
                    onChange={(e) => updateField("density", e.target.value)}
                    placeholder="e.g. 850"
                    data-testid="input-density"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Viscosity ({getUnit("viscosity", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.viscosity}
                    onChange={(e) => updateField("viscosity", e.target.value)}
                    placeholder="e.g. 5"
                    data-testid="input-viscosity"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Inner Diameter ({getUnit("diameter", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.innerDiameter}
                    onChange={(e) => updateField("innerDiameter", e.target.value)}
                    placeholder="e.g. 154.1"
                    data-testid="input-diameter"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Pipe Length ({getUnit("length", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.pipeLength}
                    onChange={(e) => updateField("pipeLength", e.target.value)}
                    placeholder="e.g. 200"
                    data-testid="input-length"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Pipe Material
                  </Label>
                  <Select onValueChange={handleRoughnessSelect}>
                    <SelectTrigger data-testid="select-material">
                      <SelectValue placeholder="Select material..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(PIPE_ROUGHNESS).map((mat) => (
                        <SelectItem key={mat} value={mat}>
                          {mat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
                  <Input
                    type="number"
                    value={form.roughness}
                    onChange={(e) => updateField("roughness", e.target.value)}
                    data-testid="input-roughness"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Elevation Change ({getUnit("length", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.elevationChange}
                    onChange={(e) => updateField("elevationChange", e.target.value)}
                    placeholder="e.g. 10 (positive = uphill)"
                    data-testid="input-elevation"
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                  {error}
                </div>
              )}

              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                Calculate
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <WarningPanel warnings={result.warnings} />
              <ResultsPanel
                title="Liquid Line Sizing Results"
                results={[
                  {
                    label: "Velocity",
                    value: convertFromSI("velocity", result.velocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "Friction Loss",
                    value: convertFromSI("pressure", result.frictionLoss, unitSystem),
                    unit: getUnit("pressure", unitSystem),
                  },
                  {
                    label: "Static Head",
                    value: convertFromSI("pressure", result.staticHead, unitSystem),
                    unit: getUnit("pressure", unitSystem),
                  },
                  {
                    label: "Total Pressure Drop",
                    value: convertFromSI("pressure", result.totalPressureDrop, unitSystem),
                    unit: getUnit("pressure", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "ΔP per 100m (friction)",
                    value: result.pressureDropPer100m,
                    unit: "bar/100m",
                  },
                  {
                    label: "Reynolds Number",
                    value: result.reynoldsNumber,
                    unit: "—",
                  },
                  {
                    label: "Friction Factor (f)",
                    value: result.frictionFactor,
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
                <Droplets className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Enter parameters and click Calculate to see results
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <AssumptionsPanel
          assumptions={[
            "Steady-state, single-phase incompressible liquid flow",
            "Darcy-Weisbach equation for friction pressure drop",
            "Swamee-Jain friction factor approximation",
            "Static head calculated from elevation change and liquid density",
            "Pipe roughness assumed uniform along pipe length",
            "No fittings or valves included (straight pipe only)",
          ]}
          references={[
            "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
            "Perry's Chemical Engineers' Handbook, 9th Edition",
            "Swamee, P.K. and Jain, A.K. (1976) — Explicit equations for pipe-flow problems",
          ]}
        />
      </div>
    </div>
  );
}
