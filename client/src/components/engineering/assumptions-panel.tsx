import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookOpen, FileText } from "lucide-react";

interface AssumptionsPanelProps {
  assumptions: string[];
  references: string[];
}

export function AssumptionsPanel({ assumptions, references }: AssumptionsPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Assumptions</h4>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-1.5">
            {assumptions.map((a, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground flex items-start gap-2"
              >
                <span className="text-muted-foreground/60 mt-px shrink-0">
                  {i + 1}.
                </span>
                {a}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">References</h4>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-1.5">
            {references.map((r, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground flex items-start gap-2"
              >
                <span className="text-muted-foreground/60 mt-px shrink-0">
                  [{i + 1}]
                </span>
                {r}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
