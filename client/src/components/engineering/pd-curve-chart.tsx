import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PDCurveChartProps {
  designFlowSI: number;
  differentialPressureBar: number;
  shaftPowerSI: number;
  volumetricEfficiency: number;
  mechanicalEfficiency: number;
  liquidDensity: number;
  flowUnit: string;
  pressureUnit: string;
  powerUnit: string;
  convertFlow: (si: number) => number;
  convertPressure: (si: number) => number;
  convertPower: (si: number) => number;
}

const COLORS = {
  theoreticalFlow: "#3b82f6",
  actualFlow: "#22c55e",
  slipArea: "rgba(239, 68, 68, 0.15)",
  slipLine: "#ef4444",
  power: "#d4a04a",
  volEfficiency: "#a855f7",
  operatingPoint: "#d4a04a",
};

const LEGEND_NAMES: Record<string, string> = {
  theoreticalFlow: "Theoretical Flow (Q\u209C)",
  actualFlow: "Actual Delivered Flow (Q\u2090)",
  slipFlow: "Slip (Q\u209C \u2212 Q\u2090)",
  power: "Shaft Power",
  volEff: "Vol. Efficiency (%)",
};

export function PDCurveChart({
  designFlowSI,
  differentialPressureBar,
  shaftPowerSI,
  volumetricEfficiency,
  mechanicalEfficiency,
  liquidDensity,
  flowUnit,
  pressureUnit,
  powerUnit,
  convertFlow,
  convertPressure,
  convertPower,
}: PDCurveChartProps) {
  if (designFlowSI <= 0 || differentialPressureBar <= 0) return null;

  const volEff = volumetricEfficiency / 100;
  const mechEff = mechanicalEfficiency / 100;
  const maxPressureBar = differentialPressureBar * 1.5;
  const points = 50;

  const data = [];
  for (let i = 0; i <= points; i++) {
    const dpBar = (maxPressureBar * i) / points;
    const dpRatio = dpBar / differentialPressureBar;

    const slipFactor = 1 + 0.08 * (dpRatio - 1);
    const currentVolEff = Math.max(0.5, Math.min(1.0, volEff / slipFactor));

    const theoreticalFlowSI = designFlowSI / volEff;
    const actualFlowSI = theoreticalFlowSI * currentVolEff;
    const slipFlowSI = theoreticalFlowSI - actualFlowSI;

    const currentVolEffPct = currentVolEff * 100;

    const dpPa = dpBar * 1e5;
    const qM3s = actualFlowSI / 3600;
    const powerSI = (dpPa * qM3s) / (mechEff * 1000);

    data.push({
      pressure: parseFloat(convertPressure(dpBar).toFixed(2)),
      theoreticalFlow: parseFloat(convertFlow(theoreticalFlowSI).toFixed(2)),
      actualFlow: parseFloat(convertFlow(actualFlowSI).toFixed(2)),
      slipFlow: parseFloat(convertFlow(slipFlowSI).toFixed(2)),
      power: parseFloat(convertPower(powerSI).toFixed(2)),
      volEff: parseFloat(currentVolEffPct.toFixed(1)),
    });
  }

  const displayDP = convertPressure(differentialPressureBar);
  const displayActualFlow = convertFlow(designFlowSI);
  const displayTheoreticalFlow = convertFlow(designFlowSI / volEff);
  const displayPower = convertPower(shaftPowerSI);

  const flowMax = Math.ceil(displayTheoreticalFlow * 1.15 / 5) * 5 || Math.ceil(displayTheoreticalFlow * 1.15);
  const powerMax = Math.ceil(displayPower * 1.6 / 5) * 5 || 10;

  return (
    <Card data-testid="pd-curve-chart">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">PD Pump Performance Curves (per API 674/676)</h4>
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
                dataKey="pressure"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                label={{
                  value: `Differential Pressure (${pressureUnit})`,
                  position: "insideBottom",
                  offset: -10,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                }}
              />
              <YAxis
                yAxisId="flow"
                domain={[0, flowMax]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                label={{
                  value: `Flow (${flowUnit}) / Eff (%)`,
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
                  value: `Shaft Power (${powerUnit})`,
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
                  if (name === "theoreticalFlow") return [`${value.toFixed(1)} ${flowUnit}`, "Theoretical Flow"];
                  if (name === "actualFlow") return [`${value.toFixed(1)} ${flowUnit}`, "Actual Flow"];
                  if (name === "slipFlow") return [`${value.toFixed(1)} ${flowUnit}`, "Slip"];
                  if (name === "power") return [`${value.toFixed(2)} ${powerUnit}`, "Shaft Power"];
                  if (name === "volEff") return [`${value.toFixed(1)} %`, "Vol. Efficiency"];
                  return [value, name];
                }}
                labelFormatter={(label) => `\u0394P: ${label} ${pressureUnit}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                formatter={(value: string) => LEGEND_NAMES[value] || value}
              />

              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="slipFlow"
                fill={COLORS.slipArea}
                stroke={COLORS.slipLine}
                strokeWidth={1}
                strokeDasharray="4 2"
                name="slipFlow"
              />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="theoreticalFlow"
                stroke={COLORS.theoreticalFlow}
                strokeWidth={2.5}
                dot={false}
                name="theoreticalFlow"
              />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="actualFlow"
                stroke={COLORS.actualFlow}
                strokeWidth={2}
                dot={false}
                name="actualFlow"
              />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="volEff"
                stroke={COLORS.volEfficiency}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="volEff"
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="power"
                stroke={COLORS.power}
                strokeWidth={2}
                dot={false}
                name="power"
              />

              <ReferenceDot
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                y={parseFloat(displayActualFlow.toFixed(2))}
                r={7}
                fill={COLORS.operatingPoint}
                stroke="#fff"
                strokeWidth={2}
              />
              <ReferenceLine
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.3)"
                strokeDasharray="3 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t border-muted/30 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.operatingPoint, border: "2px solid white" }} />
            <span>Design Point: {displayActualFlow.toFixed(1)} {flowUnit} @ {displayDP.toFixed(1)} {pressureUnit}</span>
          </div>
          <div>Theoretical Flow: {displayTheoreticalFlow.toFixed(1)} {flowUnit}</div>
          <div>Shaft Power: {displayPower.toFixed(2)} {powerUnit}</div>
          <div>Vol. Efficiency: {volumetricEfficiency.toFixed(0)}%</div>
        </div>

        <div className="flex items-start gap-2 border-t border-muted/30 pt-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="pd-curve-note">
            PD pump curves per API 674/676. Theoretical flow is constant (set by displacement and speed).
            Actual flow decreases with increasing differential pressure due to internal slip.
            Power is proportional to differential pressure. Verify against manufacturer data sheets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
