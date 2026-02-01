/**
 * Tube Count Comparison Panel
 * Enhanced version with improved visuals and calculations
 * 
 * @api TEMA RCB-4, API 660 §5.6
 * @reference Palen Correlation for non-standard geometries
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { 
  GitCompare, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ArrowRight,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Zap
} from "lucide-react";

interface TubeCountComparisonProps {
  userTubeCount: number;
  temaCalculatedCount: number;
  calculationMethod: string;
  shellDiameter: number; // mm
  tubeOD: number; // mm
  tubePitch: number; // mm
  tubePattern: string;
  tubePasses: number;
  onApplyTema: () => void;
  unitSystem: 'metric' | 'imperial';
}

interface ComparisonStatus {
  status: 'match' | 'under' | 'over' | 'critical-under' | 'critical-over';
  percent: number;
  message: string;
  recommendation?: string;
}

/**
 * Enhanced comparison logic with more detailed feedback
 */
function getComparisonStatus(userCount: number, temaCount: number): ComparisonStatus {
  if (temaCount === 0 || isNaN(temaCount)) {
    return { 
      status: 'critical-under', 
      percent: 0, 
      message: 'Cannot calculate TEMA tube count',
      recommendation: 'Check geometry parameters'
    };
  }
  
  const diff = userCount - temaCount;
  const percentDiff = (diff / temaCount) * 100;
  
  if (Math.abs(percentDiff) <= 2) {
    return { 
      status: 'match', 
      percent: percentDiff, 
      message: 'User count matches TEMA recommendation (within ±2%)',
      recommendation: 'Optimal configuration'
    };
  } else if (percentDiff < -15) {
    return { 
      status: 'critical-under', 
      percent: percentDiff, 
      message: `Significantly below TEMA (${Math.abs(percentDiff).toFixed(0)}% under)`,
      recommendation: 'Consider smaller shell or verify intentional under-tubing'
    };
  } else if (percentDiff < 0) {
    return { 
      status: 'under', 
      percent: percentDiff, 
      message: `Below TEMA standard by ${Math.abs(percentDiff).toFixed(1)}%`,
      recommendation: 'May be intentional for maintenance access or anti-vibration'
    };
  } else if (percentDiff > 15) {
    return { 
      status: 'critical-over', 
      percent: percentDiff, 
      message: `Exceeds TEMA maximum by ${percentDiff.toFixed(0)}%`,
      recommendation: 'Tubes may not physically fit in shell!'
    };
  } else {
    return { 
      status: 'over', 
      percent: percentDiff, 
      message: `Above TEMA by ${percentDiff.toFixed(1)}%`,
      recommendation: 'Verify bundle fits within shell clearances'
    };
  }
}

/**
 * Calculate packing efficiency and geometry metrics
 */
function calculateGeometryMetrics(
  userCount: number,
  shellDiameter: number,
  tubeOD: number,
  tubePitch: number,
  tubePattern: string
) {
  // Shell cross-sectional area
  const shellArea = Math.PI * Math.pow(shellDiameter / 2, 2);
  
  // Theoretical tube pitch area
  const pitchArea = tubePattern === 'triangular' 
    ? (Math.sqrt(3) / 4) * Math.pow(tubePitch, 2)
    : Math.pow(tubePitch, 2);
  
  // Packing efficiency
  const theoreticalPacking = (Math.PI * Math.pow(tubeOD / 2, 2)) / pitchArea;
  const actualPacking = (userCount * Math.PI * Math.pow(tubeOD / 2, 2)) / shellArea;
  
  // Pitch ratio
  const pitchRatio = tubePitch / tubeOD;
  
  return {
    shellArea,
    pitchArea,
    theoreticalPacking: theoreticalPacking * 100,
    actualPacking: actualPacking * 100,
    pitchRatio,
    isPitchOptimal: pitchRatio >= 1.25 && pitchRatio <= 1.5
  };
}

export function TubeCountComparisonPanel({
  userTubeCount,
  temaCalculatedCount,
  calculationMethod,
  shellDiameter,
  tubeOD,
  tubePitch,
  tubePattern,
  tubePasses,
  onApplyTema,
  unitSystem
}: TubeCountComparisonProps) {
  const comparison = getComparisonStatus(userTubeCount, temaCalculatedCount);
  const diff = userTubeCount - temaCalculatedCount;
  
  const metrics = useMemo(() => 
    calculateGeometryMetrics(userTubeCount, shellDiameter, tubeOD, tubePitch, tubePattern),
    [userTubeCount, shellDiameter, tubeOD, tubePitch, tubePattern]
  );
  
  const getStatusConfig = () => {
    switch (comparison.status) {
      case 'match':
        return {
          icon: <CheckCircle2 className="h-6 w-6" />,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/40',
          glowColor: 'shadow-emerald-500/20'
        };
      case 'under':
        return {
          icon: <TrendingDown className="h-6 w-6" />,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/40',
          glowColor: 'shadow-amber-500/20'
        };
      case 'over':
        return {
          icon: <TrendingUp className="h-6 w-6" />,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/40',
          glowColor: 'shadow-amber-500/20'
        };
      case 'critical-under':
      case 'critical-over':
        return {
          icon: <XCircle className="h-6 w-6" />,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/40',
          glowColor: 'shadow-red-500/20'
        };
    }
  };
  
  const statusConfig = getStatusConfig();
  const lengthUnit = unitSystem === 'metric' ? 'mm' : 'in';
  const toDisplay = (val: number) => unitSystem === 'metric' ? val : val / 25.4;

  // Calculate position on deviation bar (clamped to -25% to +25%)
  const clampedPercent = Math.min(Math.max(comparison.percent, -25), 25);
  const barPosition = ((clampedPercent + 25) / 50) * 100;

  return (
    <Card className={`border-2 transition-all duration-300 ${statusConfig.borderColor} ${statusConfig.bgColor} shadow-lg ${statusConfig.glowColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${statusConfig.bgColor}`}>
              <GitCompare className={`h-4 w-4 ${statusConfig.color}`} />
            </div>
            <span className="font-semibold">Tube Count Comparison</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help hover:text-muted-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-popover/95 backdrop-blur-sm">
                <p className="text-xs">Compares user-entered tube count against TEMA standard tables or Palen correlation.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="outline" className="text-xs font-normal bg-background/50">
            {calculationMethod}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Main Comparison Display - Enhanced */}
        <div className="flex items-center justify-center gap-6 py-4">
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold tracking-tight transition-transform group-hover:scale-105">
              {userTubeCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">User Count</div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className={`p-2 rounded-full ${statusConfig.bgColor} transition-transform hover:scale-110`}>
              <span className={statusConfig.color}>{statusConfig.icon}</span>
            </div>
            <div className="flex items-center gap-1 min-w-[60px] justify-center">
              {diff > 0 && (
                <span className={`text-sm font-bold ${statusConfig.color}`}>+{diff}</span>
              )}
              {diff < 0 && (
                <span className={`text-sm font-bold ${statusConfig.color}`}>{diff}</span>
              )}
              {diff === 0 && (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">Match</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold tracking-tight text-primary transition-transform group-hover:scale-105">
              {temaCalculatedCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">TEMA Count</div>
          </div>
        </div>
        
        {/* Enhanced Deviation Bar */}
        <div className="space-y-2 px-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Deviation from TEMA</span>
            <span className={`font-mono font-semibold ${statusConfig.color}`}>
              {comparison.percent > 0 ? '+' : ''}{comparison.percent.toFixed(1)}%
            </span>
          </div>
          
          <div className="relative h-3 bg-muted/50 rounded-full overflow-visible">
            {/* Gradient background */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 via-emerald-500/20 to-red-500/20" />
            
            {/* Optimal zone (±2%) */}
            <div 
              className="absolute h-full bg-emerald-500/30 rounded"
              style={{ left: '46%', width: '8%' }}
            />
            
            {/* Warning zones */}
            <div 
              className="absolute h-full bg-amber-500/20"
              style={{ left: '20%', width: '26%' }}
            />
            <div 
              className="absolute h-full bg-amber-500/20"
              style={{ left: '54%', width: '26%' }}
            />
            
            {/* Center line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border/50 -translate-x-1/2" />
            
            {/* Position indicator with glow */}
            <div 
              className={`absolute w-4 h-4 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 
                transition-all duration-500 ease-out
                ${comparison.status === 'match' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 
                  comparison.status.includes('critical') ? 'bg-red-500 shadow-lg shadow-red-500/50' : 
                  'bg-amber-500 shadow-lg shadow-amber-500/50'}`}
              style={{ left: `${barPosition}%` }}
            >
              <div className={`absolute inset-0 rounded-full animate-ping opacity-30
                ${comparison.status === 'match' ? 'bg-emerald-500' : 
                  comparison.status.includes('critical') ? 'bg-red-500' : 'bg-amber-500'}`} 
              />
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground/70">
            <span>-20%</span>
            <span className="font-medium">TEMA</span>
            <span>+20%</span>
          </div>
        </div>
        
        {/* Status Message Card */}
        <div className={`p-3 rounded-lg ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
          <p className={`text-xs font-medium ${statusConfig.color}`}>
            {comparison.message}
          </p>
          {comparison.recommendation && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {comparison.recommendation}
            </p>
          )}
        </div>
        
        {/* Geometry Context - Enhanced Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-2.5 text-center hover:bg-muted/50 transition-colors">
            <span className="text-xs text-muted-foreground/70 block mb-1">Shell ID</span>
            <span className="font-mono font-semibold text-sm">{toDisplay(shellDiameter).toFixed(0)}</span>
            <span className="text-xs text-muted-foreground ml-1">{lengthUnit}</span>
          </div>
          <div className={`rounded-lg p-2.5 text-center transition-colors
            ${metrics.isPitchOptimal ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'bg-amber-500/10 hover:bg-amber-500/20'}`}>
            <span className="text-xs text-muted-foreground/70 block mb-1">Pitch Ratio</span>
            <span className={`font-mono font-semibold text-sm ${metrics.isPitchOptimal ? 'text-emerald-400' : 'text-amber-400'}`}>
              {metrics.pitchRatio.toFixed(2)}×
            </span>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5 text-center hover:bg-muted/50 transition-colors">
            <span className="text-xs text-muted-foreground/70 block mb-1">Pattern</span>
            <span className="font-semibold text-sm capitalize">{tubePattern}</span>
          </div>
        </div>
        
        {/* Apply Button */}
        {comparison.status !== 'match' && (
          <Button 
            size="sm" 
            variant={comparison.status.includes('critical') ? 'destructive' : 'default'}
            className="w-full text-xs h-9 font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={onApplyTema}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Apply TEMA Count ({temaCalculatedCount})
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default TubeCountComparisonPanel;
