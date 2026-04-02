import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/reputation";
import { ok, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { depot: true },
  });
  if (!dbUser) return err("User not found", 404);

  const rep = await prisma.reputation.findUnique({ where: { userId: user.userId } });
  const reviews = await prisma.review.findMany({
    where: { reviewedId: user.userId },
    select: { rating: true },
  });
  const reputation = calcScore({
    completed: rep?.completed ?? 0,
    cancelled: rep?.cancelled ?? 0,
    noShow: rep?.noShow ?? 0,
    reviews: reviews.map((r) => r.rating),
  });

  const inviteCodes = await prisma.inviteCode.findMany({
    where: { createdBy: user.userId },
    select: { code: true, isValid: true },
  });

  return ok({
    id: dbUser.id,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    email: dbUser.email,
    depotId: dbUser.depotId,
    depot: dbUser.depot,
    role: dbUser.role,
    language: dbUser.language,
    avatarUrl: dbUser.avatarUrl,
    flexibleMode: dbUser.flexibleMode,
    termsVersion: dbUser.termsVersion,
    reputation,
    inviteCodes,
  });
}

export async function PUT(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { firstName, lastName, email, language, depotId } = await req.json();

  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), NOT: { id: user.userId } },
    });
    if (existing) return err("Email already in use", 409);
  }

  // Validate depot if changing
  if (depotId) {
    const depot = await prisma.depot.findUnique({ where: { id: depotId } });
    if (!depot) return err("Depot not found", 404);
  }

  const updated = await prisma.user.update({
    where: { id: user.userId },
    data: {
      ...(firstName && { firstName: firstName.trim() }),
      ...(lastName && { lastName: lastName.trim() }),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(language && { language }),
      ...(depotId !== undefined && { depotId }),
    },
    include: { depot: true },
  });

  return ok({
    id: updated.id,
    firstName: updated.firstName,
    lastName: updated.lastName,
    email: updated.email,
    depotId: updated.depotId,
    depot: updated.depot,
    role: updated.role,
    language: updated.language,
  });
}
