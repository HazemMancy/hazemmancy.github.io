// src/components/calculators/HydraulicSizingCalculatorDraft.tsx

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Info, CheckCircle2 } from "lucide-react";
import HydraulicGuide from "./guides/HydraulicGuide";
import { generateHydraulicPDF, HydraulicDatasheetData } from "@/lib/hydraulicPdfDatasheet";
import { generateHydraulicExcelDatasheet, HydraulicExcelData } from "@/lib/hydraulicExcelDatasheet";

// ================== TYPE DEFINITIONS ==================

type UnitSystem = "metric" | "imperial";

interface GasSizingCriteria {
    service: string;
    pressureRange: string;
    pressureDropBarKm: number | null;
    velocityMs: number | null;
    rhoV2: number | null;
    mach: number | null;
    note?: string;
}

interface LiquidSizingCriteria {
    service: string;
    pressureDropBarKm: number | null;
    velocity: {
        size2: number | null;
        size3to6: number | null;
        size8to12: number | null;
        size14to18: number | null;
        size20plus: number | null;
    } | null;
}

interface MixedPhaseSizingCriteria {
    service: string;
    rhoV2: number;
    mach?: number | null;
}

interface CalculationResults {
    headLoss: number;
    erosionalVelocity: number;
    rhoVSquared: number;
    // Additional results can be added as needed
}

// ================== COMPONENT ==================
export default function HydraulicSizingCalculatorDraft() {
    // ----- UI State -----
    const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
    const [lineType, setLineType] = useState<string>("gas");

    // Metadata for export
    const [companyName, setCompanyName] = useState("");
    const [projectName, setProjectName] = useState("");
    const [itemNumber, setItemNumber] = useState("");
    const [serviceName, setServiceName] = useState("");

    // ----- Input State (simplified for draft) -----
    const [flowRate, setFlowRate] = useState(0);
    const [pipeDiameter, setPipeDiameter] = useState(0);
    const [pipeLength, setPipeLength] = useState(0);
    const [fluidTemp, setFluidTemp] = useState(0);

    // ----- Calculation Logic -----
    const results = useMemo<CalculationResults | null>(() => {
        if (flowRate <= 0 || pipeDiameter <= 0) return null;
        // Simplified Darcy‑Weisbach calculation (placeholder)
        const velocity = (4 * flowRate) / (Math.PI * Math.pow(pipeDiameter, 2));
        const headLoss = 0.02 * pipeLength * Math.pow(velocity, 2) / (pipeDiameter * 9.81);
        const erosionalVelocity = velocity * 0.9; // placeholder factor
        const rho = 1000; // assume water for draft
        const rhoVSquared = rho * Math.pow(velocity, 2);
        return { headLoss, erosionalVelocity, rhoVSquared };
    }, [flowRate, pipeDiameter, pipeLength]);

    // ----- Export Handlers -----
    const handleExportPDF = () => {
        if (!results) {
            toast({ title: "No results", description: "Run calculations first", variant: "destructive" });
            return;
        }
        const datasheet: HydraulicDatasheetData = {
            companyName,
            projectName,
            itemNumber,
            serviceName,
            date: new Date().toLocaleDateString(),
            // Inputs
            lineType: lineType as "gas" | "liquid" | "mixed",
            flowRate,
            pipeDiameter,
            pipeLength,
            fluidTemp,
            // Results
            ...results,
        } as any; // cast for draft simplicity
        generateHydraulicPDF(datasheet);
        toast({ title: "PDF exported" });
    };

    const handleExportExcel = () => {
        if (!results) {
            toast({ title: "No results", description: "Run calculations first", variant: "destructive" });
            return;
        }
        const excel: HydraulicExcelData = {
            companyName,
            projectName,
            itemNumber,
            serviceName,
            date: new Date().toLocaleDateString(),
            lineType: lineType as "gas" | "liquid" | "mixed",
            flowRate,
            pipeDiameter,
            pipeLength,
            fluidTemp,
            ...results,
        } as any;
        generateHydraulicExcelDatasheet(excel);
        toast({ title: "Excel exported" });
    };

    // ----- Render -----
    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
                <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="p-3 rounded-xl bg-primary/10">
                                <Info className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                                    Hydraulic Sizing Calculator (Draft)
                                </h2>
                                <p className="text-muted-foreground">Calculate pipe sizing for gas, liquid or mixed‑phase flow.</p>
                            </div>
                        </div>
                        {/* Unit System Toggle */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                            <span className={`text-sm font-medium ${unitSystem === "metric" ? "text-primary" : "text-muted-foreground"}`}>Metric</span>
                            <Switch checked={unitSystem === "imperial"} onCheckedChange={c => setUnitSystem(c ? "imperial" : "metric")} />
                            <span className={`text-sm font-medium ${unitSystem === "imperial" ? "text-primary" : "text-muted-foreground"}`}>Imperial</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="calculator" className="w-full">
                <div className="flex justify-center mb-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-secondary/30 p-1 rounded-full">
                        <TabsTrigger value="calculator" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                            Calculator
                        </TabsTrigger>
                        <TabsTrigger value="guide" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                            Standards Guide
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Calculator Content */}
                <TabsContent value="calculator" className="space-y-6">
                    {/* Input Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Pipe Properties */}
                        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <span className="text-blue-500 font-bold text-sm">1</span>
                                    </div>
                                    <h3 className="font-heading font-semibold text-lg">Pipe Properties</h3>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium">Flow Rate ({unitSystem === "metric" ? "m³/h" : "ft³/h"})</Label>
                                        <Input type="number" value={flowRate} onChange={e => setFlowRate(parseFloat(e.target.value) || 0)} className="h-8 bg-background/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium">Pipe Diameter ({unitSystem === "metric" ? "mm" : "in"})</Label>
                                        <Input type="number" value={pipeDiameter} onChange={e => setPipeDiameter(parseFloat(e.target.value) || 0)} className="h-8 bg-background/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium">Pipe Length ({unitSystem === "metric" ? "m" : "ft"})</Label>
                                        <Input type="number" value={pipeLength} onChange={e => setPipeLength(parseFloat(e.target.value) || 0)} className="h-8 bg-background/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium">Fluid Temperature ({unitSystem === "metric" ? "°C" : "°F"})</Label>
                                        <Input type="number" value={fluidTemp} onChange={e => setFluidTemp(parseFloat(e.target.value) || 0)} className="h-8 bg-background/50" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Results */}
                        <Card className="lg:col-span-2 border-2 border-border hover:border-primary/30 transition-colors">
                            <CardContent className="p-6">
                                <h3 className="font-heading font-semibold mb-4">Results</h3>
                                {results ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                            <span className="text-xs text-muted-foreground">Head Loss</span>
                                            <p className="text-lg font-mono font-semibold">{results.headLoss.toFixed(3)} m</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                            <span className="text-xs text-muted-foreground">Erosional Velocity</span>
                                            <p className="text-lg font-mono font-semibold">{results.erosionalVelocity.toFixed(3)} m/s</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                            <span className="text-xs text-muted-foreground">ρ·V²</span>
                                            <p className="text-lg font-mono font-semibold">{results.rhoVSquared.toFixed(1)} Pa</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Enter values to see results.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Export Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-secondary/20 border border-border/50 col-span-1 lg:col-span-3 mt-6">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Company</Label>
                            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-8 bg-background/50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Project</Label>
                            <Input value={projectName} onChange={e => setProjectName(e.target.value)} className="h-8 bg-background/50" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Item No</Label>
                            <Input value={itemNumber} onChange={e => setItemNumber(e.target.value)} className="h-8 bg-background/50" />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={handleExportPDF} className="flex-1 h-8 text-xs gap-2" variant="outline">Export PDF</Button>
                            <Button onClick={handleExportExcel} className="flex-1 h-8 text-xs gap-2" variant="outline">Export Excel</Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Guide Content */}
                <TabsContent value="guide" className="space-y-8">
                    <HydraulicGuide />
                </TabsContent>
            </Tabs>
        </div>
    );
}
