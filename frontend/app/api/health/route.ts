import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/health");
    if (!res.ok) {
      return NextResponse.json({ error: "Backend unhealthy" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Backend unreachable: " + err.message }, { status: 502 });
  }
}
