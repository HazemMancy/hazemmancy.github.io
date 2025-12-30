import { GraduationCap, Award, Briefcase } from "lucide-react";

const AboutSection = () => {
  return (
    <section id="about" className="py-16 sm:py-20 lg:py-24 bg-gradient-dark relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 sm:w-1/3 h-64 sm:h-96 bg-primary/[0.03] blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <span className="text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">About Me</span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mt-3 sm:mt-4 text-foreground">
            Professional Summary
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main summary */}
          <div className="bg-gradient-card rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 border border-border shadow-card mb-8 sm:mb-12">
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Process Engineer specializing in <span className="text-foreground font-medium">Oil & Gas FEED and detailed design</span>, 
              with expertise in process simulation (Aspen HYSYS, EDR, HTRI), equipment sizing, and hydraulic calculations. 
              Proven track record in developing <span className="text-primary">PFDs, P&IDs, H&MBs, and process philosophies</span> for 
              EPC projects in compliance with API & ASME standards. Adept at cross-disciplinary coordination and data-driven 
              optimization, leveraging strong analytical skills to translate complex technical concepts for non-technical stakeholders.
            </p>
          </div>

          {/* Stats/Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Education */}
            <div className="group bg-card rounded-xl p-5 sm:p-6 border border-border hover:border-primary/50 transition-all duration-300 sm:hover:-translate-y-1 touch-manipulation">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground mb-2">Education</h3>
              <p className="text-muted-foreground text-sm mb-1">B.Sc. in Petroleum Refining & Petrochemical Engineering</p>
              <p className="text-primary text-sm font-medium">Suez University (2016-2021)</p>
            </div>

            {/* Certifications */}
            <div className="group bg-card rounded-xl p-5 sm:p-6 border border-border hover:border-primary/50 transition-all duration-300 sm:hover:-translate-y-1 touch-manipulation">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <Award className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground mb-2">Certifications</h3>
              <p className="text-muted-foreground text-sm mb-1">Aspen Certified Expert User in Aspen HYSYS</p>
              <p className="text-primary text-sm font-medium">Google Data Analytics Certificate</p>
            </div>

            {/* Experience */}
            <div className="group bg-card rounded-xl p-5 sm:p-6 border border-border hover:border-primary/50 transition-all duration-300 sm:hover:-translate-y-1 sm:col-span-2 lg:col-span-1 touch-manipulation">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <Briefcase className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground mb-2">Current Role</h3>
              <p className="text-muted-foreground text-sm mb-1">Process Engineer at UNEPP Co.</p>
              <p className="text-primary text-sm font-medium">March 2023 - Present</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;