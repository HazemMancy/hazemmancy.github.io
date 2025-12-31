import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import { API2000Calculator } from "@/components/calculators/API2000Calculator";

export default function API2000Page() {
  return (
    <CalculatorPageWrapper 
      title="API 2000 Tank Venting"
      description="Calculate atmospheric and low-pressure storage tank venting requirements per API Standard 2000. Includes thermal breathing, emergency venting for fire exposure, pump in/out, and valve sizing."
    >
      <API2000Calculator />
    </CalculatorPageWrapper>
  );
}
