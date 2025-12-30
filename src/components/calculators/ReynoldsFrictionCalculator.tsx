import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Info, Droplets, Wind, AlertTriangle } from 'lucide-react';
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
} from 'recharts';

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
  });

  const updateInput = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
    setInputs(prev => {
      const newInputs = { ...prev, [key]: value };
      
      // Auto-update roughness when material changes
      if (key === 'roughnessMaterial' && value !== 'Custom') {
        const roughnessM = pipeRoughness[value as string];
        // Convert to current unit
        const roughnessInUnit = roughnessM / roughnessConversions[prev.roughnessUnit];
        newInputs.roughness = parseFloat(roughnessInUnit.toPrecision(4));
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

  // Generate Moody diagram data
  const moodyData = useMemo(() => {
    const data: Array<{
      Re: number;
      logRe: number;
      smooth: number;
      current: number | null;
      currentRoughness: number | null;
    }> = [];
    
    const reValues = [];
    for (let exp = 3; exp <= 8; exp += 0.1) {
      reValues.push(Math.pow(10, exp));
    }
    
    const currentRelRoughness = results.relativeRoughness;
    
    for (const Re of reValues) {
      // Smooth pipe (Blasius for turbulent, 64/Re for laminar)
      let smooth: number;
      if (Re < 2300) {
        smooth = 64 / Re;
      } else {
        // Prandtl's smooth pipe formula
        let f = 0.02;
        for (let i = 0; i < 20; i++) {
          f = Math.pow(2 * Math.log10(Re * Math.sqrt(f)) - 0.8, -2);
        }
        smooth = f;
      }
      
      // Current roughness line
      let currentRoughness: number | null = null;
      if (Re >= 4000) {
        // Colebrook-White for current roughness
        let f = 0.02;
        for (let i = 0; i < 20; i++) {
          const sqrtF = Math.sqrt(f);
          const rhs = -2 * Math.log10((currentRelRoughness / 3.7) + (2.51 / (Re * sqrtF)));
          f = 1 / Math.pow(rhs, 2);
        }
        currentRoughness = f;
      }
      
      data.push({
        Re,
        logRe: Math.log10(Re),
        smooth,
        current: Re === reValues.find(r => Math.abs(Math.log10(r) - Math.log10(results.reynoldsNumber)) < 0.05) 
          ? results.f_applicable : null,
        currentRoughness,
      });
    }
    
    return data;
  }, [results]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Label>Pipe Inside Diameter</Label>
                <Input
                  type="number"
                  value={inputs.diameter}
                  onChange={(e) => updateInput('diameter', parseFloat(e.target.value) || 0)}
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
                <Label>Fluid Density</Label>
                <Input
                  type="number"
                  value={inputs.density}
                  onChange={(e) => updateInput('density', parseFloat(e.target.value) || 0)}
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
                <Label>Dynamic Viscosity</Label>
                <Input
                  type="number"
                  value={inputs.viscosity}
                  onChange={(e) => updateInput('viscosity', parseFloat(e.target.value) || 0)}
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
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moodyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="logRe" 
                  type="number"
                  domain={[3, 8]}
                  tickFormatter={(v) => `10^${v}`}
                  label={{ value: 'Reynolds Number (Re)', position: 'bottom', offset: 0 }}
                />
                <YAxis 
                  scale="log"
                  domain={[0.008, 0.1]}
                  tickFormatter={(v) => v.toFixed(3)}
                  label={{ value: 'Friction Factor (f)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => value?.toFixed(5)}
                  labelFormatter={(v) => `Re = ${Math.pow(10, v).toExponential(2)}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="smooth" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1}
                  dot={false}
                  name="Smooth Pipe"
                />
                <Line 
                  type="monotone" 
                  dataKey="currentRoughness" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name={`ε/D = ${results.relativeRoughness.toExponential(2)}`}
                />
                <ReferenceLine 
                  x={Math.log10(results.reynoldsNumber)} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  label={{ value: 'Current Re', position: 'top' }}
                />
              </LineChart>
            </ResponsiveContainer>
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
