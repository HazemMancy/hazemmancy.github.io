import { Cpu, Database, Wrench, Globe } from "lucide-react";

const skillCategories = [
  {
    icon: Cpu,
    title: "Process Simulation",
    skills: ["Aspen HYSYS", "Aspen EDR", "HTRI"],
  },
  {
    icon: Database,
    title: "Data Analytics & Programming",
    skills: ["Python", "SQL", "Power BI", "R", "Tableau"],
  },
  {
    icon: Wrench,
    title: "General Engineering",
    skills: ["AutoCAD", "MS Office"],
  },
  {
    icon: Globe,
    title: "Languages",
    skills: ["Arabic (Native)", "English (Full Professional)"],
  },
];

const coreCompetencies = [
  "FEED", "EPC", "Process Simulation", "PFD", "P&ID", "UFD",
  "Heat and Material Balance", "BOD", "C&E", "Hydraulic Calculation",
  "Relief Valve Sizing", "Pipeline Design", "Equipment Sizing",
  "Process Philosophy", "API Standards", "ASME Codes", "HAZOP",
];

const SkillsSection = () => {
  return (
    <section id="skills" className="py-24 bg-card relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">Expertise</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mt-4 text-foreground">
            Skills & Competencies
          </h2>
        </div>

        {/* Core Competencies Cloud */}
        <div className="max-w-4xl mx-auto mb-16">
          <h3 className="text-center text-lg font-semibold text-foreground mb-6">Core Competencies</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {coreCompetencies.map((competency, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-muted rounded-full text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-default"
              >
                {competency}
              </span>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-8 max-w-5xl mx-auto">
          {skillCategories.map((category, index) => (
            <div
              key={index}
              className="bg-gradient-card rounded-xl border border-border p-6 hover:border-primary/30 transition-colors"
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {category.title}
                </h3>
              </div>

              {/* Skills List */}
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, skillIndex) => (
                  <span
                    key={skillIndex}
                    className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
