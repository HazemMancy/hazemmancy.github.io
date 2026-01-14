import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UnitSystem, MixedPhaseCalculation } from "../types/hydraulicTypes";
import { commonGases, commonLiquids } from '@/lib/fluids';

interface FlowPropertiesCardProps {
    lineType: "gas" | "liquid" | "mixed";
    unitSystem: UnitSystem;

    selectedFluid: string;
    onFluidChange: (val: string) => void;
    fluidTemperature: string;
    onFluidTemperatureChange: (val: string) => void;

    flowRate: string;
    onFlowRateChange: (val: string) => void;
    flowRateUnit: string;
    onFlowRateUnitChange: (val: string) => void;

    density: string;
    onDensityChange: (val: string) => void;
    densityUnit: string;
    onDensityUnitChange: (val: string) => void;

    viscosity: string;
    onViscosityChange: (val: string) => void;
    viscosityUnit: string;
    onViscosityUnitChange: (val: string) => void;

    // Gas Specific
    inletPressure?: string;
    onInletPressureChange?: (val: string) => void;
    compressibilityZ?: string;
    onCompressibilityZChange?: (val: string) => void;
    gasDensity60F?: string;
    onGasDensity60FChange?: (val: string) => void;
    gasMolecularWeight?: string;
    onGasMolecularWeightChange?: (val: string) => void;
    baseTemperature?: string;
    onBaseTemperatureChange?: (val: string) => void;
    basePressure?: string;
    onBasePressureChange?: (val: string) => void;
    baseCompressibilityZ?: string;
    onBaseCompressibilityZChange?: (val: string) => void;

    // Mixed Specific
    mixedGasFlowRate?: string;
    onMixedGasFlowRateChange?: (val: string) => void;
    mixedGasFlowRateUnit?: string;
    onMixedGasFlowRateUnitChange?: (val: string) => void;

    mixedLiquidFlowRate?: string;
    onMixedLiquidFlowRateChange?: (val: string) => void;
    mixedLiquidFlowRateUnit?: string;
    onMixedLiquidFlowRateUnitChange?: (val: string) => void;

    mixedGasDensity?: string;
    onMixedGasDensityChange?: (val: string) => void;
    mixedLiquidDensity?: string;
    onMixedLiquidDensityChange?: (val: string) => void;

    mixedOpPressure?: string;
    onMixedOpPressureChange?: (val: string) => void;
    mixedOpTemp?: string;
    onMixedOpTempChange?: (val: string) => void;
    mixedGasZ?: string;
    onMixedGasZChange?: (val: string) => void;
    mixedGasViscosity?: string;
    onMixedGasViscosityChange?: (val: string) => void;
    mixedLiquidViscosity?: string;
    onMixedLiquidViscosityChange?: (val: string) => void;

    pressureType?: string;
    onPressureTypeChange?: (val: string) => void;

    mixedPhaseCalc: MixedPhaseCalculation | null;
}

const FlowPropertiesCard = ({
    lineType,
    unitSystem,
    selectedFluid,
    onFluidChange,
    fluidTemperature,
    onFluidTemperatureChange,
    flowRate,
    onFlowRateChange,
    flowRateUnit,
    onFlowRateUnitChange,
    density,
    onDensityChange,
    densityUnit,
    onDensityUnitChange,
    viscosity,
    onViscosityChange,
    viscosityUnit,
    onViscosityUnitChange,
    inletPressure,
    onInletPressureChange,
    compressibilityZ,
    onCompressibilityZChange,
    gasDensity60F,
    onGasDensity60FChange,
    gasMolecularWeight,
    onGasMolecularWeightChange,
    baseTemperature,
    onBaseTemperatureChange,
    basePressure,
    onBasePressureChange,
    baseCompressibilityZ,
    onBaseCompressibilityZChange,
    mixedGasFlowRate,
    onMixedGasFlowRateChange,
    mixedGasFlowRateUnit,
    onMixedGasFlowRateUnitChange,
    mixedLiquidFlowRate,
    onMixedLiquidFlowRateChange,
    mixedLiquidFlowRateUnit,
    onMixedLiquidFlowRateUnitChange,
    mixedGasDensity,
    onMixedGasDensityChange,
    mixedLiquidDensity,
    onMixedLiquidDensityChange,
    mixedOpPressure,
    onMixedOpPressureChange,
    mixedOpTemp,
    onMixedOpTempChange,
    mixedGasZ,
    onMixedGasZChange,
    mixedGasViscosity,
    onMixedGasViscosityChange,
    mixedLiquidViscosity,
    onMixedLiquidViscosityChange,
    pressureType,
    onPressureTypeChange,
    mixedPhaseCalc
}: FlowPropertiesCardProps) => {

    const flowRateUnits = unitSystem === 'metric'
        ? (lineType === "gas" ? ["MMSCFD", "Nm³/h", "Sm³/h", "m³/h"] : ["m³/h", "m³/s", "L/min", "L/s"])
        : (lineType === "gas" ? ["MMSCFD", "SCFM"] : ["gpm", "bbl/d", "ft³/min"]);

    const densityUnits = unitSystem === 'metric' ? ["kg/m³", "g/cm³"] : ["lb/ft³", "lb/gal"];
    const viscosityUnits = unitSystem === 'metric' ? ["cP", "Pa·s", "mPa·s"] : ["cP"];

    return (
        <Card className="border-2 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <span className="text-emerald-500 font-bold text-sm">2</span>
                    </div>
                    <h3 className="font-heading font-semibold text-lg">Flow Properties</h3>
                </div>

                <div className="space-y-5">
                    {/* Fluid Selection */}
                    {lineType !== "mixed" && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Fluid</Label>
                            <Select value={selectedFluid} onValueChange={onFluidChange}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Custom">Custom</SelectItem>
                                    {lineType === "gas"
                                        ? commonGases.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)
                                        : commonLiquids.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Temperature */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Temperature ({unitSystem === 'metric' ? "°C" : "°F"})</Label>
                        <Input type="number" value={fluidTemperature} onChange={(e) => onFluidTemperatureChange(e.target.value)} />
                    </div>

                    {/* Single Phase Flow Inputs */}
                    {lineType !== "mixed" && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Flow Rate</Label>
                                <div className="flex gap-2">
                                    <Input type="number" value={flowRate} onChange={(e) => onFlowRateChange(e.target.value)} className="flex-1" />
                                    <Select value={flowRateUnit} onValueChange={onFlowRateUnitChange}>
                                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                        <SelectContent>{flowRateUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Gas Conditions */}
                            {lineType === "gas" && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Inlet Pressure ({unitSystem === 'metric' ? 'barg' : 'psig'})</Label>
                                        <Input type="number" value={inletPressure} onChange={(e) => onInletPressureChange?.(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Compressibility (Z)</Label>
                                            <Input type="number" value={compressibilityZ} onChange={(e) => onCompressibilityZChange?.(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Mol Weight (kg/kmol)</Label>
                                            <Input type="number" value={gasMolecularWeight} onChange={(e) => onGasMolecularWeightChange?.(e.target.value)} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Properties */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Density</Label>
                                    <div className="flex gap-2">
                                        <Input type="number" value={density} onChange={(e) => onDensityChange(e.target.value)} className="flex-1" />
                                        <Select value={densityUnit} onValueChange={onDensityUnitChange}>
                                            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                            <SelectContent>{densityUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Viscosity</Label>
                                    <div className="flex gap-2">
                                        <Input type="number" value={viscosity} onChange={(e) => onViscosityChange(e.target.value)} className="flex-1" />
                                        <Select value={viscosityUnit} onValueChange={onViscosityUnitChange}>
                                            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                            <SelectContent>{viscosityUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Mixed Phase Inputs */}
                    {lineType === "mixed" && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted/40 rounded-lg space-y-3">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Flow Rates</Label>
                                <div className="space-y-2">
                                    <Label className="text-sm">Gas Flow</Label>
                                    <div className="flex gap-2">
                                        <Input value={mixedGasFlowRate} onChange={(e) => onMixedGasFlowRateChange?.(e.target.value)} />
                                        <Select value={mixedGasFlowRateUnit} onValueChange={onMixedGasFlowRateUnitChange}>
                                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MMSCFD">MMSCFD</SelectItem>
                                                <SelectItem value="m³/h">m³/h</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm">Liquid Flow</Label>
                                    <div className="flex gap-2">
                                        <Input value={mixedLiquidFlowRate} onChange={(e) => onMixedLiquidFlowRateChange?.(e.target.value)} />
                                        <Select value={mixedLiquidFlowRateUnit} onValueChange={onMixedLiquidFlowRateUnitChange}>
                                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="m³/h">m³/h</SelectItem>
                                                <SelectItem value="bbl/d">bbl/d</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-muted/40 rounded-lg space-y-3">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Properties</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-xs">Gas Density (kg/m³)</Label><Input value={mixedGasDensity} onChange={(e) => onMixedGasDensityChange?.(e.target.value)} className="h-8" /></div>
                                    <div className="space-y-1"><Label className="text-xs">Liq Density (kg/m³)</Label><Input value={mixedLiquidDensity} onChange={(e) => onMixedLiquidDensityChange?.(e.target.value)} className="h-8" /></div>
                                </div>
                            </div>

                            {/* Mixed Phase Operating Conditions (Restored) */}
                            <div className="pt-3 border-t border-border mt-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Operating Conditions</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Pressure (barg)</Label>
                                        <Input type="number" value={mixedOpPressure} onChange={(e) => onMixedOpPressureChange?.(e.target.value)} className="h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Temp (°C)</Label>
                                        <Input type="number" value={mixedOpTemp} onChange={(e) => onMixedOpTempChange?.(e.target.value)} className="h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Gas Z</Label>
                                        <Input type="number" value={mixedGasZ} onChange={(e) => onMixedGasZChange?.(e.target.value)} className="h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Gas Visc (cP)</Label>
                                        <Input type="number" value={mixedGasViscosity} onChange={(e) => onMixedGasViscosityChange?.(e.target.value)} className="h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Liq Visc (cP)</Label>
                                        <Input type="number" value={mixedLiquidViscosity} onChange={(e) => onMixedLiquidViscosityChange?.(e.target.value)} className="h-8" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </CardContent>
        </Card>
    );
};

export default FlowPropertiesCard;
