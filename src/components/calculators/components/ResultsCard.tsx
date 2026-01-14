import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, CheckCircle2, Gauge, Waves } from "lucide-react";
import { CalculationResults, ValidationResult, UnitSystem } from "../types/hydraulicTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ResultsCardProps {
    lineType: "gas" | "liquid" | "mixed";
    results: CalculationResults | null;
    validation: ValidationResult;
    unitSystem: UnitSystem;
    onPressureUnitChange: (val: string) => void;
}

const ResultsCard = ({
    lineType,
    results,
    validation,
    unitSystem,
    onPressureUnitChange
}: ResultsCardProps) => {

    const hasResults = !!results;

    // Formatters
    const fmt = (val: number, decimals: number = 2) => val?.toFixed(decimals) || "0";
    const fmtSci = (val: number) => val?.toExponential(2) || "0";

    const StatusCheck = ({
        label,
        value,
        limit,
        unit,
        isWarning
    }: {
        label: string;
        value: string;
        limit?: string | number | null;
        unit: string;
        isWarning: boolean;
    }) => {
        // If limit is not set (null/undefined), we assume it's compliant (or at least not a violation)
        // Unless isWarning is explicitly forced true from the parent

        return (
            <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 hover:bg-muted/20 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                    {isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <div className="text-right">
                    <div className="text-sm font-semibold font-mono">
                        {value} <span className="text-muted-foreground text-[10px] sm:text-xs font-sans ml-0.5">{unit}</span>
                    </div>
                    {limit !== null && limit !== undefined && (
                        <div className="text-[10px] text-muted-foreground/70">
                            Limit: {limit} {unit}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Calculate derived API check status
    // TODO: Ideally pass this status logic from calculations.ts directly to avoid duplicating logic
    // But for display purposes we check warnings
    const getWarningFor = (keyword: string) => results?.warnings?.find(w => w.toLowerCase().includes(keyword.toLowerCase()));

    return (
        <Card className="border border-border/50 bg-gradient-to-br from-card to-secondary/10 shadow-lg sticky top-6">
            <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Gauge className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-semibold text-xl">Results</h3>
                </div>

                {!hasResults ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-50 bg-secondary/20 rounded-xl border border-dashed border-border">
                        <Info className="w-12 h-12 text-muted-foreground" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">No Results Yet</p>
                            <p className="text-xs text-muted-foreground max-w-[200px]">
                                Fill in the parameters to see hydraulic sizing results
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Primary KPIs */}
                        <div className="grid gap-4">
                            {/* Velocity Card */}
                            <div className={`relative p-5 rounded-2xl border transition-all duration-300 ${results.velocity_m_s > 20
                                ? 'bg-yellow-500/10 border-yellow-500/50'
                                : 'bg-gradient-to-br from-primary/5 to-transparent border-primary/20'
                                }`}>
                                <div className="flex justify-between items-start mb-2 opacity-80">
                                    <span className="text-sm font-medium">Fluid Velocity</span>
                                    {results.velocity_m_s > 60 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">High</Badge>}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold font-mono tracking-tighter text-foreground">
                                        {fmt(results.velocity_m_s)}
                                    </span>
                                    <span className="text-sm font-medium text-muted-foreground">m/s</span>
                                </div>
                            </div>

                            {/* Pressure Drop Card */}
                            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                                <div className="flex justify-between items-start mb-2 opacity-80">
                                    <span className="text-sm font-medium">Pressure Drop</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold font-mono tracking-tighter text-foreground">
                                        {fmt(results.pressureDrop_Pa / 100000, 4)}
                                    </span>
                                    <span className="text-sm font-medium text-muted-foreground">bar</span>
                                </div>

                                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                                    {/* Updated to bar/km per user request */}
                                    <span>Gradient: {fmt((results.pressureDrop_Pa / 100000) * 1000 / results.L_m, 4)} bar/km</span>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                                            </TooltipTrigger>
                                            <TooltipContent>Total ΔP including elevation & friction</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>

                        {/* API 14E / Criteria Checks */}
                        <div className="pt-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Criteria Checks</p>
                            <div className="bg-card border border-border/50 rounded-xl p-1 shadow-sm">
                                {/* Density * Velocity^2 (Momentum) */}
                                <StatusCheck
                                    label="Momentum (ρv²)"
                                    value={fmt(results.rhoVSquared, 0)}
                                    limit={results.limitRhoV2}
                                    unit="kg/m·s²"
                                    isWarning={!!results.limitRhoV2 && results.rhoVSquared > results.limitRhoV2}
                                />

                                {/* Erosional Velocity Check */}
                                <StatusCheck
                                    label="Erosional Limit (API 14E)"
                                    value={fmt(results.velocity_m_s, 2)}
                                    limit={results.erosionalVelocity}
                                    unit="m/s"
                                    isWarning={results.erosionalVelocity > 0 && results.velocity_m_s > results.erosionalVelocity}
                                />

                                {/* Mach Number (Gas/Mixed only) */}
                                {(lineType === "gas" || lineType === "mixed") && (
                                    <StatusCheck
                                        label="Mach Number"
                                        value={fmt(results.machNumber, 3)}
                                        limit={results.limitMach}
                                        unit=""
                                        isWarning={!!results.limitMach && results.machNumber > results.limitMach}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Warnings List */}
                        {results.warnings && results.warnings.length > 0 && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-2.5">
                                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wide">Usage Warnings</span>
                                </div>
                                <ul className="space-y-1.5">
                                    {results.warnings.map((w, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                            <span className="mt-1 w-1 h-1 rounded-full bg-yellow-500 shrink-0" />
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Detailed Metrics */}
                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2 mt-4">
                                <Waves className="w-4 h-4 text-primary opacity-70" />
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Flow Diagnostics</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">Reynolds No.</span>
                                    <span className="font-mono text-sm font-medium text-foreground">{fmtSci(results.reynolds)}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">Friction Factor</span>
                                    <span className="font-mono text-sm font-medium text-foreground">{fmt(results.frictionFactor, 5)}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">Flow Regime</span>
                                    <Badge variant="outline" className="h-5 text-[10px] font-normal border-primary/20 text-primary bg-primary/5">
                                        {results.flowRegime}
                                    </Badge>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">Head Loss</span>
                                    <span className="font-mono text-sm font-medium text-foreground">{fmt(results.headLoss)} m</span>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 col-span-2">
                                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">Fluid Density (In-Situ)</span>
                                    <span className="font-mono text-sm font-medium text-foreground">{fmt(results.mixtureDensity_kgm3)} kg/m³</span>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </CardContent>
        </Card>
    );
};

export default ResultsCard;
