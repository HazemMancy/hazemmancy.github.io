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
  head: "#2563eb",
  headGradientStart: "rgba(37, 99, 235, 0.18)",
  headGradientEnd: "rgba(37, 99, 235, 0.02)",
  power: "#dc2626",
  powerGradientStart: "rgba(220, 38, 38, 0.12)",
  powerGradientEnd: "rgba(220, 38, 38, 0.01)",
  efficiency: "#16a34a",
  surge: "#d97706",
  surgeRegion: "rgba(217, 119, 6, 0.06)",
  surgeRegionStroke: "rgba(217, 119, 6, 0.15)",
  operatingPoint: "#2563eb",
  operatingPointRing: "#ffffff",
  grid: "hsl(var(--muted) / 0.18)",
  gridMajor: "hsl(var(--muted) / 0.30)",
  axisText: "hsl(var(--muted-foreground) / 0.7)",
  axisLabel: "hsl(var(--muted-foreground) / 0.85)",
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
        {headEntry && headEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.head, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>{legendNames.head}:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {headEntry.value.toFixed(2)} {headUnitLabel}
            </span>
          </div>
        )}
        {effEntry && effEntry.value != null && effEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.efficiency, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>{legendNames.efficiency}:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
              {effEntry.value.toFixed(1)}%
            </span>
          </div>
        )}
        {powerEntry && powerEntry.value != null && powerEntry.value > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.power, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Shaft Power:</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500, marginLeft: "auto" }}>
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
    <div style={{ display: "flex", justifyContent: "center", gap: "20px", paddingTop: "10px" }}>
      {filtered.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: entry.dataKey === "efficiency" ? 16 : 12,
              height: 2,
              backgroundColor: entry.color,
              borderRadius: 1,
              ...(entry.dataKey === "efficiency" ? { backgroundImage: `repeating-linear-gradient(90deg, ${entry.color} 0px, ${entry.color} 4px, transparent 4px, transparent 6px)`, backgroundColor: "transparent" } : {}),
            }}
          />
          <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>
            {legendNames[entry.dataKey] || entry.value}
          </span>
        </div>
      ))}
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
  const points = 80;

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
    <Card data-testid="compressor-curve-chart">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Compressor Performance Curves</h4>
          <span className="text-[10px] text-muted-foreground ml-1">(Illustrative)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 16, right: 64, left: 16, bottom: 28 }}
            >
              <defs>
                <linearGradient id="headGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.headGradientStart} />
                  <stop offset="100%" stopColor={COLORS.headGradientEnd} />
                </linearGradient>
                <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.powerGradientStart} />
                  <stop offset="100%" stopColor={COLORS.powerGradientEnd} />
                </linearGradient>
                <linearGradient id="surgeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(217, 119, 6, 0.10)" />
                  <stop offset="100%" stopColor="rgba(217, 119, 6, 0.03)" />
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
                  value: `Actual Inlet Flow (${flowUnit})`,
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
                label={{
                  value: `Head (${headUnitLabel}) / Eff. (%)`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  fill: COLORS.axisLabel,
                  fontSize: 10,
                  fontWeight: 500,
                  dy: 50,
                }}
              />
              <YAxis
                yAxisId="power"
                orientation="right"
                domain={[0, powerMax]}
                tick={{ fill: COLORS.axisText, fontSize: 10 }}
                tickLine={{ stroke: COLORS.grid }}
                axisLine={{ stroke: COLORS.gridMajor }}
                label={{
                  value: `Power (${powerUnitLabel})`,
                  angle: 90,
                  position: "insideRight",
                  offset: 5,
                  fill: COLORS.axisLabel,
                  fontSize: 10,
                  fontWeight: 500,
                  dy: -30,
                }}
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
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.15)", strokeWidth: 1 }}
              />
              <Legend content={<CustomLegend legendNames={legendNames} />} />

              <Area
                yAxisId="head"
                type="monotone"
                dataKey="surgeRegion"
                fill="url(#surgeGradient)"
                stroke={COLORS.surgeRegionStroke}
                strokeWidth={0}
                legendType="none"
                tooltipType="none"
              />

              <Area
                yAxisId="head"
                type="monotone"
                dataKey="head"
                fill="url(#headGradient)"
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
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: COLORS.head }}
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
                x={parseFloat(surgeFlowSI.toFixed(1))}
                stroke={COLORS.surge}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                label={{
                  value: "SURGE LIMIT",
                  position: "top",
                  fill: COLORS.surge,
                  fontSize: 9,
                  fontWeight: 700,
                }}
              />

              <ReferenceLine
                yAxisId="head"
                x={displayFlow}
                stroke="hsl(var(--muted-foreground) / 0.2)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <ReferenceLine
                yAxisId="head"
                y={displayHead}
                stroke="hsl(var(--muted-foreground) / 0.12)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />

              <ReferenceDot
                yAxisId="head"
                x={displayFlow}
                y={displayHead}
                r={8}
                fill={COLORS.operatingPoint}
                stroke={COLORS.operatingPointRing}
                strokeWidth={2.5}
              />
              <ReferenceDot
                yAxisId="head"
                x={displayFlow}
                y={displayHead}
                r={3}
                fill="#ffffff"
                stroke="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-muted/30 pt-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.operatingPoint, border: "2.5px solid white", boxShadow: `0 0 0 1px ${COLORS.operatingPoint}` }} />
            <span className="text-foreground font-medium">
              Design Point: {displayFlow.toFixed(0)} {flowUnit} @ {displayHead.toFixed(1)} {headUnitLabel}
            </span>
          </div>
          <div className="text-muted-foreground">
            {isPolytropic ? "Polytropic" : "Isentropic"} Eff: <span className="text-foreground font-medium">{designEff.toFixed(1)}%</span>
          </div>
          <div className="text-muted-foreground">
            Shaft Power: <span className="text-foreground font-medium">{displayPower.toFixed(1)} {powerUnitLabel}</span>
          </div>
          <div className="text-muted-foreground">
            Stages: <span className="text-foreground font-medium">{result.numberOfStages}</span> | Ratio: <span className="text-foreground font-medium">{result.overallCompressionRatio.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-muted/30 pt-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="compressor-curve-note">
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
