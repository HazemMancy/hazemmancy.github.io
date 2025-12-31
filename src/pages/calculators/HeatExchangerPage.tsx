import { useState } from "react";
import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Calculator } from "lucide-react";
import HeatExchangerSizing from "@/components/calculators/HeatExchangerSizing";
import HeatExchangerGuide from "@/components/calculators/guides/HeatExchangerGuide";

const HeatExchangerPage = () => {
  const [activeTab, setActiveTab] = useState("calculator");

  return (
    <CalculatorPageWrapper 
      title="Heat Exchanger Sizing"
      description="Design and rate shell & tube heat exchangers with LMTD and effectiveness-NTU methods per TEMA standards."
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
          <HeatExchangerGuide />
        </TabsContent>

        <TabsContent value="calculator">
          <HeatExchangerSizing />
        </TabsContent>
      </Tabs>
    </CalculatorPageWrapper>
  );
};

export default HeatExchangerPage;
