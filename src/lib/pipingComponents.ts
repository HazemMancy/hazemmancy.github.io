/**
 * Piping Components Database - ASME B36.10M / B16 Series
 * Comprehensive dimensional data for flanges, fittings, gaskets, valves, and more
 */

// ============= FLANGES (ASME B16.5 / B16.47) =============

export interface FlangeData {
  size: string;
  nominalDN: number;
  pressureClass: string;
  outerDiameter: number;      // mm
  boltCircleDiameter: number; // mm
  numBolts: number;
  boltSize: string;
  hubDiameter: number;        // mm (raised face diameter for WN)
  thickness: number;          // mm (flange thickness)
  raisedFaceHeight: number;   // mm
  raisedFaceDiameter: number; // mm
  neckOD: number;             // mm (for weld neck)
  weight: number;             // kg (approximate)
}

export const flangeData: FlangeData[] = [
  // Class 150
  { size: '1/2"', nominalDN: 15, pressureClass: '150', outerDiameter: 89, boltCircleDiameter: 60.3, numBolts: 4, boltSize: '1/2"', hubDiameter: 35, thickness: 11, raisedFaceHeight: 2, raisedFaceDiameter: 35, neckOD: 21.3, weight: 0.5 },
  { size: '3/4"', nominalDN: 20, pressureClass: '150', outerDiameter: 98, boltCircleDiameter: 69.8, numBolts: 4, boltSize: '1/2"', hubDiameter: 43, thickness: 13, raisedFaceHeight: 2, raisedFaceDiameter: 43, neckOD: 26.7, weight: 0.7 },
  { size: '1"', nominalDN: 25, pressureClass: '150', outerDiameter: 108, boltCircleDiameter: 79.4, numBolts: 4, boltSize: '1/2"', hubDiameter: 51, thickness: 14, raisedFaceHeight: 2, raisedFaceDiameter: 51, neckOD: 33.4, weight: 0.9 },
  { size: '1-1/4"', nominalDN: 32, pressureClass: '150', outerDiameter: 117, boltCircleDiameter: 88.9, numBolts: 4, boltSize: '1/2"', hubDiameter: 64, thickness: 16, raisedFaceHeight: 2, raisedFaceDiameter: 64, neckOD: 42.2, weight: 1.2 },
  { size: '1-1/2"', nominalDN: 40, pressureClass: '150', outerDiameter: 127, boltCircleDiameter: 98.4, numBolts: 4, boltSize: '1/2"', hubDiameter: 73, thickness: 18, raisedFaceHeight: 2, raisedFaceDiameter: 73, neckOD: 48.3, weight: 1.5 },
  { size: '2"', nominalDN: 50, pressureClass: '150', outerDiameter: 152, boltCircleDiameter: 120.6, numBolts: 4, boltSize: '5/8"', hubDiameter: 92, thickness: 19, raisedFaceHeight: 2, raisedFaceDiameter: 92, neckOD: 60.3, weight: 2.3 },
  { size: '2-1/2"', nominalDN: 65, pressureClass: '150', outerDiameter: 178, boltCircleDiameter: 139.7, numBolts: 4, boltSize: '5/8"', hubDiameter: 105, thickness: 22, raisedFaceHeight: 2, raisedFaceDiameter: 105, neckOD: 73, weight: 3.4 },
  { size: '3"', nominalDN: 80, pressureClass: '150', outerDiameter: 190, boltCircleDiameter: 152.4, numBolts: 4, boltSize: '5/8"', hubDiameter: 127, thickness: 24, raisedFaceHeight: 2, raisedFaceDiameter: 127, neckOD: 88.9, weight: 4.3 },
  { size: '4"', nominalDN: 100, pressureClass: '150', outerDiameter: 229, boltCircleDiameter: 190.5, numBolts: 8, boltSize: '5/8"', hubDiameter: 157, thickness: 24, raisedFaceHeight: 2, raisedFaceDiameter: 157, neckOD: 114.3, weight: 6.0 },
  { size: '6"', nominalDN: 150, pressureClass: '150', outerDiameter: 279, boltCircleDiameter: 241.3, numBolts: 8, boltSize: '3/4"', hubDiameter: 216, thickness: 25, raisedFaceHeight: 2, raisedFaceDiameter: 216, neckOD: 168.3, weight: 9.5 },
  { size: '8"', nominalDN: 200, pressureClass: '150', outerDiameter: 343, boltCircleDiameter: 298.4, numBolts: 8, boltSize: '3/4"', hubDiameter: 270, thickness: 29, raisedFaceHeight: 2, raisedFaceDiameter: 270, neckOD: 219.1, weight: 16 },
  { size: '10"', nominalDN: 250, pressureClass: '150', outerDiameter: 406, boltCircleDiameter: 362, numBolts: 12, boltSize: '7/8"', hubDiameter: 324, thickness: 30, raisedFaceHeight: 2, raisedFaceDiameter: 324, neckOD: 273.1, weight: 24 },
  { size: '12"', nominalDN: 300, pressureClass: '150', outerDiameter: 483, boltCircleDiameter: 431.8, numBolts: 12, boltSize: '7/8"', hubDiameter: 381, thickness: 32, raisedFaceHeight: 2, raisedFaceDiameter: 381, neckOD: 323.9, weight: 35 },
  { size: '14"', nominalDN: 350, pressureClass: '150', outerDiameter: 533, boltCircleDiameter: 476.2, numBolts: 12, boltSize: '1"', hubDiameter: 413, thickness: 35, raisedFaceHeight: 2, raisedFaceDiameter: 413, neckOD: 355.6, weight: 44 },
  { size: '16"', nominalDN: 400, pressureClass: '150', outerDiameter: 597, boltCircleDiameter: 539.8, numBolts: 16, boltSize: '1"', hubDiameter: 470, thickness: 37, raisedFaceHeight: 2, raisedFaceDiameter: 470, neckOD: 406.4, weight: 55 },
  { size: '18"', nominalDN: 450, pressureClass: '150', outerDiameter: 635, boltCircleDiameter: 577.8, numBolts: 16, boltSize: '1-1/8"', hubDiameter: 533, thickness: 40, raisedFaceHeight: 2, raisedFaceDiameter: 533, neckOD: 457.2, weight: 70 },
  { size: '20"', nominalDN: 500, pressureClass: '150', outerDiameter: 699, boltCircleDiameter: 635, numBolts: 20, boltSize: '1-1/8"', hubDiameter: 584, thickness: 43, raisedFaceHeight: 2, raisedFaceDiameter: 584, neckOD: 508, weight: 90 },
  { size: '24"', nominalDN: 600, pressureClass: '150', outerDiameter: 813, boltCircleDiameter: 749.3, numBolts: 20, boltSize: '1-1/4"', hubDiameter: 692, thickness: 48, raisedFaceHeight: 2, raisedFaceDiameter: 692, neckOD: 609.6, weight: 130 },
  
  // Class 300
  { size: '1/2"', nominalDN: 15, pressureClass: '300', outerDiameter: 95, boltCircleDiameter: 66.7, numBolts: 4, boltSize: '1/2"', hubDiameter: 38, thickness: 14, raisedFaceHeight: 2, raisedFaceDiameter: 38, neckOD: 21.3, weight: 0.7 },
  { size: '3/4"', nominalDN: 20, pressureClass: '300', outerDiameter: 117, boltCircleDiameter: 82.6, numBolts: 4, boltSize: '5/8"', hubDiameter: 48, thickness: 16, raisedFaceHeight: 2, raisedFaceDiameter: 48, neckOD: 26.7, weight: 1.0 },
  { size: '1"', nominalDN: 25, pressureClass: '300', outerDiameter: 124, boltCircleDiameter: 88.9, numBolts: 4, boltSize: '5/8"', hubDiameter: 54, thickness: 18, raisedFaceHeight: 2, raisedFaceDiameter: 54, neckOD: 33.4, weight: 1.3 },
  { size: '1-1/2"', nominalDN: 40, pressureClass: '300', outerDiameter: 156, boltCircleDiameter: 114.3, numBolts: 4, boltSize: '3/4"', hubDiameter: 79, thickness: 22, raisedFaceHeight: 2, raisedFaceDiameter: 79, neckOD: 48.3, weight: 2.4 },
  { size: '2"', nominalDN: 50, pressureClass: '300', outerDiameter: 165, boltCircleDiameter: 127, numBolts: 8, boltSize: '5/8"', hubDiameter: 92, thickness: 25, raisedFaceHeight: 2, raisedFaceDiameter: 92, neckOD: 60.3, weight: 3.3 },
  { size: '3"', nominalDN: 80, pressureClass: '300', outerDiameter: 210, boltCircleDiameter: 168.3, numBolts: 8, boltSize: '3/4"', hubDiameter: 127, thickness: 29, raisedFaceHeight: 2, raisedFaceDiameter: 127, neckOD: 88.9, weight: 6.4 },
  { size: '4"', nominalDN: 100, pressureClass: '300', outerDiameter: 254, boltCircleDiameter: 200, numBolts: 8, boltSize: '3/4"', hubDiameter: 157, thickness: 32, raisedFaceHeight: 2, raisedFaceDiameter: 157, neckOD: 114.3, weight: 9.7 },
  { size: '6"', nominalDN: 150, pressureClass: '300', outerDiameter: 318, boltCircleDiameter: 269.9, numBolts: 12, boltSize: '3/4"', hubDiameter: 216, thickness: 37, raisedFaceHeight: 2, raisedFaceDiameter: 216, neckOD: 168.3, weight: 18 },
  { size: '8"', nominalDN: 200, pressureClass: '300', outerDiameter: 381, boltCircleDiameter: 330.2, numBolts: 12, boltSize: '7/8"', hubDiameter: 270, thickness: 41, raisedFaceHeight: 2, raisedFaceDiameter: 270, neckOD: 219.1, weight: 29 },
  { size: '10"', nominalDN: 250, pressureClass: '300', outerDiameter: 445, boltCircleDiameter: 387.4, numBolts: 16, boltSize: '1"', hubDiameter: 324, thickness: 48, raisedFaceHeight: 2, raisedFaceDiameter: 324, neckOD: 273.1, weight: 45 },
  { size: '12"', nominalDN: 300, pressureClass: '300', outerDiameter: 521, boltCircleDiameter: 450.8, numBolts: 16, boltSize: '1-1/8"', hubDiameter: 381, thickness: 51, raisedFaceHeight: 2, raisedFaceDiameter: 381, neckOD: 323.9, weight: 65 },
  
  // Class 600
  { size: '1/2"', nominalDN: 15, pressureClass: '600', outerDiameter: 95, boltCircleDiameter: 66.7, numBolts: 4, boltSize: '1/2"', hubDiameter: 38, thickness: 14, raisedFaceHeight: 7, raisedFaceDiameter: 38, neckOD: 21.3, weight: 0.8 },
  { size: '1"', nominalDN: 25, pressureClass: '600', outerDiameter: 124, boltCircleDiameter: 88.9, numBolts: 4, boltSize: '5/8"', hubDiameter: 54, thickness: 22, raisedFaceHeight: 7, raisedFaceDiameter: 54, neckOD: 33.4, weight: 1.6 },
  { size: '2"', nominalDN: 50, pressureClass: '600', outerDiameter: 165, boltCircleDiameter: 127, numBolts: 8, boltSize: '5/8"', hubDiameter: 92, thickness: 29, raisedFaceHeight: 7, raisedFaceDiameter: 92, neckOD: 60.3, weight: 4.0 },
  { size: '3"', nominalDN: 80, pressureClass: '600', outerDiameter: 210, boltCircleDiameter: 168.3, numBolts: 8, boltSize: '3/4"', hubDiameter: 127, thickness: 35, raisedFaceHeight: 7, raisedFaceDiameter: 127, neckOD: 88.9, weight: 8.0 },
  { size: '4"', nominalDN: 100, pressureClass: '600', outerDiameter: 273, boltCircleDiameter: 215.9, numBolts: 8, boltSize: '7/8"', hubDiameter: 157, thickness: 41, raisedFaceHeight: 7, raisedFaceDiameter: 157, neckOD: 114.3, weight: 14 },
  { size: '6"', nominalDN: 150, pressureClass: '600', outerDiameter: 356, boltCircleDiameter: 292.1, numBolts: 12, boltSize: '1"', hubDiameter: 216, thickness: 48, raisedFaceHeight: 7, raisedFaceDiameter: 216, neckOD: 168.3, weight: 28 },
  { size: '8"', nominalDN: 200, pressureClass: '600', outerDiameter: 419, boltCircleDiameter: 349.2, numBolts: 12, boltSize: '1-1/8"', hubDiameter: 270, thickness: 56, raisedFaceHeight: 7, raisedFaceDiameter: 270, neckOD: 219.1, weight: 48 },
  { size: '10"', nominalDN: 250, pressureClass: '600', outerDiameter: 508, boltCircleDiameter: 431.8, numBolts: 16, boltSize: '1-1/4"', hubDiameter: 324, thickness: 63, raisedFaceHeight: 7, raisedFaceDiameter: 324, neckOD: 273.1, weight: 80 },
  { size: '12"', nominalDN: 300, pressureClass: '600', outerDiameter: 559, boltCircleDiameter: 489, numBolts: 20, boltSize: '1-1/4"', hubDiameter: 381, thickness: 67, raisedFaceHeight: 7, raisedFaceDiameter: 381, neckOD: 323.9, weight: 110 },
];

export const flangeTypes = [
  { id: 'wn', name: 'Weld Neck', abbr: 'WN' },
  { id: 'so', name: 'Slip-On', abbr: 'SO' },
  { id: 'sw', name: 'Socket Weld', abbr: 'SW' },
  { id: 'th', name: 'Threaded', abbr: 'TH' },
  { id: 'bl', name: 'Blind', abbr: 'BL' },
  { id: 'lj', name: 'Lap Joint', abbr: 'LJ' },
];

export const pressureClasses = ['150', '300', '600', '900', '1500', '2500'];

// ============= FITTINGS (ASME B16.9) =============

export interface FittingData {
  size: string;
  nominalDN: number;
  type: string;
  schedule: string;
  centerToEnd: number;      // A dimension (mm)
  centerToCenter?: number;  // C dimension for tees (mm)
  outerDiameter: number;    // mm
  weight: number;           // kg
}

export const elbowData: FittingData[] = [
  // 90° Long Radius Elbows (Sch 40)
  { size: '1/2"', nominalDN: 15, type: '90LR', schedule: '40', centerToEnd: 22, outerDiameter: 21.3, weight: 0.08 },
  { size: '3/4"', nominalDN: 20, type: '90LR', schedule: '40', centerToEnd: 29, outerDiameter: 26.7, weight: 0.12 },
  { size: '1"', nominalDN: 25, type: '90LR', schedule: '40', centerToEnd: 38, outerDiameter: 33.4, weight: 0.2 },
  { size: '1-1/2"', nominalDN: 40, type: '90LR', schedule: '40', centerToEnd: 57, outerDiameter: 48.3, weight: 0.5 },
  { size: '2"', nominalDN: 50, type: '90LR', schedule: '40', centerToEnd: 76, outerDiameter: 60.3, weight: 0.9 },
  { size: '3"', nominalDN: 80, type: '90LR', schedule: '40', centerToEnd: 114, outerDiameter: 88.9, weight: 2.2 },
  { size: '4"', nominalDN: 100, type: '90LR', schedule: '40', centerToEnd: 152, outerDiameter: 114.3, weight: 4.3 },
  { size: '6"', nominalDN: 150, type: '90LR', schedule: '40', centerToEnd: 229, outerDiameter: 168.3, weight: 12 },
  { size: '8"', nominalDN: 200, type: '90LR', schedule: '40', centerToEnd: 305, outerDiameter: 219.1, weight: 25 },
  { size: '10"', nominalDN: 250, type: '90LR', schedule: '40', centerToEnd: 381, outerDiameter: 273.1, weight: 45 },
  { size: '12"', nominalDN: 300, type: '90LR', schedule: '40', centerToEnd: 457, outerDiameter: 323.9, weight: 70 },
  { size: '14"', nominalDN: 350, type: '90LR', schedule: '40', centerToEnd: 533, outerDiameter: 355.6, weight: 95 },
  { size: '16"', nominalDN: 400, type: '90LR', schedule: '40', centerToEnd: 610, outerDiameter: 406.4, weight: 130 },
  { size: '18"', nominalDN: 450, type: '90LR', schedule: '40', centerToEnd: 686, outerDiameter: 457.2, weight: 175 },
  { size: '20"', nominalDN: 500, type: '90LR', schedule: '40', centerToEnd: 762, outerDiameter: 508, weight: 230 },
  { size: '24"', nominalDN: 600, type: '90LR', schedule: '40', centerToEnd: 914, outerDiameter: 609.6, weight: 380 },
  
  // 45° Long Radius Elbows (Sch 40)
  { size: '1/2"', nominalDN: 15, type: '45LR', schedule: '40', centerToEnd: 16, outerDiameter: 21.3, weight: 0.05 },
  { size: '3/4"', nominalDN: 20, type: '45LR', schedule: '40', centerToEnd: 19, outerDiameter: 26.7, weight: 0.07 },
  { size: '1"', nominalDN: 25, type: '45LR', schedule: '40', centerToEnd: 22, outerDiameter: 33.4, weight: 0.11 },
  { size: '1-1/2"', nominalDN: 40, type: '45LR', schedule: '40', centerToEnd: 29, outerDiameter: 48.3, weight: 0.27 },
  { size: '2"', nominalDN: 50, type: '45LR', schedule: '40', centerToEnd: 35, outerDiameter: 60.3, weight: 0.45 },
  { size: '3"', nominalDN: 80, type: '45LR', schedule: '40', centerToEnd: 48, outerDiameter: 88.9, weight: 1.1 },
  { size: '4"', nominalDN: 100, type: '45LR', schedule: '40', centerToEnd: 60, outerDiameter: 114.3, weight: 2.0 },
  { size: '6"', nominalDN: 150, type: '45LR', schedule: '40', centerToEnd: 83, outerDiameter: 168.3, weight: 5.5 },
  { size: '8"', nominalDN: 200, type: '45LR', schedule: '40', centerToEnd: 105, outerDiameter: 219.1, weight: 11 },
  { size: '10"', nominalDN: 250, type: '45LR', schedule: '40', centerToEnd: 127, outerDiameter: 273.1, weight: 20 },
  { size: '12"', nominalDN: 300, type: '45LR', schedule: '40', centerToEnd: 152, outerDiameter: 323.9, weight: 32 },
];

export interface TeeData {
  size: string;
  nominalDN: number;
  type: string;
  schedule: string;
  centerToEnd: number;      // C (run) dimension (mm)
  centerToBranch: number;   // M (branch) dimension (mm)
  outerDiameter: number;    // mm
  weight: number;           // kg
}

export const teeData: TeeData[] = [
  { size: '1/2"', nominalDN: 15, type: 'Equal', schedule: '40', centerToEnd: 25, centerToBranch: 25, outerDiameter: 21.3, weight: 0.1 },
  { size: '3/4"', nominalDN: 20, type: 'Equal', schedule: '40', centerToEnd: 29, centerToBranch: 29, outerDiameter: 26.7, weight: 0.16 },
  { size: '1"', nominalDN: 25, type: 'Equal', schedule: '40', centerToEnd: 38, centerToBranch: 38, outerDiameter: 33.4, weight: 0.28 },
  { size: '1-1/2"', nominalDN: 40, type: 'Equal', schedule: '40', centerToEnd: 48, centerToBranch: 48, outerDiameter: 48.3, weight: 0.68 },
  { size: '2"', nominalDN: 50, type: 'Equal', schedule: '40', centerToEnd: 57, centerToBranch: 57, outerDiameter: 60.3, weight: 1.2 },
  { size: '3"', nominalDN: 80, type: 'Equal', schedule: '40', centerToEnd: 76, centerToBranch: 76, outerDiameter: 88.9, weight: 3.0 },
  { size: '4"', nominalDN: 100, type: 'Equal', schedule: '40', centerToEnd: 95, centerToBranch: 95, outerDiameter: 114.3, weight: 5.5 },
  { size: '6"', nominalDN: 150, type: 'Equal', schedule: '40', centerToEnd: 114, centerToBranch: 114, outerDiameter: 168.3, weight: 14 },
  { size: '8"', nominalDN: 200, type: 'Equal', schedule: '40', centerToEnd: 152, centerToBranch: 152, outerDiameter: 219.1, weight: 28 },
  { size: '10"', nominalDN: 250, type: 'Equal', schedule: '40', centerToEnd: 191, centerToBranch: 191, outerDiameter: 273.1, weight: 50 },
  { size: '12"', nominalDN: 300, type: 'Equal', schedule: '40', centerToEnd: 229, centerToBranch: 229, outerDiameter: 323.9, weight: 80 },
];

export interface ReducerData {
  sizeFrom: string;
  sizeTo: string;
  type: string;
  schedule: string;
  length: number;         // H dimension (mm)
  largeEndOD: number;     // mm
  smallEndOD: number;     // mm
  weight: number;         // kg
}

export const reducerData: ReducerData[] = [
  { sizeFrom: '3/4"', sizeTo: '1/2"', type: 'Concentric', schedule: '40', length: 51, largeEndOD: 26.7, smallEndOD: 21.3, weight: 0.08 },
  { sizeFrom: '1"', sizeTo: '1/2"', type: 'Concentric', schedule: '40', length: 51, largeEndOD: 33.4, smallEndOD: 21.3, weight: 0.12 },
  { sizeFrom: '1"', sizeTo: '3/4"', type: 'Concentric', schedule: '40', length: 51, largeEndOD: 33.4, smallEndOD: 26.7, weight: 0.12 },
  { sizeFrom: '2"', sizeTo: '1"', type: 'Concentric', schedule: '40', length: 76, largeEndOD: 60.3, smallEndOD: 33.4, weight: 0.4 },
  { sizeFrom: '2"', sizeTo: '1-1/2"', type: 'Concentric', schedule: '40', length: 76, largeEndOD: 60.3, smallEndOD: 48.3, weight: 0.45 },
  { sizeFrom: '3"', sizeTo: '2"', type: 'Concentric', schedule: '40', length: 89, largeEndOD: 88.9, smallEndOD: 60.3, weight: 0.9 },
  { sizeFrom: '4"', sizeTo: '2"', type: 'Concentric', schedule: '40', length: 102, largeEndOD: 114.3, smallEndOD: 60.3, weight: 1.5 },
  { sizeFrom: '4"', sizeTo: '3"', type: 'Concentric', schedule: '40', length: 102, largeEndOD: 114.3, smallEndOD: 88.9, weight: 1.8 },
  { sizeFrom: '6"', sizeTo: '4"', type: 'Concentric', schedule: '40', length: 140, largeEndOD: 168.3, smallEndOD: 114.3, weight: 4.3 },
  { sizeFrom: '8"', sizeTo: '6"', type: 'Concentric', schedule: '40', length: 152, largeEndOD: 219.1, smallEndOD: 168.3, weight: 8.5 },
  { sizeFrom: '10"', sizeTo: '8"', type: 'Concentric', schedule: '40', length: 178, largeEndOD: 273.1, smallEndOD: 219.1, weight: 15 },
  { sizeFrom: '12"', sizeTo: '10"', type: 'Concentric', schedule: '40', length: 203, largeEndOD: 323.9, smallEndOD: 273.1, weight: 24 },
];

export const fittingTypes = [
  { id: '90LR', name: '90° Long Radius Elbow', abbr: '90°LR' },
  { id: '90SR', name: '90° Short Radius Elbow', abbr: '90°SR' },
  { id: '45LR', name: '45° Long Radius Elbow', abbr: '45°LR' },
  { id: 'tee-equal', name: 'Equal Tee', abbr: 'TEE' },
  { id: 'tee-reducing', name: 'Reducing Tee', abbr: 'RED TEE' },
  { id: 'reducer-con', name: 'Concentric Reducer', abbr: 'CON RED' },
  { id: 'reducer-ecc', name: 'Eccentric Reducer', abbr: 'ECC RED' },
  { id: 'cap', name: 'Cap', abbr: 'CAP' },
  { id: 'stub-end', name: 'Stub End', abbr: 'SE' },
];

// ============= GASKETS =============

export interface GasketData {
  size: string;
  nominalDN: number;
  pressureClass: string;
  type: string;
  innerDiameter: number;   // mm
  outerDiameter: number;   // mm
  thickness: number;       // mm
}

export const gasketData: GasketData[] = [
  // Ring Joint Gaskets (RTJ)
  { size: '1/2"', nominalDN: 15, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 21.5, outerDiameter: 34, thickness: 4.5 },
  { size: '3/4"', nominalDN: 20, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 27, outerDiameter: 42, thickness: 4.5 },
  { size: '1"', nominalDN: 25, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 34, outerDiameter: 50, thickness: 4.5 },
  { size: '1-1/2"', nominalDN: 40, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 49, outerDiameter: 72, thickness: 4.5 },
  { size: '2"', nominalDN: 50, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 61, outerDiameter: 91, thickness: 4.5 },
  { size: '3"', nominalDN: 80, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 90, outerDiameter: 126, thickness: 4.5 },
  { size: '4"', nominalDN: 100, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 115, outerDiameter: 156, thickness: 4.5 },
  { size: '6"', nominalDN: 150, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 169, outerDiameter: 215, thickness: 4.5 },
  { size: '8"', nominalDN: 200, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 220, outerDiameter: 269, thickness: 4.5 },
  { size: '10"', nominalDN: 250, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 274, outerDiameter: 323, thickness: 4.5 },
  { size: '12"', nominalDN: 300, pressureClass: '150', type: 'Spiral Wound', innerDiameter: 325, outerDiameter: 380, thickness: 4.5 },
];

export const gasketTypes = [
  { id: 'spiral-wound', name: 'Spiral Wound', abbr: 'SW' },
  { id: 'sheet', name: 'Sheet Gasket', abbr: 'SH' },
  { id: 'rtj', name: 'Ring Type Joint', abbr: 'RTJ' },
  { id: 'kammprofile', name: 'Kammprofile', abbr: 'KP' },
  { id: 'gland', name: 'Gland Pack', abbr: 'GP' },
];

// ============= VALVES =============

export interface ValveData {
  size: string;
  nominalDN: number;
  type: string;
  pressureClass: string;
  faceToFace: number;       // mm (short pattern)
  faceToFaceLong?: number;  // mm (long pattern if applicable)
  height: number;           // mm (centerline to top of handwheel)
  weight: number;           // kg (approximate)
}

export const valveData: ValveData[] = [
  // Gate Valves (Class 150)
  { size: '1/2"', nominalDN: 15, type: 'Gate', pressureClass: '150', faceToFace: 108, height: 175, weight: 2.0 },
  { size: '3/4"', nominalDN: 20, type: 'Gate', pressureClass: '150', faceToFace: 117, height: 195, weight: 2.8 },
  { size: '1"', nominalDN: 25, type: 'Gate', pressureClass: '150', faceToFace: 127, height: 220, weight: 3.5 },
  { size: '1-1/2"', nominalDN: 40, type: 'Gate', pressureClass: '150', faceToFace: 165, height: 280, weight: 6.5 },
  { size: '2"', nominalDN: 50, type: 'Gate', pressureClass: '150', faceToFace: 178, height: 320, weight: 9.5 },
  { size: '3"', nominalDN: 80, type: 'Gate', pressureClass: '150', faceToFace: 203, height: 400, weight: 18 },
  { size: '4"', nominalDN: 100, type: 'Gate', pressureClass: '150', faceToFace: 229, height: 465, weight: 28 },
  { size: '6"', nominalDN: 150, type: 'Gate', pressureClass: '150', faceToFace: 267, height: 580, weight: 55 },
  { size: '8"', nominalDN: 200, type: 'Gate', pressureClass: '150', faceToFace: 292, height: 710, weight: 95 },
  { size: '10"', nominalDN: 250, type: 'Gate', pressureClass: '150', faceToFace: 330, height: 850, weight: 155 },
  { size: '12"', nominalDN: 300, type: 'Gate', pressureClass: '150', faceToFace: 356, height: 980, weight: 230 },
  
  // Globe Valves (Class 150)
  { size: '1/2"', nominalDN: 15, type: 'Globe', pressureClass: '150', faceToFace: 150, height: 215, weight: 3.0 },
  { size: '3/4"', nominalDN: 20, type: 'Globe', pressureClass: '150', faceToFace: 165, height: 240, weight: 4.2 },
  { size: '1"', nominalDN: 25, type: 'Globe', pressureClass: '150', faceToFace: 180, height: 270, weight: 5.5 },
  { size: '1-1/2"', nominalDN: 40, type: 'Globe', pressureClass: '150', faceToFace: 210, height: 340, weight: 11 },
  { size: '2"', nominalDN: 50, type: 'Globe', pressureClass: '150', faceToFace: 230, height: 390, weight: 16 },
  { size: '3"', nominalDN: 80, type: 'Globe', pressureClass: '150', faceToFace: 280, height: 500, weight: 30 },
  { size: '4"', nominalDN: 100, type: 'Globe', pressureClass: '150', faceToFace: 310, height: 590, weight: 48 },
  { size: '6"', nominalDN: 150, type: 'Globe', pressureClass: '150', faceToFace: 400, height: 760, weight: 100 },
  
  // Ball Valves (Class 150)
  { size: '1/2"', nominalDN: 15, type: 'Ball', pressureClass: '150', faceToFace: 108, height: 75, weight: 1.8 },
  { size: '3/4"', nominalDN: 20, type: 'Ball', pressureClass: '150', faceToFace: 117, height: 85, weight: 2.5 },
  { size: '1"', nominalDN: 25, type: 'Ball', pressureClass: '150', faceToFace: 127, height: 100, weight: 3.2 },
  { size: '1-1/2"', nominalDN: 40, type: 'Ball', pressureClass: '150', faceToFace: 165, height: 125, weight: 6.0 },
  { size: '2"', nominalDN: 50, type: 'Ball', pressureClass: '150', faceToFace: 178, height: 150, weight: 9.0 },
  { size: '3"', nominalDN: 80, type: 'Ball', pressureClass: '150', faceToFace: 203, height: 190, weight: 16 },
  { size: '4"', nominalDN: 100, type: 'Ball', pressureClass: '150', faceToFace: 229, height: 225, weight: 26 },
  { size: '6"', nominalDN: 150, type: 'Ball', pressureClass: '150', faceToFace: 267, height: 290, weight: 52 },
  { size: '8"', nominalDN: 200, type: 'Ball', pressureClass: '150', faceToFace: 292, height: 355, weight: 90 },
  
  // Check Valves (Class 150)
  { size: '1/2"', nominalDN: 15, type: 'Check', pressureClass: '150', faceToFace: 108, height: 115, weight: 1.5 },
  { size: '1"', nominalDN: 25, type: 'Check', pressureClass: '150', faceToFace: 127, height: 150, weight: 2.8 },
  { size: '2"', nominalDN: 50, type: 'Check', pressureClass: '150', faceToFace: 178, height: 210, weight: 7.0 },
  { size: '3"', nominalDN: 80, type: 'Check', pressureClass: '150', faceToFace: 203, height: 280, weight: 14 },
  { size: '4"', nominalDN: 100, type: 'Check', pressureClass: '150', faceToFace: 229, height: 340, weight: 22 },
  { size: '6"', nominalDN: 150, type: 'Check', pressureClass: '150', faceToFace: 267, height: 430, weight: 45 },
  { size: '8"', nominalDN: 200, type: 'Check', pressureClass: '150', faceToFace: 292, height: 530, weight: 75 },
];

export const valveTypes = [
  { id: 'gate', name: 'Gate Valve', abbr: 'GV' },
  { id: 'globe', name: 'Globe Valve', abbr: 'GLV' },
  { id: 'ball', name: 'Ball Valve', abbr: 'BV' },
  { id: 'check', name: 'Check Valve', abbr: 'CV' },
  { id: 'butterfly', name: 'Butterfly Valve', abbr: 'BFV' },
  { id: 'plug', name: 'Plug Valve', abbr: 'PV' },
];

// ============= LINE BLANKS (Spectacle Blinds) =============

export interface LineBlankData {
  size: string;
  nominalDN: number;
  pressureClass: string;
  type: string;
  outerDiameter: number;    // mm
  thickness: number;        // mm
  handleLength: number;     // mm
  handleWidth: number;      // mm
  weight: number;           // kg
}

export const lineBlankData: LineBlankData[] = [
  // Spectacle Blinds Class 150
  { size: '2"', nominalDN: 50, pressureClass: '150', type: 'Spectacle', outerDiameter: 152, thickness: 9.5, handleLength: 360, handleWidth: 75, weight: 3.2 },
  { size: '3"', nominalDN: 80, pressureClass: '150', type: 'Spectacle', outerDiameter: 190, thickness: 9.5, handleLength: 450, handleWidth: 90, weight: 5.0 },
  { size: '4"', nominalDN: 100, pressureClass: '150', type: 'Spectacle', outerDiameter: 229, thickness: 11, handleLength: 540, handleWidth: 110, weight: 8.5 },
  { size: '6"', nominalDN: 150, pressureClass: '150', type: 'Spectacle', outerDiameter: 279, thickness: 13, handleLength: 680, handleWidth: 135, weight: 15 },
  { size: '8"', nominalDN: 200, pressureClass: '150', type: 'Spectacle', outerDiameter: 343, thickness: 14, handleLength: 830, handleWidth: 165, weight: 28 },
  { size: '10"', nominalDN: 250, pressureClass: '150', type: 'Spectacle', outerDiameter: 406, thickness: 16, handleLength: 980, handleWidth: 200, weight: 45 },
  { size: '12"', nominalDN: 300, pressureClass: '150', type: 'Spectacle', outerDiameter: 483, thickness: 17, handleLength: 1150, handleWidth: 230, weight: 70 },
  { size: '14"', nominalDN: 350, pressureClass: '150', type: 'Spectacle', outerDiameter: 533, thickness: 19, handleLength: 1280, handleWidth: 255, weight: 95 },
  { size: '16"', nominalDN: 400, pressureClass: '150', type: 'Spectacle', outerDiameter: 597, thickness: 21, handleLength: 1430, handleWidth: 285, weight: 130 },
  
  // Spectacle Blinds Class 300
  { size: '2"', nominalDN: 50, pressureClass: '300', type: 'Spectacle', outerDiameter: 165, thickness: 13, handleLength: 395, handleWidth: 80, weight: 4.5 },
  { size: '3"', nominalDN: 80, pressureClass: '300', type: 'Spectacle', outerDiameter: 210, thickness: 14, handleLength: 500, handleWidth: 100, weight: 7.5 },
  { size: '4"', nominalDN: 100, pressureClass: '300', type: 'Spectacle', outerDiameter: 254, thickness: 16, handleLength: 600, handleWidth: 120, weight: 13 },
  { size: '6"', nominalDN: 150, pressureClass: '300', type: 'Spectacle', outerDiameter: 318, thickness: 19, handleLength: 765, handleWidth: 155, weight: 25 },
  { size: '8"', nominalDN: 200, pressureClass: '300', type: 'Spectacle', outerDiameter: 381, thickness: 22, handleLength: 920, handleWidth: 185, weight: 45 },
  { size: '10"', nominalDN: 250, pressureClass: '300', type: 'Spectacle', outerDiameter: 445, thickness: 25, handleLength: 1070, handleWidth: 215, weight: 72 },
  { size: '12"', nominalDN: 300, pressureClass: '300', type: 'Spectacle', outerDiameter: 521, thickness: 27, handleLength: 1250, handleWidth: 250, weight: 110 },
];

export const lineBlankTypes = [
  { id: 'spectacle', name: 'Spectacle Blind', abbr: 'SPB' },
  { id: 'spade', name: 'Spade / Paddle Blind', abbr: 'SPD' },
  { id: 'spacer', name: 'Spacer Ring', abbr: 'SPC' },
];

// ============= OLETS (Branch Connections) =============

export interface OletData {
  headerSize: string;
  branchSize: string;
  type: string;
  schedule: string;
  length: number;           // L dimension (mm) - insertion length
  width: number;            // W dimension (mm) - width at base
  weight: number;           // kg
}

export const oletData: OletData[] = [
  // Weldolets (Branch on Run - BW)
  { headerSize: '2"', branchSize: '1/2"', type: 'Weldolet', schedule: 'STD', length: 25, width: 35, weight: 0.08 },
  { headerSize: '2"', branchSize: '3/4"', type: 'Weldolet', schedule: 'STD', length: 30, width: 40, weight: 0.12 },
  { headerSize: '2"', branchSize: '1"', type: 'Weldolet', schedule: 'STD', length: 35, width: 45, weight: 0.18 },
  { headerSize: '3"', branchSize: '1/2"', type: 'Weldolet', schedule: 'STD', length: 30, width: 38, weight: 0.10 },
  { headerSize: '3"', branchSize: '1"', type: 'Weldolet', schedule: 'STD', length: 38, width: 48, weight: 0.22 },
  { headerSize: '3"', branchSize: '1-1/2"', type: 'Weldolet', schedule: 'STD', length: 45, width: 58, weight: 0.35 },
  { headerSize: '4"', branchSize: '1/2"', type: 'Weldolet', schedule: 'STD', length: 32, width: 40, weight: 0.12 },
  { headerSize: '4"', branchSize: '1"', type: 'Weldolet', schedule: 'STD', length: 42, width: 52, weight: 0.28 },
  { headerSize: '4"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 55, width: 72, weight: 0.55 },
  { headerSize: '6"', branchSize: '1"', type: 'Weldolet', schedule: 'STD', length: 48, width: 58, weight: 0.42 },
  { headerSize: '6"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 62, width: 80, weight: 0.85 },
  { headerSize: '6"', branchSize: '3"', type: 'Weldolet', schedule: 'STD', length: 75, width: 100, weight: 1.4 },
  { headerSize: '8"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 68, width: 88, weight: 1.2 },
  { headerSize: '8"', branchSize: '4"', type: 'Weldolet', schedule: 'STD', length: 88, width: 125, weight: 2.8 },
  { headerSize: '10"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 75, width: 95, weight: 1.8 },
  { headerSize: '10"', branchSize: '4"', type: 'Weldolet', schedule: 'STD', length: 95, width: 135, weight: 3.8 },
  { headerSize: '12"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 80, width: 102, weight: 2.2 },
  { headerSize: '12"', branchSize: '4"', type: 'Weldolet', schedule: 'STD', length: 102, width: 145, weight: 4.8 },
  { headerSize: '12"', branchSize: '6"', type: 'Weldolet', schedule: 'STD', length: 125, width: 185, weight: 8.5 },
  
  // Sockolets (Socket Weld Branch)
  { headerSize: '2"', branchSize: '1/2"', type: 'Sockolet', schedule: '3000', length: 32, width: 32, weight: 0.12 },
  { headerSize: '2"', branchSize: '3/4"', type: 'Sockolet', schedule: '3000', length: 35, width: 38, weight: 0.18 },
  { headerSize: '3"', branchSize: '1/2"', type: 'Sockolet', schedule: '3000', length: 35, width: 35, weight: 0.15 },
  { headerSize: '3"', branchSize: '1"', type: 'Sockolet', schedule: '3000', length: 42, width: 45, weight: 0.28 },
  { headerSize: '4"', branchSize: '1/2"', type: 'Sockolet', schedule: '3000', length: 38, width: 38, weight: 0.18 },
  { headerSize: '4"', branchSize: '1"', type: 'Sockolet', schedule: '3000', length: 48, width: 50, weight: 0.35 },
  { headerSize: '6"', branchSize: '1"', type: 'Sockolet', schedule: '3000', length: 52, width: 55, weight: 0.48 },
  { headerSize: '6"', branchSize: '2"', type: 'Sockolet', schedule: '3000', length: 65, width: 75, weight: 0.95 },
  
  // Threadolets (Threaded Branch)
  { headerSize: '2"', branchSize: '1/2"', type: 'Threadolet', schedule: '3000', length: 28, width: 32, weight: 0.10 },
  { headerSize: '2"', branchSize: '3/4"', type: 'Threadolet', schedule: '3000', length: 32, width: 38, weight: 0.15 },
  { headerSize: '3"', branchSize: '1/2"', type: 'Threadolet', schedule: '3000', length: 32, width: 35, weight: 0.12 },
  { headerSize: '3"', branchSize: '1"', type: 'Threadolet', schedule: '3000', length: 40, width: 45, weight: 0.25 },
  { headerSize: '4"', branchSize: '1"', type: 'Threadolet', schedule: '3000', length: 45, width: 50, weight: 0.32 },
  { headerSize: '6"', branchSize: '1"', type: 'Threadolet', schedule: '3000', length: 50, width: 55, weight: 0.45 },
];

export const oletTypes = [
  { id: 'weldolet', name: 'Weldolet', abbr: 'WOL' },
  { id: 'sockolet', name: 'Sockolet', abbr: 'SOL' },
  { id: 'threadolet', name: 'Threadolet', abbr: 'TOL' },
  { id: 'elbolet', name: 'Elbolet', abbr: 'EOL' },
  { id: 'latrolet', name: 'Latrolet', abbr: 'LOL' },
  { id: 'nipolet', name: 'Nipolet', abbr: 'NOL' },
];

// ============= PIPE FLEXIBILITY (SIF - Stress Intensification Factors) =============

export interface FlexibilityData {
  component: string;
  type: string;
  sifIn: string;            // In-plane SIF formula
  sifOut: string;           // Out-plane SIF formula
  kFactor: string;          // Flexibility factor formula
  description: string;
}

export const flexibilityData: FlexibilityData[] = [
  {
    component: '90° Long Radius Elbow',
    type: 'Butt Weld',
    sifIn: '0.9 / h^(2/3)',
    sifOut: '0.75 / h^(2/3)',
    kFactor: '1.65 / h',
    description: 'h = tR/r², where t = wall thickness, R = bend radius, r = mean pipe radius'
  },
  {
    component: '90° Short Radius Elbow',
    type: 'Butt Weld',
    sifIn: '0.9 / h^(2/3)',
    sifOut: '0.75 / h^(2/3)',
    kFactor: '1.65 / h',
    description: 'Same formula as LR, but R = 1.0D instead of 1.5D'
  },
  {
    component: '45° Elbow',
    type: 'Butt Weld',
    sifIn: '0.9 / h^(2/3)',
    sifOut: '0.75 / h^(2/3)',
    kFactor: '1.65 / h',
    description: 'Reduced effective angle, same flexibility characteristic'
  },
  {
    component: 'Miter Bend (1 weld)',
    type: 'Welded',
    sifIn: '0.9 / h^(2/3)',
    sifOut: '0.75 / h^(2/3)',
    kFactor: '1.52 / h^(5/6)',
    description: 'θ = miter angle, s = miter spacing'
  },
  {
    component: 'Miter Bend (2+ welds)',
    type: 'Welded',
    sifIn: '0.9 / h^(2/3)',
    sifOut: '0.75 / h^(2/3)',
    kFactor: '1.52 / h^(5/6)',
    description: 'Multiple closely spaced miters'
  },
  {
    component: 'Welding Tee (Equal)',
    type: 'Butt Weld',
    sifIn: '0.9 / h^(2/3)',
    sifOut: '0.75 / h^(2/3)',
    kFactor: '1.0',
    description: 'Per ASME B31.3 Table D300'
  },
  {
    component: 'Reinforced Branch',
    type: 'Welded',
    sifIn: '(0.9 / h^(2/3)) × Cᵢ',
    sifOut: '(0.75 / h^(2/3)) × Cₒ',
    kFactor: '1.0',
    description: 'C factors depend on pad/saddle reinforcement ratio'
  },
  {
    component: 'Unreinforced Branch',
    type: 'Welded',
    sifIn: '(0.9 / h^(2/3)) × Cᵢ',
    sifOut: '(0.75 / h^(2/3)) × Cₒ',
    kFactor: '1.0',
    description: 'Higher SIF than reinforced connections'
  },
  {
    component: 'Weldolet',
    type: 'Welded',
    sifIn: '0.9 / h^(2/3)',
    sifOut: '0.75 / h^(2/3)',
    kFactor: '1.0',
    description: 'Integrally reinforced branch connection'
  },
  {
    component: 'Reducer (Concentric)',
    type: 'Butt Weld',
    sifIn: '1.0',
    sifOut: '1.0',
    kFactor: '1.0',
    description: 'Minimal stress intensification'
  },
  {
    component: 'Socket Weld Fitting',
    type: 'Socket Weld',
    sifIn: '2.1',
    sifOut: '2.1',
    kFactor: '1.0',
    description: 'Fixed value per B31.3'
  },
  {
    component: 'Threaded Fitting',
    type: 'Threaded',
    sifIn: '2.3',
    sifOut: '2.3',
    kFactor: '1.0',
    description: 'Fixed value per B31.3'
  },
];

// ============= SAFE SPANS (Pipe Support Spacing) =============

export interface SafeSpanData {
  size: string;
  nominalDN: number;
  schedule: string;
  material: string;
  contentDensity: number;   // kg/m³ (water = 1000)
  maxSpan: number;          // m (for simply supported)
  maxSpanFixed: number;     // m (for fixed-fixed)
  naturalFrequency: number; // Hz (at max span)
  deflection: number;       // mm (at max span)
}

export const safeSpanData: SafeSpanData[] = [
  // Carbon Steel, Sch 40, Water-filled
  { size: '1/2"', nominalDN: 15, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 2.1, maxSpanFixed: 2.6, naturalFrequency: 8.0, deflection: 3.8 },
  { size: '3/4"', nominalDN: 20, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 2.4, maxSpanFixed: 3.0, naturalFrequency: 7.5, deflection: 4.2 },
  { size: '1"', nominalDN: 25, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 2.7, maxSpanFixed: 3.4, naturalFrequency: 7.2, deflection: 4.5 },
  { size: '1-1/2"', nominalDN: 40, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 3.0, maxSpanFixed: 3.8, naturalFrequency: 6.8, deflection: 4.8 },
  { size: '2"', nominalDN: 50, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 3.4, maxSpanFixed: 4.2, naturalFrequency: 6.5, deflection: 5.0 },
  { size: '3"', nominalDN: 80, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 4.0, maxSpanFixed: 5.0, naturalFrequency: 6.0, deflection: 5.5 },
  { size: '4"', nominalDN: 100, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 4.6, maxSpanFixed: 5.7, naturalFrequency: 5.5, deflection: 6.0 },
  { size: '6"', nominalDN: 150, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 5.5, maxSpanFixed: 6.9, naturalFrequency: 5.0, deflection: 6.5 },
  { size: '8"', nominalDN: 200, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 6.4, maxSpanFixed: 8.0, naturalFrequency: 4.5, deflection: 7.0 },
  { size: '10"', nominalDN: 250, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 7.0, maxSpanFixed: 8.8, naturalFrequency: 4.2, deflection: 7.5 },
  { size: '12"', nominalDN: 300, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 7.6, maxSpanFixed: 9.5, naturalFrequency: 4.0, deflection: 8.0 },
  { size: '14"', nominalDN: 350, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 8.2, maxSpanFixed: 10.2, naturalFrequency: 3.8, deflection: 8.5 },
  { size: '16"', nominalDN: 400, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 8.8, maxSpanFixed: 11.0, naturalFrequency: 3.5, deflection: 9.0 },
  { size: '18"', nominalDN: 450, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 9.1, maxSpanFixed: 11.4, naturalFrequency: 3.3, deflection: 9.5 },
  { size: '20"', nominalDN: 500, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 9.5, maxSpanFixed: 11.9, naturalFrequency: 3.2, deflection: 10.0 },
  { size: '24"', nominalDN: 600, schedule: '40', material: 'CS', contentDensity: 1000, maxSpan: 10.4, maxSpanFixed: 13.0, naturalFrequency: 3.0, deflection: 10.5 },
  
  // Carbon Steel, Sch 40, Empty (Gas)
  { size: '2"', nominalDN: 50, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 4.6, maxSpanFixed: 5.7, naturalFrequency: 8.5, deflection: 3.5 },
  { size: '4"', nominalDN: 100, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 6.1, maxSpanFixed: 7.6, naturalFrequency: 7.0, deflection: 4.5 },
  { size: '6"', nominalDN: 150, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 7.3, maxSpanFixed: 9.1, naturalFrequency: 6.2, deflection: 5.0 },
  { size: '8"', nominalDN: 200, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 8.2, maxSpanFixed: 10.3, naturalFrequency: 5.5, deflection: 5.5 },
  { size: '10"', nominalDN: 250, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 9.1, maxSpanFixed: 11.4, naturalFrequency: 5.0, deflection: 6.0 },
  { size: '12"', nominalDN: 300, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 9.8, maxSpanFixed: 12.2, naturalFrequency: 4.6, deflection: 6.5 },
];

// ============= UTILITY FUNCTIONS =============

export function getFlangesBySize(size: string): FlangeData[] {
  return flangeData.filter(f => f.size === size);
}

export function getFlangesByClass(pressureClass: string): FlangeData[] {
  return flangeData.filter(f => f.pressureClass === pressureClass);
}

export function getFlange(size: string, pressureClass: string): FlangeData | undefined {
  return flangeData.find(f => f.size === size && f.pressureClass === pressureClass);
}

export function getElbow(size: string, type: string): FittingData | undefined {
  return elbowData.find(e => e.size === size && e.type === type);
}

export function getTee(size: string): TeeData | undefined {
  return teeData.find(t => t.size === size);
}

export function getReducer(sizeFrom: string, sizeTo: string): ReducerData | undefined {
  return reducerData.find(r => r.sizeFrom === sizeFrom && r.sizeTo === sizeTo);
}

export function getValve(size: string, type: string, pressureClass: string): ValveData | undefined {
  return valveData.find(v => v.size === size && v.type === type && v.pressureClass === pressureClass);
}

export function getLineBlank(size: string, pressureClass: string): LineBlankData | undefined {
  return lineBlankData.find(lb => lb.size === size && lb.pressureClass === pressureClass);
}

export function getOlet(headerSize: string, branchSize: string, type: string): OletData | undefined {
  return oletData.find(o => o.headerSize === headerSize && o.branchSize === branchSize && o.type === type);
}

export function getSafeSpan(size: string, contentDensity: number): SafeSpanData | undefined {
  return safeSpanData.find(s => s.size === size && s.contentDensity === contentDensity);
}

export function getUniqueSizes(): string[] {
  const sizes = new Set<string>();
  flangeData.forEach(f => sizes.add(f.size));
  return Array.from(sizes);
}

export function getUniqueHeaderSizes(): string[] {
  const sizes = new Set<string>();
  oletData.forEach(o => sizes.add(o.headerSize));
  return Array.from(sizes);
}
