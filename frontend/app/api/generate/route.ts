import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${backendUrl}/api/generate`, {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      return new NextResponse(errorText, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[ERROR] Generate route proxy error:", err);
    return NextResponse.json({ error: err.message || "Proxy failed" }, { status: 502 });
  }
}
