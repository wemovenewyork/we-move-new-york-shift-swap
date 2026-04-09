import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const RESET_SECRET = process.env.JWT_RESET_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET || !RESET_SECRET) {
  throw new Error(
    "JWT_SECRET, JWT_REFRESH_SECRET, and JWT_RESET_SECRET environment variables must be set"
  );
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET!, { expiresIn: "15m" });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET!, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET!) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET!) as TokenPayload;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // Prefer HttpOnly cookie (XSS-safe); fall back to Authorization header
  const cookie = req.cookies.get("accessToken")?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function getUserFromRequest(req: NextRequest): TokenPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export function requireUser(req: NextRequest): TokenPayload {
  const user = getUserFromRequest(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

// Separate secret for password-reset tokens — compromise of ACCESS_SECRET
// cannot be used to forge reset tokens and vice versa.
export function signResetToken(userId: string): string {
  return jwt.sign({ userId, type: "reset" }, RESET_SECRET!, { expiresIn: "1h" });
}

export function verifyResetToken(token: string): { userId: string } {
  const payload = jwt.verify(token, RESET_SECRET!) as { userId: string; type: string };
  if (payload.type !== "reset") throw new Error("Invalid token type");
  return { userId: payload.userId };
}
