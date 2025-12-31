import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Info, Gauge, Thermometer, Wind, Zap, TrendingUp, HelpCircle } from 'lucide-react';
import CompressorPerformanceCurves from './CompressorPerformanceCurves';
import CompressorSelectionGuide from './CompressorSelectionGuide';
import CompressorGuide from './guides/CompressorGuide';

// Gas properties database
const gasDatabase: Record<string, { name: string; mw: number; k: number; z: number; cp: number }> = {
  air: { name: 'Air', mw: 28.97, k: 1.4, z: 1.0, cp: 1.005 },
  nitrogen: { name: 'Nitrogen', mw: 28.01, k: 1.4, z: 1.0, cp: 1.04 },
  oxygen: { name: 'Oxygen', mw: 32.0, k: 1.4, z: 1.0, cp: 0.918 },
  hydrogen: { name: 'Hydrogen', mw: 2.016, k: 1.41, z: 1.0, cp: 14.3 },
  methane: { name: 'Methane', mw: 16.04, k: 1.31, z: 0.998, cp: 2.22 },
  ethane: { name: 'Ethane', mw: 30.07, k: 1.19, z: 0.99, cp: 1.75 },
  propane: { name: 'Propane', mw: 44.1, k: 1.13, z: 0.98, cp: 1.67 },
  co2: { name: 'Carbon Dioxide', mw: 44.01, k: 1.29, z: 0.995, cp: 0.846 },
  ammonia: { name: 'Ammonia', mw: 17.03, k: 1.31, z: 0.99, cp: 2.06 },
  naturalGas: { name: 'Natural Gas (Typical)', mw: 18.5, k: 1.27, z: 0.95, cp: 2.1 },
  refGas: { name: 'Refinery Gas', mw: 22.0, k: 1.25, z: 0.92, cp: 1.9 },
  custom: { name: 'Custom Gas', mw: 28.97, k: 1.4, z: 1.0, cp: 1.005 }
};

// Compressor types with typical efficiencies
const compressorTypes: Record<string, { name: string; etaIsen: number; etaPoly: number; maxRatio: number; maxFlow: number }> = {
  centrifugal: { name: 'Centrifugal', etaIsen: 0.78, etaPoly: 0.82, maxRatio: 4.0, maxFlow: 500000 },
  axial: { name: 'Axial', etaIsen: 0.88, etaPoly: 0.90, maxRatio: 2.0, maxFlow: 1000000 },
  reciprocating: { name: 'Reciprocating', etaIsen: 0.82, etaPoly: 0.85, maxRatio: 10.0, maxFlow: 50000 },
  screw: { name: 'Screw (Rotary)', etaIsen: 0.75, etaPoly: 0.78, maxRatio: 6.0, maxFlow: 30000 },
  diaphragm: { name: 'Diaphragm', etaIsen: 0.70, etaPoly: 0.73, maxRatio: 10.0, maxFlow: 5000 }
};

interface CompressorInputs {
  gasType: string;
  molecularWeight: number;
  specificHeatRatio: number;
  compressibilityFactor: number;
  inletPressure: number;
  inletTemperature: number;
  dischargePressure: number;
  flowRate: number;
  flowUnit: string;
  pressureUnit: string;
  tempUnit: string;
  compressorType: string;
  isentropicEfficiency: number;
  polytropicEfficiency: number;
  mechanicalEfficiency: number;
  motorEfficiency: number;
  numberOfStages: number;
  intercoolerApproach: number;
}

interface CalculationResults {
  compressionRatio: number;
  ratioPerStage: number;
  isentropicHead: number;
  polytropicHead: number;
  dischargeTemp: number;
  dischargeTempPerStage: number[];
  isentropicPower: number;
  polytropicPower: number;
  shaftPower: number;
  motorPower: number;
  actualFlow: number;
  massFlow: number;
  specificPower: number;
  adiabaticEfficiency: number;
  // API 617 / ASME PTC 10 additional parameters
  polytropicExponent: number;
  schultzFactor: number;
  compressibilityX: number;
  compressibilityY: number;
  inletDensity: number;
  dischargeDensity: number;
  isentropicExponent: number;
}

const CompressorPowerCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<CompressorInputs>({
    gasType: 'air',
    molecularWeight: 28.97,
    specificHeatRatio: 1.4,
    compressibilityFactor: 1.0,
    inletPressure: 1.0,
    inletTemperature: 25,
    dischargePressure: 5.0,
    flowRate: 1000,
    flowUnit: 'nm3h',
    pressureUnit: 'bara',
    tempUnit: 'C',
    compressorType: 'centrifugal',
    isentropicEfficiency: 78,
    polytropicEfficiency: 82,
    mechanicalEfficiency: 98,
    motorEfficiency: 95,
    numberOfStages: 1,
    intercoolerApproach: 10
  });

  const [results, setResults] = useState<CalculationResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Unit conversion functions
  const convertPressure = (value: number, from: string, to: string): number => {
    const toBar: Record<string, number> = {
      bara: 1, barg: 1, psia: 0.0689476, psig: 0.0689476, kPa: 0.01, MPa: 10, atm: 1.01325
    };
    const barValue = value * toBar[from];
    return barValue / toBar[to];
  };

  const convertTemp = (value: number, from: string, to: string): number => {
    let kelvin: number;
    if (from === 'C') kelvin = value + 273.15;
    else if (from === 'F') kelvin = (value - 32) * 5/9 + 273.15;
    else kelvin = value;

    if (to === 'C') return kelvin - 273.15;
    if (to === 'F') return (kelvin - 273.15) * 9/5 + 32;
    return kelvin;
  };

  const convertFlow = (value: number, from: string, mw: number, T: number, P: number): number => {
    // Convert to kg/s as base unit
    const R = 8314.46 / mw; // J/(kg·K)
    const Tstd = 273.15 + 15; // Standard temp 15°C
    const Pstd = 101325; // Standard pressure Pa

    switch (from) {
      case 'nm3h': return (value * Pstd * mw) / (Tstd * 8314.46 * 3600);
      case 'sm3h': return (value * Pstd * mw) / (Tstd * 8314.46 * 3600);
      case 'am3h': return (value * P * 1e5 * mw) / ((T + 273.15) * 8314.46 * 3600);
      case 'scfm': return (value * 0.0283168 * 60 * Pstd * mw) / (Tstd * 8314.46 * 3600);
      case 'acfm': return (value * 0.0283168 * 60 * P * 1e5 * mw) / ((T + 273.15) * 8314.46 * 3600);
      case 'kgh': return value / 3600;
      case 'kgs': return value;
      case 'lbh': return value * 0.453592 / 3600;
      default: return value;
    }
  };

  // Handle gas type selection
  const handleGasTypeChange = (value: string) => {
    const gas = gasDatabase[value];
    setInputs(prev => ({
      ...prev,
      gasType: value,
      molecularWeight: gas.mw,
      specificHeatRatio: gas.k,
      compressibilityFactor: gas.z
    }));
  };

  // Handle compressor type selection
  const handleCompressorTypeChange = (value: string) => {
    const compressor = compressorTypes[value];
    setInputs(prev => ({
      ...prev,
      compressorType: value,
      isentropicEfficiency: compressor.etaIsen * 100,
      polytropicEfficiency: compressor.etaPoly * 100
    }));
  };

  // Main calculation
  useEffect(() => {
    const newWarnings: string[] = [];
    
    // Convert units
    const P1 = convertPressure(inputs.inletPressure, inputs.pressureUnit, 'bara');
    const P2 = convertPressure(inputs.dischargePressure, inputs.pressureUnit, 'bara');
    const T1 = convertTemp(inputs.inletTemperature, inputs.tempUnit, 'K');
    const massFlow = convertFlow(inputs.flowRate, inputs.flowUnit, inputs.molecularWeight, inputs.inletTemperature, P1);
    
    const k = inputs.specificHeatRatio;
    const Z1 = inputs.compressibilityFactor;
    const MW = inputs.molecularWeight;
    const Rgas = 8314.46 / MW; // J/(kg·K) - Specific gas constant
    const etaIsen = inputs.isentropicEfficiency / 100;
    const etaPoly = inputs.polytropicEfficiency / 100;
    const etaMech = inputs.mechanicalEfficiency / 100;
    const etaMotor = inputs.motorEfficiency / 100;
    const numStages = inputs.numberOfStages;
    
    // ============================================
    // API 617 / ASME PTC 10 / ISO 5389 Calculations
    // Reference: Schultz, J.M. (1962) "The Polytropic Analysis of Centrifugal Compressors"
    // ============================================
    
    // Compression ratio
    const compressionRatio = P2 / P1;
    const ratioPerStage = Math.pow(compressionRatio, 1 / numStages);
    
    // Check compression ratio limits
    const compressor = compressorTypes[inputs.compressorType];
    if (ratioPerStage > compressor.maxRatio) {
      newWarnings.push(`Compression ratio per stage (${ratioPerStage.toFixed(2)}) exceeds typical limit for ${compressor.name} (${compressor.maxRatio})`);
    }
    
    // Inlet density per API 617 (kg/m³)
    // ρ₁ = P₁ / (Z₁ × R × T₁)
    const P1_Pa = P1 * 1e5; // Convert bar to Pa
    const rho1 = P1_Pa / (Z1 * Rgas * T1);
    
    // Inlet specific volume (m³/kg)
    const v1 = 1 / rho1;
    
    // ============================================
    // Schultz Compressibility Functions (X and Y)
    // Per ASME PTC 10 and API 617
    // For ideal gas: X = 0, Y = 1
    // For real gas, these account for non-ideal behavior
    // ============================================
    
    // Reduced temperature and pressure for compressibility estimation
    // Using generalized correlations (simplified Lee-Kesler)
    const Pc_approx = 4.6 * MW; // Approximate critical pressure (bar) - rough estimate
    const Tc_approx = 1.2 * MW + 150; // Approximate critical temperature (K) - rough estimate
    const Tr1 = T1 / Tc_approx;
    const Pr1 = P1 / Pc_approx;
    
    // Schultz X function: X = (T/v)(∂v/∂T)_P - 1
    // For real gas with compressibility: X ≈ T × (∂Z/∂T)_P / Z
    // Simplified correlation based on reduced properties
    const X = Z1 < 0.99 ? (Tr1 - 1) * (1 - Z1) * 0.5 : 0;
    
    // Schultz Y function: Y = -(P/v)(∂v/∂P)_T
    // For ideal gas Y = 1, for real gas Y = 1 + P × (∂Z/∂P)_T / Z
    const Y = 1 + Pr1 * (1 - Z1) * 0.1;
    
    // ============================================
    // Polytropic Exponent per API 617 / ASME PTC 10
    // n = (k/Y) × [1 - ((k-1)/(X+1)) × ((1-ηp)/ηp)]
    // ============================================
    const nPoly = (k / Y) * (1 - ((k - 1) / (X + 1)) * ((1 - etaPoly) / etaPoly));
    
    // Isentropic exponent (accounting for real gas effects)
    // For ideal gas: ns = k, for real gas: ns = k × Y / (1 + X)
    const ns = k * Y / (1 + X);
    
    // ============================================
    // Discharge Temperature per API 617
    // T₂ = T₁ × (P₂/P₁)^m where m = (n-1)/n × (1+X)/Y
    // ============================================
    const m = ((nPoly - 1) / nPoly) * ((1 + X) / Y);
    
    // Calculate discharge temperatures for each stage
    const dischargeTempPerStage: number[] = [];
    let T_in = T1;
    for (let i = 0; i < numStages; i++) {
      const T_out = T_in * Math.pow(ratioPerStage, m);
      dischargeTempPerStage.push(T_out - 273.15);
      // Apply intercooler for next stage (except last stage)
      if (i < numStages - 1) {
        T_in = T1 + inputs.intercoolerApproach;
      }
    }
    
    // Final discharge temperature
    let T2: number;
    if (numStages > 1) {
      // Multi-stage with intercooling
      let T_current = T1;
      for (let i = 0; i < numStages; i++) {
        T_current = T_current * Math.pow(ratioPerStage, m);
        if (i < numStages - 1) {
          T_current = T1 + inputs.intercoolerApproach;
        }
      }
      T2 = T_current;
    } else {
      T2 = T1 * Math.pow(compressionRatio, m);
    }
    const dischargeTemp = T2 - 273.15;
    
    // Discharge compressibility (estimated)
    const Tr2 = T2 / Tc_approx;
    const Pr2 = P2 / Pc_approx;
    const Z2 = Z1 * (1 + 0.1 * (Pr2 - Pr1) - 0.05 * (Tr2 - Tr1)); // Simplified correlation
    const Z2_bounded = Math.max(0.5, Math.min(1.1, Z2));
    
    // Discharge density (kg/m³)
    const P2_Pa = P2 * 1e5;
    const rho2 = P2_Pa / (Z2_bounded * Rgas * T2);
    
    // Discharge specific volume (m³/kg)
    const v2 = 1 / rho2;
    
    // ============================================
    // Schultz Head Factor (f) per ASME PTC 10
    // Corrects polytropic head for real gas behavior
    // f = ln(P₂/P₁) × (Z₂v₂ - Z₁v₁) / (Z₂v₂ × ln(Z₂v₂/Z₁v₁))
    // For ideal gas f → 1
    // ============================================
    const Z1v1 = Z1 * v1;
    const Z2v2 = Z2_bounded * v2;
    let schultzF: number;
    
    if (Math.abs(Z2v2 - Z1v1) < 0.001 * Z1v1) {
      // Nearly ideal gas behavior
      schultzF = 1.0;
    } else {
      const lnPratio = Math.log(P2 / P1);
      const lnZvRatio = Math.log(Z2v2 / Z1v1);
      schultzF = lnPratio * (Z2v2 - Z1v1) / (Z2v2 * lnZvRatio);
    }
    // Bound Schultz factor to reasonable range
    schultzF = Math.max(0.9, Math.min(1.1, schultzF));
    
    // ============================================
    // Isentropic Head per API 617 (J/kg)
    // Hs = (Z₁ × R × T₁ × k / (k-1)) × [(P₂/P₁)^((k-1)/k) - 1]
    // ============================================
    const isentropicHead = (Z1 * Rgas * T1 * k / (k - 1)) * (Math.pow(compressionRatio, (k - 1) / k) - 1);
    
    // ============================================
    // Polytropic Head per API 617 / ASME PTC 10 (J/kg)
    // Hp = f × (Z₁ × R × T₁ × n / (n-1)) × [(P₂/P₁)^((n-1)/n) - 1]
    // Including Schultz correction factor
    // ============================================
    const polytropicHead = schultzF * (Z1 * Rgas * T1 * nPoly / (nPoly - 1)) * (Math.pow(compressionRatio, (nPoly - 1) / nPoly) - 1);
    
    // ============================================
    // Power Calculations per API 617
    // Gas Power = ṁ × Hp / ηp (for polytropic)
    // Shaft Power = Gas Power / ηmech
    // Motor Power = Shaft Power / ηmotor
    // ============================================
    const isentropicPower = (massFlow * isentropicHead) / 1000; // kW
    const polytropicPower = (massFlow * polytropicHead) / 1000; // kW
    const shaftPower = polytropicPower / etaMech;
    const motorPower = shaftPower / etaMotor;
    
    // Actual volumetric flow at inlet conditions (m³/h)
    const actualFlow = (massFlow / rho1) * 3600;
    
    // Specific power (kW per 100 Nm³/h)
    // Normal conditions: 0°C (273.15 K), 101.325 kPa
    const nm3hFlow = (massFlow * 3600 * 8314.46 * 273.15) / (MW * 101325);
    const specificPower = nm3hFlow > 0 ? (motorPower / nm3hFlow) * 100 : 0;
    
    // ============================================
    // Warnings per API 617 Guidelines
    // ============================================
    if (dischargeTemp > 200) {
      newWarnings.push(`High discharge temperature (${dischargeTemp.toFixed(0)}°C) exceeds API 617 limit of 200°C - consider adding intercooling or stages`);
    }
    if (dischargeTemp > 150 && inputs.compressorType === 'centrifugal') {
      newWarnings.push('Discharge temperature exceeds 150°C - verify seal and bearing design ratings');
    }
    if (compressionRatio > 10 && numStages === 1) {
      newWarnings.push('High compression ratio - multi-stage compression recommended per API 617');
    }
    if (P1 < 0.5) {
      newWarnings.push('Very low suction pressure may cause surge or cavitation issues');
    }
    if (Z1 < 0.85) {
      newWarnings.push('Low compressibility factor indicates significant real gas effects - verify Z-factor with equation of state');
    }
    if (schultzF < 0.95 || schultzF > 1.05) {
      newWarnings.push(`Schultz factor (${schultzF.toFixed(3)}) indicates significant real gas deviation - consider detailed thermodynamic analysis`);
    }
    
    setResults({
      compressionRatio,
      ratioPerStage,
      isentropicHead: isentropicHead / 1000, // Convert to kJ/kg
      polytropicHead: polytropicHead / 1000,
      dischargeTemp,
      dischargeTempPerStage,
      isentropicPower,
      polytropicPower,
      shaftPower,
      motorPower,
      actualFlow,
      massFlow: massFlow * 3600, // kg/h
      specificPower,
      adiabaticEfficiency: etaIsen * 100,
      // API 617 / ASME PTC 10 parameters
      polytropicExponent: nPoly,
      schultzFactor: schultzF,
      compressibilityX: X,
      compressibilityY: Y,
      inletDensity: rho1,
      dischargeDensity: rho2,
      isentropicExponent: ns
    });
    
    setWarnings(newWarnings);
  }, [inputs]);

  const handleInputChange = (field: keyof CompressorInputs, value: string | number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Compressor Power Calculator</h2>
          <p className="text-muted-foreground">Gas compression power and discharge temperature analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="gas" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="gas">Gas</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="compressor">Compressor</TabsTrigger>
              <TabsTrigger value="staging">Staging</TabsTrigger>
              <TabsTrigger value="curves" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Curves
              </TabsTrigger>
              <TabsTrigger value="guide" className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Guide
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wind className="h-5 w-5" />
                    Gas Selection & Properties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gas Type</Label>
                      <Select value={inputs.gasType} onValueChange={handleGasTypeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(gasDatabase).map(([key, gas]) => (
                            <SelectItem key={key} value={key}>{gas.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Molecular Weight (kg/kmol)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="no-spinner"
                        value={inputs.molecularWeight}
                        onChange={(e) => handleInputChange('molecularWeight', parseFloat(e.target.value) || 0)}
                        disabled={inputs.gasType !== 'custom'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Specific Heat Ratio (k = Cp/Cv)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="no-spinner"
                        value={inputs.specificHeatRatio}
                        onChange={(e) => handleInputChange('specificHeatRatio', parseFloat(e.target.value) || 0)}
                        disabled={inputs.gasType !== 'custom'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Compressibility Factor (Z)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="no-spinner"
                        value={inputs.compressibilityFactor}
                        onChange={(e) => handleInputChange('compressibilityFactor', parseFloat(e.target.value) || 0)}
                        disabled={inputs.gasType !== 'custom'}
                      />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <span>Select "Custom Gas" to manually enter properties for non-standard gases</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Operating Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Pressure Unit</Label>
                      <Select value={inputs.pressureUnit} onValueChange={(v) => handleInputChange('pressureUnit', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bara">bar (a)</SelectItem>
                          <SelectItem value="barg">bar (g)</SelectItem>
                          <SelectItem value="psia">psi (a)</SelectItem>
                          <SelectItem value="psig">psi (g)</SelectItem>
                          <SelectItem value="kPa">kPa (a)</SelectItem>
                          <SelectItem value="MPa">MPa (a)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature Unit</Label>
                      <Select value={inputs.tempUnit} onValueChange={(v) => handleInputChange('tempUnit', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="C">°C</SelectItem>
                          <SelectItem value="F">°F</SelectItem>
                          <SelectItem value="K">K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Flow Unit</Label>
                      <Select value={inputs.flowUnit} onValueChange={(v) => handleInputChange('flowUnit', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nm3h">Nm³/h</SelectItem>
                          <SelectItem value="sm3h">Sm³/h</SelectItem>
                          <SelectItem value="am3h">Am³/h</SelectItem>
                          <SelectItem value="scfm">SCFM</SelectItem>
                          <SelectItem value="acfm">ACFM</SelectItem>
                          <SelectItem value="kgh">kg/h</SelectItem>
                          <SelectItem value="kgs">kg/s</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h4 className="font-medium text-primary">Suction Conditions</h4>
                      <div className="space-y-2">
                        <Label>Inlet Pressure ({inputs.pressureUnit})</Label>
                        <Input
                          type="number"
                          step="0.1"
                          className="no-spinner"
                          value={inputs.inletPressure}
                          onChange={(e) => handleInputChange('inletPressure', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Inlet Temperature (°{inputs.tempUnit})</Label>
                        <Input
                          type="number"
                          step="1"
                          className="no-spinner"
                          value={inputs.inletTemperature}
                          onChange={(e) => handleInputChange('inletTemperature', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium text-primary">Discharge & Flow</h4>
                      <div className="space-y-2">
                        <Label>Discharge Pressure ({inputs.pressureUnit})</Label>
                        <Input
                          type="number"
                          step="0.1"
                          className="no-spinner"
                          value={inputs.dischargePressure}
                          onChange={(e) => handleInputChange('dischargePressure', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Flow Rate ({inputs.flowUnit})</Label>
                        <Input
                          type="number"
                          step="10"
                          className="no-spinner"
                          value={inputs.flowRate}
                          onChange={(e) => handleInputChange('flowRate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compressor" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Compressor Type & Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Compressor Type</Label>
                      <Select value={inputs.compressorType} onValueChange={handleCompressorTypeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(compressorTypes).map(([key, comp]) => (
                            <SelectItem key={key} value={key}>{comp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>Isentropic Efficiency</Label>
                        <span className="text-sm font-medium text-primary">{inputs.isentropicEfficiency}%</span>
                      </div>
                      <Slider
                        value={[inputs.isentropicEfficiency]}
                        onValueChange={(v) => handleInputChange('isentropicEfficiency', v[0])}
                        min={50}
                        max={95}
                        step={1}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>Polytropic Efficiency</Label>
                        <span className="text-sm font-medium text-primary">{inputs.polytropicEfficiency}%</span>
                      </div>
                      <Slider
                        value={[inputs.polytropicEfficiency]}
                        onValueChange={(v) => handleInputChange('polytropicEfficiency', v[0])}
                        min={50}
                        max={95}
                        step={1}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>Mechanical Efficiency</Label>
                        <span className="text-sm font-medium text-primary">{inputs.mechanicalEfficiency}%</span>
                      </div>
                      <Slider
                        value={[inputs.mechanicalEfficiency]}
                        onValueChange={(v) => handleInputChange('mechanicalEfficiency', v[0])}
                        min={90}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>Motor Efficiency</Label>
                        <span className="text-sm font-medium text-primary">{inputs.motorEfficiency}%</span>
                      </div>
                      <Slider
                        value={[inputs.motorEfficiency]}
                        onValueChange={(v) => handleInputChange('motorEfficiency', v[0])}
                        min={85}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Typical Efficiencies:</strong> Centrifugal (78-85%), Axial (88-92%), 
                      Reciprocating (82-88%), Screw (75-82%), Diaphragm (70-78%)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staging" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Thermometer className="h-5 w-5" />
                    Multi-Stage Compression
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Stages</Label>
                      <Select 
                        value={inputs.numberOfStages.toString()} 
                        onValueChange={(v) => handleInputChange('numberOfStages', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Single Stage</SelectItem>
                          <SelectItem value="2">2 Stages</SelectItem>
                          <SelectItem value="3">3 Stages</SelectItem>
                          <SelectItem value="4">4 Stages</SelectItem>
                          <SelectItem value="5">5 Stages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Intercooler Approach (°C)</Label>
                      <Input
                        type="number"
                        step="1"
                        className="no-spinner"
                        value={inputs.intercoolerApproach}
                        onChange={(e) => handleInputChange('intercoolerApproach', parseFloat(e.target.value) || 0)}
                        disabled={inputs.numberOfStages === 1}
                      />
                    </div>
                  </div>

                  {results && inputs.numberOfStages > 1 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Stage Discharge Temperatures</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {results.dischargeTempPerStage.map((temp, idx) => (
                          <div key={idx} className="p-2 bg-muted/50 rounded text-center">
                            <span className="text-xs text-muted-foreground">Stage {idx + 1}</span>
                            <p className="font-medium">{temp.toFixed(1)}°C</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <p className="text-sm">
                      <strong>Staging Guideline:</strong> Use multiple stages when compression ratio exceeds 
                      3-4 for centrifugal, or 6-8 for reciprocating compressors. Intercooling between stages 
                      reduces power consumption and discharge temperature.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Curves Tab */}
            <TabsContent value="curves" className="space-y-4">
              {results && (
                <CompressorPerformanceCurves
                  operatingFlow={results.actualFlow}
                  operatingHead={results.polytropicHead}
                  operatingEfficiency={inputs.polytropicEfficiency}
                  compressionRatio={results.compressionRatio}
                  compressorType={inputs.compressorType}
                />
              )}
              {!results && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Enter operating conditions to generate performance curves
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Guide Tab */}
            <TabsContent value="guide" className="space-y-4">
              <CompressorGuide />
            </TabsContent>
          </Tabs>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {/* Warnings */}
          {warnings.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-yellow-700 dark:text-yellow-400">{warning}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Results */}
          {results && (
            <>
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Power Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-background/60 rounded-lg">
                      <p className="text-xs text-muted-foreground">Isentropic Power</p>
                      <p className="text-xl font-bold text-foreground">{results.isentropicPower.toFixed(1)} kW</p>
                    </div>
                    <div className="p-3 bg-background/60 rounded-lg">
                      <p className="text-xs text-muted-foreground">Polytropic Power</p>
                      <p className="text-xl font-bold text-foreground">{results.polytropicPower.toFixed(1)} kW</p>
                    </div>
                    <div className="p-3 bg-background/60 rounded-lg">
                      <p className="text-xs text-muted-foreground">Shaft Power</p>
                      <p className="text-xl font-bold text-foreground">{results.shaftPower.toFixed(1)} kW</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <p className="text-xs text-muted-foreground">Motor Power</p>
                      <p className="text-2xl font-bold text-primary">{results.motorPower.toFixed(1)} kW</p>
                    </div>
                  </div>
                  <div className="p-2 bg-muted/30 rounded text-center">
                    <p className="text-xs text-muted-foreground">Specific Power</p>
                    <p className="font-medium">{results.specificPower.toFixed(2)} kW per 100 Nm³/h</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Compression Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="text-sm text-muted-foreground">Compression Ratio</span>
                      <Badge variant="secondary">{results.compressionRatio.toFixed(2)}</Badge>
                    </div>
                    {inputs.numberOfStages > 1 && (
                      <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                        <span className="text-sm text-muted-foreground">Ratio per Stage</span>
                        <Badge variant="outline">{results.ratioPerStage.toFixed(2)}</Badge>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="text-sm text-muted-foreground">Polytropic Exponent (n)</span>
                      <span className="font-medium">{results.polytropicExponent.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="text-sm text-muted-foreground">Isentropic Head</span>
                      <span className="font-medium">{results.isentropicHead.toFixed(1)} kJ/kg</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="text-sm text-muted-foreground">Polytropic Head</span>
                      <span className="font-medium">{results.polytropicHead.toFixed(1)} kJ/kg</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Thermometer className="h-5 w-5" />
                    Discharge Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-blue-500/10 to-red-500/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Discharge Temperature</p>
                    <p className={`text-2xl font-bold ${results.dischargeTemp > 150 ? 'text-red-500' : 'text-foreground'}`}>
                      {results.dischargeTemp.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/30 rounded text-center">
                      <p className="text-xs text-muted-foreground">Mass Flow</p>
                      <p className="font-medium">{results.massFlow.toFixed(1)} kg/h</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded text-center">
                      <p className="text-xs text-muted-foreground">Actual Vol. Flow</p>
                      <p className="font-medium">{results.actualFlow.toFixed(1)} m³/h</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded text-center">
                      <p className="text-xs text-muted-foreground">Inlet Density</p>
                      <p className="font-medium">{results.inletDensity.toFixed(2)} kg/m³</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded text-center">
                      <p className="text-xs text-muted-foreground">Discharge Density</p>
                      <p className="font-medium">{results.dischargeDensity.toFixed(2)} kg/m³</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API 617 / ASME PTC 10 Parameters */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    API 617 / ASME PTC 10 Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-muted-foreground">Schultz Factor (f)</p>
                      <p className="font-medium">{results.schultzFactor.toFixed(4)}</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-muted-foreground">Isentropic Exp. (ns)</p>
                      <p className="font-medium">{results.isentropicExponent.toFixed(4)}</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-muted-foreground">Comp. Function X</p>
                      <p className="font-medium">{results.compressibilityX.toFixed(4)}</p>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <p className="text-muted-foreground">Comp. Function Y</p>
                      <p className="font-medium">{results.compressibilityY.toFixed(4)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    Calculations per API 617, ASME PTC 10, and Schultz polytropic method
                  </p>
                </CardContent>
              </Card>

              {/* Status indicator */}
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                warnings.length === 0 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-yellow-500/10 border border-yellow-500/30'
              }`}>
                {warnings.length === 0 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-400">Operating within recommended limits</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-yellow-700 dark:text-yellow-400">Review warnings above</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompressorPowerCalculator;
