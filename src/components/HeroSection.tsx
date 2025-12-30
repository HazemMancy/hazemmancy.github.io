import { MapPin, ChevronDown } from "lucide-react";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl animate-float will-change-transform" />
        <div className="absolute bottom-1/4 -right-32 w-56 sm:w-80 h-56 sm:h-80 bg-petroleum/10 rounded-full blur-3xl animate-float animation-delay-300 will-change-transform" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] border border-primary/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] sm:w-[800px] h-[550px] sm:h-[800px] border border-primary/[0.03] rounded-full" />
      </div>

      <div className="container relative z-10 px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 mb-6 sm:mb-8 rounded-full border border-gold-subtle bg-card/50 backdrop-blur-sm animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Oil & Gas Process Engineer</span>
          </div>

          {/* Name */}
          <h1 className="font-heading text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-4 sm:mb-6 animate-slide-up opacity-0 animation-delay-100 leading-tight">
            <span className="text-foreground">Hazem </span>
            <span className="text-gradient-gold">ElMancy</span>
          </h1>

          {/* Tagline */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2 sm:px-4 animate-slide-up opacity-0 animation-delay-200 leading-relaxed">
            Transforming complex petroleum processes into 
            <span className="text-foreground font-medium"> efficient engineering solutions</span>
          </p>

          {/* Location */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-8 sm:mb-12 animate-slide-up opacity-0 animation-delay-300">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm sm:text-base">Cairo, Egypt • UNEPP Co.</span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-slide-up opacity-0 animation-delay-400">
            <a
              href="#projects"
              className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-gold text-primary-foreground font-semibold rounded-lg shadow-gold hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 text-center touch-manipulation"
            >
              View My Projects
            </a>
            <a
              href="#contact"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border border-gold-subtle text-foreground font-semibold rounded-lg hover:bg-card hover:border-primary/50 transition-all duration-300 text-center touch-manipulation"
            >
              Contact Me
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator - hidden on small screens */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block">
        <a href="#about" className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors touch-manipulation">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;