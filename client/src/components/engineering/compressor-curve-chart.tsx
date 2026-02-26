import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Info, CircleDot } from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
  Area,
} from "recharts";
import type { CompressorResult } from "@/lib/engineering/compressorSizing";
import { getUnit, convertFromSI } from "@/lib/engineering/unitConversion";
import type { UnitSystem } from "@/lib/engineering/unitConversion";

interface CompressorCurveChartProps {
  result: CompressorResult;
  unitSystem: UnitSystem;
}

const COLORS = {
  head: "#3b82f6",
  headGradientStart: "rgba(59, 130, 246, 0.22)",
  headGradientMid: "rgba(59, 130, 246, 0.08)",
  headGradientEnd: "rgba(59, 130, 246, 0.01)",
  power: "#ef4444",
  powerGradientStart: "rgba(239, 68, 68, 0.15)",
  powerGradientMid: "rgba(239, 68, 68, 0.05)",
  powerGradientEnd: "rgba(239, 68, 68, 0.01)",
  efficiency: "#22c55e",
  surge: "#f59e0b",
  surgeRegionStart: "rgba(245, 158, 11, 0.12)",
  surgeRegionEnd: "rgba(245, 158, 11, 0.02)",
  surgeRegionStroke: "rgba(245, 158, 11, 0.25)",
  operatingPoint: "#3b82f6",
  operatingPointGlow: "rgba(59, 130, 246, 0.25)",
  grid: "hsl(var(--muted) / 0.15)",
  gridMajor: "hsl(var(--muted) / 0.35)",
  axisText: "hsl(var(--muted-foreground) / 0.65)",
  axisLabel: "hsl(var(--muted-foreground) / 0.9)",
};

function CustomTooltip({ active, payload, label, flowUnit, headUnitLabel, powerUnitLabel, legendNames }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const headEntry = payload.find((p: any) => p.dataKey === "head");
  const powerEntry = payload.find((p: any) => p.dataKey === "power");
  const effEntry = payload.find((p: any) => p.dataKey === "efficiency");

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
        {headEntry && headEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.head, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>{legendNames.head}</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {headEntry.value.toFixed(2)} {headUnitLabel}
            </span>
          </div>
        )}
        {effEntry && effEntry.value != null && effEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.efficiency, flexShrink: 0, backgroundImage: `repeating-linear-gradient(90deg, ${COLORS.efficiency} 0px, ${COLORS.efficiency} 3px, transparent 3px, transparent 5px)`, background: "transparent", borderTop: `2px dashed ${COLORS.efficiency}` }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>{legendNames.efficiency}</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {effEntry.value.toFixed(1)} %
            </span>
          </div>
        )}
        {powerEntry && powerEntry.value != null && powerEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.power, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Shaft Power</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {powerEntry.value.toFixed(1)} {powerUnitLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomLegend({ payload, legendNames }: any) {
  if (!payload) return null;
  const filtered = payload.filter((entry: any) => entry.dataKey !== "surgeRegion");
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "24px", paddingTop: "12px", flexWrap: "wrap" }}>
      {filtered.map((entry: any) => {
        const isDashed = entry.dataKey === "efficiency";
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
              {legendNames[entry.dataKey] || entry.value}
            </span>
          </div>
        );
      })}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="18" height="10" viewBox="0 0 18 10" style={{ flexShrink: 0 }}>
          <line x1="0" y1="5" x2="18" y2="5" stroke={COLORS.surge} strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
        <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 500, letterSpacing: "0.01em" }}>
          Surge Limit
        </span>
      </div>
    </div>
  );
}

export function CompressorCurveChart({ result, unitSystem }: CompressorCurveChartProps) {
  if (!result || result.actualVolumetricFlowRate <= 0) return null;

  const isPolytropic = result.compressionModel === "polytropic";

  const designFlowSI = result.actualVolumetricFlowRate;
  const designHeadKJkg = isPolytropic ? result.totalPolytropicHead : result.totalIsentropicHead;
  const designPowerKW = result.totalShaftPower;
  const designEff = isPolytropic ? result.polytropicEfficiency : result.adiabaticEfficiency;
  const massFlowKgs = result.massFlowRate / 3600;

  const flowUnit = "m\u00B3/h";
  const headUnitLabel = unitSystem === "SI" ? "kJ/kg" : "ft\u00B7lbf/lb";
  const powerUnitLabel = getUnit("power", unitSystem);

  const convertHead = (kJkg: number): number => {
    if (unitSystem === "Field") return kJkg * 334.553;
    return kJkg;
  };
  const convertPower = (kW: number): number => convertFromSI("power", kW, unitSystem);

  const surgeFlowSI = designFlowSI * 0.7;
  const maxFlowSI = designFlowSI * 1.6;
  const shutoffHeadKJkg = designHeadKJkg * 1.15;
  const points = 100;

  const legendNames: Record<string, string> = {
    head: isPolytropic ? "Polytropic Head" : "Isentropic Head",
    power: "Shaft Power",
    efficiency: isPolytropic ? "Polytropic Eff." : "Isentropic Eff.",
  };

  const data = [];
  for (let i = 0; i <= points; i++) {
    const qSI = (maxFlowSI * i) / points;
    const qRatio = qSI / designFlowSI;

    const headKJkg = Math.max(
      0,
      shutoffHeadKJkg * (1 - 0.55 * qRatio * qRatio - 0.3 * Math.pow(qRatio, 3) * (qRatio > 1.1 ? 1.3 : 1))
    );

    const effSpread = 0.4;
    const eff = qSI > 0 ? designEff * Math.exp(-Math.pow((qRatio - 1) / effSpread, 2)) : 0;

    const powerKW = qSI > 0 && eff > 0
      ? massFlowKgs * (headKJkg) / (eff / 100)
      : 0;

    const isSurge = qSI < surgeFlowSI;

    data.push({
      flow: parseFloat(qSI.toFixed(1)),
      head: parseFloat(convertHead(headKJkg).toFixed(2)),
      power: parseFloat(convertPower(powerKW).toFixed(1)),
      efficiency: parseFloat(eff.toFixed(1)),
      surgeRegion: isSurge ? parseFloat((convertHead(headKJkg) * 1.05).toFixed(2)) : undefined,
    });
  }

  const displayFlow = parseFloat(designFlowSI.toFixed(1));
  const displayHead = parseFloat(convertHead(designHeadKJkg).toFixed(2));
  const displayPower = parseFloat(convertPower(designPowerKW).toFixed(1));

  const headMax = Math.ceil(convertHead(shutoffHeadKJkg) * 1.15 / 10) * 10 || 100;
  const powerMax = Math.ceil(displayPower * 2 / 50) * 50 || 500;

  return (
    <Card data-testid="compressor-curve-chart" id="chart-compressor-curve">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Compressor Performance Curves</h4>
          <span className="text-[10px] text-muted-foreground/60 ml-1 uppercase tracking-wider font-medium">(Illustrative)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-stretch">
          <div className="relative w-7 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
              {`Head (${headUnitLabel}) / Eff. (%)`}
            </span>
          </div>
          <div className="flex-1 h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 55, left: 12, bottom: 32 }}
            >
              <defs>
                <linearGradient id="compHeadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.headGradientStart} />
                  <stop offset="50%" stopColor={COLORS.headGradientMid} />
                  <stop offset="100%" stopColor={COLORS.headGradientEnd} />
                </linearGradient>
                <linearGradient id="compPowerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.powerGradientStart} />
                  <stop offset="50%" stopColor={COLORS.powerGradientMid} />
                  <stop offset="100%" stopColor={COLORS.powerGradientEnd} />
                </linearGradient>
                <linearGradient id="compSurgeGrad" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor={COLORS.surgeRegionStart} />
                  <stop offset="100%" stopColor={COLORS.surgeRegionEnd} />
                </linearGradient>
                <filter id="compOpGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="2 6"
                stroke={COLORS.grid}
                vertical={true}
                horizontalPoints={[]}
              />

              <XAxis
                dataKey="flow"
                tick={{ fill: COLORS.axisText, fontSize: 10, fontWeight: 400 }}
                tickLine={{ stroke: COLORS.grid, strokeWidth: 0.5 }}
                axisLine={{ stroke: COLORS.gridMajor, strokeWidth: 1 }}
                label={{
                  value: `Actual Inlet Flow (${flowUnit})`,
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
                    headUnitLabel={headUnitLabel}
                    powerUnitLabel={powerUnitLabel}
                    legendNames={legendNames}
                  />
                }
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.12)", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Legend content={<CustomLegend legendNames={legendNames} />} />

              <Area
                yAxisId="head"
                type="monotone"
                dataKey="surgeRegion"
                fill="url(#compSurgeGrad)"
                stroke={COLORS.surgeRegionStroke}
                strokeWidth={0}
                legendType="none"
                tooltipType="none"
              />

              <Area
                yAxisId="head"
                type="monotone"
                dataKey="head"
                fill="url(#compHeadGrad)"
                stroke="none"
                legendType="none"
                tooltipType="none"
              />

              <Line
                yAxisId="head"
                type="monotone"
                dataKey="head"
                stroke={COLORS.head}
                strokeWidth={2.5}
                dot={false}
                name="head"
                activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: "#fff", fill: COLORS.head }}
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

              <ReferenceArea
                yAxisId="head"
                x1={parseFloat((designFlowSI * 0.9).toFixed(1))}
                x2={parseFloat((designFlowSI * 1.1).toFixed(1))}
                fill="#22c55e"
                fillOpacity={0.06}
                stroke="#22c55e"
                strokeOpacity={0.15}
                strokeDasharray="4 4"
                label={{
                  value: "BEP",
                  position: "insideTop",
                  fill: "#22c55e",
                  fontSize: 8,
                  fontWeight: 600,
                  opacity: 0.6,
                }}
              />

              <ReferenceLine
                yAxisId="head"
                x={parseFloat(surgeFlowSI.toFixed(1))}
                stroke={COLORS.surge}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                label={{
                  value: "SURGE",
                  position: "top",
                  fill: COLORS.surge,
                  fontSize: 9,
                  fontWeight: 700,
                }}
              />

              <ReferenceLine
                yAxisId="head"
                x={displayFlow}
                stroke="hsl(var(--muted-foreground) / 0.18)"
                strokeDasharray="3 3"
                strokeWidth={0.8}
              />
              <ReferenceLine
                yAxisId="head"
                y={displayHead}
                stroke="hsl(var(--muted-foreground) / 0.10)"
                strokeDasharray="3 3"
                strokeWidth={0.8}
              />

              <ReferenceDot
                yAxisId="head"
                x={displayFlow}
                y={displayHead}
                r={12}
                fill={COLORS.operatingPointGlow}
                stroke="none"
              />
              <ReferenceDot
                yAxisId="head"
                x={displayFlow}
                y={displayHead}
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
                yAxisId="head"
                x={displayFlow}
                y={displayHead}
                r={2}
                fill="#ffffff"
                stroke="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
          <div className="relative w-7 shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
              {`Shaft Power (${powerUnitLabel})`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs border-t border-muted/20 pt-3.5 px-2">
          <div className="flex items-center gap-2.5">
            <CircleDot className="w-3.5 h-3.5 shrink-0" style={{ color: COLORS.operatingPoint }} />
            <span className="text-foreground font-medium" data-testid="text-design-point">
              Design Point: {displayFlow.toFixed(0)} {flowUnit} @ {displayHead.toFixed(1)} {headUnitLabel}
            </span>
          </div>
          <div className="text-muted-foreground">
            {isPolytropic ? "Polytropic" : "Isentropic"} Eff: <span className="text-foreground font-semibold">{designEff.toFixed(1)}%</span>
          </div>
          <div className="text-muted-foreground">
            Shaft Power: <span className="text-foreground font-semibold">{displayPower.toFixed(1)} {powerUnitLabel}</span>
          </div>
          <div className="text-muted-foreground">
            Stages: <span className="text-foreground font-semibold">{result.numberOfStages}</span>
            <span className="mx-1.5 text-muted-foreground/40">|</span>
            Ratio: <span className="text-foreground font-semibold">{result.overallCompressionRatio.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 border-t border-muted/20 pt-3">
          <Info className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed" data-testid="compressor-curve-note">
            Curves are illustrative, based on typical {result.compressorType} compressor characteristics
            with the design point at best efficiency. The surge line is schematic (~70% of design flow).
            Power is derived as P = m&#x0307; &times; H / &eta; at each flow point. Actual performance must be
            verified against manufacturer data sheets per API {result.compressorType === "centrifugal" ? "617" : "618"}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
