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
  ComposedChart,
  Label
} from 'recharts';
import { TrendingUp, AlertTriangle, Target, Zap, Activity } from 'lucide-react';

interface PerformanceCurvesProps {
  operatingFlow: number; // Actual flow m³/h
  operatingHead: number; // kJ/kg
  operatingEfficiency: number; // %
  compressionRatio: number;
  compressorType: string;
  shaftPower?: number; // kW
  surgeFlow?: number; // m³/h
  stonewallFlow?: number; // m³/h
  massFlow?: number; // kg/h
  inletDensity?: number; // kg/m³
}

interface CurvePoint {
  flow: number;
  flowPercent: number;
  head: number;
  efficiency: number;
  power: number;
  surge?: number;
  pressureRatio?: number;
}

const CompressorPerformanceCurves: React.FC<PerformanceCurvesProps> = ({
  operatingFlow,
  operatingHead,
  operatingEfficiency,
  compressionRatio,
  compressorType,
  shaftPower = 0,
  surgeFlow = 0,
  stonewallFlow = 0,
  massFlow = 0,
  inletDensity = 1.2
}) => {
  const isDynamic = ['centrifugal', 'axial'].includes(compressorType);
  const isReciprocating = ['reciprocating', 'diaphragm'].includes(compressorType);

  // Generate performance curve data based on operating point and compressor type
  const curveData = useMemo(() => {
    const points: CurvePoint[] = [];
    const designFlow = operatingFlow;
    const designHead = operatingHead > 0 ? operatingHead : 50;
    const designPower = shaftPower > 0 ? shaftPower : 100;

    // Flow range based on compressor type per API 617/618
    const minFlowRatio = isDynamic ? 0.4 : 0.3;
    const maxFlowRatio = isDynamic ? 1.3 : 1.2;
    const numPoints = 35;

    // Calculate actual surge flow
    const actualSurgeFlow = surgeFlow > 0 ? surgeFlow :
      (isDynamic ? designFlow * (compressorType === 'axial' ? 0.75 : 0.55) : 0);

    for (let i = 0; i <= numPoints; i++) {
      const flowRatio = minFlowRatio + (i * (maxFlowRatio - minFlowRatio) / numPoints);
      const flow = designFlow * flowRatio;
      const flowPercent = flowRatio * 100;

      let head: number;
      let efficiency: number;
      let power: number;
      let surge: number | undefined;

      if (isDynamic) {
        // API 617 Dynamic compressor characteristic curves
        // Head-flow: parabolic with different slopes per type
        const headCoeff = compressorType === 'axial' ? 0.12 : 0.25;
        const slopeCoeff = compressorType === 'axial' ? 0.08 : 0.15;

        // H/H_design = 1 + a*(1-Q/Q_d)^2 - b*(Q/Q_d - 1)^2
        head = designHead * (1 + headCoeff * Math.pow(1 - flowRatio, 2) - slopeCoeff * Math.pow(Math.max(0, flowRatio - 1), 2));
        head = Math.max(0, head);

        // Efficiency: bell curve peaking at design point
        // η/η_d = 1 - c*(Q/Q_d - 1)^2
        const effDropCoeff = compressorType === 'axial' ? 0.8 : 1.2;
        efficiency = operatingEfficiency * (1 - effDropCoeff * Math.pow(flowRatio - 1, 2));
        efficiency = Math.max(20, Math.min(operatingEfficiency + 2, efficiency));

        // Power curve: P = ṁ × H / η (follows head×flow/efficiency)
        const powerRatio = flowRatio * (head / designHead) / (efficiency / operatingEfficiency);
        power = designPower * Math.max(0.3, powerRatio);

        // Surge line: quadratic through surge point
        if (flow >= actualSurgeFlow * 0.8) {
          surge = designHead * 1.15 * Math.pow(flow / actualSurgeFlow, 2);
          surge = Math.min(surge, designHead * 1.4);
        }
      } else {
        // API 618 Reciprocating/positive displacement characteristic
        // Head is essentially constant (positive displacement)
        head = designHead * (1 - 0.05 * Math.pow(flowRatio - 1, 2));
        head = Math.max(designHead * 0.85, head);

        // Efficiency drops at off-design conditions
        efficiency = operatingEfficiency * (1 - 0.3 * Math.pow(flowRatio - 1, 2));
        efficiency = Math.max(50, efficiency);

        // Power roughly proportional to flow for PD compressors
        power = designPower * flowRatio * (1 + 0.05 * Math.pow(flowRatio - 1, 2));
        power = Math.max(0, power);
      }

      points.push({
        flow: Math.round(flow),
        flowPercent: Math.round(flowPercent),
        head: Math.round(head * 100) / 100,
        efficiency: Math.round(efficiency * 10) / 10,
        power: Math.round(power * 10) / 10,
        surge,
        pressureRatio: compressionRatio * (head / designHead)
      });
    }

    return points;
  }, [operatingFlow, operatingHead, operatingEfficiency, compressionRatio, compressorType, shaftPower, surgeFlow, isDynamic]);

  // Calculate surge margin for dynamic compressors
  const surgeMargin = useMemo(() => {
    if (!isDynamic) return 100;
    const actualSurge = surgeFlow > 0 ? surgeFlow :
      operatingFlow * (compressorType === 'axial' ? 0.75 : 0.55);
    return ((operatingFlow - actualSurge) / operatingFlow) * 100;
  }, [operatingFlow, surgeFlow, compressorType, isDynamic]);

  // Determine operating status
  const getOperatingStatus = () => {
    if (!isDynamic) {
      return { status: 'good', message: 'PD Operation', color: 'text-green-500' };
    }
    if (surgeMargin < 10) {
      return { status: 'danger', message: 'Near Surge!', color: 'text-red-500' };
    }
    if (surgeMargin < 20) {
      return { status: 'warning', message: 'Low Margin', color: 'text-yellow-500' };
    }
    return { status: 'good', message: 'Stable', color: 'text-green-500' };
  };

  const operatingStatus = getOperatingStatus();

  // Find operating point in data
  const operatingPoint = curveData.find(p => Math.abs(p.flow - operatingFlow) < operatingFlow * 0.05);
  const displayPower = shaftPower > 0 ? shaftPower : (operatingPoint?.power || 0);

  return (
    <div className="space-y-4">
      {/* Head-Flow and Efficiency Curve */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Head-Flow & Efficiency Curves
              <Badge variant="outline" className="text-[10px]">
                {isDynamic ? 'API 617' : 'API 618'}
              </Badge>
            </CardTitle>
            <Badge
              variant={operatingStatus.status === 'danger' ? 'destructive' :
                operatingStatus.status === 'warning' ? 'secondary' : 'default'}
              className="text-[10px]"
            >
              {operatingStatus.message}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curveData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis
                  dataKey="flowPercent"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                  className="text-muted-foreground"
                >
                  <Label
                    value="Flow (% of Design)"
                    position="bottom"
                    offset={20}
                    style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </XAxis>
                <YAxis
                  yAxisId="head"
                  tick={{ fontSize: 10 }}
                  domain={['auto', 'auto']}
                  width={50}
                  tickFormatter={(v) => v.toFixed(0)}
                >
                  <Label
                    value="Head (kJ/kg)"
                    angle={-90}
                    position="insideLeft"
                    offset={0}
                    style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', textAnchor: 'middle' }}
                  />
                </YAxis>
                <YAxis
                  yAxisId="efficiency"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  domain={[0, 100]}
                  width={40}
                  tickFormatter={(v) => `${v}`}
                >
                  <Label
                    value="η (%)"
                    angle={90}
                    position="insideRight"
                    offset={5}
                    style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', textAnchor: 'middle' }}
                  />
                </YAxis>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '10px',
                    padding: '6px 8px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'head') return [`${value.toFixed(1)} kJ/kg`, 'Head'];
                    if (name === 'efficiency') return [`${value.toFixed(1)}%`, 'Efficiency'];
                    if (name === 'surge') return [`${value.toFixed(1)} kJ/kg`, 'Surge Line'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Flow: ${label}% of design`}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                  verticalAlign="top"
                  iconSize={8}
                />

                {/* Surge region (dynamic compressors only) */}
                {isDynamic && (
                  <Area
                    yAxisId="head"
                    dataKey="surge"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.08}
                    stroke="none"
                    name="Surge Zone"
                  />
                )}

                {/* Head curve */}
                <Line
                  yAxisId="head"
                  type="monotone"
                  dataKey="head"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={false}
                  name="Head"
                />

                {/* Surge line (dynamic only) */}
                {isDynamic && (
                  <Line
                    yAxisId="head"
                    type="monotone"
                    dataKey="surge"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Surge"
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

                {/* Operating point */}
                <ReferenceDot
                  x={100}
                  y={operatingHead}
                  yAxisId="head"
                  r={6}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />

                {/* Design flow line */}
                <ReferenceLine
                  x={100}
                  yAxisId="head"
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Operating point summary */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">Design Flow</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold">{operatingFlow.toFixed(0)} m³/h</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Head</span>
              <p className="text-xs sm:text-sm font-semibold">{operatingHead.toFixed(1)} kJ/kg</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Efficiency</span>
              <p className="text-xs sm:text-sm font-semibold">{operatingEfficiency.toFixed(1)}%</p>
            </div>
            {isDynamic && (
              <div className={`p-2 rounded-lg text-center ${surgeMargin < 10 ? 'bg-red-500/10 border border-red-500/30' :
                surgeMargin < 20 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                  'bg-green-500/10 border border-green-500/30'
                }`}>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">Surge Margin</span>
                <p className={`text-xs sm:text-sm font-semibold ${operatingStatus.color}`}>
                  {surgeMargin.toFixed(0)}%
                </p>
              </div>
            )}
            {!isDynamic && (
              <div className="p-2 bg-muted/50 rounded-lg text-center">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">Ratio</span>
                <p className="text-xs sm:text-sm font-semibold">{compressionRatio.toFixed(2)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Power Curve */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
            Power Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[180px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis
                  dataKey="flowPercent"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                >
                  <Label
                    value="Flow (% of Design)"
                    position="bottom"
                    offset={20}
                    style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </XAxis>
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={55}
                  tickFormatter={(v) => v.toFixed(0)}
                >
                  <Label
                    value="Power (kW)"
                    angle={-90}
                    position="insideLeft"
                    offset={10}
                    style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', textAnchor: 'middle' }}
                  />
                </YAxis>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '10px',
                    padding: '6px 8px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} kW`, 'Power']}
                  labelFormatter={(label) => `Flow: ${label}%`}
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
                  x={100}
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <ReferenceDot
                  x={100}
                  y={displayPower}
                  r={5}
                  fill="hsl(var(--chart-3))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Design Power:</span>
              <span className="text-xs font-semibold">{displayPower.toFixed(1)} kW</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surge Warning (dynamic compressors) */}
      {isDynamic && surgeMargin < 20 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                  {surgeMargin < 10 ? 'Critical: Near Surge Limit' : 'Low Surge Margin Warning'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Operating at {surgeMargin.toFixed(0)}% above surge line.
                  Per API 617, minimum 10% surge margin recommended.
                  Consider increasing flow or reducing discharge pressure.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Curve notes */}
      <div className="p-2 bg-muted/20 rounded-lg">
        <p className="text-[10px] text-muted-foreground">
          <strong>Note:</strong> Curves generated per {isDynamic ? 'API 617' : 'API 618'} typical {compressorType} characteristics.
          {isDynamic && ' Surge line shows minimum stable flow limit per ASME PTC 10.'}
          {isReciprocating && ' Positive displacement machines have relatively flat head-flow curves.'}
          {' '}Actual manufacturer curves may vary.
        </p>
      </div>
    </div>
  );
};

export default CompressorPerformanceCurves;