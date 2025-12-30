import { Linkedin, Mail, Phone } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-6 sm:py-8 bg-card border-t border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Logo/Name */}
          <div className="flex items-center gap-2 order-1 sm:order-none">
            <span className="font-heading text-lg sm:text-xl font-bold">
              <span className="text-foreground">Hazem</span>{" "}
              <span className="text-gradient-gold">ElMancy</span>
            </span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-3 sm:gap-4 order-2 sm:order-none">
            <a
              href="tel:+201096597449"
              className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors touch-manipulation active:bg-primary/20"
              aria-label="Phone"
            >
              <Phone className="w-4 h-4" />
            </a>
            <a
              href="mailto:hazemmancy@outlook.com"
              className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors touch-manipulation active:bg-primary/20"
              aria-label="Email"
            >
              <Mail className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/hazemmancy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors touch-manipulation active:bg-primary/20"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>

          {/* Copyright */}
          <p className="text-muted-foreground text-xs sm:text-sm text-center order-3 sm:order-none">
            © {currentYear} Hazem ElMancy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;