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
  head: "#3b82f6",
  power: "#ef4444",
  efficiency: "#22c55e",
  surge: "#f59e0b",
  operatingPoint: "#d4a04a",
  surgeRegion: "rgba(245, 158, 11, 0.08)",
};

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
  const points = 60;

  const legendNames: Record<string, string> = {
    head: isPolytropic ? "Polytropic Head" : "Isentropic Head",
    power: "Shaft Power",
    efficiency: isPolytropic ? "Polytropic Efficiency" : "Isentropic Efficiency",
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
          <h4 className="text-sm font-semibold">Compressor Performance Curves (Illustrative)</h4>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="h-[380px] w-full">
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
                  value: `Actual Inlet Flow (${flowUnit})`,
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
                  value: `Head (${headUnitLabel}) / Eff (%)`,
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
                  value: `Power (${powerUnitLabel})`,
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
                  if (name === "head") return [`${value.toFixed(2)} ${headUnitLabel}`, "Head"];
                  if (name === "power") return [`${value.toFixed(1)} ${powerUnitLabel}`, "Shaft Power"];
                  if (name === "efficiency") return [`${value.toFixed(1)} %`, "Efficiency"];
                  return [value, name];
                }}
                labelFormatter={(label) => `Flow: ${label} ${flowUnit}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                formatter={(value: string) => legendNames[value] || value}
              />

              <Area
                yAxisId="head"
                type="monotone"
                dataKey="surgeRegion"
                fill={COLORS.surgeRegion}
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

              <ReferenceLine
                yAxisId="head"
                x={parseFloat(surgeFlowSI.toFixed(1))}
                stroke={COLORS.surge}
                strokeWidth={2}
                strokeDasharray="8 4"
                label={{
                  value: "SURGE",
                  position: "top",
                  fill: COLORS.surge,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              <ReferenceDot
                yAxisId="head"
                x={displayFlow}
                y={displayHead}
                r={7}
                fill={COLORS.operatingPoint}
                stroke="#fff"
                strokeWidth={2}
              />
              <ReferenceLine
                yAxisId="head"
                x={displayFlow}
                stroke="hsl(var(--muted-foreground) / 0.3)"
                strokeDasharray="3 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t border-muted/30 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.operatingPoint, border: "2px solid white" }} />
            <span>Design Point: {displayFlow.toFixed(0)} {flowUnit} @ {displayHead.toFixed(1)} {headUnitLabel}</span>
          </div>
          <div>
            {isPolytropic ? "Polytropic" : "Isentropic"} Eff: {designEff.toFixed(1)}%
          </div>
          <div>Shaft Power: {displayPower.toFixed(1)} {powerUnitLabel}</div>
          <div>Stages: {result.numberOfStages} | Ratio: {result.overallCompressionRatio.toFixed(2)}</div>
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
