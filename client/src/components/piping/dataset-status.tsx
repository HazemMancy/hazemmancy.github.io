import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Trash2, Upload } from "lucide-react";
import type { DatasetMeta } from "@/lib/engineering/piping/schemas";

interface Props {
  meta: DatasetMeta | null;
  onImport: () => void;
  onDelete?: () => void;
}

export function DatasetStatus({ meta, onImport, onDelete }: Props) {
  if (!meta) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5">
        <Database className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-medium text-amber-400">No dataset loaded</p>
          <p className="text-[10px] text-muted-foreground">Upload licensed ASME / manufacturer catalog data to enable dimension lookup.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onImport} className="shrink-0" data-testid="button-import-dataset">
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Import
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 p-3 rounded-md border border-green-500/30 bg-green-500/5">
      <Database className="w-4 h-4 text-green-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-green-400 truncate">{meta.name}</span>
          <Badge variant="secondary" className="text-[10px]">{meta.row_count} rows</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">
          {meta.source} — {meta.revision_date}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button variant="outline" size="sm" onClick={onImport} data-testid="button-reimport-dataset">
          <Upload className="w-3.5 h-3.5" />
        </Button>
        {onDelete && (
          <Button variant="outline" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300" data-testid="button-delete-dataset">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
