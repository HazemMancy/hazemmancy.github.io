import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { LimitsPanel } from "@/components/engineering/limits-panel";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import {
  calculateMultiphase,
  MULTIPHASE_TEST_CASE,
  type MultiphaseResult,
} from "@/lib/engineering/multiphase";
import { multiphaseSchema } from "@/lib/engineering/validation";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { MIXED_PHASE_SERVICE_LIMITS, type MixedPhaseServiceLimit } from "@/lib/engineering/constants";
import { checkMixedPhaseLimits, type LimitWarning } from "@/lib/engineering/limitCheck";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { Gauge, FlaskConical, RotateCcw } from "lucide-react";

interface FormState {
  gasFlowRate: string;
  liquidFlowRate: string;
  gasDensity: string;
  liquidDensity: string;
  innerDiameter: string;
  cFactor: string;
}

const defaultForm: FormState = {
  gasFlowRate: "",
  liquidFlowRate: "",
  gasDensity: "",
  liquidDensity: "",
  innerDiameter: "",
  cFactor: "150",
};

const fieldUnitMap: FieldUnitMap = {
  gasFlowRate: "flowActualGas",
  liquidFlowRate: "flowLiquid",
  gasDensity: "density",
  liquidDensity: "density",
  innerDiameter: "diameter",
  cFactor: null,
};

export default function MultiphaseLinePage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<MultiphaseResult | null>(null);
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
        gasFlowRate: convertToSI("flowActualGas", parseFloat(form.gasFlowRate), unitSystem),
        liquidFlowRate: convertToSI("flowLiquid", parseFloat(form.liquidFlowRate), unitSystem),
        gasDensity: convertToSI("density", parseFloat(form.gasDensity), unitSystem),
        liquidDensity: convertToSI("density", parseFloat(form.liquidDensity), unitSystem),
        innerDiameter: convertToSI("diameter", parseFloat(form.innerDiameter), unitSystem),
        cFactor: parseFloat(form.cFactor),
      };
      for (const [key, val] of Object.entries(input)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }

      // Zod validation — field-specific errors before solver is called
      const validation = multiphaseSchema.safeParse(input);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        const fieldLabel = firstIssue.path.length > 0 ? `${firstIssue.path[0]}: ` : "";
        throw new Error(`${fieldLabel}${firstIssue.message}`);
      }

      const res = calculateMultiphase(validation.data);
      setResult(res);
      
      if (selectedService) {
        const service = MIXED_PHASE_SERVICE_LIMITS.find(s => s.service === selectedService);
        if (service) {
          const lw = checkMixedPhaseLimits(service, res.rhoV2);
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
    const tc = MULTIPHASE_TEST_CASE;
    setUnitSystem("SI");
    setForm({
      gasFlowRate: String(tc.gasFlowRate),
      liquidFlowRate: String(tc.liquidFlowRate),
      gasDensity: String(tc.gasDensity),
      liquidDensity: String(tc.liquidDensity),
      innerDiameter: String(tc.innerDiameter),
      cFactor: String(tc.cFactor),
    });
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setForm(defaultForm);
    setResult(null);
    setError(null);
    setSelectedService("");
    setLimitWarnings([]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">
              Multiphase Line Screening
            </h1>
            <p className="text-sm text-muted-foreground">
              Homogeneous no-slip screening — API RP 14E erosional velocity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Screening Tool</Badge>
          <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-4">
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
                <div className="sm:col-span-2">
                  <Label className="text-xs mb-1.5 block">Service Type</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger data-testid="select-service">
                      <SelectValue placeholder="Select service type for limit check..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MIXED_PHASE_SERVICE_LIMITS.map((s) => (
                        <SelectItem key={s.service} value={s.service}>{s.service}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Actual Gas Flow — at operating P/T ({getUnit("flowActualGas", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.gasFlowRate}
                    onChange={(e) => updateField("gasFlowRate", e.target.value)}
                    placeholder="e.g. 5000"
                    data-testid="input-gas-flow"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Liquid Volume Flow ({getUnit("flowLiquid", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.liquidFlowRate}
                    onChange={(e) => updateField("liquidFlowRate", e.target.value)}
                    placeholder="e.g. 50"
                    data-testid="input-liquid-flow"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Gas Density ({getUnit("density", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.gasDensity}
                    onChange={(e) => updateField("gasDensity", e.target.value)}
                    placeholder="e.g. 25"
                    data-testid="input-gas-density"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Liquid Density ({getUnit("density", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.liquidDensity}
                    onChange={(e) => updateField("liquidDensity", e.target.value)}
                    placeholder="e.g. 800"
                    data-testid="input-liquid-density"
                  />
                </div>
                <div className="sm:col-span-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Pipe Selection</p>
                  <PipeSizeSelector
                    unitSystem={unitSystem}
                    innerDiameter={form.innerDiameter}
                    onDiameterChange={(v) => updateField("innerDiameter", v)}
                    showRoughness={false}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    C-Factor (API 14E)
                  </Label>
                  <Input
                    type="number"
                    value={form.cFactor}
                    onChange={(e) => updateField("cFactor", e.target.value)}
                    placeholder="100-300 (typical: 150)"
                    data-testid="input-c-factor"
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
              {selectedService && limitWarnings.length > 0 && (
                <LimitsPanel
                  serviceName={selectedService}
                  warnings={limitWarnings}
                  notes={MIXED_PHASE_SERVICE_LIMITS.find(s => s.service === selectedService)?.notes}
                />
              )}
              <ResultsPanel
                showExport={true}
                title="Multiphase Screening Results"
                results={[
                  {
                    label: "Superficial Gas Velocity (Vsg)",
                    value: convertFromSI("velocity", result.superficialGasVelocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                  },
                  {
                    label: "Superficial Liquid Velocity (Vsl)",
                    value: convertFromSI("velocity", result.superficialLiquidVelocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                  },
                  {
                    label: "Mixture Velocity (Vm)",
                    value: convertFromSI("velocity", result.mixtureVelocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "Erosional Velocity (Ve)",
                    value: convertFromSI("velocity", result.erosionalVelocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "Vm / Ve Ratio",
                    value: result.velocityRatio,
                    unit: "—",
                    highlight: result.velocityRatio > 0.8,
                  },
                  {
                    label: "Mixture Density",
                    value: result.mixtureDensity,
                    unit: getUnit("density", unitSystem),
                  },
                  {
                    label: "No-slip liquid fraction (λL)",
                    value: result.noSlipLiquidFraction,
                    unit: "—",
                  },
                  {
                    label: "\u03C1v\u00B2",
                    value: result.rhoV2,
                    unit: "kg/(m\u00B7s\u00B2)",
                  },
                ]}
                rawData={result}
                exportData={{
                  calculatorName: "Multiphase Line Screening",
                  inputs: [
                    { label: "Actual Gas Flow (at operating P/T)", value: form.gasFlowRate, unit: getUnit("flowActualGas", unitSystem) },
                    { label: "Liquid Volume Flow", value: form.liquidFlowRate, unit: getUnit("flowLiquid", unitSystem) },
                    { label: "Gas Density (at operating P/T)", value: form.gasDensity, unit: getUnit("density", unitSystem) },
                    { label: "Liquid Density", value: form.liquidDensity, unit: getUnit("density", unitSystem) },
                    { label: "Inner Diameter", value: form.innerDiameter, unit: getUnit("diameter", unitSystem) },
                    { label: "C-Factor (API RP 14E)", value: form.cFactor },
                    ...(selectedService ? [{ label: "Service Type", value: selectedService }] : []),
                  ],
                  results: [
                    { label: "Superficial Gas Velocity (Vsg)", value: convertFromSI("velocity", result.superficialGasVelocity, unitSystem), unit: getUnit("velocity", unitSystem) },
                    { label: "Superficial Liquid Velocity (Vsl)", value: convertFromSI("velocity", result.superficialLiquidVelocity, unitSystem), unit: getUnit("velocity", unitSystem) },
                    { label: "Mixture Velocity (Vm)", value: convertFromSI("velocity", result.mixtureVelocity, unitSystem), unit: getUnit("velocity", unitSystem), highlight: true },
                    { label: "Erosional Velocity (Ve)", value: convertFromSI("velocity", result.erosionalVelocity, unitSystem), unit: getUnit("velocity", unitSystem), highlight: true },
                    { label: "Vm / Ve Ratio", value: result.velocityRatio, unit: "—" },
                    { label: "Mixture Density (homogeneous)", value: result.mixtureDensity, unit: "kg/m³" },
                    { label: "No-slip liquid fraction (λL)", value: result.noSlipLiquidFraction, unit: "—" },
                    { label: "ρv²", value: result.rhoV2, unit: "kg/(m·s²)" },
                  ],
                  methodology: [
                    "HOMOGENEOUS NO-SLIP SCREENING MODEL — not a mechanistic multiphase model",
                    "Superficial gas velocity: Vsg = Qg_actual / A (actual volumetric flow at operating P/T required)",
                    "Superficial liquid velocity: Vsl = Ql / A",
                    "Mixture velocity: Vm = Vsg + Vsl",
                    "No-slip liquid fraction: λL = Vsl / Vm (volumetric fraction assuming no phase slip)",
                    "Homogeneous mixture density: ρm = ρL·λL + ρG·(1 − λL)",
                    "Erosional velocity per API RP 14E: Ve = C / √ρm",
                    "Mixture density used for both erosional velocity and ρv² screening check",
                    "Velocity and ρv² limits: engineering best-practice screening per API RP 14E and EPC FEED practice",
                  ],
                  assumptions: [
                    "HOMOGENEOUS NO-SLIP SCREENING ONLY — phases assumed to travel at the same velocity (no slip)",
                    "This is NOT a detailed pressure-drop model, mechanistic correlation, or flow-regime predictor",
                    "Not a substitute for rigorous flow assurance analysis (OLGA / PIPESIM / Ledaflow)",
                    "Gas flow input must be ACTUAL volumetric flow at operating P/T — standard or Sm³/h must be converted first",
                    "No-slip liquid fraction (λL) is a screening estimate only — not the same as true in-situ liquid holdup",
                    "No terrain profile, elevation effects, or slug tracking — homogeneous model only",
                    "Mixture density is volume-fraction weighted average — appropriate for homogeneous model",
                    "Velocity and ρv² limits: engineering best-practice screening per API RP 14E — not universal hard code-compliance limits; for FEED / preliminary design",
                  ],
                  references: [
                    "API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems",
                    "GPSA Engineering Data Book, 14th Edition — Section 17",
                  ],
                  warnings: result.warnings.length > 0 ? result.warnings : undefined,
                } as ExportDatasheet}
              />
            </>
          )}
          {!result && (
            <Card>
              <CardContent className="py-12 text-center">
                <Gauge className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Enter parameters and click Calculate to see results
                </p>
              </CardContent>
            </Card>
          )}
          <div className="mt-4">
            <AssumptionsPanel
            assumptions={[
              "HOMOGENEOUS NO-SLIP SCREENING ONLY — phases assumed to travel at the same velocity (no phase slip)",
              "This is NOT a detailed pressure-drop model, mechanistic correlation, or flow-regime predictor",
              "NOT a substitute for rigorous multiphase flow assurance analysis (OLGA / PIPESIM / Ledaflow)",
              "No flow-regime map or mechanistic correlation is implemented — Beggs & Brill and similar methods are NOT used",
              "Gas flow input is ACTUAL volumetric flow at operating P/T — standard flow (Sm³/h / MMSCFD) must be converted to actual conditions first",
              "No-slip liquid fraction λL = Vsl / Vm is a screening estimate only — NOT equal to true in-situ liquid holdup",
              "Homogeneous mixture density: ρm = ρL·λL + ρG·(1−λL) — volume-fraction weighted, no-slip basis",
              "No terrain profile, elevation effects, or transient slug tracking — steady-state homogeneous model only",
              "Erosional velocity per API RP 14E: Ve = C / √ρm; C-factor is user input",
              "Velocity and ρv² limits: engineering best-practice screening per API RP 14E — not universal hard code-compliance limits; for FEED / preliminary design",
            ]}
            references={[
              "API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems",
              "GPSA Engineering Data Book, 14th Edition — Section 17",
            ]}
            />
          </div>

          <FeedbackSection calculatorName="Multiphase Line Screening" />
        </div>
      </div>
    </div>
  );
}
