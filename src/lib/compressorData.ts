export interface GasProperty {
    name: string;
    mw: number;
    k: number;
    z: number;
    cp: number;
    Tc: number;  // Critical temperature (K)
    Pc: number;  // Critical pressure (bar)
}

export const gasDatabase: Record<string, GasProperty> = {
    air: { name: 'Air', mw: 28.97, k: 1.4, z: 1.0, cp: 1.005, Tc: 132.5, Pc: 37.7 },
    nitrogen: { name: 'Nitrogen', mw: 28.01, k: 1.4, z: 1.0, cp: 1.04, Tc: 126.2, Pc: 33.9 },
    oxygen: { name: 'Oxygen', mw: 32.0, k: 1.4, z: 1.0, cp: 0.918, Tc: 154.6, Pc: 50.4 },
    hydrogen: { name: 'Hydrogen', mw: 2.016, k: 1.41, z: 1.0, cp: 14.3, Tc: 33.2, Pc: 13.0 },
    methane: { name: 'Methane', mw: 16.04, k: 1.31, z: 0.998, cp: 2.22, Tc: 190.6, Pc: 46.0 },
    ethane: { name: 'Ethane', mw: 30.07, k: 1.19, z: 0.99, cp: 1.75, Tc: 305.4, Pc: 48.8 },
    propane: { name: 'Propane', mw: 44.1, k: 1.13, z: 0.98, cp: 1.67, Tc: 369.8, Pc: 42.5 },
    co2: { name: 'Carbon Dioxide', mw: 44.01, k: 1.29, z: 0.995, cp: 0.846, Tc: 304.2, Pc: 73.8 },
    ammonia: { name: 'Ammonia', mw: 17.03, k: 1.31, z: 0.99, cp: 2.06, Tc: 405.5, Pc: 113.5 },
    naturalGas: { name: 'Natural Gas (Typical)', mw: 18.5, k: 1.27, z: 0.95, cp: 2.1, Tc: 200.0, Pc: 45.0 },
    refGas: { name: 'Refinery Gas', mw: 22.0, k: 1.25, z: 0.92, cp: 1.9, Tc: 250.0, Pc: 42.0 },
    custom: { name: 'Custom Gas', mw: 28.97, k: 1.4, z: 1.0, cp: 1.005, Tc: 0, Pc: 0 } // Tc/Pc to be filled by user
};

export interface CompressorType {
    name: string;
    etaIsen: number;
    etaPoly: number;
    maxRatio: number;
    maxFlow: number;
    standard: string;
    volumetricEff?: number; // For reciprocating (API 618)
    clearanceVol?: number;  // Typical clearance volume fraction
}

export const compressorTypes: Record<string, CompressorType> = {
    centrifugal: { name: 'Centrifugal (API 617)', etaIsen: 0.78, etaPoly: 0.82, maxRatio: 4.0, maxFlow: 500000, standard: 'API 617' },
    axial: { name: 'Axial (API 617)', etaIsen: 0.88, etaPoly: 0.90, maxRatio: 2.0, maxFlow: 1000000, standard: 'API 617' },
    reciprocating: { name: 'Reciprocating (API 618)', etaIsen: 0.82, etaPoly: 0.85, maxRatio: 10.0, maxFlow: 50000, standard: 'API 618', volumetricEff: 0.85, clearanceVol: 0.08 },
    screw: { name: 'Screw (Rotary)', etaIsen: 0.75, etaPoly: 0.78, maxRatio: 6.0, maxFlow: 30000, standard: 'API 619' },
    diaphragm: { name: 'Diaphragm (API 618)', etaIsen: 0.70, etaPoly: 0.73, maxRatio: 10.0, maxFlow: 5000, standard: 'API 618', volumetricEff: 0.90, clearanceVol: 0.05 }
};
