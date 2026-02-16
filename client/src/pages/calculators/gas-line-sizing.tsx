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
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { LimitsPanel } from "@/components/engineering/limits-panel";
import {
  calculateGasLineSizing,
  GAS_SIZING_TEST_CASE,
  type GasSizingResult,
} from "@/lib/engineering/gasSizing";
import { COMMON_GASES, GAS_SERVICE_LIMITS, type GasServiceLimit } from "@/lib/engineering/constants";
import { checkGasLimits, type LimitWarning } from "@/lib/engineering/limitCheck";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { Wind, FlaskConical, RotateCcw } from "lucide-react";

interface FormState {
  flowRate: string;
  pressure: string;
  temperature: string;
  molecularWeight: string;
  innerDiameter: string;
  pipeLength: string;
  roughness: string;
  compressibilityFactor: string;
  specificHeatRatio: string;
  viscosity: string;
}

const defaultForm: FormState = {
  flowRate: "",
  pressure: "",
  temperature: "",
  molecularWeight: "",
  innerDiameter: "",
  pipeLength: "",
  roughness: "0.0457",
  compressibilityFactor: "0.92",
  specificHeatRatio: "1.27",
  viscosity: "0.012",
};

const fieldUnitMap: FieldUnitMap = {
  flowRate: "flowMass",
  pressure: "pressure",
  temperature: "temperature",
  innerDiameter: "diameter",
  pipeLength: "length",
  molecularWeight: null,
  roughness: null,
  compressibilityFactor: null,
  specificHeatRatio: null,
  viscosity: null,
};

export default function GasLineSizingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<GasSizingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");
  const [limitWarnings, setLimitWarnings] = useState<LimitWarning[]>([]);

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
        flowRate: convertToSI("flowMass", parseFloat(form.flowRate), unitSystem),
        pressure: convertToSI("pressure", parseFloat(form.pressure), unitSystem),
        temperature: convertToSI("temperature", parseFloat(form.temperature), unitSystem),
        molecularWeight: parseFloat(form.molecularWeight),
        innerDiameter: convertToSI("diameter", parseFloat(form.innerDiameter), unitSystem),
        pipeLength: convertToSI("length", parseFloat(form.pipeLength), unitSystem),
        roughness: parseFloat(form.roughness),
        compressibilityFactor: parseFloat(form.compressibilityFactor),
        specificHeatRatio: parseFloat(form.specificHeatRatio),
        viscosity: parseFloat(form.viscosity),
      };
      for (const [key, val] of Object.entries(input)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }
      const res = calculateGasLineSizing(input);
      setResult(res);
      
      if (selectedService) {
        const service = GAS_SERVICE_LIMITS.find(s => s.service === selectedService);
        if (service) {
          const dpBarPerKm = res.pressureDropPer100m * 10;
          const opPressureBar = convertToSI("pressure", parseFloat(form.pressure), unitSystem);
          const lw = checkGasLimits(service, res.velocity, dpBarPerKm, res.rhoV2, res.machNumber, opPressureBar);
          setLimitWarnings(lw);
        }
      } else {
        setLimitWarnings([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    const tc = GAS_SIZING_TEST_CASE;
    setUnitSystem("SI");
    setForm({
      flowRate: String(tc.flowRate),
      pressure: String(tc.pressure),
      temperature: String(tc.temperature),
      molecularWeight: String(tc.molecularWeight),
      innerDiameter: String(tc.innerDiameter),
      pipeLength: String(tc.pipeLength),
      roughness: String(tc.roughness),
      compressibilityFactor: String(tc.compressibilityFactor),
      specificHeatRatio: String(tc.specificHeatRatio),
      viscosity: String(tc.viscosity),
    });
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setForm(defaultForm);
    setResult(null);
    setError(null);
    setLimitWarnings([]);
    setSelectedService("");
  };

  const handleGasSelect = (gasName: string) => {
    const gas = COMMON_GASES[gasName];
    if (gas) {
      setForm((prev) => ({
        ...prev,
        molecularWeight: String(gas.mw),
        specificHeatRatio: String(gas.gamma),
      }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Wind className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">
              Gas Line Sizing
            </h1>
            <p className="text-sm text-muted-foreground">
              Darcy-Weisbach with Swamee-Jain friction factor
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Mass Flow Rate ({getUnit("flowMass", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.flowRate}
                    onChange={(e) => updateField("flowRate", e.target.value)}
                    placeholder="e.g. 50000"
                    data-testid="input-flow-rate"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Operating Pressure ({getUnit("pressure", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.pressure}
                    onChange={(e) => updateField("pressure", e.target.value)}
                    placeholder="e.g. 30"
                    data-testid="input-pressure"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Operating Temperature ({getUnit("temperature", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.temperature}
                    onChange={(e) => updateField("temperature", e.target.value)}
                    placeholder="e.g. 40"
                    data-testid="input-temperature"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Gas Selection
                  </Label>
                  <Select onValueChange={handleGasSelect}>
                    <SelectTrigger data-testid="select-gas">
                      <SelectValue placeholder="Select a gas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(COMMON_GASES).map((gas) => (
                        <SelectItem key={gas} value={gas}>
                          {gas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Molecular Weight (kg/kmol)
                  </Label>
                  <Input
                    type="number"
                    value={form.molecularWeight}
                    onChange={(e) => updateField("molecularWeight", e.target.value)}
                    placeholder="e.g. 18.5"
                    data-testid="input-mw"
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
                    placeholder="e.g. 500"
                    data-testid="input-length"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Service Type</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger data-testid="select-service">
                    <SelectValue placeholder="Select service type for limit check..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GAS_SERVICE_LIMITS.map((s) => (
                      <SelectItem key={s.service} value={s.service}>{s.service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Pipe Selection
                </p>
                <PipeSizeSelector
                  unitSystem={unitSystem}
                  innerDiameter={form.innerDiameter}
                  roughness={form.roughness}
                  onDiameterChange={(v) => updateField("innerDiameter", v)}
                  onRoughnessChange={(v) => updateField("roughness", v)}
                />
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Gas Properties
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Z-factor</Label>
                    <Input
                      type="number"
                      value={form.compressibilityFactor}
                      onChange={(e) => updateField("compressibilityFactor", e.target.value)}
                      data-testid="input-z-factor"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
                    <Input
                      type="number"
                      value={form.specificHeatRatio}
                      onChange={(e) => updateField("specificHeatRatio", e.target.value)}
                      data-testid="input-cp-cv"
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
                      data-testid="input-viscosity"
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
                Calculate
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <WarningPanel warnings={result.warnings} />
              {selectedService && limitWarnings.length > 0 && (
                <LimitsPanel
                  serviceName={selectedService}
                  warnings={limitWarnings}
                  notes={GAS_SERVICE_LIMITS.find(s => s.service === selectedService)?.notes}
                />
              )}
              <ResultsPanel
                title="Gas Line Sizing Results"
                results={[
                  {
                    label: "Velocity",
                    value: convertFromSI("velocity", result.velocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "Pressure Drop",
                    value: convertFromSI("pressure", result.pressureDrop, unitSystem),
                    unit: getUnit("pressure", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "\u0394P per 100m",
                    value: result.pressureDropPer100m,
                    unit: "bar/100m",
                  },
                  {
                    label: "Reynolds Number",
                    value: result.reynoldsNumber,
                    unit: "\u2014",
                  },
                  {
                    label: "Friction Factor (f)",
                    value: result.frictionFactor,
                    unit: "\u2014",
                  },
                  {
                    label: "Mach Number",
                    value: result.machNumber,
                    unit: "\u2014",
                    highlight: result.machNumber > 0.3,
                  },
                  {
                    label: "\u03C1v\u00B2",
                    value: result.rhoV2,
                    unit: "kg/(m\u00B7s\u00B2)",
                  },
                  {
                    label: "Gas Density",
                    value: result.gasDensity,
                    unit: getUnit("density", unitSystem),
                  },
                ]}
                rawData={result}
              />
            </>
          )}
          {!result && (
            <Card>
              <CardContent className="py-12 text-center">
                <Wind className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Enter parameters and click Calculate to see results
                </p>
              </CardContent>
            </Card>
          )}
          <div className="mt-4">
            <AssumptionsPanel
            assumptions={[
            "Steady-state, single-phase compressible gas flow",
            "Isothermal flow assumption (no temperature change along pipe)",
            "Darcy-Weisbach equation for pressure drop calculation",
            "Swamee-Jain approximation for Colebrook friction factor",
            "Ideal gas law with compressibility factor (Z) correction",
            "Pipe roughness assumed uniform along pipe length",
            ]}
            references={[
            "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
            "API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems",
            "Swamee, P.K. and Jain, A.K. (1976) \u2014 Explicit equations for pipe-flow problems",
            "Perry's Chemical Engineers' Handbook, 9th Edition",
            ]}
            />
          </div>

          <FeedbackSection calculatorName="Gas Line Sizing" />
        </div>
      </div>
    </div>
  );
}
