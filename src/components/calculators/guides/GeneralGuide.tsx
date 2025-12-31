import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Calculator, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface GeneralGuideProps {
  title: string;
  description: string;
  standards?: string[];
  equations?: Array<{
    name: string;
    formula: string;
    description?: string;
  }>;
  guidelines?: string[];
  references?: string[];
}

const GeneralGuide: React.FC<GeneralGuideProps> = ({
  title,
  description,
  standards = [],
  equations = [],
  guidelines = [],
  references = []
}) => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          
          {standards.length > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-sm mb-2">Applicable Standards</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {standards.map((std, idx) => (
                  <li key={idx}>• {std}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Equations */}
      {equations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Key Equations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {equations.map((eq, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-sm mb-2">{eq.name}</h4>
                <p className="text-xs font-mono bg-background/60 p-2 rounded">
                  {eq.formula}
                </p>
                {eq.description && (
                  <p className="text-xs text-muted-foreground mt-2">{eq.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      {guidelines.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Design Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-2">
              {guidelines.map((guideline, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{guideline}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* References */}
      {references.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1">
              {references.map((ref, idx) => (
                <li key={idx}>• {ref}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GeneralGuide;
