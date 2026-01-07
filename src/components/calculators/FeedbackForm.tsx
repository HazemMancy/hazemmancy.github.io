import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2, Send } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner"; // Assuming sonner is used based on package.json

const FeedbackForm = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Add required FormSubmit fields for AJAX
        const submitData = {
            ...data,
            _subject: "Calculator Feedback Submission",
            _captcha: "false",
            _template: "table"
        };

        try {
            const response = await fetch("https://formsubmit.co/ajax/mancyhazem@gmail.com", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(submitData)
            });

            if (response.ok) {
                toast.success("Feedback sent successfully!", {
                    description: "Thank you for helping us improve."
                });
                (e.target as HTMLFormElement).reset();
            } else {
                throw new Error("Submission failed");
            }
        } catch (error) {
            console.error("Feedback error:", error);
            toast.error("Failed to send feedback", {
                description: "Please try again later."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border border-primary/20 bg-primary/5 mt-12 mb-8">
            <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-8 items-start">
                    <div className="space-y-2 md:col-span-1">
                        <h4 className="font-heading font-semibold flex items-center gap-2 text-lg">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            Faced an issue?
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Your feedback is crucial for us. Please let us know if you encountered any bugs or have suggestions for improvement.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="md:col-span-2 space-y-4"
                    >
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="name" className="text-xs">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Your Name"
                                    required
                                    className="bg-background/80"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="job" className="text-xs">Job Title</Label>
                                <Input
                                    id="job"
                                    name="job"
                                    placeholder="Process Engineer"
                                    required
                                    className="bg-background/80"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="company" className="text-xs">Company (Optional)</Label>
                                <Input
                                    id="company"
                                    name="company"
                                    placeholder="Company Name"
                                    className="bg-background/80"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="email" className="text-xs">Email (Optional)</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="bg-background/80"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="message" className="text-xs">Message / Issue Details</Label>
                            <Textarea
                                id="message"
                                name="message"
                                placeholder="Describe the issue or suggestion..."
                                required
                                className="bg-background/80 min-h-[120px] resize-y"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="pt-2">
                            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Feedback
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
};

export default FeedbackForm;
