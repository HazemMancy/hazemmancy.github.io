import { AlertTriangle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface WarningPanelProps {
  warnings: string[];
}

export function WarningPanel({ warnings }: WarningPanelProps) {
  if (warnings.length === 0) return null;

  const isNote = (w: string) => w.toLowerCase().startsWith("note:");

  return (
    <div className="space-y-2" data-testid="warning-panel">
      {warnings.map((warning, index) => (
        <Card
          key={index}
          className={
            isNote(warning)
              ? "border-l-0 bg-accent/50"
              : "border-l-0 bg-amber-50 dark:bg-amber-950/30"
          }
        >
          <CardContent className="flex items-start gap-3 p-3">
            {isNote(warning) ? (
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <p
              className={
                isNote(warning)
                  ? "text-sm text-muted-foreground"
                  : "text-sm text-amber-800 dark:text-amber-200"
              }
              data-testid={`text-warning-${index}`}
            >
              {warning}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
