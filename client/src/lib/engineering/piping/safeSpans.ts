export interface SafeSpanInput {
  pipe_od_mm: number;
  pipe_wt_mm: number;
  pipe_density_kg_m3: number;
  fluid_density_kg_m3: number;
  insulation_thickness_mm: number;
  insulation_density_kg_m3: number;
  allowable_deflection_mm: number;
  elastic_modulus_gpa: number;
  allowable_stress_mpa: number;
  concentrated_load_n: number;
  support_type: "simple" | "continuous" | "fixed";
}

export interface SafeSpanResult {
  pipe_id_mm: number;
  pipe_weight_kg_m: number;
  fluid_weight_kg_m: number;
  insulation_weight_kg_m: number;
  total_weight_kg_m: number;
  total_load_n_m: number;
  moment_of_inertia_mm4: number;
  section_modulus_mm3: number;
  span_by_stress_m: number;
  span_by_deflection_m: number;
  governing_span_m: number;
  governing_criterion: string;
  trace: { step: string; value: string }[];
  warnings: string[];
}

function solveSpanWithPointLoad(
  w: number,
  P: number,
  limit: number,
  Cw: number,
  Cp: number,
  calcFn: (L: number) => number,
): number {
  if (P <= 0) {
    return calcFn(0);
  }
  let lo = 0.01;
  let hi = 100;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const L_mm = mid * 1000;
    const distributed = (w * L_mm * L_mm) / Cw;
    const point = (P * L_mm) / Cp;
    const total = distributed + point;
    if (total > limit) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

function solveDeflSpanWithPointLoad(
  w: number,
  P: number,
  E: number,
  I: number,
  yAllow: number,
  CdW: number,
  CdP: number,
): number {
  if (P <= 0) {
    return Math.pow((CdW * E * I * yAllow) / w, 0.25) / 1000;
  }
  let lo = 0.01;
  let hi = 100;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const L_mm = mid * 1000;
    const deflW = (w * Math.pow(L_mm, 4)) / (CdW * E * I);
    const deflP = (P * Math.pow(L_mm, 3)) / (CdP * E * I);
    const totalDefl = deflW + deflP;
    if (totalDefl > yAllow) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

export function calculateSafeSpan(input: SafeSpanInput): SafeSpanResult {
  const trace: { step: string; value: string }[] = [];
  const warnings: string[] = [];

  const Do = input.pipe_od_mm;
  const Di = Do - 2 * input.pipe_wt_mm;
  const pipeArea = (Math.PI / 4) * (Do * Do - Di * Di) * 1e-6;
  const pipeWeight = pipeArea * input.pipe_density_kg_m3;
  trace.push({ step: "Pipe weight = A_pipe × ρ_pipe", value: `${pipeWeight.toFixed(2)} kg/m` });

  const fluidArea = (Math.PI / 4) * Di * Di * 1e-6;
  const fluidWeight = fluidArea * input.fluid_density_kg_m3;
  trace.push({ step: "Fluid weight = A_fluid × ρ_fluid", value: `${fluidWeight.toFixed(2)} kg/m` });

  let insulWeight = 0;
  if (input.insulation_thickness_mm > 0) {
    const Dins = Do + 2 * input.insulation_thickness_mm;
    const insArea = (Math.PI / 4) * (Dins * Dins - Do * Do) * 1e-6;
    insulWeight = insArea * input.insulation_density_kg_m3;
    trace.push({ step: "Insulation weight = A_ins × ρ_ins", value: `${insulWeight.toFixed(2)} kg/m` });
  }

  const totalWeight = pipeWeight + fluidWeight + insulWeight;
  const w_N_m = totalWeight * 9.81;
  const w = w_N_m / 1000;
  trace.push({ step: "Total distributed load w = W_total × g", value: `${w_N_m.toFixed(2)} N/m (${w.toFixed(4)} N/mm)` });

  const P = input.concentrated_load_n;
  if (P > 0) {
    trace.push({ step: "Concentrated load P (midspan)", value: `${P.toFixed(1)} N` });
  }

  const I = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));
  const Z = (2 * I) / Do;
  trace.push({ step: "I = π/64 × (Do⁴ − Di⁴)", value: `${I.toFixed(0)} mm⁴` });
  trace.push({ step: "Z = 2I / Do", value: `${Z.toFixed(0)} mm³` });

  const S = input.allowable_stress_mpa;
  const E = input.elastic_modulus_gpa * 1e3;
  const yAllow = input.allowable_deflection_mm;

  let CsW: number;
  let CsP: number;
  let CdW: number;
  let CdP: number;
  switch (input.support_type) {
    case "fixed":
      CsW = 12; CsP = 8; CdW = 384; CdP = 192;
      break;
    case "continuous":
      CsW = 10; CsP = 6; CdW = 384; CdP = 192;
      break;
    default:
      CsW = 8; CsP = 4; CdW = 384 / 5; CdP = 48;
      break;
  }

  const M_allow = S * Z;

  let spanStress: number;
  if (P > 0) {
    spanStress = solveSpanWithPointLoad(w, P, M_allow, CsW, CsP, () => {
      return Math.sqrt((CsW * S * Z) / w) / 1000;
    });
    const L_mm = spanStress * 1000;
    const M_dist = (w * L_mm * L_mm) / CsW;
    const M_point = (P * L_mm) / CsP;
    trace.push({ step: `M_distributed = w·L²/${CsW}`, value: `${(M_dist / 1e6).toFixed(2)} kN·m` });
    trace.push({ step: `M_point = P·L/${CsP}`, value: `${(M_point / 1e6).toFixed(2)} kN·m` });
    trace.push({ step: `L_stress (combined w + P)`, value: `${spanStress.toFixed(2)} m` });
  } else {
    spanStress = Math.sqrt((CsW * S * Z) / w) / 1000;
    trace.push({ step: `L_stress = √(${CsW}·S·Z / w)`, value: `${spanStress.toFixed(2)} m` });
  }

  let spanDefl: number;
  if (P > 0) {
    spanDefl = solveDeflSpanWithPointLoad(w, P, E, I, yAllow, CdW, CdP);
    const L_mm = spanDefl * 1000;
    const dW = (w * Math.pow(L_mm, 4)) / (CdW * E * I);
    const dP = (P * Math.pow(L_mm, 3)) / (CdP * E * I);
    trace.push({ step: `δ_distributed = w·L⁴/(${CdW}·E·I)`, value: `${dW.toFixed(2)} mm` });
    trace.push({ step: `δ_point = P·L³/(${CdP}·E·I)`, value: `${dP.toFixed(2)} mm` });
    trace.push({ step: `L_deflection (combined w + P)`, value: `${spanDefl.toFixed(2)} m` });
  } else {
    spanDefl = Math.pow((CdW * E * I * yAllow) / w, 0.25) / 1000;
    trace.push({ step: `L_deflection = (${CdW}·E·I·δ_allow / w)^0.25`, value: `${spanDefl.toFixed(2)} m` });
  }

  const governing = spanStress < spanDefl ? "Stress" : "Deflection";
  const governingSpan = Math.min(spanStress, spanDefl);
  trace.push({ step: "Governing span", value: `${governingSpan.toFixed(2)} m (${governing})` });

  if (P > 0) {
    const spanNoLoad = Math.min(
      Math.sqrt((CsW * S * Z) / w) / 1000,
      Math.pow((CdW * E * I * yAllow) / w, 0.25) / 1000
    );
    const reduction = ((spanNoLoad - governingSpan) / spanNoLoad) * 100;
    if (reduction > 5) {
      trace.push({ step: "Point load span reduction", value: `${reduction.toFixed(0)}% vs. distributed-only` });
    }
    if (reduction > 30) {
      warnings.push(`Concentrated load (${P.toFixed(0)} N) reduces span by ${reduction.toFixed(0)}%: consider dedicated valve support`);
    }
  }

  if (governingSpan < 1) warnings.push("Very short span (<1m): verify loading assumptions");
  if (governingSpan > 15) warnings.push("Long span (>15m): check for dynamic effects (wind, vibration)");
  warnings.push("Screening tool only. Final support spacing per project piping spec / stress analysis.");

  return {
    pipe_id_mm: Di,
    pipe_weight_kg_m: pipeWeight,
    fluid_weight_kg_m: fluidWeight,
    insulation_weight_kg_m: insulWeight,
    total_weight_kg_m: totalWeight,
    total_load_n_m: w_N_m,
    moment_of_inertia_mm4: I,
    section_modulus_mm3: Z,
    span_by_stress_m: spanStress,
    span_by_deflection_m: spanDefl,
    governing_span_m: governingSpan,
    governing_criterion: governing,
    trace,
    warnings,
  };
}
