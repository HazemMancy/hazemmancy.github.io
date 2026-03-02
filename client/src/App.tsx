import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatGPTPopupButton } from "@/components/chatgpt-popup";
import Home from "@/pages/home";
import GasLineSizingPage from "@/pages/calculators/gas-line-sizing";
import LiquidLineSizingPage from "@/pages/calculators/liquid-line-sizing";
import MultiphaseLinePage from "@/pages/calculators/multiphase-line";
import GasMixingPage from "@/pages/calculators/gas-mixing";
import GasVolumePage from "@/pages/calculators/gas-volume";
import PumpSizingPage from "@/pages/calculators/pump-sizing";
import RestrictionOrificePage from "@/pages/calculators/restriction-orifice";
import ControlValvePage from "@/pages/calculators/control-valve";
import ConventionalSeparatorPage from "@/pages/calculators/conventional-separator";
import TwoPhaseSeparatorPage from "@/pages/calculators/two-phase-separator";
import SeparatorSizingPage from "@/pages/calculators/separator-sizing";
import FlareKODrumPage from "@/pages/calculators/flare-ko-drum";
import HeatExchangerPage from "@/pages/calculators/heat-exchanger";
import PSVSizingPage from "@/pages/calculators/psv-sizing";
import ThermalReliefPage from "@/pages/calculators/thermal-relief";
import CompressorPage from "@/pages/calculators/compressor";
import TankVentingPage from "@/pages/calculators/tank-venting";
import CalculatorsIndexPage from "@/pages/calculators/index";
import PipingComponentsIndex from "@/pages/calculators/piping-components/index";
import PipePage from "@/pages/calculators/piping-components/pipe";
import FlangesPage from "@/pages/calculators/piping-components/flanges";
import FittingsPage from "@/pages/calculators/piping-components/fittings";
import GasketsPage from "@/pages/calculators/piping-components/gaskets";
import ValvesPage from "@/pages/calculators/piping-components/valves";
import LineBlanksPage from "@/pages/calculators/piping-components/line-blanks";
import OletsPage from "@/pages/calculators/piping-components/olets";
import PipeFlexibilityPage from "@/pages/calculators/piping-components/pipe-flexibility";
import SafeSpansPage from "@/pages/calculators/piping-components/safe-spans";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/calculators" component={CalculatorsIndexPage} />
      <Route path="/calculators/gas-line-sizing" component={GasLineSizingPage} />
      <Route path="/calculators/liquid-line-sizing" component={LiquidLineSizingPage} />
      <Route path="/calculators/multiphase-line" component={MultiphaseLinePage} />
      <Route path="/calculators/gas-mixing" component={GasMixingPage} />
      <Route path="/calculators/gas-volume" component={GasVolumePage} />
      <Route path="/calculators/pump-sizing" component={PumpSizingPage} />
      <Route path="/calculators/restriction-orifice" component={RestrictionOrificePage} />
      <Route path="/calculators/control-valve" component={ControlValvePage} />
      <Route path="/calculators/separator-sizing" component={SeparatorSizingPage} />
      <Route path="/calculators/conventional-separator" component={ConventionalSeparatorPage} />
      <Route path="/calculators/two-phase-separator" component={TwoPhaseSeparatorPage} />
      <Route path="/calculators/flare-ko-drum" component={FlareKODrumPage} />
      <Route path="/calculators/heat-exchanger" component={HeatExchangerPage} />
      <Route path="/calculators/psv-sizing" component={PSVSizingPage} />
      <Route path="/calculators/thermal-relief" component={ThermalReliefPage} />
      <Route path="/calculators/compressor" component={CompressorPage} />
      <Route path="/calculators/tank-venting" component={TankVentingPage} />
      <Route path="/calculators/piping-components" component={PipingComponentsIndex} />
      <Route path="/calculators/piping-components/pipe" component={PipePage} />
      <Route path="/calculators/piping-components/flanges" component={FlangesPage} />
      <Route path="/calculators/piping-components/fittings" component={FittingsPage} />
      <Route path="/calculators/piping-components/gaskets" component={GasketsPage} />
      <Route path="/calculators/piping-components/valves" component={ValvesPage} />
      <Route path="/calculators/piping-components/line-blanks" component={LineBlanksPage} />
      <Route path="/calculators/piping-components/olets" component={OletsPage} />
      <Route path="/calculators/piping-components/pipe-flexibility" component={PipeFlexibilityPage} />
      <Route path="/calculators/piping-components/safe-spans" component={SafeSpansPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ChatGPTOverlay() {
  const [location] = useLocation();
  const isCalculatorPage = location.startsWith("/calculators");
  if (!isCalculatorPage) return null;
  return <ChatGPTPopupButton currentPath={location} />;
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
          <ChatGPTOverlay />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
