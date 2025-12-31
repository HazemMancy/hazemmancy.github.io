import { useState } from "react";
import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Calculator } from "lucide-react";
import { GasMixingCalculator } from "@/components/calculators/GasMixingCalculator";
import GasMixingGuide from "@/components/calculators/guides/GasMixingGuide";

export default function GasMixingPage() {
  const [activeTab, setActiveTab] = useState("calculator");

  return (
    <CalculatorPageWrapper 
      title="Gas Mixing Properties"
      description="Calculate mixture molecular weight, specific heat ratio (k), compressibility factor (Z), and other thermodynamic properties from gas compositions using Kay's mixing rules and Peng-Robinson EOS."
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
          <GasMixingGuide />
        </TabsContent>

        <TabsContent value="calculator">
          <GasMixingCalculator />
        </TabsContent>
      </Tabs>
    </CalculatorPageWrapper>
  );
}
