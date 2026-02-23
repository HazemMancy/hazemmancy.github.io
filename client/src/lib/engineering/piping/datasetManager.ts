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

export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
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

  rawRows.forEach((raw, idx) => {
    const converted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === "number") {
        converted[key] = val;
      } else if (typeof val === "string") {
        const num = parseNumber(val);
        if (num !== undefined && !["type", "end_type", "end_connection", "schedule", "facing", "material", "standard", "rating"].includes(key)) {
          converted[key] = num;
        } else {
          converted[key] = val || undefined;
        }
      }
    }
    if (converted.id_mm === undefined && converted.od_mm !== undefined && converted.wt_mm !== undefined) {
      converted.id_mm = (converted.od_mm as number) - 2 * (converted.wt_mm as number);
    }
    const result = schema.safeParse(converted);
    if (result.success) {
      valid.push(result.data as DatasetRow);
    } else {
      const msg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
      errors.push({ row: idx + 2, message: msg });
    }
  });

  return { valid, errors, total: rawRows.length };
}
