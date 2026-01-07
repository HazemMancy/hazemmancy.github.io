import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calculator, AlertCircle, CheckCircle, Info, ArrowRight, ArrowDown } from 'lucide-react';

const HydraulicGuide: React.FC = () => {
  return (
    <div className="space-y-6">

      {/* Calculator Overview - Inputs, Equations, Outputs */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Hydraulic Sizing Calculator Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Input Fields */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-primary">Required Inputs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { name: "Fluid Type", unit: "Gas / Liquid / Mixed" },
                { name: "Flow Rate", unit: "m³/h, MMSCFD, etc." },
                { name: "Density", unit: "kg/m³" },
                { name: "Viscosity", unit: "cP" },
                { name: "Pipe Length", unit: "m" },
                { name: "Nominal Diameter", unit: "in / mm" },
                { name: "Pipe Schedule", unit: "5s to XXS" },
                { name: "Surface Roughness", unit: "mm" },
                { name: "Op. Pressure", unit: "barg (Gas Only)" },
                { name: "Op. Temperature", unit: "°C" },
                { name: "Z-Factor", unit: "Dimensionless (Gas)" },
                { name: "Service Type", unit: "Criteria Selection" },
              ].map((input, i) => (
                <div key={i} className="p-2 bg-primary/5 rounded-md border border-primary/20">
                  <p className="text-xs font-medium">{input.name}</p>
                  <p className="text-[10px] text-muted-foreground">{input.unit}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Key Equations */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-primary">Calculation Equations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs font-medium mb-1">Velocity</p>
                <p className="font-mono text-xs bg-background/60 p-1.5 rounded">V = Q / A = 4Q / (π × D²)</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs font-medium mb-1">Reynolds Number</p>
                <p className="font-mono text-xs bg-background/60 p-1.5 rounded">Re = ρVD / μ</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs font-medium mb-1">Friction (Colebrook-White)</p>
                <p className="font-mono text-xs bg-background/60 p-1.5 rounded">1/√f = -2·log(ε/3.7D + 2.51/Re√f)</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs font-medium mb-1">Pressure Drop (Darcy-Weisbach)</p>
                <p className="font-mono text-xs bg-background/60 p-1.5 rounded">ΔP = f × (L/D) × (ρV²/2)</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs font-medium mb-1">Momentum</p>
                <p className="font-mono text-xs bg-background/60 p-1.5 rounded">ρV² [kg/m·s²]</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs font-medium mb-1">Mach Number</p>
                <p className="font-mono text-xs bg-background/60 p-1.5 rounded">Ma = V / √(k·R·T/MW)</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs font-medium mb-1">API 14E Erosional Velocity</p>
                <p className="font-mono text-xs bg-background/60 p-1.5 rounded">Ve = C / √ρ</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border">
                <p className="text-xs font-medium mb-1">Mixture Density (Homogeneous)</p>
                <p className="font-mono text-xs bg-background/60 p-1.5 rounded">ρ_mix = ρL·(1-x) + ρG·x</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Output Fields */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-primary">Calculated Outputs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { name: "Fluid Velocity", unit: "m/s" },
                { name: "Pressure Drop", unit: "bar/km & total bar" },
                { name: "Reynolds Number", unit: "Dimensionless" },
                { name: "Flow Regime", unit: "Laminar / Turbulent" },
                { name: "Momentum (ρV²)", unit: "kg/m·s²" },
                { name: "Mach Number", unit: "Dimensionless" },
                { name: "Erosional Ratio", unit: "V / Ve" },
                { name: "Head Loss", unit: "meters" },
                { name: "Mixture Density", unit: "kg/m³ (Mixed)" },
                { name: "Gas Mass Fraction", unit: "% (Mixed)" },
                { name: "Status Check", unit: "Pass / Warning" },
                { name: "Friction Factor", unit: "Dimensionless" },
              ].map((output, i) => (
                <div key={i} className="p-2 bg-green-500/5 rounded-md border border-green-500/20">
                  <p className="text-xs font-medium">{output.name}</p>
                  <p className="text-[10px] text-muted-foreground">{output.unit}</p>
                </div>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Engineering Design Considerations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Engineering Design Considerations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Gas Systems</h4>
            <div className="text-xs text-muted-foreground space-y-2 pl-2 border-l-2 border-blue-500/30">
              <p><strong>Acoustic Induced Vibration (AIV):</strong> High velocity gas flows can generate acoustic energy causing pipe fatigue. Mach limits ({"<"} 0.5 continuous, {"<"} 0.7 intermittent) help mitigate this risk per API 521.</p>
              <p><strong>Joule-Thomson Effect:</strong> Significant pressure drops in gas lines cause temperature drops. Material selection must account for minimum design metal temperature (MDMT).</p>
              <p><strong>Compressibility:</strong> Calculations use a **segmented compressible flow model**. Density z-factor varies with pressure. Sonic conditions are checked via Mach number (limit Ma {"<"} 1.0).</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Liquid Systems</h4>
            <div className="text-xs text-muted-foreground space-y-2 pl-2 border-l-2 border-cyan-500/30">
              <p><strong>Water Hammer (Surge):</strong> Velocities {">"} 3-4 m/s significantly increase surge overpressure risk during rapid valve closures (Joukowsky equation).</p>
              <p><strong>Pump Suction (NPSH):</strong> Suction lines require stricter velocity limits (typically {"<"} 1-2 m/s) to minimize friction loss and ensure NPSHa exceeds NPSHr.</p>
              <p><strong>Cavitation:</strong> Boiling-point liquids require even lower velocities ({"<"} 0.6-0.9 m/s) to prevent vaporization at low-pressure points.</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Mixed-Phase Systems</h4>
            <div className="text-xs text-muted-foreground space-y-2 pl-2 border-l-2 border-purple-500/30">
              <p><strong>Flow Regimes:</strong> Slug flow causes high dynamic loads and vibration. Annular flow has liquid film on walls with high-velocity gas core.</p>
              <p><strong>Erosion:</strong> Particulates in mixed-phase flow cause rapid wall thinning at bends. The momentum (ρv²) limit directly correlates to erosion potential.</p>
              <p><strong>Methodology Limitation:</strong> Mixed-phase pressure drop uses a **Homogeneous (No-Slip) Flow Model**. This is a **screening-level** calculation suitable for preliminary sizing. For detailed design in segregated flow regimes, use rigorous multiphase correlations (e.g., Beggs & Brill).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Verify pipe schedule availability for the selected nominal diameter</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Consider future flow increases when sizing (typically 10-20% margin)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>For pump suction lines, prioritize low pressure drop over velocity</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Use actual flowing conditions (P, T) for gas density calculations</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Check erosional velocity limits for corrosive or erosive services</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>For flare systems, always verify Mach number against API 521 limits</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong>Roughness:</strong> Select the appropriate material condition (e.g., "Carbon Steel (Corroded)") or use "Custom" to set a specific roughness value.</span>
            </div>
          </div>
        </CardContent>
      </Card>




      {/* References */}
      < Card >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            References
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• API RP 14E - Design and Installation of Offshore Production Platform Piping Systems</li>
            <li>• API 520/521 - Sizing, Selection, and Installation of Pressure-Relieving Devices</li>
            <li>• ASME B31.3 - Process Piping Code</li>
            <li>• Crane Technical Paper No. 410 - Flow of Fluids Through Valves, Fittings, and Pipe</li>
            <li>• GPSA Engineering Data Book - Gas Processors Suppliers Association</li>
            <li>• ASME B36.10M/B36.19M - Welded and Seamless Steel Pipe</li>
          </ul>
        </CardContent>
      </Card >
    </div >
  );
};

export default HydraulicGuide;
