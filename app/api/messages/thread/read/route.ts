import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }
  const { with: counterpartId } = await req.json();
  if (!counterpartId) return err("counterpartId required", 400);
  await prisma.message.updateMany({
    where: { fromUserId: counterpartId, toUserId: user.userId, read: false },
    data: { read: true },
  });
  return ok({ ok: true });
}
