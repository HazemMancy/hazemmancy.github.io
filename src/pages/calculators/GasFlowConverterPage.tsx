import { useState } from "react";
import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Calculator } from "lucide-react";
import GasFlowConverter from "@/components/calculators/GasFlowConverter";
import GasFlowGuide from "@/components/calculators/guides/GasFlowGuide";

export default function GasFlowConverterPage() {
  const [activeTab, setActiveTab] = useState("calculator");

  return (
    <CalculatorPageWrapper 
      title="Gas Volume Converter"
      description="Convert between SCFM, ACFM, MMSCFD, Nm³/h, Sm³/h, and actual cubic meter rates. Standard units have locked reference conditions per industry standards."
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
          <GasFlowGuide />
        </TabsContent>

        <TabsContent value="calculator">
          <GasFlowConverter />
        </TabsContent>
      </Tabs>
    </CalculatorPageWrapper>
  );
}
