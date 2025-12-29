import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Star } from 'lucide-react';

interface SelectionGuideProps {
  flowRate: number; // m³/h actual
  compressionRatio: number;
  molecularWeight: number;
  dischargePressure: number; // bara
  gasType: string;
}

interface CompressorScore {
  type: string;
  name: string;
  score: number;
  flowMatch: number;
  ratioMatch: number;
  gasMatch: number;
  pressureMatch: number;
  recommended: boolean;
  pros: string[];
  cons: string[];
  typicalApplication: string;
}

const compressorCharacteristics = {
  centrifugal: {
    name: 'Centrifugal',
    minFlow: 500, // m³/h
    maxFlow: 500000,
    minRatio: 1.5,
    maxRatio: 4.0,
    maxPressure: 70, // bar
    suitableGases: ['air', 'nitrogen', 'oxygen', 'co2', 'naturalGas', 'refGas'],
    heavyGasOk: true,
    pros: ['High capacity', 'Continuous flow', 'Low maintenance', 'Oil-free option available'],
    cons: ['Surge at low flow', 'Lower efficiency at off-design', 'High initial cost'],
    application: 'Process gas, air separation, refrigeration, pipeline'
  },
  axial: {
    name: 'Axial',
    minFlow: 50000,
    maxFlow: 1500000,
    minRatio: 1.2,
    maxRatio: 2.0,
    maxPressure: 20,
    suitableGases: ['air', 'nitrogen', 'oxygen'],
    heavyGasOk: false,
    pros: ['Very high capacity', 'Highest efficiency', 'Compact for flow rate'],
    cons: ['Narrow operating range', 'Surge sensitive', 'Light gases only', 'Very high cost'],
    application: 'Large air separation, gas turbine inlet, blast furnace blowers'
  },
  reciprocating: {
    name: 'Reciprocating',
    minFlow: 10,
    maxFlow: 50000,
    minRatio: 1.5,
    maxRatio: 10.0,
    maxPressure: 700,
    suitableGases: ['air', 'nitrogen', 'oxygen', 'hydrogen', 'methane', 'ethane', 'propane', 'co2', 'ammonia', 'naturalGas', 'refGas'],
    heavyGasOk: true,
    pros: ['High pressure ratio', 'Wide flow range', 'Good part-load efficiency', 'Any gas'],
    cons: ['Pulsating flow', 'High maintenance', 'Vibration', 'Large footprint'],
    application: 'Hydrogen, process gas, CNG, high pressure applications'
  },
  screw: {
    name: 'Screw (Rotary)',
    minFlow: 100,
    maxFlow: 30000,
    minRatio: 2.0,
    maxRatio: 6.0,
    maxPressure: 25,
    suitableGases: ['air', 'nitrogen', 'co2', 'refGas'],
    heavyGasOk: true,
    pros: ['Continuous flow', 'Compact', 'Simple installation', 'Good reliability'],
    cons: ['Oil carryover (oil-flooded)', 'Lower efficiency', 'Noise', 'Limited pressure'],
    application: 'Plant air, refrigeration, process air, instrument air'
  },
  diaphragm: {
    name: 'Diaphragm',
    minFlow: 1,
    maxFlow: 5000,
    minRatio: 2.0,
    maxRatio: 10.0,
    maxPressure: 1000,
    suitableGases: ['hydrogen', 'oxygen', 'ammonia', 'co2'],
    heavyGasOk: true,
    pros: ['Zero leakage', 'Ultra-high purity', 'High pressure', 'Corrosive gas capable'],
    cons: ['Limited capacity', 'Diaphragm wear', 'High cost per flow', 'Pulsating'],
    application: 'Ultra-pure hydrogen, specialty gases, toxic/corrosive gases'
  }
};

const CompressorSelectionGuide: React.FC<SelectionGuideProps> = ({
  flowRate,
  compressionRatio,
  molecularWeight,
  dischargePressure,
  gasType
}) => {
  const scores = useMemo(() => {
    const results: CompressorScore[] = [];

    Object.entries(compressorCharacteristics).forEach(([type, char]) => {
      // Flow match (0-100)
      let flowMatch = 0;
      if (flowRate >= char.minFlow && flowRate <= char.maxFlow) {
        const flowCenter = Math.sqrt(char.minFlow * char.maxFlow);
        const flowRatio = flowRate / flowCenter;
        flowMatch = Math.max(0, 100 - Math.abs(Math.log10(flowRatio)) * 50);
      } else if (flowRate < char.minFlow) {
        flowMatch = Math.max(0, 50 * (flowRate / char.minFlow));
      } else {
        flowMatch = Math.max(0, 50 * (char.maxFlow / flowRate));
      }

      // Compression ratio match (0-100)
      let ratioMatch = 0;
      if (compressionRatio >= char.minRatio && compressionRatio <= char.maxRatio) {
        const ratioCenter = (char.minRatio + char.maxRatio) / 2;
        const ratioDeviation = Math.abs(compressionRatio - ratioCenter) / (char.maxRatio - char.minRatio);
        ratioMatch = Math.max(0, 100 - ratioDeviation * 60);
      } else if (compressionRatio < char.minRatio) {
        ratioMatch = Math.max(0, 40 * (compressionRatio / char.minRatio));
      } else {
        ratioMatch = Math.max(0, 40 * (char.maxRatio / compressionRatio));
      }

      // Gas compatibility match (0-100)
      let gasMatch = 50; // Default neutral
      if (char.suitableGases.includes(gasType)) {
        gasMatch = 100;
      } else if (gasType === 'custom') {
        // For custom gas, check MW
        if (molecularWeight < 10 && type !== 'reciprocating' && type !== 'diaphragm') {
          gasMatch = 30; // Light gas penalty for dynamic compressors
        } else if (molecularWeight > 40 && !char.heavyGasOk) {
          gasMatch = 40;
        } else {
          gasMatch = 70;
        }
      }

      // Pressure match (0-100)
      let pressureMatch = 100;
      if (dischargePressure > char.maxPressure) {
        pressureMatch = Math.max(0, 50 * (char.maxPressure / dischargePressure));
      }

      // Calculate overall score (weighted)
      const score = (
        flowMatch * 0.35 +
        ratioMatch * 0.30 +
        gasMatch * 0.20 +
        pressureMatch * 0.15
      );

      results.push({
        type,
        name: char.name,
        score,
        flowMatch,
        ratioMatch,
        gasMatch,
        pressureMatch,
        recommended: score >= 70,
        pros: char.pros,
        cons: char.cons,
        typicalApplication: char.application
      });
    });

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }, [flowRate, compressionRatio, molecularWeight, dischargePressure, gasType]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMatchIcon = (match: number) => {
    if (match >= 80) return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (match >= 50) return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    return <XCircle className="h-3 w-3 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Compressor Selection Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Based on your operating conditions: <strong>{flowRate.toFixed(0)} m³/h</strong> actual flow, 
            compression ratio <strong>{compressionRatio.toFixed(2)}</strong>, 
            discharge pressure <strong>{dischargePressure.toFixed(1)} bar</strong>
          </p>

          <div className="space-y-4">
            {scores.map((comp, idx) => (
              <div 
                key={comp.type}
                className={`p-4 rounded-lg border transition-all ${
                  idx === 0 
                    ? 'border-primary bg-primary/5' 
                    : comp.recommended 
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-border bg-muted/20'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Star className="h-4 w-4 text-primary fill-primary" />}
                    <h4 className="font-semibold">{comp.name}</h4>
                    {comp.recommended && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <div className={`text-lg font-bold ${getScoreColor(comp.score)}`}>
                    {comp.score.toFixed(0)}%
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {getMatchIcon(comp.flowMatch)}
                      <span className="text-xs text-muted-foreground">Flow</span>
                    </div>
                    <Progress value={comp.flowMatch} className={`h-1 ${getScoreBg(comp.flowMatch)}`} />
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {getMatchIcon(comp.ratioMatch)}
                      <span className="text-xs text-muted-foreground">Ratio</span>
                    </div>
                    <Progress value={comp.ratioMatch} className={`h-1 ${getScoreBg(comp.ratioMatch)}`} />
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {getMatchIcon(comp.gasMatch)}
                      <span className="text-xs text-muted-foreground">Gas</span>
                    </div>
                    <Progress value={comp.gasMatch} className={`h-1 ${getScoreBg(comp.gasMatch)}`} />
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {getMatchIcon(comp.pressureMatch)}
                      <span className="text-xs text-muted-foreground">Pressure</span>
                    </div>
                    <Progress value={comp.pressureMatch} className={`h-1 ${getScoreBg(comp.pressureMatch)}`} />
                  </div>
                </div>

                {/* Pros and Cons */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-green-600 font-medium mb-1">Advantages</p>
                    <ul className="space-y-0.5">
                      {comp.pros.slice(0, 3).map((pro, i) => (
                        <li key={i} className="text-muted-foreground flex items-start gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-red-600 font-medium mb-1">Limitations</p>
                    <ul className="space-y-0.5">
                      {comp.cons.slice(0, 3).map((con, i) => (
                        <li key={i} className="text-muted-foreground flex items-start gap-1">
                          <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Application */}
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  <strong>Typical:</strong> {comp.typicalApplication}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Selection Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2">Type</th>
                  <th className="text-center py-2 px-2">Flow Range</th>
                  <th className="text-center py-2 px-2">Ratio Range</th>
                  <th className="text-center py-2 px-2">Max Press.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(compressorCharacteristics).map(([type, char]) => (
                  <tr key={type} className="border-b border-border/50">
                    <td className="py-2 pr-2 font-medium">{char.name}</td>
                    <td className="text-center py-2 px-2 text-muted-foreground">
                      {char.minFlow.toLocaleString()}-{char.maxFlow.toLocaleString()} m³/h
                    </td>
                    <td className="text-center py-2 px-2 text-muted-foreground">
                      {char.minRatio}-{char.maxRatio}
                    </td>
                    <td className="text-center py-2 px-2 text-muted-foreground">
                      {char.maxPressure} bar
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompressorSelectionGuide;
