import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gauge } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PressureDropCalculator from "@/components/calculators/PressureDropCalculator";

const PressureDropPage = () => {
  const [flowPhase, setFlowPhase] = useState<"single" | "mixed">("single");

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
                <Gauge className="w-5 h-5 text-primary" />
                <h1 className="font-heading text-lg sm:text-xl font-bold">
                  Pressure Drop <span className="text-primary">Calculator</span>
                </h1>
              </div>
              <Select value={flowPhase} onValueChange={(value: "single" | "mixed") => setFlowPhase(value)}>
                <SelectTrigger className="w-36 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Phase</SelectItem>
                  <SelectItem value="mixed">Mixed Phase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <PressureDropCalculator flowPhase={flowPhase} />
      </div>
    </main>
  );
};

export default PressureDropPage;
