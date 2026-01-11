import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Info, Activity, Settings, Waves } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { pumpTypes } from "@/lib/pumpData";

const PumpSizingGuide: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Overview */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Pump Sizing & Selection Guide
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        This calculator follows industry standards for pump sizing and hydraulics:
                        <strong> API 610 (Centrifugal)</strong>, <strong> API 674 (Reciprocating)</strong>, and <strong> API 676 (Rotary)</strong>.
                        It performs hydraulic analysis using Darcy-Weisbach method and evaluates NPSHa.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                            <h4 className="font-medium text-sm flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                                <Activity className="h-4 w-4" />
                                API 610 (Centrifugal)
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Kinetic energy transfer</li>
                                <li>• OH, BB, VS types</li>
                                <li>• High flow, low-med head</li>
                                <li>• Sensitive to viscosity</li>
                            </ul>
                        </div>
                        <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                            <h4 className="font-medium text-sm flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400">
                                <Settings className="h-4 w-4" />
                                API 674 (Reciprocating)
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Positive displacement</li>
                                <li>• Plunger/Piston types</li>
                                <li>• High head, low flow</li>
                                <li>• <strong>Acceleration Head</strong> required</li>
                            </ul>
                        </div>
                        <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                            <h4 className="font-medium text-sm flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
                                <Waves className="h-4 w-4" />
                                API 676 (Rotary)
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Positive displacement</li>
                                <li>• Screw/Gear/Lobe</li>
                                <li>• Viscous fluids</li>
                                <li>• Self-priming capability</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Equations */}
            <Accordion type="single" collapsible className="w-full" defaultValue="equations">
                <AccordionItem value="equations" className="border-border/50">
                    <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-primary" />
                            Key Equations
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                                <p className="font-medium mb-1">Total Dynamic Head (TDH)</p>
                                <p className="font-mono text-muted-foreground">TDH = (Pd - Ps)/(ρg) + (Zd - Zs) + (Vd² - Vs²)/(2g) + hf_total</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Bernoulli's equation terms: Pressure + Elevation + Velocity + Friction</p>
                            </div>

                            <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                                <p className="font-medium mb-1">NPSH Available (NPSHa)</p>
                                <p className="font-mono text-muted-foreground">NPSHa = (Ps_abs - Pv)/(ρg) + Zs - hf_suction - ha</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Margin: NPSHa must be {'>'} NPSHr (typically 0.6m - 1.0m margin per API 610)
                                </p>
                            </div>

                            <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                                <p className="font-medium mb-1">Acceleration Head (API 674) - Reciprocating Only</p>
                                <p className="font-mono text-muted-foreground">ha = (L × V × N × C) / (K × g)</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    L = Suction length, V = Velocity, N = RPM, C = Pump const (e.g. 0.2 for Duplex), K = Compressibility
                                </p>
                            </div>

                            <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                                <p className="font-medium mb-1">Hydraulic Power</p>
                                <p className="font-mono text-muted-foreground">Ph (kW) = (ρ × g × Q × H) / 1000</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Brake Power (Pb) = Ph / η_pump</p>
                            </div>

                            <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                                <p className="font-medium mb-1">Specific Speed (Ns)</p>
                                <p className="font-mono text-muted-foreground">Ns = N × √Q / H^0.75</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Determines impeller shape (Radial vs Axial)</p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="types" className="border-border/50">
                    <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-primary" />
                            Pump Types & Applications
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Type</TableHead>
                                        <TableHead className="text-xs">Standard</TableHead>
                                        <TableHead className="text-xs">Head Range (m)</TableHead>
                                        <TableHead className="text-xs">Characteristics</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.values(pumpTypes).map((type, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="text-xs font-medium">{type.name}</TableCell>
                                            <TableCell className="text-xs">{type.standard}</TableCell>
                                            <TableCell className="text-xs font-mono">{type.typicalHead[0]} - {type.typicalHead[1]}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{type.characteristics.join(", ")}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="layout" className="border-border/50">
                    <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Piping Layout Guidelines (API 686)
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-3 text-xs text-muted-foreground">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    <strong>Suction Piping:</strong> Requires straight run of ≥ 5 × D to ensure uniform flow. Eccentric reducers (flat side top) should be used to prevent air pockets.
                                </AlertDescription>
                            </Alert>
                            <ul className="space-y-2 list-disc ml-4">
                                <li>Strainers should be installed to protect the pump. Y-type for start-up, Bucket/Conical for continuous.</li>
                                <li>Isolation valves (Gate/Ball) to allow maintenance. Do not use Globe valves on suction (high ΔP).</li>
                                <li>Check valve on discharge prevents backflow which can spin pump backwards.</li>
                                <li>Discharge reducer usually concentric implies velocity recovery.</li>
                                <li><strong>Air Pockets:</strong> Avoid high points in suction lines where gas can accumulate.</li>
                            </ul>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

export default PumpSizingGuide;
