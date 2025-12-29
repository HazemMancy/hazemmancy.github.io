import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertTriangle, XCircle, Activity, Thermometer, Gauge, Droplets } from "lucide-react";

export interface HTRIRatingData {
  // Thermal performance
  heatDutyRequired: number;      // kW
  heatDutyActual: number;        // kW (calculated)
  overdesign: number;            // % (actual/required - 1)
  
  // Temperatures
  hotInlet: number;
  hotOutlet: number;
  coldInlet: number;
  coldOutlet: number;
  tempUnit: string;
  
  // Approach temperatures
  hotApproach: number;           // Hot outlet - Cold inlet
  coldApproach: number;          // Hot inlet - Cold outlet
  crossoverTemp?: number;        // For multipass - potential crossing
  
  // MTD
  lmtd: number;
  correctionFactor: number;
  effectiveMTD: number;
  
  // Heat transfer coefficients
  hi: number;                    // Tube side W/m²K
  ho: number;                    // Shell side W/m²K
  Uc: number;                    // Clean U
  Uf: number;                    // Fouled U (specified)
  Ur: number;                    // Required U
  
  // Area
  areaRequired: number;          // m²
  areaAvailable: number;         // m²
  areaExcess: number;            // %
  
  // Fouling / Cleanliness
  foulingHot: number;            // m²K/W
  foulingCold: number;           // m²K/W
  cleanlinessFactorHot: number;  // %
  cleanlinessFactorCold: number; // %
  overallCleanliness: number;    // %
  
  // Pressure drops
  tubeSideDPAllowed: number;     // kPa
  tubeSideDPCalc: number;        // kPa
  shellSideDPAllowed: number;    // kPa
  shellSideDPCalc: number;       // kPa
  
  // Velocities
  tubeSideVelocity: number;      // m/s
  shellSideVelocity: number;     // m/s
  
  // Flow regime
  tubeReynolds: number;
  shellReynolds: number;
  
  // Vibration
  isVibrationRisk: boolean;
  vibrationMessage: string;
  
  // NTU-Effectiveness
  ntu: number;
  effectiveness: number;
}

interface HTRIRatingSummaryProps {
  data: HTRIRatingData;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  allowedPressureDropTube: string;
  allowedPressureDropShell: string;
  onAllowedDPTubeChange: (value: string) => void;
  onAllowedDPShellChange: (value: string) => void;
}

const StatusBadge = ({ status, text }: { status: "ok" | "warning" | "error"; text: string }) => {
  const config = {
    ok: { icon: CheckCircle, className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    warning: { icon: AlertTriangle, className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    error: { icon: XCircle, className: "bg-red-500/10 text-red-500 border-red-500/20" }
  };
  const { icon: Icon, className } = config[status];
  
  return (
    <Badge variant="outline" className={`${className} gap-1`}>
      <Icon className="w-3 h-3" />
      {text}
    </Badge>
  );
};

const ValueRow = ({ 
  label, 
  value, 
  unit, 
  status 
}: { 
  label: string; 
  value: string | number; 
  unit?: string;
  status?: "ok" | "warning" | "error";
}) => (
  <div className="flex justify-between items-center py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`font-mono ${status === "error" ? "text-red-500" : status === "warning" ? "text-amber-500" : ""}`}>
        {typeof value === "number" ? value.toFixed(2) : value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  </div>
);

export function HTRIRatingSummary({ 
  data, 
  enabled, 
  onToggle,
  allowedPressureDropTube,
  allowedPressureDropShell,
  onAllowedDPTubeChange,
  onAllowedDPShellChange
}: HTRIRatingSummaryProps) {
  // Determine overall status
  const getOverallStatus = (): "ok" | "warning" | "error" => {
    if (data.overdesign < -5) return "error"; // Undersized
    if (data.overdesign < 0) return "warning";
    if (data.isVibrationRisk) return "warning";
    if (data.tubeSideDPCalc > data.tubeSideDPAllowed || data.shellSideDPCalc > data.shellSideDPAllowed) return "warning";
    if (data.effectiveness < 0.3) return "warning";
    return "ok";
  };

  const getThermalStatus = (): "ok" | "warning" | "error" => {
    if (data.overdesign < -5) return "error";
    if (data.overdesign < 0) return "warning";
    if (data.overdesign > 50) return "warning"; // Over-designed
    return "ok";
  };

  const getDPStatus = (calc: number, allowed: number): "ok" | "warning" | "error" => {
    if (calc > allowed) return "error";
    if (calc > allowed * 0.9) return "warning";
    return "ok";
  };

  const getVelocityStatus = (velocity: number, isShellSide: boolean): "ok" | "warning" | "error" => {
    // Typical limits: tube 1-3 m/s, shell 0.3-1 m/s for liquids
    if (isShellSide) {
      if (velocity < 0.2 || velocity > 1.2) return "warning";
      if (velocity > 1.5) return "error";
    } else {
      if (velocity < 0.5 || velocity > 3.5) return "warning";
      if (velocity > 4) return "error";
    }
    return "ok";
  };

  const getFlowRegime = (Re: number): string => {
    if (Re < 2300) return "Laminar";
    if (Re < 10000) return "Transition";
    return "Turbulent";
  };

  if (!enabled) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              HTRI-Style Rating Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="htri-toggle" className="text-xs text-muted-foreground">Enable</Label>
              <Switch id="htri-toggle" checked={enabled} onCheckedChange={onToggle} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Enable to view detailed thermal rating analysis</p>
        </CardContent>
      </Card>
    );
  }

  const overallStatus = getOverallStatus();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            HTRI-Style Rating Summary
          </CardTitle>
          <div className="flex items-center gap-3">
            <StatusBadge 
              status={overallStatus} 
              text={overallStatus === "ok" ? "ACCEPTABLE" : overallStatus === "warning" ? "MARGINAL" : "UNACCEPTABLE"} 
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="htri-toggle2" className="text-xs text-muted-foreground">Enable</Label>
              <Switch id="htri-toggle2" checked={enabled} onCheckedChange={onToggle} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Thermal Performance Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Thermal Performance</h4>
            <StatusBadge status={getThermalStatus()} text={`${data.overdesign >= 0 ? "+" : ""}${data.overdesign.toFixed(1)}%`} />
          </div>
          <div className="grid grid-cols-2 gap-x-6 pl-6 text-sm">
            <ValueRow label="Heat Duty Required" value={data.heatDutyRequired.toFixed(1)} unit="kW" />
            <ValueRow label="Heat Duty Actual" value={data.heatDutyActual.toFixed(1)} unit="kW" />
            <ValueRow label="Overdesign" value={`${data.overdesign >= 0 ? "+" : ""}${data.overdesign.toFixed(1)}`} unit="%" status={getThermalStatus()} />
            <ValueRow label="Effectiveness (ε)" value={(data.effectiveness * 100).toFixed(1)} unit="%" />
            <ValueRow label="NTU" value={data.ntu.toFixed(2)} />
            <ValueRow label="Cleanliness Factor" value={data.overallCleanliness.toFixed(1)} unit="%" />
          </div>
        </div>

        <Separator />

        {/* Temperature Analysis */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-orange-500" />
            <h4 className="font-medium text-sm">Temperature Analysis</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-6 pl-6 text-sm">
            <ValueRow label={`Hot Inlet (${data.tempUnit})`} value={data.hotInlet} />
            <ValueRow label={`Hot Outlet (${data.tempUnit})`} value={data.hotOutlet} />
            <ValueRow label={`Cold Inlet (${data.tempUnit})`} value={data.coldInlet} />
            <ValueRow label={`Cold Outlet (${data.tempUnit})`} value={data.coldOutlet} />
            <ValueRow label="LMTD" value={data.lmtd.toFixed(1)} unit={data.tempUnit} />
            <ValueRow label="F (Correction)" value={data.correctionFactor.toFixed(3)} />
            <ValueRow label="Effective MTD" value={data.effectiveMTD.toFixed(1)} unit={data.tempUnit} />
            <ValueRow label="Hot Approach" value={data.hotApproach.toFixed(1)} unit={data.tempUnit} />
            <ValueRow label="Cold Approach" value={data.coldApproach.toFixed(1)} unit={data.tempUnit} />
          </div>
        </div>

        <Separator />

        {/* Heat Transfer Coefficients */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <h4 className="font-medium text-sm">Heat Transfer Coefficients</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-6 pl-6 text-sm">
            <ValueRow label="hi (tube side)" value={data.hi.toFixed(0)} unit="W/m²K" />
            <ValueRow label="ho (shell side)" value={data.ho.toFixed(0)} unit="W/m²K" />
            <ValueRow label="Uc (clean)" value={data.Uc.toFixed(1)} unit="W/m²K" />
            <ValueRow label="Uf (fouled)" value={data.Uf.toFixed(1)} unit="W/m²K" />
            <ValueRow label="Ur (required)" value={data.Ur.toFixed(1)} unit="W/m²K" />
          </div>
        </div>

        <Separator />

        {/* Area Analysis */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-green-500" />
            <h4 className="font-medium text-sm">Surface Area Analysis</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-6 pl-6 text-sm">
            <ValueRow label="Area Required" value={data.areaRequired.toFixed(1)} unit="m²" />
            <ValueRow label="Area Available" value={data.areaAvailable.toFixed(1)} unit="m²" />
            <ValueRow label="Excess Area" value={`${data.areaExcess >= 0 ? "+" : ""}${data.areaExcess.toFixed(1)}`} unit="%" 
              status={data.areaExcess < 0 ? "error" : data.areaExcess > 50 ? "warning" : "ok"} />
          </div>
        </div>

        <Separator />

        {/* Pressure Drop */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-purple-500" />
            <h4 className="font-medium text-sm">Pressure Drop Analysis</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 pl-6 mb-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tube Side Allowed (kPa)</Label>
              <Input 
                type="number" 
                value={allowedPressureDropTube} 
                onChange={(e) => onAllowedDPTubeChange(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Shell Side Allowed (kPa)</Label>
              <Input 
                type="number" 
                value={allowedPressureDropShell} 
                onChange={(e) => onAllowedDPShellChange(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 pl-6 text-sm">
            <ValueRow label="Tube ΔP Calc" value={data.tubeSideDPCalc.toFixed(1)} unit="kPa" 
              status={getDPStatus(data.tubeSideDPCalc, data.tubeSideDPAllowed)} />
            <ValueRow label="Shell ΔP Calc" value={data.shellSideDPCalc.toFixed(1)} unit="kPa"
              status={getDPStatus(data.shellSideDPCalc, data.shellSideDPAllowed)} />
            <ValueRow label="Tube ΔP %" value={((data.tubeSideDPCalc / data.tubeSideDPAllowed) * 100).toFixed(0)} unit="% of allowed" 
              status={getDPStatus(data.tubeSideDPCalc, data.tubeSideDPAllowed)} />
            <ValueRow label="Shell ΔP %" value={((data.shellSideDPCalc / data.shellSideDPAllowed) * 100).toFixed(0)} unit="% of allowed"
              status={getDPStatus(data.shellSideDPCalc, data.shellSideDPAllowed)} />
          </div>
        </div>

        <Separator />

        {/* Flow Analysis */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-cyan-500" />
            <h4 className="font-medium text-sm">Flow Analysis</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-6 pl-6 text-sm">
            <ValueRow label="Tube Velocity" value={data.tubeSideVelocity.toFixed(2)} unit="m/s" 
              status={getVelocityStatus(data.tubeSideVelocity, false)} />
            <ValueRow label="Shell Velocity" value={data.shellSideVelocity.toFixed(2)} unit="m/s"
              status={getVelocityStatus(data.shellSideVelocity, true)} />
            <ValueRow label="Tube Re" value={data.tubeReynolds.toFixed(0)} />
            <ValueRow label="Shell Re" value={data.shellReynolds.toFixed(0)} />
            <div className="col-span-2 flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">Tube: {getFlowRegime(data.tubeReynolds)}</Badge>
              <Badge variant="outline" className="text-xs">Shell: {getFlowRegime(data.shellReynolds)}</Badge>
            </div>
          </div>
        </div>

        {/* Vibration Warning */}
        {data.isVibrationRisk && (
          <>
            <Separator />
            <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-md">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-amber-500">Vibration Warning:</span>
                <p className="text-muted-foreground">{data.vibrationMessage}</p>
              </div>
            </div>
          </>
        )}

        {/* Fouling Factors */}
        <Separator />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-amber-500" />
            <h4 className="font-medium text-sm">Fouling Factors</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-6 pl-6 text-sm">
            <ValueRow label="Hot Side (Rf)" value={(data.foulingHot * 1000).toFixed(3)} unit="×10⁻³ m²K/W" />
            <ValueRow label="Cold Side (Rf)" value={(data.foulingCold * 1000).toFixed(3)} unit="×10⁻³ m²K/W" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
