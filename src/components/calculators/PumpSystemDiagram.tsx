import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface PumpSystemDiagramProps {
  suctionHead: string;
  dischargeHead: string;
  suctionLength: string;
  dischargeLength: string;
  suctionDia: string;
  dischargeDia: string;
  suctionDiaMM: number;
  dischargeDiaMM: number;
  flowRate: string;
  flowRateUnit: string;
  totalHead: number;
  npsha: number;
  hydraulicPower: number;
  brakePower: number;
  suctionVelocity: number;
  dischargeVelocity: number;
  unitSystem: "metric" | "imperial";
  headUnit: string;
  lengthUnit: string;
  recommendedSuctionDia?: string;
  recommendedDischargeDia?: string;
}

const PumpSystemDiagram = ({
  suctionHead, dischargeHead, suctionLength, dischargeLength,
  suctionDia, dischargeDia, suctionDiaMM, dischargeDiaMM,
  flowRate, flowRateUnit, totalHead, npsha, hydraulicPower, brakePower,
  suctionVelocity, dischargeVelocity, unitSystem,
  headUnit, lengthUnit,
  recommendedSuctionDia, recommendedDischargeDia,
}: PumpSystemDiagramProps) => {
  const npshaColor = npsha > 3 ? "text-green-600" : npsha > 1 ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative w-full bg-gradient-to-b from-muted/20 via-background to-muted/30 rounded-xl border-2 border-border/50 p-4 overflow-hidden">
      {/* Title */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-foreground/80 tracking-wide uppercase">System Overview</h3>
        <Badge variant="outline" className="text-[10px]">{flowRate} {flowRateUnit}</Badge>
      </div>

      <svg viewBox="0 0 800 320" className="w-full h-auto" style={{ minHeight: 200, maxHeight: 320 }}>
        <defs>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(200,80%,60%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(200,80%,40%)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="pumpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
          </linearGradient>
          <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(200,80%,50%)" />
          </marker>
          <marker id="arrowOrange" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(25,90%,55%)" />
          </marker>
        </defs>

        {/* Source Tank */}
        <rect x="20" y="160" width="100" height="100" rx="6" fill="url(#waterGrad)" stroke="hsl(200,60%,50%)" strokeWidth="2" />
        <text x="70" y="215" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">Source</text>
        {/* Water level lines */}
        <line x1="30" y1="180" x2="110" y2="180" stroke="hsl(200,60%,60%)" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
        <line x1="30" y1="195" x2="110" y2="195" stroke="hsl(200,60%,60%)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />

        {/* Suction Pipe (horizontal from tank to pump) */}
        <line x1="120" y1="220" x2="330" y2="220" stroke="hsl(200,70%,50%)" strokeWidth="4" markerEnd="url(#arrowBlue)" />
        {/* Suction label group */}
        <rect x="155" y="228" width="120" height="42" rx="4" fill="hsl(200,90%,95%)" stroke="hsl(200,60%,70%)" strokeWidth="1" opacity="0.95" />
        <text x="215" y="243" textAnchor="middle" fontSize="9" fontWeight="700" fill="hsl(200,70%,40%)">SUCTION</text>
        <text x="215" y="255" textAnchor="middle" fontSize="8" fill="hsl(200,50%,35%)">
          L={suctionLength}{lengUnit(unitSystem)} · Ø{suctionDia}" ({suctionDiaMM.toFixed(0)}mm)
        </text>
        <text x="215" y="266" textAnchor="middle" fontSize="8" fill="hsl(200,50%,35%)">
          v={suctionVelocity.toFixed(2)} m/s
        </text>

        {/* Suction Static Head Arrow */}
        <line x1="135" y1="165" x2="135" y2="220" stroke="hsl(200,70%,50%)" strokeWidth="1.5" strokeDasharray="4,2" />
        <line x1="130" y1="165" x2="140" y2="165" stroke="hsl(200,70%,50%)" strokeWidth="1.5" />
        <line x1="130" y1="220" x2="140" y2="220" stroke="hsl(200,70%,50%)" strokeWidth="1.5" />
        <text x="148" y="195" fontSize="9" fontWeight="600" fill="hsl(200,70%,40%)">
          hs={suctionHead} {headUnit}
        </text>

        {/* Pump Symbol (circle with impeller) */}
        <circle cx="370" cy="220" r="35" fill="url(#pumpGrad)" stroke="hsl(var(--primary))" strokeWidth="2.5" />
        <text x="370" y="216" textAnchor="middle" fontSize="10" fontWeight="800" fill="white">PUMP</text>
        <text x="370" y="228" textAnchor="middle" fontSize="7" fill="white" opacity="0.9">
          TDH: {totalHead.toFixed(1)} m
        </text>

        {/* Discharge Pipe (from pump going up then right) */}
        <line x1="405" y1="220" x2="405" y2="80" stroke="hsl(25,85%,55%)" strokeWidth="4" />
        <line x1="405" y1="80" x2="700" y2="80" stroke="hsl(25,85%,55%)" strokeWidth="4" markerEnd="url(#arrowOrange)" />

        {/* Discharge label group */}
        <rect x="490" y="88" width="120" height="42" rx="4" fill="hsl(25,90%,95%)" stroke="hsl(25,60%,70%)" strokeWidth="1" opacity="0.95" />
        <text x="550" y="103" textAnchor="middle" fontSize="9" fontWeight="700" fill="hsl(25,70%,40%)">DISCHARGE</text>
        <text x="550" y="115" textAnchor="middle" fontSize="8" fill="hsl(25,50%,35%)">
          L={dischargeLength}{lengUnit(unitSystem)} · Ø{dischargeDia}" ({dischargeDiaMM.toFixed(0)}mm)
        </text>
        <text x="550" y="126" textAnchor="middle" fontSize="8" fill="hsl(25,50%,35%)">
          v={dischargeVelocity.toFixed(2)} m/s
        </text>

        {/* Discharge Static Head Arrow */}
        <line x1="420" y1="80" x2="420" y2="220" stroke="hsl(25,85%,55%)" strokeWidth="1.5" strokeDasharray="4,2" />
        <line x1="415" y1="80" x2="425" y2="80" stroke="hsl(25,85%,55%)" strokeWidth="1.5" />
        <line x1="415" y1="220" x2="425" y2="220" stroke="hsl(25,85%,55%)" strokeWidth="1.5" />
        <text x="432" y="155" fontSize="9" fontWeight="600" fill="hsl(25,70%,40%)">
          hd={dischargeHead} {headUnit}
        </text>

        {/* Destination Tank */}
        <rect x="710" y="40" width="70" height="80" rx="6" fill="url(#waterGrad)" stroke="hsl(200,60%,50%)" strokeWidth="2" />
        <text x="745" y="85" textAnchor="middle" className="fill-foreground" fontSize="10" fontWeight="600">Dest.</text>

        {/* Key Results Strip */}
        <rect x="20" y="285" width="760" height="28" rx="6" fill="hsl(var(--primary))" fillOpacity="0.08" stroke="hsl(var(--primary))" strokeOpacity="0.2" strokeWidth="1" />
        <text x="110" y="303" textAnchor="middle" fontSize="9" fontWeight="600" className="fill-foreground">
          TDH: {totalHead.toFixed(2)} m
        </text>
        <text x="280" y="303" textAnchor="middle" fontSize="9" fontWeight="600" className={npshaColor}>
          NPSHa: {npsha.toFixed(2)} m
        </text>
        <text x="450" y="303" textAnchor="middle" fontSize="9" fontWeight="600" fill="hsl(200,70%,50%)">
          P_hyd: {hydraulicPower.toFixed(2)} kW
        </text>
        <text x="630" y="303" textAnchor="middle" fontSize="9" fontWeight="600" fill="hsl(25,70%,50%)">
          P_brake: {brakePower.toFixed(2)} kW
        </text>
      </svg>

      {/* Recommended Diameter Badges */}
      {(recommendedSuctionDia || recommendedDischargeDia) && (
        <div className="flex flex-wrap gap-3 mt-3">
          {recommendedSuctionDia && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                💡 Recommended suction: <strong>{recommendedSuctionDia}"</strong>
              </span>
            </div>
          )}
          {recommendedDischargeDia && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
                💡 Recommended discharge: <strong>{recommendedDischargeDia}"</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper for length unit abbreviation
const lengUnit = (us: string) => us === "metric" ? "m" : "ft";

export default PumpSystemDiagram;
