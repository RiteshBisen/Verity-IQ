import { GenerateResponse, TutorRequest, TutorResponse, SupportOrderResponse, SupportVerifyResponse, SupportMetrics, ContactRequest, ContactResponse } from "@/types";
import { COMMUNITY_SUPPORT_METRICS } from "@/config/support";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ─── API Error ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Generate Assessment ──────────────────────────────────────────────────────

/**
 * Uploads a file to the FastAPI backend and returns the generated questions.
 * Uses FormData so the actual binary file is sent.
 */
export async function generateAssessment(
  file: File,
  difficulty: string = "medium",
  questionCount: number = 10,
  assessmentType: string = "mcq",
  onProgress?: (step: "uploading" | "reading" | "generating") => void
): Promise<GenerateResponse> {
  // Signal: uploading
  onProgress?.("uploading");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("difficulty", difficulty);
  formData.append("question_count", questionCount.toString());
  formData.append("assessment_type", assessmentType);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: "POST",
      body: formData,
    });
  } catch (networkError) {
    throw new ApiError(
      0,
      "Cannot reach the server. Please check that the backend is running."
    );
  }

  // Signal: reading (Gemini is processing the file)
  onProgress?.("reading");

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorMessage;
    } catch {
      // JSON parse failed
    }

    throw new ApiError(response.status, errorMessage);
  }

  // Signal: generating (parsing response)
  onProgress?.("generating");

  const data: GenerateResponse = await response.json();
  return data;
}

// ─── Evaluate Subjective Q&A ──────────────────────────────────────────────────

import { SubjectiveAnswerSubmission, SubjectiveEvaluationResponse } from "@/types";

export async function evaluateSubjective(
  submissions: SubjectiveAnswerSubmission[]
): Promise<SubjectiveEvaluationResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/evaluate/subjective`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissions }),
    });
  } catch (networkError) {
    throw new ApiError(
      0,
      "Cannot reach the server. Please check that the backend is running."
    );
  }

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorMessage;
    } catch {
      // JSON parse failed
    }
    throw new ApiError(response.status, errorMessage);
  }

  const data: SubjectiveEvaluationResponse = await response.json();
  return data;
}

// ─── Chat with Tutor ──────────────────────────────────────────────────────────

export async function chatWithTutor(request: TutorRequest): Promise<TutorResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/tutor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch (networkError) {
    throw new ApiError(
      0,
      "Cannot reach the server. Please check that the backend is running."
    );
  }

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorMessage;
    } catch {
      // JSON parse failed — keep the generic message
    }

    throw new ApiError(response.status, errorMessage);
  }

  const data: TutorResponse = await response.json();
  return data;
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Support (Buy Us a Chai) ──────────────────────────────────────────────────

export async function createSupportOrder(amount: number): Promise<SupportOrderResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/support/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });
  } catch (networkError) {
    throw new ApiError(
      0,
      "Cannot reach the server. Please check that the backend is running."
    );
  }

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorMessage;
    } catch {
      // JSON parse failed
    }
    throw new ApiError(response.status, errorMessage);
  }

  const data: SupportOrderResponse = await response.json();
  return data;
}

export async function verifySupportPayment(
  paymentId: string,
  orderId: string,
  signature: string
): Promise<SupportVerifyResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/support/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
      }),
    });
  } catch (networkError) {
    throw new ApiError(
      0,
      "Cannot reach the server. Please check that the backend is running."
    );
  }

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorMessage;
    } catch {
      // JSON parse failed
    }
    throw new ApiError(response.status, errorMessage);
  }

  const data: SupportVerifyResponse = await response.json();
  return data;
}

// ─── Fetch Support Metrics ───────────────────────────────────────────────────

export async function getSupportMetrics(): Promise<SupportMetrics> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/support/metrics`);
    if (!response.ok) {
      throw new Error("Failed to fetch metrics from server");
    }
    return await response.json();
  } catch (error) {
    console.warn("Fallback to local support metrics configuration:", error);
    return {
      total_chais_funded: COMMUNITY_SUPPORT_METRICS.totalChaisFunded,
      total_supporters: COMMUNITY_SUPPORT_METRICS.totalSupporters,
      total_amount_raised: COMMUNITY_SUPPORT_METRICS.totalAmountRaised,
    };
  }
}

// ─── Contact Us Form ──────────────────────────────────────────────────────────

export async function sendContactMessage(data: ContactRequest): Promise<ContactResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (networkError) {
    throw new ApiError(
      0,
      "Cannot reach the server. Please check that the backend is running."
    );
  }

  if (!response.ok) {
    let errorMessage = `Server error: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorMessage;
    } catch {
      // JSON parse failed
    }
    throw new ApiError(response.status, errorMessage);
  }

  const result: ContactResponse = await response.json();
  return result;
}

