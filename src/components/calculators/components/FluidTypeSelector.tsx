/**
 * Fluid Type Selector Component
 * Auto-populates fluid properties from the expanded fluid library
 * with temperature-dependent interpolation
 */

import { useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Droplets, Info, Thermometer, Volume2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FluidType, FluidCategory, FluidPhase } from "@/lib/heatExchangerTypes";
import { 
  fluidLibrary,
  getFluidDisplayName, 
  getFluidsByCategory,
  getPropertiesAtTemperature,
  calculatePrandtlNumber,
  calculateSpeedOfSound
} from "@/lib/fluidLibraryExpanded";

interface FluidTypeSelectorProps {
  selectedType: FluidType;
  onTypeChange: (type: FluidType) => void;
  onPropertiesUpdate: (properties: {
    density: string;
    specificHeat: string;
    viscosity: string;
    thermalConductivity: string;
    prandtl: string;
  }) => void;
  onSpeedOfSoundUpdate?: (speedOfSound: number) => void;
  unitSystem: 'metric' | 'imperial';
  temperature?: number; // Average operating temperature for interpolation
  label?: string;
  colorClass?: string;
  side?: 'shell' | 'tube'; // Which side of exchanger
}

export const FluidTypeSelector = ({
  selectedType,
  onTypeChange,
  onPropertiesUpdate,
  onSpeedOfSoundUpdate,
  unitSystem,
  temperature = 25,
  label = "Fluid Type",
  colorClass = "bg-primary",
  side
}: FluidTypeSelectorProps) => {
  const fluidCategories = useMemo(() => getFluidsByCategory(), []);
  const fluid = fluidLibrary[selectedType];

  // Update properties when type or temperature changes
  useEffect(() => {
    if (selectedType === FluidType.CUSTOM) return;

    const props = getPropertiesAtTemperature(selectedType, temperature);
    
    // Convert to imperial if needed
    let density = props.density;
    let specificHeat = props.specificHeat;
    let thermalConductivity = props.thermalConductivity;
    
    if (unitSystem === 'imperial') {
      density = density * 0.062428; // kg/m³ -> lb/ft³
      specificHeat = specificHeat * 0.238846; // kJ/kg·K -> BTU/lb·°F
      thermalConductivity = thermalConductivity * 0.5778; // W/m·K -> BTU/hr·ft·°F
    }

    const prandtl = calculatePrandtlNumber(
      props.specificHeat,
      props.viscosity,
      props.thermalConductivity
    );

    onPropertiesUpdate({
      density: density.toFixed(unitSystem === 'metric' ? 1 : 3),
      specificHeat: specificHeat.toFixed(3),
      viscosity: props.viscosity.toFixed(3),
      thermalConductivity: thermalConductivity.toFixed(4),
      prandtl: prandtl.toFixed(2)
    });

    // Calculate and update speed of sound
    if (onSpeedOfSoundUpdate && fluid) {
      const speedOfSound = calculateSpeedOfSound(fluid, temperature);
      onSpeedOfSoundUpdate(unitSystem === 'imperial' ? speedOfSound * 3.28084 : speedOfSound);
    }
  }, [selectedType, temperature, unitSystem, onPropertiesUpdate, onSpeedOfSoundUpdate, fluid]);

  const handleTypeChange = (value: string) => {
    onTypeChange(value as FluidType);
  };

  const getPhaseIcon = (phase: FluidPhase) => {
    switch (phase) {
      case FluidPhase.GAS:
        return <Volume2 className="h-3 w-3 text-blue-400" />;
      case FluidPhase.LIQUID:
        return <Droplets className="h-3 w-3 text-cyan-400" />;
      default:
        return <Droplets className="h-3 w-3" />;
    }
  };

  const getCategoryLabel = (category: FluidCategory): string => {
    switch (category) {
      case FluidCategory.WATER_STEAM: return "Water & Steam";
      case FluidCategory.CRUDE_PRODUCTS: return "Crude & Products";
      case FluidCategory.LIGHT_HC: return "Light Hydrocarbons";
      case FluidCategory.PROCESS_CHEMICALS: return "Process Chemicals";
      case FluidCategory.GASES: return "Gases";
      case FluidCategory.REFRIGERANTS: return "Refrigerants";
      case FluidCategory.OTHER: return "Other";
      default: return category;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colorClass}`} />
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          {label}
          {side && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1 uppercase">
              {side}
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[250px]">
              <p className="text-xs">
                Select a fluid to auto-populate properties. Properties are interpolated 
                at the average operating temperature. Speed of sound is auto-calculated.
              </p>
            </TooltipContent>
          </Tooltip>
        </Label>
      </div>
      
      <Select value={selectedType} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select fluid type">
            <div className="flex items-center gap-2">
              {fluid && getPhaseIcon(fluid.phase)}
              <span className="truncate">{getFluidDisplayName(selectedType)}</span>
              {selectedType !== FluidType.CUSTOM && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">
                  Library
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {Object.entries(fluidCategories).map(([category, fluids]) => (
            fluids.length > 0 && (
              <div key={category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 sticky top-0">
                  {getCategoryLabel(category as FluidCategory)}
                </div>
                {fluids.map((type) => {
                  const fluidDef = fluidLibrary[type];
                  return (
                    <SelectItem key={type} value={type} className="pl-4">
                      <div className="flex items-center gap-2">
                        {getPhaseIcon(fluidDef.phase)}
                        <span>{fluidDef.name}</span>
                        {fluidDef.phase === FluidPhase.GAS && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            Gas
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </div>
            )
          ))}
        </SelectContent>
      </Select>
      
      {selectedType !== FluidType.CUSTOM && fluid && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Thermometer className="h-3 w-3" />
          <span>Properties @ {temperature.toFixed(0)}°C (interpolated)</span>
          {fluid.coefficients && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              T-dependent
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default FluidTypeSelector;
