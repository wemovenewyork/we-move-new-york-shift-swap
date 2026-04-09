import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth";
import { err } from "@/lib/apiResponse";
import { blockRefreshToken, isRefreshTokenBlocked } from "@/lib/tokenBlocklist";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken) return err("Refresh token required", 400);

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Reject if token has been revoked
    const tokenHash = hashToken(refreshToken);
    if (await isRefreshTokenBlocked(tokenHash)) {
      return err("Token has been revoked", 401);
    }

    // Revoke the current refresh token (token rotation — each token usable once)
    const decoded = JSON.parse(Buffer.from(refreshToken.split(".")[1], "base64url").toString());
    const ttlSeconds = Math.max(0, (decoded.exp ?? 0) - Math.floor(Date.now() / 1000));
    await blockRefreshToken(tokenHash, ttlSeconds);

    const newAccessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    const newRefreshToken = signRefreshToken({ userId: payload.userId, email: payload.email });

    const res = NextResponse.json({ ok: true });

    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/",
      maxAge: 900,
    });
    res.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 604800,
    });

    return res;
  } catch {
    return err("Invalid or expired refresh token", 401);
  }
}
