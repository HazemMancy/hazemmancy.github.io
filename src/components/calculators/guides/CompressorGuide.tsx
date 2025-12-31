import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Zap, Gauge, Thermometer, Info } from 'lucide-react';

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
            This calculator performs gas compression power analysis per industry standards including 
            <strong> API 617</strong> (Axial and Centrifugal Compressors), <strong>ASME PTC 10</strong> (Performance Test Code), 
            and <strong>ISO 5389</strong> (Turbocompressors). The Schultz polytropic method is used for real gas effects.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                Power Calculations
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Isentropic (adiabatic) power</li>
                <li>• Polytropic power with Schultz correction</li>
                <li>• Shaft power (including mechanical losses)</li>
                <li>• Motor power (including driver efficiency)</li>
              </ul>
            </div>
            <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4 text-accent-foreground" />
                Thermal Analysis
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Discharge temperature prediction</li>
                <li>• Multi-stage temperature profiles</li>
                <li>• Intercooler approach temperature</li>
                <li>• Density and specific volume</li>
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
            Key Equations (API 617 / ASME PTC 10)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Polytropic Head (Hp)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Hp = f × (Z₁ × R × T₁ × n/(n-1)) × [(P₂/P₁)^((n-1)/n) - 1]
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: f = Schultz correction factor, Z₁ = inlet compressibility, R = specific gas constant, 
                n = polytropic exponent
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Polytropic Exponent (n)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                n = (k/Y) × [1 - ((k-1)/(X+1)) × ((1-ηp)/ηp)]
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: k = specific heat ratio (Cp/Cv), X and Y = Schultz compressibility functions, ηp = polytropic efficiency
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Discharge Temperature</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                T₂ = T₁ × (P₂/P₁)^m where m = ((n-1)/n) × ((1+X)/Y)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Power Calculations</h4>
              <div className="text-xs font-mono bg-background/60 p-2 rounded space-y-1">
                <p>Gas Power = ṁ × Hp / ηp</p>
                <p>Shaft Power = Gas Power / ηmech</p>
                <p>Motor Power = Shaft Power / ηmotor</p>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Schultz Factor (f)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                f = ln(P₂/P₁) × (Z₂v₂ - Z₁v₁) / (Z₂v₂ × ln(Z₂v₂/Z₁v₁))
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Corrects polytropic head for real gas behavior (f → 1 for ideal gas)
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
            Design Guidelines per API 617
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Temperature Limits</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Max discharge temperature</span>
                  <Badge variant="outline">200°C (392°F)</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Seal/bearing rating check</span>
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
            <h4 className="font-medium text-sm">Staging Recommendations</h4>
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Use multi-stage compression when ratio exceeds 3-4 for centrifugal or 6-8 for reciprocating</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Intercooling reduces power consumption by 10-20% and limits discharge temperature</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Equal compression ratios per stage minimizes total power</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Typical intercooler approach: 5-15°C above inlet cooling medium</span>
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
                  <th className="text-center py-2 px-2">Flow Range</th>
                  <th className="text-center py-2 px-2">Ratio/Stage</th>
                  <th className="text-center py-2 px-2">Max Press.</th>
                  <th className="text-center py-2 px-2">η Isen</th>
                  <th className="text-center py-2 px-2">η Poly</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Centrifugal</td>
                  <td className="text-center py-2 px-2">500-500,000 m³/h</td>
                  <td className="text-center py-2 px-2">1.5-4.0</td>
                  <td className="text-center py-2 px-2">70 bar</td>
                  <td className="text-center py-2 px-2">75-85%</td>
                  <td className="text-center py-2 px-2">78-88%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Axial</td>
                  <td className="text-center py-2 px-2">50,000-1,500,000 m³/h</td>
                  <td className="text-center py-2 px-2">1.2-2.0</td>
                  <td className="text-center py-2 px-2">20 bar</td>
                  <td className="text-center py-2 px-2">85-92%</td>
                  <td className="text-center py-2 px-2">88-93%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Reciprocating</td>
                  <td className="text-center py-2 px-2">10-50,000 m³/h</td>
                  <td className="text-center py-2 px-2">1.5-10.0</td>
                  <td className="text-center py-2 px-2">700 bar</td>
                  <td className="text-center py-2 px-2">80-90%</td>
                  <td className="text-center py-2 px-2">82-92%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Screw</td>
                  <td className="text-center py-2 px-2">100-30,000 m³/h</td>
                  <td className="text-center py-2 px-2">2.0-6.0</td>
                  <td className="text-center py-2 px-2">25 bar</td>
                  <td className="text-center py-2 px-2">70-82%</td>
                  <td className="text-center py-2 px-2">73-85%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Diaphragm</td>
                  <td className="text-center py-2 px-2">1-5,000 m³/h</td>
                  <td className="text-center py-2 px-2">2.0-10.0</td>
                  <td className="text-center py-2 px-2">1000 bar</td>
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
            References
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• API 617 - Axial and Centrifugal Compressors and Expander-Compressors</li>
            <li>• ASME PTC 10 - Performance Test Code on Compressors and Exhausters</li>
            <li>• ISO 5389 - Turbocompressors - Performance test code</li>
            <li>• Schultz, J.M. (1962) - "The Polytropic Analysis of Centrifugal Compressors", ASME</li>
            <li>• API 618 - Reciprocating Compressors for Petroleum, Chemical, and Gas Industry Services</li>
            <li>• GPSA Engineering Data Book - Gas Processors Suppliers Association</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompressorGuide;
