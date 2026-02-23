import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Minus, Info } from "lucide-react";
import { DatasetStatus } from "@/components/piping/dataset-status";
import { DatasetImportWizard } from "@/components/piping/dataset-import-wizard";
import { DimensionTable } from "@/components/piping/dimension-table";
import { OletSVG } from "@/components/piping/svg-drawings";
import { loadDataset, deleteDataset } from "@/lib/engineering/piping/datasetManager";
import type { OletRow, DatasetMeta } from "@/lib/engineering/piping/schemas";

const COLUMNS = [
  { key: "run_nps", label: "Run NPS", unit: "in" },
  { key: "branch_nps", label: "Branch NPS", unit: "in" },
  { key: "type", label: "Type" },
  { key: "rating", label: "Rating" },
  { key: "height_mm", label: "Height", unit: "mm" },
  { key: "bore_mm", label: "Bore", unit: "mm" },
  { key: "base_width_mm", label: "Base W", unit: "mm" },
];

export default function OletsPage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<OletRow[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [filterRunNPS, setFilterRunNPS] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const loadData = async () => {
    const ds = await loadDataset<OletRow>("olets");
    if (ds) { setMeta(ds.meta); setRows(ds.rows); } else { setMeta(null); setRows([]); }
  };
  useEffect(() => { loadData(); }, []);

  const runNpsValues = useMemo(() => Array.from(new Set(rows.map(r => r.run_nps))).sort((a, b) => a - b), [rows]);
  const typeValues = useMemo(() => Array.from(new Set(rows.map(r => r.type))), [rows]);

  const filtered = useMemo(() => {
    let f = rows;
    if (filterRunNPS !== "all") f = f.filter(r => r.run_nps === Number(filterRunNPS));
    if (filterType !== "all") f = f.filter(r => r.type === filterType);
    return f;
  }, [rows, filterRunNPS, filterType]);

  const selected = selectedIdx !== null ? filtered[selectedIdx] : null;

  return (
    <div className="min-h-screen">
      <section className="py-6 md:py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/calculators/piping-components"><Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-piping"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-olets-title"><Minus className="w-5 h-5 text-primary" /> Olet Dimensions</h1>
              <p className="text-xs text-muted-foreground">MSS SP-97 — Weldolet, sockolet, threadolet branch connections</p>
            </div>
          </div>
          <div className="mb-4"><DatasetStatus meta={meta} onImport={() => setShowImport(true)} onDelete={async () => { await deleteDataset("olets"); setMeta(null); setRows([]); setSelectedIdx(null); }} /></div>
          {showImport && <div className="mb-4"><DatasetImportWizard category="olets" onImported={() => { setShowImport(false); loadData(); }} onClose={() => setShowImport(false)} /></div>}
          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><Card>
                <CardHeader className="pb-3"><div className="flex items-center gap-3 flex-wrap">
                  <div><Label className="text-xs">Run NPS</Label><Select value={filterRunNPS} onValueChange={setFilterRunNPS}><SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{runNpsValues.map(n => <SelectItem key={n} value={String(n)}>{n}"</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">Type</Label><Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{typeValues.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{filtered.length} records</Badge>
                </div></CardHeader>
                <CardContent className="pt-0 max-h-[500px] overflow-y-auto"><DimensionTable rows={filtered} columns={COLUMNS} selectedIndex={selectedIdx} onSelect={setSelectedIdx} /></CardContent>
              </Card></div>
              <div><Card><CardHeader className="pb-2"><h3 className="text-sm font-semibold">Olet Drawing</h3></CardHeader>
                <CardContent className="flex items-center justify-center">
                  {selected ? <OletSVG row={selected} /> : <div className="text-center py-8"><Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">Select a row to view drawing</p></div>}
                </CardContent></Card></div>
            </div>
          )}
          {rows.length === 0 && !showImport && (
            <Card className="mt-6"><CardContent className="py-12 text-center"><Minus className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" /><h3 className="text-sm font-medium mb-2">No Olet Data Loaded</h3><p className="text-xs text-muted-foreground mb-4">Import your olet dimension data.</p><Button variant="outline" size="sm" onClick={() => setShowImport(true)}>Import Olet Dataset</Button></CardContent></Card>
          )}
          <div className="mt-6 p-3 rounded-md border border-muted/30 bg-muted/5"><p className="text-[10px] text-muted-foreground"><strong>Disclaimer:</strong> Dimensional tables from user-supplied licensed datasets. Reference: MSS SP-97.</p></div>
        </div>
      </section>
    </div>
  );
}
