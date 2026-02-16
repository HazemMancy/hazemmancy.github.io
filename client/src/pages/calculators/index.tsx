import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wind, Droplets, Gauge, Blend, ArrowLeftRight, ArrowRight, Calculator,
  Waves, CircleDot, Container, Thermometer, Shield, Flame, Cog,
} from "lucide-react";

interface CalculatorEntry {
  title: string;
  description: string;
  href: string;
  icon: typeof Wind;
  category: string;
  categoryColor: string;
  tags: string[];
  standards: string[];
}

const categories = [
  { label: "Hydraulics", color: "text-blue-400" },
  { label: "Fluids", color: "text-green-400" },
  { label: "Equipment", color: "text-amber-400" },
  { label: "Relief", color: "text-red-400" },
];

const calculators: CalculatorEntry[] = [
  {
    title: "Gas Line Sizing",
    description: "Size gas piping using Darcy-Weisbach friction factor with Swamee-Jain correlation. Includes Reynolds number, Mach number check, and erosional velocity screening per API RP 14E.",
    href: "/calculators/gas-line-sizing",
    icon: Wind,
    category: "Hydraulics",
    categoryColor: "text-blue-400",
    tags: ["Darcy-Weisbach", "Swamee-Jain", "Mach Check"],
    standards: ["API RP 14E", "Crane TP-410"],
  },
  {
    title: "Liquid Line Sizing",
    description: "Size liquid piping with friction loss and static head calculations. Velocity limits, pressure drop per 100m, and NPS pipe selection with auto-fill dimensions.",
    href: "/calculators/liquid-line-sizing",
    icon: Droplets,
    category: "Hydraulics",
    categoryColor: "text-blue-400",
    tags: ["Darcy-Weisbach", "Static Head", "NPS Selection"],
    standards: ["Crane TP-410", "ASME B31.3"],
  },
  {
    title: "Multiphase Screening",
    description: "Screen multiphase flow lines using the homogeneous model. Calculates superficial velocities, mixture density, and erosional velocity per API RP 14E with configurable C-factor.",
    href: "/calculators/multiphase-line",
    icon: Waves,
    category: "Hydraulics",
    categoryColor: "text-blue-400",
    tags: ["API RP 14E", "Erosional Velocity", "Homogeneous Model"],
    standards: ["API RP 14E"],
  },
  {
    title: "Pump Sizing",
    description: "Comprehensive pump sizing for centrifugal and positive displacement pumps. Includes TDH, BHP, NPSH/NPIP analysis with API 674/676 compliance.",
    href: "/calculators/pump-sizing",
    icon: Gauge,
    category: "Hydraulics",
    categoryColor: "text-blue-400",
    tags: ["Centrifugal", "PD Pumps", "NPSH/NPIP"],
    standards: ["API 610", "API 674", "API 676"],
  },
  {
    title: "Gas Mixing",
    description: "Calculate mixture molecular weight from gas composition on a mole basis. Supports normalization of mole fractions within tolerance.",
    href: "/calculators/gas-mixing",
    icon: Blend,
    category: "Fluids",
    categoryColor: "text-green-400",
    tags: ["Mole Basis", "MW Calculation", "Normalization"],
    standards: ["GPA 2145"],
  },
  {
    title: "Gas Volume Conversion",
    description: "Convert between standard and actual gas volumes using real gas law with compressibility factor (Z). Supports both directions.",
    href: "/calculators/gas-volume",
    icon: ArrowLeftRight,
    category: "Fluids",
    categoryColor: "text-green-400",
    tags: ["PV=ZnRT", "Standard Conditions", "Z-factor"],
    standards: ["ISO 13443", "AGA Report No. 8"],
  },
  {
    title: "Restriction Orifice",
    description: "Size restriction orifices for liquid and gas service. Calculates required bore diameter, beta ratio, and checks for choked (critical) flow in gas service.",
    href: "/calculators/restriction-orifice",
    icon: CircleDot,
    category: "Equipment",
    categoryColor: "text-amber-400",
    tags: ["Liquid/Gas", "Choked Flow", "Beta Ratio"],
    standards: ["ISO 5167", "Crane TP-410"],
  },
  {
    title: "Control Valve Cv",
    description: "Calculate required Cv for control valves per IEC 60534. Supports liquid and gas service with choked flow detection, piping geometry factor, and expansion factor.",
    href: "/calculators/control-valve",
    icon: Gauge,
    category: "Equipment",
    categoryColor: "text-amber-400",
    tags: ["IEC 60534", "Choked Flow", "Fp/FL/xT"],
    standards: ["IEC 60534", "ISA S75.01"],
  },
  {
    title: "Separator / KO Drum",
    description: "Preliminary separator sizing using Souders-Brown equation. Vertical and horizontal configurations with liquid holdup and surge volume calculations.",
    href: "/calculators/separator",
    icon: Container,
    category: "Equipment",
    categoryColor: "text-amber-400",
    tags: ["Souders-Brown", "K-Factor", "Holdup Time"],
    standards: ["API 12J", "GPSA"],
  },
  {
    title: "Heat Exchanger",
    description: "LMTD-based heat exchanger area estimation. Supports counter-current, parallel, and multi-pass arrangements with F-factor correction and fouling allowance.",
    href: "/calculators/heat-exchanger",
    icon: Thermometer,
    category: "Equipment",
    categoryColor: "text-amber-400",
    tags: ["LMTD", "F-Factor", "Fouling"],
    standards: ["TEMA", "Kern Method"],
  },
  {
    title: "Compressor Sizing",
    description: "Centrifugal and reciprocating compressor sizing with polytropic/isentropic models. Calculates head, power, staging, and discharge temperature with auto-staging based on temperature limits.",
    href: "/calculators/compressor",
    icon: Cog,
    category: "Equipment",
    categoryColor: "text-amber-400",
    tags: ["Polytropic/Isentropic", "Multi-Stage", "Intercooling"],
    standards: ["API 617", "API 618", "GPSA"],
  },
  {
    title: "PRD / Flare Relief",
    description: "Comprehensive pressure relief device sizing with 9-step wizard. Scenario screening (API 521), gas/steam/liquid sizing (API 520), orifice selection (API 526), inlet/outlet piping checks, and device type recommendation.",
    href: "/calculators/psv-sizing",
    icon: Shield,
    category: "Relief",
    categoryColor: "text-red-400",
    tags: ["API 521", "API 520", "API 526", "9-Tab Wizard"],
    standards: ["API 521", "API 520", "API 526"],
  },
  {
    title: "Thermal Relief",
    description: "Thermal expansion relief sizing for blocked-in liquid scenarios. Calculates expansion volume, relief rate, and TRV size based on solar or process heating.",
    href: "/calculators/thermal-relief",
    icon: Flame,
    category: "Relief",
    categoryColor: "text-red-400",
    tags: ["API 521", "Blocked-in Liquid", "Solar Heat"],
    standards: ["API 521", "ASME B31.3"],
  },
];

export default function CalculatorsIndexPage() {
  return (
    <div className="min-h-screen">
      <section className="py-10 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-16">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-4">
              <Calculator className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              <h1 className="text-2xl md:text-4xl font-bold" data-testid="text-calculators-title">
                Process Engineering Calculators
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto text-xs md:text-base leading-relaxed px-2">
              Validated engineering calculators for Oil & Gas applications. Each tool features
              SI/Field unit toggle, built-in test cases, export capability, and documented assumptions
              with industry standard references.
            </p>
            <div className="flex items-center justify-center gap-2 md:gap-3 mt-5 md:mt-8 flex-wrap">
              {categories.map((cat) => (
                <div
                  key={cat.label}
                  className={`flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 rounded-md border text-xs md:text-sm font-medium transition-colors ${
                    cat.label === "Hydraulics"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      : cat.label === "Fluids"
                      ? "border-green-500/30 bg-green-500/10 text-green-400"
                      : cat.label === "Equipment"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${cat.color.replace("text-", "bg-")}`} />
                  {cat.label}
                  <span className="text-[10px] md:text-xs opacity-60">
                    {calculators.filter(c => c.category === cat.label).length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {calculators.map((calc) => (
              <Link key={calc.href} href={calc.href}>
                <Card
                  className="h-full hover-elevate cursor-pointer transition-all group"
                  data-testid={`card-calc-${calc.href.split("/").pop()}`}
                >
                  <CardContent className="p-4 md:p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2.5 rounded-md bg-primary/10 shrink-0">
                        <calc.icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${calc.categoryColor}`}>
                        {calc.category}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-sm mb-2" data-testid={`text-calc-title-${calc.href.split("/").pop()}`}>
                      {calc.title}
                    </h3>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                      {calc.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {calc.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-muted/30 pt-3 mt-auto">
                      <div className="flex flex-wrap gap-1">
                        {calc.standards.slice(0, 2).map((std) => (
                          <span key={std} className="text-[10px] text-muted-foreground/70">
                            {std}
                          </span>
                        ))}
                        {calc.standards.length > 2 && (
                          <span className="text-[10px] text-muted-foreground/50">
                            +{calc.standards.length - 2}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12 md:mt-16">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-8 px-6">
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Validated engineering calculators built per industry standards (API, ISO, IEC, TEMA, ASME).
                  Each tool includes documented assumptions, calculation traces, and standard references.
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Link href="/">
                    <Button variant="outline" size="sm" data-testid="button-back-portfolio">
                      Back to Portfolio
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
