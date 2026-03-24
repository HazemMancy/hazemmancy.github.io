import type { PipingCategory, DatasetMeta, Dataset, DatasetRow } from "./schemas";
import { SCHEMA_MAP } from "./schemas";

const DB_NAME = "pipingComponentsDB";
const DB_VERSION = 1;
const STORE_NAME = "datasets";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "meta.category" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(dataset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDataset<T extends DatasetRow>(category: PipingCategory): Promise<Dataset<T> | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(category);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDataset(category: PipingCategory): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(category);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listDatasets(): Promise<DatasetMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as Dataset[]).map(d => d.meta));
    req.onerror = () => reject(req.error);
  });
}

export interface ParseResult {
  valid: DatasetRow[];
  errors: { row: number; message: string }[];
  total: number;
}

function parseNumber(val: string | undefined): number | undefined {
  if (val === undefined || val === null || val.trim() === "") return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

/**
 * RFC 4180-compliant CSV parser.
 * Handles: quoted fields, embedded commas inside quotes, escaped double-quotes (""),
 * optional leading/trailing whitespace on unquoted fields, CRLF and LF line endings.
 */
export function parseCSV(csv: string): Record<string, string>[] {
  // Tokenise a single RFC 4180 record into field strings.
  function tokeniseRecord(record: string): string[] {
    const fields: string[] = [];
    let i = 0;
    while (i <= record.length) {
      if (i === record.length) {
        fields.push("");
        break;
      }
      if (record[i] === '"') {
        // Quoted field
        let field = "";
        i++; // skip opening quote
        while (i < record.length) {
          if (record[i] === '"') {
            if (record[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += record[i++];
          }
        }
        fields.push(field);
        // Skip comma separator
        if (record[i] === ",") i++;
      } else {
        // Unquoted field — read until comma or end
        const start = i;
        while (i < record.length && record[i] !== ",") i++;
        fields.push(record.slice(start, i).trim());
        if (record[i] === ",") i++;
      }
    }
    return fields;
  }

  // Split the raw text into logical records, handling quoted newlines.
  function splitRecords(raw: string): string[] {
    const records: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') {
        if (inQuote && raw[i + 1] === '"') {
          current += '""';
          i++;
        } else {
          inQuote = !inQuote;
          current += ch;
        }
      } else if ((ch === "\n" || (ch === "\r" && raw[i + 1] === "\n")) && !inQuote) {
        if (ch === "\r") i++; // consume \n of CRLF
        if (current.trim().length > 0) records.push(current);
        current = "";
      } else if (ch === "\r" && !inQuote) {
        if (current.trim().length > 0) records.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim().length > 0) records.push(current);
    return records;
  }

  const records = splitRecords(csv);
  if (records.length < 2) return [];

  const headers = tokeniseRecord(records[0]).map(h => h.trim().toLowerCase());
  const result: Record<string, string>[] = [];

  for (let r = 1; r < records.length; r++) {
    const values = tokeniseRecord(records[r]);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    result.push(row);
  }
  return result;
}

export function parseJSON(json: string): Record<string, string>[] {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of objects");
  return data;
}

export function validateRows(category: PipingCategory, rawRows: Record<string, string | number>[]): ParseResult {
  const schema = SCHEMA_MAP[category];
  if (!schema) return { valid: [], errors: [{ row: 0, message: `Unknown category: ${category}` }], total: rawRows.length };

  const valid: DatasetRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const seenKeys = new Set<string>();
  const STRING_FIELDS = ["type", "end_type", "end_connection", "schedule", "facing", "material", "standard", "rating"];

  rawRows.forEach((raw, idx) => {
    const converted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === "number") {
        converted[key] = val;
      } else if (typeof val === "string") {
        const num = parseNumber(val);
        if (num !== undefined && !STRING_FIELDS.includes(key)) {
          converted[key] = num;
        } else {
          converted[key] = val || undefined;
        }
      }
    }
    // Auto-compute id_mm from od_mm − 2·wt_mm if not provided
    if (converted.id_mm === undefined && converted.od_mm !== undefined && converted.wt_mm !== undefined) {
      converted.id_mm = (converted.od_mm as number) - 2 * (converted.wt_mm as number);
    }

    const result = schema.safeParse(converted);
    if (!result.success) {
      const msg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
      errors.push({ row: idx + 2, message: msg });
      return;
    }

    const row = result.data as DatasetRow;

    // ── Cross-field dimensional sanity checks ──────────────────────────────
    if (category === "pipe" && "od_mm" in row && "id_mm" in row) {
      const r = row as { od_mm: number; id_mm?: number };
      if (r.id_mm !== undefined && r.id_mm >= r.od_mm) {
        errors.push({ row: idx + 2, message: `Dimensional error: id_mm (${r.id_mm.toFixed(2)}) must be < od_mm (${r.od_mm.toFixed(2)})` });
        return;
      }
    }
    if (category === "gaskets" && "od_mm" in row && "id_mm" in row) {
      const r = row as { od_mm: number; id_mm: number };
      if (r.id_mm >= r.od_mm) {
        errors.push({ row: idx + 2, message: `Dimensional error: gasket id_mm (${r.id_mm.toFixed(2)}) must be < od_mm (${r.od_mm.toFixed(2)})` });
        return;
      }
    }
    if (category === "line-blanks" && "od_mm" in row && "id_mm" in row) {
      const r = row as { od_mm: number; id_mm?: number };
      if (r.id_mm !== undefined && r.id_mm >= r.od_mm) {
        errors.push({ row: idx + 2, message: `Dimensional error: line blank id_mm (${r.id_mm.toFixed(2)}) must be < od_mm (${r.od_mm.toFixed(2)})` });
        return;
      }
    }

    // ── Duplicate key detection ────────────────────────────────────────────
    let dedupKey = "";
    if (category === "pipe" && "nps" in row && "schedule" in row) {
      dedupKey = `pipe:${(row as { nps: number }).nps}:${(row as { schedule: string }).schedule}`;
    } else if (category === "flanges" && "nps" in row && "class_rating" in row && "type" in row) {
      const r = row as { nps: number; class_rating: number; type: string };
      dedupKey = `flange:${r.nps}:${r.class_rating}:${r.type}`;
    } else if (category === "gaskets" && "nps" in row && "class_rating" in row && "type" in row) {
      const r = row as { nps: number; class_rating: number; type: string };
      dedupKey = `gasket:${r.nps}:${r.class_rating}:${r.type}`;
    } else if (category === "valves" && "nps" in row && "class_rating" in row && "type" in row) {
      const r = row as { nps: number; class_rating: number; type: string };
      dedupKey = `valve:${r.nps}:${r.class_rating}:${r.type}`;
    }

    if (dedupKey) {
      if (seenKeys.has(dedupKey)) {
        errors.push({ row: idx + 2, message: `Duplicate entry: key (${dedupKey.replace(/:/g, " / ")}) already exists in this import batch` });
        return;
      }
      seenKeys.add(dedupKey);
    }

    valid.push(row);
  });

  return { valid, errors, total: rawRows.length };
}
