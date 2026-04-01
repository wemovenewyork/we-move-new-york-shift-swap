import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const messages = await prisma.message.findMany({
    where: { toUserId: user.userId },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, firstName: true, lastName: true } },
      swap: { select: { id: true, details: true, category: true } },
    },
  });

  return ok(messages);
}
