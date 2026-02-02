/**
 * Shell Diameter Auto-Sizing Panel
 * Enhanced version with improved UI/UX and calculation accuracy
 * 
 * @api API 660 §7, TEMA RCB-4
 * @reference GPSA Engineering Data Book Chapter 9
 * @validation L/D ratio 6-10 optimal per API 660
 */

import { useState, useMemo, forwardRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Info,
  AlertTriangle,
  ArrowRight,
  Target,
  Sparkles,
  CheckCircle2,
  Star,
  TrendingUp,
  Ruler,
  Circle,
  Layers
} from "lucide-react";
import { standardShellSizes, calculateTubeCount } from "@/lib/temaGeometry";

interface ShellAutoSizingProps {
  requiredArea: number; // m² - calculated from heat duty
  heatDuty?: number; // kW - for display and validation
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
  ldRatio: number;
  isOptimal: boolean;
  isValid: boolean;
  score: number; // 0-100 ranking score
  warnings: string[];
  // Additional metrics for better decision making
  estimatedWeight: number; // kg - rough estimate for economic comparison
  baffleSpacing: number; // mm - auto-calculated
}

// Standard tube lengths per API 660 (in m)
const STANDARD_TUBE_LENGTHS = [2.44, 3.05, 3.66, 4.88, 6.10, 7.32];

// L/D ratio limits per API 660 §7
const LD_LIMITS = { min: 3, max: 15, optimal: { min: 6, max: 10 } };

// Design margin presets with engineering context
const MARGIN_PRESETS = [
  { value: "10", label: "10% Minimum", description: "Clean service, well-defined duty" },
  { value: "15", label: "15% Standard", description: "Normal fouling, typical design" },
  { value: "20", label: "20% Fouling", description: "Moderate fouling expected" },
  { value: "25", label: "25% Severe", description: "Heavy fouling, uncertain duty" },
  { value: "30", label: "30% Critical", description: "Corrosive/scaling service" },
];

/**
 * Calculate a ranking score for each configuration (0-100)
 * Higher is better. Considers: L/D ratio, area margin, economics, practicality
 * 
 * @api API 660 §7 - L/D optimization
 * @reference GPSA Engineering Data Book Ch. 9
 */
function calculateScore(result: SizingResult, targetArea: number): number {
  let score = 100;
  
  // L/D ratio scoring (0-30 points possible deduction)
  // Optimal is 6-10 per API 660
  if (result.ldRatio >= LD_LIMITS.optimal.min && result.ldRatio <= LD_LIMITS.optimal.max) {
    // Perfect L/D range
    score -= 0;
  } else if (result.ldRatio >= LD_LIMITS.min && result.ldRatio <= LD_LIMITS.max) {
    // Acceptable but not optimal
    const deviation = result.ldRatio < LD_LIMITS.optimal.min 
      ? LD_LIMITS.optimal.min - result.ldRatio
      : result.ldRatio - LD_LIMITS.optimal.max;
    score -= deviation * 5; // 5 points per unit deviation
  } else {
    // Out of acceptable range
    score -= 30;
  }
  
  // Area margin scoring (0-25 points possible deduction)
  // Ideal margin is 15-25% per industry practice
  if (result.areaMargin >= 15 && result.areaMargin <= 25) {
    score -= 0;
  } else if (result.areaMargin >= 10 && result.areaMargin <= 35) {
    // Acceptable range
    const optimalMid = 20;
    score -= Math.abs(result.areaMargin - optimalMid) * 0.8;
  } else if (result.areaMargin >= 5 && result.areaMargin <= 50) {
    score -= 15;
  } else {
    score -= 25;
  }
  
  // Economic factor: prefer smaller shells (0-15 points)
  // Shell cost scales roughly with D^2
  const shellCostFactor = (result.shellDiameter / 1000) ** 2; // normalized
  score -= Math.min(15, shellCostFactor * 5);
  
  // Tube length preference: 3-6m is most practical (0-10 points)
  if (result.tubeLength >= 3 && result.tubeLength <= 6) {
    score += 5; // Bonus for practical length
  } else if (result.tubeLength < 2.5 || result.tubeLength > 7) {
    score -= 5; // Penalty for extreme lengths
  }
  
  // Number of tubes penalty for very high counts (maintenance difficulty)
  if (result.tubeCount > 1000) {
    score -= (result.tubeCount - 1000) / 200;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Shell Auto-Sizing Panel Component
 * @api API 660, TEMA RCB-4
 */
export const ShellAutoSizingPanel = forwardRef<HTMLDivElement, ShellAutoSizingProps>(
  function ShellAutoSizingPanel({
    requiredArea,
    heatDuty,
    tubeOD,
    tubeWall,
    tubePitch,
    tubePattern,
    tubePasses,
    shellType,
    onApplyShellSize,
    unitSystem
  }, ref) {
  // Auto-sync target area with calculated required area when it changes significantly
  const [targetArea, setTargetArea] = useState(requiredArea > 0 ? requiredArea.toFixed(1) : "50");
  const [designMargin, setDesignMargin] = useState("15");
  const [preferredLength, setPreferredLength] = useState<string>("auto");
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const [hasUserModifiedArea, setHasUserModifiedArea] = useState(false);
  
  // Sync target area with calculated required area if user hasn't modified it
  useMemo(() => {
    if (!hasUserModifiedArea && requiredArea > 0) {
      const currentTarget = parseFloat(targetArea);
      // Only auto-update if difference is more than 10%
      if (isNaN(currentTarget) || Math.abs(requiredArea - currentTarget) / currentTarget > 0.1) {
        setTargetArea(requiredArea.toFixed(1));
      }
    }
  }, [requiredArea, hasUserModifiedArea]);
  
  // Calculate optimal shell sizes for the target area
  const sizingOptions = useMemo(() => {
    const targetAreaNum = parseFloat(targetArea) || 50;
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
          
          // Auto-calculate baffle spacing (30% of shell ID per TEMA)
          const baffleSpacing = Math.round(shellDia * 0.3);
          
          // Rough weight estimate for economic comparison (steel shell + tubes)
          const shellWeight = Math.PI * shellDia / 1000 * tubeLength * 10 * 7850 / 1000; // ~10mm wall
          const tubeWeight = tubeCountResult.count * Math.PI * ((tubeOD/1000)**2 - ((tubeOD - 2*tubeWall)/1000)**2) / 4 * tubeLength * 7850;
          const estimatedWeight = shellWeight + tubeWeight;
          
          const warnings: string[] = [];
          let isValid = true;
          let isOptimal = true;
          
          // Check L/D ratio
          if (ldRatio < LD_LIMITS.min) {
            warnings.push(`L/D ${ldRatio.toFixed(1)} below min (${LD_LIMITS.min})`);
            isValid = false;
            isOptimal = false;
          } else if (ldRatio > LD_LIMITS.max) {
            warnings.push(`L/D ${ldRatio.toFixed(1)} above max (${LD_LIMITS.max})`);
            isValid = false;
            isOptimal = false;
          } else if (ldRatio < LD_LIMITS.optimal.min || ldRatio > LD_LIMITS.optimal.max) {
            warnings.push(`L/D outside optimal (${LD_LIMITS.optimal.min}-${LD_LIMITS.optimal.max})`);
            isOptimal = false;
          }
          
          // Check for excessive over-design
          if (areaMargin > 50) {
            warnings.push(`Excessive margin (${areaMargin.toFixed(0)}%)`);
            isOptimal = false;
          }
          
          // Check for under-design
          if (areaMargin < 5) {
            warnings.push(`Insufficient margin (${areaMargin.toFixed(0)}%)`);
            isOptimal = false;
          }
          
          const result: SizingResult = {
            shellDiameter: shellDia,
            tubeCount: tubeCountResult.count,
            tubeLength,
            actualArea,
            areaMargin,
            ldRatio,
            isOptimal,
            isValid,
            score: 0,
            warnings,
            estimatedWeight,
            baffleSpacing
          };
          
          result.score = calculateScore(result, targetAreaNum);
          results.push(result);
          
          // Only add the first (smallest) shell for this length
          break;
        }
      }
    }
    
    // Sort by score (highest first) and return top options
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [targetArea, designMargin, preferredLength, tubeOD, tubePitch, tubePattern, tubePasses, shellType]);

  // Unit conversions
  const lengthUnit = unitSystem === 'metric' ? 'mm' : 'in';
  const lengthLongUnit = unitSystem === 'metric' ? 'm' : 'ft';
  const areaUnit = unitSystem === 'metric' ? 'm²' : 'ft²';
  
  const toDisplayShort = useCallback((val: number) => 
    unitSystem === 'metric' ? val : val / 25.4, [unitSystem]);
  const toDisplayLong = useCallback((val: number) => 
    unitSystem === 'metric' ? val : val * 3.281, [unitSystem]);
  const toDisplayArea = useCallback((val: number) => 
    unitSystem === 'metric' ? val : val * 10.764, [unitSystem]);

  // Get badge variant based on margin
  const getMarginBadge = (margin: number) => {
    if (margin >= 10 && margin <= 30) {
      return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: CheckCircle2 };
    } else if (margin >= 5 && margin <= 50) {
      return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: AlertTriangle };
    }
    return { color: 'bg-red-500/20 text-red-400 border-red-500/40', icon: AlertTriangle };
  };

  // Get L/D color
  const getLDColor = (ld: number) => {
    if (ld >= LD_LIMITS.optimal.min && ld <= LD_LIMITS.optimal.max) {
      return 'text-emerald-400';
    } else if (ld >= LD_LIMITS.min && ld <= LD_LIMITS.max) {
      return 'text-amber-400';
    }
    return 'text-red-400';
  };

  return (
    <Card ref={ref} className="border-border/50 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">Shell Auto-Sizing</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help hover:text-muted-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-popover/95 backdrop-blur-sm">
                <p className="text-xs">Calculates optimal shell diameter using TEMA tube count tables and L/D guidelines per API 660 §7.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-0">
            API 660 / TEMA
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Input Section - Enhanced */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Target Area ({areaUnit})
            </Label>
            <Input
              type="number"
              value={unitSystem === 'metric' ? targetArea : (parseFloat(targetArea) * 10.764).toFixed(1)}
              onChange={e => {
                const val = parseFloat(e.target.value);
                setTargetArea(unitSystem === 'metric' ? e.target.value : (val / 10.764).toFixed(1));
                setHasUserModifiedArea(true);
              }}
              className="h-9 text-sm no-spinner bg-background/50 focus:bg-background transition-colors"
            />
            {/* Sync button */}
            {hasUserModifiedArea && requiredArea > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-1.5 mt-1"
                onClick={() => {
                  setTargetArea(requiredArea.toFixed(1));
                  setHasUserModifiedArea(false);
                }}
              >
                Sync from calculation
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Design Margin (%)
            </Label>
            <Select value={designMargin} onValueChange={setDesignMargin}>
              <SelectTrigger className="h-9 text-sm bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 backdrop-blur-sm">
                {MARGIN_PRESETS.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    <div className="flex flex-col">
                      <span>{preset.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              Tube Length
            </Label>
            <Select value={preferredLength} onValueChange={setPreferredLength}>
              <SelectTrigger className="h-9 text-sm bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 backdrop-blur-sm">
                <SelectItem value="auto">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Auto (Best Fit)
                  </div>
                </SelectItem>
                {STANDARD_TUBE_LENGTHS.map(len => (
                  <SelectItem key={len} value={len.toString()}>
                    {toDisplayLong(len).toFixed(1)} {lengthLongUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Separator className="bg-border/30" />
        
        {/* Results Section - Enhanced */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Recommended Configurations:</span>
            <span className="text-xs text-muted-foreground/70">{sizingOptions.length} options</span>
          </div>
          
          {sizingOptions.length === 0 ? (
            <div className="text-center py-8 rounded-lg bg-muted/30 border border-dashed border-border">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500/70" />
              <p className="text-sm font-medium text-muted-foreground">No valid configurations found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Try increasing target area or adjusting constraints</p>
            </div>
          ) : (
            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-2.5">
                {sizingOptions.map((option, idx) => {
                  const marginBadge = getMarginBadge(option.areaMargin);
                  const MarginIcon = marginBadge.icon;
                  const isHovered = hoveredOption === idx;
                  const isTop = idx === 0;
                  
                  return (
                    <div 
                      key={`${option.shellDiameter}-${option.tubeLength}`}
                      className={`p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer
                        ${isTop 
                          ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10' 
                          : isHovered 
                            ? 'border-border bg-muted/50 shadow-md'
                            : 'border-border/30 bg-muted/20 hover:border-border/50'
                        }`}
                      onMouseEnter={() => setHoveredOption(idx)}
                      onMouseLeave={() => setHoveredOption(null)}
                      onClick={() => onApplyShellSize(option.shellDiameter, option.tubeCount, option.tubeLength)}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isTop && (
                            <Badge className="text-xs font-medium bg-primary text-primary-foreground border-0 gap-1">
                              <Star className="h-3 w-3" />
                              Recommended
                            </Badge>
                          )}
                          <span className={`font-semibold ${isTop ? 'text-base' : 'text-sm'}`}>
                            {toDisplayShort(option.shellDiameter).toFixed(0)} {lengthUnit} Shell
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isTop ? "default" : "outline"}
                          className={`h-7 text-xs px-3 transition-all
                            ${isTop ? 'shadow-md' : ''} 
                            ${isHovered ? 'scale-105' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplyShellSize(option.shellDiameter, option.tubeCount, option.tubeLength);
                          }}
                        >
                          Apply <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                      
                      {/* Metrics Grid */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <span className="text-xs text-muted-foreground/70 block">Tubes</span>
                          <span className="font-mono font-bold text-sm">{option.tubeCount}</span>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <span className="text-xs text-muted-foreground/70 block">Length</span>
                          <span className="font-mono text-sm">
                            {toDisplayLong(option.tubeLength).toFixed(1)} 
                            <span className="text-muted-foreground ml-0.5">{lengthLongUnit}</span>
                          </span>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 text-center">
                          <span className="text-xs text-muted-foreground/70 block">Area</span>
                          <span className="font-mono text-sm">
                            {toDisplayArea(option.actualArea).toFixed(1)}
                            <span className="text-muted-foreground ml-0.5">{areaUnit}</span>
                          </span>
                        </div>
                        <div className={`rounded-lg p-2 text-center ${
                          option.isOptimal ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                        }`}>
                          <span className="text-xs text-muted-foreground/70 block">L/D</span>
                          <span className={`font-mono font-bold text-sm ${getLDColor(option.ldRatio)}`}>
                            {option.ldRatio.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Footer with margin and warnings */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs border ${marginBadge.color} gap-1`}>
                            <MarginIcon className="h-3 w-3" />
                            +{option.areaMargin.toFixed(0)}% margin
                          </Badge>
                          
                          {option.warnings.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-amber-400 cursor-help text-xs">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span>{option.warnings.length} warning(s)</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-popover/95 backdrop-blur-sm">
                                <ul className="text-xs space-y-1">
                                  {option.warnings.map((w, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                                      {w}
                                    </li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        
                        {/* Score indicator */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                option.score >= 80 ? 'bg-emerald-500' :
                                option.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${option.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {/* Reference Footer */}
        <div className="pt-3 border-t border-border/30 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
            <span>L/D optimal: {LD_LIMITS.optimal.min}-{LD_LIMITS.optimal.max}</span>
          </div>
          <span className="text-xs text-muted-foreground/70">Ref: API 660 §7, TEMA RCB-4</span>
        </div>
      </CardContent>
    </Card>
  );
});

export default ShellAutoSizingPanel;
