import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

const sectionLinks = [
  { label: "HOME", href: "#home" },
  { label: "ABOUT", href: "#about" },
  { label: "EXPERIENCE", href: "#experience" },
  { label: "PROJECTS", href: "#projects" },
  { label: "SKILLS", href: "#skills" },
  { label: "CONTACT", href: "#contact" },
];

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = location === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSectionClick = (href: string) => {
    setMobileOpen(false);
    if (isHome) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      setLocation("/" + href);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all ${
        scrolled
          ? "bg-background/95 backdrop-blur border-b"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-0.5 shrink-0"
          data-testid="link-home-logo"
        >
          <span className="text-primary font-bold text-xl tracking-tight">H</span>
          <span className="font-bold text-xl tracking-tight text-foreground">E</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {sectionLinks.map((item) => (
            <button
              key={item.href}
              onClick={() => handleSectionClick(item.href)}
              className="px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground transition-colors cursor-pointer"
              data-testid={`link-nav-${item.label.toLowerCase()}`}
            >
              {item.label}
            </button>
          ))}

          <Link href="/calculators">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wide text-primary cursor-pointer"
              data-testid="button-nav-calculators"
            >
              <Calculator className="w-3.5 h-3.5" />
              CALCULATORS
            </button>
          </Link>
        </nav>

        <Button
          size="icon"
          variant="ghost"
          className="lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="button-mobile-menu"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t bg-background px-4 py-3 space-y-1">
          {sectionLinks.map((item) => (
            <button
              key={item.href}
              onClick={() => handleSectionClick(item.href)}
              className="block w-full text-left px-3 py-2 text-sm text-muted-foreground"
              data-testid={`link-nav-mobile-${item.label.toLowerCase()}`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 pb-1">
            <Link href="/calculators">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-primary font-medium"
                onClick={() => setMobileOpen(false)}
                data-testid="link-nav-mobile-calculators"
              >
                <Calculator className="w-3.5 h-3.5 mr-1.5" />
                CALCULATORS
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
