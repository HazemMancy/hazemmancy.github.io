import { GasMixingCalculator } from "@/components/calculators/GasMixingCalculator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

export default function GasMixingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <Link to="/calculators">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calculators
            </Button>
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gas Mixing Properties Calculator</h1>
          <p className="text-muted-foreground">
            Calculate mixture molecular weight, specific heat ratio (k), compressibility factor (Z), 
            and other thermodynamic properties from gas compositions using Kay's mixing rules and Peng-Robinson EOS.
          </p>
        </div>

        <GasMixingCalculator />
      </div>
      <Footer />
    </div>
  );
}
