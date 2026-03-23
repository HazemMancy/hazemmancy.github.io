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
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import { LimitsPanel } from "@/components/engineering/limits-panel";
import {
  calculateLiquidLineSizing,
  LIQUID_SIZING_TEST_CASE,
  type LiquidSizingResult,
} from "@/lib/engineering/liquidSizing";
import { liquidLineSizingSchema } from "@/lib/engineering/validation";
import { LIQUID_SERVICE_LIMITS, type LiquidServiceLimit, getNPSBandFromDiameter } from "@/lib/engineering/constants";
import { checkLiquidLimits, type LimitWarning } from "@/lib/engineering/limitCheck";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
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

const fieldUnitMap: FieldUnitMap = {
  flowRate: "flowLiquid",
  density: "density",
  viscosity: null,
  innerDiameter: "diameter",
  pipeLength: "length",
  roughness: null,
  elevationChange: "length",
};

export default function LiquidLineSizingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<LiquidSizingResult | null>(null);
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
        flowRate: convertToSI("flowLiquid", parseFloat(form.flowRate), unitSystem),
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

      // Zod validation — field-specific errors before solver is called
      const validation = liquidLineSizingSchema.safeParse(input);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        const fieldLabel = firstIssue.path.length > 0 ? `${firstIssue.path[0]}: ` : "";
        throw new Error(`${fieldLabel}${firstIssue.message}`);
      }

      const res = calculateLiquidLineSizing(validation.data);
      setResult(res);

      if (selectedService) {
        const service = LIQUID_SERVICE_LIMITS.find(s => s.service === selectedService);
        if (service) {
          const dpBarPerKm = res.pressureDropPer100m * 10;
          const diamMm = convertToSI("diameter", parseFloat(form.innerDiameter), unitSystem);
          const npsBand = getNPSBandFromDiameter(diamMm);
          const lw = checkLiquidLimits(service, res.velocity, dpBarPerKm, npsBand);
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
    setLimitWarnings([]);
    setSelectedService("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
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
        <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
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
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Liquid Volume Flow Rate ({getUnit("flowLiquid", unitSystem)})
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
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Service Type</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger data-testid="select-service">
                    <SelectValue placeholder="Select service type for limit check..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LIQUID_SERVICE_LIMITS.map((s) => (
                      <SelectItem key={s.service} value={s.service}>{s.service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Pipe Selection</p>
                <PipeSizeSelector
                  unitSystem={unitSystem}
                  innerDiameter={form.innerDiameter}
                  roughness={form.roughness}
                  onDiameterChange={(v) => updateField("innerDiameter", v)}
                  onRoughnessChange={(v) => updateField("roughness", v)}
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
                  notes={LIQUID_SERVICE_LIMITS.find(s => s.service === selectedService)?.notes}
                />
              )}
              <ResultsPanel
                showExport={true}
                title="Liquid Line Sizing Results"
                results={[
                  {
                    label: "Velocity",
                    value: convertFromSI("velocity", result.velocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "Friction Pressure Drop",
                    value: convertFromSI("pressure", result.frictionLoss, unitSystem),
                    unit: getUnit("pressure", unitSystem),
                  },
                  {
                    label: "Static Head (pressure equiv.)",
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
                    label: "Friction ΔP per 100 m",
                    value: result.pressureDropPer100m,
                    unit: "bar/100m",
                  },
                  {
                    label: "Friction Head",
                    value: result.frictionHeadM.toFixed(2),
                    unit: "m liq.",
                  },
                  {
                    label: "Static Head",
                    value: result.staticHeadM.toFixed(2),
                    unit: "m liq.",
                  },
                  {
                    label: "Total Head",
                    value: result.totalHeadM.toFixed(2),
                    unit: "m liq.",
                    highlight: true,
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
                exportData={{
                  calculatorName: "Liquid Line Sizing",
                  inputs: [
                    { label: "Liquid Volume Flow Rate", value: form.flowRate, unit: getUnit("flowLiquid", unitSystem) },
                    { label: "Liquid Density", value: form.density, unit: getUnit("density", unitSystem) },
                    { label: "Viscosity (Newtonian)", value: form.viscosity, unit: getUnit("viscosity", unitSystem) },
                    { label: "Inner Diameter", value: form.innerDiameter, unit: getUnit("diameter", unitSystem) },
                    { label: "Pipe Length", value: form.pipeLength, unit: getUnit("length", unitSystem) },
                    { label: "Roughness", value: form.roughness, unit: "mm" },
                    { label: "Elevation Change (+ve = uphill)", value: form.elevationChange, unit: getUnit("length", unitSystem) },
                    ...(selectedService ? [{ label: "Service Type", value: selectedService }] : []),
                  ],
                  results: [
                    { label: "Velocity", value: convertFromSI("velocity", result.velocity, unitSystem), unit: getUnit("velocity", unitSystem), highlight: true },
                    { label: "Friction Pressure Drop", value: convertFromSI("pressure", result.frictionLoss, unitSystem), unit: getUnit("pressure", unitSystem) },
                    { label: "Static Head (pressure equiv.)", value: convertFromSI("pressure", result.staticHead, unitSystem), unit: getUnit("pressure", unitSystem) },
                    { label: "Total Pressure Drop", value: convertFromSI("pressure", result.totalPressureDrop, unitSystem), unit: getUnit("pressure", unitSystem), highlight: true },
                    { label: "Friction ΔP per 100 m (friction only)", value: result.pressureDropPer100m, unit: "bar/100m" },
                    { label: "Friction Head", value: `${result.frictionHeadM.toFixed(2)}`, unit: "m liq." },
                    { label: "Static Head", value: `${result.staticHeadM.toFixed(2)}`, unit: "m liq." },
                    { label: "Total Head", value: `${result.totalHeadM.toFixed(2)}`, unit: "m liq.", highlight: true },
                    { label: "Reynolds Number", value: result.reynoldsNumber, unit: "—" },
                    { label: "Friction Factor (f)", value: result.frictionFactor, unit: "—" },
                  ],
                  methodology: [
                    "Darcy-Weisbach equation for incompressible liquid friction pressure drop: ΔP_f = f·(L/D)·(ρ·v²/2)",
                    "Swamee-Jain explicit approximation for Colebrook-White friction factor (4000 < Re < 1×10⁸)",
                    "Laminar regime (Re < 2300): f = 64/Re (Hagen-Poiseuille)",
                    "Static head: ΔP_s = ρ·g·Δz — positive Δz = uphill (opposes flow), negative Δz = downhill (assists flow)",
                    "Total pressure drop = friction loss + static head (may be negative if downhill dominates)",
                    "Head outputs: H_f = ΔP_f/(ρ·g), H_s = Δz, H_total = H_f + Δz",
                    "Flow unit: volumetric (m³/h SI / gpm Field) — Newtonian, single-phase liquid assumed",
                    "Velocity and ΔP/100m limits: engineering best-practice screening per API RP 14E and EPC FEED practice",
                  ],
                  assumptions: [
                    "Steady-state, single-phase incompressible liquid flow",
                    "Isothermal flow — density and viscosity constant along pipe",
                    "Newtonian fluid — viscosity independent of shear rate",
                    "Darcy-Weisbach major friction losses only — minor losses (fittings, valves, bends) NOT included",
                    "Static head from elevation change included separately; sign convention: positive = uphill",
                    "Pipe roughness uniform along pipe length; default 0.0457 mm (commercial carbon steel, Moody / GPSA)",
                    "Velocity and ΔP/100m limits: engineering best-practice screening informed by API RP 14E — not universal hard code-compliance limits; applies to FEED / preliminary design",
                  ],
                  references: [
                    "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
                    "API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems",
                    "Swamee, P.K. and Jain, A.K. (1976) — Explicit equations for pipe-flow problems. J. Hydraulics Div., ASCE",
                    "GPSA Engineering Data Book, 14th Edition — Section 17",
                    "Perry's Chemical Engineers' Handbook, 9th Edition",
                  ],
                  warnings: result.warnings.length > 0 ? result.warnings : undefined,
                } as ExportDatasheet}
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
          <div className="mt-4">
            <AssumptionsPanel
            assumptions={[
              "Steady-state, single-phase incompressible liquid flow",
              "Isothermal flow — fluid density and viscosity constant along pipe length",
              "Newtonian fluid — viscosity independent of shear rate (non-Newtonian fluids not covered)",
              "Major friction losses only (Darcy-Weisbach): minor losses from fittings, valves, and bends NOT included",
              "Static head calculated separately from elevation change: ΔP_static = ρ·g·Δz; sign convention positive = uphill",
              "Elevation change opposes flow when positive (uphill) and assists flow when negative (downhill)",
              "Pipe roughness: 0.0457 mm default (commercial carbon steel, Moody chart / GPSA Table 17-7); uniform along pipe",
              "Friction factor: Swamee-Jain explicit approximation for Colebrook-White (turbulent); f = 64/Re for laminar (Re < 2300)",
              "Flow input: volumetric (m³/h SI / gpm Field) — mass flow basis not used",
              "Velocity and friction ΔP/100m limits: engineering best-practice screening per API RP 14E and EPC FEED design practice — not universal hard code-compliance limits",
            ]}
            references={[
              "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
              "API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems",
              "Swamee, P.K. and Jain, A.K. (1976) — Explicit equations for pipe-flow problems. J. Hydraulics Div., ASCE",
              "GPSA Engineering Data Book, 14th Edition — Section 17",
              "Perry's Chemical Engineers' Handbook, 9th Edition",
            ]}
            />
          </div>

          <FeedbackSection calculatorName="Liquid Line Sizing" />
        </div>
      </div>
    </div>
  );
}
