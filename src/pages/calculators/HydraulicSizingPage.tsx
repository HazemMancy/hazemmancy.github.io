import { useState } from "react";
import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Calculator } from "lucide-react";
import HydraulicSizingCalculator from "@/components/calculators/HydraulicSizingCalculator";
import HydraulicGuide from "@/components/calculators/guides/HydraulicGuide";

const HydraulicSizingPage = () => {
  const [lineType, setLineType] = useState<"gas" | "liquid" | "mixed">("gas");
  const [activeTab, setActiveTab] = useState("calculator");

  return (
    <CalculatorPageWrapper 
      title="Hydraulic Sizing"
      description="Calculate line sizing for gas, liquid, and mixed-phase systems per Eni Sizing Criteria and Darcy-Weisbach equation."
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
          <HydraulicGuide />
        </TabsContent>

        <TabsContent value="calculator">
          <Tabs value={lineType} onValueChange={(value) => setLineType(value as "gas" | "liquid" | "mixed")}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-4">
              <TabsTrigger value="gas">Gas Line</TabsTrigger>
              <TabsTrigger value="liquid">Liquid Line</TabsTrigger>
              <TabsTrigger value="mixed">Mixed-Phase</TabsTrigger>
            </TabsList>
          </Tabs>
          <HydraulicSizingCalculator lineType={lineType} />
        </TabsContent>
      </Tabs>
    </CalculatorPageWrapper>
  );
};

export default HydraulicSizingPage;
