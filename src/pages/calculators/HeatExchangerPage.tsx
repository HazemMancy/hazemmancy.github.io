import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import HeatExchangerSizing from "@/components/calculators/HeatExchangerSizing";
import { Thermometer } from "lucide-react";

const HeatExchangerPage = () => {

  return (
    <CalculatorPageWrapper
      title="Heat Exchanger Thermal Design & Rating"
      icon={<Thermometer className="h-5 w-5" />}
      description="Professional-grade calculator for Shell & Tube Heat Exchangers. Features TEMA-style thermal design, Bell-Delaware hydraulic rating, and ASME VIII mechanical checks. Includes HTRI-compatible export and vibration analysis."
    >
      <HeatExchangerSizing />
    </CalculatorPageWrapper>
  );
};

export default HeatExchangerPage;
