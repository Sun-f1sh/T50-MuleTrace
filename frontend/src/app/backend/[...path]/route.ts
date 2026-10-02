import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const protocol = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
    let sameOrigin = false;
    try { const parsed = new URL(origin ?? ""); sameOrigin = Boolean(host && parsed.host === host && parsed.protocol === `${protocol}:`); } catch { sameOrigin = false; }
    if (!sameOrigin) {
      return Response.json({ statusCode: 403, error: "OriginRejected", message: "Cross-origin mutations are not allowed." }, { status: 403 });
    }
  }
  const base = (process.env.MULETRACE_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const target = `${base}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const token = process.env.MULETRACE_API_TOKEN;
  if (token) headers.set("authorization", `Bearer ${token}`);
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(130_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json({ statusCode: 503, error: "BackendUnavailable", message: "MuleTrace API is unreachable. Start backend/main.py or check MULETRACE_BACKEND_URL." }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
export const OPTIONS = forward;
