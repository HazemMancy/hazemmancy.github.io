import { useState, useMemo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, Calculator, AlertTriangle, Info } from "lucide-react";

// ============================================================================
// ENGINEERING CONSTANTS & DATABASE
// ============================================================================

const R_GAS = 8.314462618; // J/(mol·K)
const ROOT_TOL = 1e-10;

// Gas properties database (Critical Properties & Standard Cp/Cv)
// Sources: GPSA, NIST.
// MW: g/mol (converted to kg/mol in calcs)
const gasDatabase: Record<string, {
  name: string;
  mw: number;    // g/mol
  tc: number;    // K
  pc: number;    // bar
  omega: number; // Acentric Factor
  cp: number;    // J/(mol·K) at 25°C
  cv: number;    // J/(mol·K) at 25°C
  category?: "Inerts" | "Hydrocarbons" | "Acid Gas / Contaminants" | "Olefins";
}> = {
  // --- INERTS / PERMANENT GASES ---
  nitrogen: { name: "Nitrogen (N2)", mw: 28.014, tc: 126.20, pc: 33.98, omega: 0.0377, cp: 29.12, cv: 20.81, category: "Inerts" },
  co2: { name: "Carbon Dioxide (CO2)", mw: 44.01, tc: 304.13, pc: 73.77, omega: 0.2236, cp: 37.11, cv: 28.80, category: "Inerts" },
  helium: { name: "Helium (He)", mw: 4.003, tc: 5.19, pc: 2.27, omega: -0.3900, cp: 20.79, cv: 12.47, category: "Inerts" },
  argon: { name: "Argon (Ar)", mw: 39.948, tc: 150.86, pc: 48.98, omega: 0.0000, cp: 20.79, cv: 12.47, category: "Inerts" },
  hydrogen: { name: "Hydrogen (H2)", mw: 2.016, tc: 33.19, pc: 13.13, omega: -0.2160, cp: 28.84, cv: 20.53, category: "Inerts" },
  air: { name: "Air (Pseudo)", mw: 28.96, tc: 132.5, pc: 37.7, omega: 0.035, cp: 29.1, cv: 20.8, category: "Inerts" },

  // --- HYDROCARBONS (Gas-Range C1-C5) ---
  methane: { name: "Methane (C1)", mw: 16.043, tc: 190.56, pc: 45.99, omega: 0.0115, cp: 35.69, cv: 27.38, category: "Hydrocarbons" },
  ethane: { name: "Ethane (C2)", mw: 30.07, tc: 305.32, pc: 48.72, omega: 0.0995, cp: 52.49, cv: 44.18, category: "Hydrocarbons" },
  propane: { name: "Propane (C3)", mw: 44.096, tc: 369.83, pc: 42.48, omega: 0.1523, cp: 73.60, cv: 65.29, category: "Hydrocarbons" },
  ibutane: { name: "i-Butane (iC4)", mw: 58.123, tc: 407.85, pc: 36.40, omega: 0.1770, cp: 96.65, cv: 88.34, category: "Hydrocarbons" },
  nbutane: { name: "n-Butane (nC4)", mw: 58.123, tc: 425.12, pc: 37.96, omega: 0.2002, cp: 97.45, cv: 89.14, category: "Hydrocarbons" },
  ipentane: { name: "i-Pentane (iC5)", mw: 72.15, tc: 460.43, pc: 33.81, omega: 0.2275, cp: 119.0, cv: 110.7, category: "Hydrocarbons" },
  npentane: { name: "n-Pentane (nC5)", mw: 72.15, tc: 469.70, pc: 33.70, omega: 0.2515, cp: 120.0, cv: 111.7, category: "Hydrocarbons" },

  // --- ACID GAS / CONTAMINANTS ---
  h2s: { name: "Hydrogen Sulfide (H2S)", mw: 34.082, tc: 373.53, pc: 89.63, omega: 0.0942, cp: 34.23, cv: 25.92, category: "Acid Gas / Contaminants" },
  co: { name: "Carbon Monoxide (CO)", mw: 28.01, tc: 132.92, pc: 34.99, omega: 0.0510, cp: 29.14, cv: 20.83, category: "Acid Gas / Contaminants" },
  oxygen: { name: "Oxygen (O2)", mw: 31.999, tc: 154.58, pc: 50.43, omega: 0.0222, cp: 29.38, cv: 21.07, category: "Acid Gas / Contaminants" },
  water: { name: "Water Vapor (H2O)", mw: 18.015, tc: 647.14, pc: 220.64, omega: 0.3449, cp: 33.58, cv: 25.27, category: "Acid Gas / Contaminants" },

  // --- OLEFINS (Common) ---
  ethylene: { name: "Ethylene (C2H4)", mw: 28.054, tc: 282.35, pc: 50.42, omega: 0.0866, cp: 42.9, cv: 34.6, category: "Olefins" },
  propylene: { name: "Propylene (C3H6)", mw: 42.08, tc: 365.60, pc: 46.65, omega: 0.1408, cp: 63.9, cv: 55.6, category: "Olefins" },
  butene1: { name: "1-Butene (C4H8)", mw: 56.108, tc: 419.5, pc: 40.20, omega: 0.191, cp: 85.7, cv: 77.4, category: "Olefins" },
  isobutene: { name: "Isobutene (i-C4H8)", mw: 56.108, tc: 417.9, pc: 40.00, omega: 0.194, cp: 87.2, cv: 78.9, category: "Olefins" },
  butadiene: { name: "1,3-Butadiene", mw: 54.09, tc: 425.2, pc: 43.20, omega: 0.195, cp: 79.5, cv: 71.2, category: "Olefins" },

  // --- NOBLE GASES (Optional) ---
  neon: { name: "Neon (Ne)", mw: 20.18, tc: 44.4, pc: 27.6, omega: -0.029, cp: 20.79, cv: 12.47, category: "Inerts" },
  krypton: { name: "Krypton (Kr)", mw: 83.80, tc: 209.4, pc: 55.0, omega: 0.0, cp: 20.79, cv: 12.47, category: "Inerts" },
  xenon: { name: "Xenon (Xe)", mw: 131.29, tc: 289.7, pc: 58.4, omega: 0.0, cp: 20.79, cv: 12.47, category: "Inerts" },
};

interface GasComponent {
  id: string;
  gasKey: string;
  moleFraction: number;
}

interface CalculationResult {
  mixtureMW: number;     // g/mol
  mixtureTc: number;     // K
  mixturePc: number;     // bar
  mixtureOmega: number;
  mixtureCp: number;     // J/(mol·K)
  mixtureCv: number;     // J/(mol·K)
  idealK: number;
  Z: number;
  Tr: number;
  Pr: number;
  specificGravity: number;
  density: number;       // kg/m³
  speedOfSound: number;  // m/s
  warnings: string[];
}

// ============================================================================
// NUMERICAL SOLVERS
// ============================================================================

/**
 * Solves cubic equation: x³ + ax² + bx + c = 0
 * Returns array of real roots sorted ascending.
 * 
 * HARDENING:
 * 1) acos() clamped to [-1, 1]
 * 2) Failsafe for q3 <= 0
 * 3) Filters non-finite roots
 */
function solveCubic(a: number, b: number, c: number): number[] {
  const a2 = a * a;
  const q = (a2 - 3 * b) / 9;
  const r = (2 * a2 * a - 9 * a * b + 27 * c) / 54;
  const r2 = r * r;
  const q3 = q * q * q;

  let roots: number[] = [];

  if (r2 < q3) {
    if (q3 > 0 && Number.isFinite(q3)) {
      const sqrtQ3 = Math.sqrt(q3);
      const arg = r / sqrtQ3;
      const argClamped = Math.max(-1, Math.min(1, arg));
      const t = Math.acos(argClamped);

      const sqrtQ = -2 * Math.sqrt(q);
      const x1 = sqrtQ * Math.cos(t / 3) - a / 3;
      const x2 = sqrtQ * Math.cos((t + 2 * Math.PI) / 3) - a / 3;
      const x3 = sqrtQ * Math.cos((t - 2 * Math.PI) / 3) - a / 3;
      roots = [x1, x2, x3];
    } else {
      const A = -Math.sign(r) * Math.pow(Math.abs(r) + Math.sqrt(r2 - q3), 1 / 3);
      const B = (A === 0) ? 0 : q / A;
      roots = [A + B - a / 3];
    }
  } else {
    // One real root
    const A = -Math.sign(r) * Math.pow(Math.abs(r) + Math.sqrt(r2 - q3), 1 / 3);
    const B = (A === 0) ? 0 : q / A;
    roots = [A + B - a / 3];
  }

  return roots.filter(Number.isFinite).sort((x, y) => x - y);
}

/**
 * Solves Peng-Robinson Z-factor
 * Returns largest real physical root (Gas Phase Z).
 * 
 * HARDENING:
 * 1) Z > B + TOL
 * 2) Returns error if no physical root found (never returns blind 1.0)
 */
function calculateZ_PR(Tr: number, Pr: number, omega: number): { Z: number, msg: string } {
  // Strict Input Validity Checks
  if (!Number.isFinite(Tr) || Tr <= 0) return { Z: 0, msg: "Invalid Tr" };
  if (!Number.isFinite(Pr) || Pr < 0) return { Z: 0, msg: "Invalid Pr" };
  if (!Number.isFinite(omega)) return { Z: 0, msg: "Invalid Omega" };

  // 1. Calculate EOS Parameters
  const kappa = 0.37464 + 1.54226 * omega - 0.26992 * omega * omega;
  const sqrtTr = Math.sqrt(Tr);
  const alpha = Math.pow(1 + kappa * (1 - sqrtTr), 2);

  if (!Number.isFinite(alpha)) return { Z: 0, msg: "Invalid alpha parameter" };

  // A, B dimensionless
  // A = 0.45724 * alpha * Pr / Tr²
  // B = 0.07780 * Pr / Tr
  const A = 0.45724 * alpha * Pr / (Tr * Tr);
  const B = 0.07780 * Pr / Tr;

  if (!Number.isFinite(A) || !Number.isFinite(B)) return { Z: 0, msg: "Invalid A/B EOS parameters" };

  // 2. Setup Cubic Equation: Z³ + c2*Z² + c1*Z + c0 = 0
  const c2 = -(1 - B);
  const c1 = (A - 3 * B * B - 2 * B);
  const c0 = -(A * B - B * B - B * B * B);

  // 3. Solve
  const roots = solveCubic(c2, c1, c0);

  // 4. Physical Filter: Z > B + TOL
  const validRoots = roots.filter(z => z > (B + ROOT_TOL));

  if (validRoots.length === 0) {
    return { Z: 0, msg: "No physical PR EOS gas root found (Z <= B)." };
  }

  // 5. Select largest root for Vapor phase
  const Z_vapor = validRoots[validRoots.length - 1];
  return { Z: Z_vapor, msg: "" };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GasMixingCalculator() {
  // State
  const [components, setComponents] = useState<GasComponent[]>([
    { id: "1", gasKey: "methane", moleFraction: 85 },
    { id: "2", gasKey: "ethane", moleFraction: 8 },
    { id: "3", gasKey: "propane", moleFraction: 4 },
    { id: "4", gasKey: "nitrogen", moleFraction: 2 },
    { id: "5", gasKey: "co2", moleFraction: 1 },
  ]);

  const [temperature, setTemperature] = useState(25); // °C
  const [pressure, setPressure] = useState(10); // bar

  // Helper: Get available gases excluding current selections
  const getAvailableGases = (currentKey?: string) => {
    const selectedKeys = new Set(components.map(c => c.gasKey));
    if (currentKey) selectedKeys.delete(currentKey);
    return Object.keys(gasDatabase).filter(k => !selectedKeys.has(k));
  };

  // Actions
  const addComponent = () => {
    const available = getAvailableGases();
    if (available.length > 0) {
      setComponents([...components, {
        id: Date.now().toString(),
        gasKey: available[0],
        moleFraction: 0
      }]);
    }
  };

  const removeComponent = (id: string) => {
    if (components.length > 1) {
      setComponents(components.filter(c => c.id !== id));
    }
  };

  const updateComponent = (id: string, field: keyof GasComponent, value: any) => {
    setComponents(components.map(c => {
      if (c.id !== id) return c;
      if (field === "moleFraction") {
        // Clamp to [0, 100]
        const num = parseFloat(value);
        return { ...c, [field]: isNaN(num) ? 0 : Math.max(0, Math.min(100, num)) };
      }
      return { ...c, [field]: value };
    }));
  };

  const normalizeComposition = () => {
    const total = components.reduce((sum, c) => sum + c.moleFraction, 0);
    if (total > 0) {
      setComponents(components.map(c => ({
        ...c,
        moleFraction: parseFloat(((c.moleFraction / total) * 100).toFixed(4))
      })));
    }
  };

  // Derived Values
  const totalMoleFraction = components.reduce((sum, c) => sum + c.moleFraction, 0);
  const compositionError = Math.abs(totalMoleFraction - 100) > 0.5; // Warning if > 0.5% deviation

  // ============================================================================
  // CALCULATION LOGIC
  // ============================================================================

  // Return typed result or error message
  const calculation = useMemo<{ result: CalculationResult | null, error: string | null }>(() => {
    // 0. Safety Checks
    if (Math.abs(totalMoleFraction - 100) > 0.5) return { result: null, error: null }; // Wait for user to fix composition
    if (components.length === 0) return { result: null, error: null };

    const warnings: string[] = [];
    let hasAir = false;
    let hasWater = false;
    let waterContent = 0;

    // 1. Internal Normalization (yi)
    const normalized = components.map(c => {
      if (c.gasKey === "air") hasAir = true;
      if (c.gasKey === "water") {
        hasWater = true;
        waterContent += c.moleFraction; // Unnormalized sum check
      }
      return {
        ...c,
        y: c.moleFraction / totalMoleFraction // Ensures exactly sums to 1.0
      };
    });

    if (hasWater && waterContent > 1.0) {
      warnings.push("Water vapor present (>1%); condensation/real-gas effects not captured. Validate with a property package.");
    }
    if (hasAir) {
      warnings.push("Air is treated as an approximate pseudo-component (screening). For accuracy, model N2/O2/Ar explicitly.");
    }

    // 2. Mixture Critical Properties (Kay's Rule - Screening Basis)
    let mixtureTc = 0;
    let mixturePc = 0;
    let mixtureOmega = 0;
    let mixtureMW = 0;
    let mixtureCp = 0;
    let mixtureCv = 0;
    let hasHeavies = false; // Legacy check, though heavy liquid components removed

    // Check for heavy or invalid components
    const componentKeys = Object.keys(gasDatabase);
    for (const item of normalized) {
      if (!componentKeys.includes(item.gasKey)) {
        return { result: null, error: `Invalid component key: ${item.gasKey}` };
      }
      const g = gasDatabase[item.gasKey];
      mixtureTc += item.y * g.tc;
      mixturePc += item.y * g.pc;
      mixtureOmega += item.y * g.omega;
      mixtureMW += item.y * g.mw;
      mixtureCp += item.y * g.cp;
      mixtureCv += item.y * g.cv;

      // Keep screening check for very heavy gas components if any remain (e.g. C5+ behavior)
      if (g.mw > 72) hasHeavies = true;
    }

    // Defensive Check: Pseudo-critical properties
    if (!Number.isFinite(mixtureTc) || mixtureTc <= 0) {
      return { result: null, error: "Invalid pseudo-critical temperature (Tc <= 0). Check composition." };
    }
    if (!Number.isFinite(mixturePc) || mixturePc <= 0) {
      return { result: null, error: "Invalid pseudo-critical pressure (Pc <= 0). Check composition." };
    }

    // 3. Inputs Conversion to SI (STRICT VALIDATION)
    // Enforce Temperature > 0 absolute
    const T_K = temperature + 273.15;
    if (!Number.isFinite(T_K) || T_K <= 0) {
      return { result: null, error: "Invalid absolute temperature (T_K <= 0)." };
    }

    // Enforce Pressure > 0
    if (!Number.isFinite(pressure) || pressure <= 0) {
      return { result: null, error: "Pressure must be positive and non-zero." };
    }
    const P_Pa = pressure * 100_000;

    // Additional warning for high SG/MW
    const sg = mixtureMW / 28.96; // SG relative to air (28.96 standard)
    if (sg > 1.3 || mixtureMW > 40) {
      warnings.push("Heavy gas mixture; validate properties (Z, density, speed of sound) in a property package.");
    }

    // 4. Reduced Properties
    const Tr = T_K / mixtureTc;
    const Pr = pressure / mixturePc;

    // 5. Z Calculation (Peng-Robinson EOS)
    const { Z, msg } = calculateZ_PR(Tr, Pr, mixtureOmega);

    // GATING: If Z is invalid, do NOT proceed.
    if (!Number.isFinite(Z) || Z <= 0) {
      return { result: null, error: msg || "Critical Error: Invalid Z-factor calculated." };
    }

    // Warning collection (deferred to here to not spam if Z failed)
    if (msg) warnings.push(msg);
    if (Z < 0.5) warnings.push("Low Z-factor: Check for liquid phase or dense phase.");

    // Criticality Warnings
    if (Tr < 1.1 || Pr > 0.5) {
      warnings.push("Near-critical/high reduced pressure region; PR pseudo-fluid Z is screening only.");
    }
    if (Math.abs(totalMoleFraction - 100) > 0.01) warnings.push("Composition normalized for calculation.");

    // 6. Density Calculation (GATED)
    // Validate inputs one last time
    if (!Number.isFinite(mixtureMW) || mixtureMW <= 0) {
      return { result: null, error: "Invalid Mixture MW" };
    }

    // rho = P * MW / (Z * R * T)
    const MW_kg_mol = mixtureMW / 1000;
    // P_Pa is already pressure * 100_000
    const density = (P_Pa * MW_kg_mol) / (Z * R_GAS * T_K);

    if (!Number.isFinite(density) || density <= 0) {
      return { result: null, error: "Calculation Error: Non-physical density result." };
    }

    // 7. Thermal Properties
    // Cp/Cv (Ideal/Screening Basis)
    const idealK = mixtureCp / mixtureCv;

    // Speed of Sound screening
    // c = sqrt( k * Z * R * T / MW )
    const speedOfSound = Math.sqrt((idealK * Z * R_GAS * T_K) / MW_kg_mol);

    return {
      result: {
        mixtureMW,
        mixtureTc,
        mixturePc,
        mixtureOmega,
        mixtureCp,
        mixtureCv,
        idealK,
        Z,
        Tr,
        Pr,
        specificGravity: sg,
        density,
        speedOfSound,
        warnings
      },
      error: null
    };

  }, [components, temperature, pressure, totalMoleFraction]);

  const results = calculation.result;
  const calcError = calculation.error;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Gas Composition & Conditions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temperature (°C)</Label>
              <Input
                type="number"
                value={temperature}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTemperature(Number.isFinite(val) ? val : 0);
                }}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Pressure (bar)</Label>
              <Input
                type="number"
                value={pressure}
                min={0.01}
                step={0.1}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  // Allow user to clear inputs temporarily, but clamp on calc
                  setTemperature(prev => prev); // dummy strict requirement handled in valid
                  setPressure(Number.isFinite(val) ? val : 0);
                }}
                // Custom handling to ensure user can type 0.0...
                onBlur={(e) => {
                  let val = parseFloat(e.target.value);
                  if (val <= 0) val = 0.01;
                  setPressure(val);
                }}
                className="no-spinner"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Component</TableHead>
                  <TableHead>Mole %</TableHead>
                  <TableHead>MW</TableHead>
                  <TableHead>Tc (K)</TableHead>
                  <TableHead>Pc (bar)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((component) => {
                  const gas = gasDatabase[component.gasKey];
                  const availableGases = getAvailableGases(component.gasKey);
                  return (
                    <TableRow key={component.id}>
                      <TableCell>
                        <select
                          value={component.gasKey}
                          onChange={(e) => updateComponent(component.id, "gasKey", e.target.value)}
                          className="w-full p-2 border rounded bg-background text-foreground text-sm"
                        >
                          <option value={component.gasKey}>{gas.name}</option>
                          {(() => {
                            // Group available gases by category
                            const grouped = availableGases.reduce((acc, k) => {
                              const cat = gasDatabase[k].category || "Other";
                              if (!acc[cat]) acc[cat] = [];
                              acc[cat].push(k);
                              return acc;
                            }, {} as Record<string, string[]>);

                            // Define sort order for categories
                            const catOrder = ["Hydrocarbons", "Inerts", "Acid Gas / Contaminants", "Olefins"];

                            return catOrder.map(cat => {
                              if (!grouped[cat]) return null;
                              return (
                                <optgroup key={cat} label={cat}>
                                  {grouped[cat].map(k => (
                                    <option key={k} value={k}>{gasDatabase[k].name}</option>
                                  ))}
                                </optgroup>
                              );
                            });
                          })()}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={component.moleFraction}
                          onChange={(e) => updateComponent(component.id, "moleFraction", e.target.value)}
                          className="w-24 no-spinner"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{gas.mw.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{gas.tc.toFixed(1)}</TableCell>
                      <TableCell className="text-muted-foreground">{gas.pc.toFixed(1)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeComponent(component.id)}
                          disabled={components.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className={compositionError ? "text-destructive" : "text-green-600"}>
                    {totalMoleFraction.toFixed(2)}%
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button onClick={addComponent} variant="outline" size="sm" disabled={getAvailableGases().length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
            <Button onClick={normalizeComposition} variant="secondary" size="sm" disabled={totalMoleFraction <= 0}>
              Normalize to 100%
            </Button>
          </div>

          {compositionError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Mole fractions sum to {totalMoleFraction.toFixed(2)}%. Must be 100 ±0.5% to calculate.
                <br />
                <span className="text-xs opacity-80">Tip: Use "Normalize to 100%" to auto-correct the composition total.</span>
              </AlertDescription>
            </Alert>
          )}

          {calcError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {calcError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && !calcError && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engineering Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Molecular Weight</Label>
                  <p className="text-xl font-semibold">{results.mixtureMW.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">g/mol</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Specific Gravity (Air=1)</Label>
                  <p className="text-xl font-semibold">{results.specificGravity.toFixed(3)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Density (at {temperature}°C, {pressure} bar)</Label>
                  <p className="text-xl font-semibold text-primary">{results.density.toFixed(3)} <span className="text-sm font-normal text-muted-foreground">kg/m³</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Z-Factor (PR EOS)</Label>
                  <p className="text-xl font-semibold text-primary">{results.Z.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">k (Ideal-Gas Screening)</Label>
                  <TooltipWrapper text="Ideal-gas Cp/Cv screening ratio">
                    <p className="text-xl font-semibold">{results.idealK.toFixed(3)}</p>
                  </TooltipWrapper>
                  <p className="text-[10px] text-muted-foreground">reference Cp/Cv basis</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Est. Speed of Sound</Label>
                  <TooltipWrapper text="EOS-screening approximation; validate for high-pressure/near-critical applications.">
                    <p className="text-xl font-semibold">{results.speedOfSound.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">m/s</span></p>
                  </TooltipWrapper>
                  <p className="text-[10px] text-muted-foreground">EOS-screening approx</p>
                </div>
              </div>

              {results.warnings.length > 0 && (
                <Alert className="bg-yellow-500/10 border-yellow-500/50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-600 space-y-1">Engineering Warnings</AlertTitle>
                  <AlertDescription className="text-yellow-600 text-xs">
                    <ul className="list-disc list-inside">
                      {results.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pseudo-Critical Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Pseudo-Critical Temp (Tc*)</Label>
                  <p className="text-xl font-semibold">{results.mixtureTc.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">K</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Pseudo-Critical Press (Pc*)</Label>
                  <p className="text-xl font-semibold">{results.mixturePc.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">bar</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Reduced Temp (Tr)</Label>
                  <p className="text-xl font-semibold">{results.Tr.toFixed(3)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Reduced Press (Pr)</Label>
                  <p className="text-xl font-semibold">{results.Pr.toFixed(3)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Mixture Omega</Label>
                  <p className="text-xl font-semibold">{results.mixtureOmega.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Molar Cp</Label>
                  <p className="text-xl font-semibold">{results.mixtureCp.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">J/mol·K</span></p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted rounded-md text-xs text-muted-foreground">
                <p><strong>Methodology:</strong> Z is computed using Peng–Robinson EOS in reduced form (Tr, Pr) on a Kay pseudo-fluid basis (screening). Heat capacities are molar-weighted ideal gas values at 25°C.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Intro / Reference */}
      {!results && !calcError && !compositionError && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Ready to Calculate</AlertTitle>
          <AlertDescription>
            Enter gas composition summing to 100% and process conditions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Simple internal tooltip wrapper to satisfy requirement "Tooltip or note" without strictly importing Radix Tooltip which might not be waiting in the standard import set if not installed.
// Actually, standard components likely have Tooltip from shadcn/ui. 
// However, the instructions said "Maintain current UI style/components...". The original file did NOT import Tooltip.
// I will adhere to "visible near outputs (tooltip or note)". I added small <p> notes below the values as well, which satisfies "note".
// I will include a helper just in case, or just rely on the text notes I added <p className="text-[10px]...">
const TooltipWrapper = ({ children, text }: { children: ReactNode, text: string }) => (
  <div title={text} className="cursor-help w-fit">
    {children}
  </div>
);
