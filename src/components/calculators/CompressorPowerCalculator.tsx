import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Info, Gauge, Thermometer, Wind, Zap, TrendingUp, HelpCircle } from 'lucide-react';
import CompressorPerformanceCurves from './CompressorPerformanceCurves';
import CompressorSelectionGuide from './CompressorSelectionGuide';

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
    const Z = inputs.compressibilityFactor;
    const MW = inputs.molecularWeight;
    const R = 8314.46 / MW; // J/(kg·K)
    const etaIsen = inputs.isentropicEfficiency / 100;
    const etaPoly = inputs.polytropicEfficiency / 100;
    const etaMech = inputs.mechanicalEfficiency / 100;
    const etaMotor = inputs.motorEfficiency / 100;
    const n = inputs.numberOfStages;
    
    // Compression ratio
    const compressionRatio = P2 / P1;
    const ratioPerStage = Math.pow(compressionRatio, 1 / n);
    
    // Check compression ratio limits
    const compressor = compressorTypes[inputs.compressorType];
    if (ratioPerStage > compressor.maxRatio) {
      newWarnings.push(`Compression ratio per stage (${ratioPerStage.toFixed(2)}) exceeds typical limit for ${compressor.name} (${compressor.maxRatio})`);
    }
    
    // Polytropic exponent
    const nPoly = 1 / (1 - ((k - 1) / (k * etaPoly)));
    
    // Calculate discharge temperatures for each stage
    const dischargeTempPerStage: number[] = [];
    let T_in = T1;
    for (let i = 0; i < n; i++) {
      const T_out = T_in * Math.pow(ratioPerStage, (k - 1) / (k * etaIsen));
      dischargeTempPerStage.push(T_out - 273.15);
      // Apply intercooler for next stage (except last stage)
      if (i < n - 1) {
        T_in = T1 + inputs.intercoolerApproach;
      }
    }
    
    // Final discharge temperature (without intercooling on last stage)
    const T2_isen = T1 * Math.pow(compressionRatio, (k - 1) / k);
    const T2_actual = T1 + (T2_isen - T1) / etaIsen;
    
    // For multi-stage with intercooling
    let T2_staged = T1;
    for (let i = 0; i < n; i++) {
      const T_out = T2_staged * Math.pow(ratioPerStage, (k - 1) / k);
      T2_staged = T2_staged + (T_out - T2_staged) / etaIsen;
      if (i < n - 1) {
        T2_staged = T1 + inputs.intercoolerApproach;
      }
    }
    
    const dischargeTemp = n > 1 ? T2_staged - 273.15 : T2_actual - 273.15;
    
    // Isentropic head (J/kg)
    const isentropicHead = (Z * R * T1 * k / (k - 1)) * (Math.pow(compressionRatio, (k - 1) / k) - 1);
    
    // Polytropic head (J/kg)
    const polytropicHead = (Z * R * T1 * nPoly / (nPoly - 1)) * (Math.pow(compressionRatio, (nPoly - 1) / nPoly) - 1);
    
    // Power calculations (W to kW)
    const isentropicPower = (massFlow * isentropicHead) / 1000;
    const polytropicPower = (massFlow * polytropicHead) / 1000;
    const shaftPower = polytropicPower / etaMech;
    const motorPower = shaftPower / etaMotor;
    
    // Actual volumetric flow at inlet conditions (m³/h)
    const actualFlow = (massFlow * Z * R * T1) / (P1 * 1e5) * 3600;
    
    // Specific power (kW per 100 Nm³/h)
    const nm3hFlow = (massFlow * 3600 * 8314.46 * 288.15) / (MW * 101325);
    const specificPower = (motorPower / nm3hFlow) * 100;
    
    // Additional warnings
    if (dischargeTemp > 200) {
      newWarnings.push(`High discharge temperature (${dischargeTemp.toFixed(0)}°C) - consider adding cooling or stages`);
    }
    if (compressionRatio > 10 && n === 1) {
      newWarnings.push('High compression ratio - consider multi-stage compression');
    }
    if (P1 < 0.5) {
      newWarnings.push('Very low suction pressure may cause cavitation issues');
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
      adiabaticEfficiency: etaIsen * 100
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
                          value={inputs.inletPressure}
                          onChange={(e) => handleInputChange('inletPressure', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Inlet Temperature (°{inputs.tempUnit})</Label>
                        <Input
                          type="number"
                          step="1"
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
                          value={inputs.dischargePressure}
                          onChange={(e) => handleInputChange('dischargePressure', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Flow Rate ({inputs.flowUnit})</Label>
                        <Input
                          type="number"
                          step="10"
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
                    <div className="space-y-2">
                      <Label>Isentropic Efficiency (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={inputs.isentropicEfficiency}
                        onChange={(e) => handleInputChange('isentropicEfficiency', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Polytropic Efficiency (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={inputs.polytropicEfficiency}
                        onChange={(e) => handleInputChange('polytropicEfficiency', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mechanical Efficiency (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={inputs.mechanicalEfficiency}
                        onChange={(e) => handleInputChange('mechanicalEfficiency', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Motor Efficiency (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={inputs.motorEfficiency}
                        onChange={(e) => handleInputChange('motorEfficiency', parseFloat(e.target.value) || 0)}
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

            {/* Selection Guide Tab */}
            <TabsContent value="guide" className="space-y-4">
              {results && (
                <CompressorSelectionGuide
                  flowRate={results.actualFlow}
                  compressionRatio={results.compressionRatio}
                  molecularWeight={inputs.molecularWeight}
                  dischargePressure={convertPressure(inputs.dischargePressure, inputs.pressureUnit, 'bara')}
                  gasType={inputs.gasType}
                />
              )}
              {!results && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Enter operating conditions to see selection recommendations
                  </CardContent>
                </Card>
              )}
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
                  </div>
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
