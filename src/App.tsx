import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Calculators from "./pages/Calculators";
import GasFlowConverterPage from "./pages/calculators/GasFlowConverterPage";
import HydraulicSizingPage from "./pages/calculators/HydraulicSizingPage";
import HeatExchangerPage from "./pages/calculators/HeatExchangerPage";
import PumpSizingPage from "./pages/calculators/PumpSizingPage";
import CompressorPowerPage from "./pages/calculators/CompressorPowerPage";
import GasMixingPage from "./pages/calculators/GasMixingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/calculators/gas-flow-converter" element={<GasFlowConverterPage />} />
          <Route path="/calculators/hydraulic-sizing" element={<HydraulicSizingPage />} />
          <Route path="/calculators/heat-exchanger" element={<HeatExchangerPage />} />
          <Route path="/calculators/pump-sizing" element={<PumpSizingPage />} />
          <Route path="/calculators/compressor-power" element={<CompressorPowerPage />} />
          <Route path="/calculators/gas-mixing" element={<GasMixingPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
