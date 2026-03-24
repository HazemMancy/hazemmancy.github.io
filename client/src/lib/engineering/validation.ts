import { z } from "zod";

export const gasLineSizingSchema = z.object({
  flowRate: z.number().positive("Flow rate must be positive"),
  pressure: z.number().min(0.01, "Pressure must be > 0"),
  temperature: z.number().min(-50, "Min temperature: -50°C").max(500, "Max temperature: 500°C"),
  molecularWeight: z.number().min(2, "MW must be >= 2").max(200, "MW must be <= 200"),
  innerDiameter: z.number().positive("Diameter must be positive"),
  pipeLength: z.number().positive("Pipe length must be positive"),
  roughness: z.number().min(0, "Roughness must be ≥ 0 (0 = hydraulically smooth pipe)"),
  compressibilityFactor: z.number().min(0.1, "Z-factor must be >= 0.1").max(2, "Z-factor must be <= 2"),
  specificHeatRatio: z.number().min(1, "Cp/Cv must be >= 1").max(1.7, "Cp/Cv must be <= 1.7"),
  viscosity: z.number().positive("Viscosity must be positive"),
});

export const liquidLineSizingSchema = z.object({
  flowRate: z.number().positive("Flow rate must be positive"),
  density: z.number().positive("Density must be positive"),
  viscosity: z.number().positive("Viscosity must be positive"),
  innerDiameter: z.number().positive("Diameter must be positive"),
  pipeLength: z.number().positive("Pipe length must be positive"),
  roughness: z.number().min(0, "Roughness must be ≥ 0 (0 = hydraulically smooth pipe)"),
  elevationChange: z.number(),
});

export const multiphaseSchema = z.object({
  gasActualVolumetricFlow: z.number().min(0, "Actual gas flow must be >= 0"),
  liquidActualVolumetricFlow: z.number().min(0, "Actual liquid flow must be >= 0"),
  gasDensity: z.number().positive("Gas density must be positive"),
  liquidDensity: z.number().positive("Liquid density must be positive"),
  innerDiameter: z.number().positive("Diameter must be positive"),
  cFactor: z.number().min(1, "C-factor must be > 0").max(300, "C-factor must be <= 300"),
}).refine(
  (d) => d.gasActualVolumetricFlow > 0 || d.liquidActualVolumetricFlow > 0,
  { message: "At least one phase must have a positive actual flow rate", path: ["gasActualVolumetricFlow"] }
);

// ─── Pump sizing schemas ───────────────────────────────────────────────────────

const pumpPipingBase = z.object({
  flowRate: z.number().positive("Flow rate must be positive"),
  liquidDensity: z.number().positive("Liquid density must be positive"),
  viscosity: z.number().positive("Viscosity must be positive"),
  suctionStaticHead: z.number(),
  dischargeStaticHead: z.number(),
  suctionPipeLength: z.number().min(0, "Suction pipe length must be >= 0"),
  dischargePipeLength: z.number().min(0, "Discharge pipe length must be >= 0"),
  suctionPipeDiameter: z.number().positive("Suction pipe diameter must be positive"),
  dischargePipeDiameter: z.number().positive("Discharge pipe diameter must be positive"),
  suctionRoughness: z.number().min(0, "Roughness must be >= 0"),
  dischargeRoughness: z.number().min(0, "Roughness must be >= 0"),
  suctionFittingsK: z.number().min(0, "Fittings K must be >= 0"),
  dischargeFittingsK: z.number().min(0, "Fittings K must be >= 0"),
  vaporPressure: z.number().min(0, "Vapor pressure must be >= 0"),
  atmosphericPressure: z.number().positive("Atmospheric pressure must be positive"),
  suctionVesselPressure: z.number(),
  dischargeVesselPressure: z.number(),
});

export const centrifugalPumpSchema = pumpPipingBase.extend({
  pumpEfficiency: z.number().min(1, "Pump efficiency must be > 0%").max(100, "Pump efficiency must be <= 100%"),
  motorEfficiency: z.number().min(1, "Motor efficiency must be > 0%").max(100, "Motor efficiency must be <= 100%"),
  pumpSpeed: z.number().positive().optional(),
});

export const pdPumpSchema = pumpPipingBase.extend({
  volumetricEfficiency: z.number().min(1, "Volumetric efficiency must be > 0%").max(100, "Volumetric efficiency must be <= 100%"),
  mechanicalEfficiency: z.number().min(1, "Mechanical efficiency must be > 0%").max(100, "Mechanical efficiency must be <= 100%"),
  motorEfficiency: z.number().min(1, "Motor efficiency must be > 0%").max(100, "Motor efficiency must be <= 100%"),
  pumpDifferentialPressure: z.number().min(0, "Pump differential pressure must be >= 0"),
  reliefValvePressure: z.number().min(0, "Relief valve pressure must be >= 0"),
});

export type CentrifugalPumpInput = z.infer<typeof centrifugalPumpSchema>;
export type PDPumpInput = z.infer<typeof pdPumpSchema>;

export const gasMixingSchema = z.object({
  /** Normalization policy — enforced inside the solver, not just UI-side */
  normalizationMode: z.enum(["strict", "normalize"]).default("normalize"),
  components: z.array(z.object({
    name: z.string().min(1, "Component name is required"),
    /** Must be >= 0. Sum policy (strict = must equal 1.0; normalize = auto-scale) is applied in solver. */
    moleFraction: z.number().nonnegative("Mole fraction must be >= 0"),
    molecularWeight: z.number().positive("MW must be > 0"),
  })).min(2, "At least 2 components required"),
});

export const gasVolumeSchema = z.object({
  flowRate: z.number().positive("Flow rate must be positive"),
  pressureStd: z.number().positive("Standard pressure must be positive"),
  temperatureStd: z.number(),
  pressureActual: z.number().positive("Actual pressure must be positive"),
  temperatureActual: z.number(),
  zFactorStd: z.number().min(0.1).max(2),
  zFactorActual: z.number().min(0.1).max(2),
});

export type GasLineSizingInput = z.infer<typeof gasLineSizingSchema>;
export type LiquidLineSizingInput = z.infer<typeof liquidLineSizingSchema>;
export type MultiphaseInput = z.infer<typeof multiphaseSchema>;
export type GasMixingInput = z.infer<typeof gasMixingSchema>;
export type GasVolumeInput = z.infer<typeof gasVolumeSchema>;

// ─── Heat Exchanger schemas ────────────────────────────────────────────────────

export const hxStreamSchema = z.object({
  name: z.string(),
  mDot: z.number().positive("Flow rate must be > 0"),
  cp: z.number().positive("Cp must be > 0"),
  tIn: z.number().min(-273, "Inlet temperature below absolute zero"),
  tOut: z.number().min(-273, "Outlet temperature below absolute zero"),
  tOutKnown: z.boolean(),
  phaseNote: z.enum(["single_phase", "condensing", "boiling"]),
});

export const hxCaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Case name is required"),
  caseType: z.string(),
  hotSide: hxStreamSchema,
  coldSide: hxStreamSchema,
  dutyMode: z.enum(["both_outlets_known", "one_outlet_unknown", "duty_given"]),
  dutyKW: z.number(),
}).refine(
  (c) => c.dutyMode !== "duty_given" || c.dutyKW > 0,
  { message: "Duty must be > 0 when duty_given mode is selected", path: ["dutyKW"] }
);

const hxUBaseFields = {
  uClean: z.number(),
  uFouled: z.number(),
  rfHot: z.number(),
  rfCold: z.number(),
  serviceCategory: z.string(),
  designMargin: z.number().min(0, "Design margin must be >= 0"),
};

export const hxUInputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("clean_plus_fouling"),
    ...hxUBaseFields,
    uClean: z.number().positive("U_clean must be > 0"),
    rfHot: z.number().min(0, "Rf_hot must be >= 0"),
    rfCold: z.number().min(0, "Rf_cold must be >= 0"),
  }),
  z.object({
    mode: z.literal("fouled_direct"),
    ...hxUBaseFields,
    uFouled: z.number().positive("U_fouled must be > 0"),
  }),
  z.object({
    mode: z.literal("estimated"),
    ...hxUBaseFields,
  }),
]);

export const hxConfigSchema = z.object({
  arrangement: z.enum(["counter_current", "co_current", "1_2_pass", "custom_F"]),
  fMode: z.enum(["user_entered", "approximate_correlation"]),
  fValue: z.number().min(0.3, "F-factor must be >= 0.3").max(1.0, "F-factor must be <= 1.0"),
  approachTempMin: z.number().min(0, "Min approach temperature must be >= 0"),
  shellPasses: z.number().int().min(1, "Shell passes must be >= 1"),
  tubePasses: z.number().int().min(1, "Tube passes must be >= 1"),
});

export const hxInputSchema = z.object({
  cases: z.array(hxCaseSchema).min(1, "At least one operating case is required"),
  config: hxConfigSchema,
  uInput: hxUInputSchema,
});

export type HXStreamValidInput = z.infer<typeof hxStreamSchema>;
export type HXCaseValidInput = z.infer<typeof hxCaseSchema>;
export type HXUValidInput = z.infer<typeof hxUInputSchema>;
export type HXConfigValidInput = z.infer<typeof hxConfigSchema>;
export type HXSchemaInput = z.infer<typeof hxInputSchema>;

// ─── Control Valve Sizing Schemas ─────────────────────────────────────────────

export const cvOperatingPointSchema = z.object({
  label: z.string(),
  flowRate: z.number().positive("Flow rate must be positive"),
  flowUnit: z.enum(["volumetric", "mass"]),
  upstreamPressure: z.number().positive("P1 (upstream pressure) must be positive (absolute pressure)"),
  downstreamPressure: z.number().nonnegative("P2 (downstream pressure) must be non-negative"),
  temperature: z.number().gt(-273.15, "Temperature must be above absolute zero"),
  enabled: z.boolean(),
}).refine(d => d.upstreamPressure > d.downstreamPressure, {
  message: "P1 must exceed P2 (upstream pressure must be greater than downstream)",
  path: ["downstreamPressure"],
});

export const cvLiquidPropsSchema = z.object({
  density: z.number().positive("Liquid density must be positive (kg/m³)"),
  viscosity: z.number().positive("Liquid viscosity must be positive (cP)"),
  vaporPressure: z.number().nonnegative("Vapor pressure must be ≥ 0 (kPa)"),
  criticalPressure: z.number().positive("Critical pressure must be positive (bar abs)"),
});

export const cvGasPropsSchema = z.object({
  molecularWeight: z.number().positive("Molecular weight must be positive (kg/kmol)"),
  specificHeatRatio: z.number().gt(1.0, "Specific heat ratio k must be > 1.0"),
  compressibilityFactor: z.number().positive("Compressibility factor Z must be positive"),
  viscosity: z.number().positive("Gas viscosity must be positive (cP)"),
  criticalPressure: z.number().positive("Critical pressure must be positive (bar abs)"),
});

export const cvValveDataSchema = z.object({
  fl: z.number().gt(0, "FL must be > 0").lte(1.0, "FL must be ≤ 1.0"),
  xt: z.number().gt(0, "xT must be > 0").lte(1.0, "xT must be ≤ 1.0"),
  fd: z.number().gte(0, "Fd must be ≥ 0"),
  ratedCv: z.number().gte(0, "Rated Cv must be ≥ 0"),
  pipeSize: z.number().positive("Pipe size must be positive (mm)"),
  valveSize: z.number().gte(0, "Valve size must be ≥ 0 (mm)"),
  rangeability: z.number().positive("Rangeability must be positive"),
  style: z.enum(["globe", "ball", "butterfly"]),
  characteristic: z.enum(["equal_pct", "linear", "quick_open"]),
});

export const cvInstallationSchema = z.object({
  hasReducers: z.boolean(),
  upstreamPipeSize: z.number().positive("Upstream pipe size must be positive (mm)"),
  downstreamPipeSize: z.number().positive("Downstream pipe size must be positive (mm)"),
  fpOverride: z.number().gte(0, "Fp override must be ≥ 0").lte(1.0, "Fp override must be ≤ 1.0 (0 = auto-calculate)"),
});

export const cvEnabledPointsSchema = z.array(cvOperatingPointSchema).min(1, "At least one operating point must be enabled");

export type CVOperatingPointInput = z.infer<typeof cvOperatingPointSchema>;
export type CVLiquidPropsInput = z.infer<typeof cvLiquidPropsSchema>;
export type CVGasPropsInput = z.infer<typeof cvGasPropsSchema>;
export type CVValveDataInput = z.infer<typeof cvValveDataSchema>;
export type CVInstallationInput = z.infer<typeof cvInstallationSchema>;

// ─── Restriction Orifice Schemas ───────────────────────────────────────────────

export const roLiquidPropsSchema = z.object({
  density: z.number().positive("Liquid density must be positive (kg/m³)"),
  viscosity: z.number().positive("Viscosity must be positive (cP)"),
  vaporPressure: z.number().nonnegative("Vapor pressure must be ≥ 0 (bar abs)"),
});

export const roGasPropsSchema = z.object({
  molecularWeight: z.number().positive("Molecular weight must be positive (kg/kmol)"),
  specificHeatRatio: z.number().gt(1.0, "Specific heat ratio k must be > 1.0"),
  compressibilityFactor: z.number().positive("Compressibility factor Z must be positive"),
  viscosity: z.number().positive("Gas viscosity must be positive (cP)"),
});

export const roServiceInputSchema = z.object({
  phase: z.enum(["liquid", "gas"]),
  sizingMode: z.enum(["sizeForFlow", "checkOrifice", "predictDP"]),
  flowBasis: z.enum(["mass", "volume"]),
  upstreamPressure: z.number().positive("Upstream pressure must be positive (bar abs)"),
  downstreamPressure: z.number().nonnegative("Downstream pressure must be ≥ 0 (bar abs)"),
  temperature: z.number().gt(-273.15, "Temperature must be above absolute zero"),
  pipeDiameter: z.number().positive("Pipe diameter must be positive (mm)"),
  orificeDiameter: z.number().min(0, "Orifice diameter must be ≥ 0"),
  numStages: z.number().int().min(1, "Number of stages must be ≥ 1").max(20, "Number of stages must be ≤ 20"),
  betaMin: z.number().min(0.05, "β min must be ≥ 0.05").max(0.94, "β min must be ≤ 0.94"),
  betaMax: z.number().min(0.06, "β max must be ≥ 0.06").max(0.95, "β max must be ≤ 0.95"),
}).refine(
  (d) => d.sizingMode === "predictDP" || d.upstreamPressure > d.downstreamPressure,
  { message: "P1 (upstream) must exceed P2 (downstream)", path: ["downstreamPressure"] },
).refine(
  (d) => d.betaMin < d.betaMax,
  { message: "β min must be less than β max", path: ["betaMax"] },
).refine(
  (d) => {
    if (d.sizingMode === "checkOrifice" || d.sizingMode === "predictDP") {
      return d.orificeDiameter > 0;
    }
    return true;
  },
  { message: "Orifice diameter must be positive in check/predict modes", path: ["orificeDiameter"] },
);

export type ROLiquidPropsInput = z.infer<typeof roLiquidPropsSchema>;
export type ROGasPropsInput = z.infer<typeof roGasPropsSchema>;
export type ROServiceValidInput = z.infer<typeof roServiceInputSchema>;
