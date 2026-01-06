import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Calculator } from "lucide-react";


const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/90 backdrop-blur-lg shadow-card" : "bg-transparent"
        }`}
    >
      <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#home" className="font-heading text-xl sm:text-2xl font-bold touch-manipulation">
            <span className="text-foreground">H</span>
            <span className="text-gradient-gold">E</span>
          </a>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium uppercase tracking-wider"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/calculators"
                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm font-medium uppercase tracking-wider"
              >
                <Calculator className="w-4 h-4" />
                Calculators
              </Link>
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-foreground p-2 touch-manipulation"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 top-[56px] bg-card/98 backdrop-blur-lg z-40"
            onClick={(e) => e.target === e.currentTarget && setIsMobileMenuOpen(false)}
          >
            <ul className="flex flex-col py-4 h-full overflow-y-auto">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block px-6 py-4 text-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors touch-manipulation"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/calculators"
                  className="flex items-center gap-2 px-6 py-4 text-lg text-primary hover:text-primary/80 hover:bg-muted/50 transition-colors touch-manipulation"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Calculator className="w-5 h-5" />
                  Calculators
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navigation;