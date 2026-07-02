import os
import io
import sys
import uuid
import asyncio
import time
import re
import hmac
import hashlib
import urllib.request
import base64
import json
from typing import List, Optional

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

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


# ─── Support (Razorpay) Data Models ──────────────────────────────────────────

class SupportOrderRequest(BaseModel):
    amount: float = Field(..., description="Amount in INR, e.g. 20.00")

class SupportOrderResponse(BaseModel):
    order_id: Optional[str] = None
    amount: int = 0
    currency: str = "INR"
    key_id: Optional[str] = None
    is_mock: bool = False

class SupportVerifyRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

class SupportVerifyResponse(BaseModel):
    status: str
    message: str


# ─── Support (Razorpay) Endpoints ───────────────────────────────────────────

@app.post("/api/support/order", response_model=SupportOrderResponse, tags=["Support"])
async def create_support_order(request: SupportOrderRequest):
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    # If keys are missing, run in mock mode
    if not key_id or not key_secret or key_id.startswith("your_") or key_secret.startswith("your_"):
        print("[INFO] Razorpay keys not configured. Falling back to Mock Payment Mode.")
        return SupportOrderResponse(
            order_id=f"order_mock_{uuid.uuid4().hex[:12]}",
            amount=int(request.amount * 100),
            currency="INR",
            key_id="rzp_test_mockkeyid12345",
            is_mock=True
        )

    try:
        # Razorpay expects amount in paise (integers)
        amount_in_paise = int(request.amount * 100)
        
        # Base64 encode basic auth credentials
        auth_str = f"{key_id}:{key_secret}"
        auth_bytes = auth_str.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"receipt_support_{int(time.time())}"
        }
        
        # Call Razorpay Orders API
        def call_razorpay():
            req_obj = urllib.request.Request(
                "https://api.razorpay.com/v1/orders",
                data=json.dumps(payload).encode('utf-8'),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req_obj, timeout=10) as resp:
                return json.loads(resp.read().decode('utf-8'))

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, call_razorpay)
        
        return SupportOrderResponse(
            order_id=result["id"],
            amount=result["amount"],
            currency=result["currency"],
            key_id=key_id,
            is_mock=False
        )
    except Exception as e:
        print(f"[ERROR] Razorpay order creation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate payment order: {str(e)}"
        )


@app.post("/api/support/verify", response_model=SupportVerifyResponse, tags=["Support"])
async def verify_support_payment(request: SupportVerifyRequest):
    # Handle mock order verification
    if request.razorpay_order_id.startswith("order_mock_"):
        return SupportVerifyResponse(
            status="success",
            message="Mock signature verified successfully."
        )

    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_secret:
        raise HTTPException(
            status_code=500,
            detail="Razorpay configuration missing on server."
        )

    try:
        # Construct message: order_id | payment_id
        message = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
        
        # Verify HMAC SHA256 signature
        generated_signature = hmac.new(
            key_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        if generated_signature == request.razorpay_signature:
            return SupportVerifyResponse(
                status="success",
                message="Payment verified successfully."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid signature. Verification failed."
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Razorpay verification failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )


# ─── Support Metrics Models ──────────────────────────────────────────────────

class SupportMetricsResponse(BaseModel):
    total_chais_funded: int
    total_supporters: int
    total_amount_raised: int


# ─── Support Metrics Constants ──────────────────────────────────────────────
# Modify these metrics directly or via environment variables:
SUPPORT_METRICS = {
    "total_chais_funded": int(os.getenv("SUPPORT_TOTAL_CHAIS", "0")),
    "total_supporters": int(os.getenv("SUPPORT_TOTAL_SUPPORTERS", "0")),
    "total_amount_raised": int(os.getenv("SUPPORT_TOTAL_AMOUNT", "0")),
}


# ─── Support Metrics Endpoints ───────────────────────────────────────────────

@app.get("/api/support/metrics", response_model=SupportMetricsResponse, tags=["Support"])
async def get_support_metrics():
    return SupportMetricsResponse(**SUPPORT_METRICS)


# ─── Contact Support Models ──────────────────────────────────────────────────

class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    category: str = Field(..., min_length=1)
    subject: Optional[str] = None
    message: str = Field(..., min_length=1)

class ContactResponse(BaseModel):
    status: str
    message: str


# ─── Contact Endpoint ────────────────────────────────────────────────────────
def _get_email_templates(name: str, user_email: str, category: str, subject: Optional[str], message_body: str):
    text_content = (
        f"New Contact Form Submission\n"
        f"===========================\n\n"
        f"From:     {name} <{user_email}>\n"
        f"Category: {category}\n"
        f"Subject:  {subject or 'N/A'}\n\n"
        f"Message:\n"
        f"--------\n"
        f"{message_body}\n"
    )
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #202124; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dadce0; border-radius: 8px;">
        <h2 style="color: #4285F4; border-bottom: 2px solid #f1f3f4; padding-bottom: 10px; margin-top: 0;">
          📥 New Support Message
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 6px 0; font-weight: bold; width: 120px;">From:</td>
            <td style="padding: 6px 0;">{name} (&lt;<a href="mailto:{user_email}">{user_email}</a>&gt;)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Category:</td>
            <td style="padding: 6px 0;"><span style="background-color: #f1f3f4; padding: 3px 8px; border-radius: 12px; font-size: 13px;">{category}</span></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Subject:</td>
            <td style="padding: 6px 0;">{subject or 'N/A'}</td>
          </tr>
        </table>
        <div style="background-color: #f8f9fa; border-left: 4px solid #4285F4; padding: 15px; border-radius: 4px; margin-top: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #5f6368;">Message:</h4>
          <p style="margin: 0; white-space: pre-wrap;">{message_body}</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #dadce0; margin: 25px 0 15px 0;" />
        <p style="font-size: 11px; color: #5f6368; text-align: center; margin: 0;">
          Sent automatically by Verity IQ Support Portal
        </p>
      </body>
    </html>
    """
    return text_content, html_content


def _send_smtp_email_blocking(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    support_email: str,
    name: str,
    user_email: str,
    category: str,
    subject: Optional[str],
    message_body: str,
    text_content: str,
    html_content: str
):
    import smtplib
    from email.message import EmailMessage

    msg = EmailMessage()
    email_subject = f"[{category}] {subject or 'New Support Message'} from {name}"
    msg["Subject"] = email_subject
    msg["From"] = smtp_user
    msg["To"] = support_email
    msg.add_header("Reply-To", user_email)

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")

    if smtp_port == 465:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
    else:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.ehlo()
        server.starttls()
        server.ehlo()

    try:
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
    finally:
        server.quit()


def _send_resend_email_blocking(
    resend_api_key: str,
    support_email: str,
    name: str,
    user_email: str,
    category: str,
    subject: Optional[str],
    text_content: str,
    html_content: str
):
    import urllib.request
    import json

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }

    # Resend requires a verified domain or uses onboarding@resend.dev in sandbox mode.
    # We allow defining a custom sender in the environment (e.g. RESEND_FROM_EMAIL).
    # If not set, we default to "Verity IQ Support <onboarding@resend.dev>"
    from_email = os.getenv("RESEND_FROM_EMAIL", "") or "Verity IQ Support <onboarding@resend.dev>"

    payload = {
        "from": from_email,
        "to": [support_email],
        "reply_to": user_email,
        "subject": f"[{category}] {subject or 'New Support Message'} from {name}",
        "html": html_content,
        "text": text_content
    }

    req_obj = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method="POST"
    )

    with urllib.request.urlopen(req_obj, timeout=10) as resp:
        resp_data = json.loads(resp.read().decode('utf-8'))
        print(f"[INFO] Resend email sent successfully, id: {resp_data.get('id')}")


@app.post("/api/contact", response_model=ContactResponse, tags=["Support"])
async def send_contact_message(request: ContactRequest):
    """
    Forwards a contact form submission to the official support email via SMTP or Resend API.
    Falls back to console/terminal mock logging if credentials are not configured.
    """
    resend_api_key = os.getenv("RESEND_API_KEY", "")
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port_str = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    support_email = os.getenv("SUPPORT_EMAIL", "") or smtp_user or "support@verityiq.edu"

    # Pre-generate templates
    text_content, html_content = _get_email_templates(
        request.name, request.email, request.category, request.subject, request.message
    )

    is_resend_configured = bool(resend_api_key)
    is_smtp_configured = bool(smtp_host and smtp_user and smtp_password)

    if not is_resend_configured and not is_smtp_configured:
        try:
            print("\n" + "=" * 50)
            print("📥 [NEW CONTACT FORM SUBMISSION - MOCK MODE (Email Service Not Configured)]")
            print("-" * 50)
            print(f"Forwarded To: {support_email}")
            print(f"From:         {request.name} <{request.email}>")
            print(f"Category:     {request.category}")
            print(f"Subject:      {request.subject or 'N/A'}")
            print("-" * 50)
            print("Message:")
            print(request.message)
            print("=" * 50 + "\n")
            
            await asyncio.sleep(0.5)
            return ContactResponse(
                status="success",
                message="We've received your message (Mock Mode) and will get back to you soon."
            )
        except Exception as e:
            print(f"[ERROR] Mock contact form log failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to submit message: {str(e)}"
            )

    # 1. Prefer Resend API if configured (avoids port blocks on Render/etc.)
    if is_resend_configured:
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                _send_resend_email_blocking,
                resend_api_key,
                support_email,
                request.name,
                request.email,
                request.category,
                request.subject,
                text_content,
                html_content
            )
            return ContactResponse(
                status="success",
                message="We've received your message and will get back to you as soon as possible."
            )
        except Exception as e:
            print(f"[ERROR] Resend email dispatch failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send email message via Resend API: {str(e)}"
            )

    # 2. Fallback to SMTP
    try:
        try:
            smtp_port = int(smtp_port_str)
        except ValueError:
            smtp_port = 587

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            _send_smtp_email_blocking,
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_password,
            support_email,
            request.name,
            request.email,
            request.category,
            request.subject,
            request.message,
            text_content,
            html_content
        )
        return ContactResponse(
            status="success",
            message="We've received your message and will get back to you as soon as possible."
        )
    except Exception as e:
        print(f"[ERROR] SMTP email dispatch failed: {e}")
        # Add informative messaging about Render's port blocks
        error_msg = str(e)
        if "timeout" in error_msg.lower() or "connection refused" in error_msg.lower() or "connection timed out" in error_msg.lower():
            print("[TIP] If hosting on Render's Free tier, SMTP ports 25/465/587 are blocked. Consider setting RESEND_API_KEY in environment variables to send via HTTP.")
            error_msg += " (Note: SMTP ports may be blocked by your hosting provider. Consider configuring Resend API key instead.)"
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email message via SMTP: {error_msg}"
        )
