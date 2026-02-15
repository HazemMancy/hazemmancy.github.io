import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PumpCurveChartProps {
  designFlowSI: number;
  tdhSI: number;
  staticHeadSI: number;
  brakePowerSI: number;
  pumpEfficiency: number;
  liquidDensity: number;
  flowUnit: string;
  headUnit: string;
  powerUnit: string;
  convertFlow: (si: number) => number;
  convertHead: (si: number) => number;
  convertPower: (si: number) => number;
}

const G = 9.81;

const COLORS = {
  pumpCurve: "#3b82f6",
  systemCurve: "#d4a04a",
  efficiency: "#22c55e",
  power: "#ef4444",
  operatingPoint: "#d4a04a",
};

const LEGEND_NAMES: Record<string, string> = {
  pumpHead: "Pump Curve (H-Q)",
  systemHead: "System Curve",
  efficiency: "Efficiency (%)",
  power: "Brake Power",
};

export function PumpCurveChart({
  designFlowSI,
  tdhSI,
  staticHeadSI,
  brakePowerSI,
  pumpEfficiency,
  liquidDensity,
  flowUnit,
  headUnit,
  powerUnit,
  convertFlow,
  convertHead,
  convertPower,
}: PumpCurveChartProps) {
  if (designFlowSI <= 0 || tdhSI <= 0) return null;

  const shutoffHeadSI = tdhSI * 1.2;
  const frictionHeadSI = tdhSI - staticHeadSI;
  const maxFlowSI = designFlowSI * 1.5;
  const effPeak = pumpEfficiency;
  const points = 60;

  const data = [];
  for (let i = 0; i <= points; i++) {
    const qSI = (maxFlowSI * i) / points;
    const qRatio = qSI / designFlowSI;

    const pumpHeadSI = Math.max(
      0,
      shutoffHeadSI * (1 - 0.6 * qRatio * qRatio - 0.4 * qRatio * qRatio * qRatio * (qRatio > 1 ? 1.5 : 1))
    );

    const systemHeadSI = staticHeadSI + frictionHeadSI * qRatio * qRatio;

    const effSpread = 0.45;
    const efficiency = qSI > 0 ? effPeak * Math.exp(-Math.pow((qRatio - 1) / effSpread, 2)) : 0;

    const qM3s = qSI / 3600;
    const powerSI = qM3s > 0 && efficiency > 0
      ? (liquidDensity * G * pumpHeadSI * qM3s) / (efficiency / 100) / 1000
      : 0;

    data.push({
      flow: parseFloat(convertFlow(qSI).toFixed(2)),
      pumpHead: parseFloat(convertHead(pumpHeadSI).toFixed(2)),
      systemHead: parseFloat(convertHead(systemHeadSI).toFixed(2)),
      efficiency: parseFloat(efficiency.toFixed(1)),
      power: parseFloat(convertPower(powerSI).toFixed(2)),
    });
  }

  const displayFlow = convertFlow(designFlowSI);
  const displayTDH = convertHead(tdhSI);
  const displayStaticHead = convertHead(staticHeadSI);
  const displayBrakePower = convertPower(brakePowerSI);

  const headMax = Math.ceil(convertHead(shutoffHeadSI) * 1.15 / 5) * 5;
  const powerMax = Math.ceil(displayBrakePower * 1.8 / 5) * 5 || 10;

  return (
    <Card data-testid="pump-curve-chart">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Pump Performance Curves</h4>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 60, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.25)" />
              <XAxis
                dataKey="flow"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                label={{
                  value: `Flow (${flowUnit})`,
                  position: "insideBottom",
                  offset: -10,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                }}
              />
              <YAxis
                yAxisId="head"
                domain={[0, headMax]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                label={{
                  value: `Head (${headUnit}) / Eff (%)`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
              <YAxis
                yAxisId="power"
                orientation="right"
                domain={[0, powerMax]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                label={{
                  value: `Power (${powerUnit})`,
                  angle: 90,
                  position: "insideRight",
                  offset: 10,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "11px",
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ padding: "1px 0" }}
                formatter={(value: number, name: string) => {
                  if (name === "pumpHead") return [`${value.toFixed(1)} ${headUnit}`, "Pump Head"];
                  if (name === "systemHead") return [`${value.toFixed(1)} ${headUnit}`, "System Head"];
                  if (name === "efficiency") return [`${value.toFixed(1)} %`, "Efficiency"];
                  if (name === "power") return [`${value.toFixed(2)} ${powerUnit}`, "Brake Power"];
                  return [value, name];
                }}
                labelFormatter={(label) => `Flow: ${label} ${flowUnit}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                formatter={(value: string) => LEGEND_NAMES[value] || value}
              />

              <Line
                yAxisId="head"
                type="monotone"
                dataKey="pumpHead"
                stroke={COLORS.pumpCurve}
                strokeWidth={2.5}
                dot={false}
                name="pumpHead"
              />
              <Line
                yAxisId="head"
                type="monotone"
                dataKey="systemHead"
                stroke={COLORS.systemCurve}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="systemHead"
              />
              <Line
                yAxisId="head"
                type="monotone"
                dataKey="efficiency"
                stroke={COLORS.efficiency}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="efficiency"
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="power"
                stroke={COLORS.power}
                strokeWidth={1.5}
                dot={false}
                name="power"
              />

              <ReferenceDot
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                y={parseFloat(displayTDH.toFixed(2))}
                r={7}
                fill={COLORS.operatingPoint}
                stroke="#fff"
                strokeWidth={2}
              />
              <ReferenceLine
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.3)"
                strokeDasharray="3 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t border-muted/30 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.operatingPoint, border: "2px solid white" }} />
            <span>Operating Point: {displayFlow.toFixed(1)} {flowUnit} @ {displayTDH.toFixed(1)} {headUnit}</span>
          </div>
          <div>BEP Efficiency: {pumpEfficiency.toFixed(0)}%</div>
          <div>Brake Power: {displayBrakePower.toFixed(2)} {powerUnit}</div>
          <div>Static Head: {displayStaticHead.toFixed(1)} {headUnit}</div>
        </div>

        <div className="flex items-start gap-2 border-t border-muted/30 pt-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="pump-curve-note">
            Pump H-Q and efficiency curves are estimated based on typical centrifugal pump characteristics
            with the design point as BEP. Actual performance must be verified against manufacturer data.
            Power is calculated as P = ρgHQ/η at each flow point along the pump curve.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
