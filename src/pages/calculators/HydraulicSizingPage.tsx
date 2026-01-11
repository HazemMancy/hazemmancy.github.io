import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import HydraulicSizingCalculator from "@/components/calculators/HydraulicSizingCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge } from "lucide-react";

const HydraulicSizingPage = () => {
  return (
    <CalculatorPageWrapper
      title="Hydraulic Sizing"
      icon={<Gauge className="h-5 w-5" />}
      description="Size process piping and check velocity, pressure drop, and momentum limits for gas, liquid, and mixed-phase flow per API RP 14E."
    >
      <Tabs defaultValue="gas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="gas">Gas Line</TabsTrigger>
          <TabsTrigger value="liquid">Liquid Line</TabsTrigger>
          <TabsTrigger value="mixed">Mixed Phase</TabsTrigger>
        </TabsList>
        <TabsContent value="gas">
          <HydraulicSizingCalculator lineType="gas" />
        </TabsContent>
        <TabsContent value="liquid">
          <HydraulicSizingCalculator lineType="liquid" />
        </TabsContent>
        <TabsContent value="mixed">
          <HydraulicSizingCalculator lineType="mixed" />
        </TabsContent>
      </Tabs>
    </CalculatorPageWrapper>
  );
};

export default HydraulicSizingPage;
