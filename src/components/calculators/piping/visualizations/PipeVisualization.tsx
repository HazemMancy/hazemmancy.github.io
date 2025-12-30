import { Cylinder } from "lucide-react";
import { UnitSystem, convertLength, convertWeight, getLengthUnit, getWeightUnit } from "../types";

interface PipeData {
  size: string;
  nominalDN: number;
  outerDiameter: number;
  schedule: string;
  wallThickness: number;
  insideDiameter: number;
  crossSectionArea: number;
  internalArea: number;
  weightPerMeter: number;
  waterCapacity: number;
}

interface PipeVisualizationProps {
  pipe: PipeData | undefined;
  unitSystem: UnitSystem;
  mode: 'schedule' | 'wallThickness';
}

export const PipeVisualization = ({ pipe, unitSystem, mode }: PipeVisualizationProps) => {
  if (!pipe) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Cylinder className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Select pipe size and {mode === 'schedule' ? 'schedule' : 'wall thickness'}</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const wu = getWeightUnit(unitSystem);
  const od = convertLength(pipe.outerDiameter, unitSystem);
  const id = convertLength(pipe.insideDiameter, unitSystem);
  const wt = convertLength(pipe.wallThickness, unitSystem);
  const wpm = convertWeight(pipe.weightPerMeter, unitSystem);
  
  const scale = 0.6;
  const cx = 150, cy = 130;
  const odR = Math.min(pipe.outerDiameter * scale, 90);
  const idR = (pipe.insideDiameter / pipe.outerDiameter) * odR;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary/10 via-muted/30 to-primary/5 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Cross Section — ASME B36.10M
          </span>
        </div>
        <svg viewBox="0 0 300 260" className="w-full max-w-xs mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="pipeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1"/>
            </linearGradient>
            <filter id="pipeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="4" floodOpacity="0.2"/>
            </filter>
            <pattern id="pipeHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--primary))" strokeWidth="0.8" strokeOpacity="0.4"/>
            </pattern>
          </defs>
          
          {/* Outer circle with shadow */}
          <circle cx={cx} cy={cy} r={odR} fill="url(#pipeGradient)" stroke="hsl(var(--primary))" strokeWidth="2.5" filter="url(#pipeShadow)"/>
          
          {/* Wall thickness ring with hatch pattern */}
          <circle cx={cx} cy={cy} r={(odR + idR) / 2} fill="none" stroke="url(#pipeHatch)" strokeWidth={odR - idR}/>
          <circle cx={cx} cy={cy} r={odR} fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.5"/>
          
          {/* Inner circle (bore) */}
          <circle cx={cx} cy={cy} r={idR} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          
          {/* OD dimension line - left side */}
          <line x1={cx - odR - 18} y1={cy - odR} x2={cx - odR - 18} y2={cy + odR} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <line x1={cx - odR - 23} y1={cy - odR} x2={cx - odR - 13} y2={cy - odR} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx - odR - 23} y1={cy + odR} x2={cx - odR - 13} y2={cy + odR} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx - odR - 28} y={cy} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold" transform={`rotate(-90 ${cx - odR - 28} ${cy})`}>
            OD = {od.toFixed(unitSystem === 'imperial' ? 3 : 1)} {u}
          </text>
          
          {/* ID dimension line - bottom */}
          <line x1={cx - idR} y1={cy + odR + 25} x2={cx + idR} y2={cy + odR + 25} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <line x1={cx - idR} y1={cy + odR + 20} x2={cx - idR} y2={cy + odR + 30} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={cx + idR} y1={cy + odR + 20} x2={cx + idR} y2={cy + odR + 30} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={cx} y={cy + odR + 42} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="9" fontWeight="bold">
            ID = {id.toFixed(unitSystem === 'imperial' ? 3 : 1)} {u}
          </text>
          
          {/* Wall thickness indicator */}
          <line x1={cx + idR + 2} y1={cy - 30} x2={cx + odR - 2} y2={cy - 30} stroke="hsl(var(--chart-4))" strokeWidth="5" strokeLinecap="round"/>
          <line x1={cx + idR} y1={cy - 35} x2={cx + idR} y2={cy - 25} stroke="hsl(var(--chart-4))" strokeWidth="1"/>
          <line x1={cx + odR} y1={cy - 35} x2={cx + odR} y2={cy - 25} stroke="hsl(var(--chart-4))" strokeWidth="1"/>
          <text x={cx + odR + 12} y={cy - 27} fill="hsl(var(--chart-4))" fontSize="9" fontWeight="bold">
            t = {wt.toFixed(unitSystem === 'imperial' ? 3 : 2)} {u}
          </text>
          
          {/* Center mark */}
          <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <circle cx={cx} cy={cy} r="3" fill="hsl(var(--primary))"/>
          <text x={cx} y={cy - 16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">CL</text>
          
          {/* Schedule label */}
          <text x={cx} y={cy + 5} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="500">
            {pipe.schedule}
          </text>
        </svg>
      </div>
      
      {/* Data Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-3 rounded-xl">
          <div className="text-[10px] text-muted-foreground font-medium uppercase">Wall Thickness</div>
          <div className="text-lg font-bold text-primary">{wt.toFixed(unitSystem === 'imperial' ? 3 : 2)} <span className="text-xs font-normal">{u}</span></div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-3 rounded-xl">
          <div className="text-[10px] text-muted-foreground font-medium uppercase">Weight</div>
          <div className="text-lg font-bold text-primary">{wpm.toFixed(2)} <span className="text-xs font-normal">{wu}/{unitSystem === 'imperial' ? 'ft' : 'm'}</span></div>
        </div>
        <div className="bg-muted/50 p-3 rounded-xl border">
          <div className="text-[10px] text-muted-foreground uppercase">Internal Area</div>
          <div className="font-semibold text-sm">{pipe.internalArea.toLocaleString()} mm²</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-xl border">
          <div className="text-[10px] text-muted-foreground uppercase">Water Capacity</div>
          <div className="font-semibold text-sm">{pipe.waterCapacity} L/m</div>
        </div>
      </div>
    </div>
  );
};
