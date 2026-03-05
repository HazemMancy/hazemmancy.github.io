/**
 * Control Valve Sizing — Cv Calculator (IEC 60534 / ISA S75)
 *
 * 7-Tab Wizard Engine:
 *   Tab 1: Project Setup
 *   Tab 2: Service Data (liquid / gas-vapor / steam, min/normal/max operating points)
 *   Tab 3: Valve Type & Installation
 *   Tab 4: Sizing Calculations (per-point Cv, choked checks, viscosity correction)
 *   Tab 5: Valve Selection & Rating (opening %, rangeability, authority)
 *   Tab 6: Cavitation / Flashing / Noise Risk
 *   Tab 7: Results & Recommendations
 *
 * Equations (IEC 60534-2-1):
 *   Liquid:  Cv = Q / (N1 × Fp × √(ΔP / Gf))
 *   Gas:     W  = N8 × Fp × Cv × Y × √(x × MW × P1 / (T × Z))
 *   Choked liquid: ΔP_choked = FL² × (P1 - FF × Pv)
 *   FF = 0.96 - 0.28 × √(Pv / Pc)
 *   Gas expansion: Y = 1 - x/(3 × Fk × xT × Fp²)
 *   Fk = k / 1.4
 *
 * Reference: IEC 60534-2-1, ISA S75.01, Fisher Control Valve Handbook
 */

// ─── Types ────────────────────────────────────────────────────────────

export type FluidType = "liquid" | "gas" | "steam";
export type ValveStyle = "globe" | "ball" | "butterfly";
export type TrimCharacteristic = "equal_pct" | "linear" | "quick_open";
export type DataQuality = "preliminary" | "typical_vendor" | "confirmed_vendor";

export interface CVProject {
  name: string;
  client: string;
  location: string;
  caseId: string;
  engineer: string;
  date: string;
  dataQuality: DataQuality;
  atmosphericPressure: number;
}

export interface FluidPropsLiquid {
  density: number;
  viscosity: number;
  vaporPressure: number;
  criticalPressure: number;
}

export interface FluidPropsGas {
  molecularWeight: number;
  specificHeatRatio: number;
  compressibilityFactor: number;
  viscosity: number;
  criticalPressure: number;
}

export interface OperatingPoint {
  label: string;
  flowRate: number;
  flowUnit: "volumetric" | "mass";
  upstreamPressure: number;
  downstreamPressure: number;
  temperature: number;
  enabled: boolean;
}

export interface CVServiceData {
  fluidType: FluidType;
  fluidName: string;
  liquidProps: FluidPropsLiquid;
  gasProps: FluidPropsGas;
  operatingPoints: OperatingPoint[];
}

export interface CVValveData {
  style: ValveStyle;
  characteristic: TrimCharacteristic;
  ratedCv: number;
  fl: number;
  xt: number;
  fd: number;
  valveSize: number;
  pipeSize: number;
  rangeability: number;
}

export interface CVInstallation {
  hasReducers: boolean;
  upstreamPipeSize: number;
  downstreamPipeSize: number;
  fpOverride: number;
}

// ─── Results ──────────────────────────────────────────────────────────

export interface CVPointResult {
  label: string;
  cvRequired: number;
  deltaPActual: number;
  deltaPChoked: number;
  isChoked: boolean;
  flowRegime: string;
  fpFactor: number;
  ffFactor: number;
  fkFactor: number;
  xActual: number;
  xChoked: number;
  yFactor: number;
  viscosityCorrection: number;
  openingPercent: number;
  velocity: number;
  warnings: string[];
}

export interface CVSizingResult {
  pointResults: CVPointResult[];
  governingPoint: string;
  governingCv: number;
  warnings: string[];
}

export interface CVSelectionResult {
  ratedCv: number;
  cvRatio: number;
  openings: { label: string; pctOpen: number; cv: number }[];
  minOpening: number;
  maxOpening: number;
  rangeabilityOK: boolean;
  authorityFactor: number;
  warnings: string[];
}

export interface CVRiskAssessment {
  cavitationRisk: "none" | "incipient" | "likely" | "severe";
  flashingRisk: boolean;
  chokedGas: boolean;
  highNoiseRisk: boolean;
  twoPhaseRisk: boolean;
  cavitationIndex: number;
  mitigations: string[];
  warnings: string[];
}

export interface CVFinalResult {
  project: CVProject;
  serviceData: CVServiceData;
  valveData: CVValveData;
  sizingResult: CVSizingResult;
  selectionResult: CVSelectionResult;
  riskAssessment: CVRiskAssessment;
  flags: string[];
  actionItems: string[];
}

// ─── Legacy interfaces (backward compat) ──────────────────────────────

export interface CVLiquidInput {
  flowRate: number;
  liquidDensity: number;
  upstreamPressure: number;
  downstreamPressure: number;
  vaporPressure: number;
  criticalPressure: number;
  pipeSize: number;
  valveSize: number;
  fl: number;
}

export interface CVLiquidResult {
  cvRequired: number;
  cvChoked: number;
  fpFactor: number;
  ffFactor: number;
  deltaPActual: number;
  deltaPChoked: number;
  isChoked: boolean;
  flowRegime: string;
  warnings: string[];
}

export interface CVGasInput {
  massFlowRate: number;
  molecularWeight: number;
  upstreamPressure: number;
  downstreamPressure: number;
  temperature: number;
  compressibilityFactor: number;
  specificHeatRatio: number;
  pipeSize: number;
  valveSize: number;
  xt: number;
}

export interface CVGasResult {
  cvRequired: number;
  xActual: number;
  xChoked: number;
  yFactor: number;
  fkFactor: number;
  fpFactor: number;
  isChoked: boolean;
  warnings: string[];
}

// ─── Constants ────────────────────────────────────────────────────────

const N1_SI = 0.0865;
const N8_SI = 94.8;
const RHO_REF = 999;

const STEAM_PROPS: FluidPropsGas = {
  molecularWeight: 18.015,
  specificHeatRatio: 1.3,
  compressibilityFactor: 0.95,
  viscosity: 0.012,
  criticalPressure: 220.64,
};

const TYPICAL_VALVE_DATA: Record<ValveStyle, { fl: number; xt: number; fd: number; rangeability: number }> = {
  globe: { fl: 0.90, xt: 0.70, fd: 0.46, rangeability: 50 },
  ball: { fl: 0.60, xt: 0.55, fd: 0.10, rangeability: 100 },
  butterfly: { fl: 0.55, xt: 0.45, fd: 0.05, rangeability: 30 },
};

// ─── Helper Functions ─────────────────────────────────────────────────

export function pipingGeometryFactor(pipeSize_mm: number, valveSize_mm: number): number {
  if (valveSize_mm <= 0 || valveSize_mm >= pipeSize_mm) return 1.0;
  const beta = valveSize_mm / pipeSize_mm;
  const sumK = 1.5 * (1 - beta * beta);
  return 1 / Math.sqrt(1 + sumK / 890);
}

function liquidCriticalPressureRatio(Pv_bar: number, Pc_bar: number): number {
  if (Pc_bar <= 0) return 0.96;
  return 0.96 - 0.28 * Math.sqrt(Math.max(0, Pv_bar / Pc_bar));
}

function estimateOpening(
  requiredCv: number,
  ratedCv: number,
  characteristic: TrimCharacteristic,
): number {
  if (ratedCv <= 0 || requiredCv <= 0) return 0;
  const ratio = Math.min(requiredCv / ratedCv, 1.0);
  switch (characteristic) {
    case "equal_pct": return ratio > 0 ? Math.max(0, Math.min(100, 100 + (100 / Math.log(50)) * Math.log(ratio))) : 0;
    case "linear": return ratio * 100;
    case "quick_open": return Math.sqrt(ratio) * 100;
    default: return ratio * 100;
  }
}

function estimateVelocity(
  flowRate: number,
  pipeSize_mm: number,
  fluidType: FluidType,
  density: number,
): number {
  if (pipeSize_mm <= 0) return 0;
  const D_m = pipeSize_mm / 1000;
  const A = Math.PI * D_m * D_m / 4;
  if (A <= 0) return 0;
  if (fluidType === "liquid") {
    return (flowRate / 3600) / A;
  }
  return (flowRate / 3600) / (density * A);
}

// ─── Staged Calculation Functions ─────────────────────────────────────

export function computeLiquidPoint(
  point: OperatingPoint,
  props: FluidPropsLiquid,
  fl: number,
  fp: number,
): CVPointResult {
  const warnings: string[] = [];
  const P1 = point.upstreamPressure;
  const P2 = point.downstreamPressure;
  const dP = P1 - P2;

  if (dP <= 0) throw new Error(`${point.label}: P1 must exceed P2`);
  if (P1 <= 0) throw new Error(`${point.label}: P1 must be positive`);

  const Pv_bar = props.vaporPressure / 100;
  const Pc = props.criticalPressure;
  const FL = fl;
  const FF = liquidCriticalPressureRatio(Pv_bar, Pc);
  const dP_choked = FL * FL * (P1 - FF * Pv_bar);
  const dP_sizing = Math.min(dP, Math.max(dP_choked, 0.001));
  const isChoked = dP >= dP_choked && dP_choked > 0;

  const Q = point.flowRate;
  const Gf = props.density / RHO_REF;
  let Cv = Q / (N1_SI * fp * Math.sqrt(dP_sizing / Gf));

  let viscCorr = 1.0;
  if (props.viscosity > 20) {
    const Rev = N1_SI * fp * Cv * Math.sqrt(dP_sizing / Gf) / (props.viscosity / 1000);
    if (Rev > 0 && Rev < 10000) {
      const FR = Math.min(1.0, 0.026 * Math.pow(Rev, 0.67));
      if (FR > 0) {
        viscCorr = 1 / FR;
        Cv = Cv * viscCorr;
        warnings.push(`Viscosity correction applied (FR=${FR.toFixed(3)}, Rev=${Rev.toFixed(0)})`);
      }
    }
  }

  if (isChoked) warnings.push("Flow is CHOKED — valve at maximum capacity for this ΔP. Increasing ΔP will not increase flow. Consider a larger valve or higher upstream pressure.");
  if (P2 < Pv_bar) warnings.push(`Downstream P (${P2.toFixed(2)} bar) < Pv (${Pv_bar.toFixed(2)} bar) — flashing will occur downstream. Use hardened trim and consider downstream pipe sizing for two-phase flow.`);
  if (FL < 0.5) warnings.push(`Low FL (${FL.toFixed(2)}) — high recovery valve (e.g., butterfly/ball). Verify cavitation limits per IEC 60534-2-2 and consider globe valve for better control.`);
  if (Cv > 10000) warnings.push(`Very large Cv (${Cv.toFixed(0)}) — verify valve can be sourced. Consider parallel valves or larger body size.`);

  const dpRatio = dP / P1;
  if (dpRatio > 0.5 && !isChoked) warnings.push(`High ΔP/P1 ratio (${(dpRatio * 100).toFixed(0)}%) — approaching choked conditions. Review system ΔP budget.`);
  if (dpRatio < 0.02) warnings.push(`Very low ΔP/P1 ratio (${(dpRatio * 100).toFixed(1)}%) — valve may have poor control authority. Consider whether a control valve is appropriate.`);

  const sigma = P1 > Pv_bar ? (P1 - Pv_bar) / (P1 - P2) : 0;
  const FL2 = FL * FL;
  if (sigma > 0 && sigma < FL2 * 1.1 && !isChoked) warnings.push(`Cavitation index σ = ${sigma.toFixed(3)} is near FL² = ${FL2.toFixed(3)} — incipient cavitation risk per IEC 60534-2-2. Consider anti-cavitation trim.`);

  return {
    label: point.label, cvRequired: Cv, deltaPActual: dP, deltaPChoked: dP_choked,
    isChoked, flowRegime: isChoked ? "Choked (Cavitating/Flashing)" : "Normal (Subcritical)",
    fpFactor: fp, ffFactor: FF, fkFactor: 0, xActual: 0, xChoked: 0, yFactor: 1,
    viscosityCorrection: viscCorr, openingPercent: 0, velocity: 0, warnings,
  };
}

export function computeGasPoint(
  point: OperatingPoint,
  props: FluidPropsGas,
  xt: number,
  fp: number,
): CVPointResult {
  const warnings: string[] = [];
  const P1 = point.upstreamPressure;
  const P2 = point.downstreamPressure;
  const dP = P1 - P2;
  const T_K = point.temperature + 273.15;

  if (dP <= 0) throw new Error(`${point.label}: P1 must exceed P2`);
  if (P1 <= 0) throw new Error(`${point.label}: P1 must be positive`);

  const Fk = props.specificHeatRatio / 1.4;
  const x = dP / P1;
  const x_choked = Fk * xt * fp * fp;
  const x_sizing = Math.min(x, x_choked);
  const isChoked = x >= x_choked;

  const Y = 1 - x_sizing / (3 * Fk * xt * fp * fp);

  const W = point.flowUnit === "mass" ? point.flowRate : point.flowRate * props.molecularWeight / 22.414;
  const Cv = W / (N8_SI * fp * Y * Math.sqrt(x_sizing * props.molecularWeight * P1 / (T_K * props.compressibilityFactor)));

  if (isChoked) warnings.push("Flow is CHOKED — critical (sonic) flow at vena contracta. Reducing downstream pressure will not increase flow. Consider multi-stage trim or a larger valve.");
  if (Y < 0.667) warnings.push(`Expansion factor Y = ${Y.toFixed(3)} — valve operating at or near choked limit (Y_min = 0.667 per IEC 60534). Sizing uses choked ΔP.`);
  if (Cv > 10000) warnings.push(`Very large Cv (${Cv.toFixed(0)}) — verify valve availability at this capacity. Consider parallel valve arrangement.`);
  if (x > 0.8) warnings.push(`Very high pressure ratio x = ${x.toFixed(3)} (x/xT = ${(x / (Fk * xt)).toFixed(2)}) — sonic velocity and aerodynamic noise likely. Request vendor noise prediction per IEC 60534-8-3.`);
  if (x > 0.5 && x <= 0.8 && !isChoked) warnings.push(`Elevated pressure ratio x = ${x.toFixed(3)} — verify noise levels per IEC 60534-8-3, especially near personnel areas.`);
  if (x < 0.05) warnings.push(`Very low pressure ratio x = ${x.toFixed(3)} — valve may have poor control resolution. Verify turndown and controllability.`);
  if (props.compressibilityFactor < 0.7) warnings.push(`Low compressibility factor Z = ${props.compressibilityFactor.toFixed(3)} — gas significantly non-ideal. Verify Z with EOS calculation (Peng-Robinson or similar).`);

  const dP_choked_equiv = x > 0 ? dP * x_choked / Math.max(x, 0.001) : 0;
  return {
    label: point.label, cvRequired: Cv, deltaPActual: dP, deltaPChoked: dP_choked_equiv,
    isChoked, flowRegime: isChoked ? "Choked (Critical)" : "Subcritical",
    fpFactor: fp, ffFactor: 0, fkFactor: Fk, xActual: x, xChoked: x_choked, yFactor: Y,
    viscosityCorrection: 1.0, openingPercent: 0, velocity: 0, warnings,
  };
}

export function computeSteamPoint(
  point: OperatingPoint,
  xt: number,
  fp: number,
  customProps?: Partial<FluidPropsGas>,
): CVPointResult {
  const props: FluidPropsGas = { ...STEAM_PROPS, ...customProps };
  const result = computeGasPoint(point, props, xt, fp);
  result.warnings.push("Steam sizing uses approximate properties — verify with steam tables for final design");
  return result;
}

export function computeMultiPointSizing(
  serviceData: CVServiceData,
  valveData: CVValveData,
  installation: CVInstallation,
): CVSizingResult {
  const warnings: string[] = [];
  const fp = installation.fpOverride > 0
    ? installation.fpOverride
    : pipingGeometryFactor(valveData.pipeSize, valveData.valveSize);

  const enabledPoints = serviceData.operatingPoints.filter(p => p.enabled);
  if (enabledPoints.length === 0) throw new Error("At least one operating point must be enabled");

  const pointResults: CVPointResult[] = enabledPoints.map(point => {
    let result: CVPointResult;
    switch (serviceData.fluidType) {
      case "liquid":
        result = computeLiquidPoint(point, serviceData.liquidProps, valveData.fl, fp);
        result.velocity = estimateVelocity(point.flowRate, valveData.pipeSize, "liquid", serviceData.liquidProps.density);
        break;
      case "gas":
        result = computeGasPoint(point, serviceData.gasProps, valveData.xt, fp);
        break;
      case "steam":
        result = computeSteamPoint(point, valveData.xt, fp);
        break;
    }

    if (valveData.ratedCv > 0) {
      result.openingPercent = estimateOpening(result.cvRequired, valveData.ratedCv, valveData.characteristic);
    }
    return result;
  });

  let governingIdx = 0;
  for (let i = 1; i < pointResults.length; i++) {
    if (pointResults[i].cvRequired > pointResults[governingIdx].cvRequired) governingIdx = i;
  }

  const govCv = pointResults[governingIdx].cvRequired;

  if (pointResults.length > 1) {
    const minCv = Math.min(...pointResults.map(p => p.cvRequired));
    const maxCv = govCv;
    if (maxCv > 0 && maxCv / Math.max(minCv, 0.001) > 50) {
      warnings.push("Wide Cv range (>50:1) — consider split-range or two valves");
    }
  }

  return {
    pointResults,
    governingPoint: pointResults[governingIdx].label,
    governingCv: govCv,
    warnings,
  };
}

export function computeValveSelection(
  sizingResult: CVSizingResult,
  valveData: CVValveData,
): CVSelectionResult {
  const warnings: string[] = [];
  const ratedCv = valveData.ratedCv;

  if (ratedCv <= 0) {
    return {
      ratedCv: 0, cvRatio: 0, openings: [], minOpening: 0, maxOpening: 0,
      rangeabilityOK: false, authorityFactor: 0,
      warnings: ["No rated Cv entered — enter vendor valve data for selection check"],
    };
  }

  const cvRatio = sizingResult.governingCv / ratedCv;
  if (cvRatio > 1.0) warnings.push(`Governing Cv (${sizingResult.governingCv.toFixed(1)}) exceeds rated Cv (${ratedCv}) — select larger valve`);
  if (cvRatio > 0.9) warnings.push("Valve operating very close to rated capacity — limited control range");
  if (cvRatio < 0.1) warnings.push("Valve heavily oversized — consider smaller body size");

  const openings = sizingResult.pointResults.map(pr => ({
    label: pr.label,
    pctOpen: estimateOpening(pr.cvRequired, ratedCv, valveData.characteristic),
    cv: pr.cvRequired,
  }));

  const minOpen = Math.min(...openings.map(o => o.pctOpen));
  const maxOpen = Math.max(...openings.map(o => o.pctOpen));

  if (minOpen < 10) warnings.push(`Min opening ${minOpen.toFixed(1)}% — may have poor controllability below 10%`);
  if (maxOpen > 90) warnings.push(`Max opening ${maxOpen.toFixed(1)}% — limited control authority above 90%`);

  const requiredTurndown = openings.length > 1 ? Math.max(...openings.map(o => o.cv)) / Math.max(Math.min(...openings.map(o => o.cv)), 0.001) : 1;
  const rangeabilityOK = requiredTurndown <= valveData.rangeability;
  if (!rangeabilityOK) warnings.push(`Required turndown ${requiredTurndown.toFixed(0)}:1 exceeds valve rangeability ${valveData.rangeability}:1`);

  const normalPt = sizingResult.pointResults.find(p => p.label === "Normal") || sizingResult.pointResults[0];
  const dPValveNormal = normalPt.deltaPActual;
  const dPMaxSystem = Math.max(...sizingResult.pointResults.map(p => p.deltaPActual));
  const dPSystemEstimate = dPMaxSystem * 2;
  const authorityFactor = dPSystemEstimate > 0 ? dPValveNormal / dPSystemEstimate : 0;
  if (authorityFactor < 0.25) warnings.push(`Low valve authority (${(authorityFactor * 100).toFixed(0)}%) — valve may have poor control. Target >25%. (Authority = ΔP_valve_normal / ΔP_system_est)`);

  return { ratedCv, cvRatio, openings, minOpening: minOpen, maxOpening: maxOpen, rangeabilityOK, authorityFactor, warnings };
}

export function computeRiskAssessment(
  serviceData: CVServiceData,
  sizingResult: CVSizingResult,
  valveData: CVValveData,
): CVRiskAssessment {
  const warnings: string[] = [];
  const mitigations: string[] = [];
  let cavitationRisk = "none" as CVRiskAssessment["cavitationRisk"];
  let flashingRisk = false;
  let chokedGas = false;
  let highNoiseRisk = false;
  let twoPhaseRisk = false;
  let cavitationIndex = 0;

  if (serviceData.fluidType === "liquid") {
    const lp = serviceData.liquidProps;
    const Pv_bar = lp.vaporPressure / 100;
    const FL = valveData.fl;
    const FL2 = FL * FL;

    for (const pr of sizingResult.pointResults) {
      const P1 = pr.deltaPActual + (serviceData.operatingPoints.find(p => p.label === pr.label)?.downstreamPressure || 0);
      const P2 = (serviceData.operatingPoints.find(p => p.label === pr.label)?.downstreamPressure || 0);

      if (P2 < Pv_bar) {
        flashingRisk = true;
        warnings.push(`${pr.label}: Flashing likely — P2 (${P2.toFixed(2)} bar) < Pv (${Pv_bar.toFixed(2)} bar). Downstream piping must be sized for two-phase flow.`);
        mitigations.push("Use hardened trim materials (stellite, tungsten carbide) resistant to flashing erosion per IEC 60534-2-4");
        mitigations.push("Consider relocating valve to increase downstream backpressure");
        mitigations.push("Size downstream piping for two-phase (flashing) service with velocity limits");
      }

      const sigma = (P1 > Pv_bar && P1 > P2) ? (P1 - Pv_bar) / (P1 - P2) : 0;
      if (sigma > 0) cavitationIndex = sigma;

      if (sigma > 0 && sigma < FL2 * 1.1 && sigma >= FL2 * 0.9) {
        cavitationRisk = cavitationRisk === "severe" || cavitationRisk === "likely" ? cavitationRisk : "incipient";
        warnings.push(`${pr.label}: Incipient cavitation risk — σ = ${sigma.toFixed(3)} near FL² = ${FL2.toFixed(3)} per IEC 60534-2-2`);
        mitigations.push("Monitor vibration and noise during commissioning; consider anti-cavitation trim");
      } else if (sigma > 0 && sigma < FL2 * 0.9) {
        if (sigma < FL2 * 0.5) {
          cavitationRisk = "severe";
          warnings.push(`${pr.label}: SEVERE cavitation — σ = ${sigma.toFixed(3)} well below FL² = ${FL2.toFixed(3)}. Multi-stage trim or cascaded valves required.`);
          mitigations.push("Use multi-stage anti-cavitation trim (cage-guided, labyrinth) per vendor selection");
          mitigations.push("Install restriction orifice downstream to increase backpressure and raise σ");
          mitigations.push("Consider cascaded valves (two valves in series) to split pressure drop");
          mitigations.push("Evaluate alternative valve type with higher FL (e.g., globe with characterized trim)");
        } else {
          cavitationRisk = cavitationRisk === "severe" ? "severe" : "likely";
          warnings.push(`${pr.label}: Cavitation likely — σ = ${sigma.toFixed(3)} < FL² = ${FL2.toFixed(3)} per IEC 60534-2-2`);
          mitigations.push("Use anti-cavitation trim (cage-guided, multi-stage) — obtain vendor σ_mr and σ_id values");
        }
      }

      if (pr.isChoked) {
        twoPhaseRisk = true;
        mitigations.push("Choked liquid flow may produce two-phase conditions downstream — verify pipe supports for vibration");
      }
    }
  }

  if (serviceData.fluidType === "gas" || serviceData.fluidType === "steam") {
    for (const pr of sizingResult.pointResults) {
      if (pr.isChoked) {
        chokedGas = true;
        highNoiseRisk = true;
        warnings.push(`${pr.label}: Gas flow choked — sonic velocity at vena contracta. Noise prediction mandatory per IEC 60534-8-3.`);
        mitigations.push("Install diffuser/silencer downstream for noise attenuation");
        mitigations.push("Use multi-stage low-noise trim to reduce per-stage pressure ratio below xT");
        mitigations.push("Verify pipe wall thickness for acoustic fatigue if noise >110 dBA per IEC 60534-8-4");
      }
      if (pr.xActual > 0.5 && !pr.isChoked) {
        highNoiseRisk = true;
        warnings.push(`${pr.label}: Elevated pressure ratio x = ${pr.xActual.toFixed(3)} — aerodynamic noise risk. Vendor noise calculation recommended per IEC 60534-8-3.`);
        mitigations.push("Request vendor noise prediction per IEC 60534-8-3");
        mitigations.push("Consider low-noise trim (multi-path, multi-stage) if predicted noise >85 dBA");
      }
      if (pr.xActual > 0.3 && pr.xActual <= 0.5) {
        warnings.push(`${pr.label}: Moderate pressure ratio x = ${pr.xActual.toFixed(3)} — standard noise assessment recommended.`);
      }
    }
  }

  const uniqueMitigations = Array.from(new Set(mitigations));

  return { cavitationRisk, flashingRisk, chokedGas, highNoiseRisk, twoPhaseRisk, cavitationIndex, mitigations: uniqueMitigations, warnings };
}

export function buildFinalResult(
  project: CVProject,
  serviceData: CVServiceData,
  valveData: CVValveData,
  installation: CVInstallation,
): CVFinalResult {
  const sizingResult = computeMultiPointSizing(serviceData, valveData, installation);
  const selectionResult = computeValveSelection(sizingResult, valveData);
  const riskAssessment = computeRiskAssessment(serviceData, sizingResult, valveData);

  const flags: string[] = [];
  if (riskAssessment.flashingRisk) flags.push("FLASHING");
  if (riskAssessment.cavitationRisk !== "none") flags.push(`CAVITATION (${riskAssessment.cavitationRisk.toUpperCase()})`);
  if (riskAssessment.chokedGas) flags.push("CHOKED GAS");
  if (riskAssessment.highNoiseRisk) flags.push("HIGH NOISE RISK");
  if (riskAssessment.twoPhaseRisk) flags.push("TWO-PHASE RISK");
  if (project.dataQuality === "preliminary") flags.push("PRELIMINARY PROPERTIES");
  if (valveData.ratedCv <= 0) flags.push("MISSING VENDOR FACTORS");
  if (sizingResult.pointResults.some(p => p.viscosityCorrection > 1)) flags.push("VISCOSITY CORRECTION USED");

  const actionItems: string[] = [];
  actionItems.push(`Governing operating point: ${sizingResult.governingPoint} (Cv = ${sizingResult.governingCv.toFixed(1)})`);
  if (valveData.ratedCv > 0) {
    actionItems.push(`Selected valve rated Cv: ${valveData.ratedCv} (utilization: ${(selectionResult.cvRatio * 100).toFixed(0)}%)`);
    if (selectionResult.cvRatio > 0.9) actionItems.push("Valve near full capacity — confirm with vendor that rated Cv includes appropriate safety margin");
    if (selectionResult.cvRatio < 0.15) actionItems.push("Valve significantly oversized — review body size selection to improve controllability");
  } else {
    actionItems.push("Select valve with rated Cv ≥ " + (sizingResult.governingCv * 1.25).toFixed(0) + " (recommended 25% margin over governing Cv)");
  }
  actionItems.push("Obtain confirmed vendor FL, xT, Fd values and re-run sizing for final design");
  actionItems.push("Confirm fluid physical properties at actual operating conditions (density, viscosity, Pv, Pc, k, Z, MW)");

  if (serviceData.fluidType === "liquid") {
    actionItems.push("Verify vapor pressure (Pv) and critical pressure (Pc) at operating temperature for accurate choked flow / cavitation assessment");
    if (riskAssessment.flashingRisk) actionItems.push("Flashing service: specify hardened trim materials and size downstream piping for two-phase flow");
    if (riskAssessment.cavitationRisk === "incipient") actionItems.push("Incipient cavitation: request vendor cavitation coefficients (σ_mr, σ_id) and evaluate anti-cavitation trim");
    if (riskAssessment.cavitationRisk === "likely" || riskAssessment.cavitationRisk === "severe") actionItems.push("Cavitation service: specify anti-cavitation trim (multi-stage cage) or evaluate cascaded valve arrangement");
    if (riskAssessment.twoPhaseRisk) actionItems.push("Two-phase risk downstream: verify pipe supports for vibration and check downstream erosion allowance");
  }

  if (serviceData.fluidType === "gas" || serviceData.fluidType === "steam") {
    if (riskAssessment.highNoiseRisk) actionItems.push("Request vendor noise prediction per IEC 60534-8-3. If >85 dBA, specify low-noise trim or downstream silencer.");
    if (riskAssessment.chokedGas) actionItems.push("Choked gas flow: evaluate multi-stage trim to reduce per-stage pressure ratio below xT. Check pipe wall for acoustic fatigue per IEC 60534-8-4.");
    actionItems.push("Verify compressibility factor (Z) with rigorous EOS at operating conditions");
  }

  if (serviceData.fluidType === "steam") {
    actionItems.push("Verify steam properties (superheat, wetness) with steam tables — this tool uses approximate values");
  }

  if (project.dataQuality === "preliminary") actionItems.push("Data quality is preliminary — re-run sizing when confirmed process data is available");

  return { project, serviceData, valveData, sizingResult, selectionResult, riskAssessment, flags, actionItems };
}

// ─── Legacy Functions (backward compat) ───────────────────────────────

export function calculateCVLiquid(input: CVLiquidInput): CVLiquidResult {
  const warnings: string[] = [];
  const P1 = input.upstreamPressure;
  const P2 = input.downstreamPressure;
  const dP = P1 - P2;

  if (dP <= 0) throw new Error("Upstream pressure must exceed downstream pressure");
  if (P1 <= 0) throw new Error("Upstream pressure must be positive");

  const Pv_bar = input.vaporPressure / 100;
  const Pc = input.criticalPressure;
  const FL = input.fl;
  const Fp = pipingGeometryFactor(input.pipeSize, input.valveSize);
  const FF = liquidCriticalPressureRatio(Pv_bar, Pc);
  const dP_choked = FL * FL * (P1 - FF * Pv_bar);
  const dP_sizing = Math.min(dP, dP_choked);
  const isChoked = dP >= dP_choked;

  const Q = input.flowRate;
  const Gf = input.liquidDensity / RHO_REF;
  const Cv = Q / (N1_SI * Fp * Math.sqrt(dP_sizing / Gf));

  if (isChoked) warnings.push("Flow is CHOKED — valve at maximum capacity for this ΔP. Increasing ΔP will not increase flow. Consider a larger valve or higher upstream pressure.");
  if (Cv > 10000) warnings.push(`Very large Cv (${Cv.toFixed(0)}) — verify valve can be sourced. Consider parallel valves or larger body size.`);
  if (P2 < Pv_bar) warnings.push(`Downstream P (${P2.toFixed(2)} bar) < Pv (${Pv_bar.toFixed(2)} bar) — flashing will occur downstream. Use hardened trim and consider downstream pipe sizing for two-phase flow.`);
  if (FL < 0.5) warnings.push(`Low FL (${FL.toFixed(2)}) — high recovery valve (e.g., butterfly/ball). Verify cavitation limits per IEC 60534-2-2 and consider globe valve for better control.`);

  const dpRatio = dP / P1;
  if (dpRatio > 0.5 && !isChoked) warnings.push(`High ΔP/P1 ratio (${(dpRatio * 100).toFixed(0)}%) — approaching choked conditions. Review system ΔP budget.`);
  if (dpRatio < 0.02) warnings.push(`Very low ΔP/P1 ratio (${(dpRatio * 100).toFixed(1)}%) — valve may have poor control authority. Consider whether a control valve is appropriate.`);

  const sigma = P1 > Pv_bar ? (P1 - Pv_bar) / (P1 - P2) : 0;
  const FL2 = FL * FL;
  if (sigma > 0 && sigma < FL2 * 1.1 && !isChoked) warnings.push(`Cavitation index σ = ${sigma.toFixed(3)} is near FL² = ${FL2.toFixed(3)} — incipient cavitation risk per IEC 60534-2-2. Consider anti-cavitation trim.`);

  const Cv_choked = Q / (N1_SI * Fp * Math.sqrt(dP_choked / Gf));

  return {
    cvRequired: Cv, cvChoked: Cv_choked, fpFactor: Fp, ffFactor: FF,
    deltaPActual: dP, deltaPChoked: dP_choked, isChoked,
    flowRegime: isChoked ? "Choked (Cavitating/Flashing)" : "Normal (Sub-critical)", warnings,
  };
}

export function calculateCVGas(input: CVGasInput): CVGasResult {
  const warnings: string[] = [];
  const P1 = input.upstreamPressure;
  const P2 = input.downstreamPressure;
  const dP = P1 - P2;
  const T_K = input.temperature + 273.15;
  const k = input.specificHeatRatio;
  const Z = input.compressibilityFactor;
  const MW = input.molecularWeight;
  const xT = input.xt;

  if (dP <= 0) throw new Error("Upstream pressure must exceed downstream pressure");
  if (P1 <= 0) throw new Error("Upstream pressure must be positive");

  const Fp = pipingGeometryFactor(input.pipeSize, input.valveSize);
  const Fk = k / 1.4;
  const x = dP / P1;
  const x_choked = Fk * xT * Fp * Fp;
  const x_sizing = Math.min(x, x_choked);
  const isChoked = x >= x_choked;
  const Y = 1 - x_sizing / (3 * Fk * xT * Fp * Fp);

  const W = input.massFlowRate;
  const Cv = W / (N8_SI * Fp * Y * Math.sqrt(x_sizing * MW * P1 / (T_K * Z)));

  if (isChoked) warnings.push("Flow is CHOKED — critical (sonic) flow at vena contracta. Reducing downstream pressure will not increase flow. Consider multi-stage trim or a larger valve.");
  if (Y < 0.667) warnings.push(`Expansion factor Y = ${Y.toFixed(3)} — valve operating at or near choked limit (Y_min = 0.667 per IEC 60534). Sizing uses choked ΔP.`);
  if (Cv > 10000) warnings.push(`Very large Cv (${Cv.toFixed(0)}) — verify valve availability. Consider parallel valve arrangement.`);
  if (x > 0.8) warnings.push(`Very high pressure ratio x = ${x.toFixed(3)} (x/xT = ${(x / (Fk * xT)).toFixed(2)}) — sonic velocity and aerodynamic noise likely. Request vendor noise prediction per IEC 60534-8-3.`);
  if (x > 0.5 && x <= 0.8 && !isChoked) warnings.push(`Elevated pressure ratio x = ${x.toFixed(3)} — verify noise levels per IEC 60534-8-3, especially near personnel areas.`);
  if (x < 0.05) warnings.push(`Very low pressure ratio x = ${x.toFixed(3)} — valve may have poor control resolution. Verify turndown and controllability.`);
  if (Z < 0.7) warnings.push(`Low compressibility factor Z = ${Z.toFixed(3)} — gas significantly non-ideal. Verify Z with EOS calculation (Peng-Robinson or similar).`);

  return { cvRequired: Cv, xActual: x, xChoked: x_choked, yFactor: Y, fkFactor: Fk, fpFactor: Fp, isChoked, warnings };
}

// ─── Defaults & Test Cases ────────────────────────────────────────────

export const DEFAULT_PROJECT: CVProject = {
  name: "", client: "", location: "", caseId: "", engineer: "",
  date: new Date().toISOString().split("T")[0],
  dataQuality: "preliminary", atmosphericPressure: 1.01325,
};

export const DEFAULT_LIQUID_PROPS: FluidPropsLiquid = {
  density: 998.2, viscosity: 1.0, vaporPressure: 2.338, criticalPressure: 220.64,
};

export const DEFAULT_GAS_PROPS: FluidPropsGas = {
  molecularWeight: 18.5, specificHeatRatio: 1.27, compressibilityFactor: 0.92,
  viscosity: 0.012, criticalPressure: 46.0,
};

export const DEFAULT_VALVE_DATA: CVValveData = {
  style: "globe", characteristic: "equal_pct", ratedCv: 0,
  fl: 0.90, xt: 0.70, fd: 0.46, valveSize: 0, pipeSize: 154.08, rangeability: 50,
};

export const DEFAULT_INSTALLATION: CVInstallation = {
  hasReducers: false, upstreamPipeSize: 154.08, downstreamPipeSize: 154.08, fpOverride: 0,
};

export function getDefaultOperatingPoints(): OperatingPoint[] {
  return [
    { label: "Min", flowRate: 0, flowUnit: "volumetric", upstreamPressure: 0, downstreamPressure: 0, temperature: 0, enabled: true },
    { label: "Normal", flowRate: 0, flowUnit: "volumetric", upstreamPressure: 0, downstreamPressure: 0, temperature: 0, enabled: true },
    { label: "Max", flowRate: 0, flowUnit: "volumetric", upstreamPressure: 0, downstreamPressure: 0, temperature: 0, enabled: true },
  ];
}

export function getDefaultServiceData(): CVServiceData {
  return {
    fluidType: "liquid", fluidName: "",
    liquidProps: { ...DEFAULT_LIQUID_PROPS },
    gasProps: { ...DEFAULT_GAS_PROPS },
    operatingPoints: getDefaultOperatingPoints(),
  };
}

export const TYPICAL_VALVE_DEFAULTS = TYPICAL_VALVE_DATA;

export const CV_TEST_CASE = {
  project: {
    name: "Cooling Water Control", client: "ACME Refinery", location: "Cairo, Egypt",
    caseId: "CV-001", engineer: "", date: new Date().toISOString().split("T")[0],
    dataQuality: "preliminary" as DataQuality, atmosphericPressure: 1.01325,
  },
  serviceData: {
    fluidType: "liquid" as FluidType, fluidName: "Cooling Water",
    liquidProps: { density: 998.2, viscosity: 1.0, vaporPressure: 2.338, criticalPressure: 220.64 },
    gasProps: { ...DEFAULT_GAS_PROPS },
    operatingPoints: [
      { label: "Min", flowRate: 30, flowUnit: "volumetric" as const, upstreamPressure: 10, downstreamPressure: 7, temperature: 20, enabled: true },
      { label: "Normal", flowRate: 100, flowUnit: "volumetric" as const, upstreamPressure: 10, downstreamPressure: 5, temperature: 20, enabled: true },
      { label: "Max", flowRate: 150, flowUnit: "volumetric" as const, upstreamPressure: 10, downstreamPressure: 4, temperature: 20, enabled: true },
    ],
  },
  valveData: {
    style: "globe" as ValveStyle, characteristic: "equal_pct" as TrimCharacteristic,
    ratedCv: 200, fl: 0.90, xt: 0.70, fd: 0.46, valveSize: 0, pipeSize: 154.08, rangeability: 50,
  },
  installation: { ...DEFAULT_INSTALLATION },
};

export const CV_GAS_TEST = {
  project: {
    name: "Gas Pressure Control", client: "ACME Gas", location: "Cairo, Egypt",
    caseId: "CV-002", engineer: "", date: new Date().toISOString().split("T")[0],
    dataQuality: "preliminary" as DataQuality, atmosphericPressure: 1.01325,
  },
  serviceData: {
    fluidType: "gas" as FluidType, fluidName: "Natural Gas",
    liquidProps: { ...DEFAULT_LIQUID_PROPS },
    gasProps: { molecularWeight: 18.5, specificHeatRatio: 1.27, compressibilityFactor: 0.92, viscosity: 0.012, criticalPressure: 46.0 },
    operatingPoints: [
      { label: "Min", flowRate: 3000, flowUnit: "mass" as const, upstreamPressure: 30, downstreamPressure: 27, temperature: 40, enabled: true },
      { label: "Normal", flowRate: 10000, flowUnit: "mass" as const, upstreamPressure: 30, downstreamPressure: 25, temperature: 40, enabled: true },
      { label: "Max", flowRate: 15000, flowUnit: "mass" as const, upstreamPressure: 30, downstreamPressure: 22, temperature: 40, enabled: true },
    ],
  },
  valveData: {
    style: "globe" as ValveStyle, characteristic: "equal_pct" as TrimCharacteristic,
    ratedCv: 250, fl: 0.90, xt: 0.70, fd: 0.46, valveSize: 0, pipeSize: 154.08, rangeability: 50,
  },
  installation: { ...DEFAULT_INSTALLATION },
};

export { STEAM_PROPS };

export const CV_LIQUID_TEST_CASE: CVLiquidInput = {
  flowRate: 100, liquidDensity: 998.2, upstreamPressure: 10, downstreamPressure: 5,
  vaporPressure: 2.338, criticalPressure: 220.64, pipeSize: 154.08, valveSize: 0, fl: 0.90,
};

export const CV_GAS_TEST_CASE: CVGasInput = {
  massFlowRate: 10000, molecularWeight: 18.5, upstreamPressure: 30, downstreamPressure: 25,
  temperature: 40, compressibilityFactor: 0.92, specificHeatRatio: 1.27,
  pipeSize: 154.08, valveSize: 0, xt: 0.70,
};
