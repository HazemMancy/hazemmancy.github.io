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
  theoreticalFlow: "#2563eb",
  actualFlow: "#16a34a",
  actualFlowGradientStart: "rgba(22, 163, 74, 0.14)",
  actualFlowGradientEnd: "rgba(22, 163, 74, 0.01)",
  slipLine: "#dc2626",
  slipGradientStart: "rgba(220, 38, 38, 0.12)",
  slipGradientEnd: "rgba(220, 38, 38, 0.02)",
  power: "#d97706",
  volEfficiency: "#8b5cf6",
  operatingPoint: "#2563eb",
  operatingPointRing: "#ffffff",
  grid: "hsl(var(--muted) / 0.18)",
  gridMajor: "hsl(var(--muted) / 0.30)",
  axisText: "hsl(var(--muted-foreground) / 0.7)",
  axisLabel: "hsl(var(--muted-foreground) / 0.85)",
};

const LEGEND_NAMES: Record<string, string> = {
  theoreticalFlow: "Theoretical Flow (Q\u209C)",
  actualFlow: "Actual Delivered Flow (Q\u2090)",
  slipFlow: "Slip (Q\u209C \u2212 Q\u2090)",
  power: "Shaft Power",
  volEff: "Vol. Efficiency (%)",
};

function CustomTooltip({ active, payload, label, flowUnit, pressureUnit, powerUnit }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const theoEntry = payload.find((p: any) => p.dataKey === "theoreticalFlow");
  const actualEntry = payload.find((p: any) => p.dataKey === "actualFlow");
  const slipEntry = payload.find((p: any) => p.dataKey === "slipFlow");
  const powerEntry = payload.find((p: any) => p.dataKey === "power");
  const volEffEntry = payload.find((p: any) => p.dataKey === "volEff");

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
        padding: "10px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        minWidth: "200px",
      }}
    >
      <div
        style={{
          color: "hsl(var(--foreground))",
          fontWeight: 600,
          fontSize: "11px",
          marginBottom: "8px",
          paddingBottom: "6px",
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        {"\u0394"}P: {label} {pressureUnit}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {theoEntry && theoEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.theoreticalFlow, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Theoretical Flow:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {theoEntry.value.toFixed(1)} {flowUnit}
            </span>
          </div>
        )}
        {actualEntry && actualEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.actualFlow, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Actual Flow:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {actualEntry.value.toFixed(1)} {flowUnit}
            </span>
          </div>
        )}
        {slipEntry && slipEntry.value != null && slipEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.slipLine, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Slip:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {slipEntry.value.toFixed(1)} {flowUnit}
            </span>
          </div>
        )}
        {volEffEntry && volEffEntry.value != null && volEffEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.volEfficiency, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Vol. Efficiency:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {volEffEntry.value.toFixed(1)}%
            </span>
          </div>
        )}
        {powerEntry && powerEntry.value != null && powerEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.power, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Shaft Power:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {powerEntry.value.toFixed(2)} {powerUnit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomLegend({ payload }: any) {
  if (!payload) return null;
  const filtered = payload.filter((entry: any) => LEGEND_NAMES[entry.dataKey]);
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "20px", paddingTop: "10px", flexWrap: "wrap" }}>
      {filtered.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: entry.dataKey === "volEff" || entry.dataKey === "slipFlow" ? 16 : 12,
              height: 2,
              backgroundColor: entry.color,
              borderRadius: 1,
              ...(entry.dataKey === "volEff" || entry.dataKey === "slipFlow"
                ? { backgroundImage: `repeating-linear-gradient(90deg, ${entry.color} 0px, ${entry.color} 4px, transparent 4px, transparent 6px)`, backgroundColor: "transparent" }
                : {}),
            }}
          />
          <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>
            {LEGEND_NAMES[entry.dataKey] || entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

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
    <Card data-testid="pd-curve-chart" id="chart-pd-curve">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">PD Pump Performance Curves (per API 674/676)</h4>
          <span className="text-[10px] text-muted-foreground ml-1">(Illustrative)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-stretch">
          <div className="relative w-6 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap">
              {`Flow (${flowUnit}) / Eff (%)`}
            </span>
          </div>
          <div className="flex-1 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 16, right: 50, left: 10, bottom: 28 }}
            >
              <defs>
                <linearGradient id="pdActualFlowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.actualFlowGradientStart} />
                  <stop offset="100%" stopColor={COLORS.actualFlowGradientEnd} />
                </linearGradient>
                <linearGradient id="pdSlipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.slipGradientStart} />
                  <stop offset="100%" stopColor={COLORS.slipGradientEnd} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="1 4"
                stroke={COLORS.grid}
                vertical={false}
              />

              <XAxis
                dataKey="pressure"
                tick={{ fill: COLORS.axisText, fontSize: 10 }}
                tickLine={{ stroke: COLORS.grid }}
                axisLine={{ stroke: COLORS.gridMajor }}
                label={{
                  value: `Differential Pressure (${pressureUnit})`,
                  position: "insideBottom",
                  offset: -16,
                  fill: COLORS.axisLabel,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              <YAxis
                yAxisId="flow"
                domain={[0, flowMax]}
                tick={{ fill: COLORS.axisText, fontSize: 10 }}
                tickLine={{ stroke: COLORS.grid }}
                axisLine={{ stroke: COLORS.gridMajor }}
                width={50}
              />
              <YAxis
                yAxisId="power"
                orientation="right"
                domain={[0, powerMax]}
                tick={{ fill: COLORS.axisText, fontSize: 10 }}
                tickLine={{ stroke: COLORS.grid }}
                axisLine={{ stroke: COLORS.gridMajor }}
                width={50}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    flowUnit={flowUnit}
                    pressureUnit={pressureUnit}
                    powerUnit={powerUnit}
                  />
                }
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.15)", strokeWidth: 1 }}
              />
              <Legend content={<CustomLegend />} />

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
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: COLORS.theoreticalFlow }}
              />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="actualFlow"
                stroke={COLORS.actualFlow}
                strokeWidth={2}
                dot={false}
                name="actualFlow"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: COLORS.actualFlow }}
              />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="volEff"
                stroke={COLORS.volEfficiency}
                strokeWidth={1.8}
                strokeDasharray="6 3"
                dot={false}
                name="volEff"
                activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff", fill: COLORS.volEfficiency }}
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="power"
                stroke={COLORS.power}
                strokeWidth={2}
                dot={false}
                name="power"
                activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff", fill: COLORS.power }}
              />

              <ReferenceLine
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.2)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <ReferenceLine
                yAxisId="flow"
                y={parseFloat(displayActualFlow.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.12)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <ReferenceDot
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                y={parseFloat(displayActualFlow.toFixed(2))}
                r={8}
                fill={COLORS.operatingPoint}
                stroke={COLORS.operatingPointRing}
                strokeWidth={2.5}
              />
              <ReferenceDot
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                y={parseFloat(displayActualFlow.toFixed(2))}
                r={3}
                fill="#ffffff"
                stroke="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
          <div className="relative w-6 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap">
              {`Shaft Power (${powerUnit})`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-muted/30 pt-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.operatingPoint, border: "2.5px solid white", boxShadow: `0 0 0 1px ${COLORS.operatingPoint}` }} />
            <span className="text-foreground font-medium">
              Design Point: {displayActualFlow.toFixed(1)} {flowUnit} @ {displayDP.toFixed(1)} {pressureUnit}
            </span>
          </div>
          <div className="text-muted-foreground">
            Theoretical Flow: <span className="text-foreground font-medium">{displayTheoreticalFlow.toFixed(1)} {flowUnit}</span>
          </div>
          <div className="text-muted-foreground">
            Shaft Power: <span className="text-foreground font-medium">{displayPower.toFixed(2)} {powerUnit}</span>
          </div>
          <div className="text-muted-foreground">
            Vol. Efficiency: <span className="text-foreground font-medium">{volumetricEfficiency.toFixed(0)}%</span>
          </div>
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
