// SYNTHETIC SCREENING CURVE — NOT VENDOR DATA
// Pump H-Q curve generated from assumed parabolic characteristic anchored at the selected
// design point. Efficiency is displayed as a scalar result card only — it is NOT plotted
// on the head axis to avoid unit mixing. This component is intentionally structured to
// support future replacement with real vendor curve data points.
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Info, CircleDot, AlertTriangle } from "lucide-react";
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
  pumpCurveGradientStart: "rgba(59, 130, 246, 0.20)",
  pumpCurveGradientMid: "rgba(59, 130, 246, 0.07)",
  pumpCurveGradientEnd: "rgba(59, 130, 246, 0.01)",
  systemCurve: "#f59e0b",
  systemCurveGradientStart: "rgba(245, 158, 11, 0.12)",
  systemCurveGradientMid: "rgba(245, 158, 11, 0.04)",
  systemCurveGradientEnd: "rgba(245, 158, 11, 0.01)",
  power: "#ef4444",
  minMaxRegion: "rgba(59, 130, 246, 0.04)",
  minMaxBorder: "rgba(59, 130, 246, 0.12)",
  operatingPoint: "#3b82f6",
  operatingPointGlow: "rgba(59, 130, 246, 0.25)",
  grid: "hsl(var(--muted) / 0.15)",
  gridMajor: "hsl(var(--muted) / 0.25)",
  axisText: "hsl(var(--muted-foreground) / 0.65)",
  axisLabel: "hsl(var(--muted-foreground) / 0.9)",
};

// Legend entries — efficiency deliberately excluded from chart (% ≠ head units)
const LEGEND_NAMES: Record<string, string> = {
  pumpHead: "Pump H-Q (generated)",
  systemHead: "System Curve",
  power: "Brake Power",
};

function CustomTooltip({ active, payload, label, flowUnit, headUnit, powerUnit }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const pumpHeadEntry = payload.find((p: any) => p.dataKey === "pumpHead");
  const systemHeadEntry = payload.find((p: any) => p.dataKey === "systemHead");
  const powerEntry = payload.find((p: any) => p.dataKey === "power");

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "6px",
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        minWidth: "200px",
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
        Q = {label} {flowUnit}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {pumpHeadEntry && pumpHeadEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.pumpCurve, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Pump Head</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {pumpHeadEntry.value.toFixed(1)} {headUnit}
            </span>
          </div>
        )}
        {systemHeadEntry && systemHeadEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.systemCurve, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>System Head</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {systemHeadEntry.value.toFixed(1)} {headUnit}
            </span>
          </div>
        )}
        {powerEntry && powerEntry.value != null && powerEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.power, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Brake Power</span>
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
        const isDashed = entry.dataKey === "systemHead";
        return (
          <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="10" viewBox="0 0 18 10" style={{ flexShrink: 0 }}>
              {isDashed ? (
                <line x1="0" y1="5" x2="18" y2="5" stroke={entry.color} strokeWidth="2" strokeDasharray="4 2" />
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

  // ─── Synthetic H-Q curve basis (MUST be disclosed) ──────────────────────────
  // Parabolic characteristic anchored at 3 points based on typical centrifugal behavior:
  //   r = 0.00 → H = 1.20 × TDH  (assumed shutoff head)
  //   r = 1.00 → H = TDH          (selected design / operating point)
  //   r = 1.20 → H = 0.80 × TDH  (assumed runout end)
  // Fitted: H = TDH × (1.20 + 0.467·r − 0.667·r²)
  // This is a GENERATED SYNTHETIC CURVE, not derived from real impeller test data.
  // Replace with actual vendor H-Q data points for final pump selection.
  const shutoffHeadSI = tdhSI * 1.20;
  const frictionHeadSI = Math.max(0, tdhSI - staticHeadSI);
  const maxFlowSI = designFlowSI * 1.35;
  const points = 80;

  // Assumed preferred operating region: 70–120% of design flow (typical HI guidance)
  // This is an ASSUMED zone centered on the selected design point, not a verified BEP range.
  const preferredMinFrac = 0.7;
  const preferredMaxFrac = 1.2;

  const data = [];
  for (let i = 0; i <= points; i++) {
    const qSI = (maxFlowSI * i) / points;
    const qRatio = qSI / designFlowSI;

    const pumpHeadSI = Math.max(
      0,
      tdhSI * (1.20 + 0.467 * qRatio - 0.667 * qRatio * qRatio)
    );
    const systemHeadSI = staticHeadSI + frictionHeadSI * qRatio * qRatio;

    const qM3s = qSI / 3600;
    const powerSI = qM3s > 0 && pumpEfficiency > 0
      ? (liquidDensity * G * pumpHeadSI * qM3s) / (pumpEfficiency / 100) / 1000
      : 0;

    data.push({
      flow: parseFloat(convertFlow(qSI).toFixed(2)),
      pumpHead: parseFloat(convertHead(pumpHeadSI).toFixed(2)),
      systemHead: parseFloat(convertHead(systemHeadSI).toFixed(2)),
      // NOTE: efficiency (%) is intentionally NOT included in chart data —
      // it must not share the head (m/ft) Y-axis to avoid unit mixing.
      power: parseFloat(convertPower(powerSI).toFixed(2)),
    });
  }

  const displayFlow = convertFlow(designFlowSI);
  const displayTDH = convertHead(tdhSI);
  const displayShutoff = convertHead(shutoffHeadSI);
  const displayStaticHead = convertHead(staticHeadSI);
  const displayBrakePower = convertPower(brakePowerSI);

  const headMax = Math.ceil(convertHead(shutoffHeadSI) * 1.15 / 5) * 5;
  const powerMax = Math.ceil(displayBrakePower * 1.8 / 5) * 5 || 10;

  return (
    <Card data-testid="pump-curve-chart" id="chart-pump-curve">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Illustrative Centrifugal Pump Screening Curves</h4>
          <span className="text-[10px] text-amber-500/80 ml-1 uppercase tracking-wider font-medium">Generated — Not Vendor Data</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">

        {/* Screening disclaimer — visible to user */}
        <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground/90 leading-relaxed">
            <span className="font-semibold text-foreground/80">Screening visualization only.</span>{" "}
            Curve shown is generated from assumed characteristic shape anchored to the selected design point — it is not vendor performance data.
            Final pump selection shall be based on manufacturer certified performance curves.
          </p>
        </div>

        <div className="flex items-stretch">
          <div className="relative w-7 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
              {`Head (${headUnit})`}
            </span>
          </div>
          <div className="flex-1 h-[400px] border border-border/20 rounded-sm">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 55, left: 12, bottom: 32 }}
            >
              <defs>
                <linearGradient id="pumpHeadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.pumpCurveGradientStart} />
                  <stop offset="50%" stopColor={COLORS.pumpCurveGradientMid} />
                  <stop offset="100%" stopColor={COLORS.pumpCurveGradientEnd} />
                </linearGradient>
                <linearGradient id="systemHeadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.systemCurveGradientStart} />
                  <stop offset="50%" stopColor={COLORS.systemCurveGradientMid} />
                  <stop offset="100%" stopColor={COLORS.systemCurveGradientEnd} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="2 6"
                stroke={COLORS.grid}
                vertical={true}
                horizontal={true}
                horizontalFill={["transparent", "hsl(var(--muted) / 0.03)"]}
              />

              <XAxis
                dataKey="flow"
                tick={{ fill: COLORS.axisText, fontSize: 10, fontWeight: 400 }}
                tickLine={{ stroke: COLORS.grid, strokeWidth: 0.5 }}
                axisLine={{ stroke: COLORS.gridMajor, strokeWidth: 1 }}
                label={{
                  value: `Flow (${flowUnit})`,
                  position: "insideBottom",
                  offset: -18,
                  fill: COLORS.axisLabel,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <YAxis
                yAxisId="head"
                domain={[0, headMax]}
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
                    headUnit={headUnit}
                    powerUnit={powerUnit}
                  />
                }
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.12)", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Legend content={<CustomLegend />} />

              {/* Assumed preferred operating zone — centered on design point, NOT a verified BEP range */}
              <ReferenceArea
                yAxisId="head"
                x1={parseFloat(convertFlow(designFlowSI * preferredMinFrac).toFixed(2))}
                x2={parseFloat(convertFlow(designFlowSI * preferredMaxFrac).toFixed(2))}
                fill={COLORS.minMaxRegion}
                stroke={COLORS.minMaxBorder}
                strokeDasharray="3 3"
                label={{
                  value: "Assumed Preferred Zone",
                  position: "insideTop",
                  fill: COLORS.operatingPoint,
                  fontSize: 7,
                  fontWeight: 500,
                  opacity: 0.5,
                }}
              />

              {/* H-Q: synthetic parabolic curve — Area renders both gradient fill and stroke to avoid duplicate dataKey warning */}
              <Area
                yAxisId="head"
                type="monotone"
                dataKey="pumpHead"
                fill="url(#pumpHeadGrad)"
                stroke={COLORS.pumpCurve}
                strokeWidth={2.5}
                dot={false}
                name="pumpHead"
                activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: "#fff", fill: COLORS.pumpCurve }}
              />
              {/* System curve: H_sys = H_static + H_friction × (Q/Q_design)² */}
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
              {/* Brake power on right axis — power units only, no efficiency mixing */}
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
                y={parseFloat(displayShutoff.toFixed(2))}
                stroke={COLORS.pumpCurve}
                strokeWidth={0.8}
                strokeDasharray="4 6"
                label={{
                  value: `Assumed shutoff ${displayShutoff.toFixed(0)} ${headUnit}`,
                  position: "insideTopRight",
                  fill: COLORS.pumpCurve,
                  fontSize: 8,
                  fontWeight: 500,
                  opacity: 0.6,
                }}
              />

              <ReferenceLine
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.18)"
                strokeDasharray="3 3"
                strokeWidth={0.8}
              />
              <ReferenceLine
                yAxisId="head"
                y={parseFloat(displayTDH.toFixed(2))}
                stroke="hsl(var(--muted-foreground) / 0.10)"
                strokeDasharray="3 3"
                strokeWidth={0.8}
              />

              <ReferenceDot
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                y={parseFloat(displayTDH.toFixed(2))}
                r={12}
                fill={COLORS.operatingPointGlow}
                stroke="none"
              />
              <ReferenceDot
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                y={parseFloat(displayTDH.toFixed(2))}
                r={6}
                fill={COLORS.operatingPoint}
                stroke="#ffffff"
                strokeWidth={2.5}
                label={{
                  value: "Design Pt",
                  position: "top",
                  offset: 12,
                  fill: COLORS.operatingPoint,
                  fontSize: 9,
                  fontWeight: 700,
                }}
              />
              <ReferenceDot
                yAxisId="head"
                x={parseFloat(displayFlow.toFixed(2))}
                y={parseFloat(displayTDH.toFixed(2))}
                r={2}
                fill="#ffffff"
                stroke="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
          <div className="relative w-7 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
              {`Brake Power (${powerUnit})`}
            </span>
          </div>
        </div>

        {/* Scalar result cards — efficiency shown here, NOT on head axis */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs border-t border-muted/20 pt-3.5 px-2">
          <div className="flex items-center gap-2.5">
            <CircleDot className="w-3.5 h-3.5 shrink-0" style={{ color: COLORS.operatingPoint }} />
            <span className="text-foreground font-medium" data-testid="text-operating-point">
              Design Point: {displayFlow.toFixed(1)} {flowUnit} @ {displayTDH.toFixed(1)} {headUnit}
            </span>
          </div>
          <div className="text-muted-foreground">
            Pump Efficiency (input): <span className="text-foreground font-semibold">{pumpEfficiency.toFixed(0)}%</span>
            <span className="ml-1 text-muted-foreground/50 text-[10px]">(scalar — not plotted on head axis)</span>
          </div>
          <div className="text-muted-foreground">
            Brake Power: <span className="text-foreground font-semibold">{displayBrakePower.toFixed(2)} {powerUnit}</span>
          </div>
          <div className="text-muted-foreground">
            Static Head: <span className="text-foreground font-semibold">{displayStaticHead.toFixed(1)} {headUnit}</span>
            <span className="mx-1.5 text-muted-foreground/40">|</span>
            Assumed shutoff: <span className="text-foreground font-semibold">{displayShutoff.toFixed(1)} {headUnit}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 border-t border-muted/20 pt-3">
          <Info className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed" data-testid="pump-curve-note">
            <span className="font-medium text-foreground/70">Synthetic curve basis:</span>{" "}
            H-Q parabola H = TDH × (1.20 + 0.467·r − 0.667·r²) anchored at assumed shutoff = 1.20×TDH (r=0),
            design point = TDH (r=1), assumed runout ≈ 0.80×TDH (r=1.20).
            System curve: H_sys = H_static + H_friction × (Q/Q_design)².
            Brake power: P = ρgHQ/η at each flow point.
            Preferred zone: 70–120% of design flow — assumed, not vendor-verified.
            Efficiency (%) is shown as a scalar only and is not plotted on the head axis.
            Verify all results against manufacturer certified performance curves before pump selection.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
