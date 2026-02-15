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
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import {
  calculatePumpSizing,
  PUMP_SIZING_TEST_CASE,
  type PumpSizingResult,
} from "@/lib/engineering/pumpSizing";
import { COMMON_LIQUIDS, FITTING_K_VALUES } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { Droplets, FlaskConical, RotateCcw, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FormState {
  flowRate: string;
  liquidDensity: string;
  viscosity: string;
  suctionStaticHead: string;
  dischargeStaticHead: string;
  suctionPipeLength: string;
  dischargePipeLength: string;
  suctionPipeDiameter: string;
  dischargePipeDiameter: string;
  suctionRoughness: string;
  dischargeRoughness: string;
  suctionFittingsK: string;
  dischargeFittingsK: string;
  pumpEfficiency: string;
  motorEfficiency: string;
  vaporPressure: string;
  atmosphericPressure: string;
  suctionVesselPressure: string;
}

const defaultForm: FormState = {
  flowRate: "",
  liquidDensity: "",
  viscosity: "",
  suctionStaticHead: "",
  dischargeStaticHead: "",
  suctionPipeLength: "",
  dischargePipeLength: "",
  suctionPipeDiameter: "",
  dischargePipeDiameter: "",
  suctionRoughness: "0.0457",
  dischargeRoughness: "0.0457",
  suctionFittingsK: "0",
  dischargeFittingsK: "0",
  pumpEfficiency: "75",
  motorEfficiency: "95",
  vaporPressure: "",
  atmosphericPressure: "1.01325",
  suctionVesselPressure: "0",
};

const fieldUnitMap: FieldUnitMap = {
  flowRate: "flowLiquid",
  liquidDensity: null,
  viscosity: null,
  suctionStaticHead: "head",
  dischargeStaticHead: "head",
  suctionPipeLength: "length",
  dischargePipeLength: "length",
  suctionPipeDiameter: "diameter",
  dischargePipeDiameter: "diameter",
  suctionRoughness: null,
  dischargeRoughness: null,
  suctionFittingsK: null,
  dischargeFittingsK: null,
  pumpEfficiency: null,
  motorEfficiency: null,
  vaporPressure: null,
  atmosphericPressure: null,
  suctionVesselPressure: null,
};

interface FittingEntry {
  name: string;
  count: number;
}

export default function PumpSizingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<PumpSizingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suctionFittings, setSuctionFittings] = useState<FittingEntry[]>([]);
  const [dischargeFittings, setDischargeFittings] = useState<FittingEntry[]>([]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnitToggle = (newSystem: UnitSystem) => {
    const converted = convertFormValues(form, fieldUnitMap, unitSystem, newSystem);
    setForm(converted);
    setUnitSystem(newSystem);
  };

  const computeKTotal = (fittings: FittingEntry[]): number => {
    return fittings.reduce((sum, f) => {
      const kVal = FITTING_K_VALUES[f.name] ?? 0;
      return sum + kVal * f.count;
    }, 0);
  };

  const addFitting = (side: "suction" | "discharge", name: string) => {
    const setter = side === "suction" ? setSuctionFittings : setDischargeFittings;
    const field = side === "suction" ? "suctionFittingsK" : "dischargeFittingsK";
    setter((prev) => {
      const existing = prev.find((f) => f.name === name);
      let updated: FittingEntry[];
      if (existing) {
        updated = prev.map((f) => f.name === name ? { ...f, count: f.count + 1 } : f);
      } else {
        updated = [...prev, { name, count: 1 }];
      }
      const total = computeKTotal(updated);
      updateField(field, total.toFixed(2));
      return updated;
    });
  };

  const removeFitting = (side: "suction" | "discharge", name: string) => {
    const setter = side === "suction" ? setSuctionFittings : setDischargeFittings;
    const field = side === "suction" ? "suctionFittingsK" : "dischargeFittingsK";
    setter((prev) => {
      const updated = prev.filter((f) => f.name !== name);
      const total = computeKTotal(updated);
      updateField(field, total.toFixed(2));
      return updated;
    });
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const input = {
        flowRate: convertToSI("flowLiquid", parseFloat(form.flowRate), unitSystem),
        liquidDensity: parseFloat(form.liquidDensity),
        viscosity: parseFloat(form.viscosity),
        suctionStaticHead: convertToSI("head", parseFloat(form.suctionStaticHead), unitSystem),
        dischargeStaticHead: convertToSI("head", parseFloat(form.dischargeStaticHead), unitSystem),
        suctionPipeLength: convertToSI("length", parseFloat(form.suctionPipeLength), unitSystem),
        dischargePipeLength: convertToSI("length", parseFloat(form.dischargePipeLength), unitSystem),
        suctionPipeDiameter: convertToSI("diameter", parseFloat(form.suctionPipeDiameter), unitSystem),
        dischargePipeDiameter: convertToSI("diameter", parseFloat(form.dischargePipeDiameter), unitSystem),
        suctionRoughness: parseFloat(form.suctionRoughness),
        dischargeRoughness: parseFloat(form.dischargeRoughness),
        suctionFittingsK: parseFloat(form.suctionFittingsK),
        dischargeFittingsK: parseFloat(form.dischargeFittingsK),
        pumpEfficiency: parseFloat(form.pumpEfficiency),
        motorEfficiency: parseFloat(form.motorEfficiency),
        vaporPressure: convertToSI("pressureKpa", parseFloat(form.vaporPressure), unitSystem),
        atmosphericPressure: convertToSI("pressureAbs", parseFloat(form.atmosphericPressure), unitSystem),
        suctionVesselPressure: convertToSI("pressure", parseFloat(form.suctionVesselPressure), unitSystem),
      };
      for (const [key, val] of Object.entries(input)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }
      const res = calculatePumpSizing(input);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    const tc = PUMP_SIZING_TEST_CASE;
    setUnitSystem("SI");
    setForm({
      flowRate: String(tc.flowRate),
      liquidDensity: String(tc.liquidDensity),
      viscosity: String(tc.viscosity),
      suctionStaticHead: String(tc.suctionStaticHead),
      dischargeStaticHead: String(tc.dischargeStaticHead),
      suctionPipeLength: String(tc.suctionPipeLength),
      dischargePipeLength: String(tc.dischargePipeLength),
      suctionPipeDiameter: String(tc.suctionPipeDiameter),
      dischargePipeDiameter: String(tc.dischargePipeDiameter),
      suctionRoughness: String(tc.suctionRoughness),
      dischargeRoughness: String(tc.dischargeRoughness),
      suctionFittingsK: String(tc.suctionFittingsK),
      dischargeFittingsK: String(tc.dischargeFittingsK),
      pumpEfficiency: String(tc.pumpEfficiency),
      motorEfficiency: String(tc.motorEfficiency),
      vaporPressure: String(tc.vaporPressure),
      atmosphericPressure: String(tc.atmosphericPressure),
      suctionVesselPressure: String(tc.suctionVesselPressure),
    });
    setSuctionFittings([]);
    setDischargeFittings([]);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setForm(defaultForm);
    setSuctionFittings([]);
    setDischargeFittings([]);
    setResult(null);
    setError(null);
  };

  const handleLiquidSelect = (liquidName: string) => {
    const liquid = COMMON_LIQUIDS[liquidName];
    if (liquid) {
      setForm((prev) => ({
        ...prev,
        liquidDensity: String(liquid.density),
        viscosity: String(liquid.viscosity),
        vaporPressure: String(liquid.vaporPressure),
      }));
    }
  };

  const renderFittingsSection = (
    side: "suction" | "discharge",
    fittings: FittingEntry[],
    totalK: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Fittings (K total = {totalK})</Label>
        <Select onValueChange={(v) => addFitting(side, v)}>
          <SelectTrigger className="w-[180px]" data-testid={`select-${side}-fitting`}>
            <SelectValue placeholder="Add fitting..." />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(FITTING_K_VALUES).map((f) => (
              <SelectItem key={f} value={f}>{f} (K={FITTING_K_VALUES[f]})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {fittings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fittings.map((f) => (
            <Badge key={f.name} variant="secondary" className="text-xs gap-1">
              {f.count}x {f.name}
              <button
                onClick={() => removeFitting(side, f.name)}
                className="ml-0.5"
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">
              Pump Sizing Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Centrifugal pump head, power & NPSH calculation
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
                <h3 className="font-semibold text-sm">Liquid & Operating Conditions</h3>
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
                  <Label className="text-xs mb-1.5 block">Liquid Selection</Label>
                  <Select onValueChange={handleLiquidSelect}>
                    <SelectTrigger data-testid="select-liquid">
                      <SelectValue placeholder="Select a liquid..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(COMMON_LIQUIDS).map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Flow Rate ({getUnit("flowLiquid", unitSystem)})
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
                  <Label className="text-xs mb-1.5 block">Density (kg/m³)</Label>
                  <Input
                    type="number"
                    value={form.liquidDensity}
                    onChange={(e) => updateField("liquidDensity", e.target.value)}
                    placeholder="e.g. 998.2"
                    data-testid="input-density"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                  <Input
                    type="number"
                    value={form.viscosity}
                    onChange={(e) => updateField("viscosity", e.target.value)}
                    placeholder="e.g. 1.0"
                    data-testid="input-viscosity"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Suction Side</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Static Head ({getUnit("head", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.suctionStaticHead}
                    onChange={(e) => updateField("suctionStaticHead", e.target.value)}
                    placeholder="e.g. 2"
                    data-testid="input-suction-head"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Pipe Length ({getUnit("length", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.suctionPipeLength}
                    onChange={(e) => updateField("suctionPipeLength", e.target.value)}
                    placeholder="e.g. 10"
                    data-testid="input-suction-length"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Vessel Gauge Pressure ({getUnit("pressure", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.suctionVesselPressure}
                    onChange={(e) => updateField("suctionVesselPressure", e.target.value)}
                    placeholder="0 for atmospheric"
                    data-testid="input-vessel-pressure"
                  />
                </div>
                <div className="sm:col-span-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Suction Pipe</p>
                  <PipeSizeSelector
                    unitSystem={unitSystem}
                    innerDiameter={form.suctionPipeDiameter}
                    roughness={form.suctionRoughness}
                    onDiameterChange={(v) => updateField("suctionPipeDiameter", v)}
                    onRoughnessChange={(v) => updateField("suctionRoughness", v)}
                    testIdPrefix="suction"
                  />
                </div>
              </div>
              {renderFittingsSection("suction", suctionFittings, form.suctionFittingsK)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Discharge Side</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Static Head ({getUnit("head", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.dischargeStaticHead}
                    onChange={(e) => updateField("dischargeStaticHead", e.target.value)}
                    placeholder="e.g. 25"
                    data-testid="input-discharge-head"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Pipe Length ({getUnit("length", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.dischargePipeLength}
                    onChange={(e) => updateField("dischargePipeLength", e.target.value)}
                    placeholder="e.g. 200"
                    data-testid="input-discharge-length"
                  />
                </div>
                <div className="sm:col-span-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Discharge Pipe</p>
                  <PipeSizeSelector
                    unitSystem={unitSystem}
                    innerDiameter={form.dischargePipeDiameter}
                    roughness={form.dischargeRoughness}
                    onDiameterChange={(v) => updateField("dischargePipeDiameter", v)}
                    onRoughnessChange={(v) => updateField("dischargeRoughness", v)}
                    testIdPrefix="discharge"
                  />
                </div>
              </div>
              {renderFittingsSection("discharge", dischargeFittings, form.dischargeFittingsK)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Pump & NPSH Parameters</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Pump Efficiency (%)</Label>
                  <Input
                    type="number"
                    value={form.pumpEfficiency}
                    onChange={(e) => updateField("pumpEfficiency", e.target.value)}
                    placeholder="e.g. 75"
                    data-testid="input-pump-efficiency"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Motor Efficiency (%)</Label>
                  <Input
                    type="number"
                    value={form.motorEfficiency}
                    onChange={(e) => updateField("motorEfficiency", e.target.value)}
                    placeholder="e.g. 95"
                    data-testid="input-motor-efficiency"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Vapor Pressure ({getUnit("pressureKpa", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.vaporPressure}
                    onChange={(e) => updateField("vaporPressure", e.target.value)}
                    placeholder="e.g. 2.338"
                    data-testid="input-vapor-pressure"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Atmospheric Pressure ({getUnit("pressureAbs", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.atmosphericPressure}
                    onChange={(e) => updateField("atmosphericPressure", e.target.value)}
                    placeholder="1.01325"
                    data-testid="input-atm-pressure"
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                  {error}
                </div>
              )}

              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                Calculate Pump Requirements
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <WarningPanel warnings={result.warnings} />
              <ResultsPanel
                title="Head & Losses"
                results={[
                  {
                    label: "Total Dynamic Head (TDH)",
                    value: convertFromSI("head", result.totalDynamicHead, unitSystem),
                    unit: getUnit("head", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "Static Head",
                    value: convertFromSI("head", result.staticHead, unitSystem),
                    unit: getUnit("head", unitSystem),
                  },
                  {
                    label: "Suction Friction Loss",
                    value: convertFromSI("head", result.suctionFrictionLoss, unitSystem),
                    unit: getUnit("head", unitSystem),
                  },
                  {
                    label: "Discharge Friction Loss",
                    value: convertFromSI("head", result.dischargeFrictionLoss, unitSystem),
                    unit: getUnit("head", unitSystem),
                  },
                  {
                    label: "Total Friction Loss",
                    value: convertFromSI("head", result.totalFrictionLoss, unitSystem),
                    unit: getUnit("head", unitSystem),
                  },
                  {
                    label: "Suction Velocity Head",
                    value: result.suctionVelocityHead,
                    unit: "m",
                  },
                  {
                    label: "Discharge Velocity Head",
                    value: result.dischargeVelocityHead,
                    unit: "m",
                  },
                ]}
                rawData={result}
              />
              <ResultsPanel
                title="Power Requirements"
                results={[
                  {
                    label: "Hydraulic Power",
                    value: convertFromSI("power", result.hydraulicPower, unitSystem),
                    unit: getUnit("power", unitSystem),
                  },
                  {
                    label: "Brake Power (BHP)",
                    value: convertFromSI("power", result.brakePower, unitSystem),
                    unit: getUnit("power", unitSystem),
                    highlight: true,
                  },
                  {
                    label: "Motor Power Required",
                    value: convertFromSI("power", result.motorPower, unitSystem),
                    unit: getUnit("power", unitSystem),
                    highlight: true,
                  },
                ]}
                rawData={result}
              />
              <ResultsPanel
                title="Velocities & NPSH"
                results={[
                  {
                    label: "Suction Velocity",
                    value: convertFromSI("velocity", result.suctionVelocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                  },
                  {
                    label: "Discharge Velocity",
                    value: convertFromSI("velocity", result.dischargeVelocity, unitSystem),
                    unit: getUnit("velocity", unitSystem),
                  },
                  {
                    label: "Suction Reynolds",
                    value: result.suctionReynolds,
                    unit: "\u2014",
                  },
                  {
                    label: "Discharge Reynolds",
                    value: result.dischargeReynolds,
                    unit: "\u2014",
                  },
                  {
                    label: "NPSHa (Available)",
                    value: convertFromSI("head", result.npshaAvailable, unitSystem),
                    unit: getUnit("head", unitSystem),
                    highlight: result.npshaAvailable < 3.0,
                  },
                  {
                    label: "Suction f (Darcy)",
                    value: result.suctionFrictionFactor,
                    unit: "\u2014",
                  },
                  {
                    label: "Discharge f (Darcy)",
                    value: result.dischargeFrictionFactor,
                    unit: "\u2014",
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
            "Steady-state, incompressible liquid flow",
            "Centrifugal pump application",
            "Darcy-Weisbach equation with Swamee-Jain friction factor",
            "Minor losses calculated using resistance coefficient (K) method",
            "NPSHa calculated per HI/API standards",
            "Atmospheric pressure at sea level unless specified",
            "Suction vessel pressure is gauge pressure (0 = atmospheric)",
          ]}
          references={[
            "Hydraulic Institute Standards (HI 1.3) — Centrifugal Pump Design",
            "API 610 — Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries",
            "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
            "Cameron Hydraulic Data, 20th Edition",
            "Perry's Chemical Engineers' Handbook, 9th Edition",
          ]}
        />
      </div>
    </div>
  );
}
