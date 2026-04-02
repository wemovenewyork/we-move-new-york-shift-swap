import { NextRequest } from "next/server";
import { ok } from "@/lib/apiResponse";
import { blockRefreshToken } from "@/lib/tokenBlocklist";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json().catch(() => ({}));

  if (refreshToken) {
    try {
      const decoded = JSON.parse(Buffer.from(refreshToken.split(".")[1], "base64url").toString());
      const ttlSeconds = Math.max(0, (decoded.exp ?? 0) - Math.floor(Date.now() / 1000));
      await blockRefreshToken(hashToken(refreshToken), ttlSeconds);
    } catch { /* non-fatal — token may be expired already */ }
  }

  return ok({ loggedOut: true });
}
