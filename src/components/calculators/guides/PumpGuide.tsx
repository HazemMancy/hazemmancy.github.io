import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Gauge, Info } from 'lucide-react';

const PumpGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Pump Sizing Calculator Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This calculator performs comprehensive pump sizing per <strong>API 610</strong> (Centrifugal Pumps), 
            <strong> API 674</strong> (Positive Displacement Pumps), and <strong>API 676</strong> (Rotary Pumps). 
            Hydraulic calculations follow <strong>Crane TP-410</strong> methodology.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Gauge className="h-4 w-4 text-primary" />
                Hydraulic Analysis
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Total Dynamic Head (TDH)</li>
                <li>• NPSHa calculation</li>
                <li>• Suction/discharge losses</li>
                <li>• Fitting K-factor method</li>
              </ul>
            </div>
            <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4" />
                Pump Selection
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Specific speed calculation</li>
                <li>• Suction specific speed</li>
                <li>• Pump type recommendation</li>
                <li>• Power requirements</li>
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
            Key Equations (API 610 / Crane TP-410)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Total Dynamic Head (TDH)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                TDH = (P₂ - P₁)/(ρg) + (Z₂ - Z₁) + hf_suction + hf_discharge + (V₂² - V₁²)/(2g)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: P = pressure, ρ = density, Z = elevation, hf = friction head loss, V = velocity
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Net Positive Suction Head Available (NPSHa)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                NPSHa = (P_source - P_vapor)/(ρg) + Z_source - hf_suction - V²/(2g)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Must exceed NPSHr by margin (typically NPSHa &gt; 1.3 × NPSHr or NPSHa - NPSHr &gt; 1m)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Friction Head Loss (Darcy-Weisbach)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                hf = f × (L/D) × (V²/2g) + Σ(K × V²/2g)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: f = Darcy friction factor, L = length, D = diameter, K = fitting loss coefficient
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Hydraulic Power</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                P_hyd = ρ × g × Q × TDH / 1000 [kW]
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Shaft Power</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                P_shaft = P_hyd / η_pump [kW]
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Specific Speed (Ns)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Ns = N × Q^0.5 / H^0.75
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where: N = speed (rpm), Q = flow (m³/s or gpm), H = head (m or ft)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Suction Specific Speed (Nss)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Nss = N × Q^0.5 / NPSHr^0.75
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                API 610 limit: Nss ≤ 11,000 (US units) for reliable operation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pump Type Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Pump Type Selection by Specific Speed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Pump Type</th>
                  <th className="text-center py-2 px-2">Ns Range (Metric)</th>
                  <th className="text-center py-2 px-2">Ns Range (US)</th>
                  <th className="text-center py-2 px-2">Typical η</th>
                  <th className="text-left py-2 pl-2">Application</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Radial Flow</td>
                  <td className="text-center">10-35</td>
                  <td className="text-center">500-1,800</td>
                  <td className="text-center">75-85%</td>
                  <td className="pl-2">High head, low flow</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Francis Vane</td>
                  <td className="text-center">35-80</td>
                  <td className="text-center">1,800-4,000</td>
                  <td className="text-center">80-90%</td>
                  <td className="pl-2">Medium head/flow</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Mixed Flow</td>
                  <td className="text-center">80-160</td>
                  <td className="text-center">4,000-8,000</td>
                  <td className="text-center">85-92%</td>
                  <td className="pl-2">Low head, high flow</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Axial Flow</td>
                  <td className="text-center">&gt;160</td>
                  <td className="text-center">&gt;8,000</td>
                  <td className="text-center">80-88%</td>
                  <td className="pl-2">Very low head, very high flow</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Design Guidelines */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Design Guidelines per API 610
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">NPSH Requirements</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>NPSHa margin over NPSHr</span>
                  <Badge variant="outline">≥1.0 m or 1.3×</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Nss limit (API 610)</span>
                  <Badge variant="outline">≤11,000</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Operating Limits</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Min continuous flow</span>
                  <Badge variant="outline">25-50% BEP</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Max continuous flow</span>
                  <Badge variant="outline">120% BEP</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-xs">
                  <span>Preferred operating region</span>
                  <Badge variant="outline">70-120% BEP</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Suction piping should be sized for velocity ≤1.5 m/s (boiling) or ≤2.5 m/s (sub-cooled)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Discharge piping typically sized for 3-5 m/s maximum velocity</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Use eccentric reducer (flat on top) at pump suction to prevent vapor accumulation</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Provide 5-10 pipe diameters of straight run before pump suction</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fitting K-Factors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Common Fitting K-Factors (Crane TP-410)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Fitting</th>
                  <th className="text-center py-2 px-2">K Factor</th>
                  <th className="text-left py-2 pl-2">Notes</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">90° Long Radius Elbow</td>
                  <td className="text-center">0.23</td>
                  <td className="pl-2">r/d = 1.5</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">90° Standard Elbow</td>
                  <td className="text-center">0.30</td>
                  <td className="pl-2">r/d = 1.0</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">45° Elbow</td>
                  <td className="text-center">0.17</td>
                  <td className="pl-2">-</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Tee (Flow Through)</td>
                  <td className="text-center">0.20</td>
                  <td className="pl-2">Straight through</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Tee (Flow Branch)</td>
                  <td className="text-center">1.00</td>
                  <td className="pl-2">Into/from branch</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Gate Valve (Full Open)</td>
                  <td className="text-center">0.10</td>
                  <td className="pl-2">-</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Globe Valve</td>
                  <td className="text-center">4.0-6.0</td>
                  <td className="pl-2">Flow direction dependent</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">Check Valve (Swing)</td>
                  <td className="text-center">2.0</td>
                  <td className="pl-2">-</td>
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
            <li>• API 610 - Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries</li>
            <li>• API 674 - Positive Displacement Pumps - Reciprocating</li>
            <li>• API 676 - Positive Displacement Pumps - Rotary</li>
            <li>• Crane Technical Paper No. 410 - Flow of Fluids Through Valves, Fittings, and Pipe</li>
            <li>• Hydraulic Institute Standards</li>
            <li>• Karassik, I.J. - Pump Handbook</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PumpGuide;
