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
    <div className="relative overflow-x-auto border rounded-md max-h-[520px] overflow-y-auto">
      <table className="w-full text-xs border-collapse table-fixed" data-testid="table-dimensions">
        <thead className="sticky top-0 z-20">
          <tr className="border-b bg-muted/80 backdrop-blur-sm">
            {columns.map((col, colIdx) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left font-semibold text-muted-foreground ${
                  colIdx === 0
                    ? "sticky left-0 z-30 bg-muted/95 backdrop-blur-sm min-w-[110px] max-w-[140px]"
                    : "min-w-[80px] max-w-[130px]"
                }`}
              >
                <span className="block truncate" title={col.label + (col.unit ? ` (${col.unit})` : "")}>
                  {col.label}{col.unit ? <span className="ml-1 text-[10px] opacity-60">({col.unit})</span> : null}
                </span>
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
              {columns.map((col, colIdx) => {
                const val = (row as Record<string, unknown>)[col.key];
                const displayVal = val !== undefined && val !== null ? String(val) : null;
                return (
                  <td
                    key={col.key}
                    className={`px-3 py-2 tabular-nums ${
                      colIdx === 0
                        ? `sticky left-0 z-[5] font-medium truncate max-w-[140px] ${
                            selectedIndex === idx ? "bg-primary/10" : "bg-background"
                          }`
                        : "truncate max-w-[130px]"
                    }`}
                    title={displayVal ?? undefined}
                  >
                    {displayVal ?? <span className="text-muted-foreground/50">&mdash;</span>}
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
