"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

interface HeroProps {
  onScrollToGenerator: () => void;
}

export default function Hero({ onScrollToGenerator }: HeroProps) {
  return (
    <section className="relative w-full max-w-4xl mx-auto px-6 py-12 md:py-16 text-left border-b border-dashed border-border/30 font-display">
      
      {/* Dynamic Geometric Decorative Shapes - Modern Material Style */}
      <div className="absolute top-0 right-10 hidden md:flex items-center gap-3 pointer-events-none">
        <div className="w-16 h-16 bg-brutal-yellow/10 border border-border/50 rounded-2xl shadow-sm transform rotate-6 animate-pulse-slow" />
        <div className="w-14 h-14 bg-brutal-red/10 border border-border/50 rounded-full shadow-sm transform -rotate-12" />
        <div className="w-12 h-24 bg-brutal-blue/10 border border-border/50 rounded-2xl shadow-sm transform rotate-12" />
      </div>

      <div className="max-w-2xl space-y-6">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-border bg-accent-light/50 text-foreground rounded-full text-xs font-semibold shadow-sm">
          <span className="w-2 h-2 bg-brutal-red rounded-full animate-pulse inline-block" />
          Autonomous Assessment Engine
        </div>

        {/* Big Bold Headline */}
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-tight text-foreground">
          Autonomous Evaluation.
          <br />
          <span className="text-brutal-blue">
            Instant Mastery.
          </span>
        </h1>

        {/* Short Description */}
        <p className="text-base md:text-lg text-muted leading-relaxed max-w-lg">
          VerityIQ instantly transforms textbooks, notes, and worksheets into custom assessments. 
          Powered by Gemini, our platform generates, conducts, and grades multi-format quizzes with rich, educational analytics.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-wrap gap-4 pt-2">
          <button
            onClick={onScrollToGenerator}
            className="px-6 py-3 bg-brutal-blue text-white font-semibold text-sm rounded-full shadow-sm hover:bg-brutal-blue/90 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
          >
            Start Assessment
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

      </div>

    </section>
  );
}
