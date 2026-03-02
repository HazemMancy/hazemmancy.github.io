import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

const GENERAL_GPT_URL = "https://chatgpt.com/g/g-699d8718c1ec8191a7e297e02a25f2c3-process-design-engineer-oil-gas";
const RELIEF_GPT_URL = "https://chatgpt.com/g/g-695b78c57120819188a543ca23154846-relief-and-flare-systems-api-520-521-526";

interface AiChatButtonProps {
  variant?: "relief" | "general";
  className?: string;
}

export function AiChatButton({ variant = "general", className }: AiChatButtonProps) {
  const url = variant === "relief" ? RELIEF_GPT_URL : GENERAL_GPT_URL;
  const label = variant === "relief" ? "AI Relief Expert" : "AI Process Expert";

  return (
    <Button
      size="sm"
      className={`bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-colors ${className ?? ""}`}
      data-testid="button-ai-chat"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
    >
      <Bot className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
