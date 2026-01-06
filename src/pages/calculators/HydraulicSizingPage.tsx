import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import HydraulicSizingCalculator from "@/components/calculators/HydraulicSizingCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HydraulicSizingPage = () => {
  return (
    <CalculatorPageWrapper
      title="Hydraulic Sizing"
      description="Calculate line sizing for gas, liquid, and mixed-phase systems per Best Practice Sizing Criteria as per API RP 14E and Darcy-Weisbach equation."
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
