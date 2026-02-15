import { Button } from "@/components/ui/button";
import type { UnitSystem } from "@/lib/engineering/unitConversion";

interface UnitSelectorProps {
  value: UnitSystem;
  onChange: (system: UnitSystem) => void;
}

export function UnitSelector({ value, onChange }: UnitSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-md bg-muted" data-testid="unit-selector">
      <Button
        size="sm"
        variant={value === "SI" ? "default" : "ghost"}
        className="toggle-elevate"
        onClick={() => onChange("SI")}
        data-testid="button-unit-si"
      >
        SI Units
      </Button>
      <Button
        size="sm"
        variant={value === "Field" ? "default" : "ghost"}
        className="toggle-elevate"
        onClick={() => onChange("Field")}
        data-testid="button-unit-field"
      >
        Field Units
      </Button>
    </div>
  );
}
