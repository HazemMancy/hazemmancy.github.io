import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import CompressorPowerCalculator from '@/components/calculators/CompressorPowerCalculator';

export default function CompressorPowerPage() {
  return (
    <CalculatorPageWrapper 
      title="Compressor Power"
      description="Calculate compressor power, discharge temperature, and multi-stage compression per API 617 (Centrifugal/Axial), API 618 (Reciprocating), and ASME PTC 10 with Schultz polytropic analysis and real gas effects."
    >
      <CompressorPowerCalculator />
    </CalculatorPageWrapper>
  );
}
