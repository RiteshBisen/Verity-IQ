"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CheckSquare, MessageSquare, ArrowRight } from "lucide-react";

import Navbar from "@/components/Navbar";
import FileDropzone from "@/components/FileDropzone";
import ProcessingView from "@/components/ProcessingView";
import QuizView from "@/components/QuizView";
import ResultsView from "@/components/ResultsView";
import AboutDevelopers from "@/components/AboutDevelopers";

import { generateAssessment, ApiError } from "@/services/api";
import { Question, QuizResult, AppState, ProcessingStep, AssessmentType } from "@/types";

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("uploading");
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | null>>({});
  const [quizStartedAt, setQuizStartedAt] = useState<number>(0);
  
  // Custom personalization states
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("mcq");
  
  // Theme and Section states
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showAbout, setShowAbout] = useState(false);

  // Sync theme with document class on mount & changes
  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleThemeToggle = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // File dropped & generation trigger
  const handleFileDrop = useCallback(async (file: File) => {
    setCurrentFile(file);
    setAppState("PROCESSING");
    setProcessingStep("uploading");
    setShowAbout(false);

    try {
      const data = await generateAssessment(
        file,
        difficulty,
        questionCount,
        assessmentType,
        (step) => {
          setProcessingStep(step);
        }
      );

      // Brief pause to display completion state
      setProcessingStep("complete");
      await new Promise((r) => setTimeout(r, 600));

      setQuestions(data.questions);
      setDocumentName(data.document_name);
      setQuizStartedAt(Date.now());
      setAppState("QUIZ");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "An error occurred while communicating with FastAPI.";

      toast.error("Generation Failed", {
        description: message,
        duration: 6000,
      });

      setAppState("IDLE");
      setCurrentFile(null);
    }
  }, [difficulty, questionCount, assessmentType]);

  // Quiz completion handler
  const handleQuizComplete = useCallback(
    (result: QuizResult, answers: Record<string, string | null>) => {
      setQuizResult(result);
      setQuizAnswers(answers);
      setAppState("RESULTS");
    },
    []
  );

  // Retry handler
  const handleRetry = useCallback(() => {
    if (!currentFile) return;
    setQuizResult(null);
    setQuizAnswers({});
    setQuizStartedAt(Date.now());
    setAppState("QUIZ");
  }, [currentFile]);

  // Reset page state
  const handleNewFile = useCallback(() => {
    setAppState("IDLE");
    setCurrentFile(null);
    setQuestions([]);
    setDocumentName("");
    setQuizResult(null);
    setQuizAnswers({});
    setShowAbout(false);
  }, []);

  const handleHomeClick = useCallback(() => {
    handleNewFile();
  }, [handleNewFile]);

  const handleAboutClick = useCallback(() => {
    setShowAbout(true);
  }, []);

  const handleBackFromAbout = useCallback(() => {
    setShowAbout(false);
  }, []);

  // Determine current navbar routing highlight
  const getCurrentPageName = (): "home" | "about" | "quiz" | "results" => {
    if (showAbout) return "about";
    if (appState === "QUIZ") return "quiz";
    if (appState === "RESULTS") return "results";
    return "home";
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      
      {/* Dynamic Navbar */}
      <Navbar
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onHomeClick={handleHomeClick}
        onAboutClick={handleAboutClick}
        currentPage={getCurrentPageName()}
      />

      {/* Grid Pattern Sheet */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.07] dark:opacity-[0.04]">
        <div className="w-full h-full brutal-grid-line" />
      </div>

      {/* Primary Layout Wrapper */}
      {appState === "IDLE" && !showAbout && (
        <div className="w-full bg-card text-foreground py-24 px-6 border-b border-border relative overflow-hidden text-center flex flex-col items-center justify-center">
          
          {/* Subtle Decorative Background Soft Gradients (mimicking modern Google feel) */}
          <div className="absolute top-[-20%] left-[-10%] w-[40%] aspect-square rounded-full bg-brutal-blue/5 dark:bg-brutal-blue/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-30%] right-[-10%] w-[50%] aspect-square rounded-full bg-brutal-purple/5 dark:bg-brutal-purple/10 blur-3xl pointer-events-none" />

          {/* Product Hunt Style Badge */}
          <div className="absolute top-6 left-6 md:left-12 z-20 inline-flex items-center gap-2 px-3.5 py-1.5 bg-accent-light/60 text-foreground text-xs font-bold uppercase rounded-full shadow-sm backdrop-blur-md border border-border">
            <span className="w-2.5 h-2.5 bg-brutal-red rounded-full animate-pulse" />
            <span>AI Assessment Engine</span>
          </div>

          {/* Google Shapes Overlay (Matching Image 1 Reference) */}
          
          {/* 1. Top Left: Blue Circle with Yellow Triangle */}
          <div className="absolute left-4 md:left-12 lg:left-20 top-6 w-20 h-20 lg:w-28 lg:h-28 hidden sm:block select-none pointer-events-none animate-float-1">
            <svg viewBox="0 0 110 100" className="w-full h-full drop-shadow-xs">
              <circle cx="70" cy="50" r="30" fill="var(--accent-blue)" />
              <polygon points="20,50 45,30 45,70" fill="var(--accent-yellow)" />
            </svg>
          </div>

          {/* 2. Top Middle-Right: Red Cloud/Flower Blossom */}
          <div className="absolute left-[45%] top-4 w-12 h-12 lg:w-16 lg:h-16 hidden md:block select-none pointer-events-none opacity-90 animate-float-2">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
              <path 
                d="M50 20 C60 10 75 10 85 20 C95 30 95 45 85 55 C95 65 95 80 85 90 C75 100 60 100 50 90 C40 100 25 100 15 90 C5 80 5 65 15 55 C5 45 5 30 15 20 C25 10 40 10 50 20 Z" 
                fill="var(--accent-red)" 
              />
            </svg>
          </div>

          {/* 3. Top Right: Purple blossom with Red Star center */}
          <div className="absolute right-4 md:right-12 lg:right-20 top-6 w-20 h-20 lg:w-28 lg:h-28 hidden sm:block select-none pointer-events-none animate-float-2 [animation-delay:1.5s]">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
              <path 
                d="M50 10 C65 10 80 15 85 30 C90 45 100 60 90 75 C80 90 65 90 50 90 C35 90 20 90 15 75 C10 60 20 45 25 30 C30 15 35 10 50 10 Z" 
                fill="var(--accent-purple)" 
                opacity="0.8"
              />
              <path 
                d="M 50 32 Q 50 50 32 50 Q 50 50 50 68 Q 50 50 68 50 Q 50 50 50 32 Z" 
                fill="var(--accent-red)" 
              />
            </svg>
          </div>

          {/* 4. Bottom Left: Large Blue Blossom with Pink Star center */}
          <div className="absolute left-4 md:left-12 lg:left-20 bottom-6 w-24 h-24 lg:w-36 lg:h-36 hidden sm:block select-none pointer-events-none animate-float-3">
            <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-xs">
              <path 
                d="M 60 15 C 65 15 70 20 72 25 C 78 20 85 22 86 28 C 92 26 97 31 96 37 C 101 39 102 46 99 50 C 102 54 101 61 96 63 C 97 69 92 74 86 72 C 85 78 78 80 72 75 C 70 80 65 85 60 85 C 55 85 50 80 48 75 C 42 80 35 78 34 72 C 28 74 23 69 24 63 C 19 61 18 54 21 50 C 18 46 19 39 24 37 C 23 31 28 26 34 28 C 35 22 42 20 48 25 C 50 20 55 15 60 15 Z" 
                fill="var(--accent-blue)" 
              />
              <path 
                d="M 60 38 Q 60 50 48 50 Q 60 50 60 62 Q 60 50 72 50 Q 60 50 60 38 Z" 
                fill="#FFB2B2" 
              />
            </svg>
          </div>

          {/* 5. Bottom Middle-Left: Red flower with Pink Star center */}
          <div className="absolute left-[30%] bottom-4 w-14 h-14 lg:w-20 lg:h-20 hidden md:block select-none pointer-events-none animate-float-1 [animation-delay:2s]">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
              <path 
                d="M 50 15 C 60 5 75 10 80 20 C 85 30 95 35 90 48 C 95 60 90 75 80 80 C 70 85 60 95 50 85 C 40 95 30 85 20 80 C 10 75 5 60 10 48 C 5 35 15 30 20 20 C 25 10 40 5 50 15 Z" 
                fill="var(--accent-red)" 
              />
              <path 
                d="M 50 35 Q 50 50 35 50 Q 50 50 50 65 Q 50 50 65 50 Q 50 50 50 35 Z" 
                fill="#FFB2B2" 
              />
            </svg>
          </div>

          {/* 6. Bottom Middle-Right: Yellow Triangle */}
          <div className="absolute right-[28%] bottom-4 w-10 h-10 lg:w-16 lg:h-16 hidden sm:block select-none pointer-events-none animate-float-4">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
              <polygon points="20,80 80,50 30,20" fill="var(--accent-yellow)" />
            </svg>
          </div>

          {/* 7. Bottom Right: Stacked Green Domes */}
          <div className="absolute right-4 md:right-12 lg:right-20 bottom-6 w-20 h-20 lg:w-28 lg:h-28 hidden sm:block select-none pointer-events-none animate-float-3 [animation-delay:1s]">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
              <path d="M 10 40 A 40 40 0 0 1 90 40 Z" fill="var(--accent-green)" />
              <path d="M 10 60 A 40 40 0 0 0 90 60 Z" fill="var(--accent-green)" />
            </svg>
          </div>

          {/* Banner Typography */}
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-foreground">
              Generate Smart Quizzes <br />
              <span className="text-brutal-blue">From Any Document</span>
            </h1>
            
            <p className="text-sm md:text-base text-muted leading-relaxed max-w-xl mx-auto font-medium">
              Verity IQ reads your files (PDF, DOCX, TXT) and formulates academic multiple-choice quizzes, true/false modules, or detailed subjective Q&A critiques — autonomously powered by Gemini.
            </p>
          </div>
        </div>
      )}

      {/* Primary Layout Wrapper */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center w-full ${appState === "IDLE" && !showAbout ? "px-4 pb-20 sm:px-6 sm:pb-24" : "px-4 py-8 sm:px-6 sm:py-12"}`}>
        <AnimatePresence mode="wait">
          
          {/* ── ABOUT DEVELOPERS SECTION ── */}
          {showAbout ? (
            <motion.div
              key="about-devs"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <AboutDevelopers onClose={handleBackFromAbout} />
            </motion.div>
          ) : (
            <>
              {/* ── IDLE / LANDING HERO & INPUT ── */}
              {appState === "IDLE" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-6xl space-y-12 -mt-16 z-20 relative"
                >
                  {/* Settings Setup Panel & Dropzone */}
                  <div id="setup-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                    
                    {/* Settings Form Column */}
                    <div className="lg:col-span-5 border-2 border-black dark:border-white bg-card p-5 sm:p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
                      <div className="border-b border-border pb-3 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-brutal-blue rounded-full" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Assessment Builder
                        </h3>
                      </div>

                      {/* 1. Assessment Type Selector */}
                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold text-muted block">
                          Format Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "mcq", label: "MCQ" },
                            { id: "true_false", label: "T / F" },
                            { id: "subjective", label: "Q & A" },
                          ].map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setAssessmentType(type.id as AssessmentType)}
                              className={`
                                py-2 border rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer shadow-sm
                                ${
                                  assessmentType === type.id
                                    ? "bg-brutal-blue text-white border-brutal-blue"
                                    : "bg-card text-foreground border-border hover:bg-accent-light"
                                }
                              `}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Difficulty Selector */}
                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold text-muted block">
                          Difficulty Range
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {["easy", "medium", "hard"].map((level) => (
                            <button
                              key={level}
                              onClick={() => setDifficulty(level)}
                              className={`
                                py-2 border rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer shadow-sm
                                ${
                                  difficulty === level
                                    ? "bg-brutal-blue text-white border-brutal-blue"
                                    : "bg-card text-foreground border-border hover:bg-accent-light"
                                }
                              `}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Question Count range slider */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-semibold text-muted">
                          <span>Question Quantity</span>
                          <span className="bg-accent-light border border-border px-2.5 py-0.5 rounded-full text-foreground text-xs font-semibold">
                            {questionCount}
                          </span>
                        </div>
                        <div className="flex items-center h-10 px-4 bg-accent-light/50 border border-border rounded-full">
                          <input
                            type="range"
                            min="5"
                            max="20"
                            step="1"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            className="w-full accent-brutal-blue bg-border cursor-pointer h-1.5 rounded-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Content Input Dropzone Column */}
                    <div className="lg:col-span-7">
                      <FileDropzone onFileDrop={handleFileDrop} />
                    </div>

                  </div>

                  {/* Redesigned Features / Geometric cards below setup panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                    <div className="border border-border bg-card p-6 rounded-2xl shadow-md flex items-start gap-4">
                      <div className="w-10 h-10 bg-brutal-blue/10 text-brutal-blue rounded-full flex items-center justify-center shrink-0">
                        <CheckSquare className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">MCQ & T/F Assessments</h4>
                        <p className="text-xs text-muted mt-1 leading-relaxed">Instant logic reviews, options, and comprehensive academic explanations.</p>
                      </div>
                    </div>

                    <div className="border border-border bg-card p-6 rounded-2xl shadow-md flex items-start gap-4">
                      <div className="w-10 h-10 bg-brutal-yellow/10 text-brutal-yellow rounded-full flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Subjective AI Critique</h4>
                        <p className="text-xs text-muted mt-1 leading-relaxed">Write short answers and receive evaluation scores, rubrics checklist, and improvement tips.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── PROCESSING VIEW ── */}
              {appState === "PROCESSING" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="w-full max-w-5xl"
                >
                  <ProcessingView
                    fileName={currentFile?.name || "Study Material"}
                    currentStep={processingStep}
                  />
                </motion.div>
              )}

              {/* ── QUIZ assessment state ── */}
              {appState === "QUIZ" && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <QuizView
                    questions={questions}
                    documentName={documentName}
                    startedAt={quizStartedAt}
                    assessmentType={assessmentType}
                    onComplete={handleQuizComplete}
                  />
                </motion.div>
              )}

              {/* ── RESULTS dashboard view ── */}
              {appState === "RESULTS" && quizResult && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <ResultsView
                    result={quizResult}
                    questions={questions}
                    answers={quizAnswers}
                    documentName={documentName}
                    assessmentType={assessmentType}
                    onRetry={handleRetry}
                    onNewFile={handleNewFile}
                  />
                </motion.div>
              )}
            </>
          )}

        </AnimatePresence>
      </div>

      {/* Footer Banner */}
      <footer className="relative z-10 py-6 text-center border-t border-border bg-card">
        <p className="text-xs text-muted font-medium">
          Verity IQ · Education Framework · Powered by Google Gemini AI
        </p>
      </footer>
    </main>
  );
}
