/**
 * Pipe Wall Thickness Engine
 *
 * Standards:
 *   ASME B31.1:2022  — Power Piping, §104.1.2(A) (straight pipe, internal pressure)
 *   ASME B31.3:2022  — Process Piping, §304.1.2 (straight pipe, internal pressure)
 *   ASME B31.4:2019  — Pipeline Transportation Systems for Liquids & Slurries, §403.2.1
 *   ASME B31.8:2022  — Gas Transmission & Distribution Piping, §841.11
 *   ASME B36.10M:2018 — Welded and Seamless Wrought Steel Pipe (schedule dimensions)
 *   ASME B36.19M:2018 — Stainless Steel Pipe (10S / 40S / 80S schedules)
 *   API 5L:2018       — Specification for Line Pipe (SMYS / SMUTS for pipeline grades)
 *   ASTM A106-2019    — Seamless CS pipe (Gr. A, B, C)
 *
 * KEY DESIGN EQUATION (thin-wall):
 *
 *   ASME B31.1 §104.1.2(A):
 *     t_p = P·D / (2·(S·E + P·Y))           [W is not defined in B31.1 — W ≡ 1.0]
 *     NOTE: B31.1 allowable stress S is from B31.1 Table A-1 (basis: lesser of
 *           1/4 Su or 2/3 Sy at temperature — more conservative than B31.3).
 *     E — longitudinal joint factor, B31.1 Table 132.4
 *     Y — coefficient, B31.1 Table 104.1.2(A)
 *
 *   ASME B31.3 §304.1.2:
 *     t_p = P·D / (2·(S·E·W + P·Y))
 *     Valid when: t_p < D/6  AND  P/(S·E·W) < 0.385
 *     Thick-wall (Lamé) when condition above not met:
 *     t_p = D/2 · (√((S·E·W + P)/(S·E·W − P)) − 1)
 *
 *   ASME B31.4 §403.2.1  /  ASME B31.8 §841.11:
 *     t_p = P·D / (2·S·F·E·T)
 *
 *   TOTAL REQUIRED THICKNESS:
 *     t_total = t_p + c     [c = sum of all mechanical allowances]
 *
 *   REQUIRED NOMINAL WALL (mill tolerance MT%):
 *     t_nom_req = t_total / (1 − MT/100)
 *
 *   SELECTED PIPE CHECK:
 *     t_selected × (1 − MT/100) ≥ t_total  →  PASS
 *
 *   MAOP FROM SELECTED SCHEDULE (B31.3 / B31.1 back-calculation):
 *     t_eff = t_selected × (1 − MT/100) − c
 *     P_MAOP = 2·t_eff·S·E·W / (D − 2·Y·t_eff)   [W = 1 for B31.1]
 *
 *   HOOP STRESS (Barlow thin-wall):
 *     σ_h = P·D / (2·t_eff)
 *     Utilisation = σ_h / (S·E·W)  [should be ≤ 1.0]
 *
 * PARAMETERS:
 *
 *   S   — Allowable stress [MPa]:
 *           B31.1: from B31.1 Table A-1 (1/4 Su or 2/3 Sy basis)
 *           B31.3: from B31.3 Table A-1 (1/3 Su or 2/3 Sy basis)
 *           B31.4/B31.8: from SMYS with design factor F
 *   E   — Quality (longitudinal joint) factor:
 *           B31.1 Table 132.4 / B31.3 Table A-1B:
 *           Seamless = 1.00 | ERW = 0.85 | DSAW = 1.00 | EFW = 0.80 (B31.1) or 0.85 (B31.3) | FBW = 0.60
 *   W   — Weld joint strength reduction factor (B31.3 only, B31.3 Table 302.3.5):
 *           W = 1.0 for T ≤ 510 °C; flag if T > 510 °C (creep regime).
 *           Not used in B31.1.
 *   Y   — Coefficient:
 *           B31.1 Table 104.1.2(A) / B31.3 Table 304.1.1 (same values in current editions):
 *           Ferritic ≤ 482 °C → 0.4; ≤ 510 °C → 0.5; ≤ 538 °C → 0.6; ≥ 566 °C → 0.7
 *           Austenitic ≤ 566 °C → 0.4; > 566 °C → 0.5
 *   F   — Design factor, B31.4 §403.2.1 = 0.72 (liquid); B31.8 §841.11 Table 841.114A
 *           Class 1 Div 1 = 0.80 | Class 1 Div 2 = 0.72 | Class 2 = 0.60 | Class 3 = 0.50 | Class 4 = 0.40
 *   T   — Temperature derating, B31.4 Table 403.2.1-1 / B31.8 Table 841.1.8-1:
 *           T ≤ 121 °C → 1.000 | ≤ 149 °C → 0.967 | ≤ 177 °C → 0.933 | ≤ 204 °C → 0.900 | ≤ 232 °C → 0.867
 *   c   — Mechanical allowances [mm]:
 *           c = corrosion_allowance + erosion_allowance + thread/groove_depth
 *   MT  — Mill tolerance [%]: 12.5% default per ASTM / API 5L (negative tolerance on wall)
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** ASME B31.3 Table A-1B — Longitudinal joint quality factor E by weld type */
export const QUALITY_FACTORS: Record<string, { E: number; label: string; std: string }> = {
  seamless: { E: 1.00, label: "Seamless",                          std: "ASME B31.3 Table A-1B" },
  erw:      { E: 0.85, label: "Electric Resistance Welded (ERW)",   std: "ASME B31.3 Table A-1B" },
  dsaw:     { E: 1.00, label: "Double Submerged Arc Welded (DSAW)", std: "ASME B31.3 Table A-1B" },
  efw:      { E: 0.85, label: "Electric Fusion Welded (EFW)",       std: "ASME B31.3 Table A-1B" },
  fbw:      { E: 0.60, label: "Furnace Butt Welded (FBW)",          std: "ASME B31.3 Table A-1B" },
};

/**
 * ASME B31.1:2022 Table 132.4 — Longitudinal joint quality factor E.
 * NOTE: B31.1 EFW factor (0.80) is slightly lower than B31.3 (0.85).
 * Seamless, ERW, and DSAW/SAW match B31.3. FBW remains 0.60.
 */
export const QUALITY_FACTORS_POWER: Record<string, { E: number; label: string; std: string }> = {
  seamless: { E: 1.00, label: "Seamless",                          std: "ASME B31.1 Table 132.4" },
  erw:      { E: 0.85, label: "Electric Resistance Welded (ERW)",   std: "ASME B31.1 Table 132.4" },
  dsaw:     { E: 1.00, label: "Double Submerged Arc Welded (DSAW)", std: "ASME B31.1 Table 132.4" },
  efw:      { E: 0.80, label: "Electric Fusion Welded (EFW)",       std: "ASME B31.1 Table 132.4" },
  fbw:      { E: 0.60, label: "Furnace Butt Welded (FBW)",          std: "ASME B31.1 Table 132.4" },
};

/**
 * ASME B31.4:2019 Table 403.2.1-1 / ASME B31.8:2022 §841.11 — Joint factor E.
 *
 * NOTE: B31.4/B31.8 define joint factors differently from B31.3 Table A-1B:
 *   - ERW (PSL1, no full-body NDE): E = 0.80 — the conservative default for API 5L ERW pipe.
 *   - ERW (PSL2, full-body UT per API 5L SR4): E = 1.00 — B31.8 §841.11 Note (3) / Annex R.
 *   - FBW: not permitted for gas pipelines (B31.8 §817.1); E = 0.60 for liquid lines.
 *   - Seamless and SAW/DSAW: E = 1.00.
 *
 * Using B31.3 ERW value (0.85) for B31.4/B31.8 design is incorrect and non-conservative.
 */
export const QUALITY_FACTORS_PIPELINE: Record<string, { E: number; label: string; std: string }> = {
  seamless:  { E: 1.00, label: "Seamless",                                    std: "ASME B31.4 Table 403.2.1-1 / B31.8 §841.11" },
  erw:       { E: 0.80, label: "ERW (API 5L PSL1 — standard, no full-body NDE)", std: "ASME B31.4 Table 403.2.1-1 / B31.8 §841.11" },
  erw_psl2:  { E: 1.00, label: "ERW (API 5L PSL2 — full-body UT per SR4)",    std: "ASME B31.8 §841.11 Note (3) / Annex R" },
  dsaw:      { E: 1.00, label: "Submerged Arc Welded (SAW/DSAW)",              std: "ASME B31.4 Table 403.2.1-1 / B31.8 §841.11" },
  efw:       { E: 0.80, label: "Electric Fusion Welded (EFW)",                 std: "ASME B31.4 Table 403.2.1-1" },
  fbw:       { E: 0.60, label: "Furnace Butt Welded (FBW — B31.4 liquid only)",std: "ASME B31.4 Table 403.2.1-1" },
};

/** ASME B31.8 §841.114A — Location class design factors */
export const B318_LOCATION_CLASS: Record<string, { F: number; label: string }> = {
  "1D1": { F: 0.80, label: "Class 1, Division 1 (offshore gathering, very remote)" },
  "1D2": { F: 0.72, label: "Class 1, Division 2 (rural, ≤ 10 buildings/km²)" },
  "2":   { F: 0.60, label: "Class 2 (moderate density, 10–46 buildings/km²)" },
  "3":   { F: 0.50, label: "Class 3 (high density, ≥ 46 buildings/km²)" },
  "4":   { F: 0.40, label: "Class 4 (multi-story, areas with heavy traffic)" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type PipeStandard    = "B31.1" | "B31.3" | "B31.4" | "B31.8";
export type MaterialType    = "ferritic" | "austenitic" | "pipeline" | "user";
export type JointTypeKey    = "seamless" | "erw" | "erw_psl2" | "dsaw" | "efw" | "fbw" | "user";
export type LocationClassKey = "1D1" | "1D2" | "2" | "3" | "4";

export interface PipeWTProject {
  name: string;
  lineTag: string;
  engineer: string;
  date: string;
  rev: string;
  dataQuality: "preliminary" | "confirmed";
}

export interface MaterialSpec {
  id: string;
  name: string;
  spec: string;
  materialType: MaterialType;
  compatibleStandards: PipeStandard[];
  /** Tabulated allowable stress vs. temperature per ASME B31.3 Table A-1 [°C → MPa].
   *  Linear interpolation is applied between table values.
   *  For pipeline materials used with B31.4/B31.8, use smys with the design factor. */
  stressTable: Array<{ tempC: number; S_MPa: number }>;
  /** SMYS [MPa] — for API 5L pipeline grades used with B31.4/B31.8 */
  smys: number;
  /** SMUTS [MPa] — for API 5L */
  smuts: number;
  /** Default joint type for this material */
  defaultJoint: JointTypeKey;
  notes: string;
}

export interface NpsSchedule {
  /** Schedule designation: "Sch 10", "Sch 40 (Std)", "Sch 80 (XS)", etc. */
  schedule: string;
  wallMm: number;
}

export interface NpsEntry {
  nps: string;            // e.g. "4\""
  odMm: number;           // outside diameter [mm] per ASME B36.10M
  schedules: NpsSchedule[];
}

export interface PipeWTInput {
  project: PipeWTProject;
  pipingStandard: PipeStandard;
  /** true = use NPS lookup, false = user enters OD directly */
  useNpsSel: boolean;
  npsLabel: string;       // e.g. '6"'
  outerDiameter: number;  // [mm]
  materialId: string;     // key in MATERIAL_DB or "user"
  userS_MPa: number;      // user-defined allowable stress [MPa] (when materialId="user")
  userSmys: number;       // user-defined SMYS [MPa] (B31.4/B31.8, materialId="user")
  userMaterialType: MaterialType;
  jointType: JointTypeKey;
  userE: number;          // quality factor if jointType="user"
  designPressure: number; // [bar(g)] — convert to MPa for calc
  designTemperature: number; // [°C]
  corrosionAllowance: number; // [mm]
  erosionAllowance: number;   // [mm]
  threadGrooveAllowance: number; // [mm] (groove depth or thread engagement)
  millTolerance: number;  // [%] default 12.5
  /** B31.8 only: location class → design factor F */
  locationClass: LocationClassKey;
  /** B31.4/B31.8: override design factor (null = use standard default) */
  userDesignFactor: number | null;
}

export interface ScheduleCheck {
  schedule: string;
  wallMm: number;
  tEffective: number;   // wall × (1 − MT/100) [mm]
  maop: number;         // MAOP [bar(g)]
  hoopStress: number;   // σ_h [MPa]
  utilisation: number;  // σ_h / (S·E·W)
  passes: boolean;
}

export interface CalcStep {
  label: string;
  equation: string;
  value: string;
  unit: string;
  ref: string;  // standard clause reference
}

export type PipeWTFlag =
  | "THICK_WALL"
  | "CREEP_REGIME"
  | "HIGH_TEMPERATURE"
  | "LOW_TEMPERATURE"
  | "LOW_TEMP_CLAMPED"
  | "TEMP_ABOVE_DERATING_TABLE"
  | "NO_SCHEDULE_FOUND"
  | "LOW_DP"
  | "HIGH_UTILISATION"
  | "CORROSION_DOMINANT"
  | "MATERIAL_TEMP_LIMIT"
  | "MILL_TOL_DOMINANT"
  | "W_FACTOR_WARNING"
  | "MAOP_LOW_MARGIN"
  | "USER_OVERRIDE_ACTIVE"
  | "PRELIMINARY_DATA";

export interface PipeWTResult {
  /** Minimum pressure design thickness [mm] — §304.1.2 or §403.2.1/841.11 */
  t_pressure: number;
  /** Total mechanical allowance c [mm] = corrosion + erosion + thread/groove */
  c_total: number;
  /** Minimum required total thickness (including all allowances) [mm] */
  t_required: number;
  /** Required nominal wall (to ensure t_eff ≥ t_required after mill tolerance) [mm] */
  t_nominal_required: number;
  /** Allowable stress S at design temperature [MPa] */
  S_eff: number;
  /** Quality factor E */
  E_eff: number;
  /** Y coefficient (B31.3) */
  Y_eff: number;
  /** W factor (B31.3) */
  W_eff: number;
  /** Design factor F (B31.4/B31.8) */
  F_eff: number;
  /** Temperature derating T (B31.4/B31.8) */
  T_derating: number;
  /** Design pressure [MPa(g)] */
  P_MPa: number;
  /** Design temperature [°C] */
  T_design: number;
  /** Outside diameter [mm] */
  D_mm: number;
  /** Beta = t_pressure / D — thin-wall check (valid if < 1/6) */
  tOverD: number;
  /** Thick-wall Lamé result [mm] (if thick-wall condition triggered) */
  t_lame: number;
  isThickWall: boolean;
  /** Schedule checks for selected NPS */
  scheduleChecks: ScheduleCheck[];
  /** First schedule that passes — selected pipe */
  selectedSchedule: ScheduleCheck | null;
  calcSteps: CalcStep[];
  flags: PipeWTFlag[];
  warnings: string[];
  recommendations: string[];
}

// ─── Material Database (ASME B31.3 Table A-1) ────────────────────────────────

/**
 * Allowable stress tables per ASME B31.3:2022 Table A-1.
 * Source: Published values for common materials.
 * IMPORTANT: Always verify against the current edition of the standard
 * for the specific specification, product form, and heat treatment condition.
 *
 * Temperatures [°C] | Allowable Stress [MPa]
 */
export const MATERIAL_DB: Record<string, MaterialSpec> = {

  A106_B: {
    id: "A106_B", name: "ASTM A106 Gr. B — Seamless CS",
    spec: "ASTM A106 / ASME B31.3 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.3"],
    stressTable: [
      { tempC: -29,  S_MPa: 138 },
      { tempC: 93,   S_MPa: 138 },
      { tempC: 204,  S_MPa: 138 },
      { tempC: 260,  S_MPa: 131 },
      { tempC: 288,  S_MPa: 128 },
      { tempC: 316,  S_MPa: 124 },
      { tempC: 343,  S_MPa: 121 },
      { tempC: 371,  S_MPa: 117 },
      { tempC: 399,  S_MPa: 110 },
      { tempC: 427,  S_MPa: 103 },
      { tempC: 454,  S_MPa: 86  },
      { tempC: 482,  S_MPa: 62  },
    ],
    smys: 241, smuts: 414, defaultJoint: "seamless",
    notes: "Most common CS process pipe. SMYS=241 MPa, SMUTS=414 MPa. Not rated > 482 °C.",
  },

  A106_C: {
    id: "A106_C", name: "ASTM A106 Gr. C — Seamless CS (High-Strength)",
    spec: "ASTM A106 / ASME B31.3 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.3"],
    stressTable: [
      // Source: ASME B31.3:2022 Table A-1.  SMYS=276 MPa (40 ksi), SMUTS=483 MPa (70 ksi).
      // S = min(SMUTS/3, 2/3×SMYS) = min(161, 184) = 161 MPa at ambient.
      // High-temp values follow ferritic derating trend — verify vs. current Table A-1 edition.
      { tempC: -29,  S_MPa: 160 },
      { tempC: 204,  S_MPa: 160 },
      { tempC: 260,  S_MPa: 153 },
      { tempC: 288,  S_MPa: 149 },
      { tempC: 316,  S_MPa: 145 },
      { tempC: 343,  S_MPa: 141 },
      { tempC: 371,  S_MPa: 138 },
      { tempC: 399,  S_MPa: 131 },
      { tempC: 427,  S_MPa: 121 },
      { tempC: 454,  S_MPa: 100 },
      { tempC: 482,  S_MPa: 72  },
    ],
    smys: 276, smuts: 483, defaultJoint: "seamless",
    notes: "Highest-strength A106 grade. SMYS=276 MPa, SMUTS=483 MPa. Seamless only. Not rated > 482 °C.",
  },

  A106_A: {
    id: "A106_A", name: "ASTM A106 Gr. A — Seamless CS",
    spec: "ASTM A106 / ASME B31.3 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.3"],
    stressTable: [
      { tempC: -29,  S_MPa: 96  },
      { tempC: 204,  S_MPa: 96  },
      { tempC: 260,  S_MPa: 96  },
      { tempC: 316,  S_MPa: 89  },
      { tempC: 371,  S_MPa: 83  },
      { tempC: 399,  S_MPa: 79  },
      { tempC: 427,  S_MPa: 72  },
      { tempC: 454,  S_MPa: 60  },
      { tempC: 482,  S_MPa: 44  },
    ],
    smys: 207, smuts: 331, defaultJoint: "seamless",
    notes: "Lower yield than Gr. B. SMYS=207 MPa.",
  },

  A333_6: {
    id: "A333_6", name: "ASTM A333 Gr. 6 — Low-Temp CS",
    spec: "ASTM A333 / ASME B31.3 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.3"],
    stressTable: [
      { tempC: -45,  S_MPa: 138 },
      { tempC: 204,  S_MPa: 138 },
      { tempC: 260,  S_MPa: 131 },
      { tempC: 316,  S_MPa: 124 },
      { tempC: 343,  S_MPa: 121 },
      { tempC: 371,  S_MPa: 110 },
      { tempC: 399,  S_MPa: 96  },
    ],
    smys: 241, smuts: 414, defaultJoint: "seamless",
    notes: "Impact tested to -45 °C. Equivalent strength to A106-B. Not rated > 399 °C.",
  },

  A312_TP304: {
    id: "A312_TP304", name: "ASTM A312 TP304 — Austenitic SS (18/8)",
    spec: "ASTM A312 / ASME B31.3 Table A-1",
    materialType: "austenitic",
    compatibleStandards: ["B31.3"],
    stressTable: [
      { tempC: -196, S_MPa: 138 },
      { tempC: 93,   S_MPa: 131 },
      { tempC: 149,  S_MPa: 124 },
      { tempC: 204,  S_MPa: 120 },
      { tempC: 260,  S_MPa: 116 },
      { tempC: 316,  S_MPa: 113 },
      { tempC: 371,  S_MPa: 110 },
      { tempC: 427,  S_MPa: 108 },
      { tempC: 482,  S_MPa: 107 },
      { tempC: 538,  S_MPa: 106 },
      { tempC: 593,  S_MPa: 102 },
      { tempC: 649,  S_MPa: 90  },
      { tempC: 704,  S_MPa: 72  },
      { tempC: 760,  S_MPa: 51  },
      { tempC: 816,  S_MPa: 34  },
    ],
    smys: 207, smuts: 517, defaultJoint: "seamless",
    notes: "General SS. Sensitisation risk > 425 °C without stabilisation.",
  },

  A312_TP316: {
    id: "A312_TP316", name: "ASTM A312 TP316 — Austenitic SS (18/8/2Mo)",
    spec: "ASTM A312 / ASME B31.3 Table A-1",
    materialType: "austenitic",
    compatibleStandards: ["B31.3"],
    stressTable: [
      { tempC: -196, S_MPa: 138 },
      { tempC: 93,   S_MPa: 128 },
      { tempC: 149,  S_MPa: 121 },
      { tempC: 204,  S_MPa: 117 },
      { tempC: 260,  S_MPa: 114 },
      { tempC: 316,  S_MPa: 112 },
      { tempC: 371,  S_MPa: 111 },
      { tempC: 427,  S_MPa: 110 },
      { tempC: 482,  S_MPa: 109 },
      { tempC: 538,  S_MPa: 108 },
      { tempC: 593,  S_MPa: 105 },
      { tempC: 649,  S_MPa: 93  },
      { tempC: 704,  S_MPa: 73  },
      { tempC: 760,  S_MPa: 52  },
      { tempC: 816,  S_MPa: 34  },
    ],
    smys: 207, smuts: 517, defaultJoint: "seamless",
    notes: "Mo addition improves pitting resistance vs TP304. Better for Cl− environments.",
  },

  A312_TP316L: {
    id: "A312_TP316L", name: "ASTM A312 TP316L — Low-Carbon SS",
    spec: "ASTM A312 / ASME B31.3 Table A-1",
    materialType: "austenitic",
    compatibleStandards: ["B31.3"],
    stressTable: [
      { tempC: -196, S_MPa: 115 },
      { tempC: 93,   S_MPa: 107 },
      { tempC: 149,  S_MPa: 101 },
      { tempC: 204,  S_MPa: 97  },
      { tempC: 260,  S_MPa: 94  },
      { tempC: 316,  S_MPa: 91  },
      { tempC: 371,  S_MPa: 89  },
      { tempC: 427,  S_MPa: 87  },
      { tempC: 482,  S_MPa: 86  },
      { tempC: 538,  S_MPa: 85  },
      { tempC: 593,  S_MPa: 82  },
    ],
    smys: 172, smuts: 483, defaultJoint: "seamless",
    notes: "L-grade for welded service without post-weld HT. Lower allowable than TP316.",
  },

  // ── ASME B31.1 Power Piping Materials (Table A-1 Allowable Stresses) ─────────
  // Basis: lesser of 1/4 × Su or 2/3 × Sy at temperature (B31.1 §102.3.1(A)).
  // More conservative than B31.3 (which uses 1/3 × Su).
  // NOTE: Values are representative published data from ASME B31.1 Table A-1.
  //       Always verify against your licensed copy of the current edition.

  SA106_B: {
    id: "SA106_B", name: "SA-106 Gr. B — Seamless CS (Power Piping)",
    spec: "ASTM A106 / ASME B31.1 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.1"],
    stressTable: [
      // S = min(1/4 × Su, 2/3 × Sy). Su = 415 MPa → 1/4 Su = 103.4 MPa at ambient.
      // Creep-controlled above ~370 °C. Max listed temp per B31.1 Table A-1: 482 °C.
      { tempC: -29,  S_MPa: 103.4 },
      { tempC: 93,   S_MPa: 103.4 },
      { tempC: 149,  S_MPa: 103.4 },
      { tempC: 204,  S_MPa: 103.4 },
      { tempC: 260,  S_MPa: 103.4 },
      { tempC: 316,  S_MPa: 103.4 },
      { tempC: 343,  S_MPa: 103.4 },
      { tempC: 371,  S_MPa: 103.4 },
      { tempC: 399,  S_MPa: 100.7 },
      { tempC: 427,  S_MPa: 86.2  },
      { tempC: 454,  S_MPa: 66.2  },
      { tempC: 482,  S_MPa: 43.4  },
    ],
    smys: 241, smuts: 415, defaultJoint: "seamless",
    notes: "ASME SA-106 Gr. B for power piping per B31.1. Same composition as ASTM A106-B but qualified to ASME SA spec. Max listed temp 482 °C.",
  },

  SA106_C: {
    id: "SA106_C", name: "SA-106 Gr. C — Seamless CS, High-Strength (Power Piping)",
    spec: "ASTM A106 / ASME B31.1 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.1"],
    stressTable: [
      // Su = 485 MPa → 1/4 Su = 121.3 MPa. Sy = 275 MPa → 2/3 Sy = 183.3 MPa.
      // S governed by 1/4 Su at ambient.
      { tempC: -29,  S_MPa: 121.4 },
      { tempC: 93,   S_MPa: 121.4 },
      { tempC: 149,  S_MPa: 121.4 },
      { tempC: 204,  S_MPa: 121.4 },
      { tempC: 260,  S_MPa: 121.4 },
      { tempC: 316,  S_MPa: 121.4 },
      { tempC: 343,  S_MPa: 121.4 },
      { tempC: 371,  S_MPa: 117.2 },
      { tempC: 399,  S_MPa: 109.6 },
      { tempC: 427,  S_MPa: 93.8  },
      { tempC: 454,  S_MPa: 71.7  },
      { tempC: 482,  S_MPa: 47.6  },
    ],
    smys: 275, smuts: 485, defaultJoint: "seamless",
    notes: "Highest-strength A106 grade for power piping. Seamless only. Max listed temp 482 °C.",
  },

  SA335_P11: {
    id: "SA335_P11", name: "SA-335 P11 — 1.25Cr-0.5Mo Alloy (Power Piping)",
    spec: "ASTM A335 / ASME B31.1 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.1"],
    stressTable: [
      // 1.25Cr-0.5Mo ferritic alloy; excellent creep resistance to 566 °C.
      // Used for steam headers, reheater, superheater piping at intermediate temperatures.
      { tempC: -29,  S_MPa: 103.4 },
      { tempC: 93,   S_MPa: 103.4 },
      { tempC: 149,  S_MPa: 103.4 },
      { tempC: 204,  S_MPa: 103.4 },
      { tempC: 260,  S_MPa: 103.4 },
      { tempC: 316,  S_MPa: 103.4 },
      { tempC: 371,  S_MPa: 103.4 },
      { tempC: 399,  S_MPa: 103.4 },
      { tempC: 427,  S_MPa: 103.4 },
      { tempC: 454,  S_MPa: 100.0 },
      { tempC: 482,  S_MPa: 95.1  },
      { tempC: 510,  S_MPa: 86.2  },
      { tempC: 538,  S_MPa: 72.4  },
      { tempC: 566,  S_MPa: 54.5  },
      { tempC: 593,  S_MPa: 31.0  },
    ],
    smys: 207, smuts: 415, defaultJoint: "seamless",
    notes: "1.25Cr-0.5Mo ferritic alloy. Preferred for intermediate-temp steam service (400–566 °C). Requires PWHT per B31.1 §331.",
  },

  SA335_P22: {
    id: "SA335_P22", name: "SA-335 P22 — 2.25Cr-1Mo Alloy (Power Piping)",
    spec: "ASTM A335 / ASME B31.1 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.1"],
    stressTable: [
      // 2.25Cr-1Mo ferritic alloy; superior creep resistance vs P11; used to ~649 °C.
      // Main steam and hot reheat lines in conventional power plants.
      { tempC: -29,  S_MPa: 103.4 },
      { tempC: 93,   S_MPa: 103.4 },
      { tempC: 149,  S_MPa: 103.4 },
      { tempC: 204,  S_MPa: 103.4 },
      { tempC: 260,  S_MPa: 103.4 },
      { tempC: 316,  S_MPa: 103.4 },
      { tempC: 371,  S_MPa: 103.4 },
      { tempC: 427,  S_MPa: 103.4 },
      { tempC: 482,  S_MPa: 103.4 },
      { tempC: 510,  S_MPa: 103.4 },
      { tempC: 538,  S_MPa: 100.7 },
      { tempC: 566,  S_MPa: 89.6  },
      { tempC: 593,  S_MPa: 72.4  },
      { tempC: 621,  S_MPa: 48.3  },
      { tempC: 649,  S_MPa: 22.1  },
    ],
    smys: 207, smuts: 415, defaultJoint: "seamless",
    notes: "2.25Cr-1Mo ferritic alloy. Standard choice for main steam headers in conventional power plants. Requires PWHT per B31.1 §331.",
  },

  SA335_P91: {
    id: "SA335_P91", name: "SA-335 P91 — 9Cr-1Mo-V Alloy (Power Piping)",
    spec: "ASTM A335 / ASME B31.1 Table A-1",
    materialType: "ferritic",
    compatibleStandards: ["B31.1"],
    stressTable: [
      // 9Cr-1Mo-V martensitic alloy; highest strength B31.1 ferritic alloy;
      // used for supercritical/ultra-supercritical steam lines (up to ~649 °C).
      // NOTE: P91 requires very specific PWHT (730–760 °C) and hardness verification.
      // Strength decreases rapidly if PWHT not performed correctly.
      { tempC: -29,  S_MPa: 137.9 },
      { tempC: 93,   S_MPa: 137.9 },
      { tempC: 149,  S_MPa: 131.0 },
      { tempC: 204,  S_MPa: 126.2 },
      { tempC: 260,  S_MPa: 123.4 },
      { tempC: 316,  S_MPa: 121.4 },
      { tempC: 371,  S_MPa: 120.7 },
      { tempC: 399,  S_MPa: 120.7 },
      { tempC: 427,  S_MPa: 120.7 },
      { tempC: 454,  S_MPa: 120.7 },
      { tempC: 482,  S_MPa: 120.7 },
      { tempC: 510,  S_MPa: 119.3 },
      { tempC: 538,  S_MPa: 115.8 },
      { tempC: 566,  S_MPa: 102.7 },
      { tempC: 593,  S_MPa: 83.4  },
      { tempC: 621,  S_MPa: 55.2  },
      { tempC: 649,  S_MPa: 22.8  },
    ],
    smys: 415, smuts: 585, defaultJoint: "seamless",
    notes: "9Cr-1Mo-V martensitic alloy for supercritical power piping. CRITICAL: Requires strict PWHT (730–760 °C) and hardness verification. Microstructure and strength extremely sensitive to improper heat treatment.",
  },

  SA312_TP304: {
    id: "SA312_TP304", name: "SA-312 TP304 — Austenitic SS 18/8 (Power Piping)",
    spec: "ASTM A312 / ASME B31.1 Table A-1",
    materialType: "austenitic",
    compatibleStandards: ["B31.1"],
    stressTable: [
      // Austenitic SS for power piping. B31.1 allowable stresses (1/4 Su basis)
      // are lower than B31.3 (1/3 Su basis) for the same material.
      { tempC: -196, S_MPa: 115.2 },
      { tempC: 38,   S_MPa: 115.2 },
      { tempC: 93,   S_MPa: 110.3 },
      { tempC: 149,  S_MPa: 105.5 },
      { tempC: 204,  S_MPa: 101.4 },
      { tempC: 260,  S_MPa: 98.3  },
      { tempC: 316,  S_MPa: 96.5  },
      { tempC: 371,  S_MPa: 94.5  },
      { tempC: 427,  S_MPa: 92.4  },
      { tempC: 482,  S_MPa: 91.4  },
      { tempC: 538,  S_MPa: 90.3  },
      { tempC: 566,  S_MPa: 88.3  },
      { tempC: 593,  S_MPa: 84.8  },
      { tempC: 621,  S_MPa: 79.3  },
      { tempC: 649,  S_MPa: 72.4  },
      { tempC: 677,  S_MPa: 55.2  },
      { tempC: 704,  S_MPa: 38.6  },
      { tempC: 732,  S_MPa: 24.1  },
      { tempC: 760,  S_MPa: 14.5  },
    ],
    smys: 207, smuts: 515, defaultJoint: "seamless",
    notes: "SA-312 TP304 for power piping per B31.1. Lower allowable stress than B31.3 Table A-1 for same material (1/4 vs 1/3 of Su). Sensitisation risk > 425 °C unless stabilised grade used.",
  },

  SA312_TP316: {
    id: "SA312_TP316", name: "SA-312 TP316 — Austenitic SS 18/8/2Mo (Power Piping)",
    spec: "ASTM A312 / ASME B31.1 Table A-1",
    materialType: "austenitic",
    compatibleStandards: ["B31.1"],
    stressTable: [
      // Mo addition improves pitting/crevice corrosion resistance vs TP304.
      // B31.1 stress basis: 1/4 Su.
      { tempC: -196, S_MPa: 115.2 },
      { tempC: 38,   S_MPa: 115.2 },
      { tempC: 93,   S_MPa: 113.1 },
      { tempC: 149,  S_MPa: 110.3 },
      { tempC: 204,  S_MPa: 108.3 },
      { tempC: 260,  S_MPa: 106.9 },
      { tempC: 316,  S_MPa: 105.5 },
      { tempC: 371,  S_MPa: 104.8 },
      { tempC: 427,  S_MPa: 104.1 },
      { tempC: 482,  S_MPa: 103.8 },
      { tempC: 538,  S_MPa: 103.8 },
      { tempC: 566,  S_MPa: 103.1 },
      { tempC: 593,  S_MPa: 100.7 },
      { tempC: 621,  S_MPa: 96.2  },
      { tempC: 649,  S_MPa: 86.9  },
      { tempC: 677,  S_MPa: 69.7  },
      { tempC: 704,  S_MPa: 49.7  },
      { tempC: 732,  S_MPa: 31.4  },
    ],
    smys: 207, smuts: 515, defaultJoint: "seamless",
    notes: "SA-312 TP316 for power piping per B31.1. Mo content improves corrosion resistance. Better choice than TP304 for chloride-containing steam condensate service.",
  },

  // ── End B31.1 Materials ───────────────────────────────────────────────────────

  API5L_B: {
    id: "API5L_B", name: "API 5L Grade B",
    spec: "API 5L:2018 / ASME B31.4 / B31.8",
    materialType: "pipeline",
    compatibleStandards: ["B31.4", "B31.8"],
    stressTable: [],
    smys: 241, smuts: 414, defaultJoint: "erw",
    notes: "SMYS=241 MPa, SMUTS=414 MPa. Used with B31.4/B31.8 design factor F.",
  },

  API5L_X42: {
    id: "API5L_X42", name: "API 5L Grade X42",
    spec: "API 5L:2018 / ASME B31.4 / B31.8",
    materialType: "pipeline",
    compatibleStandards: ["B31.4", "B31.8"],
    stressTable: [],
    smys: 290, smuts: 414, defaultJoint: "erw",
    notes: "SMYS=290 MPa, SMUTS=414 MPa.",
  },

  API5L_X52: {
    id: "API5L_X52", name: "API 5L Grade X52",
    spec: "API 5L:2018 / ASME B31.4 / B31.8",
    materialType: "pipeline",
    compatibleStandards: ["B31.4", "B31.8"],
    stressTable: [],
    smys: 358, smuts: 455, defaultJoint: "erw",
    notes: "SMYS=358 MPa, SMUTS=455 MPa.",
  },

  API5L_X60: {
    id: "API5L_X60", name: "API 5L Grade X60",
    spec: "API 5L:2018 / ASME B31.4 / B31.8",
    materialType: "pipeline",
    compatibleStandards: ["B31.4", "B31.8"],
    stressTable: [],
    smys: 414, smuts: 517, defaultJoint: "erw",
    notes: "SMYS=414 MPa, SMUTS=517 MPa.",
  },

  API5L_X65: {
    id: "API5L_X65", name: "API 5L Grade X65",
    spec: "API 5L:2018 / ASME B31.4 / B31.8",
    materialType: "pipeline",
    compatibleStandards: ["B31.4", "B31.8"],
    stressTable: [],
    smys: 448, smuts: 531, defaultJoint: "erw",
    notes: "SMYS=448 MPa, SMUTS=531 MPa.",
  },

  API5L_X70: {
    id: "API5L_X70", name: "API 5L Grade X70",
    spec: "API 5L:2018 / ASME B31.4 / B31.8",
    materialType: "pipeline",
    compatibleStandards: ["B31.4", "B31.8"],
    stressTable: [],
    smys: 483, smuts: 565, defaultJoint: "erw",
    notes: "SMYS=483 MPa, SMUTS=565 MPa. Requires controlled rolling.",
  },

  API5L_X80: {
    id: "API5L_X80", name: "API 5L Grade X80",
    spec: "API 5L:2018 / ASME B31.4 / B31.8",
    materialType: "pipeline",
    compatibleStandards: ["B31.4", "B31.8"],
    stressTable: [],
    smys: 552, smuts: 621, defaultJoint: "erw",
    notes: "SMYS=552 MPa, SMUTS=621 MPa. High-strength, requires special welding procedure.",
  },
};

// ─── ASME B36.10M:2018 Pipe Schedule Data ────────────────────────────────────

/**
 * Outside diameters and wall thicknesses per ASME B36.10M:2018 (wrought steel)
 * and ASME B36.19M:2018 (stainless steel, 5S/10S/40S/80S schedules).
 *
 * Notes:
 * - For NPS ≤ 10": Sch 40 ≡ Standard (Std); Sch 80 ≡ Extra Strong (XS)
 * - For NPS 12": Std = 9.53 mm ≠ Sch 40 = 10.31 mm; XS = 12.70 mm ≠ Sch 80 = 17.48 mm
 * - For NPS ≥ 14": Std and XS labels are distinct from schedule numbers
 * - Wall thicknesses [mm]; OD [mm].
 * - Values verified against published B36.10M-2018 tables.
 */
export const NPS_DATA: NpsEntry[] = [
  {
    nps: '1/2"', odMm: 21.3,
    schedules: [
      { schedule: "Sch 40 (Std)",  wallMm: 2.77 },
      { schedule: "Sch 80 (XS)",   wallMm: 3.73 },
      { schedule: "XXS",            wallMm: 7.47 },
    ],
  },
  {
    nps: '3/4"', odMm: 26.7,
    schedules: [
      { schedule: "Sch 40 (Std)",  wallMm: 2.87 },
      { schedule: "Sch 80 (XS)",   wallMm: 3.91 },
      { schedule: "XXS",            wallMm: 7.82 },
    ],
  },
  {
    nps: '1"', odMm: 33.4,
    schedules: [
      { schedule: "Sch 40 (Std)",  wallMm: 3.38 },
      { schedule: "Sch 80 (XS)",   wallMm: 4.55 },
      { schedule: "Sch 160",        wallMm: 6.35 },
      { schedule: "XXS",            wallMm: 9.09 },
    ],
  },
  {
    nps: '1-1/4"', odMm: 42.2,
    // ASME B36.10M-2018: NPS 1-1/4" (DN 32), OD = 42.2 mm
    schedules: [
      { schedule: "Sch 40 (Std)",  wallMm: 3.56 },
      { schedule: "Sch 80 (XS)",   wallMm: 4.85 },
      { schedule: "Sch 160",        wallMm: 6.35 },
      { schedule: "XXS",            wallMm: 9.70 },
    ],
  },
  {
    nps: '1-1/2"', odMm: 48.3,
    schedules: [
      { schedule: "Sch 40 (Std)",  wallMm: 3.68 },
      { schedule: "Sch 80 (XS)",   wallMm: 5.08 },
      { schedule: "Sch 160",        wallMm: 7.14 },
      { schedule: "XXS",            wallMm: 10.16 },
    ],
  },
  {
    nps: '2"', odMm: 60.3,
    schedules: [
      { schedule: "Sch 10",         wallMm: 2.77 },
      { schedule: "Sch 40 (Std)",  wallMm: 3.91 },
      { schedule: "Sch 80 (XS)",   wallMm: 5.54 },
      { schedule: "Sch 160",        wallMm: 8.74 },
      { schedule: "XXS",            wallMm: 11.07 },
    ],
  },
  {
    nps: '2-1/2"', odMm: 73.0,
    schedules: [
      { schedule: "Sch 10",         wallMm: 3.05 },
      { schedule: "Sch 40 (Std)",  wallMm: 5.16 },
      { schedule: "Sch 80 (XS)",   wallMm: 7.01 },
      { schedule: "Sch 160",        wallMm: 9.53 },
      { schedule: "XXS",            wallMm: 14.02 },
    ],
  },
  {
    nps: '3"', odMm: 88.9,
    schedules: [
      { schedule: "Sch 10",         wallMm: 3.05 },
      { schedule: "Sch 40 (Std)",  wallMm: 5.49 },
      { schedule: "Sch 80 (XS)",   wallMm: 7.62 },
      { schedule: "Sch 160",        wallMm: 11.13 },
      { schedule: "XXS",            wallMm: 15.24 },
    ],
  },
  {
    nps: '3-1/2"', odMm: 101.6,
    // ASME B36.10M-2018: NPS 3-1/2" (DN 90), OD = 101.6 mm
    schedules: [
      { schedule: "Sch 40 (Std)",  wallMm: 5.74 },
      { schedule: "Sch 80 (XS)",   wallMm: 8.08 },
    ],
  },
  {
    nps: '4"', odMm: 114.3,
    schedules: [
      { schedule: "Sch 10",         wallMm: 3.05 },
      { schedule: "Sch 20",         wallMm: 3.56 },
      { schedule: "Sch 30",         wallMm: 4.78 },
      { schedule: "Sch 40 (Std)",  wallMm: 6.02 },
      { schedule: "Sch 60",         wallMm: 7.14 },
      { schedule: "Sch 80 (XS)",   wallMm: 8.56 },
      { schedule: "Sch 120",        wallMm: 11.13 },
      { schedule: "Sch 160",        wallMm: 13.49 },
      { schedule: "XXS",            wallMm: 17.12 },
    ],
  },
  {
    nps: '5"', odMm: 141.3,
    // ASME B36.10M-2018: NPS 5" (DN 125), OD = 141.3 mm
    schedules: [
      { schedule: "Sch 10",         wallMm: 3.40 },
      { schedule: "Sch 20",         wallMm: 3.96 },
      { schedule: "Sch 40 (Std)",  wallMm: 6.55 },
      { schedule: "Sch 80 (XS)",   wallMm: 9.53 },
      { schedule: "Sch 120",        wallMm: 12.70 },
      { schedule: "Sch 160",        wallMm: 15.88 },
      { schedule: "XXS",            wallMm: 19.05 },
    ],
  },
  {
    nps: '6"', odMm: 168.3,
    schedules: [
      { schedule: "Sch 10",         wallMm: 3.40 },
      { schedule: "Sch 20",         wallMm: 3.96 },
      { schedule: "Sch 30",         wallMm: 5.56 },
      { schedule: "Sch 40 (Std)",  wallMm: 7.11 },
      { schedule: "Sch 60",         wallMm: 8.71 },
      { schedule: "Sch 80 (XS)",   wallMm: 10.97 },
      { schedule: "Sch 120",        wallMm: 14.27 },
      { schedule: "Sch 160",        wallMm: 18.26 },
      { schedule: "XXS",            wallMm: 21.95 },
    ],
  },
  {
    nps: '8"', odMm: 219.1,
    schedules: [
      { schedule: "Sch 10",         wallMm: 3.76 },
      { schedule: "Sch 20",         wallMm: 6.35 },
      { schedule: "Sch 30",         wallMm: 7.04 },
      { schedule: "Sch 40 (Std)",  wallMm: 8.18 },
      { schedule: "Sch 60",         wallMm: 10.31 },
      { schedule: "Sch 80 (XS)",   wallMm: 12.70 },
      { schedule: "Sch 100",        wallMm: 15.09 },
      { schedule: "Sch 120",        wallMm: 17.48 },
      { schedule: "Sch 140",        wallMm: 20.62 },
      { schedule: "Sch 160",        wallMm: 22.23 },
    ],
  },
  {
    nps: '10"', odMm: 273.1,
    schedules: [
      { schedule: "Sch 10",         wallMm: 4.19 },
      { schedule: "Sch 20",         wallMm: 6.35 },
      { schedule: "Sch 30",         wallMm: 7.80 },
      { schedule: "Sch 40 (Std)",  wallMm: 9.27 },
      { schedule: "Sch 60",         wallMm: 12.70 },
      { schedule: "Sch 80 (XS)",   wallMm: 15.09 },
      { schedule: "Sch 100",        wallMm: 18.26 },
      { schedule: "Sch 120",        wallMm: 21.44 },
      { schedule: "Sch 140",        wallMm: 25.40 },
      { schedule: "Sch 160",        wallMm: 28.58 },
    ],
  },
  {
    nps: '12"', odMm: 323.9,
    schedules: [
      { schedule: "Sch 10",         wallMm: 4.57 },
      { schedule: "Sch 20",         wallMm: 6.35 },
      { schedule: "Sch 30",         wallMm: 8.38 },
      { schedule: "Std",            wallMm: 9.53 },
      { schedule: "Sch 40",         wallMm: 10.31 },
      { schedule: "Sch 60",         wallMm: 14.27 },
      { schedule: "XS",             wallMm: 12.70 },
      { schedule: "Sch 80",         wallMm: 17.48 },
      { schedule: "Sch 100",        wallMm: 21.44 },
      { schedule: "Sch 120",        wallMm: 25.40 },
      { schedule: "Sch 140",        wallMm: 28.58 },
      { schedule: "Sch 160",        wallMm: 33.32 },
    ],
  },
  {
    nps: '14"', odMm: 355.6,
    schedules: [
      { schedule: "Sch 10",         wallMm: 6.35 },
      { schedule: "Sch 20",         wallMm: 7.92 },
      { schedule: "Std",            wallMm: 9.53 },
      { schedule: "Sch 30",         wallMm: 9.53 },
      { schedule: "Sch 40",         wallMm: 11.13 },
      { schedule: "XS / Sch 60",    wallMm: 12.70 },
      { schedule: "Sch 80",         wallMm: 15.09 },
      { schedule: "Sch 100",        wallMm: 19.05 },
      { schedule: "Sch 120",        wallMm: 23.83 },
      { schedule: "Sch 140",        wallMm: 27.79 },
      { schedule: "Sch 160",        wallMm: 31.75 },
    ],
  },
  {
    nps: '16"', odMm: 406.4,
    schedules: [
      { schedule: "Sch 10",         wallMm: 6.35 },
      { schedule: "Sch 20",         wallMm: 7.92 },
      { schedule: "Std",            wallMm: 9.53 },
      { schedule: "Sch 30",         wallMm: 9.53 },
      { schedule: "Sch 40",         wallMm: 12.70 },
      { schedule: "XS",             wallMm: 12.70 },
      { schedule: "Sch 60",         wallMm: 14.27 },
      { schedule: "Sch 80",         wallMm: 16.66 },
      { schedule: "Sch 100",        wallMm: 21.44 },
      { schedule: "Sch 120",        wallMm: 26.19 },
      { schedule: "Sch 140",        wallMm: 30.96 },
      { schedule: "Sch 160",        wallMm: 36.53 },
    ],
  },
  {
    nps: '18"', odMm: 457.2,
    schedules: [
      { schedule: "Sch 10",         wallMm: 6.35 },
      { schedule: "Sch 20",         wallMm: 7.92 },
      { schedule: "Std",            wallMm: 9.53 },
      { schedule: "Sch 40",         wallMm: 11.13 },
      { schedule: "XS",             wallMm: 12.70 },
      { schedule: "Sch 60",         wallMm: 14.27 },
      { schedule: "Sch 80",         wallMm: 19.05 },
      { schedule: "Sch 100",        wallMm: 23.83 },
      { schedule: "Sch 120",        wallMm: 29.36 },
      { schedule: "Sch 140",        wallMm: 34.93 },
      { schedule: "Sch 160",        wallMm: 39.67 },
    ],
  },
  {
    nps: '20"', odMm: 508.0,
    schedules: [
      { schedule: "Sch 10",         wallMm: 6.35 },
      { schedule: "Sch 20",         wallMm: 9.53 },
      { schedule: "Std",            wallMm: 9.53 },
      { schedule: "Sch 30",         wallMm: 12.70 },
      { schedule: "XS",             wallMm: 12.70 },
      { schedule: "Sch 40",         wallMm: 15.09 },
      { schedule: "Sch 60",         wallMm: 20.62 },
      { schedule: "Sch 80",         wallMm: 26.19 },
      { schedule: "Sch 100",        wallMm: 32.54 },
      { schedule: "Sch 120",        wallMm: 38.10 },
      { schedule: "Sch 140",        wallMm: 44.45 },
      { schedule: "Sch 160",        wallMm: 50.01 },
    ],
  },
  {
    nps: '24"', odMm: 609.6,
    schedules: [
      { schedule: "Sch 10",         wallMm: 6.35 },
      { schedule: "Sch 20",         wallMm: 9.53 },
      { schedule: "Std",            wallMm: 9.53 },
      { schedule: "Sch 30",         wallMm: 14.27 },
      { schedule: "XS",             wallMm: 12.70 },
      { schedule: "Sch 40",         wallMm: 17.48 },
      { schedule: "Sch 60",         wallMm: 24.61 },
      { schedule: "Sch 80",         wallMm: 30.96 },
      { schedule: "Sch 100",        wallMm: 38.89 },
      { schedule: "Sch 120",        wallMm: 46.02 },
      { schedule: "Sch 140",        wallMm: 53.98 },
      { schedule: "Sch 160",        wallMm: 59.54 },
    ],
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Interpolate allowable stress from B31.3 Table A-1 at given temperature.
 * Clamps to the last listed temperature at high end; returns NaN if below minimum.
 */
function interpolateAllowableStress(stressTable: Array<{ tempC: number; S_MPa: number }>, tempC: number): number {
  if (stressTable.length === 0) return 0;
  const sorted = [...stressTable].sort((a, b) => a.tempC - b.tempC);
  const minT = sorted[0].tempC;
  const maxT = sorted[sorted.length - 1].tempC;

  if (tempC < minT) return sorted[0].S_MPa; // conservative — flag separately
  if (tempC >= maxT) return sorted[sorted.length - 1].S_MPa; // at or above max listed

  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (tempC >= lo.tempC && tempC <= hi.tempC) {
      const frac = (tempC - lo.tempC) / (hi.tempC - lo.tempC);
      return lo.S_MPa + frac * (hi.S_MPa - lo.S_MPa);
    }
  }
  return sorted[sorted.length - 1].S_MPa;
}

/**
 * Y coefficient per ASME B31.3:2022 Table 304.1.1.
 * Depends on material type and design temperature.
 */
function yCoefficient(materialType: MaterialType, tempC: number): number {
  if (materialType === "austenitic") {
    // ASME B31.3 Table 304.1.1 — Austenitic stainless steel
    return tempC > 566 ? 0.5 : 0.4;
  }
  // ASME B31.3 Table 304.1.1 — Ferritic / carbon steel
  // Table boundary interpretation: use the Y value from the highest listed temperature
  // that does NOT exceed the design temperature (step-function, most conservative).
  //   ≤ 482 °C → 0.4  |  ≤ 510 °C → 0.5  |  ≤ 565 °C → 0.6  |  ≥ 566 °C → 0.7
  // Note: B31.3 Table 304.1.1 lists 566 °C (1050 °F) as the boundary for Y=0.7.
  // Temperatures from 539–565 °C use Y=0.6 (last row not exceeding design temp).
  if (tempC <= 482) return 0.4;
  if (tempC <= 510) return 0.5;
  if (tempC < 566)  return 0.6; // 510 < T < 566 °C → use 538 °C row (Y=0.6)
  return 0.7; // T ≥ 566 °C (= 1050 °F); also 0.7 at 593 °C+ per table
}

/**
 * Temperature derating factor T per:
 *   ASME B31.4 Table 403.2.1-1 / B31.8 Table 841.1.8-1
 *   (identical in both standards)
 */
function tempDerating(tempC: number): number {
  if (tempC <= 121) return 1.000;
  if (tempC <= 149) return 0.967;
  if (tempC <= 177) return 0.933;
  if (tempC <= 204) return 0.900;
  if (tempC <= 232) return 0.867;
  return 0.867; // flag separately; table ends at 232 °C
}

// ─── Core Calculation Engine ──────────────────────────────────────────────────

/**
 * Main calculation function.
 * Implements:
 *   B31.1 §104.1.2(A): t = P·D / (2·(S·E + P·Y))   [W ≡ 1.0 in B31.1]
 *   B31.3 §304.1.2:    t = P·D / (2·(S·E·W + P·Y))
 *   B31.4 §403.2.1 / B31.8 §841.11: t = P·D / (2·S·F·E·T)
 *
 * All inputs in SI (mm, bar, °C).
 * All results in SI (mm, MPa, bar).
 */
export function calculatePipeWT(input: PipeWTInput): PipeWTResult {
  const steps:           CalcStep[]     = [];
  const flags:           PipeWTFlag[]   = [];
  const warnings:        string[]       = [];
  const recommendations: string[]       = [];

  const std   = input.pipingStandard;
  const D     = input.outerDiameter;             // [mm]
  const P_bar = input.designPressure;            // gauge [bar(g)]
  const P_MPa = P_bar / 10;                      // [MPa(g)]  (1 bar = 0.1 MPa)
  const T_des = input.designTemperature;         // [°C]
  const MT    = input.millTolerance / 100;       // fraction, e.g. 0.125

  const isB31x = std === "B31.1" || std === "B31.3"; // standards using S·E·(W) formula

  if (D <= 0)     throw new Error("Outside diameter must be positive");
  if (P_bar < 0)  throw new Error("Design pressure must be ≥ 0");
  if (MT < 0 || MT >= 1) throw new Error("Mill tolerance must be 0–99%");

  // ── Material ──
  const mat   = MATERIAL_DB[input.materialId];
  const matType: MaterialType = mat ? mat.materialType : input.userMaterialType;

  // ── Allowable Stress S ──
  let S_eff = 0;
  if (input.materialId === "user") {
    S_eff = isB31x ? input.userS_MPa : input.userSmys;
  } else if (mat) {
    if (isB31x) {
      // B31.1 and B31.3 both use temperature-interpolated allowable stress table
      const tableRef = std === "B31.1" ? "ASME B31.1 Table A-1" : "ASME B31.3 Table A-1";
      if (mat.stressTable.length > 0) {
        S_eff = interpolateAllowableStress(mat.stressTable, T_des);
        const tempsSorted = [...mat.stressTable].sort((a, b) => a.tempC - b.tempC);
        const minT = tempsSorted[0].tempC;
        const maxT = tempsSorted[tempsSorted.length - 1].tempC;
        if (T_des > maxT) {
          flags.push("MATERIAL_TEMP_LIMIT");
          warnings.push(`Temperature ${T_des} °C exceeds the highest listed temperature (${maxT} °C) in ${tableRef} for ${mat.name}. S taken at ${maxT} °C — verify material rating.`);
        } else if (T_des < minT) {
          flags.push("LOW_TEMP_CLAMPED");
          const codeClause = std === "B31.1"
            ? "ASME B31.1 §123.2.2"
            : "ASME B31.3 §323.2.2 and Table 323.2.2A";
          warnings.push(`Design temperature ${T_des} °C is below the lowest listed temperature (${minT} °C) in ${tableRef} for ${mat.name}. Allowable stress clamped to S = ${tempsSorted[0].S_MPa} MPa at ${minT} °C (conservative). Verify MDMT and impact test requirements per ${codeClause}.`);
        }
      } else {
        // Pipeline grade used with B31.3 / B31.1 — estimate
        S_eff = mat.smys * (2 / 3);
        warnings.push(`${mat.name} is a pipeline grade; allowable stress estimated as 2/3×SMYS = ${S_eff.toFixed(0)} MPa. Verify with ${std === "B31.1" ? "ASME B31.1 Table A-1" : "ASME B31.3 Table A-1"} for the applicable specification.`);
      }
    } else {
      // B31.4 / B31.8 — use SMYS directly with design factor F
      S_eff = mat.smys;
    }
  } else {
    throw new Error("Unknown material ID and no user-defined stress provided");
  }

  if (S_eff <= 0) throw new Error("Allowable stress must be positive");

  // ── Quality Factor E ──
  // B31.1 uses ASME B31.1 Table 132.4 values (QUALITY_FACTORS_POWER).
  // B31.3 uses ASME B31.3 Table A-1B values (QUALITY_FACTORS).
  // B31.4/B31.8 use separate joint factor table (QUALITY_FACTORS_PIPELINE).
  // ERW: B31.3=0.85, B31.4/B31.8 PSL1=0.80, B31.1=0.85 — NOT interchangeable.
  const qTable = std === "B31.1" ? QUALITY_FACTORS_POWER
               : std === "B31.3" ? QUALITY_FACTORS
               : QUALITY_FACTORS_PIPELINE;
  const E_eff = input.jointType === "user"
    ? input.userE
    : (qTable[input.jointType]?.E ?? 1.0);

  // ── Y coefficient (B31.1 Table 104.1.2(A) / B31.3 Table 304.1.1 — same values) ──
  const Y_eff = yCoefficient(matType, T_des);

  // ── W factor ──
  // B31.3 Table 302.3.5: W = 1.0 for T ≤ 510 °C; flag if T > 510 °C.
  // B31.1: W factor is NOT defined — it does not appear in B31.1 §104.1.2(A).
  //        W ≡ 1.0 always for B31.1. No W warning needed.
  let W_eff = 1.0;
  if (std === "B31.3" && T_des > 510) {
    flags.push("W_FACTOR_WARNING");
    warnings.push(`Design temperature ${T_des} °C > 510 °C — weld joint strength reduction factor W may be < 1.0 per ASME B31.3 Table 302.3.5. W = 1.0 assumed; verify for long-seam welds in creep service.`);
  }

  // ── Temperature derating T (B31.4/B31.8) ──
  const T_derating = tempDerating(T_des);
  if (T_des > 232 && !isB31x) {
    flags.push("TEMP_ABOVE_DERATING_TABLE");
    warnings.push(`Design temperature ${T_des} °C exceeds 232 °C — the B31.4/B31.8 temperature derating table ends at 232 °C (last tabulated T = 0.867). The table value at 232 °C has been applied; however, operating a liquid or gas pipeline above 232 °C is unusual. Verify material suitability, confirm with the applicable code, and consider switching to ASME B31.3 for plant piping above this temperature.`);
  }

  // ── Design Factor F (B31.4/B31.8) ──
  let F_eff = 0.72; // B31.4 default
  if (std === "B31.8") {
    F_eff = input.userDesignFactor ?? B318_LOCATION_CLASS[input.locationClass]?.F ?? 0.72;
  } else if (std === "B31.4") {
    F_eff = input.userDesignFactor ?? 0.72;
  }

  // ── User-Override Active ──
  const isUserOverride = input.materialId === "user" || input.jointType === "user" || input.userDesignFactor !== null;
  if (isUserOverride) {
    flags.push("USER_OVERRIDE_ACTIVE");
    const parts: string[] = [];
    if (input.materialId === "user") parts.push(`user-defined S = ${isB31x ? input.userS_MPa : input.userSmys} MPa`);
    if (input.jointType === "user") parts.push(`user-defined E = ${input.userE}`);
    if (input.userDesignFactor !== null) parts.push(`user-defined F = ${input.userDesignFactor}`);
    const tableRef = std === "B31.1" ? "ASME B31.1 Table A-1" : "ASME B31.3 Table A-1, API 5L, etc.";
    warnings.push(`USER OVERRIDE ACTIVE: ${parts.join(", ")}. User-supplied values bypass the built-in material database and standard lookup tables. Ensure these values are traceable to a recognised standard (${tableRef}) and documented in the design record.`);
  }

  // ── Mechanical Allowances c ──
  const c = input.corrosionAllowance + input.erosionAllowance + input.threadGrooveAllowance;

  // ── Header trace: inputs ──
  const pressureRef = std === "B31.1" ? "ASME B31.1 §101" : "ASME B31.3 §301";
  const allowRef    = std === "B31.1" ? "ASME B31.1 §104.1.1" : "ASME B31.3 §304.1.1";
  steps.push({ label: "Design pressure P",    equation: "",                    value: `${P_bar.toFixed(2)} bar(g) = ${P_MPa.toFixed(4)} MPa(g)`, unit: "", ref: pressureRef });
  steps.push({ label: "Outside diameter D",   equation: "",                    value: D.toFixed(2), unit: "mm", ref: "ASME B36.10M" });
  steps.push({ label: "Design temperature T", equation: "",                    value: T_des.toFixed(1), unit: "°C", ref: "" });
  if (std === "B31.1") {
    steps.push({ label: "Allowable stress S", equation: "Table A-1 interpolated", value: S_eff.toFixed(2), unit: "MPa", ref: "ASME B31.1 Table A-1" });
    steps.push({ label: "Quality factor E",   equation: "",                    value: E_eff.toFixed(2), unit: "—", ref: input.jointType === "user" ? "User-defined" : (QUALITY_FACTORS_POWER[input.jointType]?.std ?? "ASME B31.1 Table 132.4") });
    steps.push({ label: "Y coefficient",      equation: `Table 104.1.2(A) (${matType})`, value: Y_eff.toFixed(1), unit: "—", ref: "ASME B31.1 Table 104.1.2(A)" });
    steps.push({ label: "W factor",           equation: "Not applicable (B31.1)", value: "1.0", unit: "—", ref: "ASME B31.1 §104.1.2(A)" });
  } else if (std === "B31.3") {
    steps.push({ label: "Allowable stress S", equation: "Table A-1 interpolated", value: S_eff.toFixed(2), unit: "MPa", ref: "ASME B31.3 Table A-1" });
    steps.push({ label: "Quality factor E",   equation: "",                    value: E_eff.toFixed(2), unit: "—", ref: input.jointType === "user" ? "User-defined" : (QUALITY_FACTORS[input.jointType]?.std ?? "ASME B31.3 Table A-1B") });
    steps.push({ label: "Y coefficient",      equation: `Table 304.1.1 (${matType})`, value: Y_eff.toFixed(1), unit: "—", ref: "ASME B31.3 Table 304.1.1" });
    steps.push({ label: "W factor",           equation: "Table 302.3.5",       value: W_eff.toFixed(1), unit: "—", ref: "ASME B31.3 Table 302.3.5" });
  } else {
    steps.push({ label: "SMYS",              equation: "API 5L Table B.2",     value: S_eff.toFixed(0), unit: "MPa", ref: "API 5L:2018" });
    steps.push({ label: "Quality factor E",  equation: "",                     value: E_eff.toFixed(2), unit: "—", ref: input.jointType === "user" ? "User-defined" : (QUALITY_FACTORS_PIPELINE[input.jointType]?.std ?? (std === "B31.4" ? "ASME B31.4 Table 403.2.1-1" : "ASME B31.8 §841.11")) });
    steps.push({ label: "Design factor F",   equation: "",                     value: F_eff.toFixed(2), unit: "—", ref: std === "B31.4" ? "ASME B31.4 §403.2.1" : "ASME B31.8 Table 841.114A" });
    steps.push({ label: "Temp derating T",   equation: "",                     value: T_derating.toFixed(3), unit: "—", ref: std === "B31.4" ? "ASME B31.4 Table 403.2.1-1" : "ASME B31.8 Table 841.1.8-1" });
  }
  steps.push({ label: "Mech. allowance c",  equation: "c = c_corr + c_eros + c_thread", value: `${c.toFixed(2)} (${input.corrosionAllowance.toFixed(2)} + ${input.erosionAllowance.toFixed(2)} + ${input.threadGrooveAllowance.toFixed(2)})`, unit: "mm", ref: allowRef });
  steps.push({ label: "Mill tolerance MT",  equation: "",                     value: `${input.millTolerance.toFixed(1)}%`, unit: "", ref: "ASTM A106 / API 5L §9.10" });

  // ── Pressure design thickness ──
  let t_pressure = 0;
  let t_lame     = 0;
  let isThickWall = false;

  if (std === "B31.1") {
    // B31.1 §104.1.2(A): t = P·D / (2·(S·E + P·Y))  [W not in B31.1, W ≡ 1.0]
    const SE = S_eff * E_eff; // W ≡ 1.0
    const denom = 2 * (SE + P_MPa * Y_eff);
    if (denom <= 0) throw new Error("Denominator (2·(S·E + P·Y)) ≤ 0 — check inputs");
    t_pressure = (P_MPa * D) / denom;

    steps.push({
      label: "t_p (thin-wall)",
      equation: "t_p = P·D / (2·(S·E + P·Y))  [B31.1 §104.1.2(A)]",
      value: t_pressure.toFixed(3),
      unit: "mm",
      ref: "ASME B31.1 §104.1.2(A)",
    });

    // B31.1 §104.1.2(B): Lamé check for thick-wall (t ≥ D/6 or P/SE ≥ 0.385)
    const p_frac = SE > 0 ? P_MPa / SE : 0;
    if (t_pressure >= D / 6 || p_frac >= 0.385) {
      isThickWall = true;
      flags.push("THICK_WALL");
      const ratio = (SE + P_MPa) / (SE - P_MPa);
      t_lame = (D / 2) * (Math.sqrt(Math.max(ratio, 0)) - 1);
      steps.push({
        label: "t_p (Lamé, thick-wall)",
        equation: "t_p = D/2 · (√((S·E+P)/(S·E−P)) − 1)  [B31.1 §104.1.2(B)]",
        value: t_lame.toFixed(3),
        unit: "mm",
        ref: "ASME B31.1 §104.1.2(B) — thick-wall regime",
      });
      warnings.push(`Thick-wall condition: t/D = ${(t_pressure/D).toFixed(4)} ≥ 1/6 or P/(S·E) = ${p_frac.toFixed(4)} ≥ 0.385. Lamé formula applied per ASME B31.1 §104.1.2(B).`);
      t_pressure = t_lame;
    }
  } else if (std === "B31.3") {
    const denom = 2 * (S_eff * E_eff * W_eff + P_MPa * Y_eff);
    if (denom <= 0) throw new Error("Denominator (2·(S·E·W + P·Y)) ≤ 0 — check inputs");
    t_pressure = (P_MPa * D) / denom;

    steps.push({
      label: "t_p (thin-wall)",
      equation: "t_p = P·D / (2·(S·E·W + P·Y))",
      value: t_pressure.toFixed(3),
      unit: "mm",
      ref: "ASME B31.3 §304.1.2",
    });

    // Thick-wall check (B31.3 §304.1.2(c)): if t ≥ D/6  OR  P/(S·E·W) ≥ 0.385
    const SEW    = S_eff * E_eff * W_eff;
    const p_frac = SEW > 0 ? P_MPa / SEW : 0;
    if (t_pressure >= D / 6 || p_frac >= 0.385) {
      isThickWall = true;
      flags.push("THICK_WALL");
      const ratio = (SEW + P_MPa) / (SEW - P_MPa);
      t_lame = (D / 2) * (Math.sqrt(Math.max(ratio, 0)) - 1);
      steps.push({
        label: "t_p (Lamé, thick-wall)",
        equation: "t_p = D/2 · (√((S·E·W+P)/(S·E·W−P)) − 1)",
        value: t_lame.toFixed(3),
        unit: "mm",
        ref: "ASME B31.3 §304.1.2(c) — thick-wall regime",
      });
      warnings.push(`Thick-wall condition: t/D = ${(t_pressure/D).toFixed(4)} ≥ 1/6 or P/(S·E·W) = ${p_frac.toFixed(4)} ≥ 0.385. Lamé formula applied per ASME B31.3 §304.1.2(c).`);
      t_pressure = t_lame; // use Lamé result for thick-wall
    }
  } else {
    // B31.4 §403.2.1 or B31.8 §841.11: t = P·D / (2·S·F·E·T)
    const denom = 2 * S_eff * F_eff * E_eff * T_derating;
    if (denom <= 0) throw new Error("Denominator (2·S·F·E·T) ≤ 0 — check inputs");
    t_pressure = (P_MPa * D) / denom;

    steps.push({
      label: "t_p (pressure design)",
      equation: std === "B31.4"
        ? "t_p = P·D / (2·S·F·E·T)  [B31.4 §403.2.1]"
        : "t_p = P·D / (2·S·F·E·T)  [B31.8 §841.11]",
      value: t_pressure.toFixed(3),
      unit: "mm",
      ref: std === "B31.4" ? "ASME B31.4 §403.2.1" : "ASME B31.8 §841.11",
    });
  }

  if (P_bar < 1) {
    flags.push("LOW_DP");
    warnings.push(`Design pressure is very low (${P_bar.toFixed(2)} bar(g)) — minimum wall thickness may be governed by structural/mechanical requirements, not pressure containment. Verify minimum wall per applicable piping class.`);
  }

  if (T_des > 480) {
    flags.push("HIGH_TEMPERATURE");
    warnings.push(`Design temperature ${T_des} °C is in or near the creep range. Creep, relaxation, and long-term behaviour must be assessed. Verify S is from creep-controlled portion of Table A-1.`);
  }
  if (T_des < -45) {
    flags.push("LOW_TEMPERATURE");
    warnings.push(`Design temperature ${T_des} °C is below -45 °C. Impact testing is required per ASME B31.3 §323.2.2. Verify material impact qualification temperature.`);
  }

  // ── Corrosion dominance check ──
  const t_total = t_pressure + c;
  if (c > 0 && c >= t_pressure) {
    flags.push("CORROSION_DOMINANT");
    warnings.push(`Mechanical allowance c = ${c.toFixed(2)} mm ≥ t_pressure = ${t_pressure.toFixed(3)} mm. Total thickness is dominated by allowances rather than pressure. Review corrosion rate and design life.`);
  }

  steps.push({
    label: "c total (allowances)",
    equation: "c = corrosion + erosion + thread",
    value: c.toFixed(3),
    unit: "mm",
    ref: "ASME B31.3 §304.1.1",
  });
  steps.push({
    label: "t_required = t_p + c",
    equation: "t_req = t_p + c",
    value: t_total.toFixed(3),
    unit: "mm",
    ref: "ASME B31.3 §304.1.1",
  });

  // ── Required nominal wall (mill tolerance) ──
  const t_nom_req = MT < 1 ? t_total / (1 - MT) : t_total;
  steps.push({
    label: `t_nom_required (at MT=${input.millTolerance}%)`,
    equation: "t_nom_req = t_req / (1 − MT/100)",
    value: t_nom_req.toFixed(3),
    unit: "mm",
    ref: "API 5L §9.10 / ASTM A106",
  });

  const tOverD = t_pressure / D;

  // ── Schedule checks ──
  const npsEntry = NPS_DATA.find(e => e.nps === input.npsLabel);
  const scheduleChecks: ScheduleCheck[] = [];

  // Helper: MAOP back-calculation
  // B31.1: P_MAOP = 2·t_eff·S·E / (D − 2·Y·t_eff)  [W ≡ 1.0]
  // B31.3: P_MAOP = 2·t_eff·S·E·W / (D − 2·Y·t_eff)
  // B31.4/B31.8: P_MAOP = 2·t_eff·S·F·E·T / D
  const computeMAOP = (t_nom: number): number => {
    const t_eff = t_nom * (1 - MT) - c;
    if (t_eff <= 0) return 0;
    if (std === "B31.1") {
      const SE = S_eff * E_eff; // W ≡ 1.0 for B31.1
      return (2 * t_eff * SE) / (D - 2 * Y_eff * t_eff) * 10;
    } else if (std === "B31.3") {
      const SEW = S_eff * E_eff * W_eff;
      return (2 * t_eff * SEW) / (D - 2 * Y_eff * t_eff) * 10; // MPa → bar
    } else {
      return (2 * t_eff * S_eff * F_eff * E_eff * T_derating) / D * 10;
    }
  };

  const computeHoopStress = (t_nom: number): number => {
    const t_eff = t_nom * (1 - MT) - c;
    if (t_eff <= 0 || D <= 0) return 0;
    return (P_MPa * D) / (2 * t_eff); // Barlow thin-wall, MPa
  };

  if (npsEntry) {
    // Sort schedules ascending by wall thickness for logical display
    const sorted = [...npsEntry.schedules].sort((a, b) => a.wallMm - b.wallMm);
    for (const s of sorted) {
      const t_eff   = s.wallMm * (1 - MT) - c;
      const maop    = computeMAOP(s.wallMm);
      const hoop    = computeHoopStress(s.wallMm);
      // SE (or SEW) is the allowable stress basis for utilisation
      const SE_basis = std === "B31.1" ? S_eff * E_eff
                     : std === "B31.3" ? S_eff * E_eff * W_eff
                     : S_eff * F_eff * E_eff * T_derating;
      const util    = SE_basis > 0 ? hoop / SE_basis : 0;
      const passes  = s.wallMm >= t_nom_req;
      scheduleChecks.push({ schedule: s.schedule, wallMm: s.wallMm, tEffective: Math.max(t_eff, 0), maop, hoopStress: hoop, utilisation: util, passes });
    }
  }

  const selectedSchedule = scheduleChecks.find(s => s.passes) ?? null;

  if (npsEntry && scheduleChecks.length > 0 && !selectedSchedule) {
    flags.push("NO_SCHEDULE_FOUND");
    warnings.push(`No standard B36.10M schedule is sufficient for the required nominal wall of ${t_nom_req.toFixed(2)} mm. Consider: (1) selecting a larger NPS, (2) using custom wall thickness (CWT), or (3) reviewing pressure rating.`);
  }

  if (selectedSchedule) {
    steps.push({
      label: "Selected schedule",
      equation: "",
      value: `${selectedSchedule.schedule} — t_nom = ${selectedSchedule.wallMm.toFixed(2)} mm`,
      unit: "",
      ref: "ASME B36.10M:2018",
    });
    steps.push({
      label: "t_effective (corroded)",
      equation: "t_eff = t_nom × (1 − MT) − c",
      value: selectedSchedule.tEffective.toFixed(3),
      unit: "mm",
      ref: "",
    });
    steps.push({
      label: "MAOP (back-calc)",
      equation: std === "B31.1"
        ? "P_MAOP = 2·t_eff·S·E / (D − 2·Y·t_eff)  [B31.1]"
        : std === "B31.3"
        ? "P_MAOP = 2·t_eff·S·E·W / (D − 2·Y·t_eff)"
        : "P_MAOP = 2·t_eff·S·F·E·T / D",
      value: selectedSchedule.maop.toFixed(2),
      unit: "bar(g)",
      ref: std === "B31.1" ? "ASME B31.1 §104.1.2(A)" : std === "B31.3" ? "ASME B31.3 §304.1.2" : (std === "B31.4" ? "ASME B31.4 §403.2.1" : "ASME B31.8 §841.11"),
    });
    steps.push({
      label: "Hoop stress (Barlow)",
      equation: "σ_h = P·D / (2·t_eff)",
      value: selectedSchedule.hoopStress.toFixed(2),
      unit: "MPa",
      ref: "Barlow thin-wall formula",
    });
    steps.push({
      label: "Utilisation σ_h / S_eff",
      equation: std === "B31.1" ? "η = σ_h / (S·E)" : isB31x ? "η = σ_h / (S·E·W)" : "η = σ_h / (S·F·E·T)",
      value: `${(selectedSchedule.utilisation * 100).toFixed(1)}%`,
      unit: "",
      ref: "",
    });

    if (selectedSchedule.utilisation > 0.9) {
      flags.push("HIGH_UTILISATION");
      warnings.push(`Hoop stress utilisation = ${(selectedSchedule.utilisation*100).toFixed(1)}% — close to allowable limit. Review corrosion life and consider the next heavier schedule.`);
    }

    // MAOP margin check: MAOP should comfortably exceed design pressure
    const maopMarginFrac = P_bar > 0 ? (selectedSchedule.maop - P_bar) / P_bar : 1;
    if (maopMarginFrac < 0.05 && selectedSchedule.maop > P_bar) {
      flags.push("MAOP_LOW_MARGIN");
      warnings.push(`MAOP = ${selectedSchedule.maop.toFixed(1)} bar — only ${(maopMarginFrac*100).toFixed(1)}% margin above design pressure of ${P_bar.toFixed(1)} bar. Consider selecting the next heavier schedule to increase MAOP margin.`);
    }
  }

  // ── Mill tolerance dominance ──
  const t_mill_contrib = t_nom_req - t_total;
  if (t_total > 0 && t_mill_contrib / t_nom_req > 0.20) {
    flags.push("MILL_TOL_DOMINANT");
    warnings.push(`Mill tolerance (${input.millTolerance}%) contributes ${(t_mill_contrib/t_nom_req*100).toFixed(0)}% of required nominal wall. For thin-wall pipes, consider requesting tighter mill tolerance (ASTM A106 allows ordering to 10% or 0% tolerance) to reduce material cost.`);
  }

  if (input.project.dataQuality === "preliminary") {
    flags.push("PRELIMINARY_DATA");
    warnings.push("Data quality is PRELIMINARY — corrosion allowance, design pressure, and material selection must be confirmed before final design. Re-run with confirmed data.");
  }

  // ── Recommendations ──
  if (c > 3.0) {
    recommendations.push(`Corrosion allowance of ${input.corrosionAllowance.toFixed(1)} mm implies significant corrosion rate. Verify with corrosion survey data or NACE SP0169 / NACE MR0175 assessment. Consider coating or cathodic protection to reduce required CA.`);
  }
  if (isThickWall) {
    const thickWallRef = std === "B31.1"
      ? "ASME B31.1 §104.1.2(B) / ASME VIII Div. 1"
      : "ASME B31.3 Appendix D or ASME VIII Div. 1/2";
    recommendations.push(`Thick-wall pipe: verify longitudinal and circumferential stress components per ${thickWallRef}. Flanges, fittings, and valves must also be rated for the design pressure.`);
  }
  if (std === "B31.1") {
    recommendations.push("B31.1 Power Piping: conduct flexibility analysis per ASME B31.1 §119 to verify that thermal expansion stresses are within allowable sustained + expansion stress limits (S_h + S_e ≤ f(1.25S_c + 0.25S_h)). Anchor and guide loads must be verified against equipment nozzle ratings.");
    recommendations.push("B31.1 requires PWHT for ferritic steels above the thickness and temperature limits of §331.1.1. SA-335 P11/P22/P91 always require PWHT. Verify hardness after PWHT (generally ≤ 200–225 HB depending on alloy).");
    if (T_des > 427) {
      recommendations.push(`Design temperature ${T_des} °C is in the creep range for carbon/alloy steel piping. Verify that allowable stress S from B31.1 Table A-1 is creep-controlled (time-dependent) rather than yield-controlled. Confirm with material supplier for the specific heat of material used.`);
    }
    if (input.materialId === "SA335_P91" || (mat && mat.name.includes("P91"))) {
      recommendations.push("SA-335 P91: this alloy is sensitive to improper welding and PWHT. Welding must follow a qualified WPS per ASME IX. PWHT must be performed at 730–760 °C; verify final hardness is 190–250 HB. Refer to EPRI guidelines for P91 fabrication and inspection.");
    }
  }
  if (std === "B31.3" && T_des > 370) {
    recommendations.push("Temperature > 370 °C: consider creep allowance, relaxation, and flexibility analysis per ASME B31.3 Appendix X. Confirm material with ASME B31.3 Table A-1 (high-temperature section).");
  }
  if (std === "B31.4" || std === "B31.8") {
    recommendations.push("For pipeline service: confirm hydrostatic test pressure = 1.25× design pressure (B31.4 §437.4.1) or 1.25× design pressure (B31.8 §841.322). Verify hydrostatic test against MAOP.");
    recommendations.push("Seam weld NDE: verify radiographic or ultrasonic acceptance per API 5L / B31.8 §826. Required NDE level depends on design factor F and location class.");
  }
  if (std === "B31.3") {
    recommendations.push("Hydrostatic test pressure: 1.5× design pressure per ASME B31.3 §345.4.2. Verify pipe, fittings, and supports are rated accordingly.");
    recommendations.push("Verify flange rating for the selected pipe NPS and design class per ASME B16.5 / B16.47 at the design temperature.");
  }
  recommendations.push("Check external pressure / vacuum design separately per ASME B31.3 §304.1.3 / ASME Section VIII Div. 1 UG-28 if applicable.");
  recommendations.push("Confirm the applicable piping class (line class) for material selection, schedule, and fittings rating before finalising the wall thickness.");

  return {
    t_pressure, c_total: c, t_required: t_total, t_nominal_required: t_nom_req,
    S_eff, E_eff, Y_eff, W_eff, F_eff, T_derating,
    P_MPa, T_design: T_des, D_mm: D,
    tOverD, t_lame, isThickWall,
    scheduleChecks, selectedSchedule,
    calcSteps: steps, flags, warnings, recommendations,
  };
}

// ─── Defaults & Test Cases ────────────────────────────────────────────────────

export const DEFAULT_PWT_PROJECT: PipeWTProject = {
  name: "", lineTag: "", engineer: "", rev: "A",
  date: new Date().toISOString().slice(0, 10),
  dataQuality: "preliminary",
};

export const DEFAULT_PWT_INPUT: PipeWTInput = {
  project: { ...DEFAULT_PWT_PROJECT },
  pipingStandard: "B31.3",
  useNpsSel: true,
  npsLabel: '6"',
  outerDiameter: 168.3,
  materialId: "A106_B",
  userS_MPa: 138,
  userSmys: 241,
  userMaterialType: "ferritic",
  jointType: "seamless",
  userE: 1.0,
  designPressure: 50,
  designTemperature: 150,
  corrosionAllowance: 3.0,
  erosionAllowance: 0,
  threadGrooveAllowance: 0,
  millTolerance: 12.5,
  locationClass: "1D2",
  userDesignFactor: null,
};

export const PWT_TEST_CASE_B313: PipeWTInput = {
  project: {
    name: "Crude Oil Process Piping", lineTag: "6\"-P-1001-A1A",
    engineer: "", rev: "A",
    date: new Date().toISOString().slice(0, 10),
    dataQuality: "confirmed",
  },
  pipingStandard: "B31.3",
  useNpsSel: true,
  npsLabel: '6"',
  outerDiameter: 168.3,
  materialId: "A106_B",
  userS_MPa: 138, userSmys: 241,
  userMaterialType: "ferritic",
  jointType: "seamless",
  userE: 1.0,
  designPressure: 50,       // 50 bar(g) ≈ 725 psi
  designTemperature: 150,   // 150 °C
  corrosionAllowance: 3.0,
  erosionAllowance: 0,
  threadGrooveAllowance: 0,
  millTolerance: 12.5,
  locationClass: "1D2",
  userDesignFactor: null,
};

export const PWT_TEST_CASE_B318: PipeWTInput = {
  project: {
    name: "Natural Gas Transmission", lineTag: "12\"-G-2001-B1A",
    engineer: "", rev: "A",
    date: new Date().toISOString().slice(0, 10),
    dataQuality: "confirmed",
  },
  pipingStandard: "B31.8",
  useNpsSel: true,
  npsLabel: '12"',
  outerDiameter: 323.9,
  materialId: "API5L_X60",
  userS_MPa: 138, userSmys: 414,
  userMaterialType: "pipeline",
  jointType: "erw",
  userE: 1.0,
  designPressure: 70,       // 70 bar(g) ≈ 1015 psi
  designTemperature: 60,    // 60 °C
  corrosionAllowance: 1.5,
  erosionAllowance: 0,
  threadGrooveAllowance: 0,
  millTolerance: 12.5,
  locationClass: "1D2",     // F = 0.72
  userDesignFactor: null,
};

export const PWT_TEST_CASE_B311: PipeWTInput = {
  project: {
    name: "Main Steam Header — Power Plant", lineTag: "6\"-S-3001-B1A",
    engineer: "", rev: "A",
    date: new Date().toISOString().slice(0, 10),
    dataQuality: "confirmed",
  },
  pipingStandard: "B31.1",
  useNpsSel: true,
  npsLabel: '6"',
  outerDiameter: 168.3,
  materialId: "SA335_P22",  // 2.25Cr-1Mo for main steam service
  userS_MPa: 103.4, userSmys: 207,
  userMaterialType: "ferritic",
  jointType: "seamless",
  userE: 1.0,
  designPressure: 120,      // 120 bar(g) ≈ 1740 psi (typical main steam)
  designTemperature: 540,   // 540 °C (supercritical steam reheat typical)
  corrosionAllowance: 1.6,  // per ASME B31.1 erosion/corrosion allowance
  erosionAllowance: 0,
  threadGrooveAllowance: 0,
  millTolerance: 12.5,
  locationClass: "1D2",
  userDesignFactor: null,
};

// ─── Flag Labels ──────────────────────────────────────────────────────────────

export const PWT_FLAG_LABELS: Record<PipeWTFlag, string> = {
  THICK_WALL:                  "THICK-WALL CONDITION — Lamé equation applied",
  CREEP_REGIME:                "CREEP REGIME (T > 480 °C) — verify allowable stress",
  HIGH_TEMPERATURE:            "HIGH TEMPERATURE — creep / oxidation assessment required",
  LOW_TEMPERATURE:             "LOW TEMPERATURE — impact testing required",
  LOW_TEMP_CLAMPED:            "LOW TEMP: ALLOWABLE STRESS CLAMPED TO TABLE MINIMUM — verify MDMT",
  TEMP_ABOVE_DERATING_TABLE:   "TEMPERATURE EXCEEDS B31.4/B31.8 DERATING TABLE (max 232 °C)",
  NO_SCHEDULE_FOUND:           "NO STANDARD SCHEDULE SATISFIES REQUIREMENT",
  LOW_DP:                      "VERY LOW PRESSURE — structural/min-wall governs",
  HIGH_UTILISATION:            "HIGH STRESS UTILISATION (> 90%)",
  CORROSION_DOMINANT:          "CORROSION ALLOWANCE DOMINATES WALL THICKNESS",
  MATERIAL_TEMP_LIMIT:         "TEMPERATURE EXCEEDS MATERIAL TABLE LISTING",
  MILL_TOL_DOMINANT:           "MILL TOLERANCE SIGNIFICANT CONTRIBUTION",
  W_FACTOR_WARNING:            "W FACTOR CHECK REQUIRED (T > 510 °C)",
  MAOP_LOW_MARGIN:             "LOW MAOP MARGIN (< 5% above design pressure)",
  USER_OVERRIDE_ACTIVE:        "USER-OVERRIDE: user-defined S / E / F bypasses standard database",
  PRELIMINARY_DATA:            "PRELIMINARY DATA — re-confirm before final design",
};

export const PWT_FLAG_SEVERITY: Record<PipeWTFlag, "critical" | "warning" | "info"> = {
  THICK_WALL:                  "warning",
  CREEP_REGIME:                "critical",
  HIGH_TEMPERATURE:            "warning",
  LOW_TEMPERATURE:             "warning",
  LOW_TEMP_CLAMPED:            "warning",
  TEMP_ABOVE_DERATING_TABLE:   "warning",
  NO_SCHEDULE_FOUND:           "critical",
  LOW_DP:                      "info",
  HIGH_UTILISATION:            "warning",
  CORROSION_DOMINANT:          "info",
  MATERIAL_TEMP_LIMIT:         "critical",
  MILL_TOL_DOMINANT:           "info",
  W_FACTOR_WARNING:            "warning",
  MAOP_LOW_MARGIN:             "warning",
  USER_OVERRIDE_ACTIVE:        "warning",
  PRELIMINARY_DATA:            "info",
};
