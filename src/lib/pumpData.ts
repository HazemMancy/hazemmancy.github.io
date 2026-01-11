export interface PipeScheduleData {
    [nominalSize: string]: { [schedule: string]: number };
}

export interface LiquidSizingCriteria {
    service: string;
    pressureDropBarKm: number | null;
    velocity: {
        size2: number | null;
        size3to6: number | null;
        size8to12: number | null;
        size14to18: number | null;
        size20plus: number | null;
    } | null;
}

export const liquidServiceCriteria: LiquidSizingCriteria[] = [
    { service: "Gravity Flow", pressureDropBarKm: null, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
    { service: "Pump Suction (Boiling Point)", pressureDropBarKm: 0.5, velocity: { size2: 0.6, size3to6: 0.9, size8to12: 1.3, size14to18: 1.8, size20plus: 2.2 } },
    { service: "Pump Suction (Sub-cooled)", pressureDropBarKm: 1.0, velocity: { size2: 0.7, size3to6: 1.2, size8to12: 1.6, size14to18: 2.1, size20plus: 2.6 } },
    { service: "Pump Discharge (Pop < 35 barg)", pressureDropBarKm: 4.5, velocity: { size2: 1.4, size3to6: 1.9, size8to12: 3.1, size14to18: 4.1, size20plus: 5.0 } },
    { service: "Pump Discharge (Pop > 35 barg)", pressureDropBarKm: 6.0, velocity: { size2: 1.5, size3to6: 2.0, size8to12: 3.5, size14to18: 4.6, size20plus: 5.0 } },
    { service: "Condenser Outlet (Pop < 10 barg)", pressureDropBarKm: 0.5, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
    { service: "Condenser Outlet (Pop > 10 barg)", pressureDropBarKm: 0.5, velocity: { size2: 0.6, size3to6: 0.9, size8to12: 1.3, size14to18: 1.8, size20plus: 2.2 } },
    { service: "Cooling Water Manifold", pressureDropBarKm: null, velocity: { size2: 3.5, size3to6: 3.5, size8to12: 3.5, size14to18: 3.5, size20plus: 3.5 } },
    { service: "Cooling Water Sub-manifold", pressureDropBarKm: 1.5, velocity: { size2: 2.0, size3to6: 3.1, size8to12: 3.5, size14to18: 3.5, size20plus: 3.5 } },
    { service: "Diathermic Oil", pressureDropBarKm: null, velocity: null },
    { service: "Liquid Sulphur", pressureDropBarKm: null, velocity: { size2: 1.8, size3to6: 1.8, size8to12: 1.8, size14to18: 1.8, size20plus: 1.8 } },
    { service: "Column Side-stream Draw-off", pressureDropBarKm: null, velocity: { size2: 0.3, size3to6: 0.4, size8to12: 0.6, size14to18: 0.8, size20plus: 0.9 } },
];


export const pipeScheduleData: PipeScheduleData = {
    "1/2": { "5s": 18.04, "10s": 17.12, "40": 15.80, "STD": 15.80, "80": 13.87, "XS": 13.87, "160": 11.74, "XXS": 6.35 },
    "3/4": { "5s": 23.37, "10s": 22.45, "40": 20.93, "STD": 20.93, "80": 18.85, "XS": 18.85, "160": 15.54, "XXS": 11.07 },
    "1": { "5s": 29.51, "10s": 27.86, "40": 26.64, "STD": 26.64, "80": 24.31, "XS": 24.31, "160": 20.70, "XXS": 15.22 },
    "1-1/4": { "5s": 38.14, "10s": 36.63, "40": 35.05, "STD": 35.05, "80": 32.46, "XS": 32.46, "160": 29.46, "XXS": 22.76 },
    "1-1/2": { "5s": 44.20, "10s": 42.72, "40": 40.89, "STD": 40.89, "80": 38.10, "XS": 38.10, "160": 33.98, "XXS": 27.94 },
    "2": { "5s": 56.26, "10s": 54.79, "40": 52.50, "STD": 52.50, "80": 49.25, "XS": 49.25, "160": 42.90, "XXS": 38.16 },
    "2-1/2": { "5s": 68.78, "10s": 66.90, "40": 62.71, "STD": 62.71, "80": 59.00, "XS": 59.00, "160": 53.98, "XXS": 44.96 },
    "3": { "5s": 84.68, "10s": 82.80, "40": 77.93, "STD": 77.93, "80": 73.66, "XS": 73.66, "160": 66.64, "XXS": 58.42 },
    "4": { "5s": 110.08, "10s": 108.20, "40": 102.26, "STD": 102.26, "80": 97.18, "XS": 97.18, "120": 92.04, "160": 87.32, "XXS": 80.06 },
    "6": { "5s": 164.66, "10s": 162.74, "40": 154.05, "STD": 154.05, "80": 146.33, "XS": 146.33, "120": 139.70, "160": 131.78, "XXS": 124.38 },
    "8": { "5s": 216.66, "10s": 214.96, "20": 209.55, "30": 206.38, "40": 202.72, "STD": 202.72, "60": 196.85, "80": 193.68, "XS": 193.68, "100": 186.96, "120": 180.98, "140": 177.80, "160": 173.99, "XXS": 174.64 },
    "10": { "5s": 271.02, "10s": 268.92, "20": 262.76, "30": 257.48, "40": 254.51, "STD": 254.51, "60": 247.65, "80": 242.87, "XS": 247.65, "100": 236.52, "120": 230.18, "140": 225.42, "160": 222.25, "XXS": 222.25 },
    "12": { "5s": 323.85, "10s": 320.42, "20": 314.66, "30": 307.09, "40": 303.23, "STD": 303.23, "60": 295.30, "80": 288.90, "XS": 298.45, "100": 280.92, "120": 273.05, "140": 266.70, "160": 264.67, "XXS": 264.67 },
    "14": { "5s": 350.50, "10s": 347.68, "20": 342.90, "30": 339.76, "40": 336.54, "STD": 347.68, "60": 330.20, "80": 323.88, "XS": 339.76, "100": 317.50, "120": 311.18, "140": 304.80, "160": 290.58 },
    "16": { "5s": 400.86, "10s": 398.02, "20": 393.70, "30": 387.36, "40": 381.00, "STD": 398.02, "60": 374.66, "80": 363.52, "XS": 387.36, "100": 354.08, "120": 344.48, "140": 336.54, "160": 333.34 },
    "18": { "5s": 451.46, "10s": 448.62, "20": 444.30, "30": 434.72, "40": 428.66, "STD": 448.62, "60": 419.10, "80": 409.58, "XS": 434.72, "100": 398.02, "120": 387.36, "140": 381.00, "160": 376.94 },
    "20": { "5s": 501.80, "10s": 498.44, "20": 490.96, "30": 482.60, "40": 477.82, "STD": 498.44, "60": 466.78, "80": 455.62, "XS": 482.60, "100": 444.30, "120": 431.80, "140": 419.10, "160": 419.10 },
    "24": { "5s": 603.25, "10s": 598.42, "20": 590.04, "30": 581.66, "40": 574.68, "STD": 598.42, "60": 560.32, "80": 547.68, "XS": 581.66, "100": 530.10, "120": 514.35, "140": 504.82, "160": 498.44 },
    "30": { "5s": 755.65, "10s": 749.30, "20": 736.60, "30": 723.90, "STD": 749.30, "XS": 736.60 },
    "36": { "5s": 906.65, "10s": 898.52, "20": 882.90, "30": 869.95, "40": 863.60, "STD": 898.52, "XS": 882.90 },
};

export const scheduleOrder = ["5s", "10s", "10", "20", "30", "40", "STD", "60", "80", "XS", "100", "120", "140", "160", "XXS"];

export interface FittingData {
    name: string;
    K: number;
    LeD: number;
    category: string;
}

export const fittingsDatabase: Record<string, FittingData> = {
    // Elbows
    "elbow_90_std": { name: "90° Elbow (Standard Radius)", K: 0.75, LeD: 30, category: "Elbows" },
    "elbow_90_long": { name: "90° Elbow (Long Radius)", K: 0.45, LeD: 20, category: "Elbows" },
    "elbow_90_short": { name: "90° Elbow (Short Radius)", K: 1.5, LeD: 50, category: "Elbows" },
    "elbow_90_mitered_1": { name: "90° Mitered Elbow (1 weld)", K: 1.3, LeD: 60, category: "Elbows" },
    "elbow_90_mitered_2": { name: "90° Mitered Elbow (2 welds)", K: 0.75, LeD: 35, category: "Elbows" },
    "elbow_90_mitered_3": { name: "90° Mitered Elbow (3 welds)", K: 0.55, LeD: 25, category: "Elbows" },
    "elbow_45": { name: "45° Elbow", K: 0.35, LeD: 16, category: "Elbows" },
    "elbow_45_mitered": { name: "45° Mitered Elbow", K: 0.30, LeD: 15, category: "Elbows" },
    "elbow_180": { name: "180° Return Bend", K: 1.5, LeD: 60, category: "Elbows" },

    // Tees
    "tee_straight": { name: "Tee (Straight Through)", K: 0.4, LeD: 20, category: "Tees" },
    "tee_branch_90": { name: "Tee (Branch Flow 90°)", K: 1.3, LeD: 60, category: "Tees" },
    "tee_branch_45": { name: "Tee (Branch Flow 45°)", K: 0.8, LeD: 35, category: "Tees" },
    "tee_dividing": { name: "Tee (Dividing Flow)", K: 1.0, LeD: 50, category: "Tees" },

    // Gate Valves
    "gate_valve_full": { name: "Gate Valve (Full Open)", K: 0.17, LeD: 8, category: "Gate Valves" },
    "gate_valve_3_4": { name: "Gate Valve (3/4 Open)", K: 0.9, LeD: 35, category: "Gate Valves" },
    "gate_valve_half": { name: "Gate Valve (1/2 Open)", K: 4.5, LeD: 160, category: "Gate Valves" },
    "gate_valve_1_4": { name: "Gate Valve (1/4 Open)", K: 24.0, LeD: 900, category: "Gate Valves" },

    // Globe Valves
    "globe_valve_full": { name: "Globe Valve (Full Open)", K: 6.0, LeD: 340, category: "Globe Valves" },
    "globe_valve_half": { name: "Globe Valve (1/2 Open)", K: 9.5, LeD: 500, category: "Globe Valves" },
    "globe_valve_angle": { name: "Angle Valve (Full Open)", K: 2.0, LeD: 145, category: "Globe Valves" },
    "globe_valve_y": { name: "Y-Pattern Globe (Full Open)", K: 3.0, LeD: 160, category: "Globe Valves" },

    // Ball Valves
    "ball_valve_full": { name: "Ball Valve (Full Open)", K: 0.05, LeD: 3, category: "Ball Valves" },
    "ball_valve_reduced": { name: "Ball Valve (Reduced Port)", K: 0.15, LeD: 8, category: "Ball Valves" },
    "ball_valve_v_port": { name: "Ball Valve (V-Port)", K: 0.25, LeD: 12, category: "Ball Valves" },

    // Butterfly Valves
    "butterfly_valve_full": { name: "Butterfly Valve (Full Open)", K: 0.25, LeD: 12, category: "Butterfly Valves" },
    "butterfly_valve_30": { name: "Butterfly Valve (30° Open)", K: 6.5, LeD: 300, category: "Butterfly Valves" },
    "butterfly_valve_60": { name: "Butterfly Valve (60° Open)", K: 1.5, LeD: 70, category: "Butterfly Valves" },

    // Plug Valves
    "plug_valve_full": { name: "Plug Valve (Full Open)", K: 0.4, LeD: 18, category: "Plug Valves" },
    "plug_valve_3_way": { name: "3-Way Plug Valve (Straight)", K: 0.6, LeD: 25, category: "Plug Valves" },

    // Check Valves
    "check_valve_swing": { name: "Swing Check Valve", K: 2.0, LeD: 100, category: "Check Valves" },
    "check_valve_lift": { name: "Lift Check Valve", K: 10.0, LeD: 600, category: "Check Valves" },
    "check_valve_ball": { name: "Ball Check Valve", K: 4.0, LeD: 150, category: "Check Valves" },
    "check_valve_tilting": { name: "Tilting Disc Check Valve", K: 1.0, LeD: 50, category: "Check Valves" },
    "check_valve_wafer": { name: "Wafer Check Valve", K: 2.5, LeD: 120, category: "Check Valves" },
    "check_valve_nozzle": { name: "Nozzle Check Valve", K: 1.5, LeD: 75, category: "Check Valves" },

    // Reducers & Expanders
    "reducer_concentric": { name: "Concentric Reducer", K: 0.5, LeD: 25, category: "Reducers" },
    "reducer_eccentric": { name: "Eccentric Reducer", K: 0.6, LeD: 30, category: "Reducers" },
    "expander_gradual": { name: "Gradual Expander (θ<15°)", K: 0.3, LeD: 15, category: "Reducers" },
    "expander_sudden": { name: "Sudden Expansion", K: 1.0, LeD: 40, category: "Reducers" },
    "contraction_gradual": { name: "Gradual Contraction", K: 0.1, LeD: 5, category: "Reducers" },
    "contraction_sudden": { name: "Sudden Contraction", K: 0.5, LeD: 25, category: "Reducers" },

    // Strainers & Filters
    "strainer_y": { name: "Y-Strainer", K: 2.0, LeD: 100, category: "Strainers" },
    "strainer_basket": { name: "Basket Strainer", K: 3.5, LeD: 175, category: "Strainers" },
    "strainer_duplex": { name: "Duplex Strainer", K: 3.0, LeD: 150, category: "Strainers" },
    "filter": { name: "In-line Filter", K: 4.0, LeD: 200, category: "Strainers" },

    // Entrance & Exit
    "entrance_bellmouth": { name: "Pipe Entrance (Bellmouth)", K: 0.04, LeD: 2, category: "Entrance/Exit" },
    "entrance_rounded": { name: "Pipe Entrance (Rounded)", K: 0.25, LeD: 12, category: "Entrance/Exit" },
    "entrance_sharp": { name: "Pipe Entrance (Sharp Edge)", K: 0.5, LeD: 25, category: "Entrance/Exit" },
    "entrance_projecting": { name: "Pipe Entrance (Projecting)", K: 0.8, LeD: 40, category: "Entrance/Exit" },
    "exit_sharp": { name: "Pipe Exit (Sharp)", K: 1.0, LeD: 50, category: "Entrance/Exit" },
    "exit_submerged": { name: "Pipe Exit (Submerged)", K: 1.0, LeD: 50, category: "Entrance/Exit" },

    // Miscellaneous
    "flowmeter_orifice": { name: "Orifice Flowmeter", K: 2.5, LeD: 125, category: "Miscellaneous" },
    "flowmeter_venturi": { name: "Venturi Flowmeter", K: 0.5, LeD: 25, category: "Miscellaneous" },
    "flowmeter_magnetic": { name: "Magnetic Flowmeter", K: 0.1, LeD: 5, category: "Miscellaneous" },
    "coupling": { name: "Union/Coupling", K: 0.04, LeD: 2, category: "Miscellaneous" },
    "foot_valve": { name: "Foot Valve with Strainer", K: 15.0, LeD: 750, category: "Miscellaneous" },
    "pulsation_dampener": { name: "Pulsation Dampener", K: 2.0, LeD: 100, category: "Miscellaneous" },
};

// Group fittings by category
export const getFittingsByCategory = (): Record<string, { key: string; name: string; K: number }[]> => {
    const categories: Record<string, { key: string; name: string; K: number }[]> = {};
    Object.entries(fittingsDatabase).forEach(([key, data]) => {
        if (!categories[data.category]) {
            categories[data.category] = [];
        }
        categories[data.category].push({ key, name: data.name, K: data.K });
    });
    return categories;
};

export interface PumpType {
    name: string;
    standard: string;
    typicalEfficiency: [number, number];
    typicalHead: [number, number];
    typicalFlow: [number, number];
    characteristics: string[];
}

export const pumpTypes: Record<string, PumpType> = {
    "centrifugal_oh1": {
        name: "API 610 OH1 (Horizontal, Foot Mounted)",
        standard: "API 610",
        typicalEfficiency: [55, 85],
        typicalHead: [10, 150],
        typicalFlow: [5, 500],
        characteristics: ["Overhung impeller", "Foot mounted", "General purpose", "Easy maintenance"]
    },
    "centrifugal_oh2": {
        name: "API 610 OH2 (Horizontal, Centerline Mounted)",
        standard: "API 610",
        typicalEfficiency: [60, 85],
        typicalHead: [15, 200],
        typicalFlow: [10, 1000],
        characteristics: ["Centerline mounted", "High temperature service", "Reduced nozzle loads", "Process applications"]
    },
    "centrifugal_oh3": {
        name: "API 610 OH3 (Vertical, In-line)",
        standard: "API 610",
        typicalEfficiency: [55, 80],
        typicalHead: [10, 100],
        typicalFlow: [5, 300],
        characteristics: ["Vertical in-line", "Space saving", "Pipe-supported", "Low maintenance"]
    },
    "centrifugal_bb1": {
        name: "API 610 BB1 (Axially Split, Single Stage)",
        standard: "API 610",
        typicalEfficiency: [70, 88],
        typicalHead: [20, 180],
        typicalFlow: [100, 5000],
        characteristics: ["Double suction", "Low NPSH required", "High flow", "Water services"]
    },
    "centrifugal_bb2": {
        name: "API 610 BB2 (Radially Split, Single Stage)",
        standard: "API 610",
        typicalEfficiency: [70, 87],
        typicalHead: [30, 250],
        typicalFlow: [50, 2000],
        characteristics: ["High pressure", "Between bearings", "Hydrocarbon services"]
    },
    "centrifugal_bb3": {
        name: "API 610 BB3 (Axially Split, Multistage)",
        standard: "API 610",
        typicalEfficiency: [65, 85],
        typicalHead: [100, 600],
        typicalFlow: [50, 1500],
        characteristics: ["High head", "Boiler feed water", "Multiple stages", "Pipeline services"]
    },
    "centrifugal_bb5": {
        name: "API 610 BB5 (Radially Split, Multistage)",
        standard: "API 610",
        typicalEfficiency: [65, 82],
        typicalHead: [200, 2000],
        typicalFlow: [10, 500],
        characteristics: ["Very high pressure", "Injection services", "Barrel design"]
    },
    "centrifugal_vs1": {
        name: "API 610 VS1 (Vertical, Single Stage)",
        standard: "API 610",
        typicalEfficiency: [50, 75],
        typicalHead: [5, 50],
        typicalFlow: [10, 1000],
        characteristics: ["Sump pump", "Wet pit", "Submerged suction"]
    },
    "centrifugal_vs6": {
        name: "API 610 VS6 (Vertical, Multistage)",
        standard: "API 610",
        typicalEfficiency: [55, 80],
        typicalHead: [50, 400],
        typicalFlow: [5, 200],
        characteristics: ["Deep well", "Borehole", "Can type"]
    },
    "reciprocating_simplex": {
        name: "API 674 Reciprocating (Simplex)",
        standard: "API 674",
        typicalEfficiency: [80, 95],
        typicalHead: [100, 3000],
        typicalFlow: [0.1, 50],
        characteristics: ["High pressure", "Constant flow", "Single acting", "Chemical injection"]
    },
    "reciprocating_duplex": {
        name: "API 674 Reciprocating (Duplex)",
        standard: "API 674",
        typicalEfficiency: [80, 95],
        typicalHead: [100, 2500],
        typicalFlow: [0.5, 100],
        characteristics: ["Reduced pulsation", "Double acting", "Metering", "High viscosity"]
    },
    "reciprocating_triplex": {
        name: "API 674 Reciprocating (Triplex)",
        standard: "API 674",
        typicalEfficiency: [85, 95],
        typicalHead: [100, 3500],
        typicalFlow: [1, 200],
        characteristics: ["Smooth flow", "High pressure", "Mud pumps", "Desalination"]
    },
    "rotary_gear": {
        name: "API 676 Rotary (Gear)",
        standard: "API 676",
        typicalEfficiency: [50, 75],
        typicalHead: [30, 200],
        typicalFlow: [0.1, 100],
        characteristics: ["High viscosity", "Lubricating fluids", "Constant flow", "Self-priming"]
    },
    "rotary_screw": {
        name: "API 676 Rotary (Screw/Twin Screw)",
        standard: "API 676",
        typicalEfficiency: [60, 80],
        typicalHead: [50, 400],
        typicalFlow: [1, 500],
        characteristics: ["Low pulsation", "Multiphase capable", "Crude oil", "Asphalt"]
    },
    "rotary_progressive": {
        name: "API 676 Rotary (Progressive Cavity)",
        standard: "API 676",
        typicalEfficiency: [40, 70],
        typicalHead: [50, 240],
        typicalFlow: [0.5, 200],
        characteristics: ["High viscosity", "Abrasive fluids", "Sludge", "Polymers"]
    },
    "rotary_lobe": {
        name: "API 676 Rotary (Lobe)",
        standard: "API 676",
        typicalEfficiency: [40, 65],
        typicalHead: [10, 50],
        typicalFlow: [5, 500],
        characteristics: ["Gentle pumping", "Shear sensitive", "Food grade", "Slurries"]
    },
};
