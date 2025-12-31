import { MapPin, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const projects = [
  {
    title: "NORPETCO Abrar Station Rehabilitation",
    location: "Egypt",
    description: "Engineering verification and process rehabilitation studies for Abrar Production Station. Developed Process Simulation Report, PFD, P&IDs, UFD, and Gap Analysis Report with steady-state Aspen HYSYS modeling.",
    skills: ["Aspen HYSYS", "P&ID Development", "PFD Design", "Gap Analysis", "Process Simulation"],
    type: "Rehabilitation",
  },
  {
    title: "PhPC KOD Level Transmitters Bottleneck Study",
    location: "Egypt",
    description: "Engineering bottleneck assessment for Wet Flare Knock-Out Drum at West Harbor Plant. Evaluated solutions including radar transmitters and electric heating.",
    skills: ["Troubleshooting", "Engineering Assessment", "Solutions Development", "Instrumentation"],
    type: "Study",
  },
  {
    title: "UGDC Propane/LPG Export/Import Facility",
    location: "Damietta, Egypt",
    description: "Developed process concept for new 14\" Propane export and 12\" LPG import lines. Managed Process Philosophy, Pipeline Hydraulic Calculations, P&ID, and Control Philosophy.",
    skills: ["Pipeline Design", "Hydraulic Calculations", "Control Philosophy", "Process Philosophy", "P&ID"],
    type: "FEED",
  },
  {
    title: "PhPC West Harbor Heat Exchanger",
    location: "Egypt",
    description: "Concept Study for Shell and Tube Heat Exchanger to optimize plant energy consumption. Issued BOD, Steady State Simulation (Aspen HYSYS & HTRI), PFD, and Equipment Datasheet.",
    skills: ["Aspen HYSYS", "HTRI", "Heat Exchanger Design", "BOD", "Equipment Datasheet"],
    type: "Concept Study",
  },
  {
    title: "GEMSA Fuel Gas Power Generators",
    location: "Suez Gulf, Egypt",
    description: "Detailed Engineering for 18 Km fuel gas pipeline feeding WARDA Platform. Issued Process Design Criteria, PSV sizing, P&IDs, UFDs, and Shutdown Philosophy.",
    skills: ["Pipeline Design", "PSV Sizing", "P&ID", "UFD", "Shutdown Philosophy"],
    type: "Detailed Engineering",
  },
  {
    title: "ADNOC OFFSHORE Produced Water Injection Facility",
    location: "Das Island, Abu Dhabi",
    description: "FEED Works for additional produced water injection facility. Responsible for BOD, PFD, P&IDs, C&E, Line List, and Equipment List.",
    skills: ["FEED", "BOD", "C&E Diagram", "Equipment List", "Line List", "P&ID"],
    type: "FEED - International",
  },
  {
    title: "PhPC Flashed Gas Compressor",
    location: "Egypt",
    description: "Concept Study for new flashed Gas Compressor to boost gas pressure up to 90 barg. Issued BOD, PFD, P&IDs, Utilities Description, and Equipment List.",
    skills: ["Compressor Design", "High Pressure Systems", "BOD", "PFD", "Equipment List"],
    type: "Concept Study",
  },
  {
    title: "Indorama Ammonia Pipeline",
    location: "Ain Sokhna, Egypt",
    description: "FEED Works for 13 KM Ammonia transportation pipeline. Issued comprehensive Process Philosophies, C&E, Line List, and Equipment List.",
    skills: ["FEED", "Pipeline Design", "C&E Diagram", "Process Philosophy", "Ammonia Handling"],
    type: "FEED",
  },
  {
    title: "PETROMASILA Crude Topping Unit",
    location: "Yemen",
    description: "Proposal development for 10,000 BOPD crude distillation unit. Issued PFD, UFD, Process Description Report, and Equipment List.",
    skills: ["Distillation", "PFD", "UFD", "Process Description", "Equipment List"],
    type: "Proposal - International",
  },
  {
    title: "Rumaila Crude Oil Tank",
    location: "Iraq",
    description: "Detailed Engineering of 25,000 m³ crude oil tank at Degassing Stations. Managed P&ID, tank datasheet, storage calculations, and PVSV calculations.",
    skills: ["Storage Tank Design", "P&ID", "Datasheet", "PVSV Sizing", "Storage Calculations"],
    type: "Detailed Engineering - International",
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 max-w-7xl mx-auto">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group bg-gradient-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all duration-300 sm:hover:-translate-y-2 sm:hover:shadow-elevated touch-manipulation flex flex-col"
            >
              {/* Project Type Badge */}
              <div className="px-4 pt-4 sm:px-5 sm:pt-5">
                <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-0">
                  {project.type}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col">
                {/* Location */}
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{project.location}</span>
                </div>

                {/* Title */}
                <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3 group-hover:text-primary transition-colors line-clamp-2">
                  {project.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                  {project.description}
                </p>

                {/* Skills */}
                <div className="border-t border-border pt-3 mt-auto">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                    <Wrench className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium">Skills & Deliverables</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {project.skills.slice(0, 4).map((skill, skillIndex) => (
                      <span
                        key={skillIndex}
                        className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                    {project.skills.length > 4 && (
                      <span className="px-2 py-0.5 text-xs font-medium text-primary">
                        +{project.skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;