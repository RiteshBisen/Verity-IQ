import os
import io
import uuid
import asyncio
import time
import re
from typing import List

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from dotenv import load_dotenv

from google import genai
from google.genai import types

load_dotenv()

# ─── App Init ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="MCQ Generator API",
    description="Autonomous MCQ generation from uploaded documents using Gemini AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
    allow_origin_regex=r"https://.*\.(serveousercontent\.com|lhr\.life|loca\.lt)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Gemini Client ───────────────────────────────────────────────────────────

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY environment variable is not set.")

client = genai.Client(api_key=GOOGLE_API_KEY)

MODEL_ID = "gemini-2.5-flash"

def get_system_instruction(difficulty: str, question_count: int, assessment_type: str) -> str:
    link_prohibition = (
        " You MUST NOT include any hyperlinks, URLs, or web links (e.g., http://, https://, www.) in any of the questions, "
        "options, correct answers, rubrics, or explanations. All explanations and questions must be written using plain text only. "
        "Additionally, if analyzing a PDF, inspect each page. If any page contains multiple hyperlinks or web links (2 or more links), "
        "you MUST completely ignore that page and avoid generating any questions or extracting any facts from it."
    )
    if assessment_type == "true_false":
        return (
            f"You are an expert academic examiner. Analyze the uploaded file thoroughly. "
            f"Generate exactly {question_count} True/False questions "
            f"at a '{difficulty}' difficulty level based ONLY on the content of this file. "
            "Each question must have options exactly equal to ['True', 'False'], a correctAnswer which is either 'True' or 'False', and a clear explanation. "
            f"Ensure the questions are appropriate for a '{difficulty}' difficulty."
            f"{link_prohibition}"
            " Do NOT add any preamble or commentary outside the JSON structure."
        )
    elif assessment_type == "subjective":
        return (
            f"You are an expert academic examiner. Analyze the uploaded file thoroughly. "
            f"Generate exactly {question_count} subjective, short-answer questions "
            f"at a '{difficulty}' difficulty level based ONLY on the content of this file. "
            "For each question, provide the question text, a comprehensive expectedAnswer, a rubric (list of 3-5 key concept points or keywords that must be covered in a good response), and a helpful explanation. "
            f"Ensure the questions are appropriate for a '{difficulty}' difficulty."
            f"{link_prohibition}"
            " Do NOT add any preamble or commentary outside the JSON structure."
        )
    else: # mcq
        return (
            f"You are an expert academic examiner. Analyze the uploaded file thoroughly. "
            f"Generate exactly {question_count} well-crafted multiple-choice questions (MCQs) "
            f"at a '{difficulty}' difficulty level based ONLY on the content of this file. "
            "Each question must have exactly 4 options (A, B, C, D format embedded "
            "in the option text), one correctAnswer, and a concise but thorough explanation. "
            f"Ensure the questions are appropriate for a '{difficulty}' difficulty."
            f"{link_prohibition}"
            " Do NOT add any preamble or commentary outside the JSON structure."
        )


# ─── Data Models ─────────────────────────────────────────────────────────────

# ─── Data Models ─────────────────────────────────────────────────────────────

from typing import Optional

class Question(BaseModel):
    id: str = Field(description="Unique identifier for the question, e.g. 'q1', 'q2'")
    question: str = Field(description="The full question text")
    options: Optional[List[str]] = Field(default=None, description="Exactly 4 answer options for MCQ. For True/False, always ['True', 'False']. For subjective Q&A, omit or set to null.")
    correctAnswer: Optional[str] = Field(default=None, description="The exact string of the correct option for MCQ or True/False. For subjective, omit or set to null.")
    expectedAnswer: Optional[str] = Field(default=None, description="A detailed ideal answer for subjective. Omit for MCQ and True/False.")
    rubric: Optional[List[str]] = Field(default=None, description="A list of 3-5 key points or keywords that must be covered in subjective answers. Omit for MCQ and True/False.")
    explanation: str = Field(description="A clear explanation of why the answer is correct or the core concepts assessed.")

class GenerateResponse(BaseModel):
    questions: List[Question]
    document_name: str
    total_questions: int

class ChatMessage(BaseModel):
    role: str
    content: str

class TutorRequest(BaseModel):
    question: Question
    user_answer: str
    messages: List[ChatMessage]

class TutorResponse(BaseModel):
    reply: str

# Subjective AI evaluation models
class SubjectiveAnswerSubmission(BaseModel):
    id: str
    question: str
    expectedAnswer: str
    rubric: List[str]
    userAnswer: str

class SubjectiveEvaluationRequest(BaseModel):
    submissions: List[SubjectiveAnswerSubmission]

class SingleSubjectiveEvaluation(BaseModel):
    id: str
    score: int = Field(description="Evaluation score out of 100 representing how complete and correct the student answer is")
    missingConcepts: List[str] = Field(description="Key concepts or points from the rubric that were missing in the user's answer")
    suggestedAnswer: str = Field(description="A refined, polished version of the user's answer or an ideal response")
    improvementRecommendations: str = Field(description="Clear, constructive, and encouraging feedback advising how the user can improve and what they got wrong")
    isCorrect: bool = Field(description="True if score >= 70, otherwise False")

class SubjectiveEvaluationResponse(BaseModel):
    evaluations: List[SingleSubjectiveEvaluation]


# ─── MIME Type Helper ─────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
}

def extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Extracts raw paragraph text from a DOCX file using Python's standard zipfile and xml parsing.
    Requires no external library dependencies.
    """
    import zipfile
    import xml.etree.ElementTree as ET
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for para in root.findall('.//w:p', namespaces):
                texts = [node.text for node in para.findall('.//w:t', namespaces) if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n".join(paragraphs)
    except Exception as e:
        print(f"[ERROR] Failed to parse DOCX: {e}")
        return ""

# Regex for matching URLs, www domains, and markdown links
URL_REGEX = re.compile(
    r'(https?://[^\s]+)|(www\.[^\s]+)|(\[[^\]]+\]\((?:https?://|www\.)[^\s)]+\))',
    re.IGNORECASE
)

def sanitize_text(text: str) -> str:
    """
    Strips markdown links, http/https, and www domains from the text.
    Replaces markdown link e.g. [Anchor](http://url) with Anchor.
    """
    # 1. Resolve markdown links first: [text](http://url) -> text
    resolved_markdown = re.sub(
        r'\[([^\]]+)\]\((?:https?://|www\.)[^\s)]+\)',
        r'\1',
        text,
        flags=re.IGNORECASE
    )
    # 2. Strip standard URLs/URIs
    cleared_urls = re.sub(
        r'https?://[^\s]+|www\.[^\s]+',
        '',
        resolved_markdown,
        flags=re.IGNORECASE
    )
    return cleared_urls



MAX_FILE_SIZE_MB = 20
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "MCQ Generator API is running", "model": MODEL_ID}

@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

@app.post("/api/tutor", response_model=TutorResponse, tags=["Quiz"])
async def chat_with_tutor(request: TutorRequest):
    try:
        system_instruction = (
            "You are an expert, encouraging academic tutor. A student got a multiple-choice question wrong. "
            "Help them understand why their answer was incorrect and guide them to the correct reasoning. "
            "Be conversational, concise, and helpful. Do not just give the answer away if they ask another question; help them learn."
        )
        
        context_prompt = (
            f"Question: {request.question.question}\n"
            f"Options: {', '.join(request.question.options)}\n"
            f"Correct Answer: {request.question.correctAnswer}\n"
            f"Explanation: {request.question.explanation}\n"
            f"Student's Incorrect Answer: {request.user_answer}\n\n"
            "The student will now chat with you about this question."
        )

        contents = [types.Content(role="user", parts=[types.Part.from_text(text=context_prompt)]), 
                    types.Content(role="model", parts=[types.Part.from_text(text="I am ready to help you understand this question.")])]
        
        for msg in request.messages:
            role = "user" if msg.role == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))
            
        print(f"[INFO] Chatting with tutor. History length: {len(request.messages)}")

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=contents,
            config=types.GenerateContentConfig(
                systemInstruction=system_instruction,
                temperature=0.7,
                maxOutputTokens=4096,
            ),
        )
        
        reply = response.text
        if not reply:
            raise HTTPException(status_code=500, detail="AI returned an empty response.")
            
        return TutorResponse(reply=reply)
    except Exception as e:
        print(f"[ERROR] Tutor chat error: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.post("/api/generate", response_model=GenerateResponse, tags=["Quiz"])
async def generate_mcqs(
    file: UploadFile = File(...),
    difficulty: str = Form("medium"),
    question_count: int = Form(10),
    assessment_type: str = Form("mcq")
):
    """
    Accept a PDF, TXT, or DOCX document upload and return AI-generated questions matching the assessment format.
    """

    # ── Validate MIME type ──────────────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: '{content_type}'.",
        )

    # ── Read file bytes ─────────────────────────────────────────────────────
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE_MB}MB.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    gemini_file = None

    try:
        # ── Formulate Instructions ──────────────────────────────────────────
        prompt_instruction = f"Generate exactly {question_count} well-crafted multiple-choice questions (MCQs) at a {difficulty} difficulty from this document. Return a JSON array."
        if assessment_type == "true_false":
            prompt_instruction = f"Generate exactly {question_count} True/False questions at a {difficulty} difficulty from this document. Return a JSON array."
        elif assessment_type == "subjective":
            prompt_instruction = f"Generate exactly {question_count} subjective, short-answer questions at a {difficulty} difficulty from this document. Return a JSON array."

        # ── Split Pathway: In-Memory Text Extraction vs Files API ───────────
        if content_type in ["text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]:
            print(f"[INFO] Extracting text in-memory from '{file.filename}'...")
            if content_type == "text/plain":
                raw_text = file_bytes.decode("utf-8", errors="ignore")
                text_content = sanitize_text(raw_text)
            else:
                raw_text = extract_text_from_docx(file_bytes)
                text_content = sanitize_text(raw_text)

            if not text_content or not text_content.strip():
                raise HTTPException(
                    status_code=422,
                    detail="Failed to extract readable text from the document. Please ensure it is not empty.",
                )

            contents = [
                f"--- STUDY DOCUMENT TEXT CONTENT ---\n{text_content}\n--- END OF STUDY DOCUMENT ---\n\n",
                prompt_instruction,
            ]
        else:
            # ── PDF Inline Bytes ─────────────────────────────────────────────
            print(f"[INFO] Passing '{file.filename}' ({len(file_bytes)} bytes) as inline PDF bytes...")
            contents = [
                types.Part.from_bytes(
                    data=file_bytes,
                    mime_type=content_type,
                ),
                prompt_instruction,
            ]

        # ── Generate Questions via Gemini ─────────────────────────────────────
        print(f"[INFO] Generating '{assessment_type}' questions with model: {MODEL_ID}...")

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=contents,
            config=types.GenerateContentConfig(
                systemInstruction=get_system_instruction(difficulty, question_count, assessment_type),
                responseMimeType="application/json",
                responseSchema=list[Question],
                temperature=0.4,
                maxOutputTokens=8192,
            ),
        )

        # ── Parse response ───────────────────────────────────────────────────
        raw_text = response.text
        if not raw_text:
            raise HTTPException(
                status_code=500,
                detail="AI returned an empty response. Please try again.",
            )

        # Gemini structured output returns a JSON array directly
        import json
        parsed = json.loads(raw_text)

        # Handle both array and wrapped object formats
        if isinstance(parsed, list):
            questions_data = parsed
        elif isinstance(parsed, dict) and "questions" in parsed:
            questions_data = parsed["questions"]
        else:
            questions_data = parsed if isinstance(parsed, list) else [parsed]

        # Validate and assign IDs
        questions: List[Question] = []
        for i, item in enumerate(questions_data):
            if isinstance(item, dict):
                item["id"] = item.get("id", f"q{i + 1}")
                questions.append(Question(**item))

        if not questions:
            raise HTTPException(
                status_code=500,
                detail="AI failed to generate valid questions. Please try a different document.",
            )

        print(f"[INFO] Successfully generated {len(questions)} questions.")

        return GenerateResponse(
            questions=questions,
            document_name=file.filename or "Uploaded Document",
            total_questions=len(questions),
        )

    except HTTPException:
        raise

    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}",
        )





@app.post("/api/evaluate/subjective", response_model=SubjectiveEvaluationResponse, tags=["Quiz"])
async def evaluate_subjective_answers(request: SubjectiveEvaluationRequest):
    """
    Grade a batch of subjective student answers against expected answers and rubrics using Gemini.
    """
    try:
        print(f"[INFO] Evaluating {len(request.submissions)} subjective submissions...")
        
        system_instruction = (
            "You are an expert academic evaluator. You will be given a list of questions, their expected answers, rubrics, and the student's submitted answers. "
            "Evaluate each student answer objectively against the expected answer and the rubric. "
            "Grade the answer on a scale from 0 to 100. Be fair but strict; check if the key concepts in the rubric are mentioned or implied. "
            "Identify any key concepts from the rubric that are missing. "
            "Provide a constructive, encouraging improvement recommendation focusing on what was wrong or missing. "
            "Provide a high-quality suggestedAnswer. "
            "Return the evaluations as a structured JSON object fitting the response schema."
        )
        
        # Build prompt from submissions
        prompt_parts = []
        for i, sub in enumerate(request.submissions):
            prompt_parts.append(
                f"--- SUBMISSION {i+1} ---\n"
                f"ID: {sub.id}\n"
                f"Question: {sub.question}\n"
                f"Expected Answer: {sub.expectedAnswer}\n"
                f"Rubric: {', '.join(sub.rubric)}\n"
                f"Student Answer: {sub.userAnswer}\n"
            )
        
        prompt_text = "\n".join(prompt_parts) + "\n\nEvaluate all submissions and return as a JSON object matching SubjectiveEvaluationResponse."
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt_text,
            config=types.GenerateContentConfig(
                systemInstruction=system_instruction,
                responseMimeType="application/json",
                responseSchema=SubjectiveEvaluationResponse,
                temperature=0.2,
                maxOutputTokens=8192,
            ),
        )
        
        raw_text = response.text
        if not raw_text:
            raise HTTPException(
                status_code=500,
                detail="AI evaluation returned empty response. Please try again.",
            )
            
        import json
        parsed = json.loads(raw_text)
        
        return SubjectiveEvaluationResponse(**parsed)
        
    except Exception as e:
        print(f"[ERROR] Subjective evaluation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Subjective evaluation failed: {str(e)}",
        )
