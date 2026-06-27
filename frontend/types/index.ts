// ─── Core Data Contract ──────────────────────────────────────────────────────

export type AssessmentType = "mcq" | "true_false" | "subjective";

export interface Question {
  id: string;
  question: string;
  options?: string[]; // Only for MCQ and True/False (True/False is always ["True", "False"])
  correctAnswer?: string; // Only for MCQ and True/False
  expectedAnswer?: string; // Only for Subjective Q&A
  rubric?: string[]; // Only for Subjective Q&A
  explanation: string;
}

export interface GenerateResponse {
  questions: Question[];
  document_name: string;
  total_questions: number;
}

// ─── App State Machine ───────────────────────────────────────────────────────

export type AppState = "IDLE" | "PROCESSING" | "QUIZ" | "RESULTS";

export type ProcessingStep =
  | "uploading"
  | "reading"
  | "generating"
  | "complete";

// ─── Quiz Session ────────────────────────────────────────────────────────────

export interface QuizSession {
  questions: Question[];
  documentName: string;
  answers: Record<string, string | null>; // question id -> selected option or subjective typed text
  startedAt: number;
  completedAt?: number;
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  scorePercent: number;
  timeTakenSeconds: number;
  subjectiveEvaluations?: Record<string, SingleSubjectiveEvaluation>; // question id -> subjective feedback
}

// ─── Subjective Grading contract ─────────────────────────────────────────────

export interface SubjectiveAnswerSubmission {
  id: string;
  question: string;
  expectedAnswer: string;
  rubric: string[];
  userAnswer: string;
}

export interface SubjectiveEvaluationRequest {
  submissions: SubjectiveAnswerSubmission[];
}

export interface SingleSubjectiveEvaluation {
  id: string;
  score: number;
  missingConcepts: string[];
  suggestedAnswer: string;
  improvementRecommendations: string;
  isCorrect: boolean;
}

export interface SubjectiveEvaluationResponse {
  evaluations: SingleSubjectiveEvaluation[];
}

// ─── Tutor Chat ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface TutorRequest {
  question: Question;
  user_answer: string;
  messages: ChatMessage[];
}

export interface TutorResponse {
  reply: string;
}
