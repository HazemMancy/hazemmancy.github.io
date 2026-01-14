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
  BookOpen,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";

// ====================== TYPES AND CONSTANTS ======================

type FlowUnit = {
  id: string;
  label: string;
  pressureUnit: string;
  tempUnit: string;
  standardPressure: number; // in psia for imperial, atm for metric
  standardTemp: number; // in °R for all units for consistency
  volumeFactor: number; // Factor to convert to SCFD (Standard Cubic Feet per Day)
  category: 'standard' | 'actual';
};

// Industry standard definitions
const STANDARD_CONDITIONS = {
  // Nm³: Normal cubic meter at 0°C and 101.325 kPa (1 atm)
  Nm3: { pressure: 14.6959, temperature: 491.67 }, // 0°C = 491.67°R

  // Sm³: Standard cubic meter at 15°C and 101.325 kPa
  Sm3: { pressure: 14.6959, temperature: 518.67 }, // 15°C = 518.67°R

  // SCF: Standard cubic foot at 60°F and 14.696 psia
  SCF: { pressure: 14.696, temperature: 519.67 }, // 60°F = 519.67°R

  // MSCF: Thousand standard cubic feet
  MSCF: { pressure: 14.696, temperature: 519.67 },

  // MMSCF: Million standard cubic feet
  MMSCF: { pressure: 14.696, temperature: 519.67 }
};

// Conversion constants
const CUBIC_METER_TO_CUBIC_FEET = 35.3147;
const MINUTES_PER_DAY = 1440;
const HOURS_PER_DAY = 24;

// Flow units with corrected definitions
const flowUnits: FlowUnit[] = [
  // Standard units (locked conditions per industry standards)
  {
    id: "Nm3/h",
    label: "Nm³/h",
    pressureUnit: "Atm Abs",
    tempUnit: "°C",
    standardPressure: STANDARD_CONDITIONS.Nm3.pressure,
    standardTemp: STANDARD_CONDITIONS.Nm3.temperature,
    volumeFactor: CUBIC_METER_TO_CUBIC_FEET * HOURS_PER_DAY, // Nm³/h → ft³/d
    category: 'standard'
  },
  {
    id: "Sm3/h",
    label: "Sm³/h",
    pressureUnit: "Atm Abs",
    tempUnit: "°C",
    standardPressure: STANDARD_CONDITIONS.Sm3.pressure,
    standardTemp: STANDARD_CONDITIONS.Sm3.temperature,
    volumeFactor: CUBIC_METER_TO_CUBIC_FEET * HOURS_PER_DAY, // Sm³/h → ft³/d
    category: 'standard'
  },
  {
    id: "SCFM",
    label: "SCFM",
    pressureUnit: "PSIA",
    tempUnit: "°F",
    standardPressure: STANDARD_CONDITIONS.SCF.pressure,
    standardTemp: STANDARD_CONDITIONS.SCF.temperature,
    volumeFactor: MINUTES_PER_DAY, // SCFM → ft³/d
    category: 'standard'
  },
  {
    id: "MSCFD",
    label: "MSCFD",
    pressureUnit: "PSIA",
    tempUnit: "°F",
    standardPressure: STANDARD_CONDITIONS.MSCF.pressure,
    standardTemp: STANDARD_CONDITIONS.MSCF.temperature,
    volumeFactor: 1000, // MSCFD → ft³/d
    category: 'standard'
  },
  {
    id: "MMSCFD",
    label: "MMSCFD",
    pressureUnit: "PSIA",
    tempUnit: "°F",
    standardPressure: STANDARD_CONDITIONS.MMSCF.pressure,
    standardTemp: STANDARD_CONDITIONS.MMSCF.temperature,
    volumeFactor: 1000000, // MMSCFD → ft³/d
    category: 'standard'
  },

  // Actual units (custom conditions allowed)
  {
    id: "Am3/h",
    label: "Am³/h",
    pressureUnit: "Atm Abs",
    tempUnit: "°C",
    standardPressure: 14.696,
    standardTemp: 518.67, // Default: 15°C
    volumeFactor: CUBIC_METER_TO_CUBIC_FEET * HOURS_PER_DAY,
    category: 'actual'
  },
  {
    id: "ACFM",
    label: "ACFM",
    pressureUnit: "PSIA",
    tempUnit: "°F",
    standardPressure: 14.696,
    standardTemp: 519.67, // Default: 60°F
    volumeFactor: MINUTES_PER_DAY,
    category: 'actual'
  },
  {
    id: "m3/s",
    label: "m³/s",
    pressureUnit: "Atm Abs",
    tempUnit: "°C",
    standardPressure: 14.696,
    standardTemp: 518.67, // Default: 15°C
    volumeFactor: CUBIC_METER_TO_CUBIC_FEET * HOURS_PER_DAY * 3600, // m³/s → ft³/d
    category: 'actual'
  }
];

const isUnitLocked = (unitId: string) => {
  const unit = flowUnits.find(u => u.id === unitId);
  return unit?.category === 'standard';
};

// ====================== UTILITY FUNCTIONS ======================

const celsiusToRankine = (c: number) => (c + 273.15) * 1.8;
const fahrenheitToRankine = (f: number) => f + 459.67;
const atmToPsia = (atm: number) => atm * 14.6959;

// Temperature validation
const isValidTemperature = (value: number, unit: string): boolean => {
  if (unit === "°C") return value >= -273.15;
  return value >= -459.67; // °F, absolute zero
};

// Get unit info with validation
const getUnitInfo = (unitId: string): FlowUnit => {
  const unit = flowUnits.find(u => u.id === unitId);
  if (!unit) {
    console.warn(`Unit ${unitId} not found, defaulting to Nm³/h`);
    return flowUnits[0];
  }
  return unit;
};

// Get default conditions for a unit
const getDefaultConditions = (unitId: string): { pressure: string; temperature: string } => {
  const unit = getUnitInfo(unitId);
  let tempValue = "";

  if (unit.id === "Nm3/h") tempValue = "0.00";
  else if (unit.id === "Sm3/h") tempValue = "15.00";
  else if (unit.tempUnit === "°F") tempValue = "60.00";
  else tempValue = "15.00";

  const pressureValue = unit.pressureUnit === "Atm Abs" ? "1.00" : "14.696";

  return { pressure: pressureValue, temperature: tempValue };
};

// ====================== MAIN COMPONENT ======================

const GasFlowConverter = () => {
  // State declarations
  const [gasVolume, setGasVolume] = useState<string>("100");
  const [fromUnit, setFromUnit] = useState<string>("Nm3/h");
  const [toUnit, setToUnit] = useState<string>("SCFM");
  const [fromPressure, setFromPressure] = useState<string>("1.00");
  const [fromTemp, setFromTemp] = useState<string>("0.00");
  const [fromZ, setFromZ] = useState<string>("1.0");
  const [toPressure, setToPressure] = useState<string>("14.696");
  const [toTemp, setToTemp] = useState<string>("60.00");
  const [toZ, setToZ] = useState<string>("1.0");
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-set standard conditions when unit changes
  useEffect(() => {
    const unit = getUnitInfo(fromUnit);
    if (isUnitLocked(fromUnit)) {
      const defaults = getDefaultConditions(fromUnit);
      setFromPressure(defaults.pressure);
      setFromTemp(defaults.temperature);
    }
  }, [fromUnit]);

  useEffect(() => {
    const unit = getUnitInfo(toUnit);
    if (isUnitLocked(toUnit)) {
      const defaults = getDefaultConditions(toUnit);
      setToPressure(defaults.pressure);
      setToTemp(defaults.temperature);
    }
  }, [toUnit]);

  // Input validation
  const validateInputs = (): boolean => {
    const errors: string[] = [];

    const v1 = parseFloat(gasVolume);
    const p1 = parseFloat(fromPressure);
    const t1 = parseFloat(fromTemp);
    const z1 = parseFloat(fromZ);
    const p2 = parseFloat(toPressure);
    const t2 = parseFloat(toTemp);
    const z2 = parseFloat(toZ);

    if (isNaN(v1) || isNaN(p1) || isNaN(t1) || isNaN(z1) || isNaN(p2) || isNaN(t2) || isNaN(z2)) {
      errors.push("All fields must contain valid numbers");
    }

    if (p1 <= 0 || p2 <= 0) {
      errors.push("Pressure must be greater than 0");
    }

    if (z1 <= 0 || z2 <= 0) {
      errors.push("Compressibility factor (Z) must be greater than 0");
    }

    const fromUnitInfo = getUnitInfo(fromUnit);
    const toUnitInfo = getUnitInfo(toUnit);

    if (!isValidTemperature(t1, fromUnitInfo.tempUnit)) {
      errors.push("From temperature below absolute zero");
    }

    if (!isValidTemperature(t2, toUnitInfo.tempUnit)) {
      errors.push("To temperature below absolute zero");
    }

    if (v1 < 0) {
      errors.push("Volume flow rate cannot be negative");
    }

    if (errors.length > 0) {
      setValidationError(errors.join(". "));
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Main calculation
  const { result, steps, error } = useMemo(() => {
    // Clear previous validation error
    setValidationError(null);

    if (!validateInputs()) {
      return { result: 0, steps: null, error: validationError };
    }

    const v1 = parseFloat(gasVolume);
    const p1 = parseFloat(fromPressure);
    const t1 = parseFloat(fromTemp);
    const z1 = parseFloat(fromZ);
    const p2 = parseFloat(toPressure);
    const t2 = parseFloat(toTemp);
    const z2 = parseFloat(toZ);

    const fromUnitInfo = getUnitInfo(fromUnit);
    const toUnitInfo = getUnitInfo(toUnit);

    // Convert temperatures to Rankine for consistent calculations
    const t1Rankine = fromUnitInfo.tempUnit === "°C"
      ? celsiusToRankine(t1)
      : fahrenheitToRankine(t1);

    const t2Rankine = toUnitInfo.tempUnit === "°C"
      ? celsiusToRankine(t2)
      : fahrenheitToRankine(t2);

    // Convert pressures to psia for consistent calculations
    const p1Psia = fromUnitInfo.pressureUnit === "Atm Abs"
      ? atmToPsia(p1)
      : p1;

    const p2Psia = toUnitInfo.pressureUnit === "Atm Abs"
      ? atmToPsia(p2)
      : p2;

    // Step 1: Convert input volume to base unit (SCFD)
    // volumeFactor converts the unit to ft³/d at its standard conditions
    const v1InSCFD = v1 * fromUnitInfo.volumeFactor;

    // Step 2: Apply gas law to adjust for actual conditions
    // V₂ = V₁ × (P₁/P₂) × (T₂/T₁) × (Z₂/Z₁)
    const pressureRatio = p1Psia / p2Psia;
    const temperatureRatio = t2Rankine / t1Rankine;
    const zRatio = z2 / z1;

    const v2InSCFD = v1InSCFD * pressureRatio * temperatureRatio * zRatio;

    // Step 3: Convert from SCFD to target unit
    const v2 = v2InSCFD / toUnitInfo.volumeFactor;

    // Calculate intermediate values for display
    const v1Actual = v1InSCFD / fromUnitInfo.volumeFactor; // Back to original unit for verification
    const v2Base = v2InSCFD; // Value in SCFD

    return {
      result: v2,
      steps: {
        v1Original: v1Actual,
        v1SCFD: v1InSCFD,
        v2SCFD: v2InSCFD,
        pressureRatio,
        temperatureRatio,
        zRatio,
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

    // Swap values while maintaining logical consistency
    const tempP = fromPressure;
    const tempT = fromTemp;
    const tempZ = fromZ;

    setFromPressure(toPressure);
    setFromTemp(toTemp);
    setFromZ(toZ);

    setToPressure(tempP);
    setToTemp(tempT);
    setToZ(tempZ);
  };

  const handleCopy = async () => {
    if (!result || error) return;

    try {
      await navigator.clipboard.writeText(result.toFixed(6));
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
  const fromLocked = isUnitLocked(fromUnit);
  const toLocked = isUnitLocked(toUnit);

  // ====================== SUBCOMPONENTS ======================

  const ConditionInput = ({
    label,
    symbol,
    value,
    onChange,
    unit,
    locked,
    icon: Icon,
    warning
  }: {
    label: string;
    symbol: string;
    value: string;
    onChange: (v: string) => void;
    unit: string;
    locked: boolean;
    icon: React.ElementType;
    warning?: string;
  }) => (
    <div className="relative group">
      <div className={`flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border transition-all duration-300 ${locked ? 'border-border/30 opacity-80' : 'border-border/50 hover:border-primary/30 hover:bg-secondary/70'} ${warning ? 'border-yellow-500/30' : ''}`}>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            {label}
            <span className="text-primary font-mono">({symbol})</span>
            {locked && <Lock className="w-3 h-3 text-primary/60" />}
            {warning && <AlertCircle className="w-3 h-3 text-yellow-500" />}
          </Label>
          <div className="flex items-baseline gap-2 mt-1">
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={locked}
              className="h-8 bg-transparent border-0 p-0 text-lg font-semibold text-foreground focus-visible:ring-0 w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-100 disabled:cursor-not-allowed"
              step="any"
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

    // Check for unrealistic Z-factor
    const zWarning = parseFloat(z) > 2 || parseFloat(z) < 0.1
      ? "Unusual Z-factor value. Verify for your gas composition and conditions."
      : undefined;

    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card h-full">
        <div className={`absolute top-0 ${isFrom ? 'left-0' : 'right-0'} w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 ${isFrom ? '-translate-x-1/2' : 'translate-x-1/2'}`} />

        <div className="relative space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading font-semibold text-foreground">{title}</h3>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${isFrom ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'} ${locked ? 'ring-1 ring-primary/30' : ''}`}>
              {locked ? 'Standard Unit' : 'Actual Unit'}
            </div>
          </div>

          <Select value={unitValue} onValueChange={onUnitChange}>
            <SelectTrigger className="h-14 bg-secondary/30 border-border/50 text-lg font-semibold hover:border-primary/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {flowUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id} className="text-base">
                  <div className="flex items-center justify-between w-full">
                    <span>{unit.label}</span>
                    <span className={`text-xs px-2 py-1 rounded ${unit.category === 'standard' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {unit.category === 'standard' ? 'Standard' : 'Actual'}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-3">
            <ConditionInput
              label="Pressure"
              symbol={isFrom ? "P₁" : "P₂"}
              value={pressure}
              onChange={onPressureChange}
              unit={unitInfo.pressureUnit}
              locked={locked}
              icon={Gauge}
            />
            <ConditionInput
              label="Temperature"
              symbol={isFrom ? "T₁" : "T₂"}
              value={temp}
              onChange={onTempChange}
              unit={unitInfo.tempUnit}
              locked={locked}
              icon={Thermometer}
            />
            <ConditionInput
              label="Compressibility"
              symbol={isFrom ? "Z₁" : "Z₂"}
              value={z}
              onChange={onZChange}
              unit=""
              locked={false}
              icon={Atom}
              warning={zWarning}
            />
          </div>

          {locked && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Standard unit: Conditions fixed per industry practice
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ====================== RENDER ======================

  return (
    <div className="space-y-8">
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
            Convert between standard (SCFM, Nm³/h, Sm³/h, MMSCFD) and actual (ACFM, Am³/h) gas flow rates.
            Standard units use fixed reference conditions per API and ISO standards.
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
          {/* Input Volume Card */}
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
                    step="any"
                  />
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-semibold text-primary">
                  {fromUnitInfo.label}
                  {fromLocked && (
                    <span className="text-xs ml-2 text-primary/70">(Standard)</span>
                  )}
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

            <div className="flex justify-center z-10 lg:rotate-0 rotate-90 my-[-1rem] lg:my-0">
              <Button
                variant="outline"
                size="icon"
                onClick={handleSwap}
                className="w-12 h-12 rounded-full border-primary/50 bg-background shadow-lg hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all duration-300"
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
              {(error || validationError) ? (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive mb-0">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="font-medium ml-2">
                    {error || validationError}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Result Display */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Conversion Result
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="text-xs h-8 gap-2 hover:bg-primary/10 hover:text-primary"
                        disabled={!result}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>

                    <div className="p-6 rounded-xl bg-secondary/50 border border-primary/30 group transition-colors hover:border-primary/50">
                      <p className="text-sm text-muted-foreground mb-2">Output Volume (V₂)</p>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-4xl sm:text-5xl font-bold text-gradient-gold font-heading tracking-tight">
                          {result.toFixed(6)}
                        </span>
                        <span className="text-xl sm:text-2xl text-primary font-semibold">
                          {toUnitInfo.label}
                          {toLocked && (
                            <span className="text-xs ml-2 text-primary/70">(Standard)</span>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Based on ideal gas law with compressibility correction
                      </p>
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
                          <span className="text-primary">V₂</span> = V₁ × (P₁/P₂) × (T₂/T₁) × (Z₂/Z₁)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          All temperatures in Rankine, pressures in PSIA
                        </p>
                      </div>

                      {steps && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-secondary/20 text-center border border-transparent hover:border-primary/10 transition-colors">
                            <p className="text-xs text-muted-foreground">Pressure Ratio</p>
                            <p className="text-foreground text-sm font-semibold">{steps.pressureRatio.toFixed(4)}</p>
                            <p className="text-xs text-muted-foreground">
                              {steps.p1Psia.toFixed(2)}/{steps.p2Psia.toFixed(2)} psia
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-secondary/20 text-center border border-transparent hover:border-primary/10 transition-colors">
                            <p className="text-xs text-muted-foreground">Temp Ratio</p>
                            <p className="text-foreground text-sm font-semibold">{steps.temperatureRatio.toFixed(4)}</p>
                            <p className="text-xs text-muted-foreground">
                              {steps.t2Rankine.toFixed(0)}/{steps.t1Rankine.toFixed(0)} °R
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-secondary/20 text-center border border-transparent hover:border-primary/10 transition-colors">
                            <p className="text-xs text-muted-foreground">Z Ratio</p>
                            <p className="text-foreground text-sm font-semibold">{steps.zRatio.toFixed(4)}</p>
                            <p className="text-xs text-muted-foreground">
                              Z₂={toZ}/Z₁={fromZ}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-secondary/20 text-center border border-transparent hover:border-primary/10 transition-colors">
                            <p className="text-xs text-muted-foreground">Base Flow</p>
                            <p className="text-foreground text-sm font-semibold">
                              {steps.v2SCFD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-muted-foreground">SCFD</p>
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
                Industry Standard Reference Conditions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Unit</th>
                      <th className="px-4 py-3">Definition</th>
                      <th className="px-4 py-3">Pressure</th>
                      <th className="px-4 py-3 rounded-tr-lg">Temperature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">Nm³/h</td>
                      <td className="px-4 py-3 text-muted-foreground">Normal cubic meter per hour</td>
                      <td className="px-4 py-3 text-muted-foreground">1.01325 bar abs (14.696 psia)</td>
                      <td className="px-4 py-3 text-muted-foreground">0°C (32°F, 491.67°R)</td>
                    </tr>
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">Sm³/h</td>
                      <td className="px-4 py-3 text-muted-foreground">Standard cubic meter per hour</td>
                      <td className="px-4 py-3 text-muted-foreground">1.01325 bar abs (14.696 psia)</td>
                      <td className="px-4 py-3 text-muted-foreground">15°C (59°F, 518.67°R)</td>
                    </tr>
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">SCFM</td>
                      <td className="px-4 py-3 text-muted-foreground">Standard cubic feet per minute</td>
                      <td className="px-4 py-3 text-muted-foreground">14.696 psia</td>
                      <td className="px-4 py-3 text-muted-foreground">60°F (519.67°R)</td>
                    </tr>
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">MMSCFD</td>
                      <td className="px-4 py-3 text-muted-foreground">Million standard cubic feet per day</td>
                      <td className="px-4 py-3 text-muted-foreground">14.696 psia</td>
                      <td className="px-4 py-3 text-muted-foreground">60°F (519.67°R)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-primary">
                  <strong>Note:</strong> Standard units have fixed reference conditions per ISO 13443 and API standards.
                  Actual units (ACFM, Am³/h) allow custom pressure and temperature inputs.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border/50 bg-background/50 p-6 h-full">
                <h4 className="font-semibold mb-2 text-foreground">Calculation Methodology</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  The conversion follows the real gas equation: PV = ZnRT, where:
                </p>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-secondary/30 border border-primary/20 font-mono text-sm">
                    V₂ = V₁ × (P₁/P₂) × (T₂/T₁) × (Z₂/Z₁)
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2 pl-4">
                    <li><span className="text-foreground font-medium">V₁, V₂:</span> Volume flows at conditions 1 and 2</li>
                    <li><span className="text-foreground font-medium">P₁, P₂:</span> Absolute pressures (PSIA)</li>
                    <li><span className="text-foreground font-medium">T₁, T₂:</span> Absolute temperatures (°Rankine)</li>
                    <li><span className="text-foreground font-medium">Z₁, Z₂:</span> Compressibility factors (1.0 for ideal gas)</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-6 h-full">
                <h4 className="font-semibold mb-2 text-foreground">Usage Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-3 list-none pl-0">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                    <div>
                      <span className="text-foreground font-medium">Standard Units</span> (Nm³/h, SCFM, MMSCFD) have locked reference conditions per industry standards.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-accent/60 flex-shrink-0" />
                    <div>
                      <span className="text-foreground font-medium">Actual Units</span> (Am³/h, ACFM) allow custom pressure and temperature inputs for specific process conditions.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                    <div>
                      <span className="text-foreground font-medium">Compressibility Factor (Z):</span> Use Z=1.0 for ideal gas behavior. For real gases at high pressure or low temperature, consult gas property correlations.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-accent/60 flex-shrink-0" />
                    <div>
                      <span className="text-foreground font-medium">Swap Function:</span> Click the swap button to reverse the conversion direction while maintaining logical consistency.
                    </div>
                  </li>
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