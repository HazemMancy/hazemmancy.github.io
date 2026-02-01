/**
 * API 660 / API 661 Validation Panel Component
 * Displays validation warnings and errors from API standard checks
 */

import { AlertTriangle, CheckCircle2, XCircle, Shield, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { APIValidationResult, VibrationCheckResult } from "@/lib/heatExchangerTypes";

interface APIValidationPanelProps {
  apiValidation: APIValidationResult | null;
  vibrationCheck: VibrationCheckResult | null;
  calculationWarnings?: string[];
  calculationErrors?: string[];
}

export const APIValidationPanel = ({
  apiValidation,
  vibrationCheck,
  calculationWarnings = [],
  calculationErrors = []
}: APIValidationPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Combine all issues
  const allWarnings = [
    ...(apiValidation?.warnings || []),
    ...(vibrationCheck?.warnings || []),
    ...calculationWarnings
  ];

  const allErrors = [
    ...(apiValidation?.errors || []),
    ...calculationErrors
  ];

  const hasIssues = allWarnings.length > 0 || allErrors.length > 0;
  const isValid = apiValidation?.isValid !== false && allErrors.length === 0;

  // Determine overall status
  const getStatusBadge = () => {
    if (allErrors.length > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {allErrors.length} Error{allErrors.length > 1 ? 's' : ''}
        </Badge>
      );
    }
    if (allWarnings.length > 0) {
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-3 w-3" />
          {allWarnings.length} Warning{allWarnings.length > 1 ? 's' : ''}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Validated
      </Badge>
    );
  };

  return (
    <Card className="border-border/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger className="w-full">
            <CardTitle className="text-sm flex items-center justify-between cursor-pointer hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>API Standard Validation</span>
                {apiValidation?.standard && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({apiValidation.standard})
                  </span>
                )}
              </div>
              {getStatusBadge()}
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Errors */}
            {allErrors.length > 0 && (
              <div className="space-y-2">
                {allErrors.map((error, idx) => (
                  <Alert key={`error-${idx}`} variant="destructive" className="py-2">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {error}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Warnings */}
            {allWarnings.length > 0 && (
              <div className="space-y-2">
                {allWarnings.map((warning, idx) => (
                  <Alert key={`warn-${idx}`} className="py-2 border-yellow-500/50 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-300">
                      {warning}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Vibration Status */}
            {vibrationCheck && (
              <div className={`p-3 rounded-md border ${
                vibrationCheck.isSafe 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : 'border-red-500/30 bg-red-500/5'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {vibrationCheck.isSafe ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-xs font-medium">
                    Vibration Analysis: {vibrationCheck.message}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-left">
                        <div className="font-medium">Natural Freq</div>
                        <div>{vibrationCheck.naturalFrequency.toFixed(1)} Hz</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Tube bundle natural frequency</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-left">
                        <div className="font-medium">Vortex Shed</div>
                        <div>{vibrationCheck.vortexSheddingFrequency.toFixed(1)} Hz</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Vortex shedding frequency</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-left">
                        <div className="font-medium">FEI</div>
                        <div>{vibrationCheck.fluidElasticInstability.toFixed(3)}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Fluid Elastic Instability parameter (should be &lt; 0.5)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* All Clear Message */}
            {!hasIssues && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Design meets API standard requirements</span>
              </div>
            )}

            {/* API Reference Info */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <p>
                  Validation based on {apiValidation?.standard || 'API 660'}, TEMA Standards 10th Edition, 
                  and ASME Section VIII Division 1 requirements.
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default APIValidationPanel;
