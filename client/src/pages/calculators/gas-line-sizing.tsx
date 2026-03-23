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
import { EosGasPropsPanel } from "@/components/EosGasPropsPanel";
import {
  type GasPropsMode, type ManualGasProps, resolveGasProps,
} from "@/lib/engineering/eosGasProps";
import { useGasProps } from "@/lib/engineering/GasPropsContext";
import {
  calculateGasLineSizing,
  GAS_SIZING_TEST_CASE,
  type GasSizingResult,
} from "@/lib/engineering/gasSizing";
import { gasLineSizingSchema } from "@/lib/engineering/validation";
import { GAS_SERVICE_LIMITS, type GasServiceLimit } from "@/lib/engineering/constants";
import { checkGasLimits, type LimitWarning } from "@/lib/engineering/limitCheck";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
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
  pressure: "pressureBara",
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
  const { gasPropsMode, setGasPropsMode, gasComposition, setGasComposition } = useGasProps();
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
      let mw  = parseFloat(form.molecularWeight);
      let z   = parseFloat(form.compressibilityFactor);
      let k   = parseFloat(form.specificHeatRatio);
      let mu  = parseFloat(form.viscosity);

      const T_C = convertToSI("temperature", parseFloat(form.temperature), unitSystem); // °C
      const P_bara = convertToSI("pressureBara", parseFloat(form.pressure), unitSystem); // bar(a)

      if (gasPropsMode !== "manual") {
        const manual: ManualGasProps = {
          molecularWeight: isNaN(mw) ? 18.5 : mw,
          specificHeatRatio: isNaN(k) ? 1.27 : k,
          compressibilityFactor: isNaN(z) ? 0.92 : z,
          viscosity: isNaN(mu) ? 0.012 : mu,
        };
        const resolved = resolveGasProps(gasPropsMode, manual, gasComposition, T_C, P_bara);
        if (resolved.warnings.length > 0) setError(`EoS: ${resolved.warnings.join("; ")}`);
        mw = resolved.MW;
        z  = resolved.Z;
        k  = resolved.k;
        mu = resolved.viscosity_cP;
      }

      const input = {
        flowRate: convertToSI("flowMass", parseFloat(form.flowRate), unitSystem),
        pressure: P_bara,
        temperature: T_C,
        molecularWeight: mw,
        innerDiameter: convertToSI("diameter", parseFloat(form.innerDiameter), unitSystem),
        pipeLength: convertToSI("length", parseFloat(form.pipeLength), unitSystem),
        roughness: parseFloat(form.roughness),
        compressibilityFactor: z,
        specificHeatRatio: k,
        viscosity: mu,
      };

      // Validate with Zod schema — provides field-specific error messages
      const validation = gasLineSizingSchema.safeParse(input);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        const fieldLabel = firstIssue.path.length > 0 ? `${firstIssue.path[0]}: ` : "";
        throw new Error(`${fieldLabel}${firstIssue.message}`);
      }

      const res = calculateGasLineSizing(validation.data);
      setResult(res);

      if (selectedService) {
        const service = GAS_SERVICE_LIMITS.find(s => s.service === selectedService);
        if (service) {
          const dpBarPerKm = res.pressureDropPer100m * 10;
          const lw = checkGasLimits(service, res.velocity, dpBarPerKm, res.rhoV2, res.machNumber, P_bara);
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
                    Operating Pressure — absolute ({getUnit("pressureBara", unitSystem)})
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
                <EosGasPropsPanel
                  mode={gasPropsMode}
                  onModeChange={setGasPropsMode}
                  composition={gasComposition}
                  onCompositionChange={setGasComposition}
                  manual={{
                    molecularWeight: parseFloat(form.molecularWeight) || 18.5,
                    specificHeatRatio: parseFloat(form.specificHeatRatio) || 1.27,
                    compressibilityFactor: parseFloat(form.compressibilityFactor) || 0.92,
                    viscosity: parseFloat(form.viscosity) || 0.012,
                  }}
                  onManualChange={(field, value) => {
                    if (field === "molecularWeight") updateField("molecularWeight", String(value));
                    else if (field === "specificHeatRatio") updateField("specificHeatRatio", String(value));
                    else if (field === "compressibilityFactor") updateField("compressibilityFactor", String(value));
                    else if (field === "viscosity") updateField("viscosity", String(value));
                  }}
                  showViscosity={true}
                  testIdPrefix="gas-line"
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
                  notes={GAS_SERVICE_LIMITS.find(s => s.service === selectedService)?.notes}
                />
              )}
              <ResultsPanel
                showExport={true}
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
                    label: "\u0394P / P\u1D62\u207F",
                    value: (result.pressureDropFraction * 100).toFixed(2),
                    unit: "%",
                    highlight: result.pressureDropFraction > 0.1,
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
                exportData={{
                  calculatorName: "Gas Line Sizing",
                  inputs: [
                    { label: "Mass Flow Rate", value: form.flowRate, unit: getUnit("flowMass", unitSystem) },
                    { label: "Operating Pressure (absolute)", value: form.pressure, unit: getUnit("pressureBara", unitSystem) },
                    { label: "Operating Temperature", value: form.temperature, unit: getUnit("temperature", unitSystem) },
                    { label: "Molecular Weight", value: form.molecularWeight, unit: "kg/kmol" },
                    { label: "Inner Diameter", value: form.innerDiameter, unit: getUnit("diameter", unitSystem) },
                    { label: "Pipe Length", value: form.pipeLength, unit: getUnit("length", unitSystem) },
                    { label: "Roughness", value: form.roughness, unit: "mm" },
                    { label: "Z-Factor", value: form.compressibilityFactor },
                    { label: "Cp/Cv (k)", value: form.specificHeatRatio },
                    { label: "Viscosity", value: form.viscosity, unit: getUnit("viscosity", unitSystem) },
                    ...(selectedService ? [{ label: "Service Type", value: selectedService }] : []),
                  ],
                  results: [
                    { label: "Velocity", value: convertFromSI("velocity", result.velocity, unitSystem), unit: getUnit("velocity", unitSystem), highlight: true },
                    { label: "Pressure Drop", value: convertFromSI("pressure", result.pressureDrop, unitSystem), unit: getUnit("pressure", unitSystem), highlight: true },
                    { label: "ΔP / P_in", value: `${(result.pressureDropFraction * 100).toFixed(2)}%`, unit: "—" },
                    { label: "ΔP per 100m", value: result.pressureDropPer100m, unit: "bar/100m" },
                    { label: "Reynolds Number", value: result.reynoldsNumber, unit: "—" },
                    { label: "Friction Factor (f)", value: result.frictionFactor, unit: "—" },
                    { label: "Mach Number (approx.)", value: result.machNumber, unit: "—" },
                    { label: "ρv²", value: result.rhoV2, unit: "kg/(m·s²)" },
                    { label: "Gas Density", value: result.gasDensity, unit: "kg/m³" },
                  ],
                  methodology: [
                    "Darcy-Weisbach equation for friction pressure drop (constant-density screening approach)",
                    "Swamee-Jain explicit approximation for Colebrook-White friction factor (4000 < Re < 1×10⁸; 1×10⁻⁶ ≤ ε/D ≤ 0.01)",
                    "Gas density from real-gas equation of state: ρ = PM / (ZRT)",
                    "Pressure basis: ABSOLUTE pressure required for gas density — bar(a) / psia",
                    "Flow basis: MASS flow rate (kg/h or lb/h) — solver is NOT based on standard volumetric flow",
                    "Mach number: APPROXIMATE screening only — a = √(k·Z·R·T/M); not a rigorous real-gas speed-of-sound model",
                    "Velocity and erosional limits: engineering best-practice screening per API RP 14E and EPC practice",
                  ],
                  assumptions: [
                    "Steady-state, single-phase gas flow (no liquid entrainment)",
                    "Isothermal flow — temperature constant along pipe length",
                    "Constant density along pipe (calculated at inlet conditions) — valid only for ΔP/P_in < ~10%",
                    "Mach number is an approximate screen (ideal-gas speed of sound with Z correction)",
                    "Velocity and ρv² limits are engineering best-practice screening per API RP 14E — not universal hard code-compliance limits; applies to preliminary design / FEED",
                    "Pipe roughness: 0.0457 mm default (commercial carbon steel per Moody / GPSA Table 17-7); uniform along pipe",
                    "Pressure input is ABSOLUTE pressure — gauge pressure must be converted before entry",
                  ],
                  references: [
                    "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
                    "API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems",
                    "Swamee, P.K. and Jain, A.K. (1976) — Explicit equations for pipe-flow problems",
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
              "Steady-state, single-phase gas flow — no liquid entrainment assumed",
              "Isothermal flow — temperature constant along pipe length",
              "CONSTANT DENSITY screening — density evaluated at inlet conditions only; valid for ΔP/P_in < ~10%; results become increasingly conservative at higher pressure-drop fractions",
              "APPROXIMATE Mach screening — speed of sound = √(k·Z·R·T/M); not a rigorous real-gas model",
              "Flow basis: MASS flow rate (kg/h or lb/h) — NOT standard volumetric flow (Sm³/h or MMSCFD)",
              "Pressure basis: ABSOLUTE pressure required — bar(a) or psia; gauge pressure must be converted before entry",
              "Velocity and ρv² limits: engineering best-practice screening per API RP 14E and EPC FEED design practice — not universal hard code-compliance limits",
              "Pipe roughness: 0.0457 mm default (commercial carbon steel, Moody / GPSA Table 17-7); assumed uniform",
              "Darcy-Weisbach friction factor from Swamee-Jain explicit approximation for Colebrook-White equation",
            ]}
            references={[
              "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
              "API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems",
              "Swamee, P.K. and Jain, A.K. (1976) \u2014 Explicit equations for pipe-flow problems. J. Hydraulics Div., ASCE",
              "GPSA Engineering Data Book, 14th Edition — Sections 17 & 23",
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
