import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import HeatExchangerSizing from "@/components/calculators/HeatExchangerSizing";

const HeatExchangerPage = () => {
  return (
    <CalculatorPageWrapper 
      title="Heat Exchanger Sizing"
      description="Design and rate shell & tube heat exchangers with LMTD and effectiveness-NTU methods per TEMA standards."
    >
      <HeatExchangerSizing />
    </CalculatorPageWrapper>
  );
};

export default HeatExchangerPage;
