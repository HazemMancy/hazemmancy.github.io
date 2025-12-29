import { Link } from "react-router-dom";
import { ArrowLeft, Thermometer } from "lucide-react";
import HeatExchangerSizing from "@/components/calculators/HeatExchangerSizing";

const HeatExchangerPage = () => {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-lg border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/calculators" 
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Calculators</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-primary" />
                <h1 className="font-heading text-lg sm:text-xl font-bold">
                  Heat Exchanger <span className="text-primary">Sizing</span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <HeatExchangerSizing />
      </div>
    </main>
  );
};

export default HeatExchangerPage;
