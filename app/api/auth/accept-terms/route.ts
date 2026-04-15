import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";
import { CURRENT_TERMS_VERSION } from "@/lib/termsVersion";

export { CURRENT_TERMS_VERSION };

export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { version } = await req.json();
  if (version !== CURRENT_TERMS_VERSION) return err("Terms version mismatch", 400);

  await prisma.user.update({
    where: { id: user.userId },
    data: { termsAcceptedAt: new Date(), termsVersion: CURRENT_TERMS_VERSION },
  });

  return ok({ accepted: true, version: CURRENT_TERMS_VERSION, at: new Date().toISOString() });
}
