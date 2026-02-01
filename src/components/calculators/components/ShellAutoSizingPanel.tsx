/**
 * Shell Diameter Auto-Sizing Panel
 * Calculates optimal shell diameter based on required heat transfer area and flow constraints
 * References: API 660, TEMA RCB-4, GPSA Engineering Data Book
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Maximize2, 
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Target
} from "lucide-react";
import { standardShellSizes, standardTubeSizes, standardPitches, calculateTubeCount } from "@/lib/temaGeometry";

interface ShellAutoSizingProps {
  requiredArea: number; // m²
  tubeOD: number; // mm
  tubeWall: number; // mm
  tubePitch: number; // mm
  tubePattern: 'triangular' | 'square' | 'rotatedSquare';
  tubePasses: number;
  shellType: 'fixed' | 'floating' | 'u-tube';
  onApplyShellSize: (shellDiameter: number, tubeCount: number, tubeLength: number) => void;
  unitSystem: 'metric' | 'imperial';
}

interface SizingResult {
  shellDiameter: number;
  tubeCount: number;
  tubeLength: number;
  actualArea: number;
  areaMargin: number; // %
  velocityEstimate: {
    tube: number;
    shell: number;
  };
  ldRatio: number;
  isValid: boolean;
  warnings: string[];
}

// Standard tube lengths per API 660
const STANDARD_TUBE_LENGTHS = [2.44, 3.05, 3.66, 4.88, 6.10, 7.32]; // m

// TEMA velocity limits
const VELOCITY_LIMITS = {
  tube: { min: 0.5, max: 4.0, optimal: 1.5 }, // m/s
  shell: { min: 0.3, max: 3.0, optimal: 0.8 }, // m/s
};

// L/D ratio limits
const LD_LIMITS = { min: 3, max: 15, optimal: { min: 6, max: 10 } };

export function ShellAutoSizingPanel({
  requiredArea,
  tubeOD,
  tubeWall,
  tubePitch,
  tubePattern,
  tubePasses,
  shellType,
  onApplyShellSize,
  unitSystem
}: ShellAutoSizingProps) {
  const [targetArea, setTargetArea] = useState(requiredArea.toFixed(1));
  const [designMargin, setDesignMargin] = useState("15"); // % over-design
  const [preferredLength, setPreferredLength] = useState<string>("auto");
  
  // Calculate optimal shell sizes for the target area
  const sizingOptions = useMemo(() => {
    const targetAreaNum = parseFloat(targetArea) || requiredArea;
    const marginFactor = 1 + (parseFloat(designMargin) || 15) / 100;
    const requiredAreaWithMargin = targetAreaNum * marginFactor;
    
    const results: SizingResult[] = [];
    
    // Try each standard tube length
    const lengthsToTry = preferredLength === 'auto' 
      ? STANDARD_TUBE_LENGTHS 
      : [parseFloat(preferredLength)];
    
    for (const tubeLength of lengthsToTry) {
      // Calculate tubes needed for this length
      const tubeODm = tubeOD / 1000;
      const areaPerTube = Math.PI * tubeODm * tubeLength;
      const tubesNeeded = Math.ceil(requiredAreaWithMargin / areaPerTube);
      
      // Find smallest shell that fits this many tubes
      for (const shellDia of standardShellSizes) {
        const tubeCountResult = calculateTubeCount(
          shellDia, tubeOD, tubePitch, tubePattern, tubePasses, shellType
        );
        
        if (tubeCountResult.count >= tubesNeeded) {
          const actualArea = tubeCountResult.count * areaPerTube;
          const areaMargin = ((actualArea / targetAreaNum) - 1) * 100;
          const ldRatio = (tubeLength * 1000) / shellDia;
          
          const warnings: string[] = [];
          let isValid = true;
          
          // Check L/D ratio
          if (ldRatio < LD_LIMITS.min) {
            warnings.push(`L/D ratio ${ldRatio.toFixed(1)} below minimum (${LD_LIMITS.min})`);
            isValid = false;
          } else if (ldRatio > LD_LIMITS.max) {
            warnings.push(`L/D ratio ${ldRatio.toFixed(1)} above maximum (${LD_LIMITS.max})`);
            isValid = false;
          } else if (ldRatio < LD_LIMITS.optimal.min || ldRatio > LD_LIMITS.optimal.max) {
            warnings.push(`L/D ratio ${ldRatio.toFixed(1)} outside optimal range (${LD_LIMITS.optimal.min}-${LD_LIMITS.optimal.max})`);
          }
          
          // Check for excessive over-design
          if (areaMargin > 50) {
            warnings.push(`Area margin ${areaMargin.toFixed(0)}% may be excessive`);
          }
          
          results.push({
            shellDiameter: shellDia,
            tubeCount: tubeCountResult.count,
            tubeLength,
            actualArea,
            areaMargin,
            velocityEstimate: { tube: 0, shell: 0 }, // Would need flow data
            ldRatio,
            isValid,
            warnings
          });
          
          // Only add the first (smallest) valid shell for this length
          break;
        }
      }
    }
    
    // Sort by shell diameter (smaller first) and filter to best options
    return results
      .filter(r => r.isValid)
      .sort((a, b) => {
        // Prefer designs with L/D in optimal range
        const aOptimal = a.ldRatio >= LD_LIMITS.optimal.min && a.ldRatio <= LD_LIMITS.optimal.max;
        const bOptimal = b.ldRatio >= LD_LIMITS.optimal.min && b.ldRatio <= LD_LIMITS.optimal.max;
        if (aOptimal && !bOptimal) return -1;
        if (!aOptimal && bOptimal) return 1;
        // Then by shell diameter
        return a.shellDiameter - b.shellDiameter;
      })
      .slice(0, 4); // Top 4 options
  }, [targetArea, designMargin, preferredLength, requiredArea, tubeOD, tubePitch, tubePattern, tubePasses, shellType]);

  const lengthUnit = unitSystem === 'metric' ? 'mm' : 'in';
  const lengthLongUnit = unitSystem === 'metric' ? 'm' : 'ft';
  const areaUnit = unitSystem === 'metric' ? 'm²' : 'ft²';
  
  const toDisplayShort = (val: number) => unitSystem === 'metric' ? val : val / 25.4;
  const toDisplayLong = (val: number) => unitSystem === 'metric' ? val : val * 3.281;
  const toDisplayArea = (val: number) => unitSystem === 'metric' ? val : val * 10.764;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Shell Auto-Sizing
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">Calculates optimal shell diameter based on required area, applying TEMA tube count tables and L/D ratio guidelines per API 660.</p>
            </TooltipContent>
          </Tooltip>
          <Badge variant="secondary" className="ml-auto text-xs">API 660 / TEMA</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Area ({areaUnit})</Label>
            <Input
              type="number"
              value={unitSystem === 'metric' ? targetArea : (parseFloat(targetArea) * 10.764).toFixed(1)}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setTargetArea(unitSystem === 'metric' ? e.target.value : (val / 10.764).toFixed(1));
              }}
              className="h-8 text-sm no-spinner"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Design Margin (%)</Label>
            <Select value={designMargin} onValueChange={setDesignMargin}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10% (Minimum)</SelectItem>
                <SelectItem value="15">15% (Standard)</SelectItem>
                <SelectItem value="20">20% (Fouling Service)</SelectItem>
                <SelectItem value="25">25% (Severe Service)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tube Length</Label>
            <Select value={preferredLength} onValueChange={setPreferredLength}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Best Fit)</SelectItem>
                {STANDARD_TUBE_LENGTHS.map(len => (
                  <SelectItem key={len} value={len.toString()}>
                    {toDisplayLong(len).toFixed(1)} {lengthLongUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Separator />
        
        {/* Results Section */}
        {sizingOptions.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            No valid configurations found. Try increasing target area or adjusting constraints.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Recommended Configurations:</div>
            {sizingOptions.map((option, idx) => (
              <div 
                key={`${option.shellDiameter}-${option.tubeLength}`}
                className={`p-3 rounded-lg border ${
                  idx === 0 ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Badge variant="default" className="text-xs">Recommended</Badge>}
                    <span className="font-medium text-sm">
                      {toDisplayShort(option.shellDiameter).toFixed(0)} {lengthUnit} Shell
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant={idx === 0 ? "default" : "outline"}
                    className="h-6 text-xs px-2"
                    onClick={() => onApplyShellSize(option.shellDiameter, option.tubeCount, option.tubeLength)}
                  >
                    Apply <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground/70">Tubes</span>
                    <span className="font-mono font-medium">{option.tubeCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground/70">Length</span>
                    <span className="font-mono">{toDisplayLong(option.tubeLength).toFixed(1)} {lengthLongUnit}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground/70">Area</span>
                    <span className="font-mono">{toDisplayArea(option.actualArea).toFixed(1)} {areaUnit}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground/70">L/D</span>
                    <span className={`font-mono ${
                      option.ldRatio >= LD_LIMITS.optimal.min && option.ldRatio <= LD_LIMITS.optimal.max
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}>
                      {option.ldRatio.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Badge variant="outline" className={`${
                    option.areaMargin >= 10 && option.areaMargin <= 30
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    +{option.areaMargin.toFixed(0)}% margin
                  </Badge>
                  {option.warnings.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-amber-400 cursor-help">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{option.warnings.length} warning(s)</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <ul className="text-xs list-disc list-inside">
                          {option.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Reference */}
        <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground flex justify-between">
          <span>L/D optimal range: {LD_LIMITS.optimal.min}-{LD_LIMITS.optimal.max}</span>
          <span>Ref: API 660 §7, TEMA RCB-4</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default ShellAutoSizingPanel;
