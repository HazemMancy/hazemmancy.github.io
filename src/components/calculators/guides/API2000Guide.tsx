import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, BookOpen, Calculator, Info, Flame, Wind, Gauge } from "lucide-react";

export default function API2000Guide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            API Standard 2000 - Tank Venting Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            API Standard 2000 provides requirements for venting atmospheric and low-pressure storage tanks 
            to protect them from overpressure and vacuum during normal operations and fire exposure.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">API 2000</Badge>
            <Badge variant="outline">7th Edition</Badge>
            <Badge variant="outline">ISO 28300</Badge>
            <Badge variant="outline">Tank Venting</Badge>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full space-y-2">
        <AccordionItem value="scope" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Scope & Application
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>API 2000 applies to:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Atmospheric storage tanks (operating pressure ≤ 15 psig / 1.034 barg)</li>
              <li>Low-pressure storage tanks (operating pressure ≤ 15 psig / 1.034 barg)</li>
              <li>Tanks storing petroleum products, volatile organic liquids, and chemicals</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Design Pressure Range:</strong> Typically -0.5 to +1.5 mbarg for atmospheric tanks
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="thermal" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-orange-500" />
              Thermal Breathing (Section 4)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>Thermal breathing occurs due to temperature changes affecting the vapor space:</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-orange-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-orange-600">Thermal Outbreathing</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>During temperature increase (daytime heating):</p>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    <li>Vapor expansion requires pressure relief</li>
                    <li>Higher at lower latitudes (more solar radiation)</li>
                    <li>Affected by tank color (dark colors absorb more heat)</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-600">Thermal Inbreathing</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>During temperature decrease (nighttime cooling):</p>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    <li>Vapor contraction requires vacuum relief</li>
                    <li>Typically lower than outbreathing requirements</li>
                    <li>Critical for tank structural integrity</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tank Color</TableHead>
                  <TableHead>Color Factor</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>White/Light</TableCell>
                  <TableCell className="font-mono">1.00</TableCell>
                  <TableCell>Reference condition</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Aluminum</TableCell>
                  <TableCell className="font-mono">1.15</TableCell>
                  <TableCell>Metallic finish</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Gray/Medium</TableCell>
                  <TableCell className="font-mono">1.30</TableCell>
                  <TableCell>Moderate absorption</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Dark/Black</TableCell>
                  <TableCell className="font-mono">1.45</TableCell>
                  <TableCell>Maximum solar absorption</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="emergency" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-500" />
              Emergency Venting (Section 5)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>Emergency venting handles heat input from external fire exposure:</p>
            
            <Card className="bg-red-500/5 border-red-500/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="font-semibold">Heat Input Equation (API 2000 Eq. 1):</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">Q = 43,200 × F × A<sup>0.82</sup> (metric: kW)</p>
                  <p className="text-sm text-muted-foreground">Where A = wetted area (m²) up to 9.14m (30 ft) height</p>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Environmental Factor</TableHead>
                  <TableHead>F Value</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>No Protection</TableCell>
                  <TableCell className="font-mono">1.00</TableCell>
                  <TableCell>Bare vessel, no credit</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Adequate Drainage</TableCell>
                  <TableCell className="font-mono">0.50</TableCell>
                  <TableCell>15m+ to flame source</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Water Spray/Foam</TableCell>
                  <TableCell className="font-mono">0.30</TableCell>
                  <TableCell>Active fire protection</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Approved Insulation</TableCell>
                  <TableCell className="font-mono">0.30</TableCell>
                  <TableCell>Fire-resistant insulation</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pump" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Pump In/Out (Section 4.3)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>Movement of liquid in/out of the tank displaces or draws in vapor:</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pump-In (Outbreathing)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>When liquid is pumped into the tank:</p>
                  <ul className="list-disc pl-4 mt-2">
                    <li>1 m³ liquid → 1 m³ vapor displaced</li>
                    <li>Plus flash vapor if hot liquid</li>
                    <li>Often the governing case</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pump-Out (Inbreathing)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>When liquid is pumped out:</p>
                  <ul className="list-disc pl-4 mt-2">
                    <li>1 m³ liquid → 1 m³ air/inert required</li>
                    <li>Critical for vacuum protection</li>
                    <li>Consider maximum pumping rate</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="valve-sizing" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Valve Sizing (Annex B)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>API 2000 Annex B provides valve sizing methodology:</p>
            
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="font-semibold">Flow Correction Factors:</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">
                    Q<sub>corrected</sub> = Q<sub>air</sub> × √(29/MW) × √(T/288)
                  </p>
                  <p className="text-sm text-muted-foreground">Corrects air-equivalent flow to actual gas conditions</p>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Valve Type</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Typical Set Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>PVRV (Pressure/Vacuum)</TableCell>
                  <TableCell>Combined relief</TableCell>
                  <TableCell>±25-50 mbar typical</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pressure Relief Only</TableCell>
                  <TableCell>Overpressure protection</TableCell>
                  <TableCell>+35-50 mbar typical</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Vacuum Relief Only</TableCell>
                  <TableCell>Vacuum protection</TableCell>
                  <TableCell>-25-35 mbar typical</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Emergency Vent</TableCell>
                  <TableCell>Fire case only</TableCell>
                  <TableCell>Higher set (blow-off)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="standards" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Standard Valve Sizes
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>Standard PVRV sizes per industry practice:</p>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead>Nominal (in)</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Typical Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>2"</TableCell>
                  <TableCell>50 mm</TableCell>
                  <TableCell>Flanged/Threaded</TableCell>
                  <TableCell>500-2,000 Nm³/h</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3"</TableCell>
                  <TableCell>80 mm</TableCell>
                  <TableCell>Flanged</TableCell>
                  <TableCell>2,000-5,000 Nm³/h</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>4"</TableCell>
                  <TableCell>100 mm</TableCell>
                  <TableCell>Flanged</TableCell>
                  <TableCell>5,000-10,000 Nm³/h</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>6"</TableCell>
                  <TableCell>150 mm</TableCell>
                  <TableCell>Flanged</TableCell>
                  <TableCell>10,000-25,000 Nm³/h</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>8"</TableCell>
                  <TableCell>200 mm</TableCell>
                  <TableCell>Flanged</TableCell>
                  <TableCell>25,000-50,000 Nm³/h</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>10"</TableCell>
                  <TableCell>250 mm</TableCell>
                  <TableCell>Flanged</TableCell>
                  <TableCell>50,000-100,000 Nm³/h</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>12"</TableCell>
                  <TableCell>300 mm</TableCell>
                  <TableCell>Flanged</TableCell>
                  <TableCell>100,000+ Nm³/h</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
