import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Gauge, Thermometer, Atom, Flame, Lock } from "lucide-react";

// Flow unit types with their standard conditions
type FlowUnit = {
  id: string;
  label: string;
  pressureUnit: string;
  tempUnit: string;
  standardPressure: number;
  standardTemp: number;
  volumeFactor: number;
};

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

const celsiusToRankine = (c: number) => (c + 273.15) * 1.8;
const fahrenheitToRankine = (f: number) => f + 459.67;
const atmToSia = (atm: number) => atm * 14.696;

const GasFlowConverter = () => {
  const [gasVolume, setGasVolume] = useState<string>("2.0");
  const [fromUnit, setFromUnit] = useState<string>("Nm3/h");
  const [toUnit, setToUnit] = useState<string>("MMSCFD");
  const [fromPressure, setFromPressure] = useState<string>("1.00");
  const [fromTemp, setFromTemp] = useState<string>("0.00");
  const [fromZ, setFromZ] = useState<string>("1.0");
  const [toPressure, setToPressure] = useState<string>("14.696");
  const [toTemp, setToTemp] = useState<string>("60.00");
  const [toZ, setToZ] = useState<string>("1.0");
  const [result, setResult] = useState<number>(0);
  const [calculationSteps, setCalculationSteps] = useState<{
    v1Converted: number;
    p1Psia: number;
    p2Psia: number;
    t1Rankine: number;
    t2Rankine: number;
  } | null>(null);

  const getUnitInfo = (unitId: string): FlowUnit => {
    return flowUnits.find(u => u.id === unitId) || flowUnits[0];
  };

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

    const v1InFt3PerDay = v1 * fromUnitInfo.volumeFactor / 1000000;
    const p1Psia = fromUnitInfo.pressureUnit === "Atm Abs" ? atmToSia(p1) : p1;
    const p2Psia = toUnitInfo.pressureUnit === "Atm Abs" ? atmToSia(p2) : p2;
    const t1Rankine = fromUnitInfo.tempUnit === "°C" ? celsiusToRankine(t1) : fahrenheitToRankine(t1);
    const t2Rankine = toUnitInfo.tempUnit === "°C" ? celsiusToRankine(t2) : fahrenheitToRankine(t2);

    const v2Base = v1InFt3PerDay * (p1Psia / p2Psia) * (t2Rankine / t1Rankine) * (z2 / z1);
    const v2 = v2Base * 1000000 / toUnitInfo.volumeFactor;

    setResult(v2);
    setCalculationSteps({
      v1Converted: v1InFt3PerDay,
      p1Psia,
      p2Psia,
      t1Rankine,
      t2Rankine,
    });
  }, [gasVolume, fromUnit, toUnit, fromPressure, fromTemp, fromZ, toPressure, toTemp, toZ]);

  const fromUnitInfo = getUnitInfo(fromUnit);
  const toUnitInfo = getUnitInfo(toUnit);

  const ConditionInput = ({ 
    label, 
    symbol, 
    value, 
    onChange, 
    unit, 
    locked,
    icon: Icon
  }: { 
    label: string; 
    symbol: string; 
    value: string; 
    onChange: (v: string) => void; 
    unit: string;
    locked: boolean;
    icon: React.ElementType;
  }) => (
    <div className="relative group">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:bg-secondary/70">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            {label} 
            <span className="text-primary font-mono">({symbol})</span>
            {locked && <Lock className="w-3 h-3 text-primary/60" />}
          </Label>
          <div className="flex items-baseline gap-2 mt-1">
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={locked}
              className="h-8 bg-transparent border-0 p-0 text-lg font-semibold text-foreground focus-visible:ring-0 w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-70 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-primary font-medium">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const UnitCard = ({
    title,
    unitValue,
    onUnitChange,
    pressure,
    onPressureChange,
    temp,
    onTempChange,
    z,
    onZChange,
    unitInfo,
    isFrom = true
  }: {
    title: string;
    unitValue: string;
    onUnitChange: (v: string) => void;
    pressure: string;
    onPressureChange: (v: string) => void;
    temp: string;
    onTempChange: (v: string) => void;
    z: string;
    onZChange: (v: string) => void;
    unitInfo: FlowUnit;
    isFrom?: boolean;
  }) => {
    const locked = isUnitLocked(unitValue);
    
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card">
        {/* Decorative corner accent */}
        <div className={`absolute top-0 ${isFrom ? 'left-0' : 'right-0'} w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 ${isFrom ? '-translate-x-1/2' : 'translate-x-1/2'}`} />
        
        <div className="relative space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-semibold text-foreground">{title}</h3>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${isFrom ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
              {isFrom ? 'Source' : 'Target'}
            </div>
          </div>

          {/* Unit Selector */}
          <Select value={unitValue} onValueChange={onUnitChange}>
            <SelectTrigger className="h-14 bg-secondary/30 border-border/50 text-lg font-semibold hover:border-primary/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {flowUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id} className="text-base">
                  {unit.label}
                  {isUnitLocked(unit.id) && (
                    <span className="ml-2 text-xs text-muted-foreground">(Standard)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Conditions Grid */}
          <div className="space-y-3">
            <ConditionInput
              label="Pressure"
              symbol={isFrom ? "P1" : "P2"}
              value={pressure}
              onChange={onPressureChange}
              unit={unitInfo.pressureUnit}
              locked={locked}
              icon={Gauge}
            />
            <ConditionInput
              label="Temperature"
              symbol={isFrom ? "T1" : "T2"}
              value={temp}
              onChange={onTempChange}
              unit={unitInfo.tempUnit}
              locked={locked}
              icon={Thermometer}
            />
            <ConditionInput
              label="Compressibility"
              symbol={isFrom ? "Z1" : "Z2"}
              value={z}
              onChange={onZChange}
              unit=""
              locked={false}
              icon={Atom}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/30 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-4 right-4 text-primary/10">
          <Flame className="w-32 h-32" />
        </div>
        
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Flame className="w-4 h-4" />
            Gas Flow Calculator
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3">
            Volume Flow Rate <span className="text-gradient-gold">Converter</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base leading-relaxed">
            Convert between SCFM, ACFM, MMSCFD, Nm³/h, Sm³/h, and actual cubic meter rates. 
            Standard units have locked reference conditions per industry standards.
          </p>
        </div>
      </div>

      {/* Main Input Card */}
      <div className="relative rounded-2xl border border-primary/30 bg-gradient-card p-6 sm:p-8 shadow-gold">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl" />
        
        <div className="relative">
          <Label className="text-sm text-muted-foreground uppercase tracking-wider mb-3 block">
            Input Gas Volume
          </Label>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Input
                type="number"
                value={gasVolume}
                onChange={(e) => setGasVolume(e.target.value)}
                className="h-16 text-3xl sm:text-4xl font-bold bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.00"
              />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-semibold text-primary">
              {fromUnitInfo.label}
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Cards */}
      <div className="grid lg:grid-cols-2 gap-6 relative">
        <UnitCard
          title="Convert From"
          unitValue={fromUnit}
          onUnitChange={setFromUnit}
          pressure={fromPressure}
          onPressureChange={setFromPressure}
          temp={fromTemp}
          onTempChange={setFromTemp}
          z={fromZ}
          onZChange={setFromZ}
          unitInfo={fromUnitInfo}
          isFrom={true}
        />

        {/* Arrow connector */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-gold">
            <ArrowRight className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        
        <div className="flex lg:hidden justify-center -my-2">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-gold rotate-90">
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>

        <UnitCard
          title="Convert To"
          unitValue={toUnit}
          onUnitChange={setToUnit}
          pressure={toPressure}
          onPressureChange={setToPressure}
          temp={toTemp}
          onTempChange={setToTemp}
          z={toZ}
          onZChange={setToZ}
          unitInfo={toUnitInfo}
          isFrom={false}
        />
      </div>

      {/* Result Section */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/50 bg-gradient-card shadow-elevated">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative p-6 sm:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Result Display */}
            <div className="space-y-4">
              <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Result
              </h3>
              
              <div className="p-6 rounded-xl bg-secondary/50 border border-primary/30">
                <p className="text-sm text-muted-foreground mb-2">Output Volume (V2)</p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-bold text-gradient-gold font-heading">
                    {result.toFixed(4)}
                  </span>
                  <span className="text-xl sm:text-2xl text-primary font-semibold">
                    {toUnitInfo.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-heading font-semibold text-foreground">
                Calculation Steps
              </h3>
              
              <div className="space-y-3 font-mono text-sm">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-muted-foreground mb-1">Gas Law Formula</p>
                  <p className="text-foreground">
                    <span className="text-primary">V2</span> = V1 × (P1/P2) × (T2/T1) × (Z2/Z1)
                  </p>
                </div>
                
                {calculationSteps && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-secondary/20 text-center">
                      <p className="text-xs text-muted-foreground">V1</p>
                      <p className="text-foreground text-sm">{calculationSteps.v1Converted.toFixed(4)} ×10⁶ ft³/d</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/20 text-center">
                      <p className="text-xs text-muted-foreground">P1</p>
                      <p className="text-foreground text-sm">{calculationSteps.p1Psia.toFixed(3)} PSIA</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/20 text-center">
                      <p className="text-xs text-muted-foreground">T1</p>
                      <p className="text-foreground text-sm">{calculationSteps.t1Rankine.toFixed(2)} °R</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/20 text-center">
                      <p className="text-xs text-muted-foreground">T2</p>
                      <p className="text-foreground text-sm">{calculationSteps.t2Rankine.toFixed(2)} °R</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GasFlowConverter;
