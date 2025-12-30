import { useState, useMemo } from "react";
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
  getFlangesByStandard, getFlangeSizesByStandard, getPressureClassesByStandard,
  elbowData, teeData, reducerData,
  gasketData,
  valveData, valveTypes,
  lineBlankData,
  oletData, oletTypes,
  flexibilityData,
  safeSpanData,
  getUniqueSizes,
  type FlangeStandard as FlangeStandardType
} from "@/lib/pipingComponents";
import { Circle, Cylinder, CornerDownRight, Settings2, GitBranch, Disc, Gauge, Ban, Activity, Ruler, Globe, Thermometer, Scale } from "lucide-react";

// ==================== TYPES ====================
type UnitSystem = 'metric' | 'imperial';
type TemperatureUnit = 'celsius' | 'fahrenheit';
type PipeSizeUnit = 'inch' | 'mm';
type FlangeStandard = 'B16.5' | 'B16.47A' | 'B16.47B' | 'B16.36';
type FittingStandard = 'B16.9' | 'B16.11-THD' | 'B16.11-SW';
type GasketType = 'flat' | 'spiral' | 'rtj';
type ValveEndType = 'flanged' | 'buttweld' | 'threaded' | 'socketweld';
type PipeSelectionMode = 'schedule' | 'wallThickness';

interface UnitSettings {
  length: UnitSystem;
  temperature: TemperatureUnit;
  pipeSize: PipeSizeUnit;
}

// ==================== UNIT CONVERSIONS ====================
const convertLength = (mm: number, system: UnitSystem): number => {
  return system === 'imperial' ? Math.round(mm / 25.4 * 1000) / 1000 : mm;
};

const convertWeight = (kg: number, system: UnitSystem): number => {
  return system === 'imperial' ? Math.round(kg * 2.20462 * 100) / 100 : kg;
};

const convertTemperature = (celsius: number, unit: TemperatureUnit): number => {
  return unit === 'fahrenheit' ? Math.round((celsius * 9/5 + 32) * 10) / 10 : celsius;
};

const getLengthUnit = (system: UnitSystem): string => system === 'imperial' ? 'in' : 'mm';
const getWeightUnit = (system: UnitSystem): string => system === 'imperial' ? 'lb' : 'kg';
const getTempUnit = (unit: TemperatureUnit): string => unit === 'fahrenheit' ? '°F' : '°C';

const formatPipeSize = (sizeInch: string, unit: PipeSizeUnit): string => {
  if (unit === 'mm') {
    const dnMap: Record<string, string> = {
      '1/2"': 'DN15', '3/4"': 'DN20', '1"': 'DN25', '1-1/4"': 'DN32', '1-1/2"': 'DN40',
      '2"': 'DN50', '2-1/2"': 'DN65', '3"': 'DN80', '4"': 'DN100', '5"': 'DN125',
      '6"': 'DN150', '8"': 'DN200', '10"': 'DN250', '12"': 'DN300', '14"': 'DN350',
      '16"': 'DN400', '18"': 'DN450', '20"': 'DN500', '24"': 'DN600',
      '26"': 'DN650', '28"': 'DN700', '30"': 'DN750', '32"': 'DN800', '34"': 'DN850',
      '36"': 'DN900', '42"': 'DN1050', '48"': 'DN1200', '54"': 'DN1350', '60"': 'DN1500'
    };
    return dnMap[sizeInch] || sizeInch;
  }
  return sizeInch;
};

// ==================== MATERIALS DATABASE ====================
const materials = [
  { id: 'cs-a106b', name: 'Carbon Steel', spec: 'A106 Gr.B / A105', minTemp: -29, maxTemp: 427 },
  { id: 'cs-a333-6', name: 'Carbon Steel (LT)', spec: 'A333 Gr.6 / A350 LF2', minTemp: -46, maxTemp: 343 },
  { id: 'ss304', name: 'SS 304/304L', spec: 'A312 TP304L / A182 F304L', minTemp: -196, maxTemp: 538 },
  { id: 'ss316', name: 'SS 316/316L', spec: 'A312 TP316L / A182 F316L', minTemp: -196, maxTemp: 538 },
  { id: 'ss321', name: 'SS 321/321H', spec: 'A312 TP321 / A182 F321', minTemp: -196, maxTemp: 816 },
  { id: 'a11', name: 'Alloy Steel (1¼Cr-½Mo)', spec: 'A335 P11 / A182 F11', minTemp: -29, maxTemp: 593 },
  { id: 'a22', name: 'Alloy Steel (2¼Cr-1Mo)', spec: 'A335 P22 / A182 F22', minTemp: -29, maxTemp: 649 },
  { id: 'duplex', name: 'Duplex SS 2205', spec: 'A790 S31803 / A182 F51', minTemp: -46, maxTemp: 316 },
  { id: 'inconel625', name: 'Inconel 625', spec: 'B444 N06625 / B564 N06625', minTemp: -196, maxTemp: 982 },
  { id: 'monel400', name: 'Monel 400', spec: 'B165 N04400 / B564 N04400', minTemp: -196, maxTemp: 538 },
];

// Pressure classes by standard
const pressureClassesB165 = ['150', '300', '600', '900', '1500', '2500'];
const pressureClassesB1647A = ['150', '300', '400', '600', '900'];
const pressureClassesB1647B = ['75', '150', '300', '400', '600', '900'];
const pressureClassesB1636 = ['300', '600', '900', '1500', '2500'];

// ==================== UNIT SYSTEM HEADER ====================
const UnitSystemHeader = ({
  units,
  setUnits,
  selectedMaterial,
  setSelectedMaterial
}: {
  units: UnitSettings;
  setUnits: (u: UnitSettings) => void;
  selectedMaterial: string;
  setSelectedMaterial: (m: string) => void;
}) => {
  const material = materials.find(m => m.id === selectedMaterial);
  
  return (
    <div className="bg-gradient-to-r from-primary/5 via-muted/50 to-primary/5 rounded-xl border-2 border-primary/20 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4 lg:gap-6">
        {/* Length Units */}
        <div className="flex items-center gap-2 bg-background/80 px-3 py-2 rounded-lg border">
          <Scale className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Length:</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${units.length === 'metric' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>mm</span>
            <Switch
              checked={units.length === 'imperial'}
              onCheckedChange={(checked) => setUnits({ ...units, length: checked ? 'imperial' : 'metric' })}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-xs ${units.length === 'imperial' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>inch</span>
          </div>
        </div>

        {/* Temperature Units */}
        <div className="flex items-center gap-2 bg-background/80 px-3 py-2 rounded-lg border">
          <Thermometer className="w-4 h-4 text-destructive" />
          <span className="text-xs font-medium text-muted-foreground">Temp:</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${units.temperature === 'celsius' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>°C</span>
            <Switch
              checked={units.temperature === 'fahrenheit'}
              onCheckedChange={(checked) => setUnits({ ...units, temperature: checked ? 'fahrenheit' : 'celsius' })}
              className="data-[state=checked]:bg-destructive"
            />
            <span className={`text-xs ${units.temperature === 'fahrenheit' ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>°F</span>
          </div>
        </div>

        {/* Pipe Size Display */}
        <div className="flex items-center gap-2 bg-background/80 px-3 py-2 rounded-lg border">
          <Cylinder className="w-4 h-4 text-chart-3" />
          <span className="text-xs font-medium text-muted-foreground">Pipe Size:</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${units.pipeSize === 'inch' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>NPS</span>
            <Switch
              checked={units.pipeSize === 'mm'}
              onCheckedChange={(checked) => setUnits({ ...units, pipeSize: checked ? 'mm' : 'inch' })}
              className="data-[state=checked]:bg-chart-3"
            />
            <span className={`text-xs ${units.pipeSize === 'mm' ? 'text-chart-3 font-bold' : 'text-muted-foreground'}`}>DN</span>
          </div>
        </div>

        {/* Material Selection */}
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Material:</span>
          <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
            <SelectTrigger className="h-9 text-xs bg-background border-2 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-50">
              {materials.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground ml-2">({m.spec})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Material Temperature Range */}
      {material && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Badge variant="outline" className="bg-background/50">
            <Thermometer className="w-3 h-3 mr-1" />
            Design Range: {convertTemperature(material.minTemp, units.temperature)}{getTempUnit(units.temperature)} to {convertTemperature(material.maxTemp, units.temperature)}{getTempUnit(units.temperature)}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">{material.spec}</Badge>
        </div>
      )}
    </div>
  );
};

// ==================== PIPE VISUALIZATION ====================
const PipeVisualization = ({ 
  pipe, 
  units,
  mode = 'schedule'
}: { 
  pipe: typeof pipeData[0] | undefined;
  units: UnitSettings;
  mode?: PipeSelectionMode;
}) => {
  if (!pipe) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Cylinder className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select pipe size and {mode === 'schedule' ? 'schedule' : 'wall thickness'}</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const wu = getWeightUnit(units.length);
  const od = convertLength(pipe.outerDiameter, units.length);
  const id = convertLength(pipe.insideDiameter, units.length);
  const wt = convertLength(pipe.wallThickness, units.length);
  const wpm = convertWeight(pipe.weightPerMeter, units.length);
  
  const scale = 0.55;
  const cx = 150, cy = 125;
  const odR = Math.min(pipe.outerDiameter * scale, 85);
  const idR = (pipe.insideDiameter / pipe.outerDiameter) * odR;
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-blue-500/10 via-muted/30 to-cyan-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Cross Section - ASME B36.10M {mode === 'schedule' ? `Schedule ${pipe.schedule}` : `Wall ${wt.toFixed(2)}${u}`}
          </span>
        </div>
        <svg viewBox="0 0 300 250" className="w-full max-w-[280px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.08"/>
            </linearGradient>
            <pattern id="pipeHatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="5" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.35"/>
            </pattern>
            <filter id="pipeShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15"/>
            </filter>
          </defs>
          
          {/* Outer circle */}
          <circle cx={cx} cy={cy} r={odR} fill="url(#pipeGrad)" stroke="hsl(var(--primary))" strokeWidth="2.5" filter="url(#pipeShadow)"/>
          
          {/* Wall thickness with hatch */}
          <circle cx={cx} cy={cy} r={(odR + idR) / 2} fill="url(#pipeHatch)" stroke="none" strokeWidth={odR - idR}/>
          
          {/* Inner circle (bore) */}
          <circle cx={cx} cy={cy} r={idR} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          
          {/* OD dimension - left */}
          <line x1={cx - odR - 18} y1={cy - odR} x2={cx - odR - 18} y2={cy + odR} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <line x1={cx - odR - 23} y1={cy - odR} x2={cx - odR - 13} y2={cy - odR} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx - odR - 23} y1={cy + odR} x2={cx - odR - 13} y2={cy + odR} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx - odR - 28} y={cy} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold" transform={`rotate(-90 ${cx - odR - 28} ${cy})`}>
            OD = {od.toFixed(units.length === 'imperial' ? 3 : 1)} {u}
          </text>
          
          {/* ID dimension - bottom */}
          <line x1={cx - idR} y1={cy + odR + 22} x2={cx + idR} y2={cy + odR + 22} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <line x1={cx - idR} y1={cy + odR + 17} x2={cx - idR} y2={cy + odR + 27} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={cx + idR} y1={cy + odR + 17} x2={cx + idR} y2={cy + odR + 27} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={cx} y={cy + odR + 38} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="9" fontWeight="bold">
            ID = {id.toFixed(units.length === 'imperial' ? 3 : 1)} {u}
          </text>
          
          {/* Wall thickness indicator */}
          <line x1={cx + idR + 3} y1={cy - 28} x2={cx + odR - 3} y2={cy - 28} stroke="hsl(var(--chart-4))" strokeWidth="4" strokeLinecap="round"/>
          <text x={cx + odR + 12} y={cy - 25} fill="hsl(var(--chart-4))" fontSize="9" fontWeight="bold">
            t = {wt.toFixed(units.length === 'imperial' ? 3 : 2)} {u}
          </text>
          
          {/* Center mark */}
          <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <circle cx={cx} cy={cy} r="3" fill="hsl(var(--primary))"/>
        </svg>
      </div>
      
      {/* Data Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg">
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Wall Thickness</div>
          <div className="text-base font-bold text-primary">{wt.toFixed(units.length === 'imperial' ? 3 : 2)} <span className="text-[10px] font-normal">{u}</span></div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg">
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Weight</div>
          <div className="text-base font-bold text-primary">{wpm.toFixed(2)} <span className="text-[10px] font-normal">{wu}/{units.length === 'imperial' ? 'ft' : 'm'}</span></div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Internal Area</div>
          <div className="font-semibold text-sm">
            {units.length === 'imperial' 
              ? (pipe.internalArea / 645.16).toFixed(3) 
              : pipe.internalArea.toLocaleString()
            } <span className="text-[10px] text-muted-foreground">{units.length === 'imperial' ? 'in²' : 'mm²'}</span>
          </div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Water Capacity</div>
          <div className="font-semibold text-sm">
            {units.length === 'imperial' 
              ? (pipe.waterCapacity * 0.264172).toFixed(3) 
              : pipe.waterCapacity
            } <span className="text-[10px] text-muted-foreground">{units.length === 'imperial' ? 'gal/ft' : 'L/m'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          ASME B36.10M • {formatPipeSize(pipe.size, units.pipeSize)} • {pipe.schedule}
        </Badge>
      </div>
    </div>
  );
};

// ==================== FLANGE VISUALIZATION ====================
const FlangeVisualization = ({ 
  flange, 
  standard = 'B16.5',
  flangeType = 'wn',
  units
}: { 
  flange: typeof flangeData[0] | undefined;
  standard?: FlangeStandard;
  flangeType?: string;
  units: UnitSettings;
}) => {
  if (!flange) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Circle className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select size and class</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const odVal = convertLength(flange.outerDiameter, units.length);
  const bcdVal = convertLength(flange.boltCircleDiameter, units.length);
  const rfVal = convertLength(flange.raisedFaceDiameter, units.length);
  const thkVal = convertLength(flange.thickness, units.length);
  const hubVal = convertLength(flange.hubDiameter, units.length);
  
  const cx = 145, cy = 125;
  const scale = 0.28;
  const od = Math.min(flange.outerDiameter * scale, 85);
  const bcd = (flange.boltCircleDiameter / flange.outerDiameter) * od;
  const rf = (flange.raisedFaceDiameter / flange.outerDiameter) * od;
  const hub = (flange.hubDiameter / flange.outerDiameter) * od;
  const bore = hub * 0.55;
  
  const isOrifice = standard === 'B16.36';
  
  const standardColors: Record<FlangeStandard, { accent: string; light: string; name: string }> = {
    'B16.5': { accent: 'hsl(var(--primary))', light: 'hsl(var(--primary) / 0.15)', name: 'ASME B16.5 (NPS ½-24)' },
    'B16.47A': { accent: 'hsl(200 70% 50%)', light: 'hsl(200 70% 50% / 0.15)', name: 'ASME B16.47 Series A (NPS 26-60)' },
    'B16.47B': { accent: 'hsl(160 60% 45%)', light: 'hsl(160 60% 45% / 0.15)', name: 'ASME B16.47 Series B (NPS 26-60)' },
    'B16.36': { accent: 'hsl(280 60% 55%)', light: 'hsl(280 60% 55% / 0.15)', name: 'ASME B16.36 Orifice Flanges' },
  };
  
  const colors = standardColors[standard];
  
  // Cross section dimensions
  const csWidth = 280;
  const csHeight = 130;
  const csFlgThk = Math.min(flange.thickness * 1.1, 32);
  const csFlgHeight = 75;
  const csHubLen = flangeType === 'wn' ? 42 : (flangeType === 'so' ? 18 : 0);
  const csRfHeight = 3;
  
  return (
    <div className="space-y-3">
      {/* Front View */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Front View</span>
        </div>
        <svg viewBox="0 0 290 250" className="w-full max-w-[270px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id={`fGrad-${standard}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.2"/>
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0.05"/>
            </linearGradient>
            <filter id="fShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.12"/>
            </filter>
          </defs>
          
          {/* Outer flange */}
          <circle cx={cx} cy={cy} r={od} fill={`url(#fGrad-${standard})`} stroke={colors.accent} strokeWidth="2.5" filter="url(#fShadow)"/>
          
          {/* Bolt circle */}
          <circle cx={cx} cy={cy} r={bcd} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="5,3"/>
          
          {/* Raised face */}
          <circle cx={cx} cy={cy} r={rf} fill={colors.light} stroke={colors.accent} strokeWidth="1.5"/>
          
          {/* Orifice taps for B16.36 */}
          {isOrifice && (
            <>
              <circle cx={cx - rf * 0.6} cy={cy} r="5" fill="hsl(var(--background))" stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <circle cx={cx + rf * 0.6} cy={cy} r="5" fill="hsl(var(--background))" stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <text x={cx} y={cy - rf - 8} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="7" fontWeight="bold">TAPS</text>
            </>
          )}
          
          {/* Hub/bore */}
          <circle cx={cx} cy={cy} r={bore} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          
          {/* Bolt holes */}
          {Array.from({ length: flange.numBolts }).map((_, i) => {
            const angle = (2 * Math.PI * i) / flange.numBolts - Math.PI/2;
            const bx = cx + bcd * Math.cos(angle);
            const by = cy + bcd * Math.sin(angle);
            const boltR = Math.max(3.5, od * 0.045);
            return <circle key={i} cx={bx} cy={by} r={boltR} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1"/>;
          })}
          
          {/* OD dimension */}
          <line x1={cx - od} y1={cy + od + 18} x2={cx + od} y2={cy + od + 18} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx - od} y1={cy + od + 13} x2={cx - od} y2={cy + od + 23} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx + od} y1={cy + od + 13} x2={cx + od} y2={cy + od + 23} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx} y={cy + od + 32} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold">
            OD = {odVal.toFixed(units.length === 'imperial' ? 2 : 0)} {u}
          </text>
          
          {/* BCD dimension */}
          <line x1={cx} y1={cy} x2={cx + bcd * 0.85} y2={cy - bcd * 0.45} stroke="hsl(var(--chart-3))" strokeWidth="1" strokeDasharray="3,2"/>
          <text x={cx + bcd * 0.85 + 5} y={cy - bcd * 0.45 - 3} fill="hsl(var(--chart-3))" fontSize="8" fontWeight="600">
            BCD = {bcdVal.toFixed(0)}
          </text>
          
          {/* RF label */}
          <text x={cx} y={cy + 4} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">RF ⌀{rfVal.toFixed(0)}</text>
        </svg>
      </div>
      
      {/* Cross Section View */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cross Section (Half)</span>
        </div>
        <svg viewBox={`0 0 ${csWidth} ${csHeight}`} className="w-full max-w-[280px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <pattern id={`hatch-${standard}`} width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="4" stroke={colors.accent} strokeWidth="0.5" strokeOpacity="0.4"/>
            </pattern>
          </defs>
          
          {/* Centerline */}
          <line x1="15" y1={csHeight/2} x2={csWidth - 15} y2={csHeight/2} stroke={colors.accent} strokeWidth="0.8" strokeDasharray="8,4"/>
          <text x="20" y={csHeight/2 - 5} fill={colors.accent} fontSize="7" fontWeight="500">CL</text>
          
          <g transform={`translate(${csWidth/2 - csFlgThk/2 - csHubLen/2}, 0)`}>
            {/* Hub/neck for weld neck */}
            {flangeType === 'wn' && (
              <polygon 
                points={`0,${csHeight/2 - 16} ${csHubLen},${csHeight/2 - csFlgHeight/2} ${csHubLen},${csHeight/2} 0,${csHeight/2}`}
                fill={`url(#hatch-${standard})`} stroke={colors.accent} strokeWidth="1.5"
              />
            )}
            
            {/* Slip-on socket */}
            {flangeType === 'so' && (
              <rect x={0} y={csHeight/2 - 18} width={csHubLen} height={18} fill={`url(#hatch-${standard})`} stroke={colors.accent} strokeWidth="1.5"/>
            )}
            
            {/* Flange face - upper half */}
            <rect x={csHubLen} y={csHeight/2 - csFlgHeight/2} width={csFlgThk} height={csFlgHeight/2} fill={`url(#hatch-${standard})`} stroke={colors.accent} strokeWidth="1.5"/>
            
            {/* Raised face */}
            <rect x={csHubLen + csFlgThk} y={csHeight/2 - csFlgHeight/2 + 7} width={csRfHeight} height={csFlgHeight/2 - 7} fill={colors.accent} fillOpacity="0.4" stroke={colors.accent} strokeWidth="0.8"/>
            
            {/* Bore */}
            <rect x={0} y={csHeight/2 - 7} width={csHubLen + csFlgThk + csRfHeight} height={7} fill="hsl(var(--background))" stroke="none"/>
            
            {/* Bolt hole */}
            <circle cx={csHubLen + csFlgThk/2} cy={csHeight/2 - csFlgHeight/2 + 11} r="4" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1"/>
            
            {/* Thickness dimension */}
            <line x1={csHubLen} y1={csHeight - 10} x2={csHubLen + csFlgThk} y2={csHeight - 10} stroke="hsl(var(--chart-3))" strokeWidth="1.2"/>
            <text x={csHubLen + csFlgThk/2} y={csHeight - 3} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="8" fontWeight="bold">
              t = {thkVal.toFixed(units.length === 'imperial' ? 2 : 0)} {u}
            </text>
          </g>
        </svg>
      </div>
      
      {/* Data Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg">
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Outer Diameter</div>
          <div className="text-sm font-bold text-primary">{odVal.toFixed(units.length === 'imperial' ? 2 : 0)} <span className="text-[10px] font-normal">{u}</span></div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg">
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Bolt Circle</div>
          <div className="text-sm font-bold text-primary">{bcdVal.toFixed(units.length === 'imperial' ? 2 : 0)} <span className="text-[10px] font-normal">{u}</span></div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Bolting</div>
          <div className="font-semibold text-sm">{flange.numBolts} × {flange.boltSize}</div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Thickness</div>
          <div className="font-semibold text-sm">{thkVal.toFixed(units.length === 'imperial' ? 2 : 0)} {u}</div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border col-span-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Weight (approx)</div>
          <div className="font-semibold text-sm">{convertWeight(flange.weight, units.length).toFixed(1)} {getWeightUnit(units.length)}</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          ASME {standard} • Class {flange.pressureClass} • {formatPipeSize(flange.size, units.pipeSize)}
        </Badge>
      </div>
    </div>
  );
};

// ==================== ELBOW VISUALIZATION ====================
const ElbowVisualization = ({ 
  elbow, 
  fittingStandard = 'B16.9',
  units 
}: { 
  elbow: typeof elbowData[0] | undefined;
  fittingStandard?: FittingStandard;
  units: UnitSettings;
}) => {
  if (!elbow) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <CornerDownRight className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select elbow size</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const wu = getWeightUnit(units.length);
  const aVal = convertLength(elbow.centerToEnd, units.length);
  const odVal = convertLength(elbow.outerDiameter, units.length);
  const wtVal = convertWeight(elbow.weight, units.length);
  const is45 = elbow.type.includes('45');
  
  const stdInfo: Record<FittingStandard, { name: string; color: string }> = {
    'B16.9': { name: 'Butt Weld ASME B16.9', color: 'hsl(var(--chart-2))' },
    'B16.11-THD': { name: 'Threaded ASME B16.11', color: 'hsl(280 60% 55%)' },
    'B16.11-SW': { name: 'Socket Weld ASME B16.11', color: 'hsl(200 70% 50%)' },
  };
  
  const info = stdInfo[fittingStandard];
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-green-500/10 via-muted/30 to-emerald-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{info.name}</span>
        </div>
        <svg viewBox="0 0 280 210" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="elbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={info.color} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={info.color} stopOpacity="0.08"/>
            </linearGradient>
          </defs>
          
          {is45 ? (
            <>
              <path d="M 75,180 L 75,125 Q 75,80 110,60 L 175,30" fill="none" stroke="url(#elbowGrad)" strokeWidth="32" strokeLinecap="round"/>
              <path d="M 75,180 L 75,125 Q 75,80 110,60 L 175,30" fill="none" stroke={info.color} strokeWidth="2" strokeLinecap="round"/>
              <text x={200} y={110} fill="hsl(var(--muted-foreground))" fontSize="9">A = {aVal.toFixed(1)} {u}</text>
              <text x={200} y={125} fill="hsl(var(--muted-foreground))" fontSize="9">45° LR</text>
            </>
          ) : (
            <>
              <path d="M 55,185 L 55,115 Q 55,55 115,55 L 195,55" fill="none" stroke="url(#elbowGrad)" strokeWidth="38" strokeLinecap="round"/>
              <path d="M 55,185 L 55,115 Q 55,55 115,55 L 195,55" fill="none" stroke={info.color} strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx={55} cy={55} r="4" fill="hsl(var(--primary))"/>
              <text x={42} y={50} fill="hsl(var(--primary))" fontSize="8">CL</text>
              
              {/* A dimension - vertical */}
              <line x1={28} y1={55} x2={28} y2={185} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <line x1={23} y1={55} x2={33} y2={55} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <line x1={23} y1={185} x2={33} y2={185} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <text x={15} y={125} fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold" transform="rotate(-90 15 125)">A = {aVal.toFixed(1)}</text>
              
              {/* A dimension - horizontal */}
              <line x1={55} y1={195} x2={195} y2={195} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
              <text x={125} y={208} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="9" fontWeight="bold">A = {aVal.toFixed(1)} {u}</text>
              
              <text x={210} y={90} fill="hsl(var(--muted-foreground))" fontSize="9">90° LR</text>
              <text x={210} y={103} fill="hsl(var(--muted-foreground))" fontSize="9">R = 1.5D</text>
            </>
          )}
        </svg>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-chart-2/10 border border-chart-2/30 p-2.5 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">A (C-E)</div>
          <div className="font-bold text-chart-2 text-sm">{aVal.toFixed(1)} {u}</div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg text-center border">
          <div className="text-[9px] text-muted-foreground uppercase">OD</div>
          <div className="font-semibold text-sm">{odVal.toFixed(1)} {u}</div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg text-center border">
          <div className="text-[9px] text-muted-foreground uppercase">Weight</div>
          <div className="font-semibold text-sm">{wtVal.toFixed(1)} {wu}</div>
        </div>
      </div>
    </div>
  );
};

// ==================== TEE VISUALIZATION ====================
const TeeVisualization = ({ 
  tee, 
  fittingStandard = 'B16.9',
  units 
}: { 
  tee: typeof teeData[0] | undefined;
  fittingStandard?: FittingStandard;
  units: UnitSettings;
}) => {
  if (!tee) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select tee size</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const wu = getWeightUnit(units.length);
  const cVal = convertLength(tee.centerToEnd, units.length);
  const mVal = convertLength(tee.centerToBranch, units.length);
  const wtVal = convertWeight(tee.weight, units.length);
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-purple-500/10 via-muted/30 to-violet-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Equal Tee - ASME B16.9</span>
        </div>
        <svg viewBox="0 0 280 210" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="teeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity="0.08"/>
            </linearGradient>
          </defs>
          
          <rect x={30} y={90} width={220} height={38} rx={5} fill="url(#teeGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
          <rect x={120} y={20} width={38} height={70} rx={5} fill="url(#teeGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
          
          <line x1={30} y1={109} x2={250} y2={109} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,3"/>
          <line x1={139} y1={20} x2={139} y2={128} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,3"/>
          <circle cx={139} cy={109} r="5" fill="hsl(var(--primary))"/>
          
          {/* C dimension */}
          <line x1={139} y1={145} x2={250} y2={145} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <text x={195} y={158} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold">C = {cVal.toFixed(1)} {u}</text>
          
          {/* M dimension */}
          <line x1={168} y1={20} x2={168} y2={109} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <text x={180} y={65} fill="hsl(var(--chart-3))" fontSize="9" fontWeight="bold">M = {mVal.toFixed(1)}</text>
          
          <text x={35} y={112} fill="hsl(var(--muted-foreground))" fontSize="8">RUN</text>
          <text x={145} y={35} fill="hsl(var(--muted-foreground))" fontSize="8">BRANCH</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-chart-4/10 border border-chart-4/30 p-2.5 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">C (Run)</div>
          <div className="font-bold text-chart-4 text-sm">{cVal.toFixed(1)} {u}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-2.5 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">M (Branch)</div>
          <div className="font-bold text-chart-3 text-sm">{mVal.toFixed(1)} {u}</div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg text-center border">
          <div className="text-[9px] text-muted-foreground uppercase">Weight</div>
          <div className="font-semibold text-sm">{wtVal.toFixed(1)} {wu}</div>
        </div>
      </div>
    </div>
  );
};

// ==================== REDUCER VISUALIZATION ====================
const ReducerVisualization = ({ 
  reducer, 
  units 
}: { 
  reducer: typeof reducerData[0] | undefined;
  units: UnitSettings;
}) => {
  if (!reducer) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Cylinder className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select reducer</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const wu = getWeightUnit(units.length);
  const lVal = convertLength(reducer.length, units.length);
  const lgVal = convertLength(reducer.largeEndOD, units.length);
  const smVal = convertLength(reducer.smallEndOD, units.length);
  const wtVal = convertWeight(reducer.weight, units.length);
  const isEccentric = reducer.type === 'Eccentric';
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-amber-500/10 via-muted/30 to-orange-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{reducer.type} Reducer - ASME B16.9</span>
        </div>
        <svg viewBox="0 0 280 190" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="reducerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity="0.12"/>
            </linearGradient>
          </defs>
          
          {isEccentric ? (
            <>
              <path d="M 40,125 L 40,70 L 95,70 L 155,82 L 240,82 L 240,125 L 155,125 L 95,125 Z" fill="url(#reducerGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <line x1={40} y1={125} x2={240} y2={125} stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4,2"/>
              <text x={140} y={142} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">FLAT ON BOTTOM</text>
            </>
          ) : (
            <>
              <path d="M 40,125 L 40,65 L 95,65 L 155,77 L 240,77 L 240,113 L 155,113 L 95,125 Z" fill="url(#reducerGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <line x1={30} y1={95} x2={250} y2={95} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,3"/>
            </>
          )}
          
          {/* Large end */}
          <line x1={25} y1={65} x2={25} y2={125} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <text x={15} y={98} fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold" transform="rotate(-90 15 98)">⌀{lgVal.toFixed(0)}</text>
          
          {/* Small end */}
          <line x1={255} y1={77} x2={255} y2={113} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <text x={265} y={98} fill="hsl(var(--chart-3))" fontSize="9" fontWeight="bold" transform="rotate(-90 265 98)">⌀{smVal.toFixed(0)}</text>
          
          {/* Length */}
          <line x1={40} y1={155} x2={240} y2={155} stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <text x={140} y={168} textAnchor="middle" fill="hsl(var(--primary))" fontSize="9" fontWeight="bold">L = {lVal.toFixed(0)} {u}</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-4 gap-1.5">
        <div className="bg-destructive/10 border border-destructive/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Large</div>
          <div className="font-bold text-destructive text-xs">{lgVal.toFixed(0)}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Small</div>
          <div className="font-bold text-chart-3 text-xs">{smVal.toFixed(0)}</div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-2 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Length</div>
          <div className="font-bold text-primary text-xs">{lVal.toFixed(0)}</div>
        </div>
        <div className="bg-muted/50 p-2 rounded-lg text-center border">
          <div className="text-[8px] text-muted-foreground uppercase">Weight</div>
          <div className="font-semibold text-xs">{wtVal.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
};

// ==================== GASKET VISUALIZATION ====================
const GasketVisualization = ({ 
  gasket, 
  gasketType = 'spiral',
  units 
}: { 
  gasket: typeof gasketData[0] | undefined;
  gasketType?: GasketType;
  units: UnitSettings;
}) => {
  if (!gasket) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Disc className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select size and class</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const idVal = convertLength(gasket.innerDiameter, units.length);
  const odVal = convertLength(gasket.outerDiameter, units.length);
  const thkVal = convertLength(gasket.thickness, units.length);
  
  const cx = 140, cy = 110;
  const scale = 0.38;
  const od = Math.min(gasket.outerDiameter * scale, 80);
  const id = (gasket.innerDiameter / gasket.outerDiameter) * od;
  
  const typeInfo: Record<GasketType, { name: string; std: string; color: string }> = {
    'flat': { name: 'Flat (Non-Metallic)', std: 'ASME B16.21', color: 'hsl(200 60% 50%)' },
    'spiral': { name: 'Spiral Wound', std: 'ASME B16.20', color: 'hsl(160 55% 45%)' },
    'rtj': { name: 'Ring Type Joint', std: 'ASME B16.20', color: 'hsl(280 50% 55%)' },
  };
  
  const info = typeInfo[gasketType];
  
  return (
    <div className="space-y-3">
      {/* Front View */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Front View - {info.name}</span>
        </div>
        <svg viewBox="0 0 280 220" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id={`gGrad-${gasketType}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={info.color} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={info.color} stopOpacity="0.08"/>
            </linearGradient>
            {gasketType === 'spiral' && (
              <pattern id="spiralPat" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.8" fill={info.color} fillOpacity="0.4"/>
              </pattern>
            )}
          </defs>
          
          <circle cx={cx} cy={cy} r={od} fill={`url(#gGrad-${gasketType})`} stroke={info.color} strokeWidth="2"/>
          
          {gasketType === 'spiral' && (
            <>
              <circle cx={cx} cy={cy} r={(od + id) / 2} fill="url(#spiralPat)" stroke="none"/>
              {[...Array(5)].map((_, i) => (
                <circle key={i} cx={cx} cy={cy} r={id + ((od - id) * (i + 1)) / 6} fill="none" stroke={info.color} strokeWidth="0.4" strokeOpacity="0.3"/>
              ))}
            </>
          )}
          
          {gasketType === 'rtj' && (
            <circle cx={cx} cy={cy} r={(od + id) / 2} fill="none" stroke={info.color} strokeWidth={(od - id) * 0.35} strokeOpacity="0.5"/>
          )}
          
          <circle cx={cx} cy={cy} r={id} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* OD dimension */}
          <line x1={cx - od} y1={cy + od + 15} x2={cx + od} y2={cy + od + 15} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx} y={cy + od + 28} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold">OD = {odVal.toFixed(0)} {u}</text>
          
          {/* ID dimension */}
          <line x1={cx - id} y1={cy} x2={cx + id} y2={cy} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="8" fontWeight="600">ID = {idVal.toFixed(0)} {u}</text>
        </svg>
      </div>
      
      {/* Cross Section */}
      <div className="bg-muted/20 rounded-xl p-3 border">
        <div className="text-center mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cross Section</span>
        </div>
        <svg viewBox="0 0 280 75" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          {/* Flange context */}
          <rect x={30} y={12} width={220} height={12} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          <rect x={30} y={51} width={220} height={12} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          
          {gasketType === 'flat' && (
            <rect x={65} y={24} width={150} height={27} fill={info.color} fillOpacity="0.2" stroke={info.color} strokeWidth="1.5"/>
          )}
          
          {gasketType === 'spiral' && (
            <>
              <rect x={65} y={27} width={8} height={21} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              <rect x={73} y={25} width={134} height={25} fill={info.color} fillOpacity="0.2" stroke={info.color} strokeWidth="1.5"/>
              <rect x={207} y={27} width={8} height={21} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
            </>
          )}
          
          {gasketType === 'rtj' && (
            <ellipse cx={140} cy={38} rx={60} ry={11} fill={info.color} fillOpacity="0.2" stroke={info.color} strokeWidth="2"/>
          )}
          
          {/* Thickness */}
          <line x1={225} y1={24} x2={225} y2={51} stroke="hsl(var(--chart-4))" strokeWidth="1.5"/>
          <text x={240} y={40} fill="hsl(var(--chart-4))" fontSize="8" fontWeight="bold">t = {thkVal.toFixed(1)}</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">ID</div>
          <div className="text-sm font-bold text-primary">{idVal.toFixed(0)} {u}</div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">OD</div>
          <div className="text-sm font-bold text-primary">{odVal.toFixed(0)} {u}</div>
        </div>
        <div className="bg-muted/50 p-2 rounded-lg border text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Thick</div>
          <div className="font-semibold text-sm">{thkVal.toFixed(1)} {u}</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          {info.std} • Class {gasket.pressureClass} • {formatPipeSize(gasket.size, units.pipeSize)}
        </Badge>
      </div>
    </div>
  );
};

// ==================== VALVE VISUALIZATION ====================
const ValveVisualization = ({ 
  valve, 
  endType = 'flanged',
  units 
}: { 
  valve: typeof valveData[0] | undefined;
  endType?: ValveEndType;
  units: UnitSettings;
}) => {
  if (!valve) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Settings2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select size and type</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const wu = getWeightUnit(units.length);
  const ffVal = convertLength(valve.faceToFace, units.length);
  const htVal = convertLength(valve.height, units.length);
  const wtVal = convertWeight(valve.weight, units.length);
  
  const endInfo: Record<ValveEndType, { name: string; std: string }> = {
    'flanged': { name: 'Flanged', std: 'ASME B16.10' },
    'buttweld': { name: 'Butt Weld', std: 'ASME B16.10' },
    'threaded': { name: 'Threaded', std: 'ASME B1.20.1' },
    'socketweld': { name: 'Socket Weld', std: 'ASME B16.11' },
  };
  
  const info = endInfo[endType];
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-rose-500/10 via-muted/30 to-pink-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{valve.type} Valve - {info.name} ({info.std})</span>
        </div>
        <svg viewBox="0 0 290 230" className="w-full max-w-[270px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="valveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity="0.08"/>
            </linearGradient>
          </defs>
          
          {valve.type === 'Gate' && (
            <>
              <path d="M 65,165 L 65,110 L 115,95 L 175,95 L 225,110 L 225,165 L 175,175 L 115,175 Z" fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {endType === 'flanged' && (
                <>
                  <rect x={40} y={120} width={28} height={35} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                  <rect x={222} y={120} width={28} height={35} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                </>
              )}
              <path d="M 125,95 L 125,62 L 165,62 L 165,95" fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <rect x={138} y={25} width={14} height={42} fill="hsl(var(--foreground)/0.2)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              <ellipse cx={145} cy={25} rx={32} ry={7} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <rect x={138} y={72} width={14} height={50} fill="hsl(var(--primary)/0.25)" stroke="hsl(var(--primary))" strokeWidth="1"/>
            </>
          )}
          
          {valve.type === 'Globe' && (
            <>
              <ellipse cx={145} cy={140} rx={68} ry={42} fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {endType === 'flanged' && (
                <>
                  <rect x={52} y={120} width={28} height={38} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                  <rect x={210} y={120} width={28} height={38} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                </>
              )}
              <path d="M 125,98 L 125,68 L 165,68 L 165,98" fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <rect x={138} y={25} width={14} height={48} fill="hsl(var(--foreground)/0.2)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              <ellipse cx={145} cy={25} rx={30} ry={7} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <circle cx={145} cy={125} r={11} fill="hsl(var(--primary)/0.25)" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
            </>
          )}
          
          {valve.type === 'Ball' && (
            <>
              <rect x={75} y={105} width={140} height={65} rx={10} fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <circle cx={145} cy={138} r={26} fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth="2"/>
              <rect x={140} y={112} width={10} height={52} fill="hsl(var(--background))" stroke="none"/>
              {endType === 'flanged' && (
                <>
                  <rect x={50} y={112} width={28} height={48} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                  <rect x={212} y={112} width={28} height={48} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                </>
              )}
              <rect x={140} y={72} width={10} height={38} fill="hsl(var(--foreground)/0.25)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              <rect x={110} y={62} width={70} height={14} rx={3} fill="hsl(var(--chart-5)/0.25)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
            </>
          )}
          
          {valve.type === 'Check' && (
            <>
              <path d="M 70,165 L 70,115 L 145,95 L 220,115 L 220,165 L 145,180 Z" fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              <ellipse cx={160} cy={140} rx={20} ry={32} fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="1.5" transform="rotate(12 160 140)"/>
              {endType === 'flanged' && (
                <>
                  <rect x={45} y={120} width={28} height={35} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                  <rect x={217} y={120} width={28} height={35} fill="hsl(var(--chart-5)/0.15)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
                </>
              )}
              <path d="M 90,140 L 125,140 M 118,132 L 128,140 L 118,148" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
            </>
          )}
          
          {/* F-F dimension */}
          <line x1={50} y1={195} x2={240} y2={195} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <text x={145} y={210} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="9" fontWeight="bold">F-F = {ffVal.toFixed(0)} {u}</text>
          
          {/* Height dimension */}
          <line x1={260} y1={25} x2={260} y2={165} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <text x={270} y={100} fill="hsl(var(--chart-3))" fontSize="8" fontWeight="bold" transform="rotate(-90 270 100)">H = {htVal.toFixed(0)} {u}</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/30 p-2 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Face-Face</div>
          <div className="text-sm font-bold text-destructive">{ffVal.toFixed(0)} {u}</div>
        </div>
        <div className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border border-chart-3/30 p-2 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Height</div>
          <div className="text-sm font-bold text-chart-3">{htVal.toFixed(0)} {u}</div>
        </div>
        <div className="bg-muted/50 p-2 rounded-lg border text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Weight</div>
          <div className="font-semibold text-sm">{wtVal.toFixed(1)} {wu}</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          {info.std} • {valve.type} • Class {valve.pressureClass} • {formatPipeSize(valve.size, units.pipeSize)}
        </Badge>
      </div>
    </div>
  );
};

// ==================== SPECTACLE BLIND VISUALIZATION ====================
const SpectacleBlindVisualization = ({ 
  blank, 
  units 
}: { 
  blank: typeof lineBlankData[0] | undefined;
  units: UnitSettings;
}) => {
  if (!blank) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Ban className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select size and class</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const wu = getWeightUnit(units.length);
  const odVal = convertLength(blank.outerDiameter, units.length);
  const thkVal = convertLength(blank.thickness, units.length);
  const hlVal = convertLength(blank.handleLength, units.length);
  const wtVal = convertWeight(blank.weight, units.length);
  
  const scale = 0.15;
  const od = Math.min(blank.outerDiameter * scale, 42);
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-slate-500/10 via-muted/30 to-gray-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Spectacle Blind - ASME B16.48</span>
        </div>
        <svg viewBox="0 0 320 145" className="w-full max-w-[300px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="blindGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.12"/>
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.04"/>
            </linearGradient>
            <pattern id="blindHatch" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="4" stroke="hsl(var(--foreground))" strokeWidth="0.4" strokeOpacity="0.3"/>
            </pattern>
          </defs>
          
          {/* Spacer ring */}
          <circle cx={70} cy={70} r={od} fill="url(#blindGrad)" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          <circle cx={70} cy={70} r={od * 0.55} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          <text x={70} y={73} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontWeight="500">SPACER</text>
          
          {/* Handle */}
          <rect x={108} y={58} width={104} height={24} rx={4} fill="url(#blindGrad)" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* Blind disc */}
          <circle cx={250} cy={70} r={od} fill="url(#blindHatch)" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          <text x={250} y={73} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontWeight="500">BLIND</text>
          
          {/* OD dimension */}
          <line x1={250 - od} y1={115} x2={250 + od} y2={115} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={250} y={128} textAnchor="middle" fontSize="8" fill="hsl(var(--destructive))" fontWeight="bold">OD = {odVal.toFixed(0)} {u}</text>
          
          {/* Length dimension */}
          <line x1={70 - od} y1={22} x2={250 + od} y2={22} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={160} y={15} textAnchor="middle" fontSize="8" fill="hsl(var(--chart-3))" fontWeight="bold">L = {hlVal.toFixed(0)} {u}</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-4 gap-1.5">
        <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/30 p-1.5 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">OD</div>
          <div className="text-xs font-bold text-destructive">{odVal.toFixed(0)}</div>
        </div>
        <div className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border border-chart-3/30 p-1.5 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Length</div>
          <div className="text-xs font-bold text-chart-3">{hlVal.toFixed(0)}</div>
        </div>
        <div className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border border-chart-4/30 p-1.5 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Thick</div>
          <div className="text-xs font-bold text-chart-4">{thkVal.toFixed(1)}</div>
        </div>
        <div className="bg-muted/50 p-1.5 rounded-lg border text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Weight</div>
          <div className="text-xs font-semibold">{wtVal.toFixed(1)} {wu}</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          ASME B16.48 • Class {blank.pressureClass} • {formatPipeSize(blank.size, units.pipeSize)}
        </Badge>
      </div>
    </div>
  );
};

// ==================== OLET VISUALIZATION ====================
const OletVisualization = ({ 
  olet, 
  units 
}: { 
  olet: typeof oletData[0] | undefined;
  units: UnitSettings;
}) => {
  if (!olet) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select olet type</p>
      </div>
    </div>
  );
  
  const u = getLengthUnit(units.length);
  const wu = getWeightUnit(units.length);
  const lVal = convertLength(olet.length, units.length);
  const wVal = convertLength(olet.width, units.length);
  const wtVal = convertWeight(olet.weight, units.length);
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-indigo-500/10 via-muted/30 to-blue-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{olet.type} - MSS SP-97</span>
        </div>
        <svg viewBox="0 0 280 185" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="oletGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.08"/>
            </linearGradient>
          </defs>
          
          {/* Header pipe */}
          <ellipse cx={140} cy={140} rx={110} ry={26} fill="url(#oletGrad)" stroke="hsl(var(--chart-2))" strokeWidth="2"/>
          <text x={140} y={145} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontWeight="500">HEADER {olet.headerSize}</text>
          
          {/* Olet body */}
          <path d="M 115,115 L 115,60 Q 115,48 128,48 L 152,48 Q 165,48 165,60 L 165,115" fill="url(#oletGrad)" stroke="hsl(var(--chart-2))" strokeWidth="2"/>
          
          {/* Branch bore */}
          <ellipse cx={140} cy={48} rx={14} ry={5} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1"/>
          
          {/* L dimension */}
          <line x1={175} y1={48} x2={175} y2={130} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <text x={188} y={92} fontSize="9" fill="hsl(var(--chart-3))" fontWeight="bold">L = {lVal.toFixed(0)} {u}</text>
          
          {/* W dimension */}
          <line x1={115} y1={35} x2={165} y2={35} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <text x={140} y={28} textAnchor="middle" fontSize="9" fill="hsl(var(--destructive))" fontWeight="bold">W = {wVal.toFixed(0)} {u}</text>
          
          {/* Branch label */}
          <text x={140} y={70} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">{olet.branchSize}</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-4 gap-1.5">
        <div className="bg-chart-2/10 border border-chart-2/30 p-1.5 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Header</div>
          <div className="text-xs font-bold text-chart-2">{olet.headerSize}</div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-1.5 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Branch</div>
          <div className="text-xs font-bold text-primary">{olet.branchSize}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-1.5 rounded-lg text-center">
          <div className="text-[8px] text-muted-foreground uppercase">Length</div>
          <div className="text-xs font-bold text-chart-3">{lVal.toFixed(0)}</div>
        </div>
        <div className="bg-muted/50 p-1.5 rounded-lg border text-center">
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
const SIFVisualization = ({ 
  sif, 
  units 
}: { 
  sif: typeof flexibilityData[0] | undefined;
  units: UnitSettings;
}) => {
  if (!sif) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Select component</p>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-fuchsia-500/10 via-muted/30 to-purple-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{sif.component} - ASME B31.3</span>
        </div>
        <svg viewBox="0 0 280 165" className="w-full max-w-[260px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="sifGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity="0.08"/>
            </linearGradient>
          </defs>
          
          {sif.component.includes('Elbow') && (
            <>
              <path d="M 48,140 L 48,85 Q 48,45 88,45 L 155,45" fill="none" stroke="url(#sifGrad)" strokeWidth="28" strokeLinecap="round"/>
              <path d="M 48,140 L 48,85 Q 48,45 88,45 L 155,45" fill="none" stroke="hsl(var(--chart-4))" strokeWidth="2" strokeLinecap="round"/>
              <circle cx={70} cy={70} r="10" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="3,2"/>
              <text x={90} y={65} fontSize="8" fill="hsl(var(--destructive))" fontWeight="bold">SIF Zone</text>
              <text x={170} y={55} fontSize="9" fill="hsl(var(--muted-foreground))">In-plane SIF</text>
              <text x={170} y={70} fontSize="9" fill="hsl(var(--muted-foreground))">Out-plane SIF</text>
            </>
          )}
          
          {sif.component.includes('Tee') && (
            <>
              <rect x={28} y={65} width={125} height={24} rx={4} fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <rect x={78} y={28} width={24} height={40} rx={4} fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <circle cx={90} cy={65} r={8} fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="3,2"/>
              <text x={105} y={48} fontSize="8" fill="hsl(var(--destructive))" fontWeight="bold">SIF Zone</text>
            </>
          )}
          
          {sif.component.includes('Weldolet') && (
            <>
              <ellipse cx={140} cy={120} rx={95} ry={22} fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <path d="M 120,98 L 120,55 Q 120,42 140,42 Q 160,42 160,55 L 160,98" fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <circle cx={140} cy={98} r={10} fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="3,2"/>
            </>
          )}
          
          {sif.component.includes('Reducer') && (
            <>
              <path d="M 38,92 L 38,58 L 78,58 L 128,68 L 195,68 L 195,82 L 128,82 L 78,92 Z" fill="url(#sifGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
              <text x={115} y={78} fontSize="8" fill="hsl(var(--muted-foreground))">SIF ≈ 1.0</text>
            </>
          )}
          
          {/* Formula box */}
          <rect x={175} y={105} width={95} height={50} rx={5} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1"/>
          <text x={222} y={122} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))">SIF Formula</text>
          <text x={222} y={140} textAnchor="middle" fontSize="9" fill="hsl(var(--primary))" fontFamily="monospace">{sif.sifIn.substring(0, 14)}</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-destructive/10 border border-destructive/30 p-2 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">SIF (In-Plane)</div>
          <div className="font-bold text-destructive text-xs font-mono">{sif.sifIn}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-2 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">SIF (Out-Plane)</div>
          <div className="font-bold text-chart-3 text-xs font-mono">{sif.sifOut}</div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-2 rounded-lg text-center">
          <div className="text-[9px] text-muted-foreground uppercase">k Factor</div>
          <div className="font-bold text-primary text-xs font-mono">{sif.kFactor}</div>
        </div>
      </div>
      
      <div className="bg-muted/50 p-2.5 rounded-lg border">
        <div className="text-[9px] text-muted-foreground font-medium uppercase">Formula Notes</div>
        <div className="text-xs mt-1">{sif.description}</div>
      </div>
    </div>
  );
};

// ==================== SAFE SPAN VISUALIZATION ====================
const SafeSpanVisualization = ({ 
  span, 
  units 
}: { 
  span: typeof safeSpanData[0] | undefined;
  units: UnitSettings;
}) => {
  if (!span) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
      <div className="text-center">
        <Ruler className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Select pipe size</p>
      </div>
    </div>
  );
  
  // Convert spans: data is in meters
  const spanVal = units.length === 'imperial' ? (span.maxSpan * 3.28084) : span.maxSpan;
  const spanFixedVal = units.length === 'imperial' ? (span.maxSpanFixed * 3.28084) : span.maxSpanFixed;
  const deflVal = units.length === 'imperial' ? (span.deflection / 25.4) : span.deflection;
  const spanUnit = units.length === 'imperial' ? 'ft' : 'm';
  const deflUnit = units.length === 'imperial' ? 'in' : 'mm';
  
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-emerald-500/10 via-muted/30 to-green-500/10 rounded-xl p-4 border border-primary/20">
        <div className="text-center mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pipe Support Span - ASME B31.1</span>
        </div>
        <svg viewBox="0 0 310 145" className="w-full max-w-[300px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <defs>
            <linearGradient id="spanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.25"/>
              <stop offset="50%" stopColor="hsl(var(--chart-2))" stopOpacity="0.12"/>
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.25"/>
            </linearGradient>
          </defs>
          
          {/* Supports */}
          <rect x={28} y={72} width={14} height={55} fill="hsl(var(--foreground)/0.25)" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          <rect x={268} y={72} width={14} height={55} fill="hsl(var(--foreground)/0.25)" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* Pipe with deflection */}
          <path d="M 35,72 Q 155,88 275,72" fill="none" stroke="url(#spanGrad)" strokeWidth="18" strokeLinecap="round"/>
          <path d="M 35,72 Q 155,88 275,72" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="2" strokeLinecap="round"/>
          
          {/* Deflection indicator */}
          <line x1={155} y1={72} x2={155} y2={88} stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="3,2"/>
          <text x={168} y={85} fontSize="9" fill="hsl(var(--destructive))" fontWeight="bold">δ = {deflVal.toFixed(2)} {deflUnit}</text>
          
          {/* Span dimension */}
          <line x1={35} y1={115} x2={275} y2={115} stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <line x1={35} y1={110} x2={35} y2={120} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1={275} y1={110} x2={275} y2={120} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <text x={155} y={130} textAnchor="middle" fontSize="10" fill="hsl(var(--primary))" fontWeight="bold">
            Max Span = {spanVal.toFixed(1)} {spanUnit}
          </text>
          
          {/* Support labels */}
          <text x={35} y={65} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">SUPPORT</text>
          <text x={275} y={65} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">SUPPORT</text>
        </svg>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-2.5 rounded-lg">
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Simple Support</div>
          <div className="text-base font-bold text-primary">{spanVal.toFixed(1)} <span className="text-[10px] font-normal">{spanUnit}</span></div>
        </div>
        <div className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border border-chart-3/30 p-2.5 rounded-lg">
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Fixed Support</div>
          <div className="text-base font-bold text-chart-3">{spanFixedVal.toFixed(1)} <span className="text-[10px] font-normal">{spanUnit}</span></div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Natural Frequency</div>
          <div className="font-semibold text-sm">{span.naturalFrequency} <span className="text-[10px] text-muted-foreground">Hz</span></div>
        </div>
        <div className="bg-muted/50 p-2.5 rounded-lg border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Max Deflection</div>
          <div className="font-semibold text-sm">{deflVal.toFixed(2)} <span className="text-[10px] text-muted-foreground">{deflUnit}</span></div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant="outline" className="text-[10px] bg-background/50 px-3">
          ASME B31.1 • {formatPipeSize(span.size, units.pipeSize)} • {span.contentDensity === 0 ? 'Empty' : 'Water Filled'}
        </Badge>
      </div>
    </div>
  );
};

// ==================== MAIN CALCULATOR ====================
export default function PipingComponentsCalculator() {
  // Unit settings
  const [units, setUnits] = useState<UnitSettings>({
    length: 'metric',
    temperature: 'celsius',
    pipeSize: 'inch'
  });
  const [selectedMaterial, setSelectedMaterial] = useState('cs-a106b');
  
  // Pipe states
  const [pipeSize, setPipeSize] = useState("4\"");
  const [pipeSchedule, setPipeSchedule] = useState("40");
  const [pipeMode, setPipeMode] = useState<PipeSelectionMode>('schedule');
  
  // Flange states
  const [selectedFlangeStandard, setSelectedFlangeStandard] = useState<FlangeStandard>('B16.5');
  const [selectedFlangeType, setSelectedFlangeType] = useState('wn');
  const [selectedSize, setSelectedSize] = useState("4\"");
  const [selectedClass, setSelectedClass] = useState("150");
  
  // Fitting states
  const [selectedFittingStandard, setSelectedFittingStandard] = useState<FittingStandard>('B16.9');
  const [selectedFittingSize, setSelectedFittingSize] = useState("4\"");
  const [selectedFittingType, setSelectedFittingType] = useState("elbow");
  
  // Gasket states
  const [selectedGasketType, setSelectedGasketType] = useState<GasketType>('spiral');
  
  // Valve states
  const [selectedValveEndType, setSelectedValveEndType] = useState<ValveEndType>('flanged');
  const [selectedValveType, setSelectedValveType] = useState("Gate");
  
  // Olet states
  const [selectedOletType, setSelectedOletType] = useState("Weldolet");
  
  // SIF states
  const [selectedSIFComponent, setSelectedSIFComponent] = useState(flexibilityData[0]?.component || "");
  
  // Span states
  const [selectedSpanSize, setSelectedSpanSize] = useState("4\"");
  
  // Computed values
  const pipeSizes = useMemo(() => getUniquePipeSizes(), []);
  const pipeSchedules = useMemo(() => getSchedulesForPipeSize(pipeSize), [pipeSize]);
  const selectedPipe = useMemo(() => getPipeBySchedule(pipeSize, pipeSchedule), [pipeSize, pipeSchedule]);
  
  const sizes = useMemo(() => getUniqueSizes(), []);
  
  // Flange sizes and classes based on selected standard
  const flangeSizes = useMemo(() => {
    const standardKey = selectedFlangeStandard === 'B16.36' ? 'B16.5' : selectedFlangeStandard;
    return getFlangeSizesByStandard(standardKey as FlangeStandardType);
  }, [selectedFlangeStandard]);
  
  const flangeClasses = useMemo(() => {
    const standardKey = selectedFlangeStandard === 'B16.36' ? 'B16.5' : selectedFlangeStandard;
    return getPressureClassesByStandard(standardKey as FlangeStandardType);
  }, [selectedFlangeStandard]);
  
  // Filter flanges by selected standard
  const filteredFlanges = useMemo(() => {
    const standardKey = selectedFlangeStandard === 'B16.36' ? 'B16.5' : selectedFlangeStandard;
    return getFlangesByStandard(standardKey as FlangeStandardType);
  }, [selectedFlangeStandard]);
  
  const selectedFlange = useMemo(() => {
    return filteredFlanges.find(f => f.size === selectedSize && f.pressureClass === selectedClass);
  }, [filteredFlanges, selectedSize, selectedClass]);
  
  // Reset size/class when standard changes if current selection is invalid
  useMemo(() => {
    if (!flangeSizes.includes(selectedSize)) {
      setSelectedSize(flangeSizes[0] || '4"');
    }
    if (!flangeClasses.includes(selectedClass)) {
      setSelectedClass(flangeClasses[0] || '150');
    }
  }, [selectedFlangeStandard, flangeSizes, flangeClasses]);
  
  const selectedElbow = useMemo(() => elbowData.find(e => e.size === selectedFittingSize && e.type === '90LR'), [selectedFittingSize]);
  const selectedTee = useMemo(() => teeData.find(t => t.size === selectedFittingSize), [selectedFittingSize]);
  const selectedReducer = useMemo(() => reducerData.find(r => r.sizeFrom === selectedFittingSize), [selectedFittingSize]);
  
  const selectedGasket = useMemo(() => gasketData.find(g => g.size === selectedSize && g.pressureClass === selectedClass), [selectedSize, selectedClass]);
  const selectedValve = useMemo(() => valveData.find(v => v.size === selectedSize && v.type === selectedValveType), [selectedSize, selectedValveType]);
  const selectedBlank = useMemo(() => lineBlankData.find(lb => lb.size === selectedSize && lb.pressureClass === selectedClass), [selectedSize, selectedClass]);
  const selectedOlet = useMemo(() => oletData.find(o => o.type === selectedOletType), [selectedOletType]);
  const selectedSIF = useMemo(() => flexibilityData.find(f => f.component === selectedSIFComponent), [selectedSIFComponent]);
  const selectedSpan = useMemo(() => safeSpanData.find(s => s.size === selectedSpanSize), [selectedSpanSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
          Piping Components Reference
        </h2>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          ASME/MSS dimensional data for pipes, flanges, fittings, gaskets, valves, olets, and pipe support spans
        </p>
      </div>
      
      {/* Unit System Header */}
      <UnitSystemHeader
        units={units}
        setUnits={setUnits}
        selectedMaterial={selectedMaterial}
        setSelectedMaterial={setSelectedMaterial}
      />

      {/* Main Tabs */}
      <Tabs defaultValue="pipe" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9 h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
          <TabsTrigger value="pipe" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
            <Cylinder className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Pipe
          </TabsTrigger>
          <TabsTrigger value="flanges" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
            <Circle className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Flanges
          </TabsTrigger>
          <TabsTrigger value="fittings" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
            <CornerDownRight className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Fittings
          </TabsTrigger>
          <TabsTrigger value="gaskets" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
            <Disc className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Gaskets
          </TabsTrigger>
          <TabsTrigger value="valves" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
            <Settings2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Valves
          </TabsTrigger>
          <TabsTrigger value="blanks" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
            <Ban className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Blanks
          </TabsTrigger>
          <TabsTrigger value="olets" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
            <GitBranch className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Olets
          </TabsTrigger>
          <TabsTrigger value="flexibility" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
            <Activity className="w-3.5 h-3.5 mr-1 hidden sm:inline" />SIF
          </TabsTrigger>
          <TabsTrigger value="spans" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg py-2">
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
                  <CardDescription>Carbon & Alloy Steel Pipe per ASME B36.10M</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge 
                    variant={pipeMode === 'schedule' ? 'default' : 'outline'} 
                    className="cursor-pointer text-xs"
                    onClick={() => setPipeMode('schedule')}
                  >By Schedule</Badge>
                  <Badge 
                    variant={pipeMode === 'wallThickness' ? 'default' : 'outline'} 
                    className="cursor-pointer text-xs"
                    onClick={() => setPipeMode('wallThickness')}
                  >By Wall Thickness</Badge>
                </div>
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
                        <SelectContent className="bg-popover border shadow-lg z-50">{pipeSizes.map(s => <SelectItem key={s} value={s}>{formatPipeSize(s, units.pipeSize)}</SelectItem>)}</SelectContent>
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
                  <PipeVisualization pipe={selectedPipe} units={units} mode={pipeMode} />
                </div>
                <ScrollArea className="h-[480px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Size</TableHead>
                        <TableHead className="text-xs">Sch</TableHead>
                        <TableHead className="text-xs">OD</TableHead>
                        <TableHead className="text-xs">Wall</TableHead>
                        <TableHead className="text-xs">ID</TableHead>
                        <TableHead className="text-xs">{getWeightUnit(units.length)}/m</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipeData.filter(p => p.size === pipeSize).map((p, i) => (
                        <TableRow 
                          key={i} 
                          className={`cursor-pointer transition-all ${p.schedule === pipeSchedule ? "bg-primary/15 hover:bg-primary/20 border-l-4 border-l-primary" : "hover:bg-muted/50"}`} 
                          onClick={() => setPipeSchedule(p.schedule)}
                        >
                          <TableCell className="font-medium text-xs">{formatPipeSize(p.size, units.pipeSize)}</TableCell>
                          <TableCell><Badge variant={p.schedule === pipeSchedule ? "default" : "outline"} className="text-[10px]">{p.schedule}</Badge></TableCell>
                          <TableCell className="text-xs">{convertLength(p.outerDiameter, units.length).toFixed(units.length === 'imperial' ? 3 : 1)}</TableCell>
                          <TableCell className="font-mono text-xs">{convertLength(p.wallThickness, units.length).toFixed(units.length === 'imperial' ? 3 : 2)}</TableCell>
                          <TableCell className="text-xs">{convertLength(p.insideDiameter, units.length).toFixed(units.length === 'imperial' ? 3 : 1)}</TableCell>
                          <TableCell className="text-xs">{convertWeight(p.weightPerMeter, units.length).toFixed(2)}</TableCell>
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
                <div className="flex gap-1.5 flex-wrap">
                  {(['B16.5', 'B16.47A', 'B16.47B', 'B16.36'] as FlangeStandard[]).map(std => (
                    <Badge 
                      key={std}
                      variant={selectedFlangeStandard === std ? 'default' : 'outline'} 
                      className="cursor-pointer text-[10px]"
                      onClick={() => setSelectedFlangeStandard(std)}
                    >{std === 'B16.47A' ? 'B16.47 A' : std === 'B16.47B' ? 'B16.47 B' : std}</Badge>
                  ))}
                </div>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border text-sm">
                {selectedFlangeStandard === 'B16.5' && <p><strong>ASME B16.5</strong> — Pipe Flanges and Flanged Fittings: NPS ½" through NPS 24"</p>}
                {selectedFlangeStandard === 'B16.47A' && <p><strong>ASME B16.47 Series A</strong> — Large Diameter Steel Flanges: NPS 26" through NPS 60" (MSS SP-44 design)</p>}
                {selectedFlangeStandard === 'B16.47B' && <p><strong>ASME B16.47 Series B</strong> — Large Diameter Steel Flanges: NPS 26" through NPS 60" (API 605 design)</p>}
                {selectedFlangeStandard === 'B16.36' && <p><strong>ASME B16.36</strong> — Orifice Flanges: NPS ½" through NPS 24" with pressure taps for flow measurement</p>}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{flangeSizes.map(s => <SelectItem key={s} value={s}>{formatPipeSize(s, units.pipeSize)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{flangeClasses.map(c => <SelectItem key={c} value={c}>{c}#</SelectItem>)}</SelectContent>
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
                  
                  <FlangeVisualization flange={selectedFlange} standard={selectedFlangeStandard} flangeType={selectedFlangeType} units={units} />
                </div>
                
                <ScrollArea className="h-[520px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Size</TableHead>
                        <TableHead className="text-xs">Class</TableHead>
                        <TableHead className="text-xs">OD ({getLengthUnit(units.length)})</TableHead>
                        <TableHead className="text-xs">BCD ({getLengthUnit(units.length)})</TableHead>
                        <TableHead className="text-xs">Bolts</TableHead>
                        <TableHead className="text-xs">Thk ({getLengthUnit(units.length)})</TableHead>
                        <TableHead className="text-xs">Wt ({getWeightUnit(units.length)})</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFlanges.filter(f => f.size === selectedSize).map((f, i) => (
                        <TableRow 
                          key={i} 
                          className={`cursor-pointer transition-all ${f.pressureClass === selectedClass ? "bg-primary/15 border-l-4 border-l-primary" : "hover:bg-muted/50"}`} 
                          onClick={() => setSelectedClass(f.pressureClass)}
                        >
                          <TableCell className="font-medium text-xs">{formatPipeSize(f.size, units.pipeSize)}</TableCell>
                          <TableCell><Badge variant={f.pressureClass === selectedClass ? "default" : "outline"} className="text-[10px]">{f.pressureClass}#</Badge></TableCell>
                          <TableCell className="text-xs">{convertLength(f.outerDiameter, units.length).toFixed(units.length === 'imperial' ? 2 : 0)}</TableCell>
                          <TableCell className="text-xs">{convertLength(f.boltCircleDiameter, units.length).toFixed(units.length === 'imperial' ? 2 : 0)}</TableCell>
                          <TableCell className="text-xs font-mono">{f.numBolts}×{f.boltSize}</TableCell>
                          <TableCell className="text-xs">{convertLength(f.thickness, units.length).toFixed(units.length === 'imperial' ? 2 : 0)}</TableCell>
                          <TableCell className="text-xs">{convertWeight(f.weight, units.length).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
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
                  <CardTitle className="flex items-center gap-2"><CornerDownRight className="w-5 h-5 text-primary" />Fittings Dimensions</CardTitle>
                  <CardDescription>Elbows, Tees, Reducers</CardDescription>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([{id: 'B16.9', name: 'Butt Weld B16.9'}, {id: 'B16.11-THD', name: 'Threaded B16.11'}, {id: 'B16.11-SW', name: 'Socket Weld B16.11'}] as {id: FittingStandard; name: string}[]).map(std => (
                    <Badge 
                      key={std.id}
                      variant={selectedFittingStandard === std.id ? 'default' : 'outline'} 
                      className="cursor-pointer text-[10px]"
                      onClick={() => setSelectedFittingStandard(std.id)}
                    >{std.name}</Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Select value={selectedFittingSize} onValueChange={setSelectedFittingSize}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">{pipeSizes.map(s => <SelectItem key={s} value={s}>{formatPipeSize(s, units.pipeSize)}</SelectItem>)}</SelectContent>
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
                  {selectedFittingType === 'elbow' && <ElbowVisualization elbow={selectedElbow} fittingStandard={selectedFittingStandard} units={units} />}
                  {selectedFittingType === 'tee' && <TeeVisualization tee={selectedTee} fittingStandard={selectedFittingStandard} units={units} />}
                  {selectedFittingType === 'reducer' && <ReducerVisualization reducer={selectedReducer} units={units} />}
                </div>
                <ScrollArea className="h-[400px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      {selectedFittingType === 'elbow' && <TableRow><TableHead className="text-xs">Size</TableHead><TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">A</TableHead><TableHead className="text-xs">OD</TableHead><TableHead className="text-xs">Wt</TableHead></TableRow>}
                      {selectedFittingType === 'tee' && <TableRow><TableHead className="text-xs">Size</TableHead><TableHead className="text-xs">C</TableHead><TableHead className="text-xs">M</TableHead><TableHead className="text-xs">OD</TableHead><TableHead className="text-xs">Wt</TableHead></TableRow>}
                      {selectedFittingType === 'reducer' && <TableRow><TableHead className="text-xs">From</TableHead><TableHead className="text-xs">To</TableHead><TableHead className="text-xs">L</TableHead><TableHead className="text-xs">OD</TableHead><TableHead className="text-xs">Wt</TableHead></TableRow>}
                    </TableHeader>
                    <TableBody>
                      {selectedFittingType === 'elbow' && elbowData.filter(e => e.type === '90LR').map((e, i) => (
                        <TableRow key={i} className={e.size === selectedFittingSize ? "bg-primary/15" : ""}>
                          <TableCell className="font-medium text-xs">{formatPipeSize(e.size, units.pipeSize)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{e.type}</Badge></TableCell>
                          <TableCell className="text-xs">{convertLength(e.centerToEnd, units.length).toFixed(1)}</TableCell>
                          <TableCell className="text-xs">{convertLength(e.outerDiameter, units.length).toFixed(1)}</TableCell>
                          <TableCell className="text-xs">{convertWeight(e.weight, units.length).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                      {selectedFittingType === 'tee' && teeData.map((t, i) => (
                        <TableRow key={i} className={t.size === selectedFittingSize ? "bg-primary/15" : ""}>
                          <TableCell className="font-medium text-xs">{formatPipeSize(t.size, units.pipeSize)}</TableCell>
                          <TableCell className="text-xs">{convertLength(t.centerToEnd, units.length).toFixed(1)}</TableCell>
                          <TableCell className="text-xs">{convertLength(t.centerToBranch, units.length).toFixed(1)}</TableCell>
                          <TableCell className="text-xs">{convertLength(t.outerDiameter, units.length).toFixed(1)}</TableCell>
                          <TableCell className="text-xs">{convertWeight(t.weight, units.length).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                      {selectedFittingType === 'reducer' && reducerData.map((r, i) => (
                        <TableRow key={i} className={r.sizeFrom === selectedFittingSize ? "bg-primary/15" : ""}>
                          <TableCell className="font-medium text-xs">{formatPipeSize(r.sizeFrom, units.pipeSize)}</TableCell>
                          <TableCell className="text-xs">{formatPipeSize(r.sizeTo, units.pipeSize)}</TableCell>
                          <TableCell className="text-xs">{convertLength(r.length, units.length).toFixed(0)}</TableCell>
                          <TableCell className="text-xs">{convertLength(r.largeEndOD, units.length).toFixed(1)}</TableCell>
                          <TableCell className="text-xs">{convertWeight(r.weight, units.length).toFixed(1)}</TableCell>
                        </TableRow>
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
                  <CardDescription>Flat, Spiral Wound, Ring Type Joint</CardDescription>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([{id: 'flat', name: 'Flat B16.21'}, {id: 'spiral', name: 'Spiral B16.20'}, {id: 'rtj', name: 'RTJ B16.20'}] as {id: GasketType; name: string}[]).map(g => (
                    <Badge 
                      key={g.id}
                      variant={selectedGasketType === g.id ? 'default' : 'outline'} 
                      className="cursor-pointer text-[10px]"
                      onClick={() => setSelectedGasketType(g.id)}
                    >{g.name}</Badge>
                  ))}
                </div>
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
                        <SelectContent className="bg-popover border shadow-lg z-50">{sizes.map(s => <SelectItem key={s} value={s}>{formatPipeSize(s, units.pipeSize)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{pressureClasses.slice(0, 4).map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <GasketVisualization gasket={selectedGasket} gasketType={selectedGasketType} units={units} />
                </div>
                <ScrollArea className="h-[420px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead className="text-xs">Size</TableHead>
                        <TableHead className="text-xs">Class</TableHead>
                        <TableHead className="text-xs">ID</TableHead>
                        <TableHead className="text-xs">OD</TableHead>
                        <TableHead className="text-xs">Thk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gasketData.map((g, i) => (
                        <TableRow key={i} className={g.size === selectedSize && g.pressureClass === selectedClass ? "bg-primary/15" : ""}>
                          <TableCell className="font-medium text-xs">{formatPipeSize(g.size, units.pipeSize)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{g.pressureClass}</Badge></TableCell>
                          <TableCell className="text-xs">{convertLength(g.innerDiameter, units.length).toFixed(units.length === 'imperial' ? 2 : 0)}</TableCell>
                          <TableCell className="text-xs">{convertLength(g.outerDiameter, units.length).toFixed(units.length === 'imperial' ? 2 : 0)}</TableCell>
                          <TableCell className="text-xs">{convertLength(g.thickness, units.length).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
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
                  <CardDescription>Gate, Globe, Ball, Check per API 600 / ASME B16.10</CardDescription>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([{id: 'flanged', name: 'Flanged'}, {id: 'buttweld', name: 'Butt Weld'}, {id: 'threaded', name: 'Threaded'}, {id: 'socketweld', name: 'Socket Weld'}] as {id: ValveEndType; name: string}[]).map(e => (
                    <Badge 
                      key={e.id}
                      variant={selectedValveEndType === e.id ? 'default' : 'outline'} 
                      className="cursor-pointer text-[10px]"
                      onClick={() => setSelectedValveEndType(e.id)}
                    >{e.name}</Badge>
                  ))}
                </div>
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
                        <SelectContent className="bg-popover border shadow-lg z-50">{sizes.map(s => <SelectItem key={s} value={s}>{formatPipeSize(s, units.pipeSize)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={selectedValveType} onValueChange={setSelectedValveType}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">
                          {valveTypes.map(t => <SelectItem key={t.id} value={t.name.split(' ')[0]}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ValveVisualization valve={selectedValve} endType={selectedValveEndType} units={units} />
                </div>
                <ScrollArea className="h-[480px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead className="text-xs">Size</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">F-F</TableHead>
                        <TableHead className="text-xs">Height</TableHead>
                        <TableHead className="text-xs">Wt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {valveData.filter(v => v.type === selectedValveType).map((v, i) => (
                        <TableRow key={i} className={v.size === selectedSize ? "bg-primary/15" : ""}>
                          <TableCell className="font-medium text-xs">{formatPipeSize(v.size, units.pipeSize)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{v.type}</Badge></TableCell>
                          <TableCell className="text-xs">{convertLength(v.faceToFace, units.length).toFixed(units.length === 'imperial' ? 2 : 0)}</TableCell>
                          <TableCell className="text-xs">{convertLength(v.height, units.length).toFixed(units.length === 'imperial' ? 2 : 0)}</TableCell>
                          <TableCell className="text-xs">{convertWeight(v.weight, units.length).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
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
                  <CardDescription>Line Blanks per ASME B16.48</CardDescription>
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
                        <SelectContent className="bg-popover border shadow-lg z-50">{[...new Set(lineBlankData.map(lb => lb.size))].map(s => <SelectItem key={s} value={s}>{formatPipeSize(s, units.pipeSize)}</SelectItem>)}</SelectContent>
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
                  <SpectacleBlindVisualization blank={selectedBlank} units={units} />
                </div>
                <ScrollArea className="h-[420px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead className="text-xs">Size</TableHead>
                        <TableHead className="text-xs">Class</TableHead>
                        <TableHead className="text-xs">OD</TableHead>
                        <TableHead className="text-xs">Thk</TableHead>
                        <TableHead className="text-xs">Handle</TableHead>
                        <TableHead className="text-xs">Wt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineBlankData.map((lb, i) => (
                        <TableRow key={i} className={lb.size === selectedSize && lb.pressureClass === selectedClass ? "bg-primary/15" : ""}>
                          <TableCell className="font-medium text-xs">{formatPipeSize(lb.size, units.pipeSize)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{lb.pressureClass}</Badge></TableCell>
                          <TableCell className="text-xs">{convertLength(lb.outerDiameter, units.length).toFixed(units.length === 'imperial' ? 2 : 0)}</TableCell>
                          <TableCell className="text-xs">{convertLength(lb.thickness, units.length).toFixed(1)}</TableCell>
                          <TableCell className="text-xs">{convertLength(lb.handleLength, units.length).toFixed(0)}×{convertLength(lb.handleWidth, units.length).toFixed(0)}</TableCell>
                          <TableCell className="text-xs">{convertWeight(lb.weight, units.length).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
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
                  <CardDescription>Weldolet, Sockolet, Threadolet per MSS SP-97</CardDescription>
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
                  <OletVisualization olet={selectedOlet} units={units} />
                </div>
                <ScrollArea className="h-[420px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead className="text-xs">Header</TableHead>
                        <TableHead className="text-xs">Branch</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">L</TableHead>
                        <TableHead className="text-xs">W</TableHead>
                        <TableHead className="text-xs">Wt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {oletData.filter(o => o.type === selectedOletType).map((o, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-xs">{o.headerSize}</TableCell>
                          <TableCell className="text-xs">{o.branchSize}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{o.type}</Badge></TableCell>
                          <TableCell className="text-xs">{convertLength(o.length, units.length).toFixed(0)}</TableCell>
                          <TableCell className="text-xs">{convertLength(o.width, units.length).toFixed(0)}</TableCell>
                          <TableCell className="text-xs">{convertWeight(o.weight, units.length).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
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
                  <CardDescription>Flexibility Analysis per ASME B31.3</CardDescription>
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
                  <SIFVisualization sif={selectedSIF} units={units} />
                </div>
                <ScrollArea className="h-[480px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead className="text-xs">Component</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">SIF In</TableHead>
                        <TableHead className="text-xs">SIF Out</TableHead>
                        <TableHead className="text-xs">k</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flexibilityData.map((f, i) => (
                        <TableRow key={i} className={f.component === selectedSIFComponent ? "bg-primary/15" : ""}>
                          <TableCell className="font-medium text-xs">{f.component}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{f.type}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{f.sifIn}</TableCell>
                          <TableCell className="font-mono text-xs">{f.sifOut}</TableCell>
                          <TableCell className="font-mono text-xs">{f.kFactor}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
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
                  <CardDescription>Maximum Span Distances per ASME B31.1</CardDescription>
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
                      <SelectContent className="bg-popover border shadow-lg z-50">{[...new Set(safeSpanData.map(s => s.size))].map(s => <SelectItem key={s} value={s}>{formatPipeSize(s, units.pipeSize)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <SafeSpanVisualization span={selectedSpan} units={units} />
                </div>
                <ScrollArea className="h-[420px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead className="text-xs">Size</TableHead>
                        <TableHead className="text-xs">Content</TableHead>
                        <TableHead className="text-xs">Simple</TableHead>
                        <TableHead className="text-xs">Fixed</TableHead>
                        <TableHead className="text-xs">Hz</TableHead>
                        <TableHead className="text-xs">Defl</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeSpanData.map((s, i) => (
                        <TableRow key={i} className={s.size === selectedSpanSize ? "bg-primary/15" : ""}>
                          <TableCell className="font-medium text-xs">{formatPipeSize(s.size, units.pipeSize)}</TableCell>
                          <TableCell className="text-xs">{s.contentDensity === 0 ? "Empty" : "Water"}</TableCell>
                          <TableCell className="text-xs">{s.maxSpan} {units.length === 'imperial' ? 'ft' : 'm'}</TableCell>
                          <TableCell className="text-xs">{s.maxSpanFixed} {units.length === 'imperial' ? 'ft' : 'm'}</TableCell>
                          <TableCell className="text-xs">{s.naturalFrequency}</TableCell>
                          <TableCell className="text-xs">{s.deflection}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
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