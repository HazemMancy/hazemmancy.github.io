import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import PipingComponentsCalculator from "@/components/calculators/PipingComponentsCalculator";

export default function PipingComponentsPage() {
  return (
    <CalculatorPageWrapper 
      title="Piping Components"
      description="ASME B36.10M dimensional data for flanges, fittings, gaskets, valves, olets, blanks, flexibility & safe spans per industry standards."
    >
      <PipingComponentsCalculator />
    </CalculatorPageWrapper>
  );
}
