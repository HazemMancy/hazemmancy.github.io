import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Info } from 'lucide-react';

const ReynoldsGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Reynolds Number & Friction Factor Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This calculator computes Reynolds number and friction factor for pipe flow using the 
            <strong> Colebrook-White equation</strong> (iterative) and <strong>Swamee-Jain approximation</strong>.
            Results are visualized on a Moody diagram.
          </p>
        </CardContent>
      </Card>

      {/* Flow Regimes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Flow Regimes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <h4 className="font-medium text-sm mb-2">Laminar Flow</h4>
              <Badge variant="outline" className="mb-2">Re &lt; 2,300</Badge>
              <p className="text-xs text-muted-foreground">
                Smooth, orderly flow. Friction factor f = 64/Re
              </p>
            </div>
            <div className="p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
              <h4 className="font-medium text-sm mb-2">Transitional Flow</h4>
              <Badge variant="outline" className="mb-2">2,300 &lt; Re &lt; 4,000</Badge>
              <p className="text-xs text-muted-foreground">
                Unstable regime. Interpolation between laminar and turbulent.
              </p>
            </div>
            <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
              <h4 className="font-medium text-sm mb-2">Turbulent Flow</h4>
              <Badge variant="outline" className="mb-2">Re &gt; 4,000</Badge>
              <p className="text-xs text-muted-foreground">
                Chaotic flow. Use Colebrook-White equation.
              </p>
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
              <h4 className="font-medium text-sm mb-2">Reynolds Number</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Re = ρVD / μ = VD / ν
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Colebrook-White (Implicit)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                1/√f = -2 × log₁₀(ε/(3.7D) + 2.51/(Re×√f))
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Requires iterative solution (Newton-Raphson)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Swamee-Jain (Explicit)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re⁰·⁹)]²
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Explicit approximation, accurate within 1%
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Darcy-Weisbach Pressure Drop</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                ΔP = f × (L/D) × (ρV²/2)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipe Roughness */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Typical Pipe Roughness (ε)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Material</th>
                  <th className="text-center py-2">ε (mm)</th>
                  <th className="text-center py-2">ε (in)</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Drawn Tubing (Smooth)</td>
                  <td className="text-center">0.0015</td>
                  <td className="text-center">0.00006</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Commercial Steel (New)</td>
                  <td className="text-center">0.046</td>
                  <td className="text-center">0.0018</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Stainless Steel</td>
                  <td className="text-center">0.015</td>
                  <td className="text-center">0.0006</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Galvanized Steel</td>
                  <td className="text-center">0.15</td>
                  <td className="text-center">0.006</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Cast Iron</td>
                  <td className="text-center">0.26</td>
                  <td className="text-center">0.010</td>
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
            <li>• Crane Technical Paper No. 410</li>
            <li>• Moody, L.F. - Friction Factors for Pipe Flow (1944)</li>
            <li>• Swamee, P.K. and Jain, A.K. - Journal of Hydraulics Division (1976)</li>
            <li>• Colebrook, C.F. - Journal of the ICE (1939)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReynoldsGuide;
