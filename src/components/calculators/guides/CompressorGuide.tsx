import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Zap, Gauge, Thermometer, Info, Cog } from 'lucide-react';

const CompressorGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Compressor Power Calculator Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This calculator performs comprehensive gas compression analysis per international standards:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px]">API 617</Badge>
                Dynamic Compressors
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Centrifugal compressors</li>
                <li>• Axial compressors</li>
                <li>• Expander-compressors</li>
                <li>• Polytropic analysis with Schultz method</li>
              </ul>
            </div>
            <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px]">API 618</Badge>
                Reciprocating Compressors
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Reciprocating compressors</li>
                <li>• Diaphragm compressors</li>
                <li>• Volumetric efficiency calculation</li>
                <li>• Rod load analysis</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                Power Calculations
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Isentropic (adiabatic) power</li>
                <li>• Polytropic power with Schultz correction</li>
                <li>• Shaft power (mechanical losses)</li>
                <li>• Motor power (driver efficiency)</li>
              </ul>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4" />
                Thermal Analysis
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Discharge temperature prediction</li>
                <li>• Multi-stage temperature profiles</li>
                <li>• Intercooler approach temperature</li>
                <li>• Real gas property effects</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Equations - API 617 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Key Equations - API 617 / ASME PTC 10
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Polytropic Head (Hp) - Schultz Method</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Hp = f × (Z₁ × R × T₁ × n/(n-1)) × [(P₂/P₁)^((n-1)/n) - 1]
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: f = Schultz correction factor, Z₁ = inlet compressibility, R = gas constant (8314.46/MW), 
                n = polytropic exponent, P = pressure, T = temperature
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Polytropic Exponent (n)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                n/(n-1) = (k/(k-1)) × (1/ηp) × (Y/(1+X))
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: k = Cp/Cv (specific heat ratio), ηp = polytropic efficiency, 
                X and Y = Schultz compressibility functions from ASME PTC 10
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Schultz Compressibility Functions</h4>
              <div className="text-xs font-mono bg-background/60 p-2 rounded space-y-1">
                <p>X = (T/Z) × (∂Z/∂T)_P  (isothermal expansion)</p>
                <p>Y = 1 - (P/Z) × (∂Z/∂P)_T  (isothermal compressibility)</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                For ideal gas: X = 0, Y = 1. Uses Lee-Kesler correlation for real gas.
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Schultz Factor (f)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                f = ln(P₂/P₁) × (Z₂v₂ - Z₁v₁) / (Z₂v₂ × ln(Z₂v₂/Z₁v₁))
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Corrects polytropic head for real gas behavior. For ideal gas f → 1.0
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Discharge Temperature</h4>
              <div className="text-xs font-mono bg-background/60 p-2 rounded space-y-1">
                <p>T₂/T₁ = (P₂/P₁)^m</p>
                <p>where m = ((n-1)/n) × ((1+X)/Y)</p>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Power Calculations</h4>
              <div className="text-xs font-mono bg-background/60 p-2 rounded space-y-1">
                <p>Gas Power = ṁ × Hp</p>
                <p>Shaft Power = Gas Power / ηmech</p>
                <p>Motor Power = Shaft Power / ηmotor</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API 618 Equations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cog className="h-5 w-5" />
            Key Equations - API 618 (Reciprocating)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Volumetric Efficiency</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                ηv = 1 - c × [(P₂/P₁)^(1/k) - 1] - losses
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: c = clearance volume fraction (typically 5-10%), 
                losses include leakage (~2%) and heating (~2%)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Discharge Temperature (Adiabatic)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                T₂ = T₁ × (P₂/P₁)^((k-1)/(k×ηisen))
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                For reciprocating compressors, isentropic efficiency accounts for valve and heat transfer losses
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Piston Displacement</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                PD = V̇actual / ηv
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Required piston displacement based on actual volumetric flow and volumetric efficiency
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Design Guidelines */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Design Guidelines per API 617 / API 618
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Temperature Limits</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>API 617 max discharge</span>
                  <Badge variant="outline">200°C (392°F)</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>API 618 cylinder limit</span>
                  <Badge variant="outline">135°C (275°F)</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Seal/bearing check</span>
                  <Badge variant="outline">&gt;150°C</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Compression Ratio Limits</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Centrifugal (per stage)</span>
                  <Badge variant="outline">3-4:1</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Axial (per stage)</span>
                  <Badge variant="outline">1.2-1.5:1</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Reciprocating (per stage)</span>
                  <Badge variant="outline">3-10:1</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Staging & Intercooling Recommendations</h4>
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Multi-stage when ratio exceeds 3-4 (centrifugal) or 6-8 (reciprocating)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Intercooling reduces power 10-20% and limits discharge temperature</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Equal compression ratios per stage minimizes total power</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Typical intercooler approach: 5-15°C above cooling medium</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>API 617: Minimum 10% surge margin for stable operation</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compressor Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Compressor Type Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-center py-2 px-2">Standard</th>
                  <th className="text-center py-2 px-2">Flow Range</th>
                  <th className="text-center py-2 px-2">Ratio/Stage</th>
                  <th className="text-center py-2 px-2">η Isen</th>
                  <th className="text-center py-2 px-2">η Poly</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Centrifugal</td>
                  <td className="text-center py-2 px-2"><Badge variant="outline" className="text-[9px]">API 617</Badge></td>
                  <td className="text-center py-2 px-2">500-500k m³/h</td>
                  <td className="text-center py-2 px-2">1.5-4.0</td>
                  <td className="text-center py-2 px-2">75-85%</td>
                  <td className="text-center py-2 px-2">78-88%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Axial</td>
                  <td className="text-center py-2 px-2"><Badge variant="outline" className="text-[9px]">API 617</Badge></td>
                  <td className="text-center py-2 px-2">50k-1.5M m³/h</td>
                  <td className="text-center py-2 px-2">1.2-2.0</td>
                  <td className="text-center py-2 px-2">85-92%</td>
                  <td className="text-center py-2 px-2">88-93%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Reciprocating</td>
                  <td className="text-center py-2 px-2"><Badge variant="outline" className="text-[9px]">API 618</Badge></td>
                  <td className="text-center py-2 px-2">10-50k m³/h</td>
                  <td className="text-center py-2 px-2">1.5-10.0</td>
                  <td className="text-center py-2 px-2">80-90%</td>
                  <td className="text-center py-2 px-2">82-92%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Screw</td>
                  <td className="text-center py-2 px-2"><Badge variant="outline" className="text-[9px]">API 619</Badge></td>
                  <td className="text-center py-2 px-2">100-30k m³/h</td>
                  <td className="text-center py-2 px-2">2.0-6.0</td>
                  <td className="text-center py-2 px-2">70-82%</td>
                  <td className="text-center py-2 px-2">73-85%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Diaphragm</td>
                  <td className="text-center py-2 px-2"><Badge variant="outline" className="text-[9px]">API 618</Badge></td>
                  <td className="text-center py-2 px-2">1-5k m³/h</td>
                  <td className="text-center py-2 px-2">2.0-10.0</td>
                  <td className="text-center py-2 px-2">65-78%</td>
                  <td className="text-center py-2 px-2">68-80%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* References */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Standards & References
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong>API 617</strong> - Axial and Centrifugal Compressors and Expander-Compressors (8th Ed.)</li>
            <li><strong>API 618</strong> - Reciprocating Compressors for Petroleum, Chemical, and Gas Industry (6th Ed.)</li>
            <li><strong>API 619</strong> - Rotary-Type Positive-Displacement Compressors</li>
            <li><strong>ASME PTC 10</strong> - Performance Test Code on Compressors and Exhausters</li>
            <li><strong>ISO 5389</strong> - Turbocompressors - Performance test code</li>
            <li><strong>Schultz, J.M. (1962)</strong> - "The Polytropic Analysis of Centrifugal Compressors", ASME J. Eng. Power</li>
            <li><strong>GPSA Engineering Data Book</strong> - Gas Processors Suppliers Association (14th Ed.)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompressorGuide;