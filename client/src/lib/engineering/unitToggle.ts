import { UNITS, type UnitSystem } from "./unitConversion";

export type FieldUnitMap = Record<string, string | null>;

export function convertFormValues<T extends Record<string, string>>(
  form: T,
  fieldUnitMap: FieldUnitMap,
  fromSystem: UnitSystem,
  toSystem: UnitSystem
): T {
  if (fromSystem === toSystem) return form;

  const converted = { ...form };
  for (const [field, unitKey] of Object.entries(fieldUnitMap)) {
    if (!unitKey || !(field in form)) continue;
    const val = parseFloat(form[field]);
    if (isNaN(val) || form[field] === "") continue;

    const unit = UNITS[unitKey];
    if (!unit) continue;

    let newVal: number;
    if (fromSystem === "SI" && toSystem === "Field") {
      newVal = unit.fromSI(val);
    } else {
      newVal = unit.toSI(val);
    }

    const decimals = Math.abs(newVal) < 0.01 ? 6 : Math.abs(newVal) < 1 ? 4 : Math.abs(newVal) < 100 ? 2 : Math.abs(newVal) < 10000 ? 1 : 0;
    (converted as Record<string, string>)[field] = newVal.toFixed(decimals);
  }
  return converted;
}
