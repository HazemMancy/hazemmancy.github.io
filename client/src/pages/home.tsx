import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Calculator,
  Mail,
  Linkedin,
  MapPin,
  Gauge,
  Droplets,
  Wind,
  Blend,
  ArrowLeftRight,
} from "lucide-react";

const calculators = [
  {
    title: "Gas Line Sizing",
    description: "Darcy-Weisbach with Swamee-Jain friction, Mach number check, and API RP 14E screening",
    icon: Wind,
    href: "/calculators/gas-line-sizing",
  },
  {
    title: "Liquid Line Sizing",
    description: "Friction and static head losses with velocity screening per industry standards",
    icon: Droplets,
    href: "/calculators/liquid-line-sizing",
  },
  {
    title: "Multiphase Screening",
    description: "Homogeneous model with API RP 14E erosional velocity and flow regime indicators",
    icon: Gauge,
    href: "/calculators/multiphase-line",
  },
  {
    title: "Gas Mixing",
    description: "Mole fraction weighted MW calculation with auto-normalization and validation",
    icon: Blend,
    href: "/calculators/gas-mixing",
  },
  {
    title: "Gas Volume Conversion",
    description: "Standard to actual volume conversion with compressibility factor correction",
    icon: ArrowLeftRight,
    href: "/calculators/gas-volume",
  },
];

const skills = [
  "Aspen HYSYS",
  "Process Simulation",
  "PFD/P&ID",
  "Hydraulic Analysis",
  "FEED Engineering",
  "Equipment Sizing",
  "H&MB",
  "BOD Development",
  "Vendor Review",
  "Flare Systems",
  "Offshore Facilities",
  "Pipeline Design",
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4" data-testid="badge-title">
              Process Engineer — Oil & Gas
            </Badge>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
              data-testid="text-hero-title"
            >
              Hazem El Mancy
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-3 leading-relaxed max-w-2xl">
              FEED & EPC Process Engineer with hands-on experience in upstream/downstream,
              onshore/offshore oil & gas facilities. Aspen HYSYS Certified Expert User.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Cairo, Egypt
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/about">
                <Button data-testid="button-about-me">
                  About Me
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <a href="mailto:hazemmancy@outlook.com">
                <Button variant="outline" data-testid="button-contact">
                  <Mail className="w-4 h-4 mr-1.5" />
                  Contact
                </Button>
              </a>
              <a
                href="https://www.linkedin.com/in/hazemmancy"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" data-testid="button-linkedin">
                  <Linkedin className="w-4 h-4 mr-1.5" />
                  LinkedIn
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-2 mb-8" data-testid="skills-list">
            {skills.map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold" data-testid="text-calc-heading">
              Engineering Calculators
            </h2>
          </div>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Validated process engineering tools built on industry-standard equations.
            Every calculation is traceable, documented, and includes engineering
            assumptions and references.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {calculators.map((calc) => (
              <Link key={calc.href} href={calc.href}>
                <Card
                  className="h-full hover-elevate active-elevate-2 cursor-pointer transition-all"
                  data-testid={`card-calc-${calc.href.split("/").pop()}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <calc.icon className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-sm">{calc.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {calc.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
