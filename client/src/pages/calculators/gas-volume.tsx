import { useState, useCallback } from "react";
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
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import {
  calculateGasVolume,
  FLOW_UNITS,
  GAS_VOLUME_TEST_CASE,
  type FlowUnitType,
  type GasVolumeResult,
} from "@/lib/engineering/gasVolume";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import {
  ArrowLeftRight,
  FlaskConical,
  RotateCcw,
  ArrowDown,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { EosGasPropsPanel } from "@/components/EosGasPropsPanel";
import {
  resolveGasProps,
  DEFAULT_MANUAL_GAS_PROPS,
  DEFAULT_EOS_COMPOSITION,
  type GasPropsMode,
  type ManualGasProps,
} from "@/lib/engineering/eosGasProps";
import type { CompositionEntry } from "@/lib/engineering/srkEos";

const FLOW_UNIT_KEYS = Object.keys(FLOW_UNITS) as FlowUnitType[];

// ---------------------------------------------------------------------------
// Unit-system display helpers
// ---------------------------------------------------------------------------

function barToDisplay(bar: number, system: UnitSystem): number {
  return system === "Field" ? bar / 0.0689476 : bar;
}
function displayToBar(val: number, system: UnitSystem): number {
  return system === "Field" ? val * 0.0689476 : val;
}
function cToDisplay(c: number, system: UnitSystem): number {
  return system === "Field" ? c * 9 / 5 + 32 : c;
}
function displayToC(val: number, system: UnitSystem): number {
  return system === "Field" ? (val - 32) * 5 / 9 : val;
}
function pUnit(system: UnitSystem): string {
  return system === "Field" ? "psia" : "bar(a)";
}
function tUnit(system: UnitSystem): string {
  return system === "Field" ? "\u00B0F" : "\u00B0C";
}

function getDefaultPT(unit: FlowUnitType, system: UnitSystem): { p: string; t: string } {
  const def = FLOW_UNITS[unit];
  const p_bar = def.refP_kPa / 100;
  const t_c = def.refT_K - 273.15;
  return {
    p: barToDisplay(p_bar, system).toFixed(system === "Field" ? 3 : 5),
    t: cToDisplay(t_c, system).toFixed(2),
  };
}

interface SideForm {
  unit: FlowUnitType;
  pressure: string;
  temperature: string;
  zFactor: string;
}

function fmtResult(n: number): string {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) {
    return n.toExponential(4);
  }
  if (Math.abs(n) >= 1000) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

// ---------------------------------------------------------------------------
// Assumptions — positioned as screening utility
// ---------------------------------------------------------------------------

const ASSUMPTIONS = [
  "GAS VOLUME CONVERSION UTILITY: Converts between standard/normal/actual volumetric flow rate units for ideal and real gases.",
  "",
  "Conversion basis: V2 = V1 \u00D7 (P1/P2) \u00D7 (T2/T1) \u00D7 (Z2/Z1)  [Real gas law: PV = ZnRT]",
  "",
  "Z-FACTOR MODES:",
  "  Manual: User supplies Z directly (unchanged from original screening mode).",
  "  Peng-Robinson (PR): Z computed internally via PR EoS (1976/1978, Chueh-Prausnitz BIPs) from user-defined mole composition.",
  "  SRK: Z computed via Soave-Redlich-Kwong EoS (1972, Graboski-Daubert α) from user-defined mole composition.",
  "  For fixed-reference units (Nm\u00B3, Sm\u00B3, SCFM, MMSCFD), Z is always 1.0 by definition at reference conditions.",
  "  For actual-condition units (Am\u00B3, ACFM), EOS evaluates Z at the user-supplied P and T of each side independently.",
  "",
  "EOS COVERAGE: 20 oil & gas species (C1–C7, N2, CO2, H2S, H2O, He, Ar, H2). BIPs: Chueh-Prausnitz (1967). Viscosity: Lee-Gonzalez-Eakin (1966). Not applicable for liquid or two-phase flow.",
  "",
  "REFERENCE CONDITIONS (fixed — unit-dependent):",
  "  Normal basis (Nm\u00B3)  : 0\u00B0C and 101.325 kPa abs (ISO 13443)",
  "  Standard basis (Sm\u00B3) : 15\u00B0C and 101.325 kPa abs (ISO 13443)",
  "  US standard (SCFM / MMSCFD) : 60\u00B0F (15.56\u00B0C) and 14.696 psia",
  "",
  "ACTUAL-CONDITION UNITS (Am\u00B3/h, Am\u00B3/s, ACFM):",
  "  These are NOT fixed-reference units. They represent volume at the actual operating pressure, temperature, and Z-factor.",
  "  Equivalent values for actual-condition units are only valid at the specified target conditions.",
  "",
  "Pressures are always absolute. Gauge pressures must be converted before entry.",
  "For final design, validate with a full EOS/process simulator (HYSYS, ProMax, REFPROP). AGA-8 is preferred for pipeline metering.",
];

const REFERENCES = [
  "ISO 13443: Natural Gas \u2014 Standard Reference Conditions",
  "AGA Report No. 8: Compressibility Factors of Natural Gas and Related Hydrocarbon Gases",
  "GPSA Engineering Data Book, 14th Edition",
  "Perry's Chemical Engineers' Handbook, 9th Edition",
  "GPA 2172: Calculation of Gross Heating Value, Relative Density, Compressibility and Theoretical Hydrocarbon Liquid Content for Natural Gas Mixtures",
  "Peng & Robinson (1976): Ind. Eng. Chem. Fundam. 15(1), 59\u201364",
  "Soave (1972): Chem. Eng. Sci. 27(6), 1197\u20131203",
  "Chueh & Prausnitz (1967): AIChE J. 13(6) \u2014 binary interaction parameters",
  "Lee, Gonzalez & Eakin (1966): SPE-1340-PA \u2014 gas viscosity correlation",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GasVolumePage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [volume, setVolume] = useState("");
  const [from, setFrom] = useState<SideForm>({
    unit: "MMSCFD",
    pressure: "1.01325",
    temperature: "15.56",
    zFactor: "1.0",
  });
  const [to, setTo] = useState<SideForm>({
    unit: "Sm3/h",
    pressure: "1.01325",
    temperature: "15.00",
    zFactor: "1.0",
  });
  const [result, setResult] = useState<GasVolumeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // EOS gas properties state — shared composition evaluated at each side's P/T
  const [gasPropsMode, setGasPropsMode] = useState<GasPropsMode>("manual");
  const [composition, setComposition] = useState<CompositionEntry[]>(DEFAULT_EOS_COMPOSITION);
  const [eosManual, setEosManual] = useState<ManualGasProps>(DEFAULT_MANUAL_GAS_PROPS);
  // Last computed Z values — displayed in the UI after calculation
  const [computedZFrom, setComputedZFrom] = useState<number | null>(null);
  const [computedZTo, setComputedZTo] = useState<number | null>(null);

  const handleUnitToggle = useCallback((newSystem: UnitSystem) => {
    setFrom(prev => {
      const p_bar = displayToBar(parseFloat(prev.pressure) || 0, unitSystem);
      const t_c = displayToC(parseFloat(prev.temperature) || 0, unitSystem);
      return {
        ...prev,
        pressure: barToDisplay(p_bar, newSystem).toFixed(newSystem === "Field" ? 3 : 5),
        temperature: cToDisplay(t_c, newSystem).toFixed(2),
      };
    });
    setTo(prev => {
      const p_bar = displayToBar(parseFloat(prev.pressure) || 0, unitSystem);
      const t_c = displayToC(parseFloat(prev.temperature) || 0, unitSystem);
      return {
        ...prev,
        pressure: barToDisplay(p_bar, newSystem).toFixed(newSystem === "Field" ? 3 : 5),
        temperature: cToDisplay(t_c, newSystem).toFixed(2),
      };
    });
    setUnitSystem(newSystem);
  }, [unitSystem]);

  const handleFromUnitChange = (unit: FlowUnitType) => {
    const def = FLOW_UNITS[unit];
    if (def.isActual) {
      setFrom(prev => ({ ...prev, unit }));
    } else {
      const defaults = getDefaultPT(unit, unitSystem);
      setFrom({ unit, pressure: defaults.p, temperature: defaults.t, zFactor: "1.0" });
    }
  };

  const handleToUnitChange = (unit: FlowUnitType) => {
    const def = FLOW_UNITS[unit];
    if (def.isActual) {
      setTo(prev => ({ ...prev, unit }));
    } else {
      const defaults = getDefaultPT(unit, unitSystem);
      setTo({ unit, pressure: defaults.p, temperature: defaults.t, zFactor: "1.0" });
    }
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const v = parseFloat(volume);
      const fromP_bar = displayToBar(parseFloat(from.pressure), unitSystem);
      const fromT_c   = displayToC(parseFloat(from.temperature), unitSystem);
      const toP_bar   = displayToBar(parseFloat(to.pressure), unitSystem);
      const toT_c     = displayToC(parseFloat(to.temperature), unitSystem);

      if (isNaN(v) || isNaN(fromP_bar) || isNaN(fromT_c) || isNaN(toP_bar) || isNaN(toT_c)) {
        throw new Error("Please fill in all fields with valid numbers");
      }

      let fromZ: number;
      let toZ: number;

      if (gasPropsMode !== "manual") {
        // EOS mode: compute Z from composition at each side's specific P/T conditions
        const fromProps = resolveGasProps(gasPropsMode, eosManual, composition, fromT_c, fromP_bar);
        const toProps   = resolveGasProps(gasPropsMode, eosManual, composition, toT_c,   toP_bar);
        // For fixed-reference units, Z=1.0 by definition; EOS Z is only meaningful for actual-condition units
        fromZ = FLOW_UNITS[from.unit].isActual ? fromProps.Z : 1.0;
        toZ   = FLOW_UNITS[to.unit].isActual   ? toProps.Z   : 1.0;
        setComputedZFrom(fromProps.Z);
        setComputedZTo(toProps.Z);
        // Write computed values back into the form so export / display shows them
        setFrom(prev => ({ ...prev, zFactor: fromZ.toFixed(5) }));
        setTo(prev => ({ ...prev, zFactor: toZ.toFixed(5) }));
      } else {
        fromZ = parseFloat(from.zFactor);
        toZ   = parseFloat(to.zFactor);
        if (isNaN(fromZ) || isNaN(toZ)) throw new Error("Please fill in all Z-factor fields with valid numbers");
        setComputedZFrom(null);
        setComputedZTo(null);
      }

      const input = {
        volume: v,
        fromUnit: from.unit,
        fromP_kPa: fromP_bar * 100,
        fromT_K:   fromT_c + 273.15,
        fromZ,
        toUnit: to.unit,
        toP_kPa: toP_bar * 100,
        toT_K:   toT_c + 273.15,
        toZ,
      };

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
    setVolume(String(tc.volume));
    setFrom({
      unit: tc.fromUnit,
      pressure: String(tc.fromP_bar),
      temperature: String(tc.fromT_C),
      zFactor: String(tc.fromZ),
    });
    setTo({
      unit: tc.toUnit,
      pressure: String(tc.toP_bar),
      temperature: String(tc.toT_C),
      zFactor: String(tc.toZ),
    });
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setVolume("");
    setFrom({ unit: "MMSCFD", pressure: "1.01325", temperature: "15.56", zFactor: "1.0" });
    setTo({ unit: "Sm3/h", pressure: "1.01325", temperature: "15.00", zFactor: "1.0" });
    setResult(null);
    setError(null);
    setUnitSystem("SI");
    setGasPropsMode("manual");
    setComposition(DEFAULT_EOS_COMPOSITION);
    setEosManual(DEFAULT_MANUAL_GAS_PROPS);
    setComputedZFrom(null);
    setComputedZTo(null);
  };

  // ---------------------------------------------------------------------------
  // Export — disciplined: basis and condition-dependency clearly stated
  // ---------------------------------------------------------------------------

  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;

    const fromDef = FLOW_UNITS[result.inputUnit];
    const toDef   = FLOW_UNITS[result.outputUnit];

    const fromBasisNote = fromDef.isActual
      ? `Actual-condition unit — conditions: ${from.pressure} ${pUnit(unitSystem)} abs, ${from.temperature} ${tUnit(unitSystem)}, Z=${from.zFactor}`
      : `Fixed-reference unit — ${fromDef.label}`;
    const toBasisNote = toDef.isActual
      ? `Actual-condition unit — conditions: ${to.pressure} ${pUnit(unitSystem)} abs, ${to.temperature} ${tUnit(unitSystem)}, Z=${to.zFactor}`
      : `Fixed-reference unit — ${toDef.label}`;

    return {
      calculatorName: "Gas Volume Conversion \u2014 Screening Utility",
      inputs: [
        { label: "Input Volume", value: result.inputVolume, unit: result.inputUnit },
        { label: "Source Unit Basis", value: fromBasisNote, unit: "" },
        { label: "Source Pressure (absolute)", value: from.pressure, unit: pUnit(unitSystem) },
        { label: "Source Temperature", value: from.temperature, unit: tUnit(unitSystem) },
        { label: "Source Z-factor (user-supplied)", value: from.zFactor, unit: "\u2014 not internally calculated" },
        { label: "Target Unit Basis", value: toBasisNote, unit: "" },
        { label: "Target Pressure (absolute)", value: to.pressure, unit: pUnit(unitSystem) },
        { label: "Target Temperature", value: to.temperature, unit: tUnit(unitSystem) },
        { label: "Target Z-factor (user-supplied)", value: to.zFactor, unit: "\u2014 not internally calculated" },
      ],
      results: [
        { label: "Primary Output", value: result.outputVolume, unit: result.outputUnit, highlight: true },
        ...result.allUnits
          .filter(item => item.unit !== result.outputUnit)
          .map(item => ({
            label: item.isFixedReference
              ? `Equivalent (${item.unit}) \u2014 fixed reference`
              : `Equivalent (${item.unit}) \u2014 at target conditions only`,
            value: item.value,
            unit: item.unit,
          })),
      ],
      calcSteps: result.steps.map(s => ({ label: s.label, value: s.value, unit: "" })),
      methodology: [
        "Gas Volume Conversion Screening Utility \u2014 preliminary engineering use only",
        "Real gas law: PV = ZnRT",
        "Conversion equation: V2 = V1 \u00D7 (P1/P2) \u00D7 (T2/T1) \u00D7 (Z2/Z1)",
        "Z-factor is USER-SUPPLIED and not internally calculated or validated by this tool",
        "Actual-unit outputs are valid ONLY at the specified target pressure, temperature, and Z",
      ],
      assumptions: ASSUMPTIONS.filter(a => a !== ""),
      references: REFERENCES,
      warnings: result.warnings,
    };
  };

  const handleExport = (format: "pdf" | "excel" | "json") => {
    const data = buildExportData();
    if (!data) return;
    if (format === "pdf") exportToCalcNote(data);
    else if (format === "excel") exportToExcel(data);
    else exportToJSON(data);
  };

  // ---------------------------------------------------------------------------
  // Form side renderer
  // ---------------------------------------------------------------------------

  const renderSide = (
    label: string,
    side: SideForm,
    setSide: (s: SideForm) => void,
    onUnitChange: (u: FlowUnitType) => void,
    testIdPrefix: string,
    showVolume: boolean,
    computedZ: number | null
  ) => {
    const isActual = FLOW_UNITS[side.unit].isActual;
    const isEosMode = gasPropsMode !== "manual";
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>

        {showVolume && (
          <div>
            <Label className="text-xs mb-1.5 block">Gas Volume (V1)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="e.g. 1"
                className="flex-1"
                data-testid="input-volume"
              />
              <Select value={side.unit} onValueChange={onUnitChange}>
                <SelectTrigger className="w-[160px]" data-testid={`${testIdPrefix}-select-unit`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLOW_UNIT_KEYS.map(u => (
                    <SelectItem key={u} value={u} data-testid={`${testIdPrefix}-unit-${u}`}>
                      <span>{u}</span>
                      {FLOW_UNITS[u].isActual && (
                        <span className="ml-1 text-[10px] text-amber-500 font-medium">[actual]</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{FLOW_UNITS[side.unit].label}</p>
          </div>
        )}

        {!showVolume && (
          <div>
            <Label className="text-xs mb-1.5 block">Output Unit</Label>
            <Select value={side.unit} onValueChange={onUnitChange}>
              <SelectTrigger data-testid={`${testIdPrefix}-select-unit`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLOW_UNIT_KEYS.map(u => (
                  <SelectItem key={u} value={u} data-testid={`${testIdPrefix}-unit-${u}`}>
                    <span>{u}</span>
                    {FLOW_UNITS[u].isActual && (
                      <span className="ml-1 text-[10px] text-amber-500 font-medium">[actual]</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{FLOW_UNITS[side.unit].label}</p>
          </div>
        )}

        {isActual ? (
          <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Actual-condition unit — result is valid ONLY at the P, T, and Z at these conditions.
              {isEosMode
                ? " Z is computed by the selected EOS from the composition below."
                : " Z is user-supplied; this tool does not calculate Z."}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Info className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <p className="text-xs text-muted-foreground/60">
              Fixed-reference unit — P and T are locked to the unit definition (Z&nbsp;=&nbsp;1.0 by definition)
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs mb-1.5 block">
              Pressure ({pUnit(unitSystem)}) abs
            </Label>
            <Input
              type="number"
              value={side.pressure}
              onChange={(e) => setSide({ ...side, pressure: e.target.value })}
              placeholder={isActual ? "Actual P abs" : undefined}
              disabled={!isActual}
              className={!isActual ? "opacity-60" : ""}
              data-testid={`${testIdPrefix}-input-pressure`}
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">
              Temperature ({tUnit(unitSystem)})
            </Label>
            <Input
              type="number"
              value={side.temperature}
              onChange={(e) => setSide({ ...side, temperature: e.target.value })}
              placeholder={isActual ? "Actual T" : undefined}
              disabled={!isActual}
              className={!isActual ? "opacity-60" : ""}
              data-testid={`${testIdPrefix}-input-temperature`}
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">
              Z-factor{" "}
              <span className="text-muted-foreground font-normal">
                {isEosMode && isActual ? (
                  <span className="text-green-400 font-medium">(EOS computed)</span>
                ) : isEosMode ? (
                  <span className="text-muted-foreground/60">(= 1.0, reference)</span>
                ) : (
                  "(user-supplied)"
                )}
              </span>
            </Label>
            {isEosMode && isActual && computedZ !== null ? (
              <div
                className="flex items-center gap-2 h-9 px-3 rounded-md border border-green-500/40 bg-green-950/20 text-sm font-mono"
                data-testid={`${testIdPrefix}-input-z`}
              >
                <Zap className="w-3 h-3 text-green-400 shrink-0" />
                <span className="text-green-300">{computedZ.toFixed(5)}</span>
                <span className="text-muted-foreground/50 text-[10px] ml-1">EOS</span>
              </div>
            ) : isEosMode && isActual ? (
              <div
                className="flex items-center gap-2 h-9 px-3 rounded-md border border-border/50 bg-muted/20 text-sm text-muted-foreground/60"
                data-testid={`${testIdPrefix}-input-z`}
              >
                <span>Calculate to compute Z</span>
              </div>
            ) : (
              <Input
                type="number"
                value={side.zFactor}
                onChange={(e) => setSide({ ...side, zFactor: e.target.value })}
                disabled={!isActual}
                className={!isActual ? "opacity-60" : ""}
                data-testid={`${testIdPrefix}-input-z`}
              />
            )}
          </div>
        </div>

        {isActual && !isEosMode && (
          <p className="text-[11px] text-muted-foreground/70">
            For high-pressure or rich gas, obtain Z from EOS — switch to PR or SRK mode above to compute it automatically.
          </p>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
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
              Screening utility \u2014 Nm\u00B3/h, Sm\u00B3/h, SCFM, MMSCFD, ACFM & actual volumes
            </p>
          </div>
        </div>
        <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
      </div>

      {/* Screening utility notice */}
      <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-md px-4 py-3 mb-5 text-sm">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Gas volume conversion utility.</span>{" "}
          Converts between Nm³/h, Sm³/h, SCFM, MMSCFD, and actual-condition units.
          Use <span className="font-medium text-foreground">Manual</span> mode to supply Z directly,
          or switch to <span className="font-medium text-amber-400">Peng-Robinson</span> / <span className="font-medium text-amber-400">SRK</span> mode
          to compute Z automatically from gas composition. For final design, validate with a process simulator.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        {/* Left — Input form */}
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Convert Gas Volume</h3>
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
              {/* EOS Gas Properties Panel */}
              <div className="border border-border/50 rounded-md p-3 bg-muted/10 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Z-Factor Method
                </p>
                <EosGasPropsPanel
                  mode={gasPropsMode}
                  onModeChange={m => { setGasPropsMode(m); setComputedZFrom(null); setComputedZTo(null); }}
                  composition={composition}
                  onCompositionChange={setComposition}
                  manual={eosManual}
                  onManualChange={(field, value) => setEosManual(prev => ({ ...prev, [field]: value }))}
                  showViscosity={false}
                  testIdPrefix="gvol"
                />
                {gasPropsMode !== "manual" && (
                  <p className="text-[11px] text-green-400/80 flex items-start gap-1">
                    <Zap className="w-3 h-3 shrink-0 mt-0.5" />
                    Z is computed at each side's actual P/T from the composition above. Fixed-reference units always use Z&nbsp;=&nbsp;1.0.
                  </p>
                )}
              </div>

              <div className="border-t border-border/30 pt-4" />

              {renderSide("From", from, setFrom, handleFromUnitChange, "from", true, computedZFrom)}

              <div className="flex items-center justify-center py-1">
                <ArrowDown className="w-5 h-5 text-muted-foreground" />
              </div>

              {renderSide("To", to, setTo, handleToUnitChange, "to", false, computedZTo)}

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

        {/* Right — Results */}
        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <WarningPanel warnings={result.warnings} />

              <Card data-testid="results-panel">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-base">Conversion Result</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" data-testid="button-export-results">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="button-export-calc-note">
                        <FileText className="w-4 h-4 mr-2 text-red-400" />
                        Calc Note (Print / PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("excel")} data-testid="button-export-excel">
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />
                        Export as Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("json")} data-testid="button-export-json">
                        <Download className="w-4 h-4 mr-2 text-blue-400" />
                        Export as JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Primary result */}
                  <div className="bg-primary/10 p-4 rounded-md text-center" data-testid="result-primary">
                    <p className="text-xs text-muted-foreground mb-1">
                      {result.inputVolume} {result.inputUnit} =
                    </p>
                    <p className="text-2xl font-bold font-mono tabular-nums" data-testid="text-result-value">
                      {fmtResult(result.outputVolume)}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="text-result-unit">
                      {result.outputUnit}
                    </p>
                    {FLOW_UNITS[result.outputUnit].isActual && (
                      <p className="text-[11px] text-amber-500 mt-1">
                        Valid at target conditions only (P={to.pressure} {pUnit(unitSystem)} abs,
                        T={to.temperature} {tUnit(unitSystem)}, Z={to.zFactor})
                      </p>
                    )}
                  </div>

                  {/* Equivalent values table */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                      Equivalent Values
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mb-2">
                      Fixed-reference units at their defined reference conditions.
                      Actual-condition units shown only when explicitly selected as output.
                    </p>
                    <div className="grid gap-1">
                      {result.allUnits.map((item, i) => (
                        <div
                          key={item.unit}
                          className={`flex items-center justify-between py-1.5 px-3 rounded-md text-sm ${
                            item.unit === result.outputUnit
                              ? "bg-primary/10 font-medium"
                              : i % 2 === 0 ? "bg-muted/50" : ""
                          }`}
                          data-testid={`result-equiv-${item.unit}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">{item.unit}</span>
                            {!item.isFixedReference && item.conditionNote && (
                              <span className="text-[10px] text-amber-500">
                                {item.conditionNote}
                              </span>
                            )}
                          </div>
                          <span className="font-mono tabular-nums">{fmtResult(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Solution steps */}
              <Card data-testid="solution-panel">
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-sm">Solution Steps</h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-1">
                    {result.steps.map((step, i) => (
                      <div
                        key={i}
                        className={`py-1.5 px-3 rounded-md text-sm ${
                          step.label === "Gas Law" || step.label === "Result"
                            ? "bg-primary/10 font-medium"
                            : i % 2 === 0 ? "bg-muted/50" : ""
                        }`}
                        data-testid={`step-${i}`}
                      >
                        {step.label === "Gas Law" || step.label === "Result" ? (
                          <span>{step.value}</span>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground shrink-0">{step.label}</span>
                            <span className="font-mono tabular-nums text-right break-all">{step.value}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!result && (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select units, enter conditions, and convert
                </p>
              </CardContent>
            </Card>
          )}

          {/* Assumptions & References */}
          <div className="mt-4">
            <AssumptionsPanel
              assumptions={ASSUMPTIONS.filter(a => a.trim() !== "")}
              references={REFERENCES}
            />
          </div>

          <FeedbackSection calculatorName="Gas Volume Conversion" />
        </div>
      </div>
    </div>
  );
}
