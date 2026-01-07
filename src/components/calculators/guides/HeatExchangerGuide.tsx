import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Thermometer, Info, Grid3X3, Table as TableIcon, Shield, Activity } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Import shared geometry data if available, otherwise we use the standard reference data
import { allTubeCountTables } from "@/lib/temaGeometry";

// U value reference data per TEMA, GPSA, and Perry's Chemical Engineers' Handbook
const uValueReference = [
  // Water services
  { hotSide: "Water", coldSide: "Water", uMin: 850, uMax: 1700, notes: "Clean service" },
  { hotSide: "Steam", coldSide: "Water", uMin: 1000, uMax: 3500, notes: "Condensing steam" },
  { hotSide: "Steam", coldSide: "Boiling Water", uMin: 1500, uMax: 4000, notes: "Evaporator" },
  // Hydrocarbon-Water
  { hotSide: "Light Hydrocarbon", coldSide: "Water", uMin: 350, uMax: 700, notes: "Low viscosity" },
  { hotSide: "Medium Hydrocarbon", coldSide: "Water", uMin: 200, uMax: 450, notes: "Moderate viscosity" },
  { hotSide: "Heavy Hydrocarbon", coldSide: "Water", uMin: 60, uMax: 300, notes: "High viscosity" },
  { hotSide: "Crude Oil", coldSide: "Water", uMin: 60, uMax: 200, notes: "Typical refinery" },
  { hotSide: "Fuel Oil", coldSide: "Water", uMin: 50, uMax: 150, notes: "Heavy oil" },
  { hotSide: "Lube Oil", coldSide: "Water", uMin: 100, uMax: 350, notes: "Lube oil cooler" },
  { hotSide: "Gasoline", coldSide: "Water", uMin: 400, uMax: 550, notes: "Light fraction" },
  { hotSide: "Kerosene", coldSide: "Water", uMin: 250, uMax: 450, notes: "Middle distillate" },
  { hotSide: "Diesel", coldSide: "Water", uMin: 200, uMax: 400, notes: "Gas oil" },
  // Gas-Water
  { hotSide: "Gas (Low P)", coldSide: "Water", uMin: 25, uMax: 60, notes: "< 2 bar" },
  { hotSide: "Gas (Med P)", coldSide: "Water", uMin: 60, uMax: 150, notes: "2-20 bar" },
  { hotSide: "Gas (High P)", coldSide: "Water", uMin: 150, uMax: 500, notes: "> 20 bar" },
  { hotSide: "Air", coldSide: "Water", uMin: 25, uMax: 50, notes: "Finned tubes recommended" },
  { hotSide: "Hydrogen", coldSide: "Water", uMin: 200, uMax: 600, notes: "High k gas" },
  { hotSide: "Ammonia Gas", coldSide: "Water", uMin: 250, uMax: 500, notes: "Compressor cooler" },
  // HC-HC
  { hotSide: "Light HC", coldSide: "Light HC", uMin: 200, uMax: 400, notes: "Liquid-liquid" },
  { hotSide: "Medium HC", coldSide: "Medium HC", uMin: 150, uMax: 350, notes: "Moderate viscosity" },
  { hotSide: "Heavy HC", coldSide: "Heavy HC", uMin: 50, uMax: 150, notes: "High viscosity" },
  { hotSide: "Heavy HC", coldSide: "Light HC", uMin: 100, uMax: 250, notes: "Mixed viscosity" },
  // Steam heating
  { hotSide: "Steam", coldSide: "Light HC", uMin: 300, uMax: 900, notes: "Reboiler service" },
  { hotSide: "Steam", coldSide: "Medium HC", uMin: 150, uMax: 500, notes: "Process heater" },
  { hotSide: "Steam", coldSide: "Heavy HC", uMin: 60, uMax: 200, notes: "Viscous heating" },
  { hotSide: "Steam", coldSide: "Gases", uMin: 30, uMax: 100, notes: "Gas heating" },
  // Condensers
  { hotSide: "Condensing HC", coldSide: "Water", uMin: 400, uMax: 900, notes: "Light condensate" },
  { hotSide: "Condensing Steam", coldSide: "Cooling Water", uMin: 2000, uMax: 4500, notes: "Surface condenser" },
  { hotSide: "Condensing Ammonia", coldSide: "Water", uMin: 800, uMax: 1400, notes: "Refrigeration" },
  { hotSide: "Condensing Freon", coldSide: "Water", uMin: 400, uMax: 900, notes: "HVAC" },
  { hotSide: "Cond. Organic Vapors", coldSide: "Water", uMin: 600, uMax: 1200, notes: "Clean organics" },
  // Gas-Gas
  { hotSide: "Gas", coldSide: "Gas", uMin: 10, uMax: 50, notes: "Low pressure" },
  { hotSide: "Gas (High P)", coldSide: "Gas (High P)", uMin: 100, uMax: 300, notes: "> 10 bar both sides" },
  // Special services
  { hotSide: "Organic Solvent", coldSide: "Water", uMin: 250, uMax: 700, notes: "Clean solvent" },
  { hotSide: "Brine", coldSide: "Water", uMin: 600, uMax: 1200, notes: "Refrigeration" },
  { hotSide: "Molten Salt", coldSide: "Air", uMin: 50, uMax: 150, notes: "Solar thermal" },
  { hotSide: "Thermal Oil", coldSide: "Water", uMin: 150, uMax: 400, notes: "Hot oil system" },
  { hotSide: "Glycol Solution", coldSide: "Water", uMin: 400, uMax: 800, notes: "Antifreeze" },
];

// Fouling factors per TEMA RGP-T-2.4 (m²·K/W) - Extended list
const foulingReference = [
  // Water services
  { service: "Distilled water", factor: 0.00009, notes: "Pure water" },
  { service: "Treated boiler feedwater", factor: 0.00009, notes: "Deaerated" },
  { service: "Treated cooling water", factor: 0.00018, notes: "Tower water" },
  { service: "Untreated cooling water", factor: 0.00035, notes: "Once-through" },
  { service: "River water", factor: 0.00035, notes: "Fresh water" },
  { service: "Brackish water", factor: 0.00035, notes: "Estuary" },
  { service: "Sea water (clean)", factor: 0.00018, notes: "< 50°C" },
  { service: "Sea water (fouling)", factor: 0.00035, notes: "> 50°C" },
  { service: "City water", factor: 0.00018, notes: "Municipal supply" },
  { service: "Muddy/silty water", factor: 0.00053, notes: "High solids" },
  { service: "Hard water", factor: 0.00053, notes: "Scale forming" },
  // Hydrocarbons
  { service: "Light hydrocarbons (clean)", factor: 0.00018, notes: "Gasoline, naphtha" },
  { service: "MEK, acetone", factor: 0.00018, notes: "Ketones" },
  { service: "Vegetable oils", factor: 0.00053, notes: "Food grade" },
  { service: "Heavy fuel oil", factor: 0.00088, notes: "Bunker fuel" },
  { service: "Asphalt/bitumen", factor: 0.00176, notes: "Very heavy" },
  { service: "Heavy hydrocarbons", factor: 0.00053, notes: "Residuum" },
  { service: "Crude oil (< 120°C)", factor: 0.00035, notes: "Light crude" },
  { service: "Crude oil (120-180°C)", factor: 0.00053, notes: "Medium temp" },
  { service: "Crude oil (180-230°C)", factor: 0.00070, notes: "High temp" },
  { service: "Crude oil (> 230°C)", factor: 0.00088, notes: "Very high temp" },
  { service: "Lean oil (absorber)", factor: 0.00018, notes: "Gas processing" },
  { service: "Rich oil (absorber)", factor: 0.00035, notes: "Loaded with gas" },
  // Gases
  { service: "Natural gas (clean)", factor: 0.00018, notes: "Pipeline quality" },
  { service: "Natural gas (wet)", factor: 0.00035, notes: "Contains liquids" },
  { service: "Acid gas", factor: 0.00035, notes: "CO2, H2S" },
  { service: "Solvent vapors", factor: 0.00018, notes: "Clean organics" },
  { service: "Air", factor: 0.00035, notes: "Ambient air" },
  { service: "Compressed air", factor: 0.00018, notes: "Clean/dry" },
  { service: "Steam (clean)", factor: 0.00009, notes: "Treated" },
  { service: "Steam (exhaust)", factor: 0.00018, notes: "Untreated" },
  { service: "Refrigerants", factor: 0.00018, notes: "HFCs, ammonia" },
  // Process
  { service: "Amine solutions", factor: 0.00035, notes: "Gas treating" },
  { service: "Glycol solutions", factor: 0.00035, notes: "Dehydration" },
  { service: "Caustic solutions", factor: 0.00035, notes: "NaOH, KOH" },
  { service: "DEA/MEA solutions", factor: 0.00035, notes: "Amine treating" },
  { service: "Alcohol solutions", factor: 0.00018, notes: "Methanol, ethanol" },
];

const HeatExchangerGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Heat Exchanger Design Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This calculator performs thermal design and rating of shell-and-tube heat exchangers per
            <strong> TEMA (Tubular Exchanger Manufacturers Association)</strong> standards with
            <strong> ASME Section VIII</strong> mechanical design verification.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4 text-primary" />
                Thermal Design
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• LMTD method (TEMA RGP-4.5)</li>
                <li>• Bell-Delaware & Kern methods</li>
                <li>• Dittus-Boelter, Gnielinski, Sieder-Tate</li>
                <li>• Fouling resistance (TEMA RGP-T-2.4)</li>
              </ul>
            </div>
            <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                Mechanical Design
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• ASME VIII thickness (UG-27, UG-32)</li>
                <li>• TEMA shell sizing (RCB-4.2)</li>
                <li>• Tube bundle layout</li>
                <li>• Vibration analysis (RCB-4.6)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standards & References */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Standards & References
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">TEMA</Badge>
              <div>
                <p className="font-medium">Tubular Exchanger Manufacturers Association Standards (10th Edition, 2019)</p>
                <p className="text-muted-foreground">Sections: RGP-4 (Thermal), RCB-4 (Geometry), RGP-T-2.4 (Fouling)</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">ASME</Badge>
              <div>
                <p className="font-medium">ASME Boiler & Pressure Vessel Code, Section VIII Division 1</p>
                <p className="text-muted-foreground">UG-27 (Shell Thickness), UG-32 (Head Thickness), UG-99 (Hydrostatic Test)</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">HTRI</Badge>
              <div>
                <p className="font-medium">Heat Transfer Research, Inc. - Delaware Method</p>
                <p className="text-muted-foreground">Bell-Delaware correction factors, Vibration criteria</p>
              </div>
            </div>
            <Separator />
            <div className="text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Additional References:</p>
              <ul className="space-y-0.5 ml-4">
                <li>• Kern, D.Q. - Process Heat Transfer (1950)</li>
                <li>• Incropera & DeWitt - Fundamentals of Heat and Mass Transfer (7th Ed)</li>
                <li>• Bowman, Mueller, Nagle - LMTD Correction Factors (1940)</li>
                <li>• Pettigrew & Taylor - Vibration Analysis (2003)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Design Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Design Guidelines & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>F-Factor Minimum (TEMA):</strong> LMTD correction factor should be {'>'} 0.75 for economical design.
                F {'<'} 0.75 indicates potential temperature cross or poor flow arrangement. Consider increasing shell passes.
              </AlertDescription>
            </Alert>

            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Shell-side velocity:</strong> 0.3-1.0 m/s for liquids, 10-30 m/s for gases</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Tube-side velocity:</strong> 1-3 m/s for liquids (max 3 m/s for erosion control)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Fluid allocation:</strong> Place corrosive/fouling fluid on tube side when possible</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Baffle spacing:</strong> 0.2-1.0 × shell diameter (TEMA RCB-4.5)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Tube pitch:</strong> 1.25-1.5 × tube OD (triangular more efficient, square easier to clean)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Vibration:</strong> Ensure shell velocity {'<'} 0.8 × critical velocity (Connors criterion)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accordion for Technical Details */}
      <Accordion type="single" collapsible className="w-full" defaultValue="equations">
        {/* Equations with Validity Ranges */}
        <AccordionItem value="equations" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Equations Reference (with Validity Ranges)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Heat Duty (TEMA)</p>
                <p className="font-mono text-muted-foreground">Q = ṁ × Cp × ΔT</p>
                <p className="text-[10px] text-muted-foreground mt-1">Units: Q [kW], ṁ [kg/s], Cp [kJ/kg·K], ΔT [K]</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">LMTD (Log Mean Temperature Difference)</p>
                <p className="font-mono text-muted-foreground">LMTD = (ΔT₁ - ΔT₂) / ln(ΔT₁/ΔT₂)</p>
                <p className="text-[10px] text-muted-foreground mt-1">Validity: ΔT₁, ΔT₂ {'>'} 0; Use arithmetic mean if |ΔT₁ - ΔT₂| {'<'} 0.1K</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Dittus-Boelter (Tube-Side Nu, Re {'>'} 10000)</p>
                <p className="font-mono text-muted-foreground">Nu = 0.023 × Re^0.8 × Pr^n</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Validity: Re {'>'} 10000, 0.6 {'<'} Pr {'<'} 160, L/D {'>'} 10<br />
                  n = 0.4 (heating: Tw {'>'} Tb), n = 0.3 (cooling: Tw {'<'} Tb)<br />
                  Reference: McAdams (1954), TEMA RGP-4.4
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Gnielinski (Transition, 2300 {'<'} Re {'<'} 10^6)</p>
                <p className="font-mono text-muted-foreground text-[10px]">Nu = (f/8)(Re-1000)Pr / [1 + 12.7(f/8)^0.5(Pr^(2/3)-1)]</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Validity: 2300 {'<'} Re {'<'} 10^6, 0.5 {'<'} Pr {'<'} 2000<br />
                  Reference: Gnielinski (1976), Int. Chem. Eng. 16, 359-368
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Sieder-Tate Viscosity Correction</p>
                <p className="font-mono text-muted-foreground">Nu_corrected = Nu × (μ_bulk/μ_wall)^0.14</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Apply when: (Tw - Tb) {'>'} 10°C or significant viscosity variation<br />
                  Reference: Sieder & Tate (1936), Ind. Eng. Chem. 28, 1429
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Shell-Side j-Factor (Bell-Delaware)</p>
                <p className="font-mono text-muted-foreground">j = 0.321 × Re^(-0.388) (triangular, Re {'>'} 10000)</p>
                <p className="font-mono text-muted-foreground mt-1 text-[10px]">h = j × Cp × Gs × Pr^(-2/3) × Jc × Jl × Jb × Jr × Js</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Validity: 10 {'<'} Re {'<'} 10^6, 0.7 {'<'} Pr {'<'} 500, 1.25 {'<'} P/D {'<'} 2.0<br />
                  Correction factors: Jc (baffle config), Jl (leakage), Jb (bypass), Jr (laminar), Js (spacing)<br />
                  Reference: Bell (1963), Taborek (1983), HTRI Design Manual
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Overall U from Individual Coefficients</p>
                <p className="font-mono text-muted-foreground text-[10px]">1/U = 1/ho + Rfo + (Do×ln(Do/Di))/(2×k) + Rfi×(Do/Di) + (1/hi)×(Do/Di)</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Based on outside tube area. All resistances in series.<br />
                  Fouling factors from TEMA RGP-T-2.4
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Natural Frequency (TEMA Vibration)</p>
                <p className="font-mono text-muted-foreground">fn = (Cn/2π) × √(E×I / (m×L⁴))</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Cn = 22.4 for fixed-fixed supports (TEMA RCB-4.6)<br />
                  Includes added mass coefficient for hydrodynamic effects
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Vortex Shedding Frequency (Strouhal)</p>
                <p className="font-mono text-muted-foreground">fvs = St × V / D</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  St ≈ 0.2 (triangular), 0.25 (square)<br />
                  Resonance risk when 0.7 {'<'} fvs/fn {'<'} 1.3
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 dark:bg-muted/10">
                <p className="font-medium mb-1">Critical Velocity (Connors)</p>
                <p className="font-mono text-muted-foreground">Vcrit = K × fn × D × √(m×δ / (ρ×D²))</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  K = 2.4 (triangular), 3.4 (square); δ ≈ 0.03 (damping)<br />
                  Design criterion: V_shell {'<'} 0.8 × V_crit<br />
                  Reference: Connors (1970), Pettigrew & Taylor (2003)
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* TEMA Tube Count Tables */}
        {allTubeCountTables.map((table, tableIdx) => (
          <AccordionItem key={table.name} value={`tube-count-${tableIdx}`} className="border-border/50">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-primary" />
                TEMA Tube Count: {table.name}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <div className="mb-2 text-xs text-muted-foreground">
                  Tube OD: {table.tubeOD} mm | Tube Pitch: {table.tubePitch} mm | Reference: TEMA RCB-4.2
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-20">Shell ID</TableHead>
                      <TableHead className="text-xs text-center" colSpan={2}>1-Pass</TableHead>
                      <TableHead className="text-xs text-center" colSpan={2}>2-Pass</TableHead>
                      <TableHead className="text-xs text-center" colSpan={2}>4-Pass</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="text-xs pt-1">(mm)</TableHead>
                      <TableHead className="text-xs pt-1">Tri</TableHead>
                      <TableHead className="text-xs pt-1">Sq</TableHead>
                      <TableHead className="text-xs pt-1">Tri</TableHead>
                      <TableHead className="text-xs pt-1">Sq</TableHead>
                      <TableHead className="text-xs pt-1">Tri</TableHead>
                      <TableHead className="text-xs pt-1">Sq</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(table.counts).map(([shellId, passes]) => (
                      <TableRow key={shellId}>
                        <TableCell className="text-xs font-mono font-medium">{shellId}</TableCell>
                        <TableCell className="text-xs">{passes[1]?.triangular ?? '-'}</TableCell>
                        <TableCell className="text-xs">{passes[1]?.square ?? '-'}</TableCell>
                        <TableCell className="text-xs">{passes[2]?.triangular ?? '-'}</TableCell>
                        <TableCell className="text-xs">{passes[2]?.square ?? '-'}</TableCell>
                        <TableCell className="text-xs">{passes[4]?.triangular ?? '-'}</TableCell>
                        <TableCell className="text-xs">{passes[4]?.square ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}

        {/* Overall U Values */}
        <AccordionItem value="u-values" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Overall U Value Reference (TEMA/GPSA)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Hot Side</TableHead>
                    <TableHead className="text-xs">Cold Side</TableHead>
                    <TableHead className="text-xs text-right">Min U</TableHead>
                    <TableHead className="text-xs text-right">Max U</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uValueReference.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-medium">{row.hotSide}</TableCell>
                      <TableCell className="text-xs">{row.coldSide}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{row.uMin}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{row.uMax}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-right">Values in W/m²·K | Reference: TEMA, GPSA Engineering Data Book Ch.9, Perry's Handbook</p>
          </AccordionContent>
        </AccordionItem>

        {/* Fouling Factors */}
        <AccordionItem value="fouling" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-primary" />
              Fouling Factors Reference (TEMA RGP-T-2.4)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Service</TableHead>
                    <TableHead className="text-xs text-right">Factor (m²·K/W)</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {foulingReference.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-medium">{row.service}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{row.factor.toFixed(5)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Note: Fouling factors are conservative estimates. Actual fouling depends on fluid quality, velocity, temperature, and maintenance schedule.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* TEMA Types */}
        <AccordionItem value="tema-types" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              TEMA Exchanger Types
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Application</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs font-bold">AES</TableCell>
                    <TableCell className="text-xs">Fixed tubesheet, single pass shell</TableCell>
                    <TableCell className="text-xs">Low ΔT, clean services</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-bold">BEM</TableCell>
                    <TableCell className="text-xs">U-tube, bonnet cover</TableCell>
                    <TableCell className="text-xs">High ΔT, dirty shell side</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-bold">AEU</TableCell>
                    <TableCell className="text-xs">U-tube, removable channel</TableCell>
                    <TableCell className="text-xs">Easy tube bundle removal</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-bold">AKT</TableCell>
                    <TableCell className="text-xs">Kettle reboiler</TableCell>
                    <TableCell className="text-xs">Vaporizing services</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              TEMA designation: [Front Head]-[Shell Type]-[Rear Head] (e.g., AES = A-type front, E-type shell, S-type rear)
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Nomenclature */}
        <AccordionItem value="nomenclature" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Nomenclature & Symbols
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-medium mb-2">Thermal Parameters</p>
                <div className="space-y-0.5 font-mono text-[10px]">
                  <p>Q = Heat duty [kW]</p>
                  <p>U = Overall heat transfer coefficient [W/m²K]</p>
                  <p>A = Heat transfer area [m²]</p>
                  <p>LMTD = Log mean temperature difference [K]</p>
                  <p>F = LMTD correction factor [-]</p>
                  <p>h = Heat transfer coefficient [W/m²K]</p>
                  <p>Nu = Nusselt number [-]</p>
                  <p>Re = Reynolds number [-]</p>
                  <p>Pr = Prandtl number [-]</p>
                  <p>NTU = Number of transfer units [-]</p>
                  <p>ε = Effectiveness [-]</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-medium mb-2">Physical Properties</p>
                <div className="space-y-0.5 font-mono text-[10px]">
                  <p>ρ = Density [kg/m³]</p>
                  <p>μ = Dynamic viscosity [cP]</p>
                  <p>k = Thermal conductivity [W/m·K]</p>
                  <p>Cp = Specific heat [kJ/kg·K]</p>
                  <p>Rf = Fouling resistance [m²K/W]</p>
                </div>
                <p className="font-medium mb-2 mt-3">Subscripts</p>
                <div className="space-y-0.5 font-mono text-[10px]">
                  <p>i = Inner, inlet, or tube-side</p>
                  <p>o = Outer, outlet, or shell-side</p>
                  <p>h = Hot fluid</p>
                  <p>c = Cold fluid</p>
                  <p>w = Wall</p>
                  <p>b = Bulk</p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default HeatExchangerGuide;
