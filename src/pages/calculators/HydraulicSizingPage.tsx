import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gauge } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HydraulicSizingCalculator from "@/components/calculators/HydraulicSizingCalculator";
import Footer from "@/components/Footer";

const HydraulicSizingPage = () => {
  const [lineType, setLineType] = useState<"gas" | "liquid" | "mixed">("gas");

  return (
    <main className="min-h-screen bg-background flex flex-col">
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
                <Gauge className="w-5 h-5 text-primary" />
                <h1 className="font-heading text-lg sm:text-xl font-bold">
                  Hydraulic <span className="text-primary">Sizing</span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4 sm:px-6 py-4 flex-1">
        <Tabs value={lineType} onValueChange={(value) => setLineType(value as "gas" | "liquid" | "mixed")}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="gas">Gas Line</TabsTrigger>
            <TabsTrigger value="liquid">Liquid Line</TabsTrigger>
            <TabsTrigger value="mixed">Mixed-Phase</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Main Content */}
        <div className="py-4">
          <HydraulicSizingCalculator lineType={lineType} />
        </div>
      </div>

      <Footer />
    </main>
  );
};

export default HydraulicSizingPage;
