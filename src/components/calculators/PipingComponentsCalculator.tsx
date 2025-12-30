import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  flangeData, flangeTypes, pressureClasses, getFlange,
  elbowData, teeData, reducerData, fittingTypes,
  gasketData, gasketTypes,
  valveData, valveTypes,
  lineBlankData, lineBlankTypes,
  oletData, oletTypes, getUniqueHeaderSizes,
  flexibilityData,
  safeSpanData,
  getUniqueSizes
} from "@/lib/pipingComponents";

// SVG Component Visualizations
const FlangeVisualization = ({ flange }: { flange: typeof flangeData[0] | undefined }) => {
  if (!flange) return <div className="text-muted-foreground text-center py-8">Select size and class</div>;
  
  const scale = 0.4;
  const cx = 150, cy = 120;
  const od = flange.outerDiameter * scale;
  const bcd = flange.boltCircleDiameter * scale;
  const rf = flange.raisedFaceDiameter * scale;
  const hub = flange.hubDiameter * scale;
  
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 300 240" className="w-full max-w-md mx-auto">
        {/* Flange face view */}
        <circle cx={cx} cy={cy} r={od/2} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
        <circle cx={cx} cy={cy} r={bcd/2} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4,4" className="text-muted-foreground"/>
        <circle cx={cx} cy={cy} r={rf/2} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/70"/>
        <circle cx={cx} cy={cy} r={hub/2} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="1" className="text-foreground"/>
        
        {/* Bolt holes */}
        {Array.from({ length: flange.numBolts }).map((_, i) => {
          const angle = (2 * Math.PI * i) / flange.numBolts - Math.PI/2;
          const bx = cx + (bcd/2) * Math.cos(angle);
          const by = cy + (bcd/2) * Math.sin(angle);
          return <circle key={i} cx={bx} cy={by} r={4} fill="currentColor" className="text-foreground"/>;
        })}
        
        {/* Dimension lines */}
        <line x1={cx - od/2} y1={cy + od/2 + 20} x2={cx + od/2} y2={cy + od/2 + 20} stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
        <text x={cx} y={cy + od/2 + 35} textAnchor="middle" className="text-xs fill-muted-foreground">OD: {flange.outerDiameter}mm</text>
        
        <line x1={cx - bcd/2} y1={cy - od/2 - 15} x2={cx + bcd/2} y2={cy - od/2 - 15} stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
        <text x={cx} y={cy - od/2 - 20} textAnchor="middle" className="text-xs fill-muted-foreground">BCD: {flange.boltCircleDiameter}mm</text>
      </svg>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Thickness:</span> {flange.thickness}mm</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Bolts:</span> {flange.numBolts} × {flange.boltSize}</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">RF Height:</span> {flange.raisedFaceHeight}mm</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Weight:</span> ~{flange.weight}kg</div>
      </div>
    </div>
  );
};

const ElbowVisualization = ({ elbow }: { elbow: typeof elbowData[0] | undefined }) => {
  if (!elbow) return <div className="text-muted-foreground text-center py-8">Select size and type</div>;
  
  const is90 = elbow.type.includes('90');
  
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 200 160" className="w-full max-w-sm mx-auto">
        {is90 ? (
          <>
            <path d="M 40 120 L 40 80 Q 40 40 80 40 L 160 40" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" className="text-muted"/>
            <path d="M 40 120 L 40 80 Q 40 40 80 40 L 160 40" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
            <line x1={40} y1={40} x2={40} y2={120} stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" className="text-muted-foreground"/>
            <text x={25} y={80} textAnchor="middle" className="text-xs fill-muted-foreground">A</text>
            <text x={100} y={30} textAnchor="middle" className="text-xs fill-muted-foreground">A = {elbow.centerToEnd}mm</text>
          </>
        ) : (
          <>
            <path d="M 30 130 L 60 80 L 170 40" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" className="text-muted"/>
            <path d="M 30 130 L 60 80 L 170 40" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
            <text x={100} y={30} textAnchor="middle" className="text-xs fill-muted-foreground">A = {elbow.centerToEnd}mm</text>
          </>
        )}
        <text x={100} y={150} textAnchor="middle" className="text-xs fill-muted-foreground">OD: {elbow.outerDiameter}mm | Wt: {elbow.weight}kg</text>
      </svg>
    </div>
  );
};

const ValveVisualization = ({ valve }: { valve: typeof valveData[0] | undefined }) => {
  if (!valve) return <div className="text-muted-foreground text-center py-8">Select valve parameters</div>;
  
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 200 200" className="w-full max-w-sm mx-auto">
        {/* Valve body */}
        <rect x={40} y={80} width={120} height={40} rx={4} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="2" className="text-primary"/>
        {/* Flanges */}
        <rect x={25} y={85} width={15} height={30} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="1.5" className="text-foreground"/>
        <rect x={160} y={85} width={15} height={30} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="1.5" className="text-foreground"/>
        {/* Stem */}
        <rect x={95} y={30} width={10} height={50} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="1.5" className="text-foreground"/>
        {/* Handwheel */}
        <ellipse cx={100} cy={25} rx={25} ry={8} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
        
        {/* Dimensions */}
        <line x1={25} y1={140} x2={175} y2={140} stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
        <text x={100} y={155} textAnchor="middle" className="text-xs fill-muted-foreground">F-F: {valve.faceToFace}mm</text>
        <line x1={185} y1={25} x2={185} y2={115} stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
        <text x={175} y={70} textAnchor="end" className="text-xs fill-muted-foreground" transform="rotate(-90, 175, 70)">H: {valve.height}mm</text>
      </svg>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Type:</span> {valve.type}</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Class:</span> {valve.pressureClass}</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Face-to-Face:</span> {valve.faceToFace}mm</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Weight:</span> ~{valve.weight}kg</div>
      </div>
    </div>
  );
};

const SpectacleBlindVisualization = ({ blank }: { blank: typeof lineBlankData[0] | undefined }) => {
  if (!blank) return <div className="text-muted-foreground text-center py-8">Select size and class</div>;
  
  const scale = 0.25;
  const od = blank.outerDiameter * scale;
  
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 300 120" className="w-full max-w-md mx-auto">
        {/* Blind side */}
        <circle cx={70} cy={60} r={od/2} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="2" className="text-primary"/>
        <text x={70} y={65} textAnchor="middle" className="text-xs fill-foreground font-medium">BLIND</text>
        
        {/* Handle */}
        <rect x={70 + od/2} y={55} width={60} height={10} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="1.5" className="text-foreground"/>
        
        {/* Spacer side */}
        <circle cx={200} cy={60} r={od/2} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
        <circle cx={200} cy={60} r={od/2 - 10} fill="hsl(var(--background))" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground"/>
        <text x={200} y={65} textAnchor="middle" className="text-xs fill-foreground font-medium">OPEN</text>
        
        {/* Dimensions */}
        <text x={150} y={110} textAnchor="middle" className="text-xs fill-muted-foreground">OD: {blank.outerDiameter}mm | t: {blank.thickness}mm</text>
      </svg>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Handle L:</span> {blank.handleLength}mm</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Handle W:</span> {blank.handleWidth}mm</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Thickness:</span> {blank.thickness}mm</div>
        <div className="bg-muted/50 p-2 rounded"><span className="text-muted-foreground">Weight:</span> ~{blank.weight}kg</div>
      </div>
    </div>
  );
};

export default function PipingComponentsCalculator() {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("150");
  const [selectedFittingType, setSelectedFittingType] = useState<string>("90LR");
  const [selectedValveType, setSelectedValveType] = useState<string>("Gate");
  const [selectedHeaderSize, setSelectedHeaderSize] = useState<string>("");
  const [selectedBranchSize, setSelectedBranchSize] = useState<string>("");
  
  const sizes = getUniqueSizes();
  const headerSizes = getUniqueHeaderSizes();
  
  const selectedFlange = getFlange(selectedSize, selectedClass);
  const selectedElbow = elbowData.find(e => e.size === selectedSize && e.type === selectedFittingType);
  const selectedValve = valveData.find(v => v.size === selectedSize && v.type === selectedValveType && v.pressureClass === selectedClass);
  const selectedBlank = lineBlankData.find(lb => lb.size === selectedSize && lb.pressureClass === selectedClass);
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="flanges" className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full h-auto">
          <TabsTrigger value="flanges" className="text-xs">Flanges</TabsTrigger>
          <TabsTrigger value="fittings" className="text-xs">Fittings</TabsTrigger>
          <TabsTrigger value="gaskets" className="text-xs">Gaskets</TabsTrigger>
          <TabsTrigger value="valves" className="text-xs">Valves</TabsTrigger>
          <TabsTrigger value="blanks" className="text-xs">Blanks</TabsTrigger>
          <TabsTrigger value="olets" className="text-xs">Olets</TabsTrigger>
          <TabsTrigger value="flexibility" className="text-xs">Flexibility</TabsTrigger>
          <TabsTrigger value="spans" className="text-xs">Safe Spans</TabsTrigger>
        </TabsList>

        {/* FLANGES TAB */}
        <TabsContent value="flanges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Flange Dimensions <Badge variant="outline">ASME B16.5</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nominal Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          {sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pressure Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {pressureClasses.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Flange Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {flangeTypes.map(t => (
                        <Badge key={t.id} variant="secondary">{t.abbr} - {t.name}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <FlangeVisualization flange={selectedFlange} />
                </div>
                
                <div className="overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>OD (mm)</TableHead>
                        <TableHead>BCD (mm)</TableHead>
                        <TableHead>Bolts</TableHead>
                        <TableHead>Thk (mm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flangeData.filter(f => !selectedSize || f.size === selectedSize).slice(0, 15).map((f, i) => (
                        <TableRow key={i} className={f.size === selectedSize && f.pressureClass === selectedClass ? "bg-primary/10" : ""}>
                          <TableCell className="font-medium">{f.size}</TableCell>
                          <TableCell>{f.pressureClass}</TableCell>
                          <TableCell>{f.outerDiameter}</TableCell>
                          <TableCell>{f.boltCircleDiameter}</TableCell>
                          <TableCell>{f.numBolts}×{f.boltSize}</TableCell>
                          <TableCell>{f.thickness}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FITTINGS TAB */}
        <TabsContent value="fittings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Butt Weld Fittings <Badge variant="outline">ASME B16.9</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          {sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fitting Type</Label>
                      <Select value={selectedFittingType} onValueChange={setSelectedFittingType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="90LR">90° LR Elbow</SelectItem>
                          <SelectItem value="45LR">45° LR Elbow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <ElbowVisualization elbow={selectedElbow} />
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">90° Long Radius Elbows</h4>
                  <div className="overflow-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Size</TableHead>
                          <TableHead>A (mm)</TableHead>
                          <TableHead>OD (mm)</TableHead>
                          <TableHead>Wt (kg)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {elbowData.filter(e => e.type === '90LR').map((e, i) => (
                          <TableRow key={i} className={e.size === selectedSize ? "bg-primary/10" : ""}>
                            <TableCell className="font-medium">{e.size}</TableCell>
                            <TableCell>{e.centerToEnd}</TableCell>
                            <TableCell>{e.outerDiameter}</TableCell>
                            <TableCell>{e.weight}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <h4 className="font-medium">Equal Tees</h4>
                  <div className="overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Size</TableHead>
                          <TableHead>C (mm)</TableHead>
                          <TableHead>M (mm)</TableHead>
                          <TableHead>Wt (kg)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teeData.map((t, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{t.size}</TableCell>
                            <TableCell>{t.centerToEnd}</TableCell>
                            <TableCell>{t.centerToBranch}</TableCell>
                            <TableCell>{t.weight}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GASKETS TAB */}
        <TabsContent value="gaskets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Gasket Dimensions <Badge variant="outline">ASME B16.20</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {gasketTypes.map(t => (
                      <Badge key={t.id} variant="secondary">{t.abbr} - {t.name}</Badge>
                    ))}
                  </div>
                  
                  <svg viewBox="0 0 200 120" className="w-full max-w-xs mx-auto">
                    <circle cx={100} cy={60} r={45} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
                    <circle cx={100} cy={60} r={25} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
                    <path d="M 60 60 Q 70 55 80 60 Q 90 65 100 60 Q 110 55 120 60 Q 130 65 140 60" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
                    <text x={100} y={110} textAnchor="middle" className="text-xs fill-muted-foreground">Spiral Wound Gasket Cross-section</text>
                  </svg>
                </div>
                
                <div className="overflow-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>ID (mm)</TableHead>
                        <TableHead>OD (mm)</TableHead>
                        <TableHead>Thk (mm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gasketData.map((g, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{g.size}</TableCell>
                          <TableCell>{g.pressureClass}</TableCell>
                          <TableCell>{g.innerDiameter}</TableCell>
                          <TableCell>{g.outerDiameter}</TableCell>
                          <TableCell>{g.thickness}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VALVES TAB */}
        <TabsContent value="valves">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Valve Dimensions <Badge variant="outline">API 600 / ASME B16.10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>
                          {sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={selectedValveType} onValueChange={setSelectedValveType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {valveTypes.map(t => <SelectItem key={t.id} value={t.name.split(' ')[0]}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="150">150</SelectItem>
                          <SelectItem value="300">300</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <ValveVisualization valve={selectedValve} />
                </div>
                
                <div className="overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>F-F (mm)</TableHead>
                        <TableHead>Height (mm)</TableHead>
                        <TableHead>Wt (kg)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {valveData.filter(v => v.pressureClass === selectedClass).map((v, i) => (
                        <TableRow key={i} className={v.size === selectedSize && v.type === selectedValveType ? "bg-primary/10" : ""}>
                          <TableCell className="font-medium">{v.size}</TableCell>
                          <TableCell>{v.type}</TableCell>
                          <TableCell>{v.faceToFace}</TableCell>
                          <TableCell>{v.height}</TableCell>
                          <TableCell>{v.weight}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINE BLANKS TAB */}
        <TabsContent value="blanks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Spectacle Blinds & Spacers <Badge variant="outline">ASME B16.48</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          {lineBlankData.map(lb => lb.size).filter((v, i, a) => a.indexOf(v) === i).map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="150">150</SelectItem>
                          <SelectItem value="300">300</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <SpectacleBlindVisualization blank={selectedBlank} />
                </div>
                
                <div className="overflow-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>OD (mm)</TableHead>
                        <TableHead>Thk (mm)</TableHead>
                        <TableHead>Handle (mm)</TableHead>
                        <TableHead>Wt (kg)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineBlankData.map((lb, i) => (
                        <TableRow key={i} className={lb.size === selectedSize && lb.pressureClass === selectedClass ? "bg-primary/10" : ""}>
                          <TableCell className="font-medium">{lb.size}</TableCell>
                          <TableCell>{lb.pressureClass}</TableCell>
                          <TableCell>{lb.outerDiameter}</TableCell>
                          <TableCell>{lb.thickness}</TableCell>
                          <TableCell>{lb.handleLength}×{lb.handleWidth}</TableCell>
                          <TableCell>{lb.weight}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OLETS TAB */}
        <TabsContent value="olets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Branch Connections (Olets) <Badge variant="outline">MSS SP-97</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {oletTypes.map(t => (
                      <Badge key={t.id} variant="secondary">{t.abbr} - {t.name}</Badge>
                    ))}
                  </div>
                  
                  <svg viewBox="0 0 200 150" className="w-full max-w-xs mx-auto">
                    {/* Header pipe */}
                    <rect x={20} y={80} width={160} height={30} rx={15} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="2" className="text-primary"/>
                    {/* Weldolet */}
                    <path d="M 85 80 L 85 40 L 115 40 L 115 80" fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="2" className="text-primary"/>
                    <ellipse cx={100} cy={40} rx={15} ry={5} fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="1.5" className="text-foreground"/>
                    {/* Labels */}
                    <text x={100} y={30} textAnchor="middle" className="text-xs fill-muted-foreground">Branch</text>
                    <text x={100} y={140} textAnchor="middle" className="text-xs fill-muted-foreground">Header Pipe</text>
                    <line x1={120} y1={40} x2={120} y2={75} stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" className="text-muted-foreground"/>
                    <text x={130} y={60} className="text-xs fill-muted-foreground">L</text>
                  </svg>
                </div>
                
                <div className="overflow-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Header</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>L (mm)</TableHead>
                        <TableHead>W (mm)</TableHead>
                        <TableHead>Wt (kg)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {oletData.slice(0, 20).map((o, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{o.headerSize}</TableCell>
                          <TableCell>{o.branchSize}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{o.type}</Badge></TableCell>
                          <TableCell>{o.length}</TableCell>
                          <TableCell>{o.width}</TableCell>
                          <TableCell>{o.weight}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLEXIBILITY TAB */}
        <TabsContent value="flexibility">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pipe Flexibility & SIF <Badge variant="outline">ASME B31.3</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>SIF (In-plane)</TableHead>
                      <TableHead>SIF (Out-plane)</TableHead>
                      <TableHead>k Factor</TableHead>
                      <TableHead className="max-w-xs">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flexibilityData.map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{f.component}</TableCell>
                        <TableCell><Badge variant="outline">{f.type}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{f.sifIn}</TableCell>
                        <TableCell className="font-mono text-sm">{f.sifOut}</TableCell>
                        <TableCell className="font-mono text-sm">{f.kFactor}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs">{f.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAFE SPANS TAB */}
        <TabsContent value="spans">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pipe Support Safe Spans <Badge variant="outline">ASME B31.1</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Values based on carbon steel pipe, Sch 40</li>
                    <li>Simply supported: beam supported at both ends</li>
                    <li>Fixed-Fixed: beam with fixed ends (guides/anchors)</li>
                    <li>Max deflection limited to L/240 or 10mm</li>
                  </ul>
                </div>
                
                <div className="overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Simply Supp. (m)</TableHead>
                        <TableHead>Fixed-Fixed (m)</TableHead>
                        <TableHead>Nat. Freq. (Hz)</TableHead>
                        <TableHead>Deflection (mm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeSpanData.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{s.size}</TableCell>
                          <TableCell>{s.contentDensity === 0 ? "Empty/Gas" : "Water"}</TableCell>
                          <TableCell>{s.maxSpan}</TableCell>
                          <TableCell>{s.maxSpanFixed}</TableCell>
                          <TableCell>{s.naturalFrequency}</TableCell>
                          <TableCell>{s.deflection}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
