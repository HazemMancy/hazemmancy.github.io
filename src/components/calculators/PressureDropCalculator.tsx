import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Gauge, ArrowRight, AlertTriangle, Info } from "lucide-react";

// Unit conversion factors to SI
const lengthToMeters: Record<string, number> = {
  m: 1,
  km: 1000,
};

const diameterToMeters: Record<string, number> = {
  mm: 0.001,
  in: 0.0254,
};

// Standard pipe dimensions (ID in mm) based on Nominal Diameter and Schedule
const pipeScheduleData: Record<string, Record<string, number>> = {
  "1/2": { "Sch 10": 17.12, "Sch 40": 15.80, "Sch 80": 13.87, "Sch 160": 11.74 },
  "3/4": { "Sch 10": 22.45, "Sch 40": 20.93, "Sch 80": 18.85, "Sch 160": 15.54 },
  "1": { "Sch 10": 27.86, "Sch 40": 26.64, "Sch 80": 24.31, "Sch 160": 20.70 },
  "1-1/4": { "Sch 10": 36.63, "Sch 40": 35.05, "Sch 80": 32.46, "Sch 160": 29.46 },
  "1-1/2": { "Sch 10": 42.72, "Sch 40": 40.89, "Sch 80": 38.10, "Sch 160": 33.98 },
  "2": { "Sch 10": 54.79, "Sch 40": 52.50, "Sch 80": 49.25, "Sch 160": 42.90 },
  "2-1/2": { "Sch 10": 66.90, "Sch 40": 62.71, "Sch 80": 59.00, "Sch 160": 53.98 },
  "3": { "Sch 10": 84.68, "Sch 40": 77.93, "Sch 80": 73.66, "Sch 160": 66.64 },
  "4": { "Sch 10": 108.20, "Sch 40": 102.26, "Sch 80": 97.18, "Sch 160": 87.32 },
  "6": { "Sch 10": 162.74, "Sch 40": 154.05, "Sch 80": 146.33, "Sch 160": 131.78 },
  "8": { "Sch 10": 214.96, "Sch 40": 202.72, "Sch 80": 193.68, "Sch 160": 173.99 },
  "10": { "Sch 10": 268.92, "Sch 40": 254.51, "Sch 80": 242.87, "Sch 160": 222.25 },
  "12": { "Sch 10": 320.42, "Sch 40": 303.23, "Sch 80": 288.90, "Sch 160": 264.67 },
  "14": { "Sch 10": 347.68, "Sch 40": 333.34, "Sch 80": 317.50, "Sch 160": 290.58 },
  "16": { "Sch 10": 398.02, "Sch 40": 381.00, "Sch 80": 363.52, "Sch 160": 333.34 },
  "18": { "Sch 10": 448.62, "Sch 40": 428.66, "Sch 80": 409.58, "Sch 160": 376.94 },
  "20": { "Sch 10": 498.44, "Sch 40": 477.82, "Sch 80": 455.62, "Sch 160": 419.10 },
  "24": { "Sch 10": 598.42, "Sch 40": 574.68, "Sch 80": 547.68, "Sch 160": 498.44 },
};

const nominalDiameters = Object.keys(pipeScheduleData);
const schedules = ["Sch 10", "Sch 40", "Sch 80", "Sch 160"];

const flowRateToM3s: Record<string, number> = {
  "m³/h": 1 / 3600,
  "m³/s": 1,
  "L/min": 1 / 60000,
  "L/s": 0.001,
  "gpm": 0.0000630902,
  "bbl/d": 0.00000184013,
  "mmscfd": 0.327741, // Million standard cubic feet per day to m³/s (at standard conditions)
  "Nm³/h": 1 / 3600, // Normal cubic meters per hour to m³/s
};

const densityToKgM3: Record<string, number> = {
  "kg/m³": 1,
  "lb/ft³": 16.0185,
  "g/cm³": 1000,
};

const viscosityToPas: Record<string, number> = {
  "cP": 0.001,
  "Pa·s": 1,
  "mPa·s": 0.001,
};

const roughnessToMeters: Record<string, number> = {
  mm: 0.001,
  μm: 0.000001,
  in: 0.0254,
};

const pressureFromPa: Record<string, number> = {
  Pa: 1,
  kPa: 0.001,
  bar: 0.00001,
  psi: 0.000145038,
  "kg/cm²": 0.0000101972,
};

// Common pipe roughness values (in mm)
const pipeRoughness: Record<string, number> = {
  "Carbon Steel": 0.045,
  "Stainless Steel": 0.015,
  "Cast Iron": 0.26,
  "Galvanized Steel": 0.15,
  "PVC/Plastic": 0.0015,
  "Copper": 0.0015,
  "Concrete": 1.0,
  "Custom": 0,
};

interface PressureDropCalculatorProps {
  flowPhase: "single" | "mixed";
}

const PressureDropCalculator = ({ flowPhase }: PressureDropCalculatorProps) => {
  // Input states
  const [pipeLength, setPipeLength] = useState<string>("100");
  const [lengthUnit, setLengthUnit] = useState<string>("m");
  const [nominalDiameter, setNominalDiameter] = useState<string>("4");
  const [schedule, setSchedule] = useState<string>("Sch 40");
  const [diameterUnit, setDiameterUnit] = useState<string>("mm");
  const [flowRate, setFlowRate] = useState<string>("50");
  const [flowRateUnit, setFlowRateUnit] = useState<string>("m³/h");
  const [density, setDensity] = useState<string>("1000");
  const [densityUnit, setDensityUnit] = useState<string>("kg/m³");
  const [viscosity, setViscosity] = useState<string>("1");
  const [viscosityUnit, setViscosityUnit] = useState<string>("cP");
  const [pipeMaterial, setPipeMaterial] = useState<string>("Carbon Steel");
  const [customRoughness, setCustomRoughness] = useState<string>("0.045");
  const [roughnessUnit, setRoughnessUnit] = useState<string>("mm");
  const [pressureUnit, setPressureUnit] = useState<string>("bar");

  // Get inside diameter from nominal diameter and schedule
  const insideDiameterMM = useMemo(() => {
    return pipeScheduleData[nominalDiameter]?.[schedule] || 0;
  }, [nominalDiameter, schedule]);

  // Convert inside diameter to selected unit for display
  const insideDiameterDisplay = useMemo(() => {
    if (diameterUnit === "in") {
      return (insideDiameterMM / 25.4).toFixed(3);
    }
    return insideDiameterMM.toFixed(2);
  }, [insideDiameterMM, diameterUnit]);

  // Convert all inputs to SI units
  const L_m = useMemo(() => parseFloat(pipeLength) * lengthToMeters[lengthUnit] || 0, [pipeLength, lengthUnit]);
  const D_m = useMemo(() => insideDiameterMM * 0.001, [insideDiameterMM]); // Always in meters
  const Q_m3s = useMemo(() => parseFloat(flowRate) * flowRateToM3s[flowRateUnit] || 0, [flowRate, flowRateUnit]);
  const rho = useMemo(() => parseFloat(density) * densityToKgM3[densityUnit] || 0, [density, densityUnit]);
  const mu = useMemo(() => parseFloat(viscosity) * viscosityToPas[viscosityUnit] || 0, [viscosity, viscosityUnit]);
  const epsilon_m = useMemo(() => {
    const roughnessValue = pipeMaterial === "Custom" 
      ? parseFloat(customRoughness) 
      : pipeRoughness[pipeMaterial];
    return (roughnessValue || 0) * roughnessToMeters[roughnessUnit];
  }, [pipeMaterial, customRoughness, roughnessUnit]);

  // Calculate velocity
  const velocity = useMemo(() => {
    if (D_m <= 0) return 0;
    const area = Math.PI * Math.pow(D_m / 2, 2);
    return Q_m3s / area;
  }, [Q_m3s, D_m]);

  // Calculate Reynolds number
  const reynoldsNumber = useMemo(() => {
    if (mu <= 0 || D_m <= 0) return 0;
    return (rho * velocity * D_m) / mu;
  }, [rho, velocity, D_m, mu]);

  // Determine flow regime
  const flowRegime = useMemo(() => {
    if (reynoldsNumber < 2300) return "Laminar";
    if (reynoldsNumber < 4000) return "Transitional";
    return "Turbulent";
  }, [reynoldsNumber]);

  // Calculate friction factor using Colebrook-White (iterative) or Haaland approximation
  const frictionFactor = useMemo(() => {
    if (reynoldsNumber <= 0 || D_m <= 0) return 0;
    
    // Laminar flow
    if (reynoldsNumber < 2300) {
      return 64 / reynoldsNumber;
    }
    
    // Turbulent flow - Haaland equation (explicit approximation of Colebrook-White)
    const relativeRoughness = epsilon_m / D_m;
    const term1 = relativeRoughness / 3.7;
    const term2 = 6.9 / reynoldsNumber;
    const f = Math.pow(-1.8 * Math.log10(Math.pow(term1, 1.11) + term2), -2);
    
    return f;
  }, [reynoldsNumber, epsilon_m, D_m]);

  // Calculate pressure drop using Darcy-Weisbach
  const pressureDropPa = useMemo(() => {
    if (D_m <= 0 || frictionFactor <= 0) return 0;
    // ΔP = f * (L/D) * (ρV²/2)
    return frictionFactor * (L_m / D_m) * (rho * Math.pow(velocity, 2) / 2);
  }, [frictionFactor, L_m, D_m, rho, velocity]);

  // Convert to selected unit
  const pressureDrop = useMemo(() => {
    return pressureDropPa * pressureFromPa[pressureUnit];
  }, [pressureDropPa, pressureUnit]);

  // Calculate head loss
  const headLoss = useMemo(() => {
    if (rho <= 0) return 0;
    return pressureDropPa / (rho * 9.81);
  }, [pressureDropPa, rho]);

  const isValidInput = L_m > 0 && D_m > 0 && Q_m3s > 0 && rho > 0 && mu > 0;

  if (flowPhase === "mixed") {
    return (
      <div className="space-y-8">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Gauge className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                  Mixed Phase <span className="text-primary">Pressure Drop</span>
                </h2>
                <p className="text-muted-foreground">Two-phase flow correlations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Mixed phase pressure drop calculations using Lockhart-Martinelli, Beggs-Brill, 
              and other two-phase flow correlations are being developed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Gauge className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                Single Phase <span className="text-primary">Pressure Drop</span>
              </h2>
              <p className="text-muted-foreground">Darcy-Weisbach equation for single-phase pipe flow</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipe Properties */}
        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-blue-500 font-bold text-sm">1</span>
              </div>
              <h3 className="font-heading font-semibold text-lg">Pipe Properties</h3>
            </div>

            <div className="space-y-5">
              {/* Pipe Length */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Length</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={pipeLength}
                    onChange={(e) => setPipeLength(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="100"
                  />
                  <Select value={lengthUnit} onValueChange={setLengthUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="km">km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nominal Diameter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nominal Diameter (NPS)</Label>
                <Select value={nominalDiameter} onValueChange={setNominalDiameter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {nominalDiameters.map((nd) => (
                      <SelectItem key={nd} value={nd}>
                        {nd}"
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Schedule</Label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((sch) => (
                      <SelectItem key={sch} value={sch}>
                        {sch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Inside Diameter Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Inside Diameter (ID)</Label>
                  <Select value={diameterUnit} onValueChange={setDiameterUnit}>
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xl font-mono font-bold text-primary">
                    {insideDiameterDisplay} <span className="text-sm font-normal">{diameterUnit}</span>
                  </p>
                </div>
              </div>

              {/* Pipe Material */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pipe Material</Label>
                <Select value={pipeMaterial} onValueChange={setPipeMaterial}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(pipeRoughness).map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Roughness */}
              {pipeMaterial === "Custom" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Surface Roughness (ε)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={customRoughness}
                      onChange={(e) => setCustomRoughness(e.target.value)}
                      className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.045"
                    />
                    <Select value={roughnessUnit} onValueChange={setRoughnessUnit}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="μm">μm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {pipeMaterial !== "Custom" && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    Surface Roughness: <span className="font-mono text-foreground">{pipeRoughness[pipeMaterial]} mm</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Flow Properties */}
        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-green-500 font-bold text-sm">2</span>
              </div>
              <h3 className="font-heading font-semibold text-lg">Flow Properties</h3>
            </div>

            <div className="space-y-5">
              {/* Flow Rate */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Volumetric Flow Rate</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={flowRate}
                    onChange={(e) => setFlowRate(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="50"
                  />
                  <Select value={flowRateUnit} onValueChange={setFlowRateUnit}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m³/h">m³/h</SelectItem>
                      <SelectItem value="m³/s">m³/s</SelectItem>
                      <SelectItem value="L/min">L/min</SelectItem>
                      <SelectItem value="L/s">L/s</SelectItem>
                      <SelectItem value="gpm">gpm</SelectItem>
                      <SelectItem value="bbl/d">bbl/d</SelectItem>
                      <SelectItem value="mmscfd">mmscfd</SelectItem>
                      <SelectItem value="Nm³/h">Nm³/h</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fluid Density */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fluid Density (ρ)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="1000"
                  />
                  <Select value={densityUnit} onValueChange={setDensityUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg/m³">kg/m³</SelectItem>
                      <SelectItem value="lb/ft³">lb/ft³</SelectItem>
                      <SelectItem value="g/cm³">g/cm³</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Viscosity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dynamic Viscosity (μ)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={viscosity}
                    onChange={(e) => setViscosity(e.target.value)}
                    className="flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="1"
                  />
                  <Select value={viscosityUnit} onValueChange={setViscosityUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cP">cP</SelectItem>
                      <SelectItem value="Pa·s">Pa·s</SelectItem>
                      <SelectItem value="mPa·s">mPa·s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick presets */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">Common Fluids (at 20°C):</p>
                <div className="flex flex-wrap gap-1">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 text-xs"
                    onClick={() => { setDensity("998"); setViscosity("1"); }}
                  >
                    Water
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 text-xs"
                    onClick={() => { setDensity("850"); setViscosity("3"); }}
                  >
                    Light Oil
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 text-xs"
                    onClick={() => { setDensity("1.2"); setViscosity("0.018"); }}
                  >
                    Air
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg">Results</h3>
            </div>

            {isValidInput ? (
              <div className="space-y-4">
                {/* Pressure Drop - Main Result */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Pressure Drop (ΔP)</span>
                    <Select value={pressureUnit} onValueChange={setPressureUnit}>
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">bar</SelectItem>
                        <SelectItem value="kPa">kPa</SelectItem>
                        <SelectItem value="Pa">Pa</SelectItem>
                        <SelectItem value="psi">psi</SelectItem>
                        <SelectItem value="kg/cm²">kg/cm²</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-3xl font-mono font-bold text-primary">
                    {pressureDrop.toFixed(4)}
                  </p>
                </div>

                {/* Head Loss */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-xs text-muted-foreground">Head Loss</span>
                  <p className="text-lg font-mono font-semibold">{headLoss.toFixed(3)} m</p>
                </div>

                {/* Flow Regime */}
                <div className="p-3 rounded-lg border border-border flex items-center justify-between">
                  <span className="text-sm">Flow Regime</span>
                  <Badge 
                    variant="outline"
                    className={
                      flowRegime === "Laminar" 
                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                        : flowRegime === "Turbulent"
                        ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }
                  >
                    {flowRegime}
                  </Badge>
                </div>

                {/* Intermediate Values */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Intermediate Values</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-xs text-muted-foreground block">Velocity</span>
                      <span className="font-mono">{velocity.toFixed(3)} m/s</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-xs text-muted-foreground block">Reynolds (Re)</span>
                      <span className="font-mono">{reynoldsNumber.toFixed(0)}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30 col-span-2">
                      <span className="text-xs text-muted-foreground block">Friction Factor (f)</span>
                      <span className="font-mono">{frictionFactor.toFixed(6)}</span>
                    </div>
                  </div>
                </div>

                {/* Velocity Warning */}
                {velocity > 3 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      High velocity ({velocity.toFixed(2)} m/s). Consider larger pipe diameter to reduce erosion risk.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm text-center">Enter valid values for all inputs to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equation Reference */}
      <Card className="border border-border">
        <CardContent className="p-6">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Equations Used
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Darcy-Weisbach</p>
              <p className="font-mono text-xs">ΔP = f × (L/D) × (ρV²/2)</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Reynolds Number</p>
              <p className="font-mono text-xs">Re = ρVD / μ</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Haaland (Turbulent f)</p>
              <p className="font-mono text-xs">1/√f = -1.8 log[(ε/3.7D)^1.11 + 6.9/Re]</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PressureDropCalculator;
