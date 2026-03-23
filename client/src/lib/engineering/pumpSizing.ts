import { GRAVITY, PI } from "./constants";
import type { CentrifugalPumpInput, PDPumpInput } from "./validation";

export type PumpType = "centrifugal" | "positive_displacement";

export interface PumpCalcStep {
  name: string;
  equation: string;
  substitution: string;
  result: string;
}

export interface PumpCalcTrace {
  steps: PumpCalcStep[];
  intermediateValues: Record<string, number>;
  assumptions: string[];
  warnings: string[];
}

// ─── Shared piping input ──────────────────────────────────────────────────────
// NOTE: dischargeVesselPressure is required for correct centrifugal TDH.
//       It represents the gauge pressure at the liquid destination (receiving vessel).
//       Omitting it assumes destination is atmospheric (0 bar g).
export interface PipingInput {
  flowRate: number;          // m³/h
  liquidDensity: number;     // kg/m³
  viscosity: number;         // cP
  suctionStaticHead: number; // m
  dischargeStaticHead: number; // m
  suctionPipeLength: number;   // m
  dischargePipeLength: number; // m
  suctionPipeDiameter: number;   // mm
  dischargePipeDiameter: number; // mm
  suctionRoughness: number;      // mm
  dischargeRoughness: number;    // mm
  suctionFittingsK: number;
  dischargeFittingsK: number;
  vaporPressure: number;         // kPa (abs)
  atmosphericPressure: number;   // bar (abs)
  suctionVesselPressure: number; // bar (gauge)
  dischargeVesselPressure: number; // bar (gauge) — destination vessel / discharge header
}

export interface PumpSizingInput extends PipingInput {
  pumpEfficiency: number;  // %
  motorEfficiency: number; // %
  pumpSpeed?: number;      // rpm (optional; for specific speed Ns only)
}

export interface PDPumpSizingInput extends PipingInput {
  volumetricEfficiency: number;    // %
  mechanicalEfficiency: number;    // %
  motorEfficiency: number;         // %
  reliefValvePressure: number;     // bar (gauge)
  // ──────────────────────────────────────────────────────────────────────────
  // pumpDifferentialPressure: Required pump ΔP across the pump (bar).
  // This is the pressure difference from pump suction to pump discharge.
  // It is NOT the destination vessel pressure. The solver uses this directly
  // to compute hydraulic power: P_hyd = ΔP × Q.
  // If 0 is entered, ΔP is estimated from piping TDH (screening fallback only).
  // ──────────────────────────────────────────────────────────────────────────
  pumpDifferentialPressure: number; // bar — required pump ΔP
}

export interface PipingResult {
  staticHead: number;
  suctionFrictionLoss: number;
  dischargeFrictionLoss: number;
  suctionVelocityHead: number;
  dischargeVelocityHead: number;
  totalFrictionLoss: number;
  suctionVelocity: number;
  dischargeVelocity: number;
  suctionReynolds: number;
  dischargeReynolds: number;
  npshaAvailable: number;
  suctionFrictionFactor: number;
  dischargeFrictionFactor: number;
}

export interface PumpSizingResult extends PipingResult {
  pumpType: "centrifugal";
  totalDynamicHead: number;
  pressureHeadDifference: number; // m — (P_discharge - P_suction) / (ρg), included in TDH
  hydraulicPower: number;
  brakePower: number;
  motorPower: number;
  warnings: string[];
  trace: PumpCalcTrace;
}

export interface PDPumpSizingResult extends PipingResult {
  pumpType: "positive_displacement";
  totalDynamicHead: number;
  differentialPressure: number;   // bar — pump ΔP used for power calc
  actualDischargePressure: number; // bar (gauge) — suction P + pump ΔP
  theoreticalFlow: number;
  actualFlow: number;
  slip: number;
  hydraulicPower: number;
  shaftPower: number;
  motorPower: number;
  npipAvailable: number;
  volumetricEfficiency: number;
  mechanicalEfficiency: number;
  liquidDensity: number;
  reliefValvePressure: number;
  pumpDifferentialPressure: number;
  warnings: string[];
  trace: PumpCalcTrace;
}

// ─── Friction / hydraulics helpers ───────────────────────────────────────────

function swameeJainFriction(re: number, relativeRoughness: number): number {
  if (re < 2300) {
    return 64 / re;
  }
  const a = relativeRoughness / 3.7;
  const b = 5.74 / Math.pow(re, 0.9);
  const logTerm = Math.log10(a + b);
  return 0.25 / (logTerm * logTerm);
}

function calculateFrictionHead(
  flowRate_m3s: number,
  pipeDiameter_m: number,
  pipeLength_m: number,
  roughness_m: number,
  density: number,
  viscosity_Pa_s: number,
  fittingsK: number
): { frictionHead: number; velocity: number; reynolds: number; frictionFactor: number } {
  const area = (PI / 4) * pipeDiameter_m * pipeDiameter_m;
  const velocity = flowRate_m3s / area;
  const reynolds = (density * velocity * pipeDiameter_m) / viscosity_Pa_s;
  const relativeRoughness = roughness_m / pipeDiameter_m;
  const frictionFactor = swameeJainFriction(reynolds, relativeRoughness);

  const pipeFrictionHead = frictionFactor * (pipeLength_m / pipeDiameter_m) * (velocity * velocity) / (2 * GRAVITY);
  const fittingFrictionHead = fittingsK * (velocity * velocity) / (2 * GRAVITY);
  const frictionHead = pipeFrictionHead + fittingFrictionHead;

  return { frictionHead, velocity, reynolds, frictionFactor };
}

// ─── Shared piping solver ─────────────────────────────────────────────────────

export function calculatePiping(input: PipingInput): PipingResult {
  const flowRate_m3s = input.flowRate / 3600;
  const viscosity_Pa_s = input.viscosity / 1000;

  const suctionDia_m = input.suctionPipeDiameter / 1000;
  const dischargeDia_m = input.dischargePipeDiameter / 1000;
  const suctionRoughness_m = input.suctionRoughness / 1000;
  const dischargeRoughness_m = input.dischargeRoughness / 1000;

  if (suctionDia_m <= 0 || dischargeDia_m <= 0) throw new Error("Pipe diameters must be positive");
  if (flowRate_m3s <= 0) throw new Error("Flow rate must be positive");
  if (input.liquidDensity <= 0) throw new Error("Liquid density must be positive");
  if (input.viscosity <= 0) throw new Error("Liquid viscosity must be positive");
  if (input.suctionPipeLength < 0 || input.dischargePipeLength < 0) throw new Error("Pipe lengths must be non-negative");
  if (input.suctionFittingsK < 0 || input.dischargeFittingsK < 0) throw new Error("Fittings K values must be non-negative");
  if (input.atmosphericPressure <= 0) throw new Error("Atmospheric pressure must be positive");
  if (input.vaporPressure < 0) throw new Error("Vapor pressure must be non-negative");

  const suction = calculateFrictionHead(
    flowRate_m3s, suctionDia_m, input.suctionPipeLength, suctionRoughness_m,
    input.liquidDensity, viscosity_Pa_s, input.suctionFittingsK
  );
  const discharge = calculateFrictionHead(
    flowRate_m3s, dischargeDia_m, input.dischargePipeLength, dischargeRoughness_m,
    input.liquidDensity, viscosity_Pa_s, input.dischargeFittingsK
  );

  const suctionVelocityHead = (suction.velocity * suction.velocity) / (2 * GRAVITY);
  const dischargeVelocityHead = (discharge.velocity * discharge.velocity) / (2 * GRAVITY);
  const staticHead = input.dischargeStaticHead - input.suctionStaticHead;

  const suctionPressureHead = (input.suctionVesselPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const atmosphericHead = (input.atmosphericPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const vaporPressureHead = (input.vaporPressure * 1e3) / (input.liquidDensity * GRAVITY);

  // NPSHa: total energy at pump suction flange above liquid vapor pressure
  const npshaAvailable = atmosphericHead + suctionPressureHead + input.suctionStaticHead
    - suction.frictionHead - vaporPressureHead;

  return {
    staticHead,
    suctionFrictionLoss: suction.frictionHead,
    dischargeFrictionLoss: discharge.frictionHead,
    suctionVelocityHead,
    dischargeVelocityHead,
    totalFrictionLoss: suction.frictionHead + discharge.frictionHead,
    suctionVelocity: suction.velocity,
    dischargeVelocity: discharge.velocity,
    suctionReynolds: suction.reynolds,
    dischargeReynolds: discharge.reynolds,
    npshaAvailable,
    suctionFrictionFactor: suction.frictionFactor,
    dischargeFrictionFactor: discharge.frictionFactor,
  };
}

// ─── Shared velocity warnings ─────────────────────────────────────────────────

function addVelocityWarnings(warnings: string[], suctionVelocity: number, dischargeVelocity: number) {
  if (suctionVelocity > 2.0) {
    warnings.push(`Suction velocity ${suctionVelocity.toFixed(2)} m/s exceeds 2.0 m/s — elevated cavitation risk. Consider increasing suction pipe size or reducing fittings losses.`);
  } else if (suctionVelocity > 1.5) {
    warnings.push(`Suction velocity ${suctionVelocity.toFixed(2)} m/s approaching 2.0 m/s guidance limit — verify NPSHa margin against vendor NPSHr is adequate.`);
  }
  if (suctionVelocity > 0 && suctionVelocity < 0.5) {
    warnings.push(`Suction velocity ${suctionVelocity.toFixed(2)} m/s below 0.5 m/s — settling/deposition risk for fluids containing solids or heavy components.`);
  }
  if (dischargeVelocity > 5.0) {
    warnings.push(`Discharge velocity ${dischargeVelocity.toFixed(2)} m/s exceeds 5.0 m/s — erosion risk; consider increasing discharge pipe size.`);
  } else if (dischargeVelocity > 3.5) {
    warnings.push(`Discharge velocity ${dischargeVelocity.toFixed(2)} m/s — verify pipe supports for hydraulic forces at elevated velocity.`);
  }
  if (dischargeVelocity > 0 && dischargeVelocity < 1.0) {
    warnings.push(`Discharge velocity ${dischargeVelocity.toFixed(2)} m/s below 1.0 m/s — settling/deposition risk.`);
  }
}

// ─── Centrifugal pump solver ──────────────────────────────────────────────────

/**
 * calculatePumpSizing — Preliminary Centrifugal Pump Hydraulic & Power Screening
 *
 * SCOPE: Preliminary / FEED screening of centrifugal pump hydraulic requirements.
 * NOT a substitute for vendor selection, vendor curves, detailed hydraulic
 * network analysis, or formal API 610 compliance verification.
 *
 * TDH FORMULA (full Bernoulli-based):
 *   TDH = (z_d - z_s) + h_f_total + (v_d² - v_s²)/(2g) + (P_d - P_s)/(ρg)
 *
 * NPSH: Only NPSHa is calculated. NPSHr is a vendor pump curve property and
 *   is NOT computed here. Always compare NPSHa against vendor NPSHr plus the
 *   required project/company margin before equipment selection.
 */
export function calculatePumpSizing(input: PumpSizingInput): PumpSizingResult {
  const warnings: string[] = [];

  if (input.pumpEfficiency <= 0 || input.pumpEfficiency > 100) {
    throw new Error("Pump efficiency must be between 0 and 100%");
  }
  if (input.motorEfficiency <= 0 || input.motorEfficiency > 100) {
    throw new Error("Motor efficiency must be between 0 and 100%");
  }

  const piping = calculatePiping(input);
  const flowRate_m3s = input.flowRate / 3600;

  // ─────────────────────────────────────────────────────────────────────────
  // TOTAL DYNAMIC HEAD — full Bernoulli basis including destination pressure
  // TDH = Δz + hf_total + Δhv + (P_discharge - P_suction) / (ρg)
  // P_discharge and P_suction are vessel gauge pressures (bar g)
  // ─────────────────────────────────────────────────────────────────────────
  const velocityHeadDiff = piping.dischargeVelocityHead - piping.suctionVelocityHead;
  const pressureHeadDiff = ((input.dischargeVesselPressure - input.suctionVesselPressure) * 1e5)
    / (input.liquidDensity * GRAVITY);
  const totalDynamicHead = piping.staticHead + piping.totalFrictionLoss + velocityHeadDiff + pressureHeadDiff;

  const hydraulicPower = (input.liquidDensity * GRAVITY * totalDynamicHead * flowRate_m3s) / 1000;
  const pumpEff = input.pumpEfficiency / 100;
  const motorEff = input.motorEfficiency / 100;
  const brakePower = hydraulicPower / pumpEff;
  const motorPower = brakePower / motorEff;

  addVelocityWarnings(warnings, piping.suctionVelocity, piping.dischargeVelocity);

  // ── NPSHa screening — does NOT substitute vendor NPSHr comparison ─────────
  if (piping.npshaAvailable < 0) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m — NEGATIVE. Pump cannot operate; liquid will flash at suction. Increase suction head, reduce suction losses, or lower fluid temperature.`);
  } else if (piping.npshaAvailable < 1.5) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m — critically low. Pump will likely cavitate. This tool provides NPSHa screening only — compare against vendor NPSHr plus required project/company margin before selection.`);
  } else if (piping.npshaAvailable < 3.0) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m — low. Verify against vendor NPSHr plus required project/company margin. This tool does not calculate NPSHr.`);
  }

  if (totalDynamicHead < 0) {
    warnings.push("Negative TDH — liquid may flow by gravity. Check if pump is truly required.");
  }
  if (input.pumpEfficiency < 50) {
    warnings.push(`Low pump efficiency (${input.pumpEfficiency}%) — verify pump selection. Typical centrifugal efficiency at BEP is 60–85% depending on pump type and size.`);
  }
  if (input.pumpEfficiency > 88) {
    warnings.push(`High pump efficiency (${input.pumpEfficiency}%) — verify this is achievable for the selected pump type, size, and BEP. Confirm with vendor curve.`);
  }

  // ── Motor sizing guidance (API-aware, not a guaranteed API compliance check) ─
  const motorMarginPct = brakePower <= 22 ? 25 : (brakePower <= 55 ? 15 : 10);
  const requiredNameplate_kW = brakePower * (1 + motorMarginPct / 100);
  warnings.push(
    `Motor nameplate guidance: ≥ ${requiredNameplate_kW.toFixed(1)} kW ` +
    `(= brake power ${brakePower.toFixed(1)} kW × ${motorMarginPct}% margin — typical driver sizing guidance, ` +
    `API-aware; verify against project specification and selected standard edition). ` +
    `Motor electrical input = ${motorPower.toFixed(1)} kW at η_motor = ${input.motorEfficiency}%.`
  );

  if (input.viscosity > 200) {
    warnings.push(`High viscosity (${input.viscosity.toFixed(0)} cP) — centrifugal pump performance significantly degraded. Positive displacement pump may be more appropriate per HI guidelines.`);
  } else if (input.viscosity > 50) {
    warnings.push(`Elevated viscosity (${input.viscosity.toFixed(0)} cP) — apply HI viscosity correction factors to centrifugal performance. Consider PD pump for better efficiency.`);
  }

  // ── Specific speed — indicative screening only, no type classification ─────
  if (totalDynamicHead > 0 && flowRate_m3s > 0) {
    const speed_rpm = input.pumpSpeed && input.pumpSpeed > 0 ? input.pumpSpeed : 1450;
    const Ns = speed_rpm * Math.sqrt(input.flowRate) / Math.pow(totalDynamicHead, 0.75);
    if (Ns > 0) {
      const speedNote = input.pumpSpeed && input.pumpSpeed > 0 ? `${speed_rpm} rpm` : "1450 rpm assumed";
      warnings.push(
        `Specific speed Ns ≈ ${Ns.toFixed(0)} (n = ${speedNote}, Q in m³/h, H in m) — ` +
        `indicative screening value only; impeller type selection requires vendor confirmation.`
      );
    }
  }

  const trace = buildCentrifugalTrace(input, piping, flowRate_m3s, pressureHeadDiff, totalDynamicHead, hydraulicPower, brakePower, motorPower, warnings);

  return {
    pumpType: "centrifugal",
    totalDynamicHead,
    pressureHeadDifference: pressureHeadDiff,
    ...piping,
    hydraulicPower,
    brakePower,
    motorPower,
    warnings,
    trace,
  };
}

// ─── Positive displacement pump solver ───────────────────────────────────────

/**
 * calculatePDPumpSizing — Preliminary PD Pump Hydraulic & Power Screening
 *
 * SCOPE: Hydraulic / power screening for PD pumps (reciprocating, rotary, diaphragm).
 * NOT full PD pump sizing in the API 674 / API 676 sense.
 * The following are NOT computed: displacement, speed/stroke combination,
 * plunger/piston dimensions, pulsation bottle sizing, acceleration head.
 *
 * DIFFERENTIAL PRESSURE BASIS:
 *   pumpDifferentialPressure = required pressure rise across the pump (bar).
 *   This is the pump ΔP, NOT the destination vessel pressure.
 *   Hydraulic power: P_hyd = ΔP × Q_actual
 *   If pumpDifferentialPressure is 0, ΔP is estimated from piping TDH (screening fallback).
 *
 * RELIEF VALVE CHECK:
 *   Actual discharge-side pressure = suctionVesselPressure + pumpDifferentialPressure.
 *   Relief set point must exceed actual discharge-side operating pressure.
 */
export function calculatePDPumpSizing(input: PDPumpSizingInput): PDPumpSizingResult {
  const warnings: string[] = [];

  if (input.volumetricEfficiency <= 0 || input.volumetricEfficiency > 100) {
    throw new Error("Volumetric efficiency must be between 0 and 100%");
  }
  if (input.mechanicalEfficiency <= 0 || input.mechanicalEfficiency > 100) {
    throw new Error("Mechanical efficiency must be between 0 and 100%");
  }
  if (input.motorEfficiency <= 0 || input.motorEfficiency > 100) {
    throw new Error("Motor efficiency must be between 0 and 100%");
  }

  const piping = calculatePiping(input);
  const flowRate_m3s = input.flowRate / 3600;

  const volEff = input.volumetricEfficiency / 100;
  const mechEff = input.mechanicalEfficiency / 100;
  const motorEff = input.motorEfficiency / 100;

  const theoreticalFlow = input.flowRate / volEff;
  const actualFlow = input.flowRate;
  const slip = theoreticalFlow - actualFlow;

  const velocityHeadDiff = piping.dischargeVelocityHead - piping.suctionVelocityHead;
  const totalDynamicHead = piping.staticHead + piping.totalFrictionLoss + velocityHeadDiff;

  // ── Pump ΔP: user-specified (preferred) or TDH-derived fallback ───────────
  const differentialPressure = input.pumpDifferentialPressure > 0
    ? input.pumpDifferentialPressure
    : (input.liquidDensity * GRAVITY * totalDynamicHead) / 1e5;

  // Actual discharge-side pressure (for relief valve comparison)
  const actualDischargePressure = input.suctionVesselPressure + differentialPressure;

  const hydraulicPower = (differentialPressure * 1e5 * flowRate_m3s) / 1000;
  const shaftPower = hydraulicPower / mechEff;
  const motorPower = shaftPower / motorEff;

  const npipAvailable = (piping.npshaAvailable * input.liquidDensity * GRAVITY) / 1000;

  addVelocityWarnings(warnings, piping.suctionVelocity, piping.dischargeVelocity);

  // ── SCOPE DISCLOSURE ──────────────────────────────────────────────────────
  warnings.push(
    "PD Pump Screening: this tool performs hydraulic / power screening only. " +
    "Displacement, stroke/speed selection, plunger dimensions, pulsation bottles, " +
    "and acceleration head are NOT calculated. " +
    "Full PD pump design requires vendor quotation and API 674/676 engineering."
  );

  // ── NPSHa / NPIPa screening ───────────────────────────────────────────────
  if (piping.npshaAvailable < 0) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m (NPIPa = ${npipAvailable.toFixed(1)} kPa) — NEGATIVE. Pump cannot operate; increase suction head or reduce suction losses.`);
  } else if (piping.npshaAvailable < 1.5) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m (NPIPa = ${npipAvailable.toFixed(1)} kPa) — low. This tool provides NPSHa screening only. Compare against vendor NPIPr (API 674/676); pulsation effects further reduce effective NPIP at suction.`);
  } else if (piping.npshaAvailable < 3.0) {
    warnings.push(`NPSHa = ${piping.npshaAvailable.toFixed(2)} m (NPIPa = ${npipAvailable.toFixed(1)} kPa) — verify against vendor NPIPr plus margin. Acceleration head in suction piping is NOT calculated here.`);
  }

  // ── Relief valve check (vs. actual discharge-side pressure) ───────────────
  if (input.reliefValvePressure > 0) {
    const reliefBar = input.reliefValvePressure;
    // Compare against actual discharge-side pressure = suction + pump ΔP
    if (reliefBar < actualDischargePressure * 1.1) {
      warnings.push(
        `Relief valve set pressure (${reliefBar.toFixed(1)} bar g) < 110% of estimated actual discharge pressure ` +
        `(${actualDischargePressure.toFixed(1)} bar g = suction ${input.suctionVesselPressure.toFixed(1)} + pump ΔP ${differentialPressure.toFixed(1)} bar). ` +
        `Relief valve may lift during normal operation. Set relief ≥ 110% of max discharge-side pressure.`
      );
    }
    if (reliefBar > actualDischargePressure * 1.5) {
      warnings.push(
        `Relief valve set pressure (${reliefBar.toFixed(1)} bar g) is ${((reliefBar / actualDischargePressure) * 100).toFixed(0)}% of operating discharge pressure — ` +
        `verify piping class and vessel ratings can withstand the relief pressure.`
      );
    }
  } else {
    warnings.push("No relief valve specified — a relief valve is MANDATORY for positive displacement pumps to prevent deadhead overpressure. Verify requirements per applicable standards (API 674 / API 676 / project specification).");
  }

  if (differentialPressure > 100) {
    warnings.push(`High pump ΔP (${differentialPressure.toFixed(1)} bar) — verify pump pressure rating, shaft/packing design, and piping class per project specification and API 674/676.`);
  }
  if (input.volumetricEfficiency < 80) {
    warnings.push(`Low volumetric efficiency (${input.volumetricEfficiency}%) — excessive internal leakage; verify wear rings, clearances, and pump condition.`);
  }
  if (totalDynamicHead < 0) {
    warnings.push("Negative TDH from piping — liquid may flow by gravity. Check pump ΔP basis.");
  }

  warnings.push("Acceleration head in suction piping is NOT included in this screening — assess pulsation effects with vendor for reciprocating PD pumps per API 674.");

  if (input.viscosity > 500) {
    warnings.push(`Very high viscosity (${input.viscosity.toFixed(0)} cP) — PD pump appropriate but verify driver sizing includes viscous power requirement. Heating/tracing may reduce viscosity.`);
  }

  // ── Motor sizing guidance ─────────────────────────────────────────────────
  const pdMotorMarginPct = shaftPower <= 22 ? 25 : (shaftPower <= 55 ? 15 : 10);
  const pdRequiredNameplate_kW = shaftPower * (1 + pdMotorMarginPct / 100);
  warnings.push(
    `Motor nameplate guidance: ≥ ${pdRequiredNameplate_kW.toFixed(1)} kW ` +
    `(= shaft power ${shaftPower.toFixed(1)} kW × ${pdMotorMarginPct}% margin — typical driver sizing guidance, ` +
    `API-aware; verify against project specification). ` +
    `Motor electrical input = ${motorPower.toFixed(1)} kW at η_motor = ${input.motorEfficiency}%.`
  );

  const trace = buildPDTrace(input, piping, flowRate_m3s, totalDynamicHead, differentialPressure, actualDischargePressure, theoreticalFlow, slip, hydraulicPower, shaftPower, motorPower, npipAvailable, warnings);

  return {
    pumpType: "positive_displacement",
    totalDynamicHead,
    differentialPressure,
    actualDischargePressure,
    theoreticalFlow,
    actualFlow,
    slip,
    ...piping,
    hydraulicPower,
    shaftPower,
    motorPower,
    npipAvailable,
    volumetricEfficiency: input.volumetricEfficiency,
    mechanicalEfficiency: input.mechanicalEfficiency,
    liquidDensity: input.liquidDensity,
    reliefValvePressure: input.reliefValvePressure,
    pumpDifferentialPressure: input.pumpDifferentialPressure,
    warnings,
    trace,
  };
}

// ─── Trace builders ───────────────────────────────────────────────────────────

function buildPipingTraceSteps(
  input: PipingInput,
  piping: PipingResult,
  flowRate_m3s: number,
  side: "Suction" | "Discharge"
): PumpCalcStep[] {
  const steps: PumpCalcStep[] = [];
  const isSuction = side === "Suction";
  const dia_mm = isSuction ? input.suctionPipeDiameter : input.dischargePipeDiameter;
  const dia_m = dia_mm / 1000;
  const length = isSuction ? input.suctionPipeLength : input.dischargePipeLength;
  const roughness_mm = isSuction ? input.suctionRoughness : input.dischargeRoughness;
  const roughness_m = roughness_mm / 1000;
  const fittingsK = isSuction ? input.suctionFittingsK : input.dischargeFittingsK;
  const velocity = isSuction ? piping.suctionVelocity : piping.dischargeVelocity;
  const reynolds = isSuction ? piping.suctionReynolds : piping.dischargeReynolds;
  const frictionFactor = isSuction ? piping.suctionFrictionFactor : piping.dischargeFrictionFactor;
  const frictionLoss = isSuction ? piping.suctionFrictionLoss : piping.dischargeFrictionLoss;
  const velocityHead = isSuction ? piping.suctionVelocityHead : piping.dischargeVelocityHead;
  const area = (PI / 4) * dia_m * dia_m;
  const relativeRoughness = roughness_m / dia_m;

  steps.push({
    name: `${side} Velocity`,
    equation: "v = Q / A = Q / (\u03C0/4 \u00D7 D\u00B2)",
    substitution: `${flowRate_m3s.toFixed(6)} / (\u03C0/4 \u00D7 ${dia_m.toFixed(5)}\u00B2) = ${flowRate_m3s.toFixed(6)} / ${area.toFixed(6)}`,
    result: `${velocity.toFixed(4)} m/s`,
  });
  steps.push({
    name: `${side} Reynolds Number`,
    equation: "Re = \u03C1 \u00D7 v \u00D7 D / \u03BC",
    substitution: `${input.liquidDensity.toFixed(1)} \u00D7 ${velocity.toFixed(4)} \u00D7 ${dia_m.toFixed(5)} / ${(input.viscosity / 1000).toFixed(6)}`,
    result: `${reynolds.toFixed(0)}`,
  });
  if (reynolds < 2300) {
    steps.push({
      name: `${side} Friction Factor (Laminar)`,
      equation: "f = 64 / Re",
      substitution: `64 / ${reynolds.toFixed(0)}`,
      result: `${frictionFactor.toFixed(6)}`,
    });
  } else {
    steps.push({
      name: `${side} Friction Factor (Swamee-Jain)`,
      equation: "f = 0.25 / [log\u2081\u2080(\u03B5/3.7D + 5.74/Re\u2070\u00B7\u2079)]\u00B2",
      substitution: `0.25 / [log\u2081\u2080(${relativeRoughness.toFixed(8)}/3.7 + 5.74/${reynolds.toFixed(0)}\u2070\u00B7\u2079)]\u00B2`,
      result: `${frictionFactor.toFixed(6)}`,
    });
  }
  steps.push({
    name: `${side} Friction Head (Darcy-Weisbach)`,
    equation: "h_f = f \u00D7 (L/D) \u00D7 v\u00B2/(2g) + K \u00D7 v\u00B2/(2g)",
    substitution: `${frictionFactor.toFixed(6)} \u00D7 (${length.toFixed(1)}/${dia_m.toFixed(5)}) \u00D7 ${velocity.toFixed(4)}\u00B2/(2\u00D7${GRAVITY}) + ${fittingsK.toFixed(1)} \u00D7 ${velocity.toFixed(4)}\u00B2/(2\u00D7${GRAVITY})`,
    result: `${frictionLoss.toFixed(4)} m`,
  });
  steps.push({
    name: `${side} Velocity Head`,
    equation: "h_v = v\u00B2 / (2g)",
    substitution: `${velocity.toFixed(4)}\u00B2 / (2 \u00D7 ${GRAVITY})`,
    result: `${velocityHead.toFixed(4)} m`,
  });

  return steps;
}

function buildCentrifugalTrace(
  input: PumpSizingInput,
  piping: PipingResult,
  flowRate_m3s: number,
  pressureHeadDiff: number,
  totalDynamicHead: number,
  hydraulicPower: number,
  brakePower: number,
  motorPower: number,
  warnings: string[]
): PumpCalcTrace {
  const steps: PumpCalcStep[] = [];
  const assumptions: string[] = [
    "PRELIMINARY HYDRAULIC / POWER SCREENING — not a substitute for vendor selection or detailed hydraulic network analysis",
    "Steady-state, incompressible liquid flow",
    "Pipe is full (no two-phase flow)",
    "Friction factor per Swamee-Jain (turbulent) or 64/Re (laminar) — Darcy-Weisbach",
    "Fittings losses modeled via resistance coefficient (K) method (Crane TP-410)",
    "TDH includes elevation, friction, velocity head, AND destination pressure head — full Bernoulli basis",
    "NPSHa calculated from suction-side energy balance — NPSHr is a vendor property and is NOT computed here",
    "No pump curve, BEP matching, or off-BEP derating performed",
    "Motor margin is typical driver sizing guidance — verify against project specification and selected motor standard",
    "Specific speed Ns is an indicative screening value — impeller type selection requires vendor confirmation",
  ];

  steps.push(...buildPipingTraceSteps(input, piping, flowRate_m3s, "Suction"));
  steps.push(...buildPipingTraceSteps(input, piping, flowRate_m3s, "Discharge"));

  steps.push({
    name: "Static Head",
    equation: "H_static = z_discharge - z_suction",
    substitution: `${input.dischargeStaticHead.toFixed(2)} - ${input.suctionStaticHead.toFixed(2)}`,
    result: `${piping.staticHead.toFixed(4)} m`,
  });

  const pressureDiff = input.dischargeVesselPressure - input.suctionVesselPressure;
  steps.push({
    name: "Destination Pressure Head Difference",
    equation: "(P_discharge_vessel \u2212 P_suction_vessel) \u00D7 10\u2075 / (\u03C1 \u00D7 g)",
    substitution: `(${input.dischargeVesselPressure.toFixed(3)} \u2212 ${input.suctionVesselPressure.toFixed(3)}) \u00D7 100000 / (${input.liquidDensity.toFixed(1)} \u00D7 ${GRAVITY})`,
    result: `${pressureHeadDiff.toFixed(4)} m`,
  });

  const velocityHeadDiff = piping.dischargeVelocityHead - piping.suctionVelocityHead;
  steps.push({
    name: "Total Dynamic Head (TDH)",
    equation: "TDH = H_static + h_f_total + \u0394h_v + (P_d \u2212 P_s)/(\u03C1g)",
    substitution: `${piping.staticHead.toFixed(4)} + ${piping.totalFrictionLoss.toFixed(4)} + (${piping.dischargeVelocityHead.toFixed(4)} \u2212 ${piping.suctionVelocityHead.toFixed(4)}) + ${pressureHeadDiff.toFixed(4)}`,
    result: `${totalDynamicHead.toFixed(4)} m`,
  });

  const suctionPressureHead = (input.suctionVesselPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const atmosphericHead = (input.atmosphericPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const vaporPressureHead = (input.vaporPressure * 1e3) / (input.liquidDensity * GRAVITY);
  steps.push({
    name: "NPSHa (Net Positive Suction Head Available)",
    equation: "NPSHa = P_atm/(\u03C1g) + P_vessel/(\u03C1g) + z_s \u2212 h_f_s \u2212 P_vap/(\u03C1g)",
    substitution: `${atmosphericHead.toFixed(4)} + ${suctionPressureHead.toFixed(4)} + ${input.suctionStaticHead.toFixed(2)} \u2212 ${piping.suctionFrictionLoss.toFixed(4)} \u2212 ${vaporPressureHead.toFixed(4)}`,
    result: `${piping.npshaAvailable.toFixed(4)} m`,
  });

  steps.push({
    name: "Hydraulic Power",
    equation: "P_hyd = \u03C1 \u00D7 g \u00D7 TDH \u00D7 Q / 1000",
    substitution: `${input.liquidDensity.toFixed(1)} \u00D7 ${GRAVITY} \u00D7 ${totalDynamicHead.toFixed(4)} \u00D7 ${flowRate_m3s.toFixed(6)} / 1000`,
    result: `${hydraulicPower.toFixed(4)} kW`,
  });
  steps.push({
    name: "Brake Power",
    equation: "P_brake = P_hyd / \u03B7_pump",
    substitution: `${hydraulicPower.toFixed(4)} / ${(input.pumpEfficiency / 100).toFixed(4)}`,
    result: `${brakePower.toFixed(4)} kW`,
  });
  steps.push({
    name: "Motor Power",
    equation: "P_motor = P_brake / \u03B7_motor",
    substitution: `${brakePower.toFixed(4)} / ${(input.motorEfficiency / 100).toFixed(4)}`,
    result: `${motorPower.toFixed(4)} kW`,
  });

  return {
    steps,
    intermediateValues: {
      flowRate_m3s, pressureHeadDiff,
      suctionVelocity: piping.suctionVelocity, dischargeVelocity: piping.dischargeVelocity,
      suctionReynolds: piping.suctionReynolds, dischargeReynolds: piping.dischargeReynolds,
      suctionFrictionFactor: piping.suctionFrictionFactor, dischargeFrictionFactor: piping.dischargeFrictionFactor,
      suctionFrictionLoss: piping.suctionFrictionLoss, dischargeFrictionLoss: piping.dischargeFrictionLoss,
      staticHead: piping.staticHead, totalFrictionLoss: piping.totalFrictionLoss,
      totalDynamicHead, npshaAvailable: piping.npshaAvailable,
      hydraulicPower, brakePower, motorPower,
    },
    assumptions,
    warnings: [...warnings],
  };
}

function buildPDTrace(
  input: PDPumpSizingInput,
  piping: PipingResult,
  flowRate_m3s: number,
  totalDynamicHead: number,
  differentialPressure: number,
  actualDischargePressure: number,
  theoreticalFlow: number,
  slip: number,
  hydraulicPower: number,
  shaftPower: number,
  motorPower: number,
  npipAvailable: number,
  warnings: string[]
): PumpCalcTrace {
  const steps: PumpCalcStep[] = [];
  const assumptions: string[] = [
    "HYDRAULIC / POWER SCREENING ONLY — not full PD pump sizing per API 674/676",
    "Displacement, stroke/speed selection, plunger/piston dimensions, pulsation bottle sizing, and acceleration head are NOT computed",
    "Steady-state, incompressible liquid flow",
    "Friction factor per Swamee-Jain (turbulent) or 64/Re (laminar) — Darcy-Weisbach",
    "Fittings losses modeled via resistance coefficient (K) method (Crane TP-410)",
    "pumpDifferentialPressure = required pressure rise across the pump (bar) — NOT destination vessel pressure",
    "Actual discharge-side pressure = suctionVesselPressure + pumpDifferentialPressure",
    "Relief valve check basis: actual discharge-side pressure (suction + pump ΔP); simplified — verify piping arrangement with responsible engineer",
    "Hydraulic power = pump ΔP × actual delivered volumetric flow",
    "NPSHa screening only — NPIPr is a vendor property; acceleration head in suction piping is NOT included",
    "Motor margin is typical driver sizing guidance — verify against project specification",
  ];

  steps.push(...buildPipingTraceSteps(input, piping, flowRate_m3s, "Suction"));
  steps.push(...buildPipingTraceSteps(input, piping, flowRate_m3s, "Discharge"));

  steps.push({
    name: "Static Head",
    equation: "H_static = z_discharge - z_suction",
    substitution: `${input.dischargeStaticHead.toFixed(2)} - ${input.suctionStaticHead.toFixed(2)}`,
    result: `${piping.staticHead.toFixed(4)} m`,
  });

  const velocityHeadDiff = piping.dischargeVelocityHead - piping.suctionVelocityHead;
  steps.push({
    name: "Total Dynamic Head (from piping — informational)",
    equation: "TDH = H_static + h_f_total + (h_v_d - h_v_s)",
    substitution: `${piping.staticHead.toFixed(4)} + ${piping.totalFrictionLoss.toFixed(4)} + (${piping.dischargeVelocityHead.toFixed(4)} - ${piping.suctionVelocityHead.toFixed(4)})`,
    result: `${totalDynamicHead.toFixed(4)} m`,
  });

  const volEff = input.volumetricEfficiency / 100;
  steps.push({
    name: "Slip (Volumetric Loss)",
    equation: "Q_slip = Q_theoretical - Q_actual = Q_actual/\u03B7_vol - Q_actual",
    substitution: `${input.flowRate.toFixed(2)}/${volEff.toFixed(4)} - ${input.flowRate.toFixed(2)} = ${theoreticalFlow.toFixed(4)} - ${input.flowRate.toFixed(2)}`,
    result: `${slip.toFixed(4)} m\u00B3/h`,
  });

  if (input.pumpDifferentialPressure > 0) {
    steps.push({
      name: "Pump Differential Pressure (user-specified)",
      equation: "\u0394P = pumpDifferentialPressure [user input]",
      substitution: `${input.pumpDifferentialPressure.toFixed(2)} bar`,
      result: `${differentialPressure.toFixed(4)} bar`,
    });
  } else {
    steps.push({
      name: "Pump Differential Pressure (screening fallback from TDH)",
      equation: "\u0394P = \u03C1 \u00D7 g \u00D7 TDH / 1\u00D710\u2075",
      substitution: `${input.liquidDensity.toFixed(1)} \u00D7 ${GRAVITY} \u00D7 ${totalDynamicHead.toFixed(4)} / 100000`,
      result: `${differentialPressure.toFixed(4)} bar`,
    });
  }

  steps.push({
    name: "Actual Discharge-Side Pressure",
    equation: "P_discharge = P_suction_vessel + \u0394P",
    substitution: `${input.suctionVesselPressure.toFixed(3)} + ${differentialPressure.toFixed(4)}`,
    result: `${actualDischargePressure.toFixed(4)} bar g`,
  });

  const suctionPressureHead = (input.suctionVesselPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const atmosphericHead = (input.atmosphericPressure * 1e5) / (input.liquidDensity * GRAVITY);
  const vaporPressureHead = (input.vaporPressure * 1e3) / (input.liquidDensity * GRAVITY);
  steps.push({
    name: "NPSHa",
    equation: "NPSHa = P_atm/(\u03C1g) + P_vessel/(\u03C1g) + z_s - h_f_s - P_vap/(\u03C1g)",
    substitution: `${atmosphericHead.toFixed(4)} + ${suctionPressureHead.toFixed(4)} + ${input.suctionStaticHead.toFixed(2)} - ${piping.suctionFrictionLoss.toFixed(4)} - ${vaporPressureHead.toFixed(4)}`,
    result: `${piping.npshaAvailable.toFixed(4)} m`,
  });
  steps.push({
    name: "NPIPa (Net Positive Inlet Pressure)",
    equation: "NPIPa = NPSHa \u00D7 \u03C1 \u00D7 g / 1000",
    substitution: `${piping.npshaAvailable.toFixed(4)} \u00D7 ${input.liquidDensity.toFixed(1)} \u00D7 ${GRAVITY} / 1000`,
    result: `${npipAvailable.toFixed(4)} kPa`,
  });
  steps.push({
    name: "Hydraulic Power",
    equation: "P_hyd = \u0394P \u00D7 10\u2075 \u00D7 Q_actual / 1000",
    substitution: `${differentialPressure.toFixed(4)} \u00D7 100000 \u00D7 ${flowRate_m3s.toFixed(6)} / 1000`,
    result: `${hydraulicPower.toFixed(4)} kW`,
  });

  const mechEff = input.mechanicalEfficiency / 100;
  const motorEff = input.motorEfficiency / 100;
  steps.push({
    name: "Shaft Power",
    equation: "P_shaft = P_hyd / \u03B7_mech",
    substitution: `${hydraulicPower.toFixed(4)} / ${mechEff.toFixed(4)}`,
    result: `${shaftPower.toFixed(4)} kW`,
  });
  steps.push({
    name: "Motor Power",
    equation: "P_motor = P_shaft / \u03B7_motor",
    substitution: `${shaftPower.toFixed(4)} / ${motorEff.toFixed(4)}`,
    result: `${motorPower.toFixed(4)} kW`,
  });

  return {
    steps,
    intermediateValues: {
      flowRate_m3s, differentialPressure, actualDischargePressure,
      suctionVelocity: piping.suctionVelocity, dischargeVelocity: piping.dischargeVelocity,
      suctionReynolds: piping.suctionReynolds, dischargeReynolds: piping.dischargeReynolds,
      suctionFrictionFactor: piping.suctionFrictionFactor, dischargeFrictionFactor: piping.dischargeFrictionFactor,
      suctionFrictionLoss: piping.suctionFrictionLoss, dischargeFrictionLoss: piping.dischargeFrictionLoss,
      staticHead: piping.staticHead, totalFrictionLoss: piping.totalFrictionLoss,
      totalDynamicHead, theoreticalFlow, slip,
      npshaAvailable: piping.npshaAvailable, npipAvailable,
      hydraulicPower, shaftPower, motorPower,
    },
    assumptions,
    warnings: [...warnings],
  };
}

// ─── Test cases ───────────────────────────────────────────────────────────────

// Cooling water centrifugal pump — per Hydraulic Institute Standards (HI 14.6)
// Service: open-circuit cooling water at 20°C, 8" suction / 6" discharge CS pipe
// Destination: cooling tower basin at atmospheric (0 bar g) → P_dest head = 0
// Expected: TDH ~35–45 m, NPSHa > 3 m, efficiency ~70–80%
export const PUMP_SIZING_TEST_CASE: PumpSizingInput = {
  flowRate: 150,                // m³/h
  liquidDensity: 998.2,         // kg/m³ — water at 20°C (NIST)
  viscosity: 1.002,             // cP — water at 20°C
  suctionStaticHead: 3,         // m — tank level to pump centerline
  dischargeStaticHead: 30,      // m — pipe rack + vessel nozzle elevation
  suctionPipeLength: 5,         // m — short suction (HI recommendation)
  dischargePipeLength: 150,     // m — run to cooling tower / exchangers
  suctionPipeDiameter: 202.74,  // mm — 8" NPS Sch 40 (ASME B36.10)
  dischargePipeDiameter: 154.08,// mm — 6" NPS Sch 40 (ASME B36.10)
  suctionRoughness: 0.0457,     // mm — commercial carbon steel
  dischargeRoughness: 0.0457,   // mm — commercial carbon steel
  suctionFittingsK: 1.5,        // Σk — gate valve + 90° elbow + strainer
  dischargeFittingsK: 8.0,      // Σk — check valve + globe valve + 4× elbows
  pumpEfficiency: 75,           // % — typical centrifugal BEP
  motorEfficiency: 95,          // % — NEMA premium efficiency motor
  vaporPressure: 2.338,         // kPa — water at 20°C
  atmosphericPressure: 1.01325, // bara — sea level
  suctionVesselPressure: 0,     // bar g — atmospheric open tank
  dischargeVesselPressure: 0,   // bar g — cooling tower basin at atmosphere
};

// Crude oil PD pump — API 674 / 676 hydraulic / power screening
// Service: medium crude transfer/injection, reciprocating or gear pump
// Expected: pump ΔP ~10 bar, shaft power sizing
export const PD_PUMP_TEST_CASE: PDPumpSizingInput = {
  flowRate: 25,                  // m³/h — delivered actual flow
  liquidDensity: 900,            // kg/m³ — medium crude (API 25°)
  viscosity: 15.0,               // cP — crude at 40°C
  suctionStaticHead: 2,          // m — positive head from charge pump
  dischargeStaticHead: 10,       // m — discharge vessel elevation
  suctionPipeLength: 3,          // m — short suction
  dischargePipeLength: 50,       // m — run to injection point
  suctionPipeDiameter: 102.26,   // mm — 4" NPS Sch 40 (ASME B36.10)
  dischargePipeDiameter: 77.92,  // mm — 3" NPS Sch 40 (ASME B36.10)
  suctionRoughness: 0.0457,      // mm — commercial carbon steel
  dischargeRoughness: 0.0457,    // mm — commercial carbon steel
  suctionFittingsK: 1.0,         // Σk — gate valve + elbow
  dischargeFittingsK: 5.0,       // Σk — check valve + globe valve + elbows
  volumetricEfficiency: 90,      // % — typical PD pump
  mechanicalEfficiency: 85,      // % — gear/bearing losses
  motorEfficiency: 95,           // % — NEMA premium efficiency motor
  vaporPressure: 20,             // kPa — crude oil approximate vapor pressure
  atmosphericPressure: 1.01325,  // bara — sea level
  suctionVesselPressure: 0.5,    // bar g — pressurized suction vessel
  dischargeVesselPressure: 5,    // bar g — pressurized discharge/receiving vessel
  reliefValvePressure: 15,       // bar g — safety relief on discharge piping
  pumpDifferentialPressure: 10,  // bar — required pump ΔP (across pump only)
};
