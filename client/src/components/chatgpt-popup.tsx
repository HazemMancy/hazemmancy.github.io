import { useCallback, useEffect, useRef } from "react";
import { Bot } from "lucide-react";
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
  };
}

export function ChatGPTPopupButton({ currentPath }: { currentPath: string }) {
  const gpt = getGPTForPath(currentPath);
  const sideWindowRef = useRef<Window | null>(null);

  const openSideWindow = useCallback(() => {
    if (sideWindowRef.current && !sideWindowRef.current.closed) {
      sideWindowRef.current.focus();
      return;
    }

    const screenW = window.screen.availWidth;
    const screenH = window.screen.availHeight;
    const popupW = Math.min(500, Math.floor(screenW * 0.35));
    const popupH = screenH;
    const left = screenW - popupW;
    const top = 0;

    sideWindowRef.current = window.open(
      gpt.url,
      "ai_expert_chat",
      `width=${popupW},height=${popupH},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no,location=yes`
    );
  }, [gpt.url]);

  useEffect(() => {
    window.addEventListener("open-ai-chat-panel", openSideWindow);
    return () => window.removeEventListener("open-ai-chat-panel", openSideWindow);
  }, [openSideWindow]);

  return (
    <div className="fixed bottom-6 left-6 z-50" data-testid="ai-chat-fab-container">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={openSideWindow}
            size="lg"
            className="rounded-full shadow-xl w-14 h-14 p-0 transition-all duration-200 bg-primary/90 hover:bg-primary"
            data-testid="button-open-ai-chat"
          >
            <Bot className="w-7 h-7 text-primary-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px]">
          <p className="text-xs">{gpt.name}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
