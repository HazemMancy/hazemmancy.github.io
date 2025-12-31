import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Info } from 'lucide-react';

const PipingComponentsGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Piping Components Calculator Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Comprehensive reference tool for piping components per <strong>ASME B36.10M</strong> (pipe), 
            <strong> ASME B16.5</strong> (flanges), <strong>ASME B16.9</strong> (fittings), 
            <strong> MSS SP-44</strong> (pipe hangers), and <strong>ASME B31.1/B31.3</strong> (stress).
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Pipe Dimensions</Badge>
            <Badge variant="outline">Flanges</Badge>
            <Badge variant="outline">Fittings</Badge>
            <Badge variant="outline">Gaskets</Badge>
            <Badge variant="outline">Valves</Badge>
            <Badge variant="outline">Olets</Badge>
            <Badge variant="outline">SIF</Badge>
            <Badge variant="outline">Pipe Spans</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pipe Standards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Pipe Standards Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Standard</th>
                  <th className="text-left py-2">Scope</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">ASME B36.10M</td>
                  <td>Welded and Seamless Wrought Steel Pipe</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">ASME B36.19M</td>
                  <td>Stainless Steel Pipe</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">ASME B16.5</td>
                  <td>Pipe Flanges and Flanged Fittings (NPS ½-24)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">ASME B16.47</td>
                  <td>Large Diameter Steel Flanges (NPS 26-60)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">ASME B16.9</td>
                  <td>Factory-Made Wrought Butt-Welding Fittings</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">MSS SP-58</td>
                  <td>Pipe Hangers and Supports</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Key Calculations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Key Calculations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Pipe Wall Thickness (ASME B31.3)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                t = (P × D) / (2 × S × E + 2 × Y × P) + c
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Stress Intensification Factor (SIF)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                i = 0.9 / h^(2/3) for elbows, where h = tR/r²
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Maximum Pipe Support Span</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                L = √(0.4 × S × Z / w)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where S = allowable stress, Z = section modulus, w = weight per unit length
              </p>
            </div>
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
              <span>Use raised face flanges with spiral wound gaskets for general service</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>RTJ flanges for high-pressure (Class 900+) or high-temperature service</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Long radius elbows preferred for lower pressure drop and SIF</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Welding tees have lower SIF than fabricated branch connections</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Consider pipe span limits when routing - add supports as needed</span>
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
            <li>• ASME B31.1 - Power Piping</li>
            <li>• ASME B31.3 - Process Piping</li>
            <li>• ASME B36.10M / B36.19M - Pipe Dimensions</li>
            <li>• ASME B16.5 / B16.47 - Pipe Flanges</li>
            <li>• ASME B16.9 / B16.28 - Fittings</li>
            <li>• MSS SP-44 / SP-58 - Pipe Hangers</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PipingComponentsGuide;
