import { PI, GRAVITY, VELOCITY_LIMITS } from "./constants";
import type { LiquidLineSizingInput } from "./validation";

export interface LiquidSizingResult {
  velocity: number;
  reynoldsNumber: number;
  frictionFactor: number;
  frictionLoss: number;
  staticHead: number;
  totalPressureDrop: number;
  pressureDropPer100m: number;
  warnings: string[];
}

function swameeJainFriction(Re: number, roughness: number, diameter: number): number {
  if (Re < 2300) {
    return 64 / Re;
  }
  const relRoughness = roughness / diameter;
  const term = Math.log10(relRoughness / 3.7 + 5.74 / Math.pow(Re, 0.9));
  return 0.25 / Math.pow(term, 2);
}

export function calculateLiquidLineSizing(input: LiquidLineSizingInput): LiquidSizingResult {
  const warnings: string[] = [];

  const D_m = input.innerDiameter / 1000;
  const A = PI * Math.pow(D_m, 2) / 4;

  const volumeFlow_m3s = input.flowRate / 3600;
  const velocity = volumeFlow_m3s / A;

  const mu_Pas = input.viscosity * 1e-3;
  const Re = (input.density * velocity * D_m) / mu_Pas;

  const roughness_m = input.roughness / 1000;
  const f = swameeJainFriction(Re, roughness_m, D_m);

  const frictionLoss_Pa = f * (input.pipeLength / D_m) * 0.5 * input.density * Math.pow(velocity, 2);
  const frictionLoss_bar = frictionLoss_Pa / 1e5;

  const staticHead_Pa = input.density * GRAVITY * input.elevationChange;
  const staticHead_bar = staticHead_Pa / 1e5;

  const totalDP_bar = frictionLoss_bar + staticHead_bar;
  const dP_per100m = (frictionLoss_bar / input.pipeLength) * 100;

  if (velocity > VELOCITY_LIMITS.liquid.max) {
    warnings.push(`Velocity ${velocity.toFixed(2)} m/s exceeds maximum limit of ${VELOCITY_LIMITS.liquid.max} m/s — erosion risk`);
  } else if (velocity > VELOCITY_LIMITS.liquid.warning) {
    warnings.push(`Velocity ${velocity.toFixed(2)} m/s approaching upper limit of ${VELOCITY_LIMITS.liquid.max} m/s`);
  }
  if (velocity < VELOCITY_LIMITS.liquid.min) {
    warnings.push(`Velocity ${velocity.toFixed(2)} m/s is below minimum of ${VELOCITY_LIMITS.liquid.min} m/s — potential settling`);
  }

  if (Re < 2300) {
    warnings.push("Laminar flow regime detected (Re < 2300).");
  }

  return {
    velocity,
    reynoldsNumber: Re,
    frictionFactor: f,
    frictionLoss: frictionLoss_bar,
    staticHead: staticHead_bar,
    totalPressureDrop: totalDP_bar,
    pressureDropPer100m: dP_per100m,
    warnings,
  };
}

// Crude oil transfer line — per API RP 14E / GPSA Section 17
// Light crude through 6" Sch 40 CS pipe, moderate viscosity
// Expected: velocity ~1.5–3 m/s, ΔP within typical crude transfer limits
export const LIQUID_SIZING_TEST_CASE: LiquidLineSizingInput = {
  flowRate: 100,       // m³/h — typical crude oil transfer rate
  density: 850,        // kg/m³ — API 35° light crude (ASTM D1298)
  viscosity: 5,        // cP — light crude at ~40°C (typical field data)
  innerDiameter: 154.1,// mm — 6" NPS Sch 40 (ID = 154.1 mm per ASME B36.10)
  pipeLength: 200,     // m — typical intra-facility pipe run
  roughness: 0.0457,   // mm — commercial carbon steel (Moody chart)
  elevationChange: 10, // m — platform or pipe rack elevation
};
