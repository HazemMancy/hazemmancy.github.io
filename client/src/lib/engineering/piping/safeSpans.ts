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
  const w = totalWeight * 9.81;
  trace.push({ step: "Total distributed load w = W_total × g", value: `${w.toFixed(2)} N/m` });

  const I = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));
  const Z = (2 * I) / Do;
  trace.push({ step: "I = π/64 × (Do⁴ − Di⁴)", value: `${I.toFixed(0)} mm⁴` });
  trace.push({ step: "Z = 2I / Do", value: `${Z.toFixed(0)} mm³` });

  const S = input.allowable_stress_mpa;
  const E = input.elastic_modulus_gpa * 1e3;
  const yAllow = input.allowable_deflection_mm;

  let Cs: number, Cd: number;
  switch (input.support_type) {
    case "fixed": Cs = 12; Cd = 384; break;
    case "continuous": Cs = 10; Cd = 384; break;
    default: Cs = 8; Cd = 384 / 5; break;
  }

  const spanStress = Math.sqrt((Cs * S * Z) / w) / 1000;
  trace.push({ step: `L_stress = √(${Cs}·S·Z / w)`, value: `${spanStress.toFixed(2)} m` });

  const spanDefl = Math.pow((Cd * E * I * yAllow) / (w), 0.25) / 1000;
  trace.push({ step: `L_deflection = (${Cd}·E·I·δ_allow / w)^0.25`, value: `${spanDefl.toFixed(2)} m` });

  const governing = spanStress < spanDefl ? "Stress" : "Deflection";
  const governingSpan = Math.min(spanStress, spanDefl);
  trace.push({ step: "Governing span", value: `${governingSpan.toFixed(2)} m (${governing})` });

  if (governingSpan < 1) warnings.push("Very short span (<1m): verify loading assumptions");
  if (governingSpan > 15) warnings.push("Long span (>15m): check for dynamic effects (wind, vibration)");
  warnings.push("Screening tool only. Final support spacing per project piping spec / stress analysis.");

  return {
    pipe_id_mm: Di,
    pipe_weight_kg_m: pipeWeight,
    fluid_weight_kg_m: fluidWeight,
    insulation_weight_kg_m: insulWeight,
    total_weight_kg_m: totalWeight,
    total_load_n_m: w,
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
