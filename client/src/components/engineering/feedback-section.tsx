import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, CheckCircle } from "lucide-react";

interface FeedbackSectionProps {
  calculatorName: string;
}

const RECIPIENT = "mancy.hazem@gmail.com";

export function FeedbackSection({ calculatorName }: FeedbackSectionProps) {
  const [feedbackType, setFeedbackType] = useState("bug");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) return;

    const typeLabel =
      feedbackType === "bug"
        ? "Bug Report"
        : feedbackType === "suggestion"
          ? "Suggestion"
          : feedbackType === "equation"
            ? "Equation Issue"
            : "General Feedback";

    const subject = encodeURIComponent(
      `[${typeLabel}] ${calculatorName} Calculator`
    );

    const bodyParts = [
      `Calculator: ${calculatorName}`,
      `Feedback Type: ${typeLabel}`,
      "",
      message.trim(),
    ];

    if (name.trim()) {
      bodyParts.push("", `From: ${name.trim()}`);
    }
    if (email.trim()) {
      bodyParts.push(`Reply-to: ${email.trim()}`);
    }

    const body = encodeURIComponent(bodyParts.join("\n"));

    window.open(`mailto:${RECIPIENT}?subject=${subject}&body=${body}`, "_self");

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage("");
      setFeedbackType("bug");
    }, 4000);
  };

  return (
    <div className="mt-8" data-testid="feedback-section">
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Feedback</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Found a problem or have a suggestion for this calculator? Let me
            know — your feedback helps improve accuracy and usability.
          </p>

          {submitted ? (
            <div
              className="flex items-center gap-3 py-6 justify-center text-green-400"
              data-testid="feedback-success"
            >
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Thank you! Your email client should open with the feedback
                pre-filled.
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Feedback Type
                  </Label>
                  <Select
                    value={feedbackType}
                    onValueChange={setFeedbackType}
                  >
                    <SelectTrigger data-testid="feedback-select-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug" data-testid="feedback-type-bug">Bug / Error</SelectItem>
                      <SelectItem value="equation" data-testid="feedback-type-equation">
                        Equation / Calculation Issue
                      </SelectItem>
                      <SelectItem value="suggestion" data-testid="feedback-type-suggestion">Suggestion</SelectItem>
                      <SelectItem value="general" data-testid="feedback-type-general">General Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Your Name (optional)
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    data-testid="feedback-input-name"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">
                  Your Email (optional)
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  data-testid="feedback-input-email"
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue or your suggestion..."
                  rows={4}
                  data-testid="feedback-input-message"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!message.trim()}
                className="w-full sm:w-auto"
                data-testid="feedback-button-submit"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Feedback
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
