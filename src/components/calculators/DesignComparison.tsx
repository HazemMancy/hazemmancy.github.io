import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Trophy, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface SavedDesign {
  id: string;
  name: string;
  timestamp: Date;
  // Inputs
  shellDiameter: number;
  tubeOD: number;
  tubeLength: number;
  numberOfTubes: number;
  tubePasses: number;
  tubePitch: number;
  tubePattern: string;
  baffleSpacing: number;
  baffleCut: number;
  // Results
  heatDuty: number;
  requiredArea: number;
  actualArea: number;
  overallU: number;
  calculatedU: number;
  effectiveness: number;
  tubeSidePressureDrop: number;
  shellSidePressureDrop: number;
  tubeSideVelocity: number;
  shellSideVelocity: number;
  hi: number;
  ho: number;
  isVibrationRisk: boolean;
  // ASME
  shellThickness?: number;
  shellMaterial?: string;
}

interface DesignComparisonProps {
  savedDesigns: SavedDesign[];
  onDeleteDesign: (id: string) => void;
  onClearAll: () => void;
}

const DesignComparison = ({ savedDesigns, onDeleteDesign, onClearAll }: DesignComparisonProps) => {
  const formatNumber = (num: number, decimals: number = 2): string => {
    if (isNaN(num) || !isFinite(num)) return "—";
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  // Find best values for highlighting
  const getBestValue = useCallback((
    designs: SavedDesign[],
    key: keyof SavedDesign,
    preferLow: boolean = false
  ): number | null => {
    const values = designs.map(d => d[key] as number).filter(v => !isNaN(v) && isFinite(v));
    if (values.length === 0) return null;
    return preferLow ? Math.min(...values) : Math.max(...values);
  }, []);

  const bestEffectiveness = getBestValue(savedDesigns, "effectiveness");
  const bestTubeDp = getBestValue(savedDesigns, "tubeSidePressureDrop", true);
  const bestShellDp = getBestValue(savedDesigns, "shellSidePressureDrop", true);
  const bestCalculatedU = getBestValue(savedDesigns, "calculatedU");
  const lowestArea = getBestValue(savedDesigns, "requiredArea", true);

  const isBest = (value: number, best: number | null) => {
    if (best === null) return false;
    return Math.abs(value - best) < 0.001;
  };

  if (savedDesigns.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">
            <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No designs saved yet.</p>
            <p className="text-xs mt-1">Save your current design to compare different configurations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Design Comparison
            <Badge variant="outline" className="ml-2">{savedDesigns.length} designs</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearAll}
            className="text-destructive hover:text-destructive"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Parameter</TableHead>
                {savedDesigns.map((design) => (
                  <TableHead key={design.id} className="min-w-[120px]">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{design.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1"
                        onClick={() => onDeleteDesign(design.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Geometry Section */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={savedDesigns.length + 1} className="font-semibold text-xs">
                  GEOMETRY
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Shell ID (mm)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">{formatNumber(d.shellDiameter, 0)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Tube OD × Length</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">{formatNumber(d.tubeOD, 2)} × {formatNumber(d.tubeLength, 1)}m</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Tubes × Passes</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">{d.numberOfTubes} × {d.tubePasses}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Pitch (Pattern)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">
                    {formatNumber(d.tubePitch, 1)} ({d.tubePattern.charAt(0).toUpperCase()})
                  </TableCell>
                ))}
              </TableRow>

              {/* Performance Section */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={savedDesigns.length + 1} className="font-semibold text-xs">
                  THERMAL PERFORMANCE
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Heat Duty (kW)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs font-medium">{formatNumber(d.heatDuty, 1)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Required Area (m²)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className={`text-xs ${isBest(d.requiredArea, lowestArea) ? "text-primary font-semibold" : ""}`}>
                    {formatNumber(d.requiredArea, 2)}
                    {isBest(d.requiredArea, lowestArea) && <Trophy className="w-3 h-3 inline ml-1 text-primary" />}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Actual Area (m²)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">{formatNumber(d.actualArea, 2)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Effectiveness (%)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className={`text-xs ${isBest(d.effectiveness, bestEffectiveness) ? "text-primary font-semibold" : ""}`}>
                    {formatNumber(d.effectiveness * 100, 1)}
                    {isBest(d.effectiveness, bestEffectiveness) && <Trophy className="w-3 h-3 inline ml-1 text-primary" />}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Calc U (W/m²·K)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className={`text-xs ${isBest(d.calculatedU, bestCalculatedU) ? "text-primary font-semibold" : ""}`}>
                    {formatNumber(d.calculatedU, 1)}
                    {isBest(d.calculatedU, bestCalculatedU) && <Trophy className="w-3 h-3 inline ml-1 text-primary" />}
                  </TableCell>
                ))}
              </TableRow>

              {/* HTC Section */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={savedDesigns.length + 1} className="font-semibold text-xs">
                  HEAT TRANSFER COEFFICIENTS
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">hi (W/m²·K)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">{formatNumber(d.hi, 0)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">ho (W/m²·K)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">{formatNumber(d.ho, 0)}</TableCell>
                ))}
              </TableRow>

              {/* Hydraulics Section */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={savedDesigns.length + 1} className="font-semibold text-xs">
                  HYDRAULICS
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Tube ΔP (kPa)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className={`text-xs ${isBest(d.tubeSidePressureDrop, bestTubeDp) ? "text-primary font-semibold" : ""}`}>
                    {formatNumber(d.tubeSidePressureDrop, 2)}
                    {isBest(d.tubeSidePressureDrop, bestTubeDp) && <Trophy className="w-3 h-3 inline ml-1 text-primary" />}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Shell ΔP (kPa)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className={`text-xs ${isBest(d.shellSidePressureDrop, bestShellDp) ? "text-primary font-semibold" : ""}`}>
                    {formatNumber(d.shellSidePressureDrop, 2)}
                    {isBest(d.shellSidePressureDrop, bestShellDp) && <Trophy className="w-3 h-3 inline ml-1 text-primary" />}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Tube Velocity (m/s)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">{formatNumber(d.tubeSideVelocity, 2)}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Shell Velocity (m/s)</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">{formatNumber(d.shellSideVelocity, 2)}</TableCell>
                ))}
              </TableRow>

              {/* Vibration & Mechanical */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={savedDesigns.length + 1} className="font-semibold text-xs">
                  MECHANICAL
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs text-muted-foreground">Vibration Status</TableCell>
                {savedDesigns.map((d) => (
                  <TableCell key={d.id} className="text-xs">
                    {d.isVibrationRisk ? (
                      <span className="text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Risk
                      </span>
                    ) : (
                      <span className="text-primary flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> OK
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
              {savedDesigns.some(d => d.shellThickness) && (
                <TableRow>
                  <TableCell className="text-xs text-muted-foreground">Shell Thickness (mm)</TableCell>
                  {savedDesigns.map((d) => (
                    <TableCell key={d.id} className="text-xs">{d.shellThickness ? formatNumber(d.shellThickness, 1) : "—"}</TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DesignComparison;
