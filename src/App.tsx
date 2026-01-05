import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Index = lazy(() => import("./pages/Index"));
const Calculators = lazy(() => import("./pages/Calculators"));
const GasFlowConverterPage = lazy(() => import("./pages/calculators/GasFlowConverterPage"));
const HydraulicSizingPage = lazy(() => import("./pages/calculators/HydraulicSizingPage"));
const HeatExchangerPage = lazy(() => import("./pages/calculators/HeatExchangerPage"));
const PumpSizingPage = lazy(() => import("./pages/calculators/PumpSizingPage"));
const CompressorPowerPage = lazy(() => import("./pages/calculators/CompressorPowerPage"));
const GasMixingPage = lazy(() => import("./pages/calculators/GasMixingPage"));
const API2000Page = lazy(() => import("./pages/calculators/API2000Page"));
const API520Page = lazy(() => import("./pages/calculators/API520Page"));
const ReynoldsFrictionPage = lazy(() => import("./pages/calculators/ReynoldsFrictionPage"));
const PipingComponentsPage = lazy(() => import("./pages/calculators/PipingComponentsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/calculators/gas-flow-converter" element={<GasFlowConverterPage />} />
            <Route path="/calculators/hydraulic-sizing" element={<HydraulicSizingPage />} />
            <Route path="/calculators/heat-exchanger" element={<HeatExchangerPage />} />
            <Route path="/calculators/pump-sizing" element={<PumpSizingPage />} />
            <Route path="/calculators/compressor-power" element={<CompressorPowerPage />} />
            <Route path="/calculators/gas-mixing" element={<GasMixingPage />} />
            <Route path="/calculators/api-2000" element={<API2000Page />} />
            <Route path="/calculators/api-520" element={<API520Page />} />
            <Route path="/calculators/reynolds-friction" element={<ReynoldsFrictionPage />} />
            <Route path="/calculators/piping-components" element={<PipingComponentsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
