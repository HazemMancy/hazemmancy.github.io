import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import {
  calculateCVLiquid, calculateCVGas,
  CV_LIQUID_TEST_CASE, CV_GAS_TEST_CASE,
  type CVLiquidResult, type CVGasResult,
} from "@/lib/engineering/controlValve";
import { COMMON_GASES, COMMON_LIQUIDS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { Gauge, FlaskConical, RotateCcw } from "lucide-react";

type FluidMode = "liquid" | "gas";

interface LiquidForm {
  flowRate: string; liquidDensity: string; upstreamPressure: string;
  downstreamPressure: string; vaporPressure: string; criticalPressure: string;
  pipeSize: string; valveSize: string; fl: string;
}
interface GasForm {
  massFlowRate: string; molecularWeight: string; upstreamPressure: string;
  downstreamPressure: string; temperature: string; compressibilityFactor: string;
  specificHeatRatio: string; pipeSize: string; valveSize: string; xt: string;
}

const defaultLiquid: LiquidForm = {
  flowRate: "", liquidDensity: "", upstreamPressure: "", downstreamPressure: "",
  vaporPressure: "", criticalPressure: "220.64", pipeSize: "", valveSize: "", fl: "0.90",
};
const defaultGas: GasForm = {
  massFlowRate: "", molecularWeight: "", upstreamPressure: "", downstreamPressure: "",
  temperature: "", compressibilityFactor: "0.92", specificHeatRatio: "1.27",
  pipeSize: "", valveSize: "", xt: "0.70",
};

const liquidFieldMap: FieldUnitMap = {
  flowRate: "flowLiquid", liquidDensity: null, upstreamPressure: "pressureAbs",
  downstreamPressure: "pressureAbs", vaporPressure: "pressureKpa",
  criticalPressure: "pressureAbs", pipeSize: "diameter", valveSize: "diameter", fl: null,
};
const gasFieldMap: FieldUnitMap = {
  massFlowRate: "flowMass", molecularWeight: null, upstreamPressure: "pressureAbs",
  downstreamPressure: "pressureAbs", temperature: "temperature",
  compressibilityFactor: null, specificHeatRatio: null, pipeSize: "diameter",
  valveSize: "diameter", xt: null,
};

export default function ControlValvePage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [mode, setMode] = useState<FluidMode>("liquid");
  const [lForm, setLForm] = useState<LiquidForm>(defaultLiquid);
  const [gForm, setGForm] = useState<GasForm>(defaultGas);
  const [lResult, setLResult] = useState<CVLiquidResult | null>(null);
  const [gResult, setGResult] = useState<CVGasResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uL = (k: keyof LiquidForm, v: string) => setLForm(p => ({ ...p, [k]: v }));
  const uG = (k: keyof GasForm, v: string) => setGForm(p => ({ ...p, [k]: v }));

  const handleUnitToggle = (ns: UnitSystem) => {
    setLForm(convertFormValues(lForm, liquidFieldMap, unitSystem, ns));
    setGForm(convertFormValues(gForm, gasFieldMap, unitSystem, ns));
    setUnitSystem(ns);
  };

  const handleCalc = () => {
    setError(null);
    try {
      if (mode === "liquid") {
        const input = {
          flowRate: convertToSI("flowLiquid", parseFloat(lForm.flowRate), unitSystem),
          liquidDensity: parseFloat(lForm.liquidDensity),
          upstreamPressure: convertToSI("pressureAbs", parseFloat(lForm.upstreamPressure), unitSystem),
          downstreamPressure: convertToSI("pressureAbs", parseFloat(lForm.downstreamPressure), unitSystem),
          vaporPressure: convertToSI("pressureKpa", parseFloat(lForm.vaporPressure), unitSystem),
          criticalPressure: convertToSI("pressureAbs", parseFloat(lForm.criticalPressure), unitSystem),
          pipeSize: convertToSI("diameter", parseFloat(lForm.pipeSize), unitSystem),
          valveSize: lForm.valveSize ? convertToSI("diameter", parseFloat(lForm.valveSize), unitSystem) : 0,
          fl: parseFloat(lForm.fl),
        };
        for (const [k, v] of Object.entries(input)) if (isNaN(v as number)) throw new Error(`Invalid ${k}`);
        setLResult(calculateCVLiquid(input));
        setGResult(null);
      } else {
        const input = {
          massFlowRate: convertToSI("flowMass", parseFloat(gForm.massFlowRate), unitSystem),
          molecularWeight: parseFloat(gForm.molecularWeight),
          upstreamPressure: convertToSI("pressureAbs", parseFloat(gForm.upstreamPressure), unitSystem),
          downstreamPressure: convertToSI("pressureAbs", parseFloat(gForm.downstreamPressure), unitSystem),
          temperature: convertToSI("temperature", parseFloat(gForm.temperature), unitSystem),
          compressibilityFactor: parseFloat(gForm.compressibilityFactor),
          specificHeatRatio: parseFloat(gForm.specificHeatRatio),
          pipeSize: convertToSI("diameter", parseFloat(gForm.pipeSize), unitSystem),
          valveSize: gForm.valveSize ? convertToSI("diameter", parseFloat(gForm.valveSize), unitSystem) : 0,
          xt: parseFloat(gForm.xt),
        };
        for (const [k, v] of Object.entries(input)) if (isNaN(v as number)) throw new Error(`Invalid ${k}`);
        setGResult(calculateCVGas(input));
        setLResult(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setLResult(null); setGResult(null);
    }
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null); setLResult(null); setGResult(null);
    if (mode === "liquid") {
      const tc = CV_LIQUID_TEST_CASE;
      setLForm({ flowRate: String(tc.flowRate), liquidDensity: String(tc.liquidDensity),
        upstreamPressure: String(tc.upstreamPressure), downstreamPressure: String(tc.downstreamPressure),
        vaporPressure: String(tc.vaporPressure), criticalPressure: String(tc.criticalPressure),
        pipeSize: String(tc.pipeSize), valveSize: String(tc.valveSize || ""), fl: String(tc.fl) });
    } else {
      const tc = CV_GAS_TEST_CASE;
      setGForm({ massFlowRate: String(tc.massFlowRate), molecularWeight: String(tc.molecularWeight),
        upstreamPressure: String(tc.upstreamPressure), downstreamPressure: String(tc.downstreamPressure),
        temperature: String(tc.temperature), compressibilityFactor: String(tc.compressibilityFactor),
        specificHeatRatio: String(tc.specificHeatRatio), pipeSize: String(tc.pipeSize),
        valveSize: String(tc.valveSize || ""), xt: String(tc.xt) });
    }
  };

  const handleReset = () => { setLForm(defaultLiquid); setGForm(defaultGas); setLResult(null); setGResult(null); setError(null); };
  const handleLiquidSelect = (n: string) => { const l = COMMON_LIQUIDS[n]; if (l) { uL("liquidDensity", String(l.density)); uL("vaporPressure", String(l.vaporPressure)); } };
  const handleGasSelect = (n: string) => { const g = COMMON_GASES[n]; if (g) { uG("molecularWeight", String(g.mw)); uG("specificHeatRatio", String(g.gamma)); } };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">Control Valve Sizing</h1>
            <p className="text-sm text-muted-foreground">Cv calculation per IEC 60534 / ISA S75</p>
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
                  <TabsTrigger value="liquid" className="flex-1" data-testid="tab-liquid">Liquid Cv</TabsTrigger>
                  <TabsTrigger value="gas" className="flex-1" data-testid="tab-gas">Gas Cv</TabsTrigger>
                </TabsList>

                <TabsContent value="liquid" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Flow Rate ({getUnit("flowLiquid", unitSystem)})</Label>
                      <Input type="number" value={lForm.flowRate} onChange={e => uL("flowRate", e.target.value)} data-testid="input-flow" /></div>
                    <div><Label className="text-xs mb-1.5 block">Liquid Selection</Label>
                      <Select onValueChange={handleLiquidSelect}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{Object.keys(COMMON_LIQUIDS).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-xs mb-1.5 block">Density (kg/m³)</Label>
                      <Input type="number" value={lForm.liquidDensity} onChange={e => uL("liquidDensity", e.target.value)} data-testid="input-density" /></div>
                    <div><Label className="text-xs mb-1.5 block">Upstream P ({getUnit("pressureAbs", unitSystem)})</Label>
                      <Input type="number" value={lForm.upstreamPressure} onChange={e => uL("upstreamPressure", e.target.value)} data-testid="input-p1" /></div>
                    <div><Label className="text-xs mb-1.5 block">Downstream P ({getUnit("pressureAbs", unitSystem)})</Label>
                      <Input type="number" value={lForm.downstreamPressure} onChange={e => uL("downstreamPressure", e.target.value)} data-testid="input-p2" /></div>
                    <div><Label className="text-xs mb-1.5 block">Vapor Pressure ({getUnit("pressureKpa", unitSystem)})</Label>
                      <Input type="number" value={lForm.vaporPressure} onChange={e => uL("vaporPressure", e.target.value)} data-testid="input-pv" /></div>
                    <div><Label className="text-xs mb-1.5 block">Critical Pressure ({getUnit("pressureAbs", unitSystem)})</Label>
                      <Input type="number" value={lForm.criticalPressure} onChange={e => uL("criticalPressure", e.target.value)} data-testid="input-pc" /></div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Pipe Selection</p>
                    <PipeSizeSelector
                      unitSystem={unitSystem}
                      innerDiameter={lForm.pipeSize}
                      onDiameterChange={(v) => uL("pipeSize", v)}
                      showRoughness={false}
                      testIdPrefix="liq"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Valve Size ({getUnit("diameter", unitSystem)}) — blank=line-size</Label>
                      <Input type="number" value={lForm.valveSize} onChange={e => uL("valveSize", e.target.value)} placeholder="Line-size" data-testid="input-valve" /></div>
                    <div><Label className="text-xs mb-1.5 block">FL (Pressure Recovery Factor)</Label>
                      <Input type="number" value={lForm.fl} onChange={e => uL("fl", e.target.value)} data-testid="input-fl" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="gas" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Mass Flow ({getUnit("flowMass", unitSystem)})</Label>
                      <Input type="number" value={gForm.massFlowRate} onChange={e => uG("massFlowRate", e.target.value)} data-testid="input-gas-flow" /></div>
                    <div><Label className="text-xs mb-1.5 block">Gas Selection</Label>
                      <Select onValueChange={handleGasSelect}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{Object.keys(COMMON_GASES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-xs mb-1.5 block">MW (kg/kmol)</Label>
                      <Input type="number" value={gForm.molecularWeight} onChange={e => uG("molecularWeight", e.target.value)} data-testid="input-gas-mw" /></div>
                    <div><Label className="text-xs mb-1.5 block">Upstream P ({getUnit("pressureAbs", unitSystem)})</Label>
                      <Input type="number" value={gForm.upstreamPressure} onChange={e => uG("upstreamPressure", e.target.value)} data-testid="input-gas-p1" /></div>
                    <div><Label className="text-xs mb-1.5 block">Downstream P ({getUnit("pressureAbs", unitSystem)})</Label>
                      <Input type="number" value={gForm.downstreamPressure} onChange={e => uG("downstreamPressure", e.target.value)} data-testid="input-gas-p2" /></div>
                    <div><Label className="text-xs mb-1.5 block">Temperature ({getUnit("temperature", unitSystem)})</Label>
                      <Input type="number" value={gForm.temperature} onChange={e => uG("temperature", e.target.value)} data-testid="input-gas-temp" /></div>
                    <div><Label className="text-xs mb-1.5 block">Z-factor</Label>
                      <Input type="number" value={gForm.compressibilityFactor} onChange={e => uG("compressibilityFactor", e.target.value)} data-testid="input-gas-z" /></div>
                    <div><Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
                      <Input type="number" value={gForm.specificHeatRatio} onChange={e => uG("specificHeatRatio", e.target.value)} data-testid="input-gas-k" /></div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Pipe Selection</p>
                    <PipeSizeSelector
                      unitSystem={unitSystem}
                      innerDiameter={gForm.pipeSize}
                      onDiameterChange={(v) => uG("pipeSize", v)}
                      showRoughness={false}
                      testIdPrefix="gas"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">xT (Pressure Drop Ratio Factor)</Label>
                      <Input type="number" value={gForm.xt} onChange={e => uG("xt", e.target.value)} data-testid="input-gas-xt" /></div>
                  </div>
                </TabsContent>
              </Tabs>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}
              <Button className="w-full" onClick={handleCalc} data-testid="button-calculate">Calculate Cv</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {lResult && (<>
            <WarningPanel warnings={lResult.warnings} />
            <ResultsPanel title="Liquid Cv Results" results={[
              { label: "Required Cv", value: lResult.cvRequired, unit: "", highlight: true },
              { label: "Cv (at choked)", value: lResult.cvChoked, unit: "" },
              { label: "Flow Regime", value: lResult.flowRegime, unit: "" },
              { label: "Fp Factor", value: lResult.fpFactor, unit: "—" },
              { label: "FF Factor", value: lResult.ffFactor, unit: "—" },
              { label: "ΔP Actual", value: convertFromSI("pressure", lResult.deltaPActual, unitSystem), unit: getUnit("pressure", unitSystem) },
              { label: "ΔP Choked", value: convertFromSI("pressure", lResult.deltaPChoked, unitSystem), unit: getUnit("pressure", unitSystem) },
            ]} rawData={lResult} />
          </>)}
          {gResult && (<>
            <WarningPanel warnings={gResult.warnings} />
            <ResultsPanel title="Gas Cv Results" results={[
              { label: "Required Cv", value: gResult.cvRequired, unit: "", highlight: true },
              { label: "x (ΔP/P1)", value: gResult.xActual, unit: "—" },
              { label: "x Choked", value: gResult.xChoked, unit: "—" },
              { label: "Y (Expansion Factor)", value: gResult.yFactor, unit: "—" },
              { label: "Fk Factor", value: gResult.fkFactor, unit: "—" },
              { label: "Fp Factor", value: gResult.fpFactor, unit: "—" },
              { label: "Flow Regime", value: gResult.isChoked ? "CHOKED" : "Sub-critical", unit: "" },
            ]} rawData={gResult} />
          </>)}
          {!lResult && !gResult && (
            <Card><CardContent className="py-12 text-center">
              <Gauge className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Enter parameters and click Calculate Cv</p>
            </CardContent></Card>
          )}
          <div className="mt-4">
            <AssumptionsPanel
            assumptions={[
            "Cv sizing per IEC 60534-2-1 / ISA S75.01",
            "Piping geometry factor Fp based on reducers (sum K = 1.5(1-β²))",
            "Liquid choked flow: ΔP_choked = FL²(P1 - FF·Pv)",
            "FF = 0.96 - 0.28·sqrt(Pv/Pc) per IEC 60534",
            "Gas expansion factor Y = 1 - x/(3·Fk·xT·Fp²)",
            "Fk = k/1.4 (specific heat ratio factor)",
            "xT must be obtained from valve manufacturer data",
            ]}
            references={[
            "IEC 60534-2-1: Industrial-process control valves — Sizing equations",
            "ISA S75.01: Flow Equations for Sizing Control Valves",
            "Fisher Control Valve Handbook, 5th Edition",
            "Masoneilan Engineering Handbook for Control Valves",
            ]}
            />
          </div>

          <FeedbackSection calculatorName="Control Valve Sizing" />
        </div>
      </div>
    </div>
  );
}
