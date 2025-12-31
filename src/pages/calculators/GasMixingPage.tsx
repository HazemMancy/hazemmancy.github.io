import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import { GasMixingCalculator } from "@/components/calculators/GasMixingCalculator";

export default function GasMixingPage() {
  return (
    <CalculatorPageWrapper 
      title="Gas Mixing Properties"
      description="Calculate mixture molecular weight, specific heat ratio (k), compressibility factor (Z), and other thermodynamic properties from gas compositions using Kay's mixing rules and Peng-Robinson EOS."
    >
      <GasMixingCalculator />
    </CalculatorPageWrapper>
  );
}
