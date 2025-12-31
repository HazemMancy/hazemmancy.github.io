import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Info } from 'lucide-react';

const GasFlowGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Gas Flow Converter Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This calculator converts between various gas flow rate units using the <strong>Ideal Gas Law</strong> 
            and real gas corrections via <strong>compressibility factor (Z)</strong>. Essential for process 
            engineering calculations when dealing with different flow measurement standards.
          </p>
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
              <h4 className="font-medium text-sm mb-2">Ideal Gas Law</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                PV = nRT  →  P × V = (m/MW) × R × T
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Real Gas Equation</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                PV = ZnRT  →  ρ = P × MW / (Z × R × T)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Flow Conversion</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Q_actual = Q_std × (P_std/P_act) × (T_act/T_std) × (Z_act/Z_std)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Mass Flow</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                ṁ = Q × ρ = Q × (P × MW) / (Z × R × T)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standard Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Standard Reference Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Standard</th>
                  <th className="text-center py-2 px-2">Temperature</th>
                  <th className="text-center py-2 px-2">Pressure</th>
                  <th className="text-left py-2 pl-2">Common Usage</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Normal (Nm³)</td>
                  <td className="text-center">0°C (273.15 K)</td>
                  <td className="text-center">101.325 kPa</td>
                  <td className="pl-2">Europe, ISO</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Standard (Sm³)</td>
                  <td className="text-center">15°C (288.15 K)</td>
                  <td className="text-center">101.325 kPa</td>
                  <td className="pl-2">Oil & Gas industry</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">SCF (US)</td>
                  <td className="text-center">60°F (15.56°C)</td>
                  <td className="text-center">14.696 psia</td>
                  <td className="pl-2">US petroleum</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">NTP (NIST)</td>
                  <td className="text-center">20°C (293.15 K)</td>
                  <td className="text-center">101.325 kPa</td>
                  <td className="pl-2">Laboratory</td>
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
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Always clarify the reference conditions when specifying gas flow rates</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Use compressibility factor (Z) for pressures &gt;5 bar or temperatures far from ambient</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Mass flow rate is independent of temperature and pressure - preferred for custody transfer</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Actual volumetric flow is needed for equipment sizing (velocity, pipe diameter)</span>
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
            <li>• ISO 13443 - Natural Gas Standard Reference Conditions</li>
            <li>• AGA Report No. 8 - Compressibility Factors</li>
            <li>• GPSA Engineering Data Book - Chapter 23</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default GasFlowGuide;
