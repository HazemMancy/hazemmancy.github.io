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
  actualFlowFill: "rgba(34, 197, 94, 0.08)",
  slipLine: "#ef4444",
  slipArea: "rgba(239, 68, 68, 0.10)",
  power: "#f59e0b",
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
        <div className="flex items-stretch">
          <div className="flex items-center justify-center w-5 shrink-0">
            <span className="text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap" style={{writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)'}}>
              {`Flow (${flowUnit}) / Eff (%)`}
            </span>
          </div>
          <div className="flex-1 h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 50, left: 10, bottom: 24 }}
            >
              <defs>
                <linearGradient id="pdActualFlowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.actualFlow} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={COLORS.actualFlow} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="pdSlipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.slipLine} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={COLORS.slipLine} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--muted) / 0.2)"
                vertical={false}
              />
              <XAxis
                dataKey="pressure"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={{ stroke: "hsl(var(--muted) / 0.4)" }}
                axisLine={{ stroke: "hsl(var(--muted) / 0.4)" }}
                label={{
                  value: `Differential Pressure (${pressureUnit})`,
                  position: "insideBottom",
                  offset: -14,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              <YAxis
                yAxisId="flow"
                domain={[0, flowMax]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={{ stroke: "hsl(var(--muted) / 0.4)" }}
                axisLine={{ stroke: "hsl(var(--muted) / 0.4)" }}
                width={50}
              />
              <YAxis
                yAxisId="power"
                orientation="right"
                domain={[0, powerMax]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={{ stroke: "hsl(var(--muted) / 0.4)" }}
                axisLine={{ stroke: "hsl(var(--muted) / 0.4)" }}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                  padding: "10px 14px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 6 }}
                itemStyle={{ padding: "2px 0" }}
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
                wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
                iconType="plainline"
                iconSize={14}
                formatter={(value: string) => LEGEND_NAMES[value] || value}
              />

              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="actualFlow"
                fill="url(#pdActualFlowGrad)"
                stroke="none"
                legendType="none"
                tooltipType="none"
              />
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="slipFlow"
                fill="url(#pdSlipGrad)"
                stroke={COLORS.slipLine}
                strokeWidth={1}
                strokeDasharray="4 2"
                name="slipFlow"
                activeDot={false}
              />

              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="theoreticalFlow"
                stroke={COLORS.theoreticalFlow}
                strokeWidth={2.5}
                dot={false}
                name="theoreticalFlow"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="actualFlow"
                stroke={COLORS.actualFlow}
                strokeWidth={2}
                dot={false}
                name="actualFlow"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="volEff"
                stroke={COLORS.volEfficiency}
                strokeWidth={1.8}
                strokeDasharray="5 3"
                dot={false}
                name="volEff"
                activeDot={{ r: 3, strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="power"
                stroke={COLORS.power}
                strokeWidth={2}
                dot={false}
                name="power"
                activeDot={{ r: 3, strokeWidth: 2, stroke: "#fff" }}
              />

              <ReferenceLine
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.25)"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                yAxisId="flow"
                y={parseFloat(displayActualFlow.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.15)"
                strokeDasharray="3 3"
              />
              <ReferenceDot
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                y={parseFloat(displayActualFlow.toFixed(2))}
                r={8}
                fill={COLORS.operatingPoint}
                stroke="#fff"
                strokeWidth={2.5}
              />
              <ReferenceDot
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                y={parseFloat(displayActualFlow.toFixed(2))}
                r={3}
                fill="#fff"
                stroke="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center w-5 shrink-0">
            <span className="text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap" style={{writingMode: 'vertical-lr' as const}}>
              {`Shaft Power (${powerUnit})`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t border-muted/30 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.operatingPoint, border: "2.5px solid white", boxShadow: "0 0 0 1px hsl(var(--border))" }} />
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
