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

interface PumpPerformanceCurvesProps {
  operatingFlow: number; // m³/h
  operatingHead: number; // m
  operatingEfficiency: number; // %
  operatingPower: number; // kW
  npshr: number; // m
  npsha: number; // m
  pumpType: string;
}

interface CurvePoint {
  flow: number;
  head: number;
  efficiency: number;
  power: number;
  npshr: number;
}

const PumpPerformanceCurves: React.FC<PumpPerformanceCurvesProps> = ({
  operatingFlow,
  operatingHead,
  operatingEfficiency,
  operatingPower,
  npshr,
  npsha,
  pumpType
}) => {
  // Generate pump performance curve data based on operating point
  const curveData = useMemo(() => {
    const points: CurvePoint[] = [];
    const designFlow = operatingFlow;
    const designHead = operatingHead;

    // Flow range: 0% to 140% of design flow
    const minFlow = 0;
    const maxFlow = designFlow * 1.4;
    const flowStep = maxFlow / 30;

    // Determine head-flow characteristic based on pump type
    let shutoffHeadRatio: number;
    let steepness: number;

    if (pumpType.includes('axial') || pumpType.includes('mixed')) {
      shutoffHeadRatio = 1.15; // Flatter curve
      steepness = 1.5;
    } else if (pumpType.includes('radial')) {
      shutoffHeadRatio = 1.30; // Steeper curve
      steepness = 2.2;
    } else {
      shutoffHeadRatio = 1.20; // Typical centrifugal
      steepness = 2.0;
    }

    const shutoffHead = designHead * shutoffHeadRatio;

    for (let i = 0; i <= 30; i++) {
      const flow = minFlow + (i * flowStep);
      const flowRatio = flow / designFlow;

      // Head-flow curve: H = Hso - k * Q^n
      // Normalized: H/Hdesign = (Hso/Hdesign) - ((Hso/Hdesign - 1) * (Q/Qdesign)^n)
      const head = Math.max(0, shutoffHead - (shutoffHead - designHead) * Math.pow(flowRatio, steepness));

      // Efficiency curve (bell-shaped, peaks near BEP)
      const effPeak = operatingEfficiency;
      let efficiency: number;
      if (flowRatio < 0.1) {
        efficiency = 0;
      } else {
        const effWidth = 0.5; // Width of efficiency curve
        efficiency = Math.max(0, effPeak * Math.exp(-Math.pow((flowRatio - 1) / effWidth, 2)));
      }

      // Power curve: P = ρgQH/η (approximately proportional to Q for centrifugal)
      const power = flow > 0 && efficiency > 0
        ? (flow / 3600) * head * 9.81 * 1000 / (efficiency / 100) / 1000
        : operatingPower * 0.3; // Shutoff power (about 30% for centrifugal)

      // NPSHr curve (increases with flow squared)
      const npshrValue = npshr * Math.pow(flowRatio, 2) * 0.8 + npshr * 0.2;

      points.push({
        flow: Math.round(flow * 10) / 10,
        head: Math.max(0, head),
        efficiency: Math.max(0, Math.min(100, efficiency)),
        power: Math.max(0, power),
        npshr: Math.max(0.5, npshrValue)
      });
    }

    return points;
  }, [operatingFlow, operatingHead, operatingEfficiency, operatingPower, npshr, pumpType]);

  // Calculate NPSH margin
  const npshMargin = ((npsha - npshr) / npshr) * 100;

  // Determine operating status
  const getOperatingStatus = () => {
    if (npsha < npshr) {
      return { status: 'danger', message: 'NPSH margin insufficient', color: 'text-red-500' };
    }
    if (npshMargin < 15) {
      return { status: 'warning', message: 'Low NPSH margin', color: 'text-yellow-500' };
    }
    return { status: 'good', message: 'Stable operation', color: 'text-green-500' };
  };

  const operatingStatus = getOperatingStatus();

  return (
    <div className="space-y-4">
      {/* Head-Flow and Efficiency Curve */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pump Performance Curves
            </CardTitle>
            <Badge variant={operatingStatus.status === 'good' ? 'default' : 'destructive'}>
              {operatingStatus.message}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {/* Increased margin-left to prevent Y-label overlap */}
              <ComposedChart data={curveData} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="flow"
                  label={{ value: 'Flow (m³/h)', position: 'bottom', offset: 10, fontSize: 10 }}
                  tick={{ fontSize: 9 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="head"
                  label={{ value: 'Head (m)', angle: -90, position: 'insideLeft', fontSize: 10, offset: 10 }}
                  tick={{ fontSize: 9 }}
                  domain={['auto', 'auto']}
                  width={50} // Increased width for axis
                />
                <YAxis
                  yAxisId="efficiency"
                  orientation="right"
                  label={{ value: 'Eff (%)', angle: 90, position: 'insideRight', fontSize: 10, offset: 10 }}
                  tick={{ fontSize: 9 }}
                  domain={[0, 100]}
                  width={40} // Increased width for axis
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'head') return [value.toFixed(1) + ' m', 'Head'];
                    if (name === 'efficiency') return [value.toFixed(1) + '%', 'Efficiency'];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />

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
                  x={Math.round(operatingFlow * 10) / 10}
                  y={operatingHead}
                  yAxisId="head"
                  r={8}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={3}
                />

                {/* Operating flow reference line */}
                <ReferenceLine
                  x={Math.round(operatingFlow * 10) / 10}
                  yAxisId="head"
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Operating point info */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Operating</span>
              </div>
              <p className="text-xs sm:text-sm font-medium">{operatingFlow.toFixed(1)} m³/h</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Head</span>
              <p className="text-xs sm:text-sm font-medium">{operatingHead.toFixed(1)} m</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg text-center">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Efficiency</span>
              <p className="text-xs sm:text-sm font-medium">{operatingEfficiency.toFixed(1)}%</p>
            </div>
            <div className={`p-2 rounded-lg text-center ${npshMargin < 0 ? 'bg-red-500/10' :
              npshMargin < 15 ? 'bg-yellow-500/10' : 'bg-green-500/10'
              }`}>
              <span className="text-[10px] sm:text-xs text-muted-foreground">NPSH Margin</span>
              <p className={`text-xs sm:text-sm font-medium ${operatingStatus.color}`}>
                {npshMargin.toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Power and NPSHr Curve */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Power & NPSHr Curves</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="h-[200px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              {/* Increased margins */}
              <ComposedChart data={curveData} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="flow"
                  label={{ value: 'Flow (m³/h)', position: 'bottom', offset: 10, fontSize: 10 }}
                  tick={{ fontSize: 9 }}
                />
                <YAxis
                  yAxisId="power"
                  label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fontSize: 10, offset: 10 }}
                  tick={{ fontSize: 9 }}
                  width={50}
                />
                <YAxis
                  yAxisId="npshr"
                  orientation="right"
                  label={{ value: 'NPSHr (m)', angle: 90, position: 'insideRight', fontSize: 10, offset: 10 }}
                  tick={{ fontSize: 9 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'power') return [value.toFixed(1) + ' kW', 'Power'];
                    if (name === 'npshr') return [value.toFixed(2) + ' m', 'NPSHr'];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />

                <Line
                  yAxisId="power"
                  type="monotone"
                  dataKey="power"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={false}
                  name="Power"
                />
                <Line
                  yAxisId="npshr"
                  type="monotone"
                  dataKey="npshr"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  dot={false}
                  name="NPSHr"
                />

                {/* NPSHa reference line */}
                <ReferenceLine
                  y={npsha}
                  yAxisId="npshr"
                  stroke="hsl(var(--chart-4))"
                  strokeDasharray="5 5"
                  // Moved label slightly to ensure it doesn't overlap excessively 
                  label={{ value: `NPSHa: ${npsha.toFixed(1)}m`, position: 'insideTopRight', fontSize: 9, fill: 'hsl(var(--chart-4))', offset: 10 }}
                />

                <ReferenceLine
                  x={Math.round(operatingFlow * 10) / 10}
                  yAxisId="power"
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  label={{ value: 'Op', position: 'top', fontSize: 9 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* NPSH Warning */}
      {npshMargin < 15 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  {npsha < npshr ? 'Insufficient NPSHa' : 'Low NPSH Margin Warning'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {npsha < npshr
                    ? `NPSHa (${npsha.toFixed(2)} m) is less than NPSHr (${npshr.toFixed(2)} m). Cavitation will occur.`
                    : `NPSH margin is ${npshMargin.toFixed(0)}%. API 610 recommends minimum 10% margin or 0.9m (whichever is greater).`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Curve Legend Info */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Performance curves are generated based on typical {pumpType} pump
          characteristics. Actual manufacturer curves may vary. Operating point shown at Best Efficiency Point (BEP).
        </p>
      </div>
    </div>
  );
};

export default PumpPerformanceCurves;
