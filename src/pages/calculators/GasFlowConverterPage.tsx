import { useState } from "react";
import CalculatorPageWrapper from '@/components/calculators/CalculatorPageWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Calculator } from "lucide-react";
import GasFlowConverter from "@/components/calculators/GasFlowConverter";
import GasFlowGuide from "@/components/calculators/guides/GasFlowGuide";

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
