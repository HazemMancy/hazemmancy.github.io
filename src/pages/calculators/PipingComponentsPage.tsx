import { Link } from "react-router-dom";
import { ArrowLeft, PipetteIcon } from "lucide-react";
import PipingComponentsCalculator from "@/components/calculators/PipingComponentsCalculator";
import Footer from "@/components/Footer";

export default function PipingComponentsPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
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
            <div className="flex items-center gap-2">
              <PipetteIcon className="w-5 h-5 text-primary" />
              <h1 className="font-heading text-lg sm:text-xl font-bold">
                Piping Components <span className="text-primary">Data</span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      <section className="py-8 sm:py-12 flex-1">
        <div className="container mx-auto px-4 sm:px-6">
          <PipingComponentsCalculator />
        </div>
      </section>

      <Footer />
    </main>
  );
}
