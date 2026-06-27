"use client";

import { useState, useRef } from "react";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  FileUp,
  Target,
  Download,
  Bot,
  Layers,
  Sparkles,
} from "lucide-react";
import { Question, QuizResult } from "@/types";
import TutorChat from "./TutorChat";
import { AnimatePresence } from "framer-motion";

interface ResultsViewProps {
  result: QuizResult;
  questions: Question[];
  answers: Record<string, string | null>;
  documentName: string;
  assessmentType: "mcq" | "true_false" | "subjective";
  onRetry: () => void;
  onNewFile: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getPerformanceDetails(score: number): {
  rating: string;
  description: string;
  accentBg: string;
  textColor: string;
} {
  if (score >= 90)
    return {
      rating: "Mastery",
      description: "Exceptional concept retention! Excellent execution and completeness.",
      accentBg: "bg-brutal-blue text-white",
      textColor: "text-brutal-blue",
    };
  if (score >= 70)
    return {
      rating: "Competent",
      description: "Satisfactory topic understanding. Solid grasp of core questions with minor areas for refinement.",
      accentBg: "bg-brutal-yellow text-black",
      textColor: "text-brutal-yellow",
    };
  if (score >= 50)
    return {
      rating: "Developing",
      description: "Concept gaps detected. We recommend reviewing incorrect feedback and retrying.",
      accentBg: "bg-accent-light text-foreground",
      textColor: "text-muted",
    };
  return {
    rating: "Needs Review",
    description: "Insufficient conceptual alignment. Highly advise reading explanations and attempting again.",
    accentBg: "bg-brutal-red text-white",
    textColor: "text-brutal-red",
  };
}

export default function ResultsView({
  result,
  questions,
  answers,
  documentName,
  assessmentType,
  onRetry,
  onNewFile,
}: ResultsViewProps) {
  const perf = getPerformanceDetails(result.scorePercent);
  const [activeChatQuestion, setActiveChatQuestion] = useState<{
    question: Question;
    userAnswer: string;
  } | null>(null);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const isSubjective = assessmentType === "subjective";

  const handleDownloadReport = () => {
    let reportContent = `=========================================\n`;
    reportContent += `       VERITY IQ PERFORMANCE REPORT      \n`;
    reportContent += `=========================================\n\n`;
    reportContent += `Document Source : ${documentName}\n`;
    reportContent += `Assessment Type : ${assessmentType.toUpperCase()}\n`;
    reportContent += `Final Score     : ${result.scorePercent}%\n`;
    reportContent += `Performance     : ${perf.rating.toUpperCase()}\n`;
    reportContent += `Time Taken      : ${formatTime(result.timeTakenSeconds)}\n\n`;
    
    if (!isSubjective) {
      reportContent += `Score Metrics   : ${result.correctCount} Correct / ${result.incorrectCount} Incorrect\n\n`;
      reportContent += `-----------------------------------------\n`;
      reportContent += `          QUESTIONS BREAKDOWN            \n`;
      reportContent += `-----------------------------------------\n\n`;
      questions.forEach((q, idx) => {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.correctAnswer;
        reportContent += `Q${idx + 1}: ${q.question}\n`;
        reportContent += `  Your Answer    : ${userAnswer || "[Skipped]"}\n`;
        reportContent += `  Correct Answer : ${q.correctAnswer}\n`;
        reportContent += `  Outcome        : ${isCorrect ? "CORRECT" : "INCORRECT"}\n`;
        reportContent += `  Explanation    : ${q.explanation}\n\n`;
      });
    } else {
      reportContent += `-----------------------------------------\n`;
      reportContent += `         AI SUBJECTIVE EVALUATIONS       \n`;
      reportContent += `-----------------------------------------\n\n`;
      questions.forEach((q, idx) => {
        const evaluation = result.subjectiveEvaluations?.[q.id];
        const userAnswer = answers[q.id];
        reportContent += `Q${idx + 1}: ${q.question}\n`;
        reportContent += `  Your Answer    : ${userAnswer || "[No response]"}\n`;
        reportContent += `  Expected Answer: ${q.expectedAnswer || ""}\n`;
        if (evaluation) {
          reportContent += `  AI Score       : ${evaluation.score}/100\n`;
          reportContent += `  Rubric Coverage: ${evaluation.isCorrect ? "PASSED" : "FAILED"}\n`;
          reportContent += `  Missing Concept: ${evaluation.missingConcepts.join(", ") || "None"}\n`;
          reportContent += `  Feedback       : ${evaluation.improvementRecommendations}\n`;
          reportContent += `  Ideal Model    : ${evaluation.suggestedAnswer}\n`;
        }
        reportContent += `\n`;
      });
    }

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `verity_iq_report_${documentName.replace(/[^a-zA-Z0-9.-]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    setShowFormatModal(false);
    const html2pdf = (await import("html2pdf.js" as any)).default;

    if (!pdfRef.current) return;

    // Temporarily hide excluded elements and apply page-break styles on the live DOM
    const excludedElements = pdfRef.current.querySelectorAll<HTMLElement>("[data-pdf-exclude]");
    excludedElements.forEach(el => {
      el.style.display = "none";
    });

    const cardElements = pdfRef.current.querySelectorAll<HTMLElement>("[data-pdf-card]");
    cardElements.forEach(el => {
      el.style.pageBreakInside = "avoid";
      el.style.breakInside = "avoid";
    });

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `verity_iq_report_${documentName.replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    try {
      await html2pdf().set(opt).from(pdfRef.current).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      // Restore the live DOM to its original state
      excludedElements.forEach(el => {
        el.style.display = "";
      });
      cardElements.forEach(el => {
        el.style.pageBreakInside = "";
        el.style.breakInside = "";
      });
    }
  };

  // SVG parameters for concentric score circle gauge
  const radius = 70;
  const stroke = 14;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (result.scorePercent / 100) * circumference;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 font-display" ref={pdfRef}>
      
      {/* Top Banner Status */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tight text-foreground">
            Performance Analytics
          </h1>
          <p className="text-xs font-mono-custom text-muted mt-2 uppercase font-black">
            Platform Analysis Report · Verity IQ
          </p>
        </div>
        <div className="text-xs font-mono-custom font-bold uppercase text-muted tracking-wider mt-2 sm:mt-0 bg-accent-light px-4 py-2 rounded-full border border-border shadow-xs">
          Source: {documentName}
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* ── LEFT: Score Gauge Panel ── */}
        <div data-pdf-card className="md:col-span-5 border border-border bg-card p-6 md:p-8 rounded-3xl shadow-lg flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-brutal-red" />

          <div className="w-full pt-4">
            <p className="text-[10px] font-mono-custom font-black text-muted uppercase tracking-widest">
              Final Evaluation
            </p>
            <h3 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight mt-1 text-foreground">
              Assessment Score
            </h3>
          </div>

          {/* SVG Score Ring */}
          <div className="relative flex items-center justify-center my-8">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              <circle stroke="var(--bg-accent-light)" fill="transparent"
                strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
              <circle stroke="var(--accent-red)" fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + " " + circumference}
                style={{ strokeDashoffset }}
                r={normalizedRadius} cx={radius} cy={radius}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black font-display text-foreground leading-none">
                {result.scorePercent}
              </span>
              <span className="text-xs font-mono-custom text-muted font-black uppercase mt-0.5">%</span>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className={`py-2.5 px-5 border border-border font-bold uppercase tracking-widest text-xs font-mono-custom rounded-full ${perf.accentBg}`}>
              RATING: {perf.rating}
            </div>
            <p className="text-sm text-foreground/95 leading-relaxed font-display font-medium px-4">
              {perf.description}
            </p>
          </div>
        </div>

        {/* ── RIGHT: 4 Stat Cards + Donut Chart ── */}
        <div className="md:col-span-7 flex flex-col gap-5">

          {/* 4 Metric Cards */}
          <div data-pdf-card className="grid grid-cols-2 sm:grid-cols-4 gap-4">

            {/* Time Elapsed */}
            <div className="border border-border bg-card p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center gap-1.5">
              <Clock className="w-7 h-7 text-brutal-blue shrink-0 stroke-[2.5]" />
              <span className="text-base font-black font-display text-foreground leading-none mt-1">
                {formatTime(result.timeTakenSeconds)}
              </span>
              <span className="text-[9px] font-mono-custom text-muted uppercase tracking-widest font-bold leading-tight">
                Time Elapsed
              </span>
            </div>

            {/* Correct */}
            <div className="border border-border bg-card p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center gap-1.5">
              <CheckCircle2 className="w-7 h-7 text-accent-green shrink-0 stroke-[2.5]" />
              <span className="text-base font-black font-display text-foreground leading-none mt-1">
                {result.correctCount}
              </span>
              <span className="text-[9px] font-mono-custom text-muted uppercase tracking-widest font-bold leading-tight">
                Correct
              </span>
            </div>

            {/* Incorrect */}
            <div className="border border-border bg-card p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center gap-1.5">
              <XCircle className="w-7 h-7 text-accent-red shrink-0 stroke-[2.5]" />
              <span className="text-base font-black font-display text-foreground leading-none mt-1">
                {result.incorrectCount}
              </span>
              <span className="text-[9px] font-mono-custom text-muted uppercase tracking-widest font-bold leading-tight">
                Incorrect
              </span>
            </div>

            {/* Accuracy % */}
            <div className="border border-border bg-card p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center gap-1.5">
              <Target className="w-7 h-7 text-brutal-red shrink-0 stroke-[2.5]" />
              <span className="text-base font-black font-display text-foreground leading-none mt-1">
                {result.scorePercent}%
              </span>
              <span className="text-[9px] font-mono-custom text-muted uppercase tracking-widest font-bold leading-tight">
                Accuracy
              </span>
            </div>
          </div>

          {/* Donut Distribution Chart */}
          {(() => {
            const total       = questions.length || 1;
            const correctPct  = (result.correctCount / total) * 100;
            const r           = 54;
            const circ        = 2 * Math.PI * r;
            const correctDash = (correctPct / 100) * circ;
            const incorrectDash = circ - correctDash;

            return (
              <div data-pdf-card className="border border-border bg-card p-6 rounded-3xl shadow-md flex-1 flex flex-col">
                <div>
                  <h4 className="font-display font-black text-base uppercase tracking-tight text-foreground">
                    Answer Distribution
                  </h4>
                  <p className="text-[10px] font-mono-custom text-muted uppercase font-bold mt-1">
                    Correct vs incorrect proportion breakdown
                  </p>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mt-6">

                  {/* Donut SVG */}
                  <div className="relative shrink-0">
                    <svg viewBox="0 0 148 148" className="w-36 h-36" style={{ transform: "rotate(-90deg)" }}>
                      {/* Track */}
                      <circle cx="74" cy="74" r={r} fill="none"
                        stroke="currentColor" strokeOpacity="0.08" strokeWidth="20" />
                      {/* Correct arc (green) */}
                      {correctDash > 0 && (
                        <circle cx="74" cy="74" r={r} fill="none"
                          stroke="#22c55e" strokeWidth="20"
                          strokeDasharray={`${correctDash} ${circ}`}
                          strokeDashoffset="0"
                        />
                      )}
                      {/* Incorrect arc (red) */}
                      {incorrectDash > 0 && (
                        <circle cx="74" cy="74" r={r} fill="none"
                          stroke="#ef4444" strokeWidth="20"
                          strokeDasharray={`${incorrectDash} ${circ}`}
                          strokeDashoffset={-correctDash}
                        />
                      )}
                    </svg>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black font-display text-foreground leading-none">
                        {result.correctCount}
                      </span>
                      <span className="text-[11px] font-mono-custom text-muted font-bold mt-0.5">
                        / {total}
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-black font-display text-foreground leading-tight">
                          {result.correctCount} Correct
                        </p>
                        <p className="text-[10px] font-mono-custom text-muted font-bold uppercase tracking-wider mt-0.5">
                          {Math.round(correctPct)}% of total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-black font-display text-foreground leading-tight">
                          {result.incorrectCount} Incorrect
                        </p>
                        <p className="text-[10px] font-mono-custom text-muted font-bold uppercase tracking-wider mt-0.5">
                          {Math.round(100 - correctPct)}% of total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-border bg-accent-light shrink-0" />
                      <div>
                        <p className="text-sm font-black font-display text-foreground leading-tight">
                          {total} Questions
                        </p>
                        <p className="text-[10px] font-mono-custom text-muted font-bold uppercase tracking-wider mt-0.5">
                          Total attempted
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      </div>


      {/* Suggestion banner */}
      <div data-pdf-card className="p-5 border border-accent-yellow/20 bg-accent-yellow/5 rounded-2xl shadow-sm flex flex-row gap-5 items-center">
        <div className="w-12 h-12 bg-accent-yellow/10 rounded-full flex items-center justify-center text-brutal-yellow shrink-0">
          <Sparkles className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div className="flex-1 font-display">
          <h4 className="font-bold text-base uppercase tracking-tight text-foreground">
            Academic Performance Suggestion
          </h4>
          <p className="text-xs text-foreground/80 leading-relaxed mt-1.5 font-bold">
            {isSubjective
              ? "Your written responses demonstrate custom knowledge. Read the AI evaluations question-by-question below. Pay extra attention to missing rubric concepts to refine detailed writing structure."
              : "Review your detailed incorrect cards below. Use the integrated AI Tutor chat module to review step-by-step logic and debug questions."}
          </p>
        </div>
      </div>

      {/* Review Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Target className="w-5 h-5 text-foreground shrink-0 stroke-[2.5]" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
          <span className="font-display font-black text-xl uppercase tracking-tight text-foreground" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            Detailed Review Breakdown
          </span>
        </div>

        {questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          
          if (!isSubjective) {
            // MCQ / True-False review panel
            const isCorrect = userAnswer === q.correctAnswer;
            return (
              <div
                key={q.id}
                data-pdf-card
                className={`
                  border p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start justify-between gap-6 bg-card
                  ${isCorrect ? "border-border" : "border-accent-red bg-accent-red/5"}
                `}
              >
                <div className="flex-1 min-w-0 font-display">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="font-mono-custom text-xs font-bold px-2.5 py-1 rounded-full bg-accent-light uppercase">
                      Q{idx + 1}
                    </span>
                    <span className={`text-xs font-mono-custom font-black uppercase tracking-widest ${isCorrect ? "text-accent-green" : "text-accent-red"}`}>
                      {isCorrect ? "CORRECT" : "INCORRECT"}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg text-foreground leading-relaxed">
                    {q.question}
                  </h4>

                  {/* Answers row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 font-mono-custom text-xs font-bold">
                    <div className="p-4 border border-border bg-card rounded-xl shadow-xs">
                      <p className="text-muted font-bold uppercase tracking-widest">YOUR RESPONSE</p>
                      <p className="text-sm font-display font-bold text-foreground mt-1.5">
                        {userAnswer || "[No answer submitted]"}
                      </p>
                    </div>
                    <div className="p-4 border border-border bg-accent-light rounded-xl shadow-xs">
                      <p className="text-muted font-bold uppercase tracking-widest">EXPECTED ANSWER</p>
                      <p className="text-sm font-display font-bold text-foreground mt-1.5">
                        {q.correctAnswer}
                      </p>
                    </div>
                  </div>

                  {/* Explanation card */}
                  <div className="mt-4 p-5 border border-dashed border-border bg-accent-light/30 text-xs text-foreground/90 leading-relaxed font-display rounded-xl font-medium">
                    <span className="font-bold text-foreground uppercase tracking-wider block mb-1.5">EXPLANATION CRITIQUE</span>
                    {q.explanation}
                  </div>
                </div>

                {/* AI Tutor Chat Trigger */}
                {!isCorrect && (
                  <button
                    data-pdf-exclude
                    onClick={() => setActiveChatQuestion({ question: q, userAnswer: userAnswer || "" })}
                    className="w-full md:w-auto mt-2 md:mt-0 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-brutal-blue text-white font-display font-bold text-xs uppercase tracking-wider rounded-full shadow-sm hover:shadow-md transition-all duration-200 shrink-0 cursor-pointer"
                  >
                    <Bot className="w-4.5 h-4.5 stroke-[2.5]" />
                    Ask AI Tutor
                  </button>
                )}
              </div>
            );
          } else {
            // Subjective Review Panel
            const evaluation = result.subjectiveEvaluations?.[q.id];
            const isCorrectScore = evaluation ? evaluation.isCorrect : false;

            return (
              <div
                key={q.id}
                data-pdf-card
                className={`
                  border p-5 rounded-2xl shadow-sm space-y-5 bg-card
                  ${isCorrectScore ? "border-border" : "border-accent-red bg-accent-red/5"}
                `}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-custom text-xs font-bold px-2.5 py-1 rounded-full bg-accent-light uppercase">
                      Q{idx + 1}
                    </span>
                    <span className="text-sm font-display font-bold uppercase tracking-tight text-foreground">
                      Subjective Evaluation
                    </span>
                  </div>
                  {evaluation && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono-custom font-black uppercase text-muted">
                        AI Score:
                      </span>
                      <span className={`text-xs font-mono-custom font-bold px-3 py-1.5 border border-border rounded-full shadow-xs ${
                        isCorrectScore ? "bg-accent-green/20 text-accent-green border-accent-green/30" : "bg-accent-red/20 text-accent-red border-accent-red/30"
                      }`}>
                        {evaluation.score}/100
                      </span>
                    </div>
                  )}
                </div>

                <div className="font-display">
                  <h4 className="font-bold text-lg text-foreground leading-relaxed">
                    {q.question}
                  </h4>
                </div>

                {/* Side-by-Side written answer vs model answer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-display font-black">
                  <div className="p-4 border border-border bg-card rounded-xl shadow-xs">
                    <p className="font-mono-custom text-[10px] text-muted font-bold uppercase tracking-wider">YOUR SUBMISSION</p>
                    <p className="text-sm font-medium text-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                      {userAnswer || "[No written answer submitted]"}
                    </p>
                  </div>
                  <div className="p-4 border border-border bg-accent-light rounded-xl shadow-xs">
                    <p className="font-mono-custom text-[10px] text-muted font-bold uppercase tracking-wider">EXPECTED KEY IDEALS</p>
                    <p className="text-sm font-medium text-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                      {q.expectedAnswer}
                    </p>
                  </div>
                </div>

                {/* AI evaluations block details */}
                {evaluation && (
                  <div className="space-y-4 pt-2 font-display">
                    {/* Missing Concepts tag block */}
                    {evaluation.missingConcepts.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono-custom font-black text-muted uppercase tracking-widest block">
                          Missing Rubric Concepts
                        </span>
                        <div className="flex gap-2.5 flex-wrap">
                          {evaluation.missingConcepts.map((concept) => (
                            <span
                              key={concept}
                              className="px-3.5 py-1.5 border border-accent-yellow/20 bg-accent-yellow/15 text-foreground text-xs font-bold font-mono-custom rounded-full shadow-xs"
                            >
                              ✕ {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Recommendations */}
                    <div className="p-4 border border-border bg-card rounded-xl shadow-xs space-y-1">
                      <span className="text-[10px] font-mono-custom font-black text-brutal-red uppercase tracking-widest block">
                        Improvement Advice
                      </span>
                      <p className="text-sm text-foreground/90 leading-relaxed font-bold">
                        {evaluation.improvementRecommendations}
                      </p>
                    </div>

                    {/* Refined suggested answer ideal */}
                    <div className="p-4 border border-border bg-accent-light rounded-xl shadow-xs space-y-1.5">
                      <span className="text-[10px] font-mono-custom font-black text-brutal-blue uppercase tracking-widest block">
                        Model Suggested Answer Refinement
                      </span>
                      <p className="text-sm text-foreground/90 leading-relaxed font-bold">
                        {evaluation.suggestedAnswer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          }
        })}
      </div>

      {/* Action panel */}
      <div data-pdf-exclude className="border-t border-border pt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <button
          onClick={() => setShowFormatModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 border border-border bg-card text-foreground font-display font-bold text-sm uppercase rounded-full shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <Download className="w-5 h-5 stroke-[2.5]" />
          Download Report
        </button>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4">
          <button
            onClick={onRetry}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-5 border border-border bg-card text-foreground font-display font-bold text-sm uppercase rounded-full shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 text-brutal-blue stroke-[3]" />
            Retry Assessment
          </button>
          
          <button
            onClick={onNewFile}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-5 border border-border bg-brutal-red text-white font-display font-bold text-sm uppercase rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <FileUp className="w-5 h-5 stroke-[2.5]" />
            Upload New File
          </button>
        </div>
      </div>

      {/* ── Format Selection Modal ── */}
      <AnimatePresence>
        {showFormatModal && (
          <div
            data-pdf-exclude
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFormatModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal card */}
            <div
              className="relative z-10 bg-card border-2 border-black dark:border-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm flex flex-col items-center gap-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-accent-light border border-border rounded-2xl flex items-center justify-center">
                <Download className="w-7 h-7 text-foreground stroke-[2.5]" />
              </div>

              <div className="text-center">
                <h3 className="font-display font-black text-xl uppercase tracking-tight text-foreground">
                  Choose Format
                </h3>
                <p className="text-xs font-mono-custom text-muted font-bold uppercase tracking-wider mt-1">
                  Select your download format
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                {/* TXT Option */}
                <button
                  onClick={() => { setShowFormatModal(false); handleDownloadReport(); }}
                  className="flex flex-col items-center gap-3 p-4 sm:p-5 border-2 border-border rounded-2xl bg-card hover:bg-accent-light hover:border-black dark:hover:border-white transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-accent-light group-hover:bg-white dark:group-hover:bg-black/20 border border-border rounded-xl flex items-center justify-center transition-all">
                    <span className="text-xs font-mono-custom font-black text-foreground">TXT</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black font-display text-foreground uppercase">Text</p>
                    <p className="text-[9px] font-mono-custom text-muted font-bold uppercase tracking-wider mt-0.5">Plain .txt file</p>
                  </div>
                </button>

                {/* PDF Option */}
                <button
                  onClick={handleDownloadPDF}
                  className="flex flex-col items-center gap-3 p-4 sm:p-5 border-2 border-brutal-red rounded-2xl bg-brutal-red/5 hover:bg-brutal-red hover:text-white transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-brutal-red/10 group-hover:bg-white/20 border border-brutal-red/40 rounded-xl flex items-center justify-center transition-all">
                    <span className="text-xs font-mono-custom font-black text-brutal-red group-hover:text-white">PDF</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black font-display text-brutal-red group-hover:text-white uppercase">PDF</p>
                    <p className="text-[9px] font-mono-custom text-brutal-red/70 group-hover:text-white/80 font-bold uppercase tracking-wider mt-0.5">Full report</p>
                  </div>
                </button>
              </div>

              {/* Cancel */}
              <button
                onClick={() => setShowFormatModal(false)}
                className="text-xs font-mono-custom font-bold text-muted uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeChatQuestion && (
          <TutorChat
            question={activeChatQuestion.question}
            userAnswer={activeChatQuestion.userAnswer}
            onClose={() => setActiveChatQuestion(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
