import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Home from "@/pages/home";
import GasLineSizingPage from "@/pages/calculators/gas-line-sizing";
import LiquidLineSizingPage from "@/pages/calculators/liquid-line-sizing";
import MultiphaseLinePage from "@/pages/calculators/multiphase-line";
import GasMixingPage from "@/pages/calculators/gas-mixing";
import GasVolumePage from "@/pages/calculators/gas-volume";
import PumpSizingPage from "@/pages/calculators/pump-sizing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/calculators/gas-line-sizing" component={GasLineSizingPage} />
      <Route path="/calculators/liquid-line-sizing" component={LiquidLineSizingPage} />
      <Route path="/calculators/multiphase-line" component={MultiphaseLinePage} />
      <Route path="/calculators/gas-mixing" component={GasMixingPage} />
      <Route path="/calculators/gas-volume" component={GasVolumePage} />
      <Route path="/calculators/pump-sizing" component={PumpSizingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Navbar />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
