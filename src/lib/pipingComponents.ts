/**
 * Piping Components Database - ASME B36.10M / B16 Series
 * Comprehensive dimensional data for pipe, flanges, fittings, gaskets, valves, and more
 */

// ============= PIPE DATA (ASME B36.10M) =============

export interface PipeData {
  size: string;
  nominalDN: number;
  outerDiameter: number;      // mm
  schedule: string;
  wallThickness: number;      // mm
  insideDiameter: number;     // mm
  crossSectionArea: number;   // mm²
  internalArea: number;       // mm²
  weightPerMeter: number;     // kg/m (empty steel pipe)
  waterCapacity: number;      // L/m
}

export const pipeData: PipeData[] = [
  // 1/2" pipe
  { size: '1/2"', nominalDN: 15, outerDiameter: 21.3, schedule: '5S', wallThickness: 1.65, insideDiameter: 18.0, crossSectionArea: 102, internalArea: 254, weightPerMeter: 0.80, waterCapacity: 0.254 },
  { size: '1/2"', nominalDN: 15, outerDiameter: 21.3, schedule: '10S', wallThickness: 2.11, insideDiameter: 17.08, crossSectionArea: 127, internalArea: 229, weightPerMeter: 1.00, waterCapacity: 0.229 },
  { size: '1/2"', nominalDN: 15, outerDiameter: 21.3, schedule: '40/STD', wallThickness: 2.77, insideDiameter: 15.76, crossSectionArea: 162, internalArea: 195, weightPerMeter: 1.27, waterCapacity: 0.195 },
  { size: '1/2"', nominalDN: 15, outerDiameter: 21.3, schedule: '80/XS', wallThickness: 3.73, insideDiameter: 13.84, crossSectionArea: 206, internalArea: 150, weightPerMeter: 1.62, waterCapacity: 0.150 },
  { size: '1/2"', nominalDN: 15, outerDiameter: 21.3, schedule: '160', wallThickness: 4.78, insideDiameter: 11.74, crossSectionArea: 248, internalArea: 108, weightPerMeter: 1.95, waterCapacity: 0.108 },
  
  // 3/4" pipe
  { size: '3/4"', nominalDN: 20, outerDiameter: 26.7, schedule: '5S', wallThickness: 1.65, insideDiameter: 23.4, crossSectionArea: 130, internalArea: 430, weightPerMeter: 1.02, waterCapacity: 0.430 },
  { size: '3/4"', nominalDN: 20, outerDiameter: 26.7, schedule: '10S', wallThickness: 2.11, insideDiameter: 22.48, crossSectionArea: 163, internalArea: 397, weightPerMeter: 1.28, waterCapacity: 0.397 },
  { size: '3/4"', nominalDN: 20, outerDiameter: 26.7, schedule: '40/STD', wallThickness: 2.87, insideDiameter: 20.96, crossSectionArea: 215, internalArea: 345, weightPerMeter: 1.69, waterCapacity: 0.345 },
  { size: '3/4"', nominalDN: 20, outerDiameter: 26.7, schedule: '80/XS', wallThickness: 3.91, insideDiameter: 18.88, crossSectionArea: 280, internalArea: 280, weightPerMeter: 2.20, waterCapacity: 0.280 },
  
  // 1" pipe
  { size: '1"', nominalDN: 25, outerDiameter: 33.4, schedule: '5S', wallThickness: 1.65, insideDiameter: 30.1, crossSectionArea: 165, internalArea: 711, weightPerMeter: 1.29, waterCapacity: 0.711 },
  { size: '1"', nominalDN: 25, outerDiameter: 33.4, schedule: '10S', wallThickness: 2.77, insideDiameter: 27.86, crossSectionArea: 267, internalArea: 610, weightPerMeter: 2.09, waterCapacity: 0.610 },
  { size: '1"', nominalDN: 25, outerDiameter: 33.4, schedule: '40/STD', wallThickness: 3.38, insideDiameter: 26.64, crossSectionArea: 319, internalArea: 557, weightPerMeter: 2.50, waterCapacity: 0.557 },
  { size: '1"', nominalDN: 25, outerDiameter: 33.4, schedule: '80/XS', wallThickness: 4.55, insideDiameter: 24.3, crossSectionArea: 413, internalArea: 464, weightPerMeter: 3.24, waterCapacity: 0.464 },
  { size: '1"', nominalDN: 25, outerDiameter: 33.4, schedule: '160', wallThickness: 6.35, insideDiameter: 20.7, crossSectionArea: 540, internalArea: 336, weightPerMeter: 4.24, waterCapacity: 0.336 },
  
  // 1-1/2" pipe
  { size: '1-1/2"', nominalDN: 40, outerDiameter: 48.3, schedule: '5S', wallThickness: 1.65, insideDiameter: 45.0, crossSectionArea: 242, internalArea: 1590, weightPerMeter: 1.90, waterCapacity: 1.590 },
  { size: '1-1/2"', nominalDN: 40, outerDiameter: 48.3, schedule: '10S', wallThickness: 2.77, insideDiameter: 42.76, crossSectionArea: 397, internalArea: 1436, weightPerMeter: 3.11, waterCapacity: 1.436 },
  { size: '1-1/2"', nominalDN: 40, outerDiameter: 48.3, schedule: '40/STD', wallThickness: 3.68, insideDiameter: 40.94, crossSectionArea: 516, internalArea: 1316, weightPerMeter: 4.05, waterCapacity: 1.316 },
  { size: '1-1/2"', nominalDN: 40, outerDiameter: 48.3, schedule: '80/XS', wallThickness: 5.08, insideDiameter: 38.14, crossSectionArea: 690, internalArea: 1143, weightPerMeter: 5.41, waterCapacity: 1.143 },
  
  // 2" pipe
  { size: '2"', nominalDN: 50, outerDiameter: 60.3, schedule: '5S', wallThickness: 1.65, insideDiameter: 57.0, crossSectionArea: 304, internalArea: 2552, weightPerMeter: 2.39, waterCapacity: 2.552 },
  { size: '2"', nominalDN: 50, outerDiameter: 60.3, schedule: '10S', wallThickness: 2.77, insideDiameter: 54.76, crossSectionArea: 502, internalArea: 2355, weightPerMeter: 3.93, waterCapacity: 2.355 },
  { size: '2"', nominalDN: 50, outerDiameter: 60.3, schedule: '40/STD', wallThickness: 3.91, insideDiameter: 52.48, crossSectionArea: 693, internalArea: 2163, weightPerMeter: 5.44, waterCapacity: 2.163 },
  { size: '2"', nominalDN: 50, outerDiameter: 60.3, schedule: '80/XS', wallThickness: 5.54, insideDiameter: 49.22, crossSectionArea: 954, internalArea: 1902, weightPerMeter: 7.48, waterCapacity: 1.902 },
  { size: '2"', nominalDN: 50, outerDiameter: 60.3, schedule: '160', wallThickness: 8.74, insideDiameter: 42.82, crossSectionArea: 1416, internalArea: 1440, weightPerMeter: 11.11, waterCapacity: 1.440 },
  
  // 3" pipe
  { size: '3"', nominalDN: 80, outerDiameter: 88.9, schedule: '5S', wallThickness: 1.65, insideDiameter: 85.6, crossSectionArea: 453, internalArea: 5755, weightPerMeter: 3.55, waterCapacity: 5.755 },
  { size: '3"', nominalDN: 80, outerDiameter: 88.9, schedule: '10S', wallThickness: 2.77, insideDiameter: 83.36, crossSectionArea: 749, internalArea: 5457, weightPerMeter: 5.88, waterCapacity: 5.457 },
  { size: '3"', nominalDN: 80, outerDiameter: 88.9, schedule: '40/STD', wallThickness: 5.49, insideDiameter: 77.92, crossSectionArea: 1438, internalArea: 4768, weightPerMeter: 11.29, waterCapacity: 4.768 },
  { size: '3"', nominalDN: 80, outerDiameter: 88.9, schedule: '80/XS', wallThickness: 7.62, insideDiameter: 73.66, crossSectionArea: 1946, internalArea: 4261, weightPerMeter: 15.27, waterCapacity: 4.261 },
  
  // 4" pipe
  { size: '4"', nominalDN: 100, outerDiameter: 114.3, schedule: '5S', wallThickness: 1.65, insideDiameter: 111.0, crossSectionArea: 585, internalArea: 9677, weightPerMeter: 4.59, waterCapacity: 9.677 },
  { size: '4"', nominalDN: 100, outerDiameter: 114.3, schedule: '10S', wallThickness: 2.77, insideDiameter: 108.76, crossSectionArea: 971, internalArea: 9290, weightPerMeter: 7.62, waterCapacity: 9.290 },
  { size: '4"', nominalDN: 100, outerDiameter: 114.3, schedule: '40/STD', wallThickness: 6.02, insideDiameter: 102.26, crossSectionArea: 2048, internalArea: 8213, weightPerMeter: 16.07, waterCapacity: 8.213 },
  { size: '4"', nominalDN: 100, outerDiameter: 114.3, schedule: '80/XS', wallThickness: 8.56, insideDiameter: 97.18, crossSectionArea: 2843, internalArea: 7417, weightPerMeter: 22.32, waterCapacity: 7.417 },
  { size: '4"', nominalDN: 100, outerDiameter: 114.3, schedule: '120', wallThickness: 11.13, insideDiameter: 92.04, crossSectionArea: 3605, internalArea: 6654, weightPerMeter: 28.30, waterCapacity: 6.654 },
  { size: '4"', nominalDN: 100, outerDiameter: 114.3, schedule: '160', wallThickness: 13.49, insideDiameter: 87.32, crossSectionArea: 4273, internalArea: 5988, weightPerMeter: 33.54, waterCapacity: 5.988 },
  
  // 6" pipe
  { size: '6"', nominalDN: 150, outerDiameter: 168.3, schedule: '5S', wallThickness: 2.77, insideDiameter: 162.76, crossSectionArea: 1442, internalArea: 20816, weightPerMeter: 11.31, waterCapacity: 20.816 },
  { size: '6"', nominalDN: 150, outerDiameter: 168.3, schedule: '10S', wallThickness: 3.40, insideDiameter: 161.5, crossSectionArea: 1762, internalArea: 20483, weightPerMeter: 13.83, waterCapacity: 20.483 },
  { size: '6"', nominalDN: 150, outerDiameter: 168.3, schedule: '40/STD', wallThickness: 7.11, insideDiameter: 154.08, crossSectionArea: 3601, internalArea: 18644, weightPerMeter: 28.26, waterCapacity: 18.644 },
  { size: '6"', nominalDN: 150, outerDiameter: 168.3, schedule: '80/XS', wallThickness: 10.97, insideDiameter: 146.36, crossSectionArea: 5420, internalArea: 16827, weightPerMeter: 42.56, waterCapacity: 16.827 },
  { size: '6"', nominalDN: 150, outerDiameter: 168.3, schedule: '120', wallThickness: 14.27, insideDiameter: 139.76, crossSectionArea: 6908, internalArea: 15341, weightPerMeter: 54.20, waterCapacity: 15.341 },
  { size: '6"', nominalDN: 150, outerDiameter: 168.3, schedule: '160', wallThickness: 18.26, insideDiameter: 131.78, crossSectionArea: 8605, internalArea: 13636, weightPerMeter: 67.56, waterCapacity: 13.636 },
  
  // 8" pipe
  { size: '8"', nominalDN: 200, outerDiameter: 219.1, schedule: '5S', wallThickness: 2.77, insideDiameter: 213.56, crossSectionArea: 1886, internalArea: 35807, weightPerMeter: 14.80, waterCapacity: 35.807 },
  { size: '8"', nominalDN: 200, outerDiameter: 219.1, schedule: '10S', wallThickness: 3.76, insideDiameter: 211.58, crossSectionArea: 2547, internalArea: 35171, weightPerMeter: 19.99, waterCapacity: 35.171 },
  { size: '8"', nominalDN: 200, outerDiameter: 219.1, schedule: '20', wallThickness: 6.35, insideDiameter: 206.4, crossSectionArea: 4245, internalArea: 33450, weightPerMeter: 33.31, waterCapacity: 33.450 },
  { size: '8"', nominalDN: 200, outerDiameter: 219.1, schedule: '40/STD', wallThickness: 8.18, insideDiameter: 202.74, crossSectionArea: 5417, internalArea: 32275, weightPerMeter: 42.55, waterCapacity: 32.275 },
  { size: '8"', nominalDN: 200, outerDiameter: 219.1, schedule: '80/XS', wallThickness: 12.70, insideDiameter: 193.7, crossSectionArea: 8230, internalArea: 29466, weightPerMeter: 64.64, waterCapacity: 29.466 },
  { size: '8"', nominalDN: 200, outerDiameter: 219.1, schedule: '120', wallThickness: 18.26, insideDiameter: 182.58, crossSectionArea: 11515, internalArea: 26186, weightPerMeter: 90.44, waterCapacity: 26.186 },
  { size: '8"', nominalDN: 200, outerDiameter: 219.1, schedule: '160', wallThickness: 23.01, insideDiameter: 173.08, crossSectionArea: 14171, internalArea: 23530, weightPerMeter: 111.27, waterCapacity: 23.530 },
  
  // 10" pipe
  { size: '10"', nominalDN: 250, outerDiameter: 273.1, schedule: '5S', wallThickness: 3.40, insideDiameter: 266.3, crossSectionArea: 2881, internalArea: 55697, weightPerMeter: 22.61, waterCapacity: 55.697 },
  { size: '10"', nominalDN: 250, outerDiameter: 273.1, schedule: '10S', wallThickness: 4.19, insideDiameter: 264.72, crossSectionArea: 3539, internalArea: 55058, weightPerMeter: 27.78, waterCapacity: 55.058 },
  { size: '10"', nominalDN: 250, outerDiameter: 273.1, schedule: '20', wallThickness: 6.35, insideDiameter: 260.4, crossSectionArea: 5323, internalArea: 53257, weightPerMeter: 41.77, waterCapacity: 53.257 },
  { size: '10"', nominalDN: 250, outerDiameter: 273.1, schedule: '40/STD', wallThickness: 9.27, insideDiameter: 254.56, crossSectionArea: 7686, internalArea: 50894, weightPerMeter: 60.31, waterCapacity: 50.894 },
  { size: '10"', nominalDN: 250, outerDiameter: 273.1, schedule: '80/XS', wallThickness: 15.06, insideDiameter: 242.98, crossSectionArea: 12213, internalArea: 46375, weightPerMeter: 95.80, waterCapacity: 46.375 },
  { size: '10"', nominalDN: 250, outerDiameter: 273.1, schedule: '120', wallThickness: 21.44, insideDiameter: 230.22, crossSectionArea: 16963, internalArea: 41625, weightPerMeter: 133.10, waterCapacity: 41.625 },
  
  // 12" pipe
  { size: '12"', nominalDN: 300, outerDiameter: 323.9, schedule: '5S', wallThickness: 3.96, insideDiameter: 315.98, crossSectionArea: 3983, internalArea: 78388, weightPerMeter: 31.25, waterCapacity: 78.388 },
  { size: '12"', nominalDN: 300, outerDiameter: 323.9, schedule: '10S', wallThickness: 4.57, insideDiameter: 314.76, crossSectionArea: 4582, internalArea: 77840, weightPerMeter: 35.97, waterCapacity: 77.840 },
  { size: '12"', nominalDN: 300, outerDiameter: 323.9, schedule: '20', wallThickness: 6.35, insideDiameter: 311.2, crossSectionArea: 6336, internalArea: 76048, weightPerMeter: 49.73, waterCapacity: 76.048 },
  { size: '12"', nominalDN: 300, outerDiameter: 323.9, schedule: 'STD', wallThickness: 9.52, insideDiameter: 304.86, crossSectionArea: 9402, internalArea: 73001, weightPerMeter: 73.88, waterCapacity: 73.001 },
  { size: '12"', nominalDN: 300, outerDiameter: 323.9, schedule: '40', wallThickness: 10.31, insideDiameter: 303.28, crossSectionArea: 10152, internalArea: 72228, weightPerMeter: 79.73, waterCapacity: 72.228 },
  { size: '12"', nominalDN: 300, outerDiameter: 323.9, schedule: 'XS', wallThickness: 12.70, insideDiameter: 298.5, crossSectionArea: 12415, internalArea: 69963, weightPerMeter: 97.46, waterCapacity: 69.963 },
  { size: '12"', nominalDN: 300, outerDiameter: 323.9, schedule: '80', wallThickness: 17.48, insideDiameter: 288.94, crossSectionArea: 16839, internalArea: 65603, weightPerMeter: 132.08, waterCapacity: 65.603 },
  
  // 14" pipe
  { size: '14"', nominalDN: 350, outerDiameter: 355.6, schedule: '5S', wallThickness: 3.96, insideDiameter: 347.68, crossSectionArea: 4377, internalArea: 94953, weightPerMeter: 34.35, waterCapacity: 94.953 },
  { size: '14"', nominalDN: 350, outerDiameter: 355.6, schedule: '10S', wallThickness: 4.78, insideDiameter: 346.04, crossSectionArea: 5270, internalArea: 94058, weightPerMeter: 41.36, waterCapacity: 94.058 },
  { size: '14"', nominalDN: 350, outerDiameter: 355.6, schedule: 'STD', wallThickness: 9.52, insideDiameter: 336.56, crossSectionArea: 10348, internalArea: 88966, weightPerMeter: 81.25, waterCapacity: 88.966 },
  { size: '14"', nominalDN: 350, outerDiameter: 355.6, schedule: 'XS', wallThickness: 11.13, insideDiameter: 333.34, crossSectionArea: 12039, internalArea: 87280, weightPerMeter: 94.50, waterCapacity: 87.280 },
  { size: '14"', nominalDN: 350, outerDiameter: 355.6, schedule: '40', wallThickness: 11.13, insideDiameter: 333.34, crossSectionArea: 12039, internalArea: 87280, weightPerMeter: 94.50, waterCapacity: 87.280 },
  { size: '14"', nominalDN: 350, outerDiameter: 355.6, schedule: '80', wallThickness: 19.05, insideDiameter: 317.5, crossSectionArea: 20154, internalArea: 79174, weightPerMeter: 158.11, waterCapacity: 79.174 },
  
  // 16" pipe
  { size: '16"', nominalDN: 400, outerDiameter: 406.4, schedule: '5S', wallThickness: 4.19, insideDiameter: 398.02, crossSectionArea: 5292, internalArea: 124406, weightPerMeter: 41.56, waterCapacity: 124.406 },
  { size: '16"', nominalDN: 400, outerDiameter: 406.4, schedule: '10S', wallThickness: 4.78, insideDiameter: 396.84, crossSectionArea: 6036, internalArea: 123682, weightPerMeter: 47.39, waterCapacity: 123.682 },
  { size: '16"', nominalDN: 400, outerDiameter: 406.4, schedule: 'STD', wallThickness: 9.52, insideDiameter: 387.36, crossSectionArea: 11867, internalArea: 117839, weightPerMeter: 93.17, waterCapacity: 117.839 },
  { size: '16"', nominalDN: 400, outerDiameter: 406.4, schedule: 'XS', wallThickness: 12.70, insideDiameter: 381.0, crossSectionArea: 15706, internalArea: 113986, weightPerMeter: 123.30, waterCapacity: 113.986 },
  { size: '16"', nominalDN: 400, outerDiameter: 406.4, schedule: '40', wallThickness: 12.70, insideDiameter: 381.0, crossSectionArea: 15706, internalArea: 113986, weightPerMeter: 123.30, waterCapacity: 113.986 },
  { size: '16"', nominalDN: 400, outerDiameter: 406.4, schedule: '80', wallThickness: 21.44, insideDiameter: 363.52, crossSectionArea: 25950, internalArea: 103823, weightPerMeter: 203.53, waterCapacity: 103.823 },
  
  // 18" pipe
  { size: '18"', nominalDN: 450, outerDiameter: 457.2, schedule: '5S', wallThickness: 4.19, insideDiameter: 448.82, crossSectionArea: 5959, internalArea: 158192, weightPerMeter: 46.77, waterCapacity: 158.192 },
  { size: '18"', nominalDN: 450, outerDiameter: 457.2, schedule: '10S', wallThickness: 4.78, insideDiameter: 447.64, crossSectionArea: 6794, internalArea: 157355, weightPerMeter: 53.33, waterCapacity: 157.355 },
  { size: '18"', nominalDN: 450, outerDiameter: 457.2, schedule: 'STD', wallThickness: 9.52, insideDiameter: 438.16, crossSectionArea: 13387, internalArea: 150795, weightPerMeter: 105.09, waterCapacity: 150.795 },
  { size: '18"', nominalDN: 450, outerDiameter: 457.2, schedule: 'XS', wallThickness: 11.13, insideDiameter: 434.94, crossSectionArea: 15582, internalArea: 148571, weightPerMeter: 122.38, waterCapacity: 148.571 },
  
  // 20" pipe
  { size: '20"', nominalDN: 500, outerDiameter: 508.0, schedule: '5S', wallThickness: 4.78, insideDiameter: 498.44, crossSectionArea: 7555, internalArea: 195129, weightPerMeter: 59.32, waterCapacity: 195.129 },
  { size: '20"', nominalDN: 500, outerDiameter: 508.0, schedule: '10S', wallThickness: 5.54, insideDiameter: 496.92, crossSectionArea: 8739, internalArea: 193901, weightPerMeter: 68.60, waterCapacity: 193.901 },
  { size: '20"', nominalDN: 500, outerDiameter: 508.0, schedule: 'STD', wallThickness: 9.52, insideDiameter: 488.96, crossSectionArea: 14907, internalArea: 187746, weightPerMeter: 117.02, waterCapacity: 187.746 },
  { size: '20"', nominalDN: 500, outerDiameter: 508.0, schedule: 'XS', wallThickness: 12.70, insideDiameter: 482.6, crossSectionArea: 19764, internalArea: 182891, weightPerMeter: 155.12, waterCapacity: 182.891 },
  
  // 24" pipe
  { size: '24"', nominalDN: 600, outerDiameter: 609.6, schedule: '5S', wallThickness: 5.54, insideDiameter: 598.52, crossSectionArea: 10523, internalArea: 281364, weightPerMeter: 82.60, waterCapacity: 281.364 },
  { size: '24"', nominalDN: 600, outerDiameter: 609.6, schedule: '10S', wallThickness: 6.35, insideDiameter: 596.9, crossSectionArea: 12035, internalArea: 279843, weightPerMeter: 94.46, waterCapacity: 279.843 },
  { size: '24"', nominalDN: 600, outerDiameter: 609.6, schedule: 'STD', wallThickness: 9.52, insideDiameter: 590.56, crossSectionArea: 17945, internalArea: 273886, weightPerMeter: 140.88, waterCapacity: 273.886 },
  { size: '24"', nominalDN: 600, outerDiameter: 609.6, schedule: 'XS', wallThickness: 14.27, insideDiameter: 581.06, crossSectionArea: 26688, internalArea: 265144, weightPerMeter: 209.57, waterCapacity: 265.144 },
  { size: '24"', nominalDN: 600, outerDiameter: 609.6, schedule: '40', wallThickness: 17.48, insideDiameter: 574.64, crossSectionArea: 32537, internalArea: 259404, weightPerMeter: 255.41, waterCapacity: 259.404 },
  { size: '24"', nominalDN: 600, outerDiameter: 609.6, schedule: '80', wallThickness: 30.96, insideDiameter: 547.68, crossSectionArea: 56308, internalArea: 235595, weightPerMeter: 441.49, waterCapacity: 235.595 },
];

export function getUniquePipeSizes(): string[] {
  return [...new Set(pipeData.map(p => p.size))];
}

export function getSchedulesForPipeSize(size: string): string[] {
  return pipeData.filter(p => p.size === size).map(p => p.schedule);
}

export function getPipeBySchedule(size: string, schedule: string): PipeData | undefined {
  return pipeData.find(p => p.size === size && p.schedule === schedule);
}

// ============= FLANGES (ASME B16.5 / B16.47) =============

export interface FlangeData {
  size: string;
  nominalDN: number;
  pressureClass: string;
  outerDiameter: number;
  boltCircleDiameter: number;
  numBolts: number;
  boltSize: string;
  hubDiameter: number;
  thickness: number;
  raisedFaceHeight: number;
  raisedFaceDiameter: number;
  neckOD: number;
  weight: number;
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
  { id: 'wn', name: 'Weld Neck', abbr: 'WN', description: 'Best for high pressure and temperature' },
  { id: 'so', name: 'Slip-On', abbr: 'SO', description: 'Economical, slides over pipe' },
  { id: 'sw', name: 'Socket Weld', abbr: 'SW', description: 'For small bore high pressure' },
  { id: 'th', name: 'Threaded', abbr: 'TH', description: 'No welding required' },
  { id: 'bl', name: 'Blind', abbr: 'BL', description: 'Closes pipe ends' },
  { id: 'lj', name: 'Lap Joint', abbr: 'LJ', description: 'Easy alignment, used with stub ends' },
];

export const pressureClasses = ['150', '300', '600', '900', '1500', '2500'];

// ============= FITTINGS (ASME B16.9) =============

export interface FittingData {
  size: string;
  nominalDN: number;
  type: string;
  schedule: string;
  centerToEnd: number;
  outerDiameter: number;
  weight: number;
}

export const elbowData: FittingData[] = [
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
  centerToEnd: number;
  centerToBranch: number;
  outerDiameter: number;
  weight: number;
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
  length: number;
  largeEndOD: number;
  smallEndOD: number;
  weight: number;
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
  innerDiameter: number;
  outerDiameter: number;
  thickness: number;
}

export const gasketData: GasketData[] = [
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
  faceToFace: number;
  height: number;
  weight: number;
}

export const valveData: ValveData[] = [
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
  { size: '1/2"', nominalDN: 15, type: 'Globe', pressureClass: '150', faceToFace: 150, height: 215, weight: 3.0 },
  { size: '1"', nominalDN: 25, type: 'Globe', pressureClass: '150', faceToFace: 180, height: 270, weight: 5.5 },
  { size: '2"', nominalDN: 50, type: 'Globe', pressureClass: '150', faceToFace: 230, height: 390, weight: 16 },
  { size: '3"', nominalDN: 80, type: 'Globe', pressureClass: '150', faceToFace: 280, height: 500, weight: 30 },
  { size: '4"', nominalDN: 100, type: 'Globe', pressureClass: '150', faceToFace: 310, height: 590, weight: 48 },
  { size: '6"', nominalDN: 150, type: 'Globe', pressureClass: '150', faceToFace: 400, height: 760, weight: 100 },
  { size: '1/2"', nominalDN: 15, type: 'Ball', pressureClass: '150', faceToFace: 108, height: 75, weight: 1.8 },
  { size: '1"', nominalDN: 25, type: 'Ball', pressureClass: '150', faceToFace: 127, height: 100, weight: 3.2 },
  { size: '2"', nominalDN: 50, type: 'Ball', pressureClass: '150', faceToFace: 178, height: 150, weight: 9.0 },
  { size: '3"', nominalDN: 80, type: 'Ball', pressureClass: '150', faceToFace: 203, height: 190, weight: 16 },
  { size: '4"', nominalDN: 100, type: 'Ball', pressureClass: '150', faceToFace: 229, height: 225, weight: 26 },
  { size: '6"', nominalDN: 150, type: 'Ball', pressureClass: '150', faceToFace: 267, height: 290, weight: 52 },
  { size: '8"', nominalDN: 200, type: 'Ball', pressureClass: '150', faceToFace: 292, height: 355, weight: 90 },
  { size: '1/2"', nominalDN: 15, type: 'Check', pressureClass: '150', faceToFace: 108, height: 115, weight: 1.5 },
  { size: '1"', nominalDN: 25, type: 'Check', pressureClass: '150', faceToFace: 127, height: 150, weight: 2.8 },
  { size: '2"', nominalDN: 50, type: 'Check', pressureClass: '150', faceToFace: 178, height: 210, weight: 7.0 },
  { size: '4"', nominalDN: 100, type: 'Check', pressureClass: '150', faceToFace: 229, height: 340, weight: 22 },
  { size: '6"', nominalDN: 150, type: 'Check', pressureClass: '150', faceToFace: 267, height: 430, weight: 45 },
];

export const valveTypes = [
  { id: 'gate', name: 'Gate Valve', abbr: 'GV' },
  { id: 'globe', name: 'Globe Valve', abbr: 'GLV' },
  { id: 'ball', name: 'Ball Valve', abbr: 'BV' },
  { id: 'check', name: 'Check Valve', abbr: 'CV' },
  { id: 'butterfly', name: 'Butterfly Valve', abbr: 'BFV' },
  { id: 'plug', name: 'Plug Valve', abbr: 'PV' },
];

// ============= LINE BLANKS =============

export interface LineBlankData {
  size: string;
  nominalDN: number;
  pressureClass: string;
  type: string;
  outerDiameter: number;
  thickness: number;
  handleLength: number;
  handleWidth: number;
  weight: number;
}

export const lineBlankData: LineBlankData[] = [
  { size: '2"', nominalDN: 50, pressureClass: '150', type: 'Spectacle', outerDiameter: 152, thickness: 9.5, handleLength: 360, handleWidth: 75, weight: 3.2 },
  { size: '3"', nominalDN: 80, pressureClass: '150', type: 'Spectacle', outerDiameter: 190, thickness: 9.5, handleLength: 450, handleWidth: 90, weight: 5.0 },
  { size: '4"', nominalDN: 100, pressureClass: '150', type: 'Spectacle', outerDiameter: 229, thickness: 11, handleLength: 540, handleWidth: 110, weight: 8.5 },
  { size: '6"', nominalDN: 150, pressureClass: '150', type: 'Spectacle', outerDiameter: 279, thickness: 13, handleLength: 680, handleWidth: 135, weight: 15 },
  { size: '8"', nominalDN: 200, pressureClass: '150', type: 'Spectacle', outerDiameter: 343, thickness: 14, handleLength: 830, handleWidth: 165, weight: 28 },
  { size: '10"', nominalDN: 250, pressureClass: '150', type: 'Spectacle', outerDiameter: 406, thickness: 16, handleLength: 980, handleWidth: 200, weight: 45 },
  { size: '12"', nominalDN: 300, pressureClass: '150', type: 'Spectacle', outerDiameter: 483, thickness: 17, handleLength: 1150, handleWidth: 230, weight: 70 },
  { size: '2"', nominalDN: 50, pressureClass: '300', type: 'Spectacle', outerDiameter: 165, thickness: 13, handleLength: 395, handleWidth: 80, weight: 4.5 },
  { size: '4"', nominalDN: 100, pressureClass: '300', type: 'Spectacle', outerDiameter: 254, thickness: 16, handleLength: 600, handleWidth: 120, weight: 13 },
  { size: '6"', nominalDN: 150, pressureClass: '300', type: 'Spectacle', outerDiameter: 318, thickness: 19, handleLength: 765, handleWidth: 155, weight: 25 },
  { size: '8"', nominalDN: 200, pressureClass: '300', type: 'Spectacle', outerDiameter: 381, thickness: 22, handleLength: 920, handleWidth: 185, weight: 45 },
];

export const lineBlankTypes = [
  { id: 'spectacle', name: 'Spectacle Blind', abbr: 'SPB' },
  { id: 'spade', name: 'Spade / Paddle Blind', abbr: 'SPD' },
  { id: 'spacer', name: 'Spacer Ring', abbr: 'SPC' },
];

// ============= OLETS =============

export interface OletData {
  headerSize: string;
  branchSize: string;
  type: string;
  schedule: string;
  length: number;
  width: number;
  weight: number;
}

export const oletData: OletData[] = [
  { headerSize: '2"', branchSize: '1/2"', type: 'Weldolet', schedule: 'STD', length: 25, width: 35, weight: 0.08 },
  { headerSize: '2"', branchSize: '3/4"', type: 'Weldolet', schedule: 'STD', length: 30, width: 40, weight: 0.12 },
  { headerSize: '3"', branchSize: '1/2"', type: 'Weldolet', schedule: 'STD', length: 30, width: 38, weight: 0.10 },
  { headerSize: '3"', branchSize: '1"', type: 'Weldolet', schedule: 'STD', length: 38, width: 48, weight: 0.22 },
  { headerSize: '4"', branchSize: '1"', type: 'Weldolet', schedule: 'STD', length: 42, width: 52, weight: 0.28 },
  { headerSize: '4"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 55, width: 72, weight: 0.55 },
  { headerSize: '6"', branchSize: '1"', type: 'Weldolet', schedule: 'STD', length: 48, width: 58, weight: 0.42 },
  { headerSize: '6"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 62, width: 80, weight: 0.85 },
  { headerSize: '6"', branchSize: '3"', type: 'Weldolet', schedule: 'STD', length: 75, width: 100, weight: 1.4 },
  { headerSize: '8"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 68, width: 88, weight: 1.2 },
  { headerSize: '8"', branchSize: '4"', type: 'Weldolet', schedule: 'STD', length: 88, width: 125, weight: 2.8 },
  { headerSize: '10"', branchSize: '2"', type: 'Weldolet', schedule: 'STD', length: 75, width: 95, weight: 1.8 },
  { headerSize: '10"', branchSize: '4"', type: 'Weldolet', schedule: 'STD', length: 95, width: 135, weight: 3.8 },
  { headerSize: '12"', branchSize: '4"', type: 'Weldolet', schedule: 'STD', length: 102, width: 145, weight: 4.8 },
  { headerSize: '12"', branchSize: '6"', type: 'Weldolet', schedule: 'STD', length: 125, width: 185, weight: 8.5 },
  { headerSize: '2"', branchSize: '1/2"', type: 'Sockolet', schedule: '3000', length: 32, width: 32, weight: 0.12 },
  { headerSize: '3"', branchSize: '1/2"', type: 'Sockolet', schedule: '3000', length: 35, width: 35, weight: 0.15 },
  { headerSize: '4"', branchSize: '1"', type: 'Sockolet', schedule: '3000', length: 48, width: 50, weight: 0.35 },
  { headerSize: '6"', branchSize: '1"', type: 'Sockolet', schedule: '3000', length: 52, width: 55, weight: 0.48 },
  { headerSize: '2"', branchSize: '1/2"', type: 'Threadolet', schedule: '3000', length: 28, width: 32, weight: 0.10 },
  { headerSize: '3"', branchSize: '1"', type: 'Threadolet', schedule: '3000', length: 40, width: 45, weight: 0.25 },
  { headerSize: '4"', branchSize: '1"', type: 'Threadolet', schedule: '3000', length: 45, width: 50, weight: 0.32 },
];

export const oletTypes = [
  { id: 'weldolet', name: 'Weldolet', abbr: 'WOL' },
  { id: 'sockolet', name: 'Sockolet', abbr: 'SOL' },
  { id: 'threadolet', name: 'Threadolet', abbr: 'TOL' },
  { id: 'elbolet', name: 'Elbolet', abbr: 'EOL' },
  { id: 'latrolet', name: 'Latrolet', abbr: 'LOL' },
];

// ============= FLEXIBILITY (SIF) =============

export interface FlexibilityData {
  component: string;
  type: string;
  sifIn: string;
  sifOut: string;
  kFactor: string;
  description: string;
}

export const flexibilityData: FlexibilityData[] = [
  { component: '90° Long Radius Elbow', type: 'Butt Weld', sifIn: '0.9 / h^(2/3)', sifOut: '0.75 / h^(2/3)', kFactor: '1.65 / h', description: 'h = tR/r², t=wall, R=bend radius, r=mean radius' },
  { component: '90° Short Radius Elbow', type: 'Butt Weld', sifIn: '0.9 / h^(2/3)', sifOut: '0.75 / h^(2/3)', kFactor: '1.65 / h', description: 'Same formula, R = 1.0D instead of 1.5D' },
  { component: '45° Elbow', type: 'Butt Weld', sifIn: '0.9 / h^(2/3)', sifOut: '0.75 / h^(2/3)', kFactor: '1.65 / h', description: 'Reduced effective angle' },
  { component: 'Welding Tee (Equal)', type: 'Butt Weld', sifIn: '0.9 / h^(2/3)', sifOut: '0.75 / h^(2/3)', kFactor: '1.0', description: 'Per ASME B31.3 Table D300' },
  { component: 'Weldolet', type: 'Welded', sifIn: '0.9 / h^(2/3)', sifOut: '0.75 / h^(2/3)', kFactor: '1.0', description: 'Integrally reinforced branch' },
  { component: 'Reducer (Concentric)', type: 'Butt Weld', sifIn: '1.0', sifOut: '1.0', kFactor: '1.0', description: 'Minimal stress intensification' },
  { component: 'Socket Weld Fitting', type: 'Socket Weld', sifIn: '2.1', sifOut: '2.1', kFactor: '1.0', description: 'Fixed value per B31.3' },
  { component: 'Threaded Fitting', type: 'Threaded', sifIn: '2.3', sifOut: '2.3', kFactor: '1.0', description: 'Fixed value per B31.3' },
];

// ============= SAFE SPANS =============

export interface SafeSpanData {
  size: string;
  nominalDN: number;
  schedule: string;
  material: string;
  contentDensity: number;
  maxSpan: number;
  maxSpanFixed: number;
  naturalFrequency: number;
  deflection: number;
}

export const safeSpanData: SafeSpanData[] = [
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
  { size: '2"', nominalDN: 50, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 4.6, maxSpanFixed: 5.7, naturalFrequency: 8.5, deflection: 3.5 },
  { size: '4"', nominalDN: 100, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 6.1, maxSpanFixed: 7.6, naturalFrequency: 7.0, deflection: 4.5 },
  { size: '6"', nominalDN: 150, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 7.3, maxSpanFixed: 9.1, naturalFrequency: 6.2, deflection: 5.0 },
  { size: '8"', nominalDN: 200, schedule: '40', material: 'CS', contentDensity: 0, maxSpan: 8.2, maxSpanFixed: 10.3, naturalFrequency: 5.5, deflection: 5.5 },
];

// ============= UTILITY FUNCTIONS =============

export function getFlange(size: string, pressureClass: string): FlangeData | undefined {
  return flangeData.find(f => f.size === size && f.pressureClass === pressureClass);
}

export function getUniqueSizes(): string[] {
  return [...new Set(flangeData.map(f => f.size))];
}

export function getUniqueHeaderSizes(): string[] {
  return [...new Set(oletData.map(o => o.headerSize))];
}
