import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getNPSList, getSchedulesForNPS, getPipeSpec, PIPE_ROUGHNESS } from "@/lib/engineering/constants";
import type { UnitSystem } from "@/lib/engineering/unitConversion";

interface PipeSizeSelectorProps {
  unitSystem: UnitSystem;
  innerDiameter: string;
  roughness?: string;
  onDiameterChange: (value: string) => void;
  onRoughnessChange?: (value: string) => void;
  showRoughness?: boolean;
  testIdPrefix?: string;
}

export function PipeSizeSelector({
  unitSystem,
  innerDiameter,
  roughness,
  onDiameterChange,
  onRoughnessChange,
  showRoughness = true,
  testIdPrefix = "",
}: PipeSizeSelectorProps) {
  const [selectedNPS, setSelectedNPS] = useState<string>("");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [manualMode, setManualMode] = useState(false);

  const npsList = getNPSList();
  const schedules = selectedNPS ? getSchedulesForNPS(selectedNPS) : [];

  useEffect(() => {
    if (selectedNPS && selectedSchedule) {
      const spec = getPipeSpec(selectedNPS, selectedSchedule);
      if (spec) {
        const id = unitSystem === "SI" ? spec.id_mm : spec.id_mm / 25.4;
        onDiameterChange(id.toFixed(2));
        setManualMode(false);
      }
    }
  }, [selectedNPS, selectedSchedule]);

  const handleNPSChange = (nps: string) => {
    setSelectedNPS(nps);
    const scheds = getSchedulesForNPS(nps);
    if (scheds.length > 0) {
      setSelectedSchedule(scheds[0]);
      const spec = getPipeSpec(nps, scheds[0]);
      if (spec) {
        const id = unitSystem === "SI" ? spec.id_mm : spec.id_mm / 25.4;
        onDiameterChange(id.toFixed(2));
        setManualMode(false);
      }
    }
  };

  const handleScheduleChange = (schedule: string) => {
    setSelectedSchedule(schedule);
  };

  const handleRoughnessSelect = (material: string) => {
    const r = PIPE_ROUGHNESS[material];
    if (r !== undefined && onRoughnessChange) {
      onRoughnessChange(String(r * 1000));
    }
  };

  const handleManualDiameterChange = (value: string) => {
    setManualMode(true);
    setSelectedNPS("");
    setSelectedSchedule("");
    onDiameterChange(value);
  };

  const spec = selectedNPS && selectedSchedule ? getPipeSpec(selectedNPS, selectedSchedule) : null;
  const prefix = testIdPrefix ? `${testIdPrefix}-` : "";
  const diamUnit = unitSystem === "SI" ? "mm" : "in";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs mb-1.5 block">Nominal Pipe Size (NPS)</Label>
          <Select value={selectedNPS} onValueChange={handleNPSChange}>
            <SelectTrigger data-testid={`${prefix}select-nps`}>
              <SelectValue placeholder="Select NPS..." />
            </SelectTrigger>
            <SelectContent>
              {npsList.map((nps) => (
                <SelectItem key={nps} value={nps}>{nps}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">Schedule</Label>
          <Select value={selectedSchedule} onValueChange={handleScheduleChange} disabled={!selectedNPS}>
            <SelectTrigger data-testid={`${prefix}select-schedule`}>
              <SelectValue placeholder="Select schedule..." />
            </SelectTrigger>
            <SelectContent>
              {schedules.map((sch) => (
                <SelectItem key={sch} value={sch}>{sch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {spec && !manualMode && (
        <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-muted/50 text-xs" data-testid={`${prefix}pipe-dims`}>
          <div>
            <span className="text-muted-foreground block">OD</span>
            <span className="font-mono font-medium">
              {unitSystem === "SI" ? spec.od_mm.toFixed(1) : (spec.od_mm / 25.4).toFixed(3)} {diamUnit}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Wall Thk.</span>
            <span className="font-mono font-medium">
              {unitSystem === "SI" ? spec.wt_mm.toFixed(2) : (spec.wt_mm / 25.4).toFixed(3)} {diamUnit}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">ID</span>
            <span className="font-mono font-medium">
              {unitSystem === "SI" ? spec.id_mm.toFixed(2) : (spec.id_mm / 25.4).toFixed(3)} {diamUnit}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs mb-1.5 block">
            Inner Diameter ({diamUnit})
            {!manualMode && spec && <span className="text-muted-foreground ml-1">(from NPS)</span>}
          </Label>
          <Input
            type="number"
            value={innerDiameter}
            onChange={(e) => handleManualDiameterChange(e.target.value)}
            placeholder={unitSystem === "SI" ? "e.g. 254.5" : "e.g. 10.02"}
            data-testid={`${prefix}input-diameter`}
          />
        </div>
        {showRoughness && onRoughnessChange && (
          <>
            <div>
              <Label className="text-xs mb-1.5 block">Pipe Material</Label>
              <Select onValueChange={handleRoughnessSelect}>
                <SelectTrigger data-testid={`${prefix}select-material`}>
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PIPE_ROUGHNESS).map((mat) => (
                    <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Roughness (mm)</Label>
              <Input
                type="number"
                value={roughness}
                onChange={(e) => onRoughnessChange(e.target.value)}
                data-testid={`${prefix}input-roughness`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
