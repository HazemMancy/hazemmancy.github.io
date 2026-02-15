import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar } from "lucide-react";

interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  location: string;
  type: string;
  description: string[];
}

const experience: ExperienceItem[] = [
  {
    company: "Petrojet (ENPPI Group)",
    role: "Process Engineer",
    period: "2021 – Present",
    location: "Cairo, Egypt",
    type: "EPC Contractor",
    description: [
      "Lead process design and simulation for FEED and detailed engineering projects across upstream and downstream facilities",
      "Develop PFDs, P&IDs, Basis of Design documents, and Heat & Material Balances for oil & gas facilities",
      "Perform hydraulic calculations, line sizing, and process equipment design using industry standards",
      "Prepare equipment datasheets and conduct vendor technical bid evaluations",
      "Execute process studies including flare system design, produced water treatment, and gas compression",
    ],
  },
  {
    company: "Engineering Consultancy & Projects",
    role: "Process Design Engineer",
    period: "2019 – 2021",
    location: "Cairo, Egypt",
    type: "FEED & Concept Studies",
    description: [
      "Contributed to concept development and FEED studies for oil & gas production facilities",
      "Performed process simulation using Aspen HYSYS for facility design optimization",
      "Prepared technical documentation including BODs, process descriptions, and design basis",
      "Supported procurement activities through vendor print reviews and technical clarifications",
    ],
  },
];

export default function Experience() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <h1 className="text-3xl font-bold mb-2" data-testid="text-experience-title">
        Experience
      </h1>
      <p className="text-muted-foreground mb-8">
        Professional engineering experience in Oil & Gas FEED/EPC projects
      </p>

      <div className="space-y-4">
        {experience.map((item, index) => (
          <Card key={index} data-testid={`card-experience-${index}`}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-base">{item.company}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {item.role}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    {item.type}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    {item.period}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{item.location}</p>
              <ul className="space-y-2">
                {item.description.map((desc, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    {desc}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
