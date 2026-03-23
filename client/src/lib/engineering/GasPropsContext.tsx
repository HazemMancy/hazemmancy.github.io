import { createContext, useContext, useState, type ReactNode } from "react";
import { type GasPropsMode, DEFAULT_EOS_COMPOSITION } from "./eosGasProps";
import type { CompositionEntry } from "./srkEos";

interface GasPropsContextValue {
  gasPropsMode: GasPropsMode;
  setGasPropsMode: (mode: GasPropsMode) => void;
  gasComposition: CompositionEntry[];
  setGasComposition: (comp: CompositionEntry[]) => void;
}

const GasPropsContext = createContext<GasPropsContextValue | null>(null);

export function GasPropsProvider({ children }: { children: ReactNode }) {
  const [gasPropsMode, setGasPropsMode] = useState<GasPropsMode>("manual");
  const [gasComposition, setGasComposition] = useState<CompositionEntry[]>(
    DEFAULT_EOS_COMPOSITION.map(e => ({ ...e }))
  );

  return (
    <GasPropsContext.Provider value={{ gasPropsMode, setGasPropsMode, gasComposition, setGasComposition }}>
      {children}
    </GasPropsContext.Provider>
  );
}

export function useGasProps(): GasPropsContextValue {
  const ctx = useContext(GasPropsContext);
  if (!ctx) throw new Error("useGasProps must be used inside <GasPropsProvider>");
  return ctx;
}
