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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
