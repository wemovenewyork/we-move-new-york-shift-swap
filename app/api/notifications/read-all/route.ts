import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function PUT(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  await prisma.notification.updateMany({
    where: { userId: user.userId, read: false },
    data: { read: true },
  });

  return ok({ success: true });
}
