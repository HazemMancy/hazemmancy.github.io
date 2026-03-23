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
  gasFlowRate: z.number().min(0, "Gas flow must be >= 0"),
  liquidFlowRate: z.number().min(0, "Liquid flow must be >= 0"),
  gasDensity: z.number().positive("Gas density must be positive"),
  liquidDensity: z.number().positive("Liquid density must be positive"),
  innerDiameter: z.number().positive("Diameter must be positive"),
  pipeLength: z.number().positive("Pipe length must be positive"),
  cFactor: z.number().min(50, "C-factor must be >= 50").max(300, "C-factor must be <= 300"),
});

export const gasMixingSchema = z.object({
  components: z.array(z.object({
    name: z.string().min(1),
    moleFraction: z.number().min(0).max(1),
    molecularWeight: z.number().positive(),
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
