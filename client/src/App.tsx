import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatGPTPopupButton } from "@/components/chatgpt-popup";
import { GasPropsProvider } from "@/lib/engineering/GasPropsContext";

const Home = lazy(() => import("@/pages/home"));
const CalculatorsIndexPage = lazy(() => import("@/pages/calculators/index"));
const GasLineSizingPage = lazy(() => import("@/pages/calculators/gas-line-sizing"));
const LiquidLineSizingPage = lazy(() => import("@/pages/calculators/liquid-line-sizing"));
const MultiphaseLinePage = lazy(() => import("@/pages/calculators/multiphase-line"));
const GasMixingPage = lazy(() => import("@/pages/calculators/gas-mixing"));
const GasVolumePage = lazy(() => import("@/pages/calculators/gas-volume"));
const PumpSizingPage = lazy(() => import("@/pages/calculators/pump-sizing"));
const RestrictionOrificePage = lazy(() => import("@/pages/calculators/restriction-orifice"));
const ControlValvePage = lazy(() => import("@/pages/calculators/control-valve"));
const SeparatorSizingPage = lazy(() => import("@/pages/calculators/separator-sizing"));
const ConventionalSeparatorPage = lazy(() => import("@/pages/calculators/conventional-separator"));
const TwoPhaseSeparatorPage = lazy(() => import("@/pages/calculators/two-phase-separator"));
const FlareKODrumPage = lazy(() => import("@/pages/calculators/flare-ko-drum"));
const HeatExchangerPage = lazy(() => import("@/pages/calculators/heat-exchanger"));
const PSVSizingPage = lazy(() => import("@/pages/calculators/psv-sizing"));
const ThermalReliefPage = lazy(() => import("@/pages/calculators/thermal-relief"));
const CompressorPage = lazy(() => import("@/pages/calculators/compressor"));
const TankVentingPage = lazy(() => import("@/pages/calculators/tank-venting"));
const PipingComponentsIndex = lazy(() => import("@/pages/calculators/piping-components/index"));
const PipePage = lazy(() => import("@/pages/calculators/piping-components/pipe"));
const FlangesPage = lazy(() => import("@/pages/calculators/piping-components/flanges"));
const FittingsPage = lazy(() => import("@/pages/calculators/piping-components/fittings"));
const GasketsPage = lazy(() => import("@/pages/calculators/piping-components/gaskets"));
const ValvesPage = lazy(() => import("@/pages/calculators/piping-components/valves"));
const LineBlanksPage = lazy(() => import("@/pages/calculators/piping-components/line-blanks"));
const OletsPage = lazy(() => import("@/pages/calculators/piping-components/olets"));
const PipeFlexibilityPage = lazy(() => import("@/pages/calculators/piping-components/pipe-flexibility"));
const SafeSpansPage = lazy(() => import("@/pages/calculators/piping-components/safe-spans"));
const PipeWallThicknessPage = lazy(() => import("@/pages/calculators/pipe-wall-thickness"));
const EngineeringBasisPage = lazy(() => import("@/pages/engineering-basis"));
const NotFound = lazy(() => import("@/pages/not-found"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
        <Route path="/calculators/pipe-wall-thickness" component={PipeWallThicknessPage} />
        <Route path="/engineering-basis" component={EngineeringBasisPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
    <TooltipProvider>
      <ThemeProvider>
        <GasPropsProvider>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Navbar />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
          </div>
          <ChatGPTOverlay />
          <Toaster />
        </GasPropsProvider>
      </ThemeProvider>
    </TooltipProvider>
  );
}

export default App;
