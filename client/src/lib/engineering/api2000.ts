/**
 * API 2000 — Venting of Atmospheric and Low-Pressure Storage Tanks
 * 7th Edition (2014), Comprehensive Scenario-Based Calculator
 *
 * ═══════════════════════════════════════════════════════════════════
 * NORMAL VENTING — Section 4
 * ═══════════════════════════════════════════════════════════════════
 *
 * N1 — Thermal Outbreathing (Section 4.3.2):
 *   Tank heats up → vapor space expands → vapor expelled
 *   q_ot = C_out × V^0.7 (Nm³/h of free air)
 *   C_out per product category (API 2000 Table 2):
 *     Hexane & below: 0.339
 *     Above hexane:   0.169
 *     Non-volatile:   0.106 (air expansion in vapor space)
 *
 * N2 — Thermal Inbreathing (Section 4.3.3):
 *   Tank cools down → vapor space contracts → air drawn in
 *   q_it = C_in × V^0.7 (Nm³/h of free air)
 *   C_in = 0.221 for all products (air contraction)
 *
 * N3 — Liquid Pump-In / Outbreathing (Section 4.4.1):
 *   Liquid fills tank → displaces vapor space → vapor expelled
 *   q_ol = fill_rate × flash_factor
 *   flash_factor ≥ 1.0 (1.0 for non-volatile, >1 for volatile)
 *
 * N4 — Liquid Pump-Out / Inbreathing (Section 4.4.2):
 *   Liquid withdrawn → creates vacuum in vapor space → air drawn in
 *   q_il = empty_rate (1:1 volume displacement)
 *
 * Total Normal Outbreathing = N1 + N3 (thermal + pump-in)
 * Total Normal Inbreathing  = N2 + N4 (thermal + pump-out)
 *
 * ═══════════════════════════════════════════════════════════════════
 * EMERGENCY VENTING — Section 5
 * ═══════════════════════════════════════════════════════════════════
 *
 * E1 — External Fire on Wetted Area (Section 5.2):
 *   Q = 43,200 × F × A_w^0.82  (W) for A_w > 2.8 m²
 *   Vaporization rate = Q / (L_v × 1000)  (kg/s)
 *   Free air equivalent via ideal gas law correction
 *
 * E2 — Fire with Insulation Credit (Section 5.2.3):
 *   Environmental factor F < 1.0 for approved insulation
 *   F = 0.3 (approved insulation), 0.5 (concrete), 0.03 (earth-covered)
 *
 * E3 — Fire with Drainage (Section 5.2.2):
 *   Prompt drainage of flammable liquid away from tank
 *   Reduces effective wetted area or applies drainage credit factor
 *
 * E4 — Floating Roof Fire (Section 5.4):
 *   Reduced emergency venting — rim seal fire only
 *   Effective area = π × D × rim_height (not full wetted area)
 *
 * ═══════════════════════════════════════════════════════════════════
 * COMBINED / TOTAL VENTING — Section 6
 * ═══════════════════════════════════════════════════════════════════
 *
 * Pressure side: max(total_normal_outbreathing, emergency_outbreathing)
 * Vacuum side:   total_normal_inbreathing (emergency does not add to vacuum)
 *
 * API 2000 Section 5.3: Normal venting capacity can be credited against
 * emergency venting requirement (net emergency = emergency - normal_capacity)
 *
 * ═══════════════════════════════════════════════════════════════════
 * VENT DEVICE SIZING — Section 6 / Annex A
 * ═══════════════════════════════════════════════════════════════════
 *
 * Separate sizing for:
 *   - PV valve (pressure relief + vacuum break in one device)
 *   - Pressure-only vent (conservation vent)
 *   - Vacuum-only breaker
 *   - Emergency vent (manhole cover, rupture pin, etc.)
 *   - Open vent with flame arrester
 *
 * A = q / (Cd × √(2 × ΔP × ρ))
 * Cd = 0.62 (PV valves), 0.72 (open vents)
 *
 * Reference:
 * - API Std 2000, 7th Edition (2014)
 * - API 2510: LPG Installations
 * - NFPA 30: Flammable and Combustible Liquids Code
 */

export type TankType = "cone_roof" | "dome_roof" | "flat_roof" | "floating_roof";
export type ProductCategory = "hexane_and_below" | "above_hexane" | "non_volatile";
export type InsulationType = "bare" | "concrete" | "insulated_approved" | "insulated_unapproved" | "earth_covered" | "underground";
export type VentDeviceType = "pv_valve" | "open_vent" | "emergency_manhole" | "rupture_pin";

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
  hasDrainage: boolean;
  drainageFactor: number;
  rimSealHeight_m: number;
}

export interface TankGeometry {
  volume_m3: number;
  shellArea_m2: number;
  roofArea_m2: number;
  wettedArea_m2: number;
  liquidVolume_m3: number;
  vaporSpace_m3: number;
  diameter_m: number;
  height_m: number;
}

export interface ScenarioResult {
  id: string;
  name: string;
  section: string;
  direction: "outbreathing" | "inbreathing" | "outbreathing (emergency)";
  flow_Nm3h: number;
  description: string;
  isApplicable: boolean;
  notApplicableReason?: string;
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
  effectiveWettedArea_m2: number;
  envFactor: number;
  drainageFactor: number;
  heatInput_kW: number;
  vaporizationRate_kg_h: number;
  emergencyVenting_Nm3h: number;
  netEmergency_Nm3h: number;
  normalCredit_Nm3h: number;
}

export interface VentSizingResult {
  totalRequired_Nm3h: number;
  normalRequired_Nm3h: number;
  emergencyRequired_Nm3h: number;
  pressureVentArea_mm2: number;
  vacuumVentArea_mm2: number;
  emergencyVentArea_mm2: number;
  pressureVentDia_mm: number;
  vacuumVentDia_mm: number;
  emergencyVentDia_mm: number;
  pressureNPS: string;
  vacuumNPS: string;
  emergencyNPS: string;
  governingSide: "pressure" | "vacuum";
}

export interface Api2000Result {
  geometry: TankGeometry;
  scenarios: ScenarioResult[];
  normalVenting: NormalVentingResult;
  emergencyVenting: EmergencyVentingResult;
  ventSizing: VentSizingResult;
  scenarioSummary: {
    totalNormalOutbreathing_Nm3h: number;
    totalNormalInbreathing_Nm3h: number;
    emergencyOutbreathing_Nm3h: number;
    governingPressure_Nm3h: number;
    governingVacuum_Nm3h: number;
    governingPressureScenario: string;
    governingVacuumScenario: string;
  };
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
  hexane_and_below: "Group A \u2014 High volatility (NVP > 6.7 kPa, or flash point < 37.8\u00B0C / 100\u00B0F, API 2000 Table 2)",
  above_hexane: "Group B \u2014 Moderate volatility (flash point 37.8\u201360\u00B0C / 100\u2013140\u00B0F, NVP \u2264 6.7 kPa)",
  non_volatile: "Group C \u2014 Low volatility (flash point > 60\u00B0C / 140\u00B0F)",
};

export const INSULATION_LABELS = ENV_LABELS;

export const VENT_DEVICE_LABELS: Record<VentDeviceType, string> = {
  pv_valve: "PV Valve (Pressure/Vacuum)",
  open_vent: "Open Vent with Flame Arrester",
  emergency_manhole: "Emergency Manhole Cover (weighted)",
  rupture_pin: "Rupture Pin Device",
};

const VENT_CD: Record<VentDeviceType, number> = {
  pv_valve: 0.62,
  open_vent: 0.72,
  emergency_manhole: 0.55,
  rupture_pin: 0.62,
};

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
    diameter_m: D,
    height_m: H,
  };
}

function calcFireHeat(
  effectiveArea_m2: number, F: number, drainageFactor: number
): number {
  if (effectiveArea_m2 <= 2.8 || F <= 0) return 0;
  return 43200 * F * drainageFactor * Math.pow(effectiveArea_m2, 0.82);
}

function calcEmergencyFlow(
  heatInput_W: number,
  latentHeat_kJ_kg: number,
  vaporDensity_kg_m3: number,
  vaporMW: number,
  relievingTemp_C: number,
  F: number,
  effectiveArea_m2: number,
): { vap_kg_h: number; flow_Nm3h: number } {
  const T_K = relievingTemp_C + 273.15;
  const heatInput_kW = heatInput_W / 1000;

  if (latentHeat_kJ_kg > 0 && vaporDensity_kg_m3 > 0 && heatInput_kW > 0) {
    const vap_kg_h = (heatInput_kW * 3600) / latentHeat_kJ_kg;
    const actual_m3h = vap_kg_h / vaporDensity_kg_m3;
    // API 2000 §3.40: Nm³ defined at 15 °C (288.15 K), 101.325 kPa
    const flow_Nm3h = actual_m3h * (288.15 / T_K);
    return { vap_kg_h, flow_Nm3h };
  }

  if (heatInput_W > 0) {
    // Approximate free-air equivalent — API 2000 §3.40 standard: 288.15 K
    const flow_Nm3h = 906.6 * F * Math.pow(effectiveArea_m2, 0.82) *
      Math.sqrt(28.97 / Math.max(vaporMW, 1)) * Math.sqrt(T_K / 288.15);
    const vap_kg_h = latentHeat_kJ_kg > 0 ? (heatInput_kW * 3600) / latentHeat_kJ_kg : 0;
    return { vap_kg_h, flow_Nm3h };
  }

  return { vap_kg_h: 0, flow_Nm3h: 0 };
}

function sizeVentForDP(
  flowRate_Nm3h: number, dp_mbar: number, Cd: number
): { area_mm2: number; dia_mm: number; nps: string } {
  const rho_air = 1.225;
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

export function calculateApi2000(input: Api2000Input): Api2000Result {
  const trace: { step: string; value: string }[] = [];
  const assumptions: string[] = [];
  const warnings: string[] = [];
  const scenarios: ScenarioResult[] = [];

  if (input.tankDiameter_m <= 0) throw new Error("Tank diameter must be positive");
  if (input.tankHeight_m <= 0) throw new Error("Tank height must be positive");
  if (input.designPressure_mbar <= 0) throw new Error("Design pressure must be positive");
  if (input.designVacuum_mbar <= 0) throw new Error("Design vacuum must be positive");
  if (input.vaporMW <= 0) throw new Error("Vapor molecular weight must be positive");

  const geom = calculateTankGeometry(
    input.tankDiameter_m, input.tankHeight_m, input.tankType, input.liquidLevel_percent
  );

  trace.push({ step: "\u2550\u2550\u2550 TANK GEOMETRY \u2550\u2550\u2550", value: "" });
  trace.push({ step: "Tank diameter D", value: `${fmtNum(geom.diameter_m)} m` });
  trace.push({ step: "Tank height H", value: `${fmtNum(geom.height_m)} m` });
  trace.push({ step: "Tank volume V = \u03C0/4 \u00D7 D\u00B2 \u00D7 H + roof", value: `${fmtNum(geom.volume_m3)} m\u00B3` });
  trace.push({ step: "Shell area = \u03C0 \u00D7 D \u00D7 H", value: `${fmtNum(geom.shellArea_m2)} m\u00B2` });
  trace.push({ step: `Liquid level = ${input.liquidLevel_percent}%`, value: `H_liq = ${fmtNum(geom.height_m * input.liquidLevel_percent / 100)} m` });
  trace.push({ step: "Wetted area = \u03C0 \u00D7 D \u00D7 H_liquid", value: `${fmtNum(geom.wettedArea_m2)} m\u00B2` });
  trace.push({ step: "Vapor space", value: `${fmtNum(geom.vaporSpace_m3)} m\u00B3` });

  const C_out = THERMAL_COEFF_OUT[input.productCategory];
  const C_in = THERMAL_COEFF_IN[input.productCategory];

  trace.push({ step: "\u2550\u2550\u2550 NORMAL VENTING \u2014 Section 4 \u2550\u2550\u2550", value: "" });

  const thermalOut = geom.volume_m3 > 0 ? C_out * Math.pow(geom.volume_m3, 0.7) : 0;
  const thermalIn = geom.volume_m3 > 0 ? C_in * Math.pow(geom.volume_m3, 0.7) : 0;

  scenarios.push({
    id: "N1",
    name: "Thermal Outbreathing",
    section: "4.3.2",
    direction: "outbreathing",
    flow_Nm3h: thermalOut,
    description: `Tank heats up \u2192 vapor space expands. q = ${C_out} \u00D7 V^0.7 = ${C_out} \u00D7 ${fmtNum(geom.volume_m3)}^0.7`,
    isApplicable: true,
  });

  trace.push({ step: `N1: Thermal outbreathing = ${C_out} \u00D7 V^0.7 (Table 2)`, value: `${fmtNum(thermalOut)} Nm\u00B3/h` });

  scenarios.push({
    id: "N2",
    name: "Thermal Inbreathing",
    section: "4.3.3",
    direction: "inbreathing",
    flow_Nm3h: thermalIn,
    description: `Tank cools down \u2192 vapor space contracts. q = ${C_in} \u00D7 V^0.7 = ${C_in} \u00D7 ${fmtNum(geom.volume_m3)}^0.7`,
    isApplicable: true,
  });

  trace.push({ step: `N2: Thermal inbreathing = ${C_in} \u00D7 V^0.7 (Table 3)`, value: `${fmtNum(thermalIn)} Nm\u00B3/h` });

  const liquidOut = input.maxFillRate_m3_h * Math.max(input.flashFactor, 1.0);
  const hasLiquidIn = input.maxFillRate_m3_h > 0;

  scenarios.push({
    id: "N3",
    name: "Liquid Pump-In (Outbreathing)",
    section: "4.4.1",
    direction: "outbreathing",
    flow_Nm3h: liquidOut,
    description: `Liquid fills tank \u2192 displaces vapor. q = fill_rate \u00D7 flash_factor = ${fmtNum(input.maxFillRate_m3_h)} \u00D7 ${fmtNum(input.flashFactor)}`,
    isApplicable: hasLiquidIn,
    notApplicableReason: hasLiquidIn ? undefined : "No liquid fill rate specified",
  });

  if (hasLiquidIn) {
    trace.push({ step: `N3: Liquid pump-in outbreathing = ${fmtNum(input.maxFillRate_m3_h)} \u00D7 ${fmtNum(input.flashFactor)}`, value: `${fmtNum(liquidOut)} Nm\u00B3/h` });
  } else {
    trace.push({ step: "N3: Liquid pump-in outbreathing", value: "N/A (no fill rate)" });
  }

  const liquidIn = input.maxEmptyRate_m3_h;
  const hasLiquidOut = input.maxEmptyRate_m3_h > 0;

  scenarios.push({
    id: "N4",
    name: "Liquid Pump-Out (Inbreathing)",
    section: "4.4.2",
    direction: "inbreathing",
    flow_Nm3h: liquidIn,
    description: `Liquid withdrawn \u2192 air drawn in. q = empty_rate = ${fmtNum(input.maxEmptyRate_m3_h)} m\u00B3/h (1:1 displacement)`,
    isApplicable: hasLiquidOut,
    notApplicableReason: hasLiquidOut ? undefined : "No liquid empty rate specified",
  });

  if (hasLiquidOut) {
    trace.push({ step: `N4: Liquid pump-out inbreathing = empty rate`, value: `${fmtNum(liquidIn)} Nm\u00B3/h` });
  } else {
    trace.push({ step: "N4: Liquid pump-out inbreathing", value: "N/A (no empty rate)" });
  }

  const totalNormalOut = thermalOut + liquidOut;
  const totalNormalIn = thermalIn + liquidIn;

  trace.push({ step: "Total normal outbreathing = N1 + N3", value: `${fmtNum(totalNormalOut)} Nm\u00B3/h` });
  trace.push({ step: "Total normal inbreathing = N2 + N4", value: `${fmtNum(totalNormalIn)} Nm\u00B3/h` });

  const normalGoverning = totalNormalOut > totalNormalIn ? "outbreathing" : "inbreathing";
  const normalMax = Math.max(totalNormalOut, totalNormalIn);
  trace.push({ step: `Governing normal direction: ${normalGoverning}`, value: `${fmtNum(normalMax)} Nm\u00B3/h` });

  const normal: NormalVentingResult = {
    thermalOutbreathing_Nm3h: thermalOut,
    thermalInbreathing_Nm3h: thermalIn,
    liquidMovementOut_Nm3h: liquidOut,
    liquidMovementIn_Nm3h: liquidIn,
    totalOutbreathing_Nm3h: totalNormalOut,
    totalInbreathing_Nm3h: totalNormalIn,
    governingNormal_Nm3h: normalMax,
    governingDirection: normalGoverning,
  };

  trace.push({ step: "\u2550\u2550\u2550 EMERGENCY VENTING \u2014 Section 5 \u2550\u2550\u2550", value: "" });

  const F = ENV_FACTORS[input.insulationType];
  const drainageF = input.hasDrainage ? Math.max(input.drainageFactor, 0) : 1.0;
  const isFloating = input.tankType === "floating_roof";
  const isUnderground = input.insulationType === "underground";

  let effectiveWettedArea = geom.wettedArea_m2;
  if (isFloating && input.rimSealHeight_m > 0) {
    effectiveWettedArea = Math.PI * geom.diameter_m * input.rimSealHeight_m;
  }

  trace.push({ step: `Environmental factor F (${ENV_LABELS[input.insulationType]})`, value: `${F}` });
  if (input.hasDrainage) {
    trace.push({ step: "Drainage factor (Section 5.2.2)", value: `${fmtNum(drainageF)}` });
  }

  const fireHeat_W_bare = calcFireHeat(effectiveWettedArea, 1.0, 1.0);
  const fireFlow_bare = calcEmergencyFlow(
    fireHeat_W_bare, input.latentHeat_kJ_kg, input.vaporDensity_kg_m3,
    input.vaporMW, input.relievingTemp_C, 1.0, effectiveWettedArea
  );

  const e1Applicable = !isFloating && !isUnderground && effectiveWettedArea > 2.8;

  scenarios.push({
    id: "E1",
    name: "External Fire \u2014 Bare Tank",
    section: "5.2",
    direction: "outbreathing (emergency)",
    flow_Nm3h: e1Applicable ? fireFlow_bare.flow_Nm3h : 0,
    description: e1Applicable
      ? `Q = 43,200 \u00D7 1.0 \u00D7 ${fmtNum(effectiveWettedArea)}^0.82 = ${fmtNum(fireHeat_W_bare / 1000)} kW`
      : isFloating ? "Not applicable \u2014 floating roof (see E4)" : isUnderground ? "Not applicable \u2014 underground tank" : "Wetted area \u2264 2.8 m\u00B2",
    isApplicable: e1Applicable,
    notApplicableReason: !e1Applicable ? (isFloating ? "Floating roof \u2014 use E4" : isUnderground ? "Underground tank (F=0)" : "Wetted area \u2264 2.8 m\u00B2") : undefined,
  });

  trace.push({ step: "E1: Fire (bare, F=1.0, no drainage credit)", value: `Q = ${fmtNum(fireHeat_W_bare / 1000)} kW \u2192 ${fmtNum(fireFlow_bare.flow_Nm3h)} Nm\u00B3/h` });

  const fireHeat_W_insulated = calcFireHeat(effectiveWettedArea, F, 1.0);
  const fireFlow_insulated = calcEmergencyFlow(
    fireHeat_W_insulated, input.latentHeat_kJ_kg, input.vaporDensity_kg_m3,
    input.vaporMW, input.relievingTemp_C, F, effectiveWettedArea
  );
  const isInsulated = F < 1.0;

  const e2Applicable = !isFloating && !isUnderground && isInsulated && effectiveWettedArea > 2.8;

  scenarios.push({
    id: "E2",
    name: "External Fire \u2014 Insulation Credit",
    section: "5.2.3",
    direction: "outbreathing (emergency)",
    flow_Nm3h: e2Applicable ? fireFlow_insulated.flow_Nm3h : 0,
    description: e2Applicable
      ? `Q = 43,200 \u00D7 ${F} \u00D7 ${fmtNum(effectiveWettedArea)}^0.82 = ${fmtNum(fireHeat_W_insulated / 1000)} kW`
      : isFloating ? "Not applicable \u2014 floating roof (see E4)" : isUnderground ? "Not applicable \u2014 underground tank" : !isInsulated ? "Tank is bare (F = 1.0)" : "Wetted area \u2264 2.8 m\u00B2",
    isApplicable: e2Applicable,
    notApplicableReason: !e2Applicable ? (isFloating ? "Floating roof \u2014 use E4" : isUnderground ? "Underground tank (F=0)" : !isInsulated ? "Tank is bare (F = 1.0)" : "Wetted area \u2264 2.8 m\u00B2") : undefined,
  });

  if (isInsulated) {
    trace.push({ step: `E2: Fire (insulated, F=${F})`, value: `Q = ${fmtNum(fireHeat_W_insulated / 1000)} kW \u2192 ${fmtNum(fireFlow_insulated.flow_Nm3h)} Nm\u00B3/h` });
  } else {
    trace.push({ step: "E2: Fire with insulation credit", value: "N/A (bare tank)" });
  }

  const fireHeat_W_drained = calcFireHeat(effectiveWettedArea, F, drainageF);
  const fireFlow_drained = calcEmergencyFlow(
    fireHeat_W_drained, input.latentHeat_kJ_kg, input.vaporDensity_kg_m3,
    input.vaporMW, input.relievingTemp_C, F * drainageF, effectiveWettedArea
  );

  const e3Applicable = !isFloating && !isUnderground && input.hasDrainage && effectiveWettedArea > 2.8;

  scenarios.push({
    id: "E3",
    name: "External Fire \u2014 With Drainage",
    section: "5.2.2",
    direction: "outbreathing (emergency)",
    flow_Nm3h: e3Applicable ? fireFlow_drained.flow_Nm3h : 0,
    description: e3Applicable
      ? `Q = 43,200 \u00D7 ${F} \u00D7 ${fmtNum(drainageF)} \u00D7 ${fmtNum(effectiveWettedArea)}^0.82 = ${fmtNum(fireHeat_W_drained / 1000)} kW`
      : isFloating ? "Not applicable \u2014 floating roof (see E4)" : isUnderground ? "Not applicable \u2014 underground tank" : !input.hasDrainage ? "No drainage provisions" : "Wetted area \u2264 2.8 m\u00B2",
    isApplicable: e3Applicable,
    notApplicableReason: !e3Applicable ? (isFloating ? "Floating roof \u2014 use E4" : isUnderground ? "Underground tank (F=0)" : !input.hasDrainage ? "No drainage provisions" : "Wetted area \u2264 2.8 m\u00B2") : undefined,
  });

  if (input.hasDrainage) {
    trace.push({ step: `E3: Fire with drainage (F=${F}, drainage=${fmtNum(drainageF)})`, value: `Q = ${fmtNum(fireHeat_W_drained / 1000)} kW \u2192 ${fmtNum(fireFlow_drained.flow_Nm3h)} Nm\u00B3/h` });
  } else {
    trace.push({ step: "E3: Fire with drainage provisions", value: "N/A (no drainage)" });
  }

  let floatingRoofEmergency = 0;
  if (isFloating && input.rimSealHeight_m > 0) {
    const rimArea = Math.PI * geom.diameter_m * input.rimSealHeight_m;
    const rimHeat = calcFireHeat(rimArea, F, drainageF);
    const rimFlow = calcEmergencyFlow(
      rimHeat, input.latentHeat_kJ_kg, input.vaporDensity_kg_m3,
      input.vaporMW, input.relievingTemp_C, F, rimArea
    );
    floatingRoofEmergency = rimFlow.flow_Nm3h;
  }

  const e4Applicable = isFloating && !isUnderground;

  scenarios.push({
    id: "E4",
    name: "Floating Roof \u2014 Rim Seal Fire",
    section: "5.4",
    direction: "outbreathing (emergency)",
    flow_Nm3h: e4Applicable ? floatingRoofEmergency : 0,
    description: e4Applicable
      ? `Rim seal fire only. Effective area = \u03C0 \u00D7 D \u00D7 rim_height = ${fmtNum(Math.PI * geom.diameter_m * input.rimSealHeight_m)} m\u00B2`
      : isUnderground ? "Not applicable \u2014 underground tank" : "Not applicable \u2014 fixed roof tank",
    isApplicable: e4Applicable,
    notApplicableReason: !e4Applicable ? (isUnderground ? "Underground tank (F=0)" : "Not a floating roof tank") : undefined,
  });

  if (isFloating) {
    trace.push({ step: "E4: Floating roof rim seal fire", value: `${fmtNum(floatingRoofEmergency)} Nm\u00B3/h` });
  } else {
    trace.push({ step: "E4: Floating roof rim seal fire", value: "N/A (fixed roof tank)" });
  }

  let governingEmergency_Nm3h: number;
  let governingEmergencyScenario: string;

  if (input.insulationType === "underground") {
    governingEmergency_Nm3h = 0;
    governingEmergencyScenario = "None (underground tank)";
  } else if (isFloating) {
    governingEmergency_Nm3h = floatingRoofEmergency;
    governingEmergencyScenario = "E4 (floating roof rim seal)";
  } else if (input.hasDrainage) {
    governingEmergency_Nm3h = fireFlow_drained.flow_Nm3h;
    governingEmergencyScenario = "E3 (fire with drainage)";
  } else if (isInsulated) {
    governingEmergency_Nm3h = fireFlow_insulated.flow_Nm3h;
    governingEmergencyScenario = "E2 (fire with insulation)";
  } else {
    governingEmergency_Nm3h = fireFlow_bare.flow_Nm3h;
    governingEmergencyScenario = "E1 (fire, bare tank)";
  }

  const normalCredit = totalNormalOut;
  const netEmergency = Math.max(governingEmergency_Nm3h - normalCredit, 0);

  trace.push({ step: `Governing emergency scenario: ${governingEmergencyScenario}`, value: `${fmtNum(governingEmergency_Nm3h)} Nm\u00B3/h` });
  trace.push({ step: "Normal outbreathing credit (Section 5.3)", value: `\u2212${fmtNum(normalCredit)} Nm\u00B3/h` });
  trace.push({ step: "Net emergency vent requirement", value: `${fmtNum(netEmergency)} Nm\u00B3/h` });

  const emergency: EmergencyVentingResult = {
    wettedArea_m2: geom.wettedArea_m2,
    effectiveWettedArea_m2: effectiveWettedArea,
    envFactor: F,
    drainageFactor: drainageF,
    heatInput_kW: (isFloating ? calcFireHeat(effectiveWettedArea, F, drainageF) : (input.hasDrainage ? fireHeat_W_drained : isInsulated ? fireHeat_W_insulated : fireHeat_W_bare)) / 1000,
    vaporizationRate_kg_h: (input.hasDrainage ? fireFlow_drained : isInsulated ? fireFlow_insulated : fireFlow_bare).vap_kg_h,
    emergencyVenting_Nm3h: governingEmergency_Nm3h,
    netEmergency_Nm3h: netEmergency,
    normalCredit_Nm3h: normalCredit,
  };

  trace.push({ step: "\u2550\u2550\u2550 SCENARIO SUMMARY \u2550\u2550\u2550", value: "" });

  const totalPressureSide = totalNormalOut + netEmergency;
  const governingPressure = totalPressureSide;
  const governingPressureScenario = netEmergency > 0
    ? `Normal (${fmtNum(totalNormalOut)}) + net emergency (${fmtNum(netEmergency)}) via ${governingEmergencyScenario}`
    : "Normal outbreathing (N1+N3)";
  const governingVacuum = totalNormalIn;
  const governingVacuumScenario = "Normal inbreathing (N2+N4)";

  trace.push({ step: `Pressure side governing: ${governingPressureScenario}`, value: `${fmtNum(governingPressure)} Nm\u00B3/h` });
  trace.push({ step: `Vacuum side governing: ${governingVacuumScenario}`, value: `${fmtNum(governingVacuum)} Nm\u00B3/h` });

  const scenarioSummary = {
    totalNormalOutbreathing_Nm3h: totalNormalOut,
    totalNormalInbreathing_Nm3h: totalNormalIn,
    emergencyOutbreathing_Nm3h: governingEmergency_Nm3h,
    governingPressure_Nm3h: governingPressure,
    governingVacuum_Nm3h: governingVacuum,
    governingPressureScenario,
    governingVacuumScenario,
  };

  trace.push({ step: "\u2550\u2550\u2550 VENT SIZING \u2550\u2550\u2550", value: "" });

  const Cd_pv = VENT_CD.pv_valve;
  const Cd_emerg = VENT_CD.emergency_manhole;

  const pressureVent = sizeVentForDP(totalNormalOut, input.designPressure_mbar, Cd_pv);
  const vacuumVent = sizeVentForDP(totalNormalIn, input.designVacuum_mbar, Cd_pv);
  const emergencyVent = sizeVentForDP(netEmergency, input.designPressure_mbar, Cd_emerg);

  trace.push({ step: "--- PV Valve \u2014 Normal Pressure (Outbreathing) ---", value: "" });
  trace.push({ step: `Flow = total normal outbreathing`, value: `${fmtNum(totalNormalOut)} Nm\u00B3/h` });
  trace.push({ step: `Area (Cd=${Cd_pv}, \u0394P=${input.designPressure_mbar} mbar)`, value: `${fmtNum(pressureVent.area_mm2)} mm\u00B2 \u2192 ${pressureVent.nps}` });

  trace.push({ step: "--- PV Valve \u2014 Normal Vacuum (Inbreathing) ---", value: "" });
  trace.push({ step: `Flow = total normal inbreathing`, value: `${fmtNum(totalNormalIn)} Nm\u00B3/h` });
  trace.push({ step: `Area (Cd=${Cd_pv}, \u0394P=${input.designVacuum_mbar} mbar)`, value: `${fmtNum(vacuumVent.area_mm2)} mm\u00B2 \u2192 ${vacuumVent.nps}` });

  trace.push({ step: "--- Emergency Vent (net of normal credit) ---", value: "" });
  trace.push({ step: `Flow = net emergency`, value: `${fmtNum(netEmergency)} Nm\u00B3/h` });
  trace.push({ step: `Area (Cd=${Cd_emerg}, \u0394P=${input.designPressure_mbar} mbar)`, value: `${fmtNum(emergencyVent.area_mm2)} mm\u00B2 \u2192 ${emergencyVent.nps}` });

  const governingSide = pressureVent.area_mm2 >= vacuumVent.area_mm2 ? "pressure" : "vacuum";
  trace.push({ step: "PV valve governing side", value: governingSide });

  const ventSizing: VentSizingResult = {
    totalRequired_Nm3h: Math.max(governingPressure, governingVacuum),
    normalRequired_Nm3h: normalMax,
    emergencyRequired_Nm3h: governingEmergency_Nm3h,
    pressureVentArea_mm2: pressureVent.area_mm2,
    vacuumVentArea_mm2: vacuumVent.area_mm2,
    emergencyVentArea_mm2: emergencyVent.area_mm2,
    pressureVentDia_mm: pressureVent.dia_mm,
    vacuumVentDia_mm: vacuumVent.dia_mm,
    emergencyVentDia_mm: emergencyVent.dia_mm,
    pressureNPS: pressureVent.nps,
    vacuumNPS: vacuumVent.nps,
    emergencyNPS: emergencyVent.nps,
    governingSide,
  };

  assumptions.push("Non-refrigerated atmospheric storage tank per API 2000, 7th Edition");
  assumptions.push(`Thermal breathing coefficients: C_out = ${C_out}, C_in = ${C_in} (API 2000 Table 2/3)`);
  assumptions.push("Liquid movement: 1:1 volume displacement at atmospheric conditions (Section 4.4)");
  assumptions.push("Fire heat input: Q = 43,200 \u00D7 F \u00D7 drainage \u00D7 A_w^0.82 W (Section 5.2, A_w > 2.8 m\u00B2)");
  assumptions.push(`Normal venting credit applied to emergency per Section 5.3: ${fmtNum(normalCredit)} Nm\u00B3/h`);
  assumptions.push(`PV valve Cd = ${Cd_pv}; Emergency vent Cd = ${Cd_emerg}`);
  assumptions.push("Standard conditions: 15\u00B0C (288.15 K), 101.325 kPa for Nm\u00B3/h (API 2000 \u00A73.40)");

  if (isFloating) {
    warnings.push("Floating roof tank: emergency venting based on rim seal area only (Section 5.4)");
    if (input.rimSealHeight_m <= 0) {
      warnings.push("Rim seal height not specified \u2014 emergency venting may be underestimated");
    }
  }
  if (geom.volume_m3 > 50000) {
    warnings.push("Very large tank (>50,000 m\u00B3): verify thermal breathing with API 2000 Table 2/3 extrapolation");
  }
  if (input.designPressure_mbar < 3.5) {
    warnings.push("Very low design pressure (<3.5 mbar): consider structural adequacy of tank shell");
  }
  if (input.flashFactor > 5) {
    warnings.push(`High flash factor (${input.flashFactor}): verify with process simulation`);
  }
  if (governingEmergency_Nm3h > totalNormalOut * 10 && governingEmergency_Nm3h > 0) {
    warnings.push("Emergency venting \u226B normal venting: verify insulation and drainage provisions");
  }
  if (netEmergency > 0 && emergencyVent.dia_mm > 600) {
    warnings.push("Emergency vent diameter exceeds 24\": consider multiple devices or weighted manhole covers");
  }
  if (pressureVent.dia_mm > 600 || vacuumVent.dia_mm > 600) {
    warnings.push("PV valve diameter exceeds 24\": consider multiple PV valves");
  }
  if (input.insulationType === "insulated_unapproved") {
    warnings.push("Unapproved insulation does not receive environmental credit (F = 1.0 per API 2000)");
  }
  warnings.push("Screening calculation. Final sizing requires vendor-rated PV valve and emergency vent capacity data.");

  return {
    geometry: geom,
    scenarios,
    normalVenting: normal,
    emergencyVenting: emergency,
    ventSizing: ventSizing,
    scenarioSummary,
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
  hasDrainage: false,
  drainageFactor: 1.0,
  rimSealHeight_m: 0,
};
