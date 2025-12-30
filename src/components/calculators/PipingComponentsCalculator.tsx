import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Circle, Cylinder, CornerDownRight, Settings2, GitBranch, Disc, Gauge, Ban, Activity, Ruler } from "lucide-react";

// ==================== PIPE VISUALIZATION ====================
const PipeVisualization = ({ pipe }: { pipe: typeof pipeData[0] | undefined }) => {
  if (!pipe) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select pipe size and schedule</div>;
  
  const scale = 0.6;
  const cx = 140, cy = 120;
  const od = Math.min(pipe.outerDiameter * scale, 90);
  const id = (pipe.insideDiameter / pipe.outerDiameter) * od;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-500/10 via-muted/30 to-cyan-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 280 240" className="w-full max-w-sm mx-auto">
          <defs>
            <linearGradient id="pipeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1"/>
            </linearGradient>
            <filter id="pipeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.2"/>
            </filter>
          </defs>
          {/* Outer circle with shadow */}
          <circle cx={cx} cy={cy} r={od} fill="url(#pipeGradient)" stroke="hsl(var(--primary))" strokeWidth="2.5" filter="url(#pipeShadow)"/>
          {/* Wall thickness ring */}
          <circle cx={cx} cy={cy} r={(od + id) / 2} fill="none" stroke="hsl(var(--primary))" strokeWidth={od - id} strokeOpacity="0.4"/>
          {/* Inner circle (bore) */}
          <circle cx={cx} cy={cy} r={id} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* OD dimension line */}
          <line x1={cx - od - 5} y1={cy - od} x2={cx - od - 5} y2={cy + od} stroke="hsl(var(--destructive))" strokeWidth="1.5" markerStart="url(#arrowStart)" markerEnd="url(#arrowEnd)"/>
          <line x1={cx - od - 10} y1={cy - od} x2={cx - od} y2={cy - od} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx - od - 10} y1={cy + od} x2={cx - od} y2={cy + od} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx - od - 20} y={cy} textAnchor="middle" className="text-[11px] fill-destructive font-bold" transform={`rotate(-90 ${cx - od - 20} ${cy})`}>OD {pipe.outerDiameter}</text>
          
          {/* ID dimension line */}
          <line x1={cx - id} y1={cy + id + 20} x2={cx + id} y2={cy + id + 20} stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <line x1={cx - id} y1={cy + id + 15} x2={cx - id} y2={cy + id + 25} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1={cx + id} y1={cy + id + 15} x2={cx + id} y2={cy + id + 25} stroke="hsl(var(--primary))" strokeWidth="1"/>
          <text x={cx} y={cy + id + 35} textAnchor="middle" className="text-[11px] fill-primary font-bold">ID {pipe.insideDiameter} mm</text>
          
          {/* Wall thickness indicator */}
          <line x1={cx + id + 3} y1={cy - 20} x2={cx + od - 3} y2={cy - 20} stroke="hsl(var(--chart-4))" strokeWidth="3"/>
          <text x={cx + od + 15} y={cy - 15} className="text-[10px] fill-muted-foreground font-medium">t = {pipe.wallThickness}</text>
          
          {/* Center mark */}
          <circle cx={cx} cy={cy} r="3" fill="hsl(var(--primary))"/>
          <text x={cx} y={cy - 8} textAnchor="middle" className="text-[9px] fill-muted-foreground">CL</text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-4 rounded-xl">
          <div className="text-xs text-muted-foreground font-medium">Wall Thickness</div>
          <div className="text-xl font-bold text-primary">{pipe.wallThickness} mm</div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-4 rounded-xl">
          <div className="text-xs text-muted-foreground font-medium">Weight</div>
          <div className="text-xl font-bold text-primary">{pipe.weightPerMeter} kg/m</div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl border">
          <div className="text-xs text-muted-foreground">Internal Area</div>
          <div className="font-semibold">{pipe.internalArea.toLocaleString()} mm²</div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl border">
          <div className="text-xs text-muted-foreground">Water Capacity</div>
          <div className="font-semibold">{pipe.waterCapacity} L/m</div>
        </div>
      </div>
    </div>
  );
};

// ==================== FLANGE VISUALIZATION ====================
const FlangeVisualization = ({ flange }: { flange: typeof flangeData[0] | undefined }) => {
  if (!flange) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select size and class</div>;
  
  const cx = 150, cy = 130;
  const scale = 0.32;
  const od = Math.min(flange.outerDiameter * scale, 100);
  const bcd = (flange.boltCircleDiameter / flange.outerDiameter) * od;
  const rf = (flange.raisedFaceDiameter / flange.outerDiameter) * od;
  const hub = (flange.hubDiameter / flange.outerDiameter) * od;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-orange-500/10 via-muted/30 to-yellow-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 300 260" className="w-full max-w-sm mx-auto">
          <defs>
            <linearGradient id="flangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05"/>
            </linearGradient>
            <filter id="flangeShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="4" floodOpacity="0.15"/>
            </filter>
          </defs>
          {/* Outer diameter */}
          <circle cx={cx} cy={cy} r={od} fill="url(#flangeGrad)" stroke="hsl(var(--primary))" strokeWidth="2.5" filter="url(#flangeShadow)"/>
          {/* Bolt circle (dashed) */}
          <circle cx={cx} cy={cy} r={bcd} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="6,4"/>
          {/* Raised face */}
          <circle cx={cx} cy={cy} r={rf} fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth="2"/>
          {/* Hub/bore */}
          <circle cx={cx} cy={cy} r={hub} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          
          {/* Bolt holes */}
          {Array.from({ length: flange.numBolts }).map((_, i) => {
            const angle = (2 * Math.PI * i) / flange.numBolts - Math.PI/2;
            const bx = cx + bcd * Math.cos(angle);
            const by = cy + bcd * Math.sin(angle);
            return (
              <g key={i}>
                <circle cx={bx} cy={by} r={5} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
                <circle cx={bx} cy={by} r={2} fill="hsl(var(--foreground))"/>
              </g>
            );
          })}
          
          {/* OD dimension */}
          <line x1={cx} y1={cy - od - 5} x2={cx + od + 30} y2={cy - od - 5} stroke="hsl(var(--destructive))" strokeWidth="1" strokeDasharray="3,2"/>
          <text x={cx + od + 35} y={cy - od - 2} className="text-[10px] fill-destructive font-bold">OD {flange.outerDiameter}</text>
          
          {/* BCD dimension */}
          <line x1={cx} y1={cy} x2={cx + bcd} y2={cy - bcd * 0.7} stroke="hsl(var(--chart-3))" strokeWidth="1" strokeDasharray="3,2"/>
          <text x={cx + bcd + 5} y={cy - bcd * 0.7} className="text-[9px] fill-chart-3 font-medium">BCD {flange.boltCircleDiameter}</text>
          
          {/* Labels */}
          <text x={cx} y={cy + 4} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">BORE</text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Outer Diameter</div>
          <div className="text-lg font-bold text-primary">{flange.outerDiameter} mm</div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-4 rounded-xl">
          <div className="text-xs text-muted-foreground">Bolt Circle</div>
          <div className="text-lg font-bold text-primary">{flange.boltCircleDiameter} mm</div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl border">
          <div className="text-xs text-muted-foreground">Bolts</div>
          <div className="font-semibold">{flange.numBolts} × {flange.boltSize}</div>
        </div>
        <div className="bg-muted/50 p-4 rounded-xl border">
          <div className="text-xs text-muted-foreground">Thickness</div>
          <div className="font-semibold">{flange.thickness} mm</div>
        </div>
      </div>
    </div>
  );
};

// ==================== ELBOW VISUALIZATION ====================
const ElbowVisualization = ({ elbow }: { elbow: typeof elbowData[0] | undefined }) => {
  if (!elbow) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select elbow</div>;
  
  const is45 = elbow.type.includes('45');
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-green-500/10 via-muted/30 to-emerald-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto">
          <defs>
            <linearGradient id="elbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {is45 ? (
            <>
              {/* 45° Elbow path */}
              <path d="M 80,180 L 80,130 Q 80,80 120,60 L 180,30" fill="none" stroke="url(#elbowGrad)" strokeWidth="35" strokeLinecap="round"/>
              <path d="M 80,180 L 80,130 Q 80,80 120,60 L 180,30" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="2" strokeLinecap="round"/>
              {/* Inner edge */}
              <path d="M 95,175 L 95,130 Q 95,95 125,75 L 170,48" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" strokeOpacity="0.5"/>
              {/* Outer edge */}
              <path d="M 65,175 L 65,130 Q 65,65 115,45 L 175,18" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" strokeOpacity="0.5"/>
              
              {/* Dimension A */}
              <line x1={50} y1={130} x2={50} y2={180} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <text x={35} y={155} className="text-[10px] fill-destructive font-bold">A</text>
              <text x={200} y={130} className="text-[11px] fill-muted-foreground font-medium">A = {elbow.centerToEnd} mm</text>
              <text x={200} y={150} className="text-[11px] fill-muted-foreground font-medium">OD = {elbow.outerDiameter} mm</text>
              <text x={200} y={170} className="text-[11px] fill-muted-foreground font-medium">45° LR</text>
            </>
          ) : (
            <>
              {/* 90° Elbow path */}
              <path d="M 60,190 L 60,120 Q 60,60 120,60 L 200,60" fill="none" stroke="url(#elbowGrad)" strokeWidth="40" strokeLinecap="round"/>
              <path d="M 60,190 L 60,120 Q 60,60 120,60 L 200,60" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="2.5" strokeLinecap="round"/>
              {/* Inner curve */}
              <path d="M 78,185 L 78,120 Q 78,78 120,78 L 195,78" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" strokeOpacity="0.4"/>
              {/* Outer curve */}
              <path d="M 42,185 L 42,120 Q 42,42 120,42 L 195,42" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" strokeOpacity="0.4"/>
              
              {/* Center point */}
              <circle cx={60} cy={60} r="4" fill="hsl(var(--primary))"/>
              <text x={45} y={55} className="text-[9px] fill-primary font-medium">CL</text>
              
              {/* Dimension A (vertical) */}
              <line x1={30} y1={60} x2={30} y2={190} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
              <line x1={25} y1={60} x2={35} y2={60} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <line x1={25} y1={190} x2={35} y2={190} stroke="hsl(var(--destructive))" strokeWidth="1"/>
              <text x={15} y={130} className="text-[11px] fill-destructive font-bold" transform="rotate(-90 15 130)">A = {elbow.centerToEnd}</text>
              
              {/* Dimension A (horizontal) */}
              <line x1={60} y1={200} x2={200} y2={200} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
              <text x={130} y={215} textAnchor="middle" className="text-[10px] fill-chart-3 font-bold">A = {elbow.centerToEnd} mm</text>
              
              {/* Info */}
              <text x={220} y={100} className="text-[10px] fill-muted-foreground">90° LR</text>
              <text x={220} y={115} className="text-[10px] fill-muted-foreground">R = 1.5D</text>
            </>
          )}
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-chart-2/10 border border-chart-2/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">A (C-E)</div>
          <div className="font-bold text-chart-2">{elbow.centerToEnd} mm</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">OD</div>
          <div className="font-semibold">{elbow.outerDiameter} mm</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{elbow.weight} kg</div>
        </div>
      </div>
    </div>
  );
};

// ==================== TEE VISUALIZATION ====================
const TeeVisualization = ({ tee }: { tee: typeof teeData[0] | undefined }) => {
  if (!tee) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select tee</div>;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-500/10 via-muted/30 to-violet-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto">
          <defs>
            <linearGradient id="teeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Horizontal run */}
          <rect x={30} y={95} width={220} height={40} rx={5} fill="url(#teeGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
          {/* Branch */}
          <rect x={120} y={20} width={40} height={75} rx={5} fill="url(#teeGrad)" stroke="hsl(var(--chart-4))" strokeWidth="2"/>
          
          {/* Center lines */}
          <line x1={30} y1={115} x2={250} y2={115} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,3"/>
          <line x1={140} y1={20} x2={140} y2={135} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="5,3"/>
          
          {/* Center point */}
          <circle cx={140} cy={115} r="5" fill="hsl(var(--primary))"/>
          
          {/* C dimension */}
          <line x1={140} y1={150} x2={250} y2={150} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <line x1={140} y1={145} x2={140} y2={155} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={250} y1={145} x2={250} y2={155} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={195} y={165} textAnchor="middle" className="text-[10px] fill-destructive font-bold">C = {tee.centerToEnd} mm</text>
          
          {/* M dimension */}
          <line x1={170} y1={20} x2={170} y2={115} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <line x1={165} y1={20} x2={175} y2={20} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={165} y1={115} x2={175} y2={115} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={185} y={70} className="text-[10px] fill-chart-3 font-bold">M = {tee.centerToBranch}</text>
          
          {/* Labels */}
          <text x={35} y={118} className="text-[9px] fill-muted-foreground">RUN</text>
          <text x={145} y={35} className="text-[9px] fill-muted-foreground">BRANCH</text>
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-chart-4/10 border border-chart-4/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">C (Run)</div>
          <div className="font-bold text-chart-4">{tee.centerToEnd} mm</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">M (Branch)</div>
          <div className="font-bold text-chart-3">{tee.centerToBranch} mm</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{tee.weight} kg</div>
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
const GasketVisualization = ({ gasket }: { gasket: typeof gasketData[0] | undefined }) => {
  if (!gasket) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select gasket</div>;
  
  const cx = 140, cy = 110;
  const scale = 0.35;
  const od = Math.min(gasket.outerDiameter * scale, 80);
  const id = (gasket.innerDiameter / gasket.outerDiameter) * od;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-cyan-500/10 via-muted/30 to-teal-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto">
          <defs>
            <pattern id="spiralPattern" patternUnits="userSpaceOnUse" width="8" height="8">
              <path d="M 0,4 Q 2,0 4,4 T 8,4" fill="none" stroke="hsl(var(--chart-1))" strokeWidth="0.5" strokeOpacity="0.5"/>
            </pattern>
            <linearGradient id="gasketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Outer ring */}
          <circle cx={cx} cy={cy} r={od} fill="url(#gasketGrad)" stroke="hsl(var(--chart-1))" strokeWidth="2"/>
          {/* Spiral wound pattern ring */}
          <circle cx={cx} cy={cy} r={(od + id) / 2} fill="url(#spiralPattern)" stroke="none" strokeWidth={od - id - 10}/>
          {/* Inner ring */}
          <circle cx={cx} cy={cy} r={id} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* OD dimension */}
          <line x1={cx - od} y1={cy + od + 20} x2={cx + od} y2={cy + od + 20} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <line x1={cx - od} y1={cy + od + 15} x2={cx - od} y2={cy + od + 25} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={cx + od} y1={cy + od + 15} x2={cx + od} y2={cy + od + 25} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={cx} y={cy + od + 35} textAnchor="middle" className="text-[10px] fill-destructive font-bold">OD {gasket.outerDiameter} mm</text>
          
          {/* ID dimension */}
          <line x1={cx - id} y1={cy - od - 15} x2={cx + id} y2={cy - od - 15} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <text x={cx} y={cy - od - 25} textAnchor="middle" className="text-[10px] fill-chart-3 font-bold">ID {gasket.innerDiameter} mm</text>
          
          {/* Thickness indicator */}
          <rect x={cx + od + 20} y={cy - 15} width={8} height={30} fill="hsl(var(--chart-1)/0.3)" stroke="hsl(var(--chart-1))" strokeWidth="1"/>
          <text x={cx + od + 45} y={cy + 5} className="text-[10px] fill-chart-1 font-bold">t = {gasket.thickness}</text>
          
          {/* Type label */}
          <text x={cx} y={cy + 5} textAnchor="middle" className="text-[9px] fill-muted-foreground font-medium">SPIRAL WOUND</text>
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">OD</div>
          <div className="font-bold text-destructive">{gasket.outerDiameter} mm</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">ID</div>
          <div className="font-bold text-chart-3">{gasket.innerDiameter} mm</div>
        </div>
        <div className="bg-chart-1/10 border border-chart-1/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Thickness</div>
          <div className="font-bold text-chart-1">{gasket.thickness} mm</div>
        </div>
      </div>
    </div>
  );
};

// ==================== VALVE VISUALIZATION ====================
const ValveVisualization = ({ valve }: { valve: typeof valveData[0] | undefined }) => {
  if (!valve) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select valve</div>;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-rose-500/10 via-muted/30 to-pink-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 280 240" className="w-full max-w-sm mx-auto">
          <defs>
            <linearGradient id="valveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {valve.type === 'Gate' && (
            <>
              {/* Valve body */}
              <rect x={70} y={120} width={140} height={50} rx={5} fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Flanges */}
              <rect x={50} y={130} width={25} height={30} rx={3} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
              <rect x={205} y={130} width={25} height={30} rx={3} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
              {/* Bonnet */}
              <rect x={120} y={70} width={40} height={50} rx={3} fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Stem */}
              <rect x={135} y={25} width={10} height={50} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              {/* Handwheel */}
              <ellipse cx={140} cy={25} rx={30} ry={8} fill="hsl(var(--chart-5)/0.3)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
            </>
          )}
          
          {valve.type === 'Ball' && (
            <>
              {/* Body */}
              <ellipse cx={140} cy={145} rx={60} ry={40} fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Ball inside */}
              <circle cx={140} cy={145} r={25} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              <line x1={125} y1={145} x2={155} y2={145} stroke="hsl(var(--primary))" strokeWidth="3"/>
              {/* Ports */}
              <rect x={50} y={130} width={35} height={30} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
              <rect x={195} y={130} width={35} height={30} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
              {/* Handle */}
              <rect x={135} y={90} width={10} height={20} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              <rect x={110} y={75} width={60} height={15} rx={3} fill="hsl(var(--chart-5)/0.3)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
            </>
          )}
          
          {valve.type === 'Globe' && (
            <>
              {/* Body */}
              <ellipse cx={140} cy={145} rx={55} ry={45} fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Ports */}
              <rect x={50} y={130} width={40} height={30} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
              <rect x={190} y={130} width={40} height={30} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
              {/* Bonnet */}
              <path d="M 120,100 L 120,70 L 160,70 L 160,100" fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Stem */}
              <rect x={135} y={25} width={10} height={50} fill="hsl(var(--foreground)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1"/>
              {/* Handwheel */}
              <ellipse cx={140} cy={25} rx={28} ry={7} fill="hsl(var(--chart-5)/0.3)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
            </>
          )}
          
          {valve.type === 'Check' && (
            <>
              {/* Body */}
              <path d="M 70,170 L 70,120 L 140,100 L 210,120 L 210,170 L 140,190 Z" fill="url(#valveGrad)" stroke="hsl(var(--chart-5))" strokeWidth="2"/>
              {/* Swing disc */}
              <line x1={140} y1={110} x2={140} y2={175} stroke="hsl(var(--foreground))" strokeWidth="2"/>
              <ellipse cx={155} cy={145} rx={20} ry={30} fill="hsl(var(--chart-5)/0.3)" stroke="hsl(var(--foreground))" strokeWidth="1.5" transform="rotate(15 155 145)"/>
              {/* Ports */}
              <rect x={45} y={130} width={30} height={30} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
              <rect x={205} y={130} width={30} height={30} fill="hsl(var(--chart-5)/0.2)" stroke="hsl(var(--chart-5))" strokeWidth="1.5"/>
              {/* Arrow */}
              <path d="M 100,145 L 180,145 M 170,135 L 180,145 L 170,155" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
            </>
          )}
          
          {/* Face to Face dimension */}
          <line x1={50} y1={200} x2={230} y2={200} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <line x1={50} y1={195} x2={50} y2={205} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <line x1={230} y1={195} x2={230} y2={205} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={140} y={218} textAnchor="middle" className="text-[10px] fill-destructive font-bold">F-F = {valve.faceToFace} mm</text>
          
          {/* Height dimension */}
          <line x1={250} y1={25} x2={250} y2={170} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <text x={265} y={100} className="text-[10px] fill-chart-3 font-bold" transform="rotate(-90 265 100)">H = {valve.height}</text>
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Face-Face</div>
          <div className="font-bold text-destructive">{valve.faceToFace} mm</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Height</div>
          <div className="font-bold text-chart-3">{valve.height} mm</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{valve.weight} kg</div>
        </div>
      </div>
    </div>
  );
};

// ==================== SPECTACLE BLIND VISUALIZATION ====================
const SpectacleBlindVisualization = ({ blank }: { blank: typeof lineBlankData[0] | undefined }) => {
  if (!blank) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select spectacle blind</div>;
  
  const scale = 0.18;
  const od = Math.min(blank.outerDiameter * scale, 50);
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-500/10 via-muted/30 to-gray-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 320 180" className="w-full max-w-md mx-auto">
          <defs>
            <linearGradient id="blindGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          
          {/* Spacer ring (left) */}
          <circle cx={80} cy={90} r={od} fill="url(#blindGrad)" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          <circle cx={80} cy={90} r={od * 0.6} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          <text x={80} y={93} textAnchor="middle" className="text-[8px] fill-muted-foreground">SPACER</text>
          
          {/* Handle bar */}
          <rect x={120} y={75} width={80} height={30} rx={5} fill="url(#blindGrad)" stroke="hsl(var(--foreground))" strokeWidth="1.5"/>
          
          {/* Blind disc (right) */}
          <circle cx={240} cy={90} r={od} fill="hsl(var(--foreground)/0.2)" stroke="hsl(var(--foreground))" strokeWidth="2"/>
          <text x={240} y={93} textAnchor="middle" className="text-[8px] fill-muted-foreground">BLIND</text>
          
          {/* OD dimension */}
          <line x1={240 - od} y1={145} x2={240 + od} y2={145} stroke="hsl(var(--destructive))" strokeWidth="1"/>
          <text x={240} y={160} textAnchor="middle" className="text-[9px] fill-destructive font-bold">OD {blank.outerDiameter}</text>
          
          {/* Handle length */}
          <line x1={80 - od} y1={30} x2={240 + od} y2={30} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={160} y={22} textAnchor="middle" className="text-[9px] fill-chart-3 font-bold">L = {blank.handleLength} mm</text>
          
          {/* Thickness */}
          <rect x={280} y={75} width={15} height={30} fill="hsl(var(--chart-1)/0.3)" stroke="hsl(var(--chart-1))" strokeWidth="1"/>
          <text x={305} y={95} className="text-[9px] fill-chart-1 font-bold">t={blank.thickness}</text>
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">OD</div>
          <div className="font-bold text-destructive">{blank.outerDiameter}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Length</div>
          <div className="font-bold text-chart-3">{blank.handleLength}</div>
        </div>
        <div className="bg-chart-1/10 border border-chart-1/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Thick</div>
          <div className="font-bold text-chart-1">{blank.thickness}</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{blank.weight} kg</div>
        </div>
      </div>
    </div>
  );
};

// ==================== OLET VISUALIZATION ====================
const OletVisualization = ({ olet }: { olet: typeof oletData[0] | undefined }) => {
  if (!olet) return <div className="flex items-center justify-center h-64 text-muted-foreground">Select olet</div>;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-500/10 via-muted/30 to-blue-500/10 rounded-xl p-6 border border-primary/20">
        <svg viewBox="0 0 280 200" className="w-full max-w-sm mx-auto">
          <defs>
            <linearGradient id="oletGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Header pipe (horizontal) */}
          <ellipse cx={140} cy={150} rx={120} ry={30} fill="url(#oletGrad)" stroke="hsl(var(--chart-2))" strokeWidth="2"/>
          <text x={140} y={155} textAnchor="middle" className="text-[9px] fill-muted-foreground font-medium">HEADER {olet.headerSize}</text>
          
          {/* Olet body */}
          <path d="M 115,120 L 115,70 Q 115,55 130,55 L 150,55 Q 165,55 165,70 L 165,120" 
            fill="url(#oletGrad)" stroke="hsl(var(--chart-2))" strokeWidth="2"/>
          
          {/* Branch bore */}
          <ellipse cx={140} cy={55} rx={15} ry={5} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1"/>
          
          {/* Weld prep */}
          <path d="M 110,125 Q 115,140 120,130" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <path d="M 170,125 Q 165,140 160,130" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          
          {/* L dimension */}
          <line x1={175} y1={55} x2={175} y2={140} stroke="hsl(var(--chart-3))" strokeWidth="1.5"/>
          <line x1={170} y1={55} x2={180} y2={55} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <line x1={170} y1={140} x2={180} y2={140} stroke="hsl(var(--chart-3))" strokeWidth="1"/>
          <text x={190} y={100} className="text-[10px] fill-chart-3 font-bold">L={olet.length}</text>
          
          {/* W dimension */}
          <line x1={115} y1={40} x2={165} y2={40} stroke="hsl(var(--destructive))" strokeWidth="1.5"/>
          <text x={140} y={32} textAnchor="middle" className="text-[10px] fill-destructive font-bold">W={olet.width}</text>
          
          {/* Branch label */}
          <text x={140} y={75} textAnchor="middle" className="text-[9px] fill-muted-foreground">{olet.branchSize}</text>
          
          {/* Type label */}
          <text x={60} y={100} className="text-[11px] fill-chart-2 font-bold">{olet.type}</text>
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-chart-2/10 border border-chart-2/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Header</div>
          <div className="font-bold text-chart-2">{olet.headerSize}</div>
        </div>
        <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Branch</div>
          <div className="font-bold text-primary">{olet.branchSize}</div>
        </div>
        <div className="bg-chart-3/10 border border-chart-3/30 p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground">Length</div>
          <div className="font-bold text-chart-3">{olet.length} mm</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg text-center border">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold">{olet.weight} kg</div>
        </div>
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
  const [pipeSize, setPipeSize] = useState<string>("4\"");
  const [pipeSchedule, setPipeSchedule] = useState<string>("40/STD");
  const [selectedSize, setSelectedSize] = useState<string>("4\"");
  const [selectedClass, setSelectedClass] = useState<string>("150");
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
                  <CardDescription>Weld Neck, Slip-On, Blind Flanges</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B16.5</Badge>
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
                        <SelectContent className="bg-popover border shadow-lg z-50">{pressureClasses.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{flangeTypes.map(t => <Badge key={t.id} variant="secondary" className="text-xs">{t.abbr} - {t.name}</Badge>)}</div>
                  <FlangeVisualization flange={selectedFlange} />
                </div>
                <ScrollArea className="h-[450px] rounded-xl border-2">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur"><TableRow><TableHead>Size</TableHead><TableHead>Class</TableHead><TableHead>OD</TableHead><TableHead>BCD</TableHead><TableHead>Bolts</TableHead><TableHead>Thk</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {flangeData.filter(f => f.size === selectedSize).map((f, i) => (
                        <TableRow key={i} className={`cursor-pointer transition-all ${f.pressureClass === selectedClass ? "bg-primary/15 border-l-4 border-l-primary" : "hover:bg-muted/50"}`} onClick={() => setSelectedClass(f.pressureClass)}>
                          <TableCell className="font-medium">{f.size}</TableCell><TableCell><Badge variant="outline">{f.pressureClass}</Badge></TableCell><TableCell>{f.outerDiameter}</TableCell><TableCell>{f.boltCircleDiameter}</TableCell><TableCell>{f.numBolts}×{f.boltSize}</TableCell><TableCell>{f.thickness}</TableCell>
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
