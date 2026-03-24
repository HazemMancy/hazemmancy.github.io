import { z } from "zod";

export const PIPING_CATEGORIES = [
  "pipe", "flanges", "fittings", "gaskets", "valves",
  "line-blanks", "olets", "pipe-flexibility", "safe-spans",
] as const;
export type PipingCategory = typeof PIPING_CATEGORIES[number];

export const CATEGORY_LABELS: Record<PipingCategory, string> = {
  pipe: "Pipe",
  flanges: "Flanges",
  fittings: "Fittings",
  gaskets: "Gaskets",
  valves: "Valves",
  "line-blanks": "Line Blanks",
  olets: "Olets",
  "pipe-flexibility": "Pipe Flexibility",
  "safe-spans": "Safe Spans",
};

export const pipeRowSchema = z.object({
  nps: z.number().positive(),
  dn: z.number().positive().optional(),
  schedule: z.string().min(1),
  od_mm: z.number().positive(),
  wt_mm: z.number().positive(),
  id_mm: z.number().positive().optional(),
  weight_kg_per_m: z.number().positive().optional(),
  material: z.string().optional(),
  standard: z.string().optional(),
});
export type PipeRow = z.infer<typeof pipeRowSchema>;

export const flangeRowSchema = z.object({
  nps: z.number().positive(),
  dn: z.number().positive().optional(),
  class_rating: z.number().positive(),
  type: z.enum(["WN", "SO", "BL", "SW", "LAP", "THD"]),
  od_mm: z.number().positive(),
  bolt_circle_mm: z.number().positive().optional(),
  num_bolts: z.number().int().positive().optional(),
  bolt_dia_mm: z.number().positive().optional(),
  thickness_mm: z.number().positive().optional(),
  hub_length_mm: z.number().positive().optional(),
  rf_height_mm: z.number().min(0).optional(),
  bore_mm: z.number().positive().optional(),
  facing: z.string().optional(),
  material: z.string().optional(),
  standard: z.string().optional(),
});
export type FlangeRow = z.infer<typeof flangeRowSchema>;

export const fittingRowSchema = z.object({
  nps: z.number().positive(),
  nps2: z.number().positive().optional(),
  dn: z.number().positive().optional(),
  schedule: z.string().optional(),
  type: z.enum(["90LR", "90SR", "45LR", "TEE", "RED_CON", "RED_ECC", "CAP", "STUB"]),
  end_type: z.enum(["BW", "SW", "THD"]).optional(),
  center_to_end_mm: z.number().positive().optional(),
  center_to_center_mm: z.number().positive().optional(),
  overall_length_mm: z.number().positive().optional(),
  od_mm: z.number().positive().optional(),
  wt_mm: z.number().positive().optional(),
  material: z.string().optional(),
  standard: z.string().optional(),
});
export type FittingRow = z.infer<typeof fittingRowSchema>;

export const gasketRowSchema = z.object({
  nps: z.number().positive(),
  dn: z.number().positive().optional(),
  class_rating: z.number().positive(),
  type: z.enum(["SWG", "RTJ", "FF", "RF"]),
  id_mm: z.number().positive(),
  od_mm: z.number().positive(),
  thickness_mm: z.number().positive().optional(),
  material: z.string().optional(),
  standard: z.string().optional(),
});
export type GasketRow = z.infer<typeof gasketRowSchema>;

export const valveRowSchema = z.object({
  nps: z.number().positive(),
  dn: z.number().positive().optional(),
  class_rating: z.number().positive(),
  type: z.enum(["GATE", "GLOBE", "BALL", "CHECK", "BUTTERFLY", "PLUG"]),
  end_connection: z.enum(["RF", "RTJ", "BW", "SW", "THD"]).optional(),
  face_to_face_mm: z.number().positive().optional(),
  height_mm: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  material: z.string().optional(),
  standard: z.string().optional(),
});
export type ValveRow = z.infer<typeof valveRowSchema>;

export const lineBlankRowSchema = z.object({
  nps: z.number().positive(),
  dn: z.number().positive().optional(),
  class_rating: z.number().positive(),
  type: z.enum(["SPECTACLE", "SPADE", "SPACER"]),
  od_mm: z.number().positive(),
  id_mm: z.number().min(0).optional(),
  thickness_mm: z.number().positive().optional(),
  handle_length_mm: z.number().positive().optional(),
  material: z.string().optional(),
  standard: z.string().optional(),
});
export type LineBlankRow = z.infer<typeof lineBlankRowSchema>;

export const oletRowSchema = z.object({
  run_nps: z.number().positive(),
  branch_nps: z.number().positive(),
  type: z.enum(["WELDOLET", "SOCKOLET", "THREADOLET", "ELBOLET", "LATROLET"]),
  rating: z.string().optional(),
  height_mm: z.number().positive().optional(),
  bore_mm: z.number().positive().optional(),
  base_width_mm: z.number().positive().optional(),
  material: z.string().optional(),
  standard: z.string().optional(),
});
export type OletRow = z.infer<typeof oletRowSchema>;

export interface DatasetMeta {
  category: PipingCategory;
  name: string;
  source: string;
  revision_date: string;
  row_count: number;
  loaded_at: string;
  /** Governing standard(s) — e.g. "ASME B36.10M:2018, ASME B36.19M:2018" */
  standard?: string;
  /** Standard edition / publication year */
  edition?: string;
  /** Scope / coverage note — e.g. "NPS ⅛\"–24\", welded and seamless wrought steel" */
  scope?: string;
  /** Engineering disclaimer for this dataset */
  disclaimer?: string;
  /** True for datasets shipped with this application (read-only reference data) */
  is_builtin?: boolean;
}

/**
 * Provenance record for a built-in reference dataset.
 * Embed one in each data file so the UI can display governance information.
 */
export interface BuiltInDatasetProvenance {
  name: string;
  standard: string;
  edition: string;
  scope: string;
  disclaimer: string;
  category: PipingCategory;
}

export type DatasetRow = PipeRow | FlangeRow | FittingRow | GasketRow | ValveRow | LineBlankRow | OletRow;

export interface Dataset<T = DatasetRow> {
  meta: DatasetMeta;
  rows: T[];
}

export const SCHEMA_MAP: Record<string, z.ZodSchema> = {
  pipe: pipeRowSchema,
  flanges: flangeRowSchema,
  fittings: fittingRowSchema,
  gaskets: gasketRowSchema,
  valves: valveRowSchema,
  "line-blanks": lineBlankRowSchema,
  olets: oletRowSchema,
};

export const CSV_TEMPLATES: Record<string, string> = {
  pipe: "nps,dn,schedule,od_mm,wt_mm,id_mm,weight_kg_per_m,material,standard",
  flanges: "nps,dn,class_rating,type,od_mm,bolt_circle_mm,num_bolts,bolt_dia_mm,thickness_mm,hub_length_mm,rf_height_mm,bore_mm,facing,material,standard",
  fittings: "nps,nps2,dn,schedule,type,end_type,center_to_end_mm,center_to_center_mm,overall_length_mm,od_mm,wt_mm,material,standard",
  gaskets: "nps,dn,class_rating,type,id_mm,od_mm,thickness_mm,material,standard",
  valves: "nps,dn,class_rating,type,end_connection,face_to_face_mm,height_mm,weight_kg,material,standard",
  "line-blanks": "nps,dn,class_rating,type,od_mm,id_mm,thickness_mm,handle_length_mm,material,standard",
  olets: "run_nps,branch_nps,type,rating,height_mm,bore_mm,base_width_mm,material,standard",
};

export const NPS_VALUES = [
  0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 26, 28, 30, 32, 34, 36, 42, 48,
];

export const CLASS_RATINGS = [150, 300, 600, 900, 1500, 2500];

export const SCHEDULES = [
  "5S", "10S", "10", "20", "30", "STD", "40", "60", "XS", "80", "100", "120", "140", "160", "XXS",
];
