import { ExternalLink, MapPin } from "lucide-react";

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
    <section id="projects" className="py-24 bg-gradient-dark relative">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-petroleum/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">Portfolio</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mt-4 text-foreground">
            Projects & Achievements
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            A showcase of petroleum engineering projects across Egypt, UAE, Iraq, and Yemen
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group bg-gradient-card rounded-xl border border-border p-6 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-elevated"
            >
              {/* Location */}
              <div className="flex items-center gap-1.5 text-primary text-sm mb-3">
                <MapPin className="w-3.5 h-3.5" />
                <span>{project.location}</span>
              </div>

              {/* Title */}
              <h3 className="font-heading text-lg font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                {project.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {project.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md"
                  >
                    {tag}
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

export default ProjectsSection;
