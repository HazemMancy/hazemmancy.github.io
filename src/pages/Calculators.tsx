import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, Flame, Droplets, Thermometer, Gauge, Wind, Beaker } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CalculatorCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  status: "available" | "coming-soon";
  category: string;
}

const calculators: CalculatorCard[] = [
  {
    id: "gas-flow-converter",
    title: "Gas Volume Converter",
    description: "Convert gas flow rates between standard and actual conditions with real-time calculations",
    icon: <Flame className="w-8 h-8" />,
    route: "/calculators/gas-flow-converter",
    status: "available",
    category: "Flow"
  },
  {
    id: "hydraulic-sizing",
    title: "Hydraulic Sizing",
    description: "Size gas, liquid, and mixed-phase lines with pressure drop, velocity, and ρv² calculations",
    icon: <Gauge className="w-8 h-8" />,
    route: "/calculators/hydraulic-sizing",
    status: "available",
    category: "Fluid Mechanics"
  },
  {
    id: "heat-exchanger",
    title: "Heat Exchanger Sizing",
    description: "Design and rate shell & tube heat exchangers with LMTD and effectiveness-NTU methods",
    icon: <Thermometer className="w-8 h-8" />,
    route: "/calculators/heat-exchanger",
    status: "available",
    category: "Heat Transfer"
  },
  {
    id: "pump-sizing",
    title: "Pump Sizing Calculator",
    description: "Calculate pump head, power requirements, and select appropriate pump curves",
    icon: <Droplets className="w-8 h-8" />,
    route: "/calculators/pump-sizing",
    status: "coming-soon",
    category: "Fluid Mechanics"
  },
  {
    id: "compressor-power",
    title: "Compressor Power",
    description: "Estimate compressor power for ideal and polytropic compression processes",
    icon: <Wind className="w-8 h-8" />,
    route: "/calculators/compressor-power",
    status: "coming-soon",
    category: "Thermodynamics"
  },
  {
    id: "mixing-rules",
    title: "Gas Mixing Properties",
    description: "Calculate mixture properties using various mixing rules for gas compositions",
    icon: <Beaker className="w-8 h-8" />,
    route: "/calculators/mixing-rules",
    status: "coming-soon",
    category: "Thermodynamics"
  }
];

const Calculators = () => {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-lg border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Portfolio</span>
            </Link>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h1 className="font-heading text-lg sm:text-xl font-bold">
                Process Engineering <span className="text-primary">Calculators</span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Calculator className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
            Engineering <span className="text-primary">Toolkit</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Professional-grade calculators for process engineers. Fast, accurate, and designed for real-world applications.
          </p>
        </div>
      </section>

      {/* Calculator Grid */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calculators.map((calc) => (
              <CalculatorCardComponent key={calc.id} calculator={calc} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

const CalculatorCardComponent = ({ calculator }: { calculator: CalculatorCard }) => {
  const isAvailable = calculator.status === "available";
  
  const content = (
    <Card className={`h-full transition-all duration-300 border-2 ${
      isAvailable 
        ? "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1" 
        : "opacity-60"
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl transition-colors ${
            isAvailable 
              ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}>
            {calculator.icon}
          </div>
          <Badge 
            variant={isAvailable ? "default" : "secondary"}
            className={isAvailable ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
          >
            {isAvailable ? "Available" : "Coming Soon"}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs font-normal">
            {calculator.category}
          </Badge>
          <h3 className="text-xl font-heading font-semibold group-hover:text-primary transition-colors">
            {calculator.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {calculator.description}
          </p>
        </div>

        {isAvailable && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-sm text-primary font-medium group-hover:underline">
              Open Calculator →
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isAvailable) {
    return (
      <Link to={calculator.route} className="group block">
        {content}
      </Link>
    );
  }

  return (
    <div className="cursor-not-allowed">
      {content}
    </div>
  );
};

export default Calculators;
