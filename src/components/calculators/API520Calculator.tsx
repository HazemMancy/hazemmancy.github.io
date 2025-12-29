import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// API 520 Vapor Relief Sizing - Eq. 3.1
const calculateVaporArea = (
  W: number, // Mass flow rate (lb/hr)
  C: number, // Coefficient from gas properties
  Kd: number, // Discharge coefficient
  P1: number, // Relieving pressure (psia)
  Kb: number, // Back pressure correction factor
  Kc: number, // Combination correction factor
  T: number, // Relieving temperature (°R)
  Z: number, // Compressibility factor
  M: number // Molecular weight
): number => {
  // A = W * sqrt(T*Z/M) / (C * Kd * P1 * Kb * Kc)
  return (W * Math.sqrt((T * Z) / M)) / (C * Kd * P1 * Kb * Kc);
};

// API 520 Liquid Relief Sizing - Eq. 3.5
const calculateLiquidArea = (
  Q: number, // Flow rate (gpm)
  G: number, // Specific gravity
  Kd: number, // Discharge coefficient
  Kw: number, // Back pressure correction factor
  Kc: number, // Combination correction factor
  Kv: number, // Viscosity correction factor
  P1: number, // Set pressure + overpressure (psig)
  P2: number // Total back pressure (psig)
): number => {
  // A = Q * sqrt(G) / (38 * Kd * Kw * Kc * Kv * sqrt(P1 - P2))
  const deltaP = P1 - P2;
  if (deltaP <= 0) return 0;
  return (Q * Math.sqrt(G)) / (38 * Kd * Kw * Kc * Kv * Math.sqrt(deltaP));
};

// Calculate C coefficient from k (specific heat ratio)
const calculateCCoefficient = (k: number): number => {
  // C = 520 * sqrt(k * (2/(k+1))^((k+1)/(k-1)))
  const term = Math.pow(2 / (k + 1), (k + 1) / (k - 1));
  return 520 * Math.sqrt(k * term);
};

// Calculate critical pressure ratio
const calculateCriticalRatio = (k: number): number => {
  return Math.pow(2 / (k + 1), k / (k - 1));
};

// Two-Phase Omega Method (API 520 Appendix D)
const calculateOmegaMethod = (
  W: number, // Total mass flow (lb/hr)
  P1: number, // Relieving pressure (psia)
  P2: number, // Back pressure (psia)
  x: number, // Inlet vapor mass fraction
  rhoL: number, // Liquid density (lb/ft³)
  rhoV: number, // Vapor density at inlet (lb/ft³)
  Kd: number, // Discharge coefficient
  k: number // Specific heat ratio
): { area: number; omega: number; G: number } => {
  // Calculate omega parameter
  const vL = 1 / rhoL;
  const vV = 1 / rhoV;
  const omega = x * vV / (x * vV + (1 - x) * vL) + 
                (1 - x) * vL * k / (x * vV + (1 - x) * vL);
  
  // Calculate pressure ratio
  const eta = P2 / P1;
  
  // Calculate critical pressure ratio for two-phase
  let etaC = 0.55 + 0.217 * Math.log(omega) - 0.046 * Math.pow(Math.log(omega), 2);
  etaC = Math.max(0.1, Math.min(0.95, etaC));
  
  // Calculate mass flux
  let G: number;
  if (eta < etaC) {
    // Critical flow
    G = 68.09 * Math.sqrt(P1 * rhoL * (1 - etaC) / omega);
  } else {
    // Subcritical flow
    G = 68.09 * Math.sqrt(P1 * rhoL * 2 * (1 - eta) * (eta - etaC + 1) / omega);
  }
  
  // Calculate required area
  const area = W / (G * 3600);
  
  return { area, omega, G };
};

// Steam Relief Sizing (API 520)
const calculateSteamArea = (
  W: number, // Steam flow rate (lb/hr)
  P1: number, // Relieving pressure (psia)
  Kd: number, // Discharge coefficient
  Kb: number, // Back pressure correction factor
  Kc: number, // Combination correction factor
  Kn: number, // Napier correction factor
  Ksh: number // Superheat correction factor
): number => {
  // For saturated steam: A = W / (51.5 * P1 * Kd * Kb * Kc * Kn * Ksh)
  return W / (51.5 * P1 * Kd * Kb * Kc * Kn * Ksh);
};

// Standard orifice designations
const ORIFICE_SIZES = [
  { designation: 'D', area: 0.110 },
  { designation: 'E', area: 0.196 },
  { designation: 'F', area: 0.307 },
  { designation: 'G', area: 0.503 },
  { designation: 'H', area: 0.785 },
  { designation: 'J', area: 1.287 },
  { designation: 'K', area: 1.838 },
  { designation: 'L', area: 2.853 },
  { designation: 'M', area: 3.600 },
  { designation: 'N', area: 4.340 },
  { designation: 'P', area: 6.380 },
  { designation: 'Q', area: 11.05 },
  { designation: 'R', area: 16.00 },
  { designation: 'T', area: 26.00 },
];

const selectOrifice = (requiredArea: number): { designation: string; area: number } | null => {
  for (const orifice of ORIFICE_SIZES) {
    if (orifice.area >= requiredArea) {
      return orifice;
    }
  }
  return null;
};

// Viscosity correction factor (API 520)
const calculateKv = (Re: number): number => {
  if (Re >= 100000) return 1.0;
  // Kv = (0.9935 + 2.878/sqrt(Re) + 342.75/Re^1.5)^-0.5
  return Math.pow(0.9935 + 2.878 / Math.sqrt(Re) + 342.75 / Math.pow(Re, 1.5), -0.5);
};

// Napier correction for high pressure steam
const calculateKn = (P1: number): number => {
  if (P1 <= 1500) return 1.0;
  if (P1 <= 3200) {
    return (0.1906 * P1 - 1000) / (0.2292 * P1 - 1061);
  }
  return 1.0;
};

export default function API520Calculator() {
  // Vapor inputs
  const [vaporInputs, setVaporInputs] = useState({
    massFlow: 10000, // lb/hr
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    temperature: 200, // °F
    molecularWeight: 29, // Air
    specificHeatRatio: 1.4,
    compressibility: 1.0,
    dischargeCoeff: 0.975, // Kd
    valveType: 'conventional' as 'conventional' | 'balanced' | 'pilot',
    ruptureDisk: false,
  });

  // Liquid inputs
  const [liquidInputs, setLiquidInputs] = useState({
    flowRate: 500, // gpm
    specificGravity: 1.0,
    viscosity: 1.0, // cP
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 0, // psig
    dischargeCoeff: 0.65, // Kd
    valveType: 'conventional' as 'conventional' | 'balanced',
    ruptureDisk: false,
  });

  // Two-phase inputs
  const [twoPhaseInputs, setTwoPhaseInputs] = useState({
    totalMassFlow: 50000, // lb/hr
    vaporFraction: 0.1, // mass fraction
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    liquidDensity: 50, // lb/ft³
    vaporDensity: 0.5, // lb/ft³
    specificHeatRatio: 1.3,
    dischargeCoeff: 0.85,
    ruptureDisk: false,
  });

  // Steam inputs
  const [steamInputs, setSteamInputs] = useState({
    massFlow: 10000, // lb/hr
    setPresure: 150, // psig
    overpressure: 10, // %
    backPressure: 14.7, // psia
    steamType: 'saturated' as 'saturated' | 'superheated',
    superheatTemp: 0, // °F above saturation
    dischargeCoeff: 0.975,
    valveType: 'conventional' as 'conventional' | 'balanced' | 'pilot',
    ruptureDisk: false,
  });

  // Vapor calculations
  const vaporResults = useMemo(() => {
    const P1_abs = vaporInputs.setPresure + 14.7; // Convert to psia
    const P1_relieving = P1_abs * (1 + vaporInputs.overpressure / 100); // Relieving pressure
    const T_abs = vaporInputs.temperature + 459.67; // Convert to °R
    
    // Calculate C coefficient
    const C = calculateCCoefficient(vaporInputs.specificHeatRatio);
    
    // Back pressure correction
    let Kb = 1.0;
    const backPressureRatio = vaporInputs.backPressure / P1_relieving;
    const criticalRatio = calculateCriticalRatio(vaporInputs.specificHeatRatio);
    
    if (vaporInputs.valveType === 'conventional') {
      Kb = backPressureRatio > criticalRatio ? 0.9 : 1.0; // Simplified
    } else if (vaporInputs.valveType === 'balanced') {
      if (backPressureRatio <= criticalRatio) {
        Kb = 1.0;
      } else {
        Kb = Math.sqrt(1 - Math.pow((backPressureRatio - criticalRatio) / (1 - criticalRatio), 2));
      }
    }
    
    // Combination correction (rupture disk)
    const Kc = vaporInputs.ruptureDisk ? 0.9 : 1.0;
    
    // Calculate required area
    const requiredArea = calculateVaporArea(
      vaporInputs.massFlow,
      C,
      vaporInputs.dischargeCoeff,
      P1_relieving,
      Kb,
      Kc,
      T_abs,
      vaporInputs.compressibility,
      vaporInputs.molecularWeight
    );
    
    // Select orifice
    const selectedOrifice = selectOrifice(requiredArea);
    
    // Check if critical flow
    const isCriticalFlow = backPressureRatio <= criticalRatio;
    
    return {
      relievingPressure: P1_relieving,
      C,
      Kb,
      Kc,
      criticalRatio,
      requiredArea,
      selectedOrifice,
      isCriticalFlow,
      backPressureRatio,
    };
  }, [vaporInputs]);

  // Liquid calculations
  const liquidResults = useMemo(() => {
    const P1 = liquidInputs.setPresure * (1 + liquidInputs.overpressure / 100);
    const P2 = liquidInputs.backPressure;
    
    // Back pressure correction for balanced valves
    let Kw = 1.0;
    if (liquidInputs.valveType === 'balanced') {
      const ratio = P2 / P1;
      Kw = ratio <= 0.5 ? 1.0 : 1.0 - 0.3 * (ratio - 0.5);
    }
    
    // Viscosity correction
    // First calculate area with Kv = 1
    const prelimArea = calculateLiquidArea(
      liquidInputs.flowRate,
      liquidInputs.specificGravity,
      liquidInputs.dischargeCoeff,
      Kw,
      liquidInputs.ruptureDisk ? 0.9 : 1.0,
      1.0, // Preliminary Kv
      P1,
      P2
    );
    
    // Calculate Reynolds number
    const U = liquidInputs.flowRate / (prelimArea * 2800); // Velocity
    const Re = (2800 * liquidInputs.flowRate * Math.sqrt(prelimArea)) / 
               (liquidInputs.viscosity * Math.sqrt(liquidInputs.specificGravity));
    
    const Kv = calculateKv(Math.abs(Re));
    
    // Final area calculation
    const Kc = liquidInputs.ruptureDisk ? 0.9 : 1.0;
    const requiredArea = calculateLiquidArea(
      liquidInputs.flowRate,
      liquidInputs.specificGravity,
      liquidInputs.dischargeCoeff,
      Kw,
      Kc,
      Kv,
      P1,
      P2
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      relievingPressure: P1,
      deltaP: P1 - P2,
      Kw,
      Kv,
      Kc,
      reynoldsNumber: Re,
      requiredArea,
      selectedOrifice,
    };
  }, [liquidInputs]);

  // Two-phase calculations
  const twoPhaseResults = useMemo(() => {
    const P1_abs = twoPhaseInputs.setPresure + 14.7;
    const P1_relieving = P1_abs * (1 + twoPhaseInputs.overpressure / 100);
    
    const Kc = twoPhaseInputs.ruptureDisk ? 0.9 : 1.0;
    
    const { area, omega, G } = calculateOmegaMethod(
      twoPhaseInputs.totalMassFlow,
      P1_relieving,
      twoPhaseInputs.backPressure,
      twoPhaseInputs.vaporFraction,
      twoPhaseInputs.liquidDensity,
      twoPhaseInputs.vaporDensity,
      twoPhaseInputs.dischargeCoeff,
      twoPhaseInputs.specificHeatRatio
    );
    
    const requiredArea = area / Kc;
    const selectedOrifice = selectOrifice(requiredArea);
    
    // Determine flow regime
    let flowRegime = 'Two-Phase';
    if (twoPhaseInputs.vaporFraction < 0.01) flowRegime = 'Predominantly Liquid';
    else if (twoPhaseInputs.vaporFraction > 0.99) flowRegime = 'Predominantly Vapor';
    
    return {
      relievingPressure: P1_relieving,
      omega,
      massFlux: G,
      requiredArea,
      selectedOrifice,
      flowRegime,
      Kc,
    };
  }, [twoPhaseInputs]);

  // Steam calculations
  const steamResults = useMemo(() => {
    const P1_abs = steamInputs.setPresure + 14.7;
    const P1_relieving = P1_abs * (1 + steamInputs.overpressure / 100);
    
    // Back pressure correction
    let Kb = 1.0;
    const backPressureRatio = steamInputs.backPressure / P1_relieving;
    if (steamInputs.valveType === 'balanced' && backPressureRatio > 0.55) {
      Kb = Math.sqrt(1 - Math.pow((backPressureRatio - 0.55) / 0.45, 2));
    }
    
    const Kc = steamInputs.ruptureDisk ? 0.9 : 1.0;
    const Kn = calculateKn(P1_relieving);
    
    // Superheat correction
    let Ksh = 1.0;
    if (steamInputs.steamType === 'superheated' && steamInputs.superheatTemp > 0) {
      // Simplified correlation
      Ksh = 1 / (1 + 0.00065 * steamInputs.superheatTemp);
    }
    
    const requiredArea = calculateSteamArea(
      steamInputs.massFlow,
      P1_relieving,
      steamInputs.dischargeCoeff,
      Kb,
      Kc,
      Kn,
      Ksh
    );
    
    const selectedOrifice = selectOrifice(requiredArea);
    
    return {
      relievingPressure: P1_relieving,
      Kb,
      Kc,
      Kn,
      Ksh,
      requiredArea,
      selectedOrifice,
    };
  }, [steamInputs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API 520/521 Relief Valve Sizing
            <Badge variant="outline" className="ml-2">API 520 Part I & II</Badge>
          </CardTitle>
          <CardDescription>
            Pressure relief device sizing for vapor, liquid, two-phase, and steam service per API 520/521
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="vapor" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="vapor">Vapor/Gas</TabsTrigger>
          <TabsTrigger value="liquid">Liquid</TabsTrigger>
          <TabsTrigger value="twophase">Two-Phase</TabsTrigger>
          <TabsTrigger value="steam">Steam</TabsTrigger>
        </TabsList>

        {/* Vapor Tab */}
        <TabsContent value="vapor" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mass Flow Rate (lb/hr)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.massFlow}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, massFlow: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.setPresure}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.overpressure}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psia)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.backPressure}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature (°F)</Label>
                    <Input
                      type="number"
                      value={vaporInputs.temperature}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, temperature: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Molecular Weight</Label>
                    <Input
                      type="number"
                      value={vaporInputs.molecularWeight}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, molecularWeight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specific Heat Ratio (k)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={vaporInputs.specificHeatRatio}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, specificHeatRatio: parseFloat(e.target.value) || 1.4 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Compressibility (Z)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={vaporInputs.compressibility}
                      onChange={(e) => setVaporInputs({ ...vaporInputs, compressibility: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Valve Type</Label>
                  <Select
                    value={vaporInputs.valveType}
                    onValueChange={(v) => setVaporInputs({ ...vaporInputs, valveType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="balanced">Balanced Bellows</SelectItem>
                      <SelectItem value="pilot">Pilot Operated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discharge Coefficient (Kd)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={vaporInputs.dischargeCoeff}
                    onChange={(e) => setVaporInputs({ ...vaporInputs, dischargeCoeff: parseFloat(e.target.value) || 0.975 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vaporRuptureDisk"
                    checked={vaporInputs.ruptureDisk}
                    onChange={(e) => setVaporInputs({ ...vaporInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="vaporRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Vapor Relief Sizing Results
                {vaporResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 520 Part I, Eq. 3.1</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{vaporResults.relievingPressure.toFixed(1)} psia</span></p>
                    <p className="text-sm">Critical Ratio (Pc/P1): <span className="font-mono font-medium">{vaporResults.criticalRatio.toFixed(4)}</span></p>
                    <p className="text-sm">Back Pressure Ratio: <span className="font-mono font-medium">{vaporResults.backPressureRatio.toFixed(4)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <div className="space-y-1">
                    <p className="text-sm">C Coefficient: <span className="font-mono font-medium">{vaporResults.C.toFixed(2)}</span></p>
                    <p className="text-sm">Kb (Back Pressure): <span className="font-mono font-medium">{vaporResults.Kb.toFixed(3)}</span></p>
                    <p className="text-sm">Kc (Combination): <span className="font-mono font-medium">{vaporResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{vaporResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {vaporResults.selectedOrifice ? `${vaporResults.selectedOrifice.designation} (${vaporResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                    <p className="text-sm">Flow Condition: <Badge variant={vaporResults.isCriticalFlow ? "default" : "secondary"}>
                      {vaporResults.isCriticalFlow ? 'Critical (Sonic)' : 'Subcritical'}
                    </Badge></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liquid Tab */}
        <TabsContent value="liquid" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Flow Rate (gpm)</Label>
                    <Input
                      type="number"
                      value={liquidInputs.flowRate}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, flowRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specific Gravity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={liquidInputs.specificGravity}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, specificGravity: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Viscosity (cP)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={liquidInputs.viscosity}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, viscosity: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={liquidInputs.setPresure}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={liquidInputs.overpressure}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={liquidInputs.backPressure}
                      onChange={(e) => setLiquidInputs({ ...liquidInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Valve Type</Label>
                  <Select
                    value={liquidInputs.valveType}
                    onValueChange={(v) => setLiquidInputs({ ...liquidInputs, valveType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="balanced">Balanced Bellows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discharge Coefficient (Kd)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={liquidInputs.dischargeCoeff}
                    onChange={(e) => setLiquidInputs({ ...liquidInputs, dischargeCoeff: parseFloat(e.target.value) || 0.65 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="liquidRuptureDisk"
                    checked={liquidInputs.ruptureDisk}
                    onChange={(e) => setLiquidInputs({ ...liquidInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="liquidRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Liquid Relief Sizing Results
                {liquidResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 520 Part I, Eq. 3.5</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{liquidResults.relievingPressure.toFixed(1)} psig</span></p>
                    <p className="text-sm">Differential Pressure: <span className="font-mono font-medium">{liquidResults.deltaP.toFixed(1)} psi</span></p>
                    <p className="text-sm">Reynolds Number: <span className="font-mono font-medium">{liquidResults.reynoldsNumber.toFixed(0)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Kw (Back Pressure): <span className="font-mono font-medium">{liquidResults.Kw.toFixed(3)}</span></p>
                    <p className="text-sm">Kv (Viscosity): <span className="font-mono font-medium">{liquidResults.Kv.toFixed(3)}</span></p>
                    <p className="text-sm">Kc (Combination): <span className="font-mono font-medium">{liquidResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{liquidResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {liquidResults.selectedOrifice ? `${liquidResults.selectedOrifice.designation} (${liquidResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Two-Phase Tab */}
        <TabsContent value="twophase" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Mass Flow (lb/hr)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.totalMassFlow}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, totalMassFlow: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vapor Mass Fraction</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={twoPhaseInputs.vaporFraction}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, vaporFraction: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.setPresure}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.overpressure}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psia)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.backPressure}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specific Heat Ratio (k)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={twoPhaseInputs.specificHeatRatio}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, specificHeatRatio: parseFloat(e.target.value) || 1.3 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Liquid Density (lb/ft³)</Label>
                    <Input
                      type="number"
                      value={twoPhaseInputs.liquidDensity}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, liquidDensity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vapor Density (lb/ft³)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={twoPhaseInputs.vaporDensity}
                      onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, vaporDensity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Discharge Coefficient (Kd)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={twoPhaseInputs.dischargeCoeff}
                    onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, dischargeCoeff: parseFloat(e.target.value) || 0.85 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="twoPhaseRuptureDisk"
                    checked={twoPhaseInputs.ruptureDisk}
                    onChange={(e) => setTwoPhaseInputs({ ...twoPhaseInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="twoPhaseRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Two-Phase Relief Sizing Results (Omega Method)
                {twoPhaseResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 520 Appendix D - Omega Parameter Method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Flow Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{twoPhaseResults.relievingPressure.toFixed(1)} psia</span></p>
                    <p className="text-sm">Flow Regime: <Badge variant="outline">{twoPhaseResults.flowRegime}</Badge></p>
                    <p className="text-sm">Omega (ω): <span className="font-mono font-medium">{twoPhaseResults.omega.toFixed(4)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Mass Flux</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Mass Flux (G): <span className="font-mono font-medium">{twoPhaseResults.massFlux.toFixed(1)} lb/ft²·s</span></p>
                    <p className="text-sm">Kc (Combination): <span className="font-mono font-medium">{twoPhaseResults.Kc.toFixed(2)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{twoPhaseResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {twoPhaseResults.selectedOrifice ? `${twoPhaseResults.selectedOrifice.designation} (${twoPhaseResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steam Tab */}
        <TabsContent value="steam" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Process Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Steam Flow Rate (lb/hr)</Label>
                    <Input
                      type="number"
                      value={steamInputs.massFlow}
                      onChange={(e) => setSteamInputs({ ...steamInputs, massFlow: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Pressure (psig)</Label>
                    <Input
                      type="number"
                      value={steamInputs.setPresure}
                      onChange={(e) => setSteamInputs({ ...steamInputs, setPresure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overpressure (%)</Label>
                    <Input
                      type="number"
                      value={steamInputs.overpressure}
                      onChange={(e) => setSteamInputs({ ...steamInputs, overpressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Back Pressure (psia)</Label>
                    <Input
                      type="number"
                      value={steamInputs.backPressure}
                      onChange={(e) => setSteamInputs({ ...steamInputs, backPressure: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Steam Type</Label>
                    <Select
                      value={steamInputs.steamType}
                      onValueChange={(v) => setSteamInputs({ ...steamInputs, steamType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saturated">Saturated</SelectItem>
                        <SelectItem value="superheated">Superheated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {steamInputs.steamType === 'superheated' && (
                    <div className="space-y-2">
                      <Label>Superheat (°F above sat.)</Label>
                      <Input
                        type="number"
                        value={steamInputs.superheatTemp}
                        onChange={(e) => setSteamInputs({ ...steamInputs, superheatTemp: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valve Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Valve Type</Label>
                  <Select
                    value={steamInputs.valveType}
                    onValueChange={(v) => setSteamInputs({ ...steamInputs, valveType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventional">Conventional</SelectItem>
                      <SelectItem value="balanced">Balanced Bellows</SelectItem>
                      <SelectItem value="pilot">Pilot Operated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discharge Coefficient (Kd)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={steamInputs.dischargeCoeff}
                    onChange={(e) => setSteamInputs({ ...steamInputs, dischargeCoeff: parseFloat(e.target.value) || 0.975 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="steamRuptureDisk"
                    checked={steamInputs.ruptureDisk}
                    onChange={(e) => setSteamInputs({ ...steamInputs, ruptureDisk: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="steamRuptureDisk">Rupture Disk Upstream (Kc = 0.9)</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Steam Relief Sizing Results
                {steamResults.selectedOrifice ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Per API 520 Part I - Steam Service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Pressure Parameters</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Relieving Pressure: <span className="font-mono font-medium">{steamResults.relievingPressure.toFixed(1)} psia</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Correction Factors</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Kb (Back Pressure): <span className="font-mono font-medium">{steamResults.Kb.toFixed(3)}</span></p>
                    <p className="text-sm">Kc (Combination): <span className="font-mono font-medium">{steamResults.Kc.toFixed(2)}</span></p>
                    <p className="text-sm">Kn (Napier): <span className="font-mono font-medium">{steamResults.Kn.toFixed(3)}</span></p>
                    <p className="text-sm">Ksh (Superheat): <span className="font-mono font-medium">{steamResults.Ksh.toFixed(3)}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Sizing Results</h4>
                  <div className="space-y-1">
                    <p className="text-sm">Required Area: <span className="font-mono font-medium">{steamResults.requiredArea.toFixed(4)} in²</span></p>
                    <p className="text-sm">Selected Orifice: <span className="font-mono font-medium">
                      {steamResults.selectedOrifice ? `${steamResults.selectedOrifice.designation} (${steamResults.selectedOrifice.area} in²)` : 'Exceeds T orifice'}
                    </span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reference Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API 520/521 Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Standard Orifice Designations</h4>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {ORIFICE_SIZES.map((o) => (
                  <div key={o.designation} className="flex justify-between bg-muted p-1 rounded">
                    <span className="font-mono font-medium">{o.designation}</span>
                    <span>{o.area} in²</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Key Equations</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Vapor:</strong> A = W√(TZ/M) / (C·Kd·P1·Kb·Kc)</li>
                <li>• <strong>Liquid:</strong> A = Q√G / (38·Kd·Kw·Kc·Kv·√ΔP)</li>
                <li>• <strong>Steam:</strong> A = W / (51.5·P1·Kd·Kb·Kc·Kn·Ksh)</li>
                <li>• <strong>Two-Phase:</strong> Omega (ω) parameter method per Appendix D</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
