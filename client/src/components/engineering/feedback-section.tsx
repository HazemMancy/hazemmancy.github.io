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
import { MessageSquare, Send, CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface FeedbackSectionProps {
  calculatorName: string;
}

const FORMSUBMIT_URL = "https://formsubmit.co/ajax/mancy.hazem@gmail.com";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function FeedbackSection({ calculatorName }: FeedbackSectionProps) {
  const [feedbackType, setFeedbackType] = useState("bug");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nameValid = name.trim().length >= 2;
  const emailValid = EMAIL_REGEX.test(email.trim());
  const messageValid = message.trim().length > 0;
  const formValid = nameValid && emailValid && messageValid;

  const handleSubmit = async () => {
    setTouched({ name: true, email: true, message: true });
    if (!formValid) return;

    const typeLabel =
      feedbackType === "bug"
        ? "Bug Report"
        : feedbackType === "suggestion"
          ? "Suggestion"
          : feedbackType === "equation"
            ? "Equation Issue"
            : "General Feedback";

    setStatus("sending");

    try {
      const response = await fetch(FORMSUBMIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: `[${typeLabel}] ${calculatorName} Calculator`,
          calculator: calculatorName,
          feedbackType: typeLabel,
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          _template: "table",
        }),
      });

      if (response.ok) {
        setStatus("success");
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
          setName("");
          setEmail("");
          setFeedbackType("bug");
          setTouched({});
        }, 5000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
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

          {status === "success" ? (
            <div
              className="flex items-center gap-3 py-6 justify-center text-green-400"
              data-testid="feedback-success"
            >
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Thank you! Your feedback has been sent successfully.
              </span>
            </div>
          ) : status === "error" ? (
            <div
              className="flex items-center gap-3 py-6 justify-center text-red-400"
              data-testid="feedback-error"
            >
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                Something went wrong. Please try again.
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
                    Your Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                    placeholder="Your name"
                    data-testid="feedback-input-name"
                  />
                  {touched.name && !nameValid && (
                    <p className="text-xs text-red-400 mt-1" data-testid="feedback-error-name">
                      Name is required (min 2 characters)
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">
                  Your Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  placeholder="your@email.com"
                  data-testid="feedback-input-email"
                />
                {touched.email && !emailValid && (
                  <p className="text-xs text-red-400 mt-1" data-testid="feedback-error-email">
                    Please enter a valid email address
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">
                  Message <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, message: true }))}
                  placeholder="Describe the issue or your suggestion..."
                  rows={4}
                  data-testid="feedback-input-message"
                />
                {touched.message && !messageValid && (
                  <p className="text-xs text-red-400 mt-1" data-testid="feedback-error-message">
                    Message is required
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={status === "sending"}
                className="w-full sm:w-auto"
                data-testid="feedback-button-submit"
              >
                {status === "sending" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {status === "sending" ? "Sending..." : "Send Feedback"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
