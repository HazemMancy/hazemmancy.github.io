/**
 * Pipe Schedule Database
 * Inside diameters based on ASME B36.10M (Carbon Steel) and B36.19M (Stainless Steel)
 * 
 * All dimensions in millimeters
 */

export interface PipeSize {
  nominalSize: string;      // Nominal pipe size (NPS)
  nominalSizeMM: number;    // DN equivalent
  outerDiameter: number;    // Outer diameter in mm
  schedules: Record<string, number>; // Schedule -> Inner diameter in mm
}

export const pipeScheduleData: PipeSize[] = [
  {
    nominalSize: "1/8\"",
    nominalSizeMM: 6,
    outerDiameter: 10.3,
    schedules: {
      "5S": 8.3, "10S": 7.8, "40/STD": 6.8, "80/XS": 5.5
    }
  },
  {
    nominalSize: "1/4\"",
    nominalSizeMM: 8,
    outerDiameter: 13.7,
    schedules: {
      "5S": 11.7, "10S": 10.9, "40/STD": 9.2, "80/XS": 7.7
    }
  },
  {
    nominalSize: "3/8\"",
    nominalSizeMM: 10,
    outerDiameter: 17.1,
    schedules: {
      "5S": 15.1, "10S": 14.3, "40/STD": 12.5, "80/XS": 10.7
    }
  },
  {
    nominalSize: "1/2\"",
    nominalSizeMM: 15,
    outerDiameter: 21.3,
    schedules: {
      "5S": 19.3, "10S": 18.0, "40/STD": 15.8, "80/XS": 13.9, "160": 11.7, "XXS": 8.1
    }
  },
  {
    nominalSize: "3/4\"",
    nominalSizeMM: 20,
    outerDiameter: 26.7,
    schedules: {
      "5S": 24.7, "10S": 23.4, "40/STD": 20.9, "80/XS": 18.8, "160": 15.5, "XXS": 11.1
    }
  },
  {
    nominalSize: "1\"",
    nominalSizeMM: 25,
    outerDiameter: 33.4,
    schedules: {
      "5S": 31.4, "10S": 30.1, "40/STD": 26.6, "80/XS": 24.3, "160": 20.7, "XXS": 15.2
    }
  },
  {
    nominalSize: "1-1/4\"",
    nominalSizeMM: 32,
    outerDiameter: 42.2,
    schedules: {
      "5S": 40.2, "10S": 38.9, "40/STD": 35.1, "80/XS": 32.5, "160": 29.5, "XXS": 22.8
    }
  },
  {
    nominalSize: "1-1/2\"",
    nominalSizeMM: 40,
    outerDiameter: 48.3,
    schedules: {
      "5S": 46.3, "10S": 45.0, "40/STD": 40.9, "80/XS": 38.1, "160": 33.9, "XXS": 27.9
    }
  },
  {
    nominalSize: "2\"",
    nominalSizeMM: 50,
    outerDiameter: 60.3,
    schedules: {
      "5S": 58.3, "10S": 57.0, "40/STD": 52.5, "80/XS": 49.2, "160": 42.8, "XXS": 38.2
    }
  },
  {
    nominalSize: "2-1/2\"",
    nominalSizeMM: 65,
    outerDiameter: 73.0,
    schedules: {
      "5S": 70.6, "10S": 69.8, "40/STD": 62.7, "80/XS": 59.0, "160": 53.9, "XXS": 44.9
    }
  },
  {
    nominalSize: "3\"",
    nominalSizeMM: 80,
    outerDiameter: 88.9,
    schedules: {
      "5S": 86.5, "10S": 85.4, "40/STD": 77.9, "80/XS": 73.7, "160": 66.6, "XXS": 58.4
    }
  },
  {
    nominalSize: "3-1/2\"",
    nominalSizeMM: 90,
    outerDiameter: 101.6,
    schedules: {
      "5S": 99.2, "10S": 98.0, "40/STD": 90.1, "80/XS": 85.4
    }
  },
  {
    nominalSize: "4\"",
    nominalSizeMM: 100,
    outerDiameter: 114.3,
    schedules: {
      "5S": 111.9, "10S": 110.1, "40/STD": 102.3, "80/XS": 97.2, "120": 92.0, "160": 87.3, "XXS": 80.1
    }
  },
  {
    nominalSize: "5\"",
    nominalSizeMM: 125,
    outerDiameter: 141.3,
    schedules: {
      "5S": 138.9, "10S": 137.1, "40/STD": 128.2, "80/XS": 122.2, "120": 115.8, "160": 109.5, "XXS": 103.2
    }
  },
  {
    nominalSize: "6\"",
    nominalSizeMM: 150,
    outerDiameter: 168.3,
    schedules: {
      "5S": 165.9, "10S": 163.9, "40/STD": 154.1, "80/XS": 146.3, "120": 139.7, "160": 131.7, "XXS": 124.4
    }
  },
  {
    nominalSize: "8\"",
    nominalSizeMM: 200,
    outerDiameter: 219.1,
    schedules: {
      "5S": 216.7, "10S": 214.7, "20": 210.9, "30": 208.0, "40/STD": 202.7, "60": 198.4, "80/XS": 193.7, "100": 188.9, "120": 182.5, "140": 177.8, "160": 173.1, "XXS": 174.6
    }
  },
  {
    nominalSize: "10\"",
    nominalSizeMM: 250,
    outerDiameter: 273.1,
    schedules: {
      "5S": 270.5, "10S": 268.5, "20": 264.7, "30": 260.3, "40/STD": 254.5, "60": 247.6, "80/XS": 242.9, "100": 236.5, "120": 228.6, "140": 222.2, "160": 215.9
    }
  },
  {
    nominalSize: "12\"",
    nominalSizeMM: 300,
    outerDiameter: 323.9,
    schedules: {
      "5S": 321.3, "10S": 319.3, "20": 315.5, "30": 309.6, "40": 303.2, "STD": 307.1, "60": 295.3, "80": 288.8, "XS": 298.4, "100": 280.9, "120": 269.9, "140": 262.0, "160": 253.9
    }
  },
  {
    nominalSize: "14\"",
    nominalSizeMM: 350,
    outerDiameter: 355.6,
    schedules: {
      "5S": 353.0, "10S": 351.0, "10": 349.2, "20": 345.4, "30": 339.7, "40": 333.3, "STD": 339.7, "60": 325.4, "80": 317.5, "XS": 330.2, "100": 307.9, "120": 295.3, "140": 284.2, "160": 273.0
    }
  },
  {
    nominalSize: "16\"",
    nominalSizeMM: 400,
    outerDiameter: 406.4,
    schedules: {
      "5S": 403.8, "10S": 401.8, "10": 398.0, "20": 393.7, "30": 387.3, "40": 381.0, "STD": 390.6, "60": 373.1, "80": 363.5, "XS": 381.0, "100": 354.0, "120": 339.7, "140": 325.4, "160": 311.1
    }
  },
  {
    nominalSize: "18\"",
    nominalSizeMM: 450,
    outerDiameter: 457.2,
    schedules: {
      "5S": 454.6, "10S": 452.6, "10": 447.6, "20": 441.2, "30": 434.7, "STD": 441.2, "40": 428.6, "60": 419.1, "XS": 431.8, "80": 409.6, "100": 398.0, "120": 384.0, "140": 368.3, "160": 350.5
    }
  },
  {
    nominalSize: "20\"",
    nominalSizeMM: 500,
    outerDiameter: 508.0,
    schedules: {
      "5S": 505.4, "10S": 503.4, "10": 498.4, "20": 488.9, "30": 480.1, "STD": 488.9, "40": 477.8, "60": 466.7, "XS": 482.6, "80": 455.6, "100": 442.9, "120": 428.6, "140": 412.7, "160": 393.7
    }
  },
  {
    nominalSize: "24\"",
    nominalSizeMM: 600,
    outerDiameter: 609.6,
    schedules: {
      "5S": 607.0, "10S": 605.0, "10": 598.4, "20": 584.2, "30": 574.6, "STD": 590.6, "40": 560.3, "60": 547.6, "XS": 581.0, "80": 530.1, "100": 517.6, "120": 498.4, "140": 477.8, "160": 455.6
    }
  }
];

/**
 * Get all available nominal pipe sizes
 */
export function getNominalSizes(): { value: string; label: string }[] {
  return pipeScheduleData.map(pipe => ({
    value: pipe.nominalSize,
    label: `${pipe.nominalSize} (DN${pipe.nominalSizeMM})`
  }));
}

/**
 * Get available schedules for a given nominal size
 */
export function getSchedulesForSize(nominalSize: string): string[] {
  const pipe = pipeScheduleData.find(p => p.nominalSize === nominalSize);
  return pipe ? Object.keys(pipe.schedules) : [];
}

/**
 * Get inside diameter for a given nominal size and schedule
 * Returns diameter in millimeters
 */
export function getInsideDiameter(nominalSize: string, schedule: string): number | null {
  const pipe = pipeScheduleData.find(p => p.nominalSize === nominalSize);
  if (!pipe) return null;
  return pipe.schedules[schedule] ?? null;
}

/**
 * Get outer diameter for a given nominal size
 * Returns diameter in millimeters
 */
export function getOuterDiameter(nominalSize: string): number | null {
  const pipe = pipeScheduleData.find(p => p.nominalSize === nominalSize);
  return pipe?.outerDiameter ?? null;
}

/**
 * Get wall thickness for a given nominal size and schedule
 * Returns thickness in millimeters
 */
export function getWallThickness(nominalSize: string, schedule: string): number | null {
  const od = getOuterDiameter(nominalSize);
  const id = getInsideDiameter(nominalSize, schedule);
  if (od === null || id === null) return null;
  return (od - id) / 2;
}
