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
