import { useState, useCallback } from "react";
import { MessageSquare, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CHATGPT_URL = "https://chatgpt.com";

export function ChatGPTPopupButton() {
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openChatGPT = useCallback(() => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
      return;
    }

    const screenW = window.screen.availWidth;
    const screenH = window.screen.availHeight;
    const popupW = Math.min(480, Math.floor(screenW * 0.35));
    const popupH = Math.min(screenH - 80, 900);
    const left = 20;
    const top = Math.floor((screenH - popupH) / 2);

    const win = window.open(
      CHATGPT_URL,
      "chatgpt_assistant",
      `width=${popupW},height=${popupH},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no,location=yes`
    );

    if (win) {
      setPopupWindow(win);
      setIsOpen(true);

      const interval = setInterval(() => {
        if (win.closed) {
          setPopupWindow(null);
          setIsOpen(false);
          clearInterval(interval);
        }
      }, 1000);
    }
  }, [popupWindow]);

  const closeChatGPT = useCallback(() => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
    }
    setPopupWindow(null);
    setIsOpen(false);
  }, [popupWindow]);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2" data-testid="chatgpt-popup-container">
      {isOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={closeChatGPT}
          className="rounded-full shadow-lg border-red-500/30 hover:border-red-500/60 bg-background/95 backdrop-blur-sm text-xs gap-1.5"
          data-testid="button-close-chatgpt"
        >
          <X className="w-3.5 h-3.5" />
          Close ChatGPT
        </Button>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={openChatGPT}
            size="lg"
            className={`rounded-full shadow-xl w-14 h-14 p-0 transition-all duration-200 ${
              isOpen
                ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/40"
                : "bg-[#10a37f] hover:bg-[#0d8c6d]"
            }`}
            data-testid="button-open-chatgpt"
          >
            {isOpen ? (
              <ExternalLink className="w-6 h-6 text-white" />
            ) : (
              <MessageSquare className="w-6 h-6 text-white" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="text-xs">
            {isOpen ? "Focus ChatGPT window" : "Open ChatGPT — sign in to your account and chat alongside your calculations"}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
