export interface CalcStep {
  label: string;
  equation: string;
  substitution: string;
  result: number;
  unit: string;
}

export interface OrientationCaseInput {
  gasFlowRate: number;
  gasFlowBasis: "actual" | "standard";
  gasDensity: number;
  gasMW: number;
  gasPressure: number;
  gasTemperature: number;
  gasZ: number;
  liquidFlowRate: number;
  liquidFlowBasis?: "volume" | "mass";
  liquidDensity: number;
  flagFoam: boolean;
  flagSolids: boolean;
  flagSlugging: boolean;
}

export interface OrientationParams {
  cases: OrientationCaseInput[];
  serviceType?: string;
  phaseMode?: "two_phase" | "three_phase";
  currentOrientation?: "vertical" | "horizontal";
}

export interface OrientationFactors {
  gvf: number;
  hasThreePhase: boolean;
  hasFoam: boolean;
  hasSolids: boolean;
  hasSlugging: boolean;
  isSlugCatcher: boolean;
}

export interface OrientationResult {
  recommendedOrientation: "vertical" | "horizontal" | "either";
  confidence: "strong" | "moderate" | "advisory";
  reasons: string[];
  gvf: number;
  factors: OrientationFactors;
  steps: CalcStep[];
}

export const ORIENTATION_GUIDANCE = {
  title: "Orientation Selection Criteria",
  standards: [
    "GPSA Engineering Data Book, Section 7 — Separation Equipment",
    "API 12J — Specification for Oil and Gas Separators",
    "API 521 — Pressure-relieving and Depressuring Systems (Section 5.4.2 for KO drums)",
  ],
  criteria: {
    vertical: "GVF > 0.85 — high gas fraction, small liquid quantity",
    horizontal: "GVF < 0.50 — high liquid load, need retention volume",
    either: "0.50 ≤ GVF ≤ 0.85 — consider additional factors (3-phase, foaming, slugging, solids)",
  },
  tieBreakers: {
    threePhase: "3-phase service favors horizontal (more oil/water interface area)",
    foaming: "Foaming service favors horizontal (more disengagement area)",
    slugging: "Slugging service favors horizontal (surge capacity)",
    solids: "Solids present favors vertical (easier sump/drainage)",
    limitedPlot: "Limited plot space favors vertical (smaller footprint)",
    slugCatcher: "Slug catcher service — always horizontal",
    flareKO: "Flare KO drums — typically vertical per API 521, horizontal for large liquid loads",
  },
};

function computeActualGasFlowForOrientation(
  c: OrientationCaseInput,
): { Qg_m3s: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  let Qg_m3s: number;

  if (c.gasFlowBasis === "actual") {
    Qg_m3s = c.gasFlowRate / 3600;
    steps.push({
      label: "Gas flow (actual)",
      equation: "Q_g = Q_input / 3600",
      substitution: `Q_g = ${c.gasFlowRate} / 3600`,
      result: Qg_m3s,
      unit: "m³/s",
    });
  } else {
    const P_Pa = c.gasPressure * 1e5;
    const T_K = c.gasTemperature + 273.15;
    const Z = c.gasZ > 0 ? c.gasZ : 1.0;
    const Qstd_m3s = c.gasFlowRate / 3600;
    const P_std = 101325;
    const T_std = 288.15;
    Qg_m3s = Qstd_m3s * (P_std / P_Pa) * (T_K / T_std) * Z;
    steps.push({
      label: "Standard to actual gas flow",
      equation: "Q_act = Q_std × (P_std/P) × (T/T_std) × Z",
      substitution: `Q_act = ${Qstd_m3s.toFixed(6)} × (${P_std}/${P_Pa.toFixed(0)}) × (${T_K.toFixed(2)}/${T_std}) × ${Z}`,
      result: Qg_m3s,
      unit: "m³/s",
    });
  }

  return { Qg_m3s, steps };
}

function computeLiquidFlowForOrientation(
  c: OrientationCaseInput,
): { Ql_m3s: number; steps: CalcStep[] } {
  const steps: CalcStep[] = [];
  let Ql_m3s: number;

  const basis = c.liquidFlowBasis || "volume";
  if (basis === "mass" && c.liquidDensity > 0) {
    Ql_m3s = (c.liquidFlowRate / c.liquidDensity) / 3600;
    steps.push({
      label: "Liquid vol flow (from mass)",
      equation: "Q_l = W_l / ρ_l / 3600",
      substitution: `Q_l = ${c.liquidFlowRate} / ${c.liquidDensity} / 3600`,
      result: Ql_m3s,
      unit: "m³/s",
    });
  } else {
    Ql_m3s = c.liquidFlowRate / 3600;
    steps.push({
      label: "Liquid vol flow",
      equation: "Q_l = Q_input / 3600",
      substitution: `Q_l = ${c.liquidFlowRate} / 3600`,
      result: Ql_m3s,
      unit: "m³/s",
    });
  }

  return { Ql_m3s, steps };
}

export function computeOrientationRecommendation(params: OrientationParams): OrientationResult {
  const { cases, serviceType, phaseMode, currentOrientation } = params;
  const steps: CalcStep[] = [];
  const reasons: string[] = [];

  if (!cases || cases.length === 0) {
    return {
      recommendedOrientation: "vertical",
      confidence: "advisory",
      reasons: ["No operating cases provided — defaulting to vertical"],
      gvf: 0,
      factors: { gvf: 0, hasThreePhase: false, hasFoam: false, hasSolids: false, hasSlugging: false, isSlugCatcher: false },
      steps: [],
    };
  }

  const isSlugCatcher = serviceType === "slug_catcher";
  const isFlareKO = serviceType === "flare_ko";
  const hasThreePhase = phaseMode === "three_phase";
  const hasFoam = cases.some(c => c.flagFoam);
  const hasSolids = cases.some(c => c.flagSolids);
  const hasSlugging = cases.some(c => c.flagSlugging);

  let minGvf = Infinity;
  let maxGvf = -Infinity;
  let hasValidCase = false;

  for (const c of cases) {
    const gasResult = computeActualGasFlowForOrientation(c);
    const liqResult = computeLiquidFlowForOrientation(c);
    steps.push(...gasResult.steps, ...liqResult.steps);

    const Qg = gasResult.Qg_m3s;
    const Ql = liqResult.Ql_m3s;
    const totalFlow = Qg + Ql;

    if (totalFlow <= 0) continue;

    const gvf = Qg / totalFlow;
    hasValidCase = true;

    steps.push({
      label: `GVF (${c.gasFlowRate > 0 ? "case" : "check"})`,
      equation: "GVF = Q_gas / (Q_gas + Q_liquid)",
      substitution: `GVF = ${Qg.toFixed(6)} / (${Qg.toFixed(6)} + ${Ql.toFixed(6)})`,
      result: gvf,
      unit: "-",
    });

    if (gvf < minGvf) minGvf = gvf;
    if (gvf > maxGvf) maxGvf = gvf;
  }

  if (!hasValidCase) {
    return {
      recommendedOrientation: "vertical",
      confidence: "advisory",
      reasons: ["No valid flow data — defaulting to vertical"],
      gvf: 0,
      factors: { gvf: 0, hasThreePhase: hasThreePhase, hasFoam, hasSolids, hasSlugging, isSlugCatcher },
      steps,
    };
  }

  const governingGvf = minGvf;

  steps.push({
    label: "Governing GVF (conservative — most liquid-heavy case)",
    equation: "GVF_gov = min(GVF_i)",
    substitution: `GVF_gov = ${governingGvf.toFixed(4)}${minGvf !== maxGvf ? ` (range: ${minGvf.toFixed(4)}–${maxGvf.toFixed(4)})` : ""}`,
    result: governingGvf,
    unit: "-",
  });

  const factors: OrientationFactors = {
    gvf: governingGvf,
    hasThreePhase,
    hasFoam,
    hasSolids,
    hasSlugging,
    isSlugCatcher,
  };

  let recommendedOrientation: "vertical" | "horizontal" | "either";
  let confidence: "strong" | "moderate" | "advisory";

  if (isSlugCatcher) {
    recommendedOrientation = "horizontal";
    confidence = "strong";
    reasons.push("Slug catcher service — always horizontal per GPSA/industry practice");
    return { recommendedOrientation, confidence, reasons, gvf: governingGvf, factors, steps };
  }

  if (isFlareKO) {
    reasons.push("Flare KO drum service — typically vertical per API 521 Section 5.4.2");

    if (governingGvf < 0.50) {
      recommendedOrientation = "horizontal";
      confidence = "moderate";
      reasons.push(`GVF = ${governingGvf.toFixed(2)} (<0.50) — high liquid accumulation may favor horizontal`);
    } else {
      recommendedOrientation = "vertical";
      confidence = "strong";
      reasons.push(`GVF = ${governingGvf.toFixed(2)} — vertical is standard for KO drum service`);
    }

    if (currentOrientation && currentOrientation !== recommendedOrientation) {
      reasons.push(`Current selection (${currentOrientation}) differs from recommendation (${recommendedOrientation})`);
    }

    return { recommendedOrientation, confidence, reasons, gvf: governingGvf, factors, steps };
  }

  if (governingGvf > 0.85) {
    reasons.push(`GVF = ${governingGvf.toFixed(2)} (>0.85) — high gas fraction favors vertical`);

    if (hasThreePhase) {
      recommendedOrientation = "either";
      confidence = "moderate";
      reasons.push("3-phase service detected — horizontal may provide better oil/water separation interface");
    } else if (hasFoam) {
      recommendedOrientation = "either";
      confidence = "moderate";
      reasons.push("Foaming tendency detected — horizontal provides more disengagement area");
    } else {
      recommendedOrientation = "vertical";
      confidence = "strong";
      if (!hasSolids && !hasSlugging) {
        reasons.push("No foaming or 3-phase concerns");
      }
    }
  } else if (governingGvf < 0.50) {
    reasons.push(`GVF = ${governingGvf.toFixed(2)} (<0.50) — high liquid load favors horizontal`);

    if (hasSolids) {
      recommendedOrientation = "either";
      confidence = "moderate";
      reasons.push("Solids present — vertical may be preferred for easier sump/drainage");
    } else {
      recommendedOrientation = "horizontal";
      confidence = "strong";
    }
  } else {
    reasons.push(`GVF = ${governingGvf.toFixed(2)} (0.50–0.85) — either orientation may work`);
    recommendedOrientation = "either";
    confidence = "moderate";

    let leanHorizontal = 0;
    let leanVertical = 0;

    if (hasThreePhase) {
      leanHorizontal++;
      reasons.push("3-phase service — leans horizontal (more oil/water interface area)");
    }
    if (hasFoam) {
      leanHorizontal++;
      reasons.push("Foaming tendency — leans horizontal (more disengagement area)");
    }
    if (hasSlugging) {
      leanHorizontal++;
      reasons.push("Slugging risk — leans horizontal (surge capacity)");
    }
    if (hasSolids) {
      leanVertical++;
      reasons.push("Solids present — leans vertical (easier sump/drainage)");
    }

    if (leanHorizontal > leanVertical && leanHorizontal > 0) {
      recommendedOrientation = "horizontal";
      confidence = "advisory";
      reasons.push("On balance, horizontal orientation is favored based on service conditions");
    } else if (leanVertical > leanHorizontal && leanVertical > 0) {
      recommendedOrientation = "vertical";
      confidence = "advisory";
      reasons.push("On balance, vertical orientation is favored based on service conditions");
    }
  }

  if (hasSolids && recommendedOrientation !== "vertical" && governingGvf >= 0.50) {
    reasons.push("Note: Solids handling is generally easier in vertical vessels (sump drainage)");
  }

  if (hasSlugging && recommendedOrientation !== "horizontal") {
    reasons.push("Note: Slugging conditions benefit from horizontal vessel surge capacity");
  }

  if (currentOrientation && currentOrientation !== recommendedOrientation && recommendedOrientation !== "either") {
    reasons.push(`Current selection (${currentOrientation}) differs from recommendation (${recommendedOrientation})`);
  }

  return { recommendedOrientation, confidence, reasons, gvf: governingGvf, factors, steps };
}
