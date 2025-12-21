import { Link } from "react-router-dom";
import { ArrowLeft, Calculator } from "lucide-react";
import GasFlowConverter from "@/components/calculators/GasFlowConverter";

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

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <GasFlowConverter />
      </div>
    </main>
  );
};

export default Calculators;
