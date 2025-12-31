import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Thermometer, Info } from 'lucide-react';

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
                <li>• LMTD method</li>
                <li>• Kern/Bell-Delaware methods</li>
                <li>• Heat transfer coefficients</li>
                <li>• Fouling resistance</li>
              </ul>
            </div>
            <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4" />
                Mechanical Design
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• ASME VIII thickness</li>
                <li>• TEMA shell sizing</li>
                <li>• Tube bundle layout</li>
                <li>• Baffle spacing</li>
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
              <h4 className="font-medium text-sm mb-2">Heat Duty</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Q = ṁ × Cp × ΔT
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Log Mean Temperature Difference (LMTD)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                LMTD = (ΔT₁ - ΔT₂) / ln(ΔT₁/ΔT₂)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Heat Transfer Equation</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Q = U × A × F × LMTD
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where F is the LMTD correction factor for multi-pass exchangers
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Overall Heat Transfer Coefficient</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                1/U = 1/h_o + R_fo + (r_o × ln(r_o/r_i))/k_w + R_fi × (r_o/r_i) + (1/h_i) × (r_o/r_i)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TEMA Designations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            TEMA Exchanger Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 px-2">Description</th>
                  <th className="text-left py-2 pl-2">Application</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">AES</td>
                  <td className="px-2">Fixed tubesheet, single pass shell</td>
                  <td className="pl-2">Low ΔT, clean services</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">BEM</td>
                  <td className="px-2">U-tube, bonnet cover</td>
                  <td className="pl-2">High ΔT, dirty shell side</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">AEU</td>
                  <td className="px-2">U-tube, removable channel</td>
                  <td className="pl-2">Easy tube bundle removal</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">AKT</td>
                  <td className="px-2">Kettle reboiler</td>
                  <td className="pl-2">Vaporizing services</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Design Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Shell-side velocity: 0.3-1.0 m/s for liquids, 10-30 m/s for gases</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Tube-side velocity: 1-3 m/s for liquids (max 3 m/s for erosion)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Place corrosive/fouling fluid on tube side when possible</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Baffle spacing: 0.2-1.0 × shell diameter</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Tube pitch: 1.25-1.5 × tube OD (triangular more efficient)</span>
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
            <li>• TEMA Standards (10th Edition)</li>
            <li>• ASME Section VIII, Division 1</li>
            <li>• Kern, D.Q. - Process Heat Transfer</li>
            <li>• Bell, K.J. - Delaware Method for Shell-Side Heat Transfer</li>
            <li>• GPSA Engineering Data Book - Chapter 9</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeatExchangerGuide;
