import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ReferenceDot,
  Area,
  ComposedChart
} from 'recharts';
import { TrendingUp, AlertTriangle, Target } from 'lucide-react';

interface PerformanceCurvesProps {
  operatingFlow: number; // Actual flow m³/h
  operatingHead: number; // kJ/kg
  operatingEfficiency: number; // %
  compressionRatio: number;
  compressorType: string;
}

interface CurvePoint {
  flow: number;
  head: number;
  efficiency: number;
  power: number;
  surge?: number;
  stonewall?: number;
}

const CompressorPerformanceCurves: React.FC<PerformanceCurvesProps> = ({
  operatingFlow,
  operatingHead,
  operatingEfficiency,
  compressionRatio,
  compressorType
}) => {
  // Generate performance curve data based on operating point
  const curveData = useMemo(() => {
    const points: CurvePoint[] = [];
    const designFlow = operatingFlow;
    const designHead = operatingHead;
    
    // Flow range: 40% to 130% of design flow
    const minFlow = designFlow * 0.4;
    const maxFlow = designFlow * 1.3;
    const flowStep = (maxFlow - minFlow) / 30;
    
    // Surge point typically at 50-70% of design flow for centrifugal
    const surgeFlowRatio = compressorType === 'axial' ? 0.75 : 
                           compressorType === 'centrifugal' ? 0.6 : 0.5;
    const surgeFlow = designFlow * surgeFlowRatio;
    
    // Stonewall (choke) typically at 110-120% of design flow
    const stonewallFlow = designFlow * 1.15;
    
    for (let i = 0; i <= 30; i++) {
      const flow = minFlow + (i * flowStep);
      const flowRatio = flow / designFlow;
      
      // Head-flow curve (parabolic characteristic)
      // H = H_design * (1 + a*(1 - Q/Q_design)^2) where a depends on compressor type
      let headCoeff: number;
      switch (compressorType) {
        case 'centrifugal':
          headCoeff = 0.3; // Relatively flat curve
          break;
        case 'axial':
          headCoeff = 0.15; // Flatter curve
          break;
        case 'reciprocating':
          headCoeff = 0.5; // Steeper curve
          break;
        default:
          headCoeff = 0.35;
      }
      
      const head = designHead * (1 + headCoeff * Math.pow(1 - flowRatio, 2) - 0.2 * Math.pow(flowRatio - 1, 2));
      
      // Efficiency curve (bell-shaped, peaks near design point)
      const effPeak = operatingEfficiency;
      const effDropoff = compressorType === 'axial' ? 15 : 20;
      const efficiency = Math.max(0, effPeak - effDropoff * Math.pow(flowRatio - 1, 2) * 100);
      
      // Power curve (roughly proportional to flow * head / efficiency)
      const power = (flow * head) / (efficiency > 0 ? efficiency / 100 : 0.5) * 0.001;
      
      // Surge line (increases with flow, intersects head curve at surge point)
      const surgeHead = designHead * 1.1 * Math.pow(flow / surgeFlow, 2);
      
      // Only show surge region for dynamic compressors
      const showSurge = ['centrifugal', 'axial'].includes(compressorType);
      
      points.push({
        flow: Math.round(flow),
        head: Math.max(0, head),
        efficiency: Math.max(0, Math.min(100, efficiency)),
        power: Math.max(0, power),
        surge: showSurge ? surgeHead : undefined,
        stonewall: flow >= stonewallFlow ? head * 0.3 : undefined
      });
    }
    
    return points;
  }, [operatingFlow, operatingHead, operatingEfficiency, compressorType]);

  // Calculate surge margin
  const surgeMargin = useMemo(() => {
    const surgeFlowRatio = compressorType === 'axial' ? 0.75 : 
                           compressorType === 'centrifugal' ? 0.6 : 0.5;
    const surgeFlow = operatingFlow * surgeFlowRatio;
    return ((operatingFlow - surgeFlow) / operatingFlow) * 100;
  }, [operatingFlow, compressorType]);

  // Determine operating status
  const getOperatingStatus = () => {
    if (surgeMargin < 10) {
      return { status: 'danger', message: 'Close to surge line', color: 'text-red-500' };
    }
    if (surgeMargin < 20) {
      return { status: 'warning', message: 'Low surge margin', color: 'text-yellow-500' };
    }
    return { status: 'good', message: 'Stable operation', color: 'text-green-500' };
  };

  const operatingStatus = getOperatingStatus();
  const isDynamic = ['centrifugal', 'axial'].includes(compressorType);

  return (
    <div className="space-y-4">
      {/* Head-Flow Curve */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Curves
            </CardTitle>
            <Badge variant={operatingStatus.status === 'good' ? 'default' : 'destructive'}>
              {operatingStatus.message}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="flow" 
                  label={{ value: 'Flow (m³/h)', position: 'bottom', offset: 0 }}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="head"
                  label={{ value: 'Head (kJ/kg)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <YAxis 
                  yAxisId="efficiency"
                  orientation="right"
                  label={{ value: 'Efficiency (%)', angle: 90, position: 'insideRight' }}
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'head') return [value.toFixed(1) + ' kJ/kg', 'Head'];
                    if (name === 'efficiency') return [value.toFixed(1) + '%', 'Efficiency'];
                    if (name === 'surge') return [value.toFixed(1) + ' kJ/kg', 'Surge Line'];
                    return [value, name];
                  }}
                />
                <Legend />
                
                {/* Surge region fill */}
                {isDynamic && (
                  <Area
                    yAxisId="head"
                    dataKey="surge"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.1}
                    stroke="none"
                    name="Surge Region"
                  />
                )}
                
                {/* Head curve */}
                <Line
                  yAxisId="head"
                  type="monotone"
                  dataKey="head"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  name="Head"
                />
                
                {/* Surge line */}
                {isDynamic && (
                  <Line
                    yAxisId="head"
                    type="monotone"
                    dataKey="surge"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Surge Line"
                  />
                )}
                
                {/* Efficiency curve */}
                <Line
                  yAxisId="efficiency"
                  type="monotone"
                  dataKey="efficiency"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                  name="Efficiency"
                />
                
                {/* Operating point marker */}
                <ReferenceDot
                  x={Math.round(operatingFlow)}
                  y={operatingHead}
                  yAxisId="head"
                  r={8}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={3}
                />
                
                {/* Operating flow reference line */}
                <ReferenceLine
                  x={Math.round(operatingFlow)}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Operating point info */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">Operating Point</span>
              </div>
              <p className="text-sm font-medium">{operatingFlow.toFixed(0)} m³/h</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <span className="text-xs text-muted-foreground">Head</span>
              <p className="text-sm font-medium">{operatingHead.toFixed(1)} kJ/kg</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <span className="text-xs text-muted-foreground">Efficiency</span>
              <p className="text-sm font-medium">{operatingEfficiency.toFixed(1)}%</p>
            </div>
            {isDynamic && (
              <div className={`p-2 rounded-lg text-center ${
                surgeMargin < 10 ? 'bg-red-500/10' : 
                surgeMargin < 20 ? 'bg-yellow-500/10' : 'bg-green-500/10'
              }`}>
                <span className="text-xs text-muted-foreground">Surge Margin</span>
                <p className={`text-sm font-medium ${operatingStatus.color}`}>
                  {surgeMargin.toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Power Curve */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Power Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="flow" 
                  label={{ value: 'Flow (m³/h)', position: 'bottom', offset: 0 }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [value.toFixed(1) + ' kW', 'Power']}
                />
                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={false}
                  name="Power"
                />
                <ReferenceLine
                  x={Math.round(operatingFlow)}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  label={{ value: 'Operating', position: 'top', fontSize: 10 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Surge Warning */}
      {isDynamic && surgeMargin < 20 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  Low Surge Margin Warning
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Operating point is {surgeMargin.toFixed(0)}% above surge line. 
                  Consider increasing flow rate or reducing discharge pressure to maintain stable operation.
                  Recommended surge margin is typically 10-20%.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Curve Legend Info */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Performance curves are generated based on typical {compressorType} compressor 
          characteristics. Actual manufacturer curves may vary. The surge line represents the minimum stable 
          flow limit below which flow reversal and mechanical damage can occur.
        </p>
      </div>
    </div>
  );
};

export default CompressorPerformanceCurves;
