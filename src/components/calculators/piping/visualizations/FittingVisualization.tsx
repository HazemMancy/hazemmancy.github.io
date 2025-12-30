import { CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FittingStandard, UnitSystem, convertLength, convertWeight, getLengthUnit, getWeightUnit } from "../types";

interface ElbowData {
  size: string;
  type: string;
  centerToEnd: number;
  outerDiameter: number;
  weight: number;
}

interface TeeData {
  size: string;
  centerToEnd: number;
  centerToBranch: number;
  outerDiameter: number;
  weight: number;
}

interface ReducerData {
  sizeFrom: string;
  sizeTo: string;
  type: string;
  length: number;
  largeEndOD: number;
  smallEndOD: number;
  weight: number;
}

interface ElbowVisualizationProps {
  elbow: ElbowData | undefined;
  unitSystem: UnitSystem;
  standard: FittingStandard;
}

interface TeeVisualizationProps {
  tee: TeeData | undefined;
  unitSystem: UnitSystem;
  standard: FittingStandard;
}

interface ReducerVisualizationProps {
  reducer: ReducerData | undefined;
  unitSystem: UnitSystem;
  standard: FittingStandard;
}

const standardLabels: Record<FittingStandard, { name: string; color: string }> = {
  'B16.9': { name: 'ASME B16.9 Buttweld', color: 'hsl(var(--chart-2))' },
  'B16.11-THD': { name: 'ASME B16.11 Threaded', color: 'hsl(var(--chart-4))' },
  'B16.11-SW': { name: 'ASME B16.11 Socket Weld', color: 'hsl(var(--chart-5))' },
};

export const ElbowVisualization = ({ elbow, unitSystem, standard }: ElbowVisualizationProps) => {
  if (!elbow) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <CornerDownRight className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Select elbow size</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const wu = getWeightUnit(unitSystem);
  const aVal = convertLength(elbow.centerToEnd, unitSystem);
  const odVal = convertLength(elbow.outerDiameter, unitSystem);
  const wt = convertWeight(elbow.weight, unitSystem);
  const is45 = elbow.type.includes('45');
  const isShortRadius = elbow.type.includes('SR');
  const stdInfo = standardLabels[standard];
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-chart-2/10 via-muted/30 to-chart-2/5 rounded-xl p-4 border border-chart-2/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {is45 ? '45°' : '90°'} {isShortRadius ? 'Short Radius' : 'Long Radius'} Elbow
          </span>
        </div>
        <svg viewBox="0 0 300 240" className="w-full max-w-sm mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="elbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stdInfo.color} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={stdInfo.color} stopOpacity="0.1"/>
            </linearGradient>
            <pattern id="elbowHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke={stdInfo.color} strokeWidth="0.7" strokeOpacity="0.4"/>
            </pattern>
          </defs>
          
          {is45 ? (
            <>
              {/* 45 degree elbow */}
              <path d="M 70,200 L 70,130 Q 70,75 115,50 L 200,10" fill="none" stroke="url(#elbowGrad)" strokeWidth="40" strokeLinecap="round"/>
              <path d="M 70,200 L 70,130 Q 70,75 115,50 L 200,10" fill="none" stroke={stdInfo.color} strokeWidth="2.5" strokeLinecap="round"/>
              
              {/* Center line */}
              <circle cx={70} cy={75} r="4" fill={stdInfo.color}/>
              <text x={50} y={72} fill={stdInfo.color} fontSize="9" fontWeight="500">CL</text>
              
              {/* A dimension */}
              <line x1={45} y1={75} x2={45} y2={200} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <line x1={40} y1={75} x2={50} y2={75} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <line x1={40} y1={200} x2={50} y2={200} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <text x={30} y={140} fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold" transform="rotate(-90 30 140)">
                A = {aVal.toFixed(1)} {u}
              </text>
              
              {/* Info box */}
              <rect x={200} y={120} width={85} height={65} rx={5} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
              <text x={210} y={138} fill="hsl(var(--muted-foreground))" fontSize="9">45° LR</text>
              <text x={210} y={153} fill="hsl(var(--muted-foreground))" fontSize="9">A = {aVal.toFixed(1)} {u}</text>
              <text x={210} y={168} fill="hsl(var(--muted-foreground))" fontSize="9">OD = {odVal.toFixed(1)} {u}</text>
              <text x={210} y={183} fill="hsl(var(--muted-foreground))" fontSize="9">Wt = {wt.toFixed(1)} {wu}</text>
            </>
          ) : (
            <>
              {/* 90 degree elbow */}
              <path d="M 55,210 L 55,110 Q 55,55 110,55 L 220,55" fill="none" stroke="url(#elbowGrad)" strokeWidth="45" strokeLinecap="round"/>
              <path d="M 55,210 L 55,110 Q 55,55 110,55 L 220,55" fill="none" stroke={stdInfo.color} strokeWidth="2.5" strokeLinecap="round"/>
              
              {/* Center lines */}
              <line x1={55} y1={55} x2={55} y2={210} stroke={stdInfo.color} strokeWidth="1" strokeDasharray="6,3"/>
              <line x1={55} y1={55} x2={220} y2={55} stroke={stdInfo.color} strokeWidth="1" strokeDasharray="6,3"/>
              
              {/* Center point */}
              <circle cx={55} cy={55} r="5" fill={stdInfo.color}/>
              <text x={40} y={50} fill={stdInfo.color} fontSize="9" fontWeight="500">CL</text>
              
              {/* Radius indicator */}
              <path d="M 55,55 Q 85,55 110,75" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1" strokeDasharray="3,2"/>
              <text x={85} y={45} fill="hsl(var(--chart-3))" fontSize="8">R = {isShortRadius ? '1.0D' : '1.5D'}</text>
              
              {/* A dimension - vertical */}
              <line x1={25} y1={55} x2={25} y2={210} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <line x1={20} y1={55} x2={30} y2={55} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <line x1={20} y1={210} x2={30} y2={210} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <text x={10} y={135} fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold" transform="rotate(-90 10 135)">
                A = {aVal.toFixed(1)} {u}
              </text>
              
              {/* A dimension - horizontal */}
              <line x1={55} y1={225} x2={220} y2={225} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <line x1={55} y1={220} x2={55} y2={230} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <line x1={220} y1={220} x2={220} y2={230} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <text x={137} y={238} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold">
                A = {aVal.toFixed(1)} {u}
              </text>
              
              {/* 90° angle indicator */}
              <path d="M 55,75 L 75,75 L 75,55" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1"/>
              <text x={80} y={85} fill="hsl(var(--muted-foreground))" fontSize="8">90°</text>
            </>
          )}
        </svg>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-chart-2/10 border border-chart-2/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">A (C-E)</div>
          <div className="font-bold text-chart-2">{aVal.toFixed(1)} {u}</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">OD</div>
          <div className="font-semibold">{odVal.toFixed(1)} {u}</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{wt.toFixed(1)} {wu}</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3" style={{ borderColor: stdInfo.color }}>
          {stdInfo.name} • {elbow.size} • {elbow.type}
        </Badge>
      </div>
    </div>
  );
};

export const TeeVisualization = ({ tee, unitSystem, standard }: TeeVisualizationProps) => {
  if (!tee) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <CornerDownRight className="w-12 h-12 mx-auto mb-2 opacity-30 rotate-90" />
        <p className="text-sm">Select tee size</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const wu = getWeightUnit(unitSystem);
  const cVal = convertLength(tee.centerToEnd, unitSystem);
  const mVal = convertLength(tee.centerToBranch, unitSystem);
  const wt = convertWeight(tee.weight, unitSystem);
  const stdInfo = standardLabels[standard];
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-chart-4/10 via-muted/30 to-chart-4/5 rounded-xl p-4 border border-chart-4/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Equal Tee</span>
        </div>
        <svg viewBox="0 0 300 240" className="w-full max-w-sm mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="teeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stdInfo.color} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={stdInfo.color} stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Run (horizontal) */}
          <rect x={25} y={105} width={250} height={45} rx={6} fill="url(#teeGrad)" stroke={stdInfo.color} strokeWidth="2"/>
          
          {/* Branch (vertical) */}
          <rect x={127} y={25} width={45} height={85} rx={6} fill="url(#teeGrad)" stroke={stdInfo.color} strokeWidth="2"/>
          
          {/* Center lines */}
          <line x1={25} y1={127} x2={275} y2={127} stroke={stdInfo.color} strokeWidth="1" strokeDasharray="6,3"/>
          <line x1={150} y1={25} x2={150} y2={150} stroke={stdInfo.color} strokeWidth="1" strokeDasharray="6,3"/>
          
          {/* Center point */}
          <circle cx={150} cy={127} r="5" fill={stdInfo.color}/>
          
          {/* C dimension (run center to end) */}
          <line x1={150} y1={170} x2={275} y2={170} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <line x1={150} y1={165} x2={150} y2={175} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={275} y1={165} x2={275} y2={175} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={212} y={185} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold">
            C = {cVal.toFixed(1)} {u}
          </text>
          
          {/* M dimension (center to branch) */}
          <line x1={185} y1={25} x2={185} y2={127} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <line x1={180} y1={25} x2={190} y2={25} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={180} y1={127} x2={190} y2={127} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={200} y={80} fill="hsl(var(--chart-3))" fontSize="10" fontWeight="bold">
            M = {mVal.toFixed(1)} {u}
          </text>
          
          {/* Labels */}
          <text x={35} y={130} fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="500">RUN</text>
          <text x={155} y={45} fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="500">BRANCH</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-chart-4/10 border border-chart-4/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">C (Run)</div>
          <div className="font-bold text-chart-4">{cVal.toFixed(1)} {u}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">M (Branch)</div>
          <div className="font-bold text-chart-3">{mVal.toFixed(1)} {u}</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{wt.toFixed(1)} {wu}</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3" style={{ borderColor: stdInfo.color }}>
          {stdInfo.name} • {tee.size}
        </Badge>
      </div>
    </div>
  );
};

export const ReducerVisualization = ({ reducer, unitSystem, standard }: ReducerVisualizationProps) => {
  if (!reducer) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <CornerDownRight className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Select reducer sizes</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const wu = getWeightUnit(unitSystem);
  const lVal = convertLength(reducer.length, unitSystem);
  const largeOD = convertLength(reducer.largeEndOD, unitSystem);
  const smallOD = convertLength(reducer.smallEndOD, unitSystem);
  const wt = convertWeight(reducer.weight, unitSystem);
  const isEccentric = reducer.type === 'Eccentric';
  const stdInfo = standardLabels[standard];
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-chart-5/10 via-muted/30 to-chart-5/5 rounded-xl p-4 border border-chart-5/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isEccentric ? 'Eccentric' : 'Concentric'} Reducer
          </span>
        </div>
        <svg viewBox="0 0 300 220" className="w-full max-w-sm mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="reducerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stdInfo.color} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={stdInfo.color} stopOpacity="0.15"/>
            </linearGradient>
          </defs>
          
          {isEccentric ? (
            <>
              {/* Eccentric reducer - flat bottom */}
              <path d="M 35,145 L 35,75 L 95,75 L 165,95 L 265,95 L 265,145 L 165,145 L 95,145 Z" 
                fill="url(#reducerGrad)" stroke={stdInfo.color} strokeWidth="2"/>
              
              {/* Flat bottom line */}
              <line x1={35} y1={145} x2={265} y2={145} stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="5,3"/>
              <text x={150} y={165} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">FLAT ON BOTTOM</text>
            </>
          ) : (
            <>
              {/* Concentric reducer */}
              <path d="M 35,145 L 35,75 L 95,75 L 165,90 L 265,90 L 265,130 L 165,130 L 95,145 Z" 
                fill="url(#reducerGrad)" stroke={stdInfo.color} strokeWidth="2"/>
              
              {/* Center line */}
              <line x1={25} y1={110} x2={275} y2={110} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="6,3"/>
            </>
          )}
          
          {/* Large end dimension */}
          <line x1={35} y1={60} x2={35} y2={75} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={35} y1={145} x2={35} y2={160} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={22} y1={75} x2={48} y2={75} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={22} y1={145} x2={48} y2={145} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={18} y={110} fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold" transform="rotate(-90 18 110)">⌀{largeOD.toFixed(0)}</text>
          
          {/* Small end dimension */}
          <line x1={265} y1={75} x2={265} y2={isEccentric ? 95 : 90} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={265} y1={isEccentric ? 145 : 130} x2={265} y2={160} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={282} y={110} fill="hsl(var(--chart-3))" fontSize="10" fontWeight="bold" transform="rotate(-90 282 110)">⌀{smallOD.toFixed(0)}</text>
          
          {/* Length dimension */}
          <line x1={35} y1={180} x2={265} y2={180} stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <line x1={35} y1={175} x2={35} y2={185} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1={265} y1={175} x2={265} y2={185} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <text x={150} y={198} textAnchor="middle" fill="hsl(var(--primary))" fontSize="10" fontWeight="bold">
            L = {lVal.toFixed(1)} {u}
          </text>
        </svg>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Large</div>
          <div className="font-bold text-destructive">⌀{largeOD.toFixed(0)}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Small</div>
          <div className="font-bold text-chart-3">⌀{smallOD.toFixed(0)}</div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Length</div>
          <div className="font-bold text-primary">{lVal.toFixed(0)}</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{wt.toFixed(1)} {wu}</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3" style={{ borderColor: stdInfo.color }}>
          {stdInfo.name} • {reducer.sizeFrom} × {reducer.sizeTo} • {reducer.type}
        </Badge>
      </div>
    </div>
  );
};
