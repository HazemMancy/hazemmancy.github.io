/**
 * API 2000 — Venting of Atmospheric and Low-Pressure Storage Tanks
 *
 * Calculates normal and emergency venting requirements for storage tanks
 * per API Std 2000, 7th Edition.
 *
 * Normal Venting (Section 4):
 *   Thermal breathing: inbreathing/outbreathing due to ambient temperature changes
 *   Liquid movement: breathing due to liquid pump-in or pump-out
 *   Total normal = thermal + liquid movement (in each direction)
 *
 * Thermal Breathing (Section 4.3):
 *   Outbreathing (warming): vapor expelled as tank heats up
 *   Inbreathing (cooling): air drawn in as tank cools down
 *   For non-refrigerated tanks, per API 2000 Table 2:
 *     q_thermal = C × V^0.7  (Nm³/h of free air)
 *   where V = tank capacity (m³), C = coefficient from table
 *
 * Liquid Movement (Section 4.4):
 *   Outbreathing = liquid pump-in rate (1:1 volume displacement at atmospheric P, T)
 *   Inbreathing = liquid pump-out rate (1:1 volume displacement)
 *   For volatile liquids: multiply by flash factor (vapor generation ratio)
 *
 * Emergency Venting (Section 5):
 *   Fire exposure on wetted shell area:
 *     Q_heat = 43,200 × F × A_w^0.82  (W)  for A_w > 2.8 m²
 *   where:
 *     F = environmental factor (1.0 bare, 0.3 approved insulation, etc.)
 *     A_w = wetted area (m²)
 *   Convert to venting rate:
 *     q_emergency = Q_heat / (ρ_vap × L_v)  (m³/h at relieving conditions)
 *   then to free air equivalent.
 *   Simplified: q_air (Nm³/h) ≈ 906.6 × F × A_w^0.82 × √(28.97/M) × √(T_relieve/273.15)
 *
 * Vent Sizing:
 *   Required orifice area per API 2000 Annex A:
 *     A = q / (C_d × √(2 × ΔP × ρ))
 *   or simplified with discharge coefficient for PV valves.
 *
 * Reference:
 * - API Std 2000, 7th Edition (2014): Venting Atmospheric and Low-Pressure Storage Tanks
 * - API 2510: Design and Construction of LPG Installations
 * - NFPA 30: Flammable and Combustible Liquids Code
 */

export type TankType = "cone_roof" | "dome_roof" | "flat_roof" | "floating_roof";
export type ProductCategory = "hexane_and_below" | "above_hexane" | "non_volatile";
export type InsulationType = "bare" | "concrete" | "insulated_approved" | "insulated_unapproved" | "earth_covered" | "underground";

export interface Api2000Input {
  tankDiameter_m: number;
  tankHeight_m: number;
  tankType: TankType;
  liquidLevel_percent: number;
  maxFillRate_m3_h: number;
  maxEmptyRate_m3_h: number;
  productCategory: ProductCategory;
  flashFactor: number;
  vaporMW: number;
  relievingTemp_C: number;
  latentHeat_kJ_kg: number;
  vaporDensity_kg_m3: number;
  designPressure_mbar: number;
  designVacuum_mbar: number;
  insulationType: InsulationType;
}

export interface TankGeometry {
  volume_m3: number;
  shellArea_m2: number;
  roofArea_m2: number;
  wettedArea_m2: number;
  liquidVolume_m3: number;
  vaporSpace_m3: number;
}

export interface NormalVentingResult {
  thermalOutbreathing_Nm3h: number;
  thermalInbreathing_Nm3h: number;
  liquidMovementOut_Nm3h: number;
  liquidMovementIn_Nm3h: number;
  totalOutbreathing_Nm3h: number;
  totalInbreathing_Nm3h: number;
  governingNormal_Nm3h: number;
  governingDirection: "outbreathing" | "inbreathing";
}

export interface EmergencyVentingResult {
  wettedArea_m2: number;
  envFactor: number;
  heatInput_kW: number;
  emergencyVenting_Nm3h: number;
}

export interface VentSizingResult {
  totalRequired_Nm3h: number;
  normalRequired_Nm3h: number;
  emergencyRequired_Nm3h: number;
  pressureVentArea_mm2: number;
  vacuumVentArea_mm2: number;
  pressureVentDia_mm: number;
  vacuumVentDia_mm: number;
  pressureNPS: string;
  vacuumNPS: string;
  governingSide: "pressure" | "vacuum";
}

export interface Api2000Result {
  geometry: TankGeometry;
  normalVenting: NormalVentingResult;
  emergencyVenting: EmergencyVentingResult;
  ventSizing: VentSizingResult;
  trace: { step: string; value: string }[];
  assumptions: string[];
  warnings: string[];
}

const ENV_FACTORS: Record<InsulationType, number> = {
  bare: 1.0,
  concrete: 0.5,
  insulated_approved: 0.3,
  insulated_unapproved: 1.0,
  earth_covered: 0.03,
  underground: 0.0,
};

const ENV_LABELS: Record<InsulationType, string> = {
  bare: "Bare tank (F = 1.0)",
  concrete: "Concrete-encased (F = 0.5)",
  insulated_approved: "Approved insulation (F = 0.3)",
  insulated_unapproved: "Unapproved insulation (F = 1.0)",
  earth_covered: "Earth-covered (F = 0.03)",
  underground: "Underground (F = 0.0)",
};

const THERMAL_COEFF_OUT: Record<ProductCategory, number> = {
  hexane_and_below: 0.339,
  above_hexane: 0.169,
  non_volatile: 0.106,
};

const THERMAL_COEFF_IN: Record<ProductCategory, number> = {
  hexane_and_below: 0.221,
  above_hexane: 0.221,
  non_volatile: 0.221,
};

export const PRODUCT_LABELS: Record<ProductCategory, string> = {
  hexane_and_below: "Hexane and lighter (flash point ≤ -1°C / 30°F)",
  above_hexane: "Above hexane (flash point > -1°C and ≤ 37.8°C / 100°F)",
  non_volatile: "Non-volatile (flash point > 37.8°C / 100°F)",
};

export const INSULATION_LABELS = ENV_LABELS;

function fmtNum(n: number, digits = 2): string {
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(digits);
  if (n === 0) return "0";
  return n.toPrecision(4);
}

export function calculateTankGeometry(
  D: number, H: number, tankType: TankType, liquidLevel: number
): TankGeometry {
  const baseArea = (Math.PI / 4) * D * D;
  let volume: number;
  let roofArea: number;

  switch (tankType) {
    case "dome_roof": {
      const roofHeight = D / 8;
      volume = baseArea * H + (Math.PI * roofHeight / 6) * (3 * (D / 2) * (D / 2) + roofHeight * roofHeight);
      roofArea = Math.PI * ((D / 2) * (D / 2) + roofHeight * roofHeight);
      break;
    }
    case "cone_roof": {
      const roofHeight = D / 6;
      const slopeLen = Math.sqrt((D / 2) * (D / 2) + roofHeight * roofHeight);
      volume = baseArea * H + (1 / 3) * baseArea * roofHeight;
      roofArea = Math.PI * (D / 2) * slopeLen;
      break;
    }
    case "floating_roof":
      volume = baseArea * H;
      roofArea = 0;
      break;
    default:
      volume = baseArea * H;
      roofArea = baseArea;
      break;
  }

  const shellArea = Math.PI * D * H;
  const liquidFraction = Math.min(Math.max(liquidLevel / 100, 0), 1);
  const liquidHeight = H * liquidFraction;
  const wettedArea = Math.PI * D * liquidHeight;
  const liquidVolume = baseArea * liquidHeight;
  const vaporSpace = volume - liquidVolume;

  return {
    volume_m3: volume,
    shellArea_m2: shellArea,
    roofArea_m2: roofArea,
    wettedArea_m2: wettedArea,
    liquidVolume_m3: liquidVolume,
    vaporSpace_m3: Math.max(vaporSpace, 0),
  };
}

export function calculateNormalVenting(
  tankVolume_m3: number,
  productCategory: ProductCategory,
  fillRate_m3h: number,
  emptyRate_m3h: number,
  flashFactor: number,
): NormalVentingResult {
  const C_out = THERMAL_COEFF_OUT[productCategory];
  const C_in = THERMAL_COEFF_IN[productCategory];

  const thermalOut = tankVolume_m3 > 0 ? C_out * Math.pow(tankVolume_m3, 0.7) : 0;
  const thermalIn = tankVolume_m3 > 0 ? C_in * Math.pow(tankVolume_m3, 0.7) : 0;

  const liquidOut = fillRate_m3h * Math.max(flashFactor, 1.0);
  const liquidIn = emptyRate_m3h;

  const totalOut = thermalOut + liquidOut;
  const totalIn = thermalIn + liquidIn;

  const governing = totalOut > totalIn ? "outbreathing" : "inbreathing";
  const governingFlow = Math.max(totalOut, totalIn);

  return {
    thermalOutbreathing_Nm3h: thermalOut,
    thermalInbreathing_Nm3h: thermalIn,
    liquidMovementOut_Nm3h: liquidOut,
    liquidMovementIn_Nm3h: liquidIn,
    totalOutbreathing_Nm3h: totalOut,
    totalInbreathing_Nm3h: totalIn,
    governingNormal_Nm3h: governingFlow,
    governingDirection: governing,
  };
}

export function calculateEmergencyVenting(
  wettedArea_m2: number,
  insulationType: InsulationType,
  vaporMW: number,
  relievingTemp_C: number,
  latentHeat_kJ_kg: number,
  vaporDensity_kg_m3: number,
): EmergencyVentingResult {
  const F = ENV_FACTORS[insulationType];

  let heatInput_W = 0;
  if (wettedArea_m2 > 2.8 && F > 0) {
    heatInput_W = 43200 * F * Math.pow(wettedArea_m2, 0.82);
  }
  const heatInput_kW = heatInput_W / 1000;

  let q_emergency_Nm3h = 0;
  if (latentHeat_kJ_kg > 0 && vaporDensity_kg_m3 > 0) {
    const vaporizationRate_kg_h = (heatInput_kW * 3600) / latentHeat_kJ_kg;
    const actualVolumeRate_m3h = vaporizationRate_kg_h / vaporDensity_kg_m3;
    const T_relieve_K = relievingTemp_C + 273.15;
    q_emergency_Nm3h = actualVolumeRate_m3h * (273.15 / T_relieve_K) * (101.325 / 101.325);
  } else if (heatInput_kW > 0) {
    const T_relieve_K = relievingTemp_C + 273.15;
    q_emergency_Nm3h = 906.6 * F * Math.pow(wettedArea_m2, 0.82) *
      Math.sqrt(28.97 / Math.max(vaporMW, 1)) * Math.sqrt(T_relieve_K / 273.15);
  }

  return {
    wettedArea_m2: wettedArea_m2,
    envFactor: F,
    heatInput_kW,
    emergencyVenting_Nm3h: q_emergency_Nm3h,
  };
}

function sizeVentForDP(
  flowRate_Nm3h: number, dp_mbar: number
): { area_mm2: number; dia_mm: number; nps: string } {
  const rho_air = 1.225;
  const Cd = 0.62;
  const dp_Pa = dp_mbar * 100;

  let area_m2 = 0;
  if (dp_Pa > 0 && flowRate_Nm3h > 0) {
    const q_m3s = flowRate_Nm3h / 3600;
    const velocity = Cd * Math.sqrt(2 * dp_Pa / rho_air);
    area_m2 = q_m3s / Math.max(velocity, 0.01);
  }

  const area_mm2 = area_m2 * 1e6;
  const dia_mm = area_mm2 > 0 ? Math.sqrt(4 * area_mm2 / Math.PI) : 0;

  const npsTable = [
    { nps: "2\"", dia: 50 }, { nps: "3\"", dia: 75 }, { nps: "4\"", dia: 100 },
    { nps: "6\"", dia: 150 }, { nps: "8\"", dia: 200 }, { nps: "10\"", dia: 250 },
    { nps: "12\"", dia: 300 }, { nps: "14\"", dia: 350 }, { nps: "16\"", dia: 400 },
    { nps: "18\"", dia: 450 }, { nps: "20\"", dia: 500 }, { nps: "24\"", dia: 600 },
    { nps: "30\"", dia: 750 }, { nps: "36\"", dia: 900 },
  ];
  let nps = "";
  for (const entry of npsTable) {
    if (entry.dia >= dia_mm) { nps = entry.nps; break; }
  }
  if (!nps && dia_mm > 0) nps = "> 36\" (multiple vents required)";

  return { area_mm2, dia_mm, nps };
}

export function calculateVentSize(
  outbreathingRequired_Nm3h: number,
  inbreathingRequired_Nm3h: number,
  emergencyRequired_Nm3h: number,
  designPressure_mbar: number,
  designVacuum_mbar: number,
): VentSizingResult {
  const pressureFlow = Math.max(outbreathingRequired_Nm3h, emergencyRequired_Nm3h);
  const vacuumFlow = inbreathingRequired_Nm3h;

  const pressureVent = sizeVentForDP(pressureFlow, designPressure_mbar);
  const vacuumVent = sizeVentForDP(vacuumFlow, designVacuum_mbar);

  const governingSide = pressureVent.area_mm2 >= vacuumVent.area_mm2 ? "pressure" : "vacuum";

  return {
    totalRequired_Nm3h: Math.max(pressureFlow, vacuumFlow),
    normalRequired_Nm3h: Math.max(outbreathingRequired_Nm3h, inbreathingRequired_Nm3h),
    emergencyRequired_Nm3h,
    pressureVentArea_mm2: pressureVent.area_mm2,
    vacuumVentArea_mm2: vacuumVent.area_mm2,
    pressureVentDia_mm: pressureVent.dia_mm,
    vacuumVentDia_mm: vacuumVent.dia_mm,
    pressureNPS: pressureVent.nps,
    vacuumNPS: vacuumVent.nps,
    governingSide,
  };
}

export function calculateApi2000(input: Api2000Input): Api2000Result {
  const trace: { step: string; value: string }[] = [];
  const assumptions: string[] = [];
  const warnings: string[] = [];

  if (input.tankDiameter_m <= 0) throw new Error("Tank diameter must be positive");
  if (input.tankHeight_m <= 0) throw new Error("Tank height must be positive");
  if (input.designPressure_mbar <= 0) throw new Error("Design pressure must be positive");
  if (input.designVacuum_mbar <= 0) throw new Error("Design vacuum must be positive");
  if (input.vaporMW <= 0) throw new Error("Vapor molecular weight must be positive");

  const geom = calculateTankGeometry(
    input.tankDiameter_m, input.tankHeight_m, input.tankType, input.liquidLevel_percent
  );

  trace.push({ step: "Tank volume V = π/4 × D² × H", value: `${fmtNum(geom.volume_m3)} m³` });
  trace.push({ step: "Shell area = π × D × H", value: `${fmtNum(geom.shellArea_m2)} m²` });
  trace.push({ step: "Wetted area = π × D × H_liquid", value: `${fmtNum(geom.wettedArea_m2)} m²` });
  trace.push({ step: "Vapor space", value: `${fmtNum(geom.vaporSpace_m3)} m³` });

  const normal = calculateNormalVenting(
    geom.volume_m3,
    input.productCategory,
    input.maxFillRate_m3_h,
    input.maxEmptyRate_m3_h,
    input.flashFactor,
  );

  const C_out = THERMAL_COEFF_OUT[input.productCategory];
  const C_in = THERMAL_COEFF_IN[input.productCategory];

  trace.push({ step: `Thermal outbreathing = ${C_out} × V^0.7 (API 2000 Table 2)`, value: `${fmtNum(normal.thermalOutbreathing_Nm3h)} Nm³/h` });
  trace.push({ step: `Thermal inbreathing = ${C_in} × V^0.7 (API 2000 Table 3)`, value: `${fmtNum(normal.thermalInbreathing_Nm3h)} Nm³/h` });
  if (input.maxFillRate_m3_h > 0) {
    trace.push({ step: `Liquid movement outbreathing = fill rate × flash factor`, value: `${fmtNum(normal.liquidMovementOut_Nm3h)} Nm³/h` });
  }
  if (input.maxEmptyRate_m3_h > 0) {
    trace.push({ step: `Liquid movement inbreathing = empty rate`, value: `${fmtNum(normal.liquidMovementIn_Nm3h)} Nm³/h` });
  }
  trace.push({ step: "Total outbreathing = thermal + liquid movement", value: `${fmtNum(normal.totalOutbreathing_Nm3h)} Nm³/h` });
  trace.push({ step: "Total inbreathing = thermal + liquid movement", value: `${fmtNum(normal.totalInbreathing_Nm3h)} Nm³/h` });
  trace.push({ step: `Governing normal venting (${normal.governingDirection})`, value: `${fmtNum(normal.governingNormal_Nm3h)} Nm³/h` });

  const emergency = calculateEmergencyVenting(
    geom.wettedArea_m2,
    input.insulationType,
    input.vaporMW,
    input.relievingTemp_C,
    input.latentHeat_kJ_kg,
    input.vaporDensity_kg_m3,
  );

  trace.push({ step: `Environmental factor F (${ENV_LABELS[input.insulationType]})`, value: `${emergency.envFactor}` });
  if (geom.wettedArea_m2 > 2.8) {
    trace.push({ step: "Q_fire = 43,200 × F × A_w^0.82 (API 2000 Eq. 3)", value: `${fmtNum(emergency.heatInput_kW)} kW` });
  } else {
    trace.push({ step: "Wetted area ≤ 2.8 m²", value: "No emergency venting required per API 2000" });
  }
  trace.push({ step: "Emergency venting (free air equivalent)", value: `${fmtNum(emergency.emergencyVenting_Nm3h)} Nm³/h` });

  const ventSize = calculateVentSize(
    normal.totalOutbreathing_Nm3h,
    normal.totalInbreathing_Nm3h,
    emergency.emergencyVenting_Nm3h,
    input.designPressure_mbar,
    input.designVacuum_mbar,
  );

  trace.push({ step: "--- Pressure Vent (outbreathing + emergency) ---", value: "" });
  trace.push({ step: "Pressure vent flow = max(outbreathing, emergency)", value: `${fmtNum(Math.max(normal.totalOutbreathing_Nm3h, emergency.emergencyVenting_Nm3h))} Nm³/h` });
  trace.push({ step: `Pressure vent area (Cd=0.62, ΔP=${input.designPressure_mbar} mbar)`, value: `${fmtNum(ventSize.pressureVentArea_mm2)} mm²` });
  trace.push({ step: "Pressure vent diameter", value: `${fmtNum(ventSize.pressureVentDia_mm)} mm → ${ventSize.pressureNPS}` });
  trace.push({ step: "--- Vacuum Vent (inbreathing) ---", value: "" });
  trace.push({ step: "Vacuum vent flow = total inbreathing", value: `${fmtNum(normal.totalInbreathing_Nm3h)} Nm³/h` });
  trace.push({ step: `Vacuum vent area (Cd=0.62, ΔP=${input.designVacuum_mbar} mbar)`, value: `${fmtNum(ventSize.vacuumVentArea_mm2)} mm²` });
  trace.push({ step: "Vacuum vent diameter", value: `${fmtNum(ventSize.vacuumVentDia_mm)} mm → ${ventSize.vacuumNPS}` });
  trace.push({ step: "Governing side", value: ventSize.governingSide });

  assumptions.push("Non-refrigerated atmospheric storage tank per API 2000, 7th Edition");
  assumptions.push(`Thermal breathing coefficients: C_out = ${C_out}, C_in = ${C_in} (empirical, API 2000 Table 2/3)`);
  assumptions.push("Liquid movement: 1:1 volume displacement at atmospheric conditions");
  assumptions.push("Fire heat input: Q = 43,200 × F × A_w^0.82 W (API 2000 Eq. 3, A_w > 2.8 m²)");
  assumptions.push("Vent discharge coefficient Cd = 0.62 (typical for PV valves)");
  assumptions.push("Standard conditions: 0°C (273.15 K), 101.325 kPa for Nm³/h");

  if (input.tankType === "floating_roof") {
    warnings.push("Floating roof tanks: emergency venting may be reduced per API 2000 Section 5.4");
  }
  if (geom.volume_m3 > 50000) {
    warnings.push("Very large tank (>50,000 m³): verify thermal breathing coefficients with API 2000 Table 2/3 extrapolation");
  }
  if (input.designPressure_mbar < 3.5) {
    warnings.push("Very low design pressure (<3.5 mbar): consider structural adequacy of tank shell");
  }
  if (input.flashFactor > 5) {
    warnings.push(`High flash factor (${input.flashFactor}): verify with process simulation — volatile liquid vaporization may dominate`);
  }
  if (emergency.emergencyVenting_Nm3h > normal.governingNormal_Nm3h * 10) {
    warnings.push("Emergency venting greatly exceeds normal venting: verify insulation and drainage provisions");
  }
  if (ventSize.pressureVentDia_mm > 600 || ventSize.vacuumVentDia_mm > 600) {
    warnings.push("Required vent diameter exceeds 24\": consider multiple PV valves or open vent with flame arrester");
  }

  warnings.push("Screening calculation only. Final sizing per API 2000 with vendor-rated PV valve capacity data.");

  return {
    geometry: geom,
    normalVenting: normal,
    emergencyVenting: emergency,
    ventSizing: ventSize,
    trace,
    assumptions,
    warnings,
  };
}

export const API_2000_TEST_CASE: Api2000Input = {
  tankDiameter_m: 15,
  tankHeight_m: 12,
  tankType: "cone_roof",
  liquidLevel_percent: 75,
  maxFillRate_m3_h: 100,
  maxEmptyRate_m3_h: 100,
  productCategory: "hexane_and_below",
  flashFactor: 1.0,
  vaporMW: 86.18,
  relievingTemp_C: 35,
  latentHeat_kJ_kg: 365,
  vaporDensity_kg_m3: 3.5,
  designPressure_mbar: 20,
  designVacuum_mbar: 6,
  insulationType: "bare",
};
