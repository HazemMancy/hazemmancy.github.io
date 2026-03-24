import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Building2, MapPin } from "lucide-react";

interface ProjectItem {
  client: string;
  title: string;
  scope: string;
  location?: string;
  description?: string;
  tags: string[];
}

const projects: ProjectItem[] = [
  {
    client: "NORPETCO",
    title: "Abrar Production Station Rehabilitation",
    scope: "Onshore Production Facility",
    tags: ["Rehabilitation", "Onshore", "Production"],
  },
  {
    client: "PhPC",
    title: "Wet Flare KOD Bottleneck Study",
    scope: "Flare System Study",
    tags: ["Flare Systems", "Debottlenecking", "Study"],
  },
  {
    client: "PhPC",
    title: "Atoll Crossover for Pressurizing Ha'py Subsea Pipeline",
    scope: "FEED",
    location: "Port Said, Egypt",
    description:
      "Performed pressurization study of the 30\" Ha'py subsea pipeline using Atoll gas via 10\" crossover. Developed Pressurization Philosophy and Design Basis, including MDMT assessment, AIV/FIV screening, P&IDs, and transient hydraulic simulation using Aspen HYSYS Pressurization Tool.",
    tags: ["FEED", "BOD", "Hydraulic Calculations", "AIV/FIV Analysis", "P&ID"],
  },
  {
    client: "UGDC",
    title: "New Propane/LPG Export–Import Facility",
    scope: "Concept Development",
    tags: ["LPG", "Export/Import", "Concept"],
  },
  {
    client: "GEMPETCO",
    title: "Zaafarana Field Development (Offshore Power & Platform, EPCI)",
    scope: "Offshore Field Development",
    tags: ["Offshore", "Platform", "EPCI", "Field Development"],
  },
  {
    client: "PhPC",
    title: "West Harbor New Heat Exchanger",
    scope: "Concept Study",
    tags: ["Heat Exchanger", "Concept", "Onshore"],
  },
  {
    client: "ADNOC",
    title: "Offshore Produced Water Injection Facility",
    scope: "FEED",
    tags: ["FEED", "Produced Water", "Offshore", "Injection"],
  },
  {
    client: "PhPC",
    title: "West Harbor Flashed Gas Compression Package",
    scope: "Concept Study",
    tags: ["Gas Compression", "Concept", "Package"],
  },
  {
    client: "Indorama",
    title: "Cryogenic Ammonia Pipeline",
    scope: "FEED",
    tags: ["Pipeline", "Cryogenic", "FEED", "Ammonia"],
  },
  {
    client: "PETROMASILA",
    title: "Crude Distillation Unit",
    scope: "Proposal & Concept",
    tags: ["CDU", "Downstream", "Proposal"],
  },
  {
    client: "Rumaila",
    title: "Crude Oil Tank",
    scope: "Detailed Engineering",
    tags: ["Storage Tank", "Detailed Engineering", "Crude Oil"],
  },
  {
    client: "WASCO",
    title: "North El-Basant-1 Well Tie-in to Azhar-1 Manifold",
    scope: "FEED",
    location: "Damietta, Egypt",
    description:
      "Prepared Basis of Design for tie-in of North El-Basant-1 well to Azhar-1 manifold within the WASCO production system. Covered the wellhead hook-up line, spill back unit, pneumatic control panel gas supply, underground pipeline, and tie-in philosophy. Developed process design basis using approved PVT and well test data, including hydraulic design basis, gas and condensate composition, and safety considerations for wet sweet gas service.",
    tags: ["FEED", "BOD", "Process Design", "Hydraulic Design", "P&ID"],
  },
  {
    client: "GEMSA",
    title: "Offshore Oil Processing Platform & FSO Development",
    scope: "Pre-FEED",
    location: "Gulf of Suez, Egypt",
    description:
      "Pre-FEED development for a new offshore production platform with oil processing topsides and a new FSO for storage and export, replacing the existing aging FPSO system. Scope includes preliminary sizing of separators, pumps, desalter, heater treater, tanks, chemical injection skids, and produced water treatment packages, together with process configuration development and cost estimation.",
    tags: ["Pre-FEED", "Equipment Sizing", "Oil Treating", "Produced Water Treatment", "Cost Estimation"],
  },
];

export default function Projects() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <div className="flex items-center gap-3 mb-2">
        <FolderOpen className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold" data-testid="text-projects-title">
          Projects
        </h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Selected engineering projects across upstream/downstream oil & gas
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project, index) => (
          <Card key={index} data-testid={`card-project-${index}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-primary">{project.client}</span>
              </div>
              <h3 className="font-semibold text-sm mb-1.5 leading-snug">
                {project.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {project.scope}
                </p>
                {project.location && (
                  <p className="text-xs text-muted-foreground">{project.location}</p>
                )}
              </div>
              {project.description && (
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed mb-3">
                  {project.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
