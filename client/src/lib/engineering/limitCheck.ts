import type {
  GasServiceLimit,
  LiquidServiceLimit,
  MixedPhaseServiceLimit,
  NPSBand,
} from "./constants";

export interface LimitWarning {
  parameter: string;
  actual: number;
  limit: number;
  unit: string;
  exceeded: boolean;
}

export function checkGasLimits(
  service: GasServiceLimit,
  velocity: number,
  dpBarPerKm: number,
  rhoV2: number,
  machNumber: number,
  operatingPressureBar?: number
): LimitWarning[] {
  const warnings: LimitWarning[] = [];

  if (service.velocityLimit !== undefined) {
    warnings.push({
      parameter: "Velocity",
      actual: velocity,
      limit: service.velocityLimit,
      unit: "m/s",
      exceeded: velocity > service.velocityLimit,
    });
  }

  if (service.dpLimit !== undefined && service.dpType === "bar/km") {
    warnings.push({
      parameter: "Pressure Drop",
      actual: dpBarPerKm,
      limit: service.dpLimit,
      unit: "bar/km",
      exceeded: dpBarPerKm > service.dpLimit,
    });
  }

  if (service.dpLimit !== undefined && service.dpType === "%Pop" && operatingPressureBar !== undefined && operatingPressureBar > 0) {
    const dpPercent = (dpBarPerKm / operatingPressureBar) * 100;
    warnings.push({
      parameter: "Pressure Drop (% Pop)",
      actual: dpPercent,
      limit: service.dpLimit,
      unit: "% of Pop per km",
      exceeded: dpPercent > service.dpLimit,
    });
  }

  if (service.rhoV2Limit !== undefined) {
    warnings.push({
      parameter: "\u03C1v\u00B2",
      actual: rhoV2,
      limit: service.rhoV2Limit,
      unit: "kg/(m\u00B7s\u00B2)",
      exceeded: rhoV2 > service.rhoV2Limit,
    });
  }

  if (service.machLimit !== undefined) {
    warnings.push({
      parameter: "Mach Number",
      actual: machNumber,
      limit: service.machLimit,
      unit: "",
      exceeded: machNumber > service.machLimit,
    });
  }

  return warnings;
}

export function checkLiquidLimits(
  service: LiquidServiceLimit,
  velocity: number,
  dpBarPerKm: number,
  npsBand?: NPSBand
): LimitWarning[] {
  const warnings: LimitWarning[] = [];

  let velocityLimit: number | undefined;
  if (service.velocityFixed !== undefined) {
    velocityLimit = service.velocityFixed;
  } else if (service.velocityByNPS && npsBand) {
    velocityLimit = service.velocityByNPS[npsBand];
  }

  if (velocityLimit !== undefined) {
    warnings.push({
      parameter: "Velocity",
      actual: velocity,
      limit: velocityLimit,
      unit: "m/s",
      exceeded: velocity > velocityLimit,
    });
  }

  if (service.dpLimit !== undefined) {
    warnings.push({
      parameter: "Pressure Drop",
      actual: dpBarPerKm,
      limit: service.dpLimit,
      unit: "bar/km",
      exceeded: dpBarPerKm > service.dpLimit,
    });
  }

  return warnings;
}

export function checkMixedPhaseLimits(
  service: MixedPhaseServiceLimit,
  rhoV2: number
): LimitWarning[] {
  const warnings: LimitWarning[] = [];

  warnings.push({
    parameter: "\u03C1v\u00B2",
    actual: rhoV2,
    limit: service.rhoV2Limit,
    unit: "kg/(m\u00B7s\u00B2)",
    exceeded: rhoV2 > service.rhoV2Limit,
  });

  return warnings;
}

export function formatLimitWarning(w: LimitWarning): string {
  const status = w.exceeded ? "EXCEEDS" : "OK";
  const actualStr = w.actual < 0.01 ? w.actual.toExponential(2) : w.actual.toFixed(2);
  const limitStr = w.limit < 0.01 ? w.limit.toExponential(2) : w.limit.toFixed(2);
  return `${w.parameter}: ${actualStr} ${w.unit} (limit: ${limitStr} ${w.unit}) — ${status}`;
}
