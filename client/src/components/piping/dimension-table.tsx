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
    <div className="relative overflow-x-auto border rounded-md">
      <table className="w-full text-xs border-collapse" data-testid="table-dimensions">
        <thead>
          <tr className="border-b bg-muted/30">
            {columns.map((col, colIdx) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[80px] ${
                  colIdx === 0 ? "sticky left-0 z-10 bg-muted/50 backdrop-blur-sm" : ""
                }`}
              >
                <span className="block truncate max-w-[160px]">
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
                return (
                  <td
                    key={col.key}
                    className={`px-3 py-2 whitespace-nowrap ${
                      colIdx === 0
                        ? `sticky left-0 z-[5] font-medium ${
                            selectedIndex === idx ? "bg-primary/10" : "bg-background"
                          }`
                        : ""
                    }`}
                  >
                    {val !== undefined && val !== null ? String(val) : <span className="text-muted-foreground/50">&mdash;</span>}
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
