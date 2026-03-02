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
import { ArrowLeftRight, FlaskConical, RotateCcw, ArrowDown, CheckCircle2, Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF, exportToJSON } from "@/lib/engineering/exportUtils";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";

const FLOW_UNIT_KEYS = Object.keys(FLOW_UNITS) as FlowUnitType[];

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
      const fromT_c = displayToC(parseFloat(from.temperature), unitSystem);
      const fromZ = parseFloat(from.zFactor);
      const toP_bar = displayToBar(parseFloat(to.pressure), unitSystem);
      const toT_c = displayToC(parseFloat(to.temperature), unitSystem);
      const toZ = parseFloat(to.zFactor);

      if (isNaN(v) || isNaN(fromP_bar) || isNaN(fromT_c) || isNaN(fromZ) ||
          isNaN(toP_bar) || isNaN(toT_c) || isNaN(toZ)) {
        throw new Error("Please fill in all fields with valid numbers");
      }

      const input = {
        volume: v,
        fromUnit: from.unit,
        fromP_kPa: fromP_bar * 100,
        fromT_K: fromT_c + 273.15,
        fromZ,
        toUnit: to.unit,
        toP_kPa: toP_bar * 100,
        toT_K: toT_c + 273.15,
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
  };


  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;
    return {
      calculatorName: "Gas Volume Conversion",
      inputs: [
        { label: "Input Volume", value: result.inputVolume, unit: result.inputUnit },
        { label: "From Pressure", value: from.pressure, unit: pUnit(unitSystem) },
        { label: "From Temperature", value: from.temperature, unit: tUnit(unitSystem) },
        { label: "From Z-factor", value: from.zFactor, unit: "-" },
        { label: "To Pressure", value: to.pressure, unit: pUnit(unitSystem) },
        { label: "To Temperature", value: to.temperature, unit: tUnit(unitSystem) },
        { label: "To Z-factor", value: to.zFactor, unit: "-" },
      ],
      results: [
        { label: "Output Volume", value: result.outputVolume, unit: result.outputUnit, highlight: true },
        ...result.allUnits.map(item => ({
          label: `Equivalent (${item.unit})`,
          value: item.value,
          unit: item.unit,
        })),
      ],
      calcSteps: result.steps.map(s => ({
        label: s.label,
        value: s.value,
        unit: "",
      })),
      methodology: [
        "Real gas law: PV = ZnRT",
        "V2 = V1 \u00D7 (P1/P2) \u00D7 (T2/T1) \u00D7 (Z2/Z1)",
      ],
      assumptions: [
        "Real gas law: PV = ZnRT",
        "Conversion: V2 = V1 \u00D7 (P1/P2) \u00D7 (T2/T1) \u00D7 (Z2/Z1)",
        "Normal conditions (Nm\u00B3): 0\u00B0C, 1 atm (101.325 kPa)",
        "Standard conditions (Sm\u00B3): 15\u00B0C, 1 atm (101.325 kPa) per ISO 13443",
        "US Standard (SCFM/MMSCFD): 60\u00B0F (15.56\u00B0C), 14.696 psia",
        "Z-factor must be obtained from equation of state or charts",
      ],
      references: [
        "ISO 13443: Natural Gas \u2014 Standard Reference Conditions",
        "AGA Report No. 8: Compressibility Factors of Natural Gas",
        "GPSA Engineering Data Book, 14th Edition",
        "Perry's Chemical Engineers' Handbook, 9th Edition",
      ],
      warnings: result.warnings,
    };
  };

  const handleExport = (format: "pdf" | "excel" | "json") => {
    const data = buildExportData();
    if (!data) return;
    if (format === "pdf") exportToPDF(data);
    else if (format === "excel") exportToExcel(data);
    else exportToJSON(data);
  };

  const renderSide = (
    label: string,
    side: SideForm,
    setSide: (s: SideForm) => void,
    onUnitChange: (u: FlowUnitType) => void,
    testIdPrefix: string,
    showVolume: boolean
  ) => {
    const isActual = FLOW_UNITS[side.unit].isActual;
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
                  <SelectItem key={u} value={u} data-testid={`${testIdPrefix}-unit-${u}`}>{u}</SelectItem>
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
                <SelectItem key={u} value={u} data-testid={`${testIdPrefix}-unit-${u}`}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">{FLOW_UNITS[side.unit].label}</p>
        </div>
      )}

      {isActual ? (
        <p className="text-xs text-primary/80">Enter actual operating conditions below</p>
      ) : (
        <p className="text-xs text-muted-foreground/60">Reference conditions (fixed)</p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs mb-1.5 block">Pressure ({pUnit(unitSystem)})</Label>
          <Input
            type="number"
            value={side.pressure}
            onChange={(e) => setSide({ ...side, pressure: e.target.value })}
            placeholder={isActual ? "Actual P" : undefined}
            disabled={!isActual}
            className={!isActual ? "opacity-60" : ""}
            data-testid={`${testIdPrefix}-input-pressure`}
          />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Temperature ({tUnit(unitSystem)})</Label>
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
          <Label className="text-xs mb-1.5 block">Z-factor</Label>
          <Input
            type="number"
            value={side.zFactor}
            onChange={(e) => setSide({ ...side, zFactor: e.target.value })}
            disabled={!isActual}
            className={!isActual ? "opacity-60" : ""}
            data-testid={`${testIdPrefix}-input-z`}
          />
        </div>
      </div>
    </div>
    );
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
              Convert between Nm\u00B3/h, Sm\u00B3/h, SCFM, MMSCFD, ACFM & actual volumes
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
              {renderSide("From", from, setFrom, handleFromUnitChange, "from", true)}

              <div className="flex items-center justify-center py-1">
                <ArrowDown className="w-5 h-5 text-muted-foreground" />
              </div>

              {renderSide("To", to, setTo, handleToUnitChange, "to", false)}

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
                      <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="button-export-pdf">
                        <FileText className="w-4 h-4 mr-2 text-red-400" />
                        Export as PDF
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
                  <div className="bg-primary/10 p-4 rounded-md text-center" data-testid="result-primary">
                    <p className="text-xs text-muted-foreground mb-1">
                      {result.inputVolume} {result.inputUnit} =
                    </p>
                    <p className="text-2xl font-bold font-mono tabular-nums" data-testid="text-result-value">
                      {fmtResult(result.outputVolume)}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="text-result-unit">{result.outputUnit}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                      Equivalent Values
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
                          <span className="text-muted-foreground">{item.unit}</span>
                          <span className="font-mono tabular-nums">{fmtResult(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

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
          <div className="mt-4">
            <AssumptionsPanel
            assumptions={[
            "Real gas law: PV = ZnRT",
            "Conversion: V2 = V1 \u00D7 (P1/P2) \u00D7 (T2/T1) \u00D7 (Z2/Z1)",
            "Normal conditions (Nm\u00B3): 0\u00B0C, 1 atm (101.325 kPa)",
            "Standard conditions (Sm\u00B3): 15\u00B0C, 1 atm (101.325 kPa) per ISO 13443",
            "US Standard (SCFM/MMSCFD): 60\u00B0F (15.56\u00B0C), 14.696 psia",
            "Z-factor must be obtained from equation of state or charts",
            ]}
            references={[
            "ISO 13443: Natural Gas \u2014 Standard Reference Conditions",
            "AGA Report No. 8: Compressibility Factors of Natural Gas",
            "GPSA Engineering Data Book, 14th Edition",
            "Perry's Chemical Engineers' Handbook, 9th Edition",
            ]}
            />
          </div>

          <FeedbackSection calculatorName="Gas Volume Conversion" />
        </div>
      </div>
    </div>
  );
}
