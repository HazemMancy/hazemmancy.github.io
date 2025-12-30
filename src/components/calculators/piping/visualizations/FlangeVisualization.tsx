import { Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FlangeStandard, UnitSystem, convertLength, getLengthUnit } from "../types";

interface FlangeData {
  size: string;
  nominalDN: number;
  pressureClass: string;
  outerDiameter: number;
  boltCircleDiameter: number;
  raisedFaceDiameter: number;
  hubDiameter: number;
  thickness: number;
  numBolts: number;
  boltSize: string;
  weight: number;
}

interface FlangeVisualizationProps {
  flange: FlangeData | undefined;
  standard: FlangeStandard;
  flangeType: string;
  unitSystem: UnitSystem;
}

export const FlangeVisualization = ({ flange, standard, flangeType, unitSystem }: FlangeVisualizationProps) => {
  if (!flange) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Circle className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Select size and pressure class</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const odVal = convertLength(flange.outerDiameter, unitSystem);
  const bcdVal = convertLength(flange.boltCircleDiameter, unitSystem);
  const rfVal = convertLength(flange.raisedFaceDiameter, unitSystem);
  const thkVal = convertLength(flange.thickness, unitSystem);
  const hubVal = convertLength(flange.hubDiameter, unitSystem);
  
  const cx = 150, cy = 130;
  const scale = 0.3;
  const od = Math.min(flange.outerDiameter * scale, 90);
  const bcd = (flange.boltCircleDiameter / flange.outerDiameter) * od;
  const rf = (flange.raisedFaceDiameter / flange.outerDiameter) * od;
  const hub = (flange.hubDiameter / flange.outerDiameter) * od;
  const bore = hub * 0.55;
  
  const isOrifice = standard === 'B16.36';
  
  const standardColors: Record<FlangeStandard, { accent: string; light: string; name: string }> = {
    'B16.5': { accent: 'hsl(var(--primary))', light: 'hsl(var(--primary) / 0.15)', name: 'ASME B16.5' },
    'B16.47A': { accent: 'hsl(200 70% 50%)', light: 'hsl(200 70% 50% / 0.15)', name: 'ASME B16.47 Series A' },
    'B16.47B': { accent: 'hsl(160 60% 45%)', light: 'hsl(160 60% 45% / 0.15)', name: 'ASME B16.47 Series B' },
    'B16.36': { accent: 'hsl(280 60% 55%)', light: 'hsl(280 60% 55% / 0.15)', name: 'ASME B16.36 Orifice' },
  };
  
  const colors = standardColors[standard];
  
  // Cross section dimensions
  const csWidth = 300;
  const csHeight = 150;
  const csFlgThk = Math.min(flange.thickness * 1.2, 40);
  const csFlgHeight = 85;
  const csHubLen = flangeType === 'wn' ? 50 : (flangeType === 'so' ? 25 : (flangeType === 'lap' ? 15 : 0));
  const csRfHeight = 4;
  
  const flangeTypeNames: Record<string, string> = {
    'wn': 'Weld Neck',
    'so': 'Slip-On',
    'bl': 'Blind',
    'lap': 'Lap Joint',
    'sw': 'Socket Weld',
    'thd': 'Threaded'
  };
  
  return (
    <div className="space-y-3">
      {/* Front View - Face */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Front View — Flange Face</span>
        </div>
        <svg viewBox="0 0 300 260" className="w-full max-w-[280px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id={`fGrad-${standard}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0.08"/>
            </linearGradient>
            <filter id="fShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15"/>
            </filter>
          </defs>
          
          {/* Outer flange */}
          <circle cx={cx} cy={cy} r={od} fill={`url(#fGrad-${standard})`} stroke={colors.accent} strokeWidth="2.5" filter="url(#fShadow)"/>
          
          {/* Bolt circle */}
          <circle cx={cx} cy={cy} r={bcd} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="6,3"/>
          
          {/* Raised face */}
          <circle cx={cx} cy={cy} r={rf} fill={colors.light} stroke={colors.accent} strokeWidth="1.5"/>
          
          {/* Orifice taps for B16.36 */}
          {isOrifice && (
            <>
              <circle cx={cx - rf * 0.7} cy={cy} r="6" fill="hsl(var(--background))" stroke="hsl(var(--destructive))" strokeWidth="2"/>
              <circle cx={cx + rf * 0.7} cy={cy} r="6" fill="hsl(var(--background))" stroke="hsl(var(--destructive))" strokeWidth="2"/>
              <text x={cx - rf * 0.7} y={cy - 12} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="7" fontWeight="bold">TAP</text>
              <text x={cx + rf * 0.7} y={cy - 12} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="7" fontWeight="bold">TAP</text>
            </>
          )}
          
          {/* Hub/bore - not shown for blind */}
          {flangeType !== 'bl' && (
            <circle cx={cx} cy={cy} r={bore} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          )}
          
          {/* Bolt holes */}
          {Array.from({ length: flange.numBolts }).map((_, i) => {
            const angle = (2 * Math.PI * i) / flange.numBolts - Math.PI/2;
            const bx = cx + bcd * Math.cos(angle);
            const by = cy + bcd * Math.sin(angle);
            const boltR = Math.max(4, od * 0.055);
            return (
              <circle key={i} cx={bx} cy={by} r={boltR} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.2"/>
            );
          })}
          
          {/* Dimensions */}
          {/* OD */}
          <line x1={cx - od} y1={cy + od + 18} x2={cx + od} y2={cy + od + 18} stroke="hsl(var(--destructive))" strokeWidth="1.2"/>
          <line x1={cx - od} y1={cy + od + 13} x2={cx - od} y2={cy + od + 23} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx + od} y1={cy + od + 13} x2={cx + od} y2={cy + od + 23} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx} y={cy + od + 34} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold">
            OD = {odVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
          </text>
          
          {/* BCD */}
          <line x1={cx} y1={cy} x2={cx + bcd * 0.85} y2={cy - bcd * 0.5} stroke="hsl(var(--chart-3))" strokeWidth="1" strokeDasharray="3,2"/>
          <text x={cx + bcd * 0.85 + 8} y={cy - bcd * 0.5 - 3} fill="hsl(var(--chart-3))" fontSize="8" fontWeight="600">
            BCD = {bcdVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
          </text>
          
          {/* RF */}
          <text x={cx} y={cy + 4} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            RF ⌀{rfVal.toFixed(0)}
          </text>
          
          {/* Center mark */}
          <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke={colors.accent} strokeWidth="0.8"/>
          <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke={colors.accent} strokeWidth="0.8"/>
        </svg>
      </div>
      
      {/* Cross Section View */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Cross Section — {flangeTypeNames[flangeType] || 'Weld Neck'}
          </span>
        </div>
        <svg viewBox={`0 0 ${csWidth} ${csHeight}`} className="w-full max-w-[300px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <pattern id={`hatch-${standard}`} width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="5" stroke={colors.accent} strokeWidth="0.7" strokeOpacity="0.5"/>
            </pattern>
          </defs>
          
          {/* Centerline */}
          <line x1="20" y1={csHeight/2} x2={csWidth - 20} y2={csHeight/2} stroke={colors.accent} strokeWidth="0.8" strokeDasharray="10,4"/>
          <text x="25" y={csHeight/2 - 6} fill={colors.accent} fontSize="8" fontWeight="500">CL</text>
          
          {/* Flange cross-section - positioned */}
          <g transform={`translate(${csWidth/2 - csFlgThk/2 - csHubLen/2}, 0)`}>
            {/* Hub/neck for weld neck flange */}
            {flangeType === 'wn' && (
              <polygon 
                points={`
                  0,${csHeight/2 - 20}
                  ${csHubLen},${csHeight/2 - csFlgHeight/2}
                  ${csHubLen},${csHeight/2}
                  0,${csHeight/2}
                `}
                fill={`url(#hatch-${standard})`}
                stroke={colors.accent}
                strokeWidth="1.5"
              />
            )}
            
            {/* Slip-on socket */}
            {flangeType === 'so' && (
              <rect 
                x={0} 
                y={csHeight/2 - 22} 
                width={csHubLen} 
                height={22}
                fill={`url(#hatch-${standard})`}
                stroke={colors.accent}
                strokeWidth="1.5"
              />
            )}
            
            {/* Socket weld bore */}
            {flangeType === 'sw' && (
              <>
                <rect x={0} y={csHeight/2 - 18} width={20} height={18} fill={`url(#hatch-${standard})`} stroke={colors.accent} strokeWidth="1.5"/>
                <rect x={5} y={csHeight/2 - 12} width={15} height={12} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              </>
            )}
            
            {/* Threaded bore */}
            {flangeType === 'thd' && (
              <>
                <rect x={0} y={csHeight/2 - 18} width={18} height={18} fill={`url(#hatch-${standard})`} stroke={colors.accent} strokeWidth="1.5"/>
                {/* Thread indication */}
                {[0,1,2,3,4].map(i => (
                  <line key={i} x1={3} y1={csHeight/2 - 16 + i*3.5} x2={15} y2={csHeight/2 - 16 + i*3.5} stroke={colors.accent} strokeWidth="0.5"/>
                ))}
              </>
            )}
            
            {/* Lap joint stub end indication */}
            {flangeType === 'lap' && (
              <path 
                d={`M 0,${csHeight/2 - 15} L ${csHubLen - 5},${csHeight/2 - 15} L ${csHubLen},${csHeight/2 - csFlgHeight/2 + 5} L ${csHubLen},${csHeight/2}`}
                fill={`url(#hatch-${standard})`}
                stroke={colors.accent}
                strokeWidth="1.5"
              />
            )}
            
            {/* Flange face - upper half only */}
            <rect 
              x={csHubLen} 
              y={csHeight/2 - csFlgHeight/2} 
              width={csFlgThk} 
              height={csFlgHeight/2}
              fill={`url(#hatch-${standard})`}
              stroke={colors.accent}
              strokeWidth="1.5"
            />
            
            {/* Raised face */}
            {flangeType !== 'bl' && (
              <rect 
                x={csHubLen + csFlgThk} 
                y={csHeight/2 - csFlgHeight/2 + 10} 
                width={csRfHeight} 
                height={csFlgHeight/2 - 10}
                fill={colors.accent}
                fillOpacity="0.6"
                stroke={colors.accent}
                strokeWidth="1"
              />
            )}
            
            {/* Bore (white space) - not for blind */}
            {flangeType !== 'bl' && (
              <rect 
                x={0} 
                y={csHeight/2 - 8} 
                width={csHubLen + csFlgThk + csRfHeight} 
                height={8}
                fill="hsl(var(--background))"
                stroke="none"
              />
            )}
            
            {/* Bolt hole */}
            <circle 
              cx={csHubLen + csFlgThk/2} 
              cy={csHeight/2 - csFlgHeight/2 + 14}
              r="5" 
              fill="hsl(var(--background))" 
              stroke="hsl(var(--foreground))" 
              strokeWidth="1.2"
            />
            
            {/* Dimension lines */}
            {/* Thickness */}
            <line x1={csHubLen} y1={csHeight - 10} x2={csHubLen + csFlgThk} y2={csHeight - 10} stroke="hsl(var(--chart-3))" strokeWidth="1.2"/>
            <line x1={csHubLen} y1={csHeight - 15} x2={csHubLen} y2={csHeight - 5} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
            <line x1={csHubLen + csFlgThk} y1={csHeight - 15} x2={csHubLen + csFlgThk} y2={csHeight - 5} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
            <text x={csHubLen + csFlgThk/2} y={csHeight - 2} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="8" fontWeight="bold">
              t = {thkVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
            </text>
            
            {/* OD height indicator */}
            <line x1={csHubLen + csFlgThk + csRfHeight + 18} y1={csHeight/2 - csFlgHeight/2} x2={csHubLen + csFlgThk + csRfHeight + 18} y2={csHeight/2} stroke="hsl(var(--destructive))" strokeWidth="1.2"/>
            <line x1={csHubLen + csFlgThk + csRfHeight + 13} y1={csHeight/2 - csFlgHeight/2} x2={csHubLen + csFlgThk + csRfHeight + 23} y2={csHeight/2 - csFlgHeight/2} stroke="hsl(var(--destructive))" strokeWidth="1"/>
            <text x={csHubLen + csFlgThk + csRfHeight + 28} y={csHeight/2 - csFlgHeight/4} fill="hsl(var(--destructive))" fontSize="8" fontWeight="bold">
              ⌀{odVal.toFixed(0)}
            </text>
            
            {/* Hub dimension for WN */}
            {flangeType === 'wn' && csHubLen > 0 && (
              <>
                <line x1={-8} y1={csHeight/2 - 20} x2={-8} y2={csHeight/2} stroke="hsl(var(--chart-4))" strokeWidth="1"/>
                <text x={-12} y={csHeight/2 - 6} fill="hsl(var(--chart-4))" fontSize="7" textAnchor="end">Hub ⌀{hubVal.toFixed(0)}</text>
              </>
            )}
          </g>
        </svg>
      </div>
      
      {/* Data Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg">
          <div className="text-[9px] text-muted-foreground font-medium uppercase">Outer Diameter</div>
          <div className="text-base font-bold text-primary">{odVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} <span className="text-[10px] font-normal">{u}</span></div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg">
          <div className="text-[9px] text-muted-foreground font-medium uppercase">Bolt Circle</div>
          <div className="text-base font-bold text-primary">{bcdVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} <span className="text-[10px] font-normal">{u}</span></div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border">
          <div className="text-[9px] text-muted-foreground uppercase">Bolting</div>
          <div className="font-semibold text-sm">{flange.numBolts} × {flange.boltSize}</div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border">
          <div className="text-[9px] text-muted-foreground uppercase">Thickness</div>
          <div className="font-semibold text-sm">{thkVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}</div>
        </div>
      </div>
      
      {/* Standard Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3" style={{ borderColor: colors.accent }}>
          {colors.name} • Class {flange.pressureClass} • {flange.size}
        </Badge>
      </div>
    </div>
  );
};
