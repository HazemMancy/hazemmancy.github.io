import { API2000Calculator } from "@/components/calculators/API2000Calculator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

export default function API2000Page() {
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
          <h1 className="text-3xl font-bold mb-2">API 2000 Tank Venting Calculator</h1>
          <p className="text-muted-foreground">
            Calculate atmospheric and low-pressure storage tank venting requirements per API Standard 2000. 
            Includes thermal breathing, emergency venting for fire exposure, pump in/out, and valve sizing.
          </p>
        </div>

        <API2000Calculator />
      </div>
      <Footer />
    </div>
  );
}
