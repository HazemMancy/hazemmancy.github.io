import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitSelector } from "@/components/engineering/unit-selector";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import type { UnitSystem } from "@/lib/engineering/unitConversion";
import { getUnit, convertToSI, convertFromSI } from "@/lib/engineering/unitConversion";
import {
  type Api2000Input, type Api2000Result, type TankType, type ProductCategory, type InsulationType,
  calculateApi2000, API_2000_TEST_CASE, PRODUCT_LABELS, INSULATION_LABELS,
} from "@/lib/engineering/api2000";
import type { ExportDatasheet } from "@/lib/engineering/exportUtils";
import { exportToExcel, exportToCalcNote, exportToJSON } from "@/lib/engineering/exportUtils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Container, FlaskConical, RotateCcw, ChevronLeft, ChevronRight,
  Flame, Droplets, Calculator, CheckCircle2, BarChart3,
  Download, FileSpreadsheet, FileText, AlertTriangle, Info, XCircle,
  ChevronDown, ChevronUp, Wind, Layers,
} from "lucide-react";

const TABS = [
  { id: "tank", label: "Tank", icon: Container, step: 1 },
  { id: "product", label: "Product", icon: Droplets, step: 2 },
  { id: "normal", label: "Normal", icon: Wind, step: 3 },
  { id: "emergency", label: "Emergency", icon: Flame, step: 4 },
  { id: "scenarios", label: "Scenarios", icon: BarChart3, step: 5 },
  { id: "results", label: "Results", icon: CheckCircle2, step: 6 },
];

interface FormState {
  tankDiameter: number;
  tankHeight: number;
  tankType: TankType;
  liquidLevel: number;
  productCategory: ProductCategory;
  flashFactor: number;
  vaporMW: number;
  relievingTemp: number;
  latentHeat: number;
  vaporDensity: number;
  maxFillRate: number;
  maxEmptyRate: number;
  designPressure: number;
  designVacuum: number;
  insulationType: InsulationType;
  hasDrainage: boolean;
  drainageFactor: number;
  rimSealHeight: number;
}

const defaultForm: FormState = {
  tankDiameter: 0,
  tankHeight: 0,
  tankType: "cone_roof",
  liquidLevel: 75,
  productCategory: "hexane_and_below",
  flashFactor: 1.0,
  vaporMW: 86.18,
  relievingTemp: 35,
  latentHeat: 365,
  vaporDensity: 3.5,
  maxFillRate: 0,
  maxEmptyRate: 0,
  designPressure: 20,
  designVacuum: 6,
  insulationType: "bare",
  hasDrainage: false,
  drainageFactor: 1.0,
  rimSealHeight: 0,
};

function fmtResult(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) >= 1e6) return n.toExponential(3);
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toPrecision(4);
}

export default function TankVentingPage() {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("SI");
  const [activeTab, setActiveTab] = useState("tank");
  const [form, setForm] = useState<FormState>({ ...defaultForm });
  const [result, setResult] = useState<Api2000Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const lenU = getUnit("length", unitSystem);
  const tU = getUnit("temperature", unitSystem);
  const densU = getUnit("density", unitSystem);
  const flowU = getUnit("flowVolume", unitSystem);

  const handleUnitToggle = useCallback((newSystem: UnitSystem) => {
    setForm(prev => ({
      ...prev,
      tankDiameter: Number(convertFromSI("length", convertToSI("length", prev.tankDiameter, unitSystem), newSystem).toFixed(3)),
      tankHeight: Number(convertFromSI("length", convertToSI("length", prev.tankHeight, unitSystem), newSystem).toFixed(3)),
      relievingTemp: Number(convertFromSI("temperature", convertToSI("temperature", prev.relievingTemp, unitSystem), newSystem).toFixed(2)),
      vaporDensity: Number(convertFromSI("density", convertToSI("density", prev.vaporDensity, unitSystem), newSystem).toFixed(4)),
      maxFillRate: Number(convertFromSI("flowVolume", convertToSI("flowVolume", prev.maxFillRate, unitSystem), newSystem).toFixed(2)),
      maxEmptyRate: Number(convertFromSI("flowVolume", convertToSI("flowVolume", prev.maxEmptyRate, unitSystem), newSystem).toFixed(2)),
      rimSealHeight: Number(convertFromSI("length", convertToSI("length", prev.rimSealHeight, unitSystem), newSystem).toFixed(3)),
    }));
    setUnitSystem(newSystem);
  }, [unitSystem]);

  const updateField = (field: keyof FormState, value: number | string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const loadTestCase = () => {
    const tc = API_2000_TEST_CASE;
    setUnitSystem("SI");
    setForm({
      tankDiameter: tc.tankDiameter_m,
      tankHeight: tc.tankHeight_m,
      tankType: tc.tankType,
      liquidLevel: tc.liquidLevel_percent,
      productCategory: tc.productCategory,
      flashFactor: tc.flashFactor,
      vaporMW: tc.vaporMW,
      relievingTemp: tc.relievingTemp_C,
      latentHeat: tc.latentHeat_kJ_kg,
      vaporDensity: tc.vaporDensity_kg_m3,
      maxFillRate: tc.maxFillRate_m3_h,
      maxEmptyRate: tc.maxEmptyRate_m3_h,
      designPressure: tc.designPressure_mbar,
      designVacuum: tc.designVacuum_mbar,
      insulationType: tc.insulationType,
      hasDrainage: tc.hasDrainage,
      drainageFactor: tc.drainageFactor,
      rimSealHeight: tc.rimSealHeight_m,
    });
    setResult(null);
    setError(null);
    setActiveTab("tank");
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const input: Api2000Input = {
        tankDiameter_m: convertToSI("length", form.tankDiameter, unitSystem),
        tankHeight_m: convertToSI("length", form.tankHeight, unitSystem),
        tankType: form.tankType,
        liquidLevel_percent: form.liquidLevel,
        maxFillRate_m3_h: convertToSI("flowVolume", form.maxFillRate, unitSystem),
        maxEmptyRate_m3_h: convertToSI("flowVolume", form.maxEmptyRate, unitSystem),
        productCategory: form.productCategory,
        flashFactor: form.flashFactor,
        vaporMW: form.vaporMW,
        relievingTemp_C: convertToSI("temperature", form.relievingTemp, unitSystem),
        latentHeat_kJ_kg: form.latentHeat,
        vaporDensity_kg_m3: convertToSI("density", form.vaporDensity, unitSystem),
        designPressure_mbar: form.designPressure,
        designVacuum_mbar: form.designVacuum,
        insulationType: form.insulationType,
        hasDrainage: form.hasDrainage,
        drainageFactor: form.drainageFactor,
        rimSealHeight_m: convertToSI("length", form.rimSealHeight, unitSystem),
      };
      const res = calculateApi2000(input);
      setResult(res);
      setActiveTab("results");
    } catch (e: any) {
      setError(e.message || "Calculation error");
    }
  };

  const handleReset = () => {
    setForm({ ...defaultForm });
    setResult(null);
    setError(null);
    setActiveTab("tank");
  };

  const buildExportData = (): ExportDatasheet | null => {
    if (!result) return null;
    return {
      calculatorName: "API 2000 Tank Venting Calculator",
      inputs: [
        { label: "Tank Diameter", value: fmtResult(form.tankDiameter), unit: lenU },
        { label: "Tank Height", value: fmtResult(form.tankHeight), unit: lenU },
        { label: "Tank Type", value: form.tankType },
        { label: "Liquid Level", value: `${form.liquidLevel}%` },
        { label: "Product Category", value: PRODUCT_LABELS[form.productCategory] },
        { label: "Flash Factor", value: fmtResult(form.flashFactor) },
        { label: "Vapor MW", value: fmtResult(form.vaporMW) },
        { label: "Relieving Temp", value: fmtResult(form.relievingTemp), unit: tU },
        { label: "Latent Heat", value: fmtResult(form.latentHeat), unit: "kJ/kg" },
        { label: "Design Pressure", value: fmtResult(form.designPressure), unit: "mbar" },
        { label: "Design Vacuum", value: fmtResult(form.designVacuum), unit: "mbar" },
        { label: "Insulation", value: INSULATION_LABELS[form.insulationType] },
        { label: "Max Fill Rate", value: fmtResult(form.maxFillRate), unit: flowU },
        { label: "Max Empty Rate", value: fmtResult(form.maxEmptyRate), unit: flowU },
        { label: "Drainage Provisions", value: form.hasDrainage ? `Yes (factor: ${form.drainageFactor})` : "No" },
      ],
      results: [
        { label: "Tank Volume", value: fmtResult(result.geometry.volume_m3), unit: "m\u00B3" },
        { label: "Wetted Area", value: fmtResult(result.geometry.wettedArea_m2), unit: "m\u00B2" },
        ...(result.scenarios || []).filter(s => s.isApplicable).map(s => ({
          label: `${s.id}: ${s.name}`, value: fmtResult(s.flow_Nm3h), unit: "Nm\u00B3/h",
          highlight: s.id === "E1" || s.id === "E2" || s.id === "E3",
        })),
        { label: "Total Normal Outbreathing", value: fmtResult(result.normalVenting.totalOutbreathing_Nm3h), unit: "Nm\u00B3/h" },
        { label: "Total Normal Inbreathing", value: fmtResult(result.normalVenting.totalInbreathing_Nm3h), unit: "Nm\u00B3/h" },
        { label: "Emergency Venting", value: fmtResult(result.emergencyVenting.emergencyVenting_Nm3h), unit: "Nm\u00B3/h", highlight: true },
        { label: "Normal Credit", value: `-${fmtResult(result.emergencyVenting.normalCredit_Nm3h)}`, unit: "Nm\u00B3/h" },
        { label: "Net Emergency", value: fmtResult(result.emergencyVenting.netEmergency_Nm3h), unit: "Nm\u00B3/h", highlight: true },
        { label: "Pressure Vent NPS", value: result.ventSizing.pressureNPS, unit: "", highlight: true },
        { label: "Vacuum Vent NPS", value: result.ventSizing.vacuumNPS, unit: "", highlight: true },
        { label: "Emergency Vent NPS", value: result.ventSizing.emergencyNPS, unit: "", highlight: true },
      ],
      assumptions: result.assumptions,
      warnings: result.warnings,
      references: [
        "API Std 2000, 7th Edition (2014)",
        "NFPA 30: Flammable and Combustible Liquids Code",
      ],
      calcSteps: result.trace.map(t => ({ label: t.step, value: t.value })),
    };
  };

  const goTab = (dir: number) => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    const next = idx + dir;
    if (next >= 0 && next < TABS.length) setActiveTab(TABS[next].id);
  };

  return (
    <div className="min-h-screen">
      <section className="py-6 md:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-primary/10">
                <Container className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold" data-testid="text-calc-title">
                  API 2000 Tank Venting
                </h1>
                <p className="text-xs text-muted-foreground">
                  All scenarios: Normal (thermal + liquid) &amp; Emergency (fire) per API Std 2000, 7th Ed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <UnitSelector value={unitSystem} onChange={handleUnitToggle} />
              <Button variant="outline" size="sm" onClick={loadTestCase} data-testid="button-load-test">
                <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Test Case
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
              </Button>
            </div>
          </div>

          {error && (
            <Card className="mb-4 border-destructive/50">
              <CardContent className="py-3 px-4">
                <p className="text-sm text-destructive flex items-center gap-2" data-testid="text-error">
                  <XCircle className="w-4 h-4" /> {error}
                </p>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full flex flex-wrap h-auto gap-1 mb-4 bg-muted/50 p-1">
              {TABS.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 h-4">{tab.step}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* TAB 1: TANK GEOMETRY */}
            <TabsContent value="tank">
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Container className="w-4 h-4 text-primary" /> Tank Geometry &amp; Design
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Tank Diameter ({lenU})</Label>
                      <NumericInput
                        value={form.tankDiameter}
                        onValueChange={v => updateField("tankDiameter", v)}
                        data-testid="input-tank-diameter"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tank Height ({lenU})</Label>
                      <NumericInput
                        value={form.tankHeight}
                        onValueChange={v => updateField("tankHeight", v)}
                        data-testid="input-tank-height"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tank Type</Label>
                      <Select value={form.tankType} onValueChange={v => updateField("tankType", v)}>
                        <SelectTrigger data-testid="select-tank-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cone_roof">Cone Roof</SelectItem>
                          <SelectItem value="dome_roof">Dome Roof</SelectItem>
                          <SelectItem value="flat_roof">Flat Roof</SelectItem>
                          <SelectItem value="floating_roof">Floating Roof</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Liquid Level (%)</Label>
                      <NumericInput
                        value={form.liquidLevel}
                        onValueChange={v => updateField("liquidLevel", v)}
                        min={0} max={100}
                        data-testid="input-liquid-level"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Design Pressure (mbar g)</Label>
                      <NumericInput
                        value={form.designPressure}
                        onValueChange={v => updateField("designPressure", v)}
                        data-testid="input-design-pressure"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Design Vacuum (mbar)</Label>
                      <NumericInput
                        value={form.designVacuum}
                        onValueChange={v => updateField("designVacuum", v)}
                        data-testid="input-design-vacuum"
                      />
                    </div>
                  </div>
                  {form.tankType === "floating_roof" && (
                    <div>
                      <Label className="text-xs">Rim Seal Height ({lenU}) — for floating roof fire scenario (E4)</Label>
                      <NumericInput
                        value={form.rimSealHeight}
                        onValueChange={v => updateField("rimSealHeight", v)}
                        data-testid="input-rim-seal-height"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: PRODUCT PROPERTIES */}
            <TabsContent value="product">
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-primary" /> Product Properties
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Product Category (API 2000 Table 2/3)</Label>
                    <Select value={form.productCategory} onValueChange={v => updateField("productCategory", v)}>
                      <SelectTrigger data-testid="select-product-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PRODUCT_LABELS) as ProductCategory[]).map(k => (
                          <SelectItem key={k} value={k}>{PRODUCT_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Vapor Molecular Weight</Label>
                      <NumericInput
                        value={form.vaporMW}
                        onValueChange={v => updateField("vaporMW", v)}
                        data-testid="input-vapor-mw"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Flash Factor</Label>
                      <NumericInput
                        value={form.flashFactor}
                        onValueChange={v => updateField("flashFactor", v)}
                        data-testid="input-flash-factor"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Ratio of vapor generated to liquid pumped in ({"\u2265"} 1.0). 1.0 for non-volatile, {">"}1 for volatile stocks with flash vaporization.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Relieving Temperature ({tU})</Label>
                      <NumericInput
                        value={form.relievingTemp}
                        onValueChange={v => updateField("relievingTemp", v)}
                        data-testid="input-relieving-temp"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Latent Heat of Vaporization (kJ/kg)</Label>
                      <NumericInput
                        value={form.latentHeat}
                        onValueChange={v => updateField("latentHeat", v)}
                        data-testid="input-latent-heat"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Vapor Density at Relieving Conditions ({densU})</Label>
                    <NumericInput
                      value={form.vaporDensity}
                      onValueChange={v => updateField("vaporDensity", v)}
                      data-testid="input-vapor-density"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: NORMAL VENTING */}
            <TabsContent value="normal">
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Wind className="w-4 h-4 text-primary" /> Normal Venting — Section 4
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300 space-y-1.5">
                    <p className="font-medium flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> API 2000 Normal Venting Scenarios</p>
                    <p><strong>N1</strong> — Thermal Outbreathing (Section 4.3.2): Tank heats up, vapor expelled. q = C_out {"\u00D7"} V^0.7</p>
                    <p><strong>N2</strong> — Thermal Inbreathing (Section 4.3.3): Tank cools down, air drawn in. q = C_in {"\u00D7"} V^0.7</p>
                    <p><strong>N3</strong> — Liquid Pump-In (Section 4.4.1): Liquid fill displaces vapor. q = fill_rate {"\u00D7"} flash_factor</p>
                    <p><strong>N4</strong> — Liquid Pump-Out (Section 4.4.2): Liquid withdrawal draws air in. q = empty_rate</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Max Liquid Fill Rate ({flowU}) — Scenario N3</Label>
                      <NumericInput
                        value={form.maxFillRate}
                        onValueChange={v => updateField("maxFillRate", v)}
                        data-testid="input-fill-rate"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Contributes to outbreathing (N3)</p>
                    </div>
                    <div>
                      <Label className="text-xs">Max Liquid Empty Rate ({flowU}) — Scenario N4</Label>
                      <NumericInput
                        value={form.maxEmptyRate}
                        onValueChange={v => updateField("maxEmptyRate", v)}
                        data-testid="input-empty-rate"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Contributes to inbreathing (N4)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: EMERGENCY VENTING */}
            <TabsContent value="emergency">
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Flame className="w-4 h-4 text-primary" /> Emergency Venting — Section 5
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300 space-y-1.5">
                    <p className="font-medium flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> API 2000 Emergency Scenarios</p>
                    <p><strong>E1</strong> — External Fire, Bare Tank (Section 5.2): Q = 43,200 {"\u00D7"} F {"\u00D7"} A_w^0.82</p>
                    <p><strong>E2</strong> — External Fire with Insulation Credit (Section 5.2.3): Reduced F factor</p>
                    <p><strong>E3</strong> — External Fire with Drainage (Section 5.2.2): Drainage reduces fire exposure</p>
                    <p><strong>E4</strong> — Floating Roof Rim Seal Fire (Section 5.4): Only rim area exposed</p>
                    <p className="border-t border-red-500/20 pt-1.5 mt-1.5"><strong>Section 5.3</strong> — Normal venting capacity credited against emergency requirement</p>
                  </div>

                  <div>
                    <Label className="text-xs">Insulation / Environmental Factor</Label>
                    <Select value={form.insulationType} onValueChange={v => updateField("insulationType", v)}>
                      <SelectTrigger data-testid="select-insulation"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(INSULATION_LABELS) as InsulationType[]).map(k => (
                          <SelectItem key={k} value={k}>{INSULATION_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.hasDrainage}
                      onChange={e => updateField("hasDrainage", e.target.checked)}
                      className="w-4 h-4 rounded"
                      data-testid="checkbox-drainage"
                    />
                    <div>
                      <Label className="text-xs">Drainage Provisions (Section 5.2.2)</Label>
                      <p className="text-[10px] text-muted-foreground">Prompt drainage of flammable liquid away from tank base</p>
                    </div>
                  </div>

                  {form.hasDrainage && (
                    <div className="pl-7">
                      <Label className="text-xs">Drainage Credit Factor (0 to 1.0)</Label>
                      <NumericInput
                        value={form.drainageFactor}
                        onValueChange={v => updateField("drainageFactor", v)}
                        min={0} max={1} step={0.1}
                        data-testid="input-drainage-factor"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">1.0 = no credit, 0.5 = 50% reduction in fire heat input</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: SCENARIO MATRIX */}
            <TabsContent value="scenarios">
              {result && result.scenarios ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <h2 className="text-sm font-semibold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" /> API 2000 Scenario Matrix
                      </h2>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" data-testid="table-scenarios">
                          <thead>
                            <tr className="border-b border-muted/30">
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">ID</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Scenario</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Section</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Direction</th>
                              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Flow (Nm{"\u00B3"}/h)</th>
                              <th className="text-center py-2 px-2 font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(result.scenarios || []).map(s => (
                              <tr
                                key={s.id}
                                className={`border-b border-muted/10 ${!s.isApplicable ? "opacity-40" : ""} ${
                                  s.id.startsWith("E") ? "bg-red-500/5" : "bg-blue-500/5"
                                }`}
                                data-testid={`row-scenario-${s.id}`}
                              >
                                <td className="py-2 px-2 font-mono font-medium">{s.id}</td>
                                <td className="py-2 px-2">
                                  <div>{s.name}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5 max-w-xs">{s.description}</div>
                                </td>
                                <td className="py-2 px-2 text-muted-foreground">{s.section}</td>
                                <td className="py-2 px-2">
                                  <Badge variant="outline" className={`text-[9px] ${
                                    s.direction === "outbreathing" ? "text-amber-400 border-amber-500/30" :
                                    s.direction === "inbreathing" ? "text-blue-400 border-blue-500/30" :
                                    "text-red-400 border-red-500/30"
                                  }`}>
                                    {s.direction}
                                  </Badge>
                                </td>
                                <td className="py-2 px-2 text-right font-mono">
                                  {s.isApplicable ? fmtResult(s.flow_Nm3h) : "\u2014"}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {s.isApplicable ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 inline" />
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">{s.notApplicableReason}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-blue-500/20">
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold flex items-center gap-1.5">
                          <Wind className="w-3.5 h-3.5 text-blue-400" /> Normal Venting Summary
                        </h3>
                      </CardHeader>
                      <CardContent className="space-y-1.5">
                        <ResultRow label="N1: Thermal outbreathing" value={fmtResult(result.normalVenting.thermalOutbreathing_Nm3h)} unit="Nm\u00B3/h" />
                        <ResultRow label="N3: Liquid movement out" value={fmtResult(result.normalVenting.liquidMovementOut_Nm3h)} unit="Nm\u00B3/h" />
                        <div className="border-t pt-1.5">
                          <ResultRow label="Total Outbreathing" value={fmtResult(result.normalVenting.totalOutbreathing_Nm3h)} unit="Nm\u00B3/h" highlight />
                        </div>
                        <div className="border-t pt-1.5">
                          <ResultRow label="N2: Thermal inbreathing" value={fmtResult(result.normalVenting.thermalInbreathing_Nm3h)} unit="Nm\u00B3/h" />
                          <ResultRow label="N4: Liquid movement in" value={fmtResult(result.normalVenting.liquidMovementIn_Nm3h)} unit="Nm\u00B3/h" />
                        </div>
                        <div className="border-t pt-1.5">
                          <ResultRow label="Total Inbreathing" value={fmtResult(result.normalVenting.totalInbreathing_Nm3h)} unit="Nm\u00B3/h" highlight />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-500/20">
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-red-400" /> Emergency Venting Summary
                        </h3>
                      </CardHeader>
                      <CardContent className="space-y-1.5">
                        <ResultRow label="Effective wetted area" value={fmtResult(result.emergencyVenting.effectiveWettedArea_m2)} unit="m\u00B2" />
                        <ResultRow label="Environmental factor F" value={String(result.emergencyVenting.envFactor)} unit="" />
                        {result.emergencyVenting.drainageFactor < 1 && (
                          <ResultRow label="Drainage factor" value={String(result.emergencyVenting.drainageFactor)} unit="" />
                        )}
                        <ResultRow label="Fire heat input" value={fmtResult(result.emergencyVenting.heatInput_kW)} unit="kW" />
                        <ResultRow label="Vaporization rate" value={fmtResult(result.emergencyVenting.vaporizationRate_kg_h)} unit="kg/h" />
                        <div className="border-t pt-1.5">
                          <ResultRow label="Gross emergency venting" value={fmtResult(result.emergencyVenting.emergencyVenting_Nm3h)} unit="Nm\u00B3/h" highlight />
                          <ResultRow label="Normal credit (Sec. 5.3)" value={`\u2212${fmtResult(result.emergencyVenting.normalCredit_Nm3h)}`} unit="Nm\u00B3/h" />
                          <ResultRow label="Net emergency requirement" value={fmtResult(result.emergencyVenting.netEmergency_Nm3h)} unit="Nm\u00B3/h" highlight />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <h3 className="text-xs font-semibold flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" /> Governing Cases
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3 space-y-1.5">
                          <p className="text-[10px] text-amber-400 font-medium">PRESSURE SIDE (Outbreathing)</p>
                          <p className="text-sm font-mono font-medium text-primary" data-testid="text-governing-pressure">
                            {fmtResult(result.scenarioSummary.governingPressure_Nm3h)} Nm{"\u00B3"}/h
                          </p>
                          <p className="text-[10px] text-muted-foreground">{result.scenarioSummary.governingPressureScenario}</p>
                        </div>
                        <div className="rounded-md bg-blue-500/5 border border-blue-500/20 p-3 space-y-1.5">
                          <p className="text-[10px] text-blue-400 font-medium">VACUUM SIDE (Inbreathing)</p>
                          <p className="text-sm font-mono font-medium text-primary" data-testid="text-governing-vacuum">
                            {fmtResult(result.scenarioSummary.governingVacuum_Nm3h)} Nm{"\u00B3"}/h
                          </p>
                          <p className="text-[10px] text-muted-foreground">{result.scenarioSummary.governingVacuumScenario}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground" data-testid="text-no-scenarios">
                      Complete input tabs and click Calculate to generate scenario matrix
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 6: RESULTS & SIZING */}
            <TabsContent value="results">
              {result && result.scenarioSummary ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" /> Vent Sizing Results
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-export">
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem data-testid="button-export-excel" onClick={() => { const d = buildExportData(); if (d) exportToExcel(d); }}>
                          <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid="button-export-calc-note" onClick={() => { const d = buildExportData(); if (d) exportToCalcNote(d); }}>
                          <FileText className="w-3.5 h-3.5 mr-2" /> Calc Note (Print / PDF)
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid="button-export-json" onClick={() => { const d = buildExportData(); if (d) exportToJSON(d); }}>
                          <Download className="w-3.5 h-3.5 mr-2" /> JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <h3 className="text-xs font-semibold text-muted-foreground">Tank Geometry</h3>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                        <ResultRow label="Volume" value={fmtResult(result.geometry.volume_m3)} unit="m\u00B3" testId="text-volume" />
                        <ResultRow label="Shell Area" value={fmtResult(result.geometry.shellArea_m2)} unit="m\u00B2" />
                        <ResultRow label="Wetted Area" value={fmtResult(result.geometry.wettedArea_m2)} unit="m\u00B2" testId="text-wetted-area" />
                        <ResultRow label="Liquid Volume" value={fmtResult(result.geometry.liquidVolume_m3)} unit="m\u00B3" />
                        <ResultRow label="Vapor Space" value={fmtResult(result.geometry.vaporSpace_m3)} unit="m\u00B3" />
                        <ResultRow label="Roof Area" value={fmtResult(result.geometry.roofArea_m2)} unit="m\u00B2" />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-amber-500/20">
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold text-amber-400">PV Valve — Pressure Side</h3>
                        <p className="text-[10px] text-muted-foreground">Normal outbreathing</p>
                      </CardHeader>
                      <CardContent className="space-y-1.5">
                        <ResultRow label="Flow" value={fmtResult(result.normalVenting.totalOutbreathing_Nm3h)} unit="Nm\u00B3/h" />
                        <ResultRow label="Required Area" value={fmtResult(result.ventSizing.pressureVentArea_mm2)} unit="mm\u00B2" highlight testId="text-pressure-vent-area" />
                        <ResultRow label="Equiv. Diameter" value={fmtResult(result.ventSizing.pressureVentDia_mm)} unit="mm" />
                        <ResultRow label="Suggested NPS" value={result.ventSizing.pressureNPS} unit="" highlight testId="text-pressure-nps" />
                      </CardContent>
                    </Card>

                    <Card className="border-blue-500/20">
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold text-blue-400">PV Valve — Vacuum Side</h3>
                        <p className="text-[10px] text-muted-foreground">Normal inbreathing</p>
                      </CardHeader>
                      <CardContent className="space-y-1.5">
                        <ResultRow label="Flow" value={fmtResult(result.normalVenting.totalInbreathing_Nm3h)} unit="Nm\u00B3/h" />
                        <ResultRow label="Required Area" value={fmtResult(result.ventSizing.vacuumVentArea_mm2)} unit="mm\u00B2" highlight testId="text-vacuum-vent-area" />
                        <ResultRow label="Equiv. Diameter" value={fmtResult(result.ventSizing.vacuumVentDia_mm)} unit="mm" />
                        <ResultRow label="Suggested NPS" value={result.ventSizing.vacuumNPS} unit="" highlight testId="text-vacuum-nps" />
                      </CardContent>
                    </Card>

                    <Card className="border-red-500/20">
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold text-red-400">Emergency Vent</h3>
                        <p className="text-[10px] text-muted-foreground">Net of normal credit (Sec. 5.3)</p>
                      </CardHeader>
                      <CardContent className="space-y-1.5">
                        <ResultRow label="Net Flow" value={fmtResult(result.emergencyVenting.netEmergency_Nm3h)} unit="Nm\u00B3/h" />
                        <ResultRow label="Required Area" value={fmtResult(result.ventSizing.emergencyVentArea_mm2)} unit="mm\u00B2" highlight testId="text-emergency-vent-area" />
                        <ResultRow label="Equiv. Diameter" value={fmtResult(result.ventSizing.emergencyVentDia_mm)} unit="mm" />
                        <ResultRow label="Suggested NPS" value={result.ventSizing.emergencyNPS} unit="" highlight testId="text-emergency-nps" />
                      </CardContent>
                    </Card>
                  </div>

                  <Badge variant="outline" className="text-[10px]" data-testid="badge-governing-side">
                    PV Valve Governing Side: {result.ventSizing.governingSide}
                  </Badge>

                  {result.warnings.length > 0 && <WarningPanel warnings={result.warnings} />}

                  <Card>
                    <CardContent className="py-3 px-4">
                      <button
                        onClick={() => setShowTrace(!showTrace)}
                        className="flex items-center gap-2 text-xs font-medium w-full"
                        data-testid="button-toggle-trace"
                      >
                        <Calculator className="w-3.5 h-3.5 text-primary" />
                        Calculation Trace ({result.trace.length} steps)
                        {showTrace ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                      </button>
                      {showTrace && (
                        <div className="mt-3 space-y-1 border-t pt-3">
                          {result.trace.map((t, i) => (
                            <div key={i} className={`flex items-start gap-2 text-[11px] ${t.step.startsWith("\u2550") ? "mt-3 mb-1" : ""}`}>
                              {t.step.startsWith("\u2550") ? (
                                <span className="font-semibold text-primary text-xs col-span-2">{t.step}</span>
                              ) : (
                                <>
                                  <span className="text-muted-foreground/60 font-mono w-5 text-right shrink-0">{i + 1}</span>
                                  <span className="text-muted-foreground">{t.step}</span>
                                  <span className="ml-auto font-mono text-primary whitespace-nowrap">{t.value}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <AssumptionsPanel
                    assumptions={result.assumptions}
                    references={[
                      "API Std 2000, 7th Edition (2014): Venting Atmospheric and Low-Pressure Storage Tanks",
                      "NFPA 30: Flammable and Combustible Liquids Code",
                    ]}
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calculator className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground" data-testid="text-no-results">
                      Complete all input tabs and click Calculate to see results
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTab(-1)}
              disabled={activeTab === TABS[0].id}
              data-testid="button-prev"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>
            {activeTab === "emergency" ? (
              <Button size="sm" onClick={handleCalculate} data-testid="button-calculate">
                <Calculator className="w-3.5 h-3.5 mr-1.5" /> Calculate All Scenarios
              </Button>
            ) : activeTab === "scenarios" || activeTab === "results" ? (
              <div className="flex gap-2">
                {activeTab === "scenarios" && (
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("results")} data-testid="button-view-sizing">
                    View Sizing <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
                <Button size="sm" onClick={handleCalculate} data-testid="button-recalculate">
                  <Calculator className="w-3.5 h-3.5 mr-1.5" /> Recalculate
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => goTab(1)} data-testid="button-next">
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>

          <div className="mt-8">
            <FeedbackSection calculatorName="API 2000 Tank Venting" />
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultRow({ label, value, unit, highlight, testId }: {
  label: string; value: string; unit: string; highlight?: boolean; testId?: string;
}) {
  return (
    <div className={`flex items-center justify-between text-xs ${highlight ? "font-medium" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-primary" : ""} data-testid={testId}>
        {value} {unit && <span className="text-muted-foreground/70 ml-1">{unit}</span>}
      </span>
    </div>
  );
}
