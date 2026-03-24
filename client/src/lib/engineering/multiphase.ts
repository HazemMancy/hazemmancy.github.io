import { PI, VELOCITY_LIMITS } from "./constants";
import type { MultiphaseInput } from "./validation";

export interface MultiphaseResult {
  // Actual volumetric flows — directly from user input (m³/h at operating P/T)
  actualGasVolumetricFlow: number;    // m³/h
  actualLiquidVolumetricFlow: number; // m³/h
  // Superficial velocities
  superficialGasVelocity: number;     // m/s
  superficialLiquidVelocity: number;  // m/s
  mixtureVelocity: number;            // m/s
  erosionalVelocity: number;          // m/s
  mixtureDensity: number;             // kg/m³
  rhoV2: number;                      // Pa  [kg/(m·s²)]
  noSlipLiquidFraction: number;       // λL = Vsl / Vm — no-slip volumetric fraction
  velocityRatio: number;              // Vm / Ve
  warnings: string[];
}

/**
 * calculateMultiphase — Homogeneous No-Slip Screening Calculator
 *
 * PURPOSE: Preliminary-design / FEED screening of multiphase line sizing.
 *   NOT a mechanistic multiphase model, not a flow-regime predictor,
 *   not a pressure-drop model, not a substitute for rigorous flow assurance
 *   (OLGA / PIPESIM / Ledaflow).
 *
 * BASIS: Homogeneous no-slip model — both phases assumed to travel at the
 *   same velocity. API RP 14E erosional velocity screening.
 *
 * GAS FLOW BASIS: Actual gas volumetric flow at operating P/T conditions.
 *   Must NOT be standard/reference volumetric flow. Convert Sm³/h → actual m³/h
 *   using Z-factor ratio before entry, or use PVT/simulation output directly.
 *
 * LIQUID FLOW BASIS: Actual liquid volumetric flow at operating P/T conditions.
 *
 * INPUTS (all in SI):
 *   gasActualVolumetricFlow  [m³/h]  — actual gas volumetric flow at line P/T
 *   liquidActualVolumetricFlow [m³/h] — actual liquid volumetric flow at line P/T
 *   gasDensity               [kg/m³] — actual gas density at operating P/T
 *   liquidDensity            [kg/m³] — actual liquid density at operating P/T
 *   innerDiameter            [mm]    — pipe inner diameter
 *   cFactor                  [—]     — API RP 14E C-factor (user engineering judgment)
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
  if (input.gasActualVolumetricFlow < 0) throw new Error("Actual gas flow must be non-negative");
  if (input.liquidActualVolumetricFlow < 0) throw new Error("Actual liquid flow must be non-negative");
  if (input.gasActualVolumetricFlow <= 0 && input.liquidActualVolumetricFlow <= 0) {
    throw new Error("At least one phase must have a positive actual flow rate");
  }
  if (input.cFactor <= 0) throw new Error("C-factor must be positive");
  if (input.liquidDensity <= input.gasDensity) {
    warnings.push("Liquid density ≤ gas density — verify fluid properties (possible near-critical or phase-inversion conditions)");
  }

  // Pipe cross-sectional area
  const D_m = input.innerDiameter / 1000; // mm → m
  const A = PI * D_m * D_m / 4;           // m²

  // ─────────────────────────────────────────────────────────────────────────
  // ACTUAL VOLUMETRIC FLOWS — directly from user input (already at operating P/T)
  // Gas flow basis: actual m³/h at line conditions — NOT standard/reference flow
  // Liquid flow basis: actual m³/h at line conditions
  // Convert m³/h → m³/s for velocity calculation
  // ─────────────────────────────────────────────────────────────────────────
  const Qg_m3h = input.gasActualVolumetricFlow;
  const Ql_m3h = input.liquidActualVolumetricFlow;

  const Qg_m3s = Qg_m3h / 3600;
  const Ql_m3s = Ql_m3h / 3600;

  // Superficial velocities
  const Vsg = Qg_m3s / A; // m/s
  const Vsl = Ql_m3s / A; // m/s
  const Vm  = Vsg + Vsl;  // m/s — mixture velocity (homogeneous no-slip)

  // No-slip liquid volume fraction: λL = Vsl / (Vsg + Vsl)
  // NOTE: λL is NOT true in-situ holdup — it is a no-slip screening estimate only.
  //       Actual holdup is higher in stratified/slug flows and requires mechanistic model.
  const lambdaL = Vm > 0 ? Vsl / Vm : 0;

  // Homogeneous mixture density: ρm = ρL·λL + ρG·(1 − λL)
  const mixtureDensity = input.liquidDensity * lambdaL + input.gasDensity * (1 - lambdaL);

  // API RP 14E erosional velocity: Ve = C / √ρm
  // This is a recommended engineering screening limit, not a universal code-compliance limit.
  const erosionalVelocity = input.cFactor / Math.sqrt(mixtureDensity);

  const rhoV2 = mixtureDensity * Vm * Vm;
  const velocityRatio = erosionalVelocity > 0 ? Vm / erosionalVelocity : 0;

  // ── Erosional velocity screening ──────────────────────────────────────────
  if (Vm > erosionalVelocity) {
    warnings.push(
      `Mixture velocity ${Vm.toFixed(2)} m/s exceeds screening erosional velocity of ${erosionalVelocity.toFixed(2)} m/s (Ve = C/√ρm, C = ${input.cFactor}) — consider larger pipe or review fluid properties and C-factor basis. Screening result informed by API RP 14E; verify against project specification.`
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

  // ── Phase fraction screening — softened, no regime prediction ─────────────
  // These are screening observations only; this tool does NOT predict flow regime.
  if (lambdaL > 0.5) {
    warnings.push(
      "Liquid-rich screening result (no-slip liquid fraction λL > 0.5) — significant liquid content; slugging risk and liquid accumulation should be assessed with detailed mechanistic multiphase analysis (e.g. OLGA / PIPESIM). This screening tool does NOT predict actual flow regime."
    );
  } else if (lambdaL < 0.01 && input.liquidActualVolumetricFlow > 0) {
    warnings.push(
      "Gas-dominated screening result (no-slip liquid fraction λL < 0.01) — detailed multiphase analysis recommended to assess mist entrainment and liquid accumulation at low points. This screening tool does NOT predict actual flow regime."
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
// TEST CASE: Wellhead gas-condensate flowline — API RP 14E screening
// Service: Gas-condensate multiphase in 10" Sch 40 CS pipe
// Basis:   ACTUAL gas and liquid volumetric flows at operating P/T (50 bar, 60 °C)
//          Gas: 125 000 kg/h ÷ 25 kg/m³ = 5 000 m³/h actual
//          Liquid: 40 000 kg/h ÷ 800 kg/m³ = 50 m³/h actual
// Expected: Vsg ≈ 2.7 m/s, Vsl ≈ 0.027 m/s, Vm ≈ 2.7 m/s, Ve ≈ 4–6 m/s, ρV² < 10 000 Pa
// ─────────────────────────────────────────────────────────────────────────────
export const MULTIPHASE_TEST_CASE: MultiphaseInput = {
  gasActualVolumetricFlow: 5000,     // m³/h actual at 50 bar, 60 °C
  liquidActualVolumetricFlow: 50,    // m³/h actual at 50 bar, 60 °C
  gasDensity: 25,                    // kg/m³ — actual gas density at operating P/T
  liquidDensity: 800,                // kg/m³ — condensate/water weighted average
  innerDiameter: 254.5,              // mm   — 10" NPS Sch 40 ID (ASME B36.10M)
  cFactor: 100,                      // API RP 14E C-factor — conservative (continuous solids-free)
};
