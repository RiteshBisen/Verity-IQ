"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { Question, QuizResult, SingleSubjectiveEvaluation } from "@/types";
import { evaluateSubjective } from "@/services/api";
import { toast } from "sonner";
import QuizCard from "./QuizCard";

interface QuizViewProps {
  questions: Question[];
  documentName: string;
  startedAt: number;
  assessmentType: "mcq" | "true_false" | "subjective";
  onComplete: (result: QuizResult, answers: Record<string, string | null>) => void;
}

export default function QuizView({
  questions,
  documentName,
  startedAt,
  assessmentType,
  onComplete,
}: QuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isGrading, setIsGrading] = useState(false);

  // Live Timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isSubjective = assessmentType === "subjective";

  // Handle MCQ or True/False answers
  function handleSelectAnswer(selectedOption: string) {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedOption,
    }));
  }

  // Handle Subjective answer typing
  function handleSubjectiveAnswer(value: string) {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }

  // Formatting helper for clock timer
  function formatClock(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // Question navigation handlers
  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 < totalQuestions) setCurrentIndex(currentIndex + 1);
  };

  // Submit assessment (grading)
  const handleSubmitAssessment = async () => {
    const unansweredCount = questions.filter((q) => !answers[q.id]?.trim()).length;

    if (unansweredCount > 0) {
      toast.warning("Incomplete Assessment", {
        description: `You have ${unansweredCount} unanswered questions. We recommend writing answers for all questions before submitting.`,
      });
    }

    const timeTakenSeconds = Math.round((Date.now() - startedAt) / 1000);

    if (isSubjective) {
      setIsGrading(true);
      try {
        // Build submissions array for API
        const submissions = questions.map((q) => ({
          id: q.id,
          question: q.question,
          expectedAnswer: q.expectedAnswer || "",
          rubric: q.rubric || [],
          userAnswer: answers[q.id] || "",
        }));

        const gradingResponse = await evaluateSubjective(submissions);

        // Map evaluations to record keyed by question ID
        const subjectiveEvaluations: Record<string, SingleSubjectiveEvaluation> = {};
        let totalScore = 0;
        let correctCount = 0;

        gradingResponse.evaluations.forEach((evalItem) => {
          subjectiveEvaluations[evalItem.id] = evalItem;
          totalScore += evalItem.score;
          if (evalItem.isCorrect) correctCount++;
        });

        const averageScore = totalQuestions > 0 ? Math.round(totalScore / totalQuestions) : 0;

        onComplete(
          {
            totalQuestions,
            correctCount,
            incorrectCount: totalQuestions - correctCount,
            skippedCount: 0,
            scorePercent: averageScore,
            timeTakenSeconds,
            subjectiveEvaluations,
          },
          answers
        );
      } catch (err: any) {
        toast.error("Grading Failed", {
          description: err.message || "FastAPI was unable to grade your subjective responses.",
        });
      } finally {
        setIsGrading(false);
      }
    } else {
      // Calculate MCQ & T/F local score
      let correctCount = 0;
      questions.forEach((q) => {
        if (answers[q.id] === q.correctAnswer) correctCount++;
      });

      onComplete(
        {
          totalQuestions,
          correctCount,
          incorrectCount: totalQuestions - correctCount,
          skippedCount: 0,
          scorePercent: Math.round((correctCount / totalQuestions) * 100),
          timeTakenSeconds,
        },
        answers
      );
    }
  };

  if (isGrading) {
    return (
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-6 sm:gap-8 py-10 px-4 sm:py-16 sm:px-6 border border-border bg-card rounded-3xl shadow-xl">
        <div className="w-16 h-16 bg-brutal-red/10 rounded-full flex items-center justify-center text-brutal-red animate-spin">
          <GraduationCap className="w-9 h-9 stroke-[2.5]" />
        </div>
        <div className="text-center space-y-2 px-4 sm:px-6">
          <h2 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight">
            AI Critique in Progress
          </h2>
          <p className="text-sm text-muted font-bold">
            Gemini is grading your written answers against academic rubrics. This takes 10-15 seconds.
          </p>
        </div>
        <div className="w-4/5 h-2 bg-accent-light rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-brutal-red rounded-full animate-pulse" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto font-display">
      {/* Assessment Header */}
      <div className="border-b border-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-accent-light rounded-full flex items-center justify-center text-foreground shrink-0 shadow-xs border border-border">
            <BookOpen className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-mono-custom text-muted uppercase tracking-widest font-black">
              Assessment in Progress
            </p>
            <h2 className="font-display font-black text-2xl truncate max-w-sm sm:max-w-md text-foreground mt-0.5">
              {documentName}
            </h2>
          </div>
        </div>

        {/* Live Timer Box */}
        <div className="flex items-center gap-2.5 px-4 py-2 border border-border bg-card text-foreground font-mono-custom font-bold rounded-full shadow-xs w-fit self-end sm:self-auto">
          <Clock className="w-4.5 h-4.5 text-brutal-red stroke-[2.5]" />
          <span>ELAPSED: {formatClock(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Grid Layout: Sidebar Navigation & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {isSubjective ? (
            <div className="space-y-6">
              {/* Question progress info */}
              <div className="flex items-center justify-between text-xs font-mono-custom uppercase tracking-wider text-muted font-bold">
                <span>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span>
                  {Math.round(((currentIndex + 1) / totalQuestions) * 100)}% Complete
                </span>
              </div>

              {/* Stark Geometric Progress bar */}
              <div className="w-full h-2 bg-accent-light rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-brutal-blue rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                  }}
                />
              </div>

              {/* Question text box */}
              <div className="border border-border bg-card p-6 md:p-8 rounded-2xl shadow-sm">
                <p className="text-foreground text-base md:text-lg font-display font-bold leading-relaxed">
                  {currentQuestion.question}
                </p>
              </div>

              {/* Subjective answer typing block */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono-custom font-black uppercase tracking-widest text-muted">
                  Write Your Answer Critique
                </label>
                <textarea
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleSubjectiveAnswer(e.target.value)}
                  className="w-full h-48 p-5 border border-border bg-card text-foreground font-display text-sm focus:outline-none focus:ring-2 focus:ring-brutal-blue/30 focus:border-brutal-blue rounded-2xl shadow-xs placeholder-muted/50 leading-relaxed font-bold resize-y"
                  placeholder="Enter a thorough explanation covering all key concepts. AI evaluation grades detail, logic, and concepts covered."
                />
                <div className="flex justify-between text-xs font-mono-custom text-muted pt-1 font-bold">
                  <span>Characters: {(answers[currentQuestion.id] || "").length}</span>
                  <span>Min recommended characters: 30</span>
                </div>
              </div>
            </div>
          ) : (
            <QuizCard
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={totalQuestions}
              onAnswer={handleSelectAnswer}
              savedAnswer={answers[currentQuestion.id] || null}
            />
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 border border-border bg-card text-foreground font-display font-bold text-sm uppercase rounded-full shadow-sm hover:bg-accent-light transition-all duration-200 disabled:opacity-40 disabled:hover:bg-card disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex + 1 === totalQuestions}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 border border-border bg-card text-foreground font-display font-bold text-sm uppercase rounded-full shadow-sm hover:bg-accent-light transition-all duration-200 disabled:opacity-40 disabled:hover:bg-card disabled:cursor-not-allowed cursor-pointer"
            >
              Next
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Question Grid Sidebar */}
        <div className="lg:col-span-4 border border-border bg-card p-6 rounded-3xl shadow-md space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="font-display font-bold text-base uppercase tracking-tight text-foreground">
              Question Navigator
            </h3>
            <p className="text-[10px] font-mono-custom text-muted uppercase font-bold mt-1">
              Jump and inspect status
            </p>
          </div>

          {/* Grid Box Layout */}
          <div className="grid grid-cols-5 gap-3">
            {questions.map((q, idx) => {
              const isActive = idx === currentIndex;
              const hasAnswer = (answers[q.id] || "").trim().length > 0;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`
                    h-10 border font-mono-custom font-black text-sm flex items-center justify-center cursor-pointer transition-all duration-200 rounded-xl
                    ${
                      isActive
                        ? "bg-brutal-blue text-white border-brutal-blue shadow-md"
                        : hasAnswer
                          ? "bg-brutal-blue/10 text-brutal-blue border-transparent"
                          : "bg-background text-muted border-border hover:bg-accent-light"
                    }
                  `}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend Details */}
          <div className="space-y-3 text-xs font-mono-custom uppercase tracking-wider text-muted border-t border-border pt-4 font-bold">
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 bg-brutal-blue rounded-full inline-block" />
              <span>Current Question</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 bg-brutal-blue/10 border border-brutal-blue/30 rounded-full inline-block" />
              <span>Answered / Saved</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 bg-background border border-border rounded-full inline-block" />
              <span>Not Attempted</span>
            </div>
          </div>

          {/* Action Submission Block */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={handleSubmitAssessment}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-brutal-red text-white font-display font-bold text-sm uppercase rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              {isSubjective ? "Submit Assessment" : "Submit & Grade"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
