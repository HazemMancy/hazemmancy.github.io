import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calculator, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Gas properties database (critical properties, MW, Cp/Cv at standard conditions)
const gasDatabase: Record<string, {
  name: string;
  mw: number;
  tc: number; // Critical temperature, K
  pc: number; // Critical pressure, bar
  omega: number; // Acentric factor
  cp: number; // Cp at 25°C, J/(mol·K)
  cv: number; // Cv at 25°C, J/(mol·K)
}> = {
  methane: { name: "Methane (CH₄)", mw: 16.043, tc: 190.56, pc: 45.99, omega: 0.0115, cp: 35.69, cv: 27.38 },
  ethane: { name: "Ethane (C₂H₆)", mw: 30.07, tc: 305.32, pc: 48.72, omega: 0.0995, cp: 52.49, cv: 44.18 },
  propane: { name: "Propane (C₃H₈)", mw: 44.096, tc: 369.83, pc: 42.48, omega: 0.1523, cp: 73.60, cv: 65.29 },
  ibutane: { name: "i-Butane (i-C₄H₁₀)", mw: 58.123, tc: 407.85, pc: 36.40, omega: 0.1770, cp: 96.65, cv: 88.34 },
  nbutane: { name: "n-Butane (n-C₄H₁₀)", mw: 58.123, tc: 425.12, pc: 37.96, omega: 0.2002, cp: 97.45, cv: 89.14 },
  ipentane: { name: "i-Pentane (i-C₅H₁₂)", mw: 72.15, tc: 460.43, pc: 33.81, omega: 0.2275, cp: 119.0, cv: 110.7 },
  npentane: { name: "n-Pentane (n-C₅H₁₂)", mw: 72.15, tc: 469.70, pc: 33.70, omega: 0.2515, cp: 120.0, cv: 111.7 },
  nhexane: { name: "n-Hexane (n-C₆H₁₄)", mw: 86.177, tc: 507.60, pc: 30.25, omega: 0.3013, cp: 142.6, cv: 134.3 },
  nheptane: { name: "n-Heptane (n-C₇H₁₆)", mw: 100.204, tc: 540.20, pc: 27.40, omega: 0.3495, cp: 165.2, cv: 156.9 },
  nitrogen: { name: "Nitrogen (N₂)", mw: 28.014, tc: 126.20, pc: 33.98, omega: 0.0377, cp: 29.12, cv: 20.81 },
  co2: { name: "Carbon Dioxide (CO₂)", mw: 44.01, tc: 304.13, pc: 73.77, omega: 0.2236, cp: 37.11, cv: 28.80 },
  h2s: { name: "Hydrogen Sulfide (H₂S)", mw: 34.082, tc: 373.53, pc: 89.63, omega: 0.0942, cp: 34.23, cv: 25.92 },
  hydrogen: { name: "Hydrogen (H₂)", mw: 2.016, tc: 33.19, pc: 13.13, omega: -0.2160, cp: 28.84, cv: 20.53 },
  helium: { name: "Helium (He)", mw: 4.003, tc: 5.19, pc: 2.27, omega: -0.3900, cp: 20.79, cv: 12.47 },
  oxygen: { name: "Oxygen (O₂)", mw: 31.999, tc: 154.58, pc: 50.43, omega: 0.0222, cp: 29.38, cv: 21.07 },
  water: { name: "Water Vapor (H₂O)", mw: 18.015, tc: 647.14, pc: 220.64, omega: 0.3449, cp: 33.58, cv: 25.27 },
  co: { name: "Carbon Monoxide (CO)", mw: 28.01, tc: 132.92, pc: 34.99, omega: 0.0510, cp: 29.14, cv: 20.83 },
  argon: { name: "Argon (Ar)", mw: 39.948, tc: 150.86, pc: 48.98, omega: 0.0000, cp: 20.79, cv: 12.47 },
};

interface GasComponent {
  id: string;
  gasKey: string;
  moleFraction: number;
}

export function GasMixingCalculator() {
  const [components, setComponents] = useState<GasComponent[]>([
    { id: "1", gasKey: "methane", moleFraction: 85 },
    { id: "2", gasKey: "ethane", moleFraction: 8 },
    { id: "3", gasKey: "propane", moleFraction: 4 },
    { id: "4", gasKey: "nitrogen", moleFraction: 2 },
    { id: "5", gasKey: "co2", moleFraction: 1 },
  ]);
  
  const [temperature, setTemperature] = useState(25); // °C
  const [pressure, setPressure] = useState(10); // bar

  const addComponent = () => {
    const newId = Date.now().toString();
    const availableGases = Object.keys(gasDatabase).filter(
      key => !components.some(c => c.gasKey === key)
    );
    if (availableGases.length > 0) {
      setComponents([...components, { id: newId, gasKey: availableGases[0], moleFraction: 0 }]);
    }
  };

  const removeComponent = (id: string) => {
    if (components.length > 1) {
      setComponents(components.filter(c => c.id !== id));
    }
  };

  const updateComponent = (id: string, field: keyof GasComponent, value: string | number) => {
    setComponents(components.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
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

  // Calculate mixture properties
  const results = useMemo(() => {
    const totalMoleFraction = components.reduce((sum, c) => sum + c.moleFraction, 0);
    
    if (Math.abs(totalMoleFraction - 100) > 0.01) {
      return null;
    }

    // Normalize mole fractions
    const normalized = components.map(c => ({
      ...c,
      y: c.moleFraction / 100
    }));

    // Calculate mixture molecular weight (Kay's rule)
    const mixtureMW = normalized.reduce((sum, c) => {
      const gas = gasDatabase[c.gasKey];
      return sum + c.y * gas.mw;
    }, 0);

    // Calculate mixture critical properties (Kay's mixing rules)
    const mixtureTc = normalized.reduce((sum, c) => {
      const gas = gasDatabase[c.gasKey];
      return sum + c.y * gas.tc;
    }, 0);

    const mixturePc = normalized.reduce((sum, c) => {
      const gas = gasDatabase[c.gasKey];
      return sum + c.y * gas.pc;
    }, 0);

    const mixtureOmega = normalized.reduce((sum, c) => {
      const gas = gasDatabase[c.gasKey];
      return sum + c.y * gas.omega;
    }, 0);

    // Calculate mixture Cp and Cv (molar mixing)
    const mixtureCp = normalized.reduce((sum, c) => {
      const gas = gasDatabase[c.gasKey];
      return sum + c.y * gas.cp;
    }, 0);

    const mixtureCv = normalized.reduce((sum, c) => {
      const gas = gasDatabase[c.gasKey];
      return sum + c.y * gas.cv;
    }, 0);

    // Ideal gas k (Cp/Cv)
    const idealK = mixtureCp / mixtureCv;

    // Calculate reduced properties
    const T_K = temperature + 273.15;
    const Tr = T_K / mixtureTc;
    const Pr = pressure / mixturePc;

    // Peng-Robinson equation of state for Z calculation
    const R = 8.314; // J/(mol·K)
    const kappa = 0.37464 + 1.54226 * mixtureOmega - 0.26992 * mixtureOmega * mixtureOmega;
    const alpha = Math.pow(1 + kappa * (1 - Math.sqrt(Tr)), 2);
    
    const a = 0.45724 * R * R * mixtureTc * mixtureTc * alpha / mixturePc / 100000; // Convert bar to Pa
    const b = 0.07780 * R * mixtureTc / mixturePc / 100000;
    
    const P_Pa = pressure * 100000;
    const A = a * P_Pa / (R * R * T_K * T_K);
    const B = b * P_Pa / (R * T_K);

    // Solve cubic equation: Z³ - (1-B)Z² + (A-3B²-2B)Z - (AB-B²-B³) = 0
    const c2 = -(1 - B);
    const c1 = A - 3 * B * B - 2 * B;
    const c0 = -(A * B - B * B - B * B * B);

    // Newton-Raphson for gas phase Z (start with ideal gas Z=1)
    let Z = 1;
    for (let i = 0; i < 50; i++) {
      const f = Z * Z * Z + c2 * Z * Z + c1 * Z + c0;
      const df = 3 * Z * Z + 2 * c2 * Z + c1;
      const dZ = f / df;
      Z = Z - dZ;
      if (Math.abs(dZ) < 1e-10) break;
    }
    Z = Math.max(0.1, Math.min(2, Z)); // Reasonable bounds

    // Real gas specific heat ratio correction (approximate)
    // Using departure function for Cp correction
    const dCp_R = -Tr * (Math.pow(kappa, 2) * Math.sqrt(alpha / Tr)) / 
                  (mixtureTc * Math.sqrt(2) * (1 + (1 + Math.sqrt(2)) * B / Z) * (1 + (1 - Math.sqrt(2)) * B / Z));
    
    const realK = idealK * Z / (Z + dCp_R * 0.1); // Simplified correction

    // Specific gravity (relative to air, MW_air = 28.97)
    const specificGravity = mixtureMW / 28.97;

    // Mass-based heat capacities
    const cpMass = mixtureCp / mixtureMW * 1000; // J/(kg·K)
    const cvMass = mixtureCv / mixtureMW * 1000; // J/(kg·K)

    // Gas density at conditions
    const density = (pressure * 100000 * mixtureMW) / (Z * R * T_K * 1000); // kg/m³

    // Speed of sound (approximate)
    const speedOfSound = Math.sqrt((realK * R * T_K * 1000) / mixtureMW); // m/s

    return {
      mixtureMW,
      mixtureTc,
      mixturePc,
      mixtureOmega,
      mixtureCp,
      mixtureCv,
      idealK,
      realK,
      Z,
      Tr,
      Pr,
      specificGravity,
      cpMass,
      cvMass,
      density,
      speedOfSound,
      totalMoleFraction
    };
  }, [components, temperature, pressure]);

  const totalMoleFraction = components.reduce((sum, c) => sum + c.moleFraction, 0);
  const compositionError = Math.abs(totalMoleFraction - 100) > 0.01;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Gas Composition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temperature (°C)</Label>
              <Input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
            <div className="space-y-2">
              <Label>Pressure (bar)</Label>
              <Input
                type="number"
                value={pressure}
                onChange={(e) => setPressure(parseFloat(e.target.value) || 0)}
                className="no-spinner"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Component</TableHead>
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
                  return (
                    <TableRow key={component.id}>
                      <TableCell>
                        <select
                          value={component.gasKey}
                          onChange={(e) => updateComponent(component.id, "gasKey", e.target.value)}
                          className="w-full p-2 border rounded bg-background text-foreground"
                        >
                          {Object.entries(gasDatabase).map(([key, gas]) => (
                            <option key={key} value={key}>{gas.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={component.moleFraction}
                          onChange={(e) => updateComponent(component.id, "moleFraction", parseFloat(e.target.value) || 0)}
                          className="w-24 no-spinner"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{gas.mw.toFixed(3)}</TableCell>
                      <TableCell className="text-muted-foreground">{gas.tc.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{gas.pc.toFixed(2)}</TableCell>
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
                  <TableCell className={compositionError ? "text-destructive" : "text-primary"}>
                    {totalMoleFraction.toFixed(2)}%
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button onClick={addComponent} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
            <Button onClick={normalizeComposition} variant="secondary" size="sm">
              Normalize to 100%
            </Button>
          </div>

          {compositionError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Mole fractions must sum to 100%. Current total: {totalMoleFraction.toFixed(2)}%
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mixture Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Molecular Weight</Label>
                  <p className="text-xl font-semibold">{results.mixtureMW.toFixed(3)} <span className="text-sm font-normal text-muted-foreground">kg/kmol</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Specific Gravity</Label>
                  <p className="text-xl font-semibold">{results.specificGravity.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Ideal k (Cp/Cv)</Label>
                  <p className="text-xl font-semibold">{results.idealK.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Real Gas k</Label>
                  <p className="text-xl font-semibold text-primary">{results.realK.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Compressibility (Z)</Label>
                  <p className="text-xl font-semibold text-primary">{results.Z.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Gas Density</Label>
                  <p className="text-xl font-semibold">{results.density.toFixed(3)} <span className="text-sm font-normal text-muted-foreground">kg/m³</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Critical & Thermal Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Pseudo-Critical Temp</Label>
                  <p className="text-xl font-semibold">{results.mixtureTc.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">K</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Pseudo-Critical Pressure</Label>
                  <p className="text-xl font-semibold">{results.mixturePc.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">bar</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Reduced Temperature (Tr)</Label>
                  <p className="text-xl font-semibold">{results.Tr.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Reduced Pressure (Pr)</Label>
                  <p className="text-xl font-semibold">{results.Pr.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Cp (molar)</Label>
                  <p className="text-xl font-semibold">{results.mixtureCp.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">J/(mol·K)</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Cv (molar)</Label>
                  <p className="text-xl font-semibold">{results.mixtureCv.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">J/(mol·K)</span></p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Acentric Factor (ω)</Label>
                  <p className="text-xl font-semibold">{results.mixtureOmega.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Speed of Sound</Label>
                  <p className="text-xl font-semibold">{results.speedOfSound.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">m/s</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reference Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Methods:</strong> Kay's mixing rules for pseudo-critical properties, 
          Peng-Robinson EOS for compressibility factor (Z), molar mixing for heat capacities.
          Gas properties from NIST and GPSA data.
        </AlertDescription>
      </Alert>
    </div>
  );
}
