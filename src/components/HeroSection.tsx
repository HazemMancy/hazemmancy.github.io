import { MapPin, ChevronDown } from "lucide-react";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-petroleum/10 rounded-full blur-3xl animate-float animation-delay-300" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/3 rounded-full" />
      </div>

      <div className="container relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-gold-subtle bg-card/50 backdrop-blur-sm animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-sm font-medium text-muted-foreground">Oil & Gas Process Engineer</span>
          </div>

          {/* Name */}
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-slide-up opacity-0 animation-delay-100">
            <span className="text-foreground">Hazem </span>
            <span className="text-gradient-gold">ElMancy</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up opacity-0 animation-delay-200">
            Transforming complex petroleum processes into 
            <span className="text-foreground font-medium"> efficient engineering solutions</span>
          </p>

          {/* Location */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-12 animate-slide-up opacity-0 animation-delay-300">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Cairo, Egypt • UNEPP Co.</span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up opacity-0 animation-delay-400">
            <a
              href="#projects"
              className="group px-8 py-4 bg-gradient-gold text-primary-foreground font-semibold rounded-lg shadow-gold hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
            >
              View My Projects
            </a>
            <a
              href="#contact"
              className="px-8 py-4 border border-gold-subtle text-foreground font-semibold rounded-lg hover:bg-card hover:border-primary/50 transition-all duration-300"
            >
              Contact Me
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <a href="#about" className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
