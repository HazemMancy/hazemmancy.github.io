import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, AlertTriangle, Download, X } from "lucide-react";
import type { PipingCategory, DatasetRow } from "@/lib/engineering/piping/schemas";
import { CATEGORY_LABELS, CSV_TEMPLATES } from "@/lib/engineering/piping/schemas";
import { parseCSV, parseJSON, validateRows, saveDataset, type ParseResult } from "@/lib/engineering/piping/datasetManager";

interface Props {
  category: PipingCategory;
  onImported: () => void;
  onClose?: () => void;
}

export function DatasetImportWizard({ category, onImported, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csv = CSV_TEMPLATES[category];
    if (!csv) return;
    const blob = new Blob([csv + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${category}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    try {
      const rows = file.name.endsWith(".json") ? parseJSON(text) : parseCSV(text);
      setRawRows(rows);
      const result = validateRows(category, rows);
      setParseResult(result);
      setStep(2);
    } catch (err: unknown) {
      setParseResult({ valid: [], errors: [{ row: 0, message: String(err) }], total: 0 });
      setStep(2);
    }
  };

  const handleSave = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    setSaving(true);
    try {
      await saveDataset({
        meta: {
          category,
          name: datasetName || `${CATEGORY_LABELS[category]} Dataset`,
          source: source || "User import",
          revision_date: new Date().toISOString().slice(0, 10),
          row_count: parseResult.valid.length,
          loaded_at: new Date().toISOString(),
        },
        rows: parseResult.valid as DatasetRow[],
      });
      setStep(3);
      onImported();
    } catch {
      alert("Failed to save dataset");
    }
    setSaving(false);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Import {CATEGORY_LABELS[category]} Dataset
          </h3>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Upload a CSV or JSON file with {CATEGORY_LABELS[category].toLowerCase()} dimensional data from your licensed ASME / manufacturer catalog.
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate} data-testid="button-download-template">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download CSV Template
            </Button>
            <div>
              <Label className="text-xs">Upload File (CSV / JSON)</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFile}
                className="mt-1"
                data-testid="input-file-upload"
              />
            </div>
          </div>
        )}

        {step === 2 && parseResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{fileName}</span>
              <Badge variant="secondary" className="text-[10px]">{parseResult.total} rows</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-green-500/10 border border-green-500/30 text-center">
                <div className="text-lg font-bold text-green-400">{parseResult.valid.length}</div>
                <div className="text-[10px] text-green-400/70">Valid Rows</div>
              </div>
              <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-center">
                <div className="text-lg font-bold text-red-400">{parseResult.errors.length}</div>
                <div className="text-[10px] text-red-400/70">Errors</div>
              </div>
            </div>
            {parseResult.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-[10px] space-y-0.5">
                {parseResult.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="flex items-start gap-1 text-red-400">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>Row {e.row}: {e.message}</span>
                  </div>
                ))}
                {parseResult.errors.length > 10 && (
                  <span className="text-muted-foreground">...and {parseResult.errors.length - 10} more errors</span>
                )}
              </div>
            )}
            {parseResult.valid.length > 0 && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Dataset Name</Label>
                  <Input value={datasetName} onChange={e => setDatasetName(e.target.value)} placeholder={`${CATEGORY_LABELS[category]} Dataset`} className="mt-1" data-testid="input-dataset-name" />
                </div>
                <div>
                  <Label className="text-xs">Source / Reference</Label>
                  <Input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. ASME B36.10M (licensed copy)" className="mt-1" data-testid="input-dataset-source" />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setStep(1); setParseResult(null); }}>Back</Button>
              <Button size="sm" onClick={handleSave} disabled={parseResult.valid.length === 0 || saving} data-testid="button-save-dataset">
                {saving ? "Saving..." : `Save ${parseResult.valid.length} Rows`}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-4 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
            <p className="text-sm font-medium">Dataset imported successfully!</p>
            <p className="text-xs text-muted-foreground">{parseResult?.valid.length} records loaded for {CATEGORY_LABELS[category]}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
