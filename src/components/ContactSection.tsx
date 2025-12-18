import { Phone, Mail, Linkedin, MapPin, Send } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contact" className="py-24 bg-gradient-dark relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-petroleum/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">Get in Touch</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mt-4 text-foreground">
            Contact Me
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Feel free to reach out for collaborations, opportunities, or just to say hello!
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Contact Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Phone */}
            <a
              href="tel:+201096597449"
              className="group bg-gradient-card rounded-xl border border-border p-6 text-center hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">Phone</h3>
              <p className="text-muted-foreground text-sm">+20 109 659 7449</p>
            </a>

            {/* Email */}
            <a
              href="mailto:hazemmancy@outlook.com"
              className="group bg-gradient-card rounded-xl border border-border p-6 text-center hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">Email</h3>
              <p className="text-muted-foreground text-sm">hazemmancy@outlook.com</p>
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/hazemmancy"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-gradient-card rounded-xl border border-border p-6 text-center hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Linkedin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">LinkedIn</h3>
              <p className="text-muted-foreground text-sm">linkedin.com/in/hazemmancy</p>
            </a>
          </div>

          {/* Location Card */}
          <div className="bg-gradient-card rounded-xl border border-border p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-lg">Cairo, Egypt</span>
            </div>
            <p className="text-muted-foreground">
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
