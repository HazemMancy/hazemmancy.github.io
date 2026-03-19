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
  minFlow: "#ef4444",
  operatingPoint: "#3b82f6",
  operatingPointGlow: "rgba(59, 130, 246, 0.25)",
  volEff: "#a855f7",
  grid: "hsl(var(--muted) / 0.15)",
  gridMajor: "hsl(var(--muted) / 0.25)",
  axisText: "hsl(var(--muted-foreground) / 0.65)",
  axisLabel: "hsl(var(--muted-foreground) / 0.9)",
};

function CentrifugalTooltip({ active, payload, label, flowUnit, headUnitLabel, powerUnitLabel, legendNames }: any) {
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
            <div style={{ width: 10, height: 3, borderRadius: "1px", flexShrink: 0, borderTop: `2px dashed ${COLORS.efficiency}` }} />
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

function ReciprocatingTooltip({ active, payload, label, powerUnitLabel }: any) {
  if (!active || !payload || payload.length === 0) return null;

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
        Compression Ratio = {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {powerEntry && powerEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", backgroundColor: COLORS.power, flexShrink: 0 }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Shaft Power</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {powerEntry.value.toFixed(1)} {powerUnitLabel}
            </span>
          </div>
        )}
        {volEffEntry && volEffEntry.value != null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
            <div style={{ width: 10, height: 3, borderRadius: "1px", flexShrink: 0, borderTop: `2px dashed ${COLORS.volEff}` }} />
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Vol. Efficiency</span>
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 600, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              {volEffEntry.value.toFixed(1)} %
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CentrifugalLegend({ payload, legendNames }: any) {
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
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="18" height="10" viewBox="0 0 18 10" style={{ flexShrink: 0 }}>
          <line x1="0" y1="5" x2="18" y2="5" stroke={COLORS.minFlow} strokeWidth="1.5" strokeDasharray="2 3" />
        </svg>
        <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 500, letterSpacing: "0.01em" }}>
          Min. Continuous Flow
        </span>
      </div>
    </div>
  );
}

function ReciprocatingLegend({ payload }: any) {
  if (!payload) return null;
  const names: Record<string, string> = {
    power: "Shaft Power",
    volEff: "Volumetric Eff.",
  };
  const filtered = payload.filter((entry: any) => names[entry.dataKey]);
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "24px", paddingTop: "12px", flexWrap: "wrap" }}>
      {filtered.map((entry: any) => {
        const isDashed = entry.dataKey === "volEff";
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
              {names[entry.dataKey] || entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CentrifugalChart({ result, unitSystem }: CompressorCurveChartProps) {
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
  const minContFlowSI = designFlowSI * 0.75;
  // X-axis extends to choke/stonewall boundary (approx. 1.30 × design) per API 617 §6.1
  const maxFlowSI = designFlowSI * 1.40;
  const shutoffHeadKJkg = designHeadKJkg * 1.12;
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

    // H-Q parabola anchored at 3 points per API 617 typical centrifugal characteristic:
    //   r=0    → H = 1.12 × H_design  (shutoff head)
    //   r=1    → H = H_design          (design / operating point)
    //   r=1.20 → H = 0.88 × H_design  (choke / stonewall boundary)
    // Fitted: H = H_d × (1.12 + 0.28·r − 0.40·r²)
    const headKJkg = Math.max(
      0,
      designHeadKJkg * (1.12 + 0.28 * qRatio - 0.40 * qRatio * qRatio)
    );

    // Efficiency: Gaussian bell centred at BEP (r=1), peak = design efficiency
    const effSpread = 0.38;
    const eff = qSI > 0 ? designEff * Math.exp(-Math.pow((qRatio - 1) / effSpread, 2)) : 0;

    // Shaft power: anchored to design shaft power at r=1.
    // Formula: P(Q) = P_design × (H(Q)/H_d) × (η_d/η(Q))
    // At design point: P = P_design × 1 × 1 = P_design ✓
    // Physically: rising head or falling efficiency both increase power demand.
    const powerKW = qSI > 0 && eff > 0 && headKJkg > 0
      ? designPowerKW * (headKJkg / designHeadKJkg) * (designEff / eff)
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
  const powerMax = Math.ceil(displayPower * 1.8 / 50) * 50 || 500;

  return (
    <>
      <div className="flex items-stretch">
        <div className="relative w-7 shrink-0">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
            {`Head (${headUnitLabel}) / Eff. (%)`}
          </span>
        </div>
        <div className="flex-1 h-[420px] border border-border/20 rounded-sm">
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
              <linearGradient id="compSurgeGrad" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor={COLORS.surgeRegionStart} />
                <stop offset="100%" stopColor={COLORS.surgeRegionEnd} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 6"
              stroke={COLORS.grid}
              vertical={true}
              horizontal={true}
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
                <CentrifugalTooltip
                  flowUnit={flowUnit}
                  headUnitLabel={headUnitLabel}
                  powerUnitLabel={powerUnitLabel}
                  legendNames={legendNames}
                />
              }
              cursor={{ stroke: "hsl(var(--muted-foreground) / 0.12)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Legend content={<CentrifugalLegend legendNames={legendNames} />} />

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
              x={parseFloat(minContFlowSI.toFixed(1))}
              stroke={COLORS.minFlow}
              strokeWidth={1}
              strokeDasharray="2 4"
              label={{
                value: "MIN",
                position: "insideTopRight",
                fill: COLORS.minFlow,
                fontSize: 8,
                fontWeight: 600,
                opacity: 0.8,
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
          Illustrative curves based on typical centrifugal compressor characteristics per API 617.
          H-Q parabola: H = H_d × (1.12 + 0.28·r − 0.40·r²); anchors: shutoff = 1.12×H_d (r=0),
          design = H_d (r=1), choke ≈ 0.88×H_d (r=1.20). Shaft power anchored at design point
          P_d and scaled by (H/H_d)×(η_d/η). Surge line schematic at ~70% Q_d; min. continuous
          flow at ~75% Q_d. Verify all data against manufacturer test sheets per API 617.
        </p>
      </div>
    </>
  );
}

function ReciprocatingChart({ result, unitSystem }: CompressorCurveChartProps) {
  const isPolytropic = result.compressionModel === "polytropic";
  const designRatio = result.overallCompressionRatio;
  const designPowerKW = result.totalShaftPower;
  const designEff = isPolytropic ? result.polytropicEfficiency : result.adiabaticEfficiency;
  const k = result.trace.intermediateValues["polytropicExponent"] > 0
    ? result.trace.intermediateValues["polytropicExponent"]
    : 1.4;
  const T1_K = result.trace.intermediateValues["T1_K"] || 303.15;

  const powerUnitLabel = getUnit("power", unitSystem);
  const convertPower = (kW: number): number => convertFromSI("power", kW, unitSystem);

  const minRatio = 1.0;
  const maxRatio = Math.max(designRatio * 1.5, designRatio + 2);
  const points = 80;

  const clearanceVol = 0.12;

  const data = [];
  for (let i = 0; i <= points; i++) {
    const r = minRatio + (maxRatio - minRatio) * i / points;

    const volEff = 100 * (1 - clearanceVol * (Math.pow(r, 1 / k) - 1));
    const clampedVolEff = Math.max(0, Math.min(100, volEff));

    const powerRatio = r > 1 ? (Math.pow(r, (k - 1) / k) - 1) / (Math.pow(designRatio, (k - 1) / k) - 1) : 0;
    const powerKW = designPowerKW * powerRatio * (clampedVolEff / (volEff > 0 ? 100 * (1 - clearanceVol * (Math.pow(designRatio, 1 / k) - 1)) : 1));
    const clampedPower = Math.max(0, powerKW);

    data.push({
      ratio: parseFloat(r.toFixed(2)),
      power: parseFloat(convertPower(clampedPower).toFixed(1)),
      volEff: parseFloat(clampedVolEff.toFixed(1)),
    });
  }

  const displayRatio = parseFloat(designRatio.toFixed(2));
  const displayPower = parseFloat(convertPower(designPowerKW).toFixed(1));
  const designVolEff = 100 * (1 - clearanceVol * (Math.pow(designRatio, 1 / k) - 1));
  const designDischTemp = T1_K * Math.pow(designRatio, (k - 1) / k) - 273.15;

  const powerMax = Math.ceil(displayPower * 1.8 / 50) * 50 || 500;

  return (
    <>
      <div className="flex items-stretch">
        <div className="relative w-7 shrink-0">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
            {`Power (${powerUnitLabel}) / Vol. Eff. (%)`}
          </span>
        </div>
        <div className="flex-1 h-[420px] border border-border/20 rounded-sm">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 55, left: 12, bottom: 32 }}
          >
            <defs>
              <linearGradient id="recipPowerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.powerGradientStart} />
                <stop offset="50%" stopColor={COLORS.powerGradientMid} />
                <stop offset="100%" stopColor={COLORS.powerGradientEnd} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 6"
              stroke={COLORS.grid}
              vertical={true}
              horizontal={true}
            />

            <XAxis
              dataKey="ratio"
              tick={{ fill: COLORS.axisText, fontSize: 10, fontWeight: 400 }}
              tickLine={{ stroke: COLORS.grid, strokeWidth: 0.5 }}
              axisLine={{ stroke: COLORS.gridMajor, strokeWidth: 1 }}
              label={{
                value: "Compression Ratio (P₂/P₁)",
                position: "insideBottom",
                offset: -18,
                fill: COLORS.axisLabel,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <YAxis
              yAxisId="left"
              domain={[0, powerMax]}
              tick={{ fill: COLORS.axisText, fontSize: 10, fontWeight: 400 }}
              tickLine={{ stroke: COLORS.grid, strokeWidth: 0.5 }}
              axisLine={{ stroke: COLORS.gridMajor, strokeWidth: 1 }}
              width={52}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: COLORS.axisText, fontSize: 10, fontWeight: 400 }}
              tickLine={{ stroke: COLORS.grid, strokeWidth: 0.5 }}
              axisLine={{ stroke: COLORS.gridMajor, strokeWidth: 1 }}
              width={52}
            />

            <Tooltip
              content={<ReciprocatingTooltip powerUnitLabel={powerUnitLabel} />}
              cursor={{ stroke: "hsl(var(--muted-foreground) / 0.12)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Legend content={<ReciprocatingLegend />} />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="power"
              fill="url(#recipPowerGrad)"
              stroke="none"
              legendType="none"
              tooltipType="none"
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="power"
              stroke={COLORS.power}
              strokeWidth={2.5}
              dot={false}
              name="power"
              activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: "#fff", fill: COLORS.power }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="volEff"
              stroke={COLORS.volEff}
              strokeWidth={1.8}
              strokeDasharray="6 3"
              dot={false}
              name="volEff"
              activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff", fill: COLORS.volEff }}
            />

            <ReferenceLine
              yAxisId="left"
              x={displayRatio}
              stroke="hsl(var(--muted-foreground) / 0.18)"
              strokeDasharray="3 3"
              strokeWidth={0.8}
            />
            <ReferenceLine
              yAxisId="left"
              y={displayPower}
              stroke="hsl(var(--muted-foreground) / 0.10)"
              strokeDasharray="3 3"
              strokeWidth={0.8}
            />

            <ReferenceDot
              yAxisId="left"
              x={displayRatio}
              y={displayPower}
              r={12}
              fill={COLORS.operatingPointGlow}
              stroke="none"
            />
            <ReferenceDot
              yAxisId="left"
              x={displayRatio}
              y={displayPower}
              r={6}
              fill={COLORS.operatingPoint}
              stroke="#ffffff"
              strokeWidth={2.5}
              label={{
                value: "DESIGN",
                position: "top",
                offset: 12,
                fill: COLORS.operatingPoint,
                fontSize: 9,
                fontWeight: 700,
              }}
            />
            <ReferenceDot
              yAxisId="left"
              x={displayRatio}
              y={displayPower}
              r={2}
              fill="#ffffff"
              stroke="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
        </div>
        <div className="relative w-7 shrink-0">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[9px] text-muted-foreground/70 font-medium whitespace-nowrap tracking-wide">
            Vol. Eff. (%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs border-t border-muted/20 pt-3.5 px-2">
        <div className="flex items-center gap-2.5">
          <CircleDot className="w-3.5 h-3.5 shrink-0" style={{ color: COLORS.operatingPoint }} />
          <span className="text-foreground font-medium" data-testid="text-design-point">
            Design: r = {displayRatio.toFixed(2)} @ {displayPower.toFixed(1)} {powerUnitLabel}
          </span>
        </div>
        <div className="text-muted-foreground">
          {isPolytropic ? "Polytropic" : "Isentropic"} Eff: <span className="text-foreground font-semibold">{designEff.toFixed(1)}%</span>
        </div>
        <div className="text-muted-foreground">
          Vol. Eff: <span className="text-foreground font-semibold">{designVolEff.toFixed(1)}%</span>
          <span className="mx-1.5 text-muted-foreground/40">|</span>
          Clearance: <span className="text-foreground font-semibold">{(clearanceVol * 100).toFixed(0)}%</span>
        </div>
        <div className="text-muted-foreground">
          Stages: <span className="text-foreground font-semibold">{result.numberOfStages}</span>
          <span className="mx-1.5 text-muted-foreground/40">|</span>
          Disch. T₂: <span className="text-foreground font-semibold">{designDischTemp.toFixed(0)} °C</span>
        </div>
      </div>

      <div className="flex items-start gap-2.5 border-t border-muted/20 pt-3">
        <Info className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed" data-testid="compressor-curve-note">
          Illustrative curves for reciprocating compressor characteristics.
          Volumetric efficiency per clearance model: η_v = 1 − c × (r^(1/k) − 1), c = {(clearanceVol * 100).toFixed(0)}% assumed (API 618 §5.7.2).
          Shaft power scales with compression work. No surge instability applies to PD machines.
          Discharge temperature T₂ = {designDischTemp.toFixed(0)} °C (adiabatic) — see summary table; excluded from
          plot to avoid incompatible axis scales. Verify all against manufacturer test data per API 618.
        </p>
      </div>
    </>
  );
}

export function CompressorCurveChart({ result, unitSystem }: CompressorCurveChartProps) {
  if (!result) return null;
  if (result.compressorType === "centrifugal" && result.actualVolumetricFlowRate <= 0) return null;
  if (result.compressorType === "reciprocating" && result.totalShaftPower <= 0) return null;

  const isCentrifugal = result.compressorType === "centrifugal";

  return (
    <Card data-testid="compressor-curve-chart" id="chart-compressor-curve">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">
            {isCentrifugal ? "Centrifugal Compressor Performance Curves" : "Reciprocating Compressor Characteristics"}
          </h4>
          <span className="text-[10px] text-muted-foreground/60 ml-1 uppercase tracking-wider font-medium">(Illustrative)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {isCentrifugal
          ? <CentrifugalChart result={result} unitSystem={unitSystem} />
          : <ReciprocatingChart result={result} unitSystem={unitSystem} />
        }
      </CardContent>
    </Card>
  );
}
