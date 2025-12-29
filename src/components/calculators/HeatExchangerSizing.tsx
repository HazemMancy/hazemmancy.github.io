import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer, ArrowRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CalculationMode = "design" | "rating";
type FlowArrangement = "counter" | "parallel" | "shell-tube-1-2" | "shell-tube-1-4" | "crossflow-unmixed" | "crossflow-mixed";
type TemperatureUnit = "C" | "F" | "K";

interface FluidInputs {
  inletTemp: string;
  outletTemp: string;
  flowRate: string;
  specificHeat: string;
}

const HeatExchangerSizing = () => {
  const [calculationMode, setCalculationMode] = useState<CalculationMode>("design");
  const [flowArrangement, setFlowArrangement] = useState<FlowArrangement>("counter");
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>("C");
  
  // Hot fluid inputs
  const [hotFluid, setHotFluid] = useState<FluidInputs>({
    inletTemp: "150",
    outletTemp: "90",
    flowRate: "5000",
    specificHeat: "4.18"
  });
  
  // Cold fluid inputs
  const [coldFluid, setColdFluid] = useState<FluidInputs>({
    inletTemp: "25",
    outletTemp: "70",
    flowRate: "6000",
    specificHeat: "4.18"
  });
  
  // Heat transfer coefficient (for design mode)
  const [overallU, setOverallU] = useState("500");
  
  // Area (for rating mode)
  const [area, setArea] = useState("10");
  
  // Fouling factors
  const [hotFouling, setHotFouling] = useState("0.0002");
  const [coldFouling, setColdFouling] = useState("0.0002");
  
  // Results
  const [results, setResults] = useState<{
    heatDuty: number;
    lmtd: number;
    correctionFactor: number;
    effectiveLmtd: number;
    requiredArea: number;
    ntu: number;
    effectiveness: number;
    capacityRatio: number;
    hotOutletCalc?: number;
    coldOutletCalc?: number;
  } | null>(null);

  // Temperature conversion functions
  const toKelvin = (temp: number, unit: TemperatureUnit): number => {
    switch (unit) {
      case "C": return temp + 273.15;
      case "F": return (temp - 32) * 5/9 + 273.15;
      case "K": return temp;
    }
  };

  const fromKelvin = (tempK: number, unit: TemperatureUnit): number => {
    switch (unit) {
      case "C": return tempK - 273.15;
      case "F": return (tempK - 273.15) * 9/5 + 32;
      case "K": return tempK;
    }
  };

  // LMTD Correction factor for shell & tube (1-2, 1-4) and crossflow
  const calculateCorrectionFactor = (
    R: number, 
    P: number, 
    arrangement: FlowArrangement
  ): number => {
    if (arrangement === "counter" || arrangement === "parallel") {
      return 1.0;
    }
    
    // For shell & tube 1-2 and crossflow configurations
    if (R === 1) {
      // Special case when R = 1
      const F = (P * Math.sqrt(2)) / ((1 - P) * Math.log((2 - P * (2 - Math.sqrt(2))) / (2 - P * (2 + Math.sqrt(2)))));
      return Math.min(1, Math.max(0.5, isNaN(F) || !isFinite(F) ? 0.9 : F));
    }
    
    const sqrtTerm = Math.sqrt(R * R + 1);
    const numerator = sqrtTerm * Math.log((1 - P) / (1 - P * R));
    const term1 = (2 - P * (R + 1 - sqrtTerm)) / (2 - P * (R + 1 + sqrtTerm));
    const denominator = (R - 1) * Math.log(term1);
    
    const F = numerator / denominator;
    return Math.min(1, Math.max(0.5, isNaN(F) || !isFinite(F) ? 0.9 : F));
  };

  // NTU-effectiveness for counter flow
  const calculateEffectivenessCounter = (ntu: number, Cr: number): number => {
    if (Cr === 0) return 1 - Math.exp(-ntu);
    if (Cr === 1) return ntu / (1 + ntu);
    return (1 - Math.exp(-ntu * (1 - Cr))) / (1 - Cr * Math.exp(-ntu * (1 - Cr)));
  };

  // NTU-effectiveness for parallel flow
  const calculateEffectivenessParallel = (ntu: number, Cr: number): number => {
    if (Cr === 0) return 1 - Math.exp(-ntu);
    return (1 - Math.exp(-ntu * (1 + Cr))) / (1 + Cr);
  };

  useEffect(() => {
    const Thi = parseFloat(hotFluid.inletTemp);
    const Tho = parseFloat(hotFluid.outletTemp);
    const Tci = parseFloat(coldFluid.inletTemp);
    const Tco = parseFloat(coldFluid.outletTemp);
    const mh = parseFloat(hotFluid.flowRate); // kg/hr
    const mc = parseFloat(coldFluid.flowRate); // kg/hr
    const Cph = parseFloat(hotFluid.specificHeat); // kJ/kg·K
    const Cpc = parseFloat(coldFluid.specificHeat); // kJ/kg·K
    const U = parseFloat(overallU); // W/m²·K
    const A = parseFloat(area); // m²

    if ([Thi, Tho, Tci, Tco, mh, mc, Cph, Cpc].some(isNaN)) {
      setResults(null);
      return;
    }

    // Convert temperatures to Kelvin for calculations
    const ThiK = toKelvin(Thi, tempUnit);
    const ThoK = toKelvin(Tho, tempUnit);
    const TciK = toKelvin(Tci, tempUnit);
    const TcoK = toKelvin(Tco, tempUnit);

    // Heat capacity rates (kW/K)
    const Ch = (mh / 3600) * Cph; // Convert kg/hr to kg/s
    const Cc = (mc / 3600) * Cpc;
    
    const Cmin = Math.min(Ch, Cc);
    const Cmax = Math.max(Ch, Cc);
    const Cr = Cmin / Cmax; // Capacity ratio

    // Heat duty from hot side (kW)
    const Qh = Ch * (ThiK - ThoK);
    // Heat duty from cold side (kW)
    const Qc = Cc * (TcoK - TciK);
    
    // Use average or hot side heat duty
    const Q = Qh;

    // LMTD calculation
    let deltaT1: number, deltaT2: number;
    
    if (flowArrangement === "parallel") {
      deltaT1 = ThiK - TciK;
      deltaT2 = ThoK - TcoK;
    } else {
      // Counter flow (and as base for correction factor)
      deltaT1 = ThiK - TcoK;
      deltaT2 = ThoK - TciK;
    }

    // Prevent division by zero or log of negative
    if (deltaT1 <= 0 || deltaT2 <= 0) {
      setResults(null);
      return;
    }

    let lmtd: number;
    if (Math.abs(deltaT1 - deltaT2) < 0.001) {
      lmtd = deltaT1;
    } else {
      lmtd = (deltaT1 - deltaT2) / Math.log(deltaT1 / deltaT2);
    }

    // Calculate P and R for correction factor
    const P = (TcoK - TciK) / (ThiK - TciK);
    const R = (ThiK - ThoK) / (TcoK - TciK);

    // Correction factor
    const F = calculateCorrectionFactor(R, P, flowArrangement);
    const effectiveLmtd = lmtd * F;

    // NTU and effectiveness
    let ntu: number;
    let effectiveness: number;
    
    if (calculationMode === "design" && !isNaN(U)) {
      // Design mode: calculate required area
      const requiredArea = (Q * 1000) / (U * effectiveLmtd); // Q in kW, convert to W
      ntu = (U * requiredArea) / (Cmin * 1000); // Cmin in kW/K, convert to W/K
      
      if (flowArrangement === "parallel") {
        effectiveness = calculateEffectivenessParallel(ntu, Cr);
      } else {
        effectiveness = calculateEffectivenessCounter(ntu, Cr);
      }

      setResults({
        heatDuty: Q,
        lmtd,
        correctionFactor: F,
        effectiveLmtd,
        requiredArea,
        ntu,
        effectiveness,
        capacityRatio: Cr
      });
    } else if (calculationMode === "rating" && !isNaN(A) && !isNaN(U)) {
      // Rating mode: calculate outlet temperatures
      ntu = (U * A) / (Cmin * 1000);
      
      if (flowArrangement === "parallel") {
        effectiveness = calculateEffectivenessParallel(ntu, Cr);
      } else {
        effectiveness = calculateEffectivenessCounter(ntu, Cr);
      }

      // Maximum possible heat transfer
      const Qmax = Cmin * (ThiK - TciK);
      const Qactual = effectiveness * Qmax;

      // Calculate outlet temperatures
      const ThoCalcK = ThiK - Qactual / Ch;
      const TcoCalcK = TciK + Qactual / Cc;

      setResults({
        heatDuty: Qactual,
        lmtd,
        correctionFactor: F,
        effectiveLmtd,
        requiredArea: A,
        ntu,
        effectiveness,
        capacityRatio: Cr,
        hotOutletCalc: fromKelvin(ThoCalcK, tempUnit),
        coldOutletCalc: fromKelvin(TcoCalcK, tempUnit)
      });
    }
  }, [hotFluid, coldFluid, overallU, area, flowArrangement, calculationMode, tempUnit]);

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (isNaN(num) || !isFinite(num)) return "—";
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const getTempUnitLabel = () => {
    switch (tempUnit) {
      case "C": return "°C";
      case "F": return "°F";
      case "K": return "K";
    }
  };

  const FluidInputCard = ({
    title,
    fluid,
    setFluid,
    colorClass
  }: {
    title: string;
    fluid: FluidInputs;
    setFluid: (f: FluidInputs) => void;
    colorClass: string;
  }) => (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${colorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Inlet Temp ({getTempUnitLabel()})</Label>
            <Input
              type="number"
              value={fluid.inletTemp}
              onChange={(e) => setFluid({ ...fluid, inletTemp: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Outlet Temp ({getTempUnitLabel()})
              {calculationMode === "rating" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 inline ml-1 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Used as initial guess; actual value calculated</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Input
              type="number"
              value={fluid.outletTemp}
              onChange={(e) => setFluid({ ...fluid, outletTemp: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Flow Rate (kg/hr)</Label>
            <Input
              type="number"
              value={fluid.flowRate}
              onChange={(e) => setFluid({ ...fluid, flowRate: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cp (kJ/kg·K)</Label>
            <Input
              type="number"
              step="0.01"
              value={fluid.specificHeat}
              onChange={(e) => setFluid({ ...fluid, specificHeat: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Mode and Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 space-y-3">
            <Label className="text-xs text-muted-foreground">Calculation Mode</Label>
            <Tabs value={calculationMode} onValueChange={(v) => setCalculationMode(v as CalculationMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="design" className="text-xs">Design</TabsTrigger>
                <TabsTrigger value="rating" className="text-xs">Rating</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {calculationMode === "design" 
                ? "Calculate required heat transfer area"
                : "Calculate performance for given area"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 space-y-3">
            <Label className="text-xs text-muted-foreground">Flow Arrangement</Label>
            <Select value={flowArrangement} onValueChange={(v) => setFlowArrangement(v as FlowArrangement)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="counter">Counter Flow</SelectItem>
                <SelectItem value="parallel">Parallel Flow</SelectItem>
                <SelectItem value="shell-tube-1-2">Shell & Tube (1-2)</SelectItem>
                <SelectItem value="shell-tube-1-4">Shell & Tube (1-4)</SelectItem>
                <SelectItem value="crossflow-unmixed">Crossflow (Unmixed)</SelectItem>
                <SelectItem value="crossflow-mixed">Crossflow (Mixed)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 space-y-3">
            <Label className="text-xs text-muted-foreground">Temperature Unit</Label>
            <Select value={tempUnit} onValueChange={(v) => setTempUnit(v as TemperatureUnit)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">Celsius (°C)</SelectItem>
                <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                <SelectItem value="K">Kelvin (K)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Fluid Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FluidInputCard
          title="Hot Fluid"
          fluid={hotFluid}
          setFluid={setHotFluid}
          colorClass="bg-red-500"
        />
        <FluidInputCard
          title="Cold Fluid"
          fluid={coldFluid}
          setFluid={setColdFluid}
          colorClass="bg-blue-500"
        />
      </div>

      {/* Heat Transfer Parameters */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-primary" />
            Heat Transfer Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Overall U (W/m²·K)</Label>
              <Input
                type="number"
                value={overallU}
                onChange={(e) => setOverallU(e.target.value)}
                className="h-9"
              />
            </div>
            {calculationMode === "rating" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Area (m²)</Label>
                <Input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hot Fouling (m²·K/W)</Label>
              <Input
                type="number"
                step="0.0001"
                value={hotFouling}
                onChange={(e) => setHotFouling(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cold Fouling (m²·K/W)</Label>
              <Input
                type="number"
                step="0.0001"
                value={coldFouling}
                onChange={(e) => setColdFouling(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Results
              <Badge variant="outline" className="ml-auto text-xs font-normal">
                {calculationMode === "design" ? "Design Mode" : "Rating Mode"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Heat Duty</p>
                <p className="text-lg font-semibold text-primary">
                  {formatNumber(results.heatDuty)} <span className="text-sm font-normal">kW</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">LMTD</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.lmtd)} <span className="text-sm font-normal">{getTempUnitLabel()}</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Correction Factor (F)</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.correctionFactor, 3)}
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Effective LMTD</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.effectiveLmtd)} <span className="text-sm font-normal">{getTempUnitLabel()}</span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Secondary Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">
                  {calculationMode === "design" ? "Required Area" : "Given Area"}
                </p>
                <p className="text-lg font-semibold text-primary">
                  {formatNumber(results.requiredArea)} <span className="text-sm font-normal">m²</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">NTU</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.ntu, 3)}
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Effectiveness (ε)</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.effectiveness * 100, 1)} <span className="text-sm font-normal">%</span>
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">Capacity Ratio (Cr)</p>
                <p className="text-lg font-semibold">
                  {formatNumber(results.capacityRatio, 3)}
                </p>
              </div>
            </div>

            {/* Rating mode outlet temperatures */}
            {calculationMode === "rating" && results.hotOutletCalc !== undefined && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-muted-foreground">Calculated Hot Outlet</p>
                    <p className="text-lg font-semibold text-red-400">
                      {formatNumber(results.hotOutletCalc)} <span className="text-sm font-normal">{getTempUnitLabel()}</span>
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">Calculated Cold Outlet</p>
                    <p className="text-lg font-semibold text-blue-400">
                      {formatNumber(results.coldOutletCalc!)} <span className="text-sm font-normal">{getTempUnitLabel()}</span>
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Temperature Profile Visualization */}
            <Separator />
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-3">Temperature Profile</p>
              <div className="flex items-center justify-between gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Hot In</p>
                  <p className="text-sm font-semibold text-red-400">{hotFluid.inletTemp}{getTempUnitLabel()}</p>
                </div>
                <div className="flex-1 h-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-300 rounded opacity-60" />
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-red-200" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Hot Out</p>
                  <p className="text-sm font-semibold text-red-300">
                    {calculationMode === "rating" && results.hotOutletCalc 
                      ? formatNumber(results.hotOutletCalc, 1)
                      : hotFluid.outletTemp}{getTempUnitLabel()}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 mt-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Cold In</p>
                  <p className="text-sm font-semibold text-blue-400">{coldFluid.inletTemp}{getTempUnitLabel()}</p>
                </div>
                <div className="flex-1 h-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded opacity-60" />
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Cold Out</p>
                  <p className="text-sm font-semibold text-blue-300">
                    {calculationMode === "rating" && results.coldOutletCalc 
                      ? formatNumber(results.coldOutletCalc, 1)
                      : coldFluid.outletTemp}{getTempUnitLabel()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HeatExchangerSizing;
