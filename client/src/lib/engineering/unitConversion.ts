export type UnitSystem = "SI" | "Field";

export interface UnitDefinition {
  label: string;
  si: string;
  field: string;
  toSI: (val: number) => number;
  fromSI: (val: number) => number;
}

export const UNITS: Record<string, UnitDefinition> = {
  pressure: {
    label: "Pressure",
    si: "bar",
    field: "psi",
    toSI: (psi: number) => psi * 0.0689476,
    fromSI: (bar: number) => bar / 0.0689476,
  },
  temperature: {
    label: "Temperature",
    si: "°C",
    field: "°F",
    toSI: (f: number) => (f - 32) * 5 / 9,
    fromSI: (c: number) => c * 9 / 5 + 32,
  },
  diameter: {
    label: "Diameter",
    si: "mm",
    field: "in",
    toSI: (inches: number) => inches * 25.4,
    fromSI: (mm: number) => mm / 25.4,
  },
  length: {
    label: "Length",
    si: "m",
    field: "ft",
    toSI: (ft: number) => ft * 0.3048,
    fromSI: (m: number) => m / 0.3048,
  },
  velocity: {
    label: "Velocity",
    si: "m/s",
    field: "ft/s",
    toSI: (fts: number) => fts * 0.3048,
    fromSI: (ms: number) => ms / 0.3048,
  },
  flowMass: {
    label: "Mass Flow",
    si: "kg/h",
    field: "lb/h",
    toSI: (lbh: number) => lbh * 0.453592,
    fromSI: (kgh: number) => kgh / 0.453592,
  },
  flowVolume: {
    label: "Volume Flow",
    si: "m³/h",
    field: "bbl/d",
    toSI: (bpd: number) => bpd * 0.158987 / 24,
    fromSI: (m3h: number) => m3h * 24 / 0.158987,
  },
  flowGas: {
    label: "Gas Flow",
    si: "Sm³/h",
    field: "MMSCFD",
    toSI: (mmscfd: number) => mmscfd * 1177.17,
    fromSI: (sm3h: number) => sm3h / 1177.17,
  },
  density: {
    label: "Density",
    si: "kg/m³",
    field: "lb/ft³",
    toSI: (lbft3: number) => lbft3 * 16.0185,
    fromSI: (kgm3: number) => kgm3 / 16.0185,
  },
  viscosity: {
    label: "Viscosity",
    si: "cP",
    field: "cP",
    toSI: (cp: number) => cp,
    fromSI: (cp: number) => cp,
  },
  pressureDrop: {
    label: "Pressure Drop",
    si: "bar/100m",
    field: "psi/100ft",
    toSI: (psi100ft: number) => psi100ft * 0.0689476 / 0.3048,
    fromSI: (bar100m: number) => bar100m * 0.3048 / 0.0689476,
  },
};

export function getUnit(param: string, system: UnitSystem): string {
  const unit = UNITS[param];
  if (!unit) return "";
  return system === "SI" ? unit.si : unit.field;
}

export function convertToSI(param: string, value: number, system: UnitSystem): number {
  if (system === "SI") return value;
  const unit = UNITS[param];
  if (!unit) return value;
  return unit.toSI(value);
}

export function convertFromSI(param: string, value: number, system: UnitSystem): number {
  if (system === "SI") return value;
  const unit = UNITS[param];
  if (!unit) return value;
  return unit.fromSI(value);
}
