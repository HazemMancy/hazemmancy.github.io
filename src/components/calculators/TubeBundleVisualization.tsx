import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TubeBundleVisualizationProps {
  shellDiameter: number; // mm
  tubeOD: number; // mm
  tubePitch: number; // mm
  numberOfTubes: number;
  tubePattern: "triangular" | "square" | "rotatedSquare";
  tubePasses: number;
  baffleCut: number; // percentage
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
    const positions: { x: number; y: number; pass: number }[] = [];
    const shellRadius = shellDiameter / 2;
    const scale = (svgSize / 2 - 10) / shellRadius;
    const centerX = viewBoxSize / 2;
    const centerY = viewBoxSize / 2;
    
    // Maximum tubes that can fit based on area calculation
    const maxTubesFromArea = Math.min(numberOfTubes, 500); // Limit for performance
    
    // Generate tube positions based on pattern
    if (tubePattern === "triangular") {
      // Triangular pitch layout (60° arrangement)
      const rowSpacing = tubePitch * Math.sqrt(3) / 2;
      let tubeCount = 0;
      let row = 0;
      
      while (tubeCount < maxTubesFromArea) {
        const yOffset = row * rowSpacing;
        const xOffset = (row % 2) * (tubePitch / 2);
        
        // Calculate tubes in this row based on chord length
        const maxY = Math.abs(yOffset);
        if (maxY > shellRadius - tubeOD / 2) break;
        
        const chordHalf = Math.sqrt(Math.pow(shellRadius - tubeOD / 2 - 5, 2) - yOffset * yOffset);
        const tubesInRow = Math.floor((2 * chordHalf) / tubePitch);
        
        for (let i = 0; i <= tubesInRow && tubeCount < maxTubesFromArea; i++) {
          const x = (i - tubesInRow / 2) * tubePitch + xOffset;
          const y = yOffset;
          
          // Check if within shell
          const distFromCenter = Math.sqrt(x * x + y * y);
          if (distFromCenter <= shellRadius - tubeOD / 2 - 3) {
            // Determine pass based on position
            let pass = 1;
            if (tubePasses === 2) {
              pass = y >= 0 ? 1 : 2;
            } else if (tubePasses === 4) {
              if (x >= 0 && y >= 0) pass = 1;
              else if (x < 0 && y >= 0) pass = 2;
              else if (x < 0 && y < 0) pass = 3;
              else pass = 4;
            }
            
            positions.push({
              x: centerX + x * scale,
              y: centerY + y * scale,
              pass
            });
            tubeCount++;
          }
        }
        
        // Mirror for negative y (except row 0)
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
              
              positions.push({
                x: centerX + x * scale,
                y: centerY + y * scale,
                pass
              });
              tubeCount++;
            }
          }
        }
        row++;
        if (row > 100) break; // Safety limit
      }
    } else {
      // Square pitch layout (90° arrangement)
      let tubeCount = 0;
      const halfRows = Math.ceil(shellRadius / tubePitch);
      
      for (let i = -halfRows; i <= halfRows && tubeCount < maxTubesFromArea; i++) {
        for (let j = -halfRows; j <= halfRows && tubeCount < maxTubesFromArea; j++) {
          let x: number, y: number;
          
          if (tubePattern === "rotatedSquare") {
            // 45° rotated square
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
            
            positions.push({
              x: centerX + x * scale,
              y: centerY + y * scale,
              pass
            });
            tubeCount++;
          }
        }
      }
    }
    
    return positions.slice(0, numberOfTubes);
  }, [shellDiameter, tubeOD, tubePitch, numberOfTubes, tubePattern, tubePasses]);
  
  const tubeRadius = useMemo(() => {
    const shellRadius = shellDiameter / 2;
    const scale = (svgSize / 2 - 10) / shellRadius;
    return Math.max(2, (tubeOD / 2) * scale * 0.9);
  }, [shellDiameter, tubeOD]);
  
  const passColors = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"];
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Tube Bundle Cross-Section</span>
          <span className="text-xs font-normal text-muted-foreground">
            {tubePositions.length} tubes shown
          </span>
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
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          <span>Pattern: {tubePattern === "triangular" ? "Triangular 30°" : tubePattern === "square" ? "Square 90°" : "Rotated Square 45°"}</span>
          <span className="mx-2">•</span>
          <span>Baffle Cut: {baffleCut}%</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TubeBundleVisualization;
