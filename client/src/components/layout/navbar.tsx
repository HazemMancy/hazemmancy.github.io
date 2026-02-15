import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  Menu,
  X,
  ChevronDown,
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

const calculatorItems = [
  { label: "Gas Line Sizing", href: "/calculators/gas-line-sizing" },
  { label: "Liquid Line Sizing", href: "/calculators/liquid-line-sizing" },
  { label: "Multiphase Screening", href: "/calculators/multiphase-line" },
  { label: "Gas Mixing", href: "/calculators/gas-mixing" },
  { label: "Gas Volume Conversion", href: "/calculators/gas-volume" },
];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [calcDropdown, setCalcDropdown] = useState(false);
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
      window.location.href = "/" + href;
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

          <div
            className="relative"
            onMouseEnter={() => setCalcDropdown(true)}
            onMouseLeave={() => setCalcDropdown(false)}
          >
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wide text-primary cursor-pointer"
              data-testid="button-nav-calculators"
            >
              <Calculator className="w-3.5 h-3.5" />
              CALCULATORS
              <ChevronDown className="w-3 h-3" />
            </button>
            <div
              className={`absolute top-full right-0 mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg transition-all ${
                calcDropdown
                  ? "opacity-100 visible translate-y-0"
                  : "opacity-0 invisible -translate-y-1"
              }`}
            >
              {calculatorItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setCalcDropdown(false)}
                    data-testid={`link-calc-${item.href.split("/").pop()}`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
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
            <p className="text-xs font-medium text-primary px-3 mb-1">
              CALCULATORS
            </p>
          </div>
          {calculatorItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start pl-6"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
