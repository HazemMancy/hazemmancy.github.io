export interface FlexibilityInput {
  material: string;
  elastic_modulus_gpa: number;
  thermal_coeff: number;
  temp_ambient_c: number;
  temp_operating_c: number;
  pipe_od_mm: number;
  pipe_wt_mm: number;
  straight_run_m: number;
  allowable_stress_mpa: number;
  fixed_both_ends: boolean;
}

export interface FlexibilityResult {
  delta_t: number;
  thermal_expansion_mm: number;
  moment_of_inertia_mm4: number;
  section_modulus_mm3: number;
  guided_cantilever_stress_mpa: number;
  loop_required: boolean;
  min_loop_leg_m: number;
  pass: boolean;
  trace: { step: string; value: string }[];
  warnings: string[];
}

export const MATERIAL_PROPERTIES: Record<string, { E_gpa: number; alpha: number; desc: string }> = {
  "CS_A106B": { E_gpa: 200, alpha: 12.0e-6, desc: "Carbon Steel A106 Gr.B" },
  "SS_304": { E_gpa: 193, alpha: 17.3e-6, desc: "Stainless Steel 304" },
  "SS_316": { E_gpa: 193, alpha: 16.0e-6, desc: "Stainless Steel 316" },
  "ALLOY_625": { E_gpa: 205, alpha: 12.8e-6, desc: "Alloy 625 (Inconel)" },
  "DUPLEX_2205": { E_gpa: 200, alpha: 13.0e-6, desc: "Duplex 2205" },
  "CU_NI_90_10": { E_gpa: 135, alpha: 17.0e-6, desc: "CuNi 90/10" },
};

export function calculateFlexibility(input: FlexibilityInput): FlexibilityResult {
  const trace: { step: string; value: string }[] = [];
  const warnings: string[] = [];

  const deltaT = input.temp_operating_c - input.temp_ambient_c;
  trace.push({ step: "ΔT = T_op − T_amb", value: `${deltaT.toFixed(1)} °C` });

  const alpha = input.thermal_coeff;
  const thermalExpansion = alpha * deltaT * input.straight_run_m * 1000;
  trace.push({ step: "δ = α × ΔT × L", value: `${thermalExpansion.toFixed(2)} mm` });

  const Do = input.pipe_od_mm;
  const Di = Do - 2 * input.pipe_wt_mm;
  const I = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));
  const Z = (2 * I) / Do;
  trace.push({ step: "I = π/64 × (Do⁴ − Di⁴)", value: `${I.toFixed(0)} mm⁴` });
  trace.push({ step: "Z = 2I / Do", value: `${Z.toFixed(0)} mm³` });

  const E = input.elastic_modulus_gpa * 1e3;
  const L_mm = input.straight_run_m * 1000;
  const delta = Math.abs(thermalExpansion);

  const sigma = (3 * E * Do * delta) / (L_mm * L_mm);
  trace.push({ step: "σ_guided = 3·E·Do·δ / L² (guided cantilever per M.W. Kellogg / ASME B31.3)", value: `${sigma.toFixed(1)} MPa` });

  const pass = sigma <= input.allowable_stress_mpa;
  const loopRequired = !pass;

  let minLoopLeg = 0;
  if (loopRequired && delta > 0) {
    minLoopLeg = Math.sqrt((3 * E * Do * delta) / input.allowable_stress_mpa) / 1000;
    trace.push({ step: "L_loop = √(3·E·Do·δ / S_a) (guided cantilever loop leg)", value: `${minLoopLeg.toFixed(2)} m` });
  }

  if (Math.abs(deltaT) > 300) warnings.push("Large ΔT (> 300 °C): verify material properties at elevated temperature — E and α may vary significantly.");
  if (sigma > 2 * input.allowable_stress_mpa) warnings.push("Guided cantilever stress exceeds 2× allowable: an expansion loop, bellows, or change of routing is required.");

  // Boundary context note — interpretive only, does not alter the formula
  if (input.fixed_both_ends) {
    warnings.push("Boundary context: 'Both ends anchored' recorded for documentation. The guided cantilever formula (σ = 3·E·Do·δ / L²) is applied regardless of boundary context — it assumes the pipe absorbs thermal expansion at one guided end. Actual restraint conditions must be confirmed in a full stress analysis (Caesar II / AutoPIPE).");
  } else {
    warnings.push("Boundary context: 'One end guided / free' recorded for documentation. Same guided cantilever formula applied. Actual restraint conditions must be confirmed in a full stress analysis.");
  }

  warnings.push("SCREENING ONLY — This tool does NOT analyse: sustained loads (weight + pressure), occasional loads (wind, seismic, PSV reaction), support settlement, nozzle loads, in-plane / out-of-plane torsion, or multi-branch systems. A formal Caesar II / AutoPIPE stress analysis per ASME B31.3 Chapter II is required before finalising design.");

  return {
    delta_t: deltaT,
    thermal_expansion_mm: thermalExpansion,
    moment_of_inertia_mm4: I,
    section_modulus_mm3: Z,
    guided_cantilever_stress_mpa: sigma,
    loop_required: loopRequired,
    min_loop_leg_m: minLoopLeg,
    pass,
    trace,
    warnings,
  };
}
