import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Info, Droplets, Wind, AlertTriangle, Thermometer, Database } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ComposedChart,
  ReferenceArea,
} from 'recharts';
import { getFluidProperties, getFluidsByCategory, fluidDatabase } from '@/lib/fluidProperties';
import { getNominalSizes, getSchedulesForSize, getInsideDiameter } from '@/lib/pipeSchedule';

// Unit conversion factors
const lengthConversions: Record<string, number> = {
  'm': 1,
  'mm': 0.001,
  'in': 0.0254,
  'ft': 0.3048,
};

const velocityConversions: Record<string, number> = {
  'm/s': 1,
  'ft/s': 0.3048,
  'm/min': 1 / 60,
  'ft/min': 0.3048 / 60,
};

const densityConversions: Record<string, number> = {
  'kg/m³': 1,
  'lb/ft³': 16.0185,
  'g/cm³': 1000,
};

const viscosityConversions: Record<string, number> = {
  'Pa·s': 1,
  'cP': 0.001,
  'mPa·s': 0.001,
  'lb/(ft·s)': 1.48816,
};

const roughnessConversions: Record<string, number> = {
  'mm': 0.001,
  'm': 1,
  'in': 0.0254,
  'μm': 0.000001,
};

const flowRateConversions: Record<string, number> = {
  'm³/h': 1 / 3600,
  'm³/s': 1,
  'L/min': 0.001 / 60,
  'L/s': 0.001,
  'gpm': 0.0000630902,
  'ft³/s': 0.0283168,
  'bbl/d': 0.00000184013,
};

// Standard pipe roughness values (in meters)
const pipeRoughness: Record<string, number> = {
  'Commercial Steel': 0.000045,
  'Stainless Steel': 0.000015,
  'Carbon Steel (new)': 0.000046,
  'Carbon Steel (corroded)': 0.00015,
  'Cast Iron': 0.00026,
  'Galvanized Iron': 0.00015,
  'PVC': 0.0000015,
  'HDPE': 0.000007,
  'Copper': 0.0000015,
  'Concrete': 0.003,
  'Glass': 0.0000015,
  'Custom': 0,
};

interface CalculatorInputs {
  inputType: 'velocity' | 'flowRate';
  velocity: number;
  velocityUnit: string;
  flowRate: number;
  flowRateUnit: string;
  diameter: number;
  diameterUnit: string;
  density: number;
  densityUnit: string;
  viscosity: number;
  viscosityUnit: string;
  roughnessMaterial: string;
  roughness: number;
  roughnessUnit: string;
  // Fluid database
  selectedFluid: string;
  fluidTemperature: number;
  // Pipe schedule
  useSchedule: boolean;
  nominalSize: string;
  schedule: string;
}

const ReynoldsFrictionCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    inputType: 'velocity',
    velocity: 2.0,
    velocityUnit: 'm/s',
    flowRate: 100,
    flowRateUnit: 'm³/h',
    diameter: 100,
    diameterUnit: 'mm',
    density: 1000,
    densityUnit: 'kg/m³',
    viscosity: 1.0,
    viscosityUnit: 'cP',
    roughnessMaterial: 'Commercial Steel',
    roughness: 0.045,
    roughnessUnit: 'mm',
    selectedFluid: '',
    fluidTemperature: 25,
    useSchedule: false,
    nominalSize: '4"',
    schedule: '40/STD',
  });

  // Get fluid categories for grouped dropdown
  const fluidCategories = useMemo(() => getFluidsByCategory(), []);
  
  // Get available schedules for selected nominal size
  const availableSchedules = useMemo(() => 
    getSchedulesForSize(inputs.nominalSize), 
    [inputs.nominalSize]
  );

  // Get nominal sizes
  const nominalSizes = useMemo(() => getNominalSizes(), []);

  const updateInput = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
    setInputs(prev => {
      const newInputs = { ...prev, [key]: value };
      
      // Auto-update roughness when material changes
      if (key === 'roughnessMaterial' && value !== 'Custom') {
        const roughnessM = pipeRoughness[value as string];
        const roughnessInUnit = roughnessM / roughnessConversions[prev.roughnessUnit];
        newInputs.roughness = parseFloat(roughnessInUnit.toPrecision(4));
      }
      
      // Auto-update fluid properties when fluid or temperature changes
      if (key === 'selectedFluid' || key === 'fluidTemperature') {
        const fluidKey = key === 'selectedFluid' ? value as string : prev.selectedFluid;
        const temp = key === 'fluidTemperature' ? value as number : prev.fluidTemperature;
        
        if (fluidKey && fluidKey !== '__manual__' && !fluidKey.startsWith('__category_')) {
          const props = getFluidProperties(fluidKey, temp);
          if (props) {
            // Convert density to current unit
            const densityInUnit = props.density / densityConversions[prev.densityUnit];
            newInputs.density = parseFloat(densityInUnit.toPrecision(4));
            
            // Viscosity from database is in cP, convert to current unit
            const viscosityPas = props.viscosity * 0.001; // cP to Pa·s
            const viscosityInUnit = viscosityPas / viscosityConversions[prev.viscosityUnit];
            newInputs.viscosity = parseFloat(viscosityInUnit.toPrecision(4));
          }
        }
      }
      
      // Auto-update diameter when pipe schedule changes
      if (key === 'useSchedule' && value === true) {
        const diameterMM = getInsideDiameter(prev.nominalSize, prev.schedule);
        if (diameterMM !== null) {
          const diameterInUnit = (diameterMM * 0.001) / lengthConversions[prev.diameterUnit];
          newInputs.diameter = parseFloat(diameterInUnit.toPrecision(4));
        }
      }
      
      if ((key === 'nominalSize' || key === 'schedule') && prev.useSchedule) {
        const nomSize = key === 'nominalSize' ? value as string : prev.nominalSize;
        let sched = key === 'schedule' ? value as string : prev.schedule;
        
        // If changing nominal size, check if current schedule exists
        if (key === 'nominalSize') {
          const availScheds = getSchedulesForSize(nomSize);
          if (!availScheds.includes(sched)) {
            sched = availScheds.includes('40/STD') ? '40/STD' : availScheds[0] || sched;
            newInputs.schedule = sched;
          }
        }
        
        const diameterMM = getInsideDiameter(nomSize, sched);
        if (diameterMM !== null) {
          const diameterInUnit = (diameterMM * 0.001) / lengthConversions[prev.diameterUnit];
          newInputs.diameter = parseFloat(diameterInUnit.toPrecision(4));
        }
      }
      
      // Convert values when units change (keep physical value constant)
      if (key === 'velocityUnit') {
        const oldFactor = velocityConversions[prev.velocityUnit];
        const newFactor = velocityConversions[value as string];
        newInputs.velocity = parseFloat((prev.velocity * oldFactor / newFactor).toPrecision(6));
      }
      if (key === 'flowRateUnit') {
        const oldFactor = flowRateConversions[prev.flowRateUnit];
        const newFactor = flowRateConversions[value as string];
        newInputs.flowRate = parseFloat((prev.flowRate * oldFactor / newFactor).toPrecision(6));
      }
      if (key === 'diameterUnit') {
        const oldFactor = lengthConversions[prev.diameterUnit];
        const newFactor = lengthConversions[value as string];
        newInputs.diameter = parseFloat((prev.diameter * oldFactor / newFactor).toPrecision(6));
      }
      if (key === 'densityUnit') {
        const oldFactor = densityConversions[prev.densityUnit];
        const newFactor = densityConversions[value as string];
        newInputs.density = parseFloat((prev.density * oldFactor / newFactor).toPrecision(6));
      }
      if (key === 'viscosityUnit') {
        const oldFactor = viscosityConversions[prev.viscosityUnit];
        const newFactor = viscosityConversions[value as string];
        newInputs.viscosity = parseFloat((prev.viscosity * oldFactor / newFactor).toPrecision(6));
      }
      if (key === 'roughnessUnit') {
        const oldFactor = roughnessConversions[prev.roughnessUnit];
        const newFactor = roughnessConversions[value as string];
        newInputs.roughness = parseFloat((prev.roughness * oldFactor / newFactor).toPrecision(4));
      }
      
      return newInputs;
    });
  };

  // Convert all inputs to SI units and calculate
  const results = useMemo(() => {
    // Convert to SI
    const D = inputs.diameter * lengthConversions[inputs.diameterUnit]; // m
    const rho = inputs.density * densityConversions[inputs.densityUnit]; // kg/m³
    const mu = inputs.viscosity * viscosityConversions[inputs.viscosityUnit]; // Pa·s
    const epsilon = inputs.roughness * roughnessConversions[inputs.roughnessUnit]; // m
    
    // Calculate velocity
    let V: number;
    if (inputs.inputType === 'velocity') {
      V = inputs.velocity * velocityConversions[inputs.velocityUnit]; // m/s
    } else {
      const Q = inputs.flowRate * flowRateConversions[inputs.flowRateUnit]; // m³/s
      const A = Math.PI * Math.pow(D, 2) / 4; // m²
      V = Q / A; // m/s
    }
    
    // Kinematic viscosity
    const nu = mu / rho; // m²/s
    
    // Reynolds number
    const Re = (rho * V * D) / mu;
    
    // Relative roughness
    const relativeRoughness = epsilon / D;
    
    // Flow regime
    let regime: 'Laminar' | 'Transitional' | 'Turbulent';
    let regimeColor: string;
    if (Re < 2300) {
      regime = 'Laminar';
      regimeColor = 'text-green-600';
    } else if (Re < 4000) {
      regime = 'Transitional';
      regimeColor = 'text-yellow-600';
    } else {
      regime = 'Turbulent';
      regimeColor = 'text-red-600';
    }
    
    // Friction factor calculations
    let f_laminar: number | null = null;
    let f_colebrook: number | null = null;
    let f_swamee: number | null = null;
    let f_haaland: number | null = null;
    let colebrookIterations = 0;
    
    // Laminar friction factor (Hagen-Poiseuille)
    if (Re > 0) {
      f_laminar = 64 / Re;
    }
    
    // Turbulent correlations (valid for Re > 4000)
    if (Re >= 4000) {
      // Swamee-Jain equation (explicit approximation)
      // Valid for 10^-6 ≤ ε/D ≤ 10^-2 and 5000 ≤ Re ≤ 10^8
      const swameeArg = (relativeRoughness / 3.7) + (5.74 / Math.pow(Re, 0.9));
      f_swamee = 0.25 / Math.pow(Math.log10(swameeArg), 2);
      
      // Haaland equation (explicit approximation)
      // Valid for 10^-6 ≤ ε/D ≤ 0.05
      const haalandArg = Math.pow(relativeRoughness / 3.7, 1.11) + (6.9 / Re);
      f_haaland = Math.pow(-1.8 * Math.log10(haalandArg), -2);
      
      // Colebrook-White equation (iterative solution)
      // 1/√f = -2·log₁₀(ε/(3.7·D) + 2.51/(Re·√f))
      // Use Swamee-Jain as initial guess
      let f = f_swamee;
      const maxIterations = 100;
      const tolerance = 1e-10;
      
      for (let i = 0; i < maxIterations; i++) {
        colebrookIterations = i + 1;
        const sqrtF = Math.sqrt(f);
        const rhs = -2 * Math.log10((relativeRoughness / 3.7) + (2.51 / (Re * sqrtF)));
        const f_new = 1 / Math.pow(rhs, 2);
        
        if (Math.abs(f_new - f) / f < tolerance) {
          f = f_new;
          break;
        }
        f = f_new;
      }
      f_colebrook = f;
    }
    
    // Determine applicable friction factor
    let f_applicable: number;
    let method: string;
    if (Re < 2300) {
      f_applicable = f_laminar!;
      method = 'Hagen-Poiseuille (64/Re)';
    } else if (Re < 4000) {
      // Transitional - interpolate or use turbulent
      f_applicable = f_colebrook || f_laminar!;
      method = 'Transitional (use with caution)';
    } else {
      f_applicable = f_colebrook!;
      method = `Colebrook-White (${colebrookIterations} iterations)`;
    }
    
    // Additional derived values
    const headLossPerMeter = f_applicable * (1 / D) * (Math.pow(V, 2) / (2 * 9.81)); // m head loss per m pipe
    const pressureDropPerMeter = f_applicable * (1 / D) * (rho * Math.pow(V, 2) / 2); // Pa/m
    
    return {
      velocity: V,
      diameter: D,
      density: rho,
      viscosity: mu,
      kinematicViscosity: nu,
      roughness: epsilon,
      relativeRoughness,
      reynoldsNumber: Re,
      regime,
      regimeColor,
      f_laminar,
      f_colebrook,
      f_swamee,
      f_haaland,
      f_applicable,
      method,
      colebrookIterations,
      headLossPerMeter,
      pressureDropPerMeter,
    };
  }, [inputs]);

  // Generate Moody diagram data with multiple roughness curves
  const moodyData = useMemo(() => {
    // Relative roughness values for different curves (ε/D)
    const roughnessValues = [0, 0.00001, 0.00005, 0.0001, 0.0002, 0.0004, 0.001, 0.002, 0.004, 0.01, 0.02, 0.05];
    
    const data: Array<Record<string, number | null>> = [];
    
    // Generate Re values with finer resolution
    const reValues: number[] = [];
    // Laminar region
    for (let exp = 2.5; exp <= 3.4; exp += 0.05) {
      reValues.push(Math.pow(10, exp));
    }
    // Transitional gap
    for (let exp = 3.4; exp <= 3.7; exp += 0.1) {
      reValues.push(Math.pow(10, exp));
    }
    // Turbulent region with finer resolution
    for (let exp = 3.7; exp <= 8; exp += 0.05) {
      reValues.push(Math.pow(10, exp));
    }
    
    const currentRelRoughness = results.relativeRoughness;
    
    for (const Re of reValues) {
      const point: Record<string, number | null> = { Re };
      
      // Laminar flow (64/Re)
      if (Re <= 2300) {
        point.laminar = 64 / Re;
      } else {
        point.laminar = null;
      }
      
      // Turbulent curves for each roughness
      if (Re >= 4000) {
        for (const epsD of roughnessValues) {
          const key = epsD === 0 ? 'smooth' : `r_${epsD}`;
          
          if (epsD === 0) {
            // Smooth pipe - Prandtl-von Karman
            let f = 0.02;
            for (let i = 0; i < 30; i++) {
              const newF = Math.pow(2 * Math.log10(Re * Math.sqrt(f)) - 0.8, -2);
              if (Math.abs(newF - f) < 1e-10) break;
              f = newF;
            }
            point[key] = f;
          } else {
            // Colebrook-White
            let f = 0.02;
            for (let i = 0; i < 30; i++) {
              const sqrtF = Math.sqrt(f);
              const rhs = -2 * Math.log10((epsD / 3.7) + (2.51 / (Re * sqrtF)));
              const newF = 1 / Math.pow(rhs, 2);
              if (Math.abs(newF - f) < 1e-10) break;
              f = newF;
            }
            point[key] = f;
          }
        }
        
        // Current operating roughness line
        let f = 0.02;
        for (let i = 0; i < 30; i++) {
          const sqrtF = Math.sqrt(f);
          const rhs = -2 * Math.log10((currentRelRoughness / 3.7) + (2.51 / (Re * sqrtF)));
          const newF = 1 / Math.pow(rhs, 2);
          if (Math.abs(newF - f) < 1e-10) break;
          f = newF;
        }
        point.current = f;
      }
      
      data.push(point);
    }
    
    return { data, roughnessValues };
  }, [results.relativeRoughness]);

  // Current operating point for the Moody diagram
  const operatingPoint = useMemo(() => {
    return [{
      Re: results.reynoldsNumber,
      f: results.f_applicable,
    }];
  }, [results.reynoldsNumber, results.f_applicable]);

  const formatNumber = (value: number, decimals: number = 4): string => {
    if (Math.abs(value) < 0.0001 || Math.abs(value) > 100000) {
      return value.toExponential(decimals);
    }
    return value.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Theory Overview */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            Fundamental Fluid Mechanics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The <strong>Reynolds number</strong> (Re = ρVD/μ) characterizes flow regime and determines which 
            friction factor correlation applies. It represents the ratio of inertial to viscous forces.
          </p>
          <p>
            The <strong>Darcy friction factor</strong> (f) is used in the Darcy-Weisbach equation 
            (ΔP = f·(L/D)·(ρV²/2)) to calculate pressure drop in pipes. The Colebrook-White equation 
            provides the most accurate friction factor for turbulent flow in rough pipes.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fluid Database Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Fluid Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fluid Selection */}
            <div className="space-y-2">
              <Label>Select Fluid</Label>
              <Select value={inputs.selectedFluid} onValueChange={(v) => updateInput('selectedFluid', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a fluid..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">Manual Entry</SelectItem>
                  {Object.entries(fluidCategories).map(([category, fluids]) => (
                    <React.Fragment key={category}>
                      <SelectItem value={`__category_${category}`} disabled className="font-semibold text-primary">
                        ── {category} ──
                      </SelectItem>
                      {fluids.map(fluid => (
                        <SelectItem key={fluid.key} value={fluid.key}>
                          {fluid.name}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Temperature Slider */}
            {inputs.selectedFluid && inputs.selectedFluid !== '__manual__' && !inputs.selectedFluid.startsWith('__category_') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </Label>
                  <span className="text-sm font-mono font-medium">{inputs.fluidTemperature}°C</span>
                </div>
                <Slider
                  value={[inputs.fluidTemperature]}
                  onValueChange={([v]) => updateInput('fluidTemperature', v)}
                  min={fluidDatabase[inputs.selectedFluid]?.minTemp ?? -40}
                  max={fluidDatabase[inputs.selectedFluid]?.maxTemp ?? 300}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fluidDatabase[inputs.selectedFluid]?.minTemp ?? -40}°C</span>
                  <span>{fluidDatabase[inputs.selectedFluid]?.maxTemp ?? 300}°C</span>
                </div>
              </div>
            )}

            {/* Fluid Properties Display */}
            {inputs.selectedFluid && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="text-sm font-medium">Properties at {inputs.fluidTemperature}°C</div>
                {(() => {
                  const props = getFluidProperties(inputs.selectedFluid, inputs.fluidTemperature);
                  if (!props) return null;
                  return (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Density:</span>
                        <span className="font-mono ml-1">{props.density.toFixed(1)} kg/m³</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Viscosity:</span>
                        <span className="font-mono ml-1">{props.viscosity.toFixed(3)} cP</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cp:</span>
                        <span className="font-mono ml-1">{props.specificHeat.toFixed(2)} kJ/kg·K</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pr:</span>
                        <span className="font-mono ml-1">{props.prandtl.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <Separator />

            {/* Pipe Schedule Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputs.useSchedule}
                  onChange={(e) => updateInput('useSchedule', e.target.checked)}
                  className="rounded"
                />
                Use Pipe Schedule
              </Label>
            </div>

            {inputs.useSchedule && (
              <>
                <div className="space-y-2">
                  <Label>Nominal Pipe Size</Label>
                  <Select value={inputs.nominalSize} onValueChange={(v) => updateInput('nominalSize', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {nominalSizes.map(size => (
                        <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select value={inputs.schedule} onValueChange={(v) => updateInput('schedule', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSchedules.map(sched => (
                        <SelectItem key={sched} value={sched}>{sched}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              Flow Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input Type Selection */}
            <div className="space-y-2">
              <Label>Input Type</Label>
              <Select value={inputs.inputType} onValueChange={(v) => updateInput('inputType', v as 'velocity' | 'flowRate')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="velocity">Velocity</SelectItem>
                  <SelectItem value="flowRate">Volumetric Flow Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Velocity or Flow Rate */}
            {inputs.inputType === 'velocity' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Velocity</Label>
                  <Input
                    type="number"
                    value={inputs.velocity}
                    onChange={(e) => updateInput('velocity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={inputs.velocityUnit} onValueChange={(v) => updateInput('velocityUnit', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(velocityConversions).map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Flow Rate</Label>
                  <Input
                    type="number"
                    value={inputs.flowRate}
                    onChange={(e) => updateInput('flowRate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={inputs.flowRateUnit} onValueChange={(v) => updateInput('flowRateUnit', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(flowRateConversions).map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Pipe Diameter */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Pipe Inside Diameter {inputs.useSchedule && <Badge variant="secondary" className="ml-1 text-xs">Auto</Badge>}</Label>
                <Input
                  type="number"
                  value={inputs.diameter}
                  onChange={(e) => {
                    updateInput('diameter', parseFloat(e.target.value) || 0);
                    if (inputs.useSchedule) updateInput('useSchedule', false);
                  }}
                  className={inputs.useSchedule ? 'bg-muted' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={inputs.diameterUnit} onValueChange={(v) => updateInput('diameterUnit', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(lengthConversions).map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Fluid Properties */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>
                  Fluid Density 
                  {inputs.selectedFluid && <Badge variant="secondary" className="ml-1 text-xs">Auto</Badge>}
                </Label>
                <Input
                  type="number"
                  value={inputs.density}
                  onChange={(e) => {
                    updateInput('density', parseFloat(e.target.value) || 0);
                    if (inputs.selectedFluid) updateInput('selectedFluid', '');
                  }}
                  className={inputs.selectedFluid ? 'bg-muted' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={inputs.densityUnit} onValueChange={(v) => updateInput('densityUnit', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(densityConversions).map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>
                  Dynamic Viscosity 
                  {inputs.selectedFluid && <Badge variant="secondary" className="ml-1 text-xs">Auto</Badge>}
                </Label>
                <Input
                  type="number"
                  value={inputs.viscosity}
                  onChange={(e) => {
                    updateInput('viscosity', parseFloat(e.target.value) || 0);
                    if (inputs.selectedFluid) updateInput('selectedFluid', '');
                  }}
                  className={inputs.selectedFluid ? 'bg-muted' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={inputs.viscosityUnit} onValueChange={(v) => updateInput('viscosityUnit', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(viscosityConversions).map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Pipe Roughness */}
            <div className="space-y-2">
              <Label>Pipe Material</Label>
              <Select value={inputs.roughnessMaterial} onValueChange={(v) => updateInput('roughnessMaterial', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(pipeRoughness).map(material => (
                    <SelectItem key={material} value={material}>{material}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Absolute Roughness (ε)</Label>
                <Input
                  type="number"
                  value={inputs.roughness}
                  onChange={(e) => {
                    updateInput('roughness', parseFloat(e.target.value) || 0);
                    updateInput('roughnessMaterial', 'Custom');
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={inputs.roughnessUnit} onValueChange={(v) => updateInput('roughnessUnit', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(roughnessConversions).map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reynolds Number */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Reynolds Number</div>
              <div className="text-3xl font-bold font-mono">
                {formatNumber(results.reynoldsNumber)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Re = ρVD/μ = ({results.density.toFixed(1)} × {results.velocity.toFixed(3)} × {(results.diameter * 1000).toFixed(1)}mm) / {(results.viscosity * 1000).toFixed(3)} cP
              </div>
            </div>

            {/* Flow Regime */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Flow Regime</div>
                <div className={`text-xl font-bold ${results.regimeColor}`}>
                  {results.regime}
                </div>
              </div>
              <Badge variant={results.regime === 'Laminar' ? 'default' : results.regime === 'Transitional' ? 'secondary' : 'destructive'}>
                {results.regime === 'Laminar' && 'Re < 2,300'}
                {results.regime === 'Transitional' && '2,300 ≤ Re < 4,000'}
                {results.regime === 'Turbulent' && 'Re ≥ 4,000'}
              </Badge>
            </div>

            {results.regime === 'Transitional' && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  Transitional flow is unpredictable. Results should be used with caution. 
                  Consider designing for fully turbulent conditions.
                </div>
              </div>
            )}

            <Separator />

            {/* Friction Factor */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Darcy Friction Factor</div>
              <div className="text-3xl font-bold font-mono text-primary">
                f = {formatNumber(results.f_applicable)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Method: {results.method}
              </div>
            </div>

            {/* Friction Factor Comparison */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Friction Factor Comparison</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">Laminar (64/Re)</div>
                  <div className="font-mono">{results.f_laminar ? formatNumber(results.f_laminar) : 'N/A'}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">Colebrook-White</div>
                  <div className="font-mono">{results.f_colebrook ? formatNumber(results.f_colebrook) : 'N/A'}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">Swamee-Jain</div>
                  <div className="font-mono">{results.f_swamee ? formatNumber(results.f_swamee) : 'N/A'}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">Haaland</div>
                  <div className="font-mono">{results.f_haaland ? formatNumber(results.f_haaland) : 'N/A'}</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Derived Values */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-muted-foreground">Relative Roughness (ε/D)</div>
                <div className="font-mono font-medium">{formatNumber(results.relativeRoughness, 6)}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-muted-foreground">Kinematic Viscosity (ν)</div>
                <div className="font-mono font-medium">{formatNumber(results.kinematicViscosity * 1e6)} mm²/s</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-muted-foreground">Velocity</div>
                <div className="font-mono font-medium">{results.velocity.toFixed(3)} m/s</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-muted-foreground">Head Loss per meter</div>
                <div className="font-mono font-medium">{formatNumber(results.headLossPerMeter)} m/m</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Moody Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Moody Diagram Visualization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={moodyData.data} 
                margin={{ top: 20, right: 80, left: 60, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                
                {/* Transitional zone shading */}
                <ReferenceArea 
                  x1={2300} 
                  x2={4000} 
                  fill="hsl(var(--muted))" 
                  fillOpacity={0.4}
                />
                
                <XAxis 
                  dataKey="Re" 
                  type="number"
                  scale="log"
                  domain={[300, 100000000]}
                  tickFormatter={(v) => {
                    const exp = Math.log10(v);
                    if (exp % 1 === 0) return `10^${Math.round(exp)}`;
                    return '';
                  }}
                  ticks={[1000, 10000, 100000, 1000000, 10000000, 100000000]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Reynolds Number (Re)', position: 'bottom', offset: 20, style: { fontSize: 13 } }}
                />
                <YAxis 
                  scale="log"
                  domain={[0.006, 0.1]}
                  tickFormatter={(v) => v.toFixed(3)}
                  ticks={[0.008, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1]}
                  tick={{ fontSize: 12 }}
                  width={50}
                  label={{ value: 'Friction Factor (f)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 13 }, dx: -10 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (value === null || value === undefined) return [null, null];
                    if (name === 'laminar') return [value.toFixed(5), 'Laminar (64/Re)'];
                    if (name === 'smooth') return [value.toFixed(5), 'Smooth Pipe'];
                    if (name === 'current') return [value.toFixed(5), `Current (ε/D=${results.relativeRoughness.toExponential(2)})`];
                    const match = name.match(/r_(.+)/);
                    if (match) return [value.toFixed(5), `ε/D = ${match[1]}`];
                    return [value.toFixed(5), name];
                  }}
                  labelFormatter={(v) => `Re = ${Number(v).toExponential(2)}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                
                {/* Laminar line */}
                <Line 
                  type="monotone" 
                  dataKey="laminar" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={false}
                  name="laminar"
                  connectNulls={false}
                />
                
                {/* Smooth pipe line */}
                <Line 
                  type="monotone" 
                  dataKey="smooth" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1.5}
                  dot={false}
                  name="smooth"
                  connectNulls={false}
                />
                
                {/* Selected roughness curves - show subset for clarity */}
                {[0.0001, 0.001, 0.01, 0.05].map((epsD, idx) => (
                  <Line 
                    key={epsD}
                    type="monotone" 
                    dataKey={`r_${epsD}`} 
                    stroke={`hsl(var(--chart-${(idx % 5) + 1}))`} 
                    strokeWidth={1}
                    strokeOpacity={0.5}
                    dot={false}
                    name={`r_${epsD}`}
                    connectNulls={false}
                  />
                ))}
                
                {/* Current operating roughness - highlighted */}
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={false}
                  name="current"
                  connectNulls={false}
                />
                
                {/* Current operating point */}
                <Scatter
                  data={operatingPoint}
                  dataKey="f"
                  fill="hsl(var(--destructive))"
                  name="Operating Point"
                >
                  {operatingPoint.map((_, index) => (
                    <circle key={index} r={8} />
                  ))}
                </Scatter>
                
                {/* Vertical reference line at current Re */}
                <ReferenceLine 
                  x={results.reynoldsNumber} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                />
                
                {/* Horizontal reference line at current f */}
                <ReferenceLine 
                  y={results.f_applicable} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-[hsl(var(--chart-3))]"></div>
              <span>Laminar (64/Re)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-muted-foreground"></div>
              <span>Smooth Pipe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-primary"></div>
              <span>Current ε/D = {results.relativeRoughness.toExponential(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span>Operating Point (Re={results.reynoldsNumber.toExponential(2)}, f={results.f_applicable.toFixed(4)})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-muted/50"></div>
              <span>Transitional Zone</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equations Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Equations Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reynolds">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="reynolds">Reynolds</TabsTrigger>
              <TabsTrigger value="colebrook">Colebrook</TabsTrigger>
              <TabsTrigger value="swamee">Swamee-Jain</TabsTrigger>
              <TabsTrigger value="darcy">Darcy-Weisbach</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reynolds" className="space-y-3 mt-4">
              <div className="p-4 bg-muted rounded-lg font-mono text-center text-lg">
                Re = ρVD / μ = VD / ν
              </div>
              <div className="text-sm text-muted-foreground">
                <p><strong>Re</strong> = Reynolds number (dimensionless)</p>
                <p><strong>ρ</strong> = Fluid density (kg/m³)</p>
                <p><strong>V</strong> = Flow velocity (m/s)</p>
                <p><strong>D</strong> = Pipe inside diameter (m)</p>
                <p><strong>μ</strong> = Dynamic viscosity (Pa·s)</p>
                <p><strong>ν</strong> = Kinematic viscosity (m²/s)</p>
              </div>
            </TabsContent>
            
            <TabsContent value="colebrook" className="space-y-3 mt-4">
              <div className="p-4 bg-muted rounded-lg font-mono text-center">
                1/√f = -2·log₁₀(ε/(3.7D) + 2.51/(Re·√f))
              </div>
              <div className="text-sm text-muted-foreground">
                <p>The Colebrook-White equation is implicit and requires iterative solution.</p>
                <p>Valid for turbulent flow in rough pipes (Re {'>'}  4000).</p>
                <p>This calculator uses Newton-Raphson iteration with Swamee-Jain as initial guess.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="swamee" className="space-y-3 mt-4">
              <div className="p-4 bg-muted rounded-lg font-mono text-center">
                f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re⁰·⁹)]²
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Explicit approximation of Colebrook-White equation.</p>
                <p>Accuracy: within 1% for 10⁻⁶ ≤ ε/D ≤ 10⁻² and 5000 ≤ Re ≤ 10⁸</p>
              </div>
            </TabsContent>
            
            <TabsContent value="darcy" className="space-y-3 mt-4">
              <div className="p-4 bg-muted rounded-lg font-mono text-center text-lg">
                ΔP = f · (L/D) · (ρV²/2)
              </div>
              <div className="text-sm text-muted-foreground">
                <p><strong>ΔP</strong> = Pressure drop (Pa)</p>
                <p><strong>f</strong> = Darcy friction factor (dimensionless)</p>
                <p><strong>L</strong> = Pipe length (m)</p>
                <p><strong>D</strong> = Pipe diameter (m)</p>
                <p><strong>ρV²/2</strong> = Dynamic pressure (Pa)</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReynoldsFrictionCalculator;
