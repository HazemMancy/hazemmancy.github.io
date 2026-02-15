import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, XCircle, Shield, Info } from "lucide-react";
import type { LimitWarning } from "@/lib/engineering/limitCheck";

interface LimitsPanelProps {
  serviceName: string;
  warnings: LimitWarning[];
  notes?: string;
}

export function LimitsPanel({ serviceName, warnings, notes }: LimitsPanelProps) {
  if (warnings.length === 0 && !notes) return null;

  const hasExceeded = warnings.some((w) => w.exceeded);

  return (
    <Card className={hasExceeded ? "border-amber-500/40" : "border-green-500/30"} data-testid="limits-panel">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Recommended Limits: {serviceName}</h4>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {warnings.map((w, i) => {
          const actualStr = formatNum(w.actual);
          const limitStr = formatNum(w.limit);
          return (
            <div
              key={i}
              className={`flex items-center justify-between gap-2 p-2 rounded-md text-xs ${
                w.exceeded ? "bg-red-950/30" : "bg-green-950/20"
              }`}
              data-testid={`limit-row-${i}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {w.exceeded ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                )}
                <span className="font-medium truncate">{w.parameter}</span>
              </div>
              <div className="flex items-center gap-2 font-mono shrink-0">
                <span className={w.exceeded ? "text-red-300" : "text-green-300"}>
                  {actualStr}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">
                  {limitStr} {w.unit}
                </span>
              </div>
            </div>
          );
        })}
        {notes && (
          <p className="text-xs text-muted-foreground pt-1" data-testid="limit-notes">{notes}</p>
        )}
        <div className="flex items-start gap-2 pt-2 border-t border-muted/30">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="limit-reference">
            These are recommended limits per industry guidelines and engineering companies best practices, not absolute hard limits.
            Exceeding a recommended value does not necessarily indicate a design failure — it flags the need for
            further engineering review, detailed simulation, or project-specific justification. Hard limits
            (e.g. code-mandated maximum allowable velocities or pressure drops) are governed by applicable codes
            and standards and must be verified separately.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNum(n: number): string {
  if (Math.abs(n) < 0.01) return n.toExponential(2);
  if (Math.abs(n) < 1) return n.toFixed(3);
  if (Math.abs(n) < 100) return n.toFixed(2);
  if (Math.abs(n) < 10000) return n.toFixed(1);
  return n.toFixed(0);
}
