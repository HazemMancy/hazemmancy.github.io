import { PI, VELOCITY_LIMITS } from "./constants";
import type { MultiphaseInput } from "./validation";

export interface MultiphaseResult {
  // Derived actual volumetric flows (from mass flow / density)
  actualGasVolumetricFlow: number;    // m³/h
  actualLiquidVolumetricFlow: number; // m³/h
  // Superficial velocities
  superficialGasVelocity: number;     // m/s
  superficialLiquidVelocity: number;  // m/s
  mixtureVelocity: number;            // m/s
  erosionalVelocity: number;          // m/s
  mixtureDensity: number;             // kg/m³
  rhoV2: number;                      // kg/(m·s²)
  noSlipLiquidFraction: number;       // λL = Vsl / Vm — no-slip volumetric fraction
  velocityRatio: number;              // Vm / Ve
  warnings: string[];
}

/**
 * calculateMultiphase — Homogeneous No-Slip Screening Calculator
 *
 * PURPOSE: Preliminary-design / FEED screening of multiphase line sizing.
 *   NOT a mechanistic multiphase model, not a flow-regime predictor,
 *   not a substitute for rigorous flow assurance (OLGA / PIPESIM / Ledaflow).
 *
 * BASIS: Homogeneous no-slip model — both phases assumed to travel at the
 *   same velocity. API RP 14E erosional velocity screening.
 *
 * INPUTS (all in SI):
 *   gasMassFlowRate  [kg/h]  — mass flowrate of gas phase
 *   liquidMassFlowRate [kg/h] — mass flowrate of liquid phase
 *   gasDensity       [kg/m³] — actual gas density at operating P/T (from PVT/simulation)
 *   liquidDensity    [kg/m³] — actual liquid density at operating P/T
 *   innerDiameter    [mm]    — pipe inner diameter
 *   cFactor          [—]     — API RP 14E C-factor (user engineering judgment)
 *
 * REFERENCES:
 *   API RP 14E — Recommended Practice for Design and Installation of Offshore
 *                Production Platform Piping Systems
 *   GPSA Engineering Data Book, 14th Edition — Section 17
 */
export function calculateMultiphase(input: MultiphaseInput): MultiphaseResult {
  const warnings: string[] = [];

  if (input.innerDiameter <= 0) throw new Error("Inner diameter must be positive");
  if (input.gasDensity <= 0) throw new Error("Gas density must be positive");
  if (input.liquidDensity <= 0) throw new Error("Liquid density must be positive");
  if (input.gasMassFlowRate < 0) throw new Error("Gas mass flow rate must be non-negative");
  if (input.liquidMassFlowRate < 0) throw new Error("Liquid mass flow rate must be non-negative");
  if (input.gasMassFlowRate <= 0 && input.liquidMassFlowRate <= 0) {
    throw new Error("At least one phase must have positive mass flow rate");
  }
  if (input.cFactor <= 0) throw new Error("C-factor must be positive");
  if (input.liquidDensity <= input.gasDensity) {
    warnings.push("Liquid density ≤ gas density — verify fluid properties (possible near-critical or phase-inversion conditions)");
  }

  // Pipe cross-sectional area
  const D_m = input.innerDiameter / 1000; // mm → m
  const A = PI * D_m * D_m / 4;           // m²

  // ─────────────────────────────────────────────────────────────────────────
  // MASS FLOW → ACTUAL VOLUMETRIC FLOW CONVERSION
  // Qg_actual = m_dot_g / rho_g   [m³/h]
  // Ql_actual = m_dot_l / rho_l   [m³/h]
  // This step requires that gasDensity and liquidDensity are ACTUAL densities
  // at operating pressure and temperature — not standard/reference conditions.
  // ─────────────────────────────────────────────────────────────────────────
  const Qg_m3h = input.gasMassFlowRate / input.gasDensity;   // m³/h actual
  const Ql_m3h = input.liquidMassFlowRate / input.liquidDensity; // m³/h actual

  // Convert to m³/s for velocity calculations
  const Qg_m3s = Qg_m3h / 3600;
  const Ql_m3s = Ql_m3h / 3600;

  // Superficial velocities
  const Vsg = Qg_m3s / A; // m/s
  const Vsl = Ql_m3s / A; // m/s
  const Vm  = Vsg + Vsl;  // m/s — mixture velocity (homogeneous)

  // No-slip liquid volume fraction: λL = Vsl / (Vsg + Vsl)
  const lambdaL = Vm > 0 ? Vsl / Vm : 0;

  // Homogeneous mixture density: ρm = ρL·λL + ρG·(1 − λL)
  const mixtureDensity = input.liquidDensity * lambdaL + input.gasDensity * (1 - lambdaL);

  // API RP 14E erosional velocity: Ve = C / √ρm
  const erosionalVelocity = input.cFactor / Math.sqrt(mixtureDensity);

  const rhoV2 = mixtureDensity * Vm * Vm;
  const velocityRatio = erosionalVelocity > 0 ? Vm / erosionalVelocity : 0;

  // ── Erosional velocity screening ──────────────────────────────────────────
  if (Vm > erosionalVelocity) {
    warnings.push(
      `Mixture velocity ${Vm.toFixed(2)} m/s exceeds API RP 14E screening erosional velocity of ${erosionalVelocity.toFixed(2)} m/s — consider larger pipe or review fluid properties and C-factor basis`
    );
  } else if (velocityRatio > 0.8) {
    warnings.push(
      `Mixture velocity is at ${(velocityRatio * 100).toFixed(0)}% of screening erosional velocity — approaching limit; review with detailed design`
    );
  }

  // ── General multiphase velocity limit ────────────────────────────────────
  if (Vm > VELOCITY_LIMITS.multiphase.max) {
    warnings.push(
      `Mixture velocity ${Vm.toFixed(2)} m/s exceeds typical multiphase screening limit of ${VELOCITY_LIMITS.multiphase.max} m/s`
    );
  }

  // ── Phase fraction screening (softened — no regime prediction) ────────────
  if (lambdaL > 0.5) {
    warnings.push(
      "Liquid-rich screening result (no-slip λL > 0.5) — liquid accumulation and slugging risk should be verified with detailed mechanistic multiphase analysis (e.g. OLGA / PIPESIM)"
    );
  } else if (lambdaL < 0.01 && input.liquidMassFlowRate > 0) {
    warnings.push(
      "Gas-dominated screening result (no-slip λL < 0.01) — detailed multiphase analysis recommended to assess mist entrainment and liquid accumulation"
    );
  }

  return {
    actualGasVolumetricFlow: Qg_m3h,
    actualLiquidVolumetricFlow: Ql_m3h,
    superficialGasVelocity: Vsg,
    superficialLiquidVelocity: Vsl,
    mixtureVelocity: Vm,
    erosionalVelocity,
    mixtureDensity,
    rhoV2,
    noSlipLiquidFraction: lambdaL,
    velocityRatio,
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASE: Wellhead gas-condensate flowline — per API RP 14E screening
// Service: Gas-condensate multiphase in 10" Sch 40 CS pipe
// Basis:   Mass-flow input + actual densities at operating P/T (50 bar, 60 °C)
// Expected: Erosional velocity ~8–15 m/s, ρV² < 10,000 Pa
// ─────────────────────────────────────────────────────────────────────────────
export const MULTIPHASE_TEST_CASE: MultiphaseInput = {
  gasMassFlowRate: 125_000,  // kg/h — gas mass flowrate (50 bar, 60°C PVT basis)
  liquidMassFlowRate: 40_000, // kg/h — condensate + produced water mass flowrate
  gasDensity: 25,            // kg/m³ — actual gas density at operating P/T (from PVT)
  liquidDensity: 800,        // kg/m³ — condensate/water weighted average at operating P/T
  innerDiameter: 254.5,      // mm   — 10" NPS Sch 40 ID (ASME B36.10M)
  cFactor: 100,              // API RP 14E C-factor — conservative default (continuous solids-free)
};
