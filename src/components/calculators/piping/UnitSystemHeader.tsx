import { Globe, Thermometer, Ruler } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  UnitSystem, 
  TemperatureUnit, 
  PipeSizeUnit, 
  Material, 
  materials,
  getTempUnit 
} from "./types";

interface UnitSystemHeaderProps {
  unitSystem: UnitSystem;
  setUnitSystem: (s: UnitSystem) => void;
  tempUnit: TemperatureUnit;
  setTempUnit: (t: TemperatureUnit) => void;
  pipeSizeUnit: PipeSizeUnit;
  setPipeSizeUnit: (p: PipeSizeUnit) => void;
  selectedMaterial: string;
  setSelectedMaterial: (m: string) => void;
}

export const UnitSystemHeader = ({
  unitSystem,
  setUnitSystem,
  tempUnit,
  setTempUnit,
  pipeSizeUnit,
  setPipeSizeUnit,
  selectedMaterial,
  setSelectedMaterial
}: UnitSystemHeaderProps) => {
  const currentMaterial = materials.find(m => m.id === selectedMaterial);
  
  return (
    <div className="bg-gradient-to-r from-primary/5 via-muted/30 to-primary/5 rounded-xl border-2 border-primary/20 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4 lg:gap-6">
        {/* Length Units */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Ruler className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Length:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/80 rounded-lg px-2 py-1 border">
            <span className={`text-xs font-semibold transition-colors ${unitSystem === 'metric' ? 'text-primary' : 'text-muted-foreground'}`}>
              mm
            </span>
            <Switch
              checked={unitSystem === 'imperial'}
              onCheckedChange={(checked) => setUnitSystem(checked ? 'imperial' : 'metric')}
              className="scale-75"
            />
            <span className={`text-xs font-semibold transition-colors ${unitSystem === 'imperial' ? 'text-primary' : 'text-muted-foreground'}`}>
              inch
            </span>
          </div>
        </div>
        
        {/* Temperature Units */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Thermometer className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Temp:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/80 rounded-lg px-2 py-1 border">
            <span className={`text-xs font-semibold transition-colors ${tempUnit === 'celsius' ? 'text-primary' : 'text-muted-foreground'}`}>
              °C
            </span>
            <Switch
              checked={tempUnit === 'fahrenheit'}
              onCheckedChange={(checked) => setTempUnit(checked ? 'fahrenheit' : 'celsius')}
              className="scale-75"
            />
            <span className={`text-xs font-semibold transition-colors ${tempUnit === 'fahrenheit' ? 'text-primary' : 'text-muted-foreground'}`}>
              °F
            </span>
          </div>
        </div>
        
        {/* Pipe Size Units */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Size:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/80 rounded-lg px-2 py-1 border">
            <span className={`text-xs font-semibold transition-colors ${pipeSizeUnit === 'inch' ? 'text-primary' : 'text-muted-foreground'}`}>
              NPS
            </span>
            <Switch
              checked={pipeSizeUnit === 'mm'}
              onCheckedChange={(checked) => setPipeSizeUnit(checked ? 'mm' : 'inch')}
              className="scale-75"
            />
            <span className={`text-xs font-semibold transition-colors ${pipeSizeUnit === 'mm' ? 'text-primary' : 'text-muted-foreground'}`}>
              DN
            </span>
          </div>
        </div>
        
        {/* Divider */}
        <div className="hidden lg:block h-8 w-px bg-border" />
        
        {/* Material Selection */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-medium text-muted-foreground">Material:</span>
          <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
            <SelectTrigger className="flex-1 h-8 text-xs bg-background/80 border-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-50 max-h-[300px]">
              {materials.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  <div className="flex flex-col">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground text-[10px]">{m.spec}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Material Info Badge */}
        {currentMaterial && (
          <Badge variant="outline" className="text-[10px] bg-background/50 hidden xl:flex gap-1">
            <span>Temp Range:</span>
            <span className="font-mono text-primary">
              {currentMaterial.minTemp}{getTempUnit(tempUnit)} to {currentMaterial.maxTemp}{getTempUnit(tempUnit)}
            </span>
          </Badge>
        )}
      </div>
    </div>
  );
};
