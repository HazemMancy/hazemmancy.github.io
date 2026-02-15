import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Award,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Briefcase,
} from "lucide-react";

const certifications = [
  "Aspen HYSYS Certified Expert User",
  "Process Design Engineering",
  "FEED & EPC Project Execution",
];

const coreCompetencies = [
  "Process Simulation (Aspen HYSYS)",
  "PFD & P&ID Development",
  "Heat & Material Balances",
  "Hydraulic Analysis & Line Sizing",
  "Process Equipment Design & Datasheets",
  "Basis of Design (BOD) Documents",
  "Vendor Technical Bid Evaluation",
  "Flare & Relief System Design",
  "Produced Water Treatment",
  "Gas Dehydration & Compression",
  "Pipeline & Piping Design",
  "Offshore Platform Process Design",
];

const softwareTools = [
  "Aspen HYSYS",
  "Aspen EDR",
  "HTRI",
  "AFT Fathom/Arrow",
  "AutoCAD P&ID",
  "Microsoft Office Suite",
];

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <h1 className="text-3xl font-bold mb-2" data-testid="text-about-title">About</h1>
      <p className="text-muted-foreground mb-8">
        Professional background and qualifications
      </p>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-xl">HM</span>
            </div>
            <div>
              <h2 className="text-xl font-bold" data-testid="text-about-name">Hazem El Mancy</h2>
              <p className="text-sm text-muted-foreground">
                Process Engineer — Oil & Gas (FEED/EPC)
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Cairo, Egypt
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> hazemmancy@outlook.com
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> +20 109 659 7449
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-about-summary">
            Process Engineer with hands-on experience in FEED and detailed engineering for
            upstream/downstream, onshore/offshore oil & gas facilities. Aspen HYSYS Certified
            Expert User specializing in process design, simulation, PFDs, P&IDs, BODs, H&MBs,
            hydraulic calculations, process equipment design, datasheets, and vendor print reviews.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Core Competencies</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {coreCompetencies.map((comp) => (
                <Badge key={comp} variant="outline" className="text-xs">
                  {comp}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Certifications</h3>
            </div>
            <ul className="space-y-2">
              {certifications.map((cert) => (
                <li key={cert} className="text-sm text-muted-foreground flex items-start gap-2">
                  <Award className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  {cert}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Software & Tools</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {softwareTools.map((tool) => (
              <Badge key={tool} variant="secondary" className="text-xs">
                {tool}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Linkedin className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Connect</h3>
            </div>
            <a
              href="https://www.linkedin.com/in/hazemmancy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
              data-testid="link-about-linkedin"
            >
              linkedin.com/in/hazemmancy
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
