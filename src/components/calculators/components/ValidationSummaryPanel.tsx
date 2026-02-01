/**
 * Consolidated Validation Summary Panel
 * Shows all warnings, errors, and validation results in one unified view
 */

import { AlertTriangle, CheckCircle2, XCircle, Shield, Activity, Gauge, Thermometer, Droplets, Wind, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { APIValidationResult, VibrationCheckResult } from "@/lib/heatExchangerTypes";
import { cn } from "@/lib/utils";

interface ValidationCategory {
  name: string;
  icon: React.ReactNode;
  status: 'pass' | 'warning' | 'error';
  items: string[];
  details?: React.ReactNode;
}

interface ValidationSummaryPanelProps {
  apiValidation: APIValidationResult | null;
  vibrationCheck: VibrationCheckResult | null;
  calculationWarnings: string[];
  calculationErrors: string[];
  extremeValueWarnings: string[];
  // Velocity data for visual indicators
  velocities?: {
    tube: number;
    shell: number;
    tubeLimits: { min: number; max: number };
    shellLimits: { min: number; max: number };
  };
  // Pressure drop data
  pressureDrops?: {
    tube: number;
    shell: number;
    tubeAllowed: number;
    shellAllowed: number;
  };
  unitSystem: 'metric' | 'imperial';
}

const StatusIcon = ({ status }: { status: 'pass' | 'warning' | 'error' }) => {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
};

const VelocityGauge = ({ 
  value, 
  min, 
  max, 
  label, 
  unit 
}: { 
  value: number; 
  min: number; 
  max: number; 
  label: string; 
  unit: string 
}) => {
  const isLow = value < min;
  const isHigh = value > max;
  const isNormal = !isLow && !isHigh;
  
  // Calculate position on a 0-100 scale where optimal range is 30-70
  const normalizedMin = min * 0.5;
  const normalizedMax = max * 1.5;
  const percentage = Math.min(100, Math.max(0, ((value - normalizedMin) / (normalizedMax - normalizedMin)) * 100));
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium",
          isNormal ? "text-green-600 dark:text-green-400" : 
          isLow ? "text-blue-600 dark:text-blue-400" : 
          "text-red-600 dark:text-red-400"
        )}>
          {value.toFixed(2)} {unit}
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Optimal zone indicator */}
        <div 
          className="absolute h-full bg-green-500/20"
          style={{ 
            left: `${(min / normalizedMax) * 100}%`, 
            width: `${((max - min) / normalizedMax) * 100}%` 
          }}
        />
        {/* Current value indicator */}
        <div 
          className={cn(
            "absolute h-full w-1 rounded",
            isNormal ? "bg-green-500" : isLow ? "bg-blue-500" : "bg-red-500"
          )}
          style={{ left: `${Math.min(99, percentage)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min} (min)</span>
        <span>{max} (max)</span>
      </div>
    </div>
  );
};

const PressureDropBar = ({ 
  actual, 
  allowed, 
  label, 
  unit 
}: { 
  actual: number; 
  allowed: number; 
  label: string; 
  unit: string 
}) => {
  const percentage = Math.min(150, (actual / allowed) * 100);
  const isExceeded = actual > allowed;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium",
          isExceeded ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
        )}>
          {actual.toFixed(1)} / {allowed} {unit}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          isExceeded ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"
        )} 
      />
      <div className="text-[10px] text-muted-foreground text-right">
        {percentage.toFixed(0)}% of allowed
      </div>
    </div>
  );
};

export const ValidationSummaryPanel = ({
  apiValidation,
  vibrationCheck,
  calculationWarnings,
  calculationErrors,
  extremeValueWarnings,
  velocities,
  pressureDrops,
  unitSystem
}: ValidationSummaryPanelProps) => {
  
  // Build validation categories
  const categories: ValidationCategory[] = [];
  
  // 1. API Standard Validation
  const apiErrors = apiValidation?.errors || [];
  const apiWarnings = apiValidation?.warnings || [];
  categories.push({
    name: `API Standard (${apiValidation?.standard || 'API 660'})`,
    icon: <Shield className="h-4 w-4" />,
    status: apiErrors.length > 0 ? 'error' : apiWarnings.length > 0 ? 'warning' : 'pass',
    items: [...apiErrors, ...apiWarnings]
  });
  
  // 2. Vibration Analysis
  if (vibrationCheck) {
    categories.push({
      name: 'Vibration Analysis',
      icon: <Activity className="h-4 w-4" />,
      status: !vibrationCheck.isSafe ? 'warning' : 'pass',
      items: vibrationCheck.warnings || [],
      details: (
        <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-muted/30 rounded text-xs">
          <Tooltip>
            <TooltipTrigger className="text-left">
              <div className="text-muted-foreground">Natural Freq</div>
              <div className="font-medium">{vibrationCheck.naturalFrequency.toFixed(1)} Hz</div>
            </TooltipTrigger>
            <TooltipContent>Tube bundle natural frequency</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className="text-left">
              <div className="text-muted-foreground">Vortex Shed</div>
              <div className="font-medium">{vibrationCheck.vortexSheddingFrequency.toFixed(1)} Hz</div>
            </TooltipTrigger>
            <TooltipContent>Vortex shedding frequency</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className="text-left">
              <div className="text-muted-foreground">FEI</div>
              <div className={cn(
                "font-medium",
                vibrationCheck.fluidElasticInstability > 0.5 ? "text-red-500" : "text-green-500"
              )}>
                {vibrationCheck.fluidElasticInstability.toFixed(3)}
              </div>
            </TooltipTrigger>
            <TooltipContent>Fluid Elastic Instability (should be &lt; 0.5)</TooltipContent>
          </Tooltip>
        </div>
      )
    });
  }
  
  // 3. Extreme Value Warnings
  if (extremeValueWarnings.length > 0) {
    categories.push({
      name: 'Operating Limits',
      icon: <Gauge className="h-4 w-4" />,
      status: 'warning',
      items: extremeValueWarnings
    });
  }
  
  // 4. Calculation Errors/Warnings
  const calcErrors = calculationErrors.filter(e => !apiErrors.includes(e));
  const calcWarnings = calculationWarnings.filter(w => !apiWarnings.includes(w) && !extremeValueWarnings.includes(w));
  if (calcErrors.length > 0 || calcWarnings.length > 0) {
    categories.push({
      name: 'Calculation Issues',
      icon: <AlertCircle className="h-4 w-4" />,
      status: calcErrors.length > 0 ? 'error' : 'warning',
      items: [...calcErrors, ...calcWarnings]
    });
  }
  
  // Calculate overall status
  const totalErrors = categories.filter(c => c.status === 'error').length;
  const totalWarnings = categories.filter(c => c.status === 'warning').length;
  const allPass = totalErrors === 0 && totalWarnings === 0;
  
  const velUnit = unitSystem === 'metric' ? 'm/s' : 'ft/s';
  const dpUnit = unitSystem === 'metric' ? 'kPa' : 'psi';
  
  return (
    <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>Design Validation Summary</span>
          </div>
          <div className="flex items-center gap-2">
            {totalErrors > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {totalErrors} Error{totalErrors > 1 ? 's' : ''}
              </Badge>
            )}
            {totalWarnings > 0 && (
              <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                {totalWarnings} Warning{totalWarnings > 1 ? 's' : ''}
              </Badge>
            )}
            {allPass && (
              <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                All Checks Pass
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Visual Gauges for Velocities and Pressure Drops */}
        {(velocities || pressureDrops) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            {velocities && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Wind className="h-3 w-3" />
                  Velocity Check
                </div>
                <VelocityGauge 
                  value={velocities.tube} 
                  min={velocities.tubeLimits.min} 
                  max={velocities.tubeLimits.max}
                  label="Tube Side"
                  unit={velUnit}
                />
                <VelocityGauge 
                  value={velocities.shell} 
                  min={velocities.shellLimits.min} 
                  max={velocities.shellLimits.max}
                  label="Shell Side"
                  unit={velUnit}
                />
              </div>
            )}
            
            {pressureDrops && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Gauge className="h-3 w-3" />
                  Pressure Drop Check
                </div>
                <PressureDropBar 
                  actual={pressureDrops.tube}
                  allowed={pressureDrops.tubeAllowed}
                  label="Tube Side"
                  unit={dpUnit}
                />
                <PressureDropBar 
                  actual={pressureDrops.shell}
                  allowed={pressureDrops.shellAllowed}
                  label="Shell Side"
                  unit={dpUnit}
                />
              </div>
            )}
          </div>
        )}
        
        <Separator />
        
        {/* Validation Categories */}
        <div className="space-y-3">
          {categories.map((category, idx) => (
            <div key={idx} className={cn(
              "p-3 rounded-lg border",
              category.status === 'pass' ? "border-green-500/30 bg-green-500/5" :
              category.status === 'warning' ? "border-yellow-500/30 bg-yellow-500/5" :
              "border-red-500/30 bg-red-500/5"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {category.icon}
                  {category.name}
                </div>
                <StatusIcon status={category.status} />
              </div>
              
              {category.items.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {category.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2">
                      <span className="text-muted-foreground/60">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {category.status === 'pass' && category.items.length === 0 && (
                <div className="text-xs text-green-600 dark:text-green-400">
                  All requirements met
                </div>
              )}
              
              {category.details}
            </div>
          ))}
        </div>
        
        {/* Quick Reference */}
        <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
          <span className="font-medium">Standards Reference:</span> API 660/661, TEMA 10th Ed., ASME VIII Div. 1
        </div>
      </CardContent>
    </Card>
  );
};

export default ValidationSummaryPanel;
