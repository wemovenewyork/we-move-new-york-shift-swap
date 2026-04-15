import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
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
