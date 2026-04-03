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
    jobTitle: dbUser.jobTitle,
    depotSetAt: dbUser.depotSetAt?.toISOString() ?? null,
  });
}

export async function PUT(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const { firstName, lastName, email, language, depotId, jobTitle } = await req.json();

  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), NOT: { id: user.userId } },
    });
    if (existing) return err("Email already in use", 409);
  }

  // Depot change enforcement
  if (depotId !== undefined) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { depotId: true, depotSetAt: true, role: true },
    });
    const isAdmin = dbUser?.role === "admin" || dbUser?.role === "subAdmin";
    if (!isAdmin && dbUser?.depotId && dbUser.depotId !== depotId && depotId !== null) {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (dbUser.depotSetAt && (Date.now() - dbUser.depotSetAt.getTime()) < sevenDaysMs) {
        const unlocksAt = new Date(dbUser.depotSetAt.getTime() + sevenDaysMs);
        return err(`Home depot can only be changed once every 7 days. Unlocks ${unlocksAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`, 403);
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.userId },
    data: {
      ...(firstName && { firstName: firstName.trim() }),
      ...(lastName && { lastName: lastName.trim() }),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(language && { language }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(depotId !== undefined && {
        depotId,
        ...(depotId ? { depotSetAt: new Date() } : {}),
      }),
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
    jobTitle: updated.jobTitle,
    depotSetAt: updated.depotSetAt?.toISOString() ?? null,
  });
}
