export const GAS_CONSTANT = 8314.46; // J/(kmol·K)
export const STANDARD_TEMPERATURE = 288.15; // K (15°C)
export const STANDARD_PRESSURE = 101325; // Pa (1 atm)
export const GRAVITY = 9.80665; // m/s²
export const PI = Math.PI;

export interface PipeSpec {
  nps: string;
  od_mm: number;
  schedule: string;
  wt_mm: number;
  id_mm: number;
}

export const PIPE_SPECS: PipeSpec[] = [
  // NPS 1/8" (DN 6), OD 10.3 mm
  { nps: "1/8\"", od_mm: 10.3, schedule: "5S", wt_mm: 0.89, id_mm: 8.52 },
  { nps: "1/8\"", od_mm: 10.3, schedule: "10, 10S", wt_mm: 1.24, id_mm: 7.82 },
  { nps: "1/8\"", od_mm: 10.3, schedule: "40, STD, 40S", wt_mm: 1.73, id_mm: 6.84 },
  { nps: "1/8\"", od_mm: 10.3, schedule: "80, XS, 80S", wt_mm: 2.41, id_mm: 5.48 },

  // NPS 1/4" (DN 8), OD 13.7 mm
  { nps: "1/4\"", od_mm: 13.7, schedule: "5S", wt_mm: 1.24, id_mm: 11.22 },
  { nps: "1/4\"", od_mm: 13.7, schedule: "10, 10S", wt_mm: 1.65, id_mm: 10.4 },
  { nps: "1/4\"", od_mm: 13.7, schedule: "40, STD, 40S", wt_mm: 2.24, id_mm: 9.22 },
  { nps: "1/4\"", od_mm: 13.7, schedule: "80, XS, 80S", wt_mm: 3.02, id_mm: 7.66 },

  // NPS 3/8" (DN 10), OD 17.1 mm
  { nps: "3/8\"", od_mm: 17.1, schedule: "5S", wt_mm: 1.24, id_mm: 14.62 },
  { nps: "3/8\"", od_mm: 17.1, schedule: "10, 10S", wt_mm: 1.65, id_mm: 13.8 },
  { nps: "3/8\"", od_mm: 17.1, schedule: "40, STD, 40S", wt_mm: 2.31, id_mm: 12.48 },
  { nps: "3/8\"", od_mm: 17.1, schedule: "80, XS, 80S", wt_mm: 3.2, id_mm: 10.7 },

  // NPS 1/2" (DN 15), OD 21.3 mm
  { nps: "1/2\"", od_mm: 21.3, schedule: "5S", wt_mm: 1.65, id_mm: 18.0 },
  { nps: "1/2\"", od_mm: 21.3, schedule: "10, 10S", wt_mm: 2.11, id_mm: 17.08 },
  { nps: "1/2\"", od_mm: 21.3, schedule: "40, STD, 40S", wt_mm: 2.77, id_mm: 15.76 },
  { nps: "1/2\"", od_mm: 21.3, schedule: "80, XS, 80S", wt_mm: 3.73, id_mm: 13.84 },
  { nps: "1/2\"", od_mm: 21.3, schedule: "160", wt_mm: 4.78, id_mm: 11.74 },
  { nps: "1/2\"", od_mm: 21.3, schedule: "XXS", wt_mm: 7.47, id_mm: 6.36 },

  // NPS 3/4" (DN 20), OD 26.7 mm
  { nps: "3/4\"", od_mm: 26.7, schedule: "5S", wt_mm: 1.65, id_mm: 23.4 },
  { nps: "3/4\"", od_mm: 26.7, schedule: "10, 10S", wt_mm: 2.11, id_mm: 22.48 },
  { nps: "3/4\"", od_mm: 26.7, schedule: "40, STD, 40S", wt_mm: 2.87, id_mm: 20.96 },
  { nps: "3/4\"", od_mm: 26.7, schedule: "80, XS, 80S", wt_mm: 3.91, id_mm: 18.88 },
  { nps: "3/4\"", od_mm: 26.7, schedule: "160", wt_mm: 5.56, id_mm: 15.58 },
  { nps: "3/4\"", od_mm: 26.7, schedule: "XXS", wt_mm: 7.82, id_mm: 11.06 },

  // NPS 1" (DN 25), OD 33.4 mm
  { nps: "1\"", od_mm: 33.4, schedule: "5S", wt_mm: 1.65, id_mm: 30.1 },
  { nps: "1\"", od_mm: 33.4, schedule: "10, 10S", wt_mm: 2.77, id_mm: 27.86 },
  { nps: "1\"", od_mm: 33.4, schedule: "40, STD, 40S", wt_mm: 3.38, id_mm: 26.64 },
  { nps: "1\"", od_mm: 33.4, schedule: "80, XS, 80S", wt_mm: 4.55, id_mm: 24.3 },
  { nps: "1\"", od_mm: 33.4, schedule: "160", wt_mm: 6.35, id_mm: 20.7 },
  { nps: "1\"", od_mm: 33.4, schedule: "XXS", wt_mm: 9.09, id_mm: 15.22 },

  // NPS 1-1/4" (DN 32), OD 42.2 mm
  { nps: "1-1/4\"", od_mm: 42.2, schedule: "5S", wt_mm: 1.65, id_mm: 38.9 },
  { nps: "1-1/4\"", od_mm: 42.2, schedule: "10, 10S", wt_mm: 2.77, id_mm: 36.66 },
  { nps: "1-1/4\"", od_mm: 42.2, schedule: "40, STD, 40S", wt_mm: 3.56, id_mm: 35.08 },
  { nps: "1-1/4\"", od_mm: 42.2, schedule: "80, XS, 80S", wt_mm: 4.85, id_mm: 32.5 },
  { nps: "1-1/4\"", od_mm: 42.2, schedule: "160", wt_mm: 6.35, id_mm: 29.5 },
  { nps: "1-1/4\"", od_mm: 42.2, schedule: "XXS", wt_mm: 9.7, id_mm: 22.8 },

  // NPS 1-1/2" (DN 40), OD 48.3 mm
  { nps: "1-1/2\"", od_mm: 48.3, schedule: "5S", wt_mm: 1.65, id_mm: 45.0 },
  { nps: "1-1/2\"", od_mm: 48.3, schedule: "10, 10S", wt_mm: 2.77, id_mm: 42.76 },
  { nps: "1-1/2\"", od_mm: 48.3, schedule: "40, STD, 40S", wt_mm: 3.68, id_mm: 40.94 },
  { nps: "1-1/2\"", od_mm: 48.3, schedule: "80, XS, 80S", wt_mm: 5.08, id_mm: 38.14 },
  { nps: "1-1/2\"", od_mm: 48.3, schedule: "160", wt_mm: 7.14, id_mm: 34.02 },
  { nps: "1-1/2\"", od_mm: 48.3, schedule: "XXS", wt_mm: 10.15, id_mm: 28.0 },

  // NPS 2" (DN 50), OD 60.3 mm
  { nps: "2\"", od_mm: 60.3, schedule: "5S", wt_mm: 1.65, id_mm: 57.0 },
  { nps: "2\"", od_mm: 60.3, schedule: "10, 10S", wt_mm: 2.77, id_mm: 54.76 },
  { nps: "2\"", od_mm: 60.3, schedule: "40, STD, 40S", wt_mm: 3.91, id_mm: 52.48 },
  { nps: "2\"", od_mm: 60.3, schedule: "80, XS, 80S", wt_mm: 5.54, id_mm: 49.22 },
  { nps: "2\"", od_mm: 60.3, schedule: "160", wt_mm: 8.74, id_mm: 42.82 },
  { nps: "2\"", od_mm: 60.3, schedule: "XXS", wt_mm: 11.07, id_mm: 38.16 },

  // NPS 2-1/2" (DN 65), OD 73.0 mm
  { nps: "2-1/2\"", od_mm: 73.0, schedule: "5S", wt_mm: 2.11, id_mm: 68.78 },
  { nps: "2-1/2\"", od_mm: 73.0, schedule: "10, 10S", wt_mm: 3.05, id_mm: 66.9 },
  { nps: "2-1/2\"", od_mm: 73.0, schedule: "40, STD, 40S", wt_mm: 5.16, id_mm: 62.68 },
  { nps: "2-1/2\"", od_mm: 73.0, schedule: "80, XS, 80S", wt_mm: 7.01, id_mm: 58.98 },
  { nps: "2-1/2\"", od_mm: 73.0, schedule: "160", wt_mm: 9.53, id_mm: 53.94 },
  { nps: "2-1/2\"", od_mm: 73.0, schedule: "XXS", wt_mm: 14.02, id_mm: 44.96 },

  // NPS 3" (DN 80), OD 88.9 mm
  { nps: "3\"", od_mm: 88.9, schedule: "5S", wt_mm: 2.11, id_mm: 84.68 },
  { nps: "3\"", od_mm: 88.9, schedule: "10, 10S", wt_mm: 3.05, id_mm: 82.8 },
  { nps: "3\"", od_mm: 88.9, schedule: "40, STD, 40S", wt_mm: 5.49, id_mm: 77.92 },
  { nps: "3\"", od_mm: 88.9, schedule: "80, XS, 80S", wt_mm: 7.62, id_mm: 73.66 },
  { nps: "3\"", od_mm: 88.9, schedule: "160", wt_mm: 11.13, id_mm: 66.64 },
  { nps: "3\"", od_mm: 88.9, schedule: "XXS", wt_mm: 15.24, id_mm: 58.42 },

  // NPS 3-1/2" (DN 90), OD 101.6 mm
  { nps: "3-1/2\"", od_mm: 101.6, schedule: "5S", wt_mm: 2.11, id_mm: 97.38 },
  { nps: "3-1/2\"", od_mm: 101.6, schedule: "10, 10S", wt_mm: 3.05, id_mm: 95.5 },
  { nps: "3-1/2\"", od_mm: 101.6, schedule: "40, STD, 40S", wt_mm: 5.74, id_mm: 90.12 },
  { nps: "3-1/2\"", od_mm: 101.6, schedule: "80, XS, 80S", wt_mm: 8.08, id_mm: 85.44 },

  // NPS 4" (DN 100), OD 114.3 mm
  { nps: "4\"", od_mm: 114.3, schedule: "5S", wt_mm: 2.11, id_mm: 110.08 },
  { nps: "4\"", od_mm: 114.3, schedule: "10, 10S", wt_mm: 3.05, id_mm: 108.2 },
  { nps: "4\"", od_mm: 114.3, schedule: "40, STD, 40S", wt_mm: 6.02, id_mm: 102.26 },
  { nps: "4\"", od_mm: 114.3, schedule: "80, XS, 80S", wt_mm: 8.56, id_mm: 97.18 },
  { nps: "4\"", od_mm: 114.3, schedule: "120", wt_mm: 11.13, id_mm: 92.04 },
  { nps: "4\"", od_mm: 114.3, schedule: "160", wt_mm: 13.49, id_mm: 87.32 },
  { nps: "4\"", od_mm: 114.3, schedule: "XXS", wt_mm: 17.12, id_mm: 80.06 },

  // NPS 5" (DN 125), OD 141.3 mm
  { nps: "5\"", od_mm: 141.3, schedule: "5S", wt_mm: 2.77, id_mm: 135.76 },
  { nps: "5\"", od_mm: 141.3, schedule: "10, 10S", wt_mm: 3.4, id_mm: 134.5 },
  { nps: "5\"", od_mm: 141.3, schedule: "40, STD, 40S", wt_mm: 6.55, id_mm: 128.2 },
  { nps: "5\"", od_mm: 141.3, schedule: "80, XS, 80S", wt_mm: 9.53, id_mm: 122.24 },
  { nps: "5\"", od_mm: 141.3, schedule: "120", wt_mm: 12.7, id_mm: 115.9 },
  { nps: "5\"", od_mm: 141.3, schedule: "160", wt_mm: 15.88, id_mm: 109.54 },
  { nps: "5\"", od_mm: 141.3, schedule: "XXS", wt_mm: 19.05, id_mm: 103.2 },

  // NPS 6" (DN 150), OD 168.3 mm
  { nps: "6\"", od_mm: 168.3, schedule: "5S", wt_mm: 2.77, id_mm: 162.76 },
  { nps: "6\"", od_mm: 168.3, schedule: "10, 10S", wt_mm: 3.4, id_mm: 161.5 },
  { nps: "6\"", od_mm: 168.3, schedule: "40, STD, 40S", wt_mm: 7.11, id_mm: 154.08 },
  { nps: "6\"", od_mm: 168.3, schedule: "80, XS, 80S", wt_mm: 10.97, id_mm: 146.36 },
  { nps: "6\"", od_mm: 168.3, schedule: "120", wt_mm: 14.27, id_mm: 139.76 },
  { nps: "6\"", od_mm: 168.3, schedule: "160", wt_mm: 18.26, id_mm: 131.78 },
  { nps: "6\"", od_mm: 168.3, schedule: "XXS", wt_mm: 21.95, id_mm: 124.4 },

  // NPS 8" (DN 200), OD 219.1 mm
  { nps: "8\"", od_mm: 219.1, schedule: "5S", wt_mm: 2.77, id_mm: 213.56 },
  { nps: "8\"", od_mm: 219.1, schedule: "10, 10S", wt_mm: 3.76, id_mm: 211.58 },
  { nps: "8\"", od_mm: 219.1, schedule: "20", wt_mm: 6.35, id_mm: 206.4 },
  { nps: "8\"", od_mm: 219.1, schedule: "30", wt_mm: 7.04, id_mm: 205.02 },
  { nps: "8\"", od_mm: 219.1, schedule: "40, STD, 40S", wt_mm: 8.18, id_mm: 202.74 },
  { nps: "8\"", od_mm: 219.1, schedule: "60", wt_mm: 10.31, id_mm: 198.48 },
  { nps: "8\"", od_mm: 219.1, schedule: "80, XS, 80S", wt_mm: 12.7, id_mm: 193.7 },
  { nps: "8\"", od_mm: 219.1, schedule: "100", wt_mm: 15.09, id_mm: 188.92 },
  { nps: "8\"", od_mm: 219.1, schedule: "120", wt_mm: 18.26, id_mm: 182.58 },
  { nps: "8\"", od_mm: 219.1, schedule: "140", wt_mm: 20.62, id_mm: 177.86 },
  { nps: "8\"", od_mm: 219.1, schedule: "160", wt_mm: 23.01, id_mm: 173.08 },
  { nps: "8\"", od_mm: 219.1, schedule: "XXS", wt_mm: 22.23, id_mm: 174.64 },

  // NPS 10" (DN 250), OD 273.1 mm
  { nps: "10\"", od_mm: 273.1, schedule: "5S", wt_mm: 3.4, id_mm: 266.3 },
  { nps: "10\"", od_mm: 273.1, schedule: "10, 10S", wt_mm: 4.19, id_mm: 264.72 },
  { nps: "10\"", od_mm: 273.1, schedule: "20", wt_mm: 6.35, id_mm: 260.4 },
  { nps: "10\"", od_mm: 273.1, schedule: "30", wt_mm: 7.8, id_mm: 257.5 },
  { nps: "10\"", od_mm: 273.1, schedule: "40, STD, 40S", wt_mm: 9.27, id_mm: 254.56 },
  { nps: "10\"", od_mm: 273.1, schedule: "60, XS, 80S", wt_mm: 12.7, id_mm: 247.7 },
  { nps: "10\"", od_mm: 273.1, schedule: "80", wt_mm: 15.09, id_mm: 242.92 },
  { nps: "10\"", od_mm: 273.1, schedule: "100", wt_mm: 18.26, id_mm: 236.58 },
  { nps: "10\"", od_mm: 273.1, schedule: "120", wt_mm: 21.44, id_mm: 230.22 },
  { nps: "10\"", od_mm: 273.1, schedule: "140", wt_mm: 25.4, id_mm: 222.3 },
  { nps: "10\"", od_mm: 273.1, schedule: "160", wt_mm: 28.58, id_mm: 215.94 },

  // NPS 12" (DN 300), OD 323.9 mm
  { nps: "12\"", od_mm: 323.9, schedule: "5S", wt_mm: 3.96, id_mm: 315.98 },
  { nps: "12\"", od_mm: 323.9, schedule: "10, 10S", wt_mm: 4.57, id_mm: 314.76 },
  { nps: "12\"", od_mm: 323.9, schedule: "20", wt_mm: 6.35, id_mm: 311.2 },
  { nps: "12\"", od_mm: 323.9, schedule: "30", wt_mm: 8.38, id_mm: 307.14 },
  { nps: "12\"", od_mm: 323.9, schedule: "STD, 40S", wt_mm: 9.53, id_mm: 304.84 },
  { nps: "12\"", od_mm: 323.9, schedule: "40", wt_mm: 10.31, id_mm: 303.28 },
  { nps: "12\"", od_mm: 323.9, schedule: "XS, 80S", wt_mm: 12.7, id_mm: 298.5 },
  { nps: "12\"", od_mm: 323.9, schedule: "60", wt_mm: 14.27, id_mm: 295.36 },
  { nps: "12\"", od_mm: 323.9, schedule: "80", wt_mm: 17.48, id_mm: 288.94 },
  { nps: "12\"", od_mm: 323.9, schedule: "100", wt_mm: 21.44, id_mm: 281.02 },
  { nps: "12\"", od_mm: 323.9, schedule: "120", wt_mm: 25.4, id_mm: 273.1 },
  { nps: "12\"", od_mm: 323.9, schedule: "140", wt_mm: 28.58, id_mm: 266.74 },
  { nps: "12\"", od_mm: 323.9, schedule: "160", wt_mm: 33.32, id_mm: 257.26 },

  // NPS 14" (DN 350), OD 355.6 mm — STD ≠ SCH 40 from here
  { nps: "14\"", od_mm: 355.6, schedule: "5S", wt_mm: 3.96, id_mm: 347.68 },
  { nps: "14\"", od_mm: 355.6, schedule: "10, 10S", wt_mm: 4.78, id_mm: 346.04 },
  { nps: "14\"", od_mm: 355.6, schedule: "20", wt_mm: 7.92, id_mm: 339.76 },
  { nps: "14\"", od_mm: 355.6, schedule: "30, STD", wt_mm: 9.53, id_mm: 336.54 },
  { nps: "14\"", od_mm: 355.6, schedule: "40", wt_mm: 11.13, id_mm: 333.34 },
  { nps: "14\"", od_mm: 355.6, schedule: "XS", wt_mm: 12.7, id_mm: 330.2 },
  { nps: "14\"", od_mm: 355.6, schedule: "60", wt_mm: 15.09, id_mm: 325.42 },
  { nps: "14\"", od_mm: 355.6, schedule: "80", wt_mm: 19.05, id_mm: 317.5 },
  { nps: "14\"", od_mm: 355.6, schedule: "100", wt_mm: 23.83, id_mm: 307.94 },
  { nps: "14\"", od_mm: 355.6, schedule: "120", wt_mm: 27.79, id_mm: 300.02 },
  { nps: "14\"", od_mm: 355.6, schedule: "140", wt_mm: 31.75, id_mm: 292.1 },
  { nps: "14\"", od_mm: 355.6, schedule: "160", wt_mm: 35.71, id_mm: 284.18 },

  // NPS 16" (DN 400), OD 406.4 mm
  { nps: "16\"", od_mm: 406.4, schedule: "5S", wt_mm: 4.19, id_mm: 398.02 },
  { nps: "16\"", od_mm: 406.4, schedule: "10, 10S", wt_mm: 4.78, id_mm: 396.84 },
  { nps: "16\"", od_mm: 406.4, schedule: "20", wt_mm: 7.92, id_mm: 390.56 },
  { nps: "16\"", od_mm: 406.4, schedule: "30, STD", wt_mm: 9.53, id_mm: 387.34 },
  { nps: "16\"", od_mm: 406.4, schedule: "40, XS", wt_mm: 12.7, id_mm: 381.0 },
  { nps: "16\"", od_mm: 406.4, schedule: "60", wt_mm: 16.66, id_mm: 373.08 },
  { nps: "16\"", od_mm: 406.4, schedule: "80", wt_mm: 21.44, id_mm: 363.52 },
  { nps: "16\"", od_mm: 406.4, schedule: "100", wt_mm: 26.19, id_mm: 354.02 },
  { nps: "16\"", od_mm: 406.4, schedule: "120", wt_mm: 30.96, id_mm: 344.48 },
  { nps: "16\"", od_mm: 406.4, schedule: "140", wt_mm: 36.53, id_mm: 333.34 },
  { nps: "16\"", od_mm: 406.4, schedule: "160", wt_mm: 40.49, id_mm: 325.42 },

  // NPS 18" (DN 450), OD 457.2 mm
  { nps: "18\"", od_mm: 457.2, schedule: "5S", wt_mm: 4.19, id_mm: 448.82 },
  { nps: "18\"", od_mm: 457.2, schedule: "10, 10S", wt_mm: 4.78, id_mm: 447.64 },
  { nps: "18\"", od_mm: 457.2, schedule: "20", wt_mm: 7.92, id_mm: 441.36 },
  { nps: "18\"", od_mm: 457.2, schedule: "STD", wt_mm: 9.53, id_mm: 438.14 },
  { nps: "18\"", od_mm: 457.2, schedule: "30", wt_mm: 11.13, id_mm: 434.94 },
  { nps: "18\"", od_mm: 457.2, schedule: "XS", wt_mm: 12.7, id_mm: 431.8 },
  { nps: "18\"", od_mm: 457.2, schedule: "40", wt_mm: 14.27, id_mm: 428.66 },
  { nps: "18\"", od_mm: 457.2, schedule: "60", wt_mm: 19.05, id_mm: 419.1 },
  { nps: "18\"", od_mm: 457.2, schedule: "80", wt_mm: 23.83, id_mm: 409.54 },
  { nps: "18\"", od_mm: 457.2, schedule: "100", wt_mm: 29.36, id_mm: 398.48 },
  { nps: "18\"", od_mm: 457.2, schedule: "120", wt_mm: 34.93, id_mm: 387.34 },
  { nps: "18\"", od_mm: 457.2, schedule: "140", wt_mm: 39.67, id_mm: 377.86 },
  { nps: "18\"", od_mm: 457.2, schedule: "160", wt_mm: 45.24, id_mm: 366.72 },

  // NPS 20" (DN 500), OD 508.0 mm
  { nps: "20\"", od_mm: 508.0, schedule: "5S", wt_mm: 4.78, id_mm: 498.44 },
  { nps: "20\"", od_mm: 508.0, schedule: "10, 10S", wt_mm: 5.54, id_mm: 496.92 },
  { nps: "20\"", od_mm: 508.0, schedule: "20, STD", wt_mm: 9.53, id_mm: 488.94 },
  { nps: "20\"", od_mm: 508.0, schedule: "30, XS", wt_mm: 12.7, id_mm: 482.6 },
  { nps: "20\"", od_mm: 508.0, schedule: "40", wt_mm: 15.09, id_mm: 477.82 },
  { nps: "20\"", od_mm: 508.0, schedule: "60", wt_mm: 20.62, id_mm: 466.76 },
  { nps: "20\"", od_mm: 508.0, schedule: "80", wt_mm: 26.19, id_mm: 455.62 },
  { nps: "20\"", od_mm: 508.0, schedule: "100", wt_mm: 32.54, id_mm: 442.92 },
  { nps: "20\"", od_mm: 508.0, schedule: "120", wt_mm: 38.1, id_mm: 431.8 },
  { nps: "20\"", od_mm: 508.0, schedule: "140", wt_mm: 44.45, id_mm: 419.1 },
  { nps: "20\"", od_mm: 508.0, schedule: "160", wt_mm: 50.01, id_mm: 407.98 },

  // NPS 22" (DN 550), OD 558.8 mm
  { nps: "22\"", od_mm: 558.8, schedule: "5S", wt_mm: 4.78, id_mm: 549.24 },
  { nps: "22\"", od_mm: 558.8, schedule: "10, 10S", wt_mm: 5.54, id_mm: 547.72 },
  { nps: "22\"", od_mm: 558.8, schedule: "20, STD", wt_mm: 9.53, id_mm: 539.74 },
  { nps: "22\"", od_mm: 558.8, schedule: "30, XS", wt_mm: 12.7, id_mm: 533.4 },
  { nps: "22\"", od_mm: 558.8, schedule: "60", wt_mm: 22.23, id_mm: 514.34 },
  { nps: "22\"", od_mm: 558.8, schedule: "80", wt_mm: 28.58, id_mm: 501.64 },
  { nps: "22\"", od_mm: 558.8, schedule: "100", wt_mm: 34.93, id_mm: 488.94 },
  { nps: "22\"", od_mm: 558.8, schedule: "120", wt_mm: 41.28, id_mm: 476.24 },
  { nps: "22\"", od_mm: 558.8, schedule: "140", wt_mm: 47.63, id_mm: 463.54 },
  { nps: "22\"", od_mm: 558.8, schedule: "160", wt_mm: 53.98, id_mm: 450.84 },

  // NPS 24" (DN 600), OD 609.6 mm
  { nps: "24\"", od_mm: 609.6, schedule: "5S", wt_mm: 5.54, id_mm: 598.52 },
  { nps: "24\"", od_mm: 609.6, schedule: "10, 10S", wt_mm: 6.35, id_mm: 596.9 },
  { nps: "24\"", od_mm: 609.6, schedule: "20, STD", wt_mm: 9.53, id_mm: 590.54 },
  { nps: "24\"", od_mm: 609.6, schedule: "XS", wt_mm: 12.7, id_mm: 584.2 },
  { nps: "24\"", od_mm: 609.6, schedule: "30", wt_mm: 14.27, id_mm: 581.06 },
  { nps: "24\"", od_mm: 609.6, schedule: "40", wt_mm: 17.48, id_mm: 574.64 },
  { nps: "24\"", od_mm: 609.6, schedule: "60", wt_mm: 24.61, id_mm: 560.38 },
  { nps: "24\"", od_mm: 609.6, schedule: "80", wt_mm: 30.96, id_mm: 547.68 },
  { nps: "24\"", od_mm: 609.6, schedule: "100", wt_mm: 38.89, id_mm: 531.82 },
  { nps: "24\"", od_mm: 609.6, schedule: "120", wt_mm: 46.02, id_mm: 517.56 },
  { nps: "24\"", od_mm: 609.6, schedule: "140", wt_mm: 52.37, id_mm: 504.86 },
  { nps: "24\"", od_mm: 609.6, schedule: "160", wt_mm: 59.54, id_mm: 490.52 },

  // NPS 26" (DN 650), OD 660.4 mm
  { nps: "26\"", od_mm: 660.4, schedule: "10", wt_mm: 7.92, id_mm: 644.56 },
  { nps: "26\"", od_mm: 660.4, schedule: "STD", wt_mm: 9.53, id_mm: 641.34 },
  { nps: "26\"", od_mm: 660.4, schedule: "20, XS", wt_mm: 12.7, id_mm: 635.0 },

  // NPS 28" (DN 700), OD 711.2 mm
  { nps: "28\"", od_mm: 711.2, schedule: "10", wt_mm: 7.92, id_mm: 695.36 },
  { nps: "28\"", od_mm: 711.2, schedule: "STD", wt_mm: 9.53, id_mm: 692.14 },
  { nps: "28\"", od_mm: 711.2, schedule: "20, XS", wt_mm: 12.7, id_mm: 685.8 },
  { nps: "28\"", od_mm: 711.2, schedule: "30", wt_mm: 15.88, id_mm: 679.44 },

  // NPS 30" (DN 750), OD 762.0 mm
  { nps: "30\"", od_mm: 762.0, schedule: "5S", wt_mm: 6.35, id_mm: 749.3 },
  { nps: "30\"", od_mm: 762.0, schedule: "10, 10S", wt_mm: 7.92, id_mm: 746.16 },
  { nps: "30\"", od_mm: 762.0, schedule: "STD", wt_mm: 9.53, id_mm: 742.94 },
  { nps: "30\"", od_mm: 762.0, schedule: "20, XS", wt_mm: 12.7, id_mm: 736.6 },
  { nps: "30\"", od_mm: 762.0, schedule: "30", wt_mm: 15.88, id_mm: 730.24 },

  // NPS 32" (DN 800), OD 812.8 mm
  { nps: "32\"", od_mm: 812.8, schedule: "10", wt_mm: 7.92, id_mm: 796.96 },
  { nps: "32\"", od_mm: 812.8, schedule: "STD", wt_mm: 9.53, id_mm: 793.74 },
  { nps: "32\"", od_mm: 812.8, schedule: "20, XS", wt_mm: 12.7, id_mm: 787.4 },
  { nps: "32\"", od_mm: 812.8, schedule: "30", wt_mm: 15.88, id_mm: 781.04 },
  { nps: "32\"", od_mm: 812.8, schedule: "40", wt_mm: 17.48, id_mm: 777.84 },

  // NPS 34" (DN 850), OD 863.6 mm
  { nps: "34\"", od_mm: 863.6, schedule: "10", wt_mm: 7.92, id_mm: 847.76 },
  { nps: "34\"", od_mm: 863.6, schedule: "STD", wt_mm: 9.53, id_mm: 844.54 },
  { nps: "34\"", od_mm: 863.6, schedule: "20, XS", wt_mm: 12.7, id_mm: 838.2 },
  { nps: "34\"", od_mm: 863.6, schedule: "30", wt_mm: 15.88, id_mm: 831.84 },
  { nps: "34\"", od_mm: 863.6, schedule: "40", wt_mm: 17.48, id_mm: 828.64 },

  // NPS 36" (DN 900), OD 914.4 mm
  { nps: "36\"", od_mm: 914.4, schedule: "5S", wt_mm: 7.92, id_mm: 898.56 },
  { nps: "36\"", od_mm: 914.4, schedule: "10, 10S, STD", wt_mm: 9.53, id_mm: 895.34 },
  { nps: "36\"", od_mm: 914.4, schedule: "20, XS", wt_mm: 12.7, id_mm: 889.0 },
  { nps: "36\"", od_mm: 914.4, schedule: "30", wt_mm: 15.88, id_mm: 882.64 },
  { nps: "36\"", od_mm: 914.4, schedule: "40", wt_mm: 19.05, id_mm: 876.3 },

  // NPS 42" (DN 1050), OD 1066.8 mm
  { nps: "42\"", od_mm: 1066.8, schedule: "STD", wt_mm: 9.53, id_mm: 1047.74 },
  { nps: "42\"", od_mm: 1066.8, schedule: "20, XS", wt_mm: 12.7, id_mm: 1041.4 },
  { nps: "42\"", od_mm: 1066.8, schedule: "30", wt_mm: 15.88, id_mm: 1035.04 },

  // NPS 48" (DN 1200), OD 1219.2 mm
  { nps: "48\"", od_mm: 1219.2, schedule: "STD", wt_mm: 9.53, id_mm: 1200.14 },
  { nps: "48\"", od_mm: 1219.2, schedule: "20, XS", wt_mm: 12.7, id_mm: 1193.8 },
  { nps: "48\"", od_mm: 1219.2, schedule: "30", wt_mm: 15.88, id_mm: 1187.44 },
  { nps: "48\"", od_mm: 1219.2, schedule: "40", wt_mm: 19.05, id_mm: 1181.1 },
];

export function getNPSList(): string[] {
  const seen = new Set<string>();
  return PIPE_SPECS.filter((s) => {
    if (seen.has(s.nps)) return false;
    seen.add(s.nps);
    return true;
  }).map((s) => s.nps);
}

export function getSchedulesForNPS(nps: string): string[] {
  return PIPE_SPECS.filter((s) => s.nps === nps).map((s) => s.schedule);
}

export function getPipeSpec(nps: string, schedule: string): PipeSpec | undefined {
  return PIPE_SPECS.find((s) => s.nps === nps && s.schedule === schedule);
}

export const PIPE_ROUGHNESS: Record<string, number> = {
  "Carbon Steel": 0.0000457,
  "Stainless Steel": 0.0000152,
  "Commercial Steel": 0.0000457,
  "Drawn Tubing": 0.0000015,
  "Galvanized Iron": 0.000152,
  "Cast Iron": 0.000259,
  "Concrete": 0.001524,
  "PVC/HDPE": 0.0000015,
};

export const GAS_SPECIFIC_HEAT_RATIO: Record<string, number> = {
  "Methane": 1.31,
  "Ethane": 1.19,
  "Propane": 1.13,
  "Natural Gas (typical)": 1.27,
  "Air": 1.40,
  "Nitrogen": 1.40,
  "CO2": 1.29,
  "Hydrogen": 1.41,
};

export const COMMON_GASES: Record<string, { mw: number; gamma: number }> = {
  "Methane (CH4)": { mw: 16.04, gamma: 1.31 },
  "Ethane (C2H6)": { mw: 30.07, gamma: 1.19 },
  "Propane (C3H8)": { mw: 44.10, gamma: 1.13 },
  "n-Butane (C4H10)": { mw: 58.12, gamma: 1.09 },
  "Nitrogen (N2)": { mw: 28.01, gamma: 1.40 },
  "Carbon Dioxide (CO2)": { mw: 44.01, gamma: 1.29 },
  "Hydrogen Sulfide (H2S)": { mw: 34.08, gamma: 1.32 },
  "Hydrogen (H2)": { mw: 2.016, gamma: 1.41 },
  "Oxygen (O2)": { mw: 32.00, gamma: 1.40 },
  "Water Vapor (H2O)": { mw: 18.015, gamma: 1.33 },
};

export const VELOCITY_LIMITS = {
  gas: { min: 3, max: 25, warning: 20 },
  liquid: { min: 0.5, max: 5, warning: 3 },
  multiphase: { min: 1, max: 15, warning: 10 },
};

export const MACH_LIMIT = 0.3;
export const RHO_V2_LIMIT = 6000; // kg/(m·s²) for AIV/FIV screening

export interface GasServiceLimit {
  service: string;
  dpLimit?: number;
  dpType?: "bar/km" | "%Pop";
  velocityLimit?: number;
  rhoV2Limit?: number;
  machLimit?: number;
  notes?: string;
}

export const GAS_SERVICE_LIMITS: GasServiceLimit[] = [
  { service: "Continuous – Vacuum", dpType: "%Pop", dpLimit: 10, velocityLimit: 60 },
  { service: "Continuous – Pop atm to 2 barg", dpLimit: 0.5, dpType: "bar/km", velocityLimit: 50 },
  { service: "Continuous – Pop 2 to 7 barg", dpLimit: 1, dpType: "bar/km", velocityLimit: 45 },
  { service: "Continuous – Pop 7 to 35 barg", dpLimit: 1.5, dpType: "bar/km", rhoV2Limit: 15000 },
  { service: "Continuous – Pop 35 to 140 barg", dpLimit: 3, dpType: "bar/km", rhoV2Limit: 20000 },
  { service: "Continuous – Pop above 140 barg", dpLimit: 5, dpType: "bar/km", rhoV2Limit: 25000 },
  { service: "Compressor suction – Vacuum", dpLimit: 0.05, dpType: "bar/km", velocityLimit: 35 },
  { service: "Compressor suction – Pop atm to 2 barg", dpLimit: 0.15, dpType: "bar/km", velocityLimit: 30 },
  { service: "Compressor suction – Pop 2 to 7 barg", dpLimit: 0.4, dpType: "bar/km", velocityLimit: 25 },
  { service: "Compressor suction – Pop 7 to 35 barg", dpLimit: 1, dpType: "bar/km", rhoV2Limit: 6000 },
  { service: "Compressor suction – Pop > 35 barg", dpLimit: 2, dpType: "bar/km", rhoV2Limit: 15000 },
  { service: "Column overhead to condenser", notes: "Same criteria as compressor suction (select matching pressure range above)" },
  { service: "Kettle reboiler return", notes: "Same criteria as compressor suction (select matching pressure range above)" },
  { service: "Discontinuous – Pop < 35 barg", velocityLimit: 60, rhoV2Limit: 15000 },
  { service: "Discontinuous – Pop >= 35 barg", rhoV2Limit: 25000 },
  { service: "Flare – upstream PSV", dpLimit: 3, dpType: "%Pop", notes: "DP < 3% of PRV set pressure (based on set pressure, not operating)" },
  { service: "Flare – upstream BDV", velocityLimit: 60, rhoV2Limit: 30000 },
  { service: "Flare tail pipe", machLimit: 0.7 },
  { service: "Flare tail pipe (downstream BDV)", machLimit: 1.0 },
  { service: "Flare header", machLimit: 0.5 },
  { service: "Steam – Superheated 150#", dpLimit: 2, dpType: "bar/km", velocityLimit: 45 },
  { service: "Steam – Superheated 300#", dpLimit: 3, dpType: "bar/km", velocityLimit: 60 },
  { service: "Steam – Superheated 600#", dpLimit: 6, dpType: "bar/km", velocityLimit: 60 },
  { service: "Steam – Superheated >= 900#", dpLimit: 8, dpType: "bar/km", velocityLimit: 70 },
  { service: "Steam – Saturated 150#", dpLimit: 1, dpType: "bar/km", velocityLimit: 45 },
  { service: "Steam – Saturated 300#", dpLimit: 3, dpType: "bar/km", velocityLimit: 35 },
  { service: "Steam – Saturated 600#", dpLimit: 6, dpType: "bar/km", velocityLimit: 30 },
  { service: "Superheated steam header – 150#", dpLimit: 1, dpType: "bar/km", velocityLimit: 45 },
  { service: "Superheated steam header – 300#", dpLimit: 1.5, dpType: "bar/km", velocityLimit: 45 },
  { service: "Superheated steam header – 600#", dpLimit: 2, dpType: "bar/km", velocityLimit: 45 },
  { service: "Fuel Gas – Vacuum", dpType: "%Pop", dpLimit: 10, velocityLimit: 60 },
  { service: "Fuel Gas – Pop atm to 2 barg", dpLimit: 0.5, dpType: "bar/km", velocityLimit: 50 },
  { service: "Fuel Gas – Pop 2 to 7 barg", dpLimit: 1, dpType: "bar/km", velocityLimit: 45 },
  { service: "Fuel Gas – Pop 7 to 35 barg", dpLimit: 1.5, dpType: "bar/km", rhoV2Limit: 15000 },
  { service: "Fuel Gas – Pop 35 to 140 barg", dpLimit: 3, dpType: "bar/km", rhoV2Limit: 20000 },
  { service: "Fuel Gas – Pop above 140 barg", dpLimit: 5, dpType: "bar/km", rhoV2Limit: 25000 },
];

export type NPSBand = "<=2\"" | "3\"-6\"" | "8\"-12\"" | "14\"-18\"" | ">=20\"";

export interface LiquidServiceLimit {
  service: string;
  dpLimit?: number;
  velocityByNPS?: Record<NPSBand, number>;
  velocityFixed?: number;
  notes?: string;
}

export const LIQUID_SERVICE_LIMITS: LiquidServiceLimit[] = [
  { service: "Gravity flow", velocityByNPS: { "<=2\"": 0.3, "3\"-6\"": 0.4, "8\"-12\"": 0.6, "14\"-18\"": 0.8, ">=20\"": 0.9 } },
  { service: "Pump suction – boiling point", dpLimit: 0.5, velocityByNPS: { "<=2\"": 0.6, "3\"-6\"": 0.9, "8\"-12\"": 1.3, "14\"-18\"": 1.8, ">=20\"": 2.2 } },
  { service: "Pump suction – sub-cooled", dpLimit: 1, velocityByNPS: { "<=2\"": 0.7, "3\"-6\"": 1.2, "8\"-12\"": 1.6, "14\"-18\"": 2.1, ">=20\"": 2.6 } },
  { service: "Pump discharge – Pop < 35 barg", dpLimit: 4.5, velocityByNPS: { "<=2\"": 1.4, "3\"-6\"": 1.9, "8\"-12\"": 3.1, "14\"-18\"": 4.1, ">=20\"": 5.0 } },
  { service: "Pump discharge – Pop > 35 barg", dpLimit: 6, velocityByNPS: { "<=2\"": 1.5, "3\"-6\"": 2.0, "8\"-12\"": 3.5, "14\"-18\"": 4.6, ">=20\"": 5.0 } },
  { service: "Condenser out – Pop < 10 barg", velocityByNPS: { "<=2\"": 0.3, "3\"-6\"": 0.4, "8\"-12\"": 0.6, "14\"-18\"": 0.8, ">=20\"": 0.9 } },
  { service: "Condenser out – Pop > 10 barg", dpLimit: 0.5, velocityByNPS: { "<=2\"": 0.6, "3\"-6\"": 0.9, "8\"-12\"": 1.3, "14\"-18\"": 1.8, ">=20\"": 2.2 } },
  { service: "Cooling water manifold", velocityFixed: 3.5, notes: "3.5 m/s steel pipe / 2.5 m/s fibre glass" },
  { service: "Cooling water sub-manifold", velocityByNPS: { "<=2\"": 1.5, "3\"-6\"": 2.0, "8\"-12\"": 3.1, "14\"-18\"": 3.5, ">=20\"": 3.5 } },
  { service: "Diathermic oil – Pop < 35 barg", dpLimit: 4.5, velocityByNPS: { "<=2\"": 1.4, "3\"-6\"": 1.9, "8\"-12\"": 3.1, "14\"-18\"": 4.1, ">=20\"": 5.0 } },
  { service: "Diathermic oil – Pop > 35 barg", dpLimit: 6, velocityByNPS: { "<=2\"": 1.5, "3\"-6\"": 2.0, "8\"-12\"": 3.5, "14\"-18\"": 4.6, ">=20\"": 5.0 } },
  { service: "Liquid sulphur", velocityFixed: 1.8, notes: "0.9 m/s minimum" },
  { service: "Column side-stream draw-off", velocityByNPS: { "<=2\"": 0.3, "3\"-6\"": 0.4, "8\"-12\"": 0.6, "14\"-18\"": 0.8, ">=20\"": 0.9 } },
];

export interface MixedPhaseServiceLimit {
  service: string;
  rhoV2Limit: number;
  notes?: string;
}

export const MIXED_PHASE_SERVICE_LIMITS: MixedPhaseServiceLimit[] = [
  { service: "Continuous – P < 7 barg", rhoV2Limit: 6000 },
  { service: "Continuous – P > 7 barg", rhoV2Limit: 15000 },
  { service: "Discontinuous", rhoV2Limit: 15000 },
  { service: "Erosive fluid – continuous", rhoV2Limit: 3750 },
  { service: "Erosive fluid – discontinuous", rhoV2Limit: 6000 },
  { service: "Partial condenser outlet", rhoV2Limit: 6000 },
  { service: "Reboiler return (natural circ.)", rhoV2Limit: 1500 },
  { service: "Flare tail pipe (with liquids)", rhoV2Limit: 50000, notes: "Also recommended: Mach < 0.25 (not checked — requires detailed multiphase simulation)" },
  { service: "Flare header (with liquids)", rhoV2Limit: 50000, notes: "Also recommended: Mach < 0.25 (not checked — requires detailed multiphase simulation)" },
];

export function getNPSBand(nps: string): NPSBand {
  const npsNum = parseNPSToInches(nps);
  if (npsNum <= 2) return "<=2\"";
  if (npsNum <= 6) return "3\"-6\"";
  if (npsNum <= 12) return "8\"-12\"";
  if (npsNum <= 18) return "14\"-18\"";
  return ">=20\"";
}

export function getNPSBandFromDiameter(id_mm: number): NPSBand {
  if (id_mm <= 60.3) return "<=2\"";
  if (id_mm <= 168.3) return "3\"-6\"";
  if (id_mm <= 323.9) return "8\"-12\"";
  if (id_mm <= 457.2) return "14\"-18\"";
  return ">=20\"";
}

function parseNPSToInches(nps: string): number {
  const cleaned = nps.replace('"', '').trim();
  if (cleaned.includes('/')) {
    if (cleaned.includes('-')) {
      const [whole, frac] = cleaned.split('-');
      const [num, den] = frac.split('/');
      return parseInt(whole) + parseInt(num) / parseInt(den);
    }
    const [num, den] = cleaned.split('/');
    return parseInt(num) / parseInt(den);
  }
  return parseFloat(cleaned);
}

export const COMMON_LIQUIDS: Record<string, { density: number; viscosity: number; name: string; vaporPressure?: number }> = {
  "Water (20°C)": { density: 998, viscosity: 0.001, name: "Water", vaporPressure: 2.339 },
  "Seawater (20°C)": { density: 1025, viscosity: 0.00108, name: "Seawater", vaporPressure: 2.339 },
  "Crude Oil (light)": { density: 850, viscosity: 0.005, name: "Crude Oil (light)", vaporPressure: 50 },
  "Crude Oil (medium)": { density: 900, viscosity: 0.02, name: "Crude Oil (medium)", vaporPressure: 30 },
  "Crude Oil (heavy)": { density: 950, viscosity: 0.1, name: "Crude Oil (heavy)", vaporPressure: 10 },
  "Diesel": { density: 832, viscosity: 0.003, name: "Diesel", vaporPressure: 0.4 },
  "Gasoline": { density: 720, viscosity: 0.0006, name: "Gasoline", vaporPressure: 55 },
  "Kerosene": { density: 810, viscosity: 0.0024, name: "Kerosene", vaporPressure: 1.5 },
  "Naphtha": { density: 750, viscosity: 0.0005, name: "Naphtha" },
  "MEG (Mono Ethylene Glycol)": { density: 1113, viscosity: 0.0161, name: "MEG" },
  "DEG (Di Ethylene Glycol)": { density: 1118, viscosity: 0.032, name: "DEG" },
  "TEG (Tri Ethylene Glycol)": { density: 1125, viscosity: 0.049, name: "TEG" },
  "Methanol": { density: 791, viscosity: 0.00059, name: "Methanol" },
  "Ethanol": { density: 789, viscosity: 0.0012, name: "Ethanol" },
  "Amine (MDEA 50wt%)": { density: 1038, viscosity: 0.006, name: "MDEA" },
  "Produced Water": { density: 1050, viscosity: 0.001, name: "Produced Water" },
  "Condensate": { density: 700, viscosity: 0.0003, name: "Condensate" },
  "LPG (liquid)": { density: 550, viscosity: 0.00015, name: "LPG" },
};

export interface FittingKValue {
  type: string;
  k: number;
  description: string;
}

export const FITTING_K_VALUES: FittingKValue[] = [
  { type: "90° Elbow (standard)", k: 0.9, description: "Standard radius 90° elbow" },
  { type: "90° Elbow (long radius)", k: 0.6, description: "Long radius 90° elbow (R=1.5D)" },
  { type: "45° Elbow", k: 0.4, description: "Standard 45° elbow" },
  { type: "Tee (through run)", k: 0.3, description: "Tee, flow through run" },
  { type: "Tee (through branch)", k: 1.0, description: "Tee, flow through branch" },
  { type: "Gate Valve (full open)", k: 0.2, description: "Gate valve, fully open" },
  { type: "Globe Valve (full open)", k: 6.0, description: "Globe valve, fully open" },
  { type: "Check Valve (swing)", k: 2.0, description: "Swing check valve" },
  { type: "Ball Valve (full open)", k: 0.05, description: "Full bore ball valve" },
  { type: "Butterfly Valve (full open)", k: 0.3, description: "Butterfly valve, fully open" },
  { type: "Reducer (sudden contraction)", k: 0.5, description: "Sudden pipe contraction" },
  { type: "Expander (sudden expansion)", k: 1.0, description: "Sudden pipe expansion" },
  { type: "Pipe Entry (sharp)", k: 0.5, description: "Sharp-edged entry from tank" },
  { type: "Pipe Exit", k: 1.0, description: "Exit to tank/atmosphere" },
  { type: "Strainer (Y-type)", k: 2.0, description: "Y-type strainer (clean)" },
  { type: "Strainer (basket)", k: 3.5, description: "Basket strainer (clean)" },
];
