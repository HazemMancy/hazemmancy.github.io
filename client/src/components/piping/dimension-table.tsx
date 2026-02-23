import type { DatasetRow } from "@/lib/engineering/piping/schemas";

interface Props {
  rows: DatasetRow[];
  columns: { key: string; label: string; unit?: string }[];
  selectedIndex: number | null;
  onSelect: (idx: number) => void;
}

export function DimensionTable({ rows, columns, selectedIndex, onSelect }: Props) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">
        No records match the current filters.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-xs" data-testid="table-dimensions">
        <thead>
          <tr className="border-b bg-muted/30">
            {columns.map(col => (
              <th key={col.key} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                {col.label}{col.unit ? <span className="ml-1 text-[10px] opacity-60">({col.unit})</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onSelect(idx)}
              className={`border-b cursor-pointer transition-colors ${
                selectedIndex === idx
                  ? "bg-primary/10 border-primary/30"
                  : "hover:bg-muted/20"
              }`}
              data-testid={`row-dim-${idx}`}
            >
              {columns.map(col => {
                const val = (row as Record<string, unknown>)[col.key];
                return (
                  <td key={col.key} className="px-2 py-1.5 whitespace-nowrap">
                    {val !== undefined && val !== null ? String(val) : <span className="text-muted-foreground/50">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
