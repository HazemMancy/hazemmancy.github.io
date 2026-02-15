import { Mail, Phone, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">HM</span>
              </div>
              <span className="font-semibold text-sm">Hazem El Mancy</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Process Engineer specializing in Oil & Gas FEED/EPC projects.
              Aspen HYSYS Certified Expert User.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Contact</h4>
            <div className="space-y-2">
              <a
                href="mailto:hazemmancy@outlook.com"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-email"
              >
                <Mail className="w-3.5 h-3.5" />
                hazemmancy@outlook.com
              </a>
              <a
                href="tel:+201096597449"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-phone"
              >
                <Phone className="w-3.5 h-3.5" />
                +20 109 659 7449
              </a>
              <a
                href="https://www.linkedin.com/in/hazemmancy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-linkedin"
              >
                <Linkedin className="w-3.5 h-3.5" />
                linkedin.com/in/hazemmancy
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Engineering Calculators</h4>
            <div className="space-y-1.5">
              {[
                "Gas Line Sizing",
                "Liquid Line Sizing",
                "Multiphase Screening",
                "Gas Mixing",
                "Gas Volume Conversion",
              ].map((name) => (
                <p key={name} className="text-xs text-muted-foreground">{name}</p>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Hazem El Mancy. All rights reserved. Cairo, Egypt.
          </p>
        </div>
      </div>
    </footer>
  );
}
