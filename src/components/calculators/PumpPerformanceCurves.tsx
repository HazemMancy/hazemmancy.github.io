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
    const isPD = pumpType.includes('reciprocating') || pumpType.includes('rotary');

    // Centrifugal Curve Shape Parameters (Generic approximations based on Specific Speed Ns typical for the type)
    let shutoffHeadRatio = 1.20; // H_so / H_des
    let steepness = 2.0;         // Exponent n in H = Hso - kQ^n
    let shutoffPowerRatio = 0.4; // P_so / P_des

    if (!isPD) {
      if (pumpType.includes('oh1') || pumpType.includes('oh2')) {
        // Radial Flow (Low Ns): Flat curve, stable.
        shutoffHeadRatio = 1.15;
        steepness = 2.0;
        shutoffPowerRatio = 0.35;
      } else if (pumpType.includes('oh3') || pumpType.includes('bb2')) {
        // Radial/Mixed: Slightly steeper.
        shutoffHeadRatio = 1.20;
        steepness = 2.1;
        shutoffPowerRatio = 0.40;
      } else if (pumpType.includes('bb1') || pumpType.includes('bb3')) {
        // Double Suction / Multistage (Often Broad Efficiency)
        shutoffHeadRatio = 1.25;
        steepness = 2.2;
        shutoffPowerRatio = 0.45;
      } else if (pumpType.includes('vs')) {
        // Vertical (often Mixed Flow/High Ns)
        // Steep H-Q curve, High Shutoff Power.
        shutoffHeadRatio = 1.40;
        steepness = 2.5;
        shutoffPowerRatio = 0.60;
      }
    }

    const shutoffHead = designHead * shutoffHeadRatio;

    for (let i = 0; i <= 30; i++) {
      let flow, head, efficiency, power, npshrValue;

      if (isPD) {
        // POSITIVE DISPLACEMENT LOGIC (API 674/676)
        // Flow is nearly constant (RPM dependent), independent of head, minus slip.
        // Curve Representation: Steep Drop at Q_rated. 
        // Slip varies by type: Recip (Low Slip), Rotary Gear/Lobe (Higher Slip with pressure)

        const slipFactor = pumpType.includes('reciprocating') ? 0.03 : 0.10; // 3% vs 10% slip
        const slipSlope = (designHead / (designFlow * slipFactor));

        // We plot X (Flow) from 0 to slightly past design.
        flow = minFlow + (i * flowStep);

        // Q_theoretical roughly Design * (1 + Slip at Design)
        const q_theo = designFlow * (1 + slipFactor);

        // H = (Q_theo - Q) / (Q_theo * SlipPerHead) ... simplified:
        // Linear slip model: Q = Q_theo - (SlipCoefficient * P)
        // So Head = (Q_theo - Flow) * Slope

        if (flow > q_theo) {
          head = 0;
          efficiency = 0;
          power = 0;
        } else {
          // PD Head technically limited by relief valve / mechanical strength, not fluid dynamics.
          // We show the "Capability" curve which is the linear slip line.
          head = Math.max(0, (q_theo - flow) * slipSlope);

          // Cap head for visual scale (e.g. 1.5x design) so chart isn't infinite
          if (head > designHead * 1.5) head = designHead * 1.5;

          // PD Efficiency: dominated by leakage and friction. 
          // volumetric eff changes with pressure. mech eff constant-ish.
          // Simple model: Eff drops at low pressure (mech losses dominant relative to work)? 
          // No, Eff drops at high pressure (leakage).
          // Let's assume constant eff for visualization simplicity or slight drop.
          efficiency = operatingEfficiency * (1 - (head / designHead - 1) * 0.05);

          // PD Power: Directly proportional to Pressure (Head)
          // P = Q * P_diff / Eff
          power = flow > 0 && efficiency > 0
            ? (flow / 3600) * head * 9.81 * 1000 / (efficiency / 100) / 1000
            : 0;
        }

        npshrValue = npshr; // Constant NPSHr for PD at fixed speed

      } else {
        // CENTRIFUGAL LOGIC (API 610)
        flow = minFlow + (i * flowStep);
        const flowRatio = flow / designFlow;

        // Head Curve
        head = Math.max(0, shutoffHead - (shutoffHead - designHead) * Math.pow(flowRatio, steepness));

        // Efficiency Curve (Bell shaped)
        const effPeak = operatingEfficiency;
        if (flowRatio < 0.1) efficiency = 0;
        else {
          // Broader efficiency for lower Ns (Radial), narrower for High Ns (Axial)
          const effWidth = shutoffHeadRatio < 1.3 ? 0.6 : 0.45;
          efficiency = Math.max(0, effPeak * Math.exp(-Math.pow((flowRatio - 1) / effWidth, 2)));
        }

        // Power Curve
        power = flow > 0 && efficiency > 0
          ? (flow / 3600) * head * 9.81 * 1000 / (efficiency / 100) / 1000
          : operatingPower * shutoffPowerRatio;

        // NPSHr Curve (Standard Parabolic)
        npshrValue = npshr * Math.pow(flowRatio, 2) * 0.75 + npshr * 0.25;
      }

      points.push({
        flow: Number(flow.toFixed(2)),
        head: Number(Math.max(0, head).toFixed(2)),
        efficiency: Number(Math.max(0, Math.min(100, efficiency)).toFixed(1)),
        power: Number(Math.max(0, power).toFixed(2)),
        npshr: Number(Math.max(0.1, npshrValue).toFixed(2))
      });
    }

    return points;
  }, [operatingFlow, operatingHead, operatingEfficiency, operatingPower, npshr, pumpType]);

  // Calculate NPSH margin
  const npshMargin = npshr > 0 ? ((npsha - npshr) / npshr) * 100 : 100;

  // Determine operating status
  const getOperatingStatus = () => {
    if (npsha < npshr) {
      return { status: 'danger', message: 'Cavitation Warning', color: 'text-red-500' };
    }
    if (npshMargin < 10) { // API 610 prefers 10% or 1m
      return { status: 'warning', message: 'Low NPSH Margin', color: 'text-yellow-500' };
    }
    return { status: 'good', message: 'Stable Operation', color: 'text-green-500' };
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
            <Badge variant={operatingStatus.status === 'good' ? 'outline' : 'destructive'} className={operatingStatus.status === 'good' ? 'text-green-600 border-green-200 bg-green-50' : ''}>
              {operatingStatus.message}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {/* Increased margin-left/right/bottom to prevent label overlap */}
              <ComposedChart data={curveData} margin={{ top: 20, right: 50, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                <XAxis
                  dataKey="flow"
                  label={{ value: 'Flow (m³/h)', position: 'insideBottom', offset: -10, fontSize: 11, fontWeight: 500 }}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="head"
                  label={{ value: 'Head (m)', angle: -90, position: 'insideLeft', fontSize: 11, fontWeight: 500, offset: 0, style: { textAnchor: 'middle', fill: 'hsl(var(--primary))' } }}
                  tick={{ fontSize: 10, fill: 'hsl(var(--primary))' }}
                  domain={['auto', 'auto']}
                  width={60}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="efficiency"
                  orientation="right"
                  label={{ value: 'Eff (%)', angle: 90, position: 'insideRight', fontSize: 11, fontWeight: 500, offset: 0, style: { textAnchor: 'middle', fill: 'hsl(var(--chart-2))' } }}
                  tick={{ fontSize: 10, fill: 'hsl(var(--chart-2))' }}
                  domain={[0, 100]}
                  width={50}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  labelFormatter={(value) => `Flow: ${Number(value).toFixed(2)} m³/h`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'head') return [<span style={{ color: 'hsl(var(--primary))' }}>{value.toFixed(1)} m</span>, 'Head'];
                    if (name === 'efficiency') return [<span style={{ color: 'hsl(var(--chart-2))' }}>{value.toFixed(1)}%</span>, 'Efficiency'];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />

                {/* Efficiency curve (Area) */}
                <Area
                  yAxisId="efficiency"
                  type="monotone"
                  dataKey="efficiency"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEff)"
                  name="Efficiency"
                />

                {/* Head curve (Line) */}
                <Line
                  yAxisId="head"
                  type="monotone"
                  dataKey="head"
                  stroke="hsl(var(--primary))" // Theme Primary
                  strokeWidth={3}
                  dot={false}
                  name="Head"
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />

                {/* Operating point marker */}
                <ReferenceDot
                  x={Math.round(operatingFlow * 10) / 10}
                  y={operatingHead}
                  yAxisId="head"
                  r={6}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />

                {/* Operating flow reference line */}
                <ReferenceLine
                  x={Math.round(operatingFlow * 10) / 10}
                  yAxisId="head"
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Operating point info */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-center border border-primary/20">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Operating</span>
              </div>
              <p className="text-xs sm:text-sm font-medium">{operatingFlow.toFixed(1)} m³/h</p>
            </div>
            <div className="p-2 bg-muted/30 rounded-lg text-center border">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Head</span>
              <p className="text-xs sm:text-sm font-medium text-primary">{operatingHead.toFixed(1)} m</p>
            </div>
            <div className="p-2 bg-muted/30 rounded-lg text-center border">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Efficiency</span>
              <p className="text-xs sm:text-sm font-medium text-[hsl(var(--chart-2))]">{operatingEfficiency.toFixed(1)}%</p>
            </div>
            <div className={`p-2 rounded-lg text-center border ${npshMargin < 0 ? 'bg-red-500/10 border-red-500/20' :
              npshMargin < 15 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'
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
              <ComposedChart data={curveData} margin={{ top: 20, right: 50, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                <XAxis
                  dataKey="flow"
                  label={{ value: 'Flow (m³/h)', position: 'insideBottom', offset: -10, fontSize: 11, fontWeight: 500 }}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="power"
                  label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fontSize: 11, fontWeight: 500, offset: 10, style: { textAnchor: 'middle', fill: 'hsl(var(--chart-3))' } }}
                  tick={{ fontSize: 10, fill: 'hsl(var(--chart-3))' }}
                  width={60}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="npshr"
                  orientation="right"
                  label={{ value: 'NPSHr (m)', angle: 90, position: 'insideRight', fontSize: 11, fontWeight: 500, offset: 10, style: { textAnchor: 'middle', fill: 'hsl(var(--chart-4))' } }}
                  tick={{ fontSize: 10, fill: 'hsl(var(--chart-4))' }}
                  width={50}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  labelFormatter={(value) => `Flow: ${Number(value).toFixed(2)} m³/h`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'power') return [<span style={{ color: 'hsl(var(--chart-3))' }}>{value.toFixed(1)} kW</span>, 'Power'];
                    if (name === 'npshr') return [<span style={{ color: 'hsl(var(--chart-4))' }}>{value.toFixed(2)} m</span>, 'NPSHr'];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />

                <Line
                  yAxisId="power"
                  type="monotone"
                  dataKey="power"
                  stroke="hsl(var(--chart-3))" // Chart 3 (Usually Amber/Orange in theme)
                  strokeWidth={2}
                  dot={false}
                  name="Power"
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="npshr"
                  type="monotone"
                  dataKey="npshr"
                  stroke="hsl(var(--chart-4))" // Chart 4 (Usually Violet/Purple in theme)
                  strokeWidth={2}
                  dot={false}
                  name="NPSHr"
                  activeDot={{ r: 5 }}
                />

                {/* NPSHa reference line */}
                <ReferenceLine
                  y={npsha}
                  yAxisId="npshr"
                  stroke="hsl(var(--chart-4))"
                  strokeDasharray="5 5"
                  // Moved label slightly to ensure it doesn't overlap excessively 
                  label={{ value: `NPSHa: ${npsha.toFixed(1)}m`, position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--chart-4))', offset: 10 }}
                />

                <ReferenceLine
                  x={Math.round(operatingFlow * 10) / 10}
                  yAxisId="power"
                  stroke="hsl(var(--chart-3))"
                  strokeDasharray="3 3"
                  label={{ value: 'Op', position: 'insideTop', fontSize: 10, fill: 'hsl(var(--chart-3))' }}
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
