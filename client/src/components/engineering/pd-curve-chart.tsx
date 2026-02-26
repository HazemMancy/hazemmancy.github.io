import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Info, CircleDot } from "lucide-react";
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
  ReferenceArea,
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
  actualFlowGradientStart: "rgba(34, 197, 94, 0.16)",
  actualFlowGradientMid: "rgba(34, 197, 94, 0.05)",
  actualFlowGradientEnd: "rgba(34, 197, 94, 0.01)",
  slipLine: "#ef4444",
  slipFill: "rgba(239, 68, 68, 0.08)",
  slipGradientStart: "rgba(239, 68, 68, 0.18)",
  slipGradientMid: "rgba(239, 68, 68, 0.08)",
  slipGradientEnd: "rgba(239, 68, 68, 0.02)",
  power: "#f59e0b",
  volEfficiency: "#8b5cf6",
  operatingPoint: "#3b82f6",
  operatingPointGlow: "rgba(59, 130, 246, 0.25)",
  grid: "hsl(var(--muted) / 0.15)",
  gridMajor: "hsl(var(--muted) / 0.25)",
  axisText: "hsl(var(--muted-foreground) / 0.65)",
  axisLabel: "hsl(var(--muted-foreground) / 0.9)",
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
        borderRadius: "6px",
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        minWidth: "210px",
        backdropFilter: "blur(8px)",
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
          letterSpacing: "0.02em",
        }}
      >
        {"\u0394"}P = {label} {pressureUnit}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {theoEntry && theoEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.theoreticalFlow, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Theoretical Flow</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {theoEntry.value.toFixed(1)} {flowUnit}
            </span>
          </div>
        )}
        {actualEntry && actualEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.actualFlow, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Actual Flow</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {actualEntry.value.toFixed(1)} {flowUnit}
            </span>
          </div>
        )}
        {slipEntry && slipEntry.value != null && slipEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.slipFill, borderTop: `2px solid ${COLORS.slipLine}`, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Slip</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {slipEntry.value.toFixed(1)} {flowUnit}
            </span>
          </div>
        )}
        {volEffEntry && volEffEntry.value != null && volEffEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: "transparent", borderTop: `2px dashed ${COLORS.volEfficiency}`, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Vol. Efficiency</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {volEffEntry.value.toFixed(1)}%
            </span>
          </div>
        )}
        {powerEntry && powerEntry.value != null && powerEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.power, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Shaft Power</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
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
    <div style={{ display: "flex", justifyContent: "center", gap: "24px", paddingTop: "12px", flexWrap: "wrap" }}>
      {filtered.map((entry: any) => {
        const isDashed = entry.dataKey === "volEff";
        const isSlip = entry.dataKey === "slipFlow";
        return (
          <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="10" viewBox="0 0 18 10" style={{ flexShrink: 0 }}>
              {isDashed ? (
                <line x1="0" y1="5" x2="18" y2="5" stroke={entry.color} strokeWidth="2" strokeDasharray="4 2" />
              ) : isSlip ? (
                <>
                  <rect x="0" y="2" width="18" height="6" fill={COLORS.slipFill} rx="1" />
                  <line x1="0" y1="5" x2="18" y2="5" stroke={entry.color} strokeWidth="1.5" strokeDasharray="3 2" />
                </>
              ) : (
                <line x1="0" y1="5" x2="18" y2="5" stroke={entry.color} strokeWidth="2.5" strokeLinecap="round" />
              )}
            </svg>
            <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 500, letterSpacing: "0.01em" }}>
              {LEGEND_NAMES[entry.dataKey] || entry.value}
            </span>
          </div>
        );
      })}
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
  const points = 60;

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
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">PD Pump Performance Curves (per API 674/676)</h4>
          <span className="text-[10px] text-muted-foreground/60 ml-1 uppercase tracking-wider font-medium">(Illustrative)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-stretch">
          <div className="relative w-7 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
              {`Flow (${flowUnit}) / Eff (%)`}
            </span>
          </div>
          <div className="flex-1 h-[420px] border border-border/20 rounded-sm">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 55, left: 12, bottom: 32 }}
            >
              <defs>
                <linearGradient id="pdActualFlowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.actualFlowGradientStart} />
                  <stop offset="50%" stopColor={COLORS.actualFlowGradientMid} />
                  <stop offset="100%" stopColor={COLORS.actualFlowGradientEnd} />
                </linearGradient>
                <linearGradient id="pdSlipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.slipGradientStart} />
                  <stop offset="50%" stopColor={COLORS.slipGradientMid} />
                  <stop offset="100%" stopColor={COLORS.slipGradientEnd} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="2 6"
                stroke={COLORS.grid}
                vertical={true}
                horizontal={true}
              />

              <XAxis
                dataKey="pressure"
                tick={{ fill: COLORS.axisText, fontSize: 10, fontWeight: 400 }}
                tickLine={{ stroke: COLORS.grid, strokeWidth: 0.5 }}
                axisLine={{ stroke: COLORS.gridMajor, strokeWidth: 1 }}
                label={{
                  value: `Differential Pressure (${pressureUnit})`,
                  position: "insideBottom",
                  offset: -18,
                  fill: COLORS.axisLabel,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <YAxis
                yAxisId="flow"
                domain={[0, flowMax]}
                tick={{ fill: COLORS.axisText, fontSize: 10, fontWeight: 400 }}
                tickLine={{ stroke: COLORS.grid, strokeWidth: 0.5 }}
                axisLine={{ stroke: COLORS.gridMajor, strokeWidth: 1 }}
                width={52}
              />
              <YAxis
                yAxisId="power"
                orientation="right"
                domain={[0, powerMax]}
                tick={{ fill: COLORS.axisText, fontSize: 10, fontWeight: 400 }}
                tickLine={{ stroke: COLORS.grid, strokeWidth: 0.5 }}
                axisLine={{ stroke: COLORS.gridMajor, strokeWidth: 1 }}
                width={52}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    flowUnit={flowUnit}
                    pressureUnit={pressureUnit}
                    powerUnit={powerUnit}
                  />
                }
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.12)", strokeWidth: 1, strokeDasharray: "4 4" }}
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
                strokeWidth={1.5}
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
                activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: "#fff", fill: COLORS.theoreticalFlow }}
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
                stroke="hsl(var(--muted-foreground) / 0.18)"
                strokeDasharray="3 3"
                strokeWidth={0.8}
              />
              <ReferenceLine
                yAxisId="flow"
                y={parseFloat(displayActualFlow.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.10)"
                strokeDasharray="3 3"
                strokeWidth={0.8}
              />

              <ReferenceDot
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                y={parseFloat(displayActualFlow.toFixed(2))}
                r={12}
                fill={COLORS.operatingPointGlow}
                stroke="none"
              />
              <ReferenceDot
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                y={parseFloat(displayActualFlow.toFixed(2))}
                r={6}
                fill={COLORS.operatingPoint}
                stroke="#ffffff"
                strokeWidth={2.5}
                label={{
                  value: "OP",
                  position: "top",
                  offset: 12,
                  fill: COLORS.operatingPoint,
                  fontSize: 9,
                  fontWeight: 700,
                }}
              />
              <ReferenceDot
                yAxisId="flow"
                x={parseFloat(displayDP.toFixed(2))}
                y={parseFloat(displayActualFlow.toFixed(2))}
                r={2}
                fill="#ffffff"
                stroke="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
          <div className="relative w-7 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
              {`Shaft Power (${powerUnit})`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs border-t border-muted/20 pt-3.5 px-2">
          <div className="flex items-center gap-2.5">
            <CircleDot className="w-3.5 h-3.5 shrink-0" style={{ color: COLORS.operatingPoint }} />
            <span className="text-foreground font-medium" data-testid="text-design-point">
              Design Point: {displayActualFlow.toFixed(1)} {flowUnit} @ {displayDP.toFixed(1)} {pressureUnit}
            </span>
          </div>
          <div className="text-muted-foreground">
            Theoretical Flow: <span className="text-foreground font-semibold">{displayTheoreticalFlow.toFixed(1)} {flowUnit}</span>
          </div>
          <div className="text-muted-foreground">
            Shaft Power: <span className="text-foreground font-semibold">{displayPower.toFixed(2)} {powerUnit}</span>
          </div>
          <div className="text-muted-foreground">
            Vol. Efficiency: <span className="text-foreground font-semibold">{volumetricEfficiency.toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 border-t border-muted/20 pt-3">
          <Info className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed" data-testid="pd-curve-note">
            PD pump curves per API 674/676. Theoretical flow is constant (set by displacement and speed).
            Actual flow decreases with increasing differential pressure due to internal slip.
            The shaded slip region shows the gap between theoretical and actual delivery.
            Power is proportional to differential pressure. Verify against manufacturer data sheets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
