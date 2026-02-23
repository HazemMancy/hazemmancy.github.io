import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CircleDot, Info } from "lucide-react";
import { DatasetStatus } from "@/components/piping/dataset-status";
import { DatasetImportWizard } from "@/components/piping/dataset-import-wizard";
import { DimensionTable } from "@/components/piping/dimension-table";
import { GasketSVG } from "@/components/piping/svg-drawings";
import { loadDataset, deleteDataset } from "@/lib/engineering/piping/datasetManager";
import type { GasketRow, DatasetMeta } from "@/lib/engineering/piping/schemas";

const COLUMNS = [
  { key: "nps", label: "NPS", unit: "in" },
  { key: "class_rating", label: "Class" },
  { key: "type", label: "Type" },
  { key: "id_mm", label: "ID", unit: "mm" },
  { key: "od_mm", label: "OD", unit: "mm" },
  { key: "thickness_mm", label: "Thk", unit: "mm" },
  { key: "material", label: "Material" },
];

export default function GasketsPage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<GasketRow[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [filterNPS, setFilterNPS] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const loadData = async () => {
    const ds = await loadDataset<GasketRow>("gaskets");
    if (ds) { setMeta(ds.meta); setRows(ds.rows); } else { setMeta(null); setRows([]); }
  };
  useEffect(() => { loadData(); }, []);

  const npsValues = useMemo(() => Array.from(new Set(rows.map(r => r.nps))).sort((a, b) => a - b), [rows]);
  const classValues = useMemo(() => Array.from(new Set(rows.map(r => r.class_rating))).sort((a, b) => a - b), [rows]);
  const typeValues = useMemo(() => Array.from(new Set(rows.map(r => r.type))), [rows]);

  const filtered = useMemo(() => {
    let f = rows;
    if (filterNPS !== "all") f = f.filter(r => r.nps === Number(filterNPS));
    if (filterClass !== "all") f = f.filter(r => r.class_rating === Number(filterClass));
    if (filterType !== "all") f = f.filter(r => r.type === filterType);
    return f;
  }, [rows, filterNPS, filterClass, filterType]);

  const selected = selectedIdx !== null ? filtered[selectedIdx] : null;

  return (
    <div className="min-h-screen">
      <section className="py-6 md:py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/calculators/piping-components"><Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-piping"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-gaskets-title"><CircleDot className="w-5 h-5 text-primary" /> Gasket Dimensions</h1>
              <p className="text-xs text-muted-foreground">ASME B16.20 / B16.21 — Spiral wound, ring type, full-face gaskets</p>
            </div>
          </div>
          <div className="mb-4"><DatasetStatus meta={meta} onImport={() => setShowImport(true)} onDelete={async () => { await deleteDataset("gaskets"); setMeta(null); setRows([]); setSelectedIdx(null); }} /></div>
          {showImport && <div className="mb-4"><DatasetImportWizard category="gaskets" onImported={() => { setShowImport(false); loadData(); }} onClose={() => setShowImport(false)} /></div>}
          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><Card>
                <CardHeader className="pb-3"><div className="flex items-center gap-3 flex-wrap">
                  <div><Label className="text-xs">NPS</Label><Select value={filterNPS} onValueChange={setFilterNPS}><SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{npsValues.map(n => <SelectItem key={n} value={String(n)}>{n}"</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">Class</Label><Select value={filterClass} onValueChange={setFilterClass}><SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{classValues.map(c => <SelectItem key={c} value={String(c)}>#{c}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">Type</Label><Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{typeValues.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{filtered.length} records</Badge>
                </div></CardHeader>
                <CardContent className="pt-0 max-h-[500px] overflow-y-auto"><DimensionTable rows={filtered} columns={COLUMNS} selectedIndex={selectedIdx} onSelect={setSelectedIdx} /></CardContent>
              </Card></div>
              <div><Card><CardHeader className="pb-2"><h3 className="text-sm font-semibold">Gasket Drawing</h3></CardHeader>
                <CardContent className="flex items-center justify-center">
                  {selected ? <GasketSVG row={selected} /> : <div className="text-center py-8"><Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">Select a row to view drawing</p></div>}
                </CardContent></Card></div>
            </div>
          )}
          {rows.length === 0 && !showImport && (
            <Card className="mt-6"><CardContent className="py-12 text-center"><CircleDot className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" /><h3 className="text-sm font-medium mb-2">No Gasket Data Loaded</h3><p className="text-xs text-muted-foreground mb-4">Import your licensed gasket dimension data.</p><Button variant="outline" size="sm" onClick={() => setShowImport(true)}>Import Gasket Dataset</Button></CardContent></Card>
          )}
          <div className="mt-6 p-3 rounded-md border border-muted/30 bg-muted/5"><p className="text-[10px] text-muted-foreground"><strong>Disclaimer:</strong> Dimensional tables from user-supplied licensed datasets. Reference: ASME B16.20, B16.21.</p></div>
        </div>
      </section>
    </div>
  );
}
