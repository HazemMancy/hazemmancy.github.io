import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import PumpSizingCalculator from "@/components/calculators/PumpSizingCalculator";

const PumpSizingPage = () => {
  return (
    <CalculatorPageWrapper 
      title="Pump Sizing"
      description="Calculate TDH, NPSHa, brake power per API 610/674/676 with Darcy-Weisbach friction, K-factor fittings, and pump selection guidance."
    >
      <PumpSizingCalculator />
    </CalculatorPageWrapper>
  );
};

export default PumpSizingPage;
