/**
 * EosGasPropsPanel — Shared Gas Properties Input Panel
 *
 * Provides a unified Manual / Peng-Robinson / SRK gas property input UI
 * used by all gas-capable calculators in this suite. Controlled component:
 * all state lives in the parent.
 *
 * When mode = "manual": shows MW, k, Z, μ inputs + quick gas selector.
 * When mode = "pr" | "srk": shows composition table. Properties (MW, k, Z, μ)
 * are computed automatically when the parent calls resolveGasProps() at
 * calculate time.
 */

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMMON_GASES } from "@/lib/engineering/constants";
import { COMPONENT_DB } from "@/lib/engineering/srkEos";
import type { CompositionEntry } from "@/lib/engineering/srkEos";
import type { GasPropsMode, ManualGasProps } from "@/lib/engineering/eosGasProps";

interface EosGasPropsPanelProps {
  mode: GasPropsMode;
  onModeChange: (mode: GasPropsMode) => void;
  composition: CompositionEntry[];
  onCompositionChange: (composition: CompositionEntry[]) => void;
  manual: ManualGasProps;
  onManualChange: (field: keyof ManualGasProps, value: number) => void;
  showViscosity?: boolean;
  testIdPrefix?: string;
}

export function EosGasPropsPanel({
  mode,
  onModeChange,
  composition,
  onCompositionChange,
  manual,
  onManualChange,
  showViscosity = true,
  testIdPrefix = "gas",
}: EosGasPropsPanelProps) {
  const compositionSum = composition.reduce((s, r) => s + r.moleFraction, 0);
  const sumOk = Math.abs(compositionSum - 1) <= 0.001;

  const addRow = () =>
    onCompositionChange([...composition, { componentId: "N2", moleFraction: 0 }]);

  const removeRow = (i: number) =>
    onCompositionChange(composition.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof CompositionEntry, value: string | number) => {
    const updated = [...composition];
    updated[i] = { ...updated[i], [field]: value };
    onCompositionChange(updated);
  };

  const normalize = () => {
    const sum = composition.reduce((s, r) => s + r.moleFraction, 0);
    if (sum <= 0) return;
    onCompositionChange(composition.map(r => ({ ...r, moleFraction: r.moleFraction / sum })));
  };

  const handleCommonGasSelect = (name: string) => {
    const g = (COMMON_GASES as Record<string, { mw: number; gamma: number }>)[name];
    if (!g) return;
    onManualChange("molecularWeight", g.mw);
    onManualChange("specificHeatRatio", g.gamma);
  };

  const isEos = mode === "pr" || mode === "srk";

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs mb-1.5 block">Gas Properties Mode</Label>
        <Select
          value={mode}
          onValueChange={v => onModeChange(v as GasPropsMode)}
        >
          <SelectTrigger data-testid={`${testIdPrefix}-props-mode`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Input (MW, k, Z{showViscosity ? ", μ" : ""})</SelectItem>
            <SelectItem value="pr">Peng-Robinson EoS — Recommended for O&G (1976)</SelectItem>
            <SelectItem value="srk">SRK EoS — Soave-Redlich-Kwong (1972)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isEos ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-400 font-semibold">
              {mode === "pr"
                ? "PR EoS Composition (Peng-Robinson 1976/1978, Chueh-Prausnitz BIP, Lee-Gonzalez-Eakin viscosity)"
                : "SRK EoS Composition (Graboski-Daubert α, Chueh-Prausnitz BIP, Lee-Gonzalez-Eakin viscosity)"}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline" className="h-6 text-xs px-2"
                onClick={normalize}
                data-testid={`${testIdPrefix}-normalize`}
              >
                Normalize
              </Button>
              <Button
                size="sm" variant="outline" className="h-6 text-xs px-2"
                onClick={addRow}
                data-testid={`${testIdPrefix}-add-component`}
              >
                + Component
              </Button>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground">
            Sum of mole fractions:{" "}
            <span className={sumOk ? "text-green-400" : "text-amber-400 font-bold"}>
              {(compositionSum * 100).toFixed(2)}%
            </span>
            {" "}— must equal 100% before calculating
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-muted/30">
                  <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Component</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Mole Fraction</th>
                  <th className="text-right py-1 pl-2 font-medium text-muted-foreground">MW</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {composition.map((row, i) => {
                  const comp = COMPONENT_DB[row.componentId];
                  return (
                    <tr key={i} className="border-b border-muted/10">
                      <td className="py-1 pr-2">
                        <Select
                          value={row.componentId}
                          onValueChange={v => updateRow(i, "componentId", v)}
                        >
                          <SelectTrigger
                            className="h-6 text-[11px]"
                            data-testid={`${testIdPrefix}-component-${i}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(COMPONENT_DB).map(([id, c]) => (
                              <SelectItem key={id} value={id}>
                                {c.name} ({id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-1 px-2">
                        <NumericInput
                          value={row.moleFraction}
                          step="0.001"
                          onValueChange={v => updateRow(i, "moleFraction", v)}
                          className="h-6 text-[11px] text-right"
                          data-testid={`${testIdPrefix}-mole-fraction-${i}`}
                        />
                      </td>
                      <td className="py-1 pl-2 font-mono text-right text-muted-foreground">
                        {comp ? comp.MW.toFixed(2) : "—"}
                      </td>
                      <td className="py-1 pl-1">
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 w-6 p-0 text-red-400"
                          onClick={() => removeRow(i)}
                          data-testid={`${testIdPrefix}-remove-${i}`}
                        >
                          ×
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-muted-foreground">
            MW, k (Cp/Cv), Z{showViscosity ? ", μ" : ""} computed automatically on Calculate.
            20 O&G species supported. BIPs: Chueh-Prausnitz. Viscosity: Lee-Gonzalez-Eakin (SPE-1340-PA).
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs mb-1.5 block">Quick Gas Select</Label>
            <Select onValueChange={handleCommonGasSelect}>
              <SelectTrigger data-testid={`${testIdPrefix}-gas-select`}>
                <SelectValue placeholder="Select gas..." />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(COMMON_GASES).map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">MW (kg/kmol)</Label>
            <NumericInput
              value={manual.molecularWeight}
              onValueChange={v => onManualChange("molecularWeight", v)}
              data-testid={`${testIdPrefix}-mw`}
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Cp/Cv (k)</Label>
            <NumericInput
              value={manual.specificHeatRatio}
              onValueChange={v => onManualChange("specificHeatRatio", v)}
              data-testid={`${testIdPrefix}-k`}
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Z-factor</Label>
            <NumericInput
              value={manual.compressibilityFactor}
              onValueChange={v => onManualChange("compressibilityFactor", v)}
              data-testid={`${testIdPrefix}-z`}
            />
          </div>
          {showViscosity && (
            <div>
              <Label className="text-xs mb-1.5 block">Viscosity (cP)</Label>
              <NumericInput
                value={manual.viscosity}
                step="0.001"
                onValueChange={v => onManualChange("viscosity", v)}
                data-testid={`${testIdPrefix}-viscosity`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
