import { MapPin } from "lucide-react";

const projects = [
  {
    title: "NORPETCO Abrar Station Rehabilitation",
    location: "Egypt",
    description: "Engineering verification and process rehabilitation studies for Abrar Production Station. Developed Process Simulation Report, PFD, P&IDs, UFD, and Gap Analysis Report with steady-state Aspen HYSYS modeling.",
    tags: ["Aspen HYSYS", "P&ID", "PFD", "Gap Analysis"],
  },
  {
    title: "PhPC KOD Level Transmitters Bottleneck Study",
    location: "Egypt",
    description: "Engineering bottleneck assessment for Wet Flare Knock-Out Drum at West Harbor Plant. Evaluated solutions including radar transmitters and electric heating.",
    tags: ["Troubleshooting", "Engineering Assessment", "Solutions Development"],
  },
  {
    title: "UGDC Propane/LPG Export/Import Facility",
    location: "Damietta, Egypt",
    description: "Developed process concept for new 14\" Propane export and 12\" LPG import lines. Managed Process Philosophy, Pipeline Hydraulic Calculations, P&ID, and Control Philosophy.",
    tags: ["Pipeline Design", "Hydraulics", "Control Philosophy"],
  },
  {
    title: "PhPC West Harbor Heat Exchanger",
    location: "Egypt",
    description: "Concept Study for Shell and Tube Heat Exchanger to optimize plant energy consumption. Issued BOD, Steady State Simulation (Aspen HYSYS & HTRI), PFD, and Equipment Datasheet.",
    tags: ["Aspen HYSYS", "HTRI", "Heat Exchanger Design"],
  },
  {
    title: "GEMSA Fuel Gas Power Generators",
    location: "Suez Gulf, Egypt",
    description: "Detailed Engineering for 18 Km fuel gas pipeline feeding WARDA Platform. Issued Process Design Criteria, PSV sizing, P&IDs, UFDs, and Shutdown Philosophy.",
    tags: ["Pipeline", "PSV Sizing", "Detailed Engineering"],
  },
  {
    title: "ADNOC OFFSHORE Produced Water Injection Facility",
    location: "Das Island, Abu Dhabi",
    description: "FEED Works for additional produced water injection facility. Responsible for BOD, PFD, P&IDs, C&E, Line List, and Equipment List.",
    tags: ["FEED", "International Project", "ADNOC"],
  },
  {
    title: "PhPC Flashed Gas Compressor",
    location: "Egypt",
    description: "Concept Study for new flashed Gas Compressor to boost gas pressure up to 90 barg. Issued BOD, PFD, P&IDs, Utilities Description, and Equipment List.",
    tags: ["Compressor", "High Pressure", "Concept Study"],
  },
  {
    title: "Indorama Ammonia Pipeline",
    location: "Ain Sokhna, Egypt",
    description: "FEED Works for 13 KM Ammonia transportation pipeline. Issued comprehensive Process Philosophies, C&E, Line List, and Equipment List.",
    tags: ["FEED", "Ammonia", "Pipeline Design"],
  },
  {
    title: "PETROMASILA Crude Topping Unit",
    location: "Yemen",
    description: "Proposal development for 10,000 BOPD crude distillation unit. Issued PFD, UFD, Process Description Report, and Equipment List.",
    tags: ["Distillation", "Proposal", "International"],
  },
  {
    title: "Rumaila Crude Oil Tank",
    location: "Iraq",
    description: "Detailed Engineering of 25,000 m³ crude oil tank at Degassing Stations. Managed P&ID, tank datasheet, storage calculations, and PVSV calculations.",
    tags: ["Storage Tank", "Detailed Engineering", "Iraq"],
  },
];

const ProjectsSection = () => {
  return (
    <section id="projects" className="py-16 sm:py-20 lg:py-24 bg-gradient-dark relative overflow-hidden">
      {/* Background elements - reduced for mobile performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-56 sm:w-80 h-56 sm:h-80 bg-petroleum/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <span className="text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">Portfolio</span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mt-3 sm:mt-4 text-foreground">
            Projects & Achievements
          </h2>
          <p className="text-muted-foreground mt-3 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base px-2">
            A showcase of petroleum engineering projects across Egypt, UAE, Iraq, and Yemen
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-7xl mx-auto">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group bg-gradient-card rounded-xl border border-border p-4 sm:p-6 hover:border-primary/50 transition-all duration-300 sm:hover:-translate-y-2 sm:hover:shadow-elevated touch-manipulation"
            >
              {/* Location */}
              <div className="flex items-center gap-1.5 text-primary text-xs sm:text-sm mb-2 sm:mb-3">
                <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" />
                <span className="truncate">{project.location}</span>
              </div>

              {/* Title */}
              <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3 group-hover:text-primary transition-colors line-clamp-2">
                {project.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 line-clamp-3 sm:line-clamp-none">
                {project.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {project.tags.slice(0, 3).map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md"
                  >
                    {tag}
                  </span>
                ))}
                {project.tags.length > 3 && (
                  <span className="px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    +{project.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;