import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Building2, MapPin } from "lucide-react";

interface ProjectItem {
  client: string;
  title: string;
  scope: string;
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
    title: "Crossover from Atoll Stream to Ha'py Stream",
    scope: "Offshore Pipeline Tie-in",
    tags: ["Offshore", "Pipeline", "Crossover"],
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
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                <MapPin className="w-3 h-3" />
                {project.scope}
              </p>
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
