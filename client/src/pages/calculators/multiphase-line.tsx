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
    description: "C = 100 — conservative screening value for continuous solids-free service (informed by API RP 14E practice)",
  },
  "intermittent-clean": {
    label: "Intermittent – solids-free service",
    value: 125,
    description: "C = 125 — conservative screening value for intermittent solids-free service (informed by API RP 14E practice)",
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
  gasActualVolumetricFlow: string;
  liquidActualVolumetricFlow: string;
  gasDensity: string;
  liquidDensity: string;
  innerDiameter: string;
  cFactor: string;
}

const defaultForm: FormState = {
  gasActualVolumetricFlow: "",
  liquidActualVolumetricFlow: "",
  gasDensity: "",
  liquidDensity: "",
  innerDiameter: "",
  cFactor: "100",
};

// ─── Field → unit family mapping ─────────────────────────────────────────────
// Gas uses "flowActualGas": SI = m³/h, Field = ACFM  (NOT a liquid-style volumetric unit)
// Liquid uses "flowLiquid": SI = m³/h, Field = gpm
const fieldUnitMap: FieldUnitMap = {
  gasActualVolumetricFlow: "flowActualGas",
  liquidActualVolumetricFlow: "flowLiquid",
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
        gasActualVolumetricFlow: convertToSI("flowActualGas", parseFloat(form.gasActualVolumetricFlow), unitSystem),
        liquidActualVolumetricFlow: convertToSI("flowLiquid", parseFloat(form.liquidActualVolumetricFlow), unitSystem),
        gasDensity: convertToSI("density", parseFloat(form.gasDensity), unitSystem),
        liquidDensity: convertToSI("density", parseFloat(form.liquidDensity), unitSystem),
        innerDiameter: convertToSI("diameter", parseFloat(form.innerDiameter), unitSystem),
        cFactor: parseFloat(form.cFactor),
      };

      for (const [key, val] of Object.entries(raw)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }

      // Zod schema validation — field-specific errors before solver is called
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
      gasActualVolumetricFlow: String(tc.gasActualVolumetricFlow),
      liquidActualVolumetricFlow: String(tc.liquidActualVolumetricFlow),
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

  const gasFlowUnit  = getUnit("flowActualGas", unitSystem);  // m³/h (SI) or ACFM (Field)
  const liqFlowUnit  = getUnit("flowLiquid",    unitSystem);  // m³/h (SI) or gpm  (Field)
  const densityUnit  = getUnit("density",        unitSystem);
  const velocityUnit = getUnit("velocity",       unitSystem);
  const diamUnit     = getUnit("diameter",       unitSystem);

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
              Homogeneous no-slip screening — actual volumetric flow basis — API RP 14E erosional velocity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Screening Tool Only</Badge>
          <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
        </div>
      </div>

      {/* ── Screening scope disclaimer ─────────────────────────────────────── */}
      <div className="mb-5 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3" data-testid="panel-scope-disclaimer">
        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Homogeneous No-Slip Screening Model — Scope Limitations</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-snug">
          This tool computes superficial velocities, no-slip liquid fraction, mixture density, erosional velocity screening, and ρv² screening only.
          It is <strong>NOT</strong> a pressure-drop model, mechanistic flow-regime predictor, or substitute for rigorous flow assurance analysis (OLGA / PIPESIM / Ledaflow).
          For final multiphase pipeline design, slugging, terrain effects, or transient behavior — use dedicated flow assurance tools.
        </p>
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
                <Label className="text-xs mb-1.5 block">Service Type (for ρv² screening check)</Label>
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

              {/* ── Actual phase volumetric flowrates ────────────────────────── */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                  Actual Phase Volumetric Flowrates at Operating Conditions
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Actual Gas Flow ({gasFlowUnit})
                    </Label>
                    <Input
                      type="number"
                      value={form.gasActualVolumetricFlow}
                      onChange={(e) => updateField("gasActualVolumetricFlow", e.target.value)}
                      placeholder={unitSystem === "SI" ? "e.g. 5000" : "e.g. 2943"}
                      data-testid="input-gas-actual-flow"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Actual gas at line P/T{unitSystem === "Field" ? " (ACFM = actual cubic feet/min)" : ""}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Actual Liquid Flow ({liqFlowUnit})
                    </Label>
                    <Input
                      type="number"
                      value={form.liquidActualVolumetricFlow}
                      onChange={(e) => updateField("liquidActualVolumetricFlow", e.target.value)}
                      placeholder={unitSystem === "SI" ? "e.g. 50" : "e.g. 220"}
                      data-testid="input-liquid-actual-flow"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Actual liquid at line P/T
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Enter <strong>actual volumetric flowrates at operating pressure and temperature</strong> — not standard or reference conditions.
                  For gas: convert from Sm³/h using Z-factor ratio (Qactual = Qstd × Z_actual / Z_std × (P_std / P) × (T / T_std)),
                  or use PVT report / process simulation output.
                  Enter 0 for a single-phase line.
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
                      placeholder={unitSystem === "SI" ? "e.g. 25" : "e.g. 1.56"}
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
                      placeholder={unitSystem === "SI" ? "e.g. 800" : "e.g. 49.9"}
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
                    Erosional Velocity C-Factor (API RP 14E Screening)
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
                    <p className="font-medium">C-Factor Selection Guidance (Engineering Best Practice)</p>
                    <ul className="space-y-1 list-none">
                      <li><span className="font-mono font-semibold">C = 100</span> — Conservative screening default for <strong>continuous solids-free</strong> service</li>
                      <li><span className="font-mono font-semibold">C = 125</span> — Conservative screening default for <strong>intermittent solids-free</strong> service</li>
                      <li><span className="font-mono font-semibold">C = 150–200</span> — May be considered where corrosion is controlled by chemical inhibition or CRA materials; requires project/company approval</li>
                      <li><span className="font-mono font-semibold">C up to 250 (intermittent)</span> — Only in explicitly controlled clean service with documented project/company acceptance</li>
                      <li><span className="font-mono text-destructive font-semibold">Solids-bearing service:</span> Reduce C-factor and follow project/company-specific criteria; no universal default applies</li>
                    </ul>
                    <p className="text-muted-foreground">
                      C-factor selection is an engineering judgment input. These values are informed by API RP 14E and EPC/process design practice — they are recommended screening defaults, not universal code-compliance requirements. Final selection must be verified against service conditions, corrosion control strategy, solids content assessment, and project/company requirements.
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
                    label: "Actual Gas Flow (Qg)",
                    value: convertFromSI("flowActualGas", result.actualGasVolumetricFlow, unitSystem),
                    unit: gasFlowUnit,
                  },
                  {
                    label: "Actual Liquid Flow (Ql)",
                    value: convertFromSI("flowLiquid", result.actualLiquidVolumetricFlow, unitSystem),
                    unit: liqFlowUnit,
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
                    label: "Erosional Velocity (Ve = C/√ρm)",
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
                    label: "Mixture Density ρm (homogeneous no-slip)",
                    value: result.mixtureDensity,
                    unit: "kg/m³",
                  },
                  {
                    label: "No-slip Liquid Fraction (λL)",
                    value: result.noSlipLiquidFraction,
                    unit: "—",
                  },
                  {
                    label: "ρv² (momentum flux)",
                    value: result.rhoV2,
                    unit: "Pa",
                  },
                ]}
                rawData={result}
                exportData={{
                  calculatorName: "Multiphase Line Screening",
                  inputs: [
                    { label: "Actual Gas Flow at Operating P/T", value: form.gasActualVolumetricFlow, unit: gasFlowUnit },
                    { label: "Actual Liquid Flow at Operating P/T", value: form.liquidActualVolumetricFlow, unit: liqFlowUnit },
                    { label: "Gas Density at Operating P/T", value: form.gasDensity, unit: densityUnit },
                    { label: "Liquid Density at Operating P/T", value: form.liquidDensity, unit: densityUnit },
                    { label: "Inner Diameter", value: form.innerDiameter, unit: diamUnit },
                    { label: "C-Factor (erosional velocity screening)", value: form.cFactor },
                    ...(selectedService ? [{ label: "Service Type", value: selectedService }] : []),
                  ],
                  results: [
                    { label: "Actual Gas Flow (Qg)", value: convertFromSI("flowActualGas", result.actualGasVolumetricFlow, unitSystem), unit: gasFlowUnit },
                    { label: "Actual Liquid Flow (Ql)", value: convertFromSI("flowLiquid", result.actualLiquidVolumetricFlow, unitSystem), unit: liqFlowUnit },
                    { label: "Superficial Gas Velocity (Vsg)", value: convertFromSI("velocity", result.superficialGasVelocity, unitSystem), unit: velocityUnit },
                    { label: "Superficial Liquid Velocity (Vsl)", value: convertFromSI("velocity", result.superficialLiquidVelocity, unitSystem), unit: velocityUnit },
                    { label: "Mixture Velocity (Vm)", value: convertFromSI("velocity", result.mixtureVelocity, unitSystem), unit: velocityUnit, highlight: true },
                    { label: "Erosional Velocity (Ve = C/√ρm)", value: convertFromSI("velocity", result.erosionalVelocity, unitSystem), unit: velocityUnit, highlight: true },
                    { label: "Vm / Ve Ratio", value: result.velocityRatio, unit: "—" },
                    { label: "Mixture Density ρm (homogeneous no-slip)", value: result.mixtureDensity, unit: "kg/m³" },
                    { label: "No-slip Liquid Fraction (λL)", value: result.noSlipLiquidFraction, unit: "—" },
                    { label: "ρv² (momentum flux)", value: result.rhoV2, unit: "Pa" },
                  ],
                  methodology: [
                    "HOMOGENEOUS NO-SLIP SCREENING MODEL — velocity and density screening only",
                    "NOT a pressure-drop model. NOT a mechanistic flow-regime predictor. NOT a substitute for rigorous flow assurance analysis (OLGA / PIPESIM / Ledaflow).",
                    "Gas flow basis: actual gas volumetric flow at operating P/T conditions (user input — NOT standard/reference flow)",
                    "Liquid flow basis: actual liquid volumetric flow at operating P/T conditions (user input)",
                    "Step 1 — Convert actual volumetric flows from input units to m³/s:",
                    "  Qg [m³/s] = gasActualVolumetricFlow [m³/h] / 3600",
                    "  Ql [m³/s] = liquidActualVolumetricFlow [m³/h] / 3600",
                    "Step 2 — Pipe cross-section: A = π × (D/2)² [m²]",
                    "Step 3 — Superficial velocities: Vsg = Qg / A, Vsl = Ql / A  [m/s]",
                    "Step 4 — Mixture velocity: Vm = Vsg + Vsl  [m/s]",
                    "Step 5 — No-slip liquid fraction: λL = Vsl / Vm  (screening estimate — NOT true in-situ holdup)",
                    "Step 6 — Homogeneous mixture density: ρm = ρL·λL + ρG·(1 − λL)  [kg/m³]",
                    "Step 7 — Erosional velocity (screening): Ve = C / √ρm  [m/s]  (C-factor per engineering judgment)",
                    "Step 8 — Momentum flux: ρv² = ρm · Vm²  [Pa]",
                    "Erosional velocity and ρv² screening limits are recommended engineering best-practice informed by API RP 14E and EPC FEED practice — not universal hard code-compliance limits; suitable for preliminary design / FEED screening only.",
                    "C-factor selection is an engineering judgment input. Verify against service conditions, corrosion control strategy, solids content, and project/company criteria.",
                    "No flow-regime identification — Beggs & Brill, TPFL, and similar mechanistic methods are NOT implemented.",
                    "No pressure-drop calculation — no Moody friction factor, no elevation effects, no acceleration losses.",
                    "Screening limit check (if selected) covers ρv² only — it is not a full mixed-phase design verification.",
                  ],
                  assumptions: [
                    "HOMOGENEOUS NO-SLIP SCREENING ONLY — both phases assumed to travel at the same velocity (no slip between phases)",
                    "Gas flow basis = actual gas volumetric flow at line conditions — NOT standard/reference flow. User must supply correct actual flow.",
                    "Liquid flow basis = actual liquid volumetric flow at line conditions. User must supply correct actual flow.",
                    "Phase densities must be ACTUAL values at operating P/T — not reference or standard-condition densities",
                    "No-slip liquid fraction λL = Vsl / Vm — a screening estimate ONLY; NOT equal to true in-situ liquid holdup (actual holdup is higher in stratified/slug flow)",
                    "This is NOT a detailed pressure-drop model, mechanistic multiphase correlation, or flow-regime predictor",
                    "NOT a substitute for rigorous multiphase flow assurance analysis (OLGA / PIPESIM / Ledaflow / similar)",
                    "No flow-regime mapping — Beggs & Brill and similar mechanistic methods are NOT implemented",
                    "No terrain profile, elevation effects, slugging transients, or pipeline inventory — steady-state homogeneous model only",
                    "Erosional velocity and ρv² screening limits are recommended engineering best-practice (informed by API RP 14E and EPC FEED practice) — not universal hard code-compliance requirements",
                    "C-factor (default = 100) is an engineering judgment input; must be verified against service conditions, corrosion control strategy, solids content assessment, and project/company requirements",
                    "Service ρv² limit check (if selected) covers ρv² screening only — it is not a full mixed-phase design verification",
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
                "HOMOGENEOUS NO-SLIP SCREENING ONLY — both phases assumed to travel at the same velocity; no slip between phases",
                "Gas flow basis = actual gas volumetric flow at line conditions (m³/h or ACFM) — NOT standard or reference-condition flow",
                "Liquid flow basis = actual liquid volumetric flow at line conditions (m³/h or gpm) — NOT mass flow",
                "Phase densities must be ACTUAL values at operating P/T — not reference or standard-condition densities",
                "No-slip liquid fraction λL = Vsl / Vm — screening estimate ONLY; NOT equal to true in-situ liquid holdup",
                "NOT a pressure-drop model — no friction, elevation, or acceleration losses are calculated",
                "NOT a flow-regime predictor — Beggs & Brill and similar mechanistic methods are NOT implemented",
                "NOT a substitute for rigorous multiphase flow assurance analysis (OLGA / PIPESIM / Ledaflow)",
                "No terrain profile, elevation effects, slugging transients, or pipeline inventory modeled — steady-state only",
                "Erosional velocity and ρv² limits are engineering best-practice informed by API RP 14E and EPC FEED practice — not universal hard code-compliance requirements",
                "C-factor is a user engineering judgment input — must be verified against service conditions, corrosion control strategy, solids content, and project/company requirements",
                "Service ρv² limit check (if selected) covers ρv² screening only — not a full mixed-phase design verification",
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
