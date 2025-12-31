import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, BookOpen, Calculator, Info, Flame, Droplets, Gauge, Thermometer, GitBranch } from "lucide-react";

export default function API520Guide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            API 520/521 Pressure Relief Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            API 520 Part I covers sizing and selection of pressure-relieving devices. API 520 Part II covers 
            installation. API 521 provides guidance on pressure-relieving and depressuring systems.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">API 520</Badge>
            <Badge variant="outline">API 521</Badge>
            <Badge variant="outline">API RP 526</Badge>
            <Badge variant="outline">ASME Section VIII</Badge>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full space-y-2">
        <AccordionItem value="orifice" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              API RP 526 Standard Orifice Sizes
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>Standard orifice designations D through T per API RP 526:</p>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Letter</TableHead>
                  <TableHead>Area (in²)</TableHead>
                  <TableHead>Area (cm²)</TableHead>
                  <TableHead>Diameter (in)</TableHead>
                  <TableHead>Inlet × Outlet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-bold">D</TableCell><TableCell>0.110</TableCell><TableCell>0.710</TableCell><TableCell>0.374</TableCell><TableCell>1" × 2"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">E</TableCell><TableCell>0.196</TableCell><TableCell>1.265</TableCell><TableCell>0.500</TableCell><TableCell>1" × 2"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">F</TableCell><TableCell>0.307</TableCell><TableCell>1.981</TableCell><TableCell>0.625</TableCell><TableCell>1½"×2" × 2½"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">G</TableCell><TableCell>0.503</TableCell><TableCell>3.245</TableCell><TableCell>0.800</TableCell><TableCell>1½"×2" × 3"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">H</TableCell><TableCell>0.785</TableCell><TableCell>5.065</TableCell><TableCell>1.000</TableCell><TableCell>2"×3" × 4"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">J</TableCell><TableCell>1.287</TableCell><TableCell>8.303</TableCell><TableCell>1.280</TableCell><TableCell>3" × 4"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">K</TableCell><TableCell>1.838</TableCell><TableCell>11.858</TableCell><TableCell>1.530</TableCell><TableCell>3" × 4"×6"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">L</TableCell><TableCell>2.853</TableCell><TableCell>18.406</TableCell><TableCell>1.906</TableCell><TableCell>4" × 6"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">M</TableCell><TableCell>3.600</TableCell><TableCell>23.226</TableCell><TableCell>2.141</TableCell><TableCell>4" × 6"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">N</TableCell><TableCell>4.340</TableCell><TableCell>28.000</TableCell><TableCell>2.352</TableCell><TableCell>4" × 6"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">P</TableCell><TableCell>6.380</TableCell><TableCell>41.161</TableCell><TableCell>2.850</TableCell><TableCell>4"×6" × 8"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">Q</TableCell><TableCell>11.05</TableCell><TableCell>71.290</TableCell><TableCell>3.750</TableCell><TableCell>6" × 8"×10"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">R</TableCell><TableCell>16.00</TableCell><TableCell>103.226</TableCell><TableCell>4.512</TableCell><TableCell>6"×8" × 10"</TableCell></TableRow>
                <TableRow><TableCell className="font-bold">T</TableCell><TableCell>26.00</TableCell><TableCell>167.742</TableCell><TableCell>5.754</TableCell><TableCell>8" × 10"×12"</TableCell></TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vapor" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Gas/Vapor Sizing (Section 5.6)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <Card className="bg-blue-500/5 border-blue-500/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="font-semibold">Gas/Vapor Area Equation (API 520 Eq. 3.2):</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">
                    A = W × √(TZ/M) / (C × K<sub>d</sub> × P<sub>1</sub> × K<sub>b</sub> × K<sub>c</sub>)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factor</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>Discharge Coefficient</TableCell><TableCell>K<sub>d</sub></TableCell><TableCell>0.975 for vapor (0.65 for liquid)</TableCell></TableRow>
                <TableRow><TableCell>Backpressure Factor</TableCell><TableCell>K<sub>b</sub></TableCell><TableCell>1.0 for conventional at critical flow</TableCell></TableRow>
                <TableRow><TableCell>Combination Factor</TableCell><TableCell>K<sub>c</sub></TableCell><TableCell>0.9 with rupture disk, 1.0 without</TableCell></TableRow>
                <TableRow><TableCell>C Coefficient</TableCell><TableCell>C</TableCell><TableCell>Depends on k (Cp/Cv)</TableCell></TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="liquid" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-500" />
              Liquid Sizing (Section 5.8)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <Card className="bg-cyan-500/5 border-cyan-500/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="font-semibold">Liquid Area Equation:</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">
                    A = Q × √G / (38 × K<sub>d</sub> × K<sub>w</sub> × K<sub>c</sub> × K<sub>v</sub> × √ΔP)
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="font-semibold">Viscosity Correction (K<sub>v</sub>):</p>
              <p className="text-sm text-muted-foreground">
                For Reynolds number &lt; 100,000, apply viscosity correction per API 520 Section 5.8.3
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="twophase" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-500" />
              Two-Phase Flow (Appendix D)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p>API 520 Appendix D - Omega Method for two-phase flow:</p>
            
            <Card className="bg-purple-500/5 border-purple-500/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="font-semibold">Omega Parameter:</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">
                    ω = (x × v<sub>V</sub> + (1-x) × v<sub>L</sub> × k) / v<sub>TP</sub>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Where x = vapor mass fraction, v = specific volume
                  </p>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="steam" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-orange-500" />
              Steam Sizing (Section 5.7)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <Card className="bg-orange-500/5 border-orange-500/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="font-semibold">Steam Area Equation:</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">
                    A = W / (51.5 × P<sub>1</sub> × K<sub>d</sub> × K<sub>b</sub> × K<sub>c</sub> × K<sub>N</sub> × K<sub>SH</sub>)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factor</TableHead>
                  <TableHead>Application</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>K<sub>N</sub> (Napier)</TableCell><TableCell>For pressure &gt; 1515 psia</TableCell></TableRow>
                <TableRow><TableCell>K<sub>SH</sub> (Superheat)</TableCell><TableCell>For superheated steam</TableCell></TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fire" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-500" />
              Fire Case (API 521)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <Card className="bg-red-500/5 border-red-500/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="font-semibold">Fire Heat Absorption:</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded">
                    Q = C × F × A<sup>0.82</sup>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    C = 21,000 (with drainage) or 34,500 (without) BTU/hr/ft²
                  </p>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Environmental Factor F</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>1.00</TableCell><TableCell>Bare vessel (no protection)</TableCell></TableRow>
                <TableRow><TableCell>0.30</TableCell><TableCell>Insulated (k×t ≥ 22.7 W/m²)</TableCell></TableRow>
                <TableRow><TableCell>0.15</TableCell><TableCell>Insulated (k×t ≥ 11.4 W/m²)</TableCell></TableRow>
                <TableRow><TableCell>0.075</TableCell><TableCell>Insulated (k×t ≥ 5.7 W/m²)</TableCell></TableRow>
                <TableRow><TableCell>0.03</TableCell><TableCell>Earth-covered storage</TableCell></TableRow>
              </TableBody>
            </Table>

            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-sm">
                  <strong>Note:</strong> Wetted area is limited to 25 ft (7.62m) above grade for fire case calculations. 
                  21% overpressure is allowed for fire contingency per ASME.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="valvetypes" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Valve Types & Backpressure
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Valve Type</TableHead>
                  <TableHead>Max Backpressure</TableHead>
                  <TableHead>Application</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Conventional</TableCell>
                  <TableCell>10% of set pressure</TableCell>
                  <TableCell>Atmospheric discharge, constant BP</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Balanced Bellows</TableCell>
                  <TableCell>30-50% of set pressure</TableCell>
                  <TableCell>Variable backpressure systems</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pilot Operated</TableCell>
                  <TableCell>Up to 70% of set pressure</TableCell>
                  <TableCell>High BP, tight shutoff needed</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
