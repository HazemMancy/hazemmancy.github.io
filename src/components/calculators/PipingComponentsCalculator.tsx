import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import { Circle, Cylinder, CornerDownRight } from "lucide-react";

// Pipe Cross-Section Visualization
const PipeVisualization = ({ pipe }: { pipe: typeof pipeData[0] | undefined }) => {
  if (!pipe) return <div className="flex items-center justify-center h-48 text-muted-foreground">Select pipe size and schedule</div>;
  
  const scale = 0.6;
  const cx = 120, cy = 100;
  const od = Math.min(pipe.outerDiameter * scale, 80);
  const id = (pipe.insideDiameter / pipe.outerDiameter) * od;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-muted/50 to-muted rounded-xl p-4">
        <svg viewBox="0 0 240 200" className="w-full max-w-xs mx-auto">
          {/* Outer circle */}
          <circle cx={cx} cy={cy} r={od} fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth="2"/>
          {/* Inner circle (bore) */}
          <circle cx={cx} cy={cy} r={id} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          {/* Wall thickness indicator */}
          <line x1={cx + id} y1={cy} x2={cx + od} y2={cy} stroke="hsl(var(--destructive))" strokeWidth="3"/>
          {/* Dimension arrows */}
          <line x1={cx - od} y1={cy + od + 20} x2={cx + od} y2={cy + od + 20} stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
          <text x={cx} y={cy + od + 35} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">OD: {pipe.outerDiameter} mm</text>
          <line x1={cx - id} y1={cy - od - 10} x2={cx + id} y2={cy - od - 10} stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
          <text x={cx} y={cy - od - 15} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">ID: {pipe.insideDiameter} mm</text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground">Wall Thickness</div>
          <div className="font-semibold text-primary">{pipe.wallThickness} mm</div>
        </div>
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground">Weight</div>
          <div className="font-semibold text-primary">{pipe.weightPerMeter} kg/m</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground">Internal Area</div>
          <div className="font-medium">{pipe.internalArea.toLocaleString()} mm²</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground">Water Capacity</div>
          <div className="font-medium">{pipe.waterCapacity} L/m</div>
        </div>
      </div>
    </div>
  );
};

// Flange Face View
const FlangeVisualization = ({ flange }: { flange: typeof flangeData[0] | undefined }) => {
  if (!flange) return <div className="flex items-center justify-center h-48 text-muted-foreground">Select size and class</div>;
  
  const scale = 0.35;
  const cx = 120, cy = 100;
  const od = Math.min(flange.outerDiameter * scale, 90);
  const bcd = (flange.boltCircleDiameter / flange.outerDiameter) * od;
  const rf = (flange.raisedFaceDiameter / flange.outerDiameter) * od;
  const hub = (flange.hubDiameter / flange.outerDiameter) * od;
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-muted/50 to-muted rounded-xl p-4">
        <svg viewBox="0 0 240 200" className="w-full max-w-xs mx-auto">
          <circle cx={cx} cy={cy} r={od} fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth="2"/>
          <circle cx={cx} cy={cy} r={bcd} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4,4"/>
          <circle cx={cx} cy={cy} r={rf} fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <circle cx={cx} cy={cy} r={hub} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1"/>
          {Array.from({ length: flange.numBolts }).map((_, i) => {
            const angle = (2 * Math.PI * i) / flange.numBolts - Math.PI/2;
            return <circle key={i} cx={cx + bcd * Math.cos(angle)} cy={cy + bcd * Math.sin(angle)} r={3} fill="hsl(var(--foreground))"/>;
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground">Outer Diameter</div>
          <div className="font-semibold text-primary">{flange.outerDiameter} mm</div>
        </div>
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground">Bolt Circle</div>
          <div className="font-semibold text-primary">{flange.boltCircleDiameter} mm</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground">Bolts</div>
          <div className="font-medium">{flange.numBolts} × {flange.boltSize}</div>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="text-xs text-muted-foreground">Thickness</div>
          <div className="font-medium">{flange.thickness} mm</div>
        </div>
      </div>
    </div>
  );
};

export default function PipingComponentsCalculator() {
  const [pipeSize, setPipeSize] = useState<string>("4\"");
  const [pipeSchedule, setPipeSchedule] = useState<string>("40/STD");
  const [selectedSize, setSelectedSize] = useState<string>("4\"");
  const [selectedClass, setSelectedClass] = useState<string>("150");
  const [selectedValveType, setSelectedValveType] = useState<string>("Gate");
  
  const pipeSizes = getUniquePipeSizes();
  const pipeSchedules = getSchedulesForPipeSize(pipeSize);
  const selectedPipe = getPipeBySchedule(pipeSize, pipeSchedule);
  const sizes = getUniqueSizes();
  const selectedFlange = getFlange(selectedSize, selectedClass);
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="pipe" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 w-full h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="pipe" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Pipe</TabsTrigger>
          <TabsTrigger value="flanges" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Flanges</TabsTrigger>
          <TabsTrigger value="fittings" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Fittings</TabsTrigger>
          <TabsTrigger value="gaskets" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Gaskets</TabsTrigger>
          <TabsTrigger value="valves" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Valves</TabsTrigger>
          <TabsTrigger value="blanks" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Blanks</TabsTrigger>
          <TabsTrigger value="olets" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Olets</TabsTrigger>
          <TabsTrigger value="flexibility" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">SIF</TabsTrigger>
          <TabsTrigger value="spans" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Spans</TabsTrigger>
        </TabsList>

        {/* PIPE TAB */}
        <TabsContent value="pipe" className="mt-4">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cylinder className="w-5 h-5 text-primary" />
                    Pipe Dimensions
                  </CardTitle>
                  <CardDescription>ASME B36.10M Carbon Steel Pipe</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B36.10M</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Nominal Size</Label>
                      <Select value={pipeSize} onValueChange={(v) => { setPipeSize(v); setPipeSchedule(getSchedulesForPipeSize(v)[0] || ""); }}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border shadow-lg z-50">{pipeSizes.map(s => <SelectItem key={s} value={s}>{s} (DN{pipeData.find(p=>p.size===s)?.nominalDN})</SelectItem>)}</SelectContent>
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
                <ScrollArea className="h-[400px] rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                      <TableRow>
                        <TableHead className="font-semibold">Size</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>OD</TableHead>
                        <TableHead>Wall</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>kg/m</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipeData.filter(p => p.size === pipeSize).map((p, i) => (
                        <TableRow key={i} className={`cursor-pointer transition-colors ${p.schedule === pipeSchedule ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"}`} onClick={() => setPipeSchedule(p.schedule)}>
                          <TableCell className="font-medium">{p.size}</TableCell>
                          <TableCell><Badge variant={p.schedule === pipeSchedule ? "default" : "outline"} className="text-xs">{p.schedule}</Badge></TableCell>
                          <TableCell>{p.outerDiameter}</TableCell>
                          <TableCell>{p.wallThickness}</TableCell>
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
        <TabsContent value="flanges" className="mt-4">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Circle className="w-5 h-5 text-primary" />Flange Dimensions</CardTitle>
                  <CardDescription>Weld Neck, Slip-On, Blind Flanges</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ASME B16.5</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
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
                        <SelectContent className="bg-popover border shadow-lg z-50">{pressureClasses.slice(0,3).map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{flangeTypes.map(t => <Badge key={t.id} variant="secondary" className="text-xs">{t.abbr}</Badge>)}</div>
                  <FlangeVisualization flange={selectedFlange} />
                </div>
                <ScrollArea className="h-[400px] rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                      <TableRow>
                        <TableHead>Size</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>OD</TableHead>
                        <TableHead>BCD</TableHead>
                        <TableHead>Bolts</TableHead>
                        <TableHead>Thk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flangeData.filter(f => f.size === selectedSize).map((f, i) => (
                        <TableRow key={i} className={f.pressureClass === selectedClass ? "bg-primary/10" : ""}>
                          <TableCell className="font-medium">{f.size}</TableCell>
                          <TableCell><Badge variant="outline">{f.pressureClass}</Badge></TableCell>
                          <TableCell>{f.outerDiameter}</TableCell>
                          <TableCell>{f.boltCircleDiameter}</TableCell>
                          <TableCell>{f.numBolts}×{f.boltSize}</TableCell>
                          <TableCell>{f.thickness}</TableCell>
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
        <TabsContent value="fittings" className="mt-4">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2"><CornerDownRight className="w-5 h-5 text-primary" />Butt Weld Fittings</CardTitle>
              <CardDescription>Elbows, Tees, Reducers per ASME B16.9</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">90° Long Radius Elbows</h4>
                  <ScrollArea className="h-64 border rounded-lg">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Size</TableHead><TableHead>A (mm)</TableHead><TableHead>OD</TableHead><TableHead>Wt (kg)</TableHead></TableRow></TableHeader>
                      <TableBody>{elbowData.filter(e=>e.type==='90LR').map((e,i)=><TableRow key={i}><TableCell className="font-medium">{e.size}</TableCell><TableCell>{e.centerToEnd}</TableCell><TableCell>{e.outerDiameter}</TableCell><TableCell>{e.weight}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </ScrollArea>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Equal Tees</h4>
                  <ScrollArea className="h-64 border rounded-lg">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Size</TableHead><TableHead>C (mm)</TableHead><TableHead>M (mm)</TableHead><TableHead>Wt (kg)</TableHead></TableRow></TableHeader>
                      <TableBody>{teeData.map((t,i)=><TableRow key={i}><TableCell className="font-medium">{t.size}</TableCell><TableCell>{t.centerToEnd}</TableCell><TableCell>{t.centerToBranch}</TableCell><TableCell>{t.weight}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GASKETS TAB */}
        <TabsContent value="gaskets" className="mt-4">
          <Card className="border-2">
            <CardHeader><CardTitle>Gasket Dimensions</CardTitle><CardDescription>Spiral Wound Gaskets per ASME B16.20</CardDescription></CardHeader>
            <CardContent>
              <ScrollArea className="h-80 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Size</TableHead><TableHead>Class</TableHead><TableHead>ID (mm)</TableHead><TableHead>OD (mm)</TableHead><TableHead>Thk (mm)</TableHead></TableRow></TableHeader>
                  <TableBody>{gasketData.map((g,i)=><TableRow key={i}><TableCell className="font-medium">{g.size}</TableCell><TableCell>{g.pressureClass}</TableCell><TableCell>{g.innerDiameter}</TableCell><TableCell>{g.outerDiameter}</TableCell><TableCell>{g.thickness}</TableCell></TableRow>)}</TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VALVES TAB */}
        <TabsContent value="valves" className="mt-4">
          <Card className="border-2">
            <CardHeader><CardTitle>Valve Dimensions</CardTitle><CardDescription>Gate, Globe, Ball, Check Valves per API 600 / ASME B16.10</CardDescription></CardHeader>
            <CardContent>
              <div className="mb-4"><Select value={selectedValveType} onValueChange={setSelectedValveType}><SelectTrigger className="w-48 bg-background"><SelectValue /></SelectTrigger><SelectContent className="bg-popover border shadow-lg z-50">{valveTypes.map(t=><SelectItem key={t.id} value={t.name.split(' ')[0]}>{t.name}</SelectItem>)}</SelectContent></Select></div>
              <ScrollArea className="h-80 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Size</TableHead><TableHead>Type</TableHead><TableHead>F-F (mm)</TableHead><TableHead>Height (mm)</TableHead><TableHead>Wt (kg)</TableHead></TableRow></TableHeader>
                  <TableBody>{valveData.filter(v=>v.type===selectedValveType).map((v,i)=><TableRow key={i}><TableCell className="font-medium">{v.size}</TableCell><TableCell><Badge variant="outline">{v.type}</Badge></TableCell><TableCell>{v.faceToFace}</TableCell><TableCell>{v.height}</TableCell><TableCell>{v.weight}</TableCell></TableRow>)}</TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLANKS TAB */}
        <TabsContent value="blanks" className="mt-4">
          <Card className="border-2">
            <CardHeader><CardTitle>Spectacle Blinds & Spacers</CardTitle><CardDescription>ASME B16.48</CardDescription></CardHeader>
            <CardContent>
              <ScrollArea className="h-80 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Size</TableHead><TableHead>Class</TableHead><TableHead>OD (mm)</TableHead><TableHead>Thk (mm)</TableHead><TableHead>Handle (mm)</TableHead><TableHead>Wt (kg)</TableHead></TableRow></TableHeader>
                  <TableBody>{lineBlankData.map((lb,i)=><TableRow key={i}><TableCell className="font-medium">{lb.size}</TableCell><TableCell>{lb.pressureClass}</TableCell><TableCell>{lb.outerDiameter}</TableCell><TableCell>{lb.thickness}</TableCell><TableCell>{lb.handleLength}×{lb.handleWidth}</TableCell><TableCell>{lb.weight}</TableCell></TableRow>)}</TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OLETS TAB */}
        <TabsContent value="olets" className="mt-4">
          <Card className="border-2">
            <CardHeader><CardTitle>Branch Connections (Olets)</CardTitle><CardDescription>MSS SP-97 - Weldolet, Sockolet, Threadolet</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">{oletTypes.map(t=><Badge key={t.id} variant="secondary">{t.abbr} - {t.name}</Badge>)}</div>
              <ScrollArea className="h-72 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Header</TableHead><TableHead>Branch</TableHead><TableHead>Type</TableHead><TableHead>L (mm)</TableHead><TableHead>W (mm)</TableHead><TableHead>Wt (kg)</TableHead></TableRow></TableHeader>
                  <TableBody>{oletData.map((o,i)=><TableRow key={i}><TableCell className="font-medium">{o.headerSize}</TableCell><TableCell>{o.branchSize}</TableCell><TableCell><Badge variant="outline" className="text-xs">{o.type}</Badge></TableCell><TableCell>{o.length}</TableCell><TableCell>{o.width}</TableCell><TableCell>{o.weight}</TableCell></TableRow>)}</TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLEXIBILITY TAB */}
        <TabsContent value="flexibility" className="mt-4">
          <Card className="border-2">
            <CardHeader><CardTitle>Stress Intensification Factors (SIF)</CardTitle><CardDescription>ASME B31.3 Flexibility Analysis</CardDescription></CardHeader>
            <CardContent>
              <ScrollArea className="h-80 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Component</TableHead><TableHead>Type</TableHead><TableHead>SIF (In)</TableHead><TableHead>SIF (Out)</TableHead><TableHead>k Factor</TableHead></TableRow></TableHeader>
                  <TableBody>{flexibilityData.map((f,i)=><TableRow key={i}><TableCell className="font-medium">{f.component}</TableCell><TableCell><Badge variant="outline">{f.type}</Badge></TableCell><TableCell className="font-mono text-xs">{f.sifIn}</TableCell><TableCell className="font-mono text-xs">{f.sifOut}</TableCell><TableCell className="font-mono text-xs">{f.kFactor}</TableCell></TableRow>)}</TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAFE SPANS TAB */}
        <TabsContent value="spans" className="mt-4">
          <Card className="border-2">
            <CardHeader><CardTitle>Pipe Support Safe Spans</CardTitle><CardDescription>ASME B31.1 - Carbon Steel Sch 40</CardDescription></CardHeader>
            <CardContent>
              <ScrollArea className="h-80 border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95"><TableRow><TableHead>Size</TableHead><TableHead>Content</TableHead><TableHead>Simple (m)</TableHead><TableHead>Fixed (m)</TableHead><TableHead>Freq (Hz)</TableHead><TableHead>Defl (mm)</TableHead></TableRow></TableHeader>
                  <TableBody>{safeSpanData.map((s,i)=><TableRow key={i}><TableCell className="font-medium">{s.size}</TableCell><TableCell>{s.contentDensity===0?"Empty":"Water"}</TableCell><TableCell>{s.maxSpan}</TableCell><TableCell>{s.maxSpanFixed}</TableCell><TableCell>{s.naturalFrequency}</TableCell><TableCell>{s.deflection}</TableCell></TableRow>)}</TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
