import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import PumpSizingCalculator from "@/components/calculators/PumpSizingCalculator";
import { Droplet } from "lucide-react";

const PumpSizingPage = () => {
  return (
    <CalculatorPageWrapper
      title="Pump Sizing"
      icon={<Droplet className="h-5 w-5" />}
      description="Calculate TDH, NPSHa, brake power per API 610/674/676 with Darcy-Weisbach friction, K-factor fittings, and pump selection guidance."
    >
      <PumpSizingCalculator />
    </CalculatorPageWrapper>
  );
};

export default PumpSizingPage;
