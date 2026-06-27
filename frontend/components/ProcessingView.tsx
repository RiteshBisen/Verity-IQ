"use client";

import { Upload, Eye, Zap, Check, ShieldCheck, Clock3, Lock } from "lucide-react";

interface ProcessingViewProps {
  fileName: string;
  currentStep: "uploading" | "reading" | "generating" | "complete";
}

interface Step {
  id: "uploading" | "reading" | "generating";
  label: string;
  sublabel: string;
  Icon: React.ElementType;
  accentColor: string;
}

const STEPS: Step[] = [
  {
    id: "uploading",
    label: "Uploading Material",
    sublabel: "Establishing secure pipeline link to Gemini's parser",
    Icon: Upload,
    accentColor: "bg-brutal-blue text-white",
  },
  {
    id: "reading",
    label: "Gemini Indexing",
    sublabel: "Extracting semantic topics, outlines, and core knowledge",
    Icon: Eye,
    accentColor: "bg-brutal-yellow text-black",
  },
  {
    id: "generating",
    label: "Formulating Assessment",
    sublabel: "Constructing high-fidelity evaluation questions & answer rubrics",
    Icon: Zap,
    accentColor: "bg-brutal-red text-white",
  },
];

const STEP_ORDER: Record<Step["id"] | "complete", number> = {
  uploading: 0,
  reading: 1,
  generating: 2,
  complete: 3,
};

const NOTICES = [
  {
    Icon: Clock3,
    title: "15–30 seconds",
    desc: "Typical processing time depending on document size and complexity.",
  },
  {
    Icon: Lock,
    title: "No data stored",
    desc: "Your document is processed in memory and never saved to any server.",
  },
  {
    Icon: ShieldCheck,
    title: "Secure pipeline",
    desc: "All transfers are encrypted end-to-end via Google's secure APIs.",
  },
];

export default function ProcessingView({
  fileName,
  currentStep,
}: ProcessingViewProps) {
  const currentIndex = STEP_ORDER[currentStep];

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* ── LEFT COLUMN ── */}
      <div className="flex flex-col gap-5">

        {/* Processing Core Document card */}
        <div className="w-full border-2 border-black dark:border-white bg-card p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono-custom text-muted uppercase tracking-widest font-black">
              Processing Core Document
            </p>
            <p className="font-display font-black text-lg truncate mt-1 text-foreground">
              {fileName}
            </p>
          </div>
          <div className="w-2.5 h-2.5 bg-brutal-red rounded-full animate-pulse shrink-0 ml-4" />
        </div>

        {/* Notice / info card */}
        <div className="w-full border-2 border-black dark:border-white bg-card rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-[10px] font-mono-custom text-muted uppercase tracking-widest font-black">
              Good to know
            </p>
          </div>
          <div className="divide-y divide-border">
            {NOTICES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-full bg-accent-light border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-display font-black text-foreground uppercase tracking-tight">
                    {title}
                  </p>
                  <p className="text-xs text-muted mt-0.5 leading-snug font-medium">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="flex flex-col gap-5">

        {/* Geometric step indicator bar */}
        <div className="w-full grid grid-cols-3 border-2 border-black dark:border-white bg-card shadow-md rounded-2xl overflow-hidden">
          {STEPS.map((step, idx) => {
            const stepIndex = STEP_ORDER[step.id];
            const isDone = currentIndex > stepIndex;
            const isActive = currentIndex === stepIndex;

            return (
              <div
                key={step.id}
                className={`
                  h-16 flex items-center justify-center transition-colors duration-200
                  ${idx < 2 ? "border-r border-border" : ""}
                  ${isDone ? "bg-accent-light" : isActive ? "bg-background" : "bg-card opacity-40"}
                `}
              >
                {isDone ? (
                  <div className="w-9 h-9 bg-accent-green/10 border border-accent-green rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-accent-green stroke-[3.5]" />
                  </div>
                ) : isActive ? (
                  <div className={`w-9 h-9 border border-brutal-blue rounded-full flex items-center justify-center ${step.accentColor} animate-bounce`}>
                    <step.Icon className="w-4 h-4 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="w-9 h-9 bg-card border border-dashed border-border rounded-full flex items-center justify-center">
                    <step.Icon className="w-4 h-4 text-muted/60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Text steps list */}
        <div className="w-full space-y-3">
          {STEPS.map((step, idx) => {
            const stepIndex = STEP_ORDER[step.id];
            const isDone = currentIndex > stepIndex;
            const isActive = currentIndex === stepIndex;

            return (
              <div
                key={step.id}
                className={`
                  flex items-center gap-5 p-5 border-2 rounded-2xl transition-all duration-200
                  ${
                    isActive
                      ? "bg-card border-brutal-blue shadow-md"
                      : isDone
                        ? "bg-accent-light/40 border-black dark:border-white opacity-70"
                        : "bg-card/20 border-dashed border-border opacity-50"
                  }
                `}
              >
                {/* Step number indicator */}
                <div
                  className={`
                    w-9 h-9 border rounded-full flex items-center justify-center shrink-0 font-mono-custom font-black text-sm
                    ${isDone ? "bg-accent-light text-muted border-border" : isActive ? step.accentColor + " border-transparent" : "bg-card text-muted/60 border-border"}
                  `}
                >
                  {idx + 1}
                </div>

                {/* Step text */}
                <div className="flex-1 min-w-0 font-display">
                  <p
                    className={`text-sm font-black uppercase tracking-tight ${
                      isActive
                        ? "text-foreground"
                        : isDone
                          ? "text-muted"
                          : "text-muted/60"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-xs mt-1 leading-snug font-bold ${
                      isActive ? "text-foreground/85" : "text-muted"
                    }`}
                  >
                    {step.sublabel}
                  </p>
                </div>

                {/* Active pulse bar */}
                {isActive && (
                  <div className="w-1.5 h-5 bg-brutal-blue rounded-full animate-pulse shrink-0" />
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
