import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  ChevronDown,
  GraduationCap,
  Award,
  Briefcase,
  CheckCircle,
  Phone,
  Mail,
  Wrench,
  Globe,
  Monitor,
  Settings,
  Calculator,
  Wind,
  Droplets,
  Gauge,
  Blend,
  ArrowLeftRight,
  Waves,
  CircleDot,
  Container,
  Thermometer,
  Shield,
  Flame,
  Cog,
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";

const projects = [
  {
    category: "Rehabilitation",
    categoryColor: "text-green-400",
    client: "NORPETCO",
    location: "Egypt",
    title: "Abrar Station Rehabilitation",
    description: "Engineering verification and process rehabilitation studies for Abrar Production Station. Developed Process Simulation Report, PFD, P&IDs, UFD, and Gap Analysis.",
    tags: ["Aspen HYSYS", "P&ID Development", "PFD Design"],
    extraTags: 1,
  },
  {
    category: "Study",
    categoryColor: "text-blue-400",
    client: "PhPC",
    location: "Egypt",
    title: "KOD Level Transmitters Bottleneck Study",
    description: "Engineering bottleneck assessment for Wet Flare Knock-Out Drum at West Harbor Plant. Evaluated solutions including radar transmitters and electric heating.",
    tags: ["Troubleshooting", "Engineering Assessment"],
    extraTags: 2,
  },
  {
    category: "FEED",
    categoryColor: "text-red-400",
    client: "UGDC",
    location: "Damietta, Egypt",
    title: "Propane/LPG Export/Import Facility",
    description: "Developed process concept for new 14\" Propane export and 12\" LPG import lines. Managed Process Philosophy, Pipeline Hydraulic Calculations, P&ID, and Control Philosophy.",
    tags: ["Pipeline Design", "Hydraulic Calculations"],
    extraTags: 2,
  },
  {
    category: "Concept Study",
    categoryColor: "text-yellow-400",
    client: "PhPC",
    location: "Egypt",
    title: "West Harbor Heat Exchanger",
    description: "Concept Study for Shell and Tube Heat Exchanger to optimize plant energy consumption. Issued BOD, Steady State Simulation (Aspen HYSYS & HTRI), PFD, and...",
    tags: ["Aspen HYSYS", "HTRI", "Heat Exchanger Design"],
    extraTags: 1,
  },
  {
    category: "Detailed Engineering",
    categoryColor: "text-purple-400",
    client: "GEMSA",
    location: "Suez Gulf, Egypt",
    title: "Fuel Gas Power Generators",
    description: "Detailed Engineering for 16 Km fuel gas pipeline feeding WARDA Platform. Issued Process Design Criteria, PSV sizing, P&IDs, UFDs, and Shutdown Philosophy.",
    tags: ["Pipeline Design", "PSV Sizing", "P&ID"],
    extraTags: 1,
  },
  {
    category: "FEED - International",
    categoryColor: "text-red-400",
    client: "ADNOC OFFSHORE",
    location: "Das Island, Abu Dhabi",
    title: "Produced Water Injection Facility",
    description: "FEED Works for additional produced water injection facility. Responsible for BOD, PFD, P&IDs, C&E, Line List, and Equipment List.",
    tags: ["FEED", "BOD", "C&E Diagram"],
    extraTags: 2,
  },
  {
    category: "Concept Study",
    categoryColor: "text-yellow-400",
    client: "PhPC",
    location: "Egypt",
    title: "Flashed Gas Compressor",
    description: "Concept Study for new flashed Gas Compressor to boost gas pressure up to 90 barg. Issued BOD, PFD, P&IDs, Utilities Description, and Equipment List.",
    tags: ["Compressor Design", "High Pressure Systems"],
    extraTags: 2,
  },
  {
    category: "FEED",
    categoryColor: "text-red-400",
    client: "Indorama",
    location: "Ain Sokhna, Egypt",
    title: "Ammonia Pipeline",
    description: "FEED Works for 13 KM Ammonia transportation pipeline. Issued comprehensive Process Philosophies, C&E, Line List, and Equipment List.",
    tags: ["FEED", "Pipeline Design", "C&E Diagram"],
    extraTags: 1,
  },
  {
    category: "Proposal - International",
    categoryColor: "text-orange-400",
    client: "PETROMASILA",
    location: "Yemen",
    title: "Crude Topping Unit",
    description: "Proposal development for 10,000 BOPD crude distillation unit. Issued PFD, UFD, Process Description Report, and Equipment List.",
    tags: ["Distillation", "PFD", "UFD"],
    extraTags: 1,
  },
  {
    category: "Detailed Engineering - International",
    categoryColor: "text-purple-400",
    client: "Rumaila",
    location: "Iraq",
    title: "Crude Oil Tank",
    description: "Detailed Engineering of 25,000 m\u00B3 crude oil tank at Degassing Stations. Managed P&ID, tank datasheet, storage calculations, and PVSV calculations.",
    tags: ["Storage Tank", "P&ID", "PVSV"],
    extraTags: 1,
  },
];

const responsibilities = [
  "Process design and optimization for petroleum facilities",
  "Performing hydraulic calculation & line sizing",
  "Equipment sizing and specifications",
  "Developing PFDs, P&IDs, UFDs, and process philosophies",
  "Developing BOD, C&E Diagrams, and Equipment Datasheets",
  "Preparing Equipment Lists and Studies Reports",
  "Process simulation using Aspen HYSYS, EDR, and HTRI",
  "Relief valve sizing and safety analysis",
  "Cross-disciplinary coordination with engineering teams",
  "Technical documentation and specifications preparation",
];

const coreCompetencies = [
  "FEED", "EPC", "Process Simulation", "PFD", "P&ID", "UFD",
  "Heat and Material Balance", "BOD", "C&E",
  "Hydraulic Calculation", "Relief Valve Sizing", "Pipeline Design",
  "Equipment Sizing", "Process Philosophy",
  "API Standards", "ASME Codes", "HAZOP",
];

const skillCategories = [
  {
    icon: Settings,
    title: "Process Simulation",
    tags: ["Aspen HYSYS", "Aspen EDR", "HTRI"],
    tagColor: "text-primary",
  },
  {
    icon: Monitor,
    title: "Data Analytics & Programming",
    tags: ["Python", "SQL", "Power BI", "R", "Tableau"],
    tagColor: "text-blue-400",
  },
  {
    icon: Wrench,
    title: "General Engineering",
    tags: ["AutoCAD", "MS Office"],
    tagColor: "text-green-400",
  },
  {
    icon: Globe,
    title: "Languages",
    tags: ["Arabic (Native)", "English (Full Professional)"],
    tagColor: "text-orange-400",
  },
];

const calculatorCategories = [
  {
    label: "Hydraulics",
    items: [
      { title: "Gas Line Sizing", description: "Darcy-Weisbach with Swamee-Jain friction, Mach number check, and API RP 14E screening", icon: Wind, href: "/calculators/gas-line-sizing" },
      { title: "Liquid Line Sizing", description: "Friction and static head losses with velocity screening per industry standards", icon: Droplets, href: "/calculators/liquid-line-sizing" },
      { title: "Multiphase Screening", description: "Homogeneous model with API RP 14E erosional velocity and flow regime indicators", icon: Waves, href: "/calculators/multiphase-line" },
      { title: "Pump Sizing", description: "Centrifugal and PD pump sizing with TDH, BHP, and NPSH/NPIP analysis", icon: Gauge, href: "/calculators/pump-sizing" },
    ],
  },
  {
    label: "Fluids",
    items: [
      { title: "Gas Mixing", description: "Mole fraction weighted MW calculation with auto-normalization and validation", icon: Blend, href: "/calculators/gas-mixing" },
      { title: "Gas Volume Conversion", description: "Standard to actual volume conversion with compressibility factor correction", icon: ArrowLeftRight, href: "/calculators/gas-volume" },
    ],
  },
  {
    label: "Equipment",
    items: [
      { title: "Restriction Orifice", description: "Liquid and gas orifice sizing with choked flow detection and beta ratio check", icon: CircleDot, href: "/calculators/restriction-orifice" },
      { title: "Control Valve Cv", description: "Required Cv per IEC 60534 with choked flow, piping geometry, and expansion factor", icon: Gauge, href: "/calculators/control-valve" },
      { title: "Separator / KO Drum", description: "Souders-Brown sizing for vertical and horizontal separators with holdup calculation", icon: Container, href: "/calculators/separator" },
      { title: "Heat Exchanger", description: "LMTD-based area estimation with F-factor correction and fouling allowance", icon: Thermometer, href: "/calculators/heat-exchanger" },
      { title: "Compressor Sizing", description: "Polytropic/isentropic compressor sizing with multi-stage and intercooling support", icon: Cog, href: "/calculators/compressor" },
    ],
  },
  {
    label: "Relief",
    items: [
      { title: "PRD / Flare Relief", description: "9-step wizard: scenario screening (API 521), sizing (API 520), orifice selection (API 526), piping checks", icon: Shield, href: "/calculators/psv-sizing" },
      { title: "Thermal Relief", description: "Thermal expansion relief sizing for blocked-in liquid scenarios per API 521", icon: Flame, href: "/calculators/thermal-relief" },
    ],
  },
];

export default function Home() {
  return (
    <div>
      <section
        id="home"
        className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4"
      >
        <div className="absolute inset-0 hero-glow" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_50%,_hsl(222_41%_14%_/_0.8),_transparent)]" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 border rounded-full px-4 py-1.5 mb-8" data-testid="badge-title">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Oil & Gas Process Engineer</span>
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            data-testid="text-hero-title"
          >
            Hazem <span className="text-primary">ElMancy</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
            Transforming complex petroleum processes into{" "}
            <span className="text-foreground font-semibold">efficient engineering solutions</span>
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Cairo, Egypt</span>
            <span className="text-border">|</span>
            <span>UNEPP Co.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })}
              data-testid="button-view-projects"
            >
              View My Projects
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              data-testid="button-contact"
            >
              Contact Me
            </Button>
          </div>
        </div>

        <button
          onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-8 flex flex-col items-center gap-1 text-muted-foreground cursor-pointer"
          data-testid="button-scroll-down"
        >
          <span className="text-xs uppercase tracking-[0.2em]">Scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </button>
      </section>

      <section id="about" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-3" data-testid="label-about">ABOUT ME</p>
            <h2 className="text-3xl md:text-4xl font-bold">Professional Summary</h2>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6 md:p-8">
              <p className="text-sm md:text-base leading-relaxed text-muted-foreground" data-testid="text-about-summary">
                Process Engineer specializing in{" "}
                <span className="text-foreground font-semibold">Oil & Gas FEED and detailed design</span>
                , with expertise in process simulation (Aspen HYSYS, EDR, HTRI), equipment sizing, and hydraulic calculations. Proven track record in developing{" "}
                <span className="text-primary font-medium">PFDs, P&IDs, UFDs, H&MBs, BODs, C&E Diagrams, Equipment Datasheets, Equipment Lists, and Studies Reports</span>
                {" "}for EPC projects in compliance with API & ASME standards. Skilled in process philosophies and cross-disciplinary coordination, leveraging strong analytical skills to translate complex technical concepts for stakeholders.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-education-title">Education</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  B.Sc. in Petroleum Refining & Petrochemical Engineering
                </p>
                <p className="text-sm text-primary">Suez University (2016-2021)</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-certs-title">Certifications</h3>
                <ul className="space-y-1.5">
                  <li className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    Aspen Certified Expert User in Aspen HYSYS
                  </li>
                  <li className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    Google Data Analytics Certificate
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2" data-testid="text-role-title">Current Role</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Process Engineer at UNEPP Co.
                </p>
                <p className="text-sm text-primary">March 2023 - Present</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="experience" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-3">CAREER</p>
            <h2 className="text-3xl md:text-4xl font-bold">Experience at UNEPP</h2>
          </div>

          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-xl font-bold" data-testid="text-company-name">
                    United Engineers for Petroleum Projects
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    UNEPP Co. | Cairo, Egypt
                  </p>
                </div>
                <Badge variant="outline" className="text-xs" data-testid="badge-period">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5" />
                  March 2023 - Present
                </Badge>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-0.5 bg-primary" />
                  <h4 className="font-semibold text-sm">Job Purpose</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  As a Process Engineer at UNEPP Co., my primary responsibility is to contribute to the design, analysis, and optimization of processes within the petroleum industry. By leveraging my expertise in process engineering, hydraulic calculations, and equipment sizing, I ensure the efficient and safe operation of various systems. I actively participate in developing process models, creating detailed process drawings, and preparing technical documents and specifications.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-0.5 bg-primary" />
                  <h4 className="font-semibold text-sm">Roles & Responsibilities</h4>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {responsibilities.map((resp, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{resp}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="projects" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-3">PORTFOLIO</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Projects & Achievements</h2>
            <p className="text-muted-foreground text-sm">
              A showcase of petroleum engineering projects across Egypt, UAE, Iraq, and Yemen
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <Card
                key={index}
                className="hover-elevate"
                data-testid={`card-project-${index}`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <Badge variant="outline" className={`text-[10px] ${project.categoryColor}`}>
                      {project.category}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {project.location}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-2 leading-snug">
                    {project.client} {project.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                    {project.description}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground">Skills & Deliverables</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {project.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                    {project.extraTags > 0 && (
                      <Badge variant="secondary" className="text-[10px] text-primary">
                        +{project.extraTags}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="skills" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-3">EXPERTISE</p>
            <h2 className="text-3xl md:text-4xl font-bold">Skills & Competencies</h2>
          </div>

          <div className="text-center mb-8">
            <h3 className="font-semibold mb-4">Core Competencies</h3>
            <div className="flex flex-wrap justify-center gap-2" data-testid="skills-core">
              {coreCompetencies.map((comp) => (
                <Badge key={comp} variant="outline" className="text-xs">
                  {comp}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {skillCategories.map((cat) => (
              <Card key={cat.title}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                      <cat.icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{cat.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className={`text-xs ${cat.tagColor}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-3">TOOLS</p>
            <h2 className="text-3xl md:text-4xl font-bold">Engineering Calculators</h2>
            <p className="text-muted-foreground text-sm mt-3">
              Validated process engineering tools built on industry-standard equations
            </p>
          </div>

          <div className="space-y-8">
            {calculatorCategories.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-0.5 bg-primary" />
                  <h3 className="font-semibold text-sm tracking-wide">{cat.label}</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cat.items.map((calc) => (
                    <Link key={calc.href} href={calc.href}>
                      <Card
                        className="h-full hover-elevate active-elevate-2 cursor-pointer"
                        data-testid={`card-calc-${calc.href.split("/").pop()}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
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
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/calculators">
              <Button variant="outline" data-testid="button-view-all-calcs">
                <Calculator className="w-4 h-4 mr-2" />
                View All Calculators
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-3">GET IN TOUCH</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Contact Me</h2>
            <p className="text-muted-foreground text-sm">
              Feel free to reach out for collaborations, opportunities, or just to say hello!
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <Card className="hover-elevate">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">Phone</h3>
                <a
                  href="tel:+201096597449"
                  className="text-sm text-muted-foreground"
                  data-testid="link-contact-phone"
                >
                  +20 109 659 7449
                </a>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">Email</h3>
                <a
                  href="mailto:hazemmancy@outlook.com"
                  className="text-sm text-muted-foreground"
                  data-testid="link-contact-email"
                >
                  hazemmancy@outlook.com
                </a>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <SiLinkedin className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">LinkedIn</h3>
                <a
                  href="https://www.linkedin.com/in/hazemmancy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground"
                  data-testid="link-contact-linkedin"
                >
                  linkedin.com/in/hazemmancy
                </a>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Cairo, Egypt</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Currently working at <span className="text-primary font-medium">UNEPP Co.</span> — United Engineers for Petroleum Projects
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
