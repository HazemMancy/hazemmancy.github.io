import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Flame, Wind, Thermometer, Gauge, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// API 2000 Constants
const LATENT_HEAT_HEXANE = 334; // kJ/kg (reference fluid)

export function API2000Calculator() {
  return (
    <Tabs defaultValue="thermal" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="thermal">Thermal Breathing</TabsTrigger>
        <TabsTrigger value="emergency">Emergency Venting</TabsTrigger>
        <TabsTrigger value="pump">Pump In/Out</TabsTrigger>
        <TabsTrigger value="sizing">Valve Sizing</TabsTrigger>
      </TabsList>

      <TabsContent value="thermal">
        <ThermalBreathingCalculator />
      </TabsContent>
      <TabsContent value="emergency">
        <EmergencyVentingCalculator />
      </TabsContent>
      <TabsContent value="pump">
        <PumpInOutCalculator />
      </TabsContent>
      <TabsContent value="sizing">
        <ValveSizingCalculator />
      </TabsContent>
    </Tabs>
  );
}

// Thermal Inbreathing/Outbreathing Calculator (API 2000 Section 4)
function ThermalBreathingCalculator() {
  const [tankCapacity, setTankCapacity] = useState(1000); // m³
  const [latitude, setLatitude] = useState<"0-42" | "42+">("0-42");
  const [insulated, setInsulated] = useState(false);
  const [insulationFactor, setInsulationFactor] = useState(1);
  const [flashPoint, setFlashPoint] = useState<"below37.8" | "above37.8">("below37.8");
  const [tankColor, setTankColor] = useState<"white" | "aluminum" | "gray" | "black">("white");
  
  const results = useMemo(() => {
    // API 2000 Table 4 - Thermal Outbreathing (Nm³/h per m³ tank capacity)
    // Based on latitude and tank size
    let outbreathingFactor: number;
    let inbreathingFactor: number;
    
    // Simplified factors from API 2000 curves
    if (latitude === "0-42") {
      // Lower latitudes - higher temperature swings
      if (tankCapacity <= 50) {
        outbreathingFactor = 0.32;
        inbreathingFactor = 0.20;
      } else if (tankCapacity <= 500) {
        outbreathingFactor = 0.16;
        inbreathingFactor = 0.10;
      } else if (tankCapacity <= 5000) {
        outbreathingFactor = 0.08;
        inbreathingFactor = 0.05;
      } else {
        outbreathingFactor = 0.04;
        inbreathingFactor = 0.025;
      }
    } else {
      // Higher latitudes - lower temperature swings
      if (tankCapacity <= 50) {
        outbreathingFactor = 0.24;
        inbreathingFactor = 0.16;
      } else if (tankCapacity <= 500) {
        outbreathingFactor = 0.12;
        inbreathingFactor = 0.08;
      } else if (tankCapacity <= 5000) {
        outbreathingFactor = 0.06;
        inbreathingFactor = 0.04;
      } else {
        outbreathingFactor = 0.03;
        inbreathingFactor = 0.02;
      }
    }
    
    // Color factor for outbreathing (solar heat gain)
    const colorFactors: Record<string, number> = {
      white: 1.0,
      aluminum: 1.15,
      gray: 1.30,
      black: 1.45
    };
    const colorFactor = colorFactors[tankColor];
    
    // Insulation reduction factor
    const insReductionFactor = insulated ? insulationFactor : 1.0;
    
    // Flash point factor (low flash point liquids have vapor space)
    const flashFactor = flashPoint === "below37.8" ? 1.0 : 0.5;
    
    // Calculate venting requirements
    const thermalOutbreathing = tankCapacity * outbreathingFactor * colorFactor * flashFactor / insReductionFactor;
    const thermalInbreathing = tankCapacity * inbreathingFactor / insReductionFactor;
    
    // Convert to SCFH (1 Nm³/h = 35.31 SCFH approximately)
    const outbreathingSCFH = thermalOutbreathing * 35.31;
    const inbreathingSCFH = thermalInbreathing * 35.31;
    
    return {
      thermalOutbreathing,
      thermalInbreathing,
      outbreathingSCFH,
      inbreathingSCFH,
      outbreathingFactor,
      inbreathingFactor,
      colorFactor,
      insReductionFactor
    };
  }, [tankCapacity, latitude, insulated, insulationFactor, flashPoint, tankColor]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Thermal Breathing Requirements (API 2000 Section 4)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tank Capacity (m³)</Label>
              <Input
                type="number"
                value={tankCapacity}
                onChange={(e) => setTankCapacity(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Latitude Zone</Label>
              <Select value={latitude} onValueChange={(v) => setLatitude(v as "0-42" | "42+")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-42">0° to 42° (Lower Latitudes)</SelectItem>
                  <SelectItem value="42+">Above 42° (Higher Latitudes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tank Color</Label>
              <Select value={tankColor} onValueChange={(v) => setTankColor(v as typeof tankColor)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White / Light</SelectItem>
                  <SelectItem value="aluminum">Aluminum / Metallic</SelectItem>
                  <SelectItem value="gray">Gray / Medium</SelectItem>
                  <SelectItem value="black">Dark / Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Flash Point</Label>
              <Select value={flashPoint} onValueChange={(v) => setFlashPoint(v as typeof flashPoint)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below37.8">Below 37.8°C (100°F)</SelectItem>
                  <SelectItem value="above37.8">Above 37.8°C (100°F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Insulated Tank</Label>
              <Select 
                value={insulated ? "yes" : "no"} 
                onValueChange={(v) => setInsulated(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No Insulation</SelectItem>
                  <SelectItem value="yes">Insulated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {insulated && (
              <div className="space-y-2">
                <Label>Insulation Reduction Factor</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={insulationFactor}
                  onChange={(e) => setInsulationFactor(parseFloat(e.target.value) || 1)}
                  className="no-spinner"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-orange-600">Thermal Outbreathing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Required Venting Capacity</Label>
                <p className="text-2xl font-bold text-orange-600">
                  {results.thermalOutbreathing.toFixed(2)} <span className="text-sm font-normal">Nm³/h</span>
                </p>
                <p className="text-muted-foreground">
                  ({results.outbreathingSCFH.toFixed(0)} SCFH)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-blue-600">Thermal Inbreathing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Required Vacuum Relief Capacity</Label>
                <p className="text-2xl font-bold text-blue-600">
                  {results.thermalInbreathing.toFixed(2)} <span className="text-sm font-normal">Nm³/h</span>
                </p>
                <p className="text-muted-foreground">
                  ({results.inbreathingSCFH.toFixed(0)} SCFH)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>API 2000 Section 4:</strong> Thermal breathing is caused by temperature changes 
          that expand/contract the vapor space. Outbreathing occurs during heating (daytime), 
          inbreathing during cooling (nighttime).
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Emergency Venting Calculator (API 2000 Section 5)
function EmergencyVentingCalculator() {
  const [wettedArea, setWettedArea] = useState(500); // m²
  const [designPressure, setDesignPressure] = useState(0.07); // bar gauge
  const [latentHeat, setLatentHeat] = useState(334); // kJ/kg
  const [molecularWeight, setMolecularWeight] = useState(86); // kg/kmol (hexane)
  const [reliefTemperature, setReliefTemperature] = useState(100); // °C
  const [environmentFactor, setEnvironmentFactor] = useState<"none" | "drainage" | "foam" | "insulated">("none");
  
  const results = useMemo(() => {
    // API 2000 Environmental factors (Table 5)
    const envFactors: Record<string, number> = {
      none: 1.0,
      drainage: 0.5,      // Adequate drainage with 15m+ to flame source
      foam: 0.3,          // Water spray or foam
      insulated: 0.3      // Approved insulation
    };
    const F = envFactors[environmentFactor];
    
    // API 2000 Heat input from fire (Equation 1)
    // Q = 43200 * F * A^0.82 (metric: kW)
    // For wetted area A in m², Q in kW
    const heatInput = 43.2 * F * Math.pow(wettedArea, 0.82); // kW
    
    // API 2000 Equation for venting requirement
    // W = Q / L (kg/h)
    // where L = latent heat (kJ/kg)
    const massVentRate = (heatInput * 3600) / latentHeat; // kg/h
    
    // Convert to volumetric flow at relief conditions
    // V = (W * R * T) / (P * MW)
    const R = 8.314; // kJ/(kmol·K)
    const T_K = reliefTemperature + 273.15;
    const P_abs = (designPressure + 1.01325) * 100; // kPa absolute
    
    // Volumetric flow at relief conditions (m³/h)
    const volumetricFlow = (massVentRate * R * T_K) / (P_abs * molecularWeight) * 1000;
    
    // Convert to standard conditions (Nm³/h at 0°C, 1 atm)
    const standardFlow = volumetricFlow * (P_abs / 101.325) * (273.15 / T_K);
    
    // SCFH conversion
    const scfh = standardFlow * 35.31;
    
    // API 2000 Equation 3 - Direct calculation for air equivalent
    // Qair = 208.9 * F * A^0.82 / sqrt(L * MW) (m³/h at 1 atm, 15.5°C)
    const airEquivalent = 208.9 * F * Math.pow(wettedArea, 0.82) / Math.sqrt(latentHeat * molecularWeight / 1000);
    
    return {
      heatInput,
      massVentRate,
      volumetricFlow,
      standardFlow,
      scfh,
      airEquivalent,
      environmentFactor: F
    };
  }, [wettedArea, designPressure, latentHeat, molecularWeight, reliefTemperature, environmentFactor]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            Emergency Venting for Fire Exposure (API 2000 Section 5)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Wetted Area (m²)</Label>
              <Input
                type="number"
                value={wettedArea}
                onChange={(e) => setWettedArea(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
              <p className="text-xs text-muted-foreground">Area in contact with liquid up to 9.14m height</p>
            </div>
            <div className="space-y-2">
              <Label>Design Pressure (barg)</Label>
              <Input
                type="number"
                step="0.01"
                value={designPressure}
                onChange={(e) => setDesignPressure(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Relief Temperature (°C)</Label>
              <Input
                type="number"
                value={reliefTemperature}
                onChange={(e) => setReliefTemperature(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Latent Heat of Vaporization (kJ/kg)</Label>
              <Input
                type="number"
                value={latentHeat}
                onChange={(e) => setLatentHeat(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Molecular Weight (kg/kmol)</Label>
              <Input
                type="number"
                value={molecularWeight}
                onChange={(e) => setMolecularWeight(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Environmental Factor</Label>
              <Select 
                value={environmentFactor} 
                onValueChange={(v) => setEnvironmentFactor(v as typeof environmentFactor)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Protection (F=1.0)</SelectItem>
                  <SelectItem value="drainage">Adequate Drainage (F=0.5)</SelectItem>
                  <SelectItem value="foam">Water Spray/Foam (F=0.3)</SelectItem>
                  <SelectItem value="insulated">Approved Insulation (F=0.3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Heat Input from Fire</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {results.heatInput.toFixed(1)} <span className="text-sm font-normal">kW</span>
            </p>
            <p className="text-muted-foreground text-sm">
              Q = 43.2 × F × A<sup>0.82</sup>
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-orange-600">Mass Vent Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {results.massVentRate.toFixed(1)} <span className="text-sm font-normal">kg/h</span>
            </p>
            <p className="text-muted-foreground text-sm">
              W = Q / L
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-600">Required Venting Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {results.standardFlow.toFixed(1)} <span className="text-sm font-normal">Nm³/h</span>
            </p>
            <p className="text-muted-foreground text-sm">
              ({results.scfh.toFixed(0)} SCFH)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Environmental Factor (F)</TableCell>
                <TableCell className="font-mono">{results.environmentFactor}</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Heat Input (Q)</TableCell>
                <TableCell className="font-mono">{results.heatInput.toFixed(2)}</TableCell>
                <TableCell>kW</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Mass Vent Rate</TableCell>
                <TableCell className="font-mono">{results.massVentRate.toFixed(2)}</TableCell>
                <TableCell>kg/h</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Volumetric Flow (at relief conditions)</TableCell>
                <TableCell className="font-mono">{results.volumetricFlow.toFixed(2)}</TableCell>
                <TableCell>m³/h</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Standard Flow</TableCell>
                <TableCell className="font-mono">{results.standardFlow.toFixed(2)}</TableCell>
                <TableCell>Nm³/h</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Air Equivalent (API Eq. 3)</TableCell>
                <TableCell className="font-mono">{results.airEquivalent.toFixed(2)}</TableCell>
                <TableCell>m³/h air</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>API 2000 Section 5:</strong> Emergency venting must handle heat input from fire 
          exposure. The wetted area is limited to the liquid surface in contact with the tank shell 
          up to 9.14m (30 ft) above grade.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Pump In/Out Calculator (API 2000 Section 4.3)
function PumpInOutCalculator() {
  const [pumpInRate, setPumpInRate] = useState(100); // m³/h liquid
  const [pumpOutRate, setPumpOutRate] = useState(80); // m³/h liquid
  const [vaporSpaceTemp, setVaporSpaceTemp] = useState(25); // °C
  const [flashVaporRate, setFlashVaporRate] = useState(0); // kg/h (for hot liquid filling)
  const [liquidMW, setLiquidMW] = useState(86); // molecular weight
  const [vaporPressure, setVaporPressure] = useState(0.5); // bar absolute
  
  const results = useMemo(() => {
    // Inbreathing from pump-out: 1 m³ liquid pumped out = 1 m³ air inbreathing
    const pumpOutInbreathing = pumpOutRate; // m³/h air
    
    // Outbreathing from pump-in: displaced vapor
    const pumpInOutbreathing = pumpInRate; // m³/h vapor
    
    // Additional flash vaporization (if any)
    const R = 8.314;
    const T_K = vaporSpaceTemp + 273.15;
    const flashVaporVolume = flashVaporRate > 0 
      ? (flashVaporRate * R * T_K) / (vaporPressure * 100 * liquidMW) * 1000 
      : 0;
    
    const totalOutbreathing = pumpInOutbreathing + flashVaporVolume;
    
    // Convert to SCFH
    const inbreathingSCFH = pumpOutInbreathing * 35.31;
    const outbreathingSCFH = totalOutbreathing * 35.31;
    
    return {
      pumpOutInbreathing,
      pumpInOutbreathing,
      flashVaporVolume,
      totalOutbreathing,
      inbreathingSCFH,
      outbreathingSCFH
    };
  }, [pumpInRate, pumpOutRate, vaporSpaceTemp, flashVaporRate, liquidMW, vaporPressure]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Pump In/Out Requirements (API 2000 Section 4.3)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Maximum Pump-In Rate (m³/h)</Label>
              <Input
                type="number"
                value={pumpInRate}
                onChange={(e) => setPumpInRate(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
              <p className="text-xs text-muted-foreground">Liquid filling rate</p>
            </div>
            <div className="space-y-2">
              <Label>Maximum Pump-Out Rate (m³/h)</Label>
              <Input
                type="number"
                value={pumpOutRate}
                onChange={(e) => setPumpOutRate(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
              <p className="text-xs text-muted-foreground">Liquid withdrawal rate</p>
            </div>
            <div className="space-y-2">
              <Label>Vapor Space Temperature (°C)</Label>
              <Input
                type="number"
                value={vaporSpaceTemp}
                onChange={(e) => setVaporSpaceTemp(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Flash Vapor Rate (kg/h)</Label>
              <Input
                type="number"
                value={flashVaporRate}
                onChange={(e) => setFlashVaporRate(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
              <p className="text-xs text-muted-foreground">For hot liquid inflow</p>
            </div>
            <div className="space-y-2">
              <Label>Liquid Molecular Weight</Label>
              <Input
                type="number"
                value={liquidMW}
                onChange={(e) => setLiquidMW(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Vapor Pressure (bar abs)</Label>
              <Input
                type="number"
                step="0.01"
                value={vaporPressure}
                onChange={(e) => setVaporPressure(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-blue-600">Inbreathing (Pump-Out)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label className="text-muted-foreground text-xs">Vacuum Relief Required</Label>
                <p className="text-2xl font-bold text-blue-600">
                  {results.pumpOutInbreathing.toFixed(1)} <span className="text-sm font-normal">m³/h</span>
                </p>
                <p className="text-muted-foreground">
                  ({results.inbreathingSCFH.toFixed(0)} SCFH)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-lg text-orange-600">Outbreathing (Pump-In)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label className="text-muted-foreground text-xs">Pressure Relief Required</Label>
                <p className="text-2xl font-bold text-orange-600">
                  {results.totalOutbreathing.toFixed(1)} <span className="text-sm font-normal">m³/h</span>
                </p>
                <p className="text-muted-foreground">
                  ({results.outbreathingSCFH.toFixed(0)} SCFH)
                </p>
              </div>
              {results.flashVaporVolume > 0 && (
                <div className="pt-2 border-t border-orange-500/20">
                  <Label className="text-muted-foreground text-xs">Includes Flash Vapor</Label>
                  <p className="text-sm">{results.flashVaporVolume.toFixed(1)} m³/h</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>API 2000 Section 4.3:</strong> When liquid is pumped into a tank, the vapor space 
          is displaced and must vent. When liquid is pumped out, air/inert gas must enter to prevent 
          vacuum collapse. These are typically the governing cases for normal venting.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Valve Sizing Calculator (API 2000 Annex B)
function ValveSizingCalculator() {
  const [requiredFlow, setRequiredFlow] = useState(500); // m³/h air
  const [setPressure, setSetPressure] = useState(0.035); // bar gauge
  const [setVacuum, setSetVacuum] = useState(0.025); // bar gauge (vacuum)
  const [gasMW, setGasMW] = useState(29); // air = 29
  const [gasTemp, setGasTemp] = useState(25); // °C
  const [valveType, setValveType] = useState<"pressure" | "vacuum" | "pvrv">("pvrv");
  
  const results = useMemo(() => {
    const T_K = gasTemp + 273.15;
    const R = 8.314;
    
    // API 2000 Annex B - Valve Sizing
    // Flow correction from air to actual gas
    // Q_actual = Q_air * sqrt(29/MW) * sqrt(T/288)
    const mwCorrection = Math.sqrt(29 / gasMW);
    const tempCorrection = Math.sqrt(T_K / 288.15);
    const correctedFlow = requiredFlow * mwCorrection * tempCorrection;
    
    // Pressure valve sizing (simplified approach)
    // Cv calculation for gas flow
    // Q = 963 * Cv * P1 * sqrt((ΔP/P1) / (T * SG))
    // For low pressure: approximate Cv calculation
    const P1_abs = 1.01325 + setPressure; // bar absolute
    const deltaP = setPressure; // pressure drop across valve
    const SG = gasMW / 29; // specific gravity relative to air
    
    // Simplified Cv for vent valves
    // Cv = Q / (963 * P1 * sqrt(deltaP/P1 / (T * SG)))
    const pressureCv = requiredFlow / (963 * P1_abs * Math.sqrt((deltaP / P1_abs) / (T_K * SG)));
    
    // Vacuum valve sizing
    const P2_abs = 1.01325 - setVacuum; // downstream pressure for vacuum
    const vacuumDeltaP = setVacuum;
    const vacuumCv = requiredFlow / (963 * 1.01325 * Math.sqrt((vacuumDeltaP / 1.01325) / (T_K * 1)));
    
    // Orifice area estimation (approximate)
    // A = Cv / 38.5 for valves (in²)
    const pressureOrifice = pressureCv / 38.5 * 645.16; // mm²
    const vacuumOrifice = vacuumCv / 38.5 * 645.16; // mm²
    
    // Equivalent diameter
    const pressureDiameter = Math.sqrt(4 * pressureOrifice / Math.PI);
    const vacuumDiameter = Math.sqrt(4 * vacuumOrifice / Math.PI);
    
    return {
      correctedFlow,
      mwCorrection,
      tempCorrection,
      pressureCv: isFinite(pressureCv) ? pressureCv : 0,
      vacuumCv: isFinite(vacuumCv) ? vacuumCv : 0,
      pressureOrifice: isFinite(pressureOrifice) ? pressureOrifice : 0,
      vacuumOrifice: isFinite(vacuumOrifice) ? vacuumOrifice : 0,
      pressureDiameter: isFinite(pressureDiameter) ? pressureDiameter : 0,
      vacuumDiameter: isFinite(vacuumDiameter) ? vacuumDiameter : 0
    };
  }, [requiredFlow, setPressure, setVacuum, gasMW, gasTemp, valveType]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5" />
            Pressure/Vacuum Relief Valve Sizing (API 2000 Annex B)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Required Flow (m³/h air equiv.)</Label>
              <Input
                type="number"
                value={requiredFlow}
                onChange={(e) => setRequiredFlow(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Set Pressure (barg)</Label>
              <Input
                type="number"
                step="0.001"
                value={setPressure}
                onChange={(e) => setSetPressure(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Set Vacuum (bar)</Label>
              <Input
                type="number"
                step="0.001"
                value={setVacuum}
                onChange={(e) => setSetVacuum(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Gas Molecular Weight</Label>
              <Input
                type="number"
                value={gasMW}
                onChange={(e) => setGasMW(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Gas Temperature (°C)</Label>
              <Input
                type="number"
                value={gasTemp}
                onChange={(e) => setGasTemp(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Valve Type</Label>
              <Select value={valveType} onValueChange={(v) => setValveType(v as typeof valveType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pvrv">Pressure/Vacuum (PVRV)</SelectItem>
                  <SelectItem value="pressure">Pressure Only</SelectItem>
                  <SelectItem value="vacuum">Vacuum Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {(valveType === "pressure" || valveType === "pvrv") && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="text-lg text-orange-600">Pressure Relief Valve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Valve Coefficient (Cv)</Label>
                  <p className="text-2xl font-bold text-orange-600">
                    {results.pressureCv.toFixed(2)}
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Orifice Area</Label>
                    <p className="font-semibold">{results.pressureOrifice.toFixed(0)} mm²</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Equiv. Diameter</Label>
                    <p className="font-semibold">{results.pressureDiameter.toFixed(1)} mm</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(valveType === "vacuum" || valveType === "pvrv") && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-lg text-blue-600">Vacuum Relief Valve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Valve Coefficient (Cv)</Label>
                  <p className="text-2xl font-bold text-blue-600">
                    {results.vacuumCv.toFixed(2)}
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Orifice Area</Label>
                    <p className="font-semibold">{results.vacuumOrifice.toFixed(0)} mm²</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Equiv. Diameter</Label>
                    <p className="font-semibold">{results.vacuumDiameter.toFixed(1)} mm</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flow Correction Factor</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>MW Correction</TableCell>
                <TableCell className="font-mono">{results.mwCorrection.toFixed(4)}</TableCell>
                <TableCell>√(29/MW)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Temperature Correction</TableCell>
                <TableCell className="font-mono">{results.tempCorrection.toFixed(4)}</TableCell>
                <TableCell>√(T/288.15)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Corrected Flow</TableCell>
                <TableCell className="font-mono">{results.correctedFlow.toFixed(2)}</TableCell>
                <TableCell>m³/h at actual conditions</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>API 2000 Annex B:</strong> Valve sizing should account for gas molecular weight 
          and temperature corrections. Always verify sizing with manufacturer flow capacity curves 
          at actual operating conditions.
        </AlertDescription>
      </Alert>
    </div>
  );
}
