"use client";

import { Layers, Terminal, Cpu, Info } from "lucide-react";

interface AboutDevelopersProps {
  onClose: () => void;
}

export default function AboutDevelopers({ onClose }: AboutDevelopersProps) {
  return (
    <div className="w-full max-w-4xl mx-auto py-10 px-4 sm:px-6 font-display">
      {/* Back button and Section header */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-border pb-6 mb-8 md:mb-12">
        <div>
          <h1 className="font-semibold text-3xl md:text-4xl text-foreground tracking-tight">
            About Developers
          </h1>
          <p className="text-xs text-muted mt-2 tracking-wide font-medium">
            Verity IQ · Education & Technology Synergy
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-4 md:mt-0 font-semibold text-sm px-5 py-2.5 bg-brutal-blue text-white rounded-full hover:bg-brutal-blue/90 active:scale-95 transition-all shadow-sm cursor-pointer self-start md:self-auto"
        >
          Back to Platform
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        
        {/* Panel 1: Platform Purpose */}
        <div className="md:col-span-8 border border-border bg-card p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-blue opacity-5 -mr-10 -mt-10 rounded-full" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brutal-blue/10 rounded-full flex items-center justify-center text-brutal-blue">
              <Info className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="font-semibold text-xl text-foreground">
              Project Purpose
            </h3>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed font-normal">
            Verity IQ transforms passive documents into interactive learning tools. Following modern Material Design guidelines—where clarity, accessibility, and intuitive information hierarchy are paramount—we showcase code architecture and logic reviews clearly. Stripping away unnecessary complexity provides a highly accessible, focused environment for conceptual mastery. Powered by Gemini, learners receive instant assessments, correct/incorrect reviews, and deep subjective critiques tailored exactly to their study materials.
          </p>
        </div>

        {/* Panel 2: Developer Information */}
        <div className="md:col-span-4 border border-border bg-card p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-brutal-yellow" />
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-brutal-yellow/15 rounded-full flex items-center justify-center text-brutal-yellow dark:text-yellow-400">
                <Terminal className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-semibold text-xl text-foreground">
                Architects
              </h3>
            </div>
            <div className="space-y-4 text-sm font-medium">
              <div>
                <p className="text-xs text-muted font-semibold uppercase tracking-wider">
                  Founder
                </p>
                <p className="text-base font-semibold mt-1 text-foreground">Ritesh Bisen</p>
                <p className="text-xs text-muted">Fullstack & Architecture</p>
              </div>
              <div className="pt-3 border-t border-border/40">
                <p className="text-xs text-muted font-semibold uppercase tracking-wider">
                  Dev Co-Pilot
                </p>
                <p className="text-base font-semibold mt-1 text-brutal-red">Antigravity AI</p>
                <p className="text-xs text-muted">Advanced Google DeepMind Agent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Technical Stack */}
        <div className="md:col-span-12 border border-border bg-card p-6 sm:p-8 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brutal-red/10 rounded-full flex items-center justify-center text-brutal-red">
              <Cpu className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="font-semibold text-xl text-foreground">
              Technologies Used
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
            {[
              { name: "Next.js", desc: "React Framework", color: "bg-brutal-blue text-white" },
              { name: "FastAPI", desc: "High-Performance Python Web Framework", color: "bg-brutal-red text-white" },
              { name: "Gemini AI", desc: "Google Gemini 2.0 Flash Client Engine", color: "bg-brutal-yellow text-black" },
              { name: "TypeScript", desc: "Strict typed safety and scale runtime", color: "bg-accent-light text-foreground border border-border" },
              { name: "Tailwind CSS", desc: "Modern styling & components utility layout", color: "border border-border bg-card text-foreground" },
            ].map((tech) => (
              <div
                key={tech.name}
                className="border border-border bg-background p-5 rounded-2xl hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-semibold text-base text-foreground">
                    {tech.name}
                  </h4>
                  <p className="text-xs text-muted mt-1.5 leading-snug">
                    {tech.desc}
                  </p>
                </div>
                <div className={`text-[10px] font-medium mt-4 px-2 py-0.5 border border-border rounded-full uppercase tracking-wider text-center ${tech.color}`}>
                  Core Service
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Philosophy Callout Banner */}
      <div className="mt-12 p-6 sm:p-8 border border-dashed border-border bg-accent-light/30 rounded-3xl flex flex-col md:flex-row items-center gap-6">
        <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center shrink-0">
          <Layers className="w-6 h-6 animate-pulse stroke-[2]" />
        </div>
        <div>
          <h4 className="font-semibold text-lg text-foreground">
            The Design Philosophy of Verity IQ
          </h4>
          <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed font-normal">
            "Form follows function with modern clarity." Verity IQ embraces a clean, accessible Workspace design system to present academic material with absolute clarity, prioritizing readability, structural consistency, and visual ease. By removing heavy outlines and blocky shadows, we focus pure visual energy on your path to conceptual mastery.
          </p>
        </div>
      </div>
    </div>
  );
}
