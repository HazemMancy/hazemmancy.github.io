import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Minus, Info } from "lucide-react";
import { DatasetImportWizard } from "@/components/piping/dataset-import-wizard";
import { DimensionTable } from "@/components/piping/dimension-table";
import { OletSVG } from "@/components/piping/svg-drawings";
import { loadDataset, deleteDataset } from "@/lib/engineering/piping/datasetManager";
import { OLET_DATA, OLET_DATA_PROVENANCE } from "@/lib/engineering/piping/data";
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

const getOletKey = (r: OletRow) => `${r.run_nps}|${r.branch_nps ?? ''}|${r.type}|${r.rating ?? ''}`;

export default function OletsPage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<OletRow[]>(OLET_DATA);
  const [isCustom, setIsCustom] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filterRunNPS, setFilterRunNPS] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const loadData = async () => {
    const ds = await loadDataset<OletRow>("olets");
    if (ds) { setMeta(ds.meta); setRows(ds.rows); setIsCustom(true); }
    else { setMeta(null); setRows(OLET_DATA); setIsCustom(false); }
  };
  useEffect(() => { loadData(); }, []);

  const handleDelete = async () => {
    await deleteDataset("olets");
    setMeta(null); setRows(OLET_DATA); setSelectedKey(null); setIsCustom(false);
  };

  const runNpsValues = useMemo(() => Array.from(new Set(rows.map(r => r.run_nps))).sort((a, b) => a - b), [rows]);
  const typeValues = useMemo(() => Array.from(new Set(rows.map(r => r.type))), [rows]);

  const filtered = useMemo(() => {
    let f = rows;
    if (filterRunNPS !== "all") f = f.filter(r => r.run_nps === Number(filterRunNPS));
    if (filterType !== "all") f = f.filter(r => r.type === filterType);
    return f;
  }, [rows, filterRunNPS, filterType]);

  const selectedIdx = useMemo(() => {
    if (selectedKey === null) return null;
    const idx = filtered.findIndex(r => getOletKey(r) === selectedKey);
    return idx >= 0 ? idx : null;
  }, [filtered, selectedKey]);

  const selected = selectedIdx !== null ? filtered[selectedIdx] : null;

  return (
    <div className="min-h-screen">
      <section className="py-6 md:py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/calculators/piping-components"><Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-piping"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-olets-title"><Minus className="w-5 h-5 text-primary" /> Olet Dimensions</h1>
              <p className="text-xs text-muted-foreground">MSS SP-97 — Weldolet, sockolet, threadolet branch connections — dimensional reference only</p>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <Badge variant={isCustom ? "default" : "secondary"} className="text-[10px]">
              {isCustom ? `Custom: ${meta?.name ?? "Imported"}` : `Built-in: ${OLET_DATA_PROVENANCE.edition}`}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{rows.length} records</span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowImport(true)} data-testid="button-import-custom">
                Import Custom Data
              </Button>
              {isCustom && (
                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={handleDelete} data-testid="button-revert-builtin">
                  Revert to Built-in
                </Button>
              )}
            </div>
          </div>

          {!isCustom && (
            <div className="mb-4 p-3 rounded-md border border-blue-900/30 bg-blue-950/10">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>Data source: {OLET_DATA_PROVENANCE.edition}.</strong> {OLET_DATA_PROVENANCE.disclaimer}
              </p>
            </div>
          )}

          {showImport && <div className="mb-4"><DatasetImportWizard category="olets" onImported={() => { setShowImport(false); loadData(); }} onClose={() => setShowImport(false)} /></div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><Card>
              <CardHeader className="pb-3"><div className="flex items-center gap-3 flex-wrap">
                <div><Label className="text-xs">Run NPS</Label><Select value={filterRunNPS} onValueChange={setFilterRunNPS}><SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{runNpsValues.map(n => <SelectItem key={n} value={String(n)}>{n}"</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Type</Label><Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{typeValues.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <Badge variant="secondary" className="text-[10px] ml-auto">{filtered.length} records</Badge>
              </div></CardHeader>
              <CardContent className="pt-0 max-h-[500px] overflow-y-auto">
                <DimensionTable rows={filtered} columns={COLUMNS} selectedIndex={selectedIdx} onSelect={idx => setSelectedKey(getOletKey(filtered[idx]))} />
              </CardContent>
            </Card></div>
            <div><Card><CardHeader className="pb-2"><h3 className="text-sm font-semibold">Olet Drawing</h3></CardHeader>
              <CardContent className="flex items-center justify-center">
                {selected ? <OletSVG row={selected} /> : <div className="text-center py-8"><Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">Select a row to view drawing</p></div>}
              </CardContent></Card></div>
          </div>

          <div className="mt-6 p-3 rounded-md border border-amber-900/30 bg-amber-950/10">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Dimensional Reference Tool — Not for Direct Design Use.</strong> {OLET_DATA_PROVENANCE.disclaimer}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
