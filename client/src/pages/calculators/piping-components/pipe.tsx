import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Cylinder, Info } from "lucide-react";
import { DatasetStatus } from "@/components/piping/dataset-status";
import { DatasetImportWizard } from "@/components/piping/dataset-import-wizard";
import { DimensionTable } from "@/components/piping/dimension-table";
import { PipeSectionSVG } from "@/components/piping/svg-drawings";
import { loadDataset, deleteDataset } from "@/lib/engineering/piping/datasetManager";
import type { PipeRow, DatasetMeta } from "@/lib/engineering/piping/schemas";

const PIPE_COLUMNS = [
  { key: "nps", label: "NPS", unit: "in" },
  { key: "dn", label: "DN", unit: "mm" },
  { key: "schedule", label: "Schedule" },
  { key: "od_mm", label: "OD", unit: "mm" },
  { key: "wt_mm", label: "WT", unit: "mm" },
  { key: "id_mm", label: "ID", unit: "mm" },
  { key: "weight_kg_per_m", label: "Weight", unit: "kg/m" },
  { key: "material", label: "Material" },
];

export default function PipePage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<PipeRow[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [filterNPS, setFilterNPS] = useState<string>("all");
  const [filterSchedule, setFilterSchedule] = useState<string>("all");

  const loadData = async () => {
    const ds = await loadDataset<PipeRow>("pipe");
    if (ds) { setMeta(ds.meta); setRows(ds.rows); }
    else { setMeta(null); setRows([]); }
  };

  useEffect(() => { loadData(); }, []);

  const npsValues = useMemo(() => Array.from(new Set(rows.map(r => r.nps))).sort((a, b) => a - b), [rows]);
  const schedValues = useMemo(() => Array.from(new Set(rows.map(r => r.schedule))), [rows]);

  const filtered = useMemo(() => {
    let f = rows;
    if (filterNPS !== "all") f = f.filter(r => r.nps === Number(filterNPS));
    if (filterSchedule !== "all") f = f.filter(r => r.schedule === filterSchedule);
    return f;
  }, [rows, filterNPS, filterSchedule]);

  const selected = selectedIdx !== null ? filtered[selectedIdx] : null;

  const handleDelete = async () => {
    await deleteDataset("pipe");
    setMeta(null); setRows([]); setSelectedIdx(null);
  };

  return (
    <div className="min-h-screen">
      <section className="py-6 md:py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/calculators/piping-components">
              <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-piping">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-pipe-title">
                <Cylinder className="w-5 h-5 text-primary" />
                Pipe Dimensions
              </h1>
              <p className="text-xs text-muted-foreground">ASME B36.10M / B36.19M — Pipe OD, ID, wall thickness by NPS and schedule</p>
            </div>
          </div>

          <div className="mb-4">
            <DatasetStatus meta={meta} onImport={() => setShowImport(true)} onDelete={handleDelete} />
          </div>

          {showImport && (
            <div className="mb-4">
              <DatasetImportWizard category="pipe" onImported={() => { setShowImport(false); loadData(); }} onClose={() => setShowImport(false)} />
            </div>
          )}

          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <Label className="text-xs">NPS</Label>
                        <Select value={filterNPS} onValueChange={setFilterNPS}>
                          <SelectTrigger className="w-24 h-8 text-xs" data-testid="select-filter-nps">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {npsValues.map(n => <SelectItem key={n} value={String(n)}>{n}"</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Schedule</Label>
                        <Select value={filterSchedule} onValueChange={setFilterSchedule}>
                          <SelectTrigger className="w-24 h-8 text-xs" data-testid="select-filter-schedule">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {schedValues.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{filtered.length} records</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 max-h-[500px] overflow-y-auto">
                    <DimensionTable rows={filtered} columns={PIPE_COLUMNS} selectedIndex={selectedIdx} onSelect={setSelectedIdx} />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <h3 className="text-sm font-semibold">Cross-Section Drawing</h3>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center">
                    {selected ? (
                      <PipeSectionSVG row={selected} />
                    ) : (
                      <div className="text-center py-8">
                        <Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Select a row to view drawing</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selected && (
                  <Card>
                    <CardHeader className="pb-2">
                      <h3 className="text-sm font-semibold">Derived Values</h3>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Pipe ID</span><span>{(selected.id_mm ?? selected.od_mm - 2 * selected.wt_mm).toFixed(2)} mm</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Wall Check</span><span>t = (OD−ID)/2 = {selected.wt_mm.toFixed(2)} mm</span></div>
                      {(() => {
                        const id = selected.id_mm ?? selected.od_mm - 2 * selected.wt_mm;
                        const areaOuter = Math.PI / 4 * selected.od_mm * selected.od_mm;
                        const areaInner = Math.PI / 4 * id * id;
                        const areaMetal = areaOuter - areaInner;
                        return (
                          <>
                            <div className="flex justify-between"><span className="text-muted-foreground">Metal Area</span><span>{areaMetal.toFixed(1)} mm²</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Flow Area</span><span>{areaInner.toFixed(1)} mm²</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">D/t Ratio</span><span>{(selected.od_mm / selected.wt_mm).toFixed(1)}</span></div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {rows.length === 0 && !showImport && (
            <Card className="mt-6">
              <CardContent className="py-12 text-center">
                <Cylinder className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-sm font-medium mb-2">No Pipe Data Loaded</h3>
                <p className="text-xs text-muted-foreground mb-4">Import your licensed pipe dimension data (ASME B36.10M / B36.19M) to start looking up dimensions.</p>
                <Button variant="outline" size="sm" onClick={() => setShowImport(true)} data-testid="button-import-pipe">
                  Import Pipe Dataset
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-3 rounded-md border border-muted/30 bg-muted/5">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>Disclaimer:</strong> Dimensional tables are derived from user-supplied licensed datasets and/or manufacturer catalogs.
              This tool does not reproduce copyrighted standards content. Reference standards: ASME B36.10M (Carbon Steel Pipe), ASME B36.19M (Stainless Steel Pipe).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
