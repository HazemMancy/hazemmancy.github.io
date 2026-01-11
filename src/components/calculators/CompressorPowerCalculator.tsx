import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Info, Gauge, Thermometer, Wind, Zap, TrendingUp, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import CompressorPerformanceCurves from './CompressorPerformanceCurves';
import CompressorSelectionGuide from './CompressorSelectionGuide';
import CompressorGuide from './guides/CompressorGuide';

import { gasDatabase, compressorTypes } from '@/lib/compressorData';
import { calculateCompressorPerformance, convertPressure, convertTemp, CompressorInputs, CalculationResults } from '@/lib/compressorCalculations';
import { generateCompressorPDF, CompressorDatasheetData } from '@/lib/compressorPdfDatasheet';
import { generateCompressorExcelDatasheet, CompressorExcelData } from '@/lib/compressorExcelDatasheet';

const CompressorPowerCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<CompressorInputs>({
    gasType: 'air',
    molecularWeight: 28.97,
    specificHeatRatio: 1.4,
    compressibilityFactor: 1.0,
    criticalTemperature: 132.5,
    criticalPressure: 37.7,
    inletPressure: 1.0,
    inletTemperature: 25,
    dischargePressure: 5.0,
    flowRate: 1000,
    flowUnit: 'nm3h',
    standardCondition: 'NTP',
    pressureUnit: 'bara',
    tempUnit: 'C',
    compressorType: 'centrifugal',
    isentropicEfficiency: 78,
    polytropicEfficiency: 82,
    mechanicalEfficiency: 98,
    motorEfficiency: 95,
    numberOfStages: 1,
    intercoolerApproach: 10
  });

  const [results, setResults] = useState<CalculationResults | null>(null);

  // Metadata for Export
  const [companyName, setCompanyName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [itemNumber, setItemNumber] = useState("");
  const [serviceName, setServiceName] = useState("");

  // Handle gas type selection
  const handleGasTypeChange = (value: string) => {
    const gas = gasDatabase[value];
    setInputs(prev => ({
      ...prev,
      gasType: value,
      molecularWeight: gas.mw,
      specificHeatRatio: gas.k,
      compressibilityFactor: gas.z,
      criticalTemperature: gas.Tc || 0,
      criticalPressure: gas.Pc || 0
    }));
  };

  // Handle compressor type selection
  const handleCompressorTypeChange = (value: string) => {
    const compressor = compressorTypes[value];
    setInputs(prev => ({
      ...prev,
      compressorType: value,
      isentropicEfficiency: compressor.etaIsen * 100,
      polytropicEfficiency: compressor.etaPoly * 100
    }));
  };

  const handleInputChange = (field: keyof CompressorInputs, value: string | number) => {
    // Handle unit conversions for Pressure/Temp units
    if (field === 'pressureUnit') {
      const newUnit = value as string;
      const oldUnit = inputs.pressureUnit;
      if (newUnit !== oldUnit) {
        const p1 = convertPressure(inputs.inletPressure, oldUnit, newUnit);
        const p2 = convertPressure(inputs.dischargePressure, oldUnit, newUnit);
        setInputs(prev => ({
          ...prev,
          pressureUnit: newUnit,
          inletPressure: parseFloat(p1.toFixed(4)),
          dischargePressure: parseFloat(p2.toFixed(4))
        }));
        return;
      }
    }

    if (field === 'tempUnit') {
      const newUnit = value as string;
      const oldUnit = inputs.tempUnit;
      if (newUnit !== oldUnit) {
        const t1 = convertTemp(inputs.inletTemperature, oldUnit, newUnit);
        setInputs(prev => ({
          ...prev,
          tempUnit: newUnit,
          inletTemperature: parseFloat(t1.toFixed(2))
        }));
        return;
      }
    }

    setInputs(prev => ({ ...prev, [field]: value }));
  };

  // Main calculation effect
  useEffect(() => {
    const compressor = compressorTypes[inputs.compressorType];
    const calcResults = calculateCompressorPerformance(inputs, compressor);
    setResults(calcResults);
  }, [inputs]);

  const handleExportPDF = () => {
    if (!results) {
      toast({ title: "Calculations missing", description: "Please perform the calculations before exporting.", variant: "destructive" });
      return;
    }
    // Cast inputs to any to avoid strict type mismatch if library definitions differ slightly
    const datasheetData: any = {
      companyName, projectName, itemNumber, serviceName, date: new Date().toLocaleDateString(),
      ...inputs,
      ...results,
      warnings: results.warnings
    };

    try {
      generateCompressorPDF(datasheetData);
      toast({ title: "PDF Exported", description: "Compressor datasheet initialized successfully." });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  const handleExportExcel = () => {
    if (!results) {
      toast({ title: "Calculations missing", description: "Please perform the calculations before exporting.", variant: "destructive" });
      return;
    }
    const excelData: any = {
      companyName, projectName, itemNumber, serviceName, date: new Date().toLocaleDateString(),
      ...inputs,
      ...results,
      warnings: results.warnings
    };

    try {
      generateCompressorExcelDatasheet(excelData);
      toast({ title: "Excel Exported", description: "Compressor datasheet initialized successfully." });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not generate Excel file.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Compressor Power Calculator</h2>
          <p className="text-muted-foreground">Gas compression power and discharge temperature analysis</p>
        </div>
      </div>

      <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex gap-2 items-start">
        <Info className="h-4 w-4 mt-0.5" />
        <span>
          Screening-level calculations based on API 617 (Dynamic) and API 618 (Reciprocating) correlations.
          Real gas effects are estimated using Lee-Kesler / Schultz method provided critical properties are available.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="gas" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="gas">Gas</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="compressor">Compressor</TabsTrigger>
              <TabsTrigger value="staging">Staging</TabsTrigger>
              <TabsTrigger value="curves">Curves</TabsTrigger>
              <TabsTrigger value="guide">Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="gas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wind className="h-5 w-5 text-primary" />
                    Gas Selection & Properties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gas Type</Label>
                      <Select value={inputs.gasType} onValueChange={handleGasTypeChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(gasDatabase).map(([key, gas]) => (
                            <SelectItem key={key} value={key}>{gas.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Molecular Weight (kg/kmol)</Label>
                      <Input type="number" step="0.01" value={inputs.molecularWeight} onChange={(e) => handleInputChange('molecularWeight', parseFloat(e.target.value) || 0)} disabled={inputs.gasType !== 'custom'} />
                    </div>
                    <div className="space-y-2">
                      <Label>Specific Heat Ratio (k)</Label>
                      <Input type="number" step="0.01" value={inputs.specificHeatRatio} onChange={(e) => handleInputChange('specificHeatRatio', parseFloat(e.target.value) || 0)} disabled={inputs.gasType !== 'custom'} />
                    </div>
                    <div className="space-y-2">
                      <Label>Compressibility Factor (Z)</Label>
                      <Input type="number" step="0.01" value={inputs.compressibilityFactor} onChange={(e) => handleInputChange('compressibilityFactor', parseFloat(e.target.value) || 0)} disabled={inputs.gasType !== 'custom'} />
                    </div>

                    {/* Critical Properties - Only editable for custom, visible for all */}
                    <div className="space-y-2">
                      <Label className={inputs.gasType === 'custom' ? "text-primary" : ""}>Critical Temp Tc (K)</Label>
                      <Input type="number" step="0.1" value={inputs.criticalTemperature} onChange={(e) => handleInputChange('criticalTemperature', parseFloat(e.target.value) || 0)} disabled={inputs.gasType !== 'custom'} />
                    </div>
                    <div className="space-y-2">
                      <Label className={inputs.gasType === 'custom' ? "text-primary" : ""}>Critical Press Pc (bar)</Label>
                      <Input type="number" step="0.1" value={inputs.criticalPressure} onChange={(e) => handleInputChange('criticalPressure', parseFloat(e.target.value) || 0)} disabled={inputs.gasType !== 'custom'} />
                    </div>
                  </div>
                  {inputs.gasType === 'custom' && (inputs.criticalTemperature < 1 || inputs.criticalPressure < 1) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Missing Critical Properties</AlertTitle>
                      <AlertDescription>Real gas calculations (Lee-Kesler) require critical temperature and pressure. Calculations will revert to Ideal Gas / Constant Z.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" />Operating Conditions</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Suction Pressure</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={inputs.inletPressure} onChange={(e) => handleInputChange('inletPressure', parseFloat(e.target.value))} />
                        <Select value={inputs.pressureUnit} onValueChange={(v) => handleInputChange('pressureUnit', v)}>
                          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bara">bara</SelectItem>
                            <SelectItem value="barg">barg</SelectItem>
                            <SelectItem value="psia">psia</SelectItem>
                            <SelectItem value="psig">psig</SelectItem>
                            <SelectItem value="kPa">kPa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Discharge Pressure</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={inputs.dischargePressure} onChange={(e) => handleInputChange('dischargePressure', parseFloat(e.target.value))} />
                        <div className="flex items-center px-3 bg-muted rounded-md text-sm w-[100px] justify-center">{inputs.pressureUnit}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Suction Temperature</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={inputs.inletTemperature} onChange={(e) => handleInputChange('inletTemperature', parseFloat(e.target.value))} />
                        <Select value={inputs.tempUnit} onValueChange={(v) => handleInputChange('tempUnit', v)}>
                          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="C">°C</SelectItem>
                            <SelectItem value="F">°F</SelectItem>
                            <SelectItem value="K">K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Flow Rate</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={inputs.flowRate} onChange={(e) => handleInputChange('flowRate', parseFloat(e.target.value))} />
                        <Select value={inputs.flowUnit} onValueChange={(v) => handleInputChange('flowUnit', v)}>
                          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nm3h">Nm³/h</SelectItem>
                            <SelectItem value="sm3h">Sm³/h</SelectItem>
                            <SelectItem value="am3h">Am³/h</SelectItem>
                            <SelectItem value="kgh">kg/h</SelectItem>
                            <SelectItem value="scfm">SCFM</SelectItem>
                            <SelectItem value="acfm">ACFM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Standard Condition (for Normal/Standard units)</Label>
                    <Select value={inputs.standardCondition} onValueChange={(v) => handleInputChange('standardCondition', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NTP">NTP (15°C, 1 atm)</SelectItem>
                        <SelectItem value="ISO">ISO (0°C, 1 atm)</SelectItem>
                        <SelectItem value="SCFM">SCFM (60°F, 1 atm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compressor" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Machine Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Compressor Type</Label>
                    <Select value={inputs.compressorType} onValueChange={handleCompressorTypeChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(compressorTypes).map(([key, type]) => (
                          <SelectItem key={key} value={key}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Isentropic Eff (%)</Label>
                      <Input type="number" value={inputs.isentropicEfficiency} onChange={(e) => handleInputChange('isentropicEfficiency', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Polytropic Eff (%)</Label>
                      <Input type="number" value={inputs.polytropicEfficiency} onChange={(e) => handleInputChange('polytropicEfficiency', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mechanical Eff (%)</Label>
                      <Input type="number" value={inputs.mechanicalEfficiency} onChange={(e) => handleInputChange('mechanicalEfficiency', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Motor Eff (%)</Label>
                      <Input type="number" value={inputs.motorEfficiency} onChange={(e) => handleInputChange('motorEfficiency', parseFloat(e.target.value))} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Export Card */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Project Details & Export</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Project Name" value={projectName} onChange={e => setProjectName(e.target.value)} />
                    <Input placeholder="Service Name" value={serviceName} onChange={e => setServiceName(e.target.value)} />
                    <Input placeholder="Item Number" value={itemNumber} onChange={e => setItemNumber(e.target.value)} />
                    <Input placeholder="Company" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleExportPDF}>Export PDF</Button>
                    <Button variant="outline" className="flex-1" onClick={handleExportExcel}>Export Excel</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="staging" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Multistage Compression</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Number of Stages</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[inputs.numberOfStages]}
                        min={1} max={10} step={1}
                        onValueChange={(v) => handleInputChange('numberOfStages', v[0])}
                        className="flex-1"
                      />
                      <span className="font-bold w-8">{inputs.numberOfStages}</span>
                    </div>
                  </div>
                  {inputs.numberOfStages > 1 && (
                    <div className="space-y-2">
                      <Label>Intercooler Approach Temperature (°C)</Label>
                      <Input type="number" value={inputs.intercoolerApproach} onChange={(e) => handleInputChange('intercoolerApproach', parseFloat(e.target.value))} />
                      <p className="text-xs text-muted-foreground">Temperature above Inlet T1 after intercooling</p>
                    </div>
                  )}
                  {results && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Stage Performance</h4>
                      <p className="text-sm">Ratio per Stage: <span className="font-mono">{results.ratioPerStage.toFixed(2)}</span></p>
                      <div className="mt-2 text-xs">
                        <span className="font-medium">Approx Discharge Temps:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {results.dischargeTempPerStage.map((t, i) => (
                            <Badge key={i} variant={t > 150 ? "destructive" : "secondary"}>Stg {i + 1}: {t.toFixed(1)}°C</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curves">
              {results && (
                <CompressorPerformanceCurves
                  operatingFlow={results.actualFlow}
                  operatingHead={results.polytropicHead * 1000} // Convert back to kJ/kg for display consistency if needed? Head in results is kJ/kg
                  operatingEfficiency={results.adiabaticEfficiency}
                  compressionRatio={results.compressionRatio}
                  compressorType={inputs.compressorType}
                  shaftPower={results.shaftPower}
                  surgeFlow={results.surgeFlow}
                  stonewallFlow={results.stonewallFlow}
                />
              )}
            </TabsContent>

            <TabsContent value="guide">
              <CompressorGuide />
            </TabsContent>

          </Tabs>
        </div>

        {/* Results Sidebar */}
        <div>
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!results ? (
                <div className="text-sm text-muted-foreground text-center py-8">Enter parameters to calculate</div>
              ) : (
                <>
                  {results.warnings.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 text-xs text-yellow-700 dark:text-yellow-400 mb-4">
                      <strong>Warnings:</strong>
                      <ul className="list-disc pl-4 mt-1">
                        {results.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-muted-foreground">Power (Motor)</div>
                    <div className="text-right font-bold text-primary">{results.motorPower.toFixed(1)} kW</div>

                    <div className="text-muted-foreground">Shaft Power</div>
                    <div className="text-right">{results.shaftPower.toFixed(1)} kW</div>

                    <div className="text-muted-foreground">Discharge Temp</div>
                    <div className={`text-right font-bold ${results.dischargeTemp > 150 ? 'text-red-500' : ''}`}>
                      {results.dischargeTemp.toFixed(1)} °C
                    </div>

                    <div className="text-muted-foreground">Polytropic Head</div>
                    <div className="text-right">{results.polytropicHead.toFixed(1)} kJ/kg</div>

                    <div className="text-muted-foreground">Compression Ratio</div>
                    <div className="text-right">{results.compressionRatio.toFixed(2)}</div>

                    <div className="text-muted-foreground">Poly Exponent (n)</div>
                    <div className="text-right">{results.polytropicExponent.toFixed(3)}</div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-xs">
                    <h4 className="font-semibold text-muted-foreground">Gas Analysis</h4>
                    <div className="grid grid-cols-2 gap-1">
                      <span>Schultz Factor (f)</span>
                      <span className="text-right font-mono">{results.schultzFactor.toFixed(3)}</span>

                      <span>Compressibility Z1</span>
                      <span className="text-right font-mono">{results.inletDensity > 0 ? (results.inletDensity === 0 ? '-' : (inputs.inletPressure * 1e5 / (results.inletDensity * (8314.46 / inputs.molecularWeight) * (inputs.inletTemperature + 273.15))).toFixed(3)) : '-'}</span>

                      <span>Inlet Density</span>
                      <span className="text-right font-mono">{results.inletDensity.toFixed(2)} kg/m³</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Selection Guide</CardTitle></CardHeader>
            <CardContent>
              <CompressorSelectionGuide
                flowRate={results ? results.actualFlow : 0}
                compressionRatio={results ? results.compressionRatio : 1}
                molecularWeight={inputs.molecularWeight}
                dischargePressure={convertPressure(inputs.dischargePressure, inputs.pressureUnit, 'bara')}
                gasType={inputs.gasType}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompressorPowerCalculator;
