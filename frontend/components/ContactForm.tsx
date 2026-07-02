"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Send, User, Mail, Tag, HelpCircle, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { sendContactMessage } from "@/services/api";
import { ContactRequest } from "@/types";

type FormState = "idle" | "submitting" | "success";

export default function ContactForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = [
    { value: "Feature Request", label: "💡 Feature Request" },
    { value: "Bug Report", label: "🐞 Bug Report" },
    { value: "General Query", label: "❓ General Query" },
    { value: "Partnership", label: "🤝 Partnership" },
    { value: "Feedback", label: "💬 Feedback" },
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Full Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email Address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!category) {
      newErrors.category = "Please select a category";
    }

    if (!message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Form Validation Failed", {
        description: "Please correct the highlighted fields before submitting.",
      });
      return;
    }

    setFormState("submitting");

    try {
      const payload: ContactRequest = {
        name,
        email,
        category,
        subject: subject.trim() || undefined,
        message,
      };

      const response = await sendContactMessage(payload);

      if (response.status === "success") {
        setFormState("success");
        toast.success("Message Sent", {
          description: "Thank you for reaching out to us!",
        });
        // Clear the form
        setName("");
        setEmail("");
        setCategory("");
        setSubject("");
        setMessage("");
        setErrors({});
      } else {
        throw new Error(response.message || "Failed to submit message.");
      }
    } catch (err: any) {
      setFormState("idle");
      const errorDescription = err.message || "Something went wrong while sending your message. Please try again.";
      toast.error("Failed to Send Message", {
        description: errorDescription,
      });
      setErrors({ submit: errorDescription });
    }
  };

  const handleReset = () => {
    setFormState("idle");
    setErrors({});
  };

  // Setup animated symbols for the success screen
  const successFloatingSymbols = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    x: (i % 2 === 0 ? 1 : -1) * (15 + (i * 18) % 120),
    delay: (i * 0.3) % 2.0,
    duration: 3 + (i % 3) * 1.2,
    scale: 0.7 + ((i * 0.2) % 0.6),
    type: i % 3 === 0 ? "📧" : i % 3 === 1 ? "✨" : "💬",
  }));

  return (
    <div className="w-full border border-border bg-card p-6 sm:p-8 rounded-2xl shadow-sm mt-6 select-none relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-30%] right-[-10%] w-[35%] aspect-square rounded-full bg-brutal-blue/5 dark:bg-brutal-blue/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-10%] w-[35%] aspect-square rounded-full bg-brutal-purple/5 dark:bg-brutal-purple/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">✉️</span>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
            Contact Developers
          </h3>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-accent-light text-foreground text-[10px] font-bold uppercase rounded-full border border-border shadow-xs">
          <span>Support</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {formState === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 text-center space-y-6 relative overflow-hidden flex flex-col items-center justify-center"
          >
            {/* Celebration Emojis */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
              {successFloatingSymbols.map((node) => (
                <motion.div
                  key={node.id}
                  initial={{ y: 150, opacity: 0, x: node.x, scale: node.scale }}
                  animate={{
                    y: -150,
                    opacity: [0, 0.9, 0.9, 0],
                    x: node.x + Math.sin(node.id) * 20,
                  }}
                  transition={{
                    delay: node.delay,
                    duration: node.duration,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute bottom-0 left-1/2 text-lg z-0"
                >
                  {node.type}
                </motion.div>
              ))}
            </div>

            <div className="relative z-10 space-y-4 max-w-md mx-auto">
              <div className="relative inline-flex items-center justify-center w-16 h-16 bg-brutal-green/10 text-brutal-green rounded-full">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5] animate-bounce" />
              </div>

              <div className="space-y-2">
                <h4 className="text-lg sm:text-xl font-bold text-foreground">
                  Thanks for reaching out!
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  We've received your message and will get back to you as soon as possible.
                </p>
              </div>

              <button
                onClick={handleReset}
                className="font-bold text-xs px-5 py-2.5 bg-brutal-blue text-white rounded-full hover:bg-brutal-blue/90 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-5 relative z-10"
          >
            {errors.submit && (
              <div className="p-3 bg-brutal-red/10 border border-brutal-red/20 text-brutal-red rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Name and Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brutal-blue" />
                  Full Name <span className="text-brutal-red">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={formState === "submitting"}
                  className={`w-full bg-accent-light/50 border ${
                    errors.name ? "border-brutal-red ring-1 ring-brutal-red/35" : "border-border"
                  } px-4 py-2.5 rounded-full text-sm text-foreground focus:outline-none focus:ring-2 ${
                    errors.name ? "focus:ring-brutal-red/50" : "focus:ring-brutal-blue/50 focus:border-brutal-blue"
                  } transition-all`}
                />
                {errors.name && (
                  <p className="text-[10px] font-medium text-brutal-red pl-2">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brutal-blue" />
                  Email Address <span className="text-brutal-red">*</span>
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formState === "submitting"}
                  className={`w-full bg-accent-light/50 border ${
                    errors.email ? "border-brutal-red ring-1 ring-brutal-red/35" : "border-border"
                  } px-4 py-2.5 rounded-full text-sm text-foreground focus:outline-none focus:ring-2 ${
                    errors.email ? "focus:ring-brutal-red/50" : "focus:ring-brutal-blue/50 focus:border-brutal-blue"
                  } transition-all`}
                />
                {errors.email && (
                  <p className="text-[10px] font-medium text-brutal-red pl-2">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Category and Subject Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brutal-blue" />
                  Category <span className="text-brutal-red">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={formState === "submitting"}
                    className={`w-full bg-accent-light/50 border ${
                      errors.category ? "border-brutal-red ring-1 ring-brutal-red/35" : "border-border"
                    } px-4 py-2.5 rounded-full text-sm text-foreground focus:outline-none focus:ring-2 ${
                      errors.category ? "focus:ring-brutal-red/50" : "focus:ring-brutal-blue/50 focus:border-brutal-blue"
                    } transition-all appearance-none cursor-pointer`}
                  >
                    <option value="" disabled className="text-muted">
                      Select a category
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-card text-foreground">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">
                    ▼
                  </div>
                </div>
                {errors.category && (
                  <p className="text-[10px] font-medium text-brutal-red pl-2">
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brutal-blue" />
                  Subject <span className="text-[10px] text-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="What is this regarding?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={formState === "submitting"}
                  className="w-full bg-accent-light/50 border border-border px-4 py-2.5 rounded-full text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brutal-blue/50 focus:border-brutal-blue transition-all"
                />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brutal-blue" />
                Message <span className="text-brutal-red">*</span>
              </label>
              <textarea
                placeholder="Write your query, feature request, or feedback details here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={formState === "submitting"}
                rows={4}
                className={`w-full bg-accent-light/50 border ${
                  errors.message ? "border-brutal-red ring-1 ring-brutal-red/35" : "border-border"
                } px-4 py-3 rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 ${
                  errors.message ? "focus:ring-brutal-red/50" : "focus:ring-brutal-blue/50 focus:border-brutal-blue"
                } transition-all resize-none`}
              />
              {errors.message && (
                <p className="text-[10px] font-medium text-brutal-red pl-2">
                  {errors.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={formState === "submitting"}
                className="font-bold text-xs px-6 py-3 bg-brutal-blue text-white rounded-full hover:bg-brutal-blue/90 active:scale-95 disabled:scale-100 disabled:opacity-60 transition-all shadow-sm cursor-pointer flex items-center gap-2 group"
              >
                {formState === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
