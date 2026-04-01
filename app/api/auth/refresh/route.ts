import { NextRequest } from "next/server";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth";
import { ok, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json();
  if (!refreshToken) return err("Refresh token required", 400);
  try {
    const payload = verifyRefreshToken(refreshToken);
    return ok({
      accessToken: signAccessToken({ userId: payload.userId, email: payload.email }),
      refreshToken: signRefreshToken({ userId: payload.userId, email: payload.email }),
    });
  } catch {
    return err("Invalid or expired refresh token", 401);
  }
}
