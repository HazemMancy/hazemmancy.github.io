import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  pipeData, getUniquePipeSizes, getSchedulesForPipeSize, getPipeBySchedule,
  flangeData, flangeTypes, pressureClasses, getFlange,
  elbowData, teeData, reducerData,
  gasketData,
  valveData, valveTypes,
  lineBlankData,
  oletData, oletTypes,
  flexibilityData,
  safeSpanData,
  getUniqueSizes
} from "@/lib/pipingComponents";
import { Circle, Cylinder, CornerDownRight, Settings2, GitBranch, Disc, Gauge, Ban, Activity, Ruler, Globe } from "lucide-react";

// ==================== UNIT CONVERSION UTILITIES ====================
type UnitSystem = 'metric' | 'imperial';

const convertLength = (mm: number, system: UnitSystem): number => {
  return system === 'imperial' ? Math.round(mm / 25.4 * 1000) / 1000 : mm;
};

const convertWeight = (kg: number, system: UnitSystem): number => {
  return system === 'imperial' ? Math.round(kg * 2.20462 * 100) / 100 : kg;
};

const getLengthUnit = (system: UnitSystem): string => system === 'imperial' ? 'in' : 'mm';
const getWeightUnit = (system: UnitSystem): string => system === 'imperial' ? 'lb' : 'kg';

// ==================== MATERIALS LIST ====================
const materials = [
  { id: 'cs', name: 'Carbon Steel', spec: 'A105/A106 Gr.B' },
  { id: 'ss304', name: 'Stainless 304', spec: 'A182 F304/A312 TP304' },
  { id: 'ss316', name: 'Stainless 316', spec: 'A182 F316/A312 TP316' },
  { id: 'a11', name: 'Alloy Steel', spec: 'A182 F11/A335 P11' },
  { id: 'a22', name: 'Alloy Steel', spec: 'A182 F22/A335 P22' },
  { id: 'duplex', name: 'Duplex SS', spec: 'A182 F51/A790 S31803' },
  { id: 'inconel', name: 'Inconel 625', spec: 'B564 N06625' },
];

// ==================== UNIT SYSTEM HEADER ====================
const UnitSystemHeader = ({
  unitSystem,
  setUnitSystem,
  selectedMaterial,
  setSelectedMaterial
}: {
  unitSystem: UnitSystem;
  setUnitSystem: (s: UnitSystem) => void;
  selectedMaterial: string;
  setSelectedMaterial: (m: string) => void;
}) => (
  <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-xl border mb-6">
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">Units:</span>
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-xs ${unitSystem === 'metric' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>Metric</span>
      <Switch
        checked={unitSystem === 'imperial'}
        onCheckedChange={(checked) => setUnitSystem(checked ? 'imperial' : 'metric')}
      />
      <span className={`text-xs ${unitSystem === 'imperial' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>Imperial</span>
    </div>
    <div className="h-6 w-px bg-border mx-2" />
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Material:</span>
      <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
        <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border shadow-lg z-50">
          {materials.map(m => (
            <SelectItem key={m.id} value={m.id} className="text-xs">
              {m.name} ({m.spec})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

// ==================== PIPE VISUALIZATION ====================
const PipeVisualization = ({ 
  pipe, 
  unitSystem = 'metric' 
}: { 
  pipe: typeof pipeData[0] | undefined;
  unitSystem?: UnitSystem;
}) => {
  if (!pipe) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Cylinder className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select pipe size and schedule</p>
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
      <div className="bg-gradient-to-br from-blue-500/10 via-muted/30 to-cyan-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cross Section View</span>
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
              <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--primary))" strokeWidth="0.8" strokeOpacity="0.3"/>
            </pattern>
          </defs>
          
          {/* Outer circle with shadow */}
          <circle cx={cx} cy={cy} r={odR} fill="url(#pipeGradient)" stroke="hsl(var(--primary))" strokeWidth="2.5" filter="url(#pipeShadow)"/>
          
          {/* Wall thickness ring with hatch pattern */}
          <circle cx={cx} cy={cy} r={(odR + idR) / 2} fill="url(#pipeHatch)" stroke="none" strokeWidth={odR - idR}/>
          <circle cx={cx} cy={cy} r={odR} fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.5"/>
          
          {/* Inner circle (bore) */}
          <circle cx={cx} cy={cy} r={idR} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          
          {/* OD dimension line - left side */}
          <line x1={cx - odR - 15} y1={cy - odR} x2={cx - odR - 15} y2={cy + odR} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <line x1={cx - odR - 20} y1={cy - odR} x2={cx - odR - 10} y2={cy - odR} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx - odR - 20} y1={cy + odR} x2={cx - odR - 10} y2={cy + odR} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx - odR - 25} y={cy} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold" transform={`rotate(-90 ${cx - odR - 25} ${cy})`}>
            OD = {od.toFixed(unitSystem === 'imperial' ? 3 : 1)} {u}
          </text>
          
          {/* ID dimension line - bottom */}
          <line x1={cx - idR} y1={cy + odR + 25} x2={cx + idR} y2={cy + odR + 25} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <line x1={cx - idR} y1={cy + odR + 20} x2={cx - idR} y2={cy + odR + 30} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={cx + idR} y1={cy + odR + 20} x2={cx + idR} y2={cy + odR + 30} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={cx} y={cy + odR + 42} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="10" fontWeight="bold">
            ID = {id.toFixed(unitSystem === 'imperial' ? 3 : 1)} {u}
          </text>
          
          {/* Wall thickness indicator */}
          <line x1={cx + idR + 2} y1={cy - 25} x2={cx + odR - 2} y2={cy - 25} stroke="hsl(var(--chart-4))" strokeWidth="4" strokeLinecap="round"/>
          <line x1={cx + idR} y1={cy - 30} x2={cx + idR} y2={cy - 20} stroke="hsl(var(--chart-4))" strokeWidth="1"/>
          <line x1={cx + odR} y1={cy - 30} x2={cx + odR} y2={cy - 20} stroke="hsl(var(--chart-4))" strokeWidth="1"/>
          <text x={cx + odR + 10} y={cy - 22} fill="hsl(var(--chart-4))" fontSize="9" fontWeight="bold">
            t = {wt.toFixed(unitSystem === 'imperial' ? 3 : 2)} {u}
          </text>
          
          {/* Center mark */}
          <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <circle cx={cx} cy={cy} r="3" fill="hsl(var(--primary))"/>
          <text x={cx} y={cy - 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">CL</text>
        </svg>
      </div>
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

// ==================== FLANGE VISUALIZATION ====================
type FlangeStandard = 'B16.5' | 'B16.47A' | 'B16.47B' | 'B16.36';

const FlangeVisualization = ({ 
  flange, 
  standard = 'B16.5',
  flangeType = 'wn',
  unitSystem = 'metric'
}: { 
  flange: typeof flangeData[0] | undefined;
  standard?: FlangeStandard;
  flangeType?: string;
  unitSystem?: UnitSystem;
}) => {
  if (!flange) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Circle className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select size and class</p>
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
  
  const standardColors: Record<FlangeStandard, { accent: string; light: string }> = {
    'B16.5': { accent: 'hsl(var(--primary))', light: 'hsl(var(--primary) / 0.15)' },
    'B16.47A': { accent: 'hsl(200 70% 50%)', light: 'hsl(200 70% 50% / 0.15)' },
    'B16.47B': { accent: 'hsl(160 60% 45%)', light: 'hsl(160 60% 45% / 0.15)' },
    'B16.36': { accent: 'hsl(280 60% 55%)', light: 'hsl(280 60% 55% / 0.15)' },
  };
  
  const colors = standardColors[standard];
  
  // Cross section dimensions
  const csWidth = 300;
  const csHeight = 140;
  const csFlgThk = Math.min(flange.thickness * 1.2, 35);
  const csFlgHeight = 80;
  const csHubLen = flangeType === 'wn' ? 45 : (flangeType === 'so' ? 20 : 0);
  const csRfHeight = 3;
  
  return (
    <div className="space-y-3">
      {/* Front View - Face */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Front View</span>
        </div>
        <svg viewBox="0 0 300 260" className="w-full max-w-[280px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id={`fGrad-${standard}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.2"/>
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0.05"/>
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
              <circle cx={cx - rf * 0.65} cy={cy} r="5" fill="hsl(var(--background))" stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <circle cx={cx + rf * 0.65} cy={cy} r="5" fill="hsl(var(--background))" stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <text x={cx - rf * 0.65} y={cy - 10} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="7" fontWeight="bold">TAP</text>
              <text x={cx + rf * 0.65} y={cy - 10} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="7" fontWeight="bold">TAP</text>
            </>
          )}
          
          {/* Hub/bore */}
          <circle cx={cx} cy={cy} r={bore} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          
          {/* Bolt holes */}
          {Array.from({ length: flange.numBolts }).map((_, i) => {
            const angle = (2 * Math.PI * i) / flange.numBolts - Math.PI/2;
            const bx = cx + bcd * Math.cos(angle);
            const by = cy + bcd * Math.sin(angle);
            const boltR = Math.max(3.5, od * 0.05);
            return (
              <g key={i}>
                <circle cx={bx} cy={by} r={boltR} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.2"/>
              </g>
            );
          })}
          
          {/* Dimensions */}
          {/* OD */}
          <line x1={cx - od} y1={cy + od + 18} x2={cx + od} y2={cy + od + 18} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx - od} y1={cy + od + 13} x2={cx - od} y2={cy + od + 23} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx + od} y1={cy + od + 13} x2={cx + od} y2={cy + od + 23} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx} y={cy + od + 32} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold">
            OD = {odVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
          </text>
          
          {/* BCD */}
          <line x1={cx} y1={cy} x2={cx + bcd * 0.9} y2={cy - bcd * 0.4} stroke="hsl(var(--chart-3))" strokeWidth="1" strokeDasharray="3,2"/>
          <text x={cx + bcd * 0.9 + 5} y={cy - bcd * 0.4 - 3} fill="hsl(var(--chart-3))" fontSize="8" fontWeight="600">
            BCD = {bcdVal.toFixed(unitSystem === 'imperial' ? 2 : 0)}
          </text>
          
          {/* RF */}
          <text x={cx} y={cy + 4} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            RF ⌀{rfVal.toFixed(0)}
          </text>
          
          {/* Center mark */}
          <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke={colors.accent} strokeWidth="0.8"/>
          <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke={colors.accent} strokeWidth="0.8"/>
        </svg>
      </div>
      
      {/* Cross Section View */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cross Section (Half)</span>
        </div>
        <svg viewBox={`0 0 ${csWidth} ${csHeight}`} className="w-full max-w-[300px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <pattern id={`hatch-${standard}`} width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="5" stroke={colors.accent} strokeWidth="0.6" strokeOpacity="0.4"/>
            </pattern>
          </defs>
          
          {/* Centerline */}
          <line x1="20" y1={csHeight/2} x2={csWidth - 20} y2={csHeight/2} stroke={colors.accent} strokeWidth="0.8" strokeDasharray="10,4"/>
          <text x="25" y={csHeight/2 - 5} fill={colors.accent} fontSize="8" fontWeight="500">CL</text>
          
          {/* Flange cross-section - positioned */}
          <g transform={`translate(${csWidth/2 - csFlgThk/2 - csHubLen/2}, 0)`}>
            {/* Hub/neck for weld neck flange */}
            {flangeType === 'wn' && (
              <polygon 
                points={`
                  0,${csHeight/2 - 18}
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
                y={csHeight/2 - 20} 
                width={csHubLen} 
                height={20}
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
            <rect 
              x={csHubLen + csFlgThk} 
              y={csHeight/2 - csFlgHeight/2 + 8} 
              width={csRfHeight} 
              height={csFlgHeight/2 - 8}
              fill={colors.accent}
              fillOpacity="0.5"
              stroke={colors.accent}
              strokeWidth="1"
            />
            
            {/* Bore (white space) */}
            <rect 
              x={0} 
              y={csHeight/2 - 8} 
              width={csHubLen + csFlgThk + csRfHeight} 
              height={8}
              fill="hsl(var(--background))"
              stroke="none"
            />
            
            {/* Bolt hole */}
            <circle 
              cx={csHubLen + csFlgThk/2} 
              cy={csHeight/2 - csFlgHeight/2 + 12}
              r="4" 
              fill="hsl(var(--background))" 
              stroke="hsl(var(--foreground))" 
              strokeWidth="1"
            />
            
            {/* Dimension lines */}
            {/* Thickness */}
            <line x1={csHubLen} y1={csHeight - 8} x2={csHubLen + csFlgThk} y2={csHeight - 8} stroke="hsl(var(--chart-3))" strokeWidth="1.2"/>
            <line x1={csHubLen} y1={csHeight - 13} x2={csHubLen} y2={csHeight - 3} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
            <line x1={csHubLen + csFlgThk} y1={csHeight - 13} x2={csHubLen + csFlgThk} y2={csHeight - 3} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
            <text x={csHubLen + csFlgThk/2} y={csHeight - 2} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="8" fontWeight="bold">
              t = {thkVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
            </text>
            
            {/* OD height */}
            <line x1={csHubLen + csFlgThk + csRfHeight + 15} y1={csHeight/2 - csFlgHeight/2} x2={csHubLen + csFlgThk + csRfHeight + 15} y2={csHeight/2} stroke="hsl(var(--destructive))" strokeWidth="1.2"/>
            <line x1={csHubLen + csFlgThk + csRfHeight + 10} y1={csHeight/2 - csFlgHeight/2} x2={csHubLen + csFlgThk + csRfHeight + 20} y2={csHeight/2 - csFlgHeight/2} stroke="hsl(var(--destructive))" strokeWidth="1"/>
            <text x={csHubLen + csFlgThk + csRfHeight + 25} y={csHeight/2 - csFlgHeight/4} fill="hsl(var(--destructive))" fontSize="8" fontWeight="bold">
              ⌀{odVal.toFixed(0)}
            </text>
            
            {/* Hub */}
            {flangeType === 'wn' && csHubLen > 0 && (
              <>
                <line x1={-5} y1={csHeight/2 - 18} x2={-5} y2={csHeight/2} stroke="hsl(var(--chart-4))" strokeWidth="1"/>
                <text x={-8} y={csHeight/2 - 5} fill="hsl(var(--chart-4))" fontSize="7" textAnchor="end">Hub ⌀{hubVal.toFixed(0)}</text>
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
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          ASME {standard} • Class {flange.pressureClass} • {flange.size}
        </Badge>
      </div>
    </div>
  );
};

// ==================== ELBOW VISUALIZATION ====================
const ElbowVisualization = ({ elbow, unitSystem = 'metric' }: { elbow: typeof elbowData[0] | undefined; unitSystem?: UnitSystem }) => {
  if (!elbow) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select elbow</div>;
  
  const u = getLengthUnit(unitSystem);
  const aVal = convertLength(elbow.centerToEnd, unitSystem);
  const odVal = convertLength(elbow.outerDiameter, unitSystem);
  const is45 = elbow.type.includes('45');
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-green-500/10 via-muted/30 to-emerald-500/10 rounded-xl p-4 border border-primary/20">
        <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="elbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {is45 ? (
            <>
              <path d="M 80,180 L 80,130 Q 80,80 120,60 L 180,30" fill="none" stroke="url(#elbowGrad)" strokeWidth="35" strokeLinecap="round"/>
              <path d="M 80,180 L 80,130 Q 80,80 120,60 L 180,30" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="2" strokeLinecap="round"/>
              <line x1={50} y1={130} x2={50} y2={180} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <text x={200} y={130} fill="hsl(var(--muted-foreground))" fontSize="10">A = {aVal.toFixed(1)} {u}</text>
              <text x={200} y={150} fill="hsl(var(--muted-foreground))" fontSize="10">OD = {odVal.toFixed(1)} {u}</text>
              <text x={200} y={170} fill="hsl(var(--muted-foreground))" fontSize="10">45° LR</text>
            </>
          ) : (
            <>
              <path d="M 60,190 L 60,120 Q 60,60 120,60 L 200,60" fill="none" stroke="url(#elbowGrad)" strokeWidth="40" strokeLinecap="round"/>
              <path d="M 60,190 L 60,120 Q 60,60 120,60 L 200,60" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx={60} cy={60} r="4" fill="hsl(var(--primary))"/>
              <text x={45} y={55} fill="hsl(var(--primary))" fontSize="9">CL</text>
              <line x1={30} y1={60} x2={30} y2={190} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <line x1={25} y1={60} x2={35} y2={60} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <line x1={25} y1={190} x2={35} y2={190} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <text x={15} y={130} fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold" transform="rotate(-90 15 130)">A = {aVal.toFixed(1)}</text>
              <line x1={60} y1={200} x2={200} y2={200} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
              <text x={130} y={215} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="10" fontWeight="bold">A = {aVal.toFixed(1)} {u}</text>
              <text x={220} y={100} fill="hsl(var(--muted-foreground))" fontSize="10">90° LR</text>
              <text x={220} y={115} fill="hsl(var(--muted-foreground))" fontSize="10">R = 1.5D</text>
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
          <div className="font-semibold">{convertWeight(elbow.weight, unitSystem).toFixed(1)} {getWeightUnit(unitSystem)}</div>
        </div>
      </div>
    </div>
  );
};

// ==================== TEE VISUALIZATION ====================
const TeeVisualization = ({ tee, unitSystem = 'metric' }: { tee: typeof teeData[0] | undefined; unitSystem?: UnitSystem }) => {
  if (!tee) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select tee</div>;
  
  const u = getLengthUnit(unitSystem);
  const cVal = convertLength(tee.centerToEnd, unitSystem);
  const mVal = convertLength(tee.centerToBranch, unitSystem);
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-500/10 via-muted/30 to-violet-500/10 rounded-xl p-4 border border-primary/20">
        <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="teeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          <rect x={30} y={95} width={220} height={40} rx={5} fill="url(#teeGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
          <rect x={120} y={20} width={40} height={75} rx={5} fill="url(#teeGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
          
          <line x1={30} y1={115} x2={250} y2={115} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,3"/>
          <line x1={140} y1={20} x2={140} y2={135} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,3"/>
          <circle cx={140} cy={115} r="5" fill="hsl(var(--primary))"/>
          
          <line x1={140} y1={150} x2={250} y2={150} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <text x={195} y={165} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold">C = {cVal.toFixed(1)} {u}</text>
          
          <line x1={170} y1={20} x2={170} y2={115} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <text x={185} y={70} fill="hsl(var(--chart-3))" fontSize="10" fontWeight="bold">M = {mVal.toFixed(1)}</text>
          
          <text x={35} y={118} fill="hsl(var(--muted-foreground))" fontSize="9">RUN</text>
          <text x={145} y={35} fill="hsl(var(--muted-foreground))" fontSize="9">BRANCH</text>
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
          <div className="font-semibold">{convertWeight(tee.weight, unitSystem).toFixed(1)} {getWeightUnit(unitSystem)}</div>
        </div>
      </div>
    </div>
  );
};

// ==================== REDUCER VISUALIZATION ====================
const ReducerVisualization = ({ reducer }: { reducer: typeof reducerData[0] | undefined }) => {
  if (!reducer) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select reducer</div>;
  
  const isEccentric = reducer.type === 'Eccentric';
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-500/10 via-muted/30 to-orange-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 280 200" className="w-full max-w-sm mx-auto">
          <defs>
            <linearGradient id="reducerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity="0.15"/>
            </linearGradient>
          </defs>
          
          {isEccentric ? (
            <>
              {/* Eccentric reducer */}
              <path d="M 40,130 L 40,70 L 100,70 L 160,85 L 240,85 L 240,130 L 160,130 L 100,130 Z" 
                fill="url(#reducerGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Flat bottom line */}
              <line x1={40} y1={130} x2={240} y2={130} stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4,2"/>
              <text x={140} y={150} textAnchor="middle" className="text-[9px] fill-muted-foreground">FLAT ON BOTTOM</text>
            </>
          ) : (
            <>
              {/* Concentric reducer */}
              <path d="M 40,130 L 40,70 L 100,70 L 160,80 L 240,80 L 240,120 L 160,120 L 100,130 Z" 
                fill="url(#reducerGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Center line */}
              <line x1={30} y1={100} x2={250} y2={100} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,3"/>
            </>
          )}
          
          {/* Large end dimension */}
          <line x1={40} y1={55} x2={40} y2={70} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={40} y1={130} x2={40} y2={145} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={25} y1={70} x2={55} y2={70} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={25} y1={130} x2={55} y2={130} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={20} y={100} className="text-[10px] fill-destructive font-bold" transform="rotate(-90 20 100)">∅{reducer.largeEndOD}</text>
          
          {/* Small end dimension */}
          <line x1={240} y1={65} x2={240} y2={80} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={240} y1={120} x2={240} y2={135} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={260} y={100} className="text-[10px] fill-chart-3 font-bold" transform="rotate(-90 260 100)">∅{reducer.smallEndOD}</text>
          
          {/* Length dimension */}
          <line x1={40} y1={160} x2={240} y2={160} stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <line x1={40} y1={155} x2={40} y2={165} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1={240} y1={155} x2={240} y2={165} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <text x={140} y={175} textAnchor="middle" className="text-[10px] fill-primary font-bold">L = {reducer.length} mm</text>
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Large</div>
          <div className="font-bold text-destructive">{reducer.largeEndOD}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Small</div>
          <div className="font-bold text-chart-3">{reducer.smallEndOD}</div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Length</div>
          <div className="font-bold text-primary">{reducer.length}</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{reducer.weight} kg</div>
        </div>
      </div>
    </div>
  );
};

// ==================== GASKET VISUALIZATION ====================
type GasketStandard = 'flat' | 'spiral' | 'rtj';

const GasketVisualization = ({ 
  gasket, 
  gasketType = 'spiral',
  unitSystem = 'metric' 
}: { 
  gasket: typeof gasketData[0] | undefined;
  gasketType?: GasketStandard;
  unitSystem?: UnitSystem;
}) => {
  if (!gasket) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Disc className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select size and class</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const idVal = convertLength(gasket.innerDiameter, unitSystem);
  const odVal = convertLength(gasket.outerDiameter, unitSystem);
  const thkVal = convertLength(gasket.thickness, unitSystem);
  
  const cx = 140, cy = 115;
  const scale = 0.4;
  const od = Math.min(gasket.outerDiameter * scale, 85);
  const id = (gasket.innerDiameter / gasket.outerDiameter) * od;
  
  const typeColors: Record<GasketStandard, { accent: string; light: string; name: string; std: string }> = {
    'flat': { accent: 'hsl(200 60% 50%)', light: 'hsl(200 60% 50% / 0.2)', name: 'Flat (Non-Metallic)', std: 'ASME B16.21' },
    'spiral': { accent: 'hsl(160 55% 45%)', light: 'hsl(160 55% 45% / 0.2)', name: 'Spiral Wound', std: 'ASME B16.20' },
    'rtj': { accent: 'hsl(280 50% 55%)', light: 'hsl(280 50% 55% / 0.2)', name: 'Ring Type Joint', std: 'ASME B16.20' },
  };
  
  const colors = typeColors[gasketType];
  
  return (
    <div className="space-y-3">
      {/* Front View */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Front View - {colors.name}</span>
        </div>
        <svg viewBox="0 0 280 230" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id={`gGrad-${gasketType}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0.08"/>
            </linearGradient>
            {gasketType === 'spiral' && (
              <pattern id="spiralPattern2" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.8" fill={colors.accent} fillOpacity="0.4"/>
              </pattern>
            )}
            <filter id="gShadow">
              <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.15"/>
            </filter>
          </defs>
          
          {/* Outer ring */}
          <circle cx={cx} cy={cy} r={od} fill={`url(#gGrad-${gasketType})`} stroke={colors.accent} strokeWidth="2" filter="url(#gShadow)"/>
          
          {/* Spiral windings pattern */}
          {gasketType === 'spiral' && (
            <>
              <circle cx={cx} cy={cy} r={(od + id) / 2} fill="url(#spiralPattern2)" stroke="none"/>
              {[...Array(5)].map((_, i) => (
                <circle key={i} cx={cx} cy={cy} r={id + ((od - id) * (i + 1)) / 6} fill="none" stroke={colors.accent} strokeWidth="0.5" strokeOpacity="0.3"/>
              ))}
            </>
          )}
          
          {/* RTJ profile indicator */}
          {gasketType === 'rtj' && (
            <circle cx={cx} cy={cy} r={(od + id) / 2} fill="none" stroke={colors.accent} strokeWidth={(od - id) * 0.4} strokeOpacity="0.5"/>
          )}
          
          {/* Inner bore */}
          <circle cx={cx} cy={cy} r={id} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* OD dimension */}
          <line x1={cx - od} y1={cy + od + 15} x2={cx + od} y2={cy + od + 15} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx - od} y1={cy + od + 10} x2={cx - od} y2={cy + od + 20} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx + od} y1={cy + od + 10} x2={cx + od} y2={cy + od + 20} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx} y={cy + od + 30} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold">
            OD = {odVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
          </text>
          
          {/* ID dimension */}
          <line x1={cx - id} y1={cy} x2={cx + id} y2={cy} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="8" fontWeight="600">
            ID = {idVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
          </text>
          
          {/* Center mark */}
          <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke={colors.accent} strokeWidth="0.8"/>
          <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke={colors.accent} strokeWidth="0.8"/>
        </svg>
      </div>
      
      {/* Cross Section View */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cross Section</span>
        </div>
        <svg viewBox="0 0 280 80" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <pattern id={`hatch-g-${gasketType}`} width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="4" stroke={colors.accent} strokeWidth="0.5" strokeOpacity="0.5"/>
            </pattern>
          </defs>
          
          {/* Flange surfaces (context) */}
          <rect x={30} y={15} width={220} height={12} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          <rect x={30} y={53} width={220} height={12} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          
          {gasketType === 'flat' && (
            <rect x={70} y={27} width={140} height={26} fill={`url(#hatch-g-${gasketType})`} stroke={colors.accent} strokeWidth="1.5"/>
          )}
          
          {gasketType === 'spiral' && (
            <>
              {/* Inner ring */}
              <rect x={70} y={30} width={8} height={20} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              {/* Spiral section */}
              <rect x={78} y={28} width={124} height={24} fill={`url(#hatch-g-${gasketType})`} stroke={colors.accent} strokeWidth="1.5"/>
              {/* Outer ring */}
              <rect x={202} y={30} width={8} height={20} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
            </>
          )}
          
          {gasketType === 'rtj' && (
            <ellipse cx={140} cy={40} rx={60} ry={12} fill={colors.light} stroke={colors.accent} strokeWidth="2"/>
          )}
          
          {/* Thickness dimension */}
          <line x1={225} y1={27} x2={225} y2={53} stroke="hsl(var(--chart-4))" strokeWidth="1.5"/>
          <line x1={220} y1={27} x2={230} y2={27} stroke="hsl(var(--chart-4))" strokeWidth="1"/>
          <line x1={220} y1={53} x2={230} y2={53} stroke="hsl(var(--chart-4))" strokeWidth="1"/>
          <text x={245} y={44} fill="hsl(var(--chart-4))" fontSize="9" fontWeight="bold">
            t = {thkVal.toFixed(1)} {u}
          </text>
        </svg>
      </div>
      
      {/* Data Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground font-medium uppercase">Inner Dia</div>
          <div className="text-sm font-bold text-primary">{idVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} <span className="text-[9px] font-normal">{u}</span></div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground font-medium uppercase">Outer Dia</div>
          <div className="text-sm font-bold text-primary">{odVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} <span className="text-[9px] font-normal">{u}</span></div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Thickness</div>
          <div className="font-semibold text-sm">{thkVal.toFixed(1)} {u}</div>
        </div>
      </div>
      
      {/* Standard Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          {colors.std} • Class {gasket.pressureClass} • {gasket.size}
        </Badge>
      </div>
    </div>
  );
};

// ==================== VALVE VISUALIZATION ====================
type ValveEndType = 'flanged' | 'buttweld' | 'threaded' | 'socketweld';

const ValveVisualization = ({ 
  valve, 
  endType = 'flanged',
  unitSystem = 'metric' 
}: { 
  valve: typeof valveData[0] | undefined;
  endType?: ValveEndType;
  unitSystem?: UnitSystem;
}) => {
  if (!valve) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Settings2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select size and type</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const wu = getWeightUnit(unitSystem);
  const ffVal = convertLength(valve.faceToFace, unitSystem);
  const htVal = convertLength(valve.height, unitSystem);
  const wtVal = convertWeight(valve.weight, unitSystem);
  
  const endTypeInfo: Record<ValveEndType, { name: string; std: string }> = {
    'flanged': { name: 'Flanged', std: 'ASME B16.10' },
    'buttweld': { name: 'Butt Weld', std: 'ASME B16.10' },
    'threaded': { name: 'Threaded', std: 'ASME B1.20.1' },
    'socketweld': { name: 'Socket Weld', std: 'ASME B16.11' },
  };
  
  const info = endTypeInfo[endType];
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-rose-500/10 via-muted/30 to-pink-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{valve.type} Valve - {info.name} Ends</span>
        </div>
        <svg viewBox="0 0 300 240" className="w-full max-w-[280px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="valveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity="0.08"/>
            </linearGradient>
            <filter id="vShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15"/>
            </filter>
          </defs>
          
          {valve.type === 'Gate' && (
            <>
              {/* Body */}
              <path d="M 70,175 L 70,115 L 120,100 L 180,100 L 230,115 L 230,175 L 180,185 L 120,185 Z" 
                fill="url(#valveGrad2)" stroke="hsl(var(--chart-5))" strokeWidth="2" filter="url(#vShadow)"/>
              {/* End connections based on type */}
              {endType === 'flanged' && (
                <>
                  <rect x={45} y={125} width={30} height={40} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                  <rect x={225} y={125} width={30} height={40} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                </>
              )}
              {endType === 'buttweld' && (
                <>
                  <path d="M 55,125 L 70,130 L 70,160 L 55,165" fill="none" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
                  <path d="M 245,125 L 230,130 L 230,160 L 245,165" fill="none" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
                </>
              )}
              {(endType === 'threaded' || endType === 'socketweld') && (
                <>
                  <rect x={55} y={132} width={18} height={26} rx={3} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5" strokeDasharray={endType === 'threaded' ? "3,2" : "0"}/>
                  <rect x={227} y={132} width={18} height={26} rx={3} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5" strokeDasharray={endType === 'threaded' ? "3,2" : "0"}/>
                </>
              )}
              {/* Bonnet & Yoke */}
              <path d="M 130,100 L 130,65 L 170,65 L 170,100" fill="url(#valveGrad2)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <rect x={140} y={25} width={20} height={45} fill="hsl(var(--foreground)/0.2)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              {/* Handwheel */}
              <ellipse cx={150} cy={25} rx={35} ry={8} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Gate/wedge */}
              <rect x={142} y={75} width={16} height={55} fill="hsl(var(--primary)/0.3)" stroke="hsl(var(--primary))" strokeWidth="1"/>
            </>
          )}
          
          {valve.type === 'Globe' && (
            <>
              {/* Body - globe shape */}
              <ellipse cx={150} cy={145} rx={70} ry={45} fill="url(#valveGrad2)" stroke="hsl(var(--chart-5))" strokeWidth="2" filter="url(#vShadow)"/>
              {/* End connections */}
              {endType === 'flanged' && (
                <>
                  <rect x={55} y={125} width={30} height={40} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                  <rect x={215} y={125} width={30} height={40} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                </>
              )}
              {/* Bonnet */}
              <path d="M 130,100 L 130,70 L 170,70 L 170,100" fill="url(#valveGrad2)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Stem */}
              <rect x={142} y={25} width={16} height={50} fill="hsl(var(--foreground)/0.2)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              {/* Handwheel */}
              <ellipse cx={150} cy={25} rx={32} ry={7} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Disc */}
              <circle cx={150} cy={130} r={12} fill="hsl(var(--primary)/0.3)" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
            </>
          )}
          
          {valve.type === 'Ball' && (
            <>
              {/* Body */}
              <rect x={80} y={110} width={140} height={70} rx={10} fill="url(#valveGrad2)" stroke="hsl(var(--chart-5))" strokeWidth="2" filter="url(#vShadow)"/>
              {/* Ball */}
              <circle cx={150} cy={145} r={28} fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <rect x={145} y={117} width={10} height={56} fill="hsl(var(--background))" stroke="none"/>
              {/* End connections */}
              {endType === 'flanged' && (
                <>
                  <rect x={55} y={120} width={30} height={50} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                  <rect x={215} y={120} width={30} height={50} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                </>
              )}
              {/* Stem & handle */}
              <rect x={145} y={75} width={10} height={40} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              <rect x={115} y={65} width={70} height={15} rx={3} fill="hsl(var(--chart-5)/0.3)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
            </>
          )}
          
          {valve.type === 'Check' && (
            <>
              {/* Body */}
              <path d="M 75,175 L 75,120 L 150,100 L 225,120 L 225,175 L 150,190 Z" fill="url(#valveGrad2)" stroke="hsl(var(--chart-5))" strokeWidth="2" filter="url(#vShadow)"/>
              {/* Swing disc */}
              <line x1={150} y1={105} x2={150} y2={175} stroke="hsl(var(--foreground)/0.5)" strokeWidth="1" strokeDasharray="4,2"/>
              <ellipse cx={165} cy={145} rx={22} ry={35} fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="1.5" transform="rotate(12 165 145)"/>
              {/* End connections */}
              {endType === 'flanged' && (
                <>
                  <rect x={50} y={125} width={30} height={40} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                  <rect x={220} y={125} width={30} height={40} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                </>
              )}
              {/* Flow arrow */}
              <path d="M 95,145 L 130,145 M 125,138 L 133,145 L 125,152" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
            </>
          )}
          
          {/* Face-to-Face dimension */}
          <line x1={55} y1={205} x2={245} y2={205} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <line x1={55} y1={200} x2={55} y2={210} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={245} y1={200} x2={245} y2={210} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={150} y={220} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="10" fontWeight="bold">
            F-F = {ffVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
          </text>
          
          {/* Height dimension */}
          <line x1={270} y1={25} x2={270} y2={175} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <line x1={265} y1={25} x2={275} y2={25} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={265} y1={175} x2={275} y2={175} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={280} y={105} fill="hsl(var(--chart-3))" fontSize="9" fontWeight="bold" transform="rotate(-90 280 105)">
            H = {htVal.toFixed(0)} {u}
          </text>
        </svg>
      </div>
      
      {/* Data Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/30 p-2.5 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground font-medium uppercase">Face-to-Face</div>
          <div className="text-sm font-bold text-destructive">{ffVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} <span className="text-[9px] font-normal">{u}</span></div>
        </div>
        <div className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border border-chart-3/30 p-2.5 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground font-medium uppercase">Height</div>
          <div className="text-sm font-bold text-chart-3">{htVal.toFixed(0)} <span className="text-[9px] font-normal">{u}</span></div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Weight</div>
          <div className="font-semibold text-sm">{wtVal.toFixed(1)} {wu}</div>
        </div>
      </div>
      
      {/* Standard Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          {info.std} • {valve.type} • Class {valve.pressureClass} • {valve.size}
        </Badge>
      </div>
    </div>
  );
};

// ==================== SPECTACLE BLIND VISUALIZATION ====================
const SpectacleBlindVisualization = ({ 
  blank, 
  unitSystem = 'metric' 
}: { 
  blank: typeof lineBlankData[0] | undefined;
  unitSystem?: UnitSystem;
}) => {
  if (!blank) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Ban className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select size and class</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const wu = getWeightUnit(unitSystem);
  const odVal = convertLength(blank.outerDiameter, unitSystem);
  const thkVal = convertLength(blank.thickness, unitSystem);
  const hlVal = convertLength(blank.handleLength, unitSystem);
  const wtVal = convertWeight(blank.weight, unitSystem);
  
  const scale = 0.16;
  const od = Math.min(blank.outerDiameter * scale, 45);
  
  return (
    <div className="space-y-3">
      {/* Plan View */}
      <div className="bg-gradient-to-br from-slate-500/10 via-muted/30 to-gray-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Spectacle Blind - ASME B16.48</span>
        </div>
        <svg viewBox="0 0 340 160" className="w-full max-w-[320px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="blindGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.12"/>
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.04"/>
            </linearGradient>
            <pattern id="blindHatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="5" stroke="hsl(var(--foreground))" strokeWidth="0.5" strokeOpacity="0.3"/>
            </pattern>
            <filter id="bShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.12"/>
            </filter>
          </defs>
          
          {/* Spacer ring (left) */}
          <circle cx={75} cy={80} r={od} fill="url(#blindGrad2)" stroke="hsl(var(--foreground))" strokeWidth="2" filter="url(#bShadow)"/>
          <circle cx={75} cy={80} r={od * 0.55} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          <text x={75} y={83} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontWeight="500">SPACER</text>
          
          {/* Handle bar */}
          <rect x={115} y={65} width={110} height={30} rx={4} fill="url(#blindGrad2)" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* Blind disc (right) */}
          <circle cx={265} cy={80} r={od} fill="url(#blindHatch)" stroke="hsl(var(--foreground))" strokeWidth="2" filter="url(#bShadow)"/>
          <text x={265} y={83} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontWeight="500">BLIND</text>
          
          {/* OD dimension */}
          <line x1={265 - od} y1={130} x2={265 + od} y2={130} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={265 - od} y1={125} x2={265 - od} y2={135} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={265 + od} y1={125} x2={265 + od} y2={135} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={265} y={145} textAnchor="middle" fontSize="9" fill="hsl(var(--destructive))" fontWeight="bold">
            OD = {odVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
          </text>
          
          {/* Handle length */}
          <line x1={75 - od} y1={25} x2={265 + od} y2={25} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={75 - od} y1={20} x2={75 - od} y2={30} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={265 + od} y1={20} x2={265 + od} y2={30} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={170} y={18} textAnchor="middle" fontSize="9" fill="hsl(var(--chart-3))" fontWeight="bold">
            L = {hlVal.toFixed(unitSystem === 'imperial' ? 2 : 0)} {u}
          </text>
        </svg>
      </div>
      
      {/* Cross Section */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cross Section</span>
        </div>
        <svg viewBox="0 0 280 60" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          {/* Flange context */}
          <rect x={30} y={8} width={90} height={14} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          <rect x={160} y={8} width={90} height={14} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          <rect x={30} y={38} width={90} height={14} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          <rect x={160} y={38} width={90} height={14} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          
          {/* Blind plate */}
          <rect x={120} y={22} width={40} height={16} fill="hsl(var(--foreground)/0.2)" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* Thickness dimension */}
          <line x1={165} y1={22} x2={165} y2={38} stroke="hsl(var(--chart-4))" strokeWidth="1.5"/>
          <text x={175} y={33} fontSize="8" fill="hsl(var(--chart-4))" fontWeight="bold">t = {thkVal.toFixed(1)} {u}</text>
        </svg>
      </div>
      
      {/* Data Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground font-medium uppercase">OD</div>
          <div className="text-xs font-bold text-destructive">{odVal.toFixed(0)}</div>
        </div>
        <div className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border border-chart-3/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground font-medium uppercase">Length</div>
          <div className="text-xs font-bold text-chart-3">{hlVal.toFixed(0)}</div>
        </div>
        <div className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border border-chart-4/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground font-medium uppercase">Thick</div>
          <div className="text-xs font-bold text-chart-4">{thkVal.toFixed(1)}</div>
        </div>
        <div className="bg-muted/50 p-2 rounded-lg border text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Weight</div>
          <div className="text-xs font-semibold">{wtVal.toFixed(1)} {wu}</div>
        </div>
      </div>
      
      {/* Standard Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          ASME B16.48 • Class {blank.pressureClass} • {blank.size}
        </Badge>
      </div>
    </div>
  );
};

// ==================== OLET VISUALIZATION ====================
const OletVisualization = ({ 
  olet, 
  unitSystem = 'metric' 
}: { 
  olet: typeof oletData[0] | undefined;
  unitSystem?: UnitSystem;
}) => {
  if (!olet) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select olet type</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(unitSystem);
  const wu = getWeightUnit(unitSystem);
  const lVal = convertLength(olet.length, unitSystem);
  const wVal = convertLength(olet.width, unitSystem);
  const wtVal = convertWeight(olet.weight, unitSystem);
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-indigo-500/10 via-muted/30 to-blue-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{olet.type} - MSS SP-97</span>
        </div>
        <svg viewBox="0 0 280 200" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="oletGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.08"/>
            </linearGradient>
          </defs>
          
          {/* Header pipe */}
          <ellipse cx={140} cy={150} rx={115} ry={28} fill="url(#oletGrad2)" stroke="hsl(var(--chart-2))" strokeWidth="2"/>
          <text x={140} y={155} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" fontWeight="500">HEADER {olet.headerSize}</text>
          
          {/* Olet body */}
          <path d="M 115,120 L 115,70 Q 115,55 130,55 L 150,55 Q 165,55 165,70 L 165,120" 
            fill="url(#oletGrad2)" stroke="hsl(var(--chart-2))" strokeWidth="2"/>
          
          {/* Branch bore */}
          <ellipse cx={140} cy={55} rx={15} ry={5} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1"/>
          
          {/* L dimension */}
          <line x1={175} y1={55} x2={175} y2={140} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <text x={190} y={100} fontSize="9" fill="hsl(var(--chart-3))" fontWeight="bold">L = {lVal.toFixed(0)} {u}</text>
          
          {/* W dimension */}
          <line x1={115} y1={40} x2={165} y2={40} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <text x={140} y={32} textAnchor="middle" fontSize="9" fill="hsl(var(--destructive))" fontWeight="bold">W = {wVal.toFixed(0)} {u}</text>
          
          {/* Branch label */}
          <text x={140} y={75} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{olet.branchSize}</text>
        </svg>
      </div>
      
      {/* Data Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-chart-2/10 border border-chart-2/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Header</div>
          <div className="text-xs font-bold text-chart-2">{olet.headerSize}</div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Branch</div>
          <div className="text-xs font-bold text-primary">{olet.branchSize}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Length</div>
          <div className="text-xs font-bold text-chart-3">{lVal.toFixed(0)}</div>
        </div>
        <div className="bg-muted/50 p-2 rounded-lg border text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Weight</div>
          <div className="text-xs font-semibold">{wtVal.toFixed(1)} {wu}</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          MSS SP-97 • {olet.type} • {olet.headerSize} × {olet.branchSize}
        </Badge>
      </div>
    </div>
  );
};

// ==================== SIF VISUALIZATION ====================
const SIFVisualization = ({ sif }: { sif: typeof flexibilityData[0] | undefined }) => {
  if (!sif) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select component</div>;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-fuchsia-500/10 via-muted/30 to-purple-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto">
          <defs>
            <linearGradient id="sifGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {sif.component.includes('Elbow') && (
            <>
              <path d="M 50,150 L 50,90 Q 50,50 90,50 L 160,50" fill="none" stroke="url(#sifGrad)" strokeWidth="30" strokeLinecap="round"/>
              <path d="M 50,150 L 50,90 Q 50,50 90,50 L 160,50" fill="none" stroke="hsl(var(--chart-4))" strokeWidth="2" strokeLinecap="round"/>
              {/* Stress arrows */}
              <path d="M 80,80 L 100,60" stroke="hsl(var(--destructive))" strokeWidth="2" markerEnd="url(#arrow)"/>
              <text x={105} y={55} className="text-[9px] fill-destructive font-bold">In-plane</text>
              <path d="M 60,100 L 40,110" stroke="hsl(var(--chart-3))" strokeWidth="2"/>
              <text x={20} y={125} className="text-[9px] fill-chart-3 font-bold">Out-plane</text>
            </>
          )}
          
          {sif.component.includes('Tee') && (
            <>
              <rect x={30} y={70} width={130} height={25} rx={4} fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <rect x={80} y={30} width={25} height={45} rx={4} fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              {/* Stress concentration */}
              <circle cx={92} cy={70} r={8} fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="3,2"/>
              <text x={110} y={50} className="text-[9px] fill-destructive font-bold">SIF Zone</text>
            </>
          )}
          
          {sif.component.includes('Weldolet') && (
            <>
              <ellipse cx={140} cy={130} rx={100} ry={25} fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <path d="M 120,105 L 120,60 Q 120,45 140,45 Q 160,45 160,60 L 160,105" fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <circle cx={140} cy={105} r={10} fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="3,2"/>
            </>
          )}
          
          {sif.component.includes('Reducer') && (
            <>
              <path d="M 40,100 L 40,60 L 80,60 L 130,70 L 200,70 L 200,90 L 130,90 L 80,100 Z" fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <text x={100} y={85} className="text-[9px] fill-muted-foreground">SIF ≈ 1.0</text>
            </>
          )}
          
          {(sif.component.includes('Socket') || sif.component.includes('Threaded')) && (
            <>
              <rect x={60} y={60} width={80} height={60} rx={5} fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <rect x={140} y={70} width={60} height={40} rx={3} fill="hsl(var(--chart-4)/0.2)" stroke="hsl(var(--chart-4))" strokeWidth="1.5"/>
              <circle cx={140} cy={90} r={12} fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="4,2"/>
              <text x={170} y={95} className="text-[9px] fill-muted-foreground">{sif.type}</text>
            </>
          )}
          
          {/* Formula box */}
          <rect x={180} y={120} width={90} height={50} rx={5} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          <text x={225} y={138} textAnchor="middle" className="text-[8px] fill-muted-foreground">SIF Formula</text>
          <text x={225} y={155} textAnchor="middle" className="text-[9px] fill-primary font-mono">{sif.sifIn.substring(0, 12)}</text>
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">SIF (In-Plane)</div>
          <div className="font-bold text-destructive text-sm font-mono">{sif.sifIn}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">SIF (Out-Plane)</div>
          <div className="font-bold text-chart-3 text-sm font-mono">{sif.sifOut}</div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">k Factor</div>
          <div className="font-bold text-primary text-sm font-mono">{sif.kFactor}</div>
        </div>
      </div>
      <div className="bg-muted/50 p-3 rounded-lg border">
        <div className="text-xs text-muted-foreground font-medium">Formula Notes:</div>
        <div className="text-sm mt-1">{sif.description}</div>
      </div>
    </div>
  );
};

// ==================== SAFE SPAN VISUALIZATION ====================
const SafeSpanVisualization = ({ span }: { span: typeof safeSpanData[0] | undefined }) => {
  if (!span) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select pipe size</div>;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-500/10 via-muted/30 to-green-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 320 160" className="w-full max-w-md mx-auto">
          <defs>
            <linearGradient id="spanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.3"/>
              <stop offset="50%" stopColor="hsl(var(--chart-2))" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          
          {/* Supports */}
          <rect x={30} y={80} width={15} height={60} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          <rect x={275} y={80} width={15} height={60} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* Pipe with deflection curve */}
          <path d="M 37,80 Q 160,95 283,80" fill="none" stroke="url(#spanGrad)" strokeWidth="20" strokeLinecap="round"/>
          <path d="M 37,80 Q 160,95 283,80" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="2" strokeLinecap="round"/>
          
          {/* Deflection indicator */}
          <line x1={160} y1={80} x2={160} y2={95} stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="3,2"/>
          <text x={175} y={92} className="text-[9px] fill-destructive font-bold">δ = {span.deflection} mm</text>
          
          {/* Span dimension */}
          <line x1={37} y1={50} x2={283} y2={50} stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <line x1={37} y1={45} x2={37} y2={55} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1={283} y1={45} x2={283} y2={55} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <text x={160} y={42} textAnchor="middle" className="text-[11px] fill-primary font-bold">L = {span.maxSpan} m (Simply Supported)</text>
          
          {/* Ground line */}
          <line x1={20} y1={140} x2={300} y2={140} stroke="hsl(var(--muted-foreground))" strokeWidth="1"/>
          <path d="M 20,140 L 30,150 M 40,140 L 50,150 M 60,140 L 70,150 M 80,140 L 90,150" stroke="hsl(var(--muted-foreground))" strokeWidth="1"/>
          
          {/* Labels */}
          <text x={37} y={155} textAnchor="middle" className="text-[8px] fill-muted-foreground">SUPPORT</text>
          <text x={283} y={155} textAnchor="middle" className="text-[8px] fill-muted-foreground">SUPPORT</text>
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Simple Span</div>
          <div className="font-bold text-primary">{span.maxSpan} m</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Fixed Span</div>
          <div className="font-bold text-chart-3">{span.maxSpanFixed} m</div>
        </div>
        <div className="bg-chart-2/10 border border-chart-2/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Frequency</div>
          <div className="font-bold text-chart-2">{span.naturalFrequency} Hz</div>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Deflection</div>
          <div className="font-bold text-destructive">{span.deflection} mm</div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export default function PipingComponentsCalculator() {
  // Unit system and material
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('cs');
  
  const [pipeSize, setPipeSize] = useState<string>("4\"");
  const [pipeSchedule, setPipeSchedule] = useState<string>("40/STD");
  const [selectedSize, setSelectedSize] = useState<string>("4\"");
  const [selectedClass, setSelectedClass] = useState<string>("150");
  const [selectedFlangeStandard, setSelectedFlangeStandard] = useState<'B16.5' | 'B16.47A' | 'B16.47B' | 'B16.36'>('B16.5');
  const [selectedFlangeType, setSelectedFlangeType] = useState<string>('wn');
  const [selectedValveType, setSelectedValveType] = useState<string>("Gate");
  const [selectedFittingSize, setSelectedFittingSize] = useState<string>("4\"");
  const [selectedFittingType, setSelectedFittingType] = useState<string>("elbow");
  const [selectedOletType, setSelectedOletType] = useState<string>("Weldolet");
  const [selectedSIFComponent, setSelectedSIFComponent] = useState<string>("90° Long Radius Elbow");
  const [selectedSpanSize, setSelectedSpanSize] = useState<string>("4\"");
  
  const pipeSizes = getUniquePipeSizes();
  const pipeSchedules = getSchedulesForPipeSize(pipeSize);
  const selectedPipe = getPipeBySchedule(pipeSize, pipeSchedule);
  const sizes = getUniqueSizes();
  const selectedFlange = getFlange(selectedSize, selectedClass);
  
  const selectedElbow = elbowData.find(e => e.size === selectedFittingSize && e.type === '90LR');
  const selectedTee = teeData.find(t => t.size === selectedFittingSize);
  const selectedReducer = reducerData.find(r => r.sizeFrom === selectedFittingSize);
  const selectedGasket = gasketData.find(g => g.size === selectedSize && g.pressureClass === selectedClass);
  const selectedValve = valveData.find(v => v.size === selectedSize && v.type === selectedValveType);
  const selectedBlank = lineBlankData.find(lb => lb.size === selectedSize && lb.pressureClass === selectedClass);
  const selectedOlet = oletData.find(o => o.type === selectedOletType);
  const selectedSIF = flexibilityData.find(f => f.component === selectedSIFComponent);
  const selectedSpan = safeSpanData.find(s => s.size === selectedSpanSize && s.contentDensity === 1000);
  
  // Get available pressure classes based on standard
  const getAvailableClasses = () => {
    switch (selectedFlangeStandard) {
      case 'B16.5': return ['150', '300', '600', '900', '1500', '2500'];
      case 'B16.47A': return ['150', '300', '600', '900'];
      case 'B16.47B': return ['75', '150', '300', '400', '600', '900'];
      case 'B16.36': return ['150', '300', '600', '900', '1500', '2500'];
      default: return pressureClasses;
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="pipe" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 w-full h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
          <TabsTrigger value="pipe" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Cylinder className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Pipe
          </TabsTrigger>
          <TabsTrigger value="flanges" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Circle className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Flanges
          </TabsTrigger>
          <TabsTrigger value="fittings" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <CornerDownRight className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Fittings
          </TabsTrigger>
          <TabsTrigger value="gaskets" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Disc className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Gaskets
          </TabsTrigger>
          <TabsTrigger value="valves" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Settings2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Valves
          </TabsTrigger>
          <TabsTrigger value="blanks" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Ban className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Blanks
          </TabsTrigger>
          <TabsTrigger value="olets" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <GitBranch className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Olets
          </TabsTrigger>
          <TabsTrigger value="flexibility" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Activity className="w-3.5 h-3.5 mr-1 hidden sm:inline" />SIF
          </TabsTrigger>
          <TabsTrigger value="spans" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Ruler className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Spans
          </TabsTrigger>
        </TabsList>

        {/* PIPE TAB */}
        <TabsContent value="pipe" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Cylinder className="w-5 h-5 text-primary" />Pipe Dimensions</CardTitle>
                  <CardDescription>ASME B36.10M Carbon Steel Pipe</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B36.10M</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Nominal Size</Label>
                      <Select value={pipeSize} onValueChange={(v) => { setPipeSize(v); setPipeSchedule(getSchedulesForPipeSize(v)[0] || ""); }}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{pipeSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Schedule</Label>
                      <Select value={pipeSchedule} onValueChange={setPipeSchedule}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{pipeSchedules.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <PipeVisualization pipe={selectedPipe} />
                </div>
                <ScrollArea className="h-[450px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                      <TableRow><TableHead className="font-semibold">Size</TableHead><TableHead>Schedule</TableHead><TableHead>OD</TableHead><TableHead>Wall</TableHead><TableHead>ID</TableHead><TableHead>kg/m</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipeData.filter(p => p.size === pipeSize).map((p, i) => (
                        <TableRow key={i} className={`cursor-pointer transition-all ${p.schedule === pipeSchedule ? "bg-primary/15 hover:bg-primary/20 border-l-4 border-l-primary" : "hover:bg-muted/50"}`} onClick={() => setPipeSchedule(p.schedule)}>
                          <TableCell className="font-medium">{p.size}</TableCell>
                          <TableCell><Badge variant={p.schedule === pipeSchedule ? "default" : "outline"} className="text-xs">{p.schedule}</Badge></TableCell>
                          <TableCell>{p.outerDiameter}</TableCell>
                          <TableCell className="font-mono">{p.wallThickness}</TableCell>
                          <TableCell>{p.insideDiameter}</TableCell>
                          <TableCell>{p.weightPerMeter}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLANGES TAB */}
        <TabsContent value="flanges" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-orange-500/5 to-yellow-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Circle className="w-5 h-5 text-primary" />Flange Dimensions</CardTitle>
                  <CardDescription>Weld Neck, Slip-On, Blind, Socket Weld, Threaded, Lap Joint</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={selectedFlangeStandard === 'B16.5' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setSelectedFlangeStandard('B16.5')}>B16.5</Badge>
                  <Badge variant={selectedFlangeStandard === 'B16.47A' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setSelectedFlangeStandard('B16.47A')}>B16.47 A</Badge>
                  <Badge variant={selectedFlangeStandard === 'B16.47B' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setSelectedFlangeStandard('B16.47B')}>B16.47 B</Badge>
                  <Badge variant={selectedFlangeStandard === 'B16.36' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setSelectedFlangeStandard('B16.36')}>B16.36</Badge>
                </div>
              </div>
              {/* Standard Description */}
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border text-sm">
                {selectedFlangeStandard === 'B16.5' && (
                  <p><strong>ASME B16.5</strong> — Pipe Flanges and Flanged Fittings: NPS ½" through NPS 24". Standard flange sizes for most industrial applications.</p>
                )}
                {selectedFlangeStandard === 'B16.47A' && (
                  <p><strong>ASME B16.47 Series A</strong> — Large Diameter Steel Flanges: NPS 26" through NPS 60". MSS SP-44 design (compact design, lighter weight).</p>
                )}
                {selectedFlangeStandard === 'B16.47B' && (
                  <p><strong>ASME B16.47 Series B</strong> — Large Diameter Steel Flanges: NPS 26" through NPS 60". API 605 design (older design, heavier).</p>
                )}
                {selectedFlangeStandard === 'B16.36' && (
                  <p><strong>ASME B16.36</strong> — Orifice Flanges: NPS ½" through NPS 24". Includes pressure taps for flow measurement with orifice plates.</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  {/* Size, Class, Type selectors */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{getAvailableClasses().map(c => <SelectItem key={c} value={c}>{c}#</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Type</Label>
                      <Select value={selectedFlangeType} onValueChange={setSelectedFlangeType}>
                        <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">
                          {flangeTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.abbr} - {t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Flange Type Description */}
                  <div className="flex flex-wrap gap-1.5">
                    {flangeTypes.map(t => (
                      <Badge 
                        key={t.id} 
                        variant={t.id === selectedFlangeType ? "default" : "secondary"} 
                        className={`text-xs cursor-pointer transition-all ${t.id === selectedFlangeType ? 'ring-2 ring-primary/30' : 'hover:bg-muted'}`}
                        onClick={() => setSelectedFlangeType(t.id)}
                      >
                        {t.abbr}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Visualization */}
                  <FlangeVisualization 
                    flange={selectedFlange} 
                    standard={selectedFlangeStandard}
                    flangeType={selectedFlangeType}
                  />
                </div>
                
                {/* Data Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">ASME {selectedFlangeStandard} Data</span>
                    <Badge variant="outline" className="text-xs">{flangeData.filter(f => f.size === selectedSize).length} entries</Badge>
                  </div>
                  <ScrollArea className="h-[500px] rounded-xl border-2">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                        <TableRow>
                          <TableHead className="font-semibold text-xs">Size</TableHead>
                          <TableHead className="text-xs">Class</TableHead>
                          <TableHead className="text-xs">OD</TableHead>
                          <TableHead className="text-xs">BCD</TableHead>
                          <TableHead className="text-xs">Bolts</TableHead>
                          <TableHead className="text-xs">Thk</TableHead>
                          <TableHead className="text-xs">Wt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flangeData.filter(f => f.size === selectedSize).map((f, i) => (
                          <TableRow 
                            key={i} 
                            className={`cursor-pointer transition-all ${f.pressureClass === selectedClass ? "bg-primary/15 border-l-4 border-l-primary" : "hover:bg-muted/50"}`} 
                            onClick={() => setSelectedClass(f.pressureClass)}
                          >
                            <TableCell className="font-medium text-xs">{f.size}</TableCell>
                            <TableCell><Badge variant={f.pressureClass === selectedClass ? "default" : "outline"} className="text-xs">{f.pressureClass}#</Badge></TableCell>
                            <TableCell className="text-xs">{f.outerDiameter}</TableCell>
                            <TableCell className="text-xs">{f.boltCircleDiameter}</TableCell>
                            <TableCell className="text-xs font-mono">{f.numBolts}×{f.boltSize}</TableCell>
                            <TableCell className="text-xs">{f.thickness}</TableCell>
                            <TableCell className="text-xs">{f.weight} kg</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FITTINGS TAB */}
        <TabsContent value="fittings" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><CornerDownRight className="w-5 h-5 text-primary" />Butt Weld Fittings</CardTitle>
                  <CardDescription>Elbows, Tees, Reducers per ASME B16.9</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B16.9</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Select value={selectedFittingSize} onValueChange={setSelectedFittingSize}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">{pipeSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={selectedFittingType} onValueChange={setSelectedFittingType}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      <SelectItem value="elbow">90° LR Elbow</SelectItem>
                      <SelectItem value="tee">Equal Tee</SelectItem>
                      <SelectItem value="reducer">Concentric Reducer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  {selectedFittingType === 'elbow' && <ElbowVisualization elbow={selectedElbow} />}
                  {selectedFittingType === 'tee' && <TeeVisualization tee={selectedTee} />}
                  {selectedFittingType === 'reducer' && <ReducerVisualization reducer={selectedReducer} />}
                </div>
                <ScrollArea className="h-[400px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                      {selectedFittingType === 'elbow' && <TableRow><TableHead>Size</TableHead><TableHead>Type</TableHead><TableHead>A (mm)</TableHead><TableHead>OD</TableHead><TableHead>Wt</TableHead></TableRow>}
                      {selectedFittingType === 'tee' && <TableRow><TableHead>Size</TableHead><TableHead>C (mm)</TableHead><TableHead>M (mm)</TableHead><TableHead>OD</TableHead><TableHead>Wt</TableHead></TableRow>}
                      {selectedFittingType === 'reducer' && <TableRow><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>L (mm)</TableHead><TableHead>Large OD</TableHead><TableHead>Wt</TableHead></TableRow>}
                    </TableHeader>
                    <TableBody>
                      {selectedFittingType === 'elbow' && elbowData.filter(e => e.type === '90LR').map((e, i) => (
                        <TableRow key={i} className={e.size === selectedFittingSize ? "bg-primary/15" : ""}><TableCell className="font-medium">{e.size}</TableCell><TableCell><Badge variant="outline" className="text-xs">{e.type}</Badge></TableCell><TableCell>{e.centerToEnd}</TableCell><TableCell>{e.outerDiameter}</TableCell><TableCell>{e.weight}</TableCell></TableRow>
                      ))}
                      {selectedFittingType === 'tee' && teeData.map((t, i) => (
                        <TableRow key={i} className={t.size === selectedFittingSize ? "bg-primary/15" : ""}><TableCell className="font-medium">{t.size}</TableCell><TableCell>{t.centerToEnd}</TableCell><TableCell>{t.centerToBranch}</TableCell><TableCell>{t.outerDiameter}</TableCell><TableCell>{t.weight}</TableCell></TableRow>
                      ))}
                      {selectedFittingType === 'reducer' && reducerData.map((r, i) => (
                        <TableRow key={i} className={r.sizeFrom === selectedFittingSize ? "bg-primary/15" : ""}><TableCell className="font-medium">{r.sizeFrom}</TableCell><TableCell>{r.sizeTo}</TableCell><TableCell>{r.length}</TableCell><TableCell>{r.largeEndOD}</TableCell><TableCell>{r.weight}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GASKETS TAB */}
        <TabsContent value="gaskets" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-cyan-500/5 to-teal-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Disc className="w-5 h-5 text-primary" />Gasket Dimensions</CardTitle>
                  <CardDescription>Spiral Wound Gaskets per ASME B16.20</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B16.20</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{pressureClasses.slice(0, 3).map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <GasketVisualization gasket={selectedGasket} />
                </div>
                <ScrollArea className="h-[400px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur"><TableRow><TableHead>Size</TableHead><TableHead>Class</TableHead><TableHead>ID (mm)</TableHead><TableHead>OD (mm)</TableHead><TableHead>Thk</TableHead></TableRow></TableHeader>
                    <TableBody>{gasketData.map((g, i) => <TableRow key={i} className={g.size === selectedSize && g.pressureClass === selectedClass ? "bg-primary/15" : ""}><TableCell className="font-medium">{g.size}</TableCell><TableCell><Badge variant="outline">{g.pressureClass}</Badge></TableCell><TableCell>{g.innerDiameter}</TableCell><TableCell>{g.outerDiameter}</TableCell><TableCell>{g.thickness}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VALVES TAB */}
        <TabsContent value="valves" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-rose-500/5 to-pink-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" />Valve Dimensions</CardTitle>
                  <CardDescription>Gate, Globe, Ball, Check Valves per API 600 / ASME B16.10</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">API 600 / B16.10</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={selectedValveType} onValueChange={setSelectedValveType}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{valveTypes.map(t => <SelectItem key={t.id} value={t.name.split(' ')[0]}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ValveVisualization valve={selectedValve} />
                </div>
                <ScrollArea className="h-[450px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur"><TableRow><TableHead>Size</TableHead><TableHead>Type</TableHead><TableHead>F-F</TableHead><TableHead>Height</TableHead><TableHead>Wt</TableHead></TableRow></TableHeader>
                    <TableBody>{valveData.filter(v => v.type === selectedValveType).map((v, i) => <TableRow key={i} className={v.size === selectedSize ? "bg-primary/15" : ""}><TableCell className="font-medium">{v.size}</TableCell><TableCell><Badge variant="outline">{v.type}</Badge></TableCell><TableCell>{v.faceToFace}</TableCell><TableCell>{v.height}</TableCell><TableCell>{v.weight}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLANKS TAB */}
        <TabsContent value="blanks" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-slate-500/5 to-gray-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-primary" />Spectacle Blinds & Spacers</CardTitle>
                  <CardDescription>ASME B16.48</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B16.48</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{[...new Set(lineBlankData.map(lb => lb.size))].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{[...new Set(lineBlankData.map(lb => lb.pressureClass))].map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <SpectacleBlindVisualization blank={selectedBlank} />
                </div>
                <ScrollArea className="h-[400px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur"><TableRow><TableHead>Size</TableHead><TableHead>Class</TableHead><TableHead>OD</TableHead><TableHead>Thk</TableHead><TableHead>Handle</TableHead><TableHead>Wt</TableHead></TableRow></TableHeader>
                    <TableBody>{lineBlankData.map((lb, i) => <TableRow key={i} className={lb.size === selectedSize && lb.pressureClass === selectedClass ? "bg-primary/15" : ""}><TableCell className="font-medium">{lb.size}</TableCell><TableCell><Badge variant="outline">{lb.pressureClass}</Badge></TableCell><TableCell>{lb.outerDiameter}</TableCell><TableCell>{lb.thickness}</TableCell><TableCell>{lb.handleLength}×{lb.handleWidth}</TableCell><TableCell>{lb.weight}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OLETS TAB */}
        <TabsContent value="olets" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-indigo-500/5 to-blue-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><GitBranch className="w-5 h-5 text-primary" />Branch Connections (Olets)</CardTitle>
                  <CardDescription>MSS SP-97 - Weldolet, Sockolet, Threadolet</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">MSS SP-97</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Olet Type</Label>
                    <Select value={selectedOletType} onValueChange={setSelectedOletType}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">{oletTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.abbr} - {t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <OletVisualization olet={selectedOlet} />
                </div>
                <ScrollArea className="h-[400px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur"><TableRow><TableHead>Header</TableHead><TableHead>Branch</TableHead><TableHead>Type</TableHead><TableHead>L</TableHead><TableHead>W</TableHead><TableHead>Wt</TableHead></TableRow></TableHeader>
                    <TableBody>{oletData.filter(o => o.type === selectedOletType).map((o, i) => <TableRow key={i}><TableCell className="font-medium">{o.headerSize}</TableCell><TableCell>{o.branchSize}</TableCell><TableCell><Badge variant="outline" className="text-xs">{o.type}</Badge></TableCell><TableCell>{o.length}</TableCell><TableCell>{o.width}</TableCell><TableCell>{o.weight}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLEXIBILITY TAB */}
        <TabsContent value="flexibility" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-fuchsia-500/5 to-purple-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Stress Intensification Factors (SIF)</CardTitle>
                  <CardDescription>ASME B31.3 Flexibility Analysis</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B31.3</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Component</Label>
                    <Select value={selectedSIFComponent} onValueChange={setSelectedSIFComponent}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">{flexibilityData.map(f => <SelectItem key={f.component} value={f.component}>{f.component}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <SIFVisualization sif={selectedSIF} />
                </div>
                <ScrollArea className="h-[450px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur"><TableRow><TableHead>Component</TableHead><TableHead>Type</TableHead><TableHead>SIF (In)</TableHead><TableHead>SIF (Out)</TableHead><TableHead>k</TableHead></TableRow></TableHeader>
                    <TableBody>{flexibilityData.map((f, i) => <TableRow key={i} className={f.component === selectedSIFComponent ? "bg-primary/15" : ""}><TableCell className="font-medium text-sm">{f.component}</TableCell><TableCell><Badge variant="outline" className="text-xs">{f.type}</Badge></TableCell><TableCell className="font-mono text-xs">{f.sifIn}</TableCell><TableCell className="font-mono text-xs">{f.sifOut}</TableCell><TableCell className="font-mono text-xs">{f.kFactor}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAFE SPANS TAB */}
        <TabsContent value="spans" className="mt-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4 bg-gradient-to-r from-emerald-500/5 to-green-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Ruler className="w-5 h-5 text-primary" />Pipe Support Safe Spans</CardTitle>
                  <CardDescription>ASME B31.1 - Carbon Steel Sch 40</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B31.1</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Pipe Size</Label>
                    <Select value={selectedSpanSize} onValueChange={setSelectedSpanSize}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">{[...new Set(safeSpanData.map(s => s.size))].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <SafeSpanVisualization span={selectedSpan} />
                </div>
                <ScrollArea className="h-[400px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur"><TableRow><TableHead>Size</TableHead><TableHead>Content</TableHead><TableHead>Simple</TableHead><TableHead>Fixed</TableHead><TableHead>Hz</TableHead><TableHead>Defl</TableHead></TableRow></TableHeader>
                    <TableBody>{safeSpanData.map((s, i) => <TableRow key={i} className={s.size === selectedSpanSize ? "bg-primary/15" : ""}><TableCell className="font-medium">{s.size}</TableCell><TableCell>{s.contentDensity === 0 ? "Empty" : "Water"}</TableCell><TableCell>{s.maxSpan} m</TableCell><TableCell>{s.maxSpanFixed} m</TableCell><TableCell>{s.naturalFrequency}</TableCell><TableCell>{s.deflection}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
