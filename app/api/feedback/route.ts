import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { message } = await req.json();
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
