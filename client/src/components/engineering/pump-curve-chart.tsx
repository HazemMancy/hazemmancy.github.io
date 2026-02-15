import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PumpCurveChartProps {
  designFlow: number;
  totalDynamicHead: number;
  staticHead: number;
  flowUnit: string;
  headUnit: string;
  npshaAvailable: number;
}

export function PumpCurveChart({
  designFlow,
  totalDynamicHead,
  staticHead,
  flowUnit,
  headUnit,
  npshaAvailable,
}: PumpCurveChartProps) {
  const frictionHead = totalDynamicHead - staticHead;
  const maxFlow = designFlow * 1.6;
  const points = 50;

  const data = [];
  for (let i = 0; i <= points; i++) {
    const q = (maxFlow * i) / points;
    const ratio = designFlow > 0 ? q / designFlow : 0;
    const systemHead = staticHead + frictionHead * ratio * ratio;
    data.push({
      flow: parseFloat(q.toFixed(2)),
      systemHead: parseFloat(systemHead.toFixed(2)),
    });
  }

  const yMax = Math.ceil(totalDynamicHead * 1.4 / 5) * 5;
  const yMin = Math.min(0, Math.floor(staticHead / 5) * 5);

  return (
    <Card data-testid="pump-curve-chart">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">System Curve</h4>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.3)" />
              <XAxis
                dataKey="flow"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                label={{
                  value: `Flow (${flowUnit})`,
                  position: "insideBottom",
                  offset: -2,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                }}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                label={{
                  value: `Head (${headUnit})`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} ${headUnit}`,
                  name === "systemHead" ? "System Head" : name,
                ]}
                labelFormatter={(label) => `Flow: ${label} ${flowUnit}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) =>
                  value === "systemHead" ? "System Curve" : value
                }
              />
              <Line
                type="monotone"
                dataKey="systemHead"
                stroke="#d4a04a"
                strokeWidth={2}
                dot={false}
                name="systemHead"
              />
              <ReferenceDot
                x={parseFloat(designFlow.toFixed(2))}
                y={parseFloat(totalDynamicHead.toFixed(2))}
                r={6}
                fill="#d4a04a"
                stroke="#fff"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#d4a04a] border-2 border-white" />
            <span>Design Point: {designFlow.toFixed(1)} {flowUnit} @ {totalDynamicHead.toFixed(1)} {headUnit}</span>
          </div>
          <span>Static Head: {staticHead.toFixed(1)} {headUnit}</span>
          <span>NPSHa: {npshaAvailable.toFixed(1)} {headUnit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
