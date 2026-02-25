import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { PipeSizeSelector } from "@/components/engineering/pipe-size-selector";
import {
  calculatePumpSizing,
  calculatePDPumpSizing,
  PUMP_SIZING_TEST_CASE,
  PD_PUMP_TEST_CASE,
  type PumpSizingResult,
  type PDPumpSizingResult,
  type PumpType,
} from "@/lib/engineering/pumpSizing";
import { COMMON_LIQUIDS, FITTING_K_VALUES } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import { convertFormValues, type FieldUnitMap } from "@/lib/engineering/unitToggle";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { Droplets, FlaskConical, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PumpCurveChart } from "@/components/engineering/pump-curve-chart";
import { PDCurveChart } from "@/components/engineering/pd-curve-chart";

interface FormState {
  flowRate: string;
  liquidDensity: string;
  viscosity: string;
  suctionStaticHead: string;
  dischargeStaticHead: string;
  suctionPipeLength: string;
  dischargePipeLength: string;
  suctionPipeDiameter: string;
  dischargePipeDiameter: string;
  suctionRoughness: string;
  dischargeRoughness: string;
  suctionFittingsK: string;
  dischargeFittingsK: string;
  pumpEfficiency: string;
  motorEfficiency: string;
  vaporPressure: string;
  atmosphericPressure: string;
  suctionVesselPressure: string;
  volumetricEfficiency: string;
  mechanicalEfficiency: string;
  reliefValvePressure: string;
  dischargePressure: string;
}

const defaultForm: FormState = {
  flowRate: "",
  liquidDensity: "",
  viscosity: "",
  suctionStaticHead: "",
  dischargeStaticHead: "",
  suctionPipeLength: "",
  dischargePipeLength: "",
  suctionPipeDiameter: "",
  dischargePipeDiameter: "",
  suctionRoughness: "0.0457",
  dischargeRoughness: "0.0457",
  suctionFittingsK: "0",
  dischargeFittingsK: "0",
  pumpEfficiency: "75",
  motorEfficiency: "95",
  vaporPressure: "",
  atmosphericPressure: "1.01325",
  suctionVesselPressure: "0",
  volumetricEfficiency: "90",
  mechanicalEfficiency: "85",
  reliefValvePressure: "",
  dischargePressure: "",
};

const fieldUnitMap: FieldUnitMap = {
  flowRate: "flowLiquid",
  liquidDensity: null,
  viscosity: null,
  suctionStaticHead: "head",
  dischargeStaticHead: "head",
  suctionPipeLength: "length",
  dischargePipeLength: "length",
  suctionPipeDiameter: "diameter",
  dischargePipeDiameter: "diameter",
  suctionRoughness: null,
  dischargeRoughness: null,
  suctionFittingsK: null,
  dischargeFittingsK: null,
  pumpEfficiency: null,
  motorEfficiency: null,
  vaporPressure: "pressureKpa",
  atmosphericPressure: "pressureAbs",
  suctionVesselPressure: "pressure",
  volumetricEfficiency: null,
  mechanicalEfficiency: null,
  reliefValvePressure: "pressure",
  dischargePressure: "pressure",
};

interface FittingEntry {
  name: string;
  count: number;
}

export default function PumpSizingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [pumpType, setPumpType] = useState<PumpType>("centrifugal");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [centrifugalResult, setCentrifugalResult] = useState<PumpSizingResult | null>(null);
  const [pdResult, setPdResult] = useState<PDPumpSizingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suctionFittings, setSuctionFittings] = useState<FittingEntry[]>([]);
  const [dischargeFittings, setDischargeFittings] = useState<FittingEntry[]>([]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnitToggle = (newSystem: UnitSystem) => {
    const converted = convertFormValues(form, fieldUnitMap, unitSystem, newSystem);
    setForm(converted);
    setUnitSystem(newSystem);
  };

  const handlePumpTypeChange = (type: PumpType) => {
    setPumpType(type);
    setCentrifugalResult(null);
    setPdResult(null);
    setError(null);
  };

  const computeKTotal = (fittings: FittingEntry[]): number => {
    return fittings.reduce((sum, f) => {
      const kVal = FITTING_K_VALUES[f.name] ?? 0;
      return sum + kVal * f.count;
    }, 0);
  };

  const addFitting = (side: "suction" | "discharge", name: string) => {
    const setter = side === "suction" ? setSuctionFittings : setDischargeFittings;
    const field = side === "suction" ? "suctionFittingsK" : "dischargeFittingsK";
    setter((prev) => {
      const existing = prev.find((f) => f.name === name);
      let updated: FittingEntry[];
      if (existing) {
        updated = prev.map((f) => f.name === name ? { ...f, count: f.count + 1 } : f);
      } else {
        updated = [...prev, { name, count: 1 }];
      }
      const total = computeKTotal(updated);
      updateField(field, total.toFixed(2));
      return updated;
    });
  };

  const removeFitting = (side: "suction" | "discharge", name: string) => {
    const setter = side === "suction" ? setSuctionFittings : setDischargeFittings;
    const field = side === "suction" ? "suctionFittingsK" : "dischargeFittingsK";
    setter((prev) => {
      const updated = prev.filter((f) => f.name !== name);
      const total = computeKTotal(updated);
      updateField(field, total.toFixed(2));
      return updated;
    });
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const pipingInput = {
        flowRate: convertToSI("flowLiquid", parseFloat(form.flowRate), unitSystem),
        liquidDensity: parseFloat(form.liquidDensity),
        viscosity: parseFloat(form.viscosity),
        suctionStaticHead: convertToSI("head", parseFloat(form.suctionStaticHead), unitSystem),
        dischargeStaticHead: convertToSI("head", parseFloat(form.dischargeStaticHead), unitSystem),
        suctionPipeLength: convertToSI("length", parseFloat(form.suctionPipeLength), unitSystem),
        dischargePipeLength: convertToSI("length", parseFloat(form.dischargePipeLength), unitSystem),
        suctionPipeDiameter: convertToSI("diameter", parseFloat(form.suctionPipeDiameter), unitSystem),
        dischargePipeDiameter: convertToSI("diameter", parseFloat(form.dischargePipeDiameter), unitSystem),
        suctionRoughness: parseFloat(form.suctionRoughness),
        dischargeRoughness: parseFloat(form.dischargeRoughness),
        suctionFittingsK: parseFloat(form.suctionFittingsK),
        dischargeFittingsK: parseFloat(form.dischargeFittingsK),
        vaporPressure: convertToSI("pressureKpa", parseFloat(form.vaporPressure), unitSystem),
        atmosphericPressure: convertToSI("pressureAbs", parseFloat(form.atmosphericPressure), unitSystem),
        suctionVesselPressure: convertToSI("pressure", parseFloat(form.suctionVesselPressure), unitSystem),
      };

      for (const [key, val] of Object.entries(pipingInput)) {
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
      }

      if (pumpType === "centrifugal") {
        const input = {
          ...pipingInput,
          pumpEfficiency: parseFloat(form.pumpEfficiency),
          motorEfficiency: parseFloat(form.motorEfficiency),
        };
        if (isNaN(input.pumpEfficiency)) throw new Error("Invalid pump efficiency");
        if (isNaN(input.motorEfficiency)) throw new Error("Invalid motor efficiency");
        const res = calculatePumpSizing(input);
        setCentrifugalResult(res);
        setPdResult(null);
      } else {
        const input = {
          ...pipingInput,
          volumetricEfficiency: parseFloat(form.volumetricEfficiency),
          mechanicalEfficiency: parseFloat(form.mechanicalEfficiency),
          motorEfficiency: parseFloat(form.motorEfficiency),
          reliefValvePressure: convertToSI("pressure", parseFloat(form.reliefValvePressure) || 0, unitSystem),
          dischargePressure: convertToSI("pressure", parseFloat(form.dischargePressure) || 0, unitSystem),
        };
        if (isNaN(input.volumetricEfficiency)) throw new Error("Invalid volumetric efficiency");
        if (isNaN(input.mechanicalEfficiency)) throw new Error("Invalid mechanical efficiency");
        if (isNaN(input.motorEfficiency)) throw new Error("Invalid motor efficiency");
        const res = calculatePDPumpSizing(input);
        setPdResult(res);
        setCentrifugalResult(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setCentrifugalResult(null);
      setPdResult(null);
    }
  };

  const loadTestCase = () => {
    setError(null);
    setCentrifugalResult(null);
    setPdResult(null);
    setSuctionFittings([]);
    setDischargeFittings([]);
    setUnitSystem("SI");

    if (pumpType === "centrifugal") {
      const tc = PUMP_SIZING_TEST_CASE;
      setForm({
        ...defaultForm,
        flowRate: String(tc.flowRate),
        liquidDensity: String(tc.liquidDensity),
        viscosity: String(tc.viscosity),
        suctionStaticHead: String(tc.suctionStaticHead),
        dischargeStaticHead: String(tc.dischargeStaticHead),
        suctionPipeLength: String(tc.suctionPipeLength),
        dischargePipeLength: String(tc.dischargePipeLength),
        suctionPipeDiameter: String(tc.suctionPipeDiameter),
        dischargePipeDiameter: String(tc.dischargePipeDiameter),
        suctionRoughness: String(tc.suctionRoughness),
        dischargeRoughness: String(tc.dischargeRoughness),
        suctionFittingsK: String(tc.suctionFittingsK),
        dischargeFittingsK: String(tc.dischargeFittingsK),
        pumpEfficiency: String(tc.pumpEfficiency),
        motorEfficiency: String(tc.motorEfficiency),
        vaporPressure: String(tc.vaporPressure),
        atmosphericPressure: String(tc.atmosphericPressure),
        suctionVesselPressure: String(tc.suctionVesselPressure),
      });
    } else {
      const tc = PD_PUMP_TEST_CASE;
      setForm({
        ...defaultForm,
        flowRate: String(tc.flowRate),
        liquidDensity: String(tc.liquidDensity),
        viscosity: String(tc.viscosity),
        suctionStaticHead: String(tc.suctionStaticHead),
        dischargeStaticHead: String(tc.dischargeStaticHead),
        suctionPipeLength: String(tc.suctionPipeLength),
        dischargePipeLength: String(tc.dischargePipeLength),
        suctionPipeDiameter: String(tc.suctionPipeDiameter),
        dischargePipeDiameter: String(tc.dischargePipeDiameter),
        suctionRoughness: String(tc.suctionRoughness),
        dischargeRoughness: String(tc.dischargeRoughness),
        suctionFittingsK: String(tc.suctionFittingsK),
        dischargeFittingsK: String(tc.dischargeFittingsK),
        volumetricEfficiency: String(tc.volumetricEfficiency),
        mechanicalEfficiency: String(tc.mechanicalEfficiency),
        motorEfficiency: String(tc.motorEfficiency),
        vaporPressure: String(tc.vaporPressure),
        atmosphericPressure: String(tc.atmosphericPressure),
        suctionVesselPressure: String(tc.suctionVesselPressure),
        reliefValvePressure: String(tc.reliefValvePressure),
        dischargePressure: String(tc.dischargePressure),
      });
    }
  };

  const handleReset = () => {
    setForm(defaultForm);
    setSuctionFittings([]);
    setDischargeFittings([]);
    setCentrifugalResult(null);
    setPdResult(null);
    setError(null);
  };

  const handleLiquidSelect = (liquidName: string) => {
    const liquid = COMMON_LIQUIDS[liquidName];
    if (liquid) {
      setForm((prev) => ({
        ...prev,
        liquidDensity: String(liquid.density),
        viscosity: String(liquid.viscosity),
        vaporPressure: String(liquid.vaporPressure),
      }));
    }
  };

  const renderFittingsSection = (
    side: "suction" | "discharge",
    fittings: FittingEntry[],
    totalK: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Fittings (K total = {totalK})</Label>
        <Select onValueChange={(v) => addFitting(side, v)}>
          <SelectTrigger className="w-[180px]" data-testid={`select-${side}-fitting`}>
            <SelectValue placeholder="Add fitting..." />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(FITTING_K_VALUES).map((f) => (
              <SelectItem key={f} value={f}>{f} (K={FITTING_K_VALUES[f]})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {fittings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fittings.map((f) => (
            <Badge key={f.name} variant="secondary" className="text-xs gap-1">
              {f.count}x {f.name}
              <button
                onClick={() => removeFitting(side, f.name)}
                className="ml-0.5"
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  const buildCentrifugalExportData = (): ExportDatasheet | undefined => {
    if (!centrifugalResult) return undefined;
    const u = unitSystem;
    const r = centrifugalResult;
    return {
      calculatorName: "Pump Sizing Calculator — Centrifugal",
      inputs: [
        { label: "Flow Rate", value: form.flowRate, unit: getUnit("flowLiquid", u) },
        { label: "Liquid Density", value: form.liquidDensity, unit: "kg/m\u00B3" },
        { label: "Viscosity", value: form.viscosity, unit: "cP" },
        { label: "Suction Static Head", value: form.suctionStaticHead, unit: getUnit("head", u) },
        { label: "Discharge Static Head", value: form.dischargeStaticHead, unit: getUnit("head", u) },
        { label: "Suction Pipe Length", value: form.suctionPipeLength, unit: getUnit("length", u) },
        { label: "Discharge Pipe Length", value: form.dischargePipeLength, unit: getUnit("length", u) },
        { label: "Suction Pipe Diameter", value: form.suctionPipeDiameter, unit: getUnit("diameter", u) },
        { label: "Discharge Pipe Diameter", value: form.dischargePipeDiameter, unit: getUnit("diameter", u) },
        { label: "Suction Roughness", value: form.suctionRoughness, unit: "mm" },
        { label: "Discharge Roughness", value: form.dischargeRoughness, unit: "mm" },
        { label: "Suction Fittings K", value: form.suctionFittingsK },
        { label: "Discharge Fittings K", value: form.dischargeFittingsK },
        { label: "Pump Efficiency", value: form.pumpEfficiency, unit: "%" },
        { label: "Motor Efficiency", value: form.motorEfficiency, unit: "%" },
        { label: "Vapor Pressure", value: form.vaporPressure, unit: getUnit("pressureKpa", u) },
        { label: "Atmospheric Pressure", value: form.atmosphericPressure, unit: getUnit("pressureAbs", u) },
        { label: "Suction Vessel Pressure", value: form.suctionVesselPressure, unit: getUnit("pressure", u) },
      ],
      results: [
        { label: "Total Dynamic Head (TDH)", value: convertFromSI("head", r.totalDynamicHead, u), unit: getUnit("head", u), highlight: true },
        { label: "Static Head", value: convertFromSI("head", r.staticHead, u), unit: getUnit("head", u) },
        { label: "Suction Friction Loss", value: convertFromSI("head", r.suctionFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Discharge Friction Loss", value: convertFromSI("head", r.dischargeFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Total Friction Loss", value: convertFromSI("head", r.totalFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Hydraulic Power", value: convertFromSI("power", r.hydraulicPower, u), unit: getUnit("power", u) },
        { label: "Brake Power (BHP)", value: convertFromSI("power", r.brakePower, u), unit: getUnit("power", u), highlight: true },
        { label: "Motor Power Required", value: convertFromSI("power", r.motorPower, u), unit: getUnit("power", u), highlight: true },
        { label: "Suction Velocity", value: convertFromSI("velocity", r.suctionVelocity, u), unit: getUnit("velocity", u) },
        { label: "Discharge Velocity", value: convertFromSI("velocity", r.dischargeVelocity, u), unit: getUnit("velocity", u) },
        { label: "Suction Reynolds", value: r.suctionReynolds, unit: "\u2014" },
        { label: "Discharge Reynolds", value: r.dischargeReynolds, unit: "\u2014" },
        { label: "NPSHa (Available)", value: convertFromSI("head", r.npshaAvailable, u), unit: getUnit("head", u), highlight: r.npshaAvailable < 3.0 },
        { label: "Suction f (Darcy)", value: r.suctionFrictionFactor, unit: "\u2014" },
        { label: "Discharge f (Darcy)", value: r.dischargeFrictionFactor, unit: "\u2014" },
      ],
      methodology: [
        "Darcy-Weisbach equation with Swamee-Jain friction factor approximation",
        "TDH = Static Head + Friction Loss (suction + discharge) + Velocity Head difference",
        "Hydraulic Power = \u03C1 * g * Q * TDH",
        "Brake Power = Hydraulic Power / Pump Efficiency",
        "Motor Power = Brake Power / Motor Efficiency",
        "NPSHa = P_atm + P_vessel + h_suction - hf_suction - P_vapor (all in head of liquid)",
      ],
      assumptions: [
        "Steady-state, incompressible liquid flow",
        "Centrifugal pump application",
        "Darcy-Weisbach equation with Swamee-Jain friction factor",
        "Minor losses calculated using resistance coefficient (K) method",
        "NPSHa calculated per HI/API standards",
        "Atmospheric pressure at sea level unless specified",
        "Suction vessel pressure is gauge pressure (0 = atmospheric)",
      ],
      references: [
        "Hydraulic Institute Standards (HI 1.3) \u2014 Centrifugal Pump Design",
        "API 610 \u2014 Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries",
        "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
        "Cameron Hydraulic Data, 20th Edition",
        "Perry's Chemical Engineers' Handbook, 9th Edition",
      ],
      warnings: r.warnings,
    };
  };

  const buildPDExportData = (): ExportDatasheet | undefined => {
    if (!pdResult) return undefined;
    const u = unitSystem;
    const r = pdResult;
    return {
      calculatorName: "Pump Sizing Calculator — Positive Displacement",
      inputs: [
        { label: "Flow Rate", value: form.flowRate, unit: getUnit("flowLiquid", u) },
        { label: "Liquid Density", value: form.liquidDensity, unit: "kg/m\u00B3" },
        { label: "Viscosity", value: form.viscosity, unit: "cP" },
        { label: "Suction Static Head", value: form.suctionStaticHead, unit: getUnit("head", u) },
        { label: "Discharge Static Head", value: form.dischargeStaticHead, unit: getUnit("head", u) },
        { label: "Suction Pipe Length", value: form.suctionPipeLength, unit: getUnit("length", u) },
        { label: "Discharge Pipe Length", value: form.dischargePipeLength, unit: getUnit("length", u) },
        { label: "Suction Pipe Diameter", value: form.suctionPipeDiameter, unit: getUnit("diameter", u) },
        { label: "Discharge Pipe Diameter", value: form.dischargePipeDiameter, unit: getUnit("diameter", u) },
        { label: "Suction Roughness", value: form.suctionRoughness, unit: "mm" },
        { label: "Discharge Roughness", value: form.dischargeRoughness, unit: "mm" },
        { label: "Suction Fittings K", value: form.suctionFittingsK },
        { label: "Discharge Fittings K", value: form.dischargeFittingsK },
        { label: "Volumetric Efficiency", value: form.volumetricEfficiency, unit: "%" },
        { label: "Mechanical Efficiency", value: form.mechanicalEfficiency, unit: "%" },
        { label: "Motor Efficiency", value: form.motorEfficiency, unit: "%" },
        { label: "Discharge Pressure", value: form.dischargePressure, unit: getUnit("pressure", u) },
        { label: "Relief Valve Set Pressure", value: form.reliefValvePressure, unit: getUnit("pressure", u) },
        { label: "Vapor Pressure", value: form.vaporPressure, unit: getUnit("pressureKpa", u) },
        { label: "Atmospheric Pressure", value: form.atmosphericPressure, unit: getUnit("pressureAbs", u) },
        { label: "Suction Vessel Pressure", value: form.suctionVesselPressure, unit: getUnit("pressure", u) },
      ],
      results: [
        { label: "Differential Pressure", value: convertFromSI("pressure", r.differentialPressure, u), unit: getUnit("pressure", u), highlight: true },
        { label: "Total Dynamic Head", value: convertFromSI("head", r.totalDynamicHead, u), unit: getUnit("head", u) },
        { label: "Static Head", value: convertFromSI("head", r.staticHead, u), unit: getUnit("head", u) },
        { label: "Total Friction Loss", value: convertFromSI("head", r.totalFrictionLoss, u), unit: getUnit("head", u) },
        { label: "Actual Flow (Delivered)", value: convertFromSI("flowLiquid", r.actualFlow, u), unit: getUnit("flowLiquid", u) },
        { label: "Theoretical Flow (Displaced)", value: convertFromSI("flowLiquid", r.theoreticalFlow, u), unit: getUnit("flowLiquid", u) },
        { label: "Slip (Internal Leakage)", value: convertFromSI("flowLiquid", r.slip, u), unit: getUnit("flowLiquid", u) },
        { label: "Hydraulic Power", value: convertFromSI("power", r.hydraulicPower, u), unit: getUnit("power", u) },
        { label: "Shaft Power", value: convertFromSI("power", r.shaftPower, u), unit: getUnit("power", u), highlight: true },
        { label: "Motor Power Required", value: convertFromSI("power", r.motorPower, u), unit: getUnit("power", u), highlight: true },
        { label: "NPSHa (Available)", value: convertFromSI("head", r.npshaAvailable, u), unit: getUnit("head", u), highlight: r.npshaAvailable < 3.0 },
        { label: "NPIPa (Available)", value: r.npipAvailable, unit: "kPa", highlight: r.npipAvailable < 30 },
        { label: "Suction Velocity", value: convertFromSI("velocity", r.suctionVelocity, u), unit: getUnit("velocity", u) },
        { label: "Discharge Velocity", value: convertFromSI("velocity", r.dischargeVelocity, u), unit: getUnit("velocity", u) },
        { label: "Relief Valve Set Pressure", value: r.reliefValvePressure > 0 ? convertFromSI("pressure", r.reliefValvePressure, u) : 0, unit: r.reliefValvePressure > 0 ? getUnit("pressure", u) : "Not set" },
      ],
      methodology: [
        "Darcy-Weisbach equation with Swamee-Jain friction factor approximation",
        "Theoretical flow = Required flow / Volumetric Efficiency",
        "Slip = Theoretical flow - Actual delivered flow",
        "Hydraulic Power = \u0394P * Q (actual flow)",
        "Shaft Power = Hydraulic Power / Mechanical Efficiency",
        "Motor Power = Shaft Power / Motor Efficiency",
        "NPIPa = NPSHa * \u03C1 * g (per API 676 for rotary PD pumps)",
      ],
      assumptions: [
        "Steady-state, incompressible liquid flow",
        "Positive displacement pump (reciprocating, gear, screw, or diaphragm)",
        "Required flow is the actual delivered flow; theoretical flow = required flow / volumetric efficiency",
        "Slip = Theoretical flow \u2212 Actual delivered flow (internal leakage increases with \u0394P)",
        "Shaft power = Hydraulic power / Mechanical efficiency",
        "Motor power = Shaft power / Motor efficiency (user-specified)",
        "Relief valve is mandatory for overpressure protection",
        "Darcy-Weisbach equation for piping friction losses",
        "Atmospheric pressure at sea level unless specified",
      ],
      references: [
        "API 674 \u2014 Positive Displacement Pumps \u2014 Reciprocating",
        "API 676 \u2014 Positive Displacement Pumps \u2014 Rotary",
        "API 675 \u2014 Positive Displacement Pumps \u2014 Controlled Volume (Metering)",
        "Hydraulic Institute Standards (HI 3.1-3.5) \u2014 Rotary Pump Standards",
        "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
        "Karassik et al. \u2014 Pump Handbook, 4th Edition",
      ],
      warnings: r.warnings,
    };
  };

  const activeResult = pumpType === "centrifugal" ? centrifugalResult : pdResult;
  const hasResult = activeResult !== null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">
              Pump Sizing Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              {pumpType === "centrifugal"
                ? "Centrifugal pump head, power & NPSH calculation"
                : "Positive displacement pump pressure, power & flow calculation"}
            </p>
          </div>
        </div>
        <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
      </div>

      <div className="mb-6">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Pump Type</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={pumpType === "centrifugal" ? "default" : "outline"}
                  onClick={() => handlePumpTypeChange("centrifugal")}
                  data-testid="button-type-centrifugal"
                >
                  Centrifugal
                </Button>
                <Button
                  size="sm"
                  variant={pumpType === "positive_displacement" ? "default" : "outline"}
                  onClick={() => handlePumpTypeChange("positive_displacement")}
                  data-testid="button-type-pd"
                >
                  Positive Displacement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Liquid & Operating Conditions</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
                    <FlaskConical className="w-3.5 h-3.5 mr-1" />
                    Test Case
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Liquid Selection</Label>
                  <Select onValueChange={handleLiquidSelect}>
                    <SelectTrigger data-testid="select-liquid">
                      <SelectValue placeholder="Select a liquid..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(COMMON_LIQUIDS).map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Flow Rate ({getUnit("flowLiquid", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.flowRate}
                    onChange={(e) => updateField("flowRate", e.target.value)}
                    placeholder="e.g. 150"
                    data-testid="input-flow-rate"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Density (kg/m³)</Label>
                  <Input
                    type="number"
                    value={form.liquidDensity}
                    onChange={(e) => updateField("liquidDensity", e.target.value)}
                    placeholder="e.g. 998.2"
                    data-testid="input-density"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
                  <Input
                    type="number"
                    value={form.viscosity}
                    onChange={(e) => updateField("viscosity", e.target.value)}
                    placeholder="e.g. 1.0"
                    data-testid="input-viscosity"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Suction Side</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Static Head ({getUnit("head", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.suctionStaticHead}
                    onChange={(e) => updateField("suctionStaticHead", e.target.value)}
                    placeholder="e.g. 3"
                    data-testid="input-suction-head"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Pipe Length ({getUnit("length", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.suctionPipeLength}
                    onChange={(e) => updateField("suctionPipeLength", e.target.value)}
                    placeholder="e.g. 5"
                    data-testid="input-suction-length"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Vessel Gauge Pressure ({getUnit("pressure", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.suctionVesselPressure}
                    onChange={(e) => updateField("suctionVesselPressure", e.target.value)}
                    placeholder="0 for atmospheric"
                    data-testid="input-vessel-pressure"
                  />
                </div>
                <div className="sm:col-span-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Suction Pipe</p>
                  <PipeSizeSelector
                    unitSystem={unitSystem}
                    innerDiameter={form.suctionPipeDiameter}
                    roughness={form.suctionRoughness}
                    onDiameterChange={(v) => updateField("suctionPipeDiameter", v)}
                    onRoughnessChange={(v) => updateField("suctionRoughness", v)}
                    testIdPrefix="suction"
                  />
                </div>
              </div>
              {renderFittingsSection("suction", suctionFittings, form.suctionFittingsK)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">Discharge Side</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Static Head ({getUnit("head", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.dischargeStaticHead}
                    onChange={(e) => updateField("dischargeStaticHead", e.target.value)}
                    placeholder="e.g. 30"
                    data-testid="input-discharge-head"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Pipe Length ({getUnit("length", unitSystem)})
                  </Label>
                  <Input
                    type="number"
                    value={form.dischargePipeLength}
                    onChange={(e) => updateField("dischargePipeLength", e.target.value)}
                    placeholder="e.g. 150"
                    data-testid="input-discharge-length"
                  />
                </div>
                <div className="sm:col-span-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Discharge Pipe</p>
                  <PipeSizeSelector
                    unitSystem={unitSystem}
                    innerDiameter={form.dischargePipeDiameter}
                    roughness={form.dischargeRoughness}
                    onDiameterChange={(v) => updateField("dischargePipeDiameter", v)}
                    onRoughnessChange={(v) => updateField("dischargeRoughness", v)}
                    testIdPrefix="discharge"
                  />
                </div>
              </div>
              {renderFittingsSection("discharge", dischargeFittings, form.dischargeFittingsK)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-sm">
                {pumpType === "centrifugal" ? "Pump & NPSH Parameters" : "PD Pump Parameters"}
              </h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {pumpType === "centrifugal" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Pump Efficiency (%)</Label>
                    <Input
                      type="number"
                      value={form.pumpEfficiency}
                      onChange={(e) => updateField("pumpEfficiency", e.target.value)}
                      placeholder="e.g. 75"
                      data-testid="input-pump-efficiency"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Motor Efficiency (%)</Label>
                    <Input
                      type="number"
                      value={form.motorEfficiency}
                      onChange={(e) => updateField("motorEfficiency", e.target.value)}
                      placeholder="e.g. 95"
                      data-testid="input-motor-efficiency"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Vapor Pressure ({getUnit("pressureKpa", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.vaporPressure}
                      onChange={(e) => updateField("vaporPressure", e.target.value)}
                      placeholder="e.g. 2.338"
                      data-testid="input-vapor-pressure"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Atmospheric Pressure ({getUnit("pressureAbs", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.atmosphericPressure}
                      onChange={(e) => updateField("atmosphericPressure", e.target.value)}
                      placeholder="1.01325"
                      data-testid="input-atm-pressure"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Volumetric Efficiency (%)</Label>
                    <Input
                      type="number"
                      value={form.volumetricEfficiency}
                      onChange={(e) => updateField("volumetricEfficiency", e.target.value)}
                      placeholder="e.g. 90"
                      data-testid="input-vol-efficiency"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Mechanical Efficiency (%)</Label>
                    <Input
                      type="number"
                      value={form.mechanicalEfficiency}
                      onChange={(e) => updateField("mechanicalEfficiency", e.target.value)}
                      placeholder="e.g. 85"
                      data-testid="input-mech-efficiency"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Motor Efficiency (%)</Label>
                    <Input
                      type="number"
                      value={form.motorEfficiency}
                      onChange={(e) => updateField("motorEfficiency", e.target.value)}
                      placeholder="e.g. 95"
                      data-testid="input-motor-efficiency-pd"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Differential Pressure ({getUnit("pressure", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.dischargePressure}
                      onChange={(e) => updateField("dischargePressure", e.target.value)}
                      placeholder="e.g. 10"
                      data-testid="input-discharge-pressure"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Relief Valve Set Pressure ({getUnit("pressure", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.reliefValvePressure}
                      onChange={(e) => updateField("reliefValvePressure", e.target.value)}
                      placeholder="e.g. 15"
                      data-testid="input-relief-pressure"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Vapor Pressure ({getUnit("pressureKpa", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.vaporPressure}
                      onChange={(e) => updateField("vaporPressure", e.target.value)}
                      placeholder="e.g. 20"
                      data-testid="input-vapor-pressure"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Atmospheric Pressure ({getUnit("pressureAbs", unitSystem)})
                    </Label>
                    <Input
                      type="number"
                      value={form.atmosphericPressure}
                      onChange={(e) => updateField("atmosphericPressure", e.target.value)}
                      placeholder="1.01325"
                      data-testid="input-atm-pressure"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                  {error}
                </div>
              )}

              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                Calculate Pump Requirements
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {hasResult && (
            <>
              <WarningPanel warnings={activeResult!.warnings} />

              {pumpType === "centrifugal" && centrifugalResult && (
                <>
                  <ResultsPanel
                    title="Head & Losses"
                    results={[
                      {
                        label: "Total Dynamic Head (TDH)",
                        value: convertFromSI("head", centrifugalResult.totalDynamicHead, unitSystem),
                        unit: getUnit("head", unitSystem),
                        highlight: true,
                      },
                      {
                        label: "Static Head",
                        value: convertFromSI("head", centrifugalResult.staticHead, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                      {
                        label: "Suction Friction Loss",
                        value: convertFromSI("head", centrifugalResult.suctionFrictionLoss, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                      {
                        label: "Discharge Friction Loss",
                        value: convertFromSI("head", centrifugalResult.dischargeFrictionLoss, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                      {
                        label: "Total Friction Loss",
                        value: convertFromSI("head", centrifugalResult.totalFrictionLoss, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                      {
                        label: "Suction Velocity Head",
                        value: convertFromSI("head", centrifugalResult.suctionVelocityHead, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                      {
                        label: "Discharge Velocity Head",
                        value: convertFromSI("head", centrifugalResult.dischargeVelocityHead, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                    ]}
                    rawData={centrifugalResult}
                    exportData={buildCentrifugalExportData()}
                  />
                  <ResultsPanel
                    title="Power Requirements"
                    results={[
                      {
                        label: "Hydraulic Power",
                        value: convertFromSI("power", centrifugalResult.hydraulicPower, unitSystem),
                        unit: getUnit("power", unitSystem),
                      },
                      {
                        label: "Brake Power (BHP)",
                        value: convertFromSI("power", centrifugalResult.brakePower, unitSystem),
                        unit: getUnit("power", unitSystem),
                        highlight: true,
                      },
                      {
                        label: "Motor Power Required",
                        value: convertFromSI("power", centrifugalResult.motorPower, unitSystem),
                        unit: getUnit("power", unitSystem),
                        highlight: true,
                      },
                    ]}
                    rawData={centrifugalResult}
                  />
                  <ResultsPanel
                    title="Velocities & NPSH"
                    results={[
                      {
                        label: "Suction Velocity",
                        value: convertFromSI("velocity", centrifugalResult.suctionVelocity, unitSystem),
                        unit: getUnit("velocity", unitSystem),
                      },
                      {
                        label: "Discharge Velocity",
                        value: convertFromSI("velocity", centrifugalResult.dischargeVelocity, unitSystem),
                        unit: getUnit("velocity", unitSystem),
                      },
                      {
                        label: "Suction Reynolds",
                        value: centrifugalResult.suctionReynolds,
                        unit: "\u2014",
                      },
                      {
                        label: "Discharge Reynolds",
                        value: centrifugalResult.dischargeReynolds,
                        unit: "\u2014",
                      },
                      {
                        label: "NPSHa (Available)",
                        value: convertFromSI("head", centrifugalResult.npshaAvailable, unitSystem),
                        unit: getUnit("head", unitSystem),
                        highlight: centrifugalResult.npshaAvailable < 3.0,
                      },
                      {
                        label: "Suction f (Darcy)",
                        value: centrifugalResult.suctionFrictionFactor,
                        unit: "\u2014",
                      },
                      {
                        label: "Discharge f (Darcy)",
                        value: centrifugalResult.dischargeFrictionFactor,
                        unit: "\u2014",
                      },
                    ]}
                    rawData={centrifugalResult}
                  />
                  <PumpCurveChart
                    designFlowSI={convertToSI("flowLiquid", parseFloat(form.flowRate) || 0, unitSystem)}
                    tdhSI={centrifugalResult.totalDynamicHead}
                    staticHeadSI={centrifugalResult.staticHead}
                    brakePowerSI={centrifugalResult.brakePower}
                    pumpEfficiency={parseFloat(form.pumpEfficiency) || 75}
                    liquidDensity={parseFloat(form.liquidDensity) || 998}
                    flowUnit={getUnit("flowLiquid", unitSystem)}
                    headUnit={getUnit("head", unitSystem)}
                    powerUnit={getUnit("power", unitSystem)}
                    convertFlow={(si) => convertFromSI("flowLiquid", si, unitSystem)}
                    convertHead={(si) => convertFromSI("head", si, unitSystem)}
                    convertPower={(si) => convertFromSI("power", si, unitSystem)}
                  />
                </>
              )}

              {pumpType === "positive_displacement" && pdResult && (
                <>
                  <ResultsPanel
                    title="Pressure & Flow"
                    results={[
                      {
                        label: "Differential Pressure",
                        value: convertFromSI("pressure", pdResult.differentialPressure, unitSystem),
                        unit: getUnit("pressure", unitSystem),
                        highlight: true,
                      },
                      {
                        label: "Total Dynamic Head",
                        value: convertFromSI("head", pdResult.totalDynamicHead, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                      {
                        label: "Static Head",
                        value: convertFromSI("head", pdResult.staticHead, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                      {
                        label: "Total Friction Loss",
                        value: convertFromSI("head", pdResult.totalFrictionLoss, unitSystem),
                        unit: getUnit("head", unitSystem),
                      },
                      {
                        label: "Actual Flow (Delivered)",
                        value: convertFromSI("flowLiquid", pdResult.actualFlow, unitSystem),
                        unit: getUnit("flowLiquid", unitSystem),
                      },
                      {
                        label: "Theoretical Flow (Displaced)",
                        value: convertFromSI("flowLiquid", pdResult.theoreticalFlow, unitSystem),
                        unit: getUnit("flowLiquid", unitSystem),
                      },
                      {
                        label: "Slip (Internal Leakage)",
                        value: convertFromSI("flowLiquid", pdResult.slip, unitSystem),
                        unit: getUnit("flowLiquid", unitSystem),
                      },
                    ]}
                    rawData={pdResult}
                    exportData={buildPDExportData()}
                  />
                  <ResultsPanel
                    title="Power Requirements"
                    results={[
                      {
                        label: "Hydraulic Power",
                        value: convertFromSI("power", pdResult.hydraulicPower, unitSystem),
                        unit: getUnit("power", unitSystem),
                      },
                      {
                        label: "Shaft Power",
                        value: convertFromSI("power", pdResult.shaftPower, unitSystem),
                        unit: getUnit("power", unitSystem),
                        highlight: true,
                      },
                      {
                        label: "Motor Power Required",
                        value: convertFromSI("power", pdResult.motorPower, unitSystem),
                        unit: getUnit("power", unitSystem),
                        highlight: true,
                      },
                    ]}
                    rawData={pdResult}
                  />
                  <ResultsPanel
                    title="NPSH / NPIP & Velocities"
                    results={[
                      {
                        label: "NPSHa (Available)",
                        value: convertFromSI("head", pdResult.npshaAvailable, unitSystem),
                        unit: getUnit("head", unitSystem),
                        highlight: pdResult.npshaAvailable < 3.0,
                      },
                      {
                        label: "NPIPa (Available)",
                        value: pdResult.npipAvailable,
                        unit: "kPa",
                        highlight: pdResult.npipAvailable < 30,
                      },
                      {
                        label: "Suction Velocity",
                        value: convertFromSI("velocity", pdResult.suctionVelocity, unitSystem),
                        unit: getUnit("velocity", unitSystem),
                      },
                      {
                        label: "Discharge Velocity",
                        value: convertFromSI("velocity", pdResult.dischargeVelocity, unitSystem),
                        unit: getUnit("velocity", unitSystem),
                      },
                      {
                        label: "Suction Reynolds",
                        value: pdResult.suctionReynolds,
                        unit: "\u2014",
                      },
                      {
                        label: "Discharge Reynolds",
                        value: pdResult.dischargeReynolds,
                        unit: "\u2014",
                      },
                    ]}
                    rawData={pdResult}
                  />
                  <ResultsPanel
                    title="Safety & Protection"
                    results={[
                      {
                        label: "Relief Valve Set Pressure",
                        value: pdResult.reliefValvePressure > 0
                          ? convertFromSI("pressure", pdResult.reliefValvePressure, unitSystem)
                          : 0,
                        unit: pdResult.reliefValvePressure > 0 ? getUnit("pressure", unitSystem) : "Not set",
                        highlight: pdResult.reliefValvePressure <= 0,
                      },
                      {
                        label: "Required Discharge Pressure",
                        value: pdResult.dischargePressure > 0
                          ? convertFromSI("pressure", pdResult.dischargePressure, unitSystem)
                          : 0,
                        unit: pdResult.dischargePressure > 0 ? getUnit("pressure", unitSystem) : "From TDH",
                      },
                    ]}
                    rawData={pdResult}
                  />
                  <PDCurveChart
                    designFlowSI={pdResult.actualFlow}
                    differentialPressureBar={pdResult.differentialPressure}
                    shaftPowerSI={pdResult.shaftPower}
                    volumetricEfficiency={pdResult.volumetricEfficiency}
                    mechanicalEfficiency={pdResult.mechanicalEfficiency}
                    liquidDensity={pdResult.liquidDensity}
                    flowUnit={getUnit("flowLiquid", unitSystem)}
                    pressureUnit={getUnit("pressure", unitSystem)}
                    powerUnit={getUnit("power", unitSystem)}
                    convertFlow={(si) => convertFromSI("flowLiquid", si, unitSystem)}
                    convertPressure={(si) => convertFromSI("pressure", si, unitSystem)}
                    convertPower={(si) => convertFromSI("power", si, unitSystem)}
                  />
                </>
              )}
            </>
          )}
          {!hasResult && (
            <Card>
              <CardContent className="py-12 text-center">
                <Droplets className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Enter parameters and click Calculate to see results
                </p>
              </CardContent>
            </Card>
          )}
          <div className="mt-4">
            {pumpType === "centrifugal" ? (
              <AssumptionsPanel
              assumptions={[
              "Steady-state, incompressible liquid flow",
              "Centrifugal pump application",
              "Darcy-Weisbach equation with Swamee-Jain friction factor",
              "Minor losses calculated using resistance coefficient (K) method",
              "NPSHa calculated per HI/API standards",
              "Atmospheric pressure at sea level unless specified",
              "Suction vessel pressure is gauge pressure (0 = atmospheric)",
              ]}
              references={[
              "Hydraulic Institute Standards (HI 1.3) \u2014 Centrifugal Pump Design",
              "API 610 \u2014 Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries",
              "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
              "Cameron Hydraulic Data, 20th Edition",
              "Perry's Chemical Engineers' Handbook, 9th Edition",
              ]}
              />
            ) : (
              <AssumptionsPanel
              assumptions={[
              "Steady-state, incompressible liquid flow",
              "Positive displacement pump (reciprocating, gear, screw, or diaphragm)",
              "Required flow is the actual delivered flow; theoretical flow = required flow / volumetric efficiency",
              "Slip = Theoretical flow \u2212 Actual delivered flow (internal leakage increases with \u0394P)",
              "Shaft power = Hydraulic power / Mechanical efficiency",
              "Motor power = Shaft power / Motor efficiency (user-specified)",
              "Discharge pressure input is the total differential pressure across the pump",
              "NPSHa calculated per HI/API standards; NPIPa = NPSHa \u00d7 \u03c1 \u00d7 g (per API 676 for rotary PD pumps)",
              "Relief valve is mandatory for overpressure protection",
              "Performance curves show flow/slip/power variation with differential pressure per API 674/676",
              "Darcy-Weisbach equation for piping friction losses",
              "Atmospheric pressure at sea level unless specified",
              ]}
              references={[
              "API 674 \u2014 Positive Displacement Pumps \u2014 Reciprocating",
              "API 676 \u2014 Positive Displacement Pumps \u2014 Rotary",
              "API 675 \u2014 Positive Displacement Pumps \u2014 Controlled Volume (Metering)",
              "Hydraulic Institute Standards (HI 3.1-3.5) \u2014 Rotary Pump Standards",
              "Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe",
              "Karassik et al. \u2014 Pump Handbook, 4th Edition",
              ]}
              />
            )}
          </div>

          <FeedbackSection calculatorName="Pump Sizing" />
        </div>
      </div>
    </div>
  );
}
