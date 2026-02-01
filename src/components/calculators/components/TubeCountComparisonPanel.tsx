/**
 * Tube Count Comparison Panel
 * Shows the difference between user-entered tube count and TEMA-calculated count
 * with visual indicators and recommendations
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Minus
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

function getComparisonStatus(userCount: number, temaCount: number): {
  status: 'match' | 'under' | 'over' | 'critical';
  percent: number;
  message: string;
} {
  if (temaCount === 0) {
    return { status: 'critical', percent: 0, message: 'Cannot calculate TEMA tube count' };
  }
  
  const diff = userCount - temaCount;
  const percentDiff = (diff / temaCount) * 100;
  
  if (Math.abs(percentDiff) <= 2) {
    return { 
      status: 'match', 
      percent: percentDiff, 
      message: 'User count matches TEMA recommendation (within ±2%)' 
    };
  } else if (percentDiff < -10) {
    return { 
      status: 'critical', 
      percent: percentDiff, 
      message: 'User count significantly below TEMA. Check shell sizing or consider smaller shell.' 
    };
  } else if (percentDiff < 0) {
    return { 
      status: 'under', 
      percent: percentDiff, 
      message: 'User count below TEMA. This may be intentional for maintenance access.' 
    };
  } else if (percentDiff > 10) {
    return { 
      status: 'critical', 
      percent: percentDiff, 
      message: 'User count exceeds TEMA maximum. Tubes may not fit in shell.' 
    };
  } else {
    return { 
      status: 'over', 
      percent: percentDiff, 
      message: 'User count above TEMA. Verify bundle fits in shell.' 
    };
  }
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
  const pitchRatio = tubePitch / tubeOD;
  
  // Calculate theoretical packing density
  const shellArea = Math.PI * Math.pow(shellDiameter / 2, 2);
  const tubeArea = tubeOD * tubeOD; // Approximate area per tube position
  const packingEfficiency = (userTubeCount * tubeArea / shellArea) * 100;
  
  const getStatusIcon = () => {
    switch (comparison.status) {
      case 'match':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'under':
        return <TrendingDown className="h-5 w-5 text-amber-500" />;
      case 'over':
        return <TrendingUp className="h-5 w-5 text-amber-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };
  
  const getStatusColor = () => {
    switch (comparison.status) {
      case 'match': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'under': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'over': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-400';
    }
  };

  const lengthUnit = unitSystem === 'metric' ? 'mm' : 'in';
  const toDisplay = (val: number) => unitSystem === 'metric' ? val : val / 25.4;

  return (
    <Card className={`border-2 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Tube Count Comparison
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">Compares user-entered tube count against TEMA standard tables or Palen correlation calculation.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {calculationMethod}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Comparison Display */}
        <div className="flex items-center justify-center gap-4 py-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{userTubeCount}</div>
            <div className="text-xs text-muted-foreground">User Count</div>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            {getStatusIcon()}
            <div className="flex items-center gap-1">
              {diff > 0 && <span className="text-xs font-medium text-amber-400">+{diff}</span>}
              {diff < 0 && <span className="text-xs font-medium text-amber-400">{diff}</span>}
              {diff === 0 && <Minus className="h-3 w-3 text-emerald-400" />}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{temaCalculatedCount}</div>
            <div className="text-xs text-muted-foreground">TEMA Count</div>
          </div>
        </div>
        
        {/* Deviation Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Deviation from TEMA</span>
            <span className={comparison.status === 'match' ? 'text-emerald-400' : 'text-amber-400'}>
              {comparison.percent > 0 ? '+' : ''}{comparison.percent.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* Acceptable range indicator */}
            <div 
              className="absolute h-full bg-emerald-500/20"
              style={{ left: '45%', width: '10%' }}
            />
            {/* Current position indicator */}
            <div 
              className={`absolute w-3 h-3 rounded-full top-1/2 -translate-y-1/2 ${
                comparison.status === 'match' ? 'bg-emerald-500' : 
                comparison.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ 
                left: `calc(${Math.min(Math.max(50 + comparison.percent, 0), 100)}% - 6px)` 
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-20%</span>
            <span>TEMA</span>
            <span>+20%</span>
          </div>
        </div>
        
        {/* Status Message */}
        <div className={`text-xs p-2 rounded ${
          comparison.status === 'match' ? 'bg-emerald-500/10' :
          comparison.status === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10'
        }`}>
          {comparison.message}
        </div>
        
        {/* Geometry Context */}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex flex-col">
            <span className="text-muted-foreground/70">Shell ID</span>
            <span className="font-mono">{toDisplay(shellDiameter).toFixed(0)} {lengthUnit}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground/70">Pitch Ratio</span>
            <span className="font-mono">{pitchRatio.toFixed(2)}×</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground/70">Pattern</span>
            <span className="capitalize">{tubePattern}</span>
          </div>
        </div>
        
        {/* Apply Button (only if not matching) */}
        {comparison.status !== 'match' && (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full text-xs"
            onClick={onApplyTema}
          >
            Apply TEMA Count ({temaCalculatedCount})
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default TubeCountComparisonPanel;
