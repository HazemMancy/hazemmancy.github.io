// ==================== PIPING COMPONENTS TYPES ====================

export type UnitSystem = 'metric' | 'imperial';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type PipeSizeUnit = 'inch' | 'mm';

export type FlangeStandard = 'B16.5' | 'B16.47A' | 'B16.47B' | 'B16.36';
export type FittingStandard = 'B16.9' | 'B16.11-THD' | 'B16.11-SW';
export type GasketType = 'flat' | 'spiral' | 'rtj';
export type ValveEndType = 'flanged' | 'buttweld' | 'threaded' | 'socketweld';
export type PipeSelectionMode = 'schedule' | 'wallThickness';

export interface UnitSettings {
  length: UnitSystem;
  temperature: TemperatureUnit;
  pipeSize: PipeSizeUnit;
}

export interface Material {
  id: string;
  name: string;
  spec: string;
  minTemp: number; // °C
  maxTemp: number; // °C
}

// Unit conversion utilities
export const convertLength = (mm: number, system: UnitSystem): number => {
  return system === 'imperial' ? Math.round(mm / 25.4 * 1000) / 1000 : mm;
};

export const convertWeight = (kg: number, system: UnitSystem): number => {
  return system === 'imperial' ? Math.round(kg * 2.20462 * 100) / 100 : kg;
};

export const convertTemperature = (celsius: number, unit: TemperatureUnit): number => {
  return unit === 'fahrenheit' ? Math.round((celsius * 9/5 + 32) * 10) / 10 : celsius;
};

export const getLengthUnit = (system: UnitSystem): string => system === 'imperial' ? 'in' : 'mm';
export const getWeightUnit = (system: UnitSystem): string => system === 'imperial' ? 'lb' : 'kg';
export const getTempUnit = (unit: TemperatureUnit): string => unit === 'fahrenheit' ? '°F' : '°C';

// Format pipe size based on unit preference
export const formatPipeSize = (sizeInch: string, unit: PipeSizeUnit, nominalDN?: number): string => {
  if (unit === 'mm' && nominalDN) {
    return `DN${nominalDN}`;
  }
  return sizeInch;
};

// Materials database per ASME/ASTM standards
export const materials: Material[] = [
  { id: 'cs-a106b', name: 'Carbon Steel', spec: 'A106 Gr.B / A105', minTemp: -29, maxTemp: 427 },
  { id: 'cs-a333-6', name: 'Carbon Steel (LT)', spec: 'A333 Gr.6 / A350 LF2', minTemp: -46, maxTemp: 343 },
  { id: 'ss304', name: 'SS 304/304L', spec: 'A312 TP304L / A182 F304L', minTemp: -196, maxTemp: 538 },
  { id: 'ss316', name: 'SS 316/316L', spec: 'A312 TP316L / A182 F316L', minTemp: -196, maxTemp: 538 },
  { id: 'ss321', name: 'SS 321/321H', spec: 'A312 TP321 / A182 F321', minTemp: -196, maxTemp: 816 },
  { id: 'a11', name: 'Alloy Steel (1¼Cr-½Mo)', spec: 'A335 P11 / A182 F11', minTemp: -29, maxTemp: 593 },
  { id: 'a22', name: 'Alloy Steel (2¼Cr-1Mo)', spec: 'A335 P22 / A182 F22', minTemp: -29, maxTemp: 649 },
  { id: 'a91', name: 'Alloy Steel (9Cr-1Mo-V)', spec: 'A335 P91 / A182 F91', minTemp: -29, maxTemp: 649 },
  { id: 'duplex', name: 'Duplex SS 2205', spec: 'A790 S31803 / A182 F51', minTemp: -46, maxTemp: 316 },
  { id: 'superduplex', name: 'Super Duplex 2507', spec: 'A790 S32750 / A182 F53', minTemp: -46, maxTemp: 260 },
  { id: 'inconel625', name: 'Inconel 625', spec: 'B444 N06625 / B564 N06625', minTemp: -196, maxTemp: 982 },
  { id: 'monel400', name: 'Monel 400', spec: 'B165 N04400 / B564 N04400', minTemp: -196, maxTemp: 538 },
  { id: 'hastelloyc276', name: 'Hastelloy C-276', spec: 'B575 N10276 / B574 N10276', minTemp: -196, maxTemp: 677 },
  { id: 'titanium', name: 'Titanium Gr.2', spec: 'B337 Gr.2 / B381 F2', minTemp: -59, maxTemp: 316 },
];

// Standard pressure classes per ASME
export const pressureClassesB165 = ['150', '300', '600', '900', '1500', '2500'];
export const pressureClassesB1647A = ['150', '300', '400', '600', '900'];
export const pressureClassesB1647B = ['75', '150', '300', '400', '600', '900'];
export const pressureClassesB1636 = ['300', '600', '900', '1500', '2500'];

// Socket weld classes per B16.11
export const socketWeldClasses = ['3000', '6000', '9000'];
// Threaded classes per B16.11
export const threadedClasses = ['2000', '3000', '6000'];
