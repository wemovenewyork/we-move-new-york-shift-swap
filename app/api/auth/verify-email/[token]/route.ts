import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = clientIp(req);
  if (!await rateLimit(`verify-email:${ip}`, 5, 15 * 60 * 1000)) {
    Sentry.captureEvent({ message: "Verify-email rate limit hit", level: "warning", tags: { ip } });
    return err("Too many attempts — try again in 15 minutes", 429);
  }

  try {
    const { token } = await params;

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpires: { gt: new Date() },
      },
    });

    if (!user) return err("Invalid or expired verification link", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    return ok({ verified: true });
  } catch {
    return err("Verification failed — please try again", 503);
  }
}
