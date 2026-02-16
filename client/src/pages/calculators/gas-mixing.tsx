import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WarningPanel } from "@/components/engineering/warning-panel";
import { ResultsPanel } from "@/components/engineering/results-panel";
import { AssumptionsPanel } from "@/components/engineering/assumptions-panel";
import {
  calculateGasMixing,
  GAS_MIXING_TEST_CASE,
  type GasMixingResult,
} from "@/lib/engineering/gasMixing";
import { COMMON_GASES } from "@/lib/engineering/constants";
import { FeedbackSection } from "@/components/engineering/feedback-section";
import { Blend, Plus, Trash2, FlaskConical, RotateCcw } from "lucide-react";

interface ComponentRow {
  name: string;
  moleFraction: string;
  molecularWeight: string;
}

const emptyRow: ComponentRow = { name: "", moleFraction: "", molecularWeight: "" };

export default function GasMixingPage() {
  const [components, setComponents] = useState<ComponentRow[]>([
    { ...emptyRow },
    { ...emptyRow },
  ]);
  const [result, setResult] = useState<GasMixingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateComponent = (index: number, field: keyof ComponentRow, value: string) => {
    setComponents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleGasSelect = (index: number, gasName: string) => {
    const gas = COMMON_GASES[gasName];
    if (gas) {
      setComponents((prev) => {
        const next = [...prev];
        next[index] = {
          name: gasName,
          moleFraction: prev[index].moleFraction,
          molecularWeight: String(gas.mw),
        };
        return next;
      });
    }
  };

  const addRow = () => {
    setComponents((prev) => [...prev, { ...emptyRow }]);
  };

  const removeRow = (index: number) => {
    if (components.length <= 2) return;
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const parsed = components.map((c, i) => {
        const mf = parseFloat(c.moleFraction);
        const mw = parseFloat(c.molecularWeight);
        if (isNaN(mf) || isNaN(mw)) throw new Error(`Invalid data in row ${i + 1}`);
        return {
          name: c.name || `Component ${i + 1}`,
          moleFraction: mf,
          molecularWeight: mw,
        };
      });
      const res = calculateGasMixing({ components: parsed });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation error");
      setResult(null);
    }
  };

  const loadTestCase = () => {
    setComponents(
      GAS_MIXING_TEST_CASE.components.map((c) => ({
        name: c.name,
        moleFraction: String(c.moleFraction),
        molecularWeight: String(c.molecularWeight),
      }))
    );
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setComponents([{ ...emptyRow }, { ...emptyRow }]);
    setResult(null);
    setError(null);
  };

  const totalMF = components.reduce((s, c) => s + (parseFloat(c.moleFraction) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Blend className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calc-title">
              Gas Mixing Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Mole fraction weighted MW calculation
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Gas Components</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={loadTestCase} data-testid="button-load-test">
                    <FlaskConical className="w-3.5 h-3.5 mr-1" />
                    Test Case
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-reset">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-[1fr_100px_100px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Component</span>
                <span>Mole Frac.</span>
                <span>MW (kg/kmol)</span>
                <span />
              </div>
              {components.map((comp, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_100px_100px_36px] gap-2 items-center"
                  data-testid={`row-component-${index}`}
                >
                  <Select
                    value={comp.name}
                    onValueChange={(v) => handleGasSelect(index, v)}
                  >
                    <SelectTrigger data-testid={`select-gas-${index}`}>
                      <SelectValue placeholder="Select gas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(COMMON_GASES).map((gas) => (
                        <SelectItem key={gas} value={gas}>
                          {gas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={comp.moleFraction}
                    onChange={(e) => updateComponent(index, "moleFraction", e.target.value)}
                    placeholder="0.0"
                    step="0.01"
                    data-testid={`input-mole-frac-${index}`}
                  />
                  <Input
                    type="number"
                    value={comp.molecularWeight}
                    onChange={(e) => updateComponent(index, "molecularWeight", e.target.value)}
                    placeholder="MW"
                    data-testid={`input-mw-${index}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(index)}
                    disabled={components.length <= 2}
                    data-testid={`button-remove-${index}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <Button size="sm" variant="outline" onClick={addRow} data-testid="button-add-component">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Component
                </Button>
                <span
                  className={`text-xs font-mono ${
                    Math.abs(totalMF - 1) < 0.001
                      ? "text-green-600 dark:text-green-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                  data-testid="text-total-mf"
                >
                  Total: {totalMF.toFixed(4)}
                </span>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                  {error}
                </div>
              )}

              <Button className="w-full" onClick={handleCalculate} data-testid="button-calculate">
                Calculate Mixture Properties
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <WarningPanel warnings={result.warnings} />
              <ResultsPanel
                title="Gas Mixture Results"
                results={[
                  {
                    label: "Mixture Molecular Weight",
                    value: result.mixtureMW,
                    unit: "kg/kmol",
                    highlight: true,
                  },
                  {
                    label: "Original Total Mole Fraction",
                    value: result.totalMoleFraction,
                    unit: "—",
                  },
                  {
                    label: "Was Normalized",
                    value: result.wasNormalized ? "Yes" : "No",
                    unit: "",
                  },
                ]}
                rawData={result}
              />
              <Card>
                <CardHeader className="pb-2">
                  <h4 className="text-sm font-semibold">Component Breakdown</h4>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    {result.components.map((c, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between py-2 px-3 rounded-md text-sm ${
                          i % 2 === 0 ? "bg-muted/50" : ""
                        }`}
                      >
                        <span className="text-muted-foreground truncate mr-2">{c.name}</span>
                        <div className="flex gap-4 text-xs font-mono shrink-0">
                          <span>y={c.moleFraction.toFixed(4)}</span>
                          <span>w={c.massFraction.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          {!result && (
            <Card>
              <CardContent className="py-12 text-center">
                <Blend className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Add components and click Calculate to see mixture properties
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <AssumptionsPanel
          assumptions={[
            "Ideal gas mixing assumed (Amagat's law)",
            "Mixture MW = Σ (yi × MWi) — mole fraction weighted average",
            "Mass fractions calculated from mole fractions and component MWs",
            "Auto-normalization applied if mole fractions do not sum to 1.0",
          ]}
          references={[
            "Perry's Chemical Engineers' Handbook, 9th Edition",
            "GPSA Engineering Data Book, 14th Edition",
            "Smith, Van Ness, Abbott — Introduction to Chemical Engineering Thermodynamics",
          ]}
        />
      </div>

      <FeedbackSection calculatorName="Gas Mixing" />
    </div>
  );
}
