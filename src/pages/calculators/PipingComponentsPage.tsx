import { useState } from "react";
import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Calculator, Ruler } from "lucide-react";
import PipingComponentsCalculator from "@/components/calculators/PipingComponentsCalculator";
import PipingComponentsGuide from "@/components/calculators/guides/PipingComponentsGuide";

export default function PipingComponentsPage() {
  const [activeTab, setActiveTab] = useState("calculator");

  return (
    <CalculatorPageWrapper
      title="Piping Components"
      icon={<Ruler className="h-5 w-5" />}
      description="ASME B36.10M dimensional data for flanges, fittings, gaskets, valves, olets, blanks, flexibility & safe spans per industry standards."
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-4">
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guide">
          <PipingComponentsGuide />
        </TabsContent>

        <TabsContent value="calculator">
          <PipingComponentsCalculator />
        </TabsContent>
      </Tabs>
    </CalculatorPageWrapper>
  );
}
