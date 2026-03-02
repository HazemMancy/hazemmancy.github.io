import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

interface AiChatButtonProps {
  variant?: "relief" | "general";
  className?: string;
}

export function AiChatButton({ variant = "general", className }: AiChatButtonProps) {
  const label = variant === "relief" ? "AI Relief Expert" : "AI Process Expert";

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-ai-chat-panel"));
  };

  return (
    <Button
      size="sm"
      className={`bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-colors ${className ?? ""}`}
      data-testid="button-ai-chat"
      onClick={handleClick}
    >
      <Bot className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
