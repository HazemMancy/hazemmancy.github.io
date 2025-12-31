import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Info } from 'lucide-react';

const GasMixingGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Gas Mixing Calculator Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This calculator computes mixture properties for multi-component gas systems using 
            <strong> Kay's mixing rules</strong> and <strong>Lee-Kesler correlations</strong> for 
            pseudo-critical properties and compressibility factors.
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
              <h4 className="font-medium text-sm mb-2">Mixture Molecular Weight</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                MW_mix = Σ (y_i × MW_i)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Kay's Mixing Rule (Pseudo-critical Properties)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Tc_pc = Σ (y_i × Tc_i), Pc_pc = Σ (y_i × Pc_i)
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Mixture Cp/Cv (Specific Heat Ratio)</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                k_mix = Cp_mix / Cv_mix
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Lee-Kesler Compressibility</h4>
              <p className="text-xs font-mono bg-background/60 p-2 rounded">
                Z = Z⁰ + ω × Z¹
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Where Z⁰ is simple fluid contribution and Z¹ is acentric factor correction
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
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Ensure mole fractions sum to 100%</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Kay's rule works well for hydrocarbon mixtures of similar molecules</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>For polar/non-polar mixtures, use more rigorous mixing rules</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>High-pressure applications may require equation of state calculations</span>
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
            <li>• GPSA Engineering Data Book - Chapter 23 (Physical Properties)</li>
            <li>• Lee, B.I. and Kesler, M.G. - AIChE Journal (1975)</li>
            <li>• Kay, W.B. - Density of Hydrocarbon Gases and Vapors (1936)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default GasMixingGuide;
