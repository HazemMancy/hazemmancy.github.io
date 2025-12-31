import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import GasFlowConverter from "@/components/calculators/GasFlowConverter";

export default function GasFlowConverterPage() {
  return (
    <CalculatorPageWrapper 
      title="Gas Volume Converter"
      description="Convert between SCFM, ACFM, MMSCFD, Nm³/h, Sm³/h, and actual cubic meter rates. Standard units have locked reference conditions per industry standards."
    >
      <GasFlowConverter />
    </CalculatorPageWrapper>
  );
}
