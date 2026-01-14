import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GasServiceCriteria, LiquidServiceCriteria, MixedPhaseServiceCriteria, UnitSystem } from "../types/hydraulicTypes";
import { GAS_SERVICE_CRITERIA, LIQUID_SERVICE_CRITERIA, MIXED_PHASE_SERVICE_CRITERIA, PIPE_ROUGHNESS, PIPE_SCHEDULE_DATA } from "../data/constants";

// Extract unique service types for dropdowns
const gasServiceTypes = [...new Set(GAS_SERVICE_CRITERIA.map(c => c.service))];
const liquidServiceTypes = LIQUID_SERVICE_CRITERIA.map(c => c.service);
const mixedPhaseServiceTypes = MIXED_PHASE_SERVICE_CRITERIA.map(c => c.service);
const nominalDiameters = Object.keys(PIPE_SCHEDULE_DATA);
const pipeMaterials = Object.keys(PIPE_ROUGHNESS);

// Helper for gas pressure ranges
const getPressureRangesForService = (service: string): string[] => {
    return GAS_SERVICE_CRITERIA.filter(c => c.service === service).map(c => c.pressureRange);
};

interface PipePropertiesCardProps {
    lineType: "gas" | "liquid" | "mixed";
    unitSystem: UnitSystem;

    // States and Setters
    gasServiceType: string;
    onGasServiceChange: (val: string) => void;
    gasPressureRange: string;
    onGasPressureRangeChange: (val: string) => void;

    liquidServiceType: string;
    onLiquidServiceTypeChange: (val: string) => void;

    mixedPhaseServiceType: string;
    onMixedPhaseServiceTypeChange: (val: string) => void;

    pipeLength: string;
    onPipeLengthChange: (val: string) => void;
    lengthUnit: string;
    onLengthUnitChange: (val: string) => void;

    nominalDiameter: string;
    onNominalDiameterChange: (val: string) => void;

    schedule: string;
    onScheduleChange: (val: string) => void;
    availableSchedules: string[];

    pipeMaterial: string;
    onPipeMaterialChange: (val: string) => void;

    customRoughness: string;
    onCustomRoughnessChange: (val: string) => void;
    roughnessUnit: string;
    onRoughnessUnitChange: (val: string) => void;

    insideDiameterDisplay: string;

    // Current Criteria for display
    currentGasCriteria: GasServiceCriteria | null;
    currentLiquidCriteria: LiquidServiceCriteria | null;
    currentMixedPhaseCriteria: MixedPhaseServiceCriteria | null;
}

const PipePropertiesCard = ({
    lineType,
    unitSystem,
    gasServiceType,
    onGasServiceChange,
    gasPressureRange,
    onGasPressureRangeChange,
    liquidServiceType,
    onLiquidServiceTypeChange,
    mixedPhaseServiceType,
    onMixedPhaseServiceTypeChange,
    pipeLength,
    onPipeLengthChange,
    lengthUnit,
    onLengthUnitChange,
    nominalDiameter,
    onNominalDiameterChange,
    schedule,
    onScheduleChange,
    availableSchedules,
    pipeMaterial,
    onPipeMaterialChange,
    customRoughness,
    onCustomRoughnessChange,
    roughnessUnit,
    onRoughnessUnitChange,
    insideDiameterDisplay,
    currentGasCriteria,
    currentLiquidCriteria,
    currentMixedPhaseCriteria
}: PipePropertiesCardProps) => {

    const lengthUnits = unitSystem === 'metric' ? ["m", "km"] : ["ft", "mi"];
    const roughnessUnits = unitSystem === 'metric' ? ["mm", "μm"] : ["in"];

    // Available gas pressure ranges
    const availableGasPressureRanges = getPressureRangesForService(gasServiceType);

    return (
        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <span className="text-blue-500 font-bold text-sm">1</span>
                    </div>
                    <h3 className="font-heading font-semibold text-lg">Pipe Properties</h3>
                </div>

                <div className="space-y-5">
                    {/* Service Type Selection */}
                    {lineType === "gas" && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Service Type</Label>
                                <Select value={gasServiceType} onValueChange={onGasServiceChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gasServiceTypes.map((service) => (
                                            <SelectItem key={service} value={service}>{service}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Operating Pressure</Label>
                                <Select value={gasPressureRange} onValueChange={onGasPressureRangeChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableGasPressureRanges.map((range) => (
                                            <SelectItem key={range} value={range}>{range}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {currentGasCriteria && (
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                                    <p className="text-xs font-medium text-primary">Recommended Limits</p>
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                        {currentGasCriteria.pressureDropBarKm !== null && <p>ΔP: ≤ {currentGasCriteria.pressureDropBarKm} bar/km</p>}
                                        {currentGasCriteria.velocityMs !== null && <p>Velocity: ≤ {currentGasCriteria.velocityMs} m/s</p>}
                                        {currentGasCriteria.rhoV2Limit !== null && <p>Momentum: ≤ {currentGasCriteria.rhoV2Limit.toLocaleString()} kg/m·s²</p>}
                                        {currentGasCriteria.machLimit !== null && <p>Mach: ≤ {currentGasCriteria.machLimit}</p>}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {lineType === "liquid" && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Service Type</Label>
                                <Select value={liquidServiceType} onValueChange={onLiquidServiceTypeChange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {liquidServiceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {currentLiquidCriteria && (
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                                    <p className="text-xs font-medium text-primary">Recommended Limits</p>
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                        {currentLiquidCriteria.pressureDropBarKm !== null && <p>ΔP: ≤ {currentLiquidCriteria.pressureDropBarKm} bar/km</p>}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {lineType === "mixed" && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Service Type</Label>
                                <Select value={mixedPhaseServiceType} onValueChange={onMixedPhaseServiceTypeChange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {mixedPhaseServiceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {currentMixedPhaseCriteria && (
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                                    <p className="text-xs font-medium text-primary">Recommended Limits</p>
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                        {currentMixedPhaseCriteria.rhoV2Limit !== null && <p>Momentum: ≤ {currentMixedPhaseCriteria.rhoV2Limit.toLocaleString()} kg/m·s²</p>}
                                        {currentMixedPhaseCriteria.machLimit !== null && <p>Mach: ≤ {currentMixedPhaseCriteria.machLimit}</p>}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Pipe Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Pipe Length</Label>
                            <div className="flex gap-2">
                                <Input type="number" value={pipeLength} onChange={(e) => onPipeLengthChange(e.target.value)} className="flex-1" />
                                <Select value={lengthUnit} onValueChange={onLengthUnitChange}>
                                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                    <SelectContent>{lengthUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Pipe Size (NPS)</Label>
                            <Select value={nominalDiameter} onValueChange={onNominalDiameterChange}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{nominalDiameters.map(d => <SelectItem key={d} value={d}>{d}"</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Schedule</Label>
                            <Select value={schedule} onValueChange={onScheduleChange}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{availableSchedules.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">ID ({unitSystem === 'metric' ? 'mm' : 'in'})</Label>
                            <div className="h-10 px-3 py-2 rounded-md bg-muted/50 border border-border text-sm flex items-center">
                                {insideDiameterDisplay}
                            </div>
                        </div>
                    </div>

                    {/* Material/Roughness */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Material</Label>
                        <Select value={pipeMaterial} onValueChange={onPipeMaterialChange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {pipeMaterials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {pipeMaterial === "Custom" && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Roughness</Label>
                            <div className="flex gap-2">
                                <Input type="number" value={customRoughness} onChange={(e) => onCustomRoughnessChange(e.target.value)} />
                                <Select value={roughnessUnit} onValueChange={onRoughnessUnitChange}>
                                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                    <SelectContent>{roughnessUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                </div>
            </CardContent>
        </Card>
    );
};

export default PipePropertiesCard;
