"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Question } from "@/types";

interface QuizCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedOption: string) => void;
  savedAnswer: string | null;
}

export default function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  savedAnswer,
}: QuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Sync state with parent's savedAnswers when jumping between questions
  useEffect(() => {
    setSelected(savedAnswer);
    setShowExplanation(savedAnswer !== null);
  }, [savedAnswer, question.id]);

  const hasAnswered = selected !== null;

  function handleSelect(option: string) {
    if (hasAnswered) return;
    setSelected(option);
    onAnswer(option);
    setTimeout(() => {
      setShowExplanation(true);
    }, 250);
  }

  function getOptionStyle(option: string): string {
    if (!hasAnswered) {
      return "border-border bg-card hover:bg-accent-light transition-all duration-200 cursor-pointer shadow-xs hover:shadow-sm";
    }
    if (option === question.correctAnswer) {
      return "border-green-600 bg-green-500 text-white cursor-default shadow-md scale-[1.01]";
    }
    if (option === selected && option !== question.correctAnswer) {
      return "border-red-600 bg-red-500 text-white cursor-default shadow-md";
    }
    return "border-border/40 bg-card opacity-35 cursor-default";
  }

  function getOptionIcon(option: string) {
    if (!hasAnswered) return null;
    if (option === question.correctAnswer) {
      return <CheckCircle2 className="w-5 h-5 text-white shrink-0 stroke-[3]" />;
    }
    if (option === selected) {
      return <XCircle className="w-5 h-5 text-white shrink-0 stroke-[3]" />;
    }
    return null;
  }

  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Progress info */}
      <div className="flex items-center justify-between text-xs font-mono-custom uppercase tracking-wider text-muted font-bold">
        <span>
          Question {questionNumber} of {totalQuestions}
        </span>
        <span>
          {Math.round((questionNumber / totalQuestions) * 100)}% Complete
        </span>
      </div>

      {/* Stark Geometric Progress bar */}
      <div className="w-full h-2 bg-accent-light rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-brutal-blue rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${(questionNumber / totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* Question text box */}
      <div className="border border-border bg-card p-6 md:p-8 rounded-2xl shadow-sm">
        <p className="text-foreground text-base md:text-lg font-display font-bold leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Options grid */}
      <div className="space-y-3 font-display">
        {question.options?.map((option, idx) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={hasAnswered}
            className={`
              w-full text-left flex items-center gap-4 px-5 py-3.5 border border-solid rounded-xl
              transition-all duration-200 group font-bold text-sm
              ${getOptionStyle(option)}
            `}
          >
            {/* Letter badge box */}
            <span
              className={`
                w-8 h-8 border-2 border-solid rounded-full flex items-center justify-center text-xs font-black font-mono shrink-0 transition-colors
                ${
                  !hasAnswered
                    ? "bg-accent-light text-foreground border-border group-hover:bg-brutal-blue/15 group-hover:text-brutal-blue"
                    : option === question.correctAnswer
                      ? "bg-white/25 text-white border-white/60"
                      : option === selected
                        ? "bg-white/25 text-white border-white/60"
                        : "bg-card text-muted border-border/40"
                }
              `}
            >
              {optionLetters[idx] || (idx + 1)}
            </span>

            <span
              className="flex-1 font-medium text-sm leading-snug"
              style={{
                color: hasAnswered
                  ? option === question.correctAnswer || option === selected
                    ? "#ffffff"
                    : undefined
                  : undefined,
                textShadow:
                  hasAnswered &&
                  (option === question.correctAnswer || option === selected)
                    ? "0 1px 3px rgba(0,0,0,0.35)"
                    : undefined,
              }}
            >
              {option}
            </span>

            {getOptionIcon(option)}
          </button>
        ))}
      </div>

      {/* Explanation panel */}
      {showExplanation && (
        <div className="relative border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 dark:border-yellow-500 p-5 rounded-2xl shadow-md flex gap-4 animate-fade-in overflow-hidden">
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 dark:bg-yellow-500 rounded-l-2xl" />
          <div className="w-9 h-9 bg-yellow-400/30 dark:bg-yellow-500/20 border border-yellow-400 dark:border-yellow-500 rounded-full flex items-center justify-center shrink-0 ml-2">
            <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 stroke-[2.5] fill-yellow-300/30" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono-custom font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-widest mb-1.5">
              💡 Explanation Critique
            </p>
            <p className="text-sm text-yellow-900 dark:text-yellow-100 leading-relaxed font-display font-semibold">
              {question.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
