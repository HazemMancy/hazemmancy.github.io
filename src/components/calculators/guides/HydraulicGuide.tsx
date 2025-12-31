import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Wind, Droplets, Waves, Info } from 'lucide-react';

const HydraulicGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Hydraulic Line Sizing Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This calculator performs hydraulic sizing for gas, liquid, and mixed-phase pipelines per 
            <strong> Eni Sizing Criteria</strong> (Tables 8.1.1.1, 8.2.1.1, 8.3.1.1). Pressure drop calculations 
            use the <strong>Darcy-Weisbach</strong> equation with Colebrook-White friction factor for turbulent flow.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Wind className="h-4 w-4 text-blue-500" />
                Gas Lines
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Velocity limits</li>
                <li>• ρV² erosional velocity</li>
                <li>• Mach number (flare)</li>
                <li>• ΔP/km criteria</li>
              </ul>
            </div>
            <div className="p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4 text-cyan-500" />
                Liquid Lines
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Size-dependent velocity</li>
                <li>• Pump suction/discharge</li>
                <li>• Gravity flow</li>
                <li>• ΔP/km criteria</li>
              </ul>
            </div>
            <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Waves className="h-4 w-4 text-purple-500" />
                Mixed-Phase
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• ρV² erosional velocity</li>
                <li>• Mixture density</li>
                <li>• Mach (flare headers)</li>
                <li>• Erosive fluid limits</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Equations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Key Equations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Darcy-Weisbach Pressure Drop</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                ΔP = f × (L/D) × (ρV²/2)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: f = Darcy friction factor, L = pipe length, D = inside diameter, ρ = fluid density, V = velocity
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Colebrook-White Friction Factor</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                1/√f = -2 × log₁₀(ε/(3.7D) + 2.51/(Re×√f))
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: ε = absolute roughness, Re = Reynolds number
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Reynolds Number</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Re = ρVD/μ
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: μ = dynamic viscosity
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Erosional Velocity (ρV²)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                ρV² = ρ × V² [kg/(m·s²)]
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Industry limit: typically 6,000-25,000 kg/(m·s²) depending on service
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Mach Number (Gas Flow)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Ma = V / √(k × R × T / MW)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: k = specific heat ratio, R = universal gas constant, T = temperature, MW = molecular weight
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eni Sizing Criteria Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Eni Sizing Criteria Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Gas Lines (Table 8.1.1.1)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Service</th>
                    <th className="text-center py-2 px-2">ΔP (bar/km)</th>
                    <th className="text-center py-2 px-2">Velocity (m/s)</th>
                    <th className="text-center py-2 px-2">ρV²</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Continuous (&lt;2 barg)</td>
                    <td className="text-center">0.5</td>
                    <td className="text-center">50</td>
                    <td className="text-center">-</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Continuous (7-35 barg)</td>
                    <td className="text-center">1.5</td>
                    <td className="text-center">-</td>
                    <td className="text-center">15,000</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Compressor Suction</td>
                    <td className="text-center">0.15-2</td>
                    <td className="text-center">25-35</td>
                    <td className="text-center">6,000-15,000</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Flare Header</td>
                    <td className="text-center">-</td>
                    <td className="text-center">-</td>
                    <td className="text-center">Mach 0.5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Liquid Lines (Table 8.2.1.1)</h4>
            <div className="text-xs text-muted-foreground">
              <p className="mb-2">Velocity limits vary by pipe size:</p>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="p-2 bg-muted/30 rounded">
                  <p className="font-medium text-foreground">≤2"</p>
                  <p>Lower</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="font-medium text-foreground">3-6"</p>
                  <p>Medium</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="font-medium text-foreground">8-12"</p>
                  <p>Medium</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="font-medium text-foreground">14-18"</p>
                  <p>Higher</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="font-medium text-foreground">≥20"</p>
                  <p>Highest</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Mixed-Phase Lines (Table 8.3.1.1)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Service</th>
                    <th className="text-center py-2 px-2">ρV² Limit</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Continuous (&lt;7 barg)</td>
                    <td className="text-center">6,000</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Continuous (&gt;7 barg)</td>
                    <td className="text-center">15,000</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Erosive Fluid</td>
                    <td className="text-center">3,750</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Flare (Significant Liquids)</td>
                    <td className="text-center">50,000 + Mach 0.25</td>
                  </tr>
                </tbody>
              </table>
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
              <span>Use actual flowing conditions for gas density calculations</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Check erosional velocity limits for corrosive or erosive services</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* References */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            References
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Eni Design Standard - Line Sizing Criteria (Tables 8.1.1.1, 8.2.1.1, 8.3.1.1)</li>
            <li>• Crane Technical Paper No. 410 - Flow of Fluids Through Valves, Fittings, and Pipe</li>
            <li>• ASME B36.10M - Welded and Seamless Wrought Steel Pipe</li>
            <li>• ASME B36.19M - Stainless Steel Pipe</li>
            <li>• API RP 14E - Design and Installation of Offshore Production Platform Piping Systems</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default HydraulicGuide;
