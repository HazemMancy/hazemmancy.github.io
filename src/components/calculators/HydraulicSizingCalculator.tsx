import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight,
  AlertTriangle,
  Info,
  CheckCircle2,
  Wind,
  Droplets,
  Waves,
  Ruler,
  Download,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import HydraulicGuide from "./guides/HydraulicGuide";
import PipePropertiesCard from "./components/PipePropertiesCard";
import FlowPropertiesCard from "./components/FlowPropertiesCard";
import ResultsCard from "./components/ResultsCard";
import { useHydraulicCalculations } from "./hooks/useHydraulicCalculations";
import { useUnitSystem } from "./hooks/useUnitSystem";
import { generateHydraulicPDF } from "@/lib/hydraulicPdfDatasheet";
import { generateHydraulicExcelDatasheet } from "@/lib/hydraulicExcelDatasheet";
import {
  HydraulicInputs,
  UnitSystem,
  GasServiceCriteria,
  LiquidServiceCriteria,
  MixedPhaseServiceCriteria
} from "./types/hydraulicTypes";
import {
  GAS_SERVICE_CRITERIA,
  LIQUID_SERVICE_CRITERIA,
  MIXED_PHASE_SERVICE_CRITERIA,
  PIPE_SCHEDULE_DATA,
  PIPE_ROUGHNESS
} from "./data/constants";

interface HydraulicSizingCalculatorProps {
  lineType: "gas" | "liquid" | "mixed";
}

const HydraulicSizingCalculator = ({ lineType }: HydraulicSizingCalculatorProps) => {
  // Unit system
  const { unitSystem, handleUnitSystemChange, convertValue } = useUnitSystem();

  // Pipe properties state
  const [pipeLength, setPipeLength] = useState<string>("18");
  const [lengthUnit, setLengthUnit] = useState<string>("km");
  const [nominalDiameter, setNominalDiameter] = useState<string>("4");
  const [schedule, setSchedule] = useState<string>("120");
  const [pipeMaterial, setPipeMaterial] = useState<string>("Carbon Steel (New)");
  const [customRoughness, setCustomRoughness] = useState<string>("0.0457");
  const [roughnessUnit, setRoughnessUnit] = useState<string>("mm");
  const [resultPressureUnit, setPressureUnit] = useState<string>("bar");

  // Flow properties state
  const [flowRate, setFlowRate] = useState<string>(lineType === "gas" ? "2" : "50");
  const [flowRateUnit, setFlowRateUnit] = useState<string>(lineType === "gas" ? "MMSCFD" : "m³/h");
  const [density, setDensity] = useState<string>(lineType === "gas" ? "0.75" : "1000");
  const [densityUnit, setDensityUnit] = useState<string>("kg/m³");
  const [viscosity, setViscosity] = useState<string>(lineType === "gas" ? "0.011" : "1");
  const [viscosityUnit, setViscosityUnit] = useState<string>("cP");
  const [selectedFluid, setSelectedFluid] = useState<string>("Custom");
  const [fluidTemperature, setFluidTemperature] = useState<string>("15");

  // Gas-specific state
  const [gasServiceType, setGasServiceType] = useState<string>("Continuous");
  const [gasPressureRange, setGasPressureRange] = useState<string>("2 to 7 barg");
  const [inletPressure, setInletPressure] = useState<string>("12");
  const [compressibilityZ, setCompressibilityZ] = useState<string>("1.0");
  const [gasDensity60F, setGasDensity60F] = useState<string>("0.856");
  const [gasMolecularWeight, setGasMolecularWeight] = useState<string>("20.3");
  const [baseTemperature, setBaseTemperature] = useState<string>("15.56");
  const [basePressure, setBasePressure] = useState<string>("1.01325");
  const [baseCompressibilityZ, setBaseCompressibilityZ] = useState<string>("1");

  // Liquid-specific state
  const [liquidServiceType, setLiquidServiceType] = useState<string>("Pump Discharge (Pop < 35 barg)");

  // Mixed-phase specific state
  const [mixedPhaseServiceType, setMixedPhaseServiceType] = useState<string>("Continuous (P < 7 barg)");
  const [mixedGasFlowRate, setMixedGasFlowRate] = useState<string>("5");
  const [mixedGasFlowRateUnit, setMixedGasFlowRateUnit] = useState<string>("MMSCFD");
  const [mixedLiquidFlowRate, setMixedLiquidFlowRate] = useState<string>("50");
  const [mixedLiquidFlowRateUnit, setMixedLiquidFlowRateUnit] = useState<string>("m³/h");
  const [mixedGasDensity, setMixedGasDensity] = useState<string>("30");
  const [mixedLiquidDensity, setMixedLiquidDensity] = useState<string>("800");
  const [mixedOpPressure, setMixedOpPressure] = useState<string>("10");
  const [mixedOpTemp, setMixedOpTemp] = useState<string>("25");
  const [mixedGasZ, setMixedGasZ] = useState<string>("0.9");
  const [mixedGasViscosity, setMixedGasViscosity] = useState<string>("0.015");
  const [mixedLiquidViscosity, setMixedLiquidViscosity] = useState<string>("1.0");
  const [pressureType, setPressureType] = useState<string>("gauge");

  // Get current criteria based on line type
  const currentGasCriteria = useMemo((): GasServiceCriteria | null => {
    return GAS_SERVICE_CRITERIA.find(
      c => c.service === gasServiceType && c.pressureRange === gasPressureRange
    ) || null;
  }, [gasServiceType, gasPressureRange]);

  const currentLiquidCriteria = useMemo((): LiquidServiceCriteria | null => {
    return LIQUID_SERVICE_CRITERIA.find(c => c.service === liquidServiceType) || null;
  }, [liquidServiceType]);

  const currentMixedPhaseCriteria = useMemo((): MixedPhaseServiceCriteria | null => {
    return MIXED_PHASE_SERVICE_CRITERIA.find(c => c.service === mixedPhaseServiceType) || null;
  }, [mixedPhaseServiceType]);

  // Prepare inputs for calculation hook
  const calculationInputs = useMemo((): HydraulicInputs => {
    return {
      lineType,
      unitSystem: unitSystem as UnitSystem,

      // Pipe properties
      pipeLength: parseFloat(pipeLength) || 0,
      lengthUnit,
      nominalDiameter,
      schedule,
      pipeMaterial,
      customRoughness: parseFloat(customRoughness) || 0.0457,
      roughnessUnit,

      // Flow properties
      flowRate: parseFloat(flowRate) || 0,
      flowRateUnit,
      density: parseFloat(density) || 0,
      densityUnit,
      viscosity: parseFloat(viscosity) || 0,
      viscosityUnit,
      selectedFluid,
      fluidTemperature: parseFloat(fluidTemperature) || 15,

      // Gas-specific
      gasServiceType,
      gasPressureRange,
      inletPressure: parseFloat(inletPressure) || 0,
      compressibilityZ: parseFloat(compressibilityZ) || 1.0,
      gasDensity60F: parseFloat(gasDensity60F) || 0.856,
      gasMolecularWeight: parseFloat(gasMolecularWeight) || 20.3,
      baseTemperature: parseFloat(baseTemperature) || 15.56,
      basePressure: parseFloat(basePressure) || 1.01325,
      baseCompressibilityZ: parseFloat(baseCompressibilityZ) || 1.0,

      // Liquid-specific
      liquidServiceType,

      // Mixed-phase specific
      mixedPhaseServiceType,
      mixedGasFlowRate: parseFloat(mixedGasFlowRate) || 0,
      mixedGasFlowRateUnit,
      mixedLiquidFlowRate: parseFloat(mixedLiquidFlowRate) || 0,
      mixedLiquidFlowRateUnit,
      mixedGasDensity: parseFloat(mixedGasDensity) || 0,
      mixedLiquidDensity: parseFloat(mixedLiquidDensity) || 0,
      mixedOpPressure: parseFloat(mixedOpPressure) || 0,
      mixedOpTemp: parseFloat(mixedOpTemp) || 0,
      mixedGasZ: parseFloat(mixedGasZ) || 0,
      mixedGasViscosity: parseFloat(mixedGasViscosity) || 0,
      mixedLiquidViscosity: parseFloat(mixedLiquidViscosity) || 0,
      pressureType,

      // Criteria
      currentGasCriteria,
      currentLiquidCriteria,
      currentMixedPhaseCriteria
    };
  }, [
    lineType, unitSystem, pipeLength, lengthUnit, nominalDiameter, schedule,
    pipeMaterial, customRoughness, roughnessUnit, flowRate, flowRateUnit,
    density, densityUnit, viscosity, viscosityUnit, selectedFluid, fluidTemperature,
    gasServiceType, gasPressureRange, inletPressure, compressibilityZ,
    gasDensity60F, gasMolecularWeight, baseTemperature, basePressure,
    baseCompressibilityZ, liquidServiceType, mixedPhaseServiceType,
    mixedGasFlowRate, mixedGasFlowRateUnit, mixedLiquidFlowRate,
    mixedLiquidFlowRateUnit, mixedGasDensity, mixedLiquidDensity,
    mixedOpPressure, mixedOpTemp, mixedGasZ, mixedGasViscosity,
    mixedLiquidViscosity, pressureType, currentGasCriteria,
    currentLiquidCriteria, currentMixedPhaseCriteria
  ]);

  // Use calculation hook (single source of truth)
  const {
    results,
    validation,
    insideDiameterDisplay,
    availableSchedules,
    mixedPhaseCalc
  } = useHydraulicCalculations(calculationInputs);

  // Handle service type changes for gas
  const handleGasServiceChange = (service: string) => {
    setGasServiceType(service);
    const ranges = GAS_SERVICE_CRITERIA
      .filter(c => c.service === service)
      .map(c => c.pressureRange);
    if (ranges.length > 0 && !ranges.includes(gasPressureRange)) {
      setGasPressureRange(ranges[0]);
    }
  };

  // Handle fluid change
  const handleFluidChange = (value: string) => {
    setSelectedFluid(value);
  };

  // Export functions
  const handleExportPDF = () => {
    // Requires manual field mapping or type update to match original export function
    try {
      if (!results) return;

      // Mapping back to the format expected by the export Utils
      const exportData = {
        lineType,
        date: new Date().toLocaleDateString(),
        nominalDiameter,
        schedule,
        insideDiameterMM: results.insideDiameterMM,
        pipeLength,
        lengthUnit,
        flowRate,
        flowRateUnit,
        inletPressure,
        temperature: fluidTemperature,
        pipeMaterial,
        roughness: pipeMaterial === "Custom" ? parseFloat(customRoughness) : PIPE_ROUGHNESS[pipeMaterial],
        ...results, // Overlays calculation results including velocity, pressureDrop_Pa, frictionFactor etc.
        validation
      };

      generateHydraulicPDF(exportData as any);

      toast({
        title: "PDF Exported",
        description: "Hydraulic sizing datasheet has been downloaded.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Failed",
        description: "An error occurred during PDF generation.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    try {
      if (!results) return;
      const exportData = {
        lineType,
        date: new Date().toLocaleDateString(),
        nominalDiameter,
        schedule,
        insideDiameterMM: results.insideDiameterMM,
        pipeLength,
        lengthUnit,
        flowRate,
        flowRateUnit,
        inletPressure,
        temperature: fluidTemperature,
        pipeMaterial,
        roughness: pipeMaterial === "Custom" ? parseFloat(customRoughness) : PIPE_ROUGHNESS[pipeMaterial],
        ...results,
        validation
      };

      generateHydraulicExcelDatasheet(exportData as any);

      toast({
        title: "Excel Exported",
        description: "Hydraulic sizing datasheet has been downloaded.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Failed",
        description: "An error occurred during Excel generation.",
        variant: "destructive",
      });
    }
  };

  // Determine phase icon and title
  const PhaseIcon = lineType === "gas" ? Wind : lineType === "liquid" ? Droplets : Waves;
  const phaseTitle = lineType === "gas" ? "Gas Line Sizing" :
    lineType === "liquid" ? "Liquid Line Sizing" :
      "Mixed-Phase Line Sizing";
  const phaseSubtitle = "Best Practice Sizing Criteria as per API RP 14E";

  return (
    <div className="space-y-8">
      {/* Title Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 rounded-xl bg-primary/10">
                <PhaseIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                  {lineType === "gas" ? "Gas" : lineType === "liquid" ? "Liquid" : "Mixed-Phase"}{" "}
                  <span className="text-primary">Line Sizing</span>
                </h2>
                <p className="text-muted-foreground">{phaseSubtitle}</p>
              </div>
            </div>

            {/* Unit System Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              <span className={`text-sm font-medium ${unitSystem === 'metric' ? 'text-primary' : 'text-muted-foreground'}`}>
                Metric
              </span>
              <Switch
                checked={unitSystem === 'imperial'}
                onCheckedChange={handleUnitSystemChange}
              />
              <span className={`text-sm font-medium ${unitSystem === 'imperial' ? 'text-primary' : 'text-muted-foreground'}`}>
                Imperial
              </span>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="gap-2"
                disabled={!results}
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-2"
                disabled={!results}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calculator" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-secondary/30 p-1 rounded-full">
            <TabsTrigger value="calculator" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Calculator
            </TabsTrigger>
            <TabsTrigger value="guide" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Standards Guide
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pipe Properties Card */}
            <PipePropertiesCard
              lineType={lineType}
              unitSystem={unitSystem as UnitSystem}
              gasServiceType={gasServiceType}
              onGasServiceChange={handleGasServiceChange}
              gasPressureRange={gasPressureRange}
              onGasPressureRangeChange={setGasPressureRange}
              liquidServiceType={liquidServiceType}
              onLiquidServiceTypeChange={setLiquidServiceType}
              mixedPhaseServiceType={mixedPhaseServiceType}
              onMixedPhaseServiceTypeChange={setMixedPhaseServiceType}
              pipeLength={pipeLength}
              onPipeLengthChange={setPipeLength}
              lengthUnit={lengthUnit}
              onLengthUnitChange={setLengthUnit}
              nominalDiameter={nominalDiameter}
              onNominalDiameterChange={setNominalDiameter}
              schedule={schedule}
              onScheduleChange={setSchedule}
              availableSchedules={availableSchedules}
              pipeMaterial={pipeMaterial}
              onPipeMaterialChange={setPipeMaterial}
              customRoughness={customRoughness}
              onCustomRoughnessChange={setCustomRoughness}
              roughnessUnit={roughnessUnit}
              onRoughnessUnitChange={setRoughnessUnit}
              insideDiameterDisplay={insideDiameterDisplay}
              currentGasCriteria={currentGasCriteria}
              currentLiquidCriteria={currentLiquidCriteria}
              currentMixedPhaseCriteria={currentMixedPhaseCriteria}
            />

            {/* Flow Properties Card */}
            <FlowPropertiesCard
              lineType={lineType}
              unitSystem={unitSystem as UnitSystem}
              selectedFluid={selectedFluid}
              onFluidChange={handleFluidChange}
              fluidTemperature={fluidTemperature}
              onFluidTemperatureChange={setFluidTemperature}
              flowRate={flowRate}
              onFlowRateChange={setFlowRate}
              flowRateUnit={flowRateUnit}
              onFlowRateUnitChange={setFlowRateUnit}
              density={density}
              onDensityChange={setDensity}
              densityUnit={densityUnit}
              onDensityUnitChange={setDensityUnit}
              viscosity={viscosity}
              onViscosityChange={setViscosity}
              viscosityUnit={viscosityUnit}
              onViscosityUnitChange={setViscosityUnit}
              // Gas-specific
              inletPressure={inletPressure}
              onInletPressureChange={setInletPressure}
              compressibilityZ={compressibilityZ}
              onCompressibilityZChange={setCompressibilityZ}
              gasDensity60F={gasDensity60F}
              onGasDensity60FChange={setGasDensity60F}
              gasMolecularWeight={gasMolecularWeight}
              onGasMolecularWeightChange={setGasMolecularWeight}
              baseTemperature={baseTemperature}
              onBaseTemperatureChange={setBaseTemperature}
              basePressure={basePressure}
              onBasePressureChange={setBasePressure}
              baseCompressibilityZ={baseCompressibilityZ}
              onBaseCompressibilityZChange={setBaseCompressibilityZ}
              // Mixed-phase specific
              mixedGasFlowRate={mixedGasFlowRate}
              onMixedGasFlowRateChange={setMixedGasFlowRate}
              mixedGasFlowRateUnit={mixedGasFlowRateUnit}
              onMixedGasFlowRateUnitChange={setMixedGasFlowRateUnit}
              mixedLiquidFlowRate={mixedLiquidFlowRate}
              onMixedLiquidFlowRateChange={setMixedLiquidFlowRate}
              mixedLiquidFlowRateUnit={mixedLiquidFlowRateUnit}
              onMixedLiquidFlowRateUnitChange={setMixedLiquidFlowRateUnit}
              mixedGasDensity={mixedGasDensity}
              onMixedGasDensityChange={setMixedGasDensity}
              mixedLiquidDensity={mixedLiquidDensity}
              onMixedLiquidDensityChange={setMixedLiquidDensity}
              mixedOpPressure={mixedOpPressure}
              onMixedOpPressureChange={setMixedOpPressure}
              mixedOpTemp={mixedOpTemp}
              onMixedOpTempChange={setMixedOpTemp}
              mixedGasZ={mixedGasZ}
              onMixedGasZChange={setMixedGasZ}
              mixedGasViscosity={mixedGasViscosity}
              onMixedGasViscosityChange={setMixedGasViscosity}
              mixedLiquidViscosity={mixedLiquidViscosity}
              onMixedLiquidViscosityChange={setMixedLiquidViscosity}
              pressureType={pressureType}
              onPressureTypeChange={setPressureType}
              mixedPhaseCalc={mixedPhaseCalc}
            />

            {/* Results Card */}
            <ResultsCard
              lineType={lineType}
              results={results}
              validation={validation}
              unitSystem={unitSystem as UnitSystem}
              onPressureUnitChange={setPressureUnit}
            />
          </div>
        </TabsContent>

        <TabsContent value="guide">
          <HydraulicGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HydraulicSizingCalculator;
