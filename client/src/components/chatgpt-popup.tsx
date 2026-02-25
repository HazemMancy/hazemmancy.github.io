import { useState, useCallback } from "react";
import { X, ExternalLink, Flame, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GPTConfig {
  url: string;
  name: string;
  description: string;
  isCustom: boolean;
}

const CUSTOM_GPTS: Record<string, GPTConfig> = {
  "/calculators/psv-sizing": {
    url: "https://chatgpt.com/g/g-695b78c57120819188a543ca23154846-relief-and-flare-systems-api-520-521-526",
    name: "Relief & Flare Systems",
    description: "Custom GPT specialized in API 520, 521, and 526 standards for pressure relief device and flare system engineering.",
    isCustom: true,
  },
};

const DEFAULT_GPT: GPTConfig = {
  url: "https://chatgpt.com",
  name: "ChatGPT",
  description: "Open ChatGPT to ask questions about your calculations, engineering standards, or process design.",
  isCustom: false,
};

function ChatGPTLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

function getGPTConfig(pathname: string): GPTConfig {
  return CUSTOM_GPTS[pathname] || DEFAULT_GPT;
}

export function ChatGPTPopupButton({ currentPath }: { currentPath: string }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const gpt = getGPTConfig(currentPath);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const openChatGPT = useCallback(() => {
    window.open(gpt.url, "_blank", "noopener,noreferrer");
  }, [gpt.url]);

  const openInCompanionWindow = useCallback(() => {
    const screenW = window.screen.availWidth;
    const screenH = window.screen.availHeight;
    const popupW = Math.min(480, Math.floor(screenW * 0.35));
    const popupH = Math.min(screenH - 80, 900);
    const left = 20;
    const top = Math.floor((screenH - popupH) / 2);

    window.open(
      gpt.url,
      "chatgpt_assistant",
      `width=${popupW},height=${popupH},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no,location=yes`
    );
  }, [gpt.url]);

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full z-[60] transition-transform duration-300 ease-in-out ${
          isPanelOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "min(420px, 85vw)" }}
        data-testid="chatgpt-panel"
      >
        <div className="h-full flex flex-col bg-[#212121] border-r border-white/10 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#171717]">
            <div className="flex items-center gap-2">
              <ChatGPTLogo className="w-5 h-5 text-[#10a37f]" />
              <span className="text-sm font-medium text-white">{gpt.name}</span>
              {gpt.isCustom && (
                <span className="text-[10px] bg-[#10a37f]/20 text-[#10a37f] px-1.5 py-0.5 rounded font-medium">
                  Custom GPT
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
              onClick={togglePanel}
              data-testid="button-close-chatgpt-panel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-[#10a37f]/10 flex items-center justify-center">
                <ChatGPTLogo className="w-10 h-10 text-[#10a37f]" />
              </div>
              {gpt.isCustom && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-[#212121]">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{gpt.name}</h3>
              <p className="text-sm text-white/60 leading-relaxed max-w-[300px]">
                {gpt.description}
              </p>
            </div>

            {gpt.isCustom && (
              <div className="w-full max-w-[300px] bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-white/80">Specialized for this calculator</span>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  This custom GPT is trained on API 520, 521, and 526 standards — ideal for PRD sizing, relief scenarios, and flare system design questions.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full max-w-[280px] mt-2">
              <Button
                onClick={openChatGPT}
                className="bg-[#10a37f] hover:bg-[#0d8c6d] text-white gap-2 h-11"
                data-testid="button-chatgpt-open-tab"
              >
                <ChatGPTLogo className="w-4.5 h-4.5" />
                Open in New Tab
              </Button>
              <Button
                onClick={openInCompanionWindow}
                variant="outline"
                className="border-white/20 text-white/80 hover:text-white hover:bg-white/10 gap-2 h-10"
                data-testid="button-chatgpt-companion"
              >
                <ExternalLink className="w-4 h-4" />
                Open Side-by-Side Window
              </Button>
            </div>

            <p className="text-[11px] text-white/30 leading-relaxed mt-4 max-w-[280px]">
              Sign in with your ChatGPT account. Your conversations are private and managed by OpenAI.
            </p>
          </div>
        </div>
      </div>

      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[55] backdrop-blur-[2px]"
          onClick={togglePanel}
          data-testid="chatgpt-overlay"
        />
      )}

      <div className="fixed bottom-6 left-6 z-50" data-testid="chatgpt-popup-container">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={togglePanel}
              size="lg"
              className={`rounded-full shadow-xl w-14 h-14 p-0 transition-all duration-200 group ${
                isPanelOpen
                  ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/40"
                  : "bg-[#10a37f] hover:bg-[#0d8c6d]"
              }`}
              data-testid="button-open-chatgpt"
            >
              <ChatGPTLogo className="w-7 h-7 text-white" />
              {gpt.isCustom && !isPanelOpen && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 border-2 border-background flex items-center justify-center">
                  <Flame className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px]">
            <p className="text-xs">
              {isPanelOpen
                ? "Close ChatGPT panel"
                : gpt.isCustom
                  ? `Open ${gpt.name} — custom GPT for this calculator`
                  : "Open ChatGPT — chat alongside your calculations"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
