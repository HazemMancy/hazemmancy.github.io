import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";

interface ResultItem {
  label: string;
  value: string | number;
  unit: string;
  highlight?: boolean;
}

interface ResultsPanelProps {
  title: string;
  results: ResultItem[];
  rawData?: object;
  exportData?: ExportDatasheet;
  showExport?: boolean;
}

export function ResultsPanel({ title, results, rawData, exportData, showExport = false }: ResultsPanelProps) {
  const handleExportJSON = () => {
    if (exportData) {
      exportToJSON(exportData);
    } else {
      const fallback = {
        title,
        timestamp: new Date().toISOString(),
        results: results.map((r) => ({ parameter: r.label, value: r.value, unit: r.unit })),
        rawData,
      };
      const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_").toLowerCase()}_results.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportExcel = () => {
    if (exportData) {
      exportToExcel(exportData);
    }
  };

  const handleExportCalcNote = () => {
    if (exportData) {
      exportToCalcNote(exportData);
    }
  };

  return (
    <Card data-testid="results-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-base">{title}</h3>
        </div>
        {showExport && exportData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" data-testid="button-export-results">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCalcNote} data-testid="button-export-calc-note">
                <FileText className="w-4 h-4 mr-2 text-red-400" />
                Calc Note (Print / PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} data-testid="button-export-excel">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} data-testid="button-export-json">
                <Download className="w-4 h-4 mr-2 text-blue-400" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-2">
          {results.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between py-2 px-3 rounded-md ${
                item.highlight
                  ? "bg-primary/10"
                  : index % 2 === 0
                    ? "bg-muted/50"
                    : ""
              }`}
              data-testid={`result-row-${index}`}
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-mono font-medium tabular-nums">
                {typeof item.value === "number" ? formatNumber(item.value) : item.value}{" "}
                <span className="text-muted-foreground text-xs">{item.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) {
    return n.toExponential(4);
  }
  if (Math.abs(n) >= 1000) {
    return n.toFixed(1);
  }
  if (Math.abs(n) >= 1) {
    return n.toFixed(4);
  }
  return n.toFixed(6);
}
