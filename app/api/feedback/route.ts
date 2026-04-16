import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ok, err } from "@/lib/apiResponse";
import { parseBody, BODY_4KB } from "@/lib/parseBody";

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  if (!await rateLimit(`feedback:${user.userId}`, 5, 3_600_000)) {
    return err("Too many feedback submissions — try again later", 429);
  }

  const body = await parseBody(req, BODY_4KB);
  if (body instanceof NextResponse) return body;
  const { message } = body as { message: string };
  if (!message?.trim()) return err("Message required", 400);
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      adminId: user.userId,
      action: "feedback",
      detail: message.trim().slice(0, 1000),
    },
  }).catch(() => {});
  return ok({ received: true });
}
