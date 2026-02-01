/**
 * Shell & Tube Geometry Summary Panel
 * Displays TEMA-compliant geometry overview with visual indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Grid3X3, 
  Circle, 
  Ruler, 
  ArrowLeftRight, 
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react";

interface GeometrySummaryProps {
  // Tube geometry
  tubeOD: number;        // mm
  tubeID: number;        // mm
  tubeLength: number;    // m
  tubePitch: number;     // mm
  tubePattern: 'triangular' | 'square' | 'rotatedSquare';
  numberOfTubes: number;
  tubePasses: number;
  tubeMaterial: string;
  
  // Shell geometry
  shellDiameter: number; // mm
  shellType: string;
  
  // Baffle geometry
  baffleSpacing: number; // mm
  baffleCut: number;     // %
  numberOfBaffles: number;
  
  // Calculated values
  heatTransferArea: number; // m²
  bundleDiameter?: number;  // mm
  
  // Unit system
  unitSystem: 'metric' | 'imperial';
}

// TEMA validation limits
const TEMA_LIMITS = {
  pitchRatioMin: 1.25,
  pitchRatioMax: 1.5,
  baffleCutMin: 15, // %
  baffleCutMax: 45, // %
  baffleSpacingMinRatio: 0.2, // of shell diameter
  baffleSpacingMaxRatio: 1.0, // of shell diameter
  ldRatioMin: 3,
  ldRatioMax: 15,
};

function StatusBadge({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  if (status === 'pass') {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        OK
      </Badge>
    );
  }
  if (status === 'warn') {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Check
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
      <XCircle className="w-3 h-3 mr-1" />
      Fail
    </Badge>
  );
}

export function GeometrySummaryPanel({
  tubeOD,
  tubeID,
  tubeLength,
  tubePitch,
  tubePattern,
  numberOfTubes,
  tubePasses,
  tubeMaterial,
  shellDiameter,
  shellType,
  baffleSpacing,
  baffleCut,
  numberOfBaffles,
  heatTransferArea,
  bundleDiameter,
  unitSystem
}: GeometrySummaryProps) {
  
  // Calculated metrics
  const pitchRatio = tubePitch / tubeOD;
  const ldRatio = (tubeLength * 1000) / shellDiameter;
  const baffleSpacingRatio = baffleSpacing / shellDiameter;
  const tubeWall = (tubeOD - tubeID) / 2;
  const effectiveBundleDia = bundleDiameter || (shellDiameter - 25);
  const clearance = shellDiameter - effectiveBundleDia;
  
  // Pattern display
  const patternLabels: Record<string, string> = {
    triangular: '30° Triangular',
    square: '90° Square',
    rotatedSquare: '45° Rotated Square'
  };
  
  // TEMA compliance checks
  const pitchStatus: 'pass' | 'warn' | 'fail' = 
    pitchRatio < TEMA_LIMITS.pitchRatioMin ? 'fail' :
    pitchRatio > TEMA_LIMITS.pitchRatioMax ? 'warn' : 'pass';
    
  const baffleCutStatus: 'pass' | 'warn' | 'fail' =
    baffleCut < TEMA_LIMITS.baffleCutMin || baffleCut > TEMA_LIMITS.baffleCutMax ? 'fail' : 'pass';
    
  const baffleSpacingStatus: 'pass' | 'warn' | 'fail' =
    baffleSpacingRatio < TEMA_LIMITS.baffleSpacingMinRatio ? 'fail' :
    baffleSpacingRatio > TEMA_LIMITS.baffleSpacingMaxRatio ? 'warn' : 'pass';
    
  const ldStatus: 'pass' | 'warn' | 'fail' =
    ldRatio < TEMA_LIMITS.ldRatioMin ? 'warn' :
    ldRatio > TEMA_LIMITS.ldRatioMax ? 'warn' : 'pass';
  
  // Unit conversions for display
  const lengthUnit = unitSystem === 'metric' ? 'mm' : 'in';
  const lengthLongUnit = unitSystem === 'metric' ? 'm' : 'ft';
  const areaUnit = unitSystem === 'metric' ? 'm²' : 'ft²';
  
  const toDisplay = (val: number) => unitSystem === 'metric' ? val : val / 25.4;
  const toDisplayLong = (val: number) => unitSystem === 'metric' ? val : val * 3.281;
  const toDisplayArea = (val: number) => unitSystem === 'metric' ? val : val * 10.764;
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-primary" />
          Shell & Tube Geometry Summary
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">TEMA RCB-4 compliant geometry summary with validation against industry limits.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shell Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Shell</div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Diameter</span>
              <span className="font-mono text-sm">{toDisplay(shellDiameter).toFixed(1)} {lengthUnit}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Type</span>
              <Badge variant="secondary" className="text-xs">{shellType}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">L/D Ratio</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{ldRatio.toFixed(1)}</span>
                <StatusBadge status={ldStatus} />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Bundle</div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Diameter</span>
              <span className="font-mono text-sm">{toDisplay(effectiveBundleDia).toFixed(1)} {lengthUnit}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Clearance</span>
              <span className="font-mono text-sm">{toDisplay(clearance).toFixed(1)} {lengthUnit}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Area</span>
              <span className="font-mono text-sm font-medium text-primary">{toDisplayArea(heatTransferArea).toFixed(1)} {areaUnit}</span>
            </div>
          </div>
        </div>
        
        <Separator className="my-3" />
        
        {/* Tube Layout */}
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tube Layout</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <Circle className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <div className="text-lg font-bold">{numberOfTubes}</div>
              <div className="text-xs text-muted-foreground">Tubes</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <ArrowLeftRight className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <div className="text-lg font-bold">{tubePasses}</div>
              <div className="text-xs text-muted-foreground">Passes</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <Ruler className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <div className="text-lg font-bold">{toDisplayLong(tubeLength).toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Length ({lengthLongUnit})</div>
            </div>
          </div>
          
          {/* Tube Details Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">OD × Wall</span>
              <span className="font-mono">{toDisplay(tubeOD).toFixed(2)} × {toDisplay(tubeWall).toFixed(2)} {lengthUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono">{toDisplay(tubeID).toFixed(2)} {lengthUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pitch</span>
              <span className="font-mono">{toDisplay(tubePitch).toFixed(2)} {lengthUnit}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pitch Ratio</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{pitchRatio.toFixed(2)}</span>
                <StatusBadge status={pitchStatus} />
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pattern</span>
              <Badge variant="outline" className="text-xs">{patternLabels[tubePattern]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Material</span>
              <span className="text-xs">{tubeMaterial}</span>
            </div>
          </div>
        </div>
        
        <Separator className="my-3" />
        
        {/* Baffle Configuration */}
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Baffle Configuration</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Number</span>
              <span className="font-bold">{numberOfBaffles}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Spacing</span>
              <div className="flex items-center gap-1">
                <span className="font-mono">{toDisplay(baffleSpacing).toFixed(0)} {lengthUnit}</span>
                <StatusBadge status={baffleSpacingStatus} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Cut</span>
              <div className="flex items-center gap-1">
                <span className="font-mono">{baffleCut.toFixed(0)}%</span>
                <StatusBadge status={baffleCutStatus} />
              </div>
            </div>
          </div>
          
          {/* Baffle cut visualization */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Baffle Cut Range (TEMA)</span>
              <span>{TEMA_LIMITS.baffleCutMin}% - {TEMA_LIMITS.baffleCutMax}%</span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-emerald-500/30" 
                style={{ 
                  left: `${TEMA_LIMITS.baffleCutMin}%`, 
                  width: `${TEMA_LIMITS.baffleCutMax - TEMA_LIMITS.baffleCutMin}%` 
                }}
              />
              <div 
                className={`absolute w-2 h-2 rounded-full top-0 ${
                  baffleCutStatus === 'pass' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ left: `calc(${Math.min(Math.max(baffleCut, 0), 100)}% - 4px)` }}
              />
            </div>
          </div>
        </div>
        
        {/* TEMA Reference */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Reference: TEMA RCB-4.2, RGP-4.9</span>
            <Badge variant="outline" className="text-xs">10th Edition</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GeometrySummaryPanel;
