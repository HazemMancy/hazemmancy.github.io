import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import {
  calculateROLiquid, calculateROGas,
  RO_LIQUID_TEST_CASE, RO_GAS_TEST_CASE,
  type ROLiquidResult, type ROGasResult,
} from "@/lib/engineering/restrictionOrifice";
import { COMMON_GASES, COMMON_LIQUIDS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { CircleDot, FlaskConical, RotateCcw } from "lucide-react";

type FluidMode = "liquid" | "gas";

interface LiquidForm {
  flowRate: string; upstreamPressure: string; downstreamPressure: string;
  liquidDensity: string; orificeDiameter: string; pipeDiameter: string;
  dischargeCoefficient: string;
}
interface GasForm {
  massFlowRate: string; molecularWeight: string; upstreamPressure: string;
  downstreamPressure: string; upstreamTemperature: string; orificeDiameter: string;
  pipeDiameter: string; specificHeatRatio: string; compressibilityFactor: string;
  dischargeCoefficient: string;
}

const defaultLiquid: LiquidForm = {
  flowRate: "", upstreamPressure: "", downstreamPressure: "", liquidDensity: "",
  orificeDiameter: "", pipeDiameter: "", dischargeCoefficient: "0.61",
};
const defaultGas: GasForm = {
  massFlowRate: "", molecularWeight: "", upstreamPressure: "", downstreamPressure: "",
  upstreamTemperature: "", orificeDiameter: "", pipeDiameter: "", specificHeatRatio: "1.27",
  compressibilityFactor: "0.92", dischargeCoefficient: "0.61",
};

const liquidFieldMap: FieldUnitMap = {
  flowRate: "flowLiquid", upstreamPressure: "pressure", downstreamPressure: "pressure",
  liquidDensity: null, orificeDiameter: "diameter", pipeDiameter: "diameter",
  dischargeCoefficient: null,
};
const gasFieldMap: FieldUnitMap = {
  massFlowRate: "flowMass", molecularWeight: null, upstreamPressure: "pressureAbs",
  downstreamPressure: "pressureAbs", upstreamTemperature: "temperature",
  orificeDiameter: "diameter", pipeDiameter: "diameter", specificHeatRatio: null,
  compressibilityFactor: null, dischargeCoefficient: null,
};

export default function RestrictionOrificePage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [mode, setMode] = useState<FluidMode>("liquid");
  const [liquidForm, setLiquidForm] = useState<LiquidForm>(defaultLiquid);
  const [gasForm, setGasForm] = useState<GasForm>(defaultGas);
  const [liquidResult, setLiquidResult] = useState<ROLiquidResult | null>(null);
  const [gasResult, setGasResult] = useState<ROGasResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateLiquid = (k: keyof LiquidForm, v: string) => setLiquidForm(p => ({ ...p, [k]: v }));
  const updateGas = (k: keyof GasForm, v: string) => setGasForm(p => ({ ...p, [k]: v }));

  const handleUnitToggle = (ns: UnitSystem) => {
    setLiquidForm(convertFormValues(liquidForm, liquidFieldMap, unitSystem, ns));
    setGasForm(convertFormValues(gasForm, gasFieldMap, unitSystem, ns));
    setUnitSystem(ns);
  };

  const handleCalculate = () => {
    setError(null);
    try {
      if (mode === "liquid") {
        const input = {
          flowRate: convertToSI("flowLiquid", parseFloat(liquidForm.flowRate), unitSystem),
          liquidDensity: parseFloat(liquidForm.liquidDensity),
          upstreamPressure: convertToSI("pressure", parseFloat(liquidForm.upstreamPressure), unitSystem),
          downstreamPressure: convertToSI("pressure", parseFloat(liquidForm.downstreamPressure), unitSystem),
          orificeDiameter: liquidForm.orificeDiameter ? convertToSI("diameter", parseFloat(liquidForm.orificeDiameter), unitSystem) : 0,
          pipeDiameter: convertToSI("diameter", parseFloat(liquidForm.pipeDiameter), unitSystem),
          dischargeCoefficient: parseFloat(liquidForm.dischargeCoefficient),
        };
        for (const [k, v] of Object.entries(input)) if (isNaN(v as number)) throw new Error(`Invalid ${k}`);
        setLiquidResult(calculateROLiquid(input));
        setGasResult(null);
      } else {
        const input = {
          massFlowRate: convertToSI("flowMass", parseFloat(gasForm.massFlowRate), unitSystem),
          molecularWeight: parseFloat(gasForm.molecularWeight),
          upstreamPressure: convertToSI("pressureAbs", parseFloat(gasForm.upstreamPressure), unitSystem),
          downstreamPressure: convertToSI("pressureAbs", parseFloat(gasForm.downstreamPressure), unitSystem),
          upstreamTemperature: convertToSI("temperature", parseFloat(gasForm.upstreamTemperature), unitSystem),
          orificeDiameter: gasForm.orificeDiameter ? convertToSI("diameter", parseFloat(gasForm.orificeDiameter), unitSystem) : 0,
          pipeDiameter: convertToSI("diameter", parseFloat(gasForm.pipeDiameter), unitSystem),
          specificHeatRatio: parseFloat(gasForm.specificHeatRatio),
          compressibilityFactor: parseFloat(gasForm.compressibilityFactor),
          dischargeCoefficient: parseFloat(gasForm.dischargeCoefficient),
        };
        for (const [k, v] of Object.entries(input)) if (isNaN(v as number)) throw new Error(`Invalid ${k}`);
        setGasResult(calculateROGas(input));
        setLiquidResult(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setLiquidResult(null); setGasResult(null);
    }
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null); setLiquidResult(null); setGasResult(null);
    if (mode === "liquid") {
      const tc = RO_LIQUID_TEST_CASE;
      setLiquidForm({
        flowRate: String(tc.flowRate), upstreamPressure: String(tc.upstreamPressure),
        downstreamPressure: String(tc.downstreamPressure), liquidDensity: String(tc.liquidDensity),
        orificeDiameter: "", pipeDiameter: String(tc.pipeDiameter),
        dischargeCoefficient: String(tc.dischargeCoefficient),
      });
    } else {
      const tc = RO_GAS_TEST_CASE;
      setGasForm({
        massFlowRate: String(tc.massFlowRate), molecularWeight: String(tc.molecularWeight),
        upstreamPressure: String(tc.upstreamPressure), downstreamPressure: String(tc.downstreamPressure),
        upstreamTemperature: String(tc.upstreamTemperature), orificeDiameter: "",
        pipeDiameter: String(tc.pipeDiameter), specificHeatRatio: String(tc.specificHeatRatio),
        compressibilityFactor: String(tc.compressibilityFactor),
        dischargeCoefficient: String(tc.dischargeCoefficient),
      });
    }
  };

  const handleReset = () => {
    setLiquidForm(defaultLiquid); setGasForm(defaultGas);
    setLiquidResult(null); setGasResult(null); setError(null);
  };

  const handleLiquidSelect = (name: string) => {
    const l = COMMON_LIQUIDS[name];
    if (l) updateLiquid("liquidDensity", String(l.density));
  };

  const handleGasSelect = (name: string) => {
    const g = COMMON_GASES[name];
    if (g) {
      setGasForm(p => ({ ...p, molecularWeight: String(g.mw), specificHeatRatio: String(g.gamma) }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Restriction Orifice Sizing</h1>
            <p className="text-sm text-muted-foreground">Liquid & gas orifice with choked flow check</p>
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
                    <FlaskConical className="w-3.5 h-3.5 mr-1" /> Test Case
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Tabs value={mode} onValueChange={(v) => setMode(v as FluidMode)}>
                <TabsList className="w-full">
                  <TabsTrigger value="liquid" className="flex-1" data-testid="tab-liquid">Liquid</TabsTrigger>
                  <TabsTrigger value="gas" className="flex-1" data-testid="tab-gas">Gas</TabsTrigger>
                </TabsList>

                <TabsContent value="liquid" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs mb-1.5 block">Flow Rate ({getUnit("flowLiquid", unitSystem)})</Label>
                      <Input type="number" value={liquidForm.flowRate} onChange={e => updateLiquid("flowRate", e.target.value)} data-testid="input-flow-rate" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Liquid Selection</Label>
                      <Select onValueChange={handleLiquidSelect}>
                        <SelectTrigger><SelectValue placeholder="Select liquid..." /></SelectTrigger>
                        <SelectContent>{Object.keys(COMMON_LIQUIDS).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Liquid Density (kg/m³)</Label>
                      <Input type="number" value={liquidForm.liquidDensity} onChange={e => updateLiquid("liquidDensity", e.target.value)} data-testid="input-density" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Upstream Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                      <Input type="number" value={liquidForm.upstreamPressure} onChange={e => updateLiquid("upstreamPressure", e.target.value)} data-testid="input-p1" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Downstream Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                      <Input type="number" value={liquidForm.downstreamPressure} onChange={e => updateLiquid("downstreamPressure", e.target.value)} data-testid="input-p2" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Orifice Dia ({getUnit("diameter", unitSystem)}) — blank to calculate</Label>
                      <Input type="number" value={liquidForm.orificeDiameter} onChange={e => updateLiquid("orificeDiameter", e.target.value)} placeholder="Auto-size" data-testid="input-orifice-dia" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Pipe ID ({getUnit("diameter", unitSystem)})</Label>
                      <Input type="number" value={liquidForm.pipeDiameter} onChange={e => updateLiquid("pipeDiameter", e.target.value)} data-testid="input-pipe-dia" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Discharge Coefficient (Cd)</Label>
                      <Input type="number" value={liquidForm.dischargeCoefficient} onChange={e => updateLiquid("dischargeCoefficient", e.target.value)} data-testid="input-cd" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="gas" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs mb-1.5 block">Mass Flow Rate ({getUnit("flowMass", unitSystem)})</Label>
                      <Input type="number" value={gasForm.massFlowRate} onChange={e => updateGas("massFlowRate", e.target.value)} data-testid="input-mass-flow" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Gas Selection</Label>
                      <Select onValueChange={handleGasSelect}>
                        <SelectTrigger><SelectValue placeholder="Select gas..." /></SelectTrigger>
                        <SelectContent>{Object.keys(COMMON_GASES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">MW (kg/kmol)</Label>
                      <Input type="number" value={gasForm.molecularWeight} onChange={e => updateGas("molecularWeight", e.target.value)} data-testid="input-mw" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Upstream P ({getUnit("pressureAbs", unitSystem)})</Label>
                      <Input type="number" value={gasForm.upstreamPressure} onChange={e => updateGas("upstreamPressure", e.target.value)} data-testid="input-gas-p1" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Downstream P ({getUnit("pressureAbs", unitSystem)})</Label>
                      <Input type="number" value={gasForm.downstreamPressure} onChange={e => updateGas("downstreamPressure", e.target.value)} data-testid="input-gas-p2" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Temperature ({getUnit("temperature", unitSystem)})</Label>
                      <Input type="number" value={gasForm.upstreamTemperature} onChange={e => updateGas("upstreamTemperature", e.target.value)} data-testid="input-gas-temp" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Orifice Dia ({getUnit("diameter", unitSystem)}) — blank to calculate</Label>
                      <Input type="number" value={gasForm.orificeDiameter} onChange={e => updateGas("orificeDiameter", e.target.value)} placeholder="Auto-size" data-testid="input-gas-orifice" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Pipe ID ({getUnit("diameter", unitSystem)})</Label>
                      <Input type="number" value={gasForm.pipeDiameter} onChange={e => updateGas("pipeDiameter", e.target.value)} data-testid="input-gas-pipe" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
                      <Input type="number" value={gasForm.specificHeatRatio} onChange={e => updateGas("specificHeatRatio", e.target.value)} data-testid="input-gas-k" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Z-factor</Label>
                      <Input type="number" value={gasForm.compressibilityFactor} onChange={e => updateGas("compressibilityFactor", e.target.value)} data-testid="input-gas-z" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Discharge Coefficient (Cd)</Label>
                      <Input type="number" value={gasForm.dischargeCoefficient} onChange={e => updateGas("dischargeCoefficient", e.target.value)} data-testid="input-gas-cd" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}
              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">Calculate</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {liquidResult && (
            <>
              <WarningPanel warnings={liquidResult.warnings} />
              <ResultsPanel title="Liquid RO Results" results={[
                { label: "Required Orifice Dia", value: convertFromSI("diameter", liquidResult.requiredOrificeDiameter, unitSystem), unit: getUnit("diameter", unitSystem), highlight: true },
                { label: "Orifice Area", value: liquidResult.orificeArea, unit: "mm²" },
                { label: "Beta Ratio (d/D)", value: liquidResult.betaRatio, unit: "—" },
                { label: "Orifice Velocity", value: convertFromSI("velocity", liquidResult.velocity, unitSystem), unit: getUnit("velocity", unitSystem), highlight: true },
                { label: "Pipe Velocity", value: convertFromSI("velocity", liquidResult.pipeVelocity, unitSystem), unit: getUnit("velocity", unitSystem) },
                { label: "Pressure Drop", value: convertFromSI("pressure", liquidResult.pressureDrop, unitSystem), unit: getUnit("pressure", unitSystem) },
                { label: "Flow Coefficient", value: liquidResult.flowCoefficient, unit: "—" },
              ]} rawData={liquidResult} />
            </>
          )}
          {gasResult && (
            <>
              <WarningPanel warnings={gasResult.warnings} />
              <ResultsPanel title="Gas RO Results" results={[
                { label: "Required Orifice Dia", value: convertFromSI("diameter", gasResult.requiredOrificeDiameter, unitSystem), unit: getUnit("diameter", unitSystem), highlight: true },
                { label: "Orifice Area", value: gasResult.orificeArea, unit: "mm²" },
                { label: "Beta Ratio (d/D)", value: gasResult.betaRatio, unit: "—" },
                { label: "Pressure Ratio (P2/P1)", value: gasResult.pressureRatio, unit: "—", highlight: gasResult.isChoked },
                { label: "Critical P Ratio", value: gasResult.criticalPressureRatio, unit: "—" },
                { label: "Flow Regime", value: gasResult.isChoked ? "CHOKED" : "Sub-critical", unit: "" },
                { label: "Orifice Velocity", value: convertFromSI("velocity", gasResult.velocity, unitSystem), unit: getUnit("velocity", unitSystem) },
              ]} rawData={gasResult} />
            </>
          )}
          {!liquidResult && !gasResult && (
            <Card><CardContent className="py-12 text-center">
              <CircleDot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Enter parameters and click Calculate</p>
            </CardContent></Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <AssumptionsPanel
          assumptions={[
            "Sharp-edged orifice plate (ISO 5167 geometry)",
            "Incompressible flow assumed for liquid sizing",
            "Gas expansion factor Y per ISA approximation for sub-critical flow",
            "Choked flow check uses isentropic critical pressure ratio",
            "Discharge coefficient Cd is user-supplied (typical 0.60–0.65 for sharp-edged)",
            "No allowance for manufacturing tolerances on orifice bore",
          ]}
          references={[
            "ISO 5167: Measurement of fluid flow by means of pressure differential devices",
            "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
            "API 520 Part I: Sizing of pressure-relieving devices (for critical flow equations)",
            "Miller, R.W. Flow Measurement Engineering Handbook, 3rd Edition",
          ]}
        />
      </div>
    </div>
  );
}
