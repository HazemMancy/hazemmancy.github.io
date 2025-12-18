import { CheckCircle } from "lucide-react";

const responsibilities = [
  "Process design and optimization for petroleum facilities",
  "Performing hydraulic calculation & line sizing",
  "Equipment sizing and specifications",
  "Developing PFDs, P&IDs, UFDs, and process philosophies",
  "Process simulation using Aspen HYSYS, EDR, and HTRI",
  "Relief valve sizing and safety analysis",
  "Cross-disciplinary coordination with engineering teams",
  "Technical documentation and specifications preparation",
];

const ExperienceSection = () => {
  return (
    <section id="experience" className="py-24 bg-card relative overflow-hidden">
      {/* Decorative element */}
      <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
      
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">Career</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mt-4 text-foreground">
            Experience at UNEPP
          </h2>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Company Card */}
          <div className="bg-gradient-card rounded-2xl border border-border overflow-hidden shadow-card">
            {/* Header */}
            <div className="bg-secondary/50 p-6 md:p-8 border-b border-border">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                    United Engineers for Petroleum Projects
                  </h3>
                  <p className="text-primary font-semibold mt-1">UNEPP Co. • Cairo, Egypt</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-foreground">March 2023 - Present</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8">
              {/* Job Purpose */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-primary" />
                  Job Purpose
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  As a Process Engineer at UNEPP Co., my primary responsibility is to contribute to the design, 
                  analysis, and optimization of processes within the petroleum industry. By leveraging my expertise 
                  in process engineering, hydraulic calculations, and equipment sizing, I ensure the efficient and 
                  safe operation of various systems. I actively participate in developing process models, creating 
                  detailed process drawings, and preparing technical documents and specifications.
                </p>
              </div>

              {/* Responsibilities */}
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-primary" />
                  Roles & Responsibilities
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {responsibilities.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
