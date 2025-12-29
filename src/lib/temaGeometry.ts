/**
 * TEMA Tube Geometry Standards
 * Standard tube dimensions, pitches, and layout calculations per TEMA RCB-4
 * 
 * References:
 * - TEMA Standards (10th Edition)
 * - Coulson & Richardson's Chemical Engineering (Vol. 6)
 * - Kern's Process Heat Transfer
 * - Bell-Delaware Method (AIChE)
 */

// Standard tube sizes per TEMA (OD in mm, with common wall thicknesses)
export const standardTubeSizes: { od: number; bwg: number; wall: number; di: number; name: string }[] = [
  // 5/8" (15.88mm) OD
  { od: 15.88, bwg: 14, wall: 2.11, di: 11.66, name: "5/8\" OD x 14 BWG" },
  { od: 15.88, bwg: 16, wall: 1.65, di: 12.58, name: "5/8\" OD x 16 BWG" },
  { od: 15.88, bwg: 18, wall: 1.25, di: 13.38, name: "5/8\" OD x 18 BWG" },
  
  // 3/4" (19.05mm) OD - Most common
  { od: 19.05, bwg: 12, wall: 2.77, di: 13.51, name: "3/4\" OD x 12 BWG" },
  { od: 19.05, bwg: 14, wall: 2.11, di: 14.83, name: "3/4\" OD x 14 BWG" },
  { od: 19.05, bwg: 16, wall: 1.65, di: 15.75, name: "3/4\" OD x 16 BWG" },
  { od: 19.05, bwg: 18, wall: 1.25, di: 16.55, name: "3/4\" OD x 18 BWG" },
  
  // 1" (25.4mm) OD
  { od: 25.4, bwg: 10, wall: 3.40, di: 18.60, name: "1\" OD x 10 BWG" },
  { od: 25.4, bwg: 12, wall: 2.77, di: 19.86, name: "1\" OD x 12 BWG" },
  { od: 25.4, bwg: 14, wall: 2.11, di: 21.18, name: "1\" OD x 14 BWG" },
  { od: 25.4, bwg: 16, wall: 1.65, di: 22.10, name: "1\" OD x 16 BWG" },
  
  // 1.25" (31.75mm) OD
  { od: 31.75, bwg: 10, wall: 3.40, di: 24.95, name: "1-1/4\" OD x 10 BWG" },
  { od: 31.75, bwg: 12, wall: 2.77, di: 26.21, name: "1-1/4\" OD x 12 BWG" },
  { od: 31.75, bwg: 14, wall: 2.11, di: 27.53, name: "1-1/4\" OD x 14 BWG" },
  
  // 1.5" (38.1mm) OD
  { od: 38.1, bwg: 10, wall: 3.40, di: 31.30, name: "1-1/2\" OD x 10 BWG" },
  { od: 38.1, bwg: 12, wall: 2.77, di: 32.56, name: "1-1/2\" OD x 12 BWG" },
  { od: 38.1, bwg: 14, wall: 2.11, di: 33.88, name: "1-1/2\" OD x 14 BWG" },
  
  // Metric sizes
  { od: 20, bwg: 0, wall: 2.0, di: 16.0, name: "20mm OD x 2mm wall" },
  { od: 25, bwg: 0, wall: 2.5, di: 20.0, name: "25mm OD x 2.5mm wall" },
  { od: 30, bwg: 0, wall: 2.5, di: 25.0, name: "30mm OD x 2.5mm wall" },
  { od: 38, bwg: 0, wall: 3.0, di: 32.0, name: "38mm OD x 3mm wall" },
];

// Standard tube pitches per TEMA (common combinations)
export const standardPitches: { od: number; triangular: number[]; square: number[] }[] = [
  { od: 15.88, triangular: [19.84, 20.64], square: [20.64, 22.23] },
  { od: 19.05, triangular: [23.81, 25.4], square: [25.4, 26.99] },
  { od: 25.4, triangular: [31.75, 33.34], square: [31.75, 33.34, 34.93] },
  { od: 31.75, triangular: [39.69, 41.28], square: [41.28, 44.45] },
  { od: 38.1, triangular: [47.63, 50.8], square: [50.8, 52.39] },
];

// Standard shell sizes per TEMA (ID in mm)
export const standardShellSizes = [
  152, 203, 254, 305, 337, 387, 438, 489, 540, 591, 
  635, 686, 737, 787, 838, 889, 940, 991, 1067, 1143,
  1219, 1295, 1372, 1448, 1524, 1600, 1676, 1829, 1981
];

/**
 * TEMA Tube Count Tables
 * Organized by tube OD and pitch combination
 * Per TEMA RCB-4.2 and verified against HTRI data
 */
export interface TubeCountEntry {
  triangular: number;
  square: number;
}

export interface TubeCountTable {
  tubeOD: number;      // mm
  tubePitch: number;   // mm
  name: string;
  counts: Record<number, Record<number, TubeCountEntry>>; // shellDia -> passes -> counts
}

// 3/4" OD (19.05mm) on 15/16" (23.81mm) triangular, 1" (25.4mm) square - tight pitch
const tubeCount_19_24: TubeCountTable = {
  tubeOD: 19.05,
  tubePitch: 23.81,
  name: "3/4\" OD on 15/16\" pitch",
  counts: {
    205: { 1: { triangular: 40, square: 32 }, 2: { triangular: 36, square: 28 }, 4: { triangular: 28, square: 20 } },
    257: { 1: { triangular: 68, square: 55 }, 2: { triangular: 64, square: 50 }, 4: { triangular: 52, square: 40 } },
    307: { 1: { triangular: 100, square: 80 }, 2: { triangular: 94, square: 74 }, 4: { triangular: 80, square: 64 } },
    337: { 1: { triangular: 126, square: 100 }, 2: { triangular: 118, square: 92 }, 4: { triangular: 104, square: 80 } },
    387: { 1: { triangular: 166, square: 132 }, 2: { triangular: 156, square: 124 }, 4: { triangular: 140, square: 108 } },
    438: { 1: { triangular: 216, square: 172 }, 2: { triangular: 202, square: 160 }, 4: { triangular: 180, square: 140 } },
    489: { 1: { triangular: 270, square: 216 }, 2: { triangular: 254, square: 200 }, 4: { triangular: 228, square: 176 } },
    540: { 1: { triangular: 334, square: 266 }, 2: { triangular: 314, square: 248 }, 4: { triangular: 282, square: 218 } },
    591: { 1: { triangular: 402, square: 320 }, 2: { triangular: 378, square: 300 }, 4: { triangular: 340, square: 264 } },
    635: { 1: { triangular: 472, square: 376 }, 2: { triangular: 444, square: 352 }, 4: { triangular: 400, square: 312 } },
    686: { 1: { triangular: 552, square: 440 }, 2: { triangular: 520, square: 412 }, 4: { triangular: 468, square: 364 } },
    737: { 1: { triangular: 640, square: 510 }, 2: { triangular: 602, square: 478 }, 4: { triangular: 542, square: 424 } },
    787: { 1: { triangular: 734, square: 584 }, 2: { triangular: 690, square: 548 }, 4: { triangular: 622, square: 486 } },
    838: { 1: { triangular: 834, square: 664 }, 2: { triangular: 784, square: 622 }, 4: { triangular: 706, square: 552 } },
    889: { 1: { triangular: 938, square: 746 }, 2: { triangular: 882, square: 700 }, 4: { triangular: 794, square: 620 } },
    940: { 1: { triangular: 1048, square: 834 }, 2: { triangular: 984, square: 782 }, 4: { triangular: 888, square: 694 } },
    991: { 1: { triangular: 1164, square: 926 }, 2: { triangular: 1094, square: 868 }, 4: { triangular: 986, square: 770 } },
    1067: { 1: { triangular: 1362, square: 1082 }, 2: { triangular: 1280, square: 1016 }, 4: { triangular: 1154, square: 900 } },
  }
};

// 3/4" OD (19.05mm) on 1" (25.4mm) pitch - standard pitch
const tubeCount_19_25: TubeCountTable = {
  tubeOD: 19.05,
  tubePitch: 25.4,
  name: "3/4\" OD on 1\" pitch (standard)",
  counts: {
    205: { 1: { triangular: 32, square: 26 }, 2: { triangular: 30, square: 24 }, 4: { triangular: 24, square: 16 } },
    257: { 1: { triangular: 56, square: 45 }, 2: { triangular: 52, square: 40 }, 4: { triangular: 40, square: 32 } },
    307: { 1: { triangular: 81, square: 64 }, 2: { triangular: 76, square: 60 }, 4: { triangular: 68, square: 52 } },
    337: { 1: { triangular: 106, square: 81 }, 2: { triangular: 98, square: 76 }, 4: { triangular: 90, square: 68 } },
    387: { 1: { triangular: 138, square: 109 }, 2: { triangular: 130, square: 102 }, 4: { triangular: 118, square: 90 } },
    438: { 1: { triangular: 177, square: 142 }, 2: { triangular: 166, square: 130 }, 4: { triangular: 150, square: 118 } },
    489: { 1: { triangular: 224, square: 178 }, 2: { triangular: 212, square: 166 }, 4: { triangular: 196, square: 150 } },
    540: { 1: { triangular: 277, square: 220 }, 2: { triangular: 262, square: 206 }, 4: { triangular: 242, square: 188 } },
    591: { 1: { triangular: 334, square: 265 }, 2: { triangular: 316, square: 250 }, 4: { triangular: 294, square: 228 } },
    635: { 1: { triangular: 394, square: 314 }, 2: { triangular: 374, square: 296 }, 4: { triangular: 346, square: 270 } },
    686: { 1: { triangular: 460, square: 365 }, 2: { triangular: 436, square: 346 }, 4: { triangular: 406, square: 316 } },
    737: { 1: { triangular: 532, square: 422 }, 2: { triangular: 506, square: 400 }, 4: { triangular: 470, square: 366 } },
    787: { 1: { triangular: 608, square: 481 }, 2: { triangular: 578, square: 456 }, 4: { triangular: 538, square: 420 } },
    838: { 1: { triangular: 692, square: 549 }, 2: { triangular: 658, square: 520 }, 4: { triangular: 614, square: 478 } },
    889: { 1: { triangular: 774, square: 613 }, 2: { triangular: 738, square: 584 }, 4: { triangular: 688, square: 536 } },
    940: { 1: { triangular: 866, square: 685 }, 2: { triangular: 826, square: 654 }, 4: { triangular: 770, square: 600 } },
    991: { 1: { triangular: 962, square: 762 }, 2: { triangular: 916, square: 724 }, 4: { triangular: 856, square: 666 } },
    1067: { 1: { triangular: 1126, square: 889 }, 2: { triangular: 1072, square: 848 }, 4: { triangular: 1002, square: 778 } },
    1219: { 1: { triangular: 1500, square: 1182 }, 2: { triangular: 1428, square: 1128 }, 4: { triangular: 1336, square: 1040 } },
    1372: { 1: { triangular: 1920, square: 1514 }, 2: { triangular: 1830, square: 1446 }, 4: { triangular: 1714, square: 1334 } },
    1524: { 1: { triangular: 2394, square: 1889 }, 2: { triangular: 2282, square: 1802 }, 4: { triangular: 2138, square: 1662 } },
  }
};

// 1" OD (25.4mm) on 1-1/4" (31.75mm) pitch
const tubeCount_25_32: TubeCountTable = {
  tubeOD: 25.4,
  tubePitch: 31.75,
  name: "1\" OD on 1-1/4\" pitch",
  counts: {
    307: { 1: { triangular: 52, square: 41 }, 2: { triangular: 48, square: 36 }, 4: { triangular: 40, square: 28 } },
    337: { 1: { triangular: 68, square: 53 }, 2: { triangular: 62, square: 48 }, 4: { triangular: 52, square: 40 } },
    387: { 1: { triangular: 89, square: 69 }, 2: { triangular: 82, square: 64 }, 4: { triangular: 72, square: 52 } },
    438: { 1: { triangular: 114, square: 89 }, 2: { triangular: 106, square: 82 }, 4: { triangular: 94, square: 72 } },
    489: { 1: { triangular: 144, square: 113 }, 2: { triangular: 134, square: 104 }, 4: { triangular: 118, square: 92 } },
    540: { 1: { triangular: 178, square: 140 }, 2: { triangular: 166, square: 130 }, 4: { triangular: 148, square: 114 } },
    591: { 1: { triangular: 214, square: 169 }, 2: { triangular: 200, square: 156 }, 4: { triangular: 178, square: 138 } },
    635: { 1: { triangular: 252, square: 199 }, 2: { triangular: 236, square: 184 }, 4: { triangular: 210, square: 164 } },
    686: { 1: { triangular: 296, square: 233 }, 2: { triangular: 276, square: 216 }, 4: { triangular: 246, square: 192 } },
    737: { 1: { triangular: 342, square: 270 }, 2: { triangular: 320, square: 250 }, 4: { triangular: 286, square: 222 } },
    787: { 1: { triangular: 392, square: 310 }, 2: { triangular: 366, square: 286 }, 4: { triangular: 328, square: 256 } },
    838: { 1: { triangular: 446, square: 352 }, 2: { triangular: 416, square: 326 }, 4: { triangular: 374, square: 292 } },
    889: { 1: { triangular: 502, square: 396 }, 2: { triangular: 468, square: 366 }, 4: { triangular: 420, square: 328 } },
    940: { 1: { triangular: 560, square: 442 }, 2: { triangular: 522, square: 408 }, 4: { triangular: 468, square: 366 } },
    991: { 1: { triangular: 622, square: 490 }, 2: { triangular: 580, square: 454 }, 4: { triangular: 522, square: 406 } },
    1067: { 1: { triangular: 726, square: 572 }, 2: { triangular: 678, square: 530 }, 4: { triangular: 608, square: 474 } },
    1219: { 1: { triangular: 966, square: 762 }, 2: { triangular: 902, square: 704 }, 4: { triangular: 810, square: 632 } },
    1372: { 1: { triangular: 1238, square: 976 }, 2: { triangular: 1156, square: 902 }, 4: { triangular: 1040, square: 810 } },
    1524: { 1: { triangular: 1542, square: 1216 }, 2: { triangular: 1440, square: 1124 }, 4: { triangular: 1296, square: 1010 } },
  }
};

// 1" OD (25.4mm) on 1-5/16" (33.34mm) pitch - wider spacing
const tubeCount_25_33: TubeCountTable = {
  tubeOD: 25.4,
  tubePitch: 33.34,
  name: "1\" OD on 1-5/16\" pitch",
  counts: {
    307: { 1: { triangular: 45, square: 36 }, 2: { triangular: 42, square: 32 }, 4: { triangular: 36, square: 24 } },
    387: { 1: { triangular: 78, square: 61 }, 2: { triangular: 72, square: 56 }, 4: { triangular: 62, square: 48 } },
    489: { 1: { triangular: 126, square: 100 }, 2: { triangular: 118, square: 92 }, 4: { triangular: 104, square: 80 } },
    591: { 1: { triangular: 188, square: 149 }, 2: { triangular: 176, square: 138 }, 4: { triangular: 156, square: 122 } },
    686: { 1: { triangular: 260, square: 206 }, 2: { triangular: 244, square: 190 }, 4: { triangular: 216, square: 168 } },
    787: { 1: { triangular: 346, square: 274 }, 2: { triangular: 324, square: 254 }, 4: { triangular: 288, square: 224 } },
    889: { 1: { triangular: 442, square: 350 }, 2: { triangular: 414, square: 324 }, 4: { triangular: 368, square: 286 } },
    991: { 1: { triangular: 550, square: 436 }, 2: { triangular: 514, square: 402 }, 4: { triangular: 458, square: 356 } },
    1067: { 1: { triangular: 644, square: 510 }, 2: { triangular: 602, square: 470 }, 4: { triangular: 536, square: 418 } },
    1219: { 1: { triangular: 856, square: 678 }, 2: { triangular: 800, square: 626 }, 4: { triangular: 712, square: 556 } },
    1372: { 1: { triangular: 1098, square: 870 }, 2: { triangular: 1026, square: 802 }, 4: { triangular: 914, square: 712 } },
    1524: { 1: { triangular: 1370, square: 1084 }, 2: { triangular: 1280, square: 1000 }, 4: { triangular: 1140, square: 890 } },
  }
};

// 1-1/4" OD (31.75mm) on 1-9/16" (39.69mm) pitch
const tubeCount_32_40: TubeCountTable = {
  tubeOD: 31.75,
  tubePitch: 39.69,
  name: "1-1/4\" OD on 1-9/16\" pitch",
  counts: {
    387: { 1: { triangular: 52, square: 41 }, 2: { triangular: 48, square: 36 }, 4: { triangular: 40, square: 28 } },
    489: { 1: { triangular: 85, square: 68 }, 2: { triangular: 78, square: 62 }, 4: { triangular: 68, square: 52 } },
    591: { 1: { triangular: 128, square: 102 }, 2: { triangular: 118, square: 94 }, 4: { triangular: 104, square: 80 } },
    686: { 1: { triangular: 178, square: 140 }, 2: { triangular: 166, square: 130 }, 4: { triangular: 146, square: 114 } },
    787: { 1: { triangular: 236, square: 186 }, 2: { triangular: 220, square: 172 }, 4: { triangular: 196, square: 152 } },
    889: { 1: { triangular: 300, square: 237 }, 2: { triangular: 280, square: 218 }, 4: { triangular: 248, square: 194 } },
    991: { 1: { triangular: 374, square: 296 }, 2: { triangular: 348, square: 274 }, 4: { triangular: 310, square: 242 } },
    1067: { 1: { triangular: 438, square: 346 }, 2: { triangular: 408, square: 320 }, 4: { triangular: 364, square: 284 } },
    1219: { 1: { triangular: 582, square: 460 }, 2: { triangular: 542, square: 426 }, 4: { triangular: 484, square: 378 } },
    1372: { 1: { triangular: 748, square: 592 }, 2: { triangular: 698, square: 548 }, 4: { triangular: 622, square: 486 } },
    1524: { 1: { triangular: 932, square: 736 }, 2: { triangular: 870, square: 682 }, 4: { triangular: 776, square: 606 } },
  }
};

// 5/8" OD (15.88mm) on 13/16" (20.64mm) pitch - Small tubes
const tubeCount_16_21: TubeCountTable = {
  tubeOD: 15.88,
  tubePitch: 20.64,
  name: "5/8\" OD on 13/16\" pitch",
  counts: {
    205: { 1: { triangular: 55, square: 44 }, 2: { triangular: 50, square: 40 }, 4: { triangular: 40, square: 32 } },
    257: { 1: { triangular: 94, square: 75 }, 2: { triangular: 86, square: 68 }, 4: { triangular: 72, square: 56 } },
    307: { 1: { triangular: 140, square: 111 }, 2: { triangular: 128, square: 102 }, 4: { triangular: 112, square: 88 } },
    337: { 1: { triangular: 172, square: 136 }, 2: { triangular: 158, square: 126 }, 4: { triangular: 140, square: 108 } },
    387: { 1: { triangular: 228, square: 181 }, 2: { triangular: 210, square: 166 }, 4: { triangular: 186, square: 144 } },
    438: { 1: { triangular: 296, square: 235 }, 2: { triangular: 272, square: 216 }, 4: { triangular: 242, square: 188 } },
    489: { 1: { triangular: 372, square: 295 }, 2: { triangular: 342, square: 272 }, 4: { triangular: 304, square: 236 } },
    540: { 1: { triangular: 458, square: 364 }, 2: { triangular: 422, square: 334 }, 4: { triangular: 376, square: 292 } },
    591: { 1: { triangular: 552, square: 438 }, 2: { triangular: 508, square: 402 }, 4: { triangular: 454, square: 352 } },
    635: { 1: { triangular: 648, square: 514 }, 2: { triangular: 598, square: 474 }, 4: { triangular: 534, square: 414 } },
    686: { 1: { triangular: 758, square: 602 }, 2: { triangular: 698, square: 554 }, 4: { triangular: 624, square: 484 } },
    787: { 1: { triangular: 1008, square: 800 }, 2: { triangular: 928, square: 736 }, 4: { triangular: 830, square: 644 } },
    889: { 1: { triangular: 1292, square: 1025 }, 2: { triangular: 1190, square: 944 }, 4: { triangular: 1066, square: 826 } },
    991: { 1: { triangular: 1608, square: 1276 }, 2: { triangular: 1482, square: 1176 }, 4: { triangular: 1328, square: 1030 } },
  }
};

// 5/8" OD (15.88mm) on 7/8" (22.23mm) pitch - wider spacing
const tubeCount_16_22: TubeCountTable = {
  tubeOD: 15.88,
  tubePitch: 22.23,
  name: "5/8\" OD on 7/8\" pitch",
  counts: {
    205: { 1: { triangular: 45, square: 36 }, 2: { triangular: 42, square: 32 }, 4: { triangular: 34, square: 24 } },
    257: { 1: { triangular: 78, square: 62 }, 2: { triangular: 72, square: 56 }, 4: { triangular: 60, square: 48 } },
    307: { 1: { triangular: 116, square: 92 }, 2: { triangular: 106, square: 84 }, 4: { triangular: 92, square: 72 } },
    387: { 1: { triangular: 188, square: 150 }, 2: { triangular: 174, square: 138 }, 4: { triangular: 154, square: 120 } },
    489: { 1: { triangular: 306, square: 244 }, 2: { triangular: 282, square: 224 }, 4: { triangular: 252, square: 196 } },
    591: { 1: { triangular: 456, square: 362 }, 2: { triangular: 420, square: 334 }, 4: { triangular: 376, square: 292 } },
    686: { 1: { triangular: 626, square: 498 }, 2: { triangular: 576, square: 458 }, 4: { triangular: 516, square: 400 } },
    787: { 1: { triangular: 832, square: 662 }, 2: { triangular: 768, square: 610 }, 4: { triangular: 686, square: 534 } },
    889: { 1: { triangular: 1068, square: 848 }, 2: { triangular: 984, square: 782 }, 4: { triangular: 882, square: 684 } },
    991: { 1: { triangular: 1330, square: 1058 }, 2: { triangular: 1228, square: 974 }, 4: { triangular: 1100, square: 854 } },
  }
};

// 1-1/2" OD (38.1mm) on 1-7/8" (47.63mm) pitch
const tubeCount_38_48: TubeCountTable = {
  tubeOD: 38.1,
  tubePitch: 47.63,
  name: "1-1/2\" OD on 1-7/8\" pitch",
  counts: {
    489: { 1: { triangular: 55, square: 44 }, 2: { triangular: 50, square: 40 }, 4: { triangular: 44, square: 32 } },
    591: { 1: { triangular: 82, square: 65 }, 2: { triangular: 76, square: 60 }, 4: { triangular: 66, square: 52 } },
    686: { 1: { triangular: 114, square: 90 }, 2: { triangular: 106, square: 84 }, 4: { triangular: 94, square: 72 } },
    787: { 1: { triangular: 152, square: 120 }, 2: { triangular: 140, square: 112 }, 4: { triangular: 126, square: 98 } },
    889: { 1: { triangular: 194, square: 154 }, 2: { triangular: 180, square: 142 }, 4: { triangular: 160, square: 124 } },
    991: { 1: { triangular: 242, square: 192 }, 2: { triangular: 224, square: 178 }, 4: { triangular: 200, square: 156 } },
    1067: { 1: { triangular: 284, square: 225 }, 2: { triangular: 264, square: 208 }, 4: { triangular: 236, square: 184 } },
    1219: { 1: { triangular: 378, square: 300 }, 2: { triangular: 352, square: 278 }, 4: { triangular: 314, square: 244 } },
    1372: { 1: { triangular: 486, square: 386 }, 2: { triangular: 452, square: 358 }, 4: { triangular: 404, square: 314 } },
    1524: { 1: { triangular: 608, square: 482 }, 2: { triangular: 566, square: 448 }, 4: { triangular: 506, square: 394 } },
  }
};

// 1-1/2" OD (38.1mm) on 2" (50.8mm) pitch - wider spacing for cleaning
const tubeCount_38_51: TubeCountTable = {
  tubeOD: 38.1,
  tubePitch: 50.8,
  name: "1-1/2\" OD on 2\" pitch",
  counts: {
    489: { 1: { triangular: 48, square: 38 }, 2: { triangular: 44, square: 34 }, 4: { triangular: 38, square: 28 } },
    591: { 1: { triangular: 72, square: 57 }, 2: { triangular: 66, square: 52 }, 4: { triangular: 58, square: 46 } },
    686: { 1: { triangular: 100, square: 79 }, 2: { triangular: 92, square: 72 }, 4: { triangular: 82, square: 64 } },
    787: { 1: { triangular: 134, square: 106 }, 2: { triangular: 124, square: 98 }, 4: { triangular: 110, square: 86 } },
    889: { 1: { triangular: 170, square: 135 }, 2: { triangular: 158, square: 124 }, 4: { triangular: 140, square: 110 } },
    991: { 1: { triangular: 212, square: 168 }, 2: { triangular: 198, square: 156 }, 4: { triangular: 176, square: 136 } },
    1067: { 1: { triangular: 250, square: 198 }, 2: { triangular: 232, square: 184 }, 4: { triangular: 208, square: 162 } },
    1219: { 1: { triangular: 332, square: 264 }, 2: { triangular: 310, square: 244 }, 4: { triangular: 276, square: 216 } },
    1372: { 1: { triangular: 428, square: 340 }, 2: { triangular: 398, square: 314 }, 4: { triangular: 356, square: 278 } },
    1524: { 1: { triangular: 534, square: 424 }, 2: { triangular: 498, square: 394 }, 4: { triangular: 444, square: 346 } },
  }
};

// All tube count tables combined
export const allTubeCountTables: TubeCountTable[] = [
  tubeCount_16_21,
  tubeCount_16_22,
  tubeCount_19_24,
  tubeCount_19_25,
  tubeCount_25_32,
  tubeCount_25_33,
  tubeCount_32_40,
  tubeCount_38_48,
  tubeCount_38_51,
];

/**
 * Get tube count from TEMA tables
 * Returns the closest matching entry
 */
export function getTubeCountFromTable(
  tubeOD: number,
  tubePitch: number,
  shellDiameter: number,
  tubePasses: number,
  tubePattern: "triangular" | "square" | "rotatedSquare"
): { count: number; method: string; tableUsed: string } | null {
  // Find matching table
  let bestTable: TubeCountTable | null = null;
  let minDist = Infinity;
  
  for (const table of allTubeCountTables) {
    const dist = Math.abs(table.tubeOD - tubeOD) + Math.abs(table.tubePitch - tubePitch);
    if (dist < minDist) {
      minDist = dist;
      bestTable = table;
    }
  }
  
  if (!bestTable || minDist > 5) return null; // No close match
  
  // Find closest shell size
  const shellSizes = Object.keys(bestTable.counts).map(Number).sort((a, b) => a - b);
  let closestShell = shellSizes[0];
  let shellDist = Math.abs(shellDiameter - closestShell);
  
  for (const size of shellSizes) {
    const d = Math.abs(shellDiameter - size);
    if (d < shellDist) {
      shellDist = d;
      closestShell = size;
    }
  }
  
  const passData = bestTable.counts[closestShell];
  if (!passData) return null;
  
  const passKey = tubePasses <= 1 ? 1 : tubePasses <= 2 ? 2 : 4;
  const countData = passData[passKey];
  if (!countData) return null;
  
  const pattern = tubePattern === "triangular" ? "triangular" : "square";
  
  return {
    count: countData[pattern],
    method: "TEMA Table",
    tableUsed: bestTable.name
  };
}

/**
 * Calculate tube count using improved correlations
 * 
 * Method 1: Palen's Correlation (most widely used)
 * Nt = (CTP × Db²) / (CL × Pt²)
 * 
 * Method 2: TEMA-style calculation
 * Nt = 0.785 × (Db/Pt)² × CTP / CL (for square)
 * Nt = 0.907 × (Db/Pt)² × CTP / CL (for triangular)
 * 
 * CTP = tube count constant (accounts for pass partitions)
 *   1 pass: 0.93
 *   2 pass: 0.90
 *   4 pass: 0.85
 *   6 pass: 0.80
 *   8 pass: 0.75
 * 
 * CL = layout constant
 *   Triangular (30°): 0.866
 *   Square (90°): 1.0
 *   Rotated square (45°): 1.0
 */
export function calculateTubeCount(
  shellDiameter: number, // mm
  tubeOD: number, // mm
  tubePitch: number, // mm
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number,
  shellType: "fixed" | "floating" | "u-tube" = "fixed"
): { count: number; method: string; bundleDiameter: number } {
  // First try TEMA tables
  const tableResult = getTubeCountFromTable(tubeOD, tubePitch, shellDiameter, tubePasses, tubePattern);
  if (tableResult && Math.abs(shellDiameter - 600) < 400) {
    // Use table if shell is within typical range
    const bundleDia = calculateBundleDiameterFromCount(tableResult.count, tubeOD, tubePitch, tubePattern, tubePasses);
    return { 
      count: tableResult.count, 
      method: `${tableResult.method} (${tableResult.tableUsed})`,
      bundleDiameter: bundleDia
    };
  }
  
  // Calculate bundle diameter based on shell type clearance
  let clearance: number;
  if (shellType === "fixed") {
    // Fixed tubesheet: smaller clearance
    clearance = shellDiameter < 400 ? 12 : (shellDiameter < 800 ? 18 : 25);
  } else if (shellType === "floating") {
    // Floating head: larger clearance for removal
    clearance = shellDiameter < 400 ? 40 : (shellDiameter < 800 ? 60 : 80);
  } else {
    // U-tube: medium clearance
    clearance = shellDiameter < 400 ? 20 : (shellDiameter < 800 ? 30 : 40);
  }
  
  const bundleDiameter = shellDiameter - clearance;
  
  // Layout constant
  const CL = tubePattern === "triangular" ? 0.866 : 1.0;
  
  // Tube count constant based on passes
  let CTP: number;
  switch (tubePasses) {
    case 1: CTP = 0.93; break;
    case 2: CTP = 0.90; break;
    case 4: CTP = 0.85; break;
    case 6: CTP = 0.80; break;
    case 8: CTP = 0.75; break;
    default: CTP = 0.85;
  }
  
  // Pitch ratio check (TEMA minimum)
  const pitchRatio = tubePitch / tubeOD;
  if (pitchRatio < 1.25) {
    console.warn("Pitch ratio below TEMA minimum of 1.25");
  }
  
  // Palen's correlation
  const geometricFactor = tubePattern === "triangular" ? 0.907 : 0.785;
  const Nt = geometricFactor * CTP * Math.pow(bundleDiameter / tubePitch, 2) / CL;
  
  // Round down to nearest even number for pass layouts
  let count = Math.floor(Nt);
  if (tubePasses > 1 && count % tubePasses !== 0) {
    count = Math.floor(count / tubePasses) * tubePasses;
  }
  
  return { 
    count: Math.max(count, 4), 
    method: "Palen Correlation",
    bundleDiameter 
  };
}

/**
 * Calculate bundle diameter from tube count
 * Using inverse of Palen's correlation with TEMA K1, n1 constants
 * 
 * Db = Do × (Nt / K1)^(1/n1)
 */
export function calculateBundleDiameterFromCount(
  numberOfTubes: number,
  tubeOD: number,
  tubePitch: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number
): number {
  // TEMA K1 and n1 constants (from TEMA 10th edition)
  let K1: number, n1: number;
  
  if (tubePattern === "triangular") {
    switch (tubePasses) {
      case 1: K1 = 0.319; n1 = 2.142; break;
      case 2: K1 = 0.249; n1 = 2.207; break;
      case 4: K1 = 0.175; n1 = 2.285; break;
      case 6: K1 = 0.0743; n1 = 2.499; break;
      case 8: K1 = 0.0365; n1 = 2.675; break;
      default: K1 = 0.175; n1 = 2.285;
    }
  } else {
    // Square and rotated square
    switch (tubePasses) {
      case 1: K1 = 0.215; n1 = 2.207; break;
      case 2: K1 = 0.156; n1 = 2.291; break;
      case 4: K1 = 0.158; n1 = 2.263; break;
      case 6: K1 = 0.0402; n1 = 2.617; break;
      case 8: K1 = 0.0331; n1 = 2.643; break;
      default: K1 = 0.158; n1 = 2.263;
    }
  }
  
  // Db = Do × (Nt / K1)^(1/n1)
  const bundleDiameter = tubeOD * Math.pow(numberOfTubes / K1, 1 / n1);
  
  return bundleDiameter;
}

/**
 * Calculate recommended tube pitch based on TEMA standards
 * 
 * TEMA minimum pitch ratios:
 * - Triangular (30°): Pt/Do ≥ 1.25 (1.33 for chemical cleaning access)
 * - Square (90°): Pt/Do ≥ 1.25 (1.33 for mechanical cleaning lanes)
 * - Rotated square (45°): Pt/Do ≥ 1.25
 * 
 * For proper cleaning lanes (square):
 * Minimum clearance = 6.35mm (1/4") for 19.05mm tubes
 * Minimum clearance = 9.5mm (3/8") for 25.4mm and larger tubes
 */
export function getRecommendedPitch(
  tubeOD: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  cleaningRequired: boolean = false
): { pitch: number; ratio: number; clearance: number } {
  let ratio: number;
  let minClearance: number;
  
  if (tubePattern === "triangular") {
    // Triangular doesn't have cleaning lanes
    ratio = cleaningRequired ? 1.33 : 1.25;
    minClearance = 0;
  } else {
    // Square patterns: need cleaning lanes
    if (tubeOD <= 19.05) {
      minClearance = cleaningRequired ? 6.35 : 4.76; // 1/4" or 3/16"
    } else {
      minClearance = cleaningRequired ? 9.53 : 6.35; // 3/8" or 1/4"
    }
    ratio = Math.max(1.25, (tubeOD + minClearance) / tubeOD);
  }
  
  // Calculate pitch and find nearest standard
  const calculatedPitch = tubeOD * ratio;
  
  // Find nearest standard pitch
  const standardPitchList = [
    19.84, 20.64, 22.23, 23.81, 25.4, 26.99, 
    31.75, 33.34, 34.93, 39.69, 41.28, 44.45,
    47.63, 50.8, 52.39
  ];
  
  let nearestStandard = calculatedPitch;
  let minDiff = Infinity;
  
  for (const std of standardPitchList) {
    if (std >= calculatedPitch - 1) { // Only consider pitches >= calculated
      const diff = Math.abs(std - calculatedPitch);
      if (diff < minDiff) {
        minDiff = diff;
        nearestStandard = std;
      }
    }
  }
  
  const pitch = nearestStandard;
  const actualRatio = pitch / tubeOD;
  const actualClearance = pitch - tubeOD;
  
  return { 
    pitch, 
    ratio: actualRatio, 
    clearance: actualClearance 
  };
}

// Legacy export for backward compatibility
export function calculateBundleDiameter(
  numberOfTubes: number,
  tubeOD: number,
  tubePitch: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number
): number {
  return calculateBundleDiameterFromCount(numberOfTubes, tubeOD, tubePitch, tubePattern, tubePasses);
}

/**
 * Calculate required shell diameter for given tube count
 */
export function calculateShellDiameter(
  numberOfTubes: number,
  tubeOD: number,
  tubePitch: number,
  tubePattern: "triangular" | "square" | "rotatedSquare",
  tubePasses: number,
  shellType: "fixed" | "floating" | "u-tube" = "fixed"
): { shellDiameter: number; bundleDiameter: number; clearance: number } {
  const bundleDiameter = calculateBundleDiameterFromCount(numberOfTubes, tubeOD, tubePitch, tubePattern, tubePasses);
  
  // Shell-bundle clearance based on shell type (TEMA standards)
  let clearance: number;
  if (shellType === "fixed") {
    clearance = bundleDiameter < 400 ? 12 : (bundleDiameter < 800 ? 18 : 25);
  } else if (shellType === "floating") {
    clearance = bundleDiameter < 400 ? 40 : (bundleDiameter < 800 ? 60 : 80);
  } else {
    // U-tube
    clearance = bundleDiameter < 400 ? 20 : (bundleDiameter < 800 ? 30 : 40);
  }
  
  const calculatedShell = bundleDiameter + clearance;
  
  // Find nearest standard shell size (round up)
  const nearestStandard = standardShellSizes.find(s => s >= calculatedShell) || 
                          standardShellSizes[standardShellSizes.length - 1];
  
  return { 
    shellDiameter: nearestStandard, 
    bundleDiameter,
    clearance: nearestStandard - bundleDiameter
  };
}

/**
 * Get recommended baffle spacing based on TEMA and process requirements
 * 
 * TEMA limits:
 * - Minimum: max(50mm, Ds/5)
 * - Maximum: Ds (shell diameter)
 * 
 * Process recommendations:
 * - Liquid: 0.3-0.5 × Ds (typical 0.4)
 * - Gas: 0.4-0.6 × Ds (closer for heat transfer)
 * - Condensing: 0.4-0.6 × Ds
 * - Boiling: 0.3-0.5 × Ds (avoid excessive vibration)
 * 
 * Vibration check: baffle spacing should keep critical velocity above operating
 */
export function getRecommendedBaffleSpacing(
  shellDiameter: number,
  tubeLength: number,
  service: "liquid" | "gas" | "condensing" | "boiling" = "liquid"
): { min: number; max: number; recommended: number; numberOfBaffles: number } {
  const min = Math.max(50, shellDiameter / 5);
  const max = shellDiameter;
  
  let factor: number;
  switch (service) {
    case "gas":
      factor = 0.5; // Closer spacing for better heat transfer
      break;
    case "condensing":
      factor = 0.5;
      break;
    case "boiling":
      factor = 0.4; // Moderate spacing
      break;
    default:
      factor = 0.4; // Liquid service - typical
  }
  
  let recommended = shellDiameter * factor;
  recommended = Math.min(max, Math.max(min, recommended));
  
  // Round to nearest 25mm
  recommended = Math.round(recommended / 25) * 25;
  
  // Calculate number of baffles
  const tubeLengthMm = tubeLength * 1000;
  const numberOfBaffles = Math.max(1, Math.floor(tubeLengthMm / recommended) - 1);
  
  return { 
    min: Math.round(min), 
    max: Math.round(max), 
    recommended: Math.round(recommended),
    numberOfBaffles
  };
}

/**
 * Calculate number of baffles
 */
export function calculateNumberOfBaffles(tubeLength: number, baffleSpacing: number): number {
  const tubeLengthMm = tubeLength * 1000;
  return Math.max(1, Math.floor(tubeLengthMm / baffleSpacing) - 1);
}

/**
 * Get list of available tube count tables for UI selection
 */
export function getAvailableTubeCountTables(): { name: string; tubeOD: number; tubePitch: number }[] {
  return allTubeCountTables.map(t => ({
    name: t.name,
    tubeOD: t.tubeOD,
    tubePitch: t.tubePitch
  }));
}
