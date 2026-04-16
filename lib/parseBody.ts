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

  // Stream-read up to maxBytes to enforce the limit even without Content-Length
  const reader = req.body?.getReader();
  if (!reader) return {} as T; // empty body — routes validate required fields themselves

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        reader.cancel().catch(() => {});
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder().decode(combined);
  if (!text.trim()) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
