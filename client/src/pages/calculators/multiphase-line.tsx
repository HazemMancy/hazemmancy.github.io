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
import { Gauge, FlaskConical, RotateCcw, Info, ChevronDown, ChevronUp } from "lucide-react";

// ─── C-Factor preset service types ────────────────────────────────────────────
type CFactorPreset = "continuous-clean" | "intermittent-clean" | "corrosion-controlled" | "custom";

const C_FACTOR_PRESETS: Record<CFactorPreset, { label: string; value: number | null; description: string }> = {
  "continuous-clean": {
    label: "Continuous – solids-free service",
    value: 100,
    description: "C = 100 — conservative recommendation for continuous solids-free service (API RP 14E)",
  },
  "intermittent-clean": {
    label: "Intermittent – solids-free service",
    value: 125,
    description: "C = 125 — conservative recommendation for intermittent solids-free service (API RP 14E)",
  },
  "corrosion-controlled": {
    label: "Corrosion-controlled / CRA service",
    value: null,
    description: "C = 150–200 may be considered where corrosion is controlled by inhibition or CRA materials — subject to project/company approval. Enter manually.",
  },
  "custom": {
    label: "Custom",
    value: null,
    description: "Enter C-factor directly. Must be justified by service conditions, corrosion control strategy, and project/company criteria.",
  },
};

// ─── Form state ───────────────────────────────────────────────────────────────
interface FormState {
  gasMassFlowRate: string;
  liquidMassFlowRate: string;
  gasDensity: string;
  liquidDensity: string;
  innerDiameter: string;
  cFactor: string;
}

const defaultForm: FormState = {
  gasMassFlowRate: "",
  liquidMassFlowRate: "",
  gasDensity: "",
  liquidDensity: "",
  innerDiameter: "",
  cFactor: "100",
};

const fieldUnitMap: FieldUnitMap = {
  gasMassFlowRate: "flowMass",
  liquidMassFlowRate: "flowMass",
  gasDensity: "density",
  liquidDensity: "density",
  innerDiameter: "diameter",
  cFactor: null,
};

// ─── C-factor advisory helpers ────────────────────────────────────────────────
function getCFactorAdvisory(c: number): { level: "none" | "advisory" | "warning"; message: string } {
  if (c > 200) {
    return {
      level: "warning",
      message: `C = ${c} is elevated. This should only be used where justified by controlled clean service, CRA material specification, and explicit project/company acceptance criteria.`,
    };
  }
  if (c > 125) {
    return {
      level: "advisory",
      message: `C = ${c} selected. Confirm corrosion control / CRA material basis and ensure project/company acceptance is documented.`,
    };
  }
  return { level: "none", message: "" };
}

// ─── Page component ───────────────────────────────────────────────────────────
export default function MultiphaseLinePage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<MultiphaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");
  const [limitWarnings, setLimitWarnings] = useState<LimitWarning[]>([]);
  const [cFactorPreset, setCFactorPreset] = useState<CFactorPreset>("continuous-clean");
  const [showCGuidance, setShowCGuidance] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnitToggle = (newSystem: UnitSystem) => {
    const converted = convertFormValues(form, fieldUnitMap, unitSystem, newSystem);
    setForm(converted);
    setUnitSystem(newSystem);
  };

  const handleCPresetChange = (preset: CFactorPreset) => {
    setCFactorPreset(preset);
    const p = C_FACTOR_PRESETS[preset];
    if (p.value !== null) {
      updateField("cFactor", String(p.value));
    }
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const raw = {
        gasMassFlowRate: convertToSI("flowMass", parseFloat(form.gasMassFlowRate), unitSystem),
        liquidMassFlowRate: convertToSI("flowMass", parseFloat(form.liquidMassFlowRate), unitSystem),
        gasDensity: convertToSI("density", parseFloat(form.gasDensity), unitSystem),
        liquidDensity: convertToSI("density", parseFloat(form.liquidDensity), unitSystem),
        innerDiameter: convertToSI("diameter", parseFloat(form.innerDiameter), unitSystem),
        cFactor: parseFloat(form.cFactor),
      };

      for (const [key, val] of Object.entries(raw)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }

      // Zod validation — field-specific errors before solver is called
      const validation = multiphaseSchema.safeParse(raw);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        const fieldLabel = firstIssue.path.length > 0 ? `${firstIssue.path[0]}: ` : "";
        throw new Error(`${fieldLabel}${firstIssue.message}`);
      }

      const res = calculateMultiphase(validation.data);
      setResult(res);

      if (selectedService) {
        const service = MIXED_PHASE_SERVICE_LIMITS.find((s) => s.service === selectedService);
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
    setCFactorPreset("custom");
    setForm({
      gasMassFlowRate: String(tc.gasMassFlowRate),
      liquidMassFlowRate: String(tc.liquidMassFlowRate),
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
    setCFactorPreset("continuous-clean");
    setShowCGuidance(false);
  };

  const cVal = parseFloat(form.cFactor);
  const cAdvisory = !isNaN(cVal) ? getCFactorAdvisory(cVal) : { level: "none" as const, message: "" };
  const massFlowUnit = getUnit("flowMass", unitSystem);
  const densityUnit = getUnit("density", unitSystem);
  const velocityUnit = getUnit("velocity", unitSystem);
  const diamUnit = getUnit("diameter", unitSystem);

  // Derived volumetric flows for display (from result, already in m³/h SI)
  const displayGasVol = result
    ? unitSystem === "SI"
      ? `${result.actualGasVolumetricFlow.toFixed(1)} m³/h`
      : `${(result.actualGasVolumetricFlow * 0.588578).toFixed(1)} ACFM`
    : null;
  const displayLiqVol = result
    ? unitSystem === "SI"
      ? `${result.actualLiquidVolumetricFlow.toFixed(2)} m³/h`
      : `${(result.actualLiquidVolumetricFlow * 4.40287).toFixed(2)} gpm`
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
              Homogeneous no-slip screening — mass-flow basis — API RP 14E erosional velocity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Screening Tool</Badge>
          <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        {/* ── Left — Input panel ─────────────────────────────────────────── */}
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
            <CardContent className="space-y-5 pt-0">

              {/* Service type selector */}
              <div>
                <Label className="text-xs mb-1.5 block">Service Type (for ρv² limit check)</Label>
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

              {/* ── Phase mass flowrates ─────────────────────────────────── */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Phase Mass Flowrates</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Gas Mass Flowrate ({massFlowUnit})
                    </Label>
                    <Input
                      type="number"
                      value={form.gasMassFlowRate}
                      onChange={(e) => updateField("gasMassFlowRate", e.target.value)}
                      placeholder="e.g. 125000"
                      data-testid="input-gas-mass-flow"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Liquid Mass Flowrate ({massFlowUnit})
                    </Label>
                    <Input
                      type="number"
                      value={form.liquidMassFlowRate}
                      onChange={(e) => updateField("liquidMassFlowRate", e.target.value)}
                      placeholder="e.g. 40000"
                      data-testid="input-liquid-mass-flow"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  At least one phase must have a positive mass flowrate. Enter 0 for a single-phase line.
                </p>
              </div>

              {/* ── Actual phase densities ───────────────────────────────── */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Actual Phase Densities at Operating Conditions</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Gas Density at Operating P/T ({densityUnit})
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
                      Liquid Density at Operating P/T ({densityUnit})
                    </Label>
                    <Input
                      type="number"
                      value={form.liquidDensity}
                      onChange={(e) => updateField("liquidDensity", e.target.value)}
                      placeholder="e.g. 800"
                      data-testid="input-liquid-density"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Must be <strong>actual</strong> densities at operating pressure and temperature — not reference/standard conditions. Obtain from PVT report or process simulation.
                </p>
              </div>

              {/* ── Pipe selection ───────────────────────────────────────── */}
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-3">Pipe Selection</p>
                <PipeSizeSelector
                  unitSystem={unitSystem}
                  innerDiameter={form.innerDiameter}
                  onDiameterChange={(v) => updateField("innerDiameter", v)}
                  showRoughness={false}
                />
              </div>

              {/* ── C-Factor ─────────────────────────────────────────────── */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    API RP 14E Erosional Velocity C-Factor
                  </p>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => setShowCGuidance((v) => !v)}
                    data-testid="button-c-guidance-toggle"
                  >
                    <Info className="w-3 h-3" />
                    Guidance
                    {showCGuidance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* C-factor guidance panel */}
                {showCGuidance && (
                  <div className="mb-3 p-3 rounded-md bg-muted/50 border text-xs space-y-2" data-testid="panel-c-guidance">
                    <p className="font-medium">API RP 14E C-Factor Selection Guidance</p>
                    <ul className="space-y-1 list-none">
                      <li><span className="font-mono font-semibold">C = 100</span> — Conservative recommendation for <strong>continuous solids-free</strong> service</li>
                      <li><span className="font-mono font-semibold">C = 125</span> — Conservative recommendation for <strong>intermittent solids-free</strong> service</li>
                      <li><span className="font-mono font-semibold">C = 150–200</span> — May be considered where corrosion is controlled by chemical inhibition or CRA materials; requires project/company approval</li>
                      <li><span className="font-mono font-semibold">C up to 250 (intermittent)</span> — Only in explicitly controlled clean service with documented project/company acceptance</li>
                      <li><span className="font-mono text-destructive font-semibold">Solids-bearing service:</span> Reduce C-factor and follow project/company-specific criteria; no universal default applies</li>
                    </ul>
                    <p className="text-muted-foreground">
                      C-factor selection is an engineering judgment input. Final selection must be verified against service conditions, corrosion control strategy, solids content assessment, and project/company requirements.
                    </p>
                  </div>
                )}

                {/* C-factor preset selector */}
                <div className="mb-3">
                  <Label className="text-xs mb-1.5 block">Service Category (C-factor preset)</Label>
                  <Select value={cFactorPreset} onValueChange={(v) => handleCPresetChange(v as CFactorPreset)}>
                    <SelectTrigger data-testid="select-c-preset">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(C_FACTOR_PRESETS) as CFactorPreset[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {C_FACTOR_PRESETS[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {C_FACTOR_PRESETS[cFactorPreset].description}
                  </p>
                </div>

                {/* C-factor numeric input */}
                <div>
                  <Label className="text-xs mb-1.5 block">C-Factor Value</Label>
                  <Input
                    type="number"
                    value={form.cFactor}
                    onChange={(e) => {
                      updateField("cFactor", e.target.value);
                      setCFactorPreset("custom");
                    }}
                    placeholder="Default: 100"
                    data-testid="input-c-factor"
                  />
                </div>

                {/* C-factor advisory warnings */}
                {cAdvisory.level === "advisory" && (
                  <div className="mt-2 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-700 dark:text-yellow-400" data-testid="advisory-c-factor">
                    ⚠ {cAdvisory.message}
                  </div>
                )}
                {cAdvisory.level === "warning" && (
                  <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-destructive" data-testid="warning-c-factor">
                    ⛔ {cAdvisory.message}
                  </div>
                )}

                {/* Quick-select preset chips */}
                <div className="flex flex-wrap gap-1 mt-3">
                  <span className="text-xs text-muted-foreground self-center mr-1">Quick select:</span>
                  {[100, 125, 150, 200].map((c) => (
                    <Button
                      key={c}
                      size="sm"
                      variant={form.cFactor === String(c) ? "default" : "outline"}
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        updateField("cFactor", String(c));
                        setCFactorPreset("custom");
                      }}
                      data-testid={`chip-c-${c}`}
                    >
                      C={c}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Error display */}
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

        {/* ── Right — Results panel ───────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <WarningPanel warnings={result.warnings} />
              {selectedService && limitWarnings.length > 0 && (
                <LimitsPanel
                  serviceName={selectedService}
                  warnings={limitWarnings}
                  notes={MIXED_PHASE_SERVICE_LIMITS.find((s) => s.service === selectedService)?.notes}
                />
              )}
              <ResultsPanel
                showExport={true}
                title="Multiphase Screening Results"
                results={[
                  {
                    label: "Derived Actual Gas Flow (Qg)",
                    value: result.actualGasVolumetricFlow,
                    unit: "m³/h",
                  },
                  {
                    label: "Derived Actual Liquid Flow (Ql)",
                    value: result.actualLiquidVolumetricFlow,
                    unit: "m³/h",
                  },
                  {
                    label: "Superficial Gas Velocity (Vsg)",
                    value: convertFromSI("velocity", result.superficialGasVelocity, unitSystem),
                    unit: velocityUnit,
                  },
                  {
                    label: "Superficial Liquid Velocity (Vsl)",
                    value: convertFromSI("velocity", result.superficialLiquidVelocity, unitSystem),
                    unit: velocityUnit,
                  },
                  {
                    label: "Mixture Velocity (Vm)",
                    value: convertFromSI("velocity", result.mixtureVelocity, unitSystem),
                    unit: velocityUnit,
                    highlight: true,
                  },
                  {
                    label: "Erosional Velocity (Ve)",
                    value: convertFromSI("velocity", result.erosionalVelocity, unitSystem),
                    unit: velocityUnit,
                    highlight: true,
                  },
                  {
                    label: "Vm / Ve Ratio",
                    value: result.velocityRatio,
                    unit: "—",
                    highlight: result.velocityRatio > 0.8,
                  },
                  {
                    label: "Mixture Density ρm (homogeneous)",
                    value: result.mixtureDensity,
                    unit: "kg/m³",
                  },
                  {
                    label: "No-slip liquid fraction (λL)",
                    value: result.noSlipLiquidFraction,
                    unit: "—",
                  },
                  {
                    label: "ρv²",
                    value: result.rhoV2,
                    unit: "kg/(m·s²)",
                  },
                ]}
                rawData={result}
                exportData={{
                  calculatorName: "Multiphase Line Screening",
                  inputs: [
                    { label: "Gas Mass Flowrate", value: form.gasMassFlowRate, unit: massFlowUnit },
                    { label: "Liquid Mass Flowrate", value: form.liquidMassFlowRate, unit: massFlowUnit },
                    { label: "Gas Density at Operating P/T", value: form.gasDensity, unit: densityUnit },
                    { label: "Liquid Density at Operating P/T", value: form.liquidDensity, unit: densityUnit },
                    { label: "Inner Diameter", value: form.innerDiameter, unit: diamUnit },
                    { label: "C-Factor (API RP 14E)", value: form.cFactor },
                    ...(selectedService ? [{ label: "Service Type", value: selectedService }] : []),
                  ],
                  results: [
                    { label: "Derived Actual Gas Flow (Qg = ṁg / ρg)", value: result.actualGasVolumetricFlow, unit: "m³/h" },
                    { label: "Derived Actual Liquid Flow (Ql = ṁl / ρl)", value: result.actualLiquidVolumetricFlow, unit: "m³/h" },
                    { label: "Superficial Gas Velocity (Vsg)", value: convertFromSI("velocity", result.superficialGasVelocity, unitSystem), unit: velocityUnit },
                    { label: "Superficial Liquid Velocity (Vsl)", value: convertFromSI("velocity", result.superficialLiquidVelocity, unitSystem), unit: velocityUnit },
                    { label: "Mixture Velocity (Vm)", value: convertFromSI("velocity", result.mixtureVelocity, unitSystem), unit: velocityUnit, highlight: true },
                    { label: "Erosional Velocity (Ve)", value: convertFromSI("velocity", result.erosionalVelocity, unitSystem), unit: velocityUnit, highlight: true },
                    { label: "Vm / Ve Ratio", value: result.velocityRatio, unit: "—" },
                    { label: "Mixture Density ρm (homogeneous)", value: result.mixtureDensity, unit: "kg/m³" },
                    { label: "No-slip liquid fraction (λL)", value: result.noSlipLiquidFraction, unit: "—" },
                    { label: "ρv²", value: result.rhoV2, unit: "kg/(m·s²)" },
                  ],
                  methodology: [
                    "HOMOGENEOUS NO-SLIP SCREENING MODEL — not a mechanistic multiphase model, not a flow-regime predictor",
                    "Step 1 — Convert mass flowrates to actual volumetric flowrates at operating P/T:",
                    "  Qg_actual [m³/h] = ṁg [kg/h] / ρg [kg/m³]",
                    "  Ql_actual [m³/h] = ṁl [kg/h] / ρl [kg/m³]",
                    "Step 2 — Compute superficial velocities:",
                    "  Vsg [m/s] = Qg_actual [m³/s] / A [m²]",
                    "  Vsl [m/s] = Ql_actual [m³/s] / A [m²]",
                    "Step 3 — Mixture velocity: Vm = Vsg + Vsl",
                    "Step 4 — No-slip liquid volume fraction: λL = Vsl / Vm",
                    "Step 5 — Homogeneous mixture density: ρm = ρL·λL + ρG·(1 − λL)",
                    "Step 6 — API RP 14E erosional velocity: Ve = C / √ρm",
                    "Step 7 — Momentum flux: ρv² = ρm · Vm²",
                    "Velocity and ρv² screening limits: engineering best-practice informed by API RP 14E and EPC FEED practice — not universal hard code-compliance limits; for preliminary design / FEED screening only",
                    "C-factor selection is an engineering judgment input. Verify against service conditions, corrosion control strategy, solids content, and project/company criteria.",
                  ],
                  assumptions: [
                    "HOMOGENEOUS NO-SLIP SCREENING ONLY — both phases assumed to travel at the same velocity (no slip between phases)",
                    "Actual volumetric flowrates are internally derived: Qg = ṁg / ρg, Ql = ṁl / ρl",
                    "Phase densities must be ACTUAL values at operating P/T — not reference/standard-condition densities",
                    "No-slip liquid fraction λL = Vsl / Vm — screening estimate only, NOT equal to true in-situ liquid holdup",
                    "This is NOT a detailed pressure-drop model, mechanistic multiphase correlation, or flow-regime predictor",
                    "NOT a substitute for rigorous flow assurance analysis (OLGA / PIPESIM / Ledaflow)",
                    "No flow-regime mapping — Beggs & Brill and similar mechanistic methods are NOT implemented",
                    "No terrain profile, elevation effects, or transient slug tracking — steady-state homogeneous model only",
                    "Screening velocity and ρv² limits are recommended engineering best-practice (API RP 14E / EPC FEED) — not universal hard code-compliance requirements",
                    "C-factor is a user engineering judgment input; default C = 100 is conservative for continuous solids-free service; must be verified against project/company criteria",
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
                "HOMOGENEOUS NO-SLIP SCREENING ONLY — both phases assumed to travel at the same velocity (no slip between phases)",
                "Actual volumetric flowrates are internally derived from mass flowrates and actual densities: Qg = ṁg / ρg, Ql = ṁl / ρl",
                "Phase densities must be ACTUAL values at operating P/T — not reference or standard-condition densities",
                "No-slip liquid fraction λL = Vsl / Vm — screening estimate only; NOT equal to true in-situ liquid holdup",
                "This is NOT a detailed pressure-drop model, mechanistic multiphase correlation, or flow-regime predictor",
                "NOT a substitute for rigorous multiphase flow assurance analysis (OLGA / PIPESIM / Ledaflow)",
                "No flow-regime mapping — Beggs & Brill and similar mechanistic methods are NOT implemented",
                "No terrain profile, elevation effects, or transient slug tracking — steady-state homogeneous model only",
                "Screening velocity and ρv² limits are engineering best-practice (API RP 14E / EPC FEED) — not universal hard code-compliance limits; for preliminary design / FEED screening only",
                "C-factor (default = 100) is a user engineering judgment input; must be verified against service conditions, corrosion control strategy, solids content assessment, and project/company requirements",
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
