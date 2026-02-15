import { UNITS, type UnitSystem } from "./unitConversion";

export type FieldUnitMap = Record<string, string | null>;

export function convertFormValues<T extends { [K in keyof T]: string }>(
  form: T,
  fieldUnitMap: FieldUnitMap,
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): T {
  if (fromSystem === toSystem) return form;

  const converted = { ...form } as Record<string, string>;
  for (const [field, unitKey] of Object.entries(fieldUnitMap)) {
    if (!unitKey || !(field in converted)) continue;
    const val = parseFloat(converted[field]);
    if (isNaN(val) || converted[field] === "") continue;

    const unit = UNITS[unitKey];
    if (!unit) continue;

    let newVal: number;
    if (fromSystem === "SI" && toSystem === "Field") {
      newVal = unit.fromSI(val);
    } else {
      newVal = unit.toSI(val);
    }

    const decimals = Math.abs(newVal) < 0.01 ? 6 : Math.abs(newVal) < 1 ? 4 : Math.abs(newVal) < 100 ? 2 : Math.abs(newVal) < 10000 ? 1 : 0;
    converted[field] = newVal.toFixed(decimals);
  }
  return converted as T;
}
