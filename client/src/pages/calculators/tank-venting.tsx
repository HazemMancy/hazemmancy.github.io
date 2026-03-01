import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { exportToExcel, exportToPDF, exportToJSON } from "@/lib/engineering/exportUtils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Container, FlaskConical, RotateCcw, ChevronLeft, ChevronRight,
  Settings2, Flame, Droplets, Calculator, CheckCircle2,
  Download, FileSpreadsheet, FileText, AlertTriangle, Info, XCircle,
  ChevronDown, ChevronUp, Wind,
} from "lucide-react";

const TABS = [
  { id: "tank", label: "Tank", icon: Container, step: 1 },
  { id: "product", label: "Product", icon: Droplets, step: 2 },
  { id: "normal", label: "Normal", icon: Wind, step: 3 },
  { id: "emergency", label: "Emergency", icon: Flame, step: 4 },
  { id: "results", label: "Results", icon: CheckCircle2, step: 5 },
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
};

function FlagIcon({ severity }: { severity: "info" | "warning" | "error" }) {
  if (severity === "error") return <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
}

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
    }));
    setUnitSystem(newSystem);
  }, [unitSystem]);

  const updateField = (field: keyof FormState, value: number | string) => {
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
      ],
      results: [
        { label: "Tank Volume", value: fmtResult(result.geometry.volume_m3), unit: "m³" },
        { label: "Wetted Area", value: fmtResult(result.geometry.wettedArea_m2), unit: "m²" },
        { label: "Thermal Outbreathing", value: fmtResult(result.normalVenting.thermalOutbreathing_Nm3h), unit: "Nm³/h" },
        { label: "Thermal Inbreathing", value: fmtResult(result.normalVenting.thermalInbreathing_Nm3h), unit: "Nm³/h" },
        { label: "Total Outbreathing", value: fmtResult(result.normalVenting.totalOutbreathing_Nm3h), unit: "Nm³/h" },
        { label: "Total Inbreathing", value: fmtResult(result.normalVenting.totalInbreathing_Nm3h), unit: "Nm³/h" },
        { label: "Governing Normal", value: fmtResult(result.normalVenting.governingNormal_Nm3h), unit: "Nm³/h", highlight: true },
        { label: "Emergency Venting", value: fmtResult(result.emergencyVenting.emergencyVenting_Nm3h), unit: "Nm³/h", highlight: true },
        { label: "Fire Heat Input", value: fmtResult(result.emergencyVenting.heatInput_kW), unit: "kW" },
        { label: "Pressure Vent Area", value: fmtResult(result.ventSizing.pressureVentArea_mm2), unit: "mm²", highlight: true },
        { label: "Pressure Vent NPS", value: result.ventSizing.pressureNPS, unit: "" },
        { label: "Vacuum Vent Area", value: fmtResult(result.ventSizing.vacuumVentArea_mm2), unit: "mm²", highlight: true },
        { label: "Vacuum Vent NPS", value: result.ventSizing.vacuumNPS, unit: "" },
        { label: "Governing Side", value: result.ventSizing.governingSide, unit: "" },
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
                  Atmospheric &amp; low-pressure storage tank venting per API Std 2000
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

            <TabsContent value="tank">
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Container className="w-4 h-4 text-primary" /> Tank Geometry
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Tank Diameter ({lenU})</Label>
                      <Input
                        type="number"
                        value={form.tankDiameter || ""}
                        onChange={e => updateField("tankDiameter", parseFloat(e.target.value) || 0)}
                        data-testid="input-tank-diameter"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tank Height ({lenU})</Label>
                      <Input
                        type="number"
                        value={form.tankHeight || ""}
                        onChange={e => updateField("tankHeight", parseFloat(e.target.value) || 0)}
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
                      <Input
                        type="number"
                        value={form.liquidLevel || ""}
                        onChange={e => updateField("liquidLevel", parseFloat(e.target.value) || 0)}
                        min={0} max={100}
                        data-testid="input-liquid-level"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Design Pressure (mbar g)</Label>
                      <Input
                        type="number"
                        value={form.designPressure || ""}
                        onChange={e => updateField("designPressure", parseFloat(e.target.value) || 0)}
                        data-testid="input-design-pressure"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Design Vacuum (mbar)</Label>
                      <Input
                        type="number"
                        value={form.designVacuum || ""}
                        onChange={e => updateField("designVacuum", parseFloat(e.target.value) || 0)}
                        data-testid="input-design-vacuum"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="product">
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-primary" /> Product Properties
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Product Category (API 2000)</Label>
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
                      <Input
                        type="number"
                        value={form.vaporMW || ""}
                        onChange={e => updateField("vaporMW", parseFloat(e.target.value) || 0)}
                        data-testid="input-vapor-mw"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Flash Factor</Label>
                      <Input
                        type="number"
                        value={form.flashFactor || ""}
                        onChange={e => updateField("flashFactor", parseFloat(e.target.value) || 0)}
                        data-testid="input-flash-factor"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Ratio of vapor generated to liquid pumped in (≥ 1.0)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Relieving Temperature ({tU})</Label>
                      <Input
                        type="number"
                        value={form.relievingTemp || ""}
                        onChange={e => updateField("relievingTemp", parseFloat(e.target.value) || 0)}
                        data-testid="input-relieving-temp"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Latent Heat of Vaporization (kJ/kg)</Label>
                      <Input
                        type="number"
                        value={form.latentHeat || ""}
                        onChange={e => updateField("latentHeat", parseFloat(e.target.value) || 0)}
                        data-testid="input-latent-heat"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Vapor Density at Relieving Conditions ({densU})</Label>
                    <Input
                      type="number"
                      value={form.vaporDensity || ""}
                      onChange={e => updateField("vaporDensity", parseFloat(e.target.value) || 0)}
                      data-testid="input-vapor-density"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="normal">
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Wind className="w-4 h-4 text-primary" /> Normal Venting — Liquid Movement
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Max Liquid Fill Rate ({flowU})</Label>
                      <Input
                        type="number"
                        value={form.maxFillRate || ""}
                        onChange={e => updateField("maxFillRate", parseFloat(e.target.value) || 0)}
                        data-testid="input-fill-rate"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Contributes to outbreathing</p>
                    </div>
                    <div>
                      <Label className="text-xs">Max Liquid Empty Rate ({flowU})</Label>
                      <Input
                        type="number"
                        value={form.maxEmptyRate || ""}
                        onChange={e => updateField("maxEmptyRate", parseFloat(e.target.value) || 0)}
                        data-testid="input-empty-rate"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Contributes to inbreathing</p>
                    </div>
                  </div>
                  <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300 space-y-1">
                    <p className="font-medium flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> API 2000 Section 4 — Normal Venting</p>
                    <p>Total outbreathing = thermal outbreathing + liquid fill rate × flash factor</p>
                    <p>Total inbreathing = thermal inbreathing + liquid empty rate</p>
                    <p>Thermal breathing scales as C × V^0.7 per API 2000 Table 2/3</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emergency">
              <Card>
                <CardHeader className="pb-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Flame className="w-4 h-4 text-primary" /> Emergency Venting — Fire Exposure
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300 space-y-1">
                    <p className="font-medium flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> API 2000 Section 5 — Emergency Venting</p>
                    <p>Heat input: Q = 43,200 × F × A_w^0.82 (W) for wetted area A_w &gt; 2.8 m²</p>
                    <p>Environmental factor F reduces heat input for insulated or earth-covered tanks</p>
                    <p>Emergency venting converted to Nm³/h free air equivalent</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results">
              {result ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" /> Calculation Results
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-export">
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToExcel(d); }}>
                          <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToPDF(d); }}>
                          <FileText className="w-3.5 h-3.5 mr-2" /> PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { const d = buildExportData(); if (d) exportToJSON(d); }}>
                          <Download className="w-3.5 h-3.5 mr-2" /> JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground">Tank Geometry</h3>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ResultRow label="Volume" value={fmtResult(result.geometry.volume_m3)} unit="m³" testId="text-volume" />
                        <ResultRow label="Shell Area" value={fmtResult(result.geometry.shellArea_m2)} unit="m²" />
                        <ResultRow label="Wetted Area" value={fmtResult(result.geometry.wettedArea_m2)} unit="m²" testId="text-wetted-area" />
                        <ResultRow label="Vapor Space" value={fmtResult(result.geometry.vaporSpace_m3)} unit="m³" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground">Normal Venting</h3>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ResultRow label="Thermal Out" value={fmtResult(result.normalVenting.thermalOutbreathing_Nm3h)} unit="Nm³/h" />
                        <ResultRow label="Thermal In" value={fmtResult(result.normalVenting.thermalInbreathing_Nm3h)} unit="Nm³/h" />
                        <ResultRow label="Liquid Movement Out" value={fmtResult(result.normalVenting.liquidMovementOut_Nm3h)} unit="Nm³/h" />
                        <ResultRow label="Liquid Movement In" value={fmtResult(result.normalVenting.liquidMovementIn_Nm3h)} unit="Nm³/h" />
                        <div className="border-t pt-2">
                          <ResultRow label="Total Outbreathing" value={fmtResult(result.normalVenting.totalOutbreathing_Nm3h)} unit="Nm³/h" highlight />
                          <ResultRow label="Total Inbreathing" value={fmtResult(result.normalVenting.totalInbreathing_Nm3h)} unit="Nm³/h" highlight />
                        </div>
                        <Badge variant="outline" className="text-[10px] mt-1" data-testid="badge-governing-direction">
                          Governing: {result.normalVenting.governingDirection} ({fmtResult(result.normalVenting.governingNormal_Nm3h)} Nm³/h)
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground">Emergency Venting (Fire)</h3>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ResultRow label="Wetted Area" value={fmtResult(result.emergencyVenting.wettedArea_m2)} unit="m²" />
                        <ResultRow label="Environmental Factor F" value={String(result.emergencyVenting.envFactor)} unit="" />
                        <ResultRow label="Fire Heat Input" value={fmtResult(result.emergencyVenting.heatInput_kW)} unit="kW" testId="text-heat-input" />
                        <ResultRow label="Emergency Venting" value={fmtResult(result.emergencyVenting.emergencyVenting_Nm3h)} unit="Nm³/h" highlight testId="text-emergency-venting" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground">Vent Sizing — Pressure (PV Valve)</h3>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ResultRow label="Flow (outbreathing + emergency)" value={fmtResult(Math.max(result.normalVenting.totalOutbreathing_Nm3h, result.emergencyVenting.emergencyVenting_Nm3h))} unit="Nm³/h" />
                        <ResultRow label="Design ΔP" value={fmtResult(form.designPressure)} unit="mbar" />
                        <ResultRow label="Required Area" value={fmtResult(result.ventSizing.pressureVentArea_mm2)} unit="mm²" highlight testId="text-pressure-vent-area" />
                        <ResultRow label="Equivalent Diameter" value={fmtResult(result.ventSizing.pressureVentDia_mm)} unit="mm" />
                        <ResultRow label="Suggested NPS" value={result.ventSizing.pressureNPS} unit="" highlight testId="text-pressure-nps" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground">Vent Sizing — Vacuum (Vacuum Breaker)</h3>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ResultRow label="Flow (inbreathing)" value={fmtResult(result.normalVenting.totalInbreathing_Nm3h)} unit="Nm³/h" />
                        <ResultRow label="Design ΔP" value={fmtResult(form.designVacuum)} unit="mbar" />
                        <ResultRow label="Required Area" value={fmtResult(result.ventSizing.vacuumVentArea_mm2)} unit="mm²" highlight testId="text-vacuum-vent-area" />
                        <ResultRow label="Equivalent Diameter" value={fmtResult(result.ventSizing.vacuumVentDia_mm)} unit="mm" />
                        <ResultRow label="Suggested NPS" value={result.ventSizing.vacuumNPS} unit="" highlight testId="text-vacuum-nps" />
                        <Badge variant="outline" className="text-[10px] mt-2" data-testid="badge-governing-side">
                          Governing side: {result.ventSizing.governingSide}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

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
                        <div className="mt-3 space-y-1.5 border-t pt-3">
                          {result.trace.map((t, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px]">
                              <span className="text-muted-foreground/60 font-mono w-5 text-right shrink-0">{i + 1}</span>
                              <span className="text-muted-foreground">{t.step}</span>
                              <span className="ml-auto font-mono text-primary whitespace-nowrap">{t.value}</span>
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
            {activeTab !== "results" ? (
              activeTab === TABS[TABS.length - 2].id ? (
                <Button size="sm" onClick={handleCalculate} data-testid="button-calculate">
                  <Calculator className="w-3.5 h-3.5 mr-1.5" /> Calculate
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => goTab(1)} data-testid="button-next">
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )
            ) : (
              <Button size="sm" onClick={handleCalculate} data-testid="button-recalculate">
                <Calculator className="w-3.5 h-3.5 mr-1.5" /> Recalculate
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
