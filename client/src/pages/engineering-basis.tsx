import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowLeft, Droplets, Wind, Container,
  Shield, Thermometer, Gauge, Cog, Cylinder,
  PipetteIcon, CircleDot, FlaskConical,
} from "lucide-react";

type Standard = {
  code: string;
  title: string;
  scope: string;
  calculators: string[];
};

type Discipline = {
  name: string;
  icon: typeof BookOpen;
  color: string;
  standards: Standard[];
};

const DISCIPLINES: Discipline[] = [
  {
    name: "Relief Systems & Safety",
    icon: Shield,
    color: "text-red-400",
    standards: [
      {
        code: "API 520 Part I",
        title: "Sizing, Selection, and Installation of Pressure-Relieving Devices — Sizing and Selection",
        scope: "Relief device required orifice area for gas, vapor, steam, liquid, and two-phase service",
        calculators: ["PRD / Flare Relief"],
      },
      {
        code: "API 520 Part II",
        title: "Sizing, Selection, and Installation of Pressure-Relieving Devices — Installation",
        scope: "Inlet piping pressure drop (3% rule), outlet piping backpressure assessment",
        calculators: ["PRD / Flare Relief"],
      },
      {
        code: "API 521",
        title: "Pressure-Relieving and Depressuring Systems",
        scope: "Overpressure scenario screening, relief load determination, fire-case heat input, knockout drum sizing (Section 5.4), flare system design basis",
        calculators: ["PRD / Flare Relief", "Flare KO Drum Sizing", "Thermal Expansion Relief"],
      },
      {
        code: "API 526",
        title: "Flanged Steel Pressure-Relief Valves",
        scope: "Standard orifice letter designations (D through T), effective areas, and flange ratings for PRV selection",
        calculators: ["PRD / Flare Relief"],
      },
      {
        code: "API 2000",
        title: "Venting Atmospheric and Low-Pressure Storage Tanks",
        scope: "Normal venting (thermal breathing, pump-in/out), emergency venting (external fire), vent sizing with Cd-based orifice equations",
        calculators: ["API 2000 Tank Venting"],
      },
      {
        code: "NFPA 30",
        title: "Flammable and Combustible Liquids Code",
        scope: "Fire exposure environmental factor referenced in tank venting emergency scenarios",
        calculators: ["API 2000 Tank Venting"],
      },
    ],
  },
  {
    name: "Hydraulics & Piping",
    icon: PipetteIcon,
    color: "text-blue-400",
    standards: [
      {
        code: "API RP 14E",
        title: "Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems",
        scope: "Erosional velocity screening using C-factor for gas, liquid, and multiphase lines",
        calculators: ["Gas Line Sizing", "Liquid Line Sizing", "Multiphase Line Sizing"],
      },
      {
        code: "Crane TP-410",
        title: "Flow of Fluids Through Valves, Fittings, and Pipe",
        scope: "Darcy-Weisbach friction factor, pressure drop calculations, equivalent lengths, restriction orifice discharge coefficients",
        calculators: ["Gas Line Sizing", "Liquid Line Sizing", "Restriction Orifice", "Pump Sizing"],
      },
      {
        code: "IEC 60534",
        title: "Industrial-Process Control Valves",
        scope: "Control valve Cv sizing with choked flow detection, piping geometry factors (Fp), expansion factor (xT), and critical pressure ratio",
        calculators: ["Control Valve Cv"],
      },
      {
        code: "ISO 5167",
        title: "Measurement of Fluid Flow by Means of Pressure Differential Devices",
        scope: "Restriction orifice discharge coefficients (Cd), beta ratio limits, and flow measurement correlations",
        calculators: ["Restriction Orifice"],
      },
      {
        code: "ASME B31.3",
        title: "Process Piping",
        scope: "Allowable stress, pipe flexibility (guided cantilever method per M.W. Kellogg), and piping design limits",
        calculators: ["Pipe Flexibility", "Safe Spans"],
      },
    ],
  },
  {
    name: "Separation & Vessels",
    icon: Container,
    color: "text-green-400",
    standards: [
      {
        code: "API 12J",
        title: "Specification for Oil and Gas Separators",
        scope: "Production separator sizing, K-factor guidance for gravity separators, inlet device and mist eliminator selection",
        calculators: ["Separator Sizing"],
      },
      {
        code: "GPSA Section 7",
        title: "GPSA Engineering Data Book — Separation Equipment",
        scope: "Souders-Brown K-values, GPSA Fig 7-9 pressure correction, gas capacity sizing, droplet settling, and holdup design for gas processing separators",
        calculators: ["Separator Sizing", "Flare KO Drum Sizing"],
      },
    ],
  },
  {
    name: "Heat Transfer",
    icon: Thermometer,
    color: "text-orange-400",
    standards: [
      {
        code: "TEMA Standards (10th Ed.)",
        title: "Standards of the Tubular Exchanger Manufacturers Association",
        scope: "Shell-and-tube heat exchanger classification (AES, BEM, etc.), tube layout, bundle constants, and LMTD F-factor correction charts",
        calculators: ["Heat Exchanger"],
      },
    ],
  },
  {
    name: "Rotating Equipment",
    icon: Cog,
    color: "text-purple-400",
    standards: [
      {
        code: "API 617",
        title: "Axial and Centrifugal Compressors and Expander-Compressors",
        scope: "Centrifugal compressor performance, polytropic head, surge/BEP operating limits",
        calculators: ["Compressor Sizing"],
      },
      {
        code: "API 618",
        title: "Reciprocating Compressors for Petroleum, Chemical, and Gas Industry Services",
        scope: "Reciprocating compressor staging, volumetric efficiency (clearance model), discharge temperature limits",
        calculators: ["Compressor Sizing"],
      },
      {
        code: "GPSA Section 13",
        title: "GPSA Engineering Data Book — Compressors and Expanders",
        scope: "Polytropic/isentropic models, multi-stage compression ratios, intercooler design basis, and power estimation",
        calculators: ["Compressor Sizing"],
      },
      {
        code: "API 610",
        title: "Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries",
        scope: "Centrifugal pump selection, TDH calculation, NPSHa/NPSHr margin, and performance curve characterization",
        calculators: ["Pump Sizing"],
      },
      {
        code: "API 674",
        title: "Positive Displacement Pumps — Reciprocating",
        scope: "Reciprocating PD pump sizing and pulsation considerations",
        calculators: ["Pump Sizing"],
      },
      {
        code: "API 676",
        title: "Positive Displacement Pumps — Rotary",
        scope: "Rotary PD pump sizing for viscous service",
        calculators: ["Pump Sizing"],
      },
    ],
  },
  {
    name: "Fluid Properties & Flow Measurement",
    icon: FlaskConical,
    color: "text-cyan-400",
    standards: [
      {
        code: "GPA 2145",
        title: "Table of Physical Properties for Hydrocarbons and Other Compounds of Interest to the Natural Gas Industry",
        scope: "Molecular weight, critical properties, and density for common natural gas components",
        calculators: ["Gas Mixing", "Gas Volume"],
      },
      {
        code: "ISO 13443",
        title: "Natural Gas — Standard Reference Conditions",
        scope: "Standard temperature and pressure reference conditions (15°C, 101.325 kPa) for gas volume calculations",
        calculators: ["Gas Volume"],
      },
      {
        code: "AGA Report No. 8",
        title: "Compressibility Factors of Natural Gas and Other Related Hydrocarbon Gases",
        scope: "Z-factor estimation for natural gas mixtures",
        calculators: ["Gas Volume", "Gas Mixing"],
      },
    ],
  },
  {
    name: "Piping Components & Dimensions",
    icon: Cylinder,
    color: "text-slate-400",
    standards: [
      {
        code: "ASME B36.10M",
        title: "Welded and Seamless Wrought Steel Pipe",
        scope: "Carbon steel pipe OD, wall thickness, and weight per meter for NPS 1/8 through 80",
        calculators: ["Piping Components"],
      },
      {
        code: "ASME B36.19M",
        title: "Stainless Steel Pipe",
        scope: "Stainless steel pipe dimensions for Schedule 5S through 80S",
        calculators: ["Piping Components"],
      },
      {
        code: "ASME B16.5",
        title: "Pipe Flanges and Flanged Fittings",
        scope: "Flange dimensions and pressure-temperature ratings for Class 150 through 2500",
        calculators: ["Piping Components"],
      },
      {
        code: "ASME B16.47",
        title: "Large Diameter Steel Flanges",
        scope: "Flange dimensions for NPS 26 through 60",
        calculators: ["Piping Components"],
      },
      {
        code: "ASME B16.9",
        title: "Factory-Made Wrought Buttwelding Fittings",
        scope: "Dimensions for BW elbows, tees, caps, and reducers",
        calculators: ["Piping Components"],
      },
      {
        code: "ASME B16.11",
        title: "Forged Fittings, Socket-Welding and Threaded",
        scope: "Dimensions for SW and threaded fittings",
        calculators: ["Piping Components"],
      },
      {
        code: "ASME B16.10",
        title: "Face-to-Face and End-to-End Dimensions of Valves",
        scope: "Valve face-to-face dimensions for gate, globe, ball, and check valves",
        calculators: ["Piping Components"],
      },
      {
        code: "ASME B16.48",
        title: "Line Blanks",
        scope: "Dimensions for spectacle blinds, spades, and spacers",
        calculators: ["Piping Components"],
      },
      {
        code: "MSS SP-97",
        title: "Integrally Reinforced Forged Branch Outlet Fittings",
        scope: "Dimensions for weldolets, sockolets, and threadolets",
        calculators: ["Piping Components"],
      },
    ],
  },
];

const KEY_METHODS = [
  {
    name: "Darcy-Weisbach Equation",
    equation: "ΔP = f · (L/D) · (ρ·v²/2)",
    description: "Fundamental pressure drop equation for single-phase pipe flow. Used with Moody friction factor (Colebrook-White or Swamee-Jain explicit approximation).",
    icon: Droplets,
  },
  {
    name: "Souders-Brown Correlation",
    equation: "V_max = K · √((ρ_L − ρ_G) / ρ_G)",
    description: "Gas capacity sizing for gravity separators. K-factor selected per API 12J or GPSA guidance depending on service type, with optional pressure correction and foam derating.",
    icon: Wind,
  },
  {
    name: "LMTD Method",
    equation: "Q = U · A · F · ΔTLM",
    description: "Log-Mean Temperature Difference method for heat exchanger area estimation. F-factor correction applied for multi-pass configurations per TEMA charts.",
    icon: Thermometer,
  },
  {
    name: "Erosional Velocity (API RP 14E)",
    equation: "V_e = C / √ρ_m",
    description: "Screening-level maximum velocity limit for piping. C-factor typically 100–150 for continuous service depending on corrosion allowance and solids content.",
    icon: Gauge,
  },
  {
    name: "Control Valve Cv (IEC 60534)",
    equation: "Cv = Q · √(SG · (P₁ − P₂)) / N₁",
    description: "Required flow coefficient for control valve sizing with choked flow detection using xT and FL factors, and piping geometry correction (Fp).",
    icon: CircleDot,
  },
];

export default function EngineeringBasisPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-1" /> Home
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">Engineering Basis & Standards</h1>
            <p className="text-sm text-muted-foreground">Reference standards and methods used across the calculator suite</p>
          </div>
        </div>

        <Card className="mt-6 mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed" data-testid="text-basis-intro">
              All calculators in this suite are built on published industry standards and validated engineering methods.
              Every calculation engine documents its assumptions, references, and applicable code sections.
              These tools are intended for screening, preliminary sizing, and educational use —
              final design must be validated against project-specific data, licensed simulation software, and independent peer review.
            </p>
          </CardContent>
        </Card>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4" data-testid="text-heading-methods">Key Calculation Methods</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {KEY_METHODS.map(m => (
              <Card key={m.name} className="hover:border-primary/30 transition-colors" data-testid={`card-method-${m.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="text-sm font-semibold">{m.name}</h3>
                  </div>
                  <code className="block text-xs font-mono text-primary/80 bg-primary/5 rounded px-2 py-1 mb-2">{m.equation}</code>
                  <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4" data-testid="text-heading-standards">Standards by Discipline</h2>
          <div className="space-y-6">
            {DISCIPLINES.map(disc => (
              <Card key={disc.name} data-testid={`card-discipline-${disc.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <disc.icon className={`w-5 h-5 ${disc.color} shrink-0`} />
                    <h3 className="text-base font-semibold">{disc.name}</h3>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{disc.standards.length} standards</Badge>
                  </div>
                  <div className="space-y-3">
                    {disc.standards.map(std => (
                      <div key={std.code} className="border-l-2 border-muted pl-3" data-testid={`standard-${std.code.toLowerCase().replace(/\s+/g, "-")}`}>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-primary">{std.code}</span>
                          <span className="text-xs text-muted-foreground">{std.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{std.scope}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {std.calculators.map(c => (
                            <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link href="/calculators">
            <Button variant="outline" data-testid="button-view-calculators">
              View All Calculators
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
