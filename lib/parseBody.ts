import { NextResponse } from "next/server";

/** Default 16 KB — generous for complex bodies, blocks garbage payloads */
export const BODY_16KB = 16_384;
export const BODY_4KB  = 4_096;
export const BODY_2KB  = 2_048;
export const BODY_1KB  = 1_024;

/**
 * Parse request JSON with a hard size limit.
 *
 * Returns the parsed body, or a NextResponse (413/400) if the payload is
 * oversized or malformed. Check `instanceof NextResponse` at the call site:
 *
 *   const body = await parseBody(req, BODY_1KB);
 *   if (body instanceof NextResponse) return body;
 *   const { email, password } = body;
 */
export async function parseBody<T = Record<string, unknown>>(
  req: Request,
  maxBytes = BODY_16KB
): Promise<T | NextResponse> {
  // Fast path: reject on Content-Length before reading anything
  const cl = req.headers.get("content-length");
  if (cl !== null && Number(cl) > maxBytes) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Use arrayBuffer() — the standard Web API approach, compatible with Next.js App Router
  // on Vercel. The manual stream reader approach is unreliable because Vercel may
  // pre-buffer the body, causing getReader() to throw "Body already used".
  // Vercel hard-caps request bodies at 4.5 MB, so buffering here is safe.
  let buf: ArrayBuffer;
  try {
    buf = await req.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  if (buf.byteLength === 0) return {} as T; // empty body

  if (buf.byteLength > maxBytes) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const text = new TextDecoder().decode(buf);
  if (!text.trim()) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
