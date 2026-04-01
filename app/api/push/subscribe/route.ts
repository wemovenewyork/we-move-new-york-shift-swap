import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET() {
  return ok({ publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const body = await req.json();
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return err("Invalid subscription object", 400);

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.userId, p256dh: keys.p256dh, auth: keys.auth },
  });

  return ok({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const body = await req.json();
  const { endpoint } = body;
  if (!endpoint) return err("endpoint required", 400);

  await prisma.pushSubscription.deleteMany({
    where: { userId: user.userId, endpoint },
  });

  return ok({ ok: true });
}
