import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import ReynoldsFrictionCalculator from '@/components/calculators/ReynoldsFrictionCalculator';

export default function ReynoldsFrictionPage() {
  return (
    <CalculatorPageWrapper 
      title="Reynolds Number & Friction"
      description="Calculate Reynolds number, determine flow regime, and compute friction factor using Colebrook-White (iterative), Swamee-Jain, and Haaland correlations."
    >
      <ReynoldsFrictionCalculator />
    </CalculatorPageWrapper>
  );
}
