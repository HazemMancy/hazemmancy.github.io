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
    <section id="skills" className="py-16 sm:py-20 lg:py-24 bg-card relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <span className="text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">Expertise</span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mt-3 sm:mt-4 text-foreground">
            Skills & Competencies
          </h2>
        </div>

        {/* Core Competencies Cloud */}
        <div className="max-w-4xl mx-auto mb-10 sm:mb-12 lg:mb-16">
          <h3 className="text-center text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6">Core Competencies</h3>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {coreCompetencies.map((competency, index) => (
              <span
                key={index}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-muted rounded-full text-xs sm:text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-default touch-manipulation"
              >
                {competency}
              </span>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-8 max-w-5xl mx-auto">
          {skillCategories.map((category, index) => (
            <div
              key={index}
              className="bg-gradient-card rounded-xl border border-border p-4 sm:p-6 hover:border-primary/30 transition-colors touch-manipulation"
            >
              {/* Category Header */}
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <category.icon className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
                </div>
                <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground">
                  {category.title}
                </h3>
              </div>

              {/* Skills List */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {category.skills.map((skill, skillIndex) => (
                  <span
                    key={skillIndex}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-primary/10 text-primary rounded-lg text-xs sm:text-sm font-medium"
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