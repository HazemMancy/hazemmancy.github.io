import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import HydraulicSizingCalculator from "@/components/calculators/HydraulicSizingCalculator";
import Footer from "@/components/Footer";

const HydraulicSizingPage = () => {
  const [lineType, setLineType] = useState<"gas" | "liquid" | "mixed">("gas");

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50 transition-colors duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/calculators">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Calculators</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-primary hidden sm:block" />
              <h1 className="text-sm sm:text-base font-semibold">
                Hydraulic <span className="text-primary">Sizing</span>
              </h1>
              <ThemeToggle />
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
