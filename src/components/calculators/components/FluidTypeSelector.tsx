/**
 * Fluid Type Selector Component
 * Auto-populates fluid properties from the fluid library
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Droplets, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FluidType, 
  UnitSystem 
} from "@/lib/heatExchangerTypes";
import { 
  getFluidTypeProperties, 
  getFluidTypeDisplayName, 
  getAvailableFluidTypes,
  calculatePrandtl
} from "@/lib/heatExchangerFluidLibrary";

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
  unitSystem: 'metric' | 'imperial';
  temperature?: number; // Average temperature for property adjustment
  label?: string;
  colorClass?: string;
}

export const FluidTypeSelector = ({
  selectedType,
  onTypeChange,
  onPropertiesUpdate,
  unitSystem,
  temperature,
  label = "Fluid Type",
  colorClass = "bg-primary"
}: FluidTypeSelectorProps) => {
  const fluidTypes = getAvailableFluidTypes();
  
  const handleTypeChange = (value: string) => {
    const newType = value as FluidType;
    onTypeChange(newType);
    
    if (newType !== FluidType.CUSTOM) {
      const libUnitSystem = unitSystem === 'metric' ? UnitSystem.METRIC : UnitSystem.IMPERIAL;
      const props = getFluidTypeProperties(newType, libUnitSystem);
      
      if (props.density && props.specificHeat && props.viscosity && props.thermalConductivity) {
        const prandtl = calculatePrandtl(
          props.specificHeat, 
          props.viscosity, 
          props.thermalConductivity
        );
        
        onPropertiesUpdate({
          density: props.density.toFixed(unitSystem === 'metric' ? 1 : 3),
          specificHeat: props.specificHeat.toFixed(3),
          viscosity: props.viscosity.toFixed(3),
          thermalConductivity: props.thermalConductivity.toFixed(4),
          prandtl: prandtl.toFixed(2)
        });
      }
    }
  };

  // Group fluids by category for better UX
  const fluidCategories = {
    'Common': [FluidType.WATER, FluidType.STEAM],
    'Hydrocarbons': [FluidType.CRUDE_OIL, FluidType.NAPHTHA, FluidType.DIESEL],
    'Light HC': [FluidType.NATURAL_GAS, FluidType.PROPANE, FluidType.BUTANE],
    'Process': [FluidType.AMINE, FluidType.GLYCOL],
    'Other': [FluidType.CUSTOM]
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colorClass}`} />
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          {label}
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs">
                Select a fluid to auto-populate properties from the database, or choose 'Custom' for manual entry.
              </p>
            </TooltipContent>
          </Tooltip>
        </Label>
      </div>
      
      <Select value={selectedType} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select fluid type">
            <div className="flex items-center gap-2">
              <Droplets className="h-3 w-3 text-muted-foreground" />
              <span>{getFluidTypeDisplayName(selectedType)}</span>
              {selectedType !== FluidType.CUSTOM && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                  Library
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(fluidCategories).map(([category, fluids]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {category}
              </div>
              {fluids.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-3 w-3" />
                    {getFluidTypeDisplayName(type)}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
      
      {selectedType !== FluidType.CUSTOM && (
        <p className="text-[10px] text-muted-foreground">
          Properties from GPSA Engineering Data Book @ 25°C reference
        </p>
      )}
    </div>
  );
};

export default FluidTypeSelector;
