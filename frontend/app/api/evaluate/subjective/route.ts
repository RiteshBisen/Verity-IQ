import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${backendUrl}/api/evaluate/subjective`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      return new NextResponse(errorText, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[ERROR] Subjective evaluate route proxy error:", err);
    return NextResponse.json({ error: err.message || "Proxy failed" }, { status: 502 });
  }
}
