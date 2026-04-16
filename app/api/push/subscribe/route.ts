import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { parseBody, BODY_2KB } from "@/lib/parseBody";

export async function GET() {
  return ok({ publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const body = await parseBody(req, BODY_2KB);
  if (body instanceof NextResponse) return body;
  const { endpoint, keys } = body as { endpoint: string; keys: { p256dh: string; auth: string } };
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

  const delBody = await parseBody(req, BODY_2KB);
  if (delBody instanceof NextResponse) return delBody;
  const { endpoint } = delBody as { endpoint: string };
  if (!endpoint) return err("endpoint required", 400);

  await prisma.pushSubscription.deleteMany({
    where: { userId: user.userId, endpoint },
  });

  return ok({ ok: true });
}
