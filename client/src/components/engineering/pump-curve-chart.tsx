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
  pumpCurve: "#2563eb",
  pumpCurveGradientStart: "rgba(37, 99, 235, 0.18)",
  pumpCurveGradientEnd: "rgba(37, 99, 235, 0.02)",
  systemCurve: "#d97706",
  efficiency: "#16a34a",
  efficiencyGradientStart: "rgba(22, 163, 74, 0.12)",
  efficiencyGradientEnd: "rgba(22, 163, 74, 0.01)",
  power: "#dc2626",
  operatingPoint: "#2563eb",
  operatingPointRing: "#ffffff",
  grid: "hsl(var(--muted) / 0.18)",
  gridMajor: "hsl(var(--muted) / 0.30)",
  axisText: "hsl(var(--muted-foreground) / 0.7)",
  axisLabel: "hsl(var(--muted-foreground) / 0.85)",
};

const LEGEND_NAMES: Record<string, string> = {
  pumpHead: "Pump Curve (H-Q)",
  systemHead: "System Curve",
  efficiency: "Efficiency (%)",
  power: "Brake Power",
};

function CustomTooltip({ active, payload, label, flowUnit, headUnit, powerUnit }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const pumpHeadEntry = payload.find((p: any) => p.dataKey === "pumpHead");
  const systemHeadEntry = payload.find((p: any) => p.dataKey === "systemHead");
  const effEntry = payload.find((p: any) => p.dataKey === "efficiency");
  const powerEntry = payload.find((p: any) => p.dataKey === "power");

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
        padding: "10px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        minWidth: "180px",
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
        Flow: {label} {flowUnit}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {pumpHeadEntry && pumpHeadEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.pumpCurve, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Pump Head:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {pumpHeadEntry.value.toFixed(1)} {headUnit}
            </span>
          </div>
        )}
        {systemHeadEntry && systemHeadEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.systemCurve, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>System Head:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {systemHeadEntry.value.toFixed(1)} {headUnit}
            </span>
          </div>
        )}
        {effEntry && effEntry.value != null && effEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.efficiency, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Efficiency:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {effEntry.value.toFixed(1)}%
            </span>
          </div>
        )}
        {powerEntry && powerEntry.value != null && powerEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.power, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Brake Power:</span>
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
              width: entry.dataKey === "efficiency" || entry.dataKey === "systemHead" ? 16 : 12,
              height: 2,
              backgroundColor: entry.color,
              borderRadius: 1,
              ...(entry.dataKey === "efficiency" || entry.dataKey === "systemHead"
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
  const frictionHeadSI = Math.max(0, tdhSI - staticHeadSI);
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
    <Card data-testid="pump-curve-chart" id="chart-pump-curve">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Pump Performance Curves</h4>
          <span className="text-[10px] text-muted-foreground ml-1">(Illustrative)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-stretch">
          <div className="relative w-6 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap">
              {`Head (${headUnit}) / Eff (%)`}
            </span>
          </div>
          <div className="flex-1 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 16, right: 50, left: 10, bottom: 28 }}
            >
              <defs>
                <linearGradient id="pumpHeadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.pumpCurveGradientStart} />
                  <stop offset="100%" stopColor={COLORS.pumpCurveGradientEnd} />
                </linearGradient>
                <linearGradient id="efficiencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.efficiencyGradientStart} />
                  <stop offset="100%" stopColor={COLORS.efficiencyGradientEnd} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="1 4"
                stroke={COLORS.grid}
                vertical={false}
              />

              <XAxis
                dataKey="flow"
                tick={{ fill: COLORS.axisText, fontSize: 10 }}
                tickLine={{ stroke: COLORS.grid }}
                axisLine={{ stroke: COLORS.gridMajor }}
                label={{
                  value: `Flow (${flowUnit})`,
                  position: "insideBottom",
                  offset: -16,
                  fill: COLORS.axisLabel,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              <YAxis
                yAxisId="head"
                domain={[0, headMax]}
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
                    headUnit={headUnit}
                    powerUnit={powerUnit}
                  />
                }
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.15)", strokeWidth: 1 }}
              />
              <Legend content={<CustomLegend />} />

              <Area
                yAxisId="head"
                type="monotone"
                dataKey="pumpHead"
                fill="url(#pumpHeadGrad)"
                stroke="none"
                legendType="none"
                tooltipType="none"
              />
              <Area
                yAxisId="head"
                type="monotone"
                dataKey="efficiency"
                fill="url(#efficiencyGrad)"
                stroke="none"
                legendType="none"
                tooltipType="none"
              />

              <Line
                yAxisId="head"
                type="monotone"
                dataKey="pumpHead"
                stroke={COLORS.pumpCurve}
                strokeWidth={2.5}
                dot={false}
                name="pumpHead"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: COLORS.pumpCurve }}
              />
              <Line
                yAxisId="head"
                type="monotone"
                dataKey="systemHead"
                stroke={COLORS.systemCurve}
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={false}
                name="systemHead"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: COLORS.systemCurve }}
              />
              <Line
                yAxisId="head"
                type="monotone"
                dataKey="efficiency"
                stroke={COLORS.efficiency}
                strokeWidth={1.8}
                strokeDasharray="6 3"
                dot={false}
                name="efficiency"
                activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff", fill: COLORS.efficiency }}
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
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.2)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <ReferenceLine
                yAxisId="head"
                y={parseFloat(displayTDH.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.12)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <ReferenceDot
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                y={parseFloat(displayTDH.toFixed(2))}
                r={8}
                fill={COLORS.operatingPoint}
                stroke={COLORS.operatingPointRing}
                strokeWidth={2.5}
              />
              <ReferenceDot
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                y={parseFloat(displayTDH.toFixed(2))}
                r={3}
                fill="#ffffff"
                stroke="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
          <div className="relative w-6 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap">
              {`Power (${powerUnit})`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-muted/30 pt-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.operatingPoint, border: "2.5px solid white", boxShadow: `0 0 0 1px ${COLORS.operatingPoint}` }} />
            <span className="text-foreground font-medium">
              Operating Point: {displayFlow.toFixed(1)} {flowUnit} @ {displayTDH.toFixed(1)} {headUnit}
            </span>
          </div>
          <div className="text-muted-foreground">
            BEP Efficiency: <span className="text-foreground font-medium">{pumpEfficiency.toFixed(0)}%</span>
          </div>
          <div className="text-muted-foreground">
            Brake Power: <span className="text-foreground font-medium">{displayBrakePower.toFixed(2)} {powerUnit}</span>
          </div>
          <div className="text-muted-foreground">
            Static Head: <span className="text-foreground font-medium">{displayStaticHead.toFixed(1)} {headUnit}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-muted/30 pt-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="pump-curve-note">
            Pump H-Q and efficiency curves are estimated based on typical centrifugal pump characteristics
            with the design point as BEP. Actual performance must be verified against manufacturer data.
            Power is calculated as P = &#x3C1;gHQ/&#x3B7; at each flow point along the pump curve.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
