import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Disc3, Info } from "lucide-react";
import { DatasetStatus } from "@/components/piping/dataset-status";
import { DatasetImportWizard } from "@/components/piping/dataset-import-wizard";
import { DimensionTable } from "@/components/piping/dimension-table";
import { FlangeSectionSVG } from "@/components/piping/svg-drawings";
import { loadDataset, deleteDataset } from "@/lib/engineering/piping/datasetManager";
import type { FlangeRow, DatasetMeta } from "@/lib/engineering/piping/schemas";

const COLUMNS = [
  { key: "nps", label: "NPS", unit: "in" },
  { key: "class_rating", label: "Class" },
  { key: "type", label: "Type" },
  { key: "od_mm", label: "OD", unit: "mm" },
  { key: "bolt_circle_mm", label: "BC", unit: "mm" },
  { key: "num_bolts", label: "Bolts" },
  { key: "bolt_dia_mm", label: "Bolt Ø", unit: "mm" },
  { key: "thickness_mm", label: "Thk", unit: "mm" },
  { key: "bore_mm", label: "Bore", unit: "mm" },
];

export default function FlangesPage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<FlangeRow[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [filterNPS, setFilterNPS] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const loadData = async () => {
    const ds = await loadDataset<FlangeRow>("flanges");
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
            <Link href="/calculators/piping-components">
              <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-piping"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-flanges-title">
                <Disc3 className="w-5 h-5 text-primary" /> Flange Dimensions
              </h1>
              <p className="text-xs text-muted-foreground">ASME B16.5 / B16.47 — WN, SO, BL flange dimensions by NPS and class</p>
            </div>
          </div>

          <div className="mb-4"><DatasetStatus meta={meta} onImport={() => setShowImport(true)} onDelete={async () => { await deleteDataset("flanges"); setMeta(null); setRows([]); setSelectedIdx(null); }} /></div>
          {showImport && <div className="mb-4"><DatasetImportWizard category="flanges" onImported={() => { setShowImport(false); loadData(); }} onClose={() => setShowImport(false)} /></div>}

          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div><Label className="text-xs">NPS</Label>
                        <Select value={filterNPS} onValueChange={setFilterNPS}><SelectTrigger className="w-24 h-8 text-xs" data-testid="select-filter-nps"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="all">All</SelectItem>{npsValues.map(n => <SelectItem key={n} value={String(n)}>{n}"</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div><Label className="text-xs">Class</Label>
                        <Select value={filterClass} onValueChange={setFilterClass}><SelectTrigger className="w-24 h-8 text-xs" data-testid="select-filter-class"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="all">All</SelectItem>{classValues.map(c => <SelectItem key={c} value={String(c)}>#{c}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div><Label className="text-xs">Type</Label>
                        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-20 h-8 text-xs" data-testid="select-filter-type"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="all">All</SelectItem>{typeValues.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{filtered.length} records</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 max-h-[500px] overflow-y-auto">
                    <DimensionTable rows={filtered} columns={COLUMNS} selectedIndex={selectedIdx} onSelect={setSelectedIdx} />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card><CardHeader className="pb-2"><h3 className="text-sm font-semibold">Cross-Section Drawing</h3></CardHeader>
                  <CardContent className="flex items-center justify-center">
                    {selected ? <FlangeSectionSVG row={selected} /> : <div className="text-center py-8"><Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-xs text-muted-foreground">Select a row to view drawing</p></div>}
                  </CardContent>
                </Card>
                {selected && (
                  <Card><CardHeader className="pb-2"><h3 className="text-sm font-semibold">Details</h3></CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Flange OD</span><span>{selected.od_mm} mm</span></div>
                      {selected.bolt_circle_mm && <div className="flex justify-between"><span className="text-muted-foreground">Bolt Circle</span><span>{selected.bolt_circle_mm} mm</span></div>}
                      {selected.num_bolts && <div className="flex justify-between"><span className="text-muted-foreground">Bolt Pattern</span><span>{selected.num_bolts}× Ø{selected.bolt_dia_mm ?? "?"}</span></div>}
                      {selected.thickness_mm && <div className="flex justify-between"><span className="text-muted-foreground">Thickness</span><span>{selected.thickness_mm} mm</span></div>}
                      {selected.hub_length_mm && <div className="flex justify-between"><span className="text-muted-foreground">Hub Length</span><span>{selected.hub_length_mm} mm</span></div>}
                      {selected.rf_height_mm !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">RF Height</span><span>{selected.rf_height_mm} mm</span></div>}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {rows.length === 0 && !showImport && (
            <Card className="mt-6"><CardContent className="py-12 text-center">
              <Disc3 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-sm font-medium mb-2">No Flange Data Loaded</h3>
              <p className="text-xs text-muted-foreground mb-4">Import your licensed flange dimension data to start looking up dimensions.</p>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)} data-testid="button-import-flanges">Import Flange Dataset</Button>
            </CardContent></Card>
          )}

          <div className="mt-6 p-3 rounded-md border border-muted/30 bg-muted/5">
            <p className="text-[10px] text-muted-foreground leading-relaxed"><strong>Disclaimer:</strong> Dimensional tables are derived from user-supplied licensed datasets. Reference: ASME B16.5, ASME B16.47.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
