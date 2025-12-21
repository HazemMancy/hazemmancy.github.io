import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Flow unit types with their standard conditions
type FlowUnit = {
  id: string;
  label: string;
  pressureUnit: string;
  tempUnit: string;
  standardPressure: number; // in PSIA
  standardTemp: number; // in °R (Rankine)
  volumeFactor: number; // conversion to ft³/d
};

// Units with locked conditions (standard units with fixed P/T)
const lockedUnits = ["Nm3/h", "Sm3/h", "SCFM", "MMSCFD"];

const flowUnits: FlowUnit[] = [
  { id: "Nm3/h", label: "Nm³/h", pressureUnit: "Atm Abs", tempUnit: "°C", standardPressure: 14.696, standardTemp: 491.67, volumeFactor: 847.552 },
  { id: "Sm3/h", label: "Sm³/h", pressureUnit: "Atm Abs", tempUnit: "°C", standardPressure: 14.696, standardTemp: 518.67, volumeFactor: 847.552 },
  { id: "m3/h", label: "m³/h", pressureUnit: "Atm Abs", tempUnit: "°C", standardPressure: 14.696, standardTemp: 519.67, volumeFactor: 847.552 },
  { id: "m3/s", label: "m³/s", pressureUnit: "Atm Abs", tempUnit: "°C", standardPressure: 14.696, standardTemp: 519.67, volumeFactor: 3051187.2 },
  { id: "SCFM", label: "SCFM", pressureUnit: "PSIA", tempUnit: "°F", standardPressure: 14.696, standardTemp: 519.67, volumeFactor: 1440 },
  { id: "MMSCFD", label: "MMSCFD", pressureUnit: "PSIA", tempUnit: "°F", standardPressure: 14.696, standardTemp: 519.67, volumeFactor: 1000000 },
  { id: "ACFM", label: "ACFM", pressureUnit: "PSIA", tempUnit: "°F", standardPressure: 14.696, standardTemp: 519.67, volumeFactor: 1440 },
];

const isUnitLocked = (unitId: string) => lockedUnits.includes(unitId);

// Temperature conversion helpers
const celsiusToRankine = (c: number) => (c + 273.15) * 1.8;
const fahrenheitToRankine = (f: number) => f + 459.67;
const atmToSia = (atm: number) => atm * 14.696;

const GasFlowConverter = () => {
  // Input values
  const [gasVolume, setGasVolume] = useState<string>("2.0");
  const [fromUnit, setFromUnit] = useState<string>("Nm3/h");
  const [toUnit, setToUnit] = useState<string>("MMSCFD");
  
  // From conditions
  const [fromPressure, setFromPressure] = useState<string>("1.00");
  const [fromTemp, setFromTemp] = useState<string>("0.00");
  const [fromZ, setFromZ] = useState<string>("1.0");
  
  // To conditions
  const [toPressure, setToPressure] = useState<string>("14.696");
  const [toTemp, setToTemp] = useState<string>("60.00");
  const [toZ, setToZ] = useState<string>("1.0");
  
  // Results
  const [result, setResult] = useState<number>(0);
  const [calculationSteps, setCalculationSteps] = useState<{
    v1Converted: number;
    p1Psia: number;
    t1Rankine: number;
    t2Rankine: number;
    formula: string;
  } | null>(null);

  const getUnitInfo = (unitId: string): FlowUnit => {
    return flowUnits.find(u => u.id === unitId) || flowUnits[0];
  };

  // Update default conditions when unit changes
  useEffect(() => {
    const unit = getUnitInfo(fromUnit);
    if (unit.pressureUnit === "Atm Abs") {
      setFromPressure("1.00");
    } else {
      setFromPressure("14.696");
    }
    if (unit.tempUnit === "°C") {
      if (fromUnit === "Nm3/h") setFromTemp("0.00");
      else if (fromUnit === "Sm3/h") setFromTemp("15.00");
      else setFromTemp("25.00");
    } else {
      setFromTemp("60.00");
    }
  }, [fromUnit]);

  useEffect(() => {
    const unit = getUnitInfo(toUnit);
    if (unit.pressureUnit === "Atm Abs") {
      setToPressure("1.00");
    } else {
      setToPressure("14.696");
    }
    if (unit.tempUnit === "°C") {
      if (toUnit === "Nm3/h") setToTemp("0.00");
      else if (toUnit === "Sm3/h") setToTemp("15.00");
      else setToTemp("25.00");
    } else {
      setToTemp("60.00");
    }
  }, [toUnit]);

  // Calculate conversion
  useEffect(() => {
    const v1 = parseFloat(gasVolume) || 0;
    const p1 = parseFloat(fromPressure) || 0;
    const t1 = parseFloat(fromTemp) || 0;
    const z1 = parseFloat(fromZ) || 1;
    const p2 = parseFloat(toPressure) || 0;
    const t2 = parseFloat(toTemp) || 0;
    const z2 = parseFloat(toZ) || 1;

    const fromUnitInfo = getUnitInfo(fromUnit);
    const toUnitInfo = getUnitInfo(toUnit);

    // Convert to common base (ft³/d at standard conditions)
    const v1InFt3PerDay = v1 * fromUnitInfo.volumeFactor / 1000000; // in MMSCF/d base

    // Convert pressures to PSIA
    const p1Psia = fromUnitInfo.pressureUnit === "Atm Abs" ? atmToSia(p1) : p1;
    const p2Psia = toUnitInfo.pressureUnit === "Atm Abs" ? atmToSia(p2) : p2;

    // Convert temperatures to Rankine
    const t1Rankine = fromUnitInfo.tempUnit === "°C" ? celsiusToRankine(t1) : fahrenheitToRankine(t1);
    const t2Rankine = toUnitInfo.tempUnit === "°C" ? celsiusToRankine(t2) : fahrenheitToRankine(t2);

    // Apply gas law: V2 = V1 * (P1/P2) * (T2/T1) * (Z2/Z1)
    const v2Base = v1InFt3PerDay * (p1Psia / p2Psia) * (t2Rankine / t1Rankine) * (z2 / z1);

    // Convert from MMSCF/d to target unit
    const v2 = v2Base * 1000000 / toUnitInfo.volumeFactor;

    setResult(v2);
    setCalculationSteps({
      v1Converted: v1InFt3PerDay,
      p1Psia,
      t1Rankine,
      t2Rankine,
      formula: `${v1InFt3PerDay.toFixed(3)}*(${p1Psia.toFixed(3)}/${p2Psia.toFixed(3)})*(${t2Rankine.toFixed(3)}/${t1Rankine.toFixed(3)})*(${z2.toFixed(3)}/${z1.toFixed(3)})`
    });
  }, [gasVolume, fromUnit, toUnit, fromPressure, fromTemp, fromZ, toPressure, toTemp, toZ]);

  const fromUnitInfo = getUnitInfo(fromUnit);
  const toUnitInfo = getUnitInfo(toUnit);

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="pt-6">
          <p className="text-sm sm:text-base text-foreground">
            <span className="font-bold text-primary">Gas Volume Conversion</span> - Convert Gas volume from given condition to SCFM (Standard Cubic Feet per Minute @ 14.7 PSIA, 60°F), ACFM (Actual Cubic Feet per Minute), MMSCFD (Million Standard Cubic Feet per Day @ 14.7 PSIA, 60°F), Nm³/h (Normal Cubic Meter per hour @ 1 Atm, 0°C), Sm³/h (Standard Cubic Meter per hour @ 1 Atm, 15°C), ACMH (Actual Cubic Meter per hour) & ACMS (Actual Cubic Meter per second).
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Convert Section */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-heading">Convert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Gas Volume Input */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Label className="text-primary font-medium min-w-[180px]">
                Gas Volume <span className="text-muted-foreground">(V1)</span>
              </Label>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="number"
                  value={gasVolume}
                  onChange={(e) => setGasVolume(e.target.value)}
                  className="bg-background border-input max-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-primary font-medium" dangerouslySetInnerHTML={{ __html: getUnitInfo(fromUnit).label.replace("³", "<sup>3</sup>") }} />
              </div>
            </div>

            {/* From Section */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <Label className="text-primary font-bold text-lg">From</Label>
              
              <Select value={fromUnit} onValueChange={setFromUnit}>
                <SelectTrigger className="bg-background border-input max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flowUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Label className="text-muted-foreground min-w-[180px]">
                    Pressure <span className="text-primary/70">(P1)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={fromPressure}
                      onChange={(e) => setFromPressure(e.target.value)}
                      disabled={isUnitLocked(fromUnit)}
                      className="bg-background border-input max-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-primary text-sm">{fromUnitInfo.pressureUnit}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Label className="text-muted-foreground min-w-[180px]">
                    Temperature <span className="text-primary/70">(T1)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={fromTemp}
                      onChange={(e) => setFromTemp(e.target.value)}
                      disabled={isUnitLocked(fromUnit)}
                      className="bg-background border-input max-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-primary text-sm">{fromUnitInfo.tempUnit}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Label className="text-muted-foreground min-w-[180px]">
                    Compressibility Factor <span className="text-primary/70">(Z1)</span>
                  </Label>
                  <Input
                    type="number"
                    value={fromZ}
                    onChange={(e) => setFromZ(e.target.value)}
                    className="bg-muted/50 border-input max-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* To Section */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <Label className="text-primary font-bold text-lg">To</Label>
              
              <Select value={toUnit} onValueChange={setToUnit}>
                <SelectTrigger className="bg-background border-input max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flowUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Label className="text-muted-foreground min-w-[180px]">
                    Pressure <span className="text-primary/70">(P2)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={toPressure}
                      onChange={(e) => setToPressure(e.target.value)}
                      disabled={isUnitLocked(toUnit)}
                      className="bg-muted/50 border-input max-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-primary text-sm">{toUnitInfo.pressureUnit}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Label className="text-muted-foreground min-w-[180px]">
                    Temperature <span className="text-primary/70">(T2)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={toTemp}
                      onChange={(e) => setToTemp(e.target.value)}
                      disabled={isUnitLocked(toUnit)}
                      className="bg-muted/50 border-input max-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-primary text-sm">{toUnitInfo.tempUnit}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <Label className="text-muted-foreground min-w-[180px]">
                    Compressibility Factor <span className="text-primary/70">(Z2)</span>
                  </Label>
                  <Input
                    type="number"
                    value={toZ}
                    onChange={(e) => setToZ(e.target.value)}
                    className="bg-muted/50 border-input max-w-[150px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Solution Section */}
        <Card className="border-border bg-muted/20">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-heading">Solution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 font-mono text-sm sm:text-base">
              <p className="text-foreground font-semibold">Based on Gas Laws :</p>
              <p className="text-muted-foreground">
                <span className="text-primary">V2</span> = V1 * (P1/P2) * (T2/T1) * (Z2/Z1)
              </p>
              
              <p className="text-foreground font-semibold pt-4">Converting to uniform units</p>
              
              {calculationSteps && (
                <>
                  <p>
                    <span className="text-primary">V1</span> = {calculationSteps.v1Converted.toFixed(3)} x 10<sup>6</sup> ft<sup>3</sup>/d
                  </p>
                  <p>
                    <span className="text-primary">P1</span> = {calculationSteps.p1Psia.toFixed(3)} <span className="text-primary/70">PSIA</span>
                  </p>
                  <p>
                    <span className="text-primary">T1</span> = {calculationSteps.t1Rankine.toFixed(3)} <span className="text-primary/70">°R</span>
                  </p>
                  <p>
                    <span className="text-primary">T2</span> = {calculationSteps.t2Rankine.toFixed(3)} <span className="text-primary/70">°R</span>
                  </p>
                  <p className="pt-2 text-xs sm:text-sm break-all">
                    <span className="text-primary">V2</span> = {calculationSteps.formula}
                  </p>
                </>
              )}
              
              <p className="pt-4 text-lg sm:text-xl font-bold">
                <span className="text-primary">V2</span> = {result.toFixed(3)} <span className="text-primary">{toUnitInfo.label}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GasFlowConverter;
