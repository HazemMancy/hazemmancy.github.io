import { Phone, Mail } from "lucide-react";
import { SiLinkedin } from "react-icons/si";

export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <span className="text-primary font-bold text-sm">Hazem</span>
            <span className="font-bold text-sm text-foreground">ElMancy</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:+201096597449"
              className="w-9 h-9 rounded-full border flex items-center justify-center text-muted-foreground transition-colors"
              data-testid="link-footer-phone"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
            <a
              href="mailto:hazemmancy@outlook.com"
              className="w-9 h-9 rounded-full border flex items-center justify-center text-muted-foreground transition-colors"
              data-testid="link-footer-email"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://www.linkedin.com/in/hazemmancy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border flex items-center justify-center text-muted-foreground transition-colors"
              data-testid="link-footer-linkedin"
            >
              <SiLinkedin className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Hazem ElMancy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
