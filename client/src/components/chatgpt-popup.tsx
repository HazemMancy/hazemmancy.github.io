import { useState, useCallback, useEffect } from "react";
import { X, Bot, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GENERAL_GPT_URL = "https://chatgpt.com/g/g-699d8718c1ec8191a7e297e02a25f2c3-process-design-engineer-oil-gas";
const RELIEF_GPT_URL = "https://chatgpt.com/g/g-695b78c57120819188a543ca23154846-relief-and-flare-systems-api-520-521-526";

const RELIEF_PATHS = new Set(["/calculators/psv-sizing", "/calculators/thermal-relief"]);

function getGPTForPath(pathname: string) {
  const isRelief = RELIEF_PATHS.has(pathname);
  return {
    url: isRelief ? RELIEF_GPT_URL : GENERAL_GPT_URL,
    name: isRelief ? "AI Relief Expert" : "AI Process Expert",
    description: isRelief
      ? "Custom GPT specialized in API 520, 521 & 526 for pressure relief device and flare system engineering."
      : "Custom GPT for process design, equipment sizing, and Oil & Gas engineering calculations.",
    isRelief,
  };
}

export function ChatGPTPopupButton({ currentPath }: { currentPath: string }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const gpt = getGPTForPath(currentPath);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener("open-ai-chat-panel", openPanel);
    return () => window.removeEventListener("open-ai-chat-panel", openPanel);
  }, [openPanel]);

  return (
    <>
      <div
        className={`fixed top-0 right-0 h-full z-[60] transition-transform duration-300 ease-in-out ${
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "min(480px, 90vw)" }}
        data-testid="ai-chat-panel"
      >
        <div className="h-full flex flex-col bg-background border-l border-primary/20 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{gpt.name}</span>
              <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">
                Custom GPT
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(gpt.url, "_blank", "noopener,noreferrer")}
                    data-testid="button-ai-open-tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Open in new tab</p></TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={togglePanel}
                data-testid="button-close-ai-panel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <iframe
            src={gpt.url}
            className="flex-1 w-full border-0"
            title={gpt.name}
            allow="clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            data-testid="ai-chat-iframe"
          />
        </div>
      </div>

      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[55] backdrop-blur-[2px]"
          onClick={togglePanel}
          data-testid="ai-chat-overlay"
        />
      )}

      <div className="fixed bottom-6 left-6 z-50" data-testid="ai-chat-fab-container">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={togglePanel}
              size="lg"
              className={`rounded-full shadow-xl w-14 h-14 p-0 transition-all duration-200 
                ${isPanelOpen
                  ? "bg-primary hover:bg-primary/90 ring-2 ring-primary/40"
                  : "bg-primary/90 hover:bg-primary"
                }`}
              data-testid="button-open-ai-chat"
            >
              {isPanelOpen
                ? <X className="w-6 h-6 text-primary-foreground" />
                : <Bot className="w-7 h-7 text-primary-foreground" />
              }
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px]">
            <p className="text-xs">
              {isPanelOpen ? `Close ${gpt.name}` : `Open ${gpt.name}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
