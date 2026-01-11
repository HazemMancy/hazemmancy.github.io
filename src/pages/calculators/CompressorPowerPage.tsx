import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import CompressorPowerCalculator from '@/components/calculators/CompressorPowerCalculator';
import { Fan } from "lucide-react";

export default function CompressorPowerPage() {
  return (
    <CalculatorPageWrapper
      title="Compressor Power"
      icon={<Fan className="h-5 w-5" />}
      description="Calculate compressor power, discharge temperature, and multi-stage compression per API 617 (Centrifugal/Axial), API 618 (Reciprocating), and ASME PTC 10 with Schultz polytropic analysis and real gas effects."
    >
      <CompressorPowerCalculator />
    </CalculatorPageWrapper>
  );
}
