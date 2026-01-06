import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowRightLeft,
  Gauge,
  Thermometer,
  Atom,
  Flame,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  BookOpen
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";

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
  const [copied, setCopied] = useState(false);

  const getUnitInfo = (unitId: string): FlowUnit => {
    return flowUnits.find(u => u.id === unitId) || flowUnits[0];
  };

  // Auto-set standard conditions when unit changes
  useEffect(() => {
    const unit = getUnitInfo(fromUnit);
    if (isUnitLocked(fromUnit)) {
      // Only force defaults if it's a standard unit that implies specific conditions
      // Logic kept similar to original but could be refined. 
      // For now, adhering to original behavior of resetting on unit change for better UX on standard units
      if (unit.pressureUnit === "Atm Abs") setFromPressure("1.00");
      else setFromPressure("14.696");

      if (unit.tempUnit === "°C") {
        if (fromUnit === "Nm3/h") setFromTemp("0.00");
        else if (fromUnit === "Sm3/h") setFromTemp("15.00");
        else setFromTemp("25.00");
      } else {
        setFromTemp("60.00");
      }
    }
  }, [fromUnit]);

  useEffect(() => {
    const unit = getUnitInfo(toUnit);
    if (isUnitLocked(toUnit)) {
      if (unit.pressureUnit === "Atm Abs") setToPressure("1.00");
      else setToPressure("14.696");

      if (unit.tempUnit === "°C") {
        if (toUnit === "Nm3/h") setToTemp("0.00");
        else if (toUnit === "Sm3/h") setToTemp("15.00");
        else setToTemp("25.00");
      } else {
        setToTemp("60.00");
      }
    }
  }, [toUnit]);

  const { result, steps, error } = useMemo(() => {
    const v1 = parseFloat(gasVolume);
    const p1 = parseFloat(fromPressure);
    const t1 = parseFloat(fromTemp);
    const z1 = parseFloat(fromZ);
    const p2 = parseFloat(toPressure);
    const t2 = parseFloat(toTemp);
    const z2 = parseFloat(toZ);

    if (isNaN(v1) || isNaN(p1) || isNaN(t1) || isNaN(z1) || isNaN(p2) || isNaN(t2) || isNaN(z2)) {
      return { result: 0, steps: null, error: "Please enter valid numbers for all fields." };
    }

    if (p1 <= 0 || p2 <= 0) {
      return { result: 0, steps: null, error: "Pressure must be greater than 0." };
    }

    if (z1 <= 0 || z2 <= 0) {
      return { result: 0, steps: null, error: "Compressibility factor (Z) must be greater than 0." };
    }

    const fromUnitInfo = getUnitInfo(fromUnit);
    const toUnitInfo = getUnitInfo(toUnit);

    const t1Rankine = fromUnitInfo.tempUnit === "°C" ? celsiusToRankine(t1) : fahrenheitToRankine(t1);
    const t2Rankine = toUnitInfo.tempUnit === "°C" ? celsiusToRankine(t2) : fahrenheitToRankine(t2);

    if (t1Rankine <= 0 || t2Rankine <= 0) {
      return { result: 0, steps: null, error: "Temperature must be above absolute zero." };
    }

    const v1InFt3PerDay = v1 * fromUnitInfo.volumeFactor / 1000000;
    const p1Psia = fromUnitInfo.pressureUnit === "Atm Abs" ? atmToSia(p1) : p1;
    const p2Psia = toUnitInfo.pressureUnit === "Atm Abs" ? atmToSia(p2) : p2;

    const v2Base = v1InFt3PerDay * (p1Psia / p2Psia) * (t2Rankine / t1Rankine) * (z2 / z1);
    const v2 = v2Base * 1000000 / toUnitInfo.volumeFactor;

    return {
      result: v2,
      steps: {
        v1Converted: v1InFt3PerDay,
        p1Psia,
        p2Psia,
        t1Rankine,
        t2Rankine,
      },
      error: null
    };
  }, [gasVolume, fromUnit, toUnit, fromPressure, fromTemp, fromZ, toPressure, toTemp, toZ]);

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    // Values are also swapped to maintain the 'physical' state equivalent
    const tempP = fromPressure; setFromPressure(toPressure); setToPressure(tempP);
    const tempT = fromTemp; setFromTemp(toTemp); setToTemp(tempT);
    const tempZ = fromZ; setFromZ(toZ); setToZ(tempZ);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.toFixed(4));
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Result copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

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
      <div className={`flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border transition-all duration-300 ${locked ? 'border-border/30 opacity-80' : 'border-border/50 hover:border-primary/30 hover:bg-secondary/70'}`}>
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
              className="h-8 bg-transparent border-0 p-0 text-lg font-semibold text-foreground focus-visible:ring-0 w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-100 disabled:cursor-not-allowed"
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
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card h-full">
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

      <Tabs defaultValue="calculator" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-secondary/30 p-1 rounded-full">
            <TabsTrigger value="calculator" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Calculator
            </TabsTrigger>
            <TabsTrigger value="guide" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Technical Guide
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calculator" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          <div className="grid lg:grid-cols-[1fr,auto,1fr] gap-6 items-center relative">
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

            {/* Swap Button */}
            <div className="flex justify-center z-10 lg:rotate-0 rotate-90 my-[-1rem] lg:my-0">
              <Button
                variant="outline"
                size="icon"
                onClick={handleSwap}
                className="w-12 h-12 rounded-full border-primary/50 bg-background shadow-lg hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all duration-300"
                title="Swap Source and Target"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </Button>
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
          <div className="relative overflow-hidden rounded-2xl border border-primary/50 bg-gradient-card shadow-elevated transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

            <div className="relative p-6 sm:p-8">
              {error ? (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive mb-0">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="font-medium ml-2">{error}</AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Result Display */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Result
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="text-xs h-8 gap-2 hover:bg-primary/10 hover:text-primary"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>

                    <div className="p-6 rounded-xl bg-secondary/50 border border-primary/30 group transition-colors hover:border-primary/50">
                      <p className="text-sm text-muted-foreground mb-2">Output Volume (V2)</p>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-4xl sm:text-5xl font-bold text-gradient-gold font-heading tracking-tight">
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
                        <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Gas Law Formula</p>
                        <p className="text-foreground font-medium">
                          <span className="text-primary">V2</span> = V1 × (P1/P2) × (T2/T1) × (Z2/Z1)
                        </p>
                      </div>

                      {steps && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-secondary/20 text-center border border-transparent hover:border-primary/10 transition-colors">
                            <p className="text-xs text-muted-foreground">V1 Base</p>
                            <p className="text-foreground text-sm font-semibold">{steps.v1Converted.toFixed(4)} <span className="text-xs font-normal opacity-70">×10⁶ ft³/d</span></p>
                          </div>
                          <div className="p-2 rounded-lg bg-secondary/20 text-center border border-transparent hover:border-primary/10 transition-colors">
                            <p className="text-xs text-muted-foreground">Pressure Ratio</p>
                            <p className="text-foreground text-sm font-semibold">{(steps.p1Psia / steps.p2Psia).toFixed(4)}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-secondary/20 text-center border border-transparent hover:border-primary/10 transition-colors">
                            <p className="text-xs text-muted-foreground">Temp Ratio</p>
                            <p className="text-foreground text-sm font-semibold">{(steps.t2Rankine / steps.t1Rankine).toFixed(4)}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-secondary/20 text-center border border-transparent hover:border-primary/10 transition-colors">
                            <p className="text-xs text-muted-foreground">Z Ratio</p>
                            <p className="text-foreground text-sm font-semibold">{(parseFloat(toZ) / parseFloat(fromZ)).toFixed(4)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guide" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <div className="rounded-xl border border-primary/20 bg-gradient-card p-6 shadow-card">
              <h3 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Standard Reference Conditions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Unit</th>
                      <th className="px-4 py-3">Pressure</th>
                      <th className="px-4 py-3 rounded-tr-lg">Temperature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {flowUnits.filter(u => isUnitLocked(u.id)).map(u => (
                      <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{u.label}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.standardPressure} {u.pressureUnit}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.standardTemp} {u.tempUnit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border/50 bg-background/50 p-6 h-full">
                <h4 className="font-semibold mb-2 text-foreground">Methodology</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Calculations are based on the Ideal Gas Law, adjusting for pressure, temperature, and compressibility factor (Z).
                </p>
                <div className="p-4 rounded-lg bg-secondary/30 border border-primary/20 font-mono text-sm text-center">
                  V₂ = V₁ × (P₁/P₂) × (T₂/T₁) × (Z₂/Z₁)
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-6 h-full">
                <h4 className="font-semibold mb-2 text-foreground">Usage Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                  <li><span className="text-foreground font-medium">Standard Units</span> (Nm³/h, SCFM) have locked P/T conditions.</li>
                  <li><span className="text-foreground font-medium">Actual Units</span> (m³/h, ACFM) allow custom P/T inputs.</li>
                  <li>Use the <span className="text-primary">Swap</span> button to reverse the calculation direction.</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { GasFlowConverter };
export default GasFlowConverter;

