import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TubeBundleVisualizationProps {
  shellDiameter: number; // mm
  tubeOD: number; // mm
  tubePitch: number; // mm
  numberOfTubes: number;
  tubePattern: "triangular" | "square" | "rotatedSquare";
  tubePasses: number;
  baffleCut: number; // percentage
}

// Standard tube size labels
const getTubeSizeLabel = (tubeOD: number): string => {
  if (Math.abs(tubeOD - 15.88) < 0.5) return '5/8"';
  if (Math.abs(tubeOD - 19.05) < 0.5) return '3/4"';
  if (Math.abs(tubeOD - 25.4) < 0.5) return '1"';
  if (Math.abs(tubeOD - 31.75) < 0.5) return '1-1/4"';
  if (Math.abs(tubeOD - 38.1) < 0.5) return '1-1/2"';
  return `${tubeOD.toFixed(1)}mm`;
};

// Get pitch label
const getPitchLabel = (tubePitch: number): string => {
  if (Math.abs(tubePitch - 20.64) < 0.5) return '13/16"';
  if (Math.abs(tubePitch - 22.23) < 0.5) return '7/8"';
  if (Math.abs(tubePitch - 23.81) < 0.5) return '15/16"';
  if (Math.abs(tubePitch - 25.4) < 0.5) return '1"';
  if (Math.abs(tubePitch - 31.75) < 0.5) return '1-1/4"';
  if (Math.abs(tubePitch - 33.34) < 0.5) return '1-5/16"';
  if (Math.abs(tubePitch - 39.69) < 0.5) return '1-9/16"';
  if (Math.abs(tubePitch - 47.63) < 0.5) return '1-7/8"';
  if (Math.abs(tubePitch - 50.8) < 0.5) return '2"';
  return `${tubePitch.toFixed(1)}mm`;
};

// Generate tube positions for visualization
export function generateTubePositions(
  shellDiameter: number,
  tubeOD: number,
  tubePitch: number,
  numberOfTubes: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number
): { x: number; y: number; pass: number }[] {
  const positions: { x: number; y: number; pass: number }[] = [];
  const shellRadius = shellDiameter / 2;
  const maxTubesFromArea = Math.min(numberOfTubes, 500);

  if (tubePattern === "triangular") {
    const rowSpacing = tubePitch * Math.sqrt(3) / 2;
    let tubeCount = 0;
    let row = 0;
    
    while (tubeCount < maxTubesFromArea) {
      const yOffset = row * rowSpacing;
      const xOffset = (row % 2) * (tubePitch / 2);
      
      const maxY = Math.abs(yOffset);
      if (maxY > shellRadius - tubeOD / 2) break;
      
      const chordHalf = Math.sqrt(Math.pow(shellRadius - tubeOD / 2 - 5, 2) - yOffset * yOffset);
      const tubesInRow = Math.floor((2 * chordHalf) / tubePitch);
      
      for (let i = 0; i <= tubesInRow && tubeCount < maxTubesFromArea; i++) {
        const x = (i - tubesInRow / 2) * tubePitch + xOffset;
        const y = yOffset;
        
        const distFromCenter = Math.sqrt(x * x + y * y);
        if (distFromCenter <= shellRadius - tubeOD / 2 - 3) {
          let pass = 1;
          if (tubePasses === 2) {
            pass = y >= 0 ? 1 : 2;
          } else if (tubePasses === 4) {
            if (x >= 0 && y >= 0) pass = 1;
            else if (x < 0 && y >= 0) pass = 2;
            else if (x < 0 && y < 0) pass = 3;
            else pass = 4;
          }
          positions.push({ x, y, pass });
          tubeCount++;
        }
      }
      
      if (row > 0) {
        for (let i = 0; i <= tubesInRow && tubeCount < maxTubesFromArea; i++) {
          const x = (i - tubesInRow / 2) * tubePitch + xOffset;
          const y = -yOffset;
          
          const distFromCenter = Math.sqrt(x * x + y * y);
          if (distFromCenter <= shellRadius - tubeOD / 2 - 3) {
            let pass = 1;
            if (tubePasses === 2) {
              pass = y >= 0 ? 1 : 2;
            } else if (tubePasses === 4) {
              if (x >= 0 && y >= 0) pass = 1;
              else if (x < 0 && y >= 0) pass = 2;
              else if (x < 0 && y < 0) pass = 3;
              else pass = 4;
            }
            positions.push({ x, y, pass });
            tubeCount++;
          }
        }
      }
      row++;
      if (row > 100) break;
    }
  } else {
    let tubeCount = 0;
    const halfRows = Math.ceil(shellRadius / tubePitch);
    
    for (let i = -halfRows; i <= halfRows && tubeCount < maxTubesFromArea; i++) {
      for (let j = -halfRows; j <= halfRows && tubeCount < maxTubesFromArea; j++) {
        let x: number, y: number;
        
        if (tubePattern === "rotatedSquare") {
          x = (i + j) * tubePitch / Math.sqrt(2);
          y = (i - j) * tubePitch / Math.sqrt(2);
        } else {
          x = i * tubePitch;
          y = j * tubePitch;
        }
        
        const distFromCenter = Math.sqrt(x * x + y * y);
        if (distFromCenter <= shellRadius - tubeOD / 2 - 3) {
          let pass = 1;
          if (tubePasses === 2) {
            pass = y >= 0 ? 1 : 2;
          } else if (tubePasses === 4) {
            if (x >= 0 && y >= 0) pass = 1;
            else if (x < 0 && y >= 0) pass = 2;
            else if (x < 0 && y < 0) pass = 3;
            else pass = 4;
          }
          positions.push({ x, y, pass });
          tubeCount++;
        }
      }
    }
  }
  
  return positions.slice(0, numberOfTubes);
}

// Generate SVG string for export (PDF/Excel)
export function generateTubeBundleSVG(
  shellDiameter: number,
  tubeOD: number,
  tubePitch: number,
  numberOfTubes: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number,
  baffleCut: number,
  size: number = 200
): string {
  const padding = 10;
  const viewBoxSize = size + padding * 2;
  const shellRadius = shellDiameter / 2;
  const scale = (size / 2 - 5) / shellRadius;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  
  const positions = generateTubePositions(shellDiameter, tubeOD, tubePitch, numberOfTubes, tubePattern, tubePasses);
  const tubeRadius = Math.max(1.5, (tubeOD / 2) * scale * 0.9);
  const passColors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"];
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${viewBoxSize}" height="${viewBoxSize}">`;
  
  // Shell circle
  svg += `<circle cx="${centerX}" cy="${centerY}" r="${size / 2}" fill="none" stroke="#666" stroke-width="2"/>`;
  
  // Pass divider lines
  if (tubePasses >= 2) {
    svg += `<line x1="${padding + 3}" y1="${centerY}" x2="${viewBoxSize - padding - 3}" y2="${centerY}" stroke="#999" stroke-width="0.5" stroke-dasharray="3 2"/>`;
  }
  if (tubePasses >= 4) {
    svg += `<line x1="${centerX}" y1="${padding + 3}" x2="${centerX}" y2="${viewBoxSize - padding - 3}" stroke="#999" stroke-width="0.5" stroke-dasharray="3 2"/>`;
  }
  
  // Tubes
  positions.forEach(pos => {
    const x = centerX + pos.x * scale;
    const y = centerY + pos.y * scale;
    svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${tubeRadius.toFixed(1)}" fill="${passColors[pos.pass - 1]}" stroke="#fff" stroke-width="0.3"/>`;
  });
  
  // Center reference
  svg += `<circle cx="${centerX}" cy="${centerY}" r="2" fill="#666"/>`;
  
  svg += '</svg>';
  return svg;
}

const TubeBundleVisualization = ({
  shellDiameter,
  tubeOD,
  tubePitch,
  numberOfTubes,
  tubePattern,
  tubePasses,
  baffleCut
}: TubeBundleVisualizationProps) => {
  const svgSize = 300;
  const padding = 20;
  const viewBoxSize = svgSize + padding * 2;
  
  const tubePositions = useMemo(() => {
    const shellRadius = shellDiameter / 2;
    const scale = (svgSize / 2 - 10) / shellRadius;
    const centerX = viewBoxSize / 2;
    const centerY = viewBoxSize / 2;
    
    const positions = generateTubePositions(shellDiameter, tubeOD, tubePitch, numberOfTubes, tubePattern, tubePasses);
    
    return positions.map(pos => ({
      x: centerX + pos.x * scale,
      y: centerY + pos.y * scale,
      pass: pos.pass
    }));
  }, [shellDiameter, tubeOD, tubePitch, numberOfTubes, tubePattern, tubePasses, svgSize, viewBoxSize]);
  
  const tubeRadius = useMemo(() => {
    const shellRadius = shellDiameter / 2;
    const scale = (svgSize / 2 - 10) / shellRadius;
    return Math.max(2, (tubeOD / 2) * scale * 0.9);
  }, [shellDiameter, tubeOD]);
  
  const passColors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"];
  const tubeSizeLabel = getTubeSizeLabel(tubeOD);
  const pitchLabel = getPitchLabel(tubePitch);
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-2">
          <span>Tube Bundle Cross-Section</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-normal">
              {tubeSizeLabel} OD
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {pitchLabel} Pitch
            </Badge>
            <span className="text-xs font-normal text-muted-foreground">
              {tubePositions.length} tubes
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <svg 
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
          className="w-full max-w-[300px] h-auto"
        >
          {/* Shell circle */}
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={svgSize / 2}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="3"
          />
          
          {/* Baffle cut indicator */}
          <path
            d={`M ${viewBoxSize / 2 - svgSize / 2} ${viewBoxSize / 2 - svgSize * (1 - 2 * baffleCut / 100) / 2}
                A ${svgSize / 2} ${svgSize / 2} 0 0 0 
                ${viewBoxSize / 2 - svgSize / 2} ${viewBoxSize / 2 + svgSize * (1 - 2 * baffleCut / 100) / 2}`}
            fill="none"
            stroke="hsl(var(--primary) / 0.3)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Pass divider lines */}
          {tubePasses >= 2 && (
            <line
              x1={viewBoxSize / 2 - svgSize / 2 + 5}
              y1={viewBoxSize / 2}
              x2={viewBoxSize / 2 + svgSize / 2 - 5}
              y2={viewBoxSize / 2}
              stroke="hsl(var(--muted-foreground) / 0.3)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}
          {tubePasses >= 4 && (
            <line
              x1={viewBoxSize / 2}
              y1={viewBoxSize / 2 - svgSize / 2 + 5}
              x2={viewBoxSize / 2}
              y2={viewBoxSize / 2 + svgSize / 2 - 5}
              stroke="hsl(var(--muted-foreground) / 0.3)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}
          
          {/* Tubes */}
          {tubePositions.map((tube, index) => (
            <circle
              key={index}
              cx={tube.x}
              cy={tube.y}
              r={tubeRadius}
              fill={passColors[tube.pass - 1]}
              stroke="hsl(var(--background))"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Center reference */}
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r="3"
            fill="hsl(var(--muted-foreground))"
          />
        </svg>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          {tubePasses >= 1 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: passColors[0] }} />
              <span className="text-muted-foreground">Pass 1</span>
            </div>
          )}
          {tubePasses >= 2 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: passColors[1] }} />
              <span className="text-muted-foreground">Pass 2</span>
            </div>
          )}
          {tubePasses >= 4 && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: passColors[2] }} />
                <span className="text-muted-foreground">Pass 3</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: passColors[3] }} />
                <span className="text-muted-foreground">Pass 4</span>
              </div>
            </>
          )}
        </div>
        
        {/* Tube Specifications */}
        <div className="mt-3 w-full p-2 rounded bg-muted/30 text-xs">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tube OD:</span>
              <span className="font-mono">{tubeSizeLabel} ({tubeOD.toFixed(2)} mm)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pitch:</span>
              <span className="font-mono">{pitchLabel} ({tubePitch.toFixed(2)} mm)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pattern:</span>
              <span>{tubePattern === "triangular" ? "Triangular 30°" : tubePattern === "square" ? "Square 90°" : "Rotated 45°"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shell ID:</span>
              <span className="font-mono">{shellDiameter.toFixed(0)} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passes:</span>
              <span>{tubePasses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Baffle Cut:</span>
              <span>{baffleCut}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TubeBundleVisualization;
