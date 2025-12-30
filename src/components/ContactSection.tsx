import { Phone, Mail, Linkedin, MapPin } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contact" className="py-16 sm:py-20 lg:py-24 bg-gradient-dark relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-20 -left-20 w-56 sm:w-80 h-56 sm:h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-48 sm:w-64 h-48 sm:h-64 bg-petroleum/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <span className="text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">Get in Touch</span>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mt-3 sm:mt-4 text-foreground">
            Contact Me
          </h2>
          <p className="text-muted-foreground mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base px-2">
            Feel free to reach out for collaborations, opportunities, or just to say hello!
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-12">
            {/* Phone */}
            <a
              href="tel:+201096597449"
              className="group bg-gradient-card rounded-xl border border-border p-5 sm:p-6 text-center hover:border-primary/50 transition-all duration-300 sm:hover:-translate-y-1 touch-manipulation active:bg-muted/50"
            >
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <Phone className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1 sm:mb-2">Phone</h3>
              <p className="text-muted-foreground text-sm">+20 109 659 7449</p>
            </a>

            {/* Email */}
            <a
              href="mailto:hazemmancy@outlook.com"
              className="group bg-gradient-card rounded-xl border border-border p-5 sm:p-6 text-center hover:border-primary/50 transition-all duration-300 sm:hover:-translate-y-1 touch-manipulation active:bg-muted/50"
            >
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <Mail className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1 sm:mb-2">Email</h3>
              <p className="text-muted-foreground text-sm break-all sm:break-normal">hazemmancy@outlook.com</p>
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/hazemmancy"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-gradient-card rounded-xl border border-border p-5 sm:p-6 text-center hover:border-primary/50 transition-all duration-300 sm:hover:-translate-y-1 sm:col-span-2 lg:col-span-1 touch-manipulation active:bg-muted/50"
            >
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <Linkedin className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1 sm:mb-2">LinkedIn</h3>
              <p className="text-muted-foreground text-sm">linkedin.com/in/hazemmancy</p>
            </a>
          </div>

          {/* Location Card */}
          <div className="bg-gradient-card rounded-xl border border-border p-6 sm:p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3 sm:mb-4">
              <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
              <span className="text-base sm:text-lg">Cairo, Egypt</span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Currently working at <span className="text-primary font-medium">UNEPP Co.</span> — 
              United Engineers for Petroleum Projects
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;