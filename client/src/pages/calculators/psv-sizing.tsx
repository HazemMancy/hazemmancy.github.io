import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  calculatePSVGas, calculatePSVLiquid,
  PSV_GAS_TEST_CASE, PSV_LIQUID_TEST_CASE,
  type PSVResult, type PSVFluidType,
} from "@/lib/engineering/psvSizing";
import { COMMON_GASES, COMMON_LIQUIDS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { Shield, FlaskConical, RotateCcw, AlertTriangle } from "lucide-react";

type FluidMode = "gas" | "liquid";

interface GasForm {
  massFlowRate: string; molecularWeight: string; setPressure: string;
  overpressure: string; backPressure: string; relievingTemperature: string;
  compressibilityFactor: string; specificHeatRatio: string;
  kd: string; kb: string; kc: string; atmosphericPressure: string;
}
interface LiquidForm {
  flowRate: string; liquidDensity: string; setPressure: string;
  overpressure: string; backPressure: string; viscosity: string;
  kd: string; kw: string; kc: string; atmosphericPressure: string;
}

const defaultGas: GasForm = {
  massFlowRate: "", molecularWeight: "", setPressure: "", overpressure: "10",
  backPressure: "0", relievingTemperature: "", compressibilityFactor: "0.90",
  specificHeatRatio: "1.27", kd: "0.975", kb: "1.0", kc: "1.0",
  atmosphericPressure: "1.01325",
};
const defaultLiquid: LiquidForm = {
  flowRate: "", liquidDensity: "", setPressure: "", overpressure: "10",
  backPressure: "0", viscosity: "1.0", kd: "0.65", kw: "1.0", kc: "1.0",
  atmosphericPressure: "1.01325",
};

const gasFieldMap: FieldUnitMap = {
  massFlowRate: "flowMass", molecularWeight: null, setPressure: "pressure",
  overpressure: null, backPressure: "pressure", relievingTemperature: "temperature",
  compressibilityFactor: null, specificHeatRatio: null, kd: null, kb: null, kc: null,
  atmosphericPressure: null,
};
const liquidFieldMap: FieldUnitMap = {
  flowRate: "flowLiquid", liquidDensity: null, setPressure: "pressure",
  overpressure: null, backPressure: "pressure", viscosity: null,
  kd: null, kw: null, kc: null, atmosphericPressure: null,
};

export default function PSVSizingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [mode, setMode] = useState<FluidMode>("gas");
  const [gForm, setGForm] = useState<GasForm>(defaultGas);
  const [lForm, setLForm] = useState<LiquidForm>(defaultLiquid);
  const [result, setResult] = useState<PSVResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uG = (k: keyof GasForm, v: string) => setGForm(p => ({ ...p, [k]: v }));
  const uL = (k: keyof LiquidForm, v: string) => setLForm(p => ({ ...p, [k]: v }));

  const handleUnitToggle = (ns: UnitSystem) => {
    setGForm(convertFormValues(gForm, gasFieldMap, unitSystem, ns));
    setLForm(convertFormValues(lForm, liquidFieldMap, unitSystem, ns));
    setUnitSystem(ns);
  };

  const handleCalc = () => {
    setError(null);
    try {
      if (mode === "gas") {
        const input = {
          massFlowRate: convertToSI("flowMass", parseFloat(gForm.massFlowRate), unitSystem),
          molecularWeight: parseFloat(gForm.molecularWeight),
          setPressure: convertToSI("pressure", parseFloat(gForm.setPressure), unitSystem),
          overpressure: parseFloat(gForm.overpressure),
          backPressure: convertToSI("pressure", parseFloat(gForm.backPressure), unitSystem),
          relievingTemperature: convertToSI("temperature", parseFloat(gForm.relievingTemperature), unitSystem),
          compressibilityFactor: parseFloat(gForm.compressibilityFactor),
          specificHeatRatio: parseFloat(gForm.specificHeatRatio),
          kd: parseFloat(gForm.kd), kb: parseFloat(gForm.kb), kc: parseFloat(gForm.kc),
          atmosphericPressure: parseFloat(gForm.atmosphericPressure),
        };
        for (const [k, v] of Object.entries(input)) if (isNaN(v as number)) throw new Error(`Invalid ${k}`);
        setResult(calculatePSVGas(input));
      } else {
        const input = {
          flowRate: convertToSI("flowLiquid", parseFloat(lForm.flowRate), unitSystem),
          liquidDensity: parseFloat(lForm.liquidDensity),
          setPressure: convertToSI("pressure", parseFloat(lForm.setPressure), unitSystem),
          overpressure: parseFloat(lForm.overpressure),
          backPressure: convertToSI("pressure", parseFloat(lForm.backPressure), unitSystem),
          viscosity: parseFloat(lForm.viscosity),
          kd: parseFloat(lForm.kd), kw: parseFloat(lForm.kw), kc: parseFloat(lForm.kc),
          atmosphericPressure: parseFloat(lForm.atmosphericPressure),
        };
        for (const [k, v] of Object.entries(input)) if (isNaN(v as number)) throw new Error(`Invalid ${k}`);
        setResult(calculatePSVLiquid(input));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    setUnitSystem("SI"); setError(null); setResult(null);
    if (mode === "gas") {
      const tc = PSV_GAS_TEST_CASE;
      setGForm({ massFlowRate: String(tc.massFlowRate), molecularWeight: String(tc.molecularWeight),
        setPressure: String(tc.setPressure), overpressure: String(tc.overpressure),
        backPressure: String(tc.backPressure), relievingTemperature: String(tc.relievingTemperature),
        compressibilityFactor: String(tc.compressibilityFactor), specificHeatRatio: String(tc.specificHeatRatio),
        kd: String(tc.kd), kb: String(tc.kb), kc: String(tc.kc),
        atmosphericPressure: String(tc.atmosphericPressure) });
    } else {
      const tc = PSV_LIQUID_TEST_CASE;
      setLForm({ flowRate: String(tc.flowRate), liquidDensity: String(tc.liquidDensity),
        setPressure: String(tc.setPressure), overpressure: String(tc.overpressure),
        backPressure: String(tc.backPressure), viscosity: String(tc.viscosity),
        kd: String(tc.kd), kw: String(tc.kw), kc: String(tc.kc),
        atmosphericPressure: String(tc.atmosphericPressure) });
    }
  };

  const handleReset = () => { setGForm(defaultGas); setLForm(defaultLiquid); setResult(null); setError(null); };
  const handleGasSelect = (n: string) => { const g = COMMON_GASES[n]; if (g) { uG("molecularWeight", String(g.mw)); uG("specificHeatRatio", String(g.gamma)); } };
  const handleLiquidSelect = (n: string) => { const l = COMMON_LIQUIDS[n]; if (l) { uL("liquidDensity", String(l.density)); uL("viscosity", String(l.viscosity)); } };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <Card className="mb-6 bg-amber-950/30 border-amber-800/50">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-200" data-testid="text-screening-label">SCREENING TOOL — NOT FOR FINAL DESIGN</p>
            <p className="text-xs text-amber-200/70">Results must be verified by a qualified relief systems engineer using detailed process simulation and vendor data.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">PSV Sizing</h1>
            <p className="text-sm text-muted-foreground">API 520 Part I screening — gas & liquid relief</p>
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
                  <TabsTrigger value="gas" className="flex-1" data-testid="tab-gas">Gas/Vapor</TabsTrigger>
                  <TabsTrigger value="liquid" className="flex-1" data-testid="tab-liquid">Liquid</TabsTrigger>
                </TabsList>

                <TabsContent value="gas" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Relieving Rate ({getUnit("flowMass", unitSystem)})</Label>
                      <Input type="number" value={gForm.massFlowRate} onChange={e => uG("massFlowRate", e.target.value)} data-testid="input-gas-flow" /></div>
                    <div><Label className="text-xs mb-1.5 block">Gas Selection</Label>
                      <Select onValueChange={handleGasSelect}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{Object.keys(COMMON_GASES).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-xs mb-1.5 block">MW (kg/kmol)</Label>
                      <Input type="number" value={gForm.molecularWeight} onChange={e => uG("molecularWeight", e.target.value)} data-testid="input-gas-mw" /></div>
                    <div><Label className="text-xs mb-1.5 block">Set Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                      <Input type="number" value={gForm.setPressure} onChange={e => uG("setPressure", e.target.value)} data-testid="input-gas-set" /></div>
                    <div><Label className="text-xs mb-1.5 block">Overpressure (%)</Label>
                      <Input type="number" value={gForm.overpressure} onChange={e => uG("overpressure", e.target.value)} data-testid="input-gas-op" /></div>
                    <div><Label className="text-xs mb-1.5 block">Back Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                      <Input type="number" value={gForm.backPressure} onChange={e => uG("backPressure", e.target.value)} data-testid="input-gas-bp" /></div>
                    <div><Label className="text-xs mb-1.5 block">Relieving Temp ({getUnit("temperature", unitSystem)})</Label>
                      <Input type="number" value={gForm.relievingTemperature} onChange={e => uG("relievingTemperature", e.target.value)} data-testid="input-gas-temp" /></div>
                    <div><Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
                      <Input type="number" value={gForm.specificHeatRatio} onChange={e => uG("specificHeatRatio", e.target.value)} data-testid="input-gas-k" /></div>
                    <div><Label className="text-xs mb-1.5 block">Z-factor</Label>
                      <Input type="number" value={gForm.compressibilityFactor} onChange={e => uG("compressibilityFactor", e.target.value)} data-testid="input-gas-z" /></div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Correction Factors</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div><Label className="text-xs mb-1.5 block">Kd (discharge)</Label>
                        <Input type="number" value={gForm.kd} onChange={e => uG("kd", e.target.value)} data-testid="input-gas-kd" /></div>
                      <div><Label className="text-xs mb-1.5 block">Kb (back pressure)</Label>
                        <Input type="number" value={gForm.kb} onChange={e => uG("kb", e.target.value)} data-testid="input-gas-kb" /></div>
                      <div><Label className="text-xs mb-1.5 block">Kc (combination)</Label>
                        <Input type="number" value={gForm.kc} onChange={e => uG("kc", e.target.value)} data-testid="input-gas-kc" /></div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="liquid" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label className="text-xs mb-1.5 block">Flow Rate ({getUnit("flowLiquid", unitSystem)})</Label>
                      <Input type="number" value={lForm.flowRate} onChange={e => uL("flowRate", e.target.value)} data-testid="input-liq-flow" /></div>
                    <div><Label className="text-xs mb-1.5 block">Liquid Selection</Label>
                      <Select onValueChange={handleLiquidSelect}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{Object.keys(COMMON_LIQUIDS).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-xs mb-1.5 block">Density (kg/m³)</Label>
                      <Input type="number" value={lForm.liquidDensity} onChange={e => uL("liquidDensity", e.target.value)} data-testid="input-liq-density" /></div>
                    <div><Label className="text-xs mb-1.5 block">Set Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                      <Input type="number" value={lForm.setPressure} onChange={e => uL("setPressure", e.target.value)} data-testid="input-liq-set" /></div>
                    <div><Label className="text-xs mb-1.5 block">Overpressure (%)</Label>
                      <Input type="number" value={lForm.overpressure} onChange={e => uL("overpressure", e.target.value)} data-testid="input-liq-op" /></div>
                    <div><Label className="text-xs mb-1.5 block">Back Pressure ({getUnit("pressure", unitSystem)}g)</Label>
                      <Input type="number" value={lForm.backPressure} onChange={e => uL("backPressure", e.target.value)} data-testid="input-liq-bp" /></div>
                    <div><Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                      <Input type="number" value={lForm.viscosity} onChange={e => uL("viscosity", e.target.value)} data-testid="input-liq-visc" /></div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Correction Factors</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div><Label className="text-xs mb-1.5 block">Kd (discharge)</Label>
                        <Input type="number" value={lForm.kd} onChange={e => uL("kd", e.target.value)} data-testid="input-liq-kd" /></div>
                      <div><Label className="text-xs mb-1.5 block">Kw (back pressure)</Label>
                        <Input type="number" value={lForm.kw} onChange={e => uL("kw", e.target.value)} data-testid="input-liq-kw" /></div>
                      <div><Label className="text-xs mb-1.5 block">Kc (combination)</Label>
                        <Input type="number" value={lForm.kc} onChange={e => uL("kc", e.target.value)} data-testid="input-liq-kc" /></div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">{error}</div>}
              <Button className="w-full" onClick={handleCalc} data-testid="button-calculate">Calculate PSV Size</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (<>
            <WarningPanel warnings={result.warnings} />
            <ResultsPanel title="PSV Sizing Results" results={[
              { label: "Required Orifice Area", value: result.requiredArea, unit: "mm²", highlight: true },
              { label: "Selected Orifice", value: `${result.selectedOrifice} (${result.selectedOrificeArea} mm²)`, unit: "" },
              { label: "Relieving Pressure", value: convertFromSI("pressure", result.relievingPressureGauge, unitSystem), unit: `${getUnit("pressure", unitSystem)}g`, highlight: true },
              { label: "Relieving Pressure (abs)", value: convertFromSI("pressureAbs", result.relievingPressure, unitSystem), unit: getUnit("pressureAbs", unitSystem) },
              ...(result.cCoefficient ? [{ label: "C Coefficient", value: result.cCoefficient, unit: "—" }] : []),
            ]} rawData={result} />
          </>)}
          {!result && (
            <Card><CardContent className="py-12 text-center">
              <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Enter parameters and click Calculate PSV Size</p>
            </CardContent></Card>
          )}
          <div className="mt-4">
            <AssumptionsPanel
            assumptions={[
            "Gas/vapor sizing per API 520 Part I, Section 5.6",
            "Liquid sizing per API 520 Part I, Section 5.8",
            "C coefficient from specific heat ratio: C = 0.03948·sqrt(k·(2/(k+1))^((k+1)/(k-1)))",
            "Kd = 0.975 for gas (ASME certified), 0.65 for liquid (default values)",
            "Kb = 1.0 assumes conventional PSV (no balanced bellows correction)",
            "Kc = 1.0 assumes no rupture disk upstream (0.9 with rupture disk)",
            "Viscosity correction Kv for liquid is approximated from Reynolds number",
            "Orifice selection per API 526 standard designations (D through T)",
            ]}
            references={[
            "API 520 Part I, 10th Edition: Sizing, Selection, and Installation of Pressure-Relieving Devices",
            "API 526, 7th Edition: Flanged Steel Pressure-Relief Valves",
            "API 521: Pressure-Relieving and Depressuring Systems",
            "ASME BPVC Section VIII, Division 1: Pressure Vessels",
            ]}
            />
          </div>

          <FeedbackSection calculatorName="PSV Sizing" />
        </div>
      </div>
    </div>
  );
}
