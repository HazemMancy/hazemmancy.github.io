import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Calculator,
  User,
  Briefcase,
  FolderOpen,
  Home,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "About", href: "/about", icon: User },
  { label: "Experience", href: "/experience", icon: Briefcase },
  { label: "Projects", href: "/projects", icon: FolderOpen },
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

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home-logo">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">HM</span>
          </div>
          <span className="font-semibold text-sm hidden sm:inline">Hazem El Mancy</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                size="sm"
                data-testid={`link-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-3.5 h-3.5 mr-1.5" />
                {item.label}
              </Button>
            </Link>
          ))}
          <div
            className="relative"
            onMouseEnter={() => setCalcDropdown(true)}
            onMouseLeave={() => setCalcDropdown(false)}
          >
            <Button
              variant={isActive("/calculators") ? "secondary" : "ghost"}
              size="sm"
              data-testid="button-nav-calculators"
            >
              <Calculator className="w-3.5 h-3.5 mr-1.5" />
              Calculators
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
            <div
              className={`absolute top-full left-0 mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg transition-all ${
                calcDropdown
                  ? "opacity-100 visible translate-y-0"
                  : "opacity-0 invisible -translate-y-1"
              }`}
            >
              {calculatorItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
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

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="w-3.5 h-3.5 mr-2" />
                {item.label}
              </Button>
            </Link>
          ))}
          <div className="pt-2 pb-1">
            <p className="text-xs font-medium text-muted-foreground px-3 mb-1">
              Calculators
            </p>
          </div>
          {calculatorItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
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
