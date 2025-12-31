import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import API520Calculator from '@/components/calculators/API520Calculator';

export default function API520Page() {
  return (
    <CalculatorPageWrapper 
      title="API 520/521 Relief Valve"
      description="Size pressure relief valves per API 520/521 for vapor, liquid, two-phase, steam, and fire cases with orifice selection (D-T) and inlet/outlet piping verification."
    >
      <API520Calculator />
    </CalculatorPageWrapper>
  );
}
