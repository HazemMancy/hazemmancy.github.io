import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import CompressorPowerCalculator from '@/components/calculators/CompressorPowerCalculator';

export default function CompressorPowerPage() {
  return (
    <CalculatorPageWrapper 
      title="Compressor Power"
      description="Calculate compressor power, discharge temperature, and multi-stage compression per API 617 / ASME PTC 10 standards with gas properties and performance curves."
    >
      <CompressorPowerCalculator />
    </CalculatorPageWrapper>
  );
}
